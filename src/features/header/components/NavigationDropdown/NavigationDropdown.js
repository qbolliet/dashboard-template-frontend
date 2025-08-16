'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import DropdownToggleButton from '../../../../shared/components/DropdownToggleButton/DropdownToggleButton';
import './NavigationDropdown.scss';

/**
 * Navigation dropdown component with multi-level support.
 * Handles 3-level navigation hierarchy with accessibility features.
 * 
 * @param {Object} item - Navigation item object with path, name, children
 * @param {number} index - Index of the navigation item
 * @param {string} currentPath - Current active path for highlighting
 * @param {Function} onNavigationClick - Callback when navigation item is clicked
 * @param {boolean} isHydrated - Whether the component has been hydrated on client
 * @returns {JSX.Element} The rendered navigation dropdown component
 */
const NavigationDropdown = ({ item, index, currentPath, onNavigationClick, isHydrated = false }) => {
    // État pour gérer l'ouverture du dropdown
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    /**
     * Handle clicks outside the dropdown to close it.
     * 
     * @param {Event} event - The mouse click event
     */
    const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
            setIsOpen(false);
        }
    };

    // Écouter les clics en dehors du dropdown pour le fermer
    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    /**
     * Handle navigation link click.
     * 
     * @param {string} path - The path to navigate to
     */
    const handleLinkClick = (path) => {
        if (onNavigationClick) {
            onNavigationClick(path);
        }
        setIsOpen(false);
    };

    // Vérifier si l'élément actuel est actif (seulement après hydratation pour éviter les mismatches)
    const isActive = isHydrated && currentPath === item.path;
    
    // Vérifier si un enfant est actif (pour highlighting)
    const hasActiveChildren = isHydrated && item.children && item.children.some(subitem => 
        currentPath.startsWith(item.path + subitem.path)
    );

    return (
        <li key={index} ref={dropdownRef}>
            <div className={`dropdown-head-link fs-500 flex underlined-indicators ${
                isActive ? 'active' : hasActiveChildren ? 'active-children' : ''
            }`}>
                <Link 
                    href={item.path} 
                    className="ff-sans fw-500 text-dark" 
                    tabIndex="0" 
                    onClick={(e) => {
                        e.preventDefault();
                        handleLinkClick(item.path);
                    }}
                >
                    {item.name}
                </Link>
                {item.children !== null && (
                    <DropdownToggleButton 
                        isDropdownOpen={isOpen} 
                        onClick={() => setIsOpen(!isOpen)} 
                        index={index} 
                        className="dropdown-button"
                    />
                )}
            </div>
            
            {/* Dropdown menu avec sous-éléments */}
            {item.children !== null && (
                <div 
                    id={`dropdown-${index}`} 
                    className={isOpen ? 'dropdown dropdown-active' : 'dropdown'}
                >
                    {/* Si le premier sous-élément a des enfants (3 niveaux) */}
                    {item.children[0]?.children !== null ? (
                        item.children.map((subitem, subindex) => (
                            <ul key={subindex}>
                                <li>
                                    <Link
                                        href={item.path + subitem.path}
                                        className={`fs-400 fw-400 dropdown-link underlined-indicators ${
                                            isHydrated && currentPath === item.path + subitem.path ? 'active' : ''
                                        }`}
                                        tabIndex="0"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleLinkClick(item.path + subitem.path);
                                        }}
                                    >
                                        {subitem.name}
                                    </Link>
                                </li>
                                {/* Troisième niveau de navigation */}
                                {subitem.children?.map((subsubitem, subsubindex) => (
                                    <li key={subsubindex}>
                                        <Link
                                            href={item.path + subitem.path + subsubitem.path}
                                            className={`fs-200 fw-300 dropdown-link underlined-indicators ${
                                                isHydrated && currentPath === item.path + subitem.path + subsubitem.path ? 'active' : ''
                                            }`}
                                            tabIndex="0"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                handleLinkClick(item.path + subitem.path + subsubitem.path);
                                            }}
                                        >
                                            {subsubitem.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        ))
                    ) : (
                        /* Navigation à 2 niveaux seulement */
                        <ul>
                            {item.children.map((subitem, subindex) => (
                                <li key={subindex}>
                                    <Link
                                        href={item.path + subitem.path}
                                        className={`fw-400 dropdown-link underlined-indicators ${
                                            isHydrated && currentPath === item.path + subitem.path ? 'active' : ''
                                        }`}
                                        tabIndex="0"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleLinkClick(item.path + subitem.path);
                                        }}
                                    >
                                        {subitem.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </li>
    );
};

export default NavigationDropdown;