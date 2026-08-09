// =================================================================
// SEARCH MATCH — appariement multi-termes, multi-champs, pondéré
// =================================================================
// Le moteur d'appariement de la barre de recherche. Trois règles, et elles se tiennent :
//
//   1. TOUS LES TERMES doivent être trouvés (ET), chacun par PRÉFIXE DE MOT, mais
//      chacun dans le champ qu'il veut. C'est ce qui fait marcher « pib france » : le
//      premier terme est dans le titre, le second dans le fil d'Ariane. La version
//      précédente cherchait une SEULE sous-chaîne contiguë dans un SEUL champ — cette
//      requête, la plus naturelle qui soit, ne renvoyait rien.
//   2. Le préfixe de mot, et non la sous-chaîne, est la sémantique d'un champ
//      d'autocomplétion : on complète un mot commencé, on ne cherche pas « sommation »
//      au milieu de « Consommation ». La contrainte ET du point 1 fait le reste du
//      travail de précision.
//   3. Les champs sont PONDÉRÉS (titre > synonymes > fil d'Ariane > description) et le
//      score d'un terme est celui de son MEILLEUR champ. Deux bonus s'y ajoutent : mot
//      trouvé en entier plutôt qu'entamé, et champ commençant par le terme.
//
// REPLI NFD + SUPPRESSION DES MARQUES DIACRITIQUES : chaque lettre accentuée composée
// (« é ») compte pour UN seul caractère avant comme après, donc les indices calculés sur
// la chaîne repliée restent valides pour découper la chaîne ORIGINALE (surlignage). Cette
// égalité de longueur est VÉRIFIÉE avant d'émettre le moindre intervalle : quelques
// caractères la rompent (`toLowerCase` de 'İ' rend deux caractères), et un surlignage
// décalé est pire qu'un surlignage absent. Le score, lui, reste acquis.
//
// L'ÉLISION ET LE TRAIT D'UNION sont traités par le DÉCOUPAGE, jamais par une réécriture
// de la chaîne : « l'emploi » donne les jetons « l » et « emploi », « Bouches-du-Rhône »
// en donne trois. Réécrire (« l'emploi » → « emploi ») déplacerait les indices et
// casserait le surlignage — exactement ce que le repli NFD prend soin d'éviter.

const DIACRITIC_MARKS = /[̀-ͯ]/g;

// Jeton = suite de lettres ou de chiffres, dans N'IMPORTE QUEL alphabet. `\p{L}` plutôt
// que `[a-z]` : le repli ci-dessus retire les accents latins, il ne translittère pas le
// grec ni le cyrillique, et un template destiné à être installé chez des tiers n'a pas à
// présumer de la langue de leur manifeste. Tout le reste — espaces, apostrophes, traits
// d'union, ponctuation, le « › » du fil d'Ariane — sépare.
const TOKEN_PATTERN = /[\p{L}\p{N}]+/gu;

// Séparateur du fil d'Ariane. Partagé entre l'appariement et le rendu par
// `breadcrumbText` : les deux DOIVENT voir la même chaîne, sinon les intervalles de
// surlignage sont calculés sur un texte qui n'est pas celui qui est affiché.
const BREADCRUMB_SEPARATOR = ' › ';

// Poids des champs. L'ordre relatif est le message : un terme trouvé dans le titre vaut
// plus que le même terme trouvé dans une description, quelle que soit l'entrée. Les
// écarts sont volontairement larges — un match de titre ne doit pas pouvoir être rattrapé
// par deux matchs de description.
export const FIELD_WEIGHTS = {
    title: 10,
    keywords: 6,
    breadcrumb: 3,
    description: 1,
};

// Bonus cumulables, appliqués à l'occurrence la mieux placée du terme dans le champ.
const EXACT_TOKEN_BONUS = 2;  // le mot est trouvé ENTIER, pas seulement entamé
const FIELD_START_BONUS = 3;  // le champ COMMENCE par le terme

/**
 * Folds a string for comparison: lower-cased, diacritics stripped, same length as the
 * input for common Latin accents.
 *
 * @param {string} value - The string to fold.
 * @returns {string} The folded string.
 */
export const fold = (value) => value.normalize('NFD').replace(DIACRITIC_MARKS, '').toLowerCase();

/**
 * Splits a raw query into the folded terms that must ALL be found.
 *
 * Duplicates are dropped: typing the same word twice is a slip, and letting it count
 * twice would rank the entry above better matches.
 *
 * @param {string} rawQuery - The raw input value.
 * @returns {Array<string>} Folded, de-duplicated terms, in typing order.
 */
export const splitQuery = (rawQuery) =>
    [...new Set(fold(rawQuery ?? '').match(TOKEN_PATTERN) ?? [])];

/**
 * Renders the breadcrumb of an index entry as the single string the matcher and the
 * suggestion list both work on.
 *
 * @param {Object} entry - A search index entry.
 * @returns {string} The joined trail, empty for a root-level page.
 */
export const breadcrumbText = (entry) => (entry.breadcrumb ?? []).join(BREADCRUMB_SEPARATOR);

/**
 * Merges overlapping or touching highlight ranges, sorted by position.
 *
 * Two terms of the same query routinely hit the same word — « pib pi » — and two
 * adjacent <mark> would show a visible seam.
 *
 * @param {Array<{start: number, end: number}>} ranges - Unsorted ranges of one field.
 * @returns {Array<{start: number, end: number}>} Disjoint ranges, left to right.
 */
const mergeRanges = (ranges) => {
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged = [];

    for (const range of sorted) {
        const last = merged[merged.length - 1];
        if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
        else merged.push({ ...range });
    }

    return merged;
};

/**
 * Matches one folded term against one field, by word prefix.
 *
 * @param {?string} value - The field text, in its original form.
 * @param {string} term - One folded query term.
 * @returns {?{ranges: Array<{start: number, end: number}>, bonus: number}} Every
 *   occurrence (for highlighting) and the bonus of the best-placed one, or `null` when
 *   the term is absent. `ranges` is empty — without cancelling the match — when the
 *   folded form is not index-aligned with the original.
 */
const matchTermInField = (value, term) => {
    if (!value) return null;

    const folded = fold(value);
    const aligned = folded.length === value.length;

    const ranges = [];
    let bonus = 0;
    let matched = false;

    for (const token of folded.matchAll(TOKEN_PATTERN)) {
        const [text] = token;
        if (!text.startsWith(term)) continue;

        matched = true;
        if (aligned) ranges.push({ start: token.index, end: token.index + term.length });

        const occurrence =
            (text.length === term.length ? EXACT_TOKEN_BONUS : 0)
            + (token.index === 0 ? FIELD_START_BONUS : 0);
        if (occurrence > bonus) bonus = occurrence;
    }

    return matched ? { ranges, bonus } : null;
};

/**
 * Reads the four searchable fields of an index entry as plain strings.
 *
 * `keywords` is joined for matching only — it is never displayed, so its ranges are
 * computed and then ignored by the caller. `breadcrumb` goes through `breadcrumbText`,
 * the string the suggestion list renders.
 *
 * @param {Object} entry - A search index entry.
 * @returns {Object<string, string>} One string per key of `FIELD_WEIGHTS`.
 */
const searchableFields = (entry) => ({
    title: entry.title ?? '',
    keywords: (entry.keywords ?? []).join(' '),
    breadcrumb: breadcrumbText(entry),
    description: entry.description ?? '',
});

/**
 * Scores one index entry against a query, and locates its highlights.
 *
 * @param {Object} entry - A search index entry.
 * @param {Array<string>} terms - Folded query terms, as returned by `splitQuery`.
 * @returns {?{score: number, ranges: Object<string, Array<{start: number, end: number}>>}}
 *   The entry's score and, per field, the disjoint ranges to highlight — or `null` when
 *   at least one term is missing from every field, which disqualifies the entry.
 */
export const scoreEntry = (entry, terms) => {
    if (terms.length === 0) return null;

    const fields = searchableFields(entry);
    const ranges = {};
    let score = 0;

    for (const term of terms) {
        // Meilleur champ POUR CE TERME : chaque terme marque là où il est le mieux
        // placé, indépendamment des autres. Le fil d'Ariane peut donc porter un terme
        // pendant que le titre en porte un autre.
        let best = null;

        for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
            const hit = matchTermInField(fields[field], term);
            if (!hit) continue;

            const value = weight + hit.bonus;
            if (best === null || value > best) best = value;

            // Le surlignage, lui, n'est pas exclusif : un terme présent dans le titre ET
            // dans la description est marqué des deux côtés.
            if (hit.ranges.length > 0) {
                ranges[field] = [...(ranges[field] ?? []), ...hit.ranges];
            }
        }

        if (best === null) return null;
        score += best;
    }

    for (const field of Object.keys(ranges)) ranges[field] = mergeRanges(ranges[field]);

    return { score, ranges };
};
