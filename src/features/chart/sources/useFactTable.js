import { useEffect, useState } from 'react';

// =================================================================
// SOURCE — FACT TABLE (lignes de faits au format long)
// =================================================================
// Imite `getFactTableWithMetadata(fields, structuredFilters, limit, offset, sort,
// format: OBJECTS, catalog, schema)` de l'API GraphQL, qui renvoie
// `{ columns, data, metadata }` où `data` est un tableau d'OBJETS clé = nom de
// colonne. C'est EXACTEMENT le format long attendu par <Chart> : les lignes sont
// passées TELLES QUELLES (`rows`), sans reformatage — <Chart> détecte les types
// et `coerce()` convertit les dates ISO (`new Date(...)`). `metadata.extents`
// donne les bornes par colonne, utilisables pour fixer les domaines d'axes sans
// re-parcourir les données (cf. plus bas).
//
// Même cycle mock→API que filter/sources/useVariableMetadata.js : le jeu mock
// ci-dessous sert de repli tant que le client GraphQL n'est pas branché (bloc réel
// commenté). `catalog` / `schema` restent les coordonnées ducklake d'accès,
// transmises via les en-têtes X-Catalog-Id / X-Schema-Id.

// ── Jeu mock (format OBJECTS) ──
// Croissance trimestrielle du PIB par pays : x = date (chaîne ISO), y = num,
// hue = catégoriel. `date_obs` arrive en chaîne ISO — c'est `coerce()` qui la
// transforme en Date côté <Chart>, PAS cette source (démonstration du passage
// direct des lignes de l'API au graphique).
export const MOCK_COLUMNS = ['date_obs', 'country', 'gdp'];

export const MOCK_ROWS = [
  { date_obs: '2023-01-01', country: 'France',    gdp: 100.0 },
  { date_obs: '2023-04-01', country: 'France',    gdp: 100.8 },
  { date_obs: '2023-07-01', country: 'France',    gdp: 101.3 },
  { date_obs: '2023-10-01', country: 'France',    gdp: 102.1 },
  { date_obs: '2024-01-01', country: 'France',    gdp: 102.9 },
  { date_obs: '2024-04-01', country: 'France',    gdp: 103.4 },
  { date_obs: '2023-01-01', country: 'Allemagne', gdp: 110.0 },
  { date_obs: '2023-04-01', country: 'Allemagne', gdp: 110.4 },
  { date_obs: '2023-07-01', country: 'Allemagne', gdp: 109.8 },
  { date_obs: '2023-10-01', country: 'Allemagne', gdp: 110.6 },
  { date_obs: '2024-01-01', country: 'Allemagne', gdp: 111.5 },
  { date_obs: '2024-04-01', country: 'Allemagne', gdp: 112.2 },
  { date_obs: '2023-01-01', country: 'Italie',    gdp: 98.0 },
  { date_obs: '2023-04-01', country: 'Italie',    gdp: 98.6 },
  { date_obs: '2023-07-01', country: 'Italie',    gdp: 99.1 },
  { date_obs: '2023-10-01', country: 'Italie',    gdp: 99.9 },
  { date_obs: '2024-01-01', country: 'Italie',    gdp: 100.7 },
  { date_obs: '2024-04-01', country: 'Italie',    gdp: 101.2 },
];

// Métadonnées mock : `extents` donne [min, max] par colonne (pour les mesures) et
// [premier, dernier] pour les dimensions catégorielles — le même contenu que le
// champ `metadata.extents` de l'API. Voir l'usage optionnel plus bas.
export const MOCK_METADATA = {
  count: MOCK_ROWS.length,
  extents: {
    date_obs: ['2023-01-01', '2024-04-01'],
    country: ['France', 'Italie'],
    gdp: [98.0, 112.2],
  },
  total: MOCK_ROWS.length,
  hasNextPage: false,
  currentPage: 1,
  totalPages: 1,
  generatedAt: new Date(0).toISOString(),
};

/**
 * Fetches a long-format fact table ready to feed <Chart> (`format: OBJECTS`).
 *
 * Mirrors {@link useVariableMetadata}: an effect resolves the request asynchronously
 * and stores the result in state, while `loading` is derived during render from a
 * request-key comparison (no synchronous setState in the effect — Rules of Hooks v6).
 * By default returns the local mock; swap it for the GraphQL call
 * `getFactTableWithMetadata` (see the commented block).
 *
 * The returned `rows` are passed AS-IS to `<Chart data={rows} />`: no reshaping —
 * ISO date strings are coerced by the chart itself. `metadata.extents` can
 * optionally pin axis domains without re-scanning the rows (see below).
 *
 * @param {Object}   [params]
 * @param {string[]} [params.fields] - Columns to select (mock: ignored).
 * @param {Array}    [params.structuredFilters] - `[{ key, operator, value|values }]` (mock: ignored).
 * @param {number}   [params.limit=100] - Page size, max 1000 (mock: ignored).
 * @param {number}   [params.offset=0] - Row offset, max 10000 (mock: ignored).
 * @param {Array}    [params.sort] - `[{ field, order }]` (mock: ignored).
 * @param {string}   [params.catalog] - Ducklake catalog → header X-Catalog-Id.
 * @param {string}   [params.schema]  - Ducklake schema → header X-Schema-Id.
 * @returns {{ columns: string[], rows: Array<object>, metadata: object|null, loading: boolean, error: (Error|null) }}
 */
export function useFactTable({
  fields, structuredFilters, limit = 100, offset = 0, sort, catalog, schema,
} = {}) {
  // État du résultat courant. `key` identifie le jeu d'inputs qui l'a produit :
  // on s'en sert pour dériver `loading` sans setState synchrone dans l'effet
  // (interdit par les Rules of Hooks v6 — règle set-state-in-effect).
  const [result, setResult] = useState({
    key: null, columns: MOCK_COLUMNS, rows: MOCK_ROWS, metadata: MOCK_METADATA, error: null,
  });

  // Clé de requête : sérialise tous les paramètres qui invalident le cache.
  const requestKey = JSON.stringify({ fields, structuredFilters, limit, offset, sort, catalog, schema });

  useEffect(() => {
    // Garde d'annulation : ignore la réponse si les inputs ont changé entre-temps.
    let cancelled = false;
    const key = JSON.stringify({ fields, structuredFilters, limit, offset, sort, catalog, schema });

    // --- Fallback mock : résolu en asynchrone pour exercer le même cycle
    //     loading→données que l'API GraphQL réelle. ---
    const promise = Promise.resolve({ columns: MOCK_COLUMNS, data: MOCK_ROWS, metadata: MOCK_METADATA });

    // ====================================================================
    // INTÉGRATION GRAPHQL RÉELLE — à décommenter pour brancher l'API
    // ====================================================================
    // Prérequis : un client GraphQL (ex: @apollo/client ou graphql-request),
    // non installé à ce jour. Définir la fonction de requête ci-dessous (idéalement
    // dans `src/features/chart/sources/`), puis REMPLACER le `const promise = ...`
    // du fallback mock ci-dessus par :
    //
    //   const promise = getFactTableWithMetadata({
    //     fields, structuredFilters, limit, offset, sort, format: 'OBJECTS', catalog, schema,
    //   });
    //
    // Exemple d'implémentation (graphql-request) :
    //
    //   import { request, gql } from 'graphql-request';
    //   const ENDPOINT = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
    //
    //   const FACT_TABLE = gql`
    //     query GetFactTableWithMetadata(
    //       $fields: [String!], $structuredFilters: [Filter],
    //       $limit: Int!, $offset: Int!, $sort: [SortInput!],
    //       $format: DataFormat = OBJECTS, $catalog: String, $schema: String
    //     ) {
    //       getFactTableWithMetadata(
    //         fields: $fields, structuredFilters: $structuredFilters,
    //         limit: $limit, offset: $offset, sort: $sort,
    //         format: $format, catalog: $catalog, schema: $schema
    //       ) {
    //         columns
    //         data
    //         metadata { count extents total hasNextPage currentPage totalPages generatedAt }
    //       }
    //     }`;
    //   export async function getFactTableWithMetadata(vars) {
    //     // `catalog` / `schema` sont routés via les en-têtes ducklake (surcharge
    //     // les valeurs par défaut du serveur), en plus des arguments de requête.
    //     const headers = {
    //       ...(vars.catalog ? { 'X-Catalog-Id': vars.catalog } : {}),
    //       ...(vars.schema ? { 'X-Schema-Id': vars.schema } : {}),
    //     };
    //     const res = await request(ENDPOINT, FACT_TABLE, vars, headers);
    //     return res.getFactTableWithMetadata; // -> { columns, data, metadata }
    //   }
    //
    // `data` (format OBJECTS) est directement le tableau de lignes long attendu par
    // <Chart> : AUCUN reformatage. Le cycle { loading, error } est déjà câblé —
    // `loading` se déduit de la comparaison de clés (plus bas), `error` du .catch.
    // ====================================================================

    promise
      .then((res) => {
        if (cancelled) return;
        setResult({
          key,
          columns: res?.columns ?? [],
          rows: res?.data ?? [],
          metadata: res?.metadata ?? null,
          error: null,
        });
      })
      .catch((err) => {
        if (!cancelled) setResult({ key, columns: [], rows: [], metadata: null, error: err });
      });

    return () => { cancelled = true; };
  }, [requestKey, fields, structuredFilters, limit, offset, sort, catalog, schema]);

  // `loading` dérivé : vrai tant que le résultat stocké ne correspond pas aux inputs courants.
  const loading = result.key !== requestKey;

  // ── Usage optionnel de metadata.extents ───────────────────────────────────
  // Pour fixer les domaines d'axes SANS re-parcourir `rows`, on peut lire
  // `metadata.extents[colName]` = [min, max] (mesures) ou [premier, dernier]
  // (dimensions). Exemple, à passer à <Chart> une fois le prop `domains` supporté :
  //
  //   const gdpDomain = metadata?.extents?.gdp;      // -> [98.0, 112.2]
  //   <Chart data={rows} x="date_obs" y="gdp" domains={{ y: gdpDomain }} … />
  //
  // <Chart> dérive aujourd'hui ses domaines des données ; `extents` reste dispo
  // pour coordonner plusieurs graphiques sur une échelle commune sans recalcul.

  return {
    columns: result.columns,
    rows: result.rows,
    metadata: result.metadata,
    loading,
    error: result.error,
  };
}
