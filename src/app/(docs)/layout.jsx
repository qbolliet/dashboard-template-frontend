// Importation des modules
import { DOCS_SECTIONS } from '@docs/__docs__';
import DocsShell from '@/features/docs/components/DocsShell/DocsShell';

// =================================================================
// LAYOUT (docs) — chrome du SITE DE DOCUMENTATION
// =================================================================
// Chrome entièrement distinct de celui de l'application : ni <Header> ni <Footer>, mais
// une barre supérieure propre, une sidebar de sections, un fil d'Ariane et un sommaire
// de page. Le seul élément partagé avec l'application est <ThemeToggleButton> — la
// documentation doit se lire en clair ET en sombre, ce qui en fait autant une
// démonstration du système de tokens qu'une commodité de lecture.
//
// Le groupe (docs) n'ajoute aucun segment d'URL : la documentation est donc servie à la
// RACINE du déploiement, et l'application de démonstration sous /demo (cf.
// src/utils/navigation/basePaths.js).
//
// Le <main id="main-content"> est posé par <DocsShell>, une fois pour toutes les pages
// de documentation. Corollaire — la route (docs)/[[...slug]] ne rend AUCUN <main>.

/**
 * Chrome of the documentation site.
 *
 * @param {Object} props - Layout props.
 * @param {React.ReactNode} props.children - The rendered MDX page.
 * @returns {JSX.Element} The wrapped page.
 */
const DocsLayout = ({ children }) => (
    <DocsShell sections={DOCS_SECTIONS}>{children}</DocsShell>
);

export default DocsLayout;
