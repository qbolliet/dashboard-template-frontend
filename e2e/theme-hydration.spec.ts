import { test, expect, type Locator, type Page } from '@playwright/test';
import { docsRoutes } from './helpers/routes';
import { setSiteTheme } from './helpers/theme';

// =================================================================
// HYDRATATION DU THÈME — C4 de RECETTE_G0.md
// =================================================================
// Avec `localStorage.theme = "dark"`, le HTML statique est rendu en `light` (le serveur ne
// connaît pas la préférence) alors que le premier rendu client lisait déjà `dark`. React
// signalait la divergence d'attributs de <PreviewFrame> sans la corriger : le DOM restait
// `light`, l'état React était `dark`, et le PREMIER clic sur le bouton de l'aperçu ne
// changeait rien.
//
// Ce fichier n'utilise volontairement PAS `toggleFrameTheme` (e2e/helpers/previewFrame.ts) :
// son `toPass` réessaie le clic jusqu'à ce que `data-theme` bouge, ce qui masquerait
// exactement le défaut testé ici. Un seul clic, une seule vérification.

/** Messages React d'hydratation (le filtre exclut volontairement l'avertissement CSS C21). */
const HYDRATION_ERROR = /hydrat|didn't match|server rendered HTML/i;

const SECTIONS = ['/composants', '/features'];

const isSectionPage = (path: string): boolean =>
  SECTIONS.some((section) => path === section || path.startsWith(`${section}/`));

/**
 * Collects hydration errors (console + uncaught) for the lifetime of a page.
 *
 * @param page - Page to observe; must be called BEFORE navigation.
 * @returns Live array, filled as errors arrive.
 */
function watchHydrationErrors(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' && HYDRATION_ERROR.test(message.text())) {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => {
    if (HYDRATION_ERROR.test(error.message)) errors.push(error.message);
  });

  return errors;
}

/**
 * Waits until every preview frame's toggle has been hydrated by React.
 *
 * Signal déterministe : React pose `__reactProps$<id>` sur un nœud DOM dès qu'il y
 * attache ses gestionnaires. Attendre `data-theme="dark"` à la place ferait EXPIRER le
 * test avant correctif au lieu de le faire échouer sur la bonne assertion.
 *
 * @param page - Page under test.
 * @returns Number of frames found (0 on pages without previews).
 */
async function waitForFramesHydrated(page: Page): Promise<number> {
  // Les cadres sont sous <Suspense> (import paresseux) : on laisse une chance à leur
  // apparition, sans échouer sur les pages qui n'en ont pas.
  await page
    .locator('.doc-preview-frame__theme')
    .first()
    .waitFor({ state: 'attached', timeout: 5_000 })
    .catch(() => {});

  const count = await page.locator('.doc-preview-frame__theme').count();
  if (count === 0) return 0;

  await page.waitForFunction(() => {
    const buttons = [...document.querySelectorAll('.doc-preview-frame__theme')];
    return (
      buttons.length > 0 &&
      buttons.every((button) => Object.keys(button).some((key) => key.startsWith('__reactProps$')))
    );
  });

  return page.locator('.doc-preview-frame__theme').count();
}

/** Asserts that a frame's attributes and its button agree with the theme it displays. */
async function expectFrameConsistent(frame: Locator, theme: 'light' | 'dark'): Promise<void> {
  const other = theme === 'dark' ? 'light' : 'dark';
  const button = frame.locator('.doc-preview-frame__theme');

  await expect(frame).toHaveAttribute('data-theme', theme);
  await expect(button).toHaveAttribute('aria-pressed', String(theme === 'dark'));
  await expect(button).toHaveAttribute('aria-label', new RegExp(`Thème de l.aperçu : ${theme}\\.`));
  await expect(button).toHaveAttribute('title', new RegExp(`thème ${other}$`));
}

test.describe('thème mémorisé sombre — cadres d\'aperçu', () => {
  test('/composants/tabs : aucun avertissement, attributs cohérents, un seul clic bascule', async ({ page }) => {
    await setSiteTheme(page, 'dark');
    const hydrationErrors = watchHydrationErrors(page);

    await page.goto('/composants/tabs', { waitUntil: 'networkidle' });
    const count = await waitForFramesHydrated(page);
    expect(count, 'cadres d\'aperçu sur /composants/tabs').toBeGreaterThan(0);

    expect(hydrationErrors, 'erreurs d\'hydratation').toEqual([]);

    const frames = page.locator('.doc-preview-frame');
    for (let i = 0; i < count; i += 1) {
      await expectFrameConsistent(frames.nth(i), 'dark');
    }

    // UN SEUL clic sur le premier cadre.
    await frames.first().locator('.doc-preview-frame__theme').click();
    await expectFrameConsistent(frames.first(), 'light');
  });
});

// Toutes les pages des sections Composants et Features, thème sombre mémorisé.
for (const path of docsRoutes().filter(isSectionPage)) {
  test(`[dark] ${path}`, async ({ page }) => {
    await setSiteTheme(page, 'dark');
    const hydrationErrors = watchHydrationErrors(page);

    await page.goto(path, { waitUntil: 'networkidle' });
    const count = await waitForFramesHydrated(page);

    expect(hydrationErrors, `erreurs d'hydratation sur ${path}`).toEqual([]);

    const frames = page.locator('.doc-preview-frame');
    for (let i = 0; i < count; i += 1) {
      await expectFrameConsistent(frames.nth(i), 'dark');
    }

    if (count > 0) {
      await frames.first().locator('.doc-preview-frame__theme').click();
      await expectFrameConsistent(frames.first(), 'light');
    }
  });
}

// Aucune page de documentation ne doit lever d'erreur d'hydratation, dans les deux thèmes.
for (const theme of ['light', 'dark'] as const) {
  for (const path of docsRoutes()) {
    test(`[hydratation ${theme}] ${path}`, async ({ page }) => {
      await setSiteTheme(page, theme);
      const hydrationErrors = watchHydrationErrors(page);

      await page.goto(path, { waitUntil: 'networkidle' });
      await waitForFramesHydrated(page);

      expect(hydrationErrors, `erreurs d'hydratation sur ${path}`).toEqual([]);
    });
  }
}
