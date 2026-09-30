// ============================================================ MINIGAMES: Tether Rip (1.4), Wiring (1.5, 2.6)
// Overlay mini-games (SPEC §14 Tuning). Everything private to each IIFE; no top-level names.

MINIGAMES.tether = (() => {
  const SPEED = [1.2, 1.5, 1.9, 2.4], ZONE = [0.22, 0.18, 0.14, 0.10], MID = [0.5, 0.64, 0.38, 0.57];
  const teth = [null, null, null, null], base = [0, 0, 0, 0], rippedAt = [-1, -1, -1, -1], twangAt = [-1, -1, -1, -1];
  let api, p, ov, ctx, W = 0, H = 0, vign = null, light = null, chase = null, alarms = [], wall = 0;
  let phone = 0, misses = 0, zone = 0, pos = 0, dir = 1, lock = 0, shake = 0, hitT = 0, hz0 = 0, hz1 = 0, busy = false, endT = -1, done = true;

  function init(params, a) {
    api = a; p = params || a.params || {}; ov = a.overlay; ctx = ov && ov.ctx;
    alarms = []; done = false; busy = false; endT = -1; phone = 0; hitT = 0; shake = 0; W = 0;
    chase = a.world.actor('chase') || null;
    light = a.world.prop('alarm_light') || null;
    for (let i = 0; i < 4; i++) {
      teth[i] = a.world.prop('tether_' + (i + 1)) || null;
      base[i] = teth[i] ? teth[i].rotation.x : 0; rippedAt[i] = twangAt[i] = -1;
    }
    nextPhone();
  }
  function nextPhone() { misses = 0; zone = ZONE[phone] || 0.1; pos = 0; dir = 1; lock = 0.2; }
  // a miss: the cable snaps him back a step — he staggers, arms out, and squares up again (one-shot, ~0.35 s)
  ANIMS.stumble = (r, t, pp) => {
    const P = r.parts, u = Math.min(1, t / (pp.dur || 0.35)), k = Math.sin(u * Math.PI), o = r.d.armOut || 0.1;
    r.seated = false;
    P.hips.position.z -= 0.05 * k; P.hips.position.y -= 0.03 * k;
    P.legR.rotation.x = 0.5 * k; P.shinR.rotation.x = 0.08 + 0.6 * k; P.footR.rotation.x = -0.3 * k;
    P.legL.rotation.x = -0.18 * k; P.shinL.rotation.x = 0.08 + 0.25 * k;
    P.torso.rotation.x = -0.3 * k; P.head.rotation.x = 0.22 * k;
    P.armL.rotation.set(-0.4 * k, 0, o + 0.9 * k); P.armR.rotation.set(-0.4 * k, 0, -o - 0.9 * k);
    P.foreL.rotation.x = -0.14 - 0.5 * k; P.foreR.rotation.x = -0.14 - 0.5 * k;
  };

  function rip() {
    const n = phone + 1;
    api.sfx('rip');
    const pr = api.world.prop('display_phone_' + n); if (pr) pr.visible = false;
    rippedAt[phone] = performance.now() / 1000;
    const h = api.AUDIO && api.AUDIO.loop && api.AUDIO.loop('alarm', { vol: 0.45 });
    if (h) alarms.push(h);
    if (light) light.visible = true;
    if (chase) chase.play('pull', { loop: false, dur: 0.4 });
    hitT = 0.45; hz0 = Math.max(0, MID[phone] - zone / 2); hz1 = Math.min(1, MID[phone] + zone / 2); phone++;
    if (phone === 4) { endT = 0.9; return; }
    nextPhone();
    const steps = phone === 1 ? p.lines && p.lines.after1 : phone === 3 ? p.lines && p.lines.after3 : null;
    if (steps && steps.length) {
      busy = true;
      api.play(steps).then(() => { busy = false; if (p.shot) api.cam.shot(p.shot); });
    }
  }

  function finish() {
    if (done) return;
    done = true;
    if (chase) chase.play('carry');
    api.finish({ rips: 4, alarms: p.keepAlarms !== false ? alarms : [] }); // end() stops any not handed over
  }

  return {
    start(params, a) {
      init(params, a);
      if (p.shot) a.cam.shot(p.shot);
      ov.show(true);
    },
    update(dt) {
      if (done) return;
      if (endT >= 0) { endT -= dt; if (endT < 0) finish(); return; }
      if (hitT > 0) hitT -= dt;
      if (shake > 0) shake -= dt;
      if (busy) return;
      pos += dir * SPEED[phone] * dt;
      if (pos > 1) { pos = 2 - pos; dir = -1; } else if (pos < 0) { pos = -pos; dir = 1; }
      if (lock > 0) { lock -= dt; return; }
      if (!api.input.pressed('yes')) return;
      if (Math.abs(pos - MID[phone]) <= zone / 2) { rip(); return; }
      // miss: the cable twangs, Chase stumbles and goes again
      api.sfx('twang');
      twangAt[phone] = performance.now() / 1000;
      if (chase) chase.play('stumble', { loop: false, dur: 0.35 });
      shake = 0.3; lock = 0.35;
      if (++misses === 3) zone = ZONE[phone] * 2;
    },
    draw() {
      if (done || !ctx) return;
      // cosmetic 3D bits on wall time, so they keep moving while api.play() pauses update()
      const now = performance.now() / 1000, fdt = Math.min(0.1, wall ? now - wall : 0); wall = now;
      for (let i = 0; i < 4; i++) {
        const tt = teth[i]; if (!tt) continue;
        const r = rippedAt[i] >= 0, a = r ? now - rippedAt[i] : twangAt[i] >= 0 ? now - twangAt[i] : 9;
        tt.rotation.x = a < 4 ? base[i] + (r ? 0.6 : 0.18) * Math.exp(-1.4 * a) * Math.sin(a * 11) : base[i];
      }
      if (light && alarms.length) light.rotation.y += fdt * (options.reduceFlashing ? 1.5 : 6);

      const w = innerWidth, h = innerHeight;
      if (w !== W || h !== H) {
        W = w; H = h;
        vign = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.15, W / 2, H * 0.45, Math.max(W, H) * 0.75);
        vign.addColorStop(0, 'rgba(255,30,20,0.4)'); vign.addColorStop(1, 'rgba(230,0,0,1)');
      }
      const s = ov.canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0); ctx.clearRect(0, 0, W, H);

      // red alarm wash: a 2 Hz pulse per the siren, softer and slower with Reduce Flashing
      const n = alarms.length;
      if (n) {
        const rf = options.reduceFlashing;
        const k = 0.5 + 0.5 * Math.sin(now * Math.PI * (rf ? 1 : 4));
        ctx.globalAlpha = rf ? (0.08 + 0.03 * n) * (0.7 + 0.3 * k) : (0.16 + 0.1 * n) * (0.3 + 0.7 * k);
        ctx.fillStyle = vign; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      }
      if (busy) return;

      // the bar, bottom centre
      const bw = Math.min(520, W - 72), bh = 26;
      const bx = (W - bw) / 2 + (shake > 0 ? Math.sin(shake * 70) * 7 * shake / 0.3 : 0);
      const by = H - (api.input.scheme === 'touch' ? 252 : 92);
      ctx.fillStyle = 'rgba(20,29,58,0.88)';
      ctx.beginPath(); ctx.roundRect(bx - 18, by - 46, bw + 36, bh + 76, 12); ctx.fill();
      ctx.fillStyle = CONFIG.colors.yes; ctx.fillRect(bx - 6, by - 46, bw + 12, 2);
      ctx.font = 'bold 15px "Trebuchet MS", "Segoe UI", system-ui, sans-serif';
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      ctx.fillText('RIP THE TETHER', bx, by - 22);
      // four little phones: ripped ones in yellow, the current one outlined
      for (let i = 0; i < 4; i++) {
        const x = bx + bw - 88 + i * 23, y = by - 33;
        ctx.beginPath(); ctx.roundRect(x, y, 14, 22, 3);
        if (i < phone) { ctx.fillStyle = CONFIG.colors.yes; ctx.fill(); }
        else { ctx.lineWidth = 2; ctx.strokeStyle = i === phone ? '#fff' : 'rgba(255,255,255,0.3)'; ctx.stroke(); }
      }
      // track, green zone, needle
      ctx.fillStyle = '#0b1026'; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 7); ctx.fill();
      if (phone < 4) {
        let z0 = MID[phone] - zone / 2, z1 = MID[phone] + zone / 2;
        if (z0 < 0) z0 = 0; if (z1 > 1) z1 = 1;
        ctx.fillStyle = '#34d26a';
        ctx.beginPath(); ctx.roundRect(bx + z0 * bw, by + 2, (z1 - z0) * bw, bh - 4, 5); ctx.fill();
      }
      if (hitT > 0) { // the zone that was just hit flashes white
        ctx.globalAlpha = hitT / 0.45; ctx.fillStyle = '#f4fff4';
        ctx.beginPath(); ctx.roundRect(bx + hz0 * bw, by - 3, (hz1 - hz0) * bw, bh + 6, 6); ctx.fill(); ctx.globalAlpha = 1;
      }
      const nx = bx + (phone < 4 ? pos : MID[3]) * bw;
      ctx.fillStyle = shake > 0 ? '#ff5a4e' : '#fff';
      ctx.fillRect(nx - 2, by - 6, 4, bh + 12);
      ctx.beginPath(); ctx.moveTo(nx - 7, by - 12); ctx.lineTo(nx + 7, by - 12); ctx.lineTo(nx, by - 4); ctx.fill();
      // hint line
      ctx.font = '14px "Trebuchet MS", "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = shake > 0 ? '#ff8a80' : '#c9d2ea';
      ctx.fillText(phone >= 4 ? 'All four.' : shake > 0 ? 'Missed! Again!' : misses >= 3 ? 'YES in the green (bigger now)' : 'YES when the needle is in the green', W / 2, by + bh + 16);
    },
    end(r) {
      done = true;
      if (!r || r.alarms !== alarms) for (const h of alarms) h.stop(0.4);
      alarms = [];
      for (let i = 0; i < 4; i++) if (teth[i]) teth[i].rotation.x = base[i];
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ov.canvas.width, ov.canvas.height); }
      if (ov) ov.show(false);
    },
    autoplay(a) { // same end state: four phones gone, four alarms layered
      init(a.params, a);
      for (let i = 0; i < 4; i++) {
        const pr = a.world.prop('display_phone_' + (i + 1)); if (pr) pr.visible = false;
        const h = a.AUDIO && a.AUDIO.loop && a.AUDIO.loop('alarm', { vol: 0.45 }); if (h) alarms.push(h);
      }
      if (light) light.visible = true;
      a.sfx('rip');
      finish();
    },
  };
})();

MINIGAMES.wiring = (() => {
  // Board in design units (800 x 480), rotated 90° on portrait screens. Corridors are polylines;
  // their width is in screen px (SPEC: ~26 px), so the metal gap between them is kept >= 66 units.
  const BW = 800, BH = 480;
  const L = {
    machine: {
      title: 'WIRE THE MACHINE',
      colors: ['#ef4b4b', '#ffd21f', '#3b8cff', '#34c96b'],
      wires: [
        [118, 75, 200, 75, 200, 53, 330, 53, 330, 97, 470, 97, 470, 53, 590, 53, 590, 75, 712, 75],
        [118, 185, 170, 185, 170, 207, 280, 207, 280, 163, 420, 163, 420, 207, 540, 207, 540, 163, 640, 163, 640, 185, 712, 185],
        [118, 295, 240, 295, 240, 317, 360, 317, 360, 273, 510, 273, 510, 317, 620, 317, 620, 295, 712, 295],
        [118, 405, 190, 405, 190, 383, 300, 383, 300, 427, 450, 427, 450, 383, 580, 383, 580, 427, 650, 427, 650, 405, 712, 405],
      ],
    },
    charger: {
      title: 'WIRE THE CHARGER',
      colors: ['#ef4b4b', '#3b8cff', '#f4f4f4'],
      wires: [
        [140, 196, 180, 196, 180, 70, 250, 70, 250, 130, 290, 130, 290, 200, 318, 200],
        [140, 284, 180, 284, 180, 410, 250, 410, 250, 350, 290, 350, 290, 280, 318, 280],
        [736, 240, 700, 240, 700, 110, 610, 110, 610, 370, 540, 370, 540, 240, 482, 240],
      ],
    },
  };
  const PH = ['#1d1e24', '#52698f', '#8e949b', '#ecebe6']; // four generic phones, no logos
  const SP = [new Float32Array(32), new Float32Array(32), new Float32Array(32), new Float32Array(32)]; // screen pts
  const CUM = [new Float32Array(16), new Float32Array(16), new Float32Array(16), new Float32Array(16)]; // arc length
  const NP = [0, 0, 0, 0], HW = [13, 13, 13, 13], WZ = [0, 0, 0, 0], OK = [false, false, false, false];
  const PX = [0, 0, 0, 0], PY = [0, 0, 0, 0], WS = [0, 0, 0, 0], QX = [0, 0, 0, 0], QY = [0, 0, 0, 0];
  const SPK = new Float32Array(24 * 5); // sparks: x, y, vx, vy, life
  const DASH = [3, 7], NODASH = [];
  const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif', HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", cursive';
  let api, ov, ctx, lay, nw = 0, W = 0, H = 0, sc = 1, ox = 0, oy = 0, rot = false, touchEl = null, sch = '', hx = 0;
  let cx = 0, cy = 0, lpx = -1, lpy = -1, grab = -1, gox = 0, goy = 0, stun = 0, zaps = 0, conn = 0;
  let t = 0, nextBlack = 8, black = 0, endT = -1, done = true, status = '', hint = '', fBig = '', fSmall = '', fHand = '';
  let qx = 0, qy = 0, qs = 0, zx = 0, zy = 0, zt = 0;

  const mx = (x, y) => rot ? ox + (BH - y) * sc : ox + x * sc;
  const my = (x, y) => rot ? oy + x * sc : oy + y * sc;
  function box(x0, y0, x1, y1, r) { // a design-space rect, mapped
    const a = mx(x0, y0), b = my(x0, y0), c = mx(x1, y1), d = my(x1, y1);
    ctx.beginPath(); ctx.roundRect(Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b), r);
  }

  function layout() {
    const touch = sch === 'touch', top = touch ? 118 : 78, bottom = touch ? 200 : 20, ah = H - top - bottom;
    hx = W < 600 ? 16 : W / 2; setStatus();
    rot = H > W;
    sc = rot ? Math.min((W - 20) / BH, ah / BW) : Math.min((W - 24) / BW, ah / BH);
    ox = (W - (rot ? BH : BW) * sc) / 2; oy = top + (ah - (rot ? BW : BH) * sc) / 2;
    for (let i = 0; i < nw; i++) {
      const d = lay.wires[i], a = SP[i], c = CUM[i], n = d.length / 2;
      NP[i] = n; c[0] = 0;
      for (let k = 0; k < n; k++) {
        a[2 * k] = mx(d[2 * k], d[2 * k + 1]); a[2 * k + 1] = my(d[2 * k], d[2 * k + 1]);
        if (k) c[k] = c[k - 1] + Math.hypot(a[2 * k] - a[2 * k - 2], a[2 * k + 1] - a[2 * k - 1]);
      }
      const e = OK[i] ? 2 * (n - 1) : 0;
      PX[i] = a[e]; PY[i] = a[e + 1]; QX[i] = a[e]; QY[i] = a[e + 1]; WS[i] = OK[i] ? c[n - 1] : 0;
    }
    grab = -1;
    const k = Math.max(0.7, Math.min(1.25, sc));
    fBig = 'bold ' + Math.round(17 * Math.min(1, k)) + 'px ' + FONT; fSmall = Math.round(13 * Math.min(1, k)) + 'px ' + FONT;
    fHand = 'bold ' + Math.round(40 * sc) + 'px ' + HAND;
  }

  // distance from (x, y) to wire i's centreline; leaves the closest point in qx, qy and its arc length in qs
  function near(i, x, y) {
    const a = SP[i], c = CUM[i], n = NP[i];
    let best = 1e12;
    for (let k = 0; k < n - 1; k++) {
      const x0 = a[2 * k], y0 = a[2 * k + 1], dx = a[2 * k + 2] - x0, dy = a[2 * k + 3] - y0, l2 = dx * dx + dy * dy;
      let u = l2 ? ((x - x0) * dx + (y - y0) * dy) / l2 : 0; u = u < 0 ? 0 : u > 1 ? 1 : u;
      const px = x0 + u * dx, py = y0 + u * dy, d = (x - px) * (x - px) + (y - py) * (y - py);
      if (d < best) { best = d; qx = px; qy = py; qs = c[k] + u * (c[k + 1] - c[k]); }
    }
    return Math.sqrt(best);
  }

  function setStatus() {
    status = conn + ' / ' + nw + ' connected' + (zaps ? '   ·   zaps ' + zaps : '');
    const s = api.input.scheme;
    hint = s === 'touch' ? "Drag plugs to terminals. Don't touch the metal."
      : s === 'pad' ? 'Hold A to grab a plug, steer with the stick.'
      : W < 600 ? "Drag plugs to terminals. Don't touch the metal."
      : "Drag each plug to its matching terminal. Don't touch the metal. (Keys: hold YES, steer with arrows)";
  }

  function zap(i) {
    api.sfx('zap');
    for (let k = 0; k < 24; k++) {
      const o = k * 5, a = Math.random() * 6.283, v = 60 + Math.random() * 260;
      SPK[o] = PX[i]; SPK[o + 1] = PY[i]; SPK[o + 2] = Math.cos(a) * v; SPK[o + 3] = Math.sin(a) * v; SPK[o + 4] = 0.25 + Math.random() * 0.35;
    }
    zx = PX[i]; zy = PY[i]; zt = 0.8;
    zaps++; if (++WZ[i] === 3) HW[i] *= 1.5;
    PX[i] = QX[i] = SP[i][0]; PY[i] = QY[i] = SP[i][1]; WS[i] = 0;
    grab = -1; stun = 1; setStatus();
  }

  function finish() { if (done) return; done = true; api.finish({ zaps }); }

  return {
    start(params, a) {
      api = a; ov = a.overlay; ctx = ov.ctx; lay = L[(params || a.params || {}).layout] || L.machine; nw = lay.wires.length;
      for (let i = 0; i < 4; i++) { HW[i] = 13; WZ[i] = 0; OK[i] = false; }
      for (let k = 0; k < SPK.length; k += 5) SPK[k + 4] = 0;
      zaps = conn = 0; stun = 0; grab = -1; t = 0; black = 0; endT = -1; zt = 0; done = false; W = H = 0; sch = '';
      nextBlack = 6 + Math.random() * 4;
      touchEl = document.getElementById('touch');
      cx = innerWidth / 2; cy = innerHeight / 2; lpx = a.input.pointer.x; lpy = a.input.pointer.y;
      setStatus();
      ov.show(true);
    },
    update(dt) {
      if (done) return;
      const s = api.input.scheme; // touch changes the margins; kb <-> pad only changes the hint
      if (W !== innerWidth || H !== innerHeight || (s === 'touch') !== (sch === 'touch')) { W = innerWidth; H = innerHeight; sch = s; layout(); }
      else if (s !== sch) { sch = s; setStatus(); }
      t += dt;
      for (let k = 0; k < SPK.length; k += 5) if (SPK[k + 4] > 0) {
        SPK[k] += SPK[k + 2] * dt; SPK[k + 1] += SPK[k + 3] * dt; SPK[k + 2] *= 0.9; SPK[k + 3] *= 0.9; SPK[k + 4] -= dt;
      }
      if (zt > 0) zt -= dt;
      if (lay === L.machine) { // the flickering tube: 0.5 s blackout every 6–10 s
        if (black > 0) black -= dt;
        else if (t >= nextBlack) { black = 0.5; nextBlack = t + 6.5 + Math.random() * 4; api.sfx('tube_flicker'); }
      }
      if (endT >= 0) { endT -= dt; if (endT < 0) finish(); return; }

      const I = api.input, P = I.pointer;
      const ptrOk = !(touchEl && P.over && touchEl.contains(P.over)); // on-screen stick/buttons also move the pointer
      if (ptrOk && (P.x !== lpx || P.y !== lpy || P.pressed)) { cx = P.x; cy = P.y; }
      lpx = P.x; lpy = P.y;
      const m = I.move;
      if (m.x || m.y) { cx += m.x * 230 * dt; cy -= m.y * 230 * dt; cx = cx < 0 ? 0 : cx > W ? W : cx; cy = cy < 0 ? 0 : cy > H ? H : cy; }
      if (stun > 0) { stun -= dt; return; }
      const down = I.held('yes') || (ptrOk && P.down);

      if (grab < 0) {
        const ptr = ptrOk && P.pressed;
        if (!ptr && !I.pressed('yes')) return;
        let best = -1, bd = ptr ? 34 : 40;
        for (let i = 0; i < nw; i++) if (!OK[i]) { const d = Math.hypot(PX[i] - cx, PY[i] - cy); if (d < bd) { bd = d; best = i; } }
        if (best < 0 && !ptr) for (let i = 0; i < nw; i++) if (!OK[i]) { best = i; cx = PX[i]; cy = PY[i]; break; } // keys: jump to the next plug
        if (best < 0) return;
        grab = best; gox = PX[best] - cx; goy = PY[best] - cy;
        api.sfx('clunk', { vol: 0.4 });
        return;
      }
      if (!down) { grab = -1; return; }
      // drag the plug towards the cursor in small steps, checking the corridor all the way
      const i = grab, tx = cx + gox, ty = cy + goy, dx = tx - PX[i], dy = ty - PY[i], n = Math.ceil(Math.hypot(dx, dy) / 3);
      const a = SP[i], e = 2 * (NP[i] - 1);
      for (let k = 0; k < n; k++) {
        const x = PX[i] + dx / n, y = PY[i] + dy / n;
        if (near(i, x, y) > HW[i]) { PX[i] = x; PY[i] = y; zap(i); return; }
        PX[i] = x; PY[i] = y; QX[i] = qx; QY[i] = qy; WS[i] = qs;
        if (Math.hypot(x - a[e], y - a[e + 1]) < 9) {
          OK[i] = true; PX[i] = QX[i] = a[e]; PY[i] = QY[i] = a[e + 1]; WS[i] = CUM[i][NP[i] - 1];
          grab = -1; conn++; setStatus(); api.sfx('pop');
          if (conn === nw) endT = 0.8;
          return;
        }
      }
    },
    draw() {
      if (done || !ctx || !W) return;
      const s = ov.canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(8,10,18,0.78)'; ctx.fillRect(0, 0, W, H);
      ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.textBaseline = 'middle';

      // header
      ctx.textAlign = hx === 16 ? 'left' : 'center'; ctx.fillStyle = CONFIG.colors.yes; ctx.font = fBig;
      ctx.fillText(lay.title, hx, 24);
      ctx.fillStyle = '#fff'; ctx.font = fSmall; ctx.fillText(status, hx, 45);
      ctx.fillStyle = '#9aa6c4'; ctx.fillText(hint, hx, 64);

      // the metal plate
      box(0, 0, BW, BH, 14 * sc); ctx.fillStyle = '#5d6672'; ctx.fill();
      box(6, 6, BW - 6, BH - 6, 10 * sc); ctx.fillStyle = '#8b949f'; ctx.fill();
      ctx.fillStyle = '#6f7883';
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(mx(k & 1 ? BW - 20 : 20, k & 2 ? BH - 20 : 20), my(k & 1 ? BW - 20 : 20, k & 2 ? BH - 20 : 20), 5 * sc, 0, 6.283); ctx.fill(); }

      // components
      if (lay === L.machine) {
        for (let i = 0; i < 4; i++) {
          const y = 75 + i * 110;
          box(22, y - 30, 108, y + 30, 9 * sc); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fill();
          box(18, y - 34, 104, y + 26, 9 * sc); ctx.fillStyle = PH[i]; ctx.fill();
          box(26, y - 26, 96, y + 18, 4 * sc); ctx.fillStyle = '#0d1422'; ctx.fill();
          ctx.fillStyle = '#ff5a4e'; ctx.font = fSmall; ctx.textAlign = 'center'; ctx.fillText('3%', mx(61, y - 4), my(61, y - 4));
          box(52, y + 20, 70, y + 23, 2); ctx.fillStyle = i === 3 ? '#b9b8b2' : 'rgba(255,255,255,0.35)'; ctx.fill();
          box(104, y - 6, 120, y + 6, 2); ctx.fillStyle = '#222'; ctx.fill();
        }
        box(676, 18, 784, BH - 18, 10 * sc); ctx.fillStyle = '#b8c0c9'; ctx.fill();
        box(728, 30, 774, BH - 30, 8 * sc); ctx.fillStyle = '#141d3a'; ctx.fill();
        ctx.save(); ctx.translate(mx(751, 240), my(751, 240)); if (!rot) ctx.rotate(-Math.PI / 2);
        ctx.fillStyle = CONFIG.colors.yes; ctx.font = fHand; ctx.textAlign = 'center'; ctx.fillText('Yes', 0, 0); ctx.restore();
      } else {
        ctx.save(); box(6, 6, BW - 6, BH - 6, 10 * sc); ctx.clip();
        ctx.beginPath(); ctx.arc(mx(-120, 240), my(-120, 240), 205 * sc, 0, 6.283);
        ctx.lineWidth = 26 * sc; ctx.strokeStyle = '#26282d'; ctx.stroke();
        ctx.lineWidth = 5 * sc; ctx.strokeStyle = '#a4acb6'; ctx.beginPath(); ctx.arc(mx(-120, 240), my(-120, 240), 188 * sc, 0, 6.283); ctx.stroke();
        ctx.restore();
        box(96, 206, 146, 274, 10 * sc); ctx.fillStyle = '#c9ced4'; ctx.fill();
        box(84, 226, 98, 254, 3); ctx.fillStyle = '#50565e'; ctx.fill();
        box(330, 150, 470, 330, 12 * sc); ctx.fillStyle = '#6b4a35'; ctx.fill();
        box(338, 158, 462, 322, 8 * sc); ctx.fillStyle = '#80593f'; ctx.fill();
        ctx.beginPath(); ctx.arc(mx(400, 240), my(400, 240), 38 * sc, 0, 6.283); ctx.fillStyle = '#efe6cf'; ctx.fill();
        ctx.lineWidth = 5 * sc; ctx.strokeStyle = '#3a2a20'; ctx.beginPath(); ctx.moveTo(mx(400, 240), my(400, 240)); ctx.lineTo(mx(420, 212), my(420, 212)); ctx.stroke();
        box(752, 232, BW, 248, 3); ctx.fillStyle = '#f4f4f4'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = fSmall; ctx.textAlign = 'center';
        ctx.fillStyle = '#3a4150'; ctx.fillText('DYNAMO', mx(121, 240), my(121, 240)); ctx.fillStyle = '#fff';
        ctx.fillText('TRANSFORMER', mx(400, 342), my(400, 342));
        ctx.fillText('CABLE', mx(772, 212), my(772, 212));
      }

      // corridors: bevel, channel, dashed guide
      for (let i = 0; i < nw; i++) {
        const a = SP[i], n = NP[i];
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); for (let k = 1; k < n; k++) ctx.lineTo(a[2 * k], a[2 * k + 1]);
        ctx.lineWidth = HW[i] * 2 + 5; ctx.strokeStyle = '#c3cad2'; ctx.stroke();
        ctx.lineWidth = HW[i] * 2; ctx.strokeStyle = '#1b2029'; ctx.stroke();
        ctx.setLineDash(DASH); ctx.lineWidth = 2; ctx.strokeStyle = '#39424f'; ctx.stroke(); ctx.setLineDash(NODASH);
      }
      // terminals, wires, plugs
      for (let i = 0; i < nw; i++) {
        const a = SP[i], n = NP[i], e = 2 * (n - 1), col = lay.colors[i];
        ctx.beginPath(); ctx.arc(a[e], a[e + 1], 12, 0, 6.283); ctx.fillStyle = '#dfe3e8'; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = col; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a[0], a[1]);
        for (let k = 1; k < n && CUM[i][k] < WS[i]; k++) ctx.lineTo(a[2 * k], a[2 * k + 1]);
        ctx.lineTo(QX[i], QY[i]); ctx.lineTo(PX[i], PY[i]);
        ctx.lineWidth = 6; ctx.strokeStyle = col; ctx.stroke();
        ctx.beginPath(); ctx.arc(PX[i], PY[i], OK[i] ? 7 : 9, 0, 6.283); ctx.fillStyle = col; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = i === grab ? '#fff' : 'rgba(0,0,0,0.45)'; ctx.stroke();
        if (OK[i]) { ctx.beginPath(); ctx.arc(a[e], a[e + 1], 16, 0, 6.283); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
      }
      // sparks + ZAP!
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff6a8'; ctx.beginPath();
      for (let k = 0; k < SPK.length; k += 5) if (SPK[k + 4] > 0) { ctx.moveTo(SPK[k], SPK[k + 1]); ctx.lineTo(SPK[k] - SPK[k + 2] * 0.03, SPK[k + 1] - SPK[k + 3] * 0.03); }
      ctx.stroke();
      if (zt > 0.5) { ctx.globalAlpha = (zt - 0.5) * 2.5; ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(zx, zy, 30 * (1.3 - zt), 0, 6.283); ctx.fill(); ctx.globalAlpha = 1; }
      if (zt > 0) { ctx.globalAlpha = Math.min(1, zt * 2); ctx.fillStyle = '#ffe14a'; ctx.font = fBig; ctx.textAlign = 'center'; ctx.fillText('ZAP!', zx, zy - 26); ctx.globalAlpha = 1; }
      // cursor
      ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 6.283); ctx.lineWidth = 2.5;
      ctx.strokeStyle = stun > 0 ? '#ff5a4e' : grab >= 0 ? CONFIG.colors.yes : 'rgba(255,255,255,0.85)'; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 2.5, 0, 6.283); ctx.fillStyle = ctx.strokeStyle; ctx.fill();

      // the tube blacks out (a soft fade with Reduce Flashing)
      if (black > 0) {
        const u = 1 - black / 0.5;
        ctx.globalAlpha = options.reduceFlashing ? 0.8 * Math.sin(u * Math.PI) : (u < 0.1 || (u > 0.18 && u < 0.26) ? 0.55 : 0.95);
        ctx.fillStyle = '#030406'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
      }
    },
    end() {
      done = true;
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ov.canvas.width, ov.canvas.height); }
      if (ov) ov.show(false);
    },
    autoplay(a) { done = true; a.finish({ zaps: 0 }); },
  };
})();
