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
// `grouped` N'EST PAS une prop de SelectMenu : le mode groupé se déduit des métadonnées du
// champ (`Metadata.parentName`). `country` a pour parent `region`, donc il s'affiche en
// groupes ; `sector` n'a pas de parent, donc il reste plat. Le contrôle est traduit dans
// `toProps` en choisissant le champ, pas en posant une prop.
//
// Alimentation par l'API : SelectMenu appelle lui-même `useSelectOptions` en interne dès
// qu'on lui passe `fieldName` — le playground n'a pas besoin d'appeler le hook, seulement
// de transmettre la prop.

export const controls = {
    allowMulti: { type: 'boolean', label: 'allowMulti', default: false, row: 0 },
    grouped: { type: 'boolean', label: 'grouped (→ fieldName)', default: false, row: 0 },
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
    fieldName: grouped ? 'country' : 'sector',
    value: expr('value', undefined),
    onChange: expr('setValue', undefined),
    ...rest,
});

/**
 * Controlled select card, holding the state `<SelectMenu>` expects.
 *
 * Split out so a `key` can remount IT: a multi-selection surviving into single mode
 * (or option identities shifting when the field, hence the grouping, changes) would leave
 * an inconsistent `value` behind — seeding `useState` from a prop and syncing the two
 * via an effect is exactly the pattern this repo refuses (cf. CriterionCard in the
 * criterion-menu playground for the same rationale).
 *
 * @param {Object} props - Component props.
 * @param {string} props.fieldName - API field name (grouped when its metadata has a `parentName`).
 * @param {boolean} props.allowMulti - Whether multi-selection is enabled.
 * @param {boolean} props.disabled - Whether the menu is disabled.
 * @param {boolean} props.validate - Whether success styling is enabled.
 * @returns {JSX.Element} The rendered select menu.
 */
const SelectMenuCard = ({ fieldName, allowMulti, disabled, validate }) => {
    const [value, setValue] = useState([]);

    return (
        <SelectMenu
            fieldName={fieldName}
            allowMulti={allowMulti}
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
 * @param {string} props.fieldName - Field, translated from the `grouped` control.
 * @returns {JSX.Element} The rendered select card.
 */
const SelectMenuPlayground = ({ fieldName, allowMulti, disabled, validate }) => (
    <SelectMenuCard
        key={`${allowMulti}-${fieldName}`}
        fieldName={fieldName}
        allowMulti={allowMulti}
        disabled={disabled}
        validate={validate} />
);

export default SelectMenuPlayground;
