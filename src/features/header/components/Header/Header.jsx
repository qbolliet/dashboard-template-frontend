'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
// Classes de rôle partagées de navigation — importées AVANT les composants nav
// (topbar/sidebar) pour garantir l'ordre de cascade : rôles communs avant spécifiques.
import '../../nav-base.scss';
import TopbarContainer from '../NavigationTopBar/TopbarContainer/TopbarContainer';
import { NavigationSideBar } from '../NavigationSideBar';
import { NavTrigger } from '../NavTrigger';
import SearchBar from '../SearchBar/SearchBar';
import ThemeToggleButton from '@/features/theme/components/ThemeToggleButton/ThemeToggleButton';
import { SkipLink } from '@/components/common';
import NavigationProvider from '../../providers/NavigationProvider';
import { hasIconsInNavigationData } from '../../utils/hasIconsInNavigationData';
import { withBasePath } from '@/utils/url/withBasePath';
import { mergeLabels } from '@/utils/i18n/mergeLabels';
import './Header.scss';

// =================================================================
// LIBELLÉS — défauts français, surchargeables par la prop `labels`
// =================================================================
// Un objet par unité de navigation, aux clés IDENTIQUES à celles des espaces de noms du
// dictionnaire (src/i18n/dictionaries/fr.js). C'est cette identité qui permet à un
// layout d'écrire `<Header labels={dictionary} />` sans adaptateur.
//
// Constantes de MODULE et non valeurs par défaut de props : c'est ce qui rend la fusion
// PARTIELLE possible. Un appelant qui ne traduit que le placeholder de recherche garde
// tous les autres libellés en français, au lieu de les perdre — et `mergeLabels` refuse
// en outre toute surcharge vide, de sorte qu'aucun `aria-label` ne peut devenir muet.
//
// Le header ne s'installe pas sans ces défauts : posé dans un projet tiers par
// `npx shadcn add`, il se rend en français, sans dictionnaire, sans provider et sans
// dépendance d'internationalisation.
const DEFAULT_LABELS = {
    header: {
        skipToContent: 'Passer la navigation',
        logoAlt: 'Logo du site',
        toggleSidebar: 'Basculer la navigation latérale',
        pageFallback: 'Page',
    },
    searchBar: {
        form: "Rechercher dans l'application",
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
};

/**
 * Main header component for the application.
 * Supports both topbar and sidebar navigation modes.
 *
 * @param {Object} props - Component props
 * @param {Array} props.navigationData - Navigation items to display, with absolute paths
 *   (the manifest tree resolved by `resolveNavigationTree`)
 * @param {Function} [props.onNavigationItemClick] - Optional callback when a navigation item is clicked
 * @param {string} [props.navigationType='topbar'] - Type of navigation ('topbar' or 'sidebar')
 * @param {boolean} [props.useSwitcher=false] - Whether to use switcher in sidebar mode
 * @param {string} [props.currentPageTitle] - Title of current page (for sidebar breadcrumb)
 * @param {string} [props.siteTitle] - Site name shown in the sidebar brand. Comes from the
 *   manifest; the sidebar used to hardcode it.
 * @param {string} [props.locale] - Site locale code, forwarded to the search bar so it
 *   fetches the index of the right language.
 * @param {React.ReactNode} [props.actions] - Extra controls rendered next to the theme
 *   toggle, in the right-hand container. This is the slot a language switcher goes into;
 *   the header does not depend on one, so the item stays installable on its own.
 * @param {Object} [props.labels] - Wording overrides, merged per namespace over the
 *   French defaults. Namespaces: `header`, `searchBar`, `sidebar`, `sidebarSwitcher`,
 *   `topbar`, `navTrigger`. A partial object is fine — missing keys keep their default,
 *   and an empty or nullish override is ignored rather than blanking a label.
 * @param {string} [props.homeHref='/'] - Destination of the logo link. Defaults to the site
 *   root, which is what a third party installing this item from the registry expects; this
 *   repository mounts its demo application under /demo/<locale> and therefore passes that
 *   value from `src/app/(site)/demo/[locale]/layout.jsx`. Not to be confused with the
 *   deployment base path, which `next/link` adds on top of this value by itself.
 * @returns {JSX.Element} The rendered header component
 */
const Header = ({
    navigationData = [],
    onNavigationItemClick,
    navigationType = 'topbar',
    useSwitcher = false,
    currentPageTitle,
    siteTitle,
    locale,
    actions,
    labels: labelOverrides,
    homeHref = '/'
}) => {
    // État pour la sidebar (si mode sidebar)
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Chemin courant, utilisé uniquement pour dériver le titre de la page (breadcrumb).
    const pathname = usePathname();

    // Fusion par espace de noms. Une fusion à plat écraserait un espace de noms entier
    // dès qu'une seule de ses clés serait traduite — d'où la boucle plutôt qu'un simple
    // étalement. Pas de useMemo : le React Compiler s'en charge, et l'objet ne sert
    // aucune identité stable.
    const labels = Object.fromEntries(
        Object.entries(DEFAULT_LABELS).map(([namespace, defaults]) => [
            namespace,
            mergeLabels(defaults, labelOverrides?.[namespace]),
        ]),
    );

    // Fonction pour générer le titre de la page courante
    const getCurrentPageTitle = () => {
        if (currentPageTitle) {
            return currentPageTitle;
        }

        // Essayer de trouver le titre basé sur le chemin actuel
        const findTitleInNavigation = (items, currentPath) => {
            for (const item of items) {
                if (item.path === currentPath) {
                    return item.name;
                }
                if (item.children) {
                    const childTitle = findTitleInNavigation(item.children, currentPath);
                    if (childTitle) {
                        return childTitle;
                    }
                }
            }
            return null;
        };

        return findTitleInNavigation(navigationData, pathname) || labels.header.pageFallback;
    };

    // Toggle de la sidebar
    const handleSidebarToggle = () => {
        setSidebarOpen(prev => !prev);
    };

    const isSidebarMode = navigationType === 'sidebar';

    // Détecter si des icônes sont présentes dans les données de navigation.
    const hasIcons = hasIconsInNavigationData(navigationData);

    // Calculer les classes CSS pour le header selon l'état de la sidebar
    const getHeaderClasses = () => {
        const classes = ['primary-header'];
        if (isSidebarMode) {
            classes.push('primary-header--sidebar-mode');
            if (sidebarOpen) {
                classes.push('primary-header--sidebar-open');
            } else {
                classes.push('primary-header--sidebar-collapsed');
                if (!hasIcons) {
                    classes.push('primary-header--sidebar-no-icons');
                }
            }
        }
        return classes.join(' ');
    };

    return (
        // Provider unique de navigation : héberge l'instance partagée (un seul listener
        // resize, un seul état de menu mobile) consommée par la topbar et la sidebar, et
        // distribue les libellés fusionnés à toute la profondeur de l'arbre de navigation.
        <NavigationProvider labels={labels}>
            {/* Skip link pour l'accessibilité */}
            <SkipLink href="#main-content">
                {labels.header.skipToContent}
            </SkipLink>

            {/* Sidebar de navigation intégrée.
                Pas de `key` liée à sidebarOpen : la sidebar se synchronise déjà sur son prop
                `defaultOpen` (adjust state during render) et doit survivre au toggle (largeur
                redimensionnée, groupes dépliés, focus). */}
            {isSidebarMode && (
                <NavigationSideBar
                    navigationData={navigationData}
                    onItemClick={onNavigationItemClick}
                    useSwitcher={useSwitcher}
                    defaultOpen={sidebarOpen}
                    siteTitle={siteTitle}
                />
            )}
            {/* Header principal */}
            <header className={getHeaderClasses()}>
                {/* Conteneur de gauche : Sidebar/Logo + Trigger/Navigation + Breadcrumb */}
                <div className="left-container">
                    {isSidebarMode ? (
                        <>
                            {/* Trigger pour ouvrir/fermer la sidebar (composant partagé) */}
                            <NavTrigger
                                isOpen={sidebarOpen}
                                onToggle={handleSidebarToggle}
                                className="sidebar-trigger"
                                ariaLabel={labels.header.toggleSidebar}
                                labels={labels.navTrigger}
                            />

                            {/* Titre de la page courante (breadcrumb) */}
                            <div className="current-page-title">
                                <span>{getCurrentPageTitle()}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Logo de l'application */}
                            <Link href={homeHref} className="logo-link">
                                <Image src={withBasePath('/logo.svg')} alt={labels.header.logoAlt} className="logo" width={40} height={40} />
                            </Link>

                            {/* Navigation principale */}
                            <TopbarContainer
                                navigationData={navigationData}
                                onItemClick={onNavigationItemClick}
                            />
                        </>
                    )}
                </div>

                {/* Conteneur de droite : Barre de recherche + Toggle thème + extras */}
                <div className="right-container">
                    {/* Barre de recherche */}
                    <SearchBar labels={labels.searchBar} locale={locale} />

                    {/* Bouton de basculement entre thème clair/sombre */}
                    <ThemeToggleButton labels={labelOverrides?.theme} />

                    {/* Emplacement d'extension : le sélecteur de langue de l'application
                        s'y insère. Une prop et non un import : <Header> est publié par le
                        registry, y câbler le LocaleProvider du dépôt y traînerait toute
                        l'infrastructure d'internationalisation. */}
                    {actions}
                </div>
            </header>
        </NavigationProvider>
    );
};

export default Header;
