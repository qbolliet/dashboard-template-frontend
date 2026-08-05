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

const navigationData = resolveNavigationTree(siteConfig.navigation.tree);

const HeaderBasic = () => <Header navigationData={navigationData} />;

export default HeaderBasic;
