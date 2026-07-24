// Importation des modules
import { SortAscIcon, SortDescIcon, LayersIcon, PlusIcon, CloseIcon } from '@/components/icons';
import './TableChipRow.scss';

/**
 * Row summarizing the table's active state: applied value filters, the active
 * sort, hidden columns, and a trailing "clear all" action. Pure presentation —
 * filter chip text is precomputed by the caller (this component owns no
 * formatting logic, only markup and interaction wiring).
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, value: string}>} props.filterChips - Active
 *   column filters, already formatted as display-ready chips.
 * @param {?{key: string, dir: 'asc'|'desc', label: string}} props.sortChip - Active sort, or null.
 * @param {Array<{key: string, label?: string}>} props.hiddenColumns - Columns removed from view.
 * @param {boolean} props.canReset - Shows the trailing "clear all" button.
 * @param {function(string): void} props.onClearFilter - Clears one column's filter, by key.
 * @param {function(): void} props.onClearSort - Clears the active sort.
 * @param {function(string): void} props.onRestoreColumn - Restores a hidden column, by key.
 * @param {function(): void} props.onResetAll - Clears filters, sort and hidden columns at once.
 * @returns {JSX.Element}
 */
const TableChipRow = ({
  filterChips,
  sortChip,
  hiddenColumns,
  canReset,
  onClearFilter,
  onClearSort,
  onRestoreColumn,
  onResetAll,
}) => (
  <div className="data-table-chips">
    {filterChips.length > 0 && <span className="data-table-chips-label">Filtres</span>}

    {/* display: contents — la <ul> s'efface du rendu pour que les <li> participent
        directement au flex-wrap du conteneur, tout en gardant la sémantique de liste. */}
    <ul className="data-table-chips-list">
      {filterChips.map((chip) => (
        <li className="data-table-chip" key={chip.key}>
          <span className="data-table-chip-key">{chip.label} =</span>
          <span>{chip.value}</span>
          <button
            type="button"
            onClick={() => onClearFilter(chip.key)}
            aria-label={`Retirer le filtre ${chip.label}`}
          >
            <CloseIcon />
          </button>
        </li>
      ))}

      {sortChip && (
        <li className="data-table-chip data-table-chip--sort">
          <span className="data-table-chip-icon">
            {sortChip.dir === 'asc' ? <SortAscIcon /> : <SortDescIcon />}
          </span>
          <span className="data-table-chip-key">{sortChip.label}</span>
          <span className="data-table-chip-dir">{sortChip.dir}</span>
          <button type="button" onClick={onClearSort} aria-label="Retirer le tri">
            <CloseIcon />
          </button>
        </li>
      )}

      {hiddenColumns.map((col) => (
        <li className="data-table-chip data-table-chip--hidden" key={`h-${col.key}`}>
          <span className="data-table-chip-icon"><LayersIcon /></span>
          <span className="data-table-chip-key">colonne masquée</span>
          <span>{col.label || col.key}</span>
          <button
            type="button"
            onClick={() => onRestoreColumn(col.key)}
            title="Restaurer"
            aria-label={`Restaurer la colonne ${col.label || col.key}`}
          >
            <PlusIcon />
          </button>
        </li>
      ))}
    </ul>

    {/* Calé à droite par margin-left: auto — frère de la <ul>, pas un élément de liste. */}
    {canReset && (
      <button type="button" className="data-table-chips-reset" onClick={onResetAll}>
        Tout effacer
      </button>
    )}
  </div>
);

export default TableChipRow;
