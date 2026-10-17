import { test, expect } from '@playwright/test';
import { demoRoutes } from './helpers/routes';

// =================================================================
// NAVIGATION — au plus une « page actuelle », et la bonne
// =================================================================
// `aria-current="page"` est annoncé par les lecteurs d'écran (« page actuelle ») : posé sur
// l'accueil ET sur la page visitée, il en annonce deux. Un ancêtre (le nœud d'accueil, un
// groupe) peut être stylé comme actif mais ne doit jamais porter cet attribut.
//
// « Exactement un » vaut pour toute page que la navigation expose : à l'ouverture la sidebar
// est repliée en rail et ne monte que les nœuds du premier niveau (les enfants n'existent
// qu'une fois la sidebar ouverte), si bien qu'une page plus profonde n'a pas de lien vers
// elle-même dans le DOM et n'a, à raison, aucun repère « courant » — marquer son ancêtre
// « page » mentirait. Le test s'accorde donc sur la présence d'un lien vers la page dans la
// navigation, et non sur une profondeur figée.
// Itère sur les routes du manifeste, comme smoke.spec.ts : une page ajoutée est couverte
// sans toucher ce fichier.

for (const path of demoRoutes()) {
  test(`[aria-current] une seule page actuelle sur ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });

    const current = page.locator('[aria-current="page"]');
    const linkedInNavigation = (await page.locator(`nav a[href="${path}"]`).count()) > 0;

    await expect(current).toHaveCount(linkedInNavigation ? 1 : 0);

    if (linkedInNavigation) {
      await expect(current).toHaveAttribute('href', path);
    }
  });
}
