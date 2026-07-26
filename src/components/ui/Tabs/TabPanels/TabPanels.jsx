// Pas de directive 'use client' : composant purement présentationnel (aucun hook),
// il ne fait qu'espacer la barre d'onglets et les panneaux. Il reste donc importable
// depuis un Server Component comme depuis un Client Component.

import './TabPanels.scss';

/**
 * Layout wrapper around a group of `<TabPanel>` elements.
 *
 * Purely presentational: it only spaces the panels below the tab strip. It carries
 * no state and no directive, so it can be rendered from either side of the RSC
 * boundary.
 *
 * @param {Object} props - Component props.
 * @param {boolean} [props.flush=false] - Removes the spacing above the panels.
 * @param {React.ReactNode} props.children - The `<TabPanel>` elements.
 * @param {string} [props.className] - Extra class names.
 * @param {Object} [props.style] - Inline styles.
 * @returns {JSX.Element} The panels container.
 */
const TabPanels = ({ flush = false, children, className, style, ...rest }) => {
    const classes = ['tab-panels', flush && 'tab-panels--flush', className]
        .filter(Boolean)
        .join(' ');

    return (
        <section className={classes} style={style} {...rest}>
            {children}
        </section>
    );
};

export default TabPanels;
