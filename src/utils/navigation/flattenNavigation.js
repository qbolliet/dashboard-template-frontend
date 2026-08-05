// =================================================================
// FLATTEN NAVIGATION — arbre → liste de pages
// =================================================================
// Aplatit l'arbre en une liste de pages, dans l'ordre d'affichage (parcours en
// profondeur, parent avant ses enfants). Deux consommateurs : generateStaticParams
// de la route attrape-tout, et l'index de recherche (P3.3) — c'est précisément
// parce que ces deux-là partagent cette fonction que navigation et recherche ne
// peuvent plus diverger.

/**
 * Flattens a navigation tree into a flat list of pages.
 *
 * Expects a tree whose paths are ALREADY absolute — run `resolveNavigationTree`
 * first. Passing a raw manifest tree silently yields relative paths.
 *
 * @param {Array<Object>} tree - Resolved navigation tree.
 * @param {number} [depth=0] - Nesting level of the current branch, 0 at the root.
 * @returns {Array<{path: string, name: string, type: string, description: (string|undefined), searchable: boolean, depth: number}>}
 *   One entry per node, parents before their children.
 */
export const flattenNavigation = (tree = [], depth = 0) =>
    tree.flatMap((node) => [
        {
            path: node.path,
            name: node.name,
            type: node.type,
            description: node.description,
            // Défaut documentaire du schéma appliqué ici : ajv ne l'injecte pas
            // (validate-config.js n'active pas `useDefaults`), c'est au consommateur
            // de le faire — absent vaut `true`.
            searchable: node.searchable !== false,
            depth,
        },
        ...flattenNavigation(node.children, depth + 1),
    ]);
