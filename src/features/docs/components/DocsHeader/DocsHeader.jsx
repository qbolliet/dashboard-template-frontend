// Importation des modules
import Link from 'next/link';
import Image from 'next/image';
import siteConfig from '@config/site.config.json';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';
import ThemeToggleButton from '@/features/theme/components/ThemeToggleButton/ThemeToggleButton';
import { withBasePath } from '@/utils/url/withBasePath';
import { DOCS_LINK_PREFETCH } from '../../constants';
import './DocsHeader.scss';

// =================================================================
// DOCS HEADER — bandeau supérieur du site de documentation
// =================================================================
// Server Component : il n'a aucun état propre. Le seul îlot interactif est
// <ThemeToggleButton>, qui porte déjà sa propre directive 'use client'.
//
// C'est le composant EXISTANT du header de l'application qui est réutilisé, pas une
// copie : la documentation doit se lire en clair ET en sombre, et le fait qu'elle
// bascule avec le même bouton que l'application est en soi une démonstration du système
// de tokens — si un tiers change la palette, il le voit ici en premier.
//
// Ce bandeau ne réutilise PAS <Header> lui-même : celui-là rend l'arbre de navigation
// du manifeste, qui décrit la démo et n'a rien à dire sur la documentation.

/**
 * Top bar of the documentation site.
 *
 * @returns {JSX.Element} The rendered documentation header.
 */
const DocsHeader = () => (
    <header className="docs-header">
        <Link prefetch={DOCS_LINK_PREFETCH} href="/" className="docs-header__brand">
            {/* alt vide : le logo est décoratif ici, le nom du site le suit en texte.
                Pas de className="logo" — cette classe est stylée par Header.scss, qui
                n'est pas chargée dans la branche (docs). */}
            <Image src={withBasePath("/logo.svg")} alt="" className="docs-header__logo" width={32} height={32} />
            <span className="docs-header__title">{siteConfig.site.title}</span>
            <span className="docs-header__badge">docs</span>
        </Link>

        <nav className="docs-header__nav" aria-label="Surfaces du site">
            {/* Lien vers l'autre surface du dépôt : l'application de démonstration.
                Le chemin vient de basePaths.js, seule source du préfixe /demo. */}
            <Link prefetch={DOCS_LINK_PREFETCH} href={DEMO_BASE_PATH} className="docs-header__link">Démonstration</Link>
        </nav>

        <ThemeToggleButton />
    </header>
);

export default DocsHeader;
