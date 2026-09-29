// ============================================================ MINIGAME: Pedal Power (2.6, reused in 3.1)
// 100 BPM bleep beat. Alternate two buttons on the beat: in-time presses pull the speed meter
// towards the green band, mashing between beats spins it up, missed beats and friction slow it.
// Progress fills only in the green (~45 s a session). >90% for over a second = sparks, -10% progress.

MINIGAMES.pedal = (() => {
  const BEAT = 0.6, T0 = 1.2, WIN = 0.16, FAIL = 70, FILL = 100 / 42;
  const F = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  const F12 = '12px ' + F, F13 = '13px ' + F, F14B = 'bold 14px ' + F, F15B = 'bold 15px ' + F, F16B = 'bold 16px ' + F;
  const SPK = new Float32Array(20 * 5);
  let api, p, ov, ctx, W = 0, H = 0, sch = '', rider = null, dyn = null, done = true;
  let lo = 55, hi = 80, target = 77, t = 0, m = 0, prog = 0, over = 0, beeped = 0, judged = 0, hitK = -1, last = -1;
  let fb = 0, fbTxt = '', beatFlash = 0, spin = 0, sparkT = 0, endT = -1, lastSpd = -1, lastRate = -1;
  let session = 1, labA = '', labB = '', sessTxt = '', pctTxt = '', pctN = -1, hintTxt = '';

  function labels() {
    const s = sch = api.input.scheme;
    labA = s === 'pad' ? 'A' : s === 'touch' ? 'YES' : '←'; labB = s === 'pad' ? 'B' : s === 'touch' ? 'NO' : '→';
    hintTxt = s === 'kb' ? 'Alternate ← → (or YES / NO) on the beep' : 'Alternate ' + labA + ' and ' + labB + ' on the beep';
  }

  function finish(r) { if (done) return; done = true; if (dyn) dyn.stop(0.5); dyn = null; api.finish(r); }

  function win(a) {
    state.battery = (state.battery || 0) + 1;
    a.hud.set({ battery: state.battery, bars: state.bars });
  }

  return {
    start(params, a) {
      api = a; p = params || a.params || {}; ov = a.overlay; ctx = ov.ctx; done = false; W = 0;
      const b = p.band || [55, 80]; lo = b[0]; hi = b[1]; target = (lo + hi) / 2 + 10; session = p.session || 1;
      t = m = prog = over = 0; beeped = judged = 0; hitK = last = -1; fb = beatFlash = spin = sparkT = 0; endT = -1; lastSpd = lastRate = -1; pctN = -1;
      for (let k = 0; k < SPK.length; k += 5) SPK[k + 4] = 0;
      sessTxt = 'SESSION ' + session + ' / 3';
      rider = a.world.actor(p.rider || 'luka') || null;
      dyn = (a.AUDIO && a.AUDIO.loop && a.AUDIO.loop('dynamo', { vol: 0, rate: 0.5 })) || null;
      labels();
      ov.show(true);
    },
    update(dt) {
      if (done) return;
      t += dt;
      if (fb > 0) fb -= dt;
      if (beatFlash > 0) beatFlash -= dt;
      if (sparkT > 0) sparkT -= dt;
      for (let k = 0; k < SPK.length; k += 5) if (SPK[k + 4] > 0) {
        SPK[k] += SPK[k + 2] * dt; SPK[k + 1] += SPK[k + 3] * dt; SPK[k + 3] += 500 * dt; SPK[k + 4] -= dt;
      }
      if (endT >= 0) { m *= 1 - dt; endT -= dt; if (endT < 0) finish({ ok: true }); return; }

      // the beat, from game time
      if (t >= T0 + beeped * BEAT) { api.sfx('beep'); beeped++; beatFlash = 0.12; }
      while (t > T0 + judged * BEAT + WIN) { if (hitK !== judged && judged > 1) m -= 8; judged++; }

      const I = api.input;
      const which = I.pressed('left') || I.pressed('yes') ? 0 : I.pressed('right') || I.pressed('no') ? 1 : -1;
      if (which >= 0) {
        if (which === last) { fb = 0.4; fbTxt = 'Alternate!'; }
        else {
          last = which;
          const k = Math.round((t - T0) / BEAT), off = t - (T0 + k * BEAT);
          if (k >= 0 && k !== hitK && Math.abs(off) < WIN) { hitK = k; m += (target - m) * 0.35; fb = 0.35; fbTxt = 'In time'; }
          else { m += 6; fb = 0.35; fbTxt = off < 0 ? 'Early' : 'Late'; }
        }
      }
      m -= 6 * dt;
      m = m < 0 ? 0 : m > 100 ? 100 : m;
      spin += m * dt * 0.18;

      if (m > 90) {
        over += dt;
        if (over > 1) {
          over = 0; prog = Math.max(0, prog - 10); sparkT = 0.6; api.sfx('spark');
          for (let k = 0; k < SPK.length; k += 5) {
            const ang = Math.random() * 6.283, v = 80 + Math.random() * 220;
            SPK[k] = 0; SPK[k + 1] = 0; SPK[k + 2] = Math.cos(ang) * v; SPK[k + 3] = Math.sin(ang) * v - 120; SPK[k + 4] = 0.4 + Math.random() * 0.4;
          }
        }
      } else over = 0;
      if (m >= lo && m <= hi) prog += FILL * dt;
      if (prog >= 100) { prog = 100; api.sfx('chime_ready'); win(api); endT = 1.2; }
      else if (t > FAIL) finish({ failed: true });

      // dynamo whine + the rider's legs follow the meter (only touch them when it changes)
      const r = 0.4 + m / 80;
      if (dyn && Math.abs(r - lastRate) > 0.03) { lastRate = r; dyn.rate(r); dyn.vol(Math.min(1, m / 60) * 0.7); }
      const spd = m / 67;
      if (rider && Math.abs(spd - lastSpd) > 0.1) { lastSpd = spd; rider.play('pedal', { speed: spd }); }
    },
    draw() {
      if (done || !ctx) return;
      const w = innerWidth, h = innerHeight;
      if (w !== W || h !== H || sch !== api.input.scheme) { W = w; H = h; labels(); }
      const s = ov.canvas.width / W;
      ctx.setTransform(s, 0, 0, s, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.textBaseline = 'middle';

      const pw = Math.min(560, W - 24), ph = 176, px = (W - pw) / 2 + (sparkT > 0 ? Math.sin(sparkT * 90) * 5 : 0);
      const py = H - ph - (api.input.scheme === 'touch' ? 200 : 22);
      ctx.fillStyle = 'rgba(20,29,58,0.9)'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 14); ctx.fill();
      ctx.fillStyle = CONFIG.colors.yes; ctx.fillRect(px + 10, py, pw - 20, 2);
      ctx.font = F15B; ctx.textAlign = 'left'; ctx.fillStyle = CONFIG.colors.yes; ctx.fillText('PEDAL POWER', px + 16, py + 20);
      ctx.textAlign = 'right'; ctx.fillStyle = '#c9d2ea'; ctx.font = F13; ctx.fillText(sessTxt, px + pw - 16, py + 20);

      // bike wheel, spinning with the meter
      const wx = px + 52, wy = py + 90, wr = 34;
      ctx.lineWidth = 7; ctx.strokeStyle = '#0b0d14'; ctx.beginPath(); ctx.arc(wx, wy, wr, 0, 6.283); ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#aab3c5'; ctx.beginPath(); ctx.arc(wx, wy, wr - 5, 0, 6.283);
      for (let k = 0; k < 8; k++) { const a = spin + k * 0.785; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * (wr - 5), wy + Math.sin(a) * (wr - 5)); }
      ctx.stroke();
      ctx.fillStyle = '#dfe4f2'; ctx.beginPath(); ctx.arc(wx, wy, 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.roundRect(wx + wr - 4, wy - 22, 12, 20, 3); ctx.fill(); // the dynamo
      ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffe14a'; ctx.beginPath();
      for (let k = 0; k < SPK.length; k += 5) if (SPK[k + 4] > 0) {
        const x = wx + wr + 2 + SPK[k], y = wy - 12 + SPK[k + 1];
        ctx.moveTo(x, y); ctx.lineTo(x - SPK[k + 2] * 0.03, y - SPK[k + 3] * 0.03);
      }
      ctx.stroke();

      // speed meter: green band, red zone above 90, the needle
      const mx = px + 106, mw = pw - 122, my = py + 46, mh = 22;
      ctx.fillStyle = '#0b1026'; ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 6); ctx.fill();
      ctx.fillStyle = '#2f8f55'; ctx.fillRect(mx + lo / 100 * mw, my + 2, (hi - lo) / 100 * mw, mh - 4);
      ctx.fillStyle = '#9b2c2c'; ctx.fillRect(mx + 0.9 * mw, my + 2, 0.1 * mw - 2, mh - 4);
      const inG = m >= lo && m <= hi;
      ctx.fillStyle = m > 90 ? '#ff6b5e' : inG ? '#7dffb0' : '#ffffff';
      ctx.fillRect(mx + 2, my + mh / 2 - 3, Math.max(0, m / 100 * mw - 2), 6);
      ctx.fillRect(mx + m / 100 * mw - 2, my - 5, 4, mh + 10);
      ctx.font = F12; ctx.textAlign = 'left'; ctx.fillStyle = '#97a2c2'; ctx.fillText('SPEED', mx, my - 10);
      ctx.textAlign = 'right';
      ctx.fillStyle = m > 90 ? '#ff8a80' : inG ? '#7dffb0' : m < lo - 20 && t > 3 ? '#ffb3a8' : '#97a2c2';
      ctx.fillText(m > 90 ? 'TOO FAST' : inG ? 'GOOD' : m < lo - 20 && t > 3 ? 'STALLING' : m < lo ? 'FASTER' : 'EASE OFF', mx + mw, my - 10);

      // beat keys: the one to press next is lit; both pulse on the beep
      const ky = py + 92, kw = 58, kh = 32, kx = mx + mw / 2;
      for (let k = 0; k < 2; k++) {
        const x = k ? kx + 8 : kx - 8 - kw, next = last !== k;
        ctx.fillStyle = next ? (beatFlash > 0 ? '#fff' : CONFIG.colors.yes) : '#2a3355';
        ctx.beginPath(); ctx.roundRect(x, ky - kh / 2, kw, kh, 8); ctx.fill();
        ctx.fillStyle = next ? CONFIG.colors.navy : '#8f9abb'; ctx.font = F16B; ctx.textAlign = 'center';
        ctx.fillText(k ? labB : labA, x + kw / 2, ky + 1);
      }
      ctx.fillStyle = beatFlash > 0 ? '#fff' : '#3a4670'; ctx.beginPath(); ctx.arc(kx, ky, 5, 0, 6.283); ctx.fill();
      ctx.textAlign = 'center';
      if (t < T0 + BEAT * 3) { ctx.font = F12; ctx.fillStyle = '#8f9abb'; ctx.fillText(hintTxt, px + pw / 2, ky + 30); }
      else if (fb > 0) {
        ctx.globalAlpha = Math.min(1, fb * 4); ctx.font = F14B;
        ctx.fillStyle = fbTxt === 'In time' ? '#7dffb0' : '#ffcf7a'; ctx.fillText(fbTxt, kx, ky + 30); ctx.globalAlpha = 1;
      }

      // session progress (the phone charges +1% per full session)
      const gy = py + 152, gw = mw;
      ctx.font = F12; ctx.textAlign = 'left'; ctx.fillStyle = '#97a2c2'; ctx.fillText('CHARGE', px + 16, gy);
      ctx.fillStyle = '#0b1026'; ctx.beginPath(); ctx.roundRect(mx, gy - 8, gw, 16, 5); ctx.fill();
      ctx.fillStyle = sparkT > 0 ? '#ff6b5e' : CONFIG.colors.yes; ctx.beginPath(); ctx.roundRect(mx + 2, gy - 6, Math.max(0, prog / 100 * (gw - 4)), 12, 4); ctx.fill();
      const pn = Math.floor(prog);
      if (pn !== pctN) { pctN = pn; pctTxt = pn >= 100 ? '+1%' : pn + '%'; }
      ctx.textAlign = 'right'; ctx.fillStyle = '#fff'; ctx.fillText(pctTxt, mx - 8, gy);
    },
    end() {
      done = true; endT = -1;
      if (dyn) { dyn.stop(0.5); dyn = null; }
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ov.canvas.width, ov.canvas.height); }
      if (ov) ov.show(false);
    },
    autoplay(a) { done = true; win(a); a.finish({ ok: true }); },
  };
})();
