import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { docsRoutes, demoRoutes } from './helpers/routes';

// =================================================================
// RÉCHAUFFAGE — une passe séquentielle avant le run parallèle
// =================================================================
// `next dev` compile chaque route À LA DEMANDE, au premier hit. Plusieurs workers
// Playwright touchant pour la première fois la MÊME route neuve en parallèle peuvent
// recevoir une réponse tronquée pendant la compilation (observé : `SyntaxError:
// Unexpected end of JSON input` côté serveur sur /demo/comptabilite-nationale/france,
// disparu en isolation — signature classique d'une course de compilation, pas un bug
// applicatif). Un aller séquentiel sur chaque route AVANT le run élimine la course à
// la source, plutôt que de la reporter sur `retries`.

// =================================================================
// DÉTECTION DU PANIC DU SERVEUR DE DEV
// =================================================================
// Un cache persistant de Turbopack périmé (`.next/dev/cache`) faisait paniquer Next 16.2.9
// (« Failed to write app endpoint … Next.js package not found ») DÈS qu'un navigateur se
// connecte au HMR — une simple requête `fetch` ne déclenche rien, d'où le navigateur
// ci-dessous. Sans cette garde, le serveur boucle (la page se recharge ~1 fois par
// seconde) et une trentaine de tests expirent chacun à 60 s, sans jamais nommer la cause.
const DEPANNAGE = 'supprimez `.next/dev/cache` puis relancez la suite';

// Au-delà de ce nombre de navigations principales en quelques secondes, la page est en
// boucle de rechargement. Une marge de 3 absorbe le rechargement complet légitime que
// Fast Refresh peut imposer au tout premier chargement d'une route.
const MAX_NAVIGATIONS = 3;
const OBSERVATION_MS = 4_000;

/**
 * Lists the Turbopack panic logs written to the OS temp dir since a given instant.
 *
 * Turbopack writes `next-panic-<hash>.log` there on every panic; the hash changes from
 * one server process to the next, so only the modification time is a reliable signal.
 *
 * @param since - Epoch milliseconds; older files belong to a previous run.
 * @returns File names of the panic logs modified at or after `since`.
 */
function freshPanicLogs(since: number): string[] {
  try {
    const dir = os.tmpdir();
    return fs
      .readdirSync(dir)
      .filter((name) => /^next-panic-.*\.log$/.test(name))
      .filter((name) => fs.statSync(path.join(dir, name)).mtimeMs >= since);
  } catch {
    return [];
  }
}

/**
 * Opens real pages in Chromium so the HMR connects, and throws if the dev server panics.
 *
 * @param baseURL - Origin of the dev server.
 * @param routes - Routes to open, one after the other.
 * @param since - Epoch milliseconds marking the start of this setup.
 * @throws If a panic log appeared or a page entered a reload loop.
 */
async function assertDevServerHealthy(
  baseURL: string,
  routes: string[],
  since: number,
): Promise<void> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    let navigations = 0;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations += 1;
    });

    for (const route of routes) {
      navigations = 0;
      await page.goto(baseURL + route, { waitUntil: 'load', timeout: 60_000 }).catch(() => {});
      await page.waitForTimeout(OBSERVATION_MS);

      const panics = freshPanicLogs(since);
      if (panics.length > 0 || navigations > MAX_NAVIGATIONS) {
        const details = [
          `Le serveur de dev a paniqué : ${DEPANNAGE}`,
          `  route : ${route} (${navigations} navigations en ${OBSERVATION_MS / 1000} s)`,
          ...(panics.length > 0
            ? [`  journal de panic : ${path.join(os.tmpdir(), panics[0])}`]
            : []),
        ];
        throw new Error(details.join('\n'));
      }
    }
  } finally {
    await browser.close();
  }
}

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL as string | undefined;
  if (!baseURL) return;
  const startedAt = Date.now();

  // Le serveur peut encore être en train de démarrer (webServer et globalSetup ne
  // sont pas garantis strictement séquentiels selon la version) : on attend sa
  // première réponse plutôt que de supposer un ordre.
  const deadline = Date.now() + 170_000;
  let ready = false;
  for (;;) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // Pas encore prêt.
    }
    if (Date.now() > deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  // Un serveur qui répond mais jamais 200 sur « / » (variante « 404 sur toutes les
  // routes » du même panic) ferait expirer toute la suite : on s'arrête ici, avec un
  // message qui dit où chercher.
  if (!ready) {
    throw new Error(`Le serveur de dev ne répond pas 200 sur ${baseURL}/ : ${DEPANNAGE}`);
  }

  const routes = [...docsRoutes(), ...demoRoutes()];
  for (const route of routes) {
    // Une route qui échoue ici échouera de toute façon, bruyamment et avec le bon
    // contexte, dans e2e/smoke.spec.ts — inutile de dupliquer le diagnostic.
    await fetch(baseURL + route).catch(() => {});
  }

  // Une page de chaque surface (documentation, démo), ouverte dans un vrai navigateur.
  await assertDevServerHealthy(baseURL, [docsRoutes()[0], demoRoutes()[0]], startedAt);
}
