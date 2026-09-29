// ============================================================ CONTENT: 1.4 ("Tethers") and 1.5 ("It's Genius")
// SPEC §9. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
(() => {
  const PI = Math.PI, H = PI / 2;

  // ---------------------------------------------------------- scene-scoped extras
  // One updater per scene: fn(dt) every tick while that scene is on; off() once when it isn't (end, quit, select).
  let scoped = null;
  function scope(id, fn, off) {
    if (scoped) scoped(-1);
    const u = (dt) => {
      if (dt >= 0 && flow.sceneId === id) { if (fn) fn(dt); return; }
      removeUpdate(u); if (scoped === u) scoped = null; if (off) off();
    };
    scoped = u; addUpdate(u);
  }
  const shut = (o) => { o.rotation.y = 0; o.userData.open = undefined; };
  const open = (o) => { o.rotation.y = 1.5; o.userData.open = true; };
  const spinner = { popup: { msg: 'JARVIS is loading this door.', spinner: true, buttons: [], icon: 'info' } };
  const sparks = (c, at) => c.world.puff(at, { n: 14, color: 0xffd060, speed: 1.6, life: 0.5, gravity: 6 });
  async function flicker(c, n) {           // the backroom tube drops out a couple of times
    const t = c.world.prop('tube');
    if (!t) return;
    c.sfx('tube_flicker');
    for (let i = 0; i < n; i++) { t.userData.off = true; await c.wait(0.09); t.userData.off = false; await c.wait(0.13); }
  }

  // ---------------------------------------------------------- Luka's lanyard and name badge (the office key is on it)
  const badgeLook = [
    { shot: 'INSERT', at: 'luka', card: ['badge', { name: 'LUKA' }] },
    { ask: 'Flip it?', yes: [{ shot: 'INSERT', at: 'luka', card: ['badge', { name: 'LUKA', back: '1158' }] }, { flag: 'badge_flipped' }, { wait: 2 }] },
  ];
  Object.assign(ITEMS, {
    badge: {
      name: 'Name badge', examine: badgeLook,
      icon(cx, w, h) {
        cx.fillStyle = CONFIG.colors.lanyard; cx.fillRect(w * 0.43, 0, w * 0.14, h * 0.3);
        cx.fillStyle = '#b8bcc2'; cx.fillRect(w * 0.42, h * 0.24, w * 0.16, h * 0.1);
        cx.fillStyle = '#fdfdfb'; cx.beginPath(); cx.roundRect(w * 0.18, h * 0.32, w * 0.64, h * 0.5, 8); cx.fill();
        cx.fillStyle = '#15161a'; cx.fillRect(w * 0.18, h * 0.42, w * 0.64, h * 0.12);
        cx.textAlign = 'center'; cx.textBaseline = 'middle';
        cx.fillStyle = CONFIG.colors.yes; cx.font = `bold ${h * 0.1}px "Trebuchet MS", sans-serif`; cx.fillText('Yes', w * 0.32, h * 0.48);
        cx.fillStyle = '#16171b'; cx.font = `bold ${h * 0.14}px "Trebuchet MS", sans-serif`; cx.fillText('LUKA', w / 2, h * 0.68);
      },
    },
    lanyard: {
      name: 'Lanyard', examine: badgeLook,
      icon(cx, w, h) {
        cx.strokeStyle = CONFIG.colors.lanyard; cx.lineWidth = w * 0.09; cx.lineCap = 'round';
        cx.beginPath(); cx.moveTo(w * 0.28, h * 0.12); cx.lineTo(w * 0.5, h * 0.55); cx.lineTo(w * 0.72, h * 0.12); cx.stroke();
        cx.fillStyle = '#b8bcc2'; cx.fillRect(w * 0.44, h * 0.52, w * 0.12, h * 0.1);
        cx.strokeStyle = '#c9a23a'; cx.lineWidth = w * 0.05;                       // the office key on the clip
        cx.beginPath(); cx.arc(w * 0.5, h * 0.7, w * 0.08, 0, 2 * PI); cx.stroke();
        cx.beginPath(); cx.moveTo(w * 0.5, h * 0.78); cx.lineTo(w * 0.5, h * 0.94); cx.lineTo(w * 0.58, h * 0.94); cx.stroke();
      },
    },
  });

  // =================================================================== 1.4 — "Tethers"
  let wrong = 0, alarmOn = false;
  const hug = [];                            // four display-phone clones hugged to Chase's chest (shared geometry)
  const WALL_PUSH = { shot: 'POV', from: 'display_wall', at: 'display_wall', move: 'push', amount: 0.6, dur: 6, fov: 26 };
  const DOOR_WIDE = { shot: 'CAM', pos: [6.4, 1.8, -14.4], look: [6.4, 1.15, -23.9], fov: 36 };
  const TETHER_SHOT = { shot: 'CAM', pos: [-2.55, 1.08, -13.6], look: [-1.95, 1.6, -12.9], fov: 55 };
  const WRONG = ['Not my birthday.', "Not the store's postcode.", 'Not 1234. Who would use 1234?'];

  function dress14(c) {
    const P = (n) => c.world.prop(n), f = state.flags;
    delete f.alarm_off; delete f.badge_flipped;
    wrong = 0; alarmOn = false;
    c.inventory.add('badge'); c.inventory.add('lanyard');          // always on Luka: no toast
    for (let i = 1; i <= 4; i++) { const p = P('display_phone_' + i), t = P('tether_' + i); if (p) p.visible = true; if (t) t.rotation.x = 0; }
    const L = P('alarm_light'); if (L) L.visible = false;
    const d = P('backroom_door'); if (d) shut(d);
    const a = c.world.actor('luka'); if (a) a.mood = null;
  }
  function hugPhones(c) {
    const a = c.world.actor('chase');
    if (!a) return;
    const d = a.rig.d;
    for (let i = 0; i < 4; i++) {
      const src = c.world.prop('display_phone_' + (i + 1));
      if (!src) continue;
      const k = src.clone(); k.visible = true; k.scale.setScalar(0.7);
      k.position.set(-0.08 + i * 0.052, d.T * 0.2 + (i & 1) * 0.025, d.chestZ + 0.13); k.rotation.set(-0.25, PI, 0.15 - i * 0.1);
      a.rig.parts.torso.add(k); hug.push(k);
    }
    a.walkAnim = 'carry';
  }
  // The beacon on the display wall spins and throws a red beam across the floor (the rig's spot, borrowed).
  function alarmsOn(c) {
    const s = c.world.torch, L = c.world.prop('alarm_light'), ch = c.world.actor('chase');
    alarmOn = true;
    if (L) L.visible = true;
    if (s) { c.world.torchAuto = false; s.color.set(0xff2a1a); s.angle = 0.62; s.penumbra = 0.5; s.position.set(-2, 2.8, -14.1); }
    let a = 0;
    scope('1.4', (dt) => {
      if (!alarmOn) return;
      const rf = options.reduceFlashing;
      a += dt * (rf ? 1.5 : 5);
      if (L) L.rotation.y = a;
      if (s) { s.intensity = rf ? 25 : 60; s.target.position.set(-2 + Math.cos(a) * 4, 0, -14.1 - Math.sin(a) * 4); }
    }, () => {
      alarmOn = false; world.torchAuto = true;
      if (s) s.intensity = 0;
      if (L) L.visible = false;
      for (const k of hug) k.removeFromParent();
      hug.length = 0;
      if (ch) ch.walkAnim = 'walk';
    });
  }
  function alarmsOff(c) {
    alarmOn = false; c.world.torchAuto = true;
    const s = c.world.torch, L = c.world.prop('alarm_light');
    if (s) s.intensity = 0;
    if (L) L.visible = false;
    const T = [1, 2, 3, 4].map((i) => c.world.prop('tether_' + i));
    let t = 0;
    const u = (dt) => {                       // four empty cables swinging in the quiet
      t += dt;
      const on = t < 5 && flow.sceneId === '1.4';
      for (let i = 0; i < 4; i++) if (T[i]) T[i].rotation.x = on ? 0.5 * Math.exp(-1.1 * t) * Math.sin(t * (8 + i) + i) : 0;
      if (!on) removeUpdate(u);
    };
    addUpdate(u);
  }

  // The Alarm Code (Luka): the keypad by the front door. Wrong codes 1–3 get a line; the third closes the pad and the
  // camera tilts down to his lanyard; Chase shouts after six. The code is on the back of his badge.
  async function keypad(c) {
    c.cam.shot({ shot: 'INSERT', at: 'keypad' });
    const r = await c.flow.minigame('keypad', {
      digits: 4, test: '1158',
      async onSubmit(code) {
        if (code === '1158') return true;
        wrong++;
        const close = wrong === 3 || wrong === 6;
        if (close) c.sfx('sad_beep');
        if (wrong <= 3) await say('luka', WRONG[wrong - 1]);
        return close;
      },
    });
    if (r && r.code === '1158') { state.flags.alarm_off = true; return; }   // the disarm cutscene cuts straight in
    if (r && r.code && wrong === 3) return c.playCutscene(CUTSCENES['1.4_hint'], { letterbox: false });
    if (r && r.code && wrong === 6) return c.playCutscene([{ say: 'chase', text: 'Luka! Check your badge!', tag: 'off' }], { letterbox: false });
    return c.cam.release();
  }

  SCENES['1.4'] = {
    title: 'Tethers', set: 'reddy', env: 'day', time: 'Tue 29 Sep 2026, 11:02',
    playable: ['chase', 'luka'], swap: false, hud: null, music: null,   // no music: the store hum, then four alarms
    spawn: { chase: [-2.0, 0, -4.6, 2.44], luka: [-0.9, 0, -5.9, -0.7] },
    hotspots: [
      { id: 'keypad', at: 'keypad', r: 1.0, verb: 'Use', only: 'luka', when: (s) => !s.flags.alarm_off, do: keypad },
    ],
    steps: [
      ['cutscene', '1.4_wall'],
      ['minigame', 'tether', {
        shot: TETHER_SHOT, keepAlarms: false,   // the minigame fades its alarms out as the cutscene fades four back in
        lines: {
          after1: [{ say: 'luka', text: 'Chase. CHASE. What are you doing?', tag: 'off' }, { move: 'luka', to: [-2.0, 0, -9.9, PI], nowait: true }],
          after3: [{ shot: 'WHIP', size: 'MID', on: 'luka' }, { say: 'luka', text: "Those are DISPLAYS. They're TETHERED. They're tethered for a REASON.", expr: 'worried' }],
        },
      }],
      ['cutscene', '1.4_phones'],
      ['control', 'luka'],
      ['objective', 'Shut off the alarms.'],
      ['roam', {
        until: 'alarm_off',
        async auto(c) {
          await c.playCutscene(ITEMS.badge.examine, { letterbox: false });
          await c.hotspots.trigger('keypad');
        },
      }],
      ['cutscene', '1.4_disarm'],
    ],
    grants: { flags: { alarm_off: true }, items: ['badge', 'lanyard'] },
  };

  CUTSCENES['1.4_wall'] = [
    { do: dress14 },
    { expr: [['luka', 'worried']] },
    // [CLOSE · Chase, locked] He doesn't answer. His eyes slide off Luka to something past the camera.
    { shot: 'CLOSE', on: 'chase', locked: true },
    { wait: 1.2 },
    { act: [['chase', 'glance', { dur: 3.2, yaw: 0.7 }]] },
    { wait: 1.6 },
    // [POV · slow push-in] The display wall. Four phones in a row, like a police line-up. 3%, 3%, 3%, 3%.
    WALL_PUSH,
    { wait: 2.5 },
    { say: 'luka', text: 'Chase?', tag: 'off' },
    { wait: 3.2 },
    { do: () => MINIGAMES.final_yes?.snap?.('wall') },
    // [WIDE · locked, symmetrical down the aisle] Chase walks toward the wall, back to camera. It sits dead centre like an altar.
    { face: 'chase', to: PI, dur: 0 },
    { place: 'luka', at: [0.2, 0, -3.2, -2.4] },            // just out of frame, watching
    { expr: [['chase', 'determined']] },
    { shot: 'CAM', pos: [-2.0, 1.7, -1.7], look: [-2.0, 1.25, -14.3], fov: 40 },
    { wait: 0.6 },
    { move: 'chase', to: [-2.0, 0, -13.3, PI] },
    { wait: 0.4 },
  ];

  CUTSCENES['1.4_phones'] = [
    // four alarms layered, the beacon spinning (the tether's own alarms fade out under these)
    { loop: 'alarm', vol: 0.45, fade: 0.4 }, { loop: 'alarm', vol: 0.45, fade: 0.4 }, { loop: 'alarm', vol: 0.45, fade: 0.4 }, { loop: 'alarm', vol: 0.45, fade: 0.4 },
    { do: alarmsOn },
    { place: 'luka', at: [-2.0, 0, -9.9, PI] },
    { place: 'chase', at: [-2.0, 0, -13.3, 0] },
    { do: hugPhones },
    { act: [['chase', 'carry', { speed: 0 }]] },
    // [LOW · slow crane up] Chase with four phones hugged to his chest, four alarms screaming, red light pulsing.
    { shot: 'CRANE', size: 'MID', on: 'chase', angle: 'low', from: 0, to: 0.65, dur: 5 },
    { wait: 2.4 },
    { say: 'chase', text: 'If we want to fix JARVIS… we have to ask the man himself.' },
    { wait: 0.5 },
    // [WIDE · locked, on the backroom door] He walks up to it. The spinner. He waits, alarms going. Jump cut: he's gone.
    { place: 'chase', at: [6.4, 0, -19.6, PI] },
    { prop: 'backroom_door', fn: shut },
    DOOR_WIDE,
    { move: 'chase', to: 'backroom_door_out', speed: 1.0 },
    spinner,
    { wait: 2.2 },
    { popup: null, clear: true },
    { place: 'chase', at: [6.1, 0, -25.4, PI] },
    { prop: 'backroom_door', fn: open },
    DOOR_WIDE,
    { wait: 1.2 },
    // [WIDE · high, from the ceiling corner] Luka alone on the shop floor with four alarms. He looks up, straight into the lens.
    { place: 'luka', at: [3.4, 0, -5.4, 0.97] },
    { expr: [['luka', 'neutral']] },
    { act: [['luka', 'look_up']] },
    { shot: 'INSERT', at: 'ceiling_corner' },
    { wait: 2 },                                             // a flat two-second hold
    { act: [['luka', 'idle']] },
    { expr: [['luka', 'worried']] },
    { do: (c) => { const a = c.world.actor('luka'); if (a) a.mood = 'anxious'; } },
  ];

  CUTSCENES['1.4_hint'] = [
    { face: 'luka', to: PI },
    { wait: 0.35 },
    // the camera tilts down to his lanyard
    { shot: 'TILT', size: 'CLOSE', on: 'luka', to: -30, dur: 1.4 },
    { act: [['luka', 'lanyard']] },
    { wait: 1.5 },
    { say: 'luka', text: 'Where do I write things down…' },
  ];

  CUTSCENES['1.4_disarm'] = [
    { face: 'luka', to: PI },
    { wait: 0.3 },
    // [INSERT] The badge, flipped. Biro digits: 1158.
    { shot: 'INSERT', at: 'luka', card: ['badge', { name: 'LUKA', back: '1158' }] },
    { wait: 0.6 },
    { say: 'luka', text: '…Past Luka, you legend.' },
    // [WIDE · locked] The alarms stop. Four empty security cables swing in the sudden quiet.
    { shot: 'CAM', pos: [-2.0, 1.55, -9.8], look: [-2.0, 1.3, -14.3], fov: 44 },
    { loop: 'alarm', stop: true, fade: 0.05 },
    { do: alarmsOff },
    { wait: 3 },
    // Luka heads to the backroom: spinner, jump cut, through.
    { do: (c) => { const a = c.world.actor('luka'); if (a) a.mood = null; } },
    { expr: [['luka', 'neutral']] },
    { act: [['luka', 'idle']] },
    { place: 'luka', at: [6.4, 0, -19.6, PI] },
    { prop: 'backroom_door', fn: shut },
    DOOR_WIDE,
    { move: 'luka', to: 'backroom_door_out' },
    spinner,
    { wait: 2.2 },
    { popup: null, clear: true },
    { place: 'luka', at: [6.1, 0, -25.4, PI] },
    { prop: 'backroom_door', fn: open },
    DOOR_WIDE,
    { wait: 1 },
  ];

  // =================================================================== 1.5 — "It's Genius"
  const PARTS = ['part_straightener', 'part_sign', 'part_chair'];
  const PART_TEXT = ['Something that gets really hot.', 'Something big and metal.', 'Something to sit in.'];
  const HINTS = ["The lost property box! It's always the lost property box!", 'The Yes sign! Out the front!', "Luke's chair! Your lanyard's got the key!"];
  const OFFICE = [9.4, -12.75, 10.4, -12.5];   // Luke's office is locked: a collider in the doorway for this scene only
  let idle = 0, building = false;
  const partsCard = () => ['parts', { done: PARTS.map((f) => !!state.flags[f]) }];
  // Chase's parts list: three lines of biro on a torn notepad page, crossed off as the parts arrive.
  CARDS.parts = (cx, w, h, d) => {
    const done = d.done || [];
    cx.translate(w / 2, h / 2); cx.rotate(-0.03);
    cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 24; cx.shadowOffsetY = 10;
    cx.fillStyle = '#fbfaf3'; cx.fillRect(-w * 0.44, -h * 0.4, w * 0.88, h * 0.8);
    cx.shadowColor = 'transparent';
    cx.fillStyle = 'rgba(80,130,210,.3)'; for (let y = -h * 0.24; y < h * 0.4; y += h * 0.16) cx.fillRect(-w * 0.44, y + h * 0.05, w * 0.88, 2);
    cx.fillStyle = '#e8e4d8'; for (let x = -w * 0.44; x < w * 0.44; x += 24) cx.fillRect(x, -h * 0.4 - 4, 14, 6);   // torn off the pad
    cx.textBaseline = 'alphabetic'; cx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const y = -h * 0.16 + i * h * 0.2, x = -w * 0.38 + i * 6;
      cx.save(); cx.translate(x, y); cx.rotate(0.012 * (i - 1));
      cx.fillStyle = '#1f3a93'; cx.font = `bold ${h * 0.085}px "Segoe Print", "Bradley Hand", "Comic Sans MS", cursive`;
      const t = (i + 1) + '. ' + PART_TEXT[i], tw = cx.measureText(t).width;
      cx.fillText(t, 0, 0, w * 0.78);
      if (done[i]) { cx.strokeStyle = '#1f3a93'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(-6, -h * 0.028); cx.lineTo(Math.min(tw, w * 0.78) + 6, -h * 0.034); cx.stroke(); }
      cx.restore();
    }
  };
  CARDS.parts.size = [800, 480];
  const carrying = (name) => { const a = world.actor('luka'); return !!a && a.carry === name; };

  function goggles(c, mode) {                 // 'on' (over the eyes) | 'up' (pushed up the forehead) | 'off'
    const a = c.world.actor('chase'), g = a && a.rig.attach.goggles;
    if (!g) return;
    const h = g.userData.home || (g.userData.home = { y: g.position.y, z: g.position.z, rx: g.rotation.x });
    const up = mode === 'up';
    g.visible = mode !== 'off';
    g.position.y = h.y + (up ? 0.07 : 0); g.position.z = h.z - (up ? 0.03 : 0); g.rotation.x = h.rx - (up ? 0.5 : 0);
  }
  // The machine grows as the parts arrive. Before the sign it's four phones on the floor; the straightener
  // lies beside them until there's a frame to clamp it to.
  function machine(c) {
    const f = state.flags, P = (n) => c.world.prop(n);
    const m = P('machine'), s = P('machine_sign'), ph = P('machine_phones'), st = P('machine_straightener'), ch = P('machine_chair');
    if (m) m.visible = true;
    if (s) s.visible = !!f.part_sign;
    if (ph) { ph.visible = true; ph.position.y = f.part_sign ? 0 : -0.6; }
    if (st) { st.visible = !!f.part_straightener; st.position.y = f.part_sign ? 0.97 : 0.03; }
    if (ch) ch.visible = !!f.part_chair;
    const sr = P('straightener'); if (sr) sr.visible = !f.part_straightener;
    const a = P('aframe_sign'); if (a && !carrying('aframe_sign')) a.visible = !f.part_sign;
    const w = P('swivel_chair'); if (w && !carrying('swivel_chair')) w.visible = !f.part_chair;
  }
  function dress15(c) {
    const f = state.flags, P = (n) => c.world.prop(n);
    for (const k of [...PARTS, 'office_open', 'door_seen_br_in_sign', 'door_seen_br_in_chair']) delete f[k];
    const d = P('backroom_door'); if (d) shut(d);
    machine(c);
    goggles(c, 'on');
    const cols = SETS.reddy.colliders; if (!cols.includes(OFFICE)) cols.push(OFFICE);
    idle = 0; building = false;
    const ph = P('machine_phones'), st = P('machine_straightener'), tube = P('tube'), ch = c.world.actor('chase'), g = ch && ch.rig.attach.goggles;
    scope('1.5', (dt) => {
      // Chase calls out the next part after two minutes of wandering
      if (!building || !flow.roaming || flow.busy || flow.cutscene) return;
      if ((idle += dt) < 120) return;
      idle = 0;
      for (let i = 0; i < 3; i++) if (!state.flags[PARTS[i]]) { hotspots.trigger({ id: 'build_hint', steps: [{ say: 'chase', text: HINTS[i] }] }); break; }
    }, () => {
      const i = cols.indexOf(OFFICE); if (i >= 0) cols.splice(i, 1);
      if (ph) ph.position.y = 0;
      if (st) st.position.y = 0.97;
      if (tube) tube.userData.off = false;
      if (g && g.userData.home) { const h = g.userData.home; g.visible = false; g.position.y = h.y; g.position.z = h.z; g.rotation.x = h.rx; }
    });
  }
  // a part arrives: tick it off, show the machine, then Chase's list
  function arrive(c, flag) {
    state.flags[flag] = true; idle = 0;
    machine(c);
    c.sfx('clunk');
    return c.playCutscene([{ shot: 'INSERT', at: 'machine', angle: 'top', dist: 1.5 }, { wait: 1.1 }, { shot: 'INSERT', at: 'machine', angle: 'top', dist: 1.5, card: partsCard() }, { wait: 1.6 }], { letterbox: false });
  }
  async function deliver(c, prop, flag) {     // Luka puts it down: the prop goes home and hides; the machine's part shows
    const a = c.world.actor('luka');
    if (a && a.carry === prop) a.hold(null);
    const o = c.world.prop(prop); if (o) o.visible = false;
    await arrive(c, flag);
  }
  function takeChair(c) {
    const a = c.world.actor('luka'), o = c.world.prop('swivel_chair');
    if (!a || !o) return;
    a.face('office_desk', 0);
    a.hold(o);
    o.position.set(0, 0, 0.62); o.rotation.set(0, 0, 0);   // wheeled in front of him, back towards him
    c.sfx('creak', { vol: 0.5 });
  }
  function wireUp(c) {                       // Chase at the rig, goggles down; top-down for the Wiring
    building = false;
    const ch = c.world.actor('chase'), lu = c.world.actor('luka');
    for (const a of [ch, lu]) if (a && a.held) a.hold(null);
    machine(c);
    if (ch) { ch.place('machine_spot'); ch.play('duck'); }
    if (lu) { lu.place([8.0, 0, -25.6, -2.3]); lu.play('idle'); }
    goggles(c, 'on');
    c.cam.shot({ shot: 'INSERT', at: 'machine', angle: 'top', dist: 1.6 });
  }

  SCENES['1.5'] = {
    title: "It's Genius", set: 'reddy', env: 'day', time: 'Tue 29 Sep 2026, 11:20',
    playable: ['luka', 'chase'], swap: false, hud: null, music: null,   // the tube's hum and the spark; the Reddy tune once the hunt starts
    spawn: { chase: 'machine_spot', luka: [6.4, 0, -21.4, PI] },
    hotspots: [
      { id: 'kettle', at: 'kettle', r: 1.0, verb: 'Use', kettle: true },
      { id: 'machine', at: 'machine', r: 1.3, do: (c) => c.playCutscene([{ shot: 'INSERT', at: 'machine', card: partsCard() }, { wait: 2.2 }], { letterbox: false }) },
      // 1. Something that gets really hot: the straightener in the lost property box (either of them)
      { id: 'straightener', at: 'lost_property', r: 1.0, verb: 'Take', when: (s) => !s.flags.part_straightener,
        steps: [{ prop: 'straightener', visible: false }, { sfx: 'pop' },
          { say: 'chase', text: 'It gets to 230 degrees, Luka.' }, { say: 'luka', text: 'Why do you know that?' },
          { do: (c) => arrive(c, 'part_straightener') }] },
      // 2. Something big and metal: the Yes A-frame out the front (only Luka can carry it)
      { id: 'sign', at: 'aframe', r: 1.2, verb: 'Take', only: 'luka', when: (s) => !s.flags.part_sign && !world.actor('luka')?.held,
        steps: [{ face: 'luka', to: 'aframe' }, { hold: 'luka', prop: 'aframe_sign' }, { sfx: 'clunk' }, { say: 'chase', text: "I'll get the door." }] },
      { id: 'sign_chase', at: 'aframe', r: 1.2, only: 'chase', when: (s) => !s.flags.part_sign && !carrying('aframe_sign'),
        text: 'Heavier than it looks. And it looks heavy.' },
      // 3. Something to sit in: Luke's swivel chair, behind his locked door (the key's on Luka's lanyard)
      { id: 'office_locked', at: [9.9, 0, -12.2], r: 0.8, verb: 'Open', when: (s) => !s.flags.office_open,
        steps: [{ sfx: 'clunk' }, { if: (s) => s.active === 'luka',
          then: [{ say: 'luka', text: "Locked. The key's on my lanyard." }],
          else: [{ say: 'chase', text: 'LUKE — MANAGER. Under it: KNOCK. Under that: PLEASE.' }] }],
        use: { lanyard: [{ if: (s) => s.active === 'luka',
          then: [{ sfx: 'clunk' }, { flag: 'office_open' }, { do: (c) => c.hotspots.trigger('office_in') }],
          else: [{ say: 'chase', text: "That won't work." }] }] } },
      { id: 'office_in', at: [9.9, 0, -12.2], r: 0.8, verb: 'Open', when: (s) => !!s.flags.office_open, door: { to: 'office_door_in', kind: 'jarvis' } },
      { id: 'office_out', at: [9.9, 0, -13.1], r: 0.8, verb: 'Open', door: { to: [9.9, 0, -12.0, 0], kind: 'jarvis' } },
      { id: 'chair', at: [9.25, 0, -16.35], r: 1.4, verb: 'Take', only: 'luka', when: (s) => !s.flags.part_chair && !world.actor('luka')?.held, do: takeChair },
      // doors: the front doors and the backroom door all load like JARVIS doors
      { id: 'front_out', at: [-2.0, 0, -0.6], r: 0.8, verb: 'Open', door: { to: [-2.0, 0, 1.1, 0], kind: 'jarvis' } },
      { id: 'front_in', at: [-2.0, 0, 0.6], r: 0.8, verb: 'Open', door: { to: [-2.0, 0, -1.1, PI], kind: 'jarvis' } },
      { id: 'br_in', at: [6.4, 0, -23.3], r: 0.8, verb: 'Open', when: () => !carrying('aframe_sign') && !carrying('swivel_chair'),
        door: { to: [6.1, 0, -25.4, PI], kind: 'jarvis' } },
      { id: 'br_in_sign', at: [6.4, 0, -23.3], r: 0.8, verb: 'Open', when: () => carrying('aframe_sign'),
        door: { to: [6.1, 0, -25.4, PI], kind: 'jarvis', first: [{ say: 'luka', text: "This is the most useful I've been all day." }] },
        do: (c) => deliver(c, 'aframe_sign', 'part_sign') },
      { id: 'br_in_chair', at: [6.4, 0, -23.3], r: 0.8, verb: 'Open', when: () => carrying('swivel_chair'),
        door: { to: [6.1, 0, -25.4, PI], kind: 'jarvis', first: [{ say: 'luka', text: 'This is my life now.' }] },
        do: (c) => deliver(c, 'swivel_chair', 'part_chair') },
      { id: 'br_out', at: [6.4, 0, -24.45], r: 0.6, verb: 'Open', door: { to: [6.4, 0, -22.4, 0], kind: 'jarvis' } },
    ],
    steps: [
      ['cutscene', '1.5_open'],
      ['control', 'luka'],
      ['swap', true],                        // "TAB — Swap"
      ['follow', 'chase'],
      ['objective', 'Finish the machine.'],
      ['do', (c) => { building = true; idle = 0; c.music('reddy', { fade: 2 }); }],
      ['roam', {
        until: PARTS,
        async auto(c) {
          for (const id of ['machine', 'straightener', 'sign', 'br_in_sign']) await c.hotspots.trigger(id);
          c.inventory.selected = 'lanyard';
          await c.hotspots.trigger('office_locked');
          for (const id of ['chair', 'office_out', 'br_in_chair']) await c.hotspots.trigger(id);
        },
      }],
      ['follow', null],
      ['swap', false],
      ['objective', null],
      ['control', 'chase'],
      ['do', wireUp],
      ['minigame', 'wiring', { layout: 'machine' }],
      ['cutscene', '1.5_pitch'],
    ],
    grants: { flags: { part_straightener: true, part_sign: true, part_chair: true, office_open: true } },
  };

  CUTSCENES['1.5_open'] = [
    { do: dress15 },
    { act: [['chase', 'duck']] },
    // [ECU] A soldering tip touches a contact. A spark fills the frame.
    { shot: 'CAM', pos: [6.08, 0.36, -26.72], look: [6.32, 0.13, -27.12], fov: 30 },
    { wait: 1.0 },
    { sfx: 'spark' }, { do: (c) => sparks(c, [6.3, 0.14, -27.1]) }, { flash: 0.12, color: '#fff3c0' },
    { wait: 0.9 },
    // [WIDE · overhead, slow orbit] Chase in safety goggles, four phones and a tangle of wires: a heist reveal. The tube flickers.
    { shot: 'ORBIT', size: 'WIDE', on: 'machine', angle: 'high', dist: 2.6, height: 0.9, from: -80, to: 10, dur: 8 },
    { wait: 2.2 },
    { do: (c) => flicker(c, 3) },
    { wait: 1.4 },
    { sfx: 'spark', vol: 0.6 }, { do: (c) => sparks(c, [6.3, 0.14, -27.1]) },
    { wait: 2.6 },
    // [MID · Luka framed in the doorway]
    { prop: 'backroom_door', fn: open },
    { place: 'luka', at: 'doorway' },
    { expr: [['luka', 'stunned']] },
    { shot: 'MID', on: 'luka', locked: true },
    { wait: 0.5 },
    { say: 'luka', text: 'What. Is. That.' },
    // [CLOSE · Chase pushes his goggles up]
    { face: 'chase', to: 'luka', dur: 0 },
    { shot: 'CLOSE', on: 'chase' },
    { wait: 0.4 },
    { do: (c) => goggles(c, 'up') },
    { wait: 0.3 },
    { say: 'chase', text: 'Time machine.' },
    // [CLOSE · Luka, locked]
    { shot: 'CLOSE', on: 'luka', locked: true },
    { say: 'luka', text: '…' },
    { shot: 'CLOSE', on: 'chase' },
    { say: 'chase', text: "It's not finished. I need three more things. And I need you.", expr: 'determined' },
    { shot: 'CLOSE', on: 'luka', locked: true },
    { say: 'luka', text: "I'm not helping.", expr: 'neutral' },
    { shot: 'CLOSE', on: 'chase' },
    { say: 'chase', text: "You're supervising." },
    { shot: 'CLOSE', on: 'luka', locked: true },
    { say: 'luka', text: "…I'm supervising." },
    // The parts list, in Chase's handwriting.
    { shot: 'INSERT', at: 'machine', card: ['parts', {}] },
    { place: 'luka', at: [6.4, 0, -25.1, PI] },
    { place: 'chase', at: [5.3, 0, -26.1, 2.6] },
    { act: [['chase', 'idle']] },
    { expr: [['chase', 'neutral']] },
    { prop: 'backroom_door', fn: shut },
    { wait: 2.6 },
  ];

  const PITCH = 'Okay okay okay, hear me out. JARVIS is broken, right? It\'s broken because it was built broken. So we go back to when Rue made JARVIS and we warn him. Every bug. Every pop-up. The margarine thing. He fixes it before it exists. JARVIS works from day one. Margaret gets her grandson on her plan. Dazza pours his slab.';
  // [ORBIT · around Chase, speeding up as he does] each sweep shorter and faster; Luka behind him in every angle
  const ORBITS = [
    { shot: 'ORBIT', size: 'MID', on: 'chase', dist: 1.85, height: 0.05, from: -22, to: 22, dur: 5, ease: 'in' },
    { wait: 4.6 },
    { shot: 'ORBIT', size: 'MID', on: 'chase', dist: 1.8, height: 0.05, from: 22, to: -22, dur: 3, ease: 'in' },
    { wait: 2.8 },
    { shot: 'ORBIT', size: 'MID', on: 'chase', dist: 1.75, height: 0.05, from: -22, to: 22, dur: 1.8, ease: 'in' },
    { wait: 1.7 },
    { shot: 'ORBIT', size: 'MID', on: 'chase', dist: 1.7, height: 0.05, from: 22, to: -24, dur: 1.2, ease: 'in' },
  ];

  CUTSCENES['1.5_pitch'] = [
    { place: 'chase', at: [5.05, 0, -26.3, -H] },
    { place: 'luka', at: [8.5, 0, -25.1, -2.0] },
    { act: [['chase', 'idle'], ['luka', 'idle']] },
    { expr: [['chase', 'determined'], ['luka', 'neutral']] },
    { do: (c) => goggles(c, 'up') },
    { par: [{ say: 'chase', text: PITCH }, { do: (c) => c.runSteps(ORBITS) }] },
    // [TWO-SHOT · locked, side-on, the machine between them on the floor] A stare. The tube flickers; a truck reverses.
    { place: 'luka', at: [5.65, 0, -27.3, H] },
    { place: 'chase', at: [7.2, 0, -27.3, -H] },
    { expr: [['luka', 'stunned'], ['chase', 'neutral']] },
    { do: (c) => { const a = c.world.actor('chase'); if (a) a.rig.face.mouth('smile'); } },   // hopeful
    { shot: 'CAM', pos: [6.42, 1.5, -29.1], look: [6.42, 1.1, -27.2], fov: 52 },
    { music: null, fade: 0.6 },
    { par: [
      { stare: 3.5, ambient: [['tube_flicker', 0.7], ['spark', 1.7], ['truck_reverse', 2.1]] },
      { do: async (c) => { await c.wait(0.7); await flicker(c, 2); await c.wait(0.6); sparks(c, [6.3, 0.72, -27.1]); } },
    ] },
    // [CLOSE · Luka]
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    { shot: 'CLOSE', on: 'luka', locked: true },
    { say: 'luka', text: "…it's… genius.", speed: 'slow' },
    // [WIDE] They both nod, deadly serious.
    { expr: [['luka', 'determined'], ['chase', 'determined']] },
    { shot: 'CAM', pos: [9.6, 2.35, -29.3], look: [6.4, 0.95, -26.6], fov: 50 },
    { wait: 0.4 },
    { act: [['luka', 'nod', { dur: 1.2 }], ['chase', 'nod', { dur: 1.2 }]] },
    { wait: 1.8 },
  ];
})();
