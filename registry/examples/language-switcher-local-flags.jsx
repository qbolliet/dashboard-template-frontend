/**
 * Drapeaux auto-hébergés
 *
 * `flagSrc` remplace la source des drapeaux : ici des SVG locaux attendus
 * sous `public/flags/<iso2>.svg`, résolus via `withBasePath` pour rester
 * valides une fois le site déployé sous un sous-chemin — la couture qui
 * permet de se passer de flagcdn.com. Tant que ces fichiers ne sont pas
 * fournis, chaque pastille retombe sur son repli textuel (le code pays),
 * sans erreur ni image cassée.
 *
 * @item language-switcher
 */

// Importation des modules
import { LanguageSwitcher } from '@/features/i18n/components/LanguageSwitcher';
import { withBasePath } from '@/utils/url/withBasePath';

const LanguageSwitcherLocalFlags = () => (
  <LanguageSwitcher flagSrc={(country) => withBasePath(`/flags/${country.toLowerCase()}.svg`)} />
);

export default LanguageSwitcherLocalFlags;
