// ============================================================ CONTENT: 3.1 "The Pitch", 3.2 "Storage Full"
// SPEC §12. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
// Mini-games: rue_walk {walk: 3} (68-mg-keepup-ruewalk.js), pitch_cards (64-mg-cards-sequencer.js). 3.2's choice is built here.
(() => {
  const PI = Math.PI, H = PI / 2;
  const say = (id, text, o) => Object.assign({ say: id, text }, o);
  const slow = (id, text, o) => say(id, text, Object.assign({ speed: 'slow' }, o));
  const actor = (c, id) => c.world.actor(id);
  const face = (id, fn) => ({ do: (c) => { const a = actor(c, id); if (a) fn(a.rig.face, a); } });
  // seated people: the sit pose at a seat height, then (optionally) an upper-body anim on top
  function seatIn(c, id, h = 0.45, anim) {
    const a = actor(c, id);
    if (!a) return;
    a.play('sit', { h }); a.rig.seated = true;
    if (anim) a.play(anim, { h });
  }
  const seat = (id, h, anim) => ({ do: (c) => seatIn(c, id, h, anim) });
  function stand(c, ...ids) { for (const id of ids) { const a = actor(c, id); if (a) { a.rig.seated = false; a.play('idle'); } } }
  const hideBook = (id) => ({ do: (c) => c.wait(0.05).then(() => { const a = actor(c, id), b = a && a.rig.attach.textbook; if (b) b.visible = false; }) });
  // the rig's spot as a practical light (a lamp); off gives the torch back to the player
  function lamp(c, on, pos, tgt, color = 0xffd6a0, power = 4, angle = 0.7) {
    const s = c.world.torch;
    if (!s) return;
    c.world.torchAuto = !on;
    s.intensity = on ? power : 0;
    if (!on) return;
    s.color.set(color); s.angle = angle; s.distance = 30; s.penumbra = 0.6;
    s.position.set(pos[0], pos[1], pos[2]); s.target.position.set(tgt[0], tgt[1], tgt[2]); s.target.updateMatrixWorld();
  }

  // ---------------------------------------------------------- anims this act needs (registered once)
  // the finalist's bow: a slow fold at the waist and back up
  if (!ANIMS.bow) ANIMS.bow = (r, t, p) => {
    ANIMS.idle(r, t, p);
    const k = Math.sin(Math.min(1, t / (p.dur || 1.8)) * PI);
    r.parts.torso.rotation.x += 0.62 * k; r.parts.head.rotation.x += 0.18 * k;
  };
  // hands held together at the chest (Bernie's folded arms, Des's cap in his hands)
  if (!ANIMS.fold) {
    ANIMS.fold = (r, t, p) => {
      ANIMS.clap(r, 0, p);
      const P = r.parts; P.handL.rotation.x = 0.1; P.handR.rotation.x = 0.1;
      P.torso.rotation.x += 0.015 * Math.sin(t * 1.6);
    };
    ANIMS.fold.upper = true;
  }
  // Chase's hands rise toward his head, stop halfway, and go back down (the 1.2 top-down, un-done)
  if (!ANIMS.hands_halt) {
    const N = ['hips', 'torso', 'neck', 'head', 'armL', 'foreL', 'handL', 'armR', 'foreR', 'handR'], Q = N.map(() => new THREE.Quaternion()), q = new THREE.Quaternion();
    ANIMS.hands_halt = (r, t, p) => {   // each joint slerps from idle toward head-in-hands, three-quarters of the way, and back
      const P = r.parts, u = t / (p.dur || 2.8), K = 0.75;
      const k = u < 0.4 ? K * Math.sin((u / 0.4) * H) : u < 0.62 ? K : u < 0.95 ? K * (1 - Math.sin(((u - 0.62) / 0.33) * H)) : 0;
      ANIMS.head_hands(r, t, p);
      for (let i = 0; i < N.length; i++) { const o = P[N[i]].rotation; Q[i].setFromEuler(o); o.set(0, 0, 0); }
      ANIMS.idle(r, t, p);
      for (let i = 0; i < N.length; i++) { const o = P[N[i]].rotation; q.setFromEuler(o).slerp(Q[i], k); o.setFromQuaternion(q, o.order); }
    };
  }

  // ---------------------------------------------------------- cards
  const SANS = '"Trebuchet MS", "Segoe UI", Arial, sans-serif';
  function wrap(cx, text, x, y, maxW, lh) {
    let line = '';
    for (const w of text.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (cx.measureText(t).width > maxW && line) { cx.fillText(line, x, y); y += lh; line = w; } else line = t;
    }
    if (line) cx.fillText(line, x, y);
    return y;
  }
  // The other finalist's placard on its easel: "Yacht Phone: a car phone, but for yachts".
  CARDS.placard = (cx, w, h, d) => {
    const s = String(d.text || ''), i = s.indexOf(':'), head = i < 0 ? s : s.slice(0, i + 1), sub = i < 0 ? '' : s.slice(i + 1).trim();
    cx.save(); cx.translate(w / 2, h / 2); cx.rotate(0.012);
    cx.shadowColor = 'rgba(0,0,0,.4)'; cx.shadowBlur = 26; cx.shadowOffsetY = 10;
    cx.fillStyle = '#fbfaf5'; cx.fillRect(-w * 0.44, -h * 0.42, w * 0.88, h * 0.84); cx.shadowColor = 'transparent';
    cx.strokeStyle = '#0a3a8a'; cx.lineWidth = 6; cx.strokeRect(-w * 0.41, -h * 0.37, w * 0.82, h * 0.74);
    // a little yacht on a blue stripe, with a curly-corded phone on deck
    cx.fillStyle = '#3a78c8'; cx.fillRect(-w * 0.41, h * 0.02, w * 0.82, h * 0.05);
    cx.fillStyle = '#fff'; cx.strokeStyle = '#1a1a1a'; cx.lineWidth = 3;
    cx.beginPath(); cx.moveTo(-w * 0.12, 0); cx.lineTo(w * 0.12, 0); cx.lineTo(w * 0.09, h * 0.035); cx.lineTo(-w * 0.09, h * 0.035); cx.closePath(); cx.fill(); cx.stroke();
    cx.beginPath(); cx.moveTo(0, -h * 0.01); cx.lineTo(0, -h * 0.2); cx.lineTo(w * 0.1, -h * 0.02); cx.closePath(); cx.fill(); cx.stroke();
    cx.fillStyle = '#1a1a1a'; cx.fillRect(w * 0.035, -h * 0.03, w * 0.03, h * 0.02);
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = '#0a3a8a'; cx.font = `bold ${Math.round(h * 0.13)}px ${SANS}`; cx.fillText(head, 0, h * 0.16, w * 0.76);
    cx.fillStyle = '#222'; cx.font = `italic ${Math.round(h * 0.075)}px Georgia, "Times New Roman", serif`; cx.fillText(sub, 0, h * 0.28, w * 0.76);
    cx.restore();
  };
  CARDS.placard.size = [800, 540];
  // Looking through Des's Polaroid camera: a square finder with bright corners (transparent: the shot shows through).
  CARDS.viewfinder = (cx, w, h) => {
    const m = w * 0.08, L = w * 0.16;
    cx.strokeStyle = 'rgba(255,255,255,.9)'; cx.lineWidth = 7; cx.lineCap = 'square';
    for (const [x, y, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
      cx.beginPath(); cx.moveTo(x, y + sy * L); cx.lineTo(x, y); cx.lineTo(x + sx * L, y); cx.stroke();
    }
    cx.lineWidth = 3; cx.beginPath(); cx.moveTo(w / 2 - 22, h / 2); cx.lineTo(w / 2 + 22, h / 2); cx.moveTo(w / 2, h / 2 - 22); cx.lineTo(w / 2, h / 2 + 22); cx.stroke();
    cx.fillStyle = '#ffb030'; cx.beginPath(); cx.arc(w - m - 16, h - m - 16, 9, 0, 7); cx.fill();   // the flash is ready
  };
  CARDS.viewfinder.size = [640, 640];
  // Chase's thumb presses NO on the machine's screen (YES greyed out).
  const STORAGE = 'STORAGE FULL. To complete this call, the following will be cleared: 21 days, 0 hours, 0 minutes. Continue? [YES] [NO]';
  const MSG = STORAGE.slice(0, STORAGE.indexOf(' ['));
  CARDS.storage_no = (cx, w, h) => {
    const rr = (x, y, ww, hh, r) => { cx.beginPath(); cx.roundRect(x, y, ww, hh, r); };
    cx.save();
    cx.shadowColor = 'rgba(0,0,0,.5)'; cx.shadowBlur = 30; cx.shadowOffsetY = 12;
    cx.fillStyle = '#15171a'; rr(w * 0.04, h * 0.06, w * 0.92, h * 0.88, 48); cx.fill(); cx.shadowColor = 'transparent';
    const g = cx.createLinearGradient(0, h * 0.12, 0, h * 0.88); g.addColorStop(0, '#16396a'); g.addColorStop(1, '#0b1f3c');
    cx.fillStyle = g; rr(w * 0.09, h * 0.12, w * 0.82, h * 0.76, 16); cx.fill();
    const px = w * 0.15, py = h * 0.17, pw = w * 0.7, ph = h * 0.64, bar = ph * 0.12;
    cx.fillStyle = '#ffffff'; rr(px, py, pw, ph, 8); cx.fill();
    cx.fillStyle = '#dde0e5'; rr(px, py, pw, bar, [8, 8, 0, 0]); cx.fill();
    cx.textBaseline = 'middle'; cx.textAlign = 'left';
    cx.fillStyle = '#2f6fd6'; cx.font = `italic bold ${Math.round(bar * 0.5)}px ${SANS}`; cx.fillText('JARVIS', px + 16, py + bar / 2);
    cx.fillStyle = '#4a505c'; cx.font = `${Math.round(bar * 0.45)}px ${SANS}`; cx.fillText('STORAGE FULL', px + pw * 0.28, py + bar / 2);
    cx.fillStyle = '#f2b51c'; cx.beginPath(); cx.moveTo(px + 44, py + bar + 22); cx.lineTo(px + 72, py + bar + 70); cx.lineTo(px + 16, py + bar + 70); cx.closePath(); cx.fill();
    cx.fillStyle = '#2b2f36'; cx.font = `bold 30px ${SANS}`; cx.textAlign = 'center'; cx.fillText('!', px + 44, py + bar + 54);
    cx.textAlign = 'left'; cx.textBaseline = 'top'; cx.fillStyle = '#20242b'; cx.font = `${Math.round(h * 0.043)}px ${SANS}`;
    wrap(cx, MSG, px + 92, py + bar + 20, pw - 116, h * 0.056);
    const by = py + ph - ph * 0.2, bh = ph * 0.13, bw = pw * 0.22;
    cx.fillStyle = '#f4f5f7'; cx.fillRect(px, by - 12, pw, ph * 0.2 + 12 - 8);
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.font = `bold ${Math.round(bh * 0.46)}px ${SANS}`;
    cx.fillStyle = '#b4b8bf'; rr(px + pw - bw * 2 - 36, by, bw, bh, 5); cx.fill(); cx.fillStyle = '#e6e8eb'; cx.fillText('YES', px + pw - bw * 1.5 - 36, by + bh / 2);
    cx.fillStyle = '#1d4fa8'; rr(px + pw - bw - 18, by + 3, bw, bh, 5); cx.fill(); cx.fillStyle = '#fff'; cx.fillText('NO', px + pw - bw / 2 - 18, by + bh / 2 + 3);
    // the thumb, from the bottom right, its tip on NO
    const tx = px + pw - 22, ty = by + bh * 1.02;
    cx.translate(tx, ty); cx.rotate(-0.62);
    cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 18; cx.shadowOffsetY = 6;
    cx.fillStyle = '#e4b08c'; cx.beginPath(); cx.ellipse(0, h * 0.2, w * 0.06, h * 0.23, 0, 0, PI * 2); cx.fill(); cx.shadowColor = 'transparent';
    cx.fillStyle = '#f3d2bd'; cx.beginPath(); cx.ellipse(0, h * 0.06, w * 0.036, h * 0.06, 0, 0, PI * 2); cx.fill();
    cx.strokeStyle = 'rgba(140,90,60,.5)'; cx.lineWidth = 3; cx.beginPath(); cx.arc(0, h * 0.24, w * 0.035, 0.3, PI - 0.3); cx.stroke();
    cx.restore();
  };
  CARDS.storage_no.size = [800, 600];

  // =================================================================== 3.1 — "The Pitch"
  const SIDE = { shot: 'CAM', pos: [3.05, 1.45, 10.2], look: [3.05, 1.15, 14.2], fov: 50 };   // 2.6's WIDE · locked, side-on (75-content-2b.js SIDE)
  const TIMELAPSE = { shot: 'CAM', pos: [7.4, 2.9, 8.0], look: [-0.2, 0.9, 12.8], fov: 58 };   // 2.6's time-lapse lens
  const HALL_WIDE = { shot: 'CAM', pos: [0, 3.1, 12.3], look: [0, 2.4, -9], fov: 50 };         // examhall anchors.hall_wide
  const FILOFAX = '20/10/2026 — 11:58 — ANSWER. SAY YES.';
  const YACHT = 'Yacht Phone: a car phone, but for yachts';
  const WHO = { Des: 'des', Bernie: 'bernie', Declan: 'declan', 'Siobhán': 'siobhan', Ronan: 'ronan', Fiachra: 'fiachra', Mick: 'mick', Nuala: 'nuala', Hartigan: 'hartigan' };
  const SEAT = { bernie: 'aud_bernie', declan: 'aud_declan', siobhan: 'aud_1', nuala: 'aud_2', fiachra: 'aud_3', ronan: 'aud_4', mick: 'aud_5' };
  const LINE = {
    Des: 'Des has worked the Front Gate for thirty-one years.',
    Bernie: 'Bernie has kept half this college alive on toast.',
    Declan: 'Declan, in the basement, wants to build machines that give shop workers their time back.',
    'Siobhán': 'Siobhán learned this whole module in an afternoon, from a man who sells phones.',
    Ronan: "Ronan has slept through every lecture this term, and he still turns up. That's loyalty.",
    Fiachra: 'Fiachra played the same three notes at the gate for a year. This week he plays four.',
    Mick: 'Mick has been losing a war with the pigeons for twenty years. This week he won a battle.',
    Nuala: 'Nuala looks after a library older than all of us, and nobody knows her name.',
    Hartigan: 'And Professor Hartigan, who has never once been late.',
  };
  function blinks(c, id, n = 3) {   // Declan, blinking, as if he's never been said out loud before
    const a = actor(c, id);
    if (!a || c.flow.skipping) return;
    const f = a.rig.face;
    let p = Promise.resolve();
    for (let i = 0; i < n; i++) p = p.then(() => { f.eyes('closed'); return c.wait(0.1); }).then(() => { f.eyes('wide'); return c.wait(0.45); });
    return p;
  }
  // how each listener takes it (the INSERT holds on them)
  const REACT = {
    Des: [face('des', (f) => { f.brows('worried'); f.mouth('smile'); })],
    Bernie: [face('bernie', (f) => { f.eyes('half'); f.brows('neutral'); f.mouth('smirk'); })],
    Declan: [{ expr: [['declan', 'stunned']] }, { do: (c) => { blinks(c, 'declan'); } }],
    'Siobhán': [{ expr: [['siobhan', 'laugh']] }, { act: [['siobhan', 'nod', { dur: 1 }]] }],
    Ronan: [{ expr: [['ronan', 'sleep']] }],
    Fiachra: [{ expr: [['fiachra', 'laugh']] }],
    Mick: [{ expr: [['mick', 'determined']] }, { act: [['mick', 'nod', { dur: 1 }]] }],
    Nuala: [face('nuala', (f) => { f.brows('worried'); f.mouth('smile'); })],
    Hartigan: [{ expr: [['hartigan', 'neutral']] }],
  };
  const INS = (n) => ({ shot: 'INSERT', at: n === 'Des' ? 'doorway_back' : n === 'Hartigan' ? 'judge' : SEAT[WHO[n]] });
  const order = () => {
    const o = state.flags.pitchOrder;
    if (Array.isArray(o) && o.length) return o.filter((n) => LINE[n]);
    return NAMES.filter((n) => n === 'Des' || n === 'Bernie' || n === 'Declan' || state.names.includes(n));
  };

  // the Exam Hall: Hartigan in the judge's chair beside Fenwick's empty one, the finalist, everyone in Rue's pitch
  function hallDress(c) {
    const W = c.world, list = order();
    for (const nm of list) {
      const id = WHO[nm];
      if (id === 'des' || id === 'hartigan' || !SEAT[id]) continue;
      W.spawn(id, SEAT[id]); seatIn(c, id, 0.45, id === 'bernie' ? 'fold' : id === 'ronan' ? 'look_down' : null);
      if (id === 'ronan') actor(c, id).setExpr('sleep');
    }
    W.spawn('des', 'doorway_back');   // in the doorway at the back of the hall, cap in his hands
    const d = actor(c, 'des'); if (d.rig.attach.cap) d.hold(d.rig.attach.cap, 'R');
    d.play('fold');
    seatIn(c, 'hartigan', 0.46); seatIn(c, 'chase', 0.45);
    const r = actor(c, 'rue19'); r.setExpr('worried');
    rueNotes(c, true);
  }
  function rueNotes(c, inHand) {   // Rue's notes: in his hand, or back on the lectern
    const a = actor(c, 'rue19'), n = c.world.prop('notes');
    if (!a || !n) return;
    if (inHand) a.hold(n, 'R'); else if (a.held === n) a.hold(null);
  }
  // [CLOSE] he puts them down: held up over the lectern, then laid on it
  const NOTES = { t: 0, f: null };
  function putDown(c) {
    const n = c.world.prop('notes'), a = actor(c, 'rue19');
    if (!n || !a) return;
    if (a.held === n) a.hold(null);
    if (NOTES.f) removeUpdate(NOTES.f);
    const end = () => { n.position.set(0, 1.525, -10.05); n.rotation.set(-0.3, 0, 0); };
    if (c.flow.skipping) { end(); return; }
    NOTES.t = 0;
    NOTES.f = (dt) => {
      NOTES.t = Math.min(1, NOTES.t + dt / 0.7);
      const k = NOTES.t * NOTES.t * (3 - 2 * NOTES.t);
      n.position.set(0, 1.74 - 0.215 * k, -10.24 + 0.19 * k); n.rotation.set(-1.25 + 0.95 * k, 0, 0);
      if (NOTES.t >= 1 || flow.sceneId !== '3.1') { end(); removeUpdate(NOTES.f); NOTES.f = null; }
    };
    addUpdate(NOTES.f);
  }
  function speech() {   // one line per card, in the player's order, each cut to its listener part-way through
    const S = [], rue = [{ shot: 'MID', on: 'rue19' }, { shot: 'CLOSE', on: 'rue19', dist: 1.2 }];
    order().forEach((n, i) => {
      if (i) S.push(rue[i % 2]);   // (the first line lands on the push-in's end frame)
      S.push({ par: [say('rue19', LINE[n]), { do: (c) => c.runSteps([{ wait: 1.1 }, INS(n), ...REACT[n]]) }] });
      S.push({ wait: 0.9 });
      if (n === 'Hartigan') S.push(say('hartigan', 'Flattery, Mr Rue.'));
    });
    return S;
  }
  // the Polaroid developing in Rue's hand: it never quite resolves
  const DEV = { on: false, t: 0, k: 0, d: { front: true, dev: 0 } };
  function develop(c) {
    DEV.on = true; DEV.t = 0; DEV.k = 0; DEV.d.dev = 0;
    if (c.flow.skipping) { DEV.on = false; return; }
    const f = (dt) => {
      if (!DEV.on || flow.sceneId !== '3.1') { DEV.on = false; removeUpdate(f); return; }
      DEV.t += dt;
      if (DEV.t - DEV.k < 0.25) return;
      DEV.k = DEV.t; DEV.d.dev = Math.min(0.3, DEV.t / 18);   // shapes stir; the front is 3.7's
      ui.card('polaroid', DEV.d);
      if (DEV.t > 5.6) { DEV.on = false; removeUpdate(f); }
    };
    addUpdate(f);
  }

  SCENES['3.1'] = {
    title: 'The Pitch', set: 'square', env: 'rain', time: 'Tue 20 Oct 1987',
    playable: ['rue19', 'luka'], swap: false, hud: { battery: 0, bars: 3 }, music: 'dublin_major',
    spawn: { rue19: [-11.5, 0, 1.1, H] },
    steps: [
      ['do', (c) => { c.world.preload('lab'); for (const n of ['bike', 'bike_chain']) { const o = c.world.prop(n); if (o) o.visible = false; } }],   // (the bike is the lab's now)
      ['minigame', 'rue_walk', { walk: 3 }],
      ['cutscene', '3.1_lab'],
      ['cutscene', '3.1_hall'],
      ['minigame', 'pitch_cards', {}],
      ['cutscene', '3.1_pitch'],
      ['cutscene', '3.1_polaroid'],
    ],
    grants: { flags: { pitched: true }, battery: 4, bars: 3 },
  };

  CUTSCENES['3.1_lab'] = [
    { fade: 'out', dur: 0.6 },
    { set: 'lab', env: 'day', spawn: { rue19: 'bike_rig', luka: 'bike_side', chase: [1.75, 0, 13.3, 2.2] } },
    { do: (c) => c.world.preload('examhall') },
    { hud: { battery: 0, bars: 3 } },
    { act: [['rue19', 'pedal', { speed: 0.45 }], ['luka', 'idle']] }, { expr: [['rue19', 'worried']] },
    { face: 'luka', to: 'rue19' }, { face: 'chase', to: 'rue19' },
    // [WIDE · side-on, the frame from 2.6] The lab. HUD: 0%. Rue on the bike.
    SIDE,
    { fade: 'in', dur: 0.6 },
    { wait: 1.0 },
    slow('rue19', 'How. Do you. Do this.'),
    say('luka', 'Second-in-Cycling.'),
    say('rue19', "That's not what 2IC means."),
    say('luka', "That's what I said."),
    // Chase explains the plan: on 20 October 2026 at 11:58 the machine will call Rue's brick phone; Rue answers and accepts.
    { place: 'rue19', at: [2.05, 0, 12.3, -1.28] }, { expr: [['rue19', 'neutral']] }, { act: [['rue19', 'idle']] },
    { place: 'luka', at: 'bike_rig' }, { act: [['luka', 'pedal', { speed: 0.4 }]] },
    { place: 'chase', at: [0.85, 0, 12.6, 1.86] },
    { shot: 'CAM', pos: [1.45, 1.6, 10.55], look: [1.45, 1.45, 12.45], fov: 48 },   // TWO-SHOT, Luka pedalling behind them
    { do: (c) => c.world.talk('chase', true) },
    { act: [['chase', 'point']] },
    { wait: 1.3 },
    { act: [['chase', 'shrug']] },
    { wait: 0.8 },
    { act: [['rue19', 'phone']] },   // answer it
    { wait: 1.3 },
    { act: [['rue19', 'idle'], ['chase', 'give', { dur: 1.2 }]] },   // and accept
    { wait: 1.0 },
    { do: (c) => c.world.talk('chase', false) },
    { act: [['rue19', 'nod']] },
    { wait: 0.8 },
    // [INSERT · top-down] Rue's pen in his Filofax.
    { place: 'rue19', at: [1.8, 0, 10.72, PI] }, { act: [['rue19', 'write']] },
    { place: 'chase', at: [1.2, 0, 11.6, 2.54] },
    { shot: 'INSERT', at: [1.8, 0.77, 10.25], from: [1.8, 1.5, 10.3], fov: 42, card: ['filofax', { text: FILOFAX }] },
    { wait: 1.8 },
    say('rue19', 'How do I keep one phone number alive for thirty-nine years?'),
    say('chase', "Honestly? You'll figure it out."),
    // [TIME-LAPSE · the lab] Three days. Rue and Luka take turns on the bike. HUD: 0% → 4%.
    { fade: 'out', dur: 0.5 },
    { place: 'rue19', at: 'bike_rig' }, { act: [['rue19', 'pedal', { speed: 0.9 }]] },
    { place: 'luka', at: [1.8, 0, 12.9, -2.6] }, { act: [['luka', 'idle']] },
    { place: 'chase', at: 'chase_computer' }, seat('chase', 0.46, 'type'),
    TIMELAPSE,
    { fade: 'in', dur: 0.5 },
    { timelapse: { dur: 12, cycles: 3, from: 'day', to: 'night', keys: [
      { t: 1.8, steps: [{ hud: { battery: 1, bars: 3 } }] },
      { t: 3.6, steps: [{ place: 'luka', at: 'bike_rig' }, { act: [['luka', 'pedal', { speed: 0.9 }]] }, { place: 'rue19', at: 'floor_sleep' }, { act: [['rue19', 'lie']] }] },
      { t: 5.4, steps: [{ hud: { battery: 2, bars: 3 } }] },
      { t: 7.0, steps: [{ place: 'rue19', at: 'bike_rig' }, { act: [['rue19', 'pedal', { speed: 0.9 }]] }, { place: 'luka', at: [1.8, 0, 10.72, PI] }, { act: [['luka', 'idle']] }] },
      { t: 8.6, steps: [{ hud: { battery: 3, bars: 3 } }] },
      { t: 9.8, steps: [{ place: 'luka', at: 'bike_rig' }, { act: [['luka', 'pedal', { speed: 0.9 }]] }, { place: 'rue19', at: [1.8, 0, 12.9, -2.6] }, { act: [['rue19', 'idle']] }] },
      { t: 11.4, steps: [{ hud: { battery: 4, bars: 3 } }] },
    ] } },
    { hud: { battery: 4, bars: 3 } },
    { wait: 0.6 },
  ];

  CUTSCENES['3.1_hall'] = [
    { fade: 'out', dur: 0.8 },
    { music: null, fade: 1.5 },
    { do: (c) => { stand(c, 'chase'); } },
    { set: 'examhall', env: 'day', spawn: { hartigan: 'judge', finalist: 'finalist_stand', chase: 'aud_chase', rue19: 'offstage_rue', luka: 'offstage_luka' } },
    { do: hallDress },
    // [WIDE · symmetrical, the Exam Hall] Portraits, chandeliers, a huge room. The other finalist has just pitched.
    HALL_WIDE,
    { fade: 'in', dur: 0.8 },
    { act: [['finalist', 'bow', { dur: 1.8, loop: false }]] },
    { sfx: 'applause', vol: 0.35 },
    { act: [['chase', 'clap', { h: 0.45 }], ['declan', 'clap', { h: 0.45 }]] },
    { wait: 2.4 },
    { act: [['chase', 'idle'], ['declan', 'idle']] },
    // "Yacht Phone: a car phone, but for yachts"
    { shot: 'INSERT', at: 'yacht_board', card: ['placard', { text: YACHT }] },
    { wait: 2.4 },
    // Fenwick's chair is empty; Professor Hartigan judges instead.
    { shot: 'INSERT', at: 'judges' },
    { wait: 1.8 },
    { place: 'finalist', at: 'finalist' }, seat('finalist', 0.46),
    // Offstage, Rue and Luka have one minute before he's called.
    { face: 'luka', to: 'rue19' }, { face: 'rue19', to: 'offstage_table' },
    { shot: 'SET', cam: 'anteroom' },
    { wait: 1.4 },
  ];

  CUTSCENES['3.1_pitch'] = [
    { expr: [['rue19', 'neutral']] },
    { shot: 'INSERT', at: 'judge' },
    say('hartigan', 'Mr Rue. Your pitch.'),
    { place: 'rue19', at: 'lectern' }, { place: 'luka', at: 'side_door' },
    { do: (c) => { rueNotes(c, false); const n = c.world.prop('notes'); if (n) { n.position.set(0, 1.74, -10.24); n.rotation.set(-1.25, 0, 0); } } },
    { act: [['rue19', 'reading']] }, hideBook('rue19'),
    // [CLOSE · Rue's notes on the lectern] He puts them down.
    { shot: 'INSERT', at: 'lectern_notes' },
    { wait: 0.9 },
    { act: [['rue19', 'type']] }, { do: putDown },
    { wait: 1.4 },
    { act: [['rue19', 'idle']] }, { expr: [['rue19', 'neutral']] },
    // [PUSH IN · slow, from the back of the hall to the lectern]
    { shot: 'CAM', pos: [0, 3.1, 12.3], look: [0, 1.95, -10.55], fov: 44, to: { pos: [0, 1.85, -7.4], look: [0, 1.95, -10.55], fov: 32 }, dur: 12, ease: 'out' },
    { wait: 2.5 },
    slow('rue19', "I was going to pitch a phone for important people. There's no such thing."),
    { wait: 1.2 },
    { do: (c) => c.runSteps(speech()) },
    // (closing: camera still, the text slows)
    { shot: 'MID', on: 'rue19' },
    slow('rue19', "None of them have a phone. They're the ones who should. ^ A phone company for everyone. One that says yes to people. That's it. That's the pitch."),
    { shot: 'INSERT', at: 'judge' },
    say('hartigan', "And what's this company called, Mr Rue?"),
    // [CLOSE · Rue]
    { shot: 'CLOSE', on: 'rue19' },
    slow('rue19', "…I haven't got a name yet."),
    // [WIDE] Yacht Phone wins. Polite applause. Rue shakes the winner's hand.
    { do: (c) => stand(c, 'finalist') },
    { place: 'finalist', at: [-2.0, 0.45, -10.15, H] },
    { place: 'rue19', at: [-0.95, 0.45, -10.15, -H] },
    { shot: 'CAM', pos: [-5.2, 2.5, -3.6], look: [-0.9, 1.3, -10.0], fov: 46 },
    { face: 'hartigan', to: 'finalist' }, { act: [['hartigan', 'point', { h: 0.46 }]] },
    { wait: 0.8 },
    { sfx: 'applause', vol: 0.3 },
    { act: [['finalist', 'bow', { dur: 1.6, loop: false }], ['chase', 'clap', { h: 0.45 }], ['bernie', 'clap', { h: 0.45 }]] },
    { wait: 1.7 },
    { act: [['hartigan', 'idle', { h: 0.46 }], ['finalist', 'give', { dur: 1.6 }], ['rue19', 'give', { dur: 1.6 }]] },
    { wait: 2.0 },
    { act: [['chase', 'idle'], ['bernie', 'fold', { h: 0.45 }]] },
    // [TWO-SHOT · Chase and Rue]
    { do: (c) => stand(c, 'chase') },
    { place: 'rue19', at: [0.42, 0, -7.8, -H] }, { place: 'chase', at: [-0.42, 0, -7.8, H] },
    { shot: 'CAM', pos: [0, 1.95, -9.45], look: [0, 1.55, -7.8], fov: 44 },   // TWO-SHOT, from the dais: the hall behind them
    say('chase', 'You lost.'),
    { expr: [['rue19', 'stunned']] },
    say('rue19', "That's grand."),
    face('rue19', (f) => { f.eyes('open'); f.mouth('smile'); }),
    { wait: 1.0 },
  ];

  CUTSCENES['3.1_polaroid'] = [
    { fade: 'out', dur: 0.8 },
    { set: 'square', env: 'rain', spawn: { luka: 'polaroid_l', rue19: 'polaroid_spot', chase: 'polaroid_r', des: 'polaroid_des' } },
    { do: (c) => { const d = actor(c, 'des'); if (d && d.held) d.hold(null); if (d) d.play('fold'); } },
    { expr: [['luka', 'laugh'], ['rue19', 'laugh'], ['chase', 'laugh']] },   // squinting
    { music: 'dublin_major', fade: 2 },
    // [POV · through Des's Polaroid camera] The three of them in front of the Front Gate arch, squinting. Flash. White.
    { shot: 'POV', from: 'des', at: [-17.6, 1.5, 0], fov: 34, card: ['viewfinder', {}] },
    { fade: 'in', dur: 0.6 },
    { wait: 2.0 },
    { sfx: 'polaroid' },
    { par: [{ flash: 0.5 }, { fade: 'out', dur: 0.3, color: '#fff' }] },
    { wait: 0.5 },
    // [INSERT] The Polaroid developing in Rue's hand. The image never quite resolves.
    { expr: [['rue19', 'neutral']] }, { act: [['rue19', 'reading']] }, hideBook('rue19'),
    { shot: 'INSERT', at: 'rue19', card: ['polaroid', DEV.d] },
    { do: develop },
    { fade: 'in', dur: 0.7, color: '#fff' },
    { wait: 1.6 },
    slow('des', "You keep it. You'll want it."),
    { wait: 1.2 },
    { do: () => { DEV.on = false; } },
    { fade: 'out', dur: 1.0 },
    { music: null, fade: 1.0 },
  ];

  // =================================================================== 3.2 — "Storage Full"
  // The lodge window (east wall, glass at x -20.26, z 4.6–6.5; the mullion at z 5.55; a transom at y 2.19). Des's desk under it.
  const CH_CUP = [-25.0, 0.46, 3.42, 2.84], LU_CUP = [-24.4, 0.46, 3.62, -2.79];   // in front of the cupboard, at the machine
  const MACHINE = [-24.75, 1.33, 2.75], M_FROM = [-24.55, 1.8, 3.3];                  // the machine on its shelf (the open door blocks the anchor's lens)
  const CH_WIN = [-21.45, 0.46, 4.85, 0.35], LU_WIN = [-21.45, 0.46, 6.3, PI - 0.35];  // either side of the mullion
  const CH_SIDE = [-21.45, 0.46, 5.78, H], LU_SIDE = [-21.45, 0.46, 6.32, H];          // shoulder to shoulder, looking out
  const RUE_GATE = [-16.9, 0, 2.3, 0.8], DES_GATE = [-16.3, 0, 2.9, -2.35];          // across the square by the gate, under a lamp
  // outside the glass in the rain: each of them alone in his half of the window, the bar at the frame edge between them
  const CH_ONE = { shot: 'CAM', pos: [-18.7, 2.55, 5.95], look: [-21.45, 1.95, 4.95], fov: 24 };
  const LU_ONE = { shot: 'CAM', pos: [-18.9, 1.7, 5.3], look: [-21.45, 2.1, 6.1], fov: 24 };
  const TWO_BAR = { shot: 'CAM', pos: [-17.6, 1.6, 5.55], look: [-21.45, 1.98, 5.57], fov: 30 };
  const LU_MID = { shot: 'CAM', pos: [-18.3, 1.75, 5.2], look: [-21.45, 1.85, 6.25], fov: 30 };
  const TWO_IN = { shot: 'CAM', pos: [-20.3, 2.0, 6.05], look: [-21.45, 1.92, 6.05], fov: 54 };    // inside, from the window: no bar
  const WIN_POV = { shot: 'CAM', pos: [-20.7, 2.0, 5.68], look: [-16.6, 1.45, 2.6], fov: 30 };   // through the pane between the bars
  const TOP_DOWN = { shot: 'TOP', on: 'chase', dist: 1.5, offset: 0.25 };   // 1.2's frame
  const JCAM = { shot: 'JARVIS', at: 'machine_back', on: ['chase', 'luka'] };   // 1.2's framing: behind the screen, fitted to their faces

  // The pop-up. In the cutscene its buttons are drawn but inert (YES advances the talk, not the pop-up).
  function storagePopup(c, live) {
    const p = c.popup({ msg: MSG, title: 'STORAGE FULL', icon: 'warn', buttons: [], cls: 'big', at: [0.5, 0.43] });
    const row = p.el.querySelector('.jv-btns'), B = [];
    for (const t of ['YES', 'NO']) { const b = document.createElement(live ? 'button' : 'span'); b.className = 'jv-b'; b.textContent = t; row.append(b); B.push(b); }
    return { p, yes: B[0], no: B[1] };
  }
  // "The pop-up waits": the first one is kept through the close-up, parked off screen (place() resets it if the pool reuses it)
  const HELD = { el: null, tf: '' };
  const park = { do: () => { const e = HELD.el; if (e) { HELD.tf = e.style.transform; e.style.transform = 'translate(-9999px,0)'; } } };
  const unpark = { do: () => { const e = HELD.el; if (e && !e.classList.contains('off')) e.style.transform = HELD.tf; } };
  // The choice, with the player in control: YES is greyed out and only clunks; only NO works tonight.
  async function choice(c) {
    if (c.flow.skipping) return;
    const { p, yes, no } = storagePopup(c, true);
    yes.style.cssText = 'opacity:.45;filter:grayscale(1);background:#9aa0aa;border-color:#8a9099;cursor:not-allowed';
    no.classList.add('foc');
    let n = false, clunks = 0;
    const clunk = () => { c.sfx('clunk'); clunks++; };
    yes.addEventListener('click', clunk); no.addEventListener('click', () => { n = true; });
    const t0 = clock.t;
    await waitUntil(() => {
      if (c.flow.skipping || n) return true;
      if (TEST.auto) { if (!clunks && clock.t - t0 > 0.5) clunk(); return clock.t - t0 > 1.2; }
      if (input.pressed('yes')) { input.consume('yes'); clunk(); }
      if (input.pressed('no')) { input.consume('no'); return true; }
      return false;
    });
    no.style.background = '#1d4fa8';
    await c.wait(0.25);
    p.close();
  }
  function lodgeDress(c) {
    const P = (n) => c.world.prop(n);
    const m = P('machine'); if (m) { m.visible = true; m.position.set(-24.75, 1.24, 2.72); m.rotation.set(0, 0, 0); }
    for (const [n, v] of [['machine_wrap', true], ['machine_wire', false], ['swivel_chair', false], ['yes_sign', false], ['lodge_light', true], ['bike', false], ['bike_chain', false], ['machine_prepaid', false]]) { const o = P(n); if (o) o.visible = v; }
    const cd = P('cupboard_door'); if (cd) cd.rotation.y = 0;
    const l = actor(c, 'luka'); if (l) { l.mood = null; l.habit = null; }
    const r = actor(c, 'rue19'); if (r) { r.walkAnim = 'walk'; r.setExpr('neutral'); }
    const d = actor(c, 'des'); if (d) d.face('rue19', 0);
  }
  const winLight = (on) => ({ do: (c) => lamp(c, on, [-19.1, 3.3, 5.5], [-21.6, 1.9, 5.3], 0xffe2b8, 6, 0.85) });   // the square's lamps through the window, on their faces
  const gateLight = { do: (c) => lamp(c, true, [-18.2, 3.5, 2.6], [-16.7, 1.2, 2.5], 0xffd9a0, 9, 0.6) };             // the lamp by the gate, on Rue and Des

  SCENES['3.2'] = {
    title: 'Storage Full', set: 'square', env: 'night', time: 'Mon 26 Oct 1987',
    playable: ['chase'], swap: false, hud: { battery: 4, bars: 3 }, music: null,
    spawn: { chase: 'lodge_door_in', luka: 'lodge_window', rue19: RUE_GATE, des: DES_GATE },
    hotspots: [
      { id: 'cupboard', at: 'lodge_cupboard', r: 1.0, verb: 'Open', once: true, flag: 'machine_checked',
        steps: [{ face: 'chase', to: [-24.75, 2.7] }, { sfx: 'creak' }, { prop: 'cupboard_door', fn: (o) => { o.rotation.y = 1.9; } }, { wait: 0.5 }] },
      { id: 'kettle', at: 'kettle', r: 1.1, verb: 'Use', kettle: true },
    ],
    steps: [
      ['do', lodgeDress],
      ['cutscene', '3.2_open'],
      ['control', 'chase'],
      ['objective', 'Check the machine.'],
      ['roam', { until: 'machine_checked', auto: (c) => c.hotspots.trigger('cupboard') }],
      ['objective', null],
      ['cutscene', '3.2_storage'],
    ],
    grants: { flags: { machine_checked: true, storage_seen: true }, battery: 4, bars: 4 },
  };

  // The lodge at night from across the square: the lit window in the rain, Luka in it (the gate kept out of shot for the POV).
  CUTSCENES['3.2_open'] = [
    { place: 'luka', at: [-20.7, 0.46, 6.3, 2.2] }, { face: 'luka', to: [-16.9, 2.3] },
    { shot: 'CAM', pos: [-11.0, 1.9, 6.4], look: [-20.3, 2.2, 5.6], fov: 26, to: { pos: [-13.0, 2.0, 6.1], look: [-20.3, 2.2, 5.6], fov: 22 }, dur: 4 },
    { wait: 3.2 },
  ];

  CUTSCENES['3.2_storage'] = [
    // Chase runs the pre-call check on the machine.
    { place: 'chase', at: CH_CUP },
    { prop: 'cupboard_door', fn: (o) => { o.rotation.y = 1.9; } },
    winLight(true),
    { shot: 'CAM', pos: [-24.65, 2.1, 3.95], look: [-24.8, 1.32, 2.75], fov: 45 },   // over his shoulder, into the cupboard
    { prop: 'machine_wrap', visible: false }, { sfx: 'rip', vol: 0.35 },
    { act: [['chase', 'type']] },
    { wait: 0.6 }, { sfx: 'key_beep', vol: 0.5 }, { wait: 0.4 }, { sfx: 'key_beep', vol: 0.5 }, { wait: 0.4 }, { sfx: 'beep', vol: 0.5 },
    { wait: 0.6 },
    // [INSERT] HUD: 4%. Enough.
    { shot: 'INSERT', at: MACHINE, from: M_FROM, fov: 40, card: ['battery', { pct: 4, bars: 3 }] },
    { wait: 1.8 },
    { place: 'luka', at: LU_CUP }, { act: [['chase', 'idle']] },
    // [JARVIS-CAM · from behind the machine's screen] The framing from 1.2. A pop-up lands over their faces.
    JCAM,
    { wait: 0.5 },
    { do: (c) => { HELD.el = storagePopup(c, false).p.el; } },
    { expr: [['chase', 'stunned'], ['luka', 'worried']] },
    { wait: 1.4 },
    say('luka', "What's being cleared?"),
    park,
    // [CLOSE · Chase]
    { expr: [['chase', 'sad']] },
    winLight(true),   // (the JARVIS-CAM borrowed the spot)
    { shot: 'CLOSE', on: 'chase' },
    slow('chase', 'The cache.'),
    say('luka', "What's in the cache?"),
    say('chase', "Us. Everything since we got here. It won't fit down the line. The machine can take us home. It can't take… this."),
    say('luka', "We'll forget?"),
    slow('chase', 'Des. Bernie. Declan. Him. The floor. The torches. ^ Each other. The real version.'),
    // Silence. The pop-up waits.
    JCAM,
    unpark,
    { wait: 2.4 },
    { popup: null, clear: true },
    winLight(true),
    // He goes to the window; Luka follows, and stops on the other side of the frame. The bars drop to 1.
    { shot: 'CAM', pos: [-25.2, 3.1, 4.9], look: [-21.4, 1.5, 5.4], fov: 60 },
    { move: 'chase', to: CH_WIN, nowait: true },
    { move: 'luka', to: LU_WIN },
    { face: 'chase', to: CH_WIN[3] }, { face: 'luka', to: LU_WIN[3] },
    { hud: { bars: 1 }, anim: 1.5 },
    { music: 'emotional', fade: 3 },
    // [SINGLES · shot-reverse-shot] The lodge window's frame bar between them in every angle.
    CH_ONE,
    say('chase', "What if we don't go?"),
    LU_ONE,
    say('luka', 'Chase.'),
    CH_ONE,
    say('chase', 'I\'m serious. I\'ve got three smartphones and I know what the internet is. I could invent… everything. Luka, I could actually change the world. Not "make a difference". Change it.'),
    LU_ONE,
    say('luka', 'And back home?'),
    CH_ONE,
    slow('chase', "Back home I'm a casual who sells screen protectors and cries into his hands."),
    LU_ONE,
    slow('luka', "You're more than that."),
    CH_ONE,
    slow('chase', "Not there I'm not. Here I built a time machine. Here I matter."),
    // [TWO-SHOT · locked, the window bar between them] Luka looks at Chase. A beat. Rain on the glass.
    { ...TWO_BAR, locked: true },
    { wait: 1.4 },
    slow('luka', 'Mate. You matter there.'),
    say('chase', "You won't remember saying that. Tomorrow you won't even remember you think it."),
    slow('luka', "Then I'll have to think it again."),
    // [MID · Luka]
    LU_MID,
    slow('luka', "If you stay, you change everything. Every phone. Every… everything. Reddy might not exist. Margaret might never get her grandson on her plan. ^ I might not exist. You might meet me in 2026 and I'm some bloke who never said yes to anything."),
    say('chase', '…'),
    say('luka', 'You wanted to change the world. Mate. Look at him.'),
    // [POV · through the lodge window] Across the square, at the gate, Rue laughing at something Des said.
    { face: 'luka', to: [-16.9, 2.3] },
    { do: (c) => c.world.talk('des', true) }, { act: [['des', 'shrug']] },
    gateLight,
    WIN_POV,
    { wait: 0.9 },
    { do: (c) => c.world.talk('des', false) },
    { act: [['rue19', 'laugh']] },
    { wait: 2.2 },
    // [TWO-SHOT · both at the window, shoulder to shoulder] No frame bar now. They're in one shot again. The bars climb to 4.
    { place: 'chase', at: CH_SIDE }, { place: 'luka', at: LU_SIDE },
    { expr: [['chase', 'neutral'], ['luka', 'neutral']] },
    winLight(true),
    TWO_IN,
    { hud: { bars: 4 }, anim: 2.4 },
    { wait: 0.8 },
    slow('luka', "Three weeks ago he couldn't remember anyone's name. Now he's out there learning the porter's. That's you."),
    slow('chase', "That's you too."),
    say('luka', 'Yeah. Us.'),
    // [TOP-DOWN · Chase] His hands rise toward his head. He stops them. He puts them down.
    TOP_DOWN,
    { wait: 0.4 },
    { act: [['chase', 'hands_halt', { dur: 2.8, loop: false }]] },
    { wait: 3.0 },
    slow('chase', 'So we forget.'),
    slow('luka', 'We forget.'),
    say('chase', "Then we'd better write it down."),
    say('luka', "…We're going to leave ourselves a voicemail."),
    say('chase', "A thirty-nine-year voicemail. ^ And I'm finishing a song."),
    say('luka', 'You never finish a song.'),
    say('chase', "I've never had a deadline this good."),
    // The choice. The pop-up returns with the player in control. YES is greyed out; only NO works tonight.
    { music: null, fade: 1.5 },
    { place: 'chase', at: CH_CUP }, { place: 'luka', at: LU_CUP },
    { expr: [['chase', 'determined'], ['luka', 'neutral']] },
    JCAM,
    { wait: 0.6 },
    { do: choice },
    // [INSERT] Chase's thumb presses NO.
    { act: [['chase', 'type']] },
    { shot: 'INSERT', at: MACHINE, from: M_FROM, fov: 40, card: ['storage_no', {}] },
    { sfx: 'key_beep', vol: 0.6 },
    { wait: 1.5 },
    // [CLOSE · Chase]
    { act: [['chase', 'idle']] }, { expr: [['chase', 'neutral']] },
    winLight(true),
    { shot: 'CLOSE', on: 'chase' },
    slow('chase', 'Not yet.'),
    { wait: 1.4 },
    { fade: 'out', dur: 1.2 },
    winLight(false),
    { hud: { battery: 4, bars: 4 } },
  ];
})();
