'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SearchIcon from '@/components/icons/SearchIcon/SearchIcon';
import ClearIcon from '@/components/icons/ClearIcon/ClearIcon';
import { useSearchIndex } from '../../hooks/useSearchIndex';
import { findMatch } from '../../utils/searchMatch';
import './SearchBar.scss';

// Seuil de longueur de requête en dessous duquel on n'affiche rien (évite
// une liste de suggestions dès la première lettre tapée).
const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 10;

/**
 * Filters the search index against a query, matching on title first, then
 * description — a title match always outranks a description match.
 *
 * @param {?Array<Object>} entries - The loaded search index, or `null` if not
 *   loaded yet.
 * @param {string} rawQuery - The raw input value.
 * @returns {Array<{entry: Object, field: ('title'|'description'), match: {start: number, end: number}}>}
 *   Up to MAX_SUGGESTIONS matches.
 */
const computeSuggestions = (entries, rawQuery) => {
    const query = rawQuery.trim();
    if (!entries || query.length < MIN_QUERY_LENGTH) return [];

    const titleMatches = [];
    const descriptionMatches = [];

    for (const entry of entries) {
        const titleMatch = findMatch(entry.title, query);
        if (titleMatch) {
            titleMatches.push({ entry, field: 'title', match: titleMatch });
            continue;
        }

        const descriptionMatch = findMatch(entry.description, query);
        if (descriptionMatch) {
            descriptionMatches.push({ entry, field: 'description', match: descriptionMatch });
        }
    }

    return [...titleMatches, ...descriptionMatches].slice(0, MAX_SUGGESTIONS);
};

/**
 * Renders text with its matched fragment wrapped in a <mark>.
 *
 * @param {string} text - Full text to render.
 * @param {?{start: number, end: number}} match - Match bounds, or `null` to
 *   render the text as-is.
 * @returns {React.ReactNode} The text, with the fragment highlighted when matched.
 */
const renderHighlighted = (text, match) => {
    if (!match) return text;

    return (
        <>
            {text.slice(0, match.start)}
            <mark className="search-suggestion__highlight">{text.slice(match.start, match.end)}</mark>
            {text.slice(match.end)}
        </>
    );
};

/**
 * Search bar component for the application.
 * Provides a search interface with suggestions and keyboard shortcuts,
 * backed by the static search index built from the site manifest.
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

    const router = useRouter();
    const { index, ensureLoaded } = useSearchIndex();

    /**
     * Closes the suggestions panel and resets its keyboard selection.
     */
    const closeSuggestions = () => {
        setSuggestions([]);
        setSelectedSuggestionIndex(-1);
        setIsFocused(false);
    };

    /**
     * Handle changes in the search input field.
     *
     * @param {Event} e - The change event
     */
    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchValue(value);
        setSuggestions(computeSuggestions(index, value));
        setSelectedSuggestionIndex(-1);
    };

    /**
     * Navigates to a suggestion and resets the search bar.
     *
     * Used for keyboard activation (Entrée) : contrairement au clic sur le
     * <Link> d'une suggestion, il n'y a ici aucune navigation native à laisser
     * s'exécuter — elle est déclenchée manuellement.
     *
     * @param {Object} [suggestion] - The suggestion to navigate to, if any.
     */
    const handleSuggestionActivate = (suggestion) => {
        if (!suggestion) return;

        closeSuggestions();
        setSearchValue('');
        inputRef.current?.blur();
        router.push(suggestion.entry.path);
    };

    /**
     * Handle search form submission (Entrée sans suggestion surlignée au clavier).
     *
     * @param {Event} e - The submission event
     */
    const handleSubmit = (e) => {
        e.preventDefault();
        if (suggestions.length === 0) return;

        handleSuggestionActivate(suggestions[0]);
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
                    handleSuggestionActivate(suggestions[selectedSuggestionIndex]);
                }
                break;

            case 'Escape':
                closeSuggestions();
                inputRef.current?.blur();
                break;
        }
    };

    /**
     * Handle click on a suggestion link.
     *
     * Le <Link> gère lui-même la navigation (c'est un vrai lien) : ce
     * gestionnaire referme seulement le panneau de suggestions.
     */
    const handleSuggestionClick = () => {
        closeSuggestions();
        setSearchValue('');
    };

    /**
     * Handle search field focus. Déclenche le chargement de l'index de
     * recherche au premier focus (pas au montage du composant).
     */
    const handleFocus = () => {
        setIsFocused(true);
        ensureLoaded();
    };

    /**
     * Handle search field blur (with delay to allow suggestion clicks).
     */
    const handleBlur = () => {
        // Délai pour permettre aux clics sur suggestions de s'exécuter
        setTimeout(() => {
            closeSuggestions();
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

    const isExpanded = suggestions.length > 0 && isFocused;

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
                    role="combobox"
                    aria-expanded={isExpanded}
                    aria-haspopup="listbox"
                    aria-controls={isExpanded ? 'search-suggestions' : undefined}
                    aria-activedescendant={
                        selectedSuggestionIndex >= 0 ? `search-suggestion-${selectedSuggestionIndex}` : undefined
                    }
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
            {isExpanded && (
                <div
                    id="search-suggestions"
                    className="search-suggestions"
                    role="listbox"
                    aria-label="Suggestions de recherche"
                >
                    {suggestions.map((suggestion, position) => (
                        <Link
                            key={suggestion.entry.path}
                            id={`search-suggestion-${position}`}
                            href={suggestion.entry.path}
                            className={`search-suggestion ${
                                position === selectedSuggestionIndex ? 'search-suggestion--selected' : ''
                            }`}
                            role="option"
                            aria-selected={position === selectedSuggestionIndex}
                            onClick={handleSuggestionClick}
                            onMouseEnter={() => setSelectedSuggestionIndex(position)}
                        >
                            {/* Icône de suggestion */}
                            <div className="search-suggestion__icon">
                                <SearchIcon width="14" height="14" />
                            </div>

                            <div className="search-suggestion__content">
                                {/* Titre, surligné si c'est lui qui a matché */}
                                <span className="search-suggestion__title">
                                    {renderHighlighted(
                                        suggestion.entry.title,
                                        suggestion.field === 'title' ? suggestion.match : null,
                                    )}
                                </span>

                                {/* Description, affichée quand elle existe ; surlignée si c'est
                                    elle qui a matché (le titre, lui, n'a pas matché dans ce cas) */}
                                {suggestion.entry.description && (
                                    <span className="search-suggestion__description">
                                        {renderHighlighted(
                                            suggestion.entry.description,
                                            suggestion.field === 'description' ? suggestion.match : null,
                                        )}
                                    </span>
                                )}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
