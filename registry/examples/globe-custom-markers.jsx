'use client';

/**
 * Pastilles sur mesure
 *
 * Le mark `badge` (défaut) porte une icône par point : `points.icon` renvoie un SVG en
 * chaîne, injecté tel quel par le moteur (HTML de confiance : toute donnée y passerait
 * par `escapeHtml`). La couleur ne vient pas d'un accesseur mais de `points.hue`,
 * comme sur `<Chart>` : les seuils de valeur sont précalculés en une colonne
 * catégorielle (`niveau`). `points.z` rend l'aire de chaque pastille proportionnelle à
 * sa valeur, comme les bulles du chart, et ajoute une légende de taille titrée par
 * `points.labels.z`.
 *
 * @item globe
 */

// Importation des modules
import { Globe } from '@/features/globe';

// Seuils de valeur → modalité : la couleur se lit dans la légende, comme sur un chart.
const levelOf = (value) => (value >= 80 ? 'fort' : value >= 45 ? 'moyen' : 'faible');

const POINTS = [
  { id: 'par', label: 'Paris', sub: 'INSEE', lat: 48.85, lon: 2.35, value: 92 },
  { id: 'fra', label: 'Francfort', sub: 'BCE', lat: 50.11, lon: 8.68, value: 100 },
  { id: 'mad', label: 'Madrid', sub: 'INE', lat: 40.42, lon: -3.7, value: 48 },
  { id: 'rom', label: 'Rome', sub: 'ISTAT', lat: 41.9, lon: 12.5, value: 38 },
  { id: 'nyc', label: 'New York', sub: 'BLS', lat: 40.71, lon: -74.01, value: 88 },
  { id: 'syd', label: 'Sydney', sub: 'ABS', lat: -33.87, lon: 151.21, value: 33 },
].map((p) => ({ ...p, niveau: levelOf(p.value) }));

const ARCS = [
  { from: 'fra', to: 'par' },
  { from: 'fra', to: 'rom' },
  { from: 'fra', to: 'mad' },
  { from: 'nyc', to: 'syd' },
];

// Icônes de pastille : SVG en chaîne, 24×24, `stroke="currentColor"` pour que le
// pictogramme reste lisible sur la teinte de la pastille.
const ICONS = {
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 6 4-4 8 8"/><path d="M17 17h4v-4"/></svg>',
};

const pointIcon = (point) => (point.value >= 60 ? ICONS.up : ICONS.down);

const GlobeCustomMarkers = () => (
  <Globe
    points={{
      data: POINTS,
      icon: pointIcon,
      hue: 'niveau',
      z: 'value',
      labels: { color: 'Niveau', z: 'Score de la source' },
    }}
    arcs={ARCS}
    height={460}
  />
);

export default GlobeCustomMarkers;
