import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';
import { toSelectValue } from '../../../utils/filterTypes';
import './Connector.scss';

/**
 * Logical connector rendered between two criterion cards.
 *
 * Purely presentational — no hooks, no state. When the connector is locked to a
 * single value (fixed connector or single option) it renders as a static label;
 * otherwise it exposes a compact SelectMenu of the available connectors. The select
 * is styled directly through its `className` (no extra layout wrapper).
 *
 * @param {string} value - Current connector value (e.g. 'AND').
 * @param {{value: string, label: string}[]} options - Available connector options
 *   (already in SelectMenu format).
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
      // Connecteur libre : select compact AND/OR… stylé via className (pas de wrapper)
      <SelectMenu
        compact
        className="mcm-connector__select"
        options={options}
        value={toSelectValue(value, options)}
        onChange={(items) => items[0]?.value && onChange(items[0].value)} />
    )}

    {/* Trait reliant le connecteur à la carte suivante */}
    <div className="mcm-connector__line" />
  </div>
);

export default Connector;
