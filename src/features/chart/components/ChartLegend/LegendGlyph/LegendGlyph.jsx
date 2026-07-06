// Importation des modules
import { markerPath } from '../../../utils/encoding';

// Ce fichier code en dur des coordonnées SVG (viewBox,
// x1/y1/x2/y2, rayons, largeurs de trait...), ce qui déroge en apparence à la
// règle « apparence dans les .scss ». Il ne s'agit pas d'une exception : ces
// valeurs sont de la géométrie (la FORME dessinée), pas du style CSS (qui ne
// peut de toute façon pas piloter les coordonnées d'un <path>/<line>/<rect>).
// Elles restent donc en JSX, comme les tracés `path d` des icônes de
// src/components/icons/. Seules les vraies valeurs de style (color, opacity)
// arrivent par props depuis utils/encoding.js.

// Lignes de hachure d'un glyphe 22×14 (motifs diag / diag-rev / cross / horizontal
// / vertical / grid) — partagées entre le canal 'ciband' et le canal 'style' en
// mode hachure.
const legendHatchLines = (hatch, color, opacity = 0.9) => {
  const lines = [];
  const add = (x1, y1, x2, y2) => lines.push(
    <line key={lines.length} x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={color} strokeWidth="1.4" strokeOpacity={opacity} />
  );
  if (hatch === 'diag') for (let o = -14; o <= 22; o += 5) add(o, 14, o + 14, 0);
  else if (hatch === 'diag-rev') for (let o = -14; o <= 22; o += 5) add(o, 0, o + 14, 14);
  else if (hatch === 'cross') { for (let o = -14; o <= 22; o += 6) { add(o, 14, o + 14, 0); add(o, 0, o + 14, 14); } }
  else if (hatch === 'horizontal') for (let yy = 3; yy <= 11; yy += 4) add(0, yy, 22, yy);
  else if (hatch === 'vertical') for (let xx = 3; xx <= 19; xx += 4) add(xx, 0, xx, 14);
  else if (hatch === 'grid') { for (let yy = 3; yy <= 11; yy += 4) add(0, yy, 22, yy); for (let xx = 3; xx <= 19; xx += 4) add(xx, 0, xx, 14); }
  return lines;
};

/**
 * Legend-item glyph: a small SVG swatch whose shape encodes the legend item's
 * channel — flat color swatch, dashed/hachured style, symbol marker, or a
 * confidence-band indicator (fill/bars/line/whiskers, opacity carrying the level).
 *
 * @param {'color'|'style'|'marker'|'ciband'|'band'} type - Legend channel.
 * @param {string} [color] - Series color (hsl string, from utils/encoding.js scales).
 * @param {?string} [dash] - Dash-array (style channel, 'line' ciMode).
 * @param {string} [marker] - Marker type (marker channel; also overlaid on 'ciband' glyphs).
 * @param {?string} [hatch] - Hatch-pattern type ('style' channel in 'hatch' mode, 'ciband').
 * @param {number} [opacity] - Confidence-band opacity (encodes the CI level).
 * @param {'fill'|'bars'|'line'|'whiskers'} [ciMode] - Confidence-band rendering mode.
 * @param {'dash'|'hatch'} [styleGlyph] - 'style' channel rendering: dashed line vs
 *   hachured swatch (bar charts hachure instead of dashing, to match the fill).
 * @returns {JSX.Element}
 */
const LegendGlyph = ({ type, color, dash, marker, hatch, opacity, ciMode, styleGlyph }) => {
  if (type === 'ciband') {
    // Intervalle de confiance : l'opacité code le NIVEAU ; l'apparence (trait,
    // hachure, marqueur) est celle de la série à laquelle l'IC se rapporte.
    const op = opacity != null ? opacity : 0.35;
    if (ciMode === 'fill' || ciMode === 'bars') {
      return (
        <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
          <rect x="0.5" y="0.5" width="21" height="13" rx="2.5" fill={color} fillOpacity={op}
            stroke={color} strokeOpacity={Math.min(1, op + 0.3)} strokeWidth="0.75" />
          {hatch && legendHatchLines(hatch, color, 0.85)}
          {marker && <path transform="translate(11,7)" d={markerPath(marker, 24)} fill={color} stroke="white" strokeWidth="0.6" />}
        </svg>
      );
    }
    if (ciMode === 'line') {
      return (
        <svg width="32" height="14" viewBox="0 0 32 14" aria-hidden="true">
          <line x1="2" y1="7" x2="30" y2="7" stroke={color} strokeOpacity={op} strokeWidth="2.4"
            strokeLinecap="round" strokeDasharray={dash || undefined} />
          {marker && <path transform="translate(16,7)" d={markerPath(marker, 24)} fill={color} stroke="white" strokeWidth="0.6" />}
        </svg>
      );
    }
    // Moustaches : trait vertical + embouts (ou marqueur central s'il y en a un)
    return (
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
        <line x1="11" y1="2" x2="11" y2="12" stroke={color} strokeOpacity={op} strokeWidth="1.6" strokeDasharray={dash || undefined} />
        {marker
          ? <path transform="translate(11,7)" d={markerPath(marker, 22)} fill={color} fillOpacity={op} stroke="white" strokeWidth="0.6" />
          : (
            <>
              <line x1="7" y1="2.5" x2="15" y2="2.5" stroke={color} strokeOpacity={op} strokeWidth="1.6" />
              <line x1="7" y1="11.5" x2="15" y2="11.5" stroke={color} strokeOpacity={op} strokeWidth="1.6" />
            </>
          )}
      </svg>
    );
  }

  if (type === 'band') {
    // Pastille d'intervalle de confiance générique : aplat de couleur à opacité
    // réduite (le niveau se lit à l'opacité, pas à la hachure).
    return (
      <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
        <rect x="0.5" y="0.5" width="21" height="13" rx="2.5"
          fill={color} fillOpacity={opacity != null ? opacity : 0.3}
          stroke={color} strokeWidth="0.75" strokeOpacity="0.4" />
      </svg>
    );
  }

  if (type === 'style') {
    // Sur les barchart, le canal « style » est rendu en hachures (et non en
    // pointillés), pour rester cohérent avec le remplissage des barres.
    if (styleGlyph === 'hatch') {
      return (
        <svg width="22" height="14" viewBox="0 0 22 14" aria-hidden="true">
          <rect x="0.5" y="0.5" width="21" height="13" rx="2.5"
            fill={color} fillOpacity={hatch ? 0.12 : 0.85} stroke={color} strokeWidth="1" strokeOpacity="0.55" />
          {legendHatchLines(hatch, color)}
        </svg>
      );
    }
    return (
      <svg width="32" height="14" viewBox="0 0 32 14" aria-hidden="true">
        <line x1="2" y1="7" x2="30" y2="7" stroke={color} strokeWidth="3"
          strokeLinecap="round" strokeDasharray={dash || undefined} />
      </svg>
    );
  }

  if (type === 'marker') {
    return (
      <svg width="16" height="16" viewBox="-8 -8 16 16" aria-hidden="true">
        <path d={markerPath(marker, 70)} fill={color} />
      </svg>
    );
  }

  // color
  return (
    <svg width="14" height="14" viewBox="-7 -7 14 14" aria-hidden="true">
      <rect x="-6" y="-6" width="12" height="12" rx="2.5" fill={color} />
    </svg>
  );
};

export default LegendGlyph;
