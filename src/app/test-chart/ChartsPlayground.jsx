'use client';

// =================================================================
// PAGE /test-chart — PLAYGROUND INTERACTIF (partie client)
// =================================================================
// Calqué sur le TweaksPanel du prototype (design-system/project/ds/charts.html)
// et sur le style de page de test-multi-criterion-menu : un panneau de contrôles
// pilote l'ensemble des 9 blocs de démonstration du prototype (mêmes titres, meta
// et notes) + un 10e bloc « Données API » branché sur useFactTable (mock). Seul ce
// composant est 'use client' — l'entête statique et le tableau d'API restent dans
// le composant serveur page.js.

// Importation des modules
import { useState } from 'react';
import ThemeProvider from '@/features/theme/providers/ThemeProvider';
import ThemeToggleButton from '@/features/theme/components/ThemeToggleButton/ThemeToggleButton';
import { Chart, ChartsFeatures as F, useFactTable } from '@/features/chart';
import {
  makeLineByHue, makeLineCI, makeLineForecast,
  makeBarData, makeBarCI, makeBarHData, makeBarHCI,
  makeHeatmapData, makeDensityData, makeViolinData,
  makeComboMonthly, makeComboQuarterly, makeAreaSeries,
} from '@/features/chart/sources/demoData';
import { CtrlRadio, CtrlSelect, CtrlToggle, CtrlText, CtrlColor } from '../_playground';

// ── Jeux de démonstration construits une fois (générateurs à graine fixe) ────
// Références stables au niveau module : les données ne dépendent d'aucun état du
// panneau, seuls les descripteurs de toolbar sont reconstruits à chaque rendu.
const LINE_BY_HUE = makeLineByHue(); // { 0, 1, 2, 3 } — un jeu par nombre de canaux hue
const HUE_LEVELS = [0, 1, 2, 3];
// IC + projection déclinés par niveau de hue (colonnes de série alignées sur le
// jeu correspondant, cf. prototype : ChartsData.lineCI[nHue], lineForecast[nHue]…).
const LINE_CI = {};
const LINE_FORECAST = {};
const LINE_FORECAST_CI = {};
for (const n of HUE_LEVELS) {
  LINE_CI[n] = makeLineCI(LINE_BY_HUE[n]);
  LINE_FORECAST[n] = makeLineForecast(LINE_BY_HUE[n]);
  LINE_FORECAST_CI[n] = makeLineCI(LINE_FORECAST[n]);
}
const BAR = makeBarData();
const BAR_CI = makeBarCI();
const BAR_H = makeBarHData();
const BAR_H_CI = makeBarHCI();
const HEATMAP = makeHeatmapData();
const DENSITY = makeDensityData();
const VIOLIN = makeViolinData();
const COMBO_MONTHLY = makeComboMonthly();
const COMBO_QUARTERLY = makeComboQuarterly(COMBO_MONTHLY);
const AREA_SERIES = makeAreaSeries();

// Bornes d'IC communes (colonnes basses/hautes des deux bandes).
const CI_BOUNDS = { below: ['lo1', 'lo2'], above: ['hi1', 'hi2'] };

// Barre d'outils « universelle » (zoom + mini-vues) : ne dépend d'AUCUN state du
// panneau ⇒ référence de module figée une fois pour toutes (jamais reconstruite),
// partagée par les blocs violon et API.
const UNIVERSAL_TOOLBAR = [F.zoom(), F.minimaps()];

// ── Métadonnées des blocs (titres, meta, notes) — reprises À L'IDENTIQUE du
//    prototype charts.html (tableau `blocks`). ────────────────────────────────
const BLOCKS = {
  line: { title: 'Linechart', meta: 'date + num + hue', note: "x = date, y = num, hue = catégoriel. Brush x-only sous l'axe." },
  bar: { title: 'Bar chart', meta: 'cat + num + hue', note: '3 canaux hue : Année → couleur, Scénario → hachures, Méthode → marqueur.' },
  'bar-h': { title: 'Bar chart horizontal', meta: 'num + cat + hue', note: "Axes inversés : x = numérique, y = catégoriel. Mini-vue le long de l'axe des ordonnées. 3 canaux hue (couleur / hachures / marqueur)." },
  heatmap: { title: 'Heatmap', meta: 'cat × cat + num z', note: "x = mois, y = pays, z = inflation. fill='line' ⇒ seuls les contours des cases. Légende verticale (repliée) / horizontale (pleine largeur)." },
  'violin-v': { title: 'Violin plot (vertical)', meta: 'cat + num + hue', note: 'KDE epanechnikov + boxplot. hue : 0 (teinté par z) · 1 (couleurs côte à côte) · 2 (+ hachures/pointillés) · 3 (+ marque à la médiane). Empilage : les densités s\'empilent ; une hue binaire ⇒ demi-violons split + autres hues empilées dans chaque moitié.' },
  'violin-h': { title: 'Violin plot (horizontal)', meta: 'num + cat + hue', note: 'Même chart, axes inversés : y = catégoriel, x = continu. Violons couchés.' },
  density: { title: 'Density plot', meta: 'num × num + hue', note: "KDE 2D (d3.contourDensity). fill='fill' (bandes) / 'line' (lignes de niveau). hue : 1 couleurs · 2 + bordures/traits pleins vs pointillés · 3 + marques. Empilage sans effet." },
  'combo-bar': { title: 'Linechart + barchart vertical', meta: 'data = liste de jeux', note: "data = [{ label:'Mensuelle', fill:'line', hue:'Pays' }, { label:'Trimestrielle', fill:'fill', hue:'Pays', categorical-x:true }]. Axe x continu (dates) ; le jeu trimestriel est forcé en barres (categorical-x), positionnées à leur date. « Pays » est commun et de 1er niveau ⇒ France a la même couleur dans la ligne et les barres." },
  'combo-area': { title: 'Linechart + areaplot', meta: 'data = liste de jeux', note: "Même jeu rendu deux fois : { fill:'fill' } (aire) puis { fill:'line' } (ligne). Le 1er jeu de la liste est DEVANT le 2e. Légende = une section par jeu, titrée par label et distinguée par son fill." },
  api: { title: 'Données API', meta: 'useFactTable (mock)', note: "Lignes issues de getFactTableWithMetadata (format OBJECTS), passées TELLES QUELLES à <Chart> : aucun reformatage. La colonne date_obs arrive en chaîne ISO — c'est coerce() qui la convertit en date." },
};

// Options d'affichage : « Tous » + un bloc à la fois (9 démos + bloc API).
const SHOWN_OPTIONS = [
  { value: 'all', label: 'Tous' },
  { value: 'line', label: 'Linechart seul' },
  { value: 'bar', label: 'Bar (vertical) seul' },
  { value: 'bar-h', label: 'Bar horizontal seul' },
  { value: 'heatmap', label: 'Heatmap seul' },
  { value: 'violin-v', label: 'Violin (vertical) seul' },
  { value: 'violin-h', label: 'Violin (horizontal) seul' },
  { value: 'density', label: 'Density seul' },
  { value: 'combo-bar', label: 'Line + barchart (multi-jeux)' },
  { value: 'combo-area', label: 'Line + areaplot (multi-jeux)' },
  { value: 'api', label: 'Données API (useFactTable)' },
];

/** Section titre + corps du bloc de démonstration (entête + note). */
const Block = ({ id, children }) => (
  <section className="charts-block">
    <header className="charts-block-head">
      <h3 className="charts-block-title">{BLOCKS[id].title}</h3>
      <span className="charts-block-meta">{BLOCKS[id].meta}</span>
    </header>
    <p className="charts-block-note">{BLOCKS[id].note}</p>
    {children}
  </section>
);

// ── Blocs de démonstration ────────────────────────────────────────────────────
// Chacun est un composant à part entière qui ne reçoit QUE les states du panneau
// qui le concernent (et construit sa PROPRE barre d'outils à partir de ceux-ci) :
// un changement de state hors de cette liste laisse ses props identiques, donc le
// React Compiler peut bail out son rendu (au lieu de tout recréer avec le pivot
// précédent, qui reconstruisait les 6 tableaux `toolbar` — donc leurs `Chart` — à
// chaque frappe, quel que soit le bloc réellement concerné).

/** Linechart (date + num + hue), IC + projection + normalisation. */
const LineDemo = ({
  nHue, fill, stack, ciFill, baSide, baReplace, draggable,
  projName, projColor, projDash, normName, normColor, normDash,
  tickDensity, overlap,
}) => {
  const ciData = LINE_CI[nHue] || LINE_CI[1];
  const fcData = LINE_FORECAST[nHue] || LINE_FORECAST[1];
  const fcCI = LINE_FORECAST_CI[nHue] || LINE_FORECAST_CI[1];
  const normParams = { color: normColor, dash: normDash || undefined, label: normName };
  const toolbar = [
    F.confidenceInterval({
      data: ciData, ...CI_BOUNDS, fill: ciFill,
      labels: { legend: 'Intervalle', bands: ['68 %', '95 %'] },
    }),
    F.beforeAfter({
      // `data` peut aussi être une fonction (ctx) => rows ; ici un jeu figé.
      data: fcData, value: new Date(2023, 4, 1), side: baSide, draggable, replace: baReplace,
      // Apparence paramétrable : nom, couleur (distinction à hue 0), type de trait.
      label: projName, color: projColor, dash: projDash, labels: { legend: projName },
      // IC propre à la projection — visible quand l'IC de la barre est actif.
      ci: { data: fcCI, ...CI_BOUNDS },
    }),
    F.normalize({ value: new Date(2020, 0, 1), draggable, ...normParams }),
    F.zoom(), F.minimaps(),
  ];
  return (
    <Block id="line">
      <Chart
        data={LINE_BY_HUE[nHue]}
        x="Date" y="PIB" hue={['Country', 'CrossVal', 'Model'].slice(0, nHue)}
        fill={fill} stack={stack}
        format={{ x: '%Y-%m', y: '.3~f' }}
        tickDensity={tickDensity} overlap={overlap}
        labels={{ x: 'Date', y: 'PIB (indice 2020 = 100)', color: 'Pays', style: 'Entraînement', marker: 'Modèle' }}
        title="PIB mensuel — Pays × Entraînement × Modèle"
        toolbar={toolbar}
        defaults={{ confidence: true }}
        height={460} />
    </Block>
  );
};

/** Bar chart vertical (cat + num + hue), IC + normalisation. */
const BarDemo = ({ nHue, fill, stack, ciFill, draggable, normName, normColor, normDash, tickDensity, overlap }) => {
  const normParams = { color: normColor, dash: normDash || undefined, label: normName };
  const toolbar = [
    F.confidenceInterval({
      data: BAR_CI, ...CI_BOUNDS, fill: ciFill,
      labels: { legend: 'Intervalle', bands: ['±1', '±2'] },
    }),
    F.normalize({ value: 'Industrie', draggable, ...normParams }),
    F.zoom(), F.minimaps(),
  ];
  return (
    <Block id="bar">
      <Chart
        data={BAR}
        x="Secteur" y="ValeurAjoutée" hue={['Année', 'Scénario', 'Méthode'].slice(0, nHue)}
        fill={fill} stack={stack}
        format={{ y: '.3~s' }}
        tickDensity={tickDensity} overlap={overlap}
        maxLabelLength={{ x: 14 }}
        labels={{ x: 'Secteur (NAF A06)', y: 'Valeur ajoutée (Md€)', color: 'Année', style: 'Scénario', marker: 'Méthode' }}
        title="Valeur ajoutée brute par secteur"
        toolbar={toolbar}
        height={440} />
    </Block>
  );
};

/** Bar chart horizontal (num + cat + hue), IC + normalisation. */
const BarHDemo = ({ nHue, fill, stack, ciFill, draggable, normName, normColor, normDash, tickDensity, overlap }) => {
  const normParams = { color: normColor, dash: normDash || undefined, label: normName };
  const toolbar = [
    F.confidenceInterval({
      data: BAR_H_CI, ...CI_BOUNDS, fill: ciFill,
      labels: { legend: 'Intervalle', bands: ['±1', '±2'] },
    }),
    F.normalize({ value: 'Île-de-France', draggable, ...normParams }),
    F.zoom(), F.minimaps(),
  ];
  return (
    <Block id="bar-h">
      <Chart
        data={BAR_H}
        x="Adoption" y="Région" hue={['Année', 'Scénario', 'Méthode'].slice(0, nHue)}
        fill={fill} stack={stack}
        format={{ x: '.0f' }}
        tickDensity={tickDensity} overlap={overlap}
        maxLabelLength={{ y: 22 }}
        labels={{ x: "Taux d'adoption (%)", y: 'Région', color: 'Année', style: 'Scénario', marker: 'Méthode' }}
        title="Taux d'adoption par région (axes inversés)"
        toolbar={toolbar}
        height={460} />
    </Block>
  );
};

/** Heatmap (cat × cat + num z) — normalisation en réticule + zoom/mini-vues. */
const HeatmapDemo = ({ fill, draggable, normName, normColor, normDash, tickDensity, overlap }) => {
  const normParams = { color: normColor, dash: normDash || undefined, label: normName };
  // Charts x,y,z : la normalisation devient un RÉTICULE déplaçable sur un point.
  const toolbar = [F.normalize({ value: { x: 'Juin', y: 'France' }, draggable, ...normParams }), F.zoom(), F.minimaps()];
  return (
    <Block id="heatmap">
      <Chart
        data={HEATMAP}
        x="Mois" y="Pays" z="Inflation"
        fill={fill}
        format={{ z: '.2f' }}
        tickDensity={tickDensity} overlap={overlap}
        labels={{ x: 'Mois', y: 'Pays', z: 'Inflation (%)' }}
        title="Inflation mensuelle par pays"
        toolbar={toolbar}
        height={460} />
    </Block>
  );
};

/** Violin plot vertical (cat + num + hue) — toolbar universelle (zoom/mini-vues). */
const ViolinVDemo = ({ nHue, fill, stack, tickDensity, overlap }) => (
  <Block id="violin-v">
    <Chart
      data={VIOLIN}
      x="Modèle" y="RMSE" z="Échantillon" hue={['Jeu', 'Optimiseur', 'Init'].slice(0, nHue)}
      fill={fill} stack={stack}
      format={{ y: '.2f', z: '.0f' }}
      tickDensity={tickDensity} overlap={overlap}
      labels={{ x: 'Modèle', y: 'RMSE (validation)', z: 'Échantillon moyen', color: 'Jeu', style: 'Optimiseur', marker: 'Initialisation' }}
      title="Distribution de RMSE par modèle"
      toolbar={UNIVERSAL_TOOLBAR}
      height={460} />
  </Block>
);

/** Violin plot horizontal (num + cat + hue) — toolbar universelle (zoom/mini-vues). */
const ViolinHDemo = ({ nHue, fill, stack, tickDensity, overlap }) => (
  <Block id="violin-h">
    <Chart
      data={VIOLIN}
      x="RMSE" y="Modèle" z="Échantillon" hue={['Jeu', 'Optimiseur', 'Init'].slice(0, nHue)}
      fill={fill} stack={stack}
      format={{ x: '.2f', z: '.0f' }}
      tickDensity={tickDensity} overlap={overlap}
      maxLabelLength={{ y: 14 }}
      labels={{ x: 'RMSE (validation)', y: 'Modèle', z: 'Échantillon moyen', color: 'Jeu', style: 'Optimiseur', marker: 'Initialisation' }}
      title="Distribution de RMSE par modèle (axes inversés)"
      toolbar={UNIVERSAL_TOOLBAR}
      height={460} />
  </Block>
);

/** Density plot (num × num + hue) — normalisation en réticule + zoom/mini-vues. */
const DensityDemo = ({ nHue, fill, draggable, normName, normColor, normDash, tickDensity, overlap }) => {
  const normParams = { color: normColor, dash: normDash || undefined, label: normName };
  const toolbar = [F.normalize({ value: { x: 55, y: 50 }, draggable, ...normParams }), F.zoom(), F.minimaps()];
  return (
    <Block id="density">
      <Chart
        data={DENSITY}
        x="ChômageTaux" y="EmploiTaux" z="Densité" hue={['Type', 'Source', 'Période'].slice(0, nHue)}
        fill={fill}
        format={{ x: '.0f', y: '.0f', z: '.0f' }}
        tickDensity={tickDensity} overlap={overlap}
        labels={{ x: 'Taux de chômage (%)', y: "Taux d'emploi (%)", z: 'Densité moyenne', color: 'Type', style: 'Source', marker: 'Période' }}
        title="Densité chômage × emploi (KDE 2D)"
        toolbar={toolbar}
        height={500} />
    </Block>
  );
};

/** Multi-jeux : linechart mensuel + barchart trimestriel (pas de toolbar). */
const ComboBarDemo = ({ tickDensity, overlap }) => (
  <Block id="combo-bar">
    <Chart
      x="Date" y="Croissance"
      data={[
        { label: 'Mensuelle', data: COMBO_MONTHLY, fill: 'line', hue: 'Pays' },
        { label: 'Trimestrielle', data: COMBO_QUARTERLY, fill: 'fill', hue: 'Pays', 'categorical-x': true },
      ]}
      format={{ x: '%Y-%m', y: '.1f' }}
      tickDensity={tickDensity} overlap={overlap}
      labels={{ x: 'Date', y: 'Croissance (%)' }}
      title="Croissance — mensuelle (ligne) + trimestrielle (barres)"
      height={460} />
  </Block>
);

/** Multi-jeux : même jeu rendu en aire puis en ligne (pas de toolbar). */
const ComboAreaDemo = ({ tickDensity, overlap }) => (
  <Block id="combo-area">
    <Chart
      x="Date" y="Production"
      data={[
        { label: 'Ligne', data: AREA_SERIES, fill: 'line', hue: 'Pays' },
        { label: 'Aire', data: AREA_SERIES, fill: 'fill', hue: 'Pays' },
      ]}
      format={{ x: '%Y-%m', y: '.0f' }}
      tickDensity={tickDensity} overlap={overlap}
      labels={{ x: 'Date', y: 'Production (indice)' }}
      title="Production — aire + ligne (même jeu)"
      height={460} />
  </Block>
);

/** 10e bloc — passage direct des lignes de l'API (useFactTable) au <Chart>. */
const ApiDemo = ({ tickDensity, overlap, apiRows, apiMeta, apiLoading, apiError }) => (
  <Block id="api">
    {apiError ? (
      <p className="charts-api-status charts-api-status--error">Erreur de chargement : {String(apiError)}</p>
    ) : apiLoading ? (
      <p className="charts-api-status">Chargement des données API…</p>
    ) : (
      <>
        <Chart
          data={apiRows}
          x="date_obs" y="gdp" hue="country"
          format={{ x: '%Y-%m', y: '.1f' }}
          tickDensity={tickDensity} overlap={overlap}
          labels={{ x: "Date d'observation", y: 'PIB (indice)', color: 'Pays' }}
          title="PIB par pays — getFactTableWithMetadata (mock)"
          toolbar={UNIVERSAL_TOOLBAR}
          height={420} />
        {apiMeta && (
          <p className="charts-api-status">
            {apiMeta.count} lignes · extents PIB [{apiMeta.extents?.gdp?.join(' ; ')}] (issus de metadata.extents)
          </p>
        )}
      </>
    )}
  </Block>
);

const ChartsPlayground = () => {
  // ── Panneau de contrôle (défauts alignés sur TWEAK_DEFAULTS du prototype) ──
  const [shown, setShown] = useState('all');
  const [nHue, setNHue] = useState(2);
  const [fill, setFill] = useState('line');
  const [stack, setStack] = useState('none');
  const [ciFill, setCiFill] = useState('line');
  const [baSide, setBaSide] = useState('after');
  const [baReplace, setBaReplace] = useState(false);
  const [draggable, setDraggable] = useState(true);
  const [projName, setProjName] = useState('Projection');
  const [projColor, setProjColor] = useState('#BD2D28');
  const [projDash, setProjDash] = useState('6 4');
  const [normName, setNormName] = useState('100');
  const [normColor, setNormColor] = useState('#7C4DBE');
  const [normDash, setNormDash] = useState('5 4');
  const [tickDensity, setTickDensity] = useState('normal');
  const [overlap, setOverlap] = useState('auto');

  // ── Données API (mock → getFactTableWithMetadata) ──
  const { rows: apiRows, metadata: apiMeta, loading: apiLoading, error: apiError } = useFactTable();

  // Un seul bloc ou tous.
  const visible = (id) => shown === 'all' || shown === id;

  return (
    <ThemeProvider>
      <div className="charts-playground">
        {/* ── Panneau de contrôle ── */}
        <section className="tp-section">
          <div className="charts-panel-head">
            <h2 className="tp-h2">Panneau de contrôle</h2>
            <ThemeToggleButton />
          </div>

          <div className="ctrl-row">
            <CtrlSelect label="Graphique" options={SHOWN_OPTIONS} value={shown} onChange={setShown} />
          </div>

          <div className="ctrl-row">
            <CtrlRadio
              label="Canaux hue"
              options={[{ value: 0, label: '0' }, { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }]}
              value={nHue} onChange={setNHue} />
            <CtrlRadio
              label="Remplissage"
              options={[{ value: 'none', label: 'Aucun' }, { value: 'line', label: 'Ligne' }, { value: 'fill', label: 'Plein' }]}
              value={fill} onChange={setFill} />
            <CtrlSelect
              label="Empilage"
              options={[
                { value: 'none', label: 'Aucun' }, { value: 'color', label: 'Couleur' },
                { value: 'style', label: 'Style' }, { value: 'marker', label: 'Marqueur' },
                { value: 'all', label: 'Toutes' },
              ]}
              value={stack} onChange={setStack} />
          </div>

          <div className="ctrl-row">
            <CtrlRadio
              label="Intervalles de confiance"
              options={[{ value: 'fill', label: 'Aire' }, { value: 'line', label: 'Ligne/barres' }, { value: 'none', label: 'Moustaches' }]}
              value={ciFill} onChange={setCiFill} />
            <CtrlRadio
              label="Projection"
              options={[{ value: 'before', label: 'Avant' }, { value: 'after', label: 'Après' }]}
              value={baSide} onChange={setBaSide} />
            <CtrlToggle label="Remplacer la série" value={baReplace} onChange={setBaReplace} />
            <CtrlToggle label="Barres déplaçables" value={draggable} onChange={setDraggable} />
          </div>

          <div className="ctrl-row">
            <CtrlText label="Nom projection" value={projName} placeholder="Projection" onChange={setProjName} />
            <CtrlColor label="Couleur projection" value={projColor} onChange={setProjColor} />
            <CtrlSelect
              label="Trait projection"
              options={[{ value: '6 4', label: 'Tirets' }, { value: '2 3', label: 'Pointillés' }, { value: '10 4 2 4', label: 'Mixte' }]}
              value={projDash} onChange={setProjDash} />
          </div>

          <div className="ctrl-row">
            <CtrlText label="Nom normalisation" value={normName} placeholder="100" onChange={setNormName} />
            <CtrlColor label="Couleur normalisation" value={normColor} onChange={setNormColor} />
            <CtrlSelect
              label="Trait normalisation"
              options={[{ value: '', label: 'Plein' }, { value: '5 4', label: 'Tirets' }, { value: '2 3', label: 'Pointillés' }]}
              value={normDash} onChange={setNormDash} />
          </div>

          <div className="ctrl-row">
            <CtrlRadio
              label="Densité de ticks"
              options={[{ value: 'sparse', label: 'Peu' }, { value: 'normal', label: 'Normal' }, { value: 'dense', label: 'Dense' }]}
              value={tickDensity} onChange={setTickDensity} />
            <CtrlSelect
              label="Anti-overlap"
              options={[
                { value: 'auto', label: 'Auto' }, { value: 'rotate', label: 'Rotation 45°' },
                { value: 'multiline', label: 'Multi-ligne' }, { value: 'skip', label: 'Skip' },
              ]}
              value={overlap} onChange={setOverlap} />
          </div>

          <p className="ctrl-hint">
            Survolez un graphique → barre d&apos;outils en haut à droite. Activez-y les
            options (intervalles, avant/après, normalisation, zoom molette, mini-vues) ;
            seules celles compatibles avec le type détecté apparaissent.
          </p>
        </section>

        {/* ── Blocs de démonstration ── */}
        <section className="tp-section charts-demos">
          {visible('line') && (
            <LineDemo
              nHue={nHue} fill={fill} stack={stack} ciFill={ciFill} baSide={baSide} baReplace={baReplace}
              draggable={draggable} projName={projName} projColor={projColor} projDash={projDash}
              normName={normName} normColor={normColor} normDash={normDash}
              tickDensity={tickDensity} overlap={overlap} />
          )}

          {visible('bar') && (
            <BarDemo
              nHue={nHue} fill={fill} stack={stack} ciFill={ciFill} draggable={draggable}
              normName={normName} normColor={normColor} normDash={normDash}
              tickDensity={tickDensity} overlap={overlap} />
          )}

          {visible('bar-h') && (
            <BarHDemo
              nHue={nHue} fill={fill} stack={stack} ciFill={ciFill} draggable={draggable}
              normName={normName} normColor={normColor} normDash={normDash}
              tickDensity={tickDensity} overlap={overlap} />
          )}

          {visible('heatmap') && (
            <HeatmapDemo
              fill={fill} draggable={draggable}
              normName={normName} normColor={normColor} normDash={normDash}
              tickDensity={tickDensity} overlap={overlap} />
          )}

          {visible('violin-v') && (
            <ViolinVDemo nHue={nHue} fill={fill} stack={stack} tickDensity={tickDensity} overlap={overlap} />
          )}

          {visible('violin-h') && (
            <ViolinHDemo nHue={nHue} fill={fill} stack={stack} tickDensity={tickDensity} overlap={overlap} />
          )}

          {visible('density') && (
            <DensityDemo
              nHue={nHue} fill={fill} draggable={draggable}
              normName={normName} normColor={normColor} normDash={normDash}
              tickDensity={tickDensity} overlap={overlap} />
          )}

          {visible('combo-bar') && <ComboBarDemo tickDensity={tickDensity} overlap={overlap} />}

          {visible('combo-area') && <ComboAreaDemo tickDensity={tickDensity} overlap={overlap} />}

          {visible('api') && (
            <ApiDemo
              tickDensity={tickDensity} overlap={overlap}
              apiRows={apiRows} apiMeta={apiMeta} apiLoading={apiLoading} apiError={apiError} />
          )}
        </section>
      </div>
    </ThemeProvider>
  );
};

export default ChartsPlayground;
