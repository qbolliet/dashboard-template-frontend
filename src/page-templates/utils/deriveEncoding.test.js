import { describe, it, expect } from 'vitest';
import { mockTransport } from '@/lib/api/transports/mock';
import { deriveEncoding } from './deriveEncoding';

// `fields` tels que les renvoie le transport mock pour la page indicateur (panel macro :
// date_obs DATE, country VARCHAR catégoriel, gdp DOUBLE) — la même requête que IndicatorPage.
const fetchFields = async () => {
  const data = await mockTransport({
    operationName: 'GetFactTableWithMetadata',
    variables: { limit: 1, offset: 0, format: 'OBJECTS' },
  });
  return data.getFactTableWithMetadata.fields;
};

describe('deriveEncoding', () => {
  it('encodes the DATE in x, the DOUBLE measure in y and the categorical in hue', async () => {
    const encoding = deriveEncoding(await fetchFields());

    expect(encoding).toMatchObject({ x: 'date_obs', y: 'gdp', hue: 'country', format: { x: '%Y-%m' } });
    expect(encoding.labels).toEqual({
      x: "Date d'observation",
      y: 'Croissance du PIB (%)',
      color: 'Pays',
    });
  });

  it('takes an INTEGER measure in y and a TIMESTAMP in x', () => {
    const encoding = deriveEncoding([
      { name: 'ts', label: 'Horodatage', typeFamily: 'TIMESTAMP', isCategorical: false },
      { name: 'n', label: 'Effectif', typeFamily: 'INTEGER', isCategorical: false },
    ]);

    expect(encoding).toMatchObject({ x: 'ts', y: 'n', hue: undefined });
  });

  it('never takes a categorical numeric code as the measure', () => {
    const encoding = deriveEncoding([
      { name: 'code', label: 'Code', typeFamily: 'INTEGER', isCategorical: true },
    ]);

    expect(encoding.y).toBeUndefined();
    expect(encoding.hue).toBe('code');
  });

  it('leaves y undefined without a continuous measure, so the caller skips the chart', () => {
    expect(deriveEncoding([]).y).toBeUndefined();
  });
});
