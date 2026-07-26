'use client';

// Importation des modules
import { useId, useState } from 'react';
import { TabsCtx } from '../TabsContext';
import './Tabs.scss';

/**
 * Root of the composable tabs system: owns the active tab and provides the context
 * consumed by `<TabList>`, `<Tab>`, `<TabPanels>` and `<TabPanel>`.
 *
 * Works either uncontrolled (`defaultValue`) or controlled (`value` + `onChange`).
 * The `shared` prop is broadcast to every descendant, so sibling panels can render the
 * same dataset (e.g. a chart tab and a table tab).
 *
 * @param {Object} props - Component props.
 * @param {string} [props.defaultValue] - Initially active tab (uncontrolled mode).
 * @param {string} [props.value] - Active tab, forced by the parent (controlled mode).
 * @param {Function} [props.onChange] - Called with the new value on every change.
 * @param {*} [props.shared] - Arbitrary data shared with every descendant.
 * @param {'underline'|'pills'|'enclosed'} [props.variant='underline'] - Tab strip style.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Tab size.
 * @param {'start'|'center'|'end'} [props.align='start'] - Horizontal tab alignment.
 * @param {boolean} [props.fitted=false] - Stretch tabs to equal widths.
 * @param {'primary'|'positive'|'warning'|'negative'} [props.accent='primary'] - Active color.
 * @param {boolean} [props.keepMounted=false] - Keep inactive panels mounted but hidden.
 * @param {React.ReactNode} props.children - The tab strip and its panels.
 * @param {string} [props.className] - Extra class names.
 * @param {Object} [props.style] - Inline styles.
 * @returns {JSX.Element} The tabs root wrapping its subtree with the tabs context.
 */
const Tabs = ({
    defaultValue,
    value: controlledValue,
    onChange,
    shared,
    variant = 'underline',
    size = 'md',
    align = 'start',
    fitted = false,
    accent = 'primary',
    keepMounted = false,
    children,
    className,
    style,
    ...rest
}) => {
    // Mode contrôlé dès que `value` est fourni : l'état interne n'est alors plus lu.
    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
    const value = isControlled ? controlledValue : uncontrolledValue;

    // Préfixe des ids ARIA : stable par instance, et unique même avec plusieurs <Tabs>
    // sur la page (pas de compteur au niveau module).
    const baseId = useId();

    // Fonction simple : le React Compiler la mémoïse, aucune identité stable n'est
    // requise ici (aucun useEffect ni addEventListener ne dépend de setValue).
    const setValue = (next) => {
        if (!isControlled) setUncontrolledValue(next);
        onChange?.(next);
    };

    // Idem pour la valeur du contexte : objet littéral, pas de useMemo.
    const ctx = { value, setValue, shared, variant, size, align, fitted, keepMounted, baseId };

    // L'accent ne pilote que du CSS : le modificateur réassigne --tab-accent (Tabs.scss).
    const classes = ['tabs', `tabs--${accent}`, className].filter(Boolean).join(' ');

    return (
        <TabsCtx.Provider value={ctx}>
            <section className={classes} style={style} {...rest}>
                {children}
            </section>
        </TabsCtx.Provider>
    );
};

export default Tabs;
