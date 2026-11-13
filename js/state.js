// État de la partie : un seul objet S, sauvegardé tel quel dans le navigateur
export const GROWTH = 1.15, BOSS_EVERY = 5, BOSS_TIME = 30, PRESTIGE_AT = 20, LEGEND_AT = 130;

export const fresh = () => ({
  gold: 0, lingots: 0, lingotsEarned: 0, perks: {}, autoOn: true,
  vault: 1, best: 1, progress: 0, owned: {}, combo: '',
  opened: 0, clicks: 0, totalGold: 0, runs: 0, alarmLeft: BOSS_TIME, muted: false, saved: Date.now(),
  ach: {}, crits: 0, jackpots: 0, alarmsFailed: 0, clutch: false, hold: false, fled: 0, watched: 0,
  // Défis : niveaux réussis par défi, défi en cours et temps restant (Contre la montre)
  chal: {}, challenge: null, chalLeft: 0, chalFails: 0
});

// S garde toujours la même référence : les autres modules l'importent une fois pour toutes
export const S = fresh();

// Remplace le contenu de S (nouvelle partie, cavale, chargement) ; les champs absents prennent leur valeur par défaut
export function replaceState(obj = {}) {
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, fresh(), obj);
  normalizeMaps();
}

// Les tables clé → valeur doivent rester des objets. L'ancienne API renvoyait [] pour un objet vide :
// dans un tableau, les clés ajoutées ensuite (défis, succès…) disparaissaient à la sauvegarde.
const MAPS = ['owned', 'perks', 'ach', 'chal'];
export function normalizeMaps() {
  for (const k of MAPS) {
    const v = S[k];
    if (!v || typeof v !== 'object' || Array.isArray(v)) S[k] = Object.assign({}, v || {});
  }
}

// État de la session, jamais sauvegardé
export const run = { opening: false, confirmPrestige: false, confirmChal: null, qty: 1 };
