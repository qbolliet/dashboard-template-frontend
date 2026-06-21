import { useMemo } from 'react';
import { MOCK_FLAT_OPTIONS, MOCK_GROUPED_OPTIONS } from './mockData';

/**
 * Hook de récupération des options du SelectMenu.
 *
 * Pour l'instant alimenté par les mocks locaux, filtrés côté client par le
 * terme de recherche. À terme, à remplacer par des appels GraphQL :
 *   - getSelectOptions(fieldName, searchTerm, limit, catalog)
 *   - getGroupedSelectOptions(groupField, optionsField, limit)
 *
 * @param {Object}  params
 * @param {string}  params.fieldName    - Nom du champ API (mock : ignoré).
 * @param {string}  [params.catalog]    - Catalogue API (mock : ignoré).
 * @param {boolean} [params.grouped]    - Active le mode options groupées.
 * @param {string}  [params.groupField] - Champ de groupe (mock : ignoré).
 * @param {string}  [params.searchTerm] - Terme de filtrage textuel.
 * @returns {{ options: Array, groups: Array, loading: boolean }} Options plates,
 *   groupes { group, options } et état de chargement.
 */
export function useSelectOptions({ fieldName, catalog, grouped, groupField, searchTerm } = {}) {
  // TODO: remplacer par des appels GraphQL réels (cf. signatures ci-dessus).
  return useMemo(() => {
    // Normalisation du terme de recherche (insensible à la casse)
    const term = (searchTerm || '').trim().toLowerCase();

    // Mode groupé : filtrage option par option puis suppression des groupes vides
    if (grouped) {
      const groups = MOCK_GROUPED_OPTIONS
        .map((g) => ({
          ...g,
          options: term
            ? g.options.filter((o) => o.label.toLowerCase().includes(term))
            : g.options,
        }))
        .filter((g) => g.options.length > 0);
      return { options: [], groups, loading: false };
    }

    // Mode plat : filtrage direct de la liste d'options
    const options = term
      ? MOCK_FLAT_OPTIONS.filter((o) => o.label.toLowerCase().includes(term))
      : MOCK_FLAT_OPTIONS;
    return { options, groups: [], loading: false };
  }, [grouped, searchTerm]);
}
