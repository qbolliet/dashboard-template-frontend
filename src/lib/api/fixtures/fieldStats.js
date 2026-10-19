// =================================================================
// FIXTURE — FieldStats (getFieldStats / Metadata.stats)
// =================================================================
// Statistiques d'une colonne sur toute la table des faits : `{ min, max,
// distinctCount, nullCount }`. Comme côté API, `min` / `max` suivent la
// sérialisation du scalaire JSON — nombre, date ISO `YYYY-MM-DD`, ou texte (ordre
// lexical) sur une colonne VARCHAR. Valeurs STATIQUES : le serveur mock ne tire
// jamais rien au hasard. Pour les colonnes présentes dans les lignes des fixtures,
// elles sont celles que donneraient ces lignes (verrouillé par fixtures.test.js).

/**
 * Stats of the documentary catalogue (`factTable.json`), keyed by column name.
 *
 * @type {Record<string, {min: *, max: *, distinctCount: number, nullCount: number}>}
 */
export const CATALOGUE_FIELD_STATS = {
  id: { min: 1, max: 20, distinctCount: 20, nullCount: 0 },
  code: { min: 'BUILD.M', max: 'WAGE.T', distinctCount: 20, nullCount: 0 },
  indicator: { min: 'Balance commerciale', max: 'Émissions CO₂', distinctCount: 20, nullCount: 0 },
  sector: { min: 'Commerce', max: 'Services', distinctCount: 9, nullCount: 0 },
  source: { min: 'BCE', max: 'SDES', distinctCount: 7, nullCount: 0 },
  frequency: { min: 'Annuel', max: 'Trimestriel', distinctCount: 4, nullCount: 0 },
  lastUpdate: { min: '2025-12-31', max: '2026-05-22', distinctCount: 10, nullCount: 0 },
  observations: { min: 28, max: 6420, distinctCount: 20, nullCount: 0 },
  status: { min: 'actif', max: 'wip', distinctCount: 3, nullCount: 0 },
  montant: { min: 2800, max: 642000, distinctCount: 20, nullCount: 0 },
};

/**
 * Stats of the macro demo catalog, keyed by column name. Columns absent from the
 * chart rows (`inflation`, `chomage`…) carry plausible whole-table bounds.
 *
 * @type {Record<string, {min: *, max: *, distinctCount: number, nullCount: number}>}
 */
export const MACRO_FIELD_STATS = {
  gdp: { min: 98, max: 112.2, distinctCount: 18, nullCount: 0 },
  inflation: { min: -0.5, max: 9.7, distinctCount: 96, nullCount: 0 },
  chomage: { min: 3.1, max: 12.4, distinctCount: 84, nullCount: 0 },
  dette_pib: { min: 58.2, max: 142.6, distinctCount: 72, nullCount: 0 },
  prod_indus: { min: 82.4, max: 118.9, distinctCount: 110, nullCount: 0 },
  taux_dir: { min: 0, max: 4.5, distinctCount: 31, nullCount: 0 },

  date_obs: { min: '2023-01-01', max: '2024-04-01', distinctCount: 6, nullCount: 0 },
  date_pub: { min: '2023-02-15', max: '2024-05-15', distinctCount: 6, nullCount: 0 },
  date_rev: { min: '2023-05-15', max: '2024-06-14', distinctCount: 6, nullCount: 4 },
  date_maj: { min: '2024-05-20', max: '2024-06-30', distinctCount: 12, nullCount: 0 },

  indicator: { min: 'conso', max: 'taux_dir', distinctCount: 8, nullCount: 0 },
  indicator_label: { min: 'Consommation', max: 'Taux directeur', distinctCount: 8, nullCount: 0 },
  sector: { min: 'Agriculture', max: 'Énergie', distinctCount: 5, nullCount: 0 },
  region: { min: 'africa', max: 'na', distinctCount: 4, nullCount: 0 },
  region_label: { min: 'Afrique', max: 'Union européenne', distinctCount: 4, nullCount: 0 },
  type_orga: { min: 'Associatif', max: 'Public', distinctCount: 3, nullCount: 0 },
  frequence: { min: 'Annuel', max: 'Trimestriel', distinctCount: 3, nullCount: 0 },
  country: { min: 'Allemagne', max: 'Italie', distinctCount: 3, nullCount: 0 },

  libelle: { min: 'Croissance trimestrielle', max: 'Taux de chômage', distinctCount: 40, nullCount: 0 },
  commentaire: { min: 'Révisé à la baisse', max: 'Série provisoire', distinctCount: 12, nullCount: 63 },
  source: { min: 'BCE', max: 'OCDE', distinctCount: 4, nullCount: 0 },
  note: { min: 'Rupture de série en 2024', max: 'Valeur estimée', distinctCount: 6, nullCount: 88 },
};
