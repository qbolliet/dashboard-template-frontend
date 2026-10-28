// =================================================================
// TOOLTIP MODEL — ligne survolée → modèle de <DataTooltip>
// =================================================================
// Le globe affiche la MÊME bulle que <Chart> (src/components/tooltip/DataTooltip) :
// titre, glyphe reprenant l'apparence de la marque, une ligne par canal hue, puis la
// valeur `z` formatée. Le contenu est un modèle de données rendu en JSX, jamais du
// HTML : une valeur venue de la base n'a rien à échapper.
//
// Module PUR (ni React ni three) : <Globe> le construit au changement de cible
// survolée, que le moteur lui signale.

/**
 * Hue rows of a tooltip: one per encoded channel the row carries.
 *
 * @param {object} row - Hovered row.
 * @param {Array<{key: string, label: string}>} fields - `fields` of the hue encoding.
 * @returns {Array<{label: string, value: *}>}
 */
const hueRowsOf = (row, fields) => fields
  .filter(({ key }) => row?.[key] != null)
  .map(({ key, label }) => ({ label, value: row[key] }));

/**
 * Value rows of a tooltip: the formatted `z` value, when the layer encodes one.
 *
 * @param {object} row - Hovered row.
 * @param {{key: ?string, label: ?string, format: function(*): string}} z - Size
 *   encoding of the layer.
 * @returns {Array<{label: string, value: string}>}
 */
const valueRowsOf = (row, z) => (z.key && row?.[z.key] != null
  ? [{ label: z.label ?? z.key, value: z.format(row[z.key]) }]
  : []);

/**
 * Tooltip model of a hovered point.
 *
 * @param {{id: string, label?: string, sub?: string}} point - Hovered point.
 * @param {object} options
 * @param {ReturnType<import('./hueEncoding').resolveHueEncoding>} options.encoding -
 *   Hue encoding of the points.
 * @param {'badge'|'bubble'} options.mark - Point mark: a bubble shows its marker shape
 *   in the glyph, a badge a disc.
 * @param {{key: ?string, label: ?string, format: function(*): string}} options.z - Size
 *   encoding of the points.
 * @returns {{title: string, subtitle: ?string, glyphSpec: object,
 *   hueRows: Array<{label: string, value: *}>, valueRows: Array<{label: string, value: string}>}}
 *   Without a color channel, the glyph is drawn in `currentColor`, which the host's
 *   stylesheet sets to the point token.
 */
export const pointTooltipModel = (point, { encoding, mark, z }) => ({
  title: point.label ?? point.id,
  subtitle: point.sub ?? null,
  glyphSpec: {
    kind: 'bubble',
    color: encoding.colorFor(point) ?? 'currentColor',
    marker: (mark === 'bubble' && encoding.markerFor(point)) || 'circle',
  },
  hueRows: hueRowsOf(point, encoding.fields),
  valueRows: valueRowsOf(point, z),
});

/**
 * Tooltip model of a hovered flow.
 *
 * @param {object} arc - Hovered flow.
 * @param {{label?: string, id: string}} from - Origin point.
 * @param {{label?: string, id: string}} to - Destination point.
 * @param {object} options
 * @param {ReturnType<import('./hueEncoding').resolveHueEncoding>} options.encoding -
 *   Hue encoding of the flows.
 * @param {'arrow'|'line'|'glow'} options.mark - Flow mark: an undirected `line` joins
 *   the endpoints with a dash instead of an arrow.
 * @param {{key: ?string, label: ?string, format: function(*): string}} options.z - Size
 *   encoding of the flows.
 * @returns {{title: string, subtitle: null, glyphSpec: object,
 *   hueRows: Array<{label: string, value: *}>, valueRows: Array<{label: string, value: string}>}}
 */
export const arcTooltipModel = (arc, from, to, { encoding, mark, z }) => ({
  title: `${from.label ?? from.id} ${mark === 'line' ? '—' : '→'} ${to.label ?? to.id}`,
  subtitle: null,
  glyphSpec: {
    kind: 'line',
    color: encoding.colorFor(arc) ?? 'currentColor',
    dash: encoding.dashFor(arc),
  },
  hueRows: hueRowsOf(arc, encoding.fields),
  valueRows: valueRowsOf(arc, z),
});
