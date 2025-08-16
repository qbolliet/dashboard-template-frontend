'use client';

import React from 'react';
import './SearchBar.scss';

/**
 * Search bar component for the application.
 * Simple search interface matching the old component design.
 * 
 * @returns {JSX.Element} The rendered search bar component
 */
const SearchBar = () => {
    return (
        <form role="search" className="search">
            <input 
                type="search" 
                name="search" 
                placeholder="Search" 
                className="fs-400" 
            />
            {/* Icône de recherche */}
            <i aria-hidden="true" className="search-icon">
                <img 
                    src="/icons/icon-search.svg" 
                    alt="search icon" 
                    className="icon"
                />
            </i>
        </form>
    );
};

export default SearchBar;