// =================================================================
// LAYOUT (site) — enveloppe de l'APPLICATION de démonstration
// =================================================================
// Le groupe (site) n'ajoute AUCUN segment d'URL : il ne sert qu'à séparer les routes de
// l'application de celles du site de documentation, qui a son propre chrome dans (docs).
//
// CE LAYOUT EST VOLONTAIREMENT VIDE depuis P5.4. Le <Header> et le <Footer> qu'il rendait
// sont descendus dans demo/[locale]/layout.jsx, parce qu'ils affichent du texte et
// doivent donc connaître la langue — ce qu'un layout situé AU-DESSUS du segment [locale]
// ne peut pas savoir : `params` n'y est pas fourni.
//
// Il subsiste parce que le groupe a deux enfants aux besoins différents :
//   demo/page.jsx           la porte d'entrée qui négocie la langue, SANS chrome —
//                           c'est une page de transit, y afficher un header traduit dans
//                           une langue pas encore choisie serait absurde ;
//   demo/[locale]/…         l'application, avec son chrome localisé.
//
// Le <main id="main-content"> n'est ici pour aucune des deux : chaque page pose le sien
// (la route attrape-tout et la page d'entrée), parce qu'il est la cible du lien
// d'évitement rendu par <Header>.

/**
 * Route group boundary of the demonstration application.
 *
 * @param {Object} props - Layout props.
 * @param {React.ReactNode} props.children - The rendered route.
 * @returns {React.ReactNode} The route, unwrapped.
 */
const SiteLayout = ({ children }) => children;

export default SiteLayout;
