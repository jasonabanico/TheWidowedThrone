'use strict';

// Story events for the four acts: The Wall, The Judges, The Tower, The Anointing.

function done(id) { G.flags['done_' + id] = true; }
function scene(art, text, options) { MODE = 'scene'; G.sceneArt = art; showPanel({ text, options }); }
function cont(text, then, art) { scene(art || G.sceneArt, Array.isArray(text) ? text : [text], [{ k: 'SPACE', t: 'Continue', fn: then || backToExplore }]); }
function fight(spec, opts, onWin) { startCombat(spec, { ...opts, onWin }); }

function runEvent(id) { G.eventTitle = (typeof EVENT_TITLES !== 'undefined' && EVENT_TITLES[id]) || null; EVENTS[id](); }

function giveGold(n, lines) { G.gold += n; lines.push(`You find ${n} gold.`); }
function giveThings(ids, lines) {
  for (const id of ids) { const c = partyGets(id, ITEMS[id].aog || ITEMS[id].relic); lines.push(c ? `${c.name} takes ${ITEMS[id].name}.` : `No one has room for ${ITEMS[id].name}.`); }
}
function chest(id, gold, items, extra) {
  return () => {
    done(id);
    const lines = extra ? [...extra] : ['A chest, hidden in the dark.'];
    giveGold(gold, lines);
    giveThings(items, lines);
    cont(lines, backToExplore, 'chest');
  };
}

function raise(theme, lines, why) {
  if (G.allegiance[theme] >= 3) return;
  G.allegiance[theme] += 1;
  lines.push(`${why} ${THEMES[theme].name}: ${ALLEGIANCE[G.allegiance[theme]]}.`);
  if (G.allegiance[theme] === 3) lines.push(`The people turn back to God. ${THEMES[theme].archon} loses its seat, and the Blight lifts from the land. Far above, Michael's host drives the archon from its throne.`);
}

function giveWord(text, lines) {
  if (!G.words.includes(text)) G.words.push(text);
  lines.push(`A Word of Symeon (${G.words.length} of 4): "${text}"`);
}

function askQuestion(lines, answer) {
  if (hasClass('hornbearer')) lines.push('Your Hornbearer asks: "Whom will the Horn anoint?"', answer);
}

// A lord of a Hold fought in phases, one fight after another.
function phases(list, onWin) {
  const run = (i) => {
    const ph = list[i];
    const go = () => fight(ph.spec, { boss: true, ...(ph.opts || {}) }, () => (i + 1 < list.length ? run(i + 1) : onWin()));
    if (ph.intro) cont(ph.intro, go); else go();
  };
  run(0);
}

// When an Idol-born lord's last form breaks, the human face surfaces and pleads.
function mercy(who, past, saved, lost, after) {
  const chance = 0.45 + (hasFool() ? 0.1 : 0) + (hasClass('abba') ? 0.1 : 0) + (G.flags.lionMet ? 0.2 : 0) + (partyFootholds() === 0 ? 0.1 : 0);
  scene('people', [`The last form breaks, and for one breath ${who}'s human face surfaces from the ruin and pleads.`, past], [
    { k: 'M', t: "Offer Christ's mercy", note: `About ${Math.round(Math.min(0.95, chance) * 100)}% chance, better with a holy fool, an elder, the Lion's blessing and clean hearts`, fn: () => {
      const ok = Math.random() < chance;
      const each = giveXp(ok ? 2500 : 0);
      cont(ok ? [saved, `Each gains ${each} experience.`] : [lost], () => after(ok), 'people');
    } },
    { k: 'L', t: 'Let it end', fn: () => cont(lost, () => after(false), 'people') },
  ]);
}

// Meeting the Lion of Judah: footholds confessed, grace and strength restored.
function lionMeeting(lines) {
  const first = !G.flags.lionMet;
  G.flags.lionMet = true;
  for (const c of partyChars()) {
    c.foot = { gold: 0, flesh: 0, sword: 0, crown: 0 };
    if (!c.dead) { c.hp = c.maxhp; c.poison = false; if (first && c.fa < 18) c.fa += 1; }
  }
  restParty();
  lines.push('Every foothold is confessed and gone. Wounds close, and every prayer and gift is renewed.');
  if (first) lines.push('Each of you rises with +1 Faith.');
}

// The idol of each theme: break it, then fill the empty house.
function idolScene(theme, opts) {
  const key = 'idol_' + theme;
  if (!G.flags['done_' + opts.boss]) { EVENTS[opts.boss](); return; }
  if (G.flags[key]) { fillScene(theme, opts); return; }
  scene('idol', opts.text, [
    { k: 'B', t: 'Break the idol', fn: () => {
      G.flags[key] = true;
      const lines = [opts.broken];
      raise(theme, lines, 'In the markets they say the idol is broken.');
      giveWord(opts.word, lines);
      giveThings([opts.armour], lines);
      askQuestion(lines, opts.answer);
      cont(lines, () => fillScene(theme, opts), 'horn');
    } },
    opts.temptKey ? { k: 'T', t: opts.temptLabel, fn: () => {
      if (G.flags['tempt_' + theme]) { cont('The offer is gone. Only the idol remains.', () => idolScene(theme, opts)); return; }
      G.flags['tempt_' + theme] = true;
      tempt(opts.temptKey);
      opts.temptFx();
      cont([opts.temptText, `The devil gains a foothold (${IDOLS[opts.temptKey]}) in every heart but the fool's.`], () => idolScene(theme, opts));
    } } : null,
    { k: 'L', t: 'Leave for now', fn: backToExplore },
  ]);
}

function fillScene(theme, opts) {
  const id = opts.goal;
  scene('people', [
    'The idol lies in pieces. The Gospel warns that a house swept clean and left empty invites seven worse spirits.',
    opts.fillText,
  ], [
    { k: 'F', t: 'Fill the house (500)', fn: () => {
      if (G.gold < 500) { cont('You have not enough gold. Come back when you do.', backToExplore); return; }
      G.gold -= 500;
      done(id); G.flags['filled_' + theme] = true; delete G.flags['empty_' + theme];
      const lines = [opts.filledText];
      raise(theme, lines, 'Faith, justice and care fill the empty house.');
      cont(lines, afterTheme, 'people');
    } },
    { k: 'L', t: 'Leave it empty', fn: () => { done(id); G.flags['empty_' + theme] = true; cont('You leave the house swept and empty. Something in the dark takes note.', afterTheme); } },
  ]);
}

function afterTheme() {
  const n = Object.keys(THEMES).filter((t) => G.flags['idol_' + t]).length;
  cont(n >= 3 && G.act === 2 ? 'News will have reached Nebrodes by now. Return to the City.' : 'You climb out of the Hold into sunrise. Return to the City when you are ready.', backToExplore);
}

// Called whenever the party walks back into the City. Returns true if it showed a scene.
function cityArrival() {
  const broken = Object.keys(THEMES).filter((t) => G.flags['idol_' + t]).length;
  if (G.act === 2 && broken >= 3) {
    G.act = 3;
    saveGame();
    cont([
      'The City is in uproar. Nebrodes the Hunter has heard his seers: an anointing in the City would stop his tower. His giant host and the Iron Host of the Concord are marching west.',
      'In the Hippodrome, the Sword faction of the Tagma has crowned Lord Bardas Phokas, the strongest faithful lord, to meet him. The Abba said nothing.',
      'Nebrodes himself waits in the Roots of the Tower for his giant kings. The Harbour gate will take you east to Nebrodia.',
    ], backToExplore, 'people');
    return true;
  }
  if (G.act === 3 && G.flags.nebrodesDead) {
    G.act = 4;
    saveGame();
    cont([
      'The giant host broke when word came that Nebrodes had fallen. The Anakim fled east, boasting as they ran, and the Concord\'s Scribes are already rewriting the story.',
      'The Patriarch sends for you. "The seal of Michael over the crack in the sanctuary floor has broken," his message says. "The Tagma always believed the Horn went down. Come to the Great Church."',
    ], backToExplore, 'people');
    return true;
  }
  return false;
}

// The vigil lamp in each Hold.
function lampEvent(id) {
  return () => {
    const L = LEVELS[id];
    const hasOil = living().some((c) => c.inv.includes('oil'));
    scene('horn', ['A lamp niche in the wall, cold for a century. Someone once kept a light burning here against the dark.', 'To relight it you need olive oil and a prayer, and the lamp must burn through its first night. The Blight will fight back.'], [
      { k: 'L', t: hasOil ? 'Light the vigil lamp' : 'Light it (needs lamp oil)', disabled: !hasOil, fn: () => {
        const c = living().find((x) => x.inv.includes('oil'));
        c.inv.splice(c.inv.indexOf('oil'), 1);
        const [a, b] = L.enc;
        cont(['The wick takes. The flame is small and very bright. Out in the dark, things begin to gather.'], () =>
          fight([[a[0], a[2], 10], [b[0], b[1], 20]], {}, () => {
            done('lamp_' + id); G.flags['lamplit_' + id] = true;
            const lines = ['Dawn comes, even down here. The lamp is still burning, and the Blight has drawn back from it.', 'From now on you can walk the lamp road straight to this depth, and rest here once each visit.'];
            if (!G.flags.mamasGiven) { G.flags.mamasGiven = true; lines.push('In the niche behind the lamp, someone hid a second lamp long ago, wrapped in linen.'); giveThings(['mamas'], lines); }
            cont(lines, showLocation, 'horn');
          }), 'horn');
      } },
      { k: 'N', t: 'Leave it cold for now', fn: backToExplore },
    ]);
  };
}

const EVENTS = {
  // ----- the City -----
  walls() {
    done('walls');
    cont(['On the Land Walls, builders work with a trowel in one hand and a spear in the other. Fifty-two days, they say, and the wall stood again.', 'From the hills, mockers jeer.'], backToExplore, 'people');
  },
  mockers() {
    cont(['A knot of mockers blocks the lane. "What are these feeble Romans doing? Will they revive the stones from the rubbish?"'], () =>
      fight([['mocker', 4, 10], ['cutpurse', 2, 20]], {}, () => { done('mockers'); cont('The mockers scatter. A builder on the wall raises his trowel to you.', backToExplore); }), 'people');
  },
  stranger() {
    scene('adversary', [
      'Outside the hostel a radiant stranger speaks to a young noble, Michael Angelos. "God has chosen you. Seize the throne and I will stand beside you."',
      'The stranger is tall and bright, and he flatters beautifully.',
    ], [
      { k: 'L', t: 'Listen to him', fn: strangerFlatters },
      { k: 'T', t: 'Test the spirit', fn: strangerTest },
      { k: 'W', t: 'Walk on', fn: backToExplore },
    ]);
  },

  // ----- the Undercroft, upper depths -----
  u1_tomb() {
    cont(['A tomb carved for Andronikos the Proud stands open and empty. The heirs of the Shepherd lie in porphyry along the walls, and some of the lids have moved.', 'Scratched on the empty tomb, in fresh ink: the Scribes of the Tower meet below, where the columns have Medusa heads.'], () =>
      fight([['crypt', 3, 10]], {}, () => { done('u1_tomb'); cont('The restless heirs lie down again. You say a prayer over each tomb before you go on.'); }));
  },
  c1_chest: chest('c1_chest', 60, ['torch', 'holywater']),
  c1_girl() {
    done('c1_girl');
    const lines = ['A girl hides behind a column, shaking. Cutpurses dragged her down here for ransom. You give her bread and show her the way up.'];
    const each = giveXp(150);
    lines.push(`The vow of shelter is kept. Each gains ${each} experience.`);
    cont(lines, backToExplore, 'people');
  },
  c2_shades() {
    cont('Bones of the plague dead lie unburied here. Rephaim shades rise from them.', () =>
      fight([['shade', 3, 10]], {}, () => { done('c2_shades'); cont('You say the burial rites over the bones. The Rephaim do not return.'); }));
  },
  c2_belt: chest('c2_belt', 40, ['belt'], ['An old reliquary of the Tagma, hidden when the City fell. Inside: a belt engraved with one word, Truth.']),
  c2_chest: chest('c2_chest', 120, ['oil', 'bread']),
  c2_boss() {
    cont(['In a hall of Medusa-headed columns, Scribes of the Tower copy forged letters by lamplight. Their master looks up from his ledger and smiles. "The Concord has a page for each of you already."'], () =>
      fight([['masterscribe', 1, 10], ['scribe', 2, 20]], { boss: true }, () => { done('c2_boss'); cont('The Master Scribe falls. His scribes flee into the dark with their ink still wet.'); }), 'people');
  },
  c2_ledger() {
    if (!G.flags.done_c2_boss) { EVENTS.c2_boss(); return; }
    done('c2_ledger');
    const lines = ['The forgers\' ledger lies open on the desk: every letter the Concord\'s Chamber of Scribes has sent to the council, and whose hand it copied.', 'Among the forged letters is one that is not forged. It is addressed to the Fool\'s Tower, twenty years old, never delivered. The hand is shaky, the seal shows a sling stone, and it names a ford at Arkadiopolis and the first frost.'];
    giveThings(['ledger', 'letter'], lines);
    lines.push('Take the ledger to the Eparch and the letter to Abba Pelagios.');
    cont(lines);
  },

  // ----- the Waters -----
  w1_slaves() {
    cont(['The Goldhand\'s slave block. The crew of the lost grain ship stands in chains. Their captain swears a dragon took his ship. Marines in gold-scaled armour guard them.'], () =>
      fight([['marine', 3, 10], ['pirate', 2, 20]], {}, () => {
        done('w1_slaves');
        const lines = ['You strike off the chains. The captain\'s daughter Thekla wears an old signet: a sling stone beneath a horn.'];
        raise('waters', lines, 'Captives go free.');
        cont(lines, backToExplore, 'people');
      }), 'people');
  },
  w1_chest: chest('w1_chest', 200, ['holywater', 'holywater']),
  w1_chapel() {
    done('w1_chapel');
    restParty();
    for (const c of living()) c.hp = c.maxhp;
    const lines = ['The Harbour Chapel of the Tagma. Two Hornbearers keep watch on the Goldhand\'s fleet. They feed you, bind your wounds, and pray the night office with you. Prayers and strength are renewed.', 'They tell you the Goldhand bowed to the Sea-Dragon with the life of his firstborn son, and that he no longer comes up out of the Mint.'];
    askQuestion(lines, 'The sea is silent. One of the knights says, "It usually is."');
    cont(lines, backToExplore, 'people');
  },
  lamp_wat2: lampEvent('wat2'),
  w2_chest() {
    done('w2_chest');
    const lines = ['The Mint\'s vault of records: loans, deeds and debts going back a century, bought up by the Concord\'s Treasury.'];
    giveGold(300, lines);
    if (G.flags.chronicleQuest) lines.push('Among the ledgers is an old chronicle bound in purple leather. Its first page names Poimen the Shepherd, anointed by Symeon. This is the older copy the Patriarch needs.');
    giveThings(G.flags.chronicleQuest ? ['chronicle', 'oil'] : ['oil'], lines);
    cont(lines, backToExplore, 'chest');
  },
  w2_boss() {
    const generous = () => { G.flags.generous = true; };
    const hoard = () => phases([
      { spec: [['goldhoard', 1, 10], ['coinwight', 3, 10]], opts: { hpMod: G.flags.generous ? { goldhoard: -20 } : null } },
      { intro: ['The coin armour cracks. Seawater floods the vault, and the Goldhand heaves himself up out of the flood.'], spec: [['goldflood', 1, 10], ['coinwight', 1, 20]], opts: { hpMod: G.flags.generous ? { goldflood: -15 } : null } },
    ], () => mercy('Leon Goldhand',
      'He was a merchant once, afraid of losing everything. He gave the Sea-Dragon his firstborn son to keep it.',
      'Leon Goldhand lies on the wet floor, small and stripped and alive, and weeps for his son. When he can stand, he asks you to take him to a priest.',
      'The Goldhand sinks into the black water with his coins, and does not come up.',
      (saved) => {
        if (saved) G.flags.goldhandSaved = true;
        done('w2_boss');
        const lines = ['In the wreck of the lowest vault lies a rust-eaten lance-head, stolen from some church long ago.'];
        giveThings(['theodore'], lines);
        lines.push('The treasure of the Mint lies all around you.');
        scene('chest', lines, [
          { k: 'R', t: 'Return it to his victims', note: 'The drowned debtors\' families', fn: () => { const l = ['You carry the Mint\'s treasure up to the harbour and give it back, family by family.']; raise('waters', l, 'The debts are forgiven.'); cont(l, backToExplore, 'people'); } },
          { k: 'K', t: 'Keep it', note: '2000 gold', fn: () => { G.gold += 2000; tempt('gold'); cont(['You fill your packs.', 'The devil gains a foothold (Gold) in every heart but the fool\'s.'], backToExplore, 'chest'); } },
        ]);
      }));
    cont(['The lowest vault of the Drowned Mint breathes. Five metres of molten coin, harbour chain and barnacle fill it, with Leon Goldhand\'s small face set in the middle.', 'He talks before he fights. "Everyone has a price," he says. "Gold to roof the Great Church. A cure for any wound. The name of the heir. Name yours."'], () =>
      scene('idol', ['The Goldhand waits for your answer.'], [
        { k: 'A', t: 'Accept his price', note: '3000 gold and every wound healed, and two footholds', fn: () => { G.gold += 3000; tempt('gold'); tempt('gold'); for (const c of living()) { c.hp = c.maxhp; c.poison = false; } cont(['The offer is real. So is the grip it leaves on you. The devil gains two footholds (Gold) in every heart but the fool\'s.', '"Good," says the Goldhand. "Now we can do business." The coins rise.'], hoard); } },
        { k: 'G', t: 'Throw your gold into the sea', note: G.gold >= 300 ? 'Give away 300 gold. Generosity weakens him' : 'You need 300 gold', disabled: G.gold < 300, fn: () => { G.gold -= 300; generous(); cont(['You empty your purse into the black water. The Goldhand screams as if you had cut him. His coin armour loosens.'], hoard); } },
        { k: 'R', t: 'Refuse', fn: () => cont('"Then we do this the hard way." The coins rise.', hoard) },
      ]));
  },
  w2_idol() {
    idolScene('waters', {
      boss: 'w2_boss', goal: 'w2_idol',
      text: ['The golden serpent the Goldhand served coils on a plinth in the flooded temple of the Mint, with incense still smouldering before it.'],
      broken: 'You break the golden serpent on the rocks. Inside the idol, someone hid a scroll a hundred years ago.',
      word: 'The Horn was not taken. It hid itself.',
      armour: 'breast',
      answer: 'The cave fills with the sound of the sea, and under it, very faint, a shepherd\'s pipe.',
      fillText: 'The Harbour Chapel could be rebuilt in the port itself, with a priest and a grain dole for the crews.',
      filledText: G.flags.goldhandSaved ? 'Leon Goldhand himself carries the first stone. The chapel rises on the quay, and the fog lifts from the harbour mouth.' : 'The chapel rises on the quay, and the fog lifts from the harbour mouth.',
    });
  },

  // ----- the Gardens -----
  g1_orphans() {
    cont(['A house of the Queen, draped in garlands. The orphans of the festival are locked inside, waiting for the night of cakes. Priestesses and masked dancers bar the door.'], () =>
      fight([['priestess', 2, 10], ['mask', 2, 10]], {}, () => {
        done('g1_orphans');
        const lines = ['You lead the children out to the abbess. The smallest, a girl called Anna, carries a wooden shepherd\'s crook she will not put down.'];
        raise('gardens', lines, 'The children come home.');
        cont(lines, backToExplore, 'people');
      }), 'people');
  },
  g1_feast() {
    scene('people', ['The festival feast: orchard fruit that never rots, honey cakes stamped with a crowned woman, and dancers who reach for your hands. "Eat," they say. "She provides."'], [
      { k: 'E', t: 'Eat and dance', fn: () => { done('g1_feast'); for (const c of living()) { c.hp = c.maxhp; c.poison = false; } tempt('flesh'); cont(['The feast heals every wound. It is very sweet.', 'The devil gains a foothold (Flesh) in every heart but the fool\'s.']); } },
      { k: 'R', t: 'Refuse', fn: () => { done('g1_feast'); const each = giveXp(700); cont(`You bless the bread you carry and eat that instead. Each gains ${each} experience.`); } },
    ]);
  },
  g1_chest: chest('g1_chest', 250, ['holywater', 'myrrh']),
  lamp_gar2: lampEvent('gar2'),
  g2_mirror() {
    done('g2_mirror');
    if (hasClass('icon')) { const each = giveXp(900); cont(['A hall of mirrors where each visitor sees themselves crowned. Your Painter of Light paints the face of Christ on the largest mirror, and the hall goes dark and honest.', `Each gains ${each} experience.`]); }
    else cont('A hall of mirrors where each of you sees themselves crowned. You hurry through with your eyes down.');
  },
  g2_chest: chest('g2_chest', 400, ['myrrh', 'oil']),
  g2_boss() {
    const go = (fasted) => phases([
      { spec: [['mother1', 1, 10], ['mask', 2, 10]], opts: { noCharm: fasted } },
      { intro: ['The Feast is over. The garden itself wakes: vines as thick as cables reach for you from every tree.'], spec: [['mother2', 1, 10]] },
      { intro: ['The garlands fall away. Underneath is only Hunger, and it has her face.'], spec: [['mother3', 1, 10]] },
    ], () => mercy('the Mother of Festivals',
      'She was the Festival Council\'s first councillor once. In the Great Bowing she gave the Queen her own daughter.',
      'A woman in torn garlands kneels in the dead garden and asks what she has done. The Melodists\' hymn drifts down from the hippodrome above, and she weeps.',
      'The Mother of Festivals withers like a cut flower and is gone.',
      (saved) => {
        if (saved) G.flags.motherSaved = true;
        done('g2_boss');
        const lines = ['On the Mother\'s throne lies a plain linen veil. It smells of spices for a burial.'];
        giveThings(['veil'], lines);
        cont(lines, backToExplore, 'chest');
      }));
    cont(['At the heart of the Garden Below sits the Mother of Festivals: a towering figure of garlands and masks, laughing. "You are tired," she says. "Lie down. Let someone else fight."', 'A choir of Melodists sings the Trisagion in the hippodrome far above. Down here you can barely hear it.'], () =>
      scene('idol', ['Her charm is strong. Those who have fasted are said to be deaf to it.'], [
        { k: 'F', t: 'Fast a day before facing her', note: 'Everyone loses a fifth of their health, and her charm cannot touch you', fn: () => { for (const c of living()) c.hp = Math.max(1, c.hp - Math.ceil(c.maxhp / 5)); cont('You fast and pray through a day and a night in the dark. You are weak and very clear-headed.', () => go(true)); } },
        { k: 'A', t: 'Face her now', fn: () => go(false) },
      ]));
  },
  g2_idol() {
    idolScene('gardens', {
      boss: 'g2_boss', goal: 'g2_idol',
      text: ['The altar of the Queen of Heaven, heaped with cakes and incense. Up in the city, the Festival Council has come to the hippodrome, afraid of what you will do.'],
      broken: 'You overturn the altar and break the crowned image. Up in the hippodrome, one old woman starts to sing the Akathist hymn, and the Melodists take it up. Under the altar is a scroll.',
      word: 'It waits where the King of kings is enthroned.',
      armour: 'shieldf',
      answer: 'An orange tree in the courtyard blossoms out of season. That is all.',
      fillText: 'The abbess\'s orphanage could be endowed, so that no child in Thessalonike is hungry enough to go to the festival.',
      filledText: 'The orphanage is endowed. The Festival Council, shamed, matches your gift. The cakes stop.',
    });
  },

  // ----- the Heights -----
  h1_boy() {
    const slinger = living().some((c) => ['sling', 'shepsling', 'poimen'].includes(c.eq.weapon) || c.inv.includes('sling'));
    scene('boy', ['A shepherd boy, Mikros, finds you in the cave church. Göreme has chosen him as its spring champion against Anak son of Gathos. "Teach me the sling," he says, "like the Shepherd used."'], [
      { k: 'T', t: slinger ? 'Teach him the sling' : 'Teach him (no sling)', fn: () => {
        if (!slinger) { cont('No one in your band carries a sling. Buy one at the Mese and come back.'); return; }
        done('h1_boy'); G.flags.boyTaught = true;
        const lines = ['You teach him for three days. He is better than you by the second. He gives you his grandfather\'s sling in thanks: "I will make another."'];
        giveThings(['shepsling'], lines);
        cont(lines, backToExplore, 'boy');
      } },
      { k: 'N', t: 'Tell him to go home', fn: () => { done('h1_boy'); cont('He looks at you for a long moment and goes. You hear later that he went up to the barrow anyway.'); } },
    ]);
  },
  h1_iron() {
    scene('people', ['An envoy of the Concord of the Tower sits with the elders of Göreme: a courteous man with a seal of office and a column of Iron Host soldiers outside. "The Concord will protect your cave cities from Anak," he says. "We ask only your icons, for safekeeping."', 'The elders are tired and frightened. They want to accept.'], [
      { k: 'S', t: 'Speak for the icons', fn: () => { done('h1_iron'); G.flags.ironRefused = true; const each = giveXp(1200); cont(['You remind the elders who painted those icons, and why, and what the Concord does with the things it keeps safe. The eldest stands and thanks the envoy, and says no.', `The envoy bows, unoffended, and writes something down. Each gains ${each} experience.`], backToExplore, 'people'); } },
      { k: 'L', t: 'Let them decide', fn: () => { done('h1_iron'); G.flags.ironTaken = true; cont('The elders hand over the icons. The Iron Host marches away with them. The cave churches are very dark that night.'); } },
    ]);
  },
  h1_captives() {
    cont(['A cave prison. The families of last year\'s champions are held here as tribute for Anak. Bandits and iron-branded jailers guard them.'], () =>
      fight([['bandit', 2, 10], ['ironbrand', 2, 10]], {}, () => {
        done('h1_captives');
        const lines = ['The families walk out into the light. Göreme rings its bells for the first time in years.'];
        raise('heights', lines, 'Captives go free.');
        cont(lines, backToExplore, 'people');
      }), 'people');
  },
  h1_chest: chest('h1_chest', 300, ['oil', 'holywater']),
  lamp_hei2: lampEvent('hei2'),
  h2_peg: chest('h2_peg', 20, ['tentpeg'], ['A herdswoman\'s tent, abandoned in a side hall of the barrow. A hammer and a long iron tent peg lie by the door. You remember Jael.']),
  h2_chest: chest('h2_chest', 500, ['oil', 'bread', 'holywater']),
  h2_boss() {
    const anakFight = (mod) => phases([
      { spec: [['anak', 1, 10], ['gibbor', 2, 10]], opts: { hpMod: mod ? { anak: mod } : null } },
      { intro: ['Anak roars, tears the stone lid from his grandfather\'s sarcophagus, and lifts it like a shield.'], spec: [['anak2', 1, 10]] },
    ], () => {
      done('h2_boss');
      const lines = ['Anak son of Gathos falls like a tree across his grandfather\'s tomb, and the barrow shakes.', 'Among the grave-goods of Gathos lies a shepherd\'s sling braided from undyed wool. The giants buried the sling that killed their king with him, so that no one could use it again.'];
      giveThings(['poimen'], lines);
      cont(lines, backToExplore, 'boy');
    });
    const base = G.flags.boyTaught ? -70 : 0;
    const intro = ['Anak son of Gathos waits in his grandfather\'s tomb deep in Mount Argaeus: nearly four metres tall, crowned with iron, and vain beyond reason. The Prince of the Heights rides on his shoulder like a shadow. "Send me your champion," he bellows. "Or send me all of you."'];
    if (G.flags.boyTaught) intro.push('Mikros steps out from the dark and whirls his sling. The stone sinks into the giant\'s forehead. Anak staggers!');
    cont(intro, () => {
      if (!hasFool()) { anakFight(base); return; }
      scene('boy', ['Anak cannot refuse single combat, and he cannot bear to be laughed at.'], [
        { k: 'M', t: 'Let your holy fool mock him', fn: () => cont(['"Look at the giant! Twelve feet tall and afraid of a band of beggars!" Your fool capers on the tomb lid. Anak charges, blind with rage, and cracks his head on the lintel.'], () => anakFight(base - 20), 'boy') },
        { k: 'F', t: 'Fight', fn: () => anakFight(base) },
      ]);
    }, 'boy');
  },
  h2_idol() {
    idolScene('heights', {
      boss: 'h2_boss', goal: 'h2_idol',
      text: ['The war-standard of the Prince of the Heights stands over the tomb, hung with the helmets of dead champions. Anak\'s great sword, Glory, leans against it. It would make a legend of whoever carries it.'],
      temptKey: 'sword', temptLabel: 'Take the sword Glory', temptText: 'The sword is heavy and wonderful. You feel taller holding it.',
      temptFx: () => { partyGets('glory', false); },
      broken: 'You tear down the standard and bury the champions\' helmets. In the standard\'s hollow pole is a scroll.',
      word: 'Behind the veil, before the cherub\'s threshold.',
      armour: 'boots',
      answer: 'The wind in the barrow sounds for a moment like sheep bells.',
      fillText: 'The cave monastery of Saint George of the Rock could be restored and garrisoned, so the pass is never empty again.',
      filledText: 'Saint George of the Rock opens its doors. Mikros is the first to ring its bell.',
    });
  },

  // ----- the Wilderness -----
  x1_legion() {
    cont(['In the tombs outside the laura a man lives among the graves, naked, raving, cutting himself on the stones. Broken chains hang from his wrists. When he sees you he screams in many voices at once: "What have you to do with us?"'], () =>
      fight([['legion', 1, 10]], {}, () => { done('x1_legion'); G.flags.legionFreed = true; const each = giveXp(1500); cont(['The spirits go out of him with a sound like a herd of pigs running into the sea. He sits down among the tombs, clothed in your cloak and in his right mind.', 'He begs to come with you. You send him home instead, to tell his village what God has done for him.', `Each gains ${each} experience.`], backToExplore, 'people'); }), 'people');
  },
  x1_monks() {
    cont(['The monastery is empty at noon. Something walks from cell to cell in the heat, and where it passes the monks give up and leave. It turns toward you. It is yawning.'], () =>
      fight([['noonday', 1, 10], ['seirim', 2, 20]], {}, () => {
        done('x1_monks');
        const lines = ['The noonday demon is cast out. By evening the monks drift back from the rocks, ashamed and glad. Brother Loukas, the youngest, was never told who his grandfather was.'];
        raise('wilderness', lines, 'The desert fathers return.');
        cont(lines, () => {
          const l2 = ['That night you sleep in the empty cells. In the dark hour you wake, all of you at once, and the air smells of rain on dry ground.', 'A lion lies across the cell door: vast and golden, with the scars of the slain Lamb on his paws and side. The grass is growing green under him, here in the desert.', 'He looks at each of you in turn and asks one question, the same one, and each of you hears it as if it were meant for you alone: "What do you want me to do for you?"', 'Each of you answers. Then he rises and walks into the dark, and you are not afraid of anything.'];
          lionMeeting(l2);
          cont(l2, backToExplore, 'horn');
        }, 'people');
      }));
  },
  x1_cell() {
    done('x1_cell');
    G.flags.handsTaught = true;
    for (const c of partyChars()) { c.foot.flesh = 0; c.foot.sword = 0; }
    restParty();
    cont(['An old desert mother sits in her cell, weaving palm leaves into a basket. She looks at each of you and names the thought you fight hardest. "Watch, pray, work," she says. "When the noonday demon comes, work with your hands while you pray, and he cannot touch you."', 'You keep vigil with her through the night. Footholds of Flesh and Sword are broken, and prayers are renewed.'], backToExplore, 'people');
  },
  x1_mount() {
    done('x1_mount');
    restParty();
    const lines = ['The path climbs to the summit of the holy mountain, the one thin place the rebels have never taken. The air feels like the inside of a church. You keep vigil there, and your prayers are renewed.'];
    askQuestion(lines, 'This time the mountain answers. You see a ruined church by a river ford, a fire in the apse, sheep asleep around it, and a girl with a crook across her knees. A great lion lies beside the fire. Then it is gone.');
    if (!hasClass('hornbearer')) lines.push('In the silence at dawn you almost hear an answer to a question none of you asked.');
    cont(lines, backToExplore, 'mountain');
  },
  x1_chest: chest('x1_chest', 300, ['bread', 'bread', 'myrrh']),
  x2_kingdoms() {
    scene('adversary', ['On a high place above the laura, a voice shows you all the kingdoms of the world in a moment: the City, the themes, Nebrodia, lands beyond. "All this I will give you, if you will bow down."'], [
      { k: 'B', t: 'Bow', fn: () => { done('x2_kingdoms'); G.gold += 5000; tempt('crown'); cont(['Gold pours out of the rock. The voice laughs.', 'The devil gains a foothold (Crown) in every heart but the fool\'s.']); } },
      { k: 'R', t: '"Begone, Satan"', fn: () => { done('x2_kingdoms'); for (const c of living()) if (c.fa < 18) c.fa++; const each = giveXp(2000); cont(['"It is written: you shall worship the Lord your God, and him only shall you serve." The voice is gone.', `Every living member gains 1 Faith. Each gains ${each} experience.`]); } },
    ]);
  },
  lamp_wil2: lampEvent('wil2'),
  x2_chest: chest('x2_chest', 600, ['holywater', 'holywater', 'oil']),
  x2_boss() {
    const hands = !!G.flags.handsTaught;
    const intro = ['At the bottom of the Well of Azazel, in a buried city of salt, a husk sits on a salt throne crowned with a white sun. Time stops in his hall. The Noonday King does not move. He does not need to.'];
    if (hands) intro.push('You take out the palm leaves the desert mother gave you and weave as you pray. The stillness cannot get a grip on you.');
    cont(intro, () => phases([
      { spec: [['nking1', 1, 10]], opts: { handsAtWork: hands } },
      { intro: ['Stillness breaks, and the King calls up his salt: pilgrims who looked back, walking at noon.'], spec: [['nking2', 1, 10], ['saltpilgrim', 2, 10]], opts: { handsAtWork: hands } },
      { intro: ['Last comes Despair: the white sun blazes, and the King whispers that the day will never end.'], spec: [['nking3', 1, 10]], opts: { handsAtWork: hands } },
    ], () => mercy('the Noonday King',
      'He was the abbot of this laura once. He despaired of God\'s answer and bowed to Azazel for an end to waiting.',
      'An old monk sits on the salt floor, blinking, and asks what hour it is. For the first time in a hundred years, it is afternoon.',
      'The husk crumbles into salt and blows away across the buried city.',
      (saved) => { if (saved) G.flags.kingSaved = true; done('x2_boss'); backToExplore(); })), 'mountain');
  },
  x2_altar() {
    idolScene('wilderness', {
      boss: 'x2_boss', goal: 'x2_altar',
      text: ['The salt altar of Azazel stands at the heart of the buried city, heaped with the salt of pilgrims who gave up.'],
      broken: 'You break the salt altar. Beneath it lies a scroll, sealed with the stylite\'s seal.',
      word: 'Only the humble pass. The Horn will not choose the strong.',
      armour: 'helmet',
      answer: 'Far above, on the holy mountain, a bell rings by itself.',
      fillText: 'The laura above could be rebuilt, with a well and a guesthouse for pilgrims.',
      filledText: 'The well is dug and the guesthouse roofed. Pilgrims begin to cross the Wilderness again.',
    });
  },

  // ----- Nebrodia -----
  t1_bricks() {
    const knows = hasClass('akrites') || hasClass('icon');
    scene('people', ['Brick-mutes work along the endless wall, stamping each brick with the same words: let us make a name for ourselves. None of them remembers his own.'], [
      { k: 'N', t: 'Speak their true names', note: knows ? 'Your Akrites or Painter of Light can tell them' : 'You would need an Akrites or a Painter of Light', disabled: !knows, fn: () => { done('t1_bricks'); const each = giveXp(2000); cont(['You walk down the line and speak each labourer\'s name, the one his mother gave him. One by one they lay down their tools and weep.', `Each gains ${each} experience.`], backToExplore, 'people'); } },
      { k: 'L', t: 'Walk on', fn: () => { done('t1_bricks'); backToExplore(); } },
    ]);
  },
  t1_exiles() {
    cont(['Descendants of the faithful marched here a hundred years ago still make bricks for the tower. Concord soldiers drive them with whips, politely, by the book.'], () =>
      fight([['towerguard', 3, 10]], {}, () => { done('t1_exiles'); G.flags.exilesFreed = true; const each = giveXp(3000); cont(['The exiles drop their brick moulds and walk west. "Next year in the City," they say.', `Each gains ${each} experience.`], backToExplore, 'people'); }), 'people');
  },
  t1_chest: chest('t1_chest', 800, ['oil', 'holywater', 'holywater']),
  lamp_tow2: lampEvent('tow2'),
  t2_seers() {
    cont(['The council of Nephilim seers sits around a map of the City in the Roots of the Tower, reading omens in its streets. An Anakim warlord stands guard.'], () =>
      fight([['seer', 3, 20], ['anakim', 1, 10]], { boss: true }, () => { done('t2_seers'); cont('The seers\' map burns. Whatever they saw, they will not tell Nebrodes.'); }));
  },
  t2_sword: chest('t2_sword', 100, ['sword'], ['A reliquary looted from the City a hundred years ago. Inside lies a sword engraved with a verse: the word of God is sharper than any two-edged sword.']),
  t2_chest: chest('t2_chest', 1000, ['bread', 'bread', 'oil']),
  t3_adversary() {
    scene('adversary', ['On the last stair down to the foundations, a radiant figure holds out the imperial purple that Nebrodes stole. "Put it on. He is only a brute. You could rule them all, and rule them kindly."', 'He has no shadow.'], [
      { k: 'P', t: 'Put on the purple', fn: () => { done('t3_adversary'); G.flags.tookPurple = true; tempt('crown'); for (const c of living()) c.hp = c.maxhp; cont(['The purple fits. You feel strong and whole and very certain.', 'The devil gains a foothold (Crown) in every heart but the fool\'s.']); } },
      { k: 'R', t: 'Refuse', fn: () => { done('t3_adversary'); const each = giveXp(4000); cont(['"The purple belongs to one whom God chooses, and that is not you, and it is not me." The figure drops the robe and is not there.', `Each gains ${each} experience.`]); } },
    ]);
  },
  t3_chest: chest('t3_chest', 1500, ['holywater', 'holywater', 'bread']),
  t3_boss() {
    if (!G.flags.done_t3_adversary) { EVENTS.t3_adversary(); return; }
    const returned = Object.keys(THEMES).filter((t) => G.allegiance[t] >= 3);
    const empties = Object.keys(THEMES).filter((t) => G.flags['empty_' + t]);
    const intro = ['Nebrodes the Hunter waits at the foundations of the first Babel, in the stolen purple, with a bow taller than a man.'];
    if (returned.length) intro.push(`Overhead the air is full of a war you cannot see. ${returned.length} of the themes have turned back, and their archons no longer feed him. He is smaller than the stories.`);
    if (empties.length) intro.push('From the dark come unclean spirits, seven times worse, from the houses you left empty.');
    const spec = [['nebrodes', 1, 10], ['anakim', 1, 10]];
    if (empties.length) spec.push(['sevenworse', Math.min(4, empties.length * 2), 20]);
    cont(intro, () => fight(spec, { boss: true, hpMod: { nebrodes: -60 * returned.length }, hitMod: { nebrodes: -returned.length } }, () => {
      done('t3_boss'); G.flags.nebrodesDead = true;
      cont(['Nebrodes the Hunter falls. He is flesh, and he bleeds, and he dies like a man.', 'The tower groans over your heads. The freed exiles lead you up and out and west, toward the City.'], () => returnToCity(), 'people');
    }), 'people');
  },

  // ----- the Undercroft, the deep -----
  lamp_und3: lampEvent('und3'),
  u3_saint() {
    cont(['A false saint walks the catacomb in stolen vestments, chanting the liturgy backwards. A daimon looks out through its dead eyes, and it carries a relic stolen from the Great Church. The Hungry crawl after it.'], () =>
      fight([['falsesaint', 1, 10], ['hungry', 1, 20]], {}, () => {
        done('u3_saint');
        const lines = ['The false saint drops its stolen relic: a reliquary of the Great Church, with a hymn scratched inside the lid.', 'You carry it with you. It is lighter than it looks.'];
        giveThings(['holywater', 'holywater', 'bspathion'], lines);
        cont(lines, backToExplore, 'chest');
      }));
  },
  u3_chest: chest('u3_chest', 2000, ['oil', 'bread'], ['Grave-goods of forgotten emperors: gold cups, a sceptre with its jewels prised out, and a purse no one ever spent.']),
  u4_chest: chest('u4_chest', 800, ['holywater', 'holywater', 'myrrh']),
  u4_gate() {
    const speaker = living().find((c) => CLASSES[c.cls].pray && usesLeft(c) >= 3);
    const list = (skip) => [
      skip ? null : { spec: [['gate1', 1, 10], ['sevenworse', 2, 20]] },
      { intro: skip ? null : ['The Toll is paid in full. The Gatekeeper lifts his ring of keys, and every lock in the Undercroft turns at once.'], spec: [['gate2', 1, 10]] },
      { intro: ['The Keys fall. Last comes the Grave: the Gatekeeper opens his mouth, and it is the bronze door.'], spec: [['gate3', 1, 10], ['hungry', 1, 20]] },
    ].filter(Boolean);
    const win = () => { done('u4_gate'); cont(['The Gatekeeper of Sheol breaks apart. His iron crown rolls into the dark and does not stop rolling. The bronze door stays shut.'], backToExplore, 'people'); };
    cont(['A bronze door stands in the living rock. Before it, on a throne of chains, sits the Gatekeeper of Sheol: not a fallen man but a rebel power of the grave, crowned with iron. "Toll," he says. "Everyone pays the toll."'], () =>
      scene('idol', ['Christ holds the keys of death and Hades. Spoken in faith, that claim can strip the Gatekeeper of his Toll.'], [
        { k: 'C', t: 'Speak the claim of Christ', note: speaker ? `${speaker.name} spends three uses of grace` : 'An elder or Painter with three uses of grace left', disabled: !speaker, fn: () => {
          let n = 3;
          for (let i = 1; i <= 5 && n > 0; i++) while (slotsLeft(speaker, i) > 0 && n > 0) { speaker.used[i]++; n--; }
          cont([`${speaker.name} stands before the throne and says it: "I am the first and the last, and the living one. I died, and behold, I am alive for evermore, and I have the keys of death and Hades."`, 'The Gatekeeper flinches. The Toll is broken before he can take it.'], () => phases(list(true), win), 'horn');
        } },
        { k: 'F', t: 'Fight', fn: () => phases(list(false), win) },
      ]), 'idol');
  },
  u4_horn() {
    if (!G.flags.done_u4_gate) { EVENTS.u4_gate(); return; }
    done('u4_horn'); G.flags.hornFound = true;
    cont([
      'On the threshold of the bronze door lies the Horn of Anointing.',
      'It did not flee on the night of the statue. It came down. For a hundred years it has lain across this threshold and held the Gate of Sheol shut, while the City above forgot it and the Gatekeeper sat and waited.',
      'When you reach for it, it rises by itself, shining like a lamp, and goes up ahead of you: up through the catacombs and the crypts, toward the sanctuary of the Great Church.',
    ], () => returnToCity(), 'horn');
  },
};

// ---------- the ford at Arkadiopolis ----------

function fordScene() {
  G.building = null;
  const slinger = living().find((c) => ['sling', 'shepsling', 'poimen'].includes(c.eq.weapon) || c.inv.includes('sling'));
  const girl = () => scene('people', ['The girl comes out from behind the ruined wall with a pot of water and hands it to you. "You didn\'t ask me anything," she says. "Grandmother said you would ask me a question."'], [
    { k: 'Q', t: '"Whom will the Horn anoint?"', fn: () => fordEnd('She smiles the way people smile at a riddle whose answer they already know and will not tell. "Come in the morning," she says, "and see."') },
    { k: 'N', t: '"What is your name?"', fn: () => fordEnd('She laughs. "That\'s not the question," she says. "Come in the morning, and see."') },
  ]);
  cont([
    'You reach the ford at Arkadiopolis an hour before dawn, at the first frost, as the letter said. The river runs black and loud over the stones. On the far bank, behind a line of willows, a ruined church holds up two walls and part of an apse.',
    'A fire burns in the apse. A girl sits by it with a crook across her knees and a dozen sheep asleep around her. She looks twelve, maybe thirteen. She looks at your arms, and at the letter in your hand, and laughs. "You\'re late," she says. "My grandmother said you would come at the first frost. The frost came three days ago."',
    'Across the river, the willows move against the wind. Six shapes come out of the trees. The smallest stands a head taller than any man. One of them calls across in a voice like a millstone grinding: "Knight of nothing! Throne of nobody! Give us the shepherd and ride home."',
  ], () => scene('boy', ['The first giant steps into the river. The water reaches his knees.'], [
    slinger ? { k: 'S', t: 'Fit a stone to the sling', note: slinger.name, fn: () => {
      const each = giveXp(1500);
      cont([`${slinger.name}'s fingers find a river stone, smooth and cold. "The Lord who delivered me from the paw of the lion," ${slinger.name} says, and lets it go.`, 'It strikes the lead giant above the eye. He stands a moment with the river pulling at his legs, then falls sideways into the current, and the water does not give him back.', 'The others stop at the bank. One looks at the girl, then at the sky over the ruined church, and whatever he sees there turns his face grey. They go back into the willows.', `Each gains ${each} experience.`], girl, 'boy');
    } } : null,
    { k: 'F', t: 'Stand in the river and fight', fn: () => fight([['brute', 2, 10]], {}, () => cont(['The first two giants go down in the ford. The rest look past you at the sky over the ruined church, and whatever they see there turns their faces grey. They go back into the willows.'], girl, 'boy')) },
  ]), 'people');
}

function fordEnd(line) {
  done('ford'); G.flags.fordGirl = true;
  cont([line, 'You sleep by the fire. In the morning the ruin is empty. Sheep tracks lead west through the frost, toward the City, and around the dead fire, pressed deep, are the pawprints of a very large lion.', 'On the one patch of plaster left in the apse, a faded Christ looks down.'], () => returnToCity(), 'horn');
}

// ---------- the stranger with no shadow ----------

function strangerFlatters() {
  scene('adversary', ['The stranger turns to you and smiles. "But you. One of you is worthier than this boy. God has seen your deeds. Will you hear what he has planned for you?"'], [
    { k: 'Y', t: 'Yes, tell us', fn: () => { done('stranger'); tempt('crown'); cont(['He tells you wonderful things, and then he and the noble are gone.', 'The devil gains a foothold (Crown) in every heart but the fool\'s.']); } },
    { k: 'N', t: 'No', fn: strangerTest },
  ]);
}

function strangerTest() {
  const icon = living().find((c) => c.cls === 'icon' && slotsLeft(c, 1) > 0);
  const can = hasFool() || icon || living().some((c) => wears(c, 'belt') || c.cls === 'abba');
  if (!can) {
    cont('You watch him closely but cannot tell what he is. A holy fool, an elder of the Desert, a Painter\'s discernment or the Belt of Truth might see more. He leads the noble away.');
    return;
  }
  if (icon && !hasFool()) icon.used[1]++;
  const who = hasFool() ? 'Your holy fool laughs out loud and points at the ground.' : 'Discernment opens your eyes.';
  cont([who, 'The stranger has no shadow. His face slips, and something old looks out of it.'], () =>
    fight([['falseangel', 1, 10]], { boss: true }, () => {
      done('stranger'); G.flags.michaelSaved = true;
      cont('The false angel is cast out. Michael Angelos sits down in the street and shakes. "He said I had the Shepherd\'s blood," he whispers. "I do. My mother told me."', backToExplore, 'people');
    }), 'adversary');
}

// ---------- Act IV: the Anointing ----------

function sanctuary() {
  if (partyChars().some((c) => footTotal(c) >= 3)) {
    cont(['You approach the icon screen. Beyond it, a roar like great wings. The cherub of the threshold bars the way to anyone who comes in rebellion.', 'One of you holds three footholds or more. Confess first.'], church, 'horn');
    return;
  }
  G.sceneArt = 'horn';
  const cands = [];
  cands.push({ k: '1', t: 'Lord Bardas', who: 'Lord Bardas Phokas, crowned by the Sword faction' });
  if (G.flags.michaelSaved) cands.push({ k: '2', t: 'Michael Angelos', who: 'Michael Angelos, young, noble, of the Shepherd\'s blood' });
  if (G.flags.boyTaught) cands.push({ k: '3', t: 'Mikros', who: 'Mikros the shepherd boy of Göreme' });
  if (G.flags.done_w1_slaves) cands.push({ k: '4', t: 'Thekla', who: 'Thekla, the captain\'s daughter with the signet' });
  if (G.flags.done_g1_orphans) cands.push({ k: '5', t: 'Anna', who: 'Anna, the orphan with the crook' });
  if (G.flags.done_x1_monks) cands.push({ k: '6', t: 'Brother Loukas', who: 'Brother Loukas of the Desert' });
  const leader = living()[0];
  cands.push({ k: '7', t: leader.name, who: `${leader.name}, who led you here` });
  scene('horn', [
    'The cherub lets you pass. Behind the icon screen, on the altar, the Horn of Anointing shines like a lamp, where it came to rest when it rose from the Gate of Sheol.',
    'The Domestikos of the Tagma has brought Lord Bardas. Others have come: every heir you found along the way. Abba Pelagios sits by the door. The Domestikos holds out his hand for the Horn.',
  ], [
    { k: 'A', t: 'Anoint someone', fn: () => chooseHeir(cands) },
    { k: 'F', t: 'Let the Sword crown Bardas', fn: endingSword },
    { k: 'Q', t: 'Ask the Question and wait', fn: endingTrue },
  ]);
}

function chooseHeir(cands) {
  scene('horn', ['Whom will you try to anoint?'], [
    ...cands.map((c) => ({ k: c.k, t: c.t, fn: () => {
      G.flags.triedHeirs = (G.flags.triedHeirs || 0) + 1;
      cont([`You lift the Horn over ${c.who}.`, 'The oil will not pour. The Horn is silent in your hands, and so is everyone in the church.'], sanctuary, 'horn');
    } })),
    { k: 'ESC', t: 'Back', fn: sanctuary },
  ]);
}

function epilogue() {
  const lines = [];
  for (const [t, th] of Object.entries(THEMES)) {
    if (G.allegiance[t] >= 3) lines.push(`${th.name} returned. ${th.archon} is cast out, and the Blight is gone from its fields.`);
    else if (G.flags['empty_' + t]) lines.push(`${th.name}: the house was left empty, and seven worse moved in by summer.`);
    else if (G.flags['idol_' + t]) lines.push(`${th.name} is ${ALLEGIANCE[G.allegiance[t]].toLowerCase()}.`);
    else lines.push(`${th.name} still bows to ${th.archon}.`);
  }
  if (G.flags.goldhandSaved) lines.push('Leon Goldhand, poor and free, keeps the lamp in the Harbour Chapel.');
  if (G.flags.motherSaved) lines.push('The woman who was the Mother of Festivals runs the orphanage in Thessalonike, and never lets a child go hungry.');
  if (G.flags.kingSaved) lines.push('The old abbot who was the Noonday King weaves baskets in the rebuilt laura, and every day he notices the afternoon.');
  if (G.flags.legionFreed) lines.push('A man from the tombs tells every village in the Wilderness what God did for him.');
  if (G.flags.exilesFreed) lines.push('The exiles from Nebrodia walk in through the Golden Gate on the day of the coronation.');
  if (G.flags.michaelSaved) lines.push('Michael Angelos serves the new ruler as sword-bearer, and never speaks of the stranger.');
  if (G.flags.ironTaken) lines.push('The icons of Göreme are still somewhere in the Concord\'s vaults. Someone will have to go and get them.');
  return lines;
}

function endingTrue() {
  G.flags.ending = 'true';
  saveGame();
  const met = G.flags.fordGirl;
  cont([
    'Someone in your band says it aloud: "Whom will the Horn anoint?" And then you wait.',
    'Nothing happens for a long time. The Domestikos shifts his feet. Then the great doors open, and sheep crowd into the narthex, bleating, and behind them comes a shepherd girl with a crook across her shoulders, in from the fields.',
    met ? 'It is the girl from the ford at Arkadiopolis. "You came in the morning," she says to you. "So did I."' : 'None of you has ever seen her before. She walks in as if she had been told the hour.',
    'Behind her, filling the doorway, walks a lion: vast and golden, bearing the wounds of the Lamb on his paws and side. The Anakim\'s boasting fell silent at his roar, and now the whole City falls silent at his step.',
  ], () => cont([
    'The Lion walks up the nave to the altar. The Horn rises to meet him. He speaks one word, her name, and everyone in the church hears it in their chest before they hear it with their ears: "Theodora."',
    'The oil pours on its own, and runs down the girl\'s hair onto her collar.',
    'Abba Pelagios laughs like a much younger man. "The youngest," he says. "The one out in the fields. Of course."',
    'The Lion looks at each of you before he goes, and says only what he says to everyone who asks about the future: "You must follow me."',
  ], () => cont([
    'The purple throne is filled. The rebel archons feel it in every theme at once, and their hold loosens.',
    ...epilogue(),
    'The shepherd-empress points beyond herself, as the old emperors were meant to: to the King who reigns now, who disarmed the powers, and who will make all things new.',
    'The end.',
  ], titleEnd, 'horn'), 'horn'), 'horn');
}

function endingSword() {
  G.flags.ending = 'sword';
  saveGame();
  cont([
    'The Domestikos takes the Horn from the altar and pours it over Lord Bardas. Nothing comes out. He tips it further. It is dry.',
    'They crown Bardas anyway, in the Hippodrome, with trumpets. He is brave and faithful and strong, and the archons do not notice him at all.',
    ...epilogue(),
    'The throne is filled, and still widowed. At a ford in Thrace, a shepherd girl waters her sheep, and far off a lion roars.',
    'The end. (There is another ending.)',
  ], titleEnd, 'horn');
}

function titleEnd() { titleScreen(); }
