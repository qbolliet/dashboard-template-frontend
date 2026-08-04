// Résolveur d'imports statique, partagé par scripts/build-inventory.js et — à
// terme — scripts/build-registry.js (P4.1). Il répond à une seule question :
// « ce fichier, de quels autres fichiers a-t-il besoin ? », en JavaScript comme
// en SCSS, avec les mêmes règles de résolution que Next et Sass.
//
// Deux exigences dictent l'implémentation :
//
// 1. Les commentaires DOIVENT être ignorés. Le dépôt contient une quinzaine de
//    blocs « à décommenter pour brancher l'API » qui mentionnent
//    `import { request } from 'graphql-request'`, et des JSDoc du type
//    `@param {import('@/utils/format/formatNumber').FormatSpec}`. Une extraction
//    par expression régulière attribue `graphql-request` à chart/table/filter et
//    invente un cycle globe → globe. On passe donc par un AST (acorn), qui ne
//    conserve tout simplement pas les commentaires.
// 2. La résolution Sass n'est pas celle de Node : `@use '../tokens'` désigne
//    `../_tokens.scss`. Les quatre formes en usage dans le dépôt sont gérées.

const fs = require('fs');
const path = require('path');
const { Parser } = require('acorn');
const jsx = require('acorn-jsx');

const JsxParser = Parser.extend(jsx());

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// Alias déclarés dans tsconfig.json (paths). `@config/` pointe hors de src/.
const ALIASES = [
  { prefix: '@/', target: 'src/' },
  { prefix: '@config/', target: 'config/' },
];

const JS_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json'];
const JS_PARSABLE = new Set(['.js', '.jsx', '.mjs', '.cjs']);

// Extensions considérées comme des ressources servies depuis public/.
const ASSET_EXTENSIONS = /\.(svg|png|jpe?g|webp|gif|avif|ico|glb|gltf|woff2?)$/i;

/**
 * Converts an absolute path to a repo-relative POSIX path.
 *
 * @param {string} absolutePath - Absolute path inside the repository.
 * @returns {string} Path relative to the repo root, with forward slashes.
 */
function toRepoPath(absolutePath) {
  return path.relative(PROJECT_ROOT, absolutePath).split(path.sep).join('/');
}

/**
 * Resolves a repo-relative POSIX path back to an absolute path.
 *
 * @param {string} repoPath - Path relative to the repo root.
 * @returns {string} Absolute path.
 */
function toAbsolute(repoPath) {
  return path.join(PROJECT_ROOT, repoPath);
}

/**
 * Extracts the npm package name from a bare module specifier.
 * Handles scoped packages and subpath imports (`next/link` -> `next`).
 *
 * @param {string} specifier - A bare module specifier.
 * @returns {string} The package name.
 */
function packageNameOf(specifier) {
  const segments = specifier.split('/');
  return specifier.startsWith('@') ? segments.slice(0, 2).join('/') : segments[0];
}

/**
 * Tells whether a specifier is a bare npm specifier (not relative, not aliased).
 *
 * @param {string} specifier - Module specifier.
 * @returns {boolean} True when the specifier designates an npm package.
 */
function isBareSpecifier(specifier) {
  if (specifier.startsWith('.') || specifier.startsWith('/')) return false;
  return !ALIASES.some((alias) => specifier.startsWith(alias.prefix));
}

/**
 * Expands an aliased or relative specifier into an absolute base path,
 * without adding any extension.
 *
 * @param {string} specifier - Module specifier.
 * @param {string} fromFile - Absolute path of the importing file.
 * @returns {string} Absolute base path (no extension resolution applied).
 */
function expandSpecifier(specifier, fromFile) {
  const alias = ALIASES.find((candidate) => specifier.startsWith(candidate.prefix));
  if (alias) {
    return path.join(PROJECT_ROOT, alias.target, specifier.slice(alias.prefix.length));
  }
  return path.resolve(path.dirname(fromFile), specifier);
}

/**
 * Returns the first existing path among the candidates.
 *
 * @param {Array<string>} candidates - Absolute paths to test, in priority order.
 * @returns {?string} The first path that exists as a file, or null.
 */
function firstExisting(candidates) {
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/**
 * Resolves a JavaScript module specifier the way Next/webpack does.
 *
 * @param {string} specifier - Module specifier as written in the source.
 * @param {string} fromFile - Absolute path of the importing file.
 * @returns {{kind: string, package?: string, path?: string}} `kind` is one of
 *   `npm` (with `package`), `file` (with a repo-relative `path`) or `unresolved`.
 */
function resolveJsSpecifier(specifier, fromFile) {
  if (isBareSpecifier(specifier)) {
    return { kind: 'npm', package: packageNameOf(specifier) };
  }

  const base = expandSpecifier(specifier, fromFile);
  const candidates = [base];
  for (const extension of JS_EXTENSIONS) candidates.push(base + extension);
  for (const extension of JS_EXTENSIONS) candidates.push(path.join(base, 'index' + extension));

  const found = firstExisting(candidates);
  return found ? { kind: 'file', path: toRepoPath(found) } : { kind: 'unresolved' };
}

/**
 * Resolves a Sass `@use` / `@forward` / `@import` specifier.
 * Sass drops both the leading underscore of partials and the extension, so
 * `@use '../tokens'` designates `../_tokens.scss`.
 *
 * @param {string} specifier - Specifier as written in the SCSS source.
 * @param {string} fromFile - Absolute path of the importing stylesheet.
 * @returns {{kind: string, package?: string, path?: string}} Same shape as
 *   {@link resolveJsSpecifier}.
 */
function resolveScssSpecifier(specifier, fromFile) {
  // `sass:math` et consorts sont des modules intégrés, pas des fichiers.
  if (specifier.startsWith('sass:')) return { kind: 'builtin' };

  const base = expandSpecifier(specifier, fromFile);
  const directory = path.dirname(base);
  const name = path.basename(base).replace(/\.scss$/, '');

  const candidates = [
    path.join(directory, `${name}.scss`),
    path.join(directory, `_${name}.scss`),
    path.join(directory, name, '_index.scss'),
    path.join(directory, name, 'index.scss'),
  ];

  const found = firstExisting(candidates);
  return found ? { kind: 'file', path: toRepoPath(found) } : { kind: 'unresolved' };
}

/**
 * Walks every node of an ESTree AST, calling `visit` on each typed node.
 * A generic walker avoids a dependency on acorn-walk and never silently skips
 * a node type it does not know about.
 *
 * @param {*} node - AST node, array or plain value.
 * @param {function(Object): void} visit - Callback invoked on each typed node.
 * @returns {void}
 */
function walkAst(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) walkAst(child, visit);
    return;
  }
  if (typeof node.type === 'string') visit(node);
  for (const key of Object.keys(node)) {
    if (key === 'type' || key === 'start' || key === 'end' || key === 'loc' || key === 'range') {
      continue;
    }
    walkAst(node[key], visit);
  }
}

/**
 * Parses a JavaScript/JSX file and extracts its module graph contribution.
 *
 * @param {string} code - File contents.
 * @param {string} filePath - Absolute path, used for error messages only.
 * @returns {{imports: Array<{specifier: string, dynamic: boolean}>,
 *   assets: Array<string>, clientBoundary: boolean}} Extracted data. Comments
 *   are absent from the AST, so commented-out imports never appear here.
 */
function parseJsFile(code, filePath) {
  let ast;
  try {
    ast = JsxParser.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowHashBang: true,
      allowAwaitOutsideFunction: true,
    });
  } catch (error) {
    throw new Error(`Parse error in ${toRepoPath(filePath)}: ${error.message}`);
  }

  const imports = [];
  const assets = new Set();

  // Directive 'use client' : uniquement en tête de module, avant toute
  // instruction — c'est la seule position que Next reconnaît.
  const firstStatement = ast.body[0];
  const clientBoundary = Boolean(
    firstStatement
    && firstStatement.type === 'ExpressionStatement'
    && firstStatement.directive === 'use client',
  );

  walkAst(ast, (node) => {
    switch (node.type) {
      case 'ImportDeclaration':
      case 'ExportNamedDeclaration':
      case 'ExportAllDeclaration':
        if (node.source && typeof node.source.value === 'string') {
          imports.push({ specifier: node.source.value, dynamic: false });
        }
        break;
      case 'ImportExpression':
        if (node.source && typeof node.source.value === 'string') {
          imports.push({ specifier: node.source.value, dynamic: true });
        }
        break;
      case 'CallExpression':
        if (node.callee.type === 'Identifier'
          && node.callee.name === 'require'
          && node.arguments.length > 0
          && node.arguments[0].type === 'Literal'
          && typeof node.arguments[0].value === 'string') {
          imports.push({ specifier: node.arguments[0].value, dynamic: false });
        }
        break;
      case 'Literal':
        // Ressource servie depuis public/ : chaîne absolue pointant un fichier
        // d'asset (`/logo.svg`, `/globe/earth-day.jpg`). Sans elle, une unité
        // installée par le registry casse à l'exécution, sans erreur de build.
        if (typeof node.value === 'string'
          && node.value.startsWith('/')
          && ASSET_EXTENSIONS.test(node.value)) {
          assets.add(node.value);
        }
        break;
      default:
        break;
    }
  });

  return { imports, assets: [...assets], clientBoundary };
}

/**
 * Strips SCSS comments while preserving string literals, so that a `//` inside
 * `url('https://…')` is not mistaken for a line comment.
 *
 * @param {string} code - SCSS source.
 * @returns {string} Source with `//` and block comments blanked out.
 */
function stripScssComments(code) {
  let output = '';
  let index = 0;
  let quote = null;

  while (index < code.length) {
    const char = code[index];
    const next = code[index + 1];

    if (quote) {
      // Dans une chaîne : on recopie tel quel, en respectant l'échappement.
      output += char;
      if (char === '\\') {
        output += next === undefined ? '' : next;
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      output += char;
      index += 1;
      continue;
    }
    if (char === '/' && next === '/') {
      while (index < code.length && code[index] !== '\n') index += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      index += 2;
      while (index < code.length && !(code[index] === '*' && code[index + 1] === '/')) index += 1;
      index += 2;
      continue;
    }

    output += char;
    index += 1;
  }

  return output;
}

/**
 * Parses a SCSS file and extracts its `@use` / `@forward` / `@import` targets
 * and the public assets it references through `url()`.
 *
 * @param {string} code - File contents.
 * @returns {{imports: Array<{specifier: string, dynamic: boolean}>,
 *   assets: Array<string>}} Extracted data, comments excluded.
 */
function parseScssFile(code) {
  const source = stripScssComments(code);
  const imports = [];
  const assets = new Set();

  const ruleRe = /@(?:use|forward|import)\s+(['"])([^'"]+)\1/g;
  let match = ruleRe.exec(source);
  while (match !== null) {
    imports.push({ specifier: match[2], dynamic: false });
    match = ruleRe.exec(source);
  }

  const urlRe = /url\(\s*['"]?(\/[^'")]+)['"]?\s*\)/g;
  match = urlRe.exec(source);
  while (match !== null) {
    if (ASSET_EXTENSIONS.test(match[1])) assets.add(match[1]);
    match = urlRe.exec(source);
  }

  return { imports, assets: [...assets] };
}

/**
 * Parses any supported file and returns its dependencies in a uniform shape.
 * Unsupported extensions (`.json`, images…) yield an empty result rather than
 * an error: they are leaves of the graph.
 *
 * @param {string} repoPath - Repo-relative path of the file to analyse.
 * @returns {{imports: Array<{specifier: string, dynamic: boolean, resolved: Object}>,
 *   assets: Array<string>, clientBoundary: boolean}} Dependencies, with each
 *   import already resolved.
 */
function analyseFile(repoPath) {
  const absolutePath = toAbsolute(repoPath);
  const extension = path.extname(repoPath);

  if (extension === '.scss') {
    const parsed = parseScssFile(fs.readFileSync(absolutePath, 'utf8'));
    return {
      imports: parsed.imports.map((entry) => ({
        ...entry,
        resolved: resolveScssSpecifier(entry.specifier, absolutePath),
      })),
      assets: parsed.assets,
      clientBoundary: false,
    };
  }

  if (JS_PARSABLE.has(extension)) {
    const parsed = parseJsFile(fs.readFileSync(absolutePath, 'utf8'), absolutePath);
    return {
      imports: parsed.imports.map((entry) => ({
        ...entry,
        resolved: resolveJsSpecifier(entry.specifier, absolutePath),
      })),
      assets: parsed.assets,
      clientBoundary: parsed.clientBoundary,
    };
  }

  return { imports: [], assets: [], clientBoundary: false };
}

module.exports = {
  PROJECT_ROOT,
  ALIASES,
  ASSET_EXTENSIONS,
  analyseFile,
  packageNameOf,
  parseJsFile,
  parseScssFile,
  resolveJsSpecifier,
  resolveScssSpecifier,
  stripScssComments,
  toAbsolute,
  toRepoPath,
};
