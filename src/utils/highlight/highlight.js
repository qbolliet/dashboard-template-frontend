// =================================================================
// HIGHLIGHT — coloration syntaxique sans dépendance, au runtime
// =================================================================
// Promue depuis src/features/table/utils/querySnippets.js, où elle ne servait qu'au
// panneau de code de la table. Second consommateur non lié : les blocs de code du site
// de documentation (src/features/docs/components/DocsCodeBlock/). La règle de promotion
// de CLAUDE.md s'applique, et `src/components/` ne peut de toute façon pas dépendre de
// `src/features/`.
//
// POURQUOI PAS shiki (ni prism, ni highlight.js) : le code du playground n'existe PAS au
// build — il est sérialisé à partir de l'état courant des contrôles. Il faut donc un
// coloriseur qui tourne dans le navigateur. Introduire shiki ne couvrirait que le cas
// figé (les exemples du registry) et ferait coexister DEUX coloriseurs aux rendus
// différents dans la même page. Celui-ci est volontairement approximatif : il colore des
// extraits courts que nous produisons nous-mêmes, ce n'est pas un analyseur syntaxique.
//
// DIFFÉRENCE AVEC LA VERSION D'ORIGINE — trois corrections, pas une simple copie :
//   1. UNE SEULE PASSE. La version d'origine enchaînait des `replace` successifs, et la
//      regex de chaînes rematchait les guillemets du balisage déjà injecté par la regex
//      de commentaires : `class="c"` produisait un <span> imbriqué dans un attribut.
//      Ici, une regex à alternation unique découpe la source en jetons, et le balisage
//      n'est ajouté qu'APRÈS, sur du texte déjà consommé.
//   2. ÉCHAPPEMENT COMPLET via escapeHtml (5 caractères) au lieu de trois `replace` qui
//      laissaient passer les guillemets et apostrophes.
//   3. CLASSES PRÉFIXÉES `hl-*`. Les lettres nues `.k .s .c .n` n'étaient tenables que
//      parce qu'un unique ancêtre les scopait ; ce contrat devient public en montant
//      dans src/utils/, et ce template est destiné à être installé chez des tiers.

// Importation des modules
import { escapeHtml } from '@/utils/html/escapeHtml';

// ── Fragments réutilisés entre langages ──
// Les motifs de chaîne gèrent l'échappement antislash : sans l'alternative `\\.`, un
// littéral tel que "il a dit \"non\"" se refermerait sur le guillemet échappé.
const DQ_STRING = String.raw`"(?:[^"\\\n]|\\.)*"`;
const SQ_STRING = String.raw`'(?:[^'\\\n]|\\.)*'`;
// Pas de String.raw ici : la forme à double backtick nécessaire pour encadrer un
// backtick littéral insérerait une espace de part et d'autre du motif.
const TEMPLATE_STRING = '`(?:[^`\\\\]|\\\\.)*`';

const JS_KEYWORDS = [
    'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'of', 'in', 'while',
    'async', 'await', 'import', 'from', 'export', 'default', 'class', 'extends', 'new',
    'try', 'catch', 'finally', 'throw', 'typeof', 'instanceof', 'null', 'undefined',
    'true', 'false',
];

const PYTHON_KEYWORDS = [
    'import', 'from', 'as', 'def', 'class', 'return', 'if', 'elif', 'else', 'for', 'in',
    'while', 'raise', 'with', 'try', 'except', 'finally', 'lambda', 'not', 'and', 'or',
    'None', 'True', 'False',
];

/**
 * Builds the keyword alternation of a language.
 *
 * @param {Array<string>} words - Reserved words to match on word boundaries.
 * @returns {string} A regex source fragment.
 */
const keywords = (words) => String.raw`\b(?:${words.join('|')})\b`;

// ── Règles par langage ──
// L'ORDRE EST SIGNIFIANT : la première alternative qui matche gagne. Commentaires et
// chaînes viennent donc toujours en tête — un mot-clé à l'intérieur d'un commentaire ne
// doit pas être coloré comme un mot-clé.
const JS_RULES = [
    { cls: 'hl-c', pattern: String.raw`//[^\n]*|/\*[\s\S]*?\*/` },
    { cls: 'hl-s', pattern: `${DQ_STRING}|${SQ_STRING}|${TEMPLATE_STRING}` },
    { cls: 'hl-k', pattern: keywords(JS_KEYWORDS) },
    { cls: 'hl-n', pattern: String.raw`\b\d+(?:\.\d+)?\b` },
];

const RULES = {
    js: JS_RULES,

    // JSX = JS + deux jetons propres au balisage, insérés AVANT les mots-clés.
    jsx: [
        JS_RULES[0],
        JS_RULES[1],
        // Balises de composant uniquement (`<Chart`, `</Chart`, `<F.Zoom`) : la majuscule
        // initiale distingue un composant d'une balise HTML, et c'est tout ce que produit
        // le sérialiseur.
        { cls: 'hl-t', pattern: String.raw`</?[A-Z][\w.]*` },
        // Nom d'attribut : identifiant COLLÉ à son `=`. Heuristique assumée — elle
        // distingue `x="age"` (attribut JSX, jamais espacé) de `const x = 1` (affectation,
        // toujours espacée par le formatage du dépôt).
        { cls: 'hl-a', pattern: String.raw`[a-zA-Z][\w-]*(?==)` },
        JS_RULES[2],
        JS_RULES[3],
    ],

    python: [
        { cls: 'hl-c', pattern: String.raw`#[^\n]*` },
        // Préfixes f/r/b et chaînes triples pris en charge : les extraits produits par
        // querySnippets.js utilisent des f-strings.
        { cls: 'hl-s', pattern: String.raw`[fbru]{0,2}(?:"""[\s\S]*?"""|'''[\s\S]*?'''|${DQ_STRING}|${SQ_STRING})` },
        { cls: 'hl-k', pattern: keywords(PYTHON_KEYWORDS) },
        { cls: 'hl-n', pattern: String.raw`\b\d+(?:\.\d+)?\b` },
    ],

    bash: [
        { cls: 'hl-c', pattern: String.raw`#[^\n]*` },
        { cls: 'hl-s', pattern: `${DQ_STRING}|'[^']*'` },
        { cls: 'hl-k', pattern: keywords(['curl', 'export', 'cd', 'echo', 'cat', 'npm', 'npx']) },
        // Options courtes et longues — c'est ce que la version d'origine colorait en `.n`.
        { cls: 'hl-n', pattern: String.raw`--?[a-zA-Z][\w-]*` },
    ],
};

// Alias acceptés, pour rester compatible avec les appels existants de la feature table
// (`javascript`, `py`, `curl`) et avec les langages nommés dans la documentation.
const LANG_ALIASES = {
    javascript: 'js', js: 'js',
    jsx: 'jsx', tsx: 'jsx',
    python: 'python', py: 'python',
    bash: 'bash', sh: 'bash', shell: 'bash', curl: 'bash',
};

// Les scanners sont construits une fois par langage puis mémorisés : une regex à
// alternation coûte cher à compiler, et le playground rappelle highlight() à CHAQUE
// changement de contrôle.
const SCANNERS = new Map();

/**
 * Returns the combined scanner of a rule set, with one capturing group per rule.
 *
 * @param {string} lang - Normalized language key.
 * @returns {RegExp} A global regex holding one group per rule, in rule order.
 */
const scannerFor = (lang) => {
    if (!SCANNERS.has(lang)) {
        const source = RULES[lang].map((rule) => `(${rule.pattern})`).join('|');
        SCANNERS.set(lang, new RegExp(source, 'g'));
    }
    return SCANNERS.get(lang);
};

/**
 * Highlights a code snippet as an HTML string, dependency-free, at runtime.
 *
 * Emits `<span class="hl-…">` wrappers around comments (`hl-c`), strings (`hl-s`),
 * keywords (`hl-k`), numbers and CLI flags (`hl-n`), JSX component tags (`hl-t`) and
 * JSX attribute names (`hl-a`). Every character outside a token is escaped, so the
 * result stays safe to inject even though callers only pass code they built themselves.
 *
 * An unknown language is not an error: the code comes back escaped but uncolored.
 *
 * @param {string} code - Source code to highlight.
 * @param {'js'|'javascript'|'jsx'|'tsx'|'python'|'py'|'bash'|'sh'|'shell'|'curl'} lang -
 *   Language hint; aliases accepted.
 * @returns {string} HTML string, meant for `dangerouslySetInnerHTML`.
 */
export const highlight = (code, lang) => {
    const source = code ?? '';
    const key = LANG_ALIASES[lang];
    if (!key) return escapeHtml(source);

    let out = '';
    let cursor = 0;

    for (const match of source.matchAll(scannerFor(key))) {
        // Le groupe capturant défini désigne la règle qui a matché : les groupes sont
        // déclarés dans l'ordre de RULES[key], décalés de 1 (match[0] = le texte entier).
        const groupIndex = match.findIndex((group, index) => index > 0 && group !== undefined);
        if (groupIndex < 1) continue;

        out += escapeHtml(source.slice(cursor, match.index));
        out += `<span class="${RULES[key][groupIndex - 1].cls}">${escapeHtml(match[0])}</span>`;
        cursor = match.index + match[0].length;
    }

    return out + escapeHtml(source.slice(cursor));
};
