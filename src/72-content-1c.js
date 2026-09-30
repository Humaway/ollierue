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
  const OFFICE = [9.4, -12.75, 10.4, -12.5];   // Luke's office is locked in Act 1: a collider in its doorway (1.4, 1.5)
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
  // [INSERT] The badge, flipped. Biro digits: 1158. — in 1.4, while the alarms are going, Luka reacts on the spot
  const LEGEND = { say: 'luka', text: '…Past Luka, you legend.' };
  const badgeLook = [
    { shot: 'INSERT', at: 'luka', card: ['badge', { name: 'LUKA' }] },
    { ask: 'Flip it?', yes: [{ shot: 'INSERT', at: 'luka', card: ['badge', { name: 'LUKA', back: '1158' }] },
      { if: (s) => flow.sceneId === '1.4' && !s.flags.alarm_off && !s.flags.badge_flipped, then: [{ wait: 0.8 }, LEGEND, { wait: 0.4 }], else: [{ wait: 2 }] },
      { flag: 'badge_flipped' }] },
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
  const TETHER_SHOT = { shot: 'CAM', pos: [-2.95, 1.12, -14.2], look: [-2.0, 1.5, -13.3], fov: 55 };   // low on the ledge, phone 1 in the foreground
  const WRONG = ['Not my birthday.', "Not the store's postcode.", 'Not 1234. Who would use 1234?'];
  const PAD = { shot: 'CAM', pos: [-3.3, 1.75, -2.5], look: [-4.4, 1.35, -0.45], fov: 40 };   // over Luka's shoulder onto the keypad
  const HUG = { act: [['chase', 'carry', { speed: 0.001 }]] };   // arms round the four phones, feet still

  function dress14(c) {
    const P = (n) => c.world.prop(n), f = state.flags;
    delete f.alarm_off; delete f.badge_flipped;
    wrong = 0; alarmOn = false;
    c.inventory.add('badge'); c.inventory.add('lanyard');          // always on Luka: no toast
    for (let i = 1; i <= 4; i++) { const p = P('display_phone_' + i), t = P('tether_' + i); if (p) p.visible = true; if (t) t.rotation.x = 0; }
    const L = P('alarm_light'); if (L) L.visible = false;
    const d = P('backroom_door'); if (d) shut(d);
    const a = c.world.actor('luka'); if (a) a.mood = null;
    // the beacon on the display wall spins while the alarms go (alarmsOn); Luke's office stays locked all scene
    let ang = 0;
    scope('1.4', (dt) => {
      if (!alarmOn) return;
      const rf = options.reduceFlashing, s = world.torch;
      ang += dt * (rf ? 1.5 : 5);
      if (L) L.rotation.y = ang;
      if (s) { s.intensity = rf ? 25 : 60; s.target.position.set(-2 + Math.cos(ang) * 4, 0, -14.1 - Math.sin(ang) * 4); }
    }, () => {
      const cols = SETS.reddy.colliders, i = cols.indexOf(OFFICE); if (i >= 0) cols.splice(i, 1);
      if (alarmOn) { world.torchAuto = true; if (world.torch) world.torch.intensity = 0; }
      alarmOn = false;
      if (L) L.visible = false;
      for (const k of hug) k.removeFromParent();
      hug.length = 0;
      const ch = world.actor('chase'); if (ch) ch.walkAnim = 'walk';
    });
    const cols = SETS.reddy.colliders; if (!cols.includes(OFFICE)) cols.push(OFFICE);
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
    const s = c.world.torch, L = c.world.prop('alarm_light');
    alarmOn = true;
    if (L) L.visible = true;
    if (s) { c.world.torchAuto = false; s.color.set(0xff2a1a); s.angle = 0.62; s.penumbra = 0.5; s.position.set(-2, 2.8, -14.1); }
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
    const a = c.world.actor('luka');
    if (a) { a.place('keypad'); a.play('idle'); }
    c.cam.shot(PAD);
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
    spawn: { chase: [7.05, 0, -9.85, PI + 0.1], luka: [5.75, 0, -9.85, PI - 0.1] },   // still slumped on the floor from 1.3, either side of the monitor
    hotspots: [
      { id: 'keypad', at: 'keypad', r: 1.0, verb: 'Use', only: 'luka', when: (s) => !s.flags.alarm_off, do: keypad },
    ],
    steps: [
      ['cam', 'fixed', TETHER_SHOT],          // the cutscene ends on the tether angle and eases into this same angle: no jump
      ['cutscene', '1.4_wall'],
      ['minigame', 'tether', {
        shot: TETHER_SHOT, keepAlarms: false,   // the minigame fades its alarms out as the cutscene fades four back in
        lines: {
          after1: [{ say: 'luka', text: 'Chase. CHASE. What are you doing?', tag: 'off' }, { move: 'luka', to: [-2.0, 0, -9.9, PI], nowait: true }],
          after3: [{ shot: 'WHIP', size: 'MID', on: 'luka' }, { say: 'luka', text: "Those are DISPLAYS. They're TETHERED. They're tethered for a REASON.", expr: 'worried' }],
        },
      }],
      ['cam', null],
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
    { fade: 'out', dur: 0 },                                 // (hold the black a moment: the seated pose settles before the close frames his head)
    { act: [['chase', 'sit', { h: 0.18 }], ['luka', 'sit', { h: 0.18 }]] },
    { expr: [['luka', 'worried'], ['chase', 'sad']] },
    { wait: 0.3 },
    // [CLOSE · Chase, locked] He doesn't answer. His eyes slide off Luka to something past the camera.
    { shot: 'CLOSE', on: 'chase', locked: true },
    { fade: 'in', dur: 0.6 },
    { wait: 0.6 },
    { act: [['chase', 'glance', { dur: 3.2, yaw: 1.0 }]] },       // (toward the display wall, across the floor)
    { wait: 1.6 },
    // [POV · slow push-in] The display wall. Four phones in a row, like a police line-up. 3%, 3%, 3%, 3%.
    WALL_PUSH,
    { wait: 2.5 },
    { say: 'luka', text: 'Chase?', tag: 'off' },
    { wait: 3.2 },
    { do: () => MINIGAMES.final_yes?.snap?.('wall') },
    // [WIDE · locked, symmetrical down the aisle] Chase stands and walks toward the wall, back to camera. It sits dead
    // centre at the end of the aisle like an altar.
    { place: 'chase', at: [-2.0, 0, -4.6, PI] },           // (under the POV: still seated, now at the head of the aisle)
    { place: 'luka', at: [-3.6, 0, -2.5, 2.99] },           // up too, out of this frame and the tether angle's: his lines are (off)
    { act: [['luka', 'idle']] },
    { expr: [['chase', 'determined']] },
    { shot: 'CAM', pos: [-2.0, 1.7, -1.7], look: [-2.0, 1.25, -14.3], fov: 40 },
    { wait: 0.5 },
    { act: [['chase', 'stand']] },
    { wait: 1.0 },
    { move: 'chase', to: [-2.0, 0, -13.3, PI] },
    { wait: 0.4 },
    // Tether Rip: from low at the wall, looking back at Chase
    TETHER_SHOT,
    { wait: 0.5 },
  ];

  CUTSCENES['1.4_phones'] = [
    // four alarms layered, the beacon spinning (the tether's own alarms fade out under these)
    { loop: 'alarm', vol: 0.45, fade: 0.4 }, { loop: 'alarm', vol: 0.45, fade: 0.4 }, { loop: 'alarm', vol: 0.45, fade: 0.4 }, { loop: 'alarm', vol: 0.45, fade: 0.4 },
    { do: alarmsOn },
    { place: 'luka', at: [-2.0, 0, -9.9, PI] },
    { place: 'chase', at: [-2.0, 0, -13.3, 0] },
    { do: (c) => c.player.control('luka') },                 // the player's actor drops loco poses when idle: hand it over now
    { do: hugPhones },
    HUG,
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
    HUG,
    spinner,
    { wait: 2.2 },
    { popup: null, clear: true },
    { place: 'chase', at: [8.8, 0, -27.8, PI] },             // through, and out of the doorway's sightline: gone
    { prop: 'backroom_door', fn: open },
    DOOR_WIDE,
    { wait: 1.2 },
    // [WIDE · high, from the ceiling corner] Luka alone on the shop floor with four alarms. He looks up, straight into the lens.
    { place: 'luka', at: [3.4, 0, -5.4, 0.97] },
    { expr: [['luka', 'neutral']] },
    { act: [['luka', 'look_up']] },
    { shot: 'INSERT', at: 'ceiling_corner' },
    { stare: 2 },                                            // a flat two-second hold: the 1.4 stare (alarms keep going)
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
    // [INSERT] The badge, flipped. Biro digits: 1158. (already played on the flip; here only if he typed it without looking)
    { if: (s) => !s.flags.badge_flipped, then: [
      { face: 'luka', to: PI },
      { wait: 0.3 },
      { shot: 'INSERT', at: 'luka', card: ['badge', { name: 'LUKA', back: '1158' }] },
      { wait: 0.6 },
      LEGEND,
    ] },
    // [WIDE · locked] The alarms stop. Four empty security cables swing in the sudden quiet.
    { shot: 'CAM', pos: [-2.0, 1.6, -9.8], look: [-2.0, 1.6, -14.3], fov: 44 },
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
    { place: 'luka', at: [8.6, 0, -28.6, PI] },
    { prop: 'backroom_door', fn: open },
    DOOR_WIDE,
    { wait: 1 },
  ];

  // =================================================================== 1.5 — "It's Genius"
  const PARTS = ['part_straightener', 'part_sign', 'part_chair'];
  const PART_TEXT = ['Something that gets really hot.', 'Something big and metal.', 'Something to sit in.'];
  const HINTS = ["The lost property box! It's always the lost property box!", 'The Yes sign! Out the front!', "Luke's chair! Your lanyard's got the key!"];
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
  // Chase stays at the machine while Luka fetches: when he's not beside the active one he's calling from the backroom
  const far = () => { const a = world.actor('chase'), b = player.actor; return !!a && !!b && a !== b && Math.hypot(a.pos.x - b.pos.x, a.pos.z - b.pos.z) > 5; };

  // The soldering iron from the repair bench, its tip on phone 2's contact, the cable trailing to Chase's hands.
  // Built once; it lies in the set only while 1.5 runs.
  const TIP = [6.325, 0.05, -27.08];
  let iron = null;
  function solderIron(c, on) {
    if (!iron) {
      const b = new Builder();
      b.cyl(0.002, 0.006, 0.05, 6, mat(0xc9ccd1), [0, 0.025, 0]);
      b.cyl(0.007, 0.007, 0.09, 8, mat(0x8d9398), [0, 0.095, 0]);
      b.cyl(0.017, 0.013, 0.13, 8, mat(0xd32f2f), [0, 0.205, 0]);
      b.cyl(0.004, 0.004, 0.4, 4, mat(0x15161a), [0, 0.47, 0]);
      iron = b.done({ floor: false });
      iron.position.set(TIP[0], TIP[1], TIP[2]);
      iron.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.73, 0.42, 0.53).normalize());
    }
    const root = on && c.world.prop('machine')?.parent;
    if (root) { if (iron.parent !== root) root.add(iron); } else iron.removeFromParent();
  }

  // 'on' (over the eyes) | 'up' (tipped back over the fringe, pivoting on the strap at the back) | 'off'; k = how far up
  function goggles(c, mode, k = 1) {
    const a = c.world.actor('chase'), g = a && a.rig.attach.goggles;
    if (!g) return;
    const h = g.userData.home || (g.userData.home = { y: g.position.y, z: g.position.z, rx: g.rotation.x });
    const u = mode === 'up' ? k : 0;
    g.visible = mode !== 'off';
    g.position.y = h.y + 0.054 * u; g.position.z = h.z + 0.044 * u; g.rotation.x = h.rx - 0.4 * u;
    g.scale.setScalar(1 + 0.1 * u);
  }
  // [CLOSE · Chase pushes his goggles up]: both hands go to the strap and the goggles ride up over 0.3 s
  function pushGoggles(c) {
    const a = c.world.actor('chase');
    if (a) a.play('hands_head', { loop: false, dur: 0.75 });
    let t = -0.22;
    return new Promise((res) => {
      const u = (dt) => {
        t += dt;
        const done = t >= 0.3 || flow.skipping || flow.sceneId !== '1.5';
        goggles(c, 'up', done ? 1 : Math.max(0, t / 0.3));
        if (done) { removeUpdate(u); res(); }
      };
      addUpdate(u);
    });
  }
  // Before the sign arrives the phones lie on the floor and the set's own wiring is under it: a loose tangle for them
  let tangle = null;
  function wires(c, on) {
    const m = c.world.prop('machine');
    if (!tangle) {
      const b = new Builder(), wc = [0xd32f2f, 0x2f6fd6, 0x2e9d4a, 0xffd21f].map((x) => mat(x)), m4 = new THREE.Matrix4(), e = new THREE.Euler();
      const lead = (w, l, mt, x, y, z, rx, ry) => b.geo(new THREE.BoxGeometry(w, w, l), mt, m4.makeRotationFromEuler(e.set(rx, ry, 0, 'YXZ')).setPosition(x, y, z));
      for (let i = 0; i < 4; i++) {
        const x = -0.22 + i * 0.145;
        lead(0.012, 0.3, wc[i], x * 0.9, 0.04, 0.36, 0.25, 0.2 - i * 0.15);                 // out of each phone to the floor
        lead(0.012, 0.7, wc[i], x - 0.1, 0.008, 0.75 + i * 0.05, 0, 0.6 + i * 0.4);
      }
      for (let i = 0; i < 10; i++) lead(0.01, 0.4, wc[i % 4], Math.sin(i * 2.1) * 0.4, 0.006, 0.2 + Math.cos(i * 1.7) * 0.45, 0, i * 0.7);
      for (const [x, z, k] of [[-0.55, 0.55, 0], [0.45, 0.72, 2], [-0.2, 1.0, 3]]) b.geo(new THREE.TorusGeometry(0.07, 0.006, 4, 14), wc[k], m4.makeRotationX(PI / 2).setPosition(x, 0.006, z));
      tangle = b.done({ floor: false });
    }
    const root = on && m && m.parent;
    if (root) { if (tangle.parent !== root) root.add(tangle); tangle.position.copy(m.position); } else tangle.removeFromParent();
  }
  // The machine grows as the parts arrive. Before the sign it's four phones on the floor; the straightener
  // lies beside them until there's a frame to clamp it to.
  function machine(c) {
    const f = state.flags, P = (n) => c.world.prop(n);
    const m = P('machine'), s = P('machine_sign'), ph = P('machine_phones'), st = P('machine_straightener'), ch = P('machine_chair');
    if (m) m.visible = true;
    if (s) s.visible = !!f.part_sign;
    if (ph) { ph.visible = true; ph.position.y = f.part_sign ? 0 : -0.6; }
    if (tangle) tangle.visible = !f.part_sign;
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
    solderIron(c, true);
    wires(c, true); machine(c);
    idle = 0; building = false;
    const cols = SETS.reddy.colliders;
    const ph = P('machine_phones'), st = P('machine_straightener'), tube = P('tube'), ch = c.world.actor('chase'), g = ch && ch.rig.attach.goggles;
    scope('1.5', (dt) => {
      // Chase calls out the next part after two minutes of wandering
      if (!building || !flow.roaming || flow.busy || flow.cutscene || !player.enabled) return;
      if ((idle += dt) < 120) return;
      idle = 0;
      const held = world.actor('luka')?.carry;
      for (let i = 0; i < 3; i++) {
        if (state.flags[PARTS[i]] || held === (i === 1 ? 'aframe_sign' : i === 2 ? 'swivel_chair' : '')) continue;
        hotspots.trigger({ id: 'build_hint', steps: [{ say: 'chase', text: HINTS[i], tag: far() ? 'off' : '' }] }); break;   // from the backroom
      }
    }, () => {
      const i = cols.indexOf(OFFICE); if (i >= 0) cols.splice(i, 1);
      if (ph) ph.position.y = 0;
      if (st) st.position.y = 0.97;
      if (tube) tube.userData.off = false;
      if (iron) iron.removeFromParent();
      if (tangle) tangle.removeFromParent();
      if (g && g.userData.home) { const h = g.userData.home; g.visible = false; g.position.y = h.y; g.position.z = h.z; g.rotation.x = h.rx; g.scale.setScalar(1); }
    });
    if (!cols.includes(OFFICE)) cols.push(OFFICE);   // after scope(): registering it runs 1.4's clean-up, which removes it
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
      { id: 'straightener', at: 'lost_property', r: 1.2, verb: 'Take', when: (s) => !s.flags.part_straightener,
        steps: [{ prop: 'straightener', visible: false }, { sfx: 'pop' },
          { say: 'chase', text: 'It gets to 230 degrees, Luka.' }, { say: 'luka', text: 'Why do you know that?' },
          { do: (c) => arrive(c, 'part_straightener') }] },
      // 2. Something big and metal: the Yes A-frame out the front (only Luka can carry it)
      { id: 'sign', at: 'aframe', r: 1.3, verb: 'Take', only: 'luka', when: (s) => !s.flags.part_sign && !world.actor('luka')?.held,
        steps: [{ face: 'luka', to: 'aframe' }, { hold: 'luka', prop: 'aframe_sign' }, { sfx: 'clunk' }, { do: (c) => c.say('chase', "I'll get the door.", { tag: far() ? 'off' : '' }) }] },
      { id: 'sign_chase', at: 'aframe', r: 1.3, only: 'chase', when: (s) => !s.flags.part_sign && !carrying('aframe_sign'),
        text: 'Heavier than it looks. And it looks heavy.' },
      // 3. Something to sit in: Luke's swivel chair, behind his locked door (the key's on Luka's lanyard)
      { id: 'office_locked', at: [9.9, 0, -12.2], r: 0.8, verb: 'Open', when: (s) => !s.flags.office_open,
        steps: [{ sfx: 'clunk' }, { if: (s) => s.active === 'luka',
          then: [{ say: 'luka', text: "Locked. The key's on my lanyard." }],
          else: [{ say: 'chase', text: 'LUKE — MANAGER. Under it: KNOCK. Under that: PLEASE.' }] }],
        use: { lanyard: [{ if: (s) => s.active === 'luka',
          then: [{ sfx: 'clunk' }, { flag: 'office_open' }, { do: (c) => c.hotspots.trigger('office_in') }],
          else: [{ say: 'chase', text: "That won't work." }] }] } },
      { id: 'office_in', at: [9.9, 0, -12.2], r: 0.8, verb: 'Open', when: (s) => !!s.flags.office_open, door: { to: [9.9, 0, -14.1, PI], kind: 'jarvis' } },   // a step past the doorway, so the follower lands inside too
      { id: 'office_out', at: [9.9, 0, -13.1], r: 0.8, verb: 'Open', door: { to: [9.9, 0, -11.4, 0], kind: 'jarvis' } },   // far enough out that the follower lands outside too
      { id: 'chair', at: [9.25, 0, -16.35], r: 1.7, verb: 'Take', only: 'luka', when: (s) => !s.flags.part_chair && !world.actor('luka')?.held, do: takeChair },
      // doors: the front doors and the backroom door all load like JARVIS doors
      { id: 'front_out', at: [-2.0, 0, -0.6], r: 0.8, verb: 'Open', door: { to: [-2.0, 0, 1.5, 0], kind: 'jarvis' } },
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
      ['swap', true],                        // "TAB — Swap" (no follower: Chase keeps building in the backroom until swapped to)
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
    { shot: 'CAM', pos: [6.55, 0.15, -26.77], look: [6.27, 0.08, -27.04], fov: 30 },
    { wait: 1.0 },
    { sfx: 'spark' }, { do: (c) => sparks(c, TIP) }, { flash: 0.12, color: '#fff3c0' },
    { wait: 0.9 },
    // [WIDE · overhead, slow orbit] Chase in safety goggles, four phones and a tangle of wires: a heist reveal. The tube flickers.
    { shot: 'ORBIT', size: 'WIDE', on: 'machine', angle: 'high', dist: 2.6, height: 0.9, from: -80, to: 10, dur: 8 },
    { wait: 2.2 },
    { do: (c) => flicker(c, 3) },
    { wait: 1.4 },
    { sfx: 'spark', vol: 0.6 }, { do: (c) => sparks(c, TIP) },
    { wait: 2.6 },
    // [MID · Luka framed in the doorway] (Chase gets up off the floor under the cut)
    { act: [['chase', 'idle']] },
    { prop: 'backroom_door', fn: open },
    { place: 'luka', at: 'doorway' },
    { expr: [['luka', 'stunned']] },
    { shot: 'CAM', pos: [6.3, 1.45, -27.1], look: [6.4, 1.3, -24.15], fov: 28 },   // long lens from the machine: the door frame around him
    { wait: 0.5 },
    { say: 'luka', text: 'What. Is. That.' },
    // [CLOSE · Chase pushes his goggles up]
    { face: 'chase', to: 'luka', dur: 0 },
    { shot: 'CLOSE', on: 'chase' },
    { wait: 0.3 },
    { do: pushGoggles },
    { wait: 0.35 },
    { say: 'chase', text: 'Time machine.' },
    // [CLOSE · Luka, locked]
    { shot: 'CLOSE', on: 'luka', locked: true },            // every line below plays over Luka's locked face
    { say: 'luka', text: '…' },
    { say: 'chase', text: "It's not finished. I need three more things. And I need you.", expr: 'determined' },
    { say: 'luka', text: "I'm not helping.", expr: 'neutral' },
    { say: 'chase', text: "You're supervising." },
    { say: 'luka', text: "…I'm supervising." },
    // The parts list, in Chase's handwriting.
    { shot: 'INSERT', at: 'machine', card: ['parts', {}] },
    { place: 'luka', at: [6.4, 0, -25.1, PI] },
    { place: 'chase', at: [7.3, 0, -26.5, -2.4] },            // beyond the machine, clear of the backroom camera
    { act: [['chase', 'idle']] },
    { expr: [['chase', 'neutral']] },
    { prop: 'backroom_door', fn: shut },
    { wait: 2.6 },
  ];

  const PITCH = 'Okay okay okay, hear me out. JARVIS is broken, right? It\'s broken because it was built broken. So we go back to when Rue made JARVIS and we warn him. Every bug. Every pop-up. The margarine thing. He fixes it before it exists. JARVIS works from day one. Margaret gets her grandson on her plan. Dazza pours his slab.';
  // [ORBIT · around Chase, speeding up as he does] one way round, accelerating until he runs out of pitch. Luka, 1.9 m
  // behind him, drifts from ~60° to ~27° off Chase's back axis: in the background of every angle, never hidden, never cut off.
  const pitchOrbit = () => ({ shot: 'ORBIT', size: 'MID', on: 'chase', dist: 2.4, height: 0.05, from: 25, to: -8, ease: 'in',
    dur: PITCH.length / CONFIG.text[options.textSpeed] + 1 });

  CUTSCENES['1.5_pitch'] = [
    { place: 'chase', at: [5.6, 0, -26.3, -H] },                 // the lens stays clear of the shelving at every angle
    { place: 'luka', at: [7.16, 0, -25.21, -2.18] },          // 1.9 m behind him, 35° off his back axis, not moving
    { act: [['chase', 'idle'], ['luka', 'idle']] },
    { expr: [['chase', 'determined'], ['luka', 'neutral']] },
    { do: (c) => goggles(c, 'up') },
    { do: (c) => c.runSteps([pitchOrbit()]) },
    { say: 'chase', text: PITCH },
    // [TWO-SHOT · locked, side-on, the machine between them on the floor] A stare. The tube flickers; a truck reverses.
    { place: 'luka', at: [5.65, 0, -27.3, H] },
    { place: 'chase', at: [7.2, 0, -27.3, -H] },
    { expr: [['luka', 'stunned'], ['chase', 'neutral']] },
    { do: (c) => { const a = c.world.actor('chase'); if (a) a.rig.face.mouth('smile'); } },   // hopeful
    { prop: 'machine_chair', fn: (o) => { o.userData.seat.rotation.y = 1.4; } },   // swivelled side-on, so its back doesn't hide the machine
    { shot: 'CAM', pos: [6.42, 1.55, -24.5], look: [6.42, 0.95, -27.3], fov: 52 },
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
    { shot: 'CAM', pos: [6.4, 2.3, -24.1], look: [6.4, 0.8, -27.3], fov: 62 },
    { wait: 0.4 },
    { act: [['luka', 'nod', { dur: 1.2 }], ['chase', 'nod', { dur: 1.2 }]] },
    { wait: 1.8 },
  ];
})();
