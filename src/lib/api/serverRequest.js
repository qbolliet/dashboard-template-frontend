// Importation des modules
import { request } from './client';

// =================================================================
// SERVER REQUEST — appel d'API tolérant à la panne, pour le rendu serveur
// =================================================================
// Les pages générées (src/app/[[...slug]]/) sont prérendues au build. Une requête
// qui lève pendant le prérendu fait ÉCHOUER LE BUILD ENTIER : pour un template que
// des tiers embarquent, une API momentanément injoignable ne doit jamais avoir cet
// effet. `requestSafe` renvoie donc `null` au lieu de propager, et le composant
// appelant rend son état dégradé — l'îlot client refera la requête au montage.
//
// C'est le pendant serveur des hooks `sources/` (qui renvoient `{ data: [], error }`
// plutôt que de lever, même intention). À n'utiliser QUE côté serveur : côté client,
// les hooks SWR gèrent déjà cache, déduplication et revalidation.
//
// Limite assumée : pas de délai d'attente. Annuler réellement une requête HTTP en
// cours demanderait de passer un `signal` jusqu'à `graphqlTransport` ; en mode mock
// (défaut, `NEXT_PUBLIC_API_URL` absente) il n'y a de toute façon aucun réseau.

/**
 * Server-side `request()` that never throws.
 *
 * @param {string} document - GraphQL document to execute.
 * @param {Object} [variables] - Query variables.
 * @param {Object} [options] - Transport options (`catalog`, `schema`).
 * @returns {Promise<Object|null>} The `data` object, or `null` if the call failed.
 */
export async function requestSafe(document, variables = {}, options = {}) {
    try {
        return await request(document, variables, options);
    } catch (error) {
        // Journalisé, jamais propagé : visible dans la sortie de `next build` sans
        // l'interrompre.
        console.warn(`[requestSafe] appel API échoué, rendu dégradé — ${error.message}`);
        return null;
    }
}
