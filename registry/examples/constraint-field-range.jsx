/**
 * Intervalle numérique borné
 *
 * `ConstraintField` associe deux saisies et un curseur double. Il fonctionne
 * sans être contrôlé : `defaultValueLow` / `defaultValueHigh` amorcent l'état
 * interne et `onChange` n'est là que pour observer.
 *
 * @item constraint-field
 */

// Importation des modules
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';

const ConstraintFieldRange = () => (
  <ConstraintField
    valueType="float"
    rangeMode
    min={0}
    max={50}
    step={0.1}
    defaultValueLow={5}
    defaultValueHigh={35}
    validate
  />
);

export default ConstraintFieldRange;
