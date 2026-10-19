// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_SELECT_OPTIONS, GET_SELECT_OPTIONS_TREE } from '@/lib/api/documents';

// =================================================================
// SOURCE — OPTIONS DE MENU DÉROULANT
// =================================================================
// Deux opérations selon le mode : `getSelectOptions(fieldName, limit, searchTerm,
// catalog)` en mode plat, `getSelectOptionsTree(fieldName, maxDepth: 2, catalog)`
// en mode groupé. L'arbre renvoyé [{ value, label, children? }] est mappé ici vers
// la structure [{ group, options }] consommée par SelectMenu.
//
// En mode groupé, c'est le serveur qui remonte la hiérarchie depuis `fieldName`
// (via `Metadata.parentName`) : `groupField` ne sert qu'à activer le mode, sa
// valeur n'est pas transmise à l'API.
//
// Nombre d'options ramenées par appel en mode plat. L'arbre n'a pas de `limit` :
// l'API rejette un arbre trop grand plutôt que de le tronquer.
const LIMIT = 50;

// Profondeur de l'arbre demandé : la feuille (`fieldName`) et son parent direct,
// c'est-à-dire un niveau de groupes et un niveau d'options.
const GROUP_DEPTH = 2;

/**
 * Maps a two-level option tree to SelectMenu's grouped-options shape.
 *
 * A root without children (a NULL level ends its branch server-side) would be a
 * group with nothing to pick: it is dropped.
 *
 * @param {Array<{value: string, label: string, children?: Array}>} tree - Tree
 *   returned by `getSelectOptionsTree`.
 * @returns {Array<{group: {value: string, label: string}, options: Array}>} Groups.
 */
export const treeToGroups = (tree = []) =>
  tree
    .filter((node) => node.children?.length)
    .map((node) => ({
      group: { value: node.value, label: node.label },
      options: node.children.map(({ value, label }) => ({ value, label })),
    }));

function fetchSelectOptions([, fieldName, catalog, groupField, searchTerm, schema]) {
  // Mode groupé dérivé de la présence du champ de groupe (aligné sur SelectMenu)
  if (groupField) {
    return request(GET_SELECT_OPTIONS_TREE, { fieldName, maxDepth: GROUP_DEPTH, catalog, schema })
      .then((data) => ({ flat: [], groups: treeToGroups(data.getSelectOptionsTree) }));
  }

  return request(
    GET_SELECT_OPTIONS,
    { fieldName, searchTerm: searchTerm ?? '', limit: LIMIT, catalog, schema },
  ).then((data) => ({ flat: data.getSelectOptions, groups: [] }));
}

/**
 * Fetches the options displayed by SelectMenu (flat or two-level grouped).
 *
 * Backed by SWR: caches and deduplicates requests sharing the same
 * `['selectOptions', fieldName, catalog, groupField, searchTerm, schema]` key across
 * component instances, and keeps the previous options visible (no flash to
 * empty) while a new key — e.g. a debounced search term — resolves.
 *
 * @param {Object}  params
 * @param {string}  params.fieldName    - API field name (the leaf level in
 *   grouped mode).
 * @param {string}  [params.catalog]    - API catalog.
 * @param {string}  [params.schema]     - API schema within the catalog.
 * @param {string}  [params.groupField] - Group field; its presence enables the
 *   grouped-options mode (the API derives the group level from the column
 *   hierarchy, so its value is not sent).
 * @param {string}  [params.searchTerm] - Text filter applied to labels.
 * @param {boolean} [params.enabled]    - Fetch activé (défaut true). À `false` quand le
 *   parent fournit une liste statique (`options`) : la clé SWR devient `null`, aucun
 *   appel n'est déclenché (règles des hooks : appel inconditionnel, mais fetch conditionnel).
 * @returns {{ options: Array, groups: Array, loading: boolean, error: (Error|null) }}
 *   Flat options, grouped options ([{ group, options }]), loading flag and error.
 */
export function useSelectOptions({ fieldName, catalog, schema, groupField, searchTerm, enabled = true } = {}) {
  const grouped = !!groupField;

  // En mode groupé, `searchTerm` est encore HORS de la clé : l'arbre est chargé une
  // fois et filtré localement ci-dessous. (getSelectOptionsTree accepte un
  // `searchTerm` serveur ; le brancher est l'objet d'une étape ultérieure.)
  const key = enabled ? ['selectOptions', fieldName, catalog, groupField, grouped ? null : searchTerm, schema] : null;
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
