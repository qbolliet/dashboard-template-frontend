import { describe, it, expect, vi } from 'vitest';
import { detectType, coerce } from './typeDetection';
import { typeFromField, resolveColumnType, formatFromFields } from './fieldTypes';

const fields = [
  { name: 'nc8', typeFamily: 'TEXT', isCategorical: true },
  { name: 'insee', typeFamily: 'INTEGER', isCategorical: true },
  { name: 'date', typeFamily: 'DATE', isCategorical: false },
  { name: 'ts', typeFamily: 'TIMESTAMP', isCategorical: false },
  { name: 'qty', typeFamily: 'INTEGER', isCategorical: false },
  { name: 'price', typeFamily: 'NUMBER', isCategorical: false, displayFormat: ',.2f', unit: '€' },
  { name: 'share', typeFamily: 'NUMBER', isCategorical: false, displayFormat: '.0%' },
  { name: 'rate', typeFamily: 'NUMBER', isCategorical: false },
  { name: 'flag', typeFamily: 'BOOLEAN', isCategorical: false },
];

describe('typeFromField', () => {
  it('maps the type families to chart types', () => {
    expect(typeFromField(fields[2])).toBe('date');
    expect(typeFromField(fields[3])).toBe('date');
    expect(typeFromField(fields[4])).toBe('number');
    expect(typeFromField(fields[5])).toBe('number');
  });

  it('keeps text, booleans and categorical codes categorical', () => {
    expect(typeFromField(fields[0])).toBe('categorical');
    expect(typeFromField(fields[1])).toBe('categorical');
    expect(typeFromField(fields[8])).toBe('categorical');
  });
});

describe('resolveColumnType', () => {
  it('does not sample the values of a described column', () => {
    const detect = vi.fn(() => 'number');
    expect(resolveColumnType(fields, 'nc8', detect)).toBe('categorical');
    expect(detect).not.toHaveBeenCalled();
  });

  it('keeps leading-zero codes as strings, where sampling turns them into numbers', () => {
    const codes = ['01012100', '02011000', '03021100'];
    // Le défaut qui motive `fields` : l'échantillonnage prend le code pour un nombre…
    expect(detectType(codes)).toBe('number');
    expect(coerce(codes[0], 'number')).toBe(1012100);
    // … les métadonnées le gardent chaîne, zéros de tête compris.
    const type = resolveColumnType(fields, 'nc8', () => detectType(codes));
    expect(coerce(codes[0], type)).toBe('01012100');
  });

  it('keeps an INSEE code held as an integer categorical', () => {
    const type = resolveColumnType(fields, 'insee', () => detectType(['01001', '01002']));
    expect(coerce('01001', type)).toBe('01001');
  });

  it('samples as before without fields, or for a column they do not describe', () => {
    const detect = vi.fn(() => 'date');
    expect(resolveColumnType(undefined, 'x', detect)).toBe('date');
    expect(resolveColumnType(fields, 'unknown', detect)).toBe('date');
    expect(detect).toHaveBeenCalledTimes(2);
  });
});

describe('formatFromFields', () => {
  const columns = { x: 'qty', y: 'price', z: 'share' };

  it('builds axis formatters from displayFormat and unit', () => {
    const format = formatFromFields(fields, columns, {}, 'fr');
    expect(format.y(1234.5)).toBe('1 234,50 €');
    expect(format.z(0.25)).toBe('25 %');
  });

  it('follows the site locale', () => {
    const format = formatFromFields(fields, columns, {}, 'en');
    expect(format.y(1234.5)).toBe('1,234.50 €');
    expect(format.z(0.25)).toBe('25%');
  });

  it('leaves a column without displayFormat to the default formatter', () => {
    const format = formatFromFields(fields, { x: 'qty', y: 'rate' }, {}, 'fr');
    expect(format.x).toBeUndefined();
    expect(format.y).toBeUndefined();
  });

  it('never overrides a format the caller wrote', () => {
    const own = (v) => `<${v}>`;
    const format = formatFromFields(fields, columns, { y: own, z: '.3f' }, 'fr');
    expect(format.y).toBe(own);
    expect(format.z).toBe('.3f');
  });

  it('leaves dates and categories to their own formatters', () => {
    const withFormat = [{ name: 'date', typeFamily: 'DATE', displayFormat: ',.2f' }, ...fields];
    const format = formatFromFields(withFormat, { x: 'date', y: 'nc8' }, {}, 'fr');
    expect(format.x).toBeUndefined();
    expect(format.y).toBeUndefined();
  });

  it('returns the format untouched without fields', () => {
    const format = { y: '.2f' };
    expect(formatFromFields(undefined, columns, format, 'fr')).toBe(format);
  });
});
