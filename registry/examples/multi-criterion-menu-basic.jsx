'use client';

/**
 * Filtre composé et clause SQL
 *
 * `MultiCriterionMenu` combine plusieurs critères par connecteurs logiques et
 * parenthèses. Son `onChange` renvoie `{ criteria, tree, balanced, serial }` ;
 * `treeToSQL` transforme l'arbre en clause `WHERE`.
 *
 * @item filter
 */

// Importation des modules
import { useState } from 'react';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import { useVariableMetadata, metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import { treeToSQL } from '@/features/filter/utils/filterEngine';
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

// Chaque feuille de l'arbre porte un drapeau `complete` : un critère auquel il
// manque la variable, l'opération ou la valeur produit un « ? » dans le SQL.
const isComplete = (node) =>
  node.type === 'criterion' ? node.complete : node.children.every(isComplete);

const MultiCriterionMenuBasic = () => {
  const [result, setResult] = useState(null);

  const { fields } = useVariableMetadata();
  const variables = metadataToVariables(fields);

  // `balanced` dit si les parenthèses se referment : une clause déséquilibrée
  // n'est pas traduisible en SQL, un critère incomplet non plus.
  const sql = result?.balanced && isComplete(result.tree) ? treeToSQL(result.tree) : '';

  return (
    <>
      <MultiCriterionMenu
        variables={variables}
        operationLabels={operationLabels}
        onChange={setResult}
        showLabels
        validate
      />
      {sql && <pre>WHERE {sql}</pre>}
    </>
  );
};

export default MultiCriterionMenuBasic;
