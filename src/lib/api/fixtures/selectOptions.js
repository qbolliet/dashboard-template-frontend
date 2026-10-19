// =================================================================
// FIXTURE — getSelectOptions / getSelectOptionsTree
// =================================================================
// Jeu du panel macro servi par les résolveurs mock (transport en mémoire ET serveur
// `mock:api`). Fidèle au contrat 0.3.0 : sur une colonne ordinaire `label = value` ;
// seule une colonne de CODES portant des colonnes de libellés (`Metadata.labelFields`)
// a un libellé distinct, lu dans la colonne de libellés choisie. Une option s'écrit
// donc `{ value, labels? }`, `labels` associant chaque colonne de libellés au texte
// de cette valeur. Les options du catalogue documentaire, elles, sont dérivées de ses
// lignes (cf. mockResolvers.js).

// Options sans libellé propre : `label = value`.
const plain = (...values) => values.map((value) => ({ value }));

/**
 * Distinct values of the macro catalog columns, keyed by column name.
 *
 * `value` is the value as it appears in the rows of the macro fact table
 * (fixtures/chartFactTable.js) — a filter set on `country` compares the option
 * value to the row value, so codes would never match anything.
 *
 * @type {Record<string, Array<{value: string, labels?: Record<string, string>}>>}
 */
export const MOCK_OPTIONS_BY_FIELD = {
  country: plain('France', 'Allemagne', 'Italie'),
  indicator: [
    { value: 'pib', labels: { indicator_label: 'PIB' } },
    { value: 'conso', labels: { indicator_label: 'Consommation' } },
    { value: 'invest', labels: { indicator_label: 'Investissement' } },
    { value: 'export', labels: { indicator_label: 'Exportations' } },
    { value: 'import', labels: { indicator_label: 'Importations' } },
    { value: 'emploi', labels: { indicator_label: 'Emploi' } },
    { value: 'infl_ind', labels: { indicator_label: 'Inflation' } },
    { value: 'taux_dir', labels: { indicator_label: 'Taux directeur' } },
  ],
  sector: plain('Agriculture', 'Industrie', 'Services', 'Finance', 'Énergie'),
  region: [
    { value: 'eu', labels: { region_label: 'Union européenne' } },
    { value: 'na', labels: { region_label: 'Amérique du Nord' } },
    { value: 'asia', labels: { region_label: 'Asie' } },
    { value: 'africa', labels: { region_label: 'Afrique' } },
  ],
  type_orga: plain('Public', 'Privé', 'Associatif'),
  frequence: plain('Annuel', 'Trimestriel', 'Mensuel'),
  source: plain('BCE', 'OCDE', 'INSEE', 'Eurostat'),
};

/**
 * Option trees of the hierarchical columns, keyed by the DEEPEST column of the chain
 * (the `fieldName` of getSelectOptionsTree) and spanning the whole chain.
 *
 * `country` descends from `region` (`Metadata.parentName`): a two-level tree, the
 * group-options format of a select menu. Only the combinations present in the data
 * appear, like the `SELECT DISTINCT` of the real API.
 *
 * @type {Record<string, Array<{value: string, labels?: Record<string, string>, children?: Array}>>}
 */
export const MOCK_OPTIONS_TREES = {
  country: [
    {
      value: 'eu',
      labels: { region_label: 'Union européenne' },
      children: plain('France', 'Allemagne', 'Italie'),
    },
  ],
};
