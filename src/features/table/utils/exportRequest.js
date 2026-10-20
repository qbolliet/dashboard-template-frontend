// =================================================================
// EXPORT REQUEST — export du jeu filtré complet via GET | POST /api/export
// =================================================================
// L'export client (exporters.js) ne voit que les lignes chargées (une page) ; celui-ci
// délègue à l'API, qui diffuse le jeu filtré en entier depuis DuckDB. Module pur : la
// requête est construite ici, le téléchargement et l'annonce restent à Table.jsx.

// Importation des modules
import { buildExportUrl } from '@/features/table/utils/querySnippets';
import { interpolate } from '@/utils/i18n/interpolate';

// Au-delà, l'URL risque un 431 (Node) ou un refus de l'ingress : on bascule en POST.
export const MAX_GET_URL_LENGTH = 4000;

// Extension du nom de repli, quand Content-Disposition est absent ou illisible.
const EXTENSIONS = { csv: 'csv', parquet: 'parquet', arrow: 'arrows' };

/**
 * Builds the `fetch` arguments of a full-dataset export: a GET (shareable URL) while
 * the URL stays short, a POST with the same parameters as a JSON body beyond
 * `MAX_GET_URL_LENGTH` (large `IN` lists in the FilterNode).
 *
 * @param {Object} vars - Variables object from `buildQueryVariables`.
 * @param {{apiBase?: string}} queryHint - Endpoint hint.
 * @param {'csv'|'parquet'|'arrow'} format - Export format.
 * @param {string[]} fields - Columns to export (the visible ones), in order.
 * @returns {{method: 'GET'|'POST', url: string, init: RequestInit}} Arguments for
 *   `fetch(url, init)`.
 */
export function buildExportRequest(vars, queryHint, format, fields) {
  // Un CSV est ouvert dans Excel : le BOM lui fait lire l'UTF-8
  const bom = format === 'csv';
  const getUrl = buildExportUrl(vars, queryHint, format, { fields, bom });
  if (getUrl.length <= MAX_GET_URL_LENGTH) return { method: 'GET', url: getUrl, init: { method: 'GET' } };

  const body = { format, fields };
  if (vars.catalog != null) body.catalog = vars.catalog;
  if (vars.schema != null) body.schema = vars.schema;
  if (vars.structuredFilters) body.filters = vars.structuredFilters;
  if (vars.sort?.length) body.sort = vars.sort.map(({ field, order }) => `${field}:${order.toLowerCase()}`);
  if (bom) body.bom = true;
  return {
    method: 'POST',
    // Même endpoint sans query string : les paramètres voyagent dans le corps
    url: getUrl.split('?')[0],
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  };
}

/**
 * Extracts the file name from a `Content-Disposition` header (RFC 6266), `filename*`
 * (UTF-8, percent-encoded) taking precedence over the plain `filename`.
 *
 * @param {?string} header - Header value.
 * @returns {?string} The file name, or `null` when absent.
 */
export function filenameFromDisposition(header) {
  if (!header) return null;
  const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (star) {
    try { return decodeURIComponent(star[1].trim()); } catch { /* repli sur filename */ }
  }
  const plain = /filename\s*=\s*(?:"([^"]+)"|([^;]+))/i.exec(header);
  return plain ? (plain[1] ?? plain[2]).trim() : null;
}

/**
 * Error raised by `requestExport`, its `message` being the localized sentence to
 * announce to the user.
 */
export class ExportError extends Error {}

/**
 * Turns a failed export response into the localized sentence for the user:
 * 413 invites to filter, 429 gives the wait, 400 relays the API's `detail`.
 *
 * @param {Response} response - The non-2xx response.
 * @param {Object<string, string>} labels - Table labels (`exportTooLarge`,
 *   `exportRateLimited`, `exportRateLimitedNoDelay`, `exportRejected`, `exportFailed`,
 *   `exportNetworkError`).
 * @returns {Promise<string>} The message.
 */
export async function exportErrorMessage(response, labels) {
  if (response.status === 413) return labels.exportTooLarge;
  if (response.status === 429) {
    const seconds = Number.parseInt(response.headers.get('Retry-After'), 10);
    // Retry-After peut aussi être une date HTTP : sans délai chiffré, message sans durée
    return Number.isFinite(seconds)
      ? interpolate(labels.exportRateLimited, { seconds })
      : labels.exportRateLimitedNoDelay;
  }
  if (response.status === 400) {
    const detail = await response.json().then((b) => b?.detail ?? b?.error, () => null);
    if (detail) return interpolate(labels.exportRejected, { detail });
  }
  return interpolate(labels.exportFailed, { status: response.status });
}

/**
 * Runs an export request and buffers the streamed response into a Blob.
 *
 * @param {{url: string, init: RequestInit}} request - From `buildExportRequest`.
 * @param {Object<string, string>} labels - Table labels, see `exportErrorMessage`.
 * @param {string} fallbackName - File name used when `Content-Disposition` has none.
 * @param {'csv'|'parquet'|'arrow'} format - Export format (extension of the fallback).
 * @param {typeof fetch} [fetchImpl=fetch] - Injectable for tests.
 * @returns {Promise<{blob: Blob, filename: string}>}
 * @throws {ExportError} Non-2xx status or network failure, with a localized message.
 */
export async function requestExport(request, labels, fallbackName, format, fetchImpl = fetch) {
  let response;
  try {
    response = await fetchImpl(request.url, request.init);
  } catch {
    throw new ExportError(labels.exportNetworkError);
  }
  if (!response.ok) throw new ExportError(await exportErrorMessage(response, labels));
  const blob = await response.blob();
  const filename = filenameFromDisposition(response.headers.get('Content-Disposition'))
    ?? `${fallbackName}.${EXTENSIONS[format]}`;
  return { blob, filename };
}
