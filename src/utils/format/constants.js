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

/**
 * Fallback Intl locale for components rendered outside any locale context.
 *
 * This is the LIBRARY-level default, deliberately a literal rather than a read of
 * `config/site.config.json`: `src/utils/` must stay free of configuration imports, and a
 * component installed on its own in another project has no manifest to read. The
 * application overrides it by passing `locale` down — see `src/i18n/formats.js`, which is
 * the single place that maps a site locale to its Intl tag.
 *
 * @type {string}
 */
export const DEFAULT_INTL_LOCALE = 'fr-FR';
