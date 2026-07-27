'use client';

// Importation des modules
import { useRef } from 'react';
import { useIsomorphicLayoutEffect } from '@/hooks/layoutEffect/useIsomorphicLayoutEffect';
import { useTabsContext } from '../TabsContext';
import './TabList.scss';

// Touches interceptées par la navigation clavier du tablist (motif ARIA « tabs »).
const NAVIGATION_KEYS = ['ArrowRight', 'ArrowLeft', 'Home', 'End'];

/**
 * Tab strip: renders the `role="tablist"` track and handles roving keyboard navigation.
 *
 * Layout options (variant, size, align, fitted) are read from the `<Tabs>` context, so the
 * component only needs its children. To place controls next to the tabs, compose the row at
 * the call site (`<header><TabList/><button/></header>`) rather than through a slot prop.
 *
 * The strip stays keyboard reachable even when no tab matches the active value (a `<Tabs>`
 * without `defaultValue`, a controlled value reset to `null`…): the first enabled tab then
 * falls back to `tabindex="0"` without being selected, so tabbing in still works.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.label] - Accessible name for the tab strip (`aria-label`).
 *   Recommended as soon as several tab groups coexist on a page, otherwise screen
 *   readers announce every one of them as a bare "tab list".
 * @param {React.ReactNode} props.children - The `<Tab>` elements.
 * @param {string} [props.className] - Extra class names.
 * @param {Object} [props.style] - Inline styles.
 * @returns {JSX.Element} The tab strip.
 */
const TabList = ({ label, children, className, style, ...rest }) => {
    const ctx = useTabsContext('TabList');

    // Ref sur la piste : sert à retrouver les onglets réellement rendus (le clavier doit
    // suivre l'ordre du DOM, y compris avec des enfants générés dynamiquement).
    const listRef = useRef(null);

    // Repli du roving tabindex : la piste doit TOUJOURS exposer exactement un onglet à
    // tabindex="0". Chaque <Tab> pose tabIndex={selected ? 0 : -1} (Tab.jsx), donc dès
    // qu'aucun onglet ne correspond à ctx.value (<Tabs> sans defaultValue, valeur mal
    // orthographiée, `value` contrôlée repassée à ''/null, onglet actif retiré d'une liste
    // dynamique) ils tombent tous à -1 : la tabulation saute la barre entière, et comme
    // handleKeyDown est posé sur le <nav> — non focusable — les flèches ne se déclenchent
    // jamais. On désigne donc un onglet de repli, qui ouvre seulement la porte : il reste
    // aria-selected="false" et ctx.setValue n'est pas appelé, donc aucun onChange n'est émis.
    //
    // La sonde est aria-selected, PAS tabindex : le repli impératif reflète lui aussi 0 dans
    // l'attribut, chercher [tabindex="0"] croirait la piste saine et ne nettoierait jamais.
    //
    // useIsomorphicLayoutEffect plutôt que useEffect : l'ajustement précède la peinture, donc
    // aucune frame à deux tabindex="0" (React ne réécrit pas l'ancien repli — sa prop vaut -1
    // avant comme après, pas de diff : c'est la boucle ci-dessous qui le remet à -1).
    //
    // Aucun tableau de dépendances : les enfants sont arbitraires et rien n'en donne de clé
    // fiable. « À chaque rendu de TabList » couvre exactement les deux déclencheurs utiles —
    // ctx.value (consommateur de contexte) et children (rendu du parent).
    useIsomorphicLayoutEffect(() => {
        // Tous les onglets, désactivés COMPRIS : un onglet désactivé ne peut pas servir de
        // repli, mais il doit quand même être remis à -1 s'il traîne un 0 obsolète.
        const tabs = Array.from(listRef.current.querySelectorAll('[role="tab"]'));

        // L'onglet actif gagne toujours ; sinon, repli sur le premier non désactivé.
        // Aucun onglet éligible (piste vide, ou tous désactivés) : `roving` vaut undefined
        // et la boucle remet simplement tout le monde à -1 — rien n'est opérable, la piste
        // n'a donc rien à exposer à la tabulation.
        const roving =
            tabs.find((tab) => tab.getAttribute('aria-selected') === 'true')
            ?? tabs.find((tab) => tab.getAttribute('aria-disabled') !== 'true');

        // Recalcul intégral plutôt que mémorisation du repli précédent : la boucle couvre
        // pose ET nettoyage d'un seul geste, et reste idempotente si elle rejoue à vide.
        tabs.forEach((tab) => {
            const wanted = tab === roving ? 0 : -1;
            if (tab.tabIndex !== wanted) tab.tabIndex = wanted;
        });
    });

    // Navigation clavier parmi les onglets NON désactivés. Fonction simple : elle est
    // passée à onKeyDown (événement React), aucune identité stable n'est requise.
    //
    // Volontairement inline plutôt que délégué à useKeyboardNavigation (features/accessibility) :
    // ce hook expose un index en state React et ne déplace jamais le focus DOM — il est taillé
    // pour un listbox `aria-activedescendant` piloté par un tableau d'items. Le motif ARIA
    // « tabs » exige l'inverse : un roving tabindex sur le focus DOM réel, au-dessus d'enfants
    // composés (<Tab> arbitraires) dont on ne connaît pas la liste. L'utiliser ajouterait une
    // seconde source de vérité à côté de ctx.value sans supprimer la ref ni le .focus().
    const handleKeyDown = (event) => {
        if (!NAVIGATION_KEYS.includes(event.key)) return;

        // Le handler est posé sur le <nav>, il reçoit donc TOUT ce qui remonte de la piste.
        // Or celle-ci est composable : l'appelant peut y glisser autre chose qu'un <Tab>
        // (champ de recherche, lien…). Sans ce filtre, une flèche frappée dans un champ
        // verrait son déplacement de curseur confisqué (preventDefault ci-dessous), le focus
        // arraché vers un onglet — et cet onglet activé au passage (click(), activation
        // automatique). On ne prend donc la main que si l'événement part bien d'un onglet.
        if (!event.target.closest('[role="tab"]')) return;

        const tabs = Array.from(
            listRef.current.querySelectorAll('[role="tab"]:not([aria-disabled="true"])')
        );
        if (!tabs.length) return;

        event.preventDefault();

        const activeIndex = tabs.indexOf(document.activeElement);

        // Flèches circulaires (le modulo ramène au premier/dernier onglet), avec une entrée
        // par les extrémités quand le focus n'est pas sur un onglet ÉLIGIBLE — cas réel
        // depuis le filtre ci-dessus : un onglet désactivé, qui reste focusable (aria-disabled,
        // voir Tab.jsx) mais est exclu de `tabs`. ArrowRight entre alors par le premier
        // onglet, ArrowLeft par le dernier.
        //
        // Ce cas exige une branche par touche, il ne peut pas se réduire à un index de
        // départ : partir de `tabs.length - 1` donnerait bien 0 sur ArrowRight, mais
        // (len - 2 + len) % len = len - 2 sur ArrowLeft, soit l'AVANT-dernier onglet — le
        // même résultat que l'index -1 brut ((-1 - 1 + len) % len = len - 2). Home et End
        // ignorent de toute façon la position courante.
        let nextIndex;
        if (event.key === 'Home') nextIndex = 0;
        else if (event.key === 'End') nextIndex = tabs.length - 1;
        else if (activeIndex === -1) nextIndex = event.key === 'ArrowRight' ? 0 : tabs.length - 1;
        else if (event.key === 'ArrowRight') nextIndex = (activeIndex + 1) % tabs.length;
        else nextIndex = (activeIndex - 1 + tabs.length) % tabs.length;

        // focus() PUIS click() : activation immédiate au déplacement (motif « automatic
        // activation » d'ARIA), le clic passant par le handler du <Tab>.
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
    };

    // Les modificateurs par défaut (md, start) ne sont pas émis : la valeur de base est
    // déjà portée par .tab-list.
    const classes = [
        'tab-list',
        `tab-list--${ctx.variant}`,
        ctx.size !== 'md' && `tab-list--${ctx.size}`,
        ctx.align !== 'start' && `tab-list--${ctx.align}`,
        ctx.fitted && 'tab-list--fitted',
        className
    ].filter(Boolean).join(' ');

    // {...rest} étalé EN PREMIER : les props internes (rôle, ref, clavier) restent
    // prioritaires — sinon un onKeyDown fourni par l'appelant écraserait toute la
    // navigation clavier sans le moindre avertissement.
    //
    // aria-label fait EXCEPTION et passe AVANT rest : sans `label`, il vaudrait
    // undefined et effacerait alors un aria-label (ou un aria-labelledby doublé d'un
    // aria-label) posé en direct par l'appelant. Ici l'appelant doit gagner : `label`
    // n'est qu'un raccourci, pas une garantie de fonctionnement comme le rôle.
    return (
        <nav
            aria-label={label}
            {...rest}
            className={classes}
            role="tablist"
            ref={listRef}
            onKeyDown={handleKeyDown}
            style={style}
        >
            {children}
        </nav>
    );
};

export default TabList;
