// =================================================================
// NAVIGATION LAYOUT — disposition du header et nœuds cliquables
// =================================================================
// Deux décisions de présentation, prises à partir de l'arbre et du manifeste :
//
//   1. la DISPOSITION (`navigation.type`) : barre haute ou sidebar. Explicite, ou déduite
//      de la profondeur de l'arbre quand elle vaut `auto` ;
//   2. les NŒUDS CLIQUABLES (`navigation.linkedNodes`) : seules les feuilles sont des
//      liens, ou les nœuds internes aussi.
//
// Aucune dépendance et aucun import aliasé : comme resolveNavigationTree, ce module est
// importé par le Header (installable seul, hors de ce dépôt) et doit rester autonome.

/**
 * Deepest level a topbar renders: a top-level entry, then ONE dropdown level.
 * Beyond it, a tree needs the sidebar's indentation to stay readable.
 *
 * Seuil unique de la déduction `auto`. La barre haute sait dessiner un troisième niveau
 * (groupes dans le menu déroulant), mais au prix de panneaux larges : on le réserve au
 * choix explicite `type: "topbar"` plutôt qu'au défaut.
 */
export const TOPBAR_MAX_LEVELS = 2;

/**
 * Counts the levels of a navigation tree.
 *
 * Un nœud sans `path` compte comme un niveau : il s'affiche, même s'il n'est pas une page.
 *
 * @param {Array<Object>} [tree=[]] - Navigation tree (resolved or not).
 * @returns {number} 0 for an empty tree, 1 for a flat list, 2 when some node has children…
 */
export const getTreeDepth = (tree = []) =>
    tree.reduce((max, node) => Math.max(max, 1 + getTreeDepth(node.children ?? [])), 0);

/**
 * Resolves the navigation layout to render.
 *
 * @param {string} [type='auto'] - `topbar`, `sidebar`, or `auto` (deduced from the depth).
 * @param {Array<Object>} [tree=[]] - Navigation tree.
 * @returns {'topbar'|'sidebar'} The layout.
 */
export const resolveNavigationType = (type = 'auto', tree = []) => {
  if (type === 'topbar' || type === 'sidebar') return type;
  return getTreeDepth(tree) > TOPBAR_MAX_LEVELS ? 'sidebar' : 'topbar';
};

/**
 * Applies the `linkedNodes` setting to a resolved tree.
 *
 * - `leaves`: internal nodes lose their `path`, so the header renders them as plain
 *   folders (a label that only opens its children). Their page, if any, still exists —
 *   it is reachable by URL and by search — it is just not linked from the navigation.
 * - `all` and `auto`: the tree is returned as is. An internal node that carries a `path`
 *   is a link, one that doesn't is a folder. The two differ only at validation time:
 *   `all` makes `validate:config` reject an internal node without `path`.
 *
 * @param {Array<Object>} [tree=[]] - Resolved navigation tree.
 * @param {string} [mode='auto'] - `auto`, `leaves` or `all`.
 * @returns {Array<Object>} The tree to render. The input is left untouched.
 */
export const applyLinkedNodes = (tree = [], mode = 'auto') => {
  if (mode !== 'leaves') return tree;

  return tree.map((node) => {
    if (!Array.isArray(node.children) || node.children.length === 0) return node;
    // Copie sans `path` : la clé doit disparaître (et non valoir undefined) pour que le
    // header reconnaisse un dossier, comme resolveNavigationTree le produit.
    const folder = { ...node, children: applyLinkedNodes(node.children, mode) };
    delete folder.path;
    return folder;
  });
};
