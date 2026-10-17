// =================================================================
// ROWS EXTENT — bornes d'une colonne, calculées sur les lignes affichées
// =================================================================
// `metadata.extents` (API) décrit TOUT le jeu de données. Dès qu'un filtre réduit les
// lignes, il ne décrit plus ce que montrent le graphique et le tableau : on recalcule alors
// les bornes sur les lignes retenues, en suivant le contrat de l'API — [min, max] pour une
// mesure, [premier, dernier] pour une dimension.

// Date ISO (jour ou horodatage) : l'ordre lexicographique est l'ordre chronologique.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;

/**
 * Computes the `[min, max]` / `[first, last]` extent of a column over a set of rows.
 *
 * - numbers: `[min, max]`;
 * - ISO dates: `[earliest, latest]`;
 * - any other dimension: `[first, last]` in row order.
 *
 * @param {Array<Object>} rows - Rows to scan.
 * @param {string} key - Column name.
 * @returns {Array|null} The two bounds, or `null` when no row carries a value.
 */
export const rowsExtent = (rows, key) => {
  const values = rows.map((row) => row?.[key]).filter((v) => v !== null && v !== undefined);
  if (values.length === 0) return null;

  if (values.every((v) => typeof v === 'number')) {
    return [Math.min(...values), Math.max(...values)];
  }
  if (values.every((v) => typeof v === 'string' && ISO_DATE.test(v))) {
    const sorted = [...values].sort();
    return [sorted[0], sorted[sorted.length - 1]];
  }
  return [values[0], values[values.length - 1]];
};
