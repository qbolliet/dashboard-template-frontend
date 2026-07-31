// =================================================================
// LERP — interpolation linéaire entre deux valeurs
// =================================================================
// Compagnon de clamp() : les deux se retrouvent systématiquement ensemble dès
// qu'il s'agit d'animer ou de remapper une valeur (transitions du globe,
// échelles de rendu). Vit ici pour la même raison, et pour rester à côté de son
// jumeau plutôt que d'être redéfini au cas par cas.

/**
 * Linearly interpolates between two values.
 *
 * `t` is not bounded: values outside `[0, 1]` extrapolate. Pair with `clamp`
 * when the caller needs the result confined to `[a, b]`.
 *
 * @param {number} a - Value at `t = 0`.
 * @param {number} b - Value at `t = 1`.
 * @param {number} t - Interpolation factor.
 * @returns {number} Interpolated value.
 */
export const lerp = (a, b, t) => a + (b - a) * t;
