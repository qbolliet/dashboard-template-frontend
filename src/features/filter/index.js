// =================================================================
// FEATURE FILTER — point d'entrée public
// =================================================================
// Réexporte les composants assemblés et les utilitaires de la feature.
// Les primitives atomiques (SelectMenu, TypeAwareInput, Tooltip…) restent dans
// src/components/filter/ et ne sont pas réexportées ici.

export { default as CriterionMenu } from './components/CriterionMenu/CriterionMenu';
export { default as MultiCriterionMenu } from './components/MultiCriterionMenu/MultiCriterionMenu';
export * from './utils/filterTypes';
export * from './utils/filterEngine';
