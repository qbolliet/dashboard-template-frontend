import type { Locator, Page } from '@playwright/test';
import { expect } from '@playwright/test';

// =================================================================
// CADRES D'APERÇU — <ComponentPlayground> et <ComponentPreview>
// =================================================================
// Les deux composants partagent <PreviewFrame> (src/features/docs/components/
// PreviewFrame/PreviewFrame.jsx) : un <figure> avec son PROPRE bouton de bascule
// clair/sombre (`.doc-preview-frame__theme`), qui pose `data-theme` sur CE
// conteneur plutôt que sur <html>. C'est ce qui rend la régression visuelle
// possible sans toucher au thème du site — chaque composant se bascule seul.
//
// ComponentPlayground étiquette son cadre `Rendu — ${scaffold.component}`
// (le nom du composant, stable). ComponentPreview étiquette le sien
// `Aperçu — ${titre de l'exemple}` (prose française tirée du JSDoc de tête de
// registry/examples/*.jsx) — d'où playgroundFrame() qui matche le nom exact et
// previewFrame() qui matche un extrait du titre.

/** Locates a `<ComponentPlayground name="…">`'s preview frame, once its Suspense has resolved. */
export function playgroundFrame(page: Page, componentName: string): Locator {
  return page.getByRole('figure', { name: `Rendu — ${componentName}`, exact: true });
}

/** Locates a `<ComponentPreview name="…">`'s preview frame by a substring of its example title. */
export function previewFrame(page: Page, titleSubstring: string): Locator {
  return page.getByRole('figure', { name: new RegExp(`Aperçu — .*${titleSubstring}`) });
}

/**
 * Flips a preview frame's own theme toggle and waits for `data-theme` to settle.
 *
 * Le clic est réessayé (`toPass`) plutôt que tiré une seule fois : le composant sous
 * le cadre vient de sortir d'un `<Suspense>` (import paresseux du schéma de playground
 * ou de l'exemple de registry), et un clic tiré pendant cette toute première fenêtre
 * peut atteindre le DOM avant que React n'y ait raccroché ses gestionnaires — observé
 * en pratique (clic sans effet, sans erreur Playwright). Une nouvelle tentative après
 * échec est sûre ici : le bouton est un bascule à deux états, donc toute tentative qui
 * a réellement basculé fait immédiatement passer l'assertion.
 *
 * @param frame - Frame locator, as returned by `playgroundFrame`/`previewFrame`.
 */
export async function toggleFrameTheme(frame: Locator): Promise<void> {
  const before = await frame.getAttribute('data-theme');
  const button = frame.getByRole('button', { name: /Thème de l.aperçu/ });

  await expect(async () => {
    await button.click();
    // Timeout interne COURT et explicite : sans lui, cette assertion web-first réessaie
    // pour son propre compte pendant 5 s par défaut avant d'échouer, et `toPass` n'obtient
    // jamais de second essai dans son propre budget.
    await expect(frame).not.toHaveAttribute('data-theme', before ?? '', { timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

/**
 * Clicks an element and retries until an observable effect shows up.
 *
 * Même course que `toggleFrameTheme` ci-dessus, générique : le premier clic porté sur
 * un composant qui vient de sortir d'un `<Suspense>` (import paresseux) peut arriver
 * avant que React n'ait raccroché ses gestionnaires — constaté empiriquement (échoue
 * une fois sur trois environ, jamais avec une erreur Playwright puisque l'élément EST
 * cliquable, juste sans effet). Sûr à réessayer partout où l'action est idempotente ou
 * where re-clicking an already-correct target is a no-op (ex. sélectionner un onglet
 * déjà actif).
 *
 * @param locator - Element to click.
 * @param verify - Assertion proving the click took effect; must carry its OWN short
 *   `timeout` (cf. le commentaire de `toggleFrameTheme`), sinon `toPass` n'a jamais de
 *   second essai.
 */
export async function clickUntil(locator: Locator, verify: () => Promise<void>): Promise<void> {
  await expect(async () => {
    await locator.click();
    await verify();
  }).toPass({ timeout: 10_000 });
}

/** Clicks a `role="tab"` by its accessible name and waits for it to become selected. */
export async function clickTab(frame: Locator, tabName: string): Promise<void> {
  const tab = frame.getByRole('tab', { name: tabName });
  await clickUntil(tab, () => expect(tab).toHaveAttribute('aria-selected', 'true', { timeout: 1_000 }));
}
