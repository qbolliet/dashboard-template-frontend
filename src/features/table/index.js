// =================================================================
// FEATURE TABLE — point d'entrée public
// =================================================================
// Réexporte le composant racine Table, la source de données GraphQL
// useFactTableWithMetadata et les utilitaires purs utiles à un consommateur
// (typedefs ColumnDef/FormatSpec, formatCell, isNumericCol, ainsi que formatNumber
// que formatCell.js relaie depuis la couche partagée src/utils/format/).
// Les sous-composants de présentation restent internes.

export { default as Table } from './components/Table';

export { useFactTableWithMetadata } from './sources/useFactTableWithMetadata';

export * from './utils/formatCell';
