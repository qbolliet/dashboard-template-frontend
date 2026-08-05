// Importation des modules
import { notFound } from 'next/navigation';
import siteConfig from '@config/site.config.json';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import { flattenNavigation } from '@/utils/navigation/flattenNavigation';
import { findNodeByPath } from '@/utils/navigation/findNodeByPath';
import { PAGE_TYPES } from '@/config/pageTypes';

// =================================================================
// ROUTE ATTRAPE-TOUT — toutes les pages du site, générées depuis le manifeste
// =================================================================
// Il n'y a plus de dossier de page par URL : l'arbre de config/site.config.json est
// aplati en chemins par generateStaticParams(), et le `type` de chaque nœud est
// résolu en gabarit par src/config/pageTypes.js. Ajouter une page = ajouter un nœud.
//
// Le catch-all est OPTIONNEL (`[[...slug]]`) pour couvrir aussi la racine « / ».
// Conséquence à connaître : Next refuse alors la coexistence d'un src/app/page.tsx
// (erreur E925, « same specificity as an optional catch-all »), qui a donc été
// supprimé au profit du gabarit `home`.
//
// Les routes physiques restantes (src/app/test-*, src/app/filter-primitives) restent
// prioritaires sur cette route : un segment statique l'emporte toujours sur un
// segment dynamique.

// Résolu au niveau module : les `path` du manifeste sont relatifs à leur parent, tout
// le reste de ce fichier raisonne en chemins absolus.
const tree = resolveNavigationTree(siteConfig.navigation.tree);

// TODO(P4.6) — à supprimer avec src/app/filter-primitives/.
// Ce nœud a encore une route physique : le laisser dans generateStaticParams ferait
// prérendre deux pages différentes vers la même URL. C'est la seule entorse au
// principe « un nœud = une page générée ».
const PHYSICAL_ROUTES = new Set(['/filter-primitives']);

// Le HTML est figé au build puis régénéré en arrière-plan toutes les heures. Sans
// cela, un build lancé pendant une indisponibilité de l'API figerait un rendu dégradé
// jusqu'au prochain déploiement.
export const revalidate = 3600;

// `dynamicParams` reste à son défaut (true) : un chemin non listé ci-dessous est rendu
// à la demande, ne trouve pas de nœud et appelle notFound(), ce qui produit un vrai
// 404. À passer à false si le template est un jour exporté en statique
// (`output: 'export'`), incompatible avec la valeur par défaut.

/**
 * Rebuilds the absolute path from the catch-all segments.
 *
 * @param {string[]} [slug] - Path segments. `undefined` at the root — the optional
 *   catch-all passes no parameter there.
 * @returns {string} The absolute path, '/' at the root.
 */
const toPath = (slug) => '/' + (slug ?? []).join('/');

/**
 * Enumerates every page of the manifest as a route parameter set.
 *
 * @returns {Promise<Array<{slug: string[]}>>} One entry per navigable node. The root
 *   is `{ slug: [] }` — omitting the key entirely would fail the build.
 */
export const generateStaticParams = async () =>
    flattenNavigation(tree)
        .filter((node) => !PHYSICAL_ROUTES.has(node.path))
        .map((node) => ({ slug: node.path === '/' ? [] : node.path.slice(1).split('/') }));

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
