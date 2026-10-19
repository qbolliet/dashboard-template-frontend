// =================================================================
// DICTIONNAIRE FRANÇAIS — langue de référence du template
// =================================================================
// Ce fichier est la référence : `npm run check:i18n` compare tous les autres
// dictionnaires à celui-ci et signale, par langue, les clés manquantes et les clés en
// trop. Une clé ajoutée ici sans traduction ailleurs n'est donc jamais silencieuse.
//
// STRUCTURE — un espace de noms par unité distribuable, et les clés d'un espace de noms
// sont exactement celles de la constante `DEFAULT_LABELS` du composant correspondant.
// Cette correspondance n'est pas une convention de confort : c'est ce qui permet à un
// layout d'écrire `<Header labels={dict.header} />` sans adaptateur, et à check-i18n de
// vérifier les deux côtés l'un contre l'autre.
//
// TROIS FORMES DE VALEUR, et une seule raison de choisir l'une plutôt qu'une autre :
//
//   'Rechercher'                                  chaîne — le cas ordinaire
//   'Trier par {column}'                          gabarit — voir utils/i18n/interpolate.js
//   { one: '{count} ligne', other: '{count} lignes' }
//                                                 accord en nombre — voir utils/i18n/pluralize.js
//
// CE QU'ON N'ÉCRIT PAS ICI :
//   • des FONCTIONS. Le dictionnaire est chargé par un Server Component puis passé en
//     prop à des composants clients ; une fonction ne franchit pas cette frontière.
//     D'où les gabarits.
//   • des NOMBRES ou des DATES mis en forme. Ils dépendent de la locale mais pas de la
//     traduction : ils vivent dans src/i18n/formats.js.
//   • du CONTENU. Les titres de pages, la prose d'accueil et les libellés d'opérateurs
//     sont dans config/ — voir le guide d'internationalisation de la documentation en ligne du template.
//
// TYPOGRAPHIE — les conventions françaises (espace fine avant « : », guillemets « »)
// s'écrivent DANS les libellés d'ici, jamais dans le JSX. C'est ce qui permet à la
// traduction anglaise d'utiliser les siennes sans toucher au composant.

const fr = {
    // -------------------------------------------------------------
    // Header et navigation
    // -------------------------------------------------------------
    header: {
        skipToContent: 'Passer la navigation',
        logoAlt: 'Logo du site',
        toggleSidebar: 'Basculer la navigation latérale',
        // Repli du fil d'Ariane quand aucun nœud ne correspond au chemin courant.
        pageFallback: 'Page',
    },

    searchBar: {
        form: "Rechercher dans l'application",
        // {shortcut} est résolu selon la plateforme (Ctrl sur Windows/Linux, ⌘ sur
        // macOS) : le raccourci était écrit « Ctrl+K » en dur, y compris sur Mac.
        placeholder: 'Rechercher... ({shortcut})',
        clear: 'Effacer la recherche',
        suggestions: 'Suggestions de recherche',
        noResults: 'Aucun résultat',
    },

    sidebar: {
        panel: 'Navigation latérale',
        menu: 'Navigation latérale principale',
        logoAlt: 'Logo du site',
        resize: 'Redimensionner la barre latérale',
        opened: 'Navigation latérale ouverte',
        closed: 'Navigation latérale fermée',
        expandGroup: 'Ouvrir le groupe',
        collapseGroup: 'Fermer le groupe',
        expandIcon: 'Ouvrir',
        collapseIcon: 'Fermer',
    },

    sidebarSwitcher: {
        // Espace fine insécable avant le deux-points : convention française, absente en
        // anglais — d'où sa place dans le libellé et non dans le JSX.
        trigger: 'Sélecteur de navigation : {selection}',
        placeholder: 'Sélectionner',
        emptySelection: 'Aucune sélection',
        selected: '{name} sélectionné',
        logoAlt: 'Logo',
    },

    topbar: {
        nav: 'Menu de navigation',
        resize: 'Redimensionner le menu',
        openSubmenu: 'Ouvrir le sous-menu de {name}',
        closeSubmenu: 'Fermer le sous-menu de {name}',
        expandGroup: 'Développer le groupe {name}',
        collapseGroup: 'Réduire le groupe {name}',
        openDropdown: 'Ouvrir le menu déroulant',
        closeDropdown: 'Fermer le menu déroulant',
        expandMenu: 'Développer le menu',
        collapseMenu: 'Réduire le menu',
    },

    navTrigger: {
        label: 'Menu de navigation',
        open: 'Ouvrir le menu',
        close: 'Fermer le menu',
    },

    // -------------------------------------------------------------
    // Thème et pied de page
    // -------------------------------------------------------------
    theme: {
        // Avant ce lot, ce bouton exposait un aria-label ANGLAIS et un texte sr-only
        // FRANÇAIS : un lecteur d'écran lisait les deux langues à la suite.
        light: 'clair',
        dark: 'sombre',
        toggle: 'Basculer entre thème clair et sombre',
        switchTo: 'Passer au thème {next}',
        current: 'Changer de thème. Thème actuel : {current}. Activer le thème {next}.',
    },

    footer: {
        logoAlt: 'Logo du site',
    },

    localeSwitcher: {
        label: 'Langue',
        // Nom accessible du déclencheur : le bouton n'affiche qu'un drapeau et un code
        // pays, donc rien qui nomme la fonction du contrôle. Le trou {language} y ajoute
        // la langue courante, seule façon pour un lecteur d'écran d'apprendre l'état
        // sans ouvrir le menu.
        button: 'Changer de langue — {language}',
        list: 'Langues disponibles',
        // Noms des langues dans LEUR PROPRE langue : un lecteur qui cherche l'anglais
        // cherche « English », pas « Anglais ». Convention universelle des sélecteurs.
        names: { fr: 'Français', en: 'English' },
    },

    // -------------------------------------------------------------
    // Gabarits de pages
    // -------------------------------------------------------------
    pages: {
        loading: 'Chargement des données…',
        error: 'Données indisponibles : {message}',
        subPagesOf: 'Sous-pages de {name}',
        observations: 'Observations',
        observationsNote: 'Lignes renvoyées par la requête',
        observationsFilteredNote: 'Après filtre, sur {total} au total',
        period: 'Période couverte',
        amplitude: 'Amplitude observée',
        rangeSeparator: ' → ',
        aboutSources: 'Sources des données',
        // Les trous portent ici des <code>, pas du texte : voir
        // src/utils/i18n/interpolateNodes.jsx. La phrase entière est dans le
        // dictionnaire pour que sa traduction puisse replacer les trous où sa syntaxe
        // l'exige, ce qu'un découpage en JSX interdirait.
        aboutProse:
            'Les pages de ce site sont générées à partir du manifeste {manifest} : '
            + 'chaque entrée de la navigation y déclare son chemin, son libellé et son '
            + 'type de page. Les données affichées proviennent de l’API GraphQL '
            + 'configurée par {envVar} ; en son absence, le template sert des jeux de '
            + 'démonstration locaux.',
    },

    notFound: {
        title: 'Page introuvable',
        description: "La page demandée n'existe pas ou a été déplacée.",
        backHome: "Retour à l'accueil de la démonstration",
        // Nom accessible de la liste de liens de la 404 racine, rendue hors de [locale].
        entryPoints: "Points d'entrée du site",
    },

    // -------------------------------------------------------------
    // Tableau
    // -------------------------------------------------------------
    table: {
        actions: 'Actions du tableau',
        resetCaption: 'RESET',
        reset: 'Réinitialiser',
        resetTitle: 'Réinitialiser filtres, tri et colonnes supprimées',
        exportCsv: 'Exporter en .csv (filtres + tri appliqués)',
        exportParquet: 'Exporter en .parquet (filtres + tri appliqués)',
        copyFetch: 'Copier la requête fetch (JavaScript)',
        copyPython: 'Copier la requête Python (requests)',
        copyCurl: 'Copier la commande cURL',
        copyExport: 'Copier la commande d’export complet (.parquet, cURL)',
        filtersLabel: 'Filtres',
        removeFilter: 'Retirer le filtre {label}',
        removeSort: 'Retirer le tri',
        hiddenColumn: 'colonne masquée',
        restore: 'Restaurer',
        restoreColumn: 'Restaurer la colonne {label}',
        filterValues: 'Filtrer les valeurs…',
        clearSearch: 'Effacer la recherche',
        selectAll: 'Tout',
        selectNone: 'Aucun',
        noValue: 'Aucune valeur',
        emptyRows: 'Aucune ligne ne correspond aux filtres.',
        loadError: 'Erreur de chargement',
        sortBy: 'Trier par {label}',
        sortAsc: '{label} — croissant · cliquer pour décroissant',
        sortDesc: '{label} — décroissant · cliquer pour désactiver',
        clearAll: 'Tout effacer',
        // Guillemets français : l'anglais utilise les siennes dans sa traduction.
        removeColumn: 'Supprimer la colonne « {label} »',
        removeColumnAria: 'Supprimer la colonne {label}',
        filterColumn: 'Filtrer {label}',
        filterByValues: 'Filtrer par valeurs',
        copied: '{lang} · copié',
        rowCount: { one: '{count} ligne', other: '{count} lignes' },
        columnCount: { one: '{count} colonne', other: '{count} colonnes' },
    },

    // -------------------------------------------------------------
    // Filtres — feature et primitives
    // -------------------------------------------------------------
    filter: {
        variable: 'Variable',
        variableHint: 'Variable — champ à filtrer',
        variablePlaceholder: 'Sélectionner une variable…',
        operation: 'Opération',
        operationHint: 'Opération — comparateur appliqué',
        operationPlaceholder: 'Opération…',
        value: 'Valeur',
        valueHint: 'Valeur — valeur(s) comparée(s)',
        valuesPlaceholder: 'Sélectionner des valeurs…',
        valuePlaceholder: 'Sélectionner une valeur…',
        addCriterion: 'Ajouter un critère',
        removeCriterion: 'Supprimer le critère',
        openBracket: 'Crochet ouvrant',
        closeBracket: 'Crochet fermant',
        // Connecteurs logiques : ils étaient codés en dur en ANGLAIS dans une interface
        // française (filterTypes.js). Les voici traduisibles comme le reste.
        and: 'ET',
        or: 'OU',
    },

    selectMenu: {
        placeholder: 'Sélectionner…',
        selectAll: 'Tout sélectionner',
        remove: 'Retirer {value}',
        filterField: 'Filtrer {field}',
        filterOptions: 'Filtrer les options',
        openList: 'Ouvrir la liste',
        closeList: 'Fermer la liste',
        noResults: 'Aucun résultat',
    },

    typeAwareInput: {
        textPlaceholder: 'Texte libre…',
        // {mask} vient de src/i18n/formats.js : la forme de la date n'est pas une
        // traduction, c'est une convention de locale.
        datePlaceholder: '{mask}',
        rangePending: ' → …',
        integerRequired: 'Entier requis',
        decimalRequired: 'Nombre décimal requis',
        dateFormat: 'Format {mask}',
        valid: 'Valide',
        validRange: 'Plage valide',
        validDate: 'Date valide',
        openCalendar: 'Ouvrir le calendrier',
        calendar: 'Calendrier',
    },

    constraintField: {
        rangeLabel: 'Plage',
        minLabel: 'Min',
        maxLabel: 'Max',
        dateLabel: 'Date',
        valueLabel: 'Valeur',
        boundsLegend: 'Bornes',
        valueLegend: 'Valeur',
        minValue: 'Valeur minimale',
        maxValue: 'Valeur maximale',
        startAfterEnd: 'Début après la fin',
        mustBeBelowMax: 'Doit être ≤ max',
        mustBeAboveMin: 'Doit être ≥ min',
    },

    calendar: {
        previousMonth: 'Mois précédent',
        nextMonth: 'Mois suivant',
        month: 'Mois',
        year: 'Année',
    },

    // -------------------------------------------------------------
    // Graphique
    // -------------------------------------------------------------
    chart: {
        toolbar: 'Outils du graphique',
        title: 'Graphique',
        value: 'Valeur',
        projection: 'Projection',
        cursor: 'Curseur',
        voronoiHover: 'Hover proximité (Voronoï)',
        pointTooltip: 'Tooltip sur points',
        exportSvg: 'Exporter en SVG',
        exportPng: 'Exporter en PNG',
        expand: 'Agrandir (pleine largeur)',
        collapse: 'Replier',
        expandMinimap: 'Déplier la mini-vue',
        collapseMinimap: 'Replier la mini-vue',
        showMinimaps: 'Afficher les mini-vues',
        wheelZoom: 'Zoom à la molette',
        before: 'Avant',
        after: 'Après',
        beforeAfterBar: 'Barre avant / après',
        interval: 'Intervalle',
        confidenceIntervals: 'Intervalles de confiance',
        normalizeBar: 'Barre de normalisation (100)',
    },

    toolbar: {
        resetZoom: 'Réinitialiser le zoom',
    },

    statCard: {
        // Espace fine insécable avant le deux-points, comme partout en français.
        summary: '{title} : {value}',
    },

    // -------------------------------------------------------------
    // Globe
    // -------------------------------------------------------------
    globe: {
        label: 'Globe terrestre interactif',
        toolbar: 'Outils du globe',
        toFlatMap: 'Passer en planisphère',
        toGlobe: 'Passer en globe',
        pointsShown: 'Points affichés',
        pointsHidden: 'Points masqués',
        flowsShown: 'Flux affichés',
        flowsHidden: 'Flux masqués',
        flowsAnimated: 'Flux dynamiques',
        flowsFrozen: 'Flux figés',
        showFlowsToAnimate: 'Affichez les flux pour les animer',
        noFlowToAnimate: 'Aucun flux à animer',
        rotationOn: 'Rotation activée',
        rotationOff: 'Rotation figée',
        wheelZoomOn: 'Zoom molette activé',
        wheelZoomOff: 'Zoom molette désactivé',
        showLayersForTooltips: 'Affichez les points ou les flux pour activer les tooltips',
        noDataToHover: 'Aucune donnée à survoler',
        tooltipsOn: 'Tooltips activées',
        tooltipsOff: 'Tooltips désactivées',
        flowIntensity: 'Intensité du flux',
    },
};

export default fr;
