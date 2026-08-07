/**
 * Plage de dates avec calendrier double et curseur partagé
 *
 * `valueType="date"` combiné à `rangeMode` compose un unique calendrier double (une
 * plage "JJ/MM/AAAA → JJ/MM/AAAA") ; le slider projette les deux bornes sur un axe en
 * millisecondes (pas par défaut : un jour). `min`/`max` acceptent le même format
 * JJ/MM/AAAA que la saisie manuelle.
 *
 * @item constraint-field
 */

// Importation des modules
import ConstraintField from '@/components/filter/ConstraintField/ConstraintField';

const ConstraintFieldDateRange = () => (
  <ConstraintField
    valueType="date"
    rangeMode
    validate
    min="01/01/2024"
    max="31/12/2024"
  />
);

export default ConstraintFieldDateRange;
