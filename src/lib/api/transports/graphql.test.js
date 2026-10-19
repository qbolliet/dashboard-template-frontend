import { describe, it, expect, vi } from 'vitest';

// Le client graphql-request est remplacé : on n'observe que ce que le transport lui passe.
const clientRequest = vi.fn(async () => ({}));
vi.mock('graphql-request', () => ({
  GraphQLClient: class {
    request(...args) {
      return clientRequest(...args);
    }
  },
}));

const { graphqlTransport } = await import('./graphql');

describe('graphqlTransport', () => {
  it('sends catalog and schema as query variables only, with no custom header', async () => {
    const variables = { catalog: 'catalogue', schema: 'main', limit: 1 };

    await graphqlTransport({ document: 'query Q { _empty }', variables, catalog: 'catalogue', schema: 'main' });

    expect(clientRequest).toHaveBeenCalledTimes(1);
    const [options] = clientRequest.mock.calls[0];
    expect(options).toEqual({ document: 'query Q { _empty }', variables });
    // Aucun X-Catalog-Id / X-Schema-Id : l'API ne les lit plus et son CORS les refuse.
    expect(options).not.toHaveProperty('requestHeaders');
  });
});
