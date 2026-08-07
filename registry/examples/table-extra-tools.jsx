'use client';

/**
 * Tableau avec outil personnalisé
 *
 * `extraTools` injecte des opérations arbitraires en tête de la barre d'outils flottante,
 * dans le même format `ToolSpec` que la toolbar mutualisée (`id`, `icon`, `label`,
 * `caption`, `active`, `onClick`). Démonstration : une bascule de densité d'affichage,
 * pilotée par un état local, qui module aussi le `className` du tableau — le token CSS
 * `--data-table-td-padding-y` (celui que `Table.scss` définit pour le padding vertical
 * des cellules) est surchargé sous la classe `.data-table--dense` plutôt qu'inventé.
 *
 * @item table
 */

// Importation des modules
import { useState } from 'react';
import Table from '@/features/table/components/Table';
import { LayersIcon } from '@/components/icons';
import factTable from '@/lib/api/fixtures/factTable.json';

const { data: rows, columnsMetadata } = factTable;

const TableExtraTools = () => {
  const [dense, setDense] = useState(false);

  const extraTools = [
    {
      id: 'density',
      icon: <LayersIcon />,
      caption: 'DENSE',
      label: "Basculer la densité d'affichage",
      active: dense,
      onClick: () => setDense((current) => !current),
    },
  ];

  return (
    <>
      <Table
        title="Indicateurs — densité modulable"
        data={rows}
        columnsMetadata={columnsMetadata}
        extraTools={extraTools}
        className={dense ? 'data-table--dense' : undefined}
        queryHint={{ operation: 'getFactTableWithMetadata', limit: rows.length }}
      />
      {/* Surcharge de token, pas de nouvelle règle : même nom que Table.scss
          (--data-table-td-padding-y), juste une valeur plus resserrée. */}
      <style jsx>{`
        :global(.data-table--dense) {
          --data-table-td-padding-y: 0.25rem;
        }
      `}</style>
    </>
  );
};

export default TableExtraTools;
