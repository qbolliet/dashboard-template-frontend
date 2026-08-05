// =================================================================
// CONSTANTES DE LA FEATURE DOCS
// =================================================================

/**
 * Whether the documentation chrome asks `next/link` to prefetch.
 *
 * Disabled, and it is not a performance trade-off: **segment prefetching is broken for
 * optional catch-all routes under `output: 'export'` in Next 16.2.9**, so asking for it
 * only produces failed requests.
 *
 * Constaté et instrumenté le 2026-08-05 en servant `out/` derrière son sous-chemin :
 *   • le navigateur demande  /introduction/__next.!KGRvY3Mp.$oc$slug.txt   (segments
 *     joints par des POINTS) ;
 *   • l'exporteur a écrit    /introduction/__next.!KGRvY3Mp/$oc$slug.txt   (segments
 *     imbriqués par des BARRES OBLIQUES).
 *
 * Les charges RSC existent donc bien — 412 fichiers dans `out/` — mais à un chemin que
 * le client ne demande jamais. Résultat sans ce drapeau : ~50 réponses 404 par page
 * affichée (la sidebar rend une trentaine de liens), pour rien.
 *
 * Vérifié indépendant de `trailingSlash` : la structure imbriquée est identique avec et
 * sans. La navigation, elle, fonctionne — le clic retombe sur un chargement complet du
 * document.
 *
 * À repasser à `undefined` (défaut de next/link) le jour où Next aligne les deux
 * conventions : c'est la seule ligne à changer.
 *
 * @type {boolean}
 */
export const DOCS_LINK_PREFETCH = false;
