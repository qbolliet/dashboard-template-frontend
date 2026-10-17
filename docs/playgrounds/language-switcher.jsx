'use client';

// Importation des modules
import { LanguageSwitcher, DEFAULT_LANGUAGES } from '@/features/i18n/components/LanguageSwitcher';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — LanguageSwitcher
// =================================================================
// « Nombre de langues » n'est pas une prop de <LanguageSwitcher>, mais ce qu'il pilote
// l'est : la prop `languages`. Le contrôle passe donc par `toProps`, qui le traduit en
// liste — c'est ELLE qui part au rendu ET au sérialiseur, si bien que le code généré
// reproduit toujours l'aperçu (`languages={[…]}` dès que le compte s'écarte du défaut,
// rien tant que la liste est celle du composant : règle « défaut omis »).
//
// Le composant accepte n'importe quelle liste : la borne n'est plus celle des huit
// langues par défaut. Au-delà, on puise dans EXTRA_LANGUAGES, et le menu défile
// (`max-height: 280px`), ce qui permet de vérifier ce comportement d'un coup d'œil.

/** Langues proposées au-delà des huit par défaut, pour tester un menu qui défile. */
const EXTRA_LANGUAGES = [
    { code: 'pl', country: 'PL', name: 'Polski' },
    { code: 'sv', country: 'SE', name: 'Svenska' },
    { code: 'tr', country: 'TR', name: 'Türkçe' },
    { code: 'ru', country: 'RU', name: 'Русский' },
];

const LANGUAGE_POOL = [...DEFAULT_LANGUAGES, ...EXTRA_LANGUAGES];

export const controls = {
    size: { type: 'radio', options: ['sm', 'md', 'lg'], label: 'Taille', default: 'md', row: 0 },
    menuAlign: {
        type: 'radio',
        options: ['left', 'right'],
        labels: { left: 'Gauche', right: 'Droite' },
        label: 'Alignement du menu',
        default: 'left',
        row: 0,
    },
    compact: { type: 'boolean', label: 'Compact (drapeau seul)', default: false, row: 1 },
    languageCount: {
        type: 'number',
        label: 'Nombre de langues',
        default: DEFAULT_LANGUAGES.length,
        min: 1,
        max: LANGUAGE_POOL.length,
        row: 1,
    },
};

/**
 * Writes a language list as multi-line JSX source, one language per line.
 *
 * @param {Array<{code: string, country: string, name: string}>} languages - The list.
 * @returns {string} The array literal, indented for a prop on its own line.
 */
const languagesSource = (languages) => {
    const lines = languages.map(({ code, country, name }) => `    { code: '${code}', country: '${country}', name: '${name}' },`);
    return ['[', ...lines, '  ]'].join('\n');
};

/**
 * Translates the controls into the component's props.
 *
 * @param {Object} values - Current control values.
 * @param {number} values.languageCount - Number of languages to offer.
 * @returns {Object} Props of `<LanguageSwitcher>`, `languages` tagged by `expr()`.
 */
export const toProps = ({ languageCount, ...rest }) => {
    const languages = LANGUAGE_POOL.slice(0, languageCount);
    return { ...rest, languages: expr(languagesSource(languages), languages) };
};

export const scaffold = {
    component: 'LanguageSwitcher',
    imports: [
        "import { LanguageSwitcher } from '@/features/i18n/components/LanguageSwitcher';",
    ],
};

// Le cadre doit CONTENIR le menu ouvert, sinon il défile à son tour (double barre de
// défilement). Hauteur minimale = marges + bouton + décalage + hauteur maximale du menu,
// et le composant se pose en haut du cadre plutôt qu'au centre.
export const frame = {
    '--docs-demo-justify': 'flex-start',
    '--docs-demo-min-height':
        'calc(2 * var(--docs-demo-padding) + var(--lang-switch-flag-size-lg) + var(--spacing-md) + var(--lang-switch-menu-offset) + var(--lang-switch-menu-max-height) + var(--spacing-xs))',
};

export const hint = (
    <>
        Le menu se navigue au clavier : <code>↓</code> <code>↑</code> parcourent les langues,{' '}
        <code>Début</code> et <code>Fin</code> sautent aux extrémités, <code>Échap</code> referme le
        menu en rendant le focus au bouton.
    </>
);

/**
 * Live preview of the language-switcher playground.
 *
 * @param {Object} props - Props derived from the controls by `toProps`.
 * @returns {JSX.Element} The rendered language switcher.
 */
const LanguageSwitcherPlayground = (props) => <LanguageSwitcher {...props} />;

export default LanguageSwitcherPlayground;
