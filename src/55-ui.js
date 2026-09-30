
// ============================================================ UI
// All DOM UI in #ui: fades, letterbox, cards, prompts, dialogue (say/choose/ask), JARVIS pop-ups,
// 1987 HUD, objective, portraits, inventory panel, menus, and the CARDS painters for INSERT close-ups.
// Per frame only transform / opacity / text change. Everything time-based runs on game ticks.

const ui = (() => {
  const $ = (id) => document.getElementById(id);
  const root = $('ui'), fadeEl = $('fade'), flashEl = $('flash'), tcard = $('tcard'), acard = $('acard');
  const cardWrap = $('cardwrap'), cardCv = $('card'), toastEl = $('toast'), swapEl = $('swap'), promptEl = $('prompt');
  const pB = document.createElement('b'), pS = document.createElement('span');
  promptEl.append(pB, pS);
  const tweens = [];
  let lastPrompt, toastT = 0;
  fadeEl._o = 1; flashEl._o = 0; tcard._o = 0; acard._o = 0;

  // opacity tween on game time; a new tween on the same element replaces (and resolves) the old one
  function fadeTo(el, to, dur) {
    for (let i = 0; i < tweens.length; i++) if (tweens[i].el === el) { const o = tweens[i]; tweens.splice(i, 1); o.res(); break; }
    if (!(dur > 0) || U.skipping()) { el._o = to; el.style.opacity = to; return Promise.resolve(); }
    return new Promise((res) => tweens.push({ el, a: el._o, b: to, dur, t: 0, res }));
  }

  const inv = { el: $('inv'), row: null, desc: null, acts: null, slots: [], spec: null, sel: 0, mode: 'items', act: 0, first: -1, t: 0 };
  inv.row = inv.el.querySelector('.row'); inv.desc = inv.el.querySelector('.desc'); inv.acts = [...inv.el.querySelectorAll('.acts button')];

  const U = {
    skipping: () => typeof flow !== 'undefined' && flow.skipping === true,
    sfx(name, o) { if (typeof sfx === 'function') sfx(name, o); },

    fade(to, dur = 0.5, color) {
      if (to === 'out') to = 1; else if (to === 'in') to = 0;
      if (color) fadeEl.style.background = color; else if (to > 0) fadeEl.style.background = '#000';
      return fadeTo(fadeEl, to, dur);
    },
    flash(dur = 0.6, color = '#fff') {
      flashEl.style.background = color;
      if (U.skipping()) return fadeTo(flashEl, 0, 0);
      if (options.reduceFlashing) return fadeTo(flashEl, 0.35, dur * 0.4).then(() => fadeTo(flashEl, 0, dur * 1.2));
      flashEl._o = 1; flashEl.style.opacity = 1;
      return fadeTo(flashEl, 0, dur);
    },
    letterbox(on) { root.classList.toggle('lbon', !!on); },
    async title(text, dur = 2.5) {
      if (U.skipping()) return;
      tcard.textContent = text;
      await fadeTo(tcard, 1, 0.5); await wait(Math.max(0, dur - 1)); await fadeTo(tcard, 0, 0.5);
    },
    async actCard(text) {
      if (U.skipping()) return;
      const i = text.indexOf(' — ');
      acard.children[0].textContent = i < 0 ? text : text.slice(0, i);
      acard.children[2].textContent = i < 0 ? '' : text.slice(i + 3);
      await fadeTo(acard, 1, 0.8); await wait(2.8); await fadeTo(acard, 0, 0.8);
    },

    // paints CARDS[kind] into any canvas at the painter's native size; returns [w, h] or null
    paintCard(cv, kind, data) {
      const f = CARDS[kind];
      if (!f) { console.warn('RUE: no CARDS.' + kind); return null; }
      const s = f.size || [800, 600];
      if (cv.width !== s[0]) cv.width = s[0];
      if (cv.height !== s[1]) cv.height = s[1];
      const cx = cv.getContext('2d');
      cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, s[0], s[1]);
      cx.save(); f(cx, s[0], s[1], data || {}); cx.restore();
      return s;
    },
    card(kind, data) {
      if (!kind) { cardWrap.classList.add('off'); return; }
      const s = U.paintCard(cardCv, kind, data);
      if (!s) return;
      const k = Math.min((root.classList.contains('lbon') ? 0.62 : 0.7) * innerHeight / s[1], 0.86 * innerWidth / s[0]); // stays inside the 2.35:1 frame
      cardCv.style.width = Math.round(s[0] * k) + 'px'; cardCv.style.height = Math.round(s[1] * k) + 'px';
      cardWrap.classList.remove('off');
    },
    toast(text) { toastEl.textContent = text; toastEl.classList.add('show'); toastT = 2.2; },
    prompt(text) {
      if (text === lastPrompt) return;
      lastPrompt = text;
      if (!text) { promptEl.classList.add('off'); return; }
      const m = /^(YES|NO)\b\s*(?:—\s*)?(.*)$/.exec(text);
      pB.textContent = m ? m[1] : ''; pB.className = m && m[1] === 'NO' ? 'no' : ''; pB.style.display = m ? '' : 'none';
      pS.textContent = m ? m[2] : text;
      promptEl.classList.remove('off');
    },
    swapIndicator(activeId, otherId) {
      if (!activeId) { swapEl.classList.add('off'); return; }
      swapEl.children[1].src = portraitURL(activeId);
      swapEl.children[0].src = otherId ? portraitURL(otherId) : '';
      swapEl.children[0].style.display = otherId ? '' : 'none';
      swapEl.classList.remove('off');
    },

    // ---------------------------------------------------------- inventory panel (modal while open)
    inventoryPanel(spec) {
      if (!spec) { inv.spec = null; inv.el.classList.add('off'); return null; }
      inv.spec = spec; inv.sel = 0; inv.mode = 'items'; inv.act = 0; inv.first = -1; inv.t = 0;
      const items = spec.items || [];
      inv.row.textContent = '';
      for (let k = 0; k < items.length; k++) {
        let s = inv.slots[k];
        if (!s) {
          s = document.createElement('div'); s.className = 'slot'; s._k = k;
          const c = document.createElement('canvas'); c.width = c.height = 96;
          s.append(c, document.createElement('span'));
          s.addEventListener('click', () => {
            if (!inv.spec) return;
            if (inv.mode === 'combine') { if (s._k !== inv.first) { inv.sel = s._k; invDo(); } return; }
            inv.sel = s._k; inv.mode = 'acts'; invPaint();
          });
          inv.slots[k] = s;
        }
        const it = items[k], cx = s.firstChild.getContext('2d');
        cx.clearRect(0, 0, 96, 96);
        const icon = it.icon || (ITEMS[it.id] && ITEMS[it.id].icon);
        if (typeof icon === 'function') { cx.save(); icon(cx, 96, 96); cx.restore(); }
        else { // generic glyph: a tag with the initial
          cx.fillStyle = '#3a4a86'; cx.beginPath(); cx.roundRect(14, 14, 68, 68, 12); cx.fill();
          cx.fillStyle = '#ffd21f'; cx.font = 'bold 38px "Trebuchet MS", sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
          cx.fillText((it.name || it.id || '?')[0].toUpperCase(), 48, 50);
        }
        s.lastChild.textContent = it.name || (ITEMS[it.id] && ITEMS[it.id].name) || it.id;
        inv.row.append(s);
      }
      if (!items.length) { const e = document.createElement('div'); e.className = 'empty'; e.textContent = 'Nothing in your pockets.'; inv.row.append(e); }
      inv.el.classList.remove('off');
      invPaint();
      return { close: () => { if (inv.spec === spec) U.inventoryPanel(null); } };
    },

    reset() { // back to a clean screen (title, quit)
      popup.clear(); U.card(null); U.prompt(null); objective(null); say.reset(); U.letterbox(false);
      U.swapIndicator(null); U.inventoryPanel(null); document.getElementById('hud').classList.add('off');
      fadeTo(flashEl, 0, 0); fadeTo(tcard, 0, 0); fadeTo(acard, 0, 0);
    },
    init() { on('render', popup.render); },

    update(dt) {
      for (let i = tweens.length - 1; i >= 0; i--) {
        const w = tweens[i];
        w.t += dt;
        const k = Math.min(1, w.t / w.dur);
        w.el._o = w.a + (w.b - w.a) * k; w.el.style.opacity = w.el._o;
        if (k >= 1) { tweens.splice(i, 1); w.res(); }
      }
      if (toastT > 0 && (toastT -= dt) <= 0) toastEl.classList.remove('show');
      objective.update();
      hud.update(dt);
      if (inv.spec) { invUpdate(dt); return; }
      say.update(dt);
      popup.update(dt);
    },
  };

  function invPaint() {
    const items = inv.spec.items || [], it = items[inv.sel];
    for (let k = 0; k < items.length; k++) {
      inv.slots[k].classList.toggle('sel', k === inv.sel);
      inv.slots[k].classList.toggle('pick', k === inv.first && inv.mode === 'combine');
    }
    for (let k = 0; k < 3; k++) inv.acts[k].classList.toggle('sel', inv.mode === 'acts' && k === inv.act);
    inv.acts[0].parentNode.classList.toggle('dim', inv.mode !== 'acts');
    if (!it) { inv.desc.textContent = ''; return; }
    const def = ITEMS[it.id] || {};
    inv.desc.textContent = inv.mode === 'combine' ? `Combine ${items[inv.first].name} with… ${inv.first === inv.sel ? '' : it.name}` : (def.desc || it.name);
  }
  function invDo() {
    const s = inv.spec, items = s.items, id = items[inv.sel] && items[inv.sel].id;
    if (inv.mode === 'combine') { const a = items[inv.first].id; U.inventoryPanel(null); s.onCombine && s.onCombine(a, id); return; }
    if (!id) return;
    if (inv.act === 2) { if (items.length < 2) { U.sfx('clunk'); return; } inv.mode = 'combine'; inv.first = inv.sel; inv.sel = (inv.sel + 1) % items.length; invPaint(); return; }
    U.inventoryPanel(null);
    if (inv.act === 0) s.onExamine && s.onExamine(id); else s.onUse && s.onUse(id);
  }
  inv.acts.forEach((b, k) => b.addEventListener('click', () => { if (!inv.spec || !(inv.spec.items || []).length) return; if (inv.mode === 'combine') inv.mode = 'acts'; inv.act = k; invDo(); }));
  function invUpdate(dt) {
    const s = inv.spec, n = (s.items || []).length;
    const close = () => { U.inventoryPanel(null); s.onClose && s.onClose(); };
    if (TEST.auto && (inv.t += dt) > 0.5) return close();
    const L = input.pressed('left') || input.pressed('up'), R = input.pressed('right') || input.pressed('down');
    input.consume('left'); input.consume('right'); input.consume('up'); input.consume('down');
    if (input.pressed('inventory')) { input.consume('inventory'); return close(); }
    let changed = L || R;
    if (inv.mode === 'acts') {
      if (L) inv.act = (inv.act + 2) % 3; if (R) inv.act = (inv.act + 1) % 3;
    } else if (n) {
      const d = L ? -1 : R ? 1 : 0;
      if (d) { inv.sel = (inv.sel + d + n) % n; if (inv.mode === 'combine' && inv.sel === inv.first) inv.sel = (inv.sel + d + n) % n; }
    }
    if (input.pressed('yes')) {
      input.consume('yes'); changed = true;
      if (inv.mode === 'items') { if (n) inv.mode = 'acts'; } else if (inv.mode === 'acts' || inv.sel !== inv.first) { invDo(); if (!inv.spec) return; }
    } else if (input.pressed('no')) {
      input.consume('no'); changed = true;
      if (inv.mode === 'items') return close();
      if (inv.mode === 'combine') { inv.mode = 'acts'; inv.sel = inv.first; } else inv.mode = 'items';
    }
    if (changed) invPaint();
  }
  return U;
})();

// ------------------------------------------------------------ dialogue: say / choose / ask
const { say, choose, ask } = (() => {
  const box = document.getElementById('dlg'), face = box.querySelector('.face'), nameEl = box.querySelector('.who span'), tagEl = box.querySelector('.who i');
  const txt = box.querySelector('.txt'), optsEl = box.querySelector('.opts'), more = box.querySelector('.more');
  const node = document.createTextNode(''); txt.append(node);
  const btns = [];
  const D = { mode: null, res: null, id: '', faceId: null, text: '', len: 0, i: 0, acc: 0, cps: 48, beats: [], bi: 0, pause: 0, typing: false,
    n: 0, fast: false, q: false, censor: false, cwait: false, auto: 0, after: 0, talk: [], sel: 0, n2: 0, dis: [], opt: null, shown: false, hide: 0 };

  const talk = (on) => { if (typeof world !== 'undefined' && world.talk) for (let k = 0; k < D.talk.length; k++) world.talk(D.talk[k], on); };
  const blip = (rising) => { if (typeof AUDIO !== 'undefined') AUDIO.blip(D.id, rising); };
  function showBox() {
    D.hide = 0;
    if (D.shown) return;
    D.shown = true; box.classList.remove('off'); box.parentNode.classList.add('talking');
    if (typeof AUDIO !== 'undefined') AUDIO.duck(true);
  }
  function hideBox() {
    if (!D.shown) return;
    D.shown = false; box.classList.add('off'); box.parentNode.classList.remove('talking'); optsEl.classList.add('off'); more.classList.add('off');
    if (typeof AUDIO !== 'undefined') AUDIO.duck(false);
  }
  function finish(v) { // resolve the current request; the box lingers a few ticks in case another line follows
    const r = D.res; D.mode = null; D.res = null; D.hide = 0; D.cwait = false;
    more.classList.add('off'); optsEl.classList.add('off');
    if (r) r(v);
  }
  function header(id, opts) {
    const ch = CHARACTERS[id];
    nameEl.textContent = opts.name || (ch && ch.name) || String(id).toUpperCase();
    tagEl.textContent = opts.tag || '';
    box.classList.remove('noname');
    if (opts.portrait === false) box.classList.add('noface');
    else { box.classList.remove('noface'); if (D.faceId !== id) { face.src = portraitURL(id); D.faceId = id; } }
  }
  function opts(labels, askMode, dis) {
    optsEl.classList.toggle('ask', askMode);
    optsEl.textContent = '';
    for (let k = 0; k < labels.length; k++) {
      let b = btns[k];
      if (!b) {
        b = btns[k] = document.createElement('button'); b._k = k;
        b.addEventListener('click', () => { if (D.mode === 'choose') pick(b._k); else if (D.mode === 'ask') answer(b._k === 0); });
        b.addEventListener('pointerenter', () => { if (D.mode === 'choose') { D.sel = b._k; mark(); } });
      }
      b.textContent = labels[k];
      b.classList.toggle('dis', dis.includes(k));
      optsEl.append(b);
    }
    D.n2 = labels.length;
    optsEl.classList.remove('off');
    mark();
  }
  const mark = () => { for (let k = 0; k < D.n2; k++) btns[k].classList.toggle('sel', D.mode === 'choose' && k === D.sel); };

  function say(id, text, o = {}) {
    if (ui.skipping()) return Promise.resolve();
    text = String(text ?? '');
    if (D.res) finish();
    return new Promise((res) => {
      showBox(); header(id, o);
      // '^' = a beat: pause CONFIG.beat there, render nothing, collapse the doubled space
      let out = ''; const beats = [];
      for (let k = 0; k < text.length; k++) {
        const c = text[k];
        if (c === '^') { if (text[k + 1] === ' ' && (out === '' || out.endsWith(' '))) k++; beats.push(out.length); continue; }
        out += c;
      }
      const sp = o.speed || 'normal';
      Object.assign(D, { mode: 'say', res, id, text: out, beats, bi: 0, i: 0, acc: 0, pause: 0, typing: true, n: 0, after: 0, cwait: false,
        cps: CONFIG.text[sp] * CONFIG.text[options.textSpeed] / CONFIG.text.normal, fast: sp === 'fast' || options.textSpeed === 'fast',
        q: /\?[\s…—"')]*$/.test(out), censor: !!o.censor, auto: o.auto || 0 });
      D.len = D.censor ? Math.max(1, Math.floor(out.length * 0.75)) : out.length;
      const ch = CHARACTERS[id];
      D.talk = ch && ch.voice && ch.voice.also ? id.split('_') : [id];
      node.data = ''; optsEl.classList.add('off'); more.classList.add('off');
      talk(true);
    });
  }
  function typed() {
    D.typing = false; talk(false); D.after = 0;
    if (!D.censor) { more.classList.remove('off'); return; }
    // the swearing censor: JARVIS slams a pop-up over the speaker's face
    state.flags.seen_swearing = true;
    const who = D.talk[0], hasActor = typeof world !== 'undefined' && world.actor && world.actor(who);
    const p = popup({ msg: 'Language detected. This interaction has been flagged for coaching.', icon: 'warn', buttons: ['OK'], at: hasActor ? { actor: who } : 'center', shake: true });
    D.cwait = true;
    const res = D.res, done = () => { if (D.res === res && D.cwait) finish(); };
    p.done.then(done);
    if (typeof cam !== 'undefined' && cam.cutscene) wait(1.2).then(done);
  }
  function step(dt) { // typewriter: appends to one text node
    if (D.pause > 0) { if ((D.pause -= dt) <= 0) talk(true); return; }
    D.acc += dt * D.cps;
    while (D.acc >= 1 && D.i < D.len) {
      if (D.bi < D.beats.length && D.beats[D.bi] === D.i) { D.bi++; D.pause = CONFIG.beat; D.acc = 0; talk(false); return; }
      const c = D.text.charCodeAt(D.i);
      node.appendData(D.text[D.i]); D.i++; D.acc -= 1;
      const letter = (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || (c >= 192 && c < 0x2000);
      if (letter && (!D.fast || (D.n++ & 1) === 0)) blip(D.q && D.i > D.len - 6);
    }
    if (D.i >= D.len) typed();
  }
  function pick(k) {
    if (D.dis.includes(k)) { ui.sfx('clunk'); return; }
    finish(k);
  }
  function answer(v) {
    if ((v && D.opt.yesDisabled) || (!v && D.opt.noDisabled)) { ui.sfx('clunk'); return; }
    finish(v);
  }
  const autoPick = () => { const t = D.opt.test; if (t != null && !D.dis.includes(t)) return t; for (let k = 0; k < D.n2; k++) if (!D.dis.includes(k)) return k; return 0; };
  const autoAnswer = () => { let v = D.opt.test ?? true; if (v && D.opt.yesDisabled) v = false; else if (!v && D.opt.noDisabled) v = true; return v; };

  function choose(labels, o = {}) {
    if (D.res) finish();
    D.opt = o; D.dis = o.disabled || []; D.n2 = labels.length;
    if (ui.skipping()) return Promise.resolve(autoPick());
    return new Promise((res) => {
      if (!D.shown) { node.data = ''; box.classList.add('noname', 'noface'); D.faceId = null; }
      showBox(); more.classList.add('off');
      D.mode = 'choose'; D.res = res; D.after = 0;
      D.sel = 0; while (D.sel < labels.length - 1 && D.dis.includes(D.sel)) D.sel++;
      opts(labels, false, D.dis);
    });
  }
  function ask(question, o = {}) {
    if (D.res) finish();
    D.opt = o; D.dis = []; D.n2 = 2;
    if (ui.skipping()) return Promise.resolve(autoAnswer());
    return new Promise((res) => {
      showBox(); more.classList.add('off');
      box.classList.add('noname', 'noface'); D.faceId = null;
      node.data = question;
      D.mode = 'ask'; D.res = res; D.after = 0;
      const dis = []; if (o.yesDisabled) dis.push(0); if (o.noDisabled) dis.push(1);
      opts(['YES', 'NO'], true, dis);
    });
  }

  say.busy = () => D.mode !== null && !D.cwait;
  say.reset = () => { D.mode = null; D.res = null; D.cwait = false; talk(false); hideBox(); };
  say.update = (dt) => {
    if (D.mode === null) { if (D.shown && (D.hide += dt) > 0.07) hideBox(); return; }
    const skip = ui.skipping();
    if (D.mode === 'say') {
      if (skip) { talk(false); return finish(); }
      if (D.typing) {
        if (input.pressed('yes')) { input.consume('yes'); node.data = D.text.slice(0, D.len); D.i = D.len; D.bi = D.beats.length; D.pause = 0; typed(); }
        else step(dt);
        return;
      }
      if (D.cwait) return; // the censor pop-up owns YES now
      D.after += dt;
      if ((D.auto > 0 && D.after >= D.auto) || (TEST.auto && D.after >= 0.15)) return finish();
      if (input.pressed('yes')) { input.consume('yes'); finish(); }
      return;
    }
    D.after += dt;
    if (D.mode === 'choose') {
      if (skip || (TEST.auto && D.after >= 0.3)) return finish(autoPick());
      if (input.pressed('up')) { input.consume('up'); D.sel = (D.sel - 1 + D.n2) % D.n2; mark(); }
      if (input.pressed('down')) { input.consume('down'); D.sel = (D.sel + 1) % D.n2; mark(); }
      if (input.pressed('yes')) { input.consume('yes'); pick(D.sel); }
    } else if (D.mode === 'ask') {
      if (skip || (TEST.auto && D.after >= 0.3)) return finish(autoAnswer());
      if (input.pressed('yes')) { input.consume('yes'); answer(true); }
      else if (input.pressed('no')) { input.consume('no'); answer(false); }
    }
  };
  return { say, choose, ask };
})();

// ------------------------------------------------------------ JARVIS pop-ups (pooled DOM)
const popup = (() => {
  const layer = document.getElementById('pops');
  const pool = [], live = [], v3 = new THREE.Vector3();
  let seq = 0;
  const HTML = '<div class="jv"><div class="jv-bar"><span class="jv-logo">JARVIS</span><span class="jv-t"></span><i class="jv-x">&times;</i></div>' +
    '<div class="jv-body"><div class="ic"></div><div class="jv-msg"></div></div><div class="jv-spin"></div>' +
    '<div class="jv-prog"><div><i></i></div><span></span></div><div class="jv-btns"></div></div>';

  function make() {
    const w = document.createElement('div'); w.className = 'jvw off'; w.innerHTML = HTML;
    const q = (s) => w.querySelector(s);
    const p = { w, box: w.firstChild, title: q('.jv-t'), ic: q('.ic'), msg: q('.jv-msg'), spin: q('.jv-spin'), prog: q('.jv-prog'), bar: q('.jv-prog i'),
      pct: q('.jv-prog span'), btns: q('.jv-btns'), bs: [], open: false, tok: 0, spec: null, res: null, age: 0, life: 0, n: 0, focus: 0, tickT: 0,
      pr: null, prT: 0, actor: null, stack: false, z: 0 };
    layer.append(w);
    return p;
  }
  function button(p, k) {
    let b = p.bs[k];
    if (b) return b;
    b = p.bs[k] = document.createElement('button'); b.className = 'jv-b'; b._k = k;
    b.addEventListener('click', () => { if (p.open) close(p, b._k); });
    b.addEventListener('pointerenter', (e) => {
      if (!p.open) return;
      focus(p, b._k);
      if (!p.spec.dodge || !p.spec.dodge.includes(b._k) || b._d >= 2) return;
      b._d++; // run away 60 px from the pointer (twice), then give up
      const r = b.getBoundingClientRect();
      let dx = e.clientX < r.left + r.width / 2 ? 60 : -60;
      if (Math.abs(b._x + dx) > 130) dx = -dx;
      b._x += dx; b._y = b._d === 1 ? -14 : 10;
      b.style.transform = `translate(${b._x}px,${b._y}px)`;
    });
    return b;
  }
  const focus = (p, k) => { p.focus = k; for (let i = 0; i < p.n; i++) p.bs[i].classList.toggle('foc', i === k); };
  const place = (p, x, y) => { p.w.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`; };
  function setProg(p, v) { p.bar.style.transform = `scaleX(${Math.max(0, Math.min(1, v / 100))})`; p.pct.textContent = Math.round(v) + '%'; }
  function track(p) {
    if (typeof world === 'undefined' || typeof cam === 'undefined' || !world.actor) return;
    const a = world.actor(p.actor);
    if (!a) return;
    a.headPos(v3);
    const s = cam.project(v3);
    if (s && s.visible !== false) place(p, s.x, s.y);
  }
  function close(p, i) {
    if (!p.open) return;
    p.open = false; p.tok++;
    p.w.classList.add('off');
    live.splice(live.indexOf(p), 1); pool.push(p);
    p.res(i);
  }

  function popup(spec) {
    const s = spec || {}, p = pool.pop() || make();
    p.open = true; p.spec = s; p.age = 0; p.life = s.dur || 0; p.tickT = 0;
    p.box.className = 'jv' + (s.shake ? ' shake' : '') + (s.cls ? ' ' + s.cls : '');
    p.box.style.width = s.w ? s.w + 'px' : '';
    const t = s.title ?? 'JARVIS';
    p.title.textContent = t === 'JARVIS' ? '' : t;
    const icon = s.icon || 'warn';
    p.ic.className = 'ic ' + icon;
    p.ic.textContent = icon === 'error' ? '✕' : icon === 'info' ? 'i' : icon === 'warn' ? '!' : '';
    p.msg.textContent = s.msg || '';
    p.spin.classList.toggle('off', !s.spinner);
    p.pr = null; p.prog.classList.add('off');
    if (s.progress) {
      let { from = 0, to = 100, dur = 1 } = s.progress;
      if (from <= 1 && to <= 1) { from *= 100; to *= 100; }
      p.pr = { from, to, dur }; p.prT = 0; setProg(p, from); p.prog.classList.remove('off');
    }
    const labels = s.buttons || ['OK'];
    p.btns.textContent = ''; p.n = labels.length;
    for (let k = 0; k < labels.length; k++) {
      const b = button(p, k);
      b.textContent = labels[k]; b._d = 0; b._x = 0; b._y = 0; b.style.transform = '';
      p.btns.append(b);
    }
    if (p.n) focus(p, 0);
    // position: centre (stacked +18 px per open unanchored pop-up), [x%, y%], or over an actor's head
    p.actor = null; p.stack = false;
    let x = innerWidth / 2, y = innerHeight / 2;
    const at = s.at;
    if (Array.isArray(at)) { const k = at[0] <= 1 && at[1] <= 1 ? 1 : 0.01; x = at[0] * k * innerWidth; y = at[1] * k * innerHeight; }
    else if (at && at.actor) p.actor = at.actor;
    else if (at !== 'center') {
      let n = 0; for (let i = 0; i < live.length; i++) if (live[i].stack) n++;
      x += (n % 14) * 18; y += (n % 14) * 18; p.stack = true;
    }
    place(p, x, y);
    p.z = (s.z || 0) * 10000 + (++seq);
    p.w.style.zIndex = p.z;
    live.push(p);
    p.w.classList.remove('off'); // un-hiding restarts the CSS pop/shake animation
    if (p.actor) track(p);
    if (s.ding !== false) ui.sfx('ding');
    const tok = p.tok;
    const done = new Promise((r) => { p.res = r; });
    return { el: p.w, done, close: () => { if (p.tok === tok) close(p, -1); } };
  }

  popup.clear = () => { while (live.length) close(live[live.length - 1], -1); };
  popup.count = () => live.length;
  popup.update = (dt) => {
    const skip = ui.skipping();
    let top = null;
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      if (p.pr) { p.prT += dt; const k = p.pr.dur > 0 ? Math.min(1, p.prT / p.pr.dur) : 1; if (k < 1 || p.prT - dt < p.pr.dur) setProg(p, p.pr.from + (p.pr.to - p.pr.from) * k); }
      if (p.spec.spinner && (p.tickT += dt) >= 1) { p.tickT -= 1; ui.sfx('tick', { vol: 0.3 }); }
      if (p.life > 0 && p.age >= p.life) { close(p, -1); continue; }
      if (p.n && (skip || (TEST.auto && p.age >= 0.3))) { // autoplay presses the first button that doesn't run away
        let k = 0; while (k < p.n - 1 && p.spec.dodge && p.spec.dodge.includes(k)) k++;
        close(p, k); continue;
      }
      if (p.n && (!top || p.z > top.z)) top = p;
    }
    if (top && !say.busy() && input.pressed('yes')) { input.consume('yes'); close(top, top.focus); }
  };
  popup.render = () => { for (let i = 0; i < live.length; i++) if (live[i].actor) track(live[i]); };
  return popup;
})();

// ------------------------------------------------------------ 1987 HUD (top right)
const hud = (() => {
  const el = document.getElementById('hud'), fill = el.querySelector('.bat i'), pct = el.querySelector('.pct'), ns = el.querySelector('.ns');
  const bars = el.querySelectorAll('.bars i');
  const anims = [];
  function show() {
    const b = state.battery, s = state.bars;
    if (b == null && s == null) { el.classList.add('off'); return; }
    el.classList.remove('off');
    fill.style.transform = `scaleX(${b > 0 ? Math.max(0.07, b / 100) : 0})`;
    pct.textContent = (b ?? 0) + '%';
    el.classList.toggle('low', (b ?? 0) <= 5);
    for (let k = 0; k < 4; k++) bars[k].classList.toggle('on', k < (s || 0));
    ns.classList.toggle('off', s !== 0 || b == null);
    el.classList.toggle('nobat', b == null); // bars only (3.8): no battery, no "No Service"
  }
  return {
    show,
    set(v) {
      anims.length = 0;
      if (!v) { state.battery = null; state.bars = null; } else { if ('battery' in v) state.battery = v.battery; if ('bars' in v) state.bars = v.bars; }
      show();
    },
    animate(v, dur = 1) { // counts one step at a time
      const ps = [];
      for (const key of ['battery', 'bars']) {
        if (!(key in v)) continue;
        if (ui.skipping()) { state[key] = v[key]; continue; }
        const from = state[key] || 0, n = Math.abs(v[key] - from);
        if (!n) continue;
        ps.push(new Promise((res) => anims.push({ key, to: v[key], step: dur / n, t: 0, res })));
      }
      show();
      return Promise.all(ps);
    },
    update(dt) {
      for (let i = anims.length - 1; i >= 0; i--) {
        const a = anims[i];
        a.t += dt;
        while (a.t >= a.step && state[a.key] !== a.to) { a.t -= a.step; state[a.key] = (state[a.key] || 0) + Math.sign(a.to - (state[a.key] || 0)); show(); }
        if (state[a.key] === a.to) { anims.splice(i, 1); a.res(); }
      }
    },
  };
})();

// ------------------------------------------------------------ objective (top left)
const objective = (() => {
  const el = document.getElementById('obj');
  let text = null, items = null, hidden = false;
  function render() {
    el.textContent = '';
    if (text == null && !items) { el.classList.add('off'); return; }
    if (text != null) { const d = document.createElement('div'); d.className = 'line'; d.append(text); el.append(d); }
    if (items) for (const it of items) { const d = document.createElement('div'); d.className = 'it' + (it.done ? ' done' : ''); d.textContent = it.text; el.append(d); }
    el.classList.remove('off');
  }
  function objective(t) { text = t ?? null; items = null; render(); }
  objective.list = (arr) => { items = arr && arr.length ? arr : null; render(); };
  objective.update = () => {
    const h = !options.objective || (typeof cam !== 'undefined' && cam.cutscene === true);
    if (h !== hidden) { hidden = h; el.classList.toggle('hide', h); }
  };
  return objective;
})();

// ------------------------------------------------------------ portraits (baked at boot from a 3D bust; face texture / silhouette fallback)
const portraitURL = (() => {
  const urls = {}, cvs = {}, S = 128;
  const alias = { student: 'student_a', voice: null, operator: null, assistant: null };
  const blank = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  function bg(x) {
    const g = x.createLinearGradient(0, 0, 0, S); g.addColorStop(0, '#34437a'); g.addColorStop(1, '#1b2448');
    x.fillStyle = g; x.fillRect(0, 0, S, S);
  }
  function silhouette(id) {
    const c = blank(), x = c.getContext('2d');
    bg(x);
    x.fillStyle = '#5d6a99';
    x.beginPath(); x.arc(64, 54, 25, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.ellipse(64, 132, 48, 44, 0, Math.PI, 0); x.fill();
    if (id === 'operator' || id === 'voice') { // a phone line: little sound arcs
      x.strokeStyle = '#ffd21f'; x.lineWidth = 4; x.lineCap = 'round';
      for (let k = 1; k <= 2; k++) { x.beginPath(); x.arc(92, 40, 8 * k, -0.9, 0.9); x.stroke(); }
    }
    return c;
  }
  function fromFace(fc) {
    const c = blank(), x = c.getContext('2d');
    bg(x);
    const k = Math.max(S / fc.width, S / fc.height);
    x.drawImage(fc, (S - fc.width * k) / 2, (S - fc.height * k) / 2, fc.width * k, fc.height * k);
    return c;
  }
  function canvasFor(id) {
    if (cvs[id]) return cvs[id];
    const ch = CHARACTERS[id];
    if (ch && ch.voice && ch.voice.also) { // two speakers at once: split portrait
      const [a, b] = id.split('_'), c = blank(), x = c.getContext('2d');
      x.drawImage(canvasFor(a), S / 4, 0, S / 2, S, 0, 0, S / 2, S);
      x.drawImage(canvasFor(b), S / 4, 0, S / 2, S, S / 2, 0, S / 2, S);
      x.fillStyle = '#ffd21f'; x.fillRect(S / 2 - 1, 0, 2, S);
      return (cvs[id] = c);
    }
    const look = id in alias ? alias[id] : id;
    if (look && look !== id && cvs[look]) return (cvs[id] = cvs[look]);
    let fc = null;
    try {
      const a = look && typeof world !== 'undefined' && world.actor && world.actor(look);
      if (a && a.rig && a.rig.face) fc = a.rig.face.canvas;
      else if (look && LOOKS[look] && typeof buildCharacter === 'function') fc = buildCharacter(look).face.canvas;
    } catch (e) { fc = null; }
    return (cvs[id] = fc ? fromFace(fc) : silhouette(id));
  }
  function portraitURL(id) { return urls[id] || (urls[id] = canvasFor(id).toDataURL()); }
  portraitURL.bake = (id, canvas) => { cvs[id] = canvas; delete urls[id]; };
  return portraitURL;
})();

// ------------------------------------------------------------ menus: title, main, options, controls, scene select, extras, pause
const menus = (() => {
  const titleEl = document.getElementById('title'), root = document.getElementById('menu');
  const head = root.querySelector('.head'), body = root.querySelector('.body'), list = root.querySelector('.list'), foot = root.querySelector('.foot');
  const btns = [];
  let items = [], sel = 0, back = null, onTitle = false, typed = '', song = null, orbitT = 0;
  const M = { mode: null, paused: false };

  const CONTROLS = [
    ['Move', 'WASD or arrows', 'Left stick', 'Left virtual stick'],
    ['YES (confirm, examine, advance)', 'Enter, Space, left click', 'A', 'YES button'],
    ['NO (cancel, duck, fast-forward)', 'Escape, Backspace, right click', 'B', 'NO button'],
    ['Run', 'Shift', 'RB', 'Push the stick further'],
    ['Swap', 'Tab', 'Y', 'SWAP button'],
    ['Inventory', 'I', 'X', 'BAG button'],
    ['Pause', 'P', 'Start', 'Pause icon'],
  ];
  const VOL = { get: (k) => '■'.repeat(Math.round(options[k] * 10)) + '□'.repeat(10 - Math.round(options[k] * 10)),
    adj: (k, d) => { options[k] = Math.max(0, Math.min(1, Math.round(options[k] * 10 + d) / 10)); } };
  const cyc = (key, vals, names) => ({
    label: null, val: () => '‹ ' + names[Math.max(0, vals.indexOf(options[key]))] + ' ›',
    adj: (d) => { options[key] = vals[(vals.indexOf(options[key]) + d + vals.length) % vals.length]; applyOptions(); },
  });

  function applyOptions() {
    document.body.classList.toggle('large', options.textSize === 'large');
    saveOptions();
    emit('options', options);
  }
  function btn(k) {
    let b = btns[k];
    if (b) return b;
    b = btns[k] = document.createElement('button'); b._k = k;
    b.append(document.createElement('span'), document.createElement('em'));
    b.addEventListener('click', () => { if (M.mode === 'menu') { sel = b._k; paint(); act(); } });
    b.addEventListener('pointerenter', () => { if (M.mode === 'menu' && sel !== b._k) { sel = b._k; paint(); } });
    return b;
  }
  function show(h, its, bk, o = {}) {
    head.textContent = h || ''; items = its; back = bk || null;
    sel = Math.min(o.sel || 0, its.length - 1);
    body.textContent = '';
    if (o.body) body.append(o.body); else if (o.html) body.innerHTML = o.html;
    foot.textContent = o.foot ?? (bk ? 'YES — Select · NO — Back' : 'YES — Select');
    const low = o.low && !M.paused;
    root.className = low ? 'low' : 'dim';
    titleEl.classList.toggle('off', !(onTitle && low));
    list.textContent = '';
    for (let k = 0; k < its.length; k++) list.append(btn(k));
    paint();
    M.mode = 'menu';
  }
  function paint() {
    for (let k = 0; k < items.length; k++) {
      const it = items[k], b = btns[k];
      b.firstChild.textContent = it.label;
      b.lastChild.textContent = it.val ? it.val() : (it.sub || '');
      b.lastChild.style.display = it.val || it.sub ? '' : 'none';
      b.className = (k === sel ? 'sel' : '') + (it.dis ? ' dis' : '');
    }
    if (btns[sel] && items.length > 8) btns[sel].scrollIntoView({ block: 'nearest' });
  }
  function act() {
    const it = items[sel];
    if (!it) return;
    if (it.dis) { ui.sfx('clunk'); return; }
    if (it.act) { ui.sfx('pop', { vol: 0.5 }); it.act(); } else if (it.adj) { it.adj(1); paint(); }
  }
  const confirm = (q, yes, no) => show(q, [{ label: 'YES', act: yes }, { label: 'NO', act: no }], no);

  // ---------------------------------------------------------- screens
  function mainMenu() {
    const its = [];
    if (hasSave()) its.push({ label: 'Continue', act: cont });
    its.push({ label: 'New Game', act: () => (hasSave() ? confirm('Start a new game? Your saved game will be replaced.', newGame, mainMenu) : newGame()) });
    its.push({ label: 'Options', act: () => optionsMenu(mainMenu) });
    if (profile.completed) {
      its.push({ label: 'Chapter Select', act: () => sceneSelect(mainMenu) });
      its.push({ label: 'Extras', act: extras });
    }
    show('', its, null, { low: true });
  }
  function optionsMenu(to) {
    const its = [
      Object.assign(cyc('controls', ['modern', 'tank'], ['Modern', 'Tank']), { label: 'Controls' }),
      Object.assign(cyc('textSpeed', ['slow', 'normal', 'fast'], ['Slow', 'Normal', 'Fast']), { label: 'Text speed' }),
      Object.assign(cyc('textSize', ['normal', 'large'], ['Normal', 'Large']), { label: 'Text size' }),
      ...[['music', 'Music volume'], ['sfx', 'SFX volume'], ['voice', 'Voice volume']].map(([k, l]) => ({ label: l, val: () => VOL.get(k), adj: (d) => { VOL.adj(k, d); applyOptions(); } })),
      Object.assign(cyc('reduceFlashing', [false, true], ['Off', 'On']), { label: 'Reduce flashing' }),
      Object.assign(cyc('objective', [true, false], ['On', 'Off']), { label: 'Objective text' }),
      { label: 'Back', act: to },
    ];
    show('OPTIONS', its, to, { foot: '‹ › Change · NO — Back' });
  }
  function controlsMenu(to) {
    const rows = CONTROLS.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join('');
    show('CONTROLS', [{ label: 'Back', act: to }], to, { html: `<table><tr><th>ACTION</th><th>KEYBOARD AND MOUSE</th><th>GAMEPAD</th><th>TOUCH</th></tr>${rows}</table>` });
  }
  function sceneSelect(to) {
    const its = SCENE_ORDER.map((id) => ({ label: id, sub: (SCENES[id] && SCENES[id].title) || '', act: () => start(id, { select: true }) }));
    its.push({ label: 'Back', act: to });
    show('SCENE SELECT', its, to);
  }
  function saved() { return loadGame() || state; }
  function extras() {
    show('EXTRAS', [
      { label: song ? "Stop Pudding's song" : "Pudding's song", act: toggleSong },
      { label: "Luka's notebook", act: () => cardScreen('NAMES', 'list', { title: 'Names', paper: 'printout', items: NAMES.map((n) => ({ text: saved().names.includes(n) ? n : '— — —', done: saved().names.includes(n) })) }) },
      { label: 'The Bug List', act: () => cardScreen('THE ORIGINAL SPEC', 'list', { frame: true, skull: true, ticks: true,
        items: BUGS.filter((b) => saved().bugs.includes(b.id) || saved().bugs.includes(b.text)).map((b) => ({ text: b.text, done: true })).concat([{ text: DOOR_BUG, done: true }]) }) },
      { label: 'Credits', act: credits },
      { label: 'Back', act: mainMenu },
    ], mainMenu, { sel: head.textContent === 'EXTRAS' ? sel : 0 });
  }
  function toggleSong() {
    if (typeof AUDIO === 'undefined') return;
    if (song) { song.stop(); song = null; if (typeof music === 'function') music('title'); return extras(); }
    const s = saved();
    const lane = (on) => Array.from({ length: 16 }, (_, i) => on.includes(i));
    const pattern = s.pattern || [lane([0, 4, 8, 12]), lane([4, 12]), lane([0, 2, 4, 6, 8, 10, 12, 14]), lane([0, 2, 5, 7, 10, 13])];
    if (typeof music === 'function') music(null, { fade: 0.5 });
    song = AUDIO.song(pattern, { samples: s.samples, onEnd: () => { song = null; if (M.mode === 'menu' && head.textContent === 'EXTRAS') extras(); } });
    extras();
  }
  function cardScreen(h, kind, data) {
    const c = document.createElement('canvas');
    ui.paintCard(c, kind, data);
    show(h, [{ label: 'Back', act: extras }], extras, { body: c });
  }
  function credits() {
    show('CREDITS', [{ label: 'Back', act: extras }], extras, { html: `<div class="cr"><p><b>RUE</b>A comedy adventure. Systems crash. People pick up.</p>
      <p><b>STARRING</b>Luka, 2IC, Optus Redcliffe<br>Chase, casual, eight months in<br>Rue, Business Studies, Trinity College Dublin</p>
      <p><b>WITH</b>Des · Bernie · Declan · Prof. Hartigan · Margaret · Dazza · Luke · Jordan<br>Siobhán · Ronan · Fiachra · Mick · Nuala</p>
      <p><b>MUSIC</b>“Opt Us In (Dublin ’87)” by Pudding</p>
      <p>A work of affectionate parody. Not affiliated with or endorsed by Optus. Rue is a fictional portrayal. This is not how Optus got its name. JARVIS was not, as far as we know, built from a bug list. We can't prove it.</p></div>` });
  }
  function pauseMenu() {
    const its = [{ label: 'Resume', act: M.resume }];
    if (typeof inventory !== 'undefined') its.push({ label: 'Inventory', act: () => { M.resume(); inventory.open(); } });
    if (typeof flow !== 'undefined' && flow.cutscene) its.push({ label: 'Skip Scene', act: () => confirm('Skip?', () => { M.resume(); if (flow.skip) flow.skip(); else flow.skipping = true; }, pauseMenu) });
    its.push({ label: 'Options', act: () => optionsMenu(pauseMenu) });
    its.push({ label: 'Controls', act: () => controlsMenu(pauseMenu) });
    its.push({ label: 'Quit to Title', act: () => confirm('Quit to the title screen? This scene will restart from its beginning.', quit, pauseMenu) });
    show('PAUSED', its, M.resume);
  }

  // ---------------------------------------------------------- leaving the title
  function leave() {
    if (song) { song.stop(); song = null; }
    onTitle = false; M.mode = null;
    titleEl.classList.add('off'); root.classList.add('off');
    if (typeof music === 'function') music(null, { fade: 0.8 });
  }
  function start(id, o) { leave(); state = newState(); flow.start(id, o); }
  function newGame() { start('1.1'); }
  function cont() { const s = loadGame(); if (!s) return; leave(); state = s; flow.start(s.scene); }
  function quit() {
    M.resume();
    if (typeof flow !== 'undefined' && flow.stop) flow.stop();
    M.title();
  }
  function orbit() {
    try { cam.shot({ shot: 'MID', on: 'brick_phone', angle: 'high', move: 'orbit', from: 0, to: 360, dur: 240 }); }
    catch (e) { try { cam.override('set', { name: 'title_orbit' }); } catch (e2) { /* no camera yet */ } }
  }

  M.init = () => {
    on('key', (code) => { // J-A-R-V-I-S on the title opens the scene select
      if (!onTitle || M.mode === 'wait' || !code.startsWith('Key')) return;
      typed = (typed + code[3]).slice(-6);
      if (typed === 'JARVIS') { typed = ''; titleEl.classList.add('withmenu'); sceneSelect(mainMenu); }
    });
  };
  M.title = async () => {
    M.paused = false; clock.paused = false; clock.scale = 1;
    ui.reset();
    if (!profile.seenPrologue) { profile.seenPrologue = true; saveOptions(); }
    if (TEST.auto) { // autoplay never stops at the title: P runs into 1.1; anything else means we're done
      if (!RUE_TEST.done && TEST.stop !== 'P' && flow.sceneId === 'P') { state = newState(); flow.start('1.1'); }
      else RUE_TEST.done = true;
      return;
    }
    M.mode = 'wait'; onTitle = true; typed = '';
    root.classList.add('off');
    await ui.fade(1, 0.4);
    try {
      if (world.setId !== 'office') await world.load('office', { env: 'dark' }); else world.env('dark');
      for (const id of (world.actors instanceof Map ? [...world.actors.keys()] : Object.keys(world.actors || {}))) world.despawn(id);
      if (typeof player !== 'undefined') player.enabled = false;
      orbit(); orbitT = 0;
    } catch (e) { console.warn('RUE: title scene', e); }
    if (typeof music === 'function') music('title');
    titleEl.classList.remove('off', 'withmenu');
    M.mode = 'press';
    ui.fade(0, 1.2);
  };
  M.pause = () => { M.paused = true; clock.paused = true; pauseMenu(); };
  M.resume = () => { M.paused = false; clock.paused = false; M.mode = null; root.classList.add('off'); };
  M.update = () => {
    if (onTitle && (orbitT += CONFIG.step) > 240) { orbitT = 0; orbit(); }
    if (M.mode === null) {
      if (input.pressed('pause') && typeof flow !== 'undefined' && flow.sceneId) { input.consume('pause'); M.pause(); }
      return;
    }
    if (M.mode === 'press') {
      if (input.pressed('yes')) { input.consume('yes'); ui.sfx('chime_ready'); titleEl.classList.add('withmenu'); mainMenu(); }
      return;
    }
    if (M.mode !== 'menu') return;
    const n = items.length;
    if (input.pressed('up')) { sel = (sel - 1 + n) % n; paint(); }
    if (input.pressed('down')) { sel = (sel + 1) % n; paint(); }
    const it = items[sel];
    if (it && it.adj && (input.pressed('left') || input.pressed('right'))) { it.adj(input.pressed('left') ? -1 : 1); paint(); }
    if (input.pressed('yes')) act();
    else if ((input.pressed('no') || (M.paused && input.pressed('pause'))) && back) back();
    for (let i = 0; i < M.keys.length; i++) input.consume(M.keys[i]);
  };
  M.keys = ['yes', 'no', 'up', 'down', 'left', 'right', 'pause', 'inventory', 'swap'];
  return M;
})();

// ------------------------------------------------------------ CARDS: readable INSERT close-ups
// Each painter draws just the object on a transparent canvas (ui.card adds nothing else). `.size` = native px.
Object.assign(CARDS, (() => {
  const HAND = '"Segoe Print", "Bradley Hand", "Marker Felt", "Chalkboard SE", "Comic Sans MS", "Comic Neue", cursive';
  const SANS = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
  const SYS = 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const MONO = '"Courier New", ui-monospace, Menlo, Consolas, monospace';
  const SERIF = 'Georgia, "Times New Roman", serif';
  const PI2 = Math.PI * 2, BIRO = '#1d2f8f';
  const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  let seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const seedOf = (s) => { seed = 7; for (const c of String(s)) seed = (seed * 31 + c.charCodeAt(0)) % 2147483647; seed = seed || 1; };
  const rr = (cx, x, y, w, h, r) => { cx.beginPath(); cx.roundRect(x, y, w, h, r); };
  const shadow = (cx, b = 24, oy = 10, a = 0.35) => { cx.shadowColor = `rgba(0,0,0,${a})`; cx.shadowBlur = b; cx.shadowOffsetY = oy; };
  const noShadow = (cx) => { cx.shadowColor = 'transparent'; cx.shadowBlur = 0; cx.shadowOffsetY = 0; };
  const hm = (t) => { const m = /(\d{1,2}):(\d{2})/.exec(String(t || '12:00')); return m ? [+m[1], +m[2]] : [12, 0]; };
  const tilt = (cx, w, h, a) => { cx.translate(w / 2, h / 2); cx.rotate(a); cx.translate(-w / 2, -h / 2); };
  function wrap(cx, text, maxW) {
    const out = [];
    for (const para of String(text).split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const t = line ? line + ' ' + word : word;
        if (line && cx.measureText(t).width > maxW) { out.push(line); line = word; } else line = t;
      }
      out.push(line);
    }
    return out;
  }
  function fit(cx, text, font, maxW, maxH, size, lh = 1.2) { // biggest size <= size that wraps into the box
    let lines;
    for (;;) {
      cx.font = font(size); lines = wrap(cx, text, maxW);
      let wide = false; for (const l of lines) if (cx.measureText(l).width > maxW) wide = true;
      if ((!wide && lines.length * size * lh <= maxH) || size < 10) return { size, lines };
      size *= 0.92;
    }
  }
  function hand(cx, text, x, y, size, color, o = {}) { // handwriting: each letter wobbles a little
    cx.save();
    cx.font = `${o.bold ? 'bold ' : ''}${size}px ${HAND}`; cx.fillStyle = color; cx.strokeStyle = color;
    cx.lineJoin = 'round'; cx.lineWidth = size * (o.felt ? 0.07 : 0.025); cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
    const w = cx.measureText(text).width;
    let px = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    for (const ch of String(text)) {
      const cw = cx.measureText(ch).width;
      cx.save();
      cx.translate(px + cw / 2, y + (rnd() - 0.5) * size * 0.08);
      cx.rotate((rnd() - 0.5) * 0.1 + (o.slant || 0));
      if (o.felt || o.pen) cx.strokeText(ch, -cw / 2, 0);
      cx.fillText(ch, -cw / 2, 0);
      cx.restore();
      px += cw;
    }
    cx.restore();
    return w;
  }
  function hands(cx, x, y, r, hh, mm, sec, col) {
    const line = (a, len, wd, c) => {
      cx.strokeStyle = c; cx.lineWidth = wd; cx.lineCap = 'round';
      cx.beginPath(); cx.moveTo(x - Math.sin(a) * len * 0.16, y + Math.cos(a) * len * 0.16); cx.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len); cx.stroke();
    };
    line(((hh % 12) + mm / 60) / 12 * PI2, r * 0.52, r * 0.075, col);
    line(mm / 60 * PI2, r * 0.8, r * 0.05, col);
    if (sec != null) line(sec / 60 * PI2, r * 0.84, r * 0.018, '#d8342b');
    cx.fillStyle = sec != null ? '#d8342b' : col; cx.beginPath(); cx.arc(x, y, r * 0.055, 0, PI2); cx.fill();
  }
  function skull(cx, x, y, s, col) { // the doodle next to Recontracts
    cx.save(); cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = Math.max(1.5, s * 0.08); cx.lineCap = 'round'; cx.lineJoin = 'round';
    cx.beginPath(); cx.arc(x, y, s * 0.42, Math.PI * 0.8, Math.PI * 2.2); cx.lineTo(x + s * 0.26, y + s * 0.52); cx.lineTo(x - s * 0.26, y + s * 0.52); cx.closePath(); cx.stroke();
    for (const e of [-1, 1]) { cx.beginPath(); cx.arc(x + e * s * 0.16, y + s * 0.04, s * 0.1, 0, PI2); cx.fill(); }
    cx.beginPath(); for (let i = -1; i <= 1; i++) { cx.moveTo(x + i * s * 0.1, y + s * 0.34); cx.lineTo(x + i * s * 0.1, y + s * 0.52); } cx.stroke();
    cx.restore();
  }
  function brass(cx, x, y, w, h) {
    const g = cx.createLinearGradient(x, y, x + w * 0.35, y + h * 1.4);
    g.addColorStop(0, '#8a6424'); g.addColorStop(0.3, '#f1d27c'); g.addColorStop(0.55, '#b98e3c'); g.addColorStop(0.8, '#f3db93'); g.addColorStop(1, '#a57b30');
    return g;
  }
  function engrave(cx, text, x, y, font) {
    cx.font = font; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillStyle = 'rgba(255,244,196,.85)'; cx.fillText(text, x + 1.5, y + 2);
    cx.fillStyle = '#3f2c0c'; cx.fillText(text, x, y);
  }
  function screw(cx, x, y, r) {
    cx.fillStyle = '#8a6a2c'; cx.beginPath(); cx.arc(x, y, r, 0, PI2); cx.fill();
    cx.strokeStyle = '#4a3610'; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x - r * 0.7, y - r * 0.3); cx.lineTo(x + r * 0.7, y + r * 0.3); cx.stroke();
  }

  // ---------------------------------------------------------- painters
  function postit(cx, w, h, d) {
    seedOf(d.text);
    const s = Math.min(w, h) * 0.8, c = s * 0.13, x = -s / 2, y = -s / 2;
    cx.translate(w / 2, h / 2); cx.rotate(-0.035);
    shadow(cx, 30, 14);
    cx.fillStyle = '#ffe56a';
    cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x + s, y); cx.lineTo(x + s, y + s - c); cx.lineTo(x + s - c, y + s); cx.lineTo(x, y + s); cx.closePath(); cx.fill();
    noShadow(cx);
    let g = cx.createLinearGradient(0, y, 0, y + s * 0.22); g.addColorStop(0, 'rgba(200,160,20,.28)'); g.addColorStop(1, 'rgba(200,160,20,0)');
    cx.fillStyle = g; cx.fillRect(x, y, s, s * 0.22);
    g = cx.createLinearGradient(x + s - c, y + s - c, x + s, y + s); g.addColorStop(0, '#fff4b8'); g.addColorStop(1, '#d6b536');
    cx.fillStyle = g; cx.beginPath(); cx.moveTo(x + s, y + s - c); cx.lineTo(x + s - c, y + s); cx.lineTo(x + s - c * 1.08, y + s - c * 1.08); cx.closePath(); cx.fill();
    const f = fit(cx, d.text || '', (z) => `${z}px ${HAND}`, s * 0.8, s * 0.74, s * 0.17, 1.2);
    const top = -(f.lines.length - 1) * f.size * 1.2 / 2 + f.size * 0.3;
    f.lines.forEach((l, i) => hand(cx, l, 0, top + i * f.size * 1.2, f.size, '#1d2447', { align: 'center', felt: true }));
  }
  postit.size = [640, 640];

  function clock(cx, w, h, d) {
    const [hh, mm] = hm(d.time), r = w * 0.36, x = w / 2, y = h * 0.42;
    shadow(cx, 30, 12);
    cx.fillStyle = '#23252b'; cx.beginPath(); cx.arc(x, y, r, 0, PI2); cx.fill();
    noShadow(cx);
    const g = cx.createRadialGradient(x - r * 0.2, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e9e2d0');
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 0.9, 0, PI2); cx.fill();
    cx.fillStyle = '#23252b';
    for (let i = 0; i < 60; i++) {
      const big = i % 5 === 0, l = r * (big ? 0.11 : 0.045), wd = r * (big ? 0.035 : 0.012);
      cx.save(); cx.translate(x, y); cx.rotate(i / 60 * PI2); cx.fillRect(-wd / 2, -r * 0.86, wd, l); cx.restore();
    }
    cx.font = `bold ${r * 0.16}px ${SANS}`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    for (let i = 1; i <= 12; i++) { const a = i / 12 * PI2; cx.fillText(i, x + Math.sin(a) * r * 0.62, y - Math.cos(a) * r * 0.62); }
    hands(cx, x, y, r, hh, mm, d.sec ?? 7, '#1c1e24');
    const t = String(d.time || ''), ty = y + r + h * 0.1;
    cx.font = `bold ${h * 0.075}px ${MONO}`;
    const tw = cx.measureText(t).width + h * 0.07;
    shadow(cx, 12, 4);
    cx.fillStyle = '#141d3a'; rr(cx, x - tw / 2, ty - h * 0.055, tw, h * 0.11, h * 0.03); cx.fill(); noShadow(cx);
    cx.fillStyle = '#ffd21f'; cx.fillText(t, x, ty + 3);
  }
  clock.size = [640, 720];

  function phone(cx, w, h, d) {
    const tone = d.tone || 'light', lines = d.lines || [];
    const pw = w * 0.9, ph = h * 0.96, px = (w - pw) / 2, py = (h - ph) / 2, R = pw * 0.13;
    shadow(cx, 30, 12);
    cx.fillStyle = '#15171c'; rr(cx, px, py, pw, ph, R); cx.fill(); noShadow(cx);
    cx.strokeStyle = '#4a505c'; cx.lineWidth = 3; rr(cx, px + 1.5, py + 1.5, pw - 3, ph - 3, R); cx.stroke();
    const m = pw * 0.045, sx = px + m, sy = py + m, sw = pw - 2 * m, sh = ph - 2 * m;
    const dark = tone !== 'light', fg = dark ? '#eef2fa' : '#1b2130';
    cx.save(); rr(cx, sx, sy, sw, sh, R - m); cx.clip();
    cx.fillStyle = tone === 'dead' ? '#040506' : dark ? '#0f1320' : '#f3f5f9'; cx.fillRect(sx, sy, sw, sh);
    if (tone === 'dead') { // black glass reflecting two faces
      for (const [fx, fy] of [[0.34, 0.4], [0.68, 0.45]]) {
        const g = cx.createRadialGradient(sx + sw * fx, sy + sh * fy, 4, sx + sw * fx, sy + sh * fy, sw * 0.2);
        g.addColorStop(0, 'rgba(200,210,230,.13)'); g.addColorStop(1, 'rgba(200,210,230,0)'); cx.fillStyle = g; cx.fillRect(sx, sy, sw, sh);
        cx.fillStyle = 'rgba(200,210,230,.05)'; cx.beginPath(); cx.ellipse(sx + sw * fx, sy + sh * (fy + 0.26), sw * 0.22, sh * 0.1, 0, Math.PI, 0); cx.fill();
      }
    } else {
      const bh = sh * 0.06, by = sy + bh * 0.62, noSvc = d.status === 'noservice' || tone === 'noservice';
      cx.fillStyle = fg; cx.font = `600 ${bh * (noSvc ? 0.38 : 0.5)}px ${SYS}`; cx.textBaseline = 'middle'; cx.textAlign = 'left';
      cx.fillText(noSvc ? 'No Service' : d.time || '11:41', sx + sw * 0.08, by);
      let rx = sx + sw * 0.92;
      const bat = d.battery ?? 64;
      cx.strokeStyle = fg; cx.lineWidth = 2; rr(cx, rx - 34, by - 8, 30, 16, 4); cx.stroke();
      cx.fillStyle = bat <= 10 ? '#ff4a3d' : fg; cx.fillRect(rx - 32, by - 6, 26 * Math.max(0.08, bat / 100), 12);
      cx.textAlign = 'right';
      if (d.battery != null) { cx.fillStyle = fg; cx.fillText(d.battery + '%', rx - 42, by); rx -= 104; } else rx -= 48;
      if (!noSvc) for (let i = 0; i < 4; i++) { cx.fillStyle = fg; cx.fillRect(rx - 34 + i * 9, by + 7 - (i + 1) * 4, 6, (i + 1) * 4); }
      cx.fillStyle = '#000'; rr(cx, sx + sw / 2 - sw * 0.14, sy + bh * 0.28, sw * 0.28, bh * 0.52, bh * 0.26); cx.fill();
      let y = sy + bh * 2.2;
      cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
      if (d.title) {
        cx.fillStyle = dark ? '#1b2340' : '#e1e6f0'; cx.fillRect(sx, sy + bh * 1.2, sw, sh * 0.1);
        cx.fillStyle = fg; cx.font = `bold ${sh * 0.04}px ${SYS}`;
        cx.fillText(d.title, sx + sw * 0.07, sy + bh * 1.2 + sh * 0.064, sw * 0.86);
        y = sy + bh * 1.2 + sh * 0.1 + sh * 0.06;
      }
      if (lines.length && lines.length <= 2 && lines.every((l) => String(l).length <= 14)) {
        cx.textAlign = 'center'; cx.font = `bold ${sh * 0.075}px ${SYS}`; cx.fillStyle = fg;
        lines.forEach((l, i) => cx.fillText(l, sx + sw / 2, sy + sh * 0.52 + (i - (lines.length - 1) / 2) * sh * 0.1));
      } else {
        const z = sh * 0.043;
        cx.font = `${z}px ${SYS}`; cx.fillStyle = fg;
        for (const l of lines) { for (const s of wrap(cx, l, sw * 0.84)) { cx.fillText(s, sx + sw * 0.08, y); y += z * 1.35; } y += z * 0.6; }
      }
      cx.globalAlpha = 0.5; cx.fillStyle = fg; rr(cx, sx + sw * 0.35, sy + sh - bh * 0.45, sw * 0.3, 5, 3); cx.fill(); cx.globalAlpha = 1;
    }
    const g = cx.createLinearGradient(sx, sy, sx + sw, sy + sh); g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(0.45, 'rgba(255,255,255,0)');
    cx.fillStyle = g; cx.fillRect(sx, sy, sw, sh);
    cx.restore();
  }
  phone.size = [420, 800];

  function brick(cx, w, h, d) {
    const bw = w * 0.66, bx = (w - bw) / 2, by = h * 0.15, bh = h * 0.97 - by;
    cx.fillStyle = '#2b2d31'; rr(cx, bx + bw * 0.74, h * 0.03, bw * 0.1, by, 8); cx.fill();
    cx.fillStyle = '#3a3d42'; rr(cx, bx + bw * 0.715, h * 0.015, bw * 0.15, h * 0.035, 10); cx.fill();
    shadow(cx, 30, 12);
    const g = cx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#5d6166'); g.addColorStop(0.5, '#7d8288'); g.addColorStop(1, '#4b4f54');
    cx.fillStyle = g; rr(cx, bx, by, bw, bh, 30); cx.fill(); noShadow(cx);
    cx.strokeStyle = 'rgba(255,255,255,.18)'; cx.lineWidth = 3; rr(cx, bx + 5, by + 5, bw - 10, bh - 10, 26); cx.stroke();
    cx.fillStyle = '#2a2c30';
    for (let i = 0; i < 4; i++) { rr(cx, bx + bw * 0.3, by + bh * 0.035 + i * 11, bw * 0.4, 5, 3); cx.fill(); }
    const lx = bx + bw * 0.12, ly = by + bh * 0.13, lw = bw * 0.76, lh = bh * 0.21, on = !!d.lit;
    cx.fillStyle = '#1d1f22'; rr(cx, lx, ly, lw, lh, 10); cx.fill();
    if (on) { cx.shadowColor = 'rgba(170,230,90,.8)'; cx.shadowBlur = 26; }
    cx.fillStyle = on ? '#b8e07a' : '#8a927f'; rr(cx, lx + 12, ly + 12, lw - 24, lh - 24, 4); cx.fill(); noShadow(cx);
    cx.fillStyle = 'rgba(0,0,0,.07)'; cx.fillRect(lx + 12, ly + 12, lw - 24, (lh - 24) * 0.22);
    if (on) { cx.fillStyle = '#2a3a1a'; for (let i = 0; i < 4; i++) cx.fillRect(lx + 26 + i * 9, ly + lh - 28 - i * 4, 6, 6 + i * 4); }
    if (d.text) { cx.fillStyle = '#1e2a12'; cx.font = `bold ${lh * 0.28}px ${MONO}`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(d.text, lx + lw / 2, ly + lh / 2, lw - 44); }
    const keys = ['SND', 'CLR', 'END', '1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    const kw = bw * 0.2, kh = bh * 0.068, kx = bx + bw * 0.15, ky = by + bh * 0.42;
    cx.font = `bold ${kh * 0.45}px ${SANS}`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    keys.forEach((k, i) => {
      const x = kx + (i % 3) * kw * 1.25, y = ky + Math.floor(i / 3) * kh * 1.45;
      cx.fillStyle = i === 0 ? '#3f7d4a' : i === 2 ? '#9c3a33' : '#2e3034'; rr(cx, x, y, kw, kh, kh * 0.45); cx.fill();
      cx.fillStyle = '#e8e8e8'; cx.fillText(k, x + kw / 2, y + kh / 2 + 1);
    });
  }
  brick.size = [520, 760];

  function screen(cx, w, h, d) {
    const st = d.style || 'jarvis', lines = d.lines || [], beige = st === 'green';
    shadow(cx, 30, 12);
    cx.fillStyle = beige ? '#cfc6ae' : '#1c1e23'; rr(cx, w * 0.03, h * 0.03, w * 0.94, h * 0.94, 26); cx.fill(); noShadow(cx);
    const sx = w * 0.07, sy = h * 0.08, sw = w * 0.86, sh = h * 0.8;
    cx.save(); rr(cx, sx, sy, sw, sh, beige ? 30 : 6); cx.clip();
    cx.fillStyle = st === 'green' ? '#04120a' : st === 'crash' ? '#1f44a8' : '#eef1f6'; cx.fillRect(sx, sy, sw, sh);
    let y = sy + sh * 0.14, z = sh * 0.062, font = SYS, col = '#28303f';
    const x = sx + sw * 0.06;
    if (st === 'jarvis') {
      cx.fillStyle = '#2f6fd6'; cx.fillRect(sx, sy, sw, sh * 0.12);
      cx.fillStyle = '#fff'; cx.font = `italic 800 ${sh * 0.055}px ${SYS}`; cx.textBaseline = 'middle'; cx.fillText('JARVIS', x, sy + sh * 0.062);
      cx.globalAlpha = 0.8; cx.font = `${sh * 0.034}px ${SYS}`; cx.fillText('Sales & Service  ·  Redcliffe', x + sh * 0.27, sy + sh * 0.064); cx.globalAlpha = 1;
      y = sy + sh * 0.27; z = sh * 0.07;
    } else if (st === 'green') { font = MONO; col = '#3dff72'; cx.shadowColor = 'rgba(60,255,110,.5)'; cx.shadowBlur = 10; }
    else col = '#ffffff';
    cx.textBaseline = 'alphabetic'; cx.textAlign = 'left';
    lines.forEach((l, i) => {
      const first = i === 0 && st === 'crash', s = first ? z * 1.4 : z;
      cx.font = `${first ? 'bold ' : ''}${s}px ${font}`;
      for (const t of wrap(cx, l, sw * 0.88)) {
        if (d.hl && t.includes(d.hl)) {
          const a = cx.measureText(t.slice(0, t.indexOf(d.hl))).width, b = cx.measureText(d.hl).width;
          cx.save(); noShadow(cx); cx.fillStyle = 'rgba(255,210,31,.55)'; cx.fillRect(x + a - 5, y - s * 0.86, b + 10, s * 1.12); cx.restore();
        }
        cx.fillStyle = col; cx.fillText(t, x, y); y += s * 1.35;
      }
      y += s * 0.35;
    });
    if (st === 'green') { cx.fillStyle = col; cx.fillRect(x, y - z * 1.25, z * 0.55, z); }
    cx.restore();
    const g = cx.createLinearGradient(sx, sy, sx + sw * 0.6, sy + sh); g.addColorStop(0, 'rgba(255,255,255,.09)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
    cx.fillStyle = g; rr(cx, sx, sy, sw, sh, beige ? 30 : 6); cx.fill();
    if (beige) { cx.fillStyle = '#3dff72'; cx.fillRect(w * 0.86, h * 0.925, 12, 6); }
  }
  screen.size = [960, 660];

  function newspaper(cx, w, h, d) {
    seedOf(d.headline || d.masthead);
    tilt(cx, w, h, -0.02);
    const x = w * 0.05, y = h * 0.05, pw = w * 0.9, ph = h * 0.9, mid = x + pw / 2, ink = '#22201c';
    shadow(cx, 26, 10);
    const g = cx.createLinearGradient(x, y, x + pw, y + ph); g.addColorStop(0, '#f1ebdb'); g.addColorStop(1, '#e0d6bd');
    cx.fillStyle = g; cx.fillRect(x, y, pw, ph); noShadow(cx);
    cx.fillStyle = ink; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
    cx.font = `bold ${ph * 0.12}px ${SERIF}`;
    cx.fillText(d.masthead || 'The Dublin Evening Post', mid, y + ph * 0.16, pw * 0.9);
    cx.fillRect(x + pw * 0.04, y + ph * 0.2, pw * 0.92, 3); cx.fillRect(x + pw * 0.04, y + ph * 0.2 + 7, pw * 0.92, 1.5);
    cx.font = `italic ${ph * 0.036}px ${SERIF}`;
    cx.textAlign = 'left'; cx.fillText('No. 31,412', x + pw * 0.05, y + ph * 0.262);
    cx.textAlign = 'center'; cx.fillText(d.date || '', mid, y + ph * 0.262);
    cx.textAlign = 'right'; cx.fillText('Price 45p', x + pw * 0.95, y + ph * 0.262);
    cx.fillRect(x + pw * 0.04, y + ph * 0.285, pw * 0.92, 1.5);
    cx.textAlign = 'left';
    const f = fit(cx, d.headline || '', (z) => `bold ${z}px ${SERIF}`, pw * 0.9, ph * 0.22, ph * 0.1, 1.08);
    f.lines.forEach((l, i) => cx.fillText(l, x + pw * 0.05, y + ph * 0.37 + i * f.size * 1.08));
    const top = y + ph * 0.37 + (f.lines.length - 1) * f.size * 1.08 + ph * 0.05, bot = y + ph * 0.94;
    const px = x + pw * 0.05, pwid = pw * 0.36;
    cx.fillStyle = '#aaa393'; cx.fillRect(px, top, pwid, bot - top);
    cx.fillStyle = 'rgba(40,36,30,.3)';
    for (let i = 0; i < 90; i++) { cx.beginPath(); cx.arc(px + rnd() * pwid, top + rnd() * (bot - top), 2 + rnd() * 5, 0, PI2); cx.fill(); }
    cx.fillStyle = 'rgba(40,36,30,.5)';
    for (let c = 0; c < 3; c++) {
      const x0 = px + pwid + pw * 0.03 + c * pw * 0.18;
      for (let ly = top + 4; ly < bot; ly += 13) cx.fillRect(x0, ly, pw * (0.15 - (rnd() < 0.15 ? rnd() * 0.08 : 0)), 5);
    }
    cx.strokeStyle = 'rgba(120,80,30,.2)'; cx.lineWidth = 8; cx.beginPath(); cx.arc(x + pw * 0.86, y + ph * 0.8, ph * 0.1, 0.3, 5.9); cx.stroke();
  }
  newspaper.size = [900, 640];

  function poster(cx, w, h, d) {
    const lines = d.lines || [];
    tilt(cx, w, h, 0.012);
    const x = w * 0.06, y = h * 0.04, pw = w * 0.88, ph = h * 0.92;
    shadow(cx, 22, 8); cx.fillStyle = '#f5eedb'; cx.fillRect(x, y, pw, ph); noShadow(cx);
    cx.strokeStyle = '#7a1f2b'; cx.lineWidth = 3; cx.strokeRect(x + 16, y + 16, pw - 32, ph - 32);
    for (const px of [x + 30, x + pw - 30]) {
      cx.fillStyle = '#c0282d'; cx.beginPath(); cx.arc(px, y + 28, 11, 0, PI2); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,.55)'; cx.beginPath(); cx.arc(px - 3, y + 24, 4, 0, PI2); cx.fill();
    }
    cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
    let yy = y + ph * 0.07;
    if (lines[0]) {
      const f = fit(cx, String(lines[0]).toUpperCase(), (z) => `bold ${z}px ${SERIF}`, pw * 0.78, ph * 0.24, 54, 1.1);
      cx.fillStyle = '#7a1f2b';
      for (const l of f.lines) { yy += f.size * 1.1; cx.fillText(l, w / 2, yy); }
      yy += 18; cx.fillRect(w / 2 - 60, yy, 120, 3); yy += 14;
    }
    const rest = lines.slice(1);
    const z0 = Math.min(31, (y + ph * 0.9 - yy) / Math.max(1, rest.length * 3.3));
    for (const l of rest) {
      const star = String(l).startsWith('*'), t = star ? l.slice(1).trim() : l, z = star ? z0 * 1.15 : z0;
      cx.font = `${star ? 'bold ' : ''}${z}px ${SERIF}`;
      const ws = wrap(cx, t, pw * 0.78);
      if (star) { cx.fillStyle = 'rgba(255,210,31,.5)'; cx.fillRect(x + pw * 0.07, yy + z * 0.35, pw * 0.86, ws.length * z * 1.3 + z * 0.3); }
      cx.fillStyle = '#26221c';
      for (const s of ws) { yy += z * 1.3; cx.fillText(s, w / 2, yy); }
      yy += z * 0.8;
    }
  }
  poster.size = [600, 800];

  function badge(cx, w, h, d) {
    const back = d.back != null && d.back !== false, old = !!d.old;
    seedOf(String(d.name) + d.back);
    const cw = w * 0.62, ch = h * 0.6, x = (w - cw) / 2, y = h * 0.34;
    cx.fillStyle = old ? '#86a9bd' : '#3fb6e8';
    cx.beginPath(); cx.moveTo(w / 2 - 74, 0); cx.lineTo(w / 2 - 12, y - 46); cx.lineTo(w / 2 + 12, y - 46); cx.lineTo(w / 2 + 74, 0); cx.closePath(); cx.fill();
    cx.fillStyle = 'rgba(0,0,0,.12)'; cx.beginPath(); cx.moveTo(w / 2 - 2, 0); cx.lineTo(w / 2, y - 46); cx.lineTo(w / 2 + 2, 0); cx.fill();
    const g = cx.createLinearGradient(w / 2 - 20, 0, w / 2 + 20, 0); g.addColorStop(0, '#8d949c'); g.addColorStop(0.5, '#eef1f4'); g.addColorStop(1, '#7c838b');
    cx.fillStyle = g; rr(cx, w / 2 - 18, y - 56, 36, 42, 7); cx.fill(); rr(cx, w / 2 - 6, y - 18, 12, 34, 3); cx.fill();
    shadow(cx, 24, 10);
    cx.fillStyle = old ? '#efe7d2' : '#fdfdfb'; rr(cx, x, y, cw, ch, 18); cx.fill(); noShadow(cx);
    cx.fillStyle = '#2a2d33'; rr(cx, w / 2 - 34, y + 14, 68, 12, 6); cx.fill();
    cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
    if (!back) {
      cx.fillStyle = '#15161a'; cx.fillRect(x, y + 38, cw, ch * 0.22);
      hand(cx, 'Yes', x + cw * 0.08, y + 38 + ch * 0.165, ch * 0.16, '#ffd21f', { felt: true, bold: true });
      const f = fit(cx, String(d.name || '').toUpperCase(), (z) => `bold ${z}px ${SANS}`, cw * 0.84, ch * 0.34, ch * 0.3, 1);
      cx.fillStyle = '#16171b'; cx.font = `bold ${f.size}px ${SANS}`; cx.fillText(f.lines[0], w / 2, y + ch * 0.78);
    } else {
      cx.fillStyle = '#a0a6ae'; cx.font = `${ch * 0.05}px ${SYS}`;
      cx.fillText('If found, please return to your nearest store.', w / 2, y + ch * 0.93, cw * 0.9);
      hand(cx, String(d.back), w / 2 - ch * 0.04, y + ch * 0.7, ch * 0.34, '#2340b0', { align: 'center', pen: true, slant: -0.06 });
    }
  }
  badge.size = [640, 520];

  function calendar(cx, w, h, d) {
    const m = /([A-Za-z]+)\s*(\d{4})/.exec(d.month || 'October 2026') || [0, 'October', '2026'];
    const mi = Math.max(0, MONTHS.findIndex((n) => n.startsWith(m[1].toUpperCase().slice(0, 3)))), yr = +m[2];
    seedOf(String(d.month) + d.circle);
    const x = w * 0.06, y = h * 0.04, pw = w * 0.88, ph = h * 0.93;
    shadow(cx, 24, 10); cx.fillStyle = '#fbfaf6'; cx.fillRect(x, y, pw, ph); noShadow(cx);
    const px = x + pw * 0.05, py = y + ph * 0.05, pwid = pw * 0.9, phh = ph * 0.3;
    cx.save(); cx.beginPath(); cx.rect(px, py, pwid, phh); cx.clip();
    if (yr < 2000) { // this month's picture is a donkey
      let g = cx.createLinearGradient(0, py, 0, py + phh); g.addColorStop(0, '#a9c4dc'); g.addColorStop(1, '#e3ecf2'); cx.fillStyle = g; cx.fillRect(px, py, pwid, phh);
      cx.fillStyle = '#7fa35a'; cx.beginPath(); cx.ellipse(px + pwid * 0.3, py + phh * 1.1, pwid * 0.6, phh * 0.55, 0, 0, PI2); cx.fill();
      cx.fillStyle = '#6a904a'; cx.beginPath(); cx.ellipse(px + pwid * 0.85, py + phh * 1.15, pwid * 0.5, phh * 0.5, 0, 0, PI2); cx.fill();
      const dx = px + pwid * 0.5, dy = py + phh * 0.62, s = phh * 0.28, col = '#8a7d70';
      cx.fillStyle = col;
      for (const lx of [-0.8, -0.45, 0.45, 0.8]) cx.fillRect(dx + lx * s - 4, dy, 8, s * 0.95);
      cx.beginPath(); cx.ellipse(dx, dy, s * 1.05, s * 0.55, 0, 0, PI2); cx.fill();
      cx.beginPath(); cx.moveTo(dx + s * 0.8, dy - s * 0.2); cx.lineTo(dx + s * 1.2, dy - s * 0.9); cx.lineTo(dx + s * 1.45, dy - s * 0.7); cx.lineTo(dx + s * 1.1, dy); cx.fill();
      cx.beginPath(); cx.ellipse(dx + s * 1.45, dy - s * 0.72, s * 0.34, s * 0.22, 0.5, 0, PI2); cx.fill();
      cx.beginPath(); cx.ellipse(dx + s * 1.18, dy - s * 1.12, s * 0.08, s * 0.32, -0.3, 0, PI2); cx.ellipse(dx + s * 1.34, dy - s * 1.1, s * 0.08, s * 0.32, 0.2, 0, PI2); cx.fill();
      cx.fillStyle = '#e8e2d8'; cx.beginPath(); cx.ellipse(dx + s * 1.66, dy - s * 0.64, s * 0.14, s * 0.12, 0, 0, PI2); cx.fill();
      cx.fillStyle = '#222'; cx.beginPath(); cx.arc(dx + s * 1.42, dy - s * 0.82, 2.5, 0, PI2); cx.fill();
      cx.strokeStyle = col; cx.lineWidth = 4; cx.beginPath(); cx.moveTo(dx - s, dy - s * 0.1); cx.quadraticCurveTo(dx - s * 1.35, dy + s * 0.2, dx - s * 1.25, dy + s * 0.6); cx.stroke();
    } else { // a city before dawn
      const g = cx.createLinearGradient(0, py, 0, py + phh); g.addColorStop(0, '#1d2a55'); g.addColorStop(0.7, '#e7925a'); g.addColorStop(1, '#f6c27a'); cx.fillStyle = g; cx.fillRect(px, py, pwid, phh);
      for (let bx = px; bx < px + pwid; bx += 18 + rnd() * 22) {
        const bw = 16 + rnd() * 26, bh = phh * (0.25 + rnd() * 0.6);
        cx.fillStyle = '#18203c'; cx.fillRect(bx, py + phh - bh, bw, bh);
        cx.fillStyle = 'rgba(255,214,120,.7)';
        for (let wy = py + phh - bh + 6; wy < py + phh - 4; wy += 9) for (let wx = bx + 3; wx < bx + bw - 4; wx += 7) if (rnd() < 0.3) cx.fillRect(wx, wy, 3, 4);
      }
    }
    cx.restore();
    for (let i = 0; i < 13; i++) { cx.strokeStyle = '#50555c'; cx.lineWidth = 4; cx.beginPath(); cx.ellipse(x + pw * 0.1 + i * pw * 0.067, y + 2, 5, 13, 0, 0, PI2); cx.stroke(); }
    cx.fillStyle = '#c0392b'; cx.font = `bold ${ph * 0.052}px ${SANS}`; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
    cx.fillText(`${MONTHS[mi]} ${yr}`, w / 2, y + ph * 0.42);
    const gx = x + pw * 0.06, gw = pw * 0.88, cwid = gw / 7, gy = y + ph * 0.48, rh = ph * 0.062;
    cx.font = `bold ${rh * 0.38}px ${SANS}`; cx.fillStyle = '#6b7079';
    'MTWTFSS'.split('').forEach((c, i) => cx.fillText(c, gx + cwid * (i + 0.5), gy));
    const first = (new Date(yr, mi, 1).getDay() + 6) % 7, days = new Date(yr, mi + 1, 0).getDate();
    cx.font = `${rh * 0.5}px ${SANS}`;
    let cpos = null;
    for (let dd = 1; dd <= days; dd++) {
      const k = first + dd - 1, col = k % 7, row = Math.floor(k / 7), tx = gx + cwid * (col + 0.5), ty = gy + rh * (row + 1.05);
      cx.fillStyle = col === 6 ? '#c0392b' : '#2b2f36'; cx.fillText(dd, tx, ty);
      if (+d.circle === dd) cpos = [tx, ty - rh * 0.17];
    }
    cx.fillStyle = 'rgba(0,0,0,.07)';
    for (let r = 0; r <= 6; r++) cx.fillRect(gx, gy + rh * (r + 0.3), gw, 1.5);
    if (cpos) {
      cx.strokeStyle = '#d42a1e'; cx.lineWidth = 5; cx.lineCap = 'round';
      cx.beginPath(); cx.ellipse(cpos[0], cpos[1], cwid * 0.5, rh * 0.52, -0.12, 0.3, PI2 + 0.6); cx.stroke();
    }
    if (d.text) {
      const z = Math.min(ph * 0.05, (pw * 0.86) / Math.max(1, String(d.text).length * 0.55));
      hand(cx, d.text, w / 2, y + ph * 0.955, z, '#d42a1e', { align: 'center', felt: true });
    }
  }
  calendar.size = [600, 800];

  function watch(cx, w, h, d) {
    const [hh, mm] = hm(d.time), x = w / 2, y = h / 2, r = w * 0.3;
    cx.fillStyle = '#5a3a22'; rr(cx, x - r * 0.62, 0, r * 1.24, h, 14); cx.fill();
    cx.strokeStyle = 'rgba(255,230,190,.35)'; cx.setLineDash([8, 7]); cx.lineWidth = 2;
    for (const s of [-1, 1]) { cx.beginPath(); cx.moveTo(x + s * r * 0.5, 0); cx.lineTo(x + s * r * 0.5, h); cx.stroke(); }
    cx.setLineDash([]);
    shadow(cx, 26, 10);
    const g = cx.createLinearGradient(x - r, y - r, x + r, y + r); g.addColorStop(0, '#f3f4f6'); g.addColorStop(0.5, '#9ea3aa'); g.addColorStop(1, '#e1e3e6');
    cx.fillStyle = g; cx.beginPath(); cx.arc(x, y, r * 1.12, 0, PI2); cx.fill(); noShadow(cx);
    cx.fillStyle = '#b8bcc2'; rr(cx, x + r * 1.08, y - 14, 22, 28, 5); cx.fill();
    cx.fillStyle = '#0f1a33'; cx.beginPath(); cx.arc(x, y, r, 0, PI2); cx.fill();
    cx.fillStyle = '#e9e4d6';
    for (let i = 0; i < 12; i++) { cx.save(); cx.translate(x, y); cx.rotate(i / 12 * PI2); cx.fillRect(-(i % 3 ? 3 : 6), -r * 0.92, i % 3 ? 6 : 12, r * (i % 3 ? 0.1 : 0.16)); cx.restore(); }
    cx.fillStyle = '#c7cfb9'; rr(cx, x - r * 0.42, y + r * 0.3, r * 0.84, r * 0.3, 6); cx.fill();
    cx.fillStyle = '#1b2414'; cx.font = `bold ${r * 0.22}px ${MONO}`; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(String(d.time || ''), x, y + r * 0.46);
    hands(cx, x, y, r, hh, mm, null, '#f4f1e8');
  }
  watch.size = [560, 640];

  function label(cx, w, h, d) { // cassette with a felt-tip label
    seedOf(d.text);
    const x = w * 0.05, y = h * 0.06, cw = w * 0.9, ch = h * 0.88;
    shadow(cx, 28, 12); cx.fillStyle = '#26282d'; rr(cx, x, y, cw, ch, 22); cx.fill(); noShadow(cx);
    for (const [sx, sy] of [[0.035, 0.05], [0.965, 0.05], [0.035, 0.94], [0.965, 0.94], [0.5, 0.94]]) screw(cx, x + cw * sx, y + ch * sy, 8);
    const lx = x + cw * 0.07, ly = y + ch * 0.08, lw = cw * 0.86, lh = ch * 0.64;
    cx.save(); rr(cx, lx, ly, lw, lh, 10); cx.clip();
    cx.fillStyle = '#f6f1e3'; cx.fillRect(lx, ly, lw, lh);
    cx.fillStyle = '#e8743b'; cx.fillRect(lx, ly + lh * 0.82, lw, lh * 0.18);
    cx.fillStyle = 'rgba(70,110,200,.3)'; for (let i = 1; i <= 3; i++) cx.fillRect(lx + lw * 0.1, ly + lh * 0.1 * i + lh * 0.05, lw * 0.8, 2);
    cx.restore();
    cx.strokeStyle = '#26282d'; cx.lineWidth = 2; cx.strokeRect(lx + 14, ly + 14, 34, 34);
    cx.fillStyle = '#26282d'; cx.font = `bold 26px ${SANS}`; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('A', lx + 31, ly + 32);
    const z = Math.min(lh * 0.24, (lw * 0.74) / Math.max(1, String(d.text || '').length * 0.62));
    hand(cx, d.text || '', w / 2, ly + lh * 0.34, z, '#16171c', { align: 'center', felt: true });
    const wx = lx + lw * 0.2, wy = ly + lh * 0.45, ww = lw * 0.6, wh = lh * 0.3;
    cx.fillStyle = '#3b3431'; rr(cx, wx, wy, ww, wh, wh / 2); cx.fill();
    cx.fillStyle = '#5a3a28'; cx.beginPath(); cx.arc(wx + wh * 0.62, wy + wh / 2, wh * 0.46, 0, PI2); cx.fill();
    cx.beginPath(); cx.arc(wx + ww - wh * 0.62, wy + wh / 2, wh * 0.3, 0, PI2); cx.fill();
    for (const rx of [wx + wh * 0.62, wx + ww - wh * 0.62]) {
      cx.fillStyle = '#f0ede6'; cx.beginPath(); cx.arc(rx, wy + wh / 2, wh * 0.2, 0, PI2); cx.fill();
      cx.fillStyle = '#3b3431'; cx.beginPath(); cx.arc(rx, wy + wh / 2, wh * 0.08, 0, PI2); cx.fill();
      for (let i = 0; i < 6; i++) { const a = i / 6 * PI2; cx.fillRect(rx + Math.cos(a) * wh * 0.1 - 3, wy + wh / 2 + Math.sin(a) * wh * 0.1 - 3, 6, 6); }
    }
    cx.fillStyle = 'rgba(255,255,255,.12)'; rr(cx, wx + 8, wy + 5, ww - 16, wh * 0.25, wh * 0.12); cx.fill();
    cx.fillStyle = '#1c1e22';
    cx.beginPath(); cx.moveTo(x + cw * 0.18, y + ch); cx.lineTo(x + cw * 0.24, y + ch * 0.8); cx.lineTo(x + cw * 0.76, y + ch * 0.8); cx.lineTo(x + cw * 0.82, y + ch); cx.fill();
    cx.fillStyle = '#0c0d10'; for (const hx of [0.32, 0.4, 0.6, 0.68]) { cx.beginPath(); cx.arc(x + cw * hx, y + ch * 0.9, 7, 0, PI2); cx.fill(); }
  }
  label.size = [900, 580];

  function list(cx, w, h, d) { // handwritten list; paper 'sheet' | 'notebook' | 'printout'; skull = targets sheet showing through
    const its = (d.items || []).map((it) => (typeof it === 'string' ? { text: it } : it));
    seedOf(String(d.title) + its.length);
    let x = w * 0.07, y = h * 0.04, pw = w * 0.86, ph = h * 0.92;
    if (d.frame) {
      shadow(cx, 26, 10);
      const g = cx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#6b4424'); g.addColorStop(1, '#3a2312');
      cx.fillStyle = g; cx.fillRect(w * 0.02, h * 0.015, w * 0.96, h * 0.97); noShadow(cx);
      cx.fillStyle = '#e9e4d8'; cx.fillRect(w * 0.07, h * 0.05, w * 0.86, h * 0.9);
      x = w * 0.13; y = h * 0.09; pw = w * 0.74; ph = h * 0.82;
    } else { tilt(cx, w, h, -0.012); shadow(cx, 22, 8); }
    const paper = d.paper || 'sheet';
    cx.fillStyle = paper === 'notebook' ? '#fbf8ee' : '#fdfdfb'; cx.fillRect(x, y, pw, ph); noShadow(cx);
    cx.save(); cx.beginPath(); cx.rect(x, y, pw, ph); cx.clip();
    if (paper === 'notebook') {
      cx.fillStyle = 'rgba(80,130,210,.28)'; for (let ly = y + ph * 0.12; ly < y + ph; ly += ph * 0.052) cx.fillRect(x, ly, pw, 1.5);
      cx.fillStyle = 'rgba(220,60,60,.4)'; cx.fillRect(x + pw * 0.1, y, 2, ph);
    }
    if (paper === 'printout' || d.skull) { // the other side, mirrored and faint
      cx.save(); cx.translate(x * 2 + pw, 0); cx.scale(-1, 1); cx.globalAlpha = 0.08; cx.fillStyle = '#222';
      if (paper === 'printout') {
        cx.font = `${ph * 0.028}px ${MONO}`;
        const err = ['JARVIS SYSTEMS  ERROR REPORT', 'ERR 4044: SESSION FORGOT USER', 'ERR 4044: USER FORGOT SESSION', 'RETRY? Y/N', 'TICKET NOT LOGGED (TICKET SYSTEM DOWN)'];
        for (let i = 0; i < 18; i++) cx.fillText(err[i % err.length], x + pw * 0.1, y + ph * 0.06 + i * ph * 0.05);
      } else {
        cx.font = `bold ${ph * 0.04}px ${SANS}`; cx.fillText('SALES TARGETS — WK 39', x + pw * 0.08, y + ph * 0.08);
        cx.font = `${ph * 0.032}px ${SANS}`;
        ['Mobile', 'Home Internet', 'Accessories', 'Insurance', 'Recontracts', 'Upgrades'].forEach((r, i) => {
          const ry = y + ph * (0.16 + i * 0.07);
          cx.fillText(r, x + pw * 0.08, ry); cx.fillRect(x + pw * 0.06, ry + ph * 0.02, pw * 0.88, 2);
          if (r === 'Recontracts') { cx.globalAlpha = 0.22; skull(cx, x + pw * 0.5, ry - ph * 0.012, ph * 0.05, '#1d2f8f'); cx.globalAlpha = 0.08; }
        });
      }
      cx.restore();
    }
    if (paper === 'printout') { cx.fillStyle = '#e9e9ee'; for (let ly = y + 14; ly < y + ph; ly += 30) { cx.beginPath(); cx.arc(x + 14, ly, 6, 0, PI2); cx.arc(x + pw - 14, ly, 6, 0, PI2); cx.fill(); } }
    cx.restore();
    const n = its.length + (d.title ? 1.6 : 0), tick = d.ticks ? 1.3 : 0.9;
    let z = Math.min(ph * 0.07, (ph * 0.84) / Math.max(n, 1) / 1.32);
    cx.font = `100px ${HAND}`;
    let mw = 1; for (const it of its) mw = Math.max(mw, cx.measureText(it.text).width / 100);
    z = Math.min(z, (pw * 0.8) / (mw + tick));
    let yy = y + ph * 0.07 + z;
    const lx = x + pw * (paper === 'notebook' ? 0.13 : 0.08);
    if (d.title) {
      const tw = hand(cx, d.title, lx, yy, z * 1.2, BIRO, { pen: true, bold: true });
      cx.strokeStyle = BIRO; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(lx, yy + z * 0.25);
      for (let k = 1; k <= 8; k++) cx.lineTo(lx + tw * k / 8, yy + z * 0.25 + (rnd() - 0.5) * 4); cx.stroke();
      yy += z * 1.6 * 1.25;
    }
    for (const it of its) {
      let tx = lx + z * 0.9;
      if (d.ticks) {
        cx.strokeStyle = BIRO; cx.lineWidth = 2.2; cx.strokeRect(lx, yy - z * 0.72, z * 0.72, z * 0.72);
        if (it.done) { cx.lineWidth = 3.5; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(lx + z * 0.12, yy - z * 0.4); cx.lineTo(lx + z * 0.32, yy - z * 0.1); cx.lineTo(lx + z * 0.85, yy - z * 1.0); cx.stroke(); }
        tx = lx + z * 1.2;
      } else hand(cx, '–', lx, yy, z, BIRO);
      hand(cx, it.text, tx, yy, z, BIRO, { pen: true });
      yy += z * 1.32;
    }
    if (d.frame) { const g = cx.createLinearGradient(0, 0, w, h); g.addColorStop(0, 'rgba(255,255,255,.14)'); g.addColorStop(0.4, 'rgba(255,255,255,0)'); cx.fillStyle = g; cx.fillRect(w * 0.07, h * 0.05, w * 0.86, h * 0.9); }
  }
  list.size = [700, 800];

  function polaroid(cx, w, h, d) {
    const fw = w * 0.84, fh = h * 0.9, x = (w - fw) / 2, y = (h - fh) / 2;
    tilt(cx, w, h, d.front ? -0.03 : 0.04);
    shadow(cx, 26, 10);
    if (!d.front) { // we only ever see the back
      cx.fillStyle = '#2b2825'; cx.fillRect(x, y, fw, fh); noShadow(cx);
      cx.strokeStyle = 'rgba(255,255,255,.08)'; cx.lineWidth = 6; cx.strokeRect(x + 3, y + 3, fw - 6, fh - 6);
      seedOf('polaroid'); cx.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 400; i++) cx.fillRect(x + rnd() * fw, y + rnd() * fh, 2, 2);
      return;
    }
    cx.fillStyle = '#fbfbf6'; cx.fillRect(x, y, fw, fh); noShadow(cx);
    const m = fw * 0.07, iw = fw - 2 * m;
    const c = document.createElement('canvas'); c.width = c.height = 240; const p = c.getContext('2d');
    let g = p.createLinearGradient(0, 0, 0, 240); g.addColorStop(0, '#b9c3cc'); g.addColorStop(1, '#8e969c'); p.fillStyle = g; p.fillRect(0, 0, 240, 240);
    p.fillStyle = '#8c857a'; p.fillRect(0, 40, 240, 200);                      // the gate's stone front
    p.fillStyle = '#2e2b28'; p.beginPath(); p.moveTo(80, 200); p.lineTo(80, 110); p.arc(120, 110, 40, Math.PI, 0); p.lineTo(160, 200); p.fill(); // arch
    p.fillStyle = '#6d675f'; p.fillRect(0, 196, 240, 44);                      // cobbles
    const fig = (fx, shirt, legs, hair, tall) => {
      p.fillStyle = legs; p.fillRect(fx - 11, 170 - tall, 9, 60 + tall); p.fillRect(fx + 2, 170 - tall, 9, 60 + tall);
      p.fillStyle = shirt; p.beginPath(); p.roundRect(fx - 17, 118 - tall, 34, 58, 8); p.fill();
      p.fillStyle = '#e4c2a2'; p.beginPath(); p.arc(fx, 102 - tall, 13, 0, PI2); p.fill();
      p.fillStyle = hair; p.beginPath(); p.arc(fx, 97 - tall, 13, Math.PI, 0); p.fill();
    };
    fig(66, '#16171b', '#1a1a1e', '#4a3222', 0); p.fillStyle = '#ffd21f'; p.fillRect(56, 128, 6, 4); // Luka
    fig(120, '#23305a', '#b9ad94', '#3a2a1c', 6); p.fillStyle = '#e6dff0'; p.fillRect(116, 114, 8, 18);  // Rue, blazer
    fig(174, '#1f6fe0', '#5b7fae', '#5a3b24', -2);                            // Chase
    const s = document.createElement('canvas'); s.width = s.height = 44; s.getContext('2d').drawImage(c, 0, 0, 44, 44);
    cx.save(); cx.imageSmoothingQuality = 'high'; cx.filter = 'blur(2px)'; cx.drawImage(s, x + m, y + m, iw, iw); cx.restore();
    cx.fillStyle = 'rgba(245,238,220,.2)'; cx.fillRect(x + m, y + m, iw, iw);
    const dev = d.dev ?? 1;
    if (dev < 1) { cx.fillStyle = `rgba(48,56,46,${(1 - dev) * 0.95})`; cx.fillRect(x + m, y + m, iw, iw); }
  }
  polaroid.size = [560, 660];

  function plaque(cx, w, h, d) {
    const x = w * 0.05, y = h * 0.12, pw = w * 0.9, ph = h * 0.76;
    shadow(cx, 20, 8); cx.fillStyle = brass(cx, x, y, pw, ph); rr(cx, x, y, pw, ph, 14); cx.fill(); noShadow(cx);
    cx.strokeStyle = 'rgba(70,48,12,.55)'; cx.lineWidth = 3; rr(cx, x + 22, y + 22, pw - 44, ph - 44, 8); cx.stroke();
    for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) screw(cx, x + 12 + sx * (pw - 24), y + 12 + sy * (ph - 24), 7);
    const t = String(d.text || '').toUpperCase(), f = fit(cx, t, (z) => `bold ${z}px ${SERIF}`, pw * 0.8, ph * 0.6, ph * 0.3, 1.15);
    if ('letterSpacing' in cx) cx.letterSpacing = Math.round(f.size * 0.12) + 'px';
    f.lines.forEach((l, i) => engrave(cx, l, w / 2, y + ph / 2 + (i - (f.lines.length - 1) / 2) * f.size * 1.15, `bold ${f.size}px ${SERIF}`));
  }
  plaque.size = [900, 360];

  function nameplate(cx, w, h, d) {
    const parts = String(d.text || '').split(' — ');
    shadow(cx, 24, 12);
    cx.fillStyle = '#4a2c17'; cx.beginPath(); cx.moveTo(w * 0.04, h * 0.3); cx.lineTo(w * 0.96, h * 0.3); cx.lineTo(w * 0.985, h * 0.92); cx.lineTo(w * 0.015, h * 0.92); cx.closePath(); cx.fill();
    noShadow(cx);
    cx.fillStyle = '#6e452a'; cx.beginPath(); cx.moveTo(w * 0.09, h * 0.12); cx.lineTo(w * 0.91, h * 0.12); cx.lineTo(w * 0.96, h * 0.3); cx.lineTo(w * 0.04, h * 0.3); cx.closePath(); cx.fill();
    seedOf('grain'); cx.strokeStyle = 'rgba(30,15,5,.35)'; cx.lineWidth = 2;
    for (let i = 0; i < 12; i++) { const gy = h * (0.34 + rnd() * 0.55); cx.beginPath(); cx.moveTo(w * 0.03, gy); cx.bezierCurveTo(w * 0.3, gy + rnd() * 20 - 10, w * 0.7, gy + rnd() * 20 - 10, w * 0.97, gy); cx.stroke(); }
    const px = w * 0.1, py = h * 0.38, pw = w * 0.8, ph = h * 0.44;
    cx.fillStyle = brass(cx, px, py, pw, ph); rr(cx, px, py, pw, ph, 8); cx.fill();
    cx.strokeStyle = 'rgba(70,48,12,.5)'; cx.lineWidth = 2; rr(cx, px + 10, py + 10, pw - 20, ph - 20, 4); cx.stroke();
    if ('letterSpacing' in cx) cx.letterSpacing = '4px';
    const f = fit(cx, parts[0].toUpperCase(), (z) => `bold ${z}px ${SERIF}`, pw * 0.86, ph * 0.5, ph * 0.34, 1);
    engrave(cx, f.lines.join(' '), w / 2, py + ph * (parts[1] ? 0.4 : 0.5), `bold ${f.size}px ${SERIF}`);
    if (parts[1]) { if ('letterSpacing' in cx) cx.letterSpacing = '10px'; engrave(cx, parts[1].toUpperCase(), w / 2, py + ph * 0.74, `${ph * 0.15}px ${SERIF}`); }
  }
  nameplate.size = [960, 380];

  function tv(cx, w, h, d) {
    const news = d.kind === 'news';
    shadow(cx, 28, 12);
    cx.fillStyle = news ? '#5b3a22' : '#3b3d42'; rr(cx, w * 0.03, h * 0.04, w * 0.94, h * 0.9, 34); cx.fill(); noShadow(cx);
    if (news) { seedOf('wood'); cx.strokeStyle = 'rgba(0,0,0,.18)'; cx.lineWidth = 2; for (let i = 0; i < 16; i++) { const gy = h * (0.08 + i * 0.053); cx.beginPath(); cx.moveTo(w * 0.05, gy); cx.bezierCurveTo(w * 0.3, gy + rnd() * 12, w * 0.6, gy - rnd() * 12, w * 0.95, gy); cx.stroke(); } }
    const sx = w * 0.08, sy = h * 0.1, sw = news ? w * 0.66 : w * 0.84, sh = h * 0.7;
    cx.fillStyle = '#0d0d0f'; rr(cx, sx - 12, sy - 12, sw + 24, sh + 24, 44); cx.fill();
    cx.save(); rr(cx, sx, sy, sw, sh, 38); cx.clip();
    if (news) {
      cx.fillStyle = '#0d1b3d'; cx.fillRect(sx, sy, sw, sh);
      cx.fillStyle = '#c8231f'; cx.fillRect(sx, sy + sh * 0.08, sw, sh * 0.13);
      cx.fillStyle = '#fff'; cx.font = `bold ${sh * 0.085}px ${SANS}`; cx.textAlign = 'left'; cx.textBaseline = 'middle';
      cx.fillText('NEWSFLASH', sx + sw * 0.07, sy + sh * 0.145);
      cx.font = `bold ${sh * 0.07}px ${SANS}`; cx.fillText(d.text || 'SHARES IN FREEFALL', sx + sw * 0.07, sy + sh * 0.3, sw * 0.86);
      [['NEW YORK', '−508.00'], ['LONDON', '−249.60'], ['TOKYO', '−620.18'], ['HONG KONG', '−420.81']].forEach(([n, v], i) => {
        const ry = sy + sh * (0.44 + i * 0.12);
        cx.fillStyle = '#dfe6f5'; cx.font = `bold ${sh * 0.06}px ${MONO}`; cx.fillText(n, sx + sw * 0.07, ry);
        cx.fillStyle = '#ff4637'; cx.textAlign = 'right'; cx.fillText('▼ ' + v, sx + sw * 0.93, ry); cx.textAlign = 'left';
      });
    } else {
      let g = cx.createLinearGradient(sx, sy, sx, sy + sh); g.addColorStop(0, '#f2bb7c'); g.addColorStop(1, '#8a4f2a'); cx.fillStyle = g; cx.fillRect(sx, sy, sw, sh);
      seedOf('bokeh'); for (let i = 0; i < 14; i++) { cx.fillStyle = `rgba(255,236,190,${0.08 + rnd() * 0.12})`; cx.beginPath(); cx.arc(sx + rnd() * sw, sy + rnd() * sh * 0.6, 12 + rnd() * 30, 0, PI2); cx.fill(); }
      const mx = sx + sw / 2, hy = sy + sh * 0.36, hr = sh * 0.15;
      cx.fillStyle = '#1d2a4d'; cx.beginPath(); cx.ellipse(mx, sy + sh * 1.02, sw * 0.3, sh * 0.42, 0, 0, PI2); cx.fill();
      cx.fillStyle = '#f4f4f0'; cx.beginPath(); cx.moveTo(mx - sw * 0.07, sy + sh * 0.62); cx.lineTo(mx + sw * 0.07, sy + sh * 0.62); cx.lineTo(mx, sy + sh * 0.84); cx.fill();
      cx.fillStyle = '#dcb38f'; cx.fillRect(mx - hr * 0.35, hy + hr * 0.7, hr * 0.7, hr * 0.8);
      cx.fillStyle = '#e8c4a2'; cx.beginPath(); cx.ellipse(mx, hy, hr * 0.78, hr, 0, 0, PI2); cx.fill();
      cx.beginPath(); cx.ellipse(mx - hr * 0.8, hy + hr * 0.1, hr * 0.14, hr * 0.22, 0, 0, PI2); cx.ellipse(mx + hr * 0.8, hy + hr * 0.1, hr * 0.14, hr * 0.22, 0, 0, PI2); cx.fill();
      cx.fillStyle = '#d6d9df'; cx.beginPath(); cx.ellipse(mx, hy - hr * 0.55, hr * 0.84, hr * 0.5, 0, Math.PI * 1.02, Math.PI * 1.98); cx.fill();
      cx.fillRect(mx - hr * 0.8, hy - hr * 0.6, hr * 0.2, hr * 0.5); cx.fillRect(mx + hr * 0.6, hy - hr * 0.6, hr * 0.2, hr * 0.5);
      cx.strokeStyle = '#3a3a40'; cx.lineWidth = 3;
      for (const e of [-1, 1]) { rr(cx, mx + e * hr * 0.36 - hr * 0.22, hy - hr * 0.08, hr * 0.44, hr * 0.28, 6); cx.stroke(); cx.fillStyle = '#2a2a30'; cx.beginPath(); cx.arc(mx + e * hr * 0.36, hy + hr * 0.06, 3.5, 0, PI2); cx.fill(); }
      cx.beginPath(); cx.moveTo(mx - hr * 0.14, hy); cx.lineTo(mx + hr * 0.14, hy); cx.stroke();
      cx.strokeStyle = '#8a4f3a'; cx.lineWidth = 3.5; cx.beginPath(); cx.arc(mx, hy + hr * 0.35, hr * 0.3, 0.35, Math.PI - 0.35); cx.stroke();
      cx.fillStyle = 'rgba(20,29,58,.88)'; cx.fillRect(sx, sy + sh * 0.78, sw, sh * 0.13);
      cx.fillStyle = '#ffd21f'; cx.fillRect(sx + sw * 0.06, sy + sh * 0.8, 6, sh * 0.09);
      cx.fillStyle = '#fff'; cx.font = `${sh * 0.055}px ${SANS}`; cx.textAlign = 'left'; cx.textBaseline = 'middle';
      cx.fillText(d.text || 'A message from Rue, CEO', sx + sw * 0.09, sy + sh * 0.845, sw * 0.82);
    }
    const g = cx.createRadialGradient(sx + sw * 0.35, sy + sh * 0.25, 10, sx + sw / 2, sy + sh / 2, sw * 0.75);
    g.addColorStop(0, 'rgba(255,255,255,.13)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,.35)');
    cx.fillStyle = g; cx.fillRect(sx, sy, sw, sh);
    cx.restore();
    if (news) {
      const kx = sx + sw + (w * 0.97 - sx - sw) / 2;
      for (const ky of [0.25, 0.45]) { cx.fillStyle = '#1b1b1d'; cx.beginPath(); cx.arc(kx, h * ky, w * 0.04, 0, PI2); cx.fill(); cx.fillStyle = '#9a9aa0'; cx.fillRect(kx - 2, h * ky - w * 0.035, 4, w * 0.03); }
      cx.fillStyle = '#2a1a0e'; for (let i = 0; i < 7; i++) cx.fillRect(kx - w * 0.05, h * (0.6 + i * 0.035), w * 0.1, 4);
    } else {
      cx.fillStyle = '#26282c'; for (let i = 0; i < 4; i++) { rr(cx, w * (0.62 + i * 0.07), h * 0.85, w * 0.05, h * 0.03, 4); cx.fill(); }
      cx.fillStyle = '#ff3b30'; cx.beginPath(); cx.arc(w * 0.12, h * 0.865, 6, 0, PI2); cx.fill();
    }
  }
  tv.size = [880, 660];

  function battery(cx, w, h, d) { // the 1987 HUD, big: BATTERY 1% · NO SERVICE
    const pct = d.pct ?? 1, bars = d.bars ?? 0;
    shadow(cx, 26, 10); cx.fillStyle = 'rgba(14,20,40,.95)'; rr(cx, w * 0.03, h * 0.08, w * 0.94, h * 0.84, 24); cx.fill(); noShadow(cx);
    cx.fillStyle = '#ffd21f'; cx.fillRect(w * 0.08, h * 0.08, w * 0.84, 4);
    const bx = w * 0.09, by = h * 0.3, bw = w * 0.34, bh = h * 0.3;
    cx.strokeStyle = '#fff'; cx.lineWidth = 8; rr(cx, bx, by, bw, bh, 12); cx.stroke();
    cx.fillStyle = '#fff'; rr(cx, bx + bw + 4, by + bh * 0.3, 16, bh * 0.4, 5); cx.fill();
    cx.fillStyle = pct <= 5 ? '#ff4a3d' : '#7fe07a'; if (pct > 0) cx.fillRect(bx + 12, by + 12, Math.max(10, (bw - 24) * pct / 100), bh - 24);
    cx.fillStyle = '#fff'; cx.font = `bold ${h * 0.08}px ${SANS}`; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
    cx.fillText('BATTERY', bx, h * 0.76); cx.font = `bold ${h * 0.2}px ${SANS}`; cx.textAlign = 'right'; cx.fillText(pct + '%', w * 0.54, h * 0.76); cx.textAlign = 'left';
    const sx = w * 0.63, base = h * 0.6;
    for (let i = 0; i < 4; i++) { cx.fillStyle = i < bars ? '#fff' : 'rgba(255,255,255,.2)'; rr(cx, sx + i * w * 0.07, base - (i + 1) * h * 0.07, w * 0.045, (i + 1) * h * 0.07, 4); cx.fill(); }
    cx.font = `bold ${h * 0.08}px ${SANS}`; cx.fillStyle = bars ? '#fff' : '#ff9d92';
    cx.fillText(bars ? `${bars} BAR${bars > 1 ? 'S' : ''}` : 'NO SERVICE', sx, h * 0.76);
  }
  battery.size = [760, 380];

  function filofax(cx, w, h, d) {
    seedOf(d.text);
    shadow(cx, 26, 10);
    const g = cx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#6a3421'); g.addColorStop(1, '#43200f');
    cx.fillStyle = g; rr(cx, w * 0.02, h * 0.04, w * 0.96, h * 0.92, 26); cx.fill(); noShadow(cx);
    cx.strokeStyle = 'rgba(240,200,150,.4)'; cx.setLineDash([9, 7]); cx.lineWidth = 2; rr(cx, w * 0.035, h * 0.065, w * 0.93, h * 0.87, 20); cx.stroke(); cx.setLineDash([]);
    const pages = [[w * 0.065, w * 0.42], [w * 0.515, w * 0.42]], py = h * 0.09, ph = h * 0.82;
    for (const [px, pw] of pages) {
      cx.fillStyle = '#fbf5e3'; rr(cx, px, py, pw, ph, 6); cx.fill();
      cx.fillStyle = 'rgba(80,120,190,.22)'; for (let ly = py + ph * 0.2; ly < py + ph - 10; ly += ph * 0.075) cx.fillRect(px + 16, ly, pw - 32, 1.5);
    }
    cx.fillStyle = '#6b6254'; cx.font = `bold ${h * 0.045}px ${SERIF}`; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
    cx.fillText(d.head || 'OCTOBER 1987', pages[0][0] + 26, py + ph * 0.12);
    cx.font = `${h * 0.03}px ${SERIF}`; cx.fillStyle = '#8b8373';
    ['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23', 'Sat 24', 'Sun 25', 'Mon 26', 'Tue 27', 'Wed 28'].forEach((t, i) => cx.fillText(t, pages[0][0] + 26, py + ph * (0.19 + i * 0.075)));
    cx.fillText(d.head2 || 'NOTES', pages[1][0] + 26, py + ph * 0.12);
    for (let i = 0; i < 6; i++) {
      const ry = py + ph * (0.12 + i * 0.15), rg = cx.createLinearGradient(w / 2 - 30, 0, w / 2 + 30, 0);
      rg.addColorStop(0, '#6d7278'); rg.addColorStop(0.5, '#f1f3f5'); rg.addColorStop(1, '#6d7278');
      cx.strokeStyle = rg; cx.lineWidth = 7; cx.beginPath(); cx.ellipse(w / 2, ry, 30, 12, 0, Math.PI, 0); cx.stroke();
    }
    const lines = String(d.text || '').split(' — ');
    cx.font = `100px ${HAND}`;
    const z = Math.min(h * 0.085, (pages[1][1] * 0.82) / Math.max(...lines.map((l) => cx.measureText(l).width / 100)));
    lines.forEach((l, i) => hand(cx, l, pages[1][0] + 30, py + ph * (0.33 + i * 0.15), z, '#15204f', { pen: true }));
  }
  filofax.size = [960, 620];

  function wheel(cx, w, h, d) { // the machine's date wheel: DD / MM / YYYY  hh:mm
    shadow(cx, 26, 10); cx.fillStyle = '#15171c'; rr(cx, w * 0.02, h * 0.04, w * 0.96, h * 0.92, 40); cx.fill(); noShadow(cx);
    const sx = w * 0.06, sy = h * 0.1, sw = w * 0.88, sh = h * 0.8;
    cx.fillStyle = '#0b1020'; rr(cx, sx, sy, sw, sh, 22); cx.fill();
    cx.fillStyle = '#8fa3d9'; cx.font = `bold ${sh * 0.06}px ${SYS}`; cx.textAlign = 'left'; cx.textBaseline = 'alphabetic';
    cx.fillText('DIAL  ·  WHEN?', sx + sw * 0.04, sy + sh * 0.12);
    const F = [['dd', 2, 1, 31, 'DD'], ['mm', 2, 1, 12, 'MM'], ['yyyy', 4, 1900, 2100, 'YYYY'], ['hh', 2, 0, 23, 'hh'], ['mi', 2, 0, 59, 'mm']];
    const SEP = ['/', '/', '', ':'], unit = sw * 0.052, gap = sw * 0.035, dh = sh * 0.56, dy = sy + sh * 0.2;
    let total = 0; for (const f of F) total += f[1] * unit + unit * 0.8; total += gap * 4;
    let x = sx + (sw - total) / 2;
    F.forEach(([k, len, lo, hi, lab], i) => {
      const dw = len * unit + unit * 0.8, v = d[k], n = +v;
      const g = cx.createLinearGradient(0, dy, 0, dy + dh);
      g.addColorStop(0, '#2a2f3b'); g.addColorStop(0.3, '#d9dce3'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.7, '#d9dce3'); g.addColorStop(1, '#2a2f3b');
      cx.fillStyle = g; rr(cx, x, dy, dw, dh, 10); cx.fill();
      const pad = (q) => String(q).padStart(len, '0'), mx = x + dw / 2, my = dy + dh / 2;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      if (k === 'yyyy' && d.spin) { // years blurring past
        cx.fillStyle = 'rgba(40,44,54,.35)'; cx.font = `bold ${dh * 0.26}px ${SANS}`;
        for (let j = -2; j <= 2; j++) cx.fillText(pad(Number.isFinite(n) ? n + j * 7 : ''), mx, my + j * dh * 0.2);
        cx.fillStyle = 'rgba(255,255,255,.5)'; for (let j = 0; j < 6; j++) cx.fillRect(x + 8, dy + dh * (0.15 + j * 0.14), dw - 16, 2);
      } else {
        if (Number.isFinite(n)) {
          const wrapv = (q) => (q < lo ? hi : q > hi ? lo : q);
          cx.fillStyle = 'rgba(40,44,54,.45)'; cx.font = `bold ${dh * 0.2}px ${SANS}`;
          cx.fillText(pad(wrapv(n - 1)), mx, my - dh * 0.3); cx.fillText(pad(wrapv(n + 1)), mx, my + dh * 0.3);
        }
        cx.fillStyle = '#10131a'; cx.font = `bold ${dh * 0.3}px ${SANS}`; cx.fillText(v == null ? '--' : pad(v), mx, my + 2);
      }
      cx.fillStyle = '#8fa3d9'; cx.font = `bold ${sh * 0.05}px ${SYS}`; cx.fillText(lab, mx, dy + dh + sh * 0.08);
      x += dw;
      if (SEP[i] !== undefined) { cx.fillStyle = '#dfe5f5'; cx.font = `bold ${dh * 0.26}px ${SANS}`; cx.fillText(SEP[i], x + gap / 2, my); x += gap; }
    });
    cx.strokeStyle = 'rgba(255,210,31,.8)'; cx.lineWidth = 2;
    cx.strokeRect(sx + (sw - total) / 2 - 10, dy + dh * 0.33, total + 20, dh * 0.34);
  }
  wheel.size = [960, 500];

  return { postit, clock, phone, brick, screen, newspaper, poster, badge, calendar, watch, label, list, polaroid, plaque, nameplate, tv, battery, filofax, wheel };
})());
