// Client de l'API PHP (dossier api/). Sans serveur, le jeu reste en sauvegarde locale.
const BASE = 'api/';
const TOKEN_KEY = 'chambre-forte-token';

export const account = { available: false, pseudo: null, lastSync: 0 };

let token = null;
try {
  const saved = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
  if (saved) { token = saved.token; account.pseudo = saved.pseudo; }
} catch (e) {}

function remember(t, pseudo) {
  token = t; account.pseudo = pseudo;
  try {
    if (t) localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: t, pseudo }));
    else localStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

export const loggedIn = () => !!token;

async function call(path, { method = 'GET', body, keepalive = false, timeout = 8000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(BASE + path, {
      method, keepalive, signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!data) throw Object.assign(new Error('Réponse inattendue du serveur.'), { status: res.status });
    if (res.status === 401 && token) remember(null, null);
    if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur ' + res.status), { status: res.status, data });
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// Le serveur répond-il ? (faux sur la page publiée, où le dossier api/ n'existe pas)
export async function probe() {
  try { await call('health.php', { timeout: 3000 }); account.available = true; }
  catch (e) { account.available = false; }
  return account.available;
}

export async function register(pseudo, password) {
  const d = await call('register.php', { method: 'POST', body: { pseudo, password } });
  remember(d.token, d.pseudo);
}

export async function login(pseudo, password) {
  const d = await call('login.php', { method: 'POST', body: { pseudo, password } });
  remember(d.token, d.pseudo);
}

export async function logout() {
  try { await call('logout.php', { method: 'POST', body: {} }); } catch (e) {}
  remember(null, null);
}

export const pullSave = () => call('save.php');

export async function pushSave(state, keepalive = false) {
  const d = await call('save.php', { method: 'PUT', body: { state }, keepalive });
  account.lastSync = Date.now();
  return d;
}

export const leaderboard = () => call('leaderboard.php');
