// Importation des modules
import { isDateSqlType, isNumericSqlType } from '@/features/filter/utils/filterTypes';

// =================================================================
// DERIVE ENCODING — choisir x / y / hue à partir du schéma de colonnes
// =================================================================
// Un nœud du manifeste ne décrit AUCUN jeu de données : `navigationNode` est en
// `additionalProperties: false` et n'a ni `fields`, ni `catalog`, ni encodage.
// Le gabarit indicateur doit donc déduire quoi tracer des seules métadonnées de
// colonnes renvoyées par `getCatalogSchema` : premier champ date en x, première
// mesure continue en y, première dimension catégorielle en hue.
//
// Conséquence à connaître : tant que le manifeste ne porte pas de descripteur de
// jeu de données, tous les nœuds `indicator` affichent le même graphique. Les
// distinguer suppose d'ajouter un objet `data: { catalog, schema, fields, x, y, hue }`
// au schéma de nœud — changement de contrat, hors du périmètre de ce mécanisme.
//
// Le croisement avec `columns` est indispensable : `getCatalogSchema` décrit TOUT
// le catalogue (20 champs dans la fixture macro) alors que les lignes n'en portent
// que trois. Sans ce filtre, on choisirait un `hue` absent des données et <Table>
// afficherait dix-sept colonnes vides.

/**
 * Restricts a catalog schema to the columns actually present in a result set.
 *
 * @param {Array<Object>} columns - Column names returned alongside the rows.
 * @param {Array<Object>} columnsMetadata - Full catalog schema (`getCatalogSchema`).
 * @returns {Array<Object>} The metadata entries whose `name` appears in `columns`,
 *   in the order of the result set.
 */
export const restrictToColumns = (columns, columnsMetadata) => {
    if (!columns?.length) return columnsMetadata ?? [];

    const byName = new Map((columnsMetadata ?? []).map((m) => [m.name, m]));

    return columns.map((name) => byName.get(name)).filter(Boolean);
};

/**
 * Derives a chart encoding from column metadata.
 *
 * @param {Array<Object>} columnsMetadata - Metadata restricted to the present columns.
 * @returns {{x: (string|undefined), y: (string|undefined), hue: (string|undefined),
 *   labels: Object, format: Object}} Props ready to spread onto `<Chart>`. `y` is
 *   `undefined` when no continuous measure is available — the caller must then skip
 *   the chart, which requires it.
 */
export const deriveEncoding = (columnsMetadata = []) => {
    const xMeta = columnsMetadata.find((m) => isDateSqlType(m.sql_type));
    const yMeta = columnsMetadata.find((m) => isNumericSqlType(m.sql_type) && !m.is_categorical);
    const hueMeta = columnsMetadata.find((m) => m.is_categorical);

    return {
        x: xMeta?.name,
        y: yMeta?.name,
        hue: hueMeta?.name,
        // Libellés lisibles issus du catalogue plutôt que des noms de colonnes bruts.
        labels: {
            ...(xMeta && { x: xMeta.label }),
            ...(yMeta && { y: yMeta.label }),
            ...(hueMeta && { color: hueMeta.label }),
        },
        // Seul le format de l'axe temporel est déductible sans risque ; le format des
        // mesures dépend de leur unité, que les métadonnées ne portent pas.
        format: xMeta ? { x: '%Y-%m' } : {},
    };
};
