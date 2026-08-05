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
        operationsByType={operations}
        onChange={setResult}
        showLabels
        validate
      />
      {sql && <pre>WHERE {sql}</pre>}
    </>
  );
};

export default MultiCriterionMenuBasic;
