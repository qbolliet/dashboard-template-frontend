/**
 * Usage nu
 *
 * Sans props, `<LanguageSwitcher>` affiche ses huit langues par défaut et gère
 * seul l'état de la langue active — mode non contrôlé, la position la plus
 * simple pour un premier essai du composant.
 *
 * @item language-switcher
 */

// Importation des modules
import { LanguageSwitcher } from '@/features/i18n/components/LanguageSwitcher';

const LanguageSwitcherBasic = () => <LanguageSwitcher />;

export default LanguageSwitcherBasic;
