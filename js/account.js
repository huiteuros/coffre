// Bloc « Compte » et classement, dans l'onglet Carnet
import { plural } from './format.js';
import { $, toast } from './dom.js';
import { account, loggedIn, login, register, logout, leaderboard } from './api.js';
import { syncUp, syncDown } from './save.js';

const box = $('account');
const board = $('board');
let onAdopted = () => {};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const time = ms => new Date(ms).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

export function renderAccount(error = '') {
  if (!account.available) {
    box.innerHTML = `<p class="lead">Serveur de sauvegarde introuvable : ta partie est enregistrée dans ce navigateur uniquement.</p>`;
    board.innerHTML = '';
    return;
  }
  if (loggedIn()) {
    box.innerHTML = `
      <p class="lead">Connecté en tant que <b>${esc(account.pseudo)}</b>.
        ${account.lastSync ? 'Dernière synchronisation à ' + time(account.lastSync) + '.' : 'Pas encore synchronisé.'}</p>
      <div class="btn-row">
        <button class="btn small" id="acc-sync" type="button">Synchroniser maintenant</button>
        <button class="btn ghost small" id="acc-logout" type="button">Se déconnecter</button>
      </div>`;
    $('acc-sync').addEventListener('click', () => run(syncUp, 'Partie synchronisée.'));
    $('acc-logout').addEventListener('click', async () => {
      await syncUp(); await logout();
      renderAccount(); toast('Déconnecté. La partie reste enregistrée dans ce navigateur.');
    });
    return;
  }
  box.innerHTML = `
    <p class="lead">Crée un compte pour garder ta partie sur le serveur et la retrouver depuis un autre navigateur.</p>
    <form class="acc-form" id="acc-form" novalidate>
      <label for="acc-pseudo">Pseudo</label>
      <input id="acc-pseudo" name="pseudo" autocomplete="username" maxlength="24" required>
      <label for="acc-pass">Mot de passe <small>(8 caractères minimum)</small></label>
      <input id="acc-pass" name="password" type="password" autocomplete="current-password" required>
      <p class="acc-error" role="alert">${esc(error)}</p>
      <div class="btn-row">
        <button class="btn small" type="submit" data-act="login">Se connecter</button>
        <button class="btn ghost small" type="submit" data-act="register">Créer un compte</button>
      </div>
    </form>`;
  $('acc-form').addEventListener('submit', async e => {
    e.preventDefault();
    const act = e.submitter && e.submitter.dataset.act;
    const pseudo = $('acc-pseudo').value, password = $('acc-pass').value;
    try {
      if (act === 'register') {
        await register(pseudo, password);
        await syncUp();            // la partie en cours devient celle du compte
        toast('Compte créé : ta partie est sauvegardée sur le serveur.');
      } else {
        await login(pseudo, password);
        const r = await syncDown({ preferServer: true });
        if (r === 'pulled') { onAdopted(); toast('Partie du compte chargée.'); }
        else toast('Connecté : ta partie est sauvegardée sur le serveur.');
      }
      renderAccount(); refreshBoard();
    } catch (err) {
      renderAccount(err.message);
      $('acc-pseudo').value = pseudo;
    }
  });
}

async function run(fn, okMsg) {
  const r = await fn();
  if (r === 'pulled') { onAdopted(); toast('Une partie plus récente était sur le serveur : elle a été chargée.'); }
  else if (r === 'error') toast('Synchronisation impossible pour le moment.', true);
  else if (okMsg) toast(okMsg);
  renderAccount();
}

export async function refreshBoard() {
  if (!account.available) return;
  try {
    const { players } = await leaderboard();
    board.innerHTML = players.length
      ? `<h3>Classement</h3><ol class="board">${players.map(p => `
          <li class="${loggedIn() && p.pseudo === account.pseudo ? 'me' : ''}">
            <span>${esc(p.pseudo)}</span>
            <b>coffre n° ${Math.max(0, p.bestVault - 1)}</b>
            <small>${plural(p.lingotsEarned, 'lingot')} · ${plural(p.runs, 'cavale')}</small>
          </li>`).join('')}</ol>`
      : '<h3>Classement</h3><p class="lead">Personne n’est encore classé.</p>';
  } catch (e) {}
}

// Synchronisation périodique, appelée par la boucle de jeu
export async function periodicSync() {
  const r = await syncUp();
  if (r === 'pulled') { onAdopted(); toast('Une partie plus récente était sur le serveur : elle a été chargée.'); }
  if (r !== 'none') renderAccount();
}

export function initAccount(adoptedCallback) {
  onAdopted = adoptedCallback;
  renderAccount();
  refreshBoard();
}
