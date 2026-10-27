import { ChevronIcon } from '@/components/icons';
import FlagChip from '../FlagChip/FlagChip';
import './LanguageButton.scss';

/**
 * Renders the trigger button of the language switcher: flag, language code
 * badge and chevron. Purely presentational — open/close state, keyboard
 * handling and focus management are owned by the parent `<LanguageSwitcher>`.
 *
 * @param {Object} props - Component props.
 * @param {{code: string, country: string, name: string}} [props.language] - Active
 *   language. May be `undefined` if `languages` is empty upstream.
 * @param {boolean} [props.open=false] - Whether the menu is currently open;
 *   drives `aria-expanded` and the chevron rotation.
 * @param {boolean} [props.compact=false] - Renders the flag alone (round
 *   button), hiding the language code badge and the chevron.
 * @param {string} [props.listId] - Id of the menu this button controls, for
 *   `aria-controls`.
 * @param {string} [props.label] - `aria-label`, already interpolated by the
 *   parent (this component imports no dictionary).
 * @param {function(string): (string|string[]|null)} [props.flagSrc] - Resolves the
 *   flag image URL, or an ordered list of candidate URLs, from a country code; forwarded to `<FlagChip>`.
 * @param {function} [props.onClick] - Toggles the menu open state.
 * @param {function} [props.onKeyDown] - Handles keyboard opening (↓ ↑ Enter Space).
 * @param {React.Ref<HTMLButtonElement>} [props.ref] - Exposed so the parent can
 *   return focus to the trigger after `Escape` or a selection.
 * @returns {JSX.Element} The rendered trigger button.
 */
const LanguageButton = ({
    language,
    open = false,
    compact = false,
    listId,
    label,
    flagSrc,
    onClick,
    onKeyDown,
    ref
}) => {
    return (
        <button
            ref={ref}
            type="button"
            className="lang-switch-btn"
            aria-haspopup="listbox"
            aria-expanded={open}
            // Conditionné à `open` : posé en permanence, l'attribut référencerait
            // un id absent du DOM tant que le menu est fermé (même piège que
            // SidebarSwitcher.jsx, `LanguageSwitcher` ne montant `<LanguageMenu>`
            // que lorsque `open` est vrai).
            aria-controls={open ? listId : undefined}
            aria-label={label}
            onClick={onClick}
            onKeyDown={onKeyDown}>
            <FlagChip country={language?.country} flagSrc={flagSrc} />

            {/* <data> et non <span> : le badge affiche le pays (ex. « GB ») tout
                en portant en `value` le code langue (ex. « en ») remonté par
                onChange — exactement le rôle sémantique de <data>. */}
            {!compact && (
                <data className="lang-switch-code" value={language?.code}>
                    {language?.country}
                </data>
            )}

            {!compact && <ChevronIcon direction="right" className="lang-switch-chevron" />}
        </button>
    );
};

export default LanguageButton;
