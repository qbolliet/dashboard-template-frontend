'use client';

import { useTheme as useThemeContext } from '../providers/ThemeProvider';

/**
 * Hook personnalisé pour accéder au contexte de thème
 * Réexporte le hook du provider pour une utilisation plus propre
 * 
 * @returns {Object} Contexte du thème avec toutes les fonctions et états
 */
export const useTheme = () => {
    return useThemeContext();
};

export default useTheme;