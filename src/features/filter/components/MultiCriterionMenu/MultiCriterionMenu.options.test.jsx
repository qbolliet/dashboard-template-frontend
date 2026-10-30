// Importation des modules
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { request } from '@/lib/api/client';
import { GET_SELECT_OPTIONS } from '@/lib/api/documents';
import { getOperationName } from '@/lib/api/documents/gql';
import { defineField } from '@/lib/api/fixtures/metadata';
import { createMockResolvers } from '@/lib/api/transports/mockResolvers';
import { metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import MultiCriterionMenu from './MultiCriterionMenu';

// =================================================================
// TEST — MultiCriterionMenu : options des menus catégoriels dépendantes des autres critères
// =================================================================
// Intégration sur les résolveurs mock RÉELS (createMockResolvers, le même évaluateur de
// `structuredFilters` que getFieldStats), nourris d'un petit jeu pays × continent : les
// fixtures du panel macro n'ont que des pays européens, où rien ne se verrait. Le jeu est
// servi comme catalogue documentaire (`catalog: 'monde'`), dont les options sont dérivées
// des lignes.

const CATALOG = 'monde';

const PAYS = {
  France: 'Europe',
  Allemagne: 'Europe',
  Italie: 'Europe',
  Espagne: 'Europe',
  Japon: 'Asie',
  Brésil: 'Amérique',
  'États-Unis': 'Amérique',
};
// Ordre des options : celui des valeurs distinctes, triées comme DuckDB (binaire)
const ALL = Object.keys(PAYS).sort();
const EUROPE = ALL.filter((p) => PAYS[p] === 'Europe');

const WORLD = {
  columns: ['pays', 'continent'],
  data: Object.entries(PAYS).map(([pays, continent]) => ({ pays, continent })),
  metadata: { generatedAt: new Date(0).toISOString() },
  columnsMetadata: [
    defineField({ name: 'pays', label: 'Pays', sqlType: 'VARCHAR', isCategorical: true }),
    defineField({ name: 'continent', label: 'Continent', sqlType: 'VARCHAR', isCategorical: true }),
  ],
};

// Seul le catalogue « monde » est interrogé : le panel macro reste vide
const resolvers = createMockResolvers({
  catalogueId: CATALOG,
  factTable: WORLD,
  CHART_FACT_TABLE: { columns: [], data: [], metadata: {} },
  MACRO_CATALOG_SCHEMA: [],
  CATALOGUE_FIELD_STATS: {},
  MACRO_FIELD_STATS: {},
  MOCK_OPTIONS_BY_FIELD: {},
  MOCK_OPTIONS_TREES: {},
});

// Client espionné : nom d'opération → champ racine → résolveur, réponse enveloppée comme
// le ferait le transport mock
vi.mock('@/lib/api/client', () => ({ request: vi.fn() }));
const resolve = async (document, variables = {}) => {
  const op = getOperationName(document);
  const root = op[0].toLowerCase() + op.slice(1);
  return { [root]: resolvers[root](variables) };
};

const VARIABLES = metadataToVariables(WORLD.columnsMetadata);

const option = (value) => ({ value, label: value });

// pays IN (France) ET continent = Europe
const CRITERIA = [
  { variable: 'pays', operation: 'IN', value: [option('France')], typeFamily: 'TEXT', isCategorical: true },
  {
    variable: 'continent', operation: 'EQ', value: option('Europe'),
    typeFamily: 'TEXT', isCategorical: true, connectorBefore: 'AND',
  },
];

const renderMenu = (props) => render(
  <SWRConfig value={{ provider: () => new Map() }}>
    <MultiCriterionMenu variables={VARIABLES} catalog={CATALOG} defaultCriteria={CRITERIA} {...props} />
  </SWRConfig>,
);

// Ouvre le menu de valeurs des pays (le premier menu de valeurs en multi : il porte des tags)
const openCountryMenu = () => {
  const tag = screen.getByRole('button', { name: /retirer france/i });
  const field = tag.closest('.select-container');
  fireEvent.click(within(field).getByRole('button', { name: /ouvrir la liste/i }));
  return screen.getByRole('listbox');
};
const offered = (listbox) => within(listbox).queryAllByRole('option')
  .map((o) => o.textContent)
  .filter((name) => name !== 'Tout sélectionner');

// Périmètres envoyés à getSelectOptions pour les pays
const countryScopes = () => request.mock.calls
  .filter(([doc, vars]) => doc === GET_SELECT_OPTIONS && vars.fieldName === 'pays')
  .map(([, vars]) => vars.structuredFilters);

// Accolades : une fonction RENVOYÉE par beforeEach serait appelée comme nettoyage
beforeEach(() => { request.mockReset(); request.mockImplementation(resolve); });
afterEach(cleanup);

describe('MultiCriterionMenu — dependentValues (categorical menus)', () => {
  it('offers only the countries of the rows the other criteria keep', async () => {
    renderMenu();
    const listbox = openCountryMenu();

    await waitFor(() => expect(offered(listbox)).toEqual(EUROPE));
    // Le périmètre des pays ne contient que le critère de continent
    expect(countryScopes().at(-1)).toEqual({
      children: [{ criterion: { variable: 'continent', operation: 'EQ', value: 'Europe' } }],
    });

    // Refermer puis rouvrir le menu, périmètre inchangé : aucune nouvelle requête
    const sent = request.mock.calls.length;
    fireEvent.click(screen.getByRole('button', { name: /fermer la liste/i }));
    openCountryMenu();
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(request.mock.calls.length).toBe(sent);
  });

  it('offers every country with dependentValues={false}', async () => {
    renderMenu({ dependentValues: false });
    const listbox = openCountryMenu();

    await waitFor(() => expect(offered(listbox)).toEqual(ALL));
    // Laisse passer l'émission de montage et les requêtes qu'elle déclencherait
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(countryScopes().every((scope) => scope === undefined)).toBe(true);
  });

  it('keeps a selected country the other criteria exclude, still selected', async () => {
    renderMenu({
      defaultCriteria: [{ ...CRITERIA[0], value: [option('France'), option('Japon')] }, CRITERIA[1]],
    });
    const listbox = openCountryMenu();

    // Japon, exclu par « continent = Europe », reste en tête et coché
    await waitFor(() => expect(offered(listbox)).toEqual(['Japon', ...EUROPE]));
    expect(within(listbox).getByRole('option', { name: 'Japon' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: /retirer japon/i })).toBeInTheDocument();
  });
});
