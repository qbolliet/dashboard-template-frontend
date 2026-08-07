'use client';

// Importation des modules
import { useState } from 'react';
import Header from '@/features/header/components/Header/Header';
import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';
import siteConfig from '@config/site.config.json';
import { expr } from '@/features/docs/utils/serializeJsx';

// =================================================================
// PLAYGROUND — Header
// =================================================================
// Porté depuis /test-header.
//
// SURFACE DÉLIBÉRÉMENT ÉTROITE. `Header` choisit lui-même entre barre horizontale et
// barre latérale selon la PROFONDEUR de l'arbre qu'on lui passe (cf. Header.jsx) — ce
// n'est pas une prop pilotable, et un contrôle qui la simulerait produirait un code
// généré mensonger. Le reste du comportement intéressant — repli responsive, suggestions
// de la barre de recherche, navigation clavier, bascule de thème — est soit automatique,
// soit déjà exercé EN CONTINU par le chrome du site de documentation lui-même : chaque
// page de ce site rend un vrai <Header>, dans son mode réel, avec de vraies interactions.
// Le redémontrer ici avec des contrôles n'apprendrait rien de plus.
//
// CE QUE LA CHROME DU SITE N'EXERCE JAMAIS : `onNavigationItemClick`. La navigation du
// site de documentation utilise next/link directement et ne passe jamais par ce callback
// — c'est pourtant le point d'extension qu'un intégrateur veut voir marcher (analytics,
// notifications, etc.). `logClicks` est donc une molette de démonstration — PAS une prop
// de <Header> — qui bascule la PRÉSENCE de `onNavigationItemClick`, sur le même principe
// que `showIcon`/`showBadge` dans stat-card.jsx : décocher retire la prop, la ligne
// disparaît du code généré.

export const controls = {
    logClicks: { type: 'boolean', label: 'Journaliser les clics', default: true, row: 0 },
};

export const scaffold = {
    component: 'Header',
    imports: [
        "import { useState } from 'react';",
        "import Header from '@/features/header/components/Header/Header';",
        "import { resolveNavigationTree } from '@/utils/navigation/resolveNavigationTree';",
        "import siteConfig from '@config/site.config.json';",
    ],
    // `setLastClicked` doit être DÉCLARÉ dans l'extrait : la règle 2 du sérialiseur (code
    // autonome) interdit d'y référencer un identifiant qui n'existerait que dans ce
    // fichier de playground. Même raisonnement que `useState(initialCriterion)` dans
    // criterion-menu.jsx.
    dataCode: `const navigationData = resolveNavigationTree(siteConfig.navigation.tree);
const [lastClicked, setLastClicked] = useState(null);`,
    // Molette de démonstration : ne pilote aucune prop de <Header>.
    omit: ['logClicks'],
    // navigationData et onNavigationItemClick (quand présent) sont des CONSTANTES du
    // point de vue de toProps : leur code généré est fixe, donc toujours égal à son
    // propre défaut. La règle 1 les supprimerait sans cette liste — exactement le
    // raisonnement de `always` dans stat-card.jsx pour `icon`/`badge`.
    always: ['navigationData', 'onNavigationItemClick'],
};

export const hint = (
    <>
        Décocher <code>Journaliser les clics</code> retire la prop{' '}
        <code>onNavigationItemClick</code> — le point d&apos;extension à brancher sur des
        analytics ou des notifications, que la navigation du site de documentation
        n&apos;utilise jamais elle-même (elle passe par <code>next/link</code>).
    </>
);

/**
 * Maps the control values onto real `<Header>` props.
 *
 * @param {Object} values - Current control values.
 * @param {boolean} values.logClicks - Demo-only knob toggling the click callback.
 * @returns {Object} Props handed to both the preview and the serializer.
 */
export const toProps = ({ logClicks }) => ({
    navigationData: expr('navigationData', resolveNavigationTree(siteConfig.navigation.tree)),
    // expr() : le code doit lire une flèche vers `setLastClicked` (déclaré par
    // `dataCode` ci-dessus) ; l'aperçu (cf. HeaderPlayground plus bas) gère ce câblage
    // lui-même avec son PROPRE état local, la valeur réelle transmise ici n'a donc pas
    // besoin d'être une fonction utilisable.
    onNavigationItemClick: logClicks
        ? expr('(item) => setLastClicked(item.name)', undefined)
        : undefined,
    logClicks,
});

/**
 * Live preview of the header playground.
 *
 * Ignore la valeur réelle de `onNavigationItemClick` fournie par `toProps` (elle sert
 * uniquement à produire le code affiché) et construit son propre callback relié à un
 * état local, pour que l'effet du clic reste VISIBLE dans l'aperçu — un `console.log`,
 * comme le faisait l'ancienne page /test-header, serait invisible sur un site de docs.
 *
 * @param {Object} props - Props derived from the controls.
 * @param {boolean} props.logClicks - Demo-only knob toggling the click callback.
 * @returns {JSX.Element} The rendered header, with a click readout underneath.
 */
const HeaderPlayground = ({ logClicks }) => {
    const [lastClicked, setLastClicked] = useState(null);
    const navigationData = resolveNavigationTree(siteConfig.navigation.tree);

    return (
        <>
            <Header
                navigationData={navigationData}
                onNavigationItemClick={logClicks ? (item) => setLastClicked(item.name) : undefined}
            />
            <p>Dernier élément cliqué : {lastClicked ?? '—'}</p>
        </>
    );
};

export default HeaderPlayground;
