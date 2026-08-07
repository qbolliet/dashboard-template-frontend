import { defineConfig, devices } from '@playwright/test';

// =================================================================
// PLAYWRIGHT — fumée + régression visuelle (P5.2 de TEMPLATIZATION_PROMPTS.md)
// =================================================================
// Un seul navigateur (Chromium) : la régression visuelle compare des captures
// d'écran, et faire varier le moteur de rendu entre exécutions ajouterait une
// source de diff sans rapport avec le composant testé. Voir la section
// « Testing » de README.md pour la procédure de régénération des instantanés.

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // Réchauffe toutes les routes séquentiellement avant le run parallèle — cf. le
  // commentaire de tête de e2e/global-setup.ts (course de compilation de `next dev`).
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // Plafonné à 2 (jamais `undefined`/tous les cœurs) : le globe (WebGL) rend en LOGICIEL
  // dans ce genre d'environnement (headless, sans GPU) et est mesurablement lent — constaté
  // en pratique, une exécution à 4 workers fait timeouter des routes normalement rapides
  // (/features/filter, /features/globe) par simple famine CPU pendant que les tests du
  // globe tournent. e2e/edge-cases.spec.ts isole déjà SES propres tests Globe entre eux
  // (`test.describe.serial`) ; ce plafond global les isole aussi des AUTRES fichiers.
  workers: 2,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  // Généreux (défaut Playwright : 30 s) pour la même raison que `workers` ci-dessus.
  timeout: 60_000,

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    // Neutralise une source d'instabilité citée par la consigne : les animations
    // pilotées par CSS (@media (prefers-reduced-motion: reduce), 22 fichiers du
    // dépôt) ET la rotation/comète WebGL du globe, qui lit la même préférence au
    // montage (cf. src/features/globe/components/Globe/Globe.jsx). Les captures
    // d'écran désactivent en plus, par défaut Playwright, les transitions/
    // animations CSS restantes le temps du cliché.
    //
    // Sous `contextOptions` et non directement sous `use` : cette version de
    // @playwright/test (1.62) ne remonte pas encore `reducedMotion` dans son type
    // `PlaywrightTestOptions` aplati (contrairement à `colorScheme`/`viewport`),
    // seul `contextOptions: BrowserContextOptions` l'accepte — vérifié dans
    // node_modules/playwright/types/test.d.ts, qui documente d'ailleurs cette
    // forme comme l'exemple canonique.
    contextOptions: {
      reducedMotion: 'reduce',
    },
  },

  expect: {
    // Tolérance globale : anti-aliasing/rendu sous-pixel, pas motif de faux positif.
    // Le globe (WebGL) est exclu de la comparaison pixel — cf. e2e/edge-cases.spec.ts.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // `npm run dev` fait tourner tout le pipeline de préconstruction (recherche, registry,
  // props, index de doc, tokens) avant next dev — donc les deux nouveaux exemples et pages
  // de composants/ sont déjà résolus quand le serveur répond. `reuseExistingServer` en
  // local évite de relancer un serveur déjà démarré à la main pendant le développement des
  // tests ; en CI, toujours un serveur frais.
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { PORT: String(PORT) },
  },
});
