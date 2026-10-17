// =================================================================
// D3 LOCALE — formateurs d3 accordés à la langue du site
// =================================================================
// d3-format et d3-time-format ont leur PROPRE notion de locale, indépendante d'Intl. Par
// défaut, elle vaut en-US : `format(',')` produit `1,234.5` et `utcFormat('%b')` produit
// `Jan`. C'est ce qui donnait, avant ce lot, des axes de graphique en anglais sous une
// interface française, à côté d'un tableau formaté en `fr-FR` par Intl.
//
// DEUX MANIÈRES d'y remédier, et le choix ici n'est pas indifférent :
//
//   • `formatDefaultLocale(def)` / `timeFormatDefaultLocale(def)` — mutent un état
//     GLOBAL de module. Simple, mais faux dès qu'un même processus rend deux langues :
//     c'est exactement le cas au build, où `generateStaticParams` produit /demo/fr et
//     /demo/en dans le même processus Node. La dernière langue installée gagnerait pour
//     tout le monde, de façon non déterministe.
//   • `formatLocale(def)` / `timeFormatLocale(def)` — RENVOIENT un objet de formateurs,
//     sans toucher à l'état global.
//
// C'est la seconde qui est retenue. Aucun `*DefaultLocale` ne doit apparaître dans le
// dépôt : c'est la règle à ne pas contourner le jour où un composant paraîtra plus
// simple à écrire avec le global.
//
// Les définitions de locale sont livrées PAR d3 lui-même (`d3-format/locale/fr-FR`,
// `d3-time-format/locale/fr-FR`) et exposées par le champ `exports` des deux paquets —
// aucune dépendance nouvelle, aucune table à maintenir à la main. Noter l'absence
// d'extension dans le spécificateur : la carte d'export est `"./locale/*": "./locale/*.json"`,
// écrire `.json` produirait `fr-FR.json.json` et un échec de résolution.

import { formatLocale } from 'd3-format';
import { timeFormatLocale } from 'd3-time-format';

import frFormat from 'd3-format/locale/fr-FR';
import enFormat from 'd3-format/locale/en-US';
import frTime from 'd3-time-format/locale/fr-FR';
import enTime from 'd3-time-format/locale/en-US';

import { formatsFor } from './formats';

// Table à imports littéraux : un `import()` construit dynamiquement depuis
// `formats.d3Locale` ne serait pas analysable par Turbopack, qui embarquerait alors les
// ~200 fichiers de locale des deux paquets.
// AJOUTER UNE LANGUE : deux lignes d'import et deux entrées ici.
const DEFINITIONS = {
    'fr-FR': { format: frFormat, time: frTime },
    'en-US': { format: enFormat, time: enTime },
};

// Les objets de locale d3 sont coûteux à construire et ne dépendent que de la langue :
// on les mémorise par code. Ce cache est un cache de VALEURS IMMUABLES, pas un état
// mutable partagé — il n'a pas le défaut des `*DefaultLocale`.
const cache = new Map();

/**
 * Builds the d3 formatters bound to a site locale.
 *
 * Use these instead of importing `format` / `utcFormat` from d3 directly: the bare
 * imports carry d3's en-US default and would silently disagree with everything `Intl`
 * renders on the same screen.
 *
 * @param {string} [locale] - Site locale code, e.g. 'fr'.
 * @returns {{format: Function, formatPrefix: Function, timeFormat: Function,
 *   utcFormat: Function, siPrefixBillion: string}} Formatter factories for that locale.
 *   `format` and `formatPrefix` take a d3-format specifier; `timeFormat` and `utcFormat`
 *   take a d3-time-format specifier.
 */
export const d3LocaleFor = (locale) => {
    const { d3Locale, siPrefixBillion } = formatsFor(locale);

    if (cache.has(d3Locale)) return cache.get(d3Locale);

    // Repli sur fr-FR plutôt que sur le défaut en-US de d3 : une langue déclarée dans
    // le manifeste mais sans définition d3 doit dégrader vers une langue COHÉRENTE avec
    // le reste du repli du site, pas réintroduire l'incohérence que ce module corrige.
    const definition = DEFINITIONS[d3Locale] ?? DEFINITIONS['fr-FR'];

    const numberLocale = formatLocale(definition.format);
    const timeLocale = timeFormatLocale(definition.time);

    const bound = {
        format: numberLocale.format,
        formatPrefix: numberLocale.formatPrefix,
        timeFormat: timeLocale.format,
        utcFormat: timeLocale.utcFormat,
        siPrefixBillion,
    };

    cache.set(d3Locale, bound);

    return bound;
};
