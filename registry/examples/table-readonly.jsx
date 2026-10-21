/**
 * Tableau en lecture seule
 *
 * `enableSort`, `enableFilter` et `enableColumnRemoval` à `false` : ni tri au clic sur un
 * en-tête, ni entonnoir de filtre par valeurs, ni croix de suppression de colonne au
 * survol. Le reset de la barre d'outils reste masqué (rien à réinitialiser) ; l'export CSV
 * et les copies de requête restent actifs. Le bouton Parquet, lui, est masqué : sur des
 * données statiques il faut fournir `onExportParquet` (route ou action serveur) pour
 * qu'il apparaisse.
 *
 * @item table
 */

// Importation des modules
import Table from '@/features/table/components/Table';
import factTable from '@/lib/api/fixtures/factTable.json';

const { data: rows, columnsMetadata } = factTable;

const TableReadonly = () => (
  <Table
    title="Indicateurs — lecture seule"
    data={rows}
    columnsMetadata={columnsMetadata}
    enableSort={false}
    enableFilter={false}
    enableColumnRemoval={false}
    queryHint={{ operation: 'getFactTableWithMetadata', limit: rows.length }}
  />
);

export default TableReadonly;
