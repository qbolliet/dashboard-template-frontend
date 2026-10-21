'use client';

/**
 * Données API — branchement direct de useFactTable sur <Chart>
 *
 * `useFactTable()` renvoie des lignes au format long (`getFactTableWithMetadata`,
 * `format: OBJECTS`) directement consommables par `<Chart>` : aucun
 * reformatage. Il renvoie aussi `fields`, les métadonnées de ces colonnes, que l'on passe
 * telles quelles à `<Chart fields>` : le type de chaque colonne vient alors de sa
 * `typeFamily` (une chaîne ISO est une date, un code reste un code) au lieu d'être deviné
 * sur un échantillon, et l'axe et l'infobulle d'une mesure suivent son `displayFormat` et
 * son `unit` — plus de `format={{ y: '.1f' }}` écrit à la main. Une prop `format` explicite
 * l'emporterait. Le hook expose aussi `loading`/`error` : le rendu se décompose donc en
 * trois branches (erreur, chargement, succès) plutôt que de masquer l'attente derrière des
 * données de démonstration.
 *
 * Pour tracer des barres, des empilements ou une heatmap sur tout le jeu filtré plutôt que
 * sur une page de lignes, c'est `useAggregatedChart` qui interroge `getAggregates` et pose
 * la prop `aggregate` (cf. le guide « Brancher l'API GraphQL »).
 *
 * @item chart
 */

// Importation des modules
import { Chart, ChartsFeatures as F, useFactTable } from '@/features/chart';
import { TRANSPORT_NAME } from '@/lib/api/client';

// Référence de module figée : cf. les autres exemples chart-*.jsx pour la raison
// (stabilité d'identité requise par le React Compiler pour la prop `toolbar`).
const toolbar = [F.zoom(), F.minimaps()];

const ChartApi = () => {
  const { rows, fields, metadata, loading, error } = useFactTable();

  if (error) {
    return <p>Erreur de chargement : {String(error)}</p>;
  }

  if (loading) {
    return <p>Chargement des données API…</p>;
  }

  return (
    <>
      <Chart
        data={rows}
        x="date_obs"
        y="gdp"
        hue="country"
        fields={fields}
        format={{ x: '%Y-%m' }}
        labels={{ x: "Date d'observation", y: 'PIB (indice)', color: 'Pays' }}
        title={`PIB par pays — getFactTableWithMetadata (${TRANSPORT_NAME})`}
        toolbar={toolbar}
        height={420}
      />
      {metadata && (
        <p>
          {metadata.count} lignes affichées sur {metadata.total} · PIB de {metadata.extents?.gdp?.join(' à ')} sur
          cette page (metadata.extents ne couvre que la page ; les bornes du jeu entier viennent de getFieldStats)
        </p>
      )}
    </>
  );
};

export default ChartApi;
