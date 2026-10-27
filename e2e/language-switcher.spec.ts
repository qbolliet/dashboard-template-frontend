import { test, expect } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';
import { playgroundFrame, clickUntil } from './helpers/previewFrame';

// =================================================================
// LANGUAGESWITCHER — drapeaux injoignables, alignement du menu, cadre d'aperçu
// =================================================================
// Ce que seul un vrai navigateur vérifie :
//
//   C5  — ordre de résolution des drapeaux : fichier local → flagcdn.com → CODE PAYS.
//         flagcdn.com injoignable : les drapeaux locaux s'affichent ; fichier local absent :
//         drapeau du CDN ; les deux hors d'atteinte : le code pays et non l'icône d'image
//         cassée de Chromium, sans décaler la mise en page.
//   C18 — `menuAlign="right"` colle le menu au bord droit du BOUTON, y compris dans le
//         header de la démo à 375 px, et le cadre d'aperçu du playground contient le
//         menu ouvert (une seule barre de défilement, pas deux).
//   C17 — « Nombre de langues » se reflète dans le code généré.
//
// ⚠️ Pourquoi l'hypothèse « <img alt=""> en échec n'est pas peinte » était FAUSSE : ce
// n'est vrai que d'une image sans dimensions imposées. Dès que le CSS fixe `width`/
// `height` (ici 100 % de la pastille), Chromium réserve la boîte et y peint l'icône
// d'image cassée, alt vide ou non. Et `naturalWidth === 0` ne prouve rien dans l'autre
// sens : une image cassée a naturalWidth 0 ET est peinte. On vérifie donc ce qui compte
// vraiment — ce que l'utilisateur VOIT : `elementFromPoint` au centre du repli (une
// image `visibility: hidden` est ignorée par ce test de pointage, une image cassée
// peinte ne l'est pas) et la visibilité calculée de l'<img>.

const FLAG_URL = '**/flagcdn.com/**';

// Drapeau factice servi quand on veut une ligne de base DÉTERMINISTE sans dépendre du
// réseau réel : 3×2 comme les vrais, donc même rapport d'aspect.
const FAKE_FLAG_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="20" viewBox="0 0 30 20">' +
  '<rect width="30" height="20" fill="#2a6cb0"/></svg>';

const LOCAL_FLAG_URL = '**/flags/**';

// served        : fichiers locaux réels + faux drapeau CDN (ligne de base déterministe)
// cdn-blocked   : flagcdn.com injoignable, fichiers locaux servis
// local-missing : fichiers locaux en 404, flagcdn.com servi
// all-blocked   : fichiers locaux ET flagcdn.com injoignables
type Mode = 'served' | 'cdn-blocked' | 'local-missing' | 'all-blocked';

/** Routes the local flag files and flagcdn.com according to `mode`. */
async function routeFlags(page: Page, mode: Mode): Promise<void> {
  const cdnUp = mode === 'served' || mode === 'local-missing';
  await page.route(FLAG_URL, (route) =>
    cdnUp
      ? route.fulfill({ status: 200, contentType: 'image/svg+xml', body: FAKE_FLAG_SVG })
      : route.abort('connectionrefused'),
  );
  if (mode === 'all-blocked') {
    await page.route(LOCAL_FLAG_URL, (route) => route.abort('connectionrefused'));
  } else if (mode === 'local-missing') {
    await page.route(LOCAL_FLAG_URL, (route) => route.fulfill({ status: 404, body: 'not found' }));
  }
}

interface ChipReport {
  country: string;
  fallbackVisible: boolean;
  fallbackOnTop: boolean;
  imgState: 'absent' | 'hidden' | 'visible';
  rect: [number, number, number, number];
}

/** Reads, for each flag chip under `root`, what the user actually sees. */
async function readChips(root: Locator): Promise<ChipReport[]> {
  return root.locator('.lang-switch-flag').evaluateAll((chips) =>
    chips.map((chip) => {
      // `elementFromPoint` ne répond QUE pour un point visible dans la fenêtre (null
      // sinon) : un playground bas dans la page, ou une option au-delà de la hauteur
      // du menu, serait sinon jugé « recouvert » à tort.
      chip.scrollIntoView({ block: 'center', inline: 'center' });
      const fallback = chip.querySelector('.lang-switch-flag-fallback') as HTMLElement;
      const img = chip.querySelector('img');
      const box = fallback.getBoundingClientRect();
      const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      const style = img ? getComputedStyle(img) : null;
      const chipBox = chip.getBoundingClientRect();
      // Coordonnées RELATIVES à la racine du sélecteur : le défilement ci-dessus déplace
      // la page, pas la pastille dans son composant — c'est cela qu'on compare.
      const origin = (chip.closest('.lang-switch') as HTMLElement).getBoundingClientRect();

      return {
        country: fallback.textContent ?? '',
        fallbackVisible: getComputedStyle(fallback).visibility !== 'hidden' && box.width > 0,
        // Le repli est « au sommet » quand rien de peint ne le recouvre : ni l'<img>
        // visible, ni son icône d'image cassée (qui appartient à l'<img>).
        fallbackOnTop: top !== null && !(top instanceof HTMLImageElement),
        imgState: !img
          ? 'absent'
          : style!.visibility === 'hidden' || style!.display === 'none' || Number(style!.opacity) === 0
            ? 'hidden'
            : 'visible',
        rect: [chipBox.x - origin.x, chipBox.y - origin.y, chipBox.width, chipBox.height] as [number, number, number, number],
      };
    }),
  );
}

/**
 * Waits until the switcher's own stylesheet is applied.
 *
 * Le CSS du composant est un morceau chargé À LA DEMANDE avec le playground : WebKit
 * (`next dev`) peint le composant un instant AVANT son arrivée. Mesurer à ce moment
 * ne dirait rien — pastille non arrondie, image qui n'est pas encore cachée par sa règle.
 * `overflow: hidden` (pastille ronde) est posé par FlagChip.scss et par aucun autre style.
 */
async function stylesApplied(root: Locator): Promise<void> {
  await expect(root.locator('.lang-switch-flag').first()).toHaveCSS('overflow', 'hidden');
}

/** Opens the menu of a switcher and waits for its options. */
async function openMenu(root: Locator): Promise<Locator> {
  const button = root.getByRole('button', { expanded: false }).first();
  const listbox = root.getByRole('listbox');
  await clickUntil(button, () => expect(listbox).toBeVisible({ timeout: 1_000 }));
  return listbox;
}

/** Bounding boxes of every element matched, relative to its switcher root, rounded to avoid sub-pixel noise. */
async function boxes(locator: Locator): Promise<number[][]> {
  return locator.evaluateAll((els) =>
    els.map((el) => {
      const b = el.getBoundingClientRect();
      const o = (el.closest('.lang-switch') as HTMLElement).getBoundingClientRect();
      return [b.x - o.x, b.y - o.y, b.width, b.height].map((n) => Math.round(n * 2) / 2);
    }),
  );
}

interface Surface {
  name: string;
  path: string;
  /** Locates the switcher root once the page is loaded. */
  root: (page: Page) => Locator;
}

const SURFACES: Surface[] = [
  {
    name: 'playground (docs)',
    path: '/composants/language-switcher',
    root: (page) => playgroundFrame(page, 'LanguageSwitcher').locator('.lang-switch'),
  },
  {
    name: 'header (démo)',
    path: '/demo/fr',
    root: (page) => page.getByRole('banner').locator('.lang-switch'),
  },
];

test.describe('LanguageSwitcher — drapeaux injoignables, repli sur le code pays (C5)', () => {
  for (const surface of SURFACES) {
    test(`${surface.name} : fichier local et CDN injoignables, le code pays remplace l'image cassée, sans décalage`, async ({ browser, baseURL }) => {
      // Un CONTEXTE par passe, pas une page rechargée : WebKit sert un drapeau déjà vu
      // depuis son cache mémoire sans repasser par `page.route`, de sorte que la passe
      // « bloquée » aurait peint le faux drapeau de la passe précédente et ne prouverait
      // rien. Un contexte neuf a un cache vide ; on lui redonne les options du projet.
      const open = async (mode: Mode) => {
        const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
        const page = await context.newPage();
        await routeFlags(page, mode);
        await page.goto(surface.path, { waitUntil: 'networkidle' });
        return { context, page };
      };

      // --- Ligne de base : drapeaux servis -----------------------------------------
      const served = await open('served');
      const root = surface.root(served.page);
      await expect(root).toBeVisible();
      await stylesApplied(root);

      const buttonServed = await boxes(root.getByRole('button'));
      const chipsServedButton = await readChips(root);
      await openMenu(root);
      const optionsServed = await boxes(root.getByRole('option'));
      const chipsServedMenu = await readChips(root.getByRole('listbox'));

      // Sanity : sans blocage, l'image EST peinte — sinon le test ne prouverait rien.
      await expect(async () => {
        expect((await readChips(root)).every((chip) => chip.imgState === 'visible')).toBe(true);
      }).toPass({ timeout: 5_000 });
      expect(chipsServedButton.length).toBeGreaterThan(0);
      expect(chipsServedMenu.length).toBeGreaterThan(1);

      // --- Même page, fichiers locaux ET flagcdn.com abandonnés ----------------------------------------
      await served.context.close();
      const blocked = await open('all-blocked');
      const blockedRoot = surface.root(blocked.page);
      await expect(blockedRoot).toBeVisible();
      await stylesApplied(blockedRoot);

      // Même ORDRE de mesure que la ligne de base : readChips fait défiler le menu, ce qui
      // décalerait les options mesurées après lui.
      const buttonBlocked = await boxes(blockedRoot.getByRole('button'));
      const chipsButton = await readChips(blockedRoot);
      await openMenu(blockedRoot);
      const optionsBlocked = await boxes(blockedRoot.getByRole('option'));
      const chipsMenu = await readChips(blockedRoot.getByRole('listbox'));

      // Bouton ET toutes les options.
      for (const [where, chips] of [['bouton', chipsButton], ['options', chipsMenu]] as const) {
        expect(chips.length, `pastilles du ${where}`).toBeGreaterThan(0);

        for (const chip of chips) {
          const label = `${where} ${chip.country}`;
          expect(chip.country, `${label} : texte de repli`).toMatch(/^[A-Z]{2}$/);
          expect(chip.fallbackVisible, `${label} : repli visible`).toBe(true);
          expect(chip.fallbackOnTop, `${label} : repli non recouvert par l'image`).toBe(true);
          expect(chip.imgState, `${label} : image absente ou cachée`).not.toBe('visible');
        }
      }

      // Une image encore présente doit être cachée ET non chargée ; naturalWidth seul
      // ne suffit pas (cf. l'en-tête), mais il doit au moins confirmer l'échec.
      const stillMounted = await blockedRoot.locator('.lang-switch-flag img').evaluateAll((imgs) =>
        imgs.map((img) => (img as HTMLImageElement).naturalWidth),
      );
      for (const width of stillMounted) expect(width).toBe(0);

      // Aucun décalage : mêmes boîtes avec et sans blocage.
      expect(buttonBlocked, 'boîte du bouton').toEqual(buttonServed);
      expect(optionsBlocked, 'boîtes des options').toEqual(optionsServed);
      expect(chipsButton.map((chip) => chip.rect), 'pastille du bouton').toEqual(
        chipsServedButton.map((chip) => chip.rect),
      );
      expect(chipsMenu.map((chip) => chip.rect), 'pastilles des options').toEqual(
        chipsServedMenu.map((chip) => chip.rect),
      );

      await blocked.context.close();
    });
  }
});

test.describe('LanguageSwitcher — ordre de résolution des drapeaux (C5)', () => {
  const cases: Array<{ mode: Mode; expected: RegExp; label: string }> = [
    { mode: 'cdn-blocked', expected: /\/flags\/[a-z]{2}\.svg$/, label: 'flagcdn.com injoignable : drapeaux locaux' },
    { mode: 'local-missing', expected: /^https:\/\/flagcdn\.com\/[a-z]{2}\.svg$/, label: 'fichier local absent : drapeau du CDN' },
  ];

  for (const { mode, expected, label } of cases) {
    test(label, async ({ browser, baseURL }) => {
      // Contexte neuf : cache vide, voir la note du test précédent.
      const context = await browser.newContext({ baseURL, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await routeFlags(page, mode);
      await page.goto('/demo/fr', { waitUntil: 'networkidle' });

      const root = page.getByRole('banner').locator('.lang-switch');
      await expect(root).toBeVisible();
      await stylesApplied(root);
      await openMenu(root);

      // Le drapeau se peint (visible) depuis la bonne source, sans retomber sur le texte.
      await expect(async () => {
        const chips = await readChips(root);
        expect(chips.length).toBeGreaterThan(1);
        expect(chips.every((chip) => chip.imgState === 'visible')).toBe(true);
      }).toPass({ timeout: 5_000 });

      const sources = await root.locator('.lang-switch-flag img').evaluateAll((imgs) =>
        imgs.map((img) => (img as HTMLImageElement).getAttribute('src') ?? ''),
      );
      for (const src of sources) expect(src).toMatch(expected);

      await context.close();
    });
  }
});

test.describe('LanguageSwitcher — menu aligné à droite (C18)', () => {
  test('playground : le bord droit du menu colle à celui du bouton, sans double défilement', async ({ page }) => {
    await routeFlags(page, 'served');
    await page.goto('/composants/language-switcher', { waitUntil: 'networkidle' });

    const frame = playgroundFrame(page, 'LanguageSwitcher');
    const section = frame.locator('.lang-switch');
    await expect(section).toBeVisible();

    // « Droite » : bouton à bascule du groupe « Alignement du menu » (aria-pressed).
    const right = page.getByRole('group', { name: /Alignement du menu/ }).getByRole('button', { name: 'Droite' });
    await clickUntil(right, () => expect(right).toHaveAttribute('aria-pressed', 'true', { timeout: 1_000 }));

    // La section enveloppe le BOUTON seul, pas le conteneur : sa largeur est celle du bouton.
    const sectionBox = await section.boundingBox();
    const buttonBox = await section.getByRole('button').boundingBox();
    expect(sectionBox!.width).toBeCloseTo(buttonBox!.width, 0);

    const listbox = await openMenu(section);
    const menuBox = await listbox.boundingBox();
    const buttonAfter = await section.getByRole('button').boundingBox();
    expect(menuBox!.x + menuBox!.width).toBeCloseTo(buttonAfter!.x + buttonAfter!.width, 0);

    // Le cadre contient le menu ouvert : ni défilement interne, ni menu qui en sort.
    const frameBox = await frame.boundingBox();
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(frameBox!.y + frameBox!.height + 0.5);
    const overflow = await frame.evaluate((el) => ({
      y: el.scrollHeight - el.clientHeight,
      x: el.scrollWidth - el.clientWidth,
    }));
    expect(overflow.y, 'défilement vertical du cadre').toBeLessThanOrEqual(0);
    expect(overflow.x, 'défilement horizontal du cadre').toBeLessThanOrEqual(0);

    // Et la page elle-même n'a pas gagné de barre de défilement horizontale.
    const pageOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(pageOverflow).toBeLessThanOrEqual(0);
  });

  test('header de la démo à 375 px : le menu ne sort pas de l\'écran', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await routeFlags(page, 'served');
    await page.goto('/demo/fr', { waitUntil: 'networkidle' });

    const root = page.getByRole('banner').locator('.lang-switch');
    await expect(root).toBeVisible();
    const listbox = await openMenu(root);
    const menu = await listbox.boundingBox();

    expect(menu!.x).toBeGreaterThanOrEqual(0);
    expect(menu!.x + menu!.width).toBeLessThanOrEqual(375 + 0.5);
  });
});

test.describe('LanguageSwitcher — code généré (C17)', () => {
  test('« Nombre de langues » se reflète dans le code', async ({ page }) => {
    await routeFlags(page, 'served');
    await page.goto('/composants/language-switcher', { waitUntil: 'networkidle' });

    const playground = page.getByRole('region', { name: 'Playground — LanguageSwitcher' });
    const code = playground.locator('pre');
    await expect(code).not.toContainText('languages=');

    const count = playground.getByRole('spinbutton', { name: 'Nombre de langues' });
    // Les flèches du champ (pas à pas) et non `fill` : sous WebKit, `fill` pose la valeur
    // d'un <input type="number"> sans que React ne reçoive le changement, et la
    // sélection de texte n'y est pas prise en charge — particularités de l'outil, pas du
    // composant. Les flèches déclenchent un vrai `input` dans les trois moteurs.
    const setCount = async (value: string) => {
      await count.focus();
      const steps = Number(value) - Number(await count.inputValue());
      for (let i = 0; i < Math.abs(steps); i += 1) await count.press(steps > 0 ? 'ArrowUp' : 'ArrowDown');
    };
    // Réessayé : la première saisie peut précéder l'accroche des gestionnaires React après
    // le `<Suspense>` du playground (même course que `clickUntil`, cf. previewFrame.ts) ;
    // `setCount` part de la valeur COURANTE, donc rejouer la même cible est sans effet.
    await expect(async () => {
      await setCount('3');
      await expect(code).toContainText('languages=', { timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    await expect(code).toContainText("code: 'es'");
    await expect(code).not.toContainText("code: 'de'");

    // Au-delà de huit, le composant accepte toute liste : le contrôle ne plafonne plus à 8.
    await setCount('10');
    await expect(playgroundFrame(page, 'LanguageSwitcher').locator('.lang-switch')).toBeVisible();
    await expect(code).toContainText('languages=');
    await expect(code.getByText('name:', { exact: false })).not.toHaveCount(0);

    await setCount('8');
    await expect(code).not.toContainText('languages=');
  });
});
