'use client';

// Importation des modules
import { countryForLocale } from '@/i18n/config';
import { useLocale } from '@/features/i18n/providers/LocaleProvider';
import { LanguageSwitcher } from '@/features/i18n/components/LanguageSwitcher';

// =================================================================
// LOCALE SWITCHER — l'adaptateur entre le site et le sélecteur de langue
// =================================================================
// Ce composant ne dessine RIEN et ne détient AUCUN état. Il fait une seule chose :
// traduire l'internationalisation de l'application — langues servies, dictionnaire,
// navigation qui préserve le chemin — dans les props que <LanguageSwitcher> attend.
// C'est cette frontière qui permet d'installer le sélecteur seul, hors de ce dépôt :
// la présentation ignore `src/i18n/`, et l'application ignore le motif ARIA.
//
// Les quatre invariants du sélecteur précédent sont tous conservés ; ce qui change est
// ce qui les porte :
//
//   • le NOM ACCESSIBLE, hier un <label> associé au <select>, aujourd'hui l'aria-label
//     du bouton, interpolé sur `localeSwitcher.button` avec la langue courante — un
//     drapeau et un code pays ne nomment pas la fonction du contrôle ;
//   • les NOMS DE LANGUE DANS LEUR PROPRE LANGUE (« English », pas « Anglais »), portés
//     par `localeSwitcher.names`, identiques dans tous les dictionnaires — c'est voulu,
//     et c'est la convention universelle ;
//   • l'ATTRIBUT `lang` PAR OPTION, hier sur chaque <option>, aujourd'hui posé par
//     <LanguageOption> sur son <li role="option"> : chaque nom est prononcé avec sa
//     propre phonétique, et non avec celle de la page courante ;
//   • le PASSAGE PAR `setLocale`, qui préserve le chemin courant. Un sélecteur qui
//     renvoie à l'accueil perd la page que le lecteur consultait.
//
// Le clavier, le tactile et les conventions de plateforme, hier gratuits avec un
// <select> natif, sont désormais à la charge de `useLanguageMenu` (motif listbox de
// l'APG : flèches bornées, Début/Fin, Échap qui rend le focus au bouton).

/**
 * Application-side language switcher: binds the presentational `<LanguageSwitcher>` to
 * the site's locales, dictionary and locale-preserving navigation.
 *
 * @param {Object} props - Component props.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Flag diameter, from which the button
 *   height derives.
 * @param {boolean} [props.compact=false] - Round button showing the flag alone, without
 *   the country badge nor the chevron.
 * @param {'left'|'right'} [props.menuAlign='right'] - Button edge the menu aligns to.
 * @returns {JSX.Element} The rendered switcher.
 */
const LocaleSwitcher = ({ size = 'md', compact = false, menuAlign = 'right' }) => {
    const { locale, locales, dictionary, setLocale } = useLocale();
    const labels = dictionary.localeSwitcher;

    // Descripteurs dérivés de la CONFIGURATION et non d'une liste tenue à la main :
    // ajouter une langue à `site.locales` suffit à la faire apparaître ici. Repli sur le
    // code brut quand le nom manque — la langue reste sélectionnable au lieu de
    // disparaître du menu, et `npm run check:i18n` signale le trou.
    const languages = locales.map((code) => ({
        code,
        country: countryForLocale(code),
        name: labels.names[code] ?? code,
    }));

    return (
        <LanguageSwitcher
            languages={languages}
            // Mode CONTRÔLÉ, jamais `defaultValue` : la langue courante est décidée par
            // l'URL, pas par un état client. Un état interne divergerait dès la première
            // navigation arrière du navigateur, qui change l'URL sans repasser par le
            // menu.
            value={locale}
            onChange={setLocale}
            size={size}
            compact={compact}
            // Défaut « right » là où le composant de présentation aligne à gauche : dans
            // le header, le contrôle est le dernier de la barre d'actions, donc collé au
            // bord droit de la fenêtre — un menu plus large que son bouton et aligné à
            // gauche déborderait hors de l'écran.
            menuAlign={menuAlign}
            labels={{ button: labels.button, list: labels.list }} />
    );
};

export default LocaleSwitcher;
