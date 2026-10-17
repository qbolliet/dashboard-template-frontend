// =================================================================
// ACTIVE PATH — « page courante » et « branche active » d'une navigation
// =================================================================
// Deux notions distinctes :
// - la PAGE COURANTE : le seul lien dont le chemin est exactement le pathname.
//   C'est la seule à recevoir `aria-current="page"` : un lecteur d'écran n'annonce
//   « page actuelle » qu'une fois.
// - la BRANCHE ACTIVE : un nœud est actif sur sa propre page et sur toute page
//   en dessous. Sert à styler les groupes (classe `--active`) sans rien annoncer.
//
// Le nœud d'accueil n'a pas de cas particulier : c'est une feuille, donc il passe par
// `isCurrentPath` (égalité stricte) comme tout lien sans enfant.
//
// Aucune dépendance : la fonction est pure pour être testée hors React.

/**
 * Removes the trailing slash of a path, except for the root itself.
 *
 * @param {string} path - Any path.
 * @returns {string} The path without trailing slash ('/' stays '/').
 */
const stripTrailingSlash = (path) =>
    path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path;

/**
 * Tells whether a link targets the current page (strict equality).
 *
 * @param {string} pathname - Current pathname.
 * @param {string} path - Absolute path of the link.
 * @returns {boolean} True only when both paths designate the same page.
 */
export const isCurrentPath = (pathname, path) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return false;
  return stripTrailingSlash(pathname) === stripTrailingSlash(path);
};

/**
 * Tells whether any descendant of a node is on the active branch.
 *
 * @param {string} pathname - Current pathname.
 * @param {Object} node - Navigation node.
 * @returns {boolean} True when a descendant is the current page or one of its ancestors.
 */
export const hasActiveDescendant = (pathname, node) =>
  Array.isArray(node?.children) &&
  node.children.some(
    (child) => isActivePath(pathname, child.path) || hasActiveDescendant(pathname, child),
  );

/**
 * Tells whether a path is the current page or one of its ancestors.
 *
 * The comparison is segment-bounded: `/finances-publiques` must not light up on
 * `/finances-publiques-locales`.
 *
 * @param {string} pathname - Current pathname.
 * @param {string} path - Absolute path of the node.
 * @returns {boolean} True on the node's own page and on any page below it.
 */
export const isActivePath = (pathname, path) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return false;
  const current = stripTrailingSlash(pathname);
  const target = stripTrailingSlash(path);
  // Le '/' final borne le préfixe au segment d'URL. Pour la racine du site ('/'),
  // target + '/' vaudrait '//' : on la traite à part, elle n'est active que sur elle-même.
  return current === target || (target !== '/' && current.startsWith(target + '/'));
};
