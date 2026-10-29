// Importation des modules
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { request } from '@/lib/api/client';
import { GET_FIELD_STATS } from '@/lib/api/documents';
import ConstraintField from './ConstraintField';

// =================================================================
// TEST — ConstraintField : piste (trackScope) séparée de la validation
// =================================================================
// Transport mock réel (fixtures du panel macro) : gdp va de 98 à 112.2 sur toute la
// colonne, de 100 à 103.4 pour la France. `request` est espionné pour compter les
// appels à getFieldStats.

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, request: vi.fn(actual.request) };
});

const FRANCE = { children: [{ criterion: { variable: 'country', operation: 'IN', value: ['France'] } }] };
const NOWHERE = { children: [{ criterion: { variable: 'country', operation: 'IN', value: ['Atlantide'] } }] };

// Cache SWR isolé par test : sans lui, les réponses d'un test fuiraient dans le suivant.
const renderField = (props) => render(
  <SWRConfig value={{ provider: () => new Map() }}>
    <ConstraintField fieldName="gdp" typeFamily="NUMBER" displayFormat={null} {...props} />
  </SWRConfig>,
);

// Bornes de la piste lues sur la poignée (slider ARIA)
const track = () => {
  const thumb = screen.getByRole('slider');
  return [thumb.getAttribute('aria-valuemin'), thumb.getAttribute('aria-valuemax')];
};

const statsCalls = () => request.mock.calls.filter(([doc]) => doc === GET_FIELD_STATS);

// Accolades : une fonction RENVOYÉE par beforeEach serait appelée comme nettoyage
beforeEach(() => { request.mockClear(); });
afterEach(cleanup);

describe('ConstraintField — trackScope', () => {
  it('spans the track over the values trackScope still reaches', async () => {
    renderField({ trackScope: FRANCE });
    await waitFor(() => expect(track()).toEqual(['100', '103.4']));
  });

  it('keeps the validation on the global bounds', async () => {
    // 111 est hors de la France mais dans la colonne : valide, et la piste s'élargit jusqu'à lui
    const { container } = renderField({ trackScope: FRANCE, validate: true, defaultValueLow: '111' });
    await waitFor(() => expect(track()).toEqual(['100', '111']));
    // Message du champ lui-même (l'annonceur ARIA global vit hors du conteneur)
    expect(within(container).queryByText(/Hors de/)).toBeNull();
  });

  it('widens the track to the current value, within the global bounds', async () => {
    // 120 dépasse la colonne : invalide, et la piste s'arrête au maximum global
    const { container } = renderField({ trackScope: FRANCE, validate: true, defaultValueLow: '120' });
    await waitFor(() => expect(track()).toEqual(['100', '112.2']));
    expect(within(container).getByText(/Hors de 98 – 112.2/)).toBeInTheDocument();
  });

  it('keeps the previous track while a new scope loads', async () => {
    const view = renderField({ trackScope: FRANCE });
    await waitFor(() => expect(track()).toEqual(['100', '103.4']));

    // Réponse du nouveau périmètre suspendue : la piste ne doit pas revenir aux bornes globales
    request.mockImplementationOnce(() => new Promise(() => {}));
    const GERMANY = { children: [{ criterion: { variable: 'country', operation: 'IN', value: ['Allemagne'] } }] };
    view.rerender(
      <SWRConfig value={{ provider: () => new Map() }}>
        <ConstraintField fieldName="gdp" typeFamily="NUMBER" displayFormat={null} trackScope={GERMANY} />
      </SWRConfig>,
    );
    await waitFor(() => expect(statsCalls().at(-1)[1].structuredFilters).toEqual(GERMANY));
    expect(track()).toEqual(['100', '103.4']);
  });

  it('falls back to the global bounds when the scope holds no row', async () => {
    renderField({ trackScope: NOWHERE });
    await waitFor(() => expect(statsCalls()).toHaveLength(2));
    await waitFor(() => expect(track()).toEqual(['98', '112.2']));
  });

  it('sends no extra request without trackScope (or with a null one)', async () => {
    renderField({});
    await waitFor(() => expect(track()).toEqual(['98', '112.2']));
    expect(statsCalls()).toHaveLength(1);

    cleanup();
    request.mockClear();
    renderField({ trackScope: null });
    await waitFor(() => expect(track()).toEqual(['98', '112.2']));
    expect(statsCalls()).toHaveLength(1);
  });
});
