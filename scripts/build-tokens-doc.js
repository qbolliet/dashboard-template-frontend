#!/usr/bin/env node

// =================================================================
// RÉFÉRENCE DES TOKENS — src/**/*.scss → public/tokens.json
// =================================================================
// Balaye la cascade de propriétés personnalisées du dépôt et émet le JSON consommé par
// <TokenReference> (docs/content/fondations/tokens.mdx). Même famille que
// scripts/build-docs-index.js et scripts/build-search-index.js : CommonJS, sans
// dépendance, câblé dans `dev`, `prebuild` et `verify`.
//
// SORTIE DANS public/ ET NON DANS UN MODULE JS : la page charge le fichier par `fetch`
// (via withBasePath, comme useSearchIndex), donc ces ~900 entrées et leurs chaînes de
// dérivation ne pèsent dans aucun bundle. Le fichier est COMMITÉ, comme
// public/search-index.json — d'où l'absence de tout horodatage dans la sortie, qui
// produirait un diff à chaque build.
//
// ⚠️ CE PARSEUR LIT DU SCSS, PAS DU CSS. Trois pièges, tous rencontrés pour de vrai :
//
//   1. LES COMMENTAIRES NE PILOTENT PAS LE PARSEUR. `StatCard/_colors.scss` porte en
//      en-tête la phrase « Aucun bloc [data-theme="dark"] : … ». Un grep naïf le compte
//      donc parmi les fichiers à surcharge sombre, et se trompe. Les commentaires sont
//      retirés AVANT toute analyse — même précaution, et même raison, que dans
//      scripts/check-palette-sync.js.
//   2. LES BLOCS SONT IMBRIQUÉS. `@include breakpoint-down('medium') { :root { … } }`
//      redéclare des tokens à un palier d'écran. Les ignorer fausserait l'exemple phare
//      de la documentation : --header-control-size vaut 2.25rem au-dessus de 1149px et
//      var(--spacing-3xl) en dessous.
//   3. LES NOMS PEUVENT ÊTRE INTERPOLÉS. typography.scss génère --breakpoint-* par
//      `@each` sur $breakpoints-down-px. La boucle est dépliée en lisant le map à sa
//      source ; toute AUTRE interpolation est émise avec `generated: true` et un
//      avertissement, jamais perdue en silence.

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public/tokens.json');
const BREAKPOINTS_PATH = path.join(SRC_DIR, 'styles/utils/breakpoints.scss');

// `--strict` fait sortir en 1 dès qu'un conflit est détecté. Câblé dans `verify`
// seulement : `dev` et `prebuild` ne doivent pas casser sur un point de documentation.
const STRICT = process.argv.includes('--strict');

const REM_IN_PX = 16;
const MAX_DEPTH = 12;

const warnings = [];

/**
 * Records a non-fatal problem, reported once at the end of the run.
 *
 * @param {string} message - What went wrong.
 * @returns {void}
 */
const warn = (message) => { warnings.push(message); };

// =================================================================
// 1. LECTURE DES FICHIERS
// =================================================================

/**
 * Recursively lists every .scss file under a directory.
 *
 * @param {string} dir - Directory to walk.
 * @param {string} [prefix=''] - Accumulated path relative to the walk root.
 * @returns {string[]} Slash-separated paths relative to the walk root.
 */
const listScss = (dir, prefix = '') => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    return entries.flatMap((entry) => {
        // Séparateur normalisé sur '/' dès la construction : tout le script raisonne en
        // chemins POSIX, y compris ceux qu'il émet dans le JSON.
        const relative = prefix ? `${prefix}/${entry.name}` : entry.name;

        if (entry.isDirectory()) return listScss(path.join(dir, entry.name), relative);
        return entry.name.endsWith('.scss') ? [relative] : [];
    });
};

/**
 * Strips SCSS comments from a source file.
 *
 * Block comments first, then line comments. The `//` of a line comment must not be
 * preceded by a colon, otherwise a `url(https://…)` would be truncated mid-value.
 *
 * @param {string} source - Raw file content.
 * @returns {string} The same source, comments blanked out.
 */
const stripComments = (source) => source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

/**
 * Reads the `$breakpoints-down-px` Sass map, source of truth for the screen thresholds.
 *
 * @returns {Object<string, number>} Breakpoint name → max-width in pixels.
 */
const readBreakpoints = () => {
    const source = stripComments(fs.readFileSync(BREAKPOINTS_PATH, 'utf8'));
    const block = /\$breakpoints-down-px\s*:\s*\(([\s\S]*?)\)\s*;/.exec(source);
    if (!block) {
        warn(`${path.relative(PROJECT_ROOT, BREAKPOINTS_PATH)} : map $breakpoints-down-px introuvable, les tokens --breakpoint-* seront manquants.`);
        return {};
    }

    const map = {};
    for (const entry of block[1].matchAll(/'([\w-]+)'\s*:\s*(\d+)/g)) map[entry[1]] = Number(entry[2]);
    return map;
};

const BREAKPOINTS = readBreakpoints();

// =================================================================
// 2. ANALYSE D'UN FICHIER
// =================================================================

/**
 * Describes the media context a declaration sits in, in human-readable form.
 *
 * @param {string} raw - The at-rule text, e.g. `@include breakpoint-down('medium')`.
 * @returns {{raw: string, label: string}} The context and a readable label.
 */
const describeMedia = (raw) => {
    const down = /breakpoint-down\(\s*['"]([\w-]+)['"]\s*\)/.exec(raw);
    if (down && BREAKPOINTS[down[1]] !== undefined) {
        return { raw, label: `≤ ${BREAKPOINTS[down[1]]}px (${down[1]})` };
    }

    const up = /breakpoint\(\s*['"]([\w-]+)['"]\s*\)/.exec(raw);
    if (up) {
        // Les bornes hautes commencent juste après la fin du palier précédent (cf. le
        // « + 1 » de $breakpoints-up-px) ; on retrouve le seuil par le même décalage.
        const previous = { medium: 'small', large: 'medium', xlarge: 'large' }[up[1]];
        const px = BREAKPOINTS[previous];
        if (px !== undefined) return { raw, label: `≥ ${px + 1}px (${up[1]})` };
    }

    return { raw, label: raw.replace(/^@\w+\s*/, '') };
};

/**
 * Tells whether a selector declares tokens on the document root.
 *
 * `:root, [data-theme]` is the repository's base form: the second selector is what makes
 * a token overridable on any subtree (cf. PreviewFrame.jsx). Both halves are root forms.
 *
 * @param {string} selector - The selector text.
 * @returns {boolean} True when every comma-separated part is a root form.
 */
const isRootSelector = (selector) => selector
    .split(',')
    .every((part) => /^(:root|\[data-theme\])$/.test(part.trim()));

/**
 * Tells whether a selector is the dark-theme override block.
 *
 * @param {string} selector - The selector text.
 * @returns {boolean} True when every comma-separated part targets `[data-theme="dark"]`.
 */
const isDarkSelector = (selector) => selector
    .split(',')
    .every((part) => /^\[data-theme=["']dark["']\]$/.test(part.trim()));

/**
 * Expands an `@each` loop over the breakpoints map, the only generated declaration
 * of the repository.
 *
 * @param {string} loop - The `@each` header text.
 * @param {string} name - Declaration name, possibly interpolated.
 * @param {string} value - Declaration value, possibly interpolated.
 * @returns {Array<{name: string, value: string}>|null} The expanded declarations, or
 *   null when the loop is not one this script knows how to unroll.
 */
const expandEach = (loop, name, value) => {
    const header = /@each\s+\$([\w-]+)\s*,\s*\$([\w-]+)\s+in\s+[\w.]*\$breakpoints-down-px/.exec(loop);
    if (!header) return null;

    const [, keyVar, valueVar] = header;
    const substitute = (text, key, px) => text
        .replace(new RegExp(`#\\{\\s*\\$${keyVar}\\s*\\}`, 'g'), key)
        .replace(new RegExp(`#\\{\\s*\\$${valueVar}\\s*\\}`, 'g'), String(px));

    return Object.entries(BREAKPOINTS).map(([key, px]) => ({
        name: substitute(name, key, px),
        value: substitute(value, key, px),
    }));
};

/**
 * Parses one SCSS file into a flat list of custom-property declarations.
 *
 * Walks the source character by character while keeping a stack of the block openers, so
 * that a declaration always knows the selector AND the media query it sits in. `#{…}`
 * interpolation is consumed as plain text: its braces must not be mistaken for a block.
 *
 * @param {string} file - Project-relative path, used in the emitted records.
 * @param {string} source - Raw file content.
 * @returns {Array<Object>} One record per declaration.
 */
const parseFile = (file, source) => {
    const code = stripComments(source);
    const declarations = [];
    const stack = [];

    let buffer = '';

    /**
     * Files one buffered statement, if it declares a custom property.
     *
     * @returns {void}
     */
    const flush = () => {
        const statement = buffer.trim();
        buffer = '';

        const match = /^(--[\w-]+|--[\w-]*#\{[\s\S]*?\}[\w-]*)\s*:\s*([\s\S]+)$/.exec(statement);
        if (!match) return;

        const rawName = match[1];
        // Espaces normalisés : un calc() long est écrit sur plusieurs lignes dans le
        // SCSS (cf. --nav-row-padding-y), et ces retours à la ligne n'ont aucun sens
        // dans une cellule de tableau.
        const rawValue = match[2].replace(/\s+/g, ' ').trim();

        // Contexte : le sélecteur le plus proche, et toutes les media queries traversées.
        const selector = [...stack].reverse().find((entry) => !entry.startsWith('@')) ?? ':root';
        const medias = stack.filter((entry) => /^@(media|include\s+breakpoint)/.test(entry));
        const loop = stack.find((entry) => entry.startsWith('@each'));

        const pairs = rawName.includes('#{')
            ? expandEach(loop ?? '', rawName, rawValue)
            : [{ name: rawName, value: rawValue }];

        if (!pairs) {
            warn(`${file} : déclaration à nom interpolé non dépliée « ${rawName} » — émise telle quelle.`);
            declarations.push({ file, name: rawName, value: rawValue, selector, medias, generated: true });
            return;
        }

        for (const pair of pairs) {
            declarations.push({
                file,
                name: pair.name,
                value: pair.value,
                selector,
                medias: medias.map(describeMedia),
                generated: rawName.includes('#{') || undefined,
            });
        }
    };

    for (let i = 0; i < code.length; i += 1) {
        const char = code[i];

        // Interpolation : recopiée telle quelle, ses accolades n'ouvrent aucun bloc.
        if (char === '#' && code[i + 1] === '{') {
            const end = code.indexOf('}', i);
            if (end === -1) break;
            buffer += code.slice(i, end + 1);
            i = end;
            continue;
        }

        if (char === '{') {
            stack.push(buffer.trim().replace(/\s+/g, ' '));
            buffer = '';
        } else if (char === '}') {
            flush();
            stack.pop();
        } else if (char === ';') {
            flush();
        } else {
            buffer += char;
        }
    }

    return declarations;
};

// =================================================================
// 3. NIVEAU, FEATURE, COMPOSANT — déduits du chemin
// =================================================================

/**
 * Classifies a declaring file into a cascade level and its owning scope.
 *
 * @param {string} file - Project-relative path of the file.
 * @returns {{level: number, feature: (string|null), component: (string|null)}} Its place
 *   in the four-level cascade.
 */
const classify = (file) => {
    if (file.startsWith('src/styles/globals/primitives/')) return { level: 1, feature: null, component: null };
    if (file.startsWith('src/styles/globals/')) return { level: 2, feature: null, component: null };

    const feature = /^src\/features\/([\w-]+)\//.exec(file);
    const component = /\/([\w-]+)\/_(tokens|colors)\.scss$/.exec(file);

    if (feature) {
        // Niveau 3 = _tokens/_colors À LA RACINE de la feature ; tout ce qui est sous
        // components/ appartient à un composant, donc au niveau 4.
        const atRoot = new RegExp(`^src/features/${feature[1]}/_(tokens|colors)\\.scss$`).test(file);
        return {
            level: atRoot ? 3 : 4,
            feature: feature[1],
            component: atRoot ? null : (component ? component[1] : null),
        };
    }

    // src/components/** : la cascade y saute le niveau feature (cf. §4.1).
    const shared = /^src\/components\/(?:[\w-]+\/)*([\w-]+)\/_(tokens|colors)\.scss$/.exec(file);
    return { level: 4, feature: 'components', component: shared ? shared[1] : null };
};

/**
 * Tells whether a file belongs to the PUBLISHED token surface.
 *
 * The other `.scss` files also declare custom properties (≈190 of them, e.g.
 * `--nav-parent-pad-x-left` in SidebarGroup.scss), but those are local to a rule rather
 * than part of the cascade a third party overrides. They are read anyway — silently —
 * so that derivation chains do not dead-end on them.
 *
 * @param {string} file - Project-relative path of the file.
 * @returns {boolean} True when the file's tokens are listed in the reference.
 */
const isPublished = (file) => file.startsWith('src/styles/globals/')
    || /\/_(tokens|colors)\.scss$/.test(file);

// =================================================================
// 4. VALEURS — références, calcul, nature
// =================================================================

/**
 * Extracts the top-level `var()` references of a value.
 *
 * Hand-rolled rather than done with a regex: `var(--a, var(--b))` nests, and the
 * fallback form is deliberate in the navigation tokens — the desktop value of
 * `--sidebar-toggle-size` comes from the fallback, so losing it would empty the chain
 * of its point.
 *
 * @param {string} value - A declaration value.
 * @returns {Array<{name: string, fallback: (string|null)}>} The references, in order.
 */
const parseVarRefs = (value) => {
    const refs = [];

    for (let i = value.indexOf('var('); i !== -1; i = value.indexOf('var(', i + 1)) {
        let depth = 0;
        let end = -1;

        for (let j = i + 3; j < value.length; j += 1) {
            if (value[j] === '(') depth += 1;
            else if (value[j] === ')') {
                depth -= 1;
                if (depth === 0) { end = j; break; }
            }
        }
        if (end === -1) break;

        const inner = value.slice(i + 4, end);
        // Virgule de PREMIER niveau uniquement : celle de `var(--a, var(--b, 1rem))`
        // sépare le nom du repli, celles imbriquées appartiennent au repli.
        let comma = -1;
        let nested = 0;
        for (let j = 0; j < inner.length; j += 1) {
            if (inner[j] === '(') nested += 1;
            else if (inner[j] === ')') nested -= 1;
            else if (inner[j] === ',' && nested === 0) { comma = j; break; }
        }

        const name = (comma === -1 ? inner : inner.slice(0, comma)).trim();
        const fallback = comma === -1 ? null : inner.slice(comma + 1).trim();
        if (name.startsWith('--')) refs.push({ name, fallback });
    }

    return refs;
};

/**
 * Evaluates a length expression to pixels.
 *
 * Deliberately conservative: it returns null the moment it meets anything it cannot
 * reduce with certainty (percentages, colours, shadows, unknown units). The page then
 * simply shows nothing rather than a wrong number.
 *
 * @param {string} expression - A value with every `var()` already substituted.
 * @returns {{value: number, unit: string}|null} The reduced quantity, or null.
 */
const evaluate = (expression) => {
    // `calc()` imbriqué : la parenthèse suffit, les règles de priorité sont les mêmes.
    const source = expression.replace(/calc\(/g, '(').replace(/!important/g, '').trim();
    const tokens = source.match(/\d*\.?\d+[a-z%]*|[()+\-*/]/g);
    if (!tokens || tokens.join('').length !== source.replace(/\s+/g, '').length) return null;

    let cursor = 0;

    /**
     * Reads a parenthesised group or a single quantity.
     *
     * @returns {{value: number, unit: string}|null} The parsed quantity.
     */
    const readAtom = () => {
        const token = tokens[cursor];
        if (token === undefined) return null;

        if (token === '(') {
            cursor += 1;
            const inner = readSum();
            if (tokens[cursor] !== ')') return null;
            cursor += 1;
            return inner;
        }

        // Signe unaire : `calc(-1 * var(--x))` et les valeurs négatives.
        if (token === '-' || token === '+') {
            cursor += 1;
            const atom = readAtom();
            return atom && { value: token === '-' ? -atom.value : atom.value, unit: atom.unit };
        }

        const quantity = /^(\d*\.?\d+)([a-z%]*)$/.exec(token);
        if (!quantity) return null;
        cursor += 1;

        const number = Number(quantity[1]);
        const unit = quantity[2];

        if (unit === '' ) return { value: number, unit: '' };
        if (unit === 'px') return { value: number, unit: 'px' };
        // `em` est ramené au rem : la documentation affiche une taille de référence, et
        // la taille de police de l'ancêtre n'est pas connaissable ici.
        if (unit === 'rem' || unit === 'em') return { value: number * REM_IN_PX, unit: 'px' };
        return null;
    };

    /**
     * Reads a product or quotient.
     *
     * @returns {{value: number, unit: string}|null} The parsed quantity.
     */
    const readProduct = () => {
        let left = readAtom();

        while (left && (tokens[cursor] === '*' || tokens[cursor] === '/')) {
            const operator = tokens[cursor];
            cursor += 1;
            const right = readAtom();
            if (!right) return null;

            // Une longueur ne se multiplie que par un nombre sans unité.
            if (operator === '*' && left.unit && right.unit) return null;
            if (operator === '/' && right.unit) return null;
            if (operator === '/' && right.value === 0) return null;

            left = {
                value: operator === '*' ? left.value * right.value : left.value / right.value,
                unit: left.unit || right.unit,
            };
        }

        return left;
    };

    /**
     * Reads a sum or difference.
     *
     * @returns {{value: number, unit: string}|null} The parsed quantity.
     */
    function readSum() {
        let left = readProduct();

        while (left && (tokens[cursor] === '+' || tokens[cursor] === '-')) {
            const operator = tokens[cursor];
            cursor += 1;
            const right = readProduct();
            if (!right) return null;

            // Addition hétérogène : seule une valeur nulle peut changer d'unité.
            if (left.unit !== right.unit && left.value !== 0 && right.value !== 0) return null;

            left = {
                value: operator === '+' ? left.value + right.value : left.value - right.value,
                unit: left.unit || right.unit,
            };
        }

        return left;
    }

    const result = readSum();
    return result && cursor === tokens.length ? result : null;
};

/**
 * Formats a reduced quantity for display.
 *
 * @param {{value: number, unit: string}|null} quantity - Output of `evaluate`.
 * @returns {string|null} A display string such as `'24px'`, or null.
 */
const formatQuantity = (quantity) => {
    if (!quantity) return null;
    // Trois décimales suffisent et évitent les 15,999999999999998 de l'arithmétique
    // flottante ; `Number()` retire ensuite les zéros de queue.
    const rounded = Number(quantity.value.toFixed(3));
    return `${rounded}${quantity.unit}`;
};

const HSL_TRIPLET = /^-?\d*\.?\d+\s+\d*\.?\d+%\s+\d*\.?\d+%(\s*\/\s*[\d.%]+)?$/;

/**
 * Infers what a token holds, from its fully resolved literal value.
 *
 * The kind is computed here rather than in the page: the parser is the only place that
 * knows the end of the derivation chain.
 *
 * @param {string} name - Token name, used only as a last-resort hint.
 * @param {string|null} literal - The resolved literal, `var()` already followed.
 * @param {{value: number, unit: string}|null} quantity - Its reduced quantity, if any.
 * @returns {string} One of color, length, duration, number, shadow, easing, other.
 */
const inferKind = (name, literal, quantity) => {
    const value = (literal ?? '').trim();

    if (HSL_TRIPLET.test(value)) return 'color';
    if (/^#[0-9a-f]{3,8}$/i.test(value)) return 'color';
    if (/^(hsla?|rgba?|oklch|color)\(/i.test(value)) return 'color';
    if (/cubic-bezier|^(ease|linear|steps)/.test(value)) return 'easing';
    if (/^-?\d*\.?\d+m?s$/.test(value)) return 'duration';
    if (/(inset\s|rgba?\()/.test(value) && /shadow/.test(name)) return 'shadow';
    if (quantity && quantity.unit === 'px') return 'length';
    if (quantity && quantity.unit === '') return 'number';
    if (/^\d*\.?\d+%$/.test(value)) return 'length';

    return 'other';
};

// =================================================================
// 5. ASSEMBLAGE
// =================================================================

/**
 * Builds the whole reference and writes it out.
 *
 * @returns {void}
 */
const main = () => {
    if (!fs.existsSync(SRC_DIR)) {
        console.error('build:tokens : src/ est introuvable.');
        process.exit(1);
    }

    // ---------------------------------------------------------------
    // Lecture et regroupement par nom de propriété
    // ---------------------------------------------------------------
    const entries = new Map();

    for (const relative of listScss(SRC_DIR)) {
        const file = `src/${relative}`;
        const published = isPublished(file);

        for (const declaration of parseFile(file, fs.readFileSync(path.join(SRC_DIR, relative), 'utf8'))) {
            if (!entries.has(declaration.name)) {
                entries.set(declaration.name, {
                    name: declaration.name,
                    light: null,
                    dark: null,
                    responsive: [],
                    scoped: [],
                    files: new Set(),
                    published: false,
                    generated: false,
                });
            }

            const entry = entries.get(declaration.name);
            const { selector, medias, value } = declaration;

            if (published) {
                entry.published = true;
                entry.files.add(declaration.file);
                if (declaration.generated) entry.generated = true;
            }

            if (medias.length > 0 && isRootSelector(selector)) {
                entry.responsive.push({ query: medias.map((m) => m.label).join(' et '), value, file: declaration.file });
            } else if (medias.length > 0 && isDarkSelector(selector)) {
                entry.responsive.push({ query: `${medias.map((m) => m.label).join(' et ')} — thème sombre`, value, file: declaration.file });
            } else if (isDarkSelector(selector)) {
                entry.dark = { value, file: declaration.file };
            } else if (isRootSelector(selector)) {
                // Première déclaration gagnante : les fichiers publiés sont lus avant
                // qu'une redéclaration locale ne puisse l'écraser (cf. `scoped`).
                if (!entry.light) entry.light = { value, file: declaration.file };
            } else {
                entry.scoped.push({ selector, value, file: declaration.file });
            }
        }
    }

    // ---------------------------------------------------------------
    // Résolution des chaînes de dérivation
    // ---------------------------------------------------------------

    /**
     * Reads the effective declaration of a token, for a given theme.
     *
     * The theme matters all the way down the chain, not just at the first step:
     * `--color-surface: var(--color-gray-50)` is declared ONCE, and it is
     * `--color-gray-50` that flips under `[data-theme="dark"]`. Resolving the dark value
     * of `--color-surface` against the light `--color-gray-50` would report the light
     * colour as the dark one — plausible enough to go unnoticed, and wrong.
     *
     * @param {string} name - Token name.
     * @param {'light'|'dark'} [theme='light'] - Which side of the cascade to read.
     * @returns {{value: string, file: string}|null} Its declaration.
     */
    const declarationOf = (name, theme = 'light') => {
        const entry = entries.get(name);
        if (!entry) return null;
        if (theme === 'dark' && entry.dark) return entry.dark;
        return entry.light ?? entry.scoped[0] ?? entry.responsive[0] ?? null;
    };

    /**
     * Follows a value down to its literal, substituting every `var()` on the way.
     *
     * @param {string} value - The value to resolve.
     * @param {number} depth - Current recursion depth.
     * @param {Set<string>} seen - Names already visited, to break reference cycles.
     * @param {'light'|'dark'} [theme='light'] - Which side of the cascade to follow.
     * @returns {string|null} The literal value, or null when it cannot be resolved.
     */
    const resolveLiteral = (value, depth, seen, theme = 'light') => {
        if (depth > MAX_DEPTH) return null;

        const refs = parseVarRefs(value);
        if (refs.length === 0) return value;

        let resolved = value;
        for (const ref of refs) {
            if (seen.has(ref.name)) return null;

            const declaration = declarationOf(ref.name, theme);
            // Repli de `var(--x, y)` : c'est la valeur réellement appliquée tant que le
            // token n'est pas défini, et c'est le cas au desktop pour les tokens de nav.
            const next = declaration ? declaration.value : ref.fallback;
            if (next === null || next === undefined) return null;

            const literal = resolveLiteral(next, depth + 1, new Set([...seen, ref.name]), theme);
            if (literal === null) return null;

            // Remplacement TEXTUEL de l'appel var() complet par sa valeur, pour que le
            // calc() englobant reste évaluable d'un seul tenant.
            const call = new RegExp(`var\\(\\s*${ref.name}\\s*(?:,[^)]*(?:\\([^)]*\\)[^)]*)*)?\\)`);
            resolved = resolved.replace(call, literal);
        }

        return resolved;
    };

    /**
     * Builds the derivation chain of a token, as a spine with branches.
     *
     * A single-reference value continues the spine — that is the linear reading the
     * documentation shows: `--sidebar-toggle-size → --nav-toggle-size → calc(…) → 24px`.
     * A value holding SEVERAL references stops the spine and opens one branch per
     * reference, rather than silently picking one of them.
     *
     * @param {string} value - Value to walk.
     * @param {number} depth - Current recursion depth.
     * @param {Set<string>} seen - Names already visited.
     * @returns {Array<Object>} Ordered steps of the chain.
     */
    const buildChain = (value, depth, seen) => {
        if (depth > MAX_DEPTH) return [];

        const refs = parseVarRefs(value);
        if (refs.length === 0) return [];

        if (refs.length === 1) {
            const ref = refs[0];
            if (seen.has(ref.name)) return [{ name: ref.name, cycle: true }];

            const declaration = declarationOf(ref.name);
            const next = declaration ? declaration.value : ref.fallback;

            if (next === null || next === undefined) {
                return [{ name: ref.name, unresolved: true, fallback: ref.fallback }];
            }

            const classified = declaration ? classify(declaration.file) : null;
            const step = {
                name: ref.name,
                value: next,
                file: declaration ? declaration.file : null,
                level: classified ? classified.level : null,
                // Valeur venue du repli de var() : le token n'est pas déclaré à ce palier,
                // et c'est ce repli qui s'applique réellement.
                fromFallback: declaration ? undefined : true,
            };

            return [step, ...buildChain(next, depth + 1, new Set([...seen, ref.name]))];
        }

        return [{
            branches: refs.map((ref) => {
                const declaration = declarationOf(ref.name);
                const next = declaration ? declaration.value : ref.fallback;
                const classified = declaration ? classify(declaration.file) : null;

                return {
                    name: ref.name,
                    value: next ?? null,
                    file: declaration ? declaration.file : null,
                    level: classified ? classified.level : null,
                    chain: next === null || next === undefined || seen.has(ref.name)
                        ? []
                        : buildChain(next, depth + 1, new Set([...seen, ref.name])),
                };
            }),
        }];
    };

    // ---------------------------------------------------------------
    // Émission
    // ---------------------------------------------------------------
    const tokens = [];
    const conflicts = [];
    const darkOverridesBelowLevel2 = [];

    for (const entry of [...entries.values()].sort((a, b) => a.name.localeCompare(b.name))) {
        if (!entry.published) continue;

        const declaration = entry.light ?? entry.responsive[0] ?? entry.dark;
        if (!declaration) continue;

        const { level, feature, component } = classify(declaration.file);
        const files = [...entry.files];

        if (files.length > 1) conflicts.push({ name: entry.name, files });

        const literal = resolveLiteral(declaration.value, 0, new Set([entry.name]));
        const quantity = literal === null ? null : evaluate(literal);
        // Le token peut n'avoir aucune déclaration sombre PROPRE et basculer quand même,
        // parce qu'une primitive plus bas dans sa chaîne bascule (c'est le cas normal, et
        // le but recherché). On résout donc toujours la branche sombre, qu'il y ait ou
        // non une redéclaration locale — c'est elle qui alimente la pastille « sombre ».
        const darkSource = entry.dark ? entry.dark.value : declaration.value;
        const darkLiteral = resolveLiteral(darkSource, 0, new Set([entry.name]), 'dark');

        if (entry.dark && level >= 3) {
            darkOverridesBelowLevel2.push({ name: entry.name, file: entry.dark.file, level, feature });
        }

        tokens.push({
            name: entry.name,
            level,
            scope: declaration.file,
            feature,
            component,
            kind: inferKind(entry.name, literal, quantity),
            light: entry.light ? entry.light.value : null,
            lightLiteral: literal,
            dark: entry.dark ? entry.dark.value : null,
            darkLiteral,
            computed: formatQuantity(quantity),
            responsive: entry.responsive,
            scoped: entry.scoped.length > 0 ? entry.scoped : undefined,
            chain: buildChain(declaration.value, 0, new Set([entry.name])),
            generated: entry.generated || undefined,
        });
    }

    const byLevel = tokens.reduce((counts, token) => {
        counts[token.level] = (counts[token.level] ?? 0) + 1;
        return counts;
    }, {});

    const features = [...new Set(tokens.map((token) => token.feature).filter(Boolean))].sort();

    const payload = {
        // Pas d'horodatage : ce fichier est commité, un champ variable produirait un diff
        // à chaque exécution du script.
        counts: {
            tokens: tokens.length,
            files: new Set(tokens.map((token) => token.scope)).size,
            byLevel,
        },
        levels: [
            { level: 1, label: 'Primitive', hint: 'Triplets HSL bruts. Aucun var(), aucun alias.' },
            { level: 2, label: 'Sémantique', hint: 'Rôles, tailles, espacements, rayons, ombres, z-index.' },
            { level: 3, label: 'Feature', hint: 'Préfixe --[feature]-*, mutualisé entre les composants d’une feature.' },
            { level: 4, label: 'Composant', hint: 'Préfixe --[composant]-*, valeur par défaut = token de feature.' },
        ],
        features,
        conflicts,
        darkOverridesBelowLevel2,
        tokens,
    };

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 0)}\n`, 'utf8');

    // ---------------------------------------------------------------
    // Rapport
    // ---------------------------------------------------------------
    for (const message of warnings) console.warn(`build:tokens : ${message}`);

    if (conflicts.length > 0) {
        console.warn(`build:tokens : ${conflicts.length} propriété(s) déclarée(s) dans plusieurs fichiers —`);
        for (const conflict of conflicts) console.warn(`  ${conflict.name} : ${conflict.files.join(', ')}`);
    }

    console.log(
        `build:tokens : ${tokens.length} token(s) sur ${payload.counts.files} fichier(s) `
        + `(niveaux ${JSON.stringify(byLevel)}), ${conflicts.length} conflit(s) → public/tokens.json`,
    );

    // Le conflit est un test de non-régression de l'unification des deux systèmes de
    // couleurs (P0.2) : il doit rester à zéro. Il ne casse la boucle de dev pour autant.
    if (STRICT && conflicts.length > 0) process.exit(1);
};

main();
