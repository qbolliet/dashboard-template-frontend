'use client';

// Importation des modules
import VisuallyHidden from '@/features/accessibility/components/VisuallyHidden/VisuallyHidden';
import { useTabsContext } from '../TabsContext';
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
 * @param {string} [props.countLabel] - Noun naming what `count` counts ("alertes"), read by
 *     screen readers instead of the bare number.
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
    countLabel,
    disabled = false,
    children,
    className,
    style,
    onClick,
    ...rest
}) => {
    const ctx = useTabsContext('Tab');
    const selected = ctx.value === value;
    // Le panneau ciblé n'existe dans le DOM que si actif ou si `keepMounted` est posé
    // sur `<Tabs>` (voir TabPanel.jsx, condition de démontage) : un `aria-controls`
    // vers un id absent est invalide et fait échouer aria-valid-attr-value (axe-core).
    const panelMounted = selected || ctx.keepMounted;

    const classes = ['tab', className].filter(Boolean).join(' ');

    // Activation : on garde le clic derrière `disabled` (aria-disabled laisse le bouton
    // focusable/cliquable, contrairement à l'attribut natif `disabled`).
    const handleClick = (event) => {
        if (disabled) return;
        // setValue seulement si la sélection change réellement : un clic sur l'onglet
        // déjà actif ne doit pas ré-émettre onChange (voir Tabs.jsx) à chaque fois.
        if (!selected) ctx.setValue(value);
        // onClick reste appelé dans tous les cas : c'est un événement de clic, pas un
        // événement de changement — l'appelant peut vouloir réagir même sans transition.
        onClick?.(event);
    };

    // {...rest} étalé AU MILIEU, comme dans TabList : les props qui garantissent le
    // fonctionnement (rôle, ids ARIA, tabIndex roving, activation) restent APRÈS rest,
    // donc non écrasables — sinon un id ou un tabIndex fourni par l'appelant romprait
    // silencieusement le lien avec le TabPanel ou le roving tabindex.
    //
    // aria-disabled et style font EXCEPTION et passent AVANT rest, par cohérence avec
    // aria-label dans TabList : ce sont des préférences d'affichage, pas des garanties
    // structurelles, donc l'appelant doit pouvoir les écraser.
    return (
        <button
            aria-disabled={disabled || undefined}
            style={style}
            {...rest}
            type="button"
            role="tab"
            id={`${ctx.baseId}-tab-${value}`}
            aria-selected={selected}
            aria-controls={panelMounted ? `${ctx.baseId}-panel-${value}` : undefined}
            // tabIndex rotatif : seul l'onglet actif est atteignable via Tab, les autres
            // le sont via les flèches (motif ARIA « roving tabindex »).
            tabIndex={selected ? 0 : -1}
            className={classes}
            onClick={handleClick}
        >
            {icon != null && <span className="tab-icon">{icon}</span>}
            <span className="tab-label">{children}</span>
            {count != null && (
                <>
                    {/* Avec un libellé, la pastille visuelle est masquée aux lecteurs d'écran :
                        « Alertes 3 » (ambigu) devient « Alertes, 3 alertes ». */}
                    <span className="tab-count" aria-hidden={countLabel ? 'true' : undefined}>{count}</span>
                    {countLabel && <VisuallyHidden>{`${count} ${countLabel}`}</VisuallyHidden>}
                </>
            )}
        </button>
    );
};

export default Tab;
