// =================================================================
// RÉSOLVEURS MOCK — LOGIQUE PARTAGÉE
// =================================================================
// UNE implémentation des six opérations de l'API consommées par le template
// (getFactTableWithMetadata, getCatalogSchema, getSelectOptions,
// getSelectOptionsTree, getFieldStats, getAggregates), appuyée sur les fixtures de
// src/lib/api/fixtures/. Elle sert deux consommateurs :
//   - le transport en mémoire (transports/mock.js), via le bundler ;
//   - le serveur `npm run mock:api` (scripts/mock-api-server.js), via `import()`.
// Pour que Node puisse charger ce fichier sans bundler, il n'importe RIEN : les
// fixtures lui sont injectées (`createMockResolvers`). Les deux modes affichent
// ainsi des données strictement identiques.
//
// Fidèle au contrat 0.3.0 sur ce qui se voit côté interface. `structuredFilters`
// est appliqué par toutes les opérations qui l'acceptent — faits, options (plates et
// arbre), statistiques, agrégats — avec un seul évaluateur (`applyFilterNode`), validé
// comme le fait l'API : un arbre mal formé lève BAD_USER_INPUT. Non appliquée (les
// fixtures tiennent en une page) : la projection `fields`.

// Familles de type qui ont des bornes (extents / min-max numériques ou dates).
const BOUNDED_FAMILIES = new Set(['INTEGER', 'NUMBER', 'DATE', 'TIMESTAMP']);

/**
 * Builds an error carrying the API error code (`BAD_USER_INPUT`), as the real API does.
 *
 * @param {string} message - Error message.
 * @returns {Error} Error with `code` and `extensions.code` set.
 */
const badUserInput = (message) => Object.assign(new Error(message), {
  code: 'BAD_USER_INPUT',
  extensions: { code: 'BAD_USER_INPUT' },
});

// Comparaison binaire (ordre des codes de caractère), comme le tri DuckDB.
const compare = (a, b) => {
  if (a === b) return 0;
  return a > b ? 1 : -1;
};

// Tri générique : honore l'argument `sort: [SortInput!]`.
const applySort = (rows, sort) => {
  if (!sort || sort.length === 0) return rows;

  return [...rows].sort((a, b) => {
    for (const { field, order = 'ASC' } of sort) {
      const cmp = compare(a[field], b[field]);
      if (cmp !== 0) return order === 'DESC' ? -cmp : cmp;
    }
    return 0;
  });
};

// =================================================================
// ARBRE DE FILTRES (FilterNode) — validation et évaluation
// =================================================================
// Même contrat que le compilateur de l'API : un nœud porte exactement un de
// `criterion` / `children`, la racine est un groupe, aucun groupe n'est vide ; les
// connecteurs suivent la précédence SQL (NOT, puis AND, puis OR). Seuls les
// connecteurs et opérations que l'interface émet sont évalués ; les autres sont
// refusés explicitement plutôt qu'approximés.

// Valeur de comparaison : nombre si les deux côtés en sont, sinon chaîne (les dates
// ISO 8601 se comparent alors dans l'ordre chronologique).
const comparable = (cell, value) => (
  typeof cell === 'number' && value !== '' && !Number.isNaN(Number(value))
    ? [cell, Number(value)]
    : [String(cell), String(value)]
);

// Prédicat d'un critère sur une ligne. Un NULL ne satisfait aucune comparaison.
const evalCriterion = (row, { variable, operation, value }) => {
  const cell = row[variable];
  if (operation === 'IS_NULL') return cell === null || cell === undefined;
  if (operation === 'IS_NOT_NULL') return cell !== null && cell !== undefined;
  if (cell === null || cell === undefined) return false;

  const cmp = (v) => {
    const [a, b] = comparable(cell, v);
    return compare(a, b);
  };

  switch (operation) {
    case 'EQ': return cmp(value) === 0;
    case 'NEQ': return cmp(value) !== 0;
    case 'GT': case 'AFTER': return cmp(value) > 0;
    case 'GTE': case 'ON_OR_AFTER': return cmp(value) >= 0;
    case 'LT': case 'BEFORE': return cmp(value) < 0;
    case 'LTE': case 'ON_OR_BEFORE': return cmp(value) <= 0;
    case 'BETWEEN': return cmp(value.min) >= 0 && cmp(value.max) <= 0;
    case 'NOT_BETWEEN': return !(cmp(value.min) >= 0 && cmp(value.max) <= 0);
    case 'IN': return value.some((v) => cmp(v) === 0);
    case 'NOT_IN': return !value.some((v) => cmp(v) === 0);
    case 'CONTAINS': return String(cell).includes(String(value));
    case 'STARTS': return String(cell).startsWith(String(value));
    default: throw badUserInput(`Opération « ${operation} » non prise en charge par le mock.`);
  }
};

// Validation structurelle d'un nœud (ce que le SDL ne peut pas exprimer) ;
// `checkVariable` lève sur une colonne inconnue, comme le contrôle de l'API.
const checkNode = (node, checkVariable) => {
  const hasCriterion = node.criterion !== null && node.criterion !== undefined;
  const hasChildren = node.children !== null && node.children !== undefined;
  if (hasCriterion === hasChildren) {
    throw badUserInput('Un nœud de filtre porte exactement un de criterion ou children.');
  }
  if (hasChildren) {
    if (node.children.length === 0) throw badUserInput('Un groupe de filtres ne peut pas être vide.');
    node.children.forEach((child) => checkNode(child, checkVariable));
    return;
  }
  const { variable, operation, value } = node.criterion;
  checkVariable(variable);
  if ((operation === 'IN' || operation === 'NOT_IN') && (!Array.isArray(value) || value.length === 0)) {
    throw badUserInput(`${operation} attend un tableau non vide.`);
  }
  if ((operation === 'BETWEEN' || operation === 'NOT_BETWEEN')
    && (value === null || typeof value !== 'object' || !('min' in value) || !('max' in value))) {
    throw badUserInput(`${operation} attend une valeur {min, max}.`);
  }
};

// Évaluation d'un nœud : un groupe est un OU de suites de ET (précédence SQL) ;
// AND_NOT / OR_NOT nient le nœud qu'ils introduisent.
const evalNode = (row, node) => {
  let result;
  if (node.children) {
    let anyRun = false;
    let run = true;
    node.children.forEach((child, i) => {
      const connector = i === 0 ? 'AND' : (child.connector ?? 'AND');
      if (!['AND', 'OR', 'AND_NOT', 'OR_NOT'].includes(connector)) {
        throw badUserInput(`Connecteur « ${connector} » non pris en charge par le mock.`);
      }
      let v = evalNode(row, child);
      if (connector.endsWith('_NOT')) v = !v;
      if (i > 0 && connector.startsWith('OR')) {
        anyRun = anyRun || run;
        run = v;
      } else {
        run = run && v;
      }
    });
    result = anyRun || run;
  } else {
    result = evalCriterion(row, node.criterion);
  }
  return node.negate ? !result : result;
};

/**
 * Applies a `structuredFilters` tree to rows, validating it as the API does.
 *
 * @param {Object[]} rows - Fact rows.
 * @param {?Object} node - Root FilterNode, or null/undefined for no filter.
 * @param {function(string): void} checkVariable - Throws on an unknown column.
 * @returns {Object[]} Rows passing the filter.
 */
const applyFilterNode = (rows, node, checkVariable) => {
  if (node === null || node === undefined) return rows;
  if (!node.children) throw badUserInput('La racine de structuredFilters doit être un groupe.');
  checkNode(node, checkVariable);
  return rows.filter((row) => evalNode(row, node));
};

// Bornes [min, max] des colonnes numériques et temporelles d'une page de lignes ;
// les NULL sont ignorés et une colonne sans valeur n'a pas d'entrée.
const pageExtents = (rows, fields) => {
  const extents = {};

  for (const { name, typeFamily } of fields) {
    if (!BOUNDED_FAMILIES.has(typeFamily)) continue;

    const values = rows.map((row) => row[name]).filter((v) => v !== null && v !== undefined);
    if (values.length === 0) continue;

    extents[name] = [values.reduce((a, b) => (b < a ? b : a)), values.reduce((a, b) => (b > a ? b : a))];
  }

  return extents;
};

// =================================================================
// AGRÉGATS (getAggregates) — troncature temporelle, réducteurs, métadonnées
// =================================================================
// Mêmes règles que le constructeur SQL de l'API (src/utils/aggregate-query.ts) sur ce
// que l'interface consomme : agrégation effective, alias par défaut, type et format du
// résultat, ordre des groupes et formats OBJECTS / ARRAYS / LONG.

// Bornes de l'API (API.AGGREGATES.MAX_GROUP_BY / MAX_AGGREGATES, valeurs par défaut).
const MAX_GROUP_BY = 4;
const MAX_AGGREGATES = 20;

// Nom de colonne de sortie accepté pour un alias.
const ALIAS_PATTERN = /^[a-z_][a-z0-9_]*$/;

const NUMERIC_FAMILIES = new Set(['INTEGER', 'NUMBER']);
const TEMPORAL_FAMILIES = new Set(['DATE', 'TIMESTAMP']);

// Grains réservés aux horodatages : une DATE n'a pas d'heure à tronquer.
const SUB_DAY_GRAINS = new Set(['HOUR', 'MINUTE', 'SECOND']);

// Agrégations compatibles avec la famille de type de la mesure.
const allowedAggregations = (typeFamily) => {
  if (NUMERIC_FAMILIES.has(typeFamily)) return ['SUM', 'AVG', 'MEDIAN', 'MIN', 'MAX', 'MODE', 'COUNT'];
  if (TEMPORAL_FAMILIES.has(typeFamily)) return ['MIN', 'MAX', 'MODE', 'COUNT'];
  return ['MODE', 'COUNT'];
};

// Comparaison NULLS LAST (ordre par défaut de DuckDB, en ASC comme en DESC).
const compareNullsLast = (a, b, order) => {
  const aNull = a === null || a === undefined;
  const bNull = b === null || b === undefined;
  if (aNull || bNull) return aNull === bNull ? 0 : (aNull ? 1 : -1);
  const cmp = compare(a, b);
  return order === 'DESC' ? -cmp : cmp;
};

/**
 * Truncates a temporal value to a grain, like `date_trunc` (UTC, ISO week from Monday).
 *
 * @param {?string} value - ISO 8601 date or timestamp.
 * @param {string} grain - `TimeGrain` value.
 * @param {'DATE'|'TIMESTAMP'} typeFamily - Family of the group column.
 * @returns {?string} `YYYY-MM-DD` for a DATE, a full ISO timestamp otherwise; null for NULL.
 */
const truncateTime = (value, grain, typeFamily) => {
  if (value === null || value === undefined) return null;

  const isDate = typeFamily === 'DATE';
  const d = new Date(isDate ? `${String(value).slice(0, 10)}T00:00:00Z` : value);
  let [y, m, day] = [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
  let [h, mi, s] = [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()];

  // Chaque grain remet à zéro tout ce qui est plus fin que lui
  switch (grain) {
    case 'YEAR': m = 0; day = 1; h = 0; mi = 0; s = 0; break;
    case 'QUARTER': m -= m % 3; day = 1; h = 0; mi = 0; s = 0; break;
    case 'MONTH': day = 1; h = 0; mi = 0; s = 0; break;
    case 'WEEK': day -= (d.getUTCDay() + 6) % 7; h = 0; mi = 0; s = 0; break; // lundi ISO
    case 'DAY': h = 0; mi = 0; s = 0; break;
    case 'HOUR': mi = 0; s = 0; break;
    case 'MINUTE': s = 0; break;
    default: break; // SECOND : les millisecondes tombent seules avec Date.UTC ci-dessous
  }

  const truncated = new Date(Date.UTC(y, m, day, h, mi, s));
  return isDate ? truncated.toISOString().slice(0, 10) : truncated.toISOString();
};

// Médiane interpolée (quantile_cont 0.5 de DuckDB).
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

// Valeur la plus fréquente ; à égalité, la première rencontrée.
const mode = (values) => {
  const counts = new Map();
  let best = null;
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) ?? 0) + 1;
    counts.set(v, c);
    if (c > bestCount) { best = v; bestCount = c; }
  }
  return best;
};

// Réducteurs, appliqués aux valeurs NON NULLES d'un groupe : un groupe sans valeur
// donne null, sauf COUNT (0).
const REDUCERS = {
  SUM: (vs) => (vs.length ? vs.reduce((a, b) => a + b, 0) : null),
  AVG: (vs) => (vs.length ? vs.reduce((a, b) => a + b, 0) / vs.length : null),
  MEDIAN: (vs) => (vs.length ? median(vs) : null),
  MIN: (vs) => (vs.length ? vs.reduce((a, b) => (compare(b, a) < 0 ? b : a)) : null),
  MAX: (vs) => (vs.length ? vs.reduce((a, b) => (compare(b, a) > 0 ? b : a)) : null),
  MODE: (vs) => (vs.length ? mode(vs) : null),
  COUNT: (vs) => vs.length,
};

// Type DuckDB du résultat d'une agrégation.
const aggregateSqlType = (aggregation, field) => {
  if (aggregation === 'COUNT') return 'BIGINT';
  if (aggregation === 'AVG' || aggregation === 'MEDIAN') return 'DOUBLE';
  if (aggregation === 'SUM') return field.typeFamily === 'INTEGER' ? 'HUGEINT' : 'DOUBLE';
  return field.sqlType;
};

// Format d3 du résultat : celui de la mesure, sauf COUNT (`,d`) et la moyenne / médiane
// d'un entier dont le format finit par `d` (deux décimales : `,d` → `,.2f`).
const aggregateDisplayFormat = (aggregation, field) => {
  if (aggregation === 'COUNT') return ',d';
  const format = field.displayFormat;
  if (format && field.typeFamily === 'INTEGER' && (aggregation === 'AVG' || aggregation === 'MEDIAN')) {
    return format.endsWith('d') ? `${format.slice(0, -1)}.2f` : format;
  }
  return format ?? null;
};

// Le résultat d'une agrégation est-il numérique, temporel, ou ni l'un ni l'autre ?
const resultFamily = (aggregation, field) => {
  if (['COUNT', 'SUM', 'AVG', 'MEDIAN'].includes(aggregation)) return 'NUMBER';
  return field.typeFamily;
};

// [min, max] des valeurs non nulles d'une colonne numérique ou temporelle, sinon null.
const boundsOf = (values, typeFamily) => {
  if (!NUMERIC_FAMILIES.has(typeFamily) && !TEMPORAL_FAMILIES.has(typeFamily)) return null;
  const present = values.filter((v) => v !== null && v !== undefined);
  if (present.length === 0) return null;
  return [
    present.reduce((a, b) => (compare(b, a) < 0 ? b : a)),
    present.reduce((a, b) => (compare(b, a) > 0 ? b : a)),
  ];
};

// Colonne de libellés par défaut d'une colonne de codes : la seule, ou la première
// par ordre alphabétique (`labelFields` est déjà trié par nom).
const defaultLabelField = (field) => field.labelFields[0] ?? null;

// Libellé d'une option : celui de la colonne de libellés choisie, sinon le code lui-même.
const labelOf = (option, labelField) => (labelField ? option.labels?.[labelField] : undefined) ?? option.value;

// Profondeur d'un arbre (nombre de niveaux ; une liste de feuilles en a un).
const heightOf = (nodes) => 1 + Math.max(0, ...nodes.map((n) => (n.children ? heightOf(n.children) : 0)));

// Noeuds du niveau `level` (0 = racines) : retirer les niveaux du haut revient à
// promouvoir ce niveau en racines.
const nodesAtLevel = (nodes, level) => (
  level === 0 ? nodes : nodes.flatMap((n) => nodesAtLevel(n.children ?? [], level - 1))
);

/**
 * Builds the resolvers of the six operations on top of injected fixtures.
 *
 * @param {Object} fixtures - Fixture bindings.
 * @param {string} fixtures.catalogueId - Catalog id serving the documentary catalogue.
 * @param {{columns: string[], data: Object[], metadata: Object, columnsMetadata: Object[]}} fixtures.factTable
 *   Documentary catalogue (rows + its field metadata).
 * @param {{columns: string[], data: Object[], metadata: Object}} fixtures.CHART_FACT_TABLE - Macro rows.
 * @param {Object[]} fixtures.MACRO_CATALOG_SCHEMA - Macro field metadata.
 * @param {Object} fixtures.CATALOGUE_FIELD_STATS - Stats of the documentary catalogue, by column.
 * @param {Object} fixtures.MACRO_FIELD_STATS - Stats of the macro catalog, by column.
 * @param {Object} fixtures.MOCK_OPTIONS_BY_FIELD - Macro options, by column.
 * @param {Object} fixtures.MOCK_OPTIONS_TREES - Macro option trees, by deepest column.
 * @returns {Object} Resolvers keyed by GraphQL root field, each taking the field's arguments.
 */
export function createMockResolvers(fixtures) {
  const {
    catalogueId,
    factTable,
    CHART_FACT_TABLE,
    MACRO_CATALOG_SCHEMA,
    CATALOGUE_FIELD_STATS,
    MACRO_FIELD_STATS,
    MOCK_OPTIONS_BY_FIELD,
    MOCK_OPTIONS_TREES,
  } = fixtures;

  // Deux jeux de faits cohabitent : le catalogue documentaire (table) et le panel
  // macro (graphique, filtres). On les distingue comme le ferait l'API, par le
  // catalogue demandé.
  const catalogue = {
    table: factTable,
    schema: factTable.columnsMetadata,
    stats: CATALOGUE_FIELD_STATS,
    options: {},
    trees: {},
  };
  const macro = {
    table: CHART_FACT_TABLE,
    schema: MACRO_CATALOG_SCHEMA,
    stats: MACRO_FIELD_STATS,
    options: MOCK_OPTIONS_BY_FIELD,
    trees: MOCK_OPTIONS_TREES,
  };

  const datasetOf = (catalog) => (catalog === catalogueId ? catalogue : macro);

  const fieldOf = (dataset, fieldName) => {
    const field = dataset.schema.find((f) => f.name === fieldName);
    if (!field) throw badUserInput(`Colonne inconnue : « ${fieldName} ».`);
    return field;
  };

  // `Metadata` complète : la fixture du champ + ses statistiques (Metadata.stats).
  const withStats = (dataset, field) => ({ ...field, stats: dataset.stats[field.name] ?? null });

  // Valeurs distinctes d'une colonne : la fixture d'options si elle existe, sinon
  // dérivées des lignes (catalogue documentaire), triées comme DuckDB.
  const optionsOf = (dataset, fieldName) => {
    if (dataset.options[fieldName]) return dataset.options[fieldName];

    const distinct = new Set(
      dataset.table.data.map((row) => row[fieldName]).filter((v) => v !== null && v !== undefined),
    );
    return [...distinct].sort(compare).map((value) => ({ value: String(value) }));
  };

  // Périmètre des options : valeurs de `fieldName` portées par au moins une ligne qui
  // satisfait `structuredFilters` (même évaluateur, même validation que getFieldStats).
  // null = aucune restriction : pas de filtre, ou colonne absente des lignes des fixtures
  // (même règle que getFieldStats : on n'invente pas ce qu'un filtre y laisserait).
  // Comparées en texte : `value` d'une option est le code converti en chaîne.
  const scopedValues = (dataset, fieldName, structuredFilters) => {
    if (structuredFilters === null || structuredFilters === undefined) return null;
    const { columns, data } = dataset.table;
    const rows = applyFilterNode(data, structuredFilters, (name) => fieldOf(dataset, name));
    if (!columns.includes(fieldName)) return null;
    return new Set(rows.map((row) => row[fieldName]).filter((v) => v !== null && v !== undefined).map(String));
  };

  // La recherche porte sur le code OU sur le libellé, sans tenir compte de la casse.
  const matches = (option, label, term) => (
    option.value.toLowerCase().includes(term) || label.toLowerCase().includes(term)
  );

  // Chaîne de colonnes de la racine à `fieldName`, en remontant `parentName`.
  const chainOf = (dataset, fieldName) => {
    const chain = [];
    for (let name = fieldName; name; name = fieldOf(dataset, name).parentName) chain.unshift(name);
    return chain;
  };

  return {
    getFactTableWithMetadata: ({ catalog, structuredFilters, limit = 100, offset = 0, sort, format = 'OBJECTS' }) => {
      const dataset = datasetOf(catalog);
      const { columns, data, metadata } = dataset.table;

      // `fields` suit `columns` (mêmes noms, même ordre) ; comme l'API, une colonne
      // sans métadonnée est une erreur explicite, pas un trou silencieux.
      const fields = columns.map((name) => withStats(dataset, fieldOf(dataset, name)));

      // Filtre AVANT tri et pagination : `total` compte les lignes retenues, comme l'API.
      const matching = applyFilterNode(data, structuredFilters, (name) => fieldOf(dataset, name));
      const rows = applySort(matching, sort).slice(offset, offset + limit);

      return {
        columns,
        fields,
        data: format === 'ARRAYS' ? rows.map((row) => columns.map((column) => row[column])) : rows,
        metadata: {
          count: rows.length,
          extents: pageExtents(rows, fields),
          total: matching.length,
          hasNextPage: offset + limit < matching.length,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.max(1, Math.ceil(matching.length / limit)),
          generatedAt: metadata.generatedAt,
        },
      };
    },

    getCatalogSchema: ({ catalog }) => {
      const dataset = datasetOf(catalog);
      return dataset.schema.map((field) => withStats(dataset, field));
    },

    getSelectOptions: ({ catalog, fieldName, limit = 50, searchTerm = '', labelField, structuredFilters }) => {
      const dataset = datasetOf(catalog);
      const field = fieldOf(dataset, fieldName);

      if (labelField && !field.labelFields.includes(labelField)) {
        throw badUserInput(`« ${labelField} » n'est pas une colonne de libellés de « ${fieldName} ».`);
      }

      const column = labelField ?? defaultLabelField(field);
      const term = (searchTerm ?? '').trim().toLowerCase();
      // Le filtre restreint les valeurs AVANT la recherche et la limite, comme l'API
      const scope = scopedValues(dataset, fieldName, structuredFilters);

      return optionsOf(dataset, fieldName)
        .filter((option) => !scope || scope.has(option.value))
        .map((option) => ({ option, label: labelOf(option, column) }))
        .filter(({ option, label }) => !term || matches(option, label, term))
        .slice(0, limit)
        .map(({ option, label }) => ({ value: option.value, label }));
    },

    getSelectOptionsTree: ({ catalog, fieldName, maxDepth, searchTerm, structuredFilters }) => {
      const dataset = datasetOf(catalog);
      fieldOf(dataset, fieldName);

      if (maxDepth !== null && maxDepth !== undefined && maxDepth < 1) {
        throw badUserInput('maxDepth doit être supérieur ou égal à 1.');
      }

      const chain = chainOf(dataset, fieldName);
      const term = (searchTerm ?? '').trim().toLowerCase();
      const scope = scopedValues(dataset, fieldName, structuredFilters);

      // Une fixture d'arbre couvre toute la chaîne ; sans elle, la colonne donne un
      // arbre à un seul niveau (liste de feuilles).
      const source = dataset.trees[fieldName] ?? optionsOf(dataset, fieldName);
      const height = heightOf(source);

      // Chaque niveau lit son libellé dans SA colonne de libellés (règle par défaut).
      // La recherche et le filtre portent sur le niveau de `fieldName` : on garde les
      // feuilles retenues et leurs ancêtres, on élague les autres branches.
      const render = (nodes, level) => nodes.flatMap((node) => {
        const labelField = defaultLabelField(fieldOf(dataset, chain[level]));
        const label = labelOf(node, labelField);

        if (!node.children) {
          const kept = (!scope || scope.has(node.value)) && (!term || matches(node, label, term));
          return kept ? [{ value: node.value, label }] : [];
        }

        const children = render(node.children, level + 1);
        return children.length === 0 ? [] : [{ value: node.value, label, children }];
      });

      const tree = render(source, chain.length - height);

      // `maxDepth` : nombre de niveaux conservés en remontant depuis `fieldName`.
      return nodesAtLevel(tree, height - Math.min(maxDepth ?? height, height));
    },

    getFieldStats: ({ catalog, fieldName, structuredFilters }) => {
      const dataset = datasetOf(catalog);
      fieldOf(dataset, fieldName);

      const global = dataset.stats[fieldName] ?? { min: null, max: null, distinctCount: 0, nullCount: 0 };
      if (structuredFilters === null || structuredFilters === undefined) return global;

      // Avec un filtre, les stats se recalculent sur les lignes retenues (validées comme
      // le fait l'API). Une colonne absente des lignes des fixtures garde ses stats
      // globales : on ne peut pas inventer ce qu'un filtre y laisserait.
      const { columns, data } = dataset.table;
      const rows = applyFilterNode(data, structuredFilters, (name) => fieldOf(dataset, name));
      if (!columns.includes(fieldName)) return global;

      const values = rows.map((row) => row[fieldName]).filter((v) => v !== null && v !== undefined);
      return {
        min: values.length ? values.reduce((a, b) => (b < a ? b : a)) : null,
        max: values.length ? values.reduce((a, b) => (b > a ? b : a)) : null,
        distinctCount: new Set(values).size,
        nullCount: rows.length - values.length,
      };
    },

    getAggregates: ({
      catalog, groupBy = [], aggregates, structuredFilters, sort,
      limit = 100, offset = 0, format = 'OBJECTS', includeRowCount = true,
    }) => {
      const dataset = datasetOf(catalog);
      groupBy = groupBy ?? [];

      // ── Validation des arguments, comme le constructeur SQL de l'API ──────────
      if (groupBy.length > MAX_GROUP_BY) {
        throw badUserInput(`groupBy accepte au plus ${MAX_GROUP_BY} colonnes.`);
      }
      if (!aggregates || aggregates.length === 0 || aggregates.length > MAX_AGGREGATES) {
        throw badUserInput(`aggregates attend de 1 à ${MAX_AGGREGATES} agrégats.`);
      }

      // Colonnes de groupe : grain réservé aux dates, colonne de libellés sans grain.
      const groups = groupBy.map(({ field: name, grain = null }) => {
        const field = fieldOf(dataset, name);
        if (grain && (!TEMPORAL_FAMILIES.has(field.typeFamily)
          || (field.typeFamily === 'DATE' && SUB_DAY_GRAINS.has(grain)))) {
          throw badUserInput(`Le grain ${grain} ne s'applique pas à la colonne « ${name} » (${field.sqlType}).`);
        }
        const labelField = grain ? null : defaultLabelField(field);
        return { name, grain: grain ?? null, field, labelField, labelColumn: labelField ? `${name}__label` : null };
      });
      if (new Set(groups.map((g) => g.name)).size !== groups.length) {
        throw badUserInput('Une colonne apparaît au plus une fois dans groupBy.');
      }

      // Agrégats : agrégation effective (argument, sinon defaultAggregation, sinon SUM
      // pour une mesure numérique seulement), compatibilité avec la famille, alias.
      const columnsOut = aggregates.map(({ measure, aggregation, alias }) => {
        const field = fieldOf(dataset, measure);
        const effective = aggregation
          ?? field.defaultAggregation
          ?? (NUMERIC_FAMILIES.has(field.typeFamily) ? 'SUM' : null);
        if (!effective) {
          throw badUserInput(`La mesure « ${measure} » n'est pas numérique : précisez son agrégation.`);
        }
        const allowed = allowedAggregations(field.typeFamily);
        if (!allowed.includes(effective)) {
          throw badUserInput(`${effective} ne s'applique pas à « ${measure} » ; autorisées : ${allowed.join(', ')}.`);
        }
        const name = alias ?? `${measure}_${effective.toLowerCase()}`;
        if (!ALIAS_PATTERN.test(name)) throw badUserInput(`Alias invalide : « ${name} ».`);
        return { name, measure, aggregation: effective, field };
      });

      // Noms de sortie uniques ; en LONG, `measure` et `value` sont réservés.
      const outputNames = [
        ...groups.map((g) => g.name),
        ...groups.filter((g) => g.labelColumn).map((g) => g.labelColumn),
        ...columnsOut.map((a) => a.name),
        ...(includeRowCount ? ['row_count'] : []),
      ];
      if (new Set(outputNames).size !== outputNames.length) {
        throw badUserInput('Les noms des colonnes de sortie doivent être uniques.');
      }
      if (format === 'LONG' && groups.some((g) => ['measure', 'value'].includes(g.name) || ['measure', 'value'].includes(g.labelColumn))) {
        throw badUserInput('En format LONG, une colonne de groupe ne peut pas s\'appeler measure ou value.');
      }
      for (const { by } of sort ?? []) {
        if (!outputNames.includes(by)) throw badUserInput(`Tri sur une colonne inconnue : « ${by} ».`);
      }

      // ── Regroupement sur TOUT le jeu filtré (jamais une page de lignes) ──────
      const matching = applyFilterNode(dataset.table.data, structuredFilters, (name) => fieldOf(dataset, name));
      const keyed = new Map();
      for (const row of matching) {
        const values = groups.map((g) => {
          const v = row[g.name] ?? null;
          return g.grain ? truncateTime(v, g.grain, g.field.typeFamily) : v;
        });
        const key = JSON.stringify(values);
        if (!keyed.has(key)) keyed.set(key, { values, rows: [] });
        keyed.get(key).rows.push(row);
      }
      // Sans groupBy : un agrégat global, une ligne même quand aucune ligne ne passe.
      if (groups.length === 0 && keyed.size === 0) keyed.set('[]', { values: [], rows: [] });

      // Une ligne OBJECTS par groupe : colonnes de groupe, libellés (ANY_VALUE), alias, row_count.
      const objects = [...keyed.values()].map(({ values, rows }) => {
        const out = {};
        groups.forEach((g, i) => { out[g.name] = values[i]; });
        for (const g of groups) {
          if (!g.labelColumn) continue;
          out[g.labelColumn] = rows.map((r) => r[g.labelField]).find((v) => v !== null && v !== undefined) ?? null;
        }
        for (const a of columnsOut) {
          const present = rows.map((r) => r[a.measure]).filter((v) => v !== null && v !== undefined);
          out[a.name] = REDUCERS[a.aggregation](present);
        }
        if (includeRowCount) out.row_count = rows.length;
        return out;
      });

      // Tri demandé, puis chaque colonne de groupe en ordre croissant (départage).
      const order = [
        ...(sort ?? []).map(({ by, order: o = 'ASC' }) => ({ by, order: o })),
        ...groups.map((g) => ({ by: g.name, order: 'ASC' })),
      ];
      objects.sort((a, b) => {
        for (const { by, order: o } of order) {
          const cmp = compareNullsLast(a[by], b[by], o);
          if (cmp !== 0) return cmp;
        }
        return 0;
      });
      const page = objects.slice(offset, offset + limit);

      // ── Sérialisation ────────────────────────────────────────────────────────
      const labelColumns = groups.filter((g) => g.labelColumn).map((g) => g.labelColumn);
      const groupColumns = [...groups.map((g) => g.name), ...labelColumns];
      const rowCount = includeRowCount ? ['row_count'] : [];
      let columns;
      let data;
      if (format === 'LONG') {
        // Une ligne par (groupe, agrégat), dans l'ordre des agrégats : OBJECTS fondu sur les alias.
        columns = [...groupColumns, ...rowCount, 'measure', 'value'];
        data = page.flatMap((row) => columnsOut.map((a) => {
          const out = {};
          for (const c of [...groupColumns, ...rowCount]) out[c] = row[c];
          return { ...out, measure: a.name, value: row[a.name] };
        }));
      } else {
        columns = [...groupColumns, ...columnsOut.map((a) => a.name), ...rowCount];
        data = format === 'ARRAYS' ? page.map((row) => columns.map((c) => row[c])) : page.map((row) => {
          const out = {};
          for (const c of columns) out[c] = row[c];
          return out;
        });
      }

      return {
        groupBy: groups.map((g) => ({
          name: g.name,
          grain: g.grain,
          labelColumn: g.labelColumn,
          field: withStats(dataset, g.field),
          extent: boundsOf(page.map((row) => row[g.name]), g.field.typeFamily),
        })),
        aggregates: columnsOut.map((a) => ({
          alias: a.name,
          measure: a.measure,
          aggregation: a.aggregation,
          sqlType: aggregateSqlType(a.aggregation, a.field),
          unit: a.aggregation === 'COUNT' ? null : a.field.unit,
          displayFormat: aggregateDisplayFormat(a.aggregation, a.field),
          field: withStats(dataset, a.field),
          extent: boundsOf(page.map((row) => row[a.name]), resultFamily(a.aggregation, a.field)),
        })),
        columns,
        data,
        total: objects.length,
        hasNextPage: offset + limit < objects.length,
        generatedAt: dataset.table.metadata?.generatedAt ?? new Date(0).toISOString(),
      };
    },
  };
}
