// ============================================================ MINIGAME: Credits (scene C)
// DOM in api.ui. The Polaroid, then Luka's notebook of Names (state.names only), with the credits rolling
// beside them, then the parody card. Music: Pudding's song built from state.pattern (AUDIO.song, credits:true);
// the roll is timed to the song and the parody card holds until it ends. NO (after 3 s) asks to skip.
// Every element is a paused Web Animation on one 0..1 timeline; draw() only sets currentTime (transform/opacity).

MINIGAMES.credits = (() => {
  const PARODY = "A work of affectionate parody. Not affiliated with or endorsed by Optus. Rue is a fictional portrayal. This is not how Optus got its name. JARVIS was not, as far as we know, built from a bug list. We can't prove it.";
  const CAST = [['STARRING', [['Luka', '2IC, Optus Redcliffe'], ['Chase', 'Casual, eight months in'], ['Rue', 'Business Studies, Trinity College Dublin']]],
    ['WITH', [['Des', 'Front Gate porter'], ['Bernie', 'The Buttery'], ['Declan', 'The basement lab'], ['Professor Hartigan', 'Business Studies'],
      ['Margaret', 'A regular for decades'], ['Dazza', 'Needs a SIM swap'], ['Luke', 'Store manager'], ['Jordan', 'The new casual']]],
    ['DUBLIN, 1987', [['Siobhán'], ['Ronan'], ['Fiachra'], ['Mick'], ['Nuala']]]];
  const CSS = `.crd{position:absolute;inset:0;overflow:hidden;background:radial-gradient(ellipse at 28% 50%,#241b14,#08080b 72%);color:#f3ede2;font-family:var(--game);text-align:center}
.crd-pic{position:absolute;left:0;top:0;width:50%;height:100%}
.crd-pic canvas{position:absolute;inset:0;margin:auto;max-width:76%;max-height:78%;opacity:0;filter:drop-shadow(0 14px 22px rgba(0,0,0,.6))}
.crd-txt{position:absolute;left:50%;right:0;top:0;bottom:0;overflow:hidden;-webkit-mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent);mask-image:linear-gradient(transparent,#000 14%,#000 86%,transparent)}
.crd-w{position:absolute;left:0;right:0;top:0;height:100%}
.crd-roll{padding:0 24px}
.crd-roll h1{font-size:64px;letter-spacing:.34em;margin:0 0 70px;padding-left:.34em;font-weight:bold;color:#fff}
.crd-roll h2{font-size:13px;letter-spacing:.3em;color:var(--yes);margin:0 0 16px;font-weight:bold}
.crd-roll p{margin:0 0 14px;font-size:22px;line-height:1.2}
.crd-roll p i{display:block;font-style:normal;font-size:13px;color:#a79f90;margin-top:3px;letter-spacing:.04em}
.crd-roll section{margin-bottom:64px}
.crd-roll .song{font-size:26px;font-style:italic}
.crd-par{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:0 28px;opacity:0}
.crd-par p{max-width:600px;margin:0;font-size:21px;line-height:1.65;color:#e9e2d4}
#ui.touchui .crd-txt{bottom:170px}
@media (max-aspect-ratio:1/1){.crd-pic{width:100%;height:44%}.crd-txt{left:0;top:42%}.crd-roll h1{font-size:48px;margin-bottom:48px}.crd-par p{font-size:18px}}`;
  const LANE = (on) => Array.from({ length: 16 }, (_, i) => on.includes(i));
  const DEF = () => [LANE([0, 4, 8, 12]), LANE([4, 12]), LANE([0, 2, 4, 6, 8, 10, 12, 14]), LANE([0, 2, 5, 7, 10, 13])];
  const D = 100000; // timeline length in ms; t / T maps onto it
  let api, anims = [], song = null, t = 0, T = 90, endAt = 0, asking = false, closing = false, done = true, auto = false;

  const el = (tag, cls, parent, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; if (parent) parent.append(e); return e; };
  const anim = (e, frames) => { const a = e.animate(frames, { duration: D, fill: 'both' }); a.pause(); anims.push(a); };
  const fades = (e, pts, move) => anim(e, pts.map(([o, v], i) => ({ offset: o, opacity: v, transform: move ? move(i / (pts.length - 1)) : 'none' })));

  function build(root, names) {
    if (!document.getElementById('crd-css')) el('style', null, document.head, CSS).id = 'crd-css';
    const box = el('div', 'crd', root), pic = el('div', 'crd-pic', box), txt = el('div', 'crd-txt', box);
    const cards = typeof ui !== 'undefined' && ui.paintCard;
    const polaroid = el('canvas', null, pic), book = names.length ? el('canvas', null, pic) : null;
    if (cards && ui.paintCard(polaroid, 'polaroid', { front: true })) { // warm it and fade it a little
      const c = polaroid.getContext('2d');
      c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(255,168,84,.17)'; c.fillRect(0, 0, polaroid.width, polaroid.height);
    }
    if (book && cards) ui.paintCard(book, 'list', { title: 'Names', paper: 'notebook', items: names });
    const w = el('div', 'crd-w', txt), roll = el('div', 'crd-roll', w);
    el('h1', null, roll, 'RUE');
    let s = el('section', null, roll);
    el('h2', null, s, 'MUSIC'); el('p', 'song', s, `"Opt Us In (Dublin '87)"`); el('p', null, s, 'by Pudding');
    for (const [h, list] of CAST) {
      s = el('section', null, roll); el('h2', null, s, h);
      for (const [n, role] of list) { const p = el('p', null, s, n); if (role) el('i', null, p, role); }
    }
    s = el('section', null, roll); el('p', null, s, 'Made with Three.js, Canvas 2D and Web Audio');
    const par = el('div', 'crd-par', box); el('p', null, par, PARODY);

    const pEnd = book ? 0.48 : 0.83;
    fades(polaroid, [[0, 0], [0.04, 1], [pEnd - 0.04, 1], [pEnd, 0]], (k) => `scale(${0.96 + 0.07 * k}) rotate(${-1.5 + 2 * k}deg)`);
    if (book) fades(book, [[0.46, 0], [0.51, 1], [0.79, 1], [0.83, 0]], (k) => `translateY(${10 - 20 * k}px) rotate(${1 - 2 * k}deg)`);
    anim(w, [{ offset: 0, transform: 'translateY(100%)' }, { offset: 0.03, transform: 'translateY(100%)' }, { offset: 0.82, transform: 'translateY(0)' }, { offset: 1, transform: 'translateY(0)' }]);
    anim(roll, [{ offset: 0, transform: 'translateY(0)' }, { offset: 0.03, transform: 'translateY(0)' }, { offset: 0.82, transform: 'translateY(-100%)' }, { offset: 1, transform: 'translateY(-100%)' }]);
    fades(par, [[0, 0], [0.85, 0], [0.89, 1], [1, 1]]);
  }

  function close(r) {
    if (closing || done) return;
    closing = true;
    if (r.skipped && song) { try { song.stop(); } catch (e) { /* already stopped */ } song = null; }
    const fin = () => { if (!done) { done = true; api.finish(r); } };
    if (typeof ui !== 'undefined' && !auto) ui.fade(1, 1).then(fin); else fin();
  }

  return {
    start(params, a) {
      api = a; anims = []; t = 0; asking = closing = auto = false; done = false; song = null;
      const st = a.state || state;
      build(a.ui, (st.names || []).slice());
      if (typeof music === 'function') music(null, { fade: 0.8 });
      try {
        if (a.AUDIO && a.AUDIO.song) {
          song = a.AUDIO.song(st.pattern || DEF(), { samples: st.samples || [], credits: true, onEnd: () => { song = null; endAt = Math.max(t + 1.5, T * 0.89 + 5); } });
        }
      } catch (e) { song = null; }
      // roll length = the song: its reported length, else 20 bars at 92 BPM (+ trill intro, + bell tail)
      const smp = st.samples || [];
      T = !song ? 90 : song.dur > 0 ? song.dur : 20 * 240 / 92 + (smp.includes('trill') ? 3 : 0) + (smp.includes('bell') ? 5 : 0) + 1;
      endAt = song ? T + 25 : T; // with a song, onEnd decides (the cap only guards a song that never reports)
    },
    update(dt) {
      if (done || closing) return;
      t += dt;
      if (t >= endAt) return close({ done: true });
      if (!asking && t > 3 && api.input.pressed('no')) {
        api.input.consume('no'); asking = true;
        api.ask('Skip credits?', { test: false }).then((y) => { asking = false; if (y) close({ done: true, skipped: true }); });
      }
    },
    draw() {
      const ms = Math.min(1, t / T) * D;
      for (let i = 0; i < anims.length; i++) anims[i].currentTime = ms;
    },
    end() {
      done = true;
      if (song) { try { song.stop(); } catch (e) { /* already stopped */ } song = null; }
      for (let i = 0; i < anims.length; i++) anims[i].cancel();
      anims = []; // the screen is left black: PC's flow.start fades in from it
    },
    autoplay() { auto = true; T = 0.8; endAt = 0.9; },
  };
})();
