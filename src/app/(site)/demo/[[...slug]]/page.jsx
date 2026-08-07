// Importation des modules
import { notFound } from 'next/navigation';
import siteConfig from '@config/site.config.json';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import { flattenNavigation } from '@/utils/navigation/flattenNavigation';
import { findNodeByPath } from '@/utils/navigation/findNodeByPath';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';
import { PAGE_TYPES } from '@/config/pageTypes';

// =================================================================
// ROUTE ATTRAPE-TOUT — toutes les pages de la démo, générées depuis le manifeste
// =================================================================
// Il n'y a pas de dossier de page par URL : l'arbre de config/site.config.json est
// aplati en chemins par generateStaticParams(), et le `type` de chaque nœud est
// résolu en gabarit par src/config/pageTypes.js. Ajouter une page = ajouter un nœud.
//
// Le catch-all est OPTIONNEL (`[[...slug]]`) pour couvrir aussi la racine de la démo,
// /demo elle-même.
//
// MONTÉE SOUS /demo (P4.2) : la racine du déploiement appartient désormais au site de
// documentation (src/app/(docs)/), et l'application de démonstration vit sous /demo.
// Le manifeste ignore complètement ce déplacement — c'est le segment statique `demo/`
// de cette route, plus le DEMO_BASE_PATH passé à resolveNavigationTree, qui le
// réalisent. Les deux doivent rester en phase.
//
// Un segment statique l'emporte toujours sur un segment dynamique : cette route gagne
// donc sur (docs)/[[...slug]] pour tout ce qui commence par /demo. Les anciennes routes
// physiques /test-* et /filter-primitives, qui gagnaient auparavant sur les deux
// catch-all, ont été supprimées en P4.6 — leur rôle de banc d'essai est repris par les
// playgrounds du site de documentation (docs/playgrounds/).

// Résolu au niveau module : les `path` du manifeste sont relatifs à leur parent, tout
// le reste de ce fichier raisonne en chemins absolus, déjà préfixés par /demo.
const tree = resolveNavigationTree(siteConfig.navigation.tree, DEMO_BASE_PATH);

// Le HTML est figé au build puis régénéré en arrière-plan toutes les heures. Sans
// cela, un build lancé pendant une indisponibilité de l'API figerait un rendu dégradé
// jusqu'au prochain déploiement. Sans effet à l'export statique, qui n'a pas de
// serveur pour régénérer quoi que ce soit — mais sans effet NÉFASTE non plus : seul
// `revalidate = 0` (rendu dynamique) y serait rejeté.
export const revalidate = 3600;

// Export statique oblige : un chemin absent de generateStaticParams n'est pas rendu à
// la demande — il n'y a pas de serveur pour le produire — et sert le 404 global.
// C'est le comportement que le notFound() ci-dessous produisait déjà côté serveur.
export const dynamicParams = false;

/**
 * Rebuilds the absolute path from the catch-all segments.
 *
 * The segments are relative to /demo, the static parent segment of this route, whereas
 * the resolved tree carries /demo-prefixed absolute paths — d'où le préfixe rajouté ici.
 *
 * @param {string[]} [slug] - Path segments. `undefined` at the demo root — the optional
 *   catch-all passes no parameter there.
 * @returns {string} The absolute path, DEMO_BASE_PATH at the demo root.
 */
const toPath = (slug) => DEMO_BASE_PATH + (slug?.length ? `/${slug.join('/')}` : '');

/**
 * Strips the /demo prefix off an absolute node path, back to route segments.
 *
 * @param {string} path - Absolute path of a manifest node.
 * @returns {string[]} The catch-all segments, empty at the demo root.
 */
const toSegments = (path) => {
    const relative = path.slice(DEMO_BASE_PATH.length);

    return relative === '' ? [] : relative.slice(1).split('/');
};

/**
 * Enumerates every page of the manifest as a route parameter set.
 *
 * @returns {Promise<Array<{slug: string[]}>>} One entry per navigable node. The demo
 *   root is `{ slug: [] }` — omitting the key entirely would fail the build.
 */
export const generateStaticParams = async () =>
    flattenNavigation(tree).map((node) => ({ slug: toSegments(node.path) }));

/**
 * Derives the page metadata from its manifest node.
 *
 * The site title is not appended here: the root layout declares a `title.template`
 * that wraps whatever this returns. `description` is omitted when the node has none,
 * so the site-wide description is inherited rather than blanked out.
 *
 * @param {Object} props - Route props.
 * @param {Promise<{slug: string[]}>} props.params - Route parameters (async since Next 15).
 * @returns {Promise<Object>} The Next metadata object for this page.
 */
export const generateMetadata = async ({ params }) => {
    const { slug } = await params;
    const node = findNodeByPath(tree, toPath(slug));

    if (!node) return { title: 'Page introuvable' };

    return {
        title: node.name,
        ...(node.description && { description: node.description }),
    };
};

/**
 * Renders the page described by a manifest node.
 *
 * @param {Object} props - Route props.
 * @param {Promise<{slug: string[]}>} props.params - Route parameters (async since Next 15).
 * @returns {Promise<JSX.Element>} The rendered page.
 */
const GeneratedPage = async ({ params }) => {
    const { slug } = await params;
    const path = toPath(slug);
    const node = findNodeByPath(tree, path);

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

    // Le <main id="main-content"> est posé ICI, une fois pour toutes les pages générées :
    // c'est la cible du lien d'évitement rendu par le header. Corollaire — aucun gabarit
    // de src/features/pages/ ne rend de <main> (imbrication invalide).
    return (
        <main id="main-content">
            <PageComponent node={node} />
        </main>
    );
};

export default GeneratedPage;
