// =================================================================
// CONSTANTES DE FORMATAGE — partagées par tous les afficheurs de données
// =================================================================
// Vit dans la couche transverse src/utils/ pour la même raison que formatNumber :
// <StatCard> (src/components/ui/) et la feature table doivent afficher le même
// marqueur de valeur vide sans qu'aucune des deux ne dépende de l'autre.

/**
 * Placeholder rendered in place of a null, undefined or empty value.
 * Em dash (U+2014), shared by StatCard and the table cells.
 *
 * @type {string}
 */
export const EMPTY_PLACEHOLDER = '—';
