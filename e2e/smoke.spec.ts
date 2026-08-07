import { test, expect } from '@playwright/test';
import { docsRoutes, demoRoutes } from './helpers/routes';

// =================================================================
// FUMÉE — toute route se charge sans erreur console ni requête en échec
// =================================================================
// Itère sur les routes ISSUES du manifeste (config/site.config.json) et de l'index
// de documentation (docs/content/**.mdx) — cf. e2e/helpers/routes.ts — jamais sur
// une liste figée : une page ou un nœud de navigation ajouté étend cette suite au
// prochain run, sans toucher ce fichier.

const ROUTES = [
  ...docsRoutes().map((path) => ({ path, surface: 'docs' })),
  ...demoRoutes().map((path) => ({ path, surface: 'demo' })),
];

for (const { path, surface } of ROUTES) {
  test(`[${surface}] ${path}`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });
    page.on('requestfailed', (request) => {
      // Une requête coupée par la navigation suivante (prefetch en vol) n'est pas
      // un échec réseau : le test suivant navigue déjà ailleurs.
      if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
      failedRequests.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText}`);
    });
    page.on('response', (response) => {
      if (response.status() >= 400) failedRequests.push(`${response.status()} ${response.url()}`);
    });

    const response = await page.goto(path, { waitUntil: 'networkidle' });

    expect(response?.ok(), `réponse HTTP pour ${path}`).toBeTruthy();
    expect(consoleErrors, `erreurs console sur ${path}`).toEqual([]);
    expect(pageErrors, `exceptions non interceptées sur ${path}`).toEqual([]);
    expect(failedRequests, `requêtes en échec sur ${path}`).toEqual([]);
  });
}
