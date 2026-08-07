// =================================================================
// PLAYGROUNDS — recensement des schémas
// =================================================================
// Table des chargeurs consommée par <ComponentPlayground>. Chaque entrée est un
// `import()` LITTÉRAL : c'est la seule forme que Turbopack analyse statiquement, et donc
// la seule qui produise un morceau de bundle par playground. Un `import(`./${name}.jsx`)`
// dynamique embarquerait tout le dossier dans chaque page de documentation.
//
// ÉCRIT À LA MAIN, PAS GÉNÉRÉ — contrairement à docs/__docs__.js et
// docs/__docs-pages__.js. Ces fichiers-ci sont du code, pas du contenu rédigé : ils sont
// peu nombreux, et un script d'indexation de plus imposerait sa contrainte de
// redémarrage de `npm run dev` (cf. l'en-tête de scripts/build-docs-index.js) sans rien
// apporter. Ajouter un playground = créer le fichier et ajouter sa ligne ici.
//
// La clé est le nom passé à <ComponentPlayground name="…" />. Un nom absent produit un
// message explicite listant ces clés, pas un écran blanc.

export const PLAYGROUND_MODULES = {
    'chart': () => import('./chart.jsx'),
    'constraint-field': () => import('./constraint-field.jsx'),
    'criterion-menu': () => import('./criterion-menu.jsx'),
    'globe': () => import('./globe.jsx'),
    'header': () => import('./header.jsx'),
    'multi-criterion-menu': () => import('./multi-criterion-menu.jsx'),
    'select-menu': () => import('./select-menu.jsx'),
    'stat-card': () => import('./stat-card.jsx'),
    'table': () => import('./table.jsx'),
    'tabs': () => import('./tabs.jsx'),
    'tooltip': () => import('./tooltip.jsx'),
    'type-aware-input': () => import('./type-aware-input.jsx'),
};

export default PLAYGROUND_MODULES;
