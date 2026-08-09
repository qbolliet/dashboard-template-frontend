// Importation des modules
import './PageHeader.scss';

/**
 * Title block shared by every generated page template.
 *
 * Both the heading and the lead paragraph come straight from the manifest node,
 * so a page's wording is edited in `config/site.config.json` and nowhere else.
 *
 * Server Component: no state, no browser API.
 *
 * @param {Object} props - Component props.
 * @param {string} props.name - Node name, rendered as the page's `<h1>`.
 * @param {string} [props.description] - Node description, rendered as a lead paragraph.
 * @returns {JSX.Element} The rendered page header.
 */
const PageHeader = ({ name, description }) => (
    <hgroup className="page-header">
        <h1 className="page-header__title">{name}</h1>
        {/* Rendu conditionnel : `description` est facultative dans le schéma, et un
            paragraphe vide laisserait un blanc entre le titre et le contenu. */}
        {description && <p className="page-header__lead">{description}</p>}
    </hgroup>
);

export default PageHeader;
