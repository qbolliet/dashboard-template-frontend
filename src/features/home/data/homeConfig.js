// Configuration data loader for home page
import homeData from'../../../../config/content/home.json';

/**
 * Get home page configuration data
 * 
 * @returns {Object} Home page data including hero and cards sections
 */
export const getHomeConfig = () => {
  return homeData;
};

/**
 * Get hero section data
 * 
 * @returns {Object} Hero section configuration
 */
export const getHeroConfig = () => {
  return homeData.hero;
};

/**
 * Get cards data and configuration
 * 
 * @returns {Object} Cards section data and configuration
 */
export const getCardsConfig = () => {
  return {
    cards: homeData.cards,
    ...homeData.cardsSection
  };
};