// =================================================================
// VITEST CONFIG — exécution des tests unitaires (fonctions pures + DOM léger)
// =================================================================
// Alias alignés sur jsconfig.json (`@/*`, `@config/*`, `@registry/*`, `@docs/*`) :
// Vitest ne lit pas les `paths` de jsconfig.json, ils sont donc redéclarés ici.
// Environnement jsdom global (plutôt que node) : quelques modules de
// src/utils/accessibility/ touchent au DOM (document, window.matchMedia) et
// doivent tourner sous le même environnement que le reste de la suite.

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
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
