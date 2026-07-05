// =================================================================
// DEMO DATA — jeux synthétiques (un par type de graphique)
// =================================================================
// Portés À L'IDENTIQUE de design-system/project/scripts/charts/data.jsx
// (même RNG mulberry32, mêmes graines, mêmes formules) afin que la page de
// fumée /test-chart soit directement comparable au prototype. Fonctions pures.

const COUNTRIES = ['France', 'Allemagne', 'Italie', 'Espagne'];

/**
 * Seeded RNG (mulberry32) — demo data stable across reloads.
 *
 * @param {number} seed - Integer seed.
 * @returns {() => number} A function yielding pseudo-random floats in [0, 1).
 */
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ────────────── 1. Séries temporelles — Linechart (date + num + hue×3) ─── */

/**
 * Builds a parametric time series, varying only the encoded dimensions so each
 * (date, series) has a single point (smooth lines).
 *
 * @param {object} [opts] - { seed, countries, crossvals, models, noise }.
 * @returns {Array<object>} Rows { Date, PIB, Country, Model, CrossVal }.
 */
export function makeLineData(opts = {}) {
  const {
    seed = 1,
    countries = ['France', 'Allemagne'],
    crossvals = ['PanelCV', 'OCOMCV'],
    models = ['Lasso', 'Ridge'],
    noise = 1,
  } = opts;
  const rng = mulberry32(seed);
  const start = new Date(2020, 0, 1);
  const out = [];
  const baseByCountry = { France: 100, Allemagne: 110 };
  const trendByCountry = { France: 0.08, Allemagne: 0.1 };
  for (const c of countries) {
    for (const m of models) {
      for (const cv of crossvals) {
        let v = baseByCountry[c] + (m === 'Ridge' ? 3 : 0) + (cv === 'OCOMCV' ? -2 : 0);
        for (let i = 0; i < 60; i++) {
          const date = new Date(start.getFullYear(), start.getMonth() + i, 1);
          const wobble = (rng() - 0.5) * 4 * noise;
          const cycle = Math.sin(i / 6) * 1.5;
          v += trendByCountry[c] + wobble * 0.4 + cycle * 0.2 + (cv === 'OCOMCV' ? 0.01 : 0);
          out.push({ Date: date, PIB: +v.toFixed(2), Country: c, Model: m, CrossVal: cv });
        }
      }
    }
  }
  return out;
}

/**
 * Four datasets, one per active hue-channel count (color → +style → +marker).
 *
 * @returns {{0:Array<object>, 1:Array<object>, 2:Array<object>, 3:Array<object>}}
 */
export function makeLineByHue() {
  return {
    0: makeLineData({ seed: 1, countries: ['France'], crossvals: ['PanelCV'], models: ['Lasso'], noise: 0.55 }),
    1: makeLineData({ seed: 1, countries: ['France', 'Allemagne'], crossvals: ['PanelCV'], models: ['Lasso'], noise: 0.55 }),
    2: makeLineData({ seed: 1, countries: ['France', 'Allemagne'], crossvals: ['PanelCV', 'OCOMCV'], models: ['Lasso'], noise: 0.55 }),
    3: makeLineData({ seed: 1, countries: ['France', 'Allemagne'], crossvals: ['PanelCV', 'OCOMCV'], models: ['Lasso', 'Ridge'], noise: 0.55 }),
  };
}

/* ────────────── 1bis. Intervalles de confiance + prévision (linechart) ──── */

/**
 * Builds confidence-interval rows aligned on line rows: two symmetric bands
 * (68 % / 95 %) around each row's `PIB`, carrying the same series columns so the
 * overlay can look them up by (Date · series key).
 *
 * @param {Array<object>} rows - Line rows ({ Date, PIB, Country, CrossVal, … }).
 * @param {number} [seed=11] - RNG seed (band-width jitter).
 * @returns {Array<object>} Rows { …series, lo1, hi1, lo2, hi2 } around PIB.
 */
export function makeLineCI(rows, seed = 11) {
  const rng = mulberry32(seed);
  return rows.map((r) => {
    const w = 1.6 + rng() * 1.4; // demi-largeur bande 68 %
    return {
      ...r,
      lo1: +(r.PIB - w).toFixed(2), hi1: +(r.PIB + w).toFixed(2),
      lo2: +(r.PIB - w * 1.9).toFixed(2), hi2: +(r.PIB + w * 1.9).toFixed(2),
    };
  });
}

/**
 * Builds a projected ("forecast") variant of line rows: a growing per-series
 * divergence so the after-bar projection reads distinctly from the real series.
 *
 * @param {Array<object>} rows - Line rows.
 * @param {number} [seed=12] - RNG seed.
 * @returns {Array<object>} Rows with a shifted `PIB`.
 */
export function makeLineForecast(rows, seed = 12) {
  const rng = mulberry32(seed);
  const idxOf = new Map();
  return rows.map((r) => {
    const k = `${r.Country}|${r.CrossVal}|${r.Model}`;
    const i = idxOf.get(k) || 0;
    idxOf.set(k, i + 1);
    const drift = i * 0.12 + (rng() - 0.5) * 1.2;
    return { ...r, PIB: +(r.PIB + 4 + drift).toFixed(2) };
  });
}

/**
 * Aggregates rows to one mean value per (position · hue) pair.
 *
 * @param {Array<object>} rows - Source rows.
 * @param {string} posCol - Position (band) column.
 * @param {string} hueCol - Hue (color) column.
 * @param {string} valCol - Value column.
 * @returns {Array<object>} Aggregated rows { [posCol], [hueCol], mean }.
 */
function aggregateBy(rows, posCol, hueCol, valCol) {
  const m = new Map();
  for (const r of rows) {
    const k = `${r[posCol]}|${r[hueCol]}`;
    if (!m.has(k)) m.set(k, { pos: r[posCol], hue: r[hueCol], vals: [] });
    m.get(k).vals.push(+r[valCol]);
  }
  return [...m.values()].map((g) => ({
    [posCol]: g.pos, [hueCol]: g.hue,
    mean: g.vals.reduce((a, b) => a + b, 0) / g.vals.length,
  }));
}

/* ────────────── 2. Bar — catégoriel x + num y + hue ─────────────────────── */

/**
 * Vertical-bar demo dataset (sector value added by year/scenario/method).
 *
 * @param {number} [seed=2] - RNG seed.
 * @returns {Array<object>} Rows { Secteur, Année, Scénario, Méthode, ValeurAjoutée }.
 */
export function makeBarData(seed = 2) {
  const rng = mulberry32(seed);
  const sectors = ['Industrie', 'Services marchands', 'Construction', 'Agriculture', 'Énergie', 'Administration publique'];
  const years = [2023, 2024];
  const scenarios = ['Central', 'Stress'];
  const methods = ['INSEE', 'Eurostat'];
  const out = [];
  const base = { Industrie: 380, 'Services marchands': 920, Construction: 180, Agriculture: 80, 'Énergie': 140, 'Administration publique': 510 };
  for (const s of sectors) {
    for (const y of years) {
      for (const sc of scenarios) {
        for (const me of methods) {
          const v = base[s]
            * (1 + (y - 2023) * 0.025 + (rng() - 0.5) * 0.05)
            * (sc === 'Stress' ? 0.92 : 1)
            * (me === 'Eurostat' ? 1.03 : 1);
          out.push({ Secteur: s, Année: String(y), Scénario: sc, Méthode: me, ValeurAjoutée: +v.toFixed(1) });
        }
      }
    }
  }
  return out;
}

/**
 * Confidence-interval rows for the vertical-bar demo (one row per Secteur × Année,
 * two bands around the mean ValeurAjoutée).
 *
 * @param {number} [seed=21] - RNG seed.
 * @returns {Array<object>} Rows { Secteur, Année, lo1, hi1, lo2, hi2 }.
 */
export function makeBarCI(seed = 21) {
  const rng = mulberry32(seed);
  return aggregateBy(makeBarData(), 'Secteur', 'Année', 'ValeurAjoutée').map((g) => {
    const w = g.mean * 0.04 * (1 + rng() * 0.6);
    return {
      Secteur: g.Secteur, Année: g.Année,
      lo1: +(g.mean - w).toFixed(1), hi1: +(g.mean + w).toFixed(1),
      lo2: +(g.mean - w * 1.9).toFixed(1), hi2: +(g.mean + w * 1.9).toFixed(1),
    };
  });
}

/* ────────────── 3. Heatmap — cat × cat + num z ──────────────────────────── */

/**
 * Heatmap demo dataset (inflation by country × month).
 *
 * @param {number} [seed=3] - RNG seed.
 * @returns {Array<object>} Rows { Pays, Mois, Inflation }.
 */
export function makeHeatmapData(seed = 3) {
  const rng = mulberry32(seed);
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
  const countries = [...COUNTRIES, 'Pays-Bas', 'Belgique', 'Pologne', 'Autriche', 'Portugal', 'Suède'];
  const out = [];
  for (const c of countries) {
    for (let i = 0; i < months.length; i++) {
      const m = months[i];
      const baseline = { France: 2.4, Allemagne: 2.8, Italie: 3.6, Espagne: 3.2, 'Pays-Bas': 2.6, Belgique: 3.0, Pologne: 4.5, Autriche: 3.4, Portugal: 2.9, Suède: 2.1 }[c] || 3;
      const seasonality = Math.sin(((i - 1) / 12) * Math.PI * 2) * 0.5;
      const v = baseline + seasonality + (rng() - 0.5) * 0.6;
      out.push({ Pays: c, Mois: m, Inflation: +v.toFixed(2) });
    }
  }
  return out;
}

/* ────────────── 4. Density — num x + num y + agg z ──────────────────────── */

/**
 * 2D-density demo dataset (two clusters, hue Type/Source/Période).
 *
 * @param {number} [seed=4] - RNG seed.
 * @returns {Array<object>} Rows { ChômageTaux, EmploiTaux, Densité, Type, Source, Période }.
 */
export function makeDensityData(seed = 4) {
  const rng = mulberry32(seed);
  const out = [];
  for (let k = 0; k < 1200; k++) {
    const inA = rng() < 0.5;
    const src = rng() < 0.5 ? 'Panel' : 'Enquête';
    const per = rng() < 0.5 ? '2014' : '2024';
    const cx0 = inA ? 40 : 70;
    const cy0 = inA ? 60 : 35;
    const srcDX = src === 'Enquête' ? 6 : -6;
    const srcDY = src === 'Enquête' ? -5 : 5;
    const perDX = per === '2024' ? 5 : -5;
    const spread = inA ? 10 : 8.5;
    const xx = cx0 + srcDX + perDX + (rng() - 0.5) * spread * 2.4;
    const yy = cy0 + srcDY + (rng() - 0.5) * spread * 2.4;
    const z = inA ? 80 + rng() * 20 : 30 + rng() * 30;
    out.push({
      ChômageTaux: +xx.toFixed(2), EmploiTaux: +yy.toFixed(2), Densité: +z.toFixed(2),
      Type: inA ? 'Court' : 'Long', Source: src, Période: per,
    });
  }
  return out;
}

/* ────────────── 5. Bar horizontal — num x + cat y + hue ─────────────────── */

/**
 * Horizontal-bar demo dataset (regional adoption by year/scenario/method).
 *
 * @param {number} [seed=5] - RNG seed.
 * @returns {Array<object>} Rows { Région, Année, Scénario, Méthode, Adoption }.
 */
export function makeBarHData(seed = 5) {
  const rng = mulberry32(seed);
  const regions = ['Île-de-France', 'Auvergne-Rhône-Alpes', 'PACA', 'Occitanie', 'Nouvelle-Aquitaine', 'Hauts-de-France'];
  const years = [2023, 2024];
  const scenarios = ['Central', 'Stress'];
  const methods = ['INSEE', 'Eurostat'];
  const out = [];
  const base = { 'Île-de-France': 78, 'Auvergne-Rhône-Alpes': 64, PACA: 58, Occitanie: 52, 'Nouvelle-Aquitaine': 48, 'Hauts-de-France': 44 };
  for (const r of regions) {
    for (const y of years) {
      for (const sc of scenarios) {
        for (const me of methods) {
          const v = base[r]
            * (1 + (y - 2023) * 0.04 + (rng() - 0.5) * 0.06)
            * (sc === 'Stress' ? 0.9 : 1)
            * (me === 'Eurostat' ? 1.04 : 1);
          out.push({ Région: r, Année: String(y), Scénario: sc, Méthode: me, Adoption: +v.toFixed(1) });
        }
      }
    }
  }
  return out;
}

/**
 * Confidence-interval rows for the horizontal-bar demo (one row per Région × Année,
 * two bands around the mean Adoption).
 *
 * @param {number} [seed=22] - RNG seed.
 * @returns {Array<object>} Rows { Région, Année, lo1, hi1, lo2, hi2 }.
 */
export function makeBarHCI(seed = 22) {
  const rng = mulberry32(seed);
  return aggregateBy(makeBarHData(), 'Région', 'Année', 'Adoption').map((g) => {
    const w = g.mean * 0.05 * (1 + rng() * 0.6);
    return {
      Région: g.Région, Année: g.Année,
      lo1: +(g.mean - w).toFixed(1), hi1: +(g.mean + w).toFixed(1),
      lo2: +(g.mean - w * 1.9).toFixed(1), hi2: +(g.mean + w * 1.9).toFixed(1),
    };
  });
}

/* ────────────── 6. Violin — KDE par catégorie ───────────────────────────── */

/**
 * Violin demo dataset (RMSE distribution per model, hue Jeu/Optimiseur/Init).
 *
 * @param {number} [seed=6] - RNG seed.
 * @returns {Array<object>} Rows { Modèle, Jeu, Optimiseur, Init, RMSE, Échantillon }.
 */
export function makeViolinData(seed = 6) {
  const rng = mulberry32(seed);
  const models = ['Lasso', 'Forêt', 'Neural'];
  const baseRmse = { Lasso: 0.84, 'Forêt': 0.66, Neural: 0.53 };
  const spread = { Lasso: 0.1, 'Forêt': 0.13, Neural: 0.16 };
  const baseEch = { Lasso: 180, 'Forêt': 360, Neural: 150 };
  const jeux = ['Validation', 'Test'];
  const optimiseurs = ['Adam', 'SGD'];
  const inits = ['Xavier', 'He'];
  const out = [];
  for (const m of models) {
    for (const jeu of jeux) {
      for (const opt of optimiseurs) {
        for (const init of inits) {
          const jShift = jeu === 'Test' ? 0.06 : 0;
          const jSpread = jeu === 'Test' ? 1.25 : 1;
          const oShift = opt === 'SGD' ? 0.04 : 0;
          const iShift = init === 'He' ? -0.025 : 0;
          for (let i = 0; i < 80; i++) {
            const u1 = Math.max(1e-6, rng());
            const u2 = rng();
            const zn = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            const rmse = baseRmse[m] + jShift + oShift + iShift + zn * spread[m] * jSpread;
            const ech = baseEch[m] + (rng() - 0.5) * 80;
            out.push({
              Modèle: m, Jeu: jeu, Optimiseur: opt, Init: init,
              RMSE: +Math.max(0.05, rmse).toFixed(4), Échantillon: +ech.toFixed(0),
            });
          }
        }
      }
    }
  }
  return out;
}
