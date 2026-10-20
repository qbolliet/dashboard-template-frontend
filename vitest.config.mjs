// =================================================================
// VITEST CONFIG — exécution des tests unitaires (fonctions pures + DOM léger)
// =================================================================
// Alias alignés sur jsconfig.json (`@/*`, `@config/*`, `@registry/*`, `@docs/*`) :
// Vitest ne lit pas les `paths` de jsconfig.json, ils sont donc redéclarés ici.
// Environnement jsdom global (plutôt que node) : quelques modules de
// src/utils/accessibility/ touchent au DOM (document, window.matchMedia) et
// doivent tourner sous le même environnement que le reste de la suite.

import { defineConfig } from 'vitest/config';
import { transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Le dépôt écrit du JSX dans des fichiers `.js` (ThemeProvider.js, ThemeToggleButton.js…),
// ce que Next compile mais que le transformateur de Vitest refuse pour une extension `.js`.
// Ce plugin re-transforme ces fichiers comme du `.jsx`, uniquement pour les tests.
const jsxInJs = {
  name: 'jsx-in-js',
  enforce: 'pre',
  async transform(code, id) {
    // Un fichier peut contenir du JSX sans importer 'react' (runtime automatique) : on
    // repère aussi une balise de composant (`<ResetIcon />`).
    const hasJsx = code.includes('react') || /<[A-Z]\w*[\s/>]/.test(code);
    if (!/[\\/]src[\\/].*\.js$/.test(id) || !hasJsx) return null;
    const result = await transformWithOxc(code, `${id}x`, { jsx: { runtime: 'automatic' } });
    return { code: result.code, map: result.map };
  },
};

export default defineConfig({
  plugins: [jsxInJs, react()],
  // PostCSS inline et vide : postcss.config.mjs déclare le plugin Tailwind sous une forme que
  // Vite ne sait pas charger, et les tests de composants importent des .scss. Aucun test
  // n'a besoin de Tailwind ; le SCSS, lui, reste compilé par sass.
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.mjs'],
    include: ['src/**/*.test.{js,jsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './config'),
      '@registry': path.resolve(__dirname, './registry'),
      '@docs': path.resolve(__dirname, './docs'),
    },
  },
});
