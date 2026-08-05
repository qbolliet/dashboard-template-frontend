// Importation des modules
import { notFound } from 'next/navigation';
import { DOCS_PAGES, DOCS_PATHS } from '@docs/__docs__';
import { DOCS_MODULES } from '@docs/__docs-pages__';

// =================================================================
// ROUTE ATTRAPE-TOUT — toutes les pages de la DOCUMENTATION
// =================================================================
// Le contenu rédigé vit dans docs/content/**.mdx, hors de src/app/ : il n'y a donc pas
// un dossier de route par page. scripts/build-docs-index.js balaye ces fichiers et émet
// deux modules — l'index de métadonnées (@docs/__docs__) et la carte des chargeurs
// (@docs/__docs-pages__) —, que cette route consomme.
//
// Le catch-all est OPTIONNEL (`[[...slug]]`) pour couvrir aussi la racine du site, qui
// est la page d'accueil de la documentation.
//
// Le chargement du MDX se fait par simple `await` du chargeur, ce composant étant un
// Server Component async : ni React.lazy, ni next/dynamic, ni Suspense. Le contenu MDX
// n'atteint jamais une frontière client, et en développement seule la page demandée est
// compilée.
//
// Aucun <main> ici : (docs)/layout.jsx le pose via <DocsShell>.

// Export statique : un chemin absent de generateStaticParams n'est pas rendu à la
// demande — il n'y a pas de serveur pour le produire — et sert le 404 global.
export const dynamicParams = false;

/**
 * Rebuilds the page path from the catch-all segments.
 *
 * @param {string[]} [slug] - Path segments. `undefined` at the root — the optional
 *   catch-all passes no parameter there.
 * @returns {string} The absolute page path, '/' at the root.
 */
const toPath = (slug) => `/${(slug ?? []).join('/')}`;

/**
 * Enumerates every documentation page as a route parameter set.
 *
 * @returns {Promise<Array<{slug: string[]}>>} One entry per page. The root is
 *   `{ slug: [] }` — omitting the key entirely would fail the build.
 */
export const generateStaticParams = async () =>
    DOCS_PATHS.map((path) => ({ slug: path === '/' ? [] : path.slice(1).split('/') }));

/**
 * Derives the page metadata from the generated index.
 *
 * The site title is not appended here: the root layout declares a `title.template`
 * that wraps whatever this returns.
 *
 * @param {Object} props - Route props.
 * @param {Promise<{slug: string[]}>} props.params - Route parameters (async since Next 15).
 * @returns {Promise<Object>} The Next metadata object for this page.
 */
export const generateMetadata = async ({ params }) => {
    const { slug } = await params;
    const page = DOCS_PAGES[toPath(slug)];

    if (!page) return { title: 'Page introuvable' };

    return {
        title: page.title,
        ...(page.description && { description: page.description }),
    };
};

/**
 * Renders one MDX documentation page.
 *
 * @param {Object} props - Route props.
 * @param {Promise<{slug: string[]}>} props.params - Route parameters (async since Next 15).
 * @returns {Promise<JSX.Element>} The rendered page.
 */
const DocsPage = async ({ params }) => {
    const { slug } = await params;
    const load = DOCS_MODULES[toPath(slug)];

    // URL qui ne correspond à aucun fichier de docs/content/.
    if (!load) notFound();

    const { default: Content } = await load();

    return <Content />;
};

export default DocsPage;
