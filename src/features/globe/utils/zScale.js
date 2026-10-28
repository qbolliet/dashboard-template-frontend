// =================================================================
// Z SCALE — clé `z` d'un calque → rapport à la plus grande valeur
// =================================================================
// Pendant, pour les deux calques du globe, de la troisième dimension de <Chart>
// (zMark="bubble") : `z` nomme une colonne numérique, et chaque ligne reçoit le rapport
// de sa valeur à la plus grande valeur positive du calque, dans [0, 1].
//   • Points : l'AIRE de la pastille est proportionnelle à z (diamètre = max · √ratio,
//     cf. `bubbleDiameter`), le plus grand point valant le token
//     --globe-marker-max-size ; une valeur nulle, négative ou absente ne dessine rien,
//     comme une bulle de z ≤ 0 dans le chart.
//   • Flux : le rapport pilote linéairement l'épaisseur du trait, la hauteur de l'arc
//     et la vitesse de la comète (sa luminosité en mark "glow"). Une donnée venue de
//     la base n'est donc jamais à normaliser par l'appelant.
//
// Module PUR (ni React ni three) : <Globe> s'en sert pour la légende de taille et la
// tooltip, et transmet au moteur les accesseurs `ratioFor`.

/**
 * Resolves the `z` key of a globe layer.
 *
 * @param {Array<object>} rows - Layer rows.
 * @param {?string} key - Key of a numeric value; anything else means no size encoding.
 * @returns {{key: ?string, max: number, ratioFor: function(object): ?number}} `max` is
 *   the largest positive value of `key` (0 otherwise). `ratioFor(row)` returns the value
 *   divided by `max`, in [0, 1] — 0 for a null, non-positive or missing value — or null
 *   without `key` (the layer keeps its default size).
 */
export const resolveZ = (rows, key) => {
  if (typeof key !== 'string' || key === '') return { key: null, max: 0, ratioFor: () => null };
  // Valeur numérique d'une ligne, ou NaN : une chaîne numérique ('12') compte, comme
  // dans le chart où les colonnes arrivent souvent en texte depuis l'API.
  const valueOf = (row) => (row?.[key] == null || row[key] === '' ? NaN : Number(row[key]));
  const list = Array.isArray(rows) ? rows : [];
  const max = list.reduce((m, row) => {
    const v = valueOf(row);
    return Number.isFinite(v) && v > m ? v : m;
  }, 0);
  return {
    key,
    max,
    ratioFor: (row) => {
      const v = valueOf(row);
      return max > 0 && Number.isFinite(v) && v > 0 ? Math.min(v / max, 1) : 0;
    },
  };
};

/**
 * Diameter of a point whose AREA is proportional to its z ratio.
 *
 * @param {?number} ratio - Output of `ratioFor` (null = no size encoding).
 * @param {number} maxDiameter - Diameter of the largest point, in px.
 * @returns {?number} Diameter in px (0 = point not drawn), or null for the default
 *   diameter of the mark (left to the CSS tokens).
 */
export const bubbleDiameter = (ratio, maxDiameter) => {
  if (ratio == null) return null;
  // Aire ∝ valeur, donc diamètre ∝ √valeur — même convention que les bulles du chart.
  return ratio > 0 ? maxDiameter * Math.sqrt(ratio) : 0;
};
