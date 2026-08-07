/**
 * Sélection unique désactivée, avec une valeur déjà choisie
 *
 * `disabled` combiné à une sélection simple portant déjà une seule valeur déclenche le
 * cas particulier de SelectMenu — condition exacte dans SelectMenu.jsx :
 * `disabled && !allowMulti && value.length === 1`. Le rendu bascule alors sur un simple
 * libellé statique, sans dropdown ni bouton, plutôt que sur un champ inerte.
 *
 * @item select-menu
 */

// Importation des modules
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';

const SelectMenuDisabled = () => (
  <SelectMenu
    disabled
    value={[{ value: 'fr', label: 'France' }]}
    onChange={() => {}}
  />
);

export default SelectMenuDisabled;
