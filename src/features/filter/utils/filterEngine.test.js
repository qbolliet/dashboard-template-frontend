// @vitest-environment node

// Importation des modules
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildSchema, getVariableValues, parse } from 'graphql';
import { GET_FACT_TABLE_WITH_METADATA } from '@/lib/api/documents';
import { andNodes, buildTree, columnCriteria, toApiScalar, toFilterNode } from './filterEngine';

// =================================================================
// TEST — buildTree → FilterNode (structuredFilters de l'API)
// =================================================================
// Deux niveaux : la forme produite (mapping, omission des critères incomplets,
// conversion des valeurs), puis le CONTRAT — chaque sortie valide contre le SDL
// épinglé (scripts/schema.graphql) et s'exécute contre le serveur mock.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Critère de carte, complété des champs par défaut d'une carte de MultiCriterionMenu.
const card = (c) => ({ bracketLeft: false, bracketRight: false, connectorBefore: 'AND', ...c });

// Raccourcis de critères complets.
const country = (value, extra = {}) => card({
  variable: 'country', operation: 'IN', value, typeFamily: 'TEXT', isCategorical: true, ...extra,
});
const gdp = (operation, value, extra = {}) => card({
  variable: 'gdp', operation, value, typeFamily: 'NUMBER', isCategorical: false, ...extra,
});
const date = (operation, value, extra = {}) => card({
  variable: 'date_obs', operation, value, typeFamily: 'DATE', isCategorical: false, ...extra,
});

// Arbre du menu → FilterNode, comme le fait IndicatorExplorer.
const convert = (items, options = {}) => {
  const { tree, balanced } = buildTree(items);
  return toFilterNode(tree, { balanced, ...options });
};

// =================================================================
// Contrôle structurel : ce que le SDL ne sait pas exprimer
// =================================================================
const assertNode = (node, isRoot = false) => {
  const hasCriterion = 'criterion' in node;
  const hasChildren = 'children' in node;
  expect(hasCriterion !== hasChildren).toBe(true);
  if (isRoot) {
    expect(hasChildren).toBe(true);
    expect(node.connector).toBeUndefined();
  }
  if (hasChildren) {
    expect(node.children.length).toBeGreaterThan(0);
    node.children.forEach((child) => assertNode(child));
    return;
  }
  const { operation, value } = node.criterion;
  expect(JSON.stringify(value)).not.toContain('?');
  if (operation === 'IN' || operation === 'NOT_IN') {
    expect(Array.isArray(value) && value.length > 0).toBe(true);
  }
  if (operation === 'BETWEEN') expect(Object.keys(value).sort()).toEqual(['max', 'min']);
};

describe('toFilterNode — mapping', () => {
  it('returns null for an empty tree, a null tree or an unbalanced expression', () => {
    expect(toFilterNode(null)).toBeNull();
    expect(convert([])).toBeNull();
    expect(convert([country(['France'], { bracketLeft: true })])).toBeNull();
  });

  it('maps a flat AND/OR expression, connectors carried by each node', () => {
    const node = convert([
      country(['France']),
      gdp('GT', '100', { connectorBefore: 'OR' }),
      gdp('LT', '110', { connectorBefore: 'AND' }),
    ]);
    expect(node).toEqual({
      children: [
        { criterion: { variable: 'country', operation: 'IN', value: ['France'] } },
        { connector: 'OR', criterion: { variable: 'gdp', operation: 'GT', value: 100 } },
        { connector: 'AND', criterion: { variable: 'gdp', operation: 'LT', value: 110 } },
      ],
    });
  });

  it('keeps sub-groups, the connector moving from the first criterion to the group', () => {
    const node = convert([
      country(['France']),
      gdp('GT', '100', { connectorBefore: 'AND', bracketLeft: true }),
      gdp('LT', '99', { connectorBefore: 'OR', bracketRight: true }),
    ]);
    expect(node).toEqual({
      children: [
        { criterion: { variable: 'country', operation: 'IN', value: ['France'] } },
        {
          connector: 'AND',
          children: [
            { criterion: { variable: 'gdp', operation: 'GT', value: 100 } },
            { connector: 'OR', criterion: { variable: 'gdp', operation: 'LT', value: 99 } },
          ],
        },
      ],
    });
  });

  it('omits an incomplete criterion together with its own connector', () => {
    // A AND B(incomplet) OR C → A OR C
    const node = convert([
      country(['France']),
      gdp('GT', '', { connectorBefore: 'AND' }),
      gdp('LT', '99', { connectorBefore: 'OR' }),
    ]);
    expect(node.children).toHaveLength(2);
    expect(node.children[1].connector).toBe('OR');
  });

  it('omits criteria without variable or operation, and an empty IN list', () => {
    expect(convert([card({ variable: null, operation: null, value: null })])).toBeNull();
    expect(convert([card({ variable: 'gdp', operation: null, value: '', typeFamily: 'NUMBER' })])).toBeNull();
    expect(convert([country([])])).toBeNull();
  });

  it('removes a group left empty by omitted criteria', () => {
    const node = convert([
      country(['France']),
      gdp('GT', '', { bracketLeft: true }),
      gdp('LT', '', { connectorBefore: 'OR', bracketRight: true }),
    ]);
    expect(node).toEqual({
      children: [{ criterion: { variable: 'country', operation: 'IN', value: ['France'] } }],
    });
  });

  it('converts dates to ISO 8601, in the order they were typed in', () => {
    expect(convert([date('BEFORE', '03/04/2024')]).children[0].criterion.value).toBe('2024-04-03');
    expect(convert([date('BEFORE', '03/04/2024')], { dateOrder: 'MDY' }).children[0].criterion.value)
      .toBe('2024-03-04');
    // Date inexistante → critère omis plutôt qu'envoyé
    expect(convert([date('BEFORE', '31/02/2024')])).toBeNull();
  });

  it('converts ranges to {min, max}', () => {
    expect(convert([gdp('BETWEEN', { min: '99,5', max: '105' })]).children[0].criterion.value)
      .toEqual({ min: 99.5, max: 105 });
    expect(convert([date('BETWEEN', '01/01/2023 → 31/12/2023')]).children[0].criterion.value)
      .toEqual({ min: '2023-01-01', max: '2023-12-31' });
    // Une borne manquante → incomplet → omis
    expect(convert([gdp('BETWEEN', { min: '1', max: '' })])).toBeNull();
  });

  it('types IN values after the column family, big integers as strings', () => {
    const item = card({ variable: 'year', operation: 'IN', value: ['2020', '2021'], typeFamily: 'INTEGER', isCategorical: true });
    expect(convert([item]).children[0].criterion.value).toEqual([2020, 2021]);
    expect(toApiScalar('9007199254740993', 'INTEGER')).toBe('9007199254740993');
    expect(toApiScalar('12', 'TEXT')).toBe('12');
  });
});

describe('columnCriteria / andNodes', () => {
  const columns = [{ key: 'country', typeFamily: 'TEXT' }, { key: 'year', typeFamily: 'INTEGER' }];

  it('turns non-empty selections into typed IN leaves', () => {
    expect(columnCriteria({ country: null, year: ['2020'] }, columns)).toEqual([
      { connector: 'AND', criterion: { variable: 'year', operation: 'IN', value: [2020] } },
    ]);
    expect(columnCriteria({ country: [] }, columns)).toEqual([]);
  });

  it('ANDs leaves onto a root kept as a sub-group', () => {
    const menu = convert([country(['France']), gdp('GT', '1', { connectorBefore: 'OR' })]);
    const leaves = columnCriteria({ year: ['2020'] }, columns);
    expect(andNodes(menu, leaves)).toEqual({ children: [{ children: menu.children }, ...leaves] });
    expect(andNodes(menu, [])).toBe(menu);
    expect(andNodes(null, [])).toBeNull();
    // Sans filtre amont, le premier critère ne porte pas de connecteur
    expect(andNodes(null, leaves).children[0].connector).toBeUndefined();
  });
});

// =================================================================
// Contrat — validation contre le SDL épinglé, exécution contre le mock
// =================================================================
const FIXTURES = {
  'IN': [country(['France'])],
  'AND/OR': [country(['France']), gdp('GT', '100', { connectorBefore: 'OR' }), gdp('LT', '110')],
  'sous-groupe': [
    country(['France']),
    gdp('GT', '100', { bracketLeft: true }),
    gdp('LT', '99', { connectorBefore: 'OR', bracketRight: true }),
  ],
  'dates': [date('AFTER', '01/06/2023'), date('BETWEEN', '01/01/2023 → 31/12/2023', { connectorBefore: 'OR' })],
  'plages': [gdp('BETWEEN', { min: '99', max: '105' })],
  'incomplet omis': [country(['Italie']), gdp('GT', '', { connectorBefore: 'OR' })],
};

describe('toFilterNode — contrat de l\'API', () => {
  const schema = buildSchema(fs.readFileSync(path.join(__dirname, '../../../../scripts/schema.graphql'), 'utf8'));
  const operation = parse(GET_FACT_TABLE_WITH_METADATA).definitions[0];
  let yoga;

  beforeAll(async () => {
    const { createMockYoga } = require('../../../../scripts/mock-api-server.js');
    yoga = await createMockYoga();
  });

  const execute = async (variables) => {
    const response = await yoga.fetch('http://mock.local/graphql', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: GET_FACT_TABLE_WITH_METADATA, variables }),
    });
    return response.json();
  };

  for (const [name, items] of Object.entries(FIXTURES)) {
    it(`${name} : variables valides contre le SDL et acceptées par le mock`, async () => {
      const structuredFilters = convert(items);
      assertNode(structuredFilters, true);

      const { errors } = getVariableValues(schema, operation.variableDefinitions, { structuredFilters });
      expect(errors).toBeUndefined();

      const result = await execute({ structuredFilters });
      expect(result.errors).toBeUndefined();
    });
  }

  it('country IN (France) change le total', async () => {
    const all = await execute({});
    const france = await execute({ structuredFilters: convert(FIXTURES.IN) });
    const total = all.data.getFactTableWithMetadata.metadata.total;
    const filtered = france.data.getFactTableWithMetadata;

    expect(filtered.metadata.total).toBeGreaterThan(0);
    expect(filtered.metadata.total).toBeLessThan(total);
    expect(filtered.data.every((row) => row.country === 'France')).toBe(true);
  });

  it('le mock rejette un arbre mal formé, comme l\'API', async () => {
    const result = await execute({ structuredFilters: { children: [] } });
    expect(result.errors?.[0].extensions.code).toBe('BAD_USER_INPUT');
  });
});
