// =================================================================
// EXPORT IMAGE — export du graphique en SVG / PNG
// =================================================================
// Module ES pur (aucun composant React), mais nécessairement dépendant du DOM
// navigateur (canvas, Blob, URL, XMLSerializer) : appelé uniquement depuis des
// gestionnaires d'événements de composants clients (ex. ChartToolbar), jamais
// au rendu. Porté depuis design-system/project/scripts/charts/chart.jsx.
//
// Problème résolu par ce fichier : le SVG source vit dans une page qui porte la
// feuille de styles de l'app (classes .chart-*, .visx-*, variables --color-*
// définies sur :root). Une fois cloné et sérialisé À PART (fichier .svg ouvert
// isolément, ou rastérisé dans un <canvas> hors DOM), ce contexte disparaît :
// les classes ne correspondent plus à aucune règle et les `var(--color-*)`
// ne se résolvent plus. On injecte donc dans le clone :
//   1) le texte CSS des feuilles de style accessibles (mêmes règles .chart-*),
//   2) un bloc `:root { --color-x: ...; }` avec les valeurs CALCULÉES (résolues
//      pour le thème courant, clair ou sombre) de chaque variable custom —
//      filet de sécurité si une variable est fixée ailleurs que dans les
//      feuilles capturées ci-dessus.

/**
 * Collects every custom property (`--*`) resolved on an element, in its
 * current computed state (theme-aware: reflects light/dark at call time).
 *
 * @param {Element} el - Element to read computed custom properties from.
 * @returns {string} CSS declarations, e.g. "--color-border: 220 14% 88%;".
 */
function collectComputedCssVariables(el) {
  // Style calculé de l'élément : résolution complète de toutes les propriétés
  // (standard ET personnalisées) pour l'état de thème actuellement affiché —
  // pas de branchement clair/sombre à gérer ici, la valeur est déjà la bonne.
  const computed = window.getComputedStyle(el);
  const declarations = [];
  // Parcours indexé de la déclaration calculée : les navigateurs modernes
  // exposent les propriétés personnalisées comme des entrées indexées au même
  // titre que les propriétés standard — seul moyen de les ÉNUMÉRER sans en
  // connaître les noms à l'avance (getPropertyValue seul exige de les nommer).
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    // Filtre sur le préfixe « -- » : exclusion des propriétés CSS standard
    // (déjà portées par les règles de la feuille collectée à côté), conservation
    // des seules variables custom (--color-*, --chart-*, --font-*, …).
    if (prop.startsWith('--')) {
      // Valeur RÉSOLUE (le résultat final, pas la référence var(...) d'origine) ;
      // trim car certains moteurs SCSS laissent un espace de tête après ':'.
      declarations.push(`${prop}: ${computed.getPropertyValue(prop).trim()};`);
    }
  }
  return declarations.join(' ');
}

/**
 * Concatenates the CSS text of every same-origin, accessible stylesheet.
 * Cross-origin sheets throw on `.cssRules` access and are silently skipped.
 *
 * @returns {string} Concatenated CSS text.
 */
function collectStylesheetText() {
  let css = '';
  // Parcours de TOUTES les feuilles chargées par la page (globals.scss compilé,
  // modules SCSS par composant, etc.) : c'est ici que vivent les vraies règles
  // .chart-*/.visx-* dont dépend l'apparence du graphique (couleurs de grille,
  // typographie des ticks, fond de la tooltip…).
  for (const sheet of document.styleSheets) {
    try {
      // Concaténation brute du texte de chaque règle (sélecteur + corps) : on
      // reproduit tel quel le contenu de la feuille, sans le réinterpréter.
      for (const rule of sheet.cssRules) css += rule.cssText + '\n';
    } catch {
      // Feuille cross-origin (CORS, ex. police Google Fonts servie ailleurs) :
      // lecture de .cssRules interdite par le navigateur — exception ignorée
      // sans bloquer l'export (perte de fidélité limitée aux styles externes,
      // jamais aux styles internes de l'application).
    }
  }
  return css;
}

/**
 * Clones an SVG element into a self-contained copy: same-origin stylesheet
 * rules and resolved CSS custom properties are inlined into an embedded
 * `<style>`, so the clone renders identically once detached from the page.
 *
 * @param {SVGSVGElement} svgEl - Source SVG element, still attached to the DOM.
 * @returns {SVGSVGElement} Self-contained clone.
 */
function cloneSelfContainedSvg(svgEl) {
  // Clonage profond : copie indépendante de tout le sous-arbre SVG (marks,
  // axes, defs…), détachable et modifiable sans effet de bord sur le
  // graphique réellement affiché à l'écran.
  const clone = svgEl.cloneNode(true);
  // Espace de noms explicite : nécessaire pour qu'un fichier .svg autonome
  // (ouvert hors navigateur, ou dans un onglet séparé sans document HTML
  // parent) soit reconnu comme du SVG valide par tout lecteur.
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Élément <style> à injecter en tête du clone : porteur à la fois des
  // règles de mise en forme (via collectStylesheetText) et des variables
  // calculées (via collectComputedCssVariables), pour rendre le fichier
  // entièrement indépendant de la page d'origine.
  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  // Bloc :root explicite en filet de sécurité : dans un document SVG
  // autonome, le sélecteur :root cible l'élément <svg> racine lui-même — les
  // valeurs y sont donc DISPONIBLES pour toute règle .chart-*/.visx-* copiée
  // ci-dessus, même si une variable était définie ailleurs que dans les
  // feuilles capturées (ex. injectée en JS, ou feuille cross-origin ignorée).
  const rootVars = `:root { ${collectComputedCssVariables(svgEl)} }`;
  styleEl.textContent = collectStylesheetText() + '\n' + rootVars;
  // Insertion en PREMIER enfant : un <style> doit précéder (dans l'ordre du
  // document) les éléments qu'il stylise pour être pris en compte à coup sûr.
  clone.insertBefore(styleEl, clone.firstChild);

  return clone;
}

/**
 * Exports an SVG chart to a downloaded `.svg` file.
 *
 * @param {?SVGSVGElement} svgEl - Source SVG element.
 * @param {string} [filename='chart.svg'] - Download filename.
 * @returns {void}
 */
export function exportSvg(svgEl, filename = 'chart.svg') {
  // Garde-fou : appel possible avant le premier rendu (ref pas encore attachée).
  if (!svgEl) return;
  const clone = cloneSelfContainedSvg(svgEl);
  // Sérialisation DOM → chaîne de texte XML, prête à être écrite dans un Blob.
  const serialized = new XMLSerializer().serializeToString(clone);
  // Déclaration XML en tête de fichier : garantit un .svg valide en dehors de
  // tout contexte HTML englobant (prologue attendu par de nombreux lecteurs).
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`], {
    type: 'image/svg+xml',
  });
  // URL objet temporaire : pointeur mémoire vers le Blob, consommé par le lien
  // de téléchargement ci-dessous (jamais transmis au réseau).
  const url = URL.createObjectURL(blob);
  // Lien de téléchargement invisible, cliqué par programmation : mécanisme
  // standard pour déclencher un téléchargement depuis du JS pur, sans backend.
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Libération différée de l'URL objet : laisse le temps au navigateur
  // d'amorcer le téléchargement avant de révoquer la référence mémoire.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Exports an SVG chart to a downloaded `.png` file, rasterized at 2x scale.
 * The canvas background is filled with the current theme's `--color-background`
 * (falling back to white) so dark-theme exports stay readable.
 *
 * @param {?SVGSVGElement} svgEl - Source SVG element.
 * @param {string} [filename='chart.png'] - Download filename.
 * @param {number} [scale=2] - Rasterization scale factor.
 * @returns {void}
 */
export function exportPng(svgEl, filename = 'chart.png', scale = 2) {
  if (!svgEl) return;
  // Dimensions de référence : le viewBox (coordonnées logiques du graphique)
  // prime sur la taille CSS affichée — un raster fidèle même si le SVG est
  // actuellement redimensionné de façon responsive (ex. fenêtre étroite).
  const width = svgEl.viewBox.baseVal.width || svgEl.clientWidth;
  const height = svgEl.viewBox.baseVal.height || svgEl.clientHeight;

  const clone = cloneSelfContainedSvg(svgEl);
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: 'image/svg+xml' });
  // URL objet du SVG intermédiaire : simple étape de passage vers le raster,
  // jamais exposée à l'utilisateur (contrairement à exportSvg).
  const url = URL.createObjectURL(blob);

  // Couleur de fond du canvas : lue sur le thème COURANT plutôt que figée en
  // blanc — un export en mode sombre garde ainsi un texte de chrome clair
  // lisible sur un fond sombre (blanc fixe le rendrait invisible).
  const backgroundVar = window.getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();
  const backgroundFill = backgroundVar ? `hsl(${backgroundVar})` : 'white';

  // Rastérisation asynchrone : un <img> doit d'abord CHARGER puis décoder le
  // SVG (travail du moteur de rendu du navigateur) avant de pouvoir être
  // dessiné sur un <canvas> — toute la suite de la fonction vit donc dans le
  // callback onload, déclenché une fois ce décodage terminé.
  const img = new Image();
  img.onload = () => {
    // Canvas hors DOM : simple buffer de rastérisation, jamais affiché ni
    // attaché à la page.
    const canvas = document.createElement('canvas');
    // Suréchantillonnage ×scale (2 par défaut) : évite un export flou sur les
    // écrans HiDPI/Retina, où 1 pixel CSS correspond à plusieurs pixels physiques.
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    // Remplissage du fond AVANT le dessin du graphique : contrairement au SVG,
    // un PNG opaque n'a pas de repli de transparence cohérent avec le thème.
    ctx.fillStyle = backgroundFill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Dessin à la résolution cible : le navigateur rastérise le SVG vectoriel
    // directement à la taille du canvas (donc net à ×2, pas un simple zoom
    // d'un raster basse résolution).
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Libération immédiate de l'URL du SVG intermédiaire : le raster est
    // désormais dans le canvas, la ressource source n'est plus nécessaire.
    URL.revokeObjectURL(url);
    // Encodage du canvas en Blob PNG (asynchrone), puis même mécanique de
    // téléchargement par lien invisible que exportSvg.
    canvas.toBlob((pngBlob) => {
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    });
  };
  // Déclenchement du chargement : affecter .src démarre le décodage du SVG,
  // qui appellera onload une fois l'image prête à être dessinée.
  img.src = url;
}
