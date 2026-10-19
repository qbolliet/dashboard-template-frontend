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
// DEUX MODES : décrits une seule fois, dans HELP ci-dessous (`--help`), et détaillés par
// dossier dans docs/content/guides/partir-du-template.mdx.
//
// CONTRAINTE DE CONCEPTION : aucune dépendance, et CommonJS comme les autres scripts/*.js
// — le script doit tourner sur un dépôt fraîchement cloné, AVANT `npm install`.
//
// PRINCIPE DE DÉFAILLANCE : chaque remplacement de texte déclare la chaîne qu'il attend
// et ÉCHOUE BRUYAMMENT si elle a disparu. Un script d'eject qui « fait de son mieux » en
// silence pourrit sans qu'on le sache ; celui-ci casse la CI (cf. le job `eject` de
// .github/workflows/verify.yml) au premier renommage qui le concerne.
//
// ÉCHEC SANS DÉGÂT : toute la suite d'opérations est d'abord déroulée À BLANC, motifs
// compris, avant la première écriture. Un motif périmé arrête donc le script avec l'arbre
// intact, jamais au milieu d'un dépôt à moitié éjecté.
//
// FINS DE LIGNE : un clone Windows (`core.autocrlf=true`) écrit des CRLF, et les motifs
// contiennent des `\n`. Le script lit tout en LF, compare en LF et restitue l'EOL
// d'origine de chaque fichier à l'écriture. Le .gitattributes du dépôt (`eol=lf`) évite
// déjà la situation ; cette tolérance couvre les copies qui l'ont précédé.

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
Opération unique et irréversible — le script se supprime lui-même à la fin. Il retire
aussi ce qui ne concerne que le template : CHANGELOG et CONTRIBUTING, notes de chantier
(docs-internal/, RECETTE_*…), dossier assets/ s'il n'est référencé nulle part, entrées
de .gitignore devenues sans objet, et le job \`eject\` de la CI.

Options
  --keep-docs   Conserve la machinerie de documentation (MDX, playgrounds, tables de
                props, registry) pour documenter votre propre dashboard. La doc est
                remontée sous /docs et docs/content/ réduit à un squelette.
  --dry-run     Déroule l'opération complète sans rien écrire : tous les motifs de
                remplacement sont vérifiés et chaque suppression est listée. C'est la
                forme utilisée en CI pour détecter qu'un renommage a désynchronisé ce
                script. (Une exécution réelle commence toujours par cette passe à blanc.)
  -y, --yes     N'attend pas de confirmation.
  --force       N'exige pas un arbre git propre.
  -h, --help    Affiche cette aide.

Ce qui est conservé ou retiré, dossier par dossier, et la procédure complète : guide
« Partir du template » (docs/content/guides/partir-du-template.mdx).
`;

// =================================================================
// Journal et opérations de fichiers
// =================================================================
// Toutes les opérations passent par cette couche, qui sert DEUX passes identiques :
//   • une passe « à blanc » (`simulating`), qui ne touche pas au disque : elle tient à
//     jour un état virtuel (déplacements, contenus réécrits, suppressions) et vérifie
//     chaque motif contre cet état. C'est ce qu'exécute `--dry-run`, et c'est aussi le
//     CONTRÔLE PRÉALABLE de toute exécution réelle : un motif périmé fait échouer le
//     script avant la première écriture, jamais au milieu d'un arbre à moitié éjecté ;
//   • la passe réelle, qui exécute les mêmes appels pour de bon.
// Une seule suite d'opérations pour les deux : la simulation ne peut donc pas diverger de
// ce que la passe réelle fera.

const performed = [];

// Vrai pendant la passe à blanc : plus rien n'est écrit, tout est consigné en mémoire.
let simulating = options.dryRun;

// Vrai pendant le contrôle préalable d'une exécution réelle : les lignes du journal sont
// comptées mais pas affichées (elles le seront à la passe réelle).
let quiet = false;

// Fin de ligne des fichiers CRÉÉS par le script, fixée une fois pour toutes dans main()
// d'après package.json : un dépôt en CRLF ne reçoit pas de fichiers en LF, et réciproquement.
let projectEol = '\n';

// Renommages EN ATTENTE (destination → source). Sans eux, la passe à blanc échouerait sur
// le premier fichier qu'une opération précédente aurait dû déplacer.
const virtualMoves = new Map();

// Contenus déjà réécrits ou créés, par chemin relatif exprimé APRÈS les déplacements.
// Sans eux, un motif qui s'applique au RÉSULTAT d'un remplacement précédent (deux `patch`
// sur le même fichier) serait vérifié contre l'original, et la simulation mentirait.
const virtualFiles = new Map();

// Chemins relatifs supprimés pendant la passe à blanc (fichiers ou dossiers).
const virtualRemoved = [];

// Chemins relatifs supprimés pendant la passe en cours, quelle qu'elle soit : le contrôle
// des références (cf. removeAssetsIfUnreferenced) n'a pas à lire ce qui n'existera plus.
const removedPaths = [];

// Avertissements non bloquants, rappelés à la fin de l'exécution.
const warnings = [];

/** Prints a step line. */
const log = (verb, detail) => {
    performed.push(`${verb} ${detail}`);
    if (!quiet) console.log(`  ${verb.padEnd(11)} ${detail}`);
};

/** Absolute path of a project-relative path. */
const abs = (relative) => path.join(PROJECT_ROOT, relative);

/**
 * Tells whether a project-relative path lies under (or is) one of the given prefixes.
 *
 * @param {string} relative - Project-relative path, with forward slashes.
 * @param {string[]} prefixes - Project-relative files or directories.
 * @returns {boolean} True when `relative` equals a prefix or sits below one.
 */
const isUnder = (relative, prefixes) =>
    prefixes.some((prefix) => relative === prefix || relative.startsWith(`${prefix}/`));

/**
 * Absolute path of a project-relative path, resolved through the pending renames.
 *
 * @param {string} relative - Project-relative path, expressed AFTER the moves.
 * @returns {string} The absolute path where the file actually sits right now.
 */
function locate(relative) {
    if (!simulating) return abs(relative);

    for (const [to, from] of virtualMoves) {
        if (relative === to) return abs(from);
        if (relative.startsWith(`${to}/`)) return abs(from + relative.slice(to.length));
    }

    return abs(relative);
}

/**
 * Maps a path as it sits on disk to the path it will have once the pending renames apply.
 *
 * @param {string} relative - Project-relative path on disk.
 * @returns {string} The same path after the moves (identity outside the simulation).
 */
function afterMoves(relative) {
    for (const [to, from] of virtualMoves) {
        if (relative === from) return to;
        if (relative.startsWith(`${from}/`)) return to + relative.slice(from.length);
    }

    return relative;
}

/**
 * Tells whether a project-relative path exists, simulation included.
 *
 * @param {string} relative - Project-relative path, expressed AFTER the moves.
 * @returns {boolean} True when the file or directory is (or will be) there.
 */
function exists(relative) {
    if (!simulating) return fs.existsSync(abs(relative));
    if (virtualFiles.has(relative)) return true;
    if (isUnder(relative, virtualRemoved)) return false;

    return fs.existsSync(locate(relative));
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
 * Detects the dominant line ending of a text.
 *
 * @param {string} raw - Raw file content.
 * @returns {'\r\n' | '\n'} CRLF when it outnumbers bare LF, LF otherwise.
 */
function detectEol(raw) {
    const crlf = (raw.match(/\r\n/g) || []).length;
    const lf = (raw.match(/\n/g) || []).length - crlf;

    return crlf > lf ? '\r\n' : '\n';
}

/**
 * Reads a text file, normalised to LF.
 *
 * Tout le script raisonne en LF : les motifs sont écrits avec des `\n`, et un clone
 * Windows (`core.autocrlf=true`) pose des `\r\n` dans les fichiers. On normalise donc à la
 * lecture et on RESTITUE la fin de ligne d'origine à l'écriture (cf. writeText) — le diff
 * git ne contient ainsi que les lignes réellement modifiées. Un fichier à fins de ligne
 * mélangées est ramené à son EOL majoritaire.
 *
 * @param {string} relative - Project-relative path, expressed AFTER the moves.
 * @returns {{ text: string, eol: '\r\n' | '\n' }} The LF-normalised content and its original EOL.
 */
function readText(relative) {
    const virtual = virtualFiles.get(relative);
    if (virtual) return virtual;

    const raw = fs.readFileSync(locate(relative), 'utf8');

    return { text: raw.replace(/\r\n/g, '\n'), eol: detectEol(raw) };
}

/**
 * Writes an LF-normalised text with the given line ending, creating parent directories.
 *
 * @param {string} relative - Project-relative path, expressed AFTER the moves.
 * @param {string} text - Content, with `\n` line endings.
 * @param {'\r\n' | '\n'} eol - Line ending to put back on disk.
 */
function writeText(relative, text, eol) {
    if (simulating) {
        virtualFiles.set(relative, { text, eol });
        return;
    }

    fs.mkdirSync(path.dirname(abs(relative)), { recursive: true });
    fs.writeFileSync(abs(relative), eol === '\r\n' ? text.replace(/\n/g, '\r\n') : text, 'utf8');
}

/**
 * Moves a file or directory, creating the destination's parent as needed.
 *
 * @param {string} from - Project-relative source path.
 * @param {string} to - Project-relative destination path.
 */
function move(from, to) {
    if (!exists(from)) fail(`${from} est introuvable — le dépôt a-t-il déjà été éjecté ?`);
    log('déplacé', `${from} → ${to}`);

    if (simulating) {
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
    if (!exists(target)) return;
    log('supprimé', target);
    removedPaths.push(target);

    if (simulating) {
        virtualRemoved.push(target);
        for (const key of [...virtualFiles.keys()]) {
            if (isUnder(key, [target])) virtualFiles.delete(key);
        }
        return;
    }

    fs.rmSync(abs(target), { recursive: true, force: true });
}

/**
 * Writes a new file (or replaces one), creating its parent directory as needed.
 *
 * @param {string} target - Project-relative path.
 * @param {string} content - Full file content, in LF — le script le convertit à l'EOL du dépôt.
 */
function write(target, content) {
    log('écrit', target);
    writeText(target, content.replace(/\r\n/g, '\n'), projectEol);
}

/**
 * Builds the error message of a replacement whose search string is gone.
 *
 * @param {string} target - Project-relative path.
 * @param {string} search - The missing literal.
 * @param {'\r\n' | '\n'} eol - Original line ending of the file.
 * @returns {string} The message, which names CRLF when the file uses it.
 */
function patternMissing(target, search, eol) {
    const crlf =
        eol === '\r\n'
            ? `\nCe fichier est en CRLF (fins de ligne Windows) : le script les normalise en LF ` +
              `avant de comparer, ce n'est donc PAS la cause — le contenu a réellement changé.\n`
            : '';

    return (
        `motif introuvable dans ${target} :\n\n${search}\n${crlf}\n` +
        'Le fichier a changé depuis la dernière mise à jour de scripts/eject.js. ' +
        'Corrigez le script plutôt que de contourner ce message.'
    );
}

/**
 * Applies ordered literal replacements to a file.
 *
 * Chaque remplacement est VÉRIFIÉ : si la chaîne recherchée est absente, le script
 * s'arrête. C'est la garantie qu'un renommage en amont ne laisse pas passer un eject
 * silencieusement incomplet. La comparaison se fait en LF quelle que soit la fin de ligne
 * du fichier, qui est restituée à l'écriture.
 *
 * @param {string} target - Project-relative path.
 * @param {Array<[string, string]>} replacements - Pairs of exact search and replacement.
 */
function patch(target, replacements) {
    if (!exists(target)) fail(`${target} est introuvable.`);

    const { text, eol } = readText(target);
    let content = text;

    for (const [search, replacement] of replacements) {
        if (!content.includes(search)) fail(patternMissing(target, search, eol));
        content = content.split(search).join(replacement);
    }

    log('modifié', target);
    writeText(target, content, eol);
}

/**
 * Applies a custom transformation to a file, for the rare edit that no literal can express.
 *
 * @param {string} target - Project-relative path.
 * @param {(text: string, eol: '\r\n' | '\n') => string} transform - Receives the LF-normalised
 *   content and must call `fail()` itself when its expectations are not met.
 */
function patchWith(target, transform) {
    if (!exists(target)) fail(`${target} est introuvable.`);

    const { text, eol } = readText(target);

    log('modifié', target);
    writeText(target, transform(text, eol), eol);
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
    if (!exists(target)) fail(`${target} est introuvable.`);

    const { text, eol } = readText(target);
    const next = text.split('/demo/').join('/').split('/demo').join('/');

    if (next === text) fail(`aucune occurrence de '/demo' dans ${target}.`);

    log('modifié', target);
    writeText(target, next, eol);
}

/**
 * Reads, transforms and rewrites a JSON file, preserving two-space indentation.
 *
 * @param {string} target - Project-relative path.
 * @param {(value: Object) => Object} transform - Pure transformation of the parsed value.
 */
function patchJson(target, transform) {
    if (!exists(target)) fail(`${target} est introuvable.`);

    const { text, eol } = readText(target);

    let next;
    try {
        next = transform(JSON.parse(text));
    } catch (error) {
        fail(`${target} n'a pas la structure attendue : ${error.message}`);
    }

    log('modifié', target);
    writeText(target, `${JSON.stringify(next, null, 2)}\n`, eol);
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
            `                <nav className="not-found__links" aria-label={dictionary.notFound.entryPoints}>
                    <Link href="/">Documentation</Link>
                    <Link href={DEMO_BASE_PATH}>Application de démonstration</Link>
                </nav>`,
            `                <p className="not-found__links">
                    <Link href={DEMO_BASE_PATH || '/'}>Retour à l&apos;accueil</Link>
                </p>`,
        ],
        // Le libellé du <nav> était la seule lecture du dictionnaire : sans lui, la constante
        // et ses deux imports deviendraient inutilisés et casseraient le lint de la copie éjectée.
        [`import { getDictionary } from '@/i18n/getDictionary';
import { DEFAULT_LOCALE } from '@/i18n/config';
`, ''],
        [`    const dictionary = await getDictionary(DEFAULT_LOCALE);

`, ''],
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

    // Déploiement de la documentation du template. La prose propre au template
    // (CHANGELOG, CONTRIBUTING…) est traitée à part, car elle part dans les DEUX modes.
    remove('.github/workflows/docs.yml');

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
 * Même sort pour la suite d'hydratation du thème (qui ne parcourt que des pages de
 * documentation) et celle du sélecteur de langue (qui pilote les playgrounds).
 *
 * Ce n'est pas cosmétique : `next build` type-vérifie e2e/, et une spec qui importe un
 * helper retiré (previewFrame, docsRoutes, demoRoutes) fait échouer le build du dépôt
 * éjecté, comme `npx playwright test`, qui ne charge alors plus aucun test.
 */
function rewriteE2E() {
    remove('e2e/visual.spec.ts');
    remove('e2e/visual.spec.ts-snapshots');
    remove('e2e/edge-cases.spec.ts');
    remove('e2e/edge-cases.spec.ts-snapshots');
    remove('e2e/helpers/previewFrame.ts');
    remove('e2e/theme-hydration.spec.ts');
    remove('e2e/language-switcher.spec.ts');

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
        [
            `  // Une page de chaque surface (documentation, démo), ouverte dans un vrai navigateur.
  await assertDevServerHealthy(baseURL, [docsRoutes()[0], demoRoutes()[0]], startedAt);`,
            `  // Une page de l'application, ouverte dans un vrai navigateur.
  await assertDevServerHealthy(baseURL, [appRoutes()[0]], startedAt);`,
        ],
    ]);

    // Les deux suites qui parcouraient les routes de l'application (et, pour la seconde,
    // celles de la documentation) n'en gardent que la moitié applicative.
    patch('e2e/navigation.spec.ts', [
        [`import { demoRoutes } from './helpers/routes';`, `import { appRoutes } from './helpers/routes';`],
        [`for (const path of demoRoutes()) {`, `for (const path of appRoutes()) {`],
    ]);
    patch('e2e/responsive.spec.ts', [
        [
            `import { docsRoutes, demoRoutes } from './helpers/routes';`,
            `import { appRoutes } from './helpers/routes';`,
        ],
        [
            `const ROUTES = [
  ...docsRoutes().map((path) => ({ path, surface: 'docs' })),
  ...demoRoutes().map((path) => ({ path, surface: 'demo' })),
];`,
            `const ROUTES = appRoutes().map((path) => ({ path, surface: 'app' }));`,
        ],
    ]);

    // Le test de contraste visait une page de la démo et trois pages de documentation :
    // il ne garde qu'une page de l'application, présente dans le manifeste minimal.
    patch('e2e/a11y-contrast.spec.ts', [
        [
            `const PAGES = [
  { label: 'démo — PIB (graphique)', path: \`/demo/\${DEFAULT_LOCALE}/comptabilite-nationale/france/pib\`, ready: 'svg text' },
  { label: 'doc — StatCard (pastilles, props, code)', path: '/composants/stat-card', ready: 'main' },
  { label: 'doc — Chart (playground, code)', path: '/features/chart', ready: 'main' },
  { label: 'doc — Thème sombre', path: '/fondations/theme-sombre', ready: 'main' },
];`,
            `const PAGES = [
  { label: 'indicateur (graphique)', path: \`/\${DEFAULT_LOCALE}/indicateur\`, ready: 'svg text' },
];`,
        ],
    ]);

    // Les chemins littéraux '/demo/…' des tests suivent le déplacement de l'application.
    for (const spec of ['e2e/i18n.spec.ts', 'e2e/helpers/locale.ts', 'e2e/global-setup.ts']) {
        unprefixDemoPaths(spec);
    }
}

// Bandeau de la section de .env.example consacrée à l'export statique : elle court de là
// jusqu'à la fin du fichier et est réécrite en bloc. Le texte d'origine décrit
// `npm run build:docs` et trois variables posées ensemble, ce qui n'est vrai nulle part
// après l'eject (`build:static` ne pose que STATIC_EXPORT, le sous-chemin est à la charge
// du consommateur).
const ENV_STATIC_EXPORT_BANNER = `# =================================================================
# DOCUMENTATION — export statique vers GitHub Pages
# =================================================================
`;

/**
 * Builds the static-export section of .env.example for the ejected repository.
 *
 * @param {boolean} keepDocs - Whether the documentation machinery (and its registry) was kept.
 * @returns {string} The section, from its banner to the end of the file.
 */
function envStaticExportSection(keepDocs) {
    const derivation = keepDocs
        ? `Le sous-chemin VAUT donc le nom du dépôt, et
# l'URL du registry vaut l'URL complète des Pages. Les deux doivent rester en phase :
# le registry est publié dans le même déploiement, sous /r/.`
        : 'Le sous-chemin VAUT donc le nom du dépôt.';

    const registry = keepDocs
        ? `
# REGISTRY_BASE_URL=https://<compte>.github.io/<dépôt>
# URL publique du registry, gravée dans les \`registryDependencies\` de public/r/*.json
# par scripts/build-registry.js. Une valeur fausse produit un registry qui s'installe
# sans erreur mais télécharge ses dépendances depuis localhost.
`
        : '';

    return `# =================================================================
# EXPORT STATIQUE — hébergement sans serveur Node (GitHub Pages et consorts)
# =================================================================
# Ces variables ne servent qu'à \`npm run build:static\` : ni \`npm run dev\` ni
# \`npm run build\` ne les lisent, et l'application se comporte donc exactement comme avant
# en leur absence.
#
# Règle de dérivation : GitHub Pages sert un dépôt de projet sous
# https://<compte>.github.io/<dépôt>/. ${derivation}

# STATIC_EXPORT=1
# Active output:'export' + basePath + assetPrefix + images.unoptimized dans
# next.config.ts. Sans elle, aucun de ces réglages n'est appliqué. Posée par
# \`npm run build:static\` : inutile de la renseigner à la main.

# NEXT_PUBLIC_BASE_PATH=/mon-depot
# Sous-chemin de déploiement, sans barre oblique finale. Préfixe NEXT_PUBLIC_ requis :
# la valeur doit être visible côté navigateur pour src/utils/url/withBasePath.js, qui
# l'ajoute aux URL absolues que Next ne réécrit pas lui-même (fetch, textures WebGL,
# url() en style inline). next/link et next/image, eux, la prennent en compte seuls.
${registry}`;
}

/**
 * Rewrites the configuration files that describe the machinery the eject removed or renamed.
 *
 * .env.example et eslint.config.mjs nomment le script `build:docs`, le registry et les
 * modules générés de la documentation. Réécritures LITTÉRALES et ciblées — pas de
 * substitution générique, qui laisserait passer des phrases devenues fausses en ne
 * changeant qu'un mot.
 *
 * @param {boolean} keepDocs - Whether the documentation machinery was kept.
 */
function rewriteConfigFiles(keepDocs) {
    patchWith('.env.example', (text, eol) => {
        const start = text.indexOf(ENV_STATIC_EXPORT_BANNER);
        if (start === -1) fail(patternMissing('.env.example', ENV_STATIC_EXPORT_BANNER, eol));

        return text.slice(0, start) + envStaticExportSection(keepDocs);
    });

    const replacements = [
        ['out/ est le site généré par `npm run build:docs`', 'out/ est le site généré par `npm run build:static`'],
    ];

    if (!keepDocs) {
        replacements.push([
            `      // Module généré par scripts/build-registry.js : sa forme est décidée par
      // le script, pas par le lint. registry/examples/ reste linté, lui — ce
      // sont des composants React distribués, ils doivent tenir la même barre.
      "registry/__registry__.js",
      // Idem pour les deux modules générés par scripts/build-docs-index.js.
      // docs/content/**.mdx n'est pas concerné : ESLint ne lint pas le MDX.
      "docs/__docs__.js",
      "docs/__docs-pages__.js",
`,
            '',
        ]);
    }

    patch('eslint.config.mjs', replacements);
}

/**
 * Rewrites the CI workflows so that they stay true in the ejected repository.
 *
 * Deux défauts, tous deux invisibles tant qu'on reste dans le dépôt template :
 *   • verify.yml garde le job `eject`, qui appelle un script que cette opération supprime :
 *     la CI du dépôt éjecté échouerait au premier push ;
 *   • il enchaîne des commandes isolées au lieu de `npm run verify`, et laisse donc passer
 *     tout ce que la barrière complète vérifie (ex. `check:i18n --strict`).
 *
 * @param {boolean} keepDocs - Whether the documentation machinery was kept.
 */
function rewriteWorkflows(keepDocs) {
    patch('.github/workflows/verify.yml', [
        [
            `      - name: Lint
        run: npm run lint

      - name: Check palette sync
        run: npm run check:palette

      - name: Validate site config
        run: npm run validate:config

      - name: Check GraphQL documents
        run: npm run check:gql

      - name: Unit tests
        run: npm run test

`,
            `      # \`npm run verify\` est la barrière unique du dépôt (cf. package.json) : la CI ne
      # tient pas sa propre liste de commandes, qui divergerait.
      - name: Verify
        run: npm run verify

`,
        ],
    ]);

    // Le job `eject` est le DERNIER du fichier, introduit par un bandeau de commentaire :
    // on retire tout depuis ce bandeau. Le contrôle structurel garantit qu'aucun autre job
    // n'a été ajouté après lui — il partirait avec, en silence.
    const EJECT_JOB_BANNER = `  # =================================================================
  # EJECT — le dépôt reste éjectable
`;
    patchWith('.github/workflows/verify.yml', (text, eol) => {
        const start = text.indexOf(EJECT_JOB_BANNER);
        if (start === -1) fail(patternMissing('.github/workflows/verify.yml', EJECT_JOB_BANNER, eol));

        const tail = text.slice(start);
        const jobs = tail.match(/^ {2}[A-Za-z0-9_-]+:[ \t]*$/gm) ?? [];
        if (jobs.length !== 1 || jobs[0].trim() !== 'eject:') {
            fail(
                `.github/workflows/verify.yml : le bandeau EJECT doit introduire UN SEUL job, \`eject\`, ` +
                `dernier du fichier (trouvé : ${jobs.map((job) => job.trim()).join(', ') || 'aucun'}). ` +
                'Adaptez rewriteWorkflows() dans scripts/eject.js.',
            );
        }

        return `${text.slice(0, start).trimEnd()}\n`;
    });

    // Le déploiement de la doc survit à l'eject en mode --keep-docs, mais `build:docs` y a
    // été renommé `build:static` (cf. rewritePackageJson) : sans ceci le workflow échoue.
    if (keepDocs) {
        patch('.github/workflows/docs.yml', [['run: npm run build:docs', 'run: npm run build:static']]);
    }
}

// Fichiers de prose du dépôt template qui traînent à la racine : notes d'architecture et
// prompts des chantiers, recette. Ils décrivent le travail SUR le template, jamais le
// dashboard du consommateur. Selon l'époque ils sont suivis par git ou seulement présents
// dans la copie locale de l'auteur (ignorés) — d'où un motif plutôt qu'une liste figée.
const TEMPLATE_PROSE = /^(RECETTE_\w+|(POST_)?TEMPLATIZATION_\w+|LANGUAGE_SWITCHER_\w+)\.md$/;

// Dossier versionné qui accueille désormais ces notes (TEMPLATIZATION_*, LANGUAGE_SWITCHER_*,
// POST_TEMPLATIZATION_*). Son absence n'est pas une erreur : l'auteur du template prévoit de
// le supprimer avant de fusionner dans main, et l'eject doit rester possible après.
const TEMPLATE_PROSE_DIR = 'docs-internal';

/**
 * Removes the template's own prose and changelog, in both modes.
 *
 * CONTRIBUTING.md se présente comme « pour qui travaille sur le template lui-même » et
 * renvoie à un CLAUDE.md ignoré par git ; CHANGELOG.md raconte l'histoire du template. Ni
 * l'un ni l'autre n'est celui du consommateur. En mode --keep-docs, un CHANGELOG d'une
 * ligne prend la place du premier : le dépôt éjecté repart d'un journal vide.
 *
 * @param {boolean} keepDocs - Whether the documentation machinery was kept.
 */
function removeTemplateProse(keepDocs) {
    remove('CONTRIBUTING.md');

    if (keepDocs) {
        write('CHANGELOG.md', '# Changelog — tenez ici le journal des changements notables de votre projet.\n');
    } else {
        remove('CHANGELOG.md');
    }

    const prose = fs.readdirSync(PROJECT_ROOT).filter((name) => TEMPLATE_PROSE.test(name));
    for (const name of prose.sort()) remove(name);

    remove(TEMPLATE_PROSE_DIR);
}

/**
 * Removes the .gitignore entries whose target no longer exists after the eject.
 *
 * Seules les entrées dont l'objet disparaît sont retirées : les artefacts générés par le
 * registry, l'index de documentation et les tables de props partent avec leurs
 * générateurs en mode complet, mais restent indispensables en --keep-docs ; les notes de
 * chantier n'ont plus d'entrée (docs-internal/ est versionné). Les entrées d'ordre personnel (CLAUDE.md,
 * .claude/…, TODO…) ne concernent pas le template et sont laissées telles quelles.
 *
 * @param {boolean} keepDocs - Whether the documentation machinery was kept.
 */
function cleanGitignore(keepDocs) {
    // Les notes de chantier vivent dans docs-internal/, versionné : plus aucune entrée
    // .gitignore ne les concerne. Garde-fou — une entrée qui les ferait réapparaître comme
    // ignorées les soustrairait à git, donc à la copie de la CI, et l'étape de suppression
    // de docs-internal/ (cf. removeTemplateProse) ne serait plus jamais exercée.
    patchWith('.gitignore', (text) => {
        if (/^\/?docs-internal/m.test(text) || /^(POST_)?TEMPLATIZATION_\w+\.md$/m.test(text)) {
            fail('.gitignore ignore à nouveau les notes de chantier : docs-internal/ doit rester versionné.');
        }
        return text;
    });

    const replacements = [
        // Le script `build:docs` est renommé `build:static` dans les deux modes.
        ['(cf. npm run build:docs)', '(cf. npm run build:static)'],
    ];

    if (!keepDocs) {
        replacements.unshift(
            [
                `# registry (généré par scripts/build-registry.js, cf. scripts dev / prebuild)
/public/r/
/registry/__registry__.js

# documentation (généré par scripts/build-docs-index.js, cf. scripts dev / prebuild)
/docs/__docs__.js
/docs/__docs-pages__.js

# tables de props (généré par scripts/build-props-doc.js, cf. scripts dev / prebuild)
/docs/__props__.json

`,
                '',
            ],
        );
    }

    patch('.gitignore', replacements);
}

// Dossiers jamais explorés par le contrôle des références : dépendances, caches de build et
// rapports de test, qui contiennent des chemins `assets/` sans rapport avec ce dossier.
const REFERENCE_SCAN_SKIP_DIRS = new Set([
    'node_modules', '.git', '.next', 'out', 'test-results', 'playwright-report', 'coverage', '.claude',
]);
const REFERENCE_SCAN_SKIP_FILES = new Set(['package-lock.json']);
const REFERENCE_SCAN_BINARY = /\.(png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|eot|pdf|mp4|webm|zip)$|\.tsbuildinfo$/i;

// `assets/` ou `assets\` en tête d'un chemin : précédé du début de ligne ou d'un caractère
// qui ne peut pas faire partie d'un nom (donc pas `public/assets/`… sauf via le `/`, ce qui
// ne fait que rendre le contrôle PLUS prudent : un faux positif conserve le dossier).
const ASSETS_REFERENCE = /(^|[^\w.-])assets[\\/]/;

/**
 * Lists the files that will still exist at the end of the operation, with their content.
 *
 * Lit l'arbre tel qu'il sera, pas tel qu'il est : en simulation, les fichiers supprimés ou
 * déplacés plus tôt sont écartés ou rebaptisés, et les contenus réécrits ou créés sont
 * lus depuis l'état virtuel. C'est ce qui rend le contrôle de `--dry-run` identique à
 * celui de l'exécution réelle.
 *
 * @returns {Array<{ file: string, text: string }>} Project-relative path and LF content.
 */
function survivingTextFiles() {
    const files = [];
    const seen = new Set();

    const walk = (directory) => {
        for (const entry of fs.readdirSync(abs(directory), { withFileTypes: true })) {
            const onDisk = directory === '.' ? entry.name : `${directory}/${entry.name}`;
            const relative = afterMoves(onDisk);

            // Ni lien symbolique ni fichier spécial : on ne lit que ce qu'on peut lire.
            if (!entry.isDirectory() && !entry.isFile()) continue;

            if (entry.isDirectory()) {
                if (REFERENCE_SCAN_SKIP_DIRS.has(entry.name)) continue;
                if (isUnder(relative, removedPaths)) continue;
                walk(onDisk);
                continue;
            }

            if (isUnder(relative, removedPaths)) continue;
            if (REFERENCE_SCAN_SKIP_FILES.has(entry.name) || REFERENCE_SCAN_BINARY.test(entry.name)) continue;

            seen.add(relative);
            files.push({ file: relative, text: readText(relative).text });
        }
    };
    walk('.');

    // Fichiers que la simulation vient de créer et qui n'existent pas encore sur disque.
    for (const [relative, { text }] of virtualFiles) {
        if (!seen.has(relative) && !isUnder(relative, removedPaths)) files.push({ file: relative, text });
    }

    return files;
}

/**
 * Removes the root `assets/` folder, after checking that nothing refers to it.
 *
 * Ce dossier d'icônes ne figure dans aucun import, alias ni configuration du dépôt ; il
 * est resté d'une époque antérieure. La suppression n'est pourtant PAS présumée sûre : le
 * contrôle lit tous les fichiers texte qui survivront à l'eject et conserve le dossier,
 * avec un avertissement, au premier qui le cite. Doit s'exécuter EN DERNIER, une fois les
 * autres suppressions et réécritures faites, sans quoi il verrait des fichiers qui ne
 * seront plus là (le script lui-même, la prose du template…).
 */
function removeAssetsIfUnreferenced() {
    if (!exists('assets')) return;

    const referrers = survivingTextFiles()
        .filter(({ file, text }) => !isUnder(file, ['assets']) && ASSETS_REFERENCE.test(text))
        .map(({ file }) => file);

    if (referrers.length === 0) {
        remove('assets');
        return;
    }

    warnings.push(
        `assets/ est conservé : il est cité par ${referrers.slice(0, 5).join(', ')}` +
        `${referrers.length > 5 ? `… (+${referrers.length - 5})` : ''}. Supprimez-le à la main s'il est inutile.`,
    );
    log('conservé', `assets/ (référencé par ${referrers.length} fichier${referrers.length > 1 ? 's' : ''})`);
}

/**
 * Replaces the template's README with a starter one and removes the script itself.
 *
 * @param {boolean} keepDocs - Whether the documentation machinery was kept.
 */
function finalise(keepDocs) {
    write('README.md', starterReadme(keepDocs));
    remove('scripts/eject.js');

    // Ce test lit les constantes exportées par le script : il ne survit pas à sa suppression.
    remove('src/page-templates/components/HomePage/homeLinks.eject.test.js');
}

// =================================================================
// Point d'entrée
// =================================================================

/**
 * Runs every operation of the eject, in order.
 *
 * Appelée deux fois pour une exécution réelle — à blanc d'abord, pour de bon ensuite —
 * et une seule pour `--dry-run`. L'ordre compte : le contrôle des références à `assets/`
 * passe en dernier, une fois toutes les suppressions faites (cf. removeAssetsIfUnreferenced).
 */
function runOperations() {
    mountAppAtRoot();
    resetManifest();

    if (options.keepDocs) mountDocsUnderSlashDocs();
    else removeDocsSurface();

    removeTemplateProse(options.keepDocs);
    cleanGitignore(options.keepDocs);
    rewritePackageJson(options.keepDocs);
    rewriteWorkflows(options.keepDocs);
    rewriteConfigFiles(options.keepDocs);
    rewriteE2E();
    finalise(options.keepDocs);
    removeAssetsIfUnreferenced();
}

/**
 * Forgets everything the dry pass recorded, before the real pass starts from scratch.
 */
function resetState() {
    performed.length = 0;
    virtualMoves.clear();
    virtualFiles.clear();
    virtualRemoved.length = 0;
    removedPaths.length = 0;
    warnings.length = 0;
}

function main() {
    if (options.help) {
        console.log(HELP);
        return;
    }

    assertNotEjected();
    assertCleanTree();

    // Fin de ligne des fichiers que le script CRÉE : celle du dépôt, lue sur package.json.
    projectEol = detectEol(fs.readFileSync(abs('package.json'), 'utf8'));

    // CONTRÔLE PRÉALABLE : toute la suite d'opérations est déroulée à blanc, motifs compris,
    // AVANT la première écriture. Un motif périmé (ou un fichier manquant) arrête le script
    // ici, l'arbre intact — pas après le déplacement de src/app/(site)/demo/.
    if (!options.dryRun) {
        simulating = true;
        quiet = true;
        runOperations();
        const checked = performed.length;
        resetState();
        simulating = false;
        quiet = false;
        console.log(`\nContrôle préalable : ${checked} opérations vérifiées à blanc, arbre intact.`);
    }

    console.log(`\neject — mode ${options.keepDocs ? '--keep-docs' : 'complet'}${options.dryRun ? ' (simulation)' : ''}`);
    console.log(
        options.keepDocs
            ? "  L'application remonte à la racine, la documentation passe sous /docs et son\n  contenu est réduit à un squelette."
            : "  L'application remonte à la racine, toute la surface de documentation est retirée.",
    );
    console.log('  Cette opération est IRRÉVERSIBLE (hors `git checkout .`).');

    confirm();
    console.log('');

    try {
        runOperations();
    } catch (error) {
        // Les motifs ont tous été vérifiés : ce qui échoue ici est le système de fichiers
        // (droits, fichier verrouillé par un éditeur ou un antivirus sous Windows).
        console.error(`\neject : erreur système en cours d'exécution — ${error.message}`);
        console.error(
            "L'arbre est à moitié éjecté. Revenez en arrière avec `git checkout . && git clean -fd`, " +
            'puis relancez (fermez les programmes qui ouvrent le dépôt).\n',
        );
        process.exit(1);
    }

    console.log(`\n${performed.length} opérations${options.dryRun ? ' simulées' : ''}.`);

    for (const warning of warnings) console.warn(`\nAvertissement : ${warning}`);

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
