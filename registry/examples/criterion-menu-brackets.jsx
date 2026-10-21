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
import { resolveOperationLabels } from '@/features/filter/utils/filterTypes';
import { DEFAULT_LOCALE } from '@/i18n/config';

// config/filter/operations.json donne le libellé de chaque opération, indexé par valeur de
// l'enum FilterOperation de l'API (EQ, BETWEEN…) ; il ne dit pas lesquelles proposer, c'est
// le rôle de `filterOperations` dans les métadonnées de la colonne. Un libellé peut être une
// chaîne ou un objet `{ fr, en }` : on l'aplatit avant de le passer au composant, qui
// n'attend que des chaînes. Le site de documentation étant monolingue, il résout dans la
// langue par défaut.
const operationLabels = resolveOperationLabels(operations, DEFAULT_LOCALE, DEFAULT_LOCALE);

// Variable catégorielle : le widget (menu de valeurs) découle de `isCategorical`, quelle que
// soit sa famille de type ; les opérations offertes sont l'intersection de
// `filterOperations` (côté API) et de ce que ce widget sait saisir (cf. resolveOperations).
const VARIABLES = [
  {
    value: 'indicator',
    label: 'Indicateur',
    typeFamily: 'TEXT',
    isCategorical: true,
    filterOperations: ['EQ', 'IN', 'NOT_IN'],
  },
];

const INITIAL = {
  variable: 'indicator',
  operation: 'IN',
  value: [],
  typeFamily: 'TEXT',
  isCategorical: true,
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
        operationLabels={operationLabels}
        parentheses
        showLabels
      />
      <pre>{JSON.stringify({ bracketLeft: criterion.bracketLeft, bracketRight: criterion.bracketRight }, null, 2)}</pre>
    </>
  );
};

export default CriterionMenuBrackets;
