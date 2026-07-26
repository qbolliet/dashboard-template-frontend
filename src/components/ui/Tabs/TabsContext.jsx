'use client';

// Importation des modules
import { createContext, useContext } from 'react';

// Contexte unique du système d'onglets. La valeur est fournie par <Tabs> et vaut :
// { value, setValue, shared, variant, size, align, fitted, keepMounted, baseId }
// - value / setValue : onglet actif et son setter (contrôlé ou non côté <Tabs>) ;
// - shared           : contexte partagé arbitraire, lisible par tous les descendants ;
// - variant/size/align/fitted : apparence de la piste, lue par <TabList> ;
// - keepMounted      : lu par <TabPanel> pour garder les panneaux inactifs montés ;
// - baseId           : préfixe des ids ARIA ({baseId}-tab-{value} / -panel-{value}).
// Valeur par défaut `null` : les hooks doivent donc tolérer l'absence de <Tabs>.
const TabsCtx = createContext(null);

/**
 * Access the full tabs context (active value, setter, shared data and layout options).
 *
 * @returns {?{value: string, setValue: Function, shared: *, variant: string, size: string,
 *   align: string, fitted: boolean, keepMounted: boolean, baseId: string}} The context
 *   value, or null when called outside of a `<Tabs>` tree.
 */
const useTabs = () => useContext(TabsCtx);

/**
 * Read only the data shared through the `shared` prop of `<Tabs>`.
 *
 * Convenience hook for descendants that just need the shared payload (e.g. a chart tab
 * and a table tab reading the same dataset) without touching the rest of the context.
 *
 * @returns {*} The shared value, or undefined when called outside of a `<Tabs>` tree.
 */
const useTabsShared = () => {
    const ctx = useContext(TabsCtx);

    // Hors <Tabs> : undefined plutôt qu'une erreur, le hook reste utilisable dans un
    // composant qui peut être monté avec ou sans onglets.
    return ctx ? ctx.shared : undefined;
};

export { TabsCtx, useTabs, useTabsShared };
