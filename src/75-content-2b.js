// ============================================================ CONTENT: 2.4 "The Answer's No", 2.5 "What's a JARVIS?", 2.6 "Second-in-Cycling"
// SPEC §10. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
// Mini-games: keep_up + rue_walk (68-mg-keepup-ruewalk.js), wiring {layout:'charger'}, pedal.
(() => {
  const PI = Math.PI, H = PI / 2;
  const has = (id) => state.inventory.includes(id);
  const snap = (name) => ({ do: () => { if (MINIGAMES.final_yes && MINIGAMES.final_yes.snap) MINIGAMES.final_yes.snap(name); } });
  const say = (id, text, o) => Object.assign({ say: id, text }, o);

  // ---------------------------------------------------------- cards and items
  // The Bug List as written in 1.6, on the back of this week's targets (the skull shows through).
  const LIST = { title: 'JARVIS — bugs', items: [], skull: true };   // the same sheet as 1.6's card
  const fillList = () => {
    const ids = state.bugs || [];
    LIST.items = ids.map((id) => (BUGS.find((b) => b.id === id) || {}).text).filter(Boolean).concat(DOOR_BUG);
  };
  // The bottom edge of an iPhone: speaker grilles either side of a USB-C port.
  CARDS.usbc = (cx, w, h) => {
    cx.translate(w / 2, h / 2);
    cx.shadowColor = 'rgba(0,0,0,.45)'; cx.shadowBlur = 30; cx.shadowOffsetY = 12;
    cx.fillStyle = '#2b2d33'; cx.beginPath(); cx.roundRect(-w * 0.44, -h * 0.2, w * 0.88, h * 0.4, h * 0.2); cx.fill();
    cx.shadowColor = 'transparent';
    const g = cx.createLinearGradient(0, -h * 0.2, 0, h * 0.2); g.addColorStop(0, '#8d9098'); g.addColorStop(0.5, '#3a3c42'); g.addColorStop(1, '#6d7078');
    cx.fillStyle = g; cx.beginPath(); cx.roundRect(-w * 0.43, -h * 0.17, w * 0.86, h * 0.34, h * 0.17); cx.fill();
    cx.fillStyle = '#0c0d10'; cx.beginPath(); cx.roundRect(-w * 0.075, -h * 0.045, w * 0.15, h * 0.09, h * 0.045); cx.fill();   // the port
    cx.fillStyle = '#5a5d64'; cx.fillRect(-w * 0.05, -h * 0.008, w * 0.1, h * 0.016);
    for (const s of [-1, 1]) for (let i = 0; i < 6; i++) { cx.beginPath(); cx.arc(s * (w * 0.14 + i * w * 0.028), 0, h * 0.012, 0, 7); cx.fillStyle = '#121317'; cx.fill(); }
    cx.fillStyle = '#ffd21f'; cx.font = `bold ${h * 0.06}px "Trebuchet MS", sans-serif`; cx.textAlign = 'center'; cx.fillText('USB-C', 0, h * 0.3);
  };
  CARDS.usbc.size = [800, 500];
  // The enamel sign on the lab door: one line per sentence.
  CARDS.lab_sign = (cx, w, h, d) => {
    const L = String(d.text || '').split(/(?<=\.)\s+/);
    cx.translate(w / 2, h / 2); cx.rotate(0.01);
    cx.shadowColor = 'rgba(0,0,0,.4)'; cx.shadowBlur = 24; cx.shadowOffsetY = 10;
    cx.fillStyle = '#f2f0e8'; cx.fillRect(-w * 0.44, -h * 0.4, w * 0.88, h * 0.8); cx.shadowColor = 'transparent';
    cx.strokeStyle = '#1a2a5a'; cx.lineWidth = 10; cx.strokeRect(-w * 0.41, -h * 0.35, w * 0.82, h * 0.7);
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    L.forEach((t, i) => { cx.fillStyle = i === L.length - 1 ? '#b02020' : '#1a2a5a'; cx.font = `bold ${i === 1 ? 44 : 64}px "Trebuchet MS", sans-serif`; cx.fillText(t, 0, (i - (L.length - 1) / 2) * h * 0.22, w * 0.76); });
  };
  CARDS.lab_sign.size = [800, 460];
  // The brass key from the lost property drawer, on a paper tag: "1979".
  CARDS.keytag = (cx, w, h, d) => {
    cx.translate(w / 2, h / 2); cx.rotate(-0.12);
    cx.shadowColor = 'rgba(0,0,0,.45)'; cx.shadowBlur = 24; cx.shadowOffsetY = 10;
    cx.strokeStyle = '#8a8070'; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(-w * 0.02, -h * 0.02); cx.lineTo(-w * 0.14, -h * 0.02); cx.stroke();   // the string
    cx.fillStyle = '#c9a23a'; cx.beginPath(); cx.arc(-w * 0.2, 0, h * 0.14, 0, 7); cx.fill();
    cx.fillRect(-w * 0.2, -h * 0.035, w * 0.36, h * 0.07); cx.fillRect(w * 0.08, h * 0.03, w * 0.03, h * 0.08); cx.fillRect(w * 0.12, h * 0.03, w * 0.025, h * 0.05);
    cx.shadowColor = 'transparent'; cx.fillStyle = '#6a5010'; cx.beginPath(); cx.arc(-w * 0.2, 0, h * 0.05, 0, 7); cx.fill();
    cx.translate(-w * 0.02, 0); cx.rotate(0.3);   // the tag
    cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 18; cx.fillStyle = '#efe4c4';
    cx.beginPath(); cx.moveTo(0, -h * 0.12); cx.lineTo(w * 0.3, -h * 0.12); cx.lineTo(w * 0.3, h * 0.12); cx.lineTo(0, h * 0.12); cx.lineTo(-w * 0.05, 0); cx.closePath(); cx.fill();
    cx.shadowColor = 'transparent'; cx.fillStyle = '#b8a880'; cx.beginPath(); cx.arc(0, 0, h * 0.02, 0, 7); cx.fill();
    cx.fillStyle = '#1d2f8f'; cx.font = `${h * 0.14}px "Comic Sans MS", "Marker Felt", cursive`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(d.text || '1979', w * 0.165, h * 0.01);
  };
  CARDS.keytag.size = [800, 500];

  // item icons: tiny flat drawings
  const icon = (fn) => (c, w, h) => { c.save(); c.translate(w / 2, h / 2); c.scale(w / 100, h / 100); fn(c); c.restore(); };
  const card = (kind, data) => async (c) => {   // examine: a readable card until YES
    if (typeof data === 'function') data = data();
    c.ui.card(kind, data); await c.wait(0.15);
    const t = clock.t;
    await waitUntil(() => { if (TEST.auto) return clock.t - t > 0.5; if (!input.pressed('yes')) return false; input.consume('yes'); return true; });
    c.ui.card(null);
  };
  Object.assign(ITEMS, {
    recorder: {
      name: 'Cassette recorder', desc: 'Declan\'s cassette recorder.',
      icon: icon((c) => { c.fillStyle = '#1e1e1e'; c.fillRect(-40, -22, 80, 44); c.fillStyle = '#a0a0a0'; c.fillRect(-30, -14, 36, 22); c.fillStyle = '#c02020'; c.fillRect(14, -14, 8, 8); c.fillStyle = '#ccc'; for (let i = 0; i < 3; i++) c.fillRect(24 + i * 0, -4 + i * 8, 10, 4); }),
      examine: card('list', () => ({ title: 'SAMPLES', items: state.samples.length ? state.samples.map((k) => (SAMPLES[k] || {}).label || k) : ['—'], paper: 'notebook' })),
    },
    transformer: {
      name: 'Transformer', desc: 'From a train set.',
      icon: icon((c) => { c.fillStyle = '#5a1a14'; c.fillRect(-34, -20, 68, 44); c.fillStyle = '#111'; c.beginPath(); c.arc(-6, -20, 14, PI, 0); c.fill(); c.fillStyle = '#e8e0c8'; c.fillRect(-26, 6, 52, 8); }),
    },
    key_1979: {
      name: 'Key (1979)', desc: 'A small key on a tag.',
      icon: icon((c) => { c.strokeStyle = '#c9a23a'; c.lineWidth = 8; c.beginPath(); c.arc(-20, 0, 14, 0, 7); c.stroke(); c.fillStyle = '#c9a23a'; c.fillRect(-6, -4, 44, 8); c.fillRect(26, 4, 6, 12); c.fillRect(34, 4, 6, 8); }),
      examine: card('keytag', { text: '1979' }),
    },
    cable: {
      name: 'USB-C cable (stripped)', desc: 'Chase\'s only cable.',
      icon: icon((c) => { c.strokeStyle = '#f2f2f2'; c.lineWidth = 8; c.beginPath(); c.moveTo(-38, 20); c.bezierCurveTo(-10, 40, 0, -40, 26, -12); c.stroke(); c.strokeStyle = '#d98a3a'; c.lineWidth = 3; c.beginPath(); c.moveTo(26, -12); c.lineTo(38, -20); c.moveTo(26, -12); c.lineTo(40, -8); c.stroke(); c.fillStyle = '#ccc'; c.fillRect(-46, 14, 12, 12); }),
      examine: card('usbc', {}),
    },
  });

  // ---------------------------------------------------------- helpers (from `do` steps, never per frame)
  const actor = (c, id) => c.world.actor(id);
  function sitDown(c, id, h) { const a = actor(c, id); if (a) a.play('sit', h ? { h } : {}); }
  function unsit(c, ...ids) { for (const id of ids) { const a = actor(c, id); if (a) { a.rig.seated = false; a.play('idle'); } } }
  function glanceAt(c, id, at, dur = 1.3) {   // turn the head toward someone without moving the feet
    const a = actor(c, id), b = actor(c, at);
    if (!a || !b) return;
    let d = Math.atan2(b.pos.x - a.pos.x, b.pos.z - a.pos.z) - a.rotY; d = Math.atan2(Math.sin(d), Math.cos(d));
    a.play('glance', { yaw: Math.max(-1.4, Math.min(1.4, d)), dur });
  }
  // the lodge (square): Des in his chair, the bike gone once it went to science
  function squareDress(c) {
    if (c.world.setId !== 'square') return;
    const f = state.flags;
    const d = c.world.spawn('des', 'lodge_des_chair'); d.play('sit', { h: 0.46 });
    for (const n of ['bike', 'bike_chain']) { const o = c.world.prop(n); if (o) o.visible = !f.part_bike; }
  }
  const RIG = { built: false };   // this run of 2.6 has reached the bike rig
  // the lab: Declan at his bench, taken things gone, the rig once it's built, Luka on it between sessions
  function labDress(c) {
    if (c.world.setId !== 'lab') return;
    const f = state.flags, P = (n) => c.world.prop(n);
    const t = P('transformer'); if (t) t.visible = !f.part_transformer;
    const r = P('recorder'); if (r) r.visible = !has('recorder');
    const b = P('bike_rig'); if (b) b.visible = RIG.built;   // (not from charger_done: a Continue replays the scene from its start)
    const dr = P('lab_door'); if (dr && f.knocked) dr.userData.open = true;
    c.world.spawn('declan', 'declan_bench').play('sit', { h: 0.48 });
    if (f.resting) { const l = c.world.spawn('luka', 'bike_rig'); l.play('pedal', { speed: 0.35 }); }
  }
  const REC = (on) => ({ do: (c) => { const a = actor(c, 'chase'); if (a && a.rig.attach.recorder) a.rig.attach.recorder.visible = on; } });   // Chase's hands
  const PHONES = (on) => ({ do: (c) => { const a = actor(c, 'chase'); if (a && a.rig.attach.headphones) a.rig.attach.headphones.visible = on; } });
  function butteryDress(c) { if (c.world.setId === 'buttery') c.world.spawn('bernie', 'counter_bernie'); }

  // =================================================================== 2.4 — "The Answer's No"
  const KEEP = [
    ['chase', 'Rue! Mr Rue! Rue.'],
    ['rue19', 'Lads. Love the shirts. What\'s "Yes"? Is it a cult?'],
    ['luka', "It's a company."],
    ['rue19', 'Never heard of it.'],
    ['chase', 'You will.'],
    ['rue19', 'Doubt it.'],
    ['luka', 'We need five minutes.'],
    ['rue19', "Everyone needs five minutes. That's why mine are expensive."],
  ];
  SCENES['2.4'] = {
    title: "The Answer's No", set: 'square', env: 'rain', time: 'Tue 6 Oct 1987, 15:00',
    playable: ['chase', 'rue19'], swap: false, hud: { battery: 1, bars: 0 }, music: 'dublin',
    spawn: { rue19: [0, 0, -14.1, 0], chase: [1.9, 0, -12.9, -2.3], luka: [2.8, 0, -13.5, -2.3], st_1: { at: [0, 0, -40, 0], look: 'student_e' } },
    steps: [
      ['do', (c) => { actor(c, 'st_1').visible = false; }],
      ['control', 'chase'],
      ['objective', 'Catch Rue.'],
      // [TRACK · backwards, ahead of Rue] then the walk-and-talk (Keep Up)
      ['minigame', 'keep_up', { lines: KEEP }],
      ['objective', null],
      ['cutscene', '2.4_no'],
      ['control', 'rue19'],
      ['minigame', 'rue_walk', { walk: 1 }],
      ['steps', [{ sfx: 'creak' }, { fade: 'out', dur: 0.8 }, { prop: 'umbrella_crowd', visible: true }]],   // into the Buttery
    ],
    grants: { flags: { met_rue: true }, battery: 1, bars: 0 },
  };

  CUTSCENES['2.4_no'] = [
    { prop: 'umbrella_crowd', visible: false },   // the square empties: one student will walk between them (back at the scene's end)
    { place: 'rue19', at: [-11.4, 0, 0.85, -H] }, { place: 'chase', at: [-13.9, 0, 0.3, H] }, { place: 'luka', at: [-13.9, 0, 1.45, H] },
    { act: [['chase', 'idle'], ['luka', 'idle'], ['rue19', 'idle']] },
    // [CLOSE · Chase, breathless]
    { shot: 'CLOSE', on: 'chase' },
    { expr: [['chase', 'worried']] },
    say('chase', "We're from the future. 2026. You're the CEO of a phone company. You built a computer system called JARVIS, it's broken, and we've come back to warn you."),
    // [WIDE · locked, side-on] A stare, 3 seconds. Rue on one side, the boys on the other. A student walks between them.
    { shot: 'CAM', pos: [-12.65, 1.45, -7.4], look: [-12.65, 1.1, 0.85], fov: 42 },
    { expr: [['chase', 'stunned'], ['luka', 'stunned'], ['rue19', 'neutral']] },
    { place: 'st_1', at: [-12.62, 0, 3.4, PI] }, { do: (c) => { const s = actor(c, 'st_1'); s.visible = true; s.play('umbrella'); } },
    { move: 'st_1', to: [-12.7, 0, -4.2], nowait: true, speed: 1.35 },
    { stare: 3 },
    { do: (c) => c.world.despawn('st_1') },
    // [CLOSE · Rue]
    { shot: 'CLOSE', on: 'rue19' },
    { expr: [['chase', 'neutral'], ['luka', 'neutral'], ['rue19', 'smug']] },
    say('rue19', "The answer's no."),
    say('luka', "We didn't ask you anything."),
    say('rue19', "Whatever it is. The answer's no."),
    // [MID · Rue walking away, the Campanile behind him] He half-turns.
    { face: 'rue19', to: [0, 0] },
    { shot: 'CAM', pos: [-13.0, 1.5, 0.95], look: [-6.5, 1.8, 0.5], fov: 40 },
    { wait: 0.3 },
    { move: 'rue19', to: [-9.0, 0, 0.9] },
    { par: [say('rue19', 'See you, Australia. And Other Australia.'),
      { do: async (c) => { glanceAt(c, 'rue19', 'chase', 1.2); await c.wait(0.5); if (!c.flow.skipping) glanceAt(c, 'rue19', 'luka', 2.4); } }] },   // (to Luka)
    // [TWO-SHOT · the boys, left standing in the rain]
    { shot: 'CAM', pos: [-11.5, 1.6, 0.85], look: [-13.9, 1.3, 0.87], fov: 42 },   // from where Rue stood, looking back at them
    { expr: [['luka', 'stunned']] },
    say('luka', '…Other Australia.'),
    { expr: [['luka', 'neutral']] },
    { flag: 'met_rue' },
  ];

  // =================================================================== 2.5 — "What's a JARVIS?"
  SCENES['2.5'] = {
    title: "What's a JARVIS?", set: 'buttery', env: 'day', time: 'Wed 7 Oct 1987',
    playable: ['luka'], swap: false, hud: { battery: 1, bars: 0 }, music: 'buttery_radio',
    spawn: { luka: 'stairs_top', chase: [-7.9, 1.3, 0.3, H], rue19: 'rue_seat', bernie: 'counter_bernie' },
    hotspots: [
      { id: 'rue', at: 'rue19', r: 1.9, verb: 'Talk', by: 'rue19', text: "The answer's no.", flag: 'showed_list',
        use: { bug_list: (c) => c.playCutscene('2.5_list') } },
      { id: 'urn', at: 'urn', r: 1.2, verb: 'Use', text: 'Close enough.', kettle: true },
      // the lodge
      { id: 'cupboard', at: 'cupboard', r: 1.3, verb: 'Open', once: true, flag: 'cupboard_open', when: (s) => !!s.flags.showed_list, do: () => {} },
      { id: 'kettle', at: 'kettle', r: 1.1, verb: 'Use', kettle: true },
    ],
    steps: [
      ['do', (c) => {
        if (!c.inventory.has('bug_list')) c.inventory.add('bug_list');
        sitDown(c, 'rue19', 0.46);
        actor(c, 'luka').habit = 'glance';   // in 1987 he counts heads before he speaks
      }],
      ['control', 'luka'], ['follow', 'chase'],
      ['objective', 'Show Rue the bug list.'],
      ['roam', {
        until: 'showed_list',
        hint: { after: 45, steps: [{ do: (c) => c.ui.toast(input.scheme === 'pad' ? 'X — Bag · Use the Bug List on Rue' : input.scheme === 'touch' ? 'BAG — Use the Bug List on Rue' : 'I — Bag · Use the Bug List on Rue') }] },
        async auto(c) { await c.hotspots.trigger('urn'); c.inventory.selected = 'bug_list'; await c.hotspots.trigger('rue'); },
      }],
      ['objective', 'Check on the machine.'],
      ['set', 'square', { env: 'rain', spawn: { luka: [-21.3, 0.46, 3.4, 0], chase: [-21.1, 0.46, 2.75, 0] } }],
      ['do', (c) => { squareDress(c); unsit(c, 'luka', 'chase'); actor(c, 'luka').habit = 'glance'; c.music('dublin', { fade: 2 }); }],
      ['roam', { until: 'cupboard_open', async auto(c) { await c.hotspots.trigger('kettle'); await c.hotspots.trigger('cupboard'); } }],
      ['cutscene', '2.5_stuck'],
    ],
    grants: { flags: { showed_list: true, cupboard_open: true, no_usbc: true }, items: ['bug_list'], battery: 1, bars: 0 },
  };

  // [TWO-SHOT · locked] the boys side by side across the table facing camera, Rue's profile at the edge of frame (used twice)
  const TWOSHOT = { shot: 'CAM', pos: [7.8, 1.42, -4.38], look: [6.35, 1.08, -2.8], fov: 50 };
  CUTSCENES['2.5_list'] = [
    // [WIDE · the Buttery] Everyone crammed at shared tables; Rue alone at a table for four in the far corner, FT and Filofax.
    // (The boys wait under the lens at the top of the stairs; they sit down with him under the INSERT.)
    { place: 'luka', at: [-7.9, 1.3, -0.4, H] }, { place: 'chase', at: [-7.9, 1.3, 0.35, H] }, { act: [['luka', 'idle'], ['chase', 'idle']] },
    { shot: 'CAM', pos: [-7.7, 3.1, 1.1], look: [4.8, 0.8, -2.8], fov: 48 },
    { wait: 2 },
    // [INSERT · top-down] The Bug List slaps down on the Filofax.
    { do: fillList },
    { shot: 'INSERT', at: 'rue_filofax', angle: 'top', card: ['list', LIST] },
    { place: 'luka', at: 'rue_table_a' }, { place: 'chase', at: 'rue_table_b' },
    { act: [['luka', 'sit', { h: 0.46 }], ['chase', 'sit', { h: 0.46 }]] },
    { sfx: 'thud', vol: 0.7 },
    say('luka', "Five minutes. We'll pay for them."),
    say('rue19', 'With what, the plastic money?'),
    say('chase', 'How do you know about the plastic money?'),
    say('rue19', 'Bernie tells everyone everything.'),
    { do: (c) => { const a = actor(c, 'rue19'); a.play('reading'); c.wait(0.05).then(() => { if (a.rig.attach.textbook) a.rig.attach.textbook.visible = false; }); } },   // (He picks up the list and reads.)
    say('rue19', '"Pop-ups before every action." "Asks if you\'re sure you\'re sure." "Turns the name Margaret into margarine."'),
    // [CLOSE · Rue, perfectly sincere]
    { act: [['rue19', 'sit']] },
    { shot: 'CLOSE', on: 'rue19' },
    { expr: [['rue19', 'neutral']] },
    say('rue19', "Lads. What's a JARVIS?"),
    say('chase', 'Your computer system. That you made. In 1987. This year.'),
    say('rue19', "I don't make things. I'm doing Business. I'm going to have people who make things."),
    // [PUSH IN · slow, on Luka as he turns]
    { shot: 'CLOSE', on: 'luka', move: 'push', amount: 0.75, dur: 7 },
    { do: (c) => glanceAt(c, 'luka', 'chase', 7) },
    say('luka', 'Chase.'),
    say('chase', 'Luka.'),
    say('luka', 'Why did we think Rue made JARVIS?'),
    say('chase', '…His face is on the login screen.'),
    // [WIDE]
    { shot: 'WIDE', on: ['luka', 'chase', 'rue19'] },
    say('luka', "Because he's the CEO, Chase. The CEO's face is on everything. It's on the MUGS."),
    // [CLOSE · Rue, delighted]
    { shot: 'CLOSE', on: 'rue19' },
    { expr: [['rue19', 'laugh']] },
    say('rue19', "I'm on mugs?"),
    { expr: [['rue19', 'smug']] },
    say('chase', '…Oh no.'),
    say('luka', 'So who made JARVIS?'),
    say('chase', '…'),
    // [TWO-SHOT · locked, the boys side by side across the table, facing camera] A stare, 2 seconds. Rue eats a chip.
    TWOSHOT,
    { expr: [['luka', 'stunned'], ['chase', 'stunned']] },
    { do: (c) => { glanceAt(c, 'luka', 'chase', 2.8); glanceAt(c, 'chase', 'luka', 2.8); } },   // they stare at each other
    { par: [{ stare: 2 }, { do: async (c) => { glanceAt(c, 'rue19', 'luka', 0.7); await c.wait(0.75); glanceAt(c, 'rue19', 'chase', 0.7); await c.wait(0.7); actor(c, 'rue19').play('chew', { dur: 1 }); } }] },
    // [WIDE · exterior] The Buttery from outside, in the rain. A bus goes past. One second.
    { shot: 'INSERT', at: 'exterior' },
    { do: (c) => { glanceAt(c, 'luka', 'chase', 4.4); glanceAt(c, 'chase', 'luka', 4.4); } },   // (off screen: still staring when we cut back)
    { wait: 0.4 },
    { sfx: 'bus' },
    { prop: 'bus', fn: (o) => o.userData.go() },   // it wipes across the lens a third of a second later
    { wait: 0.9 },
    // [TWO-SHOT · the same frame as before] One second. They haven't moved. Rue now has a fresh cup of tea.
    { prop: 'fresh_tea', visible: true },
    TWOSHOT,
    { wait: 1 },
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    say('luka', "…it's not genius."),
    // [MID] Rue stands and tucks the list into Chase's pocket. (One angle over the boys' shoulders, Rue between them; it pans
    // with him round the end of the table to Chase.)
    { shot: 'CAM', pos: [6.55, 1.75, -0.35], look: [6.3, 1.15, -3.6], fov: 50, to: { pos: [6.55, 1.75, -0.35], look: [6.75, 1.25, -3.2], fov: 50 }, dur: 3.4 },
    { act: [['rue19', 'stand']] },
    { wait: 0.9 },
    { move: 'rue19', to: [7.45, 0, -3.55] },
    { move: 'rue19', to: [7.35, 0, -2.3] },
    { face: 'rue19', to: 'chase' },
    { act: [['rue19', 'give']] },
    { wait: 0.7 },
    say('rue19', 'Well. Best of luck with your JARVIS.'),
    { move: 'rue19', to: [7.5, 0, -0.6], nowait: true },
  ];

  CUTSCENES['2.5_stuck'] = [
    { place: 'chase', at: [-23.0, 0.46, 4.1, -2.3] },
    { move: 'luka', to: [-23.9, 0.46, 3.35] }, { face: 'luka', to: 'cupboard' },
    // [CLOSE · the cupboard door opening] Light falls on the machine. (Luka at its side, so the lens sees in.)
    { shot: 'CAM', pos: [-25.5, 1.6, 4.7], look: [-24.6, 1.25, 2.65], fov: 40 },
    { sfx: 'creak' },
    { do: (c) => {   // the door swings, and the lodge lamp's light falls in on the machine
      const d = c.world.prop('cupboard_door'), s = c.world.torch;
      if (s) { c.world.torchAuto = false; s.position.set(-23.6, 2.6, 3.9); s.target.position.set(-24.75, 1.25, 2.7); s.color.set(0xffe0b0); s.angle = 0.45; s.intensity = 6; }
      if (!d) return;
      let t = 0; const f = (dt) => { t = Math.min(1, t + dt / 0.9); d.rotation.y = 1.9 * (1 - (1 - t) * (1 - t)); if (t >= 1) removeUpdate(f); };
      if (c.flow.skipping) d.rotation.y = 1.9; else addUpdate(f);
    } },
    { wait: 1.5 },
    // [INSERT] BATTERY 1%.
    { prop: 'machine_wrap', visible: false },
    { shot: 'CAM', pos: [-25.2, 1.55, 4.1], look: [-24.7, 1.25, 2.7], fov: 34, card: ['battery', { pct: 1, bars: 0 }] },
    { wait: 2 },
    // [ECU] Chase turns the iPhone over: a USB-C port.
    { do: (c) => { const s = c.world.torch; if (s) { s.intensity = 0; c.world.torchAuto = true; } } },
    { act: [['chase', 'phone']] },
    { shot: 'INSERT', at: 'chase', card: ['usbc', {}] },
    { wait: 2.2 },
    // [POV · slow pan around the lodge] A desk phone, a kettle cord, a typewriter, a transistor radio.
    { act: [['chase', 'idle']] },
    { face: 'chase', to: [-22.9, 5.6] },
    { wait: 0.35 },
    { shot: 'POV', from: 'chase', at: 'desk_phone', move: 'pan', to: 'radio', dur: 6 },
    { wait: 3.5 },   // the pan keeps moving under the line
    say('chase', 'Luka. I need a USB-C port.'),
    say('luka', "It's 1987."),
    { flag: 'no_usbc' },
    // [WIDE · outside the lodge window, in the rain] Chase's shout, muffled through the glass.
    { place: 'chase', at: [-21.55, 0.46, 5.95, H] }, { place: 'luka', at: [-22.5, 0.46, 5.4, H] },
    { shot: 'CAM', pos: [-15.6, 1.9, 7.4], look: [-21.2, 1.5, 5.9], fov: 42 },
    { act: [['chase', 'hands_head', { dur: 2.5 }]] },
    say('chase', 'I NEED A USB-C PORT.', { tag: 'muffled' }),
    // [CLOSE · Luka]
    { shot: 'CLOSE', on: 'luka' },
    { expr: [['luka', 'worried']] },
    say('luka', "…We're stuck."),
    // [CLOSE · Chase]
    { shot: 'CLOSE', on: 'chase' },
    { expr: [['chase', 'sad']] },
    say('chase', "We're stuck."),
    // [WIDE · locked, long lens from across Front Square] The two of them tiny on the lodge step under the huge arch.
    // Chase head in hands, Luka beside him twisting his lanyard; in the lit window Des puts the kettle on. Hold 3 s, fade.
    // (The lens looks in past the Campanile's north side so the lit window shows too; the crowd is cleared for the hold.)
    { music: null, fade: 1.5 },
    { place: 'luka', at: 'lodge_step_luka' }, { place: 'chase', at: 'lodge_step_chase' },
    { act: [['luka', 'sit', { h: 0.23 }], ['chase', 'sit', { h: 0.23 }]] },
    { place: 'des', at: [-22.2, 0.46, 5.7, -1.4] },
    { do: (c) => { unsit(c, 'des'); actor(c, 'des').play('pour'); } },
    { prop: 'umbrella_crowd', visible: false },
    { shot: 'CAM', pos: [18, 1.7, 12.5], look: [-21.1, 1.4, 2.6], fov: 12 },
    { wait: 0.15 },
    { act: [['luka', 'lanyard'], ['chase', 'head_hands']] },
    { wait: 0.75 },
    { do: (c) => glanceAt(c, 'luka', 'chase', 1.3) },
    { wait: 0.5 },
    snap('glance_step'),
    { wait: 1.6 },
    { fade: 'out', dur: 1.2 },
    { prop: 'umbrella_crowd', visible: true },
  ];

  // =================================================================== 2.6 — "Second-in-Cycling"
  const SIDE = { shot: 'CAM', pos: [3.05, 1.45, 10.2], look: [3.05, 1.15, 14.2], fov: 50 };   // WIDE · locked, side-on: the bike (3.1 reuses it)
  const inLab = () => world.setId === 'lab', inSquare = () => world.setId === 'square', inButtery = () => world.setId === 'buttery';
  function missing(c) {   // after two minutes Chase lists what's missing
    const f = state.flags, m = [];
    if (!f.part_transformer) m.push('Transformer');
    if (!f.part_bike) m.push('Bicycle');
    if (!f.part_cable) m.push('Cable');
    if (!m.length) m.push('Wiring');
    return c.say('chase', 'Still need: ' + m.join('. ') + '.');
  }
  // Luka wheels the bike from the lodge railings; on the cobbles in the rain it wobbles.
  const BIKE = { t: 0, f: null };
  function wheel(c, on) {
    const b = c.world.prop('bike'), l = actor(c, 'luka');
    if (BIKE.f) { removeUpdate(BIKE.f); BIKE.f = null; }
    if (!on || !b || !l || c.flow.skipping) { if (l) l.walkAnim = 'walk'; return; }
    l.walkAnim = 'carry'; BIKE.t = 0;
    BIKE.f = (dt) => {
      BIKE.t += dt;
      const fx = Math.sin(l.rotY), fz = Math.cos(l.rotY);
      b.position.set(l.pos.x - fz * 0.5 + fx * 0.35, 0, l.pos.z + fx * 0.5 + fz * 0.35);
      b.rotation.set(0, l.rotY, 0.1 * Math.sin(BIKE.t * 5.3) + 0.06 * Math.sin(BIKE.t * 11.7));
    };
    addUpdate(BIKE.f);
  }
  // pedal power: one session, retried with the green band widened by 10 until it's done
  const pedal = (n) => async (c) => {
    const l = actor(c, 'luka');
    c.player.enabled = false;
    l.place('bike_rig'); l.play('pedal', { speed: 0.3 });
    c.cam.shot(SIDE);
    let band = [55, 80];
    for (;;) {
      const r = await c.flow.minigame('pedal', { session: n, band, rider: 'luka' });
      if (!r || !r.failed) break;
      band = [band[0] - 5, band[1] + 5];
    }
    l.play('pedal', { speed: 0.35 });
    if (n < 3) await c.runSteps([{ timelapse: { dur: 3, cycles: 1, from: 'day', to: 'night' } }]);   // one session a day: night falls, the next day comes
  };
  // between sessions: a short free roam as Chase (Luka stays on the bike)
  const rest = [
    ['do', (c) => { state.flags.resting = true; state.flags.next_session = false; c.flow.follow = null; c.player.follower(null); }],
    ['swap', false], ['control', 'chase'],
    ['objective', 'Record some samples.'],
    ['roam', { until: 'next_session', async auto(c) { await c.runSteps([{ sample: 'beep' }, { sample: 'dynamo' }]); await c.hotspots.trigger('bike_next'); } }],
    ['do', () => { state.flags.resting = false; }],
    ['objective', null],
  ];
  const SONG = { h: null };

  SCENES['2.6'] = {
    title: 'Second-in-Cycling', set: 'square', env: 'rain', time: 'Thu 8 Oct 1987',
    playable: ['luka', 'chase'], swap: true, hud: { battery: 1, bars: 2 }, music: 'dublin',
    spawn: { luka: 'lodge_luka', chase: 'lodge_chase', des: 'lodge_des_chair' },
    hotspots: [
      // --- getting in and out (the lab door knocks first)
      { id: 'knock', at: 'lab_door_out', r: 1.3, verb: 'Knock', once: true, flag: 'knocked', when: () => inLab(),
        steps: [{ do: (c) => { const a = actor(c, state.active); if (a) { a.face([0, 7.2]); a.play('knock'); } } }, { sfx: 'knock' }, { wait: 1.2 }] },
      { id: 'lab_out', at: [0, 0, 7.6], r: 0.6, verb: 'Go out', when: (s) => inLab() && !!s.flags.knocked,
        door: { to: { set: 'square', mark: [14.55, 0, 13.4, PI] }, kind: 'wood' }, do: squareDress },
      { id: 'lab_in', at: 'lab_door', r: 1.2, verb: 'Go down', when: () => inSquare(),
        door: { to: { set: 'lab', mark: [0, 0, 8.3, 0] }, kind: 'wood' }, do: labDress },
      { id: 'lodge_in', at: 'lodge_out', r: 1.0, verb: 'Open', when: () => inSquare(), door: { to: [-21.3, 0.46, 3.4, 0], kind: 'wood' } },
      { id: 'lodge_exit', at: [-21.3, 0.46, 2.7], r: 0.5, verb: 'Open', when: () => inSquare(), door: { to: 'lodge_out', kind: 'wood' } },
      { id: 'buttery_in', at: 'buttery_door', r: 1.2, verb: 'Go in', when: () => inSquare(),
        door: { to: { set: 'buttery', mark: 'door_in' }, kind: 'wood' }, do: (c) => { butteryDress(c); c.music('buttery_radio', { fade: 1 }); } },
      { id: 'buttery_out', at: [-7.65, 1.3, 0], r: 0.9, verb: 'Go out', when: () => inButtery(),
        door: { to: { set: 'square', mark: [7.27, 0, 13.4, PI] }, kind: 'wood' }, do: (c) => { squareDress(c); c.music('dublin', { fade: 2 }); } },
      // --- The Charger
      { id: 'transformer', at: 'transformer', r: 1.3, verb: 'Take', once: true, flag: 'part_transformer', when: (s) => inLab() && !!s.flags.met_declan,
        steps: [say('declan', "Mind it. It's from a train set."), say('chase', "We'll bring it back."), say('declan', "Yous won't."),
          { prop: 'transformer', visible: false }, { item: 'transformer' }] },
      { id: 'strippers', at: 'strippers', r: 1.3, verb: 'Strip cable', once: true, flag: 'part_cable', when: (s) => inLab() && !!s.flags.met_declan,
        steps: [say('chase', 'This is my only cable.'), say('luka', 'Then make it count.'), { sfx: 'tick' }, { wait: 0.3 }, { sfx: 'tick' }, { item: 'cable' }] },
      { id: 'des', at: 'des', r: 1.5, verb: 'Talk', when: () => inSquare(),
        steps: [{ if: (s) => !s.flags.des_bike,
          then: [say('des', "That bike's been chained there since 1979. If the owner comes back, I'll tell him it went to science."), { flag: 'des_bike' }],
          else: [say('des', 'Tea?')] }] },
      { id: 'drawer', at: 'lost_property_drawer', r: 1.2, verb: 'Search', when: (s) => inSquare() && !!s.flags.des_bike && !s.flags.part_bike && !s.inventory.includes('key_1979'),
        steps: [{ sfx: 'creak', vol: 0.5 }, { shot: 'INSERT', at: 'lost_property_drawer', card: ['keytag', { text: '1979' }] }, { wait: 1.4 }, { item: 'key_1979' }] },
      { id: 'bike', at: 'bike', r: 1.7, verb: 'Unlock', once: true, flag: 'part_bike', when: (s) => inSquare() && s.inventory.includes('key_1979'),
        steps: [
          { item: 'key_1979', remove: true }, { sfx: 'clunk' }, { prop: 'bike_chain', visible: false },
          // off across the cobbles towards the lab, the Campanile ahead of them; the bike wobbles at Luka's side
          { place: 'luka', at: [-17.3, 0, 9.3, H] }, { place: 'chase', at: [-17.2, 0, 8.4, H] },
          { do: (c) => wheel(c, true) },
          { shot: 'CAM', pos: [-19.4, 1.8, 10.8], look: [-12.5, 0.9, 8.9], fov: 45 },
          { move: 'chase', to: [-12.2, 0, 8.3], nowait: true, speed: 1.1 },
          { move: 'luka', to: [-12.2, 0, 9.1], speed: 1.1 },
          { do: (c) => wheel(c, false) },
          { fade: 'out', dur: 0.5 },
          { prop: 'bike', visible: false },
          { set: 'lab', env: 'day', spawn: { luka: [0.2, 0, 8.4, 0.3], chase: [-0.5, 0, 8.2, 0.3] } },
          { do: labDress },
          { shot: 'INSERT', at: 'lab_wide' },   // (a lab angle to fade up on; the release eases into play from here)
          { fade: 'in', dur: 0.5 },
        ] },
      { id: 'wire', at: 'declan_bench', r: 1.7, verb: 'Wire it up', once: true, flag: 'wire_go',
        when: (s) => inLab() && !!(s.flags.part_transformer && s.flags.part_bike && s.flags.part_cable), do: () => {} },
      // --- samples, tea, the bike between sessions
      { id: 'computer', at: 'computer', r: 1.2, sample: 'beep', when: () => inLab() },
      { id: 'bike_next', at: 'bike_rig', r: 1.6, verb: 'Pedal', sample: 'dynamo', flag: 'next_session', when: (s) => inLab() && !!s.flags.resting,
        do: () => {} },
      { id: 'kettle', at: 'kettle', r: 1.1, verb: 'Use', kettle: true, sample: 'kettle' },
      { id: 'gutter', at: 'gutter', r: 1.4, sample: 'rain', when: () => inSquare() },
      { id: 'till', at: 'till', r: 1.3, sample: 'till', when: () => inButtery() },
      { id: 'urn', at: 'urn', r: 1.2, verb: 'Use', text: 'Close enough.', kettle: true, when: () => inButtery() },
    ],
    steps: [
      ['do', (c) => { state.flags.resting = false; state.flags.next_session = false; RIG.built = false; squareDress(c); c.world.preload('lab'); }],   // (a kettle save between sessions keeps them)
      ['cutscene', '2.6_des'],
      ['control', 'luka'], ['follow', 'chase'],
      ['objective', 'Find a way to charge the phones.'],
      ['roam', { until: 'knocked', auto: (c) => c.hotspots.trigger('knock') }],
      ['cutscene', '2.6_declan'],
      ['swap', true],
      ['roam', {
        until: 'wire_go', hint: { after: 120, steps: [{ do: missing }] },
        async auto(c) {
          for (const id of ['transformer', 'strippers', 'computer', 'lab_out', 'gutter', 'lodge_in', 'kettle', 'des', 'drawer', 'lodge_exit', 'bike', 'wire']) await c.hotspots.trigger(id);
        },
      }],
      ['minigame', 'wiring', { layout: 'charger' }],
      ['cutscene', '2.6_rig'],
      ['do', pedal(1)], ...rest,
      ['do', pedal(2)], ...rest,
      ['do', pedal(3)],
      ['cutscene', '2.6_timelapse'],
    ],
    grants: { flags: { knocked: true, met_declan: true, part_transformer: true, part_bike: true, part_cable: true, charger_done: true, des_bike: true },
      items: ['recorder'], removeItems: ['bug_list'], samples: ['kettle', 'rain', 'till', 'beep', 'dynamo'], battery: 4, bars: 2 },
  };

  CUTSCENES['2.6_des'] = [
    { place: 'luka', at: [-22.55, 0.46, 4.2, 0.7] }, { place: 'chase', at: [-23.3, 0.46, 4.6, 0.9] },
    { act: [['des', 'sit', { h: 0.46 }]] },
    { do: (c) => glanceAt(c, 'des', 'luka', 6) },
    { shot: 'CLOSE', on: 'des' },
    say('des', "If it's wires you're after, try the computer lads in the basement. They never leave. I'm not sure they're allowed."),
    { fade: 'out', dur: 0.6 },
    { set: 'lab', env: { hemi: [0xe6eaee, 0x80868c, 1.15], fog: [0x9aa0a6, 0.015] }, spawn: { luka: [0, 3.2, -1.3, 0], chase: [0.35, 3.2, -2.3, 0] } },
    { do: labDress },
    // [TRACK · down the stairwell, ahead of them] Grey daylight to green screen-glow as they go down. (The stairwell is
    // 1.6 m wide: the lens backs down the steps in front of them on an explicit glide.)
    { shot: 'CAM', pos: [0.35, 3.65, 2.0], look: [0, 4.25, -1.6], fov: 55, to: { pos: [0.35, 1.6, 6.75], look: [0, 1.5, 3.6], fov: 55 }, dur: 5.2 },
    { fade: 'in', dur: 0.4 },
    { env: { hemi: [0x9ee0b0, 0x2e4a3a, 0.8], fog: [0x2e4a3a, 0.03] }, dur: 5 },
    { move: 'chase', to: [0.4, 0, 3.7], nowait: true, speed: 1.3 },
    { move: 'luka', to: [0, 0, 4.5], speed: 1.3 },
    { wait: 0.4 },
    { env: 'day', dur: 1 },
    // A door at the bottom: "COMPUTER LAB. AUTHORISED USERS ONLY. KNOCK."
    { shot: 'INSERT', at: 'door_sign', card: ['lab_sign', { text: 'COMPUTER LAB. AUTHORISED USERS ONLY. KNOCK.' }] },
    { wait: 2.2 },
  ];

  CUTSCENES['2.6_declan'] = [
    { prop: 'lab_door', fn: (o) => { o.userData.open = true; } },
    { sfx: 'creak' },
    { place: 'luka', at: [0.1, 0, 8.4, 0.5] }, { place: 'chase', at: [-0.6, 0, 8.1, 0.6] },
    // [WIDE · the lab] Green screens humming, a cassette deck feeding one of them. Declan looks up like he's been caught.
    { shot: 'INSERT', at: 'lab_wide' },
    { wait: 0.6 },
    { face: 'declan', to: 'luka' }, { expr: [['declan', 'stunned']] },
    say('declan', 'Are yous from Engineering?'),
    say('chase', "We're from… Queensland."),
    say('declan', 'Is that a department?'),
    // [CLOSE · Declan, lit by the iPhone's screen] He stares at it like it's the Book of Kells. (Chase holds it out
    // across Declan's bench; the lens looks back past him.)
    { place: 'chase', at: [7.25, 0, 10.75, -1.75] }, { place: 'luka', at: [7.35, 0, 9.9, -1.4] },
    { face: 'declan', to: 'chase' },
    { act: [['chase', 'phone']] },
    { do: (c) => { const s = c.world.torch, a = actor(c, 'declan'); if (!s || !a) return; c.world.torchAuto = false; s.position.set(6.5, 1.15, 10.95); a.headPos(s.target.position); s.color.set(0xcfe4ff); s.angle = 0.6; s.intensity = 0.6; } },
    { shot: 'CAM', pos: [7.6, 1.3, 11.75], look: [5.65, 1.22, 11.0], fov: 30 },
    say('declan', 'What does it do?'),
    say('chase', "Everything. Mostly people use it to look at other people's lunch."),
    say('declan', '…Why?'),
    say('chase', 'Honestly, mate? Nobody knows.'),
    // [CLOSE · Declan]
    { do: (c) => { const s = c.world.torch; if (s) { s.intensity = 0; c.world.torchAuto = true; } } },
    { act: [['chase', 'idle']] }, { expr: [['declan', 'neutral']] }, { face: 'declan', to: [7.3, 10.4] },
    { shot: 'CLOSE', on: 'declan', locked: true },
    say('declan', 'I want to build a system for shops. Does all the boring bits, stock, receipts, forms, so the people behind the counter can do the people bits.', { speed: 'slow' }),
    // [TWO-SHOT · the boys exchange a look]
    { shot: 'TWO', on: ['luka', 'chase'] },
    { do: (c) => { glanceAt(c, 'luka', 'chase', 1.4); glanceAt(c, 'chase', 'luka', 1.4); } },
    { wait: 1 },
    say('chase', 'That sounds really nice.', { speed: 'slow' }),
    say('luka', "Yeah. Just… don't add pop-ups.", { speed: 'slow' }),
    say('declan', "What's a pop-up?"),
    say('luka_chase', 'Nothing.'),
    // [INSERT] A portable cassette recorder with a built-in mic, on the bench beside a computer. Chase has spotted it.
    { shot: 'INSERT', at: 'recorder' },
    say('chase', 'Does that computer make sounds?'),
    say('declan', 'Three tones and a noise channel.'),
    say('chase', "That's all you need. Can I borrow your tape recorder?"),
    say('declan', 'What for?'),
    say('chase', 'Samples.'),
    say('declan', 'Of what?'),
    say('chase', 'Everything.'),
    // [ORBIT · around Chase] The idea arrives. (He has the recorder now; clear floor all round him.)
    { place: 'chase', at: [3.4, 0, 11.7, 1.1] }, { place: 'luka', at: [2.5, 0, 10.4, 0.9] },
    { prop: 'recorder', visible: false }, REC(true),
    { shot: 'MID', on: 'chase', move: 'orbit', from: -40, to: 80, dur: 10 },
    { item: 'recorder' },
    { wait: 1.2 },
    { do: (c) => c.ui.toast('Hold YES near a sound to record it.') },
    { wait: 1.4 },
    { expr: [['chase', 'determined']] },
    say('chase', 'Bicycle. Dynamo. Transformer. Cable. Done.'),
    say('luka', 'Where are we getting a bicycle?'),
    { expr: [['chase', 'worried']] },
    say('chase', '…I have not thought about that part.'),
    { expr: [['chase', 'neutral']] }, REC(false),
    { flag: 'met_declan' },
  ];

  CUTSCENES['2.6_rig'] = [
    // Declan rigs the bike onto a stand. Somebody has to pedal.
    { item: 'transformer', remove: true }, { item: 'cable', remove: true },
    { flag: 'charger_done' },
    { fade: 'out', dur: 0.4 },
    { prop: 'bike_rig', visible: true }, { do: () => { RIG.built = true; } },
    { do: (c) => unsit(c, 'declan') },
    { place: 'declan', at: [4.25, 0, 13.3, -2.0] }, { place: 'chase', at: 'bike_side' }, { place: 'luka', at: [1.3, 0, 12.6, 1.0] },
    { shot: 'INSERT', at: 'bike_rig' },
    { act: [['declan', 'point']] },
    { fade: 'in', dur: 0.4 },
    { wait: 1.2 },
    // [WIDE · locked, side-on] Luka on the bike.
    { place: 'luka', at: 'bike_rig' }, { act: [['luka', 'pedal', { speed: 0.4 }], ['declan', 'idle']] },
    { place: 'chase', at: [1.75, 0, 13.3, 2.2] },
    SIDE,
    { wait: 0.5 },
    say('luka', 'Why am I pedalling?'),
    say('chase', "You're the 2IC."),
    say('luka', "That's not what 2IC means."),
    say('chase', 'Second-in-Cycling.'),
  ];

  // [TIME-LAPSE · locked wide, under the basement's high window] Days pass (the sessions took HUD 1% → 4%, a day each). Luka pedals; Chase records the
  // machines, the rain at the window, the kettle; later he's at a computer in headphones, typing in notes, and the demo
  // is rebuilt out of three bleeps and a hiss; at another bench Declan reads the Bug List Chase left lying there.
  CUTSCENES['2.6_timelapse'] = [
    { fade: 'out', dur: 0.5 },
    { music: null, fade: 1 },
    { do: (c) => { state.flags.resting = false; c.player.follower(null); } },
    { place: 'luka', at: 'bike_rig' }, { act: [['luka', 'pedal', { speed: 0.9 }]] },
    { place: 'chase', at: [3.9, 0, 8.6, PI] }, REC(true), { act: [['chase', 'give', { dur: 3 }]] },   // the humming machines
    { place: 'declan', at: 'declan_bench' }, { act: [['declan', 'sit', { h: 0.48 }]] },
    { prop: 'bug_list', visible: true },   // (the HUD already reads 4%: each session added its 1%)
    { shot: 'CAM', pos: [7.4, 2.9, 8.0], look: [-0.2, 0.9, 12.8], fov: 58 },
    { fade: 'in', dur: 0.5 },
    { act: [['declan', 'type']] },
    { do: (c) => { SONG.h = c.AUDIO ? c.AUDIO.song(null, { samples: ['rain'], bars: 8 }) : null; } },
    { timelapse: { dur: 13, cycles: 3, from: 'day', to: 'night', keys: [
      { t: 1.4, steps: [snap('pedal')] },
      { t: 3.0, steps: [{ place: 'chase', at: 'window_below' }, { act: [['chase', 'look_up']] }] },   // the rain at the window
      { t: 5.8, steps: [{ place: 'chase', at: [-2.4, 0, 8.25, -2.3] }, { act: [['chase', 'give', { dur: 2 }]] }] },   // the kettle
      { t: 8.5, steps: [REC(false), PHONES(true), { place: 'chase', at: 'chase_computer' }, { act: [['chase', 'sit', { h: 0.46 }]] }, { wait: 0.05 }, { act: [['chase', 'type']] },
        { do: (c) => { const d = actor(c, 'declan'); d.play('reading'); c.wait(0.05).then(() => { if (d.rig.attach.textbook) d.rig.attach.textbook.visible = false; }); } },
        { hold: 'declan', prop: 'bug_list' }] },
    ] } },
    { hud: { battery: 4, bars: 2 } },
    // [OTS · behind Declan, the list in his hands]
    PHONES(false),
    { place: 'declan', at: 'declan_bench' }, { place: 'chase', at: 'declan_across' },
    { do: (c) => unsit(c, 'chase') },
    { shot: 'MID', on: 'chase', side: 'ots:declan' },
    say('declan', "What's this list?"),
    say('chase', 'Bugs. In a computer system. From the future.'),
    say('declan', 'Can I keep reading it?'),
    say('chase', 'Knock yourself out.'),
    { item: 'bug_list', remove: true },
    // [INSERT · held] The list in Declan's hands.
    { do: fillList },
    { shot: 'INSERT', at: 'declan', card: ['list', LIST] },
    { wait: 3.5 },
    { fade: 'out', dur: 1.2 },
    { do: () => { if (SONG.h) SONG.h.stop(); SONG.h = null; } },
  ];
})();
