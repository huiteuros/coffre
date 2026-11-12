// Règles qui modifient l'état sans toucher à la page : partagées par le jeu et le script de simulation
import { S, replaceState } from './state.js';
import { CHALLENGES } from './data.js';
import { perk, owned, chalLevel, chalTarget } from './formulas.js';

// Cavale : on repart de zéro en gardant lingots, avantages, succès, défis et compteurs à vie
export function applyPrestige(gain) {
  const fingers = owned('fingers');
  replaceState({
    lingots: S.lingots + gain, lingotsEarned: S.lingotsEarned + gain, perks: S.perks, autoOn: S.autoOn,
    runs: S.runs + 1, opened: S.opened, clicks: S.clicks, totalGold: S.totalGold, muted: S.muted, bestEver: Math.max(S.bestEver || 0, S.best),
    ach: S.ach, crits: S.crits, jackpots: S.jackpots, alarmsFailed: S.alarmsFailed, clutch: S.clutch, fled: S.fled, watched: S.watched,
    chal: S.chal, chalFails: S.chalFails
  });
  // Avantages appliqués au départ de la nouvelle cavale
  if (perk('fingers')) S.owned.fingers = fingers;
  if (perk('start')) S.gold = 100 * Math.pow(10, perk('start') - 1);
  if (perk('plans')) S.vault = S.best = 1 + 5 * perk('plans');
}

// ---------- Défis ----------
export const challengeById = id => CHALLENGES.find(c => c.id === id);

// Lancer un défi = prendre la cavale (avec ses lingots s'il y en a) puis repartir sous contrainte
export function startChallenge(id, gain) {
  applyPrestige(gain);
  const c = challengeById(id);
  S.challenge = id;
  S.chalLeft = c.time || 0;
  if (id === 'noclick') S.owned.drill = Math.max(1, owned('drill'));
}

export function endChallenge() {
  S.challenge = null;
  S.chalLeft = 0;
}

// À appeler régulièrement : renvoie { done: défi, level } quand l'objectif est atteint, { failed: défi } si le temps est écoulé
export function challengeTick(dt) {
  if (!S.challenge) return null;
  const c = challengeById(S.challenge);
  if (S.best - 1 >= chalTarget(c)) {
    S.chal[c.id] = chalLevel(c.id) + 1;
    endChallenge();
    return { done: c, level: chalLevel(c.id) };
  }
  if (c.time) {
    S.chalLeft -= dt;
    if (S.chalLeft <= 0) { S.chalFails++; endChallenge(); return { failed: c }; }
  }
  return null;
}
