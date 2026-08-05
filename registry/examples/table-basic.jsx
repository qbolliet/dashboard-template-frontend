/**
 * Tableau dérivé des métadonnées
 *
 * La forme la plus économique de `<Table>` : on ne décrit aucune colonne, le
 * tableau les dérive de `columnsMetadata` (nom, libellé, type SQL) — ce que
 * renvoie déjà l'API. Tri, filtre et retrait de colonnes sont actifs par défaut.
 *
 * @item table
 */

// Importation des modules
import Table from '@/features/table/components/Table';
import factTable from '@/lib/api/fixtures/factTable.json';

const { data: rows, columnsMetadata } = factTable;

const TableBasic = () => (
  <Table
    title="Catalogue des indicateurs"
    data={rows}
    columnsMetadata={columnsMetadata}
    queryHint={{ operation: 'getFactTableWithMetadata', limit: rows.length }}
  />
);

export default TableBasic;
