import buyHeroBg from '../assets/buy_hero_bg.png';
import rentHeroBg from '../assets/rent_bg_hero.png';
import commercialHeroBg from '../assets/commercial_hero_section.png';
import pgHeroBg from '../assets/pg_hero_bg.png';
import plotsHeroBg from '../assets/plots_hero_bg.png';

export const HERO_BACKGROUNDS = {
  sale: buyHeroBg,
  rent: rentHeroBg,
  commercial: commercialHeroBg,
  pg: pgHeroBg,
  plots: plotsHeroBg,
};

export const DEFAULT_HERO_BG = buyHeroBg;

export function getHeroBackground(tab) {
  return HERO_BACKGROUNDS[tab] || DEFAULT_HERO_BG;
}
