// Importation des modules
import factTable from '../fixtures/factTable.json';
import { CHART_FACT_TABLE } from '../fixtures/chartFactTable';
import { MACRO_CATALOG_SCHEMA } from '../fixtures/catalogSchema';
import { CATALOGUE_FIELD_STATS, MACRO_FIELD_STATS } from '../fixtures/fieldStats';
import { MOCK_OPTIONS_BY_FIELD, MOCK_OPTIONS_TREES } from '../fixtures/selectOptions';
import { createMockResolvers } from './mockResolvers';

// =================================================================
// TRANSPORT — FIXTURES LOCALES
// =================================================================
// Mode de fonctionnement à part entière quand NEXT_PUBLIC_API_URL est absente,
// PAS un repli sur erreur : une opération inconnue lève, et les hooks propagent
// l'erreur telle quelle. Chaque résolveur est `async` — la réponse arrive donc
// dans une microtâche, ce qui fait passer les composants par le même cycle
// `loading -> données` que l'API réelle. La logique des résolveurs vit dans
// mockResolvers.js, partagée avec le serveur `npm run mock:api`.

/**
 * Catalog id serving the documentary catalogue fixture (`factTable.json`).
 * Any other value falls back to the macro demo panel.
 *
 * @type {string}
 */
export const MOCK_CATALOGUE_ID = 'catalogue';

const resolvers = createMockResolvers({
  catalogueId: MOCK_CATALOGUE_ID,
  factTable,
  CHART_FACT_TABLE,
  MACRO_CATALOG_SCHEMA,
  CATALOGUE_FIELD_STATS,
  MACRO_FIELD_STATS,
  MOCK_OPTIONS_BY_FIELD,
  MOCK_OPTIONS_TREES,
});

// Nom d'opération -> champ racine du schéma. Une opération, un résolveur ; la
// réponse est enveloppée sous le champ racine, exactement comme le ferait GraphQL.
const OPERATIONS = {
  GetFactTableWithMetadata: 'getFactTableWithMetadata',
  GetCatalogSchema: 'getCatalogSchema',
  GetSelectOptions: 'getSelectOptions',
  GetSelectOptionsTree: 'getSelectOptionsTree',
  GetFieldStats: 'getFieldStats',
};

/**
 * Resolves a GraphQL document against the local fixtures.
 *
 * Routes on the document's operation name; the `catalog` variable selects
 * between the two demo datasets, mirroring how the real API scopes data.
 *
 * @param {Object} params
 * @param {string} params.operationName - Operation name of the document.
 * @param {Object} [params.variables] - Query variables.
 * @returns {Promise<Object>} A `data` object keyed by root field, exactly as the
 *   GraphQL transport would return it.
 * @throws {Error} If no fixture resolver is registered for the operation.
 */
export async function mockTransport({ operationName, variables = {} }) {
  const rootField = OPERATIONS[operationName];

  if (!rootField) {
    throw new Error(`Transport mock : aucune fixture pour l'opération « ${operationName} ».`);
  }

  return { [rootField]: resolvers[rootField](variables) };
}
