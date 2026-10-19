import { createElement } from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { mockTransport } from '@/lib/api/transports/mock';
import { treeToGroups, useSelectOptions } from './useSelectOptions';

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

  it('searches on the server and keeps the ancestor of a matching leaf', async () => {
    const { result } = renderHook(
      () => useSelectOptions({ fieldName: 'country', searchTerm: 'alle' }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.groups.length).toBeGreaterThan(0));
    expect(result.current.groups).toEqual([{
      group: { value: 'eu', label: 'Union européenne' },
      options: [{ value: 'Allemagne', label: 'Allemagne' }],
    }]);
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
