/**
 * Drapeaux auto-hébergés
 *
 * `flagSrc` remplace la source des drapeaux : ici des SVG locaux servis depuis
 * `public/flags/<iso2>.svg`, résolus via `withBasePath` pour rester valides une
 * fois le site déployé sous un sous-chemin — la couture qui permet de se passer
 * de flagcdn.com. Les huit drapeaux des langues par défaut sont fournis avec
 * l'exemple ; pour une autre langue, ajoutez simplement `public/flags/<iso2>.svg`
 * (sans fichier, la pastille retombe sur le code pays).
 *
 * @item language-switcher
 * @asset /flags/de.svg
 * @asset /flags/es.svg
 * @asset /flags/fr.svg
 * @asset /flags/gb.svg
 * @asset /flags/it.svg
 * @asset /flags/jp.svg
 * @asset /flags/nl.svg
 * @asset /flags/pt.svg
 */

// Importation des modules
import { LanguageSwitcher } from '@/features/i18n/components/LanguageSwitcher';
import { withBasePath } from '@/utils/url/withBasePath';

const LanguageSwitcherLocalFlags = () => (
  <LanguageSwitcher flagSrc={(country) => withBasePath(`/flags/${country.toLowerCase()}.svg`)} />
);

export default LanguageSwitcherLocalFlags;
