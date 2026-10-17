// =================================================================
// GET DICTIONARY — chargement du dictionnaire d'une langue, avec repli
// =================================================================
// Appelé UNE FOIS par rendu de page, dans le layout serveur de /demo/[locale]. Le
// résultat descend ensuite en props ; aucun composant ne rappelle cette fonction.
//
// DEUX CONTRAINTES qui expliquent la forme du fichier :
//
//   1. `import()` à chemin LITTÉRAL, une branche par langue. Un
//      `import(`./dictionaries/${locale}`)` n'est pas analysable statiquement par
//      Turbopack, qui se rabattrait sur un bundle du dossier entier — toutes les langues
//      livrées à tous les visiteurs.
//   2. FUSION PROFONDE sur le français, et non substitution. Une traduction incomplète
//      est l'état NORMAL d'un dictionnaire en cours d'écriture ; sans fusion, chaque clé
//      manquante rendrait `undefined`, donc un aria-label vide. Avec fusion, elle rend
//      le français. C'est le même invariant que `mergeLabels` applique au niveau du
//      composant, appliqué ici au niveau du dictionnaire — les deux filets sont
//      indépendants et se recouvrent volontairement.
//
// Le dictionnaire résolu est un objet de chaînes pur, donc SÉRIALISABLE : il traverse la
// frontière Server → Client sans difficulté. C'est ce qui interdit d'y mettre des
// fonctions, et pourquoi les libellés dynamiques sont des gabarits (utils/i18n/interpolate.js).

import fr from './dictionaries/fr';
import { DEFAULT_LOCALE } from './config';

/**
 * Deep-merges a translation over the reference dictionary.
 *
 * Plain objects are walked; every other value (string, plural-form map treated as a
 * leaf) is taken from the translation when it is a non-blank string, and from the
 * reference otherwise.
 *
 * @param {Object} reference - The French dictionary, assumed complete.
 * @param {Object} translation - The target language, possibly partial.
 * @returns {Object} A new dictionary with the shape of `reference`.
 */
const deepMerge = (reference, translation) => {
    if (translation == null || typeof translation !== 'object') return reference;

    const merged = {};

    for (const key of Object.keys(reference)) {
        const referenceValue = reference[key];
        const translatedValue = translation[key];

        if (translatedValue === undefined || translatedValue === null) {
            merged[key] = referenceValue;
            continue;
        }

        // Chaîne vide ou blanche : même rejet que mergeLabels. Une clé présente mais
        // laissée vide dans un fichier de traduction est une clé non traduite, pas un
        // libellé volontairement muet.
        if (typeof translatedValue === 'string') {
            merged[key] = translatedValue.trim() === '' ? referenceValue : translatedValue;
            continue;
        }

        if (typeof referenceValue === 'object' && referenceValue !== null) {
            merged[key] = deepMerge(referenceValue, translatedValue);
            continue;
        }

        merged[key] = translatedValue;
    }

    return merged;
};

/**
 * Loads the interface dictionary of a locale.
 *
 * @param {string} locale - Site locale code, e.g. 'en'.
 * @returns {Promise<Object>} The dictionary, every key of the French reference present.
 *   An unknown locale yields the reference itself rather than throwing: the route guard
 *   is what rejects unknown locales, and a dictionary is never a reason to fail a render.
 */
export const getDictionary = async (locale) => {
    if (locale === DEFAULT_LOCALE) return fr;

    // AJOUTER UNE LANGUE : une branche ici, avec un chemin littéral.
    switch (locale) {
        case 'fr':
            return fr;
        case 'en': {
            const { default: en } = await import('./dictionaries/en');
            return deepMerge(fr, en);
        }
        default:
            return fr;
    }
};

// Exporté pour ses tests : la fusion est le mécanisme qui garantit qu'une traduction
// partielle ne produit jamais de libellé manquant, elle mérite d'être vérifiée seule.
export { deepMerge };
