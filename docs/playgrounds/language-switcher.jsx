'use client';

// Importation des modules
import { LanguageSwitcher, DEFAULT_LANGUAGES } from '@/features/i18n/components/LanguageSwitcher';

// =================================================================
// PLAYGROUND — LanguageSwitcher
// =================================================================
// Cas le plus simple, comme tabs.jsx : les contrôles pilotent des props DIRECTEMENT,
// pas de `toProps`.
//
// `languageCount` est une molette de DÉMONSTRATION, pas une prop de <LanguageSwitcher> :
// elle tronque `DEFAULT_LANGUAGES` pour vérifier d'un coup d'œil le défilement du menu
// (`max-height: 280px`) et le cas d'une langue unique. Elle est donc listée dans
// `scaffold.omit` — elle agit sur l'aperçu, jamais sur le code généré.

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
    languageCount: { type: 'number', label: 'Nombre de langues', default: 8, min: 1, max: 8, row: 1 },
};

export const scaffold = {
    component: 'LanguageSwitcher',
    imports: [
        "import { LanguageSwitcher } from '@/features/i18n/components/LanguageSwitcher';",
    ],
    omit: ['languageCount'],
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
 * @param {Object} props - Props derived from the controls.
 * @param {number} props.languageCount - Demo-only knob truncating the default language list.
 * @returns {JSX.Element} The rendered language switcher.
 */
const LanguageSwitcherPlayground = ({ languageCount, ...switcherProps }) => (
    <LanguageSwitcher languages={DEFAULT_LANGUAGES.slice(0, languageCount)} {...switcherProps} />
);

export default LanguageSwitcherPlayground;
