// Importation des composants
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';
import TypeAwareInput from '@/components/filter/TypeAwareInput/TypeAwareInput';
import { isIntegerSqlType, isNumericSqlType, isDateSqlType } from '../../../utils/filterTypes';
import './ValueField.scss';

/**
 * Adaptive value field: renders the right control for a (sql_type, is_categorical,
 * operation) triple. Options (categorical) and bounds (numeric/date) are loaded by the
 * primitives themselves via `fieldName` (their internal mock/GraphQL hooks) — this
 * component no longer receives them.
 *
 * Purely presentational — no internal state. The numeric/date value verdict computed by
 * {@link ConstraintField} is forwarded to the parent through `onFieldValidity`
 * (min ≤ max, within bounds…); the other field types leave it untouched (the card falls
 * back to `isComplete`).
 *
 * @param {?string} sqlType - PostgreSQL sql_type of the selected variable.
 * @param {boolean} isCategorical - Categorical flag of the selected variable.
 * @param {?string} operation - Selected operation value.
 * @param {*} value - Current value in the criterion's internal format.
 * @param {function(*): void} onChange - Emits the next internal value.
 * @param {function(boolean): void} [onFieldValidity] - Receives ConstraintField's verdict.
 * @param {?string} fieldName - API field name (= variable id) feeding the primitives' hooks.
 * @param {?string} [catalog] - API catalog forwarded to the primitives.
 * @param {boolean} [validate] - Enables real-time validation on the field.
 * @param {boolean} [showSlider] - Numeric/date: render the ConstraintField slider bar.
 * @returns {JSX.Element}
 */
const ValueField = ({
  sqlType,
  isCategorical,
  operation,
  value,
  onChange,
  onFieldValidity,
  fieldName,
  catalog,
  validate = false,
  showSlider = false,
}) => {
  // ── Aucune variable choisie ──
  if (!fieldName) {
    return <p className="criterion-placeholder">{"Choisir d'abord une variable"}</p>;
  }

  // ── Catégoriel : SelectMenu alimenté par le hook interne (fieldName) ──
  if (isCategorical) {
    const isMulti = operation === 'in' || operation === 'not_in';

    // Multi : value est un tableau d'ids ; les libellés sont résolus par le SelectMenu.
    if (isMulti) {
      const selVal = Array.isArray(value) ? value.map((id) => ({ value: id })) : [];
      return (
        <SelectMenu
          fieldName={fieldName}
          catalog={catalog}
          allowMulti
          value={selVal}
          validate={validate}
          placeholder="Sélectionner des valeurs…"
          onChange={(items) => onChange(items.map((i) => i.value))} />
      );
    }

    // Égalité : value est un id (ou null).
    const selVal = value != null ? [{ value }] : [];
    return (
      <SelectMenu
        fieldName={fieldName}
        catalog={catalog}
        value={selVal}
        validate={validate}
        placeholder="Sélectionner une valeur…"
        onChange={(items) => onChange(items[0]?.value ?? null)} />
    );
  }

  // ── Numérique : ConstraintField (bornes chargées via fieldName) ──
  // Uniforme (single + between) → valide toujours min ≤ max / bornes et remonte le
  // verdict. La barre slider est gouvernée par showSlider (masquée = inputs seuls).
  if (isNumericSqlType(sqlType)) {
    const isRange = operation === 'between';
    const valueType = isIntegerSqlType(sqlType) ? 'integer' : 'float';
    return (
      <ConstraintField
        key={`${fieldName}-${operation}`}
        valueType={valueType}
        rangeMode={isRange}
        fieldName={fieldName}
        catalog={catalog}
        validate={validate}
        showSlider={showSlider}
        inputsOnTop
        valueLow={isRange ? value?.min : value}
        valueHigh={isRange ? value?.max : undefined}
        onChange={(out) => onChange(isRange ? { min: out.min, max: out.max } : out.value)}
        onValidityChange={onFieldValidity} />
    );
  }

  // ── Date : ConstraintField valueType="date" (bornes via fieldName) ──
  // La plage est portée par une chaîne « A → B » (calendrier double) ; ConstraintField
  // valide l'ordre (début ≤ fin) et les bornes, et remonte le verdict.
  if (isDateSqlType(sqlType)) {
    const isRange = operation === 'between';
    return (
      <ConstraintField
        key={`${fieldName}-${isRange ? 'range' : 'single'}`}
        valueType="date"
        rangeMode={isRange}
        fieldName={fieldName}
        catalog={catalog}
        validate={validate}
        showSlider={showSlider}
        inputsOnTop
        valueLow={value ?? ''}
        onChange={(out) => onChange(out.value ?? '')}
        onValidityChange={onFieldValidity} />
    );
  }

  // ── Texte (et autres types non catégoriels) ──
  return (
    <TypeAwareInput inputType="text" value={value ?? ''} validate={validate} onChange={onChange} />
  );
};

export default ValueField;
