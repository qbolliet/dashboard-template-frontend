'use client';

import React, { useState, useRef, useEffect } from 'react';
import SearchIcon from '../../../shared/icons/SearchIcon/SearchIcon';
import ClearIcon from '../../../shared/icons/ClearIcon/ClearIcon';
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
                <SearchIcon />

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
                        <ClearIcon />
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
                                <SearchIcon width="14" height="14" />
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