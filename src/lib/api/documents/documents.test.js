// @vitest-environment node

// Importation des modules
import { createRequire } from 'node:module';
import { beforeAll, describe, expect, it } from 'vitest';

// Les scripts sont en CommonJS et lisent le disque : on les charge avec le `require`
// natif de Node (pas le pipeline de Vite), comme `npm run mock:api` / `check:gql`.
const require = createRequire(import.meta.url);
const { createMockYoga } = require('../../../../scripts/mock-api-server.js');
const { loadDocuments } = require('../../../../scripts/check-gql-documents.js');

// =================================================================
// TEST — CHAQUE DOCUMENT S'EXÉCUTE CONTRE LE SERVEUR MOCK
// =================================================================
// Le serveur mock charge le SDL officiel (scripts/schema.graphql) : un document qui
// ne le valide pas, ou une fixture qui ne tient pas le contrat, échoue ici. Les
// requêtes passent par `yoga.fetch`, sans ouvrir de port.

// Variables de chaque document (celles sans valeur par défaut doivent être fournies).
const VARIABLES = {
  GET_FACT_TABLE_WITH_METADATA: { catalog: 'catalogue', limit: 5 },
  GET_CATALOG_SCHEMA: { catalog: 'catalogue' },
  GET_SELECT_OPTIONS: { fieldName: 'region' },
  GET_SELECT_OPTIONS_TREE: { fieldName: 'country', maxDepth: 2 },
  GET_FIELD_STATS: { fieldName: 'gdp' },
  GET_AGGREGATES: { catalog: 'catalogue', groupBy: [{ field: 'sector' }], aggregates: [{ measure: 'montant' }] },
};

const documents = loadDocuments().map(({ name, source }) => ({ id: name.split(' ')[0], source }));

describe('documents GraphQL contre le serveur mock', () => {
  let yoga;

  beforeAll(async () => {
    yoga = await createMockYoga();
  });

  const execute = async (id, source) => {
    const response = await yoga.fetch('http://mock.local/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: source, variables: VARIABLES[id] ?? {} }),
    });
    return response.json();
  };

  it('couvre tous les documents exportés', () => {
    expect(documents.length).toBeGreaterThan(0);
    for (const { id } of documents) expect(VARIABLES).toHaveProperty(id);
  });

  for (const { id, source } of documents) {
    it(`${id} s'exécute sans erreur`, async () => {
      const result = await execute(id, source);

      expect(result.errors).toBeUndefined();
      expect(result.data).toBeTruthy();
    });
  }
});
