'use client';

// Importation des modules
import { Globe } from '@/features/globe';
import {
    GLOBE_POINTS, GLOBE_ARCS, GLOBE_POINT_LABELS, GLOBE_ARC_LABELS, demoPointIcon,
} from '@/features/globe/sources/demoData';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — Globe
// =================================================================
// Porté depuis le panneau « Démos » de /test-globe (bloc `network`, le plus riche en
// accesseurs : icône conditionnelle à `value`). Les huit premiers contrôles pilotent
// l'état initial des outils, regroupé dans la prop `defaults` comme sur <Chart> :
// `toProps` n'y range que les clés qui s'écartent du défaut, pour que le code généré
// reste minimal. Les suivants règlent les deux calques (`points`, `arcs`) : mark, hue
// et z, la syntaxe de <Chart>.
//
// Les DONNÉES des calques et l'accesseur d'icône NE SONT PAS des contrôles : ce sont des
// CONSTANTES du jeu de démo, réintroduites par `toProps` (via `expr()`, pour que le code
// généré référence les identifiants importés plutôt que de sérialiser 13 points en JSON)
// et listées dans `scaffold.always` — sans quoi la règle « prop à son défaut = omise »
// les ferait disparaître du code généré, puisqu'elles ne varient jamais avec les
// contrôles (même piège que `icon`/`badge` dans le playground StatCard).
//
// LACUNE CONNUE — « mouvements réduits ». `Globe.jsx` (src/features/globe/components/
// Globe/Globe.jsx, effet de montage) force `rotate` ET `arcsDynamic` à false juste après
// le montage quand `prefersReducedMotion()` répond vrai, quoi que dise `defaults` — la
// préférence système gagne toujours. Ce playground ne simule PAS cette préférence (il
// n'y a pas de bascule OS pilotable dans le navigateur de contrôle) : le contrôle
// `rotate` ci-dessous restera donc sans effet visible pour quiconque teste avec
// `prefers-reduced-motion: reduce` activé au niveau OS. Couverture laissée à une future
// suite Playwright (`page.emulateMedia`), pas à ce playground.

// État initial des outils (prop `defaults`) : contrôle -> défaut du composant.
const TOOL_DEFAULTS = {
    mode: 'globe',
    rotate: true,
    wheelZoom: true,
    points: true,
    arcs: true,
    tooltips: true,
    arcsDynamic: false,
    expanded: false,
};

export const controls = {
    mode: {
        type: 'radio',
        options: ['globe', 'plane'],
        labels: { globe: 'Globe', plane: 'Planisphère' },
        label: 'Projection initiale',
        default: 'globe',
        row: 0,
    },
    rotate: { type: 'boolean', label: 'Rotation auto', default: true, row: 1 },
    wheelZoom: { type: 'boolean', label: 'Zoom molette', default: true, row: 1 },
    points: { type: 'boolean', label: 'Points', default: true, row: 1 },
    arcs: { type: 'boolean', label: 'Flux', default: true, row: 2 },
    tooltips: { type: 'boolean', label: 'Tooltips', default: true, row: 2 },
    arcsDynamic: { type: 'boolean', label: 'Flux dynamiques', default: false, row: 2 },
    expanded: { type: 'boolean', label: 'Agrandi (légende au-dessus)', default: false, row: 3 },
    pointMark: {
        type: 'radio',
        options: ['badge', 'bubble'],
        labels: { badge: 'Badges', bubble: 'Bulles' },
        label: 'Mark des points',
        default: 'badge',
        row: 4,
    },
    pointHue: {
        type: 'radio',
        options: ['none', 'color', 'all'],
        labels: { none: 'Aucun', color: 'Couleur', all: 'Couleur + style + forme' },
        label: 'Hue des points',
        default: 'none',
        row: 4,
    },
    pointZ: { type: 'boolean', label: 'Aire ∝ activité (z)', default: false, row: 5 },
    arcMark: {
        type: 'radio',
        options: ['arrow', 'line', 'glow'],
        labels: { arrow: 'Flèches', line: 'Traits', glow: 'Décoratif' },
        label: 'Mark des flux',
        default: 'arrow',
        row: 6,
    },
    arcHue: {
        type: 'radio',
        options: ['none', 'color', 'both'],
        labels: { none: 'Aucun', color: 'Couleur', both: 'Couleur + style' },
        label: 'Hue des flux',
        default: 'none',
        row: 6,
    },
    arcZ: { type: 'boolean', label: 'Épaisseur ∝ volume (z)', default: false, row: 7 },
};

// Contrôles hue -> valeur de `hue` : colonnes de GLOBE_POINTS (`region`, `niveau`,
// `type`) et de GLOBE_ARCS (`mode`, `kind`). Un badge n'encode que la couleur : la
// liste complète y est tronquée par le composant, comme `hue` sur <Chart>.
const POINT_HUE = { none: null, color: 'region', all: ['region', 'niveau', 'type'] };
const ARC_HUE = { none: null, color: 'mode', both: ['mode', 'kind'] };
// Canaux encodés par chaque valeur de contrôle, pour ne titrer que ceux-là.
const POINT_CHANNELS = { none: [], color: ['color'], all: ['color', 'style', 'marker'] };
const ARC_CHANNELS = { none: [], color: ['color'], both: ['color', 'style'] };

/**
 * Picks the data titles of the encoded channels only, so that the generated code
 * does not carry labels the globe would never show.
 *
 * @param {Object} all - Every title of the layer (`color`, `style`, `marker`, `z`).
 * @param {string[]} channels - Encoded hue channels.
 * @param {boolean} z - Whether `z` is encoded.
 * @returns {?Object} Titles to pass as `labels`, or null when nothing is encoded.
 */
const labelsFor = (all, channels, z) => {
    const picked = Object.fromEntries([...channels, ...(z ? ['z'] : [])].map((k) => [k, all[k]]));
    return Object.keys(picked).length ? picked : null;
};

export const scaffold = {
    component: 'Globe',
    imports: [
        "import { Globe } from '@/features/globe';",
        "import { GLOBE_POINTS, GLOBE_ARCS, GLOBE_POINT_LABELS, GLOBE_ARC_LABELS, demoPointIcon } from '@/features/globe/sources/demoData';",
    ],
    // Calques réintroduits par toProps (cf. en-tête) : sans contrôle propre, la règle
    // « prop à son défaut = omise » les supprimerait.
    always: ['points', 'arcs'],
};

export const hint = (
    <>
        Glissez pour orienter le globe, molette pour zoomer, survolez un point pour sa
        tooltip ou un flux pour la sienne. La toolbar (haut-droit, au survol) reflète
        exactement les huit premiers interrupteurs ci-dessus — décochez-en un pour voir le
        bouton correspondant changer d&apos;état. Avec une légende, survolez une modalité
        pour mettre ses points ou ses flux en avant, et « Agrandir » la passe au-dessus du
        globe.
    </>
);

/**
 * Maps the control values onto real `<Globe>` props.
 *
 * The dataset and its icon accessor are constants of the demo, not controls: they are
 * tagged with `expr()` so the generated snippet references the imported identifiers
 * (`GLOBE_POINTS`, `demoPointIcon`, …) instead of inlining the whole dataset as a
 * JSON-like object literal. Each layer spec only carries the keys that differ from the
 * component defaults, and the tool controls are folded into `defaults` the same way.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = (values) => {
    const { pointMark, pointHue, pointZ, arcMark, arcHue, arcZ } = values;
    const defaults = Object.fromEntries(
        Object.entries(TOOL_DEFAULTS)
            .filter(([key, fallback]) => values[key] !== fallback)
            .map(([key]) => [key, values[key]]),
    );
    // Un badge n'encode que la couleur : seuls les titres réellement affichés suivent.
    const pointChannels = pointMark === 'badge' ? POINT_CHANNELS[pointHue].slice(0, 1) : POINT_CHANNELS[pointHue];
    const pointLabels = labelsFor(GLOBE_POINT_LABELS, pointChannels, pointZ);
    const arcLabels = labelsFor(GLOBE_ARC_LABELS, ARC_CHANNELS[arcHue], arcZ);
    // Titres sérialisés en littéral (pas d'expr()) : le code généré reste autonome.
    // `undefined` = clé omise du code généré.
    return {
        points: {
            data: expr('GLOBE_POINTS', GLOBE_POINTS),
            mark: pointMark === 'badge' ? undefined : pointMark,
            icon: pointMark === 'badge' ? expr('demoPointIcon', demoPointIcon) : undefined,
            hue: POINT_HUE[pointHue] ?? undefined,
            z: pointZ ? 'value' : undefined,
            labels: pointLabels ?? undefined,
        },
        arcs: {
            data: expr('GLOBE_ARCS', GLOBE_ARCS),
            mark: arcMark === 'arrow' ? undefined : arcMark,
            hue: ARC_HUE[arcHue] ?? undefined,
            z: arcZ ? 'volume' : undefined,
            labels: arcLabels ?? undefined,
        },
        defaults: Object.keys(defaults).length ? defaults : null,
    };
};

/**
 * Live preview of the globe playground.
 *
 * @param {Object} props - Props derived from the controls: the two layer specs
 *   (`points`, `arcs`) and `defaults`.
 * @returns {JSX.Element} The rendered globe.
 */
const GlobePlayground = (globeProps) => (
    // `key` sur tout ce que le globe fige au montage (contrat de useGlobeEngine) :
    // mark, hue et z des deux calques, état initial des outils. En changer doit
    // remonter le globe pour que la scène le reflète. Les données, constantes, en
    // sont exclues (leur sérialisation serait coûteuse et ne change jamais).
    <Globe
        key={JSON.stringify([
            { ...globeProps.points, data: null, icon: !!globeProps.points?.icon },
            { ...globeProps.arcs, data: null },
            globeProps.defaults ?? null,
        ])}
        {...globeProps} height={460} />
);

export default GlobePlayground;
