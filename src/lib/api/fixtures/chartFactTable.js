// =================================================================
// FIXTURE — getFactTableWithMetadata (panel macro)
// =================================================================
// Croissance trimestrielle du PIB par pays : x = date (chaîne ISO), y = mesure,
// hue = catégoriel. `date_obs` reste une CHAÎNE ISO, comme la renverrait l'API :
// c'est `coerce()` côté <Chart> qui la transforme en Date, pas la source.
// Jeu par défaut de `getFactTableWithMetadata` dans le transport mock ; le
// catalogue documentaire (fixtures/factTable.json) est servi sous `catalog:
// 'catalogue'`.

const COLUMNS = ['date_obs', 'country', 'gdp'];

const DATA = [
  { date_obs: '2023-01-01', country: 'France',    gdp: 100.0 },
  { date_obs: '2023-04-01', country: 'France',    gdp: 100.8 },
  { date_obs: '2023-07-01', country: 'France',    gdp: 101.3 },
  { date_obs: '2023-10-01', country: 'France',    gdp: 102.1 },
  { date_obs: '2024-01-01', country: 'France',    gdp: 102.9 },
  { date_obs: '2024-04-01', country: 'France',    gdp: 103.4 },
  { date_obs: '2023-01-01', country: 'Allemagne', gdp: 110.0 },
  { date_obs: '2023-04-01', country: 'Allemagne', gdp: 110.4 },
  { date_obs: '2023-07-01', country: 'Allemagne', gdp: 109.8 },
  { date_obs: '2023-10-01', country: 'Allemagne', gdp: 110.6 },
  { date_obs: '2024-01-01', country: 'Allemagne', gdp: 111.5 },
  { date_obs: '2024-04-01', country: 'Allemagne', gdp: 112.2 },
  { date_obs: '2023-01-01', country: 'Italie',    gdp: 98.0 },
  { date_obs: '2023-04-01', country: 'Italie',    gdp: 98.6 },
  { date_obs: '2023-07-01', country: 'Italie',    gdp: 99.1 },
  { date_obs: '2023-10-01', country: 'Italie',    gdp: 99.9 },
  { date_obs: '2024-01-01', country: 'Italie',    gdp: 100.7 },
  { date_obs: '2024-04-01', country: 'Italie',    gdp: 101.2 },
];

// `extents` donne [min, max] pour les mesures et [premier, dernier] pour les
// dimensions catégorielles — même contenu que le `metadata.extents` de l'API.
const METADATA = {
  count: DATA.length,
  extents: {
    date_obs: ['2023-01-01', '2024-04-01'],
    country: ['France', 'Italie'],
    gdp: [98.0, 112.2],
  },
  total: DATA.length,
  hasNextPage: false,
  currentPage: 1,
  totalPages: 1,
  generatedAt: new Date(0).toISOString(),
};

/**
 * Long-format fact table shaped exactly like `getFactTableWithMetadata`
 * (`format: OBJECTS`): `{ columns, data, metadata }`.
 *
 * @type {{ columns: string[], data: Array<Object>, metadata: Object }}
 */
export const CHART_FACT_TABLE = { columns: COLUMNS, data: DATA, metadata: METADATA };
