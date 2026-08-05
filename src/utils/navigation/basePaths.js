// =================================================================
// BASE PATHS — préfixes d'URL des deux surfaces du dépôt
// =================================================================
// Depuis P4.2 le dépôt sert DEUX choses à des racines différentes :
//   • la DOCUMENTATION, à la racine du déploiement ('/'), rendue par src/app/(docs)/ ;
//   • l'APPLICATION de démonstration pilotée par config/site.config.json, montée sous
//     /demo et rendue par src/app/(site)/demo/[[...slug]]/.
//
// Le manifeste ignore complètement ce déplacement : ses `path` restent relatifs à leur
// parent, et c'est `resolveNavigationTree(tree, DEMO_BASE_PATH)` qui monte tout
// l'arbre sous /demo — à deux endroits seulement (src/app/(site)/layout.jsx et la
// route attrape-tout de la démo), plus scripts/build-search-index.js. Tout le reste
// (liens de sidebar, isActivePath, fil d'Ariane, generateStaticParams) travaille sur
// des chemins absolus DÉJÀ préfixés et n'a rien à savoir.
//
// La valeur doit rester en phase avec le nom du dossier de route : /demo ↔
// src/app/(site)/demo/. Les changer ensemble, ou pas du tout.
//
// À NE PAS CONFONDRE avec le `basePath` de Next (src/utils/url/withBasePath.js) :
// celui-là est le sous-chemin de DÉPLOIEMENT (/<dépôt> sur GitHub Pages), ajouté
// automatiquement par next/link et next/image PAR-DESSUS les valeurs d'ici.

/** @type {string} URL prefix under which the manifest-driven demo application is mounted. */
export const DEMO_BASE_PATH = '/demo';
