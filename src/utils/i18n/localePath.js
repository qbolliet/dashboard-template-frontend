// =================================================================
// LOCALE PATH — lecture et remplacement du segment de langue dans une URL
// =================================================================
// L'URL est la SOURCE DE VÉRITÉ de la langue courante — pas un contexte React, pas le
// localStorage. C'est ce qui rend chaque page partageable, indexable, et rendue
// statiquement dans la bonne langue par `generateStaticParams`. Le localStorage ne sert
// qu'à mémoriser un choix pour la prochaine visite ; il ne décide jamais du rendu.
//
// Forme des chemins de l'application de démonstration :
//
//   /demo/fr                                   ← accueil, français
//   /demo/en/comptabilite-nationale/france/pib
//   └──┬─┘└┬┘
//      │   └── le segment de langue, TOUJOURS immédiatement après le préfixe
//      └────── DEMO_BASE_PATH (cf. src/utils/navigation/basePaths.js)
//
// Une surface hors préfixe — le site de documentation du template, qui vit à la racine
// et reste en français (décision de P5.4) — n'a PAS de segment de langue. Ces fonctions
// ne s'appliquent donc qu'aux chemins situés sous le préfixe, et renvoient le chemin
// inchangé ailleurs.
//
// PIÈGE À NE PAS RÉINTRODUIRE : `trailingSlash` vaut `true` à l'export statique et
// `false` en développement (cf. next.config.ts). Le même chemin s'écrit donc
// '/demo/fr/pib' avec `npm run dev` et '/demo/fr/pib/' dans `out/`. Tout découpage
// doit tolérer les deux — d'où la normalisation systématique en tête de chaque
// fonction, et la restitution de la barre finale à l'identique en sortie.

/**
 * Splits a pathname into its segments, ignoring leading and trailing slashes.
 *
 * @param {string} pathname - Any site-absolute path.
 * @returns {string[]} Non-empty segments.
 */
const toSegments = (pathname) => pathname.split('/').filter(Boolean);

/**
 * Reads the locale segment of a demo pathname.
 *
 * @param {string} pathname - Site-absolute path, with or without a trailing slash.
 * @param {Object} options - Lookup options.
 * @param {string[]} options.locales - Locale codes the site ships.
 * @param {string} [options.prefix='/demo'] - Path prefix the locale segment follows.
 * @returns {string|null} The locale code, or `null` when the path carries none — either
 *   because it is outside `prefix` (a surface with no locale segment) or because it is the bare
 *   prefix itself (`/demo`, handled by the redirector page).
 */
export const readLocaleFromPath = (pathname, { locales, prefix = '/demo' }) => {
    if (typeof pathname !== 'string') return null;

    const prefixSegments = toSegments(prefix);
    const segments = toSegments(pathname);

    // Le chemin doit commencer par le préfixe, segment par segment. Une comparaison de
    // chaînes par `startsWith` accepterait '/demolition' comme préfixé par '/demo'.
    for (const [index, segment] of prefixSegments.entries()) {
        if (segments[index] !== segment) return null;
    }

    const candidate = segments[prefixSegments.length];

    return locales.includes(candidate) ? candidate : null;
};

/**
 * Rewrites a demo pathname to point at the same page in another locale.
 *
 * This is what a language switcher navigates to: the reader stays on the page they were
 * reading instead of being sent back to the home page.
 *
 * @param {string} pathname - Current site-absolute path.
 * @param {string} nextLocale - Locale code to switch to.
 * @param {Object} options - Rewrite options.
 * @param {string[]} options.locales - Locale codes the site ships.
 * @param {string} [options.prefix='/demo'] - Path prefix the locale segment follows.
 * @returns {string} The rewritten path, keeping the trailing slash convention of the
 *   input. A path carrying no locale segment is returned untouched — switching the
 *   language of a surface that has a single language is meaningless.
 */
export const swapLocaleInPath = (pathname, nextLocale, { locales, prefix = '/demo' }) => {
    const current = readLocaleFromPath(pathname, { locales, prefix });
    if (current === null) return pathname;

    const prefixSegments = toSegments(prefix);
    const segments = toSegments(pathname);
    segments[prefixSegments.length] = nextLocale;

    // La barre finale est restituée telle qu'elle était : la réécrire dans l'autre
    // convention provoquerait une redirection supplémentaire à l'export, et un 404 en
    // développement.
    const hasTrailingSlash = pathname.endsWith('/') && pathname !== '/';

    return `/${segments.join('/')}${hasTrailingSlash ? '/' : ''}`;
};

/**
 * Builds the path of the demo home page in a given locale.
 *
 * @param {string} locale - Locale code.
 * @param {string} [prefix='/demo'] - Path prefix the locale segment follows.
 * @returns {string} e.g. '/demo/en'.
 */
export const localeHomePath = (locale, prefix = '/demo') => `${prefix}/${locale}`;
