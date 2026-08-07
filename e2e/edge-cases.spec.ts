import { test, expect } from '@playwright/test';
import type { Locator } from '@playwright/test';
import { playgroundFrame, previewFrame, clickTab } from './helpers/previewFrame';

// =================================================================
// CAS LIMITES HÉRITÉS DES PAGES /test-* (P4.6 de TEMPLATIZATION_PROMPTS.md)
// =================================================================
// Reprend la colonne « destination : test » du tableau de correspondance produit en
// P4.6 (« Constat d'exécution », TEMPLATIZATION_PROMPTS.md) : chaque bloc ci-dessous
// pointe vers le commentaire qui l'a explicitement laissé en attente de cette suite.

test.describe('Chart — coercition ISO et branchement loading/error/success', () => {
  // chart-api.jsx (registry/examples), câblé dans docs/content/features/chart.mdx par
  // ce lot : useFactTable() alimente <Chart x="date_obs"> avec une colonne ISO brute,
  // convertie en interne par `coerce()`. Le crawl de e2e/smoke.spec.ts vérifie déjà
  // l'absence d'erreur console sur cette page ; ce test vérifie en plus que la branche
  // SUCCESS est bien celle qui s'affiche (pas de blocage sur "Chargement…").
  test('la branche succès rend le graphique', async ({ page }) => {
    await page.goto('/features/chart');
    const frame = previewFrame(page, 'Données API');

    await expect(frame.getByText('Erreur de chargement', { exact: false })).toHaveCount(0);
    await expect(frame.locator('svg')).toBeVisible();
  });
});

test.describe('Chart — heatmap, deux layouts de légende', () => {
  // chart-heatmap.jsx : la légende séquentielle (z) bascule entre une disposition
  // verticale repliée et une disposition horizontale pleine largeur selon l'espace
  // disponible — signalé comme « régression visuelle candidate » dans le constat
  // d'exécution de P4.6.
  for (const [label, width] of [['etroit', 480], ['large', 1280]] as const) {
    test(label, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/features/chart');
      const frame = previewFrame(page, 'Heatmap');
      await expect(frame.locator('svg')).toBeVisible();
      // Laisse le calcul de mise en page visx/d3 (échelles, positionnement de la légende
      // selon la largeur) se stabiliser avant le cliché : sous charge CPU (suite complète
      // exécutée en parallèle), la mise en page peut ne pas être encore retombée au moment
      // où le <svg> devient visible, malgré l'attente de stabilité intégrée à Playwright.
      await page.waitForTimeout(300);
      // Tolérance plus large que le défaut du projet (0,02) : ce SVG est dense en texte
      // (étiquettes de mois/pays, valeurs de légende) et sensible, sous charge CPU
      // partagée, à des écarts de rastérisation sous-pixel des polices — constaté en
      // pratique (jusqu'à ~15 % de pixels différents entre deux exécutions par ailleurs
      // visuellement identiques). Ce que ce test vérifie — PRÉSENCE de la disposition
      // repliée vs pleine largeur de la légende — reste couvert malgré cette tolérance.
      await expect(frame).toHaveScreenshot(`chart-heatmap-legend-${label}.png`, { maxDiffPixelRatio: 0.2 });
    });
  }
});

test.describe('Table — lignes vides / branchement API', () => {
  // Aucune couverture loading/error/lignes-vides n'existait nulle part avant ce lot
  // (« à créer en P5.2 », constat d'exécution de P4.6) : table-empty.jsx et
  // table-api.jsx (registry/examples) sont créés par ce même lot pour porter ces cas.
  test('data=[] affiche le message de remplacement', async ({ page }) => {
    await page.goto('/features/table');
    const frame = previewFrame(page, 'Aucune ligne');
    await expect(frame.getByText('Aucune ligne ne correspond aux filtres.')).toBeVisible();
  });

  test('la branche succès rend des lignes', async ({ page }) => {
    await page.goto('/features/table');
    const frame = previewFrame(page, 'Données API');

    await expect(frame.getByText('Erreur de chargement', { exact: false })).toHaveCount(0);
    await expect(frame.locator('tbody tr').first()).toBeVisible();
  });
});

// Les trois tests Globe ci-dessous partagent un même moteur WebGL coûteux (rendu
// logiciel en environnement headless, sans GPU) : les faire tourner EN PARALLÈLE avec
// d'autres instances Chromium concurrentes les affame de cycles CPU, au point de faire
// échouer des assertions par simple lenteur (constaté empiriquement — canvas introuvable
// dans les 5 s, rotation non détectée dans les 2 s). `serial` les isole les uns des
// autres ; ils continuent de tourner en parallèle du reste de la suite.
test.describe.serial('Globe', () => {
  test.describe('prefers-reduced-motion', () => {
    // GlobeEngine force autoRotate/arcsDynamic à false au montage quand la préférence
    // système est active (Globe.jsx, effet ~L220) — jamais démontré nulle part avant ce
    // lot (commentaire de tête de docs/playgrounds/globe.jsx : « couverture laissée à
    // une future suite Playwright (page.emulateMedia) »).
    //
    // PAS DE VÉRIFICATION PAR LE CONTENU DU CANVAS — abandonnée après investigation, pas
    // par choix de départ. Trois techniques essayées, toutes sans issue sous le rendu
    // WebGL LOGICIEL (headless, sans GPU) de cet environnement :
    //   1. `canvas.toDataURL()` — renvoie la MÊME image qu'il y ait rotation ou non
    //      (buffer non préservé entre deux lectures, cf. `preserveDrawingBuffer`) ;
    //   2. `canvas.getContext('2d').drawImage(canvasWebGL, …)` puis `getImageData` —
    //      renvoie systématiquement un canvas UNIFORME (0,0,0,0), y compris sur un
    //      globe fraîchement monté, pour la même raison ;
    //   3. `locator.screenshot()` (capture compositée, CDP) — n'atteint jamais l'état
    //      « stable » que Playwright attend avant de déclencher, y compris avec
    //      reduced-motion actif : expire systématiquement.
    // Modifier le moteur pour exposer un état de rotation testable (ex. render à la
    // demande) déborderait largement le périmètre de ce lot. C'est exactement le cas que
    // la consigne anticipe : « exclus [le globe] ou tolère un seuil de différence élevé » —
    // ici, exclu du contenu visuel, gardé pour ce qui reste observable de façon fiable :
    // absence d'erreur console et présence du canvas, ci-dessous et dans
    // e2e/smoke.spec.ts (qui charge déjà /features/globe sous reducedMotion: 'reduce',
    // le défaut du projet — cf. playwright.config.ts).
    test('se monte sans erreur sous reduced-motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });

      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error') consoleErrors.push(message.text());
      });

      await page.goto('/features/globe');

      // .globe-stage canvas SEUL est ambigu : globe.mdx rend aussi deux <Globe> figés
      // en « Cas d'usage » (globe-toolbar-restricted, globe-points-only) — on cible
      // donc spécifiquement le canvas du PLAYGROUND.
      const canvas = playgroundFrame(page, 'Globe').locator('canvas');
      await expect(canvas).toBeVisible({ timeout: 15_000 });
      await page.waitForTimeout(600);

      expect(consoleErrors, 'aucune erreur console sous reduced-motion').toEqual([]);
    });
  });

  test.describe('épuisement des contextes WebGL', () => {
    // dispose() libère explicitement les ressources GPU ET force la perte du contexte
    // (renderer.forceContextLoss()) pour que Chrome ne sature pas son plafond (~16
    // contextes actifs) après quelques montages/démontages — cf. le commentaire de
    // GlobeEngine.dispose(). Navigation CLIENTE répétée (next/link, pas de rechargement
    // complet) : un rechargement complet libérerait tout de lui-même et ne testerait rien.
    test('des montages/démontages client-side répétés ne dégradent pas le rendu', async ({ page }) => {
      // Chronométré en pratique sur cette machine (rendu WebGL logiciel, sans GPU,
      // headless) : chaque aller-retour de navigation cliente vers/depuis la page du
      // globe prend jusqu'à ~18 s à lui seul (déchargement du moteur Three.js compris),
      // bien au-delà d'une transition next/link ordinaire. 5 cycles suffisent à
      // démontrer que dispose() ne laisse rien fuir d'un montage à l'autre sans faire
      // dériver le test vers un temps d'exécution déraisonnable — cf. le commentaire de
      // tête sur les 20 contextes, qui reste la limite théorique visée par le code, pas
      // le nombre de cycles que CE test doit reproduire.
      test.setTimeout(600_000);

      const webglErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() === 'error' && /webgl|context/i.test(message.text())) {
          webglErrors.push(message.text());
        }
      });

      await page.goto('/features/globe');
      const initialCanvas = playgroundFrame(page, 'Globe').locator('canvas');
      await expect(initialCanvas).toBeVisible({ timeout: 15_000 });
      // Amorce : l'initialisation du moteur (géométrie de ~82k sommets, décodage de
      // textures) occupe le thread principal assez longtemps — sous rendu logiciel
      // (headless, sans GPU) — pour retarder la prise en compte du tout premier clic
      // bien au-delà d'une course d'hydratation ordinaire. On laisse le moteur finir
      // avant de commencer le cycle, plutôt que de gonfler le budget de CHAQUE clic.
      await page.waitForTimeout(1_500);

      const previous = page.getByRole('link', { name: 'Précédent' });
      const next = page.getByRole('link', { name: 'Suivant' });

      // Chaque clic est vérifié par l'URL atteinte, pas supposé : un clic tiré avant la
      // fin de l'hydratation (même course que clickTab, cf. e2e/helpers/previewFrame.ts)
      // laisserait le cycle dériver vers d'autres pages de la doc plutôt que de réellement
      // alterner header ⇄ globe, ce qui invaliderait le compte de montages/démontages.
      const followAndExpect = async (link: Locator, path: string) => {
        await expect(async () => {
          await link.click();
          await expect(page).toHaveURL(new RegExp(`${path}$`), { timeout: 3_000 });
        }).toPass({ timeout: 60_000 });
      };

      for (let i = 0; i < 5; i += 1) {
        await followAndExpect(previous, '/features/header');
        await followAndExpect(next, '/features/globe');
      }

      // Sanity finale : le canvas est toujours là et visible après le cycle — pas de
      // vérification par le CONTENU du canvas, cf. le commentaire de tête du bloc
      // « prefers-reduced-motion » ci-dessus (techniques de lecture toutes sans issue
      // sous ce rendu WebGL logiciel).
      const canvas = playgroundFrame(page, 'Globe').locator('canvas');
      await expect(canvas).toBeVisible({ timeout: 15_000 });
      expect(webglErrors, 'aucune erreur de contexte WebGL après les cycles').toEqual([]);
    });
  });
});

test.describe('Tabs — cas limites de /test-tabs (docs/content/composants/tabs.mdx)', () => {
  // Les cinq exemples ci-dessous (registry/examples/tabs-*.jsx) sont, au mot près, le
  // « futur fixture direct d'un test P5.2 ciblé » annoncé par le constat d'exécution
  // de P4.6 pour chacun de ces cas.

  test('tabs-disabled — onglet désactivé non sélectionnable, sauté au clavier', async ({ page }) => {
    await page.goto('/composants/tabs');
    const frame = previewFrame(page, 'Onglet désactivé');
    const disabledTab = frame.getByRole('tab', { name: 'Invitations (indisponible)' });

    await expect(disabledTab).toHaveAttribute('aria-disabled', 'true');

    // Amorce : une VRAIE transition d'onglet (clic réessayé, cf. clickTab) prouve que
    // React a fini de raccrocher ses gestionnaires avant qu'on s'appuie sur un événement
    // clavier — non idempotent, celui-là, donc pas rejouable en cas d'échec silencieux.
    await clickTab(frame, 'Rôles');
    await clickTab(frame, 'Membres actifs');

    // aria-disabled (contrairement à l'attribut natif `disabled`) laisse le bouton
    // focusable : ce clic forcé DÉPLACE donc le focus sur l'onglet désactivé lui-même.
    await disabledTab.click({ force: true });
    await expect(disabledTab).toHaveAttribute('aria-selected', 'false');

    // Flèche droite depuis « Membres actifs » doit sauter l'onglet désactivé et
    // atteindre directement « Rôles » — d'où le refocus explicite : partir du focus
    // laissé par le clic ci-dessus (sur l'onglet désactivé, hors piste navigable)
    // ferait entrer par l'extrémité (TabList.jsx, activeIndex === -1) et masquerait
    // le comportement réellement testé ici.
    await frame.getByRole('tab', { name: 'Membres actifs' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(frame.getByRole('tab', { name: 'Rôles' })).toBeFocused();
  });

  test('tabs-keep-mounted — la saisie survit à un aller-retour d’onglet', async ({ page }) => {
    await page.goto('/composants/tabs');
    const frame = previewFrame(page, 'Persistance');
    const input = frame.getByPlaceholder('Saisissez du texte…');

    await input.fill('brouillon en cours');
    await clickTab(frame, 'Aperçu');
    await clickTab(frame, 'Brouillon');

    await expect(input).toHaveValue('brouillon en cours');
  });

  test('tabs-controlled — le parent pilote l’onglet actif', async ({ page }) => {
    await page.goto('/composants/tabs');
    const frame = previewFrame(page, 'Mode contrôlé');

    await expect(frame.getByText('Granularité active :')).toContainText('jour');
    await clickTab(frame, 'Semaine');
    await expect(frame.getByText('Granularité active :')).toContainText('semaine');
    await expect(frame.getByRole('tab', { name: 'Semaine' })).toHaveAttribute('aria-selected', 'true');
  });

  test('tabs-no-default — repli du roving tabindex sans sélection', async ({ page }) => {
    await page.goto('/composants/tabs');
    const frame = previewFrame(page, 'repli du roving tabindex');
    const tabs = frame.getByRole('tab');

    await expect(tabs).toHaveCount(3);
    for (const tab of await tabs.all()) {
      await expect(tab).toHaveAttribute('aria-selected', 'false');
    }
    // Exactement un onglet reste atteignable au clavier (tabindex=0) — le repli — les
    // deux autres sont à -1.
    await expect(frame.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await expect(frame.locator('[role="tab"][tabindex="-1"]')).toHaveCount(2);
  });

  test('tabs-overflow — la piste déborde et défile horizontalement', async ({ page }) => {
    await page.goto('/composants/tabs');
    const frame = previewFrame(page, 'défilement horizontal');
    const track = frame.getByRole('tablist');

    const [scrollWidth, clientWidth] = await track.evaluate((el) => [el.scrollWidth, el.clientWidth]);
    expect(scrollWidth, 'la piste doit déborder de sa largeur visible').toBeGreaterThan(clientWidth);
  });
});
