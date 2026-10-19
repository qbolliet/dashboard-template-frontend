import { describe, it, expect } from 'vitest';
import operations from '@config/filter/operations.json';
import { MACRO_CATALOG_SCHEMA } from '@/lib/api/fixtures/catalogSchema';
import { defineField } from '@/lib/api/fixtures/metadata';
import {
  isNumericFamily,
  isDateFamily,
  isIntegerFamily,
  resolveOperations,
  resolveOperationLabels,
  defaultValue,
  isComplete,
} from './filterTypes';

// Champ de la fixture macro (contrat 0.3.0 : typeFamily / filterOperations dérivés du sqlType).
const field = (name) => MACRO_CATALOG_SCHEMA.find((f) => f.name === name);
const values = (ops) => ops.map((op) => op.value);

describe('type family predicates', () => {
  it.each([
    ['INTEGER', true, true, false],
    ['NUMBER', false, true, false],
    ['DATE', false, false, true],
    ['TIMESTAMP', false, false, true],
    ['TEXT', false, false, false],
    ['BOOLEAN', false, false, false],
    ['OTHER', false, false, false],
  ])('%s → integer %s, numeric %s, date %s', (family, integer, numeric, date) => {
    expect(isIntegerFamily(family)).toBe(integer);
    expect(isNumericFamily(family)).toBe(numeric);
    expect(isDateFamily(family)).toBe(date);
  });

  it('is false for null/undefined', () => {
    for (const predicate of [isIntegerFamily, isNumericFamily, isDateFamily]) {
      expect(predicate(null)).toBe(false);
      expect(predicate(undefined)).toBe(false);
    }
  });

  it('never interprets the raw SQL type', () => {
    expect(isNumericFamily('DOUBLE')).toBe(false);
    expect(isDateFamily('date')).toBe(false);
  });
});

describe('resolveOperations', () => {
  it('offers the numeric comparisons and BETWEEN for a DOUBLE measure', () => {
    expect(values(resolveOperations(field('gdp')))).toEqual(['EQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN']);
  });

  it('offers the same set for every DuckDB integer type', () => {
    for (const sqlType of ['TINYINT', 'UBIGINT', 'HUGEINT']) {
      expect(values(resolveOperations(defineField({ name: 'n', sqlType }))))
        .toEqual(['EQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN']);
    }
  });

  it('offers BEFORE / AFTER for a DATE', () => {
    expect(values(resolveOperations(field('date_obs')))).toEqual(['EQ', 'BEFORE', 'AFTER', 'BETWEEN']);
  });

  it('routes a TIMESTAMP like a date', () => {
    expect(values(resolveOperations(defineField({ name: 't', sqlType: 'TIMESTAMP WITH TIME ZONE' }))))
      .toEqual(['EQ', 'BEFORE', 'AFTER', 'BETWEEN']);
  });

  it('offers membership first for a categorical column, whatever its type', () => {
    expect(values(resolveOperations(field('country')))).toEqual(['IN', 'NOT_IN', 'EQ']);
  });

  it('offers the text operations for a free-text column', () => {
    expect(values(resolveOperations(field('commentaire')))).toEqual(['EQ', 'CONTAINS', 'STARTS']);
  });

  it('keeps only EQ for a BOOLEAN (no operation of the text widget besides it)', () => {
    expect(values(resolveOperations(defineField({ name: 'b', sqlType: 'BOOLEAN' })))).toEqual(['EQ']);
  });

  it('offers nothing for an OTHER column (value-less operations are not supported yet)', () => {
    expect(resolveOperations(defineField({ name: 'i', sqlType: 'INTERVAL' }))).toEqual([]);
  });

  it('never offers an operation the API does not accept on the column', () => {
    const restricted = { typeFamily: 'NUMBER', isCategorical: false, filterOperations: ['EQ', 'IS_NULL'] };
    expect(values(resolveOperations(restricted))).toEqual(['EQ']);
  });

  it('returns nothing without metadata', () => {
    expect(resolveOperations(null)).toEqual([]);
    expect(resolveOperations({ typeFamily: 'NUMBER' })).toEqual([]);
  });

  it('labels each operation, falling back to the enum value', () => {
    const ops = resolveOperations(field('gdp'), { EQ: '=', BETWEEN: 'Entre' });
    expect(ops[0]).toEqual({ value: 'EQ', label: '=' });
    expect(ops.find((op) => op.value === 'BETWEEN').label).toBe('Entre');
    expect(ops.find((op) => op.value === 'GT').label).toBe('GT');
  });
});

describe('resolveOperationLabels', () => {
  it('flattens localized labels and drops the comment key', () => {
    const labels = resolveOperationLabels(operations, 'en', 'fr');
    expect(labels).not.toHaveProperty('_comment');
    expect(labels.EQ).toBe('=');
    expect(labels.BETWEEN).toBe('Between');
    expect(resolveOperationLabels(operations, 'fr', 'fr').BEFORE).toBe('Avant');
  });

  it('labels every operation the UI can offer', () => {
    const labels = resolveOperationLabels(operations, 'fr', 'fr');
    const offered = new Set(MACRO_CATALOG_SCHEMA.flatMap((f) => values(resolveOperations(f))));
    for (const op of offered) expect(labels).toHaveProperty(op);
  });
});

describe('defaultValue', () => {
  it('seeds a categorical membership with an empty list, an equality with null', () => {
    expect(defaultValue('TEXT', true, 'IN')).toEqual([]);
    expect(defaultValue('TEXT', true, 'NOT_IN')).toEqual([]);
    expect(defaultValue('TEXT', true, 'EQ')).toBeNull();
  });

  it('seeds a numeric BETWEEN with empty bounds, any other numeric with an empty string', () => {
    expect(defaultValue('NUMBER', false, 'BETWEEN')).toEqual({ min: '', max: '' });
    expect(defaultValue('INTEGER', false, 'GT')).toBe('');
  });

  it('seeds dates and text with an empty string', () => {
    expect(defaultValue('DATE', false, 'BETWEEN')).toBe('');
    expect(defaultValue('TEXT', false, 'CONTAINS')).toBe('');
  });
});

describe('isComplete', () => {
  it('requires a non-empty list for a categorical membership', () => {
    expect(isComplete({ isCategorical: true, typeFamily: 'TEXT', operation: 'IN', value: [] })).toBe(false);
    expect(isComplete({ isCategorical: true, typeFamily: 'TEXT', operation: 'IN', value: ['FR'] })).toBe(true);
    expect(isComplete({ isCategorical: true, typeFamily: 'TEXT', operation: 'EQ', value: 'FR' })).toBe(true);
  });

  it('requires both bounds for a numeric BETWEEN', () => {
    expect(isComplete({ typeFamily: 'NUMBER', operation: 'BETWEEN', value: { min: '1', max: '' } })).toBe(false);
    expect(isComplete({ typeFamily: 'NUMBER', operation: 'BETWEEN', value: { min: '1', max: '2' } })).toBe(true);
    expect(isComplete({ typeFamily: 'INTEGER', operation: 'GT', value: '3' })).toBe(true);
  });

  it('requires a full date or date range', () => {
    expect(isComplete({ typeFamily: 'DATE', operation: 'BEFORE', value: '15/03/2024' })).toBe(true);
    expect(isComplete({ typeFamily: 'TIMESTAMP', operation: 'BEFORE', value: '15/03' })).toBe(false);
    expect(isComplete({ typeFamily: 'DATE', operation: 'BETWEEN', value: '01/01/2024 → 31/01/2024' })).toBe(true);
  });

  it('requires a non-blank string for text', () => {
    expect(isComplete({ typeFamily: 'TEXT', operation: 'CONTAINS', value: '  ' })).toBe(false);
    expect(isComplete({ typeFamily: 'TEXT', operation: 'CONTAINS', value: 'PIB' })).toBe(true);
  });
});
