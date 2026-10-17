// =================================================================
// FLATTEN NAVIGATION — arbre → liste de pages
// =================================================================
// Aplatit l'arbre en une liste de pages, dans l'ordre d'affichage (parcours en
// profondeur, parent avant ses enfants). Deux consommateurs : generateStaticParams
// de la route attrape-tout, et l'index de recherche (P3.3) — c'est précisément
// parce que ces deux-là partagent cette fonction que navigation et recherche ne
// peuvent plus diverger.
//
// `ancestors` porte les LIBELLÉS des parents, racine d'abord. Aplatir un arbre perd
// autrement toute trace de la hiérarchie : « France » et « PIB » redeviennent deux
// entrées sans lien, alors que c'est précisément ce lien qui permet à la recherche de
// répondre à « pib france » et d'afficher trois pages « PIB » homonymes de façon
// distinguable. Le tableau vaut donc la peine d'être calculé ici, une fois, plutôt que
// reconstruit par chaque consommateur à coups de découpage de `path` — un chemin ne
// porte que des segments d'URL, pas les libellés traduits.

/**
 * Flattens a navigation tree into a flat list of pages.
 *
 * Expects a tree whose paths are ALREADY absolute — run `resolveNavigationTree`
 * first. Passing a raw manifest tree silently yields relative paths. Nodes without
 * `path` (folders) yield no entry of their own.
 *
 * @param {Array<Object>} tree - Resolved navigation tree.
 * @param {number} [depth=0] - Nesting level of the current branch, 0 at the root.
 * @param {Array<string>} [ancestors=[]] - Names of the enclosing nodes, root first.
 * @returns {Array<{path: string, name: string, type: string, description: (string|undefined), keywords: (Array<string>|undefined), searchable: boolean, depth: number, ancestors: Array<string>}>}
 *   One entry per node, parents before their children. `ancestors` excludes the node
 *   itself and always has `depth` elements.
 */
export const flattenNavigation = (tree = [], depth = 0, ancestors = []) =>
    tree.flatMap((node) => [
        // Un dossier (nœud sans `path`) n'est pas une page : ni route, ni entrée de
        // recherche. Il reste dans `depth` et `ancestors` de ses descendants, dont il
        // porte le libellé dans le fil d'Ariane.
        ...(typeof node.path === 'string' ? [{
            path: node.path,
            name: node.name,
            type: node.type,
            description: node.description,
            // Synonymes déclarés au nœud, consommés par l'index de recherche. Comme
            // `description`, la valeur vaut `undefined` quand le manifeste ne la porte
            // pas — c'est au consommateur de choisir son défaut.
            keywords: node.keywords,
            // Défaut documentaire du schéma appliqué ici : ajv ne l'injecte pas
            // (validate-config.js n'active pas `useDefaults`), c'est au consommateur
            // de le faire — absent vaut `true`.
            searchable: node.searchable !== false,
            depth,
            ancestors,
        }] : []),
        ...flattenNavigation(node.children, depth + 1, [...ancestors, node.name]),
    ]);
