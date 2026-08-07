'use client';

// Importation des modules
import { Globe } from '@/features/globe';
import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor, pointSize } from '@/features/globe/sources/demoData';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — Globe
// =================================================================
// Porté depuis le panneau « Démos » de /test-globe (bloc `network`, le plus riche en
// accesseurs : icône/couleur/diamètre tous conditionnels à `value`). Les contrôles
// pilotent les sept interrupteurs `default*` du composant — aucune construction de
// descripteur ici, contrairement au playground Chart : `toProps` se contente de
// préfixer les noms courts des contrôles.
//
// `points`/`arcs`/`iconFor`/`colorFor`/`sizeFor` NE SONT PAS des contrôles : ce sont des
// CONSTANTES du jeu de démo, réintroduites par `toProps` (via `expr()`, pour que le code
// généré référence les identifiants importés plutôt que de sérialiser 13 points en JSON)
// et listées dans `scaffold.always` — sans quoi la règle « prop à son défaut = omise »
// les ferait disparaître du code généré, puisqu'elles ne varient jamais avec les
// contrôles (même piège que `icon`/`badge` dans le playground StatCard).
//
// LACUNE CONNUE — « mouvements réduits ». `Globe.jsx` (src/features/globe/components/
// Globe/Globe.jsx, effet de montage ~L220) force `autoRotate` ET `arcsDynamic` à false
// juste après le montage quand `prefersReducedMotion()` répond vrai, quels que soient
// `defaultAutoRotate`/`defaultArcsDynamic` — la préférence système gagne toujours. Ce
// playground ne simule PAS cette préférence (il n'y a pas de bascule OS pilotable dans le
// navigateur de contrôle) : le contrôle `autoRotate` ci-dessous restera donc sans effet
// visible pour quiconque teste avec `prefers-reduced-motion: reduce` activé au niveau OS.
// Couverture laissée à une future suite Playwright (`page.emulateMedia`), pas à ce
// playground.

export const controls = {
    mode: {
        type: 'radio',
        options: ['globe', 'plane'],
        labels: { globe: 'Globe', plane: 'Planisphère' },
        label: 'Projection initiale',
        default: 'globe',
        row: 0,
    },
    autoRotate: { type: 'boolean', label: 'Rotation auto', default: true, row: 1 },
    wheelZoom: { type: 'boolean', label: 'Zoom molette', default: true, row: 1 },
    showPoints: { type: 'boolean', label: 'Points', default: true, row: 1 },
    showArcs: { type: 'boolean', label: 'Flux', default: true, row: 2 },
    tooltips: { type: 'boolean', label: 'Tooltips', default: true, row: 2 },
    arcsDynamic: { type: 'boolean', label: 'Flux dynamiques', default: true, row: 2 },
};

export const scaffold = {
    component: 'Globe',
    imports: [
        "import { Globe } from '@/features/globe';",
        "import { GLOBE_POINTS, GLOBE_ARCS, demoPointIcon, pointColor, pointSize } from '@/features/globe/sources/demoData';",
    ],
    // Constantes réintroduites par toProps (cf. en-tête) : toujours égales à leur
    // « défaut » puisqu'aucun contrôle ne les fait varier — la règle 1 les supprimerait.
    always: ['points', 'arcs', 'iconFor', 'colorFor', 'sizeFor'],
};

export const hint = (
    <>
        Glissez pour orienter le globe, molette pour zoomer, survolez un point pour sa
        tooltip. La toolbar (haut-droit, au survol) reflète exactement les sept
        interrupteurs ci-dessus — décochez-en un pour voir le bouton correspondant changer
        d&apos;état.
    </>
);

/**
 * Maps the control values onto real `<Globe>` props.
 *
 * The dataset and its accessors are constants of the demo, not controls: they are
 * tagged with `expr()` so the generated snippet references the imported identifiers
 * (`GLOBE_POINTS`, `demoPointIcon`, …) instead of inlining the whole dataset as a
 * JSON-like object literal.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = ({ mode, autoRotate, wheelZoom, showPoints, showArcs, tooltips, arcsDynamic }) => ({
    points: expr('GLOBE_POINTS', GLOBE_POINTS),
    arcs: expr('GLOBE_ARCS', GLOBE_ARCS),
    iconFor: expr('demoPointIcon', demoPointIcon),
    colorFor: expr('pointColor', pointColor),
    sizeFor: expr('pointSize', pointSize),
    defaultMode: mode,
    defaultAutoRotate: autoRotate,
    defaultWheelZoom: wheelZoom,
    defaultShowPoints: showPoints,
    defaultShowArcs: showArcs,
    defaultTooltips: tooltips,
    defaultArcsDynamic: arcsDynamic,
});

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
    <Globe points={points} arcs={arcs} {...globeProps} height={460} />
);

export default GlobePlayground;
