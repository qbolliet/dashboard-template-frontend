'use client';

/**
 * Pastilles et infobulles sur mesure
 *
 * Quatre accesseurs personnalisent chaque point : `colorFor`, `sizeFor`,
 * `iconFor` (SVG en chaîne) et `tooltipFor` (HTML en chaîne). Ce dernier est
 * injecté tel quel par le moteur : toute donnée y passe par `escapeHtml`.
 *
 * @item globe
 */

// Importation des modules
import { Globe, escapeHtml } from '@/features/globe';

const POINTS = [
  { id: 'par', label: 'Paris', sub: 'INSEE', lat: 48.85, lon: 2.35, value: 92 },
  { id: 'fra', label: 'Francfort', sub: 'BCE', lat: 50.11, lon: 8.68, value: 100 },
  { id: 'mad', label: 'Madrid', sub: 'INE', lat: 40.42, lon: -3.7, value: 48 },
  { id: 'rom', label: 'Rome', sub: 'ISTAT', lat: 41.9, lon: 12.5, value: 38 },
  { id: 'nyc', label: 'New York', sub: 'BLS', lat: 40.71, lon: -74.01, value: 88 },
  { id: 'syd', label: 'Sydney', sub: 'ABS', lat: -33.87, lon: 151.21, value: 33 },
];

const ARCS = [
  { from: 'fra', to: 'par', value: 0.9 },
  { from: 'fra', to: 'rom', value: 0.5 },
  { from: 'fra', to: 'mad', value: 0.55 },
  { from: 'nyc', to: 'syd', value: 0.4 },
];

// Icônes de pastille : SVG en chaîne, 24×24, `stroke="currentColor"` pour que la
// couleur suive celle décidée par `colorFor`.
const ICONS = {
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 6 4-4 8 8"/><path d="M17 17h4v-4"/></svg>',
};

const pointIcon = (point) => (point.value >= 60 ? ICONS.up : ICONS.down);
const pointColor = (point) => (point.value >= 80 ? '#2E7D5B' : point.value >= 45 ? '#B07D2B' : '#BD2D28');
const pointSize = (point) => 16 + Math.round((point.value / 100) * 18);

// `tooltipFor` renvoie du HTML injecté tel quel : seul le balisage écrit ici est
// de confiance, chaque champ de donnée doit passer par escapeHtml.
const tooltipFor = (point) =>
  `<div class="globe-tt-title">${escapeHtml(point.label)}</div>`
  + `<div class="globe-tt-sub">source · ${escapeHtml(point.sub)}</div>`
  + `<div class="globe-tt-val">${escapeHtml(point.value)}</div>`;

const GlobeCustomMarkers = () => (
  <Globe
    points={POINTS}
    arcs={ARCS}
    iconFor={pointIcon}
    colorFor={pointColor}
    sizeFor={pointSize}
    tooltipFor={tooltipFor}
    height={460}
  />
);

export default GlobeCustomMarkers;
