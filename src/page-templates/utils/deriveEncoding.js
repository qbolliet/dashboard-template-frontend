// Importation des modules
import { isDateFamily, isNumericFamily } from '@/features/filter/utils/filterTypes';

// =================================================================
// DERIVE ENCODING — choisir x / y / hue à partir du schéma de colonnes
// =================================================================
// Un nœud du manifeste ne décrit AUCUN jeu de données : `navigationNode` est en
// `additionalProperties: false` et n'a ni `fields`, ni `catalog`, ni encodage.
// Le gabarit indicateur doit donc déduire quoi tracer des seules métadonnées des
// colonnes du jeu (`fields` de getFactTableWithMetadata, alignées sur `columns`) :
// premier champ date en x, première mesure continue en y, première dimension
// catégorielle en hue. Le routage se fait sur la famille de type calculée par
// l'API (`typeFamily`), jamais sur le type SQL brut.
//
// Conséquence à connaître : tant que le manifeste ne porte pas de descripteur de
// jeu de données, tous les nœuds `indicator` affichent le même graphique. Les
// distinguer suppose d'ajouter un objet `data: { catalog, schema, fields, x, y, hue }`
// au schéma de nœud — changement de contrat, hors du périmètre de ce mécanisme.

/**
 * Derives a chart encoding from column metadata.
 *
 * @param {Array<Object>} columnsMetadata - Metadata of the columns present in the rows
 *   (`fields` of `getFactTableWithMetadata`).
 * @returns {{x: (string|undefined), y: (string|undefined), hue: (string|undefined),
 *   labels: Object, format: Object}} Props ready to spread onto `<Chart>`. `y` is
 *   `undefined` when no continuous measure is available — the caller must then skip
 *   the chart, which requires it.
 */
export const deriveEncoding = (columnsMetadata = []) => {
    const xMeta = columnsMetadata.find((m) => isDateFamily(m.typeFamily));
    const yMeta = columnsMetadata.find((m) => isNumericFamily(m.typeFamily) && !m.isCategorical);
    const hueMeta = columnsMetadata.find((m) => m.isCategorical);

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
        // Seul le format de l'axe temporel est déduit ici ; celui des mesures
        // (`displayFormat`, `unit`) n'est pas encore exploité.
        format: xMeta ? { x: '%Y-%m' } : {},
    };
};
