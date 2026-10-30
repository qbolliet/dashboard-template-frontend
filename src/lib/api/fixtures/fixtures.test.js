// Importation des modules
import { describe, expect, it } from 'vitest';
import factTable from './factTable.json';
import { CHART_FACT_TABLE } from './chartFactTable';
import { MACRO_CATALOG_SCHEMA } from './catalogSchema';
import { CATALOGUE_FIELD_STATS, MACRO_FIELD_STATS } from './fieldStats';
import { MOCK_OPTIONS_BY_FIELD, MOCK_OPTIONS_TREES } from './selectOptions';
import { createMockResolvers } from '../transports/mockResolvers';

// =================================================================
// TEST — COHÉRENCE DES FIXTURES (contrat API 0.3.0)
// =================================================================

const resolvers = createMockResolvers({
  catalogueId: 'catalogue',
  factTable,
  CHART_FACT_TABLE,
  MACRO_CATALOG_SCHEMA,
  CATALOGUE_FIELD_STATS,
  MACRO_FIELD_STATS,
  MOCK_OPTIONS_BY_FIELD,
  MOCK_OPTIONS_TREES,
});

const DATASETS = [
  { catalog: 'catalogue', table: factTable, schema: factTable.columnsMetadata, stats: CATALOGUE_FIELD_STATS },
  { catalog: 'macro', table: CHART_FACT_TABLE, schema: MACRO_CATALOG_SCHEMA, stats: MACRO_FIELD_STATS },
];

const DUCKDB_TYPES = ['DOUBLE', 'BIGINT', 'INTEGER', 'DATE', 'VARCHAR', 'BOOLEAN'];
const BOUNDED = ['INTEGER', 'NUMBER', 'DATE', 'TIMESTAMP'];

const minMax = (values) => [values.reduce((a, b) => (b < a ? b : a)), values.reduce((a, b) => (b > a ? b : a))];

describe.each(DATASETS)('fixtures « $catalog »', ({ catalog, table, schema, stats }) => {
  it('porte les métadonnées en camelCase avec des types DuckDB', () => {
    for (const field of schema) {
      expect(DUCKDB_TYPES).toContain(field.sqlType);
      expect(field).not.toHaveProperty('sql_type');
      expect(field).not.toHaveProperty('is_categorical');
      expect(field.filterOperations.length).toBeGreaterThan(0);
    }
  });

  it('aligne fields sur columns, nom pour nom', () => {
    const { columns, fields } = resolvers.getFactTableWithMetadata({ catalog });

    expect(fields.map((f) => f.name)).toEqual(columns);
  });

  it("n'a d'extents que sur les colonnes numériques et les dates, égaux aux bornes des lignes", () => {
    const { fields, metadata } = resolvers.getFactTableWithMetadata({ catalog });
    const bounded = fields.filter((f) => BOUNDED.includes(f.typeFamily)).map((f) => f.name);

    expect(Object.keys(table.metadata.extents).sort()).toEqual([...bounded].sort());
    expect(metadata.extents).toEqual(table.metadata.extents);
  });

  it('a des FieldStats égaux à ceux des lignes sur chaque colonne présente', () => {
    for (const column of table.columns) {
      const values = table.data.map((row) => row[column]);
      const [min, max] = minMax(values);

      expect(stats[column], column).toEqual({ min, max, distinctCount: new Set(values).size, nullCount: 0 });
    }
  });

  it('a des FieldStats pour chaque champ du schéma, bornés en nombre ou date ISO hors texte', () => {
    for (const field of schema) {
      expect(stats[field.name], field.name).toBeDefined();
      if (BOUNDED.includes(field.typeFamily)) {
        expect(typeof stats[field.name].min).toBe(field.typeFamily === 'DATE' ? 'string' : 'number');
      }
    }
  });
});

describe('colonnes de libellés et hiérarchie du panel macro', () => {
  const byName = Object.fromEntries(MACRO_CATALOG_SCHEMA.map((f) => [f.name, f]));

  it('relie labelFor et labelFields dans les deux sens', () => {
    for (const field of MACRO_CATALOG_SCHEMA) {
      for (const label of field.labelFields) expect(byName[label].labelFor).toBe(field.name);
      if (field.labelFor) expect(byName[field.labelFor].labelFields).toContain(field.name);
    }
  });

  it('a une hiérarchie à 2 niveaux : country descend de region', () => {
    expect(byName.country.parentName).toBe('region');
    expect(byName.region.parentName).toBeNull();
  });

  it('renvoie des options dont les statistiques décrivent le jeu de valeurs', () => {
    for (const field of Object.keys(MOCK_OPTIONS_BY_FIELD)) {
      const values = MOCK_OPTIONS_BY_FIELD[field].map((o) => o.value);
      const [min, max] = minMax(values);

      expect(MACRO_FIELD_STATS[field], field).toMatchObject({ min, max, distinctCount: values.length });
    }
  });
});

describe('résolveurs mock', () => {
  it('getSelectOptionsTree : arbre de 2 niveaux, libellé lu dans la colonne de libellés du niveau', () => {
    expect(resolvers.getSelectOptionsTree({ fieldName: 'country' })).toEqual([
      {
        value: 'eu',
        label: 'Union européenne',
        children: [
          { value: 'France', label: 'France' },
          { value: 'Allemagne', label: 'Allemagne' },
          { value: 'Italie', label: 'Italie' },
        ],
      },
    ]);
  });

  it('getSelectOptionsTree : maxDepth 1 ne garde que les feuilles', () => {
    const tree = resolvers.getSelectOptionsTree({ fieldName: 'country', maxDepth: 1 });

    expect(tree.map((n) => n.value)).toEqual(['France', 'Allemagne', 'Italie']);
    expect(tree.every((n) => !('children' in n))).toBe(true);
  });

  it('getSelectOptionsTree : searchTerm élague les branches sans feuille correspondante', () => {
    expect(resolvers.getSelectOptionsTree({ fieldName: 'country', searchTerm: 'ALLE' })).toEqual([
      { value: 'eu', label: 'Union européenne', children: [{ value: 'Allemagne', label: 'Allemagne' }] },
    ]);
    expect(resolvers.getSelectOptionsTree({ fieldName: 'country', searchTerm: 'zzz' })).toEqual([]);
  });

  it('getSelectOptions / getSelectOptionsTree : structuredFilters ne garde que les valeurs des lignes retenues', () => {
    // Seules les lignes d'Allemagne ont un PIB au-delà de 105
    const gdpAbove105 = { children: [{ criterion: { variable: 'gdp', operation: 'GT', value: '105' } }] };

    expect(resolvers.getSelectOptions({ fieldName: 'country', structuredFilters: gdpAbove105 }))
      .toEqual([{ value: 'Allemagne', label: 'Allemagne' }]);
    expect(resolvers.getSelectOptionsTree({ fieldName: 'country', structuredFilters: gdpAbove105 })).toEqual([
      { value: 'eu', label: 'Union européenne', children: [{ value: 'Allemagne', label: 'Allemagne' }] },
    ]);
    // Le filtre s'applique AVANT la recherche : rien ne reste
    expect(resolvers.getSelectOptions({ fieldName: 'country', searchTerm: 'fr', structuredFilters: gdpAbove105 })).toEqual([]);
    // Catalogue documentaire : options dérivées des lignes, filtrées de même
    const bce = { children: [{ criterion: { variable: 'source', operation: 'EQ', value: 'BCE' } }] };
    expect(resolvers.getSelectOptions({ catalog: 'catalogue', fieldName: 'sector', structuredFilters: bce }))
      .toEqual([{ value: 'Finance', label: 'Finance' }]);
  });

  it('getSelectOptions : structuredFilters est validé comme sur getFieldStats', () => {
    const unknown = { children: [{ criterion: { variable: 'nope', operation: 'EQ', value: 'x' } }] };
    expect(() => resolvers.getSelectOptions({ fieldName: 'country', structuredFilters: unknown }))
      .toThrow(expect.objectContaining({ code: 'BAD_USER_INPUT' }));
    expect(() => resolvers.getSelectOptionsTree({ fieldName: 'country', structuredFilters: { children: [] } }))
      .toThrow(expect.objectContaining({ code: 'BAD_USER_INPUT' }));
  });

  it('getSelectOptionsTree : une colonne sans hiérarchie donne un arbre à un niveau', () => {
    const tree = resolvers.getSelectOptionsTree({ fieldName: 'sector' });

    expect(tree).toHaveLength(5);
    expect(tree.every((n) => n.value === n.label && !('children' in n))).toBe(true);
  });

  it('getSelectOptions : libellé issu de la colonne de libellés, recherche sur code OU libellé', () => {
    expect(resolvers.getSelectOptions({ fieldName: 'region', searchTerm: 'union' })).toEqual([
      { value: 'eu', label: 'Union européenne' },
    ]);
    expect(resolvers.getSelectOptions({ fieldName: 'region', searchTerm: 'asia' })).toEqual([
      { value: 'asia', label: 'Asie' },
    ]);
  });

  it('getFieldStats : sans filtre, stats globales ; avec filtre, stats du jeu retenu', () => {
    expect(resolvers.getFieldStats({ fieldName: 'gdp' })).toEqual(MACRO_FIELD_STATS.gdp);

    const filtered = resolvers.getFieldStats({
      fieldName: 'gdp',
      structuredFilters: {
        children: [{ criterion: { variable: 'country', operation: 'EQ', value: 'France' } }],
      },
    });
    const france = CHART_FACT_TABLE.data.filter((row) => row.country === 'France').map((row) => row.gdp);

    expect(filtered).toEqual({
      min: Math.min(...france),
      max: Math.max(...france),
      distinctCount: new Set(france).size,
      nullCount: 0,
    });
    expect(filtered.max).toBeLessThan(MACRO_FIELD_STATS.gdp.max);
  });

  it('getFieldStats : un filtre mal formé est refusé, une colonne hors des lignes garde ses stats', () => {
    expect(() => resolvers.getFieldStats({ fieldName: 'gdp', structuredFilters: { criterion: {} } })).toThrow();
    expect(resolvers.getFieldStats({
      fieldName: 'inflation',
      structuredFilters: { children: [{ criterion: { variable: 'country', operation: 'EQ', value: 'France' } }] },
    })).toEqual(MACRO_FIELD_STATS.inflation);
  });

  it("rejette une colonne inconnue et une colonne de libellés qui n'en est pas une", () => {
    expect(() => resolvers.getFieldStats({ fieldName: 'nope' })).toThrow(/inconnue/);
    expect(() => resolvers.getSelectOptions({ fieldName: 'sector', labelField: 'region_label' })).toThrow();
  });

  it('getFactTableWithMetadata : pagination, tri et format ARRAYS', () => {
    const page = resolvers.getFactTableWithMetadata({
      catalog: 'catalogue', limit: 3, offset: 3, sort: [{ field: 'id', order: 'DESC' }], format: 'ARRAYS',
    });

    expect(page.data.map((row) => row[0])).toEqual([17, 16, 15]);
    expect(page.metadata).toMatchObject({ count: 3, total: 20, hasNextPage: true, currentPage: 2, totalPages: 7 });
  });
});
