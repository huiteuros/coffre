// Sons synthétisés à la volée (Web Audio), aucun fichier à charger
import { S } from './state.js';

let actx = null;
export function tone(freq, dur, type = 'square', vol = 0.04, slide = 0) {
  if (S.muted) return;
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
  } catch (e) {}
}

export const sfx = {
  click: () => tone(1800 + Math.random() * 400, 0.03, 'square', 0.03),
  crit: () => { tone(900, 0.08, 'triangle', 0.06); tone(1350, 0.12, 'triangle', 0.05); },
  lock: () => tone(520, 0.06, 'square', 0.04),
  open: () => { [660, 880, 1320].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.06), i * 70)); },
  alarm: () => tone(700, 0.25, 'sawtooth', 0.03, 0.6),
  buy: () => tone(300, 0.08, 'triangle', 0.05, 1.8),
  ingot: () => { tone(520, 0.12, 'triangle', 0.06, 1.5); setTimeout(() => tone(1040, 0.2, 'triangle', 0.05), 80); },
  flee: () => tone(400, 0.2, 'triangle', 0.05, 0.5),
  beep: () => tone(1100, 0.06, 'square', 0.02),
  achievement: () => { tone(1046, 0.15, 'triangle', 0.05); setTimeout(() => tone(1568, 0.2, 'triangle', 0.05), 90); },
};
