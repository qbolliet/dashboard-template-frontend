/**
 * Drapeaux distants uniquement
 *
 * Par défaut, chaque drapeau est cherché dans `public/flags/<iso2>.svg` puis, à défaut,
 * sur flagcdn.com (`defaultFlagSrc`). Passer `flagSrc={flagCdnSrc}` court-circuite le
 * fichier local et ne garde que le CDN, avec le code pays en texte si celui-ci est
 * injoignable : la couture dans l'autre sens, utile pour un site qui ne veut pas
 * embarquer de SVG. `flagSrc` accepte aussi une liste d'URL, essayées dans l'ordre.
 *
 * @item language-switcher
 */

// Importation des modules
import { LanguageSwitcher, flagCdnSrc } from '@/features/i18n/components/LanguageSwitcher';

const LanguageSwitcherLocalFlags = () => <LanguageSwitcher flagSrc={flagCdnSrc} />;

export default LanguageSwitcherLocalFlags;
