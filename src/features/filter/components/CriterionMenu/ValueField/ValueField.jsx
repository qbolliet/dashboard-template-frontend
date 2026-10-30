// Importation des composants
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';
import TypeAwareInput from '@/components/filter/TypeAwareInput/TypeAwareInput';
import { isIntegerFamily, isNumericFamily, isDateFamily } from '@/features/filter/utils/filterTypes';
import './ValueField.scss';

/**
 * Adaptive value field: renders the right control for a (typeFamily, isCategorical,
 * operation) triple. Options (categorical) and bounds (numeric/date) are loaded by the
 * primitives themselves via `fieldName` (their internal mock/GraphQL hooks) — this
 * component no longer receives them. `valuesScope` narrows both to the values the other
 * criteria still reach: menu options (SelectMenu `scopeFilters`) and slider track
 * (ConstraintField `trackScope`).
 *
 * Purely presentational — no internal state. The numeric/date value verdict computed by
 * {@link ConstraintField} is forwarded to the parent through `onValidityChange`
 * (min ≤ max, within bounds…); the other field types leave it untouched (the card falls
 * back to `isComplete`).
 *
 * @param {?string} typeFamily - `TypeFamily` enum value of the selected variable.
 * @param {boolean} isCategorical - Categorical flag of the selected variable.
 * @param {?string} operation - Selected operation (`FilterOperation` enum value).
 * @param {*} value - Current value in the criterion's internal format.
 * @param {function(*, {debounce: boolean}=): void} onChange - Emits the next internal
 *   value. The second argument tags the emission intent: text/number/date typing is
 *   `{ debounce: true }` (amortised upstream), categorical selection is
 *   `{ debounce: false }` (a discrete, structural-like change → immediate).
 * @param {function(): void} [onCommit] - Forwarded to typing inputs' blur so a debounced
 *   parent can flush its pending emission (categorical selects need no flush).
 * @param {function(boolean): void} [onValidityChange] - Receives ConstraintField's verdict.
 * @param {?string} fieldName - API field name (= variable id) feeding the primitives' hooks.
 * @param {?string} [catalog] - API catalog forwarded to the primitives.
 * @param {boolean} [grouped] - Categorical: the value menu lists grouped options (the
 *   variable has a `parentName`). Left undefined, the menu reads it from the schema.
 * @param {?string} [displayFormat] - Numeric: d3-format of the variable, giving the slider
 *   step. Left undefined, the field reads it from the schema.
 * @param {?Object} [valuesScope] - Scope of the values offered (`FilterNode`). Categorical:
 *   forwarded to {@link SelectMenu} as `scopeFilters` — the menu only lists the values
 *   held by the rows satisfying it, and a selected value outside it stays selected.
 *   Numeric/date: forwarded to {@link ConstraintField} as `trackScope` — it bounds the
 *   slider track, the validation staying on the whole column. Undefined (default) =
 *   whole column.
 * @param {boolean} [validate] - Enables real-time validation on the field.
 * @param {boolean} [showSlider] - Numeric/date: render the ConstraintField slider bar.
 * @param {string}   [intlLocale] - Full Intl tag, driving number and date formatting.
 * @param {string}   [dateMask] - Human-readable date mask shown as a placeholder.
 * @param {string}   [dateOrder] - Permutation of 'D', 'M' and 'Y' telling how to read
 *   a typed date. The mask is its display, this is its meaning.
 * @param {number}   [firstDayOfWeek] - 0 for Sunday, 1 for Monday.
 * @param {Object}   [labels] - Wording overrides, merged over the French defaults.
 * @returns {JSX.Element}
 */
const ValueField = ({
  typeFamily,
  isCategorical,
  operation,
  value,
  onChange,
  onCommit,
  onValidityChange,
  fieldName,
  catalog,
  grouped,
  displayFormat,
  valuesScope,
  validate = false,
  showSlider = false,
  labels,
  intlLocale,
  dateMask,
  dateOrder,
  firstDayOfWeek,
}) => {
  // ── Aucune variable choisie ──
  if (!fieldName) {
    return <p className="criterion-placeholder">{"Choisir d'abord une variable"}</p>;
  }

  // ── Catégoriel : SelectMenu alimenté par le hook interne (fieldName) ──
  // La valeur garde les options choisies ({ value, label }) : leur libellé reste affiché
  // même quand une recherche ou la limite de 50 options les sort de la liste chargée.
  // Un id nu (critère persisté) reste accepté ; l'arbre n'en retient que l'id (optionIds).
  // `valuesScope` (filtre des AUTRES critères) restreint les options proposées ; une valeur
  // déjà choisie qu'il exclut reste choisie (SelectMenu la liste en tête).
  if (isCategorical) {
    const isMulti = operation === 'IN' || operation === 'NOT_IN';
    const asOption = (v) => (v !== null && typeof v === 'object' ? v : { value: v });
    const toOption = ({ value: id, label }) => ({ value: id, label });

    // Multi : value est un tableau d'options.
    if (isMulti) {
      const selVal = Array.isArray(value) ? value.map(asOption) : [];
      return (
        <SelectMenu
          labels={labels}
          fieldName={fieldName}
          catalog={catalog}
          grouped={grouped}
          scopeFilters={valuesScope}
          allowMulti
          value={selVal}
          validate={validate}
          placeholder={labels.valuesPlaceholder}
          onChange={(items) => onChange(items.map(toOption), { debounce: false })} />
      );
    }

    // Égalité : value est une option (ou null).
    const selVal = value != null ? [asOption(value)] : [];
    return (
      <SelectMenu
        labels={labels}
        fieldName={fieldName}
        catalog={catalog}
        grouped={grouped}
        scopeFilters={valuesScope}
        value={selVal}
        validate={validate}
        placeholder={labels.valuePlaceholder}
        onChange={(items) => onChange(items[0] ? toOption(items[0]) : null, { debounce: false })} />
    );
  }

  // ── Numérique : ConstraintField (bornes chargées via fieldName) ──
  // Uniforme (single + between) → valide toujours min ≤ max / bornes et remonte le
  // verdict. La barre slider est gouvernée par showSlider (masquée = inputs seuls).
  if (isNumericFamily(typeFamily)) {
    const isRange = operation === 'BETWEEN';
    const valueType = isIntegerFamily(typeFamily) ? 'integer' : 'float';
    return (
      <ConstraintField
        labels={labels}
        intlLocale={intlLocale}
        dateMask={dateMask}
        dateOrder={dateOrder}
        firstDayOfWeek={firstDayOfWeek}
        key={`${fieldName}-${operation}`}
        valueType={valueType}
        rangeMode={isRange}
        fieldName={fieldName}
        catalog={catalog}
        typeFamily={typeFamily}
        displayFormat={displayFormat}
        trackScope={valuesScope}
        validate={validate}
        showSlider={showSlider}
        inputsOnTop
        defaultValueLow={isRange ? value?.min : value}
        defaultValueHigh={isRange ? value?.max : undefined}
        onChange={(out) => onChange(isRange ? { min: out.min, max: out.max } : out.value, { debounce: true })}
        onCommit={onCommit}
        onValidityChange={onValidityChange} />
    );
  }

  // ── Date : ConstraintField valueType="date" (bornes via fieldName) ──
  // La plage est portée par une chaîne « A → B » (calendrier double) ; ConstraintField
  // valide l'ordre (début ≤ fin) et les bornes, et remonte le verdict.
  if (isDateFamily(typeFamily)) {
    const isRange = operation === 'BETWEEN';
    return (
      <ConstraintField
        labels={labels}
        intlLocale={intlLocale}
        dateMask={dateMask}
        dateOrder={dateOrder}
        firstDayOfWeek={firstDayOfWeek}
        key={`${fieldName}-${isRange ? 'range' : 'single'}`}
        valueType="date"
        rangeMode={isRange}
        fieldName={fieldName}
        catalog={catalog}
        typeFamily={typeFamily}
        displayFormat={displayFormat}
        trackScope={valuesScope}
        validate={validate}
        showSlider={showSlider}
        inputsOnTop
        defaultValueLow={value ?? ''}
        onChange={(out) => onChange(out.value ?? '', { debounce: true })}
        onCommit={onCommit}
        onValidityChange={onValidityChange} />
    );
  }

  // ── Texte (et autres types non catégoriels) ──
  return (
    <TypeAwareInput
        labels={labels}
        intlLocale={intlLocale}
        dateMask={dateMask}
        dateOrder={dateOrder}
        firstDayOfWeek={firstDayOfWeek}
      inputType="text"
      value={value ?? ''}
      validate={validate}
      onChange={(v) => onChange(v, { debounce: true })}
      onCommit={onCommit} />
  );
};

export default ValueField;
