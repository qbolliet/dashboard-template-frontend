// =================================================================
// MOCK DATA — SelectMenu
// =================================================================
// Données fictives en attendant le branchement sur l'API GraphQL.
// Forme cible des appels réels (signatures conservées pour faciliter la
// migration) :
//   getSelectOptions({ fieldName, searchTerm, limit, catalog })
//   getGroupedSelectOptions({ groupField, optionsField, limit })

// Mock plat : liste simple d'options { value, label }.
// Sert de repli par défaut quand `fieldName` n'a pas d'entrée dédiée ci-dessous.
export const MOCK_FLAT_OPTIONS = [
  { value: "fr", label: "France" },
  { value: "de", label: "Allemagne" },
  { value: "it", label: "Italie" },
  { value: "es", label: "Espagne" },
  { value: "nl", label: "Pays-Bas" },
  { value: "be", label: "Belgique" },
  { value: "at", label: "Autriche" },
  { value: "pt", label: "Portugal" },
  { value: "pl", label: "Pologne" },
  { value: "se", label: "Suède" },
];

// Mock par champ : options catégorielles indexées par `fieldName`. Imite la réponse
// de getSelectOptions(fieldName) qui renvoie les valeurs distinctes d'une colonne.
// Repli sur MOCK_FLAT_OPTIONS pour tout champ absent (cf. useSelectOptions).
export const MOCK_OPTIONS_BY_FIELD = {
  country: MOCK_FLAT_OPTIONS,
  indicator: [
    { value: "pib", label: "PIB" },
    { value: "conso", label: "Consommation" },
    { value: "invest", label: "Investissement" },
    { value: "export", label: "Exportations" },
    { value: "import", label: "Importations" },
    { value: "emploi", label: "Emploi" },
    { value: "infl_ind", label: "Inflation" },
    { value: "taux_dir", label: "Taux directeur" },
  ],
  sector: [
    { value: "agri", label: "Agriculture" },
    { value: "indus", label: "Industrie" },
    { value: "serv", label: "Services" },
    { value: "finance", label: "Finance" },
    { value: "energie", label: "Énergie" },
  ],
  region: [
    { value: "eu", label: "Union européenne" },
    { value: "na", label: "Amérique du Nord" },
    { value: "asia", label: "Asie" },
    { value: "africa", label: "Afrique" },
  ],
  type_orga: [
    { value: "public", label: "Public" },
    { value: "prive", label: "Privé" },
    { value: "assoc", label: "Associatif" },
  ],
  frequence: [
    { value: "annuel", label: "Annuel" },
    { value: "trim", label: "Trimestriel" },
    { value: "mensuel", label: "Mensuel" },
  ],
  source: [
    { value: "bce", label: "BCE" },
    { value: "ocde", label: "OCDE" },
    { value: "insee", label: "INSEE" },
    { value: "eurostat", label: "Eurostat" },
  ],
};

// Mock groupé : structure UI { group, options } prête à l'affichage.
// NB : l'API réelle renvoie les groupes et les options sous forme de tableaux
// parallèles — une transformation sera nécessaire au branchement effectif.
export const MOCK_GROUPED_OPTIONS = [
  {
    group: { value: "west", label: "Europe de l'Ouest" },
    options: [
      { value: "fr", label: "France" },
      { value: "de", label: "Allemagne" },
      { value: "nl", label: "Pays-Bas" },
      { value: "be", label: "Belgique" },
      { value: "at", label: "Autriche" },
    ],
  },
  {
    group: { value: "south", label: "Europe du Sud" },
    options: [
      { value: "it", label: "Italie" },
      { value: "es", label: "Espagne" },
      { value: "pt", label: "Portugal" },
    ],
  },
  {
    group: { value: "central", label: "Europe centrale" },
    options: [{ value: "pl", label: "Pologne" }],
  },
  {
    group: { value: "north", label: "Europe du Nord" },
    options: [{ value: "se", label: "Suède" }],
  },
];
