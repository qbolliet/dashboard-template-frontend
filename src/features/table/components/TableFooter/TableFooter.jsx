// Importation des modules
import './TableFooter.scss';

/**
 * Table footer: a SQL hint on the left, row/column counts on the right.
 *
 * @param {object} props
 * @param {string} props.sqlHint - Query hint text (e.g. summarized filters/sort).
 * @param {number} props.rowCount - Number of rows currently displayed (post filter/sort).
 * @param {number} props.columnCount - Number of visible columns.
 * @returns {JSX.Element}
 */
const TableFooter = ({ sqlHint, rowCount, columnCount }) => (
  <footer className="data-table-footer">
    <span>{sqlHint}</span>
    <span className="data-table-footer-right">
      {/* Pluriels conditionnels, comme le prototype. */}
      <span>{rowCount} ligne{rowCount > 1 ? 's' : ''}</span>
      <span>·</span>
      <span>{columnCount} colonne{columnCount > 1 ? 's' : ''}</span>
    </span>
  </footer>
);

export default TableFooter;
