'use client';

/**
 * Colonnes décrites à la main
 *
 * `columns` reprend la main sur `columnsMetadata` : libellé, police à chasse
 * fixe, emphase, et surtout `format` (spécification ou fonction) et `render`
 * pour produire un nœud React — ici un `<Badge>` par statut.
 *
 * @item table
 * @item badge
 */

// Importation des modules
import Table from '@/features/table/components/Table';
import { Badge } from '@/components/ui';
import factTable from '@/lib/api/fixtures/factTable.json';

const { data: rows } = factTable;

// Correspondance statut → libellé et variante de badge.
const STATUS_LABEL = { actif: 'Actif', wip: 'En cours', obsolete: 'Obsolète' };
const STATUS_VARIANT = { actif: 'success', wip: 'warning', obsolete: 'neutral' };

const columns = [
  { key: 'code', label: 'Code', mono: true },
  { key: 'indicator', label: 'Indicateur', strong: true },
  { key: 'sector', label: 'Secteur' },
  // Fonction de formatage libre : prioritaire sur une spécification déclarative.
  { key: 'lastUpdate', label: 'Dernière MàJ', format: (value) => new Date(value).toLocaleDateString('fr-FR') },
  { key: 'observations', label: 'Observations', type: 'number', format: { compact: true } },
  { key: 'montant', label: 'Budget de collecte', format: { style: 'currency', currency: 'EUR', decimals: 0 } },
  // `render` prime sur `format` : rendu libre en JSX.
  {
    key: 'status',
    label: 'Statut',
    render: (value) => <Badge variant={STATUS_VARIANT[value] || 'neutral'}>{STATUS_LABEL[value] || value}</Badge>,
  },
];

const TableCustomColumns = () => (
  <Table title="Catalogue des indicateurs" data={rows} columns={columns} />
);

export default TableCustomColumns;
