'use client';

import { useId, useState } from 'react';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';
import { defaultValue, isComplete, resolveOperations, toSelectValue } from '@/features/filter/utils/filterTypes';
import CriterionCard from './CriterionCard/CriterionCard';
import CriterionRow from './CriterionRow/CriterionRow';
import ValueField from './ValueField/ValueField';

/**
 * Controlled criterion card: three rows (variable, operation, value) whose SQL type
 * drives the value field. State lives entirely in the parent through `criterion` /
 * `onChange`; this component only derives display data and patches. Categorical options
 * and numeric/date bounds are loaded by the primitives themselves via `fieldName`
 * (their internal mock/GraphQL hooks) — no data-loading prop here.
 *
 * @param {{variable: ?string, operation: ?string, value: *, sql_type: ?string,
 *   is_categorical: ?boolean, bracketLeft: boolean, bracketRight: boolean}} criterion -
 *   Controlled criterion state.
 * @param {function(object, {debounce: boolean}=): void} onChange - Receives the updated
 *   criterion. The optional meta forwards the emission intent: absent for structural
 *   changes (variable/operation/bracket → immediate), `{ debounce }` for value edits.
 * @param {function(): void} [onCommit] - Value input blur signal, forwarded upstream so a
 *   debounced parent can flush its pending emission.
 * @param {function(): void} [onRemove] - Removes the criterion; its presence renders
 *   the removal button.
 * @param {{value: string, label: string, sql_type: string, is_categorical: boolean}[]} variables -
 *   Variable metadata list (from useVariableMetadata → metadataToVariables).
 * @param {Object<string, {value: string, label: string}[]>} operationsByType - Operations
 *   indexed by sql_type / "categorical" (config/filter/operations.json).
 * @param {string} [catalog] - API catalog forwarded to the value primitives.
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
 * @returns {JSX.Element}
 */
const CriterionMenu = ({
  criterion,
  onChange,
  onCommit,
  onRemove,
  variables,
  operationsByType,
  catalog,
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
}) => {
  // Méta de la variable sélectionnée → source du type SQL courant (catalogue autoritaire)
  const varMeta = variables.find((v) => v.value === criterion.variable) ?? null;
  const sqlType = varMeta?.sql_type ?? null;
  const isCategorical = varMeta?.is_categorical ?? false;
  const ops = resolveOperations(sqlType, isCategorical, operationsByType);

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
    const t = meta?.sql_type ?? null;
    const cat = meta?.is_categorical ?? false;
    const newOps = resolveOperations(t, cat, operationsByType);
    const op = newOps[0]?.value ?? null;
    setFieldVerdict(null);
    patch({ variable: id, sql_type: t, is_categorical: cat, operation: op, value: defaultValue(t, cat, op) });
  };

  // Changement d'opération : reset de la seule valeur
  const onOperation = (op) => {
    setFieldVerdict(null);
    patch({ operation: op, value: defaultValue(sqlType, isCategorical, op) });
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
    sql_type: sqlType,
    is_categorical: isCategorical,
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

      <CriterionRow label="Variable" step={1} showLabel={showLabels}
        htmlFor={variableId}
        tooltipText="Variable — champ à filtrer">
        <SelectMenu
          id={variableId}
          options={variables}
          value={variableSelVal}
          disabled={lockedVariable}
          validate={validate}
          placeholder="Sélectionner une variable…"
          onChange={(items) => onVariable(items[0]?.value ?? null)} />
      </CriterionRow>

      {showOperation && (
        <CriterionRow label="Opération" step={2} showLabel={showLabels}
          htmlFor={operationId}
          tooltipText="Opération — comparateur appliqué">
          <SelectMenu
            id={operationId}
            options={ops}
            value={operationSelVal}
            disabled={!criterion.variable || lockedOperation}
            validate={validate}
            placeholder="Opération…"
            onChange={(items) => onOperation(items[0]?.value ?? null)} />
        </CriterionRow>
      )}

      <CriterionRow label="Valeur" step={showOperation ? 3 : 2} showLabel={showLabels}
        tooltipText="Valeur — valeur(s) comparée(s)">
        <ValueField
          sqlType={sqlType}
          isCategorical={isCategorical}
          operation={criterion.operation}
          value={criterion.value}
          onChange={(v, meta) => patch({ value: v }, meta)}
          onCommit={onCommit}
          onValidityChange={setFieldVerdict}
          fieldName={criterion.variable}
          catalog={catalog}
          validate={validate}
          showSlider={showSlider} />
      </CriterionRow>

    </CriterionCard>
  );
};

export default CriterionMenu;
