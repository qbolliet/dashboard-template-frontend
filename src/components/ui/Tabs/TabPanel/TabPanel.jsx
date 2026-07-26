'use client';

// Importation des modules
import { useTabs } from '../TabsContext';
import './TabPanel.scss';

/**
 * A single panel bound to a `<Tab>` through a shared `value`.
 *
 * When inactive and `keepMounted` is not set on `<Tabs>`, the panel unmounts entirely
 * (returns `null`) rather than merely hiding — cheaper for panels with heavy content.
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
 * @returns {?JSX.Element} The panel, or `null` when inactive and not kept mounted.
 */
const TabPanel = ({ value, children, className, style, ...rest }) => {
    const ctx = useTabs();
    const active = ctx.value === value;

    // Démonté quand inactif, sauf si <Tabs keepMounted> demande de le garder en vie
    // (caché via [hidden]) — utile pour préserver l'état interne d'un panneau (formulaire…).
    if (!active && !ctx.keepMounted) return null;

    const classes = ['tab-panel', className].filter(Boolean).join(' ');
    const content = typeof children === 'function' ? children(ctx.shared) : children;

    return (
        <article
            role="tabpanel"
            id={`${ctx.baseId}-panel-${value}`}
            aria-labelledby={`${ctx.baseId}-tab-${value}`}
            // [hidden] masque le panneau gardé monté ; data-tab-active déclenche
            // l'animation d'apparition en CSS (voir TabPanel.scss).
            hidden={!active || undefined}
            data-tab-active={active ? '' : undefined}
            className={classes}
            style={style}
            {...rest}
        >
            {content}
        </article>
    );
};

export default TabPanel;
