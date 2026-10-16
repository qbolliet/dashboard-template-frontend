import { test, expect } from '@playwright/test';
import { setSiteTheme } from './helpers/theme';
import { DEFAULT_LOCALE } from '../src/i18n/config';

// =================================================================
// CONTRASTE WCAG AA — chaque nœud texte visible, dans les DEUX thèmes
// =================================================================
// Filet contre les régressions de C2 (fond de page / couleur de texte absents en
// sombre, titres d'axe noirs sur carte sombre), C10 (`--color-text-tertiary` sombre
// sous 4,5:1) et C11 (quatre couleurs claires sous AA) de RECETTE_G0.md.
//
// MÉTHODE. Pour chaque nœud texte visible : la couleur d'avant-plan CALCULÉE (`color`
// en HTML, `fill` en SVG, alpha et opacités d'ancêtres compris) est composée sur le
// premier fond opaque trouvé en remontant les ancêtres, puis le ratio WCAG 2.x est
// comparé à 4,5:1 (3:1 pour le gros texte : ≥ 24 px, ou ≥ 18,66 px en graisse ≥ 700).
// Les `::placeholder` des champs sont contrôlés à part : ce ne sont pas des nœuds texte
// et ils consomment `--color-text-tertiary`.
//
// LIMITES ASSUMÉES. Seuls les ancêtres DOM servent de fond : un texte posé sur un
// élément frère (calque absolu) n'a pas d'ancêtre qui le renseigne — c'est le cas des
// textes superposés à un <canvas>/<img>/<video>, voir la liste blanche. Le portail
// d'overlay de développement de Next (shadow DOM) n'est pas parcouru par le
// TreeWalker : il n'appartient pas au produit.

const SKIP_REASONS = {
  skipLink: 'lien d\'évitement hors écran (visible au seul focus clavier)',
  hidden: 'texte visuellement masqué (≤ 1 px / clip) : lu par les lecteurs d\'écran uniquement',
  disabled: 'texte désactivé : exempté par WCAG 1.4.3 (composant inactif)',
  media: 'fond indéterminable : texte superposé à un <canvas>/<img>/<video> ou à un background-image',
} as const;

type Failure = { selector: string; text: string; ratio: number; required: number; fg: string; bg: string };
type Report = { checked: number; skipped: Record<string, number>; failures: Failure[] };

const PAGES = [
  { label: 'démo — PIB (graphique)', path: `/demo/${DEFAULT_LOCALE}/comptabilite-nationale/france/pib`, ready: 'svg text' },
  { label: 'doc — StatCard (pastilles, props, code)', path: '/composants/stat-card', ready: 'main' },
  { label: 'doc — Chart (playground, code)', path: '/features/chart', ready: 'main' },
  { label: 'doc — Thème sombre', path: '/fondations/theme-sombre', ready: 'main' },
];

for (const { label, path, ready } of PAGES) {
  for (const theme of ['light', 'dark'] as const) {
    test(`${label} — ${theme}`, async ({ page }) => {
      await setSiteTheme(page, theme);
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.locator(ready).first().waitFor();
      await page.evaluate(() => document.fonts.ready);

      const report: Report = await page.evaluate((reasons) => {
        // --- Couleurs -------------------------------------------------------
        type RGBA = [number, number, number, number];
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;

        // Normalise toute couleur calculée en RGBA 0-255 / alpha 0-1. Chrome sérialise
        // hsl() en rgb()/rgba() ; `color(srgb …)` et le reste passent par le canvas.
        const parse = (css: string): RGBA => {
          const m = css.match(/^rgba?\(([^)]+)\)$/);
          if (m) {
            const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
            return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1];
          }
          const s = css.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\)$/);
          if (s) return [+s[1] * 255, +s[2] * 255, +s[3] * 255, s[4] === undefined ? 1 : +s[4]];
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = css;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3] / 255];
        };
        // Compose `top` sur `base` (base supposé opaque).
        const over = (top: RGBA, base: RGBA): RGBA => [
          top[0] * top[3] + base[0] * (1 - top[3]),
          top[1] * top[3] + base[1] * (1 - top[3]),
          top[2] * top[3] + base[2] * (1 - top[3]),
          1,
        ];
        const luminance = (c: RGBA) => {
          const [r, g, b] = c.slice(0, 3).map((v) => {
            const x = v / 255;
            return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
          });
          return 0.2126 * r + 0.7152 * g + 0.0722 * b;
        };
        const ratio = (a: RGBA, b: RGBA) => {
          const la = luminance(a);
          const lb = luminance(b);
          return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
        };
        const fmt = (c: RGBA) => `rgb(${c.slice(0, 3).map(Math.round).join(',')})`;

        // --- Fond effectif --------------------------------------------------
        // Couches de fond semi-transparentes empilées de l'ancêtre le plus proche au
        // plus lointain, jusqu'au premier fond opaque ; blanc par défaut du canvas.
        // Renvoie null si un background-image rend le fond indéterminable.
        const backgroundOf = (el: Element): RGBA | null => {
          const layers: RGBA[] = [];
          for (let node: Element | null = el; node; node = node.parentElement) {
            const cs = getComputedStyle(node);
            if (cs.backgroundImage !== 'none') return null;
            const bg = parse(cs.backgroundColor);
            if (bg[3] > 0) layers.push(bg);
            if (bg[3] === 1) break;
          }
          let acc: RGBA = [255, 255, 255, 1];
          for (let i = layers.length - 1; i >= 0; i--) acc = over(layers[i], acc);
          return acc;
        };

        // Un <canvas>/<img>/<video> situé SOUS le centre du texte (hors ses propres
        // ancêtres) : le fond réel est une image, aucun ancêtre ne le décrit.
        const overMedia = (el: Element, rect: DOMRect) => {
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false;
          return document
            .elementsFromPoint(x, y)
            .some((e) => /^(CANVAS|IMG|VIDEO)$/i.test(e.tagName) && !e.contains(el));
        };

        // --- Parcours -------------------------------------------------------
        const selectorOf = (el: Element) => {
          const parts: string[] = [];
          for (let n: Element | null = el; n && parts.length < 3 && n !== document.body; n = n.parentElement) {
            const cls = typeof n.className === 'string' ? n.className.trim().split(/\s+/)[0] : '';
            parts.unshift(n.tagName.toLowerCase() + (cls ? `.${cls}` : ''));
          }
          return parts.join(' > ');
        };
        const opacityOf = (el: Element) => {
          let o = 1;
          for (let n: Element | null = el; n; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
          return o;
        };

        const report: Report = { checked: 0, skipped: {}, failures: [] };
        const seen = new Set<string>();
        const skip = (reason: string) => { report.skipped[reason] = (report.skipped[reason] ?? 0) + 1; };

        // Technique « visually hidden » : un ancêtre de 1 px × 1 px qui rogne son contenu.
        // Le Range du texte, lui, garde sa taille naturelle — d'où le test sur les ancêtres.
        const clipped = (el: Element) => {
          for (let n: Element | null = el; n; n = n.parentElement) {
            const box = n.getBoundingClientRect();
            if (box.width <= 1 && box.height <= 1 && getComputedStyle(n).overflow !== 'visible') return true;
          }
          return false;
        };

        const evaluate = (el: Element, rect: DOMRect, fgCss: string, fgAlpha: number, text: string) => {
          if (el.closest('.skip-link')) return skip(reasons.skipLink);
          if (rect.width <= 1 || rect.height <= 1 || clipped(el)) return skip(reasons.hidden);
          if (el.closest(':disabled, [aria-disabled="true"]')) return skip(reasons.disabled);
          if (overMedia(el, rect)) return skip(reasons.media);
          const bg = backgroundOf(el);
          if (!bg) return skip(reasons.media);

          const fg0 = parse(fgCss);
          const fg = over([fg0[0], fg0[1], fg0[2], fg0[3] * fgAlpha], bg);
          const cs = getComputedStyle(el);
          const px = parseFloat(cs.fontSize);
          const large = px >= 24 || (px >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
          const required = large ? 3 : 4.5;
          const r = ratio(fg, bg);
          report.checked += 1;
          if (r >= required) return;

          const key = `${selectorOf(el)}|${fmt(fg)}|${fmt(bg)}`;
          if (seen.has(key)) return;
          seen.add(key);
          report.failures.push({
            selector: selectorOf(el), text: text.trim().slice(0, 40),
            ratio: Math.round(r * 100) / 100, required, fg: fmt(fg), bg: fmt(bg),
          });
        };

        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const text = node.textContent ?? '';
          const el = node.parentElement;
          if (!text.trim() || !el) continue;
          if (el.closest('script, style, noscript, template')) continue;
          if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;

          const range = document.createRange();
          range.selectNodeContents(node);
          const rect = range.getBoundingClientRect();
          if (rect.width === 0 && rect.height === 0) continue;

          const cs = getComputedStyle(el);
          const inSvg = el.closest('svg') !== null;
          const fgCss = inSvg ? cs.fill : cs.color;
          const own = inSvg ? parseFloat(cs.fillOpacity) : 1;
          evaluate(el, rect, fgCss, opacityOf(el) * own, text);
        }

        // Placeholders : pseudo-élément, absent du TreeWalker.
        for (const field of document.querySelectorAll('input[placeholder], textarea[placeholder]')) {
          if (!field.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
          const rect = field.getBoundingClientRect();
          evaluate(field, rect, getComputedStyle(field, '::placeholder').color, opacityOf(field),
            `placeholder: ${field.getAttribute('placeholder')}`);
        }
        return report;
      }, SKIP_REASONS);

      // Garde-fou : un parcours qui ne voit aucun texte passerait pour un succès.
      expect(report.checked, 'nœuds texte contrôlés').toBeGreaterThan(20);

      const lines = report.failures.map(
        (f) => `${f.ratio}:1 < ${f.required}:1  ${f.selector}  « ${f.text} »  fg ${f.fg} sur ${f.bg}`,
      );
      expect(lines, `contrastes insuffisants (${theme}) sur ${path}`).toEqual([]);
    });
  }
}
