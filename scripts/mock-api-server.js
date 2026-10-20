#!/usr/bin/env node

// =================================================================
// SERVEUR — ENDPOINT GRAPHQL LOCAL SUR FIXTURES
// =================================================================
// Sert `scripts/schema.graphql` (SDL officielle de dashboard-template-api, copiée
// par `npm run sync:schema` — ne jamais l'éditer) via graphql-yoga, avec les
// résolveurs des opérations consommées par le template (getFactTableWithMetadata,
// getCatalogSchema, getSelectOptions, getSelectOptionsTree, getFieldStats,
// getAggregates). Ces
// résolveurs sont CEUX du transport mock en mémoire (src/lib/api/transports/
// mockResolvers.js), sur les mêmes fixtures — pour que dev / dev:mock / dev:api
// affichent des données identiques. Toute autre opération du schéma reste
// auto-mockée par @graphql-tools/mock (valeurs arbitraires mais conformes aux
// types), utile pour explorer le reste du contrat API sans le brancher.
//
// Script volontairement en CommonJS (cohérent avec les autres scripts/*.js), mais
// les fixtures de src/lib/api/ sont écrites en syntaxe ESM (`export const`) pour
// être bundlées par Next.js : elles sont donc chargées via `import()` dynamique
// (Node ≥22 détecte leur syntaxe ESM automatiquement), pas via `require()`.

const fs = require('fs');
const path = require('path');
const http = require('http');
const { pathToFileURL } = require('url');
const { createSchema, createYoga } = require('graphql-yoga');
const { addMocksToSchema } = require('@graphql-tools/mock');
const { GraphQLScalarType, Kind } = require('graphql');

const PORT = Number(process.env.MOCK_API_PORT) || 4000;
const SCHEMA_PATH = path.join(__dirname, 'schema.graphql');

// ─── Scalaire JSON — passthrough, pour data / extents / min / max / arbres ────
// Les fixtures sont déjà des valeurs JS concrètes (objets/tableaux/primitives) :
// aucune sérialisation à faire, contrairement à un scalaire JSON "réel" qui
// validerait sa forme. Suffisant pour un serveur de démonstration.
function parseLiteral(ast) {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return Number(ast.value);
    case Kind.OBJECT:
      return Object.fromEntries(ast.fields.map((f) => [f.name.value, parseLiteral(f.value)]));
    case Kind.LIST:
      return ast.values.map(parseLiteral);
    case Kind.NULL:
      return null;
    default:
      return null;
  }
}

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Scalaire JSON passthrough (serveur mock)',
  serialize: (value) => value,
  parseValue: (value) => value,
  parseLiteral,
});

/**
 * Loads the frontend's fixture modules and assembles the shared resolvers.
 * `factTable.json` is plain JSON (`require`-able as-is); the other modules are ESM
 * (`export const`, written for Next.js' bundler) and need a dynamic `import()` —
 * Node's module-syntax detection (stable since Node 22) loads them as ESM despite
 * the CommonJS default of this package's `package.json`.
 *
 * @returns {Promise<Object>} Root-field resolvers, as built by `createMockResolvers`.
 */
async function loadResolvers() {
  const apiDir = path.join(__dirname, '../src/lib/api');

  // `import()` exige une URL file:// sous Windows (un chemin `C:\...` brut lève
  // ERR_UNSUPPORTED_ESM_URL_SCHEME) — d'où `pathToFileURL` sur chaque chemin.
  const importEsm = (relativePath) => import(pathToFileURL(path.join(apiDir, relativePath)).href);

  const { createMockResolvers } = await importEsm('transports/mockResolvers.js');
  const { CHART_FACT_TABLE } = await importEsm('fixtures/chartFactTable.js');
  const { MACRO_CATALOG_SCHEMA } = await importEsm('fixtures/catalogSchema.js');
  const { CATALOGUE_FIELD_STATS, MACRO_FIELD_STATS } = await importEsm('fixtures/fieldStats.js');
  const { MOCK_OPTIONS_BY_FIELD, MOCK_OPTIONS_TREES } = await importEsm('fixtures/selectOptions.js');

  return createMockResolvers({
    // Copie de `MOCK_CATALOGUE_ID` (transports/mock.js) : ce module importe ses
    // fixtures sans extension, ce que le loader ESM natif ne résout pas.
    catalogueId: 'catalogue',
    factTable: require(path.join(apiDir, 'fixtures/factTable.json')),
    CHART_FACT_TABLE,
    MACRO_CATALOG_SCHEMA,
    CATALOGUE_FIELD_STATS,
    MACRO_FIELD_STATS,
    MOCK_OPTIONS_BY_FIELD,
    MOCK_OPTIONS_TREES,
  });
}

/**
 * Builds the mocked GraphQL Yoga instance (schema from `scripts/schema.graphql`).
 *
 * @returns {Promise<Object>} A graphql-yoga server; usable as a Node request listener
 *   or through `yoga.fetch()` without opening a port.
 */
async function createMockYoga() {
  const resolvers = await loadResolvers();
  const typeDefs = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  const schema = createSchema({ typeDefs, resolvers: { JSON: JSONScalar } });

  // NB : @graphql-tools/mock appelle chaque résolveur de champ avec un SEUL
  // argument (les `fieldArgs` de la requête) — pas la signature GraphQL usuelle
  // `(root, args, context, info)`. Cf. MockStore.generateFieldValueFromMocks :
  // `value = values[fieldName]; if (typeof value === 'function') value =
  // value(fieldArgs);`. Les arguments ne portent pas `catalog` quand la requête
  // l'omet : les résolveurs retombent alors sur le panel macro, comme le transport.
  const mockedSchema = addMocksToSchema({
    schema,
    mocks: {
      // Jamais de valeur aléatoire : un champ JSON non fourni par un résolveur vaut null.
      JSON: () => null,
      Query: () => resolvers,
    },
  });

  // Serveur de démonstration : on veut lire le message des erreurs des résolveurs
  // (BAD_USER_INPUT…), pas le « Unexpected error. » du masquage de production.
  return createYoga({
    schema: mockedSchema,
    graphqlEndpoint: '/graphql',
    logging: true,
    maskedErrors: false,
  });
}

async function main() {
  const yoga = await createMockYoga();
  const server = http.createServer(yoga);

  server.listen(PORT, () => {
    console.log(`Mock GraphQL API prête sur http://localhost:${PORT}/graphql`);
  });
}

// Importé (test vitest) le module ne démarre rien ; lancé par `npm run mock:api` il écoute.
if (require.main === module) {
  main().catch((error) => {
    console.error('Échec du démarrage du serveur mock :', error);
    process.exit(1);
  });
}

module.exports = { createMockYoga };
