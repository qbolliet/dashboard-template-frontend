// Importation des modules
import LegendGlyph from '../LegendGlyph/LegendGlyph';
import './ChannelLegend.scss';

/**
 * Legend grouped by encoding channel (color / style / marker / confidence band),
 * one titled group per active channel. Hovering an item fades the other items of
 * its own channel — `hovered` drives the color/style/marker groups, `hoveredCI`
 * drives the confidence-band group separately, so hovering a CI level never fades
 * the series legend and vice versa.
 *
 * Rendered as a nested list (group list → item list) rather than `<div>`s: each
 * group's item list is a real `<ul>`, its `<li>` wrappers laid out with
 * `display: contents` so they carry no visual footprint of their own (see
 * ChannelLegend.scss) — the interactive `<button>` inside keeps the exact flex/gap
 * layout the prototype achieved with plain `<div>`s.
 *
 * @param {Array<{channel: 'color'|'style'|'marker'|'ciband', label: string,
 *   items: Array<{key: *, color?: string, dash?: ?string, hatch?: ?string,
 *   marker?: string, opacity?: number, ciMode?: string}>}>} groups - Legend groups,
 *   one per active channel.
 * @param {*} [hovered] - Hovered series key (color/style/marker groups).
 * @param {*} [hoveredCI] - Hovered confidence-band key.
 * @param {function(*, object): void} [onHover] - Called with (key, group) on
 *   pointer enter, (null, group) on pointer leave.
 * @param {'vertical'|'horizontal'} [layout='vertical'] - Group layout direction.
 * @param {'dash'|'hatch'} [styleGlyph='dash'] - Glyph variant for the 'style' channel
 *   (dashed line for line charts, hachure swatch for bar charts).
 * @returns {JSX.Element}
 */
const ChannelLegend = ({ groups, hovered, hoveredCI, onHover, layout = 'vertical', styleGlyph = 'dash' }) => {
  return (
    <ul className={`chart-legend chart-legend--channels${layout === 'horizontal' ? ' chart-legend--h' : ''}`}>
      {groups.map((group) => {
        // L'intervalle de confiance s'isole de la légende de série : il a son propre survol.
        const groupHover = group.channel === 'ciband' ? hoveredCI : hovered;
        return (
          <li className="chart-legend-group" key={`${group.channel}·${group.label}`}>
            <span className="chart-legend-label">{group.label}</span>
            <ul className={`chart-legend-group-items${group.channel === 'ciband' ? ' chart-legend-group-items--ci' : ''}`}>
              {group.items.map((it) => (
                <li key={String(it.key)}>
                  <button
                    type="button"
                    className={`chart-legend-item${groupHover != null && groupHover !== it.key ? ' chart-legend--faded' : ''}`}
                    onMouseEnter={() => onHover?.(it.key, group)}
                    onMouseLeave={() => onHover?.(null, group)}>
                    <span className="chart-legend-glyph">
                      <LegendGlyph
                        type={group.channel}
                        color={it.color}
                        dash={it.dash}
                        marker={it.marker}
                        hatch={it.hatch}
                        opacity={it.opacity}
                        ciMode={it.ciMode}
                        styleGlyph={styleGlyph} />
                    </span>
                    <span className="chart-legend-text">{String(it.key)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
};

export default ChannelLegend;
