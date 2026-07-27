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
// Valeur par défaut `null` : deux familles de hooks en découlent.
// - Hooks publics (useTabs, useTabsShared) : tolérants, renvoient null/undefined hors
//   arbre <Tabs> — destinés au code applicatif qui peut légitimement vivre sans onglets.
// - Hook interne (useTabsContext) : strict, réservé aux sous-composants du groupe
//   (Tab, TabList, TabPanel) qui n'ont aucun sens hors d'un <Tabs> et doivent échouer
//   bruyamment plutôt que planter sur un accès à une propriété de `null`.
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

/**
 * Read the tabs context, failing loudly when called outside of a `<Tabs>` tree.
 *
 * Reserved for the internal sub-components of the group (`Tab`, `TabList`, `TabPanel`):
 * unlike `useTabs`, it never returns `null`, so callers can dereference the context
 * directly without a guard.
 *
 * @param {string} componentName - Name of the calling component, used in the error
 *   message (e.g. `'Tab'`, `'TabList'`, `'TabPanel'`).
 * @returns {{value: string, setValue: Function, shared: *, variant: string, size: string,
 *   align: string, fitted: boolean, keepMounted: boolean, baseId: string}} The context value.
 * @throws {Error} If called outside of a `<Tabs>` tree.
 */
const useTabsContext = (componentName) => {
    const ctx = useContext(TabsCtx);

    if (!ctx) {
        throw new Error(`<${componentName}> must be rendered inside a <Tabs>.`);
    }

    return ctx;
};

export { TabsCtx, useTabs, useTabsShared, useTabsContext };
