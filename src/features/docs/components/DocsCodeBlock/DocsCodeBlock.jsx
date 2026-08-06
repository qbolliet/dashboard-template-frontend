'use client';

// Importation des modules
import { highlight } from '@/utils/highlight/highlight';
import CopyButton from '../CopyButton/CopyButton';
import './DocsCodeBlock.scss';

// =================================================================
// DOCS CODE BLOCK — bloc de code coloré et copiable
// =================================================================
// Surface unique d'affichage de code de la documentation : elle sert le code GÉNÉRÉ du
// playground comme le code FIGÉ des exemples du registry. Les deux se ressemblent à
// l'écran parce qu'ils se ressemblent dans l'intention — c'est du code à copier.
//
// La coloration passe par src/utils/highlight/, qui tourne AU RUNTIME. C'est une
// contrainte, pas un choix par défaut : le code du playground n'existe pas au build,
// il est sérialisé depuis l'état courant des contrôles à chaque changement.

/**
 * Displays a code snippet, highlighted and copyable.
 *
 * @param {Object} props - Component props.
 * @param {string} props.code - The snippet to display.
 * @param {string} [props.lang] - Language hint handed to `highlight()`.
 * @param {string} [props.caption] - Small label shown in the top-left corner.
 * @param {string} [props.copyLabel] - Accessible name of the copy button.
 * @returns {JSX.Element} The rendered code block.
 */
const DocsCodeBlock = ({ code, lang = 'jsx', caption, copyLabel }) => (
    <figure className="doc-code">
        <figcaption className="doc-code__bar">
            <span className="doc-code__lang">{caption ?? lang}</span>
            <CopyButton code={code} label={copyLabel} />
        </figcaption>

        <pre className="doc-code__pre">
            {/* Le HTML injecté est produit localement par highlight() à partir d'un code
                que nous générons ou que nous lisons dans notre propre dépôt : aucune
                entrée utilisateur n'y transite. highlight() échappe par ailleurs les cinq
                caractères sensibles de tout ce qu'il ne reconnaît pas comme jeton — même
                motif et même justification que TableSnippetReveal.jsx. */}
            <code dangerouslySetInnerHTML={{ __html: highlight(code, lang) }} />
        </pre>
    </figure>
);

export default DocsCodeBlock;
