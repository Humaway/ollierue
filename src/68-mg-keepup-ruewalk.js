// ============================================================ MINIGAMES: Keep Up (2.4) and Rue's walks (2.4, 2.12, 3.1)
// Both run on the square set (Campanile at the origin, Arts door south, Buttery door north-east).
// keep_up {lines: [[id, text], ...]}: Rue strides out of the Arts Building and round the west side of the square at
//   1.1x Chase's walk. lines[0] plays under the opening TRACK (the camera walks backwards ahead of Rue while the boys
//   scramble in at his shoulders); the rest are a walk-and-talk that pauses while Chase is more than 4 m away (he calls
//   "Rue! Wait—"). Puddles slow him, umbrellas cross in front of him, the cyclist knocks him aside. Can't fail. Luka follows.
// rue_walk {walk: 1|2|3}: the player walks Rue; this module holds the routes, the people, their lines and the camera.
//   1 (2.4)  high and far behind; Siobhán, Fiachra and Des come up and the only prompt is NO; steering at the Campanile
//            makes him veer round it on his own ("Absolutely not.") as the camera rises; halfway, the fake call in profile.
//   2 (2.12) from the Buttery door straight under the Campanile: input only walks him forward, passers-by are smears
//            of colour, the NO prompt is greyed out, one held note; close behind, then falling back and rising. Ends on
//            the steps, under the arch.
//   3 (3.1)  the Arts Building to the Buttery, straight under the Campanile: the prompt is YES, and each yes brings the
//            camera lower and closer until it walks beside him at eye level (and under the Campanile with him).

MINIGAMES.keep_up = (() => {
  const P = [[0, 0, -14.1], [0, 0, -13.6], [-2.6, 0, -9.8], [-6, 0, -7.4], [-10, 0, -6.6], [-12.6, 0, -4.4], [-13.6, 0, -1.6],
    [-12.6, 0, 0.6], [-10.8, 0, 1.3], [-7.6, 0, 1.9], [-5.4, 0, 2.6]];
  const CUM = [0];
  for (let i = 1; i < P.length; i++) CUM.push(CUM[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][2] - P[i - 1][2]));
  const CROSS = [[2, 1, 'student_c'], [4, 1, 'student_f'], [6, -1, 'student_a']];   // umbrellas cross just behind Rue: [segment, side, look]
  const TRACK = { shot: 'MID', on: 'rue19', move: 'track', track: 'ahead', dist: 2.6, dur: 6 };   // mirrored in 3.7
  const FOLLOW = { dist: 4.6, height: 2.3, lag: 0.45, fov: 55 };
  const RANGE = 4, A = [0, 0, 0], B = [0, 0, 0];
  let api, tok = 0, rue, chase, luka, cyc, pud, K = 1, intro = true, done = true, crossed = 0, hitT = 0, bellT = 0, splashT = 0, lx = 0, lz = 0;

  const walkSpeed = () => CONFIG.walk * 1.1;
  const gap = () => Math.hypot(chase.pos.x - rue.pos.x, chase.pos.z - rue.pos.z);
  const along = () => { const k = Math.min(K, P.length - 1); return CUM[k] - Math.hypot(P[k][0] - rue.pos.x, P[k][2] - rue.pos.z); };
  function shoulder(s, back, out) {   // beside (s = -1 right, +1 left... of the frame) and behind Rue
    const fx = Math.sin(rue.rotY), fz = Math.cos(rue.rotY);
    out[0] = rue.pos.x - fx * back - fz * s * 0.75; out[1] = 0; out[2] = rue.pos.z - fz * back + fx * s * 0.75;
    return out;
  }
  const toward = (a, p) => a.moveTo(p, Math.hypot(p[0] - a.pos.x, p[2] - a.pos.z) > 1.2 ? { run: true } : { speed: walkSpeed() });

  async function stride(t) {   // Rue never waits for anyone
    for (K = 1; K < P.length; K++) { await rue.moveTo(P[K], { speed: walkSpeed() }); if (t !== tok) return; }
  }
  async function run(t) {
    const L = api.params.lines || [];
    ui.letterbox(true);
    api.cam.shot(TRACK);
    stride(t);
    let steer = true;
    (async () => { while (steer && t === tok) { toward(chase, shoulder(1, 0.9, A)); toward(luka, shoulder(-1, 0.9, B)); await wait(0.25); } })();
    await wait(0.8);
    if (L[0]) await api.say(L[0][0], L[0][1], { auto: 0.6 });
    await wait(1.2);
    steer = false; intro = false;
    if (t !== tok) return;
    ui.letterbox(false);
    api.cam.override('follow', FOLLOW); api.cam.release(0.8);
    chase.place(chase.pos); luka.place(luka.pos);
    player.control('chase'); player.follower('luka'); player.enabled = true;
    let callT = -9;
    for (let i = 1; i < L.length; i++) {
      while (gap() > RANGE) {
        if (t !== tok) return;
        if (clock.t - callT > 3.2) { callT = clock.t; await api.say('chase', 'Rue! Wait—', { auto: 0.5 }); } else await wait(0.1);
      }
      if (t !== tok) return;
      await api.say(L[i][0], L[i][1], { auto: 1.3 });
    }
    if (t === tok) api.finish({ done: true });
  }
  function crossing(i) {   // an umbrella walks across the path a moment after Rue has gone by
    const [s, side] = CROSS[i], a = P[s], b = P[s + 1], len = CUM[s + 1] - CUM[s];
    const mx = (a[0] + b[0]) / 2, mz = (a[2] + b[2]) / 2, nx = (b[2] - a[2]) / len * side, nz = -(b[0] - a[0]) / len * side;
    const k = api.world.actor('ku_' + i);
    if (!k) return;
    k.place([mx + nx * 3, 0, mz + nz * 3, Math.atan2(-nx, -nz)]); k.visible = true;
    k.play('umbrella');
    k.moveTo([mx - nx * 3.4, 0, mz - nz * 3.4], { speed: 1.25 });
  }

  return {
    start(params, a) {
      api = a; done = false; intro = true; crossed = 0; hitT = bellT = splashT = 0; K = 1;
      const t = ++tok, W = a.world;
      rue = W.actor('rue19') || W.spawn('rue19', P[0]);
      chase = W.actor('chase'); luka = W.actor('luka');
      rue.place([P[0][0], 0, P[0][2], 0]);
      for (let i = 0; i < CROSS.length; i++) W.spawn('ku_' + i, [0, 0, -40, 0], { look: CROSS[i][2] }).visible = false;   // built now, not mid-walk
      lx = chase.pos.x; lz = chase.pos.z;
      pud = SETS.square.puddles || [];
      cyc = W.prop('cyclist');
      if (cyc) cyc.visible = true;
      player.enabled = false;
      run(t);
    },
    update(dt) {
      if (done || !rue) return;
      hitT -= dt; bellT -= dt; splashT -= dt;
      const x = chase.pos.x, z = chase.pos.z, moved = Math.abs(x - lx) + Math.abs(z - lz) > 1e-4;
      lx = x; lz = z;
      // puddles slow Chase down (Rue doesn't care)
      let wet = false;
      for (let i = 0; i < pud.length; i++) { const q = pud[i], u = (x - q[0]) / q[2], v = (z - q[1]) / q[3]; if (u * u + v * v < 1) { wet = true; break; } }
      if (!intro) player.speedMul = wet ? 0.55 : 1;
      if (wet && moved && splashT <= 0) { api.sfx('footstep_wet', { vol: 0.6 }); splashT = 0.33; }
      // the passing cyclist: a bell on approach, a knock if Chase is in the way
      if (cyc && cyc.visible) {
        const dx = x - cyc.position.x, dz = z - cyc.position.z, d = Math.hypot(dx, dz);
        if (d < 5 && bellT <= 0) { api.sfx('bike_bell', { vol: 0.7 }); bellT = 6; }
        if (d < 0.95 && hitT <= 0 && !intro) {
          hitT = 2; api.sfx('thud', { vol: 0.5 }); player.frozen(0.7);
          chase.pos.x += dx / (d || 1) * 0.4; chase.pos.z += dz / (d || 1) * 0.4;
        }
      }
      if (crossed < CROSS.length) { const s = CROSS[crossed][0]; if (along() > (CUM[s] + CUM[s + 1]) / 2 - 1.2) crossing(crossed++); }
    },
    end() {
      done = true; tok++;
      if (cyc) cyc.visible = false;
      for (let i = 0; i < CROSS.length; i++) api.world.despawn('ku_' + i);
      player.speedMul = 1; player.follower(null); player.enabled = false;
      api.cam.override(null); ui.letterbox(false);
    },
    async autoplay(a) {   // Chase keeps up at Rue's shoulder
      const t = tok;
      while (t === tok && !done) { if (!intro) chase.moveTo(shoulder(1, 1.4, A), { speed: CONFIG.walk * 1.5 }); await wait(0.3); }
    },
  };
})();

MINIGAMES.rue_walk = (() => {
  const TAU = Math.PI * 2;
  const ROUTE = {
    1: [[-9, 0.9], [-7.2, 4.8], [-3.8, 7.6], [1.2, 8.8], [5.4, 10.6], [7.27, 13.7]],
    2: [[7.27, 13.6], [0.5, 4.9], [0.35, 2.6]],
    3: [[0, -13.4], [0, -4.6], [0, 0], [0.2, 4.4], [3.2, 8.6], [7.27, 13.7]],
  };
  const AUTO1 = [[-5.2, 0.6], [5.4, 10.6], [7.27, 13.7]];   // autoplay walk 1 steers at the Campanile once, to veer
  const PEOPLE = [
    { id: 'siobhan', ask: 'Rue, can I borrow your notes?', no: 'Buy your own brain.', yes: 'Give them back with coffee on them, like a normal person.' },
    { id: 'fiachra', ask: 'Spare a coin for a song?', no: 'Get a job. A real one.', yes: 'Go on, play me something.' },
    { id: 'des', ask: 'Good afternoon, Mr Rue.', no: '…Is it.', yes: 'Morning, Des.' },
  ];
  const AT = { 1: [0.1, 0.3, 0.78], 3: [0.05, 0.15, 0.25] };
  const CALL = 0.5, DOOR = [7.27, 14.3], RC = 7.2, RA = 7.7, EXIT = Math.atan2(7.27, 13.7);
  // camera: d back, h up, s to his side, a = look ahead, y = look height
  const FAR = { d: 13, h: 8.5, s: 0, a: 3, y: 0.4 }, EYE = { d: 1.9, h: 1.6, s: 1.05, a: 4, y: 1.4 }, VEER = { d: 12, h: 17, s: 0, a: 0, y: 0 };
  const cam = { pos: [0, 5, 0], look: [0, 1, 0], fov: 50 }, cp = { d: 13, h: 8.5, s: 0, a: 3, y: 0.4 }, tg = { ...FAR };
  const pt = [0, 0, 0], M = [0, 0, 0], cum = [], mine = [];
  let api, tok = 0, walk = 1, R = null, len = 1, rue = null, done = true, busy = false, veering = false, pmax = 0, next = 0, called = false;
  let yes = 0, hy = 0, lx = 0, lz = 0, s2 = 0, walking = false, ready = false, sm = null, smT = 0, crowd = null, crowdWas = true, promptEl = null, grey = false, autoOn = false;

  const KEYS = ['d', 'h', 's', 'a', 'y'];
  function lerpCam(o, a, b, k) { for (let i = 0; i < 5; i++) { const n = KEYS[i]; o[n] = a[n] + (b[n] - a[n]) * k; } }
  function progress(x, z) {   // projection of (x, z) on the route, 0..1
    let best = 1e9, sBest = 0;
    for (let i = 0; i < R.length - 1; i++) {
      const a = R[i], b = R[i + 1], dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz;
      let u = ((x - a[0]) * dx + (z - a[1]) * dz) / l2; u = u < 0 ? 0 : u > 1 ? 1 : u;
      const ex = a[0] + dx * u - x, ez = a[1] + dz * u - z, d = ex * ex + ez * ez;
      if (d < best) { best = d; sBest = cum[i] + u * (cum[i + 1] - cum[i]); }
    }
    return sBest / len;
  }
  function at(s, out) {   // the point s metres along the route, and its heading
    let i = 0; while (i < R.length - 2 && cum[i + 1] < s) i++;
    const a = R[i], b = R[i + 1], l = cum[i + 1] - cum[i], u = Math.max(0, Math.min(1, (s - cum[i]) / l));
    out[0] = a[0] + (b[0] - a[0]) * u; out[2] = a[1] + (b[1] - a[1]) * u; out[1] = Math.atan2(b[0] - a[0], b[1] - a[1]);
    return out;
  }
  function spot(side, ahead, out) {   // somewhere beside and ahead of Rue, on the open cobbles
    const fx = Math.sin(hy), fz = Math.cos(hy);
    let x = rue.pos.x + fx * ahead - fz * side, z = rue.pos.z + fz * ahead + fx * side;
    x = Math.max(-18.5, Math.min(19, x)); z = Math.max(-13.6, Math.min(13.6, z));
    if (Math.max(Math.abs(x), Math.abs(z)) < 4.8) { const k = 4.8 / Math.max(Math.abs(x), Math.abs(z), 0.1); x *= k; z *= k; }
    out[0] = x; out[1] = 0; out[2] = z;
    return out;
  }
  const key = (k) => (TEST.auto ? wait(0.4) : waitUntil(() => { if (!input.pressed(k)) return false; input.consume(k); return true; }));

  async function meet(i, t) {   // someone comes up to him
    busy = true;
    const p = PEOPLE[i], a = api.world.actor(p.id) || api.world.spawn(p.id, [0, 0, 30, 0]);
    spot(i === 1 ? 2.2 : -2.2, 3.2, M);
    a.place([M[0], 0, M[2], Math.atan2(rue.pos.x - M[0], rue.pos.z - M[2])]); a.visible = true; a.play('idle');
    await waitUntil(() => t !== tok || Math.hypot(a.pos.x - rue.pos.x, a.pos.z - rue.pos.z) < 3.6);
    if (t !== tok) return;
    const was = player.enabled; player.enabled = false; rue.place(rue.pos);
    await Promise.race([a.moveTo('rue19'), wait(2.5)]);
    if (t !== tok) return;
    rue.face(p.id);
    if (walk !== 3 || p.id !== 'des') await api.say(p.id, p.ask);
    if (t !== tok) return;
    ui.prompt(walk === 3 ? 'YES' : 'NO');
    await key(walk === 3 ? 'yes' : 'no');
    ui.prompt(null);
    if (t !== tok) return;
    if (walk === 3) { rue.play(p.id === 'des' ? 'nod' : 'give'); if (p.id === 'des') a.play('nod'); }
    else rue.play('shake');
    await api.say('rue19', walk === 3 ? p.yes : p.no);
    if (t !== tok) return;
    if (walk === 3 && p.id === 'fiachra') { api.sfx('whistle'); a.play('whistle', { dur: 3 }); }
    if (walk === 3) { yes++; lerpCam(tg, FAR, EYE, yes / 3); }
    const away = spot(i === 1 ? 5 : -5, -2, M);
    if (!(walk === 3 && p.id === 'fiachra')) a.moveTo([away[0], 0, away[2]], {});
    player.enabled = was; busy = false;
  }
  async function fakeCall(t) {   // halfway: the brick phone "rings" (it doesn't); only ever in profile
    busy = true; called = true;
    player.enabled = false; rue.place(rue.pos);
    ui.letterbox(true);
    api.cam.shot({ shot: 'CLOSE', on: 'rue19', side: 'left', dist: 1.4 });
    api.sfx('key_beep', { vol: 0.5 });
    rue.play('fake_call');
    await wait(0.5);
    await api.say('rue19', 'Yes. Yes. Buy. Sell. Tell London I\'ll call them back.');
    if (t !== tok) return;
    rue.play('idle'); ui.letterbox(false);
    await api.cam.release(0.7);
    player.enabled = true; busy = false;
  }
  async function veer(t) {   // the long way round, always
    veering = true;
    player.enabled = false; rue.place(rue.pos);
    tg.d = VEER.d; tg.h = VEER.h; tg.s = 0; tg.a = 0; tg.y = 0;
    api.say('rue19', 'Absolutely not.', { auto: 1.2 });
    let a0 = Math.atan2(rue.pos.x, rue.pos.z);
    let da = EXIT - a0; da -= Math.round(da / TAU) * TAU;
    const n = Math.max(1, Math.ceil(Math.abs(da) / 0.3));
    for (let k = 1; k <= n && t === tok; k++) { const a = a0 + da * k / n; await rue.moveTo([Math.sin(a) * RA, 0, Math.cos(a) * RA], { speed: CONFIG.walk }); }
    if (t !== tok) return;
    Object.assign(tg, FAR);
    player.enabled = true; veering = false;
  }
  async function driver(t) {   // autoplay: walk the route (walk 1 heads at the Campanile once, so the veer runs)
    const L = walk === 1 ? AUTO1 : R.slice(1);
    for (let i = 0; i < L.length && t === tok; i++) {
      await waitUntil(() => t !== tok || (!busy && !veering));
      if (t !== tok) return;
      await rue.moveTo([L[i][0], 0, L[i][1]], {});
      if (busy) i--;   // stopped by someone: go again from here (after a veer, on to the next point)
    }
  }

  // walk 2's passers-by: smears of colour sliding across the square (8 instanced streaks, one shared program)
  const SM = { n: 8, x: new Float32Array(8), z: new Float32Array(8), vx: new Float32Array(8), vz: new Float32Array(8) };
  const D = new THREE.Object3D();
  function smears() {
    const g = new THREE.BoxGeometry(0.45, 1.6, 3.2).translate(0, 0.85, 0);
    const im = instanced(g, mat(0xffffff, { transparent: true, opacity: 0.32, key: 'rue_smear' }), [...Array(SM.n)].map(() => [0, -9, 0, 0, 1]));
    const C = [0x8a2a2a, 0x2a3a6a, 0xc69a2e, 0x3f6a3f, 0x7a1f33, 0x4d6a93, 0xb08a52, 0x5a2a4a], c = new THREE.Color();
    for (let i = 0; i < SM.n; i++) {
      im.setColorAt(i, c.set(C[i]));
      const a = i * 0.9 + 0.4, r = 6 + (i % 4) * 2.6, v = 2.2 + (i % 3) * 0.9;
      SM.x[i] = Math.sin(a) * r; SM.z[i] = Math.cos(a) * r; SM.vx[i] = Math.cos(a) * v * (i % 2 ? 1 : -1); SM.vz[i] = -Math.sin(a) * v * (i % 2 ? 1 : -1);
    }
    im.frustumCulled = false;
    return im;
  }

  function camTick(dt) {
    const k = 1 - Math.exp(-dt * (walk === 2 ? 2.5 : 1.6));
    for (let i = 0; i < 5; i++) { const n = KEYS[i]; cp[n] += (tg[n] - cp[n]) * k; }
    const x = rue.pos.x, z = rue.pos.z, fx = Math.sin(hy), fz = Math.cos(hy);
    let side = cp.s, d = cp.d;
    if (Math.max(Math.abs(x), Math.abs(z)) < 5 && cp.h < 3) { side *= 0.3; d = Math.min(d, 1.7); }   // under the Campanile: tuck in behind him
    let px = x - fx * d - fz * side, pz = z - fz * d + fx * side;
    px = Math.max(-19.6, Math.min(22.6, px)); pz = Math.max(-14.6, Math.min(14.6, pz));
    let lX = x + fx * cp.a, lZ = z + fz * cp.a;
    if (veering) { lX = x * 0.5; lZ = z * 0.5; }
    const kk = ready ? 1 - Math.exp(-dt * 3) : 1;
    cam.pos[0] += (px - cam.pos[0]) * kk; cam.pos[1] += (rue.pos.y + cp.h - cam.pos[1]) * kk; cam.pos[2] += (pz - cam.pos[2]) * kk;
    cam.look[0] += (lX - cam.look[0]) * kk; cam.look[1] += (rue.pos.y + cp.y + 0.4 - cam.look[1]) * kk; cam.look[2] += (lZ - cam.look[2]) * kk;
    ready = true;
  }

  async function run(t) {
    if (walk === 2) return;
    await waitUntil(() => t !== tok || done || (!busy && !veering && (
      (next < 3 && pmax >= AT[walk][next]) || (walk === 1 && !called && pmax >= CALL) ||
      (next >= 3 && (walk !== 1 || called) && Math.hypot(rue.pos.x - DOOR[0], rue.pos.z - DOOR[1]) < 1.7))));
    if (t !== tok || done) return;
    if (next < 3 && pmax >= AT[walk][next] && (walk !== 1 || called || AT[walk][next] < CALL)) await meet(next++, t);
    else if (walk === 1 && !called && pmax >= CALL) await fakeCall(t);
    else if (next >= 3) { player.enabled = false; rue.place(rue.pos); api.finish({ done: true }); return; }
    return run(t);
  }

  return {
    start(params, a) {
      api = a; walk = +(params.walk || 1); R = ROUTE[walk]; done = false; busy = veering = false; pmax = 0; next = 0; called = false; yes = 0; s2 = 0; walking = false; ready = false;
      cum.length = 0; cum.push(0);
      for (let i = 1; i < R.length; i++) cum.push(cum[i - 1] + Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]));
      len = cum[cum.length - 1];
      const t = ++tok, W = a.world, h0 = Math.atan2(R[1][0] - R[0][0], R[1][1] - R[0][1]);
      rue = W.actor('rue19') || W.spawn('rue19', [R[0][0], 0, R[0][1], h0]);
      if (walk !== 1 || Math.hypot(rue.pos.x - R[0][0], rue.pos.z - R[0][1]) > 4) rue.place([R[0][0], 0, R[0][1], h0]);
      rue.pos.y = SETS.square.floor(rue.pos.x, rue.pos.z);
      hy = walk === 1 ? rue.rotY : h0; lx = rue.pos.x; lz = rue.pos.z;
      mine.length = 0;
      if (walk !== 2) for (const p of PEOPLE) if (!W.actor(p.id)) { mine.push(p.id); W.spawn(p.id, [0, 0, 30, 0]).visible = false; }
      Object.assign(cp, walk === 2 ? { d: 2.4, h: 1.75, s: 0, a: 2, y: 1.2 } : FAR); Object.assign(tg, cp);
      camTick(0);
      api.cam.override('fixed', cam);
      if (api.cam.cutscene) api.cam.release(walk === 2 ? 0 : 1.2);
      promptEl = document.getElementById('prompt');
      if (walk === 2) {
        player.control(null);
        rue.walkAnim = 'walk';
        if (typeof music === 'function') music('held_note', { fade: 2 });
        crowd = W.prop('umbrella_crowd'); crowdWas = crowd ? crowd.visible : true; if (crowd) crowd.visible = false;
        const s = sm = smears(), sc = W.scene;   // its program compiles off the main thread where the browser can
        if (renderer.compileAsync) renderer.compileAsync(s, W.camera, sc).then(() => { if (sm === s) sc.add(s); }, () => { if (sm === s) sc.add(s); });
        else sc.add(s);
      } else {
        if (walk === 3) rue.walkAnim = 'walk';
        player.control('rue19'); player.follower(null); player.enabled = true;
        run(t);
      }
      autoOn = false;
    },
    update(dt) {
      if (done || !rue) return;
      const x = rue.pos.x, z = rue.pos.z, mv = Math.hypot(x - lx, z - lz);
      if (walk === 2) {
        const go = autoOn || Math.hypot(input.move.x, input.move.y) > 0.25;
        if (go) {
          s2 = Math.min(len, s2 + 1.15 * dt);
          at(s2, pt); rue.pos.x = pt[0]; rue.pos.z = pt[2]; rue.pos.y = SETS.square.floor(pt[0], pt[2]); rue.rotY = pt[1];
          if (!walking) { walking = true; rue.play('walk', { speed: 0.75 }); }
        } else if (walking) { walking = false; rue.play('idle'); }
        hy = at(s2, pt)[1];
        const u = s2 / len; tg.d = 2.4 + 9 * u; tg.h = 1.75 + 6.5 * u; tg.a = 2 - 2 * u; tg.y = 1.2 - 1.2 * u;
        // the smears; the greyed NO whenever one passes close
        let near = false;
        for (let i = 0; i < SM.n; i++) {
          SM.x[i] += SM.vx[i] * dt; SM.z[i] += SM.vz[i] * dt;
          if (Math.abs(SM.x[i]) > 19 || Math.abs(SM.z[i]) > 14) { SM.vx[i] = -SM.vx[i]; SM.vz[i] = -SM.vz[i]; }
          if (Math.max(Math.abs(SM.x[i]), Math.abs(SM.z[i])) < 4.4) { SM.x[i] += SM.vx[i] * dt * 3; SM.z[i] += SM.vz[i] * dt * 3; }
          D.position.set(SM.x[i], 0, SM.z[i]); D.rotation.set(0, Math.atan2(SM.vx[i], SM.vz[i]), 0); D.updateMatrix(); sm.setMatrixAt(i, D.matrix);
          const ex = SM.x[i] - x, ez = SM.z[i] - z; if (ex * ex + ez * ez < 12) near = true;
        }
        sm.instanceMatrix.needsUpdate = true;
        if (near !== grey) { grey = near; ui.prompt(near ? 'NO' : null); if (promptEl) promptEl.style.opacity = near ? '0.35' : ''; }
        if (input.pressed('no')) input.consume('no');   // nothing responds
        if (s2 >= len) { done = true; rue.play('idle'); api.finish({ done: true }); return; }
      } else {
        if (mv > 1e-3) { hy += Math.atan2(Math.sin(rue.rotY - hy), Math.cos(rue.rotY - hy)) * Math.min(1, dt * 1.1); }
        pmax = Math.max(pmax, progress(x, z));
        // walk 1: steering at the Campanile makes him veer away on his own
        if (walk === 1 && !veering && !busy && mv > 1e-3) {
          const r = Math.hypot(x, z);
          if (r < RC && (Math.sin(rue.rotY) * -x + Math.cos(rue.rotY) * -z) / (r || 1) > 0.5) veer(tok);
        }
      }
      lx = x; lz = z;
      camTick(dt);
    },
    end() {
      done = true; tok++;
      ui.prompt(null); ui.letterbox(false);
      if (promptEl) promptEl.style.opacity = '';
      grey = false;
      if (sm) { sm.removeFromParent(); sm.geometry.dispose(); sm.dispose(); sm = null; }
      if (crowd) { crowd.visible = crowdWas; crowd = null; }
      if (rue) rue.walkAnim = 'swagger';
      for (const id of mine) api.world.despawn(id);
      api.cam.override(null);
      player.enabled = false;
      if (api.world.actor(state.active)) player.control(state.active);
    },
    async autoplay(a) {
      const t = tok;
      if (walk === 2) { autoOn = true; return; }
      await driver(t);
    },
  };
})();
