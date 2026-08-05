// =================================================================
// DEMO DATA — /test-globe (thème models.lab)
// =================================================================
// Porté À L'IDENTIQUE de design-system/project/scripts/globe/globe-data.jsx et
// des accesseurs de démo de globe.html (lignes 98-108) : mêmes capitales/sources
// statistiques, mêmes flux, mêmes seuils de couleur/taille. Données + fonctions
// pures, consommées uniquement par GlobeShowcase.jsx (accesseurs = fonctions,
// donc non sérialisables depuis un Server Component).

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

// Points de démo — capitales & sources de données statistiques.
export const GLOBE_POINTS = [
  { id: 'par', label: 'Paris', sub: 'INSEE', lat: 48.85, lon: 2.35, value: 92 },
  { id: 'fra', label: 'Francfort', sub: 'BCE', lat: 50.11, lon: 8.68, value: 100 },
  { id: 'lux', label: 'Luxembourg', sub: 'Eurostat', lat: 49.61, lon: 6.13, value: 74 },
  { id: 'lon', label: 'Londres', sub: 'ONS', lat: 51.51, lon: -0.13, value: 61 },
  { id: 'mad', label: 'Madrid', sub: 'INE', lat: 40.42, lon: -3.70, value: 48 },
  { id: 'rom', label: 'Rome', sub: 'ISTAT', lat: 41.90, lon: 12.50, value: 38 },
  { id: 'ber', label: 'Berlin', sub: 'Destatis', lat: 52.52, lon: 13.40, value: 83 },
  { id: 'nyc', label: 'New York', sub: 'BLS', lat: 40.71, lon: -74.01, value: 88 },
  { id: 'was', label: 'Washington', sub: 'Fed / BEA', lat: 38.90, lon: -77.04, value: 95 },
  { id: 'tok', label: 'Tokyo', sub: 'e-Stat', lat: 35.68, lon: 139.69, value: 57 },
  { id: 'sgp', label: 'Singapour', sub: 'SingStat', lat: 1.35, lon: 103.82, value: 44 },
  { id: 'syd', label: 'Sydney', sub: 'ABS', lat: -33.87, lon: 151.21, value: 33 },
  { id: 'sao', label: 'São Paulo', sub: 'IBGE', lat: -23.55, lon: -46.63, value: 29 },
];

// Flux (arcs) entre points — value ∈ [0,1] pilote épaisseur/opacité/vitesse.
export const GLOBE_ARCS = [
  { from: 'fra', to: 'par', value: 0.9 },
  { from: 'fra', to: 'ber', value: 0.8 },
  { from: 'fra', to: 'lux', value: 0.7 },
  { from: 'fra', to: 'rom', value: 0.5 },
  { from: 'fra', to: 'mad', value: 0.55 },
  { from: 'par', to: 'lon', value: 0.6 },
  { from: 'was', to: 'nyc', value: 0.85 },
  { from: 'was', to: 'fra', value: 0.75 },
  { from: 'nyc', to: 'lon', value: 0.65 },
  { from: 'fra', to: 'tok', value: 0.5 },
  { from: 'tok', to: 'sgp', value: 0.45 },
  { from: 'sgp', to: 'syd', value: 0.4 },
  { from: 'nyc', to: 'sao', value: 0.5 },
];

/**
 * Picks a point's icon conditionally on its source/value — demonstrates a
 * value-dependent `iconFor` accessor.
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

/**
 * Picks a point's badge color conditionally on its value (thresholds 80/45).
 *
 * @param {{value?: number}} pt - Point (see GLOBE_POINTS).
 * @returns {string} An oklch() CSS color — demo data, not a design token.
 */
export const pointColor = (pt) => {
  if (pt.value >= 80) return 'oklch(0.62 0.15 150)'; // fort — vert
  if (pt.value < 45) return 'oklch(0.68 0.15 55)'; // faible — ambre
  return 'oklch(0.55 0.15 250)'; // moyen — bleu
};

/**
 * Picks a point's badge diameter conditionally on its value (16 → 34 px).
 *
 * @param {{value?: number}} pt - Point (see GLOBE_POINTS).
 * @returns {number} Diameter in pixels.
 */
export const pointSize = (pt) => 16 + Math.round((pt.value / 100) * 18);
