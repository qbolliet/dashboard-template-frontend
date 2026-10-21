'use client';

/**
 * Tableau filtré par un MultiCriterionMenu
 *
 * Le menu de critères et le tableau se branchent par une seule prop : la sortie
 * structurée de `onChange` alimente `defaultFilter`. Les variables filtrables
 * se dérivent des métadonnées de colonnes, clé primaire exclue. Les lignes étant
 * statiques, le tableau applique lui-même le filtre côté client ; branché sur l'API,
 * c'est `toFilterNode` qui le convertit en `structuredFilters` (cf. `table-api`).
 *
 * @item table
 * @item filter
 */

// Importation des modules
import { useState } from 'react';
import Table from '@/features/table/components/Table';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import factTable from '@/lib/api/fixtures/factTable.json';
import operations from '@config/filter/operations.json';
import { resolveOperationLabels } from '@/features/filter/utils/filterTypes';
import { metadataToVariables } from '@/features/filter/sources/useVariableMetadata';
import { DEFAULT_LOCALE } from '@/i18n/config';

// config/filter/operations.json donne le libellé de chaque opération, indexé par valeur de
// l'enum FilterOperation de l'API (EQ, BETWEEN…) ; il ne dit pas lesquelles proposer, c'est
// le rôle de `filterOperations` dans les métadonnées de la colonne. Un libellé peut être une
// chaîne ou un objet `{ fr, en }` : on l'aplatit avant de le passer au composant, qui
// n'attend que des chaînes. Le site de documentation étant monolingue, il résout dans la
// langue par défaut.
const operationLabels = resolveOperationLabels(operations, DEFAULT_LOCALE, DEFAULT_LOCALE);

const { data: rows, columnsMetadata } = factTable;

// Variables du menu : metadataToVariables garde le nom, le libellé, la famille de type et
// les opérations acceptées de chaque colonne. La clé primaire n'est pas un critère utile ici.
const variables = metadataToVariables(columnsMetadata.filter((column) => !column.isPrimaryKey));

const TableWithFilter = () => {
  const [filter, setFilter] = useState(null);

  return (
    <>
      <MultiCriterionMenu variables={variables} operationLabels={operationLabels} onChange={setFilter} />
      <Table
        title="Indicateurs — filtre en direct"
        data={rows}
        columnsMetadata={columnsMetadata}
        defaultFilter={filter}
      />
    </>
  );
};

export default TableWithFilter;
