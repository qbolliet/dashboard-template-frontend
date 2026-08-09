#!/usr/bin/env node

// Valide config/site.config.json contre config/schema/site.schema.json (JSON Schema
// draft 2020-12). Le manifeste est la seule source de configuration du template : une
// faute de frappe y casse le rendu silencieusement, d'où ce garde-fou dans `verify`.
//
// Le schéma sert d'abord l'utilisateur tiers, à qui `$schema` donne autocomplétion et
// infobulles dans son éditeur ; ce script n'est que le filet du build, qui garantit que
// ce contrat est bien respecté même sans éditeur compatible.
//
// Deux points d'attention sur ajv :
//   - l'entrée à requérir est `ajv/dist/2020`, et non `ajv` (qui expose le draft-07).
//     Attention aussi à la version résolue : ESLint tire transitivement un ajv 6, d'où
//     le `ajv@^8` explicite en devDependencies ;
//   - `useDefaults` est volontairement laissé désactivé : les `default` du schéma sont
//     documentaires (ils s'affichent en infobulle), on ne mute pas les données validées.
//     Les consommateurs appliquent eux-mêmes le défaut (`searchable !== false`).
//
// Les fichiers sont lus par `fs` plutôt que `require`és afin de rapporter une erreur de
// syntaxe JSON avec le nom du fichier fautif, plutôt qu'une trace de module.

const fs = require('fs');
const path = require('path');
const Ajv = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

const CONFIG_PATH = path.join(__dirname, '../config/site.config.json');
const SCHEMA_PATH = path.join(__dirname, '../config/schema/site.schema.json');

/**
 * Reads and parses a JSON file, exiting with a readable message on syntax errors.
 *
 * @param {string} filePath - Absolute path to the JSON file.
 * @param {string} label - Capitalized, human-readable role of the file, used to open the
 *     error message (e.g. "Le manifeste").
 * @returns {Object} The parsed JSON value.
 */
function readJson(filePath, label) {
  let source;
  try {
    source = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`validate:config: ${label} est introuvable — ${path.relative(process.cwd(), filePath)}`);
    process.exit(1);
  }
  try {
    return JSON.parse(source);
  } catch (err) {
    console.error(`validate:config: ${label} est illisible (JSON invalide) — ${err.message}`);
    process.exit(1);
  }
}

/**
 * Counts every node of the navigation tree, children included.
 *
 * @param {Array<Object>} nodes - Navigation nodes to walk.
 * @returns {number} Total number of nodes in the subtree.
 */
function countNodes(nodes) {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children ?? []), 0);
}

/**
 * Collects the cross-field locale rules that JSON Schema cannot express.
 *
 * Two invariants, both of which would otherwise fail at render time rather than at
 * build time:
 *
 *   1. `site.defaultLocale` must be one of `site.locales`. Otherwise the fallback locale
 *      has no dictionary and no route, and every page 404s.
 *   2. every localized object must carry the default locale. `resolveLocalized` falls
 *      back to it before anything else; a translation map that skips it is one missing
 *      language away from displaying a node in an arbitrary tongue.
 *
 * @param {Object} config - The parsed manifest.
 * @returns {string[]} One message per violation; empty when the manifest is sound.
 */
function collectLocaleProblems(config) {
  const problems = [];
  const { locales, defaultLocale } = config.site;

  if (!locales.includes(defaultLocale)) {
    problems.push(
      `/site/defaultLocale "${defaultLocale}" ne figure pas dans /site/locales ` +
        `(${locales.join(', ')})`
    );
  }

  // Marche en profondeur sur tout le manifeste : la règle vaut pour `site.title` comme
  // pour le `name` d'un nœud de troisième niveau, et une liste de chemins codée en dur
  // se périmerait au premier champ traduisible ajouté.
  const walk = (value, pointer) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${pointer}/${index}`));
      return;
    }
    if (value === null || typeof value !== 'object') return;

    const keys = Object.keys(value);
    // Un objet dont TOUTES les clés sont des codes de langue est une carte de
    // traduction ; tout autre objet est une structure du manifeste, qu'on traverse.
    const isLocaleMap =
      keys.length > 0 && keys.every((key) => /^[a-z]{2}(-[A-Z]{2})?$/.test(key));

    if (isLocaleMap) {
      if (!keys.includes(defaultLocale)) {
        problems.push(
          `${pointer} est traduit en ${keys.join(', ')} mais pas dans la langue par ` +
            `défaut "${defaultLocale}", qui sert de repli`
        );
      }
      return;
    }

    for (const key of keys) walk(value[key], `${pointer}/${key}`);
  };

  walk(config, '');

  return problems;
}

/**
 * Turns one ajv error into a single actionable line: where, what, and the accepted
 * values when the schema enumerates them.
 *
 * @param {Object} error - An entry of `validate.errors`.
 * @returns {string} The formatted message.
 */
function formatError(error) {
  const where = error.instancePath || '<racine>';
  const details = [];

  if (error.keyword === 'enum' && error.params.allowedValues) {
    details.push(`valeurs acceptées : ${error.params.allowedValues.join(', ')}`);
  }
  if (error.keyword === 'additionalProperties') {
    details.push(`propriété inconnue : "${error.params.additionalProperty}"`);
  }
  if (error.keyword === 'pattern') {
    details.push(`motif attendu : ${error.params.pattern}`);
  }
  if (error.keyword === 'required') {
    details.push(`propriété manquante : "${error.params.missingProperty}"`);
  }

  const suffix = details.length > 0 ? ` (${details.join(' ; ')})` : '';
  return `${where} ${error.message}${suffix}`;
}

function main() {
  const schema = readJson(SCHEMA_PATH, 'Le schéma');
  const config = readJson(CONFIG_PATH, 'Le manifeste');

  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);

  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (err) {
    console.error(`validate:config: schéma non compilable — ${err.message}`);
    process.exit(1);
  }

  if (!validate(config)) {
    console.error(
      `validate:config: ${validate.errors.length} erreur(s) dans config/site.config.json ` +
        'vis-à-vis de config/schema/site.schema.json :\n'
    );
    for (const error of validate.errors) console.error(`  - ${formatError(error)}`);
    process.exit(1);
  }

  const localeProblems = collectLocaleProblems(config);
  if (localeProblems.length > 0) {
    console.error(
      `validate:config: ${localeProblems.length} incohérence(s) de langue dans ` +
        'config/site.config.json :\n'
    );
    for (const problem of localeProblems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  const nodeCount = countNodes(config.navigation.tree);
  console.log(
    `validate:config: manifeste valide — ${nodeCount} nœud(s) de navigation, ` +
      `${config.site.locales.length} langue(s) (${config.site.locales.join(', ')}).`
  );
}

main();
