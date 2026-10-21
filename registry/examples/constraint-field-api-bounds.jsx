/**
 * Bornes résolues via l'API (useRangeBounds)
 *
 * Sans `min`/`max`/`step` explicites, ConstraintField interroge `useRangeBounds` via
 * `fieldName` : les bornes du slider sont le `min` / `max` de `getFieldStats` (le mock
 * local les calcule lui aussi), et le pas se déduit de la famille de type et du
 * `displayFormat` de la colonne. Une prop explicite resterait prioritaire.
 *
 * Pour recaler les bornes sur le jeu filtré, passez aussi `structuredFilters` : le
 * `FilterNode` produit par `toFilterNode`, le même que celui envoyé à la table et au
 * graphique. Sans lui, ce sont les bornes de toute la table.
 *
 * @item constraint-field
 */

// Importation des modules
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';

const ConstraintFieldApiBounds = () => (
  <ConstraintField valueType="float" rangeMode fieldName="gdp" />
);

export default ConstraintFieldApiBounds;
