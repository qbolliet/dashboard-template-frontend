'use client';

// Importation des modules
import { Chart, ChartsFeatures as F } from '@/features/chart';
import { makeLineByHue, makeLineCI, makeLineForecast } from '@/features/chart/sources/demoData';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — Chart
// =================================================================
// Porté depuis le panneau de contrôle de /test-chart.
//
// PORTÉE — UNE INSTANCE, PAS LES DIX BLOCS. La page d'origine pilotait dix démonstrations
// simultanées (line, bar, bar-h, heatmap, violon ×2, densité, combo ×2, API) avec le même
// panneau. Un playground répond à « que fait cette prop », au singulier : il garde donc la
// série temporelle, la plus riche en canaux. Les neuf autres sont des cas d'usage figés,
// c'est-à-dire des EXEMPLES au sens du §5.2 — trois existent déjà (`chart-basic`,
// `chart-hue`, `chart-stacked-bar`), les six restants relèvent de l'inventaire de P4.6.
// Les pages /test-* restent en place jusque-là : rien n'est perdu.
//
// C'EST LE SCHÉMA QUI JUSTIFIE `toProps`. Aucun de ces contrôles n'est une prop de
// <Chart> : `nHue` découpe la liste des canaux, et tous les autres construisent les
// DESCRIPTEURS de la barre d'outils. Sans étape de dérivation, le code généré décrirait
// des props qui n'existent pas.

// Jeux de démonstration construits une fois (générateurs à graine fixe), au niveau
// module : ils ne dépendent d'aucun contrôle.
const LINE_BY_HUE = makeLineByHue();
const LINE_CI = {};
const LINE_FORECAST = {};
const LINE_FORECAST_CI = {};
for (const level of [0, 1, 2, 3]) {
    LINE_CI[level] = makeLineCI(LINE_BY_HUE[level]);
    LINE_FORECAST[level] = makeLineForecast(LINE_BY_HUE[level]);
    LINE_FORECAST_CI[level] = makeLineCI(LINE_FORECAST[level]);
}

const CI_BOUNDS = { below: ['lo1', 'lo2'], above: ['hi1', 'hi2'] };
const HUE_COLUMNS = ['Country', 'CrossVal', 'Model'];

export const controls = {
    nHue: {
        type: 'radio',
        options: [0, 1, 2, 3],
        label: 'Canaux hue',
        default: 2,
        row: 0,
    },
    fill: {
        type: 'radio',
        options: ['none', 'line', 'fill'],
        labels: { none: 'Aucun', line: 'Ligne', fill: 'Plein' },
        label: 'Remplissage',
        default: 'line',
        row: 0,
    },
    stack: {
        type: 'select',
        options: ['none', 'color', 'style', 'marker', 'all'],
        labels: { none: 'Aucun', color: 'Couleur', style: 'Style', marker: 'Marqueur', all: 'Toutes' },
        label: 'Empilage',
        default: 'none',
        row: 0,
    },
    ciFill: {
        type: 'radio',
        options: ['fill', 'line', 'none'],
        labels: { fill: 'Aire', line: 'Ligne/barres', none: 'Moustaches' },
        label: 'Intervalles de confiance',
        default: 'line',
        row: 1,
    },
    baSide: {
        type: 'radio',
        options: ['before', 'after'],
        labels: { before: 'Avant', after: 'Après' },
        label: 'Projection',
        default: 'after',
        row: 1,
    },
    baReplace: { type: 'boolean', label: 'Remplacer la série', default: false, row: 1 },
    draggable: { type: 'boolean', label: 'Barres déplaçables', default: true, row: 1 },

    projName: { type: 'text', label: 'Nom projection', placeholder: 'Projection', default: 'Projection', row: 2 },
    projColor: { type: 'color', label: 'Couleur projection', default: '#BD2D28', row: 2 },
    projDash: {
        type: 'select',
        options: ['6 4', '2 3', '10 4 2 4'],
        labels: { '6 4': 'Tirets', '2 3': 'Pointillés', '10 4 2 4': 'Mixte' },
        label: 'Trait projection',
        default: '6 4',
        row: 2,
    },

    normName: { type: 'text', label: 'Nom normalisation', placeholder: '100', default: '100', row: 3 },
    normColor: { type: 'color', label: 'Couleur normalisation', default: '#7C4DBE', row: 3 },
    normDash: {
        type: 'select',
        options: ['', '5 4', '2 3'],
        labels: { '': 'Plein', '5 4': 'Tirets', '2 3': 'Pointillés' },
        label: 'Trait normalisation',
        default: '5 4',
        row: 3,
    },

    tickDensity: {
        type: 'radio',
        options: ['sparse', 'normal', 'dense'],
        labels: { sparse: 'Peu', normal: 'Normal', dense: 'Dense' },
        label: 'Densité de ticks',
        default: 'normal',
        row: 4,
    },
    overlap: {
        type: 'select',
        options: ['auto', 'rotate', 'multiline', 'skip'],
        labels: { auto: 'Auto', rotate: 'Rotation 45°', multiline: 'Multi-ligne', skip: 'Skip' },
        label: 'Anti-overlap',
        default: 'auto',
        row: 4,
    },
};

export const scaffold = {
    component: 'Chart',
    imports: [
        "import { Chart, ChartsFeatures as F } from '@/features/chart';",
        "import { makeLineByHue, makeLineCI, makeLineForecast } from '@/features/chart/sources/demoData';",
    ],
    data: 'rows',
    // nHue choisit le JEU DE DONNÉES rendu ; ce n'est pas une prop de <Chart>.
    omit: ['nHue'],
    dataCode: `const rows = makeLineByHue()[2];
const ci = makeLineCI(rows);
const forecast = makeLineForecast(rows);`,
    always: ['x', 'y', 'hue', 'format', 'labels', 'title', 'toolbar', 'defaults', 'height'],
};

export const hint = (
    <>
        Survolez le graphique : la barre d&apos;outils apparaît en haut à droite, et seules
        les options compatibles avec le type de tracé détecté y figurent. Les contrôles
        ci-dessus ne pilotent pas des props de <code>&lt;Chart&gt;</code> — ils construisent
        les <em>descripteurs</em> passés à <code>toolbar</code>, ce que le code généré
        montre tel quel.
    </>
);

/**
 * Maps the control values onto real `<Chart>` props.
 *
 * The toolbar descriptors are tagged with `expr()`: their runtime form is an array of
 * factory results, which would serialize to unreadable object literals, while the code
 * to write is the factory call itself.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = (values) => {
    const {
        nHue, fill, stack, ciFill, baSide, baReplace, draggable,
        projName, projColor, projDash, normName, normColor, normDash,
        tickDensity, overlap,
    } = values;

    const toolbarValue = [
        F.confidenceInterval({
            data: LINE_CI[nHue], ...CI_BOUNDS, fill: ciFill,
            labels: { legend: 'Intervalle', bands: ['68 %', '95 %'] },
        }),
        F.beforeAfter({
            data: LINE_FORECAST[nHue], value: new Date(2023, 4, 1), side: baSide,
            draggable, replace: baReplace,
            label: projName, color: projColor, dash: projDash, labels: { legend: projName },
            ci: { data: LINE_FORECAST_CI[nHue], ...CI_BOUNDS },
        }),
        F.normalize({
            value: new Date(2020, 0, 1), draggable,
            color: normColor, dash: normDash || undefined, label: normName,
        }),
        F.zoom(),
        F.minimaps(),
    ];

    const toolbarCode = `[
    F.confidenceInterval({
      data: ci, below: ['lo1', 'lo2'], above: ['hi1', 'hi2'], fill: '${ciFill}',
      labels: { legend: 'Intervalle', bands: ['68 %', '95 %'] },
    }),
    F.beforeAfter({
      data: forecast, value: new Date(2023, 4, 1), side: '${baSide}',
      draggable: ${draggable}, replace: ${baReplace},
      label: '${projName}', color: '${projColor}', dash: '${projDash}',
    }),
    F.normalize({
      value: new Date(2020, 0, 1), draggable: ${draggable},
      color: '${normColor}',${normDash ? ` dash: '${normDash}',` : ''} label: '${normName}',
    }),
    F.zoom(),
    F.minimaps(),
  ]`;

    return {
        x: 'Date',
        y: 'PIB',
        hue: HUE_COLUMNS.slice(0, nHue),
        fill,
        stack,
        format: { x: '%Y-%m', y: '.3~f' },
        tickDensity,
        overlap,
        labels: { x: 'Date', y: 'PIB (indice 2020 = 100)', color: 'Pays', style: 'Entraînement', marker: 'Modèle' },
        title: 'PIB mensuel — Pays × Entraînement × Modèle',
        toolbar: expr(toolbarCode, toolbarValue),
        defaults: { confidence: true },
        height: 460,
        // Molette : sert à choisir le jeu de données rendu, pas à alimenter une prop.
        nHue,
    };
};

/**
 * Live preview of the chart playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @param {number} props.nHue - Demo-only knob picking the matching dataset.
 * @returns {JSX.Element} The rendered chart.
 */
const ChartPlayground = ({ nHue, ...chartProps }) => (
    <Chart data={LINE_BY_HUE[nHue]} {...chartProps} />
);

export default ChartPlayground;
