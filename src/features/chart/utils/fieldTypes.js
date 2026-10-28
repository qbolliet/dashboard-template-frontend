// =================================================================
// FIELD TYPES — typage et formatage des colonnes d'après leurs métadonnées
// =================================================================
// `detectType` devine le type en échantillonnant les valeurs, ce qui se trompe sur un code :
// '01012100' (NC8) passe pour un nombre et `coerce` le convertit en 1012100, zéros de tête
// perdus. Quand l'appelant dispose des métadonnées de colonne (`fields` de
// DatasetWithMetadata), le type vient de la famille calculée par l'API et la détection
// n'a plus lieu. Ce module est la frontière : il ne dépend ni de la feature filtre ni de
// React.
//
// `fieldOf` et `typeFromField`, purs et sans lien avec la configuration du site, sont
// promus dans src/utils/format/fields.js (second consommateur : le globe) et
// réexportés ici pour les modules du chart qui les importent depuis ce fichier.

import { valueFormatter } from '@/utils/format/formatValue';
import { fieldOf, typeFromField } from '@/utils/format/fields';
import { intlLocaleFor } from '@/i18n/formats';

/**
 * Resolves the type of a column: from its metadata when `fields` describes it, by sampling
 * the values otherwise.
 *
 * @param {?Array<Object>} fields - Column metadata, or nothing for the historical detection.
 * @param {string} name - Column name.
 * @param {function(): 'date'|'number'|'categorical'} detect - Sampling fallback; only
 *   called when the metadata does not settle the type, so that `detectType` is never
 *   run for a described column.
 * @returns {'date'|'number'|'categorical'} Column type.
 */
export const resolveColumnType = (fields, name, detect) => {
  const field = fieldOf(fields, name);
  return field ? typeFromField(field) : detect();
};

export { fieldOf, typeFromField };

/**
 * Completes the `format` prop of a chart with the formatters of the described columns.
 * A format the caller wrote explicitly always wins; a column without `displayFormat` (or
 * not numeric) is left to the chart's default formatter.
 *
 * @param {?Array<Object>} fields - Column metadata.
 * @param {{x: ?string, y: ?string, z: ?string}} columns - Column plotted on each axis.
 * @param {{x?: *, y?: *, z?: *}} format - The caller's `format` prop.
 * @param {string} [locale] - Site locale code.
 * @returns {{x?: *, y?: *, z?: *}} `format`, extended with a formatter function per axis.
 */
export const formatFromFields = (fields, columns, format, locale) => {
  if (!Array.isArray(fields)) return format;

  const intlLocale = intlLocaleFor(locale);
  const completed = { ...format };

  for (const axis of ['x', 'y', 'z']) {
    const field = fieldOf(fields, columns[axis]);
    // Une date garde son format temporel : `displayFormat` est un spécificateur de nombre.
    if (completed[axis] != null || !field || typeFromField(field) !== 'number') continue;
    const formatter = valueFormatter(field, intlLocale);
    if (formatter) completed[axis] = formatter;
  }

  return completed;
};
