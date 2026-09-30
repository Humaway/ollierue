// ============================================================ CONTENT: 1.6 ("© 1987") and 1.7 ("Reverse Charges")
// SPEC §9. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
// Mini-games: buglist, dial {mode:'1987'} (61-mg-keypad-buglist-dial.js; the dial says its own Chase/Luka lines).
(() => {
  const PI = Math.PI, H = PI / 2;
  const say = (id, text, o) => Object.assign({ say: id, text }, o);

  // ---------------------------------------------------------- the backroom for 1.6–1.7
  // The finished machine stands in the middle of the floor (the set shows it from 1.6): it and its chair get a
  // collider while these two scenes run. In 1.6 the targets sheet (the Bug List, on its back) and a biro lie on the bench.
  const MACHINE_COL = [5.95, -27.8, 6.9, -26.0];
  const SHEET = [4.62, 0.938, -29.31];   // on the bench's one clear patch, between the phone in bits and the trays
  let kit = null, pen = null, watching = false;
  function room(c) {
    const cols = SETS.reddy.colliders;
    if (!cols.includes(MACHINE_COL)) cols.push(MACHINE_COL);
    if (!kit) {
      const tex = canvasTex(176, 128, (x, w, h) => {   // the back of this week's targets: the table shows through, Luka's biro on top
        x.fillStyle = '#fbfaf3'; x.fillRect(0, 0, w, h);
        x.fillStyle = 'rgba(40,40,40,.09)';
        for (let i = 0; i < 6; i++) x.fillRect(10, 18 + i * 14, w - 20, 1.5);
        x.fillRect(w - 50, 12, 1.5, 84);
        x.fillStyle = '#1f3a93'; x.fillRect(12, 9, 64, 3);
        let s = 3;
        for (let i = 0; i < 7; i++) {
          const y = 22 + i * 11;
          x.fillRect(12, y, 4, 3);
          for (let k = 20; k < 60 + ((s = (s * 29 + 7) % 61) + 20); k += 7 + (s % 4)) x.fillRect(k, y + (k % 3) - 1, 4 + (k % 5), 2);
        }
      }, { key: 'buglist_sheet' });
      const b = new Builder();
      b.plane(0.27, 0.2, matTex(tex), [0, 0, 0], [-H, 0, 0]);
      kit = b.done({ floor: false });
      kit.position.set(SHEET[0], SHEET[1], SHEET[2]); kit.rotation.y = 0.04;
      const p = new Builder();                          // a clear biro with a blue cap, tip at the origin
      p.cyl(0.0005, 0.0035, 0.012, 6, mat(0x2a2c30), [0, 0.006, 0]);
      p.cyl(0.0042, 0.0042, 0.1, 6, mat(0xdde6ee), [0, 0.062, 0]);
      p.cyl(0.0046, 0.0046, 0.035, 6, mat(0x1f3a93), [0, 0.128, 0]);
      pen = p.done({ floor: false });
      pen.visible = false;
    }
    const root = c.world.prop('machine')?.parent;
    if (root && flow.sceneId === '1.6' && kit.parent !== root) { root.add(kit); root.add(pen); }
    kit.visible = false; pen.visible = false;
    if (watching) return;
    watching = true;
    const u = () => {
      const id = flow.sceneId;
      if (id !== '1.6' && kit.parent) { kit.removeFromParent(); pen.removeFromParent(); }
      if (id === '1.6' || id === '1.7') return;
      removeUpdate(u); watching = false;
      const i = cols.indexOf(MACHINE_COL); if (i >= 0) cols.splice(i, 1);
    };
    addUpdate(u);
  }
  const phoneOut = (id, on) => ({ do: (c) => { const a = c.world.actor(id), p = a && a.rig.attach.phone; if (p) p.visible = on; } });
  const clockAt = (h, m) => ({ prop: 'clock_hands', fn: (o) => o.userData.set(h, m) });
  async function flicker(c, n) {           // the backroom tube drops out a couple of times
    const t = c.world.prop('tube');
    if (!t || c.flow.skipping) return;
    c.sfx('tube_flicker');
    for (let i = 0; i < n; i++) { t.userData.off = true; await c.wait(0.09); t.userData.off = false; await c.wait(0.13); }
  }
  // a readable card that moves (the push on the crash screen, the date wheel): repaints the card the shot put up
  async function cardSteps(c, kind, list, gap) {
    for (const d of list) { if (c.flow.skipping) return; c.ui.card(kind, d); await c.wait(gap); }
  }

  // The counter monitor's crash screen (the set's 'crash' texture, readable): "JARVIS © 1987–2026 JARVIS SYSTEMS.
  // All rights reserved." `zoom` pushes in on one spot of it: on 'year' (the 1987) or 'owner' (JARVIS SYSTEMS); the spot
  // reaches dead centre at zoom `max` (or at once with `hold`).
  CARDS.crash1987 = (cx, w, h, d) => {
    const F = (px, b = 'bold') => `${b} ${px}px Arial, "Liberation Sans", "DejaVu Sans", sans-serif`;
    const X = 24, Y = 24, W = w - 48, S = h - 48, k = W / 256, z = d.zoom || 1;
    cx.fillStyle = '#16181c'; cx.fillRect(0, 0, w, h);
    cx.save(); cx.beginPath(); cx.rect(X, Y, W, S); cx.clip();
    cx.font = F(22);
    const a = cx.measureText('JARVIS © 1987–2026').width, b = cx.measureText('JARVIS © ').width, yr = cx.measureText('1987').width;
    const fx = d.on === 'year' ? 128 - a / 2 + b + yr / 2 : 128, fy = d.on === 'year' ? 82 : d.on === 'owner' ? 110 : 80;
    const u = d.hold ? 1 : Math.min(1, (z - 1) / ((d.max || 3) - 1));
    cx.translate(X + W / 2, Y + S / 2); cx.scale(k * z, k * z); cx.translate(-(128 + (fx - 128) * u), -(80 + (fy - 80) * u));
    cx.fillStyle = '#0c1733'; cx.fillRect(0, 0, 256, 160);
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.font = F(14); cx.fillStyle = '#cfd8ea'; cx.fillText('JARVIS has stopped responding.', 128, 30);
    cx.fillStyle = '#2f6fd6'; cx.fillRect(40, 48, 176, 2);
    cx.font = F(22); cx.fillStyle = '#ffffff'; cx.fillText('JARVIS © 1987–2026', 128, 82);
    cx.font = F(17); cx.fillText('JARVIS SYSTEMS.', 128, 110);
    cx.font = F(13); cx.fillStyle = '#9fb0cc'; cx.fillText('All rights reserved.', 128, 134);
    cx.restore();
    const g = cx.createLinearGradient(X, Y, X + W * 0.6, Y + S); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fillRect(X, Y, W, S);
  };
  CARDS.crash1987.size = [880, 568];
  // The counter monitor, square on from a metre back: its screen sits exactly where the card draws the screen (fov 32,
  // card at 62% of the frame height), so the readable card lands on the 3D screen without a jump.
  const MON = { shot: 'CAM', pos: [6.4, 1.3, -10.023], look: [6.4, 1.3, -9.025], fov: 32 };
  const CRASH = (on, zoom, hold) => Object.assign({ card: ['crash1987', { on, zoom, hold }] }, MON);

  // ---------------------------------------------------------- the Bug List (2.5 and the post-credits use it)
  const LIST = { title: 'JARVIS — bugs', items: [], skull: true };
  const fillList = () => {
    LIST.items = (state.bugs || []).map((id) => (BUGS.find((b) => b.id === id) || {}).text).filter(Boolean).concat(DOOR_BUG);
    return LIST;
  };
  ITEMS.bug_list = {
    name: 'Bug List', desc: 'The Bug List.',
    icon(cx, w, h) {
      cx.save(); cx.translate(w / 2, h / 2); cx.rotate(-0.08);
      cx.fillStyle = '#fdfdfb'; cx.fillRect(-w * 0.28, -h * 0.38, w * 0.56, h * 0.76);
      cx.fillStyle = '#1f3a93'; cx.fillRect(-w * 0.2, -h * 0.3, w * 0.3, h * 0.035);
      for (let i = 0; i < 6; i++) cx.fillRect(-w * 0.2, -h * 0.2 + i * h * 0.09, w * (0.22 + ((i * 7) % 5) * 0.04), h * 0.025);
      cx.restore();
    },
    async examine(c) {                     // a readable card until YES
      c.ui.card('list', fillList());
      await c.wait(0.15);
      const t = clock.t;
      await waitUntil(() => { if (TEST.auto) return clock.t - t > 0.5; if (!input.pressed('yes')) return false; input.consume('yes'); return true; });
      c.ui.card(null);
    },
  };

  // =================================================================== 1.6 — "© 1987"
  // [OTS · behind Chase's pointing arm, then PUSH IN] through the backroom door, down the corridor, to the counter monitor
  const OTS_DOOR = { shot: 'CAM', pos: [6.32, 1.66, -26.25], look: [6.42, 1.3, -9.03], fov: 40 };
  const PUSH_DOWN = { shot: 'CAM', pos: [6.32, 1.66, -26.25], look: [6.42, 1.3, -9.03], fov: 40, to: { pos: MON.pos, look: MON.look, fov: MON.fov }, dur: 4.6 };
  const SHEET_TOP = { shot: 'INSERT', at: SHEET, from: [4.62, 1.74, -29.26], fov: 40 };   // top-down on the sheet, frame-up = the wall
  const WRITE_AT = [4.55, 0, -28.75, PI], PEN_AT = [4.55, 0.94, -29.25];
  const PEN_CLOSE = { shot: 'CAM', pos: [4.75, 1.065, -29.03], look: [4.56, 0.945, -29.25], fov: 34 };
  // the end of the scene, by the lost property box: Chase spirals, Luka steps in, the heroic low angle (used twice)
  const CH_SPIRAL = [8.35, 0, -25.3, PI], LU_OFF = [6.2, 0, -25.3, H], LU_IN = [7.35, 0, -25.3, H];
  const TWO_IN = { shot: 'CAM', pos: [7.9, 1.55, -27.7], look: [7.85, 1.5, -25.1], fov: 32 };
  const LOW_LUKA = { shot: 'CAM', pos: [8.15, 0.95, -26.1], look: [7.35, 1.62, -25.3], fov: 40 };   // from low beside Chase

  SCENES['1.6'] = {
    title: '© 1987', set: 'reddy', env: 'day', time: 'Tue 29 Sep 2026, 11:41',
    playable: ['luka'], swap: false, hud: null, music: null,   // the tube's hum; the Reddy tune while the list is written
    spawn: { luka: [7.45, 0, -25.9, -1.02], chase: [6.7, 0, -25.35, 2.12] },
    hotspots: [
      { id: 'write', at: [4.4, 0, -29.2], r: 1.05, verb: 'Write', only: 'luka', once: true, flag: 'list_go', do: () => {} },
      { id: 'kettle', at: 'kettle', r: 1.0, verb: 'Use', kettle: true },
    ],
    steps: [
      ['cutscene', '1.6_when'],
      ['control', 'luka'],
      ['objective', 'Write the bug list.'],
      ['do', (c) => c.music('reddy', { fade: 2 })],
      ['roam', { until: 'list_go', auto: (c) => c.hotspots.trigger('write') }],
      ['cutscene', '1.6_write'],
      ['minigame', 'buglist', {}],
      ['objective', null],
      ['cutscene', '1.6_door'],
    ],
    grants: { flags: { list_go: true }, items: ['bug_list'], bugs: ['popups', 'restarts', 'margarine', 'optin', 'sure'] },
  };

  CUTSCENES['1.6_when'] = [
    { do: room },
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    { prop: 'backroom_door', fn: (o) => { o.rotation.y = 1.5; o.userData.open = true; } },
    { shot: 'CLOSE', on: 'luka' },
    { wait: 0.4 },
    say('luka', 'Okay. When did he make it?'),
    // [OTS · behind Chase's pointing arm, then PUSH IN] Through the backroom door, down the corridor, to the counter
    // monitor. JARVIS's crash screen: "JARVIS © 1987–2026 JARVIS SYSTEMS. All rights reserved." The push stops on 1987.
    { face: 'chase', to: 0, dur: 0 },
    { act: [['chase', 'point']] },
    OTS_DOOR,
    { wait: 1.3 },
    PUSH_DOWN,
    { wait: 4.7 },
    CRASH('year', 1),
    { wait: 0.3 },
    { do: (c) => cardSteps(c, 'crash1987', [1.1, 1.3, 1.6, 2, 2.45, 2.9, 3.3, 3.65, 3.9, 4.07, 4.16, 4.2].map((zoom) => ({ on: 'year', zoom, max: 4.2 })), 0.06) },
    { wait: 0.5 },
    say('chase', '1987.'),
    // [INSERT] Luka's phone: Rue's bio.
    { act: [['chase', 'idle'], ['luka', 'type']] },
    phoneOut('luka', true),
    { shot: 'INSERT', at: 'luka', card: ['phone', { title: 'Rue', lines: ['CEO', 'Bachelor of Business Studies, Trinity College Dublin', "Class of '88"] }] },
    { wait: 0.6 },
    say('luka', "Rue. CEO. Bachelor of Business Studies, Trinity College Dublin. ^ He'd have been at uni in '87. Nineteen."),
    // [TWO-SHOT]
    phoneOut('luka', false),
    { act: [['luka', 'idle']] },
    { face: 'chase', to: 'luka', dur: 0 },
    { shot: 'TWO', on: ['chase', 'luka'] },
    { expr: [['chase', 'determined']] },
    say('chase', "Trinity College. 1987. That's where he built it."),
    // [INSERT · held one second too long] The words JARVIS SYSTEMS on the crash screen. Neither of them reads them.
    CRASH('owner', 1.5, true),
    { wait: 3.4 },
    { expr: [['chase', 'neutral']] },
    { shot: 'SET', cam: 'backroom' },         // back in the room before the camera hands over to play
    { wait: 0.3 },
    { prop: 'backroom_door', fn: (o) => { o.userData.open = false; } },
  ];

  // Luka writes the list: top-down on the back of this week's sales targets, the skull showing through.
  CUTSCENES['1.6_write'] = [
    { place: 'luka', at: WRITE_AT },
    { place: 'chase', at: [5.45, 0, -27.95, -2.22] },
    { act: [['luka', 'write'], ['chase', 'idle']] },
    { do: (c) => { if (kit) kit.visible = true; } },
    SHEET_TOP,
    { wait: 0.5 },
    say('luka', "Pop-ups. Random restarts. The margarine thing. Crashes on opt-in. Asks if you're sure you're sure."),
    { do: (c) => { c.cam.shot(SHEET_TOP); c.cam.cutscene = false; } },   // hold the top-down into the mini-game
  ];

  CUTSCENES['1.6_door'] = [
    // still the mini-game's top-down on the list (the lines play over the shot above them), Luka writing
    { act: [['luka', 'write']] },
    { face: 'chase', to: 'luka', dur: 0 },
    SHEET_TOP,
    say('chase', 'Door takes nine seconds.'),
    say('luka', "That's not JARVIS."),
    say('chase', "Isn't it though?"),
    // [CLOSE · the pen, hovering] He writes it down. "Door takes nine seconds" joins the list.
    { do: (c) => { if (!pen) return; pen.visible = true; pen.position.set(PEN_AT[0], PEN_AT[1] + 0.028, PEN_AT[2]); pen.rotation.set(-0.55, 0, -0.35); } },
    PEN_CLOSE,
    { wait: 1.4 },
    { do: async (c) => {                   // the tip drops to the paper and writes a short line
      if (!pen || c.flow.skipping) return;
      for (let i = 0; i <= 18; i++) { pen.position.set(PEN_AT[0] + i * 0.0035, PEN_AT[1] + (i ? 0 : 0.01), PEN_AT[2] + (i % 3 ? 0.002 : -0.002)); await c.wait(0.05); }
    } },
    { wait: 0.3 },
    { do: fillList },
    { do: (c) => { if (pen) pen.visible = false; } },
    { act: [['luka', 'write']] },
    Object.assign({ card: ['list', LIST] }, SHEET_TOP),
    { wait: 2.4 },
    { item: 'bug_list' },
    { wait: 0.4 },
    // [TOP-DOWN · Chase] He stops. His hands drift up toward his head.
    { music: null, fade: 1.5 },
    { place: 'chase', at: CH_SPIRAL },
    { place: 'luka', at: LU_OFF },
    { act: [['luka', 'idle'], ['chase', 'idle']] },
    { expr: [['chase', 'worried']] },
    { shot: 'TOP', on: 'chase', dist: 1.05 },
    { wait: 1.0 },
    { act: [['chase', 'hands_head']] },
    { wait: 0.6 },
    say('chase', "Wait. Wait wait wait. What if we're gone too long? We're on till five. If Luke walks in and we're not here — the displays — the alarms — there's four phones in a swivel chair, Luka—"),
    // [TWO-SHOT · Luka steps into frame, eye level]
    TWO_IN,
    { move: 'luka', to: LU_IN },
    { face: 'chase', to: 'luka' },
    say('luka', "Mate. Mate. It's time travel."),
    { act: [['chase', 'idle']] },
    say('chase', 'So?'),
    // [LOW · Luka, heroic] The first low angle on Luka. It's funny because he's completely wrong.
    { expr: [['luka', 'determined']] },
    LOW_LUKA,
    say('luka', "So we can take as long as we want. We leave now, we come back a second later. That's how it works."),
    say('chase', 'Is it?'),
    say('luka', "It's time travel. We'll be back before lunch."),
    // [INSERT] The wall clock: 11:57.
    clockAt(11, 57),
    { shot: 'INSERT', at: 'wall_clock', card: ['clock', { time: '11:57', sec: 12 }] },
    { wait: 0.6 },
    say('chase', 'Lunch is at twelve.'),
    // [LOW · Luka, the same heroic angle, unmoved]
    LOW_LUKA,
    say('luka', "Then we'll be back before twelve."),
    { wait: 0.8 },
  ];

  // =================================================================== 1.7 — "Reverse Charges"
  // Chase dials from the machine's chair; for the call both boys stand and lean in over the machine, one either side of it
  // (Chase at the speaker's corner).
  const SEAT = [6.45, 0, -26.35, PI], LU_CALL = [7.1, 0, -26.7, -2.3], CH_CALL = [5.75, 0, -26.75, 2.61];
  const DIAL_OTS = { shot: 'CAM', pos: [6.15, 1.5, -25.72], look: [6.55, 0.92, -27.35], fov: 50 };   // over Chase's left shoulder
  const WIDE_LOW = { shot: 'CAM', pos: [6.45, 0.55, -29.15], look: [6.43, 1.35, -26.7], fov: 55 };
  const EMPTY = { shot: 'INSERT', at: 'backroom_wide' };   // the exact frame 3.6 opens on (mirror)
  function standCall(c) {
    const a = c.world.actor('chase'), l = c.world.actor('luka');
    if (a) { a.place(CH_CALL); a.rig.seated = false; a.play('look_down'); }
    if (l) { l.place(LU_CALL); l.face('chase', 0); l.play('look_down'); }
  }
  async function lean(c) {
    const a = c.world.actor('chase');
    for (let i = 1; i <= 8 && a && !c.flow.skipping; i++) { const k = (1 - Math.cos(i / 8 * PI)) / 2; a.place([CH_CALL[0] + 0.08 * k, 0, CH_CALL[2] - 0.13 * k, CH_CALL[3]]); await c.wait(0.035); }
  }
  async function smoke(c) {                // smoke curls up from where the machine stood to the flickering tube
    for (let i = 0; i < 8 && !c.flow.skipping; i++) {
      c.world.puff([6.4 + Math.sin(i * 1.7) * 0.15, 0.3, -27.2], { n: 8, color: 0xa4a6aa, speed: 0.2, life: 3, gravity: -1.7 });
      await c.wait(0.4);
    }
  }

  SCENES['1.7'] = {
    title: 'Reverse Charges', set: 'reddy', env: 'day', time: 'Tue 29 Sep 2026, 11:58',
    playable: ['chase'], swap: false, hud: null, music: null,
    spawn: { chase: [8.2, 0, -25.2, -2.3], luka: [7.3, 0, -26.4, -2.6] },
    hotspots: [
      { id: 'machine', at: [6.45, 0, -25.95], r: 0.9, verb: 'Dial', only: 'chase', once: true, flag: 'dial_go', do: () => {} },
      { id: 'kettle', at: 'kettle', r: 1.0, verb: 'Use', kettle: true },
    ],
    steps: [
      ['do', room],
      ['control', 'chase'],
      ['do', (c) => c.music('reddy', { fade: 1 })],
      ['objective', 'Call 1987.'],
      ['roam', { until: 'dial_go', auto: (c) => c.hotspots.trigger('machine') }],
      ['do', (c) => {   // Chase in the machine's chair, Luka beside him holding up his phone; over Chase's shoulder
        const a = c.world.actor('chase'), l = c.world.actor('luka');
        if (a) { a.place(SEAT); a.play('sit', { h: 0.48 }); }
        if (l) { l.place(LU_CALL); l.face('chase', 0); l.play('point'); if (l.rig.attach.phone) l.rig.attach.phone.visible = true; }
        c.cam.shot(DIAL_OTS);
      }],
      ['minigame', 'dial', { mode: '1987' }],
      ['objective', null],
      ['cutscene', '1.7_call'],
    ],
    grants: { flags: { dial_go: true } },
  };

  CUTSCENES['1.7_call'] = [
    { music: null, fade: 0.6 },              // the ring and the call play over the store's ambience only
    phoneOut('luka', false),
    { do: standCall },
    // [INSERT] The years blur past on the wheel: 2026… 2001… 1993… 1987. It clicks to 06 / 10 / 1987.
    // (straight down over the machine's phones, clear of both boys either side of it)
    { shot: 'CAM', pos: [6.4, 1.55, -26.55], look: [6.35, 0.8, -27.35], fov: 36, card: ['wheel', { dd: 29, mm: 9, yyyy: 2026, hh: 11, mi: 58, spin: true }] },
    { do: (c) => cardSteps(c, 'wheel', [2019, 2011, 2001, 1997, 1993, 1990, 1988].map((yyyy) => ({ dd: 29, mm: 9, yyyy, hh: 11, mi: 58, spin: true })), 0.12) },
    { do: (c) => { if (!c.flow.skipping) c.ui.card('wheel', { dd: 6, mm: 10, yyyy: 1987, hh: 11, mi: 58 }); } },
    { sfx: 'clunk' },
    { wait: 1.4 },
    // [WIDE · low, the machine in the foreground] Both boys lean in behind it. Ringing: an old double trill, crackling.
    WIDE_LOW,
    { sfx: 'trill' }, { sfx: 'spark', vol: 0.12 }, { wait: 0.6 }, { sfx: 'spark', vol: 0.1 }, { wait: 2.4 },
    { sfx: 'trill' }, { sfx: 'spark', vol: 0.12 }, { wait: 0.6 }, { sfx: 'spark', vol: 0.1 }, { wait: 1.7 },
    say('operator', 'You have a reverse-charge call from—'),
    // [CLOSE · Chase, leaning into the lens]
    { expr: [['chase', 'determined']] },
    { act: [['chase', 'idle']] },
    { shot: 'CAM', pos: [6.1, 1.45, -27.35], look: [5.78, 1.62, -26.72], fov: 40 },
    { do: (c) => { lean(c); } },            // he leans 0.15 m in toward the lens as he says it
    say('chase', 'Chase and Luka! Optus Redcliffe!'),
    // [TWO-SHOT]
    { expr: [['chase', 'neutral']] },
    { act: [['luka', 'idle'], ['chase', 'idle']] },
    { place: 'chase', at: CH_CALL },
    { face: 'luka', to: 'chase', dur: 0 }, { face: 'chase', to: 'luka', dur: 0 },
    { shot: 'CAM', pos: [8.25, 1.55, -27.55], look: [6.45, 1.42, -26.72], fov: 44 },
    say('luka', 'Why is it reverse charges?'),
    say('chase', "Because I'm not paying for a call to 1987, Luka. Have you seen international rates?"),
    { face: 'luka', to: 'speaker' }, { face: 'chase', to: 'speaker' },
    { act: [['luka', 'look_down'], ['chase', 'look_down']] },
    say('operator', '—Chase and Luka, Optus Redcliffe. Will you accept the charges?'),
    // [PUSH IN · slow, on the phone's speaker grille] Silence on the line. Rain, far away. Then a tired Dublin voice.
    { expr: [['chase', 'worried'], ['luka', 'worried']] },
    { shot: 'CAM', pos: [6.16, 1.2, -26.85], look: [6.16, 1.03, -27.45], fov: 30, to: { pos: [6.16, 1.1, -27.2] }, dur: 6 },
    { loop: 'rain', vol: 0.12, fade: 1.2 },
    { wait: 3.2 },
    say('voice', '…Ah, go on. Yes.', { speed: 'slow' }),
    { wait: 0.4 },
    // [WIDE] White floods the frame.
    { loop: 'rain', stop: true, fade: 0.4 },
    { expr: [['chase', 'stunned'], ['luka', 'stunned']] },
    EMPTY,
    { sfx: 'flash_hum' },
    { wait: 0.5 },
    { sfx: 'zap' },
    { do: (c) => c.ui.fade('out', options.reduceFlashing ? 1.4 : 0.5, '#fff') },
    // [WIDE · locked] The empty backroom. Smoke curls up to the flickering tube. The swivel chair turns slowly to a stop.
    { despawn: 'chase' }, { despawn: 'luka' },
    { do: (c) => { for (const n of ['machine_sign', 'machine_phones', 'machine_straightener']) { const o = c.world.prop(n); if (o) o.visible = false; } } },
    { prop: 'machine_chair', fn: (o) => { o.userData.spin = 2.6; } },
    { wait: 0.6 },
    { do: (c) => { smoke(c); } },
    { do: (c) => c.ui.fade('in', 1.3) },
    { do: (c) => flicker(c, 3) },
    { wait: 1.6 },
    { do: (c) => flicker(c, 2) },
    { wait: 1.2 },
    // [INSERT] The wall clock, in jump cuts: 11:58. 11:59. 12:00.
    clockAt(11, 58),
    { shot: 'INSERT', at: 'wall_clock', card: ['clock', { time: '11:58', sec: 40 }] },
    { sfx: 'tick', vol: 0.6 },
    { wait: 1.1 },
    clockAt(11, 59),
    { shot: 'INSERT', at: 'wall_clock', card: ['clock', { time: '11:59', sec: 40 }] },
    { sfx: 'tick', vol: 0.6 },
    { wait: 1.1 },
    clockAt(12, 0),
    { shot: 'INSERT', at: 'wall_clock', card: ['clock', { time: '12:00', sec: 0 }] },
    { sfx: 'tick', vol: 0.6 },
    { wait: 1.6 },
    // Title card: END OF ACT ONE
    { fade: 'out', dur: 0.8 },
    { title: 'END OF ACT ONE', dur: 3 },
  ];
})();
