import { test, expect } from '@playwright/test';
import { docsRoutes, demoRoutes } from './helpers/routes';

// =================================================================
// RESPONSIVE — aucune route ne défile horizontalement sur petit écran
// =================================================================
// Mesure document.documentElement.scrollWidth contre clientWidth : un débordement
// d'un seul enfant élargit la page entière. Itère sur les routes dérivées (docs +
// démo, toutes langues) comme e2e/smoke.spec.ts. La largeur de référence est 375 px ;
// RESPONSIVE_WIDTHS=320,768 permet de rejouer la suite à d'autres largeurs.

const WIDTHS = (process.env.RESPONSIVE_WIDTHS ?? '375').split(',').map(Number);

const ROUTES = [
  ...docsRoutes().map((path) => ({ path, surface: 'docs' })),
  ...demoRoutes().map((path) => ({ path, surface: 'demo' })),
];

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const { path, surface } of ROUTES) {
      test(`[${surface}] ${path}`, async ({ page }) => {
        await page.goto(path, { waitUntil: 'networkidle' });

        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));

        expect(scrollWidth, `débordement horizontal sur ${path}`).toBeLessThanOrEqual(clientWidth);
      });
    }
  });
}
