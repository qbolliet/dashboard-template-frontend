'use client';

import { useEffect, useState } from 'react';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';
import { defaultValue, isComplete } from '../../utils/filterTypes';
import CriterionCard from './CriterionCard';
import CriterionRow from './CriterionRow';
import ValueField from './ValueField';

/**
 * Controlled criterion card: three rows (variable, operation, value) whose value
 * type drives the value field. State lives entirely in the parent through
 * `criterion` / `onChange`; this component only derives display data and patches.
 *
 * @param {{variable: ?string, operation: ?string, value: *, type: ?string,
 *   parenLeft: boolean, parenRight: boolean}} criterion - Controlled criterion state.
 * @param {function(object): void} onChange - Receives the updated criterion.
 * @param {function(): void} [onRemove] - Removes the criterion.
 * @param {boolean} [removable] - Enables the removal button.
 * @param {{value: string, label: string, type: string}[]} variables - Variable catalog.
 * @param {{continuous: Array, date: Array, categorical: Array, text: Array}} operationsByType -
 *   Operation options indexed by variable type.
 * @param {function(string): Promise<{value: string, label: string}[]>} [fetchValues] -
 *   Async loader of categorical value options for a variable.
 * @param {boolean} [parentheses] - Enables the grouping parentheses.
 * @param {boolean} [validate] - Enables validation (accent color + inline feedback).
 * @param {boolean} [showLabels] - Shows the row labels instead of tooltips.
 * @param {boolean} [lockedVariable] - Disables the variable select.
 * @param {boolean} [lockedOperation] - Disables the operation select.
 * @param {boolean} [showOperation] - Renders the operation row.
 * @param {boolean} [showSlider] - Continuous type only: render the value as a ConstraintField
 *   slider (numeric inputs on top, track below) instead of bare numeric inputs.
 * @returns {JSX.Element}
 */
const CriterionMenu = ({
  criterion,
  onChange,
  onRemove,
  removable = false,
  variables,
  operationsByType,
  fetchValues,
  parentheses = false,
  validate = false,
  showLabels = false,
  lockedVariable = false,
  lockedOperation = false,
  showOperation = true,
  showSlider = false,
}) => {
  // Méta de la variable sélectionnée → source du type courant
  const varMeta = variables.find((v) => v.value === criterion.variable) ?? null;
  const type = varMeta?.type ?? null;
  const ops = type ? (operationsByType[type] ?? []) : [];

  // Bornes du ConstraintField (type continu) — issues de la variable, défaut 0..100 step 1
  const sliderMin = varMeta?.min ?? 0;
  const sliderMax = varMeta?.max ?? 100;
  const sliderStep = varMeta?.step ?? 1;

  // Options de valeurs catégorielles (fetch asynchrone).
  // On mémorise la variable d'origine des options → l'état de chargement et la liste
  // visible se déduisent du rendu, sans setState synchrone dans l'effet (cascades).
  const [valueState, setValueState] = useState({ forVariable: null, options: [] });

  useEffect(() => {
    // On ne charge que pour une variable catégorielle effectivement choisie
    if (type !== 'categorical' || !criterion.variable || !fetchValues) return undefined;
    let alive = true;
    Promise.resolve(fetchValues(criterion.variable)).then((opts) => {
      // setState confiné au callback asynchrone (et non dans le corps de l'effet)
      if (alive) setValueState({ forVariable: criterion.variable, options: opts ?? [] });
    });
    return () => { alive = false; };
    // fetchValues est stable (prop) → pas besoin de l'inclure
  }, [criterion.variable, type]);

  // Dérivations : options visibles uniquement si elles correspondent à la variable
  // courante ; chargement tant que la variable catégorielle choisie n'a pas ses options.
  const isCategorical = type === 'categorical';
  const optionsReady = isCategorical && valueState.forVariable === criterion.variable;
  const valueOptions = optionsReady ? valueState.options : [];
  const loadingValues = isCategorical && !!criterion.variable && !optionsReady;

  // Raccourci de mise à jour partielle du critère contrôlé
  const patch = (partial) => onChange({ ...criterion, ...partial });

  // Changement de variable : reset opération et valeur selon le nouveau type
  const onVariable = (id) => {
    const meta = variables.find((v) => v.value === id);
    const t = meta?.type ?? null;
    const newOps = t ? (operationsByType[t] ?? []) : [];
    const op = newOps[0]?.value ?? null;
    patch({ variable: id, type: t, operation: op, value: defaultValue(t, op) });
  };

  // Changement d'opération : reset de la seule valeur
  const onOperation = (op) => patch({ operation: op, value: defaultValue(type, op) });

  // Toggle d'une parenthèse (gauche/droite)
  const onToggleParen = (side) =>
    patch(side === 'left'
      ? { parenLeft: !criterion.parenLeft }
      : { parenRight: !criterion.parenRight });

  // Couleur d'accent : neutre hors validation, sinon succès/erreur selon complétude
  const accent = !validate
    ? 'hsl(var(--criterion-border-default))'
    : isComplete(criterion)
      ? 'hsl(var(--color-success-500))'
      : 'hsl(var(--color-error-500))';

  // CONVERSION : variable interne → format SelectMenu [{value, label}]
  const variableSelVal = criterion.variable
    ? [{ value: criterion.variable, label: varMeta?.label ?? criterion.variable }]
    : [];

  // CONVERSION : opération interne → format SelectMenu [{value, label}]
  const operationSelVal = criterion.operation
    ? [{
        value: criterion.operation,
        label: ops.find((o) => o.value === criterion.operation)?.label ?? criterion.operation,
      }]
    : [];

  return (
    <CriterionCard
      accent={accent}
      parentheses={parentheses}
      parenLeft={!!criterion.parenLeft}
      parenRight={!!criterion.parenRight}
      onToggleParen={onToggleParen}
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
          disabled={!type || lockedOperation}
          validate={validate}
          placeholder="Opération…"
          onChange={(items) => onOperation(items[0]?.value ?? null)} />
      </CriterionRow>

      <CriterionRow label="Valeur" step={showOperation ? 3 : 2} showLabel={showLabels}
        tooltipText="Valeur — valeur(s) comparée(s)">
        <ValueField
          type={type}
          operation={criterion.operation}
          value={criterion.value}
          onChange={(v) => patch({ value: v })}
          valueOptions={valueOptions}
          loadingValues={loadingValues}
          validate={validate}
          showSlider={showSlider}
          sliderMin={sliderMin}
          sliderMax={sliderMax}
          sliderStep={sliderStep} />
      </CriterionRow>

    </CriterionCard>
  );
};

export default CriterionMenu;
