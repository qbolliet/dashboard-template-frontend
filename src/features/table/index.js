// =================================================================
// FEATURE TABLE — point d'entrée public
// =================================================================
// Réexporte le composant racine Table, la source de données GraphQL
// useFactTableWithMetadata et les utilitaires purs utiles à un consommateur
// (typedefs ColumnDef/FormatSpec, formatCell, isNumericCol, formatNumber).
// Les sous-composants de présentation restent internes.

export { default as Table } from './components/Table';

export { useFactTableWithMetadata } from './sources/useFactTableWithMetadata';

export * from './utils/formatCell';
