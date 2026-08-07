'use client';

/**
 * Données API — branchement direct de useFactTableWithMetadata sur <Table>
 *
 * Le hook expose `loading`/`error` en plus des lignes et du schéma de
 * colonnes : le rendu se décompose donc en trois branches (erreur,
 * chargement, succès) plutôt que de masquer l'attente derrière des données
 * de démonstration — même principe que chart-api.jsx pour <Chart>.
 *
 * @item table
 */

// Importation des modules
import Table from '@/features/table/components/Table';
import { useFactTableWithMetadata } from '@/features/table/sources/useFactTableWithMetadata';

const TableApi = () => {
  const { data, columnsMetadata, loading, error } = useFactTableWithMetadata({ catalog: 'catalogue' });

  if (error) {
    return <p>Erreur de chargement : {String(error)}</p>;
  }

  if (loading) {
    return <p>Chargement des données API…</p>;
  }

  return <Table data={data} columnsMetadata={columnsMetadata} title="Catalogue — useFactTableWithMetadata" />;
};

export default TableApi;
