// Affichage : relit S et met la page à jour. Aucune règle du jeu ici.
import { S, run, PRESTIGE_AT } from './state.js';
import { ITEMS, PERKS, PERK_GROUPS, CHALLENGES } from './data.js';
import { ACH } from './achievements.js';
import { fmt, nf2, plural } from './format.js';
import { $, el } from './dom.js';
import { sfx } from './audio.js';
import {
  perk, owned, isBoss, resistance, digitsFor, mult, dps, perClick, critChance, itemOut, milestone,
  gated, buyPlan, bestAuto, perkBlocked, perksBuyable, achCount, lingotsGain, lingotBonus, bestVault, isLegend,
  bannedByChal, chalLevel, chalLevels, chalTarget, chalUnlocked
} from './formulas.js';

// ---------- Coffre ----------
export function renderVault() {
  const boss = isBoss(S.vault);
  el.flee.hidden = !boss;
  el.retry.hidden = !S.hold;
  el.retry.innerHTML = 'Retenter la chambre forte n° ' + (S.vault + 1) + ' <kbd>R</kbd>';
  el.vaultNo.textContent = 'n° ' + S.vault;
  el.tag.textContent = isLegend(S.vault) ? 'Coffre du siècle · alarme' : boss ? 'Chambre forte · alarme' : S.vault < 6 ? 'Coffre mural' : S.vault < 15 ? 'Coffre de banque' : S.vault < 30 ? 'Coffre de bijoutier' : 'Coffre de réserve fédérale';
  el.tag.className = 'tag' + (boss ? ' boss' : '');
  el.stage.classList.toggle('isboss', boss);
  el.stage.classList.toggle('alarm', boss);
  el.timer.hidden = !boss;
}

// Combinaison : les chiffres s'allument au fil de la résistance entamée
let lockedShown = -1, spinT = 0;
export function newCombo() {
  const d = digitsFor(S.vault);
  let c = '';
  for (let i = 0; i < d; i++) c += Math.floor(Math.random() * 10);
  S.combo = c;
  el.code.innerHTML = '';
  for (let i = 0; i < d; i++) el.code.appendChild(document.createElement('span'));
  lockedShown = -1;
}
export function renderCode(dt) {
  const spans = el.code.children, d = spans.length;
  const locked = Math.min(d, Math.floor(S.progress / resistance(S.vault) * d));
  spinT += dt;
  const spin = spinT > 0.07;
  if (spin) spinT = 0;
  for (let i = 0; i < d; i++) {
    const s = spans[i];
    if (i < locked) {
      if (!s.classList.contains('lock')) {
        s.textContent = S.combo[i]; s.classList.add('lock', 'flash');
        if (lockedShown >= 0) sfx.lock();
        setTimeout(() => s.classList.remove('flash'), 400);
      }
    } else {
      s.classList.remove('lock');
      if (spin || !s.textContent) s.textContent = Math.floor(Math.random() * 10);
    }
  }
  lockedShown = locked;
}

// ---------- Matériel ----------
const rows = {};
export function buildShop(onBuy) {
  ITEMS.forEach(it => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'item'; b.id = 'item-' + it.id;
    b.innerHTML = `<span class="nm">${it.name}<i></i><b class="badge" hidden>Meilleur rapport</b></span><span class="pr"></span><span class="ds"></span><div class="bar25"><div></div></div>`;
    b.addEventListener('click', () => onBuy(it));
    el.items.appendChild(b);
    rows[it.id] = { b, cnt: b.querySelector('.nm i'), badge: b.querySelector('.badge'), pr: b.querySelector('.pr'), ds: b.querySelector('.ds'), bar: b.querySelector('.bar25 > div') };
  });
}
export function renderShop() {
  let prevSeen = true, gateShown = false;
  const bestId = perk('best') ? bestAuto(run.qty) : null;
  ITEMS.forEach((it, i) => {
    const r = rows[it.id], c = owned(it.id), p = buyPlan(it, run.qty);
    if (gated(it)) {
      // Seul le prochain outil verrouillé est montré, avec sa condition
      r.b.classList.add('locked'); r.b.classList.remove('best'); r.badge.hidden = true;
      r.cnt.textContent = '';
      const contact = PERKS.find(p => p.id === it.unlock);
      r.ds.textContent = bannedByChal(it) ? 'Interdit pendant le défi « À l’ancienne »'
        : 'À débloquer chez le receleur : ' + contact.name + ' (' + plural(contact.cost(0), 'lingot') + ')';
      r.pr.innerHTML = fmt(it.cost);
      r.b.disabled = true;
      r.bar.style.width = '0%';
      r.b.hidden = gateShown || !prevSeen;
      gateShown = true; prevSeen = false;
      return;
    }
    const visible = prevSeen || c > 0;
    const seen = c > 0 || S.totalGold >= it.cost * 0.5;
    r.b.classList.toggle('locked', !seen);
    r.cnt.textContent = c ? '×' + c : '';
    r.b.classList.toggle('best', it.id === bestId);
    r.badge.hidden = it.id !== bestId;
    if (!seen) {
      r.ds.textContent = '???';
      r.pr.innerHTML = fmt(it.cost);
      r.b.disabled = true;
    } else {
      const maxed = it.max && c >= it.max;
      let d = it.desc;
      if (it.kind === 'auto') {
        const tot = itemOut(it) * mult();
        d = '+' + fmt(it.base * milestone(c) * mult()) + '/s chacun · ' +
          (c ? 'total ' + fmt(tot) + '/s (' + Math.round(tot / Math.max(1e-9, dps()) * 100) + ' %)' : it.desc);
        r.b.title = it.desc + (c ? ' · prochain doublement à ' + (Math.floor(c / 25) + 1) * 25 + ' exemplaires' : '');
      }
      if (it.kind === 'click') d = '+' + fmt(it.base * milestone(c) * mult()) + ' force par clic';
      if (maxed) d = 'Au maximum · ' + Math.round(critChance() * 100) + ' % de clics parfaits';
      r.ds.textContent = d;
      r.pr.innerHTML = maxed ? '—' : fmt(p.cost) + (p.n > 1 ? `<small>pour ${p.n}</small>` : '');
      r.b.disabled = maxed || p.cost > S.gold;
    }
    r.bar.style.width = it.kind === 'crit' ? (c / it.max * 100) + '%' : (c % 25) / 25 * 100 + '%';
    r.b.hidden = !visible && i > 1 && !seen;
    prevSeen = seen;
  });
}

// ---------- Receleur ----------
const perkRows = {};
export function buildPerks(onBuy) {
  PERKS.forEach((pk, i) => {
    if (pk.group && PERKS[i - 1].group !== pk.group) {
      const h = document.createElement('h3');
      h.className = 'perk-group';
      h.id = 'perk-group-' + pk.group;
      h.textContent = PERK_GROUPS[pk.group];
      el.perks.appendChild(h);
    }
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'item perk'; b.id = 'perk-' + pk.id;
    b.innerHTML = `<span class="nm">${pk.name}<i></i></span><span class="pr"></span><span class="ds"></span>` +
      (pk.max > 1 && isFinite(pk.max) ? `<div class="pips">${'<span></span>'.repeat(pk.max)}</div>` : '');
    b.addEventListener('click', () => onBuy(pk));
    el.perks.appendChild(b);
    perkRows[pk.id] = { b, lvl: b.querySelector('.nm i'), pr: b.querySelector('.pr'), ds: b.querySelector('.ds'), pips: b.querySelectorAll('.pips span') };
  });
}
export function renderPerks() {
  PERKS.forEach(pk => {
    const r = perkRows[pk.id], l = perk(pk.id), maxed = l >= pk.max;
    const blocked = perkBlocked(pk);
    r.b.classList.toggle('maxed', maxed);
    r.lvl.textContent = !l || pk.max === 1 ? '' : isFinite(pk.max) ? l + ' / ' + pk.max : 'niv. ' + l;
    const needPerk = pk.req && !perk(pk.req);
    r.ds.textContent = needPerk ? 'Nécessite d’abord : ' + PERKS.find(x => x.id === pk.req).name
      : blocked ? pk.desc + ' · nécessite d’avoir ouvert le coffre n° ' + pk.minVault + ' (record : n° ' + bestVault() + ')'
      : maxed ? (pk.cur ? 'Au maximum · ' + pk.cur(l) : pk.desc + ' · acquis')
      : pk.desc + (pk.cur && l ? ' · actuel : ' + pk.cur(l) : '');
    r.pr.innerHTML = maxed ? '✓' : plural(pk.cost(l), 'lingot');
    r.b.disabled = !maxed && (blocked || S.lingots < pk.cost(l));
    r.pips.forEach((p, i) => p.classList.toggle('on', i < l));
    // Contacts : seuls ceux déjà acquis et le prochain de la chaîne sont montrés ; « Sans limite » attend le dernier contact
    r.b.hidden = !!pk.group && needPerk;
  });
  const endless = $('perk-group-endless');
  if (endless) endless.hidden = PERKS.filter(p => p.group === 'endless').every(p => perkRows[p.id].b.hidden);
  $('perkSum').textContent = plural(S.lingots, 'lingot') + ' à dépenser';
  el.autoToggle.hidden = !perk('auto');
  el.autoToggle.textContent = 'Comptable : ' + (S.autoOn ? 'actif' : 'en pause');
  el.autoToggle.setAttribute('aria-pressed', S.autoOn);
}

// ---------- Succès ----------
const achEls = {};
export function buildAch() {
  ACH.forEach(a => {
    const d = document.createElement('div');
    d.className = 'ach'; d.innerHTML = `<b>${a.name}</b><span>${a.desc}</span>`;
    el.achs.appendChild(d); achEls[a.id] = d;
  });
}
export function renderAch() {
  ACH.forEach(a => achEls[a.id].classList.toggle('done', !!S.ach[a.id]));
  $('achSum').textContent = achCount() + ' / ' + ACH.length + ' · +' + achCount() * 2 + ' %';
}

// ---------- Défis ----------
const chalRows = {};
export function buildChallenges({ onLaunch, onAbandon, onCancel }) {
  CHALLENGES.forEach(c => {
    const d = document.createElement('div');
    d.className = 'chal'; d.id = 'chal-' + c.id;
    d.innerHTML = `<div class="chal-head"><b>${c.name}</b><span></span></div>
      <p>${c.rule}</p><p class="rw"></p>
      <div class="pips">${'<span></span>'.repeat(c.targets.length)}</div>
      <div class="btn-row"><button class="btn small" type="button"></button><button class="btn ghost small" type="button" hidden>Annuler</button></div>`;
    const [go, no] = d.querySelectorAll('button');
    go.addEventListener('click', () => (S.challenge === c.id ? onAbandon() : onLaunch(c.id)));
    no.addEventListener('click', onCancel);
    $('chals').appendChild(d);
    chalRows[c.id] = { d, lvl: d.querySelector('.chal-head span'), rw: d.querySelector('.rw'), pips: d.querySelectorAll('.pips span'), go, no };
  });
}
export function renderChallenges() {
  CHALLENGES.forEach(c => {
    const r = chalRows[c.id], l = chalLevel(c.id), done = l >= c.targets.length;
    const active = S.challenge === c.id, confirm = run.confirmChal === c.id;
    r.d.classList.toggle('active', active);
    r.d.classList.toggle('done', done);
    r.lvl.textContent = l + ' / ' + c.targets.length;
    r.rw.innerHTML = 'Récompense : <b>' + c.reward + '</b>' + (l ? ' · actuel : ' + c.cur(l) : '');
    r.pips.forEach((p, i) => p.classList.toggle('on', i < l));
    r.no.hidden = !confirm;
    r.go.classList.toggle('danger', active || confirm);
    r.go.disabled = !active && (done || !chalUnlocked() || !!S.challenge);
    r.go.textContent = active ? 'Abandonner le défi'
      : done ? 'Terminé'
      : !chalUnlocked() ? 'Disponible après ta première cavale'
      : S.challenge ? 'Un défi est déjà en cours'
      : confirm ? 'Confirmer : repartir de zéro' + (lingotsGain() ? ' avec +' + plural(lingotsGain(), 'lingot') : '')
      : 'Lancer · objectif coffre n° ' + chalTarget(c);
  });
  $('chalSum').textContent = chalLevels() + ' / ' + CHALLENGES.reduce((s, c) => s + c.targets.length, 0);
}
function renderChalBanner() {
  const b = $('chalBanner');
  b.hidden = !S.challenge;
  if (!S.challenge) return;
  const c = CHALLENGES.find(x => x.id === S.challenge);
  const left = c.time ? ' · reste <b>' + Math.floor(S.chalLeft / 60) + ':' + String(Math.floor(S.chalLeft % 60)).padStart(2, '0') + '</b>' : '';
  b.innerHTML = 'Défi « ' + c.name + ' » · objectif coffre n° <b>' + chalTarget(c) + '</b>' + left;
}

// ---------- Onglets ----------
export const TAB_KEYS = { m: 'mat', l: 'rec', s: 'ach', d: 'chal', c: 'log' };
const TAB_STORE = 'chambre-forte-tab';
export function showTab(id) {
  document.querySelectorAll('.tab').forEach(t => {
    const on = t.dataset.tab === id;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
    $('pane-' + t.dataset.tab).hidden = !on;
  });
  try { localStorage.setItem(TAB_STORE, id); } catch (e) {}
}
export function initTabs() {
  document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));
  let saved = 'mat';
  try { saved = localStorage.getItem(TAB_STORE) || 'mat'; } catch (e) {}
  showTab(Object.values(TAB_KEYS).includes(saved) ? saved : 'mat');
}

// ---------- Bandeau, compteurs, carnet (rafraîchis 10 fois par seconde) ----------
export function renderMute() {
  el.mute.textContent = 'Son : ' + (S.muted ? 'non' : 'oui');
  el.mute.setAttribute('aria-pressed', S.muted);
}
export function resetPrestigeBtn() {
  run.confirmPrestige = false;
  el.prestige.textContent = 'Prendre la cavale';
  el.prestige.classList.remove('danger'); el.cancelPrestige.hidden = true;
}
export function renderHud() {
  const R = resistance(S.vault);
  el.gold.textContent = fmt(S.gold);
  el.lingots.textContent = fmt(S.lingots);
  el.res.textContent = fmt(Math.min(S.progress, R)) + ' / ' + fmt(R);
  el.cpc.textContent = fmt(perClick());
  el.dps.textContent = fmt(dps());
  el.timer.textContent = 'Alarme dans ' + Math.max(0, S.alarmLeft).toFixed(1).replace('.', ',') + ' s';

  $('stOpened').textContent = fmt(S.opened);
  $('stBest').textContent = 'n° ' + Math.max(S.best, S.bestEver || 0);
  $('stClicks').textContent = fmt(S.clicks);
  $('stCrit').textContent = Math.round(critChance() * 100) + ' %';
  $('stGold').textContent = fmt(S.totalGold);
  $('stRuns').textContent = S.runs;
  $('stEarned').textContent = fmt(S.lingotsEarned);
  $('stMult').textContent = '×' + nf2.format(Math.round(mult() * 100) / 100);

  // Pastilles des onglets : avantages abordables, succès obtenus
  const buyable = perksBuyable();
  $('recCount').hidden = !buyable;
  $('recCount').textContent = buyable;
  $('recCount').className = 'count hot';
  $('achCount').textContent = achCount() + ' / ' + ACH.length;
  $('chalCount').textContent = S.challenge ? 'en cours' : chalLevels() + ' / ' + CHALLENGES.reduce((s, c) => s + c.targets.length, 0);
  $('chalCount').className = 'count' + (S.challenge ? ' hot' : '');
  renderChalBanner();

  const gain = lingotsGain();
  el.prestige.disabled = !gain;
  if (!run.confirmPrestige) el.prestige.textContent = gain ? 'Prendre la cavale (+' + plural(gain, 'lingot') + ')' : 'Prendre la cavale';
  const bonus = 'Les lingots gagnés augmentent pour toujours ta production et l’or trouvé : <b>+10 %</b> par lingot jusqu’à 100, puis de moins en moins (actuel : +' + fmt(Math.round(lingotBonus() * 100)) + ' %). Tu peux aussi les dépenser chez le receleur.';
  el.heistText.innerHTML = gain
    ? `Tu peux disparaître maintenant avec <b>${plural(gain, 'lingot')}</b>. Ton or et ton matériel sont perdus. ${bonus} Plus tu vas loin, plus le butin grossit.`
    : `Atteins le coffre n° ${PRESTIGE_AT} pour pouvoir disparaître avec un butin en lingots. ${bonus}`;
}

export function renderAll() {
  renderVault(); renderShop(); renderPerks(); renderAch(); renderChallenges(); renderMute(); renderHud();
}
