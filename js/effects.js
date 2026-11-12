// Décor du cadran (SVG), pièces d'or (canvas) et nombres flottants
import { $, el } from './dom.js';

// Cadran : graduations 0–99, rivets, poignées
export function buildDoor() {
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; };
  const ticks = $('ticks');
  for (let i = 0; i < 50; i++) {
    const a = i / 50 * Math.PI * 2, big = i % 5 === 0;
    const r1 = big ? 40 : 44, r2 = 50;
    mk('line', { x1: 150 + Math.sin(a) * r1, y1: 150 - Math.cos(a) * r1, x2: 150 + Math.sin(a) * r2, y2: 150 - Math.cos(a) * r2,
      stroke: '#3b2c10', 'stroke-width': big ? 2 : 1 }, ticks);
    if (big) {
      const t = mk('text', { x: 150 + Math.sin(a) * 30, y: 150 - Math.cos(a) * 30 + 3, 'text-anchor': 'middle',
        'font-size': 8, 'font-family': 'JetBrains Mono, monospace', 'font-weight': 700, fill: '#3b2c10' }, ticks);
      t.textContent = i * 2;
    }
  }
  const rivets = $('rivets');
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    mk('circle', { cx: 150 + Math.sin(a) * 126, cy: 150 - Math.cos(a) * 126, r: 4, fill: '#1c2125' }, rivets);
    mk('circle', { cx: 149 + Math.sin(a) * 126, cy: 149 - Math.cos(a) * 126, r: 2, fill: '#7a868d' }, rivets);
  }
  const knobs = $('knobs');
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * Math.PI * 2;
    mk('circle', { cx: 150 + Math.sin(a) * 92, cy: 150 - Math.cos(a) * 92, r: 9, fill: '#c9d0d4', stroke: '#4a5359', 'stroke-width': 2 }, knobs);
  }
}

const ctx = el.fx.getContext('2d');
let parts = [];

export function sizeFx() {
  const r = el.fx.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.fx.width = Math.max(1, r.width * dpr); el.fx.height = Math.max(1, r.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

export function burst(count, big) {
  const r = el.fx.getBoundingClientRect(), cx = r.width / 2, cy = r.height / 2;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, sp = (big ? 220 : 140) + Math.random() * 260;
    parts.push({ x: cx + (Math.random() - .5) * 40, y: cy + (Math.random() - .5) * 40, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 160,
      life: 1.1 + Math.random() * .6, t: 0, s: 3 + Math.random() * 4, rot: Math.random() * 6, hue: Math.random() < .15 ? 1 : 0 });
  }
}

export function drawFx(dt) {
  const r = el.fx.getBoundingClientRect();
  ctx.clearRect(0, 0, r.width, r.height);
  parts = parts.filter(p => (p.t += dt) < p.life);
  for (const p of parts) {
    p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .99; p.rot += dt * 8;
    ctx.globalAlpha = 1 - p.t / p.life;
    ctx.fillStyle = p.hue ? '#fff3c9' : '#d6aa4f';
    ctx.beginPath(); ctx.ellipse(p.x, p.y, p.s, p.s * Math.abs(Math.cos(p.rot)) + .5, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function floatText(txt, crit, x, y) {
  if (el.floats.childElementCount > 24) el.floats.firstChild.remove();
  const f = document.createElement('div');
  f.className = 'float' + (crit ? ' crit' : '');
  f.textContent = txt;
  f.style.left = x + 'px'; f.style.top = y + 'px';
  el.floats.appendChild(f);
  setTimeout(() => f.remove(), 950);
}
