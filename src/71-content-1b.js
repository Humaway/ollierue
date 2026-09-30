// ============================================================ CONTENT: 1.2 ("Margarine") and 1.3 ("Language Detected")
// SPEC §9. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
(() => {
  const PI = Math.PI, H = PI / 2;

  // ---------------------------------------------------------- shared shots and helpers
  // Hold this shot into the next mini-game: no ease back to the gameplay camera in between (the shot is set even
  // when the cutscene was skipped, so the mini-game never opens over a stale angle).
  const into = (shot) => ({ do: (c) => { c.cam.shot(shot); c.cam.cutscene = false; } });
  // "over the shoulder": the app window fills the middle; the player's shoulder on one side, the customer on the other
  const OTS_CHASE = { shot: 'CAM', pos: [5.0, 1.74, -10.58], look: [2.92, 1.35, -8.33], fov: 45 };
  const OTS_LUKA = { shot: 'CAM', pos: [7.1, 1.74, -10.58], look: [5.02, 1.35, -8.33], fov: 45 };
  const screen = (mode) => ({ prop: 'monitor_screen', fn: (o) => o.userData.show(mode) });
  // INSERT on Chase's monitor with the readable JARVIS screen card; `jmon` repaints it in the same frame.
  const MON = (data, fov = 30) => ({ shot: 'INSERT', at: [4.3, 1.3, -9.03], from: [4.3, 1.31, -9.45], fov, card: ['jmon', data] });
  const jmon = (data) => ({ do: (c) => c.ui.card('jmon', data) });
  // Margaret stays at the same kind eye level every time (while Chase's angles climb): one framing, reused.
  const MARGARET = { shot: 'CLOSE', on: 'margaret' };
  // "from the back of the store": the long view past the counter to the bright front doors (Margaret out, Dazza out).
  const EXIT_WIDE = { shot: 'CAM', pos: [7.35, 2.15, -12.25], look: [0.6, 1.0, -2.2], fov: 50 };
  // THE TOP-DOWN (mirrored in 2.13 and the Epilogue): Chase at SLUMP, straight down from 1.5 m over his eyes,
  // fov 40, frame-up = the way he faces (along the counter), lens 0.25 m toward his monitor so it sits beside him.
  const SLUMP = [4.2, 0, -9.8, -H];
  const TOP_DOWN = { shot: 'TOP', on: 'chase', dist: 1.5, offset: 0.25 };

  // a burst of JARVIS pop-ups on a beat pattern (seconds to the next one)
  async function storm(c, msgs, beats, grow) {
    for (let i = 0; i < beats.length && !c.flow.skipping; i++) {
      c.popup({ msg: msgs[i % msgs.length], icon: i % 3 ? 'warn' : 'info', buttons: ['OK'], shake: true, w: grow ? 280 + i * 75 : undefined,
        at: [0.5 + (Math.random() - 0.5) * 0.7, 0.5 + (Math.random() - 0.5) * 0.45] });
      await c.wait(beats[i]);
    }
  }
  // 09:14 dissolves to 09:31 in the same frame; the spinner doesn't move
  async function dissolve(c) {
    for (let k = 1; k <= 8 && !c.flow.skipping; k++) { c.ui.card('jmon', { mode: 'spin', from: '09:14', time: '09:31', mix: k / 8 }); await c.wait(0.07); }
  }
  // "The screen goes black, and so does he": the screen's blue light on his face goes out with it
  const lightsOut = (c) => { const s = c.world.torch; if (s) s.intensity = 0; };
  // the last pop-up sits on the dead monitor beside him
  function patience(c) {
    const p = c.cam.project(new THREE.Vector3(4.3, 1.3, -9.0)), cl = (v, a, b) => Math.max(a, Math.min(b, v));
    c.popup({ msg: 'Thanks for your patience!', icon: 'info', buttons: [], w: 250,
      at: [cl(p.x / innerWidth, 0.2, 0.8), cl(p.y / innerHeight, 0.3, 0.7)] });
  }
  // the monitor after the pop-ups have filled it: nothing but white
  function whiteScreen(c) {
    const o = c.world.prop('monitor_screen');
    if (o) o.traverse((m) => {
      const t = m.material && m.material.map, cv = t && t.image;
      if (cv && cv.getContext) { const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); t.needsUpdate = true; }
    });
  }
  // A censored line (the engine's censor): typed up to its dash, then JARVIS slams the pop-up over the speaker's face.
  // It stays where it landed, OK or no OK: dismissed, JARVIS puts it straight back.
  const LANG = 'Language detected. This interaction has been flagged for coaching.';
  function cuss(id, text, msg = LANG) {
    let n = 0;
    return [{ do: (c) => { n = c.popup.count(); } }, { say: id, text, censor: msg },
      { do: (c) => { if (!c.flow.skipping && c.popup.count() <= n) c.popup({ msg, icon: 'warn', buttons: ['OK'], at: { actor: id }, ding: false }); } }];
  }
  const mood = (id, m) => ({ do: (c) => { const a = c.world.actor(id); if (a) a.mood = m; } });

  // The JARVIS screen on the counter monitor, as a readable INSERT card.
  // {mode: 'spin'|'form'|'crash'|'optin', time, from?, mix? (clock dissolve), name?, click?}
  CARDS.jmon = (cx, w, h, d) => {
    const m = d.mode || 'form', X = 34, Y = 30, W = w - 68, S = h - 90, F = 'system-ui, "Segoe UI", Roboto, sans-serif';
    const font = (px, b = '') => { cx.font = `${b} ${px}px ${F}`; };
    if (d.zoom) { cx.translate(w / 2, h / 2); cx.scale(d.zoom, d.zoom); cx.translate(-262, -372); }   // ECU on the cursor over YES
    cx.fillStyle = '#2a2c30'; cx.fillRect(w * 0.44, h - 40, w * 0.12, 40);
    cx.fillStyle = '#16181c'; cx.fillRect(0, 0, w, h - 34);
    cx.textBaseline = 'middle';
    if (m === 'crash') {
      cx.fillStyle = '#1d4fb6'; cx.fillRect(X, Y, W, S);
      cx.fillStyle = '#fff'; font(110, '300'); cx.fillText(':(', X + 50, Y + 120);
      font(28); cx.fillText('JARVIS has stopped responding and needs to restart.', X + 50, Y + 250, W - 100);
      font(18); cx.globalAlpha = 0.85; cx.fillText('JARVIS © 1987–2026 JARVIS SYSTEMS. All rights reserved.', X + 50, Y + S - 40); cx.globalAlpha = 1;
      return;
    }
    cx.fillStyle = '#f3f4f7'; cx.fillRect(X, Y, W, S);
    const g = cx.createLinearGradient(0, Y, 0, Y + 70); g.addColorStop(0, '#e6e8ec'); g.addColorStop(1, '#d4d8de');
    cx.fillStyle = g; cx.fillRect(X, Y, W, 70);
    cx.fillStyle = '#2f6fd6'; font(26, 'italic 800'); cx.fillText('JARVIS', X + 22, Y + 35);
    cx.fillStyle = '#4a505c'; font(22); cx.fillText('JARVIS Retail — New Service', X + 140, Y + 35);
    cx.textAlign = 'right'; cx.fillStyle = '#1e2430'; font(44, '600');
    if (d.from) { cx.globalAlpha = 1 - (d.mix ?? 1); cx.fillText(d.from, X + W - 22, Y + 36); }
    cx.globalAlpha = d.from ? d.mix ?? 1 : 1; cx.fillText(d.time || '', X + W - 22, Y + 36); cx.globalAlpha = 1; cx.textAlign = 'left';
    const bx = X + 36, bw = W - 72;
    if (m === 'spin') {
      cx.strokeStyle = '#c8d5ee'; cx.lineWidth = 16; cx.beginPath(); cx.arc(w / 2, Y + 230, 58, 0, 2 * PI); cx.stroke();
      cx.strokeStyle = '#2f6fd6'; cx.beginPath(); cx.arc(w / 2, Y + 230, 58, -0.4, 1.3); cx.stroke();
      cx.fillStyle = '#4a5261'; font(30); cx.textAlign = 'center'; cx.fillText('Please wait…', w / 2, Y + 350); cx.textAlign = 'left';
      return;
    }
    if (m === 'optin') {
      cx.fillStyle = '#1e2430'; font(32, '600'); cx.fillText('Marketing opt-in', bx, Y + 130);
      cx.fillStyle = '#fff'; cx.fillRect(bx, Y + 175, bw, 70); cx.strokeStyle = '#c3c9d2'; cx.lineWidth = 2; cx.strokeRect(bx, Y + 175, bw, 70);
      cx.fillStyle = '#2b2f36'; font(28); cx.fillText('Send me offers from JARVIS partners', bx + 20, Y + 210);
      const btn = (x, label, on) => {
        cx.fillStyle = on ? (d.click ? '#1d4fa8' : '#2f6fd6') : '#c9ced6'; cx.fillRect(x, Y + 290, 170, 76);
        cx.fillStyle = on ? '#fff' : '#f4f5f7'; font(34, 'bold'); cx.textAlign = 'center'; cx.fillText(label, x + 85, Y + 328); cx.textAlign = 'left';
      };
      btn(bx + 60, 'YES', true); btn(bx + 290, 'NO', false);
      const px = bx + 150 + (d.click ? 2 : 0), py = Y + 336 + (d.click ? 2 : 0);   // the cursor over YES
      cx.fillStyle = '#fff'; cx.strokeStyle = '#000'; cx.lineWidth = 3; cx.beginPath();
      cx.moveTo(px, py); cx.lineTo(px, py + 58); cx.lineTo(px + 14, py + 45); cx.lineTo(px + 24, py + 68); cx.lineTo(px + 33, py + 64);
      cx.lineTo(px + 23, py + 41); cx.lineTo(px + 41, py + 41); cx.closePath(); cx.fill(); cx.stroke();
      return;
    }
    const rows = [['Customer search', d.name || ''], ['Date of birth', '12 / 04 / 1900'], ['ID scan', ''], ['MFA code', ''], ['Plan', ''], ['Add service', '']];
    rows.forEach(([k, v], i) => {
      const y = Y + 100 + i * 64;
      cx.fillStyle = i ? '#fff' : '#eef4ff'; cx.fillRect(bx, y, bw, 54); cx.fillStyle = i ? '#dde1e7' : '#2f6fd6'; cx.fillRect(bx, y, 6, 54);
      cx.fillStyle = '#4a5261'; font(24); cx.fillText(k, bx + 22, y + 27);
      cx.fillStyle = '#fff'; cx.fillRect(bx + 290, y + 8, bw - 310, 38); cx.strokeStyle = '#c3c9d2'; cx.lineWidth = 2; cx.strokeRect(bx + 290, y + 8, bw - 310, 38);
      if (!v) return;
      font(26, 'bold');
      if (i === 0 && d.name) { cx.fillStyle = 'rgba(255,210,31,.6)'; cx.fillRect(bx + 298, y + 12, cx.measureText(v).width + 16, 30); }
      cx.fillStyle = '#1e2430'; cx.fillText(v, bx + 306, y + 28);
    });
  };
  CARDS.jmon.size = [960, 600];

  // Her dead phone on the counter: black glass with both their faces in it, looking down (Margaret left, Chase right).
  CARDS.deadphone = (cx, w, h) => {
    CARDS.phone(cx, w, h, { tone: 'dead' });   // black glass; the painter already lays in two faint heads and shoulders
    const pw = w * 0.9, m = pw * 0.045, sx = w * 0.05 + m, sy = h * 0.02 + m, sw = pw - 2 * m, sh = h * 0.96 - 2 * m;
    cx.save(); cx.beginPath(); cx.roundRect(sx, sy, sw, sh, pw * 0.13 - m); cx.clip();
    const face = (fx, fy, hair, messy) => {
      const x = sx + sw * fx, y = sy + sh * fy, r = sw * 0.13;
      cx.fillStyle = 'rgba(215,200,190,.16)'; cx.beginPath(); cx.ellipse(x, y, r * 0.8, r, 0, 0, 2 * PI); cx.fill();
      cx.fillStyle = hair;
      if (messy) for (let i = -3; i <= 3; i++) { cx.beginPath(); cx.ellipse(x + i * r * 0.26, y - r * 0.82 + Math.abs(i) * 3, r * 0.3, r * 0.36, i * 0.3, 0, 2 * PI); cx.fill(); }
      else for (let i = 0; i < 9; i++) { const a = PI * (0.95 + i * 0.137); cx.beginPath(); cx.arc(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 1.05, r * 0.3, 0, 2 * PI); cx.fill(); }
      cx.fillStyle = 'rgba(10,12,16,.55)';
      for (const e of [-1, 1]) { cx.beginPath(); cx.ellipse(x + e * r * 0.32, y - r * 0.05, r * 0.1, r * 0.07, 0, 0, 2 * PI); cx.fill(); }
    };
    face(0.34, 0.4, 'rgba(225,228,236,.22)', false);   // Margaret: soft silver curls
    face(0.68, 0.45, 'rgba(120,85,55,.3)', true);      // Chase: messy brown hair
    const g = cx.createLinearGradient(sx, sy, sx + sw, sy + sh * 0.6);
    g.addColorStop(0.45, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.07)'); g.addColorStop(0.58, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fillRect(sx, sy, sw, sh);
    cx.restore();
  };
  CARDS.deadphone.size = [420, 800];

  // =================================================================== 1.2 — "Margarine"
  SCENES['1.2'] = {
    title: 'Margarine', set: 'reddy', env: 'day', time: 'Tue 29 Sep 2026, 09:14',
    playable: ['chase'], swap: false, hud: null, music: 'reddy',
    spawn: { chase: 'counter_chase', margaret: [1.0, 0, 7.8, -2.7] },
    steps: [
      ['cutscene', '1.2_open'],
      ['control', 'chase'],
      ['objective', "Add Margaret's grandson to her plan."],
      ['minigame', 'jarvis_sale', { cycle: 1, cap: 50, mode: 'margaret', time: '09:14', shot: OTS_CHASE }],
      ['cutscene', '1.2_wait1'],
      ['minigame', 'jarvis_sale', { cycle: 2, cap: 50, mode: 'margaret', time: '09:31', shot: OTS_CHASE }],
      ['cutscene', '1.2_wait2'],
      ['minigame', 'jarvis_sale', { cycle: 3, cap: 50, mode: 'margaret', short: true, time: '10:02', shot: OTS_CHASE }],
      ['objective', null],
      ['cutscene', '1.2_end'],
    ],
    grants: { flags: { seen_popups: true, seen_margarine: true, seen_runaway: true, seen_backwards: true, seen_mfa: true, seen_optin: true, seen_restarts: true } },
  };

  CUTSCENES['1.2_open'] = [
    // [WIDE · locked, from inside, through the front window] Margaret crosses the car park in the heat: lilac cardigan,
    // handbag, walking stick, in no hurry at all. The doors open for her.
    { shot: 'CAM', pos: [-0.4, 1.5, -3.8], look: [-1.9, 1.05, 6.0], fov: 48 },
    { move: 'margaret', to: [-2.0, 0, 1.4, PI], speed: 1.15 },
    { sfx: 'door_slide', vol: 0.6 },
    { move: 'margaret', to: [-2.0, 0, -0.2, PI], speed: 1.15 },
    // [MID · across the counter] Chase and Margaret face to face, one on each side of the frame.
    { place: 'margaret', at: 'counter_customer2' },
    { prop: 'margaret_phone', visible: true },
    { shot: 'CAM', pos: [1.55, 1.55, -9.05], look: [4.3, 1.42, -9.05], fov: 40 },   // profile from the counter's end: the monitor between them
    { say: 'margaret', text: "Morning, love. I'd like to put my grandson on my plan. He says my phone's embarrassing him." },
    { say: 'chase', text: 'Easy. Five minutes, tops.' },
    // JARVIS Sale: over Chase's shoulder, the app window filling two-thirds of the screen
    { music: 'reddy_frantic', fade: 0.6 },
    into(OTS_CHASE),
  ];

  // After cycle 1 (each cutaway a little higher and wider on Chase; Margaret stays at eye level)
  CUTSCENES['1.2_wait1'] = [
    { music: 'reddy', fade: 1 },
    // [INSERT] The clock in the corner of the monitor: 09:14. Dissolve in the same frame: 09:31. The spinner hasn't moved.
    screen('loading'), MON({ mode: 'spin', time: '09:14' }),
    { wait: 1.3 },
    { do: dissolve },
    { wait: 1.2 },
    // [CLOSE · Chase]
    screen('app'), { shot: 'CLOSE', on: 'chase' },
    { expr: [['chase', 'worried']] },
    { say: 'chase', text: 'Sorry for the wait.' },
    MARGARET,
    { say: 'margaret', text: "That's all right." },
    // Pop-up storm. The name field now reads MARGARINE.
    { shot: 'JARVIS', at: 'monitor2', on: 'chase' },
    { do: (c) => storm(c, ['JARVIS has detected unusual activity. Continue?', 'Your session will expire soon. Extend session?',
      'Are you sure you want to continue?', 'Please acknowledge this message.', 'Unsaved changes may have been saved.'], [0.3, 0.3, 0.2, 0.2, 0.35]) },
    { popup: { msg: 'Did you mean: MARGARINE?', title: 'JARVIS Autocorrect', icon: 'info', buttons: ['YES', 'YES'], at: 'center', shake: true } },
    { flag: 'seen_popups' },
    { wait: 1.3 },
    { popup: null, clear: true },
    MON({ mode: 'form', time: '09:31', name: 'MARGARINE' }),
    { flag: 'seen_margarine' },
    { wait: 1.8 },
    // [MID · Chase, from slightly above]
    { shot: 'MID', on: 'chase', height: 0.45 },
    { say: 'chase', text: 'Sorry for the wait.' },
    MARGARET,
    { say: 'margaret', text: 'Did it just call me margarine?' },
    { shot: 'MID', on: 'chase', height: 0.45 },
    { say: 'chase', text: "It's a known issue." },
    { music: 'reddy_frantic', fade: 0.6 },
    into(OTS_CHASE),
  ];

  // After cycle 2
  CUTSCENES['1.2_wait2'] = [
    { music: 'reddy', fade: 1 },
    // [INSERT] "An MFA code has been sent to the customer's phone." Her phone lies dead on the counter, its black screen
    // reflecting both their faces.
    { shot: 'INSERT', at: [4.25, 1.0, -8.78], from: [4.2, 1.62, -8.62], fov: 34, card: ['deadphone', {}] },
    { popup: { msg: "An MFA code has been sent to the customer's phone.", icon: 'info', buttons: [], at: [0.22, 0.48], w: 300 } },
    { flag: 'seen_mfa' },
    { wait: 2.4 },
    { popup: null, clear: true },
    // [WIDE · high] Chase small behind the counter, dwarfed by the big "Yes" wall graphic.
    { shot: 'CAM', pos: [3.2, 2.85, -5.6], look: [4.15, 1.6, -12.0], fov: 50 },
    { expr: [['chase', 'worried']] },
    { say: 'chase', text: 'Sorry for the wait.' },
    // [CLOSE · Margaret, eye level]
    MARGARET,
    { say: 'margaret', text: "I've been coming here since it was a video shop, love. I can wait.", speed: 'slow' },
    // Crash. Restart. Blank form. The clock says 10:02.
    { sfx: 'crash' }, screen('crash'),
    MON({ mode: 'crash' }),
    { wait: 1.2 },
    { sfx: 'restart_chime' }, screen('app'),
    jmon({ mode: 'form', time: '10:02' }),
    { wait: 1.5 },
    // higher and wider again: Chase a small shape behind the counter from the far corner of the store
    { shot: 'CAM', pos: [10.3, 3.0, -1.5], look: [4.5, 1.3, -10.0], fov: 42 },
    { say: 'chase', text: '…Sorry for the wait.' },
    MARGARET,
    { say: 'margaret', text: "Chase, sweetheart. I've got a hip appointment on Thursday. I'd like to be walking to it." },
    // Cycle 3 is short and ends on the opt-in box.
    { music: 'reddy_frantic', fade: 0.6 },
    into(OTS_CHASE),
  ];

  CUTSCENES['1.2_end'] = [
    { music: null, fade: 1.2 },
    { place: 'chase', at: 'counter_chase' },
    // [ECU] The cursor over the opt-in box. YES. Click.
    MON({ mode: 'optin', time: '10:09', zoom: 2.2 }, 26),
    { wait: 0.6 },
    jmon({ mode: 'optin', time: '10:09', zoom: 2.2, click: true }), { sfx: 'tick' }, { flag: 'seen_optin' },
    { wait: 0.7 },
    // [JARVIS-CAM] Chase's face, lit by the screen. The screen goes black, and so does he.
    { shot: 'JARVIS', at: 'monitor2', on: 'chase' },
    { env: { hemi: [0xc0c8da, 0x34343c, 0.75], dir: [0xffe6c2, 0.55] }, dur: 0.3 },   // the room drops away: only the screen lights him
    { do: (c) => { const s = c.world.torch; if (s) s.intensity *= 1.8; } },
    { wait: 0.9 },
    screen('off'), { sfx: 'sad_beep' }, { do: lightsOut }, { env: { hemi: [0x8a93a8, 0x2a2a30, 0.45], dir: [0xffe6c2, 0.2] }, dur: 0.3 },
    { expr: [['chase', 'stunned']] },
    { wait: 0.8 },
    { say: 'chase', text: 'Sorry for the w—' },
    // MARGARET (gathering her handbag, kindly)
    { env: 'day' }, MARGARET,
    { act: [['margaret', 'give', { dur: 1.2 }]] },   // she reaches for her phone and bag; the phone leaves the counter
    { do: (c) => { c.wait(0.6).then(() => { const o = c.world.prop('margaret_phone'); if (o) o.visible = false; }); } },
    { say: 'margaret', text: "I'll come back when your computer's feeling better.", speed: 'slow' },
    // [WIDE · locked, from the back of the store] She pats his hand and walks out into the sunlight. The doors slide shut.
    { place: 'chase', at: [4.3, 0, -9.8, 0] }, { place: 'margaret', at: [4.3, 0, -8.2, PI] },
    { expr: [['chase', 'sad']] },
    EXIT_WIDE,
    { act: [['margaret', 'give', { dur: 1.3 }]] },
    { wait: 0.8 },
    { move: 'margaret', to: [1.6, 0, -4.2], speed: 1.6 },           // past the display table to the doors (they open for her)
    { move: 'margaret', to: [-1.6, 0, -2.2], speed: 1.6 },
    { sfx: 'door_slide', vol: 0.5 },
    { move: 'margaret', to: [-2.0, 0, 14.0, 0], speed: 1.6, nowait: true },   // out into the sun, still walking as we cut
    { wait: 2.0 },
    // [TOP-DOWN · directly above Chase] His head goes into his hands. On the dead monitor beside him, one last pop-up:
    // "Thanks for your patience!" (the doors slide shut over the cut)
    { place: 'chase', at: SLUMP },
    TOP_DOWN,
    { despawn: 'margaret' }, { sfx: 'door_slide', vol: 0.45 },
    { act: [['chase', 'head_hands']] },
    { wait: 1.6 },
    { do: patience },
    { wait: 2.6 },
    { fade: 'out', dur: 0.8 },
  ];

  // =================================================================== 1.3 — "Language Detected"
  SCENES['1.3'] = {
    title: 'Language Detected', set: 'reddy', env: 'day', time: 'Tue 29 Sep 2026, 10:40',
    playable: ['luka'], swap: false, hud: null, music: 'reddy',
    spawn: { luka: 'counter_luka', chase: [4.2, 0, -12.0, 0.6], dazza: [-2.0, 0, 4.4, PI] },
    steps: [
      ['cutscene', '1.3_open'],
      ['control', 'luka'],
      ['objective', 'SIM swap for Dazza.'],
      ['do', (c) => { const a = c.world.actor('chase'); if (a) a.moveTo([5.75, 0, -10.4, 0.35]); }],   // Chase comes to watch
      ['minigame', 'restart_ritual', { time: '10:41' }],
      // It works. The SIM swap form loads. JARVIS asks for ID verification, then for verification of the ID
      // verification. The cursor becomes a spinning wheel.
      ['minigame', 'jarvis_sale', { cycle: 1, cap: 40, mode: 'dazza', time: '10:43', shot: OTS_LUKA }],
      ['objective', null],
      ['cutscene', '1.3_censor'],
    ],
    grants: { flags: { seen_sure: true, seen_password: true, seen_popups: true, seen_restarts: true, seen_e4044: true, seen_swearing: true } },
  };

  CUTSCENES['1.3_open'] = [
    // [LOW · floor level at the door, TILT UP] Steel-capped boots, hi-vis, then Dazza.
    { shot: 'CAM', pos: [-2.1, 0.16, -4.0], look: [-2.0, 0.25, -1.0], fov: 45 },
    { sfx: 'door_slide', vol: 0.6 },
    { move: 'dazza', to: [-2.0, 0, -1.8, PI] },
    { shot: 'CAM', pos: [-2.1, 0.16, -4.0], look: [-2.0, 0.25, -1.0], fov: 45, to: { look: [-2.0, 1.72, -1.8] }, dur: 2.2 },
    { wait: 2.3 },
    { say: 'dazza', text: "Mate, I need a SIM swap. I've got a slab to pour at ten." },
    { place: 'dazza', at: 'counter_customer' },   // (under the cut) he's at the counter by the time we're on Luka
    { shot: 'CLOSE', on: 'luka' },
    { say: 'luka', text: "It's ten-forty." },
    { shot: 'MID', on: 'dazza' },
    { say: 'dazza', text: "Then I'm late for a slab, aren't I." },
    // [MID · Luka cracks his knuckles, Chase small over his shoulder]
    { shot: 'CAM', pos: [7.35, 1.7, -8.2], look: [6.1, 1.45, -11.0], fov: 40 },
    { act: [['luka', 'clap', { dur: 0.7, loop: false }]] },
    { wait: 0.3 }, { sfx: 'tick', vol: 0.7 }, { wait: 0.15 }, { sfx: 'tick', vol: 0.7 },
    { wait: 0.4 },
    { say: 'luka', text: 'Two minutes.' },
    { act: [['luka', 'glance', { dur: 2.4, yaw: -0.85 }]] },   // (to Chase) over his shoulder: his face stays to the lens
    { say: 'luka', text: 'Watch and learn. Alt-tab, clear cache, log out, log in, pray.' },
    // the Restart Ritual, over Luka's shoulder
    { music: 'reddy_frantic', fade: 0.6 },
    into(OTS_LUKA),
  ];

  CUTSCENES['1.3_censor'] = [
    { place: 'luka', at: [6.8, 0, -10.0, -0.12] }, { place: 'chase', at: [5.85, 0, -10.0, 0.2] },
    { expr: [['luka', 'worried'], ['chase', 'worried']] },
    // [JARVIS-CAM] Both faces behind the error.
    { shot: 'JARVIS', at: 'monitor', on: ['luka', 'chase'] },
    { popup: { msg: 'Error 4044', icon: 'error', buttons: [], at: [0.5, 0.42], shake: true } },
    { flag: 'seen_e4044' },
    { say: 'luka', text: "Error 4044. That's the one where it forgets who you are, then forgets who it is." },
    { popup: null, clear: true },
    { shot: 'MID', on: 'dazza' },
    { say: 'dazza', text: 'Can I just go to the servo? They sell SIMs at the servo.' },
    { shot: 'CLOSE', on: 'luka' },
    { say: 'luka', text: "Please don't go to the servo." },
    // Crash. Blue screen.
    { music: null, fade: 0.3 },
    { sfx: 'crash' }, screen('blue'),
    { shot: 'INSERT', at: 'monitor_screen', card: ['screen', { style: 'crash', lines: [':(', 'JARVIS ran into a problem.', 'Error 4044'] }] },
    { wait: 1.5 },
    { shot: 'MID', on: 'dazza' },
    { say: 'dazza', text: "I'm going to the servo." },
    // [WIDE · locked] Dazza leaves. The doors close. Nobody moves.
    EXIT_WIDE,
    { move: 'dazza', to: [-1.6, 0, -2.2], speed: 2.2 },
    { sfx: 'door_slide', vol: 0.5 },
    { move: 'dazza', to: [-2.2, 0, 16.0, 0], speed: 2.2, nowait: true },   // off across the car park
    { wait: 2.1 },
    { sfx: 'door_slide', vol: 0.6 },   // the doors close behind him
    { wait: 1.5 },
    // [JARVIS-CAM · locked] The boys framed through the monitor. Each insult is cut off by a pop-up that lands on the
    // speaker's face, in rhythm, like a drum pattern.
    { shot: 'JARVIS', at: 'monitor', on: ['luka', 'chase'], locked: true },
    { despawn: 'dazza' },
    { expr: [['luka', 'determined'], ['chase', 'determined']] },
    ...cuss('luka', 'You absolute useless piece of—'),
    { say: 'chase', text: 'It can detect SWEARING?', auto: 0.7 },
    ...cuss('luka', "It can't detect a driver's licence, but it can detect—", 'Language detected.'),
    ...cuss('chase', 'You overpriced, over-updated—'),
    ...cuss('luka', '—twenty-four-password—'),
    ...cuss('chase', '—margarine-generating—'),
    // The pop-ups stack until the frame is solid white.
    { do: (c) => storm(c, ['Language detected.'], [0.25, 0.25, 0.125, 0.125, 0.25, 0.125, 0.125, 0.125, 0.125, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625, 0.0625], true) },
    { fade: 'out', dur: 0.2, color: '#fff' },
    { popup: null, clear: true },
    // (behind the white: the monitor full of white; the boys on the floor either side of it)
    { do: whiteScreen },
    { place: 'luka', at: [5.75, 0, -9.85, PI - 0.1] }, { place: 'chase', at: [7.05, 0, -9.85, PI + 0.1] },
    { act: [['luka', 'sit', { h: 0.18 }], ['chase', 'sit', { h: 0.18 }]] },
    { expr: [['luka', 'sad'], ['chase', 'sad']] },
    { shot: 'CAM', pos: [6.35, 1.28, -9.3], look: [6.35, 1.28, -9.0], fov: 44 },
    { fade: 'in', dur: 0.35 },
    // One last one: "Thanks for your feedback! Rate your experience: ★☆☆☆☆"
    { popup: { msg: 'Thanks for your feedback! Rate your experience: ★☆☆☆☆', icon: 'info', buttons: [], at: 'center', dur: 2.6 } },
    { wait: 1.4 },
    // [PULL OUT · slowly from the white screen] To reveal them both, slumped, one either side of the monitor.
    { shot: 'CAM', pos: [6.35, 1.28, -9.3], look: [6.35, 1.28, -9.0], fov: 44, to: { pos: [6.4, 1.85, -12.5], look: [6.4, 0.95, -9.4], fov: 46 }, dur: 6, ease: 'out' },
    { wait: 2.1 },
    { say: 'chase', text: "…That ding's a good sample, though.", speed: 'slow' },
    { say: 'luka', text: "Don't." },
    // [CLOSE · Luka, from slightly above] He twists his lanyard.
    { shot: 'CAM', pos: [6.1, 1.32, -11.05], look: [5.75, 0.74, -9.85], fov: 40 },
    mood('luka', 'anxious'),
    { act: [['luka', 'lanyard']] },
    { wait: 1.2 },
    { say: 'luka', text: '…Should we call the manager?' },
    { wait: 1.2 },
    { fade: 'out', dur: 0.8 },
  ];
})();
