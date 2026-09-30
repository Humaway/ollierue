// ============================================================ CONTENT: 2.11 "The Phone That Never Rings", 2.12 "Black Monday", 2.13 "Torchlight"
// SPEC §11. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
// Mini-games: rue_walk {walk: 2} (68-mg-keepup-ruewalk.js), torchlight (6a-mg-torchlight.js). Sets: square, buttery, rooms.
(() => {
  const PI = Math.PI, H = PI / 2;
  const say = (id, text, o) => Object.assign({ say: id, text }, o);
  const slow = (id, text, o) => say(id, text, Object.assign({ speed: 'slow' }, o));
  const actor = (c, id) => c.world.actor(id);
  const snap = (name) => ({ do: () => { if (MINIGAMES.final_yes && MINIGAMES.final_yes.snap) MINIGAMES.final_yes.snap(name); } });
  const show = (c, id, part, v) => { const a = actor(c, id), o = a && a.rig.attach[part]; if (o) o.visible = v; };
  // seated (the stone plinth, a chair, a bed): seated upper-body anims keep the sit pose; `then` = the anim on top
  function seat(c, id, at, h = 0.46, then) {
    const a = actor(c, id);
    if (!a) return;
    if (at) a.place(at);
    a.play('sit', { h }); a.rig.seated = true;
    if (then) a.play(then);
  }
  function glanceAt(c, id, at, dur = 1.3) {   // turn the head toward someone without moving the feet
    const a = actor(c, id), b = actor(c, at);
    if (!a || !b) return;
    let d = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z) - a.rotY; d = Math.atan2(Math.sin(d), Math.cos(d));
    a.play('glance', { yaw: Math.max(-1.4, Math.min(1.4, d)), dur });
  }
  const stand = (c, id) => { const a = actor(c, id); if (a) { a.rig.seated = false; a.play('idle'); } };
  // hands up in front of the chest (the 'reading' pose) holding an attachment instead of a book
  function holdUp(c, id, part) {
    const a = actor(c, id);
    if (!a) return;
    a.play('reading');
    return c.wait(0.05).then(() => { const g = a.rig.attach; if (g.textbook) g.textbook.visible = false; if (g[part]) g[part].visible = true; });
  }
  // is this on screen in the dialogue box yet? (cues inside one long line)
  const typed = (s) => { const t = document.querySelector('#dlg .txt'); return !!t && t.textContent.includes(s); };

  // Rue's brick phone / Walkman put down somewhere: a copy of his rig's own mesh, centred in a pivot group
  const PUT = {};
  function putDown(c, n, at, rot) {
    let g = PUT[n];
    if (!g) {
      const r = actor(c, 'rue19'), src = r && r.rig.attach[n];
      if (!src) return null;
      const m = src.clone(), ctr = new THREE.Vector3();
      m.visible = true; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0);
      m.geometry.computeBoundingBox(); m.geometry.boundingBox.getCenter(ctr); m.position.copy(ctr).negate();
      g = PUT[n] = new THREE.Group(); g.name = 'rue_' + n; g.add(m);
    }
    c.world.scene.add(g);
    g.position.set(at[0], at[1], at[2]); g.rotation.set(rot[0], rot[1], rot[2]); g.scale.setScalar(1); g.visible = true;
    return g;
  }
  const pickUp = (n) => { const g = PUT[n]; if (g && g.parent) g.parent.remove(g); };
  const facing = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]);   // rotY that shows local -x (the keypad) toward `to`, for an upright brick: + PI/2
  // Rue's things back on his rig (rigs are pooled across scenes)
  function tidyRue(c) {
    pickUp('brick'); pickUp('walkman');
    show(c, 'rue19', 'brick', false); show(c, 'rue19', 'walkman', true); show(c, 'rue19', 'headphones', true); show(c, 'rue19', 'scarf', true);
  }
  // Leaving 2.11–2.13 early (quit, scene select): the pooled rigs and Rue's put-down things go back as they were
  const RIGS = {};
  function watch(c) {
    for (const id of ['rue19', 'luka', 'chase']) { const a = actor(c, id); if (a) RIGS[id] = a.rig; }
    if (RIGS.u) return;
    addUpdate(RIGS.u = () => {
      if (['2.11', '2.12', '2.13'].includes(flow.sceneId)) return;
      removeUpdate(RIGS.u); RIGS.u = null;
      pickUp('brick'); pickUp('walkman'); if (COAT && COAT.parent) COAT.parent.remove(COAT);
      const g = RIGS.rue19 && RIGS.rue19.attach;
      if (g) { if (g.brick) g.brick.visible = false; for (const n of ['walkman', 'headphones', 'scarf']) if (g[n]) g[n].visible = true; }
      for (const id of ['luka', 'chase']) { const p = RIGS[id] && RIGS[id].attach.phone; if (p) p.visible = false; }
    });
  }

  // =================================================================== 2.11 — "The Phone That Never Rings"
  const CHASE_STEP = [-1.0, 0, 3.97, 0];
  const STONE = [-0.4, 0.63, 3.8], WALKMAN_STONE = [-0.62, 0.478, 3.72];   // the brick phone upright on the stone between them; the Walkman flat beside it
  // [TWO-SHOT · side-on] the two of them on the step from the side (~50° off their facing), the phone standing between them
  const SIDE = { pos: [2.9, 1.35, 6.6], look: [-0.3, 0.7, 3.95] };
  const TWO_SIDE = { shot: 'CAM', pos: SIDE.pos, look: SIDE.look, fov: 38 };
  const nearRue = () => { const a = world.actor('chase'), r = world.actor('rue19'); return !!a && !!r && Math.hypot(a.pos.x - r.pos.x, a.pos.z - r.pos.z) < 8.5; };
  // (the roam) Chase walks toward a voice: Rue's "call", wordless, his mouth going, carrying across the square
  async function chatter(c) {
    const r = actor(c, 'rue19');
    while (r && c.flow.sceneId === '2.11' && !c.flow.skipping && !nearRue()) {
      const ch = actor(c, 'chase');
      if (ch && Math.hypot(ch.pos.x - r.pos.x, ch.pos.z - r.pos.z) < 20) {
        c.world.talk('rue19', true);
        for (let i = 5 + Math.random() * 9 | 0; i > 0; i--) { if (c.AUDIO) c.AUDIO.blip('rue19'); await c.wait(0.12); }
        c.world.talk('rue19', false);
      }
      await c.wait(0.8 + Math.random() * 1.4);
    }
    c.world.talk('rue19', false);
  }

  function dress211(c) {
    watch(c);
    tidyRue(c);
    seat(c, 'rue19', 'steps_rue', 0.46, 'fake_call');
    for (const n of ['cyclist', 'bike', 'bike_chain']) { const o = c.world.prop(n); if (o) o.visible = false; }   // (the bike went to the lab in 2.6)
  }
  function setDown(c) {   // the phone on the stone between them, standing up, its dead display toward the lens; the Walkman beside it
    show(c, 'rue19', 'brick', false); show(c, 'rue19', 'walkman', false);
    putDown(c, 'brick', STONE, [0, facing(STONE, SIDE.pos) + H, 0]);
    putDown(c, 'walkman', WALKMAN_STONE, [0, 0.5, -H]);
  }

  SCENES['2.11'] = {
    title: 'The Phone That Never Rings', set: 'square', env: 'sunday', time: 'Sun 18 Oct 1987',
    playable: ['chase'], swap: false, hud: { battery: 4, bars: 2 }, music: null,   // no music; just rain
    spawn: { chase: 'lodge_out', rue19: 'steps_rue' },
    hotspots: [{ id: 'gutter', at: 'gutter', r: 1.4, sample: 'rain' }],   // (the rain sample, from 2.6)
    steps: [
      ['cutscene', '2.11_call'],
      ['control', 'chase'],
      ['objective', 'Talk to Rue.'],
      ['do', (c) => { chatter(c); }],
      ['roam', { until: nearRue, async auto(c) { await actor(c, 'chase').moveTo([-5, 0, 9]); } }],
      ['objective', null],
      ['cutscene', '2.11_steps'],
    ],
    grants: { battery: 4, bars: 2 },
  };

  CUTSCENES['2.11_call'] = [
    { do: dress211 },
    // [WIDE · long lens across the square] Rue alone on the Campanile steps, taking a "call" loudly enough to carry.
    { shot: 'CAM', pos: [-13.2, 1.55, 12.6], look: [0.4, 1.05, 4.1], fov: 15 },
    { wait: 1.6 },
    say('rue19', "Yes. Yes. Sell everything. Tell Fenwick I'll call him back."),
    { wait: 0.6 },
  ];

  CUTSCENES['2.11_steps'] = [
    // [TRACK · behind Chase as he walks up]
    { place: 'chase', at: [-2.45, 0, 11.3, 2.9] },
    { shot: 'MID', on: 'chase', move: 'track', track: 'behind', dur: 30 },
    { move: 'chase', to: [-0.95, 0, 5.2], nowait: true },
    { wait: 1.6 },
    say('chase', "Rue. It's off."),
    say('rue19', "It's on standby."),
    { do: (c) => waitUntil(() => c.flow.skipping || !actor(c, 'chase').mv.on) },
    { face: 'chase', to: 'rue19' },
    say('chase', "I sell phones, mate. It's off. There's no light."),
    // [INSERT] The brick phone's display. Blank. The first time the camera shows it.
    { shot: 'INSERT', at: 'rue19', card: ['brick', { lit: false }] },
    { wait: 2 },
    // [CLOSE · Rue] He lowers the phone. A beat.
    { shot: 'CLOSE', on: 'rue19' },
    { act: [['rue19', 'idle']] },
    { do: (c) => c.wait(0.05).then(() => show(c, 'rue19', 'brick', true)) },
    { wait: 1.2 },
    say('rue19', 'Nobody has the number.'),
    say('chase', "Then why'd you buy it?"),
    say('rue19', "One person has it. Fenwick. So when he rings with the offer, I'm reachable. ^ People who matter are reachable."),
    // [TWO-SHOT · side-on] Chase sits down on the step. Rue sets the brick phone on the stone between them: the gap, and a
    // third character in the frame. A Walkman sits beside it.
    TWO_SIDE,
    { move: 'chase', to: CHASE_STEP },
    { do: (c) => seat(c, 'chase', CHASE_STEP) },
    { act: [['rue19', 'give', { dur: 1.2 }]] },
    { wait: 0.7 },
    { do: setDown },
    { wait: 1.2 },
    say('chase', 'What are you listening to?'),
    say('rue19', '"Winning Is a Decision." Side A.'),
    say('chase', "That's not music."),
    say('rue19', "It's better than music. It's advice."),
    say('chase', 'Who from?'),
    say('rue19', 'A man in Ohio.'),
    say('chase', 'When did you last listen to an actual song?'),
    say('rue19', "Music's for people with time."),
    // Chase stares at him like he's confessed to a crime. (held in the two-shot)
    { expr: [['chase', 'stunned']] },
    { do: (c) => glanceAt(c, 'chase', 'rue19', 2.0) },
    { wait: 1.8 },
    { expr: [['chase', 'neutral']] },
    say('chase', 'How much was the phone?'),
    say('rue19', 'Everything I had.'),
    // [CLOSE · Chase]
    { shot: 'CLOSE', on: 'chase', locked: true },
    slow('chase', 'Do you want to matter? Or do you want people to think you matter?'),
    // [CLOSE · Rue]
    { shot: 'CLOSE', on: 'rue19', locked: true },
    slow('rue19', "What's the difference?"),
    slow('chase', "…I don't know. I've been trying to work it out my whole life."),
    // [POV · Rue's, across the square] Students heading home. A porter locking a gate.
    { prop: 'porter', fn: (o) => { if (o.userData.lock) o.userData.lock(); } },
    { shot: 'POV', from: 'rue19', at: [4, 1.5, 14.5], move: 'pan', to: [22.3, 1.3, 5.6], dur: 16 },
    slow('rue19', "Everyone's going, you know. Half my year. London. Boston. Sydney. Every Christmas there's fewer of us in the pub. So I'm going first. And I'll be so busy I won't miss anyone."),
    say('chase', 'Does that work?'),
    say('rue19', '^It will.'),
    say('chase', "What if he doesn't ring?"),
    say('rue19', "He'll ring."),
    // [TWO-SHOT · both looking down at the silent phone between them]
    { act: [['chase', 'look_down'], ['rue19', 'look_down']] },
    { shot: 'CAM', pos: [1.9, 1.45, 6.9], look: [-0.3, 0.68, 3.9], fov: 38 },
    say('chase', 'The company you run. It sells a thing called "Yes". That\'s the whole idea. You say yes to people.'),
    say('rue19', 'Sounds exhausting.'),
    slow('chase', "It is. ^ It's also the best bit."),
    // [CRANE · slowly up] Away from the two small figures, up the stone of the Campanile, to the silent bell.
    { shot: 'CAM', pos: [2.0, 1.3, 8.3], look: [-0.25, 0.9, 4.0], fov: 40, to: { pos: [1.1, 10.3, 7.0], look: [0, 9.9, 0.4], fov: 40 }, dur: 6 },
    { wait: 5 },
    { fade: 'out', dur: 1.2 },   // (it lands on the bell as the fade takes it)
    { do: (c) => { tidyRue(c); stand(c, 'chase'); } },
  ];

  // =================================================================== 2.12 — "Black Monday"
  const TABLE_PHONE = [5.64, 0.776, -3.55];   // flat on his table, by his right hand, the display up
  let ringing = 0;
  async function ring(c) {   // the brick phone's harsh trill, every 3 s until he picks up
    const k = ++ringing;
    while (k === ringing && !c.flow.skipping && c.flow.sceneId === '2.12') { c.sfx('brick_ring', { vol: 0.9 }); await c.wait(3); }
  }
  // his grey overcoat over the back of the empty chair beside him (he walks out into the rain without it); gone under the fade
  let COAT = null;
  function coat(c, on) {
    if (!COAT) {
      const b = new Builder(), m = mat(0x62666c), d = mat(0x44474d);
      b.box(0.44, 0.52, 0.05, m, [0, 0.66, -0.225]); b.box(0.43, 0.05, 0.1, m, [0, 0.915, -0.19]);   // hanging down the back, folded over the rail
      b.box(0.4, 0.08, 0.055, d, [0, 0.88, -0.235]); b.box(0.07, 0.42, 0.04, m, [0.2, 0.6, -0.2]);    // collar; a sleeve down the side
      COAT = b.done(); COAT.name = 'rue_coat';
    }
    if (on) { c.world.scene.add(COAT); COAT.position.set(6.7, 0, -4.1); } else if (COAT.parent) COAT.parent.remove(COAT);
  }
  // one student near the TV reads the prices aloud, horrified: wordless, pointing at the screen
  async function readAloud(c) {
    const a = actor(c, 'st_news');
    if (!a) return;
    a.setExpr('stunned'); a.play('point');
    c.world.talk('st_news', true);
    for (let i = 0; i < 26 && !c.flow.skipping; i++) { if (c.AUDIO) c.AUDIO.blip('student', i % 9 === 8); await c.wait(i % 9 === 8 ? 0.5 : 0.11); }
    c.world.talk('st_news', false);
    a.play('idle'); a.setExpr('worried');
  }
  function dress212(c) {
    const P = (n) => c.world.prop(n);
    watch(c);
    tidyRue(c);
    seat(c, 'rue19', 'rue_seat', 0.46, 'idle');
    coat(c, true);
    putDown(c, 'brick', TABLE_PHONE, [0, -H, -H]);
    const tv = P('tv_screen'); if (tv && tv.userData.show) tv.userData.show('news');
    const cr = P('crowd'); if (cr && cr.userData.look) cr.userData.look('tv');
    for (const id of ['luka', 'chase', 'bernie']) { const a = actor(c, id); if (a) a.face('tv', 0); }
  }
  // "The smile keeps its shape and empties": the eyes and brows go while the mouth stays
  async function emptySmile(c) {
    const f = actor(c, 'rue19').rig.face, t0 = clock.t, at = (s) => waitUntil(() => c.flow.skipping || typed(s) || clock.t - t0 > 30);
    await at('Mr Fenwick'); f.eyes('open'); f.brows('raised'); f.mouth('smile');
    await at('Frozen'); f.eyes('open'); f.brows('neutral');
    await at('No, of'); f.eyes('half'); f.brows('worried');
    await at('Thank you'); f.mouth('smile');
  }
  // 'set_down': the brick phone from his ear, slowly, down flat on the table by his hand (the 'tap' reach, the hand turned
  // flat, a lean), held there a moment (content swaps the rig's brick for the table copy), then the hand back
  const SET_DOWN = [5.83, 0.777, -3.65], SET_ROT = [0, 2.28, -H], SET_T = 3.6;   // where that lands; its display up
  if (!ANIMS.set_down) {
    const N = ['torso', 'head', 'armR', 'foreR', 'handR'], R0 = N.map(() => new THREE.Quaternion()), PH = N.map(() => new THREE.Quaternion()),
      D = N.map(() => new THREE.Quaternion()), q = new THREE.Quaternion(), sm = (x) => x * x * (3 - 2 * x);
    const grab = (P, Q) => { for (let i = 0; i < N.length; i++) Q[i].setFromEuler(P[N[i]].rotation); };
    const put = (P, Q) => { for (let i = 0; i < N.length; i++) { const o = P[N[i]].rotation; o.setFromQuaternion(Q[i], o.order); } };
    ANIMS.set_down = (r, t, p) => {
      const P = r.parts, u = Math.min(1, t / SET_T);
      grab(P, R0);                                                   // the seated rest (the pose's sit pass)
      ANIMS.phone(r, t, p); grab(P, PH); put(P, R0);
      ANIMS.tap(r, 0, p); P.handR.rotation.set(0, 1, 0); P.torso.rotation.x += 0.2; P.head.rotation.x += 0.3; grab(P, D);
      const [A, B, k] = u < 0.6 ? [PH, D, sm(u / 0.6)] : u < 0.75 ? [D, D, 1] : [D, R0, sm((u - 0.75) / 0.25)];
      for (let i = 0; i < N.length; i++) { const o = P[N[i]].rotation; q.copy(A[i]).slerp(B[i], k); o.setFromQuaternion(q, o.order); }
    };
    ANIMS.set_down.upper = true; ANIMS.set_down.shows = 'brick';
  }
  async function lowerPhone(c) {   // very carefully: his hand lays it down, then lets go
    const r = actor(c, 'rue19'), b = r && r.rig.attach.brick;
    if (!b) return;
    r.play('set_down');
    if (!c.flow.skipping) await waitUntil(() => c.flow.skipping || r.anim !== 'set_down' || r.poseT >= 0.66 * SET_T);   // (in the hold)
    const g = putDown(c, 'brick', SET_DOWN, SET_ROT);
    b.visible = false;
    if (!g || c.flow.skipping || r.anim !== 'set_down') return;
    b.updateMatrixWorld(true);   // exactly where his hand left it
    b.getWorldQuaternion(g.quaternion); b.getWorldScale(g.scale);
    b.localToWorld(g.position.copy(g.children[0].position).negate());   // (the copy's pivot is the mesh's centre)
  }
  function toWindow(c) {   // Rue out on the street in the rain; the boys at the window
    pickUp('brick');
    const r = actor(c, 'rue19');
    r.rig.seated = false; r.play('idle'); r.walkAnim = 'walk';
    r.place([10.25, 1.3, -4.6, 0]);
    actor(c, 'luka').place('window_in'); actor(c, 'chase').place('window_in2');
    for (const id of ['luka', 'chase']) actor(c, id).play('look_up');
    const cr = c.world.prop('crowd'); if (cr && cr.userData.look) cr.userData.look(null);
  }

  SCENES['2.12'] = {
    title: 'Black Monday', set: 'buttery', env: 'day', time: 'Mon 19 Oct 1987',
    playable: ['rue19'], swap: false, hud: { battery: 4, bars: 0 }, music: null,
    spawn: { rue19: 'rue_seat', luka: 'tv_watch', chase: 'tv_watch2', bernie: 'counter_bernie', st_news: { at: [0.6, 0, 0.05, 0.86], look: 'student_d' } },
    steps: [
      ['do', (c) => c.world.preload('square')],
      ['cutscene', '2.12_news'],
      ['do', (c) => { c.ui.fade(0, 0.8); }],   // (the walk's own camera is on from its first frame)
      ['minigame', 'rue_walk', { walk: 2 }],
      ['cutscene', '2.12_bell'],
    ],
    grants: { battery: 4, bars: 0 },
  };

  CUTSCENES['2.12_news'] = [
    { do: dress212 },
    // [CLOSE · the Buttery TV] A news bulletin. Red numbers falling: New York, London, everywhere.
    { shot: 'INSERT', at: 'tv', card: ['tv', { kind: 'news' }] },
    { wait: 2.8 },
    // [PAN · across the Buttery] Faces turned up to the screen. A student reads the prices aloud, horrified.
    { shot: 'CAM', pos: [4.5, 2.15, 3.3], look: [-3.0, 0.95, 0.4], fov: 50, to: { look: [3.0, 0.95, -3.6] }, dur: 8 },
    { sfx: 'murmur', vol: 0.8 },
    { do: (c) => { readAloud(c); } },
    { wait: 3.6 },
    say('bernie', "London's down ten percent. What does that mean?"),
    // [TWO-SHOT · tight] (from under the TV: both faces up to it)
    { shot: 'CAM', pos: [4.25, 1.72, 2.15], look: [3.3, 1.5, -0.12], fov: 36 },
    { do: (c) => glanceAt(c, 'luka', 'chase', 2.2) },
    say('luka', 'What does that mean?', { tag: 'quietly' }),
    { expr: [['chase', 'stunned']] },
    say('chase', "Black Monday. It's Black Monday. I forgot."),
    { expr: [['chase', 'worried']] }, { face: 'luka', to: 'chase', dur: 0.4 },
    say('luka', 'You KNEW about this?'),
    { face: 'chase', to: 'luka', dur: 0.4 },
    say('chase', 'I saw it in a movie!'),
    say('luka', 'We could have WARNED him.'),
    say('chase', 'We warned him about JARVIS and he said no!'),
    // [WIDE · the whole Buttery, Rue at his corner table] The brick phone rings: a harsh 80s electronic trill the player
    // needs to remember. The first time, ever. Every head turns toward him, and the camera turns with them, pushing slowly in on Rue.
    { shot: 'CAM', pos: [-7.4, 3.0, -0.6], look: [2.5, 0.9, -2.0], fov: 55, to: { pos: [1.6, 1.9, -1.2], look: [5.9, 1.05, -3.9], fov: 44 }, dur: 5 },
    { do: (c) => { ring(c); } },
    { wait: 0.8 },
    { prop: 'crowd', fn: (o) => { if (o.userData.look) o.userData.look('rue_seat'); } },
    { face: 'bernie', to: 'rue19', dur: 0.6 }, { face: 'luka', to: 'rue19', dur: 0.8 }, { face: 'chase', to: 'rue19', dur: 0.7 }, { face: 'st_news', to: 'rue19', dur: 0.7 },
    { expr: [['chase', 'neutral']] },
    { wait: 4.2 },
    // [ECU] The phone's display lights up green.
    { shot: 'INSERT', at: TABLE_PHONE, from: [5.62, 1.12, -3.36], fov: 30, card: ['brick', { lit: true }] },
    { wait: 2 },
    // [CLOSE · Rue, one unbroken slow push-in for the whole call] He answers beaming. As the news comes, the smile keeps its
    // shape and empties.
    { do: () => { ringing++; pickUp('brick'); } },
    { act: [['rue19', 'phone']] },
    { expr: [['rue19', 'laugh']] },
    { shot: 'CLOSE', on: 'rue19', move: 'push', amount: 0.62, dur: 14, ease: 'linear' },
    { wait: 0.6 },
    { par: [slow('rue19', 'Rue speaking. ^ Mr Fenwick. Yes. Yes, I saw. ^ Frozen. All graduate hiring. ^ No, of course. Of course. ^ Yes. Thank you for letting me know.'), { do: emptySmile }] },
    // [INSERT] He puts the phone down on the table very carefully. (his hand comes down into the frame with it)
    { shot: 'INSERT', at: SET_DOWN, from: [6.3, 1.25, -2.95], fov: 38 },
    { do: lowerPhone },
    { wait: 1.2 },
    { shot: 'CLOSE', on: 'rue19', locked: true },
    say('chase', 'Rue?', { tag: 'off' }),
    slow('rue19', "The prize is still on, apparently. They just won't be giving anyone anything."),
    { wait: 0.6 },
    // [WIDE · from inside, through the Buttery window] Rue walks out into the rain without his coat. The boys in the
    // foreground, reflected in the glass.
    { do: toWindow },
    { shot: 'CAM', pos: [5.0, 1.45, 0.1], look: [9.0, 2.15, -0.3], fov: 50 },
    { move: 'rue19', to: [10.25, 1.3, 6.5], nowait: true },
    { wait: 4 },
    { fade: 'out', dur: 1.0 },
    { do: (c) => coat(c, false) },
    // (Front Square, under black: one tick for the set to dress itself for the rain before the walk clears it)
    { set: 'square', env: 'rain', spawn: { rue19: [7.27, 0, 13.6, PI] } },
    { wait: 0.2 },
  ];

  CUTSCENES['2.12_bell'] = [
    { do: (c) => { const r = actor(c, 'rue19'); if (r) { r.walkAnim = 'walk'; r.face(PI, 0); } } },
    { prop: 'umbrella_crowd', visible: false },   // a grey square with nobody in it
    { prop: 'bike', visible: false }, { prop: 'bike_chain', visible: false },   // (the bike went to the lab in 2.6)
    // [CRANE · up to the silent bell and back down] He sits on its steps.
    { shot: 'CAM', pos: [0.45, 2.0, -1.1], look: [0.35, 1.85, 2.6], fov: 50, to: { pos: [0.25, 8.3, 0.25], look: [0.25, 10.3, 0.3], fov: 55 }, dur: 4.5 },
    { wait: 1.2 },
    { move: 'rue19', to: 'steps_rue', nowait: true },   // (out of shot below while the camera is on the bell)
    { wait: 2.2 },
    { do: (c) => seat(c, 'rue19', 'steps_rue', 0.46, 'look_down') },   // (head-in-hands only from above: rule 7)
    { wait: 1.2 },
    { shot: 'CAM', pos: [0.25, 8.3, 0.25], look: [0.25, 10.3, 0.3], fov: 55, to: { pos: [0.3, 2.05, 1.3], look: [0.45, 1.0, 4.8], fov: 50 }, dur: 4.5 },
    { wait: 4 },
    // [WIDE · high above] A tiny figure on the steps of a grey square. Hold two seconds. Fade.
    { act: [['rue19', 'head_hands']] },
    { shot: 'INSERT', at: 'sky' },
    { wait: 2 },
    { music: null, fade: 1.4 },
    { fade: 'out', dur: 1.4 },
  ];

  // =================================================================== 2.13 — "Torchlight"
  const MACHINE_DESK = [-20.88, 1.25, 5.62];
  const WALKMAN_COBBLES = [4, 0.018, 11.5];   // dropped on the cobbles, still playing (the torchlight trail, by ear)
  // Rue's head bowed, then slowly back up: 'lift_head' eases the bow off over p.dur
  if (!ANIMS.lift_head) {
    ANIMS.lift_head = (r, t, p) => {
      ANIMS.idle(r, t, p);
      const u = Math.min(1, t / (p.dur || 2.8)), k = 1 - u * u * (3 - 2 * u), P = r.parts;
      P.torso.rotation.x += 0.3 * k; P.neck.rotation.x += 0.2 * k; P.head.rotation.x += 0.4 * k;
    };
    ANIMS.lift_head.upper = true;
  }
  // Chase's hand on Rue's back: the left arm out and round behind the next person on the step
  if (!ANIMS.back_hand) {
    ANIMS.back_hand = (r, t, p) => {
      ANIMS.idle(r, t, p);
      const P = r.parts; P.armL.rotation.set(0.45, 0, 1.0); P.foreL.rotation.set(-0.5, 0, 0); P.handL.rotation.set(0, 0, 0.3);
      P.torso.rotation.z -= 0.06; P.head.rotation.y = 0.35;
    };
    ANIMS.back_hand.upper = true;
  }

  function lodge213(c) {
    const P = (n) => c.world.prop(n), f = state.flags;
    const m = P('machine'); if (m) { m.visible = true; m.position.set(...MACHINE_DESK); m.rotation.set(0, -0.3, 0); }
    for (const [n, v] of [['machine_wrap', false], ['machine_wire', true], ['swivel_chair', false], ['yes_sign', false], ['lodge_light', true], ['cyclist', false],
      ['bike', !f.part_bike], ['bike_chain', !f.part_bike], ['scarf', true], ['machine_prepaid', !f.prepaid_dead]]) { const o = P(n); if (o) o.visible = v; }
    const cd = P('cupboard_door'); if (cd) cd.rotation.y = 0;
    for (let i = 1; i <= 8; i++) { const o = P('lamp_' + i); if (o) o.visible = true; }
    // Rue out on the steps in the rain, head in his hands; his scarf on lamp_4, his Walkman on the cobbles
    watch(c);
    tidyRue(c);
    seat(c, 'rue19', 'steps_rue', 0.46, 'head_hands');
    show(c, 'rue19', 'scarf', false); show(c, 'rue19', 'walkman', false); show(c, 'rue19', 'headphones', false);   // (the headphones went with the Walkman)
    putDown(c, 'walkman', WALKMAN_COBBLES, [0, 0.7, -H]);
    for (const id of ['luka', 'chase']) show(c, id, 'phone', false);
    const s = c.world.torch; if (s) { s.intensity = 0; c.world.torchAuto = true; }
    const d = actor(c, 'des'); if (d) { d.play('idle'); d.face(H, 0); }
  }
  function machineGlow(c) {   // the machine's little screen, the only light in the lodge: the rig's spot, blue, from the desk
    const s = c.world.torch;
    if (!s) return;
    c.world.torchAuto = false;
    s.position.set(-20.95, 1.42, 5.35); s.target.position.set(-22.2, 1.7, 5.35);
    s.color.set(0x8fd0ff); s.angle = 1.25; s.penumbra = 0.8; s.intensity = 9;
  }
  const LAMPS_OUT = [4, 5, 2, 1, 3, 6, 7, 8].flatMap((n) => [{ prop: 'lamp_' + n, visible: false }, { sfx: 'kettle_click', vol: 0.45 }, { wait: 0.5 }]);   // click, click, click
  function torchOn(c) {   // Luka's phone torch comes on in his hand, white, the machine's glow gone
    const s = c.world.torch, a = actor(c, 'luka');
    if (!s || !a) return;
    const v = new THREE.Vector3(); a.rig.attach.gripR.getWorldPosition(v);
    c.world.torchAuto = false;
    s.position.copy(v); s.target.position.set(v.x + Math.sin(a.rotY) * 3, 0.5, v.z + Math.cos(a.rotY) * 3);
    s.color.set(0xf2f4ff); s.angle = 0.45; s.penumbra = 0.5; s.intensity = 22;
  }

  SCENES['2.13'] = {
    title: 'Torchlight', set: 'square', env: 'night', time: 'Mon 19 Oct 1987, 23:40',
    playable: ['luka', 'chase'], swap: true, hud: { battery: 4, bars: 1 }, music: null,
    spawn: { des: 'lodge_window', luka: [-22.55, 0.46, 5.95, 1.95], chase: [-23.25, 0.46, 5.3, 1.65], rue19: 'steps_rue' },
    steps: [
      ['do', (c) => c.world.preload('rooms')],
      ['cutscene', '2.13_lodge'],
      ['control', 'luka'], ['follow', 'chase'],
      ['objective', 'Find Rue.'],
      ['minigame', 'torchlight', { walkman: WALKMAN_COBBLES }],
      ['objective', null],
      ['cutscene', '2.13_steps'],
    ],
    grants: { flags: { rue_yes: true }, battery: 0, bars: 4 },
  };

  CUTSCENES['2.13_lodge'] = [
    { do: lodge213 },
    // [MID · Des at the window] He turns from it to the boys.
    { shot: 'CAM', pos: [-22.45, 1.95, 5.25], look: [-20.95, 1.72, 6.45], fov: 44 },
    { wait: 1.0 },
    { face: 'des', to: 'luka', dur: 0.9 },
    { wait: 0.6 },
    say('des', "He's not in his rooms. He's not in the Buttery. College lights go off at eleven."),
    // [POV · out the window] The square's lamps go out one by one: click, click, click. Pitch black.
    { shot: 'INSERT', at: 'lodge_window_pov' },
    { wait: 1.4 },
    ...LAMPS_OUT,
    { env: 'dark', dur: 0.5 },
    { wait: 1.6 },
    // [TWO-SHOT · the machine glowing on the desk between them] HUD: 4%.
    { place: 'luka', at: [-21.6, 0.46, 4.2, -0.45] }, { place: 'chase', at: [-21.65, 0.46, 6.55, PI + 0.45] },
    { place: 'des', at: [-24.2, 0.46, 6.05, 0.6] },
    { do: machineGlow },
    { shot: 'CAM', pos: [-23.7, 1.9, 5.35], look: [-20.95, 1.35, 5.35], fov: 52 },
    { hud: { battery: 4, bars: 1 } },
    { wait: 0.8 },
    say('chase', "If we use the torches, that's the battery."),
    say('luka', 'I know.'),
    say('chase', "That's our four percent. That's four days of you pedalling. That's home."),
    say('luka', 'I know.'),
    // [INSERT] Luka's hand on his lanyard. He lets go of it.
    { act: [['luka', 'lanyard']] },
    { shot: 'INSERT', at: 'luka' },
    { wait: 1.8 },
    { act: [['luka', 'idle']] },
    { wait: 1.0 },
    // [LOW · Luka] The first sincere low angle in the game. (Mirrored in 3.6.)
    { shot: 'CLOSE', on: 'luka', angle: 'low', dist: 1.1, locked: true },
    slow('luka', "He's on his own, mate. Everyone he knows has left him on his own. We're not doing that."),
    // [CLOSE · Chase]
    { shot: 'CLOSE', on: 'chase', locked: true },
    { expr: [['chase', 'determined']] },
    say('chase', '^Torches on.'),
    // (the boys unplug two phones from the machine: their torches)
    { shot: 'CAM', pos: [-23.7, 1.9, 5.35], look: [-20.95, 1.35, 5.35], fov: 52 },
    { face: 'luka', to: [MACHINE_DESK[0], MACHINE_DESK[2]], dur: 0.35 }, { face: 'chase', to: [MACHINE_DESK[0], MACHINE_DESK[2]], dur: 0.35 },
    { act: [['luka', 'give', { dur: 1.1 }], ['chase', 'give', { dur: 1.1 }]] },
    { wait: 0.55 },
    { sfx: 'tick', vol: 0.8 },
    { do: (c) => { for (const id of ['luka', 'chase']) show(c, id, 'phone', true); } },
    { wait: 0.6 },
    { sfx: 'tick', vol: 0.8 }, { do: torchOn },
    { wait: 0.5 },
    { fade: 'out', dur: 0.6 },
    { expr: [['chase', 'neutral']] },
    { do: (c) => { const s = c.world.torch; if (s) { s.intensity = 0; c.world.torchAuto = true; } } },
  ];

  // ---------------------------------------------------------- the find, the steps, the room
  const EYE = new THREE.Vector3();
  function findSetup(c) {
    c.cam.override(null);
    state.active = 'chase'; c.player.control('chase'); c.player.follower(null); c.flow.follow = null;
    const ch = actor(c, 'chase'), lu = actor(c, 'luka');
    stand(c, 'chase'); stand(c, 'luka');
    ch.place([2.3, 0, 7.4, 2.78]); lu.place([3.25, 0, 7.85, -2.5]);
    for (const id of ['luka', 'chase']) show(c, id, 'phone', true);
    pickUp('walkman');
  }
  // the torch in Chase's hand, its spot sliding from `from` to `to` (and staying there)
  let BEAM = null;
  function beam(c, from, to, dur) {
    const s = c.world.torch, a = actor(c, 'chase');
    if (!s || !a) return;
    c.world.torchAuto = false; s.color.set(0xf2f4ff); s.angle = 0.4; s.penumbra = 0.5; s.intensity = 34;
    let t = c.flow.skipping ? 1 : 0;
    beamOff();
    BEAM = (dt) => {
      t = Math.min(1, t + dt / dur); const k = t * t * (3 - 2 * t), fx = Math.sin(a.rotY), fz = Math.cos(a.rotY);
      s.position.set(a.pos.x + fx * 0.3 - fz * 0.18, a.pos.y + 1.2, a.pos.z + fz * 0.3 + fx * 0.18);
      s.target.position.set(from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k, from[2] + (to[2] - from[2]) * k);
      if (c.flow.sceneId !== '2.13') beamOff();
    };
    addUpdate(BEAM);
  }
  function beamOff() { if (BEAM) { removeUpdate(BEAM); BEAM = null; } }
  async function torchesDie(c) {   // the phone in his hands: its light gutters on his hands and goes out
    const s = c.world.torch, a = actor(c, 'chase');
    beamOff();
    if (!s || !a) return;
    const v = new THREE.Vector3(); a.eyePos(v);
    c.world.torchAuto = false;
    s.position.set(v.x + Math.sin(a.rotY) * 0.45, v.y - 0.45, v.z + Math.cos(a.rotY) * 0.45); s.target.position.set(v.x, v.y - 0.1, v.z);
    s.angle = 0.9; s.penumbra = 0.6;
    for (const k of [1, 0.4, 1, 0.8, 0.15, 0.6, 0.1, 0.35, 0.05, 0]) { s.intensity = 3 * k; if (c.flow.skipping) break; await c.wait(0.12); }
    s.intensity = 0;
  }
  function oneLamp(c) {   // the lamp over the steps: the rig's spot hangs from lamp_1, warm, onto the steps
    const l = c.world.prop('lamp_1'); if (l) l.visible = true;
    const s = c.world.torch;
    if (!s) return;
    c.world.torchAuto = false;
    s.position.set(-2.15, 3.35, 5.1); s.target.position.set(0.4, 0.6, 4.3);
    s.color.set(0xffc986); s.angle = 0.95; s.penumbra = 0.7; s.intensity = 14;
    c.world.env({ hemi: [0x3a4660, 0x0c0c10, 0.32] }, 0.6);   // (a little fill from the wet stone)
    for (const id of ['luka', 'chase']) stand(c, id);
    actor(c, 'chase').place([-1.35, 0, 5.3, 2.21]); actor(c, 'luka').place([1.6, 0, 5.5, -2.44]);   // (either side of him, a gap each)
  }
  const THREE_SHOT = { shot: 'CAM', pos: [0.45, 1.2, 7.7], look: [0.45, 1.0, 4.0], fov: 42 };   // THREE-SHOT, eye level, locked (the crane at the end starts here)
  const SEATS = [['chase', [-0.08, 0, 3.97, 0]], ['luka', [1.02, 0, 3.97, 0]]];
  async function sitThree(c) {   // Chase close beside Rue, no gap, no phone between them; Luka on his other side
    await Promise.all(SEATS.map(([id, at]) => actor(c, id).moveTo(at)));
    for (const [id, at] of SEATS) seat(c, id, at, 0.46, 'idle');
  }
  function craneUp(c) {   // from the top-down on his bowed head, down and round to his eyes as he lifts his head
    const p = c.world.camera.position, r = actor(c, 'rue19');
    if (r) { r.play('lift_head', { dur: 3 }); r.setExpr('crying'); }
    c.cam.shot({ shot: 'CAM', pos: [p.x, p.y, p.z], look: [p.x, p.y - 1.5, p.z + 0.02], fov: 40,
      to: { pos: [EYE.x, EYE.y + 0.03, EYE.z + 0.95], look: [EYE.x, EYE.y - 0.07, EYE.z], fov: 40 }, dur: 3.2 });
  }
  let POT = null;
  function teapot(c, on) {   // Rue's teapot in his right hand, for the pour
    const r = actor(c, 'rue19');
    if (!POT) {
      const b = new Builder(), m = mat(0xece6d8);
      b.cyl(0.075, 0.085, 0.13, 8, m, [0, 0, 0]); b.cyl(0.03, 0.03, 0.03, 6, m, [0, 0.08, 0]);
      b.geo(new THREE.CylinderGeometry(0.012, 0.022, 0.12, 5), m, new THREE.Matrix4().makeRotationZ(-0.9).setPosition(0.1, 0.03, 0));
      POT = b.done(); POT.name = 'teapot';
    }
    if (on && r && r.rig.attach.gripR) { r.rig.attach.gripR.add(POT); POT.position.set(0, -0.06, 0.06); POT.rotation.set(0, H, 0); }
    else if (POT.parent) POT.parent.remove(POT);
  }
  async function pour(c) {   // for someone else, for the first time; badly
    const r = actor(c, 'rue19');
    if (!r) return;
    r.play('pour');
    await c.wait(0.1);
    if (r.rig.attach.mug) r.rig.attach.mug.visible = false;
    teapot(c, true);
    for (let i = 0; i < 5 && !c.flow.skipping; i++) {
      c.world.puff([-14.66 + (i % 2) * 0.12, 1.3, 2.52 + (i % 3) * 0.05], { n: 7, color: 0x7a4a26, speed: 0.45, life: 0.6, gravity: 5 });
      await c.wait(0.5);
    }
  }
  function room213(c) {   // the cold, symmetrical room, a mess now
    const P = (n) => c.world.prop(n);
    for (const n of ['mess', 'mugs3', 'coats']) { const o = P(n); if (o) o.visible = true; }
    const co = P('coats'); if (co) co.position.set(0, 0, 0);
    const l = P('room_lamp'); if (l && l.userData.on) l.userData.on(true);
    const d = P('door'); if (d) d.userData.open = false;
    const ch = P('desk_chair'); if (ch) ch.rotation.y = H;
    const m3 = P('mugs3'); if (m3) m3.position.set(-14.62, 1.16, 2.55);   // (at his end of the desk, to pour into)
    const s = c.world.torch;   // the pendant's warm light over the mess
    if (s) { c.world.torchAuto = false; s.position.set(-15.6, 2.5, 3.1); s.target.position.set(-15.3, 0.4, 3.0); s.color.set(0xffd9a0); s.angle = 1.25; s.penumbra = 0.9; s.intensity = 5; }
    for (const id of ['luka', 'chase']) show(c, id, 'phone', false);
    tidyRue(c);
    stand(c, 'rue19');
    seat(c, 'luka', [-16.1, 0.4, 4.25, -2.3], 0.14, 'idle');
    seat(c, 'chase', [-17.62, 0.4, 2.9, H], 0.5, 'idle');
    for (const id of ['luka', 'chase']) { const a = actor(c, id); if (a) a.face('rue19', 0); }
  }

  CUTSCENES['2.13_steps'] = [
    { do: findSetup },
    // [WIDE] The torch beam sweeps the Campanile steps and stops.
    { shot: 'CAM', pos: [5.3, 2.2, 11.7], look: [0.7, 0.6, 4.3], fov: 44 },
    { do: (c) => beam(c, [3.9, 0.3, 3.3], [3.9, 0.3, 3.3], 0.1) },
    { wait: 0.6 },
    { do: (c) => beam(c, [3.9, 0.3, 3.3], [0.45, 0.75, 3.97], 2.2) },
    { face: 'chase', to: 'rue19', dur: 2.2 },
    { wait: 2.6 },
    snap('torch'),   // (the beam resting on him: the final-YES still)
    { wait: 0.2 },
    // [TOP-DOWN · directly above Rue] Soaked, head in his hands. The exact frame the game used for Chase in 1.2.
    { shot: 'TOP', on: 'rue19', dist: 1.5, offset: 0.25 },
    { wait: 2.2 },
    // [INSERT] The torches die. 0%. One lamp over the steps is all that's left.
    { do: (c) => holdUp(c, 'chase', 'phone') },
    { shot: 'INSERT', at: 'chase' },
    { wait: 0.5 },
    { do: torchesDie },
    { hud: { battery: 0, bars: 1 } },
    { sfx: 'sad_beep', vol: 0.6 },
    { shot: 'INSERT', at: 'chase', card: ['battery', { pct: 0, bars: 1 }] },
    { wait: 1.8 },
    { do: oneLamp },
    // (not looking up: head in hands, so from directly above again, under the one lamp)
    { shot: 'TOP', on: 'rue19', dist: 1.5, offset: 0.25 },
    { wait: 0.8 },
    say('rue19', 'Go away.'),
    // (the one lamp: Rue small and off-centre under it, the boys at the edge of its light; one frame until the gap closes)
    { shot: 'CAM', pos: [-4.7, 1.8, 10.9], look: [-1.1, 1.2, 4.9], fov: 42 },
    say('chase', 'No.'),
    // (seeing the dead phones)
    { act: [['rue19', 'idle']] }, { expr: [['rue19', 'sad']] },
    { wait: 0.8 },
    { do: (c) => actor(c, 'rue19').eyePos(EYE) },   // (his eye line with his head up: where the crane lands later)
    say('rue19', 'Was that your… You said that was your way home.'),
    say('luka', 'Yeah.'),
    say('rue19', 'Why would you do that?'),
    slow('luka', 'Because you were on your own.'),
    slow('rue19', "I'm always on my own."),
    // [THREE-SHOT · eye level, locked] Chase sits down beside Rue, close. No gap, no phone between them. It's the first time
    // Rue has shared a frame like this. The bars start to rise.
    THREE_SHOT,
    { do: sitThree },
    { hud: { bars: 2 }, anim: 1.2 },
    slow('chase', 'Not tonight.'),
    // Silence. Rain.
    { wait: 2.6 },
    { music: 'emotional', fade: 4 },
    slow('rue19', "Everyone leaves. So I thought, fine. I'll leave first. I'll be too important to miss anyone. ^ And now I'm not going anywhere."),
    slow('luka', "You're nineteen, mate. You've got time."),
    say('rue19', "Yous don't know that."),
    say('chase', 'We kind of do.'),
    say('rue19', 'Is that a future thing?'),
    say('chase', "It's a future thing."),
    say('rue19', 'How does it go?'),
    say('luka', "Can't tell you."),
    say('chase', 'It goes well.'),
    say('luka', 'CHASE.'),
    say('chase', "What? It does! He's on mugs!"),
    // Rue laughs. It surprises him, and turns into something else. Chase puts a hand on his back.
    { act: [['rue19', 'laugh']] },
    { wait: 1.6 },
    { act: [['rue19', 'cry']] },
    { wait: 1.2 },
    { act: [['chase', 'back_hand']] },
    { wait: 1.4 },
    slow('chase', 'Head up.'),
    // [TOP-DOWN on Rue's bowed head, then CRANE down and round to eye level] He lifts his head, and the camera comes up with it.
    { shot: 'TOP', on: 'rue19', dist: 1.5, offset: 0.25 },
    { wait: 1.4 },
    { do: craneUp },
    { hud: { bars: 3 }, anim: 1.5 },
    { wait: 3.4 },
    slow('rue19', "Why do yous care? I've been awful to you."),
    slow('luka', "Nobody's nobody."),
    // [INSERT] The brick phone in Rue's hands.
    { act: [['chase', 'idle']] },
    { do: (c) => holdUp(c, 'rue19', 'brick') },
    { shot: 'INSERT', at: 'rue19', dist: 1.0 },
    { wait: 0.8 },
    slow('rue19', 'Your call. In thirty-nine years.'),
    say('chase', "Rue, you don't have to—"),
    slow('rue19', "Nobody's ever going to ring this thing anyway."),
    slow('chase', 'We will.'),
    // [CLOSE · Rue, locked] He looks at them. A beat.
    { shot: 'CLOSE', on: 'rue19', locked: true },
    { wait: 1.2 },
    { expr: [['rue19', 'sad']] },
    slow('rue19', '…Yes.'),
    // The bars reach 4.
    { hud: { bars: 4 }, anim: 0.8 },
    { wait: 0.8 },
    say('chase', 'You said yes.'),
    { expr: [['rue19', 'smug']] },
    say('rue19', "Don't make it a thing."),
    say('luka', "It's a thing."),
    // [CRANE · slowly up and away] Three figures on the steps under the bell. The rain thins.
    { act: [['rue19', 'idle']] },
    { do: (c) => show(c, 'rue19', 'brick', true) },
    { shot: 'CAM', pos: [0.45, 1.25, 7.2], look: [0.45, 1.0, 4.0], fov: 45, to: { pos: [0.9, 12.5, 17.5], look: [0.3, 3.2, 1.6], fov: 45 }, dur: 8 },
    { env: { rain: 0.25, fog: [0x07080b, 0.035] }, dur: 7 },
    { wait: 6.4 },
    { fade: 'out', dur: 1.6 },   // (still rising as it fades)
    { do: (c) => { const s = c.world.torch; if (s) { s.intensity = 0; c.world.torchAuto = true; s.angle = 0.33; s.penumbra = 0.5; s.color.set(0xffffff); } } },
    { set: 'rooms', env: 'night', spawn: { rue19: [-15.05, 0.4, 2.55, H], luka: [-16.1, 0.4, 4.25, -2.3], chase: [-17.62, 0.4, 2.9, H] } },
    { do: room213 },
    // [CLOSE · three mismatched mugs on Rue's desk] Rue pours tea for someone else for the first time. He's bad at it.
    { shot: 'CAM', pos: [-13.95, 1.52, 2.05], look: [-14.62, 1.24, 2.6], fov: 40 },
    { fade: 'in', dur: 0.8 },
    { do: pour },
    { wait: 0.8 },
    // [WIDE · from the doorway, the frame from 2.8] The cold, symmetrical room is a mess now: coats on the floor, three mugs,
    // three people. Nobody mentions the tea.
    { do: (c) => { teapot(c, false); const r = actor(c, 'rue19'); if (r) r.play('idle'); } },
    { shot: 'INSERT', at: 'doorway_wide' },
    { wait: 4 },
    // Title card: END OF ACT TWO
    { fade: 'out', dur: 1.2 },
    { music: null, fade: 2 },
    { title: 'END OF ACT TWO', dur: 3.5 },
    { do: (c) => {
      tidyRue(c); for (const id of ['luka', 'chase']) show(c, id, 'phone', false);
      const m3 = c.world.prop('mugs3'); if (m3) m3.position.set(-14.3, 1.16, 2.5);
      const s = c.world.torch; if (s) { s.intensity = 0; s.angle = 0.33; s.penumbra = 0.5; s.color.set(0xffffff); } c.world.torchAuto = true;
    } },
  ];
})();
