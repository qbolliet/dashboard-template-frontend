// Importation des modules
import { useFieldMetadata } from '@/hooks/fieldMetadata/useFieldMetadata';
import { useFieldStats } from '@/hooks/fieldStats/useFieldStats';

// =================================================================
// SOURCE — BORNES DE CHAMP (getFieldStats)
// =================================================================
// Les bornes du slider sont les `min` / `max` de getFieldStats, sur toute la colonne ou
// sur le périmètre `scopeFilters` quand l'appelant en donne un. Un périmètre et non « le
// filtre courant » : celui-ci contient le plus souvent le critère que le champ édite, et
// les bornes se refermeraient alors sur la sélection. ConstraintField appelle ce hook une
// ou deux fois : bornes de validation (colonne ou `scopeFilters`), et bornes de la seule
// piste quand il reçoit un `trackScope` (filtre des AUTRES critères d'un
// MultiCriterionMenu, cf. filterEngine.scopeWithout). L'API ne fournit
// pas de pas : il se déduit ici de la famille de type du champ et de son format, fournis
// par l'appelant quand il les connaît, lus sinon dans le `Metadata` du champ (une requête
// de schéma, partagée par tout le catalogue).

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

// Nombre de pas visé sur l'étendue d'une mesure quand aucun format ne dicte la précision.
const TARGET_STEPS = 100;

/**
 * Converts a `min` / `max` of getFieldStats into a number on the slider axis.
 *
 * @param {*} raw - Bound as serialized by the API: number, decimal string (integer beyond
 *   2^53), ISO `YYYY-MM-DD` date or ISO 8601 timestamp.
 * @param {string} [typeFamily] - `typeFamily` of the field.
 * @returns {(number|undefined)} Number (epoch ms for DATE / TIMESTAMP), or undefined when
 *   the bound is missing or not numeric (text column).
 */
export const boundToNumber = (raw, typeFamily) => {
  if (raw === null || raw === undefined || raw === '') return undefined;

  if (typeFamily === 'DATE' || typeFamily === 'TIMESTAMP') {
    // Une date nue est lue à minuit LOCAL, comme les dates saisies dans ConstraintField
    // (parseDate) ; un horodatage ISO 8601 porte son propre fuseau.
    const bare = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw));
    const ms = bare ? new Date(+bare[1], +bare[2] - 1, +bare[3]).getTime() : Date.parse(raw);
    return Number.isFinite(ms) ? ms : undefined;
  }

  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Derives the slider step of a field.
 *
 * INTEGER: 1. DATE: one day. TIMESTAMP: one hour. NUMBER: the precision of the field's
 * `displayFormat` when it has one (`',.2f'` gives 0.01), otherwise `(max - min) / 100`
 * rounded down to a power of 10.
 *
 * @param {Object} params
 * @param {string} [params.typeFamily]    - `typeFamily` of the field.
 * @param {string} [params.displayFormat] - d3-format string of the field.
 * @param {number} [params.min] - Lower bound on the slider axis.
 * @param {number} [params.max] - Upper bound on the slider axis.
 * @returns {number} Positive step.
 */
export const stepFor = ({ typeFamily, displayFormat, min, max }) => {
  if (typeFamily === 'INTEGER') return 1;
  if (typeFamily === 'DATE') return MS_PER_DAY;
  if (typeFamily === 'TIMESTAMP') return MS_PER_HOUR;

  const precision = /\.(\d+)f/.exec(displayFormat ?? '');
  if (precision) return 10 ** -Number(precision[1]);

  const range = max - min;
  if (!(range > 0)) return 1;
  return 10 ** Math.floor(Math.log10(range / TARGET_STEPS));
};

/**
 * Fetches the numeric/date bounds (min, max, step) that drive ConstraintField's slider.
 *
 * `min` / `max` come from getFieldStats over `scopeFilters` (whole column without it);
 * `step` is derived from the field's type family. The component lets explicit `min` /
 * `max` / `step` props take precedence over the returned values. ConstraintField calls it
 * once for the validation bounds and, given a `trackScope`, a second time for the track
 * bounds alone; the second call shares the field metadata through SWR's deduplication.
 * While a new scope loads, the previous bounds stay returned (SWR `keepPreviousData`).
 *
 * @param {Object}  params
 * @param {string}  params.fieldName            - API field name.
 * @param {string}  [params.catalog]            - API catalog.
 * @param {string}  [params.schema]             - API schema within the catalog.
 * @param {?Object} [params.scopeFilters]       - Scope of the bounds (`FilterNode`, sent as
 *   the `structuredFilters` of getFieldStats). Never a tree that holds the criterion being
 *   edited: its own range would become the bounds, and the slider would close on it. An
 *   empty scope (no row) returns `min` / `max` undefined.
 * @param {string}  [params.typeFamily]         - `typeFamily` of the field, when known.
 * @param {?string} [params.displayFormat]      - `displayFormat` of the field, when known
 *   (`null` = known to have none). With `typeFamily`, spares the schema request.
 * @param {boolean} [params.enabled] - Fetch activé (défaut true). À `false` quand le
 *   parent ne fournit pas de `fieldName` (bornes `min`/`max` statiques passées en props) :
 *   aucun appel n'est déclenché, les bornes restent `undefined`.
 * @returns {{ min: (number|undefined), max: (number|undefined), step: (number|undefined),
 *   loading: boolean, error: (Error|null) }} Bounds on the slider axis (epoch ms for
 *   dates), undefined until resolved, loading flag and error.
 */
export function useRangeBounds({
  fieldName, catalog, schema, scopeFilters, typeFamily, displayFormat, enabled = true,
} = {}) {
  // Famille et format connus de l'appelant : aucune requête de schéma
  const known = typeFamily !== undefined && displayFormat !== undefined;
  const { field: fetched, error: fieldError } = useFieldMetadata({
    fieldName, catalog, schema, enabled: enabled && !known,
  });
  const field = known ? { typeFamily, displayFormat } : fetched;
  const { stats, loading, error: statsError } = useFieldStats({
    fieldName, structuredFilters: scopeFilters, catalog, schema, enabled,
  });

  const min = boundToNumber(stats?.min, field?.typeFamily);
  const max = boundToNumber(stats?.max, field?.typeFamily);

  return {
    min,
    max,
    // Sans fiche du champ, la famille est inconnue : le pas reste indéterminé et
    // ConstraintField applique son repli plutôt qu'un pas deviné.
    step: field && stats ? stepFor({ typeFamily: field.typeFamily, displayFormat: field.displayFormat, min, max }) : undefined,
    loading,
    error: statsError ?? fieldError,
  };
}
