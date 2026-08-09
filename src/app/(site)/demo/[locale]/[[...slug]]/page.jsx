// Importation des modules
import { notFound } from 'next/navigation';
import siteConfig from '@config/site.config.json';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import { flattenNavigation } from '@/utils/navigation/flattenNavigation';
import { findNodeByPath } from '@/utils/navigation/findNodeByPath';
import { resolveLocalized, resolveLocalizedTree } from '@/utils/i18n/resolveLocalized';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';
import { LOCALES, DEFAULT_LOCALE, isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/getDictionary';
import { PAGE_TYPES } from '@/config/pageTypes';

// =================================================================
// ROUTE ATTRAPE-TOUT — toutes les pages de la démo, dans toutes les langues
// =================================================================
// Il n'y a pas de dossier de page par URL : l'arbre de config/site.config.json est
// aplati en chemins par generateStaticParams(), et le `type` de chaque nœud est
// résolu en gabarit par src/config/pageTypes.js. Ajouter une page = ajouter un nœud.
//
// DEUX PRÉFIXES successifs mènent à ce fichier, et ils n'ont PAS la même nature :
//
//   /demo            segment statique — la racine du déploiement appartient au site de
//                    DOCUMENTATION (src/app/(docs)/), l'application vit dessous (P4.2).
//   /demo/<langue>   segment dynamique [locale] — la dimension ajoutée par P5.4.
//
// Le manifeste ignore complètement les deux : ses `path` restent relatifs à leur parent,
// et c'est `resolveNavigationTree(tree, ${DEMO_BASE_PATH}/${locale})` qui monte tout
// l'arbre au bon endroit. Aucun lien en aval n'a à connaître ni /demo ni la langue —
// c'est le même levier unique qu'en P4.2, avec un argument de plus.
//
// L'ARBRE EST RÉSOLU PAR RENDU, et non au niveau module comme avant : son préfixe et
// ses libellés dépendent tous deux de la langue. C'est le seul changement de structure
// du fichier.
//
// Un segment statique l'emporte toujours sur un segment dynamique : cette route gagne
// donc sur (docs)/[[...slug]] pour tout ce qui commence par /demo.

/**
 * Builds the manifest tree as it exists in one language.
 *
 * Two transformations, applied in this order and once per render:
 *   1. localized fields (`name`, `description`) collapse from a locale map to a string;
 *   2. relative `path`s become absolute, mounted under /demo/<locale>.
 *
 * @param {string} locale - Site locale code.
 * @returns {Array<Object>} The resolved tree.
 */
const treeFor = (locale) =>
    resolveNavigationTree(
        resolveLocalizedTree(siteConfig.navigation.tree, locale, DEFAULT_LOCALE),
        `${DEMO_BASE_PATH}/${locale}`,
    );

// Le HTML est figé au build puis régénéré en arrière-plan toutes les heures. Sans
// cela, un build lancé pendant une indisponibilité de l'API figerait un rendu dégradé
// jusqu'au prochain déploiement. Sans effet à l'export statique, qui n'a pas de
// serveur pour régénérer quoi que ce soit — mais sans effet NÉFASTE non plus : seul
// `revalidate = 0` (rendu dynamique) y serait rejeté.
export const revalidate = 3600;

// Export statique oblige : un chemin absent de generateStaticParams n'est pas rendu à
// la demande — il n'y a pas de serveur pour le produire — et sert le 404 global. C'est
// aussi ce qui borne le segment [locale] : une langue non déclarée dans le manifeste
// n'entre pas dans la route, et ne peut donc pas dupliquer tout le site sous un préfixe
// arbitraire.
export const dynamicParams = false;

/**
 * Rebuilds the absolute path from the route parameters.
 *
 * The segments are relative to /demo/<locale>, the parent segments of this route,
 * whereas the resolved tree carries fully-prefixed absolute paths.
 *
 * @param {string} locale - Locale segment.
 * @param {string[]} [slug] - Path segments. `undefined` at the locale root — the
 *   optional catch-all passes no parameter there.
 * @returns {string} The absolute path.
 */
const toPath = (locale, slug) =>
    `${DEMO_BASE_PATH}/${locale}` + (slug?.length ? `/${slug.join('/')}` : '');

/**
 * Strips the /demo/<locale> prefix off an absolute node path, back to route segments.
 *
 * @param {string} path - Absolute path of a manifest node.
 * @param {string} locale - Locale the tree was resolved for.
 * @returns {string[]} The catch-all segments, empty at the locale root.
 */
const toSegments = (path, locale) => {
    const relative = path.slice(`${DEMO_BASE_PATH}/${locale}`.length);

    return relative === '' ? [] : relative.slice(1).split('/');
};

/**
 * Enumerates every page of the manifest, in every shipped language.
 *
 * The cartesian product locales × nodes is what makes the site multilingual under a
 * static export: there is no server to negotiate a language per request, so every
 * (language, page) pair is a file written at build time.
 *
 * @returns {Promise<Array<{locale: string, slug: string[]}>>} One entry per pair. The
 *   locale root is `{ locale, slug: [] }` — omitting the key entirely would fail the build.
 */
export const generateStaticParams = async () =>
    LOCALES.flatMap((locale) =>
        flattenNavigation(treeFor(locale)).map((node) => ({
            locale,
            slug: toSegments(node.path, locale),
        })),
    );

/**
 * Derives the page metadata from its manifest node.
 *
 * The site title is not appended here: the root layout declares a `title.template`
 * that wraps whatever this returns. `description` is omitted when the node has none,
 * so the site-wide description is inherited rather than blanked out.
 *
 * `alternates.languages` is what tells search engines that the same page exists in
 * other languages — the only signal they get, the static export having no server to
 * emit a Content-Language header or a redirect.
 *
 * @param {Object} props - Route props.
 * @param {Promise<{locale: string, slug: string[]}>} props.params - Route parameters
 *   (async since Next 15).
 * @returns {Promise<Object>} The Next metadata object for this page.
 */
export const generateMetadata = async ({ params }) => {
    const { locale, slug } = await params;
    const dictionary = await getDictionary(locale);

    if (!isLocale(locale)) return { title: dictionary.notFound.title };

    const node = findNodeByPath(treeFor(locale), toPath(locale, slug));

    if (!node) return { title: dictionary.notFound.title };

    const segments = slug?.length ? `/${slug.join('/')}` : '';

    return {
        title: node.name,
        ...(node.description && { description: node.description }),
        alternates: {
            languages: Object.fromEntries(
                LOCALES.map((code) => [code, `${DEMO_BASE_PATH}/${code}${segments}`]),
            ),
        },
    };
};

/**
 * Renders the page described by a manifest node, in the requested language.
 *
 * @param {Object} props - Route props.
 * @param {Promise<{locale: string, slug: string[]}>} props.params - Route parameters
 *   (async since Next 15).
 * @returns {Promise<JSX.Element>} The rendered page.
 */
const GeneratedPage = async ({ params }) => {
    const { locale, slug } = await params;

    // Garde du segment de langue. `dynamicParams = false` la rend théoriquement
    // inatteignable au build, mais elle protège le mode serveur (`next dev`, `next start`)
    // où le segment accepte n'importe quelle valeur.
    if (!isLocale(locale)) notFound();

    const path = toPath(locale, slug);
    const node = findNodeByPath(treeFor(locale), path);

    // URL qui ne correspond à aucun nœud du manifeste.
    if (!node) notFound();

    const entry = PAGE_TYPES[node.type];

    if (!entry) {
        // Journalisé avant le 404 : un type validé par le schéma mais absent du registre
        // est une erreur de configuration, pas une URL erronée — elle doit être visible
        // dans la sortie de `next build` plutôt que silencieuse.
        console.error(
            `[pageTypes] type « ${node.type} » absent du registre pour ${path} — page introuvable.`,
        );
        notFound();
    }

    const PageComponent = entry.component;
    const dictionary = await getDictionary(locale);

    // Le <main id="main-content"> est posé ICI, une fois pour toutes les pages générées :
    // c'est la cible du lien d'évitement rendu par le header. Corollaire — aucun gabarit
    // de src/page-templates/ ne rend de <main> (imbrication invalide).
    //
    // `locale` et `labels` descendent en props explicites plutôt que par un contexte :
    // les gabarits de pages sont des Server Components, et un contexte React ne les
    // traverserait pas.
    return (
        <main id="main-content">
            <PageComponent
                node={node}
                locale={locale}
                labels={dictionary.pages}
                dictionary={dictionary}
                siteTitle={resolveLocalized(siteConfig.site.title, locale, DEFAULT_LOCALE)}
                siteDescription={resolveLocalized(
                    siteConfig.site.description,
                    locale,
                    DEFAULT_LOCALE,
                )}
            />
        </main>
    );
};

export default GeneratedPage;
