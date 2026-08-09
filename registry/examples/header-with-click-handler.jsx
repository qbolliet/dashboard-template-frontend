'use client';

/**
 * En-tête avec callback de clic sur la navigation
 *
 * `onNavigationItemClick` est un point d'extension : la navigation elle-même
 * reste gérée par `next/link` (Header pose le `href`), ce callback est prévu
 * pour brancher de la logique ANNEXE au clic — analytics, notifications, etc.
 * `resolveNavigationTree` transforme les chemins relatifs du manifeste en
 * chemins absolus, comme dans `header-basic`.
 *
 * @item header
 * @item utils-navigation
 */

// Importation des modules
import { useState } from 'react';
import Header from '@/features/header/components/Header/Header';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import siteConfig from '@config/site.config.json';
import { resolveLocalizedTree } from '@/utils/i18n/resolveLocalized';
import { DEFAULT_LOCALE } from '@/i18n/config';

// Le manifeste porte des libellés traduits (`{ fr, en }`) depuis P5.4 :
// `resolveLocalizedTree` les aplatit en chaînes avant que l'arbre n'atteigne le
// composant. Le site de documentation étant monolingue, il résout dans la langue
// par défaut.
const navigationData = resolveNavigationTree(
    resolveLocalizedTree(siteConfig.navigation.tree, DEFAULT_LOCALE, DEFAULT_LOCALE),
);

const HeaderWithClickHandler = () => {
    const [lastClicked, setLastClicked] = useState(null);

    /**
     * Handle a click on a navigation item.
     *
     * Ici, on se contente d'afficher le dernier élément cliqué pour rendre l'effet
     * visible dans l'exemple. Un usage réel brancherait plutôt des analytics ou des
     * notifications à cet endroit.
     *
     * @param {Object} item - The clicked navigation item.
     */
    const handleNavigationClick = (item) => {
        setLastClicked(item.name);
    };

    return (
        <>
            <Header navigationData={navigationData} onNavigationItemClick={handleNavigationClick} />
            <p>Dernier élément cliqué : {lastClicked ?? '—'}</p>
        </>
    );
};

export default HeaderWithClickHandler;
