'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import Image from 'next/image';
import { useSidebar } from '../NavigationSideBar/NavigationSideBar';
import { useKeyboardNavigation, useAriaAnnounce } from '@/features/accessibility';
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

    // Hook pour annonces aux lecteurs d'écran
    const announce = useAriaAnnounce();

    // IDs uniques pour les relations ARIA
    // useId garantit des IDs stables entre le rendu SSR et l'hydratation client
    const baseId = useId();
    const triggerId = `switcher-trigger-${baseId}`;
    const listboxId = `switcher-listbox-${baseId}`;

    // Navigation clavier dans le dropdown
    const {
        focusedIndex,
        handleKeyDown: handleKeyboardNav,
        setFocusedIndex,
        resetFocus
    } = useKeyboardNavigation({
        items,
        orientation: 'vertical',
        loop: true,
        getItemText: (item) => item.name || ''
    });

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

    // Toggle du dropdown avec reset du focus
    const toggleDropdown = () => {
        setIsDropdownOpen(prev => {
            if (prev) {
                // Si on ferme, reset du focus
                resetFocus();
            }
            return !prev;
        });
    };

    // Gestion de la sélection d'un item avec annonce
    const handleItemSelection = (item) => {
        setIsDropdownOpen(false);
        resetFocus();

        // Annoncer le changement de sélection aux lecteurs d'écran
        if (item?.name) {
            announce(`${item.name} sélectionné`, 'polite');
        }

        if (onSelectionChange) {
            onSelectionChange(item);
        }
    };

    // Gestion des raccourcis clavier (trigger)
    const handleTriggerKeyDown = (event) => {
        if (event.key === 'Escape' && isDropdownOpen) {
            event.preventDefault();
            setIsDropdownOpen(false);
            resetFocus();
        }
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleDropdown();
        }
    };

    // Gestion des raccourcis clavier (dropdown)
    const handleDropdownKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            setIsDropdownOpen(false);
            resetFocus();
            triggerRef.current?.focus();
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (focusedIndex >= 0 && focusedIndex < items.length) {
                handleItemSelection(items[focusedIndex]);
            }
            return;
        }

        // Déléguer les autres touches à la navigation clavier
        handleKeyboardNav(event);
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
                id={triggerId}
                type="button"
                className="sidebar-switcher-trigger"
                onClick={toggleDropdown}
                onKeyDown={handleTriggerKeyDown}
                aria-expanded={isDropdownOpen}
                aria-haspopup="listbox"
                aria-controls={isDropdownOpen ? listboxId : undefined}
                aria-label={`Sélecteur de navigation : ${selectedItem?.name || 'Aucune sélection'}`}
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
                    <ul
                        id={listboxId}
                        role="listbox"
                        aria-labelledby={triggerId}
                        aria-activedescendant={
                            focusedIndex >= 0 && focusedIndex < items.length
                                ? `${listboxId}-option-${focusedIndex}`
                                : undefined
                        }
                        tabIndex={-1}
                        onKeyDown={handleDropdownKeyDown}
                        className="sidebar-switcher-dropdown-content"
                    >
                        {items.map((item, index) => (
                            <li
                                key={item.id || index}
                                id={`${listboxId}-option-${index}`}
                                role="option"
                                aria-selected={selectedItem?.id === item.id}
                                className={[
                                    'sidebar-switcher-option',
                                    selectedItem?.id === item.id ? 'sidebar-switcher-option--selected' : '',
                                    focusedIndex === index ? 'sidebar-switcher-option--focused' : ''
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
                                            aria-hidden="true"
                                        >
                                            <polyline points="20,6 9,17 4,12" />
                                        </svg>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default SidebarSwitcher;