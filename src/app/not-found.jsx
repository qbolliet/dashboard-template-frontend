// Importation des modules
import Link from 'next/link';
import SkipLink from '@/components/common/SkipLink/SkipLink';
import ThemeToggleButton from '@/features/theme/components/ThemeToggleButton/ThemeToggleButton';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';
import './not-found.scss';

// =================================================================
// 404 — la frontière qui rend RÉELLEMENT, hors de toute enveloppe
// =================================================================
// C'est celle-ci qui s'affiche pour toute URL n'appariant aucune route, sur les DEUX
// surfaces du dépôt : /inconnu comme /demo/inconnu. Les deux routes attrape-tout
// déclarent `dynamicParams = false`, donc un chemin absent de leur generateStaticParams
// n'entre jamais dans leur segment — le 404 de groupe qui s'y trouverait n'est pas
// atteint, seul le 404 RACINE l'est. Vérifié en développement, et c'est aussi le
// comportement de l'export statique, qui fait de ce fichier out/404.html : le document
// que GitHub Pages sert pour toute adresse inconnue.
//
// Corollaire à connaître : src/app/(site)/not-found.jsx existe toujours mais n'est
// atteint que par un appel EXPLICITE à notFound() depuis une page du groupe (le cas
// « type de nœud absent de PAGE_TYPES »). Il n'y a délibérément pas d'équivalent dans
// (docs) : la route de documentation n'appelle notFound() que si DOCS_MODULES et
// DOCS_PATHS divergeaient, ce que le générateur unique rend impossible.
//
// N'ayant aucun layout intermédiaire, cette page apporte elle-même son lien
// d'évitement, son <main> et sa bascule de thème. Elle ne peut pas afficher la sidebar
// de documentation — il n'y a pas de page courante à situer — et offre à la place les
// deux points d'entrée du site.

export const metadata = {
    title: 'Page introuvable',
};

/**
 * Last-resort 404, rendered outside both route groups.
 *
 * @returns {JSX.Element} The rendered 404 page.
 */
const NotFound = () => (
    <>
        <SkipLink href="#main-content">Passer au contenu</SkipLink>

        <div className="not-found__bar">
            <ThemeToggleButton />
        </div>

        <main id="main-content" className="not-found">
            <p className="not-found__code">404</p>
            <h1 className="not-found__title">Page introuvable</h1>
            <p className="not-found__text">
                Cette adresse ne correspond à aucune page de ce site.
            </p>

            <nav className="not-found__links" aria-label="Points d'entrée du site">
                <Link href="/">Documentation</Link>
                <Link href={DEMO_BASE_PATH}>Application de démonstration</Link>
            </nav>
        </main>
    </>
);

export default NotFound;
