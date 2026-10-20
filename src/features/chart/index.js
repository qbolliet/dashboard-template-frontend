// =================================================================
// FEATURE CHART — point d'entrée public
// =================================================================
// Réexporte le composant pivot Chart, le mode multi-jeux MultiChart, les
// descripteurs de features ChartsFeatures, les sources de données GraphQL
// useFactTable et useAggregates, le pont useAggregatedChart (agrégats de l'API →
// props de <Chart>) et les utilitaires purs.

export { default as Chart } from './components/Chart/Chart';
export { default as MultiChart } from './components/MultiChart/MultiChart';

export { ChartsFeatures } from './toolbar-features';

export { useFactTable } from './sources/useFactTable';
export { useAggregates } from './sources/useAggregates';
export { useAggregatedChart } from './hooks/useAggregatedChart';

export * from './utils/typeDetection';
export * from './utils/encoding';
export * from './utils/stacking';
export * from './utils/aggregate';
export * from './utils/aggregationPlan';
export * from './utils/formatters';
export * from './utils/measureText';
export * from './utils/exportImage';
