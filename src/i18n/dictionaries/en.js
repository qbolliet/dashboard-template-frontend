// =================================================================
// ENGLISH DICTIONARY
// =================================================================
// Mirror of src/i18n/dictionaries/fr.js, which is the reference. `npm run check:i18n`
// compares the two key sets and reports what is missing or extra here — do not rely on
// reading both files side by side.
//
// Two things this file deliberately does NOT mirror:
//
//   • French typography. The reference puts a narrow no-break space before a colon and
//     uses « » quotation marks; English uses neither. That is exactly why those
//     characters live in the dictionaries rather than in the JSX.
//   • Plural categories. French treats zero as singular, English does not. Each
//     language declares the CLDR categories it needs — see utils/i18n/pluralize.js.
//
// Placeholders, on the other hand, MUST match: dropping `{column}` from a template
// renders a label with a hole in its meaning, and check-i18n fails on it.

const en = {
    // -------------------------------------------------------------
    // Header and navigation
    // -------------------------------------------------------------
    header: {
        skipToContent: 'Skip navigation',
        logoAlt: 'Site logo',
        toggleSidebar: 'Toggle sidebar navigation',
        pageFallback: 'Page',
    },

    searchBar: {
        form: 'Search the application',
        placeholder: 'Search... ({shortcut})',
        clear: 'Clear search',
        suggestions: 'Search suggestions',
        noResults: 'No results',
    },

    sidebar: {
        panel: 'Sidebar navigation',
        menu: 'Main sidebar navigation',
        logoAlt: 'Site logo',
        resize: 'Resize the sidebar',
        opened: 'Sidebar navigation opened',
        closed: 'Sidebar navigation closed',
        expandGroup: 'Expand group',
        collapseGroup: 'Collapse group',
        expandIcon: 'Expand',
        collapseIcon: 'Collapse',
    },

    sidebarSwitcher: {
        trigger: 'Navigation switcher: {selection}',
        placeholder: 'Select',
        emptySelection: 'Nothing selected',
        selected: '{name} selected',
        logoAlt: 'Logo',
    },

    topbar: {
        nav: 'Navigation menu',
        resize: 'Resize the menu',
        openSubmenu: 'Open the {name} submenu',
        closeSubmenu: 'Close the {name} submenu',
        expandGroup: 'Expand the {name} group',
        collapseGroup: 'Collapse the {name} group',
        openDropdown: 'Open the dropdown menu',
        closeDropdown: 'Close the dropdown menu',
        expandMenu: 'Expand the menu',
        collapseMenu: 'Collapse the menu',
    },

    navTrigger: {
        label: 'Navigation menu',
        open: 'Open the menu',
        close: 'Close the menu',
    },

    // -------------------------------------------------------------
    // Theme and footer
    // -------------------------------------------------------------
    theme: {
        light: 'light',
        dark: 'dark',
        toggle: 'Toggle between light and dark theme',
        switchTo: 'Switch to {next} theme',
        current: 'Change theme. Current theme: {current}. Activate the {next} theme.',
    },

    footer: {
        logoAlt: 'Site logo',
    },

    localeSwitcher: {
        label: 'Language',
        // Le trou {language} est celui de la référence française : `check:i18n` compare
        // les gabarits d'une traduction à l'autre et échoue en --strict dès que l'un
        // disparaît, la phrase mutilée ne se voyant sur aucune capture d'écran.
        button: 'Change language — {language}',
        list: 'Available languages',
        names: { fr: 'Français', en: 'English' },
    },

    // -------------------------------------------------------------
    // Page templates
    // -------------------------------------------------------------
    pages: {
        loading: 'Loading data…',
        error: 'Data unavailable: {message}',
        subPagesOf: 'Sub-pages of {name}',
        observations: 'Observations',
        observationsNote: 'Rows returned by the query',
        observationsFilteredNote: 'After filtering, out of {total} in total',
        period: 'Period covered',
        amplitude: 'Observed range',
        rangeSeparator: ' → ',
        aboutSources: 'Data sources',
        aboutProse:
            'The pages of this site are generated from the {manifest} manifest: every '
            + 'navigation entry declares its path, its label and its page type. The data '
            + 'shown comes from the GraphQL API configured by {envVar}; without one, the '
            + 'template serves local demonstration datasets.',
    },

    notFound: {
        title: 'Page not found',
        description: 'The requested page does not exist or has been moved.',
        backHome: 'Back to the demo home page',
    },

    // -------------------------------------------------------------
    // Table
    // -------------------------------------------------------------
    table: {
        actions: 'Table actions',
        resetCaption: 'RESET',
        reset: 'Reset',
        resetTitle: 'Reset filters, sorting and removed columns',
        exportCsv: 'Export as .csv (filters + sorting applied)',
        exportParquet: 'Export as .parquet (filters + sorting applied)',
        copyFetch: 'Copy the fetch request (JavaScript)',
        copyPython: 'Copy the Python request (requests)',
        copyCurl: 'Copy the cURL command',
        filtersLabel: 'Filters',
        removeFilter: 'Remove the {label} filter',
        removeSort: 'Remove sorting',
        hiddenColumn: 'hidden column',
        restore: 'Restore',
        restoreColumn: 'Restore the {label} column',
        filterValues: 'Filter values…',
        clearSearch: 'Clear search',
        selectAll: 'All',
        selectNone: 'None',
        noValue: 'No value',
        emptyRows: 'No row matches the filters.',
        loadError: 'Loading error',
        sortBy: 'Sort by {label}',
        sortAsc: '{label} — ascending · click for descending',
        sortDesc: '{label} — descending · click to clear',
        clearAll: 'Clear all',
        removeColumn: 'Remove the “{label}” column',
        removeColumnAria: 'Remove the {label} column',
        filterColumn: 'Filter {label}',
        filterByValues: 'Filter by values',
        copied: '{lang} · copied',
        rowCount: { one: '{count} row', other: '{count} rows' },
        columnCount: { one: '{count} column', other: '{count} columns' },
    },

    // -------------------------------------------------------------
    // Filters — feature and primitives
    // -------------------------------------------------------------
    filter: {
        variable: 'Variable',
        variableHint: 'Variable — field to filter on',
        variablePlaceholder: 'Select a variable…',
        operation: 'Operation',
        operationHint: 'Operation — comparator applied',
        operationPlaceholder: 'Operation…',
        value: 'Value',
        valueHint: 'Value — value(s) compared',
        valuesPlaceholder: 'Select values…',
        valuePlaceholder: 'Select a value…',
        addCriterion: 'Add a criterion',
        removeCriterion: 'Remove the criterion',
        openBracket: 'Opening bracket',
        closeBracket: 'Closing bracket',
        and: 'AND',
        or: 'OR',
    },

    selectMenu: {
        placeholder: 'Select…',
        selectAll: 'Select all',
        remove: 'Remove {value}',
        filterField: 'Filter {field}',
        filterOptions: 'Filter the options',
        openList: 'Open the list',
        closeList: 'Close the list',
        noResults: 'No results',
    },

    typeAwareInput: {
        textPlaceholder: 'Free text…',
        datePlaceholder: '{mask}',
        rangePending: ' → …',
        integerRequired: 'Integer required',
        decimalRequired: 'Decimal number required',
        dateFormat: '{mask} format',
        valid: 'Valid',
        validRange: 'Valid range',
        validDate: 'Valid date',
        openCalendar: 'Open the calendar',
        calendar: 'Calendar',
    },

    constraintField: {
        rangeLabel: 'Range',
        minLabel: 'Min',
        maxLabel: 'Max',
        dateLabel: 'Date',
        valueLabel: 'Value',
        boundsLegend: 'Bounds',
        valueLegend: 'Value',
        minValue: 'Minimum value',
        maxValue: 'Maximum value',
        startAfterEnd: 'Start after end',
        mustBeBelowMax: 'Must be ≤ max',
        mustBeAboveMin: 'Must be ≥ min',
    },

    calendar: {
        previousMonth: 'Previous month',
        nextMonth: 'Next month',
        month: 'Month',
        year: 'Year',
    },

    // -------------------------------------------------------------
    // Chart
    // -------------------------------------------------------------
    chart: {
        toolbar: 'Chart tools',
        title: 'Chart',
        value: 'Value',
        projection: 'Projection',
        cursor: 'Cursor',
        voronoiHover: 'Proximity hover (Voronoi)',
        pointTooltip: 'Tooltip on points',
        exportSvg: 'Export as SVG',
        exportPng: 'Export as PNG',
        expand: 'Expand (full width)',
        collapse: 'Collapse',
        expandMinimap: 'Expand the minimap',
        collapseMinimap: 'Collapse the minimap',
        showMinimaps: 'Show the minimaps',
        wheelZoom: 'Wheel zoom',
        before: 'Before',
        after: 'After',
        beforeAfterBar: 'Before / after bar',
        interval: 'Interval',
        confidenceIntervals: 'Confidence intervals',
        normalizeBar: 'Normalisation bar (100)',
    },

    toolbar: {
        resetZoom: 'Reset zoom',
    },

    statCard: {
        summary: '{title}: {value}',
    },

    // -------------------------------------------------------------
    // Globe
    // -------------------------------------------------------------
    globe: {
        label: 'Interactive globe',
        toolbar: 'Globe tools',
        toFlatMap: 'Switch to flat map',
        toGlobe: 'Switch to globe',
        pointsShown: 'Points shown',
        pointsHidden: 'Points hidden',
        flowsShown: 'Flows shown',
        flowsHidden: 'Flows hidden',
        flowsAnimated: 'Flows animated',
        flowsFrozen: 'Flows frozen',
        showFlowsToAnimate: 'Show the flows to animate them',
        noFlowToAnimate: 'No flow to animate',
        rotationOn: 'Rotation enabled',
        rotationOff: 'Rotation frozen',
        wheelZoomOn: 'Wheel zoom enabled',
        wheelZoomOff: 'Wheel zoom disabled',
        showLayersForTooltips: 'Show points or flows to enable tooltips',
        noDataToHover: 'No data to hover',
        tooltipsOn: 'Tooltips enabled',
        tooltipsOff: 'Tooltips disabled',
        flowIntensity: 'Flow intensity',
    },
};

export default en;
