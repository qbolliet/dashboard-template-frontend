'use client';

// =================================================================
// USELANGUAGEMENU — mécanique du sélecteur de langue
// =================================================================
// Tout l'état de <LanguageSwitcher> : valeur (contrôlée ou non), ouverture du
// menu, position du curseur clavier, clic extérieur, gestion du focus. Les cinq
// composants du groupe restent ainsi purement présentatifs — seule la racine
// consomme ce hook, et c'est elle qui ouvre la frontière client.
//
// ⚠️ POURQUOI AUCUNE DÉTECTION DE LA LANGUE SYSTÈME ICI
// Le prototype amorçait la valeur non contrôlée avec `pickSystemLanguage()`, qui
// lit `navigator.languages`. Fonction volontairement NON portée, pour deux
// raisons cumulées :
//   1. Divergence d'hydratation — `navigator` n'existe pas au rendu serveur, qui
//      produirait donc `languages[0]` là où le client produirait la langue
//      système. React signale le désaccord et remonte le sous-arbre.
//   2. Redondance — la négociation système existe déjà, testée et partagée, dans
//      src/utils/i18n/negotiateLocale.js, appelée par le redirecteur d'entrée
//      src/app/(site)/demo/page.jsx. Une seconde implémentation dériverait.
// Répartition retenue : la NÉGOCIATION revient au redirecteur, la MÉMORISATION à
// LocaleProvider (localStorage + cookie NEXT_LOCALE), et la langue courante est
// décidée par l'URL. Ce hook, lui, se contente de `defaultValue ?? languages[0]`.

// Importation des modules
import { useEffect, useRef, useState } from 'react';

/**
 * Owns the state machine of a language switcher: current value, menu open state,
 * keyboard cursor, outside-click dismissal and focus handoff.
 *
 * Works either uncontrolled (`defaultValue`) or controlled (`value`), the mode being
 * decided by `value !== undefined`. `onChange` fires in both modes.
 *
 * @param {Object} options - Hook options.
 * @param {Array<{code: string, country: string, name: string}>} [options.languages=[]] -
 *   Offered languages. Bounds the keyboard cursor and resolves the active index.
 * @param {string} [options.value] - Active language code. Its presence switches the
 *   hook to controlled mode, where the internal value is kept but never read.
 * @param {string} [options.defaultValue] - Initially active language code
 *   (uncontrolled mode). Falls back to the first language of the list.
 * @param {Function} [options.onChange] - Called with the selected language code on
 *   every selection, in both modes.
 * @returns {Object} The menu API.
 * @returns {string} return.value - Resolved active language code.
 * @returns {boolean} return.open - Whether the menu is currently open.
 * @returns {number} return.activeIndex - Index of the option under the keyboard cursor.
 * @returns {React.RefObject<HTMLElement>} return.rootRef - Root element, delimiting
 *   what counts as an "inside" click.
 * @returns {React.RefObject<HTMLButtonElement>} return.buttonRef - Trigger button,
 *   which focus returns to on `Escape` and on selection.
 * @returns {React.RefObject<HTMLUListElement>} return.listRef - Listbox, which takes
 *   DOM focus while the menu is open.
 * @returns {Function} return.openMenu - Opens the menu, cursor on the active language.
 * @returns {Function} return.closeMenu - Closes the menu; its boolean argument tells
 *   whether to return focus to the trigger button.
 * @returns {Function} return.toggleMenu - Opens or closes, for the button's click.
 * @returns {Function} return.selectIndex - Selects the language at the given index,
 *   then closes and returns focus.
 * @returns {Function} return.setActiveIndex - Moves the keyboard cursor, used by the
 *   mouse-hover sync.
 * @returns {Function} return.onButtonKeyDown - Keyboard handler of the trigger button.
 * @returns {Function} return.onListKeyDown - Keyboard handler of the listbox.
 */
const useLanguageMenu = ({ languages = [], value: controlledValue, defaultValue, onChange }) => {
    // Mode contrôlé dès que `value` est fourni : l'état interne existe toujours,
    // mais n'est alors plus jamais lu (même test que Tabs.jsx et SelectMenu.jsx).
    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? languages[0]?.code);
    const value = isControlled ? controlledValue : uncontrolledValue;

    const [open, setOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const rootRef = useRef(null);
    const buttonRef = useRef(null);
    const listRef = useRef(null);

    // Fonctions simples, sans useCallback : le React Compiler est actif, et la
    // seule identité stable qui compte ici — celle du gestionnaire de clic
    // extérieur — est garantie autrement (voir le premier effet).
    const setValue = (code) => {
        if (!isControlled) setUncontrolledValue(code);
        onChange?.(code);
    };

    // Curseur posé sur la langue active à l'ouverture, et non sur la première de
    // la liste : `Entrée` immédiat après ouverture reconduit donc le choix
    // courant. Repli sur 0 quand la valeur n'est dans aucune option (liste vide,
    // ou valeur contrôlée exotique) — findIndex renvoie alors -1.
    const openMenu = () => {
        setActiveIndex(Math.max(0, languages.findIndex((language) => language.code === value)));
        setOpen(true);
    };

    // Le retour du focus est un PARAMÈTRE, pas un automatisme : après `Échap` ou
    // une sélection le focus DOM est sur la liste, qui va disparaître — sans
    // rendu explicite il retomberait sur <body>. Après un clic sur le bouton, à
    // l'inverse, le focus y est déjà : le lui rendre serait redondant.
    const closeMenu = (focusButton) => {
        setOpen(false);
        if (focusButton) buttonRef.current?.focus();
    };

    const toggleMenu = () => {
        if (open) closeMenu(false);
        else openMenu();
    };

    const selectIndex = (index) => {
        const language = languages[index];
        // Garde nécessaire : `activeIndex` peut désigner une option disparue si la
        // prop `languages` a raccourci entre deux rendus.
        if (!language) return;

        setValue(language.code);
        closeMenu(true);
    };

    // Clic extérieur — écouteur monté SEULEMENT pendant l'ouverture : un menu
    // fermé n'a rien à écouter, et le document n'accumule pas un gestionnaire par
    // instance du composant.
    useEffect(() => {
        if (!open) return;

        // Gestionnaire CRÉÉ DANS L'EFFET : c'est ce qui garantit que
        // removeEventListener retire exactement la fonction ajoutée. Une fonction
        // définie dans le corps du composant changerait d'identité à chaque rendu
        // et fuirait — et aucune mémoïsation n'est requise pour l'éviter.
        const onPointerDown = (event) => {
            if (!rootRef.current?.contains(event.target)) setOpen(false);
        };

        // `mousedown` et non `click` : la fermeture doit précéder le relâchement,
        // sinon un clic sur un contrôle extérieur agirait sur une interface encore
        // recouverte par le menu.
        document.addEventListener('mousedown', onPointerDown);
        return () => document.removeEventListener('mousedown', onPointerDown);
    }, [open]);

    // Focus déplacé sur la LISTE à l'ouverture, et non sur une option : c'est la
    // condition pour qu'`aria-activedescendant` soit opérant. Le focus DOM reste
    // ensuite immobile, seul l'attribut désigne l'option courante — motif APG
    // « Collapsible Dropdown Listbox ».
    useEffect(() => {
        if (open) listRef.current?.focus();
    }, [open]);

    const onButtonKeyDown = (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            // preventDefault sur les flèches (défilement de la page) comme sur
            // l'espace (idem) : le bouton natif déclencherait aussi son onClick,
            // qui rebasculerait aussitôt le menu que l'on vient d'ouvrir.
            event.preventDefault();
            openMenu();
        }
    };

    // ⚠️ DÉPLACEMENT BORNÉ, SANS BOUCLE (Math.min / Math.max)
    // Divergence assumée avec src/hooks/accessibility/useKeyboardNavigation.js,
    // qui boucle par défaut (`loop: true`) et n'est donc volontairement PAS
    // réutilisé ici. C'est le comportement du prototype, et la recommandation APG
    // pour un listbox court : sur huit langues, repartir du haut en fin de liste
    // se ressent comme une perte de position plutôt que comme une commodité. Ne
    // pas « harmoniser » sur le hook générique sans redécider ce point.
    const onListKeyDown = (event) => {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                setActiveIndex((index) => Math.min(languages.length - 1, index + 1));
                break;

            case 'ArrowUp':
                event.preventDefault();
                setActiveIndex((index) => Math.max(0, index - 1));
                break;

            case 'Home':
                event.preventDefault();
                setActiveIndex(0);
                break;

            case 'End':
                event.preventDefault();
                setActiveIndex(languages.length - 1);
                break;

            case 'Enter':
            case ' ':
                event.preventDefault();
                selectIndex(activeIndex);
                break;

            case 'Escape':
                event.preventDefault();
                closeMenu(true);
                break;

            // Seul cas SANS preventDefault : la tabulation doit suivre son cours
            // et emmener le focus au contrôle suivant. Le menu se contente de
            // disparaître derrière elle — et sans retour du focus au bouton, qui
            // annulerait précisément le déplacement demandé.
            case 'Tab':
                setOpen(false);
                break;

            default:
                break;
        }
    };

    return {
        value,
        open,
        activeIndex,
        rootRef,
        buttonRef,
        listRef,
        openMenu,
        closeMenu,
        toggleMenu,
        selectIndex,
        setActiveIndex,
        onButtonKeyDown,
        onListKeyDown,
    };
};

export default useLanguageMenu;
