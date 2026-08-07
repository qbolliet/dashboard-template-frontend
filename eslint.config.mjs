// Next.js 16 : @next/eslint-plugin-next utilise désormais le format Flat Config par défaut.
// On consomme directement les configs plates exportées par eslint-config-next
// (tableaux Linter.Config[]) plutôt que de passer par FlatCompat.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import globals from "globals";

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
      // Sorties de l'export statique : out/ est le site généré par `npm run build:docs`,
      // tmp/ la copie sous sous-chemin servie pour le vérifier. Ce sont des artefacts de
      // build (chunks minifiés), pas du code source — sans cette exclusion, `npm run lint`
      // les analyse et remonte des milliers de problèmes qui masquent les vrais.
      "out/**",
      "tmp/**",
      "next-env.d.ts",
      "old_components/**",
      "old_src/**",
      "design-system/**",
      // Module généré par scripts/build-registry.js : sa forme est décidée par
      // le script, pas par le lint. registry/examples/ reste linté, lui — ce
      // sont des composants React distribués, ils doivent tenir la même barre.
      "registry/__registry__.js",
      // Idem pour les deux modules générés par scripts/build-docs-index.js.
      // docs/content/**.mdx n'est pas concerné : ESLint ne lint pas le MDX.
      "docs/__docs__.js",
      "docs/__docs-pages__.js",
    ],
  },
  {
    // scripts/ contient des scripts Node CommonJS de tooling (ex. check-palette-sync.js) :
    // ni React ni navigateur, donc globals Node (module, require, __dirname, process,
    // console) plutôt que l'exclusion du lint — ce script garde la palette et doit être
    // lint comme le reste. `require` y est désactivé volontairement (CommonJS pur, pas
    // de bundler/ESM), pas une dérive à corriger.
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    // e2e/ (Playwright) tourne sous Node, pas dans le navigateur ni sous Next : globals
    // Node, et les règles React/Next (hooks, composants) n'ont rien à y vérifier.
    files: ["e2e/**/*.ts", "playwright.config.ts"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      "react-hooks/rules-of-hooks": "off",
    },
  },
];

export default eslintConfig;
