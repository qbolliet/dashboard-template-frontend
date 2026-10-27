import { CheckIcon } from '@/components/icons';
import FlagChip from '../FlagChip/FlagChip';
import './LanguageOption.scss';

/**
 * Renders a single language row inside the `<LanguageMenu>` listbox: flag,
 * native name and a selection checkmark. Purely presentational — selection
 * and keyboard-cursor state are owned by the parent `<LanguageSwitcher>`.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.id] - Id of the option, a possible target of the
 *   menu's `aria-activedescendant`.
 * @param {{code: string, country: string, name: string}} props.language - The
 *   described language.
 * @param {boolean} [props.selected=false] - Whether this is the site's active
 *   language (checkmark, bold text, `aria-selected`).
 * @param {boolean} [props.active=false] - Whether this is the row currently
 *   under the keyboard/mouse cursor (highlight only).
 * @param {function(string): (string|string[]|null)} [props.flagSrc] - Resolves the
 *   flag image URL, or an ordered list of candidate URLs, from a country code; forwarded to `<FlagChip>`.
 * @param {function} [props.onSelect] - Called on click.
 * @param {function} [props.onHover] - Called on mouse enter, to sync the
 *   keyboard cursor onto the hovered row.
 * @returns {JSX.Element} The rendered option.
 */
const LanguageOption = ({
    id,
    language,
    selected = false,
    active = false,
    flagSrc,
    onSelect,
    onHover
}) => {
    return (
        <li
            id={id}
            role="option"
            // Fait prononcer « Español » avec la phonétique espagnole plutôt
            // qu'avec celle de la page — chaque option porte le code de SA
            // propre langue, jamais celui de l'interface.
            lang={language.code}
            aria-selected={selected}
            className={`lang-switch-option${active ? ' lang-switch-option--active' : ''}`}
            // Synchronise le curseur clavier sur la souris : un `Entrée` après
            // un survol sélectionne bien la ligne survolée, et non celle
            // atteinte par la dernière flèche pressée.
            onMouseEnter={onHover}
            onClick={onSelect}>
            <FlagChip country={language.country} className="lang-switch-option-flag" flagSrc={flagSrc} />
            <span className="lang-switch-option-name">{language.name}</span>
            {/* `selected` ≠ `active` : `selected` est la langue DU SITE (coche +
                gras), `active` la position du curseur clavier/souris (simple
                surbrillance). Les fusionner ferait disparaître la coche dès
                qu'on survole une autre ligne. */}
            {selected && <CheckIcon className="lang-switch-check" strokeWidth={2.5} />}
        </li>
    );
};

export default LanguageOption;
