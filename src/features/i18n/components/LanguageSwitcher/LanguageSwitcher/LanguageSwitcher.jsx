'use client';

// Importation des modules
import { useId } from 'react';
import { interpolate } from '@/utils/i18n/interpolate';
import { mergeLabels } from '@/utils/i18n/mergeLabels';
import useLanguageMenu from '@/features/i18n/hooks/useLanguageMenu';
import { DEFAULT_LANGUAGES, flagCdnSrc } from '../languages';
import LanguageButton from '../LanguageButton/LanguageButton';
import LanguageMenu from '../LanguageMenu/LanguageMenu';
import LanguageOption from '../LanguageOption/LanguageOption';
import './LanguageSwitcher.scss';

// Libellés d'accessibilité par défaut, en français. Constante de MODULE et non
// valeur par défaut de la prop `labels` : c'est ce qui rend la fusion PARTIELLE
// possible — un appelant qui ne traduit qu'une clé sur deux garde l'autre, là où
// un défaut de prop serait remplacé en bloc dès qu'un objet est fourni.
// `{language}` est un gabarit à trou nommé, jamais un template literal : le
// dictionnaire traverse la frontière serveur → client, où seules les chaînes
// sérialisables passent (cf. l'en-tête de src/utils/i18n/interpolate.js).
const DEFAULT_LABELS = {
    button: 'Changer de langue — {language}',
    list: 'Langues disponibles',
};

/**
 * Root of the language switcher: a flag button that opens a listbox of languages.
 *
 * Works either uncontrolled (`defaultValue`) or controlled (`value` + `onChange`),
 * and knows nothing about the site's i18n layer — it receives its languages, its
 * value and its labels as props, so it can be installed on its own in another project.
 *
 * @param {Object} props - Component props.
 * @param {Array<{code: string, country: string, name: string}>} [props.languages=DEFAULT_LANGUAGES] -
 *   Offered languages: `code` is the language code (`lang` attribute and reported
 *   value), `country` its ISO 3166-1 alpha-2 flag country, `name` the language name
 *   written in that very language.
 * @param {string} [props.value] - Active language code. Its presence switches the
 *   component to controlled mode.
 * @param {string} [props.defaultValue] - Initially active language code (uncontrolled
 *   mode). Falls back to the first language of the list.
 * @param {Function} [props.onChange] - Called with the selected language code on every
 *   selection, in both modes.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Flag diameter, from which the button
 *   height derives.
 * @param {boolean} [props.compact=false] - Round button showing the flag alone, without
 *   the country badge nor the chevron.
 * @param {'left'|'right'} [props.menuAlign='left'] - Button edge the menu aligns to.
 * @param {function(string): ?string} [props.flagSrc=flagCdnSrc] - Resolves the flag
 *   image URL from a country code; swap it to serve self-hosted flags.
 * @param {{button: string, list: string}} [props.labels] - Partial ARIA labels, merged
 *   over the French defaults. `button` accepts a `{language}` placeholder.
 * @param {string} [props.className] - Extra class names on the root element.
 * @param {Object} [props.style] - Inline styles on the root element.
 * @returns {JSX.Element} The rendered language switcher.
 */
const LanguageSwitcher = ({
    languages = DEFAULT_LANGUAGES,
    value: controlledValue,
    defaultValue,
    onChange,
    size = 'md',
    compact = false,
    menuAlign = 'left',
    flagSrc = flagCdnSrc,
    labels,
    className,
    style,
}) => {
    const { value, open, activeIndex, rootRef, buttonRef, listRef, toggleMenu, selectIndex, setActiveIndex, onButtonKeyDown, onListKeyDown } =
        useLanguageMenu({ languages, value: controlledValue, defaultValue, onChange });

    // Préfixe des ids ARIA : stable entre rendu serveur et hydratation, et unique
    // même avec plusieurs sélecteurs sur la page (pas de compteur au niveau module).
    const listId = useId();

    const mergedLabels = mergeLabels(DEFAULT_LABELS, labels);

    // `??` et non `||` : avec une liste vide, `current` reste `undefined` plutôt que
    // de faire échouer l'accès. LanguageButton et FlagChip lisent la langue en
    // optionnel — le composant se rend alors sur la seule pastille de repli, sans
    // exception, ce qui laisse un tableau `languages` en cours de chargement passer
    // sans garde côté appelant.
    const current = languages.find((language) => language.code === value) ?? languages[0];

    const classes = ['lang-switch', `lang-switch--${size}`, compact && 'lang-switch--compact', className]
        .filter(Boolean)
        .join(' ');

    return (
        // <section> et non <div> : la racine groupe deux éléments solidaires, le
        // déclencheur et sa liste. <span> est exclu — il n'accepte que du contenu de
        // phrasé, or le <ul> du menu est du contenu de flux, ce qui rendrait le HTML
        // invalide. Sans nom accessible, une <section> n'est pas exposée comme
        // région : aucun bruit ajouté dans l'arbre d'accessibilité, pour une balise
        // qui dit ce qu'elle groupe. C'est déjà le choix de <Tabs>.
        <section ref={rootRef} className={classes} style={style}>
            <LanguageButton
                ref={buttonRef}
                language={current}
                open={open}
                compact={compact}
                listId={listId}
                flagSrc={flagSrc}
                // Interpolation faite ICI, au point de rendu : le libellé reste une
                // chaîne côté dictionnaire, et LanguageButton reçoit un aria-label
                // déjà complet. Repli sur le gabarit brut si aucune langue n'est
                // résolue — `interpolate` laisse alors le trou apparent, ce qui
                // nomme la clé manquante au lieu de produire un libellé mutilé.
                label={current ? interpolate(mergedLabels.button, { language: current.name }) : mergedLabels.button}
                onClick={toggleMenu}
                onKeyDown={onButtonKeyDown} />

            {/* Menu monté conditionnellement, et non masqué en CSS : les options
                sortent alors du DOM à la fermeture, ce qui évite d'exposer une
                liste invisible aux technologies d'assistance et à la tabulation. */}
            {open && (
                <LanguageMenu
                    ref={listRef}
                    id={listId}
                    align={menuAlign}
                    label={mergedLabels.list}
                    activeDescendantId={`${listId}-opt-${activeIndex}`}
                    onKeyDown={onListKeyDown}>
                    {languages.map((language, index) => (
                        <LanguageOption
                            key={language.code}
                            id={`${listId}-opt-${index}`}
                            language={language}
                            flagSrc={flagSrc}
                            selected={language.code === value}
                            active={index === activeIndex}
                            onHover={() => setActiveIndex(index)}
                            onSelect={() => selectIndex(index)} />
                    ))}
                </LanguageMenu>
            )}
        </section>
    );
};

export default LanguageSwitcher;
