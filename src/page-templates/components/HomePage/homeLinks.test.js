import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import homeData from '@config/content/home.json';
import siteConfig from '@config/site.config.json';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import { flattenNavigation } from '@/utils/navigation/flattenNavigation';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';
import { getHomeConfig } from './homeConfig';

// Les scripts sont en CommonJS : on les charge tels quels, sans les dupliquer ici.
// Ce fichier ne dépend QUE de ce qui survit à `npm run eject` : les vérifications qui
// lisent scripts/eject.js vivent dans homeLinks.eject.test.js, que l'eject supprime avec lui.
const require = createRequire(import.meta.url);
const { collectHomeLinkProblems, collectNodePaths } = require('../../../../scripts/validate-config.js');

describe('liens de config/content/home.json', () => {
  it('all point to a node of config/site.config.json', () => {
    expect(collectHomeLinkProblems(siteConfig, homeData)).toEqual([]);
  });

  it('would fail on a dead link', () => {
    const broken = { ...homeData, cards: [{ ...homeData.cards[0], link: '/analytics' }] };
    const problems = collectHomeLinkProblems(siteConfig, broken);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('/analytics');
  });

  it('agrees with resolveNavigationTree on node paths', () => {
    const viaTree = flattenNavigation(resolveNavigationTree(siteConfig.navigation.tree, '/'))
      .map((node) => node.path);
    expect(collectNodePaths(siteConfig.navigation.tree).sort()).toEqual([...viaTree].sort());
  });
});

describe('getHomeConfig — résolution des liens', () => {
  it('prefixes every link with the locale and resolves to a rendered route', () => {
    // Le point de montage vaut '/demo' dans le dépôt template et '' une fois éjecté :
    // on le lit plutôt que de le figer, pour que ce test reste vrai dans les deux états.
    const prefix = `${DEMO_BASE_PATH}/en`;
    const routes = new Set(
      flattenNavigation(resolveNavigationTree(siteConfig.navigation.tree, prefix)).map((n) => n.path),
    );
    const { hero, cards } = getHomeConfig('en');
    for (const { link } of [hero.ctaButton, ...cards]) {
      expect(link.startsWith(`${prefix}/`)).toBe(true);
      expect(routes.has(link)).toBe(true);
    }
  });

  it('follows the requested locale', () => {
    expect(getHomeConfig('fr').hero.ctaButton.link.startsWith(`${DEMO_BASE_PATH}/fr/`)).toBe(true);
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
