'use client';

/**
 * Données API — mode distant, filtres de colonne et export complet
 *
 * Le hook expose `loading`/`error` en plus des lignes et du schéma de colonnes : le rendu se
 * décompose donc en trois branches (erreur, chargement, succès) plutôt que de masquer
 * l'attente derrière des données de démonstration — même principe que chart-api.jsx.
 *
 * Passer `onColumnFiltersChange` met `<Table>` en mode distant : le tableau n'évalue plus
 * rien lui-même, il affiche les lignes reçues. L'appelant garde les sélections de colonne
 * (`columnFilters`), les convertit en critères `IN` avec `columnCriteria` et envoie le
 * `FilterNode` obtenu à l'API en `structuredFilters` — un filtre agit donc sur tout le jeu,
 * pas sur la page chargée. Le schéma de colonnes vient d'une première requête sans filtre
 * (même clé SWR que la requête filtrée quand rien n'est coché : pas de requête de plus).
 *
 * Adossé à l'API (`NEXT_PUBLIC_API_URL`, ou `queryHint.apiBase`), les boutons CSV et Parquet
 * exportent le jeu filtré ENTIER par `/api/export`, pas seulement la page affichée, et la
 * barre d'outils propose de copier la commande d'export (cURL). `queryHint` doit porter le
 * `catalog` et le filtre pour que les requêtes copiées, les listes de valeurs des colonnes et
 * l'export portent sur le même jeu que celui affiché.
 *
 * @item table
 * @item filter
 */

// Importation des modules
import { useState } from 'react';
import Table from '@/features/table/components/Table';
import { useFactTableWithMetadata } from '@/features/table/sources/useFactTableWithMetadata';
import { andNodes, columnCriteria } from '@/features/filter/utils/filterEngine';

const CATALOG = 'catalogue';

const TableApi = () => {
  // Sélections de colonne, par nom de colonne ; `null` ou `[]` = aucun filtre sur la colonne
  const [columnFilters, setColumnFilters] = useState({});

  // Schéma des colonnes : requête non filtrée, qui sert aussi de repli pendant le chargement
  const { columnsMetadata: schema } = useFactTableWithMetadata({ catalog: CATALOG });

  // Les critères de colonne sont typés d'après la famille de type de chaque colonne
  const columns = schema.map(({ name, typeFamily }) => ({ key: name, typeFamily }));
  const structuredFilters = andNodes(null, columnCriteria(columnFilters, columns));

  const { data, columnsMetadata, loading, error } = useFactTableWithMetadata({
    catalog: CATALOG,
    structuredFilters,
  });

  if (error) {
    return <p>Erreur de chargement : {String(error)}</p>;
  }

  if (loading) {
    return <p>Chargement des données API…</p>;
  }

  return (
    <Table
      title="Catalogue — useFactTableWithMetadata"
      data={data}
      columnsMetadata={columnsMetadata}
      columnFilters={columnFilters}
      onColumnFiltersChange={setColumnFilters}
      queryHint={{ operation: 'getFactTableWithMetadata', catalog: CATALOG, structuredFilters }}
    />
  );
};

export default TableApi;
