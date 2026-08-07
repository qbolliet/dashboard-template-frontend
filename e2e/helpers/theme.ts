import type { Page } from '@playwright/test';

// =================================================================
// THÈME DE SITE — posé AVANT navigation, jamais par clic
// =================================================================
// Le script anti-FOUC de src/app/layout.tsx lit localStorage['theme'] avant le
// premier paint et pose data-theme sur <html> en conséquence (cf. la mémoire
// token-cascade-data-theme-selector). Semer cette clé via addInitScript reproduit
// exactement ce chemin — déterministe, sans dépendre du bouton de bascule ni de sa
// transition (classe `theme-transitioning`, cf. ThemeProvider.js).
//
// Ne sert PAS pour les cadres de <ComponentPlayground>/<ComponentPreview> : ceux-là
// portent leur PROPRE bascule locale (`.doc-preview-frame__theme`, cf.
// PreviewFrame.jsx) et doivent être basculés en cliquant ce bouton — voir
// e2e/helpers/previewFrame.ts.

/**
 * Seeds the site-wide theme before the page's first paint.
 *
 * @param page - Target page.
 * @param theme - 'light' or 'dark'.
 */
export async function setSiteTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.addInitScript((t) => {
    window.localStorage.setItem('theme', t);
    window.localStorage.setItem('theme-manual', 'true');
  }, theme);
}
