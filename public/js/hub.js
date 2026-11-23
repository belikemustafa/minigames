import { initChrome, state, getArcadeRank } from './core.js';

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
  careers: (b.careerSalary || 0) * 100 + (b.careerTools || 0) + (b.careerSpotle || 0) + (b.careerDay || 0),
  cartoons: (b.cartoonUnblur || 0) + (b.cartoonPlot || 0) + (b.cartoonDuel || 0) * 100 + (b.cartoonVoice || 0),
  dev: (b.devStars || 0) * 100 + (b.devBug || 0) + (b.devOutput || 0) + (b.devLang || 0) + (b.devBigO || 0) + (b.devHttp || 0) + (b.devOutage || 0),
  blitz: b.blitz || 0,
};

Object.entries(sums).forEach(([k, v]) => {
  const el = document.getElementById(`best-cat-${k}`);
  if (el) el.textContent = v;
});
