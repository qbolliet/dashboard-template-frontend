/**
 * Liste personnalisée
 *
 * La prop `languages` remplace entièrement la liste par défaut : un site
 * trilingue n'a aucune raison d'exposer les huit langues du composant.
 * `menuAlign="right"` aligne le menu sur le bord droit du bouton, le
 * placement à retenir quand le sélecteur termine une barre d'actions.
 *
 * @item language-switcher
 */

// Importation des modules
import { LanguageSwitcher } from '@/features/i18n/components/LanguageSwitcher';

const LANGUAGES = [
  { code: 'fr', country: 'FR', name: 'Français' },
  { code: 'en', country: 'GB', name: 'English' },
  { code: 'de', country: 'DE', name: 'Deutsch' },
];

const LanguageSwitcherCustom = () => <LanguageSwitcher languages={LANGUAGES} menuAlign="right" />;

export default LanguageSwitcherCustom;
