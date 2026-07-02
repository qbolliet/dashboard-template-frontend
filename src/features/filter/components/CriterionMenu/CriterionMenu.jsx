'use client';

import { useState } from 'react';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';
import { defaultValue, isComplete, resolveOperations, toSelectValue } from '../../utils/filterTypes';
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
 * @param {function(object): void} onChange - Receives the updated criterion.
 * @param {function(): void} [onRemove] - Removes the criterion.
 * @param {boolean} [removable] - Enables the removal button.
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
 * @returns {JSX.Element}
 */
const CriterionMenu = ({
  criterion,
  onChange,
  onRemove,
  removable = false,
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

  // Raccourci de mise à jour partielle du critère contrôlé
  const patch = (partial) => onChange({ ...criterion, ...partial });

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

  // Couleur d'accent : neutre hors validation, sinon succès/erreur selon la validité
  const accent = !validate
    ? 'hsl(var(--criterion-border-default))'
    : valid
      ? 'hsl(var(--color-success-500))'
      : 'hsl(var(--color-error-500))';

  // Adaptateurs id → format SelectMenu (les ids restent la donnée métier)
  const variableSelVal = toSelectValue(criterion.variable, variables);
  const operationSelVal = toSelectValue(criterion.operation, ops);

  return (
    <CriterionCard
      accent={accent}
      valid={valid}
      footer={footer}
      validate={validate}
      parentheses={parentheses}
      bracketLeft={!!criterion.bracketLeft}
      bracketRight={!!criterion.bracketRight}
      onToggleBracket={onToggleBracket}
      onRemove={onRemove}
      removable={removable}>

      <CriterionRow label="Variable" step={1} showLabel={showLabels}
        tooltipText="Variable — champ à filtrer">
        <SelectMenu
          options={variables}
          value={variableSelVal}
          disabled={lockedVariable}
          validate={validate}
          placeholder="Sélectionner une variable…"
          onChange={(items) => onVariable(items[0]?.value ?? null)} />
      </CriterionRow>

      <CriterionRow label="Opération" step={2} showLabel={showLabels}
        hidden={!showOperation}
        tooltipText="Opération — comparateur appliqué">
        <SelectMenu
          options={ops}
          value={operationSelVal}
          disabled={!criterion.variable || lockedOperation}
          validate={validate}
          placeholder="Opération…"
          onChange={(items) => onOperation(items[0]?.value ?? null)} />
      </CriterionRow>

      <CriterionRow label="Valeur" step={showOperation ? 3 : 2} showLabel={showLabels}
        tooltipText="Valeur — valeur(s) comparée(s)">
        <ValueField
          sqlType={sqlType}
          isCategorical={isCategorical}
          operation={criterion.operation}
          value={criterion.value}
          onChange={(v) => patch({ value: v })}
          onFieldValidity={setFieldVerdict}
          fieldName={criterion.variable}
          catalog={catalog}
          validate={validate}
          showSlider={showSlider} />
      </CriterionRow>

    </CriterionCard>
  );
};

export default CriterionMenu;
