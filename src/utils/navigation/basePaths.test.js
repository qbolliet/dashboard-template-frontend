import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { DEMO_BASE_PATH } from './basePaths';

// Ce fichier ne fige PAS la valeur '/demo' : `npm run eject` la met à '' et déplace le
// dossier de route en conséquence. Ce qui doit rester vrai dans les deux états, c'est le
// CONTRAT — la constante et le dossier de route se correspondent —, et c'est lui qu'on
// vérifie ici, mécaniquement, plutôt que de recopier une valeur qu'un script réécrit.
describe('DEMO_BASE_PATH', () => {
  it('is a mount point without a trailing slash', () => {
    expect(typeof DEMO_BASE_PATH).toBe('string');
    // Chaîne vide (montage à la racine) ou chemin absolu d'au moins un segment.
    expect(DEMO_BASE_PATH === '' || /^\/[^/]/.test(DEMO_BASE_PATH)).toBe(true);
    expect(DEMO_BASE_PATH.endsWith('/')).toBe(false);
  });

  it('matches the route folder that materialises it', () => {
    // Vitest tourne depuis la racine du projet : les chemins relatifs y sont résolus.
    expect(existsSync(`src/app/(site)${DEMO_BASE_PATH}/[locale]`)).toBe(true);
  });
});
