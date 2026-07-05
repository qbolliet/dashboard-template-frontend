// =================================================================
// MULTI LEGEND — légende multi-jeux (une section par jeu)
// =================================================================
// Chaque jeu d'une <MultiChart> a sa propre section, titrée par son `label` et
// introduite par un glyphe de « fill » (barres / aire / points / ligne) qui
// rappelle la façon dont le jeu est tracé. Sous le titre, les groupes de canaux
// (couleur / style / marqueur) réutilisent le glyphe standard de <LegendGlyph>.
// Transposé de MultiLegend du prototype (design-system/project/scripts/charts/
// multi.jsx) ; seul le glyphe de fill est propre au mode multi-jeux.

// Importation des modules
import LegendGlyph from '../../ChartLegend/LegendGlyph/LegendGlyph';
import './MultiLegend.scss';

/**
 * Fill glyph of a dataset section: a miniature preview of how the dataset is
 * drawn (grouped bars, filled area, scatter points, or a line). Pure SVG
 * geometry — only the color arrives from data.
 *
 * @param {object} props
 * @param {'bars'|'area'|'points'|'line'} props.kind - Dataset fill kind.
 * @param {string} [props.color] - Section head color.
 * @returns {JSX.Element}
 */
const FillGlyph = ({ kind, color }) => {
  const c = color || 'currentColor';
  if (kind === 'bars') {
    return (
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
        <rect x="1" y="5" width="5" height="9" rx="1" fill={c} />
        <rect x="8.5" y="2" width="5" height="12" rx="1" fill={c} />
        <rect x="16" y="7" width="5" height="7" rx="1" fill={c} />
      </svg>
    );
  }
  if (kind === 'area') {
    return (
      <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true">
        <path d="M1 11 L7 6 L13 9 L19 4 L25 7 L25 13 L1 13 Z" fill={c} fillOpacity="0.28" />
        <path d="M1 11 L7 6 L13 9 L19 4 L25 7" fill="none" stroke={c} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 'points') {
    return (
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
        <circle cx="4" cy="9" r="2.2" fill={c} />
        <circle cx="11" cy="5" r="2.2" fill={c} />
        <circle cx="18" cy="10" r="2.2" fill={c} />
      </svg>
    );
  }
  // line
  return (
    <svg width="26" height="14" viewBox="0 0 26 14" aria-hidden="true">
      <path d="M1 11 L7 6 L13 9 L19 4 L25 7" fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/**
 * Multi-dataset legend: one section per dataset, each titled by its `label` and
 * a fill glyph, then the dataset's channel groups (color / style / marker).
 * Hovering an item fades the others across every dataset (shared `hovered`), so
 * a value shared between datasets highlights everywhere at once.
 *
 * @param {object} props
 * @param {Array<{key:*, label:string, fillKind:string, styleGlyph:'dash'|'hatch',
 *   headColor:string, groups:Array<{role:'color'|'style'|'marker', label:string,
 *   items:Array<{value:*, color:string, dash?:?string, hatch?:?string, marker?:string}>}>}>} props.sections
 *   Legend sections, one per dataset.
 * @param {'rows'|'column'} [props.layout='column'] - Section layout direction.
 * @param {*} [props.hovered] - Hovered channel value (fades the rest), or null.
 * @param {function(*): void} [props.onHover] - Called with a value on enter, null on leave.
 * @returns {JSX.Element}
 */
const MultiLegend = ({ sections, layout = 'column', hovered, onHover }) => (
  <ul className={`chart-mlegend${layout === 'rows' ? ' chart-mlegend--rows' : ''}`}>
    {sections.map((sec) => (
      <li className="chart-mlegend-section" key={sec.key}>
        <div className="chart-mlegend-head">
          <span className="chart-mlegend-fill"><FillGlyph kind={sec.fillKind} color={sec.headColor} /></span>
          <span className="chart-mlegend-title">{sec.label}</span>
        </div>
        <div className="chart-mlegend-groups">
          {sec.groups.length === 0 ? (
            // Jeu sans canal : un seul item rappelant le label + le glyphe de fill.
            <div className="chart-mlegend-group">
              <ul className="chart-legend-group-items">
                <li>
                  <span className="chart-legend-item">
                    <span className="chart-legend-glyph"><FillGlyph kind={sec.fillKind} color={sec.headColor} /></span>
                    <span className="chart-legend-text">{sec.label}</span>
                  </span>
                </li>
              </ul>
            </div>
          ) : sec.groups.map((grp) => (
            <div className="chart-mlegend-group" key={`${grp.role}·${grp.label}`}>
              <span className="chart-legend-label">{grp.label}</span>
              <ul className="chart-legend-group-items">
                {grp.items.map((it) => (
                  <li key={String(it.value)}>
                    <button
                      type="button"
                      className={`chart-legend-item${hovered != null && hovered !== it.value ? ' chart-legend--faded' : ''}`}
                      onMouseEnter={() => onHover?.(it.value)}
                      onMouseLeave={() => onHover?.(null)}>
                      <span className="chart-legend-glyph">
                        <LegendGlyph
                          type={grp.role}
                          color={it.color}
                          dash={it.dash}
                          marker={it.marker}
                          hatch={it.hatch}
                          styleGlyph={sec.styleGlyph} />
                      </span>
                      <span className="chart-legend-text">{String(it.value)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </li>
    ))}
  </ul>
);

export default MultiLegend;
