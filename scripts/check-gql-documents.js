#!/usr/bin/env node

// Vérifie que tous les documents GraphQL de src/lib/api/documents/ sont valides
// vis-à-vis de scripts/schema.graphql (source figée servie par le mock, voir
// l'en-tête de ce fichier). Validation maison via `graphql` (déjà une dépendance
// du client) plutôt que @graphql-inspector/cli, pour ne pas tirer une dépendance
// supplémentaire pour un simple appel à `validate()`.
//
// Les documents sont extraits par regex plutôt qu'exécutés : ce sont des modules
// ESM (`export const`) avec des imports relatifs sans extension (`from './gql'`),
// que le loader ESM natif de Node ne résout pas sans loader personnalisé. Le
// contenu des blocs gql`...` étant du texte brut sans interpolation, une regex
// suffit — même approche que scripts/check-palette-sync.js.

const fs = require('fs');
const path = require('path');
const { buildSchema, parse, validate } = require('graphql');

const SCHEMA_PATH = path.join(__dirname, 'schema.graphql');
const DOCUMENTS_DIR = path.join(__dirname, '../src/lib/api/documents');
const EXCLUDED_FILES = new Set(['gql.js', 'index.js']);

/**
 * Extracts every `export const NAME = gql\`...\`;` document from a file's source.
 *
 * @param {string} source - Full contents of a documents/*.js file.
 * @returns {Array<{name: string, body: string}>} Extracted documents.
 */
function extractDocuments(source) {
  const re = /export const ([A-Z_][A-Z0-9_]*)\s*=\s*gql`([\s\S]*?)`;/g;
  const documents = [];
  let match;
  while ((match = re.exec(source)) !== null) {
    const [, name, body] = match;
    documents.push({ name, body });
  }
  return documents;
}

/**
 * Reads every documents/*.js file (excluding the `gql` tag and the barrel
 * index.js) and collects the GraphQL documents they export.
 *
 * @returns {Array<{name: string, source: string}>} Document name -> query text.
 */
function loadDocuments() {
  const files = fs.readdirSync(DOCUMENTS_DIR).filter((f) => f.endsWith('.js') && !EXCLUDED_FILES.has(f));
  const documents = [];
  for (const file of files) {
    const source = fs.readFileSync(path.join(DOCUMENTS_DIR, file), 'utf8');
    for (const { name, body } of extractDocuments(source)) {
      documents.push({ name: `${name} (${file})`, source: body });
    }
  }
  return documents;
}

function main() {
  const schema = buildSchema(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  const documents = loadDocuments();

  if (documents.length === 0) {
    console.error('check-gql: aucun document `export const … = gql\\`…\\`;` trouvé dans src/lib/api/documents/.');
    process.exit(1);
  }

  const errors = [];
  for (const { name, source } of documents) {
    let ast;
    try {
      ast = parse(source);
    } catch (err) {
      errors.push(`${name}: document illisible (parse GraphQL) — ${err.message}`);
      continue;
    }
    const validationErrors = validate(schema, ast);
    for (const err of validationErrors) {
      errors.push(`${name}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    console.error(`check-gql: ${errors.length} erreur(s) de validation contre scripts/schema.graphql :\n`);
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }

  console.log(`check-gql: ${documents.length} document(s) GraphQL valides contre scripts/schema.graphql.`);
}

main();
