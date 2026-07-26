// Importation des modules
import { useState } from 'react';
import { SearchIcon, CloseIcon, CheckIcon } from '@/components/icons';
import './TableFilterPopover.scss';

// Normalisation pour la recherche interne (comparaison insensible à la casse).
const norm = (v) => (v == null ? '' : String(v).toLowerCase());

/**
 * Value-filter popover for a table column header: an internal search box, a
 * Tout/Aucun bar with a "k / n" counter, and a scrollable list of
 * checkbox-like value rows with per-value counts.
 *
 * @param {object} props
 * @param {Array} props.uniqueValues - Distinct, sorted values of the column.
 * @param {Object<string, number>} props.valueCounts - Row count per value.
 * @param {?Array} props.filter - Current selection (null = every value, [] = none).
 * @param {function(?Array): void} props.onFilterChange - Re-checking every
 *   value normalizes the selection back to `null`.
 * @param {'left'|'right'} props.side - Anchor side of the popover.
 * @returns {JSX.Element}
 */
const TableFilterPopover = ({ uniqueValues, valueCounts, filter, onFilterChange, side }) => {
  // Filtre de recherche interne à la liste — seul état local du popover.
  const [search, setSearch] = useState('');

  const allSelected = filter === null;
  const noneSelected = filter !== null && filter.length === 0;

  const visibleValues = search
    ? uniqueValues.filter((v) => norm(v).includes(norm(search)))
    : uniqueValues;

  // Bascule d'une valeur ; recocher la totalité des valeurs normalise vers `null`.
  const toggleValue = (v) => {
    const current = allSelected ? new Set(uniqueValues) : new Set(filter);
    if (current.has(v)) current.delete(v); else current.add(v);
    onFilterChange(current.size === uniqueValues.length ? null : [...current]);
  };

  return (
    <div className={`data-table-pop data-table-pop--${side}`} onClick={(e) => e.stopPropagation()}>
      <search className="data-table-pop-search">
        <SearchIcon />
        <input
          type="text"
          autoFocus
          value={search}
          placeholder="Filtrer les valeurs…"
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="data-table-pop-search-clear"
            onClick={() => setSearch('')}
            aria-label="Effacer la recherche"
          >
            <CloseIcon />
          </button>
        )}
      </search>

      <div className="data-table-pop-bar">
        <div className="data-table-pop-bar-actions">
          <button type="button" onClick={() => onFilterChange(null)}>Tout</button>
          <button type="button" onClick={() => onFilterChange([])}>Aucun</button>
        </div>
        <span className="data-table-pop-bar-count">
          {allSelected
            ? `${uniqueValues.length} valeurs`
            : `${noneSelected ? 0 : filter.length} / ${uniqueValues.length}`}
        </span>
      </div>

      {visibleValues.length === 0 ? (
        <p className="data-table-pop-empty">Aucune valeur</p>
      ) : (
        <ul className="data-table-pop-list">
          {visibleValues.map((v) => {
            const checked = allSelected || filter.includes(v);
            return (
              <li key={String(v)}>
                <button
                  type="button"
                  className="data-table-pop-item"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleValue(v)}
                >
                  <span className="data-table-pop-item-checkbox">{checked && <CheckIcon />}</span>
                  <span className="data-table-pop-item-label">{String(v)}</span>
                  <span className="data-table-pop-item-count">{valueCounts[v] ?? 0}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default TableFilterPopover;
