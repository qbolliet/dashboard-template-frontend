// =================================================================
// MERGE LABELS — fusion d'un dictionnaire partiel sur les défauts d'un composant
// =================================================================
// Chaque composant traduisible du dépôt déclare une constante de MODULE
// `DEFAULT_LABELS` (en français) et accepte une prop `labels`. Cette fonction est le
// seul point où les deux se rencontrent.
//
// C'est une fusion FILTRÉE, pas un `{ ...defaults, ...overrides }` : c'est ce filtrage
// qui porte la garantie d'accessibilité du template. Un appelant qui fournit un
// dictionnaire incomplet — le cas normal pendant une traduction en cours — ne doit
// JAMAIS pouvoir produire un `aria-label` vide. Or l'étalement natif de JavaScript
// écrase avec `undefined`, avec `null` et avec la chaîne vide, qui rendent tous les
// trois un nom accessible inexistant.
//
// Quatre rejets, dans cet ordre :
//   1. `undefined` — clé déclarée mais non traduite ;
//   2. `null`      — clé volontairement vidée (le geste est refusé : un libellé
//                    d'accessibilité facultatif n'existe pas, on met un texte ou on
//                    ne déclare pas la clé) ;
//   3. chaîne vide ou blanche — le cas le plus courant dans un fichier de traduction
//                    à moitié rempli ;
//   4. clé absente de `defaults` — faute de frappe ou clé d'une version antérieure du
//                    composant. L'accepter installerait une clé morte que rien ne lit
//                    et masquerait le vrai libellé, resté à son défaut.
//
// Les valeurs non textuelles (nombre, objet imbriqué de sous-libellés) passent telles
// quelles : seule la vacuité TEXTUELLE est une erreur.
//
// Conséquence à connaître : ce filtrage est volontairement SILENCIEUX à l'exécution.
// La détection des clés manquantes est le travail de `npm run check:i18n`, qui compare
// les dictionnaires entre eux au build — pas celui du rendu, qui doit se contenter de
// dégrader proprement vers le français.

/**
 * Merges a partial label dictionary over a component's defaults.
 *
 * Overrides that would blank out a label are ignored, so an incomplete dictionary can
 * never produce an empty accessible name. Keys absent from `defaults` are ignored too.
 *
 * @param {Object<string, *>} defaults - The component's `DEFAULT_LABELS` module constant.
 *   Acts as the reference key set; must be complete.
 * @param {Object<string, *>} [overrides] - Caller-supplied labels, possibly partial.
 *   `undefined`, `null` and blank strings are discarded per key.
 * @returns {Object<string, *>} A new object holding every key of `defaults`, with the
 *   accepted overrides applied. `defaults` and `overrides` are left untouched.
 */
export const mergeLabels = (defaults, overrides) => {
    // Chemin rapide du cas le plus fréquent : aucun appelant ne traduit. On renvoie
    // l'objet de défauts LUI-MÊME (constante de module, jamais mutée) plutôt qu'une
    // copie — évite une allocation par rendu sur chaque composant du dépôt.
    if (overrides == null || typeof overrides !== 'object') return defaults;

    const merged = { ...defaults };

    for (const key of Object.keys(overrides)) {
        // Clé inconnue du composant : ignorée (cf. rejet 4 de l'en-tête).
        if (!Object.hasOwn(defaults, key)) continue;

        const value = overrides[key];

        if (value === undefined || value === null) continue;
        // `trim()` et non `=== ''` : un libellé réduit à une espace insécable est tout
        // aussi muet pour un lecteur d'écran, et c'est une coquille facile à laisser
        // passer dans un fichier de traduction.
        if (typeof value === 'string' && value.trim() === '') continue;

        merged[key] = value;
    }

    return merged;
};
