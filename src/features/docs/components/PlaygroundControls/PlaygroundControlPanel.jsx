'use client';

// Importation des modules
import {
    CtrlRadio,
    CtrlSelect,
    CtrlToggle,
    CtrlText,
    CtrlNumber,
    CtrlColor,
} from './PlaygroundControls';

// =================================================================
// PLAYGROUND CONTROL PANEL — aiguilleur schéma → contrôle
// =================================================================
// Traduit le `controls` d'un module docs/playgrounds/*.jsx en contrôles rendus. C'est la
// seule pièce qui connaît la correspondance `type` → composant : ajouter un type de
// contrôle au vocabulaire des schémas se fait ICI et nulle part ailleurs.
//
// Le même objet `controls` alimente aussi le sérialiseur (serializeJsx.js) : une seule
// déclaration décrit à la fois ce que l'utilisateur manipule et ce qui est écrit dans le
// code généré. C'est ce qui garantit qu'ils ne divergent pas.
//
// GROUPEMENT EN LIGNES : un contrôle peut porter `row: <n>` pour retrouver la mise en
// page des anciennes pages /test-*, qui groupaient les contrôles par affinité (les
// molettes d'un même canal ensemble). Sans `row`, tout part sur une seule ligne qui
// passe à la ligne d'elle-même — `.ctrl-row` est déjà en `flex-wrap: wrap`.

/**
 * Reads the visible label of a control, defaulting to its prop name.
 *
 * @param {string} key - Prop name the control drives.
 * @param {Object} control - Control descriptor from the schema.
 * @returns {string} The label to display.
 */
const labelOf = (key, control) => control.label ?? key;

/**
 * Builds the visible label of one option.
 *
 * `null` is spelled out rather than rendered as an empty entry: in a playground it
 * means "prop left out", which is a meaningful choice and the one that produces the
 * shortest generated code.
 *
 * @param {Object} control - Control descriptor, possibly holding a `labels` map.
 * @param {*} option - The option value.
 * @returns {string} The label to display.
 */
const optionLabel = (control, option) => {
    if (control.labels && option in Object(control.labels)) return control.labels[option];
    if (option === null || option === undefined) return 'aucun';
    if (option === '') return '(vide)';
    return String(option);
};

/**
 * Renders one control from its schema descriptor.
 *
 * `select` is the only type needing an encoding step: a native `<select>` carries
 * strings and nothing else, so an options list holding `null` or numbers would come
 * back as `"null"` / `"3"`. Options are therefore addressed by INDEX, and the original
 * value is read back from the schema's own array — which keeps `null` a real `null`.
 *
 * @param {string} key - Prop name the control drives.
 * @param {Object} control - Control descriptor (`type`, `options`, `min`, `max`, `step`…).
 * @param {*} value - Current value.
 * @param {Function} set - Called with the new value.
 * @returns {JSX.Element|null} The rendered control, or null for an unknown type.
 */
const renderControl = (key, control, value, set) => {
    const label = labelOf(key, control);

    switch (control.type) {
        case 'boolean':
            return <CtrlToggle key={key} label={label} value={value} onChange={set} />;

        case 'text':
            return (
                <CtrlText
                    key={key}
                    label={label}
                    value={value ?? ''}
                    placeholder={control.placeholder}
                    onChange={set} />
            );

        case 'number':
            return (
                <CtrlNumber
                    key={key}
                    label={label}
                    value={value}
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    onChange={set} />
            );

        case 'color':
            return <CtrlColor key={key} label={label} value={value} onChange={set} />;

        case 'radio':
            // CtrlRadio compare et restitue la valeur BRUTE (pas de passage par le DOM
            // form) : null, nombres et chaînes y transitent tels quels, sans encodage.
            return (
                <CtrlRadio
                    key={key}
                    label={label}
                    options={control.options.map((option) => ({
                        value: option,
                        label: optionLabel(control, option),
                    }))}
                    value={value}
                    onChange={set} />
            );

        case 'select': {
            const index = control.options.findIndex((option) => option === value);
            return (
                <CtrlSelect
                    key={key}
                    label={label}
                    options={control.options.map((option, i) => ({
                        value: String(i),
                        label: optionLabel(control, option),
                    }))}
                    value={String(index)}
                    onChange={(encoded) => set(control.options[Number(encoded)])} />
            );
        }

        default:
            return null;
    }
};

/**
 * Panel driving every prop of a playground, built from its control schema.
 *
 * @param {Object} props - Component props.
 * @param {Object} props.controls - The schema's `controls` map, keyed by prop name.
 * @param {Object} props.values - Current value of each control.
 * @param {Function} props.onChange - Called with `(key, value)` on every change.
 * @param {React.ReactNode} [props.hint] - Free note displayed under the controls.
 * @returns {JSX.Element} The control panel.
 */
const PlaygroundControlPanel = ({ controls, values, onChange, hint }) => {
    const entries = Object.entries(controls);

    // Regroupement par `row`, dans l'ordre de première apparition : un schéma qui
    // n'utilise pas `row` produit donc une seule ligne.
    const rows = new Map();
    for (const [key, control] of entries) {
        const row = control.row ?? 0;
        if (!rows.has(row)) rows.set(row, []);
        rows.get(row).push([key, control]);
    }

    return (
        <section className="tp-section doc-playground__controls" aria-label="Contrôles du composant">
            {[...rows.entries()].map(([row, group]) => (
                <div className="ctrl-row" key={row}>
                    {group.map(([key, control]) =>
                        renderControl(key, control, values[key], (next) => onChange(key, next)))}
                </div>
            ))}

            {hint && <p className="ctrl-hint">{hint}</p>}
        </section>
    );
};

export default PlaygroundControlPanel;
