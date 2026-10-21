/**
 * Codes et libellés dans une seule colonne
 *
 * Une colonne de codes qui déclare des `labelFields` dans ses métadonnées (ici `nc8`, dont le
 * libellé est `nc8_label`) s'affiche « code — libellé » avec `codeLabels`. La colonne de
 * libellé est alors repliée dans celle du code : sans la prop, les deux colonnes restent
 * séparées. Le tri, les filtres et les exports gardent le code brut ; si les lignes ne
 * portent pas la colonne de libellé, la colonne reste affichée comme avant.
 *
 * Ce tableau est alimenté en dur pour rester lisible : branché sur l'API, `columnsMetadata`
 * vient de `fields` (cf. `table-api`) et les colonnes de libellé sont demandées avec leur code.
 *
 * @item table
 */

// Importation des modules
import Table from '@/features/table/components/Table';

const columnsMetadata = [
  { name: 'nc8', label: 'NC8', typeFamily: 'TEXT', isCategorical: true, labelFields: ['nc8_label'] },
  { name: 'nc8_label', label: 'Libellé NC8', typeFamily: 'TEXT', isCategorical: false, labelFor: 'nc8', labelFields: [] },
  { name: 'montant', label: 'Montant', typeFamily: 'NUMBER', isCategorical: false, unit: '€', displayFormat: ',.0f', labelFields: [] },
  { name: 'part', label: 'Part', typeFamily: 'NUMBER', isCategorical: false, displayFormat: '.1%', labelFields: [] },
];

const rows = [
  { nc8: '01012100', nc8_label: 'Chevaux reproducteurs', montant: 1234500, part: 0.256 },
  { nc8: '01012910', nc8_label: 'Chevaux de boucherie', montant: 874200, part: 0.181 },
  { nc8: '02011000', nc8_label: 'Carcasses de bovins', montant: 2410800, part: 0.5 },
  { nc8: '04012011', nc8_label: 'Lait demi-écrémé', montant: 301500, part: 0.063 },
];

const TableCodeLabels = () => (
  <Table
    title="Échanges par produit — codeLabels"
    data={rows}
    columnsMetadata={columnsMetadata}
    codeLabels
    queryHint={{ operation: 'getFactTableWithMetadata', limit: rows.length }}
  />
);

export default TableCodeLabels;
