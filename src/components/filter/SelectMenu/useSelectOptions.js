// Importation des modules
import useSWR from 'swr';
import { request } from '@/lib/api/client';
import { GET_SELECT_OPTIONS, GET_SELECT_OPTIONS_TREE } from '@/lib/api/documents';
import { useFieldMetadata } from '@/hooks/fieldMetadata/useFieldMetadata';

// =================================================================
// SOURCE — OPTIONS DE MENU DÉROULANT
// =================================================================
// Deux opérations selon le mode : `getSelectOptions(fieldName, limit, searchTerm,
// catalog)` en mode plat, `getSelectOptionsTree(fieldName, maxDepth: 2, catalog)` en
// mode groupé. L'arbre renvoyé [{ value, label, children? }] est mappé ici vers la
// structure [{ group, options }] consommée par SelectMenu.
//
// La recherche ne va au serveur que lorsqu'elle peut y trouver quelque chose de plus :
//   - un ARBRE n'est jamais tronqué par l'API (elle le rejette au-delà de sa borne de
//     nœuds) : chargé une fois sans terme, il est complet, et la recherche se fait ici ;
//   - une liste PLATE est demandée avec une option de plus que ce qu'on affiche : si
//     cette option surnuméraire n'arrive pas, la liste est EXHAUSTIVE et la recherche se
//     fait ici aussi ; sinon le terme part à l'API (qui cherche dans le code et le libellé).
// La recherche locale suit la règle de l'API : code OU libellé, sans tenir compte de la
// casse, sur le niveau des feuilles.
//
// Le mode (plat ou groupé) se lit dans `grouped` quand l'appelant le connaît — il a
// souvent déjà la métadonnée du champ —, sinon dans `Metadata.parentName` du champ, au
// prix d'une requête de schéma avant celle des options.
//
// Nombre d'options affichées en mode plat ; la requête en demande une de plus.
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

/**
 * Tells whether an option matches a search term, with the API's rule: the code or the
 * label contains the term, case-insensitively.
 *
 * @param {{value: string, label: string}} option - Option to test.
 * @param {string} term - Search term; an empty term matches everything.
 * @returns {boolean} True when the option matches.
 */
export const matchesOption = (option, term) => {
  const t = (term ?? '').trim().toLowerCase();
  if (!t) return true;
  return String(option.label ?? '').toLowerCase().includes(t)
    || String(option.value ?? '').toLowerCase().includes(t);
};

// Recherche locale sur un résultat déjà chargé : options plates filtrées, groupes réduits
// à leurs options retenues (un groupe vidé disparaît, comme une branche élaguée par l'API).
const searchLocally = (data, term) => ({
  ...data,
  flat: data.flat.filter((o) => matchesOption(o, term)),
  groups: data.groups
    .map((g) => ({ ...g, options: g.options.filter((o) => matchesOption(o, term)) }))
    .filter((g) => g.options.length > 0),
});

function fetchSelectOptions([, fieldName, catalog, grouped, searchTerm, schema]) {
  if (grouped) {
    // Arbre complet, jamais tronqué : la recherche se fait localement
    return request(
      GET_SELECT_OPTIONS_TREE,
      { fieldName, maxDepth: GROUP_DEPTH, catalog, schema },
    ).then((data) => ({ flat: [], groups: treeToGroups(data.getSelectOptionsTree), exhaustive: true }));
  }

  // Une option de plus que l'affichage : sa présence dit que la liste est tronquée
  return request(
    GET_SELECT_OPTIONS,
    { fieldName, searchTerm, limit: LIMIT + 1, catalog, schema },
  ).then(({ getSelectOptions: all }) => ({
    flat: all.slice(0, LIMIT),
    groups: [],
    exhaustive: all.length <= LIMIT,
  }));
}

/**
 * Fetches the options displayed by SelectMenu (flat or two-level grouped).
 *
 * Backed by SWR: caches and deduplicates requests across component instances, and
 * keeps the previous options visible (no flash to empty) while a new key resolves.
 * The list without search term is always loaded first; a search term only reaches
 * the API when that list is truncated (flat mode, more than 50 values) — otherwise it
 * is applied locally, with the API's rule (code or label, case-insensitive).
 *
 * @param {Object}  params
 * @param {string}  params.fieldName    - API field name (the leaf level in
 *   grouped mode).
 * @param {string}  [params.catalog]    - API catalog.
 * @param {string}  [params.schema]     - API schema within the catalog.
 * @param {boolean} [params.grouped]    - Mode, when the caller knows it (from the
 *   field's `parentName`): spares the schema request that would otherwise decide it.
 * @param {string}  [params.groupField] - Group field; its presence forces the
 *   grouped-options mode. Without it (and without `grouped`) the mode is deduced from
 *   the field's `Metadata.parentName`. The API derives the group level from the column
 *   hierarchy, so the value itself is not sent.
 * @param {string}  [params.searchTerm] - Text filter (code or label).
 * @param {boolean} [params.enabled]    - Fetch activé (défaut true). À `false` quand le
 *   parent fournit une liste statique (`options`) : la clé SWR devient `null`, aucun
 *   appel n'est déclenché (règles des hooks : appel inconditionnel, mais fetch conditionnel).
 * @returns {{ options: Array, groups: Array, grouped: boolean, exhaustive: boolean,
 *   loading: boolean, error: (Error|null) }} Flat options, grouped options
 *   ([{ group, options }]), the resolved mode, whether the unfiltered list is complete,
 *   loading flag and error.
 */
export function useSelectOptions({
  fieldName, catalog, schema, grouped: groupedProp, groupField, searchTerm, enabled = true,
} = {}) {
  // Mode connu de l'appelant (`grouped`, `groupField`) : aucune requête de schéma. Sinon
  // le mode se lit dans la fiche du champ, et la requête d'options attend sa réponse
  // (`ready`) pour ne pas lancer un appel plat que l'arbre remplacerait aussitôt. Un
  // schéma en échec laisse `parentName` vide : on retombe sur le mode plat plutôt que de
  // bloquer le menu.
  const known = groupedProp !== undefined || !!groupField;
  const { field, ready } = useFieldMetadata({ fieldName, catalog, schema, enabled: enabled && !known });
  const grouped = groupedProp ?? (!!groupField || !!field?.parentName);

  // Liste de référence, sans terme : elle dit si la recherche peut rester locale.
  const baseKey = enabled && fieldName && (known || ready)
    ? ['selectOptions', fieldName, catalog, grouped, '', schema]
    : null;
  const base = useSWR(baseKey, fetchSelectOptions, { keepPreviousData: true });

  // Recherche serveur : seulement quand la liste de référence est tronquée. Tant qu'elle
  // charge, `base.data` peut être celle d'un AUTRE champ (keepPreviousData) : on attend.
  const term = (searchTerm ?? '').trim();
  const searchKey = baseKey && term && !base.isLoading && base.data && !base.data.exhaustive
    ? ['selectOptions', fieldName, catalog, grouped, term, schema]
    : null;
  const search = useSWR(searchKey, fetchSelectOptions, { keepPreviousData: true });

  // Résultat serveur du terme quand il existe ; sinon la liste de référence, filtrée ici
  // (exhaustive : résultat exact ; tronquée et réponse en attente : aperçu immédiat).
  const data = searchKey && search.data
    ? search.data
    : base.data && (term ? searchLocally(base.data, term) : base.data);

  return {
    options: data?.flat ?? [],
    groups: data?.groups ?? [],
    grouped,
    exhaustive: base.data?.exhaustive ?? false,
    loading: base.isLoading || (searchKey ? search.isLoading : false),
    error: base.error ?? search.error ?? null,
  };
}
