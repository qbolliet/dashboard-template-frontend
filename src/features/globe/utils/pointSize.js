// =================================================================
// POINT SIZE — prop `pointSize` → diamètre de chaque point
// =================================================================
// Pendant, pour les points du globe, des bulles du chart (zMark="bubble") : une
// clé numérique rend l'AIRE de chaque point proportionnelle à sa valeur, le plus
// grand point valant le diamètre maximal (token --globe-marker-max-size), et une
// valeur nulle, négative ou absente ne dessine rien. Un nombre fixe le diamètre
// de tous les points, en px.
//
// Module PUR (ni React ni three) : <Globe> s'en sert pour sa légende de taille,
// le moteur pour poser le diamètre de chaque pastille et arrêter la pointe des
// flèches à son bord.

/**
 * Resolves the `pointSize` prop of `<Globe>`.
 *
 * @param {Array<object>} points - Point objects.
 * @param {?(number|string)} pointSize - Diameter in px for every point, or the key
 *   of a numeric value whose AREA each point is made proportional to. Anything
 *   else keeps the default diameter of the point variant.
 * @returns {{
 *   mode: 'default'|'fixed'|'value',
 *   key: ?string,
 *   max: number,
 *   diameterFor: function(object, number): ?number,
 * }} `max` is the largest positive value of `key` (0 otherwise). `diameterFor(point,
 *   maxDiameter)` returns the diameter in px, 0 for a point not to draw, or null for
 *   the default diameter (left to the CSS tokens).
 */
export const resolvePointSize = (points, pointSize) => {
  if (typeof pointSize === 'number' && Number.isFinite(pointSize) && pointSize > 0) {
    return { mode: 'fixed', key: null, max: 0, diameterFor: () => pointSize };
  }
  if (typeof pointSize === 'string' && pointSize !== '') {
    const key = pointSize;
    // Valeur numérique d'un point, ou NaN : une chaîne numérique ('12') compte,
    // comme dans le chart où les colonnes arrivent souvent en texte depuis l'API.
    const valueOf = (p) => (p?.[key] == null || p[key] === '' ? NaN : Number(p[key]));
    const rows = Array.isArray(points) ? points : [];
    const max = rows.reduce((m, p) => {
      const v = valueOf(p);
      return Number.isFinite(v) && v > m ? v : m;
    }, 0);
    return {
      mode: 'value',
      key,
      max,
      // Aire ∝ valeur, donc diamètre ∝ √valeur — même convention que les bulles.
      // Sans valeur positive, le point n'est pas dessiné (z ≤ 0 dans le chart).
      diameterFor: (p, maxDiameter) => {
        const v = valueOf(p);
        return max > 0 && Number.isFinite(v) && v > 0 ? maxDiameter * Math.sqrt(v / max) : 0;
      },
    };
  }
  return { mode: 'default', key: null, max: 0, diameterFor: () => null };
};
