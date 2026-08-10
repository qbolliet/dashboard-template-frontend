import './LanguageMenu.scss';

/**
 * Renders the dropdown listbox of the language switcher. Purely
 * presentational — open/close state, keyboard navigation and the active
 * cursor are owned by the parent `<LanguageSwitcher>`.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.id] - Id of the list, targeted by the trigger
 *   button's `aria-controls`.
 * @param {'left'|'right'} [props.align='left'] - Edge of the trigger button
 *   the menu aligns to.
 * @param {string} [props.label] - `aria-label` of the listbox.
 * @param {string} [props.activeDescendantId] - Id of the currently active
 *   option, written to `aria-activedescendant`.
 * @param {function} [props.onKeyDown] - Keyboard navigation handler, supplied
 *   by the parent hook.
 * @param {React.ReactNode} [props.children] - The `<LanguageOption>` items.
 * @param {React.Ref<HTMLUListElement>} [props.ref] - Exposed so the parent
 *   hook can move DOM focus onto the list when it opens.
 * @returns {JSX.Element} The rendered listbox.
 */
const LanguageMenu = ({
    id,
    align = 'left',
    label,
    activeDescendantId,
    onKeyDown,
    children,
    ref
}) => {
    return (
        // Le <ul> EST le panneau : fond, bordure, ombre et défilement lui sont
        // directement posés (LanguageMenu.scss), sans conteneur intermédiaire —
        // convention déjà actée pour les dropdowns de navigation du header.
        //
        // `tabIndex={-1}` + `aria-activedescendant` : le focus DOM se pose une
        // fois sur la liste (à l'ouverture, par le hook parent) et n'y bouge
        // plus ensuite ; seul l'attribut désigne l'option courante. C'est le
        // motif APG « Collapsible Dropdown Listbox », et c'est ce qui évite de
        // déplacer le focus à chaque flèche.
        <ul
            ref={ref}
            id={id}
            role="listbox"
            tabIndex={-1}
            className={`lang-switch-menu lang-switch-menu--${align}`}
            aria-label={label}
            aria-activedescendant={activeDescendantId}
            onKeyDown={onKeyDown}>
            {children}
        </ul>
    );
};

export default LanguageMenu;
