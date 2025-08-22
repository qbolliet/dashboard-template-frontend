import React from 'react';
import Link from 'next/link';

/**
 * Utility function to render dropdown content.
 * Handles different types of children structures (simple lists vs grouped items).
 * 
 * @param {Object} item - The parent item
 * @param {Function} onItemClick - Click handler function
 * @param {Function} isActivePath - Function to check if a path is active
 * @param {Set} expandedGroups - Set of expanded group indices for mobile
 * @param {Function} toggleGroupExpansion - Function to toggle group expansion on mobile
 * @param {Component} ChevronDownIcon - Icon component for chevron
 * @returns {JSX.Element} The rendered dropdown content
 */
export const renderDropdownContent = (
    item, 
    onItemClick, 
    isActivePath, 
    expandedGroups, 
    toggleGroupExpansion,
    ChevronDownIcon
) => {
    const { children, path: basePath } = item;

    // PRIORITÉ 1 : Vérifier d'abord la structure à deux niveaux (groupes avec sous-éléments réels)
    // Condition : le premier enfant doit avoir des sous-enfants non-null et non-vides
    // pour distinguer les vrais groupes des éléments simples avec children: null
    if (children && Array.isArray(children) && children.length > 0 && 
        children[0] && children[0].hasOwnProperty('children') && 
        children[0].children !== null && 
        Array.isArray(children[0].children) && 
        children[0].children.length > 0) {
        return (
            <div className="nav-dropdown__groups">
                {children.map((group, groupIndex) => {
                    const isGroupExpanded = expandedGroups.has(groupIndex);
                    return (
                        <div key={`group-${groupIndex}`} className={`nav-dropdown__group ${isGroupExpanded ? 'nav-dropdown__group--expanded' : ''}`}>
                            {/* En-tête du groupe avec chevron mobile */}
                            <div className="nav-dropdown__group-header-wrapper">
                                <Link
                                    href={basePath + group.path}
                                    className={`nav-dropdown__group-header ${
                                        isActivePath(basePath + group.path) ? 'nav-dropdown__group-header--active' : ''
                                    }`}
                                    onClick={onItemClick}
                                >
                                    {group.name}
                                </Link>
                                
                                {/* Chevron pour mobile uniquement - géré par CSS */}
                                {group.children && Array.isArray(group.children) && group.children.length > 0 && (
                                    <button
                                        className={`nav-dropdown__group-chevron ${isGroupExpanded ? 'nav-dropdown__group-chevron--expanded' : ''}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            toggleGroupExpansion(groupIndex);
                                        }}
                                        aria-expanded={isGroupExpanded}
                                        aria-label={`${isGroupExpanded ? 'Réduire' : 'Développer'} le groupe ${group.name}`}
                                        type="button"
                                    >
                                        <ChevronDownIcon width="12" height="12" />
                                    </button>
                                )}
                            </div>
                        
                            {/* Sous-éléments du groupe - afficher seulement si le groupe a des enfants */}
                            {group.children && Array.isArray(group.children) && group.children.length > 0 && (
                                <ul className={`nav-dropdown__sublist ${isGroupExpanded ? 'nav-dropdown__sublist--expanded' : ''}`}>
                                {group.children.map((subChild, subIndex) => (
                                    <li key={`sub-${subIndex}`} className="nav-dropdown__subitem">
                                        <Link
                                            href={basePath + group.path + subChild.path}
                                            className={`nav-dropdown__sublink ${
                                                isActivePath(basePath + group.path + subChild.path) 
                                                    ? 'nav-dropdown__sublink--active' : ''
                                            }`}
                                            onClick={onItemClick}
                                            aria-current={
                                                isActivePath(basePath + group.path + subChild.path) 
                                                    ? 'page' : undefined
                                            }
                                        >
                                            {subChild.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )})}
            </div>
        );
    }

    // PRIORITÉ 2 : Structure simple à un niveau (liste d'éléments sans sous-éléments)
    // Condition : children doit être un tableau non vide
    if (children && Array.isArray(children) && children.length > 0) {
        return (
            <ul className="nav-dropdown__list">
                {children.map((child, childIndex) => (
                    <li key={`child-${childIndex}`} className="nav-dropdown__item">
                        <Link
                            href={basePath + child.path}
                            className={`nav-dropdown__link ${
                                isActivePath(basePath + child.path) ? 'nav-dropdown__link--active' : ''
                            }`}
                            onClick={onItemClick}
                            aria-current={isActivePath(basePath + child.path) ? 'page' : undefined}
                        >
                            {child.name}
                        </Link>
                    </li>
                ))}
            </ul>
        );
    }

    // Fallback : si la structure children n'est pas reconnue ou est vide
    return null;
};