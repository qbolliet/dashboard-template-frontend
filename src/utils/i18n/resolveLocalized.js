// =================================================================
// RESOLVE LOCALIZED — lecture d'un champ de configuration traduisible
// =================================================================
// Dans config/site.config.json et les autres fichiers de config/, tout champ de texte
// visible accepte DEUX formes :
//
//   "name": "PIB"                          ← identique dans toutes les langues
//   "name": { "fr": "Accueil", "en": "Home" }
//
// La forme chaîne n'est pas une tolérance héritée : c'est la forme JUSTE pour tout ce
// qui ne se traduit pas — un sigle, un symbole d'opérateur (`=`, `≥`), un nom propre.
// L'imposer sous forme d'objet à trois clés identiques serait du bruit, et inviterait à
// traduire ce qui ne doit pas l'être.
//
// La résolution ne renvoie JAMAIS `undefined` : un titre de page absent casserait la
// navigation et le <title> sans rien signaler. Le repli descend en trois marches — la
// langue demandée, la langue par défaut du site, puis n'importe quelle valeur présente.
// La troisième marche est délibérée : afficher le nœud dans la mauvaise langue vaut
// mieux que l'afficher vide, et `npm run check:i18n` signale le manque au build.

/**
 * Reads a possibly-localized configuration value.
 *
 * @param {string|Object<string, string>|null|undefined} value - Either a plain string
 *   (same text in every locale) or a map of locale code to text.
 * @param {string} locale - Requested locale code, e.g. 'en'.
 * @param {string} defaultLocale - The site's default locale, used as first fallback.
 * @returns {string} The resolved text, or an empty string when nothing is available.
 */
export const resolveLocalized = (value, locale, defaultLocale) => {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value !== 'object') return String(value);

    // Marche 1 — la langue demandée. On teste la vacuité, pas seulement la présence :
    // une clé laissée à "" dans un fichier de traduction en cours doit se replier, pas
    // produire un libellé muet (même invariant que mergeLabels).
    const requested = value[locale];
    if (typeof requested === 'string' && requested.trim() !== '') return requested;

    // Marche 2 — la langue par défaut du site.
    const fallback = value[defaultLocale];
    if (typeof fallback === 'string' && fallback.trim() !== '') return fallback;

    // Marche 3 — la première valeur non vide, quelle que soit sa langue.
    for (const candidate of Object.values(value)) {
        if (typeof candidate === 'string' && candidate.trim() !== '') return candidate;
    }

    return '';
};

/**
 * Tells whether a configuration value carries per-locale variants.
 *
 * Used by `scripts/check-i18n.js` to walk the config files and check that every
 * localized object covers every declared locale.
 *
 * @param {*} value - Any configuration value.
 * @returns {boolean} True for a locale map, false for a plain string or anything else.
 */
export const isLocalizedValue = (value) =>
    value != null && typeof value === 'object' && !Array.isArray(value);

/**
 * Reads a possibly-localized LIST of configuration values.
 *
 * Same duality as `resolveLocalized`, one rank up: un tableau nu — les mêmes termes
 * dans toutes les langues, forme juste pour des sigles ou des noms propres
 * (`["INSEE", "SEC 2010"]`) — ou une carte de langue vers tableau, quand les synonymes
 * diffèrent (`{ "fr": ["impôts"], "en": ["taxes"] }`). Le repli descend les mêmes trois
 * marches, et la valeur de retour est TOUJOURS un tableau : un consommateur n'a jamais
 * à distinguer « pas de clé » de « clé vide ».
 *
 * @param {Array<string>|Object<string, Array<string>>|null|undefined} value - Either a
 *   plain array (same terms in every locale) or a map of locale code to array.
 * @param {string} locale - Requested locale code.
 * @param {string} defaultLocale - The site's default locale, used as first fallback.
 * @returns {Array<string>} The resolved list, empty when nothing is available.
 */
export const resolveLocalizedList = (value, locale, defaultLocale) => {
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== 'object') return [];

    // Même invariant que resolveLocalized : on teste la VACUITÉ, pas la présence. Une
    // langue dont la liste de synonymes est `[]` doit se replier sur celle qui en a.
    const candidates = [value[locale], value[defaultLocale], ...Object.values(value)];
    for (const candidate of candidates) {
        if (Array.isArray(candidate) && candidate.length > 0) return candidate;
    }

    return [];
};

/**
 * Resolves every localized field of a navigation tree, in place of the caller.
 *
 * The tree keeps its exact shape and every other key; only `name`, `description` and
 * `keywords` collapse from a locale map to a plain value. Applied once at the route
 * boundary, so that no downstream component — sidebar, topbar, breadcrumb, search
 * index — ever has to know that a field could have been a map.
 *
 * @param {Array<Object>} tree - Navigation tree, as declared in the manifest.
 * @param {string} locale - Requested locale code.
 * @param {string} defaultLocale - The site's default locale.
 * @returns {Array<Object>} A new tree with resolved `name`, `description` and `keywords`.
 */
export const resolveLocalizedTree = (tree = [], locale, defaultLocale) =>
    tree.map((node) => ({
        ...node,
        name: resolveLocalized(node.name, locale, defaultLocale),
        // `description` est facultative dans le schéma : on ne crée pas la clé si elle
        // était absente, plusieurs composants testent sa présence.
        ...(node.description !== undefined && {
            description: resolveLocalized(node.description, locale, defaultLocale),
        }),
        // `keywords` suit la même règle — elle n'alimente que l'index de recherche, qui
        // traite la clé absente comme une liste vide.
        ...(node.keywords !== undefined && {
            keywords: resolveLocalizedList(node.keywords, locale, defaultLocale),
        }),
        ...(node.children && {
            children: resolveLocalizedTree(node.children, locale, defaultLocale),
        }),
    }));
