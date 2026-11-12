// Format des nombres à la française : 1,25 k, 3,4 M, 12 Md… puis notation scientifique
const SUF = ['', 'k', 'M', 'Md', 'Bn', 'Bd', 'Tn', 'Td', 'Qn', 'Qd'];
export const nf2 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2, minimumFractionDigits: 0 });
const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

export function fmt(n) {
  if (!isFinite(n)) return '∞';
  if (n < 10) return nf2.format(Math.floor(n * 10) / 10);
  if (n < 1e4) return nf0.format(Math.floor(n));
  const e = Math.floor(Math.log10(n) / 3);
  if (e >= SUF.length) return n.toExponential(2).replace('.', ',').replace('e+', 'e');
  const v = n / Math.pow(1000, e);
  return nf2.format(v >= 100 ? Math.floor(v) : Math.floor(v * 100) / 100) + ' ' + SUF[e];
}

export const plural = (n, w) => n + ' ' + w + (n > 1 ? 's' : '');
