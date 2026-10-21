'use client';

/**
 * Sélection unique groupée, alimentée par l'API
 *
 * Le mode groupé est déduit des métadonnées : `country` déclare `parentName: 'region'`, donc
 * `getSelectOptionsTree` remonte la hiérarchie côté serveur et les options arrivent réparties
 * en groupes ([{ group, options }]). `groupField` force ce mode sur un champ sans
 * `parentName`, sans que sa valeur soit envoyée à l'API. En sélection simple, les en-têtes
 * de groupe sont de simples titres non interactifs (la case à cocher de groupe n'apparaît
 * qu'en `allowMulti`).
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
      fieldName="country"
      value={selection}
      onChange={setSelection}
      placeholder="Choisir une option…"
      validate
    />
  );
};

export default SelectMenuGrouped;
