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
