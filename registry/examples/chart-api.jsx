'use client';

/**
 * Données API — branchement direct de useFactTable sur <Chart>
 *
 * `useFactTable()` renvoie des lignes au format long (`getFactTableWithMetadata`,
 * `format: OBJECTS`) directement consommables par `<Chart>` : aucun
 * reformatage. La colonne `date_obs` arrive en chaîne ISO — c'est `coerce()`,
 * en interne au composant, qui la convertit en date. Le hook expose aussi
 * `loading`/`error` : le rendu se décompose donc en trois branches (erreur,
 * chargement, succès) plutôt que de masquer l'attente derrière des données
 * de démonstration.
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
  const { rows, metadata, loading, error } = useFactTable();

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
        format={{ x: '%Y-%m', y: '.1f' }}
        labels={{ x: "Date d'observation", y: 'PIB (indice)', color: 'Pays' }}
        title={`PIB par pays — getFactTableWithMetadata (${TRANSPORT_NAME})`}
        toolbar={toolbar}
        height={420}
      />
      {metadata && (
        <p>
          {metadata.count} lignes · extents PIB [{metadata.extents?.gdp?.join(' ; ')}] (issus de metadata.extents)
        </p>
      )}
    </>
  );
};

export default ChartApi;
