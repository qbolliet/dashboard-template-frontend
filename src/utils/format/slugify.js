// =================================================================
// SLUGIFY — texte → identifiant d'ancre stable
// =================================================================
// Fonction PARTAGÉE par deux consommateurs qui doivent tomber d'accord au caractère
// près, sans quoi le sommaire d'une page pointe sur des ancres inexistantes :
//   • le rendu des titres, qui pose l'attribut `id` ;
//   • le script de build qui relève les titres dans le texte brut des pages pour
//     construire le sommaire.
// Dans le dépôt template ce sont src/mdx-components.jsx et scripts/build-docs-index.js ;
// ils disparaissent à l'éjection complète, la fonction reste.
//
// C'est tout le contrat qui remplace un greffon rehype-slug : rien ne traverse la
// frontière Turbopack, et la liste des titres est disponible AU BUILD — ce qu'un
// greffon rehype ne saurait pas transmettre à un composant frère.
//
// Aucune dépendance et aucun import aliasé : le script de build la charge par chemin
// relatif, hors bundler Next (même contrainte que src/utils/navigation/).

/**
 * Turns arbitrary text into a URL-safe anchor identifier.
 *
 * Diacritics are stripped rather than encoded, so « Accessibilité » and
 * « Accessibilite » collapse to the same slug — deliberate, since the id ends up in
 * a URL fragment that people copy, paste and type by hand.
 *
 * @param {string} text - Source text, typically a heading's content.
 * @returns {string} The slug: lowercase, ASCII letters, digits and single hyphens,
 *   with no leading or trailing hyphen.
 */
export const slugify = (text) =>
    String(text)
        // NFD sépare la lettre de son diacritique ; \p{M} retire ensuite toutes les
        // marques combinantes. Écrit en classe Unicode plutôt qu'en plage littérale :
        // une plage de caractères combinants est invisible dans un éditeur.
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .trim()
        // Toute suite de caractères non alphanumériques devient UN tiret.
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
