'use strict';

// Engine: state, characters, the text interface, places and exploration.

const SAVE_KEY = 'widowed-throne-v2';

let G = null;          // saved game state
let PANEL = null;      // what the main card shows
let MODE = 'title';    // title, explore, building, scene, combat, over

const $ = (s) => document.querySelector(s);
const rnd = (n) => Math.floor(Math.random() * n);
const roll = (n, s, p = 0) => { let t = p; for (let i = 0; i < n; i++) t += 1 + rnd(s); return t; };
const rollA = (a) => roll(a[0], a[1], a[2] || 0);
const up = (s) => String(s);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escapeHtml = esc;
const titleCase = (s) => String(s).toLowerCase().replace(/(^|[\s'-])([a-zà-ÿ])/g, (m, a, b) => a + b.toUpperCase());

// ---------- save ----------

function saveGame() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { /* no storage */ } }
function loadGame() { try { const r = localStorage.getItem(SAVE_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ } }

function newGame() {
  G = {
    v: 2, roster: [], party: [], gold: 300, map: 'city', depth: {}, light: 0, ward: false, kyrie: false,
    act: 1, flags: {}, allegiance: { waters: 0, gardens: 0, heights: 0, wilderness: 0 }, words: [], log: [], steps: 0, building: null,
  };
}

// ---------- characters ----------

const sb = (v) => (v >= 18 ? 2 : v >= 16 ? 1 : v <= 5 ? -1 : 0);

function makeChar(name, race, cls, stats) {
  const c = { name: titleCase(name).slice(0, 12), race, cls, lvl: 1, xp: 0, ...stats, dead: false, poison: false,
    used: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, aused: 0, eq: {}, inv: [], foot: { gold: 0, flesh: 0, sword: 0, crown: 0 } };
  c.maxhp = CLASSES[cls].hd + Math.max(0, sb(c.cn) * 2) + 2;
  c.hp = c.maxhp;
  const kits = {
    hornbearer: ['spathion', 'quilted', 'shield', 'sling'], akrites: ['bow', 'quilted', 'dagger'], deliverer: ['axe', 'quilted', 'shield'],
    abba: ['staff', 'quilted'], icon: ['staff', 'quilted', 'torch', 'torch'], fool: ['club', 'quilted', 'sling'], anarg: ['staff', 'quilted', 'bread'],
  };
  for (const it of kits[cls]) giveItem(c, it, true);
  return c;
}

function rollStats(race) {
  const r = RACES[race];
  const s = () => roll(2, 6, 4);
  return { st: clamp(s() + r.st, 3, 18), dx: clamp(s() + r.dx, 3, 18), cn: clamp(s() + r.cn, 3, 18), lk: clamp(s() + r.lk, 3, 18), fa: clamp(s() + r.fa, 3, 18) };
}

const SPECIAL_WEAPONS = ['tentpeg', 'shepsling', 'bspathion', 'glory'];
function canUse(c, id) {
  const it = ITEMS[id];
  if (it.aog) return true;
  if (it.classes && !it.classes.includes(c.cls)) return false;
  const cl = CLASSES[c.cls];
  if (it.type === 'weapon') return cl.weapons.includes(id) || (SPECIAL_WEAPONS.includes(id) && c.cls !== 'icon');
  if (['body', 'shield', 'helm'].includes(it.type)) return cl.armour.includes(id);
  return true;
}

function giveItem(c, id, equip) {
  const it = ITEMS[id];
  if (equip && SLOTS.includes(it.type) && !c.eq[it.type] && canUse(c, id)) { c.eq[it.type] = id; return true; }
  if (c.inv.length >= 8) return false;
  c.inv.push(id);
  return true;
}

function partyGets(id, equip = true) {
  const it = ITEMS[id];
  if (it.aog) {
    const fighter = (c) => (['hornbearer', 'deliverer', 'akrites'].includes(c.cls) ? 1 : 0);
    const score = (c) => { const cur = c.eq[it.type]; if (!cur) return 100; if (ITEMS[cur].aog) return -1; return it.type === 'weapon' ? 50 : (it.ac || 0) - (ITEMS[cur].ac || 0); };
    const best = living().filter((c) => score(c) > 0 && (c.inv.length < 8 || !c.eq[it.type])).sort((a, b) => fighter(b) - fighter(a) || score(b) - score(a))[0];
    if (best) { if (best.eq[it.type]) best.inv.push(best.eq[it.type]); best.eq[it.type] = id; return best; }
  }
  for (const c of living()) if (equip && SLOTS.includes(it.type) && !c.eq[it.type] && canUse(c, id)) { c.eq[it.type] = id; return c; }
  for (const c of living()) if (c.inv.length < 8) { c.inv.push(id); return c; }
  return null;
}

function partyChars() { return G.party.map((i) => G.roster[i]); }
function living() { return partyChars().filter((c) => !c.dead); }
function hasFool() { return living().some((c) => c.cls === 'fool'); }
function hasClass(cls) { return living().some((c) => c.cls === cls); }
function cold(c, id) { const it = ITEMS[id]; return !!(it && it.aog && it.virtue && c.foot[it.virtue] > 0); }
function wears(c, id) { return SLOTS.some((s) => c.eq[s] === id) && !cold(c, id); }
function partyHas(id) { return partyChars().some((c) => c.inv.includes(id) || SLOTS.some((s) => c.eq[s] === id)); }

function acOf(c, extra = 0) {
  let ac = 10 - Math.max(0, sb(c.dx));
  for (const s of SLOTS) { const id = c.eq[s]; if (id && ITEMS[id].ac && !cold(c, id)) ac -= ITEMS[id].ac; }
  if (G.ward) ac -= 2;
  if (G.kyrie) ac -= 2;
  return ac - extra;
}
function acText(v) { return v < -9 ? 'LO' : String(v); }

function slotMax(c, circle) {
  if (!CLASSES[c.cls].pray) return 0;
  const need = 2 * circle - 1;
  if (c.lvl < need) return 0;
  return Math.min(4, 1 + Math.floor((c.lvl - need) / 2)) + (circle <= 2 && c.fa >= 16 ? 1 : 0);
}
function slotsLeft(c, circle) { return slotMax(c, circle) - (c.used[circle] || 0); }
function abilityMax(c) {
  const a = CLASSES[c.cls].ability;
  if (a === 'rebuke') return 1 + (c.lvl >= 6 ? 1 : 0);
  if (a === 'surge') return 1 + (c.lvl >= 7 ? 1 : 0);
  if (a === 'psalm') return 2 + Math.floor(c.lvl / 3);
  if (a === 'hands') return 2 + c.lvl;
  return 0;
}
function usesMax(c) {
  if (CLASSES[c.cls].pray) { let t = 0; for (let i = 1; i <= 5; i++) t += slotMax(c, i); return t; }
  return abilityMax(c);
}
function usesLeft(c) {
  if (CLASSES[c.cls].pray) { let t = 0; for (let i = 1; i <= 5; i++) t += Math.max(0, slotsLeft(c, i)); return t; }
  return Math.max(0, abilityMax(c) - c.aused);
}
function footTotal(c) { return Object.values(c.foot).reduce((a, b) => a + b, 0); }
function partyFootholds() { return partyChars().reduce((a, c) => a + footTotal(c), 0); }
function tempt(idol) { for (const c of partyChars()) if (c.cls !== 'fool' && !c.dead) c.foot[idol] += 1; }

function restParty() {
  for (const c of partyChars()) { c.used = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; c.aused = 0; }
  G.ward = false; G.kyrie = false;
  if (G.flags) G.flags.mamasUsed = false;
}

function giveXp(total) {
  const alive = living();
  if (!alive.length) return 0;
  const each = Math.floor(total / alive.length);
  for (const c of alive) c.xp += each;
  return each;
}

function rarity(id) {
  const it = ITEMS[id];
  if (it.type === 'quest') return 'quest';
  if (it.aog) return 'legendary';
  if (it.blessed || it.sell) return 'epic';
  if ((it.price || 0) >= 200) return 'rare';
  return 'common';
}

// ---------- panels ----------

function say(...lines) {
  if (!G) return;
  for (const l of lines) if (l) G.log.push(String(l));
  G.log = G.log.slice(-60);
}

// panel: { title, eyebrow, icon, text: [], html, options: [{k, t, fn, style, note, disabled}], onKey, input, meta, tools }
function showPanel(p) { PANEL = p; render(); }
function pickOpt(o) { if (o && o.fn && !o.disabled) o.fn(); }

function msg(text, then) {
  showPanel({ text: Array.isArray(text) ? text : [text], options: [{ k: 'SPACE', t: 'Continue', fn: then || backToExplore, style: 'primary' }] });
}
function ask(text, yes, no) {
  showPanel({ text: Array.isArray(text) ? text : [text], options: [{ k: 'Y', t: 'Yes', fn: yes, style: 'primary' }, { k: 'N', t: 'No', fn: no || backToExplore }] });
}
function pickChar(title, filter, fn, back) {
  const list = partyChars().map((c, i) => ({ c, i })).filter(({ c }) => !filter || filter(c));
  if (!list.length) { msg('No one can.', back); return; }
  showPanel({ text: [title], options: [...list.map(({ c, i }) => ({ k: String(i + 1), t: c.name, note: `${CLASSES[c.cls].name} · HP ${c.hp}/${c.maxhp}`, fn: () => fn(c, i) })), { k: 'ESC', t: 'Cancel', fn: back || backToExplore, style: 'ghost' }] });
}

// Short all-caps labels from older code read better in sentence case.
const LABEL_NAMES = ['Abba', 'Bardas', 'Michael', 'Angelos', 'Mikros', 'Thekla', 'Anna', 'Loukas', 'Brother', 'Lord', 'Waters', 'Gardens', 'Heights', 'Wilderness', 'Nebrodia', 'Glory', 'Satan', 'Kyrie', 'Psalm', 'Trisagion', 'God', 'Phos'];
function prettyLabel(t) {
  const s = String(t);
  if (!/[A-Z]{2}/.test(s) || /[a-z]/.test(s)) return s;
  let r = s.charAt(0) + s.slice(1).toLowerCase();
  for (const n of LABEL_NAMES) r = r.replace(new RegExp('\\b' + n.toLowerCase() + '\\b', 'g'), n);
  for (const c of G ? G.roster : []) r = r.replace(new RegExp('\\b' + c.name.toLowerCase() + '\\b', 'gi'), c.name);
  return r;
}

// ---------- rendering ----------

const ACT_NAMES = { 1: 'Act I · The Wall', 2: 'Act II · The Judges', 3: 'Act III · The Tower', 4: 'Act IV · The Anointing' };
const OBJECTIVES = {
  1: 'Find who forges the letters that split the council. The trail leads into the Undercroft.',
  2: 'Free the fallen themes and deliver their Holds. Find the four Words of Symeon.',
  3: 'Strike at Nebrodes in the Roots of the Tower before his host reaches the walls.',
  4: 'Descend beneath the Great Church. Find the Horn, then ask the Question.',
};
function objective() {
  if (G.act === 2 && !G.flags.done_ford) return 'Take the lame lord\'s letter to the ford at Arkadiopolis. Then free the fallen themes.';
  if (G.act === 4 && G.flags.hornFound) return 'The Horn has risen to the sanctuary. Go to the Great Church and ask the Question.';
  return OBJECTIVES[G.act];
}
const CLASS_GRAD = {
  hornbearer: ['#7c3aed', '#c026d3'], akrites: ['#059669', '#22d3ee'], deliverer: ['#f97316', '#ef4444'], abba: ['#eab308', '#f59e0b'],
  icon: ['#0ea5e9', '#6366f1'], fool: ['#ec4899', '#a855f7'], anarg: ['#10b981', '#84cc16'],
};
const ART = { idol: '⚱', chest: '◆', horn: '♆', mountain: '▲', people: '✦', boy: '➶', adversary: '☾' };
const KIND_LABEL = { beast: 'Beast', man: 'Mortal', demon: 'Demon', shade: 'Shade', serpent: 'Serpent', giant: 'Giant' };

function render() {
  document.body.classList.toggle('is-title', MODE === 'title' || !G);
  renderTop();
  renderParty();
  renderMain();
  renderSide();
}

function renderTop() {
  const el = $('#top');
  if (!G || MODE === 'title') { el.innerHTML = ''; return; }
  const L = curLevel();
  const loc = MODE === 'building' && G.building ? BUILDINGS[G.building] : L.city ? 'Theopolis' : `${L.name} · ${L.sub}`;
  const light = !L.city && L.dark ? `<span class="chip ${G.light > 0 ? 'ok' : 'warn'}">${G.light > 0 ? `☀ Light ${Math.ceil(G.light / 10)}` : '☾ Dark'}</span>` : '';
  el.innerHTML = `
    <div class="brand"><span class="logo">♆</span><span class="grad">The Widowed Throne</span></div>
    <div class="top-chips">
      <span class="chip act">${ACT_NAMES[G.act]}</span>
      <span class="chip">${esc(loc)}</span>
      ${light}
      <span class="chip gold"><i class="coin"></i>${G.gold.toLocaleString('en-US')}</span>
      <button class="chip menu" id="menuBtn" title="Menu (Esc)">☰</button>
    </div>`;
  $('#menuBtn').addEventListener('click', () => { if (MODE === 'explore') gameMenu(); });
}

function avatar(c, size = '') {
  const [a, b] = CLASS_GRAD[c.cls];
  return `<div class="avatar ${size} ${c.dead ? 'dead' : ''}" style="--a:${a};--b:${b}"><span>${CLASSES[c.cls].ab}</span><em>${c.lvl}</em></div>`;
}

function bar(v, max, cls) {
  const pct = max > 0 ? clamp((v / max) * 100, 0, 100) : 0;
  return `<div class="bar ${cls}"><i style="width:${pct}%"></i></div>`;
}

function renderParty() {
  const el = $('#party');
  if (!G || MODE === 'title') { el.innerHTML = ''; return; }
  if (!G.party.length) { el.innerHTML = '<div class="panel-title">Party</div><p class="muted small">No one yet. Gather a band of up to six in the Fool\'s Tower.</p>'; return; }
  const cards = partyChars().map((c, i) => {
    const status = c.dead ? '<span class="tag bad">Fallen</span>' : c.poison ? '<span class="tag poison">Poisoned</span>' : '';
    const foot = footTotal(c) ? `<span class="tag foot" title="Footholds">◈ ${footTotal(c)}</span>` : '';
    const front = i < 3 ? '<span class="tag front" title="Front rank: fights hand to hand">Front</span>' : '';
    const active = MODE === 'combat' && typeof COMBAT !== 'undefined' && COMBAT && COMBAT.idx === i && PANEL && (PANEL.options || []).some((o) => o && o.k === 'D');
    return `<button class="pcard ${c.dead ? 'is-dead' : ''} ${active ? 'is-active' : ''}" data-char="${i}" title="View ${esc(c.name)}">
      ${avatar(c)}
      <div class="pbody">
        <div class="pname"><b>${esc(c.name)}</b><span class="muted">${CLASSES[c.cls].name}</span></div>
        <div class="prow"><span class="lab">HP</span>${bar(c.dead ? 0 : c.hp, c.maxhp, 'hp')}<span class="num">${c.dead ? 0 : c.hp}/${c.maxhp}</span></div>
        ${usesMax(c) ? `<div class="prow"><span class="lab">GR</span>${bar(usesLeft(c), usesMax(c), 'gr')}<span class="num">${usesLeft(c)}/${usesMax(c)}</span></div>` : ''}
        <div class="ptags"><span class="tag ac">AC ${acText(acOf(c))}</span>${front}${status}${foot}</div>
      </div></button>`;
  }).join('');
  el.innerHTML = `<div class="panel-title">Party <span class="muted">${living().length}/${G.party.length} standing</span></div>${cards}`;
  el.querySelectorAll('[data-char]').forEach((b) => b.addEventListener('click', () => { if (MODE === 'explore') viewChar(Number(b.dataset.char)); }));
}

function panelHeader(p) {
  const L = G ? curLevel() : null;
  let icon = p.icon, eyebrow = p.eyebrow, title = p.title;
  if (!icon) {
    if (MODE === 'combat') icon = '⚔';
    else if (MODE === 'scene' && G.sceneArt) icon = ART[G.sceneArt] || '✦';
    else if (MODE === 'building' && G.building) icon = { G: '♜', M: '⚖', C: '☦', I: '⌂', E: '♛', H: '⚓', W: '≋' }[G.building];
    else if (L) icon = L.icon;
  }
  if (!title) {
    if (MODE === 'combat') title = COMBAT && COMBAT.opts.boss ? 'Boss battle' : 'Battle';
    else if (MODE === 'building' && G.building) title = BUILDINGS[G.building];
    else if (MODE === 'scene' && L && !L.city && G.eventTitle) title = G.eventTitle;
    else if (L) title = L.city ? 'Theopolis' : L.name;
  }
  if (!eyebrow && L) eyebrow = MODE === 'combat' ? `Round ${COMBAT ? Math.max(1, COMBAT.round) : 1}` : L.city ? 'The City' : `${L.name} · ${L.sub}`;
  return `<div class="banner"><div class="glyph">${icon || '✦'}</div><div><div class="eyebrow">${esc(eyebrow || '')}</div><h1>${esc(title || '')}</h1></div></div>`;
}

function enemyCards() {
  if (MODE !== 'combat' || typeof COMBAT === 'undefined' || !COMBAT) return '';
  return `<div class="enemies">${COMBAT.groups.map((g) => {
    const m = MONSTERS[g.id];
    const alive = g.hp.filter((h) => h > 0).length;
    if (!alive) return '';
    const cur = g.hp.reduce((a, h) => a + Math.max(0, h), 0);
    return `<div class="enemy k-${m.kind} ${m.boss ? 'boss' : ''}">
      <div class="etop"><b>${alive > 1 ? `${alive} × ` : ''}${esc(alive > 1 ? m.pl : m.name)}</b><span class="tag k">${KIND_LABEL[m.kind]}</span></div>
      ${bar(cur, g.max || cur, 'ehp')}
      <div class="emeta"><span>${g.dist <= 10 ? 'In melee range' : `${g.dist}' away`}</span>${g.stun ? '<span class="tag">Held</span>' : ''}${g.seal ? '<span class="tag">Sealed</span>' : ''}</div>
    </div>`;
  }).join('')}</div>`;
}

function renderMain() {
  const el = $('#main');
  if (!PANEL) { el.innerHTML = ''; return; }
  const p = PANEL;
  if (MODE === 'title') { el.innerHTML = titleHtml(p); bindMain(el); return; }
  const text = (p.text || []).filter((t) => t !== '' && t != null).map((t, i) => `<p class="${i === 0 ? 'lead' : ''}">${esc(t)}</p>`).join('');
  const styleOf = (o) => o.style || (o.k === 'SPACE' ? 'primary' : /^(exit|back|cancel|leave)$/i.test(o.t) ? 'ghost' : '');
  const opts = (p.options || []).filter(Boolean).map((o, i) => `<button class="opt ${styleOf(o)}" data-opt="${i}" ${o.disabled ? 'disabled' : ''}><kbd>${o.k === 'SPACE' ? 'Space' : o.k === 'ESC' ? 'Esc' : esc(o.k)}</kbd><span class="ot">${esc(prettyLabel(o.t))}</span>${o.note ? `<small>${esc(o.note)}</small>` : ''}</button>`).join('');
  const input = p.input ? `<div class="namebox"><input id="nameinput" maxlength="${p.input.max}" placeholder="Name" autocomplete="off" value="${esc(p.input.value)}"><button class="opt primary" id="nameok"><span class="ot">Confirm</span></button></div>` : '';
  el.innerHTML = `<article class="card ${MODE === 'combat' ? 'is-combat' : ''}">
    ${panelHeader(p)}
    ${p.meta || ''}
    ${enemyCards()}
    <div class="story">${text}${p.html || ''}</div>
    ${input}
    <div class="opts">${opts}</div>
    ${p.tools ? toolsHtml() : ''}
  </article>`;
  bindMain(el);
  if (p.input) {
    const inp = $('#nameinput');
    inp.focus();
    inp.addEventListener('input', () => { p.input.value = inp.value; });
    $('#nameok').addEventListener('click', () => p.input.onDone(inp.value));
  }
}

function bindMain(el) {
  const opts = (PANEL.options || []).filter(Boolean);
  el.querySelectorAll('[data-opt]').forEach((b) => b.addEventListener('click', () => pickOpt(opts[Number(b.dataset.opt)])));
  el.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => TOOLS[b.dataset.tool]()));
}

const TOOLS = { pray: () => prayMenu(), psalm: () => psalmMenu(), hands: () => handsMenu(), use: () => useMenu() };
function toolsHtml() {
  if (!G.party.length) return '';
  const t = [['pray', '✝', 'Pray', 'P'], ['psalm', '♪', 'Psalm', 'S'], ['hands', '✚', 'Heal', 'H'], ['use', '◆', 'Use item', 'U']];
  return `<div class="tools">${t.map(([id, ic, name, k]) => `<button class="tool" data-tool="${id}"><span class="ti">${ic}</span>${name}<kbd>${k}</kbd></button>`).join('')}</div>`;
}

function renderSide() {
  const el = $('#side');
  if (!G || MODE === 'title') { el.innerHTML = ''; return; }
  const themes = Object.entries(THEMES).map(([k, t]) => {
    const a = G.allegiance[k];
    return `<div class="theme"><div class="trow"><span>${esc(t.name.replace('Thema of the ', ''))}</span><span class="tag ${a >= 3 ? 'ok' : ''}">${ALLEGIANCE[a]}</span></div>${bar(a, 3, 'alleg')}</div>`;
  }).join('');
  const words = [0, 1, 2, 3].map((i) => `<i class="${i < G.words.length ? 'on' : ''}"></i>`).join('');
  const logs = G.log.slice(-14).reverse().map((l) => `<li>${esc(l)}</li>`).join('');
  el.innerHTML = `
    <section class="glass">
      <div class="panel-title">Quest</div>
      <div class="objective">${esc(objective())}</div>
      <div class="words"><span>Words of Symeon</span><div class="gems">${words}</div></div>
      ${G.act >= 2 ? `<div class="themes">${themes}</div>` : ''}
      ${partyFootholds() ? `<div class="warnbox">◈ The Adversary holds ${partyFootholds()} foothold${partyFootholds() > 1 ? 's' : ''} in your party. Confess at the Great Church.</div>` : ''}
    </section>
    <section class="glass">
      <div class="panel-title">Chronicle</div>
      <ol class="log">${logs || '<li class="muted">Your deeds will be written here.</li>'}</ol>
    </section>`;
}

// ---------- places ----------

function backToExplore() { MODE = 'explore'; if (G) { G.building = null; G.eventTitle = null; } showLocation(); }

function showLocation() {
  MODE = 'explore';
  if (G.map === 'city') showCity(); else showDungeon();
}

function cityText() {
  const t = {
    1: 'The remnant rebuilds the Land Walls with a trowel in one hand and a spear in the other. Forged letters set the council against itself, and nobody knows who writes them.',
    2: 'The walls stand. Ships wait at the Harbour gate for anyone brave enough to sail into the fallen themes.',
    3: 'Giants are on the eastern road. The Sword faction has crowned Lord Bardas in the Hippodrome, and the Abba says nothing.',
    4: 'Nebrodes is dead. The whole City seems to hold its breath, waiting to see what the Horn will do.',
  };
  return [t[G.act]];
}

function showCity() {
  const opts = [
    { k: '1', t: "The Fool's Tower", note: 'Party, advancement, saving', fn: () => enterBuilding('G') },
    { k: '2', t: 'The Mese market', note: 'Buy and sell', fn: () => enterBuilding('M') },
    { k: '3', t: 'The Great Church', note: 'Healing and confession', fn: () => enterBuilding('C') },
    { k: '4', t: "Pilgrims' hostel", note: 'Rest and renew prayers', fn: () => enterBuilding('I') },
    { k: '5', t: "The Eparch's palace", note: 'News and rewards', fn: () => enterBuilding('E') },
    { k: '6', t: 'The Harbour gate', note: G.flags.travel ? 'Travel to the themes' : 'Barred for now', fn: () => enterBuilding('H') },
    { k: '7', t: 'The Undercroft', note: 'The crypts beneath the City', fn: () => enterBuilding('W') },
  ];
  if (G.party.length) {
    if (!G.flags.done_walls) opts.push({ k: '8', t: 'Walk the Land Walls', fn: () => runEvent('walls') });
    if (!G.flags.done_mockers) opts.push({ k: '9', t: 'Take the lanes by the old forum', fn: () => runEvent('mockers') });
    if (!G.flags.done_stranger) opts.push({ k: '0', t: 'Linger by the hostel at dusk', fn: () => runEvent('stranger') });
  }
  showPanel({ text: cityText(), options: opts, tools: true, onKey: exploreKey });
}

function depthMeta(L, d) {
  const steps = Array.from({ length: L.length + 1 }, (_, i) => `<i class="${i < d ? 'past' : i === d ? 'here' : ''}"></i>`).join('');
  return `<div class="depth"><span>Depth ${d} of ${L.length}</span><div class="steps">${steps}</div></div>`;
}

function showDungeon() {
  const L = LEVELS[G.map];
  const d = G.depth[G.map] || 0;
  const at = layout(G.map);
  const text = [ATMOS[L.pal][Math.min(d, ATMOS[L.pal].length - 1)]];
  if (L.theme) text.push(G.allegiance[L.theme] >= 3 ? 'The Blight has lifted from this theme. Birds sing even here.' : `The Blight: ${THEME_BLIGHT[L.theme]}`);
  const ld = lampDepth(G.map);
  const lit = ld != null && G.flags['lamplit_' + G.map];
  if (lit && d === ld) text.push('A vigil lamp burns in its niche here. The Blight keeps its distance.');
  if (L.dark && G.light <= 0 && !(lit && d === ld)) text.push('It is dark. Without light you stumble into more trouble. Light a torch or pray for light.');
  if (G.flags['maps_' + G.map]) {
    const ahead = Object.entries(at).filter(([dd, evs]) => Number(dd) > d && evs.some((e) => !G.flags['done_' + e]))
      .map(([dd, evs]) => `depth ${dd}: ${evs.filter((e) => !G.flags['done_' + e]).map((e) => EVENT_TITLES[e].toLowerCase()).join(', ')}`);
    if (ahead.length) text.push('The map of the way shows ' + ahead.join('; ') + '.');
  }
  const opts = [];
  let k = 1;
  if (d < L.length) opts.push({ k: String(k++), t: 'Press deeper', note: L.dark && G.light <= 0 ? 'In the dark' : `To depth ${d + 1}`, fn: pressDeeper, style: 'primary' });
  for (const [dd, evs] of Object.entries(at)) {
    if (Number(dd) > d) continue;
    for (const ev of evs) if (!G.flags['done_' + ev]) opts.push({ k: String(k++), t: EVENT_TITLES[ev], note: Number(dd) === d ? 'Here' : `Back at depth ${dd}`, fn: () => { G.depth[G.map] = Number(dd); runEvent(ev); } });
  }
  if (lit && d < ld) opts.push({ k: String(k++), t: 'Walk the lamp road', note: `Safely to the vigil lamp at depth ${ld}`, fn: () => { G.depth[G.map] = ld; say('You walk the lamp road. Nothing troubles you.'); showLocation(); } });
  if (lit && d === ld && !(G.lampRested || {})[G.map]) opts.push({ k: String(k++), t: 'Rest by the vigil lamp', note: 'Heal and renew some prayers, once per visit', fn: lampRest });
  if (d === L.length && L.down) opts.push({ k: String(k++), t: 'Take the stairs down', fn: () => changeLevel(L.down, 'down'), style: 'primary' });
  if (d > 0) opts.push({ k: String(k++), t: 'Fall back', note: `To depth ${d - 1}`, fn: fallBack });
  else if (L.up) opts.push({ k: String(k++), t: 'Climb the stairs up', fn: () => changeLevel(L.up, 'up') });
  else if (L.exit) opts.push({ k: String(k++), t: 'Leave for the City', fn: () => returnToCity() });
  showPanel({ text, options: opts, tools: true, onKey: exploreKey, meta: depthMeta(L, d) });
}

// A night beside a vigil lamp: half your health back and two uses of grace for each member.
function lampRest() {
  G.lampRested = G.lampRested || {};
  G.lampRested[G.map] = true;
  for (const c of living()) {
    c.hp = Math.min(c.maxhp, c.hp + Math.ceil(c.maxhp / 2));
    c.poison = false;
    if (CLASSES[c.cls].pray) { let n = 2; for (let i = 1; i <= 5 && n > 0; i++) while (c.used[i] > 0 && n > 0) { c.used[i]--; n--; } }
    else c.aused = Math.max(0, c.aused - 2);
  }
  say('You keep vigil by the lamp through the night.');
  MODE = 'scene'; G.eventTitle = 'The vigil lamp'; G.sceneArt = 'horn';
  msg(['You keep vigil by the lamp through the night. The flame does not waver, and nothing comes near.', 'Wounds close, and each member regains two uses of grace.'], showLocation);
}

function useLight(L) {
  if (!L.dark || G.light <= 0) return;
  G.light = Math.max(0, G.light - 10);
  if (G.light === 0) say('Your light goes out.');
}

function pressDeeper() {
  const L = LEVELS[G.map];
  const d = (G.depth[G.map] || 0) + 1;
  G.depth[G.map] = d;
  G.steps++;
  const dark = L.dark && G.light <= 0;
  const parted = G.flags.parting; G.flags.parting = false;
  useLight(L);
  poisonTick();
  const evs = (layout(G.map)[d] || []).filter((e) => !G.flags['done_' + e]);
  if (evs.length) { saveGame(); runEvent(evs[0]); return; }
  if (G.flags.seek) G.flags.seek -= 1;
  else if (!parted && Math.random() < (dark ? 0.2 : 0.08)) { trap(); return; }
  if (!parted && Math.random() < L.rate + (dark ? 0.15 : 0)) { randomEncounter(); return; }
  say(`Depth ${d}. The way is quiet.`);
  saveGame();
  showLocation();
}

function fallBack() {
  const L = LEVELS[G.map];
  G.depth[G.map] = Math.max(0, (G.depth[G.map] || 0) - 1);
  useLight(L);
  if (Math.random() < L.rate / 2) { randomEncounter(); return; }
  showLocation();
}

function poisonTick() { for (const c of living()) if (c.poison && c.hp > 1) c.hp = Math.max(1, c.hp - 2); }

function trap() {
  const aks = living().filter((c) => c.cls === 'akrites');
  const best = aks.reduce((a, c) => Math.max(a, c.lvl), 0);
  if (aks.length && Math.random() < 0.5 + best * 0.05) { say('Your Akrites spots a trap and leads you around it.'); showLocation(); return; }
  const lvl = levelOfMap();
  const victims = living().filter(() => Math.random() < 0.5);
  if (!victims.length) victims.push(living()[0]);
  const lines = ['A trap! Darts fly from the walls.'];
  for (const c of victims) {
    const dmg = roll(1, 6, lvl);
    c.hp -= dmg;
    if (Math.random() < 0.3) c.poison = true;
    lines.push(`${c.name} takes ${dmg}${c.poison ? ' and is poisoned' : ''}.`);
    if (c.hp <= 0) { c.hp = 0; c.dead = true; c.poison = false; lines.push(`${c.name} is dead.`); }
  }
  say(...lines);
  if (!living().length) { gameOver(); return; }
  G.eventTitle = 'A trap';
  MODE = 'scene'; G.sceneArt = null;
  msg(lines, showLocation);
}

function changeLevel(to, how) {
  G.map = to;
  G.lampRested = {};
  G.depth[to] = how === 'down' ? 0 : LEVELS[to].length;
  say(`You enter ${LEVELS[to].name}: ${LEVELS[to].sub.toLowerCase()}.`);
  saveGame();
  showLocation();
}

function enterDungeon(id) {
  G.map = id;
  G.lampRested = {};
  G.depth[id] = 0;
  G.building = null;
  say(`You enter ${LEVELS[id].name}.`);
  saveGame();
  showLocation();
}

function returnToCity() {
  G.map = 'city';
  G.light = 0;
  G.building = null;
  say('You return to the City.');
  if (cityArrival()) return;
  saveGame();
  showLocation();
}

function exploreKey(k) {
  const K = k.length === 1 ? k.toUpperCase() : k;
  if (K === 'Escape' || K === 'Q') { gameMenu(); return true; }
  if (!G.party.length) return false;
  if (K === 'P') { prayMenu(); return true; }
  if (K === 'S') { psalmMenu(); return true; }
  if (K === 'H') { handsMenu(); return true; }
  if (K === 'U') { useMenu(); return true; }
  return false;
}

function gameMenu() {
  showPanel({ title: 'Menu', icon: '☰', eyebrow: 'Game', text: ['The game saves itself as you go.'], options: [
    { k: 'R', t: 'Return', fn: backToExplore, style: 'primary' },
    { k: 'L', t: 'Load last save', fn: () => { const s = loadGame(); if (s) { G = s; say('Save loaded.'); } backToExplore(); } },
    { k: 'N', t: 'New chronicle', fn: () => ask('Abandon this chronicle and start again?', () => { clearSave(); titleScreen(); }, gameMenu) },
  ] });
}

function gameOver() {
  MODE = 'over';
  showPanel({ title: 'The party has fallen', icon: '✝', eyebrow: 'Defeat', text: ['Their names are written in a better book than this one.'], options: [
    { k: 'L', t: 'Load last save', fn: () => { const s = loadGame(); if (s) { G = s; COMBAT = null; say('You try again.'); backToExplore(); } else titleScreen(); }, style: 'primary' },
    { k: 'N', t: 'New chronicle', fn: () => { clearSave(); titleScreen(); } },
  ] });
}

// ---------- prayers, psalms, hands and items outside battle ----------

function prayerList(c, when) {
  return Object.entries(PRAYERS).filter(([, p]) => p.who === CLASSES[c.cls].pray && (p.when === 'any' || p.when === when) && slotMax(c, p.circle) > 0);
}
function answered() { return !G.flags['bronze_' + G.map] && (Math.random() < 0.92 || G.map === 'city'); }

function prayMenu() {
  const cs = living().filter((c) => prayerList(c, 'explore').some(([, p]) => slotsLeft(c, p.circle) > 0));
  if (!cs.length) { msg('No one has prayers left for that. Rest at the hostel to renew them.', backToExplore); return; }
  pickChar('Who will pray?', (c) => cs.includes(c), (c) => {
    const list = prayerList(c, 'explore');
    showPanel({ title: 'Prayer', icon: '✝', eyebrow: c.name, text: ['Prayers are asked, not cast. Most are answered.'], options: [...list.map(([code, p], i) => ({ k: String(i + 1), t: p.name, note: `${p.desc} ${slotsLeft(c, p.circle)} left.`, disabled: slotsLeft(c, p.circle) <= 0, fn: () => exploreRequest(c, code) })), { k: 'ESC', t: 'Cancel', fn: backToExplore, style: 'ghost' }] });
  });
}

function exploreRequest(c, code) {
  const p = PRAYERS[code];
  const go = (target) => {
    if (!answered()) { say(`${c.name} prays for ${p.name}. The answer is: wait.`); msg(`${c.name} prays. The answer is: wait. The prayer is not spent.`, backToExplore); return; }
    c.used[p.circle] = (c.used[p.circle] || 0) + 1;
    const r = applyExplorePrayer(c, code, target);
    if (r !== 'handled') { say(`${c.name} prays ${p.name}. ${r}`); msg(r, backToExplore); }
  };
  if (p.target === 'member') pickChar('For whom?', (x) => (code === 'RAIS' ? x.dead : !x.dead), (t) => go(t));
  else go(null);
}

function applyExplorePrayer(c, code, t) {
  if (code === 'HEAL') { const h = roll(2, 6, Math.floor(c.lvl / 2) + 1); t.hp = Math.min(t.maxhp, t.hp + h); return `${t.name} is healed for ${h}.`; }
  if (code === 'CURE') { t.poison = false; return `${t.name} is cleansed.`; }
  if (code === 'MEND') { for (const x of living()) x.hp = Math.min(x.maxhp, x.hp + roll(2, 8)); return 'The party\'s wounds close.'; }
  if (code === 'WHOL') { for (const x of living()) { x.hp = x.maxhp; x.poison = false; } return 'All are made whole.'; }
  if (code === 'RAIS') { t.dead = false; t.hp = 1; return `"${t.name}, arise." And ${t.name} rises.`; }
  if (code === 'LAMP') { G.light = Math.max(G.light, 200); return 'The icon glows like a lamp. Light for 20 steps.'; }
  if (code === 'WARD') { G.ward = true; return 'A ward surrounds the party until the next rest.'; }
  if (code === 'MAPS') { if (G.map === 'city') return 'You know the City well enough.'; G.flags['maps_' + G.map] = true; return 'You see the way ahead, and what waits along it.'; }
  if (code === 'SEEK') { G.flags.seek = 3; return 'Your eyes open. You will see the next traps before they spring, and deceivers will not fool you.'; }
  if (code === 'PART') { if (G.map === 'city') return 'There is no sea here to part.'; G.flags.parting = true; return 'The way ahead opens like the sea. Your next step deeper will be unopposed.'; }
  if (code === 'HOME') { if (G.map === 'city') return 'You are already home.'; say(`${c.name} prays the way home.`); returnToCity(); return 'handled'; }
  return 'The Lord hears.';
}

function psalmMenu() {
  const f = living().find((c) => c.cls === 'fool' && usesLeft(c) > 0);
  if (!f) { msg('No holy fool has a song left.', backToExplore); return; }
  showPanel({ title: 'Psalms', icon: '♪', eyebrow: f.name, text: [`${f.name} clears their throat.`], options: [
    { k: '1', t: 'Kyrie eleison', note: 'Party AC −2 until the next fight', fn: () => { f.aused++; G.kyrie = true; say('Kyrie eleison. The party is guarded.'); backToExplore(); } },
    { k: '2', t: 'Phos hilaron', note: 'Light for 12 steps', fn: () => { f.aused++; G.light = Math.max(G.light, 120); say('O gladsome light. The dark withdraws.'); backToExplore(); } },
    f.lvl >= 5 ? { k: '3', t: 'Psalm 23', note: 'The party heals a little', fn: () => { f.aused++; for (const c of living()) c.hp = Math.min(c.maxhp, c.hp + roll(1, 4, 2)); say('He restoreth my soul.'); backToExplore(); } } : null,
    { k: 'ESC', t: 'Cancel', fn: backToExplore, style: 'ghost' },
  ] });
}

function handsMenu() {
  const doc = living().find((c) => c.cls === 'anarg' && usesLeft(c) > 0);
  if (!doc) { msg('No physician has strength left.', backToExplore); return; }
  pickChar('Lay hands on whom?', (c) => !c.dead, (t) => {
    doc.aused++;
    const h = roll(1, 8, doc.lvl);
    t.hp = Math.min(t.maxhp, t.hp + h); t.poison = false;
    say(`${doc.name} heals ${t.name} for ${h}. No payment asked.`);
    backToExplore();
  });
}

function useMenu() {
  pickChar('Whose pack?', (c) => !c.dead && c.inv.some((id) => ITEMS[id].type === 'use'), (c) => {
    const items = c.inv.map((id, i) => ({ id, i })).filter(({ id }) => ITEMS[id].type === 'use');
    showPanel({ text: [`${c.name}'s pack.`], options: [...items.map(({ id, i }, n) => ({ k: String(n + 1), t: ITEMS[id].name, fn: () => useItemExplore(c, i) })), { k: 'ESC', t: 'Cancel', fn: backToExplore, style: 'ghost' }] });
  });
}

function useItemExplore(c, i) {
  const id = c.inv[i];
  const it = ITEMS[id];
  if (it.use === 'mamas') {
    if (G.flags.mamasUsed) { msg('The lamp of Saint Mamas is spent until you rest.', backToExplore); return; }
    G.flags.mamasUsed = true; G.light = Math.max(G.light, 150); say(`${c.name} lights the lamp of Saint Mamas.`); backToExplore(); return;
  }
  if (it.use === 'light') { G.light = Math.max(G.light, it.light); c.inv.splice(i, 1); say(`${c.name} lights the ${it.name.toLowerCase()}.`); backToExplore(); return; }
  if (it.use === 'heal') { pickChar('For whom?', (x) => !x.dead, (t) => { const h = rollA(it.heal); t.hp = Math.min(t.maxhp, t.hp + h); c.inv.splice(i, 1); say(`${t.name} eats and drinks, +${h}.`); backToExplore(); }); return; }
  if (it.use === 'cure') { pickChar('For whom?', (x) => !x.dead, (t) => { t.poison = false; c.inv.splice(i, 1); say(`${t.name} is cured.`); backToExplore(); }); return; }
  msg('That is for battle.', backToExplore);
}

// ---------- the character sheet ----------

function itemChip(id, extra = '') {
  const it = ITEMS[id];
  return `<span class="item r-${rarity(id)}" title="${esc(it.desc || '')}">${esc(it.name)}${extra}</span>`;
}

function viewChar(i) {
  const c = partyChars()[i];
  if (!c) return;
  const slotNames = { weapon: 'Weapon', body: 'Armour', shield: 'Shield', helm: 'Helm', belt: 'Belt', feet: 'Boots' };
  const slots = SLOTS.map((s) => `<div class="slot"><span>${slotNames[s]}</span>${c.eq[s] ? itemChip(c.eq[s], cold(c, c.eq[s]) ? ' · cold' : '') : '<em class="muted">empty</em>'}</div>`).join('');
  const stats = ['st', 'dx', 'cn', 'lk', 'fa'].map((s) => `<div class="stat"><span>${s.toUpperCase()}</span><b>${c[s]}</b></div>`).join('');
  const pr = CLASSES[c.cls].pray ? `<div class="circles">${[1, 2, 3, 4, 5].filter((n) => slotMax(c, n)).map((n) => `<span class="tag">Circle ${n}: ${slotsLeft(c, n)}/${slotMax(c, n)}</span>`).join('')}</div>` : '';
  const foot = Object.entries(c.foot).filter(([, v]) => v).map(([k, v]) => `<span class="tag foot">◈ ${IDOLS[k]} ${v}</span>`).join('');
  const next = xpFor(c.lvl + 1);
  const html = `<div class="sheet">
    <div class="shead">${avatar(c, 'big')}<div><h2>${esc(c.name)}</h2><div class="muted">Level ${c.lvl} ${RACES[c.race].name} ${CLASSES[c.cls].name}</div><div class="muted small">${esc(CLASSES[c.cls].desc)}</div></div></div>
    <div class="stats">${stats}<div class="stat"><span>AC</span><b>${acText(acOf(c))}</b></div></div>
    <div class="prow"><span class="lab">HP</span>${bar(c.hp, c.maxhp, 'hp')}<span class="num">${c.hp}/${c.maxhp}</span></div>
    <div class="prow"><span class="lab">XP</span>${bar(c.xp - xpFor(c.lvl), next - xpFor(c.lvl), 'xp')}<span class="num">${c.xp}/${next}</span></div>
    ${pr}
    <div class="slots">${slots}</div>
    <div class="pack"><span class="muted small">Pack ${c.inv.length}/8</span><div>${c.inv.map((id) => itemChip(id)).join('') || '<em class="muted">empty</em>'}</div></div>
    ${foot ? `<div class="pack"><span class="muted small">Footholds</span><div>${foot}</div></div>` : ''}
  </div>`;
  showPanel({ title: 'Character sheet', eyebrow: CLASSES[c.cls].name, icon: '✦', text: [], html, options: [
    { k: 'E', t: 'Equip', fn: () => equipMenu(i) },
    { k: 'R', t: 'Unequip', fn: () => unequipMenu(i) },
    { k: 'T', t: 'Give item', fn: () => tradeMenu(i) },
    { k: 'ESC', t: 'Back', fn: backToExplore, style: 'ghost' },
  ] });
}

function equipMenu(i) {
  const c = partyChars()[i];
  const list = c.inv.map((id, n) => ({ id, n })).filter(({ id }) => SLOTS.includes(ITEMS[id].type));
  showPanel({ text: ['Equip which item?'], options: [...list.map(({ id, n }, k) => ({ k: String(k + 1), t: ITEMS[id].name, note: canUse(c, id) ? '' : 'Cannot use', disabled: !canUse(c, id), fn: () => {
    const slot = ITEMS[id].type;
    c.inv.splice(n, 1);
    if (c.eq[slot]) c.inv.push(c.eq[slot]);
    c.eq[slot] = id;
    viewChar(i);
  } })), { k: 'ESC', t: 'Back', fn: () => viewChar(i), style: 'ghost' }] });
}

function unequipMenu(i) {
  const c = partyChars()[i];
  const list = SLOTS.filter((s) => c.eq[s]);
  showPanel({ text: ['Unequip which item?'], options: [...list.map((s, k) => ({ k: String(k + 1), t: ITEMS[c.eq[s]].name, fn: () => {
    if (c.inv.length >= 8) { msg('The pack is full.', () => viewChar(i)); return; }
    c.inv.push(c.eq[s]); delete c.eq[s]; viewChar(i);
  } })), { k: 'ESC', t: 'Back', fn: () => viewChar(i), style: 'ghost' }] });
}

function tradeMenu(i) {
  const c = partyChars()[i];
  showPanel({ text: ['Give which item?'], options: [...c.inv.map((id, n) => ({ k: String(n + 1), t: ITEMS[id].name, fn: () => {
    pickChar('To whom?', (x) => x !== c && !x.dead && x.inv.length < 8, (t) => { t.inv.push(id); c.inv.splice(n, 1); viewChar(i); }, () => viewChar(i));
  } })), { k: 'ESC', t: 'Back', fn: () => viewChar(i), style: 'ghost' }] });
}

// ---------- title ----------

function titleHtml(p) {
  const styleOf = (o) => o.style || (o.k === 'SPACE' ? 'primary' : /^(exit|back|cancel|leave)$/i.test(o.t) ? 'ghost' : '');
  const opts = (p.options || []).filter(Boolean).map((o, i) => `<button class="opt ${styleOf(o)}" data-opt="${i}"><kbd>${esc(o.k)}</kbd><span class="ot">${esc(o.t)}</span></button>`).join('');
  return `<section class="hero">
    <div class="hero-glyph">♆</div>
    <div class="eyebrow">A Christian fantasy RPG</div>
    <h1 class="grad big">The Widowed Throne</h1>
    <p class="tag-line">A hundred years after the Horn of Anointing vanished, the purple throne stands empty. Rebel powers hold the themes, and giants rule the passes.</p>
    <div class="opts hero-opts">${opts}</div>
    <div class="features">
      <div><b>Party of six</b><span>Hornbearers, holy fools, desert elders and more</span></div>
      <div><b>Prayer, not spells</b><span>Asked per rest, and answered yes, no or wait</span></div>
      <div><b>Four acts</b><span>From the Land Walls to the Tower of Nebrodes</span></div>
    </div>
  </section>`;
}

function titleScreen() {
  MODE = 'title';
  G = null;
  if (typeof COMBAT !== 'undefined') COMBAT = null;
  const saved = loadGame();
  showPanel({ options: [
    saved ? { k: 'C', t: 'Continue chronicle', style: 'primary', fn: () => { G = saved; say('Welcome back.'); backToExplore(); } } : null,
    { k: 'N', t: 'New chronicle', style: saved ? '' : 'primary', fn: () => {
      clearSave(); newGame();
      say('Theopolis. The remnant rebuilds the walls with a trowel in one hand and a spear in the other.');
      enterBuilding('G');
    } },
  ] });
}

// ---------- input ----------

function onKey(e) {
  if (!PANEL) return;
  if (e.target && e.target.id === 'nameinput') {
    if (e.key === 'Enter') { e.preventDefault(); PANEL.input.onDone(e.target.value); }
    else if (e.key === 'Escape' && PANEL.input.onCancel) PANEL.input.onCancel();
    return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const k = e.key;
  const K = k.length === 1 ? k.toUpperCase() : k;
  const opts = (PANEL.options || []).filter(Boolean);
  const opt = opts.find((o) => !o.disabled && (o.k === K || (o.k === 'SPACE' && (k === ' ' || k === 'Enter')) || (o.k === 'ESC' && k === 'Escape')));
  if (opt) { e.preventDefault(); pickOpt(opt); return; }
  if (PANEL.onKey && PANEL.onKey(k)) e.preventDefault();
}

document.addEventListener('keydown', onKey);
document.addEventListener('DOMContentLoaded', () => titleScreen());
