// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_SELECT_OPTIONS, GET_SELECT_OPTIONS_TREE } from '@/lib/api/documents';
import { useFieldMetadata } from '@/hooks/fieldMetadata/useFieldMetadata';

// =================================================================
// SOURCE — OPTIONS DE MENU DÉROULANT
// =================================================================
// Deux opérations selon le mode : `getSelectOptions(fieldName, limit, searchTerm,
// catalog)` en mode plat, `getSelectOptionsTree(fieldName, maxDepth: 2, searchTerm,
// catalog)` en mode groupé. L'arbre renvoyé [{ value, label, children? }] est mappé ici
// vers la structure [{ group, options }] consommée par SelectMenu. Dans les deux modes
// la recherche est faite par le serveur ; le hook ne filtre rien.
//
// En mode groupé, c'est le serveur qui remonte la hiérarchie depuis `fieldName`
// (via `Metadata.parentName`) : `groupField` force le mode, sa valeur n'est pas
// transmise à l'API. Quand il est absent, le mode est déduit de `parentName`.
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

function fetchSelectOptions([, fieldName, catalog, grouped, searchTerm, schema]) {
  if (grouped) {
    return request(
      GET_SELECT_OPTIONS_TREE,
      { fieldName, maxDepth: GROUP_DEPTH, searchTerm: searchTerm || undefined, catalog, schema },
    ).then((data) => ({ flat: [], groups: treeToGroups(data.getSelectOptionsTree) }));
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
 * `['selectOptions', fieldName, catalog, grouped, searchTerm, schema]` key across
 * component instances, and keeps the previous options visible (no flash to
 * empty) while a new key — e.g. a debounced search term — resolves. The search is
 * done by the API in both modes (a grouped search keeps the matching leaves and their
 * ancestors), so `searchTerm` is part of the key.
 *
 * @param {Object}  params
 * @param {string}  params.fieldName    - API field name (the leaf level in
 *   grouped mode).
 * @param {string}  [params.catalog]    - API catalog.
 * @param {string}  [params.schema]     - API schema within the catalog.
 * @param {string}  [params.groupField] - Group field; its presence forces the
 *   grouped-options mode. Without it the mode is deduced from the field's
 *   `Metadata.parentName` (a field with a parent is grouped). The API derives the
 *   group level from the column hierarchy, so the value itself is not sent.
 * @param {string}  [params.searchTerm] - Text filter applied to labels by the API.
 * @param {boolean} [params.enabled]    - Fetch activé (défaut true). À `false` quand le
 *   parent fournit une liste statique (`options`) : la clé SWR devient `null`, aucun
 *   appel n'est déclenché (règles des hooks : appel inconditionnel, mais fetch conditionnel).
 * @returns {{ options: Array, groups: Array, grouped: boolean, loading: boolean, error: (Error|null) }}
 *   Flat options, grouped options ([{ group, options }]), the resolved mode, loading flag
 *   and error.
 */
export function useSelectOptions({ fieldName, catalog, schema, groupField, searchTerm, enabled = true } = {}) {
  // Sans `groupField`, le mode se lit dans la fiche du champ : le schéma est mis en
  // cache et partagé, mais la requête d'options attend sa réponse (`ready`) pour ne pas
  // lancer un appel plat que l'arbre remplacerait aussitôt. Un schéma en échec laisse
  // `parentName` vide : on retombe sur le mode plat plutôt que de bloquer le menu.
  const { field, ready } = useFieldMetadata({ fieldName, catalog, schema, enabled: enabled && !groupField });
  const grouped = !!groupField || !!field?.parentName;

  const key = enabled && (groupField || ready)
    ? ['selectOptions', fieldName, catalog, grouped, searchTerm, schema]
    : null;
  const { data, error, isLoading } = useSWR(key, fetchSelectOptions, { keepPreviousData: true });

  return {
    options: data?.flat ?? [],
    groups: data?.groups ?? [],
    grouped,
    loading: isLoading,
    error: error ?? null,
  };
}
