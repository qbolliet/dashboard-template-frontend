'use client';

// Importation des modules
import { Suspense } from 'react';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from '@/components/ui';
import { examples } from '@registry/__registry__';
import PreviewFrame from '../PreviewFrame/PreviewFrame';
import DocsCodeBlock from '../DocsCodeBlock/DocsCodeBlock';
import DocsMissing from '../DocsMissing/DocsMissing';
import './ComponentPreview.scss';

// =================================================================
// COMPONENT PREVIEW — un cas d'usage figé, rendu et sourcé
// =================================================================
// Répond à « à quoi ressemble l'usage canonique ? ». À ne pas confondre avec
// <ComponentPlayground>, qui répond à « que fait ce composant si je change ce
// paramètre ? » — cf. le tableau du §5.2 de TEMPLATIZATION_ARCHITECTURE.md. Les deux
// artefacts sont volontairement distincts : ici le code est FIGÉ et lu au build, là il
// est GÉNÉRÉ au runtime ; il y a un playground par composant, mais autant d'exemples que
// de cas d'usage ; et un item de registry doit pointer vers des fichiers concrets, ce
// qu'une configuration de playground n'est pas.
//
// La source vient de registry/__registry__.js, produit par scripts/build-registry.js :
// chaque exemple y est associé à son composant (React.lazy) et à son code source brut,
// lu par `fs` au build. C'est le mécanisme de shadcn/ui.
//
// La documentation d'un template se bâtit avec ses propres composants : les onglets sont
// ceux de src/components/ui/Tabs, et rien d'autre qu'un <Tab> n'entre dans <TabList> —
// c'est un role="tablist". La bascule de thème vit donc dans le cadre d'aperçu et le
// bouton de copie dans le bloc de code, chaque contrôle auprès de ce qu'il pilote.

/**
 * Lists every example name, for the "unknown name" message.
 *
 * @returns {Array<string>} Sorted example names.
 */
const availableNames = () => Object.keys(examples).sort();

/**
 * Frozen use case of a component: rendered preview and source, in two tabs.
 *
 * @param {Object} props - Component props.
 * @param {string} props.name - Example name, e.g. `'chart-hue'`.
 * @returns {JSX.Element} The rendered preview, or an explicit message.
 */
const ComponentPreview = ({ name }) => {
    const example = examples[name];

    if (!example) {
        return (
            <DocsMissing
                name={name}
                kind="Exemple"
                available={availableNames()}
                hint="Les exemples sont les fichiers de registry/examples/, indexés au build par scripts/build-registry.js." />
        );
    }

    const Example = example.component;

    return (
        <Tabs defaultValue="apercu" variant="enclosed" size="sm" className="doc-preview">
            <TabList label={`Aperçu et code — ${example.title ?? name}`}>
                <Tab value="apercu">Aperçu</Tab>
                <Tab value="code">Code</Tab>
            </TabList>

            <TabPanels>
                <TabPanel value="apercu">
                    <PreviewFrame label={`Aperçu — ${example.title ?? name}`}>
                        {/* React.lazy impose une frontière de suspension : le composant
                            d'exemple n'est chargé que si l'onglet Aperçu est ouvert, ce
                            qui évite d'embarquer les vingt exemples dans chaque page. */}
                        <Suspense fallback={<p className="doc-preview__loading">Chargement de l&apos;aperçu…</p>}>
                            <Example />
                        </Suspense>
                    </PreviewFrame>
                </TabPanel>

                <TabPanel value="code">
                    <DocsCodeBlock
                        code={example.code}
                        lang="jsx"
                        caption={`registry/examples/${name}.jsx`}
                        copyLabel={`Copier le code de l'exemple ${name}`} />
                </TabPanel>
            </TabPanels>
        </Tabs>
    );
};

export default ComponentPreview;
