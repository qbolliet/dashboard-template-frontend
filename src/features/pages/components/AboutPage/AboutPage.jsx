// Importation des modules
import siteConfig from '@config/site.config.json';
import PageBody from '../PageBody/PageBody';
import PageHeader from '../PageHeader/PageHeader';
import './AboutPage.scss';

/**
 * Page template for `about` nodes: a prose page describing the site.
 *
 * Draws its wording from the manifest (`site.title`, `site.description` and the
 * node's own `description`) rather than from hardcoded copy, so a third party who
 * renames their site gets a coherent page without editing this file.
 *
 * Server Component. Renders no `<main>`: the catch-all route already provides it.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.node - Manifest node, with resolved absolute paths.
 * @returns {JSX.Element} The rendered about page.
 */
const AboutPage = ({ node }) => (
    <PageBody>
        <PageHeader name={node.name} description={node.description} />

        <section className="about-page__prose">
            <h2>{siteConfig.site.title}</h2>
            <p>{siteConfig.site.description}</p>

            <h2>Sources des données</h2>
            <p>
                Les pages de ce site sont générées à partir du manifeste
                <code> config/site.config.json</code> : chaque entrée de la navigation y
                déclare son chemin, son libellé et son type de page. Les données affichées
                proviennent de l&apos;API GraphQL configurée par
                <code> NEXT_PUBLIC_API_URL</code> ; en son absence, le template sert des
                jeux de démonstration locaux.
            </p>

            {/* Point d'extension : un contenu rédigé plus long a vocation à venir d'un
                fichier de config/content/ (sur le modèle de home.json), pas d'être écrit
                en dur ici — ce gabarit ne fournit que le squelette. */}
        </section>
    </PageBody>
);

export default AboutPage;
