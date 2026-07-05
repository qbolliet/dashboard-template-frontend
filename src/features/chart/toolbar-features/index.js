// =================================================================
// TOOLBAR FEATURES — API publique des descripteurs de features
// =================================================================
// Chaque feature de la barre d'outils est un DESCRIPTEUR déclaratif (objet, pas
// composant) créé par une factory. Le <Chart> reçoit `toolbar={[ … ]}` — la liste
// au choix de l'utilisateur — et ne garde que celles dont `supports(chartKind)`
// est vrai. Une feature cumule 1 à 4 RÔLES (encoder / transform / overlay /
// interaction), tous optionnels.

// Importation des modules
import { confidenceInterval } from './confidenceInterval';
import { beforeAfter } from './beforeAfter';
import { normalize, normalizeRefs } from './normalize';
import { zoom } from './zoom';
import { minimaps } from './minimaps';
import { nextFreeChannel, REAL_DIST_MARKER, PROJ_DIST_MARKER } from './channelAssign';

// Namespace des factories, façon `window.ChartsFeatures` du prototype.
export const ChartsFeatures = {
  confidenceInterval, beforeAfter, normalize, zoom, minimaps,
  // exposés pour <Chart>
  nextFreeChannel, normalizeRefs,
  // Marqueurs de distinction « vraie série vs projection » (hue 2 / 3).
  REAL_DIST_MARKER, PROJ_DIST_MARKER,
};

export {
  confidenceInterval, beforeAfter, normalize, zoom, minimaps,
  nextFreeChannel, normalizeRefs, REAL_DIST_MARKER, PROJ_DIST_MARKER,
};
