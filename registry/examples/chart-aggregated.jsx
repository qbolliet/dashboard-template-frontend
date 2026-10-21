'use client';

/**
 * Barres agrégées par l'API — useAggregatedChart
 *
 * Une barre résume plusieurs lignes : le PIB de « France » est une valeur par pays, pas la
 * ligne d'un trimestre. Calculé sur la page de lignes chargée, ce regroupement serait faux
 * (il ne voit que 100 lignes) et ignorerait l'agrégation voulue de la mesure. `useAggregatedChart`
 * décide, d'après les métadonnées de colonnes (`fields`), qui agrège : pour les barres, les
 * barres horizontales, la heatmap et les lignes, c'est `getAggregates` qui calcule sur tout le
 * jeu filtré, avec la `defaultAggregation` de la mesure (ici AVG pour `gdp`, jamais une somme
 * de taux) ; pour le nuage, le violon et la densité, ce sont les lignes brutes.
 *
 * Le hook rend des props prêtes à étaler sur `<Chart>`. Parmi elles, `aggregate` dit au
 * graphique que ses données sont déjà agrégées : il trace chaque valeur telle quelle et ne les
 * regroupe pas une seconde fois. `<Chart>` ne fait aucune requête lui-même. Pour imposer une
 * autre agrégation, passer la mesure sous la forme `{ measure: 'gdp', aggregation: 'MAX' }`.
 * Un `structuredFilters` (le `FilterNode` du menu de critères) restreint le calcul au jeu
 * filtré.
 *
 * @item chart
 */

// Importation des modules
import { Chart, useAggregatedChart, useFactTable } from '@/features/chart';

const ChartAggregated = () => {
  // Les lignes brutes ne servent qu'au repli côté client ; `fields` décide du mode.
  const { rows, fields, loading: rowsLoading, error: rowsError } = useFactTable();
  const chart = useAggregatedChart({ x: 'country', measures: ['gdp'], fields, rows });

  const error = rowsError ?? chart.error;
  if (error) {
    return <p>Erreur de chargement : {String(error)}</p>;
  }

  if (rowsLoading || chart.loading) {
    return <p>Chargement des données API…</p>;
  }

  return (
    <>
      <Chart {...chart.chartProps} title="PIB moyen par pays — getAggregates" height={360} />
      {chart.truncated && <p>Le graphique est tronqué au plafond de groupes d’une requête.</p>}
    </>
  );
};

export default ChartAggregated;
