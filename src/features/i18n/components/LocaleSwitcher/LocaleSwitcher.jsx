'use client';

import { useLocale } from '@/features/i18n/providers/LocaleProvider';
import './LocaleSwitcher.scss';

// =================================================================
// LOCALE SWITCHER — bascule de langue, forme minimale assumée
// =================================================================
// CE COMPOSANT EST DÉLIBÉRÉMENT NON DESSINÉ. Il existe pour que l'infrastructure
// d'internationalisation soit réellement exercée — par un humain comme par la suite
// Playwright — et non pour être le sélecteur définitif du template. Un `<select>` natif,
// deux règles de style, rien de plus.
//
// Ce qu'il faut conserver en le redessinant, et qui n'est pas du décor :
//
//   • le <label> associé. Un sélecteur de langue sans nom accessible est une liste de
//     mots étrangers sans contexte pour un lecteur d'écran ;
//   • les noms de langue dans LEUR PROPRE langue (« English », pas « Anglais »). Le
//     dictionnaire les porte sous `localeSwitcher.names`, identiques dans tous les
//     fichiers de traduction — c'est voulu, et c'est la convention universelle ;
//   • l'attribut `lang` sur chaque <option>, qui fait prononcer chaque nom dans la
//     bonne langue au lieu de le lire avec la phonétique de la page courante ;
//   • le passage par `setLocale` du provider, qui préserve le chemin courant. Un
//     sélecteur qui renvoie à l'accueil perd la page que le lecteur consultait.
//
// Un <select> plutôt qu'une liste de boutons : au-delà de deux langues, la liste
// déborde du header, et le <select> apporte gratuitement le clavier, le tactile et les
// conventions de la plateforme.

/**
 * Minimal, intentionally unstyled language switcher.
 *
 * @returns {JSX.Element} The rendered switcher.
 */
const LocaleSwitcher = () => {
    const { locale, locales, dictionary, setLocale } = useLocale();
    const labels = dictionary.localeSwitcher;

    return (
        <div className="locale-switcher">
            <label className="locale-switcher__label" htmlFor="locale-switcher">
                {labels.label}
            </label>

            <select
                id="locale-switcher"
                className="locale-switcher__select"
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
            >
                {locales.map((code) => (
                    // Repli sur le code brut : une langue ajoutée à `site.locales` sans
                    // entrée dans `localeSwitcher.names` reste sélectionnable plutôt que
                    // de disparaître de la liste. `npm run check:i18n` signale le manque.
                    <option key={code} value={code} lang={code}>
                        {labels.names[code] ?? code}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LocaleSwitcher;
