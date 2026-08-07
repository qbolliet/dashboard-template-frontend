'use client';

// Importation des modules
import { useState } from 'react';
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — ConstraintField
// =================================================================
// Porté depuis la section « Constraint Field » de /filter-primitives (six cellules
// figées), mais avec un panneau de contrôle qui n'existait sur AUCUNE de ces pages.
//
// `onChange`/`onValidityChange` n'étaient wirés nulle part dans le dépôt avant ce
// fichier : ni /filter-primitives, ni aucun exemple de registry. `onValidityChange`
// transmet un BOOLÉEN nu (rempli ET cohérent : type valide, low ≤ high, dans les
// bornes) — pas un objet {low, high, valid} — cf. le JSDoc de ConstraintField et son
// implémentation (`onValidityChange?.(validFor(...))`). Ce playground est le premier
// endroit qui rend ce contrat visible.
//
// `min`/`max`/`step` sont fixés par type plutôt qu'exposés en contrôle : ce ne sont pas
// les props qu'on vient explorer ici (elles ont leur propre exemple de registry,
// `constraint-field-api-bounds`) — la question posée est « que fait rangeMode /
// showSlider / validate », pas « d'où viennent les bornes ».
//
// Remount via `key` (valueType + rangeMode) : le résultat affiché change de FORME
// (`{ value }` simple vs `{ min, max }` de plage) quand ces deux contrôles basculent —
// même rationale que CriterionCard dans le playground criterion-menu.

const BOUNDS = {
    integer: { min: 0, max: 100, step: 1 },
    float: { min: 0, max: 50, step: 0.1 },
    date: { min: '01/01/2024', max: '31/12/2024' },
};

export const controls = {
    valueType: { type: 'radio', options: ['integer', 'float', 'date'], label: 'valueType', default: 'float', row: 0 },
    rangeMode: { type: 'boolean', label: 'rangeMode', default: false, row: 1 },
    showSlider: { type: 'boolean', label: 'showSlider', default: true, row: 1 },
    validate: { type: 'boolean', label: 'validate', default: true, row: 1 },
};

export const scaffold = {
    component: 'ConstraintField',
    imports: [
        "import { useState } from 'react';",
        "import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';",
    ],
    dataCode: `// \`onChange\` remonte { value } (valeur unique) ou { min, max } (plage) selon
// rangeMode ; \`onValidityChange\` remonte un booléen nu, séparément.
const [result, setResult] = useState(null);
const [valid, setValid] = useState(null);`,
    always: ['min', 'max', 'step', 'onChange', 'onValidityChange'],
};

export const hint = (
    <>
        <code>onValidityChange</code> transmet un <strong>booléen</strong> — pas un objet —
        et <code>onChange</code> une forme différente selon <code>rangeMode</code> :
        <code>{'{ value }'}</code> en simple, <code>{'{ min, max }'}</code> en plage. Les
        deux s&apos;affichent sous le champ.
    </>
);

/**
 * Maps the control values onto real `<ConstraintField>` props.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = ({ valueType, ...rest }) => ({
    valueType,
    ...BOUNDS[valueType],
    onChange: expr('setResult', undefined),
    onValidityChange: expr('setValid', undefined),
    ...rest,
});

/**
 * Observer card: renders `<ConstraintField>` (itself uncontrolled — it has no `value`
 * prop) and mirrors its `onChange`/`onValidityChange` callbacks into local state so
 * the result is visible below the field.
 *
 * Split out so a `key` can remount IT: the result's SHAPE changes (`{ value }` vs
 * `{ min, max }`) when `valueType`/`rangeMode` flip, and a stale shape surviving the
 * flip would render nonsense — same rationale as CriterionCard in the criterion-menu
 * playground.
 *
 * @param {Object} props - Props forwarded to `<ConstraintField>`.
 * @returns {JSX.Element} The field and its live callback outputs.
 */
const ConstraintFieldCard = (props) => {
    const [result, setResult] = useState(null);
    const [valid, setValid] = useState(null);

    return (
        <>
            <ConstraintField {...props} onChange={setResult} onValidityChange={setValid} />
            <figure className="doc-playground__output">
                <figcaption>Callbacks — onChange / onValidityChange</figcaption>
                <pre>{JSON.stringify({ result, valid }, null, 2)}</pre>
            </figure>
        </>
    );
};

/**
 * Live preview of the constraint-field playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @param {string} props.valueType - Value type, part of the remount key.
 * @param {boolean} props.rangeMode - Range mode, also part of the remount key.
 * @returns {JSX.Element} The rendered constraint-field card.
 */
const ConstraintFieldPlayground = ({ valueType, rangeMode, ...rest }) => (
    <ConstraintFieldCard
        key={`${valueType}-${rangeMode}`}
        valueType={valueType}
        rangeMode={rangeMode}
        {...rest} />
);

export default ConstraintFieldPlayground;
