// =================================================================
// FEATURE CHART — point d'entrée public
// =================================================================
// Réexporte le composant pivot Chart + les utilitaires purs. MultiChart,
// ChartsFeatures et les sources GraphQL viendront s'ajouter ici au fur et à
// mesure (cf. CHART_ARCHITECTURE.md, §5 « ordre de construction »).

export { default as Chart } from './components/Chart/Chart';

export * from './utils/typeDetection';
export * from './utils/encoding';
export * from './utils/stacking';
export * from './utils/formatters';
export * from './utils/measureText';
export * from './utils/exportImage';
