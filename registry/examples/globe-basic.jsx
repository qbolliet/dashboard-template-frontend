/**
 * Globe à points et flux
 *
 * La forme minimale : une liste de points géolocalisés et une liste d'arcs qui
 * les relient par leur `id`. La barre d'outils complète (globe / planisphère,
 * rotation, zoom, tooltips) est présente par défaut.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';

// Points : `value` pilote la couleur et le diamètre par défaut de la pastille.
const POINTS = [
  { id: 'par', label: 'Paris', sub: 'INSEE', lat: 48.85, lon: 2.35, value: 92 },
  { id: 'fra', label: 'Francfort', sub: 'BCE', lat: 50.11, lon: 8.68, value: 100 },
  { id: 'lon', label: 'Londres', sub: 'ONS', lat: 51.51, lon: -0.13, value: 61 },
  { id: 'nyc', label: 'New York', sub: 'BLS', lat: 40.71, lon: -74.01, value: 88 },
  { id: 'tok', label: 'Tokyo', sub: 'e-Stat', lat: 35.68, lon: 139.69, value: 57 },
  { id: 'sao', label: 'São Paulo', sub: 'IBGE', lat: -23.55, lon: -46.63, value: 29 },
];

// Arcs : `value` ∈ [0, 1] pilote épaisseur, opacité et vitesse de la comète.
const ARCS = [
  { from: 'fra', to: 'par', value: 0.9 },
  { from: 'par', to: 'lon', value: 0.6 },
  { from: 'fra', to: 'nyc', value: 0.75 },
  { from: 'fra', to: 'tok', value: 0.5 },
  { from: 'nyc', to: 'sao', value: 0.5 },
];

const GlobeBasic = () => <Globe points={POINTS} arcs={ARCS} height={420} />;

export default GlobeBasic;
