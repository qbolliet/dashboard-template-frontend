'use client';

// Importation des modules
import { useId } from 'react';
import './PlaygroundControls.scss';

// =================================================================
// CONTRÔLES DE PLAYGROUND — jeu unique de contrôles du dépôt
// =================================================================
// Jeu unique de contrôles, à l'origine partagé par /test-tabs, /test-chart,
// /test-criterion-menu et /test-multi-criterion-menu. Chacune de ces pages en
// embarquait auparavant sa propre copie, ainsi qu'une redéclaration des mêmes
// sélecteurs CSS *globaux* (.ctrl-*, .tp-ctrl-btn) : la dernière feuille chargée
// l'emportait silencieusement sur les autres.
//
// Le fichier a migré de src/app/_playground/ vers la feature de documentation : c'est
// désormais <ComponentPlayground> qui en est le consommateur unique, via l'aiguilleur
// PlaygroundControlPanel.jsx qui traduit un schéma de docs/playgrounds/ en contrôles.
// Les pages /test-* et la coquille de réexport src/app/_playground/ ont été supprimées
// en P4.6 — ce fichier est désormais la SEULE implémentation de contrôles du dépôt.
//
// Les classes restent GLOBALES et gardent leurs noms (.tp-section, .ctrl-*,
// .tp-ctrl-btn) : plus aucune page.scss de /test-* ne les vise, mais les renommer reste
// un nettoyage séparé, non nécessaire à P4.6.
//
// Motif ARIA retenu pour les groupes d'options exclusives (CtrlRadio) :
// role="group" + aria-labelledby, et aria-pressed sur chaque <button>. On ne
// passe PAS par role="radiogroup"/role="radio" : la sémantique radio impose un
// roving tabindex et une navigation aux flèches (cf. TabList.jsx) — inutilement
// lourd pour des pages de démo, alors qu'un groupe de boutons bascule est déjà
// le motif employé partout ailleurs dans le dépôt (ToolbarButton, CriterionCard,
// ThemeToggleButton). Un seul motif, pas de mélange des deux.

/** Base class of every control button. */
const BTN = 'tp-ctrl-btn';

/**
 * Normalizes an option to the `{ value, label }` shape.
 *
 * @param {Object|string|number} opt - Either a plain scalar or a `{ value, label }` object.
 * @returns {{value: *, label: string}} The normalized option.
 */
// Les pages passent soit des chaînes nues (['horizontal', 'vertical']), soit des
// objets ({ value, label }) : on normalise ici plutôt que d'aligner les appels.
const toOption = (opt) => (opt !== null && typeof opt === 'object' ? opt : { value: opt, label: String(opt) });

/**
 * Builds the class list of a control button from its active state.
 *
 * @param {boolean} active - Whether the button is the selected/on one.
 * @returns {string} The class attribute value.
 */
const btnClass = (active) => (active ? `${BTN} ${BTN}--active` : BTN);

/**
 * Group of mutually exclusive buttons, one of which carries the current value.
 *
 * @param {Object} props - Component props.
 * @param {string} props.label - Name of the group, exposed as its accessible name.
 * @param {Array<Object|string|number>} props.options - Options, as scalars or `{ value, label }`.
 * @param {*} props.value - The currently selected option value.
 * @param {Function} props.onChange - Called with the newly selected value.
 * @returns {JSX.Element} The labelled group of buttons.
 */
const CtrlRadio = ({ label, options, value, onChange }) => {
  // useId() garantit un identifiant stable entre le rendu serveur et l'hydratation
  // (un compteur de module casserait cette stabilité, et la règle react-hooks le refuse).
  const labelId = useId();

  return (
    <div className="ctrl-group" role="group" aria-labelledby={labelId}>
      <span className="ctrl-label" id={labelId}>{label} :</span>
      {options.map((raw) => {
        const opt = toOption(raw);
        const active = value === opt.value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            className={btnClass(active)}
            // L'état n'est plus porté par la seule couleur de la classe --active.
            aria-pressed={active}
            onClick={() => onChange(opt.value)}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

/**
 * Native `<select>` paired with its label.
 *
 * @param {Object} props - Component props.
 * @param {string} props.label - Visible label, linked to the field via `htmlFor`.
 * @param {Array<Object|string|number>} props.options - Options, as scalars or `{ value, label }`.
 * @param {string} props.value - The currently selected value.
 * @param {Function} props.onChange - Called with the newly selected value.
 * @returns {JSX.Element} The labelled select.
 */
const CtrlSelect = ({ label, options, value, onChange }) => {
  const uid = useId();

  return (
    <div className="ctrl-group">
      {/* htmlFor/id : sans ce couple, le <select> n'a aucun nom accessible (axe select-name). */}
      <label className="ctrl-label" htmlFor={uid}>{label} :</label>
      <select
        id={uid}
        className="ctrl-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}>
        {options.map((raw) => {
          const opt = toOption(raw);
          return <option key={String(opt.value)} value={opt.value}>{opt.label}</option>;
        })}
      </select>
    </div>
  );
};

/**
 * Boolean toggle rendered as an on/off button.
 *
 * @param {Object} props - Component props.
 * @param {string} props.label - Button text, which also acts as its accessible name.
 * @param {boolean} props.value - Current on/off state.
 * @param {Function} props.onChange - Called with the toggled state.
 * @returns {JSX.Element} The toggle button.
 */
const CtrlToggle = ({ label, value, onChange }) => (
  <button
    type="button"
    className={btnClass(value)}
    aria-pressed={value}
    onClick={() => onChange(!value)}>
    {label}
  </button>
);

/**
 * Free-text input paired with its label.
 *
 * @param {Object} props - Component props.
 * @param {string} props.label - Visible label, linked to the field via `htmlFor`.
 * @param {string} props.value - Current text value.
 * @param {string} [props.placeholder] - Placeholder shown when empty.
 * @param {Function} props.onChange - Called with the new text value.
 * @returns {JSX.Element} The labelled text field.
 */
const CtrlText = ({ label, value, placeholder, onChange }) => {
  const uid = useId();

  return (
    <div className="ctrl-group">
      <label className="ctrl-label" htmlFor={uid}>{label} :</label>
      <input
        id={uid}
        type="text"
        className="ctrl-text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
};

/**
 * Numeric input paired with its label.
 *
 * @param {Object} props - Component props.
 * @param {string} props.label - Visible label, linked to the field via `htmlFor`.
 * @param {number} props.value - Current numeric value.
 * @param {number} [props.min] - Lower bound.
 * @param {number} [props.max] - Upper bound.
 * @param {number} [props.step] - Increment of the native stepper.
 * @param {Function} props.onChange - Called with the new value, already coerced to a number.
 * @returns {JSX.Element} The labelled number field.
 */
const CtrlNumber = ({ label, value, min, max, step, onChange }) => {
  const uid = useId();

  return (
    <div className="ctrl-group">
      <label className="ctrl-label" htmlFor={uid}>{label} :</label>
      <input
        id={uid}
        type="number"
        className="ctrl-number"
        value={value}
        min={min}
        max={max}
        step={step}
        // Un champ vidé donne Number('') === 0, ce qui écraserait silencieusement la
        // valeur par un 0 hors bornes ; on retombe alors sur le minimum s'il existe.
        onChange={(e) => onChange(e.target.value === '' ? (min ?? 0) : Number(e.target.value))} />
    </div>
  );
};

/**
 * Native color picker (hex) paired with its label.
 *
 * @param {Object} props - Component props.
 * @param {string} props.label - Visible label, linked to the field via `htmlFor`.
 * @param {string} props.value - Current color, as a `#rrggbb` string.
 * @param {Function} props.onChange - Called with the new color.
 * @returns {JSX.Element} The labelled color field.
 */
const CtrlColor = ({ label, value, onChange }) => {
  const uid = useId();

  return (
    <div className="ctrl-group">
      <label className="ctrl-label" htmlFor={uid}>{label} :</label>
      <input
        id={uid}
        type="color"
        className="ctrl-color"
        value={value}
        onChange={(e) => onChange(e.target.value)} />
    </div>
  );
};

export { CtrlRadio, CtrlSelect, CtrlToggle, CtrlText, CtrlNumber, CtrlColor };
