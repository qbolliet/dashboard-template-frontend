/**
 * Bornes résolues via l'API (useRangeBounds)
 *
 * Sans `min`/`max`/`step` explicites, ConstraintField interroge `useRangeBounds` via
 * `fieldName` : les bornes du slider sont le `min` / `max` de `getFieldStats` (le mock
 * local les calcule lui aussi), et le pas se déduit de la famille de type et du
 * `displayFormat` de la colonne. Une prop explicite resterait prioritaire.
 *
 * Pour borner le slider à un périmètre (le pays de la page, par exemple), passez aussi
 * `scopeFilters` : un `FilterNode`, envoyé à getFieldStats. Sans lui, ce sont les bornes de
 * toute la colonne. Un périmètre, jamais le filtre que ce champ alimente : ses bornes se
 * refermeraient sur la sélection.
 *
 * @item constraint-field
 */

// Importation des modules
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';

const ConstraintFieldApiBounds = () => (
  <ConstraintField valueType="float" rangeMode fieldName="gdp" />
);

export default ConstraintFieldApiBounds;
