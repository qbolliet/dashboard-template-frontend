// Importation des modules
import { highlight } from '@/utils/highlight/highlight';
import { interpolate } from '@/utils/i18n/interpolate';
import './TableSnippetReveal.scss';

// Libellé unique de ce composant : une prop simple suffit, un objet `labels` serait
// une cérémonie inutile pour une seule clé.
const DEFAULT_LABEL = '{lang} · copié';

/**
 * Code-reveal panel shown after a query snippet (JS/PY/cURL) has been copied.
 * Syntax highlighting is produced locally by `highlight()` from a snippet we
 * generated ourselves — the resulting HTML is safe to inject verbatim.
 *
 * @param {object} props
 * @param {{lang: string, code: string}} props.reveal - Copied snippet, shown ~6s.
 * @param {string} [props.label] - Wording template, holding a `{lang}` placeholder.
 * @returns {JSX.Element}
 */
const TableSnippetReveal = ({ reveal, label = DEFAULT_LABEL }) => (
  <pre className="data-table-snippet">
    <span className="data-table-snippet-lang">{interpolate(label, { lang: reveal.lang })}</span>
    {/* HTML généré localement par highlight() à partir d'un code que nous
        produisons nous-mêmes — aucune entrée utilisateur n'y transite. */}
    <code dangerouslySetInnerHTML={{ __html: highlight(reveal.code, reveal.lang) }} />
  </pre>
);

export default TableSnippetReveal;
