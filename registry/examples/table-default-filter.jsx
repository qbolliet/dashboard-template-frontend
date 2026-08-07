/**
 * Tableau avec filtre par défaut
 *
 * `defaultFilter` prend directement la forme que produit `filterEngine.buildTree` : un
 * groupe racine (profondeur 0) dont les feuilles portent `sqlType` / `isCategorical`
 * (jamais un type abstrait) — ici secteur ∈ {Macro, Finance} ET observations > 100.
 * C'est la même forme qu'un `<MultiCriterionMenu>` produit en direct
 * (cf. `table-with-filter`) ; rien n'empêche de la construire à la main.
 *
 * Rouvrir l'entonnoir d'une colonne touchée par ce filtre recoche les valeurs
 * précédemment retirées, et Reset efface tout l'état — y compris ce seed initial. Un
 * comportement réel et facile à régresser, qu'aucun test de ce fichier ne peut vérifier.
 *
 * @item table
 */

// Importation des modules
import Table from '@/features/table/components/Table';
import factTable from '@/lib/api/fixtures/factTable.json';

const { data: rows, columnsMetadata } = factTable;

// Forme EXACTE de sortie de filterEngine.buildTree (racine = groupe de profondeur 0) :
// secteur ∈ {Macro, Finance} ET observations > 100.
const DEFAULT_FILTER = {
  tree: {
    type: 'group',
    depth: 0,
    group: 0,
    connector: null,
    children: [
      {
        type: 'criterion',
        depth: 0,
        group: 0,
        connector: null,
        variable: 'sector',
        operation: 'in',
        value: ['Macro', 'Finance'],
        sqlType: 'text',
        isCategorical: true,
        complete: true,
      },
      {
        type: 'criterion',
        depth: 0,
        group: 0,
        connector: 'AND',
        variable: 'observations',
        operation: 'gt',
        value: 100,
        sqlType: 'integer',
        isCategorical: false,
        complete: true,
      },
    ],
  },
};

const TableDefaultFilter = () => (
  <Table
    title="Indicateurs — secteur filtré"
    data={rows}
    columnsMetadata={columnsMetadata}
    defaultFilter={DEFAULT_FILTER}
    queryHint={{ operation: 'getFactTableWithMetadata', limit: rows.length }}
  />
);

export default TableDefaultFilter;
