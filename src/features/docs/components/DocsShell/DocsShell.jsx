// Importation des modules
import SkipLink from '@/components/common/SkipLink/SkipLink';
import DocsHeader from '../DocsHeader/DocsHeader';
import DocsSidebar from '../DocsSidebar/DocsSidebar';
import DocsBreadcrumb from '../DocsBreadcrumb/DocsBreadcrumb';
import DocsToc from '../DocsToc/DocsToc';
import DocsPagination from '../DocsPagination/DocsPagination';
import './DocsShell.scss';

// =================================================================
// DOCS SHELL — enveloppe complète du site de documentation
// =================================================================
// Server Component : mise en page pure, il ne fait que composer. Quatre de ses enfants
// sont des composants clients parce qu'ils ont besoin du chemin courant ; les composer
// depuis un Server Component ne le rend pas client lui-même, et le contenu MDX qu'il
// enveloppe reste donc entièrement rendu côté serveur.
//
// C'est ICI qu'est posé le <main id="main-content">, une fois pour toutes les pages de
// documentation — contrairement à la branche (site), où chaque page pose le sien parce
// qu'elle passe par un gabarit intermédiaire. Corollaire : la route
// src/app/(docs)/[[...slug]]/page.jsx ne rend AUCUN <main>.
//
// <article class="docs-prose"> est la cible de toute la typographie du contenu rédigé :
// la feuille vise les balises NUES à l'intérieur, ce qui évite d'avoir à surcharger
// chaque balise dans src/mdx-components.jsx (qui ne s'occupe que du comportement).

/**
 * Full chrome of the documentation site.
 *
 * @param {Object} props - Component props.
 * @param {Array<Object>} props.sections - Sidebar sections, from the generated index.
 * @param {React.ReactNode} props.children - The rendered MDX page.
 * @returns {JSX.Element} The wrapped page.
 */
const DocsShell = ({ sections = [], children }) => (
    <div className="docs-shell">
        <SkipLink href="#main-content">Passer au contenu</SkipLink>

        <DocsHeader />

        <div className="docs-shell__body">
            <aside className="docs-shell__sidebar">
                <DocsSidebar sections={sections} />
            </aside>

            <main id="main-content" className="docs-shell__main">
                <DocsBreadcrumb />

                <article className="docs-prose">
                    {children}
                </article>

                <DocsPagination />
            </main>

            {/* Le sommaire est hors du <main> : c'est une aide à la navigation dans la
                page, pas son contenu. Il disparaît sous le point de rupture « large ». */}
            <aside className="docs-shell__toc">
                <DocsToc />
            </aside>
        </div>
    </div>
);

export default DocsShell;
