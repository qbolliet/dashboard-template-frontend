// Importation des modules
import siteConfig from '@config/site.config.json';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';
import Header from '@/features/header/components/Header/Header';
import Footer from '@/features/footer/components/Footer/Footer';

// =================================================================
// LAYOUT (site) — chrome de l'APPLICATION de démonstration
// =================================================================
// Le groupe (site) n'ajoute AUCUN segment d'URL : il ne sert qu'à donner un chrome
// distinct aux routes de l'application — la démo pilotée par le manifeste, sous /demo,
// et les bancs d'essai /test-* — sans l'imposer au site de documentation, qui a le sien
// dans (docs).
//
// Le <main id="main-content"> n'est PAS ici : il appartient à chaque page (la route
// attrape-tout de demo/ le pose, cf. son en-tête). Le lien d'évitement qui le vise est
// rendu par <Header>. Cette répartition est celle d'avant la scission, inchangée.
//
// Les `path` du manifeste sont relatifs à leur parent : on les résout en chemins absolus
// ICI, une seule fois et au niveau module (pas par rendu). C'est l'une des deux seules
// frontières où cette concaténation a lieu, l'autre étant la route attrape-tout — et
// c'est en lui passant DEMO_BASE_PATH que toute l'application se retrouve montée sous
// /demo, sans qu'un seul lien en aval ait à le savoir.
const navigationTree = resolveNavigationTree(siteConfig.navigation.tree, DEMO_BASE_PATH);

/**
 * Chrome of the manifest-driven demonstration application.
 *
 * @param {Object} props - Layout props.
 * @param {React.ReactNode} props.children - The rendered route.
 * @returns {JSX.Element} The wrapped route.
 */
const SiteLayout = ({ children }) => (
    <>
        {/* Header piloté par config/site.config.json : disposition, sélecteur et arbre
            de navigation viennent tous du manifeste (JSON sérialisable passé au client).
            `homeHref` est une prop et non une valeur en dur dans <Header> : ce composant
            est publié par le registry, y graver /demo livrerait un lien cassé à un tiers. */}
        <Header
            navigationData={navigationTree}
            navigationType={siteConfig.navigation.type}
            useSwitcher={siteConfig.navigation.useSwitcher}
            homeHref={DEMO_BASE_PATH}
        />
        {children}
        <Footer copyrightText="© 2025 Dashboard Template" homeHref={DEMO_BASE_PATH} />
    </>
);

export default SiteLayout;
