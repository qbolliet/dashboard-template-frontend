/**
 * En-tête et navigation du site
 *
 * `Header` choisit seul entre barre horizontale et barre latérale repliable
 * selon la profondeur de l'arbre qu'on lui passe. `resolveNavigationTree`
 * transforme les chemins relatifs du manifeste en chemins absolus.
 *
 * @item header
 * @item utils-navigation
 */

// Importation des modules
import Header from '@/features/header/components/Header/Header';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import siteConfig from '@config/site.config.json';
import { resolveLocalizedTree } from '@/utils/i18n/resolveLocalized';
import { DEFAULT_LOCALE } from '@/i18n/config';

// Le manifeste porte des libellés traduits (`{ fr, en }`) depuis P5.4 :
// `resolveLocalizedTree` les aplatit en chaînes avant que l'arbre n'atteigne le
// composant. Le site de documentation étant monolingue, il résout dans la langue
// par défaut.
const navigationData = resolveNavigationTree(
    resolveLocalizedTree(siteConfig.navigation.tree, DEFAULT_LOCALE, DEFAULT_LOCALE),
);

const HeaderBasic = () => <Header navigationData={navigationData} />;

export default HeaderBasic;
