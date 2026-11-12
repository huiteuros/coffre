// Sauvegarde : copie locale (navigateur) toujours, copie serveur (api/) quand le joueur est connecté
import { S, replaceState } from './state.js';
import { dps, resistance, reward, perk } from './formulas.js';
import { account, loggedIn, pullSave, pushSave } from './api.js';

const KEY = 'chambre-forte-v1';

export function save() {
  // Toujours croissant, même si l'horloge d'un autre appareil était en avance sur la nôtre
  S.saved = Math.max(Date.now(), (S.saved || 0) + 1);
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}

function load() {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}

// Charge une partie (rechargement à chaud, sinon sauvegarde locale). Renvoie true si elle vient du disque.
export function restore(hotState) {
  const saved = hotState || load();
  if (!saved) return false;
  adopt(saved);
  return !hotState;
}

// Remplace la partie en cours par un état complet (sauvegarde locale ou serveur)
export function adopt(state) {
  replaceState(state);
  // Anciennes parties : les lingots déjà possédés comptent comme gagnés
  if (state.lingotsEarned == null) S.lingotsEarned = S.lingots;
  S.perks = S.perks || {};
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
}

// Gains hors ligne : 50 % du rythme courant (plus l'Équipe de nuit), plafonné à 8 h, sans avancer de coffre
export function offlineGain() {
  const away = Math.min(8 * 3600, (Date.now() - (S.saved || Date.now())) / 1000);
  if (away <= 60 || dps() <= 0) return 0;
  const g = away * dps() / resistance(S.vault) * reward(S.vault) * (0.5 + 0.25 * perk('night'));
  S.gold += g; S.totalGold += g;
  return g;
}

// ---------- Synchronisation serveur ----------
// Règle : la sauvegarde la plus récente (champ saved) gagne.
// Renvoie 'pushed', 'pulled' (la partie serveur a remplacé la locale), 'none' ou 'error'.

let syncing = false;
export async function syncUp({ keepalive = false } = {}) {
  if (!account.available || !loggedIn() || syncing) return 'none';
  syncing = true;
  save();
  try {
    await pushSave(S, keepalive);
    return 'pushed';
  } catch (e) {
    if (e.status === 409 && e.data && e.data.state) { adopt(e.data.state); return 'pulled'; }
    return 'error';
  } finally {
    syncing = false;
  }
}

// Au démarrage ou après connexion : récupère la partie du serveur.
// preferServer : à la connexion, la partie du compte prime sur celle du navigateur.
export async function syncDown({ preferServer = false } = {}) {
  if (!account.available || !loggedIn()) return 'none';
  try {
    const d = await pullSave();
    if (d.state && (preferServer || d.savedAt > (S.saved || 0))) {
      adopt(d.state);
      account.lastSync = Date.now();
      return 'pulled';
    }
    return await syncUp();
  } catch (e) {
    return 'error';
  }
}
