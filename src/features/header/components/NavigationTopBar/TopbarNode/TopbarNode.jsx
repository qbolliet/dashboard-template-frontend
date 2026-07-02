'use client';
import React from 'react';
import TopbarGroupSection from '../TopbarGroupSection/TopbarGroupSection';
import TopbarGroupItem from '../TopbarGroupItem/TopbarGroupItem';

/**
 * Determines whether a dropdown's children form a grouped structure
 * (groups with real sub-items) rather than a flat list.
 * The first child must own a non-null, non-empty `children` array — this
 * distinguishes true groups from simple items that carry `children: null`.
 *
 * @param {Array} children - The children of the dropdown item.
 * @returns {boolean} True if the children should render as groups.
 */
const isGroupedStructure = (children) =>
    Array.isArray(children) &&
    children.length > 0 &&
    children[0] &&
    Object.prototype.hasOwnProperty.call(children[0], 'children') &&
    children[0].children !== null &&
    Array.isArray(children[0].children) &&
    children[0].children.length > 0;

/**
 * Renders the content of a dropdown menu.
 * Dispatcher à la SidebarNode: chooses between a grouped layout (`<ul>` of
 * TopbarGroupSection) and a flat list (`<ul>` of TopbarGroupItem) depending on the
 * shape of the data.
 *
 * @param {Object} item - The parent navigation item (provides `children` and base `path`).
 * @param {string} id - DOM id of the dropdown panel (the <ul> itself).
 * @param {boolean} isOpen - Whether the dropdown is open (drives the --open modifier).
 * @param {Function} onItemClick - Click handler for links (closes the dropdown).
 * @param {Function} isActivePath - Tests whether a path matches the current page.
 * @param {Set<number>} expandedGroups - Indices of expanded groups (mobile accordion).
 * @param {Function} toggleGroupExpansion - Toggles a group's expansion by index.
 * @returns {JSX.Element|null} The rendered dropdown content, or null if empty.
 */
const TopbarNode = ({
    item,
    id,
    isOpen = false,
    onItemClick,
    isActivePath,
    expandedGroups,
    toggleGroupExpansion
}) => {
    const { children, path: basePath } = item;

    // Structure non reconnue ou vide → rien à afficher
    if (!Array.isArray(children) || children.length === 0) {
        return null;
    }

    // Classes du panneau (le <ul> lui-même) : rôle de panneau + variante + état ouvert.
    const panelClasses = (variant) => [
        'topbar-dropdown',
        variant,
        isOpen && 'topbar-dropdown--open'
    ].filter(Boolean).join(' ');

    // PRIORITÉ 1 : structure à deux niveaux (groupes avec sous-éléments)
    if (isGroupedStructure(children)) {
        return (
            <ul
                id={id}
                className={panelClasses('topbar-dropdown--groups')}
                inert={!isOpen}
            >
                {children.map((group, groupIndex) => (
                    <TopbarGroupSection
                        key={`group-${groupIndex}`}
                        group={group}
                        groupIndex={groupIndex}
                        basePath={basePath}
                        isExpanded={expandedGroups.has(groupIndex)}
                        onToggle={() => toggleGroupExpansion(groupIndex)}
                        onItemClick={onItemClick}
                        isActivePath={isActivePath}
                    />
                ))}
            </ul>
        );
    }

    // PRIORITÉ 2 : liste simple à un niveau (liens sans sous-éléments)
    return (
        <ul
            id={id}
            className={panelClasses('topbar-dropdown--list')}
            inert={!isOpen}
        >
            {children.map((child, childIndex) => (
                <TopbarGroupItem
                    key={`child-${childIndex}`}
                    href={basePath + child.path}
                    name={child.name}
                    isActive={isActivePath(basePath + child.path)}
                    onItemClick={onItemClick}
                    itemClass="topbar-item"
                    linkClass="topbar-link"
                />
            ))}
        </ul>
    );
};

export default TopbarNode;
