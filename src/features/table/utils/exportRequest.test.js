// @vitest-environment node

// Importation des modules
import { describe, expect, it, vi } from 'vitest';
import {
  buildExportRequest, exportErrorMessage, ExportError, filenameFromDisposition, MAX_GET_URL_LENGTH, requestExport,
} from './exportRequest';

// =================================================================
// TEST — export du jeu filtré complet via /api/export
// =================================================================

const hint = { apiBase: 'https://api.test/graphql' };
const fields = ['country', 'year'];
const node = { children: [{ criterion: { variable: 'country', operation: 'IN', value: ['France'] } }] };
const vars = { structuredFilters: node, sort: [{ field: 'year', order: 'DESC' }], catalog: 'macro', schema: 'main' };

const labels = {
  exportTooLarge: 'trop gros',
  exportRateLimited: 'attendre {seconds} s',
  exportRateLimitedNoDelay: 'attendre',
  exportRejected: 'refusé : {detail}',
  exportFailed: 'échec {status}',
  exportNetworkError: 'réseau',
};

const response = (status, { headers = {}, body = '' } = {}) => new Response(body, { status, headers });

describe('buildExportRequest', () => {
  it('uses a GET carrying fields, FilterNode, sort and the CSV BOM while the URL is short', () => {
    const { method, url, init } = buildExportRequest(vars, hint, 'csv', fields);
    expect(method).toBe('GET');
    expect(init).toEqual({ method: 'GET' });
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://api.test/api/export');
    expect(u.searchParams.get('format')).toBe('csv');
    expect(u.searchParams.get('fields')).toBe('country,year');
    expect(u.searchParams.get('sort')).toBe('year:desc');
    expect(u.searchParams.get('bom')).toBe('1');
    expect(u.searchParams.get('catalog')).toBe('macro');
    expect(u.searchParams.get('schema')).toBe('main');
    expect(JSON.parse(u.searchParams.get('filters'))).toEqual(node);
    expect(u.searchParams.has('limit')).toBe(false);
  });

  it('asks no BOM for Parquet', () => {
    const { url } = buildExportRequest(vars, hint, 'parquet', fields);
    expect(new URL(url).searchParams.has('bom')).toBe(false);
  });

  it('switches to a POST with a JSON body once the GET URL exceeds the limit', () => {
    const big = { children: [{ criterion: { variable: 'country', operation: 'IN', value: Array.from({ length: 800 }, (_, i) => `pays-${i}-xxxxxxxxxxxx`) } }] };
    const { method, url, init } = buildExportRequest({ ...vars, structuredFilters: big }, hint, 'csv', fields);
    expect(method).toBe('POST');
    expect(url).toBe('https://api.test/api/export');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(init.body)).toEqual({
      format: 'csv', fields, catalog: 'macro', schema: 'main', filters: big, sort: ['year:desc'], bom: true,
    });
  });

  it('stays on GET right at the limit and omits absent parameters from a POST body', () => {
    const noFilter = { sort: [] };
    const { method, url } = buildExportRequest(noFilter, hint, 'parquet', fields);
    expect(method).toBe('GET');
    expect(url.length).toBeLessThanOrEqual(MAX_GET_URL_LENGTH);
    const manyFields = Array.from({ length: 400 }, (_, i) => `column_${i}_long_name`);
    const post = buildExportRequest(noFilter, hint, 'parquet', manyFields);
    expect(post.method).toBe('POST');
    expect(JSON.parse(post.init.body)).toEqual({ format: 'parquet', fields: manyFields });
  });
});

describe('filenameFromDisposition', () => {
  it('reads quoted, bare and RFC 5987 file names, the latter taking precedence', () => {
    expect(filenameFromDisposition('attachment; filename="a b.csv"')).toBe('a b.csv');
    expect(filenameFromDisposition('attachment; filename=data.parquet')).toBe('data.parquet');
    expect(filenameFromDisposition("attachment; filename=\"x.csv\"; filename*=UTF-8''%C3%A9t%C3%A9.csv")).toBe('été.csv');
  });

  it('returns null without a usable header', () => {
    expect(filenameFromDisposition(null)).toBeNull();
    expect(filenameFromDisposition('attachment')).toBeNull();
  });
});

describe('exportErrorMessage', () => {
  it('invites to filter on 413', async () => {
    expect(await exportErrorMessage(response(413), labels)).toBe('trop gros');
  });

  it('reads Retry-After on 429, with or without a numeric delay', async () => {
    expect(await exportErrorMessage(response(429, { headers: { 'Retry-After': '7' } }), labels)).toBe('attendre 7 s');
    expect(await exportErrorMessage(response(429, { headers: { 'Retry-After': 'Wed, 21 Oct 2026 07:28:00 GMT' } }), labels)).toBe('attendre');
    expect(await exportErrorMessage(response(429), labels)).toBe('attendre');
  });

  it('relays the API detail on 400, falling back on the generic message', async () => {
    const body = JSON.stringify({ error: 'BAD_REQUEST', detail: 'Unknown field "foo"' });
    expect(await exportErrorMessage(response(400, { body }), labels)).toBe('refusé : Unknown field "foo"');
    expect(await exportErrorMessage(response(400, { body: 'not json' }), labels)).toBe('échec 400');
  });

  it('uses the generic message for any other status', async () => {
    expect(await exportErrorMessage(response(500), labels)).toBe('échec 500');
  });
});

describe('requestExport', () => {
  const request = { url: 'https://api.test/api/export?format=parquet', init: { method: 'GET' } };

  it('returns the blob and the server-provided file name', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      response(200, { headers: { 'Content-Disposition': 'attachment; filename="export-macro.parquet"' }, body: 'PAR1' }),
    );
    const { blob, filename } = await requestExport(request, labels, 'table', 'parquet', fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith(request.url, request.init);
    expect(filename).toBe('export-macro.parquet');
    expect(await blob.text()).toBe('PAR1');
  });

  it('falls back on the table slug when Content-Disposition is missing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(200, { body: 'a,b' }));
    expect((await requestExport(request, labels, 'pib', 'csv', fetchImpl)).filename).toBe('pib.csv');
  });

  it('throws an ExportError carrying the localized message on an error status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(response(413));
    const err = await requestExport(request, labels, 'table', 'csv', fetchImpl).catch((e) => e);
    expect(err).toBeInstanceOf(ExportError);
    expect(err.message).toBe('trop gros');
  });

  it('turns a network failure into an ExportError', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const err = await requestExport(request, labels, 'table', 'csv', fetchImpl).catch((e) => e);
    expect(err).toBeInstanceOf(ExportError);
    expect(err.message).toBe('réseau');
  });
});
