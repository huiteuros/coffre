// Appli installable (PWA) : service worker et aide pour iPhone.
// Pas de bouton dédié : on installe depuis le menu du navigateur.
import { $ } from './dom.js';

const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function initInstall() {
  // Le service worker n'existe qu'en HTTPS (ou sur localhost)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // iPhone / iPad : l'installation passe par Partager > Sur l'écran d'accueil, expliqué dans le Carnet
  $('installHelp').hidden = standalone() || !isIOS();
}
