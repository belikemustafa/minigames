import { initChrome, state, getArcadeRank, animateNumber } from './core.js';

initChrome('hub');

const hour = new Date().getHours();
const greeting = document.getElementById('welcome-greeting');
if (greeting) {
  if (hour < 12) greeting.textContent = 'Good Morning — Pick Your Arena';
  else if (hour < 17) greeting.textContent = 'Good Afternoon — Ready to Play?';
  else greeting.textContent = 'Good Evening — Welcome to Fandom Arcade';
}

const rankEl = document.getElementById('arcade-rank');
if (rankEl) rankEl.textContent = `Rank: ${getArcadeRank()}`;

const b = state.bests;
const sums = {
  movies: (b.moviesUnblur || 0) + (b.moviesCast || 0),
  anime: (b.animeDuel || 0) * 100 + (b.animeChars || 0),
  pokemon: (b.pokeWho || 0) + (b.pokeClash || 0) * 100,
  food: (b.foodCompass || 0) + (b.foodIng || 0) + (b.foodMacro || 0) * 100 + (b.foodBracket || 0),
  cartoons: (b.cartoonUnblur || 0) + (b.cartoonDuel || 0) * 100,
  dev: (b.devStars || 0) * 100 + (b.devBug || 0) + (b.devOutput || 0) + (b.devLang || 0) + (b.devBigO || 0) + (b.devHttp || 0) + (b.devOutage || 0),
  geography: (b.geoFlags || 0) + (b.geoDuel || 0) * 100 + (b.geoWeather || 0),
  auto: (b.autoSpecs || 0) * 100 + (b.autoUnblur || 0) + (b.autoSound || 0),
  blitz: b.blitz || 0,
};

Object.entries(sums).forEach(([k, v]) => {
  const el = document.getElementById(`best-cat-${k}`);
  if (el) {
    if (v > 0) animateNumber(el, 0, v, { duration: 600, locale: true });
    else el.textContent = '0';
  }
});
