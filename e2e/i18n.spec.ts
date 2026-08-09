import { test, expect } from '@playwright/test';
import fr from '../src/i18n/dictionaries/fr';
import en from '../src/i18n/dictionaries/en';
import { gotoLocale, contextWithLanguages, seedLocalePreference } from './helpers/locale';
import { locales } from './helpers/routes';

// =================================================================
// INTERNATIONALISATION — ce que seul un vrai navigateur peut vérifier
// =================================================================
// Les tests unitaires couvrent déjà les fonctions pures (négociation, fusion,
// gabarits) et `npm run check:i18n` couvre la cohérence des dictionnaires. Ce fichier
// ne reteste rien de tout cela : il vérifie les trois choses qui n'existent qu'à
// l'exécution dans un navigateur.
//
//   1. `<html lang>` — corrigé par un script inline AVANT le premier paint, puis
//      maintenu par LocaleProvider lors des navigations clientes. C'est le point le
//      plus fragile du montage (cf. l'en-tête de src/app/layout.tsx).
//   2. La négociation sur /demo — elle lit `navigator.languages`, qui n'existe pas
//      hors navigateur.
//   3. L'invariant d'accessibilité de bout en bout : AUCUN nom accessible vide, dans
//      aucune langue. C'est l'exigence non négociable de P5.4.
//
// Les LIBELLÉS attendus sont lus dans les dictionnaires plutôt que recopiés : un test
// qui répète « Toggle sidebar navigation » en dur devient une seconde source de vérité,
// et c'est lui qui casse quand on améliore une formulation.

test.describe('internationalisation', () => {
  for (const locale of locales) {
    const dictionary = locale === 'fr' ? fr : en;

    test(`/demo/${locale} se rend dans sa langue`, async ({ page }) => {
      await gotoLocale(page, locale);

      // Le script inline a corrigé l'attribut avant le premier paint.
      await expect(page.locator('html')).toHaveAttribute('lang', locale);

      // Un libellé purement accessible, donc invisible : c'est celui qu'une traduction
      // à vue oublie, et il n'apparaît sur aucune capture de régression visuelle.
      await expect(
        page.getByRole('button', { name: dictionary.header.toggleSidebar }),
      ).toBeVisible();
    });
  }

  test('aucun nom accessible vide, dans aucune langue', async ({ page }) => {
    for (const locale of locales) {
      await gotoLocale(page, locale);

      const unnamed = await page.evaluate(() => {
        const offenders: string[] = [];

        for (const el of document.querySelectorAll('button, a, [role="button"], input, select')) {
          if (el.getAttribute('aria-hidden') === 'true') continue;
          if (el.getAttribute('aria-labelledby')) continue;
          if (el.id && document.querySelector(`label[for="${el.id}"]`)) continue;

          // Le nom accessible peut venir de l'élément lui-même OU d'un descendant :
          // un lien qui n'enveloppe qu'une <img alt="…"> est correctement nommé.
          const own = (el.getAttribute('aria-label') ?? el.getAttribute('title') ?? '').trim();
          const text = (el.textContent ?? '').trim();
          const fromImage = [...el.querySelectorAll('img')]
            .map((img) => (img.getAttribute('alt') ?? '').trim())
            .join('');

          if (own || text || fromImage) continue;

          offenders.push(el.tagName.toLowerCase() + (el.className ? `.${String(el.className).split(' ')[0]}` : ''));
        }

        return offenders;
      });

      expect(unnamed, `noms accessibles vides sur /demo/${locale}`).toEqual([]);
    }
  });

  test('le sélecteur de langue conserve la page courante', async ({ page }) => {
    const path = '/comptabilite-nationale/france/pib';
    await gotoLocale(page, 'fr', path);

    await page.selectOption('#locale-switcher', 'en');

    await page.waitForURL(`**/demo/en${path}`);
    // L'attribut suit une navigation CLIENTE, que le script inline ne rejoue pas :
    // c'est l'effet de LocaleProvider qui est vérifié ici, pas celui du script.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('button', { name: en.header.toggleSidebar })).toBeVisible();
  });

  test.describe('/demo négocie la langue du visiteur', () => {
    for (const [languages, expected] of [
      [['en-US', 'en'], 'en'],
      [['fr-FR', 'fr'], 'fr'],
      // Langue non servie : repli sur `site.defaultLocale`, pas d'écran blanc.
      [['de-DE', 'de'], 'fr'],
      // Sous-étiquette régionale inconnue : la correspondance se fait sur la langue.
      [['fr-CA'], 'fr'],
    ] as const) {
      test(`${languages.join(', ')} → /demo/${expected}`, async ({ browser }) => {
        const context = await contextWithLanguages(browser, [...languages]);
        const page = await context.newPage();

        await page.goto('/demo');
        await page.waitForURL(`**/demo/${expected}`);

        await context.close();
      });
    }

    test('un choix explicite prime sur les préférences système', async ({ browser }) => {
      const context = await contextWithLanguages(browser, ['fr-FR', 'fr']);
      const page = await context.newPage();
      await seedLocalePreference(page, 'en');

      await page.goto('/demo');
      await page.waitForURL('**/demo/en');

      await context.close();
    });
  });

  test('le site de documentation reste monolingue', async ({ page }) => {
    // Décision de P5.4 : la documentation du template n'a pas de segment de langue.
    // Ce test est la barrière qui empêche de l'y réintroduire par inadvertance.
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
    expect(new URL(page.url()).pathname).toBe('/');
  });
});
