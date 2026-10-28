/**
 * Globe à points et flux
 *
 * La forme minimale : une liste de points géolocalisés et une liste de flux qui les
 * relient par leur `id`, passées telles quelles (raccourci de `{ data }`). La barre
 * d'outils complète (globe / planisphère, rotation, zoom, tooltips) est présente par
 * défaut, et chaque point ou flux survolé affiche la tooltip du chart.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';

// Points : `label` titre la tooltip, `sub` en est le sous-titre.
const POINTS = [
  { id: 'par', label: 'Paris', sub: 'INSEE', lat: 48.85, lon: 2.35 },
  { id: 'fra', label: 'Francfort', sub: 'BCE', lat: 50.11, lon: 8.68 },
  { id: 'lon', label: 'Londres', sub: 'ONS', lat: 51.51, lon: -0.13 },
  { id: 'nyc', label: 'New York', sub: 'BLS', lat: 40.71, lon: -74.01 },
  { id: 'tok', label: 'Tokyo', sub: 'e-Stat', lat: 35.68, lon: 139.69 },
  { id: 'sao', label: 'São Paulo', sub: 'IBGE', lat: -23.55, lon: -46.63 },
];

// Flux : `from` / `to` désignent des points par leur `id`.
const ARCS = [
  { from: 'fra', to: 'par' },
  { from: 'par', to: 'lon' },
  { from: 'fra', to: 'nyc' },
  { from: 'fra', to: 'tok' },
  { from: 'nyc', to: 'sao' },
];

const GlobeBasic = () => <Globe points={POINTS} arcs={ARCS} height={420} />;

export default GlobeBasic;
