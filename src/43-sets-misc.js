// ============================================================ SETS: office, examhall, jarvis_hq
// Rue's office (2026: prologue, title screen, epilogue match cut), the Exam Hall (1987: 3.1 pitch, plus the
// offstage anteroom) and JARVIS Systems, Dublin (post-credits: the wet street and the office upstairs).
// Each set is its own coordinate space (metres, Y up). Static geometry is vertex-coloured and merged per
// material (Builder); labels, posters, screens and the Original Spec are small painted canvases.
(() => {
  const PI = Math.PI, H = PI / 2;
  const tc = new THREE.Color();
  let b = null;                                   // the Builder being filled

  // ------------------------------------------------------------ geometry into `b` (colour baked per vertex)
  function put(g, hex, m, s) {
    tc.set(hex);
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = tc.r; a[i * 3 + 1] = tc.g; a[i * 3 + 2] = tc.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    if (s) worldUV(g, s);
    b.add(g, m || mat(0xffffff));
  }
  function worldUV(g, s) {                        // tiling textures: UVs from world position (s = tile size in m)
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      if (ax >= ay && ax >= az) uv.setXY(i, p.getZ(i) / s, p.getY(i) / s);
      else if (ay >= az) uv.setXY(i, p.getX(i) / s, p.getZ(i) / s);
      else uv.setXY(i, p.getX(i) / s, p.getY(i) / s);
    }
  }
  // box: y is the BOTTOM. bb: two corners. boxR / cyl: centred, rotated.
  function box(w, h, d, hex, x, y, z, ry = 0, m, s) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y + h / 2, z); put(g, hex, m, s); }
  function bb(x0, y0, z0, x1, y1, z1, hex, m, s) { box(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), hex, (x0 + x1) / 2, Math.min(y0, y1), (z0 + z1) / 2, 0, m, s); }
  function boxR(w, h, d, hex, x, y, z, rx = 0, ry = 0, rz = 0, m) {
    const g = new THREE.BoxGeometry(w, h, d); if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); put(g, hex, m);
  }
  function cyl(rt, rb, h, seg, hex, x, y, z, rx = 0, rz = 0, m) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); put(g, hex, m); }
  // quad faces +Z before rotation (rx first, then ry). uv = [u0, v0, u1, v1] picks part of the texture.
  function quad(w, h, m, x, y, z, ry = 0, rx = 0, uv, hex = 0xffffff) {
    const g = new THREE.PlaneGeometry(w, h);
    if (uv) { const a = g.attributes.uv; for (let i = 0; i < 4; i++) a.setXY(i, a.getX(i) ? uv[2] : uv[0], a.getY(i) ? uv[3] : uv[1]); }
    if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); put(g, hex, m);
  }
  const _v = new THREE.Vector3(), _q = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  function rod(ax, ay, az, bx, by, bz, r, hex, m, seg = 5) {
    _v.set(bx - ax, by - ay, bz - az); const len = _v.length();
    const g = new THREE.CylinderGeometry(r, r, len, seg); g.applyQuaternion(_q.setFromUnitVectors(UP, _v.normalize()));
    g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2); put(g, hex, m);
  }
  // a separate Builder -> a named Group (dynamic prop); coordinates inside fn are local
  function part(name, fn, pos, ry = 0) {
    const pb = b; b = new Builder(); fn(); const g = b.done(); b = pb;
    g.name = name; if (pos) g.position.set(pos[0], pos[1], pos[2]); g.rotation.y = ry;
    return g;
  }
  const rng = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const T = (key, w, h, paint, o = {}) => matTex(canvasTex(w, h, paint, { key, repeat: o.repeat }), o);   // textured material
  const glow = (key, w, h, paint) => matTex(canvasTex(w, h, paint, { key }), { emissive: 0xffffff });     // self-lit (screens, windows)

  // ------------------------------------------------------------ canvas painting
  const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", cursive';
  const SANS = '"Helvetica Neue", Arial, sans-serif';
  const SERIF = 'Georgia, "Times New Roman", serif';
  function txt(c, s, x, y, font, color, align = 'center') { c.font = font; c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y); }
  function fit(c, s, x, y, maxW, px, style, color, align = 'center') {   // shrink a line until it fits
    let p = px; c.font = style.replace('#', p); while (p > 6 && c.measureText(s).width > maxW) { p--; c.font = style.replace('#', p); }
    c.fillStyle = color; c.textAlign = align; c.textBaseline = 'middle'; c.fillText(s, x, y);
  }
  const noise = (c, w, h, n, seed, a) => { const r = rng(seed); for (let i = 0; i < n; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${a * r()})`; c.fillRect(r() * w | 0, r() * h | 0, 1 + r() * 2 | 0, 1); } };
  function skull(c, x, y, s, col) {              // the small biro skull next to Recontracts
    c.strokeStyle = col; c.lineWidth = Math.max(1, s * 0.09); c.lineCap = 'round';
    c.beginPath(); c.ellipse(x, y - s * 0.12, s * 0.42, s * 0.38, 0, 0, PI * 2); c.stroke();
    c.beginPath(); c.arc(x - s * 0.16, y - s * 0.12, s * 0.1, 0, PI * 2); c.arc(x + s * 0.16, y - s * 0.12, s * 0.1, 0, PI * 2); c.stroke();
    c.beginPath(); c.moveTo(x - s * 0.18, y + s * 0.2); c.lineTo(x - s * 0.18, y + s * 0.42); c.lineTo(x + s * 0.18, y + s * 0.42); c.lineTo(x + s * 0.18, y + s * 0.2); c.stroke();
    for (const k of [-0.06, 0.06]) { c.beginPath(); c.moveTo(x + s * k, y + s * 0.26); c.lineTo(x + s * k, y + s * 0.42); c.stroke(); }
  }
  // a small JARVIS error window (jarvis_hq monitors and poster)
  function jwin(c, x, y, w, h, title, msg) {
    c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + 3, y + 3, w, h);
    c.fillStyle = '#fbfbfb'; c.fillRect(x, y, w, h);
    c.fillStyle = '#d4d7dc'; c.fillRect(x, y, w, Math.max(6, h * 0.2));
    txt(c, title, x + 3, y + Math.max(3, h * 0.1), `bold ${Math.max(5, h * 0.13) | 0}px ${SANS}`, '#2f6fd6', 'left');
    c.fillStyle = '#d23a2a'; c.beginPath(); c.arc(x + h * 0.3, y + h * 0.52, h * 0.13, 0, PI * 2); c.fill();
    txt(c, msg, x + h * 0.52, y + h * 0.52, `${Math.max(5, h * 0.14) | 0}px ${SANS}`, '#222', 'left');
    c.fillStyle = '#2f6fd6'; c.fillRect(x + w - h * 0.9, y + h * 0.74, h * 0.7, h * 0.18);
    c.fillStyle = '#2f6fd6'; c.fillRect(x + w - h * 1.75, y + h * 0.74, h * 0.7, h * 0.18);
  }

  // =================================================================== OFFICE (Rue's office, 2026)
  // Dark at dawn, 40 floors up: a glass wall onto a city skyline behind a big walnut desk, two empty chairs
  // facing it. Rue (58) sits at `rue_desk` with his back to the glass. The brick phone sits in a charging
  // cradle wired to a converter box; its charge light blinks. Props: brick_phone (userData.ring = true shakes
  // it and lights its LCD), charge_light (userData.blink = false stops the blink), polaroid (face down).
  SETS.office = (() => {
    let skyM = null, towerM = null, redM = null, lcd = null, sky = null, rang = false;
    const SKY = { dark: 0.3, dawn: 1, day: 1.5 }, TOW = { dark: 1.1, dawn: 0.55, day: 0.12 };
    const DESK = 0x4a2f1f, DESK2 = 0x3a2517, LEATHER = 0x19191c, BRASS = 0xb58c4a, WALL = 0x343844, DARKM = 0x1b1d23;

    const tex = {
      carpet: () => T('off_carpet', 64, 64, (c, w, h) => { c.fillStyle = '#d8d8d8'; c.fillRect(0, 0, w, h); noise(c, w, h, 900, 3, 0.25); }, { repeat: [1, 1] }),
      sky: () => {
        const m = matTex(canvasTex(16, 256, (c, w, h) => {
          const g = c.createLinearGradient(0, 0, 0, h);
          g.addColorStop(0, '#070b1e'); g.addColorStop(0.32, '#1c2450'); g.addColorStop(0.5, '#5a4a78'); g.addColorStop(0.58, '#d8845c');
          g.addColorStop(0.62, '#f2b27a'); g.addColorStop(0.68, '#6a4a5a'); g.addColorStop(1, '#1a1622');
          c.fillStyle = g; c.fillRect(0, 0, w, h);
        }, { key: 'off_sky' }), { color: 0x000000, emissive: 0xffffff, key: 'off_sky' });
        m.fog = false; return m;
      },
      towers: () => matTex(canvasTex(128, 128, (c, w, h) => {
        c.fillStyle = '#151925'; c.fillRect(0, 0, w, h);
        const r = rng(21);
        for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
          const v = r(); c.fillStyle = v < 0.2 ? '#ffd48a' : v < 0.28 ? '#bcd8ff' : v < 0.5 ? '#2c3246' : '#1e2331';
          c.fillRect(x * 16 + 3, y * 21.33 + 4, 10, 13);
        }
      }, { key: 'off_towers', repeat: [1, 1] }), { color: 0x6a7288, emissive: 0xffffff, key: 'off_towers' }),
      streets: () => matTex(canvasTex(128, 128, (c, w, h) => {
        c.fillStyle = '#0c0e16'; c.fillRect(0, 0, w, h);
        const r = rng(8);
        for (let i = 0; i < 4; i++) { c.fillStyle = '#e8a050'; for (let x = 0; x < w; x += 4) c.fillRect(x, i * 32 + 14, 1, 1); for (let y = 0; y < h; y += 4) c.fillRect(i * 32 + 14, y, 1, 1); }
        for (let i = 0; i < 40; i++) { c.fillStyle = r() < 0.5 ? '#ff4a3a' : '#fff4d0'; c.fillRect(r() * w | 0, (r() * 4 | 0) * 32 + 13 + (r() < 0.5 ? 0 : 2), 2, 1); }
      }, { key: 'off_streets', repeat: [1, 1] }), { color: 0x101218, emissive: 0xffffff, key: 'off_streets' }),
      pool: () => matTex(canvasTex(128, 128, (c, w, h) => {
        const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,214,150,0.55)'); g.addColorStop(0.45, 'rgba(255,190,120,0.22)'); g.addColorStop(1, 'rgba(255,170,100,0)');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
      }, { key: 'off_pool' }), { transparent: true, emissive: 0xffc890, emissiveIntensity: 0.6 }),
      phone: () => T('off_brick', 64, 192, (c, w, h) => {
        c.fillStyle = '#5d6168'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#44474d'; c.fillRect(4, 8, w - 8, 10); c.fillStyle = '#2a2c30'; for (let x = 8; x < w - 8; x += 4) c.fillRect(x, 10, 2, 6);  // earpiece
        c.fillStyle = '#23262a'; c.fillRect(7, 26, w - 14, 32);
        c.fillStyle = '#7d8c6c'; c.fillRect(10, 29, w - 20, 26);      // LCD (off)
        txt(c, 'MOBILE', w / 2, 66, `bold 7px ${SANS}`, '#c9ccd1');
        const k = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
        c.fillStyle = '#2e3136'; c.fillRect(8, 74, w - 16, 12);        // SND END
        txt(c, 'SND     END', w / 2, 80, `bold 6px ${SANS}`, '#e6e6e6');
        for (let i = 0; i < 12; i++) {
          const x = 8 + (i % 3) * 17, y = 92 + (i / 3 | 0) * 21;
          c.fillStyle = '#c6c8cc'; c.fillRect(x, y, 14, 15); txt(c, k[i], x + 7, y + 8, `bold 9px ${SANS}`, '#222');
        }
        c.fillStyle = '#2a2c30'; for (let x = 14; x < w - 14; x += 5) c.fillRect(x, h - 10, 2, 5);  // mic
      }),
      phoneLcd: () => mat(0x0a1a08, { emissive: 0x9cff7a, emissiveIntensity: 0.9, key: 'off_lcd' }),
      walkman: () => T('off_walkman', 96, 128, (c, w, h) => {
        c.fillStyle = '#8a9ab0'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#26303c'; c.fillRect(10, 14, w - 20, 62);                 // cassette window
        c.fillStyle = '#c8b89a'; c.fillRect(18, 24, w - 36, 42);
        c.fillStyle = '#3a2f28'; c.beginPath(); c.arc(34, 45, 9, 0, PI * 2); c.arc(62, 45, 9, 0, PI * 2); c.fill();
        txt(c, 'STEREO CASSETTE PLAYER', w / 2, 88, `bold 7px ${SANS}`, '#1a2230');
        txt(c, 'AUTO REVERSE', w / 2, 98, `7px ${SANS}`, '#2a3444');
        const lab = ['◀◀', '▶', '▶▶', '■'];
        for (let i = 0; i < 4; i++) { c.fillStyle = '#c9ccd2'; c.fillRect(8 + i * 21, 106, 17, 14); txt(c, lab[i], 16 + i * 21, 113, `7px ${SANS}`, '#222'); }
      }),
      cassette: () => T('off_cassette', 128, 80, (c, w, h) => {
        c.fillStyle = '#2a2a30'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#f2ecd8'; c.fillRect(8, 6, w - 16, 50);                   // label
        c.fillStyle = '#d24a3a'; c.fillRect(8, 6, w - 16, 5);
        c.strokeStyle = '#b8b0a0'; c.lineWidth = 1; for (let y = 20; y < 54; y += 9) { c.beginPath(); c.moveTo(12, y); c.lineTo(w - 12, y); c.stroke(); }
        c.fillStyle = '#3a3a44'; c.fillRect(34, 30, 60, 18);
        c.fillStyle = '#111'; c.beginPath(); c.arc(46, 39, 6, 0, PI * 2); c.arc(82, 39, 6, 0, PI * 2); c.fill();
        c.save(); c.translate(w / 2, 20); c.rotate(-0.03); fit(c, 'PUDDING', 0, 0, w - 26, 17, `bold #px ${HAND}`, '#15151a'); c.restore();
        c.fillStyle = '#44444c'; c.fillRect(30, 62, 68, 14);
      }),
      report: () => T('off_report', 96, 128, (c, w, h) => {
        c.fillStyle = '#f3f2ec'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2f6fd6'; c.fillRect(0, 0, w, 20);
        txt(c, 'JARVIS', 8, 10, `bold 11px ${SANS}`, '#fff', 'left');
        txt(c, 'INCIDENT REPORT', w / 2, 34, `bold 10px ${SANS}`, '#1a1a1a');
        txt(c, 'Q3 2026 · 40 pp', w / 2, 47, `8px ${SANS}`, '#444');
        c.fillStyle = '#d23a2a'; c.fillRect(20, 58, w - 40, 12); txt(c, 'CONFIDENTIAL', w / 2, 64, `bold 7px ${SANS}`, '#fff');
        c.fillStyle = '#9a9a9a'; for (let y = 80; y < 118; y += 6) c.fillRect(10, y, w - 20 - (y % 12), 2);
        c.fillStyle = '#d8d6cc'; c.beginPath(); c.moveTo(w - 16, h); c.lineTo(w, h - 16); c.lineTo(w, h); c.fill();          // dog-ear
        c.fillStyle = '#bdbab0'; c.beginPath(); c.moveTo(w - 16, h); c.lineTo(w, h - 16); c.lineTo(w - 14, h - 14); c.fill();
      }),
      polaroidBack: () => T('off_pol_back', 64, 80, (c, w, h) => {
        c.fillStyle = '#1e1e22'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2a30'; c.fillRect(4, 4, w - 8, h - 22);
        c.fillStyle = '#56565e'; for (let y = 10; y < 50; y += 6) c.fillRect(10, y, w - 20 - (y % 12), 1);
        txt(c, 'INSTANT FILM', w / 2, h - 10, `6px ${SANS}`, '#6a6a72');
      }),
      polaroidFront: () => T('off_pol_front', 64, 80, (c, w, h) => {
        c.fillStyle = '#f2efe6'; c.fillRect(0, 0, w, h);
        const g = c.createLinearGradient(0, 5, 0, 60); g.addColorStop(0, '#8a8a84'); g.addColorStop(1, '#5a5650');
        c.fillStyle = g; c.fillRect(5, 5, w - 10, 55);
        c.fillStyle = '#6e6a62'; c.beginPath(); c.arc(w / 2, 34, 18, PI, 0); c.lineTo(w / 2 + 18, 60); c.lineTo(w / 2 - 18, 60); c.fill();   // arch
        c.fillStyle = '#2a2a2e'; c.beginPath(); c.arc(w / 2, 38, 10, PI, 0); c.lineTo(w / 2 + 10, 60); c.lineTo(w / 2 - 10, 60); c.fill();
        c.fillStyle = '#1f6fe0'; c.fillRect(13, 38, 9, 16); c.fillStyle = '#15161a'; c.fillRect(42, 38, 10, 16); c.fillStyle = '#1e2a4d'; c.fillRect(28, 36, 9, 18);
        c.fillStyle = '#e8c0a0'; c.fillRect(15, 31, 6, 7); c.fillRect(44, 31, 6, 7); c.fillRect(30, 29, 6, 7);
      }),
      calendar: () => T('off_calendar', 128, 176, (c, w, h) => {
        c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, w, h);
        const g = c.createLinearGradient(0, 0, 0, 50); g.addColorStop(0, '#7ab8e0'); g.addColorStop(1, '#f2d8a0');
        c.fillStyle = g; c.fillRect(0, 0, w, 50);                                  // photo: a beach at dawn
        c.fillStyle = '#3a78a8'; c.fillRect(0, 30, w, 10); c.fillStyle = '#e8d2a0'; c.fillRect(0, 40, w, 10);
        c.fillStyle = '#ffeec0'; c.beginPath(); c.arc(90, 30, 7, PI, 0); c.fill();
        txt(c, 'OCTOBER 2026', w / 2, 59, `bold 10px ${SANS}`, '#1a1a1a');
        const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'], cw = w / 7;
        for (let i = 0; i < 7; i++) txt(c, days[i], cw * i + cw / 2, 71, `bold 7px ${SANS}`, '#888');
        for (let d = 1; d <= 31; d++) {                                            // 1 Oct 2026 is a Thursday
          const k = d + 2, x = (k % 7) * cw + cw / 2, y = 83 + (k / 7 | 0) * 20;
          txt(c, String(d), x, y, `8px ${SANS}`, '#333');
          if (d === 20) {
            c.strokeStyle = '#d0201a'; c.lineWidth = 2; c.beginPath(); c.ellipse(x, y, 9, 7, -0.2, 0, PI * 2); c.stroke();
            txt(c, '11:58 — REDCLIFFE', x - 8, y + 10, `bold 8px ${HAND}`, '#d0201a', 'left');
          }
        }
      }),
      lanyard: () => T('off_lanyard', 96, 128, (c, w, h) => {
        c.fillStyle = '#efece4'; c.fillRect(0, 0, w, h);                          // white mat
        c.strokeStyle = '#6aa8c8'; c.lineWidth = 5; c.lineJoin = 'round';          // faded blue cord
        c.beginPath(); c.moveTo(30, 18); c.lineTo(22, 70); c.lineTo(44, 86); c.moveTo(66, 18); c.lineTo(74, 70); c.lineTo(52, 86); c.stroke();
        c.beginPath(); c.moveTo(30, 18); c.quadraticCurveTo(48, 6, 66, 18); c.stroke();
        c.fillStyle = '#9aa0a6'; c.fillRect(44, 84, 8, 8);                        // clip
        c.fillStyle = '#f7f7f4'; c.strokeStyle = '#b8bcc0'; c.lineWidth = 1; c.fillRect(28, 92, 40, 26); c.strokeRect(28, 92, 40, 26);
        txt(c, 'LUKA', 48, 106, `bold 10px ${SANS}`, '#4a4e58');
      }),
      intercom: () => T('off_intercom', 96, 64, (c, w, h) => {
        c.fillStyle = '#1c1d21'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#333640'; for (let y = 10; y < 54; y += 5) for (let x = 8; x < 40; x += 5) c.fillRect(x, y, 2, 2);   // grille
        c.fillStyle = '#0e1a26'; c.fillRect(48, 8, 40, 16); txt(c, 'RECEPTION', 68, 16, `bold 6px ${SANS}`, '#7ac4ff');
        for (let i = 0; i < 3; i++) { c.fillStyle = '#44474f'; c.fillRect(48 + i * 14, 32, 11, 9); }
        c.fillStyle = '#3aa050'; c.fillRect(48, 48, 40, 9); txt(c, 'TALK', 68, 53, `bold 6px ${SANS}`, '#eaffea');
      }),
      folder: () => T('off_folder', 96, 128, (c, w, h) => {
        c.fillStyle = '#1e2a4a'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#f2f0e8'; c.fillRect(18, 22, 60, 26);
        txt(c, 'BOARD PACK', w / 2, 30, `bold 8px ${SANS}`, '#1e2a4a'); txt(c, 'OCTOBER 2026', w / 2, 41, `7px ${SANS}`, '#444');
        c.fillStyle = '#ffd21f'; c.fillRect(w - 10, 70, 10, 18);
      }),
      clock: () => T('off_clock', 128, 128, (c, w, h) => {
        c.fillStyle = '#e8e8e4'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; c.fillRect(64 + Math.sin(a) * 50 - 2, 64 - Math.cos(a) * 50 - 5, 4, 10); }
        c.strokeStyle = '#1a1a1a'; c.lineCap = 'round';
        c.lineWidth = 6; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(6.17 / 12 * PI * 2) * 28, 64 - Math.cos(6.17 / 12 * PI * 2) * 28); c.stroke();   // 6:10
        c.lineWidth = 4; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(10 / 60 * PI * 2) * 42, 64 - Math.cos(10 / 60 * PI * 2) * 42); c.stroke();
      }),
      diploma: () => T('off_diploma', 128, 96, (c, w, h) => {
        c.fillStyle = '#f1ead6'; c.fillRect(0, 0, w, h); c.strokeStyle = '#a08a5a'; c.lineWidth = 2; c.strokeRect(5, 5, w - 10, h - 10);
        txt(c, 'Collegium Sanctae Trinitatis', w / 2, 20, `italic 8px ${SERIF}`, '#3a2a1a');
        txt(c, 'Bachelor in Business Studies', w / 2, 44, `bold 9px ${SERIF}`, '#2a1a0a');
        txt(c, 'MCMLXXXIX', w / 2, 60, `8px ${SERIF}`, '#3a2a1a');
        c.fillStyle = '#a0201a'; c.beginPath(); c.arc(w / 2, 78, 7, 0, PI * 2); c.fill();
      }),
      led: () => mat(0x103010, { emissive: 0x3cff5a, key: 'off_led' }),
      bulb: () => mat(0xffe0b0, { emissive: 0xffb860 }),
      spill: () => mat(0xffe8c8, { emissive: 0xffd8a8, emissiveIntensity: 0.8 }),
      red: () => mat(0x300000, { emissive: 0xff2a1a, key: 'off_red' }),
      glass: () => mat(0x9fb6d8, { transparent: true, opacity: 0.09 }),
    };

    function build() {
      b = new Builder();
      const root = new THREE.Group();
      const carpet = tex.carpet();
      skyM = tex.sky(); towerM = tex.towers(); redM = tex.red();

      // ---------------------------------------------------------- the room: x -4.2..4.2, z -3.4 (glass)..3.8, ceiling 3.1
      bb(-4.2, -0.1, -3.4, 4.2, 0, 3.8, 0x3a3c44, carpet, 1.2);
      bb(-2.3, 0, -3.15, 2.3, 0.012, 0.95, 0x3a3226); bb(-2.15, 0.002, -3.0, 2.15, 0.014, 0.8, 0x1d2640);   // rug
      bb(-4.35, 0, -3.4, -4.2, 3.1, 3.8, 0x3a2c22);                                           // west: walnut panelled feature wall
      for (let z = -3.0; z < 3.8; z += 0.8) bb(-4.2, 0.1, z - 0.01, -4.19, 3.0, z + 0.01, 0x241a12);
      bb(4.2, 0, -3.4, 4.35, 3.1, 3.8, WALL); bb(-4.35, 0, 3.8, 4.35, 3.1, 3.95, WALL);
      bb(-4.35, 3.1, -3.6, 4.35, 3.2, 3.95, 0x25272d);                                        // ceiling
      bb(4.18, 0, -3.4, 4.2, 0.1, 3.8, 0x16171b); bb(-4.2, 0, 3.78, 4.2, 0.1, 3.8, 0x16171b);                     // skirting
      for (let x = -3; x <= 3; x += 2) for (let z = -2.4; z <= 3; z += 1.8) cyl(0.07, 0.07, 0.02, 10, 0x3a3c42, x, 3.09, z);   // downlights (off)
      bb(-3.6, 3.08, 0.2, 3.6, 3.1, 0.3, 0x2e3036);                                           // linear slot
      bb(1.2, 3.085, 2.6, 2.0, 3.1, 3.0, 0x30323a);                                           // aircon grille
      // glass wall + frame, the building's ledge outside
      for (let x = -4.2; x <= 4.21; x += 1.4) bb(x - 0.045, 0, -3.48, x + 0.045, 3.1, -3.36, DARKM);
      bb(-4.2, 0, -3.5, 4.2, 0.1, -3.36, DARKM); bb(-4.2, 2.98, -3.5, 4.2, 3.1, -3.36, DARKM);
      quad(8.4, 2.88, tex.glass(), 0, 1.54, -3.43);
      bb(-9, -2.5, -5.0, 9, -0.05, -3.5, 0x2a2d34); bb(-9, -0.05, -3.9, 9, 0.0, -3.5, 0x3a3e46);
      // ---------------------------------------------------------- the city behind the glass
      const r = rng(44);
      const tower = (x, z, w, d, top) => {
        box(w, top + 95, d, 0xffffff, x, -95, z, 0, towerM, 14);
        box(w + 0.4, 1.2, d + 0.4, 0x14161c, x, top, z);                                        // parapet
        if (r() < 0.5) box(w * 0.4, 3 + r() * 4, d * 0.4, 0x1a1d26, x, top + 1.2, z);           // plant room
        if (top > 5) { rod(x, top + 1.2, z, x, top + 12, z, 0.25, 0x2a2d34); box(0.9, 0.9, 0.9, 0xffffff, x, top + 12, z, 0, redM); }
      };
      tower(-16, -48, 14, 14, -14); tower(12, -52, 12, 16, -24); tower(30, -70, 16, 14, 22); tower(-38, -74, 18, 16, 34);
      tower(2, -96, 14, 14, 48); tower(-66, -100, 20, 16, 6); tower(52, -96, 18, 18, -8); tower(22, -128, 22, 18, 58);
      for (let i = 0; i < 34; i++) {
        const x = -150 + r() * 300, z = -60 - r() * 100;
        if (Math.abs(x) < 30 && z > -80) continue;
        tower(x, z, 10 + r() * 18, 10 + r() * 16, -45 + r() * 45);
      }
      quad(700, 300, tex.streets(), 0, -95, -150, 0, -H);
      quad(560, 220, skyM, 0, 10, -175);
      // ---------------------------------------------------------- the desk (walnut), Rue's chair, the two empty chairs
      bb(-1.22, 0.735, -2.02, 1.22, 0.78, -0.98, DESK);
      bb(-1.16, 0, -1.96, -0.62, 0.735, -1.04, DESK2); bb(0.62, 0, -1.96, 1.16, 0.735, -1.04, DESK2);
      bb(-0.62, 0.22, -1.08, 0.62, 0.735, -1.03, DESK2);                                      // modesty panel
      for (const x of [-0.89, 0.89]) for (const y of [0.18, 0.42, 0.62]) { bb(x - 0.24, y - 0.005, -1.966, x + 0.24, y + 0.005, -1.96, 0x241810); bb(x - 0.06, y + 0.05, -1.975, x + 0.06, y + 0.065, -1.96, BRASS); }
      bb(-0.46, 0.78, -1.98, 0.46, 0.784, -1.42, 0x141416);                                   // leather desk mat
      quad(1.5, 1.2, tex.pool(), 0.5, 0.786, -1.55, 0, -H);                                    // lamp light on the desk
      quad(3.4, 3.0, tex.pool(), 0.1, 0.018, -1.9, 0, -H);                                     // and spilling on the rug
      // Rue's chair (high-back, black leather), facing +Z at rue_desk
      for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; boxR(0.3, 0.03, 0.05, 0x141416, Math.sin(a) * 0.15, 0.06, -2.4 + Math.cos(a) * 0.15, 0, a + H); cyl(0.022, 0.022, 0.04, 6, 0x0e0e10, Math.sin(a) * 0.3, 0.02, -2.4 + Math.cos(a) * 0.3); }
      cyl(0.03, 0.03, 0.34, 8, 0x3a3a40, 0, 0.24, -2.4);
      boxR(0.54, 0.09, 0.52, LEATHER, 0, 0.43, -2.38);
      boxR(0.52, 0.86, 0.1, LEATHER, 0, 0.95, -2.68, -0.12);
      boxR(0.44, 0.2, 0.06, 0x222226, 0, 1.3, -2.74, -0.12);
      for (const s of [-1, 1]) { boxR(0.06, 0.04, 0.34, 0x1e1e22, s * 0.3, 0.66, -2.38); rod(s * 0.3, 0.47, -2.36, s * 0.3, 0.64, -2.36, 0.018, 0x3a3a40); }
      // visitors' chairs facing the desk (backs toward +Z)
      for (const x of [-0.65, 0.65]) {
        boxR(0.56, 0.1, 0.52, 0x3a4150, x, 0.41, -0.3); boxR(0.56, 0.46, 0.08, 0x3a4150, x, 0.72, -0.02, 0.1);
        for (const s of [-1, 1]) boxR(0.06, 0.2, 0.5, 0x333a48, x + s * 0.26, 0.56, -0.3);
        for (const [dx, dz] of [[-0.24, -0.52], [0.24, -0.52], [-0.24, -0.08], [0.24, -0.08]]) rod(x + dx, 0, dz, x + dx, 0.36, dz, 0.012, 0x9a9ca2);
      }
      // ---------------------------------------------------------- on the desk (top at y 0.78)
      // brick phone cradle + converter box + cables (the handset is the brick_phone prop)
      boxR(0.12, 0.045, 0.15, 0x2a2b2f, 0.78, 0.8025, -1.56);
      boxR(0.1, 0.05, 0.03, 0x232428, 0.78, 0.84, -1.625, -0.2);
      boxR(0.09, 0.032, 0.065, 0x121215, 1.0, 0.796, -1.48, 0, 0.35);
      boxR(0.012, 0.006, 0.004, 0xffffff, 0.985, 0.806, -1.448, 0, 0.35, 0, mat(0x10102a, { emissive: 0x4a8cff }));
      rod(0.78, 0.8, -1.64, 0.86, 0.79, -1.66, 0.005, 0x101012); rod(0.86, 0.79, -1.66, 0.97, 0.788, -1.52, 0.005, 0x101012);
      rod(1.03, 0.787, -1.5, 1.1, 0.787, -1.78, 0.004, 0xe8e8e8); rod(1.1, 0.787, -1.78, 1.14, 0.787, -2.02, 0.004, 0xe8e8e8);
      rod(1.14, 0.787, -2.02, 1.14, 0.1, -2.05, 0.004, 0xe8e8e8);
      quad(0.05, 0.03, T('off_conv', 64, 40, (c, w, h) => { c.fillStyle = '#121215'; c.fillRect(0, 0, w, h); txt(c, '12V DC · USB-C', w / 2, 14, `bold 7px ${SANS}`, '#8a8c92'); txt(c, 'IN  OUT', w / 2, 28, `6px ${SANS}`, '#6a6c72'); }), 1.0, 0.8125, -1.48, 0.35, -H);
      // Walkman + foam headphones
      box(0.085, 0.03, 0.12, 0x8a9ab0, 0.4, 0.78, -1.42, 0.2);
      quad(0.085, 0.12, tex.walkman(), 0.4, 0.8105, -1.42, 0.2, -H);
      { const g = new THREE.TorusGeometry(0.07, 0.006, 4, 14, PI); g.rotateX(-H); g.rotateY(0.5); g.translate(0.44, 0.787, -1.62); put(g, 0x2a2a2e); }
      for (const [x, z] of [[0.38, -1.58], [0.5, -1.66]]) cyl(0.032, 0.032, 0.022, 10, 0xd8762a, x, 0.792, z);
      // the PUDDING cassette
      box(0.1, 0.013, 0.064, 0x303036, 0.15, 0.78, -1.33, -0.15);
      quad(0.1, 0.064, tex.cassette(), 0.15, 0.7935, -1.33, -0.15, -H);
      // JARVIS incident report (40 pages, dog-eared, binder clip)
      box(0.21, 0.012, 0.297, 0xf0efe8, -0.38, 0.78, -1.42, 0.12);
      quad(0.21, 0.297, tex.report(), -0.38, 0.7925, -1.42, 0.12, -H);
      boxR(0.04, 0.014, 0.02, 0x111114, -0.38 - Math.sin(0.12) * 0.14, 0.792, -1.42 - Math.cos(0.12) * 0.14, 0, 0.12);
      // board pack, laptop, pen, water glass
      box(0.24, 0.018, 0.32, 0x1e2a4a, -0.8, 0.78, -1.62, -0.08);
      quad(0.24, 0.32, tex.folder(), -0.8, 0.7985, -1.62, -0.08, -H);
      box(0.32, 0.016, 0.22, 0xa8acb2, -0.52, 0.78, -1.86, 0.05); bb(-0.53, 0.796, -1.95, -0.51, 0.797, -1.77, 0x8a8e94);
      rod(-0.2, 0.79, -1.62, -0.06, 0.79, -1.7, 0.005, 0x1a1a1e);
      cyl(0.03, 0.028, 0.1, 10, 0xb8c8d4, -1.02, 0.83, -1.72); cyl(0.027, 0.026, 0.06, 10, 0xd8e6ee, -1.02, 0.82, -1.72);
      // intercom
      boxR(0.15, 0.045, 0.11, 0x1a1b1f, -1.0, 0.8, -1.26, 0, -0.3);
      quad(0.15, 0.11, tex.intercom(), -1.0, 0.8235, -1.26, -0.3, -H);
      // desk lamp (warm shade over the phone)
      cyl(0.07, 0.075, 0.02, 12, BRASS, 1.02, 0.79, -1.9);
      rod(1.02, 0.8, -1.9, 1.0, 1.22, -1.88, 0.01, BRASS); rod(1.0, 1.22, -1.88, 0.82, 1.3, -1.72, 0.01, BRASS);
      { const g = new THREE.CylinderGeometry(0.035, 0.11, 0.13, 12, 1, true); g.rotateX(0.35); g.translate(0.8, 1.24, -1.7); put(g, 0x1d2a24, mat(0xffffff, { side: THREE.DoubleSide })); }
      cyl(0.075, 0.075, 0.004, 12, 0xffffff, 0.8, 1.2, -1.69, 0.35, 0, tex.bulb());
      // ---------------------------------------------------------- west wall: credenza, calendar, framed lanyard, diploma
      bb(-4.2, 0, -2.7, -3.72, 0.72, 0.2, DESK2); bb(-4.2, 0.72, -2.72, -3.7, 0.75, 0.22, DESK);
      for (const z of [-2.1, -1.2, -0.3]) bb(-3.721, 0.1, z - 0.4, -3.715, 0.62, z + 0.4, 0x2a1c12);
      { let z = -2.5; const rb = rng(9); for (let i = 0; i < 9; i++) { const t = 0.03 + rb() * 0.03, hh = 0.2 + rb() * 0.08; box(0.2, hh, t, [0x6a2a2a, 0x2a3a5a, 0xc8b890, 0x2a4a3a, 0x1a1a1a][i % 5], -3.92, 0.75, z + t / 2); z += t + 0.004; } }
      cyl(0.05, 0.07, 0.04, 10, 0x2a1a10, -3.95, 0.77, -1.3); cyl(0.004, 0.004, 0.12, 4, BRASS, -3.95, 0.85, -1.3);   // the little brass bell on its stand
      { const g = new THREE.SphereGeometry(0.05, 10, 6, 0, PI * 2, 0, H * 1.1); g.translate(-3.95, 0.8, -1.3); put(g, 0xc89a48); }
      cyl(0.06, 0.05, 0.34, 8, 0x8a8e96, -3.95, 0.92, -0.4);                                     // vase
      box(0.02, 0.48, 0.35, 0x151518, -4.19, 1.31, -0.5); quad(0.34, 0.47, tex.calendar(), -4.17, 1.55, -0.5, H);   // calendar
      box(0.03, 0.5, 0.4, 0x151515, -4.2, 1.25, -2.0); quad(0.34, 0.44, tex.lanyard(), -4.18, 1.5, -2.0, H);      // framed lanyard
      box(0.03, 0.36, 0.46, 0x2a1a0e, -4.2, 1.54, 1.5); quad(0.4, 0.3, tex.diploma(), -4.18, 1.72, 1.5, H);
      // ---------------------------------------------------------- east: bookshelf, clock; south-east: sofa, coffee table; plant
      bb(3.86, 0, -1.6, 4.2, 2.3, 1.1, 0x2c1e14);
      { const rb = rng(17); for (let y = 0.1; y < 2.2; y += 0.5) { bb(3.84, y, -1.6, 4.2, y + 0.03, 1.1, 0x3a2818); let z = -1.52; while (z < 1.0) { const t = 0.03 + rb() * 0.05, hh = 0.22 + rb() * 0.16; if (rb() < 0.12) { z += 0.2; continue; } box(0.24, hh, t, [0x6a2a2a, 0x2a3a5a, 0xc8b890, 0x2a4a3a, 0x3a3a3e, 0x8a6a3a][rb() * 6 | 0], 4.06, y + 0.03, z + t / 2); z += t + 0.005; } } }
      cyl(0.2, 0.2, 0.04, 16, 0x151518, 4.18, 2.35, 2.2, 0, H);
      { const g = new THREE.CircleGeometry(0.18, 20); g.rotateY(-H); g.translate(4.155, 2.35, 2.2); put(g, 0xffffff, tex.clock()); }
      bb(1.2, 0, 3.0, 3.4, 0.42, 3.8, 0x202024); bb(1.2, 0.42, 3.5, 3.4, 0.9, 3.8, 0x202024);
      bb(1.0, 0, 3.0, 1.2, 0.62, 3.8, 0x1a1a1e); bb(3.4, 0, 3.0, 3.6, 0.62, 3.8, 0x1a1a1e);
      bb(1.7, 0, 2.05, 2.9, 0.38, 2.65, 0x3a2618); box(0.3, 0.01, 0.22, 0xd8d0c0, 2.1, 0.38, 2.35, 0.3); box(0.28, 0.01, 0.2, 0x8a3a2a, 2.5, 0.38, 2.3, -0.2);
      cyl(0.22, 0.17, 0.5, 10, 0x2a2a2e, 3.75, 0.25, -2.9);
      { const rp = rng(5); for (let i = 0; i < 14; i++) { const a = rp() * PI * 2, t = 0.3 + rp() * 0.5; const g = new THREE.ConeGeometry(0.12, 0.9, 4); g.rotateZ(t); g.rotateY(a); g.translate(3.75 + Math.cos(a) * 0.2, 0.9 + rp() * 0.7, -2.9 - Math.sin(a) * 0.2); put(g, rp() < 0.5 ? 0x2a4a2a : 0x335a30); } }
      // ---------------------------------------------------------- south: the door, the coat stand (Rue's navy coat, the old striped scarf)
      bb(-3.18, 0, 3.74, -2.02, 2.4, 3.8, 0x1a1b1f); bb(-3.1, 0, 3.72, -2.1, 2.34, 3.78, 0x3e2a1c);
      bb(-2.25, 1.0, 3.66, -2.21, 1.04, 3.72, 0xa8acb2); bb(-2.28, 1.0, 3.66, -2.1, 1.04, 3.68, 0xa8acb2);
      bb(-3.05, 0.0, 3.705, -2.15, 0.012, 3.72, 0xffffff, tex.spill());                             // corridor light under the door
      bb(-1.85, 1.2, 3.785, -1.77, 1.32, 3.8, 0x2a2c32); bb(-1.83, 1.28, 3.78, -1.79, 1.29, 3.785, 0xffffff, tex.led());
      cyl(0.18, 0.2, 0.03, 10, 0x151515, -3.7, 0.015, 3.3); rod(-3.7, 0, 3.3, -3.7, 1.8, 3.3, 0.02, 0x151515);
      for (const a of [0, 2.1, 4.2]) rod(-3.7, 1.7, 3.3, -3.7 + Math.cos(a) * 0.14, 1.78, 3.3 + Math.sin(a) * 0.14, 0.01, 0x151515);
      boxR(0.42, 0.95, 0.18, 0x1c2645, -3.62, 1.2, 3.3, 0, 0.3); boxR(0.4, 0.14, 0.2, 0x1c2645, -3.62, 1.66, 3.3, 0, 0.3);
      for (let i = 0; i < 8; i++) boxR(0.09, 0.08, 0.03, i % 2 ? 0xe8d9b5 : 0x7a1f2b, -3.8, 1.62 - i * 0.08, 3.18, 0, 0.3);   // Rue's 1987 scarf
      root.add(b.done());
      sky = root.children[0].children.find((o) => o.material === skyM);

      // ---------------------------------------------------------- dynamic props
      const phone = part('brick_phone', () => {
        box(0.078, 0.22, 0.05, 0x5d6168, 0, 0, 0);
        quad(0.078, 0.22, tex.phone(), 0, 0.11, 0.0255);
        cyl(0.008, 0.008, 0.13, 6, 0x2a2b2e, 0.024, 0.285, -0.01); cyl(0.012, 0.012, 0.02, 6, 0x1a1b1e, 0.024, 0.35, -0.01);
      }, [0.78, 0.8, -1.565]);
      phone.rotation.x = -0.2;
      lcd = new THREE.Mesh(new THREE.PlaneGeometry(0.052, 0.031), tex.phoneLcd());
      lcd.position.set(0, 0.17, 0.0262); lcd.visible = false; lcd.name = 'brick_lcd'; phone.add(lcd);
      root.add(phone);
      const led = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, 0.004), tex.led());
      led.name = 'charge_light'; led.position.set(0.815, 0.815, -1.483); root.add(led);
      const pol = part('polaroid', () => {
        box(0.088, 0.003, 0.107, 0xe8e6de, 0, 0, 0);
        quad(0.088, 0.107, tex.polaroidBack(), 0, 0.0032, 0, 0, -H);
        quad(0.088, 0.107, tex.polaroidFront(), 0, -0.0002, 0, 0, H);
      }, [0.02, 0.784, -1.72], 0.3);
      root.add(pol);
      return root;
    }

    const k = { v: 1, t: 1 };                              // live sky / tower glow
    function update(dt, ctx) {
      const p = ctx.props, t = ctx.t;
      const led = p.charge_light;
      if (led && led.userData.blink !== false) led.visible = t % 1.6 < 0.18;
      const ph = p.brick_phone;
      if (ph && lcd) {
        const ring = !!ph.userData.ring;
        lcd.visible = ring;
        if (ring || rang) ph.rotation.z = ring ? 0.035 * Math.sin(t * 70) * (Math.sin(t * 9) > 0 ? 1 : 0) : 0;   // buzz in bursts
        rang = ring;
      }
      const e = ctx.env, ka = Math.min(1, dt * 0.6);   // the city lights up (or dims) with the env
      k.v += ((SKY[e] ?? 1) - k.v) * ka; k.t += ((TOW[e] ?? 0.8) - k.t) * ka;
      if (skyM) skyM.emissiveIntensity = k.v;
      if (sky) sky.visible = e !== 'day';                  // daytime: plain sky (bg + haze) instead of the dawn gradient
      if (towerM) towerM.emissiveIntensity = k.t;
      if (redM) redM.emissiveIntensity = t % 2 < 1 ? 1 : 0.1;
    }

    return {
      env: {
        dawn: { bg: 0x141a34, fog: [0x3a3452, 0.011], hemi: [0x8a98c8, 0x241c2c, 0.7], dir: [0xffc49a, 1.05, [3, 5, 7]] },
        dark: { bg: 0x080b18, fog: [0x131829, 0.012], hemi: [0x56648e, 0x120e1a, 0.5], dir: [0xffcfa4, 0.9, [3, 5, 7]] },
        day:  { bg: 0x9ab4d0, fog: [0xaebccb, 0.007], hemi: [0xe8f0ff, 0x5a5048, 1.1], dir: [0xfff4e0, 1.35, [2, 8, 6]] },
      },
      build, update,
      marks: {
        rue_desk: [0, 0, -2.36, 0], chair_1: [-0.65, 0, -0.28, PI], chair_2: [0.65, 0, -0.28, PI],
        door: [-2.6, 0, 3.2, PI], window: [2.1, 0, -2.95, PI],
        rue_stand: [0.5, 0, -2.5, 0], desk_front: [0, 0, 0.6, PI], sofa: [2.3, 0, 3.3, PI],
      },
      anchors: {
        brick_phone:   { at: [0.78, 0.9, -1.56], from: [0.72, 0.96, -1.08], fov: 30 },
        walkman:       { at: [0.42, 0.8, -1.48], from: [0.46, 1.13, -1.02], fov: 32 },
        cassette:      { at: [0.15, 0.795, -1.33], from: [0.16, 1.02, -1.02], fov: 28 },
        report:        { at: [-0.38, 0.795, -1.42], from: [-0.35, 1.22, -0.95], fov: 36 },
        polaroid:      { at: [0.02, 0.79, -1.72], from: [0.06, 1.14, -1.28], fov: 30 },
        calendar:      { at: [-4.17, 1.55, -0.5], from: [-3.3, 1.55, -0.5], fov: 32 },
        lanyard_frame: { at: [-4.17, 1.5, -2.0], from: [-3.35, 1.5, -1.9], fov: 32 },
        skyline:       { at: [2, 10, -60], from: [0.8, 1.6, -3.0], fov: 55 },
        desk:          { at: [0.3, 0.82, -1.5], from: [1.55, 0.98, -1.05], fov: 40 },
        intercom:      { at: [-1.0, 0.82, -1.26], from: [-0.78, 1.1, -0.86], fov: 32 },
        // extras
        desk_end:      { at: [-0.9, 0.86, -1.2], from: [-0.05, 0.97, -1.0], fov: 40 },       // end of the prologue track along the desk
        calendar_ots:  { at: [-4.17, 1.55, -0.5], from: [0.32, 1.42, -2.78], fov: 30 },    // over Rue's shoulder to the calendar
        polaroid_down: { at: [0.64, 0.784, -1.42], from: [0.72, 0.96, -1.08], fov: 30 },    // where he sets the Polaroid (beside the phone)
        corner:        { at: [-0.2, 0.9, -2.0], from: [3.7, 2.8, 3.45], fov: 50 },         // the prologue WIDE, high from the far corner
        rue_close:     { at: [0, 1.22, -2.36], from: [0.2, 1.25, -1.3], fov: 35 },         // Rue at his desk, eye level across it
        lamp:          { at: [0.8, 1.2, -1.7], from: [0.3, 1.1, -0.9], fov: 36 },
        clock:         { at: [4.15, 2.35, 2.2], from: [3.2, 2.1, 2.2], fov: 32 },
        scarf:         { at: [-3.75, 1.35, 3.2], from: [-2.85, 1.5, 2.55], fov: 36 },
        door:          { at: [-2.6, 1.2, 3.75], from: [-1.6, 1.6, 1.2], fov: 45 },
      },
      cams: {
        corner_high: { type: 'fixed', pos: [3.7, 2.8, 3.45], look: [-0.2, 0.9, -2.0], fov: 50 },
        title_orbit: { type: 'fixed', pos: [2.0, 1.5, -0.2], look: [0.78, 0.88, -1.56], fov: 40 },
        door_view:   { type: 'pan', pos: [-3.75, 2.7, -3.05], base: [-0.5, 0.9, 2.2], look: 'player', fov: 52, limit: 0.5 },
      },
      zones: [
        { box: [-4.2, 1.2, 4.2, 3.8], cam: 'door_view' },
        { box: [-4.2, -3.4, 4.2, 1.2], cam: 'corner_high' },
      ],
      colliders: [
        [-4.6, -3.8, 4.6, -3.36], [-4.6, -3.4, -4.2, 4.2], [4.2, -3.4, 4.6, 4.2], [-4.6, 3.8, 4.6, 4.2],
        [-1.22, -2.02, 1.22, -0.98], [-4.2, -2.7, -3.7, 0.22], [3.84, -1.6, 4.2, 1.1],
        [1.0, 2.95, 3.6, 3.8], [1.7, 2.05, 2.9, 2.65], [3.5, -3.15, 4.0, -2.65], [-3.9, 3.1, -3.5, 3.5],
      ],
      props: ['brick_phone', 'charge_light', 'polaroid'],
      ambience: { rain: false, loops: ['clock_tick', 'city'], room: 'room' },
    };
  })();

  // =================================================================== EXAMHALL (Trinity Exam Hall, 23 Oct 1987)
  // Grand and symmetrical: dais with lectern and organ case at the north end (z -13), judges' table on the floor
  // in front of it (Hartigan + Fenwick's empty chair), pews either side of a red-carpeted aisle, portraits and tall
  // windows between pilasters, three chandeliers, a gallery over the back doorway (z 13) and a vestibule behind it.
  // The offstage anteroom (x 7..11, same level as the dais) opens off the dais. floor(): dais + anteroom at 0.45.
  // Props: notes (Rue's notes on the lectern), yacht_board, crowd (instanced seated students; they fidget).
  SETS.examhall = (() => {
    const WALL = 0xd9d1bd, PIL = 0xe6dfcc, GILT = 0xc9a24e, OAK = 0x6a4a2c, OAK2 = 0x553a22, RED = 0x7a1a20;
    const ROWS = 12, ROW0 = -3.8, SEAT0 = 1.3, SEATW = 0.62;
    const seat = (i, side, j) => [side * (SEAT0 + j * SEATW), 0, ROW0 + i, PI];
    const NAMED = {
      aud_chase: [1, -1, 0], aud_luka: [1, -1, 1], aud_bernie: [2, 1, 0], aud_declan: [3, 1, 2],
      aud_1: [0, -1, 3], aud_2: [0, 1, 4], aud_3: [2, -1, 4], aud_4: [3, -1, 1],
      aud_5: [4, 1, 5], aud_6: [5, -1, 6], aud_7: [5, 1, 1], aud_8: [6, -1, 2],
    };
    const marks = {
      lectern: [0, 0.45, -10.55, 0], judge: [-0.75, 0, -5.95, PI], fenwick_chair: [0.75, 0, -5.95, PI],
      finalist: [-4.3, 0.45, -10.7, 0.25], doorway_back: [0, 0, 13.05, PI], back_of_hall: [0, 0, 11.3, PI],
      offstage_rue: [8.6, 0.45, -11.6, 0.64], offstage_luka: [9.95, 0.45, -11.55, -0.82],
      // extras
      finalist_stand: [-2.3, 0.45, -10.1, 0.5], rue_chair: [-5.1, 0.45, -10.7, 0.25], side_door: [6.5, 0.45, -11.3, -H],
      anteroom_door: [7.6, 0.45, -11.3, H], steps_bottom: [0, 0, -7.6, PI], aisle_mid: [0, 0, 2.0, PI], vestibule: [0, 0, 15.2, PI],
    };
    const anchors = {
      lectern_notes:  { at: [0, 1.6, -10.05], from: [0.55, 2.2, -10.78], fov: 34 },
      doorway_back:   { at: [0, 1.55, 13.05], from: [0.3, 1.6, 11.2], fov: 30 },
      portraits:      { at: [-6.9, 3.6, -3.0], from: [-4.4, 2.1, -1.9], fov: 42 },
      offstage_table: { at: [9.2, 1.3, -10.8], from: [9.2, 2.45, -9.55], fov: 46 },
      // extras
      hall_wide:      { at: [0, 2.4, -9], from: [0, 3.1, 12.3], fov: 50 },                // the symmetrical WIDE from the back
      lectern:        { at: [0, 1.95, -10.55], from: [0, 1.85, -7.4], fov: 32 },          // end of the slow push from the back
      audience:       { at: [0, 1.0, 4.0], from: [0, 2.15, -10.35], fov: 55 },           // Rue's view from the lectern
      judge:          { at: [-0.75, 1.2, -5.95], from: [-0.5, 1.45, -7.9], fov: 32 },
      fenwick_chair:  { at: [0.75, 0.8, -6.3], from: [1.9, 1.6, -8.5], fov: 34 },
      judges:         { at: [0, 1.0, -6.4], from: [0, 2.3, -9.6], fov: 45 },
      finalist:       { at: [-4.3, 1.62, -10.6], from: [-3.9, 1.75, -8.9], fov: 32 },
      poster:         { at: [3.55, 1.72, -9.85], from: [3.05, 1.75, -8.45], fov: 40 },
      yacht_board:    { at: [-3.35, 1.6, -9.75], from: [-2.9, 1.7, -8.5], fov: 36 },
      chandelier:     { at: [0, 6.4, 1], from: [2.2, 3.2, 4.6], fov: 40 },
      clock:          { at: [0, 4.8, 11.35], from: [0, 3.6, 8.4], fov: 28 },
      judge_pov:      { at: [0, 1.8, -10.3], from: [-0.75, 1.24, -6.3], fov: 40 },       // Hartigan's view up at the lectern
    };
    for (const k in NAMED) {
      const [i, side, j] = NAMED[k], m = seat(i, side, j);
      marks[k] = m;
      anchors[k] = { at: [m[0], 1.18, m[2] - 0.03], from: [m[0] - side * 0.28, 1.32, m[2] - 0.86], fov: 32 };
    }
    let heads = null;
    const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _qq = new THREE.Quaternion(), _col = new THREE.Color();

    const tex = {
      floor: () => T('ex_floor', 128, 128, (c, w, h) => {
        c.fillStyle = '#c8a070'; c.fillRect(0, 0, w, h);
        const r = rng(31);
        for (let y = 0; y < 8; y++) for (let x = -1; x < 2; x++) {
          const v = 0.8 + r() * 0.35; c.fillStyle = `rgb(${200 * v | 0},${150 * v | 0},${100 * v | 0})`;
          c.fillRect(x * 64 + (y % 2) * 32, y * 16, 63, 15);
        }
        noise(c, w, h, 500, 4, 0.15);
      }, { repeat: [1, 1] }),
      window: () => glow('ex_window', 64, 128, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e4e8ec'); g.addColorStop(1, '#b4bcc4');
        c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = 'rgba(140,150,160,0.5)'; c.fillRect(0, h * 0.72, w, h * 0.28);          // rooftops across Front Square
        c.fillStyle = '#6a6458'; for (let x = 0; x <= w; x += 16) c.fillRect(x - 1, 0, 2, h); for (let y = 0; y <= h; y += 20) c.fillRect(0, y - 1, w, 2);
        c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h); c.fillRect(0, h - 3, w, 3);
      }),
      portraits: () => T('ex_portraits', 256, 256, (c, w, h) => {
        const P = [['#3a2e1e', '#1a1614', '#e8c8a8', '#f0ece0', 'wig'], ['#2e3226', '#6a1a1a', '#e0b898', '#f0e8d8', 'bald'], ['#2a2420', '#141414', '#ecd0b4', '#f2f0ea', 'dark'],
          ['#3a3224', '#1a1a20', '#e8c4a4', '#f0ece2', 'grey'], ['#26221c', '#1a1414', '#f0d4bc', '#f4f0e8', 'woman'], ['#342a1e', '#2a2a44', '#e4c0a0', '#e8e0d0', 'grey'],
          ['#2c2a22', '#5a1414', '#e8c8a8', '#f0e8d8', 'wig'], ['#3a3026', '#141418', '#e0bc9c', '#f2eee4', 'dark']];
        P.forEach(([bg, robe, skin, collar, hair], i) => {
          const x = (i % 4) * 64, y = (i / 4 | 0) * 128;
          const g = c.createRadialGradient(x + 32, y + 40, 4, x + 32, y + 60, 70); g.addColorStop(0, bg); g.addColorStop(1, '#0e0c0a');
          c.fillStyle = bg; c.fillRect(x, y, 64, 128); c.fillStyle = g; c.globalAlpha = 0.6; c.fillRect(x, y, 64, 128); c.globalAlpha = 1;
          c.fillStyle = robe; c.beginPath(); c.moveTo(x + 6, y + 128); c.lineTo(x + 12, y + 70); c.quadraticCurveTo(x + 32, y + 56, x + 52, y + 70); c.lineTo(x + 58, y + 128); c.fill();
          c.fillStyle = collar; c.beginPath(); c.moveTo(x + 24, y + 62); c.lineTo(x + 32, y + 80); c.lineTo(x + 40, y + 62); c.fill();
          c.fillStyle = skin; c.beginPath(); c.ellipse(x + 32, y + 46, 11, 14, 0, 0, PI * 2); c.fill();
          c.fillStyle = hair === 'wig' ? '#e8e4dc' : hair === 'grey' ? '#a8a49c' : hair === 'woman' ? '#3a2a1e' : hair === 'dark' ? '#2a1e14' : skin;
          if (hair === 'wig') { c.beginPath(); c.ellipse(x + 32, y + 42, 17, 20, 0, PI, 0); c.fill(); c.fillRect(x + 15, y + 42, 7, 24); c.fillRect(x + 42, y + 42, 7, 24); }
          else if (hair === 'woman') { c.beginPath(); c.ellipse(x + 32, y + 40, 14, 14, 0, PI, 0); c.fill(); c.fillRect(x + 18, y + 40, 5, 18); c.fillRect(x + 41, y + 40, 5, 18); }
          else if (hair !== 'bald') { c.beginPath(); c.ellipse(x + 32, y + 38, 12, 8, 0, PI, 0); c.fill(); }
          else { c.fillStyle = '#a8a49c'; c.fillRect(x + 20, y + 42, 3, 8); c.fillRect(x + 41, y + 42, 3, 8); }
          c.fillStyle = '#2a1e18'; c.fillRect(x + 27, y + 45, 3, 2); c.fillRect(x + 34, y + 45, 3, 2); c.fillRect(x + 29, y + 53, 6, 1);
          if (i % 3 === 0) { c.fillStyle = '#d8d0b8'; c.fillRect(x + 40, y + 96, 12, 16); }                 // a book / a scroll
        });
        noise(c, w, h, 1800, 12, 0.12);
      }),
      poster: () => T('ex_poster', 128, 176, (c, w, h) => {
        c.fillStyle = '#f2ead4'; c.fillRect(0, 0, w, h); c.fillStyle = '#1e3a6a'; c.fillRect(0, 0, w, 40);
        txt(c, 'TRINITY', w / 2, 13, `bold 13px ${SERIF}`, '#f2ead4'); txt(c, 'ENTERPRISE PRIZE 1987', w / 2, 29, `bold 9px ${SERIF}`, '#f2d88a');
        txt(c, 'FINAL', w / 2, 58, `bold 20px ${SERIF}`, '#1e3a6a');
        txt(c, 'Friday 23 October', w / 2, 80, `10px ${SERIF}`, '#222'); txt(c, 'The Examination Hall', w / 2, 94, `italic 10px ${SERIF}`, '#222');
        txt(c, 'Judge:', w / 2, 116, `9px ${SERIF}`, '#444'); txt(c, 'Mr G. Fenwick', w / 2, 130, `bold 10px ${SERIF}`, '#222');
        c.save(); c.translate(w / 2, 131); c.rotate(-0.06); c.fillStyle = '#fbfaf4'; c.fillRect(-48, -9, 96, 18); txt(c, 'Prof. Hartigan', 0, 0, `bold 11px ${HAND}`, '#1a1a1a'); c.restore();   // pasted over
        txt(c, 'Winner: a graduate placement in the City', w / 2, 156, `7px ${SERIF}`, '#444');
      }),
      yacht: () => T('ex_yacht', 128, 128, (c, w, h) => {
        c.fillStyle = '#fafafa'; c.fillRect(0, 0, w, h);
        txt(c, 'YACHT PHONE', w / 2, 16, `bold 16px ${SANS}`, '#0a3a8a');
        c.fillStyle = '#3a78c8'; c.fillRect(0, 88, w, 16);
        c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 2; c.beginPath(); c.moveTo(30, 86); c.lineTo(98, 86); c.lineTo(88, 96); c.lineTo(40, 96); c.closePath(); c.fill(); c.stroke();
        c.beginPath(); c.moveTo(64, 84); c.lineTo(64, 36); c.lineTo(92, 80); c.closePath(); c.stroke(); c.beginPath(); c.moveTo(62, 40); c.lineTo(38, 80); c.lineTo(62, 80); c.stroke();
        c.fillStyle = '#222'; c.fillRect(74, 70, 10, 6); c.beginPath(); c.moveTo(79, 70); c.quadraticCurveTo(96, 50, 104, 60); c.stroke();   // the phone, with a curly cord
        txt(c, 'a car phone, but for yachts', w / 2, 116, `italic 9px ${SERIF}`, '#222');
      }),
      cards: () => T('ex_cards', 128, 64, (c, w, h) => {
        c.fillStyle = '#f6f3ea'; c.fillRect(0, 0, w, h);
        txt(c, 'PROF. HARTIGAN', w / 2, 16, `bold 12px ${SERIF}`, '#1a1a1a'); c.fillStyle = '#999'; c.fillRect(0, 31, w, 2);
        txt(c, 'MR G. FENWICK', w / 2, 48, `bold 12px ${SERIF}`, '#1a1a1a');
      }),
      notes: () => T('ex_notes', 64, 80, (c, w, h) => {
        c.fillStyle = '#f4f1e6'; c.fillRect(0, 0, w, h);
        txt(c, 'PITCH', 8, 9, `bold 9px ${HAND}`, '#1a2a6a', 'left');
        c.strokeStyle = '#2a3a8a'; c.lineWidth = 1; const r = rng(3);
        for (let y = 20; y < 76; y += 7) { c.beginPath(); c.moveTo(6, y); for (let x = 6; x < 58 - r() * 14; x += 4) c.lineTo(x, y + (r() - 0.5) * 2); c.stroke(); }
        c.strokeStyle = '#c02020'; c.beginPath(); c.moveTo(6, 30); c.lineTo(50, 36); c.stroke();
      }),
      clock: () => T('ex_clock', 64, 64, (c, w, h) => {
        c.fillStyle = '#f2ecdc'; c.fillRect(0, 0, w, h);
        const R = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
        for (let i = 0; i < 12; i++) { const a = i / 12 * PI * 2; txt(c, R[i], 32 + Math.sin(a) * 23, 32 - Math.cos(a) * 23, `bold 6px ${SERIF}`, '#1a1a1a'); }
        c.strokeStyle = '#111'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + Math.sin(3.1) * 12, 32 - Math.cos(3.1) * 12); c.stroke();   // ~3:05
        c.lineWidth = 1.5; c.beginPath(); c.moveTo(32, 32); c.lineTo(32 + Math.sin(0.5) * 19, 32 - Math.cos(0.5) * 19); c.stroke();
      }),
      silence: () => T('ex_silence', 128, 48, (c, w, h) => {
        c.fillStyle = '#1a2a4a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9a24e'; c.lineWidth = 2; c.strokeRect(3, 3, w - 6, h - 6);
        txt(c, 'SILENCE', w / 2, 17, `bold 13px ${SERIF}`, '#f2ead4'); txt(c, 'EXAMINATION IN PROGRESS', w / 2, 34, `8px ${SERIF}`, '#f2ead4');
      }),
      crest: () => T('ex_crest', 64, 64, (c, w, h) => {
        c.fillStyle = '#5a3a22'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#1e3a6a'; c.beginPath(); c.moveTo(14, 10); c.lineTo(50, 10); c.lineTo(50, 34); c.quadraticCurveTo(50, 52, 32, 58); c.quadraticCurveTo(14, 52, 14, 34); c.fill();
        c.strokeStyle = '#d8b050'; c.lineWidth = 2; c.stroke();
        c.fillStyle = '#d8b050'; c.fillRect(24, 20, 16, 12); c.fillRect(30, 32, 4, 14); c.fillRect(22, 42, 20, 3);   // a book + a castle, more or less
      }),
      notices: () => T('ex_notices', 128, 96, (c, w, h) => {
        c.fillStyle = '#6a4a2c'; c.fillRect(0, 0, w, h); c.fillStyle = '#8a6a44'; c.fillRect(4, 4, w - 8, h - 8);
        const N = [['#f2eee0', 'EXAM TIMETABLE'], ['#f6e08a', 'SOCIETIES WEEK'], ['#f2eee0', 'NO SMOKING'], ['#c8e0f0', 'ENTERPRISE PRIZE']];
        N.forEach(([col, t], i) => { const x = 8 + (i % 2) * 60, y = 8 + (i / 2 | 0) * 44; c.fillStyle = col; c.fillRect(x, y, 52, 38); txt(c, t, x + 26, y + 9, `bold 6px ${SANS}`, '#222'); c.fillStyle = '#999'; for (let k = 18; k < 34; k += 4) c.fillRect(x + 5, y + k, 42, 1); c.fillStyle = '#c02020'; c.fillRect(x + 24, y + 1, 4, 3); });
      }),
      bulb: () => mat(0xfff4dc, { emissive: 0xffd98a }),
      mirror: () => mat(0x9aa8b4, { emissive: 0x4a5058 }),
    };

    // one merged geometry out of a throwaway Builder (colours baked)
    function geoOf(fn) { const pb = b; b = new Builder(); fn(); const g = b.done().children[0].geometry; b = pb; return g; }
    function crowd(g) {
      const r = rng(1987), bodyG = geoOf(() => {
        boxR(0.42, 0.52, 0.26, 0xffffff, 0, 0.82, -0.03, -0.06);
        for (const sx of [-1, 1]) { boxR(0.11, 0.36, 0.12, 0xffffff, sx * 0.265, 0.88, -0.01); boxR(0.1, 0.1, 0.34, 0xffffff, sx * 0.2, 0.63, 0.17); }
        boxR(0.3, 0.05, 0.28, 0xffffff, 0, 1.06, -0.03);
      });
      const legG = geoOf(() => {
        boxR(0.37, 0.15, 0.46, 0xffffff, 0, 0.515, 0.23); boxR(0.34, 0.44, 0.13, 0xffffff, 0, 0.24, 0.44);
        for (const sx of [-1, 1]) boxR(0.13, 0.08, 0.24, 0x2a2622, sx * 0.09, 0.04, 0.5);
      });
      const HEADS = [[0xefc8a8, 0x2a1c14, 'short'], [0xf2d0b4, 0x6a4424, 'long'], [0xf0c4a4, 0xa8542a, 'big'], [0xeccaa8, 0xd8b070, 'big'], [0xe0b490, 0x1e1612, 'long']];
      const headG = HEADS.map(([skin, hair, style]) => geoOf(() => {
        boxR(0.1, 0.1, 0.1, skin, 0, 0.04, 0); boxR(0.2, 0.25, 0.22, skin, 0, 0.18, 0.01);
        for (const sx of [-1, 1]) boxR(0.035, 0.022, 0.006, 0x2a1e18, sx * 0.045, 0.2, 0.122);
        boxR(0.06, 0.015, 0.006, 0xa05a50, 0, 0.11, 0.122);
        const big = style === 'big' ? 1.25 : 1;
        boxR(0.23 * big, 0.08, 0.25 * big, hair, 0, 0.31, 0);
        boxR(0.23 * big, style === 'long' ? 0.34 : style === 'big' ? 0.26 : 0.14, 0.07, hair, 0, style === 'long' ? 0.17 : 0.24, -0.1 * big);
        if (style !== 'short') for (const sx of [-1, 1]) boxR(0.04, style === 'long' ? 0.28 : 0.2, 0.2, hair, sx * 0.115 * big, 0.2, -0.01);
      }));
      const bodies = [], legs = [], hl = HEADS.map(() => []), bodyC = [], legC = [];
      const skip = new Set();
      for (const k in NAMED) { const [i, side, j] = NAMED[k]; skip.add(`${i},${side},${j}`); skip.add(`${i - 1},${side},${j}`); skip.add(`${i - 1},${side},${j + 1}`); }   // keep the insert lens clear
      const KNIT = [0x2f5a3a, 0x7a2a30, 0xc8a040, 0x2a3560, 0xe6dcc0, 0x8a8a8a, 0x2a7a7a, 0x5a3a70, 0xd08090, 0xb05a2a, 0x3a6a9a, 0x9a3a5a, 0xa07850, 0x26304a];
      const TROU = [0x3a5070, 0x222226, 0x6a4a30, 0x555555, 0x7a90b0, 0x3a3a4a, 0x8a7a5a];
      for (let i = 0; i < ROWS; i++) for (const side of [-1, 1]) for (let j = 0; j < 8; j++) {
        if (skip.has(`${i},${side},${j}`) || r() > (i < 7 ? 0.62 : 0.4)) continue;
        const [x, , z] = seat(i, side, j), ry = PI + (r() - 0.5) * 0.3, sc = 0.94 + r() * 0.1;
        bodies.push([x, 0, z, ry, sc]); legs.push([x, 0, z, ry, sc]);
        hl[r() * HEADS.length | 0].push([x - Math.sin(ry) * 0.03 * sc, 1.08 * sc, z - Math.cos(ry) * 0.03 * sc, ry, sc]);
        bodyC.push(KNIT[r() * KNIT.length | 0]); legC.push(TROU[r() * TROU.length | 0]);
      }
      const m = mat(0xffffff), grp = new THREE.Group(); grp.name = 'crowd';
      const ib = instanced(bodyG, m, bodies), il = instanced(legG, m, legs);
      bodyC.forEach((c, i) => ib.setColorAt(i, _col.set(c))); legC.forEach((c, i) => il.setColorAt(i, _col.set(c)));
      grp.add(ib, il);
      heads = [];
      hl.forEach((list, k) => {
        if (!list.length) return;
        const im = instanced(headG[k], m, list); im.userData.list = list; heads.push(im); grp.add(im);
      });
      g.add(grp);
    }

    function build() {
      b = new Builder();
      const root = new THREE.Group();
      const winM = tex.window(), porM = tex.portraits(), bulbM = tex.bulb();
      // ---------------------------------------------------------- floor, dais, steps, aisle runner
      bb(-7, -0.1, -13, 7, 0, 13, 0xffffff, tex.floor(), 2.2);
      bb(-7, 0, -13, 7, 0.45, -8.7, 0x6a4428); bb(-7, 0.45, -8.78, 7, 0.49, -8.66, OAK2);           // dais + nosing
      bb(-6.2, 0.45, -12.1, 6.2, 0.46, -9.0, RED);                                                  // dais carpet
      bb(-1.5, 0, -8.4, 1.5, 0.15, -8.1, 0x6a4428); bb(-1.5, 0, -8.7, 1.5, 0.3, -8.4, 0x6a4428);
      bb(-0.7, 0.15, -8.4, 0.7, 0.16, -8.1, RED); bb(-0.7, 0.3, -8.7, 0.7, 0.31, -8.4, RED);
      bb(-0.7, 0, -8.1, 0.7, 0.012, 13, RED); bb(-0.75, 0, -8.1, -0.7, 0.014, 13, GILT); bb(0.7, 0, -8.1, 0.75, 0.014, 13, GILT);
      // ---------------------------------------------------------- walls: oak wainscot, plaster, pilasters, windows, portraits
      const side = (sx) => {
        const xw = sx * 7, xo = sx * 7.3, xi = sx * 6.97;
        if (sx < 0) bb(xw, 0, -13, xo, 9, 13, WALL);
        else { bb(xw, 0, -13, xo, 9, -11.8, WALL); bb(xw, 0, -10.8, xo, 9, 13, WALL); bb(xw, 2.75, -11.8, xo, 9, -10.8, WALL); }
        for (const [z0, z1] of sx < 0 ? [[-13, 13]] : [[-13, -11.8], [-10.8, 13]]) { bb(xi, 0, z0, xw, 1.25, z1, OAK); bb(xi - sx * 0.04, 1.2, z0, xw, 1.3, z1, OAK2); }   // wainscot (gap for the anteroom door)
        for (let z = -13; z <= 11; z += 4) {
          bb(xi - sx * 0.25, 0, z - 0.3, xw, 8.2, z + 0.3, PIL);
          bb(xi - sx * 0.32, 7.7, z - 0.38, xw, 8.2, z + 0.38, GILT);
          bb(xi - sx * 0.3, 0, z - 0.36, xw, 1.3, z + 0.36, OAK2);
        }
        for (const z of [-7, 1, 9]) {                                                                // tall arched windows
          quad(1.7, 4.4, winM, xi - sx * 0.01, 4.3, z, -sx * H);
          { const g = new THREE.CircleGeometry(0.85, 12, 0, PI); g.rotateY(-sx * H); g.translate(xi - sx * 0.01, 6.5, z); put(g, 0xffffff, winM); }
          bb(xi - sx * 0.08, 1.95, z - 1.05, xw, 2.1, z + 1.05, PIL);
          bb(xi - sx * 0.06, 2.1, z - 1.0, xw, 6.5, z - 0.85, PIL); bb(xi - sx * 0.06, 2.1, z + 0.85, xw, 6.5, z + 1.0, PIL);
          bb(xi - sx * 0.25, 1.3, z - 0.8, xi - sx * 0.05, 1.9, z + 0.8, 0xb8b4ac);                   // radiator
          for (let k = -0.7; k <= 0.71; k += 0.1) bb(xi - sx * 0.27, 1.32, z + k - 0.02, xi - sx * 0.05, 1.86, z + k + 0.02, 0xa8a49c);
        }
        portrait(xi, 3.7, -3, sx, sx > 0 ? 4 : 0, 1.3, 1.85); portrait(xi, 3.7, 5, sx, sx > 0 ? 5 : 1, 1.3, 1.85);
        portrait(xi, 4.6, -11, sx, sx > 0 ? 6 : 2, 1.1, 1.5);                                          // over the side doors
        bb(xi - sx * 0.08, 0.45, -11.95, xw, 3.0, -11.8, OAK2); bb(xi - sx * 0.08, 0.45, -10.8, xw, 3.0, -10.65, OAK2);
        bb(xi - sx * 0.08, 2.75, -11.95, xw, 3.1, -10.65, OAK2); bb(xi - sx * 0.1, 3.1, -12.05, xw, 3.2, -10.55, GILT);
      };
      const portrait = (xi, y, z, sx, n, w, h) => {
        const x = xi - sx * 0.05;
        bb(x - sx * 0.07, y - h / 2 - 0.1, z - w / 2 - 0.1, xi, y + h / 2 + 0.1, z + w / 2 + 0.1, GILT);
        quad(w, h, porM, x - sx * 0.075, y, z, -sx * H, 0, [(n % 4) / 4, n < 4 ? 0.5 : 0, (n % 4 + 1) / 4, n < 4 ? 1 : 0.5]);
        rod(x - sx * 0.05, y + h / 2 + 0.1, z - w / 3, xi, y + h / 2 + 1.2, z, 0.008, 0x5a4a30); rod(x - sx * 0.05, y + h / 2 + 0.1, z + w / 3, xi, y + h / 2 + 1.2, z, 0.008, 0x5a4a30);
      };
      side(-1); side(1);
      // west side door (closed, for symmetry); the east one opens into the anteroom
      bb(-6.97, 0.45, -11.7, -6.93, 2.75, -10.9, 0x4a3018); bb(-6.93, 1.5, -11.0, -6.9, 1.56, -10.95, GILT);
      // north wall + organ case
      bb(-7, 0, -13.3, 7, 9, -13, WALL); bb(-7, 0.45, -13.0, 7, 1.7, -12.96, OAK);
      bb(-3.3, 0.45, -13, 3.3, 3.2, -12.2, 0x4a2c18); bb(-3.4, 3.2, -13, 3.4, 3.35, -12.1, GILT);
      bb(-3.1, 3.35, -13, 3.1, 7.6, -12.5, 0x3e2414);
      for (const [cx, n, hmax] of [[-2.3, 5, 3.6], [0, 7, 4.2], [2.3, 5, 3.6]]) {
        bb(cx - 0.75, 3.35, -12.5, cx + 0.75, 3.35 + hmax + 0.4, -12.2, 0x4a2c18); bb(cx - 0.82, 3.35 + hmax + 0.4, -12.55, cx + 0.82, 3.35 + hmax + 0.6, -12.15, GILT);
        for (let k = 0; k < n; k++) { const x = cx - 0.6 + k * 1.2 / (n - 1), hh = hmax * (0.62 + 0.38 * (1 - Math.abs(k - (n - 1) / 2) / ((n - 1) / 2))); cyl(0.07, 0.07, hh, 8, 0xd8b460, x, 3.4 + hh / 2, -12.1); cyl(0.04, 0.07, 0.12, 8, 0x8a6a30, x, 3.4 + 0.06, -12.1); }
      }
      quad(0.9, 0.9, tex.crest(), 0, 2.0, -12.19);
      for (const sx of [-1, 1]) {                                                                  // two big portraits flank the organ
        const n = sx > 0 ? 3 : 7;
        bb(sx * 5.1 - 0.8, 3.1, -12.97, sx * 5.1 + 0.8, 5.3, -12.9, GILT);
        quad(1.4, 2.0, porM, sx * 5.1, 4.2, -12.895, 0, 0, [(n % 4) / 4, n < 4 ? 0.5 : 0, (n % 4 + 1) / 4, n < 4 ? 1 : 0.5]);
      }
      // south wall with the back doorway, the gallery over it, the clock
      bb(-7, 0, 13, -1.1, 9, 13.3, WALL); bb(1.1, 0, 13, 7, 9, 13.3, WALL); bb(-1.1, 3.2, 13, 1.1, 9, 13.3, WALL);
      bb(-7, 0, 12.96, -1.1, 1.25, 13, OAK); bb(1.1, 0, 12.96, 7, 1.25, 13, OAK);
      for (const sx of [-1, 1]) { bb(sx * 1.1 - 0.2, 0, 12.9, sx * 1.1 + 0.2, 3.4, 13.02, PIL); boxR(0.06, 2.9, 0.9, OAK2, sx * 1.2, 1.45, 12.5, 0, -sx * 0.12); }
      bb(-1.5, 3.4, 12.85, 1.5, 3.6, 13.02, GILT);
      bb(-7, 4.0, 11.3, 7, 4.3, 13, 0xd8d0bc); bb(-7, 4.3, 11.25, 7, 4.45, 11.4, OAK2); bb(-7, 5.2, 11.25, 7, 5.3, 11.4, OAK2);
      for (let x = -6.8; x <= 6.8; x += 0.35) cyl(0.035, 0.05, 0.75, 6, OAK, x, 4.82, 11.32);
      bb(-7, 3.8, 11.28, 7, 4.0, 11.4, GILT);
      for (const sx of [-1, 1]) { cyl(0.2, 0.22, 4.0, 10, PIL, sx * 3.2, 2.0, 11.5); bb(sx * 3.2 - 0.3, 3.75, 11.2, sx * 3.2 + 0.3, 4.0, 11.8, GILT); }
      cyl(0.36, 0.36, 0.08, 16, GILT, 0, 4.8, 11.2, H); { const g = new THREE.CircleGeometry(0.32, 16); g.rotateY(PI); g.translate(0, 4.8, 11.15); put(g, 0xffffff, tex.clock()); }
      // cornice + coffered ceiling
      bb(-7.3, 9, -13.3, 7.3, 9.2, 13.3, 0xe4dcc8);
      for (const sx of [-1, 1]) { bb(sx * 6.57, 8.2, -13, sx * 6.97, 9, 13, 0xd6ceb8); bb(sx * 6.47, 8.1, -13, sx * 6.57, 8.25, 13, GILT); }
      bb(-7, 8.2, -12.97, 7, 9, -12.6, 0xd6ceb8); bb(-7, 8.2, 12.6, 7, 9, 12.97, 0xd6ceb8);
      for (let z = -13; z <= 13; z += 4) bb(-7, 8.6, z - 0.2, 7, 9, z + 0.2, 0xd8d0ba);
      for (const x of [-3.5, 0, 3.5]) bb(x - 0.15, 8.7, -13, x + 0.15, 9, 13, 0xd8d0ba);
      for (let z = -11; z <= 11; z += 4) for (const x of [-1.75, 1.75, -5.25, 5.25]) cyl(0.35, 0.35, 0.05, 12, GILT, x, 8.98, z);
      // ---------------------------------------------------------- chandeliers
      for (const z of [-5, 1, 7]) {
        rod(0, 9, z, 0, 7.0, z, 0.02, 0x3a2e1a);
        cyl(0.06, 0.06, 0.9, 8, GILT, 0, 6.6, z); cyl(0.32, 0.12, 0.18, 12, GILT, 0, 6.15, z); cyl(0.12, 0.02, 0.3, 8, GILT, 0, 5.9, z);
        for (const [rad, y, n] of [[0.8, 6.3, 10], [0.5, 6.85, 6]]) {
          for (let k = 0; k < n; k++) {
            const a = k / n * PI * 2 + y, x = Math.sin(a) * rad, zz = z + Math.cos(a) * rad;
            rod(0, y - 0.15, z, x, y, zz, 0.012, GILT, undefined, 4);
            cyl(0.03, 0.03, 0.1, 6, 0xf2eee4, x, y + 0.05, zz);
            { const g = new THREE.IcosahedronGeometry(0.045, 0); g.translate(x, y + 0.15, zz); put(g, 0xffffff, bulbM); }
          }
        }
      }
      // ---------------------------------------------------------- lectern, easels, finalists' chairs, water table
      bb(-0.34, 0.45, -10.25, 0.34, 1.45, -9.8, OAK); bb(-0.38, 0.45, -10.3, 0.38, 0.55, -9.76, OAK2);
      boxR(0.7, 0.05, 0.52, OAK2, 0, 1.5, -10.02, -0.3);
      boxR(0.66, 0.03, 0.03, OAK2, 0, 1.45, -9.78);
      quad(0.4, 0.4, tex.crest(), 0, 1.0, -9.795);
      const easel = (x, z, ry, m, w, h) => {
        const cx = Math.sin(ry), cz = Math.cos(ry);
        for (const s of [-1, 1]) rod(x + s * 0.35 * cz, 0.45, z - s * 0.35 * cx, x + s * 0.2 * cz, 2.3, z - s * 0.2 * cx, 0.02, OAK2);
        rod(x - cx * 0.4, 0.45, z - cz * 0.4, x, 2.1, z, 0.02, OAK2);
        box(w + 0.06, 0.04, 0.08, OAK2, x + cx * 0.05, 1.05, z + cz * 0.05, ry);
        box(w, h, 0.02, 0xe8e0cc, x + cx * 0.06, 1.09, z + cz * 0.06, ry);
        quad(w, h, m, x + cx * 0.075, 1.09 + h / 2, z + cz * 0.075, ry);
      };
      easel(3.55, -9.95, -0.25, tex.poster(), 0.8, 1.1);
      for (const x of [-4.3, -5.1]) chair(x, 0.45, -10.8, 0);
      bb(1.3, 0.45, -10.6, 1.9, 1.2, -10.1, OAK); cyl(0.06, 0.05, 0.22, 8, 0xd8e4ec, 1.5, 1.31, -10.35); cyl(0.035, 0.03, 0.1, 8, 0xd8e4ec, 1.72, 1.25, -10.3);
      // ---------------------------------------------------------- judges' table (baize) with name cards, jug, papers; two chairs
      bb(-1.7, 0, -7.2, 1.7, 0.74, -6.4, 0x244a32); bb(-1.72, 0.74, -7.22, 1.72, 0.76, -6.38, 0x2a5a3a);
      for (const [x, v] of [[-0.75, 0], [0.75, 1]]) {
        boxR(0.36, 0.13, 0.004, 0xf6f3ea, x, 0.83, -6.72, 0.3); boxR(0.36, 0.13, 0.004, 0xf6f3ea, x, 0.83, -6.66, -0.3);
        quad(0.34, 0.1, tex.cards(), x, 0.831, -6.7245, PI, -0.3, [0, v ? 0 : 0.5, 1, v ? 0.5 : 1]);
        box(0.21, 0.01, 0.3, 0xf2f0e8, x + 0.05, 0.76, -6.95 + 0.4, 0.1);
        chair(x, 0, -5.95, PI);
      }
      cyl(0.07, 0.06, 0.24, 10, 0xc8d8e4, 0, 0.88, -6.8); cyl(0.035, 0.03, 0.1, 8, 0xd8e4ec, -0.3, 0.81, -6.55); cyl(0.035, 0.03, 0.1, 8, 0xd8e4ec, 0.3, 0.81, -6.55);
      rod(-0.4, 0.765, -6.5, -0.28, 0.765, -6.45, 0.005, 0x1a1a1a);
      // ---------------------------------------------------------- pews
      for (let i = 0; i < ROWS; i++) for (const sx of [-1, 1]) {
        const z = ROW0 + i, x0 = sx * 0.9, x1 = sx * 6.25, lo = Math.min(x0, x1), hi = Math.max(x0, x1);
        bb(lo, 0.4, z - 0.22, hi, 0.45, z + 0.22, OAK); bb(lo, 0.08, z - 0.18, hi, 0.4, z - 0.14, OAK2);
        boxR(hi - lo, 0.5, 0.05, OAK, (lo + hi) / 2, 0.72, z + 0.3, 0.1);
        bb(lo, 0.8, z + 0.33, hi, 0.84, z + 0.45, OAK2);                                             // hymn-book ledge for the row behind
        for (const x of [x0, x1]) { bb(x - 0.04, 0, z - 0.3, x + 0.04, 1.0, z + 0.4, OAK2); cyl(0.07, 0.07, 0.08, 8, OAK2, x, 1.02, z + 0.05); }
      }
      // ---------------------------------------------------------- the vestibule behind the back doorway
      bb(-2.5, -0.1, 13.0, 2.5, 0, 16.5, 0x8a8478); for (let z = 13.3; z < 16.5; z += 0.6) bb(-2.5, 0, z, 2.5, 0.004, z + 0.02, 0x6a6458);
      bb(-2.8, 0, 13.3, -2.5, 3.6, 16.5, 0xc8c0ac); bb(2.5, 0, 13.3, 2.8, 3.6, 16.5, 0xc8c0ac); bb(-2.8, 0, 16.5, 2.8, 3.6, 16.8, 0xc8c0ac); bb(-2.8, 3.6, 13.3, 2.8, 3.8, 16.8, 0xd8d0bc);
      bb(-1.0, 0, 16.45, 1.0, 2.6, 16.5, 0x4a3018); bb(-1.1, 2.6, 16.44, 1.1, 2.7, 16.5, PIL);
      { const g = new THREE.CircleGeometry(0.95, 12, 0, PI); g.translate(0, 2.7, 16.44); put(g, 0xffffff, winM); }      // fanlight over the outer door
      quad(1.1, 0.82, tex.notices(), 2.47, 1.6, 14.9, -H);
      bb(-2.5, 0.4, 14.0, -2.1, 0.45, 15.8, OAK); bb(-2.5, 0, 14.05, -2.15, 0.4, 14.15, OAK2); bb(-2.5, 0, 15.65, -2.15, 0.4, 15.75, OAK2);
      rod(0, 3.6, 15.0, 0, 3.0, 15.0, 0.01, 0x222222); { const g = new THREE.IcosahedronGeometry(0.1, 0); g.translate(0, 2.9, 15); put(g, 0xffffff, bulbM); }
      // ---------------------------------------------------------- the offstage anteroom (x 7..11, z -13..-8.6, floor 0.45)
      bb(7, 0.35, -13, 11, 0.45, -8.6, 0x6a4a30, tex.floor(), 2.2);
      bb(7.3, 0.45, -13.3, 11.3, 3.6, -13, 0x2e4a3a); bb(11, 0.45, -13, 11.3, 3.6, -8.6, 0x2e4a3a); bb(7, 0.45, -8.9, 11.3, 3.6, -8.6, 0x2e4a3a);
      bb(7.3, 0.45, -13, 11, 1.4, -12.96, OAK); bb(10.96, 0.45, -13, 11, 1.4, -8.9, OAK); bb(7.3, 0.45, -8.94, 11, 1.4, -8.9, OAK);
      bb(7, 3.6, -13.3, 11.3, 3.8, -8.6, 0xe0d8c4);
      boxR(0.05, 2.28, 0.98, 0x4a3018, 7.75, 1.6, -12.25, 0, -1.2);                                  // the door, open into the room
      quad(0.9, 1.3, glow('ex_ante_win', 32, 64, (c, w, h) => { c.fillStyle = '#c4ccd4'; c.fillRect(0, 0, w, h); c.fillStyle = '#6a6458'; c.fillRect(w / 2 - 1, 0, 2, h); for (let y = 0; y < h; y += 16) c.fillRect(0, y - 1, w, 2); }), 10.95, 2.4, -10.8, -H);
      bb(10.9, 1.7, -11.3, 11, 1.75, -10.3, PIL);
      bb(8.55, 1.2, -11.2, 9.85, 1.24, -10.4, OAK); bb(8.62, 1.08, -11.13, 9.78, 1.2, -10.47, OAK2);     // table
      for (const [x, z] of [[8.62, -11.13], [9.78, -11.13], [8.62, -10.47], [9.78, -10.47]]) bb(x - 0.03, 0.45, z - 0.03, x + 0.03, 1.2, z + 0.03, OAK2);
      { const rc = rng(6); for (let k = 0; k < 9; k++) boxR(0.13, 0.004, 0.08, 0xf6f3ea, 8.8 + rc() * 0.8, 1.245 + k * 0.001, -11.0 + rc() * 0.4, 0, rc() * 0.6 - 0.3); }
      cyl(0.035, 0.03, 0.1, 8, 0xd8e4ec, 9.6, 1.29, -10.55);
      chair(8.9, 0.45, -11.75, 0.2); chair(10.4, 0.45, -10.8, -H);
      quad(0.5, 0.8, tex.mirror(), 9.0, 2.0, -12.95); bb(8.72, 1.58, -12.99, 9.28, 2.42, -12.96, GILT);
      quad(0.6, 0.22, tex.silence(), 8.0, 2.4, -8.92, PI);
      cyl(0.15, 0.18, 0.03, 10, 0x2a1a10, 10.5, 0.46, -12.5); rod(10.5, 0.45, -12.5, 10.5, 2.2, -12.5, 0.02, 0x2a1a10);
      boxR(0.3, 0.7, 0.14, 0x3a3a3e, 10.45, 1.75, -12.45); rod(10.6, 0.47, -12.4, 10.62, 1.4, -12.42, 0.012, 0x1a1a1a);    // a coat, an umbrella
      bb(7.4, 0.45, -12.95, 8.3, 1.1, -12.8, 0xb8b4ac);
      rod(9.2, 3.6, -10.8, 9.2, 2.8, -10.8, 0.01, 0x222222); { const g = new THREE.IcosahedronGeometry(0.09, 0); g.translate(9.2, 2.72, -10.8); put(g, 0xffffff, bulbM); }
      root.add(b.done());

      // ---------------------------------------------------------- dynamic props
      const notes = part('notes', () => { box(0.21, 0.006, 0.28, 0xf4f1e6, 0, 0, 0); quad(0.21, 0.28, tex.notes(), 0, 0.0065, 0, PI, -H); }, [0, 1.525, -10.05]);
      notes.rotation.x = -0.3; root.add(notes);
      root.add(part('yacht_board', () => easel(-3.35, -9.85, 0.25, tex.yacht(), 0.8, 0.8)));
      crowd(root);
      return root;
    }
    function chair(x, y, z, ry) {                                                                   // 1987 bentwood-ish chair; the sitter faces +Z rotated by ry
      const c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
      boxR(0.46, 0.05, 0.44, OAK, x, y + 0.435, z, 0, ry);
      for (const [lx, lz] of [[-0.2, -0.18], [0.2, -0.18], [-0.2, 0.18], [0.2, 0.18]]) { const [px, pz] = P(lx, lz); rod(px, y, pz, px, y + 0.42, pz, 0.018, OAK2); }
      { const [px, pz] = P(0, -0.21); boxR(0.44, 0.44, 0.04, OAK, px, y + 0.7, pz, 0, ry); }
    }

    function update(dt, ctx) {
      if (!heads) return;
      const t = ctx.t;
      for (let k = 0; k < heads.length; k++) {
        const im = heads[k], L = im.userData.list;
        for (let i = 0; i < L.length; i++) {
          const h = L[i], ph = i * 1.7 + k * 3.1;
          _qq.setFromAxisAngle(UP, h[3] + 0.16 * Math.sin(t * 0.37 + ph) + 0.1 * Math.sin(t * 0.91 + ph * 2));
          _s.setScalar(h[4]);
          im.setMatrixAt(i, _m.compose(_p.set(h[0], h[1], h[2]), _qq, _s));
        }
        im.instanceMatrix.needsUpdate = true;
      }
    }

    return {
      env: { day: { bg: 0xc8c4b8, fog: [0xcac2b0, 0.012], hemi: [0xfff4e0, 0x6a5a48, 1.0], dir: [0xfff0d8, 1.15, [-6, 10, 5]] } },
      build, update, marks, anchors,
      cams: {
        hall_wide: { type: 'fixed', pos: [0, 3.1, 12.3], look: [0, 2.4, -9], fov: 50 },
        front:     { type: 'pan', pos: [5.9, 4.4, 5.6], base: [-0.6, 1.0, -7.6], look: 'player', fov: 45, limit: 0.5 },
        back:      { type: 'pan', pos: [-6.0, 4.2, -1.4], base: [0.6, 1.0, 9.0], look: 'player', fov: 45, limit: 0.55 },
        dais:      { type: 'pan', pos: [-3.6, 1.25, -5.4], base: [0.4, 1.9, -10.6], look: 'player', fov: 48, limit: 0.6 },
        anteroom:  { type: 'fixed', pos: [7.4, 2.75, -9.0], look: [9.7, 0.95, -11.9], fov: 60 },
        vestibule: { type: 'fixed', pos: [2.1, 2.7, 16.2], look: [-0.4, 1.1, 13.0], fov: 55 },
      },
      zones: [
        { box: [7, -13, 11, -8.6], cam: 'anteroom' },
        { box: [-7, -13, 7, -8.1], cam: 'dais' },
        { box: [-7, -8.1, 7, 3], cam: 'front' },
        { box: [-7, 3, 7, 13.1], cam: 'back' },
        { box: [-2.5, 13.1, 2.5, 16.5], cam: 'vestibule' },
      ],
      colliders: [
        [-7.3, -13.4, 7.3, -13], [-7.4, -13, -7, 13.3], [7, -13, 7.3, -11.8], [7, -10.8, 7.3, 13.3],
        [-7.3, 13, -1.1, 13.4], [1.1, 13, 7.3, 13.4], [-2.9, 13.3, -2.5, 16.9], [2.5, 13.3, 2.9, 16.9], [-2.9, 16.5, 2.9, 16.9],
        [7.3, -13.4, 11.4, -13], [11, -13, 11.4, -8.5], [7.3, -8.9, 11.4, -8.5], [8.55, -11.2, 9.85, -10.4],
        [-7, -8.78, -1.5, -8.66], [1.5, -8.78, 7, -8.66], [-3.4, -13, 3.4, -12.1], [-0.4, -10.3, 0.4, -9.76],
        [3.1, -10.3, 4.0, -9.6], [-3.8, -10.2, -2.9, -9.5], [1.3, -10.6, 1.9, -10.1],
        [-1.72, -7.22, 1.72, -6.38], [-6.25, -4.1, -0.86, 7.65], [0.86, -4.1, 6.25, 7.65],
        [-3.45, 11.25, -2.95, 11.75], [2.95, 11.25, 3.45, 11.75],
      ],
      floor(x, z) {
        if (x > 7 || z < -8.7) return 0.45;
        if (z < -8.1 && x > -1.5 && x < 1.5) return (z < -8.4 ? 0.3 : 0.15);
        return 0;
      },
      props: ['notes', 'yacht_board', 'crowd'],
      ambience: { rain: false, loops: ['clock_tick'], room: 'room' },
    };
  })();

  // =================================================================== JARVIS_HQ (Dublin, 2026; post-credits)
  // A wet street (x -24..24; the HQ facade at z 0 facing +Z: DOYLE'S NEWSAGENT, the street door with
  // "JARVIS SYSTEMS — EST. 1987" over it, the lit first floor) and, placed apart at x 55.5..64.5, the office
  // upstairs: a dev island of monitors crowded with pop-ups, Declan's desk at the east end (his back to the
  // door), the framed Original Spec on the south wall. Rain only falls on the street (ambience.rain.box).
  // Props: spec_frame (userData.repaint(bugIds) repaints the targets sheet; it also follows state.bugs by
  // itself), car (passes now and then), walker (umbrella on the far pavement), popups (blink on the monitors).
  // marks track_1..3 are CAMERA path points (y = lens height, rotY = heading) for the post-credits TRACK.
  SETS.jarvis_hq = (() => {
    const X0 = 60, O = (x) => X0 + x;
    const uvOf = (u) => [(u % 2) / 2, u < 2 ? 0.5 : 0, (u % 2 + 1) / 2, u < 2 ? 1 : 0.5];   // monitor atlas cell
    let specTex = null, specBugs = null;
    const PLASTER = 0xe8e4dc, DESKC = 0xd8d2c4, GREEN = 0x1f4a38;

    function paintSpec(c, W, Hh, ids) {                // painted in a 256 x 320 layout, scaled to the canvas
      const w = 256, h = 320;
      c.save(); c.scale(W / w, Hh / h);
      c.fillStyle = '#efe6cc'; c.fillRect(0, 0, w, h);
      const g = c.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 220); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(120,90,40,0.28)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);                                                       // 39 years of yellowing
      c.save(); c.translate(w, 0); c.scale(-1, 1); c.globalAlpha = 0.13;                              // the front, showing through
      txt(c, 'WEEKLY SALES TARGETS — REDCLIFFE', w / 2, 20, `bold 11px ${SANS}`, '#000');
      const rows = [['Recontracts', '14', '3'], ['New services', '9', '2'], ['Accessories', '$750', '$85'], ['Home internet', '4', '0'], ['NPS', '72', '—']];
      rows.forEach((r, i) => { const y = 44 + i * 22; txt(c, r[0], 30, y, `11px ${SANS}`, '#000', 'left'); txt(c, r[1], 160, y, `11px ${SANS}`, '#000'); txt(c, r[2], 200, y, `11px ${SANS}`, '#000'); c.fillStyle = '#000'; c.fillRect(12, y + 10, w - 24, 1); });
      c.globalAlpha = 0.45; skull(c, 16, 45, 16, '#000'); c.restore();                        // the skull next to Recontracts
      c.save(); c.translate(18, 30); c.rotate(-0.03); txt(c, 'JARVIS — bugs', 0, 0, `bold 19px ${HAND}`, '#1c2a78', 'left'); c.restore();
      c.fillStyle = '#1c2a78'; c.fillRect(18, 42, 120, 2);
      const lines = [];
      for (const b of BUGS) if ((ids || []).includes(b.id)) lines.push(b.text);
      lines.push(DOOR_BUG);
      const step = Math.min(21, (h - 62) / lines.length), r = rng(lines.length * 7 + 1);
      lines.forEach((t, i) => {
        const y = 62 + i * step;
        c.save(); c.translate(16 + r() * 4, y); c.rotate((r() - 0.5) * 0.04);
        fit(c, '– ' + t, 0, 0, w - 34, 14, `#px ${HAND}`, '#1c2a78', 'left'); c.restore();
      });
      c.restore();
    }
    const repaint = (ids) => { if (!specTex) return; paintSpec(specTex.image.getContext('2d'), specTex.image.width, specTex.image.height, ids); specTex.needsUpdate = true; specBugs = typeof state !== 'undefined' ? state.bugs : null; };

    const tex = {
      brick: () => T('hq_brick', 128, 128, (c, w, h) => {
        c.fillStyle = '#8a8076'; c.fillRect(0, 0, w, h);
        const r = rng(77);
        for (let y = 0; y < 16; y++) for (let x = -1; x < 5; x++) {
          const v = 0.82 + r() * 0.3; c.fillStyle = `rgb(${210 * v | 0},${128 * v | 0},${100 * v | 0})`;
          c.fillRect(x * 32 + (y % 2) * 16 + 1, y * 8 + 1, 30, 6);
        }
      }, { repeat: [1, 1] }),
      asphalt: () => T('hq_asphalt', 128, 128, (c, w, h) => {
        c.fillStyle = '#4a4e54'; c.fillRect(0, 0, w, h); noise(c, w, h, 1400, 5, 0.2);
        const r = rng(9); for (let i = 0; i < 7; i++) { c.fillStyle = 'rgba(190,200,210,0.16)'; c.beginPath(); c.ellipse(r() * w, r() * h, 10 + r() * 20, 3 + r() * 5, 0, 0, PI * 2); c.fill(); }
      }, { repeat: [1, 1] }),
      flags: () => T('hq_flags', 64, 64, (c, w, h) => {
        c.fillStyle = '#6a6c70'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#8c8e92'; c.fillRect(1, 1, 30, 30); c.fillRect(33, 1, 30, 30); c.fillRect(1, 33, 46, 30); c.fillRect(49, 33, 14, 30);
        noise(c, w, h, 300, 2, 0.2);
      }, { repeat: [1, 1] }),
      boards: () => T('hq_boards', 64, 64, (c, w, h) => {
        const r = rng(4); for (let y = 0; y < 4; y++) { const v = 0.85 + r() * 0.25; c.fillStyle = `rgb(${200 * v | 0},${150 * v | 0},${105 * v | 0})`; c.fillRect(0, y * 16, w, 15); c.fillStyle = '#5a4028'; c.fillRect((r() * w) | 0, y * 16, 1, 15); }
        noise(c, w, h, 200, 3, 0.1);
      }, { repeat: [1, 1] }),
      fascia: () => T('hq_fascia', 256, 40, (c, w, h) => {
        c.fillStyle = '#1f4a38'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c9a24e'; c.lineWidth = 2; c.strokeRect(3, 3, w - 6, h - 6);
        fit(c, "DOYLE'S  ·  NEWSAGENT", w / 2, h / 2 + 1, w - 20, 22, `bold #px ${SERIF}`, '#e8c86a');
      }),
      sign: () => matTex(canvasTex(256, 116, (c, w, h) => {
        c.fillStyle = '#16213d'; c.fillRect(0, 0, w, h); c.strokeStyle = '#d8c890'; c.lineWidth = 3; c.strokeRect(6, 6, w - 12, h - 12);
        fit(c, 'JARVIS', w / 2, 38, w - 30, 40, `bold #px ${SERIF}`, '#f2ecd8');
        fit(c, 'SYSTEMS', w / 2, 68, w - 60, 22, `bold #px ${SERIF}`, '#f2ecd8');
        fit(c, '— EST. 1987 —', w / 2, 94, w - 40, 15, `#px ${SERIF}`, '#d8c890');
      }, { key: 'hq_sign' }), { emissive: 0xffffff, emissiveIntensity: 0.35 }),
      shopwin: () => glow('hq_shopwin', 128, 96, (c, w, h) => {
        c.fillStyle = '#e8d0a0'; c.fillRect(0, 0, w, h);
        const r = rng(12), C = ['#c83a2a', '#2a5ac8', '#e8c83a', '#3a9a4a', '#f2f2f2', '#d86a2a'];
        for (let y = 8; y < 60; y += 17) { c.fillStyle = '#7a5a3a'; c.fillRect(0, y + 13, w, 3); for (let x = 2; x < w; x += 9) { c.fillStyle = C[r() * 6 | 0]; c.fillRect(x, y, 7, 13); } }
        c.fillStyle = '#f6f2e6'; c.fillRect(8, 64, 44, 28); txt(c, 'SCRATCH', 30, 72, `bold 8px ${SANS}`, '#c82a2a'); txt(c, 'CARDS', 30, 83, `bold 8px ${SANS}`, '#c82a2a');
        c.fillStyle = '#20202a'; c.fillRect(64, 66, 54, 22); txt(c, 'OPEN', 91, 77, `bold 13px ${SANS}`, '#ff5a4a');
      }),
      win1: () => glow('hq_win1', 64, 96, (c, w, h) => {
        c.fillStyle = '#e8c890'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#f2ead8'; for (let y = 0; y < 34; y += 4) c.fillRect(0, y, w, 3);                     // blinds half down
        c.fillStyle = '#6ab0f0'; c.fillRect(10, 58, 18, 12); c.fillRect(36, 60, 18, 11);                   // monitors glowing
        c.fillStyle = '#fbfbfb'; c.fillRect(13, 61, 10, 5); c.fillRect(39, 62, 9, 5);
        c.fillStyle = '#4a3a2a'; c.fillRect(0, 74, w, 3);
        c.fillStyle = '#f4f2ec'; c.fillRect(w / 2 - 1, 0, 3, h); c.fillRect(0, h / 2 - 1, w, 4); c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
      }),
      winGold: () => glow('hq_win_gold', 192, 96, (c, w, h) => {              // the three first-floor windows: JARVIS | SYSTEMS | EST. 1987
        ['JARVIS', 'SYSTEMS', 'EST. 1987'].forEach((word, k) => {
          const x = k * 64;
          c.fillStyle = '#e8c890'; c.fillRect(x, 0, 64, h);
          c.fillStyle = '#f2ead8'; for (let y = 0; y < 26; y += 4) c.fillRect(x, y, 64, 3);                    // blinds
          c.fillStyle = '#6ab0f0'; c.fillRect(x + 12, 70, 16, 10); c.fillRect(x + 38, 72, 14, 9);             // monitors glowing
          c.save(); c.translate(x + 32, 52); c.fillStyle = '#6a4a08'; fit(c, word, 1, 1, 56, 16, `bold #px ${SERIF}`, '#6a4a08'); fit(c, word, 0, 0, 56, 16, `bold #px ${SERIF}`, '#ffd86a'); c.restore();
          c.fillStyle = '#f4f2ec'; c.fillRect(x + 31, 0, 3, 34); c.fillRect(x, 34, 64, 4); c.fillRect(x, 0, 3, h); c.fillRect(x + 61, 0, 3, h); c.fillRect(x, h - 3, 64, 3);
        });
      }),
      win2: () => T('hq_win2', 64, 96, (c, w, h) => {
        c.fillStyle = '#2a323c'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(230,230,225,0.35)'; c.fillRect(4, 40, w - 8, h - 44);
        c.fillStyle = '#e8e6e0'; c.fillRect(w / 2 - 1, 0, 3, h); c.fillRect(0, h / 2 - 1, w, 4); c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
      }),
      pub: () => glow('hq_pub', 128, 64, (c, w, h) => {
        c.fillStyle = '#141414'; c.fillRect(0, 0, w, 20); fit(c, 'THE LAMPLIGHTER', w / 2, 11, w - 12, 12, `bold #px ${SERIF}`, '#e8c86a');
        c.fillStyle = '#d89a50'; c.fillRect(0, 22, w, 42); c.fillStyle = '#a86a30'; for (let x = 0; x < w; x += 16) c.fillRect(x, 22, 2, 42);
        c.fillStyle = '#6a3a1a'; c.fillRect(0, 50, w, 14);
      }),
      bookie: () => glow('hq_bookie', 128, 64, (c, w, h) => {
        c.fillStyle = '#1a3a7a'; c.fillRect(0, 0, w, 20); fit(c, "P. O'LEARY · TURF ACCOUNTANT", w / 2, 11, w - 10, 10, `bold #px ${SANS}`, '#fff');
        c.fillStyle = '#c8d8e8'; c.fillRect(0, 22, w, 42); c.fillStyle = '#3a4a6a'; c.fillRect(10, 30, 40, 24); c.fillRect(70, 30, 46, 24); c.fillStyle = '#6aff8a'; c.fillRect(14, 34, 30, 3); c.fillRect(74, 34, 30, 3);
      }),
      cafe: () => glow('hq_cafe', 128, 64, (c, w, h) => {
        c.fillStyle = '#7a2a2a'; c.fillRect(0, 0, w, 20); fit(c, 'CAFÉ · HOT FOOD', w / 2, 11, w - 12, 12, `bold #px ${SERIF}`, '#f2e6c8');
        c.fillStyle = '#f0d8a8'; c.fillRect(0, 22, w, 42); c.fillStyle = '#b87a4a'; c.fillRect(0, 48, w, 16);
      }),
      monitors: () => glow('hq_monitors', 256, 256, (c, w, h) => {
        const scr = (x, y, bg, fn) => { c.fillStyle = bg; c.fillRect(x, y, 128, 128); fn(x, y); };
        scr(0, 0, '#2f6fd6', (x, y) => {                                        // pop-up cascade
          c.fillStyle = '#e8eaee'; c.fillRect(x, y + 116, 128, 12);
          const M = ['Are you sure?', 'Error 4044', 'Opt-in failed', 'Are you SURE?', 'Not responding', 'Try again?'];
          M.forEach((m, i) => jwin(c, x + 6 + i * 9, y + 6 + i * 16, 78, 30, 'JARVIS', m));
        });
        scr(128, 0, '#dfe3ea', (x, y) => {                                      // sales screen: MARGARINE + a backwards bar
          c.fillStyle = '#2f6fd6'; c.fillRect(x, y, 128, 16); txt(c, 'JARVIS · SALES', x + 6, y + 8, `bold 8px ${SANS}`, '#fff', 'left');
          txt(c, 'Customer: MARGARINE', x + 8, y + 30, `bold 9px ${SANS}`, '#222', 'left');
          c.fillStyle = '#fff'; c.fillRect(x + 8, y + 44, 112, 12); c.fillStyle = '#3aa050'; c.fillRect(x + 8, y + 44, 30, 12);
          txt(c, '31% ... 24% ... 17%', x + 8, y + 66, `8px ${SANS}`, '#444', 'left');
          jwin(c, x + 22, y + 78, 96, 40, 'JARVIS', 'Crashes on opt-in');
        });
        scr(0, 128, '#1c1f26', (x, y) => {                                      // code editor + a pop-up
          const r = rng(2), C = ['#7ac4ff', '#f2c86a', '#c8e6a0', '#e88aa0', '#aab4c4'];
          for (let l = 0; l < 13; l++) { let cx = x + 6 + (l % 4) * 6; for (let k = 0; k < 4; k++) { const ww = 6 + r() * 22; c.fillStyle = C[r() * 5 | 0]; c.fillRect(cx, y + 6 + l * 9, ww, 4); cx += ww + 4; } }
          jwin(c, x + 16, y + 50, 100, 42, 'JARVIS', "Sure you're sure?");
        });
        scr(128, 128, '#2f6fd6', (x, y) => {                                    // the spinner
          c.fillStyle = '#e8eaee'; c.fillRect(x, y + 116, 128, 12);
          c.strokeStyle = '#fff'; c.lineWidth = 6; c.beginPath(); c.arc(x + 64, y + 50, 18, 0, PI * 1.4); c.stroke();
          txt(c, 'JARVIS is loading', x + 64, y + 86, `bold 9px ${SANS}`, '#fff'); txt(c, 'this door.', x + 64, y + 98, `bold 9px ${SANS}`, '#fff');
        });
      }),
      popup: () => glow('hq_popup', 64, 32, (c, w, h) => jwin(c, 1, 1, w - 5, h - 5, 'JARVIS', 'Are you sure?')),
      officeWin: () => glow('hq_offwin', 64, 128, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#aab4be'); g.addColorStop(1, '#7a848e'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.fillStyle = '#6a625c'; c.fillRect(0, 50, 30, 78); c.fillStyle = '#7a6a60'; c.fillRect(34, 40, 30, 88);                     // the terrace across the road
        c.fillStyle = '#c8b88a'; for (let y = 60; y < 120; y += 20) { c.fillRect(6, y, 8, 12); c.fillRect(42, y - 6, 8, 12); }
        const r = rng(3); c.strokeStyle = 'rgba(235,242,248,0.55)'; c.lineWidth = 1;
        for (let i = 0; i < 20; i++) { let x = r() * w; const y0 = r() * h; c.beginPath(); c.moveTo(x, y0); for (let y = y0; y < y0 + 30 + r() * 40; y += 6) { x += (r() - 0.5) * 2; c.lineTo(x, y); } c.stroke(); }
        c.fillStyle = '#f2f0ea'; c.fillRect(w / 2 - 1, 0, 3, h); c.fillRect(0, h / 2 - 2, w, 4); c.fillRect(0, 0, 3, h); c.fillRect(w - 3, 0, 3, h);
      }),
      whiteboard: () => T('hq_whiteboard', 128, 96, (c, w, h) => {
        c.fillStyle = '#f6f6f4'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#2a4ac8'; c.lineWidth = 2;
        const bx = (x, y, s) => { c.strokeRect(x, y, 34, 14); txt(c, s, x + 17, y + 7, `bold 6px ${HAND}`, '#2a4ac8'); };
        bx(6, 8, 'YES'); bx(48, 8, 'SURE?'); bx(90, 8, 'SURE??'); bx(90, 40, 'CRASH'); bx(48, 40, 'RESTART');
        c.beginPath(); c.moveTo(40, 15); c.lineTo(48, 15); c.moveTo(82, 15); c.lineTo(90, 15); c.moveTo(107, 22); c.lineTo(107, 40); c.moveTo(90, 47); c.lineTo(82, 47); c.moveTo(65, 40); c.lineTo(28, 22); c.stroke();
        txt(c, 'AS PER SPEC', 60, 78, `bold 10px ${HAND}`, '#c82a2a');
        c.fillStyle = '#ffe86a'; c.fillRect(8, 60, 18, 18); c.fillStyle = '#9ae6ff'; c.fillRect(100, 66, 18, 18);
      }),
      poster: () => T('hq_poster', 96, 128, (c, w, h) => {
        c.fillStyle = '#2f6fd6'; c.fillRect(0, 0, w, h);
        jwin(c, 10, 34, 76, 34, 'JARVIS', 'Are you sure?');
        txt(c, 'JARVIS', w / 2, 16, `bold 16px ${SANS}`, '#fff');
        txt(c, "It's in the spec.", w / 2, 92, `italic bold 10px ${SERIF}`, '#fff'); txt(c, 'SINCE 1987', w / 2, 112, `bold 8px ${SANS}`, '#cfe0ff');
      }),
      nameplate: () => T('hq_nameplate', 256, 48, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#e8cc80'); g.addColorStop(0.5, '#b8923e'); g.addColorStop(1, '#d8b868'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        fit(c, 'DECLAN JARVIS', w / 2, 18, w - 20, 20, `bold #px ${SERIF}`, '#1a1408'); fit(c, 'FOUNDER', w / 2, 37, w - 20, 11, `bold #px ${SERIF}`, '#2a2010');
      }),
      plaque: () => matTex(canvasTex(128, 32, (c, w, h) => {
        const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#f0d890'); g.addColorStop(0.5, '#b8923e'); g.addColorStop(1, '#e0c070'); c.fillStyle = g; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#7a5a20'; c.lineWidth = 1; c.strokeRect(2, 2, w - 4, h - 4);
        fit(c, 'THE ORIGINAL SPEC', w / 2, h / 2 + 1, w - 14, 13, `bold #px ${SERIF}`, '#241a08');
      }, { key: 'hq_plaque' }), { emissive: 0xffffff, emissiveIntensity: 0.3 }),
      prepaid: () => T('hq_prepaid', 32, 64, (c, w, h) => {
        c.fillStyle = '#141416'; c.fillRect(0, 0, w, h);
        c.fillStyle = '#2a2c30'; c.fillRect(3, 6, w - 6, h - 14);
        c.strokeStyle = 'rgba(220,220,220,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(4, 12); c.lineTo(16, 30); c.lineTo(12, 46); c.moveTo(16, 30); c.lineTo(28, 26); c.stroke();   // cracked
        const g = c.createRadialGradient(20, 44, 2, 20, 44, 22); g.addColorStop(0, 'rgba(90,50,20,0.9)'); g.addColorStop(1, 'rgba(40,20,10,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h);   // scorch
      }),
      linenLit: () => matTex(canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#e6e0d2'; c.fillRect(0, 0, w, h); noise(c, w, h, 600, 6, 0.08); }, { key: 'hq_linen' }), { emissive: 0xfff0d8, emissiveIntensity: 0.3 }),
      lampLit: () => mat(0xfff4dc, { emissive: 0xffe8b0 }),
      screenOff: () => mat(0x15171c),
      led: () => mat(0x103010, { emissive: 0x3cff5a }),
      lamp: () => mat(0xfff0cc, { emissive: 0xffe0a0 }),
      head: () => mat(0xfff8e0, { emissive: 0xfff2c0 }),
      tail: () => mat(0x400000, { emissive: 0xff2a1a }),
      glass: () => mat(0xdce8f2, { transparent: true, opacity: 0.08 }),
    };

    function build() {
      b = new Builder();
      const root = new THREE.Group();
      const brick = tex.brick(), flags = tex.flags(), monM = tex.monitors(), lampM = tex.lamp();
      // ---------------------------------------------------------- the street
      bb(-26, -0.1, 2.4, 26, 0, 9.2, 0xffffff, tex.asphalt(), 4);
      bb(-26, 0, 0, 26, 0.12, 2.4, 0xffffff, flags, 1.3); bb(-26, 0, 9.2, 26, 0.12, 11.4, 0xffffff, flags, 1.3);
      bb(-26, 0, 2.3, 26, 0.13, 2.45, 0x9a9a96); bb(-26, 0, 9.15, 26, 0.13, 9.3, 0x9a9a96);            // kerbs
      for (const z of [2.62, 2.72, 8.88, 8.98]) bb(-26, 0, z - 0.04, 26, 0.004, z + 0.04, 0xd8b030);  // double yellows
      for (let x = -24; x < 26; x += 4) bb(x, 0, 5.75, x + 2, 0.004, 5.85, 0xe8e8e4);
      { const r = rng(15); for (let i = 0; i < 12; i++) { const g = new THREE.CircleGeometry(0.5 + r() * 1.1, 10); g.scale(1, 0.55, 1); g.rotateX(-H); g.translate(-18 + r() * 36, (i % 4 ? 0.006 : 0.126), i % 4 ? 3 + r() * 5.8 : 0.6 + r() * 1.4); put(g, 0x9aa8b8); } }   // puddles (sky in them)
      // the HQ: three storeys of brick, x -3.3..3.3
      bb(-3.3, 0, -8, 3.3, 10.4, 0, 0xffffff, brick, 2);
      bb(-3.4, 10.4, -8, 3.4, 10.7, 0.1, 0x8a8480); for (const x of [-2.4, 2.4]) { bb(x - 0.5, 10.7, -5, x + 0.5, 12.0, -3.8, 0xffffff, brick, 2); for (let k = 0; k < 3; k++) cyl(0.08, 0.1, 0.4, 6, 0xa86a4a, x - 0.3 + k * 0.3, 12.2, -4.4); }
      // ground floor shopfront (painted timber) + the street door
      bb(-3.2, 0, 0, 1.95, 3.4, 0.14, GREEN); bb(-3.1, 2.9, 0.14, 1.9, 3.35, 0.2, GREEN);
      quad(5.0, 0.42, tex.fascia(), -0.6, 3.125, 0.205);
      bb(-3.25, 3.35, 0, 2.0, 3.48, 0.28, 0x16382a);
      quad(3.4, 2.1, tex.shopwin(), -1.0, 1.6, 0.15);                                                      // display window
      bb(-2.75, 0.4, 0.15, -2.7, 2.7, 0.2, GREEN); bb(0.7, 0.4, 0.15, 0.75, 2.7, 0.2, GREEN); bb(-2.75, 0.5, 0.15, 0.75, 0.55, 0.22, GREEN); bb(-2.75, 2.62, 0.15, 0.75, 2.7, 0.2, GREEN);
      bb(-1.02, 0.55, 0.15, -0.98, 2.62, 0.19, GREEN);
      bb(0.85, 0.12, 0.08, 1.75, 2.6, 0.12, 0x2a4a3a); quad(0.6, 1.3, tex.shopwin(), 1.3, 1.65, 0.125, 0, 0, [0.5, 0, 1, 1]);   // shop door
      bb(2.0, 0, 0, 3.3, 3.5, 0.08, 0xffffff, brick, 2);
      bb(2.1, 0.12, 0.08, 2.95, 2.4, 0.16, 0x1e2a4a); for (const y of [0.5, 1.4]) for (const x of [2.3, 2.75]) bb(x - 0.15, y, 0.16, x + 0.15, y + 0.7, 0.18, 0x243258);   // the street door (panelled)
      cyl(0.03, 0.03, 0.03, 8, 0xc9a24e, 2.85, 1.2, 0.18, H); bb(2.46, 1.55, 0.18, 2.6, 1.62, 0.2, 0xc9a24e);   // knob, letterbox
      bb(2.05, 2.4, 0.08, 3.0, 2.46, 0.2, 0xe8e4dc);
      bb(3.0, 1.35, 0.08, 3.22, 1.55, 0.1, 0xc9a24e); quad(0.2, 0.18, tex.plaque(), 3.11, 1.45, 0.105);     // brass plate by the door
      box(1.3, 0.62, 0.06, 0x16213d, 2.6, 2.5, 0.1); quad(1.24, 0.56, tex.sign(), 2.6, 2.81, 0.162);         // JARVIS SYSTEMS — EST. 1987, over the door
      for (const x of [2.1, 3.1]) { rod(x, 3.25, 0.1, x, 3.12, 0.55, 0.012, 0x1a1a1a); bb(x - 0.05, 3.08, 0.5, x + 0.05, 3.14, 0.62, 0x1a1a1a); }   // two little lamps over it
      for (const x of [2.1, 3.1]) cyl(0.04, 0.05, 0.05, 6, 0xffffff, x, 3.06, 0.56, 0, 0, lampM);
      // first floor (lit, gold lettering in the middle), second floor
      const winM = tex.win1(), win2M = tex.win2();
      const goldM = tex.winGold();
      for (let k = 0; k < 3; k++) { const x = -2.1 + k * 2.1; quad(1.1, 2.0, goldM, x, 5.0, 0.01, 0, 0, [k / 3, 0, (k + 1) / 3, 1]); bb(x - 0.62, 3.88, 0, x + 0.62, 4.0, 0.12, 0xe8e4dc); bb(x - 0.6, 6.0, 0, x + 0.6, 6.1, 0.05, 0xb05a40); }
      for (const x of [-2.1, 0, 2.1]) { quad(1.0, 1.7, win2M, x, 7.9, 0.01); bb(x - 0.58, 6.98, 0, x + 0.58, 7.08, 0.1, 0xe8e4dc); }
      rod(2.1, 3.4, 0.14, 2.1, 10.2, 0.14, 0.04, 0x2a2a2a);                                                  // drainpipe
      // neighbours: the pub (render, pale blue) and the bookie (brick), then a run of terraces both ways
      bb(-10, 0, -8, -3.3, 9.6, 0, 0x9ab4c4); bb(-10.1, 9.6, -8, -3.2, 9.9, 0.1, 0x7a8a94);
      bb(-9.9, 0, 0, -3.4, 3.4, 0.12, 0x151515); quad(6.2, 3.0, tex.pub(), -6.65, 1.7, 0.125);
      for (const x of [-8.6, -6.65, -4.7]) { quad(1.0, 1.8, win2M, x, 5.2, 0.01); quad(1.0, 1.6, winM, x, 7.9, 0.01); }
      bb(3.3, 0, -8, 10, 10.0, 0, 0xffffff, brick, 2); bb(3.2, 10.0, -8, 10.1, 10.3, 0.1, 0x8a8480);
      bb(3.4, 0, 0, 9.9, 3.4, 0.12, 0x1a3a7a); quad(6.2, 3.0, tex.bookie(), 6.65, 1.7, 0.125);
      for (const x of [4.7, 6.65, 8.6]) { quad(1.0, 1.8, win2M, x, 5.2, 0.01); quad(1.0, 1.6, win2M, x, 7.9, 0.01); }
      { const r = rng(33), C = [0xc8b890, 0xa85a4a, 0x8aa0a8, 0xd8c8a8, 0x9a6a5a];
        for (const [x0, x1] of [[-26, -18], [-18, -10], [10, 18], [18, 26]]) {
          const hgt = 8.5 + r() * 3, col = C[r() * 5 | 0], cx = (x0 + x1) / 2;
          bb(x0, 0, -8, x1, hgt, 0, col); bb(x0, 3.2, 0, x1, 3.4, 0.14, 0x2a2a2a);
          quad(x1 - x0 - 1.2, 2.6, r() < 0.5 ? tex.cafe() : tex.bookie(), cx, 1.6, 0.02);
          for (let k = 0; k < 3; k++) { quad(1.0, 1.7, win2M, x0 + 1.4 + k * 2.6, 5.3, 0.01); quad(1.0, 1.6, r() < 0.3 ? winM : win2M, x0 + 1.4 + k * 2.6, 7.6, 0.01); }
        } }
      // across the road (seen in reverse)
      { const r = rng(35), C = [0xb8a888, 0x8a5040, 0x9ab0b8, 0xc8b8a0, 0x7a6a60];
        for (let x0 = -26; x0 < 26; x0 += 6.5) {
          const hgt = 8 + r() * 3, cx = x0 + 3.25;
          bb(x0, 0, 11.4, x0 + 6.5, hgt, 18, C[r() * 5 | 0]);
          quad(5.4, 2.4, r() < 0.5 ? tex.cafe() : tex.pub(), cx, 1.5, 11.39, PI);
          for (let k = 0; k < 2; k++) { quad(1.1, 1.8, r() < 0.3 ? winM : win2M, cx - 1.4 + k * 2.8, 5.2, 11.39, PI); quad(1.0, 1.6, win2M, cx - 1.4 + k * 2.8, 7.6, 11.39, PI); }
        } }
      // street furniture: lamps, bollards, a green postbox, a bin, a bike, a parked car
      for (const [x, z] of [[-6.5, 2.0], [6.0, 2.0], [-12, 9.6], [12, 9.6], [-20, 2.0], [20, 2.0]]) {
        cyl(0.12, 0.15, 0.5, 8, 0x1a1c1e, x, 0.37, z); cyl(0.06, 0.08, 4.8, 8, 0x1a1c1e, x, 2.5, z);
        const k = z < 5 ? 1 : -1;
        rod(x, 4.7, z, x, 4.9, z + k * 0.7, 0.03, 0x1a1c1e); cyl(0.14, 0.2, 0.28, 6, 0x1a1c1e, x, 4.95, z + k * 0.75);
        cyl(0.15, 0.13, 0.12, 6, 0xffffff, x, 4.76, z + k * 0.75, 0, 0, lampM);
      }
      for (const x of [-1.6, 4.6, 5.4]) { cyl(0.07, 0.08, 0.85, 8, 0x1a1c1e, x, 0.55, 2.1); cyl(0.09, 0.09, 0.08, 8, 0xc9a24e, x, 0.9, 2.1); }
      cyl(0.26, 0.26, 1.2, 12, 0x1e5a32, -3.9, 0.72, 1.6); cyl(0.3, 0.28, 0.14, 12, 0x1e5a32, -3.9, 1.36, 1.6); bb(-4.08, 1.05, 1.86, -3.72, 1.09, 1.88, 0x111111);   // An Post-style green pillar box
      cyl(0.24, 0.22, 0.9, 10, 0x3a3e40, 8.2, 0.57, 1.9); cyl(0.26, 0.26, 0.06, 10, 0x2a2e30, 8.2, 1.05, 1.9);
      { const x = 5.95, z = 1.55;                                                                       // a bike locked to the lamp post
        for (const dx of [-0.52, 0.52]) { const g = new THREE.TorusGeometry(0.32, 0.025, 4, 14); g.translate(x + dx, 0.46, z); put(g, 0x1a1a1a); }
        rod(x - 0.52, 0.46, z, x - 0.05, 0.9, z, 0.02, 0x8a2a2a); rod(x - 0.05, 0.9, z, x + 0.52, 0.46, z, 0.02, 0x8a2a2a); rod(x - 0.2, 0.46, z, x - 0.05, 0.9, z, 0.02, 0x8a2a2a);
        rod(x - 0.2, 0.46, z, x - 0.52, 0.46, z, 0.02, 0x8a2a2a); rod(x + 0.45, 1.05, z, x + 0.52, 0.46, z, 0.02, 0x8a2a2a); rod(x + 0.35, 1.08, z - 0.25, x + 0.35, 1.08, z + 0.25, 0.018, 0x1a1a1a);
        box(0.22, 0.05, 0.1, 0x1a1a1a, x - 0.08, 0.95, z); }
      { const x = -8.5, z = 3.4;                                                                        // a parked hatchback
        bb(x - 1.9, 0.3, z - 0.82, x + 1.9, 0.95, z + 0.82, 0x6a2a2a); boxR(2.2, 0.55, 1.5, 0x6a2a2a, x - 0.15, 1.22, z);
        boxR(2.1, 0.46, 1.52, 0x2a3440, x - 0.15, 1.24, z); bb(x - 1.92, 0.5, z - 0.6, x - 1.88, 0.7, z + 0.6, 0x9a9a9a);
        for (const [dx, dz] of [[-1.25, -0.8], [1.25, -0.8], [-1.25, 0.8], [1.25, 0.8]]) cyl(0.3, 0.3, 0.2, 10, 0x151515, x + dx, 0.3, z + dz, H); }
      // ---------------------------------------------------------- the office upstairs (apart, x 55.5..64.5, z -3.5..3.5)
      bb(O(-4.5), -0.1, -3.5, O(4.5), 0, 3.5, 0xffffff, tex.boards(), 1.1);
      bb(O(-4.8), 0, -3.8, O(4.8), 3.0, -3.5, PLASTER); bb(O(-4.8), 0, 3.5, O(4.8), 3.0, 3.8, PLASTER);
      bb(O(4.5), 0, -3.5, O(4.8), 3.0, 3.5, PLASTER);
      bb(O(-4.8), 0, -3.5, O(-4.5), 3.0, 1.3, PLASTER); bb(O(-4.8), 0, 2.3, O(-4.5), 3.0, 3.5, PLASTER); bb(O(-4.8), 2.25, 1.3, O(-4.5), 3.0, 2.3, PLASTER);
      bb(O(-4.8), 3.0, -3.8, O(4.8), 3.2, 3.8, 0xf2f0ea);
      for (const [x0, z0, x1, z1] of [[-4.5, -3.5, 4.5, -3.42], [-4.5, 3.42, 4.5, 3.5], [4.42, -3.5, 4.5, 3.5], [-4.5, -3.5, -4.42, 1.3], [-4.5, 2.3, -4.42, 3.5]]) {
        bb(O(x0), 0, z0, O(x1), 0.14, z1, 0xf4f2ec); bb(O(x0), 2.82, z0, O(x1), 3.0, z1, 0xf0eee6);    // skirting, cornice
      }
      cyl(0.35, 0.35, 0.04, 16, 0xf4f2ec, O(0), 2.98, 0); rod(O(0), 3.0, 0, O(0), 2.4, 0, 0.01, 0x222222); cyl(0.2, 0.05, 0.14, 12, 0x2a2a2a, O(0), 2.35, 0);
      cyl(0.35, 0.35, 0.04, 16, 0xf4f2ec, O(-2.6), 2.98, 1.8); rod(O(-2.6), 3.0, 1.8, O(-2.6), 2.4, 1.8, 0.01, 0x222222); cyl(0.2, 0.05, 0.14, 12, 0x2a2a2a, O(-2.6), 2.35, 1.8);
      // sash windows onto the rain (north), radiators, filing cabinets
      const owin = tex.officeWin();
      for (const x of [-3, 0, 3]) {
        quad(1.2, 2.2, owin, O(x), 1.8, -3.41); bb(O(x) - 0.7, 0.68, -3.42, O(x) + 0.7, 0.74, -3.3, 0xf4f2ec); bb(O(x) - 0.68, 2.9, -3.42, O(x) + 0.68, 2.96, -3.36, 0xf4f2ec);
        bb(O(x) - 0.55, 0.15, -3.42, O(x) + 0.55, 0.62, -3.3, 0xe8e6e0);
      }
      for (const x of [-1.5, 1.5]) { bb(O(x) - 0.25, 0, -3.42, O(x) + 0.25, 1.3, -2.8, 0x8a8e94); for (const y of [0.3, 0.72, 1.12]) bb(O(x) - 0.08, y, -2.81, O(x) + 0.08, y + 0.03, -2.78, 0x5a5e64); }
      // the dev island: six desks, monitors back to back (pop-ups everywhere)
      bb(O(-3.4), 0.72, -1.7, O(1.4), 0.76, -0.1, DESKC);
      for (const x of [-3.35, -1.0, 1.35]) for (const z of [-1.65, -0.15]) bb(O(x) - 0.03, 0, z - 0.03, O(x) + 0.03, 0.72, z + 0.03, 0x5a5e64);
      bb(O(-3.4), 0.76, -0.93, O(1.4), 1.1, -0.87, 0x6a7a6a);                                              // divider
      const r = rng(64);
      for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
        const cx = O(-2.6 + i * 1.6), zs = -0.9 + sd * 0.12, face = sd > 0 ? 0 : PI;
        for (const dx of [-0.33, 0.33]) {
          const u = r() * 4 | 0;
          box(0.62, 0.38, 0.03, 0x1a1c20, cx + dx, 0.95, zs, face); quad(0.58, 0.34, monM, cx + dx, 1.14, zs + sd * 0.016, face, 0, uvOf(u));
          box(0.05, 0.19, 0.05, 0x2a2c30, cx + dx, 0.76, zs - sd * 0.03); box(0.2, 0.015, 0.15, 0x2a2c30, cx + dx, 0.76, zs - sd * 0.03);
        }
        box(0.44, 0.02, 0.14, 0x2a2c30, cx, 0.76, zs + sd * 0.42); box(0.07, 0.02, 0.1, 0x2a2c30, cx + 0.32, 0.76, zs + sd * 0.42);   // keyboard, mouse
        if (r() < 0.7) cyl(0.04, 0.04, 0.1, 8, [0xf2f2f2, 0xc83a2a, 0x2a5ac8][r() * 3 | 0], cx - 0.5, 0.81, zs + sd * 0.5);            // mug
        if (r() < 0.5) cyl(0.033, 0.033, 0.16, 8, 0x2ac85a, cx + 0.55, 0.84, zs + sd * 0.35);                                           // energy drink
        for (let k = 0; k < 3; k++) bb(cx - 0.6 + k * 0.08, 0.95, zs + sd * 0.017, cx - 0.53 + k * 0.08, 1.02, zs + sd * 0.02, [0xffe86a, 0x9ae6ff, 0xff9ab0][k]);   // sticky notes
        const ccx = cx, ccz = zs + sd * 0.95;                                                                                          // office chair
        cyl(0.03, 0.03, 0.4, 6, 0x2a2a2e, ccx, 0.25, ccz); boxR(0.48, 0.08, 0.46, 0x2a2e38, ccx, 0.46, ccz); boxR(0.46, 0.55, 0.06, 0x2a2e38, ccx, 0.82, ccz + sd * 0.24, sd * 0.1);
        for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; boxR(0.26, 0.03, 0.04, 0x1a1a1e, ccx + Math.sin(a) * 0.13, 0.05, ccz + Math.cos(a) * 0.13, 0, a + H); }
      }
      box(0.06, 0.06, 0.06, 0xffd21f, O(-0.4), 0.76, -0.4); box(0.04, 0.03, 0.03, 0xe89a2a, O(-0.4), 0.78, -0.35);                   // a rubber duck
      // Declan's desk against the east wall (he faces +X, back to the door): three monitors, nameplate, 1987 relics
      bb(O(3.35), 0.72, -1.9, O(4.4), 0.76, 0.45, 0x7a5a3a); bb(O(3.4), 0, -1.85, O(3.5), 0.72, 0.4, 0x5a3e24); bb(O(4.3), 0, -1.85, O(4.4), 0.72, 0.4, 0x5a3e24);
      for (const [x, z, ry, u] of [[3.95, -0.7, -H, 0], [3.86, -1.36, -H + 0.5, 2], [3.86, -0.04, -H - 0.5, 1]]) {   // an arc of three, facing him
        box(0.62, 0.38, 0.03, 0x1a1c20, O(x), 0.95, z, ry);
        quad(0.58, 0.34, monM, O(x) + Math.sin(ry) * 0.017, 1.14, z + Math.cos(ry) * 0.017, ry, 0, uvOf(u));
        box(0.05, 0.19, 0.05, 0x2a2c30, O(x) - Math.sin(ry) * 0.05, 0.76, z - Math.cos(ry) * 0.05);
      }
      box(0.15, 0.02, 0.44, 0x2a2c30, O(3.6), 0.76, -0.7); cyl(0.045, 0.045, 0.1, 10, 0xe8e2d0, O(3.55), 0.81, -1.5);
      box(0.2, 0.08, 0.13, 0x3a3a3e, O(3.9), 0.76, -1.62, 0.3); cyl(0.03, 0.03, 0.02, 8, 0xc8c8c8, O(3.9), 0.85, -1.62);             // the model-railway transformer, from the lab
      box(0.22, 0.06, 0.12, 0x1a1a1a, O(3.95), 0.76, 0.22, -0.2); bb(O(3.9), 0.82, 0.2, O(4.0), 0.822, 0.26, 0x8a8a8a);               // a cassette recorder
      boxR(0.3, 0.07, 0.07, 0x5a3e24, O(3.55), 0.8, 0.3, 0, H); quad(0.28, 0.055, tex.nameplate(), O(3.513), 0.835, 0.3, -H);   // nameplate
      // Declan's chair (facing +X)
      cyl(0.03, 0.03, 0.4, 6, 0x2a2a2e, O(2.75), 0.25, -0.7); boxR(0.5, 0.08, 0.48, 0x1a1a1e, O(2.78), 0.46, -0.7); boxR(0.06, 0.62, 0.48, 0x1a1a1e, O(2.5), 0.84, -0.7, 0, 0, 0.1);
      for (let k = 0; k < 5; k++) { const a = k / 5 * PI * 2; boxR(0.26, 0.03, 0.04, 0x1a1a1e, O(2.75) + Math.sin(a) * 0.13, 0.05, -0.7 + Math.cos(a) * 0.13, 0, a + H); }
      // south wall: the fireplace (with a 1987 green-screen terminal on the mantel), the whiteboard, the poster
      bb(O(-2.4), 0, 3.25, O(-0.8), 1.25, 3.42, 0xe8e2d8); bb(O(-2.0), 0, 3.3, O(-1.2), 0.85, 3.43, 0x1a1616); bb(O(-2.5), 1.25, 3.2, O(-0.7), 1.32, 3.44, 0xe0dad0);
      bb(O(-1.95), 1.32, 3.12, O(-1.45), 1.72, 3.42, 0xc8c0a8); quad(0.34, 0.24, mat(0x08140a, { emissive: 0x2aa84a, emissiveIntensity: 0.6 }), O(-1.7), 1.53, 3.115, PI);
      quad(1.3, 0.95, tex.whiteboard(), O(0.8), 1.6, 3.41, PI); bb(O(0.13), 0.95, 3.35, O(1.47), 0.99, 3.42, 0xb8bcc2);
      quad(0.6, 0.8, tex.poster(), O(-3.6), 1.65, 3.41, PI);
      // the kitchen corner (SW) + water cooler, coat stand, server shelf with blinking LEDs, printer, plant
      bb(O(-4.45), 0, 2.2, O(-3.9), 0.9, 3.42, 0xe8e4dc); bb(O(-4.45), 0.9, 2.2, O(-3.88), 0.94, 3.42, 0x4a4a4e);
      cyl(0.08, 0.1, 0.2, 10, 0xe8e8e8, O(-4.15), 1.04, 3.1); for (let k = 0; k < 4; k++) cyl(0.04, 0.04, 0.09, 8, [0xf2f2f2, 0x2a5ac8, 0xc83a2a, 0xffd21f][k], O(-4.2), 0.985, 2.35 + k * 0.12);
      cyl(0.16, 0.16, 1.0, 10, 0xe8e8ec, O(-4.1), 0.5, -1.0); cyl(0.14, 0.14, 0.45, 10, 0x8ac4ec, O(-4.1), 1.22, -1.0);    // water cooler
      bb(O(4.0), 0, 2.4, O(4.45), 1.8, 3.4, 0x1a1c20);
      { const ls = []; for (let y = 0.3; y < 1.7; y += 0.2) for (let k = 0; k < 4; k++) ls.push([O(3.99), y, 2.5 + k * 0.08]); for (const p of ls) bb(p[0] - 0.005, p[1], p[2], p[0] + 0.001, p[1] + 0.02, p[2] + 0.02, 0xffffff, tex.led()); }
      bb(O(1.9), 0, -3.4, O(2.6), 0.75, -2.85, 0xe8e8e4); bb(O(1.95), 0.75, -3.35, O(2.55), 0.95, -2.9, 0xd8d8d4);
      cyl(0.2, 0.16, 0.4, 10, 0x8a5a3a, O(-3.9), 0.2, 0.5); { const rp = rng(8); for (let i = 0; i < 10; i++) { const a = rp() * PI * 2; const g = new THREE.ConeGeometry(0.1, 0.7, 4); g.rotateZ(0.3 + rp() * 0.4); g.rotateY(a); g.translate(O(-3.9) + Math.cos(a) * 0.15, 0.7 + rp() * 0.3, 0.5 - Math.sin(a) * 0.15); put(g, 0x3a6a34); } }
      cyl(0.16, 0.18, 0.03, 10, 0x1a1a1a, O(-4.1), 0.015, -2.7); rod(O(-4.1), 0, -2.7, O(-4.1), 1.8, -2.7, 0.02, 0x1a1a1a);    // coat stand
      boxR(0.4, 0.8, 0.16, 0x3a4a3a, O(-4.05), 1.35, -2.62);                                                 // someone's parka
      // the landing beyond the door (so the doorway isn't a void)
      bb(O(-6.5), -0.1, 0.6, O(-4.8), 0, 3.0, 0x6a5a4a); bb(O(-6.5), 0, 0.6, O(-6.3), 3.0, 3.0, 0xd8d0c0); bb(O(-6.5), 0, 0.6, O(-4.8), 3.0, 0.8, 0xd8d0c0); bb(O(-6.5), 0, 2.8, O(-4.8), 3.0, 3.0, 0xd8d0c0);
      rod(O(-6.2), 0.9, 1.0, O(-5.2), 0.2, 1.0, 0.03, 0x4a3018); bb(O(-6.5), 3.0, 0.6, O(-4.8), 3.1, 3.0, 0xe8e4dc);
      boxR(0.05, 2.2, 0.9, 0x6a4a30, O(-4.35), 1.1, 1.0, 0, -0.4);                                          // the office door, open
      root.add(b.done());

      // ---------------------------------------------------------- dynamic props
      // the Original Spec: a deep frame on the south wall: the charred prepaid phone + the targets sheet + a brass plaque
      specTex = canvasTex(204, 255, () => {}, { key: 'hq_spec' });            // cached across builds: always repaint
      repaint(typeof state !== 'undefined' ? state.bugs : []);
      const frame = part('spec_frame', () => {
        bb(-0.36, -0.28, -0.076, 0.36, 0.28, -0.07, 0x1a1512);                                              // deep box frame (local: +Z out of the wall)
        quad(0.66, 0.5, tex.linenLit(), 0, 0, -0.068);
        box(0.075, 0.15, 0.012, 0x141416, -0.19, -0.08, -0.06); quad(0.075, 0.15, tex.prepaid(), -0.19, -0.005, -0.0535);   // the charred prepaid
        bb(-0.232, 0.066, -0.066, -0.148, 0.072, -0.05, 0xd8e0e8); bb(-0.232, -0.086, -0.066, -0.148, -0.08, -0.05, 0xd8e0e8);    // clips
        quad(0.21, 0.2625, matTex(specTex, { emissive: 0xfff4e0, emissiveIntensity: 0.55 }), 0.1, 0.02, -0.066);
        box(0.165, 0.045, 0.004, 0x9a7a30, 0.0, -0.2275, -0.068); quad(0.16, 0.04, tex.plaque(), 0.0, -0.205, -0.0635);
        for (const [x0, y0, x1, y1] of [[-0.36, 0.25, 0.36, 0.28], [-0.36, -0.28, 0.36, -0.25], [-0.36, -0.28, -0.33, 0.28], [0.33, -0.28, 0.36, 0.28]]) bb(x0, y0, -0.07, x1, y1, 0.012, 0x221a14);
        bb(-0.03, 0.3, -0.075, 0.03, 0.36, -0.065, 0xb8923e); rod(0, 0.33, -0.07, 0, 0.42, 0.1, 0.008, 0xb8923e);               // brass picture light
        cyl(0.03, 0.03, 0.34, 8, 0xb8923e, 0, 0.42, 0.12, 0, H); bb(-0.16, 0.395, 0.11, 0.16, 0.4, 0.13, 0xffffff, tex.lampLit());
      }, [O(2.8), 1.55, 3.42], PI);
      frame.userData.repaint = repaint;
      root.add(frame);
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.56), tex.glass()); gl.position.set(0, 0, 0.011); frame.add(gl);
      // pop-ups that come and go on the island's monitors
      const pops = new THREE.Group(); pops.name = 'popups';
      const pm = tex.popup(), pg = new THREE.PlaneGeometry(0.2, 0.1);
      for (let i = 0; i < 3; i++) for (const sd of [-1, 1]) {
        const q = new THREE.Mesh(pg, pm), cx = O(-2.6 + i * 1.6) + (i % 2 ? 0.33 : -0.33);
        q.position.set(cx + 0.05, 1.12 + (i % 3) * 0.04, -0.9 + sd * 0.12 + sd * 0.019); q.rotation.y = sd > 0 ? 0 : PI; pops.add(q);
      }
      root.add(pops);
      // a car that passes now and then (far lane, heading -X), a walker with an umbrella on the far pavement
      root.add(part('car', () => {
        bb(-2.0, 0.3, -0.85, 2.0, 0.95, 0.85, 0x2a3a5a); boxR(2.2, 0.5, 1.5, 0x2a3a5a, 0.2, 1.2, 0); boxR(2.1, 0.44, 1.52, 0x1a222c, 0.2, 1.21, 0);
        for (const [dx, dz] of [[-1.3, -0.82], [1.3, -0.82], [-1.3, 0.82], [1.3, 0.82]]) cyl(0.3, 0.3, 0.2, 10, 0x151515, dx, 0.3, dz, H);
        for (const dz of [-0.6, 0.6]) { bb(-2.02, 0.62, dz - 0.14, -1.98, 0.76, dz + 0.14, 0xffffff, tex.head()); bb(1.98, 0.62, dz - 0.14, 2.02, 0.76, dz + 0.14, 0xffffff, tex.tail()); }
      }, [40, 0, 7.4]));
      root.add(part('walker', () => {
        bb(-0.12, 0, -0.09, -0.02, 0.8, 0.07, 0x2a2a30); bb(0.02, 0, -0.09, 0.12, 0.8, 0.07, 0x2a2a30);
        bb(-0.22, 0.75, -0.14, 0.22, 1.45, 0.14, 0x6a4a3a); bb(-0.08, 1.45, -0.08, 0.08, 1.52, 0.08, 0xe8c0a0); bb(-0.1, 1.52, -0.1, 0.1, 1.74, 0.11, 0xe8c0a0);
        bb(-0.11, 1.68, -0.12, 0.11, 1.78, 0.1, 0x3a2a1e); rod(0.18, 1.2, 0.05, 0.05, 2.0, 0.0, 0.012, 0x1a1a1a);
        { const g = new THREE.ConeGeometry(0.62, 0.34, 8, 1, true); g.translate(0.05, 2.08, 0); put(g, 0x1a1a1a, mat(0xffffff, { side: THREE.DoubleSide })); }
      }, [-22, 0.12, 10.3], H));
      return root;
    }

    function update(dt, ctx) {
      const p = ctx.props, t = ctx.t;
      if (typeof state !== 'undefined' && state.bugs !== specBugs) repaint(state.bugs);
      const car = p.car;
      if (car) { const u = (t % 14) / 14; car.position.x = 34 - u * 110; car.visible = car.position.x > -30; }
      const w = p.walker;
      if (w) { const u = (t % 36) / 36; w.position.x = -24 + u * 48; w.position.y = 0.12 + Math.abs(Math.sin(t * 5.5)) * 0.03; }
      const pp = p.popups;
      if (pp) for (let i = 0; i < pp.children.length; i++) pp.children[i].visible = (t * 0.23 + i * 0.37) % 1 < 0.55;
    }

    return {
      env: { rain: { bg: 0x59626c, fog: [0x68727c, 0.028], hemi: [0xb8c4d0, 0x3a3a42, 0.95], dir: [0xc8d4e0, 0.65, [-4, 10, 6]] } },
      build, update,
      floor(x, z) { return x < 30 && (z < 2.4 || z > 9.2) ? 0.12 : 0; },   // pavements are a kerb up
      marks: {
        street: [2.5, 0.12, 1.4, PI], declan_desk: [O(2.78), 0, -0.7, H], young_dev: [O(1.1), 0, 0.7, 2.2],
        track_1: [O(-4.0), 1.5, 1.6, H], track_2: [O(-0.8), 1.5, 1.35, H], track_3: [O(1.6), 1.45, 1.75, 0.62],
        // extras
        office_door: [O(-4.0), 0, 1.8, H], street_far: [0, 0.12, 10.3, PI], frame_front: [O(2.8), 0, 2.4, 0],
      },
      anchors: {
        door_sign:  { at: [2.6, 2.75, 0.2], from: [3.3, 1.15, 4.4], fov: 34 },
        spec_frame: { at: [O(2.8), 1.55, 3.4], from: [O(2.8), 1.56, 2.35], fov: 38 },    // PUSH IN end: [O(2.8), 1.56, 2.85]
        nameplate:  { at: [O(3.51), 0.81, 0.3], from: [O(3.05), 0.93, 0.44], fov: 30 },
        monitor:    { at: [O(3.95), 1.14, -0.7], from: [O(4.33), 1.22, -0.7], fov: 40 },   // JARVIS-CAM: behind Declan's monitor
        monitors:   { at: [O(-1.0), 1.1, -0.8], from: [O(-2.2), 1.45, 1.3], fov: 45 },
        // extras
        plaque:     { at: [O(2.8), 1.345, 3.37], from: [O(2.8), 1.36, 3.05], fov: 30 },
        spec_sheet: { at: [O(2.7), 1.57, 3.37], from: [O(2.7), 1.57, 2.97], fov: 36 },       // readable push-in on the list
        declan_back:{ at: [O(2.9), 1.15, -0.7], from: [O(1.15), 1.45, -0.45], fov: 40 },   // MID: Declan at his desk, back to camera
        track:      { at: [O(1.5), 1.2, 0.2], from: [O(-4.0), 1.5, 1.6], fov: 50 },       // start of the TRACK through the office
        street:     { at: [2.3, 4.2, 0], from: [2.0, 1.4, 10.6], fov: 50 },
        window_gold:{ at: [0, 5.0, 0.0], from: [0.6, 1.2, 8.0], fov: 26 },
      },
      cams: {
        street:      { type: 'pan', pos: [-3.0, 1.7, 10.4], base: [2.4, 2.2, 0.5], look: 'player', fov: 48, limit: 0.6 },
        street_up:   { type: 'fixed', pos: [3.9, 0.95, 6.4], look: [2.1, 4.3, 0], fov: 55 },         // the post-credits WIDE, looking up
        office:      { type: 'pan', pos: [O(-4.2), 2.6, 3.2], base: [O(0.5), 0.9, -1.0], look: 'player', fov: 55, limit: 0.5 },
        office_back: { type: 'pan', pos: [O(4.2), 2.6, 3.1], base: [O(0), 0.9, -0.5], look: 'player', fov: 55, limit: 0.5 },
      },
      zones: [
        { box: [-26, 0, 26, 11.4], cam: 'street' },
        { box: [O(-4.5), -3.5, O(0.5), 3.5], cam: 'office_back' },
        { box: [O(0.5), -3.5, O(4.5), 3.5], cam: 'office' },
      ],
      colliders: [
        [-26, -0.4, 26, 0], [-26, 11.4, 26, 11.8], [-27, 0, -26, 11.4], [26, 0, 27, 11.4],
        [-6.7, 1.8, -6.3, 2.2], [5.8, 1.8, 6.2, 2.2], [-4.2, 1.3, -3.6, 1.9], [7.9, 1.6, 8.5, 2.2], [-10.5, 2.5, -6.5, 4.3],
        [O(-4.8), -3.9, O(4.8), -3.42], [O(-4.8), 3.42, O(4.8), 3.9], [O(4.42), -3.5, O(4.8), 3.5], [O(-4.8), -3.5, O(-4.42), 3.5],   // (the door is for the cast, not the player)
        [O(-3.45), -1.75, O(1.45), -0.05], [O(3.3), -1.95, O(4.45), 0.5], [O(-4.45), 2.2, O(-3.88), 3.42], [O(3.95), 2.35, O(4.45), 3.42],
        [O(-2.45), 3.15, O(-0.75), 3.42], [O(-1.8), -3.42, O(-1.2), -2.78], [O(1.2), -3.42, O(1.8), -2.78], [O(1.85), -3.42, O(2.65), -2.8],
        [O(-4.3), -2.9, O(-3.9), -2.5], [O(-4.3), -1.2, O(-3.9), -0.8], [O(-4.1), 0.3, O(-3.7), 0.7],
      ],
      props: ['spec_frame', 'car', 'walker', 'popups'],
      ambience: { rain: { box: [-26, -1, 26, 12], top: 14 }, loops: ['typing', 'aircon'], room: 'room' },
    };
  })();
})();
