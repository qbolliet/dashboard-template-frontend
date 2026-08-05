// Importation des modules
import HomePage from '@/features/pages/components/HomePage/HomePage';
import IndicatorPage from '@/features/pages/components/IndicatorPage/IndicatorPage';
import IndicatorGroupPage from '@/features/pages/components/IndicatorGroupPage/IndicatorGroupPage';
import AboutPage from '@/features/pages/components/AboutPage/AboutPage';
import { GET_FACT_TABLE_WITH_METADATA } from '@/lib/api/documents';

// =================================================================
// PAGE TYPES — registre « type de nœud → gabarit de page »
// =================================================================
// C'est le chaînon qui manquait entre config/site.config.json et le rendu : chaque
// nœud du manifeste déclare un `type`, ce registre dit quel composant le rend. La
// route attrape-tout (src/app/[[...slug]]/page.jsx) ne connaît que ce registre —
// elle n'a aucune connaissance des types eux-mêmes.
//
// AJOUTER UN TYPE DE PAGE suppose trois gestes, dans cet ordre :
//   1. écrire le composant sous src/features/pages/components/ ;
//   2. l'enregistrer ici ;
//   3. ajouter le type à l'énumération de config/schema/site.schema.json.
// Cette énumération et les clés de ce registre doivent rester le miroir l'une de
// l'autre : un type validé par le schéma mais absent d'ici passe `validate:config`
// et rend une page introuvable (la route le journalise avant d'appeler notFound()).
//
// En revanche, AJOUTER UNE PAGE d'un type déjà enregistré ne demande RIEN d'autre
// qu'un nœud dans le manifeste — c'est tout l'objet du mécanisme.
//
// `query` est DÉCLARATIF : il documente l'opération GraphQL que le gabarit consomme,
// et c'est ce qu'un futur préchargement au build lirait pour savoir quoi demander.
// L'appel lui-même reste dans le composant de page, seul à savoir construire ses
// variables. `null` = gabarit sans données d'API (contenu de configuration).

/**
 * Registry mapping a manifest node `type` to the component that renders it.
 *
 * @type {Object<string, {component: Function, query: (string|null)}>}
 */
export const PAGE_TYPES = {
    home: { component: HomePage, query: null },
    indicator: { component: IndicatorPage, query: GET_FACT_TABLE_WITH_METADATA },
    indicator_group: { component: IndicatorGroupPage, query: null },
    about: { component: AboutPage, query: null },
};
