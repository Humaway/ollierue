
// ============================================================ WORLD (ENGINE-B1)
// Sets (one THREE.Scene each, the fixed light rig, env lerps, LRU of two live sets), actors (pooled rigs,
// blob shadows, moves, anims, tics), the player (modern/tank, colliders, follower breadcrumbs), gameplay
// cameras (zones + fixed/pan/rail/push, overrides), the cutscene camera (frame(), shots, moves),
// split screen and time-lapse. Update/render paths only write into preallocated temporaries.

const { world, cam, frame, player } = (() => {
  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const V = () => new THREE.Vector3();
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const smooth = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  const EASE = { linear: (u) => u, in: (u) => u * u * u, out: (u) => 1 - (1 - u) ** 3 };
  const angTo = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
  const damp = (rate, dt) => 1 - Math.exp(-rate * dt);
  const skipping = () => typeof flow !== 'undefined' && flow.skipping;
  const settle = (o, k) => { const r = o[k]; o[k] = null; if (r) r(); };
  const t1 = V(), t2 = V(), t3 = V(), t4 = V(), t5 = V(), tc = new THREE.Color(), size2 = new THREE.Vector2(), box3 = new THREE.Box3();

  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.05, 600);
  const camR = new THREE.PerspectiveCamera(40, 1, 0.05, 600);   // right half of a split

  // ------------------------------------------------------------ sets
  const live = new Map();          // setId -> entry, oldest first (LRU)
  let cur = null, splitE = null;

  const envNew = () => ({ bg: new THREE.Color(0x808080), fog: new THREE.Color(0x808080), dens: 0.01, hs: new THREE.Color(), hg: new THREE.Color(0x444444),
    hi: 1, dc: new THREE.Color(), di: 1, dp: V().set(5, 10, 5), sc: new THREE.Color(), si: 0, sp: false, rain: 0 });
  function envCopy(o, s) {
    o.bg.copy(s.bg); o.fog.copy(s.fog); o.dens = s.dens; o.hs.copy(s.hs); o.hg.copy(s.hg); o.hi = s.hi;
    o.dc.copy(s.dc); o.di = s.di; o.dp.copy(s.dp); o.sc.copy(s.sc); o.si = s.si; o.sp = s.sp; o.rain = s.rain; return o;
  }
  // rain amount when a preset doesn't say: rainy sets rain except in 'sun'; any preset named *rain* rains
  const rainFor = (def, name) => (name === 'sun' ? 0 : (def.ambience && def.ambience.rain) || /rain/.test(name) ? 1 : 0);
  function envFill(o, p, name, e) {   // o already holds the base; the preset overrides what it names
    if (p.bg != null) o.bg.set(p.bg);
    if (p.fog) { o.fog.set(p.fog[0]); if (p.fog[1] != null) o.dens = p.fog[1]; }
    if (p.hemi) { o.hs.set(p.hemi[0]); if (p.hemi[1] != null) o.hg.set(p.hemi[1]); if (p.hemi[2] != null) o.hi = p.hemi[2]; }
    if (p.dir) { o.dc.set(p.dir[0]); if (p.dir[1] != null) o.di = p.dir[1]; if (p.dir[2]) o.dp.fromArray(p.dir[2]); }
    o.sp = !!p.spot; if (p.spot) { o.sc.set(p.spot[0]); o.si = p.spot[1] ?? 0; }
    o.rain = p.rain ?? (name ? rainFor(e.def, name) : o.rain);
    return o;
  }
  function envLerp(o, a, b, k) {
    o.bg.lerpColors(a.bg, b.bg, k); o.fog.lerpColors(a.fog, b.fog, k); o.dens = a.dens + (b.dens - a.dens) * k;
    o.hs.lerpColors(a.hs, b.hs, k); o.hg.lerpColors(a.hg, b.hg, k); o.hi = a.hi + (b.hi - a.hi) * k;
    o.dc.lerpColors(a.dc, b.dc, k); o.di = a.di + (b.di - a.di) * k; o.dp.lerpVectors(a.dp, b.dp, k);
    o.sc.lerpColors(a.sc, b.sc, k); o.si = a.si + (b.si - a.si) * k; o.sp = b.sp; o.rain = a.rain + (b.rain - a.rain) * k;
  }
  function envApply(e, s) {
    e.scene.background.copy(s.bg); e.scene.fog.color.copy(s.fog); e.scene.fog.density = s.dens;
    e.hemi.color.copy(s.hs); e.hemi.groundColor.copy(s.hg); e.hemi.intensity = s.hi;
    e.dir.color.copy(s.dc); e.dir.intensity = s.di; e.dir.position.copy(s.dp);
    if (s.sp) { e.spot.color.copy(s.sc); e.spot.intensity = s.si; }
    if (e.rain) { e.rain.uniforms.uAmount.value = clamp(s.rain, 0, 1); e.rain.visible = s.rain > 0.01; }
  }
  function envSet(e, p, dur = 0) {
    if (!e) return Promise.resolve();
    const name = typeof p === 'string' ? p : null, pr = name ? e.def.env && e.def.env[name] : p;
    if (!pr) { testLog('world.env: no preset ' + p + ' in ' + e.id); return Promise.resolve(); }
    settle(e, 'envRes');
    if (name) e.envName = e.ctx.env = name;
    envCopy(e.from, e.env); envFill(envCopy(e.to, e.env), pr, name, e);
    if (!(dur > 0) || skipping()) { e.envDur = 0; envEnd(e); return Promise.resolve(); }
    e.envT = 0; e.envDur = dur;
    return new Promise((r) => { e.envRes = r; });
  }
  function envEnd(e) {
    const wet = e.env.rain > 0;
    envCopy(e.env, e.to); envApply(e, e.env);
    if ((e.env.rain > 0) !== wet && e === cur) ambience(e);
  }
  function envTick(e, dt) {
    if (!(e.envDur > 0)) return;
    e.envT += dt;
    if (e.envT >= e.envDur) { e.envDur = 0; envEnd(e); settle(e, 'envRes'); return; }
    envLerp(e.env, e.from, e.to, smooth(e.envT / e.envDur)); envApply(e, e.env);
  }
  function ambience(e) {
    if (typeof AUDIO === 'undefined') return;
    const a = e.def.ambience || {};
    if (AUDIO.ambience) AUDIO.ambience({ rain: e.env.rain > 0, loops: a.loops || [] });
    if (AUDIO.setRoom) AUDIO.setRoom(a.room || 'none');
  }

  // pooled smoke/spark puffs: one Points per set (in the scene from build, so its program is warmed)
  const PUFF = 64;
  let puffMat = null;
  function makePuff() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PUFF * 3), 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PUFF * 4), 4).setUsage(THREE.DynamicDrawUsage));
    puffMat ||= new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, depthWrite: false,
      map: canvasTex(64, 64, (c, w, h) => {
        const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
      }, { key: 'puff' }) });
    const pts = new THREE.Points(g, puffMat);
    pts.frustumCulled = false; pts.visible = false; pts.name = 'puff';
    pts.userData = { vel: new Float32Array(PUFF * 3), life: new Float32Array(PUFF), max: new Float32Array(PUFF), g: new Float32Array(PUFF), next: 0 };
    return pts;
  }
  function puffTick(e, dt) {
    const pz = e.puff;
    if (!pz.visible) return;
    const u = pz.userData, pos = pz.geometry.attributes.position, col = pz.geometry.attributes.color, pa = pos.array, ca = col.array;
    let alive = 0;
    for (let j = 0; j < PUFF; j++) {
      if (u.life[j] <= 0) continue;
      if ((u.life[j] -= dt) <= 0) { ca[j * 4 + 3] = 0; continue; }
      alive++;
      const v = u.vel, k = 1 - 1.6 * dt;
      v[j * 3 + 1] -= u.g[j] * dt; v[j * 3] *= k; v[j * 3 + 1] *= k; v[j * 3 + 2] *= k;
      pa[j * 3] += v[j * 3] * dt; pa[j * 3 + 1] += v[j * 3 + 1] * dt; pa[j * 3 + 2] += v[j * 3 + 2] * dt;
      ca[j * 4 + 3] = 0.85 * u.life[j] / u.max[j];
    }
    pos.needsUpdate = true; col.needsUpdate = true;
    if (!alive) pz.visible = false;
  }

  function build(id) {
    const def = SETS[id];
    if (!def) throw new Error('RUE: no SETS.' + id);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(); scene.fog = new THREE.FogExp2(0x808080, 0.01);
    // the fixed light rig: never add/remove lights later (shader recompiles), only change values
    const hemi = new THREE.HemisphereLight(), dir = new THREE.DirectionalLight(), spot = new THREE.SpotLight(0xffffff, 0, 30, 0.33, 0.5, 1.5);
    spot.name = 'torch';
    scene.add(hemi, dir, spot, spot.target);
    const group = def.build();
    scene.add(group);
    const props = {};
    group.traverse((o) => { if (o.name && !props[o.name]) props[o.name] = o; });
    const anchors = {};
    for (const k in def.anchors || {}) {
      const a = def.anchors[k], at = Array.isArray(a) ? a : a.at;
      anchors[k] = { at: V().fromArray(at), from: a.from ? V().fromArray(a.from) : null, fov: a.fov ?? null };
    }
    const names = Object.keys(def.env || {}), amb = def.ambience || {};
    let rain = props.rain && props.rain.uniforms ? props.rain : null;
    if (!rain && (amb.rain || names.some((n) => /rain/.test(n) || def.env[n].rain > 0))) {
      const r = typeof amb.rain === 'object' ? amb.rain : {};
      let bx = r.box;
      if (!bx) { // walkable area (zones) + a margin, else the set's bounds, capped
        if (def.zones && def.zones.length) { bx = [1e9, 1e9, -1e9, -1e9]; for (const z of def.zones) { bx[0] = Math.min(bx[0], z.box[0]); bx[1] = Math.min(bx[1], z.box[1]); bx[2] = Math.max(bx[2], z.box[2]); bx[3] = Math.max(bx[3], z.box[3]); } bx = [bx[0] - 12, bx[1] - 12, bx[2] + 12, bx[3] + 12]; }
        else { box3.setFromObject(group); bx = [Math.max(box3.min.x, -30), Math.max(box3.min.z, -30), Math.min(box3.max.x, 30), Math.min(box3.max.z, 30)]; }
      }
      const area = (bx[2] - bx[0]) * (bx[3] - bx[1]);
      rain = makeRain({ box: bx, top: r.top ?? 12, bottom: r.bottom ?? 0, count: r.count ?? Math.round(clamp(area * 2.5, 1500, 6000)) });
      scene.add(rain);
    }
    const e = { id, def, scene, group, props, anchors, hemi, dir, spot, rain, puff: makePuff(),
      firstCam: Object.keys(def.cams || {})[0] || '',
      env: envNew(), from: envNew(), to: envNew(), envName: '', envT: 0, envDur: 0, envRes: null,
      ctx: { t: 0, player: null, running: false, env: '', props } };
    scene.add(e.puff);
    envApply(e, e.env);
    if (names.length) envSet(e, names[0]);
    return e;
  }

  const TEXK = ['map', 'emissiveMap', 'alphaMap', 'lightMap', 'aoMap', 'bumpMap', 'normalMap', 'specularMap'];
  function texUp(o) {
    const m = o.material;
    if (!m) return;
    for (const x of Array.isArray(m) ? m : [m]) {
      for (const k of TEXK) if (x[k] && x[k].isTexture) renderer.initTexture(x[k]);
      if (x.uniforms) for (const u in x.uniforms) { const v = x.uniforms[u].value; if (v && v.isTexture) renderer.initTexture(v); }
    }
  }
  function upload(e) { renderer.compile(e.scene, camera); e.scene.traverse(texUp); }
  function disposeGeo(e) { e.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
  function retire(e) {
    for (let i = A.length - 1; i >= 0; i--) if (A[i].set === e) despawnA(A[i]);
    settle(e, 'envRes');
    disposeGeo(e);                  // materials and textures stay cached (ART) so programs survive
    live.delete(e.id);
  }
  function trim() {
    for (const e of live.values()) { if (live.size <= 2) break; if (e !== cur && e !== splitE) retire(e); }
  }
  function ensure(id) {             // live entry for id (builds it), marked most recently used
    let e = live.get(id);
    if (e) { live.delete(id); live.set(id, e); return e; }
    e = build(id); live.set(id, e); upload(e); trim();
    return e;
  }
  function showE(e) {
    cur = e; W.set = e.def; W.setId = e.id;
    G.name = ''; snap = true;          // (the flow sets AUDIO.ambience/room after world.load)
  }

  // ------------------------------------------------------------ actors
  const actors = new Map(), A = [], pool = {};
  const ONE = { nod: 0.9, shake: 1, shrug: 1.2, give: 1.4, lanyard_on: 2, knock: 1.2, glance: 1.3, stand: 1 };  // one-shots (ART defaults)
  const LOCO = { walk: 1, run: 1, carry: 1, swagger: 1, turn: 1 };
  let kind = '';                    // what resolveWhere last found: mark | actor | anchor | point

  function resolveWhere(w, out, e = cur) {   // -> rotY (NaN when the place has none)
    kind = 'point';
    if (w == null) { out.set(0, 0, 0); return NaN; }
    if (Array.isArray(w)) { if (w.length === 2) out.set(w[0], 0, w[1]); else out.set(w[0], w[1], w[2]); return w.length > 3 ? w[3] : NaN; }
    if (w.isVector3) { out.copy(w); return NaN; }
    const m = e && e.def.marks && e.def.marks[w];
    if (m) { kind = 'mark'; out.set(m[0], m[1] || 0, m[2]); return m[3] ?? NaN; }
    const a = actors.get(w);
    if (a) { kind = 'actor'; out.copy(a.pos); return NaN; }
    const an = e && e.anchors[w];
    if (an) { kind = 'anchor'; out.copy(an.at); return NaN; }
    testLog('world: unknown place ' + w);
    out.set(0, 0, 0); return NaN;
  }
  function pointOf(x, out, e = cur) {        // a thing to look at: actor eyes, anchor, mark (chest height), [x,y,z]
    if (x == null) return false;
    const a = typeof x === 'string' && actors.get(x);
    if (a) { a.eyePos(out); return true; }
    if (typeof x === 'string' && e && e.anchors[x]) { out.copy(e.anchors[x].at); return true; }
    resolveWhere(x, out, e);
    if (kind === 'mark') out.y += 1.3;
    return true;
  }
  const floorAt = (e, x, z, y) => (e && e.def.floor ? e.def.floor(x, z) : y);
  const setAnim = (a, name, restart) => { if (restart) { a.anim = a.poseName = name; a.poseT = 0; } else if (a.anim !== name) a.anim = name; };
  const isUpper = (n) => n !== 'idle' && ANIMS[n] && ANIMS[n].upper && !ONE[n];

  function newActor(id, look, rig) {
    let shadow = rig.root.getObjectByName('blob');
    if (!shadow) { shadow = blobShadow(); rig.root.add(shadow); }
    const hs = rig.d && rig.d.hs ? rig.d.hs : 1;
    const a = {
      id, look, rig, root: rig.root, pos: rig.root.position, rotY: 0, anim: 'idle', expr: 'neutral', carry: null, follow: null,
      mood: null, habit: null, glanceAt: 'chase', walkAnim: look === 'rue19' ? 'swagger' : 'walk', set: null, shadow,
      p: { dur: 0, speed: 1, walk: false, still: false, yaw: 0.9, h: undefined },
      poseName: '', poseT: 0, ret: 'idle', back: false, playT: -1, playRes: null, glanceT: 2 + Math.random() * 4,
      mv: { on: false, to: V(), speed: 0, face: NaN, loco: 'walk', y0: 0, d0: 1, res: null },
      fc: { on: false, a0: 0, a1: 0, t: 0, dur: 0.3, res: null },
      held: null, heldBig: false, prev: V(), prevRot: 0, keep: V(),
    };
    Object.defineProperty(a, 'visible', { get: () => a.root.visible, set: (v) => { a.root.visible = !!v; } });
    a.eyePos = (v) => { a.root.updateMatrixWorld(true); return a.rig.parts.head.localToWorld(v.set(0, 0.134 * hs, 0.118 * hs)); };
    a.headPos = (v) => { a.root.updateMatrixWorld(true); return a.rig.parts.head.localToWorld(v.set(0, 0.13 * hs, 0.03)); };
    a.setExpr = (name) => { a.expr = name; a.rig.face.set(name); };
    a.place = (where) => {
      stopMove(a);
      const r = resolveWhere(where, a.pos, a.set);
      if (!isNaN(r)) a.rotY = r;
      a.prev.copy(a.pos); a.prevRot = a.rotY; a.root.rotation.y = a.rotY;
      if (P.fol === a || P.actor === a) crumbN = 0;
    };
    a.moveTo = (where, o = {}) => {
      const m = a.mv;
      settle(m, 'res'); settle(a.fc, 'res'); a.fc.on = false;
      const rot = resolveWhere(where, m.to, a.set);
      t1.set(m.to.x - a.pos.x, 0, m.to.z - a.pos.z);
      if (kind === 'actor' || kind === 'anchor') {   // walk up to it and face it
        const d = t1.length(), stop = kind === 'actor' ? 0.9 : 0.6;
        m.face = d > 0.01 ? Math.atan2(t1.x, t1.z) : NaN;
        const k = d > stop ? 1 - stop / d : 0;
        m.to.set(a.pos.x + t1.x * k, a.pos.y, a.pos.z + t1.z * k);
      } else m.face = o.face === false ? NaN : rot;
      const run = !!o.run;
      m.speed = o.speed || (a.heldBig ? CONFIG.carry : run ? CONFIG.run : CONFIG.walk);
      m.loco = a.heldBig ? 'carry' : run ? 'run' : a.walkAnim;
      m.y0 = a.pos.y; m.d0 = Math.max(0.001, Math.hypot(m.to.x - a.pos.x, m.to.z - a.pos.z));
      if (skipping() || m.d0 < 0.02) {
        a.pos.set(m.to.x, floorAt(a.set, m.to.x, m.to.z, m.to.y), m.to.z);
        if (!isNaN(m.face)) a.rotY = m.face;
        a.prev.copy(a.pos); a.prevRot = a.rotY;
        return Promise.resolve();
      }
      m.on = true;
      return new Promise((r) => { m.res = r; });
    };
    a.face = (target, dur = 0.3) => {
      let rot = a.rotY;
      if (typeof target === 'number') rot = target;
      else {
        resolveWhere(target, t1, a.set);
        if (Math.hypot(t1.x - a.pos.x, t1.z - a.pos.z) > 0.01) rot = Math.atan2(t1.x - a.pos.x, t1.z - a.pos.z);
      }
      return startFace(a, rot, dur);
    };
    a.play = (anim, o = {}) => {
      settle(a, 'playRes');
      const one = ONE[anim], back = !!one || o.loop === false, dur = o.dur ?? one ?? 0;
      if (back) a.ret = anim === 'stand' ? 'idle' : ONE[a.anim] || LOCO[a.anim] ? (a.back ? a.ret : 'idle') : a.anim;
      a.p.dur = o.dur || 0; a.p.speed = o.speed ?? 1; a.p.still = !!o.still;
      if (o.h != null) a.p.h = o.h;
      if (o.yaw != null) a.p.yaw = o.yaw;
      a.back = back;
      if (skipping()) { a.back = false; a.playT = -1; setAnim(a, back ? a.ret : anim, true); return Promise.resolve(); }
      setAnim(a, anim, true);
      a.playT = back ? (dur || 1.2) : dur > 0 ? dur : -1;
      if (a.playT > 0) return new Promise((r) => { a.playRes = r; });
      return Promise.resolve();
    };
    a.hold = (obj, hand = 'R') => {
      if (a.held) {   // put the current one back where it came from
        const o = a.held, h = o.userData.home;
        h.parent.add(o); o.position.copy(h.pos); o.quaternion.copy(h.quat);
        a.held = null; a.carry = null;
        if (a.heldBig && P.actor === a) P.speedMul = 1;
        a.heldBig = false;
      }
      const o = typeof obj === 'string' ? W.prop(obj) : obj;
      if (!o) return;
      if (!o.userData.home) o.userData.home = { parent: o.parent, pos: o.position.clone(), quat: o.quaternion.clone() };
      if (o.parent) o.parent.remove(o);
      o.position.set(0, 0, 0); o.quaternion.identity(); o.updateMatrixWorld(true);
      box3.setFromObject(o); box3.getCenter(t1); box3.getSize(t2);
      a.heldBig = Math.max(t2.x, t2.y, t2.z) > 0.45;
      if (a.heldBig) { a.root.add(o); o.position.set(-t1.x, 1.0 - t1.y, 0.45 - t1.z); if (P.actor === a) P.speedMul = 0.6; }
      else { (a.rig.attach['grip' + hand] || a.rig.parts['hand' + hand]).add(o); o.position.set(-t1.x, -t1.y, -t1.z); }
      a.held = o; a.carry = o.name || true;
    };
    return a;
  }
  function stopMove(a) { a.mv.on = false; settle(a.mv, 'res'); a.fc.on = false; settle(a.fc, 'res'); if (LOCO[a.anim]) setAnim(a, 'idle'); a.p.walk = false; }
  function startFace(a, rot, dur) {
    const f = a.fc;
    settle(f, 'res');
    const d = angTo(a.rotY, rot);
    if (Math.abs(d) < 0.01 || skipping() || !(dur > 0)) { a.rotY = a.rotY + d; f.on = false; return Promise.resolve(); }
    f.a0 = a.rotY; f.a1 = a.rotY + d; f.t = 0; f.dur = dur; f.on = true;
    return new Promise((r) => { f.res = r; });
  }
  function glance(a) {
    a.glanceT = 3 + Math.random() * 4;
    const c = actors.get(a.glanceAt);
    if (!c || c === a || c.set !== a.set) return;
    a.p.yaw = clamp(angTo(a.rotY, Math.atan2(c.pos.x - a.pos.x, c.pos.z - a.pos.z)), -1.3, 1.3);
    a.p.dur = 0; a.ret = 'idle'; a.back = true; a.playT = ONE.glance;
    setAnim(a, 'glance', true);
  }
  function poseOf(a) {
    if (a.anim === 'idle') {
      if (a.fc.on && !a.rig.seated && Math.abs(a.fc.a1 - a.fc.a0) > 0.4) return 'turn';
      if (a.mood === 'anxious') return 'lanyard';
    }
    return a.anim;
  }
  function actorTick(a, dt) {
    const m = a.mv, e = a.set;
    if (m.on) {
      const dx = m.to.x - a.pos.x, dz = m.to.z - a.pos.z, d = Math.hypot(dx, dz), step = m.speed * dt;
      if (isUpper(a.anim)) { a.p.walk = true; a.p.speed = m.speed / CONFIG.walk; }
      else { setAnim(a, m.loco); a.p.speed = m.speed / (m.loco === 'run' ? CONFIG.run : m.loco === 'carry' ? CONFIG.carry : CONFIG.walk); }
      if (d <= step) {
        a.pos.x = m.to.x; a.pos.z = m.to.z; a.pos.y = floorAt(e, a.pos.x, a.pos.z, m.to.y);
        m.on = false; a.p.walk = false;
        if (LOCO[a.anim]) setAnim(a, 'idle');
        const res = m.res; m.res = null;
        if (!isNaN(m.face)) { startFace(a, m.face, 0.3); if (a.fc.on) a.fc.res = res; else if (res) res(); } else if (res) res();   // already facing: resolve now
      } else {
        a.pos.x += dx / d * step; a.pos.z += dz / d * step;
        a.pos.y = floorAt(e, a.pos.x, a.pos.z, m.y0 + (m.to.y - m.y0) * (1 - (d - step) / m.d0));
        a.rotY += angTo(a.rotY, Math.atan2(dx, dz)) * Math.min(1, 10 * dt);
      }
    }
    const f = a.fc;
    if (f.on) {
      f.t += dt;
      const k = smooth(f.t / f.dur);
      a.rotY = f.a0 + (f.a1 - f.a0) * k;
      if (f.t >= f.dur) { f.on = false; settle(f, 'res'); }
    }
    if (a.playT > 0 && (a.playT -= dt) <= 0) {
      if (a.back) { a.back = false; setAnim(a, a.ret || 'idle'); }
      a.p.dur = 0; a.playT = -1; settle(a, 'playRes');
    }
    if (a.habit === 'glance' && a.anim === 'idle' && !m.on && !a.playRes && (a.glanceT -= dt) <= 0) glance(a);
    const n = poseOf(a);
    if (n !== a.poseName) { a.poseName = n; a.poseT = 0; } else a.poseT += dt;
    a.rig.update(dt);
  }
  function despawnA(a) {
    if (a.held) a.hold(null);
    stopMove(a); settle(a, 'playRes');
    a.rig.talk(false);
    if (a.root.parent) a.root.parent.remove(a.root);
    actors.delete(a.id); A.splice(A.indexOf(a), 1);
    if (P.actor === a) P.actor = null;
    if (P.fol === a) P.fol = null;
    a.set = null; a.root.visible = true; a.rig.seated = false;
    (pool[a.look] ||= []).push(a.rig);
  }
  function spawn(id, where, o = {}) {
    const e = o.set ? ensure(o.set) : cur;
    if (!e) throw new Error('RUE: world.spawn before world.load');
    const look = o.look || id;
    let a = actors.get(id);
    if (a && a.look !== look) { despawnA(a); a = null; }
    if (!a) {
      const rig = (pool[look] && pool[look].pop()) || buildCharacter(look);
      a = newActor(id, look, rig);
      actors.set(id, a); A.push(a);
      a.setExpr((LOOKS[look] && LOOKS[look].expr) || 'neutral');
    }
    if (a.set !== e) { e.scene.add(a.root); a.set = e; }
    a.visible = true;
    setAnim(a, 'idle', true); a.back = false; a.playT = -1; settle(a, 'playRes');
    a.place(where);
    return a;
  }

  // ------------------------------------------------------------ player + follower
  const CRN = 128, CR = new Float32Array(CRN * 3);
  let crumbH = 0, crumbN = 0;       // ring buffer of the leader's positions (head = next write)
  const crumb = (i, out) => out.set(CR[i * 3], CR[i * 3 + 1], CR[i * 3 + 2]);   // i = ring index
  const P = {
    actor: null, enabled: false, speedMul: 1, running: false, fol: null, frozenT: 0, ctrlYaw: 0,
    control(id) {
      const a = id ? actors.get(id) : null;
      if (P.actor && P.actor !== a && LOCO[P.actor.anim]) setAnim(P.actor, 'idle');
      P.actor = a || null;
      if (a) { if (P.fol === a) P.fol = null; a.follow = null; P.speedMul = a.heldBig ? 0.6 : 1; }
      crumbN = 0;
    },
    follower(id) {
      if (P.fol) P.fol.follow = null;
      P.fol = id ? actors.get(id) || null : null;
      if (P.fol) P.fol.follow = P.actor ? P.actor.id : null;
      crumbN = 0;
    },
    frozen(sec) { P.frozenT = Math.max(P.frozenT, sec || 0); },
  };
  function collide(a, x, z, e) {
    const r = CONFIG.radius, cl = e.def.colliders;
    for (let it = 0; it < 2; it++) {
      if (cl) for (let i = 0; i < cl.length; i++) {
        const b = cl[i], cx = clamp(x, b[0], b[2]), cz = clamp(z, b[1], b[3]), dx = x - cx, dz = z - cz, d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; x += dx * k; z += dz * k; }
        else {   // centre inside the box: out the nearest side
          const l = x - b[0], rr = b[2] - x, t = z - b[1], bo = b[3] - z, m = Math.min(l, rr, t, bo);
          if (m === l) x = b[0] - r; else if (m === rr) x = b[2] + r; else if (m === t) z = b[1] - r; else z = b[3] + r;
        }
      }
      for (let i = 0; i < A.length; i++) {
        const o = A[i];
        if (o === a || o.set !== e || !o.root.visible || o === P.fol) continue;
        const dx = x - o.pos.x, dz = z - o.pos.z, d2 = dx * dx + dz * dz, rr = r * 2;
        if (d2 < rr * rr && d2 > 1e-8) { const d = Math.sqrt(d2), k = (rr - d) / d; x += dx * k; z += dz * k; }
      }
    }
    a.pos.x = x; a.pos.z = z; a.pos.y = floorAt(e, x, z, a.pos.y);
  }
  function playerTick(dt) {
    const a = P.actor;
    P.running = false;
    if (!a || !P.enabled || a.set !== cur || a.mv.on) {
      if (a && LOCO[a.anim] && !a.mv.on) setAnim(a, 'idle');
      P.ctrlYaw = Math.atan2(cs.look.x - cs.pos.x, cs.look.z - cs.pos.z);
      return;
    }
    const mx = input.move.x, my = input.move.y, tank = options.controls === 'tank';
    if (P.frozenT > 0) { P.frozenT -= dt; if (LOCO[a.anim]) setAnim(a, 'idle'); return; }
    let dx = 0, dz = 0, mag = 0, turning = false;
    if (tank) {
      if (Math.abs(mx) > 0.2) { a.rotY -= mx * CONFIG.turn * dt; turning = true; }
      if (Math.abs(my) > 0.2) { const s = my > 0 ? 1 : -0.6; dx = Math.sin(a.rotY) * s; dz = Math.cos(a.rotY) * s; mag = Math.abs(my); }
    } else {
      mag = Math.min(1, Math.hypot(mx, my));
      if (mag < 0.15) { P.ctrlYaw = Math.atan2(cs.look.x - cs.pos.x, cs.look.z - cs.pos.z); mag = 0; }   // re-read the camera only while released
      else {
        const fx = Math.sin(P.ctrlYaw), fz = Math.cos(P.ctrlYaw), n = Math.hypot(mx, my);
        dx = (fx * my - fz * mx) / n; dz = (fz * my + fx * mx) / n;
        a.rotY += angTo(a.rotY, Math.atan2(dx, dz)) * Math.min(1, 14 * dt);
      }
    }
    if (mag > 0) {
      const run = input.run && !a.heldBig && !(tank && my < 0);
      const sp = (run ? CONFIG.run : CONFIG.walk) * P.speedMul * mag;
      collide(a, a.pos.x + dx * sp * dt, a.pos.z + dz * sp * dt, cur);
      const loco = a.heldBig ? 'carry' : run ? 'run' : a.walkAnim;
      setAnim(a, loco); a.p.walk = false;
      a.p.speed = sp / (run ? CONFIG.run : a.heldBig ? CONFIG.carry : CONFIG.walk);
      P.running = run;
    } else if (turning) { setAnim(a, 'turn'); }
    else if (LOCO[a.anim]) setAnim(a, 'idle');
  }
  function offCamera(a) {
    t5.set(a.pos.x, a.pos.y + 1, a.pos.z).project(camera);
    return t5.z > 1 || Math.abs(t5.x) > 1.05 || Math.abs(t5.y) > 1.05;
  }
  function followerTick(dt) {
    const f = P.fol, L = P.actor;
    if (!f || !L || f === L || f.set !== L.set || f.mv.on || !P.enabled) return;
    const e = L.set;
    // breadcrumbs: every 0.35 m the leader moves
    const last = (crumbH - 1 + CRN) % CRN;
    if (!crumbN || Math.hypot(L.pos.x - CR[last * 3], L.pos.z - CR[last * 3 + 2]) > 0.35) {
      CR[crumbH * 3] = L.pos.x; CR[crumbH * 3 + 1] = L.pos.y; CR[crumbH * 3 + 2] = L.pos.z;
      crumbH = (crumbH + 1) % CRN; crumbN = Math.min(CRN, crumbN + 1);
    }
    const dL = Math.hypot(f.pos.x - L.pos.x, f.pos.z - L.pos.z);
    if (dL > 8 && offCamera(f)) {   // fell behind off-screen: reappear on the trail ~1.5 m behind
      let i = (crumbH - 1 + CRN) % CRN, n = crumbN, acc = 0;
      crumb(i, t4).copy(L.pos);
      while (n-- > 1 && acc < 1.5) { const j = (i - 1 + CRN) % CRN; acc += Math.hypot(CR[j * 3] - CR[i * 3], CR[j * 3 + 2] - CR[i * 3 + 2]); i = j; }
      if (crumbN > 1) crumb(i, t4); else t4.set(L.pos.x - Math.sin(L.rotY) * 1.4, L.pos.y, L.pos.z - Math.cos(L.rotY) * 1.4);
      f.pos.copy(t4); f.prev.copy(t4); f.rotY = f.prevRot = L.rotY; crumbN = 0;
      return;
    }
    if (dL < 1.3) { if (LOCO[f.anim]) setAnim(f, 'idle'); return; }
    let tail = (crumbH - crumbN + CRN) % CRN;
    while (crumbN > 1 && Math.hypot(f.pos.x - CR[tail * 3], f.pos.z - CR[tail * 3 + 2]) < 0.3) { tail = (tail + 1) % CRN; crumbN--; }
    const tx = crumbN ? CR[tail * 3] : L.pos.x, tz = crumbN ? CR[tail * 3 + 2] : L.pos.z;
    const dx = tx - f.pos.x, dz = tz - f.pos.z, d = Math.hypot(dx, dz);
    if (d < 1e-4) return;
    const run = dL > 3.5 || P.running, sp = run ? CONFIG.run : CONFIG.walk, step = Math.min(d, sp * dt);
    f.pos.x += dx / d * step; f.pos.z += dz / d * step; f.pos.y = floorAt(e, f.pos.x, f.pos.z, f.pos.y);
    f.rotY += angTo(f.rotY, Math.atan2(dx, dz)) * Math.min(1, 10 * dt);
    setAnim(f, run ? 'run' : f.walkAnim); f.p.speed = 1; f.p.walk = false;
  }
  // Torchlight: while world.torch is on it rides in the player's right hand, aimed ahead at the ground
  function torchTick(e) {
    const s = e.spot, a = P.actor;
    if (s.intensity <= 0 || shotAt.jarvis || !W.torchAuto || !a || a.set !== e) return;
    const fx = Math.sin(a.rotY), fz = Math.cos(a.rotY);
    s.position.set(a.pos.x + fx * 0.3 - fz * 0.18, a.pos.y + 1.25, a.pos.z + fz * 0.3 + fx * 0.18);
    s.target.position.set(a.pos.x + fx * 7, a.pos.y + 0.1, a.pos.z + fz * 7);
  }

  // ------------------------------------------------------------ framing: frame(subjects, size, opts)
  const F = { pos: V(), look: V(), fov: 40, up: V().set(0, 0, -1) };
  const SP = [], SF = [], SA = [];
  for (let i = 0; i < 8; i++) { SP.push(V()); SF.push(V()); SA.push(null); }
  let nS = 0, nAct = 0, feetY = 0, eyeY = 0, logMiss = false;
  const DY = { ECU: -0.03, CLOSE: -0.08, MID: -0.35, TWO: -0.3, THREE: -0.35, TOP: 0 };
  const C25 = Math.cos(25 * DEG), S25 = Math.sin(25 * DEG), C20 = Math.cos(20 * DEG), S20 = Math.sin(20 * DEG);
  const FO = { angle: null, side: null, dist: null, height: 0, fov: null, offset: 0, facing: false };  // frame options, filled per call

  function addSubj(x, e) {
    if (nS >= 8 || x == null) return;
    SA[nS] = null;
    if (typeof x !== 'string') { if (x.isVector3) SP[nS].copy(x); else SP[nS].set(x[0], x[1], x[2]); SF[nS++].set(0, 0, 0); return; }
    const a = actors.get(x);
    if (a) { a.eyePos(SP[nS]); SF[nS].set(Math.sin(a.rotY), 0, Math.cos(a.rotY)); SA[nS] = a; feetY += a.pos.y; eyeY += SP[nS].y; nS++; nAct++; return; }
    const an = e && e.anchors[x];
    if (an) { SP[nS].copy(an.at); if (an.from) SF[nS].set(an.from.x - an.at.x, 0, an.from.z - an.at.z).normalize(); else SF[nS].set(0, 0, 0); nS++; return; }
    const m = e && e.def.marks && e.def.marks[x];
    if (m) { SP[nS].set(m[0], (m[1] || 0) + 1.55, m[2]); SF[nS].set(Math.sin(m[3] || 0), 0, Math.cos(m[3] || 0)); nS++; return; }
    if (logMiss) testLog('cam: nothing called ' + x);
  }
  function gather(on, e) {
    nS = 0; nAct = 0; feetY = 0; eyeY = 0;
    if (on == null) { for (let i = 0; i < A.length; i++) if (A[i].set === e && A[i].root.visible) addSubj(A[i].id, e); }
    else if (Array.isArray(on) && typeof on[0] !== 'number') { for (let i = 0; i < on.length; i++) addSubj(on[i], e); }
    else addSubj(on, e);
    if (nAct) { feetY /= nAct; eyeY /= nAct; }
    return nS;
  }
  function aimInto(out, on, size, e) {    // the point a framing looks at
    if (!gather(on, e)) return 0;
    out.set(0, 0, 0);
    for (let i = 0; i < nS; i++) out.add(SP[i]);
    out.divideScalar(nS);
    if (nAct) { if (size === 'WIDE') out.y = feetY + 1.0; else out.y += DY[size] ?? -0.3; }
    return nS;
  }
  const inZones = (x, z, zs, pad) => { for (let i = 0; i < zs.length; i++) { const b = zs[i].box; if (x >= b[0] - pad && x <= b[2] + pad && z >= b[1] - pad && z <= b[3] + pad) return true; } return false; };
  function fitZones(Pp, L, e) {           // keep a computed camera inside the playable space: come closer, open the lens
    const zs = e && e.def.zones;
    if (!zs || !zs.length || !inZones(L.x, L.z, zs, 0.6) || inZones(Pp.x, Pp.z, zs, 0.6)) return 1;
    for (let s = 0.9; s > 0.2; s -= 0.1) {
      const x = L.x + (Pp.x - L.x) * s, z = L.z + (Pp.z - L.z) * s;
      if (inZones(x, z, zs, 0.6)) { Pp.set(x, L.y + (Pp.y - L.y) * s, z); return s; }
    }
    return 1;
  }
  // where frameInto puts the lens for direction d, distance D (not TOP)
  function lensAt(P, L, d, D, o, size) {
    if (o.angle === 'high') P.set(L.x + d.x * D * C25, L.y + D * S25, L.z + d.z * D * C25);
    else if (o.angle === 'low') { P.set(L.x + d.x * D * C20, L.y - D * S20, L.z + d.z * D * C20); P.y = Math.max(P.y, (nAct ? feetY : L.y - 1.2) + 0.15); }
    else P.set(L.x + d.x * D, nAct ? (size === 'WIDE' ? feetY + 1.55 : eyeY) : L.y, L.z + d.z * D);
    if (o.height) P.y += o.height;
    return P;
  }
  // first set surface FACING the lens between lens P and point L (what would actually render in front of the
  // subject; back faces, hidden props and see-through glass don't count). 0 = clear. Shot cuts only, never per frame.
  const RC = new THREE.Raycaster(), HITS = [], tl = V(), tr = V();
  let hitD = 0;
  function rayWalk(o) {
    if (!o.visible) return;
    if (o.isMesh && !o.isSkinnedMesh) { const m = o.material; if (!(m && m.transparent && m.opacity < 0.6)) o.raycast(RC, HITS); }
    const ch = o.children;
    for (let i = 0; i < ch.length; i++) rayWalk(ch[i]);
  }
  function occluded(P, L, e) {
    tr.subVectors(L, P);
    const len = tr.length();
    if (len < 0.35) return 0;
    RC.set(P, tr.divideScalar(len)); RC.near = 0.02; RC.far = len - 0.3;
    HITS.length = 0; rayWalk(e.group);
    let m = 0;
    for (let i = 0; i < HITS.length; i++) if (!m || HITS[i].distance < m) m = HITS[i].distance;
    HITS.length = 0;
    return m;
  }
  // is the lens low inside a collider (counter, desk: colliders have no height, so only below ~1.1 m), behind a surface facing it, or is someone who isn't in the shot
  // standing between the lens and the subjects? (hitD = distance to the occluding surface, when that's the reason)
  function blocked(L, d, D, o, size, e) {
    hitD = 0;
    lensAt(tl, L, d, D, o, size);
    const cl = e && e.def.colliders;
    if (cl && tl.y < 1.1) for (let i = 0; i < cl.length; i++) { const b = cl[i]; if (tl.x > b[0] - 0.08 && tl.x < b[2] + 0.08 && tl.z > b[1] - 0.08 && tl.z < b[3] + 0.08) return true; }
    for (let i = 0; i < A.length; i++) {
      const a = A[i];
      if (a.set !== e || !a.root.visible) continue;
      let sub = false;
      for (let j = 0; j < nS; j++) if (SA[j] === a) sub = true;
      if (sub) continue;
      const ax = a.pos.x - L.x, az = a.pos.z - L.z, t = ax * d.x + az * d.z;
      if (t > 0.25 && t < D + 0.3 && Math.abs(ax * d.z - az * d.x) < 0.45) return true;
    }
    hitD = occluded(tl, L, e);
    return hitD > 0;
  }
  const TURNS = [0, 0.6, -0.6, 1.2, -1.2, 1.57, -1.57];
  const GP = { set: null, pos: V() }, GST = { base: V(), pushT: 0 };   // a stand-in 'player' at a group, for set cameras
  function distFor(d, L, size, dist, fv, fit) {
    if (!fit) return dist ?? CONFIG.dist[size] ?? (size === 'TOP' ? 1.5 : CONFIG.dist.MID);
    const tanH = Math.tan(fv * DEG / 2) * aspectNow(), mg = size === 'WIDE' ? 1 : 0.6;   // fit everyone with a margin
    let D = size === 'WIDE' ? CONFIG.dist.WIDE : 1.5;
    for (let i = 0; i < nS; i++) {
      const x = SP[i].x - L.x, z = SP[i].z - L.z;
      D = Math.max(D, (Math.abs(x * d.z - z * d.x) + mg) / tanH + (x * d.x + z * d.z));
    }
    return D;
  }
  const aspectNow = () => { renderer.getSize(size2); return (splitE ? 0.5 : 1) * size2.x / Math.max(1, size2.y); };

  function frameInto(out, on, size, o, e) {
    size = size || 'MID';
    const L = out.look, Pp = out.pos;
    if (!aimInto(L, on, size, e)) { Pp.copy(cs.pos); L.copy(cs.look); out.fov = cs.fov; return false; }
    const f = t1.set(0, 0, 0);
    for (let i = 0; i < nS; i++) f.add(SF[i]);
    if (nS > 1 && !o.facing) {           // groups: look across the line between them
      t2.set(SP[nS - 1].x - SP[0].x, 0, SP[nS - 1].z - SP[0].z);
      const len = t2.length();
      if (len > 0.25) {
        t3.set(-t2.z / len, 0, t2.x / len);
        const s = f.dot(t3) / nS;
        if (s < -0.3) t3.negate();
        else if (s < 0.3 && (SP[0].x - L.x) * t3.z - (SP[0].z - L.z) * t3.x > 0) t3.negate();   // facing each other: first subject frame-left
        f.copy(t3);
      }
    }
    if (f.lengthSq() < 0.01) f.set(cs.pos.x - L.x, 0, cs.pos.z - L.z);
    if (f.lengthSq() < 1e-6) f.set(0, 0, 1);
    f.normalize();
    const side = o.side || '';
    if (side.startsWith('ots:')) {       // over that actor's (right) shoulder, looking at the subject
      const oa = actors.get(side.slice(4));
      if (oa) {
        oa.eyePos(t3);
        t2.set(t3.x - L.x, 0, t3.z - L.z).normalize();
        Pp.set(t3.x + t2.x * 0.95 + t2.z * 0.38, t3.y + 0.06 + (o.height || 0), t3.z + t2.z * 0.95 - t2.x * 0.38);
        L.lerp(t3, 0.12);                  // subject toward the right third, the shoulder on the left
        out.fov = o.fov ?? CONFIG.fov;
        return true;
      }
    }
    const d = t2;
    if (side === 'back') d.copy(f).negate();
    else if (side === 'left') d.set(f.z, 0, -f.x);
    else if (side === 'right') d.set(-f.z, 0, f.x);
    else if (o.angle === 'side') { d.set(f.z, 0, -f.x); if (d.x * (cs.pos.x - L.x) + d.z * (cs.pos.z - L.z) < 0) d.negate(); }   // profile on the camera's side
    else d.copy(f);
    const fv = o.fov ?? (size === 'ECU' ? CONFIG.ecuFov : CONFIG.fov), fit = o.dist == null && (size === 'TWO' || size === 'THREE' || (size === 'WIDE' && nS > 1));
    const top = o.angle === 'top' || size === 'TOP';
    let D = distFor(d, L, size, o.dist, fv, fit);
    let pull = 1;
    if (!top && !o.facing && blocked(L, d, D, o, size, e)) {   // a clean frame: swing round (35°, 70°, 90° for one person) if the lens is in or behind a wall, or someone else is in the way
      t4.copy(d);
      const nT = nS > 1 ? 5 : TURNS.length;
      for (let k = 1; k <= nT; k++) {
        if (k === nT) {                   // nowhere clean: keep the intended angle but come in front of whatever is in the way,
          d.copy(t4); D = distFor(d, L, size, o.dist, fv, fit);   // or (a WIDE, or a group that can't) take the set's own camera for where they stand
          if (blocked(L, d, D, o, size, e) && hitD > 0) { const len = tl.distanceTo(L); pull = (len - hitD - 0.15) / len; }
          const zc = nS > 1 && (size === 'WIDE' || pull < 0.3) && zoneCam(e, L);
          if (zc && e.def.cams[zc]) { GP.set = e; GP.pos.set(L.x, L.y - 1.2, L.z); setCamInto(out, e, zc, GP, 0, true, GST); out.up.set(-d.x, 0, -d.z); return true; }
          pull = clamp(pull, 0.25, 1);
          break;
        }
        const c = Math.cos(TURNS[k]), sn = Math.sin(TURNS[k]);
        d.set(t4.x * c + t4.z * sn, 0, -t4.x * sn + t4.z * c);
        D = distFor(d, L, size, o.dist, fv, fit);
        if (!blocked(L, d, D, o, size, e)) break;
      }
    }
    out.up.set(-d.x, 0, -d.z);           // "up" for near-vertical views (crane from the sky, top-downs)
    if (top) { Pp.set(L.x, L.y + D, L.z); out.up.copy(f); if (o.height) Pp.y += o.height; }
    else { lensAt(Pp, L, d, D, o, size); if (pull < 1) Pp.sub(L).multiplyScalar(pull).add(L); }
    if (o.offset) { Pp.x += d.z * o.offset; Pp.z -= d.x * o.offset; L.x += d.z * o.offset; L.z -= d.x * o.offset; }
    const fz = top ? 1 : fitZones(Pp, L, e), s = fz * pull;
    if (size === 'WIDE' && nS > 1 && fz < 0.6) {   // a room too small for a wide: the set's own camera for where they stand
      const zc = zoneCam(e, L);
      if (zc && e.def.cams[zc]) { GP.set = e; GP.pos.set(L.x, L.y - 1.2, L.z); setCamInto(out, e, zc, GP, 0, true, GST); return true; }
    }
    out.fov = s < 1 ? Math.min(75, 2 * Math.atan(Math.tan(fv * DEG / 2) / s) / DEG) : fv;
    return true;
  }
  function fillFO(o) {
    FO.angle = o.angle || null; FO.side = o.side || null; FO.dist = o.dist ?? null; FO.height = o.height || 0;
    FO.fov = o.fov ?? null; FO.offset = o.offset || 0; FO.facing = !!o.facing;
    return FO;
  }
  function frameFn(subjects, size = 'MID', opts = {}) {
    frameInto(F, subjects, String(size).toUpperCase(), fillFO(opts), cur);
    return F;
  }

  // ------------------------------------------------------------ camera state
  const cs = { pos: V(), look: V(), fov: 40 }, cp = { pos: V(), look: V(), fov: 40 }, gs = { pos: V(), look: V(), fov: 45 };
  let snap = true, locked = false;
  const copyCam = (o, s) => { o.pos.copy(s.pos); o.look.copy(s.look); o.fov = s.fov; };
  const dirInto = (out, p, yaw, pitch, len) => out.set(p.x + Math.sin(yaw) * Math.cos(pitch) * len, p.y + Math.sin(pitch) * len, p.z + Math.cos(yaw) * Math.cos(pitch) * len);
  const yawOf = (p, l) => Math.atan2(l.x - p.x, l.z - p.z), pitchOf = (p, l) => Math.atan2(l.y - p.y, Math.hypot(l.x - p.x, l.z - p.z));

  // gameplay: set cams + zones, or an override
  const G = { name: '', mode: null, opts: null, st: { base: V(), pushT: 0 } };
  const zoneCam = (e, pa) => {         // pa = an actor or a point
    const zs = e.def.zones, p = pa && (pa.pos || pa);
    if (!p || !zs) return '';
    for (let i = 0; i < zs.length; i++) { const b = zs[i].box; if (p.x >= b[0] && p.x <= b[2] && p.z >= b[1] && p.z <= b[3]) return zs[i].cam; }
    return '';
  };
  function setCamInto(out, e, name, pa, dt, cut, st) {
    const c = e.def.cams && e.def.cams[name];
    if (!c) {                             // no cameras at all: a plain overview of the actors
      if (!frameInto(out, null, 'WIDE', fillFO({ angle: 'high' }), e)) { out.pos.set(0, 6, 10); out.look.set(0, 1, 0); out.fov = 45; }
      return;
    }
    const k = cut ? 1 : damp(5, dt), fixedLook = Array.isArray(c.look);
    const tgt = t4;
    if (fixedLook) tgt.fromArray(c.look);
    else if (pa && pa.set === e) tgt.set(pa.pos.x, pa.pos.y + 1.2, pa.pos.z);
    else if (c.base) tgt.fromArray(c.base);
    else if (c.pos) tgt.set(c.pos[0], c.pos[1] - 1, c.pos[2] - 5);
    else tgt.set(0, 1, 0);
    // position
    if (c.type === 'rail' && c.from && c.to) {
      const ax = c.from[0], az = c.from[2], bx = c.to[0] - ax, bz = c.to[2] - az;
      const u = clamp(((tgt.x - ax) * bx + (tgt.z - az) * bz) / Math.max(1e-6, bx * bx + bz * bz), 0, 1);
      t3.set(ax + bx * u, c.from[1] + (c.to[1] - c.from[1]) * u, az + bz * u);
      if (cut) out.pos.copy(t3); else out.pos.lerp(t3, k);
    } else if (c.type === 'push' && c.to) {
      if (cut) st.pushT = 0; else st.pushT += dt;
      const u = smooth(st.pushT / (c.dur || 20));
      out.pos.set(c.pos[0] + (c.to[0] - c.pos[0]) * u, c.pos[1] + (c.to[1] - c.pos[1]) * u, c.pos[2] + (c.to[2] - c.pos[2]) * u);
    } else out.pos.fromArray(c.pos || c.from || [0, 5, 10]);
    // look
    if (fixedLook) out.look.copy(tgt);
    else {
      const lim = c.limit ?? (c.type === 'pan' ? 0.5 : 0);
      if (lim > 0) {                      // pan: follow the player within ±limit of the base direction
        if (cut) { if (c.base) st.base.fromArray(c.base); else st.base.copy(tgt); }
        const by = yawOf(out.pos, st.base), bp = pitchOf(out.pos, st.base);
        const yaw = by + clamp(angTo(by, yawOf(out.pos, tgt)), -lim, lim), pitch = bp + clamp(pitchOf(out.pos, tgt) - bp, -lim, lim);
        dirInto(tgt, out.pos, yaw, pitch, Math.max(1, out.pos.distanceTo(tgt)));
      }
      if (cut) out.look.copy(tgt); else out.look.lerp(tgt, k);
    }
    out.fov = c.fov ?? 45;
  }
  function followInto(out, pa, o, dt, cut) {
    const dist = o.dist ?? 2.4, h = o.height ?? 1.7, lag = Math.max(0.05, o.lag ?? 0.35), fx = Math.sin(pa.rotY), fz = Math.cos(pa.rotY);
    t4.set(pa.pos.x - fx * dist, pa.pos.y + h, pa.pos.z - fz * dist);
    if (cut) out.pos.copy(t4); else out.pos.lerp(t4, damp(1 / lag, dt));
    const ahead = o.look === 'player' ? 0 : 3;
    t4.set(pa.pos.x + fx * ahead, pa.pos.y + (ahead ? 1.1 : 1.35), pa.pos.z + fz * ahead);
    if (cut) out.look.copy(t4); else out.look.lerp(t4, damp(1.5 / lag, dt));
    out.fov = o.fov ?? 50;
  }
  function gameTick(dt) {
    const e = cur, pa = P.actor && P.actor.set === e ? P.actor : null;
    let name;
    if (G.mode === 'follow' && pa) name = 'follow';
    else if (G.mode === 'fixed') name = 'fixed';
    else if (G.mode === 'set') name = G.opts.name;
    else name = zoneCam(e, pa) || G.name || e.firstCam;
    if (!name) name = '(overview)';
    const cut = name !== G.name;
    G.name = name;
    if (name === 'follow') followInto(gs, pa, G.opts, dt, cut);
    else if (name === 'fixed') {
      const o = G.opts;
      gs.pos.fromArray(o.pos);
      if (Array.isArray(o.look)) gs.look.fromArray(o.look); else if (pa) gs.look.set(pa.pos.x, pa.pos.y + 1.2, pa.pos.z);
      gs.fov = o.fov ?? 45;
    } else setCamInto(gs, e, name, pa, dt, cut, G.st);
    return cut;
  }

  // cutscene shots
  const shotState = () => ({ kind: '', move: '', subj: null, size: 'MID', reaim: false, t: 0, dur: 0, ease: smooth,
    pos: V(), look: V(), fov: 40, pos0: V(), look0: V(), fov0: 40, up: V().set(0, 0, -1), off: V(), aim: V(), lat: V(), start: { pos: V(), look: V(), fov: 40 }, end: { pos: V(), look: V(), fov: 40 },
    a0: 0, a1: 0, amount: 1, y0: 0, p0: 0, y1: 0, p1: 0, len: 1, len1: 1, fo: { ...FO }, trackSide: 'left', setcam: '', st: { base: V(), pushT: 0 } });
  const S = shotState(), SR = shotState();
  const shotAt = { on: false, near: 0.05, jarvis: null, spot: { c: new THREE.Color(), i: 0, a: 0 } };   // jarvis = the entry whose spot we borrowed
  const ALIAS = { 'TWO-SHOT': 'TWO', 'THREE-SHOT': 'THREE', 'TOP-DOWN': 'TOP', 'JARVIS-CAM': 'JARVIS', LOW: 'MID', HIGH: 'MID', OTS: 'MID' };
  const MOVES = { PUSH: 'push', PULL: 'pull', TRACK: 'track', PAN: 'pan', TILT: 'tilt', CRANE: 'crane', ORBIT: 'orbit', WHIP: 'whip', CRASH: 'crash' };
  const SIZES = { ECU: 1, CLOSE: 1, MID: 1, WIDE: 1, TWO: 1, THREE: 1, TOP: 1 };

  // base framing for any shot kind into o (a shotState) — used by cam.shot and the right half of a split
  function baseInto(o, step, e) {
    logMiss = true;
    const ok = baseKind(o, step, e);
    logMiss = false;
    if (ok && o.kind !== 'TOP' && !(o.kind === 'INSERT' && step.angle === 'top') && SIZES[o.kind] !== 1) {
      t1.set(o.look0.x - o.pos0.x, 0, o.look0.z - o.pos0.z);
      if (t1.lengthSq() > 1e-4) o.up.copy(t1.normalize());
    }
    return ok;
  }
  function baseKind(o, step, e) {
    let k = String(step.shot || 'MID').toUpperCase();
    const raw = k;
    if (MOVES[k]) k = String(step.size || 'MID').toUpperCase();
    k = ALIAS[k] || k;
    o.kind = k; o.subj = null; o.reaim = false; o.lat.set(0, 0, 0); o.up.set(0, 0, -1);
    Object.assign(o.fo, fillFO(step));
    if (raw === 'LOW' || raw === 'HIGH') o.fo.angle = raw.toLowerCase();
    if (k === 'SET') { setCamInto(o, e, step.cam, P.actor, 0, true, o.st); o.setcam = step.cam; copyTo0(o); return true; }
    if (k === 'CAM') {
      o.pos0.fromArray(step.pos); o.look0.fromArray(step.look); o.fov0 = step.fov ?? CONFIG.fov;
      if (step.to) { o.end.pos.fromArray(step.to.pos || step.pos); o.end.look.fromArray(step.to.look || step.look); o.end.fov = step.to.fov ?? o.fov0; }
      return true;
    }
    if (k === 'INSERT' || k === 'JARVIS') {
      const id = step.at ?? step.on, an = e.anchors[id];
      if (k === 'INSERT' && !an && actors.get(id)) {   // an actor's hands/chest
        frameInto(F, id, 'CLOSE', fillFO({ angle: 'high', dist: step.dist ?? 0.8, fov: step.fov ?? 35 }), e);
        o.pos0.copy(F.pos); o.pos0.y -= 0.3; o.look0.copy(F.look); o.look0.y -= 0.35; o.fov0 = F.fov;
        return true;
      }
      if (!an && Array.isArray(id)) { o.look0.fromArray(id); o.pos0.fromArray(step.from || [id[0], id[1] + 0.3, id[2] + 0.6]); o.fov0 = step.fov ?? 35; return true; }
      if (!an) { testLog('cam: no anchor ' + id); return false; }
      o.look0.copy(an.at);
      if (an.from) o.pos0.copy(an.from); else o.pos0.set(an.at.x, an.at.y + 0.35, an.at.z + 0.6);
      o.fov0 = step.fov ?? an.fov ?? (k === 'INSERT' ? 35 : CONFIG.fov);
      if (k === 'INSERT' && step.angle === 'top') {
        if (an.from) o.up.set(an.from.x - an.at.x, 0, an.from.z - an.at.z).normalize();
        o.pos0.set(an.at.x, an.at.y + (step.dist ?? 0.7), an.at.z);
      }
      if (k === 'JARVIS' && step.on && gather(step.on, e)) {   // look out at the faces, lens wide enough for all of them
        t3.set(0, 0, 0); for (let i = 0; i < nS; i++) t3.add(SP[i]); t3.divideScalar(nS); t3.y -= 0.05;
        o.look0.copy(t3);
        t2.subVectors(t3, o.pos0).normalize();
        let ang = 0;
        for (let i = 0; i < nS; i++) ang = Math.max(ang, t2.angleTo(t1.subVectors(SP[i], o.pos0)));
        const vf = 2 * Math.atan(Math.tan(ang + 0.14) / aspectNow()) / DEG;
        o.fov0 = clamp(Math.max(o.fov0, vf), 20, 70);
      }
      return true;
    }
    if (k === 'POV') {
      const a = actors.get(step.from);
      if (a) { a.eyePos(o.pos0); o.pos0.x += Math.sin(a.rotY) * 0.06; o.pos0.z += Math.cos(a.rotY) * 0.06; }
      else if (e.anchors[step.from]) o.pos0.copy(e.anchors[step.from].from || e.anchors[step.from].at);
      else pointOf(step.from, o.pos0, e);
      if (!pointOf(step.at ?? step.on, o.look0, e) && a) o.look0.set(o.pos0.x + Math.sin(a.rotY) * 5, o.pos0.y, o.pos0.z + Math.cos(a.rotY) * 5);
      o.fov0 = step.fov ?? 45;
      return true;
    }
    if (!SIZES[k]) { testLog('cam: unknown shot ' + raw); k = o.kind = 'MID'; }
    if (!frameInto(F, step.on, k, o.fo, e)) {
      if (step.on != null) return false;
      setCamInto(o, e, e.firstCam, null, 0, true, o.st); copyTo0(o); return true;   // WIDE of nobody: the set's first camera
    }
    o.pos0.copy(F.pos); o.look0.copy(F.look); o.fov0 = F.fov; o.up.copy(F.up);
    o.subj = step.on ?? null; o.size = k;
    o.reaim = !step.locked && nAct > 0 && k !== 'TOP';
    if (o.fo.offset) o.lat.set(t2.z * o.fo.offset, 0, -t2.x * o.fo.offset);   // t2 = camera direction from frameInto
    return true;
  }
  function copyTo0(o) { o.pos0.copy(o.pos); o.look0.copy(o.look); o.fov0 = o.fov; }

  function endShotExtras() {
    if (shotAt.jarvis) { const s = shotAt.jarvis.spot, sv = shotAt.spot; s.color.copy(sv.c); s.intensity = sv.i; s.angle = sv.a; }
    shotAt.jarvis = null;
  }
  function shot(step) {
    if (!cur || !step) return;
    endShotExtras();
    settle(rel, 'res'); rel.on = false;
    copyCam(S.start, cs);
    if (!baseInto(S, step, cur)) {        // nothing to frame: hold the current angle
      copyCam(S, cs); copyTo0(S); S.kind = 'CAM'; S.move = ''; S.subj = null; S.reaim = false;
      C.cutscene = true; shotAt.on = true; return;
    }
    const k = S.kind, raw = String(step.shot || '').toUpperCase();
    let move = step.move ? String(step.move).toLowerCase().replace(/[^a-z].*$/, '') : MOVES[raw] || '';
    if (k === 'CAM' && step.to) move = 'glide';
    S.move = move; S.t = 0; S.ease = EASE[step.ease] || smooth;
    S.dur = move === 'whip' ? step.dur ?? 0.2 : move === 'crash' ? step.dur ?? 0.12 : step.dur ?? 3;
    S.off.subVectors(S.pos0, S.look0);
    S.aim.copy(S.look0);
    S.len = Math.max(0.5, S.off.length());
    if (move === 'push') { S.a0 = 1; S.a1 = step.amount ?? 0.6; }
    else if (move === 'pull') { S.a0 = 1; S.a1 = 1 / (step.amount ?? 0.6); }
    else if (move === 'crane') { S.a0 = step.from ?? 0; S.a1 = step.to ?? 2; S.amount = step.amount ?? 1; }
    else if (move === 'orbit') { S.a0 = (step.from ?? 0) * DEG; S.a1 = (step.to ?? 90) * DEG; }
    else if (move === 'crash') { S.a1 = step.fov ?? S.fov0 * 0.5; if (typeof sfx === 'function' && !skipping()) sfx('sting'); }
    else if (move === 'track') { const tr = step.track || 'alongside'; S.trackSide = tr === 'ahead' ? 'front' : tr === 'behind' ? 'back' : step.side === 'right' ? 'right' : 'left'; }
    else if (move === 'pan' || move === 'tilt') {
      S.y0 = yawOf(S.pos0, S.look0); S.p0 = pitchOf(S.pos0, S.look0); S.y1 = S.y0; S.p1 = S.p0; S.len1 = S.len;
      if (typeof step.to === 'string' || Array.isArray(step.to)) {
        if (pointOf(step.to, t3, cur)) { S.y1 = S.y0 + angTo(S.y0, yawOf(S.pos0, t3)); S.p1 = pitchOf(S.pos0, t3); S.len1 = Math.max(0.5, S.pos0.distanceTo(t3)); }
      } else if (move === 'tilt') { S.p0 += (step.from ?? 0) * DEG; S.p1 = S.p0 - (step.from ?? 0) * DEG + (step.to ?? 25) * DEG; }
      else { S.y0 -= (step.from ?? 0) * DEG; S.y1 = S.y0 + (step.from ?? 0) * DEG - (step.to ?? 30) * DEG; }   // degrees, + = right
    } else if (move === 'whip') {
      S.y0 = yawOf(S.start.pos, S.start.look); S.p0 = pitchOf(S.start.pos, S.start.look);
      S.y1 = yawOf(S.pos0, S.look0); S.p1 = pitchOf(S.pos0, S.look0); S.len1 = S.len;
    }
    C.cutscene = true; shotAt.on = true; shotAt.near = 0.05;
    if (skipping() && move !== 'track') S.t = S.dur;
    if (move === 'glide') { S.start.pos.copy(S.pos0); S.start.look.copy(S.look0); S.start.fov = S.fov0; }   // CAM glides from its own pos
    if (move !== 'whip') { cs.pos.copy(S.pos0); cs.look.copy(S.look0); cs.fov = S.fov0; }
    snap = true;
    shotTick(0);
    if (k === 'JARVIS') {                  // screens watch people: blue light from the screen onto the faces
      const s = cur.spot, sv = shotAt.spot, an = cur.anchors[step.at];
      sv.c.copy(s.color); sv.i = s.intensity; sv.a = s.angle; shotAt.jarvis = cur;
      s.position.copy(an ? an.at : S.pos0); s.target.position.copy(S.look0);
      const d = s.position.distanceTo(S.look0);
      s.color.set(0x7fb0ff); s.intensity = 2.5 * Math.pow(Math.max(0.3, d), 1.5); s.angle = 0.7;
      if (an) {                           // the camera sits behind the screen: start the lens just past it
        t1.subVectors(an.at, S.pos0); t2.subVectors(S.look0, S.pos0);
        const sd = t1.length();
        if (t1.dot(t2) > 0 && sd < t2.length() - 0.3) shotAt.near = sd + 0.15;
      }
    }
    C.name = String(step.shot) + (step.move ? ' ' + step.move : '') + (step.on != null ? ' ' + step.on : step.at != null ? ' ' + step.at : '');
  }
  function shotTick(dt) {
    if (locked) return;
    const s = S;
    if (s.kind === 'SET') { setCamInto(cs, cur, s.setcam, P.actor, dt, false, s.st); return; }
    s.t += dt;
    const u = s.dur > 0 ? Math.min(1, s.t / s.dur) : 1, k = s.ease(u);
    if (s.subj != null && s.kind !== 'TOP' && aimInto(s.aim, s.subj, s.size, cur)) s.aim.add(s.lat); else s.aim.copy(s.look0);
    switch (s.move) {
      case 'push': case 'pull': case 'crane': {
        const sc = s.move === 'crane' ? 1 + (s.amount - 1) * k : s.a0 + (s.a1 - s.a0) * k;
        cs.pos.copy(s.off).multiplyScalar(sc).add(s.aim);
        if (s.move === 'crane') cs.pos.y += s.a0 + (s.a1 - s.a0) * k;
        cs.look.copy(s.aim);
        break;
      }
      case 'orbit': {
        const a = s.a0 + (s.a1 - s.a0) * k, c = Math.cos(a), sn = Math.sin(a);
        cs.pos.set(s.aim.x + s.off.x * c + s.off.z * sn, s.aim.y + s.off.y, s.aim.z - s.off.x * sn + s.off.z * c);
        cs.look.copy(s.aim);
        break;
      }
      case 'track': {   // moves with the subject exactly; only the angle eases when they turn
        const tr = s.fo.side; s.fo.side = s.trackSide; s.fo.facing = true;
        if (frameInto(F, s.subj, s.size, s.fo, cur)) {
          t5.subVectors(F.pos, F.look);
          if (s.t < 0.02) s.off.copy(t5); else s.off.lerp(t5, damp(3, dt));
          cs.pos.copy(F.look).add(s.off); cs.look.copy(F.look); cs.fov = F.fov;
        }
        s.fo.side = tr;
        break;
      }
      case 'pan': case 'tilt':
        cs.pos.copy(s.pos0);
        dirInto(cs.look, cs.pos, s.y0 + (s.y1 - s.y0) * k, s.p0 + (s.p1 - s.p0) * k, s.len + (s.len1 - s.len) * k);
        break;
      case 'whip': {   // very fast pan with an overshoot and a lens breath: reads as motion blur, costs nothing
        const w = Math.sin(Math.PI * u), dy = angTo(s.y0, s.y1);
        cs.pos.lerpVectors(s.start.pos, s.pos0, k);
        dirInto(cs.look, cs.pos, s.y0 + dy * k + Math.sign(dy) * 0.16 * w, s.p0 + (s.p1 - s.p0) * k, s.len);
        cs.fov = s.start.fov + (s.fov0 - s.start.fov) * k + 9 * w;
        if (u >= 1) { s.move = ''; cs.pos.copy(s.pos0); cs.look.copy(s.look0); cs.fov = s.fov0; }
        break;
      }
      case 'crash': {   // snaps onto the face
        const e2 = EASE.out(u);
        cs.pos.copy(s.pos0); cs.look.copy(s.aim);
        if (s.subj != null && aimInto(t5, s.subj, 'CLOSE', cur)) cs.look.lerp(t5, e2);
        cs.fov = s.fov0 + (s.a1 - s.fov0) * e2;
        break;
      }
      case 'glide':
        cs.pos.lerpVectors(s.start.pos, s.end.pos, k); cs.look.lerpVectors(s.start.look, s.end.look, k);
        cs.fov = s.start.fov + (s.end.fov - s.start.fov) * k;
        break;
      default:
        if (s.reaim) cs.look.lerp(s.aim, damp(2.5, dt));   // the operator keeps the subject framed (a head lifting, a step)
    }
  }

  const rel = { on: false, t: 0, dur: 0.8, pos: V(), look: V(), fov: 40, res: null };
  function camTick(dt) {
    copyCam(cp, cs);
    const cut = gameTick(dt);
    if (shotAt.on) shotTick(dt);
    else if (rel.on) {
      rel.t += dt;
      const k = smooth(rel.t / rel.dur);
      cs.pos.lerpVectors(rel.pos, gs.pos, k); cs.look.lerpVectors(rel.look, gs.look, k); cs.fov = rel.fov + (gs.fov - rel.fov) * k;
      if (rel.t >= rel.dur) { rel.on = false; settle(rel, 'res'); }
    } else { copyCam(cs, gs); if (cut) snap = true; }
    if (!shotAt.on) C.name = G.name;
    if (snap) { copyCam(cp, cs); snap = false; }
  }

  const PROJ = { x: 0, y: 0, visible: false };
  let lastLW = 0, lastW = 0, lastH = 0;
  const C = {
    name: '', cutscene: false,
    get camera() { return camera; },
    shot,
    lock(on) { locked = !!on; },
    release(dur = 0.8) {
      endShotExtras();
      shotAt.on = false; C.cutscene = false; locked = false;
      settle(rel, 'res');
      if (!cur) return Promise.resolve();
      G.name = ''; gameTick(0);
      if (skipping() || !(dur > 0)) { rel.on = false; copyCam(cs, gs); snap = true; return Promise.resolve(); }
      rel.pos.copy(cs.pos); rel.look.copy(cs.look); rel.fov = cs.fov; rel.t = 0; rel.dur = dur; rel.on = true;
      return new Promise((r) => { rel.res = r; });
    },
    override(mode, opts = {}) {
      if (mode !== G.mode || mode === 'fixed' || mode === 'set') G.name = '';   // cut; a new 'follow' distance eases in
      G.mode = mode || null; G.opts = opts;
      if (!mode) G.name = '';
    },
    project(v) {
      t5.copy(v).project(camera);
      renderer.getSize(size2);
      const w = splitE ? lastLW || size2.x / 2 : size2.x;
      PROJ.x = (t5.x + 1) / 2 * w; PROJ.y = (1 - t5.y) / 2 * size2.y;
      PROJ.visible = t5.z < 1 && t5.z > -1 && Math.abs(t5.x) <= 1 && Math.abs(t5.y) <= 1;
      return PROJ;
    },
  };

  // aim a camera at a point; near-vertical views take their "up" from the subject so top-downs stay stable
  function aimCam(c, look, up) {
    t3.subVectors(look, c.position).normalize();
    const k = smooth((Math.abs(t3.y) - 0.93) / 0.065);
    c.up.set(up.x * k, 1 - k, up.z * k).normalize();
    c.lookAt(look);
  }

  // ------------------------------------------------------------ split screen + time-lapse
  const slide = { on: false, t: 0, res: null };
  function split(spec, o = {}) {
    if (!spec) {
      if (!splitE) return Promise.resolve();
      if (o.slide && !skipping()) { slide.on = true; slide.t = 0; return new Promise((r) => { slide.res = r; }); }
      splitE = null; return Promise.resolve();
    }
    const L = spec.left || {}, R = spec.right || {};
    if (L.set && (!cur || L.set !== cur.id)) showE(ensure(L.set));
    splitE = ensure(R.set);
    slide.on = false;
    const ls = L.shot ?? L.cam, rs = R.shot ?? R.cam;
    if (ls) C.shot(typeof ls === 'string' ? { shot: 'SET', cam: ls } : ls);
    if (!baseInto(SR, typeof rs === 'string' ? { shot: 'SET', cam: rs } : rs || { shot: 'WIDE' }, splitE)) { SR.pos0.set(0, 2, 6); SR.look0.set(0, 1, 0); SR.fov0 = 40; }
    camR.position.copy(SR.pos0); camR.fov = SR.fov0; aimCam(camR, SR.look0, SR.up); camR.updateProjectionMatrix();
    return Promise.resolve();
  }
  const TL = { on: false, t: 0, dur: 8, cycles: 3, a: envNew(), b: envNew(), keys: [], ki: 0, res: null, wasLocked: false };
  function fireKey(kk) {
    try {
      if (kk.do) kk.do();
      else if (kk.steps && typeof runSteps === 'function') runSteps(kk.steps);
    } catch (err) { console.error('RUE timelapse key', err); }
  }
  function timelapse(o = {}) {
    const e = cur;
    if (!e) return Promise.resolve();
    const pre = (p) => (typeof p === 'string' ? e.def.env && e.def.env[p] : p) || {};
    const fn = typeof o.from === 'string' ? o.from : 'day', tn = typeof o.to === 'string' ? o.to : 'night';
    envFill(envCopy(TL.a, e.env), pre(o.from ?? 'day'), fn, e);
    envFill(envCopy(TL.b, TL.a), pre(o.to ?? 'night'), tn, e);
    TL.keys = (o.keys || []).slice().sort((x, y) => x.t - y.t); TL.ki = 0; TL.t = 0;
    TL.dur = o.dur || 8; TL.cycles = o.cycles || 3;
    if (skipping()) { for (const kk of TL.keys) fireKey(kk); envCopy(e.env, TL.a); envApply(e, e.env); return Promise.resolve(); }
    settle(TL, 'res');
    TL.wasLocked = locked; locked = true; TL.on = true;
    return new Promise((r) => { TL.res = r; });
  }
  function tlTick(dt) {
    const e = cur;
    TL.t += dt;
    envLerp(e.env, TL.a, TL.b, 0.5 - 0.5 * Math.cos(TAU * TL.cycles * Math.min(1, TL.t / TL.dur)));
    envApply(e, e.env);
    while (TL.ki < TL.keys.length && (TL.keys[TL.ki].t <= TL.t || TL.t >= TL.dur)) fireKey(TL.keys[TL.ki++]);
    if (TL.t >= TL.dur) { TL.on = false; locked = TL.wasLocked; settle(TL, 'res'); }
  }

  // ------------------------------------------------------------ update + render
  function shown(a) { return a.set === cur || (a.set === splitE && splitE); }
  function setTick(e, dt) {
    const x = e.ctx;
    x.t = clock.t; x.player = P.actor; x.running = P.running; x.env = e.envName;
    if (e.def.update) e.def.update(dt, x);
    if (e.rain && e.rain.visible) e.rain.uniforms.uTime.value += dt;
    puffTick(e, dt);
  }
  function update(dt) {
    const e = cur;
    if (!e) return;
    envTick(e, dt);
    if (splitE) envTick(splitE, dt);
    if (TL.on) tlTick(dt);
    for (let i = 0; i < A.length; i++) { const a = A[i]; if (shown(a)) { a.prev.copy(a.pos); a.prevRot = a.rotY; } }
    playerTick(dt);
    followerTick(dt);
    for (let i = 0; i < A.length; i++) if (shown(A[i])) actorTick(A[i], dt);
    setTick(e, dt);
    if (splitE) setTick(splitE, dt);
    torchTick(e);
    camTick(dt);
    if (slide.on && (slide.t += dt) >= 0.6) { slide.on = false; splitE = null; settle(slide, 'res'); }
  }
  const lookI = V(), UPZ = V().set(0, 0, -1);
  function render(alpha) {
    const e = cur;
    if (!e) return;
    renderer.getSize(size2);
    const w = size2.x, h = size2.y, dtA = alpha * CONFIG.step;
    for (let i = 0; i < A.length; i++) {   // interpolate between the last two ticks, pose once per frame
      const a = A[i];
      if (!shown(a)) continue;
      a.keep.copy(a.pos); a.pos.lerpVectors(a.prev, a.keep, alpha);
      a.root.rotation.y = a.prevRot + angTo(a.prevRot, a.rotY) * alpha;
      if (a.root.visible) a.rig.pose(a.poseName || 'idle', a.poseT + dtA, a.p);
    }
    if (snap) copyCam(cp, cs);           // a cut since the last tick: never draw a frame in between the two shots
    camera.position.lerpVectors(cp.pos, cs.pos, alpha);
    lookI.lerpVectors(cp.look, cs.look, alpha);
    aimCam(camera, lookI, shotAt.on ? S.up : UPZ);
    const fov = cp.fov + (cs.fov - cp.fov) * alpha, near = shotAt.on ? shotAt.near : 0.05;
    if (camera.near !== near) { camera.near = near; lastLW = 0; }
    const lw = splitE ? Math.round(w * (slide.on ? 0.5 + 0.5 * smooth(slide.t / 0.6) : 0.5)) : w;
    if (camera.fov !== fov || lw !== lastLW || h !== lastH) { camera.fov = fov; camera.aspect = lw / h; camera.updateProjectionMatrix(); }
    if (!splitE) {
      renderer.render(e.scene, camera);
    } else {
      renderer.setScissorTest(false); renderer.setClearColor(0x000000, 1); renderer.clear();
      renderer.setScissorTest(true);
      const lv = slide.on ? lw : lw - 2;   // a thin black divide between the halves
      renderer.setViewport(0, 0, lv, h); renderer.setScissor(0, 0, lv, h);
      renderer.render(e.scene, camera);
      if (!slide.on) {
        if (w !== lastW || h !== lastH) { camR.aspect = (w - lw - 2) / h; camR.updateProjectionMatrix(); }
        renderer.setViewport(lw + 2, 0, w - lw - 2, h); renderer.setScissor(lw + 2, 0, w - lw - 2, h);
        renderer.render(splitE.scene, camR);
      }
      renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h);
    }
    lastLW = lw; lastW = w; lastH = h;
    if (typeof AUDIO !== 'undefined' && AUDIO.listener) AUDIO.listener(camera);   // after the render: matrixWorld is current
    for (let i = 0; i < A.length; i++) if (shown(A[i])) A[i].pos.copy(A[i].keep);
  }

  // ------------------------------------------------------------ world
  const W = {
    set: null, setId: null, actors, torchAuto: true, camera,
    get torch() { return cur ? cur.spot : null; },
    get scene() { return cur ? cur.scene : null; },
    async load(id, o = {}) {
      const e = ensure(id);
      if (o.env) envSet(e, o.env, 0);
      showE(e);
      trim();
    },
    preload(id) { ensure(id); return Promise.resolve(); },
    show(id) { showE(ensure(id)); trim(); },
    warm(id) {
      const had = live.get(id), e = had || build(id), hidden = [];
      e.scene.traverse((o) => { if (!o.visible) { hidden.push(o); o.visible = true; } });   // compile what appears later too
      const sh = blobShadow(); e.scene.add(sh);
      box3.setFromObject(e.group); box3.getCenter(t1); box3.getSize(t2);
      camera.position.set(t1.x + t2.x * 0.3, t1.y + t2.y + 2, t1.z + t2.z * 0.6); camera.lookAt(t1);
      camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
      upload(e);
      renderer.render(e.scene, camera);     // under the loader
      e.scene.remove(sh);
      for (const o of hidden) o.visible = false;
      if (!had) disposeGeo(e);
      snap = true; lastLW = 0;
    },
    env(p, dur = 0, setId) { return envSet(setId ? live.get(setId) : cur, p, dur); },
    spawn,
    despawn(id) { const a = actors.get(id); if (a) despawnA(a); },
    actor: (id) => actors.get(id),
    talk(id, on) {
      const a = actors.get(id);
      if (a) {
        a.rig.talk(on);
        if (on && a.habit === 'glance' && a.anim === 'idle' && !a.mv.on && !a.playRes) glance(a);   // he checks on Chase before he speaks
        return;
      }
      const c = CHARACTERS[id];
      if (c && c.voice && c.voice.also) for (const part of id.split('_')) if (actors.has(part)) actors.get(part).rig.talk(on);
    },
    prop(name) {
      if (cur && cur.props[name]) return cur.props[name];
      for (const e of live.values()) if (e.props[name]) return e.props[name];
      return undefined;
    },
    anchor: (name) => cur && cur.anchors[name],
    mark: (name) => cur && cur.def.marks && cur.def.marks[name],
    // world.puff(where, {n, color, speed, life, gravity}) — pooled smoke (default) or sparks ({color: 0xffd060, gravity: 6})
    puff(where, o = {}) {
      const e = cur;
      if (!e || skipping()) return;
      const pr = typeof where === 'string' && e.props[where];
      if (pr) pr.getWorldPosition(t1); else resolveWhere(where, t1, e);
      const pz = e.puff, u = pz.userData, pa = pz.geometry.attributes.position.array, ca = pz.geometry.attributes.color.array;
      tc.set(o.color ?? 0xb8b8b8);
      const n = o.n ?? 14, sp = o.speed ?? 0.6, life = o.life ?? 1.2, g = o.gravity ?? -0.5;
      for (let i = 0; i < n; i++) {
        const j = u.next; u.next = (j + 1) % PUFF;
        pa[j * 3] = t1.x + (Math.random() - 0.5) * 0.08; pa[j * 3 + 1] = t1.y + (Math.random() - 0.5) * 0.08; pa[j * 3 + 2] = t1.z + (Math.random() - 0.5) * 0.08;
        t2.set(Math.random() - 0.5, Math.random() * 0.8, Math.random() - 0.5).normalize().multiplyScalar(sp * (0.5 + Math.random()));
        u.vel[j * 3] = t2.x; u.vel[j * 3 + 1] = t2.y; u.vel[j * 3 + 2] = t2.z;
        u.life[j] = u.max[j] = life * (0.7 + Math.random() * 0.6); u.g[j] = g;
        ca[j * 4] = tc.r; ca[j * 4 + 1] = tc.g; ca[j * 4 + 2] = tc.b; ca[j * 4 + 3] = 0.85;
      }
      pz.visible = true;
    },
    update, render, split, timelapse,
  };

  return { world: W, cam: C, frame: frameFn, player: P };
})();
