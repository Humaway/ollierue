// ============================================================ SETS: buttery, theatre, lab, rooms
// Trinity College Dublin interiors, October 1987 (plus the street outside the Buttery's window).
// Each set is its own coordinate space (metres, Y up). Static geometry is vertex-coloured and merged into a
// handful of materials (Builder); tiling surfaces get world-projected UVs; signs, posters, screens and the
// blackboard are painted canvases. Seated students are instanced (crowd()). Scene dressing follows
// state.scene (dress()), so a set loaded for any scene shows the right props.
(() => {
  const PI = Math.PI, H = PI / 2;
  const tc = new THREE.Color(), m4 = new THREE.Matrix4();
  let b = null, M = null, COL = null, XF = null, TINT = null;

  // ------------------------------------------------------------ geometry into the current Builder `b`
  // Colour = hex x TINT, baked per vertex. s = tile size (m) for world-projected UVs on tiling textures.
  function put(g, hex, m, s) {
    if (XF) g.applyMatrix4(XF);
    tc.set(hex);
    if (TINT) { tc.r *= TINT[0]; tc.g *= TINT[1]; tc.b *= TINT[2]; }
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = tc.r; a[i * 3 + 1] = tc.g; a[i * 3 + 2] = tc.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    if (s) worldUV(g, s);
    b.add(g, m || M.vc);
  }
  function worldUV(g, s) {
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i) / s, p.getY(i) / s);
      else if (ay >= az) uv.setXY(i, p.getX(i) / s, p.getZ(i) / s);
      else uv.setXY(i, p.getX(i) / s, p.getY(i) / s);
    }
  }
  // box: y is the BOTTOM. bb: min/max corners. boxR: centred, any rotation. cyl/ico: centred.
  function box(w, h, d, hex, x, y, z, ry = 0, m, s) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y + h / 2, z); put(g, hex, m, s); }
  function bb(x0, y0, z0, x1, y1, z1, hex, m, s) { box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), hex, (x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2, 0, m, s); }
  function boxR(w, h, d, hex, x, y, z, rx = 0, ry = 0, rz = 0, m, s) {
    const g = new THREE.BoxGeometry(w, h, d); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); if (ry) g.rotateY(ry); g.translate(x, y, z); put(g, hex, m, s);
  }
  function cyl(rt, rb, h, seg, hex, x, y, z, rx = 0, rz = 0, m) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); put(g, hex, m); }
  function ico(r, hex, x, y, z, sx = 1, sy = 1, sz = 1, m) { const g = new THREE.IcosahedronGeometry(r, 0); g.scale(sx, sy, sz); g.translate(x, y, z); put(g, hex, m); }
  // quad faces +Z before rotation (rx first, then ry). uv = [u0, v0, u1, v1] picks part of the texture.
  function quad(w, h, m, x, y, z, ry = 0, rx = 0, uv, hex = 0xffffff) {
    const g = new THREE.PlaneGeometry(w, h);
    if (uv) { const a = g.attributes.uv; for (let i = 0; i < 4; i++) a.setXY(i, a.getX(i) ? uv[2] : uv[0], a.getY(i) ? uv[3] : uv[1]); }
    if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); put(g, hex, m);
  }
  // a rod (cylinder) between two points
  const _a = new THREE.Vector3(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  function rod(ax, ay, az, bx, by, bz, r, hex, m) {
    _a.set(bx - ax, by - ay, bz - az); const len = _a.length();
    const g = new THREE.CylinderGeometry(r, r, len, 5); g.applyQuaternion(_q.setFromUnitVectors(UP, _a.normalize()));
    g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); put(g, hex, m);
  }
  const row = (i, n) => [0, 1 - (i + 1) / n, 1, 1 - i / n];          // atlas row i of n (row 0 = top of the canvas)
  const wall = (x0, z0, x1, z1, y0, y1, hex, m, s) => { bb(x0, y0, z0, x1, y1, z1, hex, m, s); COL.push([x0, z0, x1, z1]); };
  const at = (x, y, z, ry = 0) => (XF = m4.makeRotationY(ry).setPosition(x, y, z));
  // a separate Builder -> named Group (a prop). Coordinates inside fn are local (use at() for sub-frames).
  function part(name, fn, pos, ry = 0, o) {
    const pb = b, px = XF; b = new Builder(); XF = null;
    fn();
    const g = b.done(o); b = pb; XF = px;
    g.name = name;
    if (pos) g.position.set(pos[0], pos[1], pos[2]);
    g.rotation.y = ry;
    return g;
  }
  // one merged geometry (all pieces must use material m)
  function geoOf(fn, m) { const pb = b, px = XF, pm = M; b = new Builder(); XF = null; M = { ...M, vc: m }; fn(); const g = b.done().children[0].geometry; b = pb; XF = px; M = pm; return g; }
  const rng = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const clamp = (v, a, c) => (v < a ? a : v > c ? c : v);
  const sceneNow = () => (typeof state !== 'undefined' && state.scene) || 'P';
  const ord = (id) => SCENE_ORDER.indexOf(id);
  // hinged doors (doorLeaf): set door.userData.open = true/false; update() eases rotation.y toward openA / closedY
  function swing(d, dt, speed = 5) { if (d.userData.open !== undefined) d.rotation.y += ((d.userData.open ? d.userData.openA : d.userData.closedY) - d.rotation.y) * Math.min(1, dt * speed); }
  // the scene's HemisphereLight (sets read daylight from it to drive windows, tubes, light shafts)
  const hemiOf = (root) => { const s = root && root.parent; if (!s) return null; for (const o of s.children) if (o.isHemisphereLight) return o; return null; };

  // ------------------------------------------------------------ canvas painting
  function txt(c, s, x, y, font, color, align = 'center') { c.font = font; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); }
  const brickTex = () => canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = '#a89d8e'; c.fillRect(0, 0, w, h);
    const r = rng(7);
    for (let y = 0; y < 8; y++) for (let x = -1; x < 4; x++) {
      const v = 196 + r() * 44 | 0;
      c.fillStyle = `rgb(${v},${v - 5},${v - 12})`; c.fillRect(x * 32 + (y % 2 ? 16 : 0) + 1, y * 16 + 1, 30, 14);
    }
  }, { repeat: [1, 1], key: 'int_brick' });
  const carpetTex = () => canvasTex(64, 64, (c, w, h) => {
    const r = rng(11); c.fillStyle = '#d0d0d0'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 700; i++) { const v = 170 + r() * 85 | 0; c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(r() * w | 0, r() * h | 0, 1, 1); }
  }, { repeat: [1, 1], key: 'int_carpet' });
  // rain running down glass: mostly clear, streaks brighter (used with transparent materials)
  const streakTex = (key) => canvasTex(64, 128, (c, w, h) => {
    const r = rng(key.length * 13);
    c.fillStyle = 'rgba(150,170,185,0.30)'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 22; i++) {
      let x = r() * w; const y0 = r() * h, len = 20 + r() * 70;
      c.strokeStyle = `rgba(235,242,248,${0.35 + r() * 0.4})`; c.lineWidth = 1 + r() * 1.5; c.beginPath(); c.moveTo(x, y0);
      for (let y = y0; y < y0 + len; y += 8) { x += (r() - 0.5) * 2; c.lineTo(x, y); }
      c.stroke(); c.fillStyle = 'rgba(240,246,250,0.8)'; c.fillRect(x - 1.5, y0 + len - 2, 3, 4);
      if (y0 + len > h) { c.beginPath(); c.moveTo(x, y0 - h); c.lineTo(x, y0 + len - h); c.stroke(); }
    }
  }, { repeat: [1, 1], key });

  // ------------------------------------------------------------ seated 1987 students (instanced)
  // seats: [[x, y, z, rotY], ...]; y = the floor under their feet (hips at +0.46, hands on a desk at +0.76).
  // Group 'crowd'.userData: hide(i, on=true) / show(i) a seat, hideNear(x, z, on=true) hides the seat nearest
  // (x, z), look([x,y,z] | anchor name | mark name | null) turns every head toward a point (null = back to front),
  // fidget(dt) (the set's update calls it) turns the odd head now and then. Knitwear, duffle coats, big hair, scarves.
  const KNIT = [0x2f5a3a, 0x7a2a30, 0xc8a040, 0x2a3560, 0xe6dcc0, 0x8a8a8a, 0x2a7a7a, 0x5a3a70, 0xd08090, 0xb05a2a, 0x3a6a9a, 0x9a3a5a];
  const DUFFLE = [0xb08a58, 0x26304a, 0x2e4a36, 0x6a6a6a, 0x7a3a2a, 0xa07850];
  const JACKET = [0x4a6a9a, 0x222222, 0x7a5a3a, 0xa0c0d0, 0x5a5a6a, 0xc8b8a0, 0xd0a0b0];
  const TROUSERS = [0x3a5070, 0x222226, 0x6a4a30, 0x555555, 0x7a90b0, 0x3a3a4a, 0x8a7a5a, 0x5a6a8a];
  const SKIN = [0xf1c9a5, 0xe8b894, 0xf5d0b0, 0xdca982, 0xefc2a0, 0xf3d6bc];
  const HAIR = [0x2a1a10, 0x4a2c18, 0x8a5a2a, 0xc89a50, 0xe0c080, 0x151210, 0x9a4a1d, 0x5a3a22, 0xb86a30];
  const SCARF = [0x7a1a2a, 0x1a2a5a, 0x2a5a2a, 0xc8a040, 0x5a2a6a, 0x2a6a8a];
  const PIV = new THREE.Vector3(0, 1.05, 0);
  function crowdMats() {
    return {
      face: matTex(canvasTex(64, 64, (c) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#ece4de'; c.fillRect(28, 28, 8, 14);
        c.fillStyle = '#6a5040'; c.fillRect(13, 16, 14, 4); c.fillRect(37, 16, 14, 4);
        c.fillStyle = '#fbfbfb'; c.fillRect(15, 23, 11, 7); c.fillRect(38, 23, 11, 7);
        c.fillStyle = '#231c1a'; c.fillRect(18, 23, 6, 7); c.fillRect(40, 23, 6, 7);
        c.fillStyle = '#a86e66'; c.fillRect(23, 47, 18, 4);
      }, { key: 'crowd_face' })),
      knit: matTex(canvasTex(64, 64, (c) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, 64, 64);
        c.fillStyle = '#d4d4d4'; for (let x = 0; x < 64; x += 4) c.fillRect(x, 0, 1, 64);
        c.fillStyle = '#8c8c8c'; c.fillRect(0, 18, 64, 14);
        c.fillStyle = '#fff'; for (let x = 0; x < 64; x += 8) { c.beginPath(); c.moveTo(x, 25); c.lineTo(x + 4, 20); c.lineTo(x + 8, 25); c.lineTo(x + 4, 30); c.fill(); }
        c.fillStyle = '#b0b0b0'; c.fillRect(0, 36, 64, 3); c.fillRect(0, 12, 64, 3); c.fillRect(0, 56, 64, 8);
      }, { key: 'crowd_knit' })),
      scarf: matTex(canvasTex(16, 64, (c) => {
        for (let y = 0; y < 64; y += 16) { c.fillStyle = '#fff'; c.fillRect(0, y, 16, 8); c.fillStyle = '#9a9a9a'; c.fillRect(0, y + 8, 16, 8); }
      }, { key: 'crowd_scarf' })),
    };
  }
  function skinBox(w, h, d, x, y, z, m, face) {   // box whose faces sample the plain skin corner, except the +Z face
    const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
    for (let i = 0; i < 24; i++) if (!face || i < 16 || i > 19) uv.setXY(i, 0.04, 0.04);
    g.translate(x, y, z); put(g, 0xffffff, m);
  }
  function crowd(seats, seed, def) {
    const r = rng(seed), n = seats.length, pick = (a) => a[r() * a.length | 0], X = crowdMats(), vc = mat(0xffffff);
    const arms = (w, m) => { for (const s of [-1, 1]) { boxR(w, 0.3, w + 0.01, 0xffffff, s * 0.25, 0.86, 0.02, -0.5, 0, 0, m); boxR(w - 0.01, w - 0.01, 0.3, 0xffffff, s * 0.2, 0.8, 0.24, 0, 0, 0, m); } };
    const G = {
      legs: geoOf(() => { for (const s of [-0.1, 0.1]) { bb(s - 0.085, 0.4, -0.08, s + 0.085, 0.54, 0.4, 0xffffff); bb(s - 0.075, 0.07, 0.3, s + 0.075, 0.5, 0.42, 0xffffff); bb(s - 0.08, 0, 0.28, s + 0.08, 0.08, 0.54, 0x3a3a3a); } }, vc),
      knit: geoOf(() => { boxR(0.4, 0.5, 0.24, 0xffffff, 0, 0.78, -0.04, 0.08, 0, 0, X.knit); boxR(0.16, 0.05, 0.2, 0xdddddd, 0, 1.03, -0.03, 0, 0, 0, X.knit); arms(0.11, X.knit); }, X.knit),
      duffle: geoOf(() => {
        boxR(0.46, 0.58, 0.3, 0xffffff, 0, 0.77, -0.05, 0.08); boxR(0.34, 0.16, 0.16, 0xd8d8d8, 0, 1.02, -0.21, 0.35); arms(0.13);
        for (let k = 0; k < 3; k++) boxR(0.07, 0.025, 0.02, 0x707070, 0.03, 0.62 + k * 0.13, 0.115, 0.08);
      }, vc),
      jacket: geoOf(() => {
        boxR(0.44, 0.5, 0.25, 0xffffff, 0, 0.78, -0.04, 0.08); boxR(0.54, 0.08, 0.26, 0xf0f0f0, 0, 1.0, -0.05, 0.08);   // 80s shoulders
        boxR(0.12, 0.3, 0.02, 0xbdbdbd, 0, 0.86, 0.09, 0.08); arms(0.12);
      }, vc),
      head: geoOf(() => { skinBox(0.1, 0.1, 0.1, 0, 1.03, -0.01, X.face, false); skinBox(0.19, 0.23, 0.21, 0, 1.19, 0.0, X.face, true); skinBox(0.04, 0.05, 0.03, 0, 1.17, 0.115, X.face, false); }, X.face),
      perm: geoOf(() => { ico(0.16, 0xffffff, 0, 1.26, -0.07, 1.3, 1.1, 1.05); ico(0.12, 0xe8e8e8, 0, 1.12, -0.12, 1.5, 1.2, 1.0); }, vc),
      short: geoOf(() => { bb(-0.105, 1.28, -0.11, 0.105, 1.35, 0.12, 0xffffff); bb(-0.105, 1.1, -0.125, 0.105, 1.31, -0.085, 0xf0f0f0); bb(-0.106, 1.16, -0.1, 0.106, 1.3, 0.02, 0xf4f4f4); boxR(0.2, 0.05, 0.08, 0xffffff, 0.02, 1.33, 0.09, 0.4, 0, 0.15); }, vc),
      long: geoOf(() => { bb(-0.12, 1.27, -0.13, 0.12, 1.36, 0.12, 0xffffff); bb(-0.13, 0.88, -0.15, 0.13, 1.33, -0.07, 0xf0f0f0); for (const s of [-1, 1]) bb(s * 0.1 - 0.025, 0.95, -0.1, s * 0.1 + 0.025, 1.3, 0.05, 0xf4f4f4); }, vc),
      scarf: geoOf(() => { bb(-0.13, 0.97, -0.12, 0.13, 1.06, 0.11, 0xffffff, X.scarf); boxR(0.09, 0.4, 0.03, 0xffffff, 0.07, 0.8, 0.14, 0.1, 0, 0.05, X.scarf); }, X.scarf),
    };
    const kind = [], hk = [], sk = [], C = { legs: [], body: [], skin: [], hair: [], scarf: [] };
    for (let i = 0; i < n; i++) {
      kind.push(r() * 3 | 0); hk.push(r() * 3 | 0); sk.push(r() < 0.3);
      C.legs.push(pick(TROUSERS)); C.body.push(pick([KNIT, DUFFLE, JACKET][kind[i]])); C.skin.push(pick(SKIN)); C.hair.push(pick(HAIR)); C.scarf.push(pick(SCARF));
    }
    const PARTS = [[G.legs, vc, () => true, C.legs, 0], [G.knit, X.knit, (i) => kind[i] === 0, C.body, 0], [G.duffle, vc, (i) => kind[i] === 1, C.body, 0],
      [G.jacket, vc, (i) => kind[i] === 2, C.body, 0], [G.head, X.face, () => true, C.skin, 1], [G.perm, vc, (i) => hk[i] === 0, C.hair, 1],
      [G.short, vc, (i) => hk[i] === 1, C.hair, 1], [G.long, vc, (i) => hk[i] === 2, C.hair, 1], [G.scarf, X.scarf, (i) => sk[i], C.scarf, 0]];
    const grp = new THREE.Group(), parts = [];
    grp.name = 'crowd';
    for (const [g, m, has, cols, head] of PARTS) {
      const idx = new Int16Array(n).fill(-1); let k = 0;
      for (let i = 0; i < n; i++) if (has(i)) idx[i] = k++;
      if (!k) continue;
      const im = new THREE.InstancedMesh(g, m, k);
      for (let i = 0; i < n; i++) if (idx[i] >= 0) im.setColorAt(idx[i], tc.set(cols[i]));
      parts.push({ im, idx, head }); grp.add(im);
    }
    const hidden = new Uint8Array(n), yaw = new Float32Array(n), pitch = new Float32Array(n), ly = new Float32Array(n), lp = new Float32Array(n);
    const base = new THREE.Matrix4(), hm = new THREE.Matrix4(), e = new THREE.Euler(0, 0, 0, 'YXZ'), v = new THREE.Vector3(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
    function seat(i) {
      const s = seats[i];
      base.makeRotationY(s[3]).setPosition(s[0], s[1], s[2]);
      hm.makeRotationFromEuler(e.set(pitch[i], yaw[i], 0)); v.copy(PIV).applyMatrix4(hm);
      hm.setPosition(PIV.x - v.x, PIV.y - v.y, PIV.z - v.z).premultiply(base);
      for (let p = 0; p < parts.length; p++) { const P = parts[p], k = P.idx[i]; if (k >= 0) { P.im.setMatrixAt(k, hidden[i] ? Z : P.head ? hm : base); P.im.instanceMatrix.needsUpdate = true; } }
    }
    let ft = 0;
    Object.assign(grp.userData, {
      count: n,
      hide(i, on = true) { hidden[i] = on ? 1 : 0; seat(i); },
      show(i) { hidden[i] = 0; seat(i); },
      hideNear(x, z, on = true) { let best = 0, d = 1e9; for (let i = 0; i < n; i++) { const dd = (seats[i][0] - x) ** 2 + (seats[i][2] - z) ** 2; if (dd < d) { d = dd; best = i; } } this.hide(best, on); return best; },
      look(p) {
        if (typeof p === 'string') { const a = def.anchors[p], m = def.marks[p]; p = a ? a.at : m ? [m[0], m[1] + 1.2, m[2]] : null; }
        for (let i = 0; i < n; i++) {
          const s = seats[i];
          if (p) {
            const dx = p[0] - s[0], dz = p[2] - s[2], a = Math.atan2(dx, dz) - s[3];
            ly[i] = clamp(Math.atan2(Math.sin(a), Math.cos(a)), -1.3, 1.3); lp[i] = -clamp(Math.atan2(p[1] - s[1] - 1.2, Math.hypot(dx, dz)), -0.5, 0.6);
          } else ly[i] = lp[i] = 0;
          yaw[i] = ly[i]; pitch[i] = lp[i]; seat(i);
        }
      },
      fidget(dt) {
        if ((ft -= dt) > 0) return;
        ft = 0.2 + Math.random() * 0.4;
        const i = Math.random() * n | 0;
        if (hidden[i]) return;
        yaw[i] = ly[i] + (Math.random() - 0.5) * 0.9; pitch[i] = lp[i] + (Math.random() - 0.35) * 0.35; seat(i);
      },
    });
    for (let i = 0; i < n; i++) seat(i);
    for (const P of parts) P.im.computeBoundingSphere();
    return grp;
  }

  // ------------------------------------------------------------ small props shared by the sets
  function cup(x, y, z, hex = 0xf2efe6) { cyl(0.075, 0.07, 0.01, 8, hex, x, y + 0.005, z); cyl(0.045, 0.034, 0.07, 8, hex, x, y + 0.045, z); cyl(0.04, 0.04, 0.004, 8, 0x8a5a32, x, y + 0.078, z); boxR(0.012, 0.04, 0.03, hex, x + 0.05, y + 0.05, z); }
  function mug(x, y, z, hex, ry = 0, tea = 0x7a4a26) {
    cyl(0.045, 0.043, 0.1, 8, hex, x, y + 0.05, z); cyl(0.04, 0.04, 0.004, 8, tea, x, y + 0.097, z);
    boxR(0.014, 0.065, 0.045, hex, x + Math.cos(ry) * 0.055, y + 0.05, z - Math.sin(ry) * 0.055, 0, ry);
  }
  function plate(x, y, z, hex = 0xf4f1ea) { cyl(0.12, 0.1, 0.015, 10, hex, x, y + 0.008, z); }
  function chair(x, y, z, ry, hex = 0x5a3a24) {   // cafe chair, seat 0.46, sitter faces rotY
    const px = XF; at(x, y, z, ry);
    bb(-0.21, 0.42, -0.21, 0.21, 0.46, 0.21, hex);
    for (const [a, c] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) bb(a - 0.018, 0, c - 0.018, a + 0.018, 0.42, c + 0.018, hex);
    for (const a of [-0.18, 0.18]) bb(a - 0.018, 0.46, -0.2, a + 0.018, 0.9, -0.165, hex);
    bb(-0.2, 0.7, -0.2, 0.2, 0.88, -0.17, hex);
    XF = px;
  }
  // a hinged door leaf as a named prop. Built along local +X from the hinge (x 0..w); the group sits at the hinge.
  function doorLeaf(name, w, h, hex, pos, ry, openA, extra) {
    const d = part(name, () => {
      bb(0, 0, -0.025, w, h, 0.025, hex);
      bb(0.06, 0.08, -0.03, w - 0.06, h * 0.45, 0.03, hex === 0x2a2a2a ? 0x333333 : hex); // lower panel
      cyl(0.025, 0.025, 0.06, 8, 0xc8a850, w - 0.1, 1.0, 0.05, H); cyl(0.025, 0.025, 0.06, 8, 0xc8a850, w - 0.1, 1.0, -0.05, H);
      if (extra) extra();
    }, pos, ry);
    d.userData.openA = openA; d.userData.closedY = ry;
    return d;
  }

  function swivel(hex = 0x3a3a44) {   // typist's chair at the local origin (use at()), seat 0.46, sitter faces +Z
    for (let i = 0; i < 5; i++) { const a = i * 2 * PI / 5; boxR(0.03, 0.03, 0.3, 0x222222, Math.sin(a) * 0.14, 0.05, Math.cos(a) * 0.14, 0, a); }
    cyl(0.025, 0.025, 0.36, 6, 0x555555, 0, 0.23, 0);
    bb(-0.22, 0.41, -0.2, 0.22, 0.47, 0.22, hex); bb(-0.2, 0.55, -0.26, 0.2, 0.92, -0.21, hex); bb(-0.02, 0.44, -0.24, 0.02, 0.6, -0.2, 0x555555);
  }
  function stool(x, y, z, hex = 0x6a5a4a) {
    cyl(0.17, 0.17, 0.04, 10, hex, x, y + 0.44, z);
    for (let i = 0; i < 3; i++) { const a = i * 2 * PI / 3; rod(x + Math.sin(a) * 0.06, y + 0.43, z + Math.cos(a) * 0.06, x + Math.sin(a) * 0.2, y, z + Math.cos(a) * 0.2, 0.015, 0x444444); }
  }

  // ============================================================ THE BUTTERY
  // A vaulted brick basement cafe: x -8..8 (the long axis), z -4.5..4.5, floor 0. Stairs come down the middle
  // of the west end from a street door (landing y 1.3). Counter along the north wall (west half), TV on a
  // bracket on the north wall (east), long shared tables down the middle, Rue's table for four in the far
  // south-east corner, a street-level window high in the east end wall. Outside that window (x > 8.5) is the
  // street at y 1.3 in the rain: the Buttery facade, pavement, road with a passing bus, a terrace opposite.
  // Props: tv_screen (userData.show('off'|'quiz'|'news')), bus (userData.go() sends one past now; it also
  // passes by itself every 16 s), teacups + toast_plate (hidden; Bernie's two teas and toast on the counter),
  // rue_things (FT, Filofax, tea, chips on Rue's table), fresh_tea (hidden; Rue's second cup), crowd.
  SETS.buttery = (() => {
    const colliders = [], R = {};
    const VR = 7.932, VC = 3.7 - 7.932, vy = (z) => VC + Math.sqrt(VR * VR - z * z);   // vault: crown 3.7, springs 2.3 at z = +-4.5
    const BRICK = 0xc99a7c, WOOD = 0x7a5230, DARKW = 0x3a2616;
    const SEATS = [];
    for (let k = 0; k < 10; k++) { const x = -1.6 + 0.66 * k; SEATS.push([x, 0, 0.8, 0], [x, 0, 2.1, PI]); }       // T1 (north table)
    for (let k = 0; k < 13; k++) { const x = -3.8 + 0.66 * k; SEATS.push([x, 0, -0.8, PI], [x, 0, -2.1, 0]); }      // T2
    for (let k = 0; k < 11; k++) SEATS.push([-3.8 + 0.68 * k, 0, -4.15, 0]);                                      // T3 banquette
    const marks = {
      door_in: [-4.3, 0, 0, H], stairs_top: [-7.65, 1.3, 0, H],
      counter_bernie: [-3.2, 0, 3.6, PI], counter_front: [-3.2, 0, 2.05, 0], counter_front2: [-3.95, 0, 2.05, 0],
      rue_seat: [5.9, 0, -4.1, 0], rue_table_c: [6.7, 0, -4.1, 0], rue_table_a: [5.9, 0, -2.6, PI], rue_table_b: [6.7, 0, -2.6, PI],
      tables_1: [-1.6, 0, 0.8, 0], tables_2: [-0.94, 0, 0.8, 0], tables_3: [-1.6, 0, 2.1, PI], tables_4: [-0.94, 0, 2.1, PI],
      tables_5: [2.36, 0, -0.8, PI], tables_6: [3.02, 0, -0.8, PI],
      tv_watch: [3.0, 0, 0.1, 0.55], tv_watch2: [3.7, 0, -0.3, 0.45], window_in: [7.2, 0, 0.35, H], window_in2: [7.2, 0, -0.45, H],
      bernie_wipe: [0.6, 0, 0.3, 0], rue_stand: [6.3, 0, -2.2, 0],
      exterior_view: [10.2, 1.3, -1.5, 0], street_door: [10.2, 1.3, -7.5, 0], street_far: [10.2, 1.3, 12, 0],
    };
    const HIDE = ['tables_1', 'tables_2', 'tables_3', 'tables_4', 'tables_5', 'tables_6'].map((k) => marks[k]);

    const tex = () => ({
      brick: brickTex(),
      tile: canvasTex(64, 64, (c) => {
        c.fillStyle = '#4a3a30'; c.fillRect(0, 0, 64, 64);
        const cs = ['#8e4c33', '#7a3f2b', '#86472f', '#743a28'];
        for (let i = 0; i < 4; i++) { c.fillStyle = cs[i]; c.fillRect((i % 2) * 32 + 1, (i >> 1) * 32 + 1, 30, 30); }
      }, { repeat: [1, 1], key: 'but_tile' }),
      slab: canvasTex(64, 64, (c) => { c.fillStyle = '#6a6c6e'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#86898c'; c.fillRect(1, 1, 62, 30); c.fillRect(1, 33, 30, 30); c.fillRect(33, 33, 30, 30); }, { repeat: [1, 1], key: 'but_slab' }),
      stone: canvasTex(128, 128, (c) => {
        const r = rng(5); c.fillStyle = '#6e6a64'; c.fillRect(0, 0, 128, 128);
        for (let y = 0; y < 4; y++) for (let x = -1; x < 3; x++) { const v = 150 + r() * 30 | 0; c.fillStyle = `rgb(${v},${v - 3},${v - 8})`; c.fillRect(x * 64 + (y % 2) * 32 + 2, y * 32 + 2, 60, 28); }
      }, { repeat: [1, 1], key: 'but_stone' }),
      menu: canvasTex(256, 128, (c, w, h) => {
        c.fillStyle = '#1d2a22'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c8a050'; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8);
        txt(c, 'THE BUTTERY', w / 2, 20, 'bold 20px serif', '#f0dca0');
        const L = [['TEA', '20p'], ['COFFEE', '30p'], ['TOAST (2 slices)', '15p'], ['SOUP & ROLL', '70p'], ['SAUSAGE ROLL', '40p'], ['CHIPS', '35p']];
        L.forEach(([a, p], i) => { const y = 44 + (i % 3) * 26, x = i < 3 ? 14 : 136; txt(c, a, x, y, 'bold 12px sans-serif', '#f4f0e0', 'left'); txt(c, p, x + 108, y, 'bold 12px sans-serif', '#f0c860', 'right'); });
      }, { key: 'but_menu' }),
      // label atlas, 8 rows of 256x32
      sign: canvasTex(256, 256, (c) => {
        const rows = [['PLEASE RETURN YOUR TRAYS', '#f2ead6', '#3a2a1a', 'bold 17px sans-serif'], ['PAY HERE', '#b02a22', '#fff', 'bold 20px sans-serif'],
          ['HOT WATER', '#d8dcdf', '#222', 'bold 18px sans-serif'], ['CITY CENTRE', '#111', '#ffd060', 'bold 22px sans-serif'],
          ['TELEFÓN', '#e8e0c8', '#1f5a3a', 'bold 22px sans-serif'], ['NEWSAGENT · TOBACCONIST', '#1f3a5a', '#f2e6c0', 'bold 15px serif'],
          ['0 0 3 5', '#101a10', '#6cff6c', 'bold 22px monospace'], ['BUTTERY', '#2a1d14', '#e8c878', 'bold 22px serif']];
        rows.forEach(([t, bg, fg, f], i) => { c.fillStyle = bg; c.fillRect(0, i * 32, 256, 32); txt(c, t, 128, i * 32 + 16, f, fg); });
      }, { key: 'but_sign' }),
      posters: canvasTex(256, 256, (c) => {
        const P = [['#1a1a2a', '#ff5a8a', 'THE WET', 'WEEKENDS', 'live · Buttery Bar', 'Fri 9 Oct · £2'], ['#e8dcc0', '#2a2a2a', 'DU PLAYERS', 'WAITING', 'FOR GODOT', 'Players Theatre'],
          ['#d8342a', '#fff4d0', "RAG WEEK '87", 'BED PUSH', 'Grafton St', 'Sat 17 Oct'], ['#2a6a9a', '#fff', 'SKI CLUB', 'VAL THORENS', 'Jan 1988', 'Room 4, House 6']];
        P.forEach(([bg, fg, a, bt, cc, d], i) => {
          const x = (i % 2) * 128, y = (i >> 1) * 128; c.fillStyle = bg; c.fillRect(x, y, 128, 128);
          txt(c, a, x + 64, y + 22, 'bold 15px sans-serif', fg); txt(c, bt, x + 64, y + 48, 'bold 20px sans-serif', fg); txt(c, cc, x + 64, y + 80, '12px sans-serif', fg); txt(c, d, x + 64, y + 104, 'bold 12px sans-serif', fg);
        });
      }, { key: 'but_posters' }),
      // TV: 6 frames of 128x96 stacked: off, quiz, news x4 (red numbers falling)
      tv: canvasTex(128, 576, (c) => {
        const f = (i, fn) => { c.save(); c.translate(0, i * 96); c.beginPath(); c.rect(0, 0, 128, 96); c.clip(); fn(); c.restore(); };
        f(0, () => { c.fillStyle = '#1e2622'; c.fillRect(0, 0, 128, 96); c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.ellipse(40, 28, 40, 18, -0.4, 0, 7); c.fill(); });
        f(1, () => { c.fillStyle = '#2a3a9a'; c.fillRect(0, 0, 128, 96); c.fillStyle = '#e8c030'; for (let i = 0; i < 12; i++) { c.fillRect(10 + (i % 4) * 28, 34 + (i >> 2) * 18, 24, 14); } txt(c, 'QUIZ NIGHT', 64, 16, 'bold 16px sans-serif', '#fff'); });
        const idx = [['-120.4', '-212.1'], ['-183.7', '-340.6'], ['-249.6', '-450.2'], ['-312.0', '-508.0']];
        for (let k = 0; k < 4; k++) f(2 + k, () => {
          c.fillStyle = '#0c1430'; c.fillRect(0, 0, 128, 96); c.fillStyle = '#c01818'; c.fillRect(0, 0, 128, 20);
          txt(c, 'NEWS · MARKETS', 64, 11, 'bold 12px sans-serif', '#fff');
          txt(c, 'LONDON FT-SE', 8, 34, 'bold 11px sans-serif', '#dde', 'left'); txt(c, '▼ ' + idx[k][0], 120, 50, 'bold 18px monospace', '#ff3a3a', 'right');
          txt(c, 'NEW YORK DOW', 8, 68, 'bold 11px sans-serif', '#dde', 'left'); txt(c, '▼ ' + idx[k][1], 120, 84, 'bold 18px monospace', '#ff3a3a', 'right');
        });
      }, { key: 'but_tv' }),
      paper: canvasTex(64, 64, (c) => { c.fillStyle = '#f2c8b4'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#7a6a62'; c.fillRect(4, 4, 56, 7); for (let y = 16; y < 62; y += 4) { c.fillRect(4, y, 26, 1.5); c.fillRect(34, y, 26, 1.5); } }, { key: 'but_ft' }),
      streak: streakTex('but_streak'),
    });

    function build() {
      colliders.length = 0; COL = colliders; TINT = null; XF = null; b = new Builder();
      const T = R.T = tex();
      T.tv.repeat.set(1, 1 / 6);
      M = {
        vc: mat(0xffffff), brick: matTex(T.brick), tile: matTex(T.tile), slab: matTex(T.slab), stone: matTex(T.stone),
        menu: matTex(T.menu), sign: matTex(T.sign), posters: matTex(T.posters), paper: matTex(T.paper),
        glow: mat(0xfff0d0, { emissive: 0xffd49a }), lit: mat(0xffe0a0, { emissive: 0xffc870, emissiveIntensity: 0.8 }),
        day: mat(0xdde4ea, { emissive: 0xb8c2cc, emissiveIntensity: 0.7 }),
        glass: matTex(T.streak, { transparent: true, key: 'but_glass' }), clear: mat(0xcfe3ea, { transparent: true, opacity: 0.22 }),
        tv: matTex(T.tv, { emissive: 0xffffff, key: 'but_tv' }),
      };
      // ---- floor, long walls, vault, ribs, pilasters
      bb(-8, -0.1, -4.5, 8, 0, 4.5, 0xffffff, M.tile, 0.6);
      wall(-8.5, 4.5, 8.5, 5.0, 0, 2.4, BRICK, M.brick, 0.6); wall(-8.5, -5.0, 8.5, -4.5, 0, 2.4, BRICK, M.brick, 0.6);
      const N = 12;
      for (let k = 0; k < N; k++) {
        const z0 = -4.5 + 9 * k / N, z1 = -4.5 + 9 * (k + 1) / N, y0 = vy(z0), y1 = vy(z1), len = Math.hypot(z1 - z0, y1 - y0), a = Math.atan2(y1 - y0, z1 - z0);
        boxR(17, 0.14, len + 0.03, BRICK, 0, (y0 + y1) / 2 + 0.07, (z0 + z1) / 2, -a, 0, 0, M.brick, 0.6);
        for (const x of [-4, 0, 4]) boxR(0.36, 0.2, len + 0.03, 0xb88a6c, x, (y0 + y1) / 2 - 0.06, (z0 + z1) / 2, -a, 0, 0, M.brick, 0.6);
      }
      for (const x of [-4, 0, 4]) for (const s of [-1, 1]) bb(x - 0.18, 0, s > 0 ? 4.35 : -4.5, x + 0.18, 2.35, s > 0 ? 4.5 : -4.35, 0xb88a6c, M.brick, 0.6);
      bb(-8, 0, 4.42, 8, 0.12, 4.5, 0x3a2a20); bb(-8, 0, -4.5, 8, 0.12, -4.42, 0x3a2a20);   // skirting
      // ---- end walls (columns up into the vault), west door opening at the stair top, east window opening
      const ZS = [-4.5, -3.5, -2.5, -1.6, -1.1, -0.55, 0.55, 1.1, 1.6, 2.5, 3.5, 4.5];
      for (const [x0, x1, o] of [[-8.5, -8, [-0.55, 0.55, 1.3, 3.35]], [8, 8.5, [-1.1, 1.1, 1.45, 3.0]]]) {
        for (let i = 0; i < ZS.length - 1; i++) {
          const za = ZS[i], zb = ZS[i + 1], top = vy(za < 0 && zb > 0 ? 0 : Math.min(Math.abs(za), Math.abs(zb))) + 0.2;
          if (za >= o[0] && zb <= o[1]) { bb(x0, 0, za, x1, o[2], zb, BRICK, M.brick, 0.6); bb(x0, o[3], za, x1, top, zb, BRICK, M.brick, 0.6); }
          else bb(x0, 0, za, x1, top, zb, BRICK, M.brick, 0.6);
        }
        COL.push([x0, -4.5, x1, 4.5]);
      }
      // ---- stairs in (west end): landing x -8..-7.3 at 1.3, six treads down to x -4.9
      bb(-8, 0, -0.6, -7.3, 1.3, 0.6, 0x6a5a4a);
      for (let k = 0; k < 6; k++) { const x0 = -7.3 + 0.4 * k, y = 1.3 - (k + 1) * 1.3 / 7; bb(x0, 0, -0.6, x0 + 0.4, y, 0.6, 0x6a5a4a); bb(x0 + 0.34, y - 0.001, -0.6, x0 + 0.4, y + 0.004, 0.6, 0x9a8a70); }
      for (const s of [-1, 1]) {
        for (let k = 0; k < 7; k++) { const x0 = -8 + 0.44 * k, top = (k < 2 ? 1.3 : 1.3 - (k - 1) * 0.2) + 0.95; bb(x0, 0, s * 0.6, x0 + 0.44, top, s * 0.76, BRICK, M.brick, 0.6); }
        rod(-8, 2.35, s * 0.68, -4.9, 1.05, s * 0.68, 0.035, 0x4a3020);
        COL.push(s < 0 ? [-8, -0.76, -4.9, -0.6] : [-8, 0.6, -4.9, 0.76]);
      }
      bb(-8.28, 1.3, -0.5, -8.18, 3.3, 0.5, 0x2e4a36);                    // street door (closed) with a lit fanlight
      quad(0.5, 0.35, M.day, -8.17, 2.9, 0, H); bb(-8.18, 1.3, -0.56, -8.1, 3.36, -0.5, 0xe8e0d0); bb(-8.18, 1.3, 0.5, -8.1, 3.36, 0.56, 0xe8e0d0); bb(-8.18, 3.3, -0.56, -8.1, 3.36, 0.56, 0xe8e0d0);
      cyl(0.02, 0.02, 0.05, 6, 0xc8a850, -8.15, 2.2, 0.35, 0, H);
      ico(0.1, 0xfff0d0, -7.9, 3.55, 0, 1, 1, 1, M.glow);
      // ---- counter (north wall, west half), back counter, shelves, menu board
      bb(-7.5, 0, 2.5, -2.4, 0.95, 3.2, 0x5a3a22); bb(-7.55, 0.95, 2.44, -2.35, 1.0, 3.25, 0xd9cfb8);
      for (let x = -7.3; x < -2.5; x += 0.6) bb(x - 0.02, 0.12, 2.47, x + 0.02, 0.9, 2.5, 0x4a2e1a);
      bb(-7.5, 0, 2.46, -2.4, 0.1, 2.5, 0x2a1a10);
      for (const y of [0.8, 0.88]) cyl(0.016, 0.016, 5.1, 6, 0xb8bcc0, -4.95, y, 2.32, 0, H);
      for (let x = -7.3; x < -2.4; x += 1.2) bb(x - 0.015, 0.76, 2.32, x + 0.015, 0.9, 2.5, 0xb8bcc0);
      COL.push([-7.55, 2.3, -2.35, 3.25]);
      bb(-7.9, 0, 3.95, -2.6, 0.9, 4.5, 0x6a4a30); bb(-7.9, 0.9, 3.9, -2.6, 0.94, 4.5, 0xd9cfb8); COL.push([-7.9, 3.9, -2.6, 4.5]);
      for (const y of [1.36, 1.76]) bb(-7.6, y, 4.22, -3.0, y + 0.03, 4.5, 0x7a5a3a);
      for (let x = -7.45; x < -5.2; x += 0.13) { cup(x, 1.39, 4.36, 0xf2efe6); cup(x + 0.02, 1.79, 4.36, 0xe8e2d0); }
      for (let x = -3.9; x < -3.05; x += 0.14) cyl(0.05, 0.04, 0.07, 8, 0xf4f0e6, x, 1.83, 4.36);
      for (let i = 0; i < 8; i++) plate(-5.0, 1.39 + i * 0.016, 4.34);
      for (const x of [-3.9, -3.45]) { ico(0.11, 0x6a3a1e, x, 1.5, 4.36, 1, 0.85, 1); boxR(0.03, 0.03, 0.12, 0x6a3a1e, x, 1.5, 4.22, 0.5); }   // brown teapots
      for (let i = 0; i < 12; i++) boxR(0.4, 0.015, 0.3, 0x9a3a2a, -7.3, 1.02 + i * 0.018, 2.85, 0, (i % 3) * 0.04);   // trays
      // toaster, bread, jars, till roll on the back counter
      bb(-3.95, 0.94, 4.05, -3.45, 1.22, 4.4, 0xc4c8cc); bb(-3.9, 1.22, 4.1, -3.5, 1.24, 4.35, 0x333333);
      for (let i = 0; i < 5; i++) boxR(0.12, 0.1, 0.02, 0xe8d0a0, -6.8 + i * 0.03, 0.99, 4.2 + i * 0.03, 0.2);
      for (const [x, h, c] of [[-6.2, 0.2, 0xd8b060], [-6.0, 0.16, 0x8a2a1a], [-5.85, 0.22, 0xe8e0c8]]) cyl(0.05, 0.05, h, 8, c, x, 0.94 + h / 2, 4.25);
      at(-4.9, 2.35, 2.62, PI); bb(-0.95, -0.44, -0.03, 0.95, 0.44, 0.02, 0x3a2616); XF = null;
      quad(1.8, 0.8, M.menu, -4.9, 2.35, 2.58, PI);
      for (const x of [-5.6, -4.2]) rod(x, 2.79, 2.62, x, vy(2.62) + 0.05, 2.62, 0.008, 0x444444);
      quad(0.9, 0.11, M.sign, -6.2, 1.75, 4.49, PI, 0, row(0, 8)); quad(0.36, 0.09, M.sign, -3.2, 1.22, 2.66, PI, 0, row(1, 8));
      // tea urn, toast rack + toast, cake stand under glass, till, radio
      cyl(0.22, 0.24, 0.05, 12, 0x9a9ea2, -5.5, 1.025, 2.85); cyl(0.2, 0.2, 0.52, 12, 0xc4c8cc, -5.5, 1.31, 2.85); cyl(0.13, 0.2, 0.08, 12, 0xd0d4d8, -5.5, 1.61, 2.85);
      cyl(0.03, 0.03, 0.05, 8, 0x222222, -5.5, 1.67, 2.85); for (const s of [-1, 1]) bb(-5.5 + s * 0.2 - 0.02, 1.35, 2.83, -5.5 + s * 0.24, 1.39, 2.87, 0x222222);
      bb(-5.53, 1.1, 2.57, -5.47, 1.14, 2.66, 0x9a9ea2); bb(-5.52, 1.12, 2.55, -5.48, 1.2, 2.58, 0x222222); bb(-5.62, 1.0, 2.5, -5.38, 1.02, 2.66, 0x7a7e82);
      bb(-5.51, 1.2, 2.644, -5.49, 1.5, 2.65, 0x333a30); quad(0.26, 0.05, M.sign, -5.5, 1.58, 2.645, PI, 0, row(2, 8));
      bb(-4.42, 1.0, 2.76, -4.18, 1.012, 2.9, 0xc4c8cc);
      for (let i = 0; i < 5; i++) { bb(-4.41 + i * 0.055, 1.012, 2.76, -4.405 + i * 0.055, 1.1, 2.9, 0xc4c8cc); if (i < 4) boxR(0.012, 0.1, 0.1, i % 2 ? 0xc88a48 : 0xd49a58, -4.38 + i * 0.055, 1.06, 2.83, 0, 0, 0.05); }
      bb(-6.9, 1.0, 2.6, -6.1, 1.03, 3.05, 0x9a9ea2); for (let i = 0; i < 6; i++) ico(0.06, i % 2 ? 0xc07a3a : 0xe0b070, -6.8 + (i % 3) * 0.25, 1.07, 2.72 + (i >> 1 & 1) * 0.2, 1, 0.6, 1);
      quad(0.8, 0.4, M.clear, -6.5, 1.25, 2.58, PI, -0.5);
      bb(-3.42, 1.0, 2.65, -2.98, 1.14, 3.05, 0xd8d0b8); bb(-3.4, 1.14, 2.9, -3.0, 1.18, 3.1, 0xcfc6ae);
      for (let rr = 0; rr < 4; rr++) for (let cc = 0; cc < 5; cc++) bb(-3.37 + cc * 0.075, 1.18, 2.93 + rr * 0.04, -3.32 + cc * 0.075, 1.2, 2.96 + rr * 0.04, rr === 0 ? 0xb03a2a : cc === 4 ? 0x2a2a2a : 0xe8e4d8);
      bb(-3.4, 1.14, 2.65, -3.0, 1.34, 2.88, 0xd8d0b8); bb(-3.3, 1.34, 2.7, -3.1, 1.42, 2.8, 0x333333);
      quad(0.18, 0.06, M.sign, -3.2, 1.38, 2.699, PI, 0, row(6, 8)); quad(0.18, 0.06, M.sign, -3.2, 1.38, 2.801, 0, 0, row(6, 8));
      for (let i = 0; i < 4; i++) bb(-3.38 + i * 0.1, 1.42, 2.74, -3.33 + i * 0.1, 1.5, 2.76, 0xf0f0f0);
      cyl(0.02, 0.02, 0.12, 6, 0x9a9ea2, -2.94, 1.08, 2.85, 0, H); bb(-2.9, 1.0, 2.83, -2.87, 1.08, 2.87, 0x222222);
      bb(-4.76, 1.38, 4.3, -4.44, 1.55, 4.42, 0x6a4428); bb(-4.72, 1.4, 4.29, -4.58, 1.53, 4.3, 0x2a2420); bb(-4.55, 1.44, 4.29, -4.47, 1.5, 4.3, 0xe8dcb8);
      for (const x of [-4.52, -4.49]) cyl(0.012, 0.012, 0.01, 6, 0x222222, x, 1.41, 4.29, H);
      rod(-4.46, 1.55, 4.36, -4.3, 1.95, 4.3, 0.005, 0xc0c0c0);
      // ---- long tables + benches, wall banquette, table clutter
      const table = (x0, x1, z0, z1) => {
        bb(x0, 0.7, z0, x1, 0.745, z1, WOOD); COL.push([x0, z0, x1, z1]);
        for (let x = x0 + 0.3; x < x1; x += 1.6) bb(x - 0.04, 0, (z0 + z1) / 2 - 0.25, x + 0.04, 0.7, (z0 + z1) / 2 + 0.25, DARKW);
      };
      const bench = (x0, x1, z0, z1) => { bb(x0, 0.42, z0, x1, 0.46, z1, 0x6a4628); for (let x = x0 + 0.2; x < x1; x += 1.4) bb(x - 0.03, 0, z0 + 0.03, x + 0.03, 0.42, z1 - 0.03, DARKW); COL.push([x0, z0, x1, z1]); };
      table(-2.0, 4.6, 1.05, 1.85); bench(-2.0, 4.6, 0.65, 0.95); bench(-2.0, 4.6, 1.95, 2.25);
      table(-4.2, 4.6, -1.85, -1.05); bench(-4.2, 4.6, -0.95, -0.65); bench(-4.2, 4.6, -2.25, -1.95);
      table(-4.2, 3.6, -3.85, -3.15);
      bb(-4.3, 0, -4.5, 3.7, 0.46, -3.95, 0x6a2620); bb(-4.3, 0.46, -4.5, 3.7, 1.0, -4.38, 0x7a2a22); COL.push([-4.3, -4.5, 3.7, -3.95]);
      const cr = rng(3);
      SEATS.forEach(([x, , z, ry], i) => {
        const fx = Math.sin(ry), fz = Math.cos(ry), c = cr();
        if (c < 0.45) cup(x + fx * 0.42 + 0.08, 0.745, z + fz * 0.42, 0xf2efe6);
        else if (c < 0.7) { plate(x + fx * 0.42, 0.745, z + fz * 0.42); if (c < 0.6) boxR(0.09, 0.012, 0.09, 0xd49a58, x + fx * 0.42, 0.765, z + fz * 0.42, 0, c * 9); else for (let j = 0; j < 5; j++) boxR(0.012, 0.012, 0.07, 0xf0c040, x + fx * 0.42 + (j - 2) * 0.02, 0.765, z + fz * 0.42, 0, j); }
        else if (c < 0.8) mug(x + fx * 0.4, 0.745, z + fz * 0.4, 0xe8e0d0, i);
        else if (c < 0.9) { boxR(0.32, 0.01, 0.24, 0xe8e4d8, x + fx * 0.42, 0.75, z + fz * 0.42, 0, 0.3 * (c - 0.85)); }   // notes / newspaper
      });
      for (const [x0, x1, z] of [[-2.0, 4.6, 1.45], [-4.2, 4.6, -1.45], [-4.2, 3.6, -3.5]]) for (let x = x0 + 0.8; x < x1 - 0.3; x += 2.2) {
        cyl(0.02, 0.02, 0.09, 6, 0xf0f0f0, x, 0.79, z - 0.04); cyl(0.02, 0.02, 0.09, 6, 0x333333, x + 0.05, 0.79, z - 0.04);
        cyl(0.03, 0.035, 0.18, 6, 0xb81a14, x + 0.13, 0.835, z + 0.03); cyl(0.07, 0.06, 0.02, 8, 0x9aa0a8, x - 0.12, 0.755, z + 0.04);
        cyl(0.045, 0.04, 0.08, 8, 0xe8e8e8, x + 0.24, 0.785, z);
      }
      // ---- Rue's table for four (far corner) + chairs
      bb(5.5, 0.71, -3.75, 7.1, 0.745, -2.95, WOOD); bb(6.25, 0, -3.4, 6.35, 0.71, -3.3, DARKW); bb(5.95, 0, -3.5, 6.65, 0.04, -3.2, DARKW);
      for (const [x, z, ry] of [[5.9, -4.1, 0], [6.7, -4.1, 0], [5.9, -2.6, PI], [6.7, -2.6, PI]]) chair(x, 0, z, ry);
      COL.push([5.45, -4.5, 7.15, -2.4]);
      cyl(0.07, 0.06, 0.02, 8, 0x9aa0a8, 6.9, 0.755, -3.1); cyl(0.02, 0.02, 0.09, 6, 0xf0f0f0, 6.95, 0.79, -3.6);
      // ---- coat stand, stacked chairs, radiator + window seat, posters, lights
      cyl(0.02, 0.02, 1.8, 6, 0x3a2616, 7.4, 0.9, 3.9); cyl(0.2, 0.22, 0.04, 8, 0x3a2616, 7.4, 0.02, 3.9);
      for (const [a, c] of [[0.3, 0x26304a], [2.2, 0xb08a58], [4.1, 0x2e4a36]]) { boxR(0.36, 0.9, 0.14, c, 7.4 + Math.sin(a) * 0.14, 1.25, 3.9 + Math.cos(a) * 0.14, 0.05, a); boxR(0.24, 0.12, 0.16, c, 7.4 + Math.sin(a) * 0.19, 1.68, 3.9 + Math.cos(a) * 0.19, 0.4, a); }
      COL.push([7.1, 3.6, 7.7, 4.2]);
      for (let i = 0; i < 4; i++) chair(4.9, i * 0.06, 3.9, 0.1 * i, 0x5a3a24);
      COL.push([4.6, 3.6, 5.2, 4.3]);
      for (let z = -0.85; z <= 0.86; z += 0.1) bb(7.8, 0.15, z - 0.02, 7.92, 0.75, z + 0.02, 0xd8d4c8);
      bb(7.78, 0.1, -0.9, 7.94, 0.15, 0.9, 0xd8d4c8); bb(7.78, 0.75, -0.9, 7.94, 0.8, 0.9, 0xd8d4c8); COL.push([7.7, -0.95, 8, 0.95]);
      bb(7.7, 1.4, -1.15, 8.05, 1.46, 1.15, 0x7a5a3a);
      for (const [x, z, ry, uv] of [[-1.2, 4.49, PI, [0, 0.5, 0.5, 1]], [2.0, 4.49, PI, [0.5, 0.5, 1, 1]], [1.0, -4.49, 0, [0, 0, 0.5, 0.5]], [-2.2, -4.49, 0, [0.5, 0, 1, 0.5]]]) quad(0.5, 0.5, M.posters, x, 1.55, z, ry, 0, uv);
      for (const [x, z] of [[-5.2, 1.6], [-2, 0], [2, 0], [6, 0]]) { rod(x, 3.0, z, x, 3.72, z, 0.008, 0x333333); ico(0.16, 0xfff0d0, x, 2.92, z, 1, 0.9, 1, M.glow); }
      for (const x of [-4, 0, 4]) for (const s of [-1, 1]) { bb(x - 0.08, 1.78, s * 4.28 - 0.04, x + 0.08, 1.95, s * 4.28 + 0.04, 0x6a5a3a); ico(0.07, 0xfff0d0, x, 2.0, s * 4.26, 1, 1, 1, M.glow); }
      // ---- TV on its wall bracket (north wall, east), angled at the room
      at(5.2, 2.0, 4.12, -2.72);
      bb(-0.27, -0.21, -0.2, 0.27, 0.21, 0.19, 0x3a3634); bb(-0.2, -0.16, -0.36, 0.2, 0.16, -0.2, 0x2a2624);
      bb(0.16, -0.19, 0.19, 0.25, 0.19, 0.2, 0x2a2624); for (let i = 0; i < 3; i++) cyl(0.012, 0.012, 0.012, 6, 0x999999, 0.205, 0.08 - i * 0.06, 0.205, H);
      bb(-0.22, -0.3, -0.25, 0.22, -0.21, 0.1, 0x555555);
      XF = null;
      rod(5.13, 1.72, 4.25, 5.13, 1.72, 4.5, 0.03, 0x555555); rod(5.2, 1.75, 4.2, 5.2, 2.2, 4.5, 0.02, 0x555555);
      // ---- the window: sash bars, streaked glass, reveal sill
      for (const z of [-0.37, 0.37]) bb(8.2, 1.45, z - 0.03, 8.28, 3.0, z + 0.03, 0xf0ece0);
      bb(8.2, 2.2, -1.1, 8.28, 2.26, 1.1, 0xf0ece0); for (const z of [-1.1, 1.1]) bb(8.18, 1.45, z - 0.05, 8.3, 3.0, z + 0.05, 0xf0ece0);
      bb(8.18, 1.4, -1.1, 8.3, 1.46, 1.1, 0xf0ece0); bb(8.18, 2.96, -1.1, 8.3, 3.02, 1.1, 0xf0ece0);
      quad(2.2, 1.55, M.glass, 8.24, 2.225, 0, -H);
      // ---- outside: facade (x 8.5), pavement, road, far pavement + terrace (x 19.4)
      TINT = null;
      bb(8.5, 1.1, -24, 8.8, 1.45, 24, 0xffffff, M.stone, 2); bb(8.5, 3.0, -1.1, 8.8, 12, 1.1, 0xffffff, M.stone, 2);
      bb(8.5, 1.45, -24, 8.8, 12, -1.1, 0xffffff, M.stone, 2); bb(8.5, 1.45, 1.1, 8.8, 12, 24, 0xffffff, M.stone, 2);
      bb(8.8, 3.3, -24, 8.95, 3.45, 24, 0xa8a49c); bb(8.8, 11.6, -24, 9.1, 12, 24, 0xa8a49c);
      for (let z = -21; z <= 21; z += 3.5) for (const y of [4.3, 7.8]) {
        if (Math.abs(z) < 2 && y < 5) continue;
        bb(8.85, y, z - 0.6, 8.9, y + 2.4, z + 0.6, 0x1c2228); bb(8.9, y + 1.15, z - 0.6, 8.95, y + 1.22, z + 0.6, 0xe8e4dc); bb(8.9, y, z - 0.03, 8.95, y + 2.4, z + 0.03, 0xe8e4dc);
        bb(8.8, y - 0.12, z - 0.7, 9.05, y, z + 0.7, 0xb8b4ac);
      }
      for (const z of [-14, -7, 7, 14]) if (rng(z + 40)() < 0.6) quad(1.1, 1.0, M.lit, 8.93, 8.5, z, H);
      quad(0.7, 0.11, M.sign, 8.81, 3.15, 0, H, 0, row(7, 8));
      bb(8.8, 1.1, -24, 11.2, 1.3, 24, 0xffffff, M.slab, 1.2); bb(11.0, 1.1, -24, 11.2, 1.32, 24, 0x8a8a88);
      bb(11.2, 1.0, -24, 17.2, 1.15, 24, 0x2e3136); bb(17.2, 1.1, -24, 19.4, 1.3, 24, 0xffffff, M.slab, 1.2); bb(17.0, 1.1, -24, 17.2, 1.32, 24, 0x8a8a88);
      for (let z = -23; z < 24; z += 3) bb(14.15, 1.151, z, 14.25, 1.153, z + 1.5, 0xe8e8e0);
      for (const x of [11.35, 11.5]) bb(x, 1.151, -24, x + 0.08, 1.153, 24, 0xd8b830);
      for (const [x, z, w, d] of [[12.4, -3, 1.4, 0.8], [15.8, 4, 1.8, 1.0], [10.1, 5.5, 0.9, 0.6], [13.5, -12, 1.2, 0.9], [18.2, -6, 1.0, 0.6]]) bb(x - w / 2, 1.153, z - d / 2, x + w / 2, x > 11 && x < 17 ? 1.156 : 1.303, z + d / 2, 0x4a5058);
      bb(19.4, 1.1, -24, 19.8, 13, 24, 0xa0503a, M.brick, 0.6);
      for (let z = -21; z <= 21; z += 3) {
        for (const y of [4.2, 7.4, 10.3]) { bb(19.3, y, z - 0.55, 19.4, y + 1.9, z + 0.55, 0x1a2026); bb(19.28, y + 0.9, z - 0.55, 19.3, y + 0.96, z + 0.55, 0xe8e4dc); if (rng(z * 7 + y | 0)() < 0.35) quad(1.0, 0.8, M.lit, 19.27, y + 0.45, z, -H); }
        if (Math.abs(z) > 4) { bb(19.25, 1.3, z - 0.55, 19.4, 3.5, z + 0.55, [0xa02a2a, 0x2a4a8a, 0xd8b030, 0x2a6a3a, 0x1a1a1a][(z / 3 + 7) % 5 | 0]); bb(19.25, 3.5, z - 0.6, 19.4, 3.6, z + 0.6, 0xe8e4dc); quad(1.0, 0.4, M.lit, 19.24, 3.85, z, -H); }
      }
      bb(19.1, 1.3, -3, 19.4, 3.6, 3, 0x1f3a5a); quad(5.4, 1.9, M.lit, 19.08, 2.25, 0, -H, 0, null, 0xffe8c0); quad(4.6, 0.5, M.sign, 19.08, 3.35, 0, -H, 0, row(5, 8));
      boxR(6, 0.06, 1.2, 0x2a5a3a, 18.7, 3.7, 0, 0, 0, -0.25);
      // lamp post, phone box, post box, bicycle, bin
      cyl(0.14, 0.18, 0.4, 8, 0x1e2a24, 10.9, 1.5, -5); cyl(0.06, 0.08, 3.6, 8, 0x1e2a24, 10.9, 3.3, -5); rod(10.9, 4.9, -5, 10.5, 5.1, -5, 0.03, 0x1e2a24);
      cyl(0.2, 0.12, 0.45, 6, 0xffe0a0, 10.9, 5.3, -5, 0, 0, M.glow); cyl(0.05, 0.22, 0.12, 6, 0x1e2a24, 10.9, 5.58, -5);
      COL.push([10.7, -5.2, 11.1, -4.8]);
      bb(10.1, 1.3, 6.5, 11.0, 3.8, 7.4, 0xe8e0c8); bb(10.08, 1.5, 6.6, 10.12, 3.3, 7.3, 0x2a3a3a); bb(10.05, 3.8, 6.45, 11.05, 3.95, 7.45, 0x1f5a3a);
      quad(0.8, 0.14, M.sign, 10.07, 3.6, 6.95, -H, 0, row(4, 8)); quad(0.5, 0.9, M.lit, 10.09, 2.4, 6.95, -H, 0, null, 0xfff4d8); COL.push([10.1, 6.5, 11.0, 7.4]);
      cyl(0.22, 0.24, 1.2, 10, 0x1f5a3a, 10.8, 1.9, -9); cyl(0.26, 0.24, 0.1, 10, 0x1f5a3a, 10.8, 2.55, -9); bb(10.54, 2.1, -9.08, 10.56, 2.14, -8.92, 0x111111); COL.push([10.5, -9.3, 11.1, -8.7]);
      cyl(0.18, 0.16, 0.8, 8, 0x3a3a3a, 10.9, 1.7, 2.8); COL.push([10.7, 2.6, 11.1, 3.0]);
      for (const zz of [-0.3, 0.6]) { at(10.7, 1.3, -4.35 + zz, 0.15); for (const w of [-0.5, 0.5]) { const g = new THREE.TorusGeometry(0.3, 0.025, 4, 12); g.rotateY(H); g.translate(0, 0.32, w); put(g, 0x222222); } rod(0, 0.32, -0.5, 0, 0.75, 0.1, 0.02, 0x7a1a1a); rod(0, 0.75, 0.1, 0, 0.32, 0.5, 0.02, 0x7a1a1a); XF = null; }
      // parked car opposite (boxy 80s hatchback)
      at(16.4, 1.15, -11, 0); bb(-0.8, 0.25, -1.9, 0.8, 0.85, 1.9, 0x9a2a22); bb(-0.75, 0.85, -1.2, 0.75, 1.35, 0.9, 0x9a2a22); bb(-0.72, 0.9, -1.15, 0.76, 1.3, 0.85, 0x1a2228);
      for (const [x, z] of [[-0.8, -1.2], [0.8, -1.2], [-0.8, 1.25], [0.8, 1.25]]) cyl(0.3, 0.3, 0.2, 10, 0x151515, x, 0.3, z, 0, H);
      XF = null; COL.push([15.6, -12.9, 17.2, -9.1]);
      COL.push([8.5, 24, 19.4, 24.5], [8.5, -24.5, 19.4, -24], [8.5, -24, 8.8, 24], [19.4, -24, 19.8, 24]);

      const g = b.done();
      // ---- props
      R.tv = part('tv_screen', () => quad(0.4, 0.3, M.tv, 0, 0, 0, 0, 0, [0, 0, 1, 1]), [5.2 + Math.sin(-2.72) * 0.2, 2.0, 4.12 + Math.cos(-2.72) * 0.2], -2.72, { floor: false });
      R.tv.userData.show = (mode) => { R.tvMode = mode; T.tv.offset.y = 1 - ((mode === 'quiz' ? 1 : mode === 'news' ? 2 : 0) + 1) / 6; };
      R.bus = part('bus', () => {
        bb(-1.25, 0.25, -4.8, 1.25, 2.2, 4.8, 0x2f6b3f); bb(-1.25, 2.2, -4.8, 1.25, 4.2, 4.8, 0xe8dcc0); bb(-1.26, 2.1, -4.8, 1.26, 2.25, 4.8, 0xf4f0e6);
        bb(-1.27, 1.25, -4.3, 1.27, 2.0, 3.6, 0x1a2226); bb(-1.27, 2.7, -4.6, 1.27, 3.7, 4.6, 0x1a2226); bb(-1.2, 1.2, 4.79, 1.2, 2.0, 4.82, 0x1a2226); bb(-1.2, 2.7, 4.79, 1.2, 3.7, 4.82, 0x1a2226);
        quad(1.6, 0.3, M.sign, 0, 3.95, 4.83, 0, 0, row(3, 8)); bb(-1.26, 4.2, -4.7, 1.26, 4.3, 4.7, 0xd8ccb0);
        for (const s of [-1, 1]) { bb(s * 0.9 - 0.15, 0.5, 4.8, s * 0.9 + 0.15, 0.7, 4.84, 0xfff4c0); for (const z of [-3.2, 3.2]) cyl(0.5, 0.5, 0.3, 12, 0x151515, s * 1.12, 0.5, z, 0, H); }
      }, [15.6, 1.15, -40], 0);
      R.bus.userData = { t: 20, go() { this.t = 0; } };
      R.walkers = [0, 1, 2].map((i) => part('walker_' + i, () => {
        const c = [0x2a3040, 0x7a2a2a, 0x4a5a3a][i];
        for (const s of [-1, 1]) bb(s * 0.09 - 0.06, 0, -0.06, s * 0.09 + 0.06, 0.8, 0.06, 0x2a2a2e);
        bb(-0.22, 0.75, -0.14, 0.22, 1.5, 0.14, c); bb(-0.1, 1.5, -0.1, 0.1, 1.72, 0.1, 0xe8b894); bb(-0.11, 1.68, -0.11, 0.11, 1.76, 0.11, 0x3a2418);
        cyl(0.012, 0.012, 0.6, 4, 0x222222, 0.1, 1.75, 0.08); cyl(0.02, 0.55, 0.22, 8, i === 1 ? 0x2a3a6a : 0x151515, 0.1, 2.05, 0.08);
      }, [i === 1 ? 10.4 : 9.7, 1.3, 0], i === 1 ? PI : 0));
      R.teacups = part('teacups', () => { cup(0, 0, 0); cup(0.2, 0, 0.04); }, [-4.1, 1.0, 2.62], 0, { floor: false });
      R.toast = part('toast_plate', () => { plate(0, 0, 0); for (let i = 0; i < 4; i++) boxR(0.1, 0.012, 0.1, i % 2 ? 0xc88a48 : 0xd49a58, (i - 1.5) * 0.02, 0.02 + i * 0.012, 0, 0, i * 0.35); }, [-3.75, 1.0, 2.64], 0, { floor: false });
      R.things = part('rue_things', () => {
        quad(0.36, 0.28, M.paper, -0.25, 0.004, -0.02, 0.2, -H);                              // the pink paper, folded
        bb(-0.02, 0, -0.14, 0.18, 0.045, 0.12, 0x5a3218); bb(0.14, 0.02, -0.14, 0.19, 0.03, 0.12, 0x3a2010);      // Filofax
        cup(0.35, 0, 0.12); plate(0.38, 0, -0.15); for (let j = 0; j < 7; j++) boxR(0.012, 0.012, 0.07, 0xf0c040, 0.33 + (j % 4) * 0.025, 0.02 + (j >> 2) * 0.012, -0.15, 0, j * 0.7);
      }, [6.0, 0.745, -3.45], 0, { floor: false });
      R.fresh = part('fresh_tea', () => cup(0, 0, 0, 0xffffff), [5.72, 0.745, -3.25], 0, { floor: false });
      R.crowd = crowd(SEATS, 21, SETS.buttery);
      for (const m of HIDE) R.crowd.userData.hideNear(m[0], m[2]);
      [8, 17, 30, 44, 51].forEach((i) => R.crowd.userData.hide(i));        // a few free places
      const rain = makeRain({ box: [9, -24, 19.4, 24], top: 12, bottom: 1.2, count: 2600 });
      g.add(R.tv, R.bus, ...R.walkers, R.teacups, R.toast, R.things, R.fresh, R.crowd, rain);
      R.root = g; R.scene = null; dress(sceneNow());
      return g;
    }
    function dress(id) {
      R.scene = id;
      R.teacups.visible = R.toast.visible = R.fresh.visible = false;
      R.things.visible = id !== '2.2';
      R.tv.userData.show(id === '2.12' ? 'news' : id === '2.5' ? 'quiz' : 'off');
      R.crowd.userData.look(null);
    }
    function update(dt, ctx) {
      if (!R.root) return;
      if (sceneNow() !== R.scene) dress(sceneNow());
      const t = ctx.t;
      R.T.streak.offset.y = t * 0.12;
      if (R.tvMode === 'news') R.T.tv.offset.y = 1 - (3 + (Math.floor(t / 0.9) % 4)) / 6;
      const u = R.bus.userData; u.t += dt; if (u.t > 16) u.t = 0;
      R.bus.position.z = -14 + u.t * 11; R.bus.visible = u.t < 4.2;
      for (let i = 0; i < 3; i++) { const w = R.walkers[i], s = (t * (1.1 + i * 0.15) + i * 17) % 48; w.position.z = i === 1 ? 24 - s : -24 + s; w.position.y = 1.3 + 0.02 * Math.abs(Math.sin(t * 6 + i)); }
      R.crowd.userData.fidget(dt);
      // Bernie wipes down the counter while nobody needs her (straight back to idle for any shot, line or walk)
      const bn = typeof world !== 'undefined' && world.setId === 'buttery' && world.actor('bernie');
      if (bn) {
        const busy = bn.rig.talking || bn.mv.on || (typeof cam !== 'undefined' && cam.cutscene);
        if (bn.anim === 'idle' && !busy) bn.play('wipe'); else if (bn.anim === 'wipe' && busy) bn.play('idle');
      }
    }
    return {
      env: {
        day: { bg: 0x98a2aa, fog: [0x8a8680, 0.018], hemi: [0xfff0dc, 0x6a5040, 1.05], dir: [0xffe2b8, 0.75, [4, 10, 3]], rain: 1 },
      },
      build, marks, update, colliders,
      anchors: {
        till: { at: [-3.2, 1.2, 2.85], from: [-2.7, 1.58, 3.3], fov: 40 },
        urn: { at: [-5.5, 1.3, 2.85], from: [-4.75, 1.5, 1.75], fov: 35 },
        toast_rack: { at: [-4.3, 1.06, 2.83], from: [-4.05, 1.4, 2.1], fov: 30 },
        radio: { at: [-4.6, 1.47, 4.36], from: [-4.35, 1.62, 3.35], fov: 30 },
        tv: { at: [5.1, 2.0, 3.95], from: [4.45, 1.72, 2.85], fov: 35 },
        rue_table: { at: [6.3, 0.8, -3.35], from: [5.6, 1.55, -2.35], fov: 40 },
        window: { at: [8.4, 2.1, 0], from: [5.3, 1.65, 0.8], fov: 45 },
        exterior: { at: [8.6, 2.1, 0], from: [18.6, 1.85, -4.6], fov: 40 },
        counter: { at: [-3.95, 1.05, 2.72], from: [-3.55, 1.6, 1.85], fov: 35 },
        // extras
        rue_filofax: { at: [6.08, 0.8, -3.45], from: [6.08, 1.7, -3.43], fov: 40 },
        rue_twoshot: { at: [6.3, 1.2, -2.6], from: [7.35, 1.35, -4.3], fov: 40 },
        menu: { at: [-4.9, 2.35, 2.58], from: [-4.6, 1.7, 0.6], fov: 35 },
        stairs: { at: [-6.4, 1.3, 0], from: [-2.8, 1.7, 0.9], fov: 45 },
        hall: { at: [3.5, 0.9, -1.2], from: [-7.7, 3.1, 1.1], fov: 55 },
        teas: { at: [-3.95, 1.05, 2.63], from: [-3.9, 1.5, 3.3], fov: 35 },
      },
      cams: {
        stairs: { type: 'fixed', pos: [-1.3, 2.3, 0.0], look: [-7.0, 1.6, 0.0], fov: 50 },
        counter: { type: 'pan', pos: [0.4, 2.55, -2.6], look: 'player', base: [-4.4, 1.1, 2.7], limit: 0.35, fov: 52 },
        hall: { type: 'pan', pos: [-7.7, 3.1, 1.1], look: 'player', base: [3.5, 0.9, -1.2], limit: 0.35, fov: 55 },
        corner: { type: 'pan', pos: [0.6, 2.7, 3.3], look: 'player', base: [6.6, 0.9, -2.6], limit: 0.4, fov: 52 },
        street: { type: 'rail', from: [18.9, 2.3, -20], to: [18.9, 2.3, 20], look: 'player', base: [8.5, 2.0, 0], limit: 0.5, fov: 50 },
      },
      zones: [
        { box: [-8.2, -0.62, -4.9, 0.62], cam: 'stairs' },
        { box: [-8.2, -4.5, -1.8, 4.5], cam: 'counter' },
        { box: [-1.8, -4.5, 4.4, 4.5], cam: 'hall' },
        { box: [4.4, -4.5, 8.2, 4.5], cam: 'corner' },
        { box: [8.5, -24, 19.4, 24], cam: 'street' },
      ],
      floor(x, z) {
        if (x > 8.5) return x > 11.2 && x < 17.2 ? 1.15 : 1.3;
        if (x < -4.9 && z > -0.62 && z < 0.62) return x < -7.3 ? 1.3 : Math.ceil((-4.9 - x) / 0.4) * 1.3 / 7;
        return 0;
      },
      props: ['tv_screen', 'bus', 'teacups', 'toast_plate', 'rue_things', 'fresh_tea', 'crowd', 'walker_0', 'walker_1', 'walker_2'],
      ambience: { loops: ['hum'], room: 'room' },
    };
  })();
  // ============================================================ THE LECTURE THEATRE (Arts Building)
  // Steep tiers rise toward +z from a pit at the front (z < 0.6): 14 rows (rise 0.38, depth 0.9), one central aisle
  // of half-steps (x -0.6..0.6), seat blocks either side (8 seats each, x +-1.0..5.2). Lectern, demo bench and
  // blackboard at the front (wall z -4.5), the bottom door front-left, the top door at the back of the top landing
  // (y 5.7, z 13.2..15.4). Row r: floor y = 0.38(r+1), front edge z = 0.6 + 0.9r; its students sit at z + 0.64
  // facing -z. seat_luka/seat_chase are 8 rows down from the top (row 6), with two students between them and the aisle.
  // Props: crowd (every seat except seat_luka, seat_chase, ronan_seat, rue_sit; userData.hide/show/hideNear/look),
  // bottom_door (userData.open = true bangs it open), textbook (Ronan's, on his desk), glasses (on the end of the
  // boys' bench in 2.3; under the bench from 2.4 on).
  SETS.theatre = (() => {
    const colliders = [], R = {};
    const NR = 14, D = 0.9, RISE = 0.38, Z0 = 0.6, zr = (r) => Z0 + D * r, yr = (r) => RISE * (r + 1);
    const TOP = yr(NR), ZT = zr(NR), ZB = 15.4;
    const seatAt = (r, s, i) => [s * (1.0 + 0.6 * i), yr(r), zr(r) + 0.64, PI];
    const SEATS = [];
    for (let r = 0; r < NR; r++) for (const s of [-1, 1]) for (let i = 0; i < 8; i++) SEATS.push(seatAt(r, s, i));
    const GL_BENCH = [0.95, yr(6) + 0.465, zr(6) + 0.7], GL_FLOOR = [1.45, yr(6) + 0.01, zr(6) + 0.72];   // the end place of the boys' bench is free
    const marks = {
      top_entry: [0, TOP, 14.6, PI], seat_luka: seatAt(6, 1, 2), seat_chase: seatAt(6, 1, 3), ronan_seat: seatAt(9, 1, 0),
      lectern: [0, 0, -2.05, 0], bottom_door: [-4.9, 0, -4.1, 0], glasses_bench: [0.95, yr(6), zr(6) + 0.42, 0],
      row_path_1: [0, TOP, 13.7, PI], row_path_2: [0, yr(11), zr(11) + 0.65, PI], row_path_3: [0, yr(9), zr(9) + 0.65, PI],
      row_path_4: [0, yr(6), zr(6) + 0.65, PI], row_path_5: [1.4, yr(6), zr(6) + 0.42, H], row_path_6: [2.2, yr(6), zr(6) + 0.42, H],
      rue_sit: seatAt(0, -1, 0), hartigan_board: [0.9, 0, -3.85, PI], aisle_bottom: [0, 0, 0.2, PI], pit_center: [1.6, 0, -0.6, PI],
    };
    const tex = () => ({
      conc: canvasTex(128, 128, (c) => {
        const r = rng(9); c.fillStyle = '#c4beb2'; c.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 900; i++) { const v = 170 + r() * 50 | 0; c.fillStyle = `rgb(${v},${v - 3},${v - 9})`; c.fillRect(r() * 128 | 0, r() * 128 | 0, 2, 1); }
        c.fillStyle = 'rgba(90,85,78,0.35)'; for (let y = 0; y < 128; y += 16) c.fillRect(0, y, 128, 1);
        c.fillStyle = 'rgba(90,85,78,0.2)'; for (let x = 0; x < 128; x += 64) c.fillRect(x, 0, 1, 128);
      }, { repeat: [1, 1], key: 'th_conc' }),
      board: canvasTex(256, 256, (c) => {
        c.fillStyle = '#2d3b34'; c.fillRect(0, 0, 256, 256);
        const r = rng(4); c.fillStyle = 'rgba(220,230,220,0.06)'; for (let i = 0; i < 30; i++) c.fillRect(r() * 256, r() * 256, 40 + r() * 60, 6 + r() * 10);
        txt(c, 'BUSINESS STUDIES I  ·  Prof. Hartigan', 128, 14, 'italic 12px serif', '#e4e8e0');
        txt(c, 'THE MARKETING MIX', 128, 38, 'bold 21px serif', '#f4f6f0');
        c.strokeStyle = '#e8ece4'; c.lineWidth = 1.5;
        [['PRODUCT', 64, 64], ['PRICE', 192, 64], ['PLACE', 64, 90], ['PROMOTION', 192, 90]].forEach(([t, x, y]) => { c.strokeRect(x - 52, y - 10, 104, 20); txt(c, t, x, y, 'bold 13px serif', '#f0f2ec'); });
        txt(c, 'Next week: THE CUSTOMER JOURNEY (?)', 128, 116, 'italic 12px serif', '#eadf9a');
        txt(c, 'Q = f (P, Y, Pr, T)', 70, 150, 'italic 14px serif', 'rgba(230,236,228,0.55)'); txt(c, 'elasticity  >  1  ⇒  elastic', 170, 180, 'italic 12px serif', 'rgba(230,236,228,0.45)');
        c.strokeStyle = 'rgba(230,236,228,0.45)'; c.beginPath(); c.moveTo(30, 240); c.lineTo(30, 200); c.moveTo(30, 240); c.lineTo(110, 240); c.moveTo(38, 206); c.quadraticCurveTo(60, 232, 104, 234); c.stroke();
        txt(c, 'Essays due FRI 23 OCT', 190, 225, 'bold 12px serif', 'rgba(240,240,230,0.7)');
      }, { key: 'th_board' }),
      reg: canvasTex(256, 128, (c) => {
        c.fillStyle = '#efe8d4'; c.fillRect(0, 0, 256, 128); c.fillStyle = '#c8bfa6'; c.fillRect(127, 0, 2, 128);
        c.fillStyle = '#9ab0c8'; for (let y = 22; y < 128; y += 10.5) { c.fillRect(4, y, 120, 0.8); c.fillRect(132, y, 120, 0.8); }
        c.fillStyle = '#c05050'; c.fillRect(20, 0, 0.8, 128); c.fillRect(148, 0, 0.8, 128);
        txt(c, 'BUS. STUDIES I — ROLL', 64, 10, 'bold 9px serif', '#333');
        txt(c, 'Michaelmas 1987', 192, 10, 'bold 9px serif', '#333');
        const L = ['Brennan', 'Byrne', 'Cullen', 'Doyle', 'Fitzgerald', 'Kavanagh', 'Murphy', 'Murphy', 'Murphy', 'O\'Brien', 'O\'Sullivan', 'Quigley', 'Quinn', 'Ryan', 'Sheehan', 'Walsh', 'Whelan', 'Young'];
        L.forEach((n, i) => { const x = i < 9 ? 24 : 152, y = 27 + (i % 9) * 10.5; txt(c, n, x, y, 'italic 9px serif', '#1a2a5a', 'left'); for (let k = 0; k < 4; k++) txt(c, '✓', x + 58 + k * 14, y, '8px serif', '#2a3a2a'); });
      }, { key: 'th_reg' }),
      book: canvasTex(64, 96, (c) => {
        c.fillStyle = '#a8322a'; c.fillRect(0, 0, 64, 96); c.fillStyle = '#f0e0b0'; c.fillRect(6, 20, 52, 2); c.fillRect(6, 62, 52, 2);
        txt(c, 'PRINCIPLES', 32, 32, 'bold 9px sans-serif', '#fff'); txt(c, 'OF', 32, 42, 'bold 9px sans-serif', '#fff'); txt(c, 'MARKETING', 32, 52, 'bold 9px sans-serif', '#fff'); txt(c, '4th edition', 32, 80, '8px serif', '#f0e0b0');
      }, { key: 'th_book' }),
      sign: canvasTex(256, 128, (c) => {
        [['EXIT', '#1f8a3a', '#fff', 'bold 24px sans-serif'], ['THEATRE B  ·  ARTS BUILDING', '#20242a', '#e8e8e8', 'bold 15px sans-serif'],
          ['NO SMOKING', '#f4f4f0', '#b02020', 'bold 20px sans-serif'], ['PLEASE DO NOT EAT IN THE THEATRE', '#f4f4f0', '#222', 'bold 12px sans-serif']]
          .forEach(([t, bg, fg, f], i) => { c.fillStyle = bg; c.fillRect(0, i * 32, 256, 32); txt(c, t, 128, i * 32 + 16, f, fg); });
      }, { key: 'th_sign' }),
      clock: canvasTex(64, 64, (c) => {
        c.fillStyle = '#f4f2ea'; c.beginPath(); c.arc(32, 32, 31, 0, 7); c.fill(); c.fillStyle = '#222';
        for (let i = 0; i < 12; i++) { const a = i * PI / 6; c.fillRect(32 + Math.sin(a) * 26 - 1, 32 - Math.cos(a) * 26 - 2, 2, 4); }
        c.strokeStyle = '#111'; c.lineWidth = 3; c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + 14, 32); c.stroke();   // 2 o'clock-ish hour hand
        c.lineWidth = 2; c.beginPath(); c.moveTo(32, 32); c.lineTo(32, 8); c.stroke();
      }, { key: 'th_clock' }),
    });
    function build() {
      colliders.length = 0; COL = colliders; TINT = null; XF = null; b = new Builder();
      const T = R.T = tex();
      M = { vc: mat(0xffffff), conc: matTex(T.conc), carpet: matTex(carpetTex()), board: matTex(T.board), reg: matTex(T.reg), sign: matTex(T.sign), clock: matTex(T.clock),
        book: matTex(T.book), glow: mat(0xfff6e8, { emissive: 0xfff0dc }), exit: matTex(T.sign, { emissive: 0xffffff }) };
      const WD = 0x8a5e3a, WT = 0xb58a58, CARP = 0x5c6680, STEP = 0x8a7a66;
      // ---- pit, tiers, desks, benches, aisle half-steps
      bb(-5.9, -0.1, -4.5, 5.9, 0, Z0, 0x7a5a40);
      for (let x = -5.8; x < 5.9; x += 0.5) bb(x, 0, -4.5, x + 0.01, 0.002, Z0, 0x5a4230);
      for (let r = 0; r < NR; r++) {
        const z0 = zr(r), z1 = z0 + D, y = yr(r);
        for (const s of [-1, 1]) {
          const xa = s < 0 ? -5.9 : 0.6, xb = s < 0 ? -0.6 : 5.9, da = s < 0 ? -5.6 : 0.64, db = s < 0 ? -0.64 : 5.6;
          bb(xa, 0, z0, xb, y, z1, CARP, M.carpet, 0.5);
          bb(da, y, z0, db, y + 0.72, z0 + 0.04, WD);
          bb(da, y + 0.72, z0 - 0.02, db, y + 0.76, z0 + 0.3, WT);
          bb(da, y + 0.42, z0 + 0.52, db, y + 0.46, z0 + 0.86, WT);
          for (let x = da + 0.3; x < db; x += 1.2) bb(x - 0.03, y, z0 + 0.56, x + 0.03, y + 0.42, z0 + 0.82, WD);
          for (const xe of [da, db]) { bb(xe - 0.025, y, z0, xe + 0.025, y + 0.8, z0 + 0.32, WD); bb(xe - 0.025, y, z0 + 0.5, xe + 0.025, y + 0.62, z0 + 0.88, WD); }
          COL.push([da - 0.03, z0 - 0.02, db + 0.03, z0 + 0.06]);
          bb(s < 0 ? -5.9 : 5.85, y, z0, s < 0 ? -5.85 : 5.9, y + 1.0, z1, WD);
        }
        bb(-0.6, 0, z0, 0.6, y - 0.19, z0 + 0.45, STEP); bb(-0.6, 0, z0 + 0.45, 0.6, y, z1, STEP);
        bb(-0.6, y - 0.19, z0 - 0.005, 0.6, y - 0.186, z0 + 0.05, 0xd8c8a8); bb(-0.6, y - 0.001, z0 + 0.445, 0.6, y + 0.003, z0 + 0.5, 0xd8c8a8);
      }
      COL.push([-5.9, Z0 - 0.02, -0.6, Z0 + 0.06], [0.6, Z0 - 0.02, 5.9, Z0 + 0.06]);
      // top landing + balustrade, back wall with the top doors
      bb(-5.9, 0, ZT, 5.9, TOP, ZB, CARP, M.carpet, 0.5);
      for (const s of [-1, 1]) {
        const xa = s < 0 ? -5.9 : 0.6, xb = s < 0 ? -0.6 : 5.9;
        bb(xa, TOP, ZT, xb, TOP + 0.85, ZT + 0.06, WD); bb(xa, TOP + 0.85, ZT - 0.02, xb, TOP + 0.9, ZT + 0.1, WT); COL.push([xa, ZT - 0.03, xb, ZT + 0.1]);
        bb(s * 0.6 - 0.04, TOP, ZT, s * 0.6 + 0.04, TOP + 1.0, ZT + 0.1, WD);
      }
      wall(-6.3, ZB, -0.8, ZB + 0.4, 0, 8.6, 0xffffff, M.conc, 1.6); wall(0.8, ZB, 6.3, ZB + 0.4, 0, 8.6, 0xffffff, M.conc, 1.6);
      bb(-0.8, TOP + 2.2, ZB, 0.8, 8.6, ZB + 0.4, 0xffffff, M.conc, 1.6); COL.push([-0.8, ZB, 0.8, ZB + 0.4]);
      for (const s of [-1, 1]) {
        bb(s * 0.02, TOP, ZB - 0.05, s * 0.79, TOP + 2.18, ZB + 0.02, 0x6a4a2e);
        quad(0.28, 0.4, M.glow, s * 0.4, TOP + 1.45, ZB - 0.055, PI); bb(s * 0.12, TOP + 1.0, ZB - 0.1, s * 0.7, TOP + 1.05, ZB - 0.07, 0xb8bcc0);
      }
      bb(-0.3, TOP + 2.3, ZB - 0.08, 0.3, TOP + 2.5, ZB, 0x222222); quad(0.56, 0.16, M.exit, 0, TOP + 2.4, ZB - 0.085, PI, 0, row(0, 4));
      quad(1.6, 0.2, M.sign, 0, TOP + 2.75, ZB - 0.01, PI, 0, row(1, 4));
      // side walls, fins, ceiling + light panels
      for (const s of [-1, 1]) {
        wall(s < 0 ? -6.3 : 5.9, -4.9, s < 0 ? -5.9 : 6.3, ZB, 0, 8.6, 0xffffff, M.conc, 1.6);
        for (let z = -1.5; z < 15; z += 3) bb(s < 0 ? -5.9 : 5.72, 0, z - 0.15, s < 0 ? -5.72 : 5.9, 8.4, z + 0.15, 0xe8e2d6, M.conc, 1.6);
        bb(s < 0 ? -5.9 : 5.85, 0, -4.5, s < 0 ? -5.85 : 5.9, 1.0, Z0, WD);
        for (const z of [3.6, 9.6]) { bb(s * 5.86 - 0.03, 6.6, z - 0.2, s * 5.86 + 0.03, 6.9, z + 0.2, 0x888888); ico(0.12, 0xfff0d8, s * 5.75, 6.75, z, 0.6, 1, 1, M.glow); }
      }
      bb(-6.3, 8.4, -4.9, 6.3, 8.6, ZB + 0.4, 0xf0ece4, M.conc, 1.6);
      for (const x of [-3.6, 0, 3.6]) for (let z = -2.5; z < 15; z += 3) { quad(1.3, 1.3, M.glow, x, 8.39, z, 0, H); bb(x - 0.72, 8.36, z - 0.72, x + 0.72, 8.4, z - 0.65, 0x9a9a9a); bb(x - 0.72, 8.36, z + 0.65, x + 0.72, 8.4, z + 0.72, 0x9a9a9a); }
      // front wall: panelling, blackboards, screen box, clock, bottom door opening + EXIT
      wall(-6.3, -4.9, -5.45, -4.5, 0, 8.6, 0xffffff, M.conc, 1.6); wall(-4.35, -4.9, 6.3, -4.5, 0, 8.6, 0xffffff, M.conc, 1.6);
      bb(-5.45, 2.2, -4.9, -4.35, 8.6, -4.5, 0xffffff, M.conc, 1.6); COL.push([-5.45, -4.9, -4.35, -4.6]);
      for (let x = -5.85; x < 5.85; x += 0.16) if (x < -5.5 || x > -4.3) bb(x, 0, -4.5, x + 0.12, 3.0, -4.46, (x * 10 | 0) % 3 ? WD : 0x7e5434);
      bb(-3.15, 0.85, -4.46, 3.15, 2.55, -4.4, 0x4a3020); quad(6.0, 1.55, M.board, 0, 1.7, -4.395, 0, 0, [0, 0.5, 1, 1]);
      bb(-3.15, 2.62, -4.47, 3.15, 4.18, -4.43, 0x4a3020); quad(6.0, 1.45, M.board, 0, 3.4, -4.425, 0, 0, [0, 0, 1, 0.5]);
      bb(-3.0, 0.86, -4.4, 3.0, 0.9, -4.3, 0x4a3020);
      for (let i = 0; i < 5; i++) bb(-2.2 + i * 0.12, 0.9, -4.36, -2.14 + i * 0.12, 0.915, -4.34, i === 2 ? 0xd8c040 : 0xf4f4f0);
      bb(1.6, 0.9, -4.38, 1.82, 0.95, -4.32, 0x6a4a2a); bb(1.6, 0.95, -4.38, 1.82, 0.97, -4.32, 0x999999);
      bb(-2.5, 4.35, -4.5, 2.5, 4.52, -4.3, 0xe8e8e8); cyl(0.01, 0.01, 0.6, 4, 0x333333, 1.9, 4.05, -4.31);
      cyl(0.34, 0.34, 0.06, 16, 0x333333, 0, 5.3, -4.47, H); quad(0.6, 0.6, M.clock, 0, 5.3, -4.435);
      bb(-5.2, 2.28, -4.48, -4.6, 2.48, -4.4, 0x222222); quad(0.56, 0.16, M.exit, -4.9, 2.38, -4.395, 0, 0, row(0, 4));
      quad(0.9, 0.12, M.sign, 4.6, 2.2, -4.455, 0, 0, row(2, 4)); quad(1.3, 0.12, M.sign, -3.6, 3.2, -4.455, 0, 0, row(3, 4));
      for (const s of [-1, 1]) bb(s * 5.2 - 0.25, 4.6, -4.5, s * 5.2 + 0.25, 5.1, -4.2, 0x2a2a2a);
      // lectern (Hartigan stands at z -2.05 facing the tiers), register, reading lamp; demo bench + projector
      bb(-0.38, 0, -1.78, 0.38, 0.08, -1.22, 0x4a3020); bb(-0.32, 0.08, -1.72, 0.32, 1.02, -1.28, 0x6a4428);
      bb(-0.3, 0.3, -1.281, 0.3, 0.9, -1.275, 0x5a3820); boxR(0.72, 0.05, 0.52, 0x7a5232, 0, 1.08, -1.52, -0.25);
      quad(0.44, 0.22, M.reg, 0, 1.115, -1.53, PI, -H + 0.25);
      rod(0.28, 1.1, -1.35, 0.28, 1.4, -1.45, 0.01, 0x333333); rod(0.28, 1.4, -1.45, 0.18, 1.42, -1.62, 0.01, 0x333333); ico(0.04, 0xfff4d0, 0.16, 1.39, -1.64, 1.3, 0.6, 1.3, M.glow);
      bb(-2.6, 0, -3.5, 2.6, 0.86, -2.8, 0x5a3a22); bb(-2.65, 0.86, -3.55, 2.65, 0.9, -2.75, 0x7a5232); COL.push([-2.65, -3.55, 2.65, -2.75], [-0.4, -1.8, 0.4, -1.2]);
      bb(1.6, 0.9, -3.35, 1.95, 1.02, -3.0, 0x8a8a84); bb(1.62, 1.02, -3.33, 1.93, 1.03, -3.02, 0xcfe0e8); rod(1.9, 1.02, -3.18, 1.9, 1.45, -3.18, 0.015, 0x555555); bb(1.78, 1.4, -3.26, 1.98, 1.5, -3.1, 0x444444);
      cyl(0.06, 0.07, 0.22, 8, 0xa8c8d8, -1.8, 1.01, -3.1); cyl(0.035, 0.03, 0.09, 8, 0xc8e0e8, -1.62, 0.945, -3.05);
      for (let i = 0; i < 4; i++) bb(-0.9, 0.9 + i * 0.05, -3.3, -0.6, 0.95 + i * 0.05 - 0.005, -3.08, [0x2a3a6a, 0x6a2a2a, 0x2a5a3a, 0x8a7a4a][i]);
      chair(-2.9, 0, -2.2, 0.4, 0x4a3020);
      for (let x = -1; x <= 1; x += 2) bb(x * 3.2 - 0.02, 0, -4.46, x * 3.2 + 0.02, 0.02, -4.4, 0x333333);
      const g = b.done();
      // ---- props
      R.door = doorLeaf('bottom_door', 1.1, 2.18, 0x6a4a2e, [-5.45, 0, -4.7], 0, -1.6, () => { bb(0.3, 1.35, -0.03, 0.8, 1.85, 0.03, 0xb8c8d0); bb(0.1, 0.95, 0.03, 1.0, 1.0, 0.08, 0xb8bcc0); });
      R.book = part('textbook', () => { bb(-0.085, 0, -0.12, 0.085, 0.035, 0.12, 0xf0ece0); quad(0.17, 0.24, M.book, 0, 0.036, 0, 0, -H); bb(-0.087, 0, -0.122, -0.08, 0.036, 0.122, 0xa8322a); }, [1.05, yr(9) + 0.76, zr(9) + 0.16], 0.25, { floor: false });
      R.glasses = part('glasses', () => {
        for (const s of [-1, 1]) { const gg = new THREE.TorusGeometry(0.022, 0.004, 4, 10); gg.rotateX(H); gg.translate(s * 0.03, 0.004, 0); put(gg, 0x2a2018); bb(s * 0.052, 0.003, -0.1, s * 0.056, 0.006, 0, 0x2a2018); }
        bb(-0.008, 0.003, -0.002, 0.008, 0.006, 0.002, 0x2a2018);
      }, GL_BENCH, 0.4, { floor: false });
      R.glasses.userData.knock = () => { R.glT = 0; };           // 2.3: knocked off the bench end, slides under the seat
      R.crowd = crowd(SEATS, 87, SETS.theatre);
      for (const k of ['seat_luka', 'seat_chase', 'ronan_seat', 'rue_sit', 'glasses_bench']) R.crowd.userData.hideNear(marks[k][0], marks[k][2]);
      g.add(R.door, R.book, R.glasses, R.crowd);
      R.root = g; R.scene = null; dress(sceneNow());
      return g;
    }
    function dress(id) {
      R.scene = id;
      const late = ord(id) > ord('2.3');
      R.crowd.visible = id !== '2.10';
      R.glasses.position.fromArray(late ? GL_FLOOR : GL_BENCH); R.glasses.rotation.y = late ? 1.9 : 0.4; R.glasses.visible = true; R.glT = 1;
      R.book.visible = !late;
      R.door.userData.open = undefined; R.door.rotation.y = 0;
      R.crowd.userData.look(null);
    }
    function update(dt) {
      if (!R.root) return;
      if (sceneNow() !== R.scene) dress(sceneNow());
      swing(R.door, dt, 9);
      if (R.glT < 1) {
        R.glT = Math.min(1, R.glT + dt / 0.7); const u = R.glT, g = R.glasses.position;
        g.set(GL_BENCH[0] + (GL_FLOOR[0] - GL_BENCH[0]) * u, GL_BENCH[1] + (GL_FLOOR[1] - GL_BENCH[1]) * Math.min(1, u * 2.5), GL_BENCH[2] + (GL_FLOOR[2] - GL_BENCH[2]) * u); R.glasses.rotation.y = 0.4 + 1.5 * u;
      }
      if (R.crowd.visible) R.crowd.userData.fidget(dt);
    }
    return {
      env: {
        day: { bg: 0x2e2c2a, fog: [0x4a4640, 0.012], hemi: [0xfff4e6, 0x6a6258, 1.1], dir: [0xfff0dd, 0.7, [3, 10, -6]], rain: 0 },
      },
      build, marks, update, colliders,
      anchors: {
        register: { at: [0, 1.12, -1.53], from: [0.08, 1.62, -2.02], fov: 35 },
        lectern: { at: [0, 1.0, -1.5], from: [0.5, 1.45, 1.4], fov: 40 },
        blackboard: { at: [0, 1.9, -4.4], from: [0.2, 1.8, -0.6], fov: 50 },
        bottom_door: { at: [-4.9, 1.15, -4.6], from: [-2.7, 1.55, -0.6], fov: 45 },
        glasses: { at: GL_BENCH, from: [0.35, yr(6) + 1.2, zr(6) + 0.2], fov: 30 },
        textbook: { at: [1.05, yr(9) + 0.78, zr(9) + 0.16], from: [0.35, yr(9) + 1.2, zr(9) + 0.75], fov: 35 },
        // extras
        glasses_floor: { at: GL_FLOOR, from: [0.3, yr(6) + 0.55, zr(6) + 0.35], fov: 35 },
        tiers: { at: [0, 3.4, 8], from: [0.35, 1.9, -2.6], fov: 55 },
        row: { at: [2.5, yr(6) + 1.2, zr(6) + 0.64], from: [0.2, yr(6) + 1.05, zr(6) - 0.2], fov: 40 },
        boys_back: { at: [-4.9, 1.2, -4.4], from: [2.9, yr(8) + 1.4, zr(8) + 0.4], fov: 40 },
      },
      cams: {
        lectern_view: { type: 'pan', pos: [0.45, 2.3, -3.6], look: 'player', base: [0, 3.0, 8.0], limit: 0.16, fov: 52 },
        back_row: { type: 'fixed', pos: [2.4, 7.5, 13.75], look: [0, 1.0, -2.0], fov: 45 },
        pit: { type: 'pan', pos: [4.6, 3.8, 3.4], look: 'player', base: [-2.2, 1.0, -2.8], limit: 0.35, fov: 55 },
      },
      zones: [
        { box: [-5.9, -4.5, 5.9, Z0], cam: 'pit' },
        { box: [-5.9, Z0, 5.9, ZB], cam: 'lectern_view' },
      ],
      floor(x, z) {
        if (z < Z0) return 0;
        if (z >= ZT) return TOP;
        if (x > -0.6 && x < 0.6) return 0.19 * (Math.floor((z - Z0) / 0.45) + 1);
        return RISE * (Math.floor((z - Z0) / D) + 1);
      },
      props: ['crowd', 'bottom_door', 'textbook', 'glasses'],
      ambience: { loops: ['aircon'], room: 'room' },
    };
  })();
  // ============================================================ THE BASEMENT COMPUTER LAB
  // A stairwell (x -0.8..0.8) runs down from a street door (top landing y 3.2, z -3..0) in 18 risers to a bottom
  // landing (z 5..7) and the lab door (z 7). Grey daylight at the top turns to green screen-glow at the bottom.
  // The lab: x -4..8, z 7.3..15.3, floor 0, ceiling 3.4. Computer bench on the west wall (Chase's screen is the
  // middle one), an island bench (bench_2) with a computer, a dot-matrix printer and the cassette recorder, Declan's
  // workbench (freestanding, east side: transformer, wire strippers), minicomputer cabinets on the north wall, the kettle in
  // the NW corner, and ONE high window in the south wall with the bike rig standing under it.
  // Props: bike_rig (hidden until after 2.6; its rear wheel 'bike_wheel' spins while an actor plays 'pedal' at the
  // bike_rig mark), recorder (on the island; beside Chase's computer after 2.6), transformer, strippers, screens
  // (every green screen but Chase's: hide them for "one green screen lit"), screen_main, prepaid_phone + bug_list
  // (hidden; Declan's bench), lab_door (userData.open = true), blinkers.
  SETS.lab = (() => {
    const colliders = [], R = {};
    const TS = 5 / 18, RS = 3.2 / 18;
    const REC_ISLAND = [1.62, 0.76, 9.95], REC_CHASE = [-3.55, 0.76, 11.8];
    const DADO = 0x5e7a62, UPPER = 0xe0d8c0, BENCH = 0xb89a70, BEIGE = 0xd6cfb8;
    const marks = {
      stairs_top: [0, 3.2, -1.0, 0], stairs_bottom: [0, 0, 5.6, 0], lab_door_out: [0, 0, 6.45, 0], lab_door_in: [0, 0, 8.1, 0],
      declan_bench: [5.65, 0, 11.0, H], declan_across: [7.25, 0, 11.1, -H], bike_rig: [3.05, 0, 14.2, -H], bike_side: [1.85, 0, 13.65, 1.1], chase_computer: [-2.95, 0, 11.2, -H],
      floor_sleep: [0.6, 0, 12.9, H], bench_2: [1.8, 0, 10.95, PI], window_below: [4.4, 0, 14.75, 0],
      kettle: [-2.55, 0, 8.45, -2.3], declan_door: [0.45, 0, 8.5, PI], lab_center: [2.0, 0, 12.2, 0], stairs_mid: [0, 1.6, 2.5, 0],
    };
    const tex = () => ({
      brick: brickTex(),
      lino: canvasTex(64, 64, (c) => {
        const r = rng(2); ['#8a9286', '#747c72', '#747c72', '#8a9286'].forEach((col, i) => { c.fillStyle = col; c.fillRect((i % 2) * 32, (i >> 1) * 32, 32, 32); });
        for (let i = 0; i < 260; i++) { c.fillStyle = r() < 0.5 ? 'rgba(40,50,40,0.25)' : 'rgba(230,235,225,0.25)'; c.fillRect(r() * 64, r() * 64, 2, 1); }
        c.fillStyle = '#5a6258'; c.fillRect(0, 0, 64, 1); c.fillRect(0, 0, 1, 64); c.fillRect(32, 0, 1, 64); c.fillRect(0, 32, 64, 1);
      }, { repeat: [1, 1], key: 'lab_lino' }),
      // green screens: 4 frames with the cursor on (top half), the same 4 without (bottom half)
      screen: canvasTex(128, 768, (c) => {
        const G = '#62ff7a', g2 = 'rgba(98,255,122,0.55)';
        const L = [
          ['PUDDING.SEQ   92 BPM', 'DYN o...o...o...o...', 'TIL ....o.......o...', 'KET o.o.o.o.o.o.o.o.', 'WHI o.o..o.o..o..o..', '> PLAY'],
          ['10 REM SHOP SYSTEM - D.J.', '20 DIM S(100),P(100)', '30 FOR I=1 TO 100', '40 READ S(I),P(I)', '50 NEXT I', '60 PRINT "RECEIPT"', 'RUN'],
          ['READY.', 'LOAD "DATA3"', 'SEARCHING', 'FOUND DATA3', 'LOADING', ''],
          ['', '', '', '', '', ''],
        ];
        for (let h = 0; h < 2; h++) for (let f = 0; f < 4; f++) {
          const y0 = (h * 4 + f) * 96; c.fillStyle = '#041008'; c.fillRect(0, y0, 128, 96);
          c.font = 'bold 9px monospace'; c.textBaseline = 'top'; c.textAlign = 'left';
          L[f].forEach((t, i) => { c.fillStyle = i ? G : g2; c.fillText(t, 5, y0 + 5 + i * 13); });
          if (f === 3) { c.strokeStyle = G; c.lineWidth = 2; c.beginPath(); for (let x = 4; x < 124; x++) c.lineTo(x, y0 + 48 + Math.sin(x * 0.19) * 22 * Math.sin(x * 0.02 + 1)); c.stroke(); c.fillStyle = 'rgba(98,255,122,0.25)'; for (let x = 4; x < 124; x += 15) c.fillRect(x, y0 + 4, 1, 88); }
          if (!h && f < 3) { c.fillStyle = G; c.fillRect(5 + (L[f][L[f].length - 1].length + (f === 2 ? 0 : 1)) * 5.4, y0 + 5 + (L[f].length - (f === 2 ? 1 : 1)) * 13, 6, 10); }
        }
      }, { key: 'lab_screen' }),
      door: canvasTex(256, 128, (c) => {
        c.fillStyle = '#f2f0e8'; c.fillRect(0, 0, 256, 128); c.strokeStyle = '#1a2a5a'; c.lineWidth = 5; c.strokeRect(5, 5, 246, 118);
        txt(c, 'COMPUTER LAB.', 128, 34, 'bold 28px sans-serif', '#1a2a5a'); txt(c, 'AUTHORISED USERS ONLY.', 128, 70, 'bold 19px sans-serif', '#1a2a5a');
        txt(c, 'KNOCK.', 128, 102, 'bold 26px sans-serif', '#b02020');
      }, { key: 'lab_door' }),
      sign: canvasTex(256, 256, (c) => {
        [['BASEMENT  ·  COMPUTER LAB  ↓', '#1a2a5a', '#fff', 'bold 17px sans-serif'], ['12V TRANSFORMER — MIND IT', '#e8e0c8', '#222', 'bold 15px sans-serif'],
          ['DO NOT TOUCH  — D.', '#f4f0a0', '#222', 'bold 19px sans-serif'], ['COMPUTER SOCIETY · THURS 7PM', '#2a6a4a', '#f4f4e0', 'bold 15px sans-serif'],
          ['DATA 3', '#f0ece0', '#222', 'bold 20px monospace'], ['PAPER', '#b08a5a', '#3a2a1a', 'bold 22px sans-serif'],
          ['FIRE EXIT', '#1f8a3a', '#fff', 'bold 22px sans-serif'], ['DO NOT SWITCH OFF', '#c02020', '#fff', 'bold 20px sans-serif']]
          .forEach(([t, bg, fg, f], i) => { c.fillStyle = bg; c.fillRect(0, i * 32, 256, 32); txt(c, t, 128, i * 32 + 16, f, fg); });
      }, { key: 'lab_sign' }),
      paper: canvasTex(64, 64, (c) => {
        c.fillStyle = '#f4f4ec'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#cfe8cf'; for (let y = 0; y < 64; y += 16) c.fillRect(6, y, 52, 8);
        c.fillStyle = '#bbb'; for (let y = 3; y < 64; y += 8) { c.beginPath(); c.arc(3, y, 1.3, 0, 7); c.arc(61, y, 1.3, 0, 7); c.fill(); }
        c.fillStyle = '#556'; for (let y = 2; y < 64; y += 4) c.fillRect(9, y, 20 + (y * 7) % 25, 1);
      }, { repeat: [1, 1], key: 'lab_paper' }),
      list: canvasTex(64, 64, (c) => {
        c.fillStyle = '#f6f2e4'; c.fillRect(0, 0, 64, 64); c.fillStyle = '#9ab'; for (let y = 10; y < 64; y += 6) c.fillRect(0, y, 64, 0.6);
        txt(c, 'BUGS', 30, 6, 'bold 7px sans-serif', '#1a2a6a'); c.fillStyle = '#1a2a6a'; for (let y = 12; y < 62; y += 6) c.fillRect(6, y - 2, 18 + (y * 13) % 34, 1.2);
      }, { key: 'lab_list' }),
      shaft: canvasTex(32, 64, (c) => { const g = c.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 32, 64); c.clearRect(0, 0, 3, 64); c.clearRect(29, 0, 3, 64); }, { key: 'lab_shaft' }),
      streak: streakTex('lab_streak'),
    });
    function pwall(x0, z0, x1, z1, y0 = 0, y1 = 3.4, col = true) {   // painted brick: green dado to 1.2, cream above
      if (y0 < 1.2) bb(x0, y0, z0, x1, Math.min(1.2, y1), z1, DADO, M.brick, 0.6);
      if (y1 > 1.2) bb(x0, Math.max(1.2, y0), z0, x1, y1, z1, UPPER, M.brick, 0.6);
      if (col) COL.push([x0, z0, x1, z1]);
    }
    function computer(x, y, z, ry, frame, into) {   // a green-screen micro facing local +Z; the glowing screen goes into the builder `into`
      at(x, y, z, ry);
      bb(-0.24, 0, -0.2, 0.24, 0.12, 0.16, BEIGE); bb(-0.2, 0.05, 0.161, -0.02, 0.065, 0.165, 0x333333);
      bb(-0.19, 0.12, -0.2, 0.19, 0.46, 0.14, 0xcfc8b0); bb(-0.15, 0.16, -0.34, 0.15, 0.42, -0.2, 0xc4bca4); bb(-0.155, 0.165, 0.14, 0.155, 0.415, 0.143, 0x0a120c);
      bb(-0.23, 0, 0.2, 0.23, 0.035, 0.38, 0xd8d0b8); for (let i = 0; i < 4; i++) bb(-0.21 + i * 0.01, 0.035, 0.22 + i * 0.04, 0.2, 0.043, 0.25 + i * 0.04, 0x8a8478);
      bb(0.28, 0, -0.05, 0.46, 0.06, 0.2, 0x2a2a2a); bb(0.3, 0.06, 0.1, 0.44, 0.065, 0.18, 0x777777); bb(0.31, 0.03, -0.051, 0.43, 0.055, 0.05, 0x445);
      const pb = b; b = into; quad(0.29, 0.23, M.screen, 0, 0.29, 0.147, 0, 0, row(frame, 8)); b = pb;
      XF = null;
    }
    function build() {
      colliders.length = 0; COL = colliders; TINT = null; XF = null; b = new Builder();
      const T = R.T = tex();
      M = {
        vc: mat(0xffffff), brick: matTex(T.brick), lino: matTex(T.lino), screen: matTex(T.screen, { emissive: 0xffffff, key: 'lab_screen' }),
        door: matTex(T.door), sign: matTex(T.sign), paper: matTex(T.paper), list: matTex(T.list),
        day: mat(0xc8d0d8, { emissive: 0xaab4be, emissiveIntensity: 0.6 }), green: mat(0x7aff9a, { emissive: 0x3aff6a, emissiveIntensity: 0.8 }),
        glow: mat(0xfff4e0, { emissive: 0xfff0d8 }), glass: matTex(T.streak, { transparent: true, key: 'lab_glass' }),
        tube: mat(0xf4fff8, { emissive: 0xeefff4, key: 'lab_tube' }), bulb: mat(0xffe0a0, { emissive: 0xffc860, emissiveIntensity: 0, key: 'lab_bulb' }),
        shaft: matTex(T.shaft, { transparent: true, opacity: 0.2, emissive: 0xfffff0, side: THREE.DoubleSide, key: 'lab_shaft' }),
        red: mat(0xff4030, { emissive: 0xff3020 }), amber: mat(0xffb030, { emissive: 0xffa020 }),
      };
      R.tubeM = M.tube; R.bulbM = M.bulb; R.shaftM = M.shaft;
      const scr = new Builder(), scrMain = new Builder();
      // ---- stairwell: top landing, 17 treads, bottom landing; walls tinted grey (top) -> green (bottom)
      bb(-0.8, 0, -3.0, 0.8, 3.2, 0, 0x6a6862);
      for (let k = 0; k < 17; k++) { const z0 = k * TS, y = 3.2 - (k + 1) * RS; bb(-0.8, 0, z0, 0.8, y, z0 + TS, 0x6e6c66); bb(-0.8, y - 0.002, z0 + TS - 0.05, 0.8, y + 0.004, z0 + TS, 0xa8a698); }
      bb(-0.8, -0.1, 4.72, 0.8, 0, 7.0, 0xffffff, M.lino, 0.6);
      const tint = (u) => [1 - 0.36 * u, 1, 1 - 0.26 * u];
      for (const s of [-1, 1]) {
        const xa = s < 0 ? -1.1 : 0.8, xb = s < 0 ? -0.8 : 1.1;
        TINT = tint(0); pwall(xa, -3.3, xb, 0, 0, 4.2, false); bb(xa, 4.2, -3.3, xb, 5.95, 0, UPPER, M.brick, 0.6);
        for (let k = 0; k < 18; k++) {
          TINT = tint(k / 17);
          const z0 = k * TS, y = Math.max(0, 3.2 - (k + 1) * RS), c = 5.8 - 0.6 * (z0 + TS / 2);
          bb(xa, 0, z0, xb, y + 1.0, z0 + TS, DADO, M.brick, 0.6); bb(xa, y + 1.0, z0, xb, c + 0.3, z0 + TS, UPPER, M.brick, 0.6);
        }
        TINT = tint(1); bb(xa, 0, 5.0, xb, 1.0, 7.0, DADO, M.brick, 0.6); bb(xa, 1.0, 5.0, xb, 3.0, 7.0, UPPER, M.brick, 0.6);
        COL.push([xa, -3.3, xb, 7.3]);
        TINT = null;
        rod(s * 0.75, 4.1, 0, s * 0.75, 0.9, 5.0, 0.025, 0x3a3a3a); rod(s * 0.75, 4.1, 0, s * 0.75, 4.1, -2.8, 0.025, 0x3a3a3a);
      }
      TINT = tint(0); bb(-1.1, 0, -3.3, 1.1, 5.95, -3.0, UPPER, M.brick, 0.6); COL.push([-1.1, -3.3, 1.1, -3.0]);
      bb(-0.8, 5.8, -3.0, 0.8, 5.95, 0, 0xd8d4c8); TINT = tint(0.5);
      boxR(1.6, 0.15, Math.hypot(5, 3), 0xd8d4c8, 0, 4.3 + 0.075, 2.5, Math.atan2(3, 5)); TINT = tint(1); bb(-0.8, 2.8, 5.0, 0.8, 2.95, 7.0, 0xd0d4c8); TINT = null;
      // street door (daylight) off the top landing, stair sign, the bulkhead light
      for (const x of [-0.6, 0.54]) bb(x, 3.2, -3.0, x + 0.06, 5.3, -2.96, 0x3a3a34);                         // street door (glazed, daylight) in the back wall
      bb(-0.6, 5.26, -3.0, 0.6, 5.32, -2.96, 0x3a3a34); bb(-0.54, 4.2, -2.99, 0.54, 4.26, -2.97, 0x3a3a34); bb(-0.54, 3.2, -2.99, 0.54, 3.9, -2.975, 0x4a4a42);
      quad(1.08, 1.36, M.day, 0, 4.58, -2.985); quad(1.3, 0.16, M.sign, 0.795, 4.55, -1.5, -H, 0, row(0, 8));
      bb(0.74, 3.2, 2.4, 0.8, 3.45, 2.6, 0x444444); quad(0.14, 0.18, M.glow, 0.735, 3.32, 2.5, -H);
      // lab door wall + frame; green light spilling under the door
      pwall(-4.3, 7.0, -0.5, 7.3); pwall(0.5, 7.0, 8.3, 7.3); pwall(-0.5, 7.0, 0.5, 7.3, 2.1, 3.4, false); COL.push([-0.5, 7.0, 0.5, 7.3]);
      for (const x of [-0.56, 0.5]) bb(x, 0, 6.97, x + 0.06, 2.16, 7.33, 0x4a5a4a); bb(-0.56, 2.1, 6.97, 0.56, 2.16, 7.33, 0x4a5a4a);
      quad(0.96, 0.03, M.green, 0, 0.015, 6.99, 0, 0);
      // ---- the lab: floor, walls, ceiling, window + light well
      bb(-4, -0.1, 7.3, 8, 0, 15.3, 0xffffff, M.lino, 0.6);
      pwall(-4.3, 7.3, -4.0, 15.3); pwall(8.0, 7.3, 8.3, 15.3);
      pwall(-4.3, 15.3, 2.0, 15.6); pwall(4.0, 15.3, 8.3, 15.6); pwall(2.0, 15.3, 4.0, 15.6, 0, 2.45); pwall(2.0, 15.3, 4.0, 15.6, 3.2, 3.4, false);
      bb(-4.3, 3.4, 7.0, 8.3, 3.55, 15.6, 0xe8e4d8);
      for (const x of [-4.0, 8.0]) bb(x - (x > 0 ? 0.04 : 0), 0, 7.3, x + (x > 0 ? 0 : 0.04), 0.1, 15.3, 0x3a4a3a);
      bb(1.95, 2.4, 15.2, 4.05, 2.46, 15.6, 0xd8d8d0); bb(1.95, 3.18, 15.3, 4.05, 3.24, 15.6, 0xd8d8d0);
      for (const x of [1.97, 2.66, 3.34, 4.03]) bb(x - 0.03, 2.45, 15.4, x + 0.03, 3.2, 15.5, 0xd8d8d0);
      quad(2.0, 0.75, M.glass, 3.0, 2.825, 15.45, PI);
      bb(1.6, 2.2, 15.6, 4.4, 2.4, 17.2, 0x6a6a64); bb(1.4, 2.2, 15.6, 1.6, 3.5, 17.4, 0x8a8478); bb(4.4, 2.2, 15.6, 4.6, 3.5, 17.4, 0x8a8478); bb(1.4, 2.2, 17.2, 4.6, 3.5, 17.4, 0x8a8478);
      bb(-1, 3.4, 15.6, 7, 3.5, 22, 0x6a7a5a); for (let x = 1.5; x <= 4.5; x += 0.25) rod(x, 3.5, 17.35, x, 4.3, 17.35, 0.012, 0x222222); rod(1.4, 4.3, 17.35, 4.6, 4.3, 17.35, 0.02, 0x222222);
      for (let i = 0; i < 7; i++) boxR(0.08, 0.12, 0.08, 0x4a6a3a, 1.7 + i * 0.42, 2.46, 16.4 + (i % 3) * 0.3, 0, i);
      quad(1.9, 3.6, M.shaft, 3.0, 1.56, 14.34, 0, 0.548);
      // fluorescent fittings, pipes, fire extinguisher, noticeboard, posters, boxes
      for (const x of [-1.2, 4.8]) for (const z of [9.5, 13.0]) { bb(x - 0.7, 3.3, z - 0.12, x + 0.7, 3.4, z + 0.12, 0xe8e8e0); quad(1.3, 0.1, M.tube, x, 3.295, z, 0, H); }
      cyl(0.06, 0.06, 8, 8, 0x8a7a6a, 7.72, 3.22, 11.3, H); cyl(0.04, 0.04, 8, 8, 0xa03a2a, 7.55, 3.26, 11.3, H); cyl(0.05, 0.05, 8, 8, 0x8a8a84, -3.75, 3.24, 11.3, H);
      cyl(0.05, 0.05, 3.3, 8, 0x8a7a6a, 7.85, 1.7, 15.15); for (const z of [9, 12, 15]) bb(7.6, 3.1, z - 0.02, 7.9, 3.4, z + 0.02, 0x555555);
      cyl(0.08, 0.08, 0.5, 8, 0xc02020, 0.8, 0.35, 7.45); cyl(0.03, 0.03, 0.08, 6, 0x222222, 0.8, 0.64, 7.45); quad(0.5, 0.1, M.sign, 0.9, 2.4, 7.305, 0, 0, row(6, 8));
      bb(-3.8, 1.3, 7.3, -1.3, 2.25, 7.34, 0xa07a50); bb(-3.84, 1.26, 7.3, -1.26, 1.3, 7.36, 0x5a3a22); bb(-3.84, 2.25, 7.3, -1.26, 2.29, 7.36, 0x5a3a22);
      quad(0.9, 0.12, M.sign, -2.55, 2.1, 7.345, 0, 0, row(3, 8));
      for (const [x, y, w, h, c] of [[-3.5, 1.7, 0.3, 0.4, 0xf4f4ec], [-3.1, 1.6, 0.26, 0.34, 0xf0e8a0], [-2.2, 1.65, 0.36, 0.26, 0xf4f4ec], [-1.7, 1.55, 0.22, 0.3, 0xd8e8f8], [-2.7, 1.5, 0.2, 0.24, 0xf8d0d0]]) quad(w, h, M.vc, x, y, 7.345, 0, 0, null, c);
      quad(0.6, 0.12, M.sign, -3.0, 1.45, 15.29, PI, 0, row(3, 8));
      for (const [x, z, n] of [[7.4, 14.7, 3], [6.8, 14.8, 2], [-3.5, 14.8, 2]]) for (let i = 0; i < n; i++) { bb(x - 0.28, i * 0.4, z - 0.3, x + 0.28, i * 0.4 + 0.4, z + 0.3, 0xb08a5a); if (!i) quad(0.4, 0.07, M.sign, x, 0.2, z - 0.305, PI, 0, row(5, 8)); }
      COL.push([6.5, 14.4, 8.0, 15.3], [-4.0, 14.5, -3.2, 15.3]);
      // ---- west bench: three computers (Chase's is the middle one) + chairs
      bb(-4.0, 0.72, 8.5, -3.2, 0.76, 14.5, BENCH); COL.push([-4.0, 8.5, -3.2, 14.5]);
      for (const z of [8.55, 14.45]) bb(-4.0, 0, z - 0.05, -3.25, 0.72, z + 0.05, 0x6a5a4a);
      bb(-4.0, 0, 13.6, -3.3, 0.72, 14.4, 0x8a7a64); for (let i = 0; i < 3; i++) bb(-3.31, 0.08 + i * 0.22, 13.65, -3.29, 0.1 + i * 0.22, 14.35, 0x5a4a3a);
      computer(-3.62, 0.76, 9.4, H, 2, scr); computer(-3.62, 0.76, 11.2, H, 0, scrMain); computer(-3.62, 0.76, 13.0, H, 1, scr);
      for (const z of [9.4, 13.0]) { at(-2.95, 0, z, -H - 0.3); swivel(); XF = null; }
      at(-2.95, 0, 11.2, -H); swivel(0x2a3a5a); XF = null;
      for (let i = 0; i < 6; i++) boxR(0.07, 0.012, 0.11, i % 2 ? 0x222222 : 0x444444, -3.4 + (i % 3) * 0.08, 0.77 + (i >> 1) * 0.013, 12.1 + i * 0.03, 0, i * 0.3);
      bb(-3.95, 0.76, 11.65, -3.7, 0.8, 11.95, 0x1a1a1a); rod(-3.8, 0.8, 11.7, -3.8, 0.92, 11.8, 0.01, 0x1a1a1a);   // headphones on a stand
      cyl(0.07, 0.07, 0.03, 10, 0x2a2a2a, -3.85, 0.95, 11.72, 0, H); cyl(0.07, 0.07, 0.03, 10, 0x2a2a2a, -3.85, 0.95, 11.9, 0, H);
      // ---- island bench (bench_2): computer, dot-matrix printer (+ paper), cassettes, stool
      bb(0.2, 0.72, 9.2, 3.4, 0.76, 10.4, BENCH); bb(0.3, 0.2, 9.3, 3.3, 0.23, 10.3, 0x8a7a64); COL.push([0.2, 9.2, 3.4, 10.4]);
      for (const x of [0.25, 3.35]) for (const z of [9.25, 10.35]) bb(x - 0.03, 0, z - 0.03, x + 0.03, 0.72, z + 0.03, 0x6a5a4a);
      computer(0.95, 0.76, 9.72, 0, 1, scr);
      at(2.35, 0.76, 9.7, 0); bb(-0.25, 0, -0.16, 0.25, 0.12, 0.16, BEIGE); bb(-0.22, 0.12, -0.05, 0.22, 0.14, 0.08, 0x3a3a3a); bb(-0.24, 0.05, 0.16, -0.14, 0.09, 0.165, 0x333333); XF = null;
      quad(0.38, 0.55, M.paper, 2.35, 1.05, 9.5, 0, -0.35); quad(0.38, 0.5, M.paper, 2.35, 0.55, 9.18, PI, 0.1);
      for (let i = 0; i < 8; i++) bb(2.15, 0.23 + i * 0.012, 9.4, 2.55, 0.24 + i * 0.012, 9.75, 0xf2f2ea);
      for (let i = 0; i < 5; i++) boxR(0.07, 0.012, 0.11, 0x222222, 2.9 + (i % 2) * 0.1, 0.77 + (i >> 1) * 0.013, 10.1 - i * 0.02, 0, i * 0.5);
      quad(0.06, 0.03, M.sign, 2.95, 0.785, 10.1, 0, -H, row(4, 8));
      stool(1.8, 0, 10.95); stool(0.6, 0, 11.0);
      cyl(0.16, 0.13, 0.4, 10, 0x6a6a6a, 3.8, 0.2, 10.9); for (let i = 0; i < 3; i++) ico(0.07, 0xf2f2ea, 3.78 + i * 0.03, 0.42 + i * 0.02, 10.9, 1, 0.7, 1);
      // ---- Declan's workbench: freestanding (x 6.0..6.8) so people can face each other across it; pegboard + tools on the wall
      bb(7.96, 1.05, 8.8, 8.0, 2.2, 13.2, 0xb08a60);
      for (let z = 9.0; z < 13.1; z += 0.35) { const k = (z * 10 | 0) % 4; rod(7.95, 1.9, z, 7.95, 1.5 + k * 0.05, z, 0.008, 0xb0b0b0); bb(7.92, 1.85, z - 0.02, 7.96, 1.98, z + 0.02, [0xc02020, 0xe0b020, 0x2050c0, 0x222222][k]); }
      for (const z of [9.6, 11.8]) { const g = new THREE.TorusGeometry(0.1, 0.02, 4, 10); g.rotateY(H); g.translate(7.94, 1.35, z); put(g, z < 10 ? 0xc03020 : 0x2a2a2a); }
      quad(0.6, 0.1, M.sign, 7.955, 2.1, 11.0, -H, 0, row(2, 8));
      at(6.09, 0.76, 9.15, -H); const pb0 = b; b = scr; quad(0.16, 0.13, M.screen, 0.06, 0.16, 0.005, 0, 0, row(3, 8)); b = pb0;
      at(-1.2, 0, 0);                                                            // the bench items were laid out against the wall; shift them onto the bench
      bb(7.2, 0.72, 8.6, 8.0, 0.76, 13.4, 0x9a7a52); bb(7.25, 0.2, 8.7, 7.95, 0.23, 13.3, 0x7a6a54);
      for (const z of [8.65, 13.35]) bb(7.25, 0, z - 0.03, 7.95, 0.72, z + 0.03, 0x6a5a4a);
      bb(7.3, 0.76, 8.95, 7.8, 1.06, 9.4, 0x8a8a84); bb(7.29, 0.8, 9.0, 7.3, 1.02, 9.35, 0x333333);
      bb(7.35, 0.76, 9.7, 7.65, 0.84, 9.95, 0x3a3a3a); rod(7.45, 0.86, 9.8, 7.3, 0.95, 9.72, 0.01, 0x999999); cyl(0.05, 0.05, 0.02, 8, 0xe0c040, 7.58, 0.85, 9.85);
      rod(7.75, 0.76, 12.9, 7.6, 1.2, 12.8, 0.015, 0x444444); { const g = new THREE.TorusGeometry(0.08, 0.015, 4, 10); g.rotateX(H + 0.5); g.translate(7.5, 1.15, 12.75); put(g, 0x444444); }
      bb(7.55, 0.76, 13.0, 7.95, 1.1, 13.35, 0x6a6a74); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) bb(7.54, 0.79 + i * 0.075, 13.03 + j * 0.105, 7.55, 0.85 + i * 0.075, 13.12 + j * 0.105, 0xd8d8d8);
      cyl(0.09, 0.09, 0.07, 10, 0xc07030, 7.6, 0.8, 12.55, H); cyl(0.07, 0.07, 0.06, 10, 0x3050a0, 7.4, 0.79, 12.45, H);
      mug(7.35, 0.76, 11.95, 0xd8d0b8, 0, 0x3a2a1a); for (let i = 0; i < 3; i++) rod(7.35 + i * 0.01, 0.8, 11.95, 7.34 + i * 0.02, 0.95, 11.9 + i * 0.02, 0.006, [0x2040c0, 0xc02020, 0x222222][i]);
      bb(7.3, 0.76, 10.7, 7.6, 0.77, 10.95, 0xe8e8e0); for (let i = 0; i < 5; i++) bb(7.33, 0.77, 10.72 + i * 0.045, 7.57, 0.775, 10.74 + i * 0.045, 0xc8a040);
      XF = null; COL.push([6.0, 8.6, 6.8, 13.4]);
      stool(5.65, 0, 11.0);
      // ---- minicomputer cabinets (north wall), kettle table (NW corner)
      for (let i = 0; i < 3; i++) {
        const x0 = 3.0 + 1.2 * i;
        bb(x0 + 0.02, 0, 7.3, x0 + 1.18, 1.9, 7.95, 0xc8c8c0); bb(x0 + 0.02, 1.7, 7.95, x0 + 1.18, 1.85, 7.96, 0x3a5a8a);
        if (i < 2) { bb(x0 + 0.08, 0.85, 7.95, x0 + 1.12, 1.6, 7.955, 0x1a1e22); for (const dx of [0.35, 0.85]) { cyl(0.2, 0.2, 0.03, 16, 0x2a2a2a, x0 + dx, 1.25, 7.97, H); cyl(0.05, 0.05, 0.04, 8, 0xc0c0c0, x0 + dx, 1.25, 7.98, H); } }
        else { bb(x0 + 0.1, 0.9, 7.95, x0 + 1.1, 1.6, 7.955, 0x2a3a5a); for (let r2 = 0; r2 < 3; r2++) for (let c2 = 0; c2 < 8; c2++) bb(x0 + 0.16 + c2 * 0.11, 1.0 + r2 * 0.12, 7.955, x0 + 0.2 + c2 * 0.11, 1.06 + r2 * 0.12, 7.99, 0xd0d0c8); }
        bb(x0 + 0.1, 0.1, 7.95, x0 + 1.1, 0.7, 7.952, 0xb8b8b0);
      }
      quad(0.7, 0.1, M.sign, 6.0, 1.78, 7.962, 0, 0, row(7, 8)); COL.push([3.0, 7.3, 6.6, 8.0]);
      bb(-3.95, 0, 7.35, -2.8, 0.8, 8.0, 0x8a6a4a); COL.push([-3.95, 7.3, -2.8, 8.0]);
      cyl(0.09, 0.11, 0.24, 10, 0xc8ccd0, -3.1, 0.92, 7.7); cyl(0.05, 0.09, 0.04, 10, 0xc8ccd0, -3.1, 1.06, 7.7); bb(-3.24, 0.86, 7.68, -3.2, 1.02, 7.72, 0x1a1a1a); boxR(0.03, 0.03, 0.1, 0xc8ccd0, -2.97, 0.98, 7.7, 0, 0, -0.7);
      cyl(0.05, 0.05, 0.14, 8, 0x6a3a1a, -3.5, 0.87, 7.6); cyl(0.052, 0.052, 0.03, 8, 0xe0c040, -3.5, 0.95, 7.6); cyl(0.035, 0.035, 0.2, 8, 0xf4f4f0, -3.7, 0.9, 7.8);
      mug(-3.4, 0.8, 7.85, 0xc03030, 1); mug(-3.25, 0.8, 7.5, 0x2a6a9a, 2); mug(-3.75, 0.8, 7.45, 0xf0e8d0, 0.4);
      const g = b.done();
      // ---- props
      R.screens = scr.done({ floor: false }); R.screens.name = 'screens';
      R.main = scrMain.done({ floor: false }); R.main.name = 'screen_main';
      R.blink = part('blinkers', () => { for (let c2 = 0; c2 < 8; c2++) quad(0.035, 0.025, c2 % 3 ? M.red : M.amber, 5.62 + c2 * 0.11, 1.5, 7.957); }, null);
      R.door = doorLeaf('lab_door', 1.0, 2.08, 0x5a6a5a, [-0.5, 0, 7.15], 0, -1.5, () => {
        quad(0.62, 0.31, M.door, 0.5, 1.2, -0.03, PI); quad(0.34, 0.36, M.green, 0.5, 1.72, -0.03, PI); quad(0.34, 0.36, M.green, 0.5, 1.72, 0.03);
        for (const y of [1.54, 1.9]) bb(0.32, y - 0.01, -0.035, 0.68, y + 0.01, 0.035, 0x3a4a3a); bb(0.05, 0.05, -0.03, 0.95, 0.3, -0.028, 0x9a9a9a);
      });
      R.rec = part('recorder', () => {
        bb(-0.14, 0, -0.07, 0.14, 0.065, 0.07, 0x1e1e1e); bb(-0.12, 0.065, -0.05, 0.02, 0.068, 0.04, 0x3a3a3a); bb(0.04, 0.02, 0.07, 0.13, 0.06, 0.072, 0xa0a0a0);
        for (let i = 0; i < 6; i++) bb(-0.12 + i * 0.027, 0.065, 0.045, -0.1 + i * 0.027, 0.075, 0.068, i === 0 ? 0xc02020 : 0xc0c0c0);
        rod(-0.1, 0.065, 0, -0.1, 0.12, 0, 0.008, 0x333333); rod(0.1, 0.065, 0, 0.1, 0.12, 0, 0.008, 0x333333); rod(-0.1, 0.12, 0, 0.1, 0.12, 0, 0.01, 0x333333);
        cyl(0.012, 0.012, 0.005, 8, 0x888888, 0.1, 0.068, -0.04);
      }, REC_ISLAND, 0, { floor: false });
      R.tr = part('transformer', () => {
        bb(-0.1, 0, -0.08, 0.1, 0.1, 0.08, 0x5a1a14); cyl(0.045, 0.05, 0.03, 10, 0x111111, -0.02, 0.115, 0); bb(-0.025, 0.13, -0.005, 0.005, 0.135, 0.005, 0xffffff);
        bb(0.05, 0.1, -0.03, 0.08, 0.12, 0.03, 0x222222); cyl(0.01, 0.01, 0.03, 6, 0xc02020, 0.07, 0.03, 0.085, H); cyl(0.01, 0.01, 0.03, 6, 0x111111, 0.03, 0.03, 0.085, H);
        quad(0.16, 0.025, M.sign, 0, 0.06, 0.081, 0, 0, row(1, 8));
      }, [6.35, 0.76, 12.2], -H, { floor: false });
      R.strip = part('strippers', () => { rod(0, 0.01, 0, -0.03, 0.01, 0.12, 0.009, 0xc02020); rod(0, 0.01, 0, 0.03, 0.01, 0.12, 0.009, 0xc02020); rod(0, 0.01, 0, -0.01, 0.01, -0.06, 0.006, 0x9a9a9a); rod(0, 0.01, 0, 0.01, 0.01, -0.06, 0.006, 0x9a9a9a); }, [6.25, 0.76, 10.3], 0.6, { floor: false });
      R.list = part('bug_list', () => quad(0.2, 0.26, M.list, 0, 0.003, 0, 0.2, -H), [6.25, 0.76, 11.4], 0, { floor: false });
      R.phone = part('prepaid_phone', () => { bb(-0.036, 0, -0.075, 0.036, 0.009, 0.075, 0x1a1a1e); bb(-0.032, 0.009, -0.068, 0.032, 0.0095, 0.068, 0x050508); bb(-0.03, 0.0096, 0.01, 0.0, 0.0098, 0.012, 0x444444); }, [6.26, 0.763, 11.38], 0.5, { floor: false });
      R.rig = part('bike_rig', () => {
        const C = [0, 0.33, 0.22], S = [0, 0.8, -0.02], Ht = [0, 0.95, 0.56], Hb = [0, 0.72, 0.62], Ra = [0, 0.4, -0.38], Fa = [0, 0.38, 0.72], RUST = 0x8a3a2a;
        const tube = (a, c2, r = 0.02, col = RUST) => rod(a[0], a[1], a[2], c2[0], c2[1], c2[2], r, col);
        tube(C, S); tube(S, Ht); tube(C, Hb); tube(Hb, Ht, 0.024); for (const x of [-0.04, 0.04]) { tube([x, C[1], C[2]], [x, Ra[1], Ra[2]], 0.012); tube([x, S[1], S[2]], [x, Ra[1], Ra[2]], 0.012); tube([x, Hb[1], Hb[2]], [x, Fa[1], Fa[2]], 0.014, 0x8a8a8a); }
        tube(Ht, [0, 1.02, 0.54], 0.018, 0x8a8a8a); tube([-0.27, 1.02, 0.54], [0.27, 1.02, 0.54], 0.014, 0x9a9a9a); for (const x of [-0.27, 0.27]) tube([x, 1.02, 0.54], [x * 1.05, 1.0, 0.44], 0.02, 0x222222);
        tube([0, 0.8, -0.02], [0, 0.86, 0], 0.014, 0x8a8a8a); bb(-0.07, 0.85, -0.13, 0.07, 0.9, 0.08, 0x222222);
        cyl(0.1, 0.1, 0.02, 12, 0x9a9a9a, 0.06, C[1], C[2], 0, H); tube([0.08, C[1], C[2]], [0.08, C[1] + 0.12, C[2] + 0.1], 0.012, 0x888888); tube([-0.08, C[1], C[2]], [-0.08, C[1] - 0.12, C[2] - 0.1], 0.012, 0x888888);
        bb(0.06, C[1] + 0.1, C[2] + 0.06, 0.16, C[1] + 0.13, C[2] + 0.16, 0x333333); bb(-0.16, C[1] - 0.14, C[2] - 0.16, -0.06, C[1] - 0.11, C[2] - 0.06, 0x333333);
        const wheel = () => { const t = new THREE.TorusGeometry(0.34, 0.022, 4, 18); t.rotateY(H); put(t, 0x1a1a1a); for (let i = 0; i < 8; i++) { const a = i * PI / 4; rod(0, 0, 0, 0, Math.sin(a) * 0.33, Math.cos(a) * 0.33, 0.004, 0xa0a0a0); } cyl(0.03, 0.03, 0.1, 8, 0x888888, 0, 0, 0, 0, H); };
        at(Fa[0], Fa[1], Fa[2]); wheel(); XF = null;
        bb(-0.08, 0, 0.6, 0.08, 0.05, 0.86, 0x9a7a4a);                                                                         // block under the front wheel
        for (const [x, z] of [[-0.18, -0.6], [0.18, -0.6], [-0.18, -0.16], [0.18, -0.16]]) rod(x, 0, z, 0, Ra[1], Ra[2], 0.012, 0x555555);
        bb(-0.2, 0, -0.64, 0.2, 0.02, -0.12, 0x444444);
        cyl(0.028, 0.028, 0.1, 8, 0xc0c0c0, 0.07, 0.68, -0.62, 0.7); cyl(0.018, 0.018, 0.02, 8, 0x222222, 0.07, 0.64, -0.66, 0.7);   // bottle dynamo on the tyre
        stool(0.55, 0, -0.35); at(0.55, 0.48, -0.35, 0.3); bb(-0.1, 0, -0.08, 0.1, 0.1, 0.08, 0x5a1a14); cyl(0.045, 0.05, 0.03, 10, 0x111111, -0.02, 0.115, 0); XF = null;
        rod(0.08, 0.7, -0.62, 0.3, 0.9, -0.5, 0.006, 0xc02020); rod(0.3, 0.9, -0.5, 0.5, 0.56, -0.4, 0.006, 0xc02020); rod(0.08, 0.68, -0.6, 0.32, 0.86, -0.46, 0.006, 0x111111); rod(0.32, 0.86, -0.46, 0.52, 0.56, -0.32, 0.006, 0x111111);
        bb(0.42, 0, 0.1, 0.82, 0.3, 0.42, 0x9a7a4a); for (let i = 0; i < 3; i++) boxR(0.07, 0.01, 0.15, i === 1 ? 0x2a2a30 : 0x1a1a1e, 0.52 + i * 0.1, 0.305, 0.26, 0, 0.2 * i - 0.2);
        rod(0.6, 0.56, -0.3, 0.6, 0.31, 0.14, 0.008, 0xf0f0f0); rod(0.6, 0.31, 0.14, 0.62, 0.31, 0.24, 0.008, 0xf0f0f0);
      }, [3.05, 0, 14.2], -H);
      R.wheel = part('bike_wheel', () => { const t = new THREE.TorusGeometry(0.34, 0.022, 4, 18); t.rotateY(H); put(t, 0x1a1a1a); for (let i = 0; i < 8; i++) { const a = i * PI / 4; rod(0, 0, 0, 0, Math.sin(a) * 0.33, Math.cos(a) * 0.33, 0.004, 0xa0a0a0); } cyl(0.03, 0.03, 0.1, 8, 0x888888, 0, 0, 0, 0, H); }, [0, 0.4, -0.38], 0, { floor: false });
      R.bulb = part('rig_bulb', () => ico(0.035, 0xffffff, 0, 0, 0, 1, 1.3, 1, M.bulb), [0.55, 0.66, -0.3], 0, { floor: false });
      R.rig.add(R.wheel, R.bulb);
      COL.push([2.1, 13.8, 4.0, 15.1]);
      const rain = makeRain({ box: [1.6, 15.6, 4.4, 17.2], top: 6, bottom: 2.4, count: 260 });
      g.add(R.screens, R.main, R.blink, R.door, R.rec, R.tr, R.strip, R.list, R.phone, R.rig, rain);
      R.root = g; R.hemi = null; R.spin = 0; R.scene = null; dress(sceneNow());
      return g;
    }
    function dress(id) {
      R.scene = id;
      const built = ord(id) > ord('2.6');
      R.rig.visible = built; R.tr.visible = !built;
      R.rec.position.fromArray(built ? REC_CHASE : REC_ISLAND); R.rec.rotation.y = built ? -H : 0; R.rec.visible = true;
      R.strip.visible = true; R.list.visible = R.phone.visible = false;
      R.screens.visible = R.main.visible = true;
      R.door.userData.open = undefined; R.door.rotation.y = 0;
    }
    let pedal = false;
    const checkPedal = (a) => { if (a.anim === 'pedal' && a.root.visible && Math.abs(a.pos.x - 3.05) < 0.7 && Math.abs(a.pos.z - 14.2) < 0.7) pedal = true; };
    function update(dt, ctx) {
      if (!R.root) return;
      if (sceneNow() !== R.scene) dress(sceneNow());
      if (!R.hemi) R.hemi = hemiOf(R.root);
      const k = R.hemi ? clamp((R.hemi.intensity - 0.35) / 0.55, 0, 1) : 1, t = ctx.t;
      R.shaftM.opacity = 0.2 * k; R.tubeM.emissiveIntensity = k > 0.4 ? 1 : 0.04;
      R.T.screen.offset.y = t % 1 < 0.55 ? 0 : -0.5;
      R.T.streak.offset.y = t * 0.1;
      R.blink.visible = (t * 2.5 | 0) % 2 === 0;
      pedal = false;
      if (typeof world !== 'undefined' && world.actors) world.actors.forEach(checkPedal);
      R.spin += ((pedal ? 14 : 0) - R.spin) * Math.min(1, dt * 1.5);
      R.wheel.rotation.x += R.spin * dt; R.bulbM.emissiveIntensity = Math.min(1.3, R.spin / 10);
      swing(R.door, dt);
    }
    return {
      env: {
        day: { bg: 0x9aa3ab, fog: [0x3a4a40, 0.02], hemi: [0xe0eae2, 0x8a968c, 0.95], dir: [0xd8e2ea, 0.55, [2, 10, -6]], rain: 1 },
        night: { bg: 0x06090b, fog: [0x061008, 0.04], hemi: [0x4a7a5a, 0x10181a, 0.45], dir: [0x3a7a55, 0.18, [2, 10, -6]], rain: 1 },
      },
      build, marks, update, colliders,
      anchors: {
        recorder: { at: [1.62, 0.8, 9.95], from: [1.2, 1.22, 10.6], fov: 35 },
        transformer: { at: [6.35, 0.84, 12.2], from: [5.6, 1.3, 11.75], fov: 35 },
        strippers: { at: [6.25, 0.78, 10.3], from: [5.7, 1.3, 10.05], fov: 30 },
        computer: { at: [-3.47, 1.05, 11.2], from: [-2.72, 1.14, 11.24], fov: 35 },
        high_window: { at: [3.0, 2.8, 15.4], from: [2.3, 1.2, 12.0], fov: 40 },
        kettle: { at: [-3.1, 0.95, 7.7], from: [-2.45, 1.35, 8.5], fov: 35 },
        bike_rig: { at: [3.0, 0.75, 14.2], from: [3.0, 1.3, 11.3], fov: 45 },
        declan_bench: { at: [6.4, 0.95, 11.0], from: [4.6, 1.6, 10.1], fov: 45 },
        list_on_bench: { at: [6.25, 0.78, 11.4], from: [5.85, 1.3, 11.3], fov: 35 },
        across_bench: { at: [6.45, 1.25, 11.05], from: [6.4, 1.45, 8.9], fov: 45 },
        // extras
        door_sign: { at: [0, 1.25, 7.1], from: [0.62, 1.5, 6.55], fov: 40 },
        prepaid: { at: [6.26, 0.78, 11.38], from: [5.85, 1.2, 11.3], fov: 30 },
        timelapse: { at: [0.8, 0.9, 13.4], from: [7.4, 2.9, 8.0], fov: 55 },
        lab_wide: { at: [3.0, 1.0, 11.5], from: [-3.6, 2.8, 7.8], fov: 55 },
        stairwell: { at: [0, 1.2, 6.8], from: [0, 5.2, -2.7], fov: 55 },
      },
      cams: {
        stairwell: { type: 'fixed', pos: [0.3, 5.45, -2.75], look: [0, 0.9, 6.9], fov: 55 },
        lab_door: { type: 'pan', pos: [7.5, 2.95, 14.9], look: 'player', base: [0, 1.1, 8.5], limit: 0.3, fov: 55 },
        lab_window: { type: 'pan', pos: [7.4, 2.95, 7.9], look: 'player', base: [1.5, 1.0, 13.5], limit: 0.35, fov: 55 },
      },
      zones: [
        { box: [-0.8, -3.0, 0.8, 7.0], cam: 'stairwell' },
        { box: [-4, 7.3, 8, 11.2], cam: 'lab_door' },
        { box: [-4, 11.2, 8, 15.3], cam: 'lab_window' },
      ],
      floor(x, z) {
        if (x > -1 && x < 1 && z < 7) return z < 0 ? 3.2 : z < 5 ? Math.max(0, 3.2 - (Math.floor(z / TS) + 1) * RS) : 0;
        return 0;
      },
      props: ['bike_rig', 'bike_wheel', 'recorder', 'transformer', 'strippers', 'screens', 'screen_main', 'prepaid_phone', 'bug_list', 'lab_door', 'blinkers'],
      ambience: { loops: ['hum', 'fluoro'], room: 'room' },
    };
  })();
  // ============================================================ RUE'S ROOMS (House Six)
  // A square stairwell climbs three floors round an open well (outer +-3.8): ground floor y -9 (front door, SW
  // corner), flight A along the south wall to the SE landing (y -6), flight B up the east wall to the NE landing
  // (y -3), flight C along the north wall to the top landing (NW, y 0). The corridor runs west from the top landing
  // (z 2.4..3.8) to two steps up (x -11.4..-12.3) and Rue's door in the end wall (x -12.45). The room beyond: x -18.5
  // ..-12.6, z 0.35..5.85, floor 0.4. Neat, cold, symmetrical: door -> Rue's chair (back to the door) -> desk ->
  // floor -> the bed along the far wall with the City of London poster centred over it like an altarpiece; the window
  // (streetlight outside) on the south wall mirrored by the wardrobe on the north wall.
  // Props: door (userData.open = true swings it into the room), desk_chair (rotation.y -H faces the desk, +H the
  // door), coats (two coats laid out on the floor from 2.9; pos [0, 0.22, 0] lays them over lying actors), mess +
  // mugs3 (hidden until after 2.13; mug hides itself while mugs3 shows), mug, streetlight (window light + crawling
  // rain-shadows on the floor, bed and wall; shown by the 'night' env), room_lamp (userData.on(true|false|null)).
  SETS.rooms = (() => {
    const colliders = [], R = {};
    const SR = 0.1875, ST = 0.3, WOOD = 0x6a4a30, WALL = 0xd8d0bc, ROOM = 0xbcc6ce;
    const st = (u) => Math.min(16, Math.floor(u / ST) + 1) * SR;
    const marks = {
      stair_1: [-3.1, -9, -3.1, H], stair_2: [3.1, -6, -3.1, 0], stair_3: [3.1, -3, 3.1, -H], stair_4: [-3.1, 0, 3.1, -H],
      corridor_door: [-12.0, 0.4, 3.1, -H], stairs_outside: [-11.78, 0, 3.1, H], doorway: [-13.1, 0.4, 3.1, -H],
      rue_desk: [-13.8, 0.4, 3.1, -H], bed: [-17.95, 0.92, 3.05, PI], floor_luka: [-16.75, 0.4, 2.75, -H], floor_chase: [-16.75, 0.4, 3.45, -H],
      room_center: [-15.9, 0.4, 3.1, H], window: [-15.9, 0.4, 0.95, PI],
      front_door: [-3.3, -9, -3.1, H], corridor_mid: [-8.0, 0, 3.1, -H], rp_luka: [-16.3, 0.4, 2.35, 0], rp_rue: [-16.3, 0.4, 3.85, PI],
      rp_off: [-16.3, 0.4, 0.85, 0], rp_chase: [-13.3, 0.4, 1.3, -0.6], kettle_spot: [-13.5, 0.4, 5.0, H], bed_side: [-17.0, 0.4, 3.1, -H],
    };
    const tex = () => ({
      carpet: carpetTex(),
      tiles: canvasTex(64, 64, (c) => { for (let i = 0; i < 4; i++) { c.fillStyle = (i + (i >> 1)) % 2 ? '#1e1e22' : '#e8e4da'; c.fillRect((i % 2) * 32, (i >> 1) * 32, 32, 32); } }, { repeat: [1, 1], key: 'rm_tiles' }),
      boards: canvasTex(64, 64, (c) => { const r = rng(6); for (let i = 0; i < 4; i++) { const v = 150 + r() * 30 | 0; c.fillStyle = `rgb(${v},${v - 20},${v - 45})`; c.fillRect(0, i * 16, 64, 15); c.fillStyle = '#4a3420'; c.fillRect(0, i * 16 + 15, 64, 1); c.fillRect((i * 23) % 64, i * 16, 1, 15); } }, { repeat: [1, 1], key: 'rm_boards' }),
      poster: canvasTex(256, 144, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#231c48'); g.addColorStop(0.45, '#c8604a'); g.addColorStop(0.68, '#f4c070'); g.addColorStop(0.7, '#1a1826'); g.addColorStop(1, '#2a2436');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = '#fff4c0'; c.beginPath(); c.arc(196, 84, 11, 0, 7); c.fill();
        c.fillStyle = '#16141f'; const B = 100;
        const r = rng(8); for (let x = 0; x < w; x += 7) { const hh = 8 + r() * 18; c.fillRect(x, B - hh, 7, hh); }
        c.fillRect(40, B - 44, 18, 44); for (let i = 0; i < 4; i++) c.fillRect(36 + i * 7, B - 52, 2, 10); c.fillRect(34, B - 30, 26, 3);     // Lloyd's, pipes and cranes
        c.fillRect(112, B - 30, 32, 30); c.fillRect(118, B - 40, 20, 10); c.beginPath(); c.arc(128, B - 40, 13, PI, 0); c.fill(); c.fillRect(126, B - 60, 4, 8); c.fillRect(124, B - 53, 8, 3);   // St Paul's
        c.fillRect(176, B - 72, 16, 72); c.beginPath(); c.arc(184, B - 72, 8, PI, 0); c.fill();                                                   // NatWest Tower
        c.fillRect(214, B - 38, 10, 38); c.fillRect(90, B - 34, 12, 34); c.fillRect(150, B - 26, 14, 26);
        c.fillStyle = 'rgba(244,192,112,0.35)'; for (let y = B + 6; y < h - 18; y += 5) c.fillRect(170 + (y % 3) * 6, y, 30 - (y - B) / 2, 1.5);
        txt(c, 'THE  CITY', 128, 18, 'bold 20px serif', '#f4d890'); txt(c, 'L  O  N  D  O  N', 128, 130, 'bold 13px serif', '#f4d890');
      }, { key: 'rm_poster' }),
      sign: canvasTex(256, 256, (c) => {
        [['HOUSE 6', '#1a2a3a', '#e8e0c8', 'bold 22px serif'], ['FIRST FLOOR  ·  1', '#e8e4da', '#222', 'bold 18px serif'], ['SECOND FLOOR  ·  2', '#e8e4da', '#222', 'bold 18px serif'],
          ['THIRD FLOOR  ·  3', '#e8e4da', '#222', 'bold 18px serif'], ['QUIET PLEASE — EXAMS', '#f4f0e0', '#222', 'bold 16px sans-serif'], ['FIRE DOOR — KEEP SHUT', '#1a4a8a', '#fff', 'bold 16px sans-serif'],
          ['RUE  ·  Business Studies', '#f4f0e4', '#1a2a5a', 'italic bold 17px serif'], ['NO VISITORS AFTER 11 PM', '#f4f0e0', '#8a1a1a', 'bold 14px sans-serif']]
          .forEach(([t, bg, fg, f], i) => { c.fillStyle = bg; c.fillRect(0, i * 32, 256, 32); txt(c, t, 128, i * 32 + 16, f, fg); });
      }, { key: 'rm_sign' }),
      spines: canvasTex(128, 32, (c) => {
        const r = rng(12), C = ['#1a3a6a', '#7a1a1a', '#2a4a2a', '#c8a040', '#222', '#6a4a2a', '#e8e0c8', '#3a2a5a'];
        for (let x = 0; x < 128; x += 8) { c.fillStyle = C[r() * C.length | 0]; c.fillRect(x, 3 + r() * 4, 7, 32); c.fillStyle = 'rgba(240,220,150,0.8)'; c.fillRect(x + 2, 12, 3, 12); }
      }, { repeat: [1, 1], key: 'rm_spines' }),
      page: canvasTex(64, 64, (c) => {
        c.fillStyle = '#f8f6ee'; c.fillRect(0, 0, 64, 64); txt(c, 'CURRICULUM VITAE', 32, 8, 'bold 6px monospace', '#222'); txt(c, 'RUE', 32, 16, 'bold 7px monospace', '#222');
        c.fillStyle = '#555'; for (let y = 24; y < 62; y += 4) c.fillRect(6, y, 30 + (y * 11) % 22, 1);
      }, { key: 'rm_page' }),
      patch: canvasTex(128, 128, (c) => {
        c.filter = 'blur(3px)'; c.fillStyle = 'rgba(255,190,110,0.9)';
        for (const [x, y] of [[14, 14], [68, 14], [14, 68], [68, 68]]) c.fillRect(x, y, 46, 46);
        c.filter = 'none';
      }, { key: 'rm_patch' }),
      rshadow: canvasTex(64, 128, (c) => {
        const r = rng(3);
        for (let i = 0; i < 26; i++) { let x = r() * 64; const y0 = r() * 128, len = 20 + r() * 60; c.strokeStyle = `rgba(20,14,10,${0.35 + r() * 0.35})`; c.lineWidth = 2 + r() * 2.5; c.beginPath(); c.moveTo(x, y0); for (let y = y0; y < y0 + len; y += 6) { x += (r() - 0.5) * 3; c.lineTo(x, y); } c.stroke(); c.beginPath(); c.arc(x, y0 + len, 2.5, 0, 7); c.fillStyle = c.strokeStyle; c.fill(); }
      }, { repeat: [1, 1], key: 'rm_rshadow' }),
      streak: streakTex('rm_streak'),
    });
    function build() {
      colliders.length = 0; COL = colliders; TINT = null; XF = null; b = new Builder();
      const T = R.T = tex();
      M = {
        vc: mat(0xffffff), carpet: matTex(T.carpet), tiles: matTex(T.tiles), boards: matTex(T.boards), poster: matTex(T.poster), sign: matTex(T.sign),
        spines: matTex(T.spines), page: matTex(T.page), glass: matTex(T.streak, { transparent: true, key: 'rm_glass' }),
        glow: mat(0xfff0d8, { emissive: 0xffe8c8 }),
        sky: mat(0xe8eef2, { emissive: 0xc8d2dc, emissiveIntensity: 0.7, key: 'rm_sky' }),
        street: mat(0xffc070, { emissive: 0xffa040, emissiveIntensity: 1.2, key: 'rm_street' }),
        lamp: mat(0xfff4e0, { emissive: 0xffe0b0, emissiveIntensity: 0.7, key: 'rm_lamp' }),
        lit: mat(0xffe0a0, { emissive: 0xffc870, emissiveIntensity: 0.7 }),
        patch: matTex(T.patch, { transparent: true, opacity: 0.55, emissive: 0xffb060, key: 'rm_patch' }),
        rshadow: matTex(T.rshadow, { transparent: true, opacity: 0.6, key: 'rm_rshadow' }),
      };
      R.skyM = M.sky; R.streetM = M.street; R.lampM = M.lamp;
      // ---- stairwell: hall floor, landings, three flights (treads + soffits + strings), banisters
      bb(-3.8, -9.15, -3.8, 3.8, -9, 3.8, 0xffffff, M.tiles, 0.6);
      for (const [x0, z0, y] of [[2.4, -3.8, -6], [2.4, 2.4, -3], [-3.8, 2.4, 0]]) bb(x0, y - 0.25, z0, x0 + 1.4, y, z0 + 1.4, 0xffffff, M.boards, 0.6);
      const L = Math.hypot(4.8, 3), A = Math.atan2(3, 4.8);
      for (let k = 0; k < 16; k++) {
        const y = (k + 1) * SR;
        bb(-2.4 + ST * k, -9 + y - 0.22, -3.8, -2.1 + ST * k, -9 + y, -2.4, WOOD);
        bb(2.4, -6 + y - 0.22, -2.4 + ST * k, 3.8, -6 + y, -2.1 + ST * k, WOOD);
        bb(2.4 - ST * (k + 1), -3 + y - 0.22, 2.4, 2.4 - ST * k, -3 + y, 3.8, WOOD);
        for (const [x, yy, z] of [[-2.25 + ST * k, -9 + y, -2.47], [2.47, -6 + y, -2.25 + ST * k], [2.25 - ST * k, -3 + y, 2.47]]) rod(x, yy, z, x, yy + 0.9, z, 0.012, 0xe8e4da);
      }
      for (let k = 0; k < 15; k++) { const y = (k + 1) * SR + 0.004; bb(-2.4 + ST * k, -9 + y - 0.01, -3.5, -2.1 + ST * k, -9 + y, -2.7, 0x7a2226); bb(2.7, -6 + y - 0.01, -2.4 + ST * k, 3.5, -6 + y, -2.1 + ST * k, 0x7a2226); bb(2.4 - ST * (k + 1), -3 + y - 0.01, 2.7, 2.4 - ST * k, -3 + y, 3.5, 0x7a2226); }
      rod(-2.4, -8.0, -3.77, 2.4, -5.0, -3.77, 0.02, 0x6a4a30); rod(3.77, -5.0, -2.4, 3.77, -2.0, 2.4, 0.02, 0x6a4a30); rod(2.4, -2.0, 3.77, -2.4, 1.0, 3.77, 0.02, 0x6a4a30);
      boxR(L, 0.1, 1.4, 0xcfc8b8, 0, -7.75, -3.1, 0, 0, A); boxR(1.4, 0.1, L, 0xcfc8b8, 3.1, -4.75, 0, -A); boxR(L, 0.1, 1.4, 0xcfc8b8, 0, -1.75, 3.1, 0, 0, -A);
      boxR(L, 0.32, 0.05, 0x5a3a24, 0, -7.55, -2.42, 0, 0, A); boxR(0.05, 0.32, L, 0x5a3a24, 2.42, -4.55, 0, -A); boxR(L, 0.32, 0.05, 0x5a3a24, 0, -1.55, 2.42, 0, 0, -A);
      rod(-2.4, -8.1, -2.47, 2.4, -5.1, -2.47, 0.03, 0x4a2a18); rod(2.47, -5.1, -2.4, 2.47, -2.1, 2.4, 0.03, 0x4a2a18); rod(2.4, -2.1, 2.47, -2.4, 0.9, 2.47, 0.03, 0x4a2a18);
      rod(-2.4, 0.9, 2.47, -3.8, 0.9, 2.47, 0.03, 0x4a2a18); for (let x = -3.7; x < -2.4; x += 0.15) rod(x, 0, 2.47, x, 0.9, 2.47, 0.012, 0xe8e4da);
      for (const [x, y, z] of [[-2.42, -9, -2.42], [2.42, -6, -2.42], [2.42, -3, 2.42], [-2.42, 0, 2.42]]) { bb(x - 0.06, y, z - 0.06, x + 0.06, y + 1.05, z + 0.06, 0x4a2a18); bb(x - 0.08, y + 1.05, z - 0.08, x + 0.08, y + 1.1, z + 0.08, 0x4a2a18); }
      COL.push([-3.8, -2.4, 2.4, 2.4]);
      // walls (cream, dark skirting per floor), the tall stair window, doors on the landings, lamps, skylight
      const W0 = -9.2, W1 = 3.0;
      wall(-4.1, -4.1, 4.1, -3.8, W0, W1, WALL); wall(3.8, -3.8, 4.1, 3.8, W0, W1, WALL); wall(-4.1, 3.8, 4.1, 4.1, W0, W1, WALL);
      bb(-4.1, W0, -3.8, -3.8, W1, -0.8, WALL); bb(-4.1, W0, 0.8, -3.8, W1, 2.4, WALL); bb(-4.1, W0, -0.8, -3.8, -7.5, 0.8, WALL); bb(-4.1, 1.5, -0.8, -3.8, W1, 0.8, WALL);
      bb(-4.1, W0, 2.4, -3.8, 0, 3.8, WALL); bb(-4.1, 2.4, 2.4, -3.8, W1, 3.8, WALL); COL.push([-4.1, -4.1, -3.8, 2.4]);
      for (const z of [-0.8, 0.8]) bb(-3.85, -7.5, z - 0.05, -3.75, 1.5, z + 0.05, 0xe8e4da);
      for (let y = -7.5; y <= 1.6; y += 1.0) bb(-3.85, y - 0.03, -0.8, -3.75, y + 0.03, 0.8, 0xe8e4da);
      rod(-3.8, -7.5, 0, -3.8, 1.5, 0, 0.02, 0xe8e4da); quad(1.6, 9, M.glass, -3.8, -3.0, 0, H); quad(1.6, 9, M.sky, -3.95, -3.0, 0, H);
      bb(-3.82, -9, -3.5, -3.78, -6.95, -2.7, 0x1a3a2a); quad(0.4, 0.28, M.sky, -3.77, -7.3, -3.1, H); quad(0.6, 0.09, M.sign, -3.77, -6.6, -3.1, H, 0, row(0, 8));
      bb(3.78, -6, -3.5, 3.82, -3.95, -2.7, 0x4a2a18); quad(0.5, 0.09, M.sign, 3.77, -3.6, -3.1, -H, 0, row(1, 8));
      bb(2.7, -3, 3.78, 3.5, -0.95, 3.82, 0x4a2a18); quad(0.5, 0.09, M.sign, 3.1, -0.6, 3.77, PI, 0, row(2, 8));
      quad(0.5, 0.09, M.sign, -3.1, 1.9, 3.79, PI, 0, row(3, 8));
      for (const [x, y, z, ry] of [[-3.1, -9, -3.79, 0], [3.1, -6, -3.79, 0], [3.79, -3, 3.1, -H], [-3.1, 0, 3.79, PI]]) { at(x, y, z, ry); bb(-0.08, 1.9, 0, 0.08, 2.0, 0.08, 0x3a3a3a); ico(0.08, 0xfff0d8, 0, 2.08, 0.1, 1, 1, 1, M.glow); XF = null; }
      for (const y of [-9, -6, -3, 0]) { bb(-3.8, y, -3.8, 3.8, y + 0.12, -3.76, 0x3a2a20); bb(3.76, y, -3.8, 3.8, y + 0.12, 3.8, 0x3a2a20); bb(-3.8, y, 3.76, 3.8, y + 0.12, 3.8, 0x3a2a20); bb(-3.8, y + 2.3, -3.8, 3.8, y + 2.33, -3.77, 0x9a8a70); bb(-3.8, y + 2.3, 3.77, 3.8, y + 2.33, 3.8, 0x9a8a70); bb(3.77, y + 2.3, -3.8, 3.8, y + 2.33, 3.8, 0x9a8a70); }
      bb(-4.1, W1, -4.1, 4.1, W1 + 0.15, 4.1, 0xe8e4da); quad(3.2, 3.2, M.sky, -0.7, W1 - 0.01, 0, 0, H);
      for (let i = -1; i <= 1; i++) { bb(-2.3, W1 - 0.06, i * 1.07 - 0.03, 0.9, W1, i * 1.07 + 0.03, 0x555555); bb(i * 1.07 - 0.73, W1 - 0.06, -1.6, i * 1.07 - 0.67, W1, 1.6, 0x555555); }
      // ---- corridor (top floor): boards + runner, doors both sides, lamps, notices; two steps up to Rue's door
      bb(-12.3, -0.25, 2.4, -3.8, 0, 3.8, 0xffffff, M.boards, 0.6); bb(-11.4, 0, 2.7, -3.8, 0.008, 3.5, 0x7a2a2a, M.carpet, 0.5);
      wall(-12.3, 2.1, -3.8, 2.4, 0, 2.7, ROOM); wall(-12.3, 3.8, -3.8, 4.1, 0, 2.7, ROOM); bb(-12.3, 2.7, 2.1, -3.8, 2.85, 4.1, 0xeeeee8);
      for (const z of [2.4, 3.8]) { const s = z < 3 ? 1 : -1, zz = z + s * 0.001;
        bb(-12.3, 0, zz, -3.8, 0.14, zz + s * 0.03, 0xe8e8e4); bb(-12.3, 2.25, zz, -3.8, 2.28, zz + s * 0.025, 0xe8e8e4);
        for (const x of [-6.2, -9.2]) { bb(x - 0.48, 0, zz, x + 0.48, 2.12, zz + s * 0.04, 0xe8e8e4); bb(x - 0.42, 0, zz, x + 0.42, 2.06, zz + s * 0.05, 0x4a3222); bb(x + 0.3, 1.0, zz, x + 0.34, 1.04, zz + s * 0.09, 0xc8a850); }
        at(-7.7, 0, zz, s > 0 ? 0 : PI); bb(-0.06, 1.8, 0, 0.06, 1.95, 0.06, 0x3a3a3a); ico(0.07, 0xfff0d8, 0, 1.98, 0.09, 1, 1, 1, M.glow); XF = null;
        quad(0.5, 0.09, M.sign, -10.8, 1.55, zz + s * 0.004, s > 0 ? 0 : PI, 0, row(s > 0 ? 4 : 5, 8)); quad(0.36, 0.46, M.vc, -10.8, 1.25, zz + s * 0.003, s > 0 ? 0 : PI, 0, null, 0xf4f0e4);
      }
      for (const [i, x] of [[31, -6.2], [32, -9.2]]) { quad(0.14, 0.06, M.sign, x, 1.75, 2.448, 0, 0, [0, 0.5, 0.25, 0.53]); quad(0.14, 0.06, M.sign, x, 1.75, 3.752, PI, 0, [0, 0.5, 0.25, 0.53]); }
      for (const x of [-5.2, -8.2, -11.0]) { rod(x, 2.7, 3.1, x, 2.45, 3.1, 0.008, 0x333333); ico(0.11, 0xfff0d8, x, 2.38, 3.1, 1, 0.8, 1, M.glow); }
      bb(-11.7, 0, 2.4, -11.4, 0.2, 3.8, WOOD); bb(-11.72, 0.195, 2.4, -11.68, 0.205, 3.8, 0x9a7a52); bb(-12.3, 0, 2.4, -11.7, 0.4, 3.8, WOOD); bb(-11.72, 0.395, 2.4, -11.66, 0.405, 3.8, 0x9a7a52);
      quad(0.6, 0.09, M.sign, -11.0, 2.45, 2.402, 0, 0, row(7, 8));
      // ---- Rue's room: floor, walls (door in the east wall, window south), ceiling
      bb(-18.5, 0.15, 0.35, -12.6, 0.4, 5.85, 0x8a96a4, M.carpet, 0.5);
      const RW = 3.25;
      wall(-18.8, 0.05, -16.5, 0.35, 0, RW, ROOM); wall(-15.3, 0.05, -12.3, 0.35, 0, RW, ROOM); wall(-16.5, 0.05, -15.3, 0.35, 0, 1.6, ROOM); bb(-16.5, 3.0, 0.05, -15.3, RW, 0.35, ROOM);
      wall(-18.8, 5.85, -12.3, 6.15, 0, RW, ROOM); wall(-18.8, 0.35, -18.5, 5.85, 0, RW, ROOM);
      wall(-12.6, 0.35, -12.3, 2.65, 0, RW, ROOM); wall(-12.6, 3.55, -12.3, 5.85, 0, RW, ROOM); bb(-12.6, 2.45, 2.65, -12.3, RW, 3.55, ROOM); COL.push([-12.6, 2.65, -12.3, 3.55]);
      bb(-12.6, 2.45, 2.1, -12.3, RW, 2.65, ROOM); bb(-12.6, 2.45, 3.55, -12.3, RW, 4.1, ROOM);
      for (const z of [2.6, 3.55]) bb(-12.64, 0.4, z, -12.26, 2.5, z + 0.05, 0xe8e8e4); bb(-12.64, 2.45, 2.6, -12.26, 2.52, 3.6, 0xe8e8e4);
      bb(-18.8, 3.1, 0.05, -12.3, RW, 6.15, 0xf0f0ec);
      for (const [x0, z0, x1, z1] of [[-18.5, 0.35, -12.6, 0.38], [-18.5, 5.82, -12.6, 5.85], [-18.5, 0.35, -18.47, 5.85], [-12.63, 0.35, -12.6, 2.6], [-12.63, 3.6, -12.6, 5.85]]) bb(x0, 0.4, z0, x1, 0.52, z1, 0xe8e8e4);
      for (const [x0, z0, x1, z1] of [[-18.5, 0.35, -16.56, 0.38], [-15.24, 0.35, -12.6, 0.38], [-18.5, 5.82, -12.6, 5.85], [-18.5, 0.35, -18.47, 5.85], [-12.63, 0.35, -12.6, 2.6], [-12.63, 3.6, -12.6, 5.85]]) bb(x0, 2.62, z0, x1, 2.65, z1, 0xe8e8e4);
      // bed along the far wall (altar), bedside tables + lamps, the London poster centred above
      bb(-18.45, 0.4, 2.1, -17.45, 0.72, 4.1, 0x4a3222); bb(-18.42, 0.72, 2.12, -17.48, 0.86, 4.08, 0xf0f0ec);
      bb(-18.43, 0.86, 2.11, -17.46, 0.92, 3.52, 0x1e2a4a); bb(-17.48, 0.6, 2.11, -17.45, 0.92, 3.52, 0x1e2a4a); bb(-18.43, 0.86, 3.5, -17.46, 0.93, 3.62, 0xf4f4f0);
      bb(-18.35, 0.86, 3.66, -17.55, 0.98, 4.02, 0xf4f4f0); bb(-18.45, 0.4, 4.08, -17.45, 1.15, 4.14, 0x4a3222); bb(-18.45, 0.4, 2.06, -17.45, 0.95, 2.12, 0x4a3222);
      COL.push([-18.5, 2.05, -17.4, 4.15]);
      for (const z of [1.75, 4.45]) { bb(-18.45, 0.4, z - 0.25, -17.95, 0.95, z + 0.25, 0x4a3222); bb(-17.96, 0.6, z - 0.2, -17.95, 0.64, z + 0.2, 0x2a1a10); cyl(0.06, 0.07, 0.03, 8, 0x333333, -18.2, 0.965, z); rod(-18.2, 0.97, z, -18.2, 1.22, z, 0.01, 0x333333); cyl(0.07, 0.11, 0.14, 8, 0xe8e0cc, -18.2, 1.26, z); COL.push([-18.5, z - 0.25, -17.9, z + 0.25]); }
      bb(-18.5, 1.68, 2.3, -18.46, 2.62, 3.9, 0x111111); quad(1.5, 0.84, M.poster, -18.455, 2.15, 3.1, H);
      // window (south) + radiator + blind; wardrobe (north) mirrors it
      for (const x of [-16.5, -15.3]) bb(x - 0.05, 1.6, 0.18, x + 0.05, 3.0, 0.36, 0xe8e8e4);
      bb(-16.5, 1.55, 0.18, -15.3, 1.62, 0.5, 0xe8e8e4); bb(-16.5, 2.95, 0.18, -15.3, 3.02, 0.36, 0xe8e8e4); bb(-16.5, 2.28, 0.22, -15.3, 2.33, 0.3, 0xe8e8e4); bb(-15.92, 1.6, 0.22, -15.88, 3.0, 0.3, 0xe8e8e4);
      for (const y of [1.95, 2.65]) bb(-16.5, y - 0.012, 0.24, -15.3, y + 0.012, 0.28, 0xe8e8e4);
      quad(1.2, 1.4, M.glass, -15.9, 2.3, 0.2); cyl(0.04, 0.04, 1.24, 8, 0xe8e4d8, -15.9, 2.95, 0.42, 0, H);
      for (let x = -16.35; x <= -15.45; x += 0.075) bb(x, 0.55, 0.38, x + 0.05, 1.3, 0.48, 0xe0e0dc); bb(-16.4, 0.5, 0.38, -15.4, 0.55, 0.48, 0xe0e0dc); COL.push([-16.45, 0.35, -15.35, 0.5]);
      bb(-16.5, 0.4, 5.25, -15.3, 2.45, 5.85, 0x5a3c26); bb(-15.91, 0.5, 5.24, -15.89, 2.35, 5.25, 0x2a1a10); bb(-16.55, 2.45, 5.2, -15.25, 2.52, 5.85, 0x4a3222);
      for (const x of [-16.0, -15.8]) cyl(0.02, 0.02, 0.04, 6, 0xc8a850, x, 1.4, 5.23, H); COL.push([-16.5, 5.2, -15.3, 5.85]);
      // desk (facing the poster), typewriter, dictaphone, Filofax, paper, pen, lamp
      bb(-14.82, 1.12, 2.43, -14.08, 1.16, 3.77, 0x5a3c26);
      for (const [z0, z1] of [[2.45, 2.85], [3.35, 3.75]]) { bb(-14.8, 0.4, z0, -14.1, 1.12, z1, 0x5a3c26); for (let i = 0; i < 3; i++) { bb(-14.1, 0.5 + i * 0.2, z0 + 0.03, -14.09, 0.66 + i * 0.2, z1 - 0.03, 0x4a3020); bb(-14.09, 0.57 + i * 0.2, (z0 + z1) / 2 - 0.05, -14.07, 0.59 + i * 0.2, (z0 + z1) / 2 + 0.05, 0xc8a850); } }
      bb(-14.8, 0.6, 2.85, -14.76, 1.12, 3.35, 0x4a3020); COL.push([-14.85, 2.4, -14.05, 3.8]);
      at(-14.55, 1.16, 3.1, H);
      bb(-0.2, 0, -0.16, 0.2, 0.08, 0.12, 0x2a3a4a); for (let i = 0; i < 4; i++) bb(-0.17, 0.08 - i * 0.012, 0.02 + i * 0.035, 0.17, 0.095 - i * 0.012, 0.05 + i * 0.035, 0x1a1a1a);
      bb(-0.21, 0.08, -0.16, 0.21, 0.13, -0.05, 0x2a3a4a); cyl(0.025, 0.025, 0.48, 8, 0x111111, 0, 0.14, -0.1, 0, H); rod(-0.24, 0.15, -0.1, -0.3, 0.17, -0.02, 0.006, 0xc0c0c0);
      quad(0.21, 0.22, M.page, 0, 0.25, -0.12, 0, -0.25);
      XF = null;
      bb(-14.56, 1.16, 2.66, -14.44, 1.182, 2.78, 0x2a2a2e); bb(-14.51, 1.182, 2.74, -14.48, 1.186, 2.76, 0xc02020); bb(-14.55, 1.182, 2.68, -14.45, 1.184, 2.71, 0x8a8a8a);
      bb(-14.47, 1.16, 3.5, -14.23, 1.205, 3.74, 0x5a3218); bb(-14.25, 1.18, 3.5, -14.21, 1.19, 3.74, 0x3a2010);
      for (let i = 0; i < 6; i++) bb(-14.79, 1.16 + i * 0.004, 3.36, -14.59, 1.164 + i * 0.004, 3.64, 0xf8f6ee);
      rod(-14.22, 1.168, 3.28, -14.22, 1.168, 3.46, 0.005, 0x1a2a5a);
      cyl(0.07, 0.08, 0.03, 8, 0x222222, -14.7, 1.175, 2.52); rod(-14.7, 1.19, 2.52, -14.62, 1.5, 2.6, 0.01, 0x222222); rod(-14.62, 1.5, 2.6, -14.45, 1.45, 2.72, 0.01, 0x222222); cyl(0.03, 0.08, 0.1, 8, 0x222222, -14.43, 1.4, 2.73);
      // bookshelf (south of the door) + chest with the kettle (north of the door)
      bb(-12.95, 0.4, 0.5, -12.62, 2.2, 1.7, 0x5a3c26); for (const y of [0.6, 1.05, 1.5, 1.95]) { bb(-12.95, y - 0.02, 0.52, -12.63, y, 1.68, 0x4a3020); quad(1.1, 0.3, M.spines, -12.9, y + 0.15, 1.1, -H); }
      COL.push([-13.0, 0.35, -12.6, 1.75]);
      bb(-13.05, 0.4, 4.4, -12.62, 1.25, 5.7, 0x5a3c26); for (let i = 0; i < 3; i++) { bb(-13.06, 0.5 + i * 0.25, 4.45, -13.05, 0.7 + i * 0.25, 5.65, 0x4a3020); bb(-13.08, 0.58 + i * 0.25, 5.0, -13.06, 0.61 + i * 0.25, 5.1, 0xc8a850); }
      COL.push([-13.1, 4.35, -12.6, 5.75]);
      cyl(0.09, 0.11, 0.22, 10, 0xd8dce0, -12.85, 1.36, 5.0); cyl(0.05, 0.09, 0.04, 10, 0xd8dce0, -12.85, 1.49, 5.0); bb(-12.87, 1.27, 5.1, -12.83, 1.45, 5.14, 0x1a1a1a); boxR(0.03, 0.03, 0.1, 0xd8dce0, -12.85, 1.42, 4.88, -0.7);
      cyl(0.06, 0.06, 0.14, 8, 0x1a3a2a, -12.85, 1.32, 5.35); cyl(0.05, 0.045, 0.06, 8, 0xf4f4f0, -12.85, 1.28, 4.65);
      // ceiling rose; outside: street lamp, the terrace opposite
      cyl(0.12, 0.12, 0.03, 10, 0xf4f4f0, -15.6, 3.085, 3.1); rod(-15.6, 3.08, 3.1, -15.6, 2.75, 3.1, 0.006, 0x333333);
      cyl(0.08, 0.08, 12.4, 8, 0x1e2a24, -14.4, -2.8, -2.6); rod(-14.4, 3.3, -2.6, -14.9, 3.5, -2.2, 0.03, 0x1e2a24);
      bb(-24, -9, -9.6, -8, 6, -9.3, 0x5a5048); for (let x = -23; x < -8.5; x += 2.2) for (let y = -7; y < 5; y += 3) { bb(x, y, -9.31, x + 1.1, y + 1.8, -9.29, 0x151a20); if (rng(x * 3 + y | 0)() < 0.3) quad(1.0, 1.6, M.lit, x + 0.55, y + 0.9, -9.28); }
      const g = b.done();
      // ---- props
      R.lampShade = part('room_lamp', () => ico(0.2, 0xfff4e0, 0, 0, 0, 1, 1.2, 1, M.lamp), [-15.6, 2.62, 3.1], 0, { floor: false });
      R.lampShade.userData.on = (v) => { R.lampOn = v; };
      R.streetHead = part('street_lamp', () => { cyl(0.18, 0.1, 0.4, 6, 0xffc070, 0, 0, 0, 0, 0, M.street); cyl(0.05, 0.22, 0.12, 6, 0x1e2a24, 0, 0.26, 0); }, [-14.95, 3.25, -2.15], 0, { floor: false });
      R.door = doorLeaf('door', 0.9, 2.04, 0x5e4028, [-12.45, 0.4, 2.65], -H, -H - 1.4, () => {
        bb(0.26, 1.5, -0.036, 0.64, 1.6, -0.025, 0xc8a850); quad(0.34, 0.07, M.sign, 0.45, 1.55, -0.038, PI, 0, row(6, 8));
        bb(0.1, 1.15, -0.03, 0.8, 1.9, -0.027, 0x4a3020); bb(0.1, 1.15, 0.027, 0.8, 1.9, 0.03, 0x4a3020);
      });
      R.chair = part('desk_chair', () => swivel(0x2a2a3a), [-13.8, 0.4, 3.1], -H);
      R.mug = part('mug', () => mug(0, 0, 0, 0x8a9aa8, 0.4), [-14.28, 1.16, 2.52], 0, { floor: false });
      R.mugs3 = part('mugs3', () => {
        mug(0.02, 0, 0.02, 0xc03030, 1.2); mug(0.06, 0, 0.24, 0xe8c040, 0.2, 0x8a5a32); mug(-0.14, 0, -0.14, 0xf4f4f0, 2.4);
        cyl(0.046, 0.046, 0.02, 8, 0xc03030, -0.14, 0.05, -0.14); rod(0.06, 0.1, 0.24, 0.1, 0.02, 0.3, 0.003, 0xf4f4f0); bb(0.08, 0, 0.29, 0.12, 0.004, 0.33, 0xc8b89a);
        cyl(0.12, 0.13, 0.004, 10, 0x7a4a26, -0.05, 0.002, 0.08);
      }, [-14.3, 1.16, 2.5], 0, { floor: false });
      R.coats = part('coats', () => {
        for (const [z, c] of [[2.75, 0x26304a], [3.45, 0xa07850]]) {
          at(-16.85, 0.4, z, H);
          bb(-0.3, 0, -0.55, 0.3, 0.05, 0.55, c); bb(-0.2, 0.03, 0.45, 0.2, 0.08, 0.6, c);
          for (const s of [-1, 1]) boxR(0.12, 0.05, 0.55, c, s * 0.36, 0.03, 0.2, 0, s * 0.35);
          for (let i = 0; i < 3; i++) bb(-0.02, 0.05, -0.1 + i * 0.2, 0.02, 0.06, -0.06 + i * 0.2, 0x2a1a10);
          XF = null;
        }
      });
      R.mess = part('mess', () => {
        boxR(0.6, 0.18, 0.5, 0x1e2a4a, -17.9, 1.0, 2.7, 0.2, 0.6, 0.1); boxR(0.5, 0.06, 0.3, 0x2f5a3a, -17.7, 0.95, 2.35, 0, 1.1);
        for (const [x, z, ry] of [[-15.2, 1.4, 0.5], [-15.6, 4.6, 2.1], [-14.3, 1.9, 1.2], [-17.2, 4.8, 0.3], [-13.9, 4.2, 2.6]]) boxR(0.21, 0.005, 0.29, 0xf4f2ea, x, 0.405, z, 0, ry);
        for (const [x, z, c] of [[-15.35, 2.2, 0x111111], [-15.3, 2.45, 0x111111], [-15.35, 3.9, 0xf4f4f4], [-15.3, 4.15, 0xf4f4f4]]) { bb(x - 0.14, 0.4, z - 0.05, x + 0.14, 0.48, z + 0.05, c); bb(x - 0.14, 0.4, z - 0.052, x + 0.14, 0.43, z + 0.052, 0xf4f4f4); }
        plate(-14.9, 0.4, 1.4); for (let i = 0; i < 3; i++) boxR(0.09, 0.012, 0.02, 0xa06a3a, -14.9 + (i - 1) * 0.04, 0.42, 1.4, 0, i);
        cyl(0.03, 0.03, 0.1, 8, 0x3a8a3a, -16.9, 0.43, 1.2, H, 0.3); boxR(0.3, 0.02, 0.2, 0x7a1a2a, -14.6, 0.41, 4.8, 0, 0.8);
        boxR(0.5, 0.03, 0.2, 0xd8d8d0, -15.9, 1.32, 0.45, 0, 0, 0.1); boxR(0.3, 0.03, 0.4, 0x7a2a30, -13.8, 0.95, 3.1, 0, 0.2);
      });
      R.patch = part('streetlight', () => {
        quad(2.4, 3.0, M.patch, -16.5, 0.415, 2.9, 0.35, -H); quad(2.4, 3.0, M.rshadow, -16.5, 0.42, 2.9, 0.35, -H);
        quad(0.95, 1.5, M.patch, -17.95, 0.935, 2.85, 0.3, -H); quad(0.95, 1.5, M.rshadow, -17.95, 0.94, 2.85, 0.3, -H);
        quad(1.4, 1.2, M.patch, -18.46, 1.4, 2.6, H); quad(1.4, 1.2, M.rshadow, -18.455, 1.4, 2.6, H);
      }, null, 0, { floor: false });
      const rain = makeRain({ box: [-18.5, -4.8, -13.2, -0.4], top: 5, bottom: -9, count: 900 });
      g.add(R.lampShade, R.streetHead, R.door, R.chair, R.mug, R.mugs3, R.coats, R.mess, R.patch, rain);
      R.root = g; R.lampOn = null; R.scene = null; dress(sceneNow());
      return g;
    }
    function dress(id) {
      R.scene = id;
      const o = ord(id);
      R.coats.visible = o >= ord('2.9'); R.coats.position.set(0, 0, 0);
      R.mess.visible = R.mugs3.visible = o > ord('2.13');
      R.door.userData.open = undefined; R.door.rotation.y = R.door.userData.closedY;
      R.chair.position.set(-13.8, 0.4, 3.1); R.chair.rotation.y = -H;
      R.patch.visible = false; R.lampOn = null;
    }
    function update(dt, ctx) {
      if (!R.root) return;
      if (sceneNow() !== R.scene) dress(sceneNow());
      const night = ctx.env === 'night';
      R.patch.visible = night;
      R.streetM.emissiveIntensity = night ? 1.3 : 0.2; R.skyM.emissiveIntensity = night ? 0.06 : 0.7;
      R.lampM.emissiveIntensity = (R.lampOn ?? !night) ? 0.8 : 0;
      R.T.rshadow.offset.y = ctx.t * 0.06; R.T.streak.offset.y = ctx.t * 0.1;
      R.mug.visible = !R.mugs3.visible;
      swing(R.door, dt);
    }
    return {
      env: {
        day: { bg: 0x98a2aa, fog: [0x8c959e, 0.02], hemi: [0xe6ecf2, 0x6a7078, 1.0], dir: [0xdde4ec, 0.65, [5, 9, -4]], rain: 1 },
        night: { bg: 0x07090d, fog: [0x0a0d14, 0.03], hemi: [0x3e4c72, 0x121218, 0.85], dir: [0xffa860, 0.45, [2, 6, -8]], rain: 1 },   // (integrator: brighter so faces read)
      },
      build, marks, update, colliders,
      anchors: {
        poster: { at: [-18.46, 2.15, 3.1], from: [-16.2, 1.9, 3.1], fov: 38 },
        typewriter: { at: [-14.55, 1.28, 3.1], from: [-14.0, 1.62, 2.6], fov: 35 },
        dictaphone: { at: [-14.5, 1.18, 2.72], from: [-14.15, 1.5, 2.9], fov: 28 },
        filofax: { at: [-14.35, 1.19, 3.62], from: [-14.05, 1.6, 3.85], fov: 32 },
        mug: { at: [-14.28, 1.22, 2.52], from: [-13.92, 1.44, 2.3], fov: 30 },
        mugs3: { at: [-14.3, 1.22, 2.55], from: [-13.85, 1.5, 2.2], fov: 35 },
        kettle: { at: [-12.85, 1.38, 5.0], from: [-13.75, 1.7, 4.35], fov: 35 },
        window: { at: [-15.9, 2.3, 0.3], from: [-15.9, 1.75, 2.7], fov: 45 },
        door: { at: [-12.45, 1.45, 3.1], from: [-9.6, 1.55, 3.1], fov: 35 },
        bed_dark: { at: [-17.95, 1.05, 3.85], from: [-17.3, 1.18, 3.45], fov: 30 },
        // extras
        corridor: { at: [-12.0, 0.9, 3.1], from: [-3.4, 1.45, 3.1], fov: 38 },
        doorway_wide: { at: [-17.2, 1.3, 3.1], from: [-12.75, 2.2, 3.1], fov: 62 },
        floor_wide: { at: [-17.3, 0.45, 3.1], from: [-14.95, 0.78, 3.1], fov: 50 },
        bed_view: { at: [-16.5, 0.45, 3.1], from: [-17.85, 1.95, 3.1], fov: 55 },
        roleplay: { at: [-16.3, 1.3, 3.1], from: [-14.35, 1.5, 3.1], fov: 45 },
        rue_back: { at: [-13.8, 1.7, 3.1], from: [-12.95, 1.8, 3.1], fov: 35 },
        stairwell_up: { at: [0.5, 1.0, 0.5], from: [-0.4, -8.4, -0.3], fov: 60 },
      },
      cams: {
        stair_a: { type: 'rail', from: [-2.0, -7.3, 0.9], to: [2.0, -4.3, 0.9], look: 'player', fov: 55 },
        stair_b: { type: 'rail', from: [-0.9, -4.3, -2.0], to: [-0.9, -1.3, 2.0], look: 'player', fov: 55 },
        stair_c: { type: 'rail', from: [2.0, -1.3, -0.9], to: [-2.0, 1.7, -0.9], look: 'player', fov: 55 },
        corridor: { type: 'fixed', pos: [-2.9, 1.85, 3.1], look: [-12.2, 1.0, 3.1], fov: 42 },
        room: { type: 'pan', pos: [-13.05, 2.85, 5.5], look: 'player', base: [-16.6, 0.9, 2.4], limit: 0.35, fov: 60 },
      },
      zones: [
        { box: [-3.8, -3.8, 2.4, -2.4], cam: 'stair_a' },
        { box: [2.4, -3.8, 3.8, 2.4], cam: 'stair_b' },
        { box: [-3.8, 2.4, 3.8, 3.8], cam: 'stair_c' },
        { box: [-12.3, 2.4, -3.8, 3.8], cam: 'corridor' },
        { box: [-18.5, 0.35, -12.6, 5.85], cam: 'room' },
      ],
      floor(x, z) {
        if (x < -12.6) return 0.4;
        if (x < -3.8) return x < -11.7 ? 0.4 : x < -11.4 ? 0.2 : 0;
        if (z < -2.4) return x < -2.4 ? -9 : x > 2.4 ? -6 : -9 + st(x + 2.4);
        if (z > 2.4) return x > 2.4 ? -3 : x < -2.4 ? 0 : -3 + st(2.4 - x);
        if (x > 2.4) return -6 + st(z + 2.4);
        return x < -2.4 ? 0 : -9;
      },
      props: ['door', 'desk_chair', 'coats', 'mess', 'mugs3', 'mug', 'streetlight', 'room_lamp', 'street_lamp'],
      ambience: { loops: [], room: 'room' },
    };
  })();
})();
