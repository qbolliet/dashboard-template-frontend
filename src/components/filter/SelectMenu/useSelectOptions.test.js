import { createElement } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { mockTransport } from '@/lib/api/transports/mock';
import { getOperationName } from '@/lib/api/documents/gql';
import { request } from '@/lib/api/client';
import { matchesOption, treeToGroups, useSelectOptions } from './useSelectOptions';

// Client espionné : chaque appel est journalisé puis résolu par les fixtures. Le champ
// fictif `big` simule une colonne de 120 valeurs, dont l'API ne renvoie que `limit`.
const BIG = Array.from({ length: 120 }, (_, i) => ({ value: `c${i}`, label: `Valeur ${i}` }));
vi.mock('@/lib/api/client', () => ({
  request: vi.fn((document, variables = {}) => {
    const operationName = getOperationName(document);
    if (variables.fieldName === 'big') {
      const term = (variables.searchTerm ?? '').toLowerCase();
      const matching = BIG.filter((o) => !term || o.label.toLowerCase().includes(term) || o.value.includes(term));
      return Promise.resolve({ getSelectOptions: matching.slice(0, variables.limit) });
    }
    return mockTransport({ operationName, variables });
  }),
}));

// Opérations envoyées pendant le test, dans l'ordre
const calls = () => request.mock.calls.map(([document, variables]) => ({ op: getOperationName(document), variables }));

// Accolades : une fonction RENVOYÉE par beforeEach serait appelée comme nettoyage
beforeEach(() => { request.mockClear(); });

// Cache SWR isolé par test : sans lui, les réponses d'un test fuiraient dans le suivant.
const wrapper = ({ children }) => createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe('treeToGroups', () => {
  it('maps a two-level option tree to SelectMenu groups', async () => {
    const data = await mockTransport({
      operationName: 'GetSelectOptionsTree',
      variables: { fieldName: 'country', maxDepth: 2 },
    });
    const groups = treeToGroups(data.getSelectOptionsTree);

    expect(groups.length).toBeGreaterThan(0);
    for (const { group, options } of groups) {
      expect(group).toEqual({ value: expect.any(String), label: expect.any(String) });
      expect(options.length).toBeGreaterThan(0);
      for (const option of options) expect(Object.keys(option).sort()).toEqual(['label', 'value']);
    }
  });

  it('drops a root without children (a NULL level ends its branch)', () => {
    const tree = [
      { value: 'EU', label: 'Europe', children: [{ value: 'FR', label: 'France' }] },
      { value: 'XX', label: 'Inconnu' },
    ];

    expect(treeToGroups(tree)).toEqual([
      { group: { value: 'EU', label: 'Europe' }, options: [{ value: 'FR', label: 'France' }] },
    ]);
  });

  it('returns no group for a missing tree', () => {
    expect(treeToGroups()).toEqual([]);
  });
});

describe('matchesOption', () => {
  it('matches the code or the label, case-insensitively', () => {
    const option = { value: '01012100', label: 'Chevaux reproducteurs' };
    expect(matchesOption(option, '0101')).toBe(true);
    expect(matchesOption(option, 'CHEVAUX')).toBe(true);
    expect(matchesOption(option, 'ânes')).toBe(false);
    expect(matchesOption(option, '  ')).toBe(true);
  });
});

describe('useSelectOptions', () => {
  it('derives the grouped mode from Metadata.parentName when groupField is absent', async () => {
    const { result } = renderHook(() => useSelectOptions({ fieldName: 'country' }), { wrapper });

    await waitFor(() => expect(result.current.groups.length).toBeGreaterThan(0));
    expect(result.current.grouped).toBe(true);
    expect(result.current.options).toEqual([]);
    expect(result.current.groups).toEqual([{
      group: { value: 'eu', label: 'Union européenne' },
      options: [
        { value: 'France', label: 'France' },
        { value: 'Allemagne', label: 'Allemagne' },
        { value: 'Italie', label: 'Italie' },
      ],
    }]);
  });

  it('lists a country only under its own group, never at the root', async () => {
    const { result } = renderHook(() => useSelectOptions({ fieldName: 'country', groupField: 'region' }), { wrapper });

    await waitFor(() => expect(result.current.groups.length).toBeGreaterThan(0));
    const roots = result.current.groups.map((g) => g.group.value);
    for (const { options } of result.current.groups) {
      for (const { value } of options) expect(roots).not.toContain(value);
    }
  });

  it('searches the tree locally and keeps the ancestor of a matching leaf', async () => {
    const { result } = renderHook(
      () => useSelectOptions({ fieldName: 'country', searchTerm: 'alle' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.groups.length).toBeGreaterThan(0));
    expect(result.current.groups).toEqual([{
      group: { value: 'eu', label: 'Union européenne' },
      options: [{ value: 'Allemagne', label: 'Allemagne' }],
    }]);
    // L'arbre est complet : il est chargé une fois, sans terme, et jamais recherché à l'API
    const trees = calls().filter((c) => c.op === 'GetSelectOptionsTree');
    expect(trees).toHaveLength(1);
    expect(trees[0].variables.searchTerm).toBeUndefined();
  });

  it('skips the schema request when the caller gives the mode', async () => {
    const { result } = renderHook(() => useSelectOptions({ fieldName: 'country', grouped: true }), { wrapper });

    await waitFor(() => expect(result.current.groups.length).toBeGreaterThan(0));
    expect(calls().map((c) => c.op)).toEqual(['GetSelectOptionsTree']);
  });

  it('searches an exhaustive flat list locally, on the code as well as the label', async () => {
    const { result, rerender } = renderHook(
      ({ searchTerm }) => useSelectOptions({ fieldName: 'region', grouped: false, searchTerm }),
      { wrapper, initialProps: { searchTerm: '' } },
    );

    await waitFor(() => expect(result.current.options.length).toBe(4));
    expect(result.current.exhaustive).toBe(true);

    rerender({ searchTerm: 'asia' });
    expect(result.current.options).toEqual([{ value: 'asia', label: 'Asie' }]);
    // Une seule requête : celle de la liste de référence
    expect(calls().filter((c) => c.op === 'GetSelectOptions')).toHaveLength(1);
  });

  it('sends the term to the API when the flat list is truncated', async () => {
    const { result, rerender } = renderHook(
      ({ searchTerm }) => useSelectOptions({ fieldName: 'big', grouped: false, searchTerm }),
      { wrapper, initialProps: { searchTerm: '' } },
    );

    await waitFor(() => expect(result.current.options.length).toBe(50));
    expect(result.current.exhaustive).toBe(false);

    // « 99 » n'est pas dans les 50 premières : seul le serveur peut le trouver
    rerender({ searchTerm: '99' });
    await waitFor(() => expect(result.current.options).toEqual([{ value: 'c99', label: 'Valeur 99' }]));
    const searches = calls().filter((c) => c.op === 'GetSelectOptions');
    expect(searches.map((c) => c.variables.searchTerm)).toEqual(['', '99']);
    expect(searches[0].variables.limit).toBe(51);
  });

  it('returns no group when the search matches nothing', async () => {
    const { result } = renderHook(
      () => useSelectOptions({ fieldName: 'country', searchTerm: 'zzz' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.grouped).toBe(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.groups).toEqual([]);
  });

  it('stays flat for a field without parent', async () => {
    const { result } = renderHook(() => useSelectOptions({ fieldName: 'region' }), { wrapper });

    await waitFor(() => expect(result.current.options.length).toBeGreaterThan(0));
    expect(result.current.grouped).toBe(false);
    expect(result.current.groups).toEqual([]);
    expect(result.current.options[0]).toEqual({ value: 'eu', label: 'Union européenne' });
  });

  it('fetches nothing when disabled', () => {
    const { result } = renderHook(() => useSelectOptions({ fieldName: 'country', enabled: false }), { wrapper });

    expect(result.current).toMatchObject({ options: [], groups: [], loading: false });
  });
});

// Périmètre sur le panel macro : seules les lignes d'Allemagne ont un PIB au-delà de 105,
// celles de France et d'Allemagne au-delà de 102 (fixtures/chartFactTable.js).
const gdpAbove = (min) => ({ children: [{ criterion: { variable: 'gdp', operation: 'GT', value: String(min) } }] });

describe('useSelectOptions — scopeFilters', () => {
  it('sends exactly the same request as before without a scope (flat and tree)', async () => {
    const flat = renderHook(() => useSelectOptions({ fieldName: 'region', grouped: false, scopeFilters: null }), { wrapper });
    const tree = renderHook(() => useSelectOptions({ fieldName: 'country', grouped: true }), { wrapper });

    await waitFor(() => expect(flat.result.current.options.length).toBe(4));
    await waitFor(() => expect(tree.result.current.groups.length).toBe(1));
    // Aucune variable `structuredFilters`, même à undefined : requête inchangée
    expect(calls()).toEqual([
      { op: 'GetSelectOptions', variables: { fieldName: 'region', searchTerm: '', limit: 51, catalog: undefined, schema: undefined } },
      { op: 'GetSelectOptionsTree', variables: { fieldName: 'country', maxDepth: 2, catalog: undefined, schema: undefined } },
    ]);
    expect(calls().every((c) => !('structuredFilters' in c.variables))).toBe(true);
  });

  it('sends the scope as structuredFilters and lists only its values (flat)', async () => {
    const { result } = renderHook(
      () => useSelectOptions({ fieldName: 'country', grouped: false, scopeFilters: gdpAbove(105) }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.options).toEqual([{ value: 'Allemagne', label: 'Allemagne' }]));
    expect(result.current.exhaustive).toBe(true);
    expect(result.current.baseValues).toEqual(new Set(['Allemagne']));
    const [call] = calls();
    expect(call.op).toBe('GetSelectOptions');
    expect(call.variables.structuredFilters).toEqual(gdpAbove(105));
  });

  it('sends the scope as structuredFilters and prunes the tree (grouped)', async () => {
    const { result } = renderHook(
      () => useSelectOptions({ fieldName: 'country', grouped: true, scopeFilters: gdpAbove(105) }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.groups).toEqual([{
      group: { value: 'eu', label: 'Union européenne' },
      options: [{ value: 'Allemagne', label: 'Allemagne' }],
    }]));
    const [call] = calls();
    expect(call.op).toBe('GetSelectOptionsTree');
    expect(call.variables).toEqual({ fieldName: 'country', maxDepth: 2, catalog: undefined, schema: undefined, structuredFilters: gdpAbove(105) });
  });

  it('keys the cache on the scope content, and shares the unscoped entry', async () => {
    const { result, rerender } = renderHook(
      ({ scopeFilters }) => useSelectOptions({ fieldName: 'country', grouped: false, scopeFilters }),
      { wrapper, initialProps: { scopeFilters: undefined } },
    );
    await waitFor(() => expect(result.current.options).toHaveLength(3));

    // Nouveau périmètre : nouvelle clé, nouvelle requête
    rerender({ scopeFilters: gdpAbove(105) });
    await waitFor(() => expect(result.current.options).toEqual([{ value: 'Allemagne', label: 'Allemagne' }]));

    // Même contenu, autre objet : même clé, aucune requête
    rerender({ scopeFilters: gdpAbove(105) });
    // Autre contenu : autre clé
    rerender({ scopeFilters: gdpAbove(102) });
    await waitFor(() => expect(result.current.options.map((o) => o.value)).toEqual(['France', 'Allemagne']));

    // Retour sans périmètre : la clé d'origine, servie par le cache
    rerender({ scopeFilters: null });
    await waitFor(() => expect(result.current.options).toHaveLength(3));

    const sent = calls().filter((c) => c.op === 'GetSelectOptions').map((c) => c.variables.structuredFilters);
    expect(sent).toEqual([undefined, gdpAbove(105), gdpAbove(102)]);
  });

  it('searches inside the scope', async () => {
    const { result, rerender } = renderHook(
      ({ searchTerm }) => useSelectOptions({ fieldName: 'country', grouped: false, scopeFilters: gdpAbove(102), searchTerm }),
      { wrapper, initialProps: { searchTerm: '' } },
    );
    await waitFor(() => expect(result.current.options).toHaveLength(2));

    // Liste exhaustive : recherche locale, dans le périmètre
    rerender({ searchTerm: 'all' });
    expect(result.current.options).toEqual([{ value: 'Allemagne', label: 'Allemagne' }]);
    rerender({ searchTerm: 'ita' });
    expect(result.current.options).toEqual([]);
    expect(calls()).toHaveLength(1);
  });

  it('returns no option for an empty scope, without falling back to the whole column', async () => {
    const { result } = renderHook(
      () => useSelectOptions({ fieldName: 'country', grouped: false, scopeFilters: gdpAbove(1000) }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.options).toEqual([]);
    expect(result.current.baseValues).toEqual(new Set());
    expect(calls()).toHaveLength(1);
  });
});
