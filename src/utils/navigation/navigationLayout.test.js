import { describe, it, expect } from 'vitest';
import { applyLinkedNodes, getTreeDepth, resolveNavigationType } from './navigationLayout';

const flat = [{ path: '/a', name: 'A' }, { path: '/b', name: 'B' }];
const twoLevels = [{ path: '/a', name: 'A', children: [{ path: '/x', name: 'X' }] }];
const threeLevels = [
  { path: '/a', name: 'A', children: [{ path: '/b', name: 'B', children: [{ path: '/c', name: 'C' }] }] },
];

describe('getTreeDepth', () => {
  it('counts levels', () => {
    expect(getTreeDepth([])).toBe(0);
    expect(getTreeDepth(flat)).toBe(1);
    expect(getTreeDepth(twoLevels)).toBe(2);
    expect(getTreeDepth(threeLevels)).toBe(3);
  });

  it('takes the deepest branch, not the first', () => {
    expect(getTreeDepth([...flat, ...threeLevels])).toBe(3);
  });

  it('counts a node without path as a level', () => {
    expect(getTreeDepth([{ name: 'Dossier', children: [{ path: '/x', name: 'X' }] }])).toBe(2);
  });
});

describe('resolveNavigationType', () => {
  it('honours an explicit layout whatever the depth', () => {
    expect(resolveNavigationType('topbar', threeLevels)).toBe('topbar');
    expect(resolveNavigationType('sidebar', flat)).toBe('sidebar');
  });

  it('deduces the layout from the depth when auto (and by default)', () => {
    expect(resolveNavigationType('auto', flat)).toBe('topbar');
    expect(resolveNavigationType('auto', twoLevels)).toBe('topbar');
    expect(resolveNavigationType('auto', threeLevels)).toBe('sidebar');
    expect(resolveNavigationType(undefined, threeLevels)).toBe('sidebar');
  });
});

describe('applyLinkedNodes', () => {
  it('strips the path of internal nodes only when leaves', () => {
    const out = applyLinkedNodes(threeLevels, 'leaves');
    expect('path' in out[0]).toBe(false);
    expect('path' in out[0].children[0]).toBe(false);
    expect(out[0].children[0].children[0].path).toBe('/c');
    expect(out[0].name).toBe('A');
  });

  it('leaves the tree untouched for auto and all', () => {
    expect(applyLinkedNodes(threeLevels, 'auto')).toBe(threeLevels);
    expect(applyLinkedNodes(threeLevels, 'all')).toBe(threeLevels);
    expect(applyLinkedNodes(threeLevels)).toBe(threeLevels);
  });

  it('does not mutate its input', () => {
    applyLinkedNodes(twoLevels, 'leaves');
    expect(twoLevels[0].path).toBe('/a');
  });
});
