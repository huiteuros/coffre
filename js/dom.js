// Accès aux éléments de la page et messages éphémères
export const $ = id => document.getElementById(id);

export const el = {
  gold: $('gold'), lingots: $('lingots'), vaultNo: $('vaultNo'), tag: $('tag'), code: $('code'),
  door: $('door'), dial: $('dial'), wheel: $('wheel'), ringbar: $('ringbar'), res: $('res'),
  timer: $('timer'), cpc: $('cpc'), dps: $('dps'), items: $('items'), perks: $('perks'), achs: $('achs'),
  stage: $('stage'), floats: $('floats'), fx: $('fx'), loot: $('loot'), hint: $('hint'), toast: $('toast'),
  prestige: $('prestige'), cancelPrestige: $('cancelPrestige'), heistText: $('heistText'), mute: $('mute'),
  flee: $('flee'), retry: $('retry'), autoToggle: $('autoToggle'), reset: $('reset')
};

let toastT;
export function toast(msg, bad) {
  el.toast.textContent = msg; el.toast.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toastT); toastT = setTimeout(() => el.toast.className = 'toast', 2600);
}
