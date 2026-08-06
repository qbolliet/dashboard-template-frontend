// Importation des modules
import './DocsMissing.scss';

// =================================================================
// DOCS MISSING — message explicite pour un artefact introuvable
// =================================================================
// Un nom inexistant dans <ComponentPlayground> ou <ComponentPreview> doit produire un
// message, PAS un écran blanc et pas une exception. Deux raisons :
//   • la faute de frappe est le mode d'échec normal de ces composants — ils sont appelés
//     depuis du MDX, où rien ne vérifie le nom au build ;
//   • une exception dans un composant client remonte jusqu'à la frontière d'erreur la
//     plus proche et emporte TOUTE la page de documentation, y compris la prose autour.
//
// La liste des noms disponibles est affichée : c'est ce qui transforme le message en
// réponse plutôt qu'en constat.
//
// Server Component : aucun état, aucun gestionnaire. Il est rendu depuis des composants
// clients, ce qui ne l'oblige pas à le devenir.

/**
 * Explicit fallback rendered when a documentation artefact cannot be resolved.
 *
 * @param {Object} props - Component props.
 * @param {string} props.name - The name that was requested.
 * @param {string} props.kind - Human-readable artefact kind, e.g. `'playground'`.
 * @param {Array<string>} [props.available] - Names that do resolve.
 * @param {string} [props.hint] - Where such an artefact is declared.
 * @returns {JSX.Element} The rendered message.
 */
const DocsMissing = ({ name, kind, available = [], hint }) => (
    // role="note" plutôt que "alert" : le message est présent au chargement et n'est pas
    // une interruption ; "alert" forcerait une annonce intempestive à chaque page.
    <aside className="doc-missing" role="note">
        <p className="doc-missing__title">
            {kind} introuvable : <code>{name}</code>
        </p>

        {hint && <p className="doc-missing__hint">{hint}</p>}

        {available.length > 0 && (
            <>
                <p className="doc-missing__label">Noms disponibles :</p>
                <ul className="doc-missing__list">
                    {available.map((item) => <li key={item}><code>{item}</code></li>)}
                </ul>
            </>
        )}
    </aside>
);

export default DocsMissing;
