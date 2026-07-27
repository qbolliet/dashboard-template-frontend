// Barrel du module de playground.
// Le dossier est préfixé « _ » : c'est un *private folder* au sens de l'App
// Router, donc jamais transformé en route. Ces contrôles ne servent qu'aux pages
// de démonstration — ils n'ont pas leur place dans src/components/.
export { CtrlRadio, CtrlSelect, CtrlToggle, CtrlText, CtrlNumber, CtrlColor } from './PlaygroundControls';
