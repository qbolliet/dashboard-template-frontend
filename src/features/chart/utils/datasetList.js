// =================================================================
// DATASET LIST — détection du mode « liste de jeux » (multi-graph)
// =================================================================
// Le pivot <Chart> accepte soit un Array<Row> (format long), soit un
// Array<Dataset> (descripteurs { label, data, hue?, fill?, … }) qu'il délègue
// à <MultiChart>. Ce prédicat distingue les deux : un descripteur de jeu porte
// une propriété `data` qui est elle-même un tableau — ce qu'une Row du format
// long (objet plat clé → valeur scalaire) n'a jamais.

/**
 * Tells whether `data` is a list of dataset descriptors (multi-chart mode)
 * rather than a flat Array<Row> in long format.
 *
 * @param {*} data - Candidate value passed as the `data` prop of <Chart>.
 * @returns {boolean} True when `data` is an Array whose first element is a
 *   dataset descriptor (an object carrying an array-valued `data` field).
 */
export function isDatasetList(data) {
  if (!Array.isArray(data) || data.length === 0) return false;
  const first = data[0];
  return !!first && typeof first === 'object' && Array.isArray(first.data);
}
