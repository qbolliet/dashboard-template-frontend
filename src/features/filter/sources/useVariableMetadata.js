import { useEffect, useState } from 'react';

// =================================================================
// SOURCE — VARIABLE METADATA (métadonnées de champs)
// =================================================================
// Imite `getVariableMetadata(catalog, schema)` de l'API GraphQL, qui renvoie la liste
// des champs avec leurs métadonnées { name, label, python_type, sql_type,
// is_categorical, is_primary_key } depuis la `metadata_table`. Ces métadonnées
// pilotent DIRECTEMENT le CriterionMenu (type de champ, opérations, widget) sans type
// intermédiaire. `catalog` / `schema` restent les coordonnées ducklake d'accès.
//
// Même cycle mock→API que SelectMenu/useSelectOptions.js : le dico ci-dessous sert
// de repli tant que le client GraphQL n'est pas branché (bloc réel commenté).

// ── Métadonnées mock (jeu de démonstration) ──
// sql_type = type PostgreSQL renvoyé par l'API ; is_categorical distingue les
// dimensions (SelectMenu + options) des mesures continues.
export const MOCK_METADATA = [
  // Mesures continues (double precision)
  { name: 'gdp',        label: 'Croissance du PIB (%)',        python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'inflation',  label: "Taux d'inflation (%)",         python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'chomage',    label: 'Taux de chômage (%)',          python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'dette_pib',  label: 'Dette publique / PIB (%)',     python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'prod_indus', label: 'Production industrielle (idx)', python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },
  { name: 'taux_dir',   label: 'Taux directeur (%)',           python_type: 'float', sql_type: 'double precision', is_categorical: false, is_primary_key: false },

  // Dates
  { name: 'date_obs', label: "Date d'observation",   python_type: 'date', sql_type: 'date', is_categorical: false, is_primary_key: false },
  { name: 'date_pub', label: 'Date de publication',  python_type: 'date', sql_type: 'date', is_categorical: false, is_primary_key: false },
  { name: 'date_rev', label: 'Date de révision',     python_type: 'date', sql_type: 'date', is_categorical: false, is_primary_key: false },
  { name: 'date_maj', label: 'Date de mise à jour',  python_type: 'date', sql_type: 'date', is_categorical: false, is_primary_key: false },

  // Dimensions catégorielles (character varying, is_categorical)
  { name: 'indicator', label: 'Indicateur',         python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'sector',    label: "Secteur d'activité", python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'region',    label: 'Région',             python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'type_orga', label: "Type d'organisme",   python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'frequence', label: 'Fréquence',          python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },
  { name: 'country',   label: 'Pays',               python_type: 'str', sql_type: 'character varying', is_categorical: true, is_primary_key: false },

  // Champs texte libre (non catégoriels)
  { name: 'libelle',    label: 'Libellé',    python_type: 'str', sql_type: 'text', is_categorical: false, is_primary_key: false },
  { name: 'commentaire', label: 'Commentaire', python_type: 'str', sql_type: 'text', is_categorical: false, is_primary_key: false },
  { name: 'source',     label: 'Source',     python_type: 'str', sql_type: 'text', is_categorical: false, is_primary_key: false },
  { name: 'note',       label: 'Note libre', python_type: 'str', sql_type: 'text', is_categorical: false, is_primary_key: false },
];

/**
 * Maps API field metadata to the `variables` shape consumed by CriterionMenu /
 * MultiCriterionMenu : `{ value, label, sql_type, is_categorical }` (value = field name).
 *
 * @param {Array} fields - Metadata list from {@link useVariableMetadata}.
 * @returns {{value: string, label: string, sql_type: string, is_categorical: boolean}[]}
 */
export function metadataToVariables(fields = []) {
  return fields.map((f) => ({
    value: f.name,
    label: f.label,
    sql_type: f.sql_type,
    is_categorical: f.is_categorical,
  }));
}

/**
 * Fetches the field metadata of a catalog/schema (rows of the `metadata_table`).
 *
 * Mirrors {@link useSelectOptions}: an effect resolves the request asynchronously and
 * stores the result in state, while `loading` is derived during render from a
 * request-key comparison. By default returns the local mock; swap it for the GraphQL
 * call `getVariableMetadata` (see the commented block).
 *
 * @param {Object}  [params]
 * @param {string}  [params.catalog] - Ducklake catalog (mock: ignored).
 * @param {string}  [params.schema]  - Ducklake schema (mock: ignored).
 * @returns {{ fields: Array, loading: boolean, error: (Error|null) }}
 */
export function useVariableMetadata({ catalog, schema } = {}) {
  // État du résultat courant. `key` identifie le jeu d'inputs qui l'a produit :
  // on s'en sert pour dériver `loading` sans setState synchrone dans l'effet
  // (interdit par les Rules of Hooks v6 — règle set-state-in-effect).
  const [result, setResult] = useState({ key: null, fields: MOCK_METADATA, error: null });

  const requestKey = `${catalog}|${schema}`;

  useEffect(() => {
    // Garde d'annulation : ignore la réponse si les inputs ont changé entre-temps.
    let cancelled = false;
    const key = `${catalog}|${schema}`;

    // --- Fallback mock : résolu en asynchrone pour exercer le même cycle
    //     loading→données que l'API GraphQL réelle. ---
    const promise = Promise.resolve(MOCK_METADATA);

    // ====================================================================
    // INTÉGRATION GRAPHQL RÉELLE — à décommenter pour brancher l'API
    // ====================================================================
    // Prérequis : un client GraphQL (ex: @apollo/client ou graphql-request),
    // non installé à ce jour. Définir la fonction de requête ci-dessous (idéalement
    // dans `src/features/filter/sources/`), puis REMPLACER le `const promise = ...`
    // du fallback mock ci-dessus par :
    //
    //   const promise = getVariableMetadata({ catalog, schema });
    //
    // Exemple d'implémentation (graphql-request) :
    //
    //   import { request, gql } from 'graphql-request';
    //   const ENDPOINT = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/graphql';
    //
    //   const VARIABLE_METADATA = gql`
    //     query GetVariableMetadata($catalog: String, $schema: String) {
    //       getVariableMetadata(catalog: $catalog, schema: $schema) {
    //         name label python_type sql_type is_categorical is_primary_key
    //       }
    //     }`;
    //   export async function getVariableMetadata({ catalog, schema }) {
    //     const headers = catalog ? { 'X-Catalog-Id': catalog } : {};
    //     const data = await request(ENDPOINT, VARIABLE_METADATA, { catalog, schema }, headers);
    //     return data.getVariableMetadata; // -> [{ name, label, python_type, sql_type, is_categorical, is_primary_key }]
    //   }
    //
    // Le cycle { loading, error } est déjà câblé : `loading` se déduit de la
    // comparaison de clés (plus bas), `error` est renseigné par le .catch ci-dessous.
    // ====================================================================

    promise
      .then((fields) => { if (!cancelled) setResult({ key, fields: fields ?? [], error: null }); })
      .catch((err) => { if (!cancelled) setResult({ key, fields: [], error: err }); });

    return () => { cancelled = true; };
  }, [catalog, schema]);

  // `loading` dérivé : vrai tant que le résultat stocké ne correspond pas aux inputs courants.
  const loading = result.key !== requestKey;

  return { fields: result.fields, loading, error: result.error };
}
