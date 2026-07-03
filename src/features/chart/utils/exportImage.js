// =================================================================
// EXPORT IMAGE — export du graphique en SVG / PNG
// =================================================================
// Module ES pur (aucun composant React), mais nécessairement dépendant du DOM
// navigateur (canvas, Blob, URL, XMLSerializer) : appelé uniquement depuis des
// gestionnaires d'événements de composants clients (ex. ChartToolbar), jamais
// au rendu. Porté depuis design-system/project/scripts/charts/chart.jsx.
//
// Le SVG source vit dans une page qui porte la
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
  const computed = window.getComputedStyle(el);
  const declarations = [];
  for (let i = 0; i < computed.length; i++) {
    const prop = computed[i];
    if (prop.startsWith('--')) {
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
  for (const sheet of document.styleSheets) {
    try {
      for (const rule of sheet.cssRules) css += rule.cssText + '\n';
    } catch {
      // Feuille cross-origin (CORS) : inaccessible, on l'ignore.
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
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  const rootVars = `:root { ${collectComputedCssVariables(svgEl)} }`;
  styleEl.textContent = collectStylesheetText() + '\n' + rootVars;
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
  if (!svgEl) return;
  const clone = cloneSelfContainedSvg(svgEl);
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`], {
    type: 'image/svg+xml',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
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
  const width = svgEl.viewBox.baseVal.width || svgEl.clientWidth;
  const height = svgEl.viewBox.baseVal.height || svgEl.clientHeight;

  const clone = cloneSelfContainedSvg(svgEl);
  const serialized = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([serialized], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);

  const backgroundVar = window.getComputedStyle(document.documentElement).getPropertyValue('--color-background').trim();
  const backgroundFill = backgroundVar ? `hsl(${backgroundVar})` : 'white';

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = backgroundFill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((pngBlob) => {
      const pngUrl = URL.createObjectURL(pngBlob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    });
  };
  img.src = url;
}
