// =================================================================
// RESOLVE NAVIGATION TREE — chemins relatifs → chemins absolus
// =================================================================
// Dans config/site.config.json, le `path` d'un nœud est RELATIF à son parent
// (cf. config/schema/site.schema.json, $defs.navigationNode.path) : un nœud
// `/pib` sous `/france` sous `/comptabilite-nationale` répond en réalité à
// /comptabilite-nationale/france/pib.
//
// La concaténation est faite ICI, UNE SEULE FOIS, à la frontière (src/app/layout.tsx
// pour le header, la route attrape-tout pour le routage). Tous les consommateurs en
// aval — liens de la sidebar, isActivePath, fil d'Ariane, generateStaticParams —
// travaillent ensuite sur des chemins absolus et n'ont plus rien à recomposer.
// L'historique du dépôt montre pourquoi : la sidebar ne concaténait pas du tout
// (liens cassés), la topbar concaténait à la main sur deux niveaux, et le fil
// d'Ariane comparait un chemin relatif à un pathname absolu.
//
// Aucune dépendance et aucun import aliasé dans ce dossier : le script d'index de
// recherche (P3.3) doit pouvoir importer ces fonctions par chemin relatif, hors
// bundler Next.

/**
 * Joins a parent path with a child's relative path.
 *
 * @param {string} parentPath - Absolute path of the parent node ('/' at the root).
 * @param {string} childPath - Path of the child, relative to its parent.
 * @returns {string} The child's absolute path.
 */
const joinPath = (parentPath, childPath) => {
    // Tout ce qui n'est pas un chemin interne (ancre '#', URL externe, mailto:, tel:)
    // passe tel quel : SidebarItem et SidebarGroup s'appuient sur ces formes pour
    // distinguer lien externe et non-lien. Le schéma les interdit aujourd'hui, mais
    // <Header> accepte aussi un arbre construit à la main.
    if (!childPath.startsWith('/')) return childPath;
    // Le nœud racine du manifeste HÉRITE du chemin de son parent — c'est ce qui permet
    // de monter tout l'arbre sous un préfixe (/demo) en ne changeant qu'un argument à
    // l'appel. Renvoyer '/' en dur avalait ce préfixe pour le seul nœud d'accueil, et
    // le laissait donc en collision avec la racine du site de documentation.
    // Quand parentPath vaut '/' (cas historique), le résultat est inchangé.
    if (childPath === '/') return parentPath;
    // Racine traitée à part, sinon '/' + '/pib' donnerait '//pib'.
    return (parentPath === '/' ? '' : parentPath) + childPath;
};

/**
 * Resolves every `path` of a navigation tree into an absolute path.
 *
 * Returns a new tree with the same shape and the same keys — only `path` changes.
 * The input is left untouched.
 *
 * @param {Array<Object>} tree - Navigation tree as declared in the site manifest.
 * @param {string} [parentPath='/'] - Absolute path inherited from the parent node. At the
 *   top level this doubles as the MOUNT POINT of the whole tree: passing `DEMO_BASE_PATH`
 *   (see ./basePaths.js) is what moves the entire application under /demo, the root node
 *   included.
 * @returns {Array<Object>} The same tree with absolute paths.
 */
export const resolveNavigationTree = (tree = [], parentPath = '/') =>
    tree.map((node) => {
        const path = joinPath(parentPath, node.path);

        return {
            ...node,
            path,
            // `children` n'est recréée que si elle existe : le schéma impose d'omettre
            // la clé sur une feuille, et plusieurs composants testent sa présence.
            ...(node.children && { children: resolveNavigationTree(node.children, path) }),
        };
    });
