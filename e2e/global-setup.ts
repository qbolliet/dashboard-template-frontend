import type { FullConfig } from '@playwright/test';
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

export default async function globalSetup(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use?.baseURL as string | undefined;
  if (!baseURL) return;

  // Le serveur peut encore être en train de démarrer (webServer et globalSetup ne
  // sont pas garantis strictement séquentiels selon la version) : on attend sa
  // première réponse plutôt que de supposer un ordre.
  const deadline = Date.now() + 170_000;
  for (;;) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) break;
    } catch {
      // Pas encore prêt.
    }
    if (Date.now() > deadline) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  const routes = [...docsRoutes(), ...demoRoutes()];
  for (const route of routes) {
    // Une route qui échoue ici échouera de toute façon, bruyamment et avec le bon
    // contexte, dans e2e/smoke.spec.ts — inutile de dupliquer le diagnostic.
    await fetch(baseURL + route).catch(() => {});
  }
}
