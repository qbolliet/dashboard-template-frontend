'use client';

// Importation des modules
import { examples } from '@registry/__registry__';
import DocsCodeBlock from '../DocsCodeBlock/DocsCodeBlock';
import DocsMissing from '../DocsMissing/DocsMissing';

// =================================================================
// COMPONENT PREVIEW SOURCE — le code d'un exemple, seul
// =================================================================
// Variante sans onglets ni rendu, pour les extraits de guides : quand la prose entoure
// déjà l'explication, un cadre d'aperçu et deux onglets sont du bruit. Même source de
// vérité que <ComponentPreview> — le code reste celui du fichier de registry/examples/,
// lu au build, donc il ne peut pas se périmer par rapport à l'exemple rendu ailleurs.

/**
 * Source of a registry example, without the preview tabs.
 *
 * @param {Object} props - Component props.
 * @param {string} props.name - Example name, e.g. `'chart-hue'`.
 * @returns {JSX.Element} The rendered code block, or an explicit message.
 */
const ComponentPreviewSource = ({ name }) => {
    const example = examples[name];

    if (!example) {
        return (
            <DocsMissing
                name={name}
                kind="Exemple"
                available={Object.keys(examples).sort()}
                hint="Les exemples sont les fichiers de registry/examples/, indexés au build par scripts/build-registry.js." />
        );
    }

    return (
        <DocsCodeBlock
            code={example.code}
            lang="jsx"
            caption={`registry/examples/${name}.jsx`}
            copyLabel={`Copier le code de l'exemple ${name}`} />
    );
};

export default ComponentPreviewSource;
