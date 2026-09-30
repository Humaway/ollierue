// ============================================================ CONTENT: 2.7 "Scam Call", 2.8 "The Deal", 2.9 "Lights Out"
// SPEC §10–§11. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
// Mini-games: dial {mode:'home'} (61-mg-keypad-buglist-dial.js), role_play (69-mg-roleplay.js).
(() => {
  const PI = Math.PI, H = PI / 2;
  const say = (id, text, o) => Object.assign({ say: id, text }, o);
  const slow = (id, text, o) => say(id, text, Object.assign({ speed: 'slow' }, o));
  const snap = (name) => ({ do: () => { if (MINIGAMES.final_yes && MINIGAMES.final_yes.snap) MINIGAMES.final_yes.snap(name); } });
  const actor = (c, id) => c.world.actor(id);
  function glanceAt(c, id, at, dur = 1.3) {   // turn the head toward someone without moving the feet
    const a = actor(c, id), b = actor(c, at);
    if (!a || !b) return;
    let d = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z) - a.rotY; d = Math.atan2(Math.sin(d), Math.cos(d));
    a.play('glance', { yaw: Math.max(-1.4, Math.min(1.4, d)), dur });
  }
  // a tween that removes itself (instant while skipping)
  function tween(c, dur, fn) {
    if (c.flow.skipping) { fn(1); return; }
    let t = 0;
    const f = (dt) => { t = Math.min(1, t + dt / dur); fn(t * t * (3 - 2 * t)); if (t >= 1) removeUpdate(f); };
    addUpdate(f);
  }

  // ---------------------------------------------------------- the lodge (square set)
  const MACHINE_DESK = [-20.88, 1.25, 5.62];
  function lodgeDress(c) {   // the machine on Des's desk (wired into the phone from 2.7 on); the bike went to science in 2.6
    if (c.world.setId !== 'square') return;
    const P = (n) => c.world.prop(n);
    const m = P('machine'); if (m) { m.visible = true; m.position.set(...MACHINE_DESK); m.rotation.set(0, -0.3, 0); }
    for (const [n, v] of [['machine_wrap', false], ['machine_wire', !!state.flags.machine_wired], ['swivel_chair', false], ['yes_sign', false], ['umbrella_crowd', true], ['machine_prepaid', !state.flags.prepaid_dead]]) { const o = P(n); if (o) o.visible = v; }
    const cd = P('cupboard_door'); if (cd) cd.rotation.y = 0;
    for (const n of ['bike', 'bike_chain']) { const o = P(n); if (o) o.visible = !state.flags.part_bike; }
  }
  // Des reads his paper: an open broadsheet in his hands instead of the rig's book. hold() hands it back to the set on despawn.
  let paper = null;
  async function desReads(c) {
    const d = actor(c, 'des');
    if (!d) return;
    if (!paper) {   // newsprint: masthead, a headline, columns
      const tex = canvasTex(128, 96, (x, w, h) => {
        x.fillStyle = '#dcd6c6'; x.fillRect(0, 0, w, h); x.fillStyle = '#2a2a2a'; x.fillRect(8, 6, 112, 9); x.fillRect(8, 20, 70, 6);
        x.fillStyle = '#6a6660'; for (let c = 0; c < 4; c++) for (let y = 32; y < 90; y += 5) x.fillRect(8 + c * 29, y, 25, 2);
        x.fillStyle = '#9a958a'; x.fillRect(84, 20, 36, 26);
      }, { key: 'des_paper' });
      paper = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.36, 0.006), matTex(tex)); paper.name = 'des_paper';
    }
    if (!paper.parent) { paper.position.set(0, -30, 0); c.world.scene.add(paper); }
    d.play('reading');
    if (d.held !== paper) d.hold(paper, 'R');
    await c.wait(0.25);   // once the pose has settled: the sheet up in front of his chest, its lower edge in his hands
    const b = d.rig.attach.textbook; if (b) b.visible = false;
    const t = d.rig.parts.torso, m = new THREE.Matrix4();
    d.root.updateMatrixWorld(true);
    m.compose(new THREE.Vector3(0, 0.46, (d.rig.d.chestZ || 0.12) + 0.26), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0)), new THREE.Vector3(1, 1, 1));
    m.premultiply(t.matrixWorld).premultiply(new THREE.Matrix4().copy(paper.parent.matrixWorld).invert());
    m.decompose(paper.position, paper.quaternion, paper.scale);
  }
  // Rue across the square: the brick phone at his ear, the umbrella propped on his shoulder (put back on the rig after)
  function umbrella(c, on) {
    const r = actor(c, 'rue19'), u = r && r.rig.attach.umbrella;
    if (!u) return;
    if (on) { r.rig.parts.torso.add(u); u.position.set(0.14, r.rig.d.T * 0.95, -0.06); u.rotation.set(-0.28, 0, 0.22); u.visible = true; }
    else if (u.parent !== r.rig.attach.gripR) { r.rig.attach.gripR.add(u); u.position.set(0, 0, 0.02); u.rotation.set(H, 0, 0); u.visible = false; }
  }
  const unroll = (c) => { const r = actor(c, 'rue19'); if (r) { r.root.rotation.z = 0; r.shadow.visible = true; umbrella(c, false); } };

  // While the line rings: the double trill every 3 s. With the recorder, hold YES for 1 s: the only chance to sample it.
  async function ringing(c) {
    const can = c.inventory.has('recorder') && !state.samples.includes('trill');
    const t0 = clock.t;
    let n = 0, held = -1, got = !can;
    if (can) c.ui.prompt('YES — Hold to record');
    c.sfx('trill');
    await waitUntil(() => {
      if (c.flow.skipping) return true;
      if (!got) {
        if (TEST.auto || input.held('yes')) {
          if (held < 0) { held = clock.t; c.ui.prompt('YES — Recording…'); c.sfx('dictaphone'); }
          if (clock.t - held >= 1) { got = true; c.ui.prompt(null); c.runSteps([{ sample: 'trill' }]); }
        } else if (held >= 0) { held = -1; c.ui.prompt('YES — Hold to record'); }
      }
      const t = clock.t - t0;
      if (n < 1 && t >= 3) { n++; c.sfx('trill'); }
      return t >= 5.2 && held < 0 || t >= 6.5;
    });
    input.consume('yes');
    c.ui.prompt(null);
  }

  // =================================================================== 2.7 — "Scam Call"
  const CHAIR = [-21.72, 0.46, 5.3, H], LUKA_DESK = [-22.02, 0.46, 4.62, 1.0];
  // [SPLIT SCREEN] left: the boys crowded round the machine, facing right across the divide (mirrored by 'luke_call' on the right)
  const LEFT = { shot: 'CAM', pos: [-21.8, 1.76, 7.0], look: [-21.35, 1.5, 5.05], fov: 56 };
  const RIGHT = { shot: 'INSERT', at: 'luke_call' };
  // [ORBIT · around Chase, the move from 1.5] one way round, speeding up as he does (1.5's pitchOrbit, at the lodge's distance)
  const IDEA = 'Okay. Okay okay okay. The call needs someone in 2026 who says yes. Not someone who thinks it\'s a scam. Someone who knows. Someone who\'s waiting for it.';
  const ORBIT = () => ({ shot: 'ORBIT', size: 'MID', on: 'chase', dist: 1.8, height: 0.05, from: 16, to: -16, ease: 'in',
    dur: IDEA.length / CONFIG.text[options.textSpeed] + 1 });

  SCENES['2.7'] = {
    title: 'Scam Call', set: 'square', env: 'rain', time: 'Wed 14 Oct 1987',
    playable: ['chase'], swap: false, hud: { battery: 4, bars: 1 }, music: 'dublin',
    spawn: { des: [-23.9, 0.46, 6.05, 2.35], luka: [-21.6, 0.46, 5.35, H], chase: [-23.2, 0.46, 4.1, 0.9] },
    hotspots: [
      { id: 'machine', at: [-21.62, 0.46, 5.2], r: 0.8, verb: 'Call', once: true, flag: 'call_go', do: () => {} },
      { id: 'kettle', at: 'kettle', r: 0.8, verb: 'Use', kettle: true, sample: 'kettle' },
      { id: 'des', at: 'des', r: 1.1, verb: 'Talk', by: 'des', text: 'Tea?' },
    ],
    steps: [
      ['do', (c) => { lodgeDress(c); desReads(c); c.world.preload('reddy'); c.world.env('day', 0, 'reddy'); }],
      ['cutscene', '2.7_open'],
      ['control', 'chase'],
      ['objective', 'Call home.'],
      ['roam', { until: 'call_go', auto: (c) => c.hotspots.trigger('machine') }],
      ['objective', null],
      ['do', (c) => {   // Chase in Des's chair at the machine; over his shoulder, the machine and the desk phone under the rainy window
        const a = actor(c, 'chase'), l = actor(c, 'luka');
        a.place(CHAIR); a.play('sit', { h: 0.46 }); l.place(LUKA_DESK); l.play('idle');
        c.cam.shot({ shot: 'CAM', pos: [-22.45, 1.62, 5.02], look: [-20.9, 1.28, 5.4], fov: 46 });
      }],
      ['minigame', 'dial', { mode: 'home' }],
      ['cutscene', '2.7_call'],
    ],
    grants: { flags: { machine_wired: true, call_go: true, prepaid_dead: true }, battery: 1, bars: 1 },
  };

  CUTSCENES['2.7_open'] = [
    // [INSERT] 4%.
    { shot: 'INSERT', at: 'machine_desk', card: ['battery', { pct: 4, bars: 1 }] },
    { wait: 2 },
    // Des nods them toward the lodge phone.
    { shot: 'MID', on: 'des' },
    { wait: 0.5 },
    { do: (c) => glanceAt(c, 'des', 'luka', 2) },
    { wait: 0.6 },
    { do: (c) => { const d = actor(c, 'des'); d.face('desk_phone', 0.4); } },
    { act: [['des', 'nod', { dur: 0.9 }]] },
    { wait: 1 },
    { do: desReads },
    // The machine gets wired into it.
    { shot: 'INSERT', at: 'desk_phone' },
    { act: [['luka', 'type']] },
    { sfx: 'tick', vol: 0.5 }, { wait: 0.5 }, { sfx: 'tick', vol: 0.5 }, { wait: 0.4 },
    { prop: 'machine_wire', visible: true }, { flag: 'machine_wired' },
    { sfx: 'beep', vol: 0.4 },
    { wait: 1 },
    { act: [['luka', 'idle']] },
    { place: 'luka', at: [-22.3, 0.46, 5.9, 2.4] },
  ];

  CUTSCENES['2.7_call'] = [
    { music: null, fade: 1 },
    { letterbox: false },   // the record prompt sits where the bottom bar would be
    LEFT,
    { do: ringing },
    { letterbox: true },
    // [SPLIT SCREEN] Left: the lodge in grey rain, the boys crowded round the machine. Right: Reddy in 2026 sunshine;
    // behind Luke the store calendar reads 7 OCT, a MISSING poster with their staff photos over his shoulder.
    { spawn: 'luke', at: 'luke_phone', set: 'reddy' },
    { act: [['luke', 'phone']] },
    { hud: null },          // the 1987 HUD would sit over the 2026 half
    { split: { left: { set: 'square', shot: LEFT }, right: { set: 'reddy', shot: RIGHT } } },
    { sfx: 'clunk', vol: 0.35 },
    { wait: 0.6 },
    say('luke', 'Optus Redcliffe, Luke speaking.'),
    say('operator', 'You have a reverse-charge call from—'),
    { expr: [['luka', 'determined']] },
    say('luka', "Luke! It's Luka! And Chase!", { act: 'point' }),   // (into the machine)
    { act: [['luka', 'idle']] },
    say('operator', '—1987. Will you accept the charges?'),
    { expr: [['luke', 'worried']] },
    { wait: 1.1 },                                                 // (a pause)
    say('luke', 'Is this a scam? We get these. …No.'),
    // [SPLIT SCREEN] Click. The right half cuts to black and the left slides across to fill the frame.
    { sfx: 'clunk' },
    { split: null, slide: true },
    { wait: 0.8 },
    { despawn: 'luke' },
    { hud: { battery: 4, bars: 1 } },
    { expr: [['luka', 'stunned'], ['chase', 'stunned']] },
    // [INSERT] The prepaid display phone pops and smokes. HUD: 1%.
    { shot: 'INSERT', at: [-20.9, 1.34, 5.62], from: [-21.02, 1.78, 6.55], fov: 34 },
    { wait: 0.5 },
    { sfx: 'smoke_pop' },
    { do: (c) => { c.world.puff([-20.95, 1.36, 5.6], { n: 18, color: 0x8a8a8a, speed: 0.3, life: 2.2 }); c.world.puff([-20.95, 1.36, 5.6], { n: 10, color: 0xffd060, gravity: 6, speed: 0.9, life: 0.5 }); } },
    { hud: { battery: 1 }, anim: 1.2 },
    { flag: 'prepaid_dead' },                                      // the machine runs on three phones now; the prepaid goes in Chase's bag
    { wait: 1.8 },
    { prop: 'machine_prepaid', visible: false },                   // (under the cut)
    // [TWO-SHOT]
    { shot: 'CAM', pos: [-20.9, 1.95, 4.02], look: [-21.9, 1.86, 5.0], fov: 54 },
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    say('luka', 'He hung up on us.'),
    say('chase', 'It sounded like a scam, Luka. "Reverse-charge call from 1987." We\'d hang up.'),
    say('luka', '…Yeah. We\'d hang up.'),
    say('chase', 'We finally called the manager. And the manager hung up.'),
    // [CLOSE · Chase, frowning at the machine's little screen]
    { face: 'chase', to: [-20.88, 5.62] },
    { expr: [['chase', 'worried']] },
    { shot: 'CLOSE', on: 'chase' },
    say('chase', 'Wait. The wheel. It said the seventh.'),
    say('luka', 'Of October?'),
    say('chase', "We've been here eight days. It's been eight days there."),
    say('luka', "No, it's time travel, it's—"),
    { expr: [['chase', 'determined']] },
    say('chase', "It's a phone call, Luka. A minute here is a minute there. It's a PHONE CALL."),
    // [PUSH IN · slow, from slightly above Luka] The lanyard twisting.
    { place: 'luka', at: [-22.5, 0.46, 4.7, 1.85] },
    { do: (c) => { actor(c, 'luka').mood = 'anxious'; } },
    { expr: [['luka', 'worried']] },
    { shot: 'MID', on: 'luka', angle: 'high', move: 'push', amount: 0.85, dur: 10 },
    say('luka', "I said we'd be back before lunch."),
    say('chase', 'You did say that.'),
    say('luka', 'We are going to be in so much trouble.'),
    // [ORBIT · around Chase, the move from 1.5] His idea engine starting up again.
    { act: [['chase', 'stand']] },
    { wait: 0.8 },
    { place: 'chase', at: [-22.55, 0.46, 4.8, -1.75] },
    { do: (c) => { actor(c, 'luka').mood = null; } },
    { place: 'luka', at: [-21.8, 0.46, 5.75, -1.9] }, { act: [['luka', 'idle']] },
    { expr: [['chase', 'determined'], ['luka', 'neutral']] },
    { par: [say('chase', IDEA), { do: (c) => c.runSteps([ORBIT()]) }] },
    say('luka', 'Someone alive in 2026, who knows us, who keeps a number working for thirty-nine years and actually picks up.'),
    // [WIDE · Des in the foreground, not looking up from his paper]
    // (Des a step nearer the lens, 3/4 to it and turned from the boys; they look at him past his shoulder)
    { place: 'chase', at: [-22.6, 0.46, 4.85, -1.2] }, { place: 'luka', at: [-22.6, 0.46, 5.65, -1.75] }, { place: 'des', at: [-24.17, 0.46, 5.39, -1.69] },
    { do: (c) => { glanceAt(c, 'chase', 'des', 4); glanceAt(c, 'luka', 'des', 4); } },
    { shot: 'CAM', pos: [-24.95, 1.85, 3.55], look: [-22.9, 1.55, 5.75], fov: 55 },
    say('des', "I'll be pushing up daisies by then, lads. Don't look at me."),
    // [TWO-SHOT · they turn, slowly, to the window]
    { shot: 'CAM', pos: [-20.72, 1.96, 5.25], look: [-22.6, 1.78, 5.25], fov: 56 },
    { wait: 0.5 },
    { face: 'luka', to: H, dur: 1.8 }, { wait: 0.35 }, { face: 'chase', to: H, dur: 1.8 },
    { wait: 2.1 },
    // [POV · through the rain-streaked glass] Across Front Square, Rue alone under an umbrella, loudly taking a "call" on the brick phone.
    { prop: 'umbrella_crowd', visible: false },
    { spawn: 'rue19', at: [-12.6, 0, 5.2, -1.25] },
    { act: [['rue19', 'fake_call']] },
    { do: (c) => umbrella(c, true) },
    { shot: 'CAM', pos: [-21.15, 2.02, 5.3], look: [-12.6, 1.55, 5.2], fov: 32 },
    { wait: 1.2 },
    say('chase', "He's got a mobile."),
    say('luka', 'He says no to everything.'),
    say('chase', "He's got the only mobile in Dublin."),
    say('luka', 'He called me Other Australia.'),
    { do: unroll },
    { prop: 'umbrella_crowd', visible: true },
  ];

  // =================================================================== 2.8 — "The Deal"
  // House Six: up the stairwell (rail cams rise floor by floor), along the corridor to Rue's door.
  const STAIRS = [[-2.4, -9, -3.1], [3.1, -6, -3.1], [3.1, -3, 3.1], [-3.1, 0, 3.1], [-9.8, 0, 3.1]];
  const inRoom = () => world.setId === 'rooms' && !!player.actor && player.actor.pos.x < -12.6;
  const inCorridor = () => world.setId === 'rooms' && !!world.actor('luka') && world.actor('luka').pos.x < -9;
  function roomDress(c) {
    if (c.world.setId !== 'rooms') return;
    const P = (n) => c.world.prop(n);
    const r = actor(c, 'rue19');
    if (r) { unroll(c); r.play('sit', { h: 0.46 }); c.wait(0.1).then(() => r.play('fake_call')); }
    const ch = P('desk_chair'); if (ch) ch.rotation.y = -H;
    const d = P('door'); if (d) d.userData.open = false;
    for (const n of ['coats', 'mess', 'mugs3']) { const o = P(n); if (o) o.visible = false; }
    const l = P('room_lamp'); if (l && l.userData.on) l.userData.on(false);   // daylight: the pendant is off
  }
  // the doorway: the boys stand in it all through the deal (Rue alone in too much space)
  const DOOR_LUKA = [-12.38, 0.4, 2.93, -H], DOOR_CHASE = [-12.3, 0.4, 3.4, -H];
  // [LOW · Rue, the London poster behind his head] (a lens a little under his eyes: the poster sits behind his head)
  const LOW = { shot: 'CAM', pos: [-12.72, 1.52, 3.14], look: [-14.6, 1.9, 3.06], fov: 40 };

  SCENES['2.8'] = {
    title: 'The Deal', set: 'square', env: 'rain', time: 'Thu 15 Oct 1987',
    playable: ['luka'], swap: false, hud: { battery: 1, bars: 1 }, music: 'dublin',
    spawn: { des: 'lodge_des_chair', luka: [-22.55, 0.46, 5.95, 1.95], chase: [-23.25, 0.46, 5.3, 1.65] },
    hotspots: [
      { id: 'knock', at: 'corridor_door', r: 1.1, verb: 'Knock', once: true, flag: 'knocked_rue',
        when: () => world.setId === 'rooms',
        steps: [{ face: 'luka', to: -H }, { act: [['luka', 'knock']] }, { sfx: 'knock' }, { wait: 1.1 }] },
      // after the deal, inside Rue's room (§7: the kettle save point and the typewriter)
      { id: 'kettle', at: 'kettle', r: 1.1, verb: 'Use', kettle: true, when: inRoom },
      { id: 'typewriter', at: 'typewriter', r: 1.2, verb: 'Examine', when: inRoom, text: "You'd need an Ink Ribbon to use this. Luckily, we have kettles." },
      { id: 'rue_practise', at: 'rue19', r: 1.0, verb: 'Talk', when: inRoom, once: true, flag: 'practise_go', do: () => {} },
    ],
    steps: [
      ['do', (c) => { lodgeDress(c); c.world.preload('rooms'); }],
      ['cutscene', '2.8_des'],
      ['set', 'rooms', { env: 'day', spawn: { luka: 'stair_1', chase: [-3.55, -9, -3.5, H], rue19: 'rue_desk' } }],
      ['do', roomDress],
      ['control', 'luka'], ['follow', 'chase'],
      ['objective', "Find Rue's rooms."],
      ['roam', { until: inCorridor, async auto(c) { const a = actor(c, 'luka'); for (const p of STAIRS) await a.moveTo(p, { run: true }); } }],
      // At the top, Rue's voice comes through the door on a fake call.
      ['steps', [say('rue19', "Buy. Sell. Tell London I'll call them back.", { tag: 'through the door' })]],
      ['roam', { until: 'knocked_rue', auto: (c) => c.hotspots.trigger('knock') }],
      ['objective', null],
      // after the deal the roam's camera: the whole east half of the room (door, desk, kettle); Chase stays in the doorway
      ['follow', null], ['cam', 'fixed', { pos: [-17.9, 2.4, 0.75], look: [-13.6, 0.85, 4.0], fov: 55 }],
      ['cutscene', '2.8_deal'],
      ['objective', 'Help Rue practise.'],
      ['roam', { until: 'practise_go', async auto(c) { await c.hotspots.trigger('typewriter'); await c.hotspots.trigger('rue_practise'); } }],
      ['cam', null],
      ['minigame', 'role_play', {}],
      ['objective', null],
      ['cutscene', '2.8_floor'],
    ],
    grants: { flags: { knocked_rue: true, deal: true, roleplay_done: true }, battery: 1, bars: 1 },
  };

  CUTSCENES['2.8_des'] = [
    { act: [['des', 'sit', { h: 0.46 }]] },
    { do: (c) => glanceAt(c, 'des', 'luka', 5) },
    { shot: 'CAM', pos: [-20.9, 1.8, 4.8], look: [-21.74, 1.62, 5.32], fov: 44 },
    say('des', "Rue? Top of the stairs in House Six. You'll hear him before you see him."),
  ];

  CUTSCENES['2.8_deal'] = [
    { act: [['rue19', 'write']] },
    { sfx: 'creak' },
    { prop: 'door', fn: (o) => { o.userData.open = true; } },
    { place: 'luka', at: DOOR_LUKA }, { place: 'chase', at: DOOR_CHASE },
    { act: [['luka', 'idle'], ['chase', 'idle']] },
    // [WIDE · from the doorway] A neat, cold, symmetrical room; the London skyline over the bed like an altarpiece.
    // One mug. A Filofax, a typewriter, a dictaphone. No photos. Rue at the desk with his back to the door.
    { shot: 'INSERT', at: 'doorway_wide' },
    { wait: 1.6 },
    say('luka', 'We need you to keep your phone for thirty-nine years, and answer it on one particular morning.'),
    // [CLOSE · the back of Rue's head] He doesn't turn round.
    { shot: 'INSERT', at: 'rue_back' },
    say('rue19', "The answer's no."),
    say('chase', 'You didn\'t even—'),
    say('rue19', "It's eight hundred grams of the most important thing I own, and you want me to keep it charged for your science project until I'm fifty-eight."),
    say('luka', 'Yes.'),
    say('rue19', 'No.'),
    // [MID · Rue swivels his chair to face them]
    { shot: 'CAM', pos: [-12.78, 1.82, 3.4], look: [-13.85, 1.62, 3.08], fov: 50 },
    { act: [['rue19', 'sit']] },
    { wait: 0.2 },
    { sfx: 'creak', vol: 0.3 },
    { do: (c) => { const r = actor(c, 'rue19'), ch = c.world.prop('desk_chair'); r.face(H, 1.1); tween(c, 1.1, () => { if (ch) ch.rotation.y = r.rotY; }); } },
    { wait: 1.2 },
    { expr: [['rue19', 'smug']] },
    // [POV · Rue's, slow pan] The polos. The badge. The desperation. Something calculates.
    { shot: 'POV', from: 'rue19', at: [-12.3, 1.62, 3.42], move: 'pan', to: [-12.38, 1.52, 2.95], dur: 1.6 },
    { wait: 1.6 },
    { shot: 'POV', from: 'rue19', at: [-12.38, 1.52, 2.95], move: 'pan', to: [-12.34, 2.08, 3.16], dur: 1.4 },
    { expr: [['luka', 'worried'], ['chase', 'worried']] },
    { wait: 1.4 },
    say('rue19', '…You two sell things. In the future.'),
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    say('luka', 'Phones. Plans. Internet.'),
    say('rue19', 'Are you any good?'),
    say('luka', "He's the best casual we've got."),
    say('chase', "He's the best 2IC."),
    // [LOW · Rue, the London poster behind his head]
    LOW,
    say('rue19', "The Enterprise Prize is in eight days. Fenwick's coming over from London. If I win, I'm in the City by summer. Help me win. ^ And I'll think about your phone."),
    say('luka', 'Think about it.'),
    say('rue19', "That's more than anyone else gets."),
    say('chase', 'Deal.'),
    say('luka', 'Chase—', { act: 'glance' }),
    say('chase', 'He said think. Think is basically yes.'),
    say('rue19', "It's really not."),
    // Luka steps into the room (out of the LOW's frame) for the roam; Chase stays in the doorway
    { place: 'luka', at: [-13.05, 0.4, 2.2, -0.7] }, { act: [['luka', 'idle']] },
  ];

  // [WIDE · from the bed, looking down] Two coats laid out on the floor: part of the deal.
  CUTSCENES['2.8_floor'] = [
    { prop: 'coats', visible: true, pos: [0, 0, 0] },
    { place: 'rue19', at: [-15.55, 0.4, 3.0, -H] }, { place: 'luka', at: [-15.95, 0.4, 2.05, -0.5] }, { place: 'chase', at: [-15.85, 0.4, 4.2, -2.4] },
    { act: [['rue19', 'idle'], ['luka', 'look_down'], ['chase', 'look_down']] },
    { expr: [['rue19', 'smug'], ['luka', 'neutral'], ['chase', 'neutral']] },
    { shot: 'INSERT', at: 'bed_view' },
    { wait: 1.4 },
    say('rue19', "The floor is the most generous thing I've ever done. Don't scuff it."),
    { wait: 0.6 },
  ];

  // =================================================================== 2.9 — "Lights Out"
  // [WIDE · locked, floor level] One setup for the whole scene: the boys under their coats, heads toward camera, Rue's bed
  // a dark shape above them with his back turned, the streetlight's rain-shadows crawling over all three. The camera pushes
  // in so slowly nobody notices, until the frame holds only the two of them. One cut, at the very end.
  const FLOOR = { pos: [-14.95, 0.78, 3.1], look: [-17.3, 0.45, 3.1], fov: 50 };   // = the set's floor_wide anchor
  const FLOOR_END = { pos: [-15.3, 0.8, 3.1], look: [-16.75, 0.47, 3.1], fov: 46 };
  const PUSH = { shot: 'CAM', pos: FLOOR.pos, look: FLOOR.look, fov: FLOOR.fov, to: FLOOR_END, dur: 80, ease: 'linear' };
  function bedDress(c) {
    const P = (n) => c.world.prop(n);
    const co = P('coats'); if (co) { co.visible = true; co.position.set(0, 0.22, 0); }
    const l = P('room_lamp'); if (l && l.userData.on) l.userData.on(false);
    const d = P('door'); if (d) d.userData.open = false;
    const ch = P('desk_chair'); if (ch) ch.rotation.y = -H;
    for (const id of ['luka', 'chase']) actor(c, id).play('lie');
    // Rue on his side, back to the room: the rig lies face up, then the whole body rolls toward the wall
    const r = actor(c, 'rue19');
    umbrella(c, false);
    r.place([-17.82, 1.13, 3.05, PI]); r.play('lie'); r.root.rotation.z = -H; r.shadow.visible = false;
  }
  // the push-in finishes on the two of them whatever the reading speed: glide the rest of the way from wherever it is
  function settlePush(c) {
    if (c.flow.skipping) return;
    const cm = c.world.camera, p = cm.position, d = new THREE.Vector3();
    cm.getWorldDirection(d);
    if (p.distanceTo(new THREE.Vector3(...FLOOR_END.pos)) < 0.02) return;
    c.cam.shot({ shot: 'CAM', pos: [p.x, p.y, p.z], look: [p.x + d.x * 1.4, p.y + d.y * 1.4, p.z + d.z * 1.4], fov: cm.fov, to: FLOOR_END, dur: 2.4 });
  }
  // "They both laugh, quietly": mouths going and a few soft voice blips each
  function laugh(c) {
    if (c.flow.skipping) return;
    for (const id of ['chase', 'luka']) { c.world.talk(id, true); setTimeout(() => c.world.talk(id, false), 900); }
    for (const [id, t] of [['chase', 0], ['luka', 0.15], ['chase', 0.35], ['luka', 0.5], ['chase', 0.7]]) setTimeout(() => AUDIO.blip(id, false), t * 1000);
  }
  // [CLOSE · Rue, in the dark] from the wall side: his eyes are open. They have been the whole time.
  function rueInTheDark(c) {
    const r = actor(c, 'rue19'), v = new THREE.Vector3();
    r.eyePos(v);
    const s = c.world.torch;
    if (s) { c.world.torchAuto = false; s.position.set(v.x - 0.35, v.y + 0.9, v.z - 0.2); s.target.position.copy(v); s.color.set(0x8ea4d8); s.angle = 0.3; s.intensity = 1.1; }
    c.cam.shot({ shot: 'CAM', pos: [-18.38, v.y + 0.12, v.z - 0.42], look: [v.x, v.y - 0.02, v.z], fov: 42 });
  }

  SCENES['2.9'] = {
    title: 'Lights Out', set: 'rooms', env: 'night', time: 'Thu 15 Oct 1987, night',
    playable: [], swap: false, hud: { battery: 1, bars: 3 }, music: null,
    spawn: { luka: 'floor_luka', chase: 'floor_chase', rue19: 'bed' },
    steps: [['cutscene', '2.9']],
    grants: { battery: 1, bars: 3 },
  };

  CUTSCENES['2.9'] = [
    { do: bedDress },
    PUSH,
    { wait: 1.5 },
    snap('floor'),
    slow('chase', 'Luka? You awake?'),
    slow('luka', 'No.'),
    slow('chase', 'Do you think we\'re getting home?'),
    slow('luka', 'Yeah.'),
    // The lanyard clasp clicks in the dark.
    { wait: 0.6 },
    { sfx: 'tick', vol: 0.6 }, { wait: 0.35 }, { sfx: 'tick', vol: 0.45 },
    { wait: 0.8 },
    slow('chase', "You're fiddling with your lanyard."),
    slow('luka', '…I don\'t know, mate.'),
    { wait: 1.4 },                                                  // A pause.
    slow('chase', 'Can I tell you something dumb?'),
    slow('luka', "You built a time machine out of display phones. The bar's pretty high."),
    slow('chase', "That's the dumb thing. I built a time machine in, like, forty minutes. And the first thing I did with it was get us stuck. I always do this. I get an idea and I think, this is it, this is finally the thing. And then it's not."),
    slow('luka', 'Chase.'),
    slow('chase', "I've got two hundred and twelve unfinished songs on my laptop. Pudding has never finished a song."),
    slow('luka', 'Why Pudding?'),
    slow('chase', 'Long story.'),
    slow('luka', "We've got time."),
    slow('chase', "…It's still a long story. ^ I just want to do something that means something. Everyone I went to school with is doing something. I sell screen protectors. And I'm good at it, which is somehow worse."),
    { wait: 1.2 },                                                  // A beat.
    slow('luka', 'You know how I got 2IC?'),
    slow('chase', 'You were the best one.'),
    slow('luka', "There was no one else. Nobody else could do it, so it had to be me. That's the whole story. I didn't earn it. I was just the only one who could."),
    slow('chase', "That's not nothing."),
    slow('luka', "It's not leadership. Leaders know what to do. I never know what to do. I fiddle with this and wait for someone to tell me."),
    { wait: 1.4 },                                                  // Pause.
    slow('chase', 'When I was ripping the phones off the wall, you followed me in.'),
    slow('luka', 'Someone had to stop you.'),
    slow('chase', "You didn't stop me."),
    slow('luka', '…No.'),
    slow('chase', 'You said it was genius.'),
    slow('luka', "It WAS genius. It was also the dumbest thing anyone's ever done."),
    // They both laugh, quietly. Then it's quiet.
    { expr: [['luka', 'laugh'], ['chase', 'laugh']] },
    { do: laugh },
    { wait: 1.3 },
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    { wait: 1.3 },
    slow('chase', 'Night, Luka.'),
    slow('luka', 'Night, mate.'),
    // The push-in finishes on the two of them. Two seconds of dark.
    { do: settlePush },
    { wait: 1.4 },
    { fade: 'out', dur: 0.9 },
    { wait: 2 },
    // [CLOSE · Rue, in the dark] The only cut in the scene.
    { do: rueInTheDark },
    { fade: 'in', dur: 0.6 },
    { wait: 0.3 },
    slow('rue19', 'Would yous two shut up. Some of us have a future.'),
    slow('chase', 'We literally have a—', { tag: 'off' }),
    slow('rue19', 'SHUT UP.'),
    { wait: 0.6 },
    { fade: 'out', dur: 0.8 },
    { do: (c) => { const s = c.world.torch; if (s) { s.intensity = 0; c.world.torchAuto = true; } unroll(c); } },
  ];
})();
