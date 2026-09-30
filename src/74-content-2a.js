// ============================================================ CONTENT: 2.1 "Are Yous the Call?", 2.2 "Plastic Money", 2.3 "Roll Call"
// SPEC §10. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
(() => {
  const PI = Math.PI, H = PI / 2;
  const snap = (name) => ({ do: () => MINIGAMES.final_yes && MINIGAMES.final_yes.snap(name) });

  // ---------------------------------------------------------- helpers (run from `do` steps, never per frame)
  // Luka's 1987 habit: a glance at Chase before he speaks (head only, clamped like the idle habit).
  function glance(c, id = 'luka', at = 'chase') {
    const a = c.world.actor(id), b = c.world.actor(at);
    if (!a || !b) return;
    let d = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z) - a.rotY;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    return a.play('glance', { dur: 1.3, yaw: Math.max(-1.3, Math.min(1.3, d)) });
  }
  // the camera catches the glance: start it without waiting, snap while the head is turned (0.33–0.98 s)
  const glanceSnap = (name, after = 0.45) => [{ do: (c) => { glance(c); } }, { wait: 0.55 }, snap(name), { wait: after }];
  // arms folded (Bernie, 2.2): the clap pose held still, hands together at the chest
  if (!ANIMS.fold) { ANIMS.fold = (r, t, p) => ANIMS.clap(r, 0, p); ANIMS.fold.upper = true; }
  const habit = (c) => { const a = c.world.actor('luka'); if (a) a.habit = 'glance'; };
  const sitThen = (id, anim) => [{ act: [[id, 'sit']] }, { wait: 0.2 }, { act: [[id, anim]] }];   // seated upper-body anims need `seated` first
  // a prop eased from one position to another (the tween removes itself; instant while skipping)
  function slide(c, name, from, to, dur = 0.8) {
    const o = c.world.prop(name);
    if (!o) return;
    o.visible = true;
    let t = 0;
    const f = (dt) => {
      t = Math.min(1, t + dt / dur);
      const k = t * t * (3 - 2 * t);
      o.position.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k);
      if (t >= 1) removeUpdate(f);
    };
    if (c.flow.skipping) f(dur); else addUpdate(f);
  }
  // the card canvas drifts from the top of the poster to its last line: a slow tilt down (CSS transition only)
  let tiltN = 0;
  function tiltCard(on) {
    const cv = document.querySelector('#cardwrap canvas'), n = ++tiltN;
    if (!cv) return;
    if (!on) { cv.style.transition = ''; cv.style.transform = ''; return; }
    cv.style.transition = 'none'; cv.style.transform = 'translateY(24%) scale(1.5)';
    requestAnimationFrame(() => requestAnimationFrame(() => { if (n === tiltN) { cv.style.transition = 'transform 4.6s ease-in-out'; cv.style.transform = 'translateY(-24%) scale(1.5)'; } }));
  }

  // ===================================================================== 2.1 — "Are Yous the Call?"
  const MACHINE_FLOOR = [-22.9, 0.47, 4.25], MACHINE_DESK = [-20.88, 1.25, 5.62], MACHINE_CUPBOARD = [-24.75, 1.24, 2.72];

  // the landing: machine unwrapped on the floor with the swivel chair and the "Yes" sign; Des on the phone at his desk
  function landingDress(c) {
    const P = (n) => c.world.prop(n);
    const m = P('machine'); if (m) { m.visible = true; m.position.set(...MACHINE_FLOOR); m.rotation.set(0, 0.6, 0.25); }
    const w = P('machine_wrap'); if (w) w.visible = false;
    const wi = P('machine_wire'); if (wi) wi.visible = false;
    for (const n of ['swivel_chair', 'yes_sign', 'machine_prepaid']) { const o = P(n); if (o) o.visible = true; }
    const cd = P('cupboard_door'); if (cd) cd.rotation.y = 0;
    habit(c);
  }
  // the phones smoke on the floor, then again on the desk inside Des's newspaper
  const puff = (at, n = 22) => ({ do: (c) => c.world.puff(at, { n, color: 0x9a9a9a, speed: 0.35, life: 2.4 }) });
  const tidy = { do: (c) => { for (const n of ['swivel_chair', 'yes_sign']) { const o = c.world.prop(n); if (o) o.visible = false; } } };
  const phoneCard = (tone) => ['phone', { tone, battery: 1, status: 'noservice', lines: ['No Service'] }];   // their phones are on 1%
  // Des's desk-phone receiver: a cream 1987 handset in his right hand ('phone' shows rig.attach.brick when there is one)
  function handset(c) {
    const d = c.world.actor('des');
    if (!d || (d.rig.attach.brick && d.rig.attach.brick.name === 'handset')) return;
    const b = new Builder(), cream = mat(0xd8cbae), grille = mat(0x3a3530);
    b.box(0.042, 0.2, 0.028, cream, [0, 0.03, 0]); b.box(0.062, 0.062, 0.05, cream, [0, -0.07, 0]); b.box(0.062, 0.062, 0.05, cream, [0, 0.13, 0]);
    for (const y of [-0.07, 0.13]) for (const z of [-0.027, 0.027]) for (const [dx, dy] of [[0, 0], [0.013, 0.013], [-0.013, 0.013], [0.013, -0.013], [-0.013, -0.013], [0.019, 0], [-0.019, 0], [0, 0.019], [0, -0.019]]) b.box(0.007, 0.007, 0.004, grille, [dx, y + dy, z]);
    const h = b.done(); h.name = 'handset'; h.visible = false;
    d.rig.attach.gripR.add(h); d.rig.attach.brick = h;
  }
  // [ECU] close on the receiver's grille, looking east past it to the rain on the lodge window (Des faces his desk)
  function receiverECU(c) {
    const h = c.world.actor('des')?.rig.attach.brick;
    if (!h) return c.cam.shot({ shot: 'INSERT', at: 'receiver' });
    h.updateWorldMatrix(true, false);
    const m = h.localToWorld(new THREE.Vector3(0, 0.13, 0));
    c.cam.shot({ shot: 'CAM', pos: [m.x - 0.3, m.y - 0.02, m.z + 0.07], look: [m.x + 0.05, m.y + 0.02, m.z], fov: 30 });
  }
  // the masthead of Des's paper, torn round the phones: the date big enough to read
  CARDS.masthead = (cx, w, h, d) => {
    cx.translate(w / 2, h / 2); cx.rotate(-0.035);
    cx.shadowColor = 'rgba(0,0,0,.4)'; cx.shadowBlur = 26; cx.shadowOffsetY = 10;
    cx.fillStyle = '#ece4cf'; cx.fillRect(-w * 0.44, -h * 0.36, w * 0.88, h * 0.72);
    cx.shadowColor = 'transparent';
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#22201c';
    cx.font = 'bold 66px Georgia, "Times New Roman", serif'; cx.fillText(d.name, 0, -h * 0.15, w * 0.8);
    cx.fillRect(-w * 0.4, -h * 0.02, w * 0.8, 4); cx.fillRect(-w * 0.4, h * 0.2, w * 0.8, 2);
    cx.font = 'italic bold 52px Georgia, "Times New Roman", serif'; cx.fillText(d.date, 0, h * 0.09, w * 0.78);
    cx.fillStyle = 'rgba(40,36,30,.35)'; for (let i = 0; i < 4; i++) cx.fillRect(-w * 0.4 + i * w * 0.205, h * 0.25, w * 0.18, 5);
  };
  CARDS.masthead.size = [900, 420];

  SCENES['2.1'] = {
    title: 'Are Yous the Call?', set: 'square', env: 'rain', time: 'Tue 6 Oct 1987, 11:58',
    playable: ['luka'], swap: false, hud: null, music: null,      // the HUD appears for the first time at the machine INSERT
    spawn: { des: [-21.5, 0.46, 5.0, H], luka: 'lodge_floor_luka', chase: 'lodge_floor_chase' },
    hotspots: [
      // --- hide the machine
      { id: 'cupboard', at: [-24.7, 0.46, 3.4], r: 0.8, verb: 'Open', once: true, flag: 'machine_hidden',
        when: (s) => !s.flags.machine_hidden,
        steps: [
          { do: (c) => {   // "Put it in? [YES]": one button (NO is disabled and taken off the box)
            const p = c.ask('Put it in?', { noDisabled: true });
            document.querySelector('#dlg .opts')?.children[1]?.remove();
            return p;
          } },
          { face: 'luka', to: [-24.75, 2.72] },
          { prop: 'cupboard_door', rotY: 1.9 }, { sfx: 'creak' }, { wait: 0.5 },
          { hold: 'luka', prop: null }, { prop: 'machine', pos: MACHINE_CUPBOARD, fn: (o) => o.rotation.set(0, 0, 0) },
          { wait: 0.4 }, { prop: 'cupboard_door', rotY: 0 }, { sfx: 'thud', vol: 0.5 },
          { objective: 'Find Rue.' },
          { hud: { bars: 2 }, anim: 1 },
        ] },
      { id: 'kettle', at: 'kettle', r: 0.75, verb: 'Use', kettle: true },
      // --- examine lines (Luka)
      { id: 'pigeonholes', at: [-24.75, 0.46, 5.0], r: 0.75, text: 'Hundreds of little wooden boxes full of letters. Imagine getting a letter.' },
      { id: 'key_board', at: [-22.52, 0.46, 2.75], r: 0.6, text: 'Every key in the college. Des knows which is which. Des knows everything.' },
      { id: 'radio', at: [-24.4, 0.46, 6.95], r: 0.7, verb: 'Listen',
        steps: [{ sfx: 'tick', vol: 0.4 }, { say: 'radio', text: '…and the forecast for Dublin: rain, followed by rain, clearing to rain.', name: 'RADIO' }] },
      { id: 'calendar', at: [-23.75, 0.46, 6.95], r: 0.7, text: "October 1987. This month's picture is a donkey." },
      { id: 'desk_phone', at: [-21.55, 0.46, 4.6], r: 0.5, text: 'The phone that said yes.' },
      { id: 'lost_property', at: [-23.55, 0.46, 3.25], r: 0.6, text: 'Gloves. Umbrellas. A bicycle key on a tag that says 1979.' },
      { id: 'newspaper', at: [-20.95, 0.46, 3.95], r: 0.6,
        steps: [{ say: 'luka', text: "Everyone's leaving. London, Boston, Sydney." }, { say: 'chase', text: 'We came the other way.' }] },
      { id: 'photo', at: [-22.1, 0.46, 7.0], r: 0.6, text: 'A bell tower in the middle of the square. Des has three photos of it.' },
      { id: 'des', at: 'des', r: 1.2, verb: 'Talk', by: 'des', when: (s) => !s.flags.machine_hidden, text: ['Tea?', "Mind the cobbles, they're wet."] },
      { id: 'des_hidden', at: 'des', r: 1.2, verb: 'Talk', by: 'des', when: (s) => !!s.flags.machine_hidden,
        text: ['Tea?', "Mind the cobbles, they're wet.", 'That thing of yours is safe. Nobody opens the cupboard.'] },
      // --- the lodge door (1987: heavy wood, creaks)
      { id: 'lodge_exit', at: [-21.3, 0.46, 2.75], r: 0.6, verb: 'Open', when: (s) => !!s.flags.machine_hidden, door: { to: 'lodge_out', kind: 'wood' } },
      { id: 'lodge_enter', at: [-21.3, 0, 1.5], r: 0.55, verb: 'Open', door: { to: 'lodge_door_in', kind: 'wood' } },
      // --- outside: the bicycle chained to the railings (a plant for 2.6)
      { id: 'bike', at: 'bike', r: 0.9, text: 'Chained up. Rusty. Loved, once.' },
    ],
    steps: [
      ['cutscene', '2.1_landing'],
      ['steps', [
        { face: 'des', to: 'luka' },
        { say: 'des', text: "Stick it in the cupboard. Nobody opens the cupboard. I don't open the cupboard." },
        { do: (c) => { const d = c.world.actor('des'); if (d) { d.place('lodge_des_chair'); d.play('sit'); } } },
        { move: 'luka', to: [-21.62, 0.46, 5.95, H] },
        { hold: 'luka', prop: 'machine' },
      ]],
      ['control', 'luka'],
      ['follow', 'chase'],
      ['objective', 'Hide the machine.'],
      ['do', (c) => c.music('dublin', { fade: 3 })],
      ['roam', {
        until: 'machine_hidden',
        // help when stuck: Des tells you where
        hint: { after: 45, steps: [{ face: 'des', to: 'cupboard' }, { act: [['des', 'point']] },
          { say: 'des', text: "Stick it in the cupboard. Nobody opens the cupboard. I don't open the cupboard." }, { act: [['des', 'sit']] }] },
        async auto(c) { for (const id of ['pigeonholes', 'radio', 'des', 'newspaper', 'kettle', 'cupboard']) await c.hotspots.trigger(id); },
      }],
      ['roam', {   // out through the lodge door and the Front Gate arch: the long view with the Campanile dead centre
        until: () => world.setId === 'square' && !!world.actor('luka') && world.actor('luka').pos.x > -12.5,
        async auto(c) {
          await c.hotspots.trigger('lodge_exit'); await c.hotspots.trigger('bike');
          const a = c.world.actor('luka');
          a.place([-21.3, 0, 0.7, H]); await a.moveTo([-12, 0, 0.3]);
        },
      }],
    ],
    grants: { flags: { machine_hidden: true }, battery: 1, bars: 2 },
  };

  CUTSCENES['2.1_landing'] = [
    { fade: 'out', dur: 0 },
    { flag: 'machine_hidden', value: false },          // Continue from a lodge-kettle save replays 2.1 from here
    { do: landingDress }, { do: handset },
    { act: [['luka', 'lie_tangled'], ['chase', 'lie_tangled'], ['des', 'phone']] },
    { title: 'Tuesday, 6 October 1987' },
    // [ECU] A 1987 desk-phone receiver, close on its grille. Rain on the window behind. The last line of Act One, from this end.
    { do: receiverECU },
    { fade: 'in', dur: 0.6 },
    { wait: 1.0 },
    { say: 'des', text: '…Ah, go on. Yes.', speed: 'slow' },
    { wait: 0.4 },
    // [WIDE · the lodge, cramped] A white flash. When the smoke clears, two men in Optus polos lie tangled on the floor
    // with a swivel chair, a "Yes" sign and four phones. Des is in the foreground, back to camera, still holding the receiver.
    { face: 'des', to: [-22.9, 4.2] },
    { sfx: 'smoke_pop' }, puff([-22.9, 0.7, 4.2], 30),
    { shot: 'CAM', pos: [-20.7, 2.3, 6.05], look: [-23.2, 1.0, 3.95], fov: 58 },
    { flash: 1.4 },
    { wait: 0.8 },
    // [CLOSE · Des, eye level, unbothered]
    { shot: 'CLOSE', on: 'des' },
    { say: 'des', text: '…Are yous the call?' },
    // [LOW · from the floor, Luka looking up]
    { expr: [['luka', 'stunned']] },
    { shot: 'CAM', pos: [-23.1, 0.55, 3.3], look: [-22.6, 1.3, 4.9], fov: 55 },
    { say: 'luka', text: '…Yes?' },
    // [TWO-SHOT · locked] A stare, 3 seconds. Des hangs up and looks down at them. They look up at him. Somewhere, a kettle clicks off.
    { act: [['des', 'look_down']] }, { sfx: 'clunk', vol: 0.5 },
    { expr: [['chase', 'stunned']] },
    { shot: 'CAM', pos: [-24.6, 1.5, 6.1], look: [-22.4, 1.0, 4.6], fov: 50 },
    { stare: 3, ambient: [['kettle_click', 1.8]] },
    { say: 'des', text: 'Tea?' },
    { say: 'chase', text: '…Yes, please.' },
    // [INSERT · a hard cut on each line] Phone screens, one after another: No Service.
    tidy,
    { place: 'luka', at: [-22.3, 0.46, 5.9, H] }, { place: 'chase', at: [-22.9, 0.46, 5.0, H] },
    { act: [['luka', 'idle'], ['chase', 'idle']] }, { expr: [['luka', 'worried'], ['chase', 'worried']] },
    { shot: 'INSERT', at: 'luka', card: phoneCard('dark') },
    { say: 'luka', text: 'No service.' },
    { shot: 'INSERT', at: 'chase', card: phoneCard('light') },
    { par: [
      { say: 'chase', text: 'No service. No service. No service. No—' },
      { do: (c) => c.runSteps([
        { wait: 0.26 }, { shot: 'INSERT', at: MACHINE_FLOOR, from: [-22.7, 1.05, 4.75], card: phoneCard('light') },
        { wait: 0.26 }, { shot: 'INSERT', at: MACHINE_FLOOR, from: [-23.3, 1.0, 4.6], card: phoneCard('dark') },
        { wait: 0.26 }, { shot: 'INSERT', at: MACHINE_FLOOR, from: [-22.6, 0.95, 3.9], card: phoneCard('light') },
      ]) },
    ] },
    { shot: 'INSERT', at: MACHINE_FLOOR, from: [-23.2, 1.1, 3.95], card: phoneCard('dark') },
    { say: 'luka', text: "We're in a black spot." },
    // [CLOSE · Chase, dead serious]
    { expr: [['chase', 'determined']] },
    { shot: 'CLOSE', on: 'chase' },
    { say: 'chase', text: "We're in a black spot of TIME." },
    // [MID · Des pouring, in profile against the window]
    { place: 'des', at: [-21.35, 0.46, 6.25, PI] }, { act: [['des', 'pour']] },
    { place: 'luka', at: [-22.7, 0.46, 4.55, 0.9] }, { place: 'chase', at: [-23.5, 0.46, 5.0, 1.2] },   // out of the lens line
    { shot: 'CAM', pos: [-23.55, 1.75, 6.05], look: [-21.2, 1.8, 6.15], fov: 38 },
    { say: 'des', text: 'Where are yous from?' },
    { say: 'luka', text: 'Redcliffe. Queensland. Australia.' },
    { say: 'des', text: "God. You're a long way from home." },
    // [WIDE · exterior, looking in through the lodge window from the rain] Three small figures in a lit window.
    { place: 'luka', at: [-21.85, 0.46, 5.95, H] }, { place: 'chase', at: [-22.1, 0.46, 4.95, H] },
    { act: [['des', 'carry_mug']] }, { face: 'des', to: 'luka' },
    { shot: 'INSERT', at: 'lodge_window_out' },
    { say: 'chase', text: 'You have no idea.' },
    // [INSERT] Des's newspaper, wrapped round the smoking phones. The masthead: Tuesday, 6 October 1987.
    { prop: 'machine', pos: MACHINE_DESK, fn: (o) => o.rotation.set(0, -0.3, 0) }, { prop: 'machine_wrap', visible: true },
    puff([-20.88, 1.45, 5.62], 10),
    { shot: 'INSERT', at: 'machine_desk', card: ['masthead', { name: 'The Dublin Evening Post', date: 'Tuesday, 6 October 1987' }] },
    { wait: 2.6 },
    // [TWO-SHOT · from below the newspaper]
    { place: 'luka', at: [-22.05, 0.46, 5.95, 1.35] }, { place: 'chase', at: [-22.05, 0.46, 5.0, 1.8] }, { place: 'des', at: [-21.2, 0.46, 6.55, PI] },
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    { shot: 'CAM', pos: [-21.25, 1.2, 5.45], look: [-22.05, 1.72, 5.45], fov: 62 },
    { say: 'chase', text: 'We made it.' },
    { say: 'luka', text: 'We made it.' },
    // [INSERT] The machine. The HUD appears for the first time: BATTERY 1% · NO SERVICE.
    { shot: 'INSERT', at: 'machine_desk', card: ['battery', { pct: 1, bars: 0 }] },
    { hud: { battery: 1, bars: 0 } }, { sfx: 'sad_beep', vol: 0.6 },
    { wait: 2.4 },
    // [CLOSE · Luka] He glances at Chase before he speaks. He does this all game, and the camera keeps catching it.
    { shot: 'CLOSE', on: 'luka' },
    ...glanceSnap('glance_lodge'),
    { say: 'luka', text: '…Can we make it back?', speed: 'slow' },
    // [CLOSE · Chase]
    { shot: 'CLOSE', on: 'chase' },
    { say: 'chase', text: 'Course we can.' },
    { say: 'luka', text: 'Chase.' },
    // [CLOSE · Chase, a little smaller in frame]
    { shot: 'CLOSE', on: 'chase', dist: 1.35 },
    { say: 'chase', text: 'Probably.' },
    // [WIDE · locked] All three sip tea in silence.
    { place: 'des', at: [-21.5, 0.46, 6.2, -2.3] }, { place: 'luka', at: [-22.5, 0.46, 5.2, 1.3] }, { place: 'chase', at: [-22.45, 0.46, 3.95, 1.0] },
    { act: [['luka', 'drink'], ['chase', 'drink'], ['des', 'drink']] },
    { shot: 'CAM', pos: [-25.2, 2.1, 4.9], look: [-21.9, 1.2, 5.0], fov: 55 },
    { wait: 1.6 },
    { hud: { bars: 1 }, anim: 0.6 },                         // the bars quietly track how connected they are
    { wait: 0.6 },
    { say: 'des', text: "Thirty-one years in this lodge. Yous are the third strangest thing that's happened in it." },
    { say: 'chase', text: 'What were the other two?' },
    { say: 'des', text: 'Not my place to say.' },
    { act: [['luka', 'idle'], ['chase', 'idle'], ['des', 'idle']] },
  ];

  // ===================================================================== 2.2 — "Plastic Money"
  const STUDENT_LINES = ['Are yous lost?', 'Nice shirts. Is it a cult?', 'Rue? Business Studies. Always late.'];
  const STUDENTS = [['student_1', 'student_c', [-12.6, 0, -3.4, 0.9]], ['student_2', 'student_f', [4.6, 0, 11.4, 2.8]], ['student_3', 'student_a', [12.6, 0, -4.6, -1.9]]];
  const inSquare = () => world.setId === 'square', inButtery = () => world.setId === 'buttery';
  let tries = 0;
  // Chase's yellow polymer $50, in his hand while he slides it across
  function note(c, on) {
    const a = c.world.actor('chase');
    if (!a) return;
    let n = a.rig.attach.gripR.getObjectByName('note50');
    if (!n && on) {
      const b = new Builder(); b.box(0.15, 0.002, 0.07, mat(0xe8c43a), [0, -0.01, 0.06]); b.box(0.04, 0.003, 0.04, mat(0xb8d8e8), [0.045, -0.01, 0.06]);
      n = b.done(); n.name = 'note50'; a.rig.attach.gripR.add(n);
    }
    if (n) n.visible = on;
  }

  function enterButtery(c) {
    c.world.spawn('bernie', 'counter_bernie');
    c.music(null, { fade: 1.5 });
    if (state.flags.met_bernie) c.music('buttery_radio', { fade: 1 });
  }
  // "Control returns briefly": try other things on Bernie. After two tries, or once the phone is tried, it continues.
  async function tryBernie(c) {
    const i = await c.choose(['Australian coins', "Chase's phone"], { disabled: tries ? [0] : [] });
    tries++;
    if (i === 0) {
      await c.runSteps([
        { face: 'luka', to: 'bernie' }, { act: [['luka', 'give']] },
        { say: 'bernie', text: "Who's that on it?" },
        { say: 'luka', text: '…The King.' },
        { say: 'bernie', text: 'What king?' },
      ]);
      if (tries < 2) return;
    }
    await c.playCutscene('2.2_bernie2');
    state.flags.met_bernie = true;
  }
  // help when stuck (§14 "Continues automatically"): 20 s of roaming in the Buttery without finishing, and Chase's phone plays the beat
  const BERNIE_AUTO = { id: 'bernie_auto', do: async (c) => { await c.playCutscene('2.2_bernie2'); state.flags.met_bernie = true; } };
  async function payBernie(c) {
    tries = 0;
    await c.playCutscene('2.2_bernie');
    let t = 0;
    const f = (dt) => {
      if (state.flags.met_bernie || flow.sceneId !== '2.2') return removeUpdate(f);
      if ((t += dt) < 20 || !flow.roaming || flow.busy || flow.cutscene || !inButtery()) return;
      removeUpdate(f);
      c.hotspots.trigger(BERNIE_AUTO);
    };
    addUpdate(f);
  }

  SCENES['2.2'] = {
    title: 'Plastic Money', set: 'square', env: 'rain', time: 'Tue 6 Oct 1987, 12:30',
    playable: ['luka', 'chase'], swap: true, hud: { battery: 1, bars: 2 }, music: 'dublin',
    spawn: Object.assign({ luka: 'gate_in', chase: [-21.9, 0, -0.6, H] }, Object.fromEntries(STUDENTS.map(([id, look, at]) => [id, { at, look }]))),
    hotspots: [
      // --- Front Square
      { id: 'cobbles', at: 'cobbles', r: 1.3, by: 'chase', text: 'My shoes are not rated for this.' },
      { id: 'gig_poster', at: [19.55, 0, 0], r: 0.9, when: inSquare,
        steps: [{ shot: 'INSERT', at: 'poster', card: ['poster', { lines: ['The Wet Weekends', 'LIVE · Fri 9 Oct', 'Buttery Bar £2'] }] }, { say: 'chase', text: "I'd go." }] },
      { id: 'bicycles', at: 'bicycles', r: 1.5, text: 'Every bike in Ireland is here, and all of them are wet.' },
      { id: 'bicycles_s', at: [5.2, 0, -12.9], r: 1.4, when: inSquare, text: 'Every bike in Ireland is here, and all of them are wet.' },
      ...STUDENTS.map(([id]) => ({ id, at: id, r: 1.3, verb: 'Talk', when: inSquare,
        steps: [{ do: (c) => { c.world.actor(id)?.face(state.active); return c.say('student', STUDENT_LINES[Math.random() * 3 | 0]); } }] })),
      { id: 'buttery_door', at: 'buttery_door', r: 1.0, verb: 'Enter', when: inSquare,
        door: { to: { set: 'buttery', mark: 'door_in' }, kind: 'wood' }, do: enterButtery },
      { id: 'noticeboard', at: 'noticeboard', r: 1.1, verb: 'Read', once: true, flag: 'saw_noticeboard', when: inSquare, do: (c) => c.playCutscene('noticeboard') },
      { id: 'arts_door', at: 'arts_door', r: 1.2, verb: 'Enter', once: true, flag: 'entered_arts', when: (s) => inSquare() && !!s.flags.campanile_done,
        steps: [{ sfx: 'creak' }, { fade: 'out', dur: 0.6 }, { title: '2:00 pm' }] },
      // --- the Buttery
      { id: 'bernie', at: 'bernie', r: 1.8, verb: 'Pay', once: true, flag: 'bernie_note', when: (s) => inButtery() && !s.flags.bernie_note, do: payBernie },
      { id: 'bernie_try', at: 'bernie', r: 1.8, verb: 'Try something else', when: (s) => inButtery() && !!s.flags.bernie_note && !s.flags.met_bernie, do: tryBernie },
      { id: 'bernie_talk', at: 'bernie', r: 1.8, verb: 'Talk', by: 'bernie', when: (s) => inButtery() && !!s.flags.met_bernie,
        text: ["Go on. Pay me when you're back from wherever you're from."] },
      { id: 'urn', at: 'urn', r: 0.9, verb: 'Use', when: inButtery, text: 'Close enough.', kettle: true },
      { id: 'buttery_exit', at: 'stairs_top', r: 0.9, verb: 'Leave', when: inButtery,
        door: { to: { set: 'square', mark: [7.27, 0, 13.4, PI], env: 'rain' }, kind: 'wood' }, do: (c) => c.music('dublin', { fade: 2 }) },
    ],
    steps: [
      ['cutscene', '2.2_crane'],
      ['control', 'luka'],
      ['follow', 'chase'],
      ['objective', 'Find Rue.'],
      ['roam', {
        until: ['met_bernie', 'saw_noticeboard'],
        hint: { after: 120, steps: [{ if: (s) => !s.flags.met_bernie,     // a short nudge; the objective stays "Find Rue."
          then: [{ say: 'chase', text: "I need a cup of tea. Where's the café?" }],
          else: [{ say: 'luka', text: "There's a noticeboard under the arches." }] }] },
        async auto(c) {
          for (const id of ['cobbles', 'student_1', 'bicycles', 'buttery_door', 'bernie', 'bernie_try', 'bernie_try', 'urn', 'buttery_exit', 'noticeboard']) await c.hotspots.trigger(id);
        },
      }],
      ['roam', {   // the Campanile, triggered while crossing the square toward the Arts Building
        until: () => { const a = world.actor(state.active); return inSquare() && !!a && (a.pos.x * a.pos.x + a.pos.z * a.pos.z < 110 || a.pos.z < -9); },
        async auto(c) { const a = c.world.actor(state.active); await a.moveTo([6, 0, -6]); },
      }],
      ['cutscene', '2.2_campanile'],
      ['roam', { until: 'entered_arts', async auto(c) { await c.hotspots.trigger('arts_door'); } }],
    ],
    grants: { flags: { met_bernie: true, saw_noticeboard: true, campanile_done: true, entered_arts: true }, names: ['Bernie'], battery: 1, bars: 2 },
  };

  CUTSCENES['2.2_crane'] = [
    { act: [['student_1', 'umbrella'], ['student_2', 'umbrella'], ['student_3', 'umbrella']] },
    // [CRANE · down from above the Front Gate] Front Square in the rain, the Campanile at its centre, and the two boys
    // stepping out tiny below, their polos the only colour in a grey square.
    { move: 'luka', to: [-9.6, 0, 0.8], nowait: true },
    { move: 'chase', to: [-10.3, 0, -0.5], nowait: true },
    { shot: 'CAM', pos: [-18.5, 28, 0.3], look: [-2, 0, 0], fov: 60, to: { pos: [-18.5, 11, 0.3], look: [-3.5, 2.5, 0], fov: 60 }, dur: 7 },
    { wait: 7.4 },
  ];

  // The Buttery. [MID · from behind the till, Bernie's side] Chase slides a $50 note across the counter.
  CUTSCENES['2.2_bernie'] = [
    { place: 'chase', at: 'counter_front' }, { place: 'luka', at: 'counter_front2' }, { face: 'bernie', to: 'chase' },
    { shot: 'CAM', pos: [-2.45, 1.78, 4.15], look: [-3.55, 1.2, 2.15], fov: 48 },
    { do: (c) => note(c, true) }, { act: [['chase', 'give', { dur: 2.2 }]] },
    { say: 'bernie', text: "What's that?" },
    { say: 'chase', text: 'Fifty dollars.' },
    { say: 'bernie', text: "It's plastic." },
    { say: 'luka', text: "Australia's going to invent plastic money." },
    { say: 'bernie', text: 'When?' },
    { do: glance },
    { say: 'luka', text: '…Next year.' },
    { say: 'bernie', text: 'Then come back next year.' },
    { do: (c) => note(c, false) },
  ];

  const BERNIE_CLOSE = { shot: 'CAM', pos: [-2.6, 1.68, 2.45], look: [-3.2, 1.52, 3.6], fov: 40 };   // over the till, clear of the urn
  CUTSCENES['2.2_bernie2'] = [
    // [WIDE] Chase taps his phone against a 1987 till, harder each time. Bernie watches with her arms folded.
    { place: 'chase', at: 'counter_front' }, { place: 'luka', at: [-3.85, 0, 1.55, 0.35] }, { face: 'bernie', to: 'chase' },
    { act: [['bernie', 'fold']] },
    { do: (c) => { const a = c.world.actor('chase'); if (a && a.rig.attach.phone) a.rig.attach.phone.visible = true; } },
    { shot: 'CAM', pos: [0.1, 1.75, 2.2], look: [-3.4, 1.3, 2.8], fov: 52 },
    { act: [['chase', 'give', { dur: 0.7 }]] }, { wait: 0.35 }, { sfx: 'knock', vol: 0.25 }, { wait: 0.6 },
    { act: [['chase', 'give', { dur: 0.7 }]] }, { wait: 0.35 }, { sfx: 'knock', vol: 0.55 }, { wait: 0.6 },
    { act: [['chase', 'give', { dur: 0.7 }]] }, { wait: 0.35 }, { sfx: 'knock', vol: 1 }, { sfx: 'till', vol: 0.3 }, { wait: 0.5 },
    { say: 'bernie', text: 'Is he blessing the till?' },
    { say: 'luka', text: "He's trying to pay." },
    { say: 'bernie', text: 'With a calculator?' },
    { do: (c) => { const a = c.world.actor('chase'); if (a && a.rig.attach.phone) a.rig.attach.phone.visible = false; } },
    { place: 'luka', at: 'counter_front2' }, { act: [['bernie', 'idle']] },
    // [CLOSE · Bernie] She looks them over: soaked, in matching polos, "Yes" on both.
    BERNIE_CLOSE,
    { face: 'bernie', to: 'luka', dur: 0.8 }, { wait: 0.9 }, { face: 'bernie', to: 'chase', dur: 0.8 }, { wait: 1.0 },
    // [INSERT · her hands] She slides over two teas and a plate of toast.
    { shot: 'INSERT', at: 'teas' },
    { act: [['bernie', 'give']] },
    { do: (c) => { slide(c, 'teacups', [-4.1, 1.0, 3.05], [-4.1, 1.0, 2.62]); slide(c, 'toast_plate', [-3.75, 1.0, 3.1], [-3.75, 1.0, 2.64], 0.9); } },
    { wait: 1.3 },
    BERNIE_CLOSE,
    { say: 'bernie', text: "Go on. Pay me when you're back from wherever you're from." },
    { shot: 'CLOSE', on: 'chase' },
    { say: 'chase', text: "That's so nice." },
    BERNIE_CLOSE,
    { say: 'bernie', text: "It's toast, love. Don't get emotional." },
    { name: 'Bernie' },
    { flag: 'met_bernie' },
    // A synth-pop song comes on the Buttery radio. Chase stops chewing.
    { shot: 'TWO', on: ['luka', 'chase'] },
    { act: [['chase', 'chew']] }, { wait: 1.2 },
    { music: 'buttery_radio', fade: 0.4 }, { wait: 0.8 },
    { act: [['chase', 'idle']] }, { expr: [['chase', 'stunned']] }, { wait: 0.8 },
    { say: 'chase', text: 'Is this the original? Not a sample? Not a remix?' },
    { do: glance },
    { say: 'luka', text: "It's 1987, mate. Everything's the original." },
    { shot: 'CLOSE', on: 'chase', locked: true },
    { expr: [['chase', 'stunned']] },                                  // awed
    { say: 'chase', text: "…Everything's the original.", speed: 'slow', tag: 'quietly' },
  ];

  // The noticeboard, under the arches off Front Square.
  CUTSCENES.noticeboard = [
    { place: 'luka', at: [22.05, 0, -1.45, H] }, { place: 'chase', at: [22.05, 0, -2.3, H] },
    // [INSERT · slow tilt down the poster] TRINITY ENTERPRISE PRIZE 1987 … The tilt ends on one line: Finalists include: RUE (Business Studies).
    { shot: 'CAM', pos: [21.35, 2.35, -2.6], look: [22.95, 2.3, -2.6], fov: 32, to: { look: [22.95, 1.15, -2.6] }, dur: 4.8,
      card: ['poster', { lines: ['TRINITY ENTERPRISE PRIZE 1987', 'Final: Friday 23 October, the Exam Hall.', 'Judge: Mr G. Fenwick, Fenwick Hale Stockbrokers, London.',
        'Winner receives a graduate placement in the City.', '*Finalists include: RUE (Business Studies)'] }] },
    { do: () => tiltCard(true) },
    { wait: 5.4 },
    // Beside it, a timetable: Business Studies, Tuesdays, 2 pm, Arts Building.
    { do: () => tiltCard(false) },
    { shot: 'CAM', pos: [21.7, 1.7, -1.55], look: [22.95, 1.55, -1.55], fov: 30,
      card: ['poster', { lines: ['Business Studies', 'Tuesdays', '*2 pm', 'Arts Building'] }] },
    { wait: 2.6 },
    // [TWO-SHOT · their reflection in the noticeboard glass]
    { shot: 'CAM', pos: [22.86, 1.62, -1.875], look: [21.6, 1.55, -1.875], fov: 50 },
    { say: 'luka', text: 'Business Studies. Two o\'clock.' },
    { say: 'chase', text: "We're going to uni." },
    { say: 'luka', text: "We're going to a lecture." },
    { say: 'chase', text: "I've never been to a lecture." },
    { do: glance },
    { say: 'luka', text: "You'll hate it." },
  ];

  // The Campanile, triggered while crossing the square toward the Arts Building.
  CUTSCENES['2.2_campanile'] = [
    { place: 'chase', at: [-0.3, 0, 7.4, PI] }, { place: 'luka', at: [0.9, 0, 8.0, PI] },
    { spawn: 'des', at: [-5.4, 0, -7.6, -0.6] },
    // [WIDE · low, looking up at the Campanile in the rain] Des crosses the frame on his rounds.
    { shot: 'CAM', pos: [-14, 0.9, -9], look: [0, 6.2, 0], fov: 50 },
    { move: 'des', to: [-8.2, 0, -3.0], nowait: true },
    { wait: 1.6 },
    { say: 'des', text: "Don't walk under that while the bell's going. You'll fail your exams." },
    { say: 'chase', text: "We don't have exams." },
    { say: 'des', text: "Then you've nothing to lose." },
    { move: 'des', to: [-12.5, 0, 3.6], nowait: true },
    // [TRACK · alongside Chase] He walks straight under the Campanile. The camera tilts up to the bell as he passes beneath. It doesn't ring.
    { move: 'chase', to: [0, 0, -6.2], nowait: true },          // Luka hangs back: Chase goes under on his own
    { shot: 'MID', on: 'chase', move: 'track', track: 'alongside', dist: 2.2, dur: 30 },
    { wait: 3.4 },
    { do: (c) => {   // no cut: from wherever the track is, glide in under the arch and tilt up to the bell
      const k = c.world.camera, p = k.position, d = k.getWorldDirection(new THREE.Vector3());
      c.cam.shot({ shot: 'CAM', pos: [p.x, p.y, p.z], look: [p.x + d.x * 2.4, p.y + d.y * 2.4, p.z + d.z * 2.4], fov: k.fov,
        to: { pos: [-1.1, 1.5, -0.2], look: [0, 10.4, 0.1], fov: 50 }, dur: 2.4 });
    } },
    { wait: 2.8 },
    { despawn: 'des' },
    // [CLOSE · Chase] Slightly disappointed.
    { place: 'chase', at: [0, 0, -6.2, PI] }, { act: [['chase', 'idle']] },
    { expr: [['chase', 'sad']] },
    { shot: 'CLOSE', on: 'chase' },
    { wait: 1.8 },
    { expr: [['chase', 'neutral']] },
    { flag: 'campanile_done' },
  ];

  // ===================================================================== 2.3 — "Roll Call"
  // Theatre numbers (SETS.theatre): row r floor y = 0.38(r+1), front edge z = 0.6 + 0.9r. The boys' row is 6.
  const Y6 = 2.66, Z6 = 6.0;

  SCENES['2.3'] = {
    title: 'Roll Call', set: 'theatre', env: 'day', time: 'Tue 6 Oct 1987, 14:00',
    playable: ['luka'], swap: false, hud: { battery: 1, bars: 1 }, music: null,
    spawn: { luka: [0, 5.7, 15.05, PI], chase: [0.55, 5.7, 15.2, PI], hartigan: 'lectern', ronan: 'ronan_seat' },
    steps: [
      ['cutscene', [
        { do: (c) => {
          habit(c);
          const g = c.world.actor('hartigan'); if (g && g.rig.attach.glasses) g.rig.attach.glasses.visible = false;   // his reading glasses are on a bench somewhere
        } },
        ...sitThen('ronan', 'sleep'),
        { act: [['hartigan', 'look_down']] },
        // two men in bright polos at the top of a steep tiered theatre, in a sea of 1987 knitwear
        { shot: 'CAM', pos: [0.45, 2.3, -3.6], look: [0.1, 5.2, 12.5], fov: 44 },
        { move: 'luka', to: 'top_entry' }, { move: 'chase', to: [0.55, 5.7, 14.85, PI], nowait: true },
        { wait: 0.8 },
      ]],
      ['objective', 'Blend in.'],
      ['minigame', 'blend_in', {}],
      ['cutscene', '2.3_roll'],
    ],
    grants: { flags: { blended_in: true }, battery: 1, bars: 1 },
  };

  CUTSCENES['2.3_roll'] = [
    { flag: 'blended_in' },
    { prop: 'textbook', visible: false },                   // one textbook, held up between the two of them
    { place: 'luka', at: 'seat_luka' }, { place: 'chase', at: 'seat_chase' },
    { act: [['luka', 'sit'], ['chase', 'sit'], ['hartigan', 'idle']] }, { wait: 0.2 },
    { act: [['luka', 'reading'], ['chase', 'look_down']] },
    // [WIDE · from the back row, down the tiers to the lectern]
    { shot: 'SET', cam: 'back_row' },
    { say: 'hartigan', text: 'Good afternoon. Roll.', name: 'PROFESSOR HARTIGAN' },
    { act: [['hartigan', 'look_down']] },
    // [TRACK · along the row, face by face] Each student says "Here" as the camera passes, until it reaches the boys, hunched behind one textbook.
    // Hartigan pauses after each name ('^') and that student answers "Here" as the camera passes their face (x 5.2 4.6 4.0 3.4).
    { shot: 'CAM', pos: [6.0, 3.95, 5.35], look: [5.5, 3.8, 6.64], fov: 40, to: { pos: [2.95, 3.95, 5.35], look: [2.5, 3.72, 6.64] }, dur: 4.4, ease: 'linear' },
    { par: [
      { wait: 4.9 },                                                   // the track always lands on the boys before the cut
      { say: 'hartigan', text: 'Brennan. ^Byrne. ^Cullen. ^Doyle. ^Fitzgerald. Kavanagh…', auto: 0.4 },
      { do: async (c) => {   // "Here" in each beat: the typewriter reaches beat k after (name length + 1) / cps
        const cps = CONFIG.text[options.textSpeed] || CONFIG.text.normal;
        for (const n of ['Brennan. ', 'Byrne. ', 'Cullen. ', 'Doyle. ']) {
          await c.wait((n.length + 1) / cps + 0.25);
          for (let k = 0; k < 2; k++) { if (!c.flow.skipping && c.AUDIO) c.AUDIO.blip('student'); await c.wait(0.13); }   // "He-re"
          await c.wait(CONFIG.beat - 0.51);
        }
      } },
    ] },
    // [TWO-SHOT · tight]
    { shot: 'TWO', on: ['luka', 'chase'], dist: 1.3 },
    { say: 'chase', text: 'Listen for Rue.', tag: 'whisper' },
    // [INSERT] Hartigan's finger running down the register.
    { act: [['hartigan', 'write']] },
    { shot: 'INSERT', at: 'register' },
    { say: 'hartigan', text: "…Murphy. Murphy. The other Murphy. O'Brien. O'Sullivan. Quigley. Quinn. Ryan. Sheehan. Walsh. Whelan." },
    // [CLOSE · Hartigan] He closes the register.
    { shot: 'CLOSE', on: 'hartigan', dist: 1.5 },                  // (still writing: hands on the register)
    { wait: 0.3 }, { act: [['hartigan', 'give', { dur: 0.9 }]] }, { wait: 0.5 }, { sfx: 'thud', vol: 0.5 },   // flips it shut
    { wait: 0.4 }, { act: [['hartigan', 'idle']] }, { wait: 0.2 },
    { say: 'hartigan', text: "Grand. Everyone's here except the usual." },
    // [TWO-SHOT · tight]
    { shot: 'TWO', on: ['luka', 'chase'], dist: 1.3 },
    { say: 'luka', text: "He wasn't on it.", tag: 'whisper' },
    { say: 'chase', text: "He wasn't on it." },
    { say: 'luka_chase', text: 'Oh. We must have the wrong classroom.' },
    // [WIDE · from the lectern] The two of them stand up in a seated room, the only bright colours in it.
    { shot: 'CAM', pos: [0.45, 2.3, -3.6], look: [2.2, 3.8, 6.5], fov: 28 },
    { act: [['luka', 'stand'], ['chase', 'stand']] },
    { wait: 1.4 },
    // [TRACK · along the row at knee height] "Sorry. Sorry. Sorry." Knees. Bags. A dropped calculator. Luka glances back to
    // check Chase is behind him. A pair of reading glasses left on the end of the bench gets knocked and slides under a seat.
    // The lens dollies back along the row ahead of them at knee height; Luka stops once to glance back at Chase.
    { place: 'luka', at: [2.2, Y6, Z6 + 0.45, -H] }, { place: 'chase', at: [2.8, Y6, Z6 + 0.45, -H] },
    { shot: 'CAM', pos: [0.3, Y6 + 0.85, Z6 + 0.38], look: [2.4, Y6 + 1.3, Z6 + 0.45], fov: 55,
      to: { pos: [-0.55, Y6 + 0.85, Z6 + 0.38], look: [1.1, Y6 + 1.35, Z6 + 0.45], fov: 55 }, dur: 5.4 },
    { move: 'luka', to: [1.6, Y6, Z6 + 0.45, -H], speed: 0.45, nowait: true },
    { move: 'chase', to: [2.3, Y6, Z6 + 0.45, -H], speed: 0.45, nowait: true },
    { say: 'luka', text: 'Sorry. Sorry. Sorry.' },
    { sfx: 'clunk', vol: 0.4 },                                  // a dropped calculator
    { move: 'luka', to: [1.6, Y6, Z6 + 0.45, -H], speed: 0.45 },  // (waits until he has stopped)
    ...glanceSnap('glance_theatre', 0.6),
    { move: 'luka', to: [1.0, Y6, Z6 + 0.45, -H], speed: 0.45, nowait: true },
    { move: 'chase', to: [1.8, Y6, Z6 + 0.45, -H], speed: 0.45, nowait: true },
    { wait: 1.1 },
    { prop: 'glasses', fn: (o) => o.userData.knock && o.userData.knock() },
    { wait: 1.0 },
    // [WIDE · from behind the boys] At the bottom of the theatre, the door bangs open. A soaked nineteen-year-old in an
    // oversized blazer stands framed in it, grinning, brick phone under his arm.
    { place: 'luka', at: [1.0, Y6, Z6 + 0.45, -H] }, { place: 'chase', at: [1.8, Y6, Z6 + 0.45, -H] },
    { spawn: 'rue19', at: [-4.9, 0, -4.35, 0] },
    { do: (c) => { const r = c.world.actor('rue19'); if (r) { r.setExpr('smug'); if (r.rig.attach.brick) r.rig.attach.brick.visible = true; } } },
    { shot: 'CAM', pos: [3.4, Y6 + 1.9, Z6 + 1.7], look: [-3.6, 1.9, 0.6], fov: 38 },   // Rue on the right third, the tiers between
    { prop: 'bottom_door', fn: (o) => { o.userData.open = true; } }, { sfx: 'thud' }, { sfx: 'creak', vol: 0.6 },
    { do: (c) => c.world.puff([-4.9, 1.6, -4.2], { n: 8, color: 0xb8c8d8, speed: 0.1, life: 0.9, gravity: 4 }) },
    { wait: 1.8 },
    // [CLOSE · Hartigan, not looking up]
    { act: [['hartigan', 'look_down']] },
    { shot: 'CLOSE', on: 'hartigan' },
    { prop: 'crowd', fn: (o) => o.userData.hideNear && o.userData.hideNear(1.6, Z6 + 0.64) },   // (under the cut) a free place behind Chase
    { say: 'hartigan', text: 'Ah, Mr Rue. Thought we\'d never see you.' },
    // [TWO-SHOT · from the front] The boys freeze mid-shuffle. Slowly, in perfect sync, their heads turn.
    { shot: 'CAM', pos: [0.2, Y6 + 1.5, 4.39], look: [1.4, Y6 + 1.45, Z6 + 0.45], fov: 45 },
    { wait: 0.6 },
    { act: [['luka', 'glance', { dur: 6, yaw: -1.05 }], ['chase', 'glance', { dur: 6, yaw: -1.0 }]] },
    { wait: 2.2 },
    { face: 'luka', to: 'bottom_door', dur: 0 }, { face: 'chase', to: 'bottom_door', dur: 0 }, { act: [['luka', 'idle'], ['chase', 'idle']] },
    { expr: [['luka', 'stunned'], ['chase', 'stunned']] },
    // [CRASH ZOOM · Luka] [CRASH ZOOM · Chase]
    { shot: 'CRASH', size: 'MID', on: 'luka' },
    { wait: 0.55 },
    { shot: 'CRASH', size: 'MID', on: 'chase' },
    { wait: 0.35 }, snap('crash'),
    { say: 'luka', text: '…It\'s him.', tag: 'whisper' },
    { say: 'chase', text: "It's HIM." },
    // [MID · Rue, from below, cocky] He holds up the brick phone.
    { shot: 'LOW', on: 'rue19' },
    { act: [['rue19', 'wave']] },
    { say: 'rue19', text: 'Sorry, Professor. Important call.' },
    { act: [['rue19', 'idle']] },
    // [WIDE · reverse] The whole theatre groans.
    { shot: 'INSERT', at: 'tiers' },
    { prop: 'crowd', fn: (o) => o.userData.look && o.userData.look([-4.9, 1.6, -4.3]) },
    { sfx: 'groan' },
    { wait: 0.8 },
    { move: 'rue19', to: [-1.1, 0, 0.25], nowait: true },
    { say: 'hartigan', text: 'The only important call you\'ve ever taken, Mr Rue, is the one telling you where the bar is. Sit down. ^ And you two, whoever you are. Also sit down.' },
    { prop: 'crowd', fn: (o) => o.userData.look && o.userData.look(null) },
    // [WIDE · from the lectern] The boys, still standing, sit down very slowly.
    { place: 'rue19', at: 'rue_sit' }, { act: [['rue19', 'sit']] },
    { do: (c) => { const r = c.world.actor('rue19'); if (r && r.rig.attach.brick) r.rig.attach.brick.visible = false; } },   // (pooled rig: the brick shows again only while he uses it)
    { face: 'luka', to: PI }, { face: 'chase', to: PI },
    { shot: 'CAM', pos: [0.45, 2.3, -3.6], look: [1.8, 3.8, 6.5], fov: 28 },
    { wait: 0.8 },
    { act: [['luka', 'duck'], ['chase', 'duck']] },               // down together, in sync, very slowly
    { wait: 1.4 },
    { place: 'luka', at: [1.0, Y6, Z6 + 0.64, PI] }, { place: 'chase', at: [1.6, Y6, Z6 + 0.64, PI] },
    { act: [['luka', 'sit'], ['chase', 'sit']] },
    { wait: 2.0 },
    // The lecture ends. Title card: 3:00 pm.
    { fade: 'out', dur: 0.8 },
    { title: '3:00 pm' },
  ];
})();
