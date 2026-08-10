import { flagCdnSrc } from '../languages';
import './FlagChip.scss';

/**
 * Renders the round flag badge of a language, with a text fallback that
 * reappears on its own when the flag image fails to load.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.country] - ISO 3166-1 alpha-2 country code. Also
 *   used as the always-rendered textual fallback.
 * @param {function(string): ?string} [props.flagSrc] - Resolves the flag
 *   image URL from a country code; defaults to flagcdn.com.
 * @param {string} [props.className] - Additional class name appended to the
 *   root element (e.g. to shrink the badge inside a `<LanguageOption>`).
 * @returns {JSX.Element} The rendered flag badge.
 */
const FlagChip = ({ country, flagSrc = flagCdnSrc, className = '' }) => {
    // Résolue une fois : si `flagSrc` renvoie `null` (pas de pays connu), seul
    // le repli textuel est rendu, sans balise <img> ni requête réseau inutile.
    const src = flagSrc(country);

    return (
        // aria-hidden : le nom de la langue est déjà porté par le texte de
        // l'option et par l'aria-label du bouton — annoncer le drapeau serait
        // redondant, et de toute façon un drapeau n'est pas une langue.
        <span className={`lang-switch-flag ${className}`.trim()} aria-hidden="true">
            {/* Repli toujours rendu, empilé SOUS l'image via `grid-area: 1 / 1`
                (voir FlagChip.scss) : si l'image échoue, elle n'est pas peinte
                (alt="" = décorative) et le texte redevient visible tout seul,
                sans état ni re-rendu React. */}
            <span className="lang-switch-flag-fallback">{country}</span>
            {src && <img src={src} alt="" loading="lazy" decoding="async" />}
        </span>
    );
};

export default FlagChip;
