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
 * EVERY element must be a plain object (never an array) carrying an array-valued
 * `data` field — a shape a long-format Row (flat key → scalar) never has.
 *
 * @param {*} data - Candidate value passed as the `data` prop of <Chart>.
 * @returns {boolean} True when `data` is a non-empty Array of dataset descriptors.
 */
export function isDatasetList(data) {
  return Array.isArray(data) && data.length > 0
    && data.every((d) => d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.data));
}

/**
 * Wraps a hue argument (string | string[] | null) into an array of columns.
 *
 * @param {?(string|Array<string>)} hue - Hue argument.
 * @returns {Array<string>} Hue columns (empty when null).
 */
export function asArr(hue) {
  if (hue == null) return [];
  return Array.isArray(hue) ? hue : [hue];
}

/**
 * Normalizes a list of dataset descriptors into resolved datasets, filling every
 * per-dataset option from the <Chart>-level defaults (fill / stack / hue) when the
 * descriptor omits it.
 *
 * @param {Array<object>} data - Dataset descriptors
 *   ({ label?, data, hue?, fill?, stack?, 'categorical-x'?, 'categorical-y'? }).
 * @param {?string} defFill - Chart-level default fill ('none'|'line'|'fill').
 * @param {?string} defStack - Chart-level default stack ('none'|'color'|'style'|'marker'|'all').
 * @param {?(string|Array<string>)} defHue - Chart-level default hue column(s).
 * @returns {Array<{index:number, label:string, rows:Array<object>, fill:string,
 *   stack:string, hueCols:Array<string>, catX:boolean, catY:boolean}>} Resolved datasets.
 */
export function resolveDatasets(data, defFill, defStack, defHue) {
  return data.map((d, i) => ({
    index: i,
    label: d.label != null ? d.label : `Jeu ${i + 1}`,
    rows: d.data || [],
    fill: d.fill != null ? d.fill : (defFill != null ? defFill : 'line'),
    stack: d.stack != null ? d.stack : (defStack != null ? defStack : 'none'),
    hueCols: asArr(d.hue != null ? d.hue : defHue),
    catX: !!d['categorical-x'],
    catY: !!d['categorical-y'],
  }));
}

/**
 * Channel roles of a dataset. Scatter (fill 'none') orders its hue columns
 * color → marker (shape) → style (solid/hollow); every other fill orders them
 * color → style (dash/hatch) → marker, exactly like the single <Chart>.
 *
 * @param {{fill:string, hueCols:Array<string>}} ds - Resolved dataset.
 * @returns {{color: ?string, style: ?string, marker: ?string}} Channel columns.
 */
export function channelsFor(ds) {
  const h = ds.hueCols;
  if (ds.fill === 'none') return { color: h[0] || null, marker: h[1] || null, style: h[2] || null };
  return { color: h[0] || null, style: h[1] || null, marker: h[2] || null };
}
