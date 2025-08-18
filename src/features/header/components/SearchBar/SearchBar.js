'use client';

import React, { useState, useRef, useEffect } from 'react';
import './Searchbar.scss';

/**
 * Search bar component for the application.
 * Provides a search interface with suggestions and keyboard shortcuts.
 * 
 * @returns {JSX.Element} The rendered search bar component
 */
const SearchBar = () => {
    // États pour gérer la recherche
    const [searchValue, setSearchValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
    
    // Références pour la gestion du focus
    const inputRef = useRef(null);
    const formRef = useRef(null);

    /**
     * Handle changes in the search input field.
     * 
     * @param {Event} e - The change event
     */
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchValue(value);
        
        // Simuler des suggestions (à remplacer par une vraie API de recherche)
        if (value.trim().length > 1) {
            const mockSuggestions = [
                'Dashboard Analytics',
                'Indicateurs de performance', 
                'Rapports mensuel',
                'Données utilisateurs',
                'Graphiques interactifs'
            ].filter(item => 
                item.toLowerCase().includes(value.toLowerCase())
            );
            setSuggestions(mockSuggestions);
        } else {
            setSuggestions([]);
        }
        
        // Réinitialiser l'index de sélection
        setSelectedSuggestionIndex(-1);
    };

    /**
     * Handle search form submission.
     * 
     * @param {Event} e - The submission event
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (searchValue.trim()) {
            // Logique de recherche à implémenter
            console.log('Recherche pour:', searchValue);
            
            // Optionnel : rediriger vers une page de résultats
            // window.location.href = `/search?q=${encodeURIComponent(searchValue)}`;
            
            // Fermer les suggestions
            setSuggestions([]);
            setIsFocused(false);
            
            // Perdre le focus du champ
            inputRef.current?.blur();
        }
    };

    /**
     * Handle keyboard navigation in suggestions.
     * 
     * @param {KeyboardEvent} e - The keyboard event
     */
    const handleKeyDown = (e) => {
        if (suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => 
                    prev < suggestions.length - 1 ? prev + 1 : 0
                );
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                setSelectedSuggestionIndex(prev => 
                    prev > 0 ? prev - 1 : suggestions.length - 1
                );
                break;
                
            case 'Enter':
                if (selectedSuggestionIndex >= 0) {
                    e.preventDefault();
                    handleSuggestionClick(suggestions[selectedSuggestionIndex]);
                }
                break;
                
            case 'Escape':
                setSuggestions([]);
                setSelectedSuggestionIndex(-1);
                setIsFocused(false);
                inputRef.current?.blur();
                break;
        }
    };

    /**
     * Handle click on a suggestion.
     * 
     * @param {string} suggestion - The selected suggestion
     */
    const handleSuggestionClick = (suggestion) => {
        setSearchValue(suggestion);
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        
        // Exécuter la recherche automatiquement
        console.log('Recherche pour:', suggestion);
        
        // Fermer le focus
        setIsFocused(false);
        inputRef.current?.blur();
    };

    /**
     * Handle search field focus.
     */
    const handleFocus = () => {
        setIsFocused(true);
    };

    /**
     * Handle search field blur (with delay to allow suggestion clicks).
     */
    const handleBlur = () => {
        // Délai pour permettre aux clics sur suggestions de s'exécuter
        setTimeout(() => {
            setIsFocused(false);
            setSuggestions([]);
            setSelectedSuggestionIndex(-1);
        }, 150);
    };

    /**
     * Clear the search field.
     */
    const handleClear = () => {
        setSearchValue('');
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        inputRef.current?.focus();
    };

    // Effet pour gérer le raccourci clavier Ctrl+K (ou Cmd+K sur Mac)
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                inputRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => document.removeEventListener('keydown', handleGlobalKeyDown);
    }, []);

    return (
        <div className={`search-container ${isFocused ? 'search-container--focused' : ''}`}>
            {/* Formulaire de recherche */}
            <form 
                ref={formRef}
                role="search" 
                className="search-form"
                onSubmit={handleSubmit}
                aria-label="Rechercher dans l'application"
            >
                {/* Icône de recherche */}
                <div className="search-icon" aria-hidden="true">
                    <svg 
                        width="16" 
                        height="16" 
                        viewBox="0 0 16 16" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M6.5 12C9.53757 12 12 9.53757 12 6.5C12 3.46243 9.53757 1 6.5 1C3.46243 1 1 3.46243 1 6.5C1 9.53757 3.46243 12 6.5 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M15 15L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                </div>

                {/* Champ de saisie */}
                <input
                    ref={inputRef}
                    type="search"
                    name="search"
                    className="search-input"
                    placeholder="Rechercher... (Ctrl+K)"
                    value={searchValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    //aria-expanded={suggestions.length > 0}
                    aria-haspopup="listbox"
                    aria-owns={suggestions.length > 0 ? "search-suggestions" : undefined}
                />

                {/* Bouton d'effacement */}
                {searchValue && (
                    <button
                        type="button"
                        className="search-clear"
                        onClick={handleClear}
                        aria-label="Effacer la recherche"
                    >
                        <svg 
                            width="14" 
                            height="14" 
                            viewBox="0 0 14 14" 
                            fill="none" 
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M10.5 3.5L3.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M3.5 3.5L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                )}
            </form>

            {/* Liste des suggestions */}
            {suggestions.length > 0 && isFocused && (
                <div 
                    id="search-suggestions"
                    className="search-suggestions"
                    role="listbox"
                    aria-label="Suggestions de recherche"
                >
                    {suggestions.map((suggestion, index) => (
                        <div
                            key={index}
                            className={`search-suggestion ${
                                index === selectedSuggestionIndex ? 'search-suggestion--selected' : ''
                            }`}
                            role="option"
                            aria-selected={index === selectedSuggestionIndex}
                            onClick={() => handleSuggestionClick(suggestion)}
                            onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        >
                            {/* Icône de suggestion */}
                            <div className="search-suggestion__icon">
                                <svg 
                                    width="14" 
                                    height="14" 
                                    viewBox="0 0 16 16" 
                                    fill="none" 
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M6.5 12C9.53757 12 12 9.53757 12 6.5C12 3.46243 9.53757 1 6.5 1C3.46243 1 1 3.46243 1 6.5C1 9.53757 3.46243 12 6.5 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M15 15L10.5 10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            </div>
                            
                            {/* Texte de la suggestion */}
                            <span className="search-suggestion__text">
                                {suggestion}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBar;