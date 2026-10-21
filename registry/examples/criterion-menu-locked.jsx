'use client';

/**
 * Critère figé sur une colonne
 *
 * `lockedVariable` désactive le select Variable : la carte reste utilisable
 * (opération, valeur) mais ne porte plus que sur la colonne déjà choisie.
 * Utile pour un filtre de dashboard fixé sur une colonne (ex. un widget qui
 * ne doit jamais filtrer sur autre chose que « gdp »).
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

// Une seule variable proposée : le select est désactivé, mais reste cohérent avec les
// métadonnées attendues par CriterionMenu (typeFamily, isCategorical, filterOperations —
// écrites ici à la main, d'ordinaire issues de metadataToVariables).
const VARIABLES = [
  {
    value: 'gdp',
    label: 'PIB',
    typeFamily: 'NUMBER',
    isCategorical: false,
    filterOperations: ['EQ', 'GT', 'GTE', 'LT', 'LTE', 'BETWEEN'],
  },
];

const INITIAL = {
  variable: 'gdp',
  operation: 'BETWEEN',
  value: { min: -2, max: 5 },
  typeFamily: 'NUMBER',
  isCategorical: false,
};

const CriterionMenuLocked = () => {
  const [criterion, setCriterion] = useState(INITIAL);

  return (
    <CriterionMenu
      criterion={criterion}
      onChange={setCriterion}
      variables={VARIABLES}
      operationLabels={operationLabels}
      lockedVariable
      showLabels
      validate
    />
  );
};

export default CriterionMenuLocked;
