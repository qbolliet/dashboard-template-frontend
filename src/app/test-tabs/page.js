// =================================================================
// PAGE /test-tabs — page d'exemples du système d'onglets <Tabs>
// =================================================================
// Composant SERVEUR : entête statique (titre, sous-titre) et les trois tableaux
// d'API des props. Seules les démonstrations interactives sont 'use client' —
// elles vivent dans TabsPlayground.jsx. Calqué sur le prototype
// design-system/project/ds/tabs.html et sur le style de page de /test-chart.

// Importation des modules
import TabsPlayground from './TabsPlayground';
import './page.scss';

// Tableaux d'API — repris À L'IDENTIQUE des api-card du prototype (tabs.html).
// Statiques : rendus côté serveur, aucun JavaScript embarqué.
const TABS_PROPS = [
  ['defaultValue', 'string', 'Onglet actif au départ (mode non contrôlé).'],
  ['value', 'string?', 'Onglet actif imposé (mode contrôlé).'],
  ['onChange', '(value) => void', "Appelé à chaque changement d'onglet."],
  ['shared', 'any', 'Contexte partagé, lu par tous les panneaux (useTabsShared / render-prop).'],
  ['variant', "'underline'|'pills'|'enclosed'", "Style de la barre. Défaut 'underline'."],
  ['size', "'sm'|'md'|'lg'", "Taille des onglets. Défaut 'md'."],
  ['align', "'start'|'center'|'end'", 'Alignement des onglets dans la barre.'],
  ['fitted', 'boolean = false', 'Onglets étirés à largeur égale.'],
  ['accent', "'primary'|'positive'|'warning'|'negative'", "Couleur de l'onglet actif."],
  ['keepMounted', 'boolean = false', 'Garde les panneaux inactifs montés (mais cachés).'],
];

const TAB_PROPS = [
  ['value', 'string (requis)', "Identifiant — relie l'onglet à son <TabPanel>."],
  ['icon', 'ReactNode?', 'Icône optionnelle, à gauche du titre. Absente ⇒ titre seul.'],
  ['count', 'number | string?', 'Pastille de compteur optionnelle, à droite du titre.'],
  ['disabled', 'boolean = false', 'Onglet inactif (non sélectionnable, ignoré au clavier).'],
  ['children', 'ReactNode', "Le titre de l'onglet."],
];

const PARTS_PROPS = [
  ['TabList · actions', 'ReactNode?', 'Zone d\'actions alignée à droite, hors zone de défilement.'],
  ['TabPanels · flush', 'boolean = false', "Supprime l'espacement au-dessus des panneaux."],
  ['TabPanel · value', 'string (requis)', 'Doit correspondre au value d\'un <Tab>.'],
  ['TabPanel · children', 'ReactNode | (shared) => ReactNode', 'Contenu ; en render-prop, reçoit le contexte partagé.'],
];

/** Static API table rendered on the server. `rows` = [prop, type, description]. */
const ApiTable = ({ head, rows }) => (
  <div className="api-card-scroll">
    <table className="api-table">
      <thead>
        <tr><th>{head}</th><th>Type</th><th>Description</th></tr>
      </thead>
      <tbody>
        {rows.map(([prop, type, desc]) => (
          <tr key={prop}>
            <td><code>{prop}</code></td>
            <td className="api-typ">{type}</td>
            <td>{desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const TestTabsPage = () => (
  <main className="test-tabs-page">
    <header className="test-tabs-header">
      <h1 className="test-tabs-title">Onglets</h1>
      <p className="test-tabs-sub">
        Un système d&apos;onglets composable. Une <code>&lt;TabList&gt;</code>{' '}
        contient autant d&apos;onglets que voulu — chacun avec un titre et une{' '}
        <strong>icône optionnelle à sa gauche</strong>. Les panneaux se lient à leur
        onglet par un <code>value</code> commun, et <code>&lt;Tabs&gt;</code> peut{' '}
        <strong>partager un contexte</strong> à tous ses panneaux via <code>shared</code>{' '}
        : de quoi présenter les mêmes données sous deux angles — un graphique et un
        tableau, par exemple.
      </p>
    </header>

    {/* ── Tableaux d'API (statiques, rendus serveur) ── */}
    <section className="tabs-api">
      <h2 className="tabs-section-label">API</h2>

      <article className="api-card">
        <h3 className="api-card-title">Tabs — props</h3>
        <p className="api-card-note">
          Racine du système. Détient l&apos;onglet actif (contrôlé ou non) et diffuse le
          contexte partagé.
        </p>
        <ApiTable head="Prop" rows={TABS_PROPS} />
      </article>

      <article className="api-card">
        <h3 className="api-card-title">Tab — props</h3>
        <p className="api-card-note">
          Un onglet cliquable. À placer dans <code>&lt;TabList&gt;</code>.
        </p>
        <ApiTable head="Prop" rows={TAB_PROPS} />
      </article>

      <article className="api-card">
        <h3 className="api-card-title">TabList / TabPanels / TabPanel</h3>
        <ApiTable head="Élément · Prop" rows={PARTS_PROPS} />
        <p className="api-card-note api-card-note--after">
          Hook <code>useTabsShared()</code>{' '}
          : lit le contexte partagé depuis n&apos;importe quel descendant de{' '}
          <code>&lt;Tabs&gt;</code>.
        </p>
      </article>
    </section>

    {/* ── Démonstrations interactives (client) ── */}
    <TabsPlayground />
  </main>
);

export default TestTabsPage;
