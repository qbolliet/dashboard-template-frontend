'use client';

// Importation des modules
import Tooltip from '@/components/filter/Tooltip/Tooltip';

// =================================================================
// PLAYGROUND — Tooltip
// =================================================================
// Porté depuis la section « Tooltip » de /filter-primitives, qui n'exposait aucun
// contrôle (quatre cellules figées, une par position). Les contrôles pilotent ici des
// props DIRECTEMENT : pas de `toProps` à proprement parler, seul `content` est ajouté
// en constante (voir plus bas).
//
// `content` n'est pas un contrôle : le texte de la bulle n'est pas ce qu'on vient
// explorer ici (c'est `position`/`disabled`/`block`). Il reste néanmoins une vraie prop
// du composant rendu, donc listé dans `scaffold.always` pour ne pas disparaître du code
// généré — sans lui, le snippet rendrait des enfants nus, sans bulle du tout.

export const controls = {
    position: {
        type: 'radio',
        options: ['top', 'bottom', 'left', 'right'],
        label: 'Position',
        default: 'top',
        row: 0,
    },
    disabled: { type: 'boolean', label: 'disabled', default: false, row: 1 },
    block: { type: 'boolean', label: 'block', default: false, row: 1 },
};

export const scaffold = {
    component: 'Tooltip',
    imports: [
        "import Tooltip from '@/components/filter/Tooltip/Tooltip';",
    ],
    always: ['content'],
    children: `  <button type="button">Survoler</button>`,
};

export const hint = (
    <>
        <code>disabled</code> renvoie les enfants tels quels, sans wrapper ni bulle — même
        avec du contenu renseigné. <code>block</code> ne change que la largeur de
        l&apos;ancre, utile pour envelopper un élément déjà pleine largeur (une ligne de
        critère, par exemple).
    </>
);

/**
 * Maps the control values onto real `<Tooltip>` props.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = (values) => ({
    // Constante : le contenu de la bulle n'est pas un axe d'exploration de ce
    // playground, seule sa position/désactivation/largeur le sont.
    content: "Texte d'info",
    ...values,
});

/**
 * Live preview of the tooltip playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @returns {JSX.Element} The tooltip wrapping a focusable trigger button.
 */
const TooltipPlayground = (props) => (
    <Tooltip {...props}>
        <button type="button">Survoler</button>
    </Tooltip>
);

export default TooltipPlayground;
