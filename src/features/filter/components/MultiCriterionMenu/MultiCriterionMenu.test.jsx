// Importation des modules
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { request } from '@/lib/api/client';
import { GET_FIELD_STATS } from '@/lib/api/documents';
import { CHART_FACT_TABLE } from '@/lib/api/fixtures/chartFactTable';
import MultiCriterionMenu from './MultiCriterionMenu';

// =================================================================
// TEST — MultiCriterionMenu : bornes du slider dépendantes des autres critères
// =================================================================
// Intégration sur le transport mock réel (panel macro), dont getFieldStats applique
// `structuredFilters`. `request` est espionné pour lire les périmètres envoyés.

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, request: vi.fn(actual.request) };
});

const VARIABLES = [
  {
    value: 'gdp', label: 'PIB', typeFamily: 'NUMBER', isCategorical: false,
    filterOperations: ['GT', 'LT', 'BETWEEN'], displayFormat: null,
  },
  {
    value: 'date_obs', label: 'Date', typeFamily: 'DATE', isCategorical: false,
    filterOperations: ['AFTER', 'BEFORE', 'BETWEEN'], displayFormat: null,
  },
];

// gdp ∈ [99, 105] puis date_obs ∈ [01/04/2023, 01/07/2023], reliés par `connector`
const criteria = (connector) => [
  { variable: 'gdp', operation: 'BETWEEN', value: { min: '99', max: '105' }, typeFamily: 'NUMBER' },
  {
    variable: 'date_obs', operation: 'BETWEEN', value: '01/04/2023 → 01/07/2023',
    typeFamily: 'DATE', connectorBefore: connector,
  },
];

// Étendue attendue de gdp sur les lignes du trimestre retenu
const quarterGdp = CHART_FACT_TABLE.data
  .filter((row) => row.date_obs >= '2023-04-01' && row.date_obs <= '2023-07-01')
  .map((row) => row.gdp);

const renderMenu = (props) => render(
  <SWRConfig value={{ provider: () => new Map() }}>
    <MultiCriterionMenu variables={VARIABLES} showSlider {...props} />
  </SWRConfig>,
);

// Piste du slider numérique (gdp) : aria-valuemin de la poignée basse, aria-valuemax de la
// haute. Les poignées de dates portent des millisecondes, d'où le tri par grandeur.
const gdpTrack = () => {
  const thumbs = screen.getAllByRole('slider').filter((t) => Number(t.getAttribute('aria-valuemax')) < 1e6);
  return [thumbs[0].getAttribute('aria-valuemin'), thumbs[1].getAttribute('aria-valuemax')];
};

// Périmètres envoyés à getFieldStats pour gdp
const gdpScopes = () => request.mock.calls
  .filter(([doc, vars]) => doc === GET_FIELD_STATS && vars.fieldName === 'gdp')
  .map(([, vars]) => vars.structuredFilters)
  .filter(Boolean);

// Accolades : une fonction RENVOYÉE par beforeEach serait appelée comme nettoyage
beforeEach(() => { request.mockClear(); });
afterEach(cleanup);

describe('MultiCriterionMenu — dependentValues', () => {
  it('bounds the slider of a card by the other criteria (AND)', async () => {
    renderMenu({ defaultCriteria: criteria('AND') });
    await waitFor(() => expect(gdpTrack()).toEqual([String(Math.min(...quarterGdp)), String(Math.max(...quarterGdp))]));
    // Le périmètre de gdp ne contient que le critère de date, en ISO
    expect(gdpScopes().at(-1)).toEqual({
      children: [{
        criterion: { variable: 'date_obs', operation: 'BETWEEN', value: { min: '2023-04-01', max: '2023-07-01' } },
      }],
    });
  });

  it('leaves the bounds global under OR (TRUE OR B = TRUE)', async () => {
    renderMenu({ defaultCriteria: criteria('OR') });
    await waitFor(() => expect(gdpTrack()).toEqual(['98', '112.2']));
    expect(gdpScopes()).toEqual([]);
  });

  it('passes no scope with dependentValues={false}', async () => {
    renderMenu({ defaultCriteria: criteria('AND'), dependentValues: false });
    await waitFor(() => expect(gdpTrack()).toEqual(['98', '112.2']));
    // Laisse passer l'émission de montage et les requêtes qu'elle déclencherait
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    // Aucun getFieldStats filtré, sur aucune carte
    const scoped = request.mock.calls.filter(([doc, vars]) => doc === GET_FIELD_STATS && vars.structuredFilters);
    expect(scoped).toEqual([]);
  });
});

// =================================================================
// baseFilter — filtre latent, non affiché, mis en ET aux cartes
// =================================================================
// Feuille seule (forme acceptée par asFilterNode), normalisée en racine par le menu
const ITALY = { criterion: { variable: 'country', operation: 'IN', value: ['Italie'] } };
const ITALY_ROOT = { children: [ITALY] };

// FilterNode attendu des deux cartes de `criteria('AND')`, dates en ISO
const GDP_LEAF = { criterion: { variable: 'gdp', operation: 'BETWEEN', value: { min: 99, max: 105 } } };
const DATE_LEAF = {
  criterion: { variable: 'date_obs', operation: 'BETWEEN', value: { min: '2023-04-01', max: '2023-07-01' } },
};

// Arbre de rendu réutilisable par `rerender` (même fournisseur SWR que renderMenu)
const menu = (props) => (
  <SWRConfig value={{ provider: () => new Map() }}>
    <MultiCriterionMenu variables={VARIABLES} showSlider {...props} />
  </SWRConfig>
);

// Dernière structure émise par onChange
const lastEmitted = (onChange) => onChange.mock.calls.at(-1)[0];

// Piste attendue du slider gdp : étendue des lignes italiennes (et, en option, du
// trimestre retenu), élargie pour contenir la valeur courante [99, 105]
const italyGdp = (inQuarter = false) => {
  const rows = CHART_FACT_TABLE.data.filter((row) => row.country === 'Italie'
    && (!inQuarter || (row.date_obs >= '2023-04-01' && row.date_obs <= '2023-07-01')));
  const values = [...rows.map((row) => row.gdp), 99, 105];
  return [String(Math.min(...values)), String(Math.max(...values))];
};

describe('MultiCriterionMenu — baseFilter', () => {
  it('emits structuredFilters = latent filter AND cards', async () => {
    const onChange = vi.fn();
    renderMenu({ defaultCriteria: criteria('AND'), baseFilter: ITALY, onChange });
    await waitFor(() => expect(onChange).toHaveBeenCalled());

    const { structuredFilters, criteria: emitted, tree } = lastEmitted(onChange);
    expect(structuredFilters).toEqual({
      children: [ITALY_ROOT, { connector: 'AND', children: [GDP_LEAF, { connector: 'AND', ...DATE_LEAF }] }],
    });
    // criteria / tree ne décrivent que les cartes affichées : le filtre latent n'y est pas
    expect(emitted.map((c) => c.variable)).toEqual(['gdp', 'date_obs']);
    expect(tree.children).toHaveLength(2);
  });

  it('emits the latent filter alone from an empty menu', async () => {
    const onChange = vi.fn();
    renderMenu({ baseFilter: ITALY, onChange });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastEmitted(onChange).structuredFilters).toEqual(ITALY_ROOT);
  });

  it('re-emits on a baseFilter change, without user action', async () => {
    const onChange = vi.fn();
    const { rerender } = render(menu({ baseFilter: ITALY, onChange }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());

    // Même filtre, nouvel objet (littéral recréé par le parent) : aucune réémission
    const count = onChange.mock.calls.length;
    rerender(menu({ baseFilter: { criterion: { ...ITALY.criterion } }, onChange }));
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(onChange.mock.calls.length).toBe(count);

    // Filtre différent (un menu amont a changé) : réémission immédiate
    const france = { children: [{ criterion: { variable: 'country', operation: 'IN', value: ['France'] } }] };
    rerender(menu({ baseFilter: france, onChange }));
    await waitFor(() => expect(lastEmitted(onChange).structuredFilters).toEqual(france));
  });

  it('chains: a menu fed with the output of another one composes both filters', async () => {
    const onChange = vi.fn();
    // Sortie d'un menu A (porteuse de structuredFilters, filtre latent de A compris)
    const upstream = { criteria: [], tree: null, balanced: true, serial: null, structuredFilters: ITALY_ROOT };
    renderMenu({ defaultCriteria: criteria('AND').slice(0, 1), baseFilter: upstream, onChange });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastEmitted(onChange).structuredFilters).toEqual({
      children: [ITALY_ROOT, { connector: 'AND', children: [GDP_LEAF] }],
    });
  });

  it('scopes every card by the latent filter AND the other criteria (dependentValues)', async () => {
    renderMenu({ defaultCriteria: criteria('AND'), baseFilter: ITALY });
    await waitFor(() => expect(gdpTrack()).toEqual(italyGdp(true)));
    expect(gdpScopes().at(-1)).toEqual({ children: [ITALY_ROOT, { connector: 'AND', children: [DATE_LEAF] }] });
  });

  it('scopes every card by the latent filter alone with dependentValues={false}', async () => {
    renderMenu({ defaultCriteria: criteria('AND'), baseFilter: ITALY, dependentValues: false });
    await waitFor(() => expect(gdpTrack()).toEqual(italyGdp()));
    // Laisse passer l'émission de montage : le périmètre ne suit jamais l'autre carte
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    expect(gdpScopes().length).toBeGreaterThan(0);
    expect(gdpScopes().every((scope) => JSON.stringify(scope) === JSON.stringify(ITALY_ROOT))).toBe(true);
  });
});

describe('MultiCriterionMenu — baseFilter connector', () => {
  it('joins the latent filter with the connector it carries', async () => {
    const onChange = vi.fn();
    renderMenu({ defaultCriteria: criteria('AND'), baseFilter: { connector: 'OR', ...ITALY }, onChange });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastEmitted(onChange).structuredFilters).toEqual({
      children: [ITALY_ROOT, { connector: 'OR', children: [GDP_LEAF, { connector: 'AND', ...DATE_LEAF }] }],
    });
  });

  it('re-emits when only the connector changes', async () => {
    const onChange = vi.fn();
    const { rerender } = render(menu({ defaultCriteria: criteria('AND'), baseFilter: ITALY, onChange }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(lastEmitted(onChange).structuredFilters.children[1].connector).toBe('AND');

    rerender(menu({ defaultCriteria: criteria('AND'), baseFilter: { ...ITALY, connector: 'AND_NOT' }, onChange }));
    await waitFor(() => expect(lastEmitted(onChange).structuredFilters.children[1].connector).toBe('AND_NOT'));
  });

  it('scopes the cards by latent filter OR the other criteria', async () => {
    renderMenu({ defaultCriteria: criteria('AND'), baseFilter: { connector: 'OR', ...ITALY } });
    // Italie OU trimestre retenu : la piste couvre les deux ensembles de lignes
    const rows = CHART_FACT_TABLE.data.filter((row) => row.country === 'Italie'
      || (row.date_obs >= '2023-04-01' && row.date_obs <= '2023-07-01'));
    const values = [...rows.map((row) => row.gdp), 99, 105];
    await waitFor(() => expect(gdpTrack()).toEqual([String(Math.min(...values)), String(Math.max(...values))]));
    expect(gdpScopes().at(-1)).toEqual({ children: [ITALY_ROOT, { connector: 'OR', children: [DATE_LEAF] }] });
  });

  it('lifts the restriction of independent cards under OR (dependentValues={false})', async () => {
    renderMenu({ defaultCriteria: criteria('AND'), baseFilter: { connector: 'OR', ...ITALY }, dependentValues: false });
    await waitFor(() => expect(gdpTrack()).toEqual(['98', '112.2']));
    // Italie OU carte : toute valeur de la carte reste atteignable, aucun périmètre envoyé
    await new Promise((resolve) => { setTimeout(resolve, 50); });
    const scoped = request.mock.calls.filter(([doc, vars]) => doc === GET_FIELD_STATS && vars.structuredFilters);
    expect(scoped).toEqual([]);
  });
});
