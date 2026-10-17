// =================================================================
// BASE PATHS — point de montage de l'application pilotée par le manifeste
// =================================================================
// L'application décrite par config/site.config.json est montée sous DEMO_BASE_PATH.
// Dans le dépôt template elle vit sous '/demo' (src/app/(site)/demo/), parce que la
// racine du déploiement y est occupée par une surface de documentation ; un dépôt
// éjecté la monte à la racine, et la constante vaut alors ''. Le nom DEMO_* est
// conservé pour que les deux états partagent exactement le même code.
//
// Le manifeste ignore complètement ce montage : ses `path` restent relatifs à leur
// parent, et c'est `resolveNavigationTree(tree, DEMO_BASE_PATH)` qui monte tout
// l'arbre sous /demo — à deux endroits seulement (src/app/(site)/layout.jsx et la
// route attrape-tout de la démo), plus scripts/build-search-index.js. Tout le reste
// (liens de sidebar, isActivePath, fil d'Ariane, generateStaticParams) travaille sur
// des chemins absolus DÉJÀ préfixés et n'a rien à savoir.
//
// LA VALEUR EST LE POINT DE MONTAGE, et elle doit rester en phase avec le dossier de
// route qui la matérialise : '/demo' ↔ src/app/(site)/demo/. Les changer ensemble, ou pas
// du tout — basePaths.test.js vérifie mécaniquement que le dossier existe.
//
// C'est le geste de l'éjection du template (scripts/eject.js, supprimé une fois exécuté) :
// elle déplace src/app/(site)/demo/[locale]/ vers src/app/(site)/[locale]/ et met cette
// constante à '' (chaîne vide = montage à la racine). Tout l'aval suit sans
// modification, puisque tout en dérive. Les fonctions
// concernées acceptent déjà un préfixe vide (cf. les cas de test « prefix: '' » de
// src/utils/i18n/localePath.test.js).
//
// À NE PAS CONFONDRE avec le `basePath` de Next (src/utils/url/withBasePath.js) :
// celui-là est le sous-chemin de DÉPLOIEMENT (/<dépôt> sur GitHub Pages), ajouté
// automatiquement par next/link et next/image PAR-DESSUS les valeurs d'ici.

/** @type {string} URL prefix under which the manifest-driven demo application is mounted. */
export const DEMO_BASE_PATH = '/demo';
