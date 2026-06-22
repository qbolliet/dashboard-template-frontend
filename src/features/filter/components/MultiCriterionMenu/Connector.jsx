import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';

/**
 * Logical connector rendered between two criterion cards.
 *
 * Purely presentational — no hooks, no state. When the connector is locked to a
 * single value (fixed connector or single option) it renders as a static label;
 * otherwise it exposes a compact SelectMenu of the available connectors.
 *
 * @param {string} value - Current connector value (e.g. 'AND').
 * @param {{value: string, label: string}[]} options - Available connector options.
 * @param {function(string): void} onChange - Emits the selected connector value.
 * @param {'horizontal'|'vertical'} orientation - Layout direction of the builder.
 * @param {boolean} [isStatic] - Renders a non-interactive label instead of the select.
 * @returns {JSX.Element}
 */
const Connector = ({ value, options, onChange, orientation, isStatic }) => (
  <div className={`mcm-connector mcm-connector--${orientation}`}>
    {/* Trait reliant la carte précédente au connecteur */}
    <div className="mcm-connector__line" />

    {isStatic ? (
      // Connecteur figé : simple libellé non interactif
      <div className="mcm-connector__static">{value}</div>
    ) : (
      // Connecteur libre : select compact AND/OR…
      <div className="mcm-connector__select">
        <SelectMenu
          compact
          options={options}
          // CONVERSION : valeur interne (string) → format SelectMenu [{value, label}]
          value={[options.find((o) => o.value === value) ?? { value, label: value }]}
          onChange={(items) => items[0]?.value && onChange(items[0].value)} />
      </div>
    )}

    {/* Trait reliant le connecteur à la carte suivante */}
    <div className="mcm-connector__line" />
  </div>
);

export default Connector;
