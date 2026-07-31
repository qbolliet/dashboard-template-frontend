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
 * the upper bound wins. The three copies this replaces did not agree on that
 * degenerate case — the globe engine and `useResizable` applied the lower bound
 * first, so `hi` won, while `ConstraintField` applied it last, so `lo` won. The
 * bound order is unobservable on any well-formed interval; it is documented
 * here only so the divergence is not rediscovered as a behaviour change.
 *
 * @param {number} value - Value to bound.
 * @param {number} lo - Lower bound, inclusive.
 * @param {number} hi - Upper bound, inclusive.
 * @returns {number} `value` bounded to `[lo, hi]`.
 */
export const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));
