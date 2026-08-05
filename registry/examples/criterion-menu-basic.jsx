'use client';

/**
 * Critère de filtre unique
 *
 * `CriterionMenu` est contrôlé : `criterion` porte la variable, l'opération et
 * la valeur, et `onChange` renvoie l'objet complet. Le champ de saisie s'adapte
 * au `sql_type` et à `is_categorical` de la variable choisie.
 *
 * @item filter
 */

// Importation des modules
import { useState } from 'react';
import CriterionMenu from '@/features/filter/components/CriterionMenu/CriterionMenu';
import { useVariableMetadata, metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import { isNumericSqlType } from '@/features/filter/utils/filterTypes';
import operations from '@config/filter/operations.json';

// Le critère porte ses métadonnées de colonne (sql_type + is_categorical) : le
// composant n'a besoin d'aucun type abstrait intermédiaire.
const INITIAL = {
  variable: 'gdp',
  operation: 'between',
  value: { min: -2, max: 5 },
  sql_type: 'double precision',
  is_categorical: false,
};

const CriterionMenuBasic = () => {
  const [criterion, setCriterion] = useState(INITIAL);

  // Variables filtrables, tirées du schéma du catalogue.
  const { fields } = useVariableMetadata();
  const variables = metadataToVariables(fields).filter(
    (variable) => !variable.is_categorical && isNumericSqlType(variable.sql_type),
  );

  return (
    <CriterionMenu
      criterion={criterion}
      onChange={setCriterion}
      variables={variables}
      operationsByType={operations}
      showLabels
      validate
    />
  );
};

export default CriterionMenuBasic;
