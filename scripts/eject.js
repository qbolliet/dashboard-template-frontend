#!/usr/bin/env node

// =================================================================
// EJECT — détacher le site du consommateur de la documentation du template
// =================================================================
// Ce dépôt sert DEUX surfaces depuis un seul arbre App Router : la documentation à la
// racine (src/app/(docs)/) et l'application pilotée par le manifeste sous /demo
// (src/app/(site)/demo/). C'est le bon partage pour le dépôt template — `npm run dev` y
// sert la doc parce qu'on y travaille SUR la doc — et le mauvais pour quelqu'un qui part
// du template : son site se retrouve relégué sous /demo, derrière la documentation de
// quelqu'un d'autre.
//
// POURQUOI UN SCRIPT ET PAS UNE VARIABLE D'ENVIRONNEMENT : la forme des URL est décidée
// par l'ARBORESCENCE de src/app/, et le déploiement de référence est un export statique
// (`output: 'export'`), qui n'accepte ni middleware ni rewrites. Aucun drapeau ne peut
// donc remonter l'application à la racine ; il faut déplacer des dossiers. D'où une
// opération unique, exécutée une fois, qui laisse un diff git relisible.
//
// DEUX MODES :
//   (défaut)      retire toute la surface de documentation ;
//   --keep-docs   la conserve pour documenter SON dashboard, remontée sous /docs, avec
//                 docs/content/ réduit à un squelette.
//
// CONTRAINTE DE CONCEPTION : aucune dépendance, et CommonJS comme les autres scripts/*.js
// — le script doit tourner sur un dépôt fraîchement cloné, AVANT `npm install`.
//
// PRINCIPE DE DÉFAILLANCE : chaque remplacement de texte déclare la chaîne qu'il attend
// et ÉCHOUE BRUYAMMENT si elle a disparu. Un script d'eject qui « fait de son mieux » en
// silence pourrit sans qu'on le sache ; celui-ci casse la CI (cf. le job `eject` de
// .github/workflows/verify.yml) au premier renommage qui le concerne.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');

// =================================================================
// Analyse des options
// =================================================================

const argv = process.argv.slice(2);
const options = {
    keepDocs: argv.includes('--keep-docs'),
    yes: argv.includes('--yes') || argv.includes('-y'),
    force: argv.includes('--force'),
    dryRun: argv.includes('--dry-run'),
    help: argv.includes('--help') || argv.includes('-h'),
};

const HELP = `
Usage : node scripts/eject.js [options]

Détache ce dépôt de la documentation du template : l'application remonte à la racine
(/<langue>/… au lieu de /demo/<langue>/…) et la surface de documentation est retirée.
Opération unique et irréversible — le script se supprime lui-même à la fin.

Options
  --keep-docs   Conserve la machinerie de documentation (MDX, playgrounds, tables de
                props, registry) pour documenter votre propre dashboard. La doc est
                remontée sous /docs et docs/content/ réduit à un squelette.
  --dry-run     Déroule l'opération complète sans rien écrire : tous les motifs de
                remplacement sont vérifiés. C'est la forme utilisée en CI pour
                détecter qu'un renommage a désynchronisé ce script.
  -y, --yes     N'attend pas de confirmation.
  --force       N'exige pas un arbre git propre.
  -h, --help    Affiche cette aide.
`;

// =================================================================
// Journal et opérations de fichiers
// =================================================================

const performed = [];

/** Prints a step line. */
const log = (verb, detail) => {
    performed.push(`${verb} ${detail}`);
    console.log(`  ${verb.padEnd(11)} ${detail}`);
};

/** Absolute path of a project-relative path. */
const abs = (relative) => path.join(PROJECT_ROOT, relative);

// Renommages EN ATTENTE, alimentés uniquement en simulation (destination → source).
// Sans eux, `--dry-run` échouerait sur le premier fichier qu'une opération précédente
// aurait dû déplacer, et ne pourrait donc pas vérifier les motifs de `patch` — ce qui est
// précisément ce qu'on lui demande (cf. le job `eject` de la CI, qui simule à chaque PR).
const virtualMoves = new Map();

/**
 * Absolute path of a project-relative path, resolved through the pending renames.
 *
 * @param {string} relative - Project-relative path, expressed AFTER the moves.
 * @returns {string} The absolute path where the file actually sits right now.
 */
function locate(relative) {
    if (!options.dryRun) return abs(relative);

    for (const [to, from] of virtualMoves) {
        if (relative === to) return abs(from);
        if (relative.startsWith(`${to}/`)) return abs(from + relative.slice(to.length));
    }

    return abs(relative);
}

/**
 * Fails the whole run with a message.
 *
 * @param {string} message - What went wrong, and what to do about it.
 */
function fail(message) {
    console.error(`\neject : ${message}\n`);
    process.exit(1);
}

/**
 * Moves a file or directory, creating the destination's parent as needed.
 *
 * @param {string} from - Project-relative source path.
 * @param {string} to - Project-relative destination path.
 */
function move(from, to) {
    if (!fs.existsSync(locate(from))) fail(`${from} est introuvable — le dépôt a-t-il déjà été éjecté ?`);
    log('déplacé', `${from} → ${to}`);

    if (options.dryRun) {
        virtualMoves.set(to, from);
        return;
    }

    fs.mkdirSync(path.dirname(abs(to)), { recursive: true });
    fs.renameSync(abs(from), abs(to));
}

/**
 * Deletes a file or directory, recursively. Silent when already absent — les artefacts
 * générés (public/r/, docs/__docs__.js…) ne sont pas là sur un dépôt jamais lancé.
 *
 * @param {string} target - Project-relative path.
 */
function remove(target) {
    if (!fs.existsSync(locate(target))) return;
    log('supprimé', target);
    if (options.dryRun) return;

    fs.rmSync(abs(target), { recursive: true, force: true });
}

/**
 * Writes a file, creating its parent directory as needed.
 *
 * @param {string} target - Project-relative path.
 * @param {string} content - Full file content.
 */
function write(target, content) {
    log('écrit', target);
    if (options.dryRun) return;

    fs.mkdirSync(path.dirname(abs(target)), { recursive: true });
    fs.writeFileSync(abs(target), content, 'utf8');
}

/**
 * Applies ordered literal replacements to a file.
 *
 * Chaque remplacement est VÉRIFIÉ : si la chaîne recherchée est absente, le script
 * s'arrête. C'est la garantie qu'un renommage en amont ne laisse pas passer un eject
 * silencieusement incomplet.
 *
 * @param {string} target - Project-relative path.
 * @param {Array<[string, string]>} replacements - Pairs of exact search and replacement.
 */
function patch(target, replacements) {
    if (!fs.existsSync(locate(target))) fail(`${target} est introuvable.`);

    let content = fs.readFileSync(locate(target), 'utf8');

    for (const [search, replacement] of replacements) {
        if (!content.includes(search)) {
            fail(
                `motif introuvable dans ${target} :\n\n${search}\n\n` +
                'Le fichier a changé depuis la dernière mise à jour de scripts/eject.js. ' +
                'Corrigez le script plutôt que de contourner ce message.',
            );
        }
        content = content.split(search).join(replacement);
    }

    log('modifié', target);
    if (options.dryRun) return;

    fs.writeFileSync(abs(target), content, 'utf8');
}

/**
 * Strips the '/demo' URL prefix from every literal of a file.
 *
 * Seule réécriture non littérale du script, et elle est sans ambiguïté : dans les
 * fichiers concernés (les tests e2e), '/demo' n'apparaît QUE comme préfixe d'URL, en
 * code comme en commentaire, et jamais comme début d'un mot plus long. Les deux passes
 * traitent la forme préfixe ('/demo/fr') puis la forme nue ('/demo').
 *
 * @param {string} target - Project-relative path.
 */
function unprefixDemoPaths(target) {
    if (!fs.existsSync(locate(target))) fail(`${target} est introuvable.`);

    const content = fs.readFileSync(locate(target), 'utf8');
    const next = content.split('/demo/').join('/').split('/demo').join('/');

    if (next === content) fail(`aucune occurrence de '/demo' dans ${target}.`);

    log('modifié', target);
    if (options.dryRun) return;

    fs.writeFileSync(abs(target), next, 'utf8');
}

/**
 * Reads, transforms and rewrites a JSON file, preserving two-space indentation.
 *
 * @param {string} target - Project-relative path.
 * @param {(value: Object) => Object} transform - Pure transformation of the parsed value.
 */
function patchJson(target, transform) {
    if (!fs.existsSync(locate(target))) fail(`${target} est introuvable.`);

    const value = JSON.parse(fs.readFileSync(locate(target), 'utf8'));

    log('modifié', target);
    if (options.dryRun) return;

    fs.writeFileSync(abs(target), `${JSON.stringify(transform(value), null, 2)}\n`, 'utf8');
}

// =================================================================
// Garde-fous
// =================================================================

/**
 * Refuses to run on a dirty working tree, so that `git diff` remains the undo button.
 */
function assertCleanTree() {
    if (options.force || options.dryRun) return;

    let status;
    try {
        status = execFileSync('git', ['status', '--porcelain'], {
            cwd: PROJECT_ROOT,
            encoding: 'utf8',
        });
    } catch {
        // Pas de dépôt git (archive téléchargée) : on ne peut pas offrir de retour
        // arrière, mais on ne peut pas non plus l'exiger. On prévient et on continue.
        console.warn('\neject : pas de dépôt git détecté — aucun retour arrière possible.\n');
        return;
    }

    if (status.trim() !== '') {
        fail(
            'l\'arbre de travail n\'est pas propre. Committez ou remisez vos changements ' +
            'd\'abord : le diff git est le SEUL moyen d\'annuler un eject.\n' +
            'Passez --force pour ignorer cet avertissement.',
        );
    }
}

/**
 * Refuses to run twice.
 */
function assertNotEjected() {
    if (!fs.existsSync(abs('src/app/(site)/demo'))) {
        fail('src/app/(site)/demo/ est absent : ce dépôt a déjà été éjecté.');
    }
}

/**
 * Asks for confirmation, unless --yes.
 */
function confirm() {
    if (options.yes || options.dryRun) return;

    process.stdout.write('\nContinuer ? [o/N] ');

    let answer = '';
    try {
        const buffer = Buffer.alloc(8);
        const read = fs.readSync(0, buffer, 0, 8, null);
        answer = buffer.toString('utf8', 0, read).trim().toLowerCase();
    } catch {
        fail('impossible de lire la confirmation — relancez avec --yes.');
    }

    if (answer !== 'o' && answer !== 'oui' && answer !== 'y' && answer !== 'yes') {
        console.log('\nAnnulé, rien n\'a été modifié.\n');
        process.exit(0);
    }
}

// =================================================================
// Contenus écrits par le script
// =================================================================

// Manifeste minimal : le strict nécessaire pour que le site se rende, avec un nœud de
// chaque type utile. L'arbre de démonstration est conservé à côté, en .example.json.
const MINIMAL_SITE_CONFIG = {
    $schema: './schema/site.schema.json',
    site: {
        title: 'Mon tableau de bord',
        description: {
            fr: 'Description courte du site, reprise par les moteurs de recherche.',
            en: 'Short site description, picked up by search engines.',
        },
        locales: ['fr', 'en'],
        defaultLocale: 'fr',
        localeCountries: { fr: 'FR', en: 'GB' },
    },
    navigation: {
        type: 'sidebar',
        tree: [
            {
                path: '/',
                name: { fr: 'Accueil', en: 'Home' },
                type: 'home',
                description: {
                    fr: "Vue d'ensemble du tableau de bord.",
                    en: 'Dashboard overview.',
                },
            },
            {
                path: '/indicateur',
                name: { fr: 'Indicateur', en: 'Indicator' },
                type: 'indicator',
                description: {
                    fr: 'Exemple de page d\'indicateur : graphique, tableau et filtres.',
                    en: 'Example indicator page: chart, table and filters.',
                },
            },
            {
                path: '/a-propos',
                name: { fr: 'À propos', en: 'About' },
                type: 'about',
                description: {
                    fr: 'Présentation du projet et sources des données.',
                    en: 'Project overview and data sources.',
                },
            },
        ],
    },
};

// Accueil minimal : mêmes sections que celui de la démonstration, mais dont chaque lien
// désigne un nœud de MINIMAL_SITE_CONFIG (validate:config le vérifie). Sans cela, le site
// éjecté afficherait les cartes de la démo, pointant vers des pages qui n'existent plus.
const MINIMAL_HOME_CONTENT = {
    _comment: "Contenu rédigé de la page d'accueil. Tout champ de texte accepte une chaîne ou un objet { fr, en }. Chaque `link` est un chemin du manifeste (config/site.config.json), sans préfixe de langue ; `npm run validate:config` échoue s'il ne désigne aucun nœud.",
    hero: {
        title: { fr: 'Mon tableau de bord', en: 'My dashboard' },
        description: {
            fr: "Présentez ici votre jeu de données et ce que le tableau de bord permet d'en tirer.",
            en: 'Introduce your dataset here, and what the dashboard lets people learn from it.',
        },
        ctaButton: {
            text: { fr: "Voir l'indicateur", en: 'View the indicator' },
            link: '/indicateur',
        },
        backgroundImage: '/images/hero/hero-background.svg',
    },
    cards: [
        {
            id: 'indicateur',
            image: '/images/cards/data-visualization.svg',
            title: { fr: 'Indicateur', en: 'Indicator' },
            description: {
                fr: 'Un graphique, un tableau et des filtres sur votre premier indicateur.',
                en: 'A chart, a table and filters on your first indicator.',
            },
            link: '/indicateur',
        },
        {
            id: 'a-propos',
            image: '/images/cards/network-nodes.svg',
            title: { fr: 'À propos', en: 'About' },
            description: {
                fr: 'Le projet et les sources des données.',
                en: 'The project and the data sources.',
            },
            link: '/a-propos',
        },
    ],
    cardsSection: {
        cardsPerRow: 2,
        title: { fr: 'Par où commencer ?', en: 'Where to start?' },
        description: {
            fr: 'Les pages à personnaliser en premier',
            en: 'The pages to customise first',
        },
    },
};

// e2e/helpers/routes.ts après eject : la moitié « documentation » du fichier disparaît,
// il ne reste que la dérivation depuis le manifeste. Réécrit en entier plutôt que rogné
// par remplacements successifs — le résultat est plus court que le diff qui y mènerait.
const ROUTES_HELPER = `import siteConfig from '../../config/site.config.json';
import { resolveNavigationTree } from '../../src/utils/navigation/resolveNavigationTree';
import { flattenNavigation } from '../../src/utils/navigation/flattenNavigation';
import { DEMO_BASE_PATH } from '../../src/utils/navigation/basePaths';

// =================================================================
// ROUTES — dérivées du manifeste, jamais figées
// =================================================================
// Le test de fumée (e2e/smoke.spec.ts) doit couvrir toute route générée depuis
// config/site.config.json sans qu'une liste écrite à la main puisse diverger du site
// réel. On réutilise donc tels quels les mêmes resolveNavigationTree/flattenNavigation
// que src/app/(site)/[locale]/[[...slug]]/page.jsx : un nœud ajouté au manifeste
// apparaît ici sans toucher au test.
//
// appRoutes() fait le PRODUIT CARTÉSIEN des langues et des nœuds, comme le
// generateStaticParams de la route. Conséquence voulue : ajouter une langue à
// \`site.locales\` double la couverture du test de fumée sans qu'une ligne ne bouge.

/** Locale codes the site ships, read from the manifest like the application does. */
export const locales: string[] = siteConfig.site.locales;

/**
 * Every route generated from config/site.config.json, in every shipped language.
 *
 * @returns Absolute paths, locale-prefixed, each locale root included.
 */
export function appRoutes(): string[] {
  return locales.flatMap((locale) => {
    const tree = resolveNavigationTree(
      siteConfig.navigation.tree,
      \`\${DEMO_BASE_PATH}/\${locale}\`,
    );

    return flattenNavigation(tree).map((node) => node.path);
  });
}

/**
 * The language-negotiating entry point, which belongs to no locale.
 *
 * Kept apart from \`appRoutes()\`: it renders no content and immediately redirects, so a
 * smoke test must expect a different final URL than the one it requested.
 *
 * @returns The bare entry path — '/' once the application is mounted at the root.
 */
export function appEntryRoute(): string {
  return DEMO_BASE_PATH || '/';
}

/**
 * A representative page path of the manifest, locale prefix stripped.
 *
 * Le test du sélecteur de langue vérifie que le chemin courant est CONSERVÉ d'une langue
 * à l'autre : il lui faut donc une page qui ne soit pas la racine de la langue, mais peu
 * importe laquelle. La déduire du manifeste plutôt que l'écrire en dur évite qu'un
 * renommage de nœud casse un test qui ne parle pas de ce nœud.
 *
 * @returns The deepest non-root path, e.g. '/indicateur'.
 */
export function sampleAppPath(): string {
  const prefix = \`\${DEMO_BASE_PATH}/\${locales[0]}\`;
  const deepest = appRoutes()
    .filter((route) => route !== prefix && route.startsWith(\`\${prefix}/\`))
    .sort((a, b) => b.split('/').length - a.split('/').length)[0];

  if (!deepest) throw new Error('config/site.config.json ne contient aucune page hors racine');

  return deepest.slice(prefix.length);
}
`;

// docs/content/ en mode --keep-docs : deux pages, dont une qui montre les composants
// injectés par src/mdx-components.jsx. Les 30 pages du template sont retirées — elles
// documentent le TEMPLATE, pas le dashboard du consommateur ; elles restent lisibles sur
// le site de documentation en ligne et dans l'historique git du dépôt amont.
const DOCS_SKELETON = {
    'docs/content/index.mdx': `---
title: Documentation
description: Point d'entrée de la documentation de ce projet.
order: 1
---

# Documentation

Cette page est l'accueil de votre documentation. Le contenu vit dans
\`docs/content/**/*.mdx\` et l'index est reconstruit par \`npm run dev\`
(\`scripts/build-docs-index.js\`) — **ajouter une page demande un redémarrage du
serveur de développement**, l'index n'est pas en mode surveillance.

## Frontmatter

Chaque page déclare son titre, sa description et son rang dans la section :

\`\`\`yaml
---
title: Ma page
description: Une phrase qui résume la page.
order: 2
---
\`\`\`

Un dossier devient une section dès qu'il contient un \`index.mdx\` ; les autres
fichiers du dossier en deviennent les entrées, triées par \`order\`.

## Sommaire et ancres

Les titres \`##\` et \`###\` alimentent le sommaire de droite. Leurs identifiants
viennent de \`src/utils/format/slugify.js\`, partagé entre le script d'indexation et
\`src/mdx-components.jsx\` : c'est ce contrat unique qui garantit que les ancres du
sommaire existent réellement dans la page.
`,
    'docs/content/exemple.mdx': `---
title: Exemple
description: Les composants disponibles dans une page MDX, sans import.
order: 2
---

# Exemple

\`src/mdx-components.jsx\` injecte ces composants dans **toutes** les pages MDX : ils
s'utilisent sans \`import\`.

## Rendu d'un exemple

\`<ComponentPreview>\` rend un fichier de \`registry/examples/\` et en affiche la source.
Le nom passé est celui du fichier, sans extension :

\`\`\`mdx
<ComponentPreview name="stat-card-basic" />
\`\`\`

<ComponentPreview name="stat-card-basic" />

## Table des props

\`<PropsTable>\` lit \`docs/__props__.json\`, généré par \`scripts/build-props-doc.js\`
depuis les docstrings des composants :

\`\`\`mdx
<PropsTable component="StatCard" />
\`\`\`

## Playground

\`<ComponentPlayground>\` monte un module de \`docs/playgrounds/\` avec ses contrôles.
Ajouter un playground = un fichier dans \`docs/playgrounds/\` + une entrée dans
\`docs/playgrounds/index.js\`, dont la carte d'import doit rester littérale.
`,
};

/**
 * Builds the README left in the consumer's repository.
 *
 * @param {boolean} keepDocs - Whether the documentation machinery was kept.
 * @returns {string} The full README content.
 */
function starterReadme(keepDocs) {
    return `# Mon tableau de bord

Construit à partir de [dashboard-template-frontend](https://github.com/qbolliet/dashboard-template-frontend).
La documentation du template reste consultable en ligne :
<https://qbolliet.github.io/dashboard-template-frontend/>.

## Démarrer

\`\`\`bash
npm install
npm run dev
\`\`\`

Le site est servi sur <http://localhost:3000>${keepDocs ? ', la documentation sur <http://localhost:3000/docs>' : ''}.

## Les trois premiers gestes

1. **Décrire vos pages** — \`config/site.config.json\` est le manifeste unique : titre,
   langues, et arbre de navigation. Chaque nœud porte un \`path\` *relatif à son parent*,
   un \`name\`, un \`type\` (\`home\`, \`indicator\`, \`indicator_group\`, \`about\`) et
   d'éventuels \`children\`. Ajouter une page, c'est ajouter un nœud — aucun composant à
   écrire. L'arbre de démonstration du template est conservé en
   \`config/site.config.example.json\` comme exemple travaillé.
   Vérifiez le fichier avec \`npm run validate:config\`.

2. **Brancher vos données** — copiez \`.env.example\` en \`.env.local\` et renseignez
   \`NEXT_PUBLIC_API_URL\`. Sans cette variable, l'application tourne sur les fixtures
   en mémoire de \`src/lib/api/fixtures/\` : c'est un mode de fonctionnement à part
   entière, pas un repli d'erreur.

3. **Poser votre identité visuelle** — surchargez les primitives de couleur dans
   \`src/styles/globals/primitives/\` ; toute la cascade de tokens en découle.
   \`npm run check:palette\` vérifie la cohérence des deux thèmes.

## Commandes

- \`npm run dev\` — serveur de développement (fixtures en mémoire)
- \`npm run dev:mock\` — serveur de développement contre un vrai endpoint GraphQL local
- \`npm run dev:api\` — serveur de développement contre \`NEXT_PUBLIC_API_URL\`
- \`npm run build\` — build de production
- \`npm run build:static\` — export statique (GitHub Pages et consorts) ; renseignez
  \`NEXT_PUBLIC_BASE_PATH\` si le site est servi depuis un sous-chemin
- \`npm run lint\` / \`npm run test\` / \`npm run test:e2e\`
- \`npm run verify\` — la barrière complète, à brancher en CI

## Structure

\`\`\`
src/
├── styles/         # Fondations CSS : primitives, tokens sémantiques, typographie
├── components/     # Primitives d'interface atomiques et sans état
├── hooks/          # Hooks React génériques
├── utils/          # Fonctions pures génériques
├── i18n/           # Langues, dictionnaires et formats
├── lib/            # Infrastructure : client API, transports, documents GraphQL
├── features/       # Modules autonomes (navigation, filtre, graphique, tableau…)
├── page-templates/ # Gabarits de page alimentés par le manifeste
└── app/            # Pages et layouts du routeur App
\`\`\`

## Licence

MIT — voir [LICENSE](./LICENSE).
`;
}

// =================================================================
// Les opérations
// =================================================================

/**
 * Mounts the manifest-driven application at the root of the site.
 *
 * C'est LE geste que ne peut faire aucun drapeau d'environnement : la forme des URL
 * vient de l'arborescence de src/app/. Tout l'aval (fil d'Ariane, liens de navigation,
 * generateStaticParams, index de recherche) dérive de DEMO_BASE_PATH et suit sans
 * modification — c'est la raison d'être de ce levier unique.
 */
function mountAppAtRoot() {
    move('src/app/(site)/demo/[locale]', 'src/app/(site)/[locale]');
    move('src/app/(site)/demo/page.jsx', 'src/app/(site)/page.jsx');
    remove('src/app/(site)/demo');

    patch('src/utils/navigation/basePaths.js', [
        ["export const DEMO_BASE_PATH = '/demo';", "export const DEMO_BASE_PATH = '';"],
    ]);

    // Le 404 racine proposait les deux points d'entrée du dépôt template. Il n'en reste
    // qu'un — et `<Link href="">` serait invalide, DEMO_BASE_PATH valant désormais ''.
    // Le <nav> tombe avec le second lien : un lien isolé n'est pas un point de repère
    // de navigation.
    patch('src/app/not-found.jsx', [
        [
            `            <nav className="not-found__links" aria-label="Points d'entrée du site">
                <Link href="/">Documentation</Link>
                <Link href={DEMO_BASE_PATH}>Application de démonstration</Link>
            </nav>`,
            `            <p className="not-found__links">
                <Link href={DEMO_BASE_PATH || '/'}>Retour à l&apos;accueil</Link>
            </p>`,
        ],
    ]);
}

/**
 * Replaces the demonstration manifest with a minimal one, keeping the former as an example.
 */
function resetManifest() {
    move('config/site.config.json', 'config/site.config.example.json');
    write('config/site.config.json', `${JSON.stringify(MINIMAL_SITE_CONFIG, null, 2)}\n`);

    // L'accueil de la démo renvoie vers des nœuds de l'arbre de démo, absents du manifeste
    // minimal : on le remplace par un accueil dont chaque lien résout.
    write('config/content/home.json', `${JSON.stringify(MINIMAL_HOME_CONTENT, null, 2)}\n`);
}

/**
 * Deletes the whole documentation surface.
 */
function removeDocsSurface() {
    // Routes, interface et feuille de style de la documentation.
    remove('src/app/(docs)');
    remove('src/features/docs');
    remove('src/mdx-components.jsx');
    remove('src/styles/pages/_api-table.scss');

    // Contenu, registry et artefacts générés.
    remove('docs');
    remove('registry');
    remove('public/r');
    remove('public/tokens.json');

    // Générateurs devenus sans objet.
    remove('scripts/build-docs-index.js');
    remove('scripts/build-props-doc.js');
    remove('scripts/build-tokens-doc.js');
    remove('scripts/build-registry.js');
    remove('scripts/build-inventory.js');
    remove('scripts/lib');

    // Jeux de démonstration qui n'alimentaient que les playgrounds et les exemples.
    remove('src/features/chart/sources/demoData.js');
    remove('src/features/globe/sources/demoData.js');

    // Déploiement et prose propres au dépôt template.
    remove('.github/workflows/docs.yml');
    remove('CONTRIBUTING.md');
    remove('CHANGELOG.md');

    // Alias devenus morts, dans les deux fichiers qui les déclarent.
    patchJson('tsconfig.json', (config) => {
        delete config.compilerOptions.paths['@registry/*'];
        delete config.compilerOptions.paths['@docs/*'];
        return config;
    });
    patch('vitest.config.mjs', [
        [
            `      '@registry': path.resolve(__dirname, './registry'),
      '@docs': path.resolve(__dirname, './docs'),
`,
            '',
        ],
        [
            "// Alias alignés sur jsconfig.json (`@/*`, `@config/*`, `@registry/*`, `@docs/*`) :",
            '// Alias alignés sur tsconfig.json (`@/*`, `@config/*`) :',
        ],
    ]);

    // MDX : le greffon Next et son seul greffon remark disparaissent avec le contenu.
    patch('next.config.ts', [
        [`import createMDX from "@next/mdx";\n`, ''],
        [
            `  // Volontairement SANS 'mdx' : le contenu de la documentation vit dans docs/content/**
  // et est importé par la route attrape-tout de src/app/(docs)/, jamais posé comme
  // fichier de route. Élargir pageExtensions n'apporterait rien et ferait balayer
  // src/app/ à la recherche de .mdx qui ne s'y trouvent pas.
  pageExtensions: ["js", "jsx", "ts", "tsx"],`,
            `  pageExtensions: ["js", "jsx", "ts", "tsx"],`,
        ],
        [
            `// Le greffon est donné sous forme SÉRIALISABLE (nom + options) et non par référence de
// fonction : sous Turbopack les options de loader traversent la frontière JS↔Rust, une
// fonction n'y survivrait pas.
//
// remark-frontmatter est le SEUL greffon, et son unique rôle est de faire disparaître le
// bloc \`---\` du document rendu (sans lui, il s'affiche à l'écran comme du texte). Il n'est
// PAS ce qui lit la métadonnée : scripts/build-docs-index.js relit le texte brut des .mdx
// et construit l'index indépendamment de cette chaîne de compilation.
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-frontmatter", ["yaml"]]],
    rehypePlugins: [],
  },
});

export default withMDX(nextConfig);`,
            `export default nextConfig;`,
        ],
    ]);
}

/**
 * Mounts the documentation under /docs, and reduces its content to a skeleton.
 *
 * Deux points de branchement seulement, et ils se répondent : le générateur préfixe les
 * chemins qu'il émet, la route les dépréfixe pour retrouver ses segments. Les composants
 * du chrome (sidebar, sommaire, fil d'Ariane, pagination) rendent `page.path` tel quel et
 * n'ont donc rien à savoir de ce déplacement.
 */
function mountDocsUnderSlashDocs() {
    move('src/app/(docs)/[[...slug]]', 'src/app/(docs)/docs/[[...slug]]');

    patch('src/utils/navigation/basePaths.js', [
        [
            "/** @type {string} URL prefix under which the manifest-driven demo application is mounted. */",
            `/** @type {string} URL prefix under which the documentation site is mounted. */
export const DOCS_BASE_PATH = '/docs';

/** @type {string} URL prefix under which the manifest-driven demo application is mounted. */`,
        ],
    ]);

    // 1. Le générateur : les chemins émis dans DOCS_PATHS / DOCS_PAGES portent le préfixe.
    patch('scripts/build-docs-index.js', [
        [
            ` * \`index.mdx\` → '/', \`fondations/index.mdx\` → '/fondations',
 * \`fondations/tokens.mdx\` → '/fondations/tokens'.`,
            ` * \`index.mdx\` → '/docs', \`fondations/index.mdx\` → '/docs/fondations',
 * \`fondations/tokens.mdx\` → '/docs/fondations/tokens'.
 *
 * Le préfixe DOIT rester en phase avec le dossier de route src/app/(docs)/docs/,
 * qui le retire pour retrouver ses segments de slug.`,
        ],
        [
            `  return withoutIndex === '' ? '/' : \`/\${withoutIndex}\`;`,
            `  return withoutIndex === '' ? DOCS_BASE_PATH : \`\${DOCS_BASE_PATH}/\${withoutIndex}\`;`,
        ],
        [
            `const CONTENT_DIR = path.join(PROJECT_ROOT, 'docs/content');`,
            `const CONTENT_DIR = path.join(PROJECT_ROOT, 'docs/content');
// Recopié plutôt qu'importé : ce script est en CommonJS et tourne hors bundler, alors
// que src/utils/navigation/basePaths.js est un module ESM aliasé. Les deux valeurs
// doivent rester identiques.
const DOCS_BASE_PATH = '/docs';`,
        ],
    ]);

    // 2. La route : le segment /docs vient désormais du dossier, il ne fait plus partie
    //    du slug. Les deux conversions doivent donc l'ajouter et le retirer.
    patch('src/app/(docs)/docs/[[...slug]]/page.jsx', [
        [
            `const toPath = (slug) => \`/\${(slug ?? []).join('/')}\`;`,
            `const toPath = (slug) => {
    const segments = slug ?? [];

    return segments.length ? \`\${DOCS_BASE_PATH}/\${segments.join('/')}\` : DOCS_BASE_PATH;
};`,
        ],
        [
            `    DOCS_PATHS.map((path) => ({ slug: path === '/' ? [] : path.slice(1).split('/') }));`,
            `    DOCS_PATHS.map((path) => {
        // Le dossier de route porte déjà le segment /docs : on le retire du slug.
        const relative = path.slice(DOCS_BASE_PATH.length);

        return { slug: relative === '' ? [] : relative.slice(1).split('/') };
    });`,
        ],
        [
            `import { DOCS_PAGES, DOCS_PATHS } from '@docs/__docs__';`,
            `import { DOCS_BASE_PATH } from '@/utils/navigation/basePaths';
import { DOCS_PAGES, DOCS_PATHS } from '@docs/__docs__';`,
        ],
    ]);

    // 3. Le header de la doc : ses deux liens changent de cible en même temps — la
    //    marque pointe vers l'accueil de la DOC, le lien de surface vers l'application.
    patch('src/features/docs/components/DocsHeader/DocsHeader.jsx', [
        [
            `import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';`,
            `import { DEMO_BASE_PATH, DOCS_BASE_PATH } from '@/utils/navigation/basePaths';`,
        ],
        [
            `href="/" className="docs-header__brand"`,
            `href={DOCS_BASE_PATH} className="docs-header__brand"`,
        ],
        [
            `href={DEMO_BASE_PATH} className="docs-header__link">Démonstration</Link>`,
            `href={DEMO_BASE_PATH || '/'} className="docs-header__link">Application</Link>`,
        ],
    ]);

    // 4. Le contenu : les 30 pages du template partent, un squelette prend leur place.
    remove('docs/content');
    for (const [target, content] of Object.entries(DOCS_SKELETON)) write(target, content);
}

/**
 * Rewrites package.json: scripts, then the dependencies the removed surface carried.
 *
 * @param {boolean} keepDocs - Whether the documentation machinery was kept.
 */
function rewritePackageJson(keepDocs) {
    patchJson('package.json', (pkg) => {
        const generators = keepDocs
            ? 'npm run build:search && npm run build:registry && npm run build:props && npm run build:docs-index && npm run build:tokens'
            : 'npm run build:search';

        pkg.scripts.dev = `${generators} && next dev`;
        pkg.scripts.prebuild = generators;

        // `build:docs` devient `build:static` : le bloc `output: 'export'` de
        // next.config.ts garde tout son intérêt pour qui déploie sur un hôte statique,
        // seul son nom était lié à la documentation. NEXT_PUBLIC_BASE_PATH est laissé à
        // renseigner : il vaut le nom du dépôt sur GitHub Pages, rien ailleurs.
        delete pkg.scripts['build:docs'];
        pkg.scripts['build:static'] = 'cross-env STATIC_EXPORT=1 npm run build';

        const verify = [
            'npm run lint',
            'npm run test',
            'npm run check:palette',
            'npm run validate:config',
            'npm run check:gql',
            'npm run check:i18n -- --strict',
        ];
        if (keepDocs) {
            verify.push(
                'npm run build:registry',
                'npm run build:props -- --strict',
                'npm run build:docs-index',
                'npm run build:tokens -- --strict',
            );
        }
        pkg.scripts.verify = verify.join(' && ');

        delete pkg.scripts.eject;

        if (!keepDocs) {
            for (const script of [
                'build:inventory',
                'build:registry',
                'build:docs-index',
                'build:props',
                'build:tokens',
            ]) {
                delete pkg.scripts[script];
            }

            for (const dep of ['@mdx-js/loader', '@mdx-js/react', '@next/mdx', 'remark-frontmatter']) {
                delete pkg.dependencies[dep];
            }
            for (const dep of ['react-docgen', 'acorn', 'acorn-jsx']) {
                delete pkg.devDependencies[dep];
            }
        }

        return pkg;
    });

    if (!keepDocs) {
        patch('next.config.ts', [
            [
                `// Drapeau UNIQUE de l'export statique, posé par \`npm run build:docs\` et par lui seul.
// Absent en développement et en \`npm run build\` : les deux commandes existantes restent
// donc strictement inchangées, ce qui est la raison d'être de ce conditionnement.
const isStaticExport = process.env.DOCS_STATIC_EXPORT === "1";`,
                `// Drapeau UNIQUE de l'export statique, posé par \`npm run build:static\` et par lui seul.
// Absent en développement et en \`npm run build\` : les deux commandes existantes restent
// donc strictement inchangées, ce qui est la raison d'être de ce conditionnement.
const isStaticExport = process.env.STATIC_EXPORT === "1";`,
            ],
        ]);
    } else {
        patch('next.config.ts', [
            [`process.env.DOCS_STATIC_EXPORT === "1"`, `process.env.STATIC_EXPORT === "1"`],
            ['`npm run build:docs`', '`npm run build:static`'],
        ]);
    }
}

/**
 * Points the Playwright suite at the application instead of the documentation site.
 *
 * Les suites visuelle et de cas limites naviguaient vers des URL de documentation et
 * capturaient DANS l'iframe du playground : leurs cibles disparaissent dans les deux
 * modes (le squelette de --keep-docs ne les contient pas davantage). Elles sont donc
 * retirées plutôt que réécrites au jugé — un consommateur les rebâtira sur SES pages.
 */
function rewriteE2E() {
    remove('e2e/visual.spec.ts');
    remove('e2e/visual.spec.ts-snapshots');
    remove('e2e/edge-cases.spec.ts');
    remove('e2e/edge-cases.spec.ts-snapshots');
    remove('e2e/helpers/previewFrame.ts');

    write('e2e/helpers/routes.ts', ROUTES_HELPER);

    patch('e2e/smoke.spec.ts', [
        [
            `import { docsRoutes, demoRoutes } from './helpers/routes';`,
            `import { appRoutes } from './helpers/routes';`,
        ],
        [
            `// Itère sur les routes ISSUES du manifeste (config/site.config.json) et de l'index
// de documentation (docs/content/**.mdx) — cf. e2e/helpers/routes.ts — jamais sur
// une liste figée : une page ou un nœud de navigation ajouté étend cette suite au
// prochain run, sans toucher ce fichier.

const ROUTES = [
  ...docsRoutes().map((path) => ({ path, surface: 'docs' })),
  ...demoRoutes().map((path) => ({ path, surface: 'demo' })),
];`,
            `// Itère sur les routes ISSUES du manifeste (config/site.config.json) — cf.
// e2e/helpers/routes.ts —, jamais sur une liste figée : un nœud de navigation ajouté
// étend cette suite au prochain run, sans toucher ce fichier.

const ROUTES = appRoutes().map((path) => ({ path, surface: 'app' }));`,
        ],
    ]);

    // Le chemin d'essai du sélecteur de langue venait de l'arbre de démonstration, que
    // resetManifest() vient de remplacer : il est désormais déduit du manifeste.
    patch('e2e/i18n.spec.ts', [
        [`import { locales } from './helpers/routes';`, `import { locales, sampleAppPath } from './helpers/routes';`],
        [`    const path = '/comptabilite-nationale/france/pib';`, `    const path = sampleAppPath();`],
    ]);

    // Le test « le site de documentation reste monolingue » gardait une décision propre
    // au dépôt template (la doc occupe '/' et n'a pas de segment de langue). Après eject,
    // '/' négocie la langue : l'assertion serait fausse par construction.
    patch('e2e/i18n.spec.ts', [
        [
            `  test('le site de documentation reste monolingue', async ({ page }) => {
    // Décision de P5.4 : la documentation du template n'a pas de segment de langue.
    // Ce test est la barrière qui empêche de l'y réintroduire par inadvertance.
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    expect(new URL(page.url()).pathname).toBe('/');
  });
`,
            '',
        ],
    ]);

    // Le réchauffage parcourait les deux surfaces ; il ne lui en reste qu'une.
    patch('e2e/global-setup.ts', [
        [
            `import { docsRoutes, demoRoutes } from './helpers/routes';`,
            `import { appRoutes } from './helpers/routes';`,
        ],
        [`  const routes = [...docsRoutes(), ...demoRoutes()];`, `  const routes = appRoutes();`],
    ]);

    // Les chemins littéraux '/demo/…' des tests suivent le déplacement de l'application.
    for (const spec of ['e2e/i18n.spec.ts', 'e2e/helpers/locale.ts', 'e2e/global-setup.ts']) {
        unprefixDemoPaths(spec);
    }
}

/**
 * Replaces the template's README with a starter one and removes the script itself.
 *
 * @param {boolean} keepDocs - Whether the documentation machinery was kept.
 */
function finalise(keepDocs) {
    write('README.md', starterReadme(keepDocs));
    remove('scripts/eject.js');
}

// =================================================================
// Point d'entrée
// =================================================================

function main() {
    if (options.help) {
        console.log(HELP);
        return;
    }

    assertNotEjected();
    assertCleanTree();

    console.log(`\neject — mode ${options.keepDocs ? '--keep-docs' : 'complet'}${options.dryRun ? ' (simulation)' : ''}`);
    console.log(
        options.keepDocs
            ? "  L'application remonte à la racine, la documentation passe sous /docs et son\n  contenu est réduit à un squelette."
            : "  L'application remonte à la racine, toute la surface de documentation est retirée.",
    );
    console.log('  Cette opération est IRRÉVERSIBLE (hors `git checkout .`).');

    confirm();
    console.log('');

    mountAppAtRoot();
    resetManifest();

    if (options.keepDocs) mountDocsUnderSlashDocs();
    else removeDocsSurface();

    rewritePackageJson(options.keepDocs);
    rewriteE2E();
    finalise(options.keepDocs);

    console.log(`\n${performed.length} opérations${options.dryRun ? ' simulées' : ''}.`);

    if (options.dryRun) {
        console.log('\nSimulation : rien n\'a été écrit.\n');
        return;
    }

    console.log(`
Terminé. Vos trois gestes suivants :

  1. npm install                      (les dépendances retirées disparaissent du lock)
  2. éditer config/site.config.json   (l'arbre de démonstration est conservé en
                                       config/site.config.example.json)
  3. cp .env.example .env.local       et renseigner NEXT_PUBLIC_API_URL

Puis « npm run dev » : votre site est servi à la racine${options.keepDocs ? ', la documentation sous /docs' : ''}.
Relisez « git diff » avant de committer.
`);
}

if (require.main === module) {
    main();
}

module.exports = { MINIMAL_SITE_CONFIG, MINIMAL_HOME_CONTENT };
