#!/usr/bin/env node

// =================================================================
// INDEX DE RECHERCHE — arbre de navigation → public/search-index.json
// =================================================================
// Aplatit config/site.config.json en un index statique consommé par
// SearchBar (fetch au premier focus, cf. src/features/header/hooks/
// useSearchIndex.js) : navigation et recherche partagent ainsi la même
// source et ne peuvent plus diverger.
//
// Réutilise `resolveNavigationTree` et `flattenNavigation` de
// src/utils/navigation/ — ce sont les MÊMES fonctions que celles de la route
// attrape-tout (src/app/[[...slug]]/page.jsx). Ces deux fichiers n'ont ni
// dépendance ni import aliasé (voir leur en-tête), ce qui permet de les
// charger ici par chemin relatif, hors bundler Next.
//
// Script volontairement en CommonJS (cohérent avec les autres scripts/*.js),
// mais ces utilitaires sont écrits en syntaxe ESM (`export const`) pour être
// bundlés par Next.js : ils sont donc chargés via `import()` dynamique
// (Node ≥22 détecte leur syntaxe ESM automatiquement), pas via `require()`.

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const PROJECT_ROOT = path.join(__dirname, '..');
const CONFIG_PATH = path.join(PROJECT_ROOT, 'config/site.config.json');
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'public/search-index.json');

// `import()` exige une URL file:// sous Windows (un chemin `C:\...` brut lève
// ERR_UNSUPPORTED_ESM_URL_SCHEME) — d'où pathToFileURL sur chaque chemin.
const importEsm = (filePath) => import(pathToFileURL(filePath).href);

/**
 * Builds one search-index entry from a resolved (absolute-path) navigation node.
 *
 * @param {Object} node - Entry produced by `flattenNavigation`.
 * @returns {{title: string, path: string, type: string, description: string, keywords: string[]}}
 *   The index entry. `keywords` reste vide pour les nœuds de navigation : rien
 *   dans le manifeste ne l'alimente aujourd'hui (le schéma n'a pas cette clé) ;
 *   le tableau existe pour que la forme reste stable avec les entrées issues de
 *   l'API (voir le point d'extension plus bas).
 */
function toIndexEntry(node) {
  return {
    title: node.name,
    path: node.path,
    type: node.type,
    description: node.description ?? '',
    keywords: [],
  };
}

async function main() {
  const siteConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

  const { resolveNavigationTree } = await importEsm(
    path.join(PROJECT_ROOT, 'src/utils/navigation/resolveNavigationTree.js'),
  );
  const { flattenNavigation } = await importEsm(
    path.join(PROJECT_ROOT, 'src/utils/navigation/flattenNavigation.js'),
  );
  const { DEMO_BASE_PATH } = await importEsm(
    path.join(PROJECT_ROOT, 'src/utils/navigation/basePaths.js'),
  );

  // Même point de montage que src/app/(site)/layout.jsx et que la route attrape-tout de
  // la démo : depuis P4.2 la racine du déploiement appartient au site de documentation,
  // et l'application vit sous /demo. Omettre le préfixe ici produirait un index dont
  // chaque suggestion mène à un 404.
  const tree = resolveNavigationTree(siteConfig.navigation.tree, DEMO_BASE_PATH);

  const entries = flattenNavigation(tree)
    .filter((node) => node.searchable)
    .map(toIndexEntry);

  // ---------------------------------------------------------------
  // POINT D'EXTENSION — entités remontées de l'API au build
  // ---------------------------------------------------------------
  // Le manifeste ne couvre que les PAGES du site. Un catalogue d'entités plus
  // fin (variables d'un indicateur, séries…) peut être ajouté ici au build,
  // avec la même forme d'entrée, tant que chaque entité a une page vers
  // laquelle pointer.
  //
  // NE PAS passer par src/lib/api/client.js : ses modules s'importent entre eux
  // SANS EXTENSION de fichier (`from './gql'`), forme que seul le bundler Next
  // résout — un import() depuis ce script échoue en ERR_MODULE_NOT_FOUND. Les
  // utilitaires importés plus haut, eux, sont explicitement écrits pour être
  // chargeables ici (cf. leur en-tête). D'où un fetch direct sur l'endpoint :
  //
  //   const ENDPOINT = process.env.NEXT_PUBLIC_API_URL;
  //   if (ENDPOINT) {
  //     const target = entries.find((entry) => entry.type === 'indicator');
  //     const response = await fetch(ENDPOINT, {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({
  //         query: 'query GetCatalogSchema { getCatalogSchema { name label sql_type } }',
  //       }),
  //     });
  //     const { data } = await response.json();
  //     entries.push(...data.getCatalogSchema.map((field) => ({
  //       title: field.label,
  //       path: target.path,          // page qui expose ce champ
  //       type: 'field',
  //       description: `Variable du catalogue (${field.sql_type}).`,
  //       keywords: [field.name],     // le nom technique, cherché tel quel
  //     })));
  //   }
  //
  // Deux points à respecter, sans quoi l'ajout se paie ailleurs :
  //   • l'échec ne doit PAS être fatal — ce script tourne à chaque `npm run dev`,
  //     et une API injoignable ne doit pas bloquer un développeur dont le travail
  //     n'a rien à voir avec la recherche : journaliser et continuer avec les
  //     seuls nœuds du manifeste ;
  //   • `keywords` n'est comparé par personne aujourd'hui — SearchBar ne regarde
  //     que `title` et `description`. L'exploiter suppose d'étendre
  //     `computeSuggestions` (cf. docs/content/guides/barre-de-recherche.mdx).
  //
  // Sans NEXT_PUBLIC_API_URL il n'y a pas d'endpoint à interroger : ce bloc est
  // alors sauté, et l'index se réduit aux pages du manifeste.

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf8');
  console.log(`build:search : index écrit — ${entries.length} entrée(s) → public/search-index.json`);
}

main().catch((err) => {
  console.error('build:search : échec —', err.message);
  process.exit(1);
});
