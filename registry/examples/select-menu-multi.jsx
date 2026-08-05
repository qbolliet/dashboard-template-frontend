'use client';

/**
 * Multi-sélection alimentée par l'API
 *
 * Sans `options`, le menu interroge l'API via `fieldName` — les valeurs
 * distinctes de la colonne — en amortissant la saisie de recherche. `allowMulti`
 * ne change pas la forme de `value` : c'est un tableau dans les deux cas.
 *
 * @item select-menu
 */

// Importation des modules
import { useState } from 'react';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';

const SelectMenuMulti = () => {
  const [selection, setSelection] = useState([]);

  return (
    <SelectMenu
      fieldName="indicator"
      allowMulti
      value={selection}
      onChange={setSelection}
      placeholder="Choisir des indicateurs…"
      validate
    />
  );
};

export default SelectMenuMulti;
