'use client';

/**
 * Sélection unique groupée, alimentée par l'API
 *
 * `groupField` active le mode groupé : les options arrivent déjà réparties en groupes
 * ([{ group, options }]) ; en sélection simple, les en-têtes de groupe sont de simples
 * titres non interactifs (la case à cocher de groupe n'apparaît qu'en `allowMulti`).
 *
 * @item select-menu
 */

// Importation des modules
import { useState } from 'react';
import SelectMenu from '@/components/filter/SelectMenu/SelectMenu';

const SelectMenuGrouped = () => {
  const [selection, setSelection] = useState([]);

  return (
    <SelectMenu
      fieldName="demo"
      groupField="group"
      value={selection}
      onChange={setSelection}
      placeholder="Choisir une option…"
      validate
    />
  );
};

export default SelectMenuGrouped;
