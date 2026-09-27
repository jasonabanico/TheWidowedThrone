'use strict';

// Group combat in the Bard's Tale manner: foes in groups at a distance, orders for
// each character, then one round resolved in order of initiative.

let COMBAT = null;

const HIT_VERBS = { beast: 'bites', man: 'strikes', demon: 'claws', shade: 'chills', serpent: 'bites', giant: 'smashes' };
const SPIRIT_KINDS = ['demon', 'shade'];
const theName = (m) => (m.proper ? m.name : `the ${m.name}`);
const TheName = (m) => (m.proper ? m.name : `The ${m.name}`);

// ---------- starting ----------

function randomEncounter() {
  const m = curMap();
  const table = m.def.enc;
  const n = 1 + (Math.random() < 0.35 ? 1 : 0) + (levelOfMap() > 3 && Math.random() < 0.12 ? 1 : 0);
  const groups = [];
  for (let i = 0; i < n; i++) {
    const [id, lo, hi] = table[rnd(table.length)];
    if (groups.some((g) => g[0] === id)) continue;
    groups.push([id, lo + rnd(hi - lo + 1), i === 0 ? 10 : 10 + 10 * rnd(3)]);
  }
  startCombat(groups, {});
}

// spec: [[monsterId, count, distance]]; opts: { boss, canRun, intro, onWin, onFlee, onLose }
function startCombat(spec, opts = {}) {
  COMBAT = {
    groups: spec.map(([id, count, dist]) => ({ id, hp: Array.from({ length: count }, () => Math.max(1, rollA(MONSTERS[id].hp) + (opts.hpMod && opts.hpMod[id] || 0))), dist: dist || 10, stun: 0, seal: false, hitMod: (opts.hitMod && opts.hitMod[id]) || 0 })),
    round: 0, fx: { ac: 0, hit: 0, spirit: 0, shep: false }, acts: [], idx: 0, cfx: {},
    opts: { canRun: opts.canRun !== false && !opts.boss, ...opts }, xp: 0, gold: 0,
  };
  for (const g of COMBAT.groups) g.max = g.hp.reduce((a, h) => a + h, 0);
  if (G.kyrie) { COMBAT.fx.ac += 2; G.kyrie = false; }
  MODE = 'combat';
  combatIntro();
}

function groupLabel(g) {
  const m = MONSTERS[g.id];
  const n = g.hp.filter((h) => h > 0).length;
  return `${n} ${n === 1 ? m.name : m.pl} (${g.dist}')`;
}
function liveGroups() { return COMBAT.groups.filter((g) => g.hp.some((h) => h > 0)); }

function combatIntro() {
  const text = [];
  if (COMBAT.opts.intro && COMBAT.round === 0) text.push(...COMBAT.opts.intro);
  text.push(COMBAT.round === 0 ? 'You face:' : 'Still before you:');
  for (const g of liveGroups()) text.push(groupLabel(g));
  showPanel({ text, options: [
    { k: 'F', t: 'FIGHT', fn: beginRound },
    COMBAT.opts.canRun ? { k: 'R', t: 'RUN', fn: tryRun } : null,
  ] });
}

function tryRun() {
  const lk = living().reduce((a, c) => a + sb(c.lk), 0) / Math.max(1, living().length);
  if (Math.random() < 0.5 + lk * 0.1) {
    COMBAT = null;
    say('You escape.');
    if (G.pendingFlee) { const f = G.pendingFlee; G.pendingFlee = null; f(); return; }
    backToExplore();
    return;
  }
  COMBAT.acts = living().map((c) => ({ c, type: 'none' }));
  resolveRound(['You fail to escape!']);
}

// ---------- orders ----------

function beginRound() {
  COMBAT.acts = [];
  COMBAT.idx = 0;
  COMBAT.round += 1;
  nextActor();
}

function nextActor() {
  const party = partyChars();
  while (COMBAT.idx < party.length) {
    const i = COMBAT.idx;
    const c = party[i];
    if (c.dead) { COMBAT.idx++; continue; }
    const fx = COMBAT.cfx[i] || {};
    if (fx.skip) { COMBAT.acts.push({ c, i, type: 'skip', why: fx.skip }); COMBAT.idx++; continue; }
    orderMenu(c, i);
    return;
  }
  resolveRound([]);
}

function setAct(act) { COMBAT.acts.push(act); COMBAT.idx++; nextActor(); }

function chooseGroup(filter, fn, back) {
  const gs = liveGroups().filter(filter);
  if (!gs.length) { msg('No foe in reach.', back); return; }
  if (gs.length === 1) { fn(gs[0]); return; }
  showPanel({ text: ['Which group?'], options: [...gs.map((g, n) => ({ k: String(n + 1), t: groupLabel(g), fn: () => fn(g) })), { k: 'ESC', t: 'BACK', fn: back }] });
}

function weaponOf(c) { return c.eq.weapon ? ITEMS[c.eq.weapon] : { name: 'Fists', dmg: [1, 2, 0], small: true }; }
function dire() {
  const all = partyChars();
  const down = all.filter((c) => c.dead || c.hp < c.maxhp / 3).length;
  return down * 2 >= all.length || COMBAT.opts.boss;
}

function orderMenu(c, i) {
  const back = () => orderMenu(c, i);
  const w = weaponOf(c);
  const cl = CLASSES[c.cls];
  const front = partyChars().filter((x) => !x.dead).indexOf(c) < 3;
  const melee = liveGroups().some((g) => g.dist <= 10);
  const opts = [];
  if (front && melee && !w.ranged) opts.push({ k: 'A', t: 'ATTACK', fn: () => chooseGroup((g) => g.dist <= 10, (g) => setAct({ c, i, type: 'attack', g }), back) });
  if (w.ranged) opts.push({ k: 'F', t: `FIRE ${w.name}`, fn: () => chooseGroup((g) => g.dist <= 40, (g) => setAct({ c, i, type: 'attack', g, ranged: true }), back) });
  const pl = cl.pray ? prayerList(c, 'combat').filter(([, p]) => slotsLeft(c, p.circle) > 0) : [];
  if (pl.length) opts.push({ k: 'P', t: 'PRAY', fn: () => combatPrayMenu(c, i, pl) });
  if (cl.ability === 'psalm' && usesLeft(c) > 0) opts.push({ k: 'S', t: 'Sing a psalm', fn: () => combatPsalmMenu(c, i) });
  if (cl.ability === 'hands' && usesLeft(c) > 0) opts.push({ k: 'H', t: 'Healing hands', fn: () => pickChar('Heal whom?', (x) => !x.dead, (t) => setAct({ c, i, type: 'hands', t }), back) });
  if (cl.ability === 'rebuke' && usesLeft(c) > 0) opts.push({ k: 'R', t: 'REBUKE', fn: () => chooseGroup((g) => g.dist <= 40, (g) => setAct({ c, i, type: 'rebuke', g }), back) });
  if (cl.ability === 'surge' && usesLeft(c) > 0 && front && melee) opts.push({ k: 'G', t: 'Spirit of might', fn: () => chooseGroup((g) => g.dist <= 10, (g) => setAct({ c, i, type: 'surge', g }), back) });
  if (c.inv.some((id) => ['holywater', 'bread', 'myrrh'].includes(id))) opts.push({ k: 'U', t: 'Use item', fn: () => combatUseMenu(c, i) });
  opts.push({ k: 'D', t: 'DEFEND', fn: () => setAct({ c, i, type: 'defend' }) });
  if (!G.flags['cry_' + G.map] && dire()) opts.push({ k: 'C', t: 'Cry out to God', fn: () => setAct({ c, i, type: 'cry' }) });
  showPanel({ text: [`${c.name}'s turn. ${CLASSES[c.cls].name}, HP ${c.hp} of ${c.maxhp}.`], options: opts });
}

function combatPrayMenu(c, i, list) {
  const back = () => orderMenu(c, i);
  showPanel({ text: [`${c.name} prays:`], options: [...list.map(([code, p], n) => ({ k: String(n + 1), t: `${code} ${p.name}`.slice(0, 17) + ` ${slotsLeft(c, p.circle)}`, fn: () => {
    if (p.target === 'group') chooseGroup(() => true, (g) => setAct({ c, i, type: 'pray', code, g }), back);
    else if (p.target === 'member') pickChar('For whom?', (x) => !x.dead, (t) => setAct({ c, i, type: 'pray', code, t }), back);
    else setAct({ c, i, type: 'pray', code });
  } })), { k: 'ESC', t: 'BACK', fn: back }] });
}

function combatPsalmMenu(c, i) {
  const back = () => orderMenu(c, i);
  const list = PSALMS.filter((s) => c.lvl >= s.lvl);
  showPanel({ text: [`${c.name} sings:`], options: [...list.map((s, n) => ({ k: String(n + 1), t: s.name, fn: () => setAct({ c, i, type: 'psalm', s: s.id }) })), { k: 'ESC', t: 'BACK', fn: back }] });
}

function combatUseMenu(c, i) {
  const back = () => orderMenu(c, i);
  const items = c.inv.map((id, n) => ({ id, n })).filter(({ id }) => ['holywater', 'bread', 'myrrh'].includes(id));
  showPanel({ text: ['Use which?'], options: [...items.map(({ id, n }, k) => ({ k: String(k + 1), t: ITEMS[id].name, fn: () => {
    if (id === 'holywater') chooseGroup((g) => g.dist <= 30, (g) => setAct({ c, i, type: 'item', id, g }), back);
    else pickChar('For whom?', (x) => !x.dead, (t) => setAct({ c, i, type: 'item', id, t }), back);
  } })), { k: 'ESC', t: 'BACK', fn: back }] });
}

// ---------- resolution ----------

function resolveRound(lines) {
  const party = partyChars();
  COMBAT.cfx = {};
  // Terror of the great ones.
  for (const g of liveGroups()) {
    const m = MONSTERS[g.id];
    if ((m.spec || []).includes('fear') && Math.random() < 0.3) {
      lines.push(`${TheName(m)} roars and boasts.`);
      party.forEach((c, i) => {
        if (c.dead || c.cls === 'fool' || wears(c, 'boots')) return;
        if (Math.random() < 0.35) {
          lines.push(`${c.name} trembles.`);
          const a = COMBAT.acts.find((x) => x.c === c);
          if (a) { a.type = 'skip'; a.why = 'TREMBLES'; }
        }
      });
    }
  }
  const order = [];
  for (const a of COMBAT.acts) order.push({ who: 'p', a, init: roll(1, 20) + sb(a.c.dx) + (a.type === 'defend' ? 20 : 0) });
  for (const g of COMBAT.groups) order.push({ who: 'm', g, init: roll(1, 20) + Math.floor(MONSTERS[g.id].hit / 3) });
  order.sort((x, y) => y.init - x.init);
  for (const o of order) {
    if (!living().length) break;
    if (!liveGroups().length) break;
    if (o.who === 'p') { if (!o.a.c.dead) partyAct(o.a, lines); }
    else if (o.g.hp.some((h) => h > 0)) monsterAct(o.g, lines);
  }
  if (COMBAT.fx.shep) for (const c of living()) c.hp = Math.min(c.maxhp, c.hp + roll(1, 4));
  for (const g of COMBAT.groups) if (g.stun > 0) g.stun--;
  endOfRound(lines);
}

function endOfRound(lines) {
  if (!living().length) {
    showPanel({ text: lines.length ? lines : ['...'], options: [{ k: 'SPACE', t: 'CONTINUE', fn: () => { COMBAT = null; if (G.pendingLose) { const f = G.pendingLose; G.pendingLose = null; f(); } else gameOver(); } }] });
    return;
  }
  if (!liveGroups().length) {
    const each = giveXp(COMBAT.xp);
    G.gold += COMBAT.gold;
    lines.push('The fight is won.', `Each survivor gains ${each} experience.`);
    if (COMBAT.gold) lines.push(`You find ${COMBAT.gold} gold.`);
    if (!COMBAT.opts.boss && Math.random() < 0.18) {
      const loot = ['torch', 'oil', 'holywater', 'bread', 'myrrh'][rnd(5)];
      if (partyGets(loot, false)) lines.push(`You find ${up(ITEMS[loot].name)}.`);
    }
    const onWin = COMBAT.opts.onWin;
    COMBAT = null;
    showPanel({ text: lines, options: [{ k: 'SPACE', t: 'CONTINUE', fn: () => { if (onWin) onWin(); else backToExplore(); } }] });
    return;
  }
  showPanel({ text: lines.length ? lines : ['The round passes.'], options: [{ k: 'SPACE', t: 'CONTINUE', fn: combatIntro }] });
}

function kill(g, idx, lines, how) {
  const m = MONSTERS[g.id];
  g.hp[idx] = 0;
  COMBAT.xp += m.xp;
  COMBAT.gold += m.gold ? m.gold[0] + rnd(m.gold[1] - m.gold[0] + 1) : 0;
  lines.push(`${TheName(m)} ${how || m.verb || VERBS[m.kind]}.`);
}

function firstAlive(g) { return g.hp.findIndex((h) => h > 0); }

function damageMonster(g, idx, dmg, lines, verb) {
  const m = MONSTERS[g.id];
  g.hp[idx] -= dmg;
  if (g.hp[idx] <= 0) kill(g, idx, lines);
}

function partyAct(a, lines) {
  const c = a.c;
  if (a.type === 'skip') { lines.push(`${c.name} ${a.why}.`); return; }
  if (a.type === 'none') return;
  if (a.type === 'defend') { COMBAT.cfx[a.i] = { ...(COMBAT.cfx[a.i] || {}), defend: true }; lines.push(`${c.name} defends.`); return; }
  if (a.type === 'attack' || a.type === 'surge') {
    const g = a.g.hp.some((h) => h > 0) ? a.g : liveGroups()[0];
    if (!a.ranged && g.dist > 10) { lines.push(`${c.name} cannot reach.`); return; }
    const w = weaponOf(c);
    const fighter = ['hornbearer', 'akrites', 'deliverer'].includes(c.cls);
    let n = a.type === 'surge' ? 3 : 1 + (fighter ? Math.floor(c.lvl / 6) : 0);
    if (a.type === 'surge') { c.aused++; lines.push(`The Spirit of the Lord comes upon ${c.name}!`); }
    while (n-- > 0 && g.hp.some((h) => h > 0)) {
      const idx = firstAlive(g);
      const m = MONSTERS[g.id];
      let atk = Math.floor(c.lvl * CLASSES[c.cls].atk) + sb(c.st) + COMBAT.fx.hit + (a.ranged ? sb(c.dx) : 0);
      if (c.cls === 'hornbearer' && (m.kind === 'demon' || m.kind === 'giant')) atk += 2;
      const d20 = roll(1, 20);
      if (d20 !== 20 && (d20 === 1 || d20 + atk + m.ac < 20)) { lines.push(`${c.name} misses ${theName(m)}.`); continue; }
      if (c.cls === 'akrites' && !m.boss && Math.random() < Math.min(0.3, c.lvl * 0.03)) {
        lines.push(`${c.name} strikes a mortal blow!`);
        kill(g, idx, lines);
        continue;
      }
      let dmg = rollA(w.dmg) + (a.ranged ? 0 : sb(c.st)) + (a.type === 'surge' ? 4 : 0) + (fighter ? Math.floor(c.lvl / 3) : 0);
      if (m.kind === 'giant') { if (c.cls === 'akrites') dmg += 4; if (w.small) dmg *= 2; if (c.eq.weapon === 'poimen') dmg += 2; }
      if (m.kind === 'serpent' && c.eq.weapon === 'theodore') dmg += 4;
      if (SPIRIT_KINDS.includes(m.kind)) {
        if (c.eq.weapon === 'sword' && !cold(c, 'sword')) dmg += 6;
        else if (!w.blessed) dmg = Math.ceil(dmg / 2);
        if (c.cls === 'hornbearer') dmg += 1;
      }
      if (m.kind === 'giant' && w.small && !m.boss && dmg >= 6 && Math.random() < 0.1) { lines.push(`A small thing fells a great one!`); kill(g, idx, lines); continue; }
      lines.push(`${c.name} hits ${theName(m)} for ${dmg}.`);
      damageMonster(g, idx, dmg, lines);
    }
    return;
  }
  if (a.type === 'hands') {
    c.aused++;
    const h = roll(1, 8, c.lvl);
    a.t.hp = Math.min(a.t.maxhp, a.t.hp + h); a.t.poison = false;
    lines.push(`${c.name} lays hands on ${a.t.name}: +${h}.`);
    return;
  }
  if (a.type === 'rebuke') { c.aused++; lines.push(`${c.name} rebukes them in the name of Christ.`); castOut(a.g, roll(3, 6, c.lvl), lines); return; }
  if (a.type === 'psalm') { c.aused++; applyPsalm(c, a.s, lines); return; }
  if (a.type === 'item') { useCombatItem(c, a, lines); return; }
  if (a.type === 'pray') { combatPrayer(c, a, lines); return; }
  if (a.type === 'cry') {
    G.flags['cry_' + G.map] = true;
    lines.push(`${c.name} cries out: "Lord, save us!"`);
    const r = Math.random();
    if (r < 0.3) {
      lines.push('A stranger stands among you, taller and brighter than a man. Your foes fall back in terror.');
      for (const g of COMBAT.groups) g.stun = Math.max(g.stun, 2);
      for (const x of living()) x.hp = Math.min(x.maxhp, x.hp + roll(2, 8));
    } else if (r < 0.7) lines.push('The answer is: wait. Hold fast.');
    else {
      const t = living().sort((x, y) => x.hp / x.maxhp - y.hp / y.maxhp)[0];
      t.hp = t.maxhp; t.poison = false;
      lines.push(`A different gift: ${t.name} stands up whole.`);
    }
  }
}

function castOut(g, base, lines) {
  const m = MONSTERS[g.id];
  if (!SPIRIT_KINDS.includes(m.kind)) { lines.push(`${m.proper ? `${m.name} is` : `The ${m.pl} are`} flesh. The rebuke does not move them.`); return; }
  g.hp.forEach((h, idx) => { if (h > 0) damageMonster(g, idx, base + rnd(4), lines); });
}

function groupDamage(g, dice, lines, spiritOnly = false) {
  const m = MONSTERS[g.id];
  g.hp.forEach((h, idx) => {
    if (h <= 0) return;
    const d = rollA(dice);
    if (spiritOnly && !SPIRIT_KINDS.includes(m.kind)) return;
    damageMonster(g, idx, d, lines);
  });
  if (g.hp.some((h) => h > 0)) lines.push(`${m.proper ? `${m.name} is` : `The ${m.pl} are`} scorched.`);
}

function combatPrayer(c, a, lines) {
  const p = PRAYERS[a.code];
  if (slotsLeft(c, p.circle) <= 0) { lines.push(`${c.name} has no prayer left of that circle.`); return; }
  lines.push(`${c.name} prays ${a.code}.`);
  if (!answered()) { lines.push('The answer is: wait.'); return; }
  c.used[p.circle] = (c.used[p.circle] || 0) + 1;
  const t = a.t, g = a.g && a.g.hp.some((h) => h > 0) ? a.g : liveGroups()[0];
  switch (a.code) {
    case 'HEAL': { if (t.dead) { lines.push('Too late.'); break; } const h = roll(2, 6, Math.floor(c.lvl / 2) + 1); t.hp = Math.min(t.maxhp, t.hp + h); lines.push(`${t.name} +${h}.`); break; }
    case 'SHLD': COMBAT.fx.ac += 2; lines.push('A shield of faith covers the party.'); break;
    case 'EXOR': castOut(g, roll(3, 6, c.lvl), lines); break;
    case 'CURE': t.poison = false; lines.push(`${t.name} is cleansed.`); break;
    case 'MEND': for (const x of living()) x.hp = Math.min(x.maxhp, x.hp + roll(2, 8)); lines.push('Wounds close.'); break;
    case 'BIND': if (MONSTERS[g.id].kind === 'giant' && Math.random() < 0.5) lines.push('The giants shrug it off.'); else { g.stun = 3; lines.push(`The ${up(MONSTERS[g.id].pl)} are bound.`); } break;
    case 'FIRE': lines.push('Fire falls from heaven!'); groupDamage(g, [5, 8, 0], lines); break;
    case 'COAL': lines.push('A coal from the altar burns!'); groupDamage(g, [4, 8, c.lvl], lines); break;
    case 'SEAL': g.seal = true; lines.push(`The ${up(MONSTERS[g.id].pl)} are sealed.`); break;
    case 'HOLY':
      lines.push('Holy, holy, holy!');
      for (const gg of liveGroups()) groupDamage(gg, SPIRIT_KINDS.includes(MONSTERS[gg.id].kind) ? [6, 8, 0] : [2, 8, 0], lines);
      break;
    case 'WHOL': for (const x of living()) { x.hp = x.maxhp; x.poison = false; } lines.push('All are made whole.'); break;
    case 'ICON':
      lines.push('The face of Christ Pantocrator shines out.');
      for (const gg of liveGroups()) { if (!MONSTERS[gg.id].boss && Math.random() < 0.5) gg.stun = 2; if (SPIRIT_KINDS.includes(MONSTERS[gg.id].kind)) groupDamage(gg, [3, 8, 0], lines); }
      break;
    default: lines.push('Nothing happens.');
  }
}

function applyPsalm(c, id, lines) {
  const s = PSALMS.find((x) => x.id === id);
  lines.push(`${c.name} sings "${up(s.name)}".`);
  if (id === 1) COMBAT.fx.ac += 2;
  if (id === 2) { G.light = Math.max(G.light, 120); COMBAT.fx.hit += 1; }
  if (id === 3) COMBAT.fx.spirit = 3;
  if (id === 4) COMBAT.fx.shep = true;
  if (id === 5) COMBAT.fx.hit += 2;
  if (id === 6) {
    for (const g of liveGroups()) {
      if (MONSTERS[g.id].kind !== 'man' || MONSTERS[g.id].boss) continue;
      g.hp.forEach((h, idx) => { if (h > 0 && Math.random() < 0.5) { g.hp[idx] = 0; COMBAT.xp += Math.floor(MONSTERS[g.id].xp / 2); lines.push(`A ${up(MONSTERS[g.id].name)} throws down his arms.`); } });
    }
  }
}

function useCombatItem(c, a, lines) {
  const n = c.inv.indexOf(a.id);
  if (n < 0) return;
  c.inv.splice(n, 1);
  if (a.id === 'holywater') {
    const g = a.g;
    lines.push(`${c.name} throws holy water.`);
    g.hp.forEach((h, idx) => { if (h > 0) damageMonster(g, idx, SPIRIT_KINDS.includes(MONSTERS[g.id].kind) ? roll(2, 8, 2) : roll(1, 4), lines); });
  } else if (a.id === 'bread') { const h = roll(2, 6); a.t.hp = Math.min(a.t.maxhp, a.t.hp + h); lines.push(`${a.t.name} eats and drinks. +${h}.`); }
  else if (a.id === 'myrrh') { a.t.poison = false; lines.push(`${a.t.name} is cured.`); }
}

// ---------- the enemy ----------

function frontTargets() {
  const alive = partyChars().map((c, i) => ({ c, i })).filter(({ c }) => !c.dead);
  return alive.slice(0, 3);
}

function monsterAct(g, lines) {
  const m = MONSTERS[g.id];
  const spec = m.spec || [];
  if (g.stun > 0) { lines.push(`The ${up(g.hp.filter((h) => h > 0).length > 1 ? m.pl : m.name)} cannot move.`); return; }
  if (g.dist > 10) {
    if (spec.includes('sorcery') && !g.seal && Math.random() < 0.5) { sorcery(m, lines); return; }
    g.dist -= 10;
    lines.push(`${m.proper ? `${m.name} advances` : `The ${m.pl} advance`} to ${g.dist}'.`);
    return;
  }
  const count = g.hp.filter((h) => h > 0).length;
  for (let k = 0; k < count; k++) {
    if (!living().length) return;
    if (spec.includes('breath') && Math.random() < 0.3) { breath(m, lines); continue; }
    if (spec.includes('sorcery') && !g.seal && Math.random() < 0.35) { sorcery(m, lines); continue; }
    if (spec.includes('charm') && Math.random() < 0.25) { charm(m, lines); continue; }
    for (let at = 0; at < (m.att || 1); at++) {
      const targets = frontTargets();
      if (!targets.length) return;
      const { c, i } = targets[rnd(targets.length)];
      const defend = COMBAT.cfx[i] && COMBAT.cfx[i].defend ? 2 : 0;
      const ac = acOf(c, COMBAT.fx.ac + defend);
      let hit = m.hit + g.hitMod - (g.seal ? 4 : 0) - (SPIRIT_KINDS.includes(m.kind) ? COMBAT.fx.spirit : 0);
      if (m.kind === 'demon') hit += Math.min(3, footTotal(c));
      const d20 = roll(1, 20);
      if (d20 !== 20 && (d20 === 1 || d20 + hit + ac < 20)) { lines.push(`${TheName(m)} misses ${c.name}.`); continue; }
      let dmg = rollA(m.dmg);
      if (spec.includes('fire') && wears(c, 'shieldf')) dmg = Math.ceil(dmg / 2);
      c.hp -= dmg;
      lines.push(`${TheName(m)} ${HIT_VERBS[m.kind]} ${c.name} for ${dmg}.`);
      if (spec.includes('poison') && Math.random() < 0.3 && c.hp > 0) { c.poison = true; lines.push(`${c.name} is poisoned.`); }
      if (spec.includes('accuse') && footTotal(c) > 0 && !wears(c, 'helmet') && !wears(c, 'belt') && c.hp > 0) {
        COMBAT.cfx[i] = { ...(COMBAT.cfx[i] || {}), skip: 'Remembers his sins and cannot act' };
        lines.push(`It whispers ${c.name}'s sins aloud.`);
      }
      if (spec.includes('despair') && !wears(c, 'boots') && !COMBAT.opts.handsAtWork) drainPrayer(lines);
      if (c.hp <= 0) { c.hp = 0; c.dead = true; c.poison = false; lines.push(`${c.name} is dead.`); }
    }
  }
}

function breath(m, lines) {
  lines.push(`${TheName(m)} ${m.breath || 'breathes a flood of bitter water'}!`);
  for (const { c } of frontTargets()) {
    let d = roll(2, 8);
    if (wears(c, 'shieldf')) d = Math.ceil(d / 2);
    c.hp -= d;
    lines.push(`${c.name} takes ${d}.`);
    if (c.hp <= 0) { c.hp = 0; c.dead = true; lines.push(`${c.name} is dead.`); }
  }
}

function sorcery(m, lines) {
  lines.push(`${TheName(m)} works stolen sorcery!`);
  for (const c of living()) {
    let d = roll(2, 6);
    if (wears(c, 'shieldf')) d = Math.ceil(d / 2);
    c.hp -= d;
    if (c.hp <= 0) { c.hp = 0; c.dead = true; lines.push(`${c.name} is dead.`); }
  }
  lines.push('Fire washes over the party.');
}

function charm(m, lines) {
  const alive = partyChars().map((c, i) => ({ c, i })).filter(({ c }) => !c.dead);
  const { c, i } = alive[rnd(alive.length)];
  if (c.cls === 'fool' || wears(c, 'belt') || wears(c, 'veil') || COMBAT.opts.noCharm) { lines.push(`${TheName(m)} flatters ${c.name}, who laughs at it.`); return; }
  COMBAT.cfx[i] = { ...(COMBAT.cfx[i] || {}), skip: 'Is charmed and stands dreaming' };
  lines.push(`${TheName(m)} whispers sweetly to ${c.name}.`);
}

function drainPrayer(lines) {
  const cs = living().filter((c) => usesLeft(c) > 0 && (CLASSES[c.cls].pray || c.cls === 'fool'));
  if (!cs.length) return;
  const c = cs[rnd(cs.length)];
  if (CLASSES[c.cls].pray) { for (let n = 5; n >= 1; n--) if (slotsLeft(c, n) > 0) { c.used[n]++; break; } }
  else c.aused++;
  lines.push(`${c.name} feels the noonday despair. A prayer dies on the lips.`);
}
