/**
 * Recursively checks whether at least one item in a navigation tree defines an icon.
 *
 * @param {Array} navigationData - Array of navigation items (each may have an `icon` and/or `children`).
 * @returns {boolean} True if any item, at any depth, has a truthy `icon` field.
 */
export const hasIconsInNavigationData = (navigationData) => {
    if (!navigationData || !Array.isArray(navigationData)) {
        return false;
    }

    // Fonction récursive pour parcourir tous les niveaux de l'arbre de navigation
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

export default hasIconsInNavigationData;
