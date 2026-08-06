#!/usr/bin/env node

// =================================================================
// TABLES DE PROPS — les .jsx du registry → docs/__props__.json
// =================================================================
// Dérive la table des props de chaque composant distribué par le registry de ses
// PROPRES docstrings. Rien n'est ressaisi : une prop ajoutée, renommée ou dont la
// description change apparaît dans la documentation au prochain build, et une
// documentation qui ment est SIGNALÉE (cf. la check-list de fin de script). Même
// famille que scripts/build-tokens-doc.js et scripts/build-registry.js : CommonJS,
// câblé dans `dev`, `prebuild` et `verify`.
//
// SORTIE DANS docs/ ET NON DANS public/ : contrairement à la référence des tokens,
// qui est une page unique de 880 lignes chargée par `fetch`, une table de props est
// rendue par un SERVER COMPONENT (<PropsTable>). Le JSON est donc importé, lu à la
// génération de la page, et ne traverse jamais la frontière client — seules les
// quelques lignes réellement affichées partent dans la charge RSC. Le fichier est
// généré, donc ignoré par git, comme docs/__docs__.js et registry/__registry__.js.
//
// ─── CE QUE react-docgen SAIT FAIRE, ET CE QU'IL NE SAIT PAS ─────────────────────
//
// Le dépôt est en JavaScript nu : ni `propTypes`, ni annotations TypeScript. Or c'est
// LÀ que react-docgen va chercher le type et la description d'une prop. Livré à
// lui-même il ne rend donc, par composant, que les props ayant une VALEUR PAR DÉFAUT
// dans la déstructuration — <Chart> y perdrait `data`, `x`, `y`, `z` et `hue`, soit
// exactement ses cinq props obligatoires.
//
// D'où le partage des rôles suivant, chacun confié à qui sait le faire :
//
//   react-docgen      → repérer les composants exportés (y compris `const Name = …`
//                       + `export default Name` en fin de fichier, et le forwardRef
//                       de TopbarToggleButton), leur nom d'affichage, leur docblock
//                       et les valeurs par défaut de la déstructuration.
//   handler maison    → relever la LISTE ORDONNÉE des clés déstructurées. C'est la
//                       vérité de terrain sur l'existence d'une prop, et l'ordre de
//                       la signature est celui dans lequel l'auteur les a pensées :
//                       bien meilleur, pour une table, qu'un ordre alphabétique.
//   parseur JSDoc     → type et description, depuis les `@param`.
//
// Le handler est posé EN TÊTE de la liste (avant `defaultHandlers`) : c'est ce qui
// donne aux descripteurs de props l'ordre de la signature. Placé en queue, il aurait
// hérité de l'ordre de `defaultPropsHandler`, qui ne voit que les props à défaut.
//
// ─── POURQUOI UN PARSEUR JSDoc MAISON ────────────────────────────────────────────
//
// `utils.parseJsDoc` est exporté par react-docgen, et ne convient pas : il abandonne
// la balise dès la syntaxe optionnelle `@param {number} [props.height=460]` — soit
// les deux tiers des props du dépôt — et perd tout ce qui suit. Le parseur ci-dessous
// gère les quatre formes réellement présentes dans le code :
//
//   1. LES DEUX CONVENTIONS DE NOMMAGE. 52 composants documentent `@param {T} props.x`
//      (la convention de CLAUDE.md), 31 la forme plate `@param {T} x` héritée. Un nom
//      non préfixé n'est retenu QUE s'il correspond à une clé déstructurée : c'est ce
//      qui distingue une prop du `ref` de TopbarToggleButton, documenté au même rang.
//   2. LES TYPES S'ÉTALENT SUR PLUSIEURS LIGNES et contiennent des accolades
//      imbriquées — `{Array<{channel: 'color'|…, items: Array<{…}>}>}` dans
//      ChannelLegend. Un `\{[^}]*\}` s'y arrête au premier `}` interne et décale tout
//      le reste de la balise ; les délimiteurs sont donc appariés par comptage.
//   3. LA DESCRIPTION N'EST PAS TOUJOURS INTRODUITE PAR UN TIRET. HatchPatterns la
//      commence à la ligne suivante, sans séparateur.
//   4. LES NOMS PEUVENT ÊTRE DES CHAÎNES. <Chart> expose `props['categorical-x']`,
//      qui n'est pas un identifiant JavaScript valide.
//
// ─── LA CHECK-LIST N'EST PAS UN ORNEMENT ─────────────────────────────────────────
//
// Le script sort trois listes, et c'est la moitié de son intérêt :
//   • les props PRÉSENTES dans la signature et ABSENTES des docstrings — ce qui reste
//     à documenter ;
//   • les props DOCUMENTÉES et ABSENTES de la signature — une docstring périmée, le
//     défaut que ce script existe pour rendre impossible ;
//   • les valeurs par défaut où le code et la docstring se contredisent.
// `--strict` (câblé dans `verify` seulement) fait sortir en 1 sur les deux dernières.
// Les props non documentées, elles, n'échouent jamais : c'est une dette à afficher,
// pas une régression.
//
// LIMITE DE BOUCLE DE DEV À CONNAÎTRE, la même que celle de build-docs-index.js :
// le JSON est produit UNE FOIS au démarrage de `npm run dev`. Éditer une docstring
// demande donc de relancer la commande — ou `npm run build:props` seul — pour voir la
// table changer.

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'registry/registry.json');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'docs/__props__.json');

const STRICT = process.argv.includes('--strict');

// Les incohérences réelles entre le code et sa documentation. Séparées des props
// simplement non documentées, qui ne font pas échouer le build.
const conflicts = [];

/**
 * Records a mismatch between the code and its docstrings.
 *
 * @param {string} message - What contradicts what.
 * @returns {void}
 */
const conflict = (message) => { conflicts.push(message); };

// =================================================================
// 1. PARSEUR JSDoc
// =================================================================

/**
 * Finds the delimiter closing the one that opens at `start`.
 *
 * Comptage de profondeur plutôt qu'expression régulière : les types du dépôt
 * imbriquent les accolades sur plusieurs niveaux et plusieurs lignes.
 *
 * @param {string} text - Text to scan.
 * @param {number} start - Index of the opening delimiter.
 * @param {string} open - Opening delimiter.
 * @param {string} close - Closing delimiter.
 * @returns {number} Index of the matching delimiter, or -1 when unbalanced.
 */
const closingIndex = (text, start, open, close) => {
    let depth = 0;

    for (let index = start; index < text.length; index += 1) {
        if (text[index] === open) depth += 1;
        else if (text[index] === close) {
            depth -= 1;
            if (depth === 0) return index;
        }
    }

    return -1;
};

/**
 * Finds the `=` separating a name from its default value, ignoring nested ones.
 *
 * @param {string} text - The inside of a `[…]` optional-parameter group.
 * @returns {number} Index of the separator, or -1 when there is no default.
 */
const defaultSeparatorIndex = (text) => {
    let depth = 0;

    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if ('[{('.includes(character)) depth += 1;
        else if (']})'.includes(character)) depth -= 1;
        else if (character === '=' && depth === 0) return index;
    }

    return -1;
};

/**
 * Collapses a docblock fragment to a single line.
 *
 * Le retour à la ligne d'une docstring est un accident de largeur de colonne, pas
 * une intention : dans une cellule de tableau il doit disparaître.
 *
 * @param {string} text - Raw fragment.
 * @returns {string} The fragment on one line, trimmed.
 */
const collapse = (text) => text.replace(/\s+/g, ' ').trim();

/**
 * Splits a docblock into its leading description and its tags.
 *
 * Une balise commence à une ligne débutant par `@` ; tout ce qui suit lui appartient
 * jusqu'à la balise suivante — c'est ainsi que les types et les descriptions
 * multilignes restent entiers.
 *
 * @param {string} raw - The docblock text, as react-docgen returns it.
 * @returns {{description: string, tags: Array<{tag: string, body: string}>}} The split.
 */
const splitDocblock = (raw) => {
    const description = [];
    const tags = [];
    let current = null;

    for (const line of raw.replace(/\r\n?/g, '\n').split('\n')) {
        const opened = /^@(\w+)[ \t]*(.*)$/.exec(line);

        if (opened) {
            current = { tag: opened[1], body: opened[2] };
            tags.push(current);
        } else if (current) {
            current.body += `\n${line}`;
        } else {
            description.push(line);
        }
    }

    return { description: description.join('\n').trim(), tags };
};

/**
 * Parses the body of a single `@param` tag.
 *
 * @param {string} body - Everything after `@param`, continuation lines included.
 * @returns {?{name: string, type: ?string, optional: boolean, defaultValue: ?string,
 *   description: string}} The parsed tag, or null when it carries no name.
 */
const parseParamTag = (body) => {
    let rest = body.replace(/^[ \t]+/, '');
    let type = null;

    // ===== TYPE =====
    if (rest.startsWith('{')) {
        const end = closingIndex(rest, 0, '{', '}');
        if (end === -1) return null;

        type = collapse(rest.slice(1, end));
        rest = rest.slice(end + 1);
    }

    rest = rest.replace(/^[ \t\n]+/, '');

    // ===== NOM, OPTIONALITÉ ET VALEUR PAR DÉFAUT =====
    let name = null;
    let optional = false;
    let defaultValue = null;

    if (rest.startsWith('[')) {
        const end = closingIndex(rest, 0, '[', ']');
        if (end === -1) return null;

        const inside = rest.slice(1, end);
        const separator = defaultSeparatorIndex(inside);

        name = (separator === -1 ? inside : inside.slice(0, separator)).trim();
        defaultValue = separator === -1 ? null : collapse(inside.slice(separator + 1));
        optional = true;
        rest = rest.slice(end + 1);
    } else {
        const bare = /^(\S+)/.exec(rest);
        if (!bare) return null;

        name = bare[1];
        rest = rest.slice(name.length);
    }

    // ===== DESCRIPTION =====
    // Le séparateur est facultatif : certaines balises enchaînent directement à la
    // ligne suivante (cf. point 3 de l'en-tête).
    const description = collapse(rest.replace(/^[ \t\n]*[-—:][ \t]*/, ''));

    return { name, type, optional, defaultValue, description };
};

/**
 * Turns a documented parameter name into a prop name.
 *
 * @param {string} raw - The name as written, e.g. `props.height` or `props['categorical-x']`.
 * @returns {{name: ?string, prefixed: boolean}} The prop name — null for the `props`
 *   container itself — and whether it was written under the `props.` namespace.
 */
const readPropName = (raw) => {
    if (raw === 'props') return { name: null, prefixed: true };

    const quoted = /^props\[(['"])(.+?)\1\]$/.exec(raw);
    if (quoted) return { name: quoted[2], prefixed: true };

    if (raw.startsWith('props.')) return { name: raw.slice('props.'.length), prefixed: true };

    return { name: raw, prefixed: false };
};

// =================================================================
// 2. LECTURE DES COMPOSANTS
// =================================================================

/**
 * Lists the component files the registry distributes, mapped to their item.
 *
 * Les items d'EXEMPLE sont écartés : `registry/examples/chart-hue.jsx` est une
 * démonstration d'usage, pas une unité réutilisable, et sa « table de props » serait
 * systématiquement vide.
 *
 * @returns {Map<string, string[]>} Repository-relative .jsx path → item names.
 */
const listComponentFiles = () => {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));
    const files = new Map();

    for (const item of registry.items) {
        if (item.meta?.example) continue;

        for (const file of item.files ?? []) {
            if (!file.path.endsWith('.jsx')) continue;
            files.set(file.path, [...(files.get(file.path) ?? []), item.name]);
        }
    }

    return new Map([...files].sort(([a], [b]) => a.localeCompare(b)));
};

/**
 * Builds the react-docgen handler that records the destructured signature.
 *
 * Enregistrer chaque clé par `getPropDescriptor` suffirait à faire exister la prop,
 * mais react-docgen élague en fin de course tout descripteur sans type ni valeur par
 * défaut : la liste est donc AUSSI posée telle quelle sous une clé personnalisée, que
 * `toObject()` recopie sans y toucher.
 *
 * @returns {Function} A react-docgen handler.
 */
const makeSignatureHandler = () => (documentation, componentDefinition) => {
    let node = componentDefinition.node;

    // `React.forwardRef(({ … }, ref) => …)` : la définition est l'appel, la signature
    // qui nous intéresse est celle de la fonction qu'on lui passe.
    if (node.type === 'CallExpression') {
        node = node.arguments.find(
            (argument) => argument.type === 'ArrowFunctionExpression' || argument.type === 'FunctionExpression',
        ) ?? node;
    }

    const first = (node.params ?? [])[0];
    const destructured = first?.type === 'ObjectPattern';
    const names = [];
    let restProps = false;

    if (destructured) {
        for (const property of first.properties) {
            // `...props` : le composant relaie ses props restantes à son élément racine.
            // Ce n'est pas une prop, mais c'est une information que la table doit dire.
            if (property.type === 'RestElement') {
                restProps = true;
                continue;
            }

            const key = property.key;
            const name = String(key.type === 'Identifier' ? key.name : key.value);

            names.push(name);
            documentation.getPropDescriptor(name);
        }
    }

    documentation.set('signatureProps', names);
    documentation.set('destructured', destructured);
    documentation.set('restProps', restProps);
};

// =================================================================
// 3. FUSION SIGNATURE + DOCSTRINGS
// =================================================================

/**
 * Merges one react-docgen result with its own docstrings.
 *
 * @param {Object} docgen - One entry of the react-docgen output.
 * @param {string} file - Repository-relative path of the source file.
 * @param {string[]} items - Registry items distributing that file.
 * @returns {{record: Object, undocumented: string[]}} The emitted record and the
 *   props left to document.
 */
const buildComponent = (docgen, file, items) => {
    const { description, tags } = splitDocblock(docgen.description ?? '');
    const signature = docgen.signatureProps ?? [];
    const known = new Set(signature);

    // ===== RELEVÉ DES BALISES =====
    const documented = new Map();

    for (const tag of tags) {
        if (tag.tag !== 'param') continue;

        const parsed = parseParamTag(tag.body);
        if (!parsed) {
            conflict(`${file} — ${docgen.displayName} : balise @param illisible (« ${collapse(tag.body).slice(0, 60)}… »).`);
            continue;
        }

        const { name, prefixed } = readPropName(parsed.name);

        // Le conteneur `@param {Object} props` lui-même, et les champs imbriqués d'une
        // prop objet (`props.format.x`) : ni l'un ni l'autre n'est une ligne de table.
        if (name === null || name.includes('.')) continue;

        if (!known.has(name)) {
            // Un nom SOUS le namespace `props.` affirme l'existence d'une prop : s'il
            // n'est pas dans la signature, la docstring a survécu à la prop.
            if (prefixed && docgen.destructured) {
                conflict(`${file} — ${docgen.displayName} : \`${name}\` est documentée mais absente de la signature.`);
            }
            // Un nom PLAT qui ne correspond à rien documente autre chose qu'une prop —
            // le `ref` de TopbarToggleButton, typiquement. Silence volontaire.
            if (prefixed && !docgen.destructured) documented.set(name, parsed);
            continue;
        }

        documented.set(name, parsed);
    }

    // ===== ORDRE DES LIGNES =====
    // Celui de la signature quand elle existe : c'est l'ordre dans lequel l'auteur a
    // pensé le composant, et les props obligatoires y viennent naturellement en tête.
    const names = docgen.destructured ? signature : [...documented.keys()];

    const props = names.map((name) => {
        const parsed = documented.get(name) ?? null;
        const fromCode = docgen.props?.[name]?.defaultValue?.value ?? null;
        const fromDoc = parsed?.defaultValue ?? null;

        if (fromCode !== null && fromDoc !== null && collapse(fromCode) !== collapse(fromDoc)) {
            conflict(`${file} — ${docgen.displayName} : \`${name}\` vaut \`${fromCode}\` par défaut, la docstring annonce \`${fromDoc}\`.`);
        }

        return {
            name,
            type: parsed?.type ?? null,
            // Obligatoire = ni valeur par défaut dans le code, ni crochets dans la
            // docstring. Une prop non documentée et sans défaut est donc annoncée
            // obligatoire : c'est le défaut prudent, et il se voit.
            required: fromCode === null && !(parsed?.optional ?? false),
            defaultValue: fromCode ?? fromDoc,
            description: parsed?.description ?? '',
        };
    });

    return {
        record: {
            name: docgen.displayName,
            item: items.join(', '),
            file,
            description,
            restProps: Boolean(docgen.restProps),
            props,
        },
        undocumented: props.filter((prop) => prop.description === '').map((prop) => prop.name),
    };
};

// =================================================================
// 4. ÉMISSION
// =================================================================

async function main() {
    // react-docgen 8 est un module ES pur : `require()` lèverait ERR_REQUIRE_ESM.
    const { parse, builtinResolvers, defaultHandlers, ERROR_CODES } = await import('react-docgen');

    const resolver = new builtinResolvers.FindExportedDefinitionsResolver();
    const handlers = [makeSignatureHandler(), ...defaultHandlers];
    // `() => null` : la résolution des imports permettrait à react-docgen de suivre un
    // type déclaré dans un autre fichier. Il n'y en a aucun ici (pas de propTypes, pas
    // de TypeScript), et l'activer ferait lire tout le graphe de dépendances de chaque
    // composant pour rien.
    const importer = () => null;

    const components = {};
    const origins = new Map();
    const checklist = [];
    let fileCount = 0;
    let skipped = 0;

    for (const [file, items] of listComponentFiles()) {
        const source = fs.readFileSync(path.join(PROJECT_ROOT, file), 'utf8');
        let results;

        try {
            results = parse(source, { filename: file, resolver, handlers, importer });
        } catch (error) {
            // Un .jsx sans composant est légitime dans le registry : TabsContext.jsx est
            // un contexte, ToolIcon.jsx un dictionnaire de SVG. Rien à documenter, rien
            // à signaler.
            if (error.code === ERROR_CODES.MISSING_DEFINITION) {
                skipped += 1;
                continue;
            }
            throw error;
        }

        fileCount += 1;

        for (const docgen of results) {
            const name = docgen.displayName;
            if (!name) continue;

            // Deux composants de même nom se masqueraient l'un l'autre dans la table :
            // `<PropsTable name="…">` n'a que le nom pour les distinguer.
            if (origins.has(name)) {
                conflict(`Nom de composant en double : \`${name}\` est défini dans ${origins.get(name)} et dans ${file}. Le second est ignoré.`);
                continue;
            }
            origins.set(name, file);

            const { record, undocumented } = buildComponent(docgen, file, items);
            components[name] = record;

            if (undocumented.length > 0) checklist.push({ name, file, props: undocumented });
        }
    }

    const sorted = Object.fromEntries(Object.keys(components).sort().map((name) => [name, components[name]]));
    const propCount = Object.values(sorted).reduce((total, entry) => total + entry.props.length, 0);
    const undocumentedCount = checklist.reduce((total, entry) => total + entry.props.length, 0);

    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify({
        $comment: 'Généré par scripts/build-props-doc.js — NE PAS ÉDITER À LA MAIN.',
        counts: {
            components: Object.keys(sorted).length,
            props: propCount,
            undocumented: undocumentedCount,
        },
        components: sorted,
    }, null, 2)}\n`, 'utf8');

    // ===== RAPPORT =====
    console.log(
        `${path.relative(PROJECT_ROOT, OUTPUT_PATH).replace(/\\/g, '/')} : `
        + `${Object.keys(sorted).length} composants, ${propCount} props `
        + `(${fileCount} fichiers analysés, ${skipped} sans composant).`,
    );

    if (checklist.length > 0) {
        console.log(`\nProps sans description — ${undocumentedCount} sur ${propCount} :`);
        for (const entry of checklist.sort((a, b) => b.props.length - a.props.length)) {
            console.log(`  ${entry.name} (${entry.file})`);
            console.log(`    ${entry.props.join(', ')}`);
        }
    }

    if (conflicts.length > 0) {
        console.log(`\nIncohérences entre le code et les docstrings — ${conflicts.length} :`);
        for (const message of conflicts) console.log(`  • ${message}`);

        if (STRICT) {
            console.error('\nÉchec : --strict refuse toute docstring en contradiction avec le code.');
            process.exitCode = 1;
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
