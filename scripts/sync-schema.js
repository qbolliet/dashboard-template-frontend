#!/usr/bin/env node

// =================================================================
// SYNCHRONISATION — SDL GRAPHQL DE L'API
// =================================================================
// Écrit `scripts/schema.graphql` à partir du SDL OFFICIEL de dashboard-template-api,
// jamais à la main : `check:gql` et le serveur mock (`mock:api`) lisent cette copie,
// qui ne doit donc pas dériver du contrat réel.
//
// Deux sources, par ordre de priorité :
//   1. API_SCHEMA_PATH — chemin d'un `schema.graphql` local (ex. un clone voisin :
//      ../dashboard-template-api/schema.graphql), pour développer contre une
//      version non publiée. L'en-tête le signale (« source locale »).
//   2. API_SCHEMA_REF  — tag d'une release de l'API (ex. v0.3.0), dont on télécharge
//      l'asset `schema.graphql`. Version ÉPINGLÉE : à défaut de variable, on lit
//      PINNED_REF ci-dessous, committée — monter de version est donc un diff relu,
//      jamais un « latest » implicite.
//
// Le téléchargement passe par `gh` (dépôt privé ou public, authentification déjà
// en place), avec repli sur une requête HTTP directe (dépôt public).

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { buildSchema } = require('graphql');

const OUTPUT_PATH = path.join(__dirname, 'schema.graphql');
const REPO = process.env.API_SCHEMA_REPO || 'qbolliet/dashboard-template-api';
const ASSET_NAME = 'schema.graphql';

// Contrat de l'API contre lequel le template est développé et vérifié (`check:gql`).
const PINNED_REF = 'v0.5.0';

/**
 * Downloads the `schema.graphql` asset of a release of the API repository.
 *
 * @param {string} ref - Release tag (e.g. `v0.3.0`).
 * @returns {Promise<string>} The SDL text.
 */
async function downloadReleaseSchema(ref) {
  try {
    return execFileSync(
      'gh',
      ['release', 'download', ref, '--repo', REPO, '--pattern', ASSET_NAME, '--output', '-'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024 },
    );
  } catch (ghError) {
    // `gh` absent ou non authentifié : dépôt public, l'URL de l'asset suffit.
    const url = `https://github.com/${REPO}/releases/download/${ref}/${ASSET_NAME}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `asset introuvable (${url} → HTTP ${response.status}) ; "gh release download" a aussi échoué : ${String(ghError.message).split('\n')[0]}`,
      );
    }
    return response.text();
  }
}

async function main() {
  const localPath = process.env.API_SCHEMA_PATH;
  const ref = process.env.API_SCHEMA_REF || (localPath ? undefined : PINNED_REF);

  let sdl;
  let origin;
  if (localPath) {
    const resolved = path.resolve(process.cwd(), localPath);
    sdl = fs.readFileSync(resolved, 'utf8');
    origin = `source locale ${localPath}`;
  } else {
    sdl = await downloadReleaseSchema(ref);
    origin = `release ${ref} de ${REPO}`;
  }

  // Un SDL tronqué ou une page d'erreur HTML ne doit jamais remplacer la copie saine.
  buildSchema(sdl);

  const header = [
    '# ─────────────────────────────────────────────────────────────────────────────',
    '# GÉNÉRÉ — NE PAS ÉDITER. Régénérer avec `npm run sync:schema`.',
    `# Version de l'API : ${ref || 'non épinglée (source locale)'}`,
    `# Origine          : ${origin}`,
    '# ─────────────────────────────────────────────────────────────────────────────',
    '',
  ].join('\n');

  fs.writeFileSync(OUTPUT_PATH, `${header}${sdl}`, 'utf8');
  console.log(`sync-schema: scripts/schema.graphql écrit (${origin}).`);
}

main().catch((error) => {
  console.error(`sync-schema: ${error.message}`);
  process.exit(1);
});
