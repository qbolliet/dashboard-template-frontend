// Importation des modules
import { useEffect, useRef, useState } from 'react';
import { SortAscIcon, SortDescIcon, SortNoneIcon, FilterIcon, CloseIcon } from '@/components/icons';
import TableFilterPopover from '../TableFilterPopover/TableFilterPopover';
import './TableHeaderCell.scss';

/**
 * Column header cell: clickable sort label, a value-filter funnel button (with
 * its popover), and a hover-revealed column-removal button.
 *
 * @param {object} props
 * @param {import('../../../utils/formatCell').ColumnDef} props.col - Column definition.
 * @param {boolean} props.isNumeric - Numeric column (mirrors the inner layout and alignments).
 * @param {boolean} props.isLast - Last visible column ; anchors the popover to the right.
 * @param {?('asc'|'desc')} props.sortDir - Active sort direction on this column.
 * @param {function(): void} props.onSort - Cycles none → asc → desc → none.
 * @param {?Array} props.filter - Current value selection (null = every value selected).
 * @param {function(?Array): void} props.onFilterChange - New selection ; null = tout.
 * @param {Array} props.uniqueValues - Distinct, sorted values of the column.
 * @param {Object<string, number>} props.valueCounts - Row count per value (popover badges).
 * @param {boolean} props.enableSort - Enables the sort trigger ; otherwise the label is static.
 * @param {boolean} props.enableFilter - Enables the filter funnel + popover.
 * @param {boolean} props.enableColumnRemoval - Enables the hover-revealed removal button.
 * @param {function(): void} props.onRemove - Hides the column.
 * @returns {JSX.Element}
 */
const TableHeaderCell = ({
  col,
  isNumeric,
  isLast,
  sortDir,
  onSort,
  filter,
  onFilterChange,
  uniqueValues,
  valueCounts,
  enableSort,
  enableFilter,
  enableColumnRemoval,
  onRemove,
}) => {
  // Ouverture du popover de filtre — seul état local du composant.
  const [filterOpen, setFilterOpen] = useState(false);
  // Réfère le <th> pour la détection de clic extérieur (le popover est un
  // descendant DOM direct, non portalé).
  const thRef = useRef(null);

  // Fermeture sur clic extérieur / touche Échap. Abonnement d'événements du
  // document dans un effet : pattern légitime (pas de setState-en-effet pour
  // synchroniser une prop), autorisé sous react-hooks v6.
  useEffect(() => {
    if (!filterOpen) return;
    const handleClickOutside = (e) => {
      if (thRef.current && !thRef.current.contains(e.target)) setFilterOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [filterOpen]);

  const label = col.label || col.key;

  // Filtre actif : une sélection partielle (ni « tout », ni un tableau de même
  // longueur que l'ensemble des valeurs).
  const hasActiveFilter = enableFilter && filter !== null && filter.length !== uniqueValues.length;

  const sortTitle = sortDir === 'asc'
    ? `${label} — croissant · cliquer pour décroissant`
    : sortDir === 'desc'
      ? `${label} — décroissant · cliquer pour désactiver`
      : `Trier par ${label}`;

  const thClasses = [
    'data-table-th',
    isNumeric && 'data-table-th--num',
    enableColumnRemoval && 'data-table-th--removable',
  ].filter(Boolean).join(' ');

  const innerClasses = [
    'data-table-th-inner',
    enableColumnRemoval && 'data-table-th-inner--removable',
  ].filter(Boolean).join(' ');

  return (
    <th
      ref={thRef}
      scope="col"
      className={thClasses}
      // Posé sur le <th> (et non sur le bouton, comme le prototype) : c'est
      // l'en-tête de colonne dans son ensemble qui porte l'état de tri en ARIA.
      aria-sort={enableSort
        ? (sortDir === 'asc' ? 'ascending' : sortDir === 'desc' ? 'descending' : 'none')
        : undefined}
    >
      {/* Croix de suppression : coin haut-droit du th, révélée à son survol (CSS pur) */}
      {enableColumnRemoval && (
        <button
          type="button"
          className="data-table-th-remove"
          onClick={onRemove}
          title={`Supprimer la colonne « ${label} »`}
          aria-label={`Supprimer la colonne ${label}`}
        >
          <CloseIcon />
        </button>
      )}

      <div className={innerClasses}>
        {/* Déclencheur de tri (libellé entier cliquable) ou libellé statique */}
        {enableSort ? (
          <button
            type="button"
            className={`data-table-th-sort-btn${sortDir ? ' data-table-th-sort-btn--active' : ''}`}
            onClick={onSort}
            title={sortTitle}
            aria-label={sortTitle}
          >
            <span className="data-table-th-label">{label}</span>
            <span className={`data-table-th-sort-icon${sortDir ? ' data-table-th-sort-icon--on' : ''}`}>
              {sortDir === 'asc' ? <SortAscIcon /> : sortDir === 'desc' ? <SortDescIcon /> : <SortNoneIcon />}
            </span>
          </button>
        ) : (
          <span className="data-table-th-plain">
            <span className="data-table-th-label">{label}</span>
          </span>
        )}

        {/* Bouton entonnoir : bascule le popover de filtre par valeurs */}
        {enableFilter && (
          <div className={`data-table-th-actions${hasActiveFilter ? ' data-table-th-actions--has-active' : ''}`}>
            <button
              type="button"
              className={`data-table-th-btn${hasActiveFilter || filterOpen ? ' data-table-th-btn--active' : ''}`}
              onClick={() => setFilterOpen((open) => !open)}
              aria-label={`Filtrer ${label}`}
              aria-expanded={filterOpen}
              title="Filtrer par valeurs"
            >
              <FilterIcon />
            </button>
          </div>
        )}

        {enableFilter && filterOpen && (
          <TableFilterPopover
            uniqueValues={uniqueValues}
            valueCounts={valueCounts}
            filter={filter}
            onFilterChange={onFilterChange}
            side={isLast ? 'right' : 'left'}
          />
        )}
      </div>
    </th>
  );
};

export default TableHeaderCell;
