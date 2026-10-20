// @vitest-environment node

// Importation des modules
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildSchema, parse, validate } from 'graphql';
import {
  buildExportUrl, buildQueryDocument, buildQueryVariables, snippetCurl, snippetExport, snippetFetch, snippetPython,
} from './querySnippets';

// =================================================================
// TEST — extraits de requête copiables
// =================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schema = buildSchema(fs.readFileSync(path.join(__dirname, '../../../../scripts/schema.graphql'), 'utf8'));

const columns = [{ key: 'country', typeFamily: 'TEXT' }, { key: 'year', typeFamily: 'INTEGER' }];
const menuNode = { children: [{ criterion: { variable: 'gdp', operation: 'GT', value: 100 } }] };
const hint = { limit: 100, catalog: 'macro', structuredFilters: menuNode, apiBase: 'https://api.test/graphql' };

describe('buildQueryVariables', () => {
  it('builds one FilterNode: the menu filter ANDed with the column IN criteria', () => {
    const vars = buildQueryVariables({ country: ["Côte-d'Or"], year: null }, { key: 'year', dir: 'desc' }, columns, hint);
    expect(vars).toEqual({
      structuredFilters: {
        children: [
          { children: menuNode.children },
          { connector: 'AND', criterion: { variable: 'country', operation: 'IN', value: ["Côte-d'Or"] } },
        ],
      },
      sort: [{ field: 'year', order: 'DESC' }],
      limit: 100,
      catalog: 'macro',
    });
  });

  it('omits structuredFilters when nothing is filtered', () => {
    expect(buildQueryVariables({ country: null }, null, columns, {})).toEqual({ sort: [] });
  });

  it('declares a document valid against the pinned SDL', () => {
    const vars = buildQueryVariables({ year: ['2020'] }, null, columns, hint);
    expect(validate(schema, parse(buildQueryDocument(vars)))).toEqual([]);
    expect(validate(schema, parse(buildQueryDocument({ sort: [] })))).toEqual([]);
  });
});

describe('snippets', () => {
  const vars = buildQueryVariables({ country: ["Côte-d'Or"] }, { key: 'year', dir: 'asc' }, columns, hint);

  it('target the configured endpoint, without any Authorization header', () => {
    for (const snippet of [snippetFetch(vars, hint), snippetPython(vars, hint), snippetCurl(vars, hint)]) {
      expect(snippet).toContain('https://api.test/graphql');
      expect(snippet).not.toMatch(/Authorization|Bearer|API_TOKEN/);
      expect(snippet).not.toContain('[Filter]');
      expect(snippet).toContain('FilterNode');
    }
  });

  it('quote the cURL body for the shell, apostrophes included', () => {
    const body = snippetCurl(vars, hint).split('-d ')[1];
    // Relecture façon shell POSIX : '…' + \' + '…'
    const unquoted = body.slice(1, -1).replace(/'\\''/g, "'");
    expect(JSON.parse(unquoted).variables).toEqual(vars);
  });

  it('build an export URL decoding back to the same FilterNode', () => {
    const url = new URL(buildExportUrl(vars, hint));
    expect(url.origin + url.pathname).toBe('https://api.test/api/export');
    expect(url.searchParams.get('format')).toBe('parquet');
    expect(url.searchParams.get('catalog')).toBe('macro');
    expect(url.searchParams.get('sort')).toBe('year:asc');
    expect(url.searchParams.has('limit')).toBe(false);
    expect(JSON.parse(url.searchParams.get('filters'))).toEqual(vars.structuredFilters);
    expect(snippetExport(vars, hint)).toContain('curl -sS -OJ ');
  });

  it('adds fields and bom to the export URL on request', () => {
    const url = new URL(buildExportUrl(vars, hint, 'csv', { fields: ['country', 'year'], bom: true }));
    expect(url.searchParams.get('fields')).toBe('country,year');
    expect(url.searchParams.get('bom')).toBe('1');
  });
});
