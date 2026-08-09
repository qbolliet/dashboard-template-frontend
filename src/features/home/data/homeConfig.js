// Configuration data loader for home page
import homeData from '@config/content/home.json';
import { resolveLocalized } from '@/utils/i18n/resolveLocalized';
import { DEFAULT_LOCALE } from '@/i18n/config';

// =================================================================
// HOME CONFIG — lecture du contenu rédigé de la page d'accueil
// =================================================================
// Depuis P5.4, tout champ de texte de config/content/home.json accepte soit une chaîne
// (identique dans toutes les langues), soit un objet `{ fr, en }`. C'est ce loader qui
// aplatit la forme, et lui seul : `HomePage` et les composants qu'il assemble
// (`Hero`, `LinkCardsSection`) continuent de recevoir des chaînes et n'ont rien appris
// de l'internationalisation.
//
// Ce qui n'est PAS résolu, et ne doit pas l'être : `link`, `image`, `id`,
// `cardsPerRow`. Un chemin d'URL ou une image ne se traduit pas — la langue est portée
// par un segment distinct, en amont.

/**
 * Resolves the localized fields of every card.
 *
 * @param {string} locale - Site locale code.
 * @returns {Array<Object>} The cards, with plain-string title and description.
 */
const resolveCards = (locale) =>
  homeData.cards.map((card) => ({
    ...card,
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
