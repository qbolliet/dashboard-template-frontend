'use client';

// Importation des modules
import { Suspense, use, useState } from 'react';
import { PLAYGROUND_MODULES } from '@docs/playgrounds';
import { serializeJsx, unwrapExpr, defaultsOf } from '../../utils/serializeJsx';
import PlaygroundControlPanel from '../PlaygroundControls/PlaygroundControlPanel';
import PreviewFrame from '../PreviewFrame/PreviewFrame';
import DocsCodeBlock from '../DocsCodeBlock/DocsCodeBlock';
import DocsMissing from '../DocsMissing/DocsMissing';
import './ComponentPlayground.scss';

// =================================================================
// COMPONENT PLAYGROUND — contrôles, rendu en direct, code généré
// =================================================================
// Le cœur du dispositif, et ce qui remplace les pages /test-*. Répond à « que fait ce
// composant si je change ce paramètre ? » — à ne pas confondre avec <ComponentPreview>,
// qui montre un cas d'usage figé (cf. §5.2).
//
// Un schéma de docs/playgrounds/*.jsx alimente À LA FOIS le rendu des contrôles et le
// sérialiseur. C'est le point important : une seule déclaration, donc aucun risque que
// les contrôles affichés et le code affiché divergent.
//
// INVARIANT — ON SÉRIALISE EXACTEMENT CE QU'ON REND. Les contrôles ne pilotent pas
// toujours des props directement (ceux de /test-chart construisaient des descripteurs de
// marques), d'où le `toProps` du schéma : c'est SON résultat qui part au rendu et au
// sérialiseur. La règle « les props à leur défaut sont omises » s'applique donc dans
// l'espace des props, en comparant à `toProps(défauts)`.

// Promesses de chargement mémorisées : `use()` exige une promesse STABLE entre les
// rendus, sinon chaque re-rendu (donc chaque frappe dans un contrôle) relancerait une
// suspension et remonterait le composant. La Map vit au niveau du module, pas du rendu.
const MODULE_PROMISES = new Map();

/**
 * Loads a playground schema once, returning the same promise on every call.
 *
 * @param {string} name - Playground name, e.g. `'chart'`.
 * @returns {Promise<Object>} The playground module namespace.
 */
const loadPlayground = (name) => {
    if (!MODULE_PROMISES.has(name)) MODULE_PROMISES.set(name, PLAYGROUND_MODULES[name]());
    return MODULE_PROMISES.get(name);
};

/**
 * Body of a playground, once its schema has resolved.
 *
 * Split out from `ComponentPlayground` so the hooks below sit under the Suspense
 * boundary: `use()` suspends, and state declared above it would be discarded.
 *
 * @param {Object} props - Component props.
 * @param {string} props.name - Playground name.
 * @returns {JSX.Element} Controls, live preview and generated code.
 */
const PlaygroundBody = ({ name }) => {
    const schema = use(loadPlayground(name));
    const { controls, scaffold, toProps, default: Render, hint } = schema;

    const [values, setValues] = useState(() => defaultsOf(controls));

    // Dérivation contrôles → props. Un schéma dont les contrôles SONT les props (le cas
    // courant) n'a pas à déclarer de `toProps`.
    const derive = toProps ?? ((current) => current);
    const props = derive(values);
    const defaults = derive(defaultsOf(controls));

    const code = serializeJsx(scaffold, props, defaults);

    return (
        <section className="doc-playground" aria-label={`Playground — ${scaffold.component}`}>
            <PlaygroundControlPanel
                controls={controls}
                values={values}
                hint={hint}
                onChange={(key, value) => setValues((current) => ({ ...current, [key]: value }))} />

            <div className="doc-playground__panes">
                <PreviewFrame label={`Rendu — ${scaffold.component}`}>
                    {/* unwrapExpr : les valeurs marquées par expr() sortent verbatim dans
                        le code mais doivent arriver au composant sous leur forme réelle. */}
                    <Render {...unwrapExpr(props)} />
                </PreviewFrame>

                <DocsCodeBlock
                    code={code}
                    lang="jsx"
                    caption="code généré"
                    copyLabel={`Copier le code de ${scaffold.component}`} />
            </div>
        </section>
    );
};

/**
 * Interactive playground of a component, driven by its `docs/playgrounds/` schema.
 *
 * @param {Object} props - Component props.
 * @param {string} props.name - Playground name, e.g. `'chart'`.
 * @returns {JSX.Element} The rendered playground, or an explicit message.
 */
const ComponentPlayground = ({ name }) => {
    if (!PLAYGROUND_MODULES[name]) {
        return (
            <DocsMissing
                name={name}
                kind="Playground"
                available={Object.keys(PLAYGROUND_MODULES).sort()}
                hint="Les playgrounds sont déclarés dans docs/playgrounds/ et recensés dans docs/playgrounds/index.js." />
        );
    }

    return (
        <Suspense fallback={<p className="doc-playground__loading">Chargement du playground…</p>}>
            {/* key : changer de `name` doit repartir des défauts du NOUVEAU schéma, pas
                réutiliser l'état des contrôles de l'ancien. */}
            <PlaygroundBody key={name} name={name} />
        </Suspense>
    );
};

export default ComponentPlayground;
