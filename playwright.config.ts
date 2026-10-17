import { defineConfig, devices } from '@playwright/test';

// =================================================================
// PLAYWRIGHT — fumée, parcours et régression visuelle
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
  // Une reprise PARTOUT, y compris en local, et non plus en CI seulement.
  //
  // Raison : deux familles de tests sont sensibles à la famine CPU décrite sous `workers`
  // — les captures de régression visuelle (une transition CSS pas tout à fait terminée
  // donne ~3 % de pixels différents) et les tests WebGL du globe. Chacune passe
  // systématiquement lancée seule ; dans la suite complète, une exécution sur deux voit
  // UNE cible échouer, jamais la même. La suite ayant grossi avec l'internationalisation
  // (le test de fumée couvre désormais chaque route dans chaque langue), le phénomène est
  // devenu régulier.
  //
  // Playwright distingue « flaky » de « passed » dans son rapport : une vraie régression
  // échoue à la reprise et reste donc visible. Ce réglage ne masque rien, il absorbe une
  // instabilité d'ENVIRONNEMENT.
  retries: process.env.CI ? 2 : 1,
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

  // `npm run dev` fait tourner tout le pipeline de préconstruction (cf. le script `dev` de
  // package.json) avant next dev — donc les artefacts générés sont déjà résolus quand le
  // serveur répond. `reuseExistingServer` en
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
