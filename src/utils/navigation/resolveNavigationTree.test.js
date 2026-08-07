import { describe, it, expect } from 'vitest';
import { resolveNavigationTree } from './resolveNavigationTree';

describe('resolveNavigationTree', () => {
  it('resolves relative child paths against their parent, defaulting parentPath to "/"', () => {
    const tree = [
      { path: '/comptabilite-nationale', name: 'CN', children: [{ path: '/france', name: 'France', children: [{ path: '/pib', name: 'PIB' }] }] },
    ];
    const resolved = resolveNavigationTree(tree);
    expect(resolved[0].path).toBe('/comptabilite-nationale');
    expect(resolved[0].children[0].path).toBe('/comptabilite-nationale/france');
    expect(resolved[0].children[0].children[0].path).toBe('/comptabilite-nationale/france/pib');
  });

  it('mounts the whole tree under a custom parentPath (e.g. DEMO_BASE_PATH)', () => {
    const tree = [{ path: '/pib', name: 'PIB' }];
    const resolved = resolveNavigationTree(tree, '/demo');
    expect(resolved[0].path).toBe('/demo/pib');
  });

  it('lets a root node ("/") inherit exactly the parent path, without duplicating the slash', () => {
    const tree = [{ path: '/', name: 'Home' }];
    expect(resolveNavigationTree(tree, '/demo')[0].path).toBe('/demo');
    expect(resolveNavigationTree(tree)[0].path).toBe('/');
  });

  it('passes through non-internal paths untouched (external URL, anchor, mailto:)', () => {
    const tree = [
      { path: 'https://example.com', name: 'External' },
      { path: '#anchor', name: 'Anchor' },
      { path: 'mailto:a@b.com', name: 'Mail' },
    ];
    const resolved = resolveNavigationTree(tree, '/demo');
    expect(resolved[0].path).toBe('https://example.com');
    expect(resolved[1].path).toBe('#anchor');
    expect(resolved[2].path).toBe('mailto:a@b.com');
  });

  it('only recreates `children` when the source node has it (leaves stay keyless)', () => {
    const tree = [{ path: '/leaf', name: 'Leaf' }];
    const resolved = resolveNavigationTree(tree);
    expect('children' in resolved[0]).toBe(false);
  });

  it('preserves all other node keys unchanged', () => {
    const tree = [{ path: '/pib', name: 'PIB', type: 'page', description: 'desc', searchable: false }];
    const resolved = resolveNavigationTree(tree);
    expect(resolved[0]).toMatchObject({ name: 'PIB', type: 'page', description: 'desc', searchable: false });
  });

  it('does not mutate the input tree', () => {
    const tree = [{ path: '/pib', name: 'PIB' }];
    resolveNavigationTree(tree, '/demo');
    expect(tree[0].path).toBe('/pib');
  });
});
