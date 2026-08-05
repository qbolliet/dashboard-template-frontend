'use client';

// Importation des modules
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DOCS_PAGES } from '@docs/__docs__';
import { DOCS_LINK_PREFETCH } from '../../constants';
import './DocsBreadcrumb.scss';

// =================================================================
// DOCS BREADCRUMB — fil d'Ariane de la page courante
// =================================================================
// Importe DOCS_PAGES directement plutôt que de le recevoir en prop : le faire
// descendre depuis le layout serveur le sérialiserait dans la charge RSC de CHAQUE
// page, alors qu'un import le place dans un chunk JS unique, partagé et mis en cache
// par le navigateur. Ce module ne contient que des données — aucun MDX n'est tiré
// dans le bundle (cf. l'en-tête de docs/__docs__.js).

/**
 * Breadcrumb of the current documentation page.
 *
 * Renders nothing at the documentation root, which has no ancestor to show.
 *
 * @returns {(JSX.Element|null)} The rendered breadcrumb, or null when there is nothing
 *   to situate.
 */
const DocsBreadcrumb = () => {
    const pathname = usePathname();
    const trail = DOCS_PAGES[pathname]?.breadcrumb ?? [];

    if (trail.length === 0) return null;

    return (
        <nav className="docs-breadcrumb" aria-label="Fil d'Ariane">
            <ol className="docs-breadcrumb__list">
                <li className="docs-breadcrumb__item">
                    <Link prefetch={DOCS_LINK_PREFETCH} href="/" className="docs-breadcrumb__link">Documentation</Link>
                </li>

                {trail.map((step, index) => {
                    const isLast = index === trail.length - 1;

                    return (
                        <li key={step.path} className="docs-breadcrumb__item">
                            {/* Le dernier maillon est la page courante : pas de lien vers
                                soi-même, mais un aria-current pour l'annoncer. */}
                            {isLast ? (
                                <span className="docs-breadcrumb__current" aria-current="page">
                                    {step.title}
                                </span>
                            ) : (
                                <Link prefetch={DOCS_LINK_PREFETCH} href={step.path} className="docs-breadcrumb__link">
                                    {step.title}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

export default DocsBreadcrumb;
