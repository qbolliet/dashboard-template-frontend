import fs from 'node:fs';
import path from 'node:path';
import siteConfig from '../../config/site.config.json';
import { resolveNavigationTree } from '../../src/utils/navigation/resolveNavigationTree';
import { flattenNavigation } from '../../src/utils/navigation/flattenNavigation';
import { DEMO_BASE_PATH } from '../../src/utils/navigation/basePaths';

// =================================================================
// ROUTES — dérivées, jamais figées
// =================================================================
// Le test de fumée (e2e/smoke.spec.ts) doit couvrir toute page de documentation ET
// toute route générée depuis config/site.config.json, sans qu'une liste réécrite à la
// main puisse diverger du site réel. Deux stratégies, une par surface :
//
//   - docsRoutes() relit docs/content/**.mdx directement, avec la même dérivation de
//     chemin que scripts/build-docs-index.js (listMdx + toPagePath + filtre `draft`).
//     Volontairement PAS un import de docs/__docs__.js : ce module est généré et
//     gitignoré, régénéré uniquement par `npm run dev`/`prebuild` — dépendre de lui
//     ferait courir le risque d'un fichier absent ou périmé au moment où Playwright
//     charge ses specs.
//   - demoRoutes() réutilise tel quel le même resolveNavigationTree/flattenNavigation
//     que src/app/(site)/demo/[locale]/[[...slug]]/page.jsx : c'est la garantie qu'un
//     nœud ajouté au manifeste apparaît ici sans toucher au test.
//
// DEPUIS P5.4, demoRoutes() fait le PRODUIT CARTÉSIEN des langues et des nœuds, comme
// le generateStaticParams de la route. Conséquence directe et voulue : ajouter une
// langue à `site.locales` double la couverture du test de fumée sans qu'une ligne de
// test ne bouge. Le site de DOCUMENTATION, lui, reste monolingue et sans segment de
// langue — docsRoutes() est inchangée.

const PROJECT_ROOT = path.join(__dirname, '..', '..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'docs/content');

/**
 * Recursively lists every .mdx file under a directory, slash-separated.
 *
 * @param dir - Directory to walk.
 * @param prefix - Accumulated path relative to the walk root.
 * @returns Paths relative to `dir`.
 */
function listMdx(dir: string, prefix = ''): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) return listMdx(path.join(dir, entry.name), relative);
    return entry.name.endsWith('.mdx') ? [relative] : [];
  });
}

/** Whether a page's frontmatter marks it `draft: true` (same rule as build-docs-index.js). */
function isDraft(source: string): boolean {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return false;
  return /^draft\s*:\s*true\s*$/m.test(match[1]);
}

/** `index.mdx` → '/', `fondations/tokens.mdx` → '/fondations/tokens'. */
function toPagePath(relative: string): string {
  const withoutExtension = relative.replace(/\.mdx$/, '');
  const withoutIndex = withoutExtension.replace(/(^|\/)index$/, '');

  return withoutIndex === '' ? '/' : `/${withoutIndex}`;
}

/**
 * Every documentation route, derived straight from docs/content/**.mdx.
 *
 * @returns Absolute paths, sorted, root included.
 */
export function docsRoutes(): string[] {
  return listMdx(CONTENT_DIR)
    .filter((relative) => !isDraft(fs.readFileSync(path.join(CONTENT_DIR, relative), 'utf8')))
    .map(toPagePath)
    .sort();
}

/** Locale codes the site ships, read from the manifest like the application does. */
export const locales: string[] = siteConfig.site.locales;

/**
 * Every route generated from config/site.config.json, in every shipped language — the
 * exact same cross-product the real catch-all route runs at build time.
 *
 * @returns Absolute paths, /demo/<locale>-prefixed, each locale root included.
 */
export function demoRoutes(): string[] {
  return locales.flatMap((locale) => {
    const tree = resolveNavigationTree(
      siteConfig.navigation.tree,
      `${DEMO_BASE_PATH}/${locale}`,
    );

    return flattenNavigation(tree).map((node) => node.path);
  });
}

/**
 * The language-negotiating entry point, which belongs to no locale.
 *
 * Kept apart from `demoRoutes()`: it renders no content and immediately redirects, so a
 * smoke test must expect a different final URL than the one it requested.
 *
 * @returns The bare /demo path.
 */
export function demoEntryRoute(): string {
  return DEMO_BASE_PATH;
}
