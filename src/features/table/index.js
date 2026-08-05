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

// Évaluation d'un `defaultFilter` sur une ligne : exposée pour qu'un consommateur
// puisse appliquer EXACTEMENT le même filtre que le tableau à une autre vue du même
// jeu de données (un graphique côte à côte, typiquement) sans réimplémenter la
// sémantique des connecteurs et des opérateurs.
export { normalizeDefaultFilter, evalFilterNode } from './utils/defaultFilterEngine';
