import React from 'react';
import Link from 'next/link';
import ChevronDownIcon from '../../../../../components/icons/ChevronDownIcon/ChevronDownIcon';
import DropdownItem from './DropdownItem';

/**
 * A group of links inside a dropdown (a header followed by a sub-list).
 * Renders as a `<li>` à la SidebarGroup: header link, a chevron toggle visible
 * on mobile/tablet (accordion), and the nested `<ul>` of sub-items.
 *
 * @param {Object} group - The group item (name, path, children).
 * @param {number} groupIndex - Index of the group among its siblings.
 * @param {string} basePath - Path prefix inherited from the parent dropdown item.
 * @param {boolean} isExpanded - Whether the group is expanded (mobile accordion).
 * @param {Function} onToggle - Toggles the group expansion (mobile).
 * @param {Function} onItemClick - Click handler for links (closes the dropdown).
 * @param {Function} isActivePath - Tests whether a path matches the current page.
 * @returns {JSX.Element} The rendered dropdown group.
 */
const DropdownGroup = ({
    group,
    groupIndex,
    basePath,
    isExpanded,
    onToggle,
    onItemClick,
    isActivePath
}) => {
    // Chemin complet de l'en-tête du groupe
    const groupPath = basePath + group.path;
    // Le groupe n'affiche un chevron + une sous-liste que s'il a réellement des enfants
    const hasChildren =
        Array.isArray(group.children) && group.children.length > 0;

    // Classes dynamiques (état déplié pour l'accordéon mobile)
    const groupClasses = [
        'nav-dropdown__group',
        isExpanded && 'nav-dropdown__group--expanded'
    ]
        .filter(Boolean)
        .join(' ');

    const headerClasses = [
        'nav-dropdown__group-header',
        isActivePath(groupPath) && 'nav-dropdown__group-header--active'
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <li className={groupClasses}>
            {/* En-tête / lien principal du groupe */}
            <Link href={groupPath} className={headerClasses} onClick={onItemClick}>
                {group.name}
            </Link>

            {/* Chevron pour déplier/replier le groupe — visible uniquement sur mobile (géré en CSS) */}
            {hasChildren && (
                <button
                    type="button"
                    className={`nav-dropdown__group-chevron ${
                        isExpanded ? 'nav-dropdown__group-chevron--expanded' : ''
                    }`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle();
                    }}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Réduire' : 'Développer'} le groupe ${group.name}`}
                >
                    <ChevronDownIcon width="12" height="12" />
                </button>
            )}

            {/* Sous-liste : sous-éléments du groupe */}
            {hasChildren && (
                <ul
                    className={`nav-dropdown__sublist ${
                        isExpanded ? 'nav-dropdown__sublist--expanded' : ''
                    }`}
                >
                    {group.children.map((subChild, subIndex) => (
                        <DropdownItem
                            key={`sub-${groupIndex}-${subIndex}`}
                            href={groupPath + subChild.path}
                            name={subChild.name}
                            isActive={isActivePath(groupPath + subChild.path)}
                            onItemClick={onItemClick}
                            itemClass="nav-dropdown__subitem"
                            linkClass="nav-dropdown__sublink"
                        />
                    ))}
                </ul>
            )}
        </li>
    );
};

export default DropdownGroup;
