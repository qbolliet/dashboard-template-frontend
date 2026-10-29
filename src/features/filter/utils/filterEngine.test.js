// @vitest-environment node

// Importation des modules
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildSchema, getVariableValues, parse } from 'graphql';
import { GET_FACT_TABLE_WITH_METADATA } from '@/lib/api/documents';
import { andNodes, buildTree, columnCriteria, scopeWithout, toApiScalar, toFilterNode } from './filterEngine';

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

// =================================================================
// scopeWithout — périmètre d'une carte (les autres critères, la carte valant VRAI)
// =================================================================
describe('scopeWithout', () => {
  // Cartes identifiées, chacune un critère complet et distinct
  const A = (extra = {}) => gdp('GT', '100', { id: 1, ...extra });
  const B = (extra = {}) => country(['France'], { id: 2, ...extra });
  const C = (extra = {}) => gdp('LT', '110', { id: 3, ...extra });
  const D = (extra = {}) => date('AFTER', '01/07/2023', { id: 4, ...extra });
  const E = (extra = {}) => gdp('GTE', '95', { id: 5, ...extra });
  // Feuilles FilterNode attendues (sans connecteur)
  const leafA = { criterion: { variable: 'gdp', operation: 'GT', value: 100 } };
  const leafB = { criterion: { variable: 'country', operation: 'IN', value: ['France'] } };
  const leafC = { criterion: { variable: 'gdp', operation: 'LT', value: 110 } };
  const leafD = { criterion: { variable: 'date_obs', operation: 'AFTER', value: '2023-07-01' } };
  const leafE = { criterion: { variable: 'gdp', operation: 'GTE', value: 95 } };

  it('A AND B: A is bounded by B', () => {
    const scope = scopeWithout([A(), B()], 1);
    expect(scope).toEqual({ children: [leafB] });
    assertNode(scope, true);
  });

  it('A OR B: TRUE OR B = TRUE, no filter', () => {
    expect(scopeWithout([A(), B({ connectorBefore: 'OR' })], 1)).toBeNull();
  });

  it('(A OR B) AND D: A is bounded by D', () => {
    const items = [A({ bracketLeft: true }), B({ connectorBefore: 'OR', bracketRight: true }), D()];
    expect(scopeWithout(items, 1)).toEqual({ children: [leafD] });
  });

  it('A AND B OR D = (A AND B) OR D: A is bounded by B OR D', () => {
    const scope = scopeWithout([A(), B(), D({ connectorBefore: 'OR' })], 1);
    expect(scope).toEqual({ children: [leafB, { connector: 'OR', ...leafD }] });
    assertNode(scope, true);
  });

  it('scopes each card of the same expression by the others', () => {
    // B : (A AND VRAI) OR D = A OR D ; D : (A AND B) OR VRAI = VRAI
    const items = [A(), B(), D({ connectorBefore: 'OR' })];
    expect(scopeWithout(items, 2)).toEqual({ children: [leafA, { connector: 'OR', ...leafD }] });
    expect(scopeWithout(items, 4)).toBeNull();
  });

  it('simplifies nested groups', () => {
    // (A AND (B OR C) AND E) AND D, pour C : (A AND VRAI AND E) AND D = (A AND E) AND D
    const items = [
      A({ bracketLeft: true }),
      B({ bracketLeft: true }),
      C({ connectorBefore: 'OR', bracketRight: true }),
      E({ bracketRight: true }),
      D(),
    ];
    const scope = scopeWithout(items, 3);
    expect(scope).toEqual({
      children: [{ children: [leafA, { connector: 'AND', ...leafE }] }, { connector: 'AND', ...leafD }],
    });
    assertNode(scope, true);
    // Pour A : (VRAI AND (B OR C) AND E) AND D — le groupe interne reste un groupe
    expect(scopeWithout(items, 1)).toEqual({
      children: [
        { children: [{ children: [leafB, { connector: 'OR', ...leafC }] }, { connector: 'AND', ...leafE }] },
        { connector: 'AND', ...leafD },
      ],
    });
  });

  it('unwraps a sub-group reduced to a single term', () => {
    // A AND (B OR C) AND D, pour B : A AND (VRAI OR C) AND D = A AND D
    const items = [A(), B({ bracketLeft: true }), C({ connectorBefore: 'OR', bracketRight: true }), D()];
    expect(scopeWithout(items, 2)).toEqual({ children: [leafA, { connector: 'AND', ...leafD }] });
    // (B AND C) AND D, pour B : C AND D, le groupe (C) déballé
    const grouped = [B({ bracketLeft: true }), C({ bracketRight: true }), D()];
    expect(scopeWithout(grouped, 2)).toEqual({ children: [leafC, { connector: 'AND', ...leafD }] });
  });

  it('ignores an incomplete criterion, as toFilterNode does', () => {
    // A AND B(incomplet) OR D = A OR D → pour A : VRAI OR D = VRAI
    const items = [A(), country([], { id: 2 }), D({ connectorBefore: 'OR' })];
    expect(scopeWithout(items, 1)).toBeNull();
    // A AND B(incomplet) AND D = A AND D → pour D : A
    const anded = [A(), country([], { id: 2 }), D()];
    expect(scopeWithout(anded, 4)).toEqual({ children: [leafA] });
    // A AND B(incomplet) → pour A : aucun autre critère utilisable
    expect(scopeWithout([A(), gdp('GT', '', { id: 2 })], 1)).toBeNull();
  });

  it('returns null for an unbalanced expression', () => {
    expect(scopeWithout([A(), B({ bracketLeft: true })], 1)).toBeNull();
  });

  it('returns null when the excluded card stands alone', () => {
    expect(scopeWithout([A()], 1)).toBeNull();
    expect(scopeWithout([], 1)).toBeNull();
  });

  it('converts dates to ISO in the given order', () => {
    const items = [A(), date('AFTER', '07/01/2023', { id: 4 })];
    expect(scopeWithout(items, 1, { dateOrder: 'MDY' })).toEqual({ children: [leafD] });
    // Dans l'ordre par défaut (DMY), 07/01/2023 est le 7 janvier
    expect(scopeWithout(items, 1).children[0].criterion.value).toBe('2023-01-07');
  });

  it('normalises the output: no connector on the first child of a group', () => {
    // A OR (C AND B) AND D, pour D : A OR (C AND B)
    const items = [A(), C({ connectorBefore: 'OR', bracketLeft: true }), B({ bracketRight: true }), D()];
    const scope = scopeWithout(items, 4);
    expect(scope).toEqual({
      children: [leafA, { connector: 'OR', children: [leafC, { connector: 'AND', ...leafB }] }],
    });
    // Premier critère restant après l'exclusion : son connecteur disparaît
    expect(scopeWithout([D(), A({ connectorBefore: 'AND' })], 4)).toEqual({ children: [leafA] });
  });

  it('gives the most permissive value to a card under a negation', () => {
    // A AND_NOT C, pour C : A AND NOT FAUX = A
    expect(scopeWithout([A(), C({ connectorBefore: 'AND_NOT' })], 3)).toEqual({ children: [leafA] });
    // A AND_NOT (C OR D), pour C : A AND NOT (FAUX OR D) = A AND NOT D
    const items = [
      A(),
      C({ connectorBefore: 'AND_NOT', bracketLeft: true }),
      D({ connectorBefore: 'OR', bracketRight: true }),
    ];
    expect(scopeWithout(items, 3)).toEqual({ children: [leafA, { connector: 'AND', negate: true, ...leafD }] });
  });

  it('carries a negation in `negate`, valid even at the head of a group', () => {
    // C AND_NOT A AND B, pour C : NOT A AND B, ordre d'origine conservé
    const items = [C(), A({ connectorBefore: 'AND_NOT' }), B()];
    expect(scopeWithout(items, 3)).toEqual({
      children: [{ negate: true, ...leafA }, { connector: 'AND', ...leafB }],
    });
    // C AND_NOT A, pour C : NOT A seul
    expect(scopeWithout([C(), A({ connectorBefore: 'AND_NOT' })], 3)).toEqual({
      children: [{ negate: true, ...leafA }],
    });
    // C AND_NOT (A OR B), pour C : NOT (A OR B), un groupe nié
    const grouped = [C(), A({ connectorBefore: 'AND_NOT', bracketLeft: true }), B({ connectorBefore: 'OR', bracketRight: true })];
    expect(scopeWithout(grouped, 3)).toEqual({
      children: [{ negate: true, children: [leafA, { connector: 'OR', ...leafB }] }],
    });
    // A OR_NOT C, pour C : A OR NOT FAUX = VRAI
    expect(scopeWithout([A(), C({ connectorBefore: 'OR_NOT' })], 3)).toBeNull();
  });
});

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

  it('scopeWithout : périmètres valides contre le SDL et acceptés par le mock', async () => {
    const scopes = [
      // A AND (B OR C) AND D, pour D
      scopeWithout([
        gdp('GT', '100', { id: 1 }),
        country(['France'], { id: 2, bracketLeft: true }),
        gdp('LT', '110', { id: 3, connectorBefore: 'OR', bracketRight: true }),
        date('AFTER', '01/07/2023', { id: 4 }),
      ], 4),
      // C AND_NOT A AND B, pour C : NOT A AND B (négation en tête, portée par `negate`)
      scopeWithout([
        gdp('LT', '110', { id: 3 }),
        gdp('GT', '100', { id: 1, connectorBefore: 'AND_NOT' }),
        country(['France'], { id: 2 }),
      ], 3),
    ];
    for (const structuredFilters of scopes) {
      assertNode(structuredFilters, true);
      const { errors } = getVariableValues(schema, operation.variableDefinitions, { structuredFilters });
      expect(errors).toBeUndefined();
      const result = await execute({ structuredFilters });
      expect(result.errors).toBeUndefined();
    }

    // La négation en tête de groupe est appliquée : NOT gdp > 100 AND country IN (France)
    const { data } = await execute({ structuredFilters: scopes[1] });
    const rows = data.getFactTableWithMetadata.data;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.country === 'France' && !(row.gdp > 100))).toBe(true);
  });

  it('le mock rejette un arbre mal formé, comme l\'API', async () => {
    const result = await execute({ structuredFilters: { children: [] } });
    expect(result.errors?.[0].extensions.code).toBe('BAD_USER_INPUT');
  });
});
