// Importation des modules
import propsDoc from '@docs/__props__.json';
import DocsMissing from '../DocsMissing/DocsMissing';
import './PropsTable.scss';

// =================================================================
// PROPS TABLE — l'API d'un composant, lue dans ses propres docstrings
// =================================================================
// Consomme docs/__props__.json, produit par scripts/build-props-doc.js en croisant la
// signature déstructurée de chaque composant du registry avec ses balises `@param`.
// La table est donc GÉNÉRÉE : elle ne peut pas diverger du code, et une prop ajoutée y
// apparaît sans que personne ait à y penser.
//
// SERVER COMPONENT, et c'est ce qui justifie l'`import` du JSON plutôt qu'un `fetch`
// (le montage retenu par <TokenReference>). Le fichier fait ~185 Ko pour 87 composants,
// mais il est lu à la GÉNÉRATION de la page : seules les quelques lignes réellement
// affichées traversent la frontière serveur → client. Un import équivalent depuis un
// composant CLIENT, lui, embarquerait les 87 tables dans le bundle de chaque page.
//
// LA CLÉ EST LE NOM D'AFFICHAGE (`Chart`), pas le nom d'item du registry (`chart`) :
// c'est celui qu'on écrit dans du JSX, donc celui qu'un rédacteur tape sans réfléchir.
// Un fichier peut en exposer plusieurs — HoverOverlays.jsx en publie trois — et
// l'inverse n'existe pas : le script refuse deux composants de même nom.

/**
 * Renders a description, turning its `backticked` spans into inline code.
 *
 * Les docstrings du dépôt balisent abondamment les noms de props et les valeurs
 * littérales à la manière de Markdown. Rendues telles quelles, les accentuations
 * graves resteraient à l'écran ; c'est le seul balisage assez fréquent pour mériter
 * d'être interprété, un moteur Markdown complet serait hors de proportion.
 *
 * @param {string} text - The raw description.
 * @returns {Array<(string|JSX.Element)>} The description, code spans included.
 */
const withInlineCode = (text) => text.split(/`([^`]+)`/).map((part, index) => (
    // Découpage par capture : les index IMPAIRS sont l'intérieur des accents graves.
    // L'index sert de clé sans réserve — le tableau est dérivé d'une chaîne constante,
    // il ne peut ni être réordonné ni changer de longueur entre deux rendus.
    index % 2 === 1 ? <code key={index}>{part}</code> : part
));

/**
 * Generated API table of a component, one row per prop.
 *
 * @param {Object} props - Component props.
 * @param {string} props.name - Component display name, e.g. `'Chart'`.
 * @returns {JSX.Element} The rendered table, or an explicit message.
 */
const PropsTable = ({ name }) => {
    const component = propsDoc.components[name];

    if (!component) {
        return (
            <DocsMissing
                name={name}
                kind="Table de props"
                available={Object.keys(propsDoc.components)}
                hint="Les tables de props sont dérivées des docstrings des composants du registry, au build, par scripts/build-props-doc.js. Le nom attendu est celui du composant (`Chart`), pas celui de l'item (`chart`)." />
        );
    }

    if (component.props.length === 0) {
        return (
            <p className="props-table__empty">
                <code>{`<${name}>`}</code> ne prend aucune prop
                {component.restProps && ' nommée : il relaie tout ce qu\'il reçoit à son élément racine'}.
            </p>
        );
    }

    return (
        <figure className="props-table">
            {/* Le débordement est porté par le conteneur, jamais par la page : la colonne
                des types ne se replie pas (cf. `.api-typ` dans _api-table.scss), et une
                union comme celle de `stack` est plus large que la colonne de lecture. */}
            <div className="api-card-scroll">
                <table className="api-table props-table__table">
                    <thead>
                        <tr>
                            <th scope="col">Prop</th>
                            <th scope="col">Type</th>
                            <th scope="col">Défaut</th>
                            <th scope="col">Description</th>
                        </tr>
                    </thead>

                    <tbody>
                        {component.props.map((prop) => (
                            <tr key={prop.name}>
                                <th scope="row" className="props-table__name">
                                    <code>{prop.name}</code>
                                    {prop.required && (
                                        <span className="props-table__required">requis</span>
                                    )}
                                </th>

                                <td className="api-typ">{prop.type ?? '—'}</td>

                                <td>{prop.defaultValue ? <code>{prop.defaultValue}</code> : '—'}</td>

                                <td>
                                    {prop.description
                                        ? withInlineCode(prop.description)
                                        : <span className="props-table__undocumented">Non documentée.</span>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {component.restProps && (
                <figcaption className="props-table__note">
                    Toute autre prop est transmise telle quelle à l’élément racine.
                </figcaption>
            )}
        </figure>
    );
};

export default PropsTable;
