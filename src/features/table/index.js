// =================================================================
// FEATURE TABLE — point d'entrée public
// =================================================================
// Réexporte le composant racine Table et les utilitaires purs utiles à un
// consommateur (typedefs ColumnDef/FormatSpec, formatCell, isNumericCol,
// formatNumber). Les sous-composants de présentation restent internes.

export { default as Table } from './components/Table';

export * from './utils/formatCell';
