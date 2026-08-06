// =================================================================
// SERIALIZE JSX — un état de contrôles → du code JSX collable
// =================================================================
// Sérialiseur GÉNÉRIQUE, un seul pour tous les composants documentés. Un sérialiseur par
// composant serait ingérable sur une trentaine d'items de registry, et divergerait du
// rendu au premier oubli.
//
// Même intention et mêmes conventions que buildQueryDocument() dans
// src/features/table/utils/querySnippets.js, qui sérialise déjà un état d'interface en
// document GraphQL affichable : lignes assemblées puis `join`, et rien d'écrit qui ne
// soit réellement actif.
//
// DEUX RÈGLES NON NÉGOCIABLES SUR LA SORTIE
//   1. Les props à leur valeur par DÉFAUT sont omises. Sans ça, l'utilisateur copie
//      quinze props dont deux l'intéressent, et ne sait plus lesquelles comptent.
//   2. Le code inclut ses IMPORTS et son JEU DE DONNÉES (via le `scaffold`). Un fragment
//      `<Chart x="age" />` non collable dans un fichier vierge rate sa cible.
//
// INVARIANT DE CONCEPTION — on sérialise exactement ce qu'on rend. Les contrôles d'un
// playground ne pilotent pas toujours des props directement (ceux de /test-chart
// construisaient des descripteurs de marques) : le schéma passe donc par un `toProps`,
// et c'est SON résultat qui est à la fois rendu et sérialisé. La règle 1 s'applique
// alors dans l'espace des props, en comparant à `toProps(défauts)`.

// Marqueur d'expression : une valeur qui doit apparaître VERBATIM dans le code (un
// identifiant, un appel de fabrique) tout en ayant une contrepartie réelle à rendre.
// Une chaîne ne suffirait pas — elle sortirait entre guillemets.
const EXPR_TAG = '@@jsxExpr';

/**
 * Tags a value as a raw JS expression: `code` is written to the generated snippet,
 * `value` is what the live preview actually receives.
 *
 * @param {string} code - Source to emit verbatim, e.g. `'[F.zoom(), F.minimaps()]'`.
 * @param {*} value - The runtime counterpart handed to the rendered component.
 * @returns {Object} The tagged value.
 */
export const expr = (code, value) => ({ [EXPR_TAG]: code, value });

/**
 * Tells whether a value carries the raw-expression marker.
 *
 * @param {*} value - Any value.
 * @returns {boolean} True when the value was built by `expr()`.
 */
const isExpr = (value) => value !== null && typeof value === 'object' && EXPR_TAG in value;

/**
 * Quotes a string as a JS single-quoted literal.
 *
 * Newlines, tabs and carriage returns are escaped, not passed through: a single-quoted
 * literal cannot span lines, so a raw newline would emit a snippet that does not parse.
 *
 * @param {string} text - The raw string.
 * @returns {string} The quoted literal.
 */
const quote = (text) => {
    const body = text
        .replace(/\\/g, '\\\\')   // en premier : sinon on ré-échapperait les antislashs qu'on ajoute
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    return `'${body}'`;
};

/**
 * Writes an object key, leaving valid identifiers unquoted.
 *
 * @param {string} key - The property name.
 * @returns {string} The key as it should appear in an object literal.
 */
const objectKey = (key) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : quote(key));

/**
 * Serializes a value as a JavaScript expression.
 *
 * Deliberately NOT `JSON.stringify`: that produces `{"x": "%Y-%m"}`, which is valid but
 * reads as JSON pasted into JS. Object keys stay unquoted when they can, and strings use
 * the single quotes the rest of the codebase uses.
 *
 * @param {*} value - Any serializable value, possibly tagged by `expr()`.
 * @returns {string} The JS source of that value.
 */
const toJs = (value) => {
    if (isExpr(value)) return value[EXPR_TAG];
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return quote(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return `[${value.map(toJs).join(', ')}]`;

    if (typeof value === 'object') {
        const body = Object.entries(value)
            .filter(([, item]) => item !== undefined)
            .map(([key, item]) => `${objectKey(key)}: ${toJs(item)}`)
            .join(', ');
        return body ? `{ ${body} }` : '{}';
    }

    // Fonctions et symboles : rien de sensé à écrire. Le schéma doit passer par expr().
    return String(value);
};

/**
 * Escapes a string for use inside a double-quoted JSX attribute.
 *
 * @param {string} text - The raw string.
 * @returns {string} The escaped attribute value.
 */
const escapeAttr = (text) => text.replace(/"/g, '&quot;');

/**
 * Serializes one prop as a JSX attribute.
 *
 * @param {string} name - Prop name.
 * @param {*} value - Prop value.
 * @returns {string} The attribute source, e.g. `x="age"`, `showLegend`, `height={400}`.
 */
const serializeProp = (name, value) => {
    // Booléen vrai → attribut nu. C'est la forme idiomatique, et celle qu'on lit dans
    // les exemples du registry.
    if (value === true) return name;

    if (typeof value === 'string' && !isExpr(value)) {
        // Une chaîne multi-ligne dans un attribut reste légale mais illisible : on
        // repasse alors par une expression.
        return value.includes('\n') ? `${name}={${quote(value)}}` : `${name}="${escapeAttr(value)}"`;
    }

    return `${name}={${toJs(value)}}`;
};

/**
 * Compares a value to its default.
 *
 * Objects and arrays are compared STRUCTURALLY, by serializing both: two equivalent
 * literals are never `===`, so a strict comparison alone would emit every object prop on
 * every render and defeat rule 1. Key order is not an issue here — both sides come out
 * of the same `toProps`, hence the same construction path.
 *
 * @param {*} value - Current value.
 * @param {*} fallback - The default to compare against.
 * @returns {boolean} True when the prop should be omitted.
 */
const isDefault = (value, fallback) => {
    if (value === fallback) return true;
    if (isExpr(value) || isExpr(fallback)) return toJs(value) === toJs(fallback);
    if (typeof value !== 'object' || typeof fallback !== 'object') return false;
    if (value === null || fallback === null) return false;
    return toJs(value) === toJs(fallback);
};

/**
 * Strips the `expr()` markers from a props tree, yielding what the preview renders.
 *
 * Recurses: a tagged value can sit inside an object or an array prop.
 *
 * @param {*} value - Props object, or any nested value.
 * @returns {*} The same shape, with every tagged value replaced by its runtime value.
 */
export const unwrapExpr = (value) => {
    if (isExpr(value)) return value.value;
    if (Array.isArray(value)) return value.map(unwrapExpr);

    // Un élément React est un objet, mais le reconstruire clé par clé en fait un objet
    // nu que React refuse de rendre. On le laisse donc passer intact — un schéma peut
    // parfaitement passer un nœud directement, sans le marquer par expr().
    if (value !== null && typeof value === 'object' && value.$$typeof !== undefined) return value;

    if (value !== null && typeof value === 'object') {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, unwrapExpr(item)]));
    }
    return value;
};

/**
 * Reads the initial value of every control of a schema.
 *
 * @param {Object} controls - The schema's `controls` map.
 * @returns {Object} A values object, keyed like `controls`.
 */
export const defaultsOf = (controls) =>
    Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.default]));

/**
 * Serializes a full, self-contained snippet: imports, data, then the JSX element.
 *
 * @param {Object} scaffold - What surrounds the serialized props.
 * @param {string} scaffold.component - Component name, e.g. `'Chart'`.
 * @param {Array<string>} [scaffold.imports] - Import lines, emitted verbatim.
 * @param {string} [scaffold.data] - Expression passed to the data prop, e.g. `'demoData'`.
 * @param {string} [scaffold.dataCode] - Declaration emitted before the element.
 * @param {string} [scaffold.dataProp] - Name of the data prop (defaults to `'data'`).
 * @param {string} [scaffold.children] - Children source; makes the element non-self-closing.
 * @param {Array<string>} [scaffold.omit] - Props that drive the demonstration harness
 *   rather than the component, and must never appear in the snippet (e.g. a toggle
 *   showing a JSON output panel next to the component). They still reach the preview.
 * @param {Array<string>} [scaffold.always] - Props exempt from rule 1, always written
 *   out. Needed when a `toProps` introduces CONSTANTS (labels, formats, a fixed icon):
 *   being constant, they always equal their default and rule 1 would strip them — the
 *   snippet would then no longer reproduce what the preview shows.
 * @param {Object} props - Current props, as returned by the schema's `toProps`.
 * @param {Object} [defaults] - Props at their default values; matches are omitted.
 * @returns {string} A snippet that pastes into an empty file as-is.
 */
export const serializeJsx = (scaffold, props, defaults = {}) => {
    const {
        component, imports = [], data, dataCode, dataProp = 'data', children,
        omit = [], always = [],
    } = scaffold;

    const attributes = [];
    // La donnée vient du scaffold et non des contrôles : elle n'est jamais « à sa valeur
    // par défaut », elle est ce sans quoi l'extrait ne tourne pas.
    if (data) attributes.push(`${dataProp}={${data}}`);

    for (const [name, value] of Object.entries(props)) {
        if (omit.includes(name)) continue;                            // molette de démonstration
        if (value === undefined || value === null) continue;          // règle : null/undefined omis
        if (!always.includes(name) && name in defaults && isDefault(value, defaults[name])) continue;  // règle 1
        attributes.push(serializeProp(name, value));
    }

    const open = attributes.length <= 1
        ? `<${component}${attributes.length ? ` ${attributes[0]}` : ''}`
        : `<${component}\n${attributes.map((attribute) => `  ${attribute}`).join('\n')}\n`;

    const element = children
        ? `${open}${attributes.length <= 1 ? '>' : '>'}\n${children}\n</${component}>`
        : `${open}${attributes.length <= 1 ? ' />' : '/>'}`;

    // règle 2 : le bloc est autonome.
    return [
        imports.length ? imports.join('\n') : null,
        dataCode || null,
        element,
    ].filter(Boolean).join('\n\n');
};
