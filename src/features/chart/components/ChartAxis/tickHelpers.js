// =================================================================
// TICK HELPERS — dérivation des graduations + anti-chevauchement, partagées
// entre ChartAxisBottom et ChartAxisLeft (portées à l'identique de
// design-system/project/scripts/charts/axis.jsx).
// =================================================================

// Taille de police (px) des libellés de graduation. Dupliquée du token CSS
// --chart-axis-tick-font-size (cf. _tokens.scss) : measureText() mesure sur un
// canvas caché, hors cascade CSS, elle a donc besoin de la valeur numérique brute.
export const TICK_FONT_SIZE = 11;

/**
 * Lists the tick values for a scale, given its detected column type.
 *
 * @param {object} scale - visx/d3 scale (band for categorical, linear/time otherwise).
 * @param {'date'|'number'|'categorical'} type - Column type.
 * @param {number} count - Desired tick count (continuous scales only — approximate).
 * @returns {Array<*>} Tick values.
 */
export function ticksFor(scale, type, count) {
  if (type === 'categorical') return scale.domain();
  if (scale.ticks) return scale.ticks(count);
  return scale.domain();
}

/**
 * Truncates a string to `maxLen` characters, appending an ellipsis when cut.
 *
 * @param {*} text - Value to truncate (coerced to string).
 * @param {number} maxLen - Maximum character count (no-op when falsy/≤0).
 * @returns {string} Truncated string.
 */
export function ellipsize(text, maxLen) {
  if (!maxLen || maxLen <= 0) return text;
  const s = String(text);
  return s.length <= maxLen ? s : s.slice(0, Math.max(1, maxLen - 1)) + '…';
}

/**
 * Wraps a string into up to `maxLines` lines, breaking on spaces/hyphens; the
 * last line is ellipsized if it still overflows after wrapping.
 *
 * @param {*} text - Value to wrap (coerced to string).
 * @param {number} maxCharsPerLine - Character budget per line.
 * @param {number} maxLines - Maximum number of lines.
 * @returns {Array<string>} Wrapped lines (length ≤ maxLines).
 */
export function wrapLines(text, maxCharsPerLine, maxLines) {
  const s = String(text);
  if (maxLines <= 1 || s.length <= maxCharsPerLine) return [ellipsize(s, maxCharsPerLine)];
  // Découpe en mots en conservant les séparateurs (espace/tiret) pour reconstituer
  // des lignes lisibles sans perdre la ponctuation de césure.
  const words = s.split(/(\s|-)/).filter(Boolean);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + w).length > maxCharsPerLine && cur.length > 0) {
      lines.push(cur.trim());
      cur = w.replace(/^\s+/, '');
      if (lines.length >= maxLines - 1) break;
    } else {
      cur += w;
    }
  }
  if (cur.length > 0) lines.push(cur.trim());
  if (lines.length === maxLines && lines[maxLines - 1].length > maxCharsPerLine) {
    lines[maxLines - 1] = ellipsize(lines[maxLines - 1], maxCharsPerLine);
  }
  return lines.slice(0, maxLines);
}
