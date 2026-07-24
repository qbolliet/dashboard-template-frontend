// =================================================================
// FEATURE TABLE — point d'entrée public
// =================================================================
// Réexporte le composant racine DataTable et les utilitaires purs utiles à un
// consommateur (typedefs ColumnDef/FormatSpec, formatCell, isNumericCol,
// formatNumber). Les sous-composants de présentation restent internes.

export { default as DataTable } from './components/DataTable/DataTable';

export * from './utils/formatCell';
