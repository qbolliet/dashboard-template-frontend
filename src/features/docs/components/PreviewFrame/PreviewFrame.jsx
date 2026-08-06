'use client';

// Importation des modules
import { useState } from 'react';
import { useTheme } from '@/features/theme/hooks/useTheme';
import SunMoonIcon from '@/components/icons/SunMoonIcon/SunMoonIcon';
import './PreviewFrame.scss';

// =================================================================
// PREVIEW FRAME — cadre d'aperçu, avec bascule clair/sombre LOCALE
// =================================================================
// Le cadre pose `data-theme` sur LUI-MÊME, et non sur <html>. C'est la démonstration la
// plus parlante du §4.4 niveau C de TEMPLATIZATION_ARCHITECTURE.md : les tokens étant des
// propriétés personnalisées CSS, une surcharge est scopable à un sous-arbre, et deux
// apparences du même composant peuvent coexister sur une même page — sans variante de
// code, sans prop supplémentaire, sans rebuild.
//
// ⚠️ CE QUI REND CETTE BASCULE POSSIBLE — À NE PAS DÉFAIRE
// Une propriété personnalisée est substituée à l'élément où elle est DÉCLARÉE, puis
// héritée figée. Tant que les tokens n'étaient déclarés que sur `:root`, une indirection
// comme `--tab-pill-bg: var(--color-surface)` se résolvait sur <html> et un descendant
// portant `data-theme` ne pouvait PLUS la changer : seules les règles lisant une
// primitive en direct basculaient, et l'aperçu ressortait à moitié thémé. C'est
// exactement le piège documenté dans ThemeProvider.js (le bug de palette du globe).
// Les blocs de base sont donc déclarés `:root, [data-theme] { … }` dans les 40
// _colors.scss et les deux fichiers globaux. Revenir à `:root` seul casse ce cadre en
// silence — rien ne lèvera d'erreur, l'aperçu sera juste faux.
//
// PAS DE SYNCHRONISATION PAR EFFET : `override` reste null tant que l'utilisateur n'a
// rien décidé, et le cadre suit alors le thème du site. Un `useState(siteTheme)` +
// `useEffect` de recopie serait à la fois un état dupliqué et un motif refusé par la
// règle react-hooks du dépôt.

/**
 * Framed preview surface exposing a local light/dark toggle.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} props.children - What to display inside the frame.
 * @param {string} [props.label] - Accessible name of the frame.
 * @param {boolean} [props.padded] - Whether to inset the content (defaults to true).
 * @returns {JSX.Element} The rendered frame.
 */
const PreviewFrame = ({ children, label = 'Aperçu du composant', padded = true }) => {
    const { theme: siteTheme } = useTheme();
    const [override, setOverride] = useState(null);

    const theme = override ?? siteTheme;
    const next = theme === 'dark' ? 'light' : 'dark';

    return (
        <figure
            className={`doc-preview-frame${padded ? '' : ' doc-preview-frame--flush'}`}
            // LA ligne qui porte la démonstration : le thème est un attribut de CE
            // conteneur, pas du document.
            data-theme={theme}
            aria-label={label}>
            <button
                type="button"
                className="doc-preview-frame__theme"
                onClick={() => setOverride(next)}
                aria-pressed={theme === 'dark'}
                title={`Afficher cet aperçu en thème ${next}`}
                aria-label={`Thème de l'aperçu : ${theme}. Basculer en ${next}.`}>
                <SunMoonIcon width={18} height={18} />
            </button>

            {children}
        </figure>
    );
};

export default PreviewFrame;
