// Actions du joueur et événements du jeu : les seuls endroits qui modifient S
import { S, run, replaceState } from './state.js';
import { ITEMS } from './data.js';
import { ACH } from './achievements.js';
import { fmt, plural } from './format.js';
import { el, toast } from './dom.js';
import { sfx } from './audio.js';
import { burst, floatText } from './effects.js';
import {
  perk, owned, isBoss, alarmTime, resistance, reward, critChance, critMult, jackChance, perClick,
  gated, buyPlan, bestAuto, perkBlocked, lingotsGain, dps, isLegend, inChal, chalLevel, chalTarget, chalUnlocked
} from './formulas.js';
import { applyPrestige, startChallenge, endChallenge, challengeTick, challengeById } from './rules.js';
import { renderVault, newCombo, renderShop, renderPerks, renderAch, renderMute, resetPrestigeBtn, renderAll, renderChallenges } from './ui.js';

// ---------- Cadran ----------
let dialAngle = 0, dialDir = 1;
export function turnDial(clientX, clientY) {
  if (run.opening) return;
  if (inChal('noclick')) {
    const r = el.floats.getBoundingClientRect();
    floatText('Bloqué', false, clientX - r.left, clientY - r.top - 10);
    return;
  }
  const crit = Math.random() < critChance();
  const amt = perClick() * (crit ? critMult() : 1);
  S.progress += amt; S.clicks++;
  if (crit) S.crits++;
  dialAngle += dialDir * (18 + Math.random() * 60); dialDir = -dialDir;
  el.dial.style.transform = `rotate(${dialAngle}deg)`;
  const r = el.floats.getBoundingClientRect();
  floatText((crit ? 'Parfait ! +' : '+') + fmt(amt), crit, clientX - r.left, clientY - r.top - 10);
  crit ? sfx.crit() : sfx.click();
  if (S.clicks === 1) el.hint.textContent = 'Achète du matériel pour crocheter même sans cliquer.';
}

// ---------- Coffres ----------
export function openVault() {
  run.opening = true;
  const n = S.vault, g = reward(n) * (Math.random() < jackChance() ? 5 : 0.85 + Math.random() * 0.4);
  const jackpot = g > reward(n) * 2;
  S.gold += g; S.totalGold += g; S.opened++;
  if (jackpot) S.jackpots++;
  if (isBoss(n) && S.alarmLeft < 3) S.clutch = true;
  el.loot.innerHTML = (jackpot ? 'Coffre doré !<br>' : '') + '+' + fmt(g);
  el.door.classList.add('open');
  burst(isBoss(n) || jackpot ? 70 : 28, isBoss(n) || jackpot);
  sfx.open();
  if (isLegend(n)) { toast('Le casse du siècle ! Coffre n° ' + n + ' ouvert : +' + fmt(g) + ' or'); burst(200, true); }
  else if (isBoss(n)) toast('Chambre forte n° ' + n + ' ouverte : +' + fmt(g) + ' or');
  else if (jackpot) toast('Coffre doré ! ×5 sur le butin');
  // En repli, on reste sur le même coffre pour amasser de l'or avant de retenter
  if (!S.hold) S.vault++;
  S.best = Math.max(S.best, S.vault);
  S.progress = 0; S.alarmLeft = alarmTime();
  setTimeout(() => {
    el.door.classList.remove('open'); el.door.classList.add('new');
    newCombo(); renderVault();
    requestAnimationFrame(() => requestAnimationFrame(() => { el.door.classList.remove('new'); run.opening = false; }));
  }, 650);
}

export function failBoss() {
  sfx.alarm();
  S.alarmsFailed++;
  toast('Alarme ! Tu te replies sur le coffre n° ' + (S.vault - 1) + '.', true);
  S.vault = Math.max(1, S.vault - 1); S.progress = 0; S.alarmLeft = alarmTime();
  newCombo(); renderVault();
}

export function flee() {
  if (run.opening || !isBoss(S.vault)) return;
  if (inChal('nofleeing')) { toast('Défi « Sans filet » : impossible de fuir.', true); return; }
  S.fled++; S.hold = true;
  S.vault = Math.max(1, S.vault - 1); S.progress = 0; S.alarmLeft = alarmTime();
  sfx.flee();
  toast('Tu t’éclipses avant l’alarme. Tu restes sur le coffre n° ' + S.vault + ' le temps de te renforcer.');
  newCombo(); renderVault();
}

export function retry() {
  if (run.opening || !S.hold) return;
  S.hold = false; S.vault++; S.progress = 0; S.alarmLeft = alarmTime();
  newCombo(); renderVault();
}

// Guetteur : retente la chambre forte quand le crochetage seul l'ouvrirait avec 20 % de marge
export function watchCheck() {
  if (perk('watch') && S.hold && !run.opening && dps() * alarmTime() >= resistance(S.vault + 1) * 1.2) {
    S.watched = (S.watched || 0) + 1;
    retry();
    toast('Le guetteur donne le signal : on retente la chambre forte n° ' + S.vault + '.');
  }
}

// ---------- Achats ----------
export function buy(it, q = run.qty, quiet = false) {
  const p = buyPlan(it, q);
  if (gated(it) || !p.n || p.cost > S.gold) return false;
  S.gold -= p.cost;
  const before = owned(it.id);
  S.owned[it.id] = before + p.n;
  if (it.kind !== 'crit' && Math.floor(S.owned[it.id] / 25) > Math.floor(before / 25)) toast(it.name + ' : rendement doublé !');
  if (!quiet) sfx.buy();
  renderShop();
  return true;
}

// Comptable : achète un exemplaire du meilleur rapport dès qu'il est abordable
export function autoBuy() {
  if (!perk('auto') || !S.autoOn) return;
  for (let i = 0; i < 20; i++) {
    const id = bestAuto(1);
    if (!id || !buy(ITEMS.find(x => x.id === id), 1, true)) break;
  }
}

export function toggleAuto() { S.autoOn = !S.autoOn; renderPerks(); }

export function buyPerk(pk) {
  const l = perk(pk.id);
  if (l >= pk.max || perkBlocked(pk)) return;
  const c = pk.cost(l);
  if (S.lingots < c) return;
  S.lingots -= c;
  S.perks[pk.id] = l + 1;
  if (pk.id === 'time' && isBoss(S.vault)) S.alarmLeft += 5;
  sfx.ingot();
  toast(pk.name + (pk.max > 1 ? ' niveau ' + (l + 1) : '') + ' acquis.');
  renderPerks(); renderShop();
}

// ---------- Succès ----------
export function checkAch(silent) {
  S.ach = S.ach || {};
  ACH.forEach(a => {
    if (!S.ach[a.id] && a.ok()) {
      S.ach[a.id] = Date.now();
      if (!silent) { toast('Succès : ' + a.name + ' (+2 %)'); sfx.achievement(); }
    }
  });
  renderAch();
}

// ---------- Cavale (prestige) ----------
export function prestige() {
  const gain = lingotsGain();
  if (!gain) return;
  if (!run.confirmPrestige) {
    run.confirmPrestige = true;
    el.prestige.textContent = 'Confirmer : repartir de zéro avec +' + plural(gain, 'lingot');
    el.prestige.classList.add('danger'); el.cancelPrestige.hidden = false;
    return;
  }
  applyPrestige(gain);
  resetPrestigeBtn(); newCombo(); renderAll();
  burst(90, true); sfx.open();
  toast('Cavale réussie : +' + plural(gain, 'lingot') + '. Passe voir le receleur.');
}

// ---------- Défis ----------
// Lancer : confirmation en deux clics, car la cavale repart de zéro
export function launchChallenge(id) {
  if (!chalUnlocked() || S.challenge) return;
  const c = challengeById(id);
  if (chalLevel(id) >= c.targets.length) return;
  if (run.confirmChal !== id) { run.confirmChal = id; renderChallenges(); return; }
  run.confirmChal = null;
  const gain = lingotsGain();
  startChallenge(id, gain);
  resetPrestigeBtn(); newCombo(); renderAll();
  sfx.alarm();
  toast('Défi « ' + c.name + ' » lancé : objectif coffre n° ' + chalTarget(c) + (gain ? ' (+' + plural(gain, 'lingot') + ')' : '') + '.');
}

export function abandonChallenge() {
  if (!S.challenge) return;
  const c = challengeById(S.challenge);
  endChallenge(); renderAll();
  toast('Défi « ' + c.name + ' » abandonné. La cavale continue sans contrainte.');
}

export function cancelChallengeConfirm() { run.confirmChal = null; renderChallenges(); }

// Appelé par la boucle de jeu : objectif atteint ou temps écoulé
export function challengeUpdate(dt) {
  const r = challengeTick(dt);
  if (!r) return;
  if (r.done) {
    burst(120, true); sfx.open();
    toast('Défi « ' + r.done.name + ' » réussi (niveau ' + r.level + ') : ' + r.done.reward.toLowerCase() + '.');
  } else {
    sfx.alarm();
    toast('Défi « ' + r.failed.name + ' » échoué : le temps est écoulé.', true);
  }
  renderAll();
}

// ---------- Divers ----------
export function resetGame() {
  replaceState();
  newCombo(); renderAll();
  toast('Partie effacée.');
}

export function toggleMute() { S.muted = !S.muted; renderMute(); }
