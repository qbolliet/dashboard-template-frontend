import type { Browser, Page } from '@playwright/test';

// =================================================================
// LANGUE — deux leviers distincts, à ne pas confondre
// =================================================================
// Décalqué sur e2e/helpers/theme.ts, mais la langue ne fonctionne PAS comme le thème :
//
//   thème  → état client, lu dans localStorage par le script anti-FOUC avant le premier
//            paint. Le semer suffit à changer ce qui est rendu.
//   langue → décidée par le SEGMENT D'URL. Le HTML est écrit au build, une fois par
//            langue. Rien de ce qu'on sème côté client ne change ce qui est servi.
//
// D'où deux helpers, qui répondent à deux questions différentes :
//
//   `gotoLocale`         — « la page /demo/en est-elle bien en anglais ? » On y va,
//                          simplement. C'est le cas courant.
//   `contextWithLanguages` — « un visiteur dont le navigateur est en allemand arrive
//                          sur /demo : où atterrit-il ? » Là seulement les préférences
//                          système comptent, parce que /demo négocie côté client
//                          (cf. src/features/i18n/components/LocaleRedirect).
//
// `seedLocalePreference` couvre le troisième cas : un choix EXPLICITE déjà mémorisé,
// qui doit primer sur les préférences système.

import { locales } from './routes';

/**
 * Navigates to a path in a given locale.
 *
 * @param page - Target page.
 * @param locale - Locale code; must be one the manifest declares.
 * @param path - Path relative to the locale root, e.g. '/comptabilite-nationale'.
 */
export async function gotoLocale(page: Page, locale: string, path = ''): Promise<void> {
  if (!locales.includes(locale)) {
    throw new Error(`Locale « ${locale} » absente de site.locales (${locales.join(', ')})`);
  }

  await page.goto(`/demo/${locale}${path}`);
}

/**
 * Opens a browser context pretending to prefer a given list of languages.
 *
 * `navigator.languages` is overridden through an init script rather than only through
 * Playwright's `locale` option: the option sets `navigator.language` and the
 * `Accept-Language` header, but the client-side negotiation reads `navigator.languages`,
 * the plural, which the option leaves at the browser default.
 *
 * @param browser - Playwright browser.
 * @param languages - BCP 47 tags, most preferred first, e.g. ['de-DE', 'de'].
 * @returns A context whose pages negotiate as that visitor.
 */
export async function contextWithLanguages(browser: Browser, languages: string[]) {
  const context = await browser.newContext({ locale: languages[0] });

  await context.addInitScript((preferred) => {
    Object.defineProperty(navigator, 'languages', { get: () => preferred });
  }, languages);

  return context;
}

/**
 * Seeds an explicit language choice, as the switcher would have stored it.
 *
 * Both supports are written because they have two different readers: localStorage for
 * the static-export redirector, the cookie for the opt-in middleware. Mirrors
 * `setLocale` in LocaleProvider.
 *
 * @param page - Target page, before its first navigation.
 * @param locale - Locale code to remember.
 */
export async function seedLocalePreference(page: Page, locale: string): Promise<void> {
  await page.addInitScript((code) => {
    window.localStorage.setItem('locale', code);
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=31536000; SameSite=Lax`;
  }, locale);
}
