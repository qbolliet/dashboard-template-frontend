// =================================================================
// WITH BASE PATH — préfixe de déploiement pour les URL que Next ne préfixe pas
// =================================================================
// Déployé sur GitHub Pages, le site vit sous un SOUS-CHEMIN
// (https://<compte>.github.io/<dépôt>/), déclaré par `basePath` + `assetPrefix`
// dans next.config.ts et exposé au navigateur par NEXT_PUBLIC_BASE_PATH.
//
// `next/link` ajoute ce préfixe TOUT SEUL : ne PAS envelopper un `href`, il serait
// posé deux fois.
//
// `next/image` NE LE FAIT PAS, contrairement à ce qu'on suppose spontanément. Vérifié
// dans node_modules/next/dist/shared/lib/get-img-props.js (`generateImgAttrs`) : sous
// `images.unoptimized` — obligatoire à l'export statique, faute de serveur
// d'optimisation — le `src` est recopié tel quel dans le HTML. Le basePath n'apparaît
// que dans le chemin de l'endpoint /_next/image, qui n'est pas emprunté ici. Toute
// `<Image src="/…">` locale doit donc passer par cette fonction.
//
// Consommateurs actuels :
//   • les `src` de <Image>                   → LinkCard, Footer, Header, les 4
//                                              composants de NavigationSideBar, DocsHeader
//   • fetch('/search-index.json')            → src/features/header/hooks/useSearchIndex.js
//   • les textures du globe, chargées par le TextureLoader de three.js
//                                            → src/features/globe/engine/GlobeEngine.js
//   • une url() CSS posée en style inline    → src/features/home/components/Hero/Hero.js
//
// ATTENTION en rédigeant de la documentation ou un nouveau composant : tout
// `fetch('/…')`, tout `<img>`/<Image> local, et tout `url(/…)` en style inline doit
// passer par ici, sinon il renvoie 404 une fois déployé — et JAMAIS en local, où le
// préfixe est vide. C'est le mode de défaillance le plus discret du déploiement
// statique : rien ne casse tant qu'on ne sert pas depuis un sous-chemin.
//
// La valeur est inlinée par SWC à la compilation (préfixe NEXT_PUBLIC_), donc cette
// fonction est utilisable indifféremment côté serveur et côté navigateur.

// Normalisé une seule fois, au chargement du module : chaîne vide en dev et dans le
// build serveur, '/<dépôt>' à l'export statique. La barre oblique finale est retirée
// pour que la concaténation ne produise jamais de '//'.
const BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/+$/, '');

/**
 * Prefixes a site-absolute URL with the deployment base path.
 *
 * Only for URLs Next.js does not rewrite by itself — `next/link` and `next/image`
 * already apply the base path and must not be passed through this helper.
 *
 * @param {string} path - Site-absolute path, e.g. '/globe/earth-day.jpg'. Anything
 *   that is not internal (external URL, data: URI, protocol-relative URL, anchor)
 *   is returned untouched.
 * @returns {string} The path prefixed with the base path, unchanged when the base
 *   path is empty or the input is not an internal absolute path.
 */
export const withBasePath = (path) => {
    if (typeof path !== 'string' || path === '') return path;
    // '//cdn…' est une URL relative au protocole, pas un chemin interne : on la laisse.
    if (!path.startsWith('/') || path.startsWith('//')) return path;

    return BASE_PATH + path;
};
