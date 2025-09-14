'use client';

import React from 'react';
import './SidebarTrigger.scss';

/**
 * Trigger button to open/close the sidebar.
 *
 * @param {boolean} isOpen - Whether the sidebar is currently open
 * @param {Function} onToggle - Function to call when the trigger is clicked
 * @param {string} className - Optional additional CSS class
 * @param {string} ariaLabel - Optional ARIA label for accessibility
 * @returns {JSX.Element} The rendered sidebar trigger button
 */
const SidebarTrigger = ({
    isOpen = false,
    onToggle,
    className = '',
    ariaLabel = 'Toggle sidebar'
}) => {
    // Gestion du clic sur le trigger
    const handleClick = () => {
        if (onToggle) {
            onToggle();
        }
    };

    // Gestion des raccourcis clavier
    const handleKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick();
        }
    };

    // Classes CSS pour le trigger
    const triggerClasses = [
        'sidebar-trigger',
        isOpen ? 'sidebar-trigger--open' : 'sidebar-trigger--closed',
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            type="button"
            className={triggerClasses}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            aria-label={ariaLabel}
            aria-expanded={isOpen}
            data-sidebar-trigger
        >
            {/* Icône hamburger animée */}
            <div className="sidebar-trigger-icon">
                <span className="sidebar-trigger-line sidebar-trigger-line--top" />
                <span className="sidebar-trigger-line sidebar-trigger-line--middle" />
                <span className="sidebar-trigger-line sidebar-trigger-line--bottom" />
            </div>
        </button>
    );
};

export default SidebarTrigger;