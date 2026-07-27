'use client';

// Importation des modules
import { useRef } from 'react';
import { useTabsContext } from '../TabsContext';
import './TabList.scss';

// Touches interceptées par la navigation clavier du tablist (motif ARIA « tabs »).
const NAVIGATION_KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];

/**
 * Tab strip: renders the `role="tablist"` track and handles roving keyboard navigation.
 *
 * Layout options (variant, size, align, fitted) are read from the `<Tabs>` context, so the
 * component only needs its children. To place controls next to the tabs, compose the row at
 * the call site (`<header><TabList/><button/></header>`) rather than through a slot prop.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.label] - Accessible name for the tab strip (`aria-label`).
 *   Recommended as soon as several tab groups coexist on a page, otherwise screen
 *   readers announce every one of them as a bare "tab list".
 * @param {React.ReactNode} props.children - The `<Tab>` elements.
 * @param {string} [props.className] - Extra class names.
 * @param {Object} [props.style] - Inline styles.
 * @returns {JSX.Element} The tab strip.
 */
const TabList = ({ label, children, className, style, ...rest }) => {
    const ctx = useTabsContext('TabList');

    // Ref sur la piste : sert à retrouver les onglets réellement rendus (le clavier doit
    // suivre l'ordre du DOM, y compris avec des enfants générés dynamiquement).
    const listRef = useRef(null);

    // Navigation clavier parmi les onglets NON désactivés. Fonction simple : elle est
    // passée à onKeyDown (événement React), aucune identité stable n'est requise.
    //
    // Volontairement inline plutôt que délégué à useKeyboardNavigation (features/accessibility) :
    // ce hook expose un index en state React et ne déplace jamais le focus DOM — il est taillé
    // pour un listbox `aria-activedescendant` piloté par un tableau d'items. Le motif ARIA
    // « tabs » exige l'inverse : un roving tabindex sur le focus DOM réel, au-dessus d'enfants
    // composés (<Tab> arbitraires) dont on ne connaît pas la liste. L'utiliser ajouterait une
    // seconde source de vérité à côté de ctx.value sans supprimer la ref ni le .focus().
    const handleKeyDown = (event) => {
        if (!NAVIGATION_KEYS.includes(event.key)) return;

        const tabs = Array.from(
            listRef.current.querySelectorAll('[role="tab"]:not([aria-disabled="true"])')
        );
        if (!tabs.length) return;

        event.preventDefault();

        // Focus hors des onglets (enfant non-tab dans la piste) : on repart du dernier index,
        // ce qui envoie ArrowRight sur le premier onglet et ArrowLeft sur le dernier. Sans
        // cette garde, l'index -1 ferait tomber ArrowLeft sur l'AVANT-dernier onglet.
        const activeIndex = tabs.indexOf(document.activeElement);
        const currentIndex = activeIndex === -1 ? tabs.length - 1 : activeIndex;

        // Flèches circulaires (le modulo ramène au premier/dernier onglet).
        let nextIndex;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length;
        else nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;

        // focus() PUIS click() : activation immédiate au déplacement (motif « automatic
        // activation » d'ARIA), le clic passant par le handler du <Tab>.
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
    };

    // Les modificateurs par défaut (md, start) ne sont pas émis : la valeur de base est
    // déjà portée par .tab-list.
    const classes = [
        'tab-list',
        `tab-list--${ctx.variant}`,
        ctx.size !== 'md' && `tab-list--${ctx.size}`,
        ctx.align !== 'start' && `tab-list--${ctx.align}`,
        ctx.fitted && 'tab-list--fitted',
        className
    ].filter(Boolean).join(' ');

    // {...rest} étalé EN PREMIER : les props internes (rôle, ref, clavier) restent
    // prioritaires — sinon un onKeyDown fourni par l'appelant écraserait toute la
    // navigation clavier sans le moindre avertissement.
    //
    // aria-label fait EXCEPTION et passe AVANT rest : sans `label`, il vaudrait
    // undefined et effacerait alors un aria-label (ou un aria-labelledby doublé d'un
    // aria-label) posé en direct par l'appelant. Ici l'appelant doit gagner : `label`
    // n'est qu'un raccourci, pas une garantie de fonctionnement comme le rôle.
    return (
        <nav
            aria-label={label}
            {...rest}
            className={classes}
            role="tablist"
            ref={listRef}
            onKeyDown={handleKeyDown}
            style={style}
        >
            {children}
        </nav>
    );
};

export default TabList;
