// =================================================================
// TOKEN SCOPE — traduire un état de contrôles en règles CSS réelles
// =================================================================
// Utilitaire de <TokenPlayground>. Il produit LA MÊME chaîne que celle affichée dans le
// bloc de code de la démonstration : le CSS montré est littéralement celui qui s'applique
// à l'aperçu. C'est ce qui rend la démonstration honnête — un extrait qui « illustre »
// un effet sans le produire est une promesse invérifiable.
//
// Un seul consommateur, donc la fonction reste dans la feature (règle de promotion de
// CLAUDE.md : on ne monte dans src/utils/ qu'au second consommateur non lié).

/**
 * Converts a `#rrggbb` colour to the repository's raw HSL triple.
 *
 * The whole codebase stores colours as `H S% L%` WITHOUT the `hsl()` function and reads
 * them back as `hsl(var(--token))` — that is what makes `hsl(var(--token) / 0.5)`
 * possible without duplicating the token. A colour picker hands back hexadecimal, so it
 * has to be translated before it can be written into a custom property, otherwise the
 * declaration is syntactically valid and silently paints nothing.
 *
 * @param {string} hex - Colour as `#rgb` or `#rrggbb`.
 * @returns {string} The `H S% L%` triple, e.g. `'271 76% 53%'`.
 */
export const hexToHslTriplet = (hex) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;

    const r = parseInt(full.slice(0, 2), 16) / 255;
    const g = parseInt(full.slice(2, 4), 16) / 255;
    const b = parseInt(full.slice(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    const lightness = (max + min) / 2;

    let hue = 0;
    if (delta !== 0) {
        if (max === r) hue = ((g - b) / delta) % 6;
        else if (max === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue *= 60;
        if (hue < 0) hue += 360;
    }

    // Saturation nulle sur un gris : la formule diviserait par zéro.
    const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

    const round = (value) => Math.round(value * 10) / 10;
    return `${round(hue)} ${round(saturation * 100)}% ${round(lightness * 100)}%`;
};

/**
 * Converts a raw HSL triple back to `#rrggbb`, for the colour input's initial value.
 *
 * @param {string} triplet - A `H S% L%` triple.
 * @returns {string} The equivalent `#rrggbb` string.
 */
export const hslTripletToHex = (triplet) => {
    const parts = /^(-?[\d.]+)\s+([\d.]+)%\s+([\d.]+)%/.exec(triplet.trim());
    if (!parts) return '#000000';

    const hue = Number(parts[1]);
    const saturation = Number(parts[2]) / 100;
    const lightness = Number(parts[3]) / 100;

    const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
    const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
    const offset = lightness - chroma / 2;

    const sector = Math.floor(((hue % 360) + 360) % 360 / 60);
    const [r, g, b] = [
        [chroma, second, 0], [second, chroma, 0], [0, chroma, second],
        [0, second, chroma], [second, 0, chroma], [chroma, 0, second],
    ][sector];

    const channel = (value) => Math.round((value + offset) * 255).toString(16).padStart(2, '0');
    return `#${channel(r)}${channel(g)}${channel(b)}`;
};

/**
 * Formats the value a control currently holds into a CSS declaration value.
 *
 * Une couleur arrive DÉJÀ sous forme de triplet : <TokenPlayground> convertit à la
 * frontière du `<input type="color">` et garde la convention du dépôt dans son état.
 * Reconvertir ici ferait un aller-retour de plus, et donc une perte de précision de plus.
 *
 * @param {Object} token - Token descriptor from the MDX schema.
 * @param {*} value - Current control value.
 * @returns {string} The value as it must be written in the stylesheet.
 */
export const formatTokenValue = (token, value) => (
    token.unit ? `${value}${token.unit}` : String(value)
);

// Un jeu de caractères volontairement étroit : ces valeurs partent dans une balise
// <style>, et rien de ce que produisent les contrôles (nombres, hexadécimal, mots-clés)
// n'a besoin de plus. Une accolade ou un chevron y est donc forcément une anomalie.
const SAFE_VALUE = /^[\w#%.,()\s/-]*$/;

/**
 * Builds the stylesheet applied to the overridden preview.
 *
 * Two rules rather than one, and that is the whole point of the exercise: a declaration
 * posted on the scope beats the dark redefinition of the same token inherited from
 * above, so a single rule would freeze the override across the light/dark toggle —
 * exactly the opposite of what level A claims. The second rule gives the dark theme its
 * own value back.
 *
 * `attachDark` is what separates the sheet we INJECT from the one we DISPLAY. In a real
 * project the scope is a plain descendant of `<html data-theme="dark">`, so the dark rule
 * is written as a descendant selector — that is what the reader copies. In the preview,
 * the scope element carries `data-theme` ITSELF (it has to, see PreviewThemeContext), so
 * the descendant form would not match it; the attached form is emitted alongside.
 *
 * @param {string} selector - Selector of the scope, e.g. `'.ma-page'`.
 * @param {Array<Object>} tokens - Token descriptors from the MDX schema.
 * @param {Object} values - Current light value of each token, keyed by token name.
 * @param {Object} darkValues - Current dark value of each darkable token.
 * @param {{attachDark: boolean}} [options] - Whether to also target the scope itself.
 * @returns {string} The stylesheet, ready to inject or to display.
 */
export const buildScopeCss = (selector, tokens, values, darkValues, { attachDark = false } = {}) => {
    const declare = (token, raw) => {
        const value = formatTokenValue(token, raw);
        return SAFE_VALUE.test(value) ? `  ${token.name}: ${value};` : null;
    };

    const light = tokens
        .map((token) => declare(token, values[token.name]))
        .filter(Boolean);

    const dark = tokens
        .filter((token) => token.dark !== undefined)
        .map((token) => declare(token, darkValues[token.name]))
        .filter(Boolean);

    const blocks = [`${selector} {\n${light.join('\n')}\n}`];

    if (dark.length > 0) {
        const descendant = `[data-theme="dark"] ${selector}`;
        const darkSelector = attachDark ? `${descendant}, [data-theme="dark"]${selector}` : descendant;
        blocks.push(`${darkSelector} {\n${dark.join('\n')}\n}`);
    }

    return blocks.join('\n\n');
};
