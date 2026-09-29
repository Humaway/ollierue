// ============================================================ MINIGAME: The final YES (3.4) + the memory recorder
// snap(name): keeps a 480x204 still of the current frame, in memory only ('torch' 'floor' 'pedal' 'crash' 'wall').
// The minigame: Luka's and Chase's hands on the machine's YES. Hold YES for 3 s while the stills flicker past
// in reverse (torch -> floor -> pedal -> crash -> wall), each burning to white; letting go rewinds smoothly.
// At 3 s the screen is white -> finish({done:true}); the white is handed to #fade and eases off.

MINIGAMES.final_yes = (() => {
  const SW = 480, SH = 204, HOLD = 3, ORDER = ['torch', 'floor', 'pedal', 'crash', 'wall'];
  const BURN_X = [0.7, 0.35, 0.55, 0.45, 0.6]; // where each still starts to burn (fraction of the band)
  const shots = {}, fallback = {};
  let api, ov, ctx, done = true, auto = false, reduce = false, p = 0, whiteT = 0, hum = null, humV = -1;
  let W = 0, H = 0, touch = false, R = 0, bx = 0, by = 0, bandX = 0, bandY = 0, bandW = 0, bandH = 0;
  let handsCv = null, vig = null, cap = null, capDown = null, burnG = null, yesFont = '', bs = 1, hintW = 0;
  const CHIP = 'bold 13px "Trebuchet MS", "Segoe UI", system-ui, sans-serif', HINT = '16px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';

  const smooth = (a, b, x) => { const k = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a); return k * k * (3 - 2 * k); };
  const still = (n) => shots[n] || fallback[n] || (fallback[n] = paintFallback(n));

  // ---------------------------------------------------------- fallback stills (no text): the moment, in silhouette
  function paintFallback(n) {
    const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
    const c = cv.getContext('2d'), P = Math.PI;
    const lin = (y0, y1, stops) => { const g = c.createLinearGradient(0, y0, 0, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
    const rad = (x, y, r, a, b) => { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, a); g.addColorStop(1, b); return g; };
    const poly = (pts) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); };
    const blob = (x, y, rx, ry, col, rot = 0) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, P * 2); c.fill(); };
    if (n === 'torch') { // night fog, the Campanile's arches, a torch beam across the steps finding Rue hunched there
      c.fillStyle = lin(0, SH, ['#0d1428', '#070a14']); c.fillRect(0, 0, SW, SH);
      c.fillStyle = '#121a30'; c.fillRect(230, 0, 230, 150);
      c.fillStyle = '#05070d';
      for (const x of [262, 352]) { c.beginPath(); c.moveTo(x, 150); c.lineTo(x, 78); c.arc(x + 38, 78, 38, P, 0); c.lineTo(x + 76, 150); c.fill(); }
      c.fillStyle = '#161d30'; c.fillRect(200, 150, 290, 12); c.fillStyle = '#1b2336'; c.fillRect(180, 162, 310, 14); c.fillStyle = '#20283b'; c.fillRect(150, 176, 340, 28);
      c.fillStyle = 'rgba(255,241,205,.2)'; poly([-20, 204, 10, 214, 420, 196, 300, 112]);
      c.fillStyle = 'rgba(255,241,205,.14)'; poly([-20, 204, 10, 214, 400, 186, 320, 128]);
      c.fillStyle = rad(350, 160, 90, 'rgba(255,238,200,.55)', 'rgba(255,238,200,0)'); c.fillRect(250, 90, 200, 114);
      blob(352, 170, 26, 8, 'rgba(0,0,0,.35)');
      c.fillStyle = '#34416a'; poly([334, 170, 332, 136, 346, 122, 364, 128, 372, 150, 376, 170]); // hunched back, blazer
      c.fillStyle = '#2a3558'; poly([356, 150, 384, 146, 390, 170, 362, 172]);                     // knees up
      blob(352, 126, 11, 10, '#2c2119'); blob(354, 130, 7, 5, '#b98a6c');                            // bowed head
      c.fillStyle = '#9b2a2a'; poly([340, 132, 362, 132, 360, 140, 342, 140]);                        // scarf
      for (const [x, y, r] of [[90, 60, 150], [240, 190, 170], [420, 40, 140], [470, 180, 120]]) { c.fillStyle = rad(x, y, r, 'rgba(170,185,215,.16)', 'rgba(170,185,215,0)'); c.fillRect(x - r, y - r, r * 2, r * 2); }
    } else if (n === 'floor') { // Rue's room at night: two lads asleep on the floor under coats, heads to camera
      c.fillStyle = lin(0, SH, ['#1c1714', '#140f0c']); c.fillRect(0, 0, SW, 110);
      c.fillStyle = lin(90, SH, ['#3a2a1e', '#5a4130']); c.fillRect(0, 96, SW, 108);
      c.strokeStyle = 'rgba(0,0,0,.28)'; c.lineWidth = 2;
      for (let i = -6; i < 9; i++) { c.beginPath(); c.moveTo(240 + i * 18, 96); c.lineTo(240 + i * 70, 204); c.stroke(); }
      c.fillStyle = '#f0b25a'; c.fillRect(356, 16, 76, 70); c.fillStyle = '#2b211a'; c.fillRect(392, 16, 4, 70); c.fillRect(356, 48, 76, 4);
      c.fillStyle = 'rgba(240,178,90,.18)'; poly([356, 96, 432, 96, 470, 204, 300, 204]);
      c.fillStyle = '#2a2f45'; c.fillRect(0, 60, 140, 58); c.fillStyle = '#d8d3c8'; c.fillRect(0, 56, 140, 10);   // bed edge
      c.fillStyle = '#6b4a2e'; poly([110, 204, 136, 112, 230, 110, 246, 204]);                                   // Luka's coat
      c.fillStyle = '#3c5540'; poly([232, 204, 246, 118, 336, 116, 368, 204]);                                   // Chase's duffle
      c.fillStyle = 'rgba(0,0,0,.18)'; poly([180, 204, 186, 114, 230, 110, 246, 204]); poly([300, 204, 292, 116, 336, 116, 368, 204]);
      blob(180, 160, 17, 12, '#d9a47e'); blob(180, 151, 14, 7, '#3a2618'); blob(180, 176, 27, 17, '#4a3222');  // Luka: face up, beard, hair
      blob(300, 162, 15, 11, '#e8bf9c'); blob(300, 178, 25, 16, '#5a3b24', 0.15); blob(315, 166, 3, 3, '#fff');  // Chase + earbud
    } else if (n === 'pedal') { // the basement lab, days passing in the high window, Luka on the bike rig
      c.fillStyle = lin(0, SH, ['#0e1a15', '#0a120e']); c.fillRect(0, 0, SW, SH);
      const g = c.createLinearGradient(130, 0, 350, 0);
      ['#9fd4ff', '#f4b36a', '#1b2a55', '#9fd4ff', '#f4b36a', '#1b2a55'].forEach((s, i) => g.addColorStop(i / 5, s));
      c.fillStyle = g; c.fillRect(130, 10, 220, 36); c.fillStyle = '#0a120e'; for (const x of [183, 238, 293]) c.fillRect(x, 10, 4, 36);
      c.fillStyle = 'rgba(200,230,255,.07)'; poly([130, 46, 350, 46, 400, 204, 150, 204]);
      for (const x of [24, 74, 392, 440]) { c.fillStyle = '#1d2a22'; c.fillRect(x - 4, 62, 42, 34); c.fillStyle = '#39ff88'; c.fillRect(x, 66, 34, 24); c.fillStyle = rad(x + 17, 78, 50, 'rgba(57,255,136,.18)', 'rgba(57,255,136,0)'); c.fillRect(x - 40, 30, 114, 100); }
      c.fillStyle = '#26332b'; c.fillRect(0, 108, SW, 6);
      c.strokeStyle = '#0b0f0d'; c.lineWidth = 7;
      for (const x of [200, 300]) { c.beginPath(); c.arc(x, 162, 32, 0, P * 2); c.stroke(); }
      c.strokeStyle = 'rgba(160,190,170,.35)'; c.lineWidth = 3; for (const x of [200, 300]) { c.beginPath(); c.arc(x, 162, 22, 0.3, 2.2); c.stroke(); c.beginPath(); c.arc(x, 162, 22, 3.4, 5.3); c.stroke(); }
      c.strokeStyle = '#6d7a72'; c.lineWidth = 5; c.beginPath(); c.moveTo(200, 162); c.lineTo(240, 128); c.lineTo(292, 124); c.lineTo(300, 162); c.moveTo(240, 128); c.lineTo(252, 162); c.lineTo(200, 162); c.stroke();
      c.fillStyle = '#e5484d'; c.fillRect(226, 144, 8, 12); c.fillStyle = rad(230, 150, 20, 'rgba(255,210,80,.7)', 'rgba(255,210,80,0)'); c.fillRect(210, 130, 40, 40);
      c.fillStyle = '#15161a'; poly([232, 122, 250, 84, 272, 82, 292, 112, 282, 120, 262, 100, 248, 124]);   // Luka, black polo, leaning in
      c.fillStyle = '#1a1a1e'; poly([236, 122, 250, 122, 262, 150, 252, 156]); poly([244, 124, 258, 118, 244, 160, 236, 158]);
      blob(282, 74, 10, 11, '#4a3222'); blob(286, 78, 7, 7, '#d9a47e'); c.fillStyle = '#4a3222'; poly([272, 70, 262, 86, 268, 88, 276, 76]);
    } else if (n === 'crash') { // the lecture theatre's steep tiers, a crash zoom onto one ducking head
      c.fillStyle = '#2a1d14'; c.fillRect(0, 0, SW, SH);
      for (let i = 0; i < 9; i++) {
        const y = 204 - i * 25, s = 1 - i * 0.07;
        c.fillStyle = i % 2 ? '#6b4a2e' : '#7d5836'; poly([0, y, SW, y - 40, SW, y - 52, 0, y - 12]);
        for (let k = 0; k < 11; k++) {
          const hx = 20 + k * 44 + (i % 2) * 20, hy = y - 18 - hx * 40 / SW;
          if (i === 3 && k === 5) continue;
          blob(hx, hy, 8 * s, 9 * s, ['#3a2a1c', '#6b4a2a', '#1d1a18', '#8a5a2a', '#4a3222'][(k + i) % 5]);
        }
      }
      blob(260, 104, 16, 12, '#4a3222'); c.fillStyle = '#2a4f8f'; c.fillRect(242, 90, 36, 10);          // Luka ducking behind a textbook
      c.strokeStyle = 'rgba(255,245,225,.3)'; c.lineWidth = 1.5; c.beginPath();
      for (let i = 0; i < 36; i++) { const a = i / 36 * P * 2, r0 = 60 + (i % 3) * 14; c.moveTo(260 + Math.cos(a) * r0, 100 + Math.sin(a) * r0 * 0.6); c.lineTo(260 + Math.cos(a) * 300, 100 + Math.sin(a) * 180); }
      c.stroke();
      c.fillStyle = rad(260, 100, 280, 'rgba(0,0,0,0)', 'rgba(0,0,0,.65)'); c.fillRect(0, 0, SW, SH);
    } else { // 'wall': the store's display wall, four tethered phones, the alarm beacon washing it red
      c.fillStyle = lin(0, SH, ['#eef1f6', '#d7dbe2']); c.fillRect(0, 0, SW, 150); c.fillStyle = '#c3c6cc'; c.fillRect(0, 150, SW, 54);
      blob(46, 70, 34, 34, '#ffd21f');
      c.fillStyle = '#20242c'; c.fillRect(100, 40, 300, 104); c.fillStyle = '#2d323d'; c.fillRect(100, 128, 300, 16);
      for (let i = 0; i < 4; i++) {
        const x = 128 + i * 70;
        if (i === 2) { c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 14, 136); for (let k = 0; k < 8; k++) c.lineTo(x + 14 + (k % 2 ? 6 : -6), 140 + k * 6); c.stroke(); continue; }
        c.fillStyle = '#0c0e12'; c.beginPath(); c.roundRect(x, 58, 30, 56, 5); c.fill();
        c.fillStyle = lin(62, 110, ['#5fb8ff', '#1f6fe0']); c.fillRect(x + 3, 63, 24, 44);
        c.strokeStyle = '#111'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 15, 114); for (let k = 0; k < 4; k++) c.lineTo(x + 15 + (k % 2 ? 5 : -5), 118 + k * 4); c.stroke();
      }
      blob(250, 16, 12, 9, '#ff3b30');
      c.fillStyle = rad(250, 16, 260, 'rgba(255,40,30,.45)', 'rgba(255,40,30,0)'); c.fillRect(0, 0, SW, SH);
      c.fillStyle = 'rgba(255,60,40,.12)'; poly([250, 16, 60, 204, 180, 204]);
    }
    return cv;
  }

  // ---------------------------------------------------------- the hands (painted once per size)
  function capsule(c, x, y, ang, len, w, skin, dark, nail) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = skin; c.beginPath(); c.roundRect(-w / 2, -len, w, len + 0.4, w / 2); c.fill();
    c.fillStyle = dark; c.beginPath(); c.roundRect(w * 0.08, -len + 0.4, w * 0.42, len, [0, w / 2, w / 2, 0]); c.fill();
    if (nail) { c.fillStyle = nail; c.beginPath(); c.roundRect(-w * 0.3, -len + 0.28, w * 0.6, w * 0.72, w * 0.26); c.fill(); }
    c.restore();
  }
  // right hand, palm down, fingers up (-y); mirrored for a left hand. 1 unit = s px, wrist at (x, y).
  function hand(c, x, y, ang, s, mir, skin, dark, nail, sleeve, cuff, hairy, broad) {
    const poly = (pts) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); };
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(mir ? -s * broad : s * broad, s);
    c.fillStyle = 'rgba(0,0,0,.28)'; c.filter = `blur(${Math.max(1, s * 0.6)}px)`; poly([-2.6, 1, 2.8, 1, 3, -5.8, -2.2, -6.4]); c.filter = 'none';
    c.fillStyle = skin; poly([-2.3, 0, 2.1, 0, 3.1, 14, -3.4, 14]);
    c.fillStyle = dark; poly([1.1, 0, 2.1, 0, 3.1, 14, 1.4, 14]);
    if (hairy) { c.strokeStyle = 'rgba(58,34,20,.55)'; c.lineWidth = 0.11; c.beginPath(); for (let i = 0; i < 26; i++) { const hx = -2 + (i * 37 % 45) / 10, hy = 1.5 + (i * 53 % 70) / 10; c.moveTo(hx, hy); c.lineTo(hx + 0.35, hy - 0.5); } c.stroke(); }
    c.fillStyle = sleeve; poly([-4.2, 6.2, 4, 6.2, 4.8, 18, -5, 18]);
    c.fillStyle = cuff; poly([-4.2, 6.2, 4, 6.2, 4.06, 7.1, -4.28, 7.1]);
    capsule(c, -2.1, -1.2, -0.72, 3.4, 1.55, skin, dark, nail);
    c.fillStyle = skin; poly([-2.3, 0, -2.8, -2.6, -2.5, -4.9, -0.9, -5.3, 0.7, -5.1, 2.3, -4.5, 2.4, -1.4, 2.1, 0]);
    c.fillStyle = dark; poly([0.8, -2.2, 2.3, -4.5, 2.4, -1.4, 2.1, 0, 1.1, 0]);
    const F = [[-1.85, -4.6, -0.07, 4.1, 1.4], [-0.6, -4.95, -0.02, 4.5, 1.42], [0.65, -4.8, 0.05, 4.2, 1.36], [1.8, -4.25, 0.13, 3.3, 1.2]];
    for (const f of F) capsule(c, f[0], f[1], f[2], f[3], f[4], skin, dark, nail);
    c.strokeStyle = dark; c.lineWidth = 0.14; c.lineCap = 'round'; c.beginPath();
    for (const f of F) { c.moveTo(f[0] - 0.35, f[1] + 0.2); c.lineTo(f[0] + 0.3, f[1] + 0.1); }
    c.stroke();
    c.restore();
  }

  function layout() {
    W = innerWidth; H = innerHeight; touch = api.input.scheme === 'touch';
    const d = ov.canvas.width / W;
    R = Math.min(W * 0.17, H * 0.13); bx = W / 2; by = H * (touch ? 0.56 : 0.5);
    const asp = W < H ? 1.7 : 2.35; // portrait: a taller window, cropped
    bandW = W; bandH = W / asp;
    if (bandH > H) { bandH = H; bandW = H * asp; }
    bs = Math.max(bandW / SW, bandH / SH);
    ctx.font = HINT; hintW = ctx.measureText('Hold for three seconds').width + 70;
    bandX = (W - bandW) / 2; bandY = Math.max(0, Math.min(H - bandH, H * (W < H ? 0.24 : 0.42) - bandH / 2));
    vig = ctx.createRadialGradient(bx, by, R, bx, by, Math.max(W, H) * 0.75);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,.72)');
    cap = ctx.createRadialGradient(bx - R * 0.3, by - R * 0.4, R * 0.1, bx, by, R);
    cap.addColorStop(0, '#fff3a6'); cap.addColorStop(0.55, '#ffd21f'); cap.addColorStop(1, '#d9a400');
    capDown = ctx.createRadialGradient(bx - R * 0.3, by - R * 0.3, R * 0.1, bx, by + R * 0.05, R);
    capDown.addColorStop(0, '#ffe46a'); capDown.addColorStop(0.6, '#f0c000'); capDown.addColorStop(1, '#b88a00');
    burnG = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    burnG.addColorStop(0, 'rgba(255,255,255,1)'); burnG.addColorStop(0.35, 'rgba(255,248,225,.95)');
    burnG.addColorStop(0.62, 'rgba(255,190,110,.55)'); burnG.addColorStop(0.82, 'rgba(190,70,20,.25)'); burnG.addColorStop(1, 'rgba(120,30,0,0)');
    yesFont = `bold ${Math.round(R * 0.4)}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
    handsCv = handsCv || document.createElement('canvas');
    handsCv.width = Math.ceil(W * d); handsCv.height = Math.ceil(H * d);
    const c = handsCv.getContext('2d'), s = R * 0.19;
    c.setTransform(d, 0, 0, d, 0, 0);
    hand(c, bx - R * 1.2, by + R * 1.9, 0.38, s, false, '#d6a27c', '#b47f5c', '#e9c3a8', '#15161a', '#2a2b31', true, 1.1);  // Luka's right hand
    hand(c, bx + R * 1.2, by + R * 1.9, -0.38, s, true, '#ecc4a2', '#cc9f7c', '#f6dccb', '#1f6fe0', '#4b8df0', false, 0.92); // Chase's left hand
  }

  function finish() { if (done) return; done = true; api.finish({ done: true }); }

  return {
    // Any snapped still by name (e.g. 2.10's flashback inserts: 'glance_lodge', 'glance_theatre', 'glance_step'), or null.
    still: (name) => shots[name] || null,
    snap(name) {
      if (typeof world === 'undefined' || !world.render || (typeof flow !== 'undefined' && flow.skipping)) return;
      try {
        world.render(1);
        const g = renderer.domElement;
        let sw = g.width, sh = Math.round(sw / 2.35);
        if (sh > g.height) { sh = g.height; sw = Math.round(sh * 2.35); }
        const cv = shots[name] || (shots[name] = document.createElement('canvas'));
        cv.width = SW; cv.height = SH;
        const c = cv.getContext('2d'); c.imageSmoothingQuality = 'high';
        c.drawImage(g, (g.width - sw) / 2, (g.height - sh) / 2, sw, sh, 0, 0, SW, SH);
      } catch (e) { delete shots[name]; }
    },
    start(params, a) {
      api = a; ov = a.overlay; ctx = ov.ctx; done = false; auto = false; p = 0; whiteT = 0; humV = -1; W = 0;
      reduce = !!options.reduceFlashing;
      for (const n of ORDER) still(n); // paint any missing fallback now, not mid-hold
      try { hum = a.AUDIO && a.AUDIO.loop ? a.AUDIO.loop('hum', { vol: 0 }) : null; } catch (e) { hum = null; }
      ov.show(true);
    },
    update(dt) {
      if (done) return;
      if (p >= 1) { if ((whiteT += dt) >= 0.35) finish(); return; }
      const held = auto || api.input.held('yes');
      p = held ? Math.min(1, p + dt * (auto ? 4 : 1) / HOLD) : Math.max(0, p - dt * 0.9);
      const v = p * 0.7;
      if (hum && Math.abs(v - humV) > 0.02) { humV = v; hum.vol(v); if (hum.rate) hum.rate(0.75 + p * 0.9); }
    },
    draw() {
      if (done && p < 1) return;
      if (innerWidth !== W || innerHeight !== H) layout();
      const d = ov.canvas.width / W, c = ctx;
      c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
      c.fillStyle = vig; c.fillRect(0, 0, W, H);
      if (p > 0) { // the montage: the still for this fifth of the hold, flickering in, pushing in, burning out
        c.globalAlpha = Math.min(1, p * 14); c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
        const f = Math.min(4.999, p * 5), i = f | 0, k = f - i;
        let a = 1;
        if (k < 0.16) a = reduce ? k / 0.16 : ((k * 45) | 0) % 2 ? 0.25 : 1;
        const sc = bs * (1 + 0.08 * k), dw = SW * sc, dh = SH * sc, dx = bandX + (bandW - dw) / 2, dy = bandY + (bandH - dh) / 2;
        c.save(); c.beginPath(); c.rect(bandX, bandY, bandW, bandH); c.clip();
        c.globalAlpha *= a;
        c.drawImage(still(ORDER[i]), dx, dy, dw, dh);
        const b = smooth(0.5, 1, k) * (reduce ? 0.35 : 1);
        if (b > 0) {
          if (!reduce) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = b * 0.8; c.drawImage(still(ORDER[i]), dx, dy, dw, dh); c.globalCompositeOperation = 'source-over'; }
          const r = bandW * 1.3 * b, cx = bandX + bandW * BURN_X[i], cy = bandY + bandH * 0.5;
          c.globalAlpha = reduce ? b : 1; c.setTransform(d * r, 0, 0, d * r, d * cx, d * cy); c.fillStyle = burnG; c.fillRect(-1, -1, 2, 2);
          c.setTransform(d, 0, 0, d, 0, 0); c.globalAlpha = b * b * b; c.fillStyle = '#fff'; c.fillRect(bandX, bandY, bandW, bandH);
        }
        c.restore(); c.globalAlpha = 1;
      }
      // the machine's YES and both hands on it (a ghost over the memories while held), the progress ring, the hint
      const held = auto || api.input.held('yes'), dn = held && p < 1 ? R * 0.05 : 0;
      c.globalAlpha = 1 - 0.7 * smooth(0, 0.06, p);
      c.fillStyle = '#23272f'; c.beginPath(); c.arc(bx, by + R * 0.06, R * 1.2, 0, 6.2832); c.fill();
      c.fillStyle = '#3a404c'; c.beginPath(); c.arc(bx, by, R * 1.16, 0, 6.2832); c.fill();
      c.fillStyle = '#8a8f99'; for (let q = 0; q < 4; q++) { c.beginPath(); c.arc(bx + Math.cos(q * 1.5708 + 0.785) * R * 1.02, by + Math.sin(q * 1.5708 + 0.785) * R * 1.02, R * 0.05, 0, 6.2832); c.fill(); }
      c.fillStyle = '#9a7400'; c.beginPath(); c.arc(bx, by + R * 0.1, R * 0.95, 0, 6.2832); c.fill();
      c.fillStyle = dn ? capDown : cap; c.beginPath(); c.arc(bx, by + dn, R * 0.92, 0, 6.2832); c.fill();
      c.fillStyle = '#141d3a'; c.font = yesFont; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('YES', bx, by - R * 0.36 + dn);
      c.drawImage(handsCv, 0, dn, W, H);
      c.globalAlpha = 1; c.lineWidth = R * 0.07; c.lineCap = 'round';
      c.strokeStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.arc(bx, by, R * 1.34, 0, 6.2832); c.stroke();
      if (p > 0) { c.strokeStyle = '#ffd21f'; c.beginPath(); c.arc(bx, by, R * 1.34, -1.5708, -1.5708 + p * 6.2832); c.stroke(); }
      const ha = 1 - smooth(0, 0.04, p);
      if (ha > 0) { // "YES  Hold for three seconds", the house prompt pill, above the ring
        const hx = bx - hintW / 2, hy = by - R * 1.34 - 34;
        c.globalAlpha = ha; c.fillStyle = 'rgba(20,29,58,.88)'; c.beginPath(); c.roundRect(hx, hy - 17, hintW, 34, 17); c.fill();
        c.fillStyle = '#ffd21f'; c.beginPath(); c.roundRect(hx + 7, hy - 11, 48, 22, 11); c.fill();
        c.fillStyle = '#141d3a'; c.font = CHIP; c.fillText('YES', hx + 31, hy + 1);
        c.fillStyle = '#fff'; c.font = HINT; c.textAlign = 'left'; c.fillText('Hold for three seconds', hx + 63, hy + 1);
        c.globalAlpha = 1;
      }
      const wAll = reduce ? smooth(0.6, 1, p) : smooth(0.82, 1, p);
      if (wAll > 0) { c.globalAlpha = wAll; c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    },
    end() {
      done = true;
      if (hum) { try { hum.stop(0.6); } catch (e) { /* audio gone */ } hum = null; }
      if (p >= 1 && typeof ui !== 'undefined') { ui.fade(1, 0, '#fff'); ui.fade(0, 1.6); } // hold the white, then ease off into the next shot
      p = 0;
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ov.canvas.width, ov.canvas.height); }
    },
    autoplay() { auto = true; },
  };
})();
