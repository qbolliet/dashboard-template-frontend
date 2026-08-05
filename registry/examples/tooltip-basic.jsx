/**
 * Infobulle positionnée
 *
 * `Tooltip` enveloppe n'importe quel enfant focalisable et l'annonce au
 * survol comme au focus clavier. `position` place le panneau sur l'un des
 * quatre côtés.
 *
 * @item tooltip
 */

// Importation des modules
import Tooltip from '@/components/filter/Tooltip/Tooltip';

const TooltipBasic = () => (
  <Tooltip content="Part du PIB, en pourcentage" position="top">
    <button type="button">Dette publique</button>
  </Tooltip>
);

export default TooltipBasic;
