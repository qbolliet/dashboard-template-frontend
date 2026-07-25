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
//   • D10 — aucun useMemo / useCallback : le React Compiler mémoïse. Les
//     dérivations sont de simples const recalculées au rendu.

// Importation des modules
import { useState } from 'react';
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
}) => {
  // ── Tri : { key, dir } | null ──
  const [sort, setSort] = useState(null);
  // ── Colonnes masquées (par clé) ──
  const [hidden, setHidden] = useState(() => new Set());

  // Colonnes visibles / masquées après suppression manuelle (const dérivées).
  const visibleColumns = columns.filter((c) => !hidden.has(c.key));
  const hiddenColumns = columns.filter((c) => hidden.has(c.key));

  // ── Valeurs distinctes par colonne, calculées sur data BRUT ──
  // Tri numérique si la colonne est numérique, sinon localeCompare français.
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
    else arr.sort((a, b) => String(a).localeCompare(String(b), 'fr'));
    uniqueValues[c.key] = arr;
    valueCounts[c.key] = counts;
  }

  // ── Seed du defaultFilter sans setState-dans-effet (D9) ──
  // dfTree et seed sont dérivés au rendu (purs) ; seules les colonnes
  // explicitement touchées vivent dans l'état `overrides`. La sélection
  // effective d'une colonne = override si présent, sinon seed.
  const dfTree = normalizeDefaultFilter(defaultFilter);
  const seeded = deriveFiltersFromDefault(dfTree, data, columns, uniqueValues);
  const [overrides, setOverrides] = useState({});
  // Prop contrôlée : un changement d'IDENTITÉ de `defaultFilter` réamorce le seed.
  // Ajustement d'état AU RENDU (D9), sur le modèle de MultiCriterionMenu
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
    columns.map((c) => [c.key, c.key in overrides ? overrides[c.key] : seeded[c.key]]),
  );
  const setColumnFilter = (key, v) => setOverrides((o) => ({ ...o, [key]: v }));

  // ── Pipeline de dérivation : data → filtres → tri (ordre strict) ──
  const filteredRows = data.filter((r) => {
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
  // dernier ; comparaison numérique par valeur, sinon localeCompare français.
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
        : String(va).localeCompare(String(vb), 'fr');
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
        if (f.length !== all.length) {
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
    setOverrides(Object.fromEntries(columns.map((c) => [c.key, null])));
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
