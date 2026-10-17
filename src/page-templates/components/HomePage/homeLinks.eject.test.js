import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import homeData from '@config/content/home.json';

// =================================================================
// Accueil minimal écrit par `npm run eject` — propre au dépôt template
// =================================================================
// Ces vérifications lisent scripts/eject.js, qui se supprime lui-même : l'eject retire donc
// AUSSI ce fichier (cf. finalise() dans le script). Les vérifications valables dans les deux
// états du dépôt sont dans homeLinks.test.js.

const require = createRequire(import.meta.url);
const { collectHomeLinkProblems } = require('../../../../scripts/validate-config.js');
const { MINIMAL_SITE_CONFIG, MINIMAL_HOME_CONTENT } = require('../../../../scripts/eject.js');

describe('manifeste et accueil minimaux écrits par eject', () => {
  it('all point to a node of the minimal manifest', () => {
    expect(collectHomeLinkProblems(MINIMAL_SITE_CONFIG, MINIMAL_HOME_CONTENT)).toEqual([]);
  });

  it('does not accept the demo home against the minimal manifest', () => {
    expect(collectHomeLinkProblems(MINIMAL_SITE_CONFIG, homeData).length).toBeGreaterThan(0);
  });
});
