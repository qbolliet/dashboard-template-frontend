'use client';

// Importation des modules
import { useTabsContext } from '../TabsContext';
import './TabPanel.scss';

/**
 * A single panel bound to a `<Tab>` through a shared `value`.
 *
 * When inactive and `keepMounted` is not set on `<Tabs>`, the panel unmounts entirely
 * (returns `null`) rather than merely hiding — cheaper for panels with heavy content.
 *
 * The panel is always keyboard reachable (`tabIndex={0}`, per the ARIA tabs pattern), so
 * that tabbing out of the tab strip never skips a panel made of non-focusable content.
 *
 * `children` may be a render-prop `(shared) => ReactNode` to read the `shared` payload
 * of `<Tabs>` (e.g. a chart tab and a table tab rendering the same dataset). Note that
 * a function is not serializable across the Server/Client Components boundary: using
 * the render-prop form forces the calling component to itself be a Client Component,
 * whereas static `children` may still originate from a Server Component.
 *
 * @param {Object} props - Component props.
 * @param {string} props.value - Panel identifier, must match a `<Tab>` value.
 * @param {React.ReactNode|Function} props.children - Static content, or a render-prop
 *   `(shared) => ReactNode` receiving the `shared` payload of `<Tabs>`.
 * @param {string} [props.className] - Extra class names.
 * @param {Object} [props.style] - Inline styles.
 * @returns {?JSX.Element} The `<section role="tabpanel">` panel, or `null` when inactive
 *   and not kept mounted.
 */
const TabPanel = ({ value, children, className, style, ...rest }) => {
    const ctx = useTabsContext('TabPanel');
    const active = ctx.value === value;

    // Démonté quand inactif, sauf si <Tabs keepMounted> demande de le garder en vie
    // (caché via [hidden]) — utile pour préserver l'état interne d'un panneau (formulaire…).
    if (!active && !ctx.keepMounted) return null;

    const classes = ['tab-panel', className].filter(Boolean).join(' ');
    const content = typeof children === 'function' ? children(ctx.shared) : children;

    // {...rest} étalé AU MILIEU, comme dans Tab et TabList : les props qui garantissent le
    // fonctionnement (rôle, ids ARIA, visibilité) restent APRÈS rest, donc non écrasables —
    // un id fourni par l'appelant remplacerait sinon celui que vise l'aria-controls de
    // l'onglet, qui pointerait alors dans le vide (aria-valid-attr-value, axe-core), et
    // l'aria-labelledby du panneau ne résoudrait plus, tout cela sans le moindre avertissement.
    return (
        // <section>, pas <article> : selon ARIA in HTML, <article> n'autorise pas le
        // rôle tabpanel (seulement application/document/feed/main/none/presentation/
        // region), alors que <section> l'autorise explicitement.
        <section
            // Panneau atteignable au clavier (motif ARIA « tabs ») : sans ça, un Tab
            // depuis l'onglet actif saute tout le panneau quand celui-ci ne contient
            // aucun élément focusable. Un panneau caché reste hors de l'ordre de
            // tabulation ([hidden] → display: none), keepMounted n'est donc pas affecté.
            //
            // tabIndex et style font EXCEPTION et passent AVANT rest, par cohérence avec
            // aria-disabled/style dans Tab : ce sont des préférences d'affichage ou de
            // parcours, pas des garanties structurelles — l'appelant doit pouvoir les écraser.
            tabIndex={0}
            style={style}
            {...rest}
            role="tabpanel"
            id={`${ctx.baseId}-panel-${value}`}
            aria-labelledby={`${ctx.baseId}-tab-${value}`}
            // [hidden] masque le panneau gardé monté ; data-tab-active déclenche
            // l'animation d'apparition en CSS (voir TabPanel.scss).
            hidden={!active || undefined}
            data-tab-active={active ? '' : undefined}
            className={classes}
        >
            {content}
        </section>
    );
};

export default TabPanel;
