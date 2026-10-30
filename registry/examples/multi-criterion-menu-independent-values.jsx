'use client';

/**
 * Valeurs indépendantes des autres critères
 *
 * Par défaut, chaque carte d'un `MultiCriterionMenu` ne propose que les valeurs encore
 * atteignables compte tenu des autres critères : options de menu, piste de slider.
 * `dependentValues={false}` rend à chaque carte les valeurs de toute la colonne.
 *
 * @item filter
 */

// Importation des modules
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import { useVariableMetadata, metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import operations from '@config/filter/operations.json';
import { resolveOperationLabels } from '@/features/filter/utils/filterTypes';
import { DEFAULT_LOCALE } from '@/i18n/config';

// Libellés des opérations dans la langue par défaut (cf. multi-criterion-menu-basic)
const operationLabels = resolveOperationLabels(operations, DEFAULT_LOCALE, DEFAULT_LOCALE);

// « PIB > 105 ET pays dans (…) » : avec les valeurs dépendantes, le menu des pays ne
// proposerait que les pays dont une observation dépasse 105. Indépendantes, il les propose
// tous, comme un menu isolé.
const DEFAULT_CRITERIA = [
  { variable: 'gdp', operation: 'GT', value: '105', typeFamily: 'NUMBER' },
  {
    variable: 'country', operation: 'IN', value: [], typeFamily: 'TEXT',
    isCategorical: true, connectorBefore: 'AND',
  },
];

const MultiCriterionMenuIndependentValues = () => {
  const { fields } = useVariableMetadata();
  const variables = metadataToVariables(fields);

  return (
    <MultiCriterionMenu
      variables={variables}
      operationLabels={operationLabels}
      defaultCriteria={DEFAULT_CRITERIA}
      dependentValues={false}
      showSlider
      showLabels
    />
  );
};

export default MultiCriterionMenuIndependentValues;
