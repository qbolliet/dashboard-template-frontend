'use client';

// Importation des modules
import { useState } from 'react';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import { useVariableMetadata, metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import { treeToSQL } from '@/features/filter/utils/filterEngine';
import operations from '@config/filter/operations.json';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — MultiCriterionMenu
// =================================================================
// Porté depuis le panneau de contrôle de /test-multi-criterion-menu, contrôle pour
// contrôle.
//
// DEUX CONTRÔLES NE SONT PAS DES PROPS : `showJson` et `showSql` pilotent les panneaux de
// sortie que la PAGE affichait à côté du composant. Ils restent utiles — voir le JSON
// structuré se construire pendant qu'on compose un filtre est la meilleure explication du
// composant — mais ils n'ont rien à faire dans le code généré. D'où `scaffold.omit`.
//
// `maxCriteria` : la page exposait 0 pour « illimité » parce qu'un champ numérique vide
// n'a pas de sens ; le composant, lui, attend `null`. La traduction est dans `toProps`.

// Sous-ensemble de démonstration : 4 numériques + 2 dates + 3 catégoriels + 2 textes.
const DEMO_FIELDS = [
    'gdp', 'inflation', 'chomage', 'dette_pib',
    'date_obs', 'date_pub',
    'country', 'sector', 'indicator',
    'libelle', 'source',
];

export const controls = {
    orientation: { type: 'radio', options: ['horizontal', 'vertical'], label: 'orientation', default: 'horizontal', row: 0 },
    wrap: { type: 'boolean', label: 'wrap', default: false, row: 0 },
    addMode: { type: 'radio', options: ['button', 'auto'], label: 'addMode', default: 'button', row: 1 },
    maxCriteria: { type: 'number', label: 'maxCriteria (0 = illimité)', min: 0, max: 8, step: 1, default: 0, row: 1 },
    parentheses: { type: 'boolean', label: 'parentheses', default: false, row: 2 },
    showConnectors: { type: 'boolean', label: 'showConnectors', default: true, row: 2 },
    validate: { type: 'boolean', label: 'validate', default: true, row: 3 },
    footer: { type: 'boolean', label: 'footer', default: false, row: 3 },
    showLabels: { type: 'boolean', label: 'showLabels', default: false, row: 3 },
    showOperations: { type: 'boolean', label: 'showOperations', default: true, row: 3 },
    showSlider: { type: 'boolean', label: 'showSlider', default: false, row: 3 },
    showJson: { type: 'boolean', label: 'Sortie JSON', default: true, row: 4 },
    showSql: { type: 'boolean', label: 'Sortie SQL', default: true, row: 4 },
};

export const scaffold = {
    component: 'MultiCriterionMenu',
    imports: [
        "import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';",
        "import operations from '@config/filter/operations.json';",
    ],
    dataCode: `// \`variables\` vient des métadonnées de l'API (useVariableMetadata).
const [result, setResult] = useState(null);`,
    omit: ['showJson', 'showSql'],
    always: ['variables', 'operationsByType', 'onChange'],
};

export const hint = (
    <>
        Le composant n&apos;expose que le JSON structuré : le SQL affiché ci-dessous est
        dérivé <em>en page</em> par <code>treeToSQL</code>. C&apos;est délibéré — le JSON
        est à terme le seul échange avec l&apos;API.
        {' '}<code>wrap</code> n&apos;a d&apos;effet qu&apos;en orientation horizontale.
    </>
);

// Chaque feuille de l'arbre porte un drapeau `complete` : un critère auquel il manque la
// variable, l'opération ou la valeur produit un « ? » dans le SQL. Logique reprise telle
// quelle de `registry/examples/multi-criterion-menu-basic.jsx`.
const isComplete = (node) =>
    node.type === 'criterion' ? node.complete : node.children.every(isComplete);

/**
 * Maps the control values onto real `<MultiCriterionMenu>` props.
 *
 * @param {Object} values - Current control values.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = ({ maxCriteria, ...rest }) => ({
    variables: expr('variables', undefined),
    operationsByType: expr('operations', operations),
    onChange: expr('setResult', undefined),
    // 0 dans le contrôle = pas de plafond = `null` pour le composant.
    maxCriteria: maxCriteria > 0 ? maxCriteria : null,
    ...rest,
});

/**
 * Live preview of the multi-criterion-menu playground.
 *
 * @param {Object} props - Props derived from the controls.
 * @returns {JSX.Element} The rendered menu, with its structured outputs.
 */
// Props listées une à une plutôt que ramassées par un reste : `variables` et `onChange`
// sont fournis ICI (le composant est contrôlé), et les récupérer pour les jeter
// laisserait des variables inutilisées.
const MultiCriterionMenuPlayground = ({
    showJson, showSql, operationsByType, maxCriteria,
    orientation, wrap, addMode, parentheses, showConnectors,
    validate, footer, showLabels, showOperations, showSlider,
}) => {
    const { fields } = useVariableMetadata();
    const allVars = metadataToVariables(fields);
    const variables = DEMO_FIELDS
        .map((name) => allVars.find((variable) => variable.value === name))
        .filter(Boolean);

    // Résultat structuré produit par le composant : { criteria, tree, balanced, serial }.
    const [result, setResult] = useState(null);
    // `balanced` dit si les parenthèses se referment : une clause déséquilibrée n'est pas
    // traduisible en SQL, un critère incomplet non plus (il produirait un « ? »).
    const sql = result?.balanced && isComplete(result.tree) ? treeToSQL(result.tree) : '';

    return (
        <>
            <MultiCriterionMenu
                variables={variables}
                operationsByType={operationsByType}
                onChange={setResult}
                maxCriteria={maxCriteria}
                orientation={orientation}
                wrap={wrap}
                addMode={addMode}
                parentheses={parentheses}
                showConnectors={showConnectors}
                validate={validate}
                footer={footer}
                showLabels={showLabels}
                showOperations={showOperations}
                showSlider={showSlider} />

            {showJson && (
                <figure className="doc-playground__output">
                    <figcaption>
                        Valeur structurée (JSON)
                        {result && !result.balanced && ' — crochets déséquilibrés'}
                    </figcaption>
                    <pre>{result ? JSON.stringify(result.serial, null, 2) : '—'}</pre>
                </figure>
            )}

            {showSql && (
                <figure className="doc-playground__output">
                    <figcaption>WHERE — SQL dérivé en page</figcaption>
                    <pre>{sql ? `WHERE ${sql}` : '—'}</pre>
                </figure>
            )}
        </>
    );
};

export default MultiCriterionMenuPlayground;
