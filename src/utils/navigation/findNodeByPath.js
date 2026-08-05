// =================================================================
// FIND NODE BY PATH — chemin d'URL → nœud du manifeste
// =================================================================
// Résolution inverse de la navigation : c'est elle qui permet à la route
// attrape-tout de retrouver le nœud décrit par l'URL demandée, donc son `type`,
// son `name` et sa `description`.

/**
 * Finds the navigation node matching an absolute path.
 *
 * Expects a tree whose paths are ALREADY absolute — run `resolveNavigationTree`
 * first. Matching is a strict string equality, so an unknown path returns
 * `undefined` rather than the closest ancestor.
 *
 * @param {Array<Object>} tree - Resolved navigation tree.
 * @param {string} path - Absolute path to look up, e.g. '/comptabilite-nationale/france/pib'.
 * @returns {Object|undefined} The matching node, or `undefined` if none matches.
 */
export const findNodeByPath = (tree = [], path) => {
    for (const node of tree) {
        if (node.path === path) return node;

        // Descente uniquement dans les branches concernées : un chemin ne peut être
        // dans le sous-arbre d'un nœud que s'il en a le chemin pour préfixe. Le '/'
        // final évite qu'un frère nommé /finances-publiques-locales soit fouillé
        // depuis /finances-publiques.
        if (node.children && (node.path === '/' || path.startsWith(node.path + '/'))) {
            const found = findNodeByPath(node.children, path);
            if (found) return found;
        }
    }

    return undefined;
};
