/**
 * Bouton compact
 *
 * `compact` réduit le bouton à un rond affichant le seul drapeau, sans badge
 * de pays ni chevron — le format à choisir dans une barre d'outils ou un
 * en-tête mobile où la largeur manque.
 *
 * @item language-switcher
 */

// Importation des modules
import { LanguageSwitcher } from '@/features/i18n/components/LanguageSwitcher';

const LanguageSwitcherCompact = () => <LanguageSwitcher compact />;

export default LanguageSwitcherCompact;
