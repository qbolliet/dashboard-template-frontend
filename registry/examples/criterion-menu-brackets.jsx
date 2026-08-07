'use client';

/**
 * Crochets de regroupement
 *
 * `parentheses` fait apparaître deux boutons crochet de part et d'autre de la
 * carte, qui portent `bracketLeft` / `bracketRight` dans le critère — la
 * granularité que `MultiCriterionMenu` combine ensuite pour équilibrer une
 * expression logique. Le panneau JSON ci-dessous rend visible ce que les clics
 * changent réellement dans l'état.
 *
 * Les boutons crochets encadrent la carte. Au repos ils sont quasi invisibles ;
 * cliqués, ils deviennent actifs.
 *
 * @item filter
 */

// Importation des modules
import { useState } from 'react';
import CriterionMenu from '@/features/filter/components/CriterionMenu/CriterionMenu';
import operations from '@config/filter/operations.json';

// Variable catégorielle : la resolution des opérations passe par le bucket
// "categorical", quel que soit son sql_type (cf. resolveOperations).
const VARIABLES = [
  { value: 'indicator', label: 'Indicateur', sql_type: 'character varying', is_categorical: true },
];

const INITIAL = {
  variable: 'indicator',
  operation: 'in',
  value: [],
  sql_type: 'character varying',
  is_categorical: true,
  bracketLeft: false,
  bracketRight: false,
};

const CriterionMenuBrackets = () => {
  const [criterion, setCriterion] = useState(INITIAL);

  return (
    <>
      <CriterionMenu
        criterion={criterion}
        onChange={setCriterion}
        variables={VARIABLES}
        operationsByType={operations}
        parentheses
        showLabels
      />
      <pre>{JSON.stringify({ bracketLeft: criterion.bracketLeft, bracketRight: criterion.bracketRight }, null, 2)}</pre>
    </>
  );
};

export default CriterionMenuBrackets;
