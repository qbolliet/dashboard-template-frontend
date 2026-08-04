#!/usr/bin/env node

// Inventaire des unités distribuables du dépôt (P1.3 de TEMPLATIZATION_PROMPTS.md).
//
// Émet registry/inventory.json : pour chaque unité — composant de
// src/components/, feature de src/features/, socle de tokens ou brique de
// src/hooks|utils — la liste de ses fichiers, ses dépendances npm réelles, ses
// dépendances internes et les globaux de style dont elle ne peut pas se passer.
//
// C'est la forme intermédiaire qui alimentera scripts/build-registry.js (P4.1) :
// les `dependencies` / `registryDependencies` du format shadcn s'en déduisent
// mécaniquement, jamais à la main (cf. §2.3 de TEMPLATIZATION_ARCHITECTURE.md).
//
// Ce script ne modifie aucun fichier de src/ : il observe et rapporte.

const fs = require('fs');
const path = require('path');

const { PROJECT_ROOT, analyseFile, toAbsolute } = require('./lib/resolveImports');

const OUTPUT_PATH = 'registry/inventory.json';

// Seuil de fan-out au-delà duquel une unité est signalée comme candidate à un
// regroupement en un seul item de registry. Compté sur les dépendances de CODE
// seulement : les dépendances de tokens feraient franchir le seuil à tout le
// monde et noieraient le signal.
const FANOUT_THRESHOLD = 3;

// Paquets fournis par le framework, jamais déclarés par un item de registry.
const FRAMEWORK_PACKAGES = new Set(['react', 'react-dom', 'next']);

const SOURCE_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.scss', '.json']);

// =====================================================================
// DÉCOUPAGE EN UNITÉS
// =====================================================================
// Une unité = ce qu'un tiers installe d'un coup. Granularité : dossier de
// composant feuille, avec trois regroupements assumés — `icons` (30 fichiers de
// 20 lignes, un baril commun), `tabs` et `stat-card` (familles composées, sans
// intérêt séparément).
//
// Les `_tokens.scss` / `_colors.scss` de GROUPE sont des unités à part : ils
// déclarent dans `:root` pour tous leurs voisins, donc tout composant du groupe
// en dépend, et deux composants du même groupe ne doivent pas embarquer chacun
// leur copie.
//
// `roots` accepte des dossiers comme des fichiers ; un fichier appartient à
// l'unité dont la racine est le préfixe le plus long.

const UNIT_DEFINITIONS = [
  // ---- Fondations de style -------------------------------------------------
  {
    name: 'tokens-global',
    type: 'tokens',
    roots: [
      'src/styles/globals/primitives',
      'src/styles/globals/tokens',
      'src/styles/globals/typography.scss',
      'src/styles/utils/breakpoints.scss',
      'src/styles/utils/functions.scss',
    ],
  },
  {
    name: 'styles-app',
    type: 'tokens',
    distributable: false,
    roots: [
      'src/styles/globals/resets.scss',
      'src/styles/globals/custom-properties.scss',
      'src/styles/globals/accessibility.scss',
      'src/styles/pages',
    ],
  },

  // ---- src/components/common ----------------------------------------------
  { name: 'common', type: 'component', roots: ['src/components/common/index.js'] },
  { name: 'visually-hidden', type: 'component', roots: ['src/components/common/VisuallyHidden'] },
  { name: 'accessible-icon', type: 'component', roots: ['src/components/common/AccessibleIcon'] },
  { name: 'skip-link', type: 'component', roots: ['src/components/common/SkipLink'] },

  // ---- src/components/filter ----------------------------------------------
  {
    name: 'filter-tokens',
    type: 'tokens',
    roots: ['src/components/filter/_tokens.scss', 'src/components/filter/_colors.scss'],
  },
  { name: 'calendar-month', type: 'component', roots: ['src/components/filter/CalendarMonth'] },
  { name: 'constraint-field', type: 'component', roots: ['src/components/filter/ConstraintField'] },
  { name: 'select-menu', type: 'component', roots: ['src/components/filter/SelectMenu'] },
  { name: 'tooltip', type: 'component', roots: ['src/components/filter/Tooltip'] },
  { name: 'type-aware-input', type: 'component', roots: ['src/components/filter/TypeAwareInput'] },
  { name: 'date-parse', type: 'lib', roots: ['src/components/filter/utils'] },

  // ---- src/components/icons ------------------------------------------------
  { name: 'icons', type: 'component', roots: ['src/components/icons'] },

  // ---- src/components/toolbar ----------------------------------------------
  {
    name: 'toolbar-tokens',
    type: 'tokens',
    roots: ['src/components/toolbar/_tokens.scss', 'src/components/toolbar/_colors.scss'],
  },
  { name: 'hover-toolbar', type: 'component', roots: ['src/components/toolbar/HoverToolbar'] },
  { name: 'toolbar-button', type: 'component', roots: ['src/components/toolbar/ToolbarButton'] },
  { name: 'toolbar-tools', type: 'component', roots: ['src/components/toolbar/tools.js'] },

  // ---- src/components/ui ---------------------------------------------------
  { name: 'ui', type: 'component', roots: ['src/components/ui/index.js'] },
  { name: 'badge', type: 'component', roots: ['src/components/ui/Badge'] },
  { name: 'card-grid', type: 'component', roots: ['src/components/ui/CardGrid'] },
  { name: 'large-button', type: 'component', roots: ['src/components/ui/LargeButton'] },
  { name: 'link-card', type: 'component', roots: ['src/components/ui/LinkCard'] },
  { name: 'link-cards-section', type: 'component', roots: ['src/components/ui/LinkCardsSection'] },
  { name: 'stat-card', type: 'component', roots: ['src/components/ui/StatCard'] },
  { name: 'tabs', type: 'component', roots: ['src/components/ui/Tabs'] },

  // Baril racine de src/components/ — dead code cassé, isolé ici pour que le
  // diagnostic le désigne nommément (cf. diagnostics.brokenBarrels).
  { name: 'components-index', type: 'component', roots: ['src/components/index.js'] },

  // ---- src/features --------------------------------------------------------
  {
    name: 'chart-tokens',
    type: 'tokens',
    roots: ['src/features/chart/_tokens.scss', 'src/features/chart/_colors.scss'],
  },
  { name: 'chart', type: 'feature', roots: ['src/features/chart'] },

  {
    name: 'filter-feature-tokens',
    type: 'tokens',
    roots: ['src/features/filter/_tokens.scss', 'src/features/filter/_colors.scss'],
  },
  { name: 'filter', type: 'feature', roots: ['src/features/filter'] },

  {
    name: 'table-tokens',
    type: 'tokens',
    roots: ['src/features/table/_tokens.scss', 'src/features/table/_colors.scss'],
  },
  { name: 'table', type: 'feature', roots: ['src/features/table'] },

  {
    name: 'header-tokens',
    type: 'tokens',
    roots: [
      'src/features/header/_tokens.scss',
      'src/features/header/_colors.scss',
      'src/features/header/_nav-mixins.scss',
      'src/features/header/nav-base.scss',
    ],
  },
  { name: 'header', type: 'feature', roots: ['src/features/header'] },

  {
    name: 'globe-tokens',
    type: 'tokens',
    roots: ['src/features/globe/_tokens.scss', 'src/features/globe/_colors.scss'],
  },
  { name: 'globe', type: 'feature', roots: ['src/features/globe'] },

  { name: 'theme', type: 'feature', roots: ['src/features/theme'] },
  { name: 'home', type: 'feature', roots: ['src/features/home'] },
  { name: 'footer', type: 'feature', roots: ['src/features/footer'] },

  // ---- Couches partagées ---------------------------------------------------
  { name: 'hooks-accessibility', type: 'lib', roots: ['src/hooks/accessibility'] },
  { name: 'hooks-debounce', type: 'lib', roots: ['src/hooks/debounce'] },
  { name: 'hooks-floating', type: 'lib', roots: ['src/hooks/floating'] },
  { name: 'hooks-layout-effect', type: 'lib', roots: ['src/hooks/layoutEffect'] },
  { name: 'utils-accessibility', type: 'lib', roots: ['src/utils/accessibility'] },
  { name: 'utils-format', type: 'lib', roots: ['src/utils/format'] },
  { name: 'utils-html', type: 'lib', roots: ['src/utils/html'] },
  { name: 'utils-math', type: 'lib', roots: ['src/utils/math'] },
];

// Racines balayées pour constituer l'inventaire. src/app/ en est exclu : c'est
// le consommateur des unités, pas une unité distribuable. Ses imports npm sont
// tout de même relevés à part, pour le calcul des dépendances orphelines.
const SCANNED_ROOTS = [
  'src/components',
  'src/features',
  'src/hooks',
  'src/utils',
  'src/styles',
];

// =====================================================================
// COLLECTE DES FICHIERS
// =====================================================================

/**
 * Recursively lists every source file under a directory.
 *
 * @param {string} repoDir - Repo-relative directory to walk.
 * @returns {Array<string>} Repo-relative paths, unsorted.
 */
function listFiles(repoDir) {
  const absoluteDir = toAbsolute(repoDir);
  if (!fs.existsSync(absoluteDir)) return [];

  const collected = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const child = `${repoDir}/${entry.name}`;
    if (entry.isDirectory()) {
      // Un .next/ égaré dans les sources ne doit jamais entrer dans l'inventaire.
      if (entry.name === '.next' || entry.name === 'node_modules') continue;
      collected.push(...listFiles(child));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
      collected.push(child);
    }
  }
  return collected;
}

/**
 * Assigns a file to the unit whose root is its longest matching prefix.
 *
 * @param {string} repoPath - Repo-relative file path.
 * @returns {?{unit: Object, rootLength: number}} Owning unit, or null.
 */
function ownerOf(repoPath) {
  let best = null;
  for (const unit of UNIT_DEFINITIONS) {
    for (const root of unit.roots) {
      const matches = repoPath === root || repoPath.startsWith(`${root}/`);
      if (matches && (best === null || root.length > best.rootLength)) {
        best = { unit, rootLength: root.length };
      }
    }
  }
  return best;
}

/**
 * Classifies a file by its role inside its unit. The `kind` drives the
 * `registry:*` type each file will get in P4.1, and makes fixtures locatable
 * (P2.1 moves them into the mock transport).
 *
 * @param {string} repoPath - Repo-relative file path.
 * @returns {string} One of tokens, style, barrel, fixture, hook, provider,
 *   source, util, engine, component, lib.
 */
function classifyFile(repoPath) {
  const base = path.basename(repoPath);
  const extension = path.extname(repoPath);

  if (extension === '.scss') {
    return /^_(tokens|colors|nav-mixins)\.scss$/.test(base) || base === 'nav-base.scss'
      ? 'tokens'
      : 'style';
  }
  if (extension === '.json') return 'fixture';
  if (/^(mock|demo)/i.test(base) || /mock[A-Z]/.test(base)) return 'fixture';
  if (base === 'index.js' || base === 'index.jsx') return 'barrel';
  if (/^use[A-Z]/.test(base)) return 'hook';
  if (repoPath.includes('/providers/')) return 'provider';
  if (repoPath.includes('/sources/')) return 'source';
  if (repoPath.includes('/engine/')) return 'engine';
  if (repoPath.includes('/utils/')) return 'util';
  if (/^[A-Z]/.test(base)) return 'component';
  return 'lib';
}

// =====================================================================
// GRAPHE
// =====================================================================

/**
 * Finds every strongly connected component of size > 1 (i.e. every cycle) with
 * Tarjan's algorithm. A self-loop is reported as well.
 *
 * @param {Map<string, Set<string>>} graph - Adjacency map, unit -> dependencies.
 * @returns {Array<Array<string>>} Cycles, each as a list of unit names.
 */
function findCycles(graph) {
  const index = new Map();
  const lowLink = new Map();
  const onStack = new Set();
  const stack = [];
  const cycles = [];
  let counter = 0;

  const strongConnect = (node) => {
    index.set(node, counter);
    lowLink.set(node, counter);
    counter += 1;
    stack.push(node);
    onStack.add(node);

    for (const neighbour of graph.get(node) || []) {
      if (!index.has(neighbour)) {
        strongConnect(neighbour);
        lowLink.set(node, Math.min(lowLink.get(node), lowLink.get(neighbour)));
      } else if (onStack.has(neighbour)) {
        lowLink.set(node, Math.min(lowLink.get(node), index.get(neighbour)));
      }
    }

    if (lowLink.get(node) === index.get(node)) {
      const component = [];
      let member;
      do {
        member = stack.pop();
        onStack.delete(member);
        component.push(member);
      } while (member !== node);

      const isSelfLoop = component.length === 1 && (graph.get(node) || new Set()).has(node);
      if (component.length > 1 || isSelfLoop) cycles.push(component.sort());
    }
  };

  for (const node of graph.keys()) {
    if (!index.has(node)) strongConnect(node);
  }
  return cycles;
}

/**
 * Determines which files are reachable only through a dynamic `import()`.
 *
 * A per-statement flag is not enough: `three` is imported *statically* by
 * `GlobeEngine.js`, but `GlobeEngine.js` itself is only ever reached through
 * `import('../engine/GlobeEngine')`. The package therefore stays in an async
 * chunk. Only a reachability computation over the static edges says so.
 *
 * Seeds are the files NO edge points at — public barrels and root components,
 * i.e. everything src/app/ (out of scan scope) can enter through. Seeding on
 * « no *static* edge » instead would make every async-only file its own seed
 * and the set would always come back empty.
 *
 * @param {Array<string>} files - Every scanned file, repo-relative.
 * @param {Map<string, Array<{to: string, dynamic: boolean}>>} edges - File graph.
 * @returns {Set<string>} Files that no static path reaches.
 */
function findAsyncOnlyFiles(files, edges) {
  const imported = new Set();
  for (const targets of edges.values()) {
    for (const edge of targets) imported.add(edge.to);
  }

  const reachable = new Set();
  const queue = files.filter((file) => !imported.has(file));
  while (queue.length > 0) {
    const current = queue.pop();
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const edge of edges.get(current) || []) {
      if (!edge.dynamic) queue.push(edge.to);
    }
  }

  return new Set(files.filter((file) => !reachable.has(file)));
}

/**
 * Computes the transitive closure of a unit's internal dependencies.
 *
 * @param {string} start - Unit name.
 * @param {Map<string, Set<string>>} graph - Adjacency map.
 * @returns {Array<string>} Sorted list of every transitively required unit.
 */
function transitiveClosure(start, graph) {
  const seen = new Set();
  const queue = [...(graph.get(start) || [])];
  while (queue.length > 0) {
    const current = queue.pop();
    if (current === start || seen.has(current)) continue;
    seen.add(current);
    queue.push(...(graph.get(current) || []));
  }
  return [...seen].sort();
}

// =====================================================================
// CONSTRUCTION
// =====================================================================

/**
 * Builds the whole inventory.
 *
 * @returns {{inventory: Object, fatal: Array<string>}} The JSON-serialisable
 *   inventory and the list of fatal invariant violations.
 */
function build() {
  const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
  const declaredDependencies = new Set(Object.keys(packageJson.dependencies || {}));
  const declaredDevDependencies = new Set(Object.keys(packageJson.devDependencies || {}));

  const units = new Map();
  for (const definition of UNIT_DEFINITIONS) {
    units.set(definition.name, {
      type: definition.type,
      distributable: definition.distributable !== false,
      roots: definition.roots,
      files: [],
      npm: new Map(),          // paquet -> { dynamic }
      internal: new Set(),
      styleGlobals: new Set(),
      assets: new Set(),
      externalConfig: new Set(),
      clientBoundary: false,
      warnings: [],
    });
  }

  const diagnostics = {
    layerViolations: [],
    unresolvedImports: [],
    brokenBarrels: [],
    phantomDependencies: [],
    orphanDependencies: [],
    fixtures: [],
    externalConfig: [],
    unownedFiles: [],
  };

  const allFiles = SCANNED_ROOTS.flatMap(listFiles).sort();
  const usedPackages = new Set();

  // --- Passe 1 : attribution des fichiers ---------------------------------
  const fileOwner = new Map();
  for (const repoPath of allFiles) {
    const owner = ownerOf(repoPath);
    if (!owner) {
      diagnostics.unownedFiles.push(repoPath);
      continue;
    }
    fileOwner.set(repoPath, owner.unit.name);
    const unit = units.get(owner.unit.name);
    const kind = classifyFile(repoPath);
    unit.files.push({ path: repoPath, kind });
    if (kind === 'fixture') diagnostics.fixtures.push({ unit: owner.unit.name, path: repoPath });
  }

  // --- Passe 2 : analyse des imports --------------------------------------
  // Le graphe au niveau FICHIER (et non unité) est conservé : lui seul permet
  // de dire quels fichiers ne sont atteints que par un `import()`, donc quels
  // paquets npm restent confinés dans un chunk asynchrone.
  const fileEdges = new Map();
  const filePackages = new Map();

  for (const repoPath of allFiles) {
    const unitName = fileOwner.get(repoPath);
    if (!unitName) continue;
    const unit = units.get(unitName);

    const analysis = analyseFile(repoPath);
    if (analysis.clientBoundary) unit.clientBoundary = true;
    for (const asset of analysis.assets) unit.assets.add(asset);
    fileEdges.set(repoPath, []);
    filePackages.set(repoPath, new Set());

    for (const entry of analysis.imports) {
      const { resolved, specifier, dynamic } = entry;

      if (resolved.kind === 'builtin') continue;

      if (resolved.kind === 'npm') {
        usedPackages.add(resolved.package);
        if (FRAMEWORK_PACKAGES.has(resolved.package)) continue;
        unit.npm.set(resolved.package, true);
        filePackages.get(repoPath).add(resolved.package);
        continue;
      }

      if (resolved.kind === 'unresolved') {
        const record = { unit: unitName, file: repoPath, specifier };
        diagnostics.unresolvedImports.push(record);
        if (classifyFile(repoPath) === 'barrel') diagnostics.brokenBarrels.push(record);
        unit.warnings.push(`Import non résolu : '${specifier}'`);
        continue;
      }

      // Fichier hors du périmètre scanné (config/ notamment).
      if (!fileOwner.has(resolved.path)) {
        if (resolved.path.startsWith('config/')) {
          unit.externalConfig.add(resolved.path);
          diagnostics.externalConfig.push({ unit: unitName, file: repoPath, target: resolved.path });
        }
        continue;
      }

      fileEdges.get(repoPath).push({ to: resolved.path, dynamic });

      const targetUnit = fileOwner.get(resolved.path);
      if (targetUnit === unitName) continue;

      if (targetUnit === 'tokens-global' || targetUnit === 'styles-app') {
        unit.styleGlobals.add(resolved.path);
      }
      unit.internal.add(targetUnit);

      // Invariant de couche (CLAUDE.md) : src/components/ ne doit jamais
      // importer depuis src/features/.
      if (repoPath.startsWith('src/components/') && resolved.path.startsWith('src/features/')) {
        diagnostics.layerViolations.push({ from: repoPath, to: resolved.path, specifier });
      }
    }
  }

  // Toute unité qui embarque du style dépend du socle de tokens, que son SCSS
  // le `@use` explicitement ou non : sans lui, ses variables CSS n'existent pas.
  for (const [name, unit] of units) {
    const hasStyle = unit.files.some((file) => file.kind === 'style' || file.kind === 'tokens');
    if (hasStyle && name !== 'tokens-global' && name !== 'styles-app') {
      unit.internal.add('tokens-global');
    }
  }

  // --- Passe 3 : chunks asynchrones ---------------------------------------
  const asyncOnlyFiles = findAsyncOnlyFiles(allFiles, fileEdges);
  for (const [, unit] of units) {
    const unitFiles = unit.files.map((file) => file.path);
    unit.asyncOnlyFiles = unitFiles.filter((file) => asyncOnlyFiles.has(file));
    for (const packageName of unit.npm.keys()) {
      // Un paquet reste dans un chunk asynchrone si TOUS les fichiers de
      // l'unité qui le déclarent sont eux-mêmes hors du graphe statique.
      const declaringFiles = unitFiles.filter((file) => filePackages.get(file)?.has(packageName));
      if (declaringFiles.every((file) => asyncOnlyFiles.has(file))) {
        unit.npm.set(packageName, 'async');
      }
    }
  }

  // --- Passe 4 : graphe ----------------------------------------------------
  const graph = new Map([...units].map(([name, unit]) => [name, new Set(unit.internal)]));
  const cycles = findCycles(graph);

  const highFanout = [];
  for (const [name, unit] of units) {
    const codeDeps = [...unit.internal].filter((dep) => units.get(dep).type !== 'tokens').sort();
    if (codeDeps.length > FANOUT_THRESHOLD) {
      highFanout.push({ unit: name, count: codeDeps.length, dependencies: codeDeps });
    }
  }
  highFanout.sort((a, b) => b.count - a.count || a.unit.localeCompare(b.unit));

  // --- Passe 5 : dépendances npm fantômes et orphelines --------------------
  // Les imports de src/app/ comptent pour l'orphelinat (une dépendance n'est
  // pas orpheline si seule une page l'utilise), pas pour l'inventaire.
  for (const repoPath of listFiles('src/app')) {
    for (const entry of analyseFile(repoPath).imports) {
      if (entry.resolved.kind === 'npm') usedPackages.add(entry.resolved.package);
    }
  }

  for (const packageName of [...usedPackages].sort()) {
    if (!declaredDependencies.has(packageName) && !declaredDevDependencies.has(packageName)) {
      const consumers = [...units]
        .filter(([, unit]) => unit.npm.has(packageName))
        .map(([name]) => name)
        .sort();
      diagnostics.phantomDependencies.push({ package: packageName, units: consumers });
    }
  }
  for (const packageName of [...declaredDependencies].sort()) {
    if (!usedPackages.has(packageName) && packageName !== 'sass') {
      diagnostics.orphanDependencies.push(packageName);
    }
  }

  // --- Sérialisation -------------------------------------------------------
  const serialisedUnits = {};
  for (const name of [...units.keys()].sort()) {
    const unit = units.get(name);
    const npm = [...unit.npm.keys()].sort();
    serialisedUnits[name] = {
      type: unit.type,
      distributable: unit.distributable,
      roots: unit.roots,
      clientBoundary: unit.clientBoundary,
      fileCount: unit.files.length,
      files: unit.files.sort((a, b) => a.path.localeCompare(b.path)),
      npm,
      npmAsyncOnly: npm.filter((packageName) => unit.npm.get(packageName) === 'async'),
      asyncOnlyFiles: unit.asyncOnlyFiles,
      internal: [...unit.internal].sort(),
      internalCode: [...unit.internal].filter((dep) => units.get(dep).type !== 'tokens').sort(),
      internalTokens: [...unit.internal].filter((dep) => units.get(dep).type === 'tokens').sort(),
      internalResolved: transitiveClosure(name, graph),
      styleGlobals: [...unit.styleGlobals].sort(),
      assets: [...unit.assets].sort(),
      externalConfig: [...unit.externalConfig].sort(),
      warnings: unit.warnings,
    };
  }

  const inventory = {
    $comment: 'Généré par scripts/build-inventory.js — ne pas éditer à la main.',
    generatedAt: new Date().toISOString(),
    unitCount: units.size,
    fileCount: allFiles.length,
    fanoutThreshold: FANOUT_THRESHOLD,
    units: serialisedUnits,
    graph: { cycles, highFanout },
    diagnostics,
  };

  // Seul l'invariant de couche est bloquant : c'est celui que P1.2 vient
  // d'établir et qu'aucun refactor ultérieur ne doit rompre en silence. Les
  // autres diagnostics sont des constats à traiter dans les lots suivants.
  const fatal = diagnostics.layerViolations.map(
    (violation) => `src/components/ importe src/features/ : ${violation.from} → ${violation.specifier}`,
  );

  return { inventory, fatal };
}

// =====================================================================
// SORTIE
// =====================================================================

/**
 * Prints the human-readable summary that accompanies the JSON output.
 *
 * @param {Object} inventory - The inventory produced by {@link build}.
 * @returns {void}
 */
function report(inventory) {
  const { units, graph, diagnostics } = inventory;
  const names = Object.keys(units);

  console.log(`\nInventaire : ${inventory.unitCount} unités, ${inventory.fileCount} fichiers.\n`);

  const rows = names.map((name) => {
    const unit = units[name];
    return [
      name,
      unit.type,
      String(unit.fileCount),
      unit.npm.join(' ') || '—',
      unit.internalCode.join(' ') || '—',
    ];
  });
  const headers = ['unité', 'type', 'n', 'npm', 'dépendances internes (code)'];
  const widths = headers.map((header, column) => Math.max(
    header.length,
    ...rows.map((row) => row[column].length),
  ));
  const line = (cells) => cells.map((cell, column) => cell.padEnd(widths[column])).join('  ');
  console.log(line(headers));
  console.log(widths.map((width) => '-'.repeat(width)).join('  '));
  for (const row of rows) console.log(line(row));

  console.log('\n--- Signalements ---');
  console.log(`Cycles de dépendances internes : ${graph.cycles.length === 0 ? 'aucun' : ''}`);
  for (const cycle of graph.cycles) console.log(`  ! ${cycle.join(' -> ')}`);

  console.log(`Fan-out > ${inventory.fanoutThreshold} (candidates au regroupement) : ${graph.highFanout.length}`);
  for (const entry of graph.highFanout) {
    console.log(`  - ${entry.unit} (${entry.count}) : ${entry.dependencies.join(', ')}`);
  }

  console.log(`Violations de couche components/ -> features/ : ${diagnostics.layerViolations.length === 0 ? 'aucune' : diagnostics.layerViolations.length}`);
  for (const violation of diagnostics.layerViolations) {
    console.log(`  ! ${violation.from} -> ${violation.to}`);
  }

  console.log('\n--- Diagnostics ---');
  for (const entry of diagnostics.phantomDependencies) {
    console.log(`  npm fantôme  : ${entry.package} (importé par ${entry.units.join(', ') || 'src/app'}, absent de package.json)`);
  }
  for (const packageName of diagnostics.orphanDependencies) {
    console.log(`  npm orphelin : ${packageName} (déclaré dans package.json, jamais importé)`);
  }
  for (const entry of diagnostics.brokenBarrels) {
    console.log(`  baril cassé  : ${entry.file} -> '${entry.specifier}' introuvable`);
  }
  for (const entry of diagnostics.unresolvedImports) {
    if (diagnostics.brokenBarrels.includes(entry)) continue;
    console.log(`  non résolu   : ${entry.file} -> '${entry.specifier}'`);
  }
  for (const entry of diagnostics.fixtures) {
    console.log(`  fixture      : ${entry.path} (unité ${entry.unit})`);
  }
  for (const entry of diagnostics.externalConfig) {
    console.log(`  config hors src/ : ${entry.file} -> ${entry.target}`);
  }
  for (const repoPath of diagnostics.unownedFiles) {
    console.log(`  fichier orphelin : ${repoPath} (aucune unité ne le revendique)`);
  }
  console.log('');
}

const { inventory, fatal } = build();

fs.mkdirSync(path.dirname(toAbsolute(OUTPUT_PATH)), { recursive: true });
fs.writeFileSync(toAbsolute(OUTPUT_PATH), `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
report(inventory);
console.log(`Écrit : ${OUTPUT_PATH}`);

if (fatal.length > 0) {
  console.error('\nÉCHEC — invariant de couche rompu :');
  for (const message of fatal) console.error(`  ${message}`);
  process.exit(1);
}
