// =================================================================
// DEMO DATA — jeu de démonstration partagé de la feature Globe
// =================================================================
// Relocalisé depuis src/app/(site)/test-globe/globeDemoData.js (la page /test-globe est
// vouée à disparaître) : ce jeu sert désormais au playground docs/playgrounds/globe.jsx
// et aux exemples de registry (registry/examples/globe-*.jsx). Mirroir de la convention
// src/features/chart/sources/demoData.js — un fichier `sources/` par feature porte ses
// jeux de démo, réutilisables par tout consommateur de la feature.
//
// SURFACE DE DÉMONSTRATION, PAS DE PRODUIT : aucune page de l'application ne l'importe.
// `npm run eject` le supprime avec le reste de la surface de documentation.
//
// Porté de design-system/project/scripts/globe/globe-data.jsx et des accesseurs de
// démo de globe.html (lignes 98-108) : mêmes capitales/sources statistiques, mêmes
// flux. Les seuils de couleur du prototype sont devenus une colonne catégorielle
// (`niveau`), encodée par `hue` comme sur <Chart>, et l'intensité des flux un volume
// brut (`volume`), normalisé par le globe lui-même. Données + une fonction pure
// (accesseur d'icône, donc non sérialisable depuis un Server Component — tout
// consommateur qui l'importe doit être ou descendre d'une frontière 'use client').

// Icônes de points — petits SVG inline (24×24, stroke = currentColor), choisis
// conditionnellement à une valeur par `demoPointIcon`.
export const GLOBE_ICONS = {
  bank: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M4 10h16M5 10 12 4l7 6M6 10v11M10 10v11M14 10v11M18 10v11"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 6 4-4 8 8"/><path d="M17 17h4v-4"/></svg>',
  factory: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V11l6 4V11l6 4V7l6 4v10z"/><path d="M3 21h18"/></svg>',
  database: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/></svg>',
  pulse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h4l3 8 4-16 3 8h6"/></svg>',
};

// Points de démo — capitales & sources de données statistiques. Colonnes encodables
// par `points.hue` / `points.z` :
//   • `region`  — continent (couleur) ;
//   • `niveau`  — palier d'activité, ex-seuils de couleur du prototype (≥ 80 fort,
//                 < 45 faible) ;
//   • `type`    — nature de la source (forme d'une bulle) ;
//   • `value`   — score d'activité (taille).
export const GLOBE_POINTS = [
  { id: 'par', label: 'Paris', sub: 'INSEE', lat: 48.85, lon: 2.35, value: 92, region: 'Europe', niveau: 'fort', type: 'institut national' },
  { id: 'fra', label: 'Francfort', sub: 'BCE', lat: 50.11, lon: 8.68, value: 100, region: 'Europe', niveau: 'fort', type: 'banque centrale' },
  { id: 'lux', label: 'Luxembourg', sub: 'Eurostat', lat: 49.61, lon: 6.13, value: 74, region: 'Europe', niveau: 'moyen', type: 'office européen' },
  { id: 'lon', label: 'Londres', sub: 'ONS', lat: 51.51, lon: -0.13, value: 61, region: 'Europe', niveau: 'moyen', type: 'institut national' },
  { id: 'mad', label: 'Madrid', sub: 'INE', lat: 40.42, lon: -3.70, value: 48, region: 'Europe', niveau: 'moyen', type: 'institut national' },
  { id: 'rom', label: 'Rome', sub: 'ISTAT', lat: 41.90, lon: 12.50, value: 38, region: 'Europe', niveau: 'faible', type: 'institut national' },
  { id: 'ber', label: 'Berlin', sub: 'Destatis', lat: 52.52, lon: 13.40, value: 83, region: 'Europe', niveau: 'fort', type: 'institut national' },
  { id: 'nyc', label: 'New York', sub: 'BLS', lat: 40.71, lon: -74.01, value: 88, region: 'Amériques', niveau: 'fort', type: 'institut national' },
  { id: 'was', label: 'Washington', sub: 'Fed / BEA', lat: 38.90, lon: -77.04, value: 95, region: 'Amériques', niveau: 'fort', type: 'banque centrale' },
  { id: 'tok', label: 'Tokyo', sub: 'e-Stat', lat: 35.68, lon: 139.69, value: 57, region: 'Asie-Pacifique', niveau: 'moyen', type: 'institut national' },
  { id: 'sgp', label: 'Singapour', sub: 'SingStat', lat: 1.35, lon: 103.82, value: 44, region: 'Asie-Pacifique', niveau: 'faible', type: 'institut national' },
  { id: 'syd', label: 'Sydney', sub: 'ABS', lat: -33.87, lon: 151.21, value: 33, region: 'Asie-Pacifique', niveau: 'faible', type: 'institut national' },
  { id: 'sao', label: 'São Paulo', sub: 'IBGE', lat: -23.55, lon: -46.63, value: 29, region: 'Amériques', niveau: 'faible', type: 'institut national' },
];

// Flux (arcs) entre points. Colonnes encodables par `arcs.hue` / `arcs.z` :
//   • `mode`   — mode d'acheminement (couleur) ;
//   • `kind`   — régularité du flux (style de trait : plein / pointillé) ;
//   • `volume` — volume échangé, valeur brute (taille : épaisseur du trait, hauteur
//                de l'arc et vitesse de la comète, ou luminosité en mark "glow").
export const GLOBE_ARCS = [
  { from: 'fra', to: 'par', volume: 900, mode: 'rail', kind: 'régulier' },
  { from: 'fra', to: 'ber', volume: 800, mode: 'rail', kind: 'régulier' },
  { from: 'fra', to: 'lux', volume: 700, mode: 'rail', kind: 'régulier' },
  { from: 'fra', to: 'rom', volume: 500, mode: 'rail', kind: 'ponctuel' },
  { from: 'fra', to: 'mad', volume: 550, mode: 'aérien', kind: 'ponctuel' },
  { from: 'par', to: 'lon', volume: 600, mode: 'rail', kind: 'régulier' },
  { from: 'was', to: 'nyc', volume: 850, mode: 'rail', kind: 'régulier' },
  { from: 'was', to: 'fra', volume: 750, mode: 'aérien', kind: 'régulier' },
  { from: 'nyc', to: 'lon', volume: 650, mode: 'aérien', kind: 'ponctuel' },
  { from: 'fra', to: 'tok', volume: 500, mode: 'aérien', kind: 'régulier' },
  { from: 'tok', to: 'sgp', volume: 450, mode: 'maritime', kind: 'ponctuel' },
  { from: 'sgp', to: 'syd', volume: 400, mode: 'maritime', kind: 'régulier' },
  { from: 'nyc', to: 'sao', volume: 500, mode: 'maritime', kind: 'ponctuel' },
];

// Titres des données encodées de la démonstration, un objet par calque (prop
// `labels` de `points` et de `arcs`), comme `labels` sur <Chart>.
export const GLOBE_POINT_LABELS = { color: 'Région', style: 'Niveau', marker: 'Type de source', z: 'Activité' };
export const GLOBE_ARC_LABELS = { color: 'Acheminement', style: 'Régularité', z: 'Volume' };

/**
 * Picks a point's icon conditionally on its source/value — demonstrates a
 * value-dependent `points.icon` accessor (badge mark).
 *
 * @param {{sub?: string, value?: number}} pt - Point (see GLOBE_POINTS).
 * @returns {string} One of the GLOBE_ICONS SVG strings.
 */
export const demoPointIcon = (pt) => {
  // Banques centrales : icône dédiée avant tout critère de valeur.
  if (pt.sub === 'BCE' || pt.sub === 'Fed / BEA') return GLOBE_ICONS.bank;
  if (pt.sub === 'Eurostat' || pt.sub === 'Destatis') return GLOBE_ICONS.database;
  if (pt.value >= 80) return GLOBE_ICONS.up;
  if (pt.value < 40) return GLOBE_ICONS.down;
  return GLOBE_ICONS.pulse;
};
