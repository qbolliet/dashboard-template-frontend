#!/usr/bin/env node

// Vérifie que les teintes déclarées dans src/styles/globals/colors.scss et celles
// dupliquées en littéraux HSL dans src/features/chart/utils/encoding.js (PALETTE,
// SEQUENTIAL) restent numériquement identiques. Les deux fichiers ne peuvent pas
// partager une source unique à l'exécution : encoding.js a besoin de chaînes HSL
// concrètes, résolues au chargement du module (SSR compris) et parsables par
// d3-color pour l'export canvas — un `var(--color-navy)` non résolu y échouerait.
// Ce script comble l'écart en comparant les deux fichiers au build/lint.

const fs = require('fs');
const path = require('path');

const COLORS_SCSS = path.join(__dirname, '../src/styles/globals/colors.scss');
const ENCODING_JS = path.join(__dirname, '../src/features/chart/utils/encoding.js');
const EPSILON = 1e-6;

/**
 * Parses `--color-<name>: h s% l%;` declarations from the `:root` block only
 * (i.e. before the first `[data-theme` override block), since PALETTE/SEQUENTIAL
 * only mirror theme-invariant tokens.
 *
 * @param {string} scss - Full contents of colors.scss.
 * @returns {Map<string, {h: number, s: number, l: number}>} Token name -> HSL triple.
 */
function parseScssTokens(scss) {
  const rootBlock = scss.split(/\[data-theme/)[0];
  const tokens = new Map();
  const re = /--color-([a-z0-9-]+):\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%\s*;/g;
  let match;
  while ((match = re.exec(rootBlock)) !== null) {
    const [, name, h, s, l] = match;
    tokens.set(name, { h: parseFloat(h), s: parseFloat(s), l: parseFloat(l) });
  }
  return tokens;
}

/**
 * Parses `'hsl(h, s%, l%)', // --color-<name>` entries from encoding.js.
 *
 * @param {string} js - Full contents of encoding.js.
 * @returns {Array<{name: string, h: number, s: number, l: number, line: string}>} Parsed entries.
 */
function parseJsEntries(js) {
  const entries = [];
  const re = /hsl\(\s*([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%\s*\)[^\n]*--color-([a-z0-9-]+)/g;
  let match;
  while ((match = re.exec(js)) !== null) {
    const [line, h, s, l, name] = match;
    entries.push({ name, h: parseFloat(h), s: parseFloat(s), l: parseFloat(l), line });
  }
  return entries;
}

function main() {
  const scssTokens = parseScssTokens(fs.readFileSync(COLORS_SCSS, 'utf8'));
  const jsEntries = parseJsEntries(fs.readFileSync(ENCODING_JS, 'utf8'));

  if (jsEntries.length === 0) {
    console.error('check-palette-sync: aucune entrée --color-* trouvée dans encoding.js, regex à vérifier.');
    process.exit(1);
  }

  const errors = [];
  for (const entry of jsEntries) {
    const token = scssTokens.get(entry.name);
    if (!token) {
      errors.push(`--color-${entry.name} référencé dans encoding.js mais absent de colors.scss.`);
      continue;
    }
    const drifted =
      Math.abs(token.h - entry.h) > EPSILON ||
      Math.abs(token.s - entry.s) > EPSILON ||
      Math.abs(token.l - entry.l) > EPSILON;
    if (drifted) {
      errors.push(
        `--color-${entry.name} désynchronisé : colors.scss = ${token.h} ${token.s}% ${token.l}%, ` +
        `encoding.js = ${entry.h} ${entry.s}% ${entry.l}%.`
      );
    }
  }

  if (errors.length > 0) {
    console.error('check-palette-sync: colors.scss et encoding.js ont divergé :\n');
    for (const err of errors) console.error(`  - ${err}`);
    console.error('\nRéaligne les valeurs HSL dans les deux fichiers (voir le commentaire en tête de encoding.js).');
    process.exit(1);
  }

  console.log(`check-palette-sync: ${jsEntries.length} teintes synchronisées entre colors.scss et encoding.js.`);
}

main();
