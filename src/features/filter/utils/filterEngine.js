// =================================================================
// FILTER ENGINE — logique pure (sans UI) du MultiCriterionMenu
// =================================================================
// À partir d'une liste plate de critères (+ connecteurs + parenthèses), construit
// un arbre imbriqué profondeur/groupe, le convertit en clause SQL WHERE (aperçu) ou
// en FilterNode (structuredFilters envoyé à l'API) et le sérialise sous une forme
// lisible. Aucune dépendance React : que du calcul.
//
// La complétude d'un critère est déléguée à filterTypes.js (source unique de vérité,
// partagée avec le CriterionMenu).

import { isComplete, isNumericFamily, isDateFamily, isIntegerFamily } from './filterTypes';
import { parseDate, DEFAULT_DATE_ORDER, DATE_RANGE_SEP } from '@/components/filter/utils/dateParse';

// =================================================================
// a) Construction de l'arbre profondeur/groupe
// =================================================================
/**
 * Builds the nested group tree from a flat list of criteria.
 *
 * Each leaf carries its depth and the group number at that depth; the
 * brackets are derived from the bracketLeft / bracketRight markers of each card.
 *
 * @param {{variable: ?string, operation: ?string, value: *, typeFamily: ?string,
 *   isCategorical: ?boolean, bracketLeft: boolean, bracketRight: boolean,
 *   connectorBefore: ?string}[]} items - Ordered criteria, each with the logical
 *   connector that precedes it.
 * @returns {{tree: object, balanced: boolean}} Root group node and whether every
 *   opened bracket has been closed (balanced expression).
 */
export function buildTree(items) {
  // Racine : groupe de profondeur 0 qui contient critères et sous-groupes
  const root = { type: 'group', depth: 0, group: 0, connector: null, children: [] };
  const stack = [root];
  const groupCounter = {}; // profondeur -> nombre de groupes déjà ouverts à ce niveau

  items.forEach((c, i) => {
    // Connecteur précédant ce critère (null pour le tout premier critère)
    let connector = i === 0 ? null : c.connectorBefore || 'AND';

    // Crochet ouvrant : on empile un nouveau groupe ; le connecteur porte alors
    // sur le groupe entier (et non plus sur le premier critère qu'il contient).
    if (c.bracketLeft) {
      const d = stack.length; // profondeur résultante après empilement
      groupCounter[d] = (groupCounter[d] || 0) + 1;
      const g = { type: 'group', depth: d, group: groupCounter[d], connector, children: [] };
      stack[stack.length - 1].children.push(g);
      stack.push(g);
      connector = null;
    }

    // Feuille = critère, rattachée au groupe courant (sommet de pile)
    const d = stack.length - 1;
    const leaf = {
      type: 'criterion',
      depth: d,
      group: d === 0 ? 0 : groupCounter[d] || 1,
      connector,
      variable: c.variable,
      operation: c.operation,
      value: c.value,
      typeFamily: c.typeFamily,
      isCategorical: c.isCategorical,
      complete: isComplete(c),
    };
    stack[stack.length - 1].children.push(leaf);

    // Crochet fermant : on dépile (jamais en deçà de la racine)
    if (c.bracketRight && stack.length > 1) stack.pop();
  });

  // balanced : la pile est revenue à la seule racine → crochets équilibrés
  return { tree: root, balanced: stack.length === 1 };
}

// =================================================================
// b) Helpers SQL (usage interne)
// =================================================================
/**
 * Converts a DD/MM/YYYY date string to ISO YYYY-MM-DD (SQL friendly).
 *
 * @param {string} d - Date in DD/MM/YYYY format.
 * @returns {string} ISO date, or the original input when it doesn't match.
 */
function isoDate(d) {
  // Capture jour/mois/année puis réordonne ; renvoie l'entrée intacte si non conforme
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d || '');
  return m ? `${m[3]}-${m[2]}-${m[1]}` : d;
}

/**
 * Builds the SQL fragment of a single criterion leaf.
 * Any unfilled value degrades to a `?` placeholder.
 *
 * @param {object} leaf - Criterion leaf produced by buildTree.
 * @returns {string} SQL fragment (e.g. "gdp > 2", "country IN ('fr', 'de')").
 */
function criterionSQL(leaf) {
  const col = leaf.variable || '?';
  const typeFamily = leaf.typeFamily;
  const isCat = leaf.isCategorical;
  const op = leaf.operation;
  const val = leaf.value;
  // Échappement SQL d'une chaîne : on double les apostrophes internes
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  // Nombre brut, ou placeholder « ? » si la borne est vide
  const num = (x) => (x === '' || x == null ? '?' : String(x));

  // Critère incomplet (sans variable ou sans opération)
  if (!leaf.variable || !op) return col === '?' ? '?' : `${col} ?`;

  // Catégoriel : appartenance multiple (IN / NOT IN) ou égalité simple
  if (isCat) {
    if (op === 'IN' || op === 'NOT_IN') {
      const list = Array.isArray(val) ? val : [];
      const inner = list.length ? list.map(q).join(', ') : '?';
      return `${col} ${op === 'NOT_IN' ? 'NOT IN' : 'IN'} (${inner})`;
    }
    return val ? `${col} = ${q(val)}` : `${col} = ?`;
  }
  // Numérique : comparateurs simples + plage BETWEEN
  if (isNumericFamily(typeFamily)) {
    const map = { EQ: '=', GT: '>', GTE: '>=', LT: '<', LTE: '<=' };
    if (op === 'BETWEEN') return `${col} BETWEEN ${num(val && val.min)} AND ${num(val && val.max)}`;
    return `${col} ${map[op] || '='} ${num(val)}`;
  }
  // Date : conversion ISO + plage encodée « A → B » par TypeAwareInput
  if (isDateFamily(typeFamily)) {
    if (op === 'BETWEEN') {
      const [a, b] = String(val || '').split(' → ');
      const sa = /^\d{2}\/\d{2}\/\d{4}$/.test(a) ? q(isoDate(a)) : '?';
      const sb = /^\d{2}\/\d{2}\/\d{4}$/.test(b) ? q(isoDate(b)) : '?';
      return `${col} BETWEEN ${sa} AND ${sb}`;
    }
    const map = { BEFORE: '<', AFTER: '>', EQ: '=' };
    return /^\d{2}\/\d{2}\/\d{4}$/.test(val)
      ? `${col} ${map[op] || '='} ${q(isoDate(val))}`
      : `${col} ${map[op] || '='} ?`;
  }
  // Texte : égalité, LIKE %x% (contient), LIKE x% (commence par)
  if (op === 'CONTAINS') return val ? `${col} LIKE ${q(`%${val}%`)}` : `${col} LIKE ?`;
  if (op === 'STARTS') return val ? `${col} LIKE ${q(`${val}%`)}` : `${col} LIKE ?`;
  return val ? `${col} = ${q(val)}` : `${col} = ?`;
}

// =================================================================
// c) Conversion récursive de l'arbre en SQL
// =================================================================
/**
 * Recursively converts a tree node into its SQL clause.
 * A criterion becomes a leaf fragment; a group joins its children with their
 * connectors and wraps them in parentheses (except the depth-0 root).
 *
 * @param {object} node - Tree node (group or criterion) from buildTree.
 * @returns {string} SQL clause (without the leading WHERE keyword).
 */
export function treeToSQL(node) {
  // Feuille : fragment d'un seul critère
  if (node.type === 'criterion') return criterionSQL(node);

  // Groupe : on concatène les enfants avec leur connecteur respectif
  let s = '';
  node.children.forEach((ch, idx) => {
    if (idx > 0) s += ` ${ch.connector || 'AND'} `;
    s += treeToSQL(ch);
  });
  // Groupe vide → TRUE (clause neutre)
  if (!node.children.length) s = 'TRUE';
  // La racine (depth 0) n'est jamais parenthésée ; les sous-groupes le sont
  return node.depth === 0 ? s : `(${s})`;
}

// =================================================================
// d) Conversion de l'arbre en FilterNode (contrat structuredFilters de l'API)
// =================================================================
// L'API compile elle-même l'arbre en clause WHERE paramétrée. Contrat (SDL) :
//   • un nœud porte EXACTEMENT un de `criterion` (feuille) ou `children` (groupe) ;
//   • la racine est un groupe, aucun groupe n'est vide ;
//   • `connector` lie un nœud au nœud PRÉCÉDENT de son groupe (ignoré pour le premier) ;
//   • `value` : scalaire, tableau non vide (IN/NOT_IN), {min, max} (BETWEEN) ; dates en
//     ISO 8601, entiers au-delà de 2^53 en chaîne.
// L'API REJETTE un critère incomplet : contrairement à treeToSQL (placeholder « ? »),
// un critère inachevé est donc OMIS, avec son propre connecteur.

// Sentinelle « valeur non convertible » : le critère est alors traité comme incomplet.
const INVALID = Symbol('invalid');

/**
 * Converts a filter value to the scalar type of its column, as the API expects it.
 *
 * Values picked in a select menu come back from getSelectOptions as strings (`value`
 * is the code cast to text): a numeric column needs them as numbers again. An
 * integer beyond 2^53 stays a digit string, as the JSON scalar contract requires.
 *
 * @param {*} value - Raw value (string from an input or a select, or a row value).
 * @param {?string} typeFamily - `TypeFamily` enum value of the column.
 * @returns {*} Typed value (number for a numeric column when it parses, otherwise the input).
 */
export function toApiScalar(value, typeFamily) {
  if (!isNumericFamily(typeFamily) || typeof value === 'number') return value;
  const s = String(value).trim().replace(',', '.');
  // Entier hors de la plage exacte d'un double : on garde la chaîne de chiffres
  if (isIntegerFamily(typeFamily) && /^-?\d+$/.test(s) && !Number.isSafeInteger(Number(s))) return s;
  const n = Number(s);
  return s === '' || Number.isNaN(n) ? value : n;
}

/**
 * Converts a numeric input to a number (comma decimal accepted).
 *
 * @param {*} v - Raw input.
 * @param {?string} typeFamily - Column type family (integers beyond 2^53 stay strings).
 * @returns {(number|string|symbol)} The number, or `INVALID` when it doesn't parse.
 */
function apiNumber(v, typeFamily) {
  if (v === '' || v == null) return INVALID;
  const out = toApiScalar(v, typeFamily);
  // toApiScalar renvoie l'entrée telle quelle quand elle ne se lit pas comme un nombre
  return typeof out === 'number' || (typeof out === 'string' && /^-?\d+$/.test(out)) ? out : INVALID;
}

/**
 * Converts a date typed in the locale's order to ISO `YYYY-MM-DD`.
 *
 * @param {string} str - Date string (e.g. `31/12/2026` in DMY order).
 * @param {string} dateOrder - Permutation of 'D', 'M' and 'Y'.
 * @returns {(string|symbol)} ISO date, or `INVALID` when it isn't a real date.
 */
function apiDate(str, dateOrder) {
  const d = typeof str === 'string' ? parseDate(str, dateOrder) : null;
  if (!d) return INVALID;
  // parseDate construit une date LOCALE : on relit donc les composantes locales
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Builds the API `value` of a criterion leaf, routed like criterionSQL.
 *
 * @param {object} leaf - Criterion leaf produced by buildTree.
 * @param {string} dateOrder - Order the dates were typed in.
 * @returns {*} API value, or `INVALID` when the value can't be converted.
 */
function toApiValue(leaf, dateOrder) {
  const { operation: op, value, typeFamily, isCategorical } = leaf;

  // Appartenance : tableau non vide, chaque élément typé selon la colonne
  if (op === 'IN' || op === 'NOT_IN') {
    return Array.isArray(value) && value.length
      ? value.map((v) => toApiScalar(v, typeFamily))
      : INVALID;
  }
  // Catégoriel en égalité simple : scalaire typé
  if (isCategorical) return value == null || value === '' ? INVALID : toApiScalar(value, typeFamily);

  // Numérique : plage → {min, max}, sinon nombre
  if (isNumericFamily(typeFamily)) {
    if (op === 'BETWEEN') {
      const min = apiNumber(value?.min, typeFamily);
      const max = apiNumber(value?.max, typeFamily);
      return min === INVALID || max === INVALID ? INVALID : { min, max };
    }
    return apiNumber(value, typeFamily);
  }

  // Date : plage « A → B » → {min, max} ISO, sinon date ISO
  if (isDateFamily(typeFamily)) {
    if (op === 'BETWEEN') {
      const [a, b] = String(value ?? '').split(DATE_RANGE_SEP);
      const min = apiDate(a, dateOrder);
      const max = apiDate(b, dateOrder);
      return min === INVALID || max === INVALID ? INVALID : { min, max };
    }
    return apiDate(value, dateOrder);
  }

  // Texte (et autres) : chaîne non vide
  return typeof value === 'string' && value.trim() ? value : INVALID;
}

/**
 * Recursively converts a buildTree node, pruning incomplete criteria and the groups
 * they leave empty.
 *
 * @param {object} node - Tree node (group or criterion) from buildTree.
 * @param {string} dateOrder - Order the dates were typed in.
 * @returns {?object} FilterNode, or `null` when nothing usable is left.
 */
function convertNode(node, dateOrder) {
  // Connecteur repris tel quel ; absent pour le premier nœud d'un groupe
  const withConnector = (out) => (node.connector ? { connector: node.connector, ...out } : out);

  if (node.type === 'criterion') {
    if (!node.variable || !node.operation || node.complete === false) return null;
    const value = toApiValue(node, dateOrder);
    if (value === INVALID) return null;
    return withConnector({ criterion: { variable: node.variable, operation: node.operation, value } });
  }

  // Groupe : les enfants omis emportent leur propre connecteur ; si c'est le premier,
  // le connecteur du suivant devient sans effet (règle de l'API), on le garde tel quel.
  const children = node.children.map((ch) => convertNode(ch, dateOrder)).filter(Boolean);
  return children.length ? withConnector({ children }) : null;
}

/**
 * Converts a buildTree tree into the API `FilterNode` (`structuredFilters`).
 *
 * Incomplete criteria (no variable, no operation, unfilled or unparseable value) are
 * omitted together with their connector, and the groups they leave empty are removed:
 * the API rejects an incomplete criterion. An unbalanced expression yields no filter.
 *
 * @param {?object} tree - Root group from buildTree (`filter.tree` of MultiCriterionMenu).
 * @param {Object} [options]
 * @param {boolean} [options.balanced=true] - `balanced` flag from buildTree; `false`
 *   (an unclosed bracket) yields `null`.
 * @param {string} [options.dateOrder='DMY'] - Order the dates were typed in (locale
 *   dependent), used to convert them to ISO 8601.
 * @returns {?{children: Array<object>}} Root FilterNode, or `null` for no filter.
 */
export function toFilterNode(tree, { balanced = true, dateOrder = DEFAULT_DATE_ORDER } = {}) {
  if (!tree || !balanced) return null;
  const root = convertNode(tree, dateOrder);
  if (!root) return null;
  // La racine est un groupe : un connecteur n'y a aucun sens
  return { children: root.children };
}

/**
 * Turns per-column value selections (table filters) into `IN` FilterNode leaves.
 *
 * @param {Object<string, ?Array>} filters - Selection per column key (`null` or `[]` =
 *   no filter on that column).
 * @param {Array<{key: string, typeFamily?: string}>} columns - Column definitions,
 *   driving the iteration order and the value typing.
 * @returns {Array<object>} One `IN` leaf per filtered column, each joined with AND.
 */
export function columnCriteria(filters, columns) {
  const leaves = [];
  for (const c of columns) {
    const selected = filters?.[c.key];
    if (!Array.isArray(selected) || selected.length === 0) continue;
    leaves.push({
      connector: 'AND',
      criterion: { variable: c.key, operation: 'IN', value: selected.map((v) => toApiScalar(v, c.typeFamily)) },
    });
  }
  return leaves;
}

/**
 * ANDs extra leaves onto a root FilterNode.
 *
 * The existing root is kept as a sub-group so that its own connectors keep their
 * precedence: `(A OR B) AND country IN (…)`, never `A OR B AND country IN (…)`.
 *
 * @param {?{children: Array}} node - Root FilterNode (e.g. from toFilterNode), or `null`.
 * @param {Array<object>} [leaves] - Leaves to AND (e.g. from columnCriteria).
 * @returns {?{children: Array}} Combined root FilterNode, or `null` when both are empty.
 */
export function andNodes(node, leaves = []) {
  if (!leaves.length) return node ?? null;
  // Le premier enfant d'un groupe ne porte pas de connecteur
  if (!node) {
    const [first, ...rest] = leaves;
    const head = { ...first };
    delete head.connector;
    return { children: [head, ...rest] };
  }
  return { children: [{ children: node.children }, ...leaves] };
}

// =================================================================
// e) Sérialisation lisible (sans champs internes)
// =================================================================
/**
 * Produces a human-readable, JSON-friendly view of the tree, dropping the
 * internal fields (typeFamily, isCategorical, complete) used only for SQL generation.
 *
 * @param {object} node - Tree node (group or criterion) from buildTree.
 * @returns {object} Plain object mirroring the tree structure.
 */
export function serialize(node) {
  // Feuille : critère lisible
  if (node.type === 'criterion') {
    return {
      depth: node.depth,
      group: node.group,
      connecteur: node.connector,
      variable: node.variable,
      operation: node.operation,
      valeur: node.value,
    };
  }
  // Groupe : profondeur, numéro de groupe, connecteur et enfants récursifs
  return {
    groupe: node.group,
    depth: node.depth,
    connecteur: node.connector,
    enfants: node.children.map(serialize),
  };
}
