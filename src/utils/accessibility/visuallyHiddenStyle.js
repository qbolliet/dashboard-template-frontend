/**
 * Inline CSS text hiding a node visually while keeping it readable by screen readers.
 *
 * Applied through `element.style.cssText` on nodes created imperatively, outside React
 * and outside any stylesheet.
 *
 * @type {string}
 */
// POURQUOI DU CSS EN LIGNE ET NON LA CLASSE `.sr-only`
// Les live regions sont créées par du JS impératif (document.createElement) qui peut
// s'exécuter avant — ou sans — que la feuille de styles globale soit chargée : chez un
// tiers ayant installé le seul item `utils-accessibility` depuis le registry, `.sr-only`
// n'existe tout simplement pas. Une live region rendue visible afficherait en clair, au
// milieu de la page, chaque message destiné aux lecteurs d'écran. Le style en ligne est
// donc le choix correct, pas un raccourci.
//
// Ce texte duplique par construction le mixin styles/utils/visually-hidden.scss — la
// frontière JS/CSS interdit de partager la valeur. Toute modification de la géométrie
// doit être répercutée des deux côtés.
export const VISUALLY_HIDDEN_CSS_TEXT = `
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
`;

export default VISUALLY_HIDDEN_CSS_TEXT;
