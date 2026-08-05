'use client';

/**
 * Tableau filtré par un MultiCriterionMenu
 *
 * Le menu de critères et le tableau se branchent par une seule prop : la sortie
 * structurée de `onChange` alimente `defaultFilter`. Les variables filtrables
 * se dérivent des métadonnées de colonnes, clé primaire exclue.
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

const { data: rows, columnsMetadata } = factTable;

// Variables du menu : name → value, la clé primaire n'est pas un critère utile.
const variables = columnsMetadata
  .filter((column) => !column.is_primary_key)
  .map(({ name, label, sql_type: sqlType, is_categorical: isCategorical }) => ({
    value: name,
    label,
    sql_type: sqlType,
    is_categorical: isCategorical,
  }));

const TableWithFilter = () => {
  const [filter, setFilter] = useState(null);

  return (
    <>
      <MultiCriterionMenu variables={variables} operationsByType={operations} onChange={setFilter} />
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
