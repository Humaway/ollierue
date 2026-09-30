// ============================================================ CONTENT: 3.5 "11:58", 3.6 "Three Weeks", 3.7 "Sorry for the Wait",
// 3.8 "The Tape", 3.9 "I've Always Liked the Sound of That"
// SPEC §13. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
(() => {
  const PI = Math.PI, H = PI / 2;
  const say = (id, text, o) => Object.assign({ say: id, text }, o);
  const slow = (id, text, o) => say(id, text, Object.assign({ speed: 'slow' }, o));
  const tape = (id, text) => say(id, text, { tag: 'tape', speed: 'slow' });
  const actor = (c, id) => c.world.actor(id);
  const MINE = ['3.5', '3.6', '3.7', '3.8', '3.9'];
  const V1 = new THREE.Vector3(), V2 = new THREE.Vector3();

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
  // The same poses without the prop the art shows with them (the 'reading' book, the 'drink' mug, the 'phone' brick):
  // the kit's own prop, or nothing, is in the hand. Plus Rue's own: the handset kept at his ear while his other hand goes
  // to his mouth (3.5), a hand held over his mouth (3.8), straightening his collar (3.5).
  for (const n of ['reading', 'drink', 'phone', 'pour']) ANIMS[n + '_bare'] = Object.assign((r, t, p) => ANIMS[n](r, t, p), { upper: true });
  ANIMS.mouth_bare = Object.assign((r, t, p) => ANIMS.drink(r, Math.min(t, 0.9), p), { upper: true });
  const RA = [0, 0, 0, 0, 0, 0, 0, 0, 0], RP = ['armR', 'foreR', 'handR'];
  ANIMS.phone_mouth = Object.assign((r, t, p) => {
    ANIMS.phone(r, t, p);
    for (let i = 0; i < 3; i++) { const e = r.parts[RP[i]].rotation; RA[i * 3] = e.x; RA[i * 3 + 1] = e.y; RA[i * 3 + 2] = e.z; }
    ANIMS.drink(r, Math.min(t, 0.9), p);
    for (let i = 0; i < 3; i++) r.parts[RP[i]].rotation.set(RA[i * 3], RA[i * 3 + 1], RA[i * 3 + 2]);
  }, { upper: true });
  const COLLAR = { dur: 2 };   // lanyard_on's hands-at-the-collar moment, with a little tug
  ANIMS.collar = Object.assign((r, t) => ANIMS.lanyard_on(r, 1.52 + 0.08 * Math.max(0, Math.sin(t * 6)), COLLAR), { upper: true });
  function playBare(c, id, anim, o) {
    const a = actor(c, id);
    if (!a) return;
    a.play(anim + '_bare', o || {});
    return c.wait(0.05);
  }
  // a CAM step glide from wherever the camera is now (the live lens) to a framing
  function glideFromHere(c, to, dur, ease) {
    c.ui.card(null);
    const cm = c.world.camera;
    cm.getWorldDirection(V1);
    c.cam.shot({ shot: 'CAM', pos: cm.position.toArray(), look: V1.multiplyScalar(3).add(cm.position).toArray(), fov: cm.fov, to, dur, ease });
  }

  // Hand props, built once: the brick phone (the Prologue's handset, rebuilt so the ECU reads as the same shot),
  // the PUDDING tape, the Polaroid.
  const kit = {};
  let lcd = null;
  const PUD = (cx, w, h) => {
    cx.fillStyle = '#f6f1e3'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#e8743b'; cx.fillRect(0, h - 10, w, 10);
    cx.fillStyle = '#15151a'; cx.font = 'bold 30px "Comic Sans MS", "Segoe Print", cursive'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText('PUDDING', w / 2, h * 0.42, w - 12);
  };
  // Rue's box opened on the bench (3.7): each thing its own child, so it leaves the box when someone lifts it
  function contentsKit() {
    const g = new THREE.Group(), CB = mat(0xb98d5a);
    const bit = (n, fn) => { const p = new Builder(); fn(p); const o = p.done({ floor: false }); o.name = n; g.add(o); };
    bit('carton', (p) => { p.box(0.3, 0.2, 0.24, CB, [-0.35, 0.1, 0.02]); p.add(new THREE.BoxGeometry(0.32, 0.005, 0.24).rotateX(-1.2).translate(-0.35, 0.2, -0.14), CB); });
    bit('lanyard', (p) => { p.box(0.5, 0.004, 0.012, mat(0x7fb4cc), [0.02, 0.004, -0.02], 0.3); p.box(0.06, 0.004, 0.085, mat(0xf4f4f0), [0.2, 0.002, 0.04]); });
    bit('polaroid', (p) => p.box(0.09, 0.004, 0.105, mat(0x2b2825), [0.12, 0.002, -0.1]));   // face down: the Prologue's dark back
    bit('micro', (p) => p.box(0.055, 0.012, 0.035, mat(0x2a2c30), [0.02, 0.006, 0.1]));
    bit('dicta', (p) => p.box(0.05, 0.022, 0.12, mat(0x3a3d42), [0.28, 0.011, -0.08]));
    bit('pudding', (p) => { p.box(0.1, 0.016, 0.065, mat(0x222222), [-0.08, 0.008, 0.1]); p.plane(0.064, 0.032, matTex(canvasTex(128, 64, PUD, { key: '3c_pudding' })), [-0.08, 0.0165, 0.1], [-H, 0, 0]); });
    g.name = 'kit3c_contents';
    return g;
  }
  function kitProp(c, name) {
    let g = kit[name];
    if (!g && name === 'contents') g = kit[name] = contentsKit();
    if (!g) {
      const b = new Builder();
      if (name === 'brick') {
        const T = canvasTex(64, 192, (cx, w, h) => {
          cx.fillStyle = '#5d6168'; cx.fillRect(0, 0, w, h);
          cx.fillStyle = '#44474d'; cx.fillRect(4, 8, w - 8, 10); cx.fillStyle = '#2a2c30'; for (let x = 8; x < w - 8; x += 4) cx.fillRect(x, 10, 2, 6);
          cx.fillStyle = '#23262a'; cx.fillRect(7, 26, w - 14, 32); cx.fillStyle = '#7d8c6c'; cx.fillRect(10, 29, w - 20, 26);
          cx.textAlign = 'center'; cx.textBaseline = 'middle';
          cx.fillStyle = '#c9ccd1'; cx.font = 'bold 7px sans-serif'; cx.fillText('MOBILE', w / 2, 66);
          cx.fillStyle = '#2e3136'; cx.fillRect(8, 74, w - 16, 12); cx.fillStyle = '#e6e6e6'; cx.font = 'bold 6px sans-serif'; cx.fillText('SND     END', w / 2, 80);
          for (let i = 0; i < 12; i++) {
            const x = 8 + (i % 3) * 17, y = 92 + (i / 3 | 0) * 21;
            cx.fillStyle = '#c6c8cc'; cx.fillRect(x, y, 14, 15); cx.fillStyle = '#222'; cx.font = 'bold 9px sans-serif'; cx.fillText('123456789*0#'[i], x + 7, y + 8);
          }
          cx.fillStyle = '#2a2c30'; for (let x = 14; x < w - 14; x += 5) cx.fillRect(x, h - 10, 2, 5);
        }, { key: '3c_brick' });
        b.box(0.078, 0.22, 0.05, mat(0x5d6168), [0, 0.11, 0]);
        b.plane(0.078, 0.22, matTex(T), [0, 0.11, 0.0255]);
        b.cyl(0.008, 0.008, 0.13, 6, mat(0x2a2b2e), [0.024, 0.285, -0.01]); b.cyl(0.012, 0.012, 0.02, 6, mat(0x1a1b1e), [0.024, 0.35, -0.01]);
      } else if (name === 'pudding') {
        const T = canvasTex(128, 64, PUD, { key: '3c_pudding' });
        b.box(0.1, 0.064, 0.013, mat(0x26282d), [0, 0, 0]);
        b.plane(0.084, 0.04, matTex(T), [0, 0.006, 0.0068]);
      } else {   // the Polaroid: white frame, a small dark photograph (the card shows what's on it)
        const T = canvasTex(64, 80, (cx, w, h) => {
          cx.fillStyle = '#fbfbf6'; cx.fillRect(0, 0, w, h); cx.fillStyle = '#6d7278'; cx.fillRect(5, 5, w - 10, w - 10);
          cx.fillStyle = '#3a3632'; cx.fillRect(22, 26, 20, 33); cx.fillStyle = '#2f3a52'; cx.fillRect(12, 34, 8, 20); cx.fillStyle = '#1f6fe0'; cx.fillRect(44, 34, 8, 20);
        }, { key: '3c_polaroid' });
        b.box(0.088, 0.107, 0.003, mat(0x2b2825), [0, 0, 0]);
        b.plane(0.088, 0.107, matTex(T), [0, 0, 0.0017]);
      }
      g = kit[name] = b.done({ floor: false }); g.name = 'kit3c_' + name;
      if (name === 'brick') {
        lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.031), mat(0x0a1a08, { emissive: 0x9cff7a, emissiveIntensity: 0.9, key: 'off_lcd' }));
        lcd.position.set(0, 0.172, 0.0262); lcd.visible = false; g.add(lcd);
      }
    }
    if (g.parent !== c.world.scene) { g.removeFromParent(); c.world.scene.add(g); delete g.userData.home; }
    g.visible = true;
    return g;
  }
  function hand(c, id, name) {   // a kit prop into someone's right hand (off everyone else's first)
    for (const a of c.world.actors.values()) if (a.held && a.held.name === 'kit3c_' + name) a.hold(null);
    const a = actor(c, id); if (a) a.hold(kitProp(c, name), 'R');
  }
  // a close lens on someone's right hand, from in front of them (after the pose has settled)
  function handShot(c, id, fwd = 0.5, up = 0.1, fov = 34) {
    const a = actor(c, id), g = a && a.rig.attach.gripR;
    if (!g) return;
    a.root.updateMatrixWorld(true); g.getWorldPosition(V1);
    const fx = Math.sin(a.rotY), fz = Math.cos(a.rotY);
    c.ui.card(null);
    c.cam.shot({ shot: 'CAM', pos: [V1.x + fx * fwd, V1.y + up, V1.z + fz * fwd], look: [V1.x, V1.y, V1.z], fov });
  }
  // a close on someone's face and what's in their hands (the midpoint), from in front of them
  function faceAndHands(c, id, dist = 1.0, fov = 40) {
    const a = actor(c, id), g = a && a.rig.attach.gripR;
    if (!g) return;
    a.root.updateMatrixWorld(true); g.getWorldPosition(V1); a.eyePos(V2);
    V1.add(V2).multiplyScalar(0.5);
    const fx = Math.sin(a.rotY), fz = Math.cos(a.rotY);
    c.ui.card(null);
    c.cam.shot({ shot: 'CAM', pos: [V1.x + fx * dist, V1.y + 0.12, V1.z + fz * dist], look: V1.toArray(), fov });
  }
  const faceOut = (c, name) => { const g = kit[name]; if (g) g.rotation.set(0, PI, 0); };   // label / keypad toward the lens
  function drop(c, id) { const a = actor(c, id); if (a && a.held) { const o = a.held; a.hold(null); o.visible = false; } }

  // ---------------------------------------------------------- Luka's lanyard (his rig's own mesh; the rig is pooled, so leave it as found)
  const LY = { rig: null, mesh: null };
  function lanyard(c) {
    const l = actor(c, 'luka');
    if (l && LY.rig !== l.rig) { LY.rig = l.rig; LY.mesh = l.rig.attach.lanyard || l.rig.root.getObjectByName('lanyard'); }
    return LY.mesh;
  }
  function lanyardHome(visible) {
    const m = LY.mesh, r = LY.rig;
    if (!m || !r) return;
    r.parts.torso.add(m); m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.visible = visible; r.attach.lanyard = m;
  }
  // gone (3.6, 3.8): hidden, and no anim may show it
  function lanyardGone(c) { if (!lanyard(c)) return; lanyardHome(false); delete LY.rig.attach.lanyard; }
  // held in front of him in both hands (the 'reading' pose, no book)
  function lanyardHeld(c, still = true) {
    const m = lanyard(c), l = actor(c, 'luka');
    if (!m || !l) return;
    delete LY.rig.attach.lanyard;
    const d = LY.rig.d;
    LY.rig.parts.torso.add(m); m.position.set(0, 0.3 - d.T, (d.chestZ || 0.12) + 0.14); m.rotation.set(0.5, 0, 0); m.visible = true;
    l.mood = null;
    return playBare(c, 'luka', 'reading', { still });
  }
  // 3.9: over his head and onto his chest, where it belongs
  function lanyardOn(c) {
    const m = lanyard(c), l = actor(c, 'luka');
    if (!m || !l) return;
    const d = LY.rig.d, y0 = 0.3 - d.T, z0 = (d.chestZ || 0.12) + 0.14;
    l.play('lanyard_on', { dur: 2 });
    tween(c, 1.9, (k) => {
      const u = Math.min(1, k / 0.45), v = Math.max(0, (k - 0.45) / 0.55);
      m.position.set(0, k < 0.45 ? y0 + (0.42 - y0) * u : 0.42 * (1 - v), k < 0.45 ? z0 + (0.05 - z0) * u : 0.05 * (1 - v));
      m.rotation.x = 0.5 * (1 - Math.min(1, k * 1.6));
      if (k >= 1) LY.rig.attach.lanyard = m;
    });
  }

  // ---------------------------------------------------------- leaving these scenes: put every pooled rig and borrowed prop back
  const RIGS = { rue: null };
  let watching = false;
  function watch() {
    if (watching) return;
    watching = true;
    const u = () => {
      if (MINE.includes(flow.sceneId)) return;
      removeUpdate(u); watching = false;
      lanyardHome(true);
      const r = RIGS.rue;
      if (r) { for (const n of ['headphones', 'walkman', 'brick']) if (r.attach[n]) r.attach[n].visible = false; r.face.tears = 0; }
      for (const k in kit) if (kit[k].parent) kit[k].removeFromParent();
      if (lcd) lcd.visible = false;
      if (hiss) { hiss.stop(0.3); hiss = null; }   // (3.8's tape hiss)
    };
    addUpdate(u);
  }
  // Rue's rig (pooled): headphones and Walkman only in the car (3.5)
  function rue(c) {
    const a = actor(c, 'rue58');
    if (a) { RIGS.rue = a.rig; for (const n of ['headphones', 'walkman', 'brick']) if (a.rig.attach[n]) a.rig.attach[n].visible = false; }
    return a;
  }
  // Rue's box: its home is the car's back seat (3.7 leaves it on the bench; it only shows in 3.5 and 3.7)
  function boxToCar(c) {
    const b = c.world.prop('rue_box'), car = c.world.prop('car_black');
    if (b && car && b.parent !== car) { car.add(b); b.position.set(-0.4, 0.62, -0.72); b.rotation.set(0, 0, 0); }
    if (b) b.visible = true;
  }

  // =================================================================== 3.5 — "11:58"
  let ringing = false;
  function dress35(c) {
    watch();
    const r = rue(c), d = actor(c, 'driver');
    if (r) {
      r.play('sit', { h: 0.3 }); r.setExpr('neutral'); r.rig.face.tears = 0;
      for (const n of ['headphones', 'walkman']) if (r.rig.attach[n]) r.rig.attach[n].visible = true;   // headphones round his neck, the Walkman beside him
    }
    if (d) d.play('sit', { h: 0.3 });
    boxToCar(c);
    const f = c.world.prop('window_flash'); if (f) f.visible = false;
    ringing = false;
  }
  // The brick phone lies back on his lap between his hands, keypad up, facing the front seats.
  const LAP = new THREE.Vector3();
  function lapPhone(c) {
    const r = actor(c, 'rue58');
    if (!r) return;
    r.root.updateMatrixWorld(true);
    r.rig.attach.gripL.getWorldPosition(V1); r.rig.attach.gripR.getWorldPosition(V2);
    LAP.addVectors(V1, V2).multiplyScalar(0.5);
    const p = kitProp(c, 'brick');
    p.position.set(LAP.x, LAP.y - 0.02, LAP.z - 0.04); p.rotation.set(0.9, PI, 0);
  }
  // [ECU · locked] the Prologue's lens (its ECU on the office brick_phone) in the handset's own frame: aimed at the keypad
  // centre (0, 0.068, 0.019) from (-0.06, -0.007, 0.488) off it, fov 30
  function ecu(c) {
    const p = kit.brick;
    if (!p) return;
    p.updateMatrixWorld(true);
    V1.set(0, 0.068, 0.019).applyMatrix4(p.matrixWorld);
    V2.set(-0.06, -0.007, 0.488).transformDirection(p.matrixWorld).multiplyScalar(0.4917);
    c.ui.card(null);
    c.cam.shot({ shot: 'CAM', pos: V2.add(V1).toArray(), look: V1.toArray(), fov: 30 });
  }
  // [PULL OUT] back and out through the far rear window: his lap, the Walkman, the headphones, the box on the seat, the car
  const CAR_SIDE = { pos: [-1.0, 1.34, 21.05], look: [-2.62, 1.1, 21.3], fov: 48 };
  const pullOut = (c) => glideFromHere(c, CAR_SIDE, 3.6);
  // [CLOSE · Rue] from between the front seats (a computed close lands in the roof)
  function carClose(c, dy = 0, fov = 40) {
    const a = actor(c, 'rue58');
    if (!a) return;
    a.eyePos(V1);
    c.ui.card(null);
    c.cam.shot({ shot: 'CAM', pos: [V1.x + 0.36, V1.y - 0.06, V1.z - 0.6], look: [V1.x, V1.y - 0.05 + dy, V1.z], fov });
  }
  // the ring: LCD lit, the handset buzzing, the harsh trill every 3 s (Black Monday's cadence, 2.12)
  function ring(c, on) {
    ringing = on;
    if (lcd) lcd.visible = on;
    if (!on) { if (kit.brick) kit.brick.rotation.z = 0; return; }
    let t = 0, n = 0;
    const u = (dt) => {
      const p = kit.brick;
      if (!ringing || flow.sceneId !== '3.5' || !p) { removeUpdate(u); if (p) p.rotation.z = 0; return; }
      t += dt;
      if (t >= n * 3) { n++; c.sfx('brick_ring', { vol: 0.9 }); }
      if (p.parent === c.world.scene) p.rotation.z = (t % 3) < 1.0 ? 0.04 * Math.sin(t * 70) : 0;
    };
    addUpdate(u);
  }
  // He answers: the handset goes to his ear (the rig's own brick stays hidden).
  async function answer(c) {
    ring(c, false);
    const r = actor(c, 'rue58');
    if (!r) return;
    await playBare(c, 'rue58', 'phone', {});
    r.hold(kitProp(c, 'brick'), 'R');
    r.rig.face.eyes('open');
  }
  const eyes = (e) => ({ do: (c) => { const a = actor(c, 'rue58'); if (a) a.rig.face.eyes(e); } });
  // "He laughs. It's half a sob."
  function halfSob(c) {
    const a = actor(c, 'rue58');
    if (!a) return;
    a.setExpr('laugh'); a.rig.face.tears = 1; a.rig.face.redraw();
  }
  // A white flash fills every window of the store. Then nothing. (Reduce Flashing: a slow, dim grey glow instead.)
  async function flashWindows(c) {
    const f = c.world.prop('window_flash'), m = f && f.children[0] && f.children[0].material;
    c.sfx('flash_hum', { vol: 0.25, lp: 900 });
    if (!f) return;
    if (options.reduceFlashing && m && !c.flow.skipping) {   // the set's shared material: only uniforms change, restored after
      m.color.setScalar(0); m.emissiveIntensity = 0; f.visible = true;
      await new Promise((res) => {
        let t = 0;
        const u = (dt) => { t += dt; const k = Math.min(1, t / 1.2); m.emissiveIntensity = 0.35 * Math.sin(k * PI); if (k >= 1) { removeUpdate(u); res(); } };
        addUpdate(u);
      });
      m.color.setScalar(1); m.emissiveIntensity = 1;
    } else { f.visible = true; await c.wait(0.3); }
    f.visible = false;
  }

  SCENES['3.5'] = {
    title: '11:58', set: 'reddy', env: 'day', time: 'Tue 20 Oct 2026, 11:58',
    playable: [], swap: false, hud: null, music: 'pudding_warbly',   // the song carries on from 3.4, thin and warbly now
    spawn: { rue58: 'car_backseat', driver: 'car_driver' },
    steps: [['cutscene', '3.5']],
    grants: { flags: { rue_answered: true }, battery: null, bars: null },
  };

  CUTSCENES['3.5'] = [
    { fade: 'out', dur: 0 },
    { do: dress35 },
    { wait: 0.1 },
    { do: lapPhone },
    // [ECU · locked] The prologue's shot: the brick phone. The Pudding song is still playing from the last scene,
    // older now, thin and warbly through foam headphones.
    { do: ecu },
    { fade: 'in', dur: 0.6 },
    { wait: 2.6 },
    // [PULL OUT] The phone isn't on a desk. It's on Rue's lap in the back of a car, the Walkman beside it, headphones
    // round his neck. A small cardboard box sits on the seat.
    { do: pullOut },
    { wait: 3.8 },
    // [WIDE · from the back seat, through the windscreen] The Yes Optus sign in blazing sun. The driver in the foreground.
    { shot: 'INSERT', at: 'car_window' },
    { wait: 1.2 },
    { act: [['driver', 'glance', { dur: 3.4, yaw: 1.25 }]] },
    { wait: 0.4 },
    say('driver', "Sure you don't want to go in, sir?"),
    slow('rue58', 'Not yet.'),
    // [INSERT] His watch: 11:57. Then 11:58.
    { shot: 'INSERT', at: 'rue58', card: ['watch', { time: '11:57' }] },
    { wait: 1.8 },
    { shot: 'INSERT', at: 'rue58', card: ['watch', { time: '11:58' }] },
    { wait: 1.2 },
    // [ECU] The brick phone rings: the same harsh trill as Black Monday. The music cuts out.
    { do: ecu },
    { music: null, cut: true },
    { do: (c) => ring(c, true) },
    { wait: 3.4 },
    // [CLOSE · Rue] He closes his eyes. Then he answers.
    { do: (c) => carClose(c) },
    eyes('closed'),
    { wait: 1.7 },
    { do: answer },
    { wait: 0.9 },
    say('operator', 'You have a reverse-charge call from—'),
    say('chase_luka', 'Chase and Luka! Optus Redcliffe!', { tag: 'down the line' }),
    // [CLOSE · Rue's hand going to his mouth]
    { do: (c) => carClose(c, -0.1, 44) },
    { expr: [['rue58', 'stunned']] },
    { act: [['rue58', 'phone_mouth']] },   // the handset stays at his ear
    { wait: 1.4 },
    say('operator', '—Will you accept the charges?'),
    { do: (c) => { const a = actor(c, 'rue58'); if (a) { a.play('phone_bare'); a.setExpr('sad'); } } },
    { wait: 0.3 },
    slow('rue58', 'I will.'),
    say('operator', 'Please answer yes or no.'),
    // [CLOSE · Rue] He laughs. It's half a sob.
    { do: (c) => carClose(c) },
    { do: halfSob },
    { wait: 1.3 },
    slow('rue58', 'Yes.'),
    // [WIDE · through the windscreen] A white flash fills every window of the store. Then nothing.
    { shot: 'INSERT', at: 'car_window' },
    { do: (c) => { const a = actor(c, 'rue58'); if (a) { a.hold(null); a.play('sit'); } if (kit.brick) kit.brick.visible = false; } },
    { wait: 1.0 },
    { do: flashWindows },
    { wait: 1.8 },
    { act: [['driver', 'glance', { dur: 3.2, yaw: 1.25 }]] },
    say('driver', '…Sir? Was that lightning?'),
    // (wiping his eyes)
    { act: [['rue58', 'cry', { dur: 1.4, loop: false }]] },
    { wait: 1.2 },
    say('rue58', "Give them a minute. They'll be confused."),
    // [MID] He straightens his collar and picks up the box.
    Object.assign({ shot: 'CAM' }, CAR_SIDE),
    { do: (c) => { const a = actor(c, 'rue58'); if (a) { a.setExpr('neutral'); a.rig.face.tears = 0; a.rig.face.redraw(); a.play('collar', { dur: 1.1, loop: false }); } } },
    { wait: 1.3 },
    { do: (c) => { const a = actor(c, 'rue58'); if (a) { a.play('give', { dur: 1.2 }); a.hold('rue_box'); } } },
    { wait: 1.6 },
  ];
  // =================================================================== 3.6 — "Three Weeks"
  // The six differences (any three bring Luke out). Each spot's flag is 'diff_<id>'.
  const DIFFS = ['halloween', 'casual', 'wall', 'poster', 'calendar', 'sign'];
  const found = (s) => { let n = 0; for (const d of DIFFS) if (s.flags['diff_' + d]) n++; return n; };
  const me = (text) => ({ do: (c) => c.say(c.state.active, text) });   // the one who noticed says it
  // a look from the eyes of whoever noticed it (the other one steps in behind, out of the view)
  function behind(c) {
    const a = actor(c, c.state.active), f = c.flow.follow && actor(c, c.flow.follow);
    if (!a || !f) return;
    const fx = Math.sin(a.rotY), fz = Math.cos(a.rotY);
    f.place([a.pos.x - fx * 0.9 - fz * 0.45, 0, a.pos.z - fz * 0.9 + fx * 0.45, a.rotY]);
  }
  function eyeLens(c, at, o) {
    const a = actor(c, c.state.active), an = c.world.anchor(at);
    if (!a || !an) return;
    a.face(at, 0); behind(c);
    a.eyePos(V1); V2.subVectors(an.at, V1).normalize().multiplyScalar(0.22).add(V1);
    c.cam.shot(Object.assign({ shot: 'CAM', pos: V2.toArray(), look: an.at.toArray() }, o));
  }
  const look = (at, fov, card) => ({ do: (c) => { eyeLens(c, at, { fov }); c.ui.card(card ? card[0] : null, card && card[1]); } });
  // [POV · push-in] 1.4's exact step (72-content-1c WALL_PUSH): it lands on four empty tethers. It's their POV, so the two
  // of them are out of the picture while it runs (wherever they stand in the aisle).
  const WALL_PUSH = { shot: 'POV', from: 'display_wall', at: 'display_wall', move: 'push', amount: 0.6, dur: 6, fov: 26 };
  const unseen = (v) => ({ do: (c) => { for (const id of ['luka', 'chase']) { const a = actor(c, id); if (a) a.visible = v; } } });
  const WALL_STEPS = [unseen(false), WALL_PUSH, { wait: 3.6 }, me('…Oh no.'), { wait: 0.4 }, unseen(true)];
  const SIGN_STEPS = [look('aframe', 44), { wait: 1.8 }];   // (no line: the empty spot where the A-frame stood says it)
  const unfound = (d) => (s) => !s.flags['diff_' + d];
  // "Differences glow slightly after a minute": a faint warm shimmer over each one still unfound
  const GLOW = { halloween: [1.5, 1.35, -2.7], casual: [5.35, 1.9, -10.25], wall: [-2.0, 1.25, -14.1], poster: [10.85, 1.55, -11.28],
    calendar: [10.9, 1.55, -10.35], sign: [-4.9, 0.7, 1.3] };
  function glowWatch(c) {
    let t = 0, k = 0;
    const u = (dt) => {
      if (flow.sceneId !== '3.6') { removeUpdate(u); return; }
      if (!flow.roaming || flow.busy || flow.cutscene) return;
      if ((t += dt) < 60 || t < k) return;
      k = t + 1.3;
      for (const d of DIFFS) if (!state.flags['diff_' + d]) world.puff(GLOW[d], { n: 4, color: 0xfff1b0, speed: 0.12, life: 1.3, gravity: -0.12 });
    };
    addUpdate(u);
  }
  const GONE = ['lanyard', 'badge', 'recorder', 'notebook'];
  function dress36(c) {
    watch();
    for (const d of DIFFS) delete state.flags['diff_' + d];
    for (const it of GONE) inventory.remove(it);   // nothing of 1987 came home with them (the lanyard went to Rue in 3.4)
    lanyardGone(c);
    const l = actor(c, 'luka'), ch = actor(c, 'chase'), j = actor(c, 'jordan'), lk = actor(c, 'luke');
    if (l) { l.mood = null; l.habit = null; l.place([5.7, 0, -26.8, -0.6]); l.play('lie_tangled'); l.setExpr('sleep'); }
    if (ch) { ch.place([6.9, 0, -26.9, 0.9]); ch.play('lie_tangled'); ch.setExpr('sleep'); }
    if (j) { j.play('idle'); j.setExpr('talk'); }
    if (lk) lk.visible = false;
    const d = c.world.prop('backroom_door'); if (d) { d.rotation.y = 0; d.userData.open = undefined; }
    const o = c.world.prop('office_door'); if (o) { o.rotation.y = 0; o.userData.open = undefined; }
  }
  async function smoke(c) {
    const t = c.world.prop('tube');
    for (let i = 0; i < 5; i++) {
      c.world.puff([6.3 + (i % 2) * 0.5, 0.35, -27.2], { n: 12, color: 0xc9c9c9, speed: 0.45, life: 2.6, gravity: -0.35 });
      if (t) t.userData.off = i % 2 === 0;
      await c.wait(0.35);
    }
    if (t) t.userData.off = false;
  }
  // a JARVIS door that swings shut behind them (the collider never moves)
  const doorOpened = (c) => { const d = c.world.prop('backroom_door'); if (d) { d.rotation.y = 1.5; d.userData.open = false; } };
  // autoplay: walk the party to a spot, then notice it
  async function visit(c, where, id) {
    const a = actor(c, c.state.active), f = c.flow.follow && actor(c, c.flow.follow);
    if (a) a.place(where);
    if (f) f.place([where[0] - Math.sin(where[3]) * 0.9, 0, where[2] - Math.cos(where[3]) * 0.9, where[3]]);
    await c.hotspots.trigger(id);
  }

  SCENES['3.6'] = {
    title: 'Three Weeks', set: 'reddy', env: 'halloween', time: 'Tue 20 Oct 2026, 11:58',
    playable: ['luka', 'chase'], swap: false, hud: null, music: null,
    spawn: { luka: 'floor_luka', chase: 'floor_chase', jordan: 'jordan_counter', luke: 'office_desk' },
    hotspots: [
      // --- the six differences
      { id: 'halloween', at: 'halloween', r: 1.4, verb: 'Look', once: true, flag: 'diff_halloween',
        steps: [look('halloween', 44), { wait: 0.9 }, me('…Since when is it Halloween?')] },
      { id: 'casual', at: 'jordan', r: 2.7, verb: 'Look', once: true, flag: 'diff_casual',
        steps: [{ do: (c) => { const j = actor(c, 'jordan'); if (j) j.face(c.state.active); } }, { wait: 0.3 },
          { shot: 'MID', on: 'jordan' }, { act: [['jordan', 'wave', { dur: 1.6 }]] }, { wait: 1.0 }, me("Who's that?")] },
      { id: 'wall', at: [-2.0, 0, -6.2], r: 1.9, verb: 'Look', once: true, flag: 'diff_wall', when: unfound('wall'), steps: WALL_STEPS },
      { id: 'wall_near', at: 'display_wall', r: 1.5, verb: 'Look', once: true, flag: 'diff_wall', when: unfound('wall'), steps: WALL_STEPS },
      { id: 'poster', at: 'missing_poster', r: 1.0, verb: 'Look', once: true, flag: 'diff_poster',
        steps: [look('missing_poster', 34, ['missing', {}]), { wait: 3.2 }, { do: (c) => c.ui.card(null) }] },
      { id: 'calendar', at: 'calendar', r: 0.9, verb: 'Look', once: true, flag: 'diff_calendar',
        steps: [look('calendar', 44), { wait: 1.4 }, say('chase', "…That's not right.")] },
      // the front door, and (as in 1.1) the glass nearest the spot outside where the A-frame stood, where its glow is
      { id: 'sign', at: [-2.0, 0, -0.95], r: 1.3, verb: 'Look', once: true, flag: 'diff_sign', when: unfound('sign'), steps: SIGN_STEPS },
      { id: 'sign_glass', at: 'aframe', r: 2.0, verb: 'Look', once: true, flag: 'diff_sign', when: unfound('sign'), steps: SIGN_STEPS },
      // --- the rest of the store
      { id: 'backroom_door', at: [6.4, 0, -23.3], r: 0.8, verb: 'Open', door: { to: [6.1, 0, -25.4, PI], kind: 'jarvis' }, do: doorOpened },
      { id: 'backroom_door_back', at: [6.4, 0, -24.45], r: 0.6, verb: 'Open', door: { to: [6.4, 0, -22.4, 0], kind: 'jarvis' } },
      { id: 'kettle', at: 'kettle', r: 1.0, verb: 'Use', kettle: true },
    ],
    steps: [
      ['cutscene', '3.6_wake'],
      ['control', 'luka'], ['follow', 'chase'],
      ['objective', 'Get back to work.'],
      ['do', (c) => { glowWatch(c); c.music('reddy', { fade: 3 }); }],
      ['roam', {
        until: (s) => found(s) >= 2,
        async auto(c) { await visit(c, [1.9, 0, -4.1, -0.4], 'halloween'); await visit(c, [-2.0, 0, -5.4, PI], 'wall'); },
      }],
      ['control', 'chase'], ['follow', 'luka'],
      ['roam', {
        until: (s) => found(s) >= 3,
        async auto(c) { await visit(c, [10.2, 0, -10.35, H], 'calendar'); },
      }],
      ['follow', null], ['objective', null],
      ['cutscene', '3.6_luke'],
    ],
    grants: { flags: { home: true, took_blame: true }, removeItems: GONE },
  };

  CUTSCENES['3.6_wake'] = [
    { do: dress36 },
    // [WIDE · locked, the exact frame that ended Act One] The empty backroom, smoke under the flickering tube. It clears,
    // and this time there are two people on the floor, tangled in a swivel chair, a scorched "Yes" sign and three dead phones.
    { shot: 'INSERT', at: 'backroom_wide' },
    { do: smoke },
    { wait: 3.2 },
    // [TOP-DOWN]
    { shot: 'TOP', on: ['luka', 'chase'], dist: 2.5 },
    { expr: [['chase', 'worried']] },
    say('chase', '…Why are we on the floor?'),
    { expr: [['luka', 'worried']] },
    say('luka', 'Why do you smell like a pub?'),
    say('chase', 'Why do YOU smell like a pub?'),
    // [CLOSE · Luka's hand] It goes to his lanyard. Nothing's there. He pats his chest twice.
    { place: 'luka', at: 'floor_luka' }, { act: [['luka', 'sit', { h: 0.1 }]] },
    { place: 'chase', at: 'floor_chase' }, { act: [['chase', 'sit', { h: 0.1 }]] },
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    { wait: 0.1 },
    { shot: 'INSERT', at: 'luka' },
    { act: [['luka', 'lanyard', { dur: 1.3, loop: false, still: true }]] },
    { wait: 1.5 },
    { act: [['luka', 'lanyard', { dur: 0.35, loop: false, still: true }]] }, { wait: 0.5 },
    { act: [['luka', 'lanyard', { dur: 0.35, loop: false, still: true }]] }, { wait: 0.5 },
    { shot: 'CLOSE', on: 'luka' },
    { expr: [['luka', 'worried']] },
    say('luka', "Where's my…"),
    say('chase', "What's the time?"),
    // [INSERT] The wall clock: 11:58.
    { shot: 'INSERT', at: 'wall_clock', card: ['clock', { time: '11:58' }] },
    { wait: 0.6 },
    say('luka', '11:58.'),
    { shot: 'CLOSE', on: 'chase' },
    { expr: [['chase', 'laugh']] },
    say('chase', 'Sweet. Before lunch.'),
    // (they get up)
    { act: [['luka', 'stand', { h: 0.1 }], ['chase', 'stand', { h: 0.1 }]] },
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    { shot: 'INSERT', at: 'backroom_wide' },
    { wait: 1.1 },
  ];

  // Luke's office door: the boys stand in the staff area, Luke comes out at them.
  const LUKE_OUT = [9.85, 0, -11.85, -0.75], LUKA_AT = [7.95, 0, -10.15, 2.3], CHASE_AT = [7.3, 0, -10.55, 2.3], LUKA_FRONT = [8.1, 0, -10.9, 2.2];
  CUTSCENES['3.6_luke'] = [
    { music: null, fade: 1.5 },
    unseen(true),
    { place: 'luka', at: LUKA_AT }, { place: 'chase', at: CHASE_AT },
    { act: [['luka', 'idle'], ['chase', 'idle']] },
    { place: 'luke', at: 'office_door_in' }, { do: (c) => { const l = actor(c, 'luke'); if (l) { l.visible = true; l.setExpr('worried'); } } },
    // [WIDE · the office door] Luke comes out and stops dead.
    { shot: 'CAM', pos: [10.3, 1.65, -8.9], look: [8.5, 1.2, -12.0], fov: 52 },
    { prop: 'office_door', fn: (o) => { o.userData.open = true; } },
    { wait: 0.4 },
    { move: 'luke', to: LUKE_OUT, speed: 2.2 },
    { expr: [['luke', 'stunned']] },
    { wait: 0.5 },
    { expr: [['luke', 'worried']] },
    say('luke', 'Where have you two BEEN?'),
    say('luka', '…Lunch?'),
    say('luke', 'For THREE WEEKS?'),
    // [WHIP PAN · the calendar: 20 OCT] [WHIP PAN · a plastic Halloween skeleton] [WHIP PAN · the new casual, who waves]
    { shot: 'INSERT', at: 'calendar', move: 'whip' }, { wait: 0.55 },
    { shot: 'INSERT', at: 'halloween', move: 'whip' }, { wait: 0.55 },
    { do: (c) => { const j = actor(c, 'jordan'); if (j) { j.face('chase', 0); j.play('wave', { dur: 1.4 }); } } },
    { shot: 'MID', on: 'jordan', move: 'whip' }, { wait: 1.0 },
    { face: 'chase', to: 'luke' },
    say('chase', 'Three weeks?'),
    say('luke', 'You vanished. Four displays gone. Scorch marks on the ceiling. Head office ringing every day. Margaret\'s been in eleven times asking for you. And some scammer rang saying it was you. From 1987.'),
    // [TWO-SHOT] Two totally blank faces.
    { expr: [['luka', 'stunned'], ['chase', 'stunned']] },
    { shot: 'TWO', on: ['luka', 'chase'], locked: true },
    { wait: 1.2 },
    say('luka', '…Weird.'),
    // [TOP-DOWN · Chase] His breathing speeds up. His hands rise.
    { expr: [['chase', 'worried']] },
    { shot: 'TOP', on: 'chase' },
    { act: [['chase', 'head_hands']] },
    { wait: 0.7 },
    // [LOW · Luka, stepping half in front of Chase] The angle the camera found for him at Torchlight (2.13's exact step).
    // He doesn't know why he's standing like this. (He steps in at the edge of the top-down, then the cut.)
    { expr: [['luka', 'determined']] },
    { move: 'luka', to: LUKA_FRONT, speed: 0.9 },
    { face: 'luka', to: LUKA_FRONT[3], dur: 0 },
    { shot: 'CLOSE', on: 'luka', angle: 'low', dist: 1.1, locked: true },
    { wait: 0.4 },
    say('luka', 'It was me.'),
    say('luke', 'What was?'),
    say('luka', 'Whatever it was. It was my call. He was following me.'),
    { act: [['chase', 'idle']] },
    say('luke', "You don't even know what you did."),
    say('luka', "Doesn't matter. I'm the 2IC. It's on me."),
    // [PUSH IN · slow, on Luke] He looks at Luka properly for the first time.
    { face: 'luke', to: 'luka', dur: 0 }, { expr: [['luke', 'neutral']] },
    { do: (c) => {
      const a = actor(c, 'luke'), l = actor(c, 'luka');
      if (!a || !l) return;
      a.eyePos(V1); V2.set(l.pos.x - V1.x, 0, l.pos.z - V1.z).normalize();
      c.cam.shot({ shot: 'CAM', pos: [V1.x + V2.x * 1.25 + V2.z * 0.12, V1.y - 0.03, V1.z + V2.z * 1.25 - V2.x * 0.12], look: [V1.x, V1.y - 0.05, V1.z], fov: 40, move: 'push', amount: 0.72, dur: 6 });
    } },
    { wait: 1.8 },
    slow('luke', "…We'll talk about your position."),
    // He goes back into the office.
    { move: 'luke', to: 'office_door_in' },
    { prop: 'office_door', fn: (o) => { o.userData.open = false; } },
    { do: (c) => { const l = actor(c, 'luke'); if (l) l.visible = false; } },
    // [TWO-SHOT]
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    { face: 'chase', to: 'luka' }, { face: 'luka', to: 'chase' },
    { shot: 'TWO', on: ['luka', 'chase'] },
    say('chase', "Why'd you do that?"),
    slow('luka', '…Dunno. Felt right.'),
    { wait: 0.8 },
  ];

  // The MISSING poster on the noticeboard: their staff photos, in the store's printer ink.
  CARDS.missing = (cx, w, h) => {
    cx.translate(w / 2, h / 2); cx.rotate(0.012);
    const pw = w * 0.78, ph = h * 0.94, x = -pw / 2, y = -ph / 2;
    cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 24; cx.shadowOffsetY = 10;
    cx.fillStyle = '#fff'; cx.fillRect(x, y, pw, ph); cx.shadowColor = 'transparent';
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = '#c62828'; cx.font = 'bold 96px "Trebuchet MS", Arial, sans-serif'; cx.fillText('MISSING', 0, y + ph * 0.1, pw * 0.9);
    const bw = pw * 0.38, bh = ph * 0.34, by = y + ph * 0.19;
    [['luka', 'LUKA', -1], ['chase', 'CHASE', 1]].forEach(([id, name, sd]) => {
      const bx = sd * pw * 0.22 - bw / 2;
      cx.fillStyle = '#dfe6ec'; cx.fillRect(bx, by, bw, bh);
      const a = typeof world !== 'undefined' && world.actor(id), fc = a && a.rig.face.canvas;
      if (fc) {
        const k = Math.max(bw / fc.width, bh / fc.height);
        cx.save(); cx.beginPath(); cx.rect(bx, by, bw, bh); cx.clip(); cx.filter = 'grayscale(0.35) contrast(0.9)';
        cx.drawImage(fc, bx + (bw - fc.width * k) / 2, by + (bh - fc.height * k) / 2, fc.width * k, fc.height * k); cx.restore();
      }
      cx.fillStyle = '#222'; cx.font = 'bold 38px "Trebuchet MS", Arial, sans-serif'; cx.fillText(name, bx + bw / 2, by + bh + 34);
    });
    const text = 'Last seen 29/09. Answers to Luka and Chase. Chase may ask about his lanyard.';
    cx.font = '34px "Trebuchet MS", Arial, sans-serif'; cx.fillStyle = '#333';
    let line = '', ly = by + bh + 100;
    for (const wd of text.split(' ')) {
      const t = line ? line + ' ' + wd : wd;
      if (cx.measureText(t).width > pw * 0.84 && line) { cx.fillText(line, 0, ly); ly += 44; line = wd; } else line = t;
    }
    cx.fillText(line, 0, ly);
    cx.fillStyle = '#141d3a'; cx.fillRect(x, y + ph - 26, pw, 26);
  };
  CARDS.missing.size = [640, 900];

  // [WIDE · the corridor, symmetrical, locked] 3.3's corridor, mirrored: straight down the corridor to the backroom door,
  // eye height, Rue small on the boxes by the door.
  const CORRIDOR = { shot: 'CAM', pos: [6.4, 1.45, -14.3], look: [6.4, 0.9, -23.4], fov: 38 };
  // =================================================================== 3.7 — "Sorry for the Wait"
  // Rue's walk from the door to the counter (he stops at Jordan to read a badge); Luke at his right shoulder.
  const RUE_WALK_A = [[-1.4, 0, -3.3], [-0.15, 0, -4.05]], RUE_WALK_B = [[1.3, 0, -6.2], [5.05, 0, -7.6]];
  const LUKE_WALK_A = [[-0.75, 0, -3.0], [0.35, 0, -3.5]], LUKE_WALK_B = [[1.9, 0, -5.8], [5.95, 0, -7.35]];
  const COUNTER_LUKA = [5.8, 0, -10.1, 0], COUNTER_CHASE = [4.7, 0, -10.1, 0], JORDAN_AISLE = [0.7, 0, -4.6, -2.3];
  // the backroom: the three of them round the workbench, the box on it
  const BENCH_RUE = [4.55, 0, -28.95, PI], BENCH_LUKA = [3.85, 0, -28.7, 1.75], BENCH_CHASE = [5.6, 0, -28.5, -1.95], RUE_BACK = [4.55, 0, -27.65, PI];
  const BOX_ON_BENCH = [4.45, 0.93, -29.55], DICTA_BENCH = [4.75, 0.945, -29.2];
  const walkTo = async (c, id, pts, speed) => { for (const p of pts) { const a = actor(c, id); if (!a || c.flow.sceneId !== '3.7') return; await a.moveTo(p, { speed }); } };
  const near = (c, id, x, z, r) => { const a = actor(c, id); return !a || Math.hypot(a.pos.x - x, a.pos.z - z) < r; };
  function glanceAt(c, id, tid, dur) {
    const a = actor(c, id), t = actor(c, tid);
    if (!a || !t) return;
    let y = Math.atan2(t.pos.x - a.pos.x, t.pos.z - a.pos.z) - a.rotY;
    y = Math.atan2(Math.sin(y), Math.cos(y));
    a.play('glance', { dur, yaw: Math.max(-1.3, Math.min(1.3, y)) });
  }
  // the store's own box goes onto the bench (its home is the car: 3.5 and 3.7 put it back there)
  function boxToBench(c) {
    const b = c.world.prop('rue_box'), r = actor(c, 'rue58');
    if (r && r.held === b) r.hold(null);
    const root = c.world.prop('box_contents')?.parent;
    if (b && root) { root.add(b); b.position.set(BOX_ON_BENCH[0], BOX_ON_BENCH[1], BOX_ON_BENCH[2]); b.rotation.set(0, 0.2, 0); b.visible = true; }
  }
  function dress37(c) {
    watch();
    lanyardGone(c);
    boxToCar(c);
    const r = rue(c), lk = actor(c, 'luke');
    if (r) { r.visible = false; r.setExpr('neutral'); r.rig.face.tears = 0; }
    if (lk) lk.visible = false;
    for (const id of ['luka', 'chase']) { const a = actor(c, id); if (a) { a.mood = null; a.habit = null; a.play('idle'); a.setExpr('neutral'); } }
    const cd = c.world.prop('car_door'); if (cd) cd.rotation.y = 0;
    for (const n of ['box_contents', 'dictaphone', 'teas']) { const o = c.world.prop(n); if (o) o.visible = false; }
    if (kit.contents) kit.contents.visible = false;
    const d = c.world.prop('backroom_door'); if (d) { d.rotation.y = 0; d.userData.open = undefined; }
    const o = c.world.prop('office_door'); if (o) { o.rotation.y = 0; o.userData.open = undefined; }
  }
  // Rue's box, opened on the bench; `lift(n)` takes one thing out of it as someone picks it up
  function contentsOn(c) {
    const g = kitProp(c, 'contents');
    g.position.set(4.45, 0.936, -29.7); g.rotation.set(0, 0, 0);   // on the bench mat (0.935), clear of the goggles
    for (const o of g.children) o.visible = true;
  }
  const lift = (c, n) => { const o = kit.contents && kit.contents.getObjectByName(n); if (o) o.visible = false; };
  // "Put the kettle on? [YES] [NO]" — and Rue presses YES himself
  async function kettleYes(c) {
    const p = c.ask('Put the kettle on?', { test: true });
    await c.wait(1.1);
    if (!c.flow.skipping && !TEST.auto) document.querySelector('#dlg .opts button')?.click();   // YES (not a synthetic key: that flips the input scheme)
    await p;
    c.sfx('kettle');
    if (saveGame()) c.ui.toast('Saved.');
  }
  const steam = (c) => c.world.puff('kettle', { n: 16, speed: 0.25, life: 1.8, color: 0xf2f2f2 });

  SCENES['3.7'] = {
    title: 'Sorry for the Wait', set: 'reddy', env: 'halloween', time: 'Tue 20 Oct 2026, 12:15',
    playable: [], swap: false, hud: null, music: null,   // the store hum; the store's hold music for the stare
    spawn: { luka: COUNTER_LUKA, chase: COUNTER_CHASE, jordan: [0.55, 0, -1.0, 0.15], luke: 'office_door_in', rue58: [-2.1, 0, 3.3, PI] },
    steps: [['cutscene', '3.7']],
    grants: { flags: { rue_arrived: true, tape_given: true } },
  };

  CUTSCENES['3.7'] = [
    { do: dress37 },
    // [WIDE · from inside, through the front glass] A black car pulls up. The rear door opens. Rue steps out with a
    // cardboard box under his arm. In the foreground, the new casual turns from the window.
    { shot: 'INSERT', at: 'front_glass' },
    { prop: 'car_black', fn: (o) => o.userData.pullUp() },
    { wait: 3.9 },
    { prop: 'car_door', rotY: -1.1 }, { sfx: 'thud', vol: 0.3 },
    { wait: 0.5 },
    { do: (c) => { const r = actor(c, 'rue58'); if (r) { r.visible = true; r.hold('rue_box'); } } },
    { move: 'rue58', to: [-2.05, 0, 2.2], speed: 1.1, nowait: true },
    { wait: 1.2 },
    { face: 'jordan', to: 2.6, dur: 0.6 },
    { wait: 0.5 },
    say('jordan', "Um. Luke? The CEO's here."),
    // [WIDE · the office] Luke comes out like he's been fired from a cannon.
    { shot: 'CAM', pos: [9.8, 1.6, -9.3], look: [9.2, 1.2, -12.3], fov: 52 },
    { prop: 'office_door', fn: (o) => { o.userData.open = true; } },
    { place: 'luke', at: [9.9, 0, -13.3, 0.35] },
    { do: (c) => { const l = actor(c, 'luke'); if (l) { l.visible = true; l.setExpr('stunned'); } } },
    { wait: 0.3 },
    { move: 'luke', to: [8.2, 0, -9.9], run: true, speed: 5.5 },
    { wait: 0.4 },
    // [TRACK · backwards, ahead of Rue] The move from 2.4. Rue at 58 walks through the store, slower now, reading name
    // badges. Luke babbles at his shoulder, exactly as the boys once did.
    { place: 'rue58', at: 'door_in' }, { place: 'luke', at: [-1.35, 0, -0.85, PI] }, { place: 'jordan', at: JORDAN_AISLE },
    { prop: 'office_door', fn: (o) => { o.userData.open = false; } },
    { expr: [['luke', 'worried']] },
    { shot: 'MID', on: 'rue58', move: 'track', track: 'ahead', dist: 2.6, dur: 6 },
    { do: (c) => { walkTo(c, 'rue58', RUE_WALK_A, 1.1); walkTo(c, 'luke', LUKE_WALK_A, 1.1); } },
    say('luke', "Rue! Welcome to Redcliffe, we weren't— the displays are— there's a report—"),
    say('rue58', 'Hello, Luke. Lovely store.'),
    { do: (c) => waitUntil(() => c.flow.skipping || near(c, 'rue58', -0.15, -4.05, 0.1)) },
    // (reading a badge)
    { face: 'rue58', to: 'jordan' },
    { act: [['rue58', 'look_down', { dur: 1.0, loop: false }]] },
    { wait: 0.9 },
    say('rue58', 'Good afternoon, Jordan.'),
    { act: [['jordan', 'wave', { dur: 1.0 }]] },
    { do: (c) => { walkTo(c, 'rue58', RUE_WALK_B, 1.1); walkTo(c, 'luke', LUKE_WALK_B, 1.1); } },
    { do: (c) => waitUntil(() => c.flow.skipping || near(c, 'rue58', 5.05, -7.6, 0.1)) },
    { face: 'rue58', to: PI }, { face: 'luke', to: 'rue58' },
    { wait: 0.4 },
    // [TWO-SHOT · locked, Rue's shoulder in the foreground] A stare, 3 seconds. He stops in front of Luka and Chase and
    // just looks at them. Luke looks from one face to the other. The store's hold music plays.
    { shot: 'CAM', pos: [5.55, 1.75, -6.55], look: [5.2, 1.45, -10.1], fov: 42 },
    { loop: 'hold_music', vol: 0.45 },
    { do: (c) => { glanceAt(c, 'luke', 'luka', 1.4); c.wait(1.5).then(() => { if (!c.flow.skipping) glanceAt(c, 'luke', 'chase', 1.4); }); } },
    { stare: 3 },
    // [CLOSE · Luka]
    { shot: 'CLOSE', on: 'luka' },
    say('luka', '…Sorry for the wait?'),
    // [CLOSE · Rue] He laughs. It's almost something else.
    { shot: 'CLOSE', on: 'rue58' },
    { do: (c) => { const a = actor(c, 'rue58'); if (a) { a.setExpr('laugh'); a.play('nod', { dur: 1.2 }); } } },
    { wait: 1.4 },
    { do: (c) => { const a = actor(c, 'rue58'); if (a) { a.setExpr('sad'); a.rig.face.mouth('smile'); } } },
    slow('rue58', 'Luka. Chase.'),
    { expr: [['chase', 'stunned']] },
    say('chase', 'You know our names?'),
    slow('rue58', "I've known your names for thirty-nine years."),
    { loop: 'hold_music', stop: true, fade: 1.5 },
    // [WIDE] Luke mouths "thirty-nine years?" at Jordan.
    { place: 'jordan', at: [2.6, 0, -7.0, H] },
    { shot: 'CAM', pos: [1.2, 2.1, -3.2], look: [4.9, 1.15, -8.6], fov: 50 },
    { face: 'luke', to: 'jordan' },
    { wait: 0.4 },
    { do: (c) => { c.world.talk('luke', true); c.wait(1.3).then(() => c.world.talk('luke', false)); } },
    { wait: 1.2 },
    { act: [['jordan', 'shrug', { dur: 1.2 }]] },
    { wait: 1.0 },
    { face: 'luke', to: 'rue58' },
    { expr: [['rue58', 'neutral'], ['chase', 'neutral']] },
    say('rue58', 'Is there somewhere we can talk? And does anyone want a cup of tea?'),
    // [CLOSE · Rue filling the backroom kettle] The save prompt appears, "Put the kettle on? [YES] [NO]", and Rue presses YES himself.
    { do: (c) => { for (const id of ['luke', 'jordan']) { const a = actor(c, id); if (a) a.visible = false; } } },
    { do: boxToBench },
    { place: 'luka', at: BENCH_LUKA }, { place: 'chase', at: BENCH_CHASE }, { place: 'rue58', at: 'kettle' },
    { hold: 'rue58', prop: 'kettle' },
    { do: (c) => playBare(c, 'rue58', 'pour', {}) },
    { shot: 'CAM', pos: [10.2, 1.7, -29.6], look: [9.5, 1.35, -28.5], fov: 44 },
    { wait: 0.8 },
    { do: kettleYes },
    { hold: 'rue58', prop: null },
    { act: [['rue58', 'idle']] },
    { wait: 1.2 },
    { do: steam },
    { wait: 0.8 },
    // [INSERT · top-down] He opens the box on the bench: a faded blue lanyard, a Polaroid face down, a microcassette,
    // an old dictaphone, and a cassette labelled PUDDING in felt-tip.
    { place: 'rue58', at: BENCH_RUE },
    { do: (c) => { const b = c.world.prop('rue_box'); if (b) b.visible = false; } },
    { do: contentsOn },
    { shot: 'CAM', pos: [4.52, 1.6, -29.7], look: [4.52, 0.94, -29.7], fov: 44 },
    { sfx: 'rip', vol: 0.3 },
    { wait: 2.8 },
    // [INSERT] Luka lifts the lanyard. The badge says LUKA. On the back, in biro: 1158.
    { do: (c) => { lift(c, 'lanyard'); return lanyardHeld(c); } },
    { shot: 'INSERT', at: 'luka', card: ['badge', { name: 'LUKA', old: true }] },
    { wait: 1.6 },
    { shot: 'INSERT', at: 'luka', card: ['badge', { name: 'LUKA', back: '1158', old: true }] },
    { wait: 1.2 },
    { place: 'rue58', at: RUE_BACK },
    { shot: 'CLOSE', on: 'luka' },
    { expr: [['luka', 'stunned']] },
    say('luka', "That's mine. That's… I had this this morning."),
    { shot: 'CLOSE', on: 'rue58' },
    slow('rue58', "You had it three weeks ago. I've had it since 1987."),
    // [INSERT] Chase turns the Polaroid over. For the first time we see the front: two blurry figures in polos and a young
    // man in a blazer, in front of a stone arch.
    { do: (c) => { lift(c, 'polaroid'); hand(c, 'chase', 'polaroid'); return playBare(c, 'chase', 'reading', {}); } },
    { shot: 'INSERT', at: 'chase', card: ['polaroid', { front: true }] },
    { sfx: 'polaroid', vol: 0.4 },
    { wait: 2.2 },
    { shot: 'CLOSE', on: 'chase' },
    { expr: [['chase', 'stunned']] },
    say('chase', "…That's us."),
    // [CLOSE · Chase] He picks up the PUDDING cassette.
    { do: (c) => { lift(c, 'pudding'); drop(c, 'chase'); hand(c, 'chase', 'pudding'); faceOut(c, 'pudding'); return playBare(c, 'chase', 'reading', {}); } },
    { do: (c) => faceAndHands(c, 'chase', 0.95) },
    { wait: 1.0 },
    say('chase', "…That's my writing."),
    // [TWO-SHOT · locked] They look at the cassette, then at each other, then at Rue.
    { face: 'luka', to: 'chase', dur: 0 }, { face: 'chase', to: 'luka', dur: 0 },
    { shot: 'TWO', on: ['luka', 'chase'], locked: true },
    { act: [['luka', 'look_down', { dur: 1.3, loop: false }]] },
    { wait: 1.3 },
    { do: (c) => { glanceAt(c, 'luka', 'chase', 1.3); glanceAt(c, 'chase', 'luka', 1.3); } },
    { wait: 1.3 },
    { do: (c) => { glanceAt(c, 'luka', 'rue58', 1.6); glanceAt(c, 'chase', 'rue58', 1.6); } },
    { wait: 0.9 },
    { expr: [['luka', 'neutral'], ['chase', 'worried']] },
    say('chase', 'Is this a prank? Is this for the Christmas party?'),
    { shot: 'CLOSE', on: 'rue58' },
    slow('rue58', "You won't remember. You told me you wouldn't. You told me to give you this."),
    // He puts the dictaphone down between them.
    { move: 'rue58', to: [4.55, 0, -28.3, PI], speed: 0.9 },
    { shot: 'CAM', pos: [6.1, 1.6, -27.1], look: [4.6, 1.05, -28.9], fov: 50 },
    { act: [['rue58', 'give', { dur: 1.4 }]] },
    { wait: 0.6 },
    { do: (c) => lift(c, 'dicta') }, { prop: 'dictaphone', visible: true, pos: DICTA_BENCH, rotY: 0.3 },
    { sfx: 'clunk', vol: 0.3 },
    { wait: 0.8 },
    say('rue58', "Play the tape. I'll give yous the room."),
    // [WIDE · locked, the corridor outside the backroom] Composed exactly like the corridor in 3.3. Rue sits on a stack of
    // stock boxes, just as he once sat on the stairs.
    { do: (c) => { drop(c, 'chase'); lanyardGone(c); } },
    { place: 'rue58', at: [5.72, 0.02, -21.95, 0] }, { act: [['rue58', 'sit', { h: 0.46 }]] }, { expr: [['rue58', 'neutral']] },
    CORRIDOR,
    { wait: 3.2 },
  ];

  // =================================================================== 3.8 — "The Tape"
  // One two-shot, low and locked, eye level with them on the floor: the push-in runs the length of the tape.
  const TAPE0 = { pos: [6.4, 0.8, -23.97], look: [6.4, 1.45, -27.2], fov: 60 }, TAPE1 = { pos: [6.4, 0.9, -25.95], look: [6.4, 0.93, -27.2], fov: 40 };
  const TAPE_LEN = 100;
  let tapeT0 = 0, hiss = null;
  const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  function tapeRest(c) {       // wherever the slow push has got to: finish it gently
    const k = Math.min(1, (clock.t - tapeT0) / TAPE_LEN);
    c.cam.shot({ shot: 'CAM', pos: lerp3(TAPE0.pos, TAPE1.pos, k), look: lerp3(TAPE0.look, TAPE1.look, k), fov: TAPE0.fov + (TAPE1.fov - TAPE0.fov) * k, to: TAPE1, dur: k >= 1 ? 0.01 : 2.5, ease: 'out' });
  }
  // inside the one shot: act when the typewriter reaches `sub` in `line` (any text speed)
  function onText(line, sub, fn) {
    const i = line.indexOf(sub);
    return { do: (c) => {
      const el = document.querySelector('#dlg .txt'), n = el && [...el.childNodes].find((x) => x.nodeType === 3);
      return waitUntil(() => c.flow.skipping || !n || n.length >= i).then(() => fn(c));
    } };
  }
  const L1 = "Is it on? Is the red light— okay. Hey. Us. It's us. If you're hearing this, it worked, you don't remember any of it, and you're probably freaking out. Chase, you're definitely freaking out. Don't put your head in your hands. Lift it up. Look at Luka.";
  function dress38(c) {
    watch();
    lanyardGone(c);
    const l = actor(c, 'luka'), ch = actor(c, 'chase'), r = rue(c);
    if (l) { l.mood = null; l.habit = null; l.play('sit', { h: 0.1 }); l.setExpr('neutral'); }
    if (ch) { ch.play('sit', { h: 0.1 }); ch.setExpr('worried'); }
    if (r) { r.play('sit', { h: 0.46 }); r.setExpr('sad'); }
    const d = c.world.prop('backroom_door'); if (d) { d.rotation.y = 0; d.userData.open = undefined; }
    const t = c.world.prop('dictaphone'); if (t) { t.visible = true; t.position.set(6.4, 0.01, -26.95); t.rotation.set(0, 0.4, 0); }
    for (const n of ['box_contents', 'teas', 'rue_box']) { const o = c.world.prop(n); if (o) o.visible = false; }
    if (kit.contents) kit.contents.visible = false;
    hiss = null;
  }
  function tapeHiss(c, on) {
    if (hiss) { hiss.stop(0.3); hiss = null; }
    if (on && c.AUDIO && !c.flow.skipping) hiss = c.AUDIO.loop('rain', { vol: 0.05, rate: 2.1, fade: 0.2 });
  }

  SCENES['3.8'] = {
    title: 'The Tape', set: 'reddy', env: 'halloween', time: 'Tue 20 Oct 2026, 12:30',
    playable: [], swap: false, hud: null, music: null,   // less music, not more: the tape, the tube, the room
    spawn: { luka: 'floor_luka', chase: 'floor_chase', rue58: 'corridor_boxes' },
    steps: [['cutscene', '3.8']],
    grants: { flags: { tape_played: true } },
  };

  CUTSCENES['3.8'] = [
    { do: dress38 },
    // [TWO-SHOT · low, locked, eye level with them on the floor] Luka and Chase sit where they built the machine, the
    // dictaphone between them, the scorch mark on the ceiling above. Across the whole tape the camera pushes in so slowly
    // it barely seems to move. It doesn't cut away from them until the very end.
    { do: (c) => { tapeT0 = clock.t; c.cam.shot(Object.assign({ shot: 'CAM', to: TAPE1, dur: TAPE_LEN, ease: 'linear' }, TAPE0)); } },
    { wait: 1.2 },
    // Chase presses play. Hiss. Then their own voices, from 1987.
    { act: [['chase', 'tap', { dur: 0.7, loop: false }]] },
    { wait: 0.6 },
    { sfx: 'dictaphone', vol: 0.6 },
    { do: (c) => tapeHiss(c, true) },
    { wait: 1.4 },
    { par: [tape('chase', L1),
      onText(L1, 'Chase, you\'re definitely', (c) => { const a = actor(c, 'chase'); if (a) a.play('head_hands'); }),
      onText(L1, 'Lift it up', (c) => { const a = actor(c, 'chase'); if (a) { a.play('sit', { h: 0.1 }); a.setExpr('neutral'); } }),
    ] },
    // Inside the shot, Chase slowly lifts his head and turns to look at Luka.
    { do: (c) => glanceAt(c, 'chase', 'luka', 5.5) },
    { wait: 1.2 },
    tape('luka', 'Hey, mate.'),
    // On the tape, they both laugh.
    { sfx: 'titter', vol: 0.55, rate: 1.05, lp: 2600 }, { sfx: 'titter', vol: 0.45, rate: 0.85, lp: 2200 },
    { do: (c) => glanceAt(c, 'luka', 'chase', 2.2) },
    { wait: 1.6 },
    tape('luka', 'Okay. Things you need to know. One: we went to 1987. Long story. Two: this isn\'t a prank. Three: Rue didn\'t make JARVIS. Nobody knows who made JARVIS. Possibly God, as a punishment.'),
    tape('chase', "Four. Luka. You told me you only got 2IC because there was no one else who could do it. Mate, that's what a leader is: the one who's still standing there when there's no one else. You said yes to me ripping four phones off a wall. You said yes to a time machine. You spent our last four percent finding a guy who'd been nothing but awful to us, because he was on his own. You've always been the one who could. So stop fiddling with your lanyard. ^ Actually, you can't. We gave it away."),
    { act: [['luka', 'look_down', { dur: 1.6, loop: false }]] },
    tape('luka', "Chase. You wanted to change the world. Mate, you changed a person. And that person's going to— well. If this tape's playing, he did. That's how the world changes, I reckon. Not all at once. Someone picks up the phone. ^ Also, you finished a song. First one ever. It's got a kettle in it."),
    // A pause on the tape. Rain in the background.
    { do: (c) => { if (hiss) { hiss.vol(0.2); hiss.rate(1); } } },
    { wait: 2.6 },
    { do: (c) => { if (hiss) { hiss.vol(0.05); hiss.rate(2.1); } } },
    tape('chase', "We're friends, by the way. Proper ones. You already know each other's coffee orders. We know the rest now. So you're not starting from zero. You're starting from here."),
    { do: (c) => glanceAt(c, 'luka', 'chase', 2.0) },
    tape('luka', 'And you owe me twelve pounds.'),
    tape('chase', "Punts. Irish pounds. It's different."),
    tape('luka', "It's not different."),
    // Click. Hiss. Then a third voice, close to the microphone, nineteen years old.
    { sfx: 'dictaphone', vol: 0.5 },
    { wait: 1.0 },
    say('rue19', 'Note to self. ^ Luka. Chase. Don\'t forget.', { tag: 'tape', speed: 'slow' }),
    // Far away on the tape, the Campanile bell rings. Then silence.
    { sfx: 'bell', vol: 0.3, lp: 1400 },
    { wait: 2.6 },
    { do: (c) => tapeHiss(c, false) },
    // For the first time in 2026, the signal bars appear in the corner of the screen and fill. The push-in has arrived,
    // close, on both their faces.
    { do: tapeRest },
    { hud: { bars: 0 } },
    { wait: 0.8 },
    { hud: { bars: 4 }, anim: 2.4 },
    { wait: 2.6 },
    { expr: [['chase', 'neutral'], ['luka', 'neutral']] },
    slow('chase', '…Did we—'),
    slow('luka', 'Yeah.'),
    slow('chase', "I don't remember any of it."),
    slow('luka', 'Me neither. ^ Feels true, though.'),
    slow('chase', 'Yeah.'),
    { wait: 0.6 },
    // [CLOSE · through the small window in the backroom door] The only cut: Rue on the stock boxes, a hand over his mouth.
    { do: (c) => { const a = actor(c, 'rue58'); if (a) { a.setExpr('crying'); } return playBare(c, 'rue58', 'mouth', {}); } },
    { shot: 'INSERT', at: [5.78, 1.2, -22.5], from: [7.02, 1.84, -25.24], fov: 24 },
    { wait: 3.2 },
  ];

  // =================================================================== 3.9 — "I've Always Liked the Sound of That"
  // [PULL OUT] the store backwards (pull_1..pull_5), then 1.1's crane in reverse: its landing frame over the car park
  // (crane_end), up to the frame it opened on, in the sun (crane_top). One continuous chain of glides, ~17 s.
  const PULL = ['pull_1', 'pull_2', 'pull_3', 'pull_4', 'pull_5', 'crane_end', 'crane_top'], PULL_DUR = [1.4, 1.9, 2.2, 2.2, 2.6, 5];
  function pullOut39() {
    const A = SETS.reddy.anchors, n = PULL_DUR.length;
    const steps = [{ do: (c) => { const a = A.pull_1; glideFromHere(c, { pos: a.from, look: a.at, fov: a.fov }, 2.2, 'in'); } }, { wait: 2.2 }];
    for (let i = 0; i < n; i++) {
      const a = A[PULL[i]], b = A[PULL[i + 1]];
      steps.push({ shot: 'CAM', pos: a.from, look: a.at, fov: a.fov, to: { pos: b.from, look: b.at, fov: b.fov }, dur: PULL_DUR[i], ease: i === n - 1 ? 'out' : 'linear' });
      if (i === n - 2) steps.push({ music: null, fade: 7 });
      steps.push({ wait: PULL_DUR[i] });
    }
    return steps;
  }
  // round the workbench: Luka west, Chase east, Rue with his back to the bench; at the end the boys drift together and
  // Rue turns to the door, so the pull-out starts on his face
  const LUKA39 = [3.8, 0, -28.45, 1.3], CHASE39 = [5.35, 0, -28.5, -1.3], RUE39 = [4.6, 0, -28.95, 0];
  const RUE_END = [4.9, 0, -28.95, 0.64], LUKA_END = [3.8, 0, -28.45, 0.73], CHASE_END = [4.3, 0, -27.95, -2.41];
  function dress39(c) {
    watch();
    const l = actor(c, 'luka'), ch = actor(c, 'chase'), r = rue(c);
    for (const a of [l, ch]) if (a) { a.mood = null; a.habit = null; a.play('idle'); a.setExpr('neutral'); }
    if (r) { r.visible = true; r.setExpr('neutral'); r.rig.face.tears = 0; }
    lanyardHeld(c, true);                      // the lanyard in his hands (he doesn't twist it)
    const d = c.world.prop('backroom_door'); if (d) { d.rotation.y = 1.5; d.userData.open = true; }
    const t = c.world.prop('teas'); if (t) t.visible = true;
    const dp = c.world.prop('dictaphone'); if (dp) { dp.visible = true; dp.position.set(DICTA_BENCH[0], DICTA_BENCH[1], DICTA_BENCH[2]); }
    for (const n of ['box_contents', 'rue_box']) { const o = c.world.prop(n); if (o) o.visible = false; }
    if (kit.contents) kit.contents.visible = false;
  }
  // [CLOSE · Rue, eyes wet, smiling] on the line the pull-out will take back to the door
  function finalClose(c) {
    const a = actor(c, 'rue58'), P = SETS.reddy.anchors.pull_1.from;
    if (!a) return;
    a.eyePos(V1); V2.set(P[0] - V1.x, 0, P[2] - V1.z).normalize();
    c.cam.shot({ shot: 'CAM', pos: [V1.x + V2.x * 0.95, V1.y - 0.02, V1.z + V2.z * 0.95], look: [V1.x, V1.y - 0.07, V1.z], fov: 40 });
  }

  SCENES['3.9'] = {
    title: "I've Always Liked the Sound of That", set: 'reddy', env: 'halloween', time: 'Tue 20 Oct 2026, 12:45',
    playable: [], swap: false, hud: null, music: null,
    spawn: { luka: LUKA39, chase: CHASE39, rue58: [6.4, 0, -22.9, PI], luke: [6.4, 0, -20.5, PI] },
    steps: [['cutscene', '3.9']],
    grants: { flags: { opted_in: true, lanyard_back: true }, items: ['lanyard', 'badge'] },
  };

  CUTSCENES['3.9'] = [
    { do: dress39 },
    { do: (c) => { const a = actor(c, 'luke'); if (a) a.visible = false; } },
    { hold: 'rue58', prop: 'teas' },
    // [MID · the doorway] Rue comes back in with three teas. He's much better at it now.
    { shot: 'CAM', pos: [6.2, 1.45, -27.4], look: [6.4, 1.2, -24.0], fov: 34 },
    { move: 'rue58', to: 'doorway', speed: 1.0 },
    { move: 'rue58', to: [4.75, 0, -28.4], speed: 1.0 },
    { face: 'rue58', to: PI },
    { act: [['rue58', 'give', { dur: 1.2 }]] },
    { wait: 0.6 },
    { hold: 'rue58', prop: null },
    { place: 'rue58', at: RUE39 },
    // [THREE-SHOT · eye level, around the workbench] The three of them in one frame, the way they sat on the Campanile steps.
    { shot: 'THREE', on: ['luka', 'rue58', 'chase'] },
    say('chase', 'So did it work? Did you fix JARVIS?'),
    say('rue58', "Lads. I've been trying to fix JARVIS for thirty-nine years. Do you know how many consultants I've hired?"),
    say('luka', 'So nobody can fix it.'),
    say('rue58', 'Nobody can fix JARVIS.'),
    // [PUSH IN · slow, on Rue]
    { shot: 'CLOSE', on: 'rue58', dist: 1.7, move: 'push', amount: 0.6, dur: 9 },
    { expr: [['chase', 'stunned']] },
    say('chase', 'You knew. The whole time. You knew we\'d rip the phones off the wall. You could\'ve stopped us.'),   // (it dawns on him)
    slow('rue58', 'And then who would\'ve found me under that bell tower?'),
    // Silence.
    { wait: 1.8 },
    say('rue58', 'Do you know what it takes to keep a 1987 phone number working for thirty-nine years? ^ I had to run a phone company.'),
    // [WIDE] Chase laughs so hard he has to sit down.
    { shot: 'CAM', pos: [6.35, 1.65, -26.55], look: [4.6, 0.95, -28.7], fov: 54 },
    { act: [['chase', 'laugh']] }, { expr: [['luka', 'laugh']] },
    { sfx: 'titter', vol: 0.4 },
    { wait: 1.2 },
    { do: (c) => { const a = actor(c, 'chase'); if (a) { a.play('sit', { h: 0.1 }); a.play('laugh'); } } },
    { wait: 1.6 },
    { act: [['chase', 'sit', { h: 0.1 }]] }, { expr: [['chase', 'laugh'], ['luka', 'neutral']] },
    // [CLOSE · Rue, to Luka]
    { face: 'rue58', to: 'luka', dur: 0 },
    { shot: 'CLOSE', on: 'rue58' },
    { wait: 0.4 },
    slow('rue58', 'I heard you, you know. That night on my floor. "Nobody else could do it, so it had to be me." ^ I\'ve hired a lot of people since then, Luka. It\'s the only thing I look for.'),
    // [CLOSE · Luka] He looks at the lanyard in his hands. He doesn't twist it.
    { do: (c) => playBare(c, 'luka', 'reading', { still: true }) },
    { wait: 0.1 },
    { do: (c) => faceAndHands(c, 'luka', 0.85, 44) },
    { wait: 2.6 },
    // [WIDE · Luke framed in the backroom doorway] He's heard just enough to be very confused.
    { place: 'luke', at: 'doorway' }, { do: (c) => { const a = actor(c, 'luke'); if (a) { a.visible = true; a.setExpr('worried'); } } },
    { shot: 'CAM', pos: [6.3, 1.5, -29.4], look: [6.4, 1.2, -24.15], fov: 40 },
    { wait: 0.8 },
    say('luke', "…Luka. You're on the roster Thursday. Don't be late."),
    // [LOW · Luka]
    { face: 'luka', to: 'luke', dur: 0 },
    { shot: 'MID', on: 'luka', angle: 'low', dist: 1.6 },
    { wait: 0.3 },
    slow('luka', 'Yes.'),
    // Luke goes. Luka puts the lanyard on.
    { do: (c) => { const a = actor(c, 'luke'); if (a) a.moveTo([6.4, 0, -21.0]).then(() => { a.visible = false; }); } },
    { wait: 0.6 },
    { do: lanyardOn },
    { do: () => { inventory.add('lanyard'); inventory.add('badge'); } },   // his again (quietly: no toast in this beat)
    { wait: 2.2 },
    { act: [['luka', 'idle']] },
    { face: 'luka', to: 'rue58' },
    // [CLOSE · Rue holding up the PUDDING cassette]
    { face: 'rue58', to: 0.35 },
    { do: (c) => { hand(c, 'rue58', 'pudding'); faceOut(c, 'pudding'); return playBare(c, 'rue58', 'reading', {}); } },
    { wait: 0.1 },
    { do: (c) => faceAndHands(c, 'rue58', 1.0, 42) },
    { wait: 0.5 },
    slow('rue58', 'I played this every day for a year. After that, every time I had to decide something that mattered. ^ It\'s got a kettle in it.'),   // (to Chase)
    // [CLOSE · Chase] He opens his mouth. Nothing comes out.
    { shot: 'CLOSE', on: 'chase' },
    { do: (c) => { const a = actor(c, 'chase'); if (a) { a.setExpr('sad'); a.rig.face.mouth('O'); } } },
    { wait: 1.6 },
    { do: (c) => { const a = actor(c, 'chase'); if (a) a.rig.face.mouth('closed'); } },
    { wait: 0.6 },
    say('rue58', "I still don't know why Pudding."),
    { expr: [['chase', 'neutral']] },
    say('chase', '…Long story.'),
    say('rue58', "I've got time."),
    { do: (c) => { const a = actor(c, 'chase'); if (a) a.rig.face.mouth('smile'); } },
    say('chase', "It's still a long story."),
    // [INSERT] Rue holds up the brick phone.
    { do: (c) => {
      drop(c, 'rue58'); hand(c, 'rue58', 'brick'); if (lcd) lcd.visible = false;
      const p = kit.brick; if (p) { p.rotation.set(PI, 0, 0); p.position.y *= -1; p.position.z *= -1; }   // keypad toward the lens, the right way up (turned about its centre)
      return playBare(c, 'rue58', 'reading', {});
    } },
    { wait: 0.1 },
    { do: (c) => handShot(c, 'rue58', 0.55, 0.06, 34) },
    { wait: 1.0 },
    slow('rue58', "This has rung twice in thirty-nine years. Once with the worst news of my life. Once with the best. ^ I'd like it to ring a bit more. If that's all right."),
    { act: [['chase', 'stand', { h: 0.1 }]] },   // (off the insert)
    { wait: 1.0 },
    // [TWO-SHOT · Luka and Chase look at each other] A short, easy hold. Nobody needs to say anything.
    { do: (c) => { drop(c, 'rue58'); const a = actor(c, 'rue58'); if (a) a.play('idle'); } },   // under the cut
    { place: 'rue58', at: RUE_END }, { place: 'luka', at: LUKA_END }, { place: 'chase', at: CHASE_END },
    { act: [['chase', 'idle']] },
    { expr: [['luka', 'neutral'], ['chase', 'neutral']] },
    { shot: 'TWO', on: ['luka', 'chase'], locked: true },
    { wait: 1.8 },
    { do: (c) => { for (const id of ['luka', 'chase']) { const a = actor(c, id); if (a) a.rig.face.mouth('smile'); } } },
    { wait: 0.4 },
    { do: (c) => glanceAt(c, 'luka', 'rue58', 2.4) },
    say('luka', 'Opt us in.'),
    // [CLOSE · Rue, eyes wet, smiling]
    { do: (c) => { const a = actor(c, 'rue58'); if (a) { a.setExpr('sad'); a.rig.face.mouth('smile'); a.rig.face.tears = 1; a.rig.face.redraw(); } } },
    { do: finalClose },
    { wait: 1.0 },
    slow('rue58', "I've always liked the sound of that."),
    { wait: 0.8 },
    // [PULL OUT · slow and continuous] Back through the backroom door, down the corridor, past the counter, out through the
    // front glass and up into the sun: the reverse of the crane that opened Act One.
    { music: 'emotional', fade: 3 },
    ...pullOut39(),
    { wait: 0.6 },
  ];
})();
