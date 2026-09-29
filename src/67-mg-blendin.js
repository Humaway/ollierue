// ============================================================ MINIGAME: Blend In (2.3)
// Stealth down the lecture theatre on the set's own camera (lectern_view: Hartigan's view up the tiers).
// Hartigan reads a name 2.5–4 s (safe to move), then looks up 1.5–2.5 s to hear "Here"; after every third
// name a quick double take. Suspicion +40%/s while Luka moves in view (+20% behind Ronan's textbook), nothing
// while ducking (hold NO), -15%/s otherwise. Full: "Can I help you, gentlemen?", a titter, back to the door;
// after two failures he reads half as slowly again. Chase follows. Win: Luka reaches the two seats (row 6).
// Result {ok, fails}; taking the book sets state.flags.took_textbook.

MINIGAMES.blend_in = (() => {
  const F = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif', FB = 'bold 15px ' + F, FS = '13px ' + F, F12 = '12px ' + F;
  const rnd = (a, b) => a + Math.random() * (b - a);
  // Luka walking with the book held up: walking legs under the 'reading' arms (shows the textbook)
  ANIMS.book_walk = (r, t, p) => { ANIMS.walk(r, t, p); ANIMS.reading(r, t, p); };
  ANIMS.book_walk.shows = 'textbook';

  let api, ov, ctx, done = true, busy = false, L = null, C = null, Hg = null, crowd = null;
  let sus = 0, mode = 'read', t = 0, dbl = -1, d2 = 0, names = 0, fails = 0, slow = 1, lx = 0, lz = 0, duck = false, book = false, near = false;
  let sx = 0, sz = 0, bx = 0, bz = 0, W = 0, sch = '', hint = '', susN = -1, susTxt = '';
  const HEAD = [0, 0, 0], V3 = new THREE.Vector3();

  function hints() { const s = sch = api.input.scheme; hint = 'Move while he reads · Hold ' + (s === 'pad' ? 'B' : s === 'touch' ? 'NO' : 'NO (Esc)') + ' to duck when he looks up'; }
  function read() { mode = 'read'; names++; t = rnd(2.5, 4) * slow; dbl = names % 3 === 0 ? t * rnd(0.35, 0.6) : -1; if (Hg) Hg.play('look_down'); }
  function lookUp() { mode = 'look'; t = rnd(1.5, 2.5); if (Hg) Hg.play('idle'); if (api.AUDIO) api.AUDIO.blip('student'); }
  function toDoor() {
    L.place('top_entry'); if (C) C.place([0.55, 5.7, 15.05, Math.PI]);
    lx = L.pos.x; lz = L.pos.z; sus = 0; duck = false;
    L.play(book ? 'reading' : 'idle'); if (C) C.play('idle');
    read();
  }
  async function take() {
    busy = true; player.enabled = false; ui.prompt(null);
    const b = api.world.prop('textbook'); if (b) b.visible = false;
    book = true; state.flags.took_textbook = true;
    L.walkAnim = 'book_walk'; L.play('reading');
    await api.play([{ say: 'luka', text: "Ronan's asleep. He won't miss it. He's missing everything." }]);
    busy = false; if (!done) player.enabled = !duck;
  }
  async function fail() {
    busy = true; fails++; if (fails >= 2) slow = 1.5;
    player.enabled = false; ui.prompt(null); near = false;
    if (Hg) Hg.play('idle');
    if (crowd) { L.headPos(V3); HEAD[0] = V3.x; HEAD[1] = V3.y; HEAD[2] = V3.z; crowd.userData.look(HEAD); }   // every head turns
    await api.play([
      { say: 'hartigan', text: 'Can I help you, gentlemen?' },
      { say: 'luka', text: 'Just… looking for a seat.' },
      { sfx: 'titter' }, { wait: 1.1 },
      { fade: 'out', dur: 0.4 },
    ]);
    if (done) return;
    toDoor(); if (crowd) crowd.userData.look(null);
    await api.play([{ fade: 'in', dur: 0.4 }]);
    busy = false; if (!done) player.enabled = true;
  }
  function win() {
    done = true; player.enabled = false; player.follower(null); ui.prompt(null);
    api.finish({ ok: true, fails });
  }

  return {
    start(params, a) {
      api = a; ov = a.overlay; ctx = ov.ctx; done = false; busy = false; W = 0; susN = -1;
      sus = 0; names = 0; fails = 0; slow = 1; duck = false; near = false;
      L = a.world.actor('luka'); C = a.world.actor('chase'); Hg = a.world.actor('hartigan'); crowd = a.world.prop('crowd');
      book = !!state.flags.took_textbook;
      const s = a.world.mark('seat_luka'), bk = a.world.anchor('textbook');
      sx = s ? s[0] + 0.3 : 2.5; sz = s ? s[2] - 0.14 : 6.5;
      bx = bk ? bk.at.x : 1.05; bz = bk ? bk.at.z : 8.86;
      if (L) { lx = L.pos.x; lz = L.pos.z; if (book) L.walkAnim = 'book_walk'; }
      player.control('luka'); player.follower('chase'); player.enabled = true;
      hints(); read(); ov.show(true);
    },
    update(dt) {
      if (done || busy || !L) return;
      const I = api.input;
      // Hartigan: read a name (down), double take every third name, look up to hear "Here"
      t -= dt;
      if (mode === 'read') {
        if (dbl > 0 && t <= dbl) { dbl = -1; mode = 'dbl'; d2 = 0.45; if (Hg) Hg.play('idle'); api.sfx('tick', { vol: 0.5 }); }
        else if (t <= 0) lookUp();
      } else if (mode === 'dbl') { if ((d2 -= dt) <= 0) { mode = 'read'; if (Hg) Hg.play('look_down'); } }
      else if (t <= 0) read();
      // ducking (hold NO): can't move, can't be seen
      const dn = I.held('no');
      if (dn !== duck) {
        duck = dn; player.enabled = !duck;
        L.play(duck ? 'duck' : book ? 'reading' : 'idle'); if (C) C.play(duck ? 'duck' : 'idle');
      }
      if (book && !duck && L.anim === 'book_walk' && Math.hypot(I.move.x, I.move.y) < 0.15) L.play('reading');
      const moved = Math.abs(L.pos.x - lx) + Math.abs(L.pos.z - lz) > 0.004;
      lx = L.pos.x; lz = L.pos.z;
      if (mode !== 'read' && moved && !duck) sus += (book ? 20 : 40) * dt; else sus -= 15 * dt;
      sus = sus < 0 ? 0 : sus > 100 ? 100 : sus;
      if (sus >= 100) { fail(); return; }
      // Ronan's textbook, on his desk by the aisle
      const nb = !book && Math.hypot(L.pos.x - bx, L.pos.z - bz) < 1.0;
      if (nb !== near) { near = nb; ui.prompt(near ? 'YES — Take' : null); }
      if (near && I.pressed('yes')) { I.consume('yes'); take(); return; }
      // the two seats, eight rows down
      if (Math.abs(L.pos.x - sx) < 0.65 && Math.abs(L.pos.z - sz) < 0.4) win();
    },
    draw() {
      if (done || !ctx) return;
      const w = innerWidth, h = innerHeight;
      if (w !== W || sch !== api.input.scheme) { W = w; hints(); }
      const k = ov.canvas.width / w;
      ctx.setTransform(k, 0, 0, k, 0, 0); ctx.clearRect(0, 0, w, h);
      const pw = Math.min(460, w - 24), px = (w - pw) / 2, py = 58, ph = 84, up = mode !== 'read';
      ctx.fillStyle = 'rgba(20,29,58,0.88)'; ctx.beginPath(); ctx.roundRect(px, py, pw, ph, 12); ctx.fill();
      ctx.fillStyle = CONFIG.colors.yes; ctx.fillRect(px + 10, py, pw - 20, 2);
      ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = FB; ctx.fillStyle = CONFIG.colors.yes; ctx.fillText('BLEND IN', px + 14, py + 18);
      ctx.textAlign = 'right'; ctx.font = FB; ctx.fillStyle = up ? '#ff8a80' : '#7dffb0';
      ctx.fillText(up ? 'HARTIGAN IS LOOKING' : 'HARTIGAN IS READING', px + pw - 14, py + 18);
      // the suspicion meter
      const mx = px + 14, mw = pw - 28, my = py + 36;
      ctx.fillStyle = '#0b1026'; ctx.beginPath(); ctx.roundRect(mx, my, mw, 14, 5); ctx.fill();
      ctx.fillStyle = sus > 70 ? '#ff6b5e' : sus > 35 ? '#ffcf7a' : '#c9d2ea';
      if (sus > 0.5) { ctx.beginPath(); ctx.roundRect(mx + 2, my + 2, (mw - 4) * sus / 100, 10, 4); ctx.fill(); }
      const n = sus | 0;
      if (n !== susN) { susN = n; susTxt = 'SUSPICION ' + n + '%'; }
      ctx.font = F12; ctx.textAlign = 'left'; ctx.fillStyle = '#97a2c2'; ctx.fillText(susTxt, mx, my + 26);
      ctx.textAlign = 'right'; ctx.font = FS; ctx.fillStyle = duck ? '#7dffb0' : '#c9d2ea'; ctx.fillText(duck ? 'DUCKING' : book ? 'BEHIND A TEXTBOOK' : '', mx + mw, my + 26);
      ctx.textAlign = 'center'; ctx.font = FS; ctx.fillStyle = '#e6ebf7'; ctx.fillText(hint, w / 2, py + ph + 14);
    },
    end() {
      done = true; busy = false;
      if (L) L.walkAnim = 'walk';
      player.enabled = false; player.follower(null); ui.prompt(null);
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, ov.canvas.width, ov.canvas.height); }
      if (ov) ov.show(false);
    },
    autoplay(a) {
      state.flags.took_textbook = true;
      const b = a.world.prop('textbook'); if (b) b.visible = false;
      a.finish({ ok: true, auto: true });
    },
  };
})();
