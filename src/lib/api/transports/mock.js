// Importation des modules
import factTable from '../fixtures/factTable.json';
import { CHART_FACT_TABLE } from '../fixtures/chartFactTable';
import { MACRO_CATALOG_SCHEMA } from '../fixtures/catalogSchema';
import { MOCK_FLAT_OPTIONS, MOCK_GROUPED_OPTIONS, MOCK_OPTIONS_BY_FIELD } from '../fixtures/selectOptions';

// =================================================================
// TRANSPORT — FIXTURES LOCALES
// =================================================================
// Mode de fonctionnement à part entière quand NEXT_PUBLIC_API_URL est absente,
// PAS un repli sur erreur : une opération inconnue lève, et les hooks propagent
// l'erreur telle quelle. Chaque résolveur est `async` — la réponse arrive donc
// dans une microtâche, ce qui fait passer les composants par le même cycle
// `loading -> données` que l'API réelle.

/**
 * Catalog id serving the documentary catalogue fixture (`factTable.json`).
 * Any other value falls back to the macro demo panel.
 *
 * @type {string}
 */
export const MOCK_CATALOGUE_ID = 'catalogue';

// Deux jeux de faits cohabitent : le catalogue documentaire (table) et le panel
// macro (graphique, filtres). Ils partagent les mêmes opérations, on les
// distingue donc comme le ferait l'API — par le catalogue demandé.
const isCatalogue = (catalog) => catalog === MOCK_CATALOGUE_ID;

// Filtrage par libellé, équivalent local de l'argument `searchTerm` que l'API
// applique côté serveur sur getSelectOptions.
const matches = (option, term) => option.label.toLowerCase().includes(term);

const RESOLVERS = {
  // `fields`, `structuredFilters`, `limit`, `offset` et `sort` ne sont pas
  // appliqués : les fixtures tiennent en une page (18 et 20 lignes, sous la
  // limite par défaut de 100) et `metadata` resterait à recalculer sinon.
  GetFactTableWithMetadata: async ({ catalog }) => {
    // `columnsMetadata` de la fixture appartient à getCatalogSchema : on ne
    // renvoie ici que les trois champs du type DatasetWithMetadata.
    const { columns, data, metadata } = isCatalogue(catalog) ? factTable : CHART_FACT_TABLE;

    return { getFactTableWithMetadata: { columns, data, metadata } };
  },

  GetCatalogSchema: async ({ catalog }) => ({
    getCatalogSchema: isCatalogue(catalog) ? factTable.columnsMetadata : MACRO_CATALOG_SCHEMA,
  }),

  GetSelectOptions: async ({ fieldName, searchTerm, limit = 50 }) => {
    const source = MOCK_OPTIONS_BY_FIELD[fieldName] ?? MOCK_FLAT_OPTIONS;
    const term = (searchTerm || '').trim().toLowerCase();
    const options = term ? source.filter((o) => matches(o, term)) : source;

    return { getSelectOptions: options.slice(0, limit) };
  },

  // Pas d'argument `searchTerm` : l'API n'en expose pas sur cette opération. La
  // recherche en mode groupé est un filtrage local, fait par useSelectOptions —
  // identique dans les deux transports, donc.
  GetGroupedSelectOptions: async ({ limit = 50 }) => ({
    getGroupedSelectOptions: MOCK_GROUPED_OPTIONS.map((g) => ({ ...g, options: g.options.slice(0, limit) })),
  }),
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
  const resolve = RESOLVERS[operationName];

  if (!resolve) {
    throw new Error(`Transport mock : aucune fixture pour l'opération « ${operationName} ».`);
  }

  return resolve(variables);
}
