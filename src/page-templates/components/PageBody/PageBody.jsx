// Importation des modules
import './PageBody.scss';

/**
 * Centered, width-bounded column used by the content-bearing page templates.
 *
 * Deliberately NOT applied by the catch-all route to every page: the home template
 * is full-bleed (its hero spans the viewport), so the layout is a template's own
 * decision rather than something the route imposes.
 *
 * Server Component. Renders no `<main>`: the catch-all route already provides it.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - Sections of the page, spaced by `--page-gap`.
 * @returns {JSX.Element} The rendered page column.
 */
const PageBody = ({ children }) => (
    <article className="page">{children}</article>
);

export default PageBody;
