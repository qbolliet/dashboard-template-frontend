'use client';

// =================================================================
// PAGE /test-table — SECTIONS CLIENT (fonctions dans les props de <Table>)
// =================================================================
// Seul fichier client de la page (avec <Table> lui-même) : les trois
// démonstrations dont les props ne sont PAS sérialisables — colonnes portant
// des fonctions render/format (CatalogueTable), état interactif de bascule
// (CustomToolsTable) ou <MultiCriterionMenu> en direct (McmLiveTable) — ne
// peuvent pas être composées dans page.js (Server Component) : une fonction
// ne traverse pas la frontière Server → Client. page.js leur passe `data` /
// `columnsMetadata` / `queryHint`, entièrement sérialisables ; ces trois
// composants assemblent eux-mêmes les colonnes et l'état.

// Importation des modules
import { useState } from 'react';
import { Table } from '@/features/table';
import { Badge } from '@/components/ui';
import { LayersIcon } from '@/components/icons';
import MultiCriterionMenu from '@/features/filter/components/MultiCriterionMenu/MultiCriterionMenu';
import operations from '../../../config/filter/operations.json';

// Mapping des statuts (identique au prototype design-system/project/ds/tables.html).
const STATUS_LABEL = { actif: 'Actif', wip: 'En cours', obsolete: 'Obsolète' };
const STATUS_VARIANT = { actif: 'success', wip: 'warning', obsolete: 'neutral' };

// Colonnes manuelles du catalogue complet : mono / emphase / formats variés /
// render badge (cf. section 1 de page.js).
const CATALOGUE_COLUMNS = [
  { key: 'code', label: 'Code', mono: true },
  { key: 'indicator', label: 'Indicateur', strong: true },
  { key: 'sector', label: 'Secteur' },
  { key: 'source', label: 'Source' },
  {
    key: 'lastUpdate',
    label: 'Dernière MàJ',
    // Fonction de formatage libre (prioritaire sur un FormatSpec) : date FR lisible.
    format: (v) => new Date(v).toLocaleDateString('fr-FR'),
  },
  { key: 'observations', label: 'Observations', type: 'number', format: { compact: true } },
  {
    key: 'montant',
    label: 'Budget de collecte',
    format: { style: 'currency', currency: 'EUR', decimals: 0 },
  },
  {
    key: 'status',
    label: 'Statut',
    // render (prioritaire sur format) : rendu custom via <Badge>.
    render: (v) => <Badge variant={STATUS_VARIANT[v] || 'neutral'}>{STATUS_LABEL[v] || v}</Badge>,
  },
];

/**
 * Section 1 — "Catalogue complet" : colonnes manuelles couvrant tous les
 * formats (mono, emphase, compact, currency, fonction libre, render badge).
 *
 * @param {object} props
 * @param {Array<Object>} props.data - Lignes mock (getFactTableWithMetadata).
 * @param {Object} props.queryHint - Paramètres des snippets GraphQL copiés.
 * @returns {JSX.Element}
 */
export const CatalogueTable = ({ data, queryHint }) => (
  <Table
    title="Catalogue des indicateurs"
    data={data}
    columns={CATALOGUE_COLUMNS}
    queryHint={queryHint} />
);

/**
 * Section 5 — "Opérations custom" : un `extraTools` avec une bascule de
 * densité factice, pilotée par un état local (`dense`) qui module aussi le
 * `className` du tableau (cf. `.data-table--dense` dans page.scss).
 *
 * @param {object} props
 * @param {Array<Object>} props.data
 * @param {Array<Object>} props.columnsMetadata
 * @param {Object} props.queryHint
 * @returns {JSX.Element}
 */
export const CustomToolsTable = ({ data, columnsMetadata, queryHint }) => {
  const [dense, setDense] = useState(false);

  const extraTools = [
    {
      id: 'density',
      icon: <LayersIcon />,
      caption: 'DENSE',
      label: "Basculer la densité d'affichage",
      active: dense,
      onClick: () => setDense((d) => !d),
    },
  ];

  return (
    <Table
      title="Indicateurs — densité modulable"
      data={data}
      columnsMetadata={columnsMetadata}
      extraTools={extraTools}
      className={dense ? 'data-table--dense' : undefined}
      queryHint={queryHint} />
  );
};

// Variables du MultiCriterionMenu : dérivées de columnsMetadata (name → value),
// à l'exclusion de la clé primaire (non pertinente comme critère de filtre).
const mcmVariables = (columnsMetadata) => columnsMetadata
  .filter((m) => !m.is_primary_key)
  .map((m) => ({ value: m.name, label: m.label, sql_type: m.sql_type, is_categorical: m.is_categorical }));

/**
 * Section 6 — "MultiCriterionMenu en direct" : le `onChange` du menu alimente
 * en direct le `defaultFilter` du tableau (même sortie structurée que celle
 * figée en dur section 2 — `{ criteria, tree, balanced, serial }`).
 *
 * @param {object} props
 * @param {Array<Object>} props.data
 * @param {Array<Object>} props.columnsMetadata
 * @param {Object} props.queryHint
 * @returns {JSX.Element}
 */
export const McmLiveTable = ({ data, columnsMetadata, queryHint }) => {
  const [filter, setFilter] = useState(null);
  const variables = mcmVariables(columnsMetadata);

  return (
    <>
      <MultiCriterionMenu
        variables={variables}
        operationsByType={operations}
        onChange={setFilter} />
      <Table
        title="Indicateurs — filtre en direct"
        data={data}
        columnsMetadata={columnsMetadata}
        defaultFilter={filter}
        queryHint={queryHint}
        className="table-mcm-live" />
    </>
  );
};
