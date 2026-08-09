'use client';

import React, { useRef, useState, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SearchIcon from '@/components/icons/SearchIcon/SearchIcon';
import ClearIcon from '@/components/icons/ClearIcon/ClearIcon';
import { useSearchIndex } from '../../hooks/useSearchIndex';
import { breadcrumbText, scoreEntry, splitQuery } from '../../utils/searchMatch';
import { mergeLabels } from '@/utils/i18n/mergeLabels';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { interpolate } from '@/utils/i18n/interpolate';
import './SearchBar.scss';

// Seuil de longueur de requête en dessous duquel on n'affiche rien (évite
// une liste de suggestions dès la première lettre tapée).
const MIN_QUERY_LENGTH = 2;
const MAX_SUGGESTIONS = 10;

// Défauts français, surchargeables par la prop `labels`. Constante de MODULE pour que la
// fusion partielle soit possible (cf. src/utils/i18n/mergeLabels.js).
const DEFAULT_LABELS = {
    form: "Rechercher dans l'application",
    placeholder: 'Rechercher... ({shortcut})',
    clear: 'Effacer la recherche',
    suggestions: 'Suggestions de recherche',
    noResults: 'Aucun résultat',
};

// Raccourci affiché par défaut, et celui que rend le SERVEUR. Il doit être le même des
// deux côtés de l'hydratation : le HTML est écrit une fois au build, pour toutes les
// plateformes à la fois.
const FALLBACK_SHORTCUT = 'Ctrl+K';

// Abonnement vide : `useSyncExternalStore` ne sert ici qu'à distinguer serveur et client,
// pas à s'abonner à quoi que ce soit. Même motif que ThemeToggleButton.js.
const emptySubscribe = () => () => {};

/**
 * Names the modifier key of the platform the visitor is on.
 *
 * The shortcut used to be written 'Ctrl+K' verbatim, on macOS included, where the
 * listener actually fires on Command instead.
 *
 * @returns {string} The displayed shortcut, e.g. 'Ctrl+K' or '⌘K'.
 */
const platformShortcut = () => {
    if (typeof navigator === 'undefined') return FALLBACK_SHORTCUT;

    const platform = navigator.userAgentData?.platform ?? navigator.platform ?? '';

    return /mac|iphone|ipad|ipod/i.test(platform) ? '⌘K' : FALLBACK_SHORTCUT;
};

/**
 * Depth of an index entry in the navigation tree.
 *
 * Not a stored field: the depth of a page IS its number of ancestors, and the
 * breadcrumb already carries them. Keeping the index free of derivable data.
 *
 * @param {Object} entry - A search index entry.
 * @returns {number} 0 for a root-level page.
 */
const depthOf = (entry) => entry.breadcrumb?.length ?? 0;

/**
 * Filters and ranks the search index against a query.
 *
 * L'appariement lui-même vit dans `utils/searchMatch.js` (tous les termes, par préfixe
 * de mot, champs pondérés) ; ce qui reste ici est ce qui appartient au composant : les
 * deux seuils d'affichage et l'ordre final.
 *
 * @param {?Array<Object>} entries - The loaded search index, or `null` if not
 *   loaded yet.
 * @param {string} rawQuery - The raw input value.
 * @returns {Array<{entry: Object, score: number, ranges: Object<string, Array<{start: number, end: number}>>}>}
 *   Up to MAX_SUGGESTIONS matches, best first.
 */
const computeSuggestions = (entries, rawQuery) => {
    if (!entries || rawQuery.trim().length < MIN_QUERY_LENGTH) return [];

    const terms = splitQuery(rawQuery);
    if (terms.length === 0) return [];

    const matches = [];
    for (const entry of entries) {
        const match = scoreEntry(entry, terms);
        if (match) matches.push({ entry, ...match });
    }

    // Score décroissant, puis la page la moins profonde d'abord : à mérite égal, un
    // groupe vaut mieux que l'une de ses feuilles, car il y mène. `sort` étant stable,
    // c'est ensuite l'ordre du manifeste — donc celui de la navigation — qui départage.
    matches.sort((a, b) => b.score - a.score || depthOf(a.entry) - depthOf(b.entry));

    return matches.slice(0, MAX_SUGGESTIONS);
};

/**
 * Renders text with its matched fragments wrapped in <mark>.
 *
 * @param {string} text - Full text to render.
 * @param {Array<{start: number, end: number}>} [ranges] - Disjoint bounds, left to
 *   right, as produced by `scoreEntry`. Absent or empty renders the text as-is.
 * @returns {React.ReactNode} The text, with its fragments highlighted.
 */
const renderHighlighted = (text, ranges) => {
    if (!ranges || ranges.length === 0) return text;

    const parts = [];
    let cursor = 0;

    for (const range of ranges) {
        parts.push(text.slice(cursor, range.start));
        parts.push(
            <mark key={range.start} className="search-suggestion__highlight">
                {text.slice(range.start, range.end)}
            </mark>,
        );
        cursor = range.end;
    }
    parts.push(text.slice(cursor));

    return <>{parts}</>;
};

/**
 * Search bar component for the application.
 * Provides a search interface with suggestions and keyboard shortcuts,
 * backed by the static search index built from the site manifest.
 *
 * @param {Object} [props] - Component props.
 * @param {Object} [props.labels] - Wording overrides, merged over the French defaults.
 *   Keys: `form`, `placeholder` (holds a `{shortcut}` placeholder), `clear`,
 *   `suggestions`, `noResults`. Partial objects are fine.
 * @param {string} [props.locale] - Site locale code, selecting which search index to
 *   fetch. Suggestions carry both translated titles and locale-prefixed paths.
 * @returns {JSX.Element} The rendered search bar component
 */
const SearchBar = ({ labels: labelOverrides, locale = DEFAULT_LOCALE }) => {
    const labels = mergeLabels(DEFAULT_LABELS, labelOverrides);
    // États pour gérer la recherche
    const [searchValue, setSearchValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);

    // Références pour la gestion du focus
    const inputRef = useRef(null);
    const formRef = useRef(null);

    const router = useRouter();
    const { index, ensureLoaded } = useSearchIndex(locale);

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

    // Le raccourci dépend de la PLATEFORME, que le rendu statique ne connaît pas : le
    // même HTML est servi à un Mac et à un PC. Résoudre `navigator` directement
    // produirait donc une divergence d'hydratation sur Mac. On rend le raccourci de repli
    // au premier passage, puis le vrai une fois monté — même garde que
    // ThemeToggleButton.js, pour la même raison.
    const shortcut = useSyncExternalStore(
        emptySubscribe,
        platformShortcut,        // snapshot client
        () => FALLBACK_SHORTCUT, // snapshot serveur
    );
    const placeholder = interpolate(labels.placeholder, { shortcut });

    return (
        <div className={`search-container ${isFocused ? 'search-container--focused' : ''}`}>
            {/* Formulaire de recherche */}
            <form
                ref={formRef}
                role="search"
                className="search-form"
                onSubmit={handleSubmit}
                aria-label={labels.form}
            >
                {/* Icône de recherche */}
                <SearchIcon />

                {/* Champ de saisie */}
                <input
                    ref={inputRef}
                    type="search"
                    name="search"
                    className="search-input"
                    placeholder={placeholder}
                    /* Nom accessible propre au combobox, en plus du placeholder : celui-ci
                       DISPARAÎT dès la première frappe, laissant le champ sans nom au moment
                       précis où les suggestions s'ouvrent. Même libellé que le point de
                       repère `role="search"` qui l'entoure : l'un est annoncé en navigation
                       par régions, l'autre à la prise de focus. */
                    aria-label={labels.form}
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
                        aria-label={labels.clear}
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
                    aria-label={labels.suggestions}
                >
                    {suggestions.map((suggestion, position) => {
                        // Fil d'Ariane de la page, dans la MÊME forme que celle sur
                        // laquelle les intervalles de surlignage ont été calculés.
                        const trail = breadcrumbText(suggestion.entry);

                        return (
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
                                    {/* Ligne de tête : titre, puis fil d'Ariane en retrait. Le
                                        second désambiguïse le premier — trois pages « PIB »
                                        dans trois groupes différents sont sinon
                                        indistinguables — et il porte ses propres
                                        correspondances, puisque la requête peut n'avoir touché
                                        que lui. */}
                                    <span className="search-suggestion__heading">
                                        <span className="search-suggestion__title">
                                            {renderHighlighted(suggestion.entry.title, suggestion.ranges.title)}
                                        </span>

                                        {trail && (
                                            <span className="search-suggestion__breadcrumb">
                                                {renderHighlighted(trail, suggestion.ranges.breadcrumb)}
                                            </span>
                                        )}
                                    </span>

                                    {/* Description, affichée quand elle existe */}
                                    {suggestion.entry.description && (
                                        <span className="search-suggestion__description">
                                            {renderHighlighted(
                                                suggestion.entry.description,
                                                suggestion.ranges.description,
                                            )}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default SearchBar;
