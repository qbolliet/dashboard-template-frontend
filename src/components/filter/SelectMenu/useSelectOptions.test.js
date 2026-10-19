import { describe, it, expect } from 'vitest';
import { mockTransport } from '@/lib/api/transports/mock';
import { treeToGroups } from './useSelectOptions';

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
