import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import homeData from '@config/content/home.json';
import siteConfig from '@config/site.config.json';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import { flattenNavigation } from '@/utils/navigation/flattenNavigation';
import { getHomeConfig } from './homeConfig';

// Les scripts sont en CommonJS : on les charge tels quels, sans les dupliquer ici.
const require = createRequire(import.meta.url);
const { collectHomeLinkProblems, collectNodePaths } = require('../../../../scripts/validate-config.js');
const { MINIMAL_SITE_CONFIG, MINIMAL_HOME_CONTENT } = require('../../../../scripts/eject.js');

describe('liens de config/content/home.json', () => {
  it('all point to a node of config/site.config.json', () => {
    expect(collectHomeLinkProblems(siteConfig, homeData)).toEqual([]);
  });

  it('all point to a node of the minimal manifest written by eject', () => {
    expect(collectHomeLinkProblems(MINIMAL_SITE_CONFIG, MINIMAL_HOME_CONTENT)).toEqual([]);
  });

  it('would fail on a dead link', () => {
    const broken = { ...homeData, cards: [{ ...homeData.cards[0], link: '/analytics' }] };
    const problems = collectHomeLinkProblems(siteConfig, broken);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('/analytics');
  });

  it('does not accept the demo home against the minimal manifest', () => {
    expect(collectHomeLinkProblems(MINIMAL_SITE_CONFIG, homeData).length).toBeGreaterThan(0);
  });

  it('agrees with resolveNavigationTree on node paths', () => {
    const viaTree = flattenNavigation(resolveNavigationTree(siteConfig.navigation.tree, '/'))
      .map((node) => node.path);
    expect(collectNodePaths(siteConfig.navigation.tree).sort()).toEqual([...viaTree].sort());
  });
});

describe('getHomeConfig — résolution des liens', () => {
  it('prefixes every link with the locale and resolves to a rendered route', () => {
    const routes = new Set(
      flattenNavigation(resolveNavigationTree(siteConfig.navigation.tree, '/demo/en')).map((n) => n.path),
    );
    const { hero, cards } = getHomeConfig('en');
    for (const { link } of [hero.ctaButton, ...cards]) {
      expect(link.startsWith('/demo/en/')).toBe(true);
      expect(routes.has(link)).toBe(true);
    }
  });

  it('follows the requested locale', () => {
    expect(getHomeConfig('fr').hero.ctaButton.link.startsWith('/demo/fr/')).toBe(true);
  });
});

describe('validate:config — navigation', () => {
  const { collectNavigationProblems } = require('../../../../scripts/validate-config.js');
  const base = (tree, extra = {}) => ({ navigation: { tree, ...extra } });

  it('accepts the demo manifest', () => {
    expect(collectNavigationProblems(siteConfig)).toEqual([]);
  });

  it('flags two pages that resolve to the same URL', () => {
    const tree = [
      { name: 'A', children: [{ path: '/pib', name: 'PIB A', type: 'indicator' }] },
      { name: 'B', children: [{ path: '/pib', name: 'PIB B', type: 'indicator' }] },
    ];
    expect(collectNavigationProblems(base(tree))).toHaveLength(1);
  });

  it('accepts the same leaves once the folders carry a path', () => {
    const tree = [
      { path: '/a', name: 'A', type: 'indicator_group', children: [{ path: '/pib', name: 'PIB', type: 'indicator' }] },
      { path: '/b', name: 'B', type: 'indicator_group', children: [{ path: '/pib', name: 'PIB', type: 'indicator' }] },
    ];
    expect(collectNavigationProblems(base(tree))).toEqual([]);
  });

  it('rejects a folder under linkedNodes "all" only', () => {
    const tree = [{ name: 'Dossier', children: [{ path: '/x', name: 'X', type: 'about' }] }];
    expect(collectNavigationProblems(base(tree, { linkedNodes: 'all' }))).toHaveLength(1);
    expect(collectNavigationProblems(base(tree, { linkedNodes: 'auto' }))).toEqual([]);
    expect(collectNavigationProblems(base(tree, { linkedNodes: 'leaves' }))).toEqual([]);
  });
});
