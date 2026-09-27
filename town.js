'use strict';

// Theopolis: the Fool's Tower, the Mese, the Great Church, the hostel, the Eparch,
// the Harbour gate and the Undercroft stair.

function enterBuilding(ch) {
  G.building = ch;
  MODE = 'building';
  ({ G: guild, M: market, C: church, I: inn, E: eparch, H: harbour, W: cisternDoor })[ch]();
}

function leaveBuilding() { G.building = null; backToExplore(); }

// ---------- the Fool's Tower ----------

function guild() {
  const text = ["The Fool's Tower, mother house of the Tagma."];
  text.push(G.party.length ? stableLine() : '"Gather a band," says the blind Abba.');
  showPanel({ text, options: [
    { k: 'C', t: 'Create a member', fn: createRace },
    { k: 'A', t: 'Add member', fn: addMember },
    { k: 'R', t: 'Remove member', fn: removeMember },
    { k: 'O', t: 'Order party', fn: orderParty },
    !G.roster.length ? { k: 'Q', t: 'Quick band of six', fn: quickParty } : null,
    { k: 'V', t: 'See the Abba', fn: abba },
    { k: 'S', t: 'Save game', fn: () => { saveGame(true); msg('The scribes record your deeds. Game saved.', guild); } },
    { k: 'E', t: 'EXIT', fn: leaveBuilding },
  ] });
}

function stableLine() {
  const lines = [
    'A shepherd\'s crook leans against the Abba\'s chair. Nobody knows whose it is.',
    'The blind Abba asks the Question to the empty hall, and listens to the silence.',
    'Novices practise with the sling in the yard, as the rule requires each morning.',
    'Stephanos, a Hornbearer home from the roads, tells the novices about a ford in Thrace.',
  ];
  return lines[(G.steps + G.act) % lines.length];
}

let DRAFT = null;
function createRace() {
  if (G.roster.length >= 12) { msg('The roster is full. Delete someone first.', guild); return; }
  DRAFT = {};
  showPanel({ text: ['Choose a people:'], options: [
    ...Object.entries(RACES).map(([k, r], i) => ({ k: String(i + 1), t: r.name, note: ['st', 'dx', 'cn', 'lk', 'fa'].filter((x) => r[x]).map((x) => `${x.toUpperCase()} ${r[x] > 0 ? '+' : '−'}${Math.abs(r[x])}`).join(' · ') || 'Balanced', fn: () => { DRAFT.race = k; createRoll(); } })),
    { k: 'ESC', t: 'CANCEL', fn: guild },
  ] });
}
function createRoll() {
  DRAFT.stats = rollStats(DRAFT.race);
  const s = DRAFT.stats;
  showPanel({ text: [RACES[DRAFT.race].name, `ST ${s.st}  DX ${s.dx}`, `CN ${s.cn}  LK ${s.lk}`, `FA ${s.fa}`, '', 'FA is faith. High faith gives extra prayers.'], options: [
    { k: 'R', t: 'REROLL', fn: createRoll },
    { k: 'K', t: 'KEEP', fn: createClass },
    { k: 'ESC', t: 'CANCEL', fn: guild },
  ] });
}
function createClass() {
  showPanel({ text: ['Choose a calling:'], options: [
    ...Object.entries(CLASSES).map(([k, c], i) => ({ k: String(i + 1), t: c.name, note: c.desc, fn: () => { DRAFT.cls = k; createName(); } })),
    { k: 'ESC', t: 'CANCEL', fn: guild },
  ] });
}
function createDescribe() {
  showPanel({ text: [CLASSES[DRAFT.cls].name, CLASSES[DRAFT.cls].desc], options: [
    { k: 'Y', t: 'Choose this calling', fn: createName },
    { k: 'N', t: 'Another calling', fn: createClass },
  ] });
}
function createName() {
  showPanel({ text: ['Name (10 letters), then enter:'], input: { value: '', max: 12, onDone: (v) => {
    if (!v.trim()) return;
    const c = makeChar(v.trim(), DRAFT.race, DRAFT.cls, DRAFT.stats);
    G.roster.push(c);
    if (G.party.length < 6) G.party.push(G.roster.length - 1);
    msg(`${c.name} joins ${G.party.includes(G.roster.length - 1) ? 'the party' : 'the roster'}.`, guild);
  }, onCancel: guild } });
}

function addMember() {
  const free = G.roster.map((c, i) => ({ c, i })).filter(({ i }) => !G.party.includes(i));
  if (!free.length) { msg('Everyone on the roster is already in the party.', guild); return; }
  if (G.party.length >= 6) { msg('The party is full.', guild); return; }
  showPanel({ text: ['Add whom?'], options: [...free.slice(0, 9).map(({ c, i }, n) => ({ k: String(n + 1), t: `${c.name} ${CLASSES[c.cls].ab} L${c.lvl}`, fn: () => { G.party.push(i); guild(); } })), { k: 'ESC', t: 'BACK', fn: guild }] });
}
function removeMember() {
  pickChar('Remove whom?', null, (c, i) => { G.party.splice(i, 1); guild(); }, guild);
}
function orderParty() {
  pickChar('Move whom to the front?', null, (c, i) => { const [x] = G.party.splice(i, 1); G.party.unshift(x); guild(); }, guild);
}

function quickParty() {
  const band = [
    ['STEPHANOS', 'armenian', 'hornbearer'], ['BARAK', 'slav', 'deliverer'], ['EIRENE', 'isaurian', 'akrites'],
    ['Amma Sarra', 'syrian', 'abba'], ['LAZAROS', 'rhomaios', 'icon'], ['SYMEON', 'rhomaios', 'fool'], ['KOSMAS', 'syrian', 'anarg'],
  ];
  const good = { hornbearer: 'st', deliverer: 'st', akrites: 'dx', abba: 'fa', icon: 'fa', fool: 'lk', anarg: 'fa' };
  for (const [name, race, cls] of band) {
    const s = rollStats(race);
    s[good[cls]] = Math.max(s[good[cls]], 16);
    s.cn = Math.max(s.cn, 12);
    G.roster.push(makeChar(name, race, cls, s));
  }
  G.party = [0, 1, 2, 3, 4, 5];
  msg('Six answer the call. Kosmas the physician waits on the roster if you need him.', guild);
}

function abba() {
  const ready = partyChars().filter((c) => !c.dead && c.xp >= xpFor(c.lvl + 1));
  const text = [];
  for (const c of ready) {
    while (c.xp >= xpFor(c.lvl + 1)) {
      c.lvl += 1;
      const gain = Math.max(1, roll(1, CLASSES[c.cls].hd) + sb(c.cn));
      c.maxhp += gain; c.hp += gain;
      const stat = ['st', 'dx', 'cn', 'lk', 'fa'][rnd(5)];
      if (c[stat] < 18 && Math.random() < 0.5) c[stat]++;
    }
    text.push(`${c.name} is now level ${c.lvl}.`);
  }
  if (!ready.length) text.push('"None of you is ready to grow. Go and serve."');
  text.push(abbaCounsel());
  msg(text, guild);
}

function abbaCounsel() {
  if (G.act === 1 && !partyHas('letter')) return '"The Eparch is troubled by forged letters in the council. Hear her. And beware a stranger who flatters."';
  if (G.act === 1 && partyHas('letter')) { advanceToAct2(); return 'The Abba holds the letter to his face as if he could smell the ink, and weeps. "His hand. Twenty years dead, and his hand." The lame lord of the Shepherd\'s line names a ford at Arkadiopolis in Thrace, at the first frost, and writes that Symeon\'s word was split in four and hidden in the four fallen themes. "Go to the ford first," says the Abba. "Then find the four words, and you will find the Horn." The Harbour gate is open to you.'; }
  if (G.act === 2) {
    const left = Object.keys(THEMES).filter((t) => !G.flags['idol_' + t]).map((t) => THEMES[t].name);
    if (!G.flags.done_ford) return '"Have you been to the ford? Go. The letter did not wait twenty years for nothing."';
    return `"You hold ${G.words.length} of the four words. Still bowed: ${left.join(', ') || 'none'}. The Waters are the gentlest road. The Heights and the Wilderness will test you. Light the lamps in the Holds as you go."`;
  }
  if (G.act === 3) return '"Nebrodes knows. Go down into the Roots of his tower before his host reaches our walls. And do not take any crown that is offered you."';
  if (G.act === 4 && !G.flags.hornFound) return '"The Tagma always said the Horn went down. The crack in the sanctuary floor is open. Go down, and take lamps."';
  if (G.act === 4) return '"The Horn has come up. Go to the Great Church. Ask the Question. Then be quiet and watch."';
  return '"Whom will the Horn anoint?"';
}

function advanceToAct2() { if (G.act < 2) { G.act = 2; G.flags.travel = true; } }

// ---------- the Mese ----------

const SHOP = ['club', 'dagger', 'staff', 'mace', 'spathion', 'axe', 'kontarion', 'sling', 'bow', 'goad',
  'quilted', 'mail', 'lamellar', 'shield', 'kite', 'helm', 'torch', 'oil', 'holywater', 'bread', 'myrrh'];

function market() {
  showPanel({ text: ['The Mese. Merchants sell from stalls under the broken arcades.', `You have ${G.gold} gold.`], options: [
    { k: 'B', t: 'BUY', fn: () => buyPage(0) },
    { k: 'S', t: 'SELL', fn: sellWho },
    { k: 'E', t: 'EXIT', fn: leaveBuilding },
  ] });
}

function buyPage(p) {
  const per = 8;
  const items = SHOP.slice(p * per, p * per + per);
  const more = (p + 1) * per < SHOP.length;
  showPanel({ text: [`Gold: ${G.gold}`], options: [
    ...items.map((id, n) => ({ k: String(n + 1), t: ITEMS[id].name, note: `${ITEMS[id].price} gold${ITEMS[id].dmg ? ` · damage ${ITEMS[id].dmg[0]}d${ITEMS[id].dmg[1]}${ITEMS[id].dmg[2] ? '+' + ITEMS[id].dmg[2] : ''}` : ''}${ITEMS[id].ac ? ` · AC −${ITEMS[id].ac}` : ''}${ITEMS[id].small ? ' · humble' : ''}`, disabled: G.gold < ITEMS[id].price, fn: () => buyItem(id, p) })),
    more ? { k: 'N', t: 'Next page', fn: () => buyPage(p + 1) } : { k: 'N', t: 'First page', fn: () => buyPage(0) },
    { k: 'ESC', t: 'BACK', fn: market },
  ] });
}

function buyItem(id, page) {
  const it = ITEMS[id];
  if (G.gold < it.price) { msg('You cannot afford it.', () => buyPage(page)); return; }
  pickChar(`${up(it.name)} for whom?`, (c) => !c.dead, (c) => {
    if (SLOTS.includes(it.type) && !canUse(c, id)) { msg(`${c.name} cannot use it.`, () => buyPage(page)); return; }
    if (c.inv.length >= 8) { msg(`${c.name}'s pack is full.`, () => buyPage(page)); return; }
    G.gold -= it.price;
    if (SLOTS.includes(it.type)) {
      const old = c.eq[it.type];
      c.eq[it.type] = id;
      if (old) c.inv.push(old);
      msg(`${c.name} now uses the ${up(it.name)}.${old ? ` The old one goes in the pack.` : ''}`, () => buyPage(page));
    } else { c.inv.push(id); msg(`${c.name} takes the ${up(it.name)}.`, () => buyPage(page)); }
  }, () => buyPage(page));
}

function sellWho() {
  pickChar('Who sells?', (c) => c.inv.length > 0, (c) => {
    showPanel({ text: ['Sell which?'], options: [...c.inv.map((id, n) => {
      const it = ITEMS[id];
      const price = it.sell || Math.floor((it.price || 0) / 2);
      return { k: String(n + 1), t: it.name, note: `${price} gold`, fn: () => {
        if (it.aog || it.type === 'quest') { msg('The merchant will not touch that.', market); return; }
        c.inv.splice(n, 1); G.gold += price; msg(`Sold for ${price}.`, market);
      } };
    }), { k: 'ESC', t: 'BACK', fn: market }] });
  }, market);
}

// ---------- the Great Church ----------

function church() {
  MODE = 'building'; G.building = 'C';
  const text = ['The Great Church stands without a roof. The liturgy goes on under the open sky. Patriarch Esdras the Younger receives you.'];
  if (hasClass('hornbearer') && !G.flags.askedChurch) { G.flags.askedChurch = true; text.push('Your Hornbearer asks the question: "Whom will the Horn anoint?" Behind the icon screen, something stirs like great wings.'); }
  showPanel({ text, options: [
    { k: 'H', t: 'Heal wounds', fn: churchHeal },
    { k: 'R', t: 'Raise the dead', fn: churchRaise },
    { k: 'C', t: 'Cure poison (20)', fn: churchCure },
    { k: 'O', t: 'CONFESSION', fn: confession },
    partyHas('chronicle') ? { k: 'G', t: 'Give the older chronicle', fn: giveChronicle } : null,
    G.act >= 4 && !G.flags.hornFound ? { k: 'D', t: 'Descend into the Undercroft', note: 'Through the crack in the sanctuary floor', fn: () => ask('The crack in the sanctuary floor falls past the crypts into the Catacombs of the Apostates. Go down?', () => enterDungeon('und3'), church) } : null,
    G.act >= 4 && G.flags.hornFound ? { k: 'S', t: 'Enter the sanctuary', fn: sanctuary } : null,
    { k: 'E', t: 'EXIT', fn: leaveBuilding },
  ] });
}

function giveChronicle() {
  for (const c of partyChars()) { const n = c.inv.indexOf('chronicle'); if (n >= 0) c.inv.splice(n, 1); }
  G.flags.chronicleGiven = true;
  G.gold += 800;
  const each = giveXp(2500);
  msg(['The Patriarch opens the purple binding with shaking hands. "Poimen," he reads aloud. "Anointed by Symeon at the Cilician Gates." He will read it from the ambo on Sunday, and the Tower\'s forged chronicle will not survive the week.', `The church gives you 800 gold for the road. Each gains ${each} experience.`], church);
}

function churchHeal() {
  pickChar('Heal whom? (1 Gold a point)', (c) => !c.dead && c.hp < c.maxhp, (c) => {
    const cost = c.maxhp - c.hp;
    if (G.gold < cost) { const pay = G.gold; c.hp += pay; G.gold = 0; msg(`You give all you have. ${c.name} heals ${pay}.`, church); return; }
    G.gold -= cost; c.hp = c.maxhp; msg(`${c.name} is healed. ${cost} gold for the poor box.`, church);
  }, church);
}
function churchRaise() {
  pickChar('Raise whom?', (c) => c.dead, (c) => {
    const cost = 150 * c.lvl;
    ask(`The Patriarch will pray over ${c.name}. The church asks ${cost} gold for the widows.`, () => {
      if (G.gold < cost) { msg('You have not enough gold.', church); return; }
      G.gold -= cost; c.dead = false; c.hp = 1; c.poison = false;
      msg(`"${c.name}, arise." And the dead sits up.`, church);
    }, church);
  }, church);
}
function churchCure() {
  pickChar('Cure whom?', (c) => c.poison, (c) => {
    if (G.gold < 20) { msg('You have not enough gold.', church); return; }
    G.gold -= 20; c.poison = false; msg(`${c.name} is cured.`, church);
  }, church);
}

function confession() {
  const who = partyChars().filter((c) => footTotal(c) > 0);
  if (!who.length) { msg('"You have given the devil no foothold. Go in peace."', church); return; }
  const gold = who.reduce((a, c) => a + c.foot.gold, 0);
  const cost = gold * 150;
  const text = ['The party confesses:'];
  for (const c of who) text.push(`${c.name}: ${Object.entries(c.foot).filter(([, v]) => v).map(([k, v]) => `${IDOLS[k]} ${v}`).join(', ')}`);
  if (cost) text.push(`Restitution for gold taken: ${cost}.`);
  ask(text, () => {
    if (G.gold < cost) { msg('You cannot make restitution yet. Gold footholds remain.', church); for (const c of who) { c.foot.flesh = 0; c.foot.sword = 0; c.foot.crown = 0; } return; }
    G.gold -= cost;
    for (const c of who) c.foot = { gold: 0, flesh: 0, sword: 0, crown: 0 };
    msg('"Your sins are forgiven." The armour of God grows warm again.', church);
  }, church);
}

// ---------- the hostel ----------

function inn() {
  const cost = partyChars().reduce((a, c) => a + 5 * c.lvl, 0);
  showPanel({ text: ["The pilgrims' hostel. Bunks, lentil soup, and a psalter chained to the wall.", innNews()], options: [
    { k: 'R', t: `Rest the night (${cost})`, fn: () => {
      if (G.gold < cost) { msg('The hostel keeper lets you sleep on the floor for nothing. You wake stiff but renewed.', inn); restParty(); for (const c of living()) c.hp = Math.min(c.maxhp, c.hp + Math.ceil(c.maxhp / 3)); return; }
      G.gold -= cost; restParty();
      for (const c of living()) c.hp = c.maxhp;
      saveGame(true);
      msg('You sleep and pray the morning office. Prayers, psalms and strength are renewed.', inn);
    } },
    { k: 'E', t: 'EXIT', fn: leaveBuilding },
  ] });
}

function innNews() {
  if (G.act === 1) return 'Pilgrims whisper of a radiant stranger who visits a young noble near the hostel.';
  if (G.act === 2) return 'A sailor says the Goldhand\'s fog took another grain ship. A nun from Thessalonike asks for prayers for her orphans. A scribe reads aloud from a new chronicle that says the Shepherd never lived.';
  if (G.act === 3) return 'Everyone talks of giants on the eastern road, of the Concord\'s Iron Host behind them, and of Lord Bardas, whom the Sword faction has crowned in the Hippodrome.';
  return 'The hostel is full of pilgrims waiting to see what the Horn will do.';
}

// ---------- the Eparch ----------

function eparch() {
  const text = ['Eparch Irene Doukaina receives you among builders\' plans and grain ledgers.'];
  if (G.act === 1 && !G.flags.eparchQuest) {
    G.flags.eparchQuest = true;
    text.push('"Letters forged in my hand turn the council against the Patriarch. They are too good for common forgers. I think the Tower\'s own Scribes are working under our feet, in the Undercroft. Find their master. I will pay 500 gold."');
  } else if (G.act === 1 && partyHas('ledger') && !G.flags.eparchPaid) {
    G.flags.eparchPaid = true; G.gold += 500;
    text.push('She reads the ledger and burns it in the brazier. "The Concord keeps good books. Now it keeps one fewer." She pays you 500 gold.');
    for (const c of partyChars()) { const n = c.inv.indexOf('ledger'); if (n >= 0) c.inv.splice(n, 1); }
  } else if (G.act === 1) text.push('"The Undercroft stair is on the east side of the City. Go carefully. The dead down there do not all rest."');
  else if (G.act === 2 && !G.flags.chronicleQuest) {
    G.flags.chronicleQuest = true;
    text.push('"The Tower\'s Scribes have published a chronicle that says the Shepherd never lived. People are believing it. The Patriarch needs an older copy, and the only one I know of was bought by the Goldhand\'s bankers. If you find it in the Drowned Mint, bring it to the Great Church."');
  } else if (G.act === 2) text.push(`"The themes: ${Object.keys(THEMES).map((t) => `${THEMES[t].name.replace('Thema of the ', '')} ${ALLEGIANCE[G.allegiance[t]]}`).join('. ')}."`);
  else if (G.act === 3) text.push('"Nebrodes has left his tower with half his host. The other half guards him. If he falls, the rest will scatter."');
  else text.push('"The City is waiting. So am I."');
  msg(text, leaveBuilding);
}

// ---------- the Harbour gate ----------

function harbour() {
  if (!G.flags.travel) { msg(['The Harbour gate and the roads beyond are barred by the Eparch\'s order until the forgeries in the City are dealt with.'], leaveBuilding); return; }
  const done = (t) => (G.flags['idol_' + t] ? ' *' : '');
  showPanel({ text: ['Ships and caravans leave from here. The passage costs 50 gold.', 'Where will you go?'], options: [
    !G.flags.done_ford ? { k: 'F', t: 'The ford at Arkadiopolis', note: 'Named in the lame lord\'s letter', fn: () => ask('The letter names a ford in Thrace, at the first frost. The frost has come. Ride there now?', fordScene, harbour) } : null,
    { k: '1', t: `The Waters${done('waters')}`, fn: () => travel('wat1') },
    { k: '2', t: `The Gardens${done('gardens')}`, fn: () => travel('gar1') },
    { k: '3', t: `The Heights${done('heights')}`, fn: () => travel('hei1') },
    { k: '4', t: `The Wilderness${done('wilderness')}`, fn: () => travel('wil1') },
    G.act >= 3 ? { k: '5', t: 'NEBRODIA', fn: () => travel('tow1') } : null,
    { k: 'E', t: 'EXIT', fn: leaveBuilding },
  ] });
}

const TRAVEL_TEXT = {
  wat1: 'The ship sails into the Aegean. On the third day the fog closes in, whispering, and the Goldhand\'s harbour rises out of it. Below it, they say, lies the Drowned Mint.',
  gar1: 'The road west runs through Thrace. In a ruined hall by the road, a lame man waves to you, and when you look again the hall is empty. Thessalonike smells of orange blossom and incense.',
  hei1: 'The caravan climbs for two weeks into Cappadocia. The rock chimneys of Göreme are hollow, and Christians live inside them. Above them looms Mount Argaeus, where Gathos is buried.',
  wil1: 'The caravan crosses into the Wilderness. At noon the sand sings and the shadows stop moving. A laura of monks\' cells stands empty in the rocks, and beyond it a dry well.',
  tow1: 'You ride east across the plain of Shinar. The tower of Nebrodia rises where the first Babel stood, and it is not finished.',
};
const TRAVEL_LEVEL = { wat1: 3, gar1: 4, hei1: 5, wil1: 6, tow1: 8 };

function travel(id) {
  const avg = living().reduce((a, c) => a + c.lvl, 0) / Math.max(1, living().length);
  const warn = avg + 1 < TRAVEL_LEVEL[id] ? ' The captain looks your band up and down and shakes his head. "That road will eat you."' : '';
  const names = { wat1: 'The Waters', gar1: 'The Gardens', hei1: 'The Heights', wil1: 'The Wilderness', tow1: 'NEBRODIA' };
  ask(`Pay 50 gold for passage to ${names[id]}?${warn}`, () => {
    if (G.gold < 50) { msg('You cannot pay the passage.', harbour); return; }
    G.gold -= 50;
    msg(TRAVEL_TEXT[id], () => enterDungeon(id));
  }, harbour);
}

// ---------- the Undercroft stair ----------

function cisternDoor() {
  const deep = G.act >= 4 ? ' The deeper halls can only be reached through the crack in the Great Church\'s sanctuary floor.' : '';
  ask(`Stone steps lead down from a crack in the City's oldest street into the Undercroft: the crypts of the emperors, and the drowned cisterns below them. It is dark down there.${deep} Go down?`, () => enterDungeon('cist1'), leaveBuilding);
}
