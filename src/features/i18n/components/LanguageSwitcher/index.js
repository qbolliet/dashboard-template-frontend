// Export du groupe LanguageSwitcher
export { default as LanguageSwitcher } from './LanguageSwitcher/LanguageSwitcher';
export { DEFAULT_LANGUAGES, flagCdnSrc, defaultFlagSrc } from './languages';

// Les sous-composants (LanguageButton, LanguageMenu, LanguageOption, FlagChip) ne
// sont volontairement pas exportés : ce sont des détails d'implémentation de
// LanguageSwitcher, sans usage ni sens en dehors de sa racine.
