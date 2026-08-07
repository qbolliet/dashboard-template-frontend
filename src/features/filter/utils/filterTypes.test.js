import { describe, it, expect } from 'vitest';
import { isNumericSqlType, isDateSqlType, isIntegerSqlType } from './filterTypes';

describe('isNumericSqlType', () => {
  it.each(['integer', 'int', 'int2', 'int4', 'int8', 'smallint', 'bigint', 'serial', 'bigserial'])(
    'is true for the integer sql_type "%s"',
    (t) => expect(isNumericSqlType(t)).toBe(true),
  );

  it.each(['numeric', 'decimal', 'real', 'double precision', 'float', 'float4', 'float8', 'money'])(
    'is true for the float sql_type "%s"',
    (t) => expect(isNumericSqlType(t)).toBe(true),
  );

  it('is case-insensitive and trims whitespace', () => {
    expect(isNumericSqlType('INTEGER')).toBe(true);
    expect(isNumericSqlType('  int4  ')).toBe(true);
  });

  it('is false for date and text sql_types', () => {
    expect(isNumericSqlType('date')).toBe(false);
    expect(isNumericSqlType('text')).toBe(false);
    expect(isNumericSqlType('varchar')).toBe(false);
  });

  it('is false for null/undefined', () => {
    expect(isNumericSqlType(null)).toBe(false);
    expect(isNumericSqlType(undefined)).toBe(false);
  });
});

describe('isIntegerSqlType', () => {
  it('is true only for the integer family, not floats', () => {
    expect(isIntegerSqlType('bigint')).toBe(true);
    expect(isIntegerSqlType('numeric')).toBe(false);
  });
});

describe('isDateSqlType', () => {
  it.each([
    'date', 'timestamp', 'timestamp without time zone', 'timestamp with time zone',
    'timestamptz', 'time', 'time without time zone', 'time with time zone',
  ])('is true for the date/time sql_type "%s"', (t) => expect(isDateSqlType(t)).toBe(true));

  it('is case-insensitive and trims whitespace', () => {
    expect(isDateSqlType('DATE')).toBe(true);
    expect(isDateSqlType('  timestamptz  ')).toBe(true);
  });

  it('is false for numeric and text sql_types', () => {
    expect(isDateSqlType('integer')).toBe(false);
    expect(isDateSqlType('text')).toBe(false);
  });

  it('is false for null/undefined', () => {
    expect(isDateSqlType(null)).toBe(false);
    expect(isDateSqlType(undefined)).toBe(false);
  });
});
