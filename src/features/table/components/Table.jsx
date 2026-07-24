'use client';

// =================================================================
// TABLE — tableau de données interactif (racine de la feature table)
// =================================================================
// Seule frontière 'use client' de la feature : orchestre l'état (via
// useDataTableState), dérive les colonnes des métadonnées API, assemble la
// toolbar mutualisée et rend le <table> (cellules inline via formatCell). Tous
// les sous-composants sont de la présentation pure ; la révélation de la toolbar
// et de la croix de suppression est en CSS pur (aucun état React de visibilité).

// Importation des modules
import HoverToolbar from '@/components/toolbar/HoverToolbar/HoverToolbar';
import { ResetIcon, DownloadIcon, CopyIcon } from '@/components/icons';
import { isNumericSqlType } from '@/features/filter/utils/filterTypes';
import useDataTableState from '../hooks/useDataTableState';
import { formatCell, isNumericCol } from '../utils/formatCell';
import { toCsv, downloadBlob, copyToClipboard } from '../utils/exporters';
import { buildQueryVariables, snippetFetch, snippetPython, snippetCurl } from '../utils/querySnippets';
import TableHeaderCell from './TableHeaderCell/TableHeaderCell';
import TableChipRow from './TableChipRow/TableChipRow';
import TableFooter from './TableFooter/TableFooter';
import TableSnippetReveal from './TableSnippetReveal/TableSnippetReveal';
import './Table.scss';

/**
 * @typedef {object} ColumnDef
 * @property {string} key - Column key in `data`.
 * @property {string} [label] - Header label (defaults to `key`, or the API label).
 * @property {'number'} [type] - Right-aligned, tabular-mono (derived from sql_type
 *   when `columnsMetadata` is provided).
 * @property {function(*, Object): (JSX.Element|import('../../utils/formatCell').FormatSpec)} [format]
 * @property {function(*, Object): JSX.Element} [render] - Custom render (badge, link…),
 *   takes precedence over `format`.
 * @property {boolean} [mono] - Monospace cell.
 * @property {boolean} [strong] - Emphasized cell (primary text, medium weight).
 */

// Mapping des libellés de langue pour le panneau de révélation de code.
const REVEAL_LANG = { js: 'javascript', py: 'python', curl: 'bash' };
// Fabriques de snippets par type de copie.
const SNIPPET_BUILDERS = { js: snippetFetch, py: snippetPython, curl: snippetCurl };

/**
 * Interactive data table: per-column sort, distinct-value filters, column
 * removal, hover toolbar (reset / CSV / Parquet exports / query snippets), and
 * an optional `<MultiCriterionMenu>` default filter.
 *
 * @param {object} props
 * @param {Array<Object>} props.data - Rows in long format (key → value). Direct
 *   output of getFactTableWithMetadata (format: OBJECTS) — no reshaping needed.
 * @param {Array<ColumnDef>} [props.columns] - Column schema. Optional if
 *   `columnsMetadata` is provided; otherwise required. When both are given,
 *   `columns` fixes the order and overrides (by `key`) the derived columns.
 * @param {Array<{name: string, label: string, sql_type: string, is_categorical: boolean,
 *   is_primary_key: boolean}>} [props.columnsMetadata] - API metadata
 *   (getCatalogSchema); auto-derives key/label/type of the columns.
 * @param {string} [props.title] - Table header title.
 * @param {{apiBase?: string, operation?: string, catalog?: string, schema?: string,
 *   limit?: number}} [props.queryHint] - GraphQL snippet parameters.
 * @param {*} [props.defaultFilter] - `<MultiCriterionMenu>` output, raw tree node,
 *   or criteria array (implicit AND). Materialized into modifiable, clearable
 *   per-column filters.
 * @param {boolean} [props.enableSort=true] - Sort on header-label click.
 * @param {boolean} [props.enableFilter=true] - Per-value filter (funnel + popover).
 * @param {boolean} [props.enableColumnRemoval=true] - Hover-revealed removal cross.
 * @param {Array<import('@/components/toolbar/HoverToolbar/HoverToolbar').ToolSpec>} [props.extraTools]
 *   - Extra operations injected at the head of the toolbar (dedicated group).
 * @param {function(Array<Object>, ColumnDef[]): void} [props.onExportParquet] - Real
 *   Parquet export (server route / server action). Absent = JSON `.parquet.json`
 *   fallback, like the prototype.
 * @param {string} [props.className]
 * @param {Object} [props.style]
 * @returns {JSX.Element}
 */
const Table = ({
  data,
  columns,
  columnsMetadata,
  title,
  queryHint = {},
  defaultFilter = null,
  enableSort = true,
  enableFilter = true,
  enableColumnRemoval = true,
  extraTools = [],
  onExportParquet,
  className,
  style,
}) => {
  // ── Dérivation des colonnes ──
  // Métadonnées API → ColumnDef (type numérique si sql_type numérique ET non
  // catégoriel). La prop `columns`, si fournie, fixe l'ordre et surcharge par clé.
  const derived = (columnsMetadata || []).map((m) => ({
    key: m.name,
    label: m.label || m.name,
    type: (isNumericSqlType(m.sql_type) && !m.is_categorical) ? 'number' : undefined,
  }));
  const derivedByKey = new Map(derived.map((c) => [c.key, c]));
  const resolvedColumns = columns
    ? columns.map((c) => ({ ...(derivedByKey.get(c.key) || {}), ...c }))
    : derived;

  const {
    visibleColumns,
    hiddenColumns,
    uniqueValues,
    valueCounts,
    filters,
    setColumnFilter,
    sort,
    toggleSort,
    clearSort,
    removeColumn,
    restoreColumn,
    filteredRows,
    sortedRows,
    filterChips,
    sortChip,
    canReset,
    resetAll,
    copied,
    flash,
    reveal,
    setReveal,
  } = useDataTableState({
    data,
    columns: resolvedColumns,
    defaultFilter,
    enableSort,
    enableFilter,
    enableColumnRemoval,
  });

  // Slug de nom de fichier pour les exports (« Titre du tableau » → titre_du_tableau).
  const slug = (title || 'table').toLowerCase().replace(/\s+/g, '_');

  // ── Handlers d'export ──
  const onCsv = () => {
    downloadBlob(toCsv(sortedRows, visibleColumns), `${slug}.csv`, 'text/csv;charset=utf-8');
    flash('csv');
  };
  const onParquet = () => {
    if (onExportParquet) onExportParquet(sortedRows, visibleColumns);
    // Repli sans dépendance : export JSON « .parquet.json », comme le prototype.
    else downloadBlob(JSON.stringify(sortedRows, null, 2), `${slug}.parquet.json`, 'application/json');
    flash('parquet');
  };

  // ── Handler de copie (snippet GraphQL réel) ──
  const onCopy = (kind) => {
    // On passe les colonnes RÉSOLUES complètes (pas visibleColumns) : un filtre
    // actif sur une colonne ensuite masquée reste présent dans le snippet.
    const vars = buildQueryVariables(filters, sort, resolvedColumns, queryHint);
    const code = SNIPPET_BUILDERS[kind](vars, queryHint);
    copyToClipboard(code);
    setReveal({ lang: REVEAL_LANG[kind], code, kind });
    flash(kind);
    // Le panneau de révélation s'efface après 6 s (timer dans un handler, pas un effect).
    setTimeout(() => setReveal((r) => (r && r.kind === kind ? null : r)), 6000);
  };

  // ── Toolbar : groupes libres + reset + exports + copies ──
  const showReset = enableFilter || enableSort || enableColumnRemoval;
  const toolbarGroups = [
    extraTools,
    showReset
      ? [{
          id: 'reset',
          icon: <ResetIcon />,
          caption: 'RESET',
          disabled: !canReset,
          onClick: resetAll,
          label: 'Réinitialiser filtres, tri et colonnes supprimées',
        }]
      : [],
    [
      { id: 'csv', icon: <DownloadIcon />, caption: 'CSV', done: copied === 'csv', onClick: onCsv, label: 'Exporter en .csv (filtres + tri appliqués)' },
      { id: 'parquet', icon: <DownloadIcon />, caption: 'PARQUET', done: copied === 'parquet', onClick: onParquet, label: 'Exporter en .parquet (filtres + tri appliqués)' },
    ],
    [
      { id: 'js', icon: <CopyIcon />, caption: 'JS', done: copied === 'js', onClick: () => onCopy('js'), label: 'Copier la requête fetch (JavaScript)' },
      { id: 'py', icon: <CopyIcon />, caption: 'PY', done: copied === 'py', onClick: () => onCopy('py'), label: 'Copier la requête Python (requests)' },
      { id: 'curl', icon: <CopyIcon />, caption: 'cURL', done: copied === 'curl', onClick: () => onCopy('curl'), label: 'Copier la commande cURL' },
    ],
  ];

  // ── Indice SQL du pied (nom de table lisible = opération GraphQL) ──
  const operation = queryHint.operation || 'getFactTableWithMetadata';
  const where = filterChips.length ? '  WHERE …' : '';
  const order = sort ? `  ORDER BY ${sort.key} ${sort.dir.toUpperCase()}` : '';
  const sqlHint = `SELECT * FROM ${operation}${where}${order}`;

  // Méta d'en-tête : « n lignes » ou « n / total lignes » quand un filtre réduit l'ensemble.
  const meta = filteredRows.length === data.length
    ? `${data.length} lignes`
    : `${filteredRows.length} / ${data.length} lignes`;

  const showChipRow = (enableFilter && filterChips.length > 0)
    || (enableSort && !!sort)
    || (enableColumnRemoval && hiddenColumns.length > 0);

  return (
    <section
      className={`data-table hover-toolbar-host${className ? ` ${className}` : ''}`}
      aria-label={title}
      style={style}
    >
      <header className="data-table-header">
        {title && <h3 className="data-table-title">{title}</h3>}
        <p className="data-table-meta">{meta}</p>
      </header>

      <HoverToolbar groups={toolbarGroups} label="Actions du tableau" />

      {showChipRow && (
        <TableChipRow
          filterChips={filterChips}
          sortChip={sortChip}
          hiddenColumns={hiddenColumns}
          canReset={canReset}
          onClearFilter={(key) => setColumnFilter(key, null)}
          onClearSort={clearSort}
          onRestoreColumn={restoreColumn}
          onResetAll={resetAll}
        />
      )}

      <article className="data-table-scroll">
        <table className="data-table-grid">
          <thead>
            <tr>
              {visibleColumns.map((c, i) => (
                <TableHeaderCell
                  key={c.key}
                  col={c}
                  isNumeric={isNumericCol(c)}
                  isLast={i === visibleColumns.length - 1}
                  sortDir={sort && sort.key === c.key ? sort.dir : null}
                  onSort={() => toggleSort(c.key)}
                  filter={filters[c.key]}
                  onFilterChange={(v) => setColumnFilter(c.key, v)}
                  uniqueValues={uniqueValues[c.key]}
                  valueCounts={valueCounts[c.key]}
                  enableSort={enableSort}
                  enableFilter={enableFilter}
                  enableColumnRemoval={enableColumnRemoval && visibleColumns.length > 1}
                  onRemove={() => removeColumn(c.key)}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={visibleColumns.length} className="data-table-empty">
                  Aucune ligne ne correspond aux filtres.
                  {canReset && (
                    <button type="button" onClick={resetAll}>Réinitialiser</button>
                  )}
                </td>
              </tr>
            )}
            {sortedRows.map((r, i) => (
              <tr key={r.id ?? i}>
                {visibleColumns.map((c) => {
                  const v = r[c.key];
                  const isNum = isNumericCol(c);
                  // Classes de cellule : alignement numérique, mono, mise en avant.
                  const cls = [
                    'data-table-td',
                    isNum && 'data-table-td--num',
                    c.mono && 'data-table-td--mono',
                    c.strong && 'data-table-td--strong',
                  ].filter(Boolean).join(' ');
                  return (
                    <td key={c.key} className={cls} title={String(v ?? '')}>
                      {formatCell(v, c, r)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </article>

      <TableFooter sqlHint={sqlHint} rowCount={sortedRows.length} columnCount={visibleColumns.length} />

      {reveal && <TableSnippetReveal reveal={reveal} />}
    </section>
  );
};

export default Table;
