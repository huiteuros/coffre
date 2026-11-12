// Formules du jeu : tout l'équilibrage est ici. Fonctions pures qui lisent S, sans toucher à la page.
import { S, GROWTH, BOSS_EVERY, BOSS_TIME, PRESTIGE_AT, LEGEND_AT } from './state.js';
import { ITEMS, PERKS, CHALLENGES } from './data.js';

export const perk = id => (S.perks && S.perks[id]) || 0;
export const owned = id => S.owned[id] || 0;
export const isBoss = n => n % BOSS_EVERY === 0;
export const isLegend = n => n === LEGEND_AT;
export const achCount = () => Object.keys(S.ach || {}).length;

// Défis : niveau réussi, défi en cours, objectif du prochain niveau
export const chalLevel = id => (S.chal && S.chal[id]) || 0;
export const inChal = id => S.challenge === id;
export const chalTarget = c => c.targets[chalLevel(c.id)];
export const chalLevels = () => CHALLENGES.reduce((s, c) => s + chalLevel(c.id), 0);
export const chalUnlocked = () => S.runs >= 1;

// Bonus des lingots gagnés : +10 % chacun jusqu'à 100, puis croissance ralentie en puissance 0,85
// (×11 à 100 lingots, ×34 à 400, ×106 à 1 600, ×279 à 5 000)
export const lingotBonus = () => {
  const L = S.lingotsEarned;
  return L <= 100 ? 0.1 * L : 10 * Math.pow(L / 100, 0.85);
};
// Défi « Sans soutien » : ni bonus des lingots ni Réseau de recel
const lingotMult = () => inChal('nolingot') ? 1 : (1 + lingotBonus()) * Math.pow(1.1, perk('network'));
export const mult = () => lingotMult() * (1 + 0.02 * achCount());
export const alarmTime = () => BOSS_TIME + 5 * perk('time') + 4 * chalLevel('nofleeing') - (inChal('nofleeing') ? 10 : 0);
// Chambres fortes : ×2 de résistance ; le coffre légendaire ajoute ×2
const vaultScale = n => 15 * Math.pow(1.47, n - 1);
export const resistance = n => vaultScale(n) * (isBoss(n) ? 2 : 1) * (isLegend(n) ? 2 : 1) * (1 - 0.05 * perk('resist'));
// Le butin reste calé sur la résistance d'origine : les Plans des serrures ne réduisent pas l'or
export const bossLoot = () => 3 + 1.5 * perk('boss');
export const reward = n => vaultScale(n) * 0.6 * (isBoss(n) ? bossLoot() : 1) * (isLegend(n) ? 20 : 1) * mult()
  * (1 + 0.25 * perk('gold')) * (1 + 0.25 * chalLevel('speed'));
export const critMult = () => 8 + 2 * perk('crit');
export const critChance = () => 0.04 + 0.03 * owned('fingers');
export const jackChance = () => 0.04 + 0.02 * perk('jack');
export const digitsFor = n => Math.min(3 + Math.floor((n - 1) / 6), 8);
export const lingotsGain = () => S.best < PRESTIGE_AT ? 0
  : Math.floor(Math.pow((S.best - 15) / 5, 1.6) * (1 + 0.1 * perk('heist')) * (1 + 0.1 * chalLevel('nolingot')));

// Production : rendement doublé tous les 25 exemplaires
export const milestone = c => Math.pow(2, Math.floor(c / 25));
export const itemOut = it => it.base * owned(it.id) * milestone(owned(it.id));
// Outil de fin de partie dont le contact n'est pas acheté ; un outil déjà possédé (anciennes parties) reste accessible
export const contactMissing = it => !!it.unlock && owned(it.id) === 0 && !perk(it.unlock);
// Défi « À l'ancienne » : seuls quelques outils sont autorisés
export const bannedByChal = it => inChal('basic') && !CHALLENGES.find(c => c.id === 'basic').allowed.includes(it.id);
export const gated = it => contactMissing(it) || bannedByChal(it);
// Récompenses de défis sur le matériel : « Mains dans les poches » ×1,25 et « À l'ancienne » +15 % par niveau
const toolMult = () => Math.pow(1.25, chalLevel('noclick')) * (1 + 0.15 * chalLevel('basic'));
export const dps = () => ITEMS.filter(i => i.kind === 'auto').reduce((s, i) => s + itemOut(i), 0) * mult() * toolMult();
export const perClick = () => (1 + itemOut(ITEMS[0])) * mult() + dps() * (0.02 + 0.02 * perk('click'));

// Prix
export const costOf = (it, k) => it.cost * Math.pow(it.growth || GROWTH, owned(it.id) + k)
  * (1 - 0.03 * perk('cheap')) * (1 - 0.04 * chalLevel('poor')) * (inChal('poor') ? 10 : 1);
export function buyPlan(it, q) {
  const left = it.max ? it.max - owned(it.id) : Infinity;
  if (left <= 0) return { n: 0, cost: Infinity };
  let n = q === 'max' ? Infinity : q;
  n = Math.min(n, left);
  let total = 0, k = 0;
  while (k < n && k < 1000) {
    const c = costOf(it, k);
    if (q === 'max' && total + c > S.gold) break;
    total += c; k++;
  }
  if (q === 'max' && k === 0) return { n: 1, cost: costOf(it, 0) };
  return { n: k, cost: total };
}

// Outil auto débloqué au meilleur coût par point de crochetage/s gagné (paliers ×2 inclus)
export function bestAuto(q) {
  let best = null, bestRatio = Infinity;
  ITEMS.forEach(it => {
    if (it.kind !== 'auto' || gated(it)) return;
    const c = owned(it.id);
    if (!(c > 0 || S.totalGold >= it.cost * 0.5)) return;
    const p = buyPlan(it, q);
    const gain = it.base * ((c + p.n) * milestone(c + p.n) - c * milestone(c));
    const ratio = p.cost / gain;
    if (gain > 0 && ratio < bestRatio) { bestRatio = ratio; best = it.id; }
  });
  return best;
}

// Receleur
// Un avantage est bloqué tant que l'avantage requis manque ou que le record de coffre est insuffisant
export const perkBlocked = pk => !!(pk.req && !perk(pk.req)) || !!(pk.minVault && bestVault() < pk.minVault);
export const perkLevels = () => PERKS.reduce((s, p) => s + perk(p.id), 0);
export const perkMaxed = id => perk(id) >= PERKS.find(p => p.id === id).max;
// « Tout le receleur » : les avantages sans limite n'en font pas partie
export const allPerksMaxed = () => PERKS.every(p => !isFinite(p.max) || perk(p.id) >= p.max);
// Lingots dépensés, recalculés depuis les niveaux achetés
export const lingotsSpent = () => PERKS.reduce((s, p) => { for (let l = 0; l < perk(p.id); l++) s += p.cost(l); return s; }, 0);
export const perksBuyable = () => PERKS.filter(p => perk(p.id) < p.max && !perkBlocked(p) && S.lingots >= p.cost(perk(p.id))).length;

// Divers, pour les succès et le carnet
export const bestVault = () => Math.max(S.best, S.bestEver || 0) - 1;
export const autoCount = () => ITEMS.filter(i => i.kind === 'auto').reduce((s, i) => s + owned(i.id), 0);
