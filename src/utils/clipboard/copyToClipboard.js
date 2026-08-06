// =================================================================
// COPY TO CLIPBOARD — copie de texte, avec repli hors contexte sécurisé
// =================================================================
// Promue depuis src/features/table/utils/exporters.js, où elle servait aux trois boutons
// de copie de requête de la table. Second consommateur non lié : le bouton de copie des
// blocs de code de la documentation (src/features/docs/components/CopyButton/), qui copie
// du JSX généré et n'a rien à voir avec l'export d'un tableau de données.
//
// Une feature ne peut pas importer une autre feature : sans cette promotion, `docs`
// devrait dépendre de `table` pour trois lignes de presse-papiers.
//
// POURQUOI LE REPLI <textarea> : navigator.clipboard n'est exposé qu'en contexte
// sécurisé (https ou localhost). Un template installé chez un tiers et servi en http sur
// une IP de réseau interne — cas banal d'une démo derrière un VPN — n'y a pas accès, et
// le bouton de copie serait alors silencieusement mort.

/**
 * Copies text to the clipboard, preferring the async Clipboard API and falling back to
 * a hidden `<textarea>` + `execCommand('copy')` where it is unavailable.
 *
 * Never rejects: a failed copy is not worth breaking a render over, and the caller has
 * no better recovery than the user pressing the button again.
 *
 * @param {string} text - Text to copy.
 * @returns {Promise<void>} Resolves once the copy has been attempted.
 */
export const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }

    const ta = document.createElement('textarea');
    ta.value = text;
    // Hors flux et invisible : sans `position: fixed`, la sélection programmatique fait
    // défiler la page jusqu'au champ.
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch { /* repli silencieux : rien de plus à tenter */ }
    document.body.removeChild(ta);
    return Promise.resolve();
};
