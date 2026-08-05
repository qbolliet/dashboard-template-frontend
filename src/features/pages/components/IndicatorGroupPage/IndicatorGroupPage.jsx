// Importation des modules
import Link from 'next/link';
import { CardGrid } from '@/components/ui';
import PageBody from '../PageBody/PageBody';
import PageHeader from '../PageHeader/PageHeader';
import './IndicatorGroupPage.scss';

/**
 * Page template for `indicator_group` nodes: an index of the node's sub-pages.
 *
 * Everything it displays comes from the manifest, so a group page never needs
 * maintaining: adding a child node adds a card here. Server Component.
 *
 * Renders no `<main>`: the catch-all route already provides it.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.node - Manifest node, with resolved absolute paths.
 * @returns {JSX.Element} The rendered group page.
 */
const IndicatorGroupPage = ({ node }) => {
    const children = node.children ?? [];

    return (
        <PageBody>
            <PageHeader name={node.name} description={node.description} />

            {/* Un groupe sans enfants reste une page valide (nœud intermédiaire encore
                vide) : on n'affiche alors ni la grille ni un message d'erreur. */}
            {children.length > 0 && (
                <nav className="group-index" aria-label={`Sous-pages de ${node.name}`}>
                    <CardGrid perRow={3}>
                        {children.map((child) => (
                            <Link key={child.path} href={child.path} className="group-index__card">
                                <h2 className="group-index__card-title">{child.name}</h2>
                                {child.description && (
                                    <p className="group-index__card-text">{child.description}</p>
                                )}
                            </Link>
                        ))}
                    </CardGrid>
                </nav>
            )}
        </PageBody>
    );
};

export default IndicatorGroupPage;
