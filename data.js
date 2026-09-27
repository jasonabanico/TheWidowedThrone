'use strict';

// The Widowed Throne: rules data. Classic Bard's Tale rules with prayers per rest.

const PAL = {
  black: '#000000', white: '#FFFFFF', red: '#883932', cyan: '#67B6BD', purple: '#8B3F96', green: '#55A049',
  blue: '#40318D', yellow: '#BFCE72', orange: '#8B5429', brown: '#574200', lred: '#B86962', dgrey: '#505050',
  grey: '#787878', lgreen: '#94E089', lblue: '#7869C4', lgrey: '#9F9F9F',
};

const RACES = {
  rhomaios: { name: 'Rhomaios', st: 0, dx: 0, cn: 0, lk: 0, fa: 1 },
  armenian: { name: 'Armenian', st: 1, dx: 0, cn: 1, lk: -1, fa: 0 },
  syrian: { name: 'Syrian', st: -1, dx: 1, cn: 0, lk: 0, fa: 1 },
  slav: { name: 'Slav', st: 1, dx: 0, cn: 1, lk: 0, fa: -1 },
  isaurian: { name: 'Isaurian', st: 0, dx: 1, cn: 1, lk: -1, fa: 0 },
  giantblood: { name: 'Giant-blood', st: 3, dx: -1, cn: 2, lk: -1, fa: -2 },
};

const ALL_WEAPONS = ['club', 'dagger', 'staff', 'mace', 'spathion', 'axe', 'kontarion', 'sling', 'bow', 'goad'];
const CLASSES = {
  hornbearer: { name: 'Hornbearer', ab: 'HB', hd: 10, atk: 1, weapons: ALL_WEAPONS, armour: ['quilted', 'mail', 'lamellar', 'shield', 'kite', 'helm'], ability: 'rebuke',
    desc: 'Armoured knight of the Tagma. Can rebuke a demon once per rest.' },
  akrites: { name: 'Akrites', ab: 'AK', hd: 9, atk: 1, weapons: ALL_WEAPONS.filter((w) => w !== 'kontarion'), armour: ['quilted', 'mail', 'shield', 'helm'], ability: 'crit',
    desc: 'Border warden of the Akritai. Critical hits, +4 damage to giants, avoids traps.' },
  deliverer: { name: 'Deliverer', ab: 'DL', hd: 10, atk: 1, weapons: ALL_WEAPONS.filter((w) => w !== 'kontarion'), armour: ['quilted', 'mail', 'lamellar', 'shield', 'kite', 'helm'], ability: 'surge',
    desc: 'An ordinary person God raises up. Once per rest the Spirit comes upon them.' },
  abba: { name: 'Abba/Amma', ab: 'AB', hd: 6, atk: 0.5, weapons: ['club', 'staff', 'mace', 'sling', 'goad'], armour: ['quilted', 'shield', 'helm'], pray: 'abba',
    desc: 'Elder of the Desert. Prayers of healing, protection and casting out.' },
  icon: { name: 'Iconographer', ab: 'IC', hd: 5, atk: 0.4, weapons: ['dagger', 'staff', 'sling'], armour: ['quilted'], pray: 'icon',
    desc: 'Painter of Light. Prayers of light, discernment, wards and passage.' },
  fool: { name: 'Holy fool', ab: 'FL', hd: 7, atk: 0.6, weapons: ['club', 'dagger', 'staff', 'sling', 'goad'], armour: ['quilted', 'mail', 'helm'], ability: 'psalm',
    desc: 'Salos, a holy fool. Sings psalms. Immune to flattery, charm and temptation.' },
  anarg: { name: 'Anargyros', ab: 'AN', hd: 7, atk: 0.6, weapons: ['staff', 'club', 'sling', 'dagger'], armour: ['quilted', 'helm'], ability: 'hands',
    desc: 'One of the Anargyroi, who heal without silver. Heals with the laying on of hands.' },
};

// XP needed to reach each level (index = level).
const XP_TABLE = [0, 0, 100, 280, 600, 1200, 2200, 3600, 5500, 8000, 11500, 16000, 22000, 30000, 40000];
function xpFor(level) { return level < XP_TABLE.length ? XP_TABLE[level] : XP_TABLE[XP_TABLE.length - 1] + (level - XP_TABLE.length + 1) * 25000; }

// Equipment. dmg: [dice, sides, plus]. small: humble weapon (full damage to giants).
const ITEMS = {
  club: { name: 'Club', type: 'weapon', dmg: [1, 4, 0], small: true, price: 5 },
  dagger: { name: 'Dagger', type: 'weapon', dmg: [1, 4, 0], price: 20 },
  staff: { name: 'Staff', type: 'weapon', dmg: [1, 6, 0], price: 15 },
  mace: { name: 'Steel mace', type: 'weapon', dmg: [1, 6, 1], price: 60 },
  spathion: { name: 'Spathion', type: 'weapon', dmg: [1, 8, 1], price: 150 },
  axe: { name: 'Axe', type: 'weapon', dmg: [1, 8, 0], price: 120 },
  kontarion: { name: 'Kontarion', type: 'weapon', dmg: [1, 10, 1], price: 300 },
  sling: { name: 'Sling', type: 'weapon', dmg: [1, 4, 0], small: true, ranged: true, price: 10 },
  bow: { name: 'Bow', type: 'weapon', dmg: [1, 6, 1], ranged: true, price: 200 },
  goad: { name: 'Goad', type: 'weapon', dmg: [1, 4, 1], small: true, price: 25 },
  quilted: { name: 'Quilted coat', type: 'body', ac: 1, price: 40 },
  mail: { name: 'Mail shirt', type: 'body', ac: 3, price: 250 },
  lamellar: { name: 'Lamellar', type: 'body', ac: 5, price: 900 },
  shield: { name: 'Shield', type: 'shield', ac: 1, price: 60 },
  kite: { name: 'Kite shield', type: 'shield', ac: 2, price: 200, classes: ['hornbearer', 'deliverer'] },
  helm: { name: 'Helm', type: 'helm', ac: 1, price: 80 },
  torch: { name: 'Torch', type: 'use', use: 'light', light: 40, price: 5 },
  oil: { name: 'Lamp oil', type: 'use', use: 'light', light: 150, price: 40 },
  holywater: { name: 'Holy water', type: 'use', use: 'holywater', price: 60 },
  bread: { name: 'Bread & wine', type: 'use', use: 'heal', heal: [2, 6, 0], price: 30 },
  myrrh: { name: 'Myrrh', type: 'use', use: 'cure', price: 50 },
  // Found items.
  tentpeg: { name: 'Tent peg', type: 'weapon', dmg: [1, 6, 2], small: true, price: 0, sell: 50 },
  shepsling: { name: "Shepherd's sling", type: 'weapon', dmg: [2, 4, 2], small: true, ranged: true, blessed: true, price: 0, sell: 300 },
  bspathion: { name: 'Blessed spathion', type: 'weapon', dmg: [1, 8, 3], blessed: true, price: 0, sell: 600 },
  glory: { name: 'Glory, the giant sword', type: 'weapon', dmg: [3, 8, 4], price: 0, sell: 3000, idol: 'sword' },
  // The armour of God. virtue: the idol whose Foothold makes the piece go cold.
  belt: { name: 'Belt of Truth', type: 'belt', ac: 1, virtue: 'crown', aog: true, desc: 'Guards against lies, slander and charm.' },
  breast: { name: 'Breastplate of Justice', type: 'body', ac: 6, virtue: 'gold', aog: true, desc: 'The breastplate of justice.' },
  shieldf: { name: 'Shield of Faithfulness', type: 'shield', ac: 3, virtue: 'flesh', aog: true, desc: 'Halves fire. Quenches burning arrows.' },
  boots: { name: 'Boots of Peace', type: 'feet', ac: 1, virtue: 'sword', aog: true, desc: 'Guards against fear and despair.' },
  helmet: { name: 'Helmet of Salvation', type: 'helm', ac: 2, virtue: null, aog: true, desc: 'Guards against accusation and possession.' },
  sword: { name: 'Sword of the Word', type: 'weapon', dmg: [3, 6, 2], blessed: true, virtue: null, aog: true, desc: 'The one weapon against spirits.' },
  // Relics won from the Holds.
  poimen: { name: 'Sling of Poimen', type: 'weapon', dmg: [2, 6, 2], small: true, ranged: true, blessed: true, relic: true, desc: "Braided from the wool of the Shepherd's first flock. +2 damage to giants." },
  theodore: { name: 'Lance-head of Theodore', type: 'weapon', dmg: [1, 10, 2], blessed: true, relic: true, desc: "The dragon-slayer's lance. +4 damage to serpents and dragons." },
  veil: { name: 'Veil of the Myrrh-bearer', type: 'helm', ac: 1, relic: true, desc: 'The wearer cannot be charmed.' },
  mamas: { name: 'Lamp of Saint Mamas', type: 'use', use: 'mamas', relic: true, desc: 'Light for 15 stages. It relights itself after every rest.' },
  // Quest items.
  letter: { name: "The lame lord's letter", type: 'quest', desc: "The crippled lord's letter. It names a ford and a date." },
  ledger: { name: "The forgers' ledger", type: 'quest', desc: "The Tower's record of every forged letter sent to the council." },
  chronicle: { name: 'The older chronicle', type: 'quest', desc: "The true chronicle of the Shepherd's reign, older than the Tower's forgery." },
};
const SLOTS = ['weapon', 'body', 'shield', 'helm', 'belt', 'feet'];

// Prayers. circle 1-5. when: combat, explore or any. target: member, group, party, none.
const PRAYERS = {
  HEAL: { name: 'Kyrie', circle: 1, who: 'abba', when: 'any', target: 'member', desc: 'Heal one: 2d6 + level.' },
  SHLD: { name: 'Shield of faith', circle: 1, who: 'abba', when: 'combat', target: 'none', desc: 'Party AC −2 this fight.' },
  EXOR: { name: 'Rebuke', circle: 2, who: 'abba', when: 'combat', target: 'group', desc: 'Casts out spirits: 3d6 + level to demons and shades.' },
  CURE: { name: 'Cleansing', circle: 2, who: 'abba', when: 'any', target: 'member', desc: 'Cure poison, fear and charm.' },
  MEND: { name: 'Bind wounds', circle: 3, who: 'abba', when: 'any', target: 'party', desc: 'Heal all: 2d8.' },
  BIND: { name: 'Bind strong man', circle: 3, who: 'abba', when: 'combat', target: 'group', desc: 'A group loses two rounds. Giants resist.' },
  RAIS: { name: 'Talitha koum', circle: 4, who: 'abba', when: 'explore', target: 'member', desc: 'Raise the dead to 1 hit point.' },
  FIRE: { name: 'Fire of Elijah', circle: 4, who: 'abba', when: 'combat', target: 'group', desc: '5d8 fire to a group.' },
  HOLY: { name: 'Trisagion', circle: 5, who: 'abba', when: 'combat', target: 'none', desc: '6d8 to all spirits, 2d8 to all others.' },
  WHOL: { name: 'Make whole', circle: 5, who: 'abba', when: 'any', target: 'party', desc: 'Full heal and cure for all living.' },
  LAMP: { name: 'Lamp of icon', circle: 1, who: 'icon', when: 'explore', target: 'none', desc: 'Light for 200 steps.' },
  SEEK: { name: 'Discernment', circle: 1, who: 'icon', when: 'any', target: 'none', desc: 'Reveal secret doors nearby. Unmask deceivers.' },
  MAPS: { name: 'Map of the way', circle: 2, who: 'icon', when: 'explore', target: 'none', desc: 'Show the whole level.' },
  WARD: { name: 'Ward', circle: 2, who: 'icon', when: 'any', target: 'none', desc: 'Party AC −2 until the next rest.' },
  SEAL: { name: 'Seal', circle: 3, who: 'icon', when: 'combat', target: 'group', desc: 'A group hits at −4 and cannot work sorcery.' },
  PART: { name: 'Parting sea', circle: 3, who: 'icon', when: 'explore', target: 'none', desc: 'Walk through the wall ahead.' },
  COAL: { name: 'Altar coal', circle: 4, who: 'icon', when: 'combat', target: 'group', desc: '4d8 + level to a group.' },
  HOME: { name: 'Way home', circle: 4, who: 'icon', when: 'explore', target: 'none', desc: 'Return to the City.' },
  ICON: { name: 'Pantocrator', circle: 5, who: 'icon', when: 'combat', target: 'none', desc: 'Every foe may be struck blind; 3d8 to spirits.' },
};

const PSALMS = [
  { id: 1, name: 'Kyrie eleison', lvl: 1, desc: 'Party AC −2 for the fight, or until the next fight.' },
  { id: 2, name: 'Phos hilaron', lvl: 1, desc: 'Gladsome light: light for 120 steps.' },
  { id: 3, name: 'Trisagion', lvl: 3, desc: 'Demons and shades strike at −3 this fight.' },
  { id: 4, name: 'Psalm 23', lvl: 5, desc: 'The Shepherd: each round the party heals 1d4.' },
  { id: 5, name: 'Song of ascent', lvl: 7, desc: 'Party strikes at +2 this fight.' },
  { id: 6, name: "Fool's truth", lvl: 9, desc: 'Men who hear it may throw down their arms.' },
];

// Monsters. hp/dmg: [dice, sides, plus]. kind: beast, man, demon, shade, serpent, giant.
const MONSTERS = {
  rat: { name: 'Cistern rat', pl: 'Cistern rats', hp: [1, 4, 1], ac: 9, hit: 0, dmg: [1, 3, 0], att: 1, xp: 15, gold: [0, 2], kind: 'beast', sprite: 'rat', color: 'grey' },
  cutpurse: { name: 'Cutpurse', pl: 'Cutpurses', hp: [1, 8, 0], ac: 8, hit: 1, dmg: [1, 4, 0], att: 1, xp: 35, gold: [5, 20], kind: 'man', sprite: 'man', color: 'brown' },
  mocker: { name: 'Mocker', pl: 'Mockers', hp: [2, 6, 0], ac: 7, hit: 1, dmg: [1, 6, 0], att: 1, xp: 50, gold: [10, 30], kind: 'man', sprite: 'man', color: 'orange' },
  cserpent: { name: 'Cistern serpent', pl: 'Cistern serpents', hp: [2, 6, 0], ac: 7, hit: 2, dmg: [1, 4, 0], att: 1, xp: 60, gold: [0, 0], kind: 'serpent', sprite: 'serpent', color: 'green', spec: ['poison'] },
  slanderer: { name: 'Slanderer', pl: 'Slanderers', hp: [2, 6, 2], ac: 8, hit: 1, dmg: [1, 4, 0], att: 1, xp: 70, gold: [10, 40], kind: 'man', sprite: 'man', color: 'purple', spec: ['accuse'] },
  davarice: { name: 'Daimon of avarice', pl: 'Daimones of avarice', hp: [3, 6, 0], ac: 6, hit: 2, dmg: [1, 6, 0], att: 1, xp: 100, gold: [20, 60], kind: 'demon', sprite: 'demon', color: 'yellow', spec: ['accuse'] },
  shade: { name: 'Rephaim shade', pl: 'Rephaim shades', hp: [2, 8, 2], ac: 5, hit: 3, dmg: [1, 8, 0], att: 1, xp: 140, gold: [0, 0], kind: 'shade', sprite: 'shade', color: 'lgrey' },
  scribe: { name: 'Scribe of the Tower', pl: 'Scribes of the Tower', hp: [2, 6, 2], ac: 8, hit: 1, dmg: [1, 4, 0], att: 1, xp: 70, gold: [15, 45], kind: 'man', verb: 'is shaken by the truth and flees', spec: ['accuse'] },
  masterscribe: { name: 'Master Scribe', pl: 'Master Scribes', hp: [1, 1, 44], ac: 4, hit: 4, dmg: [1, 8, 1], att: 2, xp: 600, gold: [150, 150], kind: 'man', spec: ['accuse'], boss: true },
  crypt: { name: 'Restless heir', pl: 'Restless heirs', hp: [2, 6, 0], ac: 7, hit: 2, dmg: [1, 6, 0], att: 1, xp: 60, gold: [5, 25], kind: 'shade', verb: 'lies down in its porphyry tomb again' },
  falseangel: { name: 'Radiant stranger', pl: 'Radiant strangers', hp: [1, 1, 50], ac: 3, hit: 5, dmg: [2, 6, 0], att: 1, xp: 900, gold: [0, 0], kind: 'demon', sprite: 'angel', color: 'white', spec: ['charm'], boss: true },

  pirate: { name: 'Fog pirate', pl: 'Fog pirates', hp: [2, 8, 2], ac: 7, hit: 3, dmg: [1, 8, 0], att: 1, xp: 150, gold: [20, 60], kind: 'man', sprite: 'man', color: 'cyan' },
  marine: { name: 'Goldhand marine', pl: 'Goldhand marines', hp: [3, 8, 2], ac: 5, hit: 4, dmg: [1, 8, 1], att: 1, xp: 220, gold: [30, 80], kind: 'man', sprite: 'soldier', color: 'yellow' },
  brood: { name: 'Brood of Rahab', pl: 'Brood of Rahab', hp: [4, 8, 0], ac: 4, hit: 5, dmg: [2, 5, 0], att: 1, xp: 350, gold: [0, 0], kind: 'serpent', sprite: 'serpent', color: 'cyan' },
  drowned: { name: 'Drowned shade', pl: 'Drowned shades', hp: [3, 8, 2], ac: 5, hit: 4, dmg: [1, 8, 0], att: 1, xp: 280, gold: [0, 20], kind: 'shade', sprite: 'shade', color: 'cyan' },
  coinwight: { name: 'Coin-wight', pl: 'Coin-wights', hp: [2, 8, 2], ac: 7, hit: 4, dmg: [1, 6, 0], att: 1, xp: 180, gold: [10, 40], kind: 'shade', verb: 'lets go of its chains of coin and rests' },
  goldhoard: { proper: true, name: 'The Goldhand', pl: 'The Goldhand', hp: [1, 1, 50], ac: 1, hit: 7, dmg: [2, 6, 2], att: 1, xp: 2500, gold: [0, 0], kind: 'man', spec: ['breath'], breath: 'whips up a storm of coins', boss: true },
  goldflood: { proper: true, name: 'The Goldhand', pl: 'The Goldhand', hp: [1, 1, 40], ac: 3, hit: 7, dmg: [2, 8, 0], att: 1, xp: 2500, gold: [0, 0], kind: 'man', spec: ['breath'], breath: 'floods the vault with black seawater', boss: true },

  reveler: { name: 'Reveler', pl: 'Revelers', hp: [3, 6, 0], ac: 8, hit: 3, dmg: [1, 6, 0], att: 1, xp: 80, gold: [5, 30], kind: 'man', sprite: 'man', color: 'lred', spec: ['charmed'] },
  mask: { name: 'Festival mask', pl: 'Festival masks', hp: [3, 6, 2], ac: 7, hit: 4, dmg: [1, 6, 0], att: 1, xp: 200, gold: [20, 60], kind: 'man', verb: 'tears free of her mask and falls, weeping and alive', spec: ['charm'] },
  priestess: { name: 'Priestess', pl: 'Priestesses', hp: [3, 8, 2], ac: 6, hit: 4, dmg: [1, 6, 0], att: 1, xp: 300, gold: [30, 90], kind: 'man', sprite: 'woman', color: 'lred', spec: ['charm'] },
  ddesire: { name: 'Daimon of desire', pl: 'Daimones of desire', hp: [4, 8, 2], ac: 4, hit: 5, dmg: [1, 8, 0], att: 1, xp: 450, gold: [0, 0], kind: 'demon', sprite: 'demon', color: 'lred', spec: ['charm'] },
  oserpent: { name: 'Orchard serpent', pl: 'Orchard serpents', hp: [4, 8, 0], ac: 5, hit: 5, dmg: [1, 8, 0], att: 1, xp: 380, gold: [0, 0], kind: 'serpent', sprite: 'serpent', color: 'lgreen', spec: ['poison'] },
  mother1: { proper: true, name: 'The Mother of Festivals', pl: 'The Mother of Festivals', hp: [1, 1, 50], ac: 2, hit: 8, dmg: [2, 6, 0], att: 1, xp: 2000, gold: [0, 0], kind: 'man', spec: ['charm'], boss: true },
  mother2: { proper: true, name: 'The Mother of Festivals', pl: 'The Mother of Festivals', hp: [1, 1, 45], ac: 2, hit: 8, dmg: [1, 8, 2], att: 2, xp: 2000, gold: [0, 0], kind: 'man', boss: true },
  mother3: { proper: true, name: 'The Mother of Festivals', pl: 'The Mother of Festivals', hp: [1, 1, 45], ac: 1, hit: 9, dmg: [2, 8, 2], att: 1, xp: 2000, gold: [0, 0], kind: 'man', spec: ['despair'], boss: true },

  bandit: { name: 'Bandit', pl: 'Bandits', hp: [3, 8, 2], ac: 5, hit: 4, dmg: [1, 8, 0], att: 1, xp: 200, gold: [20, 70], kind: 'man', sprite: 'man', color: 'orange' },
  brute: { name: 'Giant-blooded brute', pl: 'Giant-blooded brutes', hp: [5, 8, 0], ac: 4, hit: 6, dmg: [2, 6, 0], att: 1, xp: 500, gold: [30, 90], kind: 'giant', sprite: 'giant', color: 'orange' },
  gibbor: { name: 'Gibbor', pl: 'Gibborim', hp: [7, 8, 0], ac: 3, hit: 8, dmg: [2, 8, 0], att: 1, xp: 900, gold: [50, 150], kind: 'giant', sprite: 'giant', color: 'red' },
  rwarrior: { name: 'Rephaim', pl: 'Rephaim', hp: [5, 8, 0], ac: 3, hit: 7, dmg: [2, 6, 0], att: 1, xp: 700, gold: [0, 0], kind: 'shade', sprite: 'shade', color: 'lgrey' },
  ironbrand: { name: 'Iron-branded', pl: 'Iron-branded', hp: [4, 8, 2], ac: 3, hit: 6, dmg: [1, 10, 0], att: 1, xp: 450, gold: [20, 60], kind: 'man', verb: 'feels the brand go cold and drops his weapon' },
  anak: { proper: true, name: 'Anak son of Gathos', pl: 'Anak son of Gathos', hp: [1, 1, 110], ac: 1, hit: 10, dmg: [3, 8, 0], att: 2, xp: 7000, gold: [800, 800], kind: 'giant', sprite: 'giant', color: 'brown', spec: ['fear'], boss: true },
  anak2: { proper: true, name: 'Anak son of Gathos', pl: 'Anak son of Gathos', hp: [1, 1, 70], ac: -1, hit: 10, dmg: [3, 8, 2], att: 2, xp: 5000, gold: [0, 0], kind: 'giant', spec: ['fear'], boss: true },

  raider: { name: 'Raider', pl: 'Raiders', hp: [4, 8, 2], ac: 5, hit: 6, dmg: [1, 10, 0], att: 1, xp: 300, gold: [30, 100], kind: 'man', sprite: 'man', color: 'yellow' },
  seirim: { name: 'Goat-demon', pl: 'Goat-demons', hp: [5, 8, 2], ac: 3, hit: 7, dmg: [2, 6, 0], att: 1, xp: 700, gold: [0, 0], kind: 'demon', sprite: 'goat', color: 'brown' },
  seraph: { name: 'Fiery serpent', pl: 'Fiery serpents', hp: [5, 8, 2], ac: 3, hit: 7, dmg: [2, 6, 0], att: 1, xp: 800, gold: [0, 0], kind: 'serpent', sprite: 'serpent', color: 'orange', spec: ['poison', 'fire'] },
  noonday: { name: 'Noonday demon', pl: 'Noonday demons', hp: [8, 8, 0], ac: 2, hit: 9, dmg: [1, 10, 0], att: 1, xp: 1500, gold: [0, 0], kind: 'demon', sprite: 'demon', color: 'yellow', spec: ['despair'] },
  saltpilgrim: { name: 'Salt pilgrim', pl: 'Salt pilgrims', hp: [3, 8, 0], ac: 6, hit: 5, dmg: [2, 6, 0], att: 1, xp: 400, gold: [0, 20], kind: 'shade', verb: 'crumbles, and the soul inside goes to its rest' },
  legion: { name: 'One of the Legion', pl: 'The Legion', hp: [1, 1, 50], ac: 5, hit: 8, dmg: [2, 6, 0], att: 2, xp: 2000, gold: [0, 0], kind: 'demon', verb: 'goes quiet. The man sits down, clothed and in his right mind' },
  nking1: { proper: true, name: 'The Noonday King', pl: 'The Noonday King', hp: [1, 1, 60], ac: 1, hit: 10, dmg: [2, 8, 0], att: 1, xp: 5000, gold: [0, 0], kind: 'demon', spec: ['despair'], boss: true },
  nking2: { proper: true, name: 'The Noonday King', pl: 'The Noonday King', hp: [1, 1, 60], ac: 0, hit: 10, dmg: [2, 8, 2], att: 1, xp: 5000, gold: [0, 0], kind: 'demon', spec: ['despair'], boss: true },
  nking3: { proper: true, name: 'The Noonday King', pl: 'The Noonday King', hp: [1, 1, 60], ac: 0, hit: 11, dmg: [3, 8, 0], att: 1, xp: 5000, gold: [0, 0], kind: 'demon', spec: ['despair', 'fear'], boss: true },

  seer: { name: 'Nephilim seer', pl: 'Nephilim seers', hp: [8, 8, 0], ac: 2, hit: 10, dmg: [2, 8, 0], att: 1, xp: 1600, gold: [100, 200], kind: 'giant', sprite: 'seer', color: 'purple', spec: ['sorcery'], range: true },
  anakim: { name: 'Anakim', pl: 'Anakim', hp: [12, 8, 0], ac: 0, hit: 13, dmg: [3, 10, 0], att: 1, xp: 3000, gold: [100, 300], kind: 'giant', sprite: 'giant', color: 'purple' },
  towerguard: { name: 'Concord soldier', pl: 'Concord soldiers', hp: [6, 8, 0], ac: 2, hit: 10, dmg: [2, 8, 0], att: 1, xp: 900, gold: [50, 120], kind: 'man', sprite: 'soldier', color: 'purple' },
  brickmute: { name: 'Brick-mute', pl: 'Brick-mutes', hp: [5, 8, 0], ac: 5, hit: 8, dmg: [1, 8, 2], att: 1, xp: 600, gold: [0, 10], kind: 'man', verb: 'remembers his own name and lays down his tools' },
  falsesaint: { name: 'False saint', pl: 'False saints', hp: [7, 8, 0], ac: 2, hit: 10, dmg: [2, 6, 2], att: 1, xp: 1600, gold: [50, 150], kind: 'demon', verb: 'drops its stolen relic and lies still' },
  hungry: { name: 'The Hungry', pl: 'The Hungry', hp: [9, 8, 0], ac: 1, hit: 11, dmg: [2, 8, 2], att: 1, xp: 2200, gold: [0, 50], kind: 'shade' },
  gate1: { proper: true, name: 'The Gatekeeper of Sheol', pl: 'The Gatekeeper of Sheol', hp: [1, 1, 100], ac: -3, hit: 13, dmg: [3, 10, 0], att: 2, xp: 12000, gold: [0, 0], kind: 'demon', spec: ['fear'], boss: true },
  gate2: { proper: true, name: 'The Gatekeeper of Sheol', pl: 'The Gatekeeper of Sheol', hp: [1, 1, 100], ac: -3, hit: 13, dmg: [3, 10, 0], att: 2, xp: 12000, gold: [0, 0], kind: 'demon', spec: ['accuse'], boss: true },
  gate3: { proper: true, name: 'The Gatekeeper of Sheol', pl: 'The Gatekeeper of Sheol', hp: [1, 1, 100], ac: -4, hit: 14, dmg: [3, 10, 2], att: 2, xp: 12000, gold: [0, 0], kind: 'demon', spec: ['despair', 'fear'], boss: true },
  sevenworse: { name: 'Unclean spirit', pl: 'Unclean spirits', hp: [7, 8, 0], ac: 2, hit: 11, dmg: [2, 8, 0], att: 1, xp: 1200, gold: [0, 0], kind: 'demon', sprite: 'demon', color: 'dgrey', spec: ['accuse'] },
  nebrodes: { proper: true, name: 'Nebrodes the Hunter', pl: 'Nebrodes the Hunter', hp: [1, 1, 320], ac: -3, hit: 14, dmg: [4, 10, 0], att: 2, xp: 40000, gold: [0, 0], kind: 'giant', sprite: 'king', color: 'purple', spec: ['fear'], boss: true },
};

const VERBS = { beast: 'dies', man: 'falls', demon: 'is cast out', shade: 'returns to Sheol', serpent: 'is slain', giant: 'falls like a tree' };

const IDOLS = { gold: 'Gold', flesh: 'Flesh', sword: 'Sword', crown: 'Crown' };
const THEMES = {
  waters: { name: 'Thema of the Waters', archon: 'Rahab the Sea-Dragon', idol: 'Money' },
  gardens: { name: 'Thema of the Gardens', archon: 'the Queen of Heaven', idol: 'Desire' },
  heights: { name: 'Thema of the Heights', archon: 'the Prince of the Heights', idol: 'War' },
  wilderness: { name: 'Thema of the Wilderness', archon: 'Azazel of the Wastes', idol: 'Despair' },
};
const ALLEGIANCE = ['Bowed', 'Contested', 'Wavering', 'Returned'];

// The Blight: how rebel rule shows on the land at each step of allegiance, and in each theme's idol.
const BLIGHT = [
  'A red sun behind haze. The dead walk, and Sheol seeps through cracks in the ground.',
  'The sky bruises at dusk, stone faces push out of the walls, and wells run brackish.',
  'Cold spots in the houses, milk that sours on feast days, and nightmares the whole village shares.',
  'Lamps burn in the chapels, birds nest in the eaves, and the dead rest.',
];
const THEME_BLIGHT = {
  waters: 'Coins grow on ship hulls like barnacles, and the fog whispers the debts of those it touches.',
  gardens: 'Fruit ripens and never rots, flowers grow teeth, and the air hangs heavy with perfume.',
  heights: 'Iron veins split the rock, swords sprout in ploughed fields, and rust-coloured rain stains the snow.',
  wilderness: 'The sand sings at noon, shadows stop moving, and salt figures of dead pilgrims stand along the roads.',
};
