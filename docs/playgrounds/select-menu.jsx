'use client';

// Importation des modules
import { useState } from 'react';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — SelectMenu
// =================================================================
// Porté depuis la section « Select Menu » de /filter-primitives (cinq cellules figées :
// simple/multi croisé avec groupé, plus une désactivée). Ici, la matière des CINQ
// combinaisons devient interactive via deux contrôles (`allowMulti`, `grouped`) plutôt
// que cinq blocs JSX séparés ; la combinaison désactivée figée (avec une valeur
// preselectionnée, cas particulier du composant) reste un exemple de registry
// (`select-menu-disabled`), pas un axe de contrôle.
//
// `grouped` N'EST PAS une prop de SelectMenu : le mode groupé se dérive de la seule
// présence de `groupField` (même logique côté composant : `const grouped = !!groupField`).
// Le contrôle est donc traduit dans `toProps`, sous son propre nom de prop réel.
//
// Alimentation par l'API (`fieldName="demo"`, comme la page d'origine) : SelectMenu
// appelle lui-même `useSelectOptions` en interne dès qu'on lui passe `fieldName` — le
// playground n'a pas besoin d'appeler le hook, seulement de transmettre la prop.

export const controls = {
    allowMulti: { type: 'boolean', label: 'allowMulti', default: false, row: 0 },
    grouped: { type: 'boolean', label: 'grouped (→ groupField)', default: false, row: 0 },
    disabled: { type: 'boolean', label: 'disabled', default: false, row: 1 },
    validate: { type: 'boolean', label: 'validate', default: false, row: 1 },
};

export const scaffold = {
    component: 'SelectMenu',
    imports: [
        "import { useState } from 'react';",
        "import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';",
    ],
    dataCode: `// \`value\` est un état contrôlé : tableau de { value, label }, même en sélection simple.
const [value, setValue] = useState([]);`,
    always: ['fieldName', 'value', 'onChange'],
};

export const hint = (
    <>
        En sélection simple, activer <code>disabled</code> une fois une valeur choisie
        bascule sur un rendu figé : un libellé statique, sans dropdown ni contrôle
        (cf. <code>select-menu-disabled</code> dans le registry). Les options viennent de
        l&apos;API via <code>fieldName</code>, jamais listées en dur ici.
    </>
);

/**
 * Maps the control values onto real `<SelectMenu>` props.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = ({ grouped, ...rest }) => ({
    fieldName: 'demo',
    value: expr('value', undefined),
    onChange: expr('setValue', undefined),
    // Une seule source de vérité pour le mode groupé, alignée sur le composant :
    // c'est la PRÉSENCE de groupField qui l'active, pas un booléen dédié.
    groupField: grouped ? 'group' : undefined,
    ...rest,
});

/**
 * Controlled select card, holding the state `<SelectMenu>` expects.
 *
 * Split out so a `key` can remount IT: a multi-selection surviving into single mode
 * (or option identities shifting when the group field appears/disappears) would leave
 * an inconsistent `value` behind — seeding `useState` from a prop and syncing the two
 * via an effect is exactly the pattern this repo refuses (cf. CriterionCard in the
 * criterion-menu playground for the same rationale).
 *
 * @param {Object} props - Component props.
 * @param {string} props.fieldName - API field name.
 * @param {boolean} props.allowMulti - Whether multi-selection is enabled.
 * @param {string} [props.groupField] - Group field enabling the grouped mode.
 * @param {boolean} props.disabled - Whether the menu is disabled.
 * @param {boolean} props.validate - Whether success styling is enabled.
 * @returns {JSX.Element} The rendered select menu.
 */
const SelectMenuCard = ({ fieldName, allowMulti, groupField, disabled, validate }) => {
    const [value, setValue] = useState([]);

    return (
        <SelectMenu
            fieldName={fieldName}
            allowMulti={allowMulti}
            groupField={groupField}
            disabled={disabled}
            validate={validate}
            value={value}
            onChange={setValue} />
    );
};

/**
 * Live preview of the select-menu playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @param {boolean} props.allowMulti - Whether multi-selection is enabled.
 * @param {string} [props.groupField] - Group field, translated from the `grouped` control.
 * @returns {JSX.Element} The rendered select card.
 */
const SelectMenuPlayground = ({ fieldName, allowMulti, groupField, disabled, validate }) => (
    <SelectMenuCard
        key={`${allowMulti}-${!!groupField}`}
        fieldName={fieldName}
        allowMulti={allowMulti}
        groupField={groupField}
        disabled={disabled}
        validate={validate} />
);

export default SelectMenuPlayground;
