// Next.js 16 : @next/eslint-plugin-next utilise désormais le format Flat Config par défaut.
// On consomme directement les configs plates exportées par eslint-config-next
// (tableaux Linter.Config[]) plutôt que de passer par FlatCompat.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/** @type {import("eslint").Linter.Config[]} */
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Dossiers générés / dépendances / archives legacy exclus du lint.
    // old_components/ et old_src/ sont d'anciens composants archivés, non importés
    // par l'application active (code source courant dans src/).
    // design-system/ est le prototype de référence (D3 en IIFE navigateur, non
    // suivi par git) porté vers src/ — c'est la SOURCE visuelle, pas du code
    // applicatif : exclu du lint au même titre que les archives.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "old_components/**",
      "old_src/**",
      "design-system/**",
    ],
  },
];

export default eslintConfig;
