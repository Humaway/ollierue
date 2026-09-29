// ============================================================ MINIGAMES: Pitch Cards (3.1), Customer Journey (2.10), the Sequencer (3.3)
// Overlay mini-games (SPEC §14). One shared private scope; only one mini-game runs at a time.

Object.assign(MINIGAMES, (() => {
  const F = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  const HAND = '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Chalkboard SE", cursive';
  const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
  const DASH = [5, 5], NODASH = [], NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'], F10M = '10px ' + MONO;
  let api, ov, ctx, W = 0, H = 0, touchEl = null, lpx = -1, lpy = -1, onSize = null, sch = '';

  function open(a, layout) {
    api = a; ov = a.overlay; ctx = ov.ctx; W = H = 0; sch = ''; onSize = layout;
    touchEl = document.getElementById('touch'); lpx = a.input.pointer.x; lpy = a.input.pointer.y;
    ov.show(true);
  }
  function close() {
    if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ov.canvas.width, ov.canvas.height); }
    if (ov) ov.show(false);
  }
  function size() { if (W !== innerWidth || H !== innerHeight || sch !== api.input.scheme) { W = innerWidth; H = innerHeight; sch = api.input.scheme; onSize(); } }
  function clear() { const s = ov.canvas.width / W; ctx.setTransform(s, 0, 0, s, 0, 0); ctx.clearRect(0, 0, W, H); }
  // the on-screen stick and YES/NO buttons also move input.pointer; ignore those
  const ptrOk = () => { const o = api.input.pointer.over; return !(touchEl && o && touchEl.contains(o)); };
  const inRect = (x, y, rx, ry, rw, rh) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;

  // ---------------------------------------------------------- the card table (pitch_cards, journey)
  // Two columns: the ordered list on the left (Lst), the pool on the right (Rst). Drag between them,
  // tap to add/remove; keys: arrows move, YES adds / picks up / drops, NO takes a card back.
  const NOTES = {
    Des: 'Front Gate, 31 years', Bernie: 'Toast for half the college', Declan: 'Machines for shop workers',
    Ronan: 'Sleeps. Still turns up.', 'Siobhán': 'Learned the whole module', Fiachra: 'Four notes now',
    Mick: 'Won a battle (pigeons)', Nuala: 'Minds the old library', Hartigan: 'Never once late',
  };
  const STEPS = ['GREET', 'ASK', 'LISTEN', 'RECOMMEND'];
  const STEP_NOTES = { GREET: 'say hello first', ASK: 'what do they need?', LISTEN: 'actually listen', RECOMMEND: 'the right thing for them' };
  const Lst = [], Rst = [];
  let mode = '', done = true, drag = null, held = null, dox = 0, doy = 0, dsx = 0, dsy = 0, moved = false;
  let tside = 0, tidx = 0, fside = 0, fidx = 0, kb = false, checkT = -1, endT = -1, okT = 0, slowT = 0;
  let colX0 = 0, colX1 = 0, colW = 0, cw = 0, top = 0, cardH = 0, gap = 8, rowsN = 4, bx = 0, by = 0, bw = 0, bh = 0;
  let fTitle = '', fHint = '', fHead = '', fName = '', fSub = '', fNum = '', fBtn = '';
  let title = '', titleS = '', headL = '', headR = '', hintP = '', hintK = '', hx = 0;

  const rowY = (i) => top + 40 + i * (cardH + gap);
  const xL = () => colX0 + 30, xR = () => colX1 + (colW - cw) / 2;

  function tableLayout() {
    const touch = sch === 'touch', foot = (mode === 'pitch' ? 74 : 16) + (touch ? 190 : 8);
    top = touch ? 118 : W < 560 ? 92 : 84; gap = 8; hx = W < 600 ? 16 : W / 2;
    colW = Math.min(330, (W - 36) / 2); colX0 = W / 2 - colW - 6; colX1 = W / 2 + 6; cw = colW - 40;
    cardH = Math.floor(Math.max(34, Math.min(68, (H - top - 48 - foot - (rowsN - 1) * gap) / rowsN)));
    bw = Math.min(320, W - 40); bh = 46; bx = (W - bw) / 2; by = rowY(rowsN) + 14;
    const k = Math.min(1, W / 700);
    fTitle = 'bold ' + (hx === 16 ? 18 : Math.round(17 + 7 * k)) + 'px ' + F; fHint = Math.round(12 + 2 * k) + 'px ' + F;
    fHead = 'bold ' + Math.round(11 + 3 * k) + 'px ' + F; fBtn = 'bold ' + Math.round(14 + 3 * k) + 'px ' + F;
    fName = mode === 'pitch' ? 'bold ' + Math.round(Math.min(cardH * 0.4, cw * 0.14)) + 'px ' + HAND
      : 'bold ' + Math.round(Math.min(cardH * 0.36, cw * 0.12)) + 'px ' + F;
    fSub = Math.round(Math.max(10, Math.min(cardH * 0.2, cw * 0.075))) + 'px ' + HAND;
    fNum = 'bold ' + Math.round(Math.min(22, cardH * 0.4)) + 'px ' + HAND;
    for (let i = 0; i < Lst.length; i++) { Lst[i].x = xL(); Lst[i].y = rowY(i); }
    for (let i = 0; i < Rst.length; i++) { Rst[i].x = xR(); Rst[i].y = rowY(i); }
  }

  function tableStart(a, m) {
    mode = m; done = false; drag = held = null; kb = false; checkT = endT = -1; okT = slowT = 0; fside = fidx = 0;
    Lst.length = Rst.length = 0;
    if (m === 'pitch') {
      const fixed = ['Des', 'Bernie', 'Declan'];
      for (const n of NAMES) {
        const f = fixed.includes(n);
        if (!f && !state.names.includes(n)) continue;
        (f ? Lst : Rst).push({ id: n, label: n, sub: NOTES[n] || '', fixed: f, x: 0, y: 0, tx: 0, ty: 0, wob: 0 });
      }
      rowsN = Lst.length + Rst.length;
      title = "One minute. Who's in Rue's pitch?"; titleS = "Who's in Rue's pitch?"; headL = "RUE'S SPEECH"; headR = "LUKA'S NOTEBOOK";
      hintP = 'Tap a name to add it. Drag cards to set the order.';
      hintK = 'Arrows move · YES adds a name / picks a card up · NO takes it out';
    } else {
      const order = [2, 0, 3, 1]; // shuffled, never already right
      for (let i = 0; i < 4; i++) { const s = STEPS[order[i]]; Rst.push({ id: s, label: s, sub: STEP_NOTES[s], fixed: false, x: 0, y: 0, tx: 0, ty: 0, wob: 0 }); }
      rowsN = 4;
      title = titleS = 'The customer journey'; headL = 'IN ORDER'; headR = 'SIOBHÁN’S NOTES';
      hintP = 'Drag the four cards into order.';
      hintK = 'Arrows move · YES places a card / picks it up · NO takes it back';
    }
    fside = Lst.length ? 0 : 1;
    open(a, tableLayout);
  }

  function changed() {
    if (mode === 'journey' && Lst.length === 4) checkT = 0.5;
    if (fside < 2 && !(fside ? Rst : Lst).length) fside = (fside ? Lst : Rst).length ? 1 - fside : mode === 'pitch' ? 2 : 1;
    if (fside < 2) fidx = Math.max(0, Math.min(fidx, (fside ? Rst : Lst).length - 1));
  }
  function moveCard(c, to) {
    const from = to === Lst ? Rst : Lst;
    from.splice(from.indexOf(c), 1); to.push(c); api.sfx('pop'); changed();
  }
  function refuse(c) { c.wob = 0.4; api.sfx('clunk'); }
  function tap(c) { if (Rst.indexOf(c) >= 0) moveCard(c, Lst); else if (c.fixed) refuse(c); else moveCard(c, Rst); }
  function hitCard(x, y) {
    for (let i = 0; i < Lst.length; i++) if (inRect(x, y, Lst[i].x, Lst[i].y, cw, cardH)) return Lst[i];
    for (let i = 0; i < Rst.length; i++) if (inRect(x, y, Rst[i].x, Rst[i].y, cw, cardH)) return Rst[i];
    return null;
  }
  function confirm() {
    const order = Lst.map((c) => c.id);
    state.flags.pitchOrder = order;
    done = true; api.sfx('pop'); api.finish({ order });
  }

  function tablePointer() {
    const I = api.input, P = I.pointer;
    if (!ptrOk()) return false;
    if (P.x !== lpx || P.y !== lpy) { kb = false; lpx = P.x; lpy = P.y; }
    if (drag) {
      if (Math.abs(P.x - dsx) + Math.abs(P.y - dsy) > 6) moved = true;
      drag.x = P.x - dox; drag.y = P.y - doy;
      tside = drag.fixed || P.x < W / 2 ? 0 : 1;
      const list = tside ? Rst : Lst, n = list.length - (list.indexOf(drag) >= 0 ? 1 : 0);
      tidx = Math.max(0, Math.min(n, Math.round((drag.y - rowY(0)) / (cardH + gap))));
      if (!P.down) {
        const c = drag; drag = null;
        if (!moved) { tap(c); return true; }
        const from = Lst.indexOf(c) >= 0 ? Lst : Rst;
        from.splice(from.indexOf(c), 1); list.splice(Math.min(tidx, list.length), 0, c);
        api.sfx('pop'); changed();
      }
      return true;
    }
    if (!P.pressed) return false;
    if (I.pressed('no')) return true; // right click: nothing
    const c = hitCard(P.x, P.y);
    if (c) {
      drag = c; held = null; moved = false; dox = P.x - c.x; doy = P.y - c.y; dsx = P.x; dsy = P.y;
      tside = Lst.indexOf(c) >= 0 ? 0 : 1; tidx = (tside ? Rst : Lst).indexOf(c);
    } else if (mode === 'pitch' && inRect(P.x, P.y, bx, by, bw, bh)) confirm();
    return true; // a click on the table never falls through as YES
  }

  function tableKeys() {
    const I = api.input;
    const dy = I.pressed('up') ? -1 : I.pressed('down') ? 1 : 0, dx = I.pressed('left') ? -1 : I.pressed('right') ? 1 : 0;
    const yes = I.pressed('yes'), no = I.pressed('no');
    if (!(dx || dy || yes || no)) return;
    kb = true;
    if (held) {
      const i = Lst.indexOf(held), j = i + dy;
      if (dy && j >= 0 && j < Lst.length) { Lst[i] = Lst[j]; Lst[j] = held; fidx = j; api.sfx('tick'); }
      if (yes || no) { held = null; api.sfx('pop'); changed(); }
      return;
    }
    if (dx && fside < 2) { const s = fside + dx; if (s >= 0 && s <= 1 && (s ? Rst : Lst).length) { fside = s; fidx = Math.min(fidx, (s ? Rst : Lst).length - 1); } }
    if (dy) {
      if (fside === 2) { if (dy < 0 && Lst.length) { fside = 0; fidx = Lst.length - 1; } }
      else {
        const n = (fside ? Rst : Lst).length;
        fidx += dy;
        if (fidx >= n) { fidx = n - 1; if (mode === 'pitch') fside = 2; }
        if (fidx < 0) fidx = 0;
      }
    }
    if (yes) {
      if (fside === 2) confirm();
      else if (fside === 1) { if (Rst[fidx]) moveCard(Rst[fidx], Lst); }
      else if (Lst[fidx]) { held = Lst[fidx]; api.sfx('tick'); }
    } else if (no && fside === 0 && Lst[fidx]) {
      if (Lst[fidx].fixed) refuse(Lst[fidx]); else moveCard(Lst[fidx], Rst);
    }
  }

  function place(list, side, k) {
    let v = 0;
    for (let i = 0; i < list.length; i++) {
      const c = list[i];
      if (c === drag) continue;
      if (drag && tside === side && v === tidx) v++;
      c.tx = side ? xR() : xL(); c.ty = rowY(v++);
      c.x += (c.tx - c.x) * k; c.y += (c.ty - c.y) * k;
      if (c.wob > 0) c.wob -= 1 / 60;
    }
  }

  function tableUpdate(dt) {
    if (done) return;
    size();
    if (okT > 0) okT -= dt;
    if (slowT > 0) slowT -= dt;
    if (endT >= 0) { endT -= dt; if (endT < 0) { done = true; api.finish({ ok: true }); } }
    else if (checkT >= 0) {
      checkT -= dt;
      if (checkT < 0) {
        let ok = true;
        for (let i = 0; i < 4; i++) if (Lst[i].id !== STEPS[i]) ok = false;
        if (ok) { okT = 1; endT = 1.1; api.sfx('chime_ready'); }
        else { // they shuffle back, gently
          api.sfx('clunk'); slowT = 1;
          for (let i = 0; i < 4; i++) Rst.push(Lst[(i * 3 + 1) % 4]);
          Lst.length = 0; fside = 1; fidx = 0;
        }
      }
    } else if (!tablePointer()) tableKeys();
    const k = Math.min(1, dt * (slowT > 0 ? 5 : 16));
    place(Lst, 0, k); place(Rst, 1, k);
  }

  function drawCard(c, x, y, lift, focus, hover) {
    const h = cardH, w = cw;
    if (c.wob > 0) x += Math.sin(c.wob * 60) * 4;
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.roundRect(x + (lift ? 5 : 2), y + (lift ? 8 : 3), w, h, 4); ctx.fill();
    ctx.fillStyle = okT > 0 && Lst.indexOf(c) >= 0 ? '#e9fbe6' : hover ? '#fffdf4' : '#fbf5e1';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 4); ctx.fill();
    ctx.fillStyle = '#e6a3a3'; ctx.fillRect(x + 5, y + h * 0.24, w - 10, 1.5);
    ctx.fillStyle = '#cad7ec'; for (let ly = y + h * 0.24 + h * 0.19; ly < y + h - 3; ly += h * 0.19) ctx.fillRect(x + 5, ly, w - 10, 1);
    const sub = c.sub && h >= 44;
    ctx.fillStyle = '#1f2a5a'; ctx.font = fName; ctx.textAlign = mode === 'pitch' ? 'left' : 'center';
    ctx.fillText(c.label, mode === 'pitch' ? x + 12 : x + w / 2, y + h * (sub ? 0.47 : 0.56));
    if (sub) { ctx.fillStyle = '#6a6f80'; ctx.font = fSub; ctx.fillText(c.sub, mode === 'pitch' ? x + 12 : x + w / 2, y + h * 0.8); }
    if (c.fixed) {
      ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(x + w - 13, y + 11, 6, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#f5b7b1'; ctx.beginPath(); ctx.arc(x + w - 15, y + 9, 2, 0, 6.283); ctx.fill();
    }
    if (focus) { ctx.lineWidth = 3; ctx.strokeStyle = CONFIG.colors.yes; ctx.beginPath(); ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 7); ctx.stroke(); }
  }

  function tableDraw() {
    if (done || !W) return;
    clear();
    ctx.textBaseline = 'middle';
    // table top
    ctx.fillStyle = mode === 'pitch' ? '#4a3324' : '#3a4450'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = mode === 'pitch' ? '#3f2b1e' : '#333c47';
    for (let y = 70; y < H; y += 70) ctx.fillRect(0, y, W, 2);
    // header
    ctx.textAlign = hx === 16 ? 'left' : 'center'; ctx.fillStyle = '#fff'; ctx.font = fTitle; ctx.fillText(hx === 16 ? titleS : title, hx, 28);
    ctx.fillStyle = '#e2d6c4'; ctx.font = fHint; ctx.fillText(kb ? hintK : hintP, hx, 56);
    // left column: numbered slots
    const colH = rowsN * (cardH + gap) + 36;
    ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.roundRect(colX0, top, colW, colH, 10); ctx.fill();
    ctx.fillStyle = CONFIG.colors.yes; ctx.font = fHead; ctx.textAlign = 'left'; ctx.fillText(headL, colX0 + 12, top + 18);
    const slots = mode === 'journey' ? 4 : Lst.length + (drag && tside === 0 && Lst.indexOf(drag) < 0 ? 1 : 0);
    ctx.setLineDash(DASH); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < slots; i++) {
      ctx.beginPath(); ctx.roundRect(xL(), rowY(i), cw, cardH, 4); ctx.stroke();
    }
    ctx.setLineDash(NODASH);
    if (mode === 'pitch') { ctx.fillStyle = 'rgba(244,236,216,0.55)'; ctx.font = fSub; ctx.textAlign = 'left'; ctx.fillText('Pinned names stay in.', colX0 + 14, top + colH - 14); }
    ctx.fillStyle = '#f4ecd8'; ctx.font = fNum; ctx.textAlign = 'center';
    for (let i = 0; i < slots; i++) ctx.fillText(NUMS[i], colX0 + 16, rowY(i) + cardH / 2);
    // right column: paper
    ctx.fillStyle = mode === 'pitch' ? '#f1f2ec' : '#fbfaf2'; ctx.beginPath(); ctx.roundRect(colX1, top, colW, colH, 4); ctx.fill();
    if (mode === 'pitch') { // continuous-form printout: green bars, tractor holes
      ctx.fillStyle = '#dfeedd'; for (let y = top + 30; y < top + colH - 10; y += 44) ctx.fillRect(colX1 + 14, y, colW - 28, 22);
      ctx.fillStyle = '#4a3324'; for (let y = top + 10; y < top + colH - 4; y += 16) { ctx.beginPath(); ctx.arc(colX1 + 7, y, 3, 0, 6.283); ctx.arc(colX1 + colW - 7, y, 3, 0, 6.283); ctx.fill(); }
      if (colW >= 290) { ctx.fillStyle = '#b8bcc4'; ctx.font = F10M; ctx.textAlign = 'right'; ctx.fillText('JARVIS ERR 4044', colX1 + colW - 16, top + 18); }
    } else {
      ctx.fillStyle = '#d3def0'; for (let y = top + 30; y < top + colH; y += 18) ctx.fillRect(colX1, y, colW, 1);
      ctx.fillStyle = '#eab0b0'; ctx.fillRect(colX1 + 18, top, 1.5, colH);
    }
    ctx.fillStyle = '#2b3350'; ctx.font = fHead; ctx.textAlign = 'left'; ctx.fillText(headR, colX1 + 24, top + 18);
    if (mode === 'pitch' && !Rst.length) { ctx.fillStyle = '#8a8f9c'; ctx.font = fSub; ctx.fillText('(everyone’s in)', colX1 + 24, rowY(0) + cardH / 2); }

    // cards
    const P = api.input.pointer, hov = !kb && !drag && ptrOk() ? hitCard(P.x, P.y) : null;
    for (let i = 0; i < Lst.length; i++) { const c = Lst[i]; if (c !== drag && c !== held) drawCard(c, c.x, c.y, false, kb && fside === 0 && fidx === i, c === hov); }
    for (let i = 0; i < Rst.length; i++) { const c = Rst[i]; if (c !== drag) drawCard(c, c.x, c.y, false, kb && fside === 1 && fidx === i, c === hov); }
    if (held) drawCard(held, held.x - 6, held.y - 4, true, true, false);
    if (drag) {
      ctx.save(); ctx.translate(drag.x + cw / 2, drag.y + cardH / 2); ctx.rotate(-0.04);
      drawCard(drag, -cw / 2, -cardH / 2, true, false, false); ctx.restore();
    }
    // confirm
    if (mode === 'pitch') {
      const f = kb && fside === 2, hb = !kb && inRect(P.x, P.y, bx, by, bw, bh);
      ctx.fillStyle = f || hb ? '#ffe36b' : CONFIG.colors.yes; ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 23); ctx.fill();
      if (f) { ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.stroke(); }
      ctx.fillStyle = CONFIG.colors.navy; ctx.font = fBtn; ctx.textAlign = 'center'; ctx.fillText('YES — That’s the speech', W / 2, by + bh / 2 + 1);
    }
  }

  const tableEnd = () => { done = true; drag = held = null; close(); };

  // ---------------------------------------------------------- the Sequencer
  // 92 BPM, 4 lanes x 16 steps, green on black. AUDIO.seq plays it (fallback: sfx per step).
  const DEF = [[0, 4, 8, 12], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 5, 7, 10, 13]];
  const LANE = [ // sample key, name, role, cell tag, sfx, bleep rate
    ['dynamo', 'DYNAMO', 'KICK', 'DYN', 'dynamo_hit', 0.5], ['till', 'TILL', 'SNARE', 'TIL', 'till', 0.8],
    ['kettle', 'KETTLE', 'HAT', 'KET', 'kettle_click', 1.6], ['whistle', 'WHISTLE', 'LEAD', '', 'whistle', 1],
  ];
  const MEL = ['D-5', 'F#5', 'A-5', 'F#5', 'E-5', 'G-5', 'B-5', 'A-5', 'F#5', 'A-5', 'D-6', 'B-5', 'A-5', 'F#5', 'E-5', 'D-5'];
  const MELL = ['d-5', 'f#5', 'a-5', 'f#5', 'e-5', 'g-5', 'b-5', 'a-5', 'f#5', 'a-5', 'd-6', 'b-5', 'a-5', 'f#5', 'e-5', 'd-5'];
  const MELR = [0, 4, 7, 4, 2, 5, 9, 7, 4, 7, 12, 9, 7, 4, 2, 0].map((n) => Math.pow(2, n / 12));
  const ROWS = []; for (let i = 1; i <= 16; i++) ROWS.push(i < 10 ? '0' + i : '' + i);
  const PAT = [[], [], [], []], HAS = [false, false, false, false], NAME = ['', '', '', ''], TAG = ['', '', '', ''];
  const STEP = 60 / 92 / 4;
  let sDone = true, sr = 0, sc = 0, bsel = 0, playing = false, own = false, acc = 0, playRow = -1, extras = '', extrasN = '', narrow = false, hy = 0;
  let gx = 0, gy = 0, rowH = 0, colW2 = 0, numW = 0, sbw = 0, sbh = 38, sby = 0, fRow = '', fHdr = '', fBig = '', fSm = '', helpTxt = '';
  const onStep = (i) => { playRow = i % 16; };

  function seqLayout() {
    const touch = sch === 'touch', foot = 84 + (touch ? 190 : 6);
    narrow = W < 600; hy = touch ? 40 : 0; gy = 108 + hy;
    rowH = Math.floor(Math.max(16, Math.min(30, (H - gy - foot) / 16)));
    numW = Math.round(Math.max(34, Math.min(56, W * 0.08)));
    colW2 = Math.floor(Math.max(62, Math.min(150, (W - 20 - numW) / 4)));
    gx = Math.round((W - numW - 4 * colW2) / 2 + numW);
    sbw = Math.min(170, (W - 40) / 2); sby = gy + 16 * rowH + 14;
    const f = Math.round(Math.min(rowH * 0.62, colW2 * 0.2));
    fRow = 'bold ' + f + 'px ' + MONO; fHdr = 'bold ' + Math.round(Math.min(15, colW2 * 0.17)) + 'px ' + MONO;
    fBig = 'bold ' + Math.round(Math.min(22, W * 0.05)) + 'px ' + MONO; fSm = Math.round(Math.min(13, W * 0.031)) + 'px ' + MONO;
    helpTxt = touch ? 'TAP A STEP TO TOGGLE IT' : 'ARROWS/MOUSE MOVE · YES TOGGLE · NO PLAY/STOP';
  }

  function play(on) {
    const q = api.AUDIO && api.AUDIO.seq;
    if (on === playing) return;
    playing = on; playRow = -1;
    if (q) { own = false; if (on) q.play(PAT, state.samples, onStep); else q.stop(); }
    else { own = on; acc = STEP; }
  }
  const SO = { rate: 1, vol: 1 }; // reused: the fallback clock fires these every step
  function hitSfx(l, r) {
    SO.rate = l === 3 ? MELR[r] : HAS[l] ? 1 : LANE[l][5]; SO.vol = HAS[l] ? 0.8 : 0.6;
    api.sfx(HAS[l] ? LANE[l][4] : 'beep', SO);
  }
  function toggle(r, c) { PAT[c][r] = !PAT[c][r]; if (PAT[c][r] && !playing) hitSfx(c, r); else api.sfx('tick', { vol: 0.5 }); }
  function seqFinish() {
    play(false);
    state.pattern = PAT.map((l) => l.slice());
    sDone = true; api.finish({ pattern: state.pattern });
  }
  function loadPattern() {
    const sp = state.pattern, ok = Array.isArray(sp) && sp.length === 4 && sp.every((l) => Array.isArray(l) && l.length === 16);
    for (let l = 0; l < 4; l++) { PAT[l].length = 16; for (let i = 0; i < 16; i++) PAT[l][i] = ok ? !!sp[l][i] : DEF[l].includes(i); }
  }

  const sequencer = {
    start(params, a) {
      sDone = false; sr = sc = bsel = 0; playing = own = false; playRow = -1;
      loadPattern();
      const sm = state.samples || [];
      for (let l = 0; l < 4; l++) { HAS[l] = sm.includes(LANE[l][0]); NAME[l] = HAS[l] ? LANE[l][1] : 'BLEEP'; TAG[l] = HAS[l] ? LANE[l][3] : 'BLP'; }
      extras = 'RAIN BED ' + (sm.includes('rain') ? 'ON' : '--') + '   TRILL INTRO ' + (sm.includes('trill') ? 'ON' : '--') + '   BELL ' + (sm.includes('bell') ? 'ON' : '--');
      extrasN = '92 BPM   ' + extras;
      open(a, seqLayout);
    },
    update(dt) {
      if (sDone) return;
      size();
      if (own) { // no AUDIO.seq: tick our own clock and fire one-shots
        acc += dt;
        while (acc >= STEP) { acc -= STEP; playRow = (playRow + 1) % 16; for (let l = 0; l < 4; l++) if (PAT[l][playRow]) hitSfx(l, playRow); }
      }
      const I = api.input, P = I.pointer, ok = ptrOk();
      const col = Math.floor((P.x - gx) / colW2), row = Math.floor((P.y - gy) / rowH);
      const onCell = ok && col >= 0 && col < 4 && row >= 0 && row < 16;
      const onPlay = ok && inRect(P.x, P.y, W / 2 - sbw - 8, sby, sbw, sbh), onFin = ok && inRect(P.x, P.y, W / 2 + 8, sby, sbw, sbh);
      if (ok && (P.x !== lpx || P.y !== lpy)) {
        lpx = P.x; lpy = P.y;
        if (onCell) { sr = row; sc = col; } else if (onPlay || onFin) { sr = 16; bsel = onPlay ? 0 : 1; }
      }
      if (ok && P.pressed && !I.pressed('no')) {
        if (onCell) { sr = row; sc = col; toggle(row, col); }
        else if (onPlay) play(!playing);
        else if (onFin) seqFinish();
        return;
      }
      if (I.pressed('no')) { play(!playing); return; }
      if (I.pressed('up') && sr > 0) sr--;
      if (I.pressed('down') && sr < 16) { sr++; if (sr === 16) bsel = sc < 2 ? 0 : 1; }
      if (I.pressed('left')) { if (sr === 16) bsel = 0; else if (sc > 0) sc--; }
      if (I.pressed('right')) { if (sr === 16) bsel = 1; else if (sc < 3) sc++; }
      if (I.pressed('yes')) { if (sr < 16) toggle(sr, sc); else if (bsel) seqFinish(); else play(!playing); }
    },
    draw() {
      if (sDone || !W) return;
      clear();
      ctx.fillStyle = '#020603'; ctx.fillRect(0, 0, W, H);
      ctx.textBaseline = 'middle';
      const G = '#39ff6a', D = '#1d6b34', x0 = gx - numW, x1 = gx + 4 * colW2;
      ctx.fillStyle = G; ctx.font = fBig; ctx.textAlign = 'left'; ctx.fillText('PUDDING.SEQ', x0, 26);
      if (!narrow) { ctx.textAlign = 'right'; ctx.fillText('92 BPM', x1, 26); }
      ctx.font = fSm; ctx.fillStyle = D; ctx.textAlign = 'left'; ctx.fillText(narrow ? extrasN : extras, x0, 52);
      ctx.fillStyle = G; ctx.fillRect(x0, 64, x1 - x0, 1);
      for (let l = 0; l < 4; l++) {
        const cx = gx + l * colW2 + colW2 / 2;
        ctx.textAlign = 'center'; ctx.font = fHdr; ctx.fillStyle = HAS[l] ? G : '#c8ffb0'; ctx.fillText(NAME[l], cx, 80 + hy);
        ctx.fillStyle = D; ctx.font = fSm; ctx.fillText(LANE[l][2], cx, 97 + hy);
      }
      ctx.font = fRow;
      for (let r = 0; r < 16; r++) {
        const y = gy + r * rowH;
        if (r === playRow) { ctx.fillStyle = '#0d4020'; ctx.fillRect(x0, y, x1 - x0, rowH); }
        ctx.textAlign = 'left'; ctx.fillStyle = r % 4 === 0 ? G : D; ctx.fillText(ROWS[r], x0 + 2, y + rowH / 2 + 1);
        for (let l = 0; l < 4; l++) {
          const x = gx + l * colW2, on = PAT[l][r], cur = sr === r && sc === l;
          if (cur) { ctx.fillStyle = G; ctx.fillRect(x + 2, y + 1, colW2 - 4, rowH - 2); }
          ctx.fillStyle = cur ? '#021' : on ? G : D; ctx.textAlign = 'center';
          ctx.fillText(l === 3 ? (on ? MEL[r] : MELL[r]) : on ? TAG[l] : '···', x + colW2 / 2, y + rowH / 2 + 1);
        }
      }
      ctx.fillStyle = D; ctx.fillRect(x0, gy + 16 * rowH + 4, x1 - x0, 1);
      for (let b = 0; b < 2; b++) {
        const x = b ? W / 2 + 8 : W / 2 - sbw - 8, f = sr === 16 && bsel === b;
        ctx.fillStyle = f ? G : '#020603'; ctx.fillRect(x, sby, sbw, sbh);
        ctx.lineWidth = 2; ctx.strokeStyle = G; ctx.strokeRect(x + 1, sby + 1, sbw - 2, sbh - 2);
        ctx.fillStyle = f ? '#021' : G; ctx.font = fHdr; ctx.textAlign = 'center';
        ctx.fillText(b ? '[ FINISH ]' : playing ? '[ STOP ]' : '[ PLAY ]', x + sbw / 2, sby + sbh / 2 + 1);
      }
      ctx.fillStyle = D; ctx.font = fSm; ctx.fillText(helpTxt, W / 2, sby + sbh + 20);
    },
    end() { play(false); sDone = true; close(); },
    autoplay(a) { api = a; playing = false; loadPattern(); state.pattern = PAT.map((l) => l.slice()); sDone = true; a.finish({ pattern: state.pattern }); },
  };

  return {
    pitch_cards: {
      start(params, a) { tableStart(a, 'pitch'); },
      update: tableUpdate, draw: tableDraw, end: tableEnd,
      autoplay(a) { // everyone collected, in notebook order
        const order = NAMES.filter((n) => n === 'Des' || n === 'Bernie' || n === 'Declan' || state.names.includes(n));
        state.flags.pitchOrder = order; done = true; a.finish({ order });
      },
    },
    journey: {
      start(params, a) { tableStart(a, 'journey'); },
      update: tableUpdate, draw: tableDraw, end: tableEnd,
      autoplay(a) { done = true; a.finish({ ok: true }); },
    },
    sequencer,
  };
})());
