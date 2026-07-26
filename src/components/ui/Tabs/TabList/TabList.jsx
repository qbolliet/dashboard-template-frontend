'use client';

// Importation des modules
import { useRef } from 'react';
import { useTabs } from '../TabsContext';
import './TabList.scss';

// Touches interceptées par la navigation clavier du tablist (motif ARIA « tabs »).
const NAVIGATION_KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];

/**
 * Tab strip: renders the `role="tablist"` track and handles roving keyboard navigation.
 *
 * Layout options (variant, size, align, fitted) are read from the `<Tabs>` context, so
 * the component only needs its children — and optionally an `actions` slot pinned to the
 * right, outside the scrollable track.
 *
 * @param {Object} props - Component props.
 * @param {React.ReactNode} [props.actions] - Right-aligned actions, kept out of the scroll area.
 * @param {React.ReactNode} props.children - The `<Tab>` elements.
 * @param {string} [props.className] - Extra class names.
 * @param {Object} [props.style] - Inline styles.
 * @returns {JSX.Element} The tab strip, wrapped in a header when actions are provided.
 */
const TabList = ({ actions, children, className, style, ...rest }) => {
    const ctx = useTabs();

    // Ref sur la piste : sert à retrouver les onglets réellement rendus (le clavier doit
    // suivre l'ordre du DOM, y compris avec des enfants générés dynamiquement).
    const listRef = useRef(null);

    // Navigation clavier parmi les onglets NON désactivés. Fonction simple : elle est
    // passée à onKeyDown (événement React), aucune identité stable n'est requise.
    const handleKeyDown = (event) => {
        if (!NAVIGATION_KEYS.includes(event.key)) return;

        const tabs = Array.from(
            listRef.current.querySelectorAll('[role="tab"]:not([aria-disabled="true"])')
        );
        if (!tabs.length) return;

        const currentIndex = tabs.indexOf(document.activeElement);
        event.preventDefault();

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

    const list = (
        <nav
            className={classes}
            role="tablist"
            ref={listRef}
            onKeyDown={handleKeyDown}
            style={style}
            {...rest}
        >
            {children}
        </nav>
    );

    // Sans actions, la piste se suffit à elle-même.
    if (actions == null) return list;

    // Avec actions : on encadre la piste pour garder les actions hors du défilement.
    return (
        <header className="tab-strip">
            {list}
            <aside className="tab-list-actions">{actions}</aside>
        </header>
    );
};

export default TabList;
