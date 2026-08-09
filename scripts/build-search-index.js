#!/usr/bin/env node

// =================================================================
// INDEX DE RECHERCHE — arbre de navigation → public/search-index.<langue>.json
// =================================================================
// Aplatit config/site.config.json en un index statique consommé par
// SearchBar (fetch au premier focus, cf. src/features/header/hooks/
// useSearchIndex.js) : navigation et recherche partagent ainsi la même
// source et ne peuvent plus diverger.
//
// UN FICHIER PAR LANGUE depuis P5.4, et non un index unique portant des objets
// `{ fr, en }` : l'index est chargé tel quel par un composant client qui en rend les
// champs directement. Y laisser les cartes de traduction ferait rendre un objet comme
// enfant React — c'est exactement ce qui cassait avant cette correction. Les chemins
// aussi diffèrent par langue (/demo/fr/… contre /demo/en/…), donc un index partagé
// serait de toute façon faux pour toutes les langues sauf une.
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
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public');

/** Name of the index file of a locale. Contract shared with useSearchIndex.js. */
const outputName = (locale) => `search-index.${locale}.json`;

// `import()` exige une URL file:// sous Windows (un chemin `C:\...` brut lève
// ERR_UNSUPPORTED_ESM_URL_SCHEME) — d'où pathToFileURL sur chaque chemin.
const importEsm = (filePath) => import(pathToFileURL(filePath).href);

/**
 * Builds one search-index entry from a resolved (absolute-path) navigation node.
 *
 * @param {Object} node - Entry produced by `flattenNavigation`.
 * @returns {{title: string, path: string, type: string, description: string, keywords: string[], breadcrumb: string[]}}
 *   The index entry. `keywords` porte les synonymes déclarés sur le nœud —
 *   « GDP » sur la page « PIB » —, déjà résolus dans la langue de l'index.
 *   `breadcrumb` porte les LIBELLÉS des pages parentes, racine d'abord : c'est
 *   lui qui permet à « pib france » de trouver la page, et à trois pages « PIB »
 *   homonymes de s'afficher de façon distinguable.
 *
 *   La PROFONDEUR n'est pas stockée : elle est le nombre d'ancêtres, et le
 *   consommateur la lit sur `breadcrumb.length` (cf. `depthOf` dans SearchBar).
 */
function toIndexEntry(node) {
  return {
    title: node.name,
    path: node.path,
    type: node.type,
    description: node.description ?? '',
    keywords: node.keywords ?? [],
    breadcrumb: node.ancestors,
  };
}

async function main() {
  const siteConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  const { locales, defaultLocale } = siteConfig.site;

  const { resolveNavigationTree } = await importEsm(
    path.join(PROJECT_ROOT, 'src/utils/navigation/resolveNavigationTree.js'),
  );
  const { resolveLocalizedTree } = await importEsm(
    path.join(PROJECT_ROOT, 'src/utils/i18n/resolveLocalized.js'),
  );
  const { flattenNavigation } = await importEsm(
    path.join(PROJECT_ROOT, 'src/utils/navigation/flattenNavigation.js'),
  );
  const { DEMO_BASE_PATH } = await importEsm(
    path.join(PROJECT_ROOT, 'src/utils/navigation/basePaths.js'),
  );

  // Même point de montage que le layout de langue et la route attrape-tout de la démo :
  // depuis P4.2 la racine du déploiement appartient au site de documentation, et
  // l'application vit sous /demo ; depuis P5.4 elle vit sous /demo/<langue>. Omettre
  // l'un ou l'autre préfixe produirait un index dont chaque suggestion mène à un 404.
  //
  // Les deux transformations sont appliquées dans le MÊME ORDRE qu'à l'exécution :
  // libellés traduits d'abord, chemins absolus ensuite.
  const indexes = locales.map((locale) => {
    const tree = resolveNavigationTree(
      resolveLocalizedTree(siteConfig.navigation.tree, locale, defaultLocale),
      `${DEMO_BASE_PATH}/${locale}`,
    );

    return {
      locale,
      entries: flattenNavigation(tree).filter((node) => node.searchable).map(toIndexEntry),
    };
  });

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
  //   • `keywords` EST comparé (poids 6, entre le titre et le fil d'Ariane) : y
  //     mettre le nom technique du champ suffit à le rendre cherchable, sans
  //     l'afficher. `breadcrumb`, en revanche, est rendu tel quel sous le titre —
  //     n'y mettez que des libellés lisibles, pas des identifiants.
  //
  // Sans NEXT_PUBLIC_API_URL il n'y a pas d'endpoint à interroger : ce bloc est
  // alors sauté, et l'index se réduit aux pages du manifeste.

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const { locale, entries } of indexes) {
    fs.writeFileSync(
      path.join(OUTPUT_DIR, outputName(locale)),
      `${JSON.stringify(entries, null, 2)}\n`,
      'utf8',
    );
  }

  console.log(
    `build:search : ${indexes.length} index écrit(s) — `
      + indexes.map(({ locale, entries }) => `${locale} (${entries.length})`).join(', '),
  );
}

main().catch((err) => {
  console.error('build:search : échec —', err.message);
  process.exit(1);
});
