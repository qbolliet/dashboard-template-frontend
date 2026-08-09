// =================================================================
// NEGOTIATE LOCALE — choix de la langue à partir des préférences déclarées
// =================================================================
// UNE seule implémentation pour DEUX appelants, et c'est la raison d'être de ce
// fichier :
//
//   • src/app/(site)/demo/page.jsx — côté navigateur, à partir de `navigator.languages` ;
//   • examples/middleware.ts       — côté serveur, à partir de l'en-tête Accept-Language.
//
// Le déploiement de référence du template est un EXPORT STATIQUE (GitHub Pages) : Next
// refuse un middleware sous `output: 'export'`, donc le chemin réellement emprunté est
// le premier. Le second est livré en opt-in pour les consommateurs qui déploient sur un
// serveur. Deux implémentations dériveraient — même fonction, même tests.
//
// Correspondance en deux passes, dans cet ordre :
//   1. exacte, insensible à la casse ('fr-BE' trouve 'fr-BE') ;
//   2. sur la langue seule ('fr-BE' trouve 'fr' ; 'pt' trouve 'pt-BR').
// La seconde passe est ce qui fait qu'un navigateur réglé sur `fr-CA` obtient le
// français plutôt que le repli — le cas majoritaire en pratique.
//
// Ce qui n'est PAS ici, volontairement : la mémorisation du choix explicite de
// l'utilisateur (localStorage / cookie). Elle prime sur toute négociation et est traitée
// par l'appelant, avant de descendre ici. Cette fonction ne connaît que les préférences
// du système.

/**
 * Parses an Accept-Language header into an ordered list of language tags.
 *
 * Quality values are honoured; tags of equal quality keep their declared order. The
 * wildcard `*` is dropped — it means "anything", which is what the caller's fallback
 * already expresses.
 *
 * @param {string|null|undefined} header - Raw `Accept-Language` header value.
 * @returns {string[]} Language tags, most preferred first.
 */
export const parseAcceptLanguage = (header) => {
    if (typeof header !== 'string' || header.trim() === '') return [];

    return header
        .split(',')
        .map((part, index) => {
            const [tag, ...params] = part.trim().split(';');
            const quality = params
                .map((param) => /^\s*q=([0-9.]+)\s*$/.exec(param))
                .find(Boolean);

            return {
                tag: tag.trim(),
                // Absence de `q` ⇒ 1 (RFC 9110). `index` sert de départage stable : un
                // tri par `q` seul réordonnerait arbitrairement les tags de même poids.
                quality: quality ? Number.parseFloat(quality[1]) : 1,
                index,
            };
        })
        .filter((entry) => entry.tag !== '' && entry.tag !== '*' && Number.isFinite(entry.quality))
        .sort((a, b) => b.quality - a.quality || a.index - b.index)
        .map((entry) => entry.tag);
};

/**
 * Picks the best supported locale for a list of preferences.
 *
 * @param {string[]} candidates - Preferred language tags, most preferred first — from
 *   `navigator.languages` or from `parseAcceptLanguage`.
 * @param {string[]} supported - Locale codes the site actually ships.
 * @param {string} fallback - Returned when nothing matches. Must be one of `supported`.
 * @returns {string} A locale code taken from `supported`, never anything else.
 */
export const negotiateLocale = (candidates, supported, fallback) => {
    if (!Array.isArray(supported) || supported.length === 0) return fallback;
    if (!Array.isArray(candidates) || candidates.length === 0) return fallback;

    // Index en minuscules : les étiquettes BCP 47 sont insensibles à la casse, et les
    // navigateurs comme les en-têtes HTTP mélangent 'fr-BE', 'fr-be' et 'FR-BE'.
    const byExact = new Map(supported.map((code) => [code.toLowerCase(), code]));
    const byLanguage = new Map();
    for (const code of supported) {
        const language = code.toLowerCase().split('-')[0];
        // `set` seulement si absent : la PREMIÈRE locale déclarée pour une langue gagne,
        // ce qui rend l'ordre de `site.locales` significatif et prévisible.
        if (!byLanguage.has(language)) byLanguage.set(language, code);
    }

    // Passe 1 — correspondance exacte sur l'ensemble des candidats avant d'élargir :
    // un utilisateur qui demande ['fr-CA', 'en'] et un site qui sert ['fr', 'fr-CA']
    // doit obtenir 'fr-CA', pas 'fr'.
    for (const candidate of candidates) {
        if (typeof candidate !== 'string') continue;
        const exact = byExact.get(candidate.toLowerCase());
        if (exact) return exact;
    }

    // Passe 2 — correspondance sur la langue seule.
    for (const candidate of candidates) {
        if (typeof candidate !== 'string') continue;
        const language = byLanguage.get(candidate.toLowerCase().split('-')[0]);
        if (language) return language;
    }

    return fallback;
};
