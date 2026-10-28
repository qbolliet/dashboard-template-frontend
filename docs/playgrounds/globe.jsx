'use client';

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, GLOBE_LABELS, demoPointIcon, pointColor } from '@/features/globe/sources/demoData';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — Globe
// =================================================================
// Porté depuis le panneau « Démos » de /test-globe (bloc `network`, le plus riche en
// accesseurs : icône et couleur conditionnelles à `value`). Les huit premiers contrôles
// pilotent l'état initial des outils, regroupé dans la prop `defaults` comme sur
// <Chart> : `toProps` n'y range que les clés qui s'écartent du défaut, pour que le code
// généré reste minimal. Les suivants règlent le dessin des flux et des points.
//
// `points`/`arcs`/`iconFor`/`colorFor` NE SONT PAS des contrôles : ce sont des
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
    arcVariant: {
        type: 'radio',
        options: ['arrow', 'line', 'glow'],
        labels: { arrow: 'Flèches', line: 'Traits', glow: 'Décoratif' },
        label: 'Dessin des flux',
        default: 'arrow',
        row: 4,
    },
    arcHue: {
        type: 'radio',
        options: ['none', 'mode', 'both'],
        labels: { none: 'Aucun', mode: 'Couleur', both: 'Couleur + style' },
        label: 'Encodage hue des flux',
        default: 'none',
        row: 4,
    },
    pointVariant: {
        type: 'radio',
        options: ['badge', 'dot'],
        labels: { badge: 'Badges', dot: 'Points sobres' },
        label: 'Apparence des points',
        default: 'badge',
        row: 5,
    },
    pointPulse: { type: 'boolean', label: 'Halo animé', default: true, row: 5 },
    pointSize: {
        type: 'radio',
        options: ['default', 'small', 'value'],
        labels: { default: 'Par défaut', small: '8 px', value: 'Aire ∝ value' },
        label: 'Taille des points',
        default: 'default',
        row: 6,
    },
};

// Contrôle `arcHue` -> valeur de la prop : aucune hue, la couleur seule (`mode`), ou la
// couleur et le style de trait (`mode` puis `kind`, colonnes de GLOBE_ARCS).
const ARC_HUE = { none: null, mode: 'mode', both: ['mode', 'kind'] };
// Contrôle `pointSize` -> valeur de la prop : diamètre du variant, 8 px fixes, ou
// aire proportionnelle à la clé `value` des points.
const POINT_SIZE = { default: null, small: 8, value: 'value' };

export const scaffold = {
    component: 'Globe',
    imports: [
        "import { Globe } from '@/features/globe';",
        "import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor } from '@/features/globe/sources/demoData';",
    ],
    // Constantes réintroduites par toProps (cf. en-tête) : toujours égales à leur
    // « défaut » puisqu'aucun contrôle ne les fait varier — la règle 1 les supprimerait.
    always: ['points', 'arcs', 'iconFor', 'colorFor'],
};

export const hint = (
    <>
        Glissez pour orienter le globe, molette pour zoomer, survolez un point pour sa
        tooltip ou un flux pour la sienne. La toolbar (haut-droit, au survol) reflète
        exactement les huit premiers interrupteurs ci-dessus — décochez-en un pour voir le
        bouton correspondant changer d&apos;état. Avec une légende, survolez une modalité
        pour mettre ses flux en avant, et « Agrandir » la passe au-dessus du globe.
    </>
);

/**
 * Maps the control values onto real `<Globe>` props.
 *
 * The dataset and its accessors are constants of the demo, not controls: they are
 * tagged with `expr()` so the generated snippet references the imported identifiers
 * (`GLOBE_POINTS`, `demoPointIcon`, …) instead of inlining the whole dataset as a
 * JSON-like object literal. The tool controls are folded into `defaults`, keeping only
 * the keys that differ from the component defaults.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = (values) => {
    const { arcVariant, arcHue, pointVariant, pointPulse, pointSize } = values;
    const defaults = Object.fromEntries(
        Object.entries(TOOL_DEFAULTS)
            .filter(([key, fallback]) => values[key] !== fallback)
            .map(([key]) => [key, values[key]]),
    );
    const hue = ARC_HUE[arcHue];
    const size = POINT_SIZE[pointSize];
    // Titres des seules données encodées : couleur / style des flux, taille des points.
    // Sérialisés en littéral (pas d'expr()) : le code généré reste autonome.
    const labels = {
        ...(hue ? { color: GLOBE_LABELS.color } : {}),
        ...(Array.isArray(hue) ? { style: GLOBE_LABELS.style } : {}),
        ...(size === 'value' ? { size: GLOBE_LABELS.size } : {}),
    };
    return {
        points: expr('GLOBE_POINTS', GLOBE_POINTS),
        arcs: expr('GLOBE_ARCS', GLOBE_ARCS),
        iconFor: expr('demoPointIcon', demoPointIcon),
        colorFor: expr('pointColor', pointColor),
        arcVariant,
        arcHue: hue,
        pointVariant,
        pointPulse,
        pointSize: size,
        labels: Object.keys(labels).length ? labels : null,
        defaults: Object.keys(defaults).length ? defaults : null,
    };
};

/**
 * Live preview of the globe playground.
 *
 * @param {Object} props - Props derived from the controls, plus the fixed demo dataset
 *   (`points`/`arcs`/accessors) reintroduced by `toProps`.
 * @param {Array<object>} props.points - Demo points (réseau de sources statistiques).
 * @param {Array<object>} props.arcs - Demo arcs between those points.
 * @returns {JSX.Element} The rendered globe.
 */
const GlobePlayground = ({ points, arcs, ...globeProps }) => (
    // `key` sur tout ce que le globe fige au montage (contrat de useGlobeEngine) :
    // dessin et encodage des flux, apparence et taille des points, état initial des
    // outils. En changer doit remonter le globe pour que la scène le reflète.
    <Globe
        key={JSON.stringify([
            globeProps.arcVariant, globeProps.arcHue ?? null, globeProps.pointVariant,
            globeProps.pointPulse, globeProps.pointSize ?? null, globeProps.defaults ?? null,
        ])}
        points={points} arcs={arcs} {...globeProps} height={460} />
);

export default GlobePlayground;
