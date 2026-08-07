'use client';

/**
 * Aucune ligne
 *
 * `data` vide : les colonnes restent dérivées de `columnsMetadata`, seul le
 * corps du tableau change — un message de remplacement plutôt qu'un tableau
 * blanc muet.
 *
 * @item table
 */

// Importation des modules
import Table from '@/features/table/components/Table';
import factTable from '@/lib/api/fixtures/factTable.json';

const { columnsMetadata } = factTable;

const TableEmpty = () => (
  <Table data={[]} columnsMetadata={columnsMetadata} title="Catalogue des indicateurs" />
);

export default TableEmpty;
