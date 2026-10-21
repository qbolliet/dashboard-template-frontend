'use client';

/**
 * Critère de filtre unique
 *
 * `CriterionMenu` est contrôlé : `criterion` porte la variable, l'opération et
 * la valeur, et `onChange` renvoie l'objet complet. Le champ de saisie s'adapte
 * à la famille de type (`typeFamily`) et au drapeau `isCategorical` de la variable choisie ; les
 * opérations proposées sont celles que l'API accepte sur la colonne (`filterOperations`).
 *
 * @item filter
 */

// Importation des modules
import { useState } from 'react';
import CriterionMenu from '@/features/filter/components/CriterionMenu/CriterionMenu';
import { useVariableMetadata, metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import operations from '@config/filter/operations.json';
import { isNumericFamily, resolveOperationLabels } from '@/features/filter/utils/filterTypes';
import { DEFAULT_LOCALE } from '@/i18n/config';

// config/filter/operations.json donne le libellé de chaque opération, indexé par valeur de
// l'enum FilterOperation de l'API (EQ, BETWEEN…) ; il ne dit pas lesquelles proposer, c'est
// le rôle de `filterOperations` dans les métadonnées de la colonne. Un libellé peut être une
// chaîne ou un objet `{ fr, en }` : on l'aplatit avant de le passer au composant, qui
// n'attend que des chaînes. Le site de documentation étant monolingue, il résout dans la
// langue par défaut.
const operationLabels = resolveOperationLabels(operations, DEFAULT_LOCALE, DEFAULT_LOCALE);

// Le critère porte la famille de type de sa colonne (typeFamily + isCategorical) : le
// composant en déduit le widget de saisie. L'opération est une valeur de l'enum
// FilterOperation, en majuscules.
const INITIAL = {
  variable: 'gdp',
  operation: 'BETWEEN',
  value: { min: -2, max: 5 },
  typeFamily: 'NUMBER',
  isCategorical: false,
};

const CriterionMenuBasic = () => {
  const [criterion, setCriterion] = useState(INITIAL);

  // Variables filtrables, tirées du schéma du catalogue.
  const { fields } = useVariableMetadata();
  const variables = metadataToVariables(fields).filter(
    (variable) => !variable.isCategorical && isNumericFamily(variable.typeFamily),
  );

  return (
    <CriterionMenu
      criterion={criterion}
      onChange={setCriterion}
      variables={variables}
      operationLabels={operationLabels}
      showLabels
      validate
    />
  );
};

export default CriterionMenuBasic;
