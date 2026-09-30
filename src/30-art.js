// ============================================================ ART
// Canvas textures, the material library, static geometry (Builder), instancing, blob
// shadows, GPU rain, and the character rig (buildCharacter + LOOKS + ANIMS).
// Look: clean faceted low-poly. Everything is MeshLambertMaterial, flatShading, vertexColors
// (one program family); light is baked into vertex colours so sets read under hemi+dir.

// ------------------------------------------------------------ textures & materials
// canvasTex(w, h, paint(ctx,w,h), {repeat:[x,y], key}) -> sRGB CanvasTexture, smooth + mipmapped.
const canvasTex = (() => {
  const cache = new Map();
  return (w, h, paint, o = {}) => {
    if (o.key && cache.has(o.key)) return cache.get(o.key);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    paint(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    if (o.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.repeat[0], o.repeat[1]); }
    if (o.key) cache.set(o.key, t);
    return t;
  };
})();

// mat(color, {emissive, emissiveIntensity, transparent, opacity, side, map, depthWrite, key}) -> cached
// MeshLambertMaterial. Shared: never animate a cached one unless you passed a unique `key`.
// With both `map` and `emissive`, the map is also the emissive map (self-lit screens: matTex(t, {emissive: 0xffffff})).
// Geometry without a colour attribute renders as if its vertex colour were white.
const mat = (() => {
  const cache = new Map();
  return (color = 0xffffff, o = {}) => {
    const c = new THREE.Color(color);
    const key = [c.getHexString(), o.emissive, o.emissiveIntensity, !!o.transparent, o.opacity ?? 1, o.side ?? 0,
      o.map ? o.map.uuid : '', o.depthWrite, o.key].join('|');
    let m = cache.get(key);
    if (m) return m;
    m = new THREE.MeshLambertMaterial({ color: c, flatShading: true, vertexColors: true, map: o.map || null,
      transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide });
    if (o.transparent) { m.depthWrite = o.depthWrite ?? false; m.forceSinglePass = true; }   // double-sided glass in one pass (two passes re-pick the program every frame)
    if (o.emissive != null) { m.emissive.set(o.emissive); m.emissiveIntensity = o.emissiveIntensity ?? 1; if (o.map) m.emissiveMap = o.map; }
    m.defaultAttributeValues = { color: [1, 1, 1] };
    cache.set(key, m);
    return m;
  };
})();
const matTex = (tex, o = {}) => mat(o.color ?? 0xffffff, { ...o, map: tex });

// bakeLight(geometry, {dir, ambient, floor=true, y0}) writes (or multiplies into) a colour attribute:
// lambert from a fixed key direction, darker undersides, and (floor) an AO gradient that darkens
// walls/props toward the floor height y0 (default 0; instanced() uses the geometry's lowest point).
function bakeLight(g, o = {}) {
  const d = new THREE.Vector3(...(o.dir || [0.45, 0.8, 0.35])).normalize();
  const amb = o.ambient ?? 0.72, floor = o.floor !== false;
  const y0 = o.y0 ?? 0;
  if (!g.attributes.normal) g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal, old = g.attributes.color;
  const col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    let c = amb + (1 - amb) * Math.max(0, nx * d.x + ny * d.y + nz * d.z);
    if (ny < -0.5) c *= 0.82;
    if (floor && ny < 0.7) { const y = Math.min(1, Math.max(0, (p.getY(i) - y0) / 1.4)); c *= 0.7 + 0.3 * y * y * (3 - 2 * y); }
    for (let k = 0; k < 3; k++) col[i * 3 + k] = c * (old ? old.getComponent(i, k) : 1);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return g;
}

// ------------------------------------------------------------ Builder
// Static set geometry, merged per material. Positions are CENTRES (like a Mesh at that position).
//   b.box(w,h,d, m, [x,y,z], rotY)   b.cyl(rTop,rBot,h,seg, m, [x,y,z], rotY)
//   b.plane(w,h, m, [x,y,z], [rx,ry,rz])  (faces +Z before rotation)   b.geo(geometry, m, Matrix4|[x,y,z])
//   b.done({dir, ambient, floor}) -> Group with one baked mesh per material. Builders are single-use.
class Builder {
  constructor() { this.list = new Map(); }
  add(g, m) { let a = this.list.get(m); if (!a) this.list.set(m, a = []); a.push(g); return this; }
  box(w, h, d, m, p = [0, 0, 0], rotY = 0) {
    const g = new THREE.BoxGeometry(w, h, d); if (rotY) g.rotateY(rotY);
    return this.add(g.translate(p[0], p[1], p[2]), m);
  }
  cyl(rt, rb, h, seg = 8, m, p = [0, 0, 0], rotY = 0) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg); if (rotY) g.rotateY(rotY);
    return this.add(g.translate(p[0], p[1], p[2]), m);
  }
  plane(w, h, m, p = [0, 0, 0], r) {
    const g = new THREE.PlaneGeometry(w, h);
    if (r) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(r[0], r[1], r[2])));
    return this.add(g.translate(p[0], p[1], p[2]), m);
  }
  geo(geometry, m, at = [0, 0, 0]) {
    const g = geometry.clone();
    if (at.isMatrix4) g.applyMatrix4(at); else g.translate(at[0], at[1], at[2]);
    return this.add(g, m);
  }
  done(o = {}) {
    const group = new THREE.Group();
    for (const [m, gs] of this.list) {
      const anyCol = gs.some((g) => g.attributes.color);
      const parts = gs.map((g0) => {
        const g = g0.index ? g0.toNonIndexed() : g0;
        if (!g.attributes.normal) g.computeVertexNormals();
        if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        if (anyCol && !g.attributes.color) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3).fill(1), 3));
        for (const k of Object.keys(g.attributes)) if (!/^(position|normal|uv|color)$/.test(k)) g.deleteAttribute(k);
        g.morphAttributes = {};
        return g;
      });
      const merged = mergeGeometries(parts);
      for (const g of gs) g.dispose();
      for (const g of parts) g.dispose();
      bakeLight(merged, o);
      group.add(new THREE.Mesh(merged, m));
    }
    this.list.clear();
    return group;
  }
}

// instanced(geometry, material, [[x,y,z,rotY,scale|[sx,sy,sz]], ...]) -> InstancedMesh.
// Bakes light into the geometry once if it has no colour attribute (local y = height).
function instanced(g, m, list) {
  if (!g.attributes.color) { g.computeBoundingBox(); bakeLight(g, { y0: g.boundingBox.min.y }); }
  const im = new THREE.InstancedMesh(g, m, list.length);
  const q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), mx = new THREE.Matrix4(), up = new THREE.Vector3(0, 1, 0);
  list.forEach((t, i) => {
    const sc = t[4] ?? 1;
    if (Array.isArray(sc)) s.set(sc[0], sc[1], sc[2]); else s.set(sc, sc, sc);
    im.setMatrixAt(i, mx.compose(p.set(t[0], t[1], t[2]), q.setFromAxisAngle(up, t[3] || 0), s));
  });
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  return im;
}

// blobShadow() -> small flat Mesh (shared geometry + one shared transparent material). Parent it under an actor.
const blobShadow = (() => {
  let geo, material;
  return () => {
    if (!geo) {
      geo = new THREE.PlaneGeometry(0.8, 0.8).rotateX(-Math.PI / 2);
      const tex = canvasTex(128, 128, (c, w, h) => {
        const gr = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.5, 'rgba(0,0,0,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = gr; c.fillRect(0, 0, w, h);
      }, { key: 'blob' });
      material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    }
    const m = new THREE.Mesh(geo, material);
    m.position.y = 0.01; m.renderOrder = 1; m.name = 'blob';
    return m;
  };
})();

// makeRain({box:[minX,minZ,maxX,maxZ], top=10, count=2500, bottom=0}) -> Points. Drops fall in the vertex
// shader: set rain.uniforms.uTime.value (seconds) and rain.uniforms.uAmount.value (0..1) — also on material.uniforms.
function makeRain({ box = [-10, -10, 10, 10], top = 10, count = 2500, bottom = 0 } = {}) {
  const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box[0] + Math.random() * (box[2] - box[0]);
    pos[i * 3 + 1] = bottom + Math.random() * (top - bottom);
    pos[i * 3 + 2] = box[1] + Math.random() * (box[3] - box[1]);
    rnd[i * 2] = Math.random(); rnd[i * 2 + 1] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 2));
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uAmount: { value: 1 }, uTop: { value: top }, uBottom: { value: bottom },
      uColor: { value: new THREE.Color(0xd4dde6) },
    }]),
    vertexShader: `
      uniform float uTime, uAmount, uTop, uBottom;
      attribute vec2 aRnd;
      varying float vA; varying float vSize;
      #include <fog_pars_vertex>
      void main() {
        float h = uTop - uBottom;
        float y = uTop - mod(uTime * (7.5 + aRnd.y * 3.5) + aRnd.x * h, h);
        vec4 mvPosition = modelViewMatrix * vec4(position.x + (uTop - y) * 0.05, y, position.z, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vA = step(aRnd.y, uAmount) * (0.6 + 0.4 * aRnd.x);
        vSize = clamp(90.0 / max(-mvPosition.z, 0.1), 2.0, 90.0) * vA;
        gl_PointSize = vSize;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      varying float vA; varying float vSize;
      #include <fog_pars_fragment>
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float w = max(0.035, 0.9 / vSize);
        float a = (1.0 - smoothstep(w * 0.5, w, abs(c.x - c.y * 0.08))) * (1.0 - smoothstep(0.25, 0.5, abs(c.y)));
        if (a * vA < 0.02) discard;
        gl_FragColor = vec4(uColor, a * 0.5 * vA);
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
    transparent: true, depthWrite: false, fog: true,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false; pts.name = 'rain';
  pts.uniforms = m.uniforms;
  return pts;
}

// ------------------------------------------------------------ characters
// One shared rig: a rigid-skinned SkinnedMesh (1 draw call) + a textured head mesh carrying the painted
// face + small attachment meshes. Actor faces +Z; character's left is +X. Bone rest pose = standing,
// arms down. Limb bones point down -Y: negative x rotation swings a limb forward.
const buildCharacter = (() => {
  const TAU = Math.PI * 2;
  const PART = ['hips', 'torso', 'neck', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR', 'legL', 'shinL', 'footL', 'legR', 'shinR', 'footR'];
  const [HIPS, TORSO, NECK, HEAD, ARML, FOREL, HANDL, ARMR, FORER, HANDR, LEGL, SHINL, FOOTL, LEGR, SHINR, FOOTR] = PART.map((_, i) => i);
  const cols = new Map();
  const lin = (c) => cols.get(c) || (cols.set(c, new THREE.Color(c)), cols.get(c));
  const shade = (c, k) => '#' + new THREE.Color(c).multiplyScalar(k).getHexString();
  const mix = (a, b, k) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
  let seed = 1;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  // ---- shared body atlas: white (plain vertex colour) + "Yes" logos + name badges
  const AT = 256, REG = { white: [0.75, 0.625] };   // white sample point sits inside a 128 px white block (clean mips)
  const tile = (n, x, y, w, h) => (REG[n] = [x / AT, 1 - (y + h) / AT, (x + w) / AT, 1 - y / AT]);
  // painted greyscale tiles (multiplied by the vertex colour): denim twill, faded knees, hair strands
  tile('denim', 2, 2, 58, 58); tile('knee_up', 66, 2, 58, 58); tile('knee_dn', 2, 66, 58, 58); tile('hair', 66, 66, 58, 58);
  tile('tweed', 166, 138, 40, 40); tile('knit', 212, 138, 40, 40);
  function drawYes(c, x, y, h, color) {           // handwritten "Yes", h = box height in px
    c.save(); c.translate(x, y); c.scale(h / 50, h / 50);
    c.strokeStyle = color; c.lineWidth = 6.5; c.lineCap = c.lineJoin = 'round'; c.beginPath();
    c.moveTo(6, 9); c.quadraticCurveTo(8, 25, 21, 27);
    c.moveTo(33, 7); c.quadraticCurveTo(31, 31, 23, 41); c.quadraticCurveTo(17, 50, 9, 45);
    c.moveTo(40, 29); c.quadraticCurveTo(53, 29, 52, 22); c.quadraticCurveTo(49, 15, 42, 21);
    c.quadraticCurveTo(36, 29, 42, 35); c.quadraticCurveTo(48, 39, 56, 33);
    c.moveTo(75, 21); c.quadraticCurveTo(67, 17, 64, 23); c.quadraticCurveTo(63, 28, 71, 30);
    c.quadraticCurveTo(79, 33, 75, 38); c.quadraticCurveTo(70, 42, 61, 37);
    c.stroke(); c.restore();
  }
  canvasTex.yes = drawYes;   // shared handwritten "Yes" painter for sets/cards: canvasTex.yes(ctx, x, y, height, color)
  let atlasMat = null, skinMat = null;   // skinned bodies get their own copy: one material on skinned + plain meshes re-picks its program at every switch
  const atlas = () => atlasMat || (atlasMat = matTex(canvasTex(AT, AT, (c) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, AT, AT);
    let q = 12345; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
    const speck = (x0, y0, n, lo, hi) => { for (let i = 0; i < n; i++) { const v = lo + r() * (hi - lo) | 0; c.fillStyle = `rgb(${v},${v},${v + 4})`; c.fillRect(x0 + r() * 62, y0 + r() * 62, 1 + (r() < 0.3), 1); } };
    const denim = (x0, y0, base) => {
      c.fillStyle = base; c.fillRect(x0, y0, 64, 64); speck(x0, y0, 900, 150, 255);
      c.save(); c.beginPath(); c.rect(x0, y0, 64, 64); c.clip(); c.strokeStyle = 'rgba(40,40,60,0.12)'; c.lineWidth = 1;
      for (let i = -64; i < 64; i += 3) { c.beginPath(); c.moveTo(x0 + i, y0 + 64); c.lineTo(x0 + i + 64, y0); c.stroke(); }
      c.strokeStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 6; i++) { const x = x0 + r() * 64; c.beginPath(); c.moveTo(x, y0); c.lineTo(x + (r() - 0.5) * 4, y0 + 64); c.stroke(); }
      c.restore();
    };
    denim(0, 0, '#dcdcdc');
    for (const [x0, y0, up] of [[64, 0, 1], [0, 64, 0]]) {        // faded knee: bright toward the knee line, pants-dark at the far edge
      const g = c.createLinearGradient(0, y0 + (up ? 64 : 0), 0, y0 + (up ? 0 : 64));
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#e8e8e8'); g.addColorStop(1, '#a9a9a9');
      c.fillStyle = g; c.fillRect(x0, y0, 64, 64);
      c.globalAlpha = 0.55; speck(x0, y0, 700, 120, 255); c.globalAlpha = 0.4;
      c.strokeStyle = 'rgba(255,255,255,0.7)'; for (let i = 0; i < 16; i++) { const y = y0 + (up ? 64 - r() * 28 : r() * 28); c.beginPath(); c.moveTo(x0 + 6 + r() * 16, y); c.lineTo(x0 + 40 + r() * 18, y + (r() - 0.5) * 3); c.stroke(); }
      c.globalAlpha = 1;
    }
    c.fillStyle = '#ececec'; c.fillRect(64, 64, 64, 64);           // hair: long strands
    for (let i = 0; i < 70; i++) { const x = 64 + r() * 64, v = 170 + r() * 85 | 0; c.strokeStyle = `rgb(${v},${v},${v})`; c.lineWidth = 0.8 + r() * 1.4; c.beginPath(); c.moveTo(x, 64); c.quadraticCurveTo(x + (r() - 0.5) * 6, 96, x + (r() - 0.5) * 4, 128); c.stroke(); }
    c.fillStyle = '#dedede'; c.fillRect(162, 134, 48, 48);         // tweed: herringbone + coloured-ish flecks
    c.save(); c.beginPath(); c.rect(162, 134, 48, 48); c.clip(); c.strokeStyle = 'rgba(60,50,40,0.22)'; c.lineWidth = 1;
    for (let x = 162; x < 212; x += 6) for (let y = 134; y < 184; y += 4) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + 3, y + 3); c.lineTo(x + 6, y); c.stroke(); }
    for (let i = 0; i < 260; i++) { const v = 110 + r() * 145 | 0; c.fillStyle = `rgb(${v},${v - 6},${v - 12})`; c.fillRect(162 + r() * 48, 134 + r() * 48, 1, 1); }
    c.restore();
    c.fillStyle = '#e4e4e4'; c.fillRect(208, 134, 48, 48);         // knit: rib columns of V stitches
    c.save(); c.beginPath(); c.rect(208, 134, 48, 48); c.clip(); c.strokeStyle = 'rgba(40,40,40,0.28)'; c.lineWidth = 1.2;
    for (let x = 208; x < 256; x += 6) { for (let y = 134; y < 184; y += 5) { c.beginPath(); c.moveTo(x + 0.5, y); c.lineTo(x + 3, y + 3.5); c.lineTo(x + 5.5, y); c.stroke(); } c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(x + 5.5, 134, 0.8, 48); }
    c.restore();
    [['yes_black', CONFIG.colors.polo], ['yes_blue', CONFIG.colors.chaseBlue]].forEach(([n, bg], i) => {
      c.fillStyle = bg; c.fillRect(i * 80, 136, 80, 40);
      drawYes(c, i * 80 + 12, 141, 30, CONFIG.colors.yes);
      tile(n, i * 80 + 10, 139, 60, 34);
    });
    ['LUKA', 'CHASE', 'LUKE', 'JORDAN'].forEach((b, i) => {
      const x = i * 64 + 2, y = 196;
      c.fillStyle = '#f5f5f1'; c.fillRect(x, y, 60, 36);
      c.fillStyle = CONFIG.colors.polo; c.fillRect(x, y, 60, 9);
      drawYes(c, x + 3, y + 1, 8, CONFIG.colors.yes);
      c.fillStyle = '#1b1c20'; c.font = 'bold 15px Arial, sans-serif'; c.textAlign = 'center'; c.fillText(b, x + 30, y + 29, 54);
      tile('badge_' + b, x, y, 60, 36);
    });
  }, { key: 'char_atlas' })));

  // ---- geometry accumulation (build time only)
  let G = null;
  const I4 = new THREE.Matrix4(), _v = new THREE.Vector3();
  function vert(b, p, col, uv) {
    _v.set(p[0], p[1], p[2]).applyMatrix4(G.m[b] || I4);
    G.P.push(_v.x, _v.y, _v.z); G.C.push(col.r, col.g, col.b); G.U.push(uv[0], uv[1]); G.S.push(b);
    const x = G.blend ? G.blend(p) : null;
    G.B.push(x ? x[0] : 0, x ? x[1] : 0);
  }
  const W2 = REG.white;
  function tri(b, p0, p1, p2, color, u0 = W2, u1 = W2, u2 = W2) { const c = lin(color); vert(b, p0, c, u0); vert(b, p1, c, u1); vert(b, p2, c, u2); }
  function quad(b, p0, p1, p2, p3, color, uv) {
    if (uv) { tri(b, p0, p1, p2, color, [uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]]); tri(b, p0, p2, p3, color, [uv[0], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]); }
    else { tri(b, p0, p1, p2, color); tri(b, p0, p2, p3, color); }
  }
  // ring at height y around (xc, zc); angle 0 = +Z (front), increasing toward +X. Open arcs get n+1 points.
  function ring(n, y, rx, rz, zc = 0, xc = 0, a0 = 0, a1 = a0 + TAU) {
    const open = a1 - a0 < TAU - 1e-6, pts = [];
    for (let i = 0; i < n + (open ? 1 : 0); i++) { const a = a0 + (a1 - a0) * i / n; pts.push([xc + Math.sin(a) * rx, y, zc + Math.cos(a) * rz]); }
    pts.open = open; return pts;
  }
  // ring across Z (for shoes, along the foot): angle 0 = +Y, increasing toward -X
  function ringZ(n, z, rx, ry, yc = 0) {
    const pts = []; for (let i = 0; i < n; i++) { const a = TAU * i / n + Math.PI / n; pts.push([-Math.sin(a) * rx, yc + Math.cos(a) * ry, z]); } return pts;
  }
  // loft rings (listed bottom->top, or top->bottom with o.down). color: value or (segment, side) => value.
  // A colour function may return [colour, atlasTile]: that face then maps the tile (u across the ring, v bottom -> top).
  function loft(b, rings, color, o = {}) {
    const n = rings[0].length, open = rings[0].open, cf0 = typeof color === 'function' ? color : () => color;
    const cf = (s, i) => { const v = cf0(s, i); return Array.isArray(v) ? v[0] : v; };
    for (let s = 0; s < rings.length - 1; s++) for (let i = 0; i < (open ? n - 1 : n); i++) {
      const j = (i + 1) % n, a = rings[s][i], bb = rings[s][j], c = rings[s + 1][j], d = rings[s + 1][i], v = cf0(s, i);
      if (Array.isArray(v)) {
        const R = REG[v[1]], v0 = o.down ? R[3] : R[1], v1 = o.down ? R[1] : R[3], ua = [R[0], v0], ub = [R[2], v0], uc = [R[2], v1], ud = [R[0], v1];
        if (o.down) { tri(b, a, d, c, v[0], ua, ud, uc); tri(b, a, c, bb, v[0], ua, uc, ub); } else { tri(b, a, bb, c, v[0], ua, ub, uc); tri(b, a, c, d, v[0], ua, uc, ud); }
      } else if (o.down) quad(b, a, d, c, bb, v); else quad(b, a, bb, c, d, v);
    }
    if (open) return;
    const cap = (r, col, up) => {
      const m = [0, 0, 0]; r.forEach((p) => { m[0] += p[0] / n; m[1] += p[1] / n; m[2] += p[2] / n; });
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (up) tri(b, r[i], r[j], m, col); else tri(b, r[j], r[i], m, col); }
    };
    if (o.capB !== false) cap(rings[0], cf(0, -1), !!o.down);
    if (o.capT !== false) cap(rings[rings.length - 1], cf(rings.length - 2, -1), !o.down);
  }
  function box(b, x, y, z, w, h, d, color, rotX = 0) {
    const hw = w / 2, hh = h / 2, hd = d / 2, cx = Math.cos(rotX), sx = Math.sin(rotX);
    const P = [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd], [-hw, -hh, -hd], [hw, -hh, -hd], [hw, hh, -hd], [-hw, hh, -hd]]
      .map(([px, py, pz]) => [x + px, y + py * cx - pz * sx, z + py * sx + pz * cx]);
    [[0, 1, 2, 3], [5, 4, 7, 6], [1, 5, 6, 2], [4, 0, 3, 7], [3, 2, 6, 7], [4, 5, 1, 0]].forEach((f) => quad(b, P[f[0]], P[f[1]], P[f[2]], P[f[3]], color));
  }
  // square-section bar from p0 to p1, thickness t
  function bar(b, p0, p1, t, color) {
    const d = new THREE.Vector3(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]).normalize();
    const u = new THREE.Vector3().crossVectors(d, Math.abs(d.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize().multiplyScalar(t * 0.7);
    const v = new THREE.Vector3().crossVectors(d, u);
    const rg = (p) => [u, v, u.clone().negate(), v.clone().negate()].map((o) => [p[0] + o.x, p[1] + o.y, p[2] + o.z]);
    loft(b, [rg(p0), rg(p1)], color);
  }
  // thin chain/cord through points: a double-sided ribbon, width 2t across x (reads from the front and back)
  function wire(b, pts, t, color) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1];
      quad(b, [p[0] - t, p[1], p[2]], [q[0] - t, q[1], q[2]], [q[0] + t, q[1], q[2]], [p[0] + t, p[1], p[2]], color);
      quad(b, [p[0] + t, p[1], p[2]], [q[0] + t, q[1], q[2]], [q[0] - t, q[1], q[2]], [p[0] - t, p[1], p[2]], color);
    }
  }
  // a quad lying on loft face (ring s..s+1, side i), bilinear in (u,v), pushed out by `off`
  function onFace(rings, s, i, u0, u1, v0, v1, off = 0.003) {
    const n = rings[s].length, a = rings[s][i], b = rings[s][(i + 1) % n], c = rings[s + 1][(i + 1) % n], d = rings[s + 1][i];
    const nx = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a))
      .cross(new THREE.Vector3().subVectors(new THREE.Vector3(...d), new THREE.Vector3(...a))).normalize().multiplyScalar(off);
    const at = (u, v) => [0, 1, 2].map((k) => (a[k] * (1 - u) + b[k] * u) * (1 - v) + (d[k] * (1 - u) + c[k] * u) * v + nx.getComponent(k));
    return [at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1)];
  }
  function geoOf(fn, mats) {
    const prev = G; G = { P: [], C: [], U: [], S: [], B: [], m: mats || [] }; fn();
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(G.P, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(G.C, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(G.U, 2));
    if (mats) {
      const n = G.S.length, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      for (let i = 0; i < n; i++) { si[i * 4] = G.S[i]; si[i * 4 + 1] = G.B[i * 2]; sw[i * 4] = 1 - G.B[i * 2 + 1]; sw[i * 4 + 1] = G.B[i * 2 + 1]; }
      g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
    }
    g.computeVertexNormals();
    G = prev; return g;
  }

  // ---- head + painted face. Canvas is 128 "units" square (drawn at 256 px, 128 for extras), projected
  // front-on over the head: x -HX..HX -> 0..128, y crown -> row 0, chin -> row 128.
  const EXPR = {
    neutral: ['open', 'neutral', 'closed'], talk: ['open', 'raised', 'closed'], worried: ['open', 'worried', 'frown'],
    stunned: ['wide', 'raised', 'O'], laugh: ['happy', 'raised', 'smile'], sad: ['half', 'worried', 'frown'],
    crying: ['closed', 'worried', 'grimace', 1], determined: ['open', 'angry', 'closed'], smug: ['half', 'smug', 'smirk'],
    sleep: ['closed', 'neutral', 'closed'],
  };
  const EX = 21, EY = 55, BY = 44, MY = 98, hwOf = (L) => (L.headW ?? 1) * 1.08;
  function headGeo(L, hs) {
    const j = L.jaw ?? 1, hw = hwOf(L), HX = 0.095 * hs * hw, Y0 = -0.02 * hs, Y1 = 0.25 * hs;
    const rings = [[-0.004, 0.036 * j, 0.03, 0.058], [0.028, 0.064 * j, 0.062, 0.04], [0.068, 0.083 * (1 + (j - 1) * 0.7), 0.09, 0.017],
      [0.114, 0.091, 0.101, 0.006], [0.16, 0.092, 0.104, 0], [0.205, 0.084, 0.099, -0.006], [0.238, 0.058, 0.074, -0.012], [0.254, 0.022, 0.03, -0.012]]
      .map(([y, rx, rz, zc]) => ring(10, y * hs, rx * hs * hw, rz * hs, zc * hs));
    let earAt = 0;
    const g = geoOf(() => {
      loft(0, rings, L.skin, { capB: false });
      const h = hs, z = 0.104 * hs, nw = L.nose ?? 1;
      const top = [0, 0.142 * h, z], tip = [0, 0.078 * h, (0.104 + 0.022 * nw) * h], bl = [-0.017 * h * nw, 0.068 * h, z], br = [0.017 * h * nw, 0.068 * h, z];
      tri(0, top, bl, tip, L.skin); tri(0, top, tip, br, L.skin); tri(0, bl, br, tip, L.skin);
      // ears: a short wedge on the flat side of the skull, flaring out toward the back edge
      earAt = G.P.length / 3;
      const X = 0.0865 * hs * hw - 0.002, E = [[0.148, 0.004], [0.086, 0.002], [0.098, -0.024], [0.156, -0.03]];
      for (const sx of [-1, 1]) {
        const mk = (dx, db, dz) => { const r = E.map(([y, zz], i) => [sx * (X + dx + (i > 1 ? db : 0)), y * hs, zz * hs + (i > 1 ? dz : 0)]); return sx > 0 ? r : r.reverse(); };
        loft(0, [mk(-0.006, 0, 0), mk(0.006, 0.01, -0.004)], L.skin, { capB: false });
      }
    });
    // planar UVs from the front; faces turned away sample a skin patch (bottom-left corner)
    const p = g.attributes.position, uv = g.attributes.uv, a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 3) {
      a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
      const nz = b.clone().sub(a).cross(c.clone().sub(a)).normalize().z;
      for (let k = 0; k < 3; k++) {
        if (i >= earAt) uv.setXY(i + k, 0.914 + 0.07 * Math.min(1, Math.max(0, (0.004 * hs - p.getZ(i + k)) / (0.036 * hs))), 0.014 + 0.07 * Math.min(1, Math.max(0, (p.getY(i + k) - 0.086 * hs) / (0.07 * hs))));   // ear tile
        else if (nz < -0.35) uv.setXY(i + k, 0.03, 0.03);
        else uv.setXY(i + k, (p.getX(i + k) / HX + 1) / 2, (p.getY(i + k) - Y0) / (Y1 - Y0));
      }
    }
    g.deleteAttribute('color');
    return { g, rings };
  }

  function faceKit(L, S) {
    const k = S / 128, skin = L.skin, hair = L.hair || '#3a2a1e', line = L.lineCol || '#2a1b15';
    const browC = L.brow || shade(hair, 0.8), lid = shade(skin, 0.86), lip = L.lips || mix(skin, '#a4524c', 0.4);
    const base = document.createElement('canvas'); base.width = base.height = S;
    const c = base.getContext('2d'); c.scale(k, k); c.lineCap = c.lineJoin = 'round';
    const path = (pts, close = true) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); if (close) c.closePath(); };
    seed = 7 + (L.h || 1) * 1000 | 0;
    c.fillStyle = skin; c.fillRect(0, 0, 128, 128);
    // cheeks, nose, age
    if (L.blush) for (const x of [40, 88]) { const g = c.createRadialGradient(x, 76, 0, x, 76, 12); g.addColorStop(0, `rgba(215,90,90,${L.blush})`); g.addColorStop(1, 'rgba(215,90,90,0)'); c.fillStyle = g; c.fillRect(x - 14, 60, 28, 32); }
    c.strokeStyle = shade(skin, 0.8); c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(68, 62); c.quadraticCurveTo(71, 74, 70, 84); c.stroke();
    c.fillStyle = shade(skin, 0.62);
    c.beginPath(); c.ellipse(60.5, 88, 1.6, 0.9, 0.3, 0, TAU); c.ellipse(67.5, 88, 1.6, 0.9, -0.3, 0, TAU); c.fill();
    if (L.freckles) { c.fillStyle = shade(skin, 0.72); for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(40 + rnd() * 48 + (i % 2 ? 0 : 0), 68 + rnd() * 14, 0.7, 0, TAU); c.fill(); } }
    if (L.age) {
      c.strokeStyle = `rgba(90,50,40,${0.25 + L.age * 0.3})`; c.lineWidth = 1.1;
      for (const s of [-1, 1]) {
        c.beginPath(); c.moveTo(64 + s * 12, 89); c.quadraticCurveTo(64 + s * 15, 96, 64 + s * 13, 104); c.stroke();
        c.beginPath(); c.moveTo(64 + s * (EX - 6), EY + 9.5); c.quadraticCurveTo(64 + s * EX, EY + 12.5, 64 + s * (EX + 7), EY + 8); c.stroke();
        c.beginPath(); c.moveTo(64 + s * (EX + 13), EY + 0.5); c.lineTo(64 + s * (EX + 16), EY - 1); c.moveTo(64 + s * (EX + 13), EY + 3); c.lineTo(64 + s * (EX + 16), EY + 4); c.stroke();
      }
      for (const y of [30, 35]) { c.beginPath(); c.moveTo(46, y); c.quadraticCurveTo(64, y - 2, 82, y); c.stroke(); }
    }
    if (L.tired) { c.strokeStyle = 'rgba(110,70,90,0.45)'; c.lineWidth = 2.2; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(64 + s * (EX - 7), EY + 7.5); c.quadraticCurveTo(64 + s * EX, EY + 11.5, 64 + s * (EX + 7), EY + 6.5); c.stroke(); } }
    // beard / stubble / moustache (the beard reaches the canvas edges = the sides of the head, as sideburns)
    const beardPath = () => path([0, 46, 0, 80, 6, 98, 18, 112, 34, 122, 50, 127, 64, 128, 78, 127, 94, 122, 110, 112, 122, 98, 128, 80, 128, 46,
      117, 46, 116, 62, 110, 76, 100, 85, 86, 89, 76, 91, 64, 90, 52, 91, 42, 89, 28, 85, 18, 76, 12, 62, 11, 46]);
    const bc = L.beardCol || hair, lipPatch = shade(mix(skin, lip, 0.4), 0.72);
    if (L.beard === 'full') {
      c.fillStyle = bc; beardPath(); c.fill();
      c.strokeStyle = shade(bc, 0.68); c.lineWidth = 0.9;
      for (let i = 0; i < 120; i++) { const x = 4 + rnd() * 120, y = 88 + rnd() * 36; if (Math.abs(x - 64) < 62 - (y - 92) * 1.2) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 2, y + 3.5); c.stroke(); } }
      c.strokeStyle = shade(bc, 1.35); c.lineWidth = 0.7;
      for (let i = 0; i < 40; i++) { const x = 8 + rnd() * 112, y = 92 + rnd() * 26; if (Math.abs(x - 64) < 56 - (y - 92) * 1.2) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + (rnd() - 0.5) * 2, y + 3); c.stroke(); } }
      c.fillStyle = lipPatch; c.beginPath(); c.ellipse(64, MY + 2.6, 6.5, 2.2, 0, 0, TAU); c.fill();          // lower lip showing through
      c.fillStyle = bc; path([46, 99, 50, 93, 57, 90.5, 64, 91.5, 71, 90.5, 78, 93, 82, 99, 76, 96.5, 64, 96, 52, 96.5]); c.fill();   // moustache
    } else if (L.beard === 'stubble') {
      c.save(); beardPath(); c.clip(); c.fillStyle = bc; c.globalAlpha = 0.22; c.fillRect(0, 44, 128, 84);
      c.globalAlpha = 0.4; for (let i = 0; i < 320; i++) c.fillRect(rnd() * 128, 80 + rnd() * 48, 0.8, 0.8);
      c.globalAlpha = 0.18; c.fillStyle = skin; c.beginPath(); c.ellipse(64, MY + 1, 10, 4, 0, 0, TAU); c.fill(); c.restore();
    }
    if (L.moustache) {
      c.fillStyle = L.moustache; path([45, 100, 48, 93, 56, 89.5, 64, 91, 72, 89.5, 80, 93, 83, 100, 77, 97, 64, 96, 51, 97]); c.fill();
      c.strokeStyle = shade(L.moustache, 0.75); c.lineWidth = 0.8;
      for (let i = 0; i < 14; i++) { const x = 50 + i * 2; c.beginPath(); c.moveTo(x, 92); c.lineTo(x + (x < 64 ? -1.5 : 1.5), 96.5); c.stroke(); }
    }
    // hair on the top rows (the hair mesh sits over it; this shows as the hairline and in portraits)
    const st = L.hairStyle || 'short';
    c.fillStyle = hair;
    if (st === 'bald') { c.fillRect(0, 36, 10, 30); c.fillRect(118, 36, 10, 30); c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.ellipse(52, 14, 16, 6, -0.2, 0, TAU); c.fill(); }
    else if (st === 'messy') path([0, 0, 128, 0, 128, 60, 121, 46, 116, 31, 106, 35, 98, 28, 90, 37, 82, 29, 74, 38, 66, 30, 58, 39, 50, 29, 42, 37, 34, 28, 26, 36, 18, 30, 10, 36, 6, 60, 0, 60]);
    else if (st === 'bob') path([0, 0, 128, 0, 128, 104, 116, 100, 114, 60, 108, 36, 20, 36, 14, 60, 12, 100, 0, 104]);
    else {
      const long = /long|big|set|curly|mullet/.test(st), low = long ? 100 : 62;
      path([0, 0, 128, 0, 128, low, 122, low - 2, 120, 44, 112, 30, 90, 22, 64, st === 'slick' ? 25 : 21, 38, 22, st === 'tidy' ? 20 : 16, 30, 8, 44, 6, low - 2, 0, low]);
    }
    if (st !== 'bald') c.fill();
    c.fillStyle = skin; c.fillRect(0, 118, 10, 10);   // back-of-head patch
    c.fillRect(116, 116, 12, 12); c.fillStyle = shade(skin, 0.9); c.beginPath(); c.ellipse(121, 121.5, 1.6, 2.4, 0, 0, TAU); c.fill();   // ear tile (plain skin, faint concha)

    const canvas = document.createElement('canvas'); canvas.width = canvas.height = S;
    const x = canvas.getContext('2d'); x.lineCap = x.lineJoin = 'round';
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const lids = L.lids || 0, iris = L.eyes || '#5a3b28', irisD = shade(iris, 0.6), lidLine = shade(skin, 0.72);
    const ink = L.mouthInk || shade(lip, 0.45), inside = '#4a1818', teeth = '#f2eee4', tongue = '#b8565a', lipHi = mix(lip, skin, 0.35);
    const scl = L.eyeScale ?? 1;
    // eyes: almond with a heavier upper lid line; s = -1 for the canvas-left eye, +1 canvas-right (peak leans inward)
    function eye(cx, e, s) {
      x.strokeStyle = line; x.lineCap = 'round';
      if (e === 'closed' || e === 'happy') {
        x.lineWidth = 2.3; x.beginPath(); x.moveTo(cx - 9, EY + 0.5);
        x.quadraticCurveTo(cx, EY + (e === 'happy' ? -6.5 : 3.8), cx + 9, EY + 0.5); x.stroke();
        if (e === 'closed') { x.lineWidth = 1; x.strokeStyle = lidLine; x.beginPath(); x.moveTo(cx - 6, EY - 3.5); x.quadraticCurveTo(cx, EY - 5.5, cx + 6, EY - 3.5); x.stroke(); }
        return;
      }
      const wide = e === 'wide', h = (wide ? 8.2 : 6.4) * scl, w = (wide ? 10.4 : 9.8) * scl;
      const lidPath = () => { x.moveTo(cx - w, EY + 0.8); x.quadraticCurveTo(cx - s * 1.8, EY - h * 1.4, cx + w, EY - 0.3 * s); };
      x.beginPath(); lidPath(); x.quadraticCurveTo(cx + s * 1.2, EY + h * 1.1, cx - w, EY + 0.8); x.closePath();
      x.fillStyle = '#f7f3ec'; x.fill(); x.save(); x.clip();
      const ir = (wide ? 4.3 : 5.1) * scl, iy = EY + 0.3;
      x.fillStyle = irisD; x.beginPath(); x.arc(cx, iy, ir, 0, TAU); x.fill();
      x.fillStyle = iris; x.beginPath(); x.arc(cx, iy + 0.4, ir * 0.78, 0, TAU); x.fill();
      x.fillStyle = '#120c0a'; x.beginPath(); x.arc(cx, iy, ir * (wide ? 0.38 : 0.46), 0, TAU); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(cx - 1.6, iy - 1.8, 1.35, 0, TAU); x.fill();
      x.fillStyle = 'rgba(40,20,10,0.18)'; x.fillRect(cx - 11, EY - 10, 22, 3.4 + (wide ? 0 : 1.5));   // lid shadow on the white
      const cover = e === 'half' ? 0.55 : wide ? 0 : lids, cy = EY - 10 + 10 * cover * 1.2 + (e === 'half' ? 1.5 : 0);
      if (cover) { x.fillStyle = lid; x.fillRect(cx - 11, EY - 11, 22, cy - EY + 11); }
      x.restore();
      x.beginPath();
      if (cover) { x.moveTo(cx - w, EY + 0.8); x.quadraticCurveTo(cx, cy - 1.2, cx + w, EY - 0.3 * s); } else lidPath();
      x.lineWidth = L.lash ? 2.8 : 2.3; x.stroke();
      x.lineWidth = 0.9; x.strokeStyle = lidLine; x.beginPath(); x.moveTo(cx - w * 0.8, EY + 3 + (wide ? 2 : 0)); x.quadraticCurveTo(cx + s, EY + h * 1.05 + 0.4, cx + w * 0.85, EY + 1.5); x.stroke();
      if (!cover && !wide) { x.beginPath(); x.moveTo(cx - w * 0.7, EY - h - 0.6); x.quadraticCurveTo(cx - s * 1.5, EY - h * 1.62, cx + w * 0.75, EY - h * 0.7); x.stroke(); }   // lid crease
      if (L.lash) { x.strokeStyle = line; x.lineWidth = 1.5; x.beginPath(); x.moveTo(cx + s * (w - 0.5), EY - 0.6); x.quadraticCurveTo(cx + s * (w + 1.8), EY - 1.2, cx + s * (w + 2.6), EY - 3.2); x.stroke(); }
    }
    // brows: tapered filled strokes, thick at the inner end
    function brow(cx, s, b) {    // s = +1 for the brow on the canvas right (character's left)
      let yi = BY + 0.5, yo = BY + 1, arch = -2.6;
      if (b === 'worried' || (b === 'smug' && s < 0)) { yi = BY - 4.5; yo = BY + 2.2; arch = -0.8; }
      if (b === 'raised' || (b === 'smug' && s > 0)) { yi = BY - 3.5; yo = BY - 3; arch = -4; }
      if (b === 'angry') { yi = BY + 4; yo = BY - 1.8; arch = 0.6; }
      if (b === 'smug' && s < 0) { yi = BY + 1.5; yo = BY + 2; arch = -1; }
      const t = (L.browW || 3.3) * 1.05, xi = cx - s * 7, xo = cx + s * 10, xm = cx + s * 1.5, ym = Math.min(yi, yo) + arch;
      x.fillStyle = browC; x.beginPath();
      x.moveTo(xi, yi - t * 0.55); x.quadraticCurveTo(xm, ym - t * 0.5, xo, yo - t * 0.12);
      x.quadraticCurveTo(xo + s * 0.8, yo + t * 0.2, xo - s * 0.6, yo + t * 0.22);
      x.quadraticCurveTo(xm, ym + t * 0.55, xi, yi + t * 0.55); x.closePath(); x.fill();
    }
    function mouth(m) {
      x.lineCap = 'round'; x.lineWidth = 2.1; x.strokeStyle = ink;
      if (m === 'closed') {
        x.beginPath(); x.moveTo(54, MY - 0.3); x.quadraticCurveTo(64, MY + 1.8, 74, MY - 0.3); x.stroke();
        x.strokeStyle = lipHi; x.lineWidth = 1.7; x.beginPath(); x.moveTo(58.5, MY + 3.4); x.quadraticCurveTo(64, MY + 4.9, 69.5, MY + 3.4); x.stroke();
      } else if (m === 'frown') {
        x.beginPath(); x.moveTo(54, MY + 3.2); x.quadraticCurveTo(64, MY - 2.8, 74, MY + 3.2); x.stroke();
        x.strokeStyle = lipHi; x.lineWidth = 1.4; x.beginPath(); x.moveTo(59.5, MY + 3.8); x.quadraticCurveTo(64, MY + 3, 68.5, MY + 3.8); x.stroke();
      } else if (m === 'smirk') {
        x.beginPath(); x.moveTo(55, MY + 0.8); x.quadraticCurveTo(66, MY + 2.2, 75, MY - 3.4); x.stroke();
        x.lineWidth = 1.2; x.beginPath(); x.moveTo(74.5, MY - 5.2); x.quadraticCurveTo(76.5, MY - 3.5, 75.5, MY - 1.5); x.stroke();
      } else if (m === 'O') {
        x.fillStyle = inside; x.beginPath(); x.ellipse(64, MY + 1.6, 4.3, 5.4, 0, 0, TAU); x.fill();
        x.strokeStyle = lip; x.lineWidth = 1.8; x.stroke();
        x.fillStyle = tongue; x.beginPath(); x.ellipse(64, MY + 5, 2.6, 1.5, 0, 0, TAU); x.fill();
      } else if (m === 'grimace') {
        x.fillStyle = teeth; x.beginPath(); x.moveTo(52, MY - 1.5); x.quadraticCurveTo(64, MY - 3, 76, MY - 1.5); x.lineTo(74, MY + 5.5); x.quadraticCurveTo(64, MY + 7, 54, MY + 5.5); x.closePath(); x.fill();
        x.stroke(); x.lineWidth = 0.9; x.beginPath(); x.moveTo(53, MY + 2.2); x.quadraticCurveTo(64, MY + 1.6, 75, MY + 2.2);
        for (const tx of [58, 64, 70]) { x.moveTo(tx, MY - 2); x.lineTo(tx, MY + 6); } x.stroke();
      } else {   // 'A' and 'smile' (open)
        const sm = m === 'smile', shape = () => {
          x.beginPath();
          if (sm) { x.moveTo(52, MY - 2.5); x.quadraticCurveTo(64, MY + 0.5, 76, MY - 2.5); x.quadraticCurveTo(64, MY + 13, 52, MY - 2.5); }
          else { x.moveTo(56, MY); x.quadraticCurveTo(64, MY - 4, 72, MY); x.quadraticCurveTo(64, MY + 10.5, 56, MY); }
        };
        x.fillStyle = inside; shape(); x.fill(); x.save(); x.clip();
        x.fillStyle = teeth; x.fillRect(48, MY - 5, 32, sm ? 5.2 : 3.6);
        x.fillStyle = tongue; x.beginPath(); x.ellipse(64, sm ? MY + 9.5 : MY + 8, sm ? 7 : 4.5, 3, 0, 0, TAU); x.fill();
        x.restore(); x.strokeStyle = ink; x.lineWidth = 1.6; shape(); x.stroke();
      }
    }
    let dE, dB, dM, dT;
    function draw(e, b, m, tears) {
      if (e === dE && b === dB && m === dM && tears === dT) return;
      dE = e; dB = b; dM = m; dT = tears;
      x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(base, 0, 0); x.setTransform(k, 0, 0, k, 0, 0);
      eye(64 - EX, e, -1); eye(64 + EX, e, 1); brow(64 - EX, -1, b); brow(64 + EX, 1, b); mouth(m);
      if (tears) {
        x.strokeStyle = 'rgba(160,210,250,0.9)'; x.lineWidth = 2.6;
        x.beginPath(); x.moveTo(64 - EX + 3, EY + 5); x.quadraticCurveTo(64 - EX + 5, EY + 16, 64 - EX + 3, EY + 26);
        x.moveTo(64 + EX - 3, EY + 5); x.quadraticCurveTo(64 + EX - 5, EY + 16, 64 + EX - 3, EY + 26); x.stroke();
        x.fillStyle = '#fff'; x.beginPath(); x.arc(64 - EX + 4, EY + 14, 1, 0, TAU); x.arc(64 + EX - 4, EY + 18, 1, 0, TAU); x.fill();
      }
      tex.needsUpdate = true;
    }
    return { canvas, tex, draw };
  }

  // ---- hair (skinned to the head bone)
  function hair(L, hs) {
    const st = L.hairStyle || 'short', col = L.hair || '#3a2a1e', hw = hwOf(L);
    if (st === 'none') return;
    const f = { crop: 1.03, cap: 1.04, ponytail: 1.06, slick: 1.055, messy: 1.09, set: 1.16, big: 1.28, long: 1.09, bob: 1.12, curly: 1.17, bald: 1.04 }[st] || 1.065;
    const band = st === 'bald', A0 = band ? 1.15 : 0, A1 = band ? TAU - 1.15 : TAU;
    const mk = (y, rx, rz, zc) => ring(10, y * hs, rx * hs * hw * f, rz * hs * f, zc * hs, 0, A0, A1);
    const rings = band ? [mk(0.1, 0.092, 0.104, 0), mk(0.19, 0.09, 0.103, -0.004)]
      : [mk(0.15, 0.092, 0.104, 0), mk(0.205, 0.086, 0.1, -0.006), mk(0.24, 0.06, 0.075, -0.012), mk(0.257, 0.02, 0.03, -0.012)];
    rings[0].forEach((p, i) => {   // rim: front up to the hairline, back down to the nape
      if (!band) p[1] += p[2] > 0 ? p[2] * 0.52 : p[2] * 0.78;
      if (p[2] < 0) p[2] *= 0.93;
      if (st === 'messy' && p[2] > 0.03) p[1] -= (i % 2 ? 0.022 : 0.006) * hs;
      if ((st === 'set' || st === 'big' || st === 'curly') && Math.abs(p[0]) > 0.05 * hs) p[1] -= 0.04 * hs;
    });
    if (!band) rings[1].forEach((p) => { p[1] += p[2] * 0.22; });
    if (st === 'slick') rings[1].concat(rings[2]).forEach((p) => { if (p[2] > 0) { p[1] += 0.016 * hs; p[2] += 0.006 * hs; } });
    if (st === 'messy' || st === 'curly' || st === 'set') rings.slice(1).forEach((r) => r.forEach((p, i) => { p[1] += (rnd() * 0.012 + (i % 2) * 0.006 + (st === 'messy' ? 0.01 : 0)) * hs; }));
    const strands = [col, 'hair'], under = shade(col, 0.72);
    loft(HEAD, rings, strands, { capB: false });
    if (st === 'messy') {        // fringe: a band tucked under the front of the cap, ragged tips hanging over the forehead, swept to one side
      const n = 8, bot = [], topR = [];
      for (let i = 0; i <= n; i++) {
        const u = i / n, a = -1.3 + 2.6 * u, a2 = a - 0.1, drop = (i % 2 ? 0.02 : 0.004) + (1 - u) * 0.014 + (i === 4 ? 0.006 : 0);
        topR.push([Math.sin(a) * 0.09 * hs * hw, 0.218 * hs, Math.cos(a) * 0.1 * hs]);
        bot.push([Math.sin(a2) * 0.098 * hs * hw * 1.02, (0.19 - drop) * hs, Math.cos(a2) * 0.113 * hs]);
      }
      bot.open = topR.open = true;
      loft(HEAD, [bot, topR], strands);
      loft(HEAD, [bot.map((p) => [p[0] * 0.97, p[1] + 0.002, p[2] * 0.96]), topR], under, { down: true });
    }
    const cur = (a0, a1, yTop, yBot, grow = 1) => {     // hanging hair: outer shell + a slightly smaller reversed one (so it reads from inside too)
      for (const [g, dn] of [[1, false], [0.94, true]]) loft(HEAD, [ring(10, yBot * hs, 0.1 * hs * hw * f * grow * g, 0.108 * hs * f * grow * g, -0.012 * hs, 0, a0, a1),
        ring(10, yTop * hs, 0.093 * hs * hw * f * g, 0.104 * hs * f * g, -0.004 * hs, 0, a0, a1)], dn ? under : strands, { down: dn });
    };
    if (st === 'long' || st === 'big') cur(1.05, TAU - 1.05, 0.17, st === 'big' ? -0.02 : -0.12, st === 'big' ? 1.45 : 1.2);
    if (st === 'bob') cur(0.95, TAU - 0.95, 0.16, 0.02, 1.12);
    if (st === 'mullet') cur(2.1, TAU - 2.1, 0.12, -0.06);
    if (st === 'set' || st === 'curly') cur(1.15, TAU - 1.15, 0.16, 0.06, 1.12);
    if (st === 'ponytail') {
      // gathered at the back of the crown with a dark tie, thick through the middle, tapering down past the collar
      const tail = [[0.2, 0.022, -0.095], [0.178, 0.03, -0.118], [0.158, 0.03, -0.126], [0.12, 0.046, -0.146], [0.03, 0.05, -0.162], [-0.06, 0.04, -0.17], [-0.13, 0.024, -0.172], [-0.18, 0.006, -0.168]]
        .map(([y, r, z]) => ring(6, y * hs, r * hs, r * hs * 0.8, z * hs));
      G.blend = (p) => { const u = (0.1 * hs - p[1]) / (0.28 * hs); return u > 0 ? [TORSO, Math.min(0.7, u)] : null; };   // the hanging end settles on the back
      loft(HEAD, tail, (s) => (s === 1 ? '#18181a' : s === 0 ? under : strands), { down: true });
      G.blend = null;
    }
    if (st === 'bun') loft(HEAD, [[-0.045, 0.02], [-0.025, 0.042], [0, 0.05], [0.025, 0.042], [0.045, 0.018]]
      .map(([y, r]) => ring(8, (0.2 + y) * hs, r * hs, r * hs, -0.118 * hs)), col);
  }

  // ---- attachments (small meshes on bones; origin = grip point or bone)
  const HELD = {
    phone: () => { box(0, 0, -0.05, 0, 0.011, 0.15, 0.072, '#1b1d22'); box(0, -0.0055, -0.05, 0, 0.002, 0.135, 0.062, '#2d4f86'); },
    brick: () => { box(0, 0, -0.06, 0, 0.05, 0.22, 0.062, '#8b8f94'); box(0, -0.026, -0.08, 0, 0.004, 0.12, 0.046, '#b9bdc1');
      box(0, -0.027, -0.02, 0, 0.004, 0.035, 0.04, '#5d7f63'); loft(0, [ring(4, 0.04, 0.006, 0.006, 0.02), ring(4, 0.17, 0.004, 0.004, 0.02)], '#2a2b2e'); },
    mug: (L) => { loft(0, [ring(8, -0.05, 0.042, 0.042), ring(8, 0.05, 0.044, 0.044)], L.mugCol || '#e9e3d6'); box(0, 0.052, 0, 0, 0.014, 0.06, 0.03, L.mugCol || '#e9e3d6'); },
    cup: () => { loft(0, [ring(8, -0.06, 0.036, 0.036), ring(8, -0.02, 0.04, 0.04), ring(8, 0.02, 0.043, 0.043), ring(8, 0.065, 0.046, 0.046), ring(8, 0.078, 0.042, 0.042)],
      (s) => (s === 1 ? '#8a5a35' : s === 3 ? '#2a2a2a' : '#f2efe8')); },
    textbook: (L) => { box(0, 0, 0, 0, 0.034, 0.24, 0.18, L.bookCol || '#7a2f2a'); box(0, 0, 0.001, 0.004, 0.03, 0.232, 0.176, '#efe8d6'); },
    newspaper: () => { box(0, 0, 0, 0, 0.012, 0.3, 0.22, '#dcd8cc'); box(0, -0.007, 0.08, 0, 0.002, 0.05, 0.18, '#3b3b3b'); },
    umbrella: (L) => { const c = L.umbrellaCol || '#1d1f24';
      loft(0, [ring(4, -0.1, 0.009, 0.009), ring(4, 0.72, 0.006, 0.006)], '#2a2622');
      loft(0, [ring(8, 0.6, 0.52, 0.52), ring(8, 0.78, 0.03, 0.03)], c, { capB: false });
      loft(0, [ring(8, 0.598, 0.52, 0.52), ring(8, 0.776, 0.03, 0.03)], shade(c, 0.7), { capB: false, down: true }); },
    stick: () => { loft(0, [ring(4, -0.84, 0.011, 0.011), ring(4, 0.03, 0.011, 0.011)], '#5a3a22'); box(0, 0, 0.04, 0.035, 0.022, 0.022, 0.09, '#5a3a22'); },
    handbag: (L) => { box(0, 0, -0.14, 0, 0.09, 0.15, 0.22, L.bagCol || '#5b3b58'); box(0, 0, -0.04, 0.07, 0.012, 0.09, 0.012, '#3a2436'); box(0, 0, -0.04, -0.07, 0.012, 0.09, 0.012, '#3a2436'); },
    whistle: () => { loft(0, [ring(6, -0.2, 0.008, 0.008), ring(6, 0.06, 0.007, 0.007)], (s) => '#b9bec4'); box(0, 0, 0.055, 0.008, 0.012, 0.012, 0.012, '#2a2a2a'); },
    recorder: () => { box(0, 0, -0.05, 0, 0.045, 0.1, 0.15, '#27292d'); box(0, -0.024, -0.03, 0, 0.004, 0.05, 0.1, '#7b8086'); box(0, -0.024, -0.075, 0.03, 0.004, 0.03, 0.03, '#b44'); },
  };
  // glasses: rectangular frames (front face + outer rim), ribbon temples; 'sun' = dark lenses
  function glasses(L, hs, kind, narrow = 1) {
    const hw = hwOf(L) * narrow, ex = (EX / 64) * 0.095 * hs * hw, y = 0.134 * hs, z = 0.118 * hs, th = kind === 'thick' ? 0.007 : 0.004;
    const rw = kind === 'thick' ? 0.042 : 0.036, rh = kind === 'thick' ? 0.033 : kind === 'reading' ? 0.021 : 0.026, col = L.frameCol || (kind === 'thick' ? '#1d1b1a' : '#3a3530');
    const sun = kind === 'sun', d = kind === 'thick' ? 0.008 : 0.005;
    const ribbon = (p, q) => { quad(0, [p[0], p[1] - th * 0.6, p[2]], [q[0], q[1] - th * 0.6, q[2]], [q[0], q[1] + th * 0.6, q[2]], [p[0], p[1] + th * 0.6, p[2]], col);
      quad(0, [p[0], p[1] + th * 0.6, p[2]], [q[0], q[1] + th * 0.6, q[2]], [q[0], q[1] - th * 0.6, q[2]], [p[0], p[1] - th * 0.6, p[2]], col); };
    for (const sx of [-1, 1]) {
      const cx = sx * ex, C = [[-1, 1], [1, 1], [1, -1], [-1, -1]];     // corners, clockwise from top-left
      const O = (i, zz) => [cx + C[i][0] * rw / 2, y + C[i][1] * rh / 2, zz], I = (i) => [cx + C[i][0] * (rw / 2 - th), y + C[i][1] * (rh / 2 - th), z + d / 2];
      if (sun) quad(0, O(3, z + d / 2), O(2, z + d / 2), O(1, z + d / 2), O(0, z + d / 2), '#141518');
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        if (!sun) quad(0, O(i, z + d / 2), I(i), I(j), O(j, z + d / 2), col);
        quad(0, O(i, z + d / 2), O(j, z + d / 2), O(j, z - d / 2), O(i, z - d / 2), sun ? '#141518' : col);
      }
      const tx = sx * (ex + rw / 2), bx = sx * 0.094 * hs * hw, ty = y + rh * 0.3;
      ribbon([tx, ty, z], [sx * 0.085 * hs * hw, ty, 0.07 * hs]);
      ribbon([sx * 0.085 * hs * hw, ty, 0.07 * hs], [bx, ty - 0.004, -0.02 * hs]);
    }
    box(0, 0, y + rh * 0.25, z, ex * 2 - rw, th, th, sun ? '#141518' : col);
  }

  const EMPTY = {};
  const ease = (x) => x * x * (3 - 2 * x);

  return function buildCharacter(id) {
    const L = LOOKS[id] || LOOKS.customer_a;
    atlas();
    seed = [...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) % 2147483646 + 1;
    const w = L.w ?? 1, hs = (L.head ?? 1) * 1.1, sh = L.sh ?? 1, belly = L.belly ?? 0, fem = L.fem ? 1 : 0, legF = (L.leg ?? 1) * 0.95;
    const footH = 0.08, shin = 0.42 * legF, thigh = 0.43 * legF, hipY = footH + shin + thigh + 0.02;
    const T = 0.47 * (L.torso ?? 1), neckL = 0.036 * (L.neckLen ?? 1), upper = 0.29 * (L.arm ?? 1), fore = 0.26 * (L.arm ?? 1);
    const ar = 0.05 * w * (L.arms ?? 1), chestRx = 0.158 * w * sh + belly * 0.012, shX = chestRx + ar * 0.35;
    const hipRx = 0.15 * w * (1 + fem * 0.12 + (L.hips ?? 0)) + belly * 0.02, hipX = hipRx * 0.6, nr = 0.055 * (L.neck ?? 1) * Math.sqrt(w);
    const total = hipY + 0.06 + T + neckL + 0.252 * hs, s = (L.h ?? 1.78) / total;
    const skin = L.skin, top = L.top || '#777', top2 = L.top2 || top, pants = L.pants || '#333', legCol = L.legCol || skin;
    const sleeve = L.sleeve || 'short', bottom = L.bottom || 'trousers', bare = bottom === 'skirt' || bottom === 'shorts';
    const k = T / 0.47;
    const TP = [[0, 0.143 * w * (1 - fem * 0.1) + belly * 0.032, 0.1 * w + belly * 0.06, belly * 0.04],
      [0.13 * k, 0.148 * w * (1 - fem * 0.06) + belly * 0.042, 0.105 * w + belly * 0.07, belly * 0.05],
      [0.28 * k, chestRx + (L.pads || 0) * 0.5, 0.11 * w + fem * 0.024 + belly * 0.04, fem * 0.014 + belly * 0.026],
      [0.418 * k, shX * 0.92 + (L.pads || 0), 0.096 * w + belly * 0.014, -0.006], [T, nr * 1.75, nr * 1.4, -0.01]];
    const armY = 0.405 * k - 0.03;       // shoulder joint (the shoulder ring above it rounds over the sleeve cap)
    const tpAt = (y) => { let i = 0; while (i < TP.length - 2 && y > TP[i + 1][0]) i++; const a = TP[i], b = TP[i + 1], u = Math.min(1, Math.max(0, (y - a[0]) / (b[0] - a[0]))); return [y, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, a[3] + (b[3] - a[3]) * u]; };
    const tRing = (y, g = 0, a0 = Math.PI / 10, a1) => { const p = tpAt(y); return ring(10, y, p[1] + g, p[2] + g, p[3], 0, a0, a1 ?? a0 + TAU); };
    const fz = (y) => { const p = tpAt(y); return p[3] + p[2] * Math.cos(Math.PI / 10); };   // torso front plane z
    const sz = (x, y) => { const p = tpAt(y), u = Math.min(0.98, Math.abs(x) / p[1]); return p[3] + p[2] * Math.sqrt(1 - u * u); };   // torso surface z (outside the facets)

    // bones
    const parts = {};
    for (const n of PART) { parts[n] = new THREE.Bone(); parts[n].name = n; }
    const at = (n, par, x, y, z) => { parts[par].add(parts[n]); parts[n].position.set(x, y, z); };
    parts.hips.position.set(0, hipY, 0);
    at('torso', 'hips', 0, 0.06, 0); at('neck', 'torso', 0, T, 0); at('head', 'neck', 0, neckL, 0);
    for (const [sx, S] of [[1, 'L'], [-1, 'R']]) {
      at('arm' + S, 'torso', sx * shX, armY, 0); at('fore' + S, 'arm' + S, 0, -upper, 0); at('hand' + S, 'fore' + S, 0, -fore, 0);
      at('leg' + S, 'hips', sx * hipX, -0.03, 0); at('shin' + S, 'leg' + S, 0, -thigh, 0); at('foot' + S, 'shin' + S, 0, -shin, 0);
    }
    const body = new THREE.Group(); body.add(parts.hips); body.updateMatrixWorld(true);
    const torsoRings = TP.map((p) => tRing(p[0]));

    const geo = geoOf(() => {
      // torso: front strip (face 9) shows top2 for open jackets / v-necks; open collar shows skin at the throat
      // the waist seam (torso ring 0 / every hips-skinned ring at the waistline) is skinned half to hips, half to torso,
      // so the two sides stay welded however the torso bends or twists
      const tt = L.topTex ? [top, L.topTex] : top;
      const open = L.open, vneck = L.vneck, seamT = (p) => (p[1] < 0.002 ? [HIPS, 0.5] : null), seamH = (p) => (p[1] > 0.05 ? [TORSO, 0.5] : null);
      G.blend = seamT;
      loft(TORSO, torsoRings, (sg, i) => {
        if (i === 9 && sg === 3 && L.collar === 'open') return skin;
        if (i === 9 && (open || (vneck && sg >= 2))) return top2;
        if (vneck && sg === 3 && (i === 0 || i === 8)) return top2;
        return tt;
      }, { capB: false });
      G.blend = null;
      if (L.hivis) for (const y of [0.17 * k, 0.33 * k]) loft(TORSO, [tRing(y, 0.004), tRing(y + 0.03, 0.004)], '#d9dcd6', { capB: false, capT: false });
      G.blend = seamH;
      // pelvis
      const pel = [[-0.075, hipRx * 0.5, 0.075 * w, 0.005], [-0.045, hipRx * 0.96, 0.1 * w + belly * 0.03, 0.01 + belly * 0.012], [0.06, TP[0][1], TP[0][2], TP[0][3]]]
        .map(([y, rx, rz, zc]) => ring(10, y, rx, rz, zc, 0, Math.PI / 10));
      loft(HIPS, pel, (sg) => (sg === 1 && L.belt ? L.belt : bottom === 'skirt' ? legCol : bottom === 'jeans' ? [pants, 'denim'] : pants), { capT: false });
      G.blend = null;
      if (bottom === 'skirt' || L.coat) {       // skirt / coat hem around the hips (flares out)
        const len = bottom === 'skirt' ? (L.skirtLen ?? 0.5) : L.coat, g = bottom === 'skirt' ? 0.007 : 0.012, col = bottom === 'skirt' ? pants : top;
        const rtT = 0.086 * w * (L.thighs ?? 1) + belly * 0.006, mx = Math.max(hipRx + g + 0.012, (hipX + rtT) * 1.07 + g), mz = Math.max(0.108 * w + belly * 0.015 + g, rtT * 1.45 + g);   // clear the thighs
        const hem = [[-len, Math.max(hipRx + 0.03 + len * 0.12, mx + 0.01), Math.max(0.125 * w + belly * 0.02 + len * 0.1, mz + 0.01), 0.01], [-0.02, mx, mz, 0.01], [0.062, TP[0][1] + g, TP[0][2] + g, TP[0][3]]]
          .map(([y, rx, rz, zc]) => ring(10, y, rx, rz, zc, 0, Math.PI / 10));
        G.blend = (p) => (p[1] < -0.1 && p[2] > -0.03 ? [p[0] >= 0 ? LEGL : LEGR, Math.min(0.6, (-p[1] - 0.05) * 1.4) * Math.min(1, (p[2] + 0.03) * 12)] : seamH(p));
        loft(HIPS, hem, (sg, i) => (L.coat && L.open && i === 9 ? shade(top, 0.6) : L.coat && L.topTex ? [col, L.topTex] : col), { capB: false, capT: false });
        G.blend = null;
      }
      if (L.untuck) {                          // untucked shirt tail hanging straight over the waistband
        const u = L.untuck, g = 0.01;
        G.blend = seamH;
        loft(HIPS, [[-u, TP[0][1] + g, TP[0][2] + g, TP[0][3]], [0.062, TP[0][1] + g * 0.4, TP[0][2] + g * 0.4, TP[0][3]]]
          .map(([y, rx, rz, zc]) => ring(10, y, rx, rz, zc, 0, Math.PI / 10)), (sg, i) => top, { capB: false, capT: false });
        G.blend = null;
        loft(HIPS, [ring(10, -u + 0.002, TP[0][1] + g * 0.6, TP[0][2] + g * 0.6, TP[0][3], 0, Math.PI / 10), ring(10, -u + 0.03, TP[0][1] - 0.01, TP[0][2] - 0.01, TP[0][3], 0, Math.PI / 10)], shade(top, 0.6), { capB: false, capT: false, down: true });
      }
      if (L.apron) {
        G.blend = seamT;
        loft(TORSO, [tRing(0, 0.01, -0.8, 0.8), tRing(0.13 * k, 0.01, -0.74, 0.74), tRing(0.28 * k, 0.01, -0.62, 0.62), tRing(0.31 * k, 0.012, -0.6, 0.6)], L.apron);
        G.blend = (p) => (p[1] < -0.1 ? [p[0] >= 0 ? LEGL : LEGR, 0.6] : seamH(p));
        loft(HIPS, [ring(8, -0.45, hipRx + 0.07, 0.19 * w, 0.01, 0, -0.95, 0.95), ring(8, 0.062, TP[0][1] + 0.01, TP[0][2] + 0.01, TP[0][3], 0, -0.8, 0.8)], L.apron);
        G.blend = null;
      }
      G.blend = seamH;
      if (L.belt && bottom !== 'skirt') loft(HIPS, [ring(10, 0.035, TP[0][1] + 0.004, TP[0][2] + 0.004, TP[0][3], 0, Math.PI / 10), ring(10, 0.062, TP[0][1] + 0.004, TP[0][2] + 0.004, TP[0][3], 0, Math.PI / 10)], L.belt, { capB: false, capT: false });
      G.blend = null;
      // collar + placket + tie + buttons
      if (L.collar === 'polo' || L.collar === 'shirt' || L.collar === 'open') {
        const cc = L.collarCol || (L.collar === 'polo' ? top : top2), zt = TP[4][3] + TP[4][2], cr = (y, g) => ring(10, y, nr + g, nr * 0.95 + g, -0.004, 0, 0.55, TAU - 0.55);
        const pw = L.collar === 'polo' ? 1 : 0.6;
        loft(TORSO, [cr(T - 0.014, 0.01), cr(T + 0.026, 0.014)], shade(cc, 0.8));              // stand
        loft(TORSO, [cr(T + 0.026, 0.016), cr(T - 0.004, 0.016 + 0.02 * pw)], cc, { down: true });   // folded-over leaf
        for (const sx of [-1, 1]) {                                                               // collar points lying on the chest
          const p0 = [sx * 0.012, T + 0.01, zt + 0.006], p1 = [sx * (nr + 0.03 * pw), T - 0.004, sz(nr + 0.03 * pw, T - 0.004) + 0.012], p2 = [sx * 0.03, T - 0.035 - 0.04 * pw, sz(0.03, T - 0.035 - 0.04 * pw) + 0.01];
          if (sx > 0) tri(TORSO, p0, p2, p1, cc); else tri(TORSO, p0, p1, p2, cc);
        }
      }
      if (L.collar === 'polo') {
        const y0 = T - 0.035, y1 = T - 0.15, z0 = fz(y0) + 0.004, z1 = fz(y1) + 0.004;
        quad(TORSO, [-0.014, y1, z1], [0.014, y1, z1], [0.014, y0, z0], [-0.014, y0, z0], shade(top, 1.25));
        for (const y of [T - 0.07, T - 0.115]) box(TORSO, 0, y, fz(y) + 0.006, 0.008, 0.008, 0.004, shade(top, 0.6));
      }
      if (L.lapels) for (const sx of [-1, 1]) {     // notched lapels either side of the open front
        const P = (x, y, o = 0.008) => [sx * x, y, sz(x, y) + o], a = P(nr * 1.02, T - 0.008), b = P(nr + 0.062, 0.37 * k), c = P(nr + 0.03, 0.345 * k, 0.01), d = P(0.022, 0.2 * k, 0.006);
        const lc = shade(top, 1.22);
        if (sx > 0) { tri(TORSO, a, d, c, lc); tri(TORSO, a, c, b, lc); } else { tri(TORSO, a, c, d, lc); tri(TORSO, a, b, c, lc); }
      }
      if (L.tie) {
        const pts = [T - 0.045, 0.3 * k, 0.12 * k].map((y) => [y, fz(y) + 0.008]);
        box(TORSO, 0, T - 0.035, pts[0][1], 0.026, 0.022, 0.012, L.tie);
        quad(TORSO, [-0.02, pts[1][0], pts[1][1]], [0.02, pts[1][0], pts[1][1]], [0.009, pts[0][0], pts[0][1]], [-0.009, pts[0][0], pts[0][1]], L.tie);
        quad(TORSO, [0, pts[2][0] - 0.02, pts[2][1]], [0.024, pts[2][0], pts[2][1]], [0.02, pts[1][0], pts[1][1]], [-0.02, pts[1][0], pts[1][1]], L.tie);
        tri(TORSO, [0, pts[2][0] - 0.02, pts[2][1]], [-0.02, pts[1][0], pts[1][1]], [-0.024, pts[2][0], pts[2][1]], L.tie);
      }
      if (L.buttons) for (const y of [0.1, 0.2, 0.3].map((v) => v * k)) for (const sx of L.buttons === 2 ? [-1, 1] : [0]) box(TORSO, sx * 0.045, y, fz(y) + 0.006, 0.014, 0.014, 0.008, L.buttonCol || '#c9a23a');
      if (L.zip) quad(TORSO, [-0.005, 0.02, fz(0.02) + 0.004], [0.005, 0.02, fz(0.02) + 0.004], [0.005, T - 0.03, fz(T - 0.03) + 0.004], [-0.005, T - 0.03, fz(T - 0.03) + 0.004], L.zip);
      if (L.logo) quad(TORSO, ...onFace(torsoRings, 2, 0, 0.08, 0.9, 0.2, 0.72), '#ffffff', REG[L.logo]);
      // neck + hood
      loft(NECK, [ring(6, -0.03, nr, nr * 0.95, -0.004), ring(6, neckL + 0.035, nr * 0.92, nr * 0.9, 0.004)], L.neckCol || skin, { capB: false, capT: false });
      if (L.hood) loft(TORSO, [ring(8, T - 0.03, nr + 0.05, nr + 0.03, -0.035, 0, 1.4, TAU - 1.4), ring(8, T + 0.06, nr + 0.035, nr + 0.03, -0.045, 0, 1.4, TAU - 1.4)], L.hood);
      // arms
      for (const [sx, U, F, H] of [[1, ARML, FOREL, HANDL], [-1, ARMR, FORER, HANDR]]) {
        const a = Math.PI / 6, pads = (L.pads || 0) * 0.7;
        const up = sleeve === 'short' ? [[0.04, 0.6], [0.0, 1.03], [-0.13, 1.08], [-0.135, 0.86], [-upper, 0.8]]
          : sleeve === 'none' ? [[0.04, 0.6], [0.0, 1], [-upper, 0.8]] : [[0.045, 0.62 + pads * 8], [0.008, 1.03 + pads * 6], [-upper + 0.09, 0.93], [-upper, 0.88]];
        const sw2 = L.sleeveW ?? 1;
        // the cap leans in toward the collar so the shoulder line slopes into the sleeve instead of stepping out
        loft(U, up.map(([y, r], q) => ring(8, y, ar * r * (sleeve === 'none' ? 1 : sw2), ar * r * (sleeve === 'none' ? 1 : sw2), 0, q === 0 ? -sx * ar * 0.45 : q === 1 ? -sx * ar * 0.12 : 0, Math.PI / 8)), (sg, i) => {
          if (sleeve === 'short') return sg < 2 ? top : sg === 2 ? shade(top, 0.7) : skin;
          if (sleeve === 'none') return skin;
          return L.patches && sg === up.length - 2 && (i === 3 || i === 4) ? L.patches : L.topTex ? [top, L.topTex] : top;
        }, { down: true });
        const fa = sleeve === 'short' || sleeve === 'none' ? [[0.01, 0.8], [-0.07, 0.84], [-fore, 0.6]]
          : sleeve === 'rolled' ? [[0.01, 0.98], [-0.05, 1.12], [-0.085, 1.06], [-0.09, 0.74], [-fore, 0.6]]
          : [[0.01, 0.88], [-0.07, 0.9], [-fore + 0.035, 0.76], [-fore + 0.03, 0.66], [-fore, 0.6]];
        loft(F, fa.map(([y, r], q) => { const g = sleeve === 'rolled' ? (q < 3 ? sw2 : 1) : sleeve === 'long' ? (q < 3 ? sw2 : 1) : 1; return ring(6, y, ar * r * g, ar * r * g, 0, 0, a); }), (sg, i) => {
          if (sleeve === 'short' || sleeve === 'none') return skin;
          if (sleeve === 'rolled') return sg < 2 ? top : sg === 2 ? shade(top, 0.7) : skin;
          if (L.patches && sg === 0 && i === 2) return L.patches;
          return sg < 2 ? (L.topTex ? [top, L.topTex] : top) : sg === 2 ? shade(top, 0.7) : (L.cuff || skin);
        }, { down: true, capB: false });
        const hx = 0.021 * Math.sqrt(w) * (L.hands ?? 1), hz = 0.042 * Math.sqrt(w) * (L.hands ?? 1), hc = L.gloves || skin;
        loft(H, [[0.005, 0.9, 0.75], [-0.035, 1, 1.05], [-0.095, 0.9, 1.05], [-0.152, 0.7, 0.72]].map(([y, rx, rz]) => ring(6, y, hx * rx, hz * rz, 0, 0, 0)), hc, { down: true, capB: false });
        loft(H, [[-0.022, 0.012, 0.03], [-0.05, 0.011, 0.047], [-0.078, 0.008, 0.055]].map(([y, r, z]) => ring(4, y, r, r, z, 0, Math.PI / 4)), L.skin, { down: true, capB: false });
      }
      // legs
      for (const [sx, U, S, F] of [[1, LEGL, SHINL, FOOTL], [-1, LEGR, SHINR, FOOTR]]) {
        const a = Math.PI / 6, rt = 0.086 * w * (L.thighs ?? 1) + belly * 0.006, fade = L.fade || pants, fadeS = mix(pants, fade, 0.6);
        const th = bottom === 'shorts' ? [[0.035, 0.78], [0, 1.06], [-0.2 * legF, 1.03], [-0.205 * legF, 0.84], [-thigh, 0.64]]
          : bottom === 'jeans' ? [[0.035, 0.74], [0, 1], [-0.2 * legF, 0.92], [-thigh + 0.07, 0.72], [-thigh, 0.68]]
          : [[0.035, 0.74], [0, 1], [-0.2 * legF, 0.92], [-thigh, 0.68]];
        loft(U, th.map(([y, r]) => ring(6, y, rt * r, rt * r, 0, 0, a)), (sg, i) => {
          if (bottom === 'shorts') return sg < 2 ? pants : sg === 2 ? shade(pants, 0.7) : legCol;
          if (bottom === 'skirt') return legCol;
          if (bottom === 'jeans') return sg === 3 && (i === 5 || i === 0 || i === 4) ? [i === 5 ? fade : fadeS, 'knee_up'] : [pants, 'denim'];
          if (L.pleats && i === 5) return shade(pants, 0.8);
          return pants;
        }, { down: true, capB: false });
        const wel = L.shoes === 'welly';    // wellies: the shin below mid-calf is boot
        const sn = bare ? [[0, 0.62], [-0.12, 0.66], [-shin + 0.1, 0.46], [-shin + 0.02, 0.44], [-shin, 0.42]]
          : bottom === 'jeans' ? [[0, 0.7], [-0.14, 0.69], [-shin + 0.015, 0.68], [-shin, 0.44]] : [[0, 0.68], [-0.14, 0.67], [-shin + 0.015, 0.62], [-shin, 0.42]];
        loft(S, sn.map(([y, r]) => { const q = rt * r * (wel && y < -shin * 0.45 ? 1.25 : 1); return ring(6, y, q, q, 0, 0, a); }), (sg, i) => {
          if (wel && sg >= 1) return L.shoeCol;
          if (bare) return sg >= 2 && L.socks ? L.socks : legCol;
          if (bottom === 'jeans') return sg === 0 && (i === 5 || i === 0 || i === 4) ? [i === 5 ? fade : fadeS, 'knee_dn'] : [sg === 2 ? shade(pants, 0.75) : pants, 'denim'];
          if (L.pleats && i === 5) return shade(pants, 0.8);
          return sg === 2 ? shade(pants, 0.75) : pants;
        }, { down: true });
        // shoe
        const kind = L.shoes || 'shoe', sw = (L.feet ?? 1) * Math.sqrt(w), sc = L.shoeCol || '#222';
        const soleH = kind === 'sneaker' ? 0.024 : kind === 'thong' ? 0.012 : kind === 'boot' || kind === 'welly' ? 0.022 : 0.016;
        box(F, 0, -footH + soleH / 2, 0.058, 0.1 * sw, soleH, 0.28 * (L.feet ?? 1), L.soleCol || shade(sc, 0.6));
        const tall = kind === 'boot' || kind === 'welly' ? 0.02 : kind === 'thong' ? -0.012 : kind === 'loafer' || kind === 'shoe' ? -0.004 : 0;
        const up = [[-0.068, 0.045, 0.036 + tall, -0.034 + tall * 0.5], [0.03, 0.05, 0.034 + tall * 0.6, -0.036 + tall * 0.3], [0.13, 0.047, 0.024, -0.046], [0.186, 0.033, 0.014, -0.054]]
          .map(([z, rx, ry, yc]) => ringZ(6, z * (L.feet ?? 1), rx * sw, ry, yc - (0.08 - footH)));
        loft(F, up, (sg) => (kind === 'thong' ? skin : sg === 2 && L.toeCol ? L.toeCol : sc));
        if (kind === 'thong') box(F, 0, -footH + soleH + 0.004, 0.09, 0.07 * sw, 0.006, 0.012, L.soleCol || '#333');
      }
      hair(L, hs);
    }, PART.map((n) => parts[n].matrixWorld));

    if (!skinMat) { skinMat = atlasMat.clone(); skinMat.defaultAttributeValues = atlasMat.defaultAttributeValues; }
    const mesh = new THREE.SkinnedMesh(geo, skinMat);
    mesh.frustumCulled = false; mesh.name = 'body';
    body.add(mesh);
    body.updateMatrixWorld(true);
    mesh.bind(new THREE.Skeleton(PART.map((n) => parts[n])));
    body.scale.setScalar(s);
    const root = new THREE.Group(); root.name = id; root.add(body);

    // head + face
    const H = headGeo(L, hs), fk = faceKit(L, /^(student|customer)_/.test(id) ? 128 : 256);
    const head = new THREE.Mesh(H.g, matTex(fk.tex)); head.name = 'face'; parts.head.add(head);

    // attachments
    const attach = {};
    const att = (name, bone, fn, vis = true, pos, rot) => {
      const m = new THREE.Mesh(geoOf(fn), atlas()); m.name = name; m.visible = vis;
      if (pos) m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
      (bone.isObject3D ? bone : parts[bone]).add(m); attach[name] = m; return m;
    };
    for (const [n, S] of [['gripL', 'handL'], ['gripR', 'handR']]) { const g = new THREE.Object3D(); g.name = n; g.position.set(0, -0.085, 0); parts[S].add(g); attach[n] = g; }
    const has = (n) => L.attach && L.attach.includes(n);
    // hand-held props (hidden until content or an animation shows them)
    att('phone', attach.gripR, HELD.phone, false, [0, 0.02, 0.02], [0, 0, 0]);
    att('mug', attach.gripL, () => (L.mug === 'cup' ? HELD.cup() : HELD.mug(L)), L.mug === 'cup', [0, -0.02, 0.06], [Math.PI / 2, 0, 0]);
    att('textbook', attach.gripR, () => (L.book === 'newspaper' ? HELD.newspaper() : HELD.textbook(L)), false, [0.03, 0, 0.05], [0, 0, 0]);
    att('umbrella', attach.gripR, () => HELD.umbrella(L), false, [0, 0, 0.02], [Math.PI / 2, 0, 0]);
    if (has('brick')) att('brick', attach.gripR, HELD.brick, false, [0, 0.03, 0.02], [0, 0, 0]);
    if (has('stick')) att('stick', attach.gripR, HELD.stick, true, [0, 0, 0.02], [0.08, 0, 0]);
    if (has('handbag')) att('handbag', attach.gripL, () => HELD.handbag(L), true, [0, 0.03, 0], [0, 0, 0]);
    if (has('whistle')) att('whistle', attach.gripR, HELD.whistle, true, [0, 0.01, 0.03], [Math.PI / 2, 0, 0]);
    if (has('recorder')) att('recorder', attach.gripR, HELD.recorder, false, [0, 0, 0.03], [0, 0, 0]);
    // head-worn
    const HX = 0.095 * hs * hwOf(L);
    if (L.glasses) att('glasses', 'head', () => {
      glasses(L, hs, L.glasses);
      if (L.chain) for (const sx of [-1, 1]) wire(0, [[sx * HX * 0.99, 0.14 * hs, 0.02 * hs], [sx * HX * 0.93, 0.03 * hs, 0.03 * hs], [sx * 0.05 * hs, -0.07 * hs, 0.08 * hs], [0, -0.1 * hs, 0.1 * hs]], 0.004, '#d0b25c');
    }, true);
    // sunnies: pushed up onto the hair, or resting on the front of a cap
    if (L.sunnies) att('sunnies', 'head', () => glasses(L, hs, 'sun', 0.86), true, L.sunnies === 'cap' ? [0, 0.054 * hs, 0.046 * hs] : [0, 0.069 * hs, 0.01 * hs], [L.sunnies === 'cap' ? -0.3 : -0.25, 0, 0]);
    if (has('earbud')) att('earbud', 'head', () => { const ex = 0.0865 * hs * hwOf(L) + 0.01; box(0, ex, 0.12 * hs, -0.008 * hs, 0.015, 0.015, 0.016, '#f6f6f4'); box(0, ex + 0.001, 0.098 * hs, -0.004 * hs, 0.007, 0.03, 0.007, '#ececea', -0.2); }, true);
    if (has('pen')) att('pen', 'head', () => box(0, -(HX + 0.01), 0.15 * hs, -0.02 * hs, 0.007, 0.007, 0.13, '#2a4fa0', -0.35), true);
    if (has('goggles')) att('goggles', 'head', () => { loft(0, [ring(10, 0.12 * hs, HX + 0.008, 0.108 * hs, -0.002), ring(10, 0.15 * hs, HX + 0.008, 0.108 * hs, -0.002)], '#3a3a3a', { capB: false, capT: false }); box(0, 0, 0.136 * hs, 0.118 * hs, 0.13 * hs, 0.042 * hs, 0.022, '#9fc3cc'); }, false);
    if (has('headphones_head')) att('headphones', 'head', () => {
      for (let i = 0; i < 8; i++) { const a0 = -1.45 + 2.9 * i / 8, a1 = -1.45 + 2.9 * (i + 1) / 8, R = 0.125 * hs, y = 0.13 * hs;
        quad(0, [Math.sin(a0) * R, y + Math.cos(a0) * R, -0.012], [Math.sin(a1) * R, y + Math.cos(a1) * R, -0.012], [Math.sin(a1) * R, y + Math.cos(a1) * R, 0.012], [Math.sin(a0) * R, y + Math.cos(a0) * R, 0.012], '#2a2a2e'); }
      for (const sx of [-1, 1]) box(0, sx * (HX + 0.015), 0.12 * hs, -0.01, 0.03, 0.07 * hs, 0.065 * hs, '#2a2a2e');
    }, false);
    const cap = L.cap;
    if (cap) att('cap', 'head', () => {
      const cc = L.capCol || '#1b2340';
      if (cap === 'porter' || cap === 'chauffeur') {
        loft(0, [ring(10, 0.19 * hs, 0.1 * hs, 0.114 * hs, -0.004), ring(10, 0.225 * hs, 0.101 * hs, 0.115 * hs, -0.004), ring(10, 0.29 * hs, 0.112 * hs, 0.128 * hs, -0.01)], (sg) => (sg === 0 ? '#111' : cc));
        box(0, 0, 0.19 * hs, 0.125 * hs, 0.17 * hs, 0.012, 0.07 * hs, '#101010', -0.3);
        if (cap === 'porter') box(0, 0, 0.245 * hs, 0.126 * hs, 0.03, 0.03, 0.01, '#c9a23a');
      } else if (cap === 'flat') {
        loft(0, [ring(10, 0.19 * hs, 0.1 * hs, 0.114 * hs, 0.004), ring(10, 0.23 * hs, 0.104 * hs, 0.124 * hs, 0.012), ring(10, 0.25 * hs, 0.06 * hs, 0.08 * hs, 0.02)], cc);
        box(0, 0, 0.205 * hs, 0.12 * hs, 0.15 * hs, 0.012, 0.05 * hs, shade(cc, 0.8), -0.4);
      } else if (cap === 'beanie') {
        loft(0, [ring(10, 0.16 * hs, 0.1 * hs, 0.112 * hs), ring(10, 0.2 * hs, 0.1 * hs, 0.112 * hs), ring(10, 0.25 * hs, 0.085 * hs, 0.098 * hs), ring(10, 0.29 * hs, 0.03 * hs, 0.035 * hs)], (sg) => (sg === 0 ? shade(cc, 0.75) : cc));
      } else {
        loft(0, [ring(10, 0.175 * hs, 0.1 * hs, 0.112 * hs), ring(10, 0.235 * hs, 0.092 * hs, 0.103 * hs, -0.004), ring(10, 0.27 * hs, 0.05 * hs, 0.06 * hs, -0.01)], cc);
        box(0, 0, 0.18 * hs, 0.145 * hs, 0.15 * hs, 0.01, 0.1 * hs, shade(cc, 0.85), -0.12);
      }
    }, true);
    // torso / hips worn
    if (L.scarf) att('scarf', 'torso', () => {     // wrapped once round the neck, two striped ends hanging down the front
      const sc = L.scarf, z = (y, x) => sz(x, y) + 0.018;
      loft(0, [ring(10, T - 0.035, nr + 0.035, nr * 0.95 + 0.035, -0.004), ring(10, T + 0.035, nr + 0.03, nr * 0.95 + 0.03, -0.004)], sc[0], { capB: false, capT: false });
      for (const [sx, len] of [[1, 0.34], [-1, 0.28]]) {
        const n = 6, rs = [];
        for (let i = 0; i <= n; i++) { const y = T - 0.02 - len * i / n, xc = sx * (0.04 + 0.012 * i / n); rs.push(ring(4, y, 0.04, 0.011, z(y, Math.abs(xc)) + (sx > 0 ? 0.012 : 0), xc, Math.PI / 4)); }
        loft(0, rs, (sg) => sc[sg % sc.length], { down: true });
      }
    }, true);
    if (has('headphones_neck')) att('headphones', 'torso', () => {
      loft(0, [ring(10, T + 0.005, nr + 0.05, nr + 0.035, -0.005, 0, 1.7, TAU - 1.7), ring(10, T + 0.02, nr + 0.05, nr + 0.035, -0.005, 0, 1.7, TAU - 1.7)], '#9aa0a8');
      for (const sx of [-1, 1]) loft(0, [ringZ(8, 0.022, 0.034, 0.034, T - 0.004), ringZ(8, 0.05, 0.03, 0.03, T - 0.004)].map((r) => r.map((p) => [p[0] + sx * (nr + 0.034), p[1], p[2]])), '#e8742a');
    }, true);
    if (has('walkman')) att('walkman', 'hips', () => {     // clipped at the right hip, outside any jacket hem
      const wx = -((L.coat ? Math.max(hipRx + 0.036, TP[0][1] + 0.02) : hipRx) + 0.016);
      box(0, wx, 0.0, 0.035, 0.032, 0.12, 0.085, '#8797ab'); box(0, wx - 0.017, 0.025, 0.035, 0.004, 0.035, 0.055, '#34383e'); box(0, wx - 0.006, 0.065, 0.06, 0.016, 0.012, 0.016, '#e8742a');
      box(0, wx - 0.012, -0.03, 0.02, 0.006, 0.05, 0.03, '#b9c0c8');
    }, true);
    if (L.lanyard) {
      const g = att('lanyard', 'torso', () => {
        const lc = CONFIG.colors.lanyard, yb = 0.24 * k, R = nr + 0.036, Rz = nr * 0.95 + 0.036, a = 1.1;
        // strap: round the back of the collar, over the collar points, down the chest to the badge clip
        const pts = (sx) => [[sx * Math.sin(a) * R, T + 0.012, -0.004 + Math.cos(a) * Rz], [sx * nr * 0.9, T - 0.025, sz(nr * 0.9, T - 0.025) + 0.02],
          [sx * 0.042, 0.36 * k, sz(0.042, 0.36 * k) + 0.012], [sx * 0.008, yb + 0.01, Math.max(sz(0.008, yb), fz(yb - 0.08)) + 0.014]];
        for (const sx of [-1, 1]) {
          const p = pts(sx);
          const q = (P, s, i) => (i ? [P[0] + s * 0.009, P[1], P[2]] : [P[0], P[1] + s * 0.009, P[2]]);
          quad(0, q(p[0], -1, 0), q(p[1], -1, 0), q(p[1], 1, 0), q(p[0], 1, 0), lc); quad(0, q(p[0], 1, 0), q(p[1], 1, 0), q(p[1], -1, 0), q(p[0], -1, 0), lc);
          for (let i = 1; i < 3; i++) quad(0, q(p[i], -1, i), q(p[i + 1], -1, i), q(p[i + 1], 1, i), q(p[i], 1, i), lc);
        }
        loft(0, [ring(8, T + 0.004, R, Rz, -0.004, 0, a, TAU - a), ring(8, T + 0.02, R - 0.004, Rz - 0.004, -0.004, 0, a, TAU - a)], lc);
      }, L.lanyardOn !== false);
      const yb = 0.24 * k, zb = Math.max(fz(yb), fz(yb - 0.08)) + 0.016;
      const badge = new THREE.Mesh(geoOf(() => {
        box(0, 0, -0.004, 0, 0.014, 0.014, 0.008, '#b8bcc2');
        quad(0, [-0.036, -0.056, 0.001], [0.036, -0.056, 0.001], [0.036, -0.012, 0.001], [-0.036, -0.012, 0.001], '#ffffff', REG['badge_' + L.lanyard]);
        box(0, 0, -0.034, -0.003, 0.074, 0.046, 0.004, '#e8e8e4');
        box(0, 0, -0.066, 0, 0.01, 0.018, 0.006, '#aeb3b8'); box(0, 0, -0.078, 0, 0.004, 0.012, 0.004, '#aeb3b8');
      }), atlas());
      badge.position.set(0, yb + 0.01, zb); badge.name = 'badge'; g.add(badge); g.userData.badge = badge;
    }

    for (const n of L.hide || []) if (attach[n]) attach[n].visible = false;

    // ---- the rig object
    const P = PART.map((n) => parts[n]);
    const rest = { hips: parts.hips.position.clone(), armL: parts.armL.position.clone(), armR: parts.armR.position.clone() };
    const snap = new Float32Array(PART.length * 3 + 9);
    const d = { T, shX, upper, fore, thigh, shin, footH, hipY, neckL, hs, hipX, s, nr, chestZ: fz(0.28 * k), bellyZ: fz(0.13 * k),
      headC: T + neckL + 0.12 * hs, armY, armOut: L.armOut ?? (0.06 + belly * 0.1) };
    let cur = null, lastT = 0, shown = null, shownWas = false, savedExpr = null, blinkT = 1 + Math.random() * 3, blink = false, flapT = 0, fi = 0, talked = false;
    const FLAP = ['A', 'closed', 'O', 'A', 'closed', 'A', 'O', 'closed'];
    const lerpPos = (q, j, kk) => q.set(snap[j] + (q.x - snap[j]) * kk, snap[j + 1] + (q.y - snap[j + 1]) * kk, snap[j + 2] + (q.z - snap[j + 2]) * kk);
    const face = {
      canvas: fk.canvas, tex: fk.tex, expr: 'neutral', e: 'open', b: 'neutral', m: 'closed', tears: 0, over: null,
      redraw() { fk.draw(blink && face.e !== 'closed' ? 'closed' : face.e, face.b, face.over || face.m, face.tears); },
      set(name) { const x = EXPR[name] || EXPR.neutral; face.expr = EXPR[name] ? name : 'neutral'; face.e = x[0]; face.b = x[1]; face.m = x[2]; face.tears = x[3] || 0; face.redraw(); },
      eyes(e) { face.e = e; face.redraw(); }, brows(b) { face.b = b; face.redraw(); }, mouth(m) { face.m = m; face.redraw(); },
      flap() { face.over = FLAP[fi++ % FLAP.length]; face.redraw(); },
    };
    const rig = {
      id, look: L, root, body, mesh, parts, face, attach, d, height: L.h ?? 1.78, eye: (hipY + 0.06 + T + neckL + 0.134 * hs) * s,
      seated: false, talking: false, anim: null,
      talk(on) { rig.talking = !!on; },
      update(dt) {
        if ((blinkT -= dt) <= 0) { blink = !blink; blinkT = blink ? 0.12 : 2 + Math.random() * 4; face.redraw(); }
        if (rig.talking) { talked = true; if ((flapT -= dt) <= 0) { flapT = 0.07 + Math.random() * 0.06; face.flap(); } }
        else if (talked) { talked = false; face.over = null; face.redraw(); }
      },
      // pose(name, t, p): t = seconds since this animation started. Blends from the previous pose over 0.2 s.
      pose(name, t, p = EMPTY) {
        const A = ANIMS[(name === 'idle' && L.idle) || name] || ANIMS.idle;
        if (name !== cur || t < lastT - 1e-4) {
          for (let i = 0; i < P.length; i++) { const r = P[i].rotation; snap[i * 3] = r.x; snap[i * 3 + 1] = r.y; snap[i * 3 + 2] = r.z; }
          parts.hips.position.toArray(snap, 48); parts.armL.position.toArray(snap, 51); parts.armR.position.toArray(snap, 54);
          if (shown) { shown.visible = shownWas; shown = null; }
          if (savedExpr) { face.set(savedExpr); savedExpr = null; }
          if (face.over && !rig.talking) { face.over = null; face.redraw(); }
          const sh = typeof A.shows === 'function' ? A.shows(rig) : A.shows, a = sh && attach[sh];
          if (a) { shown = a; shownWas = a.visible; a.visible = true; }
          if (A.expr) { savedExpr = face.expr; face.set(A.expr); }
          cur = rig.anim = name;
        }
        lastT = t;
        for (let i = 0; i < P.length; i++) P[i].rotation.set(0, 0, 0);
        if (attach.lanyard) attach.lanyard.userData.badge.rotation.set(0, 0, 0);
        rig.lying = false;
        parts.hips.position.copy(rest.hips); parts.armL.position.copy(rest.armL); parts.armR.position.copy(rest.armR);
        if (A.upper) { if (p.sit || rig.seated) ANIMS.sit(rig, t, p); else if (p.walk) ANIMS.walk(rig, t, p); }
        A(rig, t, p);
        if (L.stoop && !rig.lying) { parts.torso.rotation.x += L.stoop; parts.neck.rotation.x -= L.stoop * 0.45; parts.head.rotation.x -= L.stoop * 0.35; }
        if (t < 0.2) {
          const kk = ease(t / 0.2);
          for (let i = 0; i < P.length; i++) { const r = P[i].rotation; r.set(snap[i * 3] + (r.x - snap[i * 3]) * kk, snap[i * 3 + 1] + (r.y - snap[i * 3 + 1]) * kk, snap[i * 3 + 2] + (r.z - snap[i * 3 + 2]) * kk); }
          lerpPos(parts.hips.position, 48, kk); lerpPos(parts.armL.position, 51, kk); lerpPos(parts.armR.position, 54, kk);
        }
      },
    };
    face.set(L.expr || 'neutral');
    rig.pose('idle', 1, EMPTY);
    return rig;
  };
})();

// ------------------------------------------------------------ LOOKS
// h height (m), w girth, sh shoulders, belly 0..1, head size, fem, stoop (rad). top/top2 (inner shirt shown by
// open/vneck), sleeve short|long|rolled|none, collar polo|shirt|open, bottom trousers|jeans|shorts|skirt,
// shoes sneaker|shoe|loafer|boot|welly|thong, coat = hem length below the waist. attach = extra attachments.
// Build extras: belly (can exceed 1), arms/thighs/hands/feet/neck/neckLen multipliers, untuck (shirt tail length),
// lapels, sleeveW (baggy sleeves), topTex tweed|knit (painted garment texture); jeans get painted denim + faded knees.
// Face: eyes (iris), brow, browW, lips, blush, freckles, age 0..1, tired, lids (heavy lids 0..1), lash, headW, jaw, nose,
// beard full|stubble, moustache (colour). hairStyle short|messy|slick|tidy|ponytail|bald|bun|set|big|long|bob|curly|mullet|crop|cap.
(() => {
  const polo = { top: CONFIG.colors.polo, sleeve: 'short', collar: 'polo', logo: 'yes_black' };
  const blue = { top: CONFIG.colors.chaseBlue, sleeve: 'short', collar: 'polo', logo: 'yes_blue' };
  Object.assign(LOOKS, {
    luka: { ...polo, h: 1.78, w: 1.3, sh: 1.08, belly: 1.25, head: 1.0, neck: 1.3, neckLen: 0.7, jaw: 1.12, arms: 1.28, thighs: 1.12, hands: 1.12, feet: 1.08, armOut: 0.2, untuck: 0.07,
      skin: '#dfae8c', hair: '#4b3121', hairStyle: 'ponytail', beard: 'full', beardCol: '#3d2819', brow: '#35231a', browW: 3.2, eyes: '#4a3222',
      pants: '#141519', shoes: 'sneaker', shoeCol: '#16171b', soleCol: '#f1f1ef', toeCol: '#f1f1ef', lanyard: 'LUKA' },
    chase: { ...blue, h: 1.8, w: 0.88, sh: 1, head: 1, headW: 0.95, jaw: 0.92, untuck: 0.05, thighs: 1.04, skin: '#ebba95', hair: '#5d3c22', hairStyle: 'messy', beard: 'stubble', beardCol: '#6a4a30',
      eyes: '#5d4a31', brow: '#4a301c', blush: 0.08, bottom: 'jeans', pants: '#46679d', fade: '#6282b4', shoes: 'sneaker', shoeCol: '#f3f3f1', soleCol: '#dcdcd8',
      lanyard: 'CHASE', lanyardOn: false, attach: ['earbud', 'goggles', 'headphones_head', 'recorder'] },
    rue19: { h: 1.82, w: 0.95, sh: 1.16, pads: 0.03, sleeveW: 1.22, skin: '#f0c7a9', hair: '#2a1d16', hairStyle: 'slick', eyes: '#4f6e8a', brow: '#23170f', lids: 0.12, jaw: 0.96,
      top: '#1e2a4d', top2: '#f2c6d0', open: true, lapels: true, sleeve: 'rolled', collar: 'shirt', collarCol: '#f2c6d0', coat: 0.27, pants: '#cdb88f', pleats: true, belt: '#3a2618',
      shoes: 'loafer', shoeCol: '#5a3320', scarf: ['#7a1f2b', '#e8d9b5'], attach: ['brick', 'walkman', 'headphones_neck'], expr: 'smug' },
    rue58: { lapels: true, h: 1.8, w: 1, sh: 1.02, skin: '#e8bea2', hair: '#c9ccd0', hairStyle: 'tidy', brow: '#a7a7a5', eyes: '#4f6e8a', age: 0.8, glasses: 'reading',
      top: '#1c2645', top2: '#f4f4f0', open: true, sleeve: 'long', cuff: '#f4f4f0', collar: 'open', coat: 0.16, pants: '#262b3a', shoes: 'shoe', shoeCol: '#1c1a18',
      attach: ['brick', 'walkman', 'headphones_neck'], hide: ['walkman', 'headphones'] },
    des: { h: 1.72, w: 1.08, belly: 0.5, skin: '#e0ad92', blush: 0.22, hair: '#9a9895', hairStyle: 'cap', moustache: '#8f8c88', brow: '#8a8784', browW: 3.8, eyes: '#5a4a3a', age: 0.9,
      cap: 'porter', capCol: '#1b2340', top: '#1d2644', top2: '#7a3b2e', vneck: true, sleeve: 'long', coat: 0.34, buttons: 2, pants: '#262a33', shoes: 'shoe', shoeCol: '#1a1816' },
    bernie: { topTex: 'knit', fem: true, h: 1.63, w: 1.02, belly: 0.3, skin: '#efc3a4', hair: '#7b5234', hairStyle: 'bun', brow: '#5a3a26', eyes: '#5a6b3a', lips: '#b0505a', blush: 0.15, age: 0.45, lash: true,
      glasses: 'reading', chain: true, top: '#3f6f63', top2: '#f0ead8', vneck: true, sleeve: 'long', apron: '#f1ece0', bottom: 'skirt', pants: '#4a4540', skirtLen: 0.52, legCol: '#b99b85', shoes: 'shoe', shoeCol: '#2a2220' },
    declan: { coat: 0.12, h: 1.75, w: 0.88, skin: '#f2cfb6', freckles: true, hair: '#7a5230', hairStyle: 'messy', eyes: '#5a7a5a', brow: '#5d3d22', glasses: 'thick',
      top: '#5f7d56', hood: '#56724e', zip: '#2a2a2a', sleeve: 'long', pants: '#6b5236', shoes: 'sneaker', shoeCol: '#8b8b8b', soleCol: '#e0e0e0', attach: ['pen'] },
    declan58: { topTex: 'knit', h: 1.74, w: 0.95, belly: 0.3, skin: '#eec7ae', hair: '#a9a9a6', hairStyle: 'short', eyes: '#5a7a5a', brow: '#8e8e8a', age: 0.75, glasses: 'thick',
      top: '#7d6f5e', top2: '#dfe6ee', vneck: true, sleeve: 'long', collar: 'shirt', collarCol: '#dfe6ee', pants: '#4a4a52', shoes: 'shoe', shoeCol: '#2a2622' },
    hartigan: { topTex: 'tweed', lapels: true, h: 1.76, w: 1.02, belly: 0.35, skin: '#eab99d', hair: '#b8b4ae', hairStyle: 'bald', brow: '#a09c96', browW: 3.4, eyes: '#5b5a4a', age: 0.9, lids: 0.35, glasses: 'reading',
      top: '#7b6448', patches: '#4d3a2a', top2: '#e6e3da', vneck: true, sleeve: 'long', collar: 'shirt', tie: '#6b2330', pants: '#5d5a55', shoes: 'shoe', shoeCol: '#4a3020' },
    margaret: { topTex: 'knit', fem: true, h: 1.55, w: 0.95, stoop: 0.18, armOut: 0.1, skin: '#f0cfbb', blush: 0.25, hair: '#efece6', hairStyle: 'set', brow: '#cfcac2', lips: '#c07080', eyes: '#6a8aa0', age: 1, lash: true,
      top: '#b9a3d6', top2: '#f5eef2', vneck: true, sleeve: 'long', bottom: 'skirt', pants: '#7d7788', skirtLen: 0.55, legCol: '#d9c0b0', shoes: 'shoe', shoeCol: '#3b2e2a',
      attach: ['stick', 'handbag'], bagCol: '#5b3b58' },
    dazza: { h: 1.8, w: 1.2, belly: 0.6, arms: 1.15, skin: '#c98a5f', hair: '#6b4a2e', hairStyle: 'crop', beard: 'stubble', beardCol: '#5a3a22', eyes: '#4a5a3a', brow: '#4a2e1a',
      top: '#ff7b1c', hivis: true, sleeve: 'short', collar: 'polo', bottom: 'shorts', pants: '#3e4450', socks: '#c9c4b8', shoes: 'boot', shoeCol: '#8a5a2b', toeCol: '#9aa0a6',
      cap: 'cap', capCol: '#2c3440', sunnies: 'cap' },
    luke: { ...polo, h: 1.83, w: 1.02, skin: '#e9bb9b', hair: '#8a6440', hairStyle: 'short', eyes: '#5a6f8a', brow: '#6a4a30', tired: true, lids: 0.2,
      pants: '#2b2d33', shoes: 'shoe', shoeCol: '#1a1a1a', lanyard: 'LUKE', mug: 'cup', idle: 'carry_mug' },
    jordan: { expr: 'talk', ...blue, h: 1.72, w: 0.92, skin: '#8d5b3c', hair: '#1d1512', hairStyle: 'curly', eyes: '#3a2618', brow: '#1d1512', blush: 0.1,
      pants: '#c8b58f', shoes: 'sneaker', shoeCol: '#f3f3f1', soleCol: '#dcdcd8', lanyard: 'JORDAN' },
    siobhan: { topTex: 'knit', fem: true, h: 1.66, w: 0.92, skin: '#f2cfb8', freckles: true, hair: '#9c4a22', hairStyle: 'big', lips: '#b85a5a', lash: true, eyes: '#4f7a4a', brow: '#7a3a1a',
      top: '#e6dcc3', sleeve: 'long', bottom: 'jeans', pants: '#3f5a8a', fade: '#6a84ad', shoes: 'boot', shoeCol: '#2a1d1a', soleCol: '#c8b890' },
    ronan: { topTex: 'tweed', h: 1.9, w: 0.86, leg: 1.05, skin: '#efcfb8', lids: 0.45, hair: '#2b211c', hairStyle: 'messy', eyes: '#4a4a3a', brow: '#2b211c',
      top: '#b08a52', hood: '#a07c48', sleeve: 'long', coat: 0.35, buttons: 1, buttonCol: '#5a3a22', scarf: ['#2d4a2d', '#d8c89a'], pants: '#3a3f4a', shoes: 'shoe', shoeCol: '#3b2a20' },
    fiachra: { h: 1.74, w: 0.92, skin: '#eec3a6', hair: '#6a4a2a', hairStyle: 'long', beard: 'stubble', beardCol: '#5a3a22', eyes: '#4f6e8a', brow: '#5a3a22',
      cap: 'beanie', capCol: '#b0302a', top: '#4d6a93', top2: '#e0d9c5', open: true, sleeve: 'long', collar: 'shirt', collarCol: '#4d6a93', pants: '#7a4f2a', shoes: 'boot', shoeCol: '#3a2a1e',
      attach: ['whistle'], idle: 'whistle' },
    mick: { topTex: 'knit', h: 1.78, w: 1.18, belly: 0.5, skin: '#dba486', blush: 0.3, age: 0.6, beard: 'stubble', beardCol: '#8a8580', hair: '#8a8580', hairStyle: 'cap', eyes: '#5a6a7a', brow: '#7a7570',
      cap: 'flat', capCol: '#6d6250', top: '#3e5a3a', zip: '#2a2a2a', sleeve: 'long', pants: '#4a4636', shoes: 'welly', shoeCol: '#1f2a1f' },
    nuala: { fem: true, h: 1.7, w: 0.94, skin: '#f0d0bc', hair: '#2a1d18', hairStyle: 'bob', lips: '#9a3c48', lash: true, eyes: '#4a5a6a', brow: '#2a1d18', glasses: 'round',
      top: '#b5892e', top2: '#e8e0d0', open: true, sleeve: 'long', coat: 0.5, buttons: 1, buttonCol: '#3a2a1a', bottom: 'skirt', pants: '#4a2a3a', skirtLen: 0.58, legCol: '#5a4a44', shoes: 'shoe', shoeCol: '#2a1d18' },
    driver: { lapels: true, h: 1.8, w: 1.05, skin: '#d9a784', hair: '#2a2a2a', hairStyle: 'crop', eyes: '#3a2a1a', brow: '#222',
      top: '#1b1c20', top2: '#f2f2f0', open: true, sleeve: 'long', cuff: '#f2f2f0', collar: 'shirt', collarCol: '#f2f2f0', tie: '#1b1c20', coat: 0.16, pants: '#1b1c20', shoes: 'shoe', shoeCol: '#111' },
    young_dev: { h: 1.76, w: 0.9, skin: '#c68e6a', hair: '#1e1612', hairStyle: 'messy', eyes: '#2a1a12', brow: '#1e1612', glasses: 'thick',
      top: '#6b6f78', hood: '#62666e', sleeve: 'long', bottom: 'jeans', pants: '#2f3d5a', fade: '#3f5070', shoes: 'sneaker', shoeCol: '#e8e8e8', soleCol: '#cfcfcf' },
    grandson: { h: 1.74, w: 0.86, head: 1.03, skin: '#e9bb98', blush: 0.12, hair: '#8a6440', hairStyle: 'messy', eyes: '#5a6f8a', brow: '#6a4a30',
      top: '#7a2033', sleeve: 'short', bottom: 'shorts', pants: '#2f343c', shoes: 'sneaker', shoeCol: '#f0f0f0', soleCol: '#d0d0d0' },
    finalist: { lapels: true, h: 1.8, w: 1, skin: '#f0caa9', hair: '#d8b870', hairStyle: 'slick', eyes: '#4f6e8a', brow: '#b89850', expr: 'smug',
      top: '#5d6068', top2: '#f0f0f0', vneck: true, sleeve: 'long', cuff: '#f0f0f0', collar: 'shirt', collarCol: '#f0f0f0', tie: '#8a1f2a', buttons: 2, coat: 0.18, pants: '#5d6068', shoes: 'loafer', shoeCol: '#6a3a1e' },
    // 1987 extras: knitwear, duffle coats, scarves, big hair
    student_a: { topTex: 'knit', fem: true, h: 1.65, w: 0.92, skin: '#f2d0ba', hair: '#5a3a22', hairStyle: 'big', lips: '#a8505a', lash: true, top: '#7a1f33', sleeve: 'long', bottom: 'jeans', pants: '#6a86ad', fade: '#8aa2c4', shoes: 'boot', shoeCol: '#2a1d1a' },
    student_b: { topTex: 'tweed', h: 1.8, w: 0.95, skin: '#efc6aa', hair: '#3a2a1e', hairStyle: 'mullet', top: '#1f2c4a', hood: '#1b2742', sleeve: 'long', coat: 0.33, buttons: 1, buttonCol: '#c8b890', scarf: ['#a88a2a', '#1f3050'], pants: '#5a4a36', shoes: 'boot', shoeCol: '#2a1d1a' },
    student_c: { topTex: 'knit', fem: true, h: 1.68, w: 0.9, skin: '#f4d6c2', hair: '#c8a060', hairStyle: 'long', lips: '#b86a6a', lash: true, top: '#c69a2e', sleeve: 'long', bottom: 'skirt', pants: '#3a3a44', skirtLen: 0.5, legCol: '#2a2a30', shoes: 'shoe', shoeCol: '#1a1a1a' },
    student_d: { topTex: 'knit', h: 1.77, w: 0.92, skin: '#eec4a6', hair: '#2a1e16', hairStyle: 'short', glasses: 'thick', top: '#e3d8bd', sleeve: 'long', pants: '#4a4a52', shoes: 'shoe', shoeCol: '#3a2a20' },
    student_e: { topTex: 'tweed', fem: true, h: 1.62, w: 0.95, skin: '#f0cdb6', hair: '#1a1412', hairStyle: 'bob', lips: '#9a3c48', lash: true, top: '#b08a52', sleeve: 'long', coat: 0.35, buttons: 1, buttonCol: '#5a3a22', scarf: ['#7a1f2b', '#e8d9b5'], bottom: 'jeans', pants: '#3f5a8a', shoes: 'boot', shoeCol: '#3a2a20' },
    student_f: { topTex: 'knit', h: 1.84, w: 0.9, skin: '#f0c9ad', freckles: true, hair: '#6a4028', hairStyle: 'curly', top: '#3f6a3f', sleeve: 'long', bottom: 'jeans', pants: '#4f6a95', shoes: 'sneaker', shoeCol: '#dcdcdc', soleCol: '#bbb' },
    student_g: { fem: true, h: 1.7, w: 0.93, skin: '#8a5a3c', hair: '#2a1a12', hairStyle: 'curly', lips: '#7a3a3a', lash: true, top: '#4d6a93', top2: '#e8d8c0', open: true, sleeve: 'long', bottom: 'skirt', pants: '#6a3a5a', skirtLen: 0.6, legCol: '#3a2a2a', shoes: 'boot', shoeCol: '#2a1d1a' },
    student_h: { h: 1.79, w: 0.95, skin: '#ebc0a0', hair: '#1a1a1a', hairStyle: 'slick', top: '#2a2420', zip: '#777', sleeve: 'long', collar: 'shirt', collarCol: '#2a2420', bottom: 'jeans', pants: '#2a2a30', fade: '#3a3a42', shoes: 'boot', shoeCol: '#1a1414', soleCol: '#c8b890' },
    // 2026 Redcliffe customers: shorts, thongs, sunnies on heads
    customer_a: { h: 1.79, w: 1.08, belly: 0.4, skin: '#d59a70', hair: '#6a4a2e', hairStyle: 'crop', beard: 'stubble', top: '#2f6fb0', sleeve: 'none', bottom: 'shorts', pants: '#c8b58f', shoes: 'thong', shoeCol: '#1a1a1a', soleCol: '#1a1a1a', sunnies: 'head' },
    customer_b: { fem: true, h: 1.66, w: 0.94, skin: '#e8b48e', hair: '#c8a060', hairStyle: 'long', lips: '#c0606a', lash: true, top: '#f07a8a', sleeve: 'none', bottom: 'skirt', pants: '#f07a8a', skirtLen: 0.42, shoes: 'thong', shoeCol: '#e8d8b0', soleCol: '#e8d8b0', sunnies: 'head' },
    customer_c: { h: 1.74, w: 1.05, belly: 0.5, skin: '#e0a888', age: 0.7, beard: 'stubble', beardCol: '#a0a0a0', hair: '#b0b0b0', hairStyle: 'cap', top: '#e8e0cc', sleeve: 'short', collar: 'polo', bottom: 'shorts', pants: '#5a6a50', shoes: 'sneaker', shoeCol: '#f0f0f0', soleCol: '#ccc', cap: 'cap', capCol: '#e4e4e0' },
    customer_d: { h: 1.7, w: 0.86, head: 1.03, skin: '#b87a55', hair: '#3a2616', hairStyle: 'messy', top: '#2a2a2a', sleeve: 'short', bottom: 'shorts', pants: '#3a4a6a', shoes: 'sneaker', shoeCol: '#f0f0f0', soleCol: '#ccc' },
  });
})();

// ------------------------------------------------------------ ANIMS
// ANIMS[name](rig, t, p): writes rotations (and hips/shoulder offsets) into rig.parts; no allocation.
// rig.pose() resets to rest first, then blends. Flags: .upper (arms/head only: keeps a seated lower body when
// rig.seated or p.sit, walking legs with p.walk), .shows (attachment made visible while playing), .expr.
// One-shots read p.dur. Useful p: speed (walk/run/pedal), h (seat/saddle height m), yaw (glance), still (lanyard).
Object.assign(ANIMS, (() => {
  const S = Math.sin, C = Math.cos, PI = Math.PI, abs = Math.abs, max = Math.max, min = Math.min;
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v), ez = (x) => x * x * (3 - 2 * x);
  const _d = new THREE.Vector3(), _u = new THREE.Vector3(), _p = new THREE.Vector3(), _x = new THREE.Vector3(), _z = new THREE.Vector3(), _m = new THREE.Matrix4();
  // two-bone IK: aim `up` so the end of `lo` lands on (tx,ty,tz) in up's parent space; pole = elbow/knee hint
  function ik(up, lo, tx, ty, tz, a, b, px, py, pz, knee) {
    const o = up.position;
    _d.set(tx - o.x, ty - o.y, tz - o.z);
    const dist = cl(_d.length(), abs(a - b) + 0.01, (a + b) * 0.998);
    _d.normalize();
    const al = Math.acos(cl((a * a + dist * dist - b * b) / (2 * a * dist), -1, 1));
    const bend = PI - Math.acos(cl((a * a + b * b - dist * dist) / (2 * a * b), -1, 1));
    _p.set(px, py, pz).addScaledVector(_d, -_p.dot(_d)).normalize();
    _u.copy(_d).multiplyScalar(C(al)).addScaledVector(_p, S(al));
    _z.copy(_d).addScaledVector(_u, -_d.dot(_u)).normalize();
    if (knee) _z.negate();
    _u.negate();                                   // bone +Y points back up the limb
    _x.crossVectors(_u, _z);
    up.rotation.setFromRotationMatrix(_m.makeBasis(_x, _u, _z));
    lo.rotation.set(knee ? bend : -bend, 0, 0);
  }
  // arm target in torso space (sd +1 = left). Default pole: elbow down, back, out.
  const arm = (r, sd, x, y, z, px = 0.5, py = -1, pz = -0.4) => ik(sd > 0 ? r.parts.armL : r.parts.armR, sd > 0 ? r.parts.foreL : r.parts.foreR, sd * x, y, z, r.d.upper, r.d.fore, sd * px, py, pz, false);
  // ankle target in hips space
  const leg = (r, sd, x, y, z, pz = 1) => ik(sd > 0 ? r.parts.legL : r.parts.legR, sd > 0 ? r.parts.shinL : r.parts.shinR, sd * x, y, z, r.d.thigh, r.d.shin, 0, 0.3, pz, true);
  const flat = (r) => { const P = r.parts; P.footL.rotation.x = -(P.legL.rotation.x + P.shinL.rotation.x); P.footR.rotation.x = -(P.legR.rotation.x + P.shinR.rotation.x); };
  function hang(r, t = 0) {
    const P = r.parts, o = r.d.armOut, sw = 0.03 * S(t * 1.1);
    P.armL.rotation.set(sw, 0, o); P.armR.rotation.set(-sw, 0, -o); P.foreL.rotation.x = -0.14; P.foreR.rotation.x = -0.14;
  }
  const breathe = (r, t, a = 1) => { r.parts.torso.rotation.x += 0.018 * S(t * 1.6) * a; r.parts.head.rotation.x -= 0.012 * S(t * 1.6) * a; };
  const base = (r, t) => { if (!r.seated) hang(r, t); breathe(r, t); };
  const once = (t, p, def) => cl(t / (p.dur || def), 0, 1);
  const hipsY = (r, m) => m / r.d.s;              // world metres -> body units
  const gait = (r, t, sp, legA, knee, armA, fore, bob, lean) => {
    const P = r.parts, st = r.look.bottom === 'skirt' ? 0.7 : r.look.stoop ? 0.75 : 1, w = t * sp, s = S(w), c = C(w);
    r.seated = false;
    P.legL.rotation.x = -legA * s * st; P.legR.rotation.x = legA * s * st;
    P.shinL.rotation.x = 0.08 + knee * max(0, c) * st; P.shinR.rotation.x = 0.08 + knee * max(0, -c) * st;
    P.footL.rotation.x = -0.25 * max(0, -s) * st + 0.15 * max(0, c); P.footR.rotation.x = -0.25 * max(0, s) * st + 0.15 * max(0, -c);
    P.armL.rotation.set(armA * s, 0, r.d.armOut); P.armR.rotation.set(-armA * s, 0, -r.d.armOut);
    P.foreL.rotation.x = fore - 0.2 * max(0, -s); P.foreR.rotation.x = fore - 0.2 * max(0, s);
    P.hips.position.y += bob * C(2 * w) - bob; P.hips.rotation.y = 0.08 * s; P.torso.rotation.set(lean, -0.13 * s, 0); P.head.rotation.y = 0.06 * s;
    return s;
  };
  function sit(r, t, p) {
    const P = r.parts, d = r.d, hy = hipsY(r, p.h ?? 0.46) + 0.12;
    r.seated = true;
    P.hips.position.y = hy;
    leg(r, 1, d.hipX * 1.15, d.footH - hy + 0.03, 0.4); leg(r, -1, d.hipX * 1.15, d.footH - hy + 0.03, 0.4); flat(r);
    arm(r, 1, d.shX * 0.72, 0.0, 0.3, 1, -0.2, -1); arm(r, -1, d.shX * 0.72, 0.0, 0.3, 1, -0.2, -1);
    P.handL.rotation.x = 0.5; P.handR.rotation.x = 0.5;
    P.torso.rotation.x = 0.04; breathe(r, t);
  }
  const A = {
    idle(r, t) { base(r, t); if (!r.seated) r.parts.hips.rotation.z = 0.012 * S(t * 0.6); r.parts.head.rotation.y = 0.06 * S(t * 0.37); },
    walk(r, t, p) { gait(r, t, 7.2 * (p.speed || 1), 0.46, 0.8, 0.38, -0.25, 0.018, 0.04); },
    run(r, t, p) { gait(r, t, 10.5 * (p.speed || 1), 0.8, 1.35, 0.75, -1.3, 0.03, 0.18); },
    carry(r, t, p) {
      gait(r, t, 5.6 * (p.speed || 1), 0.32, 0.5, 0, -0.2, 0.012, -0.04);
      const d = r.d; arm(r, 1, 0.16, 0.26, d.chestZ + 0.22, 1, -1, -0.6); arm(r, -1, 0.16, 0.26, d.chestZ + 0.22, 1, -1, -0.6);
    },
    swagger(r, t, p) {
      const P = r.parts, s = gait(r, t, 6.2 * (p.speed || 1), 0.5, 0.75, 0.55, -0.35, 0.026, -0.02);
      P.hips.rotation.y = 0.16 * s; P.hips.rotation.z = 0.04 * s; P.torso.rotation.y = -0.3 * s; P.torso.rotation.z = 0.05 * s;
      P.armL.rotation.z += 0.22; P.armR.rotation.z -= 0.22; P.head.rotation.x = -0.14; P.neck.rotation.x = -0.05; P.head.rotation.y = 0.12 * s;
    },
    sit,
    stand(r, t, p) {
      const P = r.parts, d = r.d, k = ez(once(t, p, 1)), hy0 = hipsY(r, p.h ?? 0.46) + 0.12, hy = hy0 + (d.hipY - hy0) * k;
      r.seated = false;
      P.hips.position.y = hy;
      const fz = 0.4 * (1 - k); leg(r, 1, d.hipX * 1.15, d.footH - hy + 0.03 * (1 - k), fz); leg(r, -1, d.hipX * 1.15, d.footH - hy + 0.03 * (1 - k), fz); flat(r);
      P.torso.rotation.x = 0.55 * S(k * PI) + 0.04 * (1 - k);
      if (k < 0.5) { arm(r, 1, d.shX * 0.72, 0.0, 0.3, 1, -0.2, -1); arm(r, -1, d.shX * 0.72, 0.0, 0.3, 1, -0.2, -1); } else hang(r);
    },
    lie(r, t) {
      const P = r.parts; r.seated = false; r.lying = true;
      P.hips.rotation.x = -PI / 2; P.hips.position.y = 0.13;
      P.armL.rotation.set(0, 0, 0.18); P.armR.rotation.set(0, 0, -0.18); P.foreL.rotation.x = -0.1; P.foreR.rotation.x = -0.1;
      P.footL.rotation.z = 0.35; P.footR.rotation.z = -0.35; P.head.rotation.x = -0.1; P.torso.rotation.x = 0.012 * S(t * 1.4);
    },
    lie_tangled(r, t) {
      const P = r.parts; r.seated = false; r.lying = true;
      P.hips.rotation.set(-PI / 2 + 0.08, 0, 0.3); P.hips.position.y = 0.15;
      P.torso.rotation.set(0.012 * S(t * 1.2), -0.25, 0.12);
      P.legL.rotation.set(-1.1, 0, 0.25); P.shinL.rotation.x = 1.7; P.footL.rotation.x = -0.3;
      P.legR.rotation.set(-0.12, 0, -0.45); P.shinR.rotation.x = 0.25; P.footR.rotation.z = -0.4;
      P.armL.rotation.set(0.25, 0, 2.6 + 0.05 * S(t * 0.7)); P.foreL.rotation.x = -0.35;
      P.armR.rotation.set(0.2, 0, -1.0); P.foreR.rotation.x = -0.25 - 0.1 * max(0, S(t * 1.3));
      P.head.rotation.set(0.12 + 0.08 * max(0, S(t * 0.8)), 0.55, 0.1);
    },
    turn(r, t) {
      const P = r.parts, w = t * 9; r.seated = false; hang(r, t);
      P.legL.rotation.x = -0.28 * max(0, S(w)); P.shinL.rotation.x = 0.55 * max(0, S(w));
      P.legR.rotation.x = -0.28 * max(0, -S(w)); P.shinR.rotation.x = 0.55 * max(0, -S(w));
      P.hips.position.y += 0.01 * abs(S(w)) - 0.01;
    },
    point(r, t) {
      const P = r.parts, d = r.d; base(r, t);
      arm(r, -1, d.shX * 0.8, d.armY + 0.04, 0.62 + 0.02 * S(t * 5), 1, -0.4, -0.3);
      P.torso.rotation.y = -0.12; P.head.rotation.y = -0.08; P.handR.rotation.x = -0.15;
    },
    phone(r, t) {
      const P = r.parts, d = r.d; base(r, t);
      arm(r, -1, 0.1 * d.hs, d.headC - 0.17, 0.07, 0.5, -1, 0.3);
      P.handR.rotation.set(0.25, 0, 0.15); P.head.rotation.z = 0.12; P.head.rotation.x = 0.04 * S(t * 0.8);
    },
    type(r, t) {
      const P = r.parts, d = r.d, y = r.seated ? 0.2 : -0.02; breathe(r, t);
      arm(r, 1, 0.1, y + 0.01 * max(0, S(t * 13)), 0.36, 1, -0.6, -0.6); arm(r, -1, 0.1, y + 0.01 * max(0, S(t * 13 + 2)), 0.36, 1, -0.6, -0.6);
      P.handL.rotation.x = 0.35; P.handR.rotation.x = 0.35; P.head.rotation.x = 0.18; P.torso.rotation.x += 0.08;
    },
    pedal(r, t, p) {
      const P = r.parts, d = r.d, hy = hipsY(r, p.h ?? 0.84) + 0.1, R = 0.17 / d.s, cy = hipsY(r, 0.33) - hy, cz = 0.24;
      const th = t * 6.5 * (p.speed ?? 1);
      r.seated = false;
      P.hips.position.y = hy; P.hips.position.z = -0.05;
      leg(r, 1, d.hipX, cy + R * S(th), cz + R * C(th)); leg(r, -1, d.hipX, cy + R * S(th + PI), cz + R * C(th + PI)); flat(r);
      P.footL.rotation.x += 0.2 * S(th); P.footR.rotation.x += 0.2 * S(th + PI);
      P.torso.rotation.x = 0.32 + 0.02 * S(th * 2);
      arm(r, 1, 0.2, d.T * 0.55, 0.42, 1, -0.6, -0.4); arm(r, -1, 0.2, d.T * 0.55, 0.42, 1, -0.6, -0.4);
      P.head.rotation.x = -0.25;
    },
    pull(r, t) {
      const P = r.parts, d = r.d, y = d.footH - (d.hipY - 0.08) + 0.02, yank = max(0, S(t * 5));
      r.seated = false;
      P.hips.position.y -= 0.08; P.hips.position.z -= 0.05 * yank;
      leg(r, 1, d.hipX, y, 0.28); leg(r, -1, d.hipX, y, -0.3); flat(r);
      P.torso.rotation.x = -0.28 - 0.14 * yank;
      arm(r, 1, 0.06, d.armY - 0.06, 0.52, 1, -1, -0.2); arm(r, -1, 0.06, d.armY - 0.06, 0.52, 1, -1, -0.2);
      P.head.rotation.x = 0.25; P.handL.rotation.x = 0.4; P.handR.rotation.x = 0.4;
    },
    hands_head(r, t) {
      const P = r.parts, d = r.d; breathe(r, t);
      arm(r, 1, 0.1 * d.hs, d.headC + 0.1 * d.hs, -0.02, 1, 0.2, -0.3); arm(r, -1, 0.1 * d.hs, d.headC + 0.1 * d.hs, -0.02, 1, 0.2, -0.3);
      P.handL.rotation.set(0, 0, 1.2); P.handR.rotation.set(0, 0, -1.2);
      P.head.rotation.x = -0.06 + 0.03 * S(t * 0.7); P.torso.rotation.y = 0.05 * S(t * 0.5);
    },
    head_hands(r, t) {
      const P = r.parts, d = r.d, lean = r.seated ? 0.5 : 0.3;
      P.torso.rotation.x = lean + 0.02 * S(t * 1.3); P.neck.rotation.x = 0.25; P.head.rotation.x = 0.35;
      const hy = d.T + (d.neckL + 0.12 * d.hs) * C(0.6), hz = (d.neckL + 0.12 * d.hs) * S(0.6) + 0.02;
      arm(r, 1, 0.088 * d.hs, hy - 0.05, hz + 0.03, 0.6, -0.5, 1); arm(r, -1, 0.088 * d.hs, hy - 0.05, hz + 0.03, 0.6, -0.5, 1);
      P.handL.rotation.set(-0.2, 0, -0.35); P.handR.rotation.set(-0.2, 0, 0.35);
    },
    lanyard(r, t, p) {
      const P = r.parts, d = r.d, k = d.T / 0.47, z = max(d.chestZ, d.bellyZ) + 0.07, click = max(0, S(t * 2.6)) ** 8;
      base(r, t); r.parts.torso.rotation.x += 0.04;
      arm(r, -1, 0.02 - 0.02 * click, 0.16 * k, z + 0.04, 1, -1, -0.2);
      if (!r.seated) arm(r, 1, d.shX * 0.9 - 0.12 * click, 0.02 + 0.1 * click, 0.08 + 0.06 * click, 1, -1, -0.4);
      P.handR.rotation.set(-0.9, p.still ? 0 : 0.5 * S(t * 3), 0.5); P.handL.rotation.set(-0.6 * click, 0, 0);
      P.head.rotation.x = 0.28;
      if (r.attach.lanyard && !p.still) r.attach.lanyard.userData.badge.rotation.y = 0.8 * S(t * 3);
    },
    nod(r, t, p) { base(r, t); const u = once(t, p, 0.9); r.parts.head.rotation.x = 0.22 * (1 - C(u * 4 * PI)) / 2; r.parts.neck.rotation.x = 0.06 * (1 - C(u * 4 * PI)) / 2; },
    shake(r, t, p) { base(r, t); const u = once(t, p, 1); r.parts.head.rotation.y = 0.35 * S(u * 6 * PI) * (1 - u); },
    shrug(r, t, p) {
      const P = r.parts, d = r.d, k = S(once(t, p, 1.2) * PI); breathe(r, t);
      P.armL.position.y += 0.035 * k; P.armR.position.y += 0.035 * k;
      if (!r.seated) { arm(r, 1, d.shX + 0.08 * k, 0.12 + 0.06 * k, 0.12 + 0.12 * k, 1, -0.3, -0.6); arm(r, -1, d.shX + 0.08 * k, 0.12 + 0.06 * k, 0.12 + 0.12 * k, 1, -0.3, -0.6); }
      P.handL.rotation.y = -0.9 * k; P.handR.rotation.y = 0.9 * k; P.head.rotation.z = 0.12 * k;
    },
    laugh(r, t) {
      const P = r.parts, d = r.d; if (!r.seated) hang(r, t);
      P.torso.rotation.x = -0.1 - 0.05 * abs(S(t * 8)); P.head.rotation.x = -0.18 - 0.04 * S(t * 8);
      arm(r, 1, 0.06, 0.14 * d.T / 0.47 + 0.01 * S(t * 16), d.bellyZ + 0.07, 1, -0.3, -1);
      P.armL.position.y += 0.008 * S(t * 16); P.armR.position.y += 0.008 * S(t * 16);
    },
    cry(r, t) {
      const P = r.parts, d = r.d;
      P.torso.rotation.x = 0.22 + 0.025 * S(t * 11); P.neck.rotation.x = 0.15; P.head.rotation.x = 0.3;
      const hy = d.T + (d.neckL + 0.1 * d.hs) * C(0.45), hz = (d.neckL + 0.1 * d.hs) * S(0.45) + 0.09;
      arm(r, 1, 0.05, hy - 0.06, hz + 0.06, 0.3, -1, 0.2); arm(r, -1, 0.05, hy - 0.06, hz + 0.06, 0.3, -1, 0.2);
      P.handL.rotation.set(-0.6, 0, -0.3); P.handR.rotation.set(-0.6, 0, 0.3);
      P.armL.position.y += 0.006 * S(t * 11); P.armR.position.y += 0.006 * S(t * 11);
    },
    wave(r, t) {
      const P = r.parts, d = r.d; base(r, t);
      arm(r, -1, d.shX + 0.12 + 0.05 * S(t * 9), d.headC + 0.03, 0.12, 1, -0.6, 0.1);
      P.handR.rotation.z = 0.3 * S(t * 9);
    },
    pour(r, t) {
      const P = r.parts, d = r.d; base(r, t);
      arm(r, 1, 0.05, 0.22, d.chestZ + 0.24, 1, -1, -0.3); arm(r, -1, 0.02, 0.34 + 0.02 * S(t * 2), d.chestZ + 0.28, 1, -0.8, -0.3);
      P.handR.rotation.z = -0.7; P.head.rotation.x = 0.25;
    },
    drink(r, t) {
      const P = r.parts, d = r.d, c = (t % 4) / 4, k = c < 0.4 ? ez(min(1, c / 0.12)) * ez(min(1, (0.4 - c) / 0.12)) : 0; base(r, t);
      arm(r, 1, 0.12 - 0.07 * k, 0.24 + (d.headC - 0.35) * k, d.chestZ + 0.2 - 0.04 * k, 1, -0.6, -0.4);
      P.handL.rotation.x = -0.3 * k; P.head.rotation.x = -0.15 * k;
    },
    carry_mug(r, t) { const d = r.d; base(r, t); arm(r, 1, 0.13, 0.2, d.chestZ + 0.2, 1, -0.8, -0.4); },
    look_up(r, t) { base(r, t); r.parts.head.rotation.x = -0.45; r.parts.neck.rotation.x = -0.2; },
    look_down(r, t) { base(r, t); r.parts.head.rotation.x = 0.42; r.parts.neck.rotation.x = 0.15; },
    write(r, t) {
      const P = r.parts, y = r.seated ? 0.2 : -0.02; breathe(r, t);
      arm(r, 1, 0.12, y, 0.32, 1, -0.6, -0.5); arm(r, -1, 0.03 + 0.015 * S(t * 9), y + 0.01 + 0.005 * S(t * 23), 0.36 + 0.012 * C(t * 7), 1, -0.6, -0.5);
      P.handR.rotation.x = 0.5; P.handL.rotation.x = 0.4; P.head.rotation.x = 0.35; P.torso.rotation.x += 0.1;
    },
    give(r, t, p) {
      const P = r.parts, d = r.d, k = min(1, S(once(t, p, 1.4) * PI) * 1.5); base(r, t);
      arm(r, -1, d.shX * (1 - 0.4 * k), 0.05 + 0.25 * k, 0.12 + 0.4 * k, 1, -1, -0.3);
      P.handR.rotation.x = -0.4 * k; P.torso.rotation.x += 0.08 * k;
    },
    lanyard_on(r, t, p) {
      const P = r.parts, d = r.d, u = once(t, p, 2); breathe(r, t);
      let y, z;
      if (u < 0.4) { const k = ez(u / 0.4); y = 0.3 + (d.headC + 0.22 - 0.3) * k; z = 0.3 - 0.16 * k; }
      else if (u < 0.75) { const k = ez((u - 0.4) / 0.35); y = d.headC + 0.22 - (d.headC + 0.22 - d.T) * k; z = 0.14 - 0.02 * k; }
      else { const k = ez((u - 0.75) / 0.25); y = d.T - 0.2 * k; z = 0.12 + 0.05 * k; }
      arm(r, 1, 0.09, y, z, 1, -0.2, -0.3); arm(r, -1, 0.09, y, z, 1, -0.2, -0.3);
      P.head.rotation.x = u > 0.4 && u < 0.7 ? 0.15 : -0.1 * S(u * PI);
      if (r.attach.lanyard) r.attach.lanyard.visible = u > 0.55;
    },
    hug(r, t) {
      const P = r.parts, d = r.d; breathe(r, t);
      if (r.id === 'luka') {            // doesn't know what to do with his hands
        arm(r, 1, d.shX + 0.16 + 0.03 * S(t * 1.7), 0.18 + 0.03 * S(t * 2.3), 0.2, 1, -0.6, -0.5);
        arm(r, -1, d.shX + 0.16 + 0.03 * S(t * 1.9 + 1), 0.18 + 0.03 * S(t * 2.1 + 1), 0.2, 1, -0.6, -0.5);
        P.handL.rotation.y = -0.8; P.handR.rotation.y = 0.8; P.torso.rotation.x = -0.08; P.head.rotation.x = -0.1;
      } else {
        arm(r, 1, 0.12, d.T * 0.62, 0.36, 1, 0, -0.2); arm(r, -1, 0.12, d.T * 0.62, 0.36, 1, 0, -0.2);
        P.torso.rotation.x = 0.12; P.head.rotation.set(0.1, 0.35, 0.1);
      }
    },
    knock(r, t, p) {
      const P = r.parts, d = r.d, u = once(t, p, 1.2), k = u < 0.85 ? abs(S(u * 3 * PI / 0.85)) : 0; base(r, t);
      if (u < 0.92) arm(r, -1, 0.12, d.headC - 0.12, 0.44 - 0.07 * k, 1, -1, -0.2);
      P.handR.rotation.x = -0.3;
    },
    duck(r, t) {
      const P = r.parts, d = r.d, hy = d.hipY * 0.6; r.seated = false;
      P.hips.position.y = hy; leg(r, 1, d.hipX * 1.1, d.footH - hy, 0.12); leg(r, -1, d.hipX * 1.1, d.footH - hy, 0.12); flat(r);
      P.torso.rotation.x = 0.6 + 0.015 * S(t * 2); P.head.rotation.x = -0.3; P.neck.rotation.x = -0.1;
      arm(r, 1, 0.13, 0.02, 0.3, 1, -0.3, -0.6); arm(r, -1, 0.13, 0.02, 0.3, 1, -0.3, -0.6);
    },
    sleep(r, t, p) {
      const P = r.parts, d = r.d;
      if (r.seated) {
        sit(r, t, p);   // keep the seated hips and legs (pose() resets them before a non-upper anim)
        P.torso.rotation.x = 0.75 + 0.015 * S(t * 1.1); P.neck.rotation.x = 0.1; P.head.rotation.set(0.25, 0.6, 0.25);
        arm(r, 1, 0.02, 0.3, 0.3, 1, 0, -0.2); arm(r, -1, 0.02, 0.32, 0.32, 1, 0, -0.2);
        P.handL.rotation.z = 1.2; P.handR.rotation.z = -1.2;
      } else {
        r.lying = true;
        P.hips.rotation.z = PI / 2; P.hips.position.y = 0.16;
        P.legL.rotation.x = -0.9; P.shinL.rotation.x = 1.3; P.legR.rotation.x = -0.7; P.shinR.rotation.x = 1.1;
        P.torso.rotation.x = 0.25 + 0.012 * S(t * 1.1); P.head.rotation.x = 0.2;
        P.armL.rotation.set(-1.1, 0, 0.1); P.foreL.rotation.x = -1.2; P.armR.rotation.set(-1.3, 0, -0.2); P.foreR.rotation.x = -1.4;
      }
    },
    fake_call(r, t) {
      const P = r.parts, d = r.d; breathe(r, t);
      arm(r, -1, 0.1 * d.hs, d.headC - 0.17, 0.07, 0.5, -1, 0.3);
      P.handR.rotation.set(0.25, 0, 0.15);
      arm(r, 1, 0.2 + 0.1 * S(t * 2.3), 0.28 + 0.08 * S(t * 3.1), 0.3 + 0.08 * S(t * 1.7), 1, -0.6, -0.5);
      P.handL.rotation.set(-0.3 * S(t * 2.3), -0.8, 0);
      P.head.rotation.set(0.06 * S(t * 4), 0.1 * S(t * 0.9), 0.1); P.torso.rotation.y = 0.1 * S(t * 0.9); P.hips.rotation.z = 0.015 * S(t * 0.6);
    },
    back_turn(r, t) {
      const P = r.parts, d = r.d; breathe(r, t); r.seated = false;
      P.hips.rotation.y = PI * ez(min(1, t / 0.6));
      arm(r, 1, -0.05, 0.3, d.chestZ + 0.07, 1, -0.8, -0.2); arm(r, -1, -0.05, 0.28, d.chestZ + 0.11, 1, -0.8, -0.2);
      P.head.rotation.x = -0.1;
    },
    chew(r, t) {
      base(r, t); r.parts.head.rotation.x += 0.03 * S(t * 8);
      const m = S(t * 8) > 0 ? 'closed' : 'O';
      if (!r.talking && r.face.over !== m) { r.face.over = m; r.face.redraw(); }
    },
    tap(r, t) {
      const P = r.parts, y = r.seated ? 0.2 : -0.02; base(r, t);
      arm(r, -1, 0.12, y + 0.02, 0.36, 1, -0.8, -0.4); P.handR.rotation.x = 0.2 + 0.45 * max(0, S(t * 9));
    },
    clap(r, t) {
      const P = r.parts, d = r.d, k = abs(S(t * 7)); breathe(r, t);
      arm(r, 1, 0.02 + 0.06 * k, 0.28, d.chestZ + 0.22, 1, -1, -0.3); arm(r, -1, 0.02 + 0.06 * k, 0.28, d.chestZ + 0.22, 1, -1, -0.3);
      P.handL.rotation.x = -0.6; P.handR.rotation.x = -0.6;
    },
    wipe(r, t) {
      const P = r.parts; breathe(r, t);
      P.torso.rotation.x = 0.35;
      arm(r, -1, 0.1 + 0.07 * C(t * 5), -0.02, 0.44 + 0.06 * S(t * 5), 1, -0.6, -0.4); arm(r, 1, 0.18, 0.0, 0.4, 1, -0.6, -0.4);
      P.handR.rotation.x = 0.9; P.handL.rotation.x = 0.9; P.head.rotation.x = 0.1;
    },
    umbrella(r, t) { const P = r.parts, d = r.d; if (!r.seated) hang(r, t); breathe(r, t); arm(r, -1, 0.08, 0.3, d.chestZ + 0.16, 1, -1, -0.2); P.handR.rotation.x = -0.1; },
    reading(r, t) {
      const P = r.parts, d = r.d; base(r, t);
      arm(r, 1, 0.08, 0.28, d.chestZ + 0.22, 1, -1, -0.3); arm(r, -1, 0.1, 0.28, d.chestZ + 0.22, 1, -1, -0.3);
      P.handR.rotation.set(-0.5, 0, 0); P.head.rotation.x = 0.32;
    },
    glance(r, t, p) {
      base(r, t);
      const u = once(t, p, 1.3), k = u < 0.25 ? ez(u / 0.25) : u > 0.75 ? ez((1 - u) / 0.25) : 1, y = p.yaw ?? 0.9;
      r.parts.head.rotation.y = y * 0.65 * k; r.parts.neck.rotation.y = y * 0.35 * k;
    },
    whistle(r, t) {
      const P = r.parts, d = r.d; breathe(r, t);
      arm(r, -1, 0.02, d.headC - 0.22, 0.2, 1, -1, -0.2); arm(r, 1, 0.03, d.headC - 0.28, 0.25, 1, -1, -0.2);
      P.handR.rotation.x = -0.9; P.handL.rotation.x = -0.9 + 0.1 * S(t * 7); P.head.rotation.x = 0.12; P.torso.rotation.z = 0.04 * S(t * 2);
    },
  };
  for (const n of 'idle phone type point hands_head head_hands lanyard nod shake shrug laugh cry wave pour drink carry_mug look_up look_down write give lanyard_on hug knock fake_call chew tap clap wipe umbrella reading glance whistle'.split(' ')) A[n].upper = true;
  A.phone.shows = (r) => (r.attach.brick ? 'brick' : 'phone');
  A.fake_call.shows = 'brick'; A.pour.shows = A.drink.shows = A.carry_mug.shows = 'mug'; A.reading.shows = 'textbook'; A.umbrella.shows = 'umbrella';
  A.laugh.expr = 'laugh'; A.cry.expr = 'crying'; A.sleep.expr = 'sleep';
  return A;
})());
