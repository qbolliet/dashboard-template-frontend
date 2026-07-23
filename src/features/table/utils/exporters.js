// =================================================================
// EXPORTERS — export CSV, téléchargement de blob, copie presse-papiers
// =================================================================
// Les valeurs exportées sont BRUTES (non formatées par formatCell.js) : un export
// doit rester exploitable en calcul, pas en lecture.

/**
 * Serializes rows to CSV, RFC 4180-style: values containing a quote, comma,
 * newline, or semicolon are quoted and internal quotes doubled.
 *
 * @param {Array<Object>} rows - Data rows (raw, unformatted values).
 * @param {Array<{key: string, label?: string}>} columns - Columns to export,
 *   in order.
 * @returns {string} CSV content (header row + data rows, `\n`-separated).
 */
export function toCsv(rows, columns) {
  const esc = (v) => {
    if (v == null) return '';
    const s = String(v);
    // Échappement RFC 4180 : guillemets doublés si la valeur contient un
    // caractère spécial (guillemet, virgule, saut de ligne, point-virgule).
    if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const head = columns.map((c) => esc(c.label || c.key)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(r[c.key])).join(',')).join('\n');
  return `${head}\n${body}`;
}

/**
 * Triggers a browser download for a text/Blob payload via a transient
 * `<a download>` link. The Object URL is revoked shortly after the click to
 * let the download start.
 *
 * @param {string|Blob} content - File content, or an already-built Blob.
 * @param {string} filename - Suggested download filename.
 * @param {string} mime - MIME type (ignored when `content` is already a Blob).
 * @returns {void}
 */
export function downloadBlob(content, filename, mime) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Copies text to the clipboard, preferring the async Clipboard API and
 * falling back to a hidden `<textarea>` + `execCommand('copy')` for browsers
 * (or contexts) where it's unavailable.
 *
 * @param {string} text - Text to copy.
 * @returns {Promise<void>} Resolves once the copy has been attempted.
 */
export function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch { /* repli silencieux : rien de plus à tenter */ }
  document.body.removeChild(ta);
  return Promise.resolve();
}
