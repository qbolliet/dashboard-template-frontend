// =================================================================
// USE DATA TABLE STATE — état central + dérivations du DataTable
// =================================================================
// Concentre tout l'état interactif du tableau (tri, filtres par colonne,
// colonnes masquées, états transitoires de la toolbar) et toutes les dérivations
// (valeurs distinctes, lignes filtrées puis triées, chips, indicateur de reset).
//
// Deux contraintes structurantes du repo (TABLE_ARCHITECTURE.md) :
//   • D9 — aucun setState dans un useEffect pour synchroniser le seed du
//     defaultFilter : on dérive le seed au rendu (pur) et on ne stocke QUE les
//     colonnes que l'utilisateur a explicitement modifiées (état « overrides »).
//   • D10 — aucun useMemo / useCallback par défaut : le React Compiler mémoïse.
//     Exception UNIQUE assumée sur le seed du defaultFilter (cf. commentaire
//     inline plus bas) : la recomputation est lourde (data.filter sur tout
//     l'arbre + scan de valeurs distinctes) et ses entrées naturelles
//     (columns, uniqueValues) changent d'IDENTITÉ à chaque rendu du parent,
//     ce que le Compiler ne peut pas isoler — même schéma que le bloc KDE de
//     ViolinMarks.jsx.

// Importation des modules
import { useMemo, useState } from 'react';
import { DEFAULT_INTL_LOCALE } from '@/utils/format/constants';
import { isNumericCol } from '../utils/formatCell';
import { normalizeDefaultFilter, deriveFiltersFromDefault } from '../utils/defaultFilterEngine';

/**
 * Central state of the DataTable: sort, per-column value filters (seeded by the
 * default filter), removed columns, transient toolbar states, and the derived
 * row pipeline (filter → sort).
 *
 * @param {object} config
 * @param {Array<Object>} config.data - Raw rows (long format, key → value).
 * @param {Array<import('../utils/formatCell').ColumnDef>} config.columns - Resolved
 *   column definitions (already merged with columnsMetadata by DataTable).
 * @param {*} [config.defaultFilter] - `<MultiCriterionMenu>` output / raw tree /
 *   criteria array, materialized into a per-column value seed. Passed by
 *   reference: a new object identity re-seeds the per-column filters (dropping
 *   manual overrides). Consumers must keep the reference stable while the filter
 *   is unchanged, otherwise overrides would reset on every render.
 * @param {boolean} config.enableSort - Enables sorting.
 * @param {boolean} config.enableFilter - Enables per-column value filters.
 * @param {boolean} config.enableColumnRemoval - Enables hiding columns.
 * @param {Object<string, ?Array>} [config.columnFilters] - Controlled per-column
 *   selections (remote mode).
 * @param {function(Object<string, ?Array>): void} [config.onColumnFiltersChange] -
 *   Its presence switches to the remote mode: the table is backed by the API, the
 *   caller owns the selections and sends them in `structuredFilters` (see
 *   `columnCriteria`). They are then neither seeded from `defaultFilter` nor applied
 *   to `data`, which the server has already filtered.
 * @returns {{
 *   visibleColumns: Array, hiddenColumns: Array,
 *   uniqueValues: Object<string, Array>, valueCounts: Object<string, Object>,
 *   filters: Object<string, ?Array>, setColumnFilter: function(string, ?Array): void,
 *   sort: ?{key: string, dir: 'asc'|'desc'}, toggleSort: function(string): void,
 *   clearSort: function(): void,
 *   removeColumn: function(string): void, restoreColumn: function(string): void,
 *   filteredRows: Array, sortedRows: Array,
 *   filterChips: Array<{key: string, label: string, value: string}>,
 *   sortChip: ?{key: string, dir: 'asc'|'desc', label: string},
 *   canReset: boolean, resetAll: function(): void,
 *   copied: ?string, flash: function(string): void,
 *   reveal: ?Object, setReveal: function(*): void,
 * }}
 */
const useDataTableState = ({
  data,
  columns,
  defaultFilter,
  enableSort,
  enableFilter,
  enableColumnRemoval,
  columnFilters,
  onColumnFiltersChange,
  intlLocale = DEFAULT_INTL_LOCALE,
}) => {
  // Mode distant : sélections contrôlées par le parent, qui les envoie à l'API.
  const remote = typeof onColumnFiltersChange === 'function';

  // ── Tri : { key, dir } | null ──
  const [sort, setSort] = useState(null);
  // ── Colonnes masquées (par clé) ──
  const [hidden, setHidden] = useState(() => new Set());

  // Colonnes visibles / masquées après suppression manuelle (const dérivées).
  const visibleColumns = columns.filter((c) => !hidden.has(c.key));
  const hiddenColumns = columns.filter((c) => hidden.has(c.key));

  // ── Valeurs distinctes par colonne, calculées sur data BRUT ──
  // Tri numérique si la colonne est numérique, sinon localeCompare dans la langue du
  // site — l'ordre alphabétique n'est pas le même partout (le suédois classe å après z).
  const uniqueValues = {};
  const valueCounts = {};
  for (const c of columns) {
    const seen = new Set();
    const arr = [];
    const counts = {};
    for (const r of data) {
      const v = r[c.key];
      if (v == null || v === '') continue;
      counts[v] = (counts[v] || 0) + 1;
      if (!seen.has(v)) { seen.add(v); arr.push(v); }
    }
    if (isNumericCol(c)) arr.sort((a, b) => (+a) - (+b));
    else arr.sort((a, b) => String(a).localeCompare(String(b), intlLocale));
    uniqueValues[c.key] = arr;
    valueCounts[c.key] = counts;
  }

  // ── Seed du defaultFilter sans setState-dans-effet (D9) ──
  // Le seed est dérivé (pur) ; seules les colonnes explicitement touchées
  // vivent dans l'état `overrides`. La sélection effective d'une colonne =
  // override si présent, sinon seed.
  //
  // Mémoïsation JUSTIFIÉE (exception D10 ci-dessus) : deriveFiltersFromDefault
  // fait un data.filter(evalFilterNode) (O(lignes × arbre)) + un scan de
  // valeurs distinctes par colonne référencée. Sans ce useMemo, cette passe
  // se rejouerait à CHAQUE rendu du hook — y compris les rendus purement
  // transitoires (flash(), setReveal(), toggleSort...) — car `columns`
  // (resolvedColumns dans Table.jsx) change d'identité à chaque rendu du
  // parent, ce que le Compiler ne peut pas isoler. Dépendances VOLONTAIREMENT
  // réduites à des valeurs stables : la référence `data`, la référence
  // `defaultFilter` (déjà contractuellement stable tant que le filtre ne
  // change pas, cf. JSDoc ci-dessus) et une SIGNATURE des clés de colonnes
  // (pas l'objet `columns` lui-même, reconstruit à chaque rendu). C'est pour
  // rester libre de cette dépendance instable que deriveFiltersFromDefault
  // ne prend plus `uniqueValues` en paramètre (cf. defaultFilterEngine.js).
  const columnKeysSig = columns.map((c) => c.key).join(',');
  // En mode distant, pas de seed : le filtre par défaut est déjà appliqué par l'API.
  const seeded = useMemo(() => {
    const tree = remote ? null : normalizeDefaultFilter(defaultFilter);
    return deriveFiltersFromDefault(tree, data, columns);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, defaultFilter, columnKeysSig, remote]);
  const [overrides, setOverrides] = useState({});
  // Prop contrôlée : un changement d'IDENTITÉ de `defaultFilter` réamorce le seed.
  // Ajustement d'état au rendu, sur le modèle de MultiCriterionMenu
  // (bloc prevMax) — jamais dans un useEffect (react-hooks v6 le rejette).
  // Effet de bord assumé : au changement de defaultFilter, les éditions manuelles
  // de colonnes NON concernées sont aussi effacées (le filtre par défaut redevient
  // autoritaire). Compromis retenu. Contrat : le consommateur DOIT passer une
  // référence stable tant que le filtre ne change pas (sinon boucle de reset).
  const [prevDefaultFilter, setPrevDefaultFilter] = useState(defaultFilter);
  if (prevDefaultFilter !== defaultFilter) {
    setPrevDefaultFilter(defaultFilter);
    setOverrides({});
  }
  const filters = Object.fromEntries(
    columns.map((c) => [c.key, remote
      ? (columnFilters?.[c.key] ?? null)
      : (c.key in overrides ? overrides[c.key] : seeded[c.key])]),
  );
  // Distant : on remonte la nouvelle sélection au parent (depuis un handler, jamais un effet).
  const setColumnFilter = (key, v) => (remote
    ? onColumnFiltersChange({ ...columnFilters, [key]: v })
    : setOverrides((o) => ({ ...o, [key]: v })));

  // ── Pipeline de dérivation : data → filtres → tri (ordre strict) ──
  // Distant : les lignes sont déjà filtrées par l'API. Les refiltrer serait au mieux
  // inutile, au pire faux (valeurs d'options en chaîne contre cellules numériques).
  const filteredRows = remote ? data : data.filter((r) => {
    for (const c of columns) {
      const f = filters[c.key];
      if (f !== null) {
        if (r[c.key] == null) return false;
        if (!f.includes(r[c.key])) return false;
      }
    }
    return true;
  });

  // Tri appliqué après le filtre (l'export respecte donc cet ordre). null en
  // dernier ; comparaison numérique par valeur, sinon localeCompare dans la langue du site.
  let sortedRows = filteredRows;
  if (sort) {
    const { key, dir } = sort;
    const col = columns.find((c) => c.key === key);
    sortedRows = [...filteredRows].sort((a, b) => {
      const va = a[key];
      const vb = b[key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const cmp = (col && isNumericCol(col))
        ? (+va) - (+vb)
        : String(va).localeCompare(String(vb), intlLocale);
      return dir === 'asc' ? cmp : -cmp;
    });
  }

  // ── Actions de tri ── (cycle aucun → asc → desc → aucun)
  const toggleSort = (key) => {
    if (!enableSort) return;
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });
  };
  const clearSort = () => setSort(null);

  // ── Suppression / restauration de colonnes (clone du Set) ──
  const removeColumn = (key) => setHidden((prev) => {
    const next = new Set(prev);
    next.add(key);
    return next;
  });
  const restoreColumn = (key) => setHidden((prev) => {
    const next = new Set(prev);
    next.delete(key);
    return next;
  });

  // ── Chips de filtres actifs (une sélection partielle = un chip) ──
  const filterChips = [];
  if (enableFilter) {
    for (const c of columns) {
      const f = filters[c.key];
      if (f !== null) {
        const all = uniqueValues[c.key] || [];
        // Distant : liste d'inclusion, toute sélection non vide est un filtre
        if (remote ? f.length > 0 : f.length !== all.length) {
          // ∅ si vide, valeurs jointes si ≤ 2, sinon « n valeurs » (format prototype).
          const value = f.length === 0
            ? '∅'
            : f.length <= 2
              ? f.map(String).join(', ')
              : `${f.length} valeurs`;
          filterChips.push({ key: c.key, label: c.label || c.key, value });
        }
      }
    }
  }

  // Chip de tri (consommé par TableChipRow).
  const sortChip = sort
    ? { key: sort.key, dir: sort.dir, label: columns.find((c) => c.key === sort.key)?.label || sort.key }
    : null;

  // Un reset est possible dès qu'un état réinitialisable est actif, chacun
  // conditionné par son enable*.
  const canReset = (enableFilter && filterChips.length > 0)
    || (enableSort && !!sort)
    || (enableColumnRemoval && hidden.size > 0);

  // resetAll écrase TOUT à null (y compris le seed du defaultFilter), comme le
  // Reset du prototype : chaque colonne est explicitement forcée à « tout ».
  const resetAll = () => {
    if (remote) onColumnFiltersChange({});
    else setOverrides(Object.fromEntries(columns.map((c) => [c.key, null])));
    setSort(null);
    setHidden(new Set());
  };

  // ── États transitoires de la toolbar ──
  // Les setTimeout vivent dans des handlers (pas des effects) : autorisé.
  const [copied, setCopied] = useState(null);
  const [reveal, setReveal] = useState(null);

  // Confirmation « ✓ » d'une action : flash 1,4 s puis retour à l'état neutre.
  const flash = (key) => {
    setCopied(key);
    setTimeout(() => setCopied((c) => (c === key ? null : c)), 1400);
  };

  return {
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
  };
};

export default useDataTableState;
