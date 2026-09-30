// ============================================================ CONTENT: Epilogue "Restart", Credits, Post-credits "The Original Spec"
// SPEC §13. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
(() => {
  const PI = Math.PI, H = PI / 2;
  const say = (id, text, o) => Object.assign({ say: id, text }, o);
  const slow = (id, text, o) => say(id, text, Object.assign({ speed: 'slow' }, o));
  const actor = (c, id) => c.world.actor(id);
  const O = (x) => 60 + x;   // jarvis_hq: the office upstairs sits at x 55..65

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
  // The flow gives every set its own ambience on load; these shots want something else (rain inside, silence in the sun).
  const amb = (rain, loops = []) => ({ do: (c) => { if (c.AUDIO && c.AUDIO.ambience) c.AUDIO.ambience({ rain, loops }); } });
  const face = (id, fn) => ({ do: (c) => { const a = actor(c, id); if (a) fn(a.rig.face, a); } });
  // 'reading' holds both hands up in front of the chest; it shows the rig's textbook, so that shrinks away for the scene
  function noBook(a, on) { const b = a && a.rig.attach.textbook; if (b) b.scale.setScalar(on ? 1e-4 : 1); }
  // sit, then an upper-body anim on top (the rig only keeps a seated lower body once `seated` is set)
  function seat(a, anim, h = 0.46) { if (!a) return; a.play('sit', { h }); a.rig.seated = true; if (anim) a.play(anim, { h }); }

  // ---------------------------------------------------------- Chase's lanyard: his rig's own mesh, hidden for eight months
  const LY = { rig: null, mesh: null };
  function lanyard(c) {
    const a = actor(c, 'chase');
    if (a && LY.rig !== a.rig) { LY.rig = a.rig; LY.mesh = a.rig.attach.lanyard || a.rig.root.getObjectByName('lanyard'); }
    return a ? LY.mesh : null;
  }
  function lanyardHome(visible) {
    const m = LY.mesh, r = LY.rig;
    if (!m || !r) return;
    r.parts.torso.add(m); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.visible = visible; r.attach.lanyard = m;
  }
  // out of the parcel: held in front of him in both hands
  function lanyardHeld(c) {
    const m = lanyard(c), a = actor(c, 'chase');
    if (!m) return;
    delete LY.rig.attach.lanyard;                           // no anim toggles it while it's in his hands
    const d = LY.rig.d;
    m.position.set(0, 0.3 - d.T, (d.chestZ || 0.12) + 0.14); m.rotation.set(0.5, 0, 0); m.visible = true;
    noBook(a, true); a.play('reading');
  }
  // over his head and onto his chest
  function lanyardOn(c) {
    const m = lanyard(c), a = actor(c, 'chase');
    if (!m) return;
    const d = LY.rig.d, y0 = 0.3 - d.T, z0 = (d.chestZ || 0.12) + 0.14;
    a.play('lanyard_on', { dur: 2 });
    tween(c, 1.9, (k) => {
      const u = Math.min(1, k / 0.45), v = Math.max(0, (k - 0.45) / 0.55);
      m.position.set(0, k < 0.45 ? y0 + (0.42 - y0) * u : 0.42 * (1 - v), k < 0.45 ? z0 + (0.05 - z0) * u : 0.05 * (1 - v));
      m.rotation.x = 0.5 * (1 - Math.min(1, k * 1.6));
      if (k >= 1) LY.rig.attach.lanyard = m;
    });
  }

  // Leaving the epilogue (credits, quit, scene select): the pooled rigs and the office desk go back as they were.
  let watching = false;
  function watch() {
    if (watching) return;
    watching = true;
    const u = () => {
      if (flow.sceneId === 'E') return;
      removeUpdate(u); watching = false;
      lanyardHome(false);
      if (LY.rig) LY.rig.attach.textbook && LY.rig.attach.textbook.scale.setScalar(1);
      rueLanyard(null, false);
      world.liveMax = 2;
      const ph = world.prop('brick_phone'), pol = world.prop('polaroid'), b = world.prop('bell');
      if (ph) { ph.visible = true; ph.userData.ring = false; }
      if (pol) pol.visible = true;
      if (b) b.userData.ring = false;
    };
    addUpdate(u);
  }

  // JARVIS Sale reprise: frantic until JARVIS crashes, then only the restart chime and the taps. (The crash sets
  // seen_restarts again, so it doubles as the signal.)
  function cutOnCrash() {
    delete state.flags.seen_restarts;
    const f = () => {
      if (flow.sceneId !== 'E') { removeUpdate(f); state.flags.seen_restarts = true; return; }
      if (state.flags.seen_restarts) { removeUpdate(f); music(null, { fade: 0.4 }); }
    };
    addUpdate(f);
  }

  // [TOP-DOWN] His hands rise toward his head, stop halfway, and he laughs instead.
  function handsUp(c) { const a = actor(c, 'chase'); if (!a) return; noBook(a, true); a.play('reading'); a.setExpr('stunned'); }
  function laugh(c) {
    const a = actor(c, 'chase'); if (!a) return;
    a.play('laugh'); a.setExpr('laugh');
  }
  // He taps the rhythm of the restart chime (three rising notes, 0.2 s apart) on the counter: with it, then on his own.
  async function tapChime(c) {
    const a = actor(c, 'chase');
    if (a) a.play('tap');
    for (let bar = 0; bar < 2 && !c.flow.skipping; bar++) {
      if (!bar) c.sfx('restart_chime');
      for (let i = 0; i < 3; i++) { c.sfx('knock', { vol: 0.45 }); await c.wait(0.2); }
      await c.wait(bar ? 0.3 : 1.2);
    }
    if (a) { a.play('idle'); a.setExpr('neutral'); }
  }
  // "Luka puts a hand on his shoulder": turned in toward him, the arm out and resting (the give pose, held).
  function shoulder(c) {
    const l = actor(c, 'luka'), ch = actor(c, 'chase');
    if (!l || !ch) return;
    l.face(-1.3, 0.4);
    c.wait(0.3).then(() => l.play('give', { dur: 5.5 }));
  }

  // the match cuts: the same CLOSE, low, on whoever tilts his face up
  const SAME = (id) => ({ shot: 'CLOSE', on: id, angle: 'low' });
  // Rue at his desk: the same lens by hand (0.8 m out and 0.37 m under his eyes; a computed close swings off the desk)
  const SAME_DESK = { shot: 'CAM', pos: [0.1, 1.0, -1.5], look: [0, 1.33, -2.32], fov: 40 };
  // As in 3.4, Rue under the bell wears Luka's lanyard: a copy of Luka's mesh fitted to him the way 3.4 fits it
  // (Luka stays on the live store set meanwhile); taken off again back in the store.
  const RL = { m: null };
  function rueLanyard(c, on) {
    if (RL.m) { RL.m.removeFromParent(); RL.m = null; }
    const l = on && actor(c, 'luka'), r = on && actor(c, 'rue19'), src = l && l.rig.attach.lanyard;
    if (!r || !src) return;
    const dl = l.rig.d, dr = r.rig.d, m = RL.m = src.clone();
    m.position.set(0, dr.T - dl.T, 0); m.rotation.set(0, 0, 0); m.visible = true;
    m.scale.set(dr.nr / dl.nr, 1, (dr.chestZ || 0.12) / (dl.chestZ || 0.12));
    r.rig.parts.torso.add(m);
  }
  function squareUp(c) {
    if (c.AUDIO && c.AUDIO.ambience) c.AUDIO.ambience({ rain: false, loops: [] });   // the first sun in three weeks
    const b = c.world.prop('bell'); if (b) b.userData.ring = true;
    if (!c.flow.skipping) c.sfx('bell', { vol: 0.6 });
    const r = actor(c, 'rue19');
    if (!r) return;
    rueLanyard(c, true);
    r.face(2.2, 0); r.play('look_up');
    r.rig.face.eyes('closed'); r.rig.face.mouth('smile');
  }
  function officeUp(c) {
    const pol = c.world.prop('polaroid'); if (pol) pol.visible = false;   // it went to Redcliffe in the box
    const ph = c.world.prop('brick_phone'); if (ph) { ph.visible = true; ph.userData.ring = false; }
    const r = actor(c, 'rue58');
    if (!r) return;
    seat(r, 'look_up', 0.48);
    r.rig.face.eyes('closed');
  }
  // the brick phone rings, a third time: LCD lit, the handset buzzing, the trill every 3 s (2.12's and 3.5's cadence)
  function ringThird(c) {
    const ph = c.world.prop('brick_phone');
    if (ph) ph.userData.ring = true;
    let n = 0;
    const f = (dt) => {   // the trill every 3 s until he answers
      if (!ph || !ph.userData.ring || flow.sceneId !== 'E' || c.flow.skipping) { removeUpdate(f); return; }
      if ((n -= dt) <= 0) { n = 3; sfx('brick_ring', { vol: 0.8 }); }
    };
    addUpdate(f);
  }
  function smileUp(c) { const r = actor(c, 'rue58'); if (r) { r.rig.face.eyes('open'); r.rig.face.mouth('smile'); } }
  async function answer(c) {
    const ph = c.world.prop('brick_phone'), r = actor(c, 'rue58');
    if (ph) { ph.userData.ring = false; ph.visible = false; }   // up off the desk, into his hand (the rig's own brick)
    if (r) { r.play('phone'); await c.wait(0.4); r.rig.face.mouth('smile'); }
  }
  // back in the store, under the cut: the boys shoulder to shoulder at Chase's monitor, rain on the glass
  function storeBack(c) {
    if (c.AUDIO && c.AUDIO.ambience) c.AUDIO.ambience({ rain: true, loops: ['aircon', 'fluoro'] });
    rueLanyard(c, false);
    const ph = c.world.prop('brick_phone'), pol = c.world.prop('polaroid'), b = c.world.prop('bell');   // (the office and the square are still live: leave them as found)
    if (ph) { ph.visible = true; ph.userData.ring = false; }
    if (pol) pol.visible = true;
    if (b) b.userData.ring = false;
    const m = c.world.prop('monitor_screen'); if (m) m.userData.show('app');
    for (const id of ['chase', 'luka']) { const a = actor(c, id); if (a) { a.play('idle'); a.setExpr('neutral'); } }
  }
  // [JARVIS-CAM] "JARVIS has encountered an error. Would you like to restart? [YES] [NO]" — the cursor hovers, then clicks YES.
  async function restartClick(c) {
    // it lands on the boys' faces: between their two heads, as the lens sees them
    const a = actor(c, 'chase'), b = actor(c, 'luka'), v = new THREE.Vector3(), w = new THREE.Vector3();
    let at = { actor: 'chase' };
    if (a && b) { const s = c.cam.project(a.headPos(v).add(b.headPos(w)).multiplyScalar(0.5)); at = [Math.min(0.9, Math.max(0.1, s.x / innerWidth)), Math.min(0.9, Math.max(0.1, s.y / innerHeight))]; }
    const p = c.popup({ msg: 'JARVIS has encountered an error. Would you like to restart?', icon: 'error', buttons: ['YES', 'NO'], at, shake: true });
    if (c.flow.skipping) { p.close(); return; }
    const yes = p.el.querySelector('.jv-b');
    const cur = document.createElement('div');
    cur.style.cssText = 'position:fixed;left:0;top:0;width:22px;height:30px;z-index:12;pointer-events:none;transition:transform 1.1s cubic-bezier(.3,.7,.3,1);' +
      'background:#fff;clip-path:polygon(0 0,0 80%,26% 62%,44% 100%,58% 94%,41% 58%,78% 58%);filter:drop-shadow(0 0 1.5px #000) drop-shadow(1px 2px 1px rgba(0,0,0,.5))';
    cur.style.transform = `translate(${innerWidth * 0.68}px,${innerHeight * 0.74}px)`;
    document.body.append(cur);
    await c.wait(0.4);                                                   // (the pop-up has landed)
    const r0 = yes && yes.getBoundingClientRect();
    if (!r0 || !r0.width) { cur.remove(); return; }                    // (already answered: YES pressed, or autoplay)
    const bx = r0.left + r0.width * 0.55, by = r0.top + r0.height * 0.55;
    cur.style.transform = `translate(${bx}px,${by}px)`;              // over YES…
    await c.wait(1.3);
    if (yes) yes.style.filter = 'brightness(1.18)';                     // …hovers…
    await c.wait(0.8);
    cur.style.transition = 'transform .08s'; cur.style.transform = `translate(${bx + 1}px,${by + 2}px) scale(.9)`;
    if (yes) yes.style.background = '#2459b3';                          // …clicks
    c.sfx('tick');
    await c.wait(0.25);
    cur.remove();
    if (yes) { yes.style.filter = ''; yes.style.background = ''; }
    p.close();
  }
  // TITLE: RUE — the big card fades in over the white; the white turns black behind it, so it fades out to black.
  const blackUnder = { do: async (c) => { await c.wait(1.2); c.ui.fade(1, 0, '#000'); } };
  // (the act card, with its name at the title screen's size: this is the title drop)
  const bigTitle = { do: async (c) => {
    const b = document.querySelector('#acard b');
    if (b) b.style.fontSize = 'min(24vh, 20vw)';
    await c.ui.actCard('RUE');
    if (b) b.style.fontSize = '';
  } };

  // A courier's parcel for Chase, opened: the lanyard with his name on the badge, and a handwritten note.
  CARDS.parcel = (cx, w, h) => {
    const HAND = '"Segoe Print", "Bradley Hand", "Marker Felt", "Chalkboard SE", "Comic Sans MS", cursive';
    cx.save(); cx.translate(w / 2, h / 2); cx.rotate(0.025);
    const bw = w * 0.74, bh = h * 0.72, fl = h * 0.12;
    cx.shadowColor = 'rgba(0,0,0,.4)'; cx.shadowBlur = 26; cx.shadowOffsetY = 10;
    cx.fillStyle = '#b98a50';                                            // the open flaps
    cx.beginPath(); cx.moveTo(-bw / 2, -bh / 2); cx.lineTo(-bw / 2 + 30, -bh / 2 - fl); cx.lineTo(bw / 2 - 30, -bh / 2 - fl); cx.lineTo(bw / 2, -bh / 2); cx.fill();
    cx.beginPath(); cx.moveTo(-bw / 2, bh / 2); cx.lineTo(-bw / 2 + 30, bh / 2 + fl); cx.lineTo(bw / 2 - 30, bh / 2 + fl); cx.lineTo(bw / 2, bh / 2); cx.fill();
    cx.fillStyle = '#c99a5b'; cx.fillRect(-bw / 2, -bh / 2, bw, bh);
    cx.shadowColor = 'transparent';
    cx.fillStyle = '#8f6636'; cx.fillRect(-bw / 2 + 16, -bh / 2 + 16, bw - 32, bh - 32);
    cx.fillStyle = '#efeae0'; cx.fillRect(-bw / 2 + 30, -bh / 2 + 30, bw - 60, bh - 60);   // tissue paper
    cx.strokeStyle = 'rgba(0,0,0,.06)'; cx.lineWidth = 3;
    for (let i = 0; i < 7; i++) { cx.beginPath(); cx.moveTo(-bw / 2 + 40 + i * 70, -bh / 2 + 34); cx.lineTo(-bw / 2 + 10 + i * 90, bh / 2 - 34); cx.stroke(); }
    cx.fillStyle = 'rgba(255,255,255,.8)'; cx.fillRect(bw / 2 - 150, -bh / 2 - fl + 14, 120, 40);   // courier label
    cx.fillStyle = '#222'; for (let i = 0; i < 9; i++) cx.fillRect(bw / 2 - 142 + i * 12, -bh / 2 - fl + 22, i % 3 ? 4 : 7, 24);
    cx.restore();
    cx.save(); cx.translate(w * 0.09, h * 0.13); cx.rotate(-0.09); cx.scale(0.66, 0.66);
    CARDS.badge(cx, 640, 520, { name: 'CHASE' });                      // the lanyard and the badge, new
    cx.restore();
    cx.save(); cx.translate(w * 0.69, h * 0.6); cx.rotate(0.07);         // the note
    cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 16; cx.shadowOffsetY = 6;
    cx.fillStyle = '#fbf6e6'; cx.fillRect(-165, -100, 330, 200); cx.shadowColor = 'transparent';
    cx.fillStyle = '#1d2f8f'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.font = `36px ${HAND}`; cx.fillText('Sorry for the wait.', 0, -22, 300);
    cx.font = `34px ${HAND}`; cx.fillText('— R.', 70, 44);
    cx.restore();
  };
  CARDS.parcel.size = [900, 640];

  // =================================================================== EPILOGUE — "Restart"
  // The reprise holds the 1.2 over-the-shoulder into the mini-game; the TOP-DOWN is 1.2's frame exactly.
  const into = (shot) => ({ do: (c) => { c.cam.shot(shot); c.cam.cutscene = false; } });
  const OTS_CHASE = { shot: 'CAM', pos: [5.0, 1.74, -10.58], look: [2.92, 1.35, -8.33], fov: 45 };
  const SLUMP = [4.2, 0, -9.8, -H];
  const TOP_DOWN = { shot: 'TOP', on: 'chase', dist: 1.5, offset: 0.25 };
  const MARGARET = { shot: 'CLOSE', on: 'margaret' };                 // her one kind eye level (1.2)
  const CARPARK = { shot: 'CAM', pos: [-3.2, 2.2, 22], look: [-2.0, 2.6, 1.0], fov: 45 };   // where 1.1's crane landed
  const DOORS = { shot: 'CAM', pos: [-0.4, 1.5, -3.8], look: [-1.9, 1.05, 6.0], fov: 48 };   // 1.2: from inside, out through the front window
  const COUNTER = { chase: [4.95, 0, -10.05, 0], luka: [5.6, 0, -10.05, 0] };   // shoulder to shoulder, between the two monitors

  function dressE(c) {
    watch();
    c.world.liveMax = 3;                                      // under the black: the match cuts are cuts, not loads
    c.world.preload('square'); c.world.preload('office');
    const P = (n) => c.world.prop(n);
    for (const n of ['parcel', 'margaret_phone']) { const o = P(n); if (o) o.visible = false; }
    const m = P('monitor_screen'); if (m) m.userData.show('app');
    if (lanyard(c)) lanyardHome(false);
    const ch = actor(c, 'chase'); if (ch) { noBook(ch, false); ch.setExpr('neutral'); }
    const l = actor(c, 'luka'); if (l) { l.mood = null; l.habit = null; }
  }

  SCENES.E = {
    title: 'Restart', set: 'reddy', env: 'rain', time: 'Fri 23 Oct 2026, 09:40',
    playable: ['chase'], swap: false, hud: null, music: 'reddy',
    spawn: { chase: 'window', luka: 'counter_luka', margaret: [0.9, 0, 17.0, PI], grandson: [1.6, 0, 17.4, PI] },
    steps: [
      ['cutscene', 'E_open'],
      ['control', 'chase'],
      ['objective', "Add Margaret's grandson to her plan."],
      ['do', cutOnCrash],
      ['minigame', 'jarvis_sale', { mode: 'reprise', cap: 25, time: '09:52', shot: OTS_CHASE }],
      ['objective', null],
      ['cutscene', 'E_end'],
    ],
    grants: { flags: { chase_lanyard: true }, battery: null, bars: null },
  };

  CUTSCENES.E_open = [
    { fade: 'out', dur: 0 },
    { do: dressE },
    amb(true, ['aircon', 'fluoro']),
    // [WIDE · the car-park angle from 1.1] Rain on the store windows: the first in weeks.
    CARPARK,
    { act: [['grandson', 'umbrella']] },
    { move: 'margaret', to: [0.4, 0, 11.5], speed: 1.0, nowait: true },
    { move: 'grandson', to: [1.1, 0, 11.9], speed: 1.0, nowait: true },
    { fade: 'in', dur: 0.8 },
    { wait: 3.6 },
    // [MID · Chase at the window]
    { face: 'chase', to: 0 },
    { shot: 'CAM', pos: [8.35, 1.6, 1.45], look: [7.4, 1.45, -0.9], fov: 40 },   // from out in the rain, through the wet glass
    { wait: 0.8 },
    slow('chase', 'Feels like home.'),                                 // (looking out)
    say('luka', "It's raining, mate."),
    { expr: [['chase', 'worried']] },                                  // (frowning)
    say('chase', 'Yeah. Dunno why I said that.'),
    // Margaret comes in with her grandson.
    { place: 'margaret', at: [-0.7, 0, 5.4, -2.7] }, { place: 'grandson', at: [0.0, 0, 5.7, -2.7] },
    DOORS,
    { move: 'margaret', to: [-2.3, 0, 1.4, PI], speed: 1.15, nowait: true },
    { move: 'grandson', to: [-1.55, 0, 1.6, PI], speed: 1.15 },
    { sfx: 'door_slide', vol: 0.6 },
    { move: 'margaret', to: [-2.2, 0, -0.9, PI], speed: 1.15, nowait: true },
    { move: 'grandson', to: [-1.5, 0, -0.6, PI], speed: 1.15 },
    { sfx: 'umbrella' }, { act: [['grandson', 'idle']] },
    // across the shop floor, by the window
    { place: 'chase', at: [6.2, 0, -1.9, -2.2] }, { place: 'margaret', at: [4.75, 0, -2.95, 0.95] }, { place: 'grandson', at: [4.1, 0, -2.2, 1.3] },
    { expr: [['chase', 'neutral']] },
    { shot: 'CAM', pos: [7.2, 1.45, -4.9], look: [5.48, 1.2, -2.43], fov: 40 },   // two-shot in profile, the wet glass behind
    say('margaret', "Chase! You're back. They said you'd gone to Ireland."),
    say('chase', 'Did they?'),
    say('margaret', "You've a bit of an accent, love."),
    // JARVIS Sale: over Chase's shoulder, as in 1.2
    { place: 'chase', at: 'counter_chase' }, { place: 'margaret', at: 'counter_customer2' }, { place: 'grandson', at: [3.55, 0, -7.55, 2.6] },
    { act: [['grandson', 'phone']] },
    { music: 'reddy_frantic', fade: 0.6 },
    into(OTS_CHASE),
  ];

  CUTSCENES.E_end = [
    { place: 'chase', at: SLUMP },
    { prop: 'monitor_screen', fn: (o) => o.userData.show('restart') },
    // [TOP-DOWN · Chase, the frame from 1.2] His hands rise toward his head, stop halfway, and he laughs instead.
    TOP_DOWN,
    { wait: 0.9 },
    { do: handsUp },
    { wait: 1.0 },
    { do: laugh },
    Object.assign({ move: 'crane', from: 0, to: 0.55, dur: 2.2 }, TOP_DOWN),   // the head lifts: the camera rises with it
    { wait: 1.8 },
    // He taps the rhythm of the restart chime on the counter.
    { do: tapChime },
    { wait: 0.3 },
    say('chase', "…That's a sample."),
    // [TWO-SHOT · the two of them behind the counter, shoulder to shoulder] The monitor sits off to the side now, not between them.
    { place: 'chase', at: COUNTER.chase }, { place: 'luka', at: COUNTER.luka },
    { act: [['chase', 'idle'], ['luka', 'idle']] },
    { prop: 'monitor_screen', fn: (o) => o.userData.show('app') },
    { shot: 'CAM', pos: [5.45, 1.52, -7.05], look: [5.18, 1.42, -10.05], fov: 34 },
    { wait: 0.5 },
    say('luka', 'Want me to call the manager?'),
    slow('chase', "Nah. We've got this."),
    // Luka puts a hand on his shoulder.
    { do: shoulder },
    { wait: 1.2 },
    { face: 'chase', to: 'margaret' },
    say('chase', 'Cup of tea while it restarts, Margaret?'),
    MARGARET,
    say('margaret', 'Yes, please.'),
    // [INSERT] A courier's parcel for Chase. Inside: a lanyard with his name on the badge, and a handwritten note: "Sorry for the wait. — R."
    { place: 'chase', at: COUNTER.chase }, { place: 'luka', at: COUNTER.luka }, { act: [['luka', 'idle']] },
    { prop: 'parcel', visible: true }, { sfx: 'thud', vol: 0.5 },
    { shot: 'INSERT', at: 'parcel' },
    { wait: 1.1 },
    { sfx: 'rip', vol: 0.35 },
    { shot: 'INSERT', at: 'parcel', card: ['parcel', {}] },
    { wait: 3.4 },
    // [CLOSE · Chase] (1.1's chest-up frame: the lanyard in his hands this time)
    { do: lanyardHeld },
    { expr: [['chase', 'stunned']] },
    { shot: 'CLOSE', on: 'chase', dist: 1.4 },
    { wait: 0.6 },
    say('chase', '…EIGHT MONTHS.'),
    MARGARET,
    slow('margaret', 'Worth the wait, love.'),
    // [CLOSE · Chase lifting the lanyard over his head, face tilting up]
    { expr: [['chase', 'neutral']] },
    SAME('chase'),
    { do: lanyardOn },
    { wait: 2.1 },
    { act: [['chase', 'look_up']] },
    face('chase', (f) => f.mouth('smile')),
    { wait: 1.4 },
    // [MATCH CUT · Front Square, 1987] Young Rue under the ringing bell, face tilted up into the first sun in three weeks, at the same angle.
    { set: 'square', env: 'sun', spawn: { rue19: 'under_bell' } },
    { do: squareUp },
    SAME('rue19'),
    { wait: 2.7 },
    // [MATCH CUT · Rue's office, 2026] The same angle again. On his desk the brick phone rings, a third time.
    // He smiles the same smile and answers.
    { set: 'office', env: 'day', spawn: { rue58: 'rue_desk' } },
    { do: officeUp },
    SAME_DESK,
    { wait: 0.8 },
    { do: ringThird },
    { wait: 3.2 },                                                     // (two rings on his face)
    { do: smileUp },
    { wait: 0.7 },
    { do: answer },
    slow('rue58', 'Yes?'),
    // [JARVIS-CAM] The store monitor: "JARVIS has encountered an error. Would you like to restart? [YES] [NO]".
    // The cursor hovers, then clicks YES. White.
    { set: 'reddy', env: 'rain', spawn: { chase: COUNTER.chase, luka: COUNTER.luka } },
    { do: storeBack },
    { shot: 'JARVIS', at: 'monitor2', on: ['chase', 'luka'] },
    { wait: 0.5 },
    { do: restartClick },
    { fade: 'out', dur: 0.7, color: '#fff' },
    amb(false),
    { wait: 0.9 },
    // TITLE: RUE
    { par: [bigTitle, blackUnder] },
  ];

  // =================================================================== CREDITS
  // The mini-game does it all (Polaroid, Names, the parody card, Pudding's song) and leaves the screen black for PC.
  // No title card over black before it: the RUE card has just played.
  SCENES.C = {
    get title() { return flow.sceneId === 'C' ? '' : 'Credits'; },
    playable: [], swap: false, hud: null, music: null,
    steps: [['minigame', 'credits', {}]],
    grants: {},
  };
  // Scene select (§16: "items, flags, names, samples and battery"): the Samples each scene offers, so C picked from
  // the list plays the song on them, not all bleeps. Grants apply only in select mode; a scene's own list wins.
  for (const [id, s] of [['2.6', ['kettle', 'rain', 'till', 'beep', 'dynamo']], ['2.7', ['trill']], ['2.10', ['whistle', 'bell']]])
    if (SCENES[id]) (SCENES[id].grants ||= {}).samples ||= s;

  // =================================================================== POST-CREDITS — "The Original Spec"
  // "He points at the frame without looking": the rig's point is straight ahead, so for this one gesture his upper body
  // turns to the frame on his right while his head stays on his monitor. (A wrapper on his pooled rig, inert elsewhere.)
  function pointAside(c) {
    const a = actor(c, 'declan58');
    if (!a) return;
    const r = a.rig;
    if (!r.asideWrapped) {
      const pose = r.pose;
      r.asideWrapped = true;
      r.pose = (n, t, p) => {
        pose(n, t, p);
        if (n !== 'point' || flow.sceneId !== 'PC') return;
        const k = Math.min(1, t / 0.35);
        r.parts.torso.rotation.y -= 1.15 * k; r.parts.neck.rotation.y += 0.35 * k; r.parts.head.rotation.y += 0.8 * k;
      };
    }
    a.play('point', { dur: 2.4, loop: false });
  }
  // the back of the targets sheet, as the player ticked it in 1.6 (+ the door, by dialogue)
  const SPEC = { title: 'JARVIS — bugs', items: [], skull: true };   // the same sheet as 1.6's card
  function fillSpec(c) {
    SPEC.items = BUGS.filter((b) => (state.bugs || []).includes(b.id)).map((b) => b.text).concat(DOOR_BUG);   // (the frame's order)
    const f = c.world.prop('spec_frame'); if (f && f.userData.repaint) f.userData.repaint(state.bugs);
  }

  SCENES.PC = {
    title: 'The Original Spec', set: 'jarvis_hq', env: 'rain', time: 'Dublin, 2026',
    playable: [], swap: false, hud: null, music: null,
    spawn: { declan58: 'declan_desk', young_dev: [O(2.0), 0, -1.9, 0.58] },   // behind Declan's left shoulder, off the track
    steps: [['cutscene', 'PC']],
    grants: {},
  };

  CUTSCENES.PC = [
    { fade: 'out', dur: 0 },
    { do: fillSpec },
    { do: (c) => seat(actor(c, 'declan58'), 'type') },
    // [WIDE · a wet Dublin street, looking up] A door above a shop: JARVIS SYSTEMS — EST. 1987.
    { shot: 'SET', cam: 'street_up' },
    { fade: 'in', dur: 1.0 },
    { wait: 3.6 },
    // [TRACK · slowly through the office] Past monitors crowded with pop-ups, to one wall.
    { shot: 'CAM', pos: [O(-4.0), 1.5, 1.6], look: [O(0.5), 1.2, 0.9], fov: 50, to: { pos: [O(-0.8), 1.5, 1.35], look: [O(3.0), 1.25, 1.2], fov: 48 }, dur: 4.2, ease: 'in' },
    { wait: 4.2 },
    { shot: 'CAM', pos: [O(-0.8), 1.5, 1.35], look: [O(3.0), 1.25, 1.2], fov: 48, to: { pos: [O(1.6), 1.45, 1.75], look: [O(2.8), 1.55, 3.4], fov: 44 }, dur: 4.2, ease: 'out' },
    { wait: 4.4 },
    // [PUSH IN] Framed side by side: a charred prepaid display phone, and the back of an Optus sales targets sheet covered
    // in Luka's handwriting, with a small skull next to Recontracts; exactly the bugs ticked in 1.6, plus "Door takes nine
    // seconds". A brass plaque: THE ORIGINAL SPEC.
    { shot: 'CAM', pos: [O(2.8), 1.56, 2.35], look: [O(2.8), 1.55, 3.4], fov: 38, to: { pos: [O(2.8), 1.56, 2.85], look: [O(2.8), 1.55, 3.4], fov: 38 }, dur: 5 },
    { wait: 5.2 },
    { shot: 'INSERT', at: 'spec_sheet', card: ['list', SPEC] },
    { wait: 3.8 },
    { shot: 'INSERT', at: 'plaque', card: ['plaque', { text: 'THE ORIGINAL SPEC' }] },
    { wait: 2.4 },
    // [MID · an older man at a desk, back to camera] He doesn't turn around. (2.8: Rue at his desk won't turn round.)
    // 2.8's `rue_back` setup: straight behind him on his facing axis, the lens just over his head, fov 35; MID distance.
    { shot: 'CAM', pos: [O(1.0), 1.4, -0.7], look: [O(2.78), 1.3, -0.7], fov: 35 },
    { wait: 1.2 },
    say('young_dev', 'Declan? Optus are on the line again. They want to know if we can fix the pop-ups.'),
    say('declan58', "Fix them? That's in the spec."),              // (58, not turning round)
    { do: pointAside },
    { wait: 0.5 },
    say('declan58', 'Every single item on that list. Took me thirty-nine years. But I got them all in.'),
    say('young_dev', '…Why would you build the bugs on purpose?'),
    say('declan58', 'Two lads told me it was from the future. Who am I to argue with the future?'),
    // [INSERT] His desk nameplate: DECLAN JARVIS — FOUNDER.
    { shot: 'INSERT', at: 'nameplate', card: ['nameplate', { text: 'DECLAN JARVIS — FOUNDER' }] },
    { wait: 2.6 },
    // [JARVIS-CAM] Declan's face through his own monitor as a pop-up lands on it: "JARVIS has stopped responding."
    { shot: 'JARVIS', at: 'monitor', on: 'declan58' },
    { wait: 1.0 },
    { popup: { msg: 'JARVIS has stopped responding.', icon: 'error', buttons: [], at: { actor: 'declan58' }, shake: true } },
    { wait: 2.0 },                                                     // (his typing face, neutral, under it)
    // END. (The flow marks the game completed and returns to the title: Chapter Select and Extras unlock.)
    { fade: 'out', dur: 1.2 },
    { popup: null, clear: true },
  ];
})();
