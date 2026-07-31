// =================================================================
// CLAMP — bornage d'une valeur numérique dans un intervalle
// =================================================================
// Promu dans la couche transverse src/utils/ parce que trois consommateurs sans
// lien entre eux le redéfinissaient chacun de leur côté : le moteur du globe
// (bornes de zoom, de latitude, facteurs de fondu), le champ de contrainte du
// filtre (position des thumbs en %) et le redimensionnement du header (largeur
// entre min et max). Trois copies, trois compositions différentes de
// Math.min/Math.max pour un même contrat — exactement le genre d'écart où se
// glisse une inversion de borne.

/**
 * Clamps a value into the `[lo, hi]` interval.
 *
 * When `lo > hi` (an inconsistent interval, which callers should not produce)
 * the upper bound wins — the same behaviour the three call sites this replaces
 * already had, since they all applied the lower bound first.
 *
 * @param {number} value - Value to bound.
 * @param {number} lo - Lower bound, inclusive.
 * @param {number} hi - Upper bound, inclusive.
 * @returns {number} `value` bounded to `[lo, hi]`.
 */
export const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
