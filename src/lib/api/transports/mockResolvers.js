// =================================================================
// RÉSOLVEURS MOCK — LOGIQUE PARTAGÉE
// =================================================================
// UNE implémentation des cinq opérations de l'API consommées par le template
// (getFactTableWithMetadata, getCatalogSchema, getSelectOptions,
// getSelectOptionsTree, getFieldStats), appuyée sur les fixtures de
// src/lib/api/fixtures/. Elle sert deux consommateurs :
//   - le transport en mémoire (transports/mock.js), via le bundler ;
//   - le serveur `npm run mock:api` (scripts/mock-api-server.js), via `import()`.
// Pour que Node puisse charger ce fichier sans bundler, il n'importe RIEN : les
// fixtures lui sont injectées (`createMockResolvers`). Les deux modes affichent
// ainsi des données strictement identiques.
//
// Fidèle au contrat 0.3.0 sur ce qui se voit côté interface ; non appliqués (les
// fixtures tiennent en une page) : `structuredFilters` de toutes les opérations
// et la projection `fields` de getFactTableWithMetadata.

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
 * Builds the resolvers of the five operations on top of injected fixtures.
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
    getFactTableWithMetadata: ({ catalog, limit = 100, offset = 0, sort, format = 'OBJECTS' }) => {
      const dataset = datasetOf(catalog);
      const { columns, data, metadata } = dataset.table;

      // `fields` suit `columns` (mêmes noms, même ordre) ; comme l'API, une colonne
      // sans métadonnée est une erreur explicite, pas un trou silencieux.
      const fields = columns.map((name) => withStats(dataset, fieldOf(dataset, name)));

      const rows = applySort(data, sort).slice(offset, offset + limit);

      return {
        columns,
        fields,
        data: format === 'ARRAYS' ? rows.map((row) => columns.map((column) => row[column])) : rows,
        metadata: {
          count: rows.length,
          extents: pageExtents(rows, fields),
          total: data.length,
          hasNextPage: offset + limit < data.length,
          currentPage: Math.floor(offset / limit) + 1,
          totalPages: Math.max(1, Math.ceil(data.length / limit)),
          generatedAt: metadata.generatedAt,
        },
      };
    },

    getCatalogSchema: ({ catalog }) => {
      const dataset = datasetOf(catalog);
      return dataset.schema.map((field) => withStats(dataset, field));
    },

    getSelectOptions: ({ catalog, fieldName, limit = 50, searchTerm = '', labelField }) => {
      const dataset = datasetOf(catalog);
      const field = fieldOf(dataset, fieldName);

      if (labelField && !field.labelFields.includes(labelField)) {
        throw badUserInput(`« ${labelField} » n'est pas une colonne de libellés de « ${fieldName} ».`);
      }

      const column = labelField ?? defaultLabelField(field);
      const term = (searchTerm ?? '').trim().toLowerCase();

      return optionsOf(dataset, fieldName)
        .map((option) => ({ option, label: labelOf(option, column) }))
        .filter(({ option, label }) => !term || matches(option, label, term))
        .slice(0, limit)
        .map(({ option, label }) => ({ value: option.value, label }));
    },

    getSelectOptionsTree: ({ catalog, fieldName, maxDepth, searchTerm }) => {
      const dataset = datasetOf(catalog);
      fieldOf(dataset, fieldName);

      if (maxDepth !== null && maxDepth !== undefined && maxDepth < 1) {
        throw badUserInput('maxDepth doit être supérieur ou égal à 1.');
      }

      const chain = chainOf(dataset, fieldName);
      const term = (searchTerm ?? '').trim().toLowerCase();

      // Une fixture d'arbre couvre toute la chaîne ; sans elle, la colonne donne un
      // arbre à un seul niveau (liste de feuilles).
      const source = dataset.trees[fieldName] ?? optionsOf(dataset, fieldName);
      const height = heightOf(source);

      // Chaque niveau lit son libellé dans SA colonne de libellés (règle par défaut).
      // La recherche porte sur le niveau de `fieldName` : on garde les feuilles qui
      // correspondent et leurs ancêtres, on élague les autres branches.
      const render = (nodes, level) => nodes.flatMap((node) => {
        const labelField = defaultLabelField(fieldOf(dataset, chain[level]));
        const label = labelOf(node, labelField);

        if (!node.children) {
          return !term || matches(node, label, term) ? [{ value: node.value, label }] : [];
        }

        const children = render(node.children, level + 1);
        return children.length === 0 ? [] : [{ value: node.value, label, children }];
      });

      const tree = render(source, chain.length - height);

      // `maxDepth` : nombre de niveaux conservés en remontant depuis `fieldName`.
      return nodesAtLevel(tree, height - Math.min(maxDepth ?? height, height));
    },

    getFieldStats: ({ catalog, fieldName }) => {
      const dataset = datasetOf(catalog);
      fieldOf(dataset, fieldName);

      return dataset.stats[fieldName] ?? { min: null, max: null, distinctCount: 0, nullCount: 0 };
    },
  };
}
