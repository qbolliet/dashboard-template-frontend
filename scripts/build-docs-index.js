#!/usr/bin/env node

// =================================================================
// INDEX DE DOCUMENTATION — docs/content/**.mdx → deux modules générés
// =================================================================
// Balaye les pages MDX rédigées, lit leur frontmatter et leurs titres, et émet :
//
//   docs/__docs__.js        DONNÉES SEULES (arbre de sections, métadonnées par page,
//                           liste des chemins). Aucun import de .mdx : c'est ce qui
//                           permet aux composants CLIENTS du chrome (sidebar, fil
//                           d'Ariane, sommaire, pagination) de l'importer sans tirer
//                           tout le contenu dans le bundle navigateur.
//
//   docs/__docs-pages__.js  Correspondance chemin → CHARGEUR de module, une ligne par
//                           page, chaque import() avec un chemin LITTÉRAL. Un import à
//                           chemin variable ne serait pas analysable par Turbopack et
//                           forcerait le bundle du dossier entier.
//
// Même famille que scripts/build-search-index.js et scripts/build-registry.js : script
// CommonJS sans dépendance, câblé dans `dev`, `prebuild` et `verify`.
//
// LIMITE DE BOUCLE DE DEV À CONNAÎTRE : ajouter, renommer ou supprimer un .mdx, ou
// éditer son frontmatter, demande de relancer `npm run dev` — ces modules sont générés
// une fois au démarrage. Éditer la PROSE d'un fichier existant recharge à chaud
// normalement.

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const PROJECT_ROOT = path.join(__dirname, '..');
const CONTENT_DIR = path.join(PROJECT_ROOT, 'docs/content');
const INDEX_PATH = path.join(PROJECT_ROOT, 'docs/__docs__.js');
const MODULES_PATH = path.join(PROJECT_ROOT, 'docs/__docs-pages__.js');

// `import()` exige une URL file:// sous Windows (un chemin `C:\...` brut lève
// ERR_UNSUPPORTED_ESM_URL_SCHEME) — même contournement que build-search-index.js.
const importEsm = (filePath) => import(pathToFileURL(filePath).href);

/**
 * Recursively lists every .mdx file under a directory.
 *
 * @param {string} dir - Directory to walk.
 * @param {string} [prefix=''] - Accumulated path relative to the walk root.
 * @returns {string[]} Slash-separated paths relative to the walk root.
 */
function listMdx(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  return entries.flatMap((entry) => {
    // Séparateur normalisé sur '/' dès la construction : tout le reste du script
    // raisonne en chemins d'URL, pas en chemins de fichiers Windows.
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) return listMdx(path.join(dir, entry.name), relative);
    return entry.name.endsWith('.mdx') ? [relative] : [];
  });
}

/**
 * Reads a flat YAML frontmatter block off the top of a file.
 *
 * Deliberately hand-rolled rather than pulling in `gray-matter`: the accepted shape is
 * a flat `key: value` list, and the other build scripts of this repository are equally
 * dependency-free. Values are trimmed and unquoted; `order` is coerced to a number and
 * `draft` to a boolean.
 *
 * @param {string} source - Raw file content.
 * @returns {{data: Object, body: string}} Parsed fields and the content below the block.
 */
function readFrontmatter(source) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(source);
  if (!match) return { data: {}, body: source };

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (!field) continue;

    const key = field[1];
    const raw = field[2].trim().replace(/^["'](.*)["']$/, '$1');

    if (key === 'order') data[key] = Number(raw);
    else if (key === 'draft') data[key] = raw === 'true';
    else data[key] = raw;
  }

  return { data, body: source.slice(match[0].length) };
}

/**
 * Converts a content-relative file path into the page's site path.
 *
 * `index.mdx` → '/', `fondations/index.mdx` → '/fondations',
 * `fondations/tokens.mdx` → '/fondations/tokens'.
 *
 * @param {string} relative - Slash-separated path relative to docs/content.
 * @returns {string} The absolute site path.
 */
function toPagePath(relative) {
  const withoutExtension = relative.replace(/\.mdx$/, '');
  const withoutIndex = withoutExtension.replace(/(^|\/)index$/, '');

  return withoutIndex === '' ? '/' : `/${withoutIndex}`;
}

/**
 * Extracts the h2/h3 headings of a page, in document order.
 *
 * Fenced code blocks are stripped first, otherwise a `# comment` inside a shell snippet
 * would be mistaken for a heading. The ids come from the SAME `slugify` that
 * src/mdx-components.jsx applies at render time — that shared function is the whole
 * contract making the table of contents point at anchors that actually exist.
 *
 * @param {string} body - Page content, frontmatter already removed.
 * @param {Function} slugify - The shared slug function.
 * @returns {Array<{depth: number, id: string, text: string}>} The headings.
 */
function extractHeadings(body, slugify) {
  const withoutCode = body.replace(/^```[\s\S]*?^```/gm, '');
  const headings = [];

  for (const line of withoutCode.split(/\r?\n/)) {
    const match = /^(#{2,3})\s+(.+?)\s*$/.exec(line);
    if (!match) continue;

    const text = match[2];
    headings.push({ depth: match[1].length, id: slugify(text), text });
  }

  return headings;
}

/**
 * Serialises a value as a JS literal for the generated modules.
 *
 * @param {*} value - Any JSON-serialisable value.
 * @returns {string} Its literal form.
 */
const literal = (value) => JSON.stringify(value);

async function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.error(`build:docs-index : ${path.relative(PROJECT_ROOT, CONTENT_DIR)} est introuvable.`);
    process.exit(1);
  }

  const { slugify } = await importEsm(path.join(PROJECT_ROOT, 'src/utils/format/slugify.js'));

  // ---------------------------------------------------------------
  // 1. Lecture
  // ---------------------------------------------------------------
  const pages = [];
  const seen = new Map();

  for (const relative of listMdx(CONTENT_DIR)) {
    const source = fs.readFileSync(path.join(CONTENT_DIR, relative), 'utf8');
    const { data, body } = readFrontmatter(source);

    // Échec bruyant plutôt que page silencieusement sans titre : une page de doc sans
    // titre est invisible dans la sidebar et sans <title>, ce qui se remarque tard.
    if (!data.title) {
      console.error(`build:docs-index : docs/content/${relative} n'a pas de champ « title » dans son frontmatter.`);
      process.exit(1);
    }

    if (data.draft) continue;

    const pagePath = toPagePath(relative);

    if (seen.has(pagePath)) {
      console.error(
        `build:docs-index : docs/content/${relative} et docs/content/${seen.get(pagePath)} produisent le même chemin « ${pagePath} ».`,
      );
      process.exit(1);
    }
    seen.set(pagePath, relative);

    pages.push({
      path: pagePath,
      file: relative,
      title: data.title,
      description: data.description ?? '',
      order: Number.isFinite(data.order) ? data.order : Number.MAX_SAFE_INTEGER,
      // Section = premier segment du chemin. La page d'accueil ('/') n'appartient à
      // aucune section : elle est l'entrée du site, pas un élément de sidebar.
      section: pagePath === '/' ? null : `/${pagePath.split('/')[1]}`,
      headings: extractHeadings(body, slugify),
    });
  }

  // Tri stable : `order` d'abord, titre ensuite pour départager. Le tri s'applique à
  // plat, donc les index de section se classent entre eux par leur propre `order`.
  pages.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'fr'));

  // ---------------------------------------------------------------
  // 2. Sections (sidebar)
  // ---------------------------------------------------------------
  const byPath = new Map(pages.map((page) => [page.path, page]));
  const sections = [];

  for (const page of pages) {
    if (page.section === null || page.path !== page.section) continue;

    sections.push({
      title: page.title,
      path: page.path,
      description: page.description,
      items: pages
        .filter((child) => child.section === page.section && child.path !== page.path)
        .map((child) => ({ title: child.title, path: child.path, description: child.description })),
    });
  }

  // ---------------------------------------------------------------
  // 3. Ordre de lecture — alimente précédent/suivant
  // ---------------------------------------------------------------
  // Ordre d'affichage de la sidebar aplati : l'accueil, puis chaque section suivie de
  // ses pages. C'est l'ordre dans lequel un lecteur parcourt le site, et donc celui que
  // la pagination doit suivre — pas l'ordre de tri brut, qui entrelacerait les sections.
  const reading = [];
  if (byPath.has('/')) reading.push(byPath.get('/'));
  for (const section of sections) {
    reading.push(byPath.get(section.path));
    for (const item of section.items) reading.push(byPath.get(item.path));
  }

  // Filet : une page orpheline (section sans index.mdx) serait absente de `reading` et
  // donc introuvable à l'exécution. On la rattache en fin de parcours plutôt que de la
  // perdre en silence.
  const orphans = pages.filter((page) => !reading.includes(page));
  if (orphans.length > 0) {
    for (const orphan of orphans) {
      console.warn(
        `build:docs-index : ${orphan.file} n'appartient à aucune section indexée (il manque un index.mdx à « ${orphan.section} ») — page rattachée en fin de parcours.`,
      );
    }
    reading.push(...orphans);
  }

  // ---------------------------------------------------------------
  // 4. Émission
  // ---------------------------------------------------------------
  const sectionOf = new Map();
  for (const section of sections) {
    sectionOf.set(section.path, section);
    for (const item of section.items) sectionOf.set(item.path, section);
  }

  const entries = reading.map((page, index) => {
    const section = sectionOf.get(page.path) ?? null;
    const previous = reading[index - 1];
    const next = reading[index + 1];

    const breadcrumb = [];
    if (section && section.path !== page.path) {
      breadcrumb.push({ title: section.title, path: section.path });
    }
    if (page.path !== '/') breadcrumb.push({ title: page.title, path: page.path });

    return [
      page.path,
      {
        title: page.title,
        description: page.description,
        section: section && { title: section.title, path: section.path },
        breadcrumb,
        headings: page.headings,
        previous: previous && { title: previous.title, path: previous.path },
        next: next && { title: next.title, path: next.path },
      },
    ];
  });

  const indexModule = `// Généré par scripts/build-docs-index.js — NE PAS ÉDITER À LA MAIN.
//
// DONNÉES SEULES : ce module n'importe aucun .mdx, et c'est délibéré. Les composants
// clients du chrome de documentation (sidebar, fil d'Ariane, sommaire, pagination)
// l'importent pour se situer ; s'il tirait le contenu, tout le corpus MDX partirait
// dans le bundle navigateur.
//
// Source : docs/content/**.mdx (frontmatter + titres de niveau 2 et 3).

/** Sections de la sidebar, dans l'ordre d'affichage. */
export const DOCS_SECTIONS = ${literal(sections)};

/** Métadonnées par chemin de page : fil d'Ariane, sommaire, page précédente/suivante. */
export const DOCS_PAGES = ${literal(Object.fromEntries(entries))};

/** Tous les chemins de page, dans l'ordre de lecture. Alimente generateStaticParams. */
export const DOCS_PATHS = ${literal(reading.map((page) => page.path))};
`;

  const loaders = reading
    .map((page) => `  ${literal(page.path)}: () => import(${literal(`./content/${page.file}`)}),`)
    .join('\n');

  const modulesModule = `// Généré par scripts/build-docs-index.js — NE PAS ÉDITER À LA MAIN.
//
// Correspondance chemin → CHARGEUR du module MDX. Chaque import() porte un chemin
// LITTÉRAL, une ligne par page : un import à chemin variable ne serait pas analysable
// statiquement par Turbopack, qui se rabattrait sur un bundle du dossier entier.
//
// Consommé par src/app/(docs)/[[...slug]]/page.jsx, un Server Component async qui se
// contente d'attendre le chargeur — ni React.lazy, ni next/dynamic, ni Suspense : le
// MDX n'atteint jamais une frontière client.

export const DOCS_MODULES = {
${loaders}
};
`;

  fs.mkdirSync(path.dirname(INDEX_PATH), { recursive: true });
  fs.writeFileSync(INDEX_PATH, indexModule, 'utf8');
  fs.writeFileSync(MODULES_PATH, modulesModule, 'utf8');

  console.log(
    `build:docs-index : ${reading.length} page(s), ${sections.length} section(s) → docs/__docs__.js + docs/__docs-pages__.js`,
  );
}

main().catch((err) => {
  console.error('build:docs-index : échec —', err.message);
  process.exit(1);
});
