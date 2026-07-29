// =================================================================
// FEATURE GLOBE — point d'entrée public
// =================================================================
// Réexporte le composant racine Globe (seule frontière cliente de la feature)
// et la liste des clés d'outils TOOL_KEYS, utile à un consommateur qui veut
// restreindre la toolbar sans recopier les chaînes. Le moteur Three.js reste
// interne : il n'est atteint que par l'import dynamique de useGlobeEngine, afin
// que `three` ne quitte jamais son chunk asynchrone.

export { default as Globe } from './components/Globe/Globe';
export { TOOL_KEYS } from './components/GlobeToolbar/GlobeToolbar';
