// Catalogue du jeu : ajouter une ligne ici suffit pour ajouter un outil ou un avantage
import { fmt, nf2 } from './format.js';

export const ITEMS = [
  { id: 'steth',  kind: 'click', name: 'Stéthoscope',              desc: '+1 force par clic',              base: 1,     cost: 15 },
  { id: 'drill',  kind: 'auto',  name: 'Perceuse à colonne',        desc: 'Grignote l’acier sans relâche',  base: 1.5,   cost: 50 },
  { id: 'appr',   kind: 'auto',  name: 'Apprenti crocheteur',       desc: 'Petites mains, grande patience', base: 8,     cost: 420 },
  { id: 'lance',  kind: 'auto',  name: 'Lance thermique',           desc: 'Fond le blindage à 3 000 °C',    base: 45,    cost: 4200 },
  { id: 'algo',   kind: 'auto',  name: 'Décrypteur de combinaisons', desc: 'Teste 10 000 codes par seconde', base: 260,   cost: 46000 },
  { id: 'charge', kind: 'auto',  name: 'Charge creuse',             desc: 'Discrétion non garantie',        base: 1500,  cost: 520000 },
  { id: 'crew',   kind: 'auto',  name: 'Équipe de casseurs',        desc: 'Six spécialistes, un plan',      base: 9000,  cost: 6.2e6 },
  { id: 'tunnel', kind: 'auto',  name: 'Tunnelier',                 desc: 'Arrive par en dessous',          base: 60000, cost: 8e7 },
  // Fin de partie : chaque outil se débloque en achetant son contact chez le receleur (voir CONTACTS)
  { id: 'hack',   kind: 'auto',  name: 'Piratage du réseau bancaire', desc: 'Ouvre les coffres depuis un cybercafé', base: 4.2e5, cost: 1.1e9 },
  { id: 'insider',kind: 'auto',  name: 'Directeur de banque corrompu', desc: 'Connaît toutes les combinaisons',   base: 3e6,   cost: 1.5e10 },
  { id: 'drones', kind: 'auto',  name: 'Essaim de nanodrones',      desc: 'Se glisse dans les serrures',    base: 2.2e7, cost: 2.1e11 },
  { id: 'quantum',kind: 'auto',  name: 'Calculateur quantique',     desc: 'Essaie tous les codes à la fois', base: 1.6e8, cost: 3e12 },
  { id: 'syndic', kind: 'auto',  name: 'Syndicat international',    desc: 'Une équipe dans chaque capitale', base: 1.2e9, cost: 4.5e13 },
  { id: 'sat',    kind: 'auto',  name: 'Satellite espion',          desc: 'Voit à travers le blindage',     base: 9e9,   cost: 7e14 },
  { id: 'ai',     kind: 'auto',  name: 'IA de cambriolage',         desc: 'Planifie mille casses à la seconde', base: 1e11, cost: 1.05e16 },
  { id: 'orbital',kind: 'auto',  name: 'Station orbitale',          desc: 'Découpe les coffres au laser depuis l’espace', base: 1.2e12, cost: 1.6e17 },
  { id: 'chrono', kind: 'auto',  name: 'Machine à remonter le temps', desc: 'Ouvre le coffre avant qu’on le ferme', base: 1.5e13, cost: 2.4e18 },
  { id: 'fingers',kind: 'crit',  name: 'Doigts de fée',             desc: '+3 % de chances de clic parfait', base: 0.03, cost: 300, growth: 3.5, max: 10 },
];

// Avantages du receleur : coût en lingots par niveau, conservés à chaque cavale
// desc : effet d'un niveau ; cur(l) : effet total au niveau l (avantages à plusieurs niveaux)
export const PERKS = [
  { id: 'best',    name: 'Indicateur « Meilleur rapport »', max: 1, cost: () => 1,
    desc: 'Surligne l’outil qui rapporte le plus de crochetage / s par pièce d’or' },
  { id: 'gold',    name: 'Receleur attitré', max: 10, cost: l => Math.ceil(2 * Math.pow(1.6, l)),
    desc: '+25 % d’or par coffre et par niveau', cur: l => '+' + l * 25 + ' %' },
  { id: 'click',   name: 'Gants en kevlar', max: 5, cost: l => Math.ceil(2 * Math.pow(1.8, l)),
    desc: 'Chaque clic ajoute +2 % du crochetage / s en plus', cur: l => (2 + 2 * l) + ' % du crochetage / s par clic' },
  { id: 'time',    name: 'Brouilleur d’alarme', max: 4, cost: l => 3 * Math.pow(2, l),
    desc: '+5 s avant l’alarme des chambres fortes', cur: l => (30 + 5 * l) + ' s' },
  { id: 'jack',    name: 'Flair du perceur', max: 5, cost: l => Math.ceil(3 * Math.pow(1.8, l)),
    desc: '+2 % de chances de coffre doré', cur: l => (4 + 2 * l) + ' %' },
  { id: 'start',   name: 'Mise de départ', max: 5, cost: l => [2, 4, 8, 16, 32][l],
    desc: 'Chaque cavale démarre avec de l’or (×10 par niveau, 100 au premier)', cur: l => fmt(100 * Math.pow(10, l - 1)) + ' d’or' },
  { id: 'plans',   name: 'Plans volés', max: 3, cost: l => [5, 15, 40][l],
    desc: 'Chaque cavale reprend 5 coffres plus loin', cur: l => 'départ au coffre n° ' + (1 + 5 * l) },
  { id: 'night',   name: 'Équipe de nuit', max: 2, cost: l => [4, 12][l],
    desc: '+25 % sur le rythme des gains hors ligne', cur: l => (50 + 25 * l) + ' % du rythme' },
  { id: 'fingers', name: 'Mémoire des doigts', max: 1, cost: () => 5,
    desc: 'Les Doigts de fée sont conservés à chaque cavale' },
  { id: 'auto',    name: 'Comptable', max: 1, cost: () => 60, req: 'best',
    desc: 'Achète tout seul l’outil « Meilleur rapport » dès que tu peux te le payer' },
  { id: 'crit',    name: 'Coup de poignet', max: 5, cost: l => Math.ceil(3 * Math.pow(1.8, l)),
    desc: 'Les clics parfaits valent ×2 de plus', cur: l => 'clic parfait ×' + (8 + 2 * l) },
  { id: 'boss',    name: 'Spécialiste des chambres fortes', max: 5, cost: l => Math.ceil(3 * Math.pow(1.7, l)),
    desc: '+50 % sur le butin des chambres fortes', cur: l => 'butin ×' + nf2.format(3 + 1.5 * l) + ' au lieu de ×3' },
  { id: 'cheap',   name: 'Fournisseur discret', max: 5, cost: l => Math.ceil(4 * Math.pow(1.9, l)),
    desc: '−3 % sur le prix de tout le matériel', cur: l => '−' + 3 * l + ' %' },
  { id: 'resist',  name: 'Plans des serrures', max: 5, cost: l => Math.ceil(5 * Math.pow(1.9, l)),
    desc: '−5 % de résistance sur tous les coffres', cur: l => '−' + 5 * l + ' %' },
  { id: 'heist',   name: 'Cavale bien préparée', max: 5, cost: l => 5 * Math.pow(2, l),
    desc: '+10 % de lingots à chaque cavale', cur: l => '+' + 10 * l + ' %' },
  { id: 'watch',   name: 'Guetteur', max: 1, cost: () => 45,
    desc: 'En repli, retente tout seul la chambre forte dès que ton crochetage / s suffit à l’ouvrir avant l’alarme' },
];

// Contacts du receleur : chacun débloque un outil de fin de partie, dans l'ordre (chaque contact exige le précédent)
// et seulement à partir d'un record de coffre (minVault) : on ne les achète pas qu'avec des lingots
const CONTACTS = [
  // outil,     contact,                          lingots, record
  ['hack',    'un hacker de génie',               15,   45],
  ['insider', 'un banquier véreux',               30,   55],
  ['drones',  'un ingénieur militaire',           60,   65],
  ['quantum', 'un physicien ruiné',               120,  75],
  ['syndic',  'le Syndicat',                      200,  85],
  ['sat',     'une agence spatiale privée',       320,  95],
  ['ai',      'un laboratoire clandestin d’IA',   500,  104],
  ['orbital', 'un milliardaire excentrique',      750,  112],
  ['chrono',  'un horloger suisse très discret',  1000, 120],
];
CONTACTS.forEach(([itemId, who, price, minVault], i) => {
  const it = ITEMS.find(x => x.id === itemId);
  it.unlock = 'c_' + itemId;
  PERKS.push({
    id: it.unlock, group: 'contact', name: 'Contact : ' + who, max: 1, cost: () => price, minVault,
    req: i ? 'c_' + CONTACTS[i - 1][0] : undefined,
    desc: 'Débloque « ' + it.name + ' » dans le Matériel (' + fmt(it.base) + ' crochetage / s chacun)',
  });
});

// Fin de partie : avantage sans limite, pour que les lingots servent encore une fois tout le reste acheté
PERKS.push({
  id: 'network', group: 'endless', name: 'Réseau de recel international', max: Infinity, req: 'c_sat',
  cost: l => Math.ceil(150 * Math.pow(1.3, l)),
  desc: '+10 % de production et d’or par niveau, cumulable sans limite', cur: l => '×' + nf2.format(Math.pow(1.1, l)),
});

// Défis : une cavale avec une contrainte, à mener jusqu'à un coffre cible (3 niveaux de plus en plus loin).
// Chaque niveau réussi donne une récompense permanente (appliquée dans formulas.js).
export const CHALLENGES = [
  { id: 'noclick', name: 'Mains dans les poches', targets: [45, 85, 120],
    rule: 'Le cadran ne répond plus : seul le matériel crochète. Tu pars avec une perceuse offerte.',
    reward: '+25 % de production du matériel par niveau', cur: l => '×' + nf2.format(Math.pow(1.25, l)) },
  { id: 'nofleeing', name: 'Sans filet', targets: [45, 85, 120],
    rule: 'Impossible de fuir, et l’alarme des chambres fortes sonne 10 s plus tôt.',
    reward: '+4 s avant l’alarme par niveau', cur: l => '+' + 4 * l + ' s' },
  { id: 'poor', name: 'Fauché', targets: [40, 75, 110],
    rule: 'Tout le matériel coûte 10 fois plus cher.',
    reward: '−4 % sur le prix du matériel par niveau', cur: l => '−' + 4 * l + ' %' },
  { id: 'nolingot', name: 'Sans soutien', targets: [35, 50, 65],
    rule: 'Le bonus des lingots et le Réseau de recel ne comptent pas pendant le défi.',
    reward: '+10 % de lingots à chaque cavale par niveau', cur: l => '+' + 10 * l + ' %' },
  { id: 'speed', name: 'Contre la montre', targets: [30, 50, 70], time: 900,
    rule: 'Atteindre l’objectif en moins de 15 minutes, sinon le défi échoue.',
    reward: '+25 % d’or par niveau', cur: l => '+' + 25 * l + ' %' },
  { id: 'basic', name: 'À l’ancienne', targets: [35, 55, 75], allowed: ['steth', 'drill', 'appr', 'lance', 'algo', 'fingers'],
    rule: 'Seuls le Stéthoscope, la Perceuse, l’Apprenti, la Lance thermique, le Décrypteur et les Doigts de fée sont autorisés.',
    reward: '+15 % de production du matériel par niveau', cur: l => '+' + 15 * l + ' %' },
];

// Titres des sections du receleur
export const PERK_GROUPS = { contact: 'Contacts · matériel de fin de partie', endless: 'Sans limite' };
