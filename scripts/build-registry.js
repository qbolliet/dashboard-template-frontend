#!/usr/bin/env node

// Construction du registry au format shadcn (P4.1 de TEMPLATIZATION_PROMPTS.md).
//
// Deux modes :
//
//   node scripts/build-registry.js --sync
//     Régénère registry/registry.json depuis registry/inventory.json et le
//     contenu de registry/examples/. La partie MÉCANIQUE (type, files,
//     dependencies, registryDependencies) est écrasée ; les champs ÉDITORIAUX
//     déjà rédigés (title, description, docs, categories, author, published)
//     sont préservés. C'est une logique de fichier de verrouillage :
//     registry.json est committé et se relit en revue de code.
//
//   node scripts/build-registry.js
//     Lit registry.json, échoue s'il est périmé vis-à-vis de l'inventaire ou
//     s'il rompt un invariant, puis émet :
//       - public/r/<name>.json  : items avec le contenu des fichiers inliné,
//                                 format attendu par `npx shadcn add <url>` ;
//       - public/r/registry.json: index sans contenu ;
//       - registry/__registry__.js : module associant chaque exemple à son
//                                 composant et à son code source brut. C'est
//                                 lui qui alimentera <ComponentPreview> (P4.3).
//
// Invariant central : TOUT fichier porte un `target` explicite, et les items
// sont publiés en `registry:item`. C'est ce couple qui les rend « universels »
// au sens de shadcn ≥ 2.9.0 — installables sans components.json ni détection de
// framework — et le `target` est la seule façon de préserver l'arborescence
// src/features/… dont dépendent tous les imports `@/`.
//
// Autre invariant : les `registryDependencies` sont réécrites en URLs absolues à
// l'émission. Dans la CLI shadcn, un nom nu désigne un item du registry
// OFFICIEL — « tokens-global » n'y existe pas, l'installation échouerait.

const fs = require('fs');
const path = require('path');

const { toAbsolute } = require('./lib/resolveImports');

const INVENTORY_PATH = 'registry/inventory.json';
const REGISTRY_PATH = 'registry/registry.json';
const EXAMPLES_DIR = 'registry/examples';
const GENERATED_MODULE_PATH = 'registry/__registry__.js';
const OUTPUT_DIR = 'public/r';

const REGISTRY_NAME = 'dashboard-template';
const DEFAULT_BASE_URL = 'http://localhost:3000';
const BASE_URL = (process.env.REGISTRY_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

const REGISTRY_SCHEMA = 'https://ui.shadcn.com/schema/registry.json';
const ITEM_SCHEMA = 'https://ui.shadcn.com/schema/registry-item.json';

// Item socle : tout autre item en dépend. C'est ce qui garantit qu'un composant
// installé isolément arrive avec ses variables CSS.
const TOKENS_ITEM = 'tokens-global';

// Unités présentes dans l'inventaire mais non publiables. `components-index`
// est un baril cassé (il importe './navigation', qui n'existe pas) : le
// distribuer donnerait un import mort chez le consommateur.
const EXCLUDED_UNITS = new Set(['components-index']);

// Champs qu'un humain rédige dans registry.json et que --sync préserve. Tout
// le reste est dérivé de l'inventaire et régénéré sans état — `meta` compris,
// puisqu'il porte des drapeaux calculés (example, of, binaryAssets).
const EDITORIAL_FIELDS = ['title', 'description', 'docs', 'categories', 'author', 'published'];

// Ordre des clés dans registry.json, pour que les diffs restent lisibles.
const ITEM_KEY_ORDER = [
  'name', 'type', 'title', 'description', 'author', 'categories',
  'dependencies', 'registryDependencies', 'files', 'docs', 'meta', 'published',
];

// Extensions transportables dans un JSON. Le reste (jpg, png, woff…) doit être
// copié à la main par le consommateur, et l'item doit le dire dans `docs`.
const TEXT_ASSET_EXTENSIONS = new Set(['.svg', '.json', '.txt', '.md', '.css', '.scss']);

// =====================================================================
// OUTILS
// =====================================================================

const readJson = (repoPath) => JSON.parse(fs.readFileSync(toAbsolute(repoPath), 'utf8'));

const writeFile = (repoPath, contents) => {
  const absolute = toAbsolute(repoPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, contents, 'utf8');
};

/** Comparaison structurelle stable — sert au contrôle de péremption. */
const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
};

const sortedUnique = (values) => [...new Set(values)].sort();

// =====================================================================
// DÉRIVATION DES ITEMS D'UNITÉ
// =====================================================================

/**
 * Traduit le type d'unité de l'inventaire en type d'item shadcn.
 *
 * Les trois types imposés par la consigne (`registry:ui` pour src/components/,
 * `registry:block` pour les features, `registry:file` pour les tokens) ne
 * couvrent pas les unités `lib` de l'inventaire : on les répartit entre
 * `registry:hook` et `registry:lib`, qui sont les types idiomatiques.
 *
 * @param {string} name - Nom de l'unité.
 * @param {string} unitType - Type d'unité (`component`, `feature`, `lib`, `tokens`).
 * @returns {string} Le type d'item shadcn.
 */
const itemTypeOf = (name, unitType) => {
  if (unitType === 'component') return 'registry:ui';
  if (unitType === 'feature') return 'registry:block';
  if (unitType === 'tokens') return 'registry:file';
  return name.startsWith('hooks-') ? 'registry:hook' : 'registry:lib';
};

/**
 * Construit l'entrée `files` d'un fichier du dépôt.
 *
 * Le `target` reproduit le chemin source à l'identique sous `~/` (racine du
 * projet consommateur) : c'est la condition d'universalité, et la seule façon
 * de garder intacts les imports `@/features/...` entre les fichiers installés.
 *
 * @param {string} repoPath - Chemin du fichier, relatif à la racine du dépôt.
 * @returns {{path: string, type: string, target: string}}
 */
const fileEntry = (repoPath) => ({
  path: repoPath,
  type: 'registry:file',
  target: `~/${repoPath}`,
});

/**
 * Dérive la partie mécanique d'un item depuis une unité de l'inventaire.
 *
 * @param {string} name - Nom de l'unité.
 * @param {Object} unit - Unité telle que produite par build-inventory.js.
 * @param {string[]} warnings - Collecteur d'avertissements non fatals.
 * @returns {Object} Les champs dérivés de l'item.
 */
const deriveUnitItem = (name, unit, warnings) => {
  const files = unit.files.map((file) => fileEntry(file.path));

  // Ressources publiques : seules celles qui sont du texte tiennent dans un
  // JSON. Les binaires (textures du globe) sont signalés, pas embarqués.
  const binaryAssets = [];
  for (const asset of unit.assets) {
    const repoPath = `public${asset}`;
    if (!fs.existsSync(toAbsolute(repoPath))) {
      warnings.push(`${name} : ressource référencée mais absente — ${repoPath}`);
      continue;
    }
    if (TEXT_ASSET_EXTENSIONS.has(path.extname(asset).toLowerCase())) {
      files.push(fileEntry(repoPath));
    } else {
      binaryAssets.push(repoPath);
    }
  }

  // Fichiers de configuration hors de src/ (ex. config/content/home.json).
  for (const configPath of unit.externalConfig) {
    if (fs.existsSync(toAbsolute(configPath))) files.push(fileEntry(configPath));
    else warnings.push(`${name} : configuration référencée mais absente — ${configPath}`);
  }

  // Dépendances internes DIRECTES : la CLI shadcn résout récursivement, la
  // clôture transitive (internalResolved) ne ferait que gonfler le fichier.
  const registryDependencies = sortedUnique([
    ...unit.internal.filter((dep) => !EXCLUDED_UNITS.has(dep)),
    ...(name === TOKENS_ITEM ? [] : [TOKENS_ITEM]),
  ]);

  return {
    type: itemTypeOf(name, unit.type),
    dependencies: [...unit.npm].sort(),
    registryDependencies,
    files: files.sort((a, b) => a.path.localeCompare(b.path)),
    binaryAssets,
  };
};

// =====================================================================
// DÉRIVATION DES ITEMS D'EXEMPLE
// =====================================================================

/**
 * Extrait les métadonnées du bloc de commentaire de tête d'un exemple.
 *
 * Le format attendu — titre, description, puis une ou plusieurs balises
 * `@item` nommant les items de registry démontrés :
 *
 * ```
 * /**
 *  * Courbe simple
 *  *
 *  * Une série temporelle : x, y, un titre et un libellé d'axe.
 *  *
 *  * @item chart
 *  *\/
 * ```
 *
 * Garder la métadonnée dans le fichier qu'elle décrit évite un second fichier
 * à tenir synchronisé.
 *
 * @param {string} source - Contenu brut du fichier d'exemple.
 * @returns {{title: string, description: string, items: string[]}}
 */
const parseExampleHeader = (source) => {
  const match = source.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return { title: '', description: '', items: [] };

  // Retrait de l'indentation et de l'astérisque de gouttière de chaque ligne.
  const gutter = /^\s*\*? ?/;
  const lines = match[1].split('\n').map((line) => line.replace(gutter, '').trimEnd());

  const items = [];
  const prose = [];
  for (const line of lines) {
    const tag = line.match(/^@item\s+(\S+)/);
    if (tag) items.push(tag[1]);
    else if (!line.startsWith('@')) prose.push(line);
  }

  // Premier bloc non vide = titre ; bloc suivant = description.
  const paragraphs = prose
    .join('\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim().replace(/\s*\n\s*/g, ' '))
    .filter(Boolean);

  return { title: paragraphs[0] || '', description: paragraphs[1] || '', items };
};

/**
 * Liste les exemples de registry/examples/ et en dérive un item chacun.
 *
 * Un exemple est un cas d'usage figé : il est à la fois affiché dans la
 * documentation et installable, d'où sa présence dans le registry.
 *
 * @returns {Object[]} Les items d'exemple, triés par nom.
 */
const deriveExampleItems = () => {
  const directory = toAbsolute(EXAMPLES_DIR);
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory)
    .filter((entry) => entry.endsWith('.jsx'))
    .sort()
    .map((entry) => {
      const repoPath = `${EXAMPLES_DIR}/${entry}`;
      const name = entry.replace(/\.jsx$/, '');
      const header = parseExampleHeader(fs.readFileSync(toAbsolute(repoPath), 'utf8'));

      return {
        name,
        type: 'registry:block',
        title: header.title,
        description: header.description,
        registryDependencies: sortedUnique([...header.items, TOKENS_ITEM]),
        dependencies: [],
        files: [{ path: repoPath, type: 'registry:file', target: `~/src/examples/${entry}` }],
        meta: { example: true, of: header.items[0] || null },
      };
    });
};

// =====================================================================
// MODE --sync : (RE)GÉNÉRATION DE registry.json
// =====================================================================

/**
 * Régénère registry.json depuis l'inventaire et les exemples, en préservant
 * les champs éditoriaux de la version précédente.
 *
 * @returns {{registry: Object, warnings: string[], preserved: Object}}
 */
const syncRegistry = () => {
  const inventory = readJson(INVENTORY_PATH);
  const previous = fs.existsSync(toAbsolute(REGISTRY_PATH)) ? readJson(REGISTRY_PATH) : { items: [] };
  const previousByName = new Map((previous.items || []).map((item) => [item.name, item]));

  const warnings = [];
  const preserved = { title: 0, description: 0, docs: 0 };

  const unitItems = Object.entries(inventory.units)
    .filter(([name, unit]) => unit.distributable && !EXCLUDED_UNITS.has(name))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, unit]) => {
      const { binaryAssets, ...derived } = deriveUnitItem(name, unit, warnings);
      const item = { name, ...derived };

      if (binaryAssets.length > 0) {
        item.meta = { ...(item.meta || {}), binaryAssets };
      }
      return item;
    });

  const items = [...unitItems, ...deriveExampleItems()].map((item) => {
    const old = previousByName.get(item.name) || {};
    const merged = { ...item };

    // Réapplication des champs rédigés à la main. Un titre dérivé du fichier
    // (cas des exemples : il vient de leur commentaire de tête) l'emporte ; les
    // champs que la dérivation laisse vides retombent sur l'ancienne valeur.
    for (const field of EDITORIAL_FIELDS) {
      const derived = merged[field];
      if (derived === undefined || derived === '') {
        if (old[field] !== undefined) merged[field] = old[field];
      }
      if (field in preserved && merged[field] && merged[field] === old[field]) preserved[field] += 1;
    }

    return Object.fromEntries(
      ITEM_KEY_ORDER.filter((key) => merged[key] !== undefined && merged[key] !== '').map((key) => [key, merged[key]]),
    );
  });

  const registry = {
    $schema: REGISTRY_SCHEMA,
    name: REGISTRY_NAME,
    homepage: previous.homepage || 'https://github.com/quentinbolliet/dashboard-template-frontend',
    items,
  };

  return { registry, warnings, preserved };
};

// =====================================================================
// VALIDATIONS
// =====================================================================

/**
 * Vérifie les invariants du registry. Chaque manquement est fatal : un
 * registry invalide s'installe en silence et casse chez le consommateur.
 *
 * @param {Object} registry - Contenu de registry.json.
 * @returns {string[]} La liste des erreurs, vide si tout est valide.
 */
const validate = (registry) => {
  const errors = [];
  const items = registry.items || [];
  const names = new Set();
  const packageJson = readJson('package.json');
  const declaredPackages = new Set(Object.keys(packageJson.dependencies || {}));

  for (const item of items) {
    // 8 — unicité et forme du nom
    if (names.has(item.name)) errors.push(`nom d'item dupliqué : ${item.name}`);
    names.add(item.name);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(item.name)) {
      errors.push(`nom d'item non kebab-case : ${item.name}`);
    }

    for (const file of item.files || []) {
      // 1 — le fichier existe
      if (!fs.existsSync(toAbsolute(file.path))) {
        errors.push(`${item.name} : fichier introuvable — ${file.path}`);
      }
      // 5 — target explicite (invariant d'universalité)
      if (!file.target) {
        errors.push(`${item.name} : fichier sans target — ${file.path} (rompt l'universalité de l'item)`);
      }
    }

    // 3 — toute dépendance npm est déclarée dans package.json
    for (const dependency of item.dependencies || []) {
      if (!declaredPackages.has(dependency)) {
        errors.push(`${item.name} : dépendance npm « ${dependency} » absente de package.json`);
      }
    }
  }

  for (const item of items) {
    // 2 — toute dépendance interne pointe vers un item déclaré
    for (const dependency of item.registryDependencies || []) {
      if (!names.has(dependency)) {
        errors.push(`${item.name} : registryDependency non déclarée — ${dependency}`);
      }
    }
    // 4 — chaîne des tokens
    if (item.name !== TOKENS_ITEM && !(item.registryDependencies || []).includes(TOKENS_ITEM)) {
      errors.push(`${item.name} : ne dépend pas de ${TOKENS_ITEM} (ses variables CSS n'existeraient pas)`);
    }
  }

  // 6 — pas de cycle dans le graphe des dépendances internes
  const byName = new Map(items.map((item) => [item.name, item]));
  const state = new Map();
  const stack = [];
  const visit = (name) => {
    if (state.get(name) === 'done') return;
    if (state.get(name) === 'visiting') {
      errors.push(`cycle de registryDependencies : ${[...stack.slice(stack.indexOf(name)), name].join(' -> ')}`);
      return;
    }
    state.set(name, 'visiting');
    stack.push(name);
    for (const dependency of byName.get(name)?.registryDependencies || []) {
      if (byName.has(dependency)) visit(dependency);
    }
    stack.pop();
    state.set(name, 'done');
  };
  for (const item of items) visit(item.name);

  return errors;
};

/**
 * Compare la partie mécanique de registry.json à ce que l'inventaire produirait
 * aujourd'hui. C'est le contrôle de péremption : registry.json est committé, il
 * doit être resynchronisé quand le code bouge.
 *
 * @param {Object} registry - Contenu de registry.json.
 * @returns {string[]} La liste des écarts, vide si le fichier est à jour.
 */
const detectDrift = (registry) => {
  const { registry: expected } = syncRegistry();
  const actualByName = new Map((registry.items || []).map((item) => [item.name, item]));
  const expectedByName = new Map(expected.items.map((item) => [item.name, item]));
  const drift = [];

  for (const name of expectedByName.keys()) {
    if (!actualByName.has(name)) drift.push(`item manquant : ${name}`);
  }
  for (const name of actualByName.keys()) {
    if (!expectedByName.has(name)) drift.push(`item obsolète : ${name}`);
  }
  for (const [name, expectedItem] of expectedByName) {
    const actualItem = actualByName.get(name);
    if (!actualItem) continue;
    for (const field of ['type', 'dependencies', 'registryDependencies', 'files']) {
      if (stableStringify(actualItem[field]) !== stableStringify(expectedItem[field])) {
        drift.push(`${name} : « ${field} » a changé`);
      }
    }
  }

  return drift;
};

// =====================================================================
// MODE NORMAL : ÉMISSION
// =====================================================================

/**
 * Émet un item prêt à être consommé par `npx shadcn add <url>` : contenu des
 * fichiers inliné, dépendances internes réécrites en URLs absolues.
 *
 * La réécriture n'est pas cosmétique — dans la CLI shadcn, un nom nu comme
 * « tokens-global » désigne un item du registry OFFICIEL, pas le nôtre.
 *
 * @param {Object} item - Item tel que déclaré dans registry.json.
 * @returns {Object} L'item résolu.
 */
const resolveItem = (item) => ({
  $schema: ITEM_SCHEMA,
  name: item.name,
  // Type PUBLIÉ : « registry:item », la forme universelle. Vérifié en recette —
  // avec registry:ui / registry:block, la CLI lance sa détection de framework et
  // réclame un components.json au consommateur avant d'installer quoi que ce
  // soit ; avec registry:item + un target sur chaque fichier, elle installe
  // directement, sans components.json ni Tailwind.
  // Le type sémantique (ui / block / file / lib / hook) reste celui de
  // registry.json et survit dans `meta.kind` : c'est la taxonomie que lit la
  // documentation, elle n'a pas à obéir aux contraintes d'installation.
  type: 'registry:item',
  ...(item.title ? { title: item.title } : {}),
  ...(item.description ? { description: item.description } : {}),
  ...(item.author ? { author: item.author } : {}),
  dependencies: item.dependencies || [],
  registryDependencies: (item.registryDependencies || []).map((dep) => `${BASE_URL}/r/${dep}.json`),
  files: (item.files || []).map((file) => ({
    path: file.path,
    type: file.type,
    target: file.target,
    content: fs.readFileSync(toAbsolute(file.path), 'utf8'),
  })),
  ...(item.docs ? { docs: item.docs } : {}),
  ...(item.categories ? { categories: item.categories } : {}),
  meta: { ...item.meta, kind: item.type },
});

/**
 * Émet registry/__registry__.js : le pont entre les exemples et la
 * documentation. Chaque entrée porte le composant (chargé paresseusement) ET
 * son code source brut, lu au build — c'est ce que <ComponentPreview>
 * consommera en P4.3 pour ses onglets rendu / code.
 *
 * @param {Object[]} examples - Les items d'exemple.
 */
const emitGeneratedModule = (examples) => {
  const entries = examples.map((item) => {
    const file = item.files[0];
    const source = fs.readFileSync(toAbsolute(file.path), 'utf8');
    const specifier = `./${path.posix.relative('registry', file.path)}`;

    return [
      `  ${JSON.stringify(item.name)}: {`,
      `    name: ${JSON.stringify(item.name)},`,
      `    item: ${JSON.stringify(item.meta?.of || null)},`,
      `    title: ${JSON.stringify(item.title || item.name)},`,
      `    description: ${JSON.stringify(item.description || '')},`,
      `    component: React.lazy(() => import(${JSON.stringify(specifier)})),`,
      // JSON.stringify plutôt qu'un littéral gabarit : le code source peut
      // contenir des backticks ou des `${…}` que rien ne devrait interpréter.
      `    code: ${JSON.stringify(source)},`,
      '  },',
    ].join('\n');
  });

  const byItem = new Map();
  for (const example of examples) {
    const owner = example.meta?.of;
    if (!owner) continue;
    if (!byItem.has(owner)) byItem.set(owner, []);
    byItem.get(owner).push(example.name);
  }

  const contents = `'use client';

// Généré par scripts/build-registry.js — NE PAS ÉDITER À LA MAIN.
//
// Associe chaque exemple de registry/examples/ à son composant et à son code
// source brut (lu au build). Alimente <ComponentPreview> dans la documentation.
//
// 'use client' est requis : React.lazy est appelé au niveau module et ce module
// est consommé par un composant interactif.

import * as React from 'react';

export const examples = {
${entries.join('\n')}
};

/** Noms d'exemples groupés par item de registry démontré. */
export const examplesByItem = ${JSON.stringify(
    Object.fromEntries([...byItem.entries()].sort(([a], [b]) => a.localeCompare(b))),
    null,
    2,
  )};

export default examples;
`;

  writeFile(GENERATED_MODULE_PATH, contents);
};

/**
 * Émet public/r/ : un fichier par item plus l'index.
 *
 * @param {Object} registry - Contenu de registry.json.
 * @returns {number} Le nombre d'items émis.
 */
const emitRegistry = (registry) => {
  const published = (registry.items || []).filter((item) => item.published !== false);

  // Répertoire remis à zéro : un item renommé ne doit pas survivre en fantôme.
  const outputAbsolute = toAbsolute(OUTPUT_DIR);
  fs.rmSync(outputAbsolute, { recursive: true, force: true });
  fs.mkdirSync(outputAbsolute, { recursive: true });

  for (const item of published) {
    writeFile(`${OUTPUT_DIR}/${item.name}.json`, `${JSON.stringify(resolveItem(item), null, 2)}\n`);
  }

  // Index : même forme, sans le contenu des fichiers.
  const index = {
    $schema: REGISTRY_SCHEMA,
    name: registry.name,
    homepage: registry.homepage,
    items: published.map((item) => ({
      ...resolveItem(item),
      files: item.files.map(({ path: filePath, type, target }) => ({ path: filePath, type, target })),
    })),
  };
  writeFile(`${OUTPUT_DIR}/registry.json`, `${JSON.stringify(index, null, 2)}\n`);

  emitGeneratedModule(published.filter((item) => item.meta?.example));

  return published.length;
};

// =====================================================================
// POINT D'ENTRÉE
// =====================================================================

const fail = (title, messages) => {
  console.error(`\n✗ ${title}`);
  for (const message of messages) console.error(`  - ${message}`);
  console.error('');
  process.exit(1);
};

const main = () => {
  if (process.argv.includes('--sync')) {
    const { registry, warnings, preserved } = syncRegistry();
    writeFile(REGISTRY_PATH, `${JSON.stringify(registry, null, 2)}\n`);

    const fileCount = registry.items.reduce((total, item) => total + item.files.length, 0);
    console.log(`✓ ${REGISTRY_PATH} synchronisé (${registry.items.length} items, ${fileCount} fichiers)`);
    console.log(
      `  champs éditoriaux préservés : ${preserved.title} title, ` +
        `${preserved.description} description, ${preserved.docs} docs`,
    );
    for (const warning of warnings) console.warn(`  ! ${warning}`);
    return;
  }

  if (!fs.existsSync(toAbsolute(REGISTRY_PATH))) {
    fail(`${REGISTRY_PATH} est absent`, ['Lance `npm run build:registry -- --sync` pour le générer.']);
  }

  const registry = readJson(REGISTRY_PATH);

  // Validation AVANT péremption : « ce registry est faux » est un diagnostic
  // plus utile que « ce registry est en retard », et un fichier supprimé du
  // disque produit les deux à la fois.
  const errors = validate(registry);
  if (errors.length > 0) fail('Registry invalide :', errors);

  const drift = detectDrift(registry);
  if (drift.length > 0) {
    fail(`${REGISTRY_PATH} est périmé vis-à-vis de ${INVENTORY_PATH} :`, [
      ...drift,
      'Lance `npm run build:registry -- --sync`.',
    ]);
  }

  // Non fatal : un item qui référence une texture binaire doit expliquer au
  // consommateur comment la récupérer, puisque le JSON ne peut pas la porter.
  for (const item of registry.items) {
    const binaries = item.meta?.binaryAssets;
    if (binaries?.length && !item.docs) {
      console.warn(
        `  ! ${item.name} : ${binaries.length} ressource(s) binaire(s) non transportable(s) ` +
          `(${binaries.join(', ')}) et aucun champ « docs » pour l'expliquer.`,
      );
    }
  }

  const count = emitRegistry(registry);
  console.log(`✓ ${OUTPUT_DIR}/ émis (${count} items) — base ${BASE_URL}`);
  console.log(`✓ ${GENERATED_MODULE_PATH} émis`);
};

main();
