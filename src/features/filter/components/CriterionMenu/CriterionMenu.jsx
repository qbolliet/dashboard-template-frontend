'use client';

import { useId, useState } from 'react';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';
import { defaultValue, isComplete, resolveOperations, toSelectValue } from '@/features/filter/utils/filterTypes';
import CriterionCard from './CriterionCard/CriterionCard';
import CriterionRow from './CriterionRow/CriterionRow';
import ValueField from './ValueField/ValueField';
import { mergeLabels } from '@/utils/i18n/mergeLabels';

// Défauts français, surchargeables par la prop `labels` (cf. src/utils/i18n/mergeLabels.js).
const DEFAULT_LABELS = {
  variable: 'Variable',
  variableHint: 'Variable — champ à filtrer',
  variablePlaceholder: 'Sélectionner une variable…',
  operation: 'Opération',
  operationHint: 'Opération — comparateur appliqué',
  operationPlaceholder: 'Opération…',
  value: 'Valeur',
  valueHint: 'Valeur — valeur(s) comparée(s)',
  valuesPlaceholder: 'Sélectionner des valeurs…',
  valuePlaceholder: 'Sélectionner une valeur…',
  addCriterion: 'Ajouter un critère',
  removeCriterion: 'Supprimer le critère',
  openBracket: 'Crochet ouvrant',
  closeBracket: 'Crochet fermant',
  and: 'ET',
  or: 'OU',
};

/**
 * Controlled criterion card: three rows (variable, operation, value) whose type family
 * drives the value field. State lives entirely in the parent through `criterion` /
 * `onChange`; this component only derives display data and patches. Categorical options
 * and numeric/date bounds are loaded by the primitives themselves via `fieldName`
 * (their internal mock/GraphQL hooks) — no data-loading prop here.
 *
 * @param {{variable: ?string, operation: ?string, value: *, typeFamily: ?string,
 *   isCategorical: ?boolean, bracketLeft: boolean, bracketRight: boolean}} criterion -
 *   Controlled criterion state.
 * @param {function(object, {debounce: boolean}=): void} onChange - Receives the updated
 *   criterion. The optional meta forwards the emission intent: absent for structural
 *   changes (variable/operation/bracket → immediate), `{ debounce }` for value edits.
 * @param {function(): void} [onCommit] - Value input blur signal, forwarded upstream so a
 *   debounced parent can flush its pending emission.
 * @param {function(): void} [onRemove] - Removes the criterion; its presence renders
 *   the removal button.
 * @param {{value: string, label: string, typeFamily: string, isCategorical: boolean,
 *   filterOperations: string[]}[]} variables - Variable metadata list (from
 *   useVariableMetadata → metadataToVariables). `filterOperations` is the set the API
 *   accepts on the column; the offered operations are its subset the value field can edit.
 * @param {Object<string, string>} [operationLabels] - Operation labels keyed by
 *   `FilterOperation` enum value (config/filter/operations.json, flattened by
 *   resolveOperationLabels). A missing label shows the enum value.
 * @param {string} [catalog] - API catalog forwarded to the value primitives.
 * @param {?Object} [structuredFilters] - Current filter tree, forwarded to the value
 *   primitives so numeric and date bounds follow the filtered dataset.
 * @param {boolean} [parentheses] - Enables the grouping brackets.
 * @param {boolean} [footer] - Renders the validity footer (with `validate`).
 * @param {boolean} [validate] - Enables validation (accent color + inline feedback).
 * @param {boolean} [showLabels] - Shows the row labels instead of tooltips.
 * @param {boolean} [lockedVariable] - Disables the variable select.
 * @param {boolean} [lockedOperation] - Disables the operation select.
 * @param {boolean} [showOperation] - Renders the operation row.
 * @param {boolean} [showSlider] - Numeric/date value field: render the slider bar.
 * @param {string} [className] - Additional class(es) merged on the card root.
 * @param {Object} [style] - Additional inline styles merged on the card root.
 * @param {string}   [intlLocale] - Full Intl tag, driving number and date formatting.
 * @param {string}   [dateMask] - Human-readable date mask shown as a placeholder.
 * @param {string}   [dateOrder] - Permutation of 'D', 'M' and 'Y' telling how to read
 *   a typed date. The mask is its display, this is its meaning.
 * @param {number}   [firstDayOfWeek] - 0 for Sunday, 1 for Monday.
 * @param {Object}   [labels] - Wording overrides, merged over the French defaults.
 * @returns {JSX.Element}
 */
const CriterionMenu = ({
  criterion,
  onChange,
  onCommit,
  onRemove,
  variables,
  operationLabels,
  catalog,
  structuredFilters,
  parentheses = false,
  footer = false,
  validate = false,
  showLabels = false,
  lockedVariable = false,
  lockedOperation = false,
  showOperation = true,
  showSlider = false,
  className = '',
  style,
  labels: labelOverrides,
  intlLocale,
  dateMask,
  dateOrder,
  firstDayOfWeek,
}) => {
  const labels = mergeLabels(DEFAULT_LABELS, labelOverrides);
  // Méta de la variable sélectionnée → source de la famille de type courante et des
  // opérations acceptées par l'API (catalogue autoritaire)
  const varMeta = variables.find((v) => v.value === criterion.variable) ?? null;
  const typeFamily = varMeta?.typeFamily ?? null;
  const isCategorical = varMeta?.isCategorical ?? false;
  const ops = resolveOperations(varMeta, operationLabels);

  // Verdict de VALEUR remonté par le champ (ConstraintField). null = pas de verdict de
  // champ (types sans validation croisée) → repli sur isComplete. Réinitialisé à chaque
  // changement de variable/opération (le champ ré-émettra à la prochaine saisie).
  const [fieldVerdict, setFieldVerdict] = useState(null);

  // Raccourci de mise à jour partielle du critère contrôlé. `meta` (optionnel) transporte
  // l'intention d'émission jusqu'au parent : absent = structurel/immédiat, { debounce }
  // = édition de valeur amortie.
  const patch = (partial, meta) => onChange({ ...criterion, ...partial }, meta);

  // Changement de variable : reset opération et valeur selon le nouveau type
  const onVariable = (id) => {
    const meta = variables.find((v) => v.value === id) ?? null;
    const t = meta?.typeFamily ?? null;
    const cat = meta?.isCategorical ?? false;
    const newOps = resolveOperations(meta, operationLabels);
    const op = newOps[0]?.value ?? null;
    setFieldVerdict(null);
    patch({ variable: id, typeFamily: t, isCategorical: cat, operation: op, value: defaultValue(t, cat, op) });
  };

  // Changement d'opération : reset de la seule valeur
  const onOperation = (op) => {
    setFieldVerdict(null);
    patch({ operation: op, value: defaultValue(typeFamily, isCategorical, op) });
  };

  // Toggle d'un crochet (gauche/droite)
  const onToggleBracket = (side) =>
    patch(side === 'left'
      ? { bracketLeft: !criterion.bracketLeft }
      : { bracketRight: !criterion.bracketRight });

  // Validité de la carte : verdict du champ s'il existe, sinon complétude « rempli ».
  const complete = isComplete({
    operation: criterion.operation,
    value: criterion.value,
    typeFamily,
    isCategorical,
  });
  const valid = fieldVerdict != null ? fieldVerdict : complete;

  // État d'accent sémantique : neutre hors validation, sinon selon la validité.
  // Le mapping couleur vit dans CriterionCard.scss (pas de couleur côté JS).
  const state = !validate ? 'neutral' : valid ? 'valid' : 'invalid';

  // Adaptateurs id → format SelectMenu (les ids restent la donnée métier)
  const variableSelVal = toSelectValue(criterion.variable, variables);
  const operationSelVal = toSelectValue(criterion.operation, ops);

  // Ids stables liant les <label htmlFor> des lignes aux combobox des selects
  const uid = useId();
  const variableId = `${uid}-variable`;
  const operationId = `${uid}-operation`;

  return (
    <CriterionCard
      labels={labels}
      state={state}
      valid={valid}
      footer={footer && validate}
      parentheses={parentheses}
      bracketLeft={!!criterion.bracketLeft}
      bracketRight={!!criterion.bracketRight}
      onToggleBracket={onToggleBracket}
      onRemove={onRemove}
      className={className}
      style={style}>

      <CriterionRow label={labels.variable} step={1} showLabel={showLabels}
        htmlFor={variableId}
        tooltipText={labels.variableHint}>
        <SelectMenu
          id={variableId}
          options={variables}
          value={variableSelVal}
          disabled={lockedVariable}
          validate={validate}
          placeholder={labels.variablePlaceholder}
          onChange={(items) => onVariable(items[0]?.value ?? null)} />
      </CriterionRow>

      {showOperation && (
        <CriterionRow label={labels.operation} step={2} showLabel={showLabels}
          htmlFor={operationId}
          tooltipText={labels.operationHint}>
          <SelectMenu
            id={operationId}
            options={ops}
            clearable={false}
            value={operationSelVal}
            disabled={!criterion.variable || lockedOperation}
            validate={validate}
            placeholder={labels.operationPlaceholder}
            onChange={(items) => onOperation(items[0]?.value ?? null)} />
        </CriterionRow>
      )}

      <CriterionRow label={labels.value} step={showOperation ? 3 : 2} showLabel={showLabels}
        tooltipText={labels.valueHint}>
        <ValueField
          labels={labels}
          intlLocale={intlLocale}
          dateMask={dateMask}
          dateOrder={dateOrder}
          firstDayOfWeek={firstDayOfWeek}
          typeFamily={typeFamily}
          isCategorical={isCategorical}
          operation={criterion.operation}
          value={criterion.value}
          onChange={(v, meta) => patch({ value: v }, meta)}
          onCommit={onCommit}
          onValidityChange={setFieldVerdict}
          fieldName={criterion.variable}
          catalog={catalog}
          structuredFilters={structuredFilters}
          validate={validate}
          showSlider={showSlider} />
      </CriterionRow>

    </CriterionCard>
  );
};

export default CriterionMenu;
