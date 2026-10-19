// Importation des modules
import { useState } from 'react';
import { SearchIcon, CloseIcon, CheckIcon } from '@/components/icons';
import { useSelectOptions } from '@/components/filter/SelectMenu/useSelectOptions';
import { useDebouncedValue } from '@/hooks/debounce/useDebouncedValue';
import { mergeLabels } from '@/utils/i18n/mergeLabels';
import './TableFilterPopover.scss';

// Normalisation pour la recherche interne (comparaison insensible à la casse).
// Défauts français, surchargeables par la prop `labels` (cf. mergeLabels).
const DEFAULT_LABELS = {
  filterValues: 'Filtrer les valeurs…',
  clearSearch: 'Effacer la recherche',
  selectAll: 'Tout',
  selectNone: 'Aucun',
  noValue: 'Aucune valeur',
};

const norm = (v) => (v == null ? '' : String(v).toLowerCase());

/**
 * Value-filter popover for a table column header: an internal search box, a
 * Tout/Aucun bar with a "k / n" counter, and a scrollable list of
 * checkbox-like value rows with per-value counts.
 *
 * With `remote`, the table is backed by the API: the values are the column's
 * distinct values from getSelectOptions (searched server-side, not limited to the
 * loaded rows) and the selection is an include list — nothing ticked means no
 * filter, the API not telling every value nor their counts.
 *
 * @param {object} props
 * @param {Array} props.uniqueValues - Distinct, sorted values of the column (local mode).
 * @param {Object<string, number>} props.valueCounts - Row count per value (local mode).
 * @param {?Array} props.filter - Current selection (null = every value, [] = none).
 * @param {function(?Array): void} props.onFilterChange - Re-checking every
 *   value normalizes the selection back to `null` (local mode); unticking the last
 *   value does (remote mode).
 * @param {'left'|'right'} props.side - Anchor side of the popover.
 * @param {?{fieldName: string, catalog?: string, schema?: string}} [props.remote] -
 *   API coordinates of the column; enables the remote mode.
 * @param {Object} [props.labels] - Wording overrides, merged over the French defaults.
 * @returns {JSX.Element}
 */
const TableFilterPopover = ({ uniqueValues, valueCounts, filter, onFilterChange, side, remote = null, labels: labelOverrides }) => {
  const labels = mergeLabels(DEFAULT_LABELS, labelOverrides);
  // Filtre de recherche interne à la liste — seul état local du popover.
  const [search, setSearch] = useState('');

  // Mode distant : valeurs servies par getSelectOptions, la recherche étant faite par
  // l'API (debouncée, pour ne pas lancer une requête par frappe). Hook appelé dans
  // les deux modes (règles des hooks) ; sans `remote`, la clé SWR est nulle.
  const debouncedSearch = useDebouncedValue(search, 250);
  const { options: remoteOptions } = useSelectOptions({
    fieldName: remote?.fieldName,
    catalog: remote?.catalog,
    schema: remote?.schema,
    searchTerm: debouncedSearch,
    enabled: !!remote,
  });

  const allSelected = filter === null;
  const noneSelected = filter !== null && filter.length === 0;

  // Liste affichée : { value, label } dans les deux modes
  const visibleValues = remote
    ? remoteOptions
    : (search ? uniqueValues.filter((v) => norm(v).includes(norm(search))) : uniqueValues)
      .map((v) => ({ value: v, label: String(v) }));

  // Bascule d'une valeur.
  // Local : recocher la totalité des valeurs normalise vers `null`.
  // Distant : liste d'inclusion ; décocher la dernière valeur retire le filtre.
  const toggleValue = (v) => {
    if (remote) {
      const current = new Set(filter ?? []);
      if (current.has(v)) current.delete(v); else current.add(v);
      onFilterChange(current.size === 0 ? null : [...current]);
      return;
    }
    const current = allSelected ? new Set(uniqueValues) : new Set(filter);
    if (current.has(v)) current.delete(v); else current.add(v);
    onFilterChange(current.size === uniqueValues.length ? null : [...current]);
  };

  // Case cochée : en local, « tout » coche tout ; en distant, rien n'est coché sans filtre
  const isChecked = (v) => (remote ? !!filter?.includes(v) : allSelected || filter.includes(v));

  return (
    <div className={`data-table-pop data-table-pop--${side}`} onClick={(e) => e.stopPropagation()}>
      <search className="data-table-pop-search">
        <SearchIcon />
        <input
          type="text"
          autoFocus
          value={search}
          placeholder={labels.filterValues}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            type="button"
            className="data-table-pop-search-clear"
            onClick={() => setSearch('')}
            aria-label={labels.clearSearch}
          >
            <CloseIcon />
          </button>
        )}
      </search>

      <div className="data-table-pop-bar">
        <div className="data-table-pop-bar-actions">
          <button type="button" onClick={() => onFilterChange(null)}>{labels.selectAll}</button>
          {/* Une liste IN vide n'est pas exprimable côté API : « Aucun » est local seulement */}
          {!remote && (
            <button type="button" onClick={() => onFilterChange([])}>{labels.selectNone}</button>
          )}
        </div>
        <span className="data-table-pop-bar-count">
          {remote
            ? (allSelected ? '' : filter.length)
            : allSelected
              ? `${uniqueValues.length} valeurs`
              : `${noneSelected ? 0 : filter.length} / ${uniqueValues.length}`}
        </span>
      </div>

      {visibleValues.length === 0 ? (
        <p className="data-table-pop-empty">{labels.noValue}</p>
      ) : (
        <ul className="data-table-pop-list">
          {visibleValues.map(({ value: v, label }) => {
            const checked = isChecked(v);
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
                  <span className="data-table-pop-item-label">{label}</span>
                  {/* L'API ne renvoie pas d'effectif par valeur : compte local seulement */}
                  {!remote && <span className="data-table-pop-item-count">{valueCounts[v] ?? 0}</span>}
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
