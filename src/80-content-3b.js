// ============================================================ CONTENT: 3.3 "Note to Self", 3.4 "Opt Us In"
// SPEC §12. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
// Mini-games: sequencer (64-mg-cards-sequencer.js), dial {mode:'final'} (61-mg-keypad-buglist-dial.js), final_yes (65-mg-finalyes.js).
(() => {
  const PI = Math.PI, H = PI / 2;
  const say = (id, text, o) => Object.assign({ say: id, text }, o);
  const slow = (id, text, o) => say(id, text, Object.assign({ speed: 'slow' }, o));
  const actor = (c, id) => c.world.actor(id);

  // ---------------------------------------------------------- helpers (from `do` steps, never per frame)
  // A tween that removes itself; instant while skipping, and finishes at once if the scene changes under it.
  function tween(c, dur, fn) {
    const sid = c.flow.sceneId;
    if (c.flow.skipping || !(dur > 0)) { fn(1); return; }
    let t = 0;
    const f = (dt) => {
      t = Math.min(1, t + dt / dur);
      if (flow.sceneId !== sid) t = 1;
      fn(t * t * (3 - 2 * t));
      if (t >= 1) removeUpdate(f);
    };
    addUpdate(f);
  }
  // Tiny hand props, built once: the dictaphone, the microcassette, the PUDDING tape, Rue's motivational tape.
  const kit = {};
  function prop(c, name) {
    let g = kit[name];
    if (!g) {
      const b = new Builder(), m = mat;
      if (name === 'dictaphone') {
        b.box(0.055, 0.11, 0.026, m(0x2a2a2e), [0, 0, 0]); b.box(0.042, 0.032, 0.004, m(0x9a9a9a), [0, 0.03, 0.014]);
        b.box(0.03, 0.02, 0.004, m(0x111111), [0, -0.012, 0.014]); b.box(0.012, 0.01, 0.006, m(0xc02020), [0.016, -0.04, 0.014]);
      } else if (name === 'micro') {
        b.box(0.05, 0.032, 0.008, m(0xe8e4dc), [0, 0, 0]); b.box(0.032, 0.012, 0.009, m(0x3a3431), [0, 0.002, 0]);
      } else {
        b.box(0.1, 0.064, 0.013, m(0x26282d), [0, 0, 0]);
        b.box(0.084, 0.036, 0.014, m(name === 'pudding' ? 0xf6f1e3 : 0xb0182c), [0, 0.008, 0]);
        b.box(0.084, 0.008, 0.0145, m(name === 'pudding' ? 0xe8743b : 0xf4c542), [0, -0.006, 0]);
      }
      g = kit[name] = b.done(); g.name = 'kit_' + name;
    }
    if (g.parent !== c.world.scene) { if (g.parent) g.parent.remove(g); g.position.set(0, -30, 0); c.world.scene.add(g); delete g.userData.home; }   // a home for hold(null)
    g.visible = true;
    return g;
  }
  function hand(c, id, name) {   // put a kit prop in someone's right hand (off everyone else's first)
    for (const a of c.world.actors.values()) if (a.held && a.held.name === 'kit_' + name) a.hold(null);
    const a = actor(c, id); if (a) a.hold(prop(c, name), 'R');
  }
  function drop(c, id) { const a = actor(c, id); if (a && a.held) { const o = a.held; a.hold(null); o.visible = false; } }
  function hideTextbook(c, id) { return c.wait(0.05).then(() => { const a = actor(c, id), b = a && a.rig.attach.textbook; if (b) b.visible = false; }); }
  const seat = (id, h, anim = 'sit') => ({ do: (c) => { const a = actor(c, id); if (a) { a.play('sit', { h }); a.rig.seated = true; if (anim !== 'sit') a.play(anim, { h }); } } });
  // an INSERT on someone's right hand, from in front of them and above (the hand's own position, after the pose settles)
  const V1 = new THREE.Vector3();
  function handShot(c, id, fwd = 0.34, up = 0.2, side = 0.08, fov = 32) {
    const a = actor(c, id), g = a && (a.rig.attach.gripR || a.rig.parts.handR);
    if (!g) return;
    a.root.updateMatrixWorld(true); g.getWorldPosition(V1);
    const fx = Math.sin(a.rotY), fz = Math.cos(a.rotY);
    c.cam.shot({ shot: 'CAM', pos: [V1.x + fx * fwd - fz * side, V1.y + up, V1.z + fz * fwd + fx * side], look: [V1.x, V1.y, V1.z], fov });
  }

  // Screen light: the rig's spot, parked at a screen or a window (it must stop riding in the player's hand).
  function lamp(c, on, pos, tgt, color = 0x62ff7a, power = 4, angle = 0.7) {
    const s = c.world.torch;
    if (!s) return;
    c.world.torchAuto = !on;
    s.intensity = on ? power : 0;
    if (!on) return;
    s.color.set(color); s.angle = angle; s.distance = 30; s.penumbra = 0.6;
    s.position.set(pos[0], pos[1], pos[2]); s.target.position.set(tgt[0], tgt[1], tgt[2]); s.target.updateMatrixWorld();
  }

  // Dissolve within the same frame: this frame is snapped over the live view and fades out on the game clock.
  const DZ = { el: null, t: 0, dur: 1 };
  function dzTick(dt) {
    DZ.t += dt;
    const k = Math.min(1, DZ.t / DZ.dur);
    DZ.el.style.opacity = String(1 - k);
    if (k >= 1 || flow.skipping) { DZ.el.style.opacity = '0'; removeUpdate(dzTick); }
  }
  function dissolve(c, dur = 1.4) {
    if (c.flow.skipping) return;
    const g = renderer.domElement;
    if (!DZ.el) { DZ.el = document.createElement('canvas'); DZ.el.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;opacity:0;z-index:0'; g.after(DZ.el); }
    try {
      c.world.render(1);
      DZ.el.width = g.width >> 1; DZ.el.height = g.height >> 1;
      DZ.el.getContext('2d').drawImage(g, 0, 0, DZ.el.width, DZ.el.height);
    } catch (e) { return; }
    DZ.el.style.opacity = '1'; DZ.t = 0; DZ.dur = dur;
    removeUpdate(dzTick); addUpdate(dzTick);
  }
  // Rue's lean against the corridor wall: the whole seated body rolls toward it (root roll; rotY stays the engine's).
  const lean = (k) => (c) => { const a = actor(c, 'rue19'); if (a) a.root.rotation.z = -k; };
  // Muffled through the door: voices, never the words.
  const DOOR = [-12.45, 1.4, 3.1];
  const through = (name, vol, rate = 1) => ({ sfx: name, vol, rate, at: DOOR, lp: 650 });

  // ---------------------------------------------------------- the lanyard: Luka's one mesh, carried to Rue
  const LY = { mesh: null, luka: null };
  function lanyard(c) {
    const l = actor(c, 'luka');
    if (!LY.mesh && l && l.rig.attach.lanyard) { LY.mesh = l.rig.attach.lanyard; LY.luka = l.rig; }
    return LY.mesh;
  }
  function lanyardHome(c, visible = true) {   // back on Luka's torso, as built (the rig is pooled: leave it as found)
    const m = lanyard(c), r = LY.luka;
    if (!m || !r) return;
    r.parts.torso.add(m); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); m.visible = visible;
    r.attach.lanyard = m;
  }
  // Leaving 3.3/3.4 early (quit, scene select): the pooled rigs go back as they were (the lanyard home, Chase's earbud in, Rue upright)
  const RIGS = {};
  function watch(c) {
    for (const id of ['rue19', 'chase']) { const a = actor(c, id); if (a) RIGS[id] = a.rig; }
    if (RIGS.u) return;
    addUpdate(RIGS.u = () => {
      if (flow.sceneId === '3.3' || flow.sceneId === '3.4') return;
      removeUpdate(RIGS.u); RIGS.u = null;
      lanyardHome({ world });
      const g = RIGS.chase && RIGS.chase.attach; if (g) { if (g.headphones) g.headphones.visible = false; if (g.earbud) g.earbud.visible = true; }
      const r = RIGS.rue19; if (r) { r.root.rotation.z = 0; if (r.attach.brick) r.attach.brick.visible = false; }
    });
  }
  // [CLOSE · Luka's hands] off over his head, then held in front of him for a second
  function lanyardOff(c) {
    const m = lanyard(c), l = actor(c, 'luka');
    if (!m || !l) return;
    delete l.rig.attach.lanyard;   // no anim toggles it from here on
    const d = l.rig.d, y1 = 0.3 - d.T, z1 = (d.chestZ || 0.12) + 0.14;
    l.mood = null; l.play('hands_head');
    tween(c, 0.7, (k) => { m.position.set(0, k * 0.42, k * 0.05); });
    c.wait(0.7).then(() => {
      l.play('reading'); hideTextbook(c, 'luka');
      tween(c, 0.6, (k) => { m.position.set(0, 0.42 + (y1 - 0.42) * k, 0.05 + (z1 - 0.05) * k); m.rotation.x = 0.5 * k; });
    });
  }
  // [MID · from behind Rue] Luka lifts it over Rue's head; it settles on Rue's shoulders, fitted to him.
  function lanyardOn(c) {
    const m = lanyard(c), l = actor(c, 'luka'), r = actor(c, 'rue19');
    if (!m || !l || !r) return;
    const dl = LY.luka.d, dr = r.rig.d, sx = dr.nr / dl.nr, sz = (dr.chestZ || 0.12) / (dl.chestZ || 0.12), y = dr.T - dl.T;
    l.play('lanyard_on', { dur: 2 });
    r.rig.parts.torso.attach(m);   // keeps where it is in the world; now it rides on Rue
    const p0 = m.position.clone(), q0 = m.quaternion.clone(), s0 = m.scale.clone(), q1 = new THREE.Quaternion();
    tween(c, 1.6, (k) => {
      m.position.set(p0.x * (1 - k), p0.y + (y - p0.y) * k + Math.sin(k * PI) * 0.35, p0.z + (0 - p0.z) * k);
      m.quaternion.copy(q0).slerp(q1, k);
      m.scale.set(s0.x + (sx - s0.x) * k, s0.y + (1 - s0.y) * k, s0.z + (sz - s0.z) * k);
    });
  }

  // ---------------------------------------------------------- the Walkman tape: a shop-bought label (no felt-tip)
  CARDS.tape = (cx, w, h, d) => {
    const x = w * 0.05, y = h * 0.06, cw = w * 0.9, ch = h * 0.88, lx = x + cw * 0.07, ly = y + ch * 0.08, lw = cw * 0.86, lh = ch * 0.64;
    cx.shadowColor = 'rgba(0,0,0,.4)'; cx.shadowBlur = 28; cx.shadowOffsetY = 12;
    cx.fillStyle = '#1b1c20'; cx.beginPath(); cx.roundRect(x, y, cw, ch, 22); cx.fill(); cx.shadowColor = 'transparent';
    const g = cx.createLinearGradient(0, ly, 0, ly + lh); g.addColorStop(0, '#c8142e'); g.addColorStop(1, '#78091a');
    cx.fillStyle = g; cx.fillRect(lx, ly, lw, lh);
    cx.fillStyle = '#f4c542'; cx.fillRect(lx, ly + lh * 0.3, lw, 6); cx.fillRect(lx, ly + lh * 0.86, lw, lh * 0.14);
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = '#fff'; cx.font = 'bold italic 58px Georgia, "Times New Roman", serif'; cx.fillText(d.text || '', w / 2, ly + lh * 0.17, lw * 0.92);
    cx.fillStyle = '#f4c542'; cx.font = 'bold 34px Georgia, serif'; cx.fillText('A', lx + 34, ly + lh * 0.5);
    const wx = lx + lw * 0.2, wy = ly + lh * 0.42, ww = lw * 0.6, wh = lh * 0.34;
    cx.fillStyle = '#2a2527'; cx.beginPath(); cx.roundRect(wx, wy, ww, wh, wh / 2); cx.fill();
    for (const rx of [wx + wh * 0.62, wx + ww - wh * 0.62]) { cx.fillStyle = '#5a3a28'; cx.beginPath(); cx.arc(rx, wy + wh / 2, wh * 0.4, 0, 7); cx.fill(); cx.fillStyle = '#eee8dc'; cx.beginPath(); cx.arc(rx, wy + wh / 2, wh * 0.18, 0, 7); cx.fill(); }
    cx.fillStyle = '#101114'; cx.beginPath(); cx.moveTo(x + cw * 0.18, y + ch); cx.lineTo(x + cw * 0.24, y + ch * 0.8); cx.lineTo(x + cw * 0.76, y + ch * 0.8); cx.lineTo(x + cw * 0.82, y + ch); cx.fill();
  };

  // =================================================================== 3.3 — "Note to Self"
  // Rue's room: Rue by the door, the boys in the room; the corridor: Rue on the steps outside his own door.
  const RUE_ROOM = [-13.35, 0.4, 2.0, -H - 0.25], CHASE_ROOM = [-14.25, 0.4, 1.55, 1.2], LUKA_ROOM = [-15.9, 0.4, 2.2, H];
  const STEP_SEAT = [-11.82, 0.2, 2.74, H], STEP_UP = [-11.95, 0.4, 2.85, -H + 0.2], CHASE_IN = [-13.25, 0.4, 3.35, H], DOORWAY = [-12.62, 0.4, 3.12, H];
  // [WIDE · the corridor, symmetrical, locked] = the rooms 'corridor' anchor (mirrored in 3.7 outside the backroom)
  const CORRIDOR = { shot: 'CAM', pos: [-3.4, 1.45, 3.1], look: [-12.0, 0.9, 3.1], fov: 38 };
  // the lab at 3 am: one green screen (Chase's), Luka asleep on the floor, Declan asleep at his bench
  const SCREEN = [-3.42, 1.08, 11.2], LAB_NIGHT = Object.assign({}, SETS.lab.env.night, { hemi: [0x9ae0b0, 0x2a3a30, 0.55], dir: [0x4a8a65, 0.3, [2, 10, -6]] });
  const LAB_WIDE = { shot: 'CAM', pos: [7.45, 2.8, 14.75], look: [-1.0, 0.7, 9.7], fov: 58 };
  const GREEN = { shot: 'CAM', pos: [-3.74, 1.5, 10.98], look: [-2.92, 1.31, 11.22], fov: 40 };
  const REC = { shot: 'INSERT', at: [-3.55, 0.82, 11.8], from: [-3.0, 1.3, 12.3], fov: 34 };
  const onFace = (c) => lamp(c, true, SCREEN, [-3.1, 1.15, 11.45], 0x62ff7a, 0.9, 1.1);
  const onRec = (c) => lamp(c, true, [-3.3, 1.45, 11.45], [-3.55, 0.78, 11.8], 0x62ff7a, 0.8, 0.9);
  const BENCH_PHONE = [6.1, 0.765, 11.04];
  const SONG = (60 / 92) * 4 * 8;   // eight bars at 92 BPM

  function roomDress(c) {
    const P = (n) => c.world.prop(n);
    P('room_lamp')?.userData.on?.(true);
    const d = P('door'); if (d) { d.userData.open = undefined; d.rotation.y = d.userData.closedY ?? d.rotation.y; }
    const l = actor(c, 'luka'); if (l) l.mood = null;
    lanyardHome(c); watch(c);
  }
  function labDress(c) {
    const P = (n) => c.world.prop(n);
    for (const [n, v] of [['screens', false], ['screen_main', true], ['prepaid_phone', false], ['bug_list', false], ['bike_rig', true]]) { const o = P(n); if (o) o.visible = v; }
    const dr = P('lab_door'); if (dr) { dr.userData.open = undefined; dr.rotation.y = 0; }
    const d = c.world.spawn('declan', 'declan_bench'); d.rig.seated = true; d.play('sleep', { h: 0.48 });
    const l = c.world.spawn('luka', 'floor_sleep'); l.mood = null; l.play('lie'); l.setExpr('sleep');
    c.world.spawn('chase', 'kettle');
    if (c.inventory.has('bug_list')) c.inventory.remove('bug_list');   // it stays with Declan
  }
  const phones = (on) => (c) => {   // Chase's headphones on (the earbud comes out) or off (it goes back in)
    const a = actor(c, 'chase'), g = a && a.rig.attach;
    if (!g) return;
    if (g.headphones) g.headphones.visible = on;
    if (g.earbud) g.earbud.visible = !on;
  };

  SCENES['3.3'] = {
    title: 'Note to Self', set: 'rooms', env: 'night', time: 'Mon 26 Oct 1987, late',
    playable: ['chase'], swap: false, hud: { battery: 4, bars: 4 }, music: null,
    spawn: { rue19: RUE_ROOM, chase: CHASE_ROOM, luka: LUKA_ROOM },
    hotspots: [
      { id: 'kettle', at: 'kettle', r: 1.1, verb: 'Use', kettle: true, sample: 'kettle', when: () => flow.scene && world.setId === 'lab' },
      { id: 'computer', at: 'computer', r: 1.3, verb: 'Sit down', once: true, flag: 'seq_go', when: () => world.setId === 'lab',
        steps: [{ move: 'chase', to: 'chase_computer' }, seat('chase', 0.48)] },
    ],
    steps: [
      ['do', (c) => { roomDress(c); c.world.preload('lab'); }],
      ['cutscene', '3.3_tape'],
      ['control', 'chase'],
      ['objective', 'Finish the song.'],
      ['roam', { until: 'seq_go', auto: (c) => c.hotspots.trigger('computer') }],
      ['objective', null],         // (the sequencer fills the screen with its own header)
      ['cam', 'fixed', GREEN],   // the minigame's release eases into this same angle: no jump
      ['cutscene', '3.3_green'],
      ['minigame', 'sequencer', {}],
      ['cutscene', '3.3_finished'],
    ],
    grants: { flags: { note_recorded: true, tape_with_rue: true, song_finished: true, prepaid_left_with_declan: true }, battery: 4, bars: 4 },
  };

  CUTSCENES['3.3_tape'] = [
    { face: 'chase', to: 'rue19' }, { face: 'luka', to: 'rue19' },
    // [CLOSE · Rue's thumb on the dictaphone] He wipes his own memos before handing it over.
    { do: (c) => hand(c, 'rue19', 'dictaphone') },
    { act: [['rue19', 'tap']] },
    { do: (c) => lamp(c, true, [-14.2, 2.9, 2.6], [-13.1, 1.0, 2.0], 0xffd6a0, 5, 0.6) },   // the room's lamp, on his hands
    { wait: 0.1 },
    { do: (c) => handShot(c, 'rue19') },
    { wait: 0.4 }, { sfx: 'dictaphone', vol: 0.7 }, { wait: 0.7 }, { sfx: 'dictaphone', vol: 0.7, rate: 1.2 },
    say('rue19', 'Forty-seven notes to self. None of them were nice. ^ I\'ll give yous the room.'),
    { act: [['rue19', 'give', { dur: 1.4 }]] },
    { wait: 0.7 },
    { do: (c) => hand(c, 'chase', 'dictaphone') },
    { wait: 0.7 },
    // [WIDE · the corridor, symmetrical, locked] Rue sits on the stairs outside his own door. Through it, muffled: two voices,
    // laughing, then not laughing, then quiet for a long time. The camera never goes in. Dissolves within the same frame
    // compress twenty minutes: sitting, then leaning, then his head against the wall, eyes closed, smiling at a laugh.
    { do: (c) => { lamp(c, false); drop(c, 'chase'); const d = c.world.prop('door'); if (d) { d.userData.open = undefined; d.rotation.y = d.userData.closedY ?? d.rotation.y; } } },
    { place: 'chase', at: CHASE_IN }, { place: 'luka', at: [-15.2, 0.4, 3.3, H] },
    { place: 'rue19', at: STEP_SEAT }, { act: [['rue19', 'sit', { h: 0.2 }]] }, { expr: [['rue19', 'neutral']] },
    CORRIDOR,
    { do: (c) => lamp(c, true, [-11.0, 2.55, 3.05], [-11.75, 0.7, 2.8], 0xffe0b0, 3.5, 0.9) },   // the lamp over the steps
    { wait: 0.6 }, through('murmur', 0.8), { wait: 1.2 }, through('titter', 0.9, 0.85), { wait: 1.0 }, through('murmur', 0.8, 1.05),
    { wait: 0.9 }, through('titter', 0.9, 0.8), { wait: 1.6 },
    { do: (c) => dissolve(c) }, { do: lean(0.1) }, { act: [['rue19', 'look_down']] },
    { wait: 0.5 }, through('murmur', 0.55, 0.92), { wait: 2.3 }, through('murmur', 0.4, 0.88), { wait: 2.2 },
    { do: (c) => dissolve(c) }, { do: lean(0.16) }, { act: [['rue19', 'sit', { h: 0.2 }]] },
    { wait: 3.4 },
    { do: (c) => dissolve(c) }, { do: lean(0.22) }, { act: [['rue19', 'look_up']] },
    { do: (c) => { const a = actor(c, 'rue19'); if (a) a.rig.face.eyes('closed'); } },
    { wait: 1.4 }, through('titter', 0.8, 0.9), { wait: 0.4 },
    { do: (c) => { const a = actor(c, 'rue19'); if (a) a.rig.face.mouth('smile'); } },
    { wait: 2.2 },
    // [MID · the door opens] Chase holds out the microcassette.
    { do: lean(0) }, { place: 'rue19', at: STEP_UP }, { act: [['rue19', 'idle']] }, { expr: [['rue19', 'neutral']] },
    { do: (c) => { const d = c.world.prop('door'); if (d) d.userData.open = true; hand(c, 'chase', 'micro'); } },
    { sfx: 'creak' }, { flag: 'note_recorded' },
    { shot: 'CAM', pos: [-10.25, 1.9, 3.5], look: [-12.7, 1.72, 3.1], fov: 40 },
    { wait: 0.5 },
    { move: 'chase', to: DOORWAY },
    { act: [['chase', 'give', { dur: 3.5 }]] },
    slow('chase', 'Give it to us. After. We won\'t know who you are.'),
    { do: (c) => hand(c, 'rue19', 'micro') },
    say('rue19', 'You\'ll know who I am. I\'m on mugs.'),
    // He puts the tape in his breast pocket, like it's nothing.
    { act: [['rue19', 'lanyard', { dur: 1.2, loop: false, still: true }]] },
    { wait: 0.8 }, { do: (c) => drop(c, 'rue19') }, { flag: 'tape_with_rue' }, { wait: 0.6 },
    // [WIDE · the basement lab, 3 am] One green screen lit. Luka asleep on the floor, Declan asleep at his bench.
    { fade: 'out', dur: 0.6 },
    { do: (c) => lamp(c, false) },
    { despawn: 'rue19' },
    { set: 'lab', env: 'night' },
    { env: LAB_NIGHT },
    { do: labDress },
    { title: '3:00 am' },
    LAB_WIDE,
    { fade: 'in', dur: 0.8 },
    { wait: 2.2 },
  ];

  CUTSCENES['3.3_green'] = [
    { do: phones(true) },
    { do: onFace },
    // [CLOSE · Chase, lit green, in headphones] The cassette recorder feeds his Samples into the computer.
    GREEN,
    seat('chase', 0.48, 'tap'),
    { wait: 1.6 },
    { sfx: 'clunk', vol: 0.4 }, { sfx: 'beep', vol: 0.3 },
    { wait: 1.0 },
  ];

  // He presses record on a blank cassette, then play: the track plays all the way through to an ending
  // (eight bars, then the D chord, the bass and, if he recorded it, the bell). One shot: a very slow push on the recorder.
  async function playSong(c) {
    if (c.flow.skipping) return;
    let ended = false;
    const h = c.AUDIO && c.AUDIO.song ? c.AUDIO.song(state.pattern, { samples: state.samples, bars: 8, ending: true, onEnd: () => { ended = true; } }) : null;
    const hit = SONG + (state.samples.includes('trill') ? SONG / 8 : 0), t0 = clock.t, r0 = performance.now();
    c.cam.shot({ shot: 'CAM', pos: REC.from, look: REC.at, fov: REC.fov, to: { pos: [-3.17, 1.16, 12.15], look: REC.at, fov: 30 }, dur: hit + 2.5, ease: 'linear' });
    await waitUntil(() => ended || c.flow.skipping || clock.t - t0 >= hit + 2.2 || (TEST.auto && clock.t - t0 >= 4));
    // the last chord rings on under the next shot; cut only when the ending never played (skip, NO held, autoplay)
    if (!ended && h && (performance.now() - r0) / 1000 < hit + 0.3) h.stop();
  }

  CUTSCENES['3.3_finished'] = [
    // [INSERT] He presses record on a blank cassette, then play.
    { do: onRec },
    REC,
    { act: [['chase', 'tap']] },
    { wait: 0.6 }, { sfx: 'clunk', vol: 0.6 }, { wait: 0.7 }, { sfx: 'clunk', vol: 0.5, rate: 1.2 },
    { act: [['chase', 'sit', { h: 0.48 }]] },
    { do: playSong },
    // [CLOSE · Chase] He takes the headphones off and just sits there.
    { do: onFace },
    GREEN,
    { act: [['chase', 'hands_head', { dur: 0.9, loop: false }]] },
    { wait: 0.8 }, { do: phones(false) },
    { act: [['chase', 'sit', { h: 0.48 }]] },
    { wait: 1.6 },
    slow('chase', '…It\'s finished.'), { flag: 'song_finished' },
    // [INSERT] Felt-tip on the cassette label: PUDDING.
    { act: [['chase', 'write']] },
    { shot: 'INSERT', at: [-3.3, 0.8, 11.55], from: [-2.95, 1.32, 11.9], fov: 34, card: ['label', { text: 'PUDDING' }] },
    { sfx: 'tick', vol: 0.3 }, { wait: 0.4 }, { sfx: 'tick', vol: 0.25 }, { wait: 1.6 },
    // Luka and Declan stir. Chase puts the dead prepaid display phone on Declan's bench, with the Bug List folded underneath.
    { shot: 'CAM', pos: [2.0, 2.3, 7.9], look: [3.2, 0.5, 12.0], fov: 62 },
    { act: [['chase', 'stand', { h: 0.48 }]] },
    { do: (c) => { const l = actor(c, 'luka'); if (l) { l.setExpr('neutral'); l.rig.face.eyes('half'); l.rotY += 0.25; } } },
    { wait: 0.9 },
    { act: [['declan', 'sit', { h: 0.48 }]] }, { expr: [['declan', 'neutral']] },
    { wait: 1.0 },
    { place: 'chase', at: 'declan_across' },
    { do: (c) => { const p = c.world.prop('prepaid_phone'), l = c.world.prop('bug_list'); if (l) { l.visible = true; l.position.set(BENCH_PHONE[0] + 0.01, 0.761, BENCH_PHONE[2] + 0.02); l.rotation.y = 0.3; l.scale.set(0.62, 1, 0.5); } if (p) { p.visible = true; p.position.set(...BENCH_PHONE); p.rotation.y = 0.5; } } },
    { act: [['chase', 'give', { dur: 1.2 }]] },
    { shot: 'INSERT', at: BENCH_PHONE, from: [6.62, 1.38, 11.5], fov: 34 },
    { sfx: 'clunk', vol: 0.25 },
    { wait: 1.3 },
    // [TWO-SHOT · Chase and Declan across the bench]
    { shot: 'CAM', pos: [6.4, 1.45, 8.9], look: [6.45, 1.25, 11.05], fov: 45 },
    say('chase', 'It\'s cooked. Keep it. Maybe you can work out what went wrong with it.'),
    say('luka', 'And that list is every problem it\'s ever going to have.'),   // (from the floor, half asleep)
    say('declan', 'Like a spec?'),
    say('luka', '…Sure. Like a spec.'),
    // [INSERT · held] Declan's hands around the phone and the list, lit green.
    { act: [['declan', 'type']] },
    { do: (c) => lamp(c, true, [5.95, 1.55, 11.55], [6.12, 0.76, 11.04], 0x62ff7a, 1.2, 0.55) },
    { shot: 'INSERT', at: [6.1, 0.8, 11.04], from: [6.62, 1.36, 11.62], fov: 36 },
    { flag: 'prepaid_left_with_declan' },
    { wait: 1.2 },
    slow('declan', 'I will.'),
    { wait: 1.2 },
    { do: (c) => lamp(c, false) },
  ];

  // =================================================================== 3.4 — "Opt Us In"
  // The walk: from the lab door, north of the Campanile, to the lodge. Everyone whose name Luka learned waves as they pass.
  const WAVERS = [['Mick', 'mick', [8.8, 0, 5.2, -0.6]], ['Nuala', 'nuala', [3.6, 0, 5.0, 0]], ['Siobhán', 'siobhan', [-2.2, 0, 4.9, 0.2]],
    ['Ronan', 'ronan', [-6.8, 0, 4.1, 0.4]], ['Fiachra', 'fiachra', [-11.2, 0, 2.0, 0.6]], ['Hartigan', 'hartigan', [-15.4, 0, -0.9, 0.9]]];
  // The lodge: Rue in the middle with the brick phone, Des, Bernie and Declan in the doorway, the machine wired to Des's phone.
  const RUE = [-22.05, 0.46, 4.0, 0.15], LUKA = [-22.15, 0.46, 4.95, PI], LUKA_ON = [-22.12, 0.46, 4.66, PI], CHASE = [-22.95, 0.46, 4.55, 2.1], LUKA_BACK = [-22.7, 0.46, 5.1, 2.6];
  const MACHINE = [-20.92, 1.25, 5.5], CHASE_M = [-21.3, 0.46, 5.98, 2.5], LUKA_M = [-21.24, 0.46, 5.0, 0.6];
  const DOOR_GROUP = { des: [-21.3, 0.46, 2.72, -0.35], bernie: [-21.85, 0.46, 3.22, -0.15], declan: [-21.08, 0.46, 3.45, -0.55] };
  const LODGE_WIDE = { shot: 'CAM', pos: [-24.85, 2.7, 3.3], look: [-21.6, 1.2, 5.3], fov: 60 };
  const OVERCAST = Object.assign({}, SETS.square.env.sunday, { rain: 0 });   // the rain has stopped; the sun isn't out yet
  const BELL = { vol: 0.55 };
  const DIALING = { shot: 'CAM', pos: [-22.4, 2.0, 6.7], look: [-21.1, 1.35, 5.5], fov: 50 };
  const PUD = { shot: 'CAM', pos: [-23.0, 1.95, 3.5], look: [-22.42, 1.62, 4.32], fov: 38 };   // [CLOSE · Chase's hand] across, between him and Rue
  const HANDS = { shot: 'CAM', pos: [-22.05, 2.2, 5.46], look: [-20.95, 1.3, 5.48], fov: 40 };   // [TWO-SHOT · tight, their hands side by side on the machine]

  function squareDress(c) {
    const P = (n) => c.world.prop(n);
    const m = P('machine'); if (m) { m.visible = true; m.position.set(...MACHINE); m.rotation.set(0, -0.3, 0); }
    for (const [n, v] of [['machine_wrap', false], ['machine_wire', true], ['swivel_chair', false], ['yes_sign', false], ['lodge_light', true], ['bike', false], ['bike_chain', false], ['machine_prepaid', false]]) { const o = P(n); if (o) o.visible = v; }
    const cd = P('cupboard_door'); if (cd) cd.rotation.y = 0;
    const b = P('bell'); if (b) b.userData.ring = false;
    lanyardHome(c);
    for (const [id, at] of Object.entries(DOOR_GROUP)) c.world.spawn(id, at);
    c.world.spawn('rue19', RUE);
    for (const [n, id, at] of WAVERS) if (state.names.includes(n)) c.world.spawn(id, at);
    const l = actor(c, 'luka'); if (l) l.mood = null;
    c.world.env(OVERCAST, 0);
    watch(c);
  }
  // Wavers: when the player comes within 6 m, they turn and wave.
  function waves(c) {
    const list = [];
    for (let i = 0; i < WAVERS.length; i++) { const a = actor(c, WAVERS[i][1]); if (a) list.push(a); }
    const done = list.map(() => false);
    const f = () => {
      if (flow.sceneId !== '3.4' || state.flags.at_lodge) { removeUpdate(f); return; }
      const p = player.actor;
      if (!p) return;
      for (let i = 0; i < list.length; i++) {
        const a = list[i], dx = a.pos.x - p.pos.x, dz = a.pos.z - p.pos.z;
        if (!done[i] && dx * dx + dz * dz < 36) { done[i] = true; a.face(p.id, 0.5); a.play('wave', { dur: 3.2, loop: false }); }
      }
    };
    addUpdate(f);
  }
  // The Campanile bell, once per swing, until the scene ends.
  const RING = { t: 0, on: false };
  function ringTick(dt) {
    if (!RING.on || flow.sceneId !== '3.4') { RING.on = false; removeUpdate(ringTick); return; }
    if ((RING.t -= dt) <= 0) { RING.t = 2.33; sfx('bell', BELL); }
  }
  function ring(c, on) {
    const b = c.world.prop('bell'); if (b) b.userData.ring = on;
    RING.on = on; RING.t = 0;
    removeUpdate(ringTick); if (on && !c.flow.skipping) addUpdate(ringTick);
  }
  // STORAGE FULL, again: the same pop-up, but its NO is greyed out (drawn inert: YES here is the final YES, held).
  function storage(c) {
    const p = c.popup({ msg: 'STORAGE FULL. To complete this call, the following will be cleared: 21 days, 0 hours, 0 minutes. Continue?',
      title: 'STORAGE FULL', icon: 'warn', buttons: [], cls: 'big', at: [0.5, 0.43] });
    const row = p.el.querySelector('.jv-btns');
    if (!row) return;
    for (const t of ['YES', 'NO']) { const b = document.createElement('span'); b.className = 'jv-b'; b.textContent = t; if (t === 'NO') b.style.cssText = 'opacity:.4;filter:grayscale(1);background:#9aa0aa;border-color:#8a9099'; row.append(b); }
  }
  // [JARVIS-CAM] 3.2's framing: from behind the machine's screen, the lens widened until both faces fit (as the engine does for an anchor)
  const JF = new THREE.Vector3(-20.6, 1.52, 5.49), JL = new THREE.Vector3(), JD = new THREE.Vector3(), JE = new THREE.Vector3(), JH = [new THREE.Vector3(), new THREE.Vector3()];
  function jarvisCam(c) {
    if (c.flow.skipping) return;
    let n = 0; JL.set(0, 0, 0);
    for (const id of ['chase', 'luka']) { const a = actor(c, id); if (a) { a.headPos(JH[n]); JL.add(JH[n++]); } }
    if (!n) JL.set(-21.28, 2.13, 5.49); else JL.divideScalar(n);
    JL.y -= 0.05; JD.subVectors(JL, JF).normalize();
    let ang = 0; for (let i = 0; i < n; i++) ang = Math.max(ang, JD.angleTo(JE.subVectors(JH[i], JF)));
    const el = renderer.domElement, vf = 2 * Math.atan(Math.tan(ang + 0.14) / (el.clientWidth / Math.max(1, el.clientHeight))) * 180 / PI;
    c.cam.shot({ shot: 'JARVIS', at: JL.toArray(), from: JF.toArray(), fov: Math.min(70, Math.max(56, vf)) });
  }
  // the Walkman tape into Des's bin
  function binDrop(c) {
    const t = prop(c, 'winning');
    t.position.set(-21.52, 1.35, 4.45); t.rotation.set(0.4, 0.8, 0.2);
    tween(c, 0.5, (k) => { t.position.y = 1.35 - 0.47 * k * k; t.rotation.x = 0.4 + 1.1 * k; });   // lands on the rubbish in the bin
  }

  SCENES['3.4'] = {
    title: 'Opt Us In', set: 'square', env: 'sun', time: 'Tue 27 Oct 1987, 11:50',
    playable: ['chase'], swap: false, hud: { battery: 4, bars: 4 }, music: 'dublin_major',
    spawn: { chase: [13.9, 0, 13.4, -2.5], luka: [14.8, 0, 13.6, -2.5] },
    hotspots: [
      { id: 'lodge', at: 'lodge_out', r: 1.3, verb: 'Go in', once: true, flag: 'at_lodge',
        steps: [{ sfx: 'creak' }, { fade: 'out', dur: 0.45 }] },
    ],
    steps: [
      ['do', squareDress],
      ['cutscene', '3.4_crane'],
      ['control', 'chase'], ['follow', 'luka'],
      ['objective', 'Say goodbye.'],
      ['do', waves],
      ['roam', { until: 'at_lodge', auto: (c) => c.hotspots.trigger('lodge') }],
      ['cam', 'fixed', DIALING],   // (behind the fade) each cutscene below ends on the angle its minigame then sits on
      ['cutscene', '3.4_goodbye'],
      ['minigame', 'dial', { mode: 'final' }],
      ['objective', null],         // (the final YES montage is full screen: no HUD line over it)
      ['cam', 'fixed', HANDS],
      ['cutscene', '3.4_storage'],
      ['minigame', 'final_yes', {}],
      ['cutscene', '3.4_ring'],
    ],
    grants: { flags: { at_lodge: true, lanyard_given: true, pudding_given: true, optus_named: true, called_home: true }, removeItems: ['lanyard', 'badge'], battery: 4, bars: 4 },
  };

  CUTSCENES['3.4_crane'] = [
    // [CRANE · down from the sky] The rain has stopped for the first time in three weeks. Sun breaks over the Campanile,
    // and warm light floods Front Square: the first in 1987.
    { shot: 'CAM', pos: [3, 44, 18], look: [0, 9, 0], fov: 45, to: { pos: [-7.5, 4.2, 10.5], look: [0, 8.2, 0], fov: 50 }, dur: 6.5, ease: 'in' },
    { env: 'sun', dur: 6 },
    { wait: 6.5 },
    { move: 'chase', to: [12.4, 0, 11.6], nowait: true }, { move: 'luka', to: [13.3, 0, 12.2], nowait: true },
    { shot: 'CAM', pos: [-7.5, 4.2, 10.5], look: [0, 8.2, 0], fov: 50, to: { pos: [8.2, 2.1, 7.0], look: [13.2, 1.3, 12.3], fov: 48 }, dur: 4, ease: 'out' },
    { wait: 4 },
  ];

  CUTSCENES['3.4_goodbye'] = [
    { music: null, fade: 2.5 },
    { place: 'rue19', at: RUE }, { place: 'luka', at: LUKA }, { place: 'chase', at: CHASE },
    { do: (c) => { for (const [id, at] of Object.entries(DOOR_GROUP)) { const a = actor(c, id); if (a) { a.place(at); a.face('rue19', 0); } } const r = actor(c, 'rue19'); if (r && r.rig.attach.brick) r.rig.attach.brick.visible = true; } },
    { prop: 'lodge_door', rotY: 1.6 },
    // [WIDE · the crowded lodge] Des, Bernie and Declan in the doorway. The machine wired into Des's phone line. Rue holding the brick phone.
    LODGE_WIDE,
    { fade: 'in', dur: 0.6 },
    { wait: 0.6 },
    say('des', 'Yous\'ll be back?'),
    { face: 'luka', to: 'des' },
    slow('luka', 'Not the way you mean.'),
    { act: [['des', 'nod', { dur: 0.9 }]] },
    say('des', 'Tea for the road?'),
    slow('luka', 'Always.'),
    { face: 'luka', to: 'rue19' },
    // [CLOSE · Luka's hands] He takes off his lanyard and holds it for a second.
    { shot: 'CAM', pos: [-22.88, 2.15, 4.4], look: [-22.15, 1.62, 4.62], fov: 42 },
    { wait: 0.3 },
    { do: lanyardOff },
    { wait: 2.6 },
    // [MID · from behind Rue, Luka facing camera, slightly from below] He puts it over Rue's head.
    { shot: 'CAM', pos: [-22.42, 1.78, 3.3], look: [-22.12, 2.06, 4.66], fov: 44 },
    { move: 'luka', to: LUKA_ON },
    { do: lanyardOn },
    { wait: 2.2 },
    { act: [['luka', 'idle']] }, { flag: 'lanyard_given' }, { item: 'lanyard', remove: true }, { item: 'badge', remove: true },
    say('rue19', 'What\'s this for?'),
    slow('luka', 'So you don\'t forget our names.'),
    { act: [['rue19', 'look_down', { dur: 1.2, loop: false }]] },
    say('rue19', 'It\'s only got one name on it.'),
    say('luka', 'His never came.'),
    say('chase', 'EIGHT MONTHS.'),
    { act: [['rue19', 'lanyard', { still: true }]] },   // (touching the badge)
    slow('rue19', 'I\'ll remember his.'),
    { act: [['rue19', 'idle']] },
    { move: 'luka', to: LUKA_BACK, nowait: true },
    // [CLOSE · Chase's hand] He holds out a cassette. PUDDING, in felt-tip. (the label card on the first line; one frame for all five)
    { face: 'rue19', to: 'chase' },
    { do: (c) => hand(c, 'chase', 'pudding') },
    { act: [['chase', 'give', { dur: 9 }]] },
    Object.assign({ card: ['label', { text: 'PUDDING' }] }, PUD),
    slow('chase', 'For the quiet bits.'),
    PUD,
    say('rue19', 'What\'s Pudding?'),
    say('chase', 'Me.'),
    say('rue19', 'Why Pudding?'),
    say('chase', 'Long story.'),
    // [INSERT] Rue ejects "Winning Is a Decision" from his Walkman, drops it in Des's bin and slots in PUDDING.
    { act: [['rue19', 'tap']] },
    { shot: 'INSERT', at: 'rue19', card: ['tape', { text: 'Winning Is a Decision' }] },
    { do: (c) => hand(c, 'rue19', 'pudding') }, { flag: 'pudding_given' }, { act: [['chase', 'idle']] },   // (the tape changes hands under the cut)
    { sfx: 'cassette_eject' }, { wait: 1.4 },
    { shot: 'INSERT', at: [-21.5, 0.8, 4.45], from: [-21.95, 1.45, 5.1], fov: 45 },
    { wait: 0.3 }, { do: binDrop }, { wait: 0.5 }, { sfx: 'thud', vol: 0.35 }, { wait: 0.9 },
    { shot: 'INSERT', at: 'rue19', card: ['label', { text: 'PUDDING' }] },
    { sfx: 'clunk', vol: 0.6 }, { wait: 1.2 },
    { do: (c) => drop(c, 'rue19') }, { act: [['rue19', 'idle']] },
    // [INSERT] The lodge clock: 11:55.
    { shot: 'INSERT', at: 'lodge_clock', card: ['clock', { time: '11:55' }] },
    { wait: 1.8 },
    // [MID · Rue, eye level, with Des, Bernie and Declan behind him in the doorway] He's framed with people now.
    { face: 'rue19', to: [-22.5, 5.2] },
    { shot: 'CAM', pos: [-21.72, 2.1, 5.5], look: [-22.0, 2.0, 4.0], fov: 46 },
    slow('rue19', 'So. Whatever I end up doing. A company, whatever it is. I don\'t want it full of people like me. ^ I want it full of people like yous. People who\'d burn their way home to find some eejit under a bell tower.'),
    // [CLOSE · Chase]
    { shot: 'CAM', pos: [-22.55, 2.05, 3.72], look: [-22.95, 2.1, 4.55], fov: 40 },
    say('chase', 'Then opt us in.'),
    say('rue19', 'What?'),
    say('luka', 'Future thing. When you sign someone up, you ask if they want to opt in.'),
    say('chase', 'Opt us in, Rue.'),
    // [CLOSE · Rue, slow push-in]
    { shot: 'CLOSE', on: 'rue19', move: 'push', amount: 0.75, dur: 10 },
    slow('rue19', 'Opt… us… in. ^ Optus.', { auto: 0.5 }),
    { do: (c) => { const a = actor(c, 'rue19'); if (a) { a.setExpr('neutral'); a.rig.face.mouth('smile'); } } },   // (beat) the first real smile he's had all game
    { wait: 0.8 },
    slow('rue19', '…I like the sound of that.'), { flag: 'optus_named' },
    // [TWO-SHOT · locked] A stare, 2 seconds. Luka and Chase turn to each other. Behind them, Des sips his tea.
    { shot: 'CAM', pos: [-24.8, 2.0, 5.7], look: [-22.6, 1.85, 4.55], fov: 42 },
    { face: 'luka', to: 'chase' }, { face: 'chase', to: 'luka' },
    { act: [['des', 'drink']] },
    { stare: 2 },
    say('chase', 'Don\'t.'),
    say('luka', 'I\'m not saying anything.'),
    // 11:57. Chase dials the brick phone's number and the date: 20/10/2026, 11:58. The machine hums.
    { act: [['des', 'idle']] },
    { move: 'chase', to: CHASE_M, nowait: true }, { move: 'luka', to: LUKA_M },
    { face: 'chase', to: [MACHINE[0], MACHINE[2]] }, { face: 'luka', to: [MACHINE[0], MACHINE[2]] },
    { act: [['chase', 'type']] },
    DIALING,
    { wait: 0.6 },
  ];

  CUTSCENES['3.4_storage'] = [
    { act: [['chase', 'idle']] },
    // [JARVIS-CAM] The pop-up again: "STORAGE FULL. To complete this call, the following will be cleared: 21 days, 0 hours, 0 minutes. Continue? [YES] [NO]". This time NO is greyed out.
    { do: jarvisCam },   // (behind the machine's screen, out at both faces)
    { do: storage },
    { wait: 2.6 },
    // [TWO-SHOT · tight, their hands side by side on the machine]
    { act: [['luka', 'type'], ['chase', 'type']] },
    { popup: null, clear: true },
    HANDS,
    slow('luka', 'Together?'),
    slow('chase', 'Together.'),
  ];

  CUTSCENES['3.4_ring'] = [
    // [ECU · the speaker grille] The double trill. The operator. A silence on the line thirty-nine years long.
    { shot: 'INSERT', at: [MACHINE[0], 1.42, MACHINE[2]], from: [-21.18, 1.5, 5.4], fov: 28 },
    { wait: 0.9 },
    { sfx: 'trill' },
    { wait: 2.2 },
    say('operator', 'You have a reverse-charge call from Chase and Luka, Optus Redcliffe. Will you accept the charges?'),
    { flag: 'called_home' },
    { wait: 3 },
    // [WIDE] White fills the lodge.
    LODGE_WIDE,
    { sfx: 'flash_hum' },
    { fade: 'out', dur: 1.3, color: '#fff' },
    { despawn: 'luka' }, { despawn: 'chase' }, { prop: 'machine', visible: false }, { prop: 'machine_wire', visible: false },
    { wait: 0.5 },
    // [WIDE · Front Square] The lodge window glows and goes dark. 12:00. The Campanile bell begins to ring.
    { shot: 'CAM', pos: [-10.5, 2.0, 8.2], look: [-20.3, 2.2, 5.0], fov: 40 },
    { do: (c) => lamp(c, true, [-20.7, 2.9, 5.0], [-25.0, 1.2, 4.8], 0xfff8e8, 40, 1.2) },   // the lodge lit white from inside
    { fade: 'in', dur: 0.4 },
    { wait: 0.9 },
    { do: (c) => { tween(c, 1.4, (k) => { const s = c.world.torch; if (s) s.intensity = 40 * (1 - k); }); } },
    { prop: 'lodge_light', visible: false },
    { wait: 1.6 },
    { do: (c) => lamp(c, false) },
    { do: (c) => ring(c, true) },
    { wait: 2.4 },
    // [TRACK · alongside Rue] He walks into the square with the lanyard round his neck and presses play on the Walkman.
    // The score becomes Chase's song, with the real bell ringing along with it.
    { do: (c) => { const r = actor(c, 'rue19'); if (r) { r.walkAnim = 'walk'; if (r.rig.attach.brick) r.rig.attach.brick.visible = false; r.setExpr('neutral'); } } },
    { place: 'rue19', at: [-13.2, 0, 0.9, H] },
    { place: 'des', at: [-20.4, 0, 1.1, 1.75] },
    { shot: 'MID', on: 'rue19', move: 'track', track: 'alongside', side: 'right', dist: 2.6, dur: 9 },
    { move: 'rue19', to: [-4.6, 0, 0.25], nowait: true },
    { wait: 1.2 },
    { act: [['rue19', 'tap', { dur: 1.1, loop: false }]] },
    { wait: 0.5 },
    { music: 'pudding_walkman', fade: 0.6 },
    { wait: 4.2 },
    // [LOW · from the cobbles] Rue stops directly under the Campanile. Above him, the bell swings.
    { shot: 'CAM', pos: [-7.5, 0.4, 2.2], look: [0, 4.6, 0], fov: 60 },
    { move: 'rue19', to: 'under_bell' },
    { face: 'rue19', to: 2.2 },
    { wait: 1.0 },
    say('des', 'You\'ll fail your exams.', { tag: 'off' }),   // (from the lodge door)
    // [CLOSE · Rue, eyes closed, sun on his face]
    { act: [['rue19', 'look_up']] },
    { do: (c) => { const a = actor(c, 'rue19'); if (a) { a.rig.face.eyes('closed'); a.rig.face.mouth('smile'); } } },
    { shot: 'CLOSE', on: 'rue19', angle: 'low' },
    { wait: 0.8 },
    slow('rue19', 'Let it ring.'),
    { wait: 0.6 },
    // [CRANE · up and up] From Rue, to the bell, to the whole square in the sun. The Pudding song carries on over the cut.
    { shot: 'CAM', pos: [0.5, 1.75, -5.4], look: [0, 1.9, 0], fov: 45, to: { pos: [0.6, 10.4, -8.6], look: [0, 10.1, 0], fov: 45 }, dur: 6, ease: 'in' },
    { wait: 6 },
    { shot: 'CAM', pos: [0.6, 10.4, -8.6], look: [0, 10.1, 0], fov: 45, to: { pos: [16, 42, -30], look: [0, 1, 0], fov: 50 }, dur: 8, ease: 'out' },
    { wait: 8 },
    // (the song keeps playing into 3.5; the bell and the borrowed lanyard go back where they belong)
    { do: (c) => { ring(c, false); lanyardHome(c); } },
  ];
})();
