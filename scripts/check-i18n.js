#!/usr/bin/env node

// =================================================================
// CHECK I18N — cohérence des dictionnaires et du contenu traduisible
// =================================================================
// C'est LE garde-fou de maintenance de l'internationalisation : sans lui, ajouter une
// chaîne à un composant sans la traduire ne casse rien visiblement — la fusion de
// `getDictionary` retombe silencieusement sur le français — et la langue se dégrade
// page après page sans que personne ne le remarque.
//
// Quatre vérifications, dans l'ordre de gravité :
//
//   1. CLÉS  — chaque dictionnaire de src/i18n/dictionaries/ est compare à `fr.js`, la
//      référence. Clés manquantes et clés en trop sont listées.
//   2. VACUITÉ — aucune valeur vide ou blanche. Une clé vide est pire qu'une clé
//      absente : la première produit un libellé muet, la seconde retombe sur le
//      français.
//   3. GABARITS — les trous `{nom}` d'une traduction doivent être ceux de sa
//      référence. Une traduction qui perd `{column}` rend « Trier par », phrase
//      mutilée que rien ne signale à l'exécution.
//   4. CONTENU — dans config/**.json, tout objet de traduction doit couvrir toutes les
//      langues déclarées dans `site.locales`.
//
// Sans `--strict`, le script AVERTIT et sort en 0 : ajouter une langue ne doit pas
// bloquer le travail en cours. Avec `--strict` (chaîne `verify` et CI), il échoue.
//
// Même famille que scripts/check-palette-sync.js : script sans dépendance, lisant les
// sources plutôt que le build.

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const PROJECT_ROOT = path.join(__dirname, '..');
const DICT_DIR = path.join(PROJECT_ROOT, 'src/i18n/dictionaries');
const CONFIG_DIR = path.join(PROJECT_ROOT, 'config');
const SITE_CONFIG = path.join(CONFIG_DIR, 'site.config.json');

const STRICT = process.argv.includes('--strict');

// `import()` exige une URL file:// sous Windows — même contournement que les autres
// scripts de build du dépôt.
const importEsm = (filePath) => import(pathToFileURL(filePath).href);

const LOCALE_KEY_RE = /^[a-z]{2}(-[A-Z]{2})?$/;
const PLACEHOLDER_RE = /\{([A-Za-z0-9_]+)\}/g;

/**
 * Collects every leaf of a dictionary as a dotted path → value map.
 *
 * @param {Object} value - Dictionary or sub-tree.
 * @param {string} [prefix=''] - Accumulated dotted path.
 * @param {Map<string, *>} [out] - Accumulator.
 * @returns {Map<string, *>} Leaf values by dotted path.
 */
function leaves(value, prefix = '', out = new Map()) {
  for (const [key, child] of Object.entries(value)) {
    const dotted = prefix ? `${prefix}.${key}` : key;

    if (child !== null && typeof child === 'object' && !Array.isArray(child)) {
      leaves(child, dotted, out);
    } else {
      out.set(dotted, child);
    }
  }

  return out;
}

/**
 * Lists the placeholder names of a template.
 *
 * @param {*} value - Leaf value; non-strings yield an empty list.
 * @returns {string[]} Sorted, de-duplicated placeholder names.
 */
function placeholders(value) {
  if (typeof value !== 'string') return [];

  return [...new Set([...value.matchAll(PLACEHOLDER_RE)].map((m) => m[1]))].sort();
}

/**
 * Recursively walks a config value, reporting locale maps that miss a language.
 *
 * A locale map is an object whose keys are ALL locale codes. Any other object is a
 * structure of the manifest and is traversed.
 *
 * @param {*} value - Config value.
 * @param {string} pointer - JSON-pointer-ish path, for the message.
 * @param {string[]} locales - Locale codes the site declares.
 * @param {string[]} problems - Accumulator.
 */
function walkConfig(value, pointer, locales, problems) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkConfig(item, `${pointer}/${index}`, locales, problems));
    return;
  }
  if (value === null || typeof value !== 'object') return;

  const keys = Object.keys(value);
  const isLocaleMap = keys.length > 0 && keys.every((key) => LOCALE_KEY_RE.test(key));

  if (isLocaleMap) {
    const missing = locales.filter((code) => !keys.includes(code));
    if (missing.length > 0) {
      problems.push(`${pointer} : langue(s) manquante(s) — ${missing.join(', ')}`);
    }

    const extra = keys.filter((code) => !locales.includes(code));
    if (extra.length > 0) {
      problems.push(
        `${pointer} : langue(s) traduite(s) mais non déclarée(s) dans site.locales — ${extra.join(', ')}`,
      );
    }
    return;
  }

  for (const key of keys) {
    if (key.startsWith('_')) continue; // clés de commentaire
    walkConfig(value[key], `${pointer}/${key}`, locales, problems);
  }
}

/**
 * Lists the JSON files of config/, recursively.
 *
 * @param {string} dir - Directory to walk.
 * @returns {string[]} Absolute paths.
 */
function listConfigJson(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // schema/ décrit la FORME du manifeste ; ses `description` ne sont pas du contenu
      // traduisible, et ses `patternProperties` ressemblent à des codes de langue.
      return entry.name === 'schema' ? [] : listConfigJson(full);
    }

    return entry.name.endsWith('.json') ? [full] : [];
  });
}

async function main() {
  const siteConfig = JSON.parse(fs.readFileSync(SITE_CONFIG, 'utf8'));
  const { locales, defaultLocale } = siteConfig.site;

  const problems = [];
  const warnings = [];

  // ---------------------------------------------------------------
  // 1. Dictionnaires : clés, vacuité, gabarits
  // ---------------------------------------------------------------
  const reference = (await importEsm(path.join(DICT_DIR, `${defaultLocale}.js`))).default;
  const referenceLeaves = leaves(reference);

  for (const [dotted, value] of referenceLeaves) {
    if (typeof value === 'string' && value.trim() === '') {
      problems.push(`${defaultLocale}.js → ${dotted} : libellé vide dans la RÉFÉRENCE`);
    }
  }

  for (const locale of locales) {
    if (locale === defaultLocale) continue;

    const file = path.join(DICT_DIR, `${locale}.js`);
    if (!fs.existsSync(file)) {
      problems.push(
        `src/i18n/dictionaries/${locale}.js est introuvable alors que « ${locale} » ` +
          'est déclaré dans site.locales',
      );
      continue;
    }

    const translationLeaves = leaves((await importEsm(file)).default);

    for (const [dotted, expected] of referenceLeaves) {
      if (!translationLeaves.has(dotted)) {
        problems.push(`${locale}.js → ${dotted} : clé manquante`);
        continue;
      }

      const actual = translationLeaves.get(dotted);

      if (typeof actual === 'string' && actual.trim() === '') {
        problems.push(`${locale}.js → ${dotted} : libellé vide`);
        continue;
      }

      const expectedHoles = placeholders(expected).join(',');
      const actualHoles = placeholders(actual).join(',');
      if (expectedHoles !== actualHoles) {
        problems.push(
          `${locale}.js → ${dotted} : trous « ${actualHoles || '—'} » ` +
            `au lieu de « ${expectedHoles || '—'} »`,
        );
      }
    }

    for (const dotted of translationLeaves.keys()) {
      if (!referenceLeaves.has(dotted)) {
        // En trop plutôt que manquant : jamais lu, donc non bloquant, mais c'est le
        // symptôme d'une clé supprimée du composant sans nettoyage.
        warnings.push(`${locale}.js → ${dotted} : clé absente de la référence (jamais lue)`);
      }
    }
  }

  // Un dictionnaire présent mais non déclaré ne sera jamais chargé : c'est en pratique
  // l'oubli d'une ligne dans site.locales ou dans le switch de getDictionary.
  for (const entry of fs.readdirSync(DICT_DIR)) {
    const code = entry.replace(/\.js$/, '');
    if (entry.endsWith('.js') && !locales.includes(code)) {
      warnings.push(
        `src/i18n/dictionaries/${entry} existe mais « ${code} » n'est pas dans site.locales`,
      );
    }
  }

  // ---------------------------------------------------------------
  // 2. Contenu de config/
  // ---------------------------------------------------------------
  for (const file of listConfigJson(CONFIG_DIR)) {
    const relative = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
    walkConfig(JSON.parse(fs.readFileSync(file, 'utf8')), relative, locales, problems);
  }

  // ---------------------------------------------------------------
  // 3. Rapport
  // ---------------------------------------------------------------
  for (const warning of warnings) console.warn(`check:i18n : ${warning}`);

  if (problems.length > 0) {
    console.error(`\ncheck:i18n : ${problems.length} problème(s) :\n`);
    for (const problem of problems) console.error(`  - ${problem}`);
    console.error(
      '\nRappel : ajouter une chaîne = une clé dans DEFAULT_LABELS du composant, la même ' +
        `dans ${defaultLocale}.js, puis dans chaque traduction.\n`,
    );

    if (STRICT) process.exit(1);
    return;
  }

  console.log(
    `check:i18n : ${referenceLeaves.size} libellé(s) × ${locales.length} langue(s) ` +
      `(${locales.join(', ')}) — cohérents.`,
  );
}

main().catch((err) => {
  console.error('check:i18n : échec —', err.message);
  process.exit(1);
});
