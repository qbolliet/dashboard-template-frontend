// =================================================================
// DEFAULT FILTER ENGINE — évaluation d'un arbre <MultiCriterionMenu> sur des lignes
// =================================================================
//   • les feuilles portent { variable, operation, value, sqlType, isCategorical }
//     (buildTree) — on route le type via isNumericSqlType / isDateSqlType
//     (pas de type abstrait 'continuous'/'date'/'categorical'/'text') ;
//   • les groupes/feuilles portent `children` (arbre réel) ou `enfants` (forme
//     sérialisée par filterEngine.serialize, clés françaises) ;
//   • le connecteur logique est porté par l'ENFANT (ch.connector / ch.connecteur),
//     AND par défaut — jamais par le parent ;
//   • un critère incomplet (sans variable ou sans opération) est ignoré (→ true).
// La forme sérialisée (enfants/connecteur/valeur) ne porte PAS sqlType/isCategorical
// (serialize() les élague) : evalCriterion route alors sur la branche générique
// (égalité brute), faute d'information de type — cas volontairement dégradé,
// la forme sérialisée n'étant pas la source de vérité pour l'évaluation.

import { isNumericSqlType, isDateSqlType } from '@/features/filter/utils/filterTypes';

/**
 * Normalizes the many shapes a `defaultFilter` prop can take into a single
 * root tree node (or `null`).
 *
 * @param {?({tree: object}|object|Array)} df - `<MultiCriterionMenu>` output
 *   (`{ criteria, tree, balanced, serial }`), a raw tree node (`{ type: 'group'
 *   | 'criterion', children: [...] }`), a serialized node (`{ enfants, groupe }`
 *   from `filterEngine.serialize`), or a flat array of criteria (implicit AND).
 * @returns {?object} Root tree node, or `null` when nothing usable is provided.
 */
export function normalizeDefaultFilter(df) {
  if (!df) return null;
  if (df.tree) return df.tree;
  if (df.type === 'group' || df.type === 'criterion') return df;
  if (df.enfants || df.groupe != null) return df;
  if (Array.isArray(df)) return { type: 'group', children: df };
  return null;
}

const dfNum = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
  return Number.isNaN(n) ? null : n;
};

/**
 * Parses a date-like cell/criterion value to a comparable timestamp.
 * Accepts ISO (`YYYY-MM-DD`), French (`DD/MM/YYYY`), or any format
 * `Date.parse` understands.
 *
 * @param {*} v - Raw value.
 * @returns {?number} Epoch milliseconds (UTC), or `null` when unparseable.
 */
function dfTime(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3]);
  m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (m) return Date.UTC(+m[3], +m[2] - 1, +m[1]);
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

/**
 * Evaluates a single criterion leaf against a data row.
 *
 * @param {Object} row - Data row.
 * @param {{variable: ?string, operation: ?string, value?: *, valeur?: *,
 *   sqlType?: string, isCategorical?: boolean}} leaf - Criterion leaf (real
 *   tree: `value`/`sqlType`/`isCategorical`; serialized form: `valeur` only).
 * @returns {boolean} Whether the row passes the criterion. An incomplete
 *   criterion (no variable or no operation) always passes (ignored).
 */
export function evalCriterion(row, leaf) {
  const key = leaf.variable;
  const op = leaf.operation;
  const sqlType = leaf.sqlType;
  const isCategorical = leaf.isCategorical;
  const value = ('value' in leaf) ? leaf.value : leaf.valeur;
  if (!key || !op) return true; // Critère incomplet → ignoré.
  const cell = row[key];

  // Appartenance (in/not_in) : sémantique indépendante du type — traitée avant
  // le routage numérique/date/catégoriel/texte pour couvrir aussi les arbres
  // bruts tiers (cf. normalizeDefaultFilter) où `in` porte sur une colonne
  // non catégorielle (isCategorical falsy).
  if (op === 'in' || op === 'not_in') {
    const list = Array.isArray(value) ? value : [];
    if (!list.length) return true; // Liste vide → critère neutre (ignoré).
    const inc = list.map(String).includes(String(cell));
    return op === 'not_in' ? !inc : inc;
  }

  if (isNumericSqlType(sqlType)) {
    const c = dfNum(cell);
    if (c == null) return false;
    if (op === 'between') {
      const mn = dfNum(value && value.min);
      const mx = dfNum(value && value.max);
      // Aucune borne → critère neutre (ignoré). Une SEULE borne → contrainte
      // ouverte de ce côté-là (pas un rejet), plutôt qu'un blanc-seing tant
      // que la deuxième borne n'est pas saisie.
      if (mn == null && mx == null) return true;
      if (mn == null) return c <= mx;
      if (mx == null) return c >= mn;
      return c >= mn && c <= mx;
    }
    const t = dfNum(value);
    if (t == null) return true;
    switch (op) {
      case 'eq': return c === t;
      case 'gt': return c > t;
      case 'gte': return c >= t;
      case 'lt': return c < t;
      case 'lte': return c <= t;
      // Opération non reconnue (typo, opérateur pas câblé ici) : on EXCLUT la
      // ligne plutôt que de la laisser passer — un filtre mal formé doit se
      // remarquer (aucun résultat), pas disparaître silencieusement.
      default: return false;
    }
  }

  if (isDateSqlType(sqlType)) {
    const c = dfTime(cell);
    if (c == null) return false;
    if (op === 'between') {
      // Plage encodée « JJ/MM/AAAA → JJ/MM/AAAA » par TypeAwareInput (ISO toléré aussi).
      const [a, b] = String(value || '').split(' → ');
      const ta = dfTime(a);
      const tb = dfTime(b);
      // Aucune borne → critère neutre (ignoré). Une SEULE borne → contrainte
      // ouverte de ce côté-là (pas un rejet), plutôt qu'un blanc-seing tant
      // que la deuxième borne n'est pas saisie.
      if (ta == null && tb == null) return true;
      if (ta == null) return c <= tb;
      if (tb == null) return c >= ta;
      return c >= ta && c <= tb;
    }
    const t = dfTime(value);
    if (t == null) return true;
    switch (op) {
      case 'eq': return c === t;
      case 'before': return c < t;
      case 'after': return c > t;
      // Opération non reconnue (typo, opérateur pas câblé ici) : on EXCLUT la
      // ligne plutôt que de la laisser passer — un filtre mal formé doit se
      // remarquer (aucun résultat), pas disparaître silencieusement.
      default: return false;
    }
  }

  if (isCategorical) {
    if (value == null || value === '') return true;
    return String(cell) === String(value);
  }

  // Texte (sqlType hors familles numérique/date, non catégoriel).
  if (op === 'contains' || op === 'starts') {
    if (value == null || value === '') return true;
    const c = String(cell).toLowerCase();
    const v = String(value).toLowerCase();
    return op === 'contains' ? c.includes(v) : c.startsWith(v);
  }

  // Générique (eq, ou forme sérialisée sans sqlType) : égalité en chaîne.
  if (value == null || value === '') return true;
  return String(cell) === String(value);
}

/**
 * Recursively evaluates a tree node (group or criterion leaf) against a row.
 * A group combines its children left-to-right, each child carrying its own
 * preceding logical connector (`connector`/`connecteur`, AND by default) —
 * never the parent.
 *
 * @param {Object} row - Data row.
 * @param {?object} node - Tree node (`children`/`enfants` = group, otherwise
 *   a criterion leaf).
 * @returns {boolean} Whether the row passes this node.
 */
export function evalFilterNode(row, node) {
  if (!node) return true;
  const kids = node.children || node.enfants;
  if (kids) {
    if (!kids.length) return true;
    let res = null;
    kids.forEach((ch, idx) => {
      const v = evalFilterNode(row, ch);
      if (idx === 0) {
        res = v;
      } else {
        const conn = ch.connector || ch.connecteur || 'AND';
        res = conn === 'OR' ? (res || v) : (res && v);
      }
    });
    return res == null ? true : res;
  }
  return evalCriterion(row, node);
}

/**
 * Collects the set of column keys (`variable`) referenced anywhere in a
 * filter tree.
 *
 * @param {?object} node - Tree node.
 * @param {Set<string>} [acc] - Accumulator (internal recursion).
 * @returns {Set<string>} Referenced column keys.
 */
export function collectRefKeys(node, acc) {
  acc = acc || new Set();
  if (!node) return acc;
  const kids = node.children || node.enfants;
  if (kids) {
    kids.forEach((ch) => collectRefKeys(ch, acc));
    return acc;
  }
  if (node.variable) acc.add(node.variable);
  return acc;
}

/**
 * Materializes a default-filter tree into per-column value selections: for
 * each column referenced by the tree, keeps the distinct values (among rows
 * passing the whole tree) actually present for that column. This is what
 * makes the default filter modifiable (reopening the funnel re-checks removed
 * values) and clearable (Reset drops it): the seed only feeds the *interactive*
 * per-column filter state, it isn't re-evaluated afterwards.
 *
 * For an AND-only, single-column-per-branch tree the conversion is exact; a
 * more elaborate tree (OR across columns, nested groups) is approximated by
 * this per-column materialization, same as the prototype.
 *
 * Ne prend délibérément PAS de `uniqueValues` précalculé en paramètre : le
 * total distinct par colonne référencée est recompté ici, sur `data` brut,
 * uniquement pour les colonnes de `refKeys` (au lieu de TOUTES les colonnes
 * comme le fait le scan `uniqueValues` du hook appelant). Ça évite de dépendre
 * de l'identité d'un objet reconstruit à chaque rendu — nécessaire pour que
 * useDataTableState puisse mémoïser le seed sur des dépendances stables
 * (data, defaultFilter, signature des clés de colonnes).
 *
 * @param {?object} dfTree - Normalized filter tree (see `normalizeDefaultFilter`).
 * @param {Array<Object>} data - Raw rows.
 * @param {Array<{key: string}>} columns - Column definitions.
 * @returns {Object<string, ?Array>} Per-column filter selection (`null` = all
 *   selected, i.e. no filter for that column).
 */
export function deriveFiltersFromDefault(dfTree, data, columns) {
  const base = Object.fromEntries(columns.map((c) => [c.key, null]));
  if (!dfTree) return base;
  const passRows = data.filter((r) => evalFilterNode(r, dfTree));
  const refKeys = collectRefKeys(dfTree);
  refKeys.forEach((key) => {
    const col = columns.find((c) => c.key === key);
    if (!col) return;
    const seen = new Set();
    const arr = [];
    for (const r of passRows) {
      const v = r[key];
      if (v == null || v === '') continue;
      if (!seen.has(v)) { seen.add(v); arr.push(v); }
    }
    const seenAll = new Set();
    let allCount = 0;
    for (const r of data) {
      const v = r[key];
      if (v == null || v === '') continue;
      if (!seenAll.has(v)) { seenAll.add(v); allCount++; }
    }
    base[key] = (arr.length === allCount) ? null : arr;
  });
  return base;
}
