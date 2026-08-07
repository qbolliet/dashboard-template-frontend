/**
 * Bornes résolues via l'API (useRangeBounds)
 *
 * Sans `min`/`max`/`step` explicites, ConstraintField interroge `useRangeBounds` via
 * `fieldName` : les bornes du slider et son pas viennent alors de l'API (ou des
 * fixtures locales en mode démo), pas de props statiques. Une prop explicite
 * resterait prioritaire si elle était fournie.
 *
 * @item constraint-field
 */

// Importation des modules
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';

const ConstraintFieldApiBounds = () => (
  <ConstraintField valueType="float" rangeMode fieldName="gdp" />
);

export default ConstraintFieldApiBounds;
