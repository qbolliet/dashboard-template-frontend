'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useSidebar } from '../NavigationSideBar/NavigationSideBar';
import './SidebarSwitcher.scss';

/**
 * Switcher component for navigation sections with logo and dropdown.
 * Similar to shadcn VersionSwitcher but adapted for navigation data.
 *
 * @param {Array} items - Array of top-level navigation items
 * @param {Object} selectedItem - Currently selected navigation item
 * @param {Function} onSelectionChange - Callback when selection changes
 * @param {string} logoSrc - Path to the logo image
 * @returns {JSX.Element} The rendered sidebar switcher
 */
const SidebarSwitcher = ({
    items = [],
    selectedItem,
    onSelectionChange,
    logoSrc = '/logo.svg'
}) => {
    // État pour gérer l'ouverture du dropdown
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Référence pour le dropdown
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);

    // Contexte de la sidebar
    const { isOpen: sidebarIsOpen } = useSidebar();

    // Fermer le dropdown lors du clic à l'extérieur
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Toggle du dropdown
    const toggleDropdown = () => {
        setIsDropdownOpen(prev => !prev);
    };

    // Gestion de la sélection d'un item
    const handleItemSelection = (item) => {
        setIsDropdownOpen(false);
        if (onSelectionChange) {
            onSelectionChange(item);
        }
    };

    // Gestion des raccourcis clavier
    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            setIsDropdownOpen(false);
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleDropdown();
        }
    };

    // Classes CSS pour le switcher
    const switcherClasses = [
        'sidebar-switcher',
        isDropdownOpen ? 'sidebar-switcher--open' : '',
        sidebarIsOpen ? 'sidebar-switcher--expanded' : 'sidebar-switcher--collapsed'
    ].filter(Boolean).join(' ');

    // Classes CSS pour le dropdown
    const dropdownClasses = [
        'sidebar-switcher-dropdown',
        isDropdownOpen ? 'sidebar-switcher-dropdown--open' : ''
    ].filter(Boolean).join(' ');

    if (items.length === 0) {
        return null;
    }

    return (
        <div className={switcherClasses} ref={dropdownRef}>
            {/* Trigger du switcher */}
            <button
                ref={triggerRef}
                type="button"
                className="sidebar-switcher-trigger"
                onClick={toggleDropdown}
                onKeyDown={handleKeyDown}
                aria-expanded={isDropdownOpen}
                aria-haspopup="true"
            >
                {/* Logo */}
                <div className="sidebar-switcher-logo">
                    <Image
                        src={logoSrc}
                        alt="Logo"
                        width={32}
                        height={32}
                        className="sidebar-switcher-logo-image"
                    />
                </div>

                {/* Contenu du switcher (visible quand ouvert) */}
                {sidebarIsOpen && (
                    <>
                        <div className="sidebar-switcher-content">
                            <span className="sidebar-switcher-title">
                                {selectedItem?.name || 'Sélectionner'}
                            </span>
                        </div>

                        {/* Icône chevron */}
                        <div className="sidebar-switcher-chevron">
                            <svg
                                className="sidebar-switcher-chevron-icon"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <path d="m7 15 5 5 5-5" />
                                <path d="m7 9 5-5 5 5" />
                            </svg>
                        </div>
                    </>
                )}
            </button>

            {/* Dropdown des options */}
            {isDropdownOpen && (
                <div className={dropdownClasses}>
                    <div className="sidebar-switcher-dropdown-content">
                        {items.map((item, index) => (
                            <button
                                key={item.id || index}
                                type="button"
                                className={[
                                    'sidebar-switcher-option',
                                    selectedItem?.id === item.id ? 'sidebar-switcher-option--selected' : ''
                                ].filter(Boolean).join(' ')}
                                onClick={() => handleItemSelection(item)}
                            >
                                {/* Icône de l'item (si disponible) */}
                                {item.icon && (
                                    <div className="sidebar-switcher-option-icon">
                                        <Image
                                            src={item.icon}
                                            alt=""
                                            width={16}
                                            height={16}
                                        />
                                    </div>
                                )}

                                <span className="sidebar-switcher-option-text">
                                    {item.name}
                                </span>

                                {/* Indicateur de sélection */}
                                {selectedItem?.id === item.id && (
                                    <div className="sidebar-switcher-check">
                                        <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                        >
                                            <polyline points="20,6 9,17 4,12" />
                                        </svg>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SidebarSwitcher;