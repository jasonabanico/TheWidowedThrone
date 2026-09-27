'use strict';

// Places. The City is a hub of buildings. Each dungeon level is a descent of
// several stages; events wait at fixed depths, with the lord of the Hold at the end.

const BUILDINGS = {
  G: "The Fool's Tower", M: 'The Mese market', C: 'The Great Church', I: "Pilgrims' hostel",
  E: "The Eparch's palace", H: 'The Harbour gate', W: 'The Undercroft stair',
};

const CITY = {
  id: 'city', city: true, name: 'Theopolis', sub: 'The City', icon: '☧', pal: 'city',
  enc: [['cutpurse', 1, 3], ['mocker', 1, 3]], rate: 0,
};

const LEVELS = {
  cist1: { name: 'The Undercroft', sub: 'The Crypts of the Emperors', icon: '✝', pal: 'crypt', tier: 1, dark: true, length: 6, exit: true, down: 'cist2',
    events: ['u1_tomb', 'c1_chest', 'c1_girl'], rate: 0.45,
    enc: [['rat', 2, 6], ['crypt', 1, 3], ['cutpurse', 1, 3], ['cserpent', 1, 2]] },
  cist2: { name: 'The Undercroft', sub: 'The Drowned Cisterns', icon: '≋', pal: 'stone', tier: 2, dark: true, length: 6, up: 'cist1',
    events: ['c2_shades', 'c2_belt', 'c2_chest'], boss: 'c2_boss', goal: 'c2_ledger', rate: 0.45,
    enc: [['scribe', 1, 3], ['davarice', 1, 2], ['shade', 1, 2], ['cserpent', 1, 3], ['rat', 3, 6]] },

  wat1: { name: "The Goldhand's harbour", sub: 'Thema of the Waters', icon: '⚓', pal: 'waters', tier: 3, dark: true, length: 7, exit: true, down: 'wat2', theme: 'waters',
    events: ['w1_chapel', 'w1_slaves', 'w1_chest'], rate: 0.45,
    enc: [['pirate', 1, 4], ['marine', 1, 3], ['coinwight', 1, 3], ['drowned', 1, 2]] },
  wat2: { name: 'The Drowned Mint', sub: 'Hold of the Waters', icon: '≋', pal: 'mint', tier: 4, dark: true, length: 7, up: 'wat1', theme: 'waters', hold: true,
    events: ['lamp_wat2', 'w2_chest'], boss: 'w2_boss', goal: 'w2_idol', rate: 0.45,
    enc: [['coinwight', 2, 4], ['brood', 1, 2], ['drowned', 1, 3], ['davarice', 1, 3], ['marine', 1, 2]] },

  gar1: { name: 'Thessalonike', sub: 'The festival streets', icon: '❀', pal: 'gardens', tier: 4, dark: false, length: 7, exit: true, down: 'gar2', theme: 'gardens',
    events: ['g1_feast', 'g1_orphans', 'g1_chest'], rate: 0.45,
    enc: [['reveler', 2, 5], ['mask', 1, 3], ['priestess', 1, 2], ['oserpent', 1, 2]] },
  gar2: { name: 'The Garden Below', sub: 'Hold of the Gardens', icon: '❀', pal: 'garden', tier: 5, dark: true, length: 7, up: 'gar1', theme: 'gardens', hold: true,
    events: ['lamp_gar2', 'g2_mirror', 'g2_chest'], boss: 'g2_boss', goal: 'g2_idol', rate: 0.45,
    enc: [['mask', 2, 4], ['priestess', 1, 3], ['ddesire', 1, 2], ['oserpent', 1, 3]] },

  hei1: { name: 'Göreme', sub: 'The cave cities', icon: '▲', pal: 'heights', tier: 5, dark: true, length: 8, exit: true, down: 'hei2', theme: 'heights',
    events: ['h1_boy', 'h1_iron', 'h1_captives', 'h1_chest'], rate: 0.45,
    enc: [['bandit', 2, 4], ['ironbrand', 1, 3], ['brute', 1, 2], ['rwarrior', 1, 2]] },
  hei2: { name: 'The Barrow of Gathos', sub: 'Hold of the Heights', icon: '▲', pal: 'barrow', tier: 6, dark: true, length: 7, up: 'hei1', theme: 'heights', hold: true,
    events: ['lamp_hei2', 'h2_peg', 'h2_chest'], boss: 'h2_boss', goal: 'h2_idol', rate: 0.45,
    enc: [['ironbrand', 1, 3], ['brute', 1, 3], ['gibbor', 1, 2], ['rwarrior', 1, 3]] },

  wil1: { name: 'The desert laura', sub: 'Thema of the Wilderness', icon: '☀', pal: 'wilderness', tier: 6, dark: false, length: 9, exit: true, down: 'wil2', theme: 'wilderness',
    events: ['x1_legion', 'x1_monks', 'x1_cell', 'x1_mount', 'x2_kingdoms', 'x1_chest'], rate: 0.4,
    enc: [['raider', 2, 4], ['seirim', 1, 2], ['seraph', 1, 2], ['saltpilgrim', 1, 3]] },
  wil2: { name: 'The Well of Azazel', sub: 'Hold of the Wilderness', icon: '☀', pal: 'well', tier: 7, dark: true, length: 8, up: 'wil1', theme: 'wilderness', hold: true,
    events: ['lamp_wil2', 'x2_chest'], boss: 'x2_boss', goal: 'x2_altar', rate: 0.45,
    enc: [['saltpilgrim', 2, 4], ['seirim', 1, 3], ['seraph', 1, 3], ['noonday', 1, 1]] },

  tow1: { name: 'Nebrodia', sub: 'The brick fields', icon: '♜', pal: 'tower', tier: 8, dark: false, length: 7, exit: true, down: 'tow2',
    events: ['t1_bricks', 't1_exiles', 't1_chest'], rate: 0.45,
    enc: [['towerguard', 1, 3], ['brickmute', 2, 4], ['seer', 1, 1]] },
  tow2: { name: 'The Roots of the Tower', sub: 'Hold of Nebrodia', icon: '♜', pal: 'roots', tier: 9, dark: true, length: 7, up: 'tow1', down: 'tow3', hold: true,
    events: ['lamp_tow2', 't2_sword', 't2_chest'], boss: 't2_seers', rate: 0.45,
    enc: [['anakim', 1, 1], ['seer', 1, 2], ['gibbor', 1, 3], ['brickmute', 2, 4]] },
  tow3: { name: 'The Roots of the Tower', sub: 'The foundations of the first Babel', icon: '♜', pal: 'roots', tier: 10, dark: true, length: 6, up: 'tow2', hold: true,
    events: ['t3_chest'], boss: 't3_adversary', goal: 't3_boss', rate: 0.4,
    enc: [['anakim', 1, 2], ['seer', 1, 2], ['towerguard', 2, 3], ['sevenworse', 1, 2]] },

  und3: { name: 'The Undercroft', sub: 'The Catacombs of the Apostates', icon: '✝', pal: 'catacomb', tier: 11, dark: true, length: 7, exit: true, down: 'und4', hold: true,
    events: ['lamp_und3', 'u3_saint', 'u3_chest'], rate: 0.45,
    enc: [['falsesaint', 1, 2], ['hungry', 1, 1], ['sevenworse', 1, 2], ['rwarrior', 2, 3]] },
  und4: { name: 'The Undercroft', sub: 'The Gate of Sheol', icon: '✝', pal: 'gate', tier: 12, dark: true, length: 6, up: 'und3', hold: true,
    events: ['u4_chest'], boss: 'u4_gate', goal: 'u4_horn', rate: 0.4,
    enc: [['hungry', 1, 2], ['falsesaint', 1, 2], ['sevenworse', 1, 3]] },
};

const EVENT_TITLES = {
  u1_tomb: 'The empty tomb', c1_chest: 'A hidden chest', c1_girl: 'A frightened girl',
  c2_shades: 'The unburied bones', c2_belt: 'An old reliquary', c2_chest: 'A hidden chest', c2_boss: 'The Medusa hall', c2_ledger: 'The forgers\' desk',
  w1_chapel: 'The Harbour Chapel', w1_slaves: 'The slave block', w1_chest: 'A hidden chest',
  w2_chest: 'The vault of records', w2_boss: 'The lowest vault', w2_idol: 'The golden serpent',
  g1_feast: 'The festival feast', g1_orphans: 'The house of the Queen', g1_chest: 'A hidden chest',
  g2_mirror: 'The hall of mirrors', g2_chest: 'A hidden chest', g2_boss: 'The cavern paradise', g2_idol: 'The altar of the Queen',
  h1_boy: 'The shepherd boy', h1_iron: 'The iron tax', h1_captives: 'The cave prison', h1_chest: 'A hidden chest',
  h2_peg: "A herdswoman's tent", h2_chest: 'A hidden chest', h2_boss: 'The tomb of Gathos', h2_idol: 'The war-standard',
  x1_legion: 'The tombs of the laura', x1_monks: 'The empty monastery', x1_cell: "An old mother's cell", x1_mount: 'The holy mountain', x2_kingdoms: 'The high place', x1_chest: 'A hidden cache',
  x2_chest: 'A hidden cache', x2_boss: 'The hall of the white sun', x2_altar: 'The salt altar',
  t1_bricks: 'The brick wall', t1_exiles: 'The brick fields', t1_chest: 'A hidden chest',
  t2_sword: 'A looted reliquary', t2_chest: 'A hidden chest', t2_seers: 'The council of seers',
  t3_chest: 'A hidden chest', t3_adversary: 'The last stair', t3_boss: 'The foundations of Babel',
  u3_saint: 'The false saint', u3_chest: 'Grave-goods of emperors',
  u4_chest: 'A hidden chest', u4_gate: 'The bronze door', u4_horn: 'The threshold',
  lamp_wat2: 'A cold lamp niche', lamp_gar2: 'A cold lamp niche', lamp_hei2: 'A cold lamp niche', lamp_wil2: 'A cold lamp niche', lamp_tow2: 'A cold lamp niche', lamp_und3: 'A cold lamp niche',
};

// Atmosphere, one line per depth, by palette.
const ATMOS = {
  crypt: ['Stone steps lead down from a crack in the City\'s oldest street.', 'The Shepherd\'s heirs lie in porphyry tombs along the walls.', 'Some of the tomb lids have been pushed aside from within.', 'A tomb carved for Andronikos the Proud stands open and empty.', 'The air smells of old incense and older rot.', 'Water drips somewhere below.', 'The crypt gives way to flooded stairs.'],
  stone: ['Forests of columns stand in black water.', 'Things swim between the columns.', 'Water drips from the vaulted roof.', 'Your steps echo off a hundred pillars.', 'The air smells of rust and lamp oil.', 'A Medusa head stares up from a column base.', 'The vaults go on further than the City above them.'],
  waters: ['Fog lies on the harbour like wet wool, whispering people\'s debts.', 'Warehouses lean over the quay, stamped with a coiled serpent.', 'Chains clink somewhere out of sight.', 'Coins grow on the hulls of the moored ships like barnacles.', 'A tunnel runs down into the sea caves.', 'Salt crusts the walls.', 'Something large moves under the black water.'],
  mint: ['Sea-caves open beneath the Goldhand\'s harbour.', 'Stamping presses rust in rows. Every coin they made bears a serpent.', 'Drowned debtors sit chained to the walls, and some of them move.', 'The floor is ankle-deep in coins and seawater.', 'Ledgers float in the flooded counting-house.', 'The walls sweat gold.', 'The lowest vault breathes like something asleep.'],
  gardens: ['Orange trees line the street, heavy with fruit that never rots.', 'Garlands hang from every balcony.', 'Drums and flutes play somewhere ahead.', 'Honey cakes lie on doorsteps as offerings.', 'Flowers along the path have grown small teeth.', 'The fountains run with wine.', 'The streets are full, and there are no children in them.'],
  garden: ['Stairs under the hippodrome lead down into warm, perfumed dark.', 'A cavern paradise opens: trees, fountains and a false sky painted gold.', 'Revellers dance here with masks grown into their faces.', 'Fruit hangs heavy and sweet, and nothing here is ever eaten.', 'Vines move when you are not looking at them.', 'A choir sings somewhere, beautifully and wrong.', 'At the heart of the garden, something laughs.'],
  heights: ['Rock chimneys rise around you, hollowed into homes.', 'A cave church glows with frescoes of the warrior saints.', 'The underground city goes down eight storeys.', 'A millstone door stands ready to roll shut.', 'Iron veins split the rock.', 'Swords sprout in a ploughed field like wheat.', 'Rust-coloured rain stains the snow.', 'Bones of old champions lie by the road.'],
  barrow: ['A giant\'s road climbs Mount Argaeus to a door cut in the rock.', 'The barrow\'s halls are built for people three times your height.', 'Iron-branded soldiers keep watch over the dead.', 'Shields of fallen champions cover the walls.', 'The rock trembles with heavy footsteps.', 'Bones as long as oars lie in the niches.', 'The tomb of Gathos lies ahead, its lid carved with his face.'],
  wilderness: ['Sand drifts into the doorways of empty cells.', 'The heat at noon presses on your neck.', 'The sand sings, very quietly.', 'Salt figures of dead pilgrims stand along the road.', 'Shadows have stopped moving.', 'Goat tracks, too large for goats.', 'The mountain path climbs through bare rock.', 'The air grows thin and strangely sweet.', 'A dry well waits at the end of the road.'],
  well: ['The dry well falls further than any well should.', 'At the bottom lies a buried city of salt.', 'Salt streets, salt houses, salt people standing in the doorways.', 'Time moves slowly here. Your torch flame barely flickers.', 'A white sun hangs in the cavern roof.', 'The sand sings louder.', 'The hall of the Noonday King lies ahead.', 'Everything here is very still.'],
  tower: ['The tower rises out of the plain, unfinished and enormous.', 'Brick spreads over the fields without end.', 'Labourers work in silence. None of them remembers his name.', 'Every brick is stamped with the same words.', 'Concord soldiers drill in perfect ranks.', 'Tribute from far kings is piled in the gatehouse.', 'Stairs lead down into the tower\'s roots.'],
  roots: ['The stairs go down into the foundations of the first Babel.', 'Here the bricks are older than the flood.', 'Seers\' fires burn in niches.', 'The walls are carved with the stolen wisdom of the Watchers.', 'Everyone you meet here speaks one tongue.', 'The wind moans up the stairwell from below.', 'You can feel the whole weight of the tower overhead.'],
  catacomb: ['A crack in the sanctuary floor leads down past the crypts.', 'These are the burial halls of those who bowed.', 'False saints walk here in stolen vestments.', 'Someone chants the liturgy backwards in the dark.', 'Bones are stacked to the ceiling, many of them giant.', 'Icons here have had their eyes scratched out.', 'The halls slope down toward a bronze glow.'],
  gate: ['The rock here is warm, like skin.', 'The air hums with a sound below hearing.', 'The dead drift past, going down.', 'Chains hang from the roof, and some of them are empty.', 'A bronze door stands in the living rock.', 'Before the door sits something with an iron crown.', 'Beyond the door is Sheol.'],
};

function curLevel() { return G.map === 'city' ? CITY : LEVELS[G.map]; }
function curMap() { return { def: curLevel() }; }
function levelOfMap() { return G.map === 'city' ? 1 : LEVELS[G.map].tier; }

// Which events wait at which depth.
function layout(id) {
  const L = LEVELS[id];
  const at = {};
  const add = (d, ev) => { (at[d] = at[d] || []).push(ev); };
  const n = L.events.length;
  L.events.forEach((ev, i) => add(1 + Math.floor((i * (L.length - 1)) / n), ev));
  if (L.boss) add(L.length, L.boss);
  if (L.goal) add(L.length, L.goal);
  return at;
}
function lampDepth(id) {
  const at = layout(id);
  for (const [d, evs] of Object.entries(at)) if (evs.includes('lamp_' + id)) return Number(d);
  return null;
}
