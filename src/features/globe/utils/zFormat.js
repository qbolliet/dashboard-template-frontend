// =================================================================
// Z FORMAT — formateur de la valeur `z` d'un calque
// =================================================================
// Même priorité que <Chart> : un `format` écrit par l'appelant l'emporte toujours, puis
// le `displayFormat` / `unit` de la colonne décrite dans `fields`, puis un nombre
// localisé. Aucun `import { format } from 'd3-format'` nu : la locale passe par
// `valueFormatter` (src/utils/format/formatValue.js), qui reçoit un tag Intl.

// Importation des modules
import { intlLocaleFor } from '@/i18n/formats';
import { fieldOf } from '@/utils/format/fields';
import { valueFormatter } from '@/utils/format/formatValue';

/**
 * Builds the formatter of a layer's `z` values (tooltip, size legend).
 *
 * @param {object} options
 * @param {?(string|function(*): string)} [options.format] - `format.z` of the layer: a
 *   d3-format specifier or a formatting function.
 * @param {?Array<Object>} [options.fields] - Column metadata (`fields` of `<Globe>`).
 * @param {?string} [options.key] - The `z` key of the layer.
 * @param {string} [options.locale] - Site locale code.
 * @returns {function(*): string} Formatter; a non-numeric value is stringified as is.
 */
export const zFormatter = ({ format, fields, key, locale }) => {
  if (typeof format === 'function') return format;
  const intlLocale = intlLocaleFor(locale);
  // Un spécificateur d3 se lit comme un `displayFormat` sans unité : même compilateur,
  // donc mêmes séparateurs que la colonne décrite par l'API.
  const spec = typeof format === 'string' && format !== '' ? { displayFormat: format } : fieldOf(fields, key);
  const formatter = valueFormatter(spec, intlLocale);
  if (formatter) return formatter;
  const number = new Intl.NumberFormat(intlLocale);
  return (value) => {
    const n = typeof value === 'number' ? value : Number(value);
    return value == null || value === '' || Number.isNaN(n) ? String(value ?? '') : number.format(n);
  };
};
