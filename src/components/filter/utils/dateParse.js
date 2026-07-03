// =================================================================
// DATE PARSE — helpers de date partagés (saisie manuelle JJ/MM/AAAA)
// =================================================================
// Mutualisés entre TypeAwareInput (validation de TYPE date) et ConstraintField
// (projection des dates sur l'axe numérique du slider). Le séparateur de plage
// « → » est commun à tous les composants de filtre.

// ── Formats de date attendus (saisie manuelle) ──
export const DATE_SINGLE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
export const DATE_RANGE_RE = /^\d{2}\/\d{2}\/\d{4} → \d{2}\/\d{2}\/\d{4}$/;

// Séparateur affiché entre les deux bornes d'une plage de dates
export const DATE_RANGE_SEP = ' → ';

/**
 * Formats a Date into a DD/MM/YYYY string.
 *
 * @param {Date} date - Date to format.
 * @returns {string} Date formatted as DD/MM/YYYY.
 */
export const formatDate = (date) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${date.getFullYear()}`;
};

/**
 * Parses a DD/MM/YYYY string into a valid Date, or null when the date does not exist.
 *
 * @param {string} str - Candidate date string.
 * @returns {?Date} Parsed Date, or null when invalid (e.g. 31/02).
 */
export const parseDate = (str) => {
  const parts = str.trim().split('/');
  if (parts.length !== 3 || parts.some((x) => !x || Number.isNaN(Number(x)))) return null;
  const [d, m, y] = parts.map(Number);
  const date = new Date(y, m - 1, d);
  // Re-vérifie les composantes pour rejeter les débordements (ex: 31/02)
  const valid = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return valid ? date : null;
};
