import { test, expect } from '@playwright/test';
import { setSiteTheme } from './helpers/theme';
import { playgroundFrame, toggleFrameTheme } from './helpers/previewFrame';

// =================================================================
// RÉGRESSION VISUELLE — composants clés, clair et sombre
// =================================================================
// Le produit d'un template est son apparence : ce filet compare les composants aux
// mêmes instantanés d'une exécution à l'autre. Chaque cible est capturée à ses
// valeurs par défaut (aucune interaction avec les contrôles) — cf. e2e/README.md
// pour la procédure de régénération.
//
// « Header » a deux variantes structurelles distinctes (barre horizontale / rail
// latéral, choisies par Header.jsx selon `navigationType`, jamais par une prop
// pilotable — cf. docs/playgrounds/header.jsx) :
//   - TOPBAR : le playground de docs/content/features/header.mdx, qui ne passe pas
//     navigationType et hérite donc du défaut 'topbar' ;
//   - SIDEBAR : le VRAI chrome de l'application de démo (config/site.config.json
//     déclare `navigation.type: "sidebar"`), sur sa page racine /demo — il n'existe
//     aucun playground pour ce mode, Header.jsx ne l'expose pas comme un contrôle.
//     C'est la même logique de dogfooding que documentée dans le tableau de
//     correspondance de P4.6 pour la navigation clavier/responsive du header.
//
// Les cadres de <ComponentPlayground>/<ComponentPreview> portent leur PROPRE bascule
// clair/sombre (`.doc-preview-frame__theme`, cf. e2e/helpers/previewFrame.ts) : on
// clique CE bouton plutôt que de changer le thème du site. Pour le header en mode
// sidebar, en revanche, il n'y a pas de cadre — le thème du site est semé avant
// navigation via `setSiteTheme`.

test.describe('Header — topbar (playground)', () => {
  test('clair', async ({ page }) => {
    await page.goto('/features/header');
    const frame = playgroundFrame(page, 'Header');
    await expect(frame).toHaveScreenshot('header-topbar-light.png');
  });

  test('sombre', async ({ page }) => {
    await page.goto('/features/header');
    const frame = playgroundFrame(page, 'Header');
    await toggleFrameTheme(frame);
    await expect(frame).toHaveScreenshot('header-topbar-dark.png');
  });
});

test.describe('Header — sidebar (chrome réel de la démo)', () => {
  for (const theme of ['light', 'dark'] as const) {
    test(theme, async ({ page }) => {
      await setSiteTheme(page, theme);
      await page.goto('/demo');

      await expect(page.locator('header.primary-header')).toHaveScreenshot(`header-sidebar-bar-${theme}.png`);

      // Le manifeste de démo ne déclare aucune icône de nœud : NavigationSideBar.scss
      // masque alors complètement le rail replié (`--collapsed.--no-icons { width: 0 }`)
      // — comportement voulu, pas un défaut. La seule apparence capturable est donc la
      // sidebar OUVERTE, via son propre déclencheur. Le clic est réessayé pour la même
      // raison que toggleFrameTheme (cf. e2e/helpers/previewFrame.ts) : le chrome vient
      // tout juste de s'hydrater.
      const aside = page.locator('aside.navigation-sidebar');
      const trigger = page.getByRole('button', { name: 'Basculer la navigation latérale' });
      await expect(async () => {
        await trigger.click();
        await expect(aside).toHaveClass(/navigation-sidebar--open/, { timeout: 500 });
      }).toPass({ timeout: 5_000 });

      await expect(aside).toHaveScreenshot(`header-sidebar-rail-${theme}.png`);
    });
  }
});

test.describe('Chart (playground)', () => {
  test('clair', async ({ page }) => {
    await page.goto('/features/chart');
    const frame = playgroundFrame(page, 'Chart');
    await expect(frame).toHaveScreenshot('chart-playground-light.png');
  });

  test('sombre', async ({ page }) => {
    await page.goto('/features/chart');
    const frame = playgroundFrame(page, 'Chart');
    await toggleFrameTheme(frame);
    await expect(frame).toHaveScreenshot('chart-playground-dark.png');
  });
});

test.describe('Table (playground)', () => {
  test('clair', async ({ page }) => {
    await page.goto('/features/table');
    const frame = playgroundFrame(page, 'Table');
    await expect(frame).toHaveScreenshot('table-playground-light.png');
  });

  test('sombre', async ({ page }) => {
    await page.goto('/features/table');
    const frame = playgroundFrame(page, 'Table');
    await toggleFrameTheme(frame);
    await expect(frame).toHaveScreenshot('table-playground-dark.png');
  });
});

test.describe('StatCard (playground)', () => {
  test('clair', async ({ page }) => {
    await page.goto('/composants/stat-card');
    const frame = playgroundFrame(page, 'StatCard');
    await expect(frame).toHaveScreenshot('stat-card-playground-light.png');
  });

  test('sombre', async ({ page }) => {
    await page.goto('/composants/stat-card');
    const frame = playgroundFrame(page, 'StatCard');
    await toggleFrameTheme(frame);
    await expect(frame).toHaveScreenshot('stat-card-playground-dark.png');
  });
});

test.describe('CriterionMenu (playground)', () => {
  test('clair', async ({ page }) => {
    await page.goto('/features/filter');
    const frame = playgroundFrame(page, 'CriterionMenu');
    await expect(frame).toHaveScreenshot('criterion-menu-playground-light.png');
  });

  test('sombre', async ({ page }) => {
    await page.goto('/features/filter');
    const frame = playgroundFrame(page, 'CriterionMenu');
    await toggleFrameTheme(frame);
    await expect(frame).toHaveScreenshot('criterion-menu-playground-dark.png');
  });
});
