// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_SELECT_OPTIONS, GET_GROUPED_SELECT_OPTIONS } from '@/lib/api/documents';

// =================================================================
// SOURCE — OPTIONS DE MENU DÉROULANT
// =================================================================
// Deux opérations selon le mode : `getSelectOptions(fieldName, limit, searchTerm,
// catalog)` en mode plat, `getGroupedSelectOptions(groupField, optionsField,
// limit, catalog)` en mode groupé. La seconde renvoie déjà [{ group, options }],
// structure consommée telle quelle par SelectMenu — donc pass-through.
//
// Nombre d'options ramenées par appel. `limit` est un argument des deux opérations.
const LIMIT = 50;

function fetchSelectOptions([, fieldName, catalog, groupField, searchTerm]) {
  // Mode groupé dérivé de la présence du champ de groupe (aligné sur SelectMenu)
  if (groupField) {
    return request(
      GET_GROUPED_SELECT_OPTIONS,
      { groupField, optionsField: fieldName, limit: LIMIT, catalog },
      { catalog },
    ).then((data) => ({ flat: [], groups: data.getGroupedSelectOptions }));
  }

  return request(
    GET_SELECT_OPTIONS,
    { fieldName, searchTerm: searchTerm ?? '', limit: LIMIT, catalog },
    { catalog },
  ).then((data) => ({ flat: data.getSelectOptions, groups: [] }));
}

/**
 * Fetches the options displayed by SelectMenu (flat or two-level grouped).
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['selectOptions', fieldName, catalog, groupField, searchTerm]` key across
 * component instances, and keeps the previous options visible (no flash to
 * empty) while a new key — e.g. a debounced search term — resolves.
 *
 * @param {Object}  params
 * @param {string}  params.fieldName    - API field name (also used as the
 *   `optionsField` in grouped mode).
 * @param {string}  [params.catalog]    - API catalog.
 * @param {string}  [params.groupField] - Group field; its presence enables the
 *   grouped-options mode.
 * @param {string}  [params.searchTerm] - Text filter applied to labels.
 * @param {boolean} [params.enabled]    - Fetch activé (défaut true). À `false` quand le
 *   parent fournit une liste statique (`options`) : la clé SWR devient `null`, aucun
 *   appel n'est déclenché (règles des hooks : appel inconditionnel, mais fetch conditionnel).
 * @returns {{ options: Array, groups: Array, loading: boolean, error: (Error|null) }}
 *   Flat options, grouped options ([{ group, options }]), loading flag and error.
 */
export function useSelectOptions({ fieldName, catalog, groupField, searchTerm, enabled = true } = {}) {
  const grouped = !!groupField;

  // En mode groupé, `searchTerm` est HORS de la clé : l'API n'expose pas d'argument
  // de recherche sur getGroupedSelectOptions, la refetch serait identique à chaque
  // frappe. Le filtre est appliqué localement ci-dessous.
  const key = enabled ? ['selectOptions', fieldName, catalog, groupField, grouped ? null : searchTerm] : null;
  const { data, error, isLoading } = useSWR(key, fetchSelectOptions, { keepPreviousData: true });

  // Filtrage local du mode groupé : option par option, puis suppression des
  // groupes devenus vides. En mode plat, c'est l'API qui filtre (`searchTerm`).
  const term = (searchTerm || '').trim().toLowerCase();
  const groups = data?.groups ?? [];
  const filteredGroups = term
    ? groups
      .map((g) => ({ ...g, options: g.options.filter((o) => o.label.toLowerCase().includes(term)) }))
      .filter((g) => g.options.length > 0)
    : groups;

  return {
    options: data?.flat ?? [],
    groups: filteredGroups,
    loading: isLoading,
    error: error ?? null,
  };
}
