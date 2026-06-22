// =================================================================
// FILTER ENGINE — logique pure (sans UI) du MultiCriterionMenu
// =================================================================
// À partir d'une liste plate de critères (+ connecteurs + parenthèses), construit
// un arbre imbriqué profondeur/groupe, le convertit en clause SQL WHERE et le
// sérialise sous une forme lisible. Aucune dépendance React : que du calcul.
//
// La complétude d'un critère est déléguée à filterTypes.js (source unique de vérité,
// partagée avec le CriterionMenu).

import { isComplete } from './filterTypes';

// =================================================================
// a) Construction de l'arbre profondeur/groupe
// =================================================================
/**
 * Builds the nested group tree from a flat list of criteria.
 *
 * Each leaf carries its depth and the group number at that depth; the
 * parentheses are derived from the parenLeft / parenRight markers of each card.
 *
 * @param {{variable: ?string, operation: ?string, value: *, type: ?string,
 *   parenLeft: boolean, parenRight: boolean, connectorBefore: ?string}[]} items -
 *   Ordered criteria, each with the logical connector that precedes it.
 * @returns {{tree: object, balanced: boolean}} Root group node and whether every
 *   opened parenthesis has been closed (balanced expression).
 */
export function buildTree(items) {
  // Racine : groupe de profondeur 0 qui contient critères et sous-groupes
  const root = { type: 'group', depth: 0, group: 0, connector: null, children: [] };
  const stack = [root];
  const groupCounter = {}; // profondeur -> nombre de groupes déjà ouverts à ce niveau

  items.forEach((c, i) => {
    // Connecteur précédant ce critère (null pour le tout premier critère)
    let connector = i === 0 ? null : c.connectorBefore || 'AND';

    // Parenthèse ouvrante : on empile un nouveau groupe ; le connecteur porte alors
    // sur le groupe entier (et non plus sur le premier critère qu'il contient).
    if (c.parenLeft) {
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
      varType: c.type,
      complete: isComplete(c),
    };
    stack[stack.length - 1].children.push(leaf);

    // Parenthèse fermante : on dépile (jamais en deçà de la racine)
    if (c.parenRight && stack.length > 1) stack.pop();
  });

  // balanced : la pile est revenue à la seule racine → parenthèses équilibrées
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
  const t = leaf.varType;
  const op = leaf.operation;
  const val = leaf.value;
  // Échappement SQL d'une chaîne : on double les apostrophes internes
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  // Nombre brut, ou placeholder « ? » si la borne est vide
  const num = (x) => (x === '' || x == null ? '?' : String(x));

  // Critère incomplet (sans variable ou sans opération)
  if (!leaf.variable || !op) return col === '?' ? '?' : `${col} ?`;

  // Continu : comparateurs simples + plage BETWEEN
  if (t === 'continuous') {
    const map = { eq: '=', gt: '>', gte: '>=', lt: '<', lte: '<=' };
    if (op === 'between') return `${col} BETWEEN ${num(val && val.min)} AND ${num(val && val.max)}`;
    return `${col} ${map[op] || '='} ${num(val)}`;
  }
  // Date : conversion ISO + plage encodée « A → B » par TypeAwareInput
  if (t === 'date') {
    if (op === 'between') {
      const [a, b] = String(val || '').split(' → ');
      const sa = /^\d{2}\/\d{2}\/\d{4}$/.test(a) ? q(isoDate(a)) : '?';
      const sb = /^\d{2}\/\d{2}\/\d{4}$/.test(b) ? q(isoDate(b)) : '?';
      return `${col} BETWEEN ${sa} AND ${sb}`;
    }
    const map = { before: '<', after: '>', eq: '=' };
    return /^\d{2}\/\d{2}\/\d{4}$/.test(val)
      ? `${col} ${map[op] || '='} ${q(isoDate(val))}`
      : `${col} ${map[op] || '='} ?`;
  }
  // Catégoriel : appartenance multiple (IN / NOT IN) ou égalité simple
  if (t === 'categorical') {
    if (op === 'in' || op === 'not_in') {
      const list = Array.isArray(val) ? val : [];
      const inner = list.length ? list.map(q).join(', ') : '?';
      return `${col} ${op === 'not_in' ? 'NOT IN' : 'IN'} (${inner})`;
    }
    return val ? `${col} = ${q(val)}` : `${col} = ?`;
  }
  // Texte : égalité, LIKE %x% (contient), LIKE x% (commence par)
  if (t === 'text') {
    if (op === 'contains') return val ? `${col} LIKE ${q(`%${val}%`)}` : `${col} LIKE ?`;
    if (op === 'starts') return val ? `${col} LIKE ${q(`${val}%`)}` : `${col} LIKE ?`;
    return val ? `${col} = ${q(val)}` : `${col} = ?`;
  }
  return '?';
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
// d) Sérialisation lisible (sans champs internes)
// =================================================================
/**
 * Produces a human-readable, JSON-friendly view of the tree, dropping the
 * internal fields (varType, complete) used only for SQL generation.
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
