import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// =================================================================
// GARDE-FOU — aucun aria-label littéral hors du site de documentation
// =================================================================
// Un nom accessible écrit en dur dans le JSX échappe au dictionnaire : il reste dans une
// seule langue pour les lecteurs d'écran, et aucune capture visuelle ne le révèle. Les
// libellés passent par les props `labels` (DEFAULT_LABELS + mergeLabels), remplies par
// src/i18n/. Ce test échoue dès qu'un attribut accessible reçoit une chaîne littérale.
//
// Seules les chaînes LITTÉRALES sont visées : `aria-label={labels.x}` est le bon patron.

const SRC = path.resolve(__dirname, '..');

// Liste blanche explicite (chemins relatifs à src/, séparateur '/'). Le site de
// documentation est rédigé en français uniquement et hors du périmètre de l'i18n.
const ALLOWED_PREFIXES = ['features/docs/'];
// Fichiers individuels tolérés, avec le motif. Vide : ajouter ici est une décision.
const ALLOWED_FILES = [];

// aria-label="…", aria-label='…', ariaLabel="…" — la valeur doit être une chaîne non
// vide ; une expression JSX `{…}` ne correspond pas.
const LITERAL_LABEL = /\b(?:aria-label|aria-description|ariaLabel)=(?:"[^"{}]+"|'[^'{}]+')/g;

const SOURCE_FILE = /\.(jsx|tsx|js|ts)$/;
const TEST_FILE = /\.test\.(jsx|tsx|js|ts)$/;

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const isAllowed = (relative) =>
  ALLOWED_FILES.includes(relative) || ALLOWED_PREFIXES.some((prefix) => relative.startsWith(prefix));

describe('aria-label littéraux', () => {
  it('le motif reconnaît les formes à proscrire et ignore les expressions', () => {
    expect('<nav aria-label="Menu">'.match(LITERAL_LABEL)).toHaveLength(1);
    expect("<nav aria-label='Menu'>".match(LITERAL_LABEL)).toHaveLength(1);
    expect('<Nav ariaLabel="Menu" />'.match(LITERAL_LABEL)).toHaveLength(1);
    expect('<nav aria-label={labels.nav}>'.match(LITERAL_LABEL)).toBeNull();
    expect('<nav aria-label={`Menu ${x}`}>'.match(LITERAL_LABEL)).toBeNull();
  });

  it("n'apparaît dans aucun fichier de src/ hors liste blanche", () => {
    const offenders = walk(SRC)
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'))
      .filter((relative) => SOURCE_FILE.test(relative) && !TEST_FILE.test(relative))
      .filter((relative) => !isAllowed(relative))
      .flatMap((relative) => {
        const found = fs.readFileSync(path.join(SRC, relative), 'utf8').match(LITERAL_LABEL) ?? [];
        return found.map((match) => `${relative}: ${match}`);
      });

    expect(offenders).toEqual([]);
  });
});
