// =================================================================
// MOCK DATA — SelectMenu
// =================================================================
// Données fictives en attendant le branchement sur l'API GraphQL.
// Forme cible des appels réels (signatures conservées pour faciliter la
// migration) :
//   getSelectOptions({ fieldName, searchTerm, limit, catalog })
//   getGroupedSelectOptions({ groupField, optionsField, limit })

// Mock plat : liste simple d'options { value, label }.
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
