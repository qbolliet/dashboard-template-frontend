import React from 'react';
import DropdownGroup from './DropdownGroup';
import DropdownItem from './DropdownItem';

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
 * Dispatcher à la SidebarMenu: chooses between a grouped layout (`<ul>` of
 * DropdownGroup) and a flat list (`<ul>` of DropdownItem) depending on the
 * shape of the data.
 *
 * @param {Object} item - The parent navigation item (provides `children` and base `path`).
 * @param {Function} onItemClick - Click handler for links (closes the dropdown).
 * @param {Function} isActivePath - Tests whether a path matches the current page.
 * @param {Set<number>} expandedGroups - Indices of expanded groups (mobile accordion).
 * @param {Function} toggleGroupExpansion - Toggles a group's expansion by index.
 * @returns {JSX.Element|null} The rendered dropdown content, or null if empty.
 */
const DropdownContent = ({
    item,
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

    // PRIORITÉ 1 : structure à deux niveaux (groupes avec sous-éléments)
    if (isGroupedStructure(children)) {
        return (
            <ul className="nav-dropdown__groups">
                {children.map((group, groupIndex) => (
                    <DropdownGroup
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
        <ul className="nav-dropdown__list">
            {children.map((child, childIndex) => (
                <DropdownItem
                    key={`child-${childIndex}`}
                    href={basePath + child.path}
                    name={child.name}
                    isActive={isActivePath(basePath + child.path)}
                    onItemClick={onItemClick}
                    itemClass="nav-dropdown__item"
                    linkClass="nav-dropdown__link"
                />
            ))}
        </ul>
    );
};

export default DropdownContent;
