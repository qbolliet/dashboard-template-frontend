'use client';

/**
 * Menus chaînés par un filtre latent
 *
 * `baseFilter` passe à un `MultiCriterionMenu` un filtre qu'il n'affiche pas : il est mis en
 * ET aux cartes dans `structuredFilters` et restreint les valeurs que chaque carte propose.
 * Le menu B reçoit ici toute la sortie du menu A : son menu des pays ne propose que les pays
 * que le filtre de A laisse passer.
 *
 * @item filter
 */

// Importation des modules
import { useState } from 'react';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import { useVariableMetadata, metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import operations from '@config/filter/operations.json';
import { resolveOperationLabels } from '@/features/filter/utils/filterTypes';
import { DEFAULT_LOCALE } from '@/i18n/config';

// Libellés des opérations dans la langue par défaut (cf. multi-criterion-menu-basic)
const operationLabels = resolveOperationLabels(operations, DEFAULT_LOCALE, DEFAULT_LOCALE);

// Menu A : « PIB > 101 ». Menu B : un choix de pays, borné par A.
const CRITERIA_A = [{ variable: 'gdp', operation: 'GT', value: '101', typeFamily: 'NUMBER' }];
const CRITERIA_B = [{ variable: 'country', operation: 'IN', value: [], typeFamily: 'TEXT', isCategorical: true }];

const MultiCriterionMenuBaseFilter = () => {
  const [filterA, setFilterA] = useState(null);
  const [filterB, setFilterB] = useState(null);

  const { fields } = useVariableMetadata();
  const variables = metadataToVariables(fields);

  return (
    <>
      <MultiCriterionMenu
        variables={variables}
        operationLabels={operationLabels}
        defaultCriteria={CRITERIA_A}
        onChange={setFilterA}
        showLabels
      />
      {/* La sortie entière de A suffit : son `structuredFilters` contient déjà le filtre
          latent de A, ce qui permet d'enchaîner autant de menus que nécessaire. Elle est
          jointe en ET aux cartes de B ; `{ ...filterA, connector: 'OR' }` la joindrait en OU. */}
      <MultiCriterionMenu
        variables={variables}
        operationLabels={operationLabels}
        defaultCriteria={CRITERIA_B}
        baseFilter={filterA}
        onChange={setFilterB}
        showLabels
      />
      {/* Filtre à envoyer à l'API : (filtre de A) ET (cartes de B) */}
      <pre>{JSON.stringify(filterB?.structuredFilters ?? null, null, 2)}</pre>
    </>
  );
};

export default MultiCriterionMenuBaseFilter;
