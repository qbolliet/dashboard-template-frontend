// =================================================================
// DATE PARSE — helpers de date partagés (saisie manuelle à deux barres obliques)
// =================================================================
// Mutualisés entre TypeAwareInput (validation de TYPE date) et ConstraintField
// (projection des dates sur l'axe numérique du slider). Le séparateur de plage
// « → » est commun à tous les composants de filtre.
//
// L'ORDRE DES COMPOSANTES est paramétrable depuis P5.4 : le français écrit JJ/MM/AAAA,
// l'anglais américain MM/DD/YYYY. Il est passé sous forme de permutation de 'D', 'M' et
// 'Y' (voir `dateOrder` dans src/i18n/formats.js).
//
// Les EXPRESSIONS RÉGULIÈRES, elles, ne changent pas : `dd/dd/dddd` décrit les deux
// conventions à l'identique. Seule l'INTERPRÉTATION des deux premiers groupes diffère,
// et c'est ce que `parseDate` porte. Le savoir évite de dupliquer un motif par langue.

// ── Formats de date attendus (saisie manuelle) ──
export const DATE_SINGLE_RE = /^\d{2}\/\d{2}\/\d{4}$/;
export const DATE_RANGE_RE = /^\d{2}\/\d{2}\/\d{4} → \d{2}\/\d{2}\/\d{4}$/;

// Ordre par défaut : celui de la langue par défaut du template. Un composant installé
// seul depuis le registry n'a pas de manifeste à lire, il lui faut un défaut littéral.
export const DEFAULT_DATE_ORDER = 'DMY';

// Séparateur affiché entre les deux bornes d'une plage de dates
export const DATE_RANGE_SEP = ' → ';

/**
 * Formats a Date into a slash-separated string, in the locale's component order.
 *
 * @param {Date} date - Date to format.
 * @param {string} [order=DEFAULT_DATE_ORDER] - Permutation of 'D', 'M' and 'Y'.
 * @returns {string} e.g. '31/12/2026' for 'DMY', '12/31/2026' for 'MDY'.
 */
export const formatDate = (date, order = DEFAULT_DATE_ORDER) => {
  const parts = {
    D: String(date.getDate()).padStart(2, '0'),
    M: String(date.getMonth() + 1).padStart(2, '0'),
    Y: String(date.getFullYear()),
  };

  return [...order].map((key) => parts[key]).join('/');
};

/**
 * Parses a slash-separated date string into a valid Date, or null when it does not exist.
 *
 * @param {string} str - Candidate date string.
 * @param {string} [order=DEFAULT_DATE_ORDER] - Permutation of 'D', 'M' and 'Y' telling
 *   how to read the components. This is the whole difference between reading '03/04/2026'
 *   as 3 April or as 4 March — the string itself is identical.
 * @returns {?Date} Parsed Date, or null when invalid (e.g. 31/02).
 */
export const parseDate = (str, order = DEFAULT_DATE_ORDER) => {
  const parts = str.trim().split('/');
  if (parts.length !== 3 || parts.some((x) => !x || Number.isNaN(Number(x)))) return null;

  const numbers = parts.map(Number);
  const at = (key) => numbers[order.indexOf(key)];
  const [d, m, y] = [at('D'), at('M'), at('Y')];

  const date = new Date(y, m - 1, d);
  // Re-vérifie les composantes pour rejeter les débordements (ex: 31/02)
  const valid = date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return valid ? date : null;
};
