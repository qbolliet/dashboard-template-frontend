// =================================================================
// COQUILLE DE RÉEXPORT — transitoire, à supprimer en P4.6
// =================================================================
// Les contrôles vivent désormais dans la feature de documentation :
// src/features/docs/components/PlaygroundControls/. C'est là que le motif monte, comme
// prévu par le §5.2 de TEMPLATIZATION_ARCHITECTURE.md — le playground de documentation
// remplace les pages /test-*.
//
// Ce fichier ne subsiste que parce que les 5 pages /test-* survivantes l'importent
// encore, et que le §9 impose de ne les supprimer qu'en TOUTE FIN de lot 4 (elles
// restent jusque-là la seule surface de vérification visuelle de plusieurs composants).
// Il ne contient AUCUNE implémentation : la règle « il ne doit exister qu'un seul jeu de
// contrôles dans le dépôt » est donc déjà respectée.
//
// P4.6 supprime les pages /test-*, puis ce dossier entier.
export {
    CtrlRadio,
    CtrlSelect,
    CtrlToggle,
    CtrlText,
    CtrlNumber,
    CtrlColor,
} from '@/features/docs/components/PlaygroundControls/PlaygroundControls';
