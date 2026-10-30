// =================================================================
// ZOOM SPEC — résolution du zoom initial (`defaultZoom`) en sélection de brush
// =================================================================
// Une « spec » décrit, en unités de données, la fenêtre d'un axe au premier
// rendu : `[from, to]`, `{ last: n }` ou `{ first: n }`. Ce module la traduit en
// sélection au format de useBrushZoom (`[Date, Date]`, `[n0, n1]` ou
// `[cat0, cat1]`), ou en `null` (vue complète). Fonctions pures : aucune
// dépendance à React, testables seules.

// Importation des modules
import { coerce } from './typeDetection';

// Séparateur des catégories dans la signature d'un domaine en bande : le
// caractère de contrôle NUL, absent de tout libellé affichable (« a,b » + « c »
// ne doit pas se confondre avec « a » + « b,c »). Même choix que MultiChart.
const NUL = String.fromCharCode(0);

/**
 * Logs a `defaultZoom` warning in development only (silent in production).
 *
 * @param {string} message - What was ignored and why.
 * @returns {void}
 */
export function warnZoom(message) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[defaultZoom] ${message}`);
  }
}

// Valeurs distinctes d'une colonne continue, en millisecondes / nombres, triées
// par ordre croissant (ordre du domaine). Les trous et non-finis sont ignorés.
const distinctContinuous = (data, col) => {
  const seen = new Set();
  for (const r of data) {
    const v = r[col];
    if (v == null) continue;
    const n = +v;
    if (Number.isFinite(n)) seen.add(n);
  }
  return [...seen].sort((a, b) => a - b);
};

// Spec de comptage valide : objet portant EXACTEMENT une clé `last` ou `first`,
// entier ≥ 1. Renvoie { from: 'last'|'first', n } ou null.
const parseCount = (spec) => {
  if (spec == null || typeof spec !== 'object' || Array.isArray(spec) || spec instanceof Date) return null;
  const keys = Object.keys(spec);
  if (keys.length !== 1 || (keys[0] !== 'last' && keys[0] !== 'first')) return null;
  const n = spec[keys[0]];
  if (!Number.isInteger(n) || n < 1) return null;
  return { from: keys[0], n };
};

/**
 * Resolves a `defaultZoom` axis spec into a brush selection for that axis.
 *
 * Spec forms (data units):
 *   - `[from, to]`: a window between two values — `Date` or ISO string on a date axis
 *     (converted by the same `coerce` as the data rows), number on a numeric axis,
 *     category value on a categorical axis. The order is normalized. Continuous bounds
 *     are clamped to the base domain; a window that misses the domain entirely, or a
 *     category absent from the band domain, resolves to `null`.
 *   - `{ last: n }` / `{ first: n }`: the n last (first) DISTINCT values of the axis, in
 *     domain order (band order on a categorical axis, ascending on a continuous one).
 *     `n` ≥ the number of distinct values resolves to `null`; on a continuous axis,
 *     `n = 1` is treated as 2 (a zero-width domain is not allowed).
 *
 * A window covering the whole base domain also resolves to `null`. Empty data resolves
 * to `null` without any warning. Any malformed spec (wrong shape, unparseable bound,
 * equal continuous bounds, `n` not a positive integer) resolves to `null` with a
 * development warning.
 *
 * @param {Array<*>|{last: number}|{first: number}|null|undefined} spec - Axis spec.
 * @param {object} ctx
 * @param {'date'|'number'|'categorical'} ctx.type - Column type of the axis.
 * @param {object} ctx.baseScale - Base (full-domain) scale of the axis.
 * @param {Array<object>} ctx.data - Coerced data rows.
 * @param {string} ctx.col - Column plotted on the axis.
 * @returns {?Array<*>} `[Date, Date]`, `[n0, n1]` or `[cat0, cat1]`; `null` = full view.
 */
export function resolveZoomSpec(spec, { type, baseScale, data, col }) {
  if (spec == null) return null;
  const categorical = type === 'categorical';
  const count = parseCount(spec);
  const isRange = Array.isArray(spec) && spec.length === 2 && spec[0] != null && spec[1] != null;
  if (!count && !isRange) {
    warnZoom(`spec invalide (${JSON.stringify(spec)}) : attendu [from, to], { last: n } ou { first: n }, n entier ≥ 1.`);
    return null;
  }

  // ── Fenêtre [from, to] : contrôle de forme AVANT toute dépendance aux données ──
  // Les bornes passent par la coercition des lignes (`coerce`) : une chaîne ISO
  // devient une Date exactement comme dans `typedData`.
  let bounds = null;
  if (isRange) {
    bounds = spec.map((v) => coerce(v, type));
    if (!categorical) {
      const [a, b] = bounds.map(Number);
      if (!Number.isFinite(a) || !Number.isFinite(b)) {
        warnZoom(`bornes illisibles sur un axe ${type} : ${JSON.stringify(spec)}.`);
        return null;
      }
      if (a === b) {
        warnZoom(`bornes égales (${JSON.stringify(spec)}) : un domaine de largeur nulle est interdit.`);
        return null;
      }
    }
  }

  // ── Axe catégoriel : indices dans le domaine de bande ─────────────────────
  if (categorical) {
    const dom = baseScale.domain();
    if (!dom.length) return null; // données vides (chargement) : vue complète
    let i0, i1;
    if (count) {
      if (count.n >= dom.length) return null;
      i0 = count.from === 'last' ? dom.length - count.n : 0;
      i1 = i0 + count.n - 1;
    } else {
      const a = dom.indexOf(bounds[0]);
      const b = dom.indexOf(bounds[1]);
      if (a < 0 || b < 0) return null; // catégorie absente du domaine (ex. après un filtre)
      i0 = Math.min(a, b); i1 = Math.max(a, b);
      if (i0 === 0 && i1 === dom.length - 1) return null;
    }
    return [dom[i0], dom[i1]];
  }

  // ── Axe continu (date / nombre) ───────────────────────────────────────────
  const out = (v) => (type === 'date' ? new Date(v) : v);
  if (count) {
    const vals = distinctContinuous(data, col);
    // n = 1 → 2 : la sélection [v, v] aurait une largeur nulle
    const n = Math.max(2, count.n);
    if (n >= vals.length) return null; // couvre aussi les données vides
    const lo = count.from === 'last' ? vals.length - n : 0;
    return [out(vals[lo]), out(vals[lo + n - 1])];
  }
  const [b0, b1] = baseScale.domain().map(Number);
  // Domaine de base dégénéré (données vides : bornes NaN) → vue complète, sans bruit
  if (!Number.isFinite(b0) || !Number.isFinite(b1)) return null;
  const dLo = Math.min(b0, b1), dHi = Math.max(b0, b1);
  const [a, b] = bounds.map(Number);
  const lo = Math.max(dLo, Math.min(a, b));
  const hi = Math.min(dHi, Math.max(a, b));
  if (lo >= hi) return null; // fenêtre entièrement hors du domaine
  if (lo <= dLo && hi >= dHi) return null; // fenêtre = domaine complet
  return [out(lo), out(hi)];
}

/**
 * Signature that triggers (re-)seeding an axis selection from its zoom spec:
 * `${spec signature}|${type}:${base domain signature}`.
 *
 * The domain part is the bounds of a continuous base domain (after `.nice()`, stable
 * for equal data) or the joined band domain of a categorical one. A new `data` identity
 * holding the same values therefore keeps the signature — and the user's own zoom —,
 * whereas a filter that changes the domain changes it.
 *
 * @param {*} spec - Axis spec of `defaultZoom` (any value, `undefined` included).
 * @param {object} baseScale - Base (full-domain) scale of the axis.
 * @param {'date'|'number'|'categorical'} type - Column type of the axis.
 * @returns {string} The signature.
 */
export function zoomSeedSignature(spec, baseScale, type) {
  const specSig = spec == null ? '' : JSON.stringify(spec);
  const dom = baseScale.domain();
  const domSig = type === 'categorical' ? dom.map(String).join(NUL) : dom.map(Number).join(',');
  return `${specSig}|${type}:${domSig}`;
}
