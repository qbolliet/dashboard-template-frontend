#!/usr/bin/env node

// =================================================================
// SERVEUR — ENDPOINT GRAPHQL LOCAL SUR FIXTURES
// =================================================================
// Sert `scripts/schema.graphql` (SDL réelle, vendue depuis dashboard-template-api)
// via graphql-yoga, avec les résolveurs des opérations consommées par le template
// (getFactTableWithMetadata, getCatalogSchema, getSelectOptions,
// getGroupedSelectOptions) branchés sur les MÊMES fixtures que le transport mock
// en mémoire (src/lib/api/transports/mock.js) — pour que dev / dev:mock / dev:api
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

// ─── Scalaire JSON — passthrough, pour DatasetWithMetadata.data / extents ─────
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

// ─── Tri générique — honore l'argument `sort: [SortInput!]` ───────────────────
// Comparaison directe (>, <) : suffisant pour les types des fixtures (nombres,
// chaînes, dates ISO), qui s'ordonnent correctement en comparaison lexicale/numérique
// native sans coercion.
function applySort(rows, sort) {
  if (!sort || sort.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const { field, order } of sort) {
      const av = a[field];
      const bv = b[field];

      if (av === bv) continue;

      const cmp = av > bv ? 1 : -1;
      return order === 'DESC' ? -cmp : cmp;
    }
    return 0;
  });
}

// ─── Pagination générique — honore `limit` / `offset`, recalcule la metadata ──
function paginate({ rows, baseMetadata, limit, offset, sort }) {
  const sorted = applySort(rows, sort);
  const total = rows.length;
  const page = sorted.slice(offset, offset + limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    data: page,
    metadata: {
      ...baseMetadata,
      count: page.length,
      total,
      hasNextPage: offset + limit < total,
      currentPage: Math.floor(offset / limit) + 1,
      totalPages,
      generatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Builds the Query mock resolvers backed by the frontend's own fixtures.
 *
 * @param {Object} fixtures - Loaded fixture modules (see `loadFixtures`).
 * @returns {Object} `{ Query: () => ({...}) }`, consumed by `addMocksToSchema`.
 */
function buildMocks(fixtures) {
  const {
    factTable,
    CHART_FACT_TABLE,
    MACRO_CATALOG_SCHEMA,
    MOCK_FLAT_OPTIONS,
    MOCK_OPTIONS_BY_FIELD,
    MOCK_CATALOGUE_ID,
  } = fixtures;

  const isCatalogue = (catalog) => catalog === MOCK_CATALOGUE_ID;

  const matches = (option, term) => option.label.toLowerCase().includes(term);

  // NB : @graphql-tools/mock appelle chaque résolveur de champ avec un SEUL
  // argument (les `fieldArgs` de la requête) — pas la signature GraphQL usuelle
  // `(root, args, context, info)`. Cf. MockStore.generateFieldValueFromMocks :
  // `value = values[fieldName]; if (typeof value === 'function') value =
  // value(fieldArgs);`.
  return {
    Query: () => ({
      getFactTableWithMetadata: ({ catalog, limit = 100, offset = 0, sort }) => {
        const { columns, data, metadata } = isCatalogue(catalog) ? factTable : CHART_FACT_TABLE;
        const { data: page, metadata: pageMetadata } = paginate({
          rows: data, baseMetadata: metadata, limit, offset, sort,
        });

        return { columns, data: page, metadata: pageMetadata };
      },

      getCatalogSchema: ({ catalog }) => (
        isCatalogue(catalog) ? factTable.columnsMetadata : MACRO_CATALOG_SCHEMA
      ),

      getSelectOptions: ({ fieldName, searchTerm, limit = 50 }) => {
        const source = MOCK_OPTIONS_BY_FIELD[fieldName] ?? MOCK_FLAT_OPTIONS;
        const term = (searchTerm || '').trim().toLowerCase();
        const options = term ? source.filter((o) => matches(o, term)) : source;

        return options.slice(0, limit);
      },

      // NB : la SDL réelle type `GroupedSelectOptions.group`/`.options` en listes
      // PLATES indépendantes (deux champs chargés séparément, cf.
      // dashboard-template-api/src/schema/resolvers/select-options.ts) — PAS la
      // liste de paires { group: {value,label}, options: [...] } que servent
      // fixtures/selectOptions.js#MOCK_GROUPED_OPTIONS et qu'attend SelectMenu en
      // mode groupé. On honore ici le contrat réel (deux champs indépendants,
      // adressés par fieldName comme getSelectOptions) plutôt que la fixture
      // groupée, qui ne correspond à aucune forme valide de ce schéma.
      getGroupedSelectOptions: ({ groupField, optionsField, limit = 50 }) => ({
        group: (MOCK_OPTIONS_BY_FIELD[groupField] ?? MOCK_FLAT_OPTIONS).slice(0, limit),
        options: (MOCK_OPTIONS_BY_FIELD[optionsField] ?? MOCK_FLAT_OPTIONS).slice(0, limit),
      }),
    }),
  };
}

// Copie de `MOCK_CATALOGUE_ID` (src/lib/api/transports/mock.js) : ce fichier ne
// peut pas être chargé tel quel par Node (ses `import … from '../fixtures/x'`
// sans extension ne résolvent que sous un bundler comme Next.js/webpack, pas
// sous le loader ESM natif) ; ce serait la seule raison de l'importer, une
// simple constante partagée ne justifie pas de contourner ça.
const MOCK_CATALOGUE_ID = 'catalogue';

/**
 * Loads the frontend's fixture modules. `factTable.json` is plain JSON
 * (`require`-able as-is); the other three are ESM (`export const`, written for
 * Next.js' bundler) and need a dynamic `import()` — Node's module-syntax
 * detection (stable since Node 22) loads them as ESM despite the CommonJS
 * default of this package's `package.json`.
 *
 * @returns {Promise<Object>} Fixture bindings keyed by the names `buildMocks` expects.
 */
async function loadFixtures() {
  const fixturesDir = path.join(__dirname, '../src/lib/api/fixtures');

  // `import()` exige une URL file:// sous Windows (un chemin `C:\...` brut lève
  // ERR_UNSUPPORTED_ESM_URL_SCHEME) — d'où `pathToFileURL` sur chaque chemin.
  const importEsm = (filePath) => import(pathToFileURL(filePath).href);

  const factTable = require(path.join(fixturesDir, 'factTable.json'));
  const { CHART_FACT_TABLE } = await importEsm(path.join(fixturesDir, 'chartFactTable.js'));
  const { MACRO_CATALOG_SCHEMA } = await importEsm(path.join(fixturesDir, 'catalogSchema.js'));
  const { MOCK_FLAT_OPTIONS, MOCK_OPTIONS_BY_FIELD } = await importEsm(path.join(fixturesDir, 'selectOptions.js'));

  return {
    factTable, CHART_FACT_TABLE, MACRO_CATALOG_SCHEMA, MOCK_FLAT_OPTIONS, MOCK_OPTIONS_BY_FIELD, MOCK_CATALOGUE_ID,
  };
}

async function main() {
  const fixtures = await loadFixtures();
  const typeDefs = fs.readFileSync(SCHEMA_PATH, 'utf-8');

  const schema = createSchema({ typeDefs, resolvers: { JSON: JSONScalar } });
  const mockedSchema = addMocksToSchema({ schema, mocks: buildMocks(fixtures) });

  const yoga = createYoga({ schema: mockedSchema, graphqlEndpoint: '/graphql', logging: true });
  const server = http.createServer(yoga);

  server.listen(PORT, () => {
    console.log(`Mock GraphQL API prête sur http://localhost:${PORT}/graphql`);
  });
}

main().catch((error) => {
  console.error('Échec du démarrage du serveur mock :', error);
  process.exit(1);
});
