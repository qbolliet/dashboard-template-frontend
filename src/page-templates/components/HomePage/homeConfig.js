// Configuration data loader for home page
import homeData from '@config/content/home.json';
import { resolveLocalized } from '@/utils/i18n/resolveLocalized';
import { DEFAULT_LOCALE } from '@/i18n/config';
import { DEMO_BASE_PATH } from '@/utils/navigation/basePaths';

// =================================================================
// HOME CONFIG — lecture du contenu rédigé de la page d'accueil
// =================================================================
// Depuis P5.4, tout champ de texte de config/content/home.json accepte soit une chaîne
// (identique dans toutes les langues), soit un objet `{ fr, en }`. C'est ce loader qui
// aplatit la forme, et lui seul : `HomePage` et les composants qu'il assemble
// (`Hero`, `LinkCardsSection`) continuent de recevoir des chaînes et n'ont rien appris
// de l'internationalisation.
//
// Ce qui n'est pas traduit, et ne doit pas l'être : `image`, `id`, `cardsPerRow`.
//
// Les `link` ne sont pas traduits non plus, mais ils sont PRÉFIXÉS : dans home.json ils
// s'écrivent comme les chemins du manifeste (`/comptabilite-nationale/france/pib`), sans
// langue ni point de montage, et `resolveLink` ajoute `${DEMO_BASE_PATH}/${locale}` — le
// même préfixe que celui qu'applique resolveNavigationTree à l'arbre (cf. layout.jsx).
// Un lien ne peut donc pas pointer vers la mauvaise langue, ni se périmer au déplacement
// de l'application (eject), et validate:config vérifie qu'il désigne un nœud existant.

/**
 * Prefixes a manifest path with the mount point and the locale.
 *
 * Absolute URLs and anchors pass through untouched.
 *
 * @param {string} link - Path of a manifest node ('/' for the home node), or an external URL.
 * @param {string} locale - Site locale code.
 * @returns {string} The href to render.
 */
const resolveLink = (link, locale) => {
  if (typeof link !== 'string' || !link.startsWith('/')) return link;
  const prefix = `${DEMO_BASE_PATH}/${locale}`;
  return link === '/' ? prefix : prefix + link;
};

/**
 * Resolves the localized fields of every card.
 *
 * @param {string} locale - Site locale code.
 * @returns {Array<Object>} The cards, with plain-string title and description.
 */
const resolveCards = (locale) =>
  homeData.cards.map((card) => ({
    ...card,
    link: resolveLink(card.link, locale),
    title: resolveLocalized(card.title, locale, DEFAULT_LOCALE),
    description: resolveLocalized(card.description, locale, DEFAULT_LOCALE),
  }));

/**
 * Resolves the localized fields of the cards section header.
 *
 * @param {string} locale - Site locale code.
 * @returns {Object} The section config, with plain-string title and description.
 */
const resolveCardsSection = (locale) => ({
  ...homeData.cardsSection,
  title: resolveLocalized(homeData.cardsSection.title, locale, DEFAULT_LOCALE),
  description: resolveLocalized(homeData.cardsSection.description, locale, DEFAULT_LOCALE),
});

/**
 * Get home page configuration data, resolved for a locale.
 *
 * @param {string} [locale=DEFAULT_LOCALE] - Site locale code.
 * @returns {Object} Home page data including hero and cards sections, every text field
 *   collapsed to a plain string.
 */
export const getHomeConfig = (locale = DEFAULT_LOCALE) => ({
  hero: getHeroConfig(locale),
  cards: resolveCards(locale),
  cardsSection: resolveCardsSection(locale),
});

/**
 * Get hero section data, resolved for a locale.
 *
 * @param {string} [locale=DEFAULT_LOCALE] - Site locale code.
 * @returns {Object} Hero section configuration.
 */
export const getHeroConfig = (locale = DEFAULT_LOCALE) => ({
  ...homeData.hero,
  title: resolveLocalized(homeData.hero.title, locale, DEFAULT_LOCALE),
  description: resolveLocalized(homeData.hero.description, locale, DEFAULT_LOCALE),
  ctaButton: {
    ...homeData.hero.ctaButton,
    link: resolveLink(homeData.hero.ctaButton.link, locale),
    text: resolveLocalized(homeData.hero.ctaButton.text, locale, DEFAULT_LOCALE),
  },
});

/**
 * Get cards data and configuration, resolved for a locale.
 *
 * @param {string} [locale=DEFAULT_LOCALE] - Site locale code.
 * @returns {Object} Cards section data and configuration.
 */
export const getCardsConfig = (locale = DEFAULT_LOCALE) => ({
  cards: resolveCards(locale),
  ...resolveCardsSection(locale),
});
