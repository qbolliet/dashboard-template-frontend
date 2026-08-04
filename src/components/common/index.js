// ===== COMPOSANTS COMMUNS =====
// Primitives transverses (accessibilité) partagées par toutes les couches.
// Note : importer depuis ce baril tire aussi SkipLink.scss dans le graphe ;
// pour un composant unique depuis src/components/*, préférer l'import profond
// (ex. '@/components/common/VisuallyHidden').

export { default as VisuallyHidden } from './VisuallyHidden/VisuallyHidden';
export { default as AccessibleIcon } from './AccessibleIcon/AccessibleIcon';
export { default as SkipLink } from './SkipLink/SkipLink';
