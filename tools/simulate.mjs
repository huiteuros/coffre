// Simulation d'équilibrage : fait jouer un « joueur type » à vitesse accélérée avec les vraies formules du jeu.
// Usage : node tools/simulate.mjs [--cps=3] [--hours=80] [--stuck=10] [--quiet]
//   --cps    clics par seconde du joueur (0 = joueur qui laisse tourner)
//   --hours  durée maximale simulée
//   --stuck  minutes sans nouveau record avant de prendre la cavale
import { S, LEGEND_AT } from '../js/state.js';
import { ITEMS, PERKS, CHALLENGES } from '../js/data.js';
import { ACH } from '../js/achievements.js';
import {
  perk, owned, isBoss, alarmTime, resistance, reward, critChance, critMult, jackChance, perClick,
  dps, mult, milestone, gated, costOf, perkBlocked, lingotsGain, achCount, allPerksMaxed,
  inChal, chalLevel, chalTarget, chalLevels
} from '../js/formulas.js';
import { applyPrestige, startChallenge, endChallenge, challengeTick } from '../js/rules.js';
import { fmt } from '../js/format.js';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d; };
const CPS = arg('cps', 3), HOURS = arg('hours', 80), STUCK = arg('stuck', 10) * 60;
const QUIET = process.argv.includes('--quiet');
const ANIM = 0.7;           // durée de l'animation d'ouverture (s)
const STEP = 5;             // le joueur fait ses achats au moins toutes les 5 s

let t = 0, lastBest = 0, stuckSince = 0;
const events = [];
const log = (what) => events.push({ t, what, best: S.best - 1, lingots: S.lingotsEarned, mult: mult(), ach: achCount() });
const hms = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60); return (h ? h + ' h ' : '') + String(m).padStart(h ? 2 : 1, '0') + ' min'; };

// Crochetage effectif par seconde : production + clics (clics parfaits en moyenne)
const cps = () => inChal('noclick') ? 0 : CPS;
const clickRate = () => cps() * perClick() * (1 + critChance() * (critMult() - 1));
const rate = () => dps() + clickRate();

// ---------- Achats de matériel : meilleur rapport crochetage gagné / prix, Stéthoscope compris ----------
function bestItem() {
  let best = null, bestRatio = Infinity;
  for (const it of ITEMS) {
    if (it.kind === 'crit' || gated(it)) continue;
    const c = owned(it.id), cost = costOf(it, 0);
    if (cost > S.gold) continue;
    let gain = it.base * ((c + 1) * milestone(c + 1) - c * milestone(c)) * mult();
    if (it.kind === 'click') gain *= cps() * (1 + critChance() * (critMult() - 1));
    if (gain > 0 && cost / gain < bestRatio) { bestRatio = cost / gain; best = it; }
  }
  return best;
}
function shop() {
  for (let i = 0; i < 500; i++) {
    const fingers = ITEMS.find(x => x.id === 'fingers');
    if (cps() > 0 && owned('fingers') < fingers.max && costOf(fingers, 0) < S.gold * 0.05) { S.gold -= costOf(fingers, 0); S.owned.fingers = owned('fingers') + 1; continue; }
    const it = bestItem();
    if (!it) return;
    S.gold -= costOf(it, 0);
    if (!owned(it.id)) log('Premier ' + it.name);
    S.owned[it.id] = owned(it.id) + 1;
  }
}

// ---------- Receleur : le moins cher d'abord ----------
function shopPerks() {
  for (;;) {
    const opts = PERKS.filter(p => perk(p.id) < p.max && !perkBlocked(p) && p.cost(perk(p.id)) <= S.lingots)
      .sort((a, b) => a.cost(perk(a.id)) - b.cost(perk(b.id)));
    if (!opts.length) return;
    const p = opts[0];
    S.lingots -= p.cost(perk(p.id));
    S.perks[p.id] = perk(p.id) + 1;
    if (p.group === 'contact') log(p.name);
    if (p.id === 'network' && perk('network') % 5 === 0) log('Réseau de recel niveau ' + perk('network'));
  }
}

function checkAch() {
  for (const a of ACH) if (!S.ach[a.id] && a.ok()) S.ach[a.id] = t;
}

// ---------- Coffres ----------
function openVault() {
  const n = S.vault;
  const g = reward(n) * (jackChance() * 5 + (1 - jackChance()) * 1.05);
  S.gold += g; S.totalGold += g; S.opened++;
  S.jackpots += jackChance();
  if (!S.hold) S.vault++;
  S.best = Math.max(S.best, S.vault);
  S.progress = 0; S.alarmLeft = alarmTime();
  t += ANIM;
}

const milestones = new Set([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150]);
// Fin de partie : receleur au maximum, coffre légendaire ouvert et 18 niveaux de défis réussis
let finished = null, maxedAt = null, legendAt = null, chalDoneAt = null;
const CHAL_TOTAL = CHALLENGES.reduce((s, c) => s + c.targets.length, 0);
const skipUntil = {};   // défi échoué ou abandonné : on le laisse de côté quelques cavales

// Défi à tenter : le moins avancé dont l'objectif est sous le record déjà atteint
function pickChallenge() {
  const record = Math.max(S.best, S.bestEver || 0) - 1;
  return CHALLENGES
    .filter(c => chalLevel(c.id) < c.targets.length && chalTarget(c) <= record - 3 && (skipUntil[c.id] || 0) <= S.runs)
    .sort((a, b) => chalTarget(a) - chalTarget(b))[0];
}

while (t < HOURS * 3600) {
  shop(); checkAch();

  // Chambre forte : le joueur fuit s'il ne peut pas l'ouvrir avant l'alarme, et retente quand il peut (marge 10 %)
  if (isBoss(S.vault) && !S.hold && rate() * alarmTime() < resistance(S.vault) * 1.1) {
    S.hold = true; S.fled++; S.vault--; S.progress = 0;
  }
  if (S.hold && rate() * alarmTime() >= resistance(S.vault + 1) * 1.1) { S.hold = false; S.vault++; S.progress = 0; }

  // Avancer jusqu'à l'ouverture du coffre, ou de STEP secondes
  const r = rate(), need = (resistance(S.vault) - S.progress) / r;
  const step = Math.min(need, STEP);
  t += step; S.progress += r * step;
  S.clicks += cps() * step; S.crits += cps() * step * critChance();
  if (S.progress >= resistance(S.vault) - 1e-9) openVault();

  const ch = challengeTick(step);
  if (ch && ch.done) log('Défi « ' + ch.done.name + ' » niveau ' + ch.level + ' réussi');
  if (ch && ch.failed) { log('Défi « ' + ch.failed.name + ' » échoué (temps écoulé)'); skipUntil[ch.failed.id] = S.runs + 3; }

  const reached = S.best - 1;
  if (reached > lastBest) {
    lastBest = reached;
    if (milestones.has(reached)) { milestones.delete(reached); log('Coffre n° ' + reached + ' ouvert'); }
    stuckSince = t;
  }

  // Cavale : quand rien n'avance depuis STUCK minutes. Un défi bloqué est abandonné.
  const gain = lingotsGain();
  if (t - stuckSince > STUCK && (gain > 0 || S.challenge)) {
    if (S.challenge) { log('Défi « ' + S.challenge + ' » abandonné au coffre n° ' + (S.best - 1)); skipUntil[S.challenge] = S.runs + 3; endChallenge(); }
    const c = pickChallenge();
    log('Cavale n° ' + (S.runs + 1) + ' au coffre n° ' + (S.best - 1) + ' : +' + gain + ' lingots' + (c ? ' · défi « ' + c.name + ' » vers n° ' + chalTarget(c) : ''));
    if (c) startChallenge(c.id, gain); else applyPrestige(gain);
    lastBest = S.best - 1; stuckSince = t;
    shopPerks();
    if (!maxedAt && allPerksMaxed()) { maxedAt = t; log('Receleur entièrement au maximum'); }
  }
  if (!legendAt && S.best - 1 >= LEGEND_AT) { legendAt = t; log('Coffre légendaire n° ' + LEGEND_AT + ' ouvert'); }
  if (!chalDoneAt && chalLevels() >= CHAL_TOTAL) { chalDoneAt = t; log('Tous les défis réussis'); }
  if (!finished && maxedAt && legendAt && chalDoneAt) finished = t;
  if (finished) break;
}

// ---------- Rapport ----------
checkAch();
console.log(`\nSimulation : ${CPS} clic(s)/s, cavale après ${STUCK / 60} min sans record, ${HOURS} h max\n`);
const rows = QUIET ? events.filter(e => /Contact|Coffre n° (20|50|100)|maximum|légendaire|Défi|défis/.test(e.what)) : events;
for (const e of rows) {
  console.log(hms(e.t).padStart(11), ' │ ', e.what.padEnd(70), ` record ${String(e.best).padStart(3)} · ${String(e.lingots).padStart(5)} lingots gagnés · ×${fmt(e.mult)} · ${e.ach} succès`);
}
const missing = ACH.filter(a => !S.ach[a.id]).map(a => a.name);
console.log(`\nFin à ${hms(t)} : record coffre n° ${Math.max(S.best, S.bestEver || 0) - 1}, ${S.runs} cavales, ${S.lingotsEarned} lingots gagnés, ${achCount()}/${ACH.length} succès`);
console.log('Succès manquants : ' + (missing.join(', ') || 'aucun'));
