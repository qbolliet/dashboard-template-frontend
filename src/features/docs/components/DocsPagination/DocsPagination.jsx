'use client';

// Importation des modules
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCS_PAGES } from '@docs/__docs__';
import { DOCS_LINK_PREFETCH } from '../../constants';
import './DocsPagination.scss';

// =================================================================
// DOCS PAGINATION — page précédente / suivante
// =================================================================
// L'ordre de parcours vient de l'index généré : c'est l'ordre d'AFFICHAGE de la
// sidebar aplati (accueil, puis chaque section suivie de ses pages), et non l'ordre de
// tri brut, qui entrelacerait les sections. Un lecteur qui enchaîne « suivant » traverse
// donc le site exactement comme la sidebar le présente.

/**
 * Previous/next links for the current documentation page.
 *
 * @returns {(JSX.Element|null)} The rendered pagination, or null at both ends of the
 *   reading order where there is nothing to link to.
 */
const DocsPagination = () => {
    const pathname = usePathname();
    const page = DOCS_PAGES[pathname];

    if (!page || (!page.previous && !page.next)) return null;

    return (
        <nav className="docs-pagination" aria-label="Pages précédente et suivante">
            {/* Le lien « précédent » est rendu même absent, sous forme d'espace vide :
                sans cela le lien « suivant » remonterait à gauche sur la première page. */}
            {page.previous ? (
                <Link prefetch={DOCS_LINK_PREFETCH} href={page.previous.path} className="docs-pagination__link" rel="prev">
                    <span className="docs-pagination__label">Précédent</span>
                    <span className="docs-pagination__title">{page.previous.title}</span>
                </Link>
            ) : (
                <span className="docs-pagination__spacer" />
            )}

            {page.next && (
                <Link
                    prefetch={DOCS_LINK_PREFETCH}
                    href={page.next.path}
                    className="docs-pagination__link docs-pagination__link--next"
                    rel="next"
                >
                    <span className="docs-pagination__label">Suivant</span>
                    <span className="docs-pagination__title">{page.next.title}</span>
                </Link>
            )}
        </nav>
    );
};

export default DocsPagination;
