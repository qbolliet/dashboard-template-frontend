import { describe, it, expect } from 'vitest';
import {
  normalizeDefaultFilter,
  evalCriterion,
  evalFilterNode,
  collectRefKeys,
  deriveFiltersFromDefault,
} from './defaultFilterEngine';

describe('normalizeDefaultFilter', () => {
  it('returns null for null/undefined input', () => {
    expect(normalizeDefaultFilter(null)).toBeNull();
    expect(normalizeDefaultFilter(undefined)).toBeNull();
  });

  it('unwraps the {tree} shape from MultiCriterionMenu', () => {
    const tree = { type: 'group', children: [] };
    expect(normalizeDefaultFilter({ tree, criteria: [], balanced: true })).toBe(tree);
  });

  it('passes through a raw tree node (group or criterion)', () => {
    const group = { type: 'group', children: [] };
    const criterion = { type: 'criterion', variable: 'age' };
    expect(normalizeDefaultFilter(group)).toBe(group);
    expect(normalizeDefaultFilter(criterion)).toBe(criterion);
  });

  it('passes through a serialized node (enfants/groupe)', () => {
    const serialized = { enfants: [], groupe: 'AND' };
    expect(normalizeDefaultFilter(serialized)).toBe(serialized);
    // `groupe` alone (falsy enfants) still counts, as long as it is non-null.
    expect(normalizeDefaultFilter({ groupe: 'AND' })).toEqual({ groupe: 'AND' });
  });

  it('wraps a flat array of criteria into an implicit AND group', () => {
    const criteria = [{ variable: 'age', operation: 'gt', value: '10' }];
    expect(normalizeDefaultFilter(criteria)).toEqual({ type: 'group', children: criteria });
  });

  it('returns null for an unrecognized shape', () => {
    expect(normalizeDefaultFilter({ foo: 'bar' })).toBeNull();
  });
});

describe('evalCriterion', () => {
  it('ignores (passes) an incomplete criterion — no variable or no operation', () => {
    expect(evalCriterion({ age: 10 }, { variable: null, operation: 'gt', value: '5' })).toBe(true);
    expect(evalCriterion({ age: 10 }, { variable: 'age', operation: null, value: '5' })).toBe(true);
  });

  describe('membership (in/not_in) — type-independent, evaluated before sqlType routing', () => {
    it('treats an empty list as a neutral (always-passing) criterion', () => {
      const leaf = { variable: 'city', operation: 'in', value: [] };
      expect(evalCriterion({ city: 'Paris' }, leaf)).toBe(true);
    });

    it('matches "in" by string-coerced membership', () => {
      const leaf = { variable: 'city', operation: 'in', value: ['Paris', 'Lyon'] };
      expect(evalCriterion({ city: 'Paris' }, leaf)).toBe(true);
      expect(evalCriterion({ city: 'Nice' }, leaf)).toBe(false);
    });

    it('inverts membership for "not_in"', () => {
      const leaf = { variable: 'city', operation: 'not_in', value: ['Paris', 'Lyon'] };
      expect(evalCriterion({ city: 'Paris' }, leaf)).toBe(false);
      expect(evalCriterion({ city: 'Nice' }, leaf)).toBe(true);
    });

    it('coerces numeric cells to string for comparison', () => {
      const leaf = { variable: 'code', operation: 'in', value: ['1', '2'] };
      expect(evalCriterion({ code: 1 }, leaf)).toBe(true);
    });
  });

  describe('numeric sqlType', () => {
    const sqlType = 'integer';

    it('excludes a row whose cell is not numeric (null, empty, non-numeric string)', () => {
      expect(evalCriterion({ age: null }, { variable: 'age', operation: 'eq', value: '10', sqlType })).toBe(false);
      expect(evalCriterion({ age: 'abc' }, { variable: 'age', operation: 'eq', value: '10', sqlType })).toBe(false);
    });

    it('parses French decimal comma cells and target values', () => {
      const leaf = { variable: 'ratio', operation: 'eq', value: '1,5', sqlType: 'numeric' };
      expect(evalCriterion({ ratio: '1,5' }, leaf)).toBe(true);
    });

    it.each([
      ['eq', 10, 10, true],
      ['eq', 10, 11, false],
      ['gt', 11, 10, true],
      ['gt', 10, 10, false],
      ['gte', 10, 10, true],
      ['lt', 9, 10, true],
      ['lt', 10, 10, false],
      ['lte', 10, 10, true],
    ])('%s: cell=%s vs value=%s → %s', (operation, cell, value, expected) => {
      expect(evalCriterion({ age: cell }, { variable: 'age', operation, value: String(value), sqlType })).toBe(expected);
    });

    it('passes (neutral) when the target value cannot be parsed', () => {
      expect(evalCriterion({ age: 10 }, { variable: 'age', operation: 'eq', value: '', sqlType })).toBe(true);
    });

    it('handles "between" with a valid [min, max] object', () => {
      const leaf = { variable: 'age', operation: 'between', value: { min: '10', max: '20' }, sqlType };
      expect(evalCriterion({ age: 15 }, leaf)).toBe(true);
      expect(evalCriterion({ age: 10 }, leaf)).toBe(true);
      expect(evalCriterion({ age: 20 }, leaf)).toBe(true);
      expect(evalCriterion({ age: 21 }, leaf)).toBe(false);
      expect(evalCriterion({ age: 9 }, leaf)).toBe(false);
    });

    it('treats a fully empty "between" (no bound at all) as neutral', () => {
      const leaf = { variable: 'age', operation: 'between', value: { min: '', max: '' }, sqlType };
      expect(evalCriterion({ age: 999 }, leaf)).toBe(true);
    });

    it('treats a "between" with only a min bound as an open-ended lower constraint', () => {
      const leaf = { variable: 'age', operation: 'between', value: { min: '10', max: '' }, sqlType };
      expect(evalCriterion({ age: 999 }, leaf)).toBe(true);
      expect(evalCriterion({ age: 10 }, leaf)).toBe(true);
      expect(evalCriterion({ age: 9 }, leaf)).toBe(false);
    });

    it('treats a "between" with only a max bound as an open-ended upper constraint', () => {
      const leaf = { variable: 'age', operation: 'between', value: { min: '', max: '20' }, sqlType };
      expect(evalCriterion({ age: -999 }, leaf)).toBe(true);
      expect(evalCriterion({ age: 20 }, leaf)).toBe(true);
      expect(evalCriterion({ age: 21 }, leaf)).toBe(false);
    });

    it('excludes the row for an unrecognized operation, rather than letting it pass', () => {
      expect(evalCriterion({ age: 10 }, { variable: 'age', operation: 'nope', value: '10', sqlType })).toBe(false);
    });
  });

  describe('date sqlType', () => {
    const sqlType = 'date';

    it('excludes a row whose cell cannot be parsed as a date', () => {
      const leaf = { variable: 'd', operation: 'eq', value: '01/01/2024', sqlType };
      expect(evalCriterion({ d: 'not-a-date' }, leaf)).toBe(false);
      expect(evalCriterion({ d: null }, leaf)).toBe(false);
    });

    it('accepts ISO and French (DD/MM/YYYY) cell formats interchangeably', () => {
      const leaf = { variable: 'd', operation: 'eq', value: '15/03/2024', sqlType };
      expect(evalCriterion({ d: '2024-03-15' }, leaf)).toBe(true);
    });

    it.each([
      ['eq', '15/03/2024', '15/03/2024', true],
      ['eq', '15/03/2024', '16/03/2024', false],
      ['before', '14/03/2024', '15/03/2024', true],
      ['before', '15/03/2024', '15/03/2024', false],
      ['after', '16/03/2024', '15/03/2024', true],
    ])('%s: cell=%s vs value=%s → %s', (operation, cell, value, expected) => {
      expect(evalCriterion({ d: cell }, { variable: 'd', operation, value, sqlType })).toBe(expected);
    });

    it('handles "between" using the " → " range separator', () => {
      const leaf = { variable: 'd', operation: 'between', value: '01/01/2024 → 31/01/2024', sqlType };
      expect(evalCriterion({ d: '15/01/2024' }, leaf)).toBe(true);
      expect(evalCriterion({ d: '01/02/2024' }, leaf)).toBe(false);
    });

    it('treats an unparsable "between" range as neutral', () => {
      const leaf = { variable: 'd', operation: 'between', value: 'garbage', sqlType };
      expect(evalCriterion({ d: '2024-01-01' }, leaf)).toBe(true);
    });

    it('treats a "between" with only a start date as an open-ended lower constraint', () => {
      const leaf = { variable: 'd', operation: 'between', value: '15/01/2024', sqlType };
      expect(evalCriterion({ d: '2024-06-01' }, leaf)).toBe(true);
      expect(evalCriterion({ d: '2024-01-15' }, leaf)).toBe(true);
      expect(evalCriterion({ d: '2024-01-01' }, leaf)).toBe(false);
    });

    it('treats a "between" with only an end date as an open-ended upper constraint', () => {
      const leaf = { variable: 'd', operation: 'between', value: ' → 15/01/2024', sqlType };
      expect(evalCriterion({ d: '2020-01-01' }, leaf)).toBe(true);
      expect(evalCriterion({ d: '2024-01-15' }, leaf)).toBe(true);
      expect(evalCriterion({ d: '2024-06-01' }, leaf)).toBe(false);
    });

    it('excludes the row for an unrecognized operation, rather than letting it pass', () => {
      expect(evalCriterion({ d: '2024-01-01' }, { variable: 'd', operation: 'nope', value: '01/01/2024', sqlType })).toBe(false);
    });
  });

  describe('categorical', () => {
    it('ignores (passes) an empty or null selection', () => {
      const leaf = { variable: 'status', operation: 'eq', value: null, isCategorical: true };
      expect(evalCriterion({ status: 'active' }, leaf)).toBe(true);
      expect(evalCriterion({ status: 'active' }, { ...leaf, value: '' })).toBe(true);
    });

    it('compares by string equality', () => {
      const leaf = { variable: 'status', operation: 'eq', value: 'active', isCategorical: true };
      expect(evalCriterion({ status: 'active' }, leaf)).toBe(true);
      expect(evalCriterion({ status: 'inactive' }, leaf)).toBe(false);
    });
  });

  describe('text (non-numeric, non-date, non-categorical)', () => {
    it('supports case-insensitive "contains"', () => {
      const leaf = { variable: 'name', operation: 'contains', value: 'ORT', sqlType: 'text' };
      expect(evalCriterion({ name: 'Fort de France' }, leaf)).toBe(true);
      expect(evalCriterion({ name: 'Nice' }, leaf)).toBe(false);
    });

    it('supports case-insensitive "starts"', () => {
      const leaf = { variable: 'name', operation: 'starts', value: 'for', sqlType: 'text' };
      expect(evalCriterion({ name: 'Fort de France' }, leaf)).toBe(true);
      expect(evalCriterion({ name: 'La Fort' }, leaf)).toBe(false);
    });

    it('falls back to string equality for other operations', () => {
      const leaf = { variable: 'name', operation: 'eq', value: 'Nice', sqlType: 'text' };
      expect(evalCriterion({ name: 'Nice' }, leaf)).toBe(true);
      expect(evalCriterion({ name: 'Nice ' }, leaf)).toBe(false);
    });

    it('ignores (passes) an empty target value', () => {
      const leaf = { variable: 'name', operation: 'contains', value: '', sqlType: 'text' };
      expect(evalCriterion({ name: 'anything' }, leaf)).toBe(true);
    });
  });

  describe('generic branch (serialized form, no sqlType)', () => {
    it('reads `valeur` when `value` is absent (serialized leaf shape)', () => {
      const leaf = { variable: 'city', operation: 'eq', valeur: 'Paris' };
      expect(evalCriterion({ city: 'Paris' }, leaf)).toBe(true);
      expect(evalCriterion({ city: 'Lyon' }, leaf)).toBe(false);
    });

    it('ignores (passes) a null/empty value', () => {
      const leaf = { variable: 'city', operation: 'eq', valeur: null };
      expect(evalCriterion({ city: 'Paris' }, leaf)).toBe(true);
    });
  });
});

describe('evalFilterNode', () => {
  it('passes a null/undefined node', () => {
    expect(evalFilterNode({ age: 10 }, null)).toBe(true);
  });

  it('delegates straight to evalCriterion for a leaf', () => {
    const leaf = { variable: 'age', operation: 'gt', value: '5', sqlType: 'integer' };
    expect(evalFilterNode({ age: 10 }, leaf)).toBe(true);
    expect(evalFilterNode({ age: 1 }, leaf)).toBe(false);
  });

  it('passes an empty group', () => {
    expect(evalFilterNode({ age: 10 }, { type: 'group', children: [] })).toBe(true);
  });

  it('combines children left-to-right, AND by default', () => {
    const node = {
      type: 'group',
      children: [
        { variable: 'age', operation: 'gt', value: '5', sqlType: 'integer' },
        { variable: 'age', operation: 'lt', value: '20', sqlType: 'integer' },
      ],
    };
    expect(evalFilterNode({ age: 10 }, node)).toBe(true);
    expect(evalFilterNode({ age: 30 }, node)).toBe(false);
  });

  it('honors an explicit OR connector carried by the child', () => {
    const node = {
      type: 'group',
      children: [
        { variable: 'city', operation: 'eq', value: 'Paris', isCategorical: true },
        { variable: 'city', operation: 'eq', value: 'Lyon', isCategorical: true, connector: 'OR' },
      ],
    };
    expect(evalFilterNode({ city: 'Paris' }, node)).toBe(true);
    expect(evalFilterNode({ city: 'Lyon' }, node)).toBe(true);
    expect(evalFilterNode({ city: 'Nice' }, node)).toBe(false);
  });

  it('reads the French serialized shape (enfants/connecteur)', () => {
    const node = {
      enfants: [
        { variable: 'city', operation: 'eq', valeur: 'Paris' },
        { variable: 'city', operation: 'eq', valeur: 'Lyon', connecteur: 'OR' },
      ],
    };
    expect(evalFilterNode({ city: 'Lyon' }, node)).toBe(true);
    expect(evalFilterNode({ city: 'Nice' }, node)).toBe(false);
  });

  it('supports nested groups', () => {
    const node = {
      type: 'group',
      children: [
        { variable: 'age', operation: 'gt', value: '5', sqlType: 'integer' },
        {
          type: 'group',
          connector: 'AND',
          children: [
            { variable: 'city', operation: 'eq', value: 'Paris', isCategorical: true },
            { variable: 'city', operation: 'eq', value: 'Lyon', isCategorical: true, connector: 'OR' },
          ],
        },
      ],
    };
    expect(evalFilterNode({ age: 10, city: 'Lyon' }, node)).toBe(true);
    expect(evalFilterNode({ age: 1, city: 'Lyon' }, node)).toBe(false);
    expect(evalFilterNode({ age: 10, city: 'Nice' }, node)).toBe(false);
  });
});

describe('collectRefKeys', () => {
  it('returns an empty set for a null node', () => {
    expect(collectRefKeys(null).size).toBe(0);
  });

  it('collects the variable of a single leaf', () => {
    expect(collectRefKeys({ variable: 'age' })).toEqual(new Set(['age']));
  });

  it('recurses through nested groups and dedupes keys', () => {
    const node = {
      type: 'group',
      children: [
        { variable: 'age', operation: 'gt', value: '5' },
        {
          type: 'group',
          children: [
            { variable: 'city', operation: 'eq', value: 'Paris' },
            { variable: 'age', operation: 'lt', value: '99' },
          ],
        },
      ],
    };
    expect(collectRefKeys(node)).toEqual(new Set(['age', 'city']));
  });
});

describe('deriveFiltersFromDefault', () => {
  const columns = [{ key: 'age' }, { key: 'city' }];
  const data = [
    { age: 10, city: 'Paris' },
    { age: 20, city: 'Paris' },
    { age: 30, city: 'Lyon' },
    { age: 40, city: 'Nice' },
  ];

  it('returns all-null selections when there is no default filter', () => {
    expect(deriveFiltersFromDefault(null, data, columns)).toEqual({ age: null, city: null });
  });

  it('derives the distinct values of referenced columns among passing rows', () => {
    const tree = { type: 'group', children: [{ variable: 'city', operation: 'eq', value: 'Paris', isCategorical: true }] };
    const result = deriveFiltersFromDefault(tree, data, columns);
    expect(result.city).toEqual(['Paris']);
    // Unreferenced column stays unfiltered.
    expect(result.age).toBeNull();
  });

  it('seeds null (no-op) when the passing rows already cover every distinct value', () => {
    const tree = { type: 'group', children: [{ variable: 'age', operation: 'gt', value: '0', sqlType: 'integer' }] };
    const result = deriveFiltersFromDefault(tree, data, columns);
    // Every row passes age > 0, so the derived selection equals "all" → null.
    expect(result.age).toBeNull();
  });

  it('excludes null/empty cells from the distinct value count', () => {
    const withHoles = [...data, { age: null, city: '' }];
    const tree = { type: 'group', children: [{ variable: 'city', operation: 'eq', value: 'Paris', isCategorical: true }] };
    const result = deriveFiltersFromDefault(tree, withHoles, columns);
    expect(result.city).toEqual(['Paris']);
  });
});
