import { describe, it, expect } from 'vitest';
import { flattenNavigation } from './flattenNavigation';

describe('flattenNavigation', () => {
  it('flattens a tree depth-first, parents before their children', () => {
    const tree = [
      {
        path: '/a', name: 'A', type: 'group',
        children: [{ path: '/a/b', name: 'B', type: 'page' }],
      },
      { path: '/c', name: 'C', type: 'page' },
    ];
    const flat = flattenNavigation(tree);
    expect(flat.map((n) => n.path)).toEqual(['/a', '/a/b', '/c']);
  });

  it('assigns depth 0 at the root and increments per nesting level', () => {
    const tree = [{ path: '/a', name: 'A', children: [{ path: '/a/b', name: 'B' }] }];
    const flat = flattenNavigation(tree);
    expect(flat[0].depth).toBe(0);
    expect(flat[1].depth).toBe(1);
  });

  it('defaults `searchable` to true when omitted from the source node', () => {
    const tree = [{ path: '/a', name: 'A' }];
    expect(flattenNavigation(tree)[0].searchable).toBe(true);
  });

  it('respects an explicit `searchable: false`', () => {
    const tree = [{ path: '/a', name: 'A', searchable: false }];
    expect(flattenNavigation(tree)[0].searchable).toBe(false);
  });

  it('carries type, description and keywords through', () => {
    const tree = [{ path: '/a', name: 'A', type: 'page', description: 'desc', keywords: ['k'] }];
    expect(flattenNavigation(tree)[0]).toMatchObject({
      type: 'page', description: 'desc', keywords: ['k'],
    });
  });

  it('collects the names of the enclosing nodes, root first', () => {
    const tree = [{
      path: '/a', name: 'A',
      children: [{ path: '/a/b', name: 'B', children: [{ path: '/a/b/c', name: 'C' }] }],
    }];
    expect(flattenNavigation(tree).map((n) => n.ancestors)).toEqual([[], ['A'], ['A', 'B']]);
  });

  it('keeps `ancestors` and `depth` in step — the depth of a node IS its ancestor count', () => {
    const tree = [{ path: '/a', name: 'A', children: [{ path: '/a/b', name: 'B' }] }];
    for (const node of flattenNavigation(tree)) {
      expect(node.ancestors).toHaveLength(node.depth);
    }
  });

  it('does not leak the ancestors of one branch into its sibling', () => {
    const tree = [
      { path: '/a', name: 'A', children: [{ path: '/a/b', name: 'B' }] },
      { path: '/c', name: 'C', children: [{ path: '/c/d', name: 'D' }] },
    ];
    const flat = flattenNavigation(tree);
    expect(flat.find((n) => n.name === 'D').ancestors).toEqual(['C']);
  });

  it('defaults to an empty tree', () => {
    expect(flattenNavigation()).toEqual([]);
  });
});
