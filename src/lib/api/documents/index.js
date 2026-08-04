// =================================================================
// DOCUMENTS GRAPHQL — POINT D'ENTRÉE
// =================================================================
// Un document par opération de l'API, partagés par tous les hooks `sources/`.
// Ajouter une opération = un document ici + un résolveur dans transports/mock.js.

export { gql, getOperationName } from './gql';
export { GET_FACT_TABLE_WITH_METADATA } from './factTable';
export { GET_CATALOG_SCHEMA } from './catalogSchema';
export { GET_SELECT_OPTIONS, GET_GROUPED_SELECT_OPTIONS } from './selectOptions';
