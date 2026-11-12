// Point d'entrée : branche les événements, lance la boucle de jeu
import { S, run } from './state.js';
import { fmt } from './format.js';
import { el, toast } from './dom.js';
import { sfx } from './audio.js';
import { buildDoor, sizeFx, drawFx } from './effects.js';
import { isBoss, alarmTime, resistance, dps } from './formulas.js';
import { buildShop, buildPerks, buildAch, buildChallenges, initTabs, showTab, TAB_KEYS, newCombo, renderCode, renderShop, renderPerks, renderChallenges, renderHud, renderAll, resetPrestigeBtn } from './ui.js';
import {
  turnDial, openVault, failBoss, flee, retry, watchCheck, buy, autoBuy, toggleAuto, buyPerk, checkAch, prestige, resetGame, toggleMute,
  launchChallenge, abandonChallenge, cancelChallengeConfirm, challengeUpdate
} from './game.js';
import { save, restore, offlineGain, syncUp, syncDown } from './save.js';
import { probe } from './api.js';
import { initAccount, renderAccount, refreshBoard, periodicSync } from './account.js';

// ---------- Construction de la page ----------
buildDoor();
buildShop(it => buy(it));
buildPerks(buyPerk);
buildAch();
buildChallenges({ onLaunch: launchChallenge, onAbandon: abandonChallenge, onCancel: cancelChallengeConfirm });
initTabs();
window.addEventListener('resize', sizeFx);

// ---------- Commandes ----------
el.door.addEventListener('pointerdown', e => { e.preventDefault(); turnDial(e.clientX, e.clientY); });
function turnFromKeyboard() {
  const r = el.door.getBoundingClientRect();
  turnDial(r.left + r.width / 2, r.top + r.height / 2);
}
el.door.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); if (!e.repeat) turnFromKeyboard(); }
});

el.flee.addEventListener('click', flee);
el.retry.addEventListener('click', retry);
el.autoToggle.addEventListener('click', toggleAuto);
el.mute.addEventListener('click', toggleMute);
el.prestige.addEventListener('click', prestige);
el.cancelPrestige.addEventListener('click', resetPrestigeBtn);

const qtyBtns = document.querySelectorAll('.qty button');
qtyBtns.forEach(b => b.addEventListener('click', () => {
  run.qty = b.dataset.q === 'max' ? 'max' : +b.dataset.q;
  qtyBtns.forEach(x => x.setAttribute('aria-pressed', x === b));
  renderShop();
}));

// Effacer : confirmation en deux clics
let confirmReset = false;
el.reset.addEventListener('click', () => {
  if (!confirmReset) {
    confirmReset = true; el.reset.textContent = 'Vraiment tout effacer ?';
    setTimeout(() => { confirmReset = false; el.reset.textContent = 'Tout effacer'; }, 3000);
    return;
  }
  resetGame(); save();
  confirmReset = false; el.reset.textContent = 'Tout effacer';
});

// Raccourcis clavier (PC) ; touche maintenue ignorée pour garder le clic manuel
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); if (!e.repeat) turnFromKeyboard(); return; }
  if (e.repeat) return;
  if (k === 'f' && !el.flee.hidden) flee();
  else if (k === 'r' && !el.retry.hidden) retry();
  else if (k === '1' || k === '2' || k === '3') qtyBtns[+k - 1].click();
  else if (k === 'n') toggleMute();
  else if (TAB_KEYS[k]) showTab(TAB_KEYS[k]);
});

// ---------- Boucle ----------
let last = performance.now(), uiT = 0, saveT = 0, autoT = 0, alarmBeep = 0, wheelAngle = 0;
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (!run.opening) {
    S.progress += dps() * dt;
    if (isBoss(S.vault)) {
      S.alarmLeft -= dt;
      alarmBeep -= dt;
      if (S.alarmLeft < 10 && alarmBeep <= 0) { alarmBeep = 1; sfx.beep(); }
      if (S.alarmLeft <= 0 && S.progress < resistance(S.vault)) failBoss();
    }
    if (S.progress >= resistance(S.vault)) openVault();
  }
  el.ringbar.style.strokeDashoffset = 100 - Math.min(1, S.progress / resistance(S.vault)) * 100;
  wheelAngle += dps() > 0 ? dt * Math.min(40, 4 + Math.log10(1 + dps()) * 6) : 0;
  el.wheel.style.transform = `rotate(${wheelAngle}deg)`;
  if (!run.opening) renderCode(dt);
  challengeUpdate(dt);
  drawFx(dt);

  autoT += dt;
  if (autoT > 0.5) { autoT = 0; autoBuy(); watchCheck(); }

  uiT += dt;
  if (uiT > 0.1) { uiT = 0; renderHud(); renderShop(); renderPerks(); renderChallenges(); checkAch(); }

  saveT += dt;
  if (saveT > 5) { saveT = 0; save(); }
  syncT += dt;
  if (syncT > 20) { syncT = 0; periodicSync(); }
  boardT += dt;
  if (boardT > 60) { boardT = 0; refreshBoard(); }
  requestAnimationFrame(frame);
}
let syncT = 0, boardT = 0;

// Une partie venue du serveur remplace la partie affichée
function onAdopted() {
  newCombo(); checkAch(true); renderAll();
}

// ---------- Démarrage ----------
function start(data) {
  const fromDisk = restore(data && data.state);
  if (fromDisk) {
    const g = offlineGain();
    if (g) setTimeout(() => toast('Pendant ton absence, l’équipe a rapporté ' + fmt(g) + ' or.'), 400);
  }
  if (isBoss(S.vault)) S.alarmLeft = alarmTime();
  checkAch(true); sizeFx(); newCombo(); renderAll();
  requestAnimationFrame(t => { last = t; requestAnimationFrame(frame); });
  connectServer();
}

// Le jeu démarre tout de suite sur la copie locale, puis rattrape le serveur s'il répond
async function connectServer() {
  await probe();
  initAccount(onAdopted);
  if ((await syncDown()) === 'pulled') { onAdopted(); toast('Partie récupérée depuis le serveur.'); }
  renderAccount();
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { save(); syncUp({ keepalive: true }); }
});
window.claude?.hot?.snapshot?.(() => ({ state: S }));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
