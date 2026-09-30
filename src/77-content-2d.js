// ============================================================ CONTENT: 2.10 "Nobody's Nobody"
// SPEC §11. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
// Mini-game: journey (64-mg-cards-sequencer.js). Sets: lab (time-lapse), square (lodge + Front Square), buttery, theatre.
(() => {
  const PI = Math.PI, H = PI / 2;
  const say = (id, text, o) => Object.assign({ say: id, text }, o);
  const slow = (id, text, o) => say(id, text, Object.assign({ speed: 'slow' }, o));
  const actor = (c, id) => c.world.actor(id);
  const has = (id) => state.inventory.includes(id);
  const inSquare = () => world.setId === 'square', inButtery = () => world.setId === 'buttery', inTheatre = () => world.setId === 'theatre';
  const out = (s) => inSquare() && !!s.flags.tea_given;   // the square opens up once Des has his tea
  const SIX = ['Ronan', 'Siobhán', 'Fiachra', 'Mick', 'Nuala', 'Hartigan'];
  function newNames() { let n = 0; for (let i = 0; i < SIX.length; i++) if (state.names.includes(SIX[i])) n++; return n; }
  const swapText = () => (input.scheme === 'pad' ? 'Y — Swap' : input.scheme === 'touch' ? 'SWAP — Swap' : 'TAB — Swap');
  const still = (n) => (MINIGAMES.final_yes && MINIGAMES.final_yes.still ? MINIGAMES.final_yes.still(n) : null);

  // Luka's 1987 habit: a glance at Chase before he speaks (head only)
  function glance(c, id = 'luka', at = 'chase', dur = 1.3) {
    const a = actor(c, id), b = actor(c, at);
    if (!a || !b) return;
    let d = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z) - a.rotY; d = Math.atan2(Math.sin(d), Math.cos(d));
    a.play('glance', { yaw: Math.max(-1.3, Math.min(1.3, d)), dur });
  }

  // Des taps the brim of his porter's cap: the ear-height 'phone' reach, lifted to the cap, with a small tap.
  if (!ANIMS.cap_tap) {
    ANIMS.cap_tap = (r, t, p) => {
      const d = r.d, h = d.headC, k = Math.max(0, Math.sin(t * 9));
      d.headC = h + 0.24 + 0.025 * k; ANIMS.phone(r, t, p); d.headC = h;
      r.parts.head.rotation.z = 0; r.parts.head.rotation.x = 0.1;
    };
    ANIMS.cap_tap.upper = true;
  }

  // ---------------------------------------------------------- cards and items
  // FLASHBACK INSERTS: a still the camera caught earlier, a little faded.
  CARDS.memory = (cx, w, h, d) => {
    const s = still(d.name), b = 8;
    cx.fillStyle = '#efe9dc'; cx.fillRect(0, 0, w, h);
    if (s) cx.drawImage(s, b, b, w - 2 * b, h - 2 * b); else { cx.fillStyle = '#2a2d33'; cx.fillRect(b, b, w - 2 * b, h - 2 * b); }
    cx.globalCompositeOperation = 'saturation'; cx.globalAlpha = 0.5; cx.fillStyle = '#808080'; cx.fillRect(b, b, w - 2 * b, h - 2 * b);
    cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1;
    cx.fillStyle = 'rgba(255,238,205,0.1)'; cx.fillRect(b, b, w - 2 * b, h - 2 * b);
    const g = cx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, w * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.4)');
    cx.fillStyle = g; cx.fillRect(b, b, w - 2 * b, h - 2 * b);
  };
  CARDS.memory.size = [960, 408];

  // Luka's notebook: the Names, on the back of a JARVIS error printout. Who still needs help is written in.
  const WHO = { Ronan: 'Asleep under the arches', 'Siobhán': 'Arts Building, notes everywhere', Fiachra: 'The busker at the gate',
    Mick: 'Groundskeeper v. pigeons', Nuala: 'Librarian, locked out', Hartigan: 'Professor, lost his glasses' };
  const NB = { title: 'Names', paper: 'printout', ticks: true, items: [] };
  function fillNB() {
    NB.items = NAMES.map((n) => (state.names.includes(n) ? { text: n, done: true } : { text: '? ' + (WHO[n] || ''), done: false }));
    if (newNames() >= 4 && !state.flags.day_done) NB.items.push({ text: 'Then: call it a day at the lodge', done: false });
  }

  const icon = (fn) => (c, w, h) => { c.save(); c.translate(w / 2, h / 2); c.scale(w / 100, h / 100); fn(c); c.restore(); };
  const card = (kind, data) => async (c) => {   // examine: a readable card until YES
    if (typeof data === 'function') data = data();
    c.ui.card(kind, data); await c.wait(0.15);
    const t = clock.t;
    await waitUntil(() => { if (TEST.auto) return clock.t - t > 0.5; if (!input.pressed('yes')) return false; input.consume('yes'); return true; });
    c.ui.card(null);
  };
  Object.assign(ITEMS, {
    notebook: {
      name: "Luka's notebook",
      icon: icon((c) => { c.rotate(0.06); c.fillStyle = '#fdfdfb'; c.fillRect(-30, -38, 60, 76); c.fillStyle = '#e4e4ea'; for (let y = -32; y < 36; y += 10) { c.fillRect(-28, y, 4, 4); c.fillRect(24, y, 4, 4); } c.fillStyle = '#1d2f8f'; for (let y = -24; y < 30; y += 9) c.fillRect(-18, y, 22 + (y * 5) % 14, 3); }),
      examine: card('list', () => (fillNB(), NB)),
    },
    toast: { name: 'Toast', icon: icon((c) => { c.fillStyle = '#b8823a'; c.fillRect(-30, -26, 60, 52); c.fillStyle = '#d9a860'; c.fillRect(-24, -20, 48, 40); }) },
    key_brass: { name: 'Big brass key', icon: icon((c) => { c.strokeStyle = '#c9a23a'; c.lineWidth = 9; c.beginPath(); c.arc(-24, 0, 15, 0, 7); c.stroke(); c.fillStyle = '#c9a23a'; c.fillRect(-9, -5, 50, 10); c.fillRect(28, 5, 7, 14); c.fillRect(37, 5, 6, 9); }) },
    glasses: { name: 'Reading glasses', icon: icon((c) => { c.strokeStyle = '#2a2018'; c.lineWidth = 5; for (const x of [-18, 18]) { c.beginPath(); c.arc(x, 0, 14, 0, 7); c.stroke(); } c.beginPath(); c.moveTo(-4, -2); c.lineTo(4, -2); c.stroke(); }) },
  });

  // ---------------------------------------------------------- the day's state (reset at scene start: Continue restarts the scene)
  const FLAGS = ['tea_made', 'tea_given', 'day_done', 'bell_rung', 'ronan_done', 'siobhan_done', 'fiachra_done', 'fiachra_tune', 'met_mick',
    'toast_n', 'mick_done', 'met_nuala', 'nuala_done', 'met_hartigan', 'hartigan_done'];
  function resetDay() {
    const f = state.flags;
    for (const k of FLAGS) delete f[k];
    state.names = state.names.filter((n) => !SIX.includes(n) && n !== 'Des' && n !== 'Declan');
    state.inventory = state.inventory.filter((i) => !['toast', 'key_brass', 'glasses', 'notebook'].includes(i));
    BELL.t = 0; BELL.left = 0; BELL.again = 0; BUSK.mute = false;
  }

  // Two mugs: the rig's own mug in the left hand, a copy in the right; the carry walk holds them out in front.
  let MUG2 = null;
  function carry(c, on) {
    const l = actor(c, 'luka'), m = l && l.rig.attach.mug;
    if (!l) return;
    if (on) {
      if (m) { m.visible = true; if (!MUG2) MUG2 = m.clone(); }
      if (MUG2 && l.rig.attach.gripR) { l.rig.attach.gripR.add(MUG2); MUG2.visible = true; }
      l.walkAnim = 'carry';
    } else {
      if (MUG2 && MUG2.parent) MUG2.parent.remove(MUG2);
      if (m) m.visible = false;
      l.walkAnim = 'walk';
    }
  }
  const mug = (id, on) => ({ do: (c) => { const a = actor(c, id); if (a && a.rig.attach.mug) a.rig.attach.mug.visible = on; } });

  // Siobhán's notes, all over the cobbles round her feet (children of her rig, so they go where she goes)
  let NOTES = null;
  function notes(c, on) {
    const s = actor(c, 'siobhan');
    if (!NOTES) {
      NOTES = new THREE.Group(); NOTES.name = 'siobhan_notes';
      const g = new THREE.PlaneGeometry(0.21, 0.29).rotateX(-H), m = mat(0xf2efe6);
      [[-0.45, 0.3, 0.4], [0.5, 0.2, -0.7], [0.3, -0.55, 1.2], [-0.6, -0.35, 2.2], [0.05, 0.6, 2.9], [0.75, -0.1, 0.1], [-0.2, -0.75, 1.7]]
        .forEach(([x, z, r], i) => { const p = new THREE.Mesh(g, m); p.position.set(x, 0.012 + i * 0.002, z); p.rotation.y = r; NOTES.add(p); });
    }
    if (on && s) { if (NOTES.parent !== s.root) s.root.add(NOTES); }
    else if (NOTES.parent) NOTES.parent.remove(NOTES);
  }

  // A book under Ronan's head (his own, from 2.3)
  let BOOK = null;
  function bookUnder(c) {
    const r = actor(c, 'ronan');
    if (!r) return;
    if (!BOOK) { BOOK = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.24), mat(0xa8322a)); BOOK.name = 'ronan_book'; }
    const v = new THREE.Vector3(); r.headPos(v);
    r.root.parent.add(BOOK); BOOK.position.set(v.x + 0.02, 0.49, v.z); BOOK.rotation.set(0, 0.2, 0); BOOK.visible = true;
  }
  const noBook = () => { if (BOOK && BOOK.parent) BOOK.parent.remove(BOOK); };

  // Mick's three marked spots: chalk crosses on the cobbles (toast_1..3), each gone once its toast is down
  let CHALK = null;
  function chalk(c) {
    if (!inSquare()) return;
    if (!CHALK) {
      const g = new THREE.PlaneGeometry(0.8, 0.1).rotateX(-H), m = mat(0xf2efe6, { emissive: 0x33322e });
      CHALK = [0, 1, 2].map(() => { const x = new THREE.Group(); for (const r of [0.8, -0.8]) { const p = new THREE.Mesh(g, m); p.rotation.y = r; x.add(p); } return x; });
    }
    const f = state.flags, sc = c.world.scene;
    CHALK.forEach((x, i) => {
      const p = c.world.mark('toast_' + (i + 1));
      if (!p) return;
      if (x.parent !== sc) sc.add(x);
      x.position.set(p.x ?? p[0], 0.012, p.z ?? p[2]);
      x.visible = !f.mick_done && !f.day_done && (f.toast_n | 0) <= i;
    });
  }

  // ---------------------------------------------------------- dressing the sets
  const MACHINE_DESK = [-20.88, 1.25, 5.62];
  const SPOTS = { ronan: [22.6, 0.47, 2.0, -H], siobhan: 'siobhan', fiachra: 'fiachra', mick: 'mick', nuala: [22.45, 0, -5.25, H], hartigan: 'hartigan_search' };
  function squareDress(c) {
    if (!inSquare()) return;
    const P = (n) => c.world.prop(n), f = state.flags;
    const m = P('machine'); if (m) { m.visible = true; m.position.set(...MACHINE_DESK); m.rotation.set(0, -0.3, 0); }
    for (const [n, v] of [['machine_wrap', false], ['machine_wire', !!f.machine_wired], ['swivel_chair', false], ['yes_sign', false], ['glasses', false],
      ['bike', !f.part_bike], ['bike_chain', !f.part_bike], ['key_brass', !has('key_brass') && !f.nuala_done], ['umbrella_crowd', true], ['machine_prepaid', !f.prepaid_dead]]) { const o = P(n); if (o) o.visible = v; }
    for (let i = 1; i <= 3; i++) { const o = P('toast_' + i); if (o) o.visible = (f.toast_n | 0) >= i && !f.day_done; }
    chalk(c);
    const cd = P('cupboard_door'); if (cd) cd.rotation.y = 0;
    const bl = P('bell'); if (bl) bl.userData.ring = BELL.left > 0;
    // Des: at the window with the kettle not yet on; in his chair after the tea
    const d = c.world.spawn('des', f.tea_given ? 'lodge_des_chair' : 'lodge_window');
    if (f.tea_given) d.play('sit', { h: 0.46 });
    // the six
    const r = c.world.spawn('ronan', SPOTS.ronan); r.play('sleep');
    if (f.ronan_done && f.took_textbook) bookUnder(c);
    const s = c.world.spawn('siobhan', SPOTS.siobhan);
    if (!f.siobhan_done) { s.play('reading'); notes(c, true); }
    c.world.spawn('fiachra', SPOTS.fiachra);
    const mk = c.world.spawn('mick', SPOTS.mick); if (!f.mick_done) mk.play('wave');
    if (f.nuala_done) c.world.despawn('nuala'); else c.world.spawn('nuala', SPOTS.nuala);
    const hg = c.world.spawn('hartigan', SPOTS.hartigan);
    if (hg.rig.attach.glasses) hg.rig.attach.glasses.visible = !!f.hartigan_done;
    if (!f.hartigan_done) hg.play('look_down');
    const l = actor(c, 'luka'); if (l) l.habit = 'glance';
  }
  function butteryDress(c) { if (inButtery()) c.world.spawn('bernie', 'counter_bernie'); }
  function theatreDress(c) { if (!inTheatre()) return; const g = c.world.prop('glasses'); if (g) g.visible = !has('glasses') && !state.flags.hartigan_done; }

  // ---------------------------------------------------------- Fiachra: the same three notes, over and over (positional, near the gate)
  // D E F#; then four notes each (3.1: "This week he plays four."): go up at the end; leave a gap; play it backwards
  const TUNES = [[0, 2, 4], [0, 2, 4, 7], [0, 2, null, 4, 2], [4, 2, 0, -3]];
  const semi = (n) => Math.pow(2, n / 12);
  const BUSK = { t: 1, i: 0, mute: false, on: false, o: { rate: 1, vol: 0.6, at: [-27.3, 1.5, -1.55] } };
  function busk(dt) {
    if (flow.sceneId !== '2.10') { removeUpdate(busk); BUSK.on = false; return; }
    if (BUSK.mute || !inSquare() || !world.actor('fiachra') || typeof sfx !== 'function') return;
    if ((BUSK.t -= dt) > 0) return;
    const tune = TUNES[state.flags.fiachra_done ? (state.flags.fiachra_tune | 0) + 1 : 0], n = tune[BUSK.i];
    if (n != null) { BUSK.o.rate = semi(n); sfx('whistle', BUSK.o); }
    if (++BUSK.i >= tune.length) { BUSK.i = 0; BUSK.t = 1.5; } else BUSK.t = 0.34;
  }
  function tune(c, k) {   // played twice through, for the cutscene
    const t = TUNES[k], st = [];
    for (let r = 0; r < 2; r++) { for (const n of t) st.push(n == null ? { wait: 0.34 } : { sfx: 'whistle', rate: semi(n), vol: 0.8 }, { wait: 0.34 }); st.push({ wait: 0.5 }); }
    return c.runSteps(st);
  }

  // ---------------------------------------------------------- the bell: at noon for the graduates (and once more at the end of the day)
  const BELL = { t: 0, left: 0, again: 0 };
  function desComes(c) {   // Des on his rounds, a couple of metres from the party, toward the Campanile
    const a = actor(c, state.active);
    if (!a) return;
    const dx = -a.pos.x, dz = -a.pos.z, L = Math.hypot(dx, dz) || 1, x = a.pos.x + dx / L * 1.9, z = a.pos.z + dz / L * 1.9;
    const d = c.world.spawn('des', [x, c.world.set.floor ? c.world.set.floor(x, z) : 0, z, Math.atan2(a.pos.x - x, a.pos.z - z)]);
    d.play('idle');
    a.face('des');
  }
  function desSeat(c) {   // Des in his chair (after the tea; also if he's still out on his rounds)
    const d = actor(c, 'des');
    if (!d || !inSquare() || !state.flags.tea_given) return;
    if (Math.hypot(d.pos.x + 21.72, d.pos.z - 5.3) > 0.05 || d.anim !== 'sit') { d.place('lodge_des_chair'); d.play('sit', { h: 0.46 }); }
  }
  function desGoes(c) {   // back to the lodge, then into his chair
    const d = actor(c, 'des');
    if (!d) return;
    d.moveTo([-19.6, 0, 0.6]).then(() => { if (flow.sceneId === '2.10' && inSquare() && actor(c, 'des')) { d.place('lodge_des_chair'); d.play('sit', { h: 0.46 }); } });
  }
  const ring = (on) => ({ prop: 'bell', fn: (o) => { o.userData.ring = on; } });
  const BELL_SPOT = { id: 'bell_noon', steps: [
    { flag: 'bell_rung' },
    { do: desComes },
    // the Campanile rings for a graduation (looking up from under it)
    { shot: 'INSERT', at: 'bell_low' },
    ring(true), { sfx: 'bell' },
    { do: () => { BELL.left = 16; BELL.again = 5; } },
    { wait: 2.2 },
    { shot: 'CLOSE', on: 'des' },
    say('des', "That's the bell for the graduates. Mind you're not under it."),
    { do: (c) => { desGoes(c); if (state.active !== 'chase' && c.inventory.has('recorder') && !state.samples.includes('bell')) c.ui.toast(swapText()); } },
  ] };
  function bellWatch(dt) {
    if (flow.sceneId !== '2.10') { removeUpdate(bellWatch); return; }
    if (BELL.again > 0 && (BELL.again -= dt) <= 0 && typeof sfx === 'function') sfx('bell');
    if (BELL.left > 0 && (BELL.left -= dt) <= 0) { const b = world.prop('bell'); if (b && inSquare()) b.userData.ring = false; }
    if (state.flags.bell_rung || !flow.roaming || flow.busy || flow.cutscene || !inSquare() || !state.flags.tea_given) return;
    const a = world.actor(state.active);
    if (!a || a.pos.x < -19.5) return;   // out in the square, not in the lodge or the gate passage
    BELL.t += dt;
    if (newNames() >= 2 || BELL.t > 240) { state.flags.bell_rung = true; hotspots.trigger(BELL_SPOT); }
  }
  // the evening ring: hold YES to record it (Chase's recorder), like the reverse-charge trill in 2.7
  async function recordBell(c, secs) {
    const can = c.inventory.has('recorder') && !state.samples.includes('bell'), t0 = clock.t;
    let held = -1, got = !can;
    if (can) c.ui.prompt('YES — Hold to record');
    await waitUntil(() => {
      if (c.flow.skipping) return true;
      if (!got) {
        if (TEST.auto || input.held('yes')) {
          if (held < 0) { held = clock.t; c.ui.prompt('YES — Recording…'); c.sfx('dictaphone'); }
          if (clock.t - held >= 1) { got = true; c.ui.prompt(null); c.runSteps([{ sample: 'bell' }]); }
        } else if (held >= 0) { held = -1; c.ui.prompt('YES — Hold to record'); }
      }
      const t = clock.t - t0;
      return (t >= secs && held < 0) || t >= secs + 2;
    });
    input.consume('yes');
    c.ui.prompt(null);
  }

  // ---------------------------------------------------------- the side stories
  const RONAN = [
    { place: 'luka', at: [21.95, 0, 0.6, 0.5] }, { place: 'chase', at: [21.2, 0, 0.25, 0.9] },
    { shot: 'CAM', pos: [20.3, 1.45, 3.1], look: [22.2, 0.8, 1.2], fov: 46 },   // under the arches: Ronan asleep on the bench
    { wait: 0.5 },
    { if: (s) => !!s.flags.took_textbook,
      then: [{ act: [['luka', 'give', { dur: 1.2 }]] }, { wait: 0.7 }, { do: bookUnder }, { sfx: 'thud', vol: 0.15 }, { wait: 0.6 }],
      else: [{ act: [['luka', 'give', { dur: 1.2 }]] }, { wait: 0.9 }, { expr: [['ronan', 'sad']] }, { wait: 0.4 }] },
    { shot: 'CAM', pos: [21.65, 0.95, 2.1], look: [22.37, 0.6, 1.29], fov: 38 },
    { expr: [['ronan', 'sad']] },
    say('ronan', 'Ronan. …Thanks.', { tag: 'half asleep', speed: 'slow' }),
    { expr: [['ronan', 'sleep']] },
    { name: 'Ronan' },
    { wait: 1.0 },
  ];

  const SIOBHAN = [
    { place: 'luka', at: [1.68, 0, -11.74, 0.3 + PI] }, { place: 'chase', at: [2.75, 0, -11.55, -2.2] },
    { face: 'siobhan', to: 'luka' }, { act: [['siobhan', 'idle']] }, { expr: [['siobhan', 'worried']] },
    { shot: 'MID', on: 'siobhan', side: 'ots:luka' },
    say('siobhan', "Rue won't lend me his notes. The exam's all about \"the customer journey\" and I don't know what that is."),
    { do: (c) => c.flow.minigame('journey', {}) },
    { expr: [['siobhan', 'laugh']] },
    { shot: 'CLOSE', on: 'siobhan' },
    say('siobhan', "…That's the whole module. That's the whole module! I'm Siobhán."),
    { name: 'Siobhán' },
    // She hugs Luka. He doesn't know what to do with his hands.
    { place: 'luka', at: [1.53, 0, -12.17, 0.3 + PI] },
    { act: [['siobhan', 'hug'], ['luka', 'hug']] }, { expr: [['luka', 'stunned']] },
    { shot: 'CAM', pos: [-0.35, 1.5, -11.84], look: [1.47, 1.35, -12.39], fov: 42 },   // TWO, in profile
    { wait: 2.6 },
    { act: [['siobhan', 'idle'], ['luka', 'idle']] }, { expr: [['siobhan', 'neutral'], ['luka', 'neutral']] },
    { do: (c) => notes(c, false) },
    { place: 'luka', at: [1.68, 0, -11.74, 0.3 + PI] },
  ];

  const FIACHRA = [
    { place: 'chase', at: [-26.74, 0, -0.72, 0.6 + PI] }, { place: 'luka', at: [-25.7, 0, -0.35, -1.9] },
    { face: 'fiachra', to: 'chase' },
    { do: () => { BUSK.mute = true; } },
    { shot: 'CAM', pos: [-28.7, 1.6, 0.0], look: [-27.0, 1.45, -1.13], fov: 45 },   // TWO, in profile down the gate passage
    { expr: [['chase', 'determined']] },
    say('chase', 'Okay okay okay. Hear me out.'),
    { choice: ['Go up at the end', 'Leave a gap', 'Play it backwards'], flag: 'fiachra_tune' },
    { expr: [['chase', 'neutral']] },
    { shot: 'MID', on: 'fiachra' },
    { do: (c) => tune(c, (state.flags.fiachra_tune | 0) + 1) },
    { shot: 'CLOSE', on: 'fiachra' },
    { act: [['fiachra', 'shrug']] },
    say('fiachra', "…Where'd you learn that?"),
    { shot: 'CLOSE', on: 'chase' },
    say('chase', 'Long story.'),
    { shot: 'CLOSE', on: 'fiachra' },
    { act: [['fiachra', 'nod']] },
    say('fiachra', 'Fiachra. Record it if you like.'),
    { name: 'Fiachra' },
    { flag: 'fiachra_done' },
    { do: () => { BUSK.mute = false; BUSK.i = 0; BUSK.t = 0.8; } },
  ];

  const MICK_TALK = [   // before: the war, without a word
    { face: 'mick', to: 'luka' }, { act: [['mick', 'shrug']] }, { wait: 1.2 },
    { face: 'mick', to: [12, 4.5] }, { act: [['mick', 'wave']] }, { sfx: 'pigeons', vol: 0.5 }, { wait: 1.0 },
    { shot: 'CAM', pos: [11.5, 3.2, 5.5], look: [16.5, 0.2, -8.5], fov: 45 }, { wait: 1.6 },   // the three marked spots, off to the far corner
  ];
  const lay = (n) => [
    { do: (c) => { const a = actor(c, state.active); if (a) a.face('toast_' + n); } }, { wait: 0.3 },
    { do: (c) => { const a = actor(c, state.active); if (a) a.play('duck'); } }, { wait: 0.6 },
    { prop: 'toast_' + n, visible: true }, { sfx: 'pop', vol: 0.3 },
    { flag: 'toast_n', value: n }, { do: chalk },
    { wait: 0.4 },
    { do: (c) => { const a = actor(c, state.active); if (a) a.play('idle'); } },
  ];
  const MICK = [   // after the third piece: the pigeons follow the trail to the far corner
    { item: 'toast', remove: true },
    { act: [['mick', 'idle']] },
    { shot: 'CAM', pos: [11.5, 3.2, 5.5], look: [16.5, 0.2, -8.5], fov: 45 },
    { face: 'mick', to: 'far_corner', dur: 0.8 },
    { sfx: 'pigeons', vol: 0.5 },
    { wait: 3.2 },
    { place: 'luka', at: [11.55, 0, 5.1, -0.5] }, { place: 'chase', at: [12.35, 0, 5.75, -1.3] },
    { face: 'mick', to: 'luka' },
    { shot: 'CLOSE', on: 'mick' },
    say('mick', 'Genius.'),
    { shot: 'TWO', on: ['chase', 'luka'] },
    say('chase', 'I get that a lot.'),
    { do: glance },
    say('luka', 'You get that once.'),
    { shot: 'CLOSE', on: 'mick' },
    say('mick', 'Mick.'),
    { name: 'Mick' },
    { flag: 'mick_done' },
  ];

  const NUALA_TALK = [   // before: locked out, knocking on the library door
    { face: 'nuala', to: H }, { act: [['nuala', 'knock']] }, { sfx: 'knock' }, { wait: 1.3 },
    { face: 'nuala', to: 'luka' }, { act: [['nuala', 'shrug']] }, { wait: 1.0 },
  ];
  const NUALA = [
    { place: 'luka', at: [21.45, 0, -5.0, H] }, { place: 'chase', at: [20.85, 0, -4.2, 2.0] },
    { face: 'nuala', to: 'luka' },
    { act: [['luka', 'give', { dur: 1.2 }]] }, { wait: 0.7 },
    { item: 'key_brass', remove: true },
    { shot: 'CLOSE', on: 'nuala' },
    say('nuala', "Nuala. You're very kind, for Australians."),
    { name: 'Nuala' },
    { shot: 'CLOSE', on: 'luka' },
    { face: 'nuala', to: H }, { sfx: 'clunk', vol: 0.5 }, { wait: 0.4 }, { sfx: 'creak' },
    { despawn: 'nuala' },
    { wait: 0.8 },
    { flag: 'nuala_done' },
  ];

  const HARTIGAN_TALK = [   // before: searching the cobbles
    { face: 'hartigan', to: 'luka' }, { act: [['hartigan', 'idle']] }, { wait: 0.7 },
    { act: [['hartigan', 'shrug']] }, { wait: 1.2 }, { act: [['hartigan', 'look_down']] },
  ];
  const HARTIGAN = [
    { do: (c) => { const g = actor(c, 'hartigan'); if (!g) return; c.world.actor('luka').place([g.pos.x + 0.95, 0, g.pos.z + 0.35, -1.9]); } },
    { face: 'hartigan', to: 'luka' }, { act: [['hartigan', 'idle']] },
    { act: [['luka', 'give', { dur: 1.2 }]] }, { wait: 0.7 },
    { item: 'glasses', remove: true },
    { do: (c) => { const g = actor(c, 'hartigan'); if (g && g.rig.attach.glasses) g.rig.attach.glasses.visible = true; } },
    { shot: 'CLOSE', on: 'hartigan' },
    say('hartigan', "Hartigan. Professor. Don't make a habit of being helpful; people will expect it."),
    { name: 'Hartigan' },
    { flag: 'hartigan_done' },
  ];

  // End the day: at the lodge, with at least four new names in the notebook
  async function dayEnd(c) {
    if (!(await c.ask('Call it a day?'))) return;
    if (newNames() < 4) { await c.say('luka', 'A few more names first.'); return; }
    state.flags.day_done = true;
  }

  // ---------------------------------------------------------- 2.10
  SCENES['2.10'] = {
    title: "Nobody's Nobody", set: 'lab', env: 'night', time: 'Fri 16 Oct 1987',
    playable: ['luka', 'chase'], swap: false, hud: { battery: 1, bars: 3 }, music: null,
    spawn: { luka: 'bike_rig', declan: 'declan_bench' },
    hotspots: [
      // --- the lodge: tea for Des, the kettle, the key board, the end of the day
      { id: 'kettle_tea', at: 'kettle', r: 0.9, verb: 'Use', kettle: true, when: (s) => inSquare() && !s.flags.tea_made,
        do: async (c) => {
          const i = await c.choose(['Make two cups', 'Make one cup'], { disabled: [1] });
          if (i !== 0) return;
          carry(c, true); state.flags.tea_made = true;
        } },
      { id: 'kettle', at: 'kettle', r: 0.9, verb: 'Use', kettle: true, only: 'luka', when: (s) => inSquare() && !!s.flags.tea_made },
      { id: 'kettle_c', at: 'kettle', r: 0.9, verb: 'Use', kettle: true, only: 'chase', sample: 'kettle', when: (s) => inSquare() && !!s.flags.tea_made },   // (Chase records)
      { id: 'des_tea', at: 'des', r: 1.3, verb: 'Give tea', once: true, flag: 'tea_given', when: (s) => inSquare() && !!s.flags.tea_made && !s.flags.tea_given, do: () => {} },
      { id: 'des_day', at: 'des', r: 1.3, verb: 'Call it a day', when: (s) => inSquare() && !!s.flags.tea_given && !s.flags.day_done, do: async (c) => { desSeat(c); await dayEnd(c); } },
      { id: 'key_board', at: [-22.52, 0.46, 2.75], r: 0.65, verb: 'Take key', when: (s) => inSquare() && !!s.flags.met_nuala && !s.flags.nuala_done && !has('key_brass'),
        steps: [
          { do: desSeat },
          { face: 'des', to: 'luka' },
          { shot: 'CAM', pos: [-22.25, 2.05, 4.0], look: [-21.75, 1.9, 5.3], fov: 42 },
          say('des', "Third row, the big brass one. Don't tell anyone I told you."),
          { shot: 'INSERT', at: 'key_board' }, { wait: 0.6 },
          { prop: 'key_brass', visible: false }, { sfx: 'tick' }, { item: 'key_brass' }, { wait: 0.6 },
        ] },
      { id: 'key_board_look', at: [-22.52, 0.46, 2.75], r: 0.65, when: (s) => inSquare() && !(s.flags.met_nuala && !s.flags.nuala_done && !has('key_brass')),
        text: 'Every key in the college. Des knows which is which. Des knows everything.' },
      { id: 'lodge_exit', at: [-21.3, 0.46, 2.7], r: 0.5, verb: 'Open', when: out, door: { to: [-20.8, 0, 0.1, H], kind: 'wood' } },
      { id: 'lodge_exit_tea', at: [-21.3, 0.46, 2.7], r: 0.5, verb: 'Open', when: (s) => inSquare() && !s.flags.tea_given, text: 'Tea first.' },
      { id: 'lodge_in', at: 'lodge_out', r: 0.7, verb: 'Open', when: inSquare, door: { to: [-21.3, 0.46, 3.4, 0], kind: 'wood' }, do: desSeat },
      // --- Front Square: the six
      { id: 'ronan', at: 'ronan', r: 1.4, verb: 'Wake him', once: true, flag: 'ronan_done', when: (s) => out(s) && !s.flags.took_textbook, steps: RONAN },
      { id: 'ronan_book', at: 'ronan', r: 1.4, verb: 'Give his book back', once: true, flag: 'ronan_done', when: (s) => out(s) && !!s.flags.took_textbook, steps: RONAN },
      { id: 'siobhan', at: 'siobhan', r: 1.4, verb: 'Talk', once: true, flag: 'siobhan_done', when: out, steps: SIOBHAN },
      { id: 'fiachra', at: 'fiachra', r: 1.5, verb: 'Talk', only: 'chase', once: true, flag: 'fiachra_done', when: out, steps: FIACHRA },
      { id: 'fiachra_luka', at: 'fiachra', r: 1.5, verb: 'Talk', only: 'luka', when: (s) => out(s) && !s.flags.fiachra_done,
        steps: [{ face: 'fiachra', to: 'luka' }, { wait: 0.8 }, { do: glance }, { wait: 0.9 }, { do: (c) => c.ui.toast(swapText()) }] },
      { id: 'fiachra_rec', at: 'fiachra', r: 1.8, only: 'chase', sample: 'whistle', when: (s) => inSquare() && !!s.flags.fiachra_done },
      { id: 'mick', at: 'mick', r: 1.5, verb: 'Talk', flag: 'met_mick', when: (s) => out(s) && !s.flags.mick_done && !(s.flags.toast_n > 0), steps: MICK_TALK },
      { id: 'toast_1', at: 'toast_1', r: 1.1, verb: 'Lay toast', when: (s) => inSquare() && has('toast') && !(s.flags.toast_n > 0), steps: lay(1) },
      { id: 'toast_2', at: 'toast_2', r: 1.1, verb: 'Lay toast', when: (s) => inSquare() && has('toast') && s.flags.toast_n === 1, steps: lay(2) },
      { id: 'toast_3', at: 'toast_3', r: 1.1, verb: 'Lay toast', when: (s) => inSquare() && has('toast') && s.flags.toast_n === 2, steps: [...lay(3), ...MICK] },
      { id: 'nuala', at: 'nuala', r: 1.4, verb: 'Talk', flag: 'met_nuala', when: (s) => out(s) && !has('key_brass') && !s.flags.nuala_done, steps: NUALA_TALK },
      { id: 'nuala_key', at: 'nuala', r: 1.4, verb: 'Give key', when: () => inSquare() && has('key_brass'), steps: NUALA },
      { id: 'hartigan', at: 'hartigan', r: 1.4, verb: 'Talk', flag: 'met_hartigan', when: (s) => out(s) && !has('glasses') && !s.flags.hartigan_done, steps: HARTIGAN_TALK },
      { id: 'hartigan_glasses', at: 'hartigan', r: 1.4, verb: 'Give glasses', when: () => inSquare() && has('glasses'), steps: HARTIGAN },
      { id: 'bell_rec', at: [0, 0, 0], r: 14, only: 'chase', sample: 'bell', when: () => inSquare() && BELL.left > 0 },
      { id: 'gutter', at: 'gutter', r: 1.4, only: 'chase', sample: 'rain', when: out },
      // --- doors: the Buttery (toast), the Arts Building (the lecture theatre)
      { id: 'buttery_in', at: 'buttery_door', r: 1.1, verb: 'Go in', when: out, door: { to: { set: 'buttery', mark: 'door_in' }, kind: 'wood' }, do: (c) => { butteryDress(c); c.music('buttery_radio', { fade: 1 }); } },
      { id: 'buttery_out', at: [-7.65, 1.3, 0], r: 0.9, verb: 'Go out', when: inButtery,
        door: { to: { set: 'square', mark: [7.27, 0, 12.9, PI], env: 'rain' }, kind: 'wood' }, do: (c) => { squareDress(c); c.music('dublin', { fade: 2 }); } },
      { id: 'arts_in', at: 'arts_door', r: 1.1, verb: 'Go in', when: out, door: { to: { set: 'theatre', mark: [0, 5.7, 14.2, PI], env: 'day' }, kind: 'wood' }, do: theatreDress },
      { id: 'theatre_out', at: [0, 5.7, 15.1], r: 0.55, verb: 'Go out', when: inTheatre,
        door: { to: { set: 'square', mark: [0, 0, -12.9, 0], env: 'rain' }, kind: 'wood' }, do: squareDress },
      // --- the Buttery: toast from Bernie
      { id: 'bernie_toast', at: 'bernie', r: 1.8, verb: 'Ask for toast', when: (s) => inButtery() && !has('toast') && !s.flags.mick_done && !(s.flags.toast_n > 0),
        steps: [{ face: 'bernie', to: 'luka' }, say('bernie', 'More toast? Is this a lifestyle?'), { act: [['bernie', 'give']] }, { wait: 0.6 }, { item: 'toast' }] },
      { id: 'bernie_talk', at: 'bernie', r: 1.8, verb: 'Talk', by: 'bernie', when: (s) => inButtery() && (has('toast') || !!s.flags.mick_done || s.flags.toast_n > 0),
        text: ["Go on. Pay me when you're back from wherever you're from."] },
      { id: 'till', at: 'till', r: 1.3, only: 'chase', sample: 'till', when: inButtery },
      { id: 'urn', at: 'urn', r: 1.1, verb: 'Use', text: 'Close enough.', kettle: true, when: inButtery },
      // --- the lecture theatre: Hartigan's glasses, under the bench since 2.3
      { id: 'glasses', at: 'glasses_floor', r: 1.2, verb: 'Take', once: true, when: (s) => inTheatre() && !has('glasses') && !s.flags.hartigan_done,
        steps: [{ shot: 'CAM', pos: [1.2, 3.1, 6.35], look: [1.45, 2.68, 6.72], fov: 28 }, { wait: 1.0 }, { prop: 'glasses', visible: false }, { sfx: 'tick' }, { item: 'glasses' }, { wait: 0.5 }] },
    ],
    steps: [
      ['do', (c) => { resetDay(); carry(c, false); c.world.preload('square'); }],
      ['cutscene', '2.10_pedal'],
      ['cutscene', '2.10_lodge'],
      ['control', 'luka'], ['follow', 'chase'],
      ['do', () => { if (!BUSK.on) { BUSK.on = true; addUpdate(busk); } }],
      ['objective', 'Take Des a cup of tea.'],
      ['roam', { until: 'tea_given', async auto(c) { await c.hotspots.trigger('kettle_tea'); await c.hotspots.trigger('des_tea'); } }],
      ['cutscene', '2.10_des'],
      ['objective', "Learn everyone's name."],
      ['swap', true],
      ['do', () => { removeUpdate(bellWatch); addUpdate(bellWatch); }],
      ['roam', {
        until: 'day_done',
        hint: { after: 150, steps: [{ do: fillNB }, { shot: 'INSERT', at: 'luka', card: ['list', NB] }, { wait: 3 }] },   // Luka's notebook: who still needs help
        async auto(c) {
          const T = (id) => c.hotspots.trigger(id);
          for (const id of ['ronan', 'ronan_book', 'siobhan', 'fiachra']) if (id !== (state.flags.took_textbook ? 'ronan' : 'ronan_book')) await T(id);
          await c.runSteps([{ sample: 'whistle' }]);
          for (const id of ['buttery_in', 'bernie_toast', 'till', 'buttery_out', 'mick', 'toast_1', 'toast_2', 'toast_3']) await T(id);
          await T(BELL_SPOT); await c.runSteps([{ sample: 'bell' }]);
          for (const id of ['nuala', 'lodge_in', 'key_board', 'lodge_exit', 'nuala_key', 'arts_in', 'glasses', 'theatre_out', 'hartigan', 'hartigan_glasses', 'lodge_in', 'des_day']) await T(id);
        },
      }],
      ['objective', null],
      ['cutscene', '2.10_morning'],
    ],
    grants: { flags: { tea_given: true, day_done: true }, names: ['Des', 'Bernie', 'Declan', 'Ronan', 'Siobhán', 'Fiachra', 'Mick'], items: ['notebook'], battery: 3, bars: 3 },
  };

  // [TIME-LAPSE · the lab, early mornings] Luka pedals before breakfast, two mornings running. HUD: 1% → 3%.
  // (The locked wide from the 2.6 time-lapse; dark, dawn, dark, dawn. Declan asleep at his bench; the lads never leave.)
  const TL = { shot: 'CAM', pos: [7.4, 2.9, 8.0], look: [-0.2, 0.9, 12.8], fov: 58 };
  const onBike = (on) => ({ do: (c) => { const l = actor(c, 'luka'); if (!l) return; l.visible = on; if (on) { l.place('bike_rig'); l.play('pedal', { speed: 0.9 }); } } });
  CUTSCENES['2.10_pedal'] = [
    { fade: 'out', dur: 0 },
    { act: [['declan', 'sit', { h: 0.48 }]] }, { wait: 0.1 }, { act: [['declan', 'sleep']] },
    onBike(true),
    { hud: { battery: 1, bars: 3 } },
    TL,
    { fade: 'in', dur: 0.8 },
    { loop: 'dynamo', vol: 0.25 },
    { timelapse: { dur: 12, cycles: 1.5, from: 'night', to: 'day', keys: [
      { t: 4.2, steps: [{ hud: { battery: 2, bars: 3 } }] },
      { t: 6.2, steps: [onBike(false), { loop: 'dynamo', stop: true }] },
      { t: 9.0, steps: [onBike(true), { loop: 'dynamo', vol: 0.25 }] },
      { t: 11.6, steps: [{ hud: { battery: 3, bars: 3 } }] },
    ] } },
    { hud: { battery: 3, bars: 3 } },
    { wait: 0.8 },
    { fade: 'out', dur: 0.7 },
    { loop: 'dynamo', stop: true },
  ];

  // FLASHBACK stills missing? (2.1/2.3/2.5 keep them in memory only: gone after Continue or a reload, never taken if skipped.)
  // Re-stage each moment under the black at the top of the day and snap it, so 2.10_des shows three places, not one shot three times.
  const MEM = ['glance_lodge', 'glance_theatre', 'glance_step'];
  const snapMem = (n) => ({ do: () => { if (MINIGAMES.final_yes && MINIGAMES.final_yes.snap) MINIGAMES.final_yes.snap(n); } });
  const unsit = (...ids) => ({ do: (c) => { for (const id of ids) { const a = actor(c, id); if (a) { a.rig.seated = false; a.play('idle'); } } } });
  const Y6 = 2.66, Z6 = 6.0;   // 2.3's row in the lecture theatre
  const RESTAGE = [
    { if: () => !still('glance_lodge'), then: [   // 2.1 · CLOSE · Luka, before "…Can we make it back?"
      { place: 'luka', at: [-22.05, 0.46, 5.95, 1.35] }, { place: 'chase', at: [-22.05, 0.46, 5.0, 1.8] }, { place: 'des', at: [-21.2, 0.46, 6.55, PI] },
      { shot: 'CLOSE', on: 'luka' }, { wait: 0.1 }, { do: glance }, { wait: 0.45 }, snapMem('glance_lodge'),
    ] },
    { if: () => !still('glance_step'), then: [   // 2.5 · the long lens across Front Square: the two of them tiny on the lodge step
      { place: 'luka', at: 'lodge_step_luka' }, { place: 'chase', at: 'lodge_step_chase' },
      { act: [['luka', 'sit', { h: 0.23 }], ['chase', 'sit', { h: 0.23 }]] },
      { place: 'des', at: [-22.2, 0.46, 5.7, -1.4] }, { act: [['des', 'pour']] },
      { prop: 'umbrella_crowd', visible: false },
      { shot: 'CAM', pos: [18, 1.7, 12.5], look: [-21.1, 1.4, 2.6], fov: 12 },
      { wait: 0.1 }, { act: [['luka', 'lanyard'], ['chase', 'head_hands']] }, { wait: 0.1 },
      { do: glance }, { wait: 0.45 }, snapMem('glance_step'),
      unsit('luka', 'chase', 'des'),
    ] },
    { if: () => !still('glance_theatre'), then: [   // 2.3 · the knee-height track along the row: Luka glances back for Chase
      { set: 'theatre', env: 'day', spawn: { luka: [1.1, Y6, Z6 + 0.45, -H], chase: [1.9, Y6, Z6 + 0.45, -H] } },
      { prop: 'crowd', visible: true },
      { shot: 'CAM', pos: [-0.5, Y6 + 0.6, Z6 + 0.3], look: [1.4, Y6 + 1.5, Z6 + 0.5], fov: 55 },
      { wait: 0.1 }, { do: glance }, { wait: 0.45 }, snapMem('glance_theatre'),
      { prop: 'crowd', visible: false },
      { set: 'square', env: 'rain', spawn: { luka: 'lodge_luka', chase: 'lodge_chase' } },
    ] },
    { place: 'luka', at: 'lodge_luka' }, { place: 'chase', at: 'lodge_chase' },
    { do: squareDress },
  ];

  // The lodge, in the rain: seen from across the square, then in.
  CUTSCENES['2.10_lodge'] = [
    { set: 'square', env: 'rain', spawn: { luka: 'lodge_luka', chase: 'lodge_chase' } },
    { do: squareDress },
    { if: () => MEM.some((n) => !still(n)), then: RESTAGE },
    { shot: 'INSERT', at: 'lodge_window_out' },
    { fade: 'in', dur: 0.8 },
    { music: 'dublin', fade: 3 },
    { wait: 2.4 },
    { shot: 'MID', on: 'luka' },
    { wait: 0.6 },
  ];

  // Tea for Des.
  CUTSCENES['2.10_des'] = [
    { place: 'des', at: [-20.95, 0.46, 6.5, H] }, { act: [['des', 'idle']] },
    { place: 'chase', at: [-23.55, 0.46, 4.9, 0.9] },
    { place: 'luka', at: [-22.85, 0.46, 6.2, H] },
    { do: (c) => carry(c, true) },
    // [MID · Des at the window] Luka comes in with two teas. For once, he's the one bringing them.
    { shot: 'CAM', pos: [-22.3, 2.05, 7.05], look: [-20.95, 1.85, 6.3], fov: 46 },
    { move: 'luka', to: [-21.7, 0.46, 5.85, 0.7] },
    { face: 'des', to: 'luka', dur: 0.6 }, { wait: 0.5 },
    { act: [['luka', 'give', { dur: 1.2 }]] }, { wait: 0.5 },
    { do: (c) => { if (MUG2 && MUG2.parent) MUG2.parent.remove(MUG2); const l = actor(c, 'luka'); if (l) l.walkAnim = 'walk'; } },
    mug('des', true), mug('luka', true),
    { wait: 0.6 },
    say('luka', 'I never asked. What\'s your name?'),
    // [CLOSE · Des, a look]
    { shot: 'CLOSE', on: 'des' },
    { wait: 0.8 },
    slow('des', 'Des.'),
    { name: 'Des' },
    say('luka', 'Luka.'),
    // [TWO-SHOT · the handshake, centre frame]
    { shot: 'TWO', on: ['luka', 'des'] },
    { act: [['luka', 'give', { dur: 1.6 }], ['des', 'give', { dur: 1.6 }]] },
    { wait: 1.2 },
    slow('des', 'Nobody\'s asked me my name in twenty years, Luka. I\'m "the porter". I\'m "you there". I\'m "excuse me".'),
    say('luka', "That's rubbish."),
    say('des', "It's a job. ^ You're a manager of some kind."),
    { do: glance },
    say('luka', "2IC. Second in charge. How'd you know?"),
    slow('des', "You count heads. Every room you walk into. Checking your young fella's all right."),
    // [FLASHBACK INSERTS · quick] Three moments the camera caught without comment: Luka glancing at Chase in the lodge,
    // in the lecture theatre, on the lodge step. (Re-staged and snapped in 2.10_lodge when missing; this fallback only if a snap failed.)
    ...MEM.flatMap((n) => [{ if: () => !!still(n),
      then: [{ shot: 'CLOSE', on: 'luka', card: ['memory', { name: n }] }, { wait: 1.0 }],
      else: [{ shot: 'CLOSE', on: 'luka' }, { do: glance }, { wait: 1.1 }] }]),
    { shot: 'CLOSE', on: 'luka', locked: true, height: 0.3 },   // (from slightly above: he doubts himself)
    { expr: [['luka', 'worried']] },
    slow('luka', "I'm not very good at it."),
    // [CLOSE · Des tapping his porter's cap]
    { shot: 'CLOSE', on: 'des', locked: true },
    { act: [['des', 'cap_tap', { dur: 1.3, loop: false }]] }, { wait: 1.3 },
    slow('des', "The job's not the hat, son. It's who you look after."),
    // [TWO-SHOT · both at the window, eye level, still]
    { expr: [['luka', 'neutral']] },
    { place: 'luka', at: [-21.6, 0.46, 6.0, 1.2] }, { place: 'des', at: [-20.9, 0.46, 6.55, 2.4] },
    { act: [['des', 'drink']] },
    { shot: 'CAM', pos: [-20.75, 2.05, 4.75], look: [-21.3, 1.9, 6.4], fov: 52 },
    say('luka', 'When we landed. You said yes. To the call.'),
    say('des', "Did I? Must be habit. ^ There's no word for yes in Irish, you know."),
    say('luka', 'Seriously?'),
    { act: [['des', 'idle']] }, { face: 'des', to: 'luka', dur: 0.8 },
    slow('des', 'No yes, no no. You answer with what you\'ll do. "Will you mind the lodge?" "I will." "Are you coming?" "I am." Yes is just a noise, Luka. "I will" is a promise.'),
    { wait: 1.2 },
    // Luka's notebook opens, with Des, Bernie and Declan already in it.
    { do: () => { for (const n of ['Bernie', 'Declan']) if (!state.names.includes(n)) state.names.push(n); } },
    { item: 'notebook' },
    { do: fillNB },
    { shot: 'INSERT', at: 'luka', card: ['list', NB] },
    { wait: 3.2 },
    { do: (c) => carry(c, false) }, mug('des', false),
    { place: 'des', at: 'lodge_des_chair' }, { act: [['des', 'sit', { h: 0.46 }]] },
    { place: 'luka', at: [-22.3, 0.46, 5.4, -2.4] }, { place: 'chase', at: [-23.1, 0.46, 5.9, -2.4] },
    { shot: 'SET', cam: 'lodge_desk' },
  ];

  // End of the day, and the next morning.
  const GREET = { bernie: 'Bernie', declan: 'Declan', fiachra: 'Fiachra', siobhan: 'Siobhán', mick: 'Mick', nuala: 'Nuala', hartigan: 'Hartigan', ronan: 'Ronan' };
  const STATION_X = [-13.4, -10.4, -7.4, -4.6], PATH_Z = 6.8, RUE_Z = 6.0, SPEED = 1.25, END_X = 10.0, AHEAD = 1.1;
  let greeted = [];
  function morning(c) {
    c.world.env('rain', 0);
    BUSK.mute = true; BELL.left = 0; BELL.again = 0;
    const P = (n) => c.world.prop(n), bl = P('bell'); if (bl) bl.userData.ring = false;
    for (let i = 1; i <= 3; i++) { const o = P('toast_' + i); if (o) o.visible = false; }
    notes(c, false); noBook(); chalk(c);
    const cr = P('umbrella_crowd'); if (cr) cr.visible = false;
    for (const id of ['chase', 'ronan', 'siobhan', 'fiachra', 'mick', 'nuala', 'hartigan']) c.world.despawn(id);
    // who Luka greets: Bernie, Declan, the busker, the classmate who wanted Rue's notes (whoever the player met)
    greeted = ['bernie', 'declan'];
    for (const id of ['fiachra', 'siobhan', 'mick', 'nuala', 'hartigan', 'ronan']) if (greeted.length < 4 && state.names.includes(GREET[id])) greeted.push(id);
    greeted.forEach((id, i) => { const a = c.world.spawn(id, [STATION_X[i], 0, 5.5, i % 2 ? 2.4 : -2.6]); if (id === 'ronan') a.play('idle'); });
    const d = c.world.spawn('des', 'lodge_des_chair'); d.play('sit', { h: 0.46 });
    const l = c.world.spawn('luka', [-17.6, 0, PATH_Z, H]); l.habit = null; l.play('idle');
    state.active = 'luka'; c.player.control('luka'); c.player.follower(null); c.flow.follow = null;
  }
  const waitX = (x) => waitUntil(() => { const l = world.actor('luka'); return !l || l.pos.x >= x || flow.skipping; });
  async function greetings(c) {
    const l = actor(c, 'luka');
    l.moveTo([END_X, 0, PATH_Z, H], { speed: SPEED });
    for (let i = 0; i < greeted.length; i++) {
      const id = greeted[i];
      await waitX(STATION_X[i] - 1.9);
      const a = actor(c, id); if (!a) continue;
      a.face('luka', 0.5);
      a.play(id === 'declan' ? 'nod' : 'wave', { dur: 1.3, loop: false });
      a.setExpr('talk');
      await c.say('luka', 'Morning, ' + GREET[id] + '.', { auto: 0.5 });
      a.face('luka', 0.4);
    }
  }
  // Rue, from the frame-left edge: faster than Luka until he's in step on the far side, a pace ahead across a gap (visual rule 2)
  async function rueJoins(c) {
    const l = actor(c, 'luka');
    await waitX(-4.2);
    const x0 = l.pos.x, r = c.world.spawn('rue19', [x0 - 2.6, 0, RUE_Z, H]);
    r.setExpr('smug');
    const tJoin = 3.0, xj = x0 + SPEED * tJoin + AHEAD;
    await r.moveTo([xj, 0, RUE_Z], { speed: (xj - (x0 - 2.6)) / tJoin });
    r.moveTo([END_X + AHEAD, 0, RUE_Z, H], { speed: SPEED });
  }
  // (locked, from the east: the Campanile centred with the Front Gate beyond; the pair at the left edge walk out north)
  const WIDE = { shot: 'CAM', pos: [14.5, 1.8, 1.0], look: [0, 4.8, 0], fov: 50 };
  CUTSCENES['2.10_morning'] = [
    { do: (c) => { const l = actor(c, 'luka'); if (l) l.habit = null; } },
    // the bell once more as the day ends, if Chase missed it at noon
    { if: (s) => !s.samples.includes('bell'), then: [
      { env: 'dusk', dur: 1.5 },
      { shot: 'CAM', pos: [-14, 1.6, -9], look: [0, 7, 0], fov: 45 },
      { wait: 1.2 },
      ring(true), { sfx: 'bell' },
      { do: (c) => recordBell(c, 5) },
      ring(false),
    ] },
    { fade: 'out', dur: 1.0 },
    { music: null, fade: 1.5 },
    { do: morning },
    // [TRACK · alongside Luka, just below eye level] Crossing Front Square, he greets people by name, and each one turns into the
    // frame to answer. Rue falls into step from the edge of frame.
    // (Luka a little left of centre, room ahead of him for the people he greets and for Rue, who ends up frame right)
    { shot: 'MID', on: 'luka', move: 'track', track: 'alongside', side: 'right', height: -0.12, dist: 1.7, offset: 0.5, dur: 60 },
    { fade: 'in', dur: 0.8 },
    { music: 'dublin', fade: 2 },
    { do: greetings },
    { do: rueJoins },
    // (still walking, still the same track)
    say('rue19', 'Why do you keep asking people their names?'),
    say('luka', 'Habit. Retail. You learn names.'),
    say('rue19', "They're nobody."),
    slow('luka', "Nobody's nobody, mate."),
    // [WIDE · locked, the square, the Campanile centred] Rue scoffs and walks out of shot. The camera stays on the empty square.
    { do: (c) => { for (const id of greeted) c.world.despawn(id); } },
    { place: 'luka', at: [5.0, 0, PATH_Z, H] }, { place: 'rue19', at: [5.0 + AHEAD, 0, RUE_Z - 0.8, H] },   // (a gap between them in this frame too)
    WIDE,
    { act: [['rue19', 'shrug']] }, { expr: [['rue19', 'smug']] },
    { wait: 1.0 },
    { move: 'rue19', to: [7.4, 0, 13.4], nowait: true },
    { wait: 0.8 },
    { move: 'luka', to: [4.8, 0, 13.6], nowait: true },
    { wait: 2.6 },
    { despawn: 'rue19' }, { despawn: 'luka' },
    say('rue19', '…Morning, Des.', { tag: 'off' }),
    say('des', '…Morning, Mr Rue.', { tag: 'off, astonished', speed: 'slow' }),
    // Hold on the empty square for two seconds.
    { wait: 2 },
    { fade: 'out', dur: 0.8 },
    { prop: 'umbrella_crowd', visible: true },
    { do: () => { BUSK.mute = false; } },
  ];
})();
