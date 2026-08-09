// Importation des modules
import { mergeLabels } from '@/utils/i18n/mergeLabels';
import { pluralize } from '@/utils/i18n/pluralize';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { intlLocaleFor } from '@/i18n/formats';
import './TableFooter.scss';

// Les deux compteurs sont des libellés ACCORDÉS : un objet de catégories CLDR, pas une
// chaîne. Le code disait `n > 1 ? 's' : ''`, ce qui est faux dès qu'on traduit (l'anglais
// met zéro au pluriel) et déjà faux pour 1,5. Voir src/utils/i18n/pluralize.js.
const DEFAULT_LABELS = {
  rowCount: { one: '{count} ligne', other: '{count} lignes' },
  columnCount: { one: '{count} colonne', other: '{count} colonnes' },
};

/**
 * Table footer: a SQL hint on the left, row/column counts on the right.
 *
 * @param {object} props
 * @param {string} props.sqlHint - Query hint text (e.g. summarized filters/sort).
 * @param {number} props.rowCount - Number of rows currently displayed (post filter/sort).
 * @param {number} props.columnCount - Number of visible columns.
 * @param {string} [props.locale] - Site locale code, driving the plural rules.
 * @param {Object} [props.labels] - Wording overrides, merged over the French defaults.
 * @returns {JSX.Element}
 */
const TableFooter = ({ sqlHint, rowCount, columnCount, locale = DEFAULT_LOCALE, labels: labelOverrides }) => {
  const labels = mergeLabels(DEFAULT_LABELS, labelOverrides);
  const intlLocale = intlLocaleFor(locale);

  return (
    <footer className="data-table-footer">
      <span>{sqlHint}</span>
      <span className="data-table-footer-right">
        <span>{pluralize(labels.rowCount, rowCount, intlLocale)}</span>
        <span>·</span>
        <span>{pluralize(labels.columnCount, columnCount, intlLocale)}</span>
      </span>
    </footer>
  );
};

export default TableFooter;
