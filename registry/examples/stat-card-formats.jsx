/**
 * Formats & variantes
 *
 * Cinq réglages indépendants du même composant : `valueTone` teinte le chiffre,
 * l'absence d'`icon` laisse le chiffre occuper toute la ligne, `badge.direction`
 * pilote aussi bien la flèche vers le bas que l'état neutre ("flat"),
 * `badge.showArrow` la masque complètement, et `format.prefix`/`format.suffix`
 * entourent la valeur formatée (utile pour une unité qui n'est pas un symbole
 * monétaire ou un pourcentage).
 *
 * @item stat-card
 * @item card-grid
 */

// Importation des modules
import { StatCard, CardGrid } from '@/components/ui';
import { PulseIcon, UsersIcon, CalendarIcon } from '@/components/icons';

const StatCardFormats = () => (
  <CardGrid perRow={3}>
    {/* valueTone teinte le chiffre lui-même ; badge.direction="down" affiche la flèche descendante */}
    <StatCard
      title="Taux de conversion"
      value={-2.7}
      format={{ style: 'percent', decimals: 1 }}
      valueTone="negative"
      icon={<PulseIcon />}
      iconTone="negative"
      badge={{ value: '-2,7 pt', direction: 'down' }}
      footerTitle="En repli"
      footerNote="Comparé au trimestre précédent"
    />
    {/* Sans prop icon : le chiffre occupe toute la largeur de la ligne */}
    <StatCard
      title="Sans icône"
      value={48210}
      format={{ compact: true }}
      footerTitle="Le chiffre occupe toute la ligne"
      footerNote="Aucune icône fournie"
    />
    {/* badge.direction="flat" : état neutre, ni hausse ni baisse */}
    <StatCard
      title="Utilisateurs actifs"
      value={12480}
      icon={<UsersIcon />}
      iconTone="neutral"
      badge={{ value: 'stable', direction: 'flat' }}
      footerTitle="Stable"
      footerNote="±0,3 % sur 6 mois"
    />
    {/* badge.showArrow={false} : la pilule garde sa couleur mais perd la flèche */}
    <StatCard
      title="Statut du service"
      value={1}
      format={{ unit: 'incident' }}
      icon={<PulseIcon />}
      iconTone="primary"
      badge={{ value: 'Stable', tone: 'neutral', showArrow: false }}
      footerTitle="Aucune escalade en cours"
      footerNote="Dernier incident : il y a 14 jours"
    />
    {/* format.prefix / format.suffix : encadrent la valeur formatée pour une unité libre */}
    <StatCard
      title="Délai moyen de traitement"
      value={12.4}
      format={{ prefix: '~', suffix: ' j', decimals: 1 }}
      icon={<CalendarIcon />}
      iconTone="warning"
      footerTitle="Délai moyen de traitement"
      footerNote="Objectif : < 10 j"
    />
  </CardGrid>
);

export default StatCardFormats;
