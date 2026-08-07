import { describe, it, expect } from 'vitest';
import { findNodeByPath } from './findNodeByPath';

const tree = [
  {
    path: '/comptabilite-nationale',
    name: 'CN',
    children: [
      { path: '/comptabilite-nationale/france', name: 'France' },
      {
        path: '/comptabilite-nationale/monde',
        name: 'Monde',
        children: [{ path: '/comptabilite-nationale/monde/pib', name: 'PIB monde' }],
      },
    ],
  },
  { path: '/finances-publiques', name: 'FP' },
  { path: '/finances-publiques-locales', name: 'FPL' },
];

describe('findNodeByPath', () => {
  it('finds a top-level node by exact path', () => {
    expect(findNodeByPath(tree, '/finances-publiques')).toEqual({ path: '/finances-publiques', name: 'FP' });
  });

  it('descends into a matching branch to find a nested node', () => {
    expect(findNodeByPath(tree, '/comptabilite-nationale/monde/pib').name).toBe('PIB monde');
  });

  it('returns undefined for an unknown path (no closest-ancestor fallback)', () => {
    expect(findNodeByPath(tree, '/does-not-exist')).toBeUndefined();
  });

  it('does not descend into a sibling whose path merely shares a prefix', () => {
    // /finances-publiques-locales must not be searched as if it were a child of
    // /finances-publiques — the '/' suffix guard in the source is what prevents this.
    expect(findNodeByPath(tree, '/finances-publiques/nope')).toBeUndefined();
  });

  it('finds the exact node even when its path is a prefix-alike sibling', () => {
    expect(findNodeByPath(tree, '/finances-publiques-locales').name).toBe('FPL');
  });

  it('defaults to an empty tree', () => {
    expect(findNodeByPath(undefined, '/x')).toBeUndefined();
  });
});
