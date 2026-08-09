// Importation des modules
import { interpolateNodes } from '@/utils/i18n/interpolateNodes';
import PageBody from '../PageBody/PageBody';
import PageHeader from '../PageHeader/PageHeader';
import './AboutPage.scss';

/**
 * Page template for `about` nodes: a prose page describing the site.
 *
 * Draws its wording from the manifest (the site title and description, resolved for the
 * current locale by the route, and the node's own `description`) rather than from
 * hardcoded copy, so a third party who renames their site gets a coherent page without
 * editing this file.
 *
 * The prose itself is a single dictionary template rather than JSX split around its
 * `<code>` fragments: split JSX freezes the word order and cannot be translated. See
 * `src/utils/i18n/interpolateNodes.jsx`.
 *
 * Server Component. Renders no `<main>`: the catch-all route already provides it.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.node - Manifest node, with resolved absolute paths.
 * @param {Object} props.labels - `pages` namespace of the dictionary.
 * @param {string} props.siteTitle - Site title, resolved for the current locale.
 * @param {string} props.siteDescription - Site description, resolved for the current locale.
 * @returns {JSX.Element} The rendered about page.
 */
const AboutPage = ({ node, labels, siteTitle, siteDescription }) => (
    <PageBody>
        <PageHeader name={node.name} description={node.description} />

        <section className="about-page__prose">
            <h2>{siteTitle}</h2>
            <p>{siteDescription}</p>

            <h2>{labels.aboutSources}</h2>
            <p>
                {interpolateNodes(labels.aboutProse, {
                    manifest: <code>config/site.config.json</code>,
                    envVar: <code>NEXT_PUBLIC_API_URL</code>,
                })}
            </p>

            {/* Point d'extension : un contenu rédigé plus long a vocation à venir d'un
                fichier de config/content/ (sur le modèle de home.json), pas d'être écrit
                en dur ici — ce gabarit ne fournit que le squelette. */}
        </section>
    </PageBody>
);

export default AboutPage;
