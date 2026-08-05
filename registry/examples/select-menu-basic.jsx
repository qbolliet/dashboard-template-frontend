'use client';

/**
 * Sélection unique sur une liste statique
 *
 * Passer `options` court-circuite tout appel réseau : le menu filtre la liste
 * côté client. `value` est un tableau d'objets `{ value, label }`, même en
 * sélection unique — la forme ne change pas selon `allowMulti`.
 *
 * @item select-menu
 */

// Importation des modules
import { useState } from 'react';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';

const options = [
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Allemagne' },
  { value: 'it', label: 'Italie' },
  { value: 'es', label: 'Espagne' },
  { value: 'pt', label: 'Portugal' },
];

const SelectMenuBasic = () => {
  const [selection, setSelection] = useState([]);

  return (
    <SelectMenu
      options={options}
      value={selection}
      onChange={setSelection}
      placeholder="Choisir un pays…"
      validate
    />
  );
};

export default SelectMenuBasic;
