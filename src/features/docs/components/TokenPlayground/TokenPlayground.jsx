'use client';

// Importation des modules
import { Suspense, useContext, useId, useState } from 'react';
import { examples } from '@registry/__registry__';
import PlaygroundControlPanel from '../PlaygroundControls/PlaygroundControlPanel';
import PreviewFrame, { PreviewThemeContext } from '../PreviewFrame/PreviewFrame';
import DocsCodeBlock from '../DocsCodeBlock/DocsCodeBlock';
import DocsMissing from '../DocsMissing/DocsMissing';
import { buildScopeCss, hexToHslTriplet, hslTripletToHex } from '../../utils/tokenScope';
import './TokenPlayground.scss';

// =================================================================
// TOKEN PLAYGROUND — la même chose, deux fois, sans variante de code
// =================================================================
// Démontre §4.4 de TEMPLATIZATION_ARCHITECTURE.md. Le MÊME exemple de registry est rendu
// DEUX FOIS côte à côte : à gauche tel qu'il est livré, à droite dans un sous-arbre où
// quelques propriétés personnalisées ont été redéclarées. Aucune prop ne diffère, aucun
// fichier du composant n'est touché, rien n'est recompilé — c'est exactement ce qu'un
// utilisateur tiers obtiendra dans son projet, et c'est la raison d'être de la cascade.
//
// LE CSS AFFICHÉ EST LE CSS APPLIQUÉ. La balise <style> et le bloc de code reçoivent la
// même chaîne, produite par buildScopeCss(). Un extrait de documentation qui « illustre »
// un effet sans le produire est invérifiable : ici, si l'extrait est faux, l'aperçu est
// faux avec lui, et cela se voit.
//
// POURQUOI DEUX RÈGLES CSS (cf. buildScopeCss) : le scope est un DESCENDANT du cadre
// d'aperçu, qui est ce qui porte `data-theme`. Une déclaration posée sur le scope l'emporte
// donc sur la redéfinition sombre de la primitive, et une règle unique figerait la
// surcharge à la bascule clair/sombre — soit l'inverse de ce que le niveau A annonce.
//
// Le schéma des tokens arrive EN PROP depuis le MDX plutôt que d'un registre de schémas
// à la docs/playgrounds/ : ce sont trois à quatre lignes par démonstration, elles se
// lisent mieux à côté du texte qu'elles illustrent, et un seul composant sert ainsi les
// niveaux A, B et C en ne changeant que sa liste de tokens.

/**
 * Builds the initial control state from the schema.
 *
 * L'état garde la valeur dans la CONVENTION DU DÉPÔT — un triplet `H S% L%` pour une
 * couleur —, et la conversion en hexadécimal n'a lieu qu'au moment de nourrir le
 * `<input type="color">`, qui ne parle que ça. L'inverse (stocker de l'hexadécimal)
 * ferait passer la valeur par défaut par un aller-retour destructeur : `209 79% 24%`
 * ressortirait en `206.9 74.4% 22.9%`, et l'extrait à copier ne serait déjà plus celui du
 * dépôt avant même que le lecteur ait touché un contrôle.
 *
 * @param {Array<Object>} tokens - Token descriptors.
 * @param {string} field - Which default to read, `'default'` or `'dark'`.
 * @returns {Object} Control values, keyed by token name.
 */
const initialValues = (tokens, field) => Object.fromEntries(
    tokens
        .filter((token) => token[field] !== undefined)
        .map((token) => [token.name, token[field]]),
);

/**
 * Builds the control schema handed to the shared control panel.
 *
 * Dark controls are keyed `<token>@dark`: the panel keys its controls by prop name, and
 * a token name can never contain an `@`, so the two families cannot collide.
 *
 * @param {Array<Object>} tokens - Token descriptors.
 * @returns {Object} A `controls` map in the playground schema format.
 */
const toControls = (tokens) => {
    const controls = {};

    for (const token of tokens) {
        const base = {
            type: token.type,
            label: token.label ?? token.name,
            min: token.min,
            max: token.max,
            step: token.step,
            options: token.options,
            labels: token.labels,
        };

        controls[token.name] = { ...base, row: 0 };
        if (token.dark !== undefined) {
            controls[`${token.name}@dark`] = { ...base, label: `${base.label} (sombre)`, row: 1 };
        }
    }

    return controls;
};

/**
 * One of the two side-by-side renderings, scoped as a theme carrier.
 *
 * `data-theme` sur CHAQUE colonne, et pas seulement sur le cadre : c'est ce qui fait
 * redéclarer les blocs de base (`:root, [data-theme]`) sur l'élément, et donc y résoudre
 * les indirections du genre `--search-height: var(--header-control-size)`. Sans cet
 * attribut, surcharger une primitive sur ce conteneur n'aurait AUCUN effet sur les tokens
 * qui en dérivent : l'indirection aurait déjà été résolue plus haut, sur <html>. Les deux
 * colonnes le portent pour être rigoureusement comparables — seule la classe diffère.
 *
 * @param {Object} props - Component props.
 * @param {string} [props.scopeClass] - Class carrying the override, on the right column.
 * @param {string} props.caption - Visible caption of the column.
 * @param {string} props.label - Accessible name of the column.
 * @param {React.ReactNode} props.children - The rendered example.
 * @returns {JSX.Element} The rendered column.
 */
const PreviewColumn = ({ scopeClass, caption, label, children }) => {
    const theme = useContext(PreviewThemeContext);

    return (
        <section
            className={`token-playground__side${scopeClass ? ` ${scopeClass}` : ''}`}
            data-theme={theme ?? undefined}
            aria-label={label}>
            <p className="token-playground__caption">{caption}</p>
            {children}
        </section>
    );
};

/**
 * Live demonstration of a scoped token override.
 *
 * @param {Object} props - Component props.
 * @param {string} props.example - Registry example name, e.g. `'stat-card-basic'`.
 * @param {Array<Object>} props.tokens - Token descriptors: `{name, type, default, dark?,
 *   label?, unit?, min?, max?, step?, options?}`. `type` is any control type of
 *   PlaygroundControlPanel; a `dark` default adds a second control and a second CSS rule.
 * @param {string} [props.scopeName] - Class name shown in the generated snippet.
 * @param {React.ReactNode} [props.note] - Free note displayed under the controls.
 * @returns {JSX.Element} The rendered demonstration.
 */
const TokenPlayground = ({ example, tokens, scopeName = 'ma-page', note }) => {
    // useId() rend un identifiant du genre « _r_1_ » ou « «r1» » selon la version : les
    // caractères non alphanumériques doivent sauter pour former un sélecteur valide, et
    // le préfixe garantit que la classe ne commence jamais par un chiffre.
    const scopeClass = `token-scope-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

    const [values, setValues] = useState(() => initialValues(tokens, 'default'));
    const [darkValues, setDarkValues] = useState(() => initialValues(tokens, 'dark'));

    const entry = examples[example];

    if (!entry) {
        return (
            <DocsMissing
                name={example}
                kind="Exemple"
                available={Object.keys(examples).sort()}
                hint="Les exemples sont les fichiers de registry/examples/, indexés au build par scripts/build-registry.js." />
        );
    }

    const Example = entry.component;

    const isColor = (name) => tokens.find((token) => token.name === name)?.type === 'color';

    /**
     * Routes a control change to the light or the dark value set.
     *
     * @param {string} key - Control key, suffixed with `@dark` for the dark variant.
     * @param {*} next - The new value, hexadecimal for a colour control.
     * @returns {void}
     */
    const handleChange = (key, next) => {
        const dark = key.endsWith('@dark');
        const name = dark ? key.slice(0, -'@dark'.length) : key;
        // Retour dans la convention du dépôt dès l'entrée : l'état ne contient jamais
        // d'hexadécimal, et l'extrait généré enseigne donc toujours la bonne syntaxe.
        const value = isColor(name) ? hexToHslTriplet(next) : next;
        const update = (previous) => ({ ...previous, [name]: value });

        if (dark) setDarkValues(update);
        else setValues(update);
    };

    /**
     * Presents the state to the control panel, in the units its widgets expect.
     *
     * @param {Object} source - A value set, keyed by token name.
     * @param {string} [suffix] - Key suffix, `'@dark'` for the dark set.
     * @returns {Object} The values, colours converted to hexadecimal.
     */
    const forControls = (source, suffix = '') => Object.fromEntries(
        Object.entries(source).map(([name, value]) => [
            `${name}${suffix}`,
            isColor(name) ? hslTripletToHex(value) : value,
        ]),
    );

    const controlValues = { ...forControls(values), ...forControls(darkValues, '@dark') };

    const css = buildScopeCss(`.${scopeName}`, tokens, values, darkValues);
    // La feuille réellement injectée vise la classe unique du scope ; celle qui est
    // AFFICHÉE nomme une classe lisible, puisque c'est elle que le lecteur recopiera dans
    // son propre projet. `attachDark` couvre en plus le cas propre à l'aperçu, où le
    // conteneur porte `data-theme` lui-même (cf. PreviewColumn).
    const injected = buildScopeCss(`.${scopeClass}`, tokens, values, darkValues, { attachDark: true });

    return (
        <figure className="token-playground">
            {/* Contenu entièrement produit par buildScopeCss à partir de contrôles typés
                (nombres, hexadécimal, options fermées), et filtré par sa liste blanche de
                caractères : rien de ce qui entre ici ne vient d'une saisie libre. */}
            <style dangerouslySetInnerHTML={{ __html: injected }} />

            <PlaygroundControlPanel
                controls={toControls(tokens)}
                values={controlValues}
                onChange={handleChange}
                hint={note} />

            <PreviewFrame label={`Surcharge de tokens — ${entry.title ?? example}`}>
                <div className="token-playground__pair">
                    <PreviewColumn caption="Par défaut" label="Rendu par défaut">
                        <Suspense fallback={<p className="token-playground__loading">Chargement…</p>}>
                            <Example />
                        </Suspense>
                    </PreviewColumn>

                    {/* MÊME composant, MÊMES props. Seule la classe du conteneur change. */}
                    <PreviewColumn
                        scopeClass={scopeClass}
                        caption="Avec la surcharge"
                        label="Rendu avec les tokens surchargés">
                        <Suspense fallback={<p className="token-playground__loading">Chargement…</p>}>
                            <Example />
                        </Suspense>
                    </PreviewColumn>
                </div>
            </PreviewFrame>

            <DocsCodeBlock
                code={css}
                lang="scss"
                caption={`à coller dans votre feuille de styles — .${scopeName}`}
                copyLabel="Copier la surcharge de tokens" />
        </figure>
    );
};

export default TokenPlayground;
