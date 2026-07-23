// Importation des modules
import { highlight } from '../../../utils/querySnippets';
import './TableSnippetReveal.scss';

/**
 * Code-reveal panel shown after a query snippet (JS/PY/cURL) has been copied.
 * Syntax highlighting is produced locally by `highlight()` from a snippet we
 * generated ourselves — the resulting HTML is safe to inject verbatim.
 *
 * @param {object} props
 * @param {{lang: string, code: string}} props.reveal - Copied snippet, shown ~6s.
 * @returns {JSX.Element}
 */
const TableSnippetReveal = ({ reveal }) => (
  <pre className="data-table-snippet">
    <span className="data-table-snippet-lang">{reveal.lang} · copié</span>
    {/* HTML généré localement par highlight() à partir d'un code que nous
        produisons nous-mêmes — aucune entrée utilisateur n'y transite. */}
    <code dangerouslySetInnerHTML={{ __html: highlight(reveal.code, reveal.lang) }} />
  </pre>
);

export default TableSnippetReveal;
