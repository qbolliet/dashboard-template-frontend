'use client';

// Importation des modules
import { useTabs } from '../TabsContext';
import './Tab.scss';

/**
 * A single tab button inside a `<TabList>`.
 *
 * The `value` prop is the link with its `<TabPanel>`: both derive their ARIA ids from the
 * `baseId` of the `<Tabs>` root, so the pairing needs no extra wiring.
 *
 * @param {Object} props - Component props.
 * @param {string} props.value - Tab identifier, must match a `<TabPanel>` value.
 * @param {React.ReactNode} [props.icon] - Optional icon rendered before the label.
 * @param {number|string} [props.count] - Optional counter badge rendered after the label.
 * @param {boolean} [props.disabled=false] - Makes the tab unselectable and skipped by the keyboard.
 * @param {React.ReactNode} props.children - The tab label.
 * @param {string} [props.className] - Extra class names.
 * @param {Object} [props.style] - Inline styles.
 * @param {Function} [props.onClick] - Called after the tab has been activated.
 * @returns {JSX.Element} The tab button.
 */
const Tab = ({
    value,
    icon,
    count,
    disabled = false,
    children,
    className,
    style,
    onClick,
    ...rest
}) => {
    const ctx = useTabs();
    const selected = ctx.value === value;

    const classes = ['tab', className].filter(Boolean).join(' ');

    // Activation : on garde le clic derrière `disabled` (aria-disabled laisse le bouton
    // focusable/cliquable, contrairement à l'attribut natif `disabled`).
    const handleClick = (event) => {
        if (disabled) return;
        ctx.setValue(value);
        onClick?.(event);
    };

    return (
        <button
            type="button"
            role="tab"
            id={`${ctx.baseId}-tab-${value}`}
            aria-selected={selected}
            aria-controls={`${ctx.baseId}-panel-${value}`}
            aria-disabled={disabled || undefined}
            // tabIndex rotatif : seul l'onglet actif est atteignable via Tab, les autres
            // le sont via les flèches (motif ARIA « roving tabindex »).
            tabIndex={selected ? 0 : -1}
            className={classes}
            style={style}
            onClick={handleClick}
            {...rest}
        >
            {icon != null && <span className="tab-icon">{icon}</span>}
            <span className="tab-label">{children}</span>
            {count != null && <span className="tab-count">{count}</span>}
        </button>
    );
};

export default Tab;
