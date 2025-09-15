'use client';

import React, { useState, createContext, useContext } from 'react';
import { useNavigation } from '../../../hooks/useNavigation';
import SidebarSwitcher from '../SidebarSwitcher/SidebarSwitcher';
import SidebarMenu from '../SidebarMenu/SidebarMenu';
import './NavigationSideBar.scss';

// Context pour gérer l'état de la sidebar
const SidebarContext = createContext();

export const useSidebar = () => {
    const context = useContext(SidebarContext);
    if (!context) {
        throw new Error('useSidebar doit être utilisé dans un SidebarProvider');
    }
    return context;
};

// Utilitaire pour détecter si des icônes sont présentes dans les données de navigation
const hasIconsInNavigationData = (navigationData) => {
    if (!navigationData || !Array.isArray(navigationData)) {
        return false;
    }

    // Fonction récursive pour parcourir tous les niveaux
    const checkForIcons = (items) => {
        for (const item of items) {
            // Si l'item a une icône, on a trouvé au moins une icône
            if (item.icon) {
                return true;
            }

            // Vérifier récursivement les enfants
            if (item.children && Array.isArray(item.children)) {
                if (checkForIcons(item.children)) {
                    return true;
                }
            }
        }
        return false;
    };

    return checkForIcons(navigationData);
};

/**
 * Main sidebar navigation component.
 * Provides collapsible sidebar with navigation menu and optional switcher.
 *
 * @param {Array} navigationData - Array of navigation items to display
 * @param {Function} onItemClick - Optional callback when a navigation item is clicked
 * @param {boolean} useSwitcher - Whether to display a switcher for first-level navigation
 * @param {boolean} defaultOpen - Whether the sidebar is open by default
 * @param {string} className - Optional additional CSS class for the sidebar
 * @returns {JSX.Element} The rendered navigation sidebar
 */
const NavigationSideBar = ({
    navigationData = [],
    onItemClick,
    useSwitcher = false,
    defaultOpen = true,
    className = ''
}) => {
    // État pour gérer l'ouverture/fermeture de la sidebar
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // Synchroniser l'état avec la prop defaultOpen quand elle change
    React.useEffect(() => {
        setIsOpen(defaultOpen);
    }, [defaultOpen]);

    // Gérer les classes CSS du body pour le décalage du contenu
    React.useEffect(() => {
        const body = document.body;

        // Nettoyer les classes existantes
        body.classList.remove('sidebar-open', 'sidebar-collapsed');

        // Ajouter la classe appropriée
        if (isOpen) {
            body.classList.add('sidebar-open');
        } else {
            body.classList.add('sidebar-collapsed');
        }

        // Nettoyer au démontage
        return () => {
            body.classList.remove('sidebar-open', 'sidebar-collapsed');
        };
    }, [isOpen]);

    // État pour gérer l'item sélectionné dans le switcher
    const [selectedSwitcherItem, setSelectedSwitcherItem] = useState(
        useSwitcher && navigationData.length > 0 ? navigationData[0] : null
    );

    // Hook de navigation existant
    const navigationHook = useNavigation();

    // Détecter si des icônes sont présentes dans les données de navigation
    const hasIcons = React.useMemo(() => {
        if (useSwitcher && selectedSwitcherItem) {
            // Si on utilise le switcher, vérifier les icônes dans l'item sélectionné
            return hasIconsInNavigationData(selectedSwitcherItem.children || []);
        }
        // Sinon, vérifier dans toutes les données de navigation
        return hasIconsInNavigationData(navigationData);
    }, [navigationData, useSwitcher, selectedSwitcherItem]);

    // Toggle de la sidebar
    const toggleSidebar = () => {
        setIsOpen(prev => !prev);
    };

    // Gestion du changement d'item dans le switcher
    const handleSwitcherChange = (item) => {
        setSelectedSwitcherItem(item);
        // Trouver le premier chemin navigable dans la nouvelle branche
        const firstNavigablePath = findFirstNavigablePath(item);
        if (firstNavigablePath && onItemClick) {
            onItemClick({ ...item, path: firstNavigablePath });
        }
    };

    // Fonction pour trouver le premier chemin navigable dans un arbre de navigation
    const findFirstNavigablePath = (item) => {
        if (item.path && item.path !== '#' && item.path !== '/') {
            return item.path;
        }

        if (item.children && item.children.length > 0) {
            for (const child of item.children) {
                const childPath = findFirstNavigablePath(child);
                if (childPath) {
                    return childPath;
                }
            }
        }

        return null;
    };

    // Déterminer quelles données de navigation afficher
    const displayNavigationData = useSwitcher && selectedSwitcherItem
        ? selectedSwitcherItem.children || []
        : navigationData;

    // Classes CSS pour la sidebar
    const sidebarClasses = [
        'navigation-sidebar',
        isOpen ? 'navigation-sidebar--open' : 'navigation-sidebar--collapsed',
        hasIcons ? 'navigation-sidebar--has-icons' : 'navigation-sidebar--no-icons',
        className
    ].filter(Boolean).join(' ');

    // Valeur du contexte de la sidebar
    const sidebarContextValue = {
        isOpen,
        hasIcons,
        toggleSidebar,
        ...navigationHook
    };

    return (
        <SidebarContext.Provider value={sidebarContextValue}>
            <aside className={sidebarClasses} data-sidebar-open={isOpen}>
                {/* Header de la sidebar avec switcher optionnel */}
                <div className="sidebar-header">
                    {useSwitcher && navigationData.length > 0 && (
                        <SidebarSwitcher
                            items={navigationData}
                            selectedItem={selectedSwitcherItem}
                            onSelectionChange={handleSwitcherChange}
                        />
                    )}
                </div>

                {/* Contenu principal de la sidebar */}
                <div className="sidebar-content">
                    <SidebarMenu
                        navigationData={displayNavigationData}
                        onItemClick={onItemClick}
                        level={useSwitcher ? 1 : 0} // Ajuster le niveau si switcher utilisé
                    />
                </div>

                {/* Rail pour le redimensionnement (optionnel) */}
                <div className="sidebar-rail" />
            </aside>
        </SidebarContext.Provider>
    );
};

export default NavigationSideBar;