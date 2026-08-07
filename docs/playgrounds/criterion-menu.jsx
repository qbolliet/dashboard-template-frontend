'use client';

// Importation des modules
import { useState } from 'react';
import CriterionMenu from '@/features/filter/components/CriterionMenu/CriterionMenu';
import { useVariableMetadata, metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import { isNumericSqlType } from '@/features/filter/utils/filterTypes';
import operations from '@config/filter/operations.json';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — CriterionMenu
// =================================================================
// Porté depuis le panneau de contrôle de /test-criterion-menu.
//
// UNE CARTE, PAS LA GRILLE DES CINQ TYPES : la grille (numérique / date / catégoriel /
// texte / parenthèses) montre cinq combinaisons FIGÉES, ce qui relève de l'exemple de
// registry (`criterion-menu-basic`) et non du playground. Ici on répond à « que fait
// cette prop ». Le type de variable est lui-même devenu un contrôle, ce qui couvre la
// même matière de façon interactive.
//
// `hideOperationWhenSet` n'est PAS une prop du composant : la page d'origine la simulait
// en calculant `showOperation`. La traduction est faite dans `toProps`, et le contrôle
// est nommé d'après ce qu'il fait, pas d'après une prop qui n'existe pas.

// Critères initiaux par type, repris de la page d'origine.
const SEEDS = {
    numérique: { variable: 'gdp', operation: 'between', value: { min: -2, max: 5 }, sql_type: 'double precision', is_categorical: false, bracketLeft: false, bracketRight: false },
    date: { variable: 'date_obs', operation: 'between', value: '', sql_type: 'date', is_categorical: false, bracketLeft: false, bracketRight: false },
    catégoriel: { variable: 'indicator', operation: 'in', value: [], sql_type: 'character varying', is_categorical: true, bracketLeft: false, bracketRight: false },
    texte: { variable: 'libelle', operation: 'eq', value: '', sql_type: 'text', is_categorical: false, bracketLeft: false, bracketRight: false },
};

export const controls = {
    kind: {
        type: 'radio',
        options: ['numérique', 'date', 'catégoriel', 'texte'],
        label: 'Type de variable',
        default: 'numérique',
        row: 0,
    },
    validate: { type: 'boolean', label: 'validate', default: false, row: 1 },
    footer: { type: 'boolean', label: 'footer', default: false, row: 1 },
    showLabels: { type: 'boolean', label: 'showLabels', default: false, row: 1 },
    showSlider: { type: 'boolean', label: 'showSlider', default: true, row: 1 },
    parentheses: { type: 'boolean', label: 'parentheses', default: false, row: 1 },
    hideOperationWhenSet: { type: 'boolean', label: 'Masquer l’opération une fois choisie', default: false, row: 2 },
    // Démonstration du figeage « filtre de dashboard fixé sur une colonne » : la variable
    // n'est plus qu'une seule option (celle du seed) et le select se désactive via
    // `lockedVariable`, plutôt que de laisser l'utilisateur en changer.
    locked: { type: 'boolean', label: 'locked (variable figée)', default: false, row: 2 },
};

export const scaffold = {
    component: 'CriterionMenu',
    imports: [
        "import CriterionMenu from '@/features/filter/components/CriterionMenu/CriterionMenu';",
        "import operations from '@config/filter/operations.json';",
    ],
    dataCode: `// \`criterion\` est un état contrôlé ; \`variables\` vient des métadonnées de l'API.
const [criterion, setCriterion] = useState(initialCriterion);`,
    // Molettes de démonstration : elles n'existent que dans le playground.
    omit: ['kind'],
    always: ['criterion', 'onChange', 'variables', 'operationsByType'],
};

export const hint = (
    <>
        <code>showSlider</code> n&apos;a d&apos;effet que sur les types numériques et date.
        Le critère porte son <code>sql_type</code> et son <code>is_categorical</code>
        {' '}(métadonnées de l&apos;API) plutôt qu&apos;un type abstrait.
    </>
);

/**
 * Maps the control values onto real `<CriterionMenu>` props.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = ({ kind, hideOperationWhenSet, locked, ...rest }) => ({
    criterion: expr('criterion', SEEDS[kind]),
    onChange: expr('setCriterion', undefined),
    variables: expr('variables', undefined),
    operationsByType: expr('operations', operations),
    // La page d'origine dérivait showOperation ainsi : masquer l'opération une fois
    // qu'elle est renseignée.
    showOperation: !hideOperationWhenSet || !SEEDS[kind].operation,
    // `locked` est le nom du contrôle (parle du scénario) ; `lockedVariable` est le nom
    // réel de la prop du composant (désactive le select Variable).
    lockedVariable: locked,
    kind,
    ...rest,
});

/**
 * Controlled criterion card, holding the state `<CriterionMenu>` expects.
 *
 * Split out so a `key` can remount IT: seeding `useState` from a prop in the parent
 * would keep the previous type's criterion when the type control changes, and syncing
 * the two with an effect is exactly the pattern this repo refuses.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.seed - Initial criterion.
 * @param {Array<Object>} props.variables - Selectable variables.
 * @returns {JSX.Element} The rendered card.
 */
const CriterionCard = ({ seed, variables, ...rest }) => {
    const [criterion, setCriterion] = useState(seed);

    return (
        <CriterionMenu
            criterion={criterion}
            onChange={setCriterion}
            variables={variables}
            operationsByType={operations}
            {...rest} />
    );
};

/**
 * Live preview of the criterion-menu playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @param {string} props.kind - Demo-only knob selecting the seeded variable type.
 * @param {boolean} props.lockedVariable - Demo-only knob restricting `variables` to the
 *   seeded variable and disabling the Variable select (dashboard filter fixed to one
 *   column).
 * @returns {JSX.Element} The rendered criterion card.
 */
const CriterionMenuPlayground = ({
    kind, validate, footer, showLabels, showSlider, parentheses, showOperation, lockedVariable,
}) => {
    const { fields } = useVariableMetadata();
    const allVars = metadataToVariables(fields);

    // Sous-ensemble de variables cohérent avec le type sélectionné : proposer une date
    // dans une carte numérique n'apprendrait rien sur la prop qu'on manipule.
    const kindVars = allVars.filter((variable) => {
        if (kind === 'catégoriel') return variable.is_categorical;
        if (kind === 'date') return variable.sql_type?.includes('date') || variable.sql_type?.includes('timestamp');
        if (kind === 'numérique') return !variable.is_categorical && isNumericSqlType(variable.sql_type);
        return !variable.is_categorical && !isNumericSqlType(variable.sql_type);
    });

    // `locked` (« filtre de dashboard fixé sur une colonne ») : plus qu'une seule variable
    // sélectionnable — celle déjà semée pour ce type — en plus de désactiver le select.
    const variables = lockedVariable
        ? kindVars.filter((variable) => variable.value === SEEDS[kind].variable)
        : kindVars;

    return (
        <CriterionCard
            key={kind}
            seed={SEEDS[kind]}
            variables={variables}
            validate={validate}
            footer={footer}
            showLabels={showLabels}
            showSlider={showSlider}
            parentheses={parentheses}
            showOperation={showOperation}
            lockedVariable={lockedVariable} />
    );
};

export default CriterionMenuPlayground;
