'use client';

// Importation des modules
import { useState } from 'react';
import TypeAwareInput from '@/components/filter/TypeAwareInput/TypeAwareInput';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — TypeAwareInput
// =================================================================
// Porté depuis la section « Type-Aware Input » de /filter-primitives (cinq cellules
// figées : texte, entier, décimal, date, plage de dates). `inputType` + `dateMode`
// couvrent ici la même matière de façon interactive — les deux derniers cas de la
// grille d'origine ne sont que `inputType="date"` croisé avec `dateMode`.
//
// `dateMode` n'a d'effet qu'avec `inputType="date"` (le composant l'ignore sinon) ; le
// contrôle reste affiché en permanence plutôt que masqué conditionnellement — un
// contrôle qui disparaît puis réapparaît est plus déroutant qu'un contrôle inerte, et le
// `hint` ci-dessous le documente explicitement.

export const controls = {
    inputType: {
        type: 'radio',
        options: ['text', 'integer', 'float', 'date'],
        label: 'inputType',
        default: 'text',
        row: 0,
    },
    dateMode: {
        type: 'select',
        options: ['single', 'range'],
        label: 'dateMode',
        default: 'single',
        row: 1,
    },
    validate: { type: 'boolean', label: 'validate', default: false, row: 1 },
};

export const scaffold = {
    component: 'TypeAwareInput',
    imports: [
        "import { useState } from 'react';",
        "import TypeAwareInput from '@/components/filter/TypeAwareInput/TypeAwareInput';",
    ],
    dataCode: `// \`value\` est un état contrôlé ; sa forme dépend d'inputType/dateMode (chaîne
// simple, ou "JJ/MM/AAAA → JJ/MM/AAAA" en plage de dates).
const [value, setValue] = useState('');`,
    always: ['value', 'onChange'],
};

export const hint = (
    <>
        <code>dateMode</code> n&apos;a d&apos;effet qu&apos;avec{' '}
        <code>inputType=&quot;date&quot;</code> : il bascule entre un calendrier simple et
        un calendrier double relié par une plage. Il reste affiché quel que soit
        <code>inputType</code>, mais n&apos;agit que sur ce dernier.
    </>
);

/**
 * Maps the control values onto real `<TypeAwareInput>` props.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = (values) => ({
    ...values,
    value: expr('value', undefined),
    onChange: expr('setValue', undefined),
});

/**
 * Controlled input card, holding the state `<TypeAwareInput>` expects.
 *
 * Split out so a `key` can remount IT: the value's SHAPE changes drastically between
 * types (a bare number string vs. a "A → B" date range) — seeding `useState` from a
 * prop and syncing via effect is exactly the pattern this repo refuses (cf.
 * CriterionCard in the criterion-menu playground for the same rationale).
 *
 * @param {Object} props - Component props.
 * @param {string} props.inputType - Expected value type.
 * @param {string} props.dateMode - Date selection mode (date type only).
 * @param {boolean} props.validate - Whether real-time validation feedback is enabled.
 * @returns {JSX.Element} The rendered input.
 */
const TypeAwareInputCard = ({ inputType, dateMode, validate }) => {
    const [value, setValue] = useState('');

    return (
        <TypeAwareInput
            inputType={inputType}
            dateMode={dateMode}
            validate={validate}
            value={value}
            onChange={setValue} />
    );
};

/**
 * Live preview of the type-aware-input playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @param {string} props.inputType - Expected value type, also the remount key.
 * @returns {JSX.Element} The rendered input card.
 */
const TypeAwareInputPlayground = ({ inputType, dateMode, validate }) => (
    <TypeAwareInputCard key={inputType} inputType={inputType} dateMode={dateMode} validate={validate} />
);

export default TypeAwareInputPlayground;
