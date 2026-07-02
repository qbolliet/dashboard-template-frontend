// Importation des composants
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';
import TypeAwareInput from '@/components/filter/TypeAwareInput/TypeAwareInput';

/**
 * Adaptive value field: renders the right control for a (type, operation) pair.
 *
 * Purely presentational — no internal state. Converts between the criterion's
 * internal value format and the `[{value, label}]` shape expected by SelectMenu.
 *
 * @param {?string} type - Variable type (continuous, date, categorical, text).
 * @param {?string} operation - Selected operation value.
 * @param {*} value - Current value in the criterion's internal format.
 * @param {function(*): void} onChange - Emits the next internal value.
 * @param {{value: string, label: string}[]} [valueOptions] - Options for categorical values.
 * @param {boolean} [loadingValues] - True while categorical options are being fetched.
 * @param {boolean} [validate] - Enables real-time validation on inputs.
 * @param {boolean} [showSlider] - Continuous type only: render a ConstraintField slider bar.
 * @param {number} [sliderMin] - Lower bound of the slider (continuous + showSlider).
 * @param {number} [sliderMax] - Upper bound of the slider.
 * @param {number} [sliderStep] - Step increment of the slider.
 * @returns {JSX.Element}
 */
const ValueField = ({
  type,
  operation,
  value,
  onChange,
  valueOptions = [],
  loadingValues = false,
  validate = false,
  showSlider = false,
  sliderMin = 0,
  sliderMax = 100,
  sliderStep = 1,
}) => {
  // ── Type non défini : aucune variable choisie ──
  if (!type) {
    return <p className="criterion-placeholder">{"Choisir d'abord une variable"}</p>;
  }

  // ── Continu ──
  if (type === 'continuous') {
    const isRange = operation === 'between';

    // Slider activé : le ConstraintField devient le contrôle unique (inputs en haut,
    // piste en dessous). On le remonte (key) au changement d'opération/bornes pour
    // réinitialiser son état interne sur les nouvelles valeurs contrôlées.
    if (showSlider) {
      return (
        <ConstraintField
          key={`${operation}-${sliderMin}-${sliderMax}`}
          valueType="float"
          rangeMode={isRange}
          min={sliderMin}
          max={sliderMax}
          step={sliderStep}
          validate={validate}
          inputsOnTop
          valueLow={isRange ? value?.min : value}
          valueHigh={isRange ? value?.max : undefined}
          // Réémission au format interne du critère (ConstraintField émet déjà des chaînes)
          onChange={(out) => onChange(isRange ? { min: out.min, max: out.max } : out.value)} />
      );
    }

    // Plage : deux champs numériques min/max reliés par une flèche
    if (isRange) {
      return (
        <div className="criterion-dual">
          <input
            className="criterion-num" type="number" step="any" placeholder="min"
            value={value?.min ?? ''}
            onChange={(e) => onChange({ ...(value ?? {}), min: e.target.value })} />
          <span className="criterion-dual-sep">→</span>
          <input
            className="criterion-num" type="number" step="any" placeholder="max"
            value={value?.max ?? ''}
            onChange={(e) => onChange({ ...(value ?? {}), max: e.target.value })} />
        </div>
      );
    }
    // Comparateur simple : un seul champ flottant
    return (
      <TypeAwareInput inputType="float" value={value ?? ''} validate={validate} onChange={onChange} />
    );
  }

  // ── Date ──
  if (type === 'date') {
    const isRange = operation === 'between';
    // key change → remonte le composant quand on bascule simple ⇄ plage
    return (
      <TypeAwareInput
        key={isRange ? 'range' : 'single'}
        inputType="date"
        dateMode={isRange ? 'range' : 'single'}
        value={value ?? ''}
        validate={validate}
        onChange={onChange} />
    );
  }

  // ── Catégoriel ──
  if (type === 'categorical') {
    const isMulti = operation === 'in' || operation === 'not_in';

    // Multi : value est un tableau d'IDs → conversion en [{value, label}]
    if (isMulti) {
      const selVal = Array.isArray(value)
        ? value.map((id) => valueOptions.find((o) => o.value === id) ?? { value: id, label: id })
        : [];
      return (
        <SelectMenu
          options={valueOptions}
          allowMulti
          value={selVal}
          validate={validate}
          placeholder={loadingValues ? 'Chargement…' : 'Sélectionner des valeurs…'}
          onChange={(items) => onChange(items.map((i) => i.value))} />
      );
    }

    // Égalité : value est un ID (ou null) → tableau à un élément pour le SelectMenu
    const selVal = value != null
      ? [valueOptions.find((o) => o.value === value) ?? { value, label: value }]
      : [];
    return (
      <SelectMenu
        options={valueOptions}
        value={selVal}
        validate={validate}
        placeholder={loadingValues ? 'Chargement…' : 'Sélectionner une valeur…'}
        onChange={(items) => onChange(items[0]?.value ?? null)} />
    );
  }

  // ── Texte ──
  return (
    <TypeAwareInput inputType="text" value={value ?? ''} validate={validate} onChange={onChange} />
  );
};

export default ValueField;
