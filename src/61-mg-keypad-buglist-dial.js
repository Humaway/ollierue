// ============================================================ MINIGAMES: Alarm keypad, Bug List, Dial
// DOM mini-games (SPEC §9 1.4, 1.6, 1.7; §10 2.7; §12 3.4). No top-level names: this IIFE only
// assigns MINIGAMES.keypad, MINIGAMES.buglist and MINIGAMES.dial.
(() => {
  const BIRO = '#1f3a93';
  const CSS = `
.mg-k,.mg-bl,.mg-dl{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;user-select:none;-webkit-user-select:none;font:14px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.mg-k *,.mg-bl *,.mg-dl *{box-sizing:border-box}
.mg-k{padding:16px 16px 20vh;pointer-events:none!important}
.mg-kp{width:min(300px,100%);padding:14px 18px 12px;background:linear-gradient(#f2eee4,#d7d0c1);border:1px solid #a39c8b;border-radius:18px;box-shadow:0 14px 30px rgba(0,0,0,.5),inset 0 1px 0 #fff;pointer-events:auto;color:#4a463c}
.mg-kptop{display:flex;align-items:center;gap:5px;font-size:9px;letter-spacing:.1em;margin-bottom:8px}
.mg-kptop span{flex:1;font-size:11px;font-weight:800;letter-spacing:.2em}
.mg-led{width:9px;height:9px;border-radius:50%;background:#2fbf4a;box-shadow:0 0 6px #2fbf4a}
.mg-led.r{background:#e53935;box-shadow:0 0 8px #e53935;animation:mg-blink .8s steps(2) infinite}
@keyframes mg-blink{50%{opacity:.15}}
.mg-lcd{background:#a9c58b;color:#1d2a14;border:3px solid #5b6450;border-radius:6px;padding:6px 10px;box-shadow:inset 0 2px 6px rgba(0,0,0,.35);margin-bottom:12px}
.mg-lcdt{font:700 11px ui-monospace,Menlo,Consolas,monospace;letter-spacing:.14em}
.mg-lcdd{font:700 32px/1.15 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.12em;text-align:center}
.mg-kgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.mg-key{height:50px;border-radius:10px;background:linear-gradient(#fdfcf8,#e2dccf);border:1px solid #9d9686;box-shadow:0 3px 0 #9d9686;font:700 22px system-ui,sans-serif;color:#3a372f;cursor:pointer}
.mg-key:active{transform:translateY(2px);box-shadow:0 1px 0 #9d9686}
.mg-key.c{color:#c62828;font-size:18px}
.mg-key.okk{color:#2e7d32;font-size:18px}
.mg-kp .mg-f{outline:3px solid #ffd21f;outline-offset:2px}
.mg-khint{margin-top:10px;font-size:11px;text-align:center;color:#6d675a}
.mg-bl{flex-direction:column;gap:8px;padding:12px 16px;background:rgba(12,9,6,.4);pointer-events:auto}
.mg-paper{position:relative;width:min(540px,100%);max-height:calc(100% - 26px);padding:24px 28px 18px 40px;background:#f8f5ec;box-shadow:0 12px 30px rgba(0,0,0,.45);transform:rotate(-1.2deg);display:flex;flex-direction:column;overflow:hidden;color:${BIRO};font:21px/1.25 "Segoe Print","Bradley Hand","Comic Sans MS","Chalkboard SE","Marker Felt",cursive}
.mg-thru{position:absolute;left:28px;right:28px;top:34px;transform:scaleX(-1);opacity:.1;color:#000;font:13px/1.4 system-ui,sans-serif;pointer-events:none}
.mg-thru b{display:block;font-size:15px;margin-bottom:8px}
.mg-thru table{width:100%;border-collapse:collapse}
.mg-thru td{border:1px solid #000;padding:5px 8px}
.mg-thru svg{display:block}
.mg-bt{font-size:27px;text-decoration:underline;margin:0 0 8px 6px;transform:rotate(-1.5deg);align-self:flex-start}
.mg-bls,.mg-ble{display:flex;flex-direction:column;gap:1px}
.mg-bug{display:flex;align-items:center;gap:12px;padding:3px 6px;background:none;border:0;border-radius:6px;font:inherit;color:inherit;text-align:left;cursor:pointer}
.mg-bug:nth-child(even){transform:rotate(.5deg)}
.mg-bug i{flex:none;position:relative;width:21px;height:21px;border:2px solid ${BIRO};border-radius:3px 6px 2px 5px;transform:rotate(-4deg)}
.mg-bug.on i:after{content:"";position:absolute;left:5px;top:-10px;width:9px;height:21px;border:solid ${BIRO};border-width:0 3.5px 3.5px 0;transform:rotate(38deg)}
.mg-bug span{opacity:.5}
.mg-bug.on span{opacity:1}
.mg-ble div{padding:3px 6px 3px 39px;transform:rotate(-.6deg)}
.mg-done{align-self:flex-end;margin-top:8px;padding:2px 20px;background:none;border:2.5px solid ${BIRO};border-radius:50%/60%;font:inherit;font-size:24px;color:${BIRO};cursor:pointer;transform:rotate(-4deg)}
.mg-paper .mg-f{background:rgba(255,214,40,.5)}
.mg-blh{font-size:13px;color:#fff;text-shadow:0 1px 3px #000}
.mg-dl{gap:22px;padding:16px 16px 21vh;pointer-events:none!important;color:#e9edf5}
.mg-card{flex:none;width:210px;padding:14px 14px 16px;background:#fff;color:#1b1f28;border:8px solid #111;border-radius:22px;box-shadow:0 10px 26px rgba(0,0,0,.45);transform:rotate(-3deg)}
.mg-card.hide{display:none}
.mg-card.bio .mg-cs{white-space:normal;font-size:17px;line-height:1.3}
.mg-ct{font-size:11px;color:#6b7382;text-transform:uppercase;letter-spacing:.08em}
.mg-card.say .mg-ct{color:#b08a00;font-weight:800}
.mg-cb{font-size:14px;margin:6px 0 4px}
.mg-cs{font:700 23px/1.2 system-ui,sans-serif;white-space:nowrap}
.mg-rig{position:relative;flex:none;display:flex;gap:14px;padding:14px;background:linear-gradient(#3b4049,#22262d);border-radius:16px;box-shadow:0 14px 34px rgba(0,0,0,.5);pointer-events:auto}
.mg-scr{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;border:9px solid #07080a;border-radius:26px;background:#0e1320;overflow:hidden}
.mg-s1{width:250px;padding:12px 16px 14px}
.mg-s2{width:min(470px,52vw);padding:12px 14px 14px;justify-content:center;background:radial-gradient(circle at 50% 40%,#18213a,#0b0f18)}
.mg-crack{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.mg-num{width:100%;height:40px;font:600 26px/40px system-ui,sans-serif;text-align:center;white-space:nowrap}
.mg-num:empty:before{content:"Enter number";font-size:15px;color:#5d6782}
.mg-dl.num .mg-num:after{content:"|";margin-left:2px;color:#4f8cff;animation:mg-blink 1s steps(2) infinite}
.mg-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px;width:100%}
.mg-dk{height:52px;border:0;border-radius:26px;background:#1f2736;color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.mg-dk b{font:500 24px system-ui,sans-serif}
.mg-dk small{height:10px;margin-top:2px;font-size:9px;letter-spacing:.12em;color:#8b95ad}
.mg-dk.bad{background:#a3262a}
.mg-dk.hit{background:#3d5486}
.mg-rig .mg-f{box-shadow:0 0 0 3px #ffd21f}
.mg-call{width:100%;height:46px;margin-top:4px;border:0;border-radius:23px;background:#1d9e4f;color:#fff;font:700 17px system-ui,sans-serif;letter-spacing:.12em;cursor:pointer;visibility:hidden}
.mg-call.on{visibility:visible;animation:mg-pulse 1s ease-in-out infinite}
@keyframes mg-pulse{50%{transform:scale(1.04)}}
.mg-cap{font-size:11px;letter-spacing:.16em;color:#8b95ad;text-transform:uppercase;text-align:center}
.mg-wheel{position:relative;display:flex;align-items:center;justify-content:center;gap:6px;width:100%}
.mg-wheel:before{content:"";position:absolute;left:0;right:0;top:50%;height:50px;margin-top:-16px;background:rgba(120,150,255,.12);border-top:1px solid rgba(160,185,255,.3);border-bottom:1px solid rgba(160,185,255,.3);pointer-events:none}
.mg-wheel.mg-off{opacity:.4}
.mg-wheel.shake{animation:mg-shake .3s}
@keyframes mg-shake{25%{transform:translateX(-9px)}75%{transform:translateX(9px)}}
.mg-col{display:flex;flex-direction:column;align-items:center;min-width:54px;padding:0 2px;border-radius:10px;touch-action:none;cursor:ns-resize}
.mg-col.yr{min-width:86px}
.mg-col small{font-size:10px;color:#6f7a95;letter-spacing:.1em}
.mg-arr{width:100%;height:26px;border:0;background:none;color:#8fa6de;font-size:13px;cursor:pointer}
.mg-nb{height:24px;font:500 18px/24px system-ui,sans-serif;color:#56607a;font-variant-numeric:tabular-nums}
.mg-cur{height:48px;font:700 34px/48px system-ui,sans-serif;color:#fff;font-variant-numeric:tabular-nums}
.mg-col.fast .mg-nb,.mg-col.fast .mg-cur{filter:blur(1.6px)}
.mg-sep{margin-top:16px;font:700 26px system-ui,sans-serif;color:#56607a}
.mg-gap{width:12px}
.mg-set{height:40px;min-width:120px;border:0;border-radius:20px;background:#2f6fd6;color:#fff;font:700 15px system-ui,sans-serif;letter-spacing:.12em;cursor:pointer;visibility:hidden}
.mg-set.on{visibility:visible}
.mg-hint{min-height:16px;font-size:12px;color:#aab4cc;text-align:center}
.mg-tape{position:absolute;width:78px;height:24px;background:rgba(222,204,158,.93);box-shadow:0 1px 2px rgba(0,0,0,.3);pointer-events:none;transform:rotate(-38deg)}
.mg-tape.t1{left:-18px;top:14px}
.mg-tape.t2{right:-18px;bottom:14px}
@media (max-width:700px),(max-aspect-ratio:4/5){
 .mg-paper{padding:18px 16px 14px 24px;font-size:17px}
 .mg-bt{font-size:22px}
 .mg-bug{gap:9px}
 .mg-ble div{padding-left:36px}
 .mg-dl{flex-direction:column;gap:8px;padding:8px 16px 19vh}
 .mg-card{width:100%;padding:6px 12px;border-width:5px;border-radius:14px;transform:none;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 10px}
 .mg-cb{margin:0;font-size:12px}
 .mg-cs{font-size:19px}
 .mg-card.bio .mg-cs{font-size:15px}
 .mg-rig{flex-direction:column;width:100%;gap:10px;padding:10px}
 .mg-s1,.mg-s2{width:100%;gap:4px}
 .mg-s1{padding:4px 14px 8px}
 .mg-s2{padding:6px 4px 8px}
 .mg-num{height:30px;font-size:22px;line-height:30px}
 .mg-pad{gap:6px 14px}
 .mg-dk{height:38px;border-radius:19px}
 .mg-dk b{font-size:19px}
 .mg-call{height:40px;display:none}
 .mg-call.on{display:block}
 .mg-wheel{gap:3px}
 .mg-wheel:before{height:42px;margin-top:-15px}
 .mg-col{min-width:40px}
 .mg-col.yr{min-width:64px}
 .mg-arr{height:22px}
 .mg-nb{height:20px;line-height:20px;font-size:14px}
 .mg-cur{height:40px;line-height:40px;font-size:26px}
 .mg-sep{margin-top:12px;font-size:20px}
 .mg-gap{width:4px}
 .mg-set{height:34px}
}`;
  const h = (tag, cls, parent, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  };
  const button = (parent, text, fn, cls) => {
    const b = h('button', cls, parent, text);
    b.type = 'button'; b.tabIndex = -1; b.onclick = fn;
    return b;
  };
  const shell = (cls) => {
    const root = h('div', cls);
    h('style', null, root, CSS);
    root.addEventListener('mousedown', (e) => e.preventDefault()); // Enter/Space stay the engine's YES
    return root;
  };
  const setFocus = (old, el) => { if (old) old.classList.remove('mg-f'); if (el) el.classList.add('mg-f'); return el; };
  const openPops = (api) => (api.popup.count ? api.popup.count() : 0);
  // 'Digit7' / 'Numpad7' -> '7', else ''
  const digitOf = (e) => ((e.code.length === 6 && e.code.startsWith('Digit')) || (e.code.length === 7 && e.code.startsWith('Numpad')) ? e.code[e.code.length - 1] : '');
  // 3 x 4 key grid navigation
  const gridMove = (I, i) => (I.pressed('left') ? (i % 3 ? i - 1 : i + 2) : I.pressed('right') ? (i % 3 === 2 ? i - 2 : i + 1)
    : I.pressed('up') ? (i + 9) % 12 : I.pressed('down') ? (i + 3) % 12 : -1);

  // ---------------------------------------------------------- Alarm Code (1.4)
  // params {digits: 4, onSubmit?(code) -> true|Promise<true> to close, test?} -> {code} | {cancel: true}
  MINIGAMES.keypad = (() => {
    const LAB = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'];
    let M, root, lcd, lcdTop, keys, api, P, digits, code, fi, focusEl, run = 0, phase = 'end', busy;
    function build() {
      root = shell('mg-k');
      const box = h('div', 'mg-kp', root), top = h('div', 'mg-kptop', box);
      box.dataset.noyes = '';
      h('span', null, top, 'SECURA 3000');
      h('i', 'mg-led r', top); h('small', null, top, 'ARMED');
      h('i', 'mg-led', top); h('small', null, top, 'POWER');
      const scr = h('div', 'mg-lcd', box);
      lcdTop = h('div', 'mg-lcdt', scr); lcd = h('div', 'mg-lcdd', scr);
      const grid = h('div', 'mg-kgrid', box);
      keys = LAB.map((l, i) => button(grid, l, () => { if (phase === 'run') { fi = i; focus(); press(i); } },
        'mg-key' + (l === 'C' ? ' c' : l === 'OK' ? ' okk' : '')));
      h('div', 'mg-khint', box, 'YES — enter  ·  NO — delete');
    }
    const focus = () => { focusEl = setFocus(focusEl, keys[fi]); };
    function show() {
      let s = '';
      for (let i = 0; i < digits; i++) s += (i ? ' ' : '') + (code[i] || '_');
      lcd.textContent = s;
    }
    function press(i) {
      if (busy) return;
      const l = LAB[i];
      if (l === 'OK') submit();
      else if (l === 'C') { code = ''; api.sfx('key_beep'); show(); }
      else if (code.length < digits) { code += l; api.sfx('key_beep'); lcdTop.textContent = 'ENTER CODE'; show(); }
      else api.sfx('sad_beep');
    }
    function submit() {
      if (code.length < digits) { api.sfx('sad_beep'); return; }
      const c = code, id = run;
      api.sfx('key_beep');
      if (!P.onSubmit) { fin({ code: c }); return; }
      busy = true; lcdTop.textContent = 'CHECKING…';
      Promise.resolve(P.onSubmit(c)).then((good) => {
        if (id !== run) return;
        busy = false;
        if (good) { lcdTop.textContent = 'DISARMED'; fin({ code: c }); return; }
        api.sfx('sad_beep'); lcdTop.textContent = 'WRONG CODE'; code = ''; show();
      });
    }
    function fin(res) { if (phase === 'end') return; phase = 'end'; api.finish(res); }
    function onKey(e) {
      const d = digitOf(e);
      if (!d || phase !== 'run' || busy) return;
      fi = LAB.indexOf(d); focus(); press(fi);
    }
    M = {
      start(params, a) {
        api = a; P = params || {}; run++; phase = 'run'; busy = false;
        if (!root) build();
        a.ui.appendChild(root);
        digits = P.digits || 4; code = ''; fi = 0; focus(); show();
        lcdTop.textContent = 'ENTER CODE';
        addEventListener('keydown', onKey);
      },
      update() {
        if (phase !== 'run' || busy || openPops(api)) return;
        const I = api.input, g = gridMove(I, fi);
        if (g >= 0) { fi = g; focus(); }
        else if (I.pressed('yes')) { if (code.length >= digits) submit(); else press(fi); }
        else if (I.pressed('no')) { if (code) { code = code.slice(0, -1); api.sfx('key_beep'); show(); } else fin({ cancel: true }); }
      },
      draw() {},
      end() { run++; phase = 'end'; removeEventListener('keydown', onKey); if (root) root.remove(); },
      autoplay(a) {
        if (phase === 'end' || api !== a) M.start(a.params || {}, a);
        const c = String(P.test || '1158'), id = run;
        code = c; show(); busy = true;
        wait(0.4).then(() => P.onSubmit && P.onSubmit(c)).then(() => { if (id === run) fin({ code: c, auto: true }); });
      },
    };
    return M;
  })();

  // ---------------------------------------------------------- The Bug List (1.6)
  // params {extra?: [strings already written on the page]} -> {bugs: [ids]}; also writes state.bugs.
  MINIGAMES.buglist = (() => {
    const SKULL = `<svg width="38" height="42" viewBox="0 0 40 44"><g fill="none" stroke="#000" stroke-width="3.4" stroke-linecap="round"><path d="M20 3C10 3 4 10 4 19c0 6 3 10 7 12v7h18v-7c4-2 7-6 7-12C36 10 30 3 20 3z"/><circle cx="13.5" cy="19" r="4"/><circle cx="26.5" cy="19" r="4"/><path d="M20 24l-3 5h6zM15 38v-5M20 38v-5M25 38v-5"/></g></svg>`;
    let M, root, list, extraEl, doneB, rowsB, offered, ticked, foc, api, P, fi, focusEl, run = 0, phase = 'end';
    function build() {
      root = shell('mg-bl');
      root.dataset.noyes = '';
      const paper = h('div', 'mg-paper', root);
      // The front of this week's targets sheet, showing through the paper (mirrored).
      h('div', 'mg-thru', paper).innerHTML = '<b>WEEKLY SALES TARGETS — REDCLIFFE</b><table>'
        + `<tr><td>Recontracts</td><td>14</td><td>3</td><td>${SKULL}</td></tr><tr><td>New services</td><td>9</td><td>2</td><td></td></tr>`
        + '<tr><td>Accessories</td><td>$750</td><td>$85</td><td></td></tr><tr><td>Home internet</td><td>4</td><td>0</td><td></td></tr>'
        + '<tr><td>NPS</td><td>72</td><td>—</td><td></td></tr></table>';
      h('div', 'mg-bt', paper, 'JARVIS — bugs');
      list = h('div', 'mg-bls', paper);
      extraEl = h('div', 'mg-ble', paper);
      doneB = button(paper, 'DONE', () => { if (phase === 'run') finish(); }, 'mg-done');
      h('div', 'mg-blh', root, 'YES — tick a bug  ·  DONE when finished');
    }
    const focus = () => { focusEl = setFocus(focusEl, foc[fi]); };
    function toggle(i) {
      ticked[i] = !ticked[i];
      rowsB[i].classList.toggle('on', ticked[i]);
      api.sfx('tick');
    }
    function finish() {
      const ids = offered.filter((b, i) => ticked[i]).map((b) => b.id);
      api.state.bugs = ids;
      fin({ bugs: ids });
    }
    function fin(res) { if (phase === 'end') return; phase = 'end'; api.finish(res); }
    M = {
      start(params, a) {
        api = a; P = params || {}; run++; phase = 'run';
        if (!root) build();
        a.ui.appendChild(root);
        offered = BUGS.filter((b) => a.state.flags[b.seen]);
        if (!offered.length) offered = BUGS.slice();
        ticked = offered.map(() => false);
        list.textContent = ''; extraEl.textContent = '';
        rowsB = offered.map((b, i) => {
          const r = button(list, null, () => { if (phase === 'run') { fi = i; focus(); toggle(i); } }, 'mg-bug');
          h('i', null, r); h('span', null, r, b.text);
          return r;
        });
        for (const s of P.extra || []) h('div', null, extraEl, s);
        foc = rowsB.concat(doneB); fi = 0; focusEl = setFocus(focusEl, null); focus();
      },
      update() {
        if (phase !== 'run' || openPops(api)) return;
        const I = api.input;
        if (I.pressed('down') || I.pressed('right')) { fi = (fi + 1) % foc.length; focus(); }
        else if (I.pressed('up') || I.pressed('left')) { fi = (fi + foc.length - 1) % foc.length; focus(); }
        else if (I.pressed('no')) { fi = foc.length - 1; focus(); }
        else if (I.pressed('yes')) { if (fi === foc.length - 1) finish(); else toggle(fi); }
      },
      draw() {},
      end() { run++; phase = 'end'; if (root) root.remove(); },
      autoplay(a) {
        if (phase === 'end' || api !== a) M.start(a.params || {}, a);
        for (let i = 0; i < offered.length; i++) if (!ticked[i]) toggle(i);
        const id = run;
        wait(0.5).then(() => { if (id === run) finish(); });
      },
    };
    return M;
  })();

  // ---------------------------------------------------------- Dial (1.7, 2.7, 3.4)
  // params {mode: '1987'|'home'|'final'} -> {number, date: [dd, mm, yyyy, hh, mi], tries?}
  MINIGAMES.dial = (() => {
    const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
    const SUB = ['', 'ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQRS', 'TUV', 'WXYZ', '', '+', ''];
    const COLS = [['DD', 1, 31], ['MM', 1, 12], ['YYYY', 1900, 2099], ['hh', 0, 23], ['mm', 0, 59]];
    const ORDER = [2, 1, 0, 3, 4]; // compare dates by year, month, day, hour, minute
    const NUM = { 1987: '01 555 1592', home: '07 5550 1987', final: '088 555 2026' };
    const START = { 1987: [29, 9, 2026, 11, 58], home: [7, 10, 2026, 14, 10], final: [27, 10, 1987, 11, 57] };
    const GOAL = { 1987: [6, 10, 1987, 11, 58], final: [20, 10, 2026, 11, 58] };
    const NOW = START.home; // 2.7: "the present" in 2026 the wheel springs back to
    const CRACK = '<svg class="mg-crack" viewBox="0 0 100 100" preserveAspectRatio="none"><path vector-effect="non-scaling-stroke" d="M100 7 L80 19 L71 15 L57 27 L49 25 M80 19 L83 36 L75 49 L78 58 M71 15 L66 2 M83 36 L99 43 M57 27 L55 40" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.2"/></svg>';
    const vals = [0, 0, 0, 0, 0], from = [0, 0, 0, 0, 0], painted = [0, 0, 0, 0, 0];
    let M, root, card, cardT, cardB, cardS, numEl, keyEls, cols, capEl, hintEl, setB, callB, wheelEl, api, P, mode, run = 0, phase = 'end';
    let digits, typed, fk, fc, focusEl, busy, rep, repKey, repT, repS, fast, springT, shakeT, tries, rollTo, rollT, rollDur, rollFn;
    let autoT, badT, badK, hitK, tickT, hum, dragI, dragY;

    const dim = (y, m) => (m === 2 ? (y % 4 ? 28 : y % 100 ? 29 : y % 400 ? 28 : 29) : m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31);
    const hiOf = (c) => (c === 0 ? dim(vals[2], vals[1]) : COLS[c][2]);
    const wrap = (c, v) => { const lo = COLS[c][1], hi = hiOf(c); return c === 2 ? v : v > hi ? lo : v < lo ? hi : v; };
    const txt = (v) => (v < 10 ? '0' + v : '' + v);
    const wheelOn = () => (phase === 'date' || phase === 'wheel') && !busy;

    function build() {
      root = shell('mg-dl');
      card = h('div', 'mg-card', root);
      cardT = h('div', 'mg-ct', card); cardB = h('div', 'mg-cb', card); cardS = h('div', 'mg-cs', card);
      const rig = h('div', 'mg-rig', root);
      rig.dataset.noyes = '';
      // Left: a cracked smartphone showing the keypad.
      const s1 = h('div', 'mg-scr mg-s1', rig);
      s1.insertAdjacentHTML('beforeend', CRACK);
      numEl = h('div', 'mg-num', s1);
      const pad = h('div', 'mg-pad', s1);
      keyEls = KEYS.map((k, i) => {
        const b = button(pad, null, () => { if (phase === 'num' && !busy) { fk = i; focusKey(); key(i); } }, 'mg-dk');
        h('b', null, b, k); h('small', null, b, SUB[i]);
        return b;
      });
      callB = button(s1, 'CALL', () => { if (phase === 'call') call(); }, 'mg-call');
      // Right: another phone's screen, running the date wheel.
      const s2 = h('div', 'mg-scr mg-s2', rig);
      capEl = h('div', 'mg-cap', s2);
      wheelEl = h('div', 'mg-wheel', s2);
      cols = COLS.map((c, i) => {
        if (i === 1 || i === 2) h('span', 'mg-sep', wheelEl, '/');
        if (i === 3) h('span', 'mg-gap', wheelEl);
        if (i === 4) h('span', 'mg-sep', wheelEl, ':');
        const col = h('div', 'mg-col' + (i === 2 ? ' yr' : ''), wheelEl);
        h('small', null, col, c[0]);
        const up = button(col, '▲', null, 'mg-arr');
        const nx = h('div', 'mg-nb', col), cu = h('div', 'mg-cur', col), pv = h('div', 'mg-nb', col);
        const dn = button(col, '▼', null, 'mg-arr');
        holdable(up, i, 1); holdable(dn, i, -1);
        col.addEventListener('wheel', (e) => { e.preventDefault(); if (wheelOn()) { fc = i; focusCol(); bump(i, e.deltaY < 0 ? 1 : -1); } }, { passive: false });
        // Drag: pulling down rolls the higher number (shown above) into the window.
        col.addEventListener('pointerdown', (e) => {
          if (!wheelOn() || e.target.tagName === 'BUTTON') return;
          dragI = i; dragY = e.clientY; fc = i; focusCol();
          col.setPointerCapture(e.pointerId);
        });
        col.addEventListener('pointermove', (e) => {
          if (dragI !== i || !wheelOn()) return;
          while (e.clientY - dragY >= 22) { dragY += 22; bump(i, 1); }
          while (dragY - e.clientY >= 22) { dragY -= 22; bump(i, -1); }
        });
        col.addEventListener('pointerup', () => { dragI = -1; });
        col.addEventListener('pointercancel', () => { dragI = -1; });
        return { col, nx, cu, pv };
      });
      hintEl = h('div', 'mg-hint', s2);
      setB = button(s2, 'SET', () => { if (wheelOn()) setDate(); }, 'mg-set');
      h('i', 'mg-tape t1', rig); h('i', 'mg-tape t2', rig);
    }
    function holdable(b, c, dir) {
      b.onpointerdown = () => { if (wheelOn()) { fc = c; focusCol(); startRep(dir, null); } };
      b.onpointerup = b.onpointerleave = b.onpointercancel = () => { if (!repKey) rep = 0; };
    }
    const focusKey = () => { focusEl = setFocus(focusEl, keyEls[fk]); };
    const focusCol = () => { focusEl = setFocus(focusEl, cols[fc].col); };
    function paint() {
      for (let c = 0; c < 5; c++) {
        const v = vals[c];
        if (painted[c] === v) continue;
        painted[c] = v;
        cols[c].cu.textContent = txt(v);
        cols[c].nx.textContent = c === 2 && v >= 2099 ? '' : txt(wrap(c, v + 1));
        cols[c].pv.textContent = c === 2 && v <= 1900 ? '' : txt(wrap(c, v - 1));
      }
    }
    function tickSfx() { if (tickT <= 0) { tickT = 0.05; api.sfx('tick', { vol: 0.35 }); } }
    function bump(c, d) {
      vals[c] = c === 2 ? Math.max(1900, Math.min(2099, vals[c] + d)) : wrap(c, vals[c] + d);
      const m = dim(vals[2], vals[1]);
      if (vals[0] > m) vals[0] = m;
      painted[0] = -1;
      paint(); tickSfx();
      springT = 0.6;
    }
    function startRep(dir, k) { rep = dir; repKey = k; repT = 0; repS = 0.35; bump(fc, dir); }
    function showNum() {
      const s = NUM[mode];
      let n = 0, i = 0;
      while (i < s.length && n < typed) { if (s[i] !== ' ') n++; i++; }
      numEl.textContent = s.slice(0, i);
    }
    function setCard(kind, t, b, s) {
      card.className = 'mg-card' + (kind ? ' ' + kind : '');
      cardT.textContent = t; cardB.textContent = b; cardS.textContent = s;
    }
    async function talk(who, text) {
      const id = run;
      busy = true;
      await api.say(who, text);
      if (id === run) busy = false;
      return id === run;
    }
    function key(i) {
      if (typed >= digits.length) return;
      if (KEYS[i] !== digits[typed]) { api.sfx('sad_beep'); keyEls[i].classList.add('bad'); badK = i; badT = 0.35; return; }
      typed++; api.sfx('key_beep'); showNum();
      if (typed === digits.length) numDone();
    }
    async function numDone() {
      root.classList.remove('num');
      if (mode === 'home') { toWheel('wheel', 'Set: 29 / 09 / 2026 · 11:59', 0); return; }
      phase = 'talk';
      if (!(await talk('chase', 'When was he there?'))) return;
      setCard('bio', "Luka's phone", 'Rue — CEO', "Business Studies, Trinity College Dublin, class of '88");
      if (!(await talk('chase', 'Uni goes back in October.'))) return;
      toWheel('date', 'Destination', 2);
    }
    function toWheel(ph, cap, col) {
      phase = ph; capEl.textContent = cap;
      hintEl.textContent = '▲ ▼ change  ·  ◀ ▶ move  ·  YES set';
      wheelEl.classList.remove('mg-off'); setB.classList.add('on');
      fc = col; focusCol();
    }
    async function setDate() {
      if (mode === 'home') { springT = 0.01; return; }
      const y = vals[2], m = vals[1];
      const line = y < 1987 ? "He's not there yet." : y > 1987 ? "He's gone by then." : m !== 10 ? "Uni's not on." : '';
      if (line) { await talk('chase', line); return; }
      phase = 'roll'; setB.classList.remove('on'); hintEl.textContent = '';
      roll(GOAL[1987], 1.1, async () => {
        if (await talk('luka', 'Tuesday. Nothing happens on a Tuesday.')) toCall();
      });
    }
    function roll(to, dur, fn) {
      for (let c = 0; c < 5; c++) from[c] = vals[c];
      rollTo = to; rollT = 0; rollDur = dur; rollFn = fn;
      if (Math.abs(to[2] - vals[2]) > 3) cols[2].col.classList.add('fast');
    }
    const below = () => {
      for (let j = 0; j < 5; j++) { const c = ORDER[j]; if (vals[c] !== NOW[c]) return vals[c] < NOW[c]; }
      return false;
    };
    // 2.7: the wheel won't go below the present; it springs forward with a clunk.
    async function spring() {
      api.sfx('clunk');
      for (let c = 0; c < 5; c++) vals[c] = NOW[c];
      paint(); rep = 0;
      wheelEl.classList.add('shake'); shakeT = 0.3;
      if (++tries < 3) return;
      phase = 'talk'; setB.classList.remove('on');
      if (!(await talk('chase', "It won't go back."))) return;
      if (await talk('luka', "It's probably broken. Just call.")) toCall();
    }
    function toCall() {
      phase = 'call'; hintEl.textContent = 'YES — call';
      callB.classList.add('on'); focusEl = setFocus(focusEl, callB);
    }
    function call() { fin({ number: NUM[mode], date: vals.slice(), tries: mode === 'home' ? tries : undefined }); }
    function fin(res) {
      if (phase === 'end') return;
      phase = 'end';
      if (hum) { hum.stop(0.3); hum = null; }
      api.finish(res);
    }
    function onKey(e) {
      const d = digitOf(e);
      if (!d || phase !== 'num' || busy) return;
      fk = KEYS.indexOf(d); focusKey(); key(fk);
    }

    M = {
      start(params, a) {
        api = a; P = params || {}; mode = P.mode || '1987'; run++;
        if (!root) build();
        a.ui.appendChild(root);
        digits = NUM[mode].replace(/ /g, ''); typed = 0; fk = 4; fc = 0; busy = false; rep = 0; repKey = null; fast = -1;
        springT = 0; shakeT = 0; tries = 0; rollTo = null; badT = 0; hitK = -1; tickT = 0; dragI = -1; autoT = 0;
        for (let c = 0; c < 5; c++) { vals[c] = START[mode][c]; painted[c] = -1; cols[c].col.classList.remove('fast'); }
        for (const k of keyEls) k.className = 'mg-dk';
        paint(); showNum();
        focusEl = setFocus(focusEl, null);
        callB.classList.remove('on'); setB.classList.remove('on'); wheelEl.className = 'mg-wheel mg-off';
        hintEl.textContent = ''; capEl.textContent = 'Destination';
        root.classList.toggle('num', mode !== 'final');
        if (mode === '1987') setCard('', "Luka's phone", 'Trinity College Dublin — switchboard:', NUM[1987]);
        else if (mode === 'home') setCard('say', 'Luka', '', NUM.home);   // 2.7: Luka recites the store's number from memory
        else setCard('hide', '', '', '');
        if (mode === 'final') { phase = 'auto'; hum = a.AUDIO.loop ? a.AUDIO.loop('hum', { vol: 0.6 }) : null; }
        else { phase = 'num'; focusKey(); addEventListener('keydown', onKey); }
      },

      update(dt) {
        if (phase === 'end') return;
        const I = api.input;
        if (tickT > 0) tickT -= dt;
        if (badT > 0 && (badT -= dt) <= 0) keyEls[badK].classList.remove('bad');
        if (shakeT > 0 && (shakeT -= dt) <= 0) wheelEl.classList.remove('shake');
        if (rollTo) {
          rollT += dt;
          const k = Math.min(1, rollT / rollDur), e = k * k * (3 - 2 * k);
          for (let c = 0; c < 5; c++) {
            const v = Math.round(from[c] + (rollTo[c] - from[c]) * e);
            if (v !== vals[c]) { vals[c] = v; tickSfx(); }
          }
          paint();
          if (k >= 1) { const fn = rollFn; rollTo = null; cols[2].col.classList.remove('fast'); fn(); }
          return;
        }
        if (phase === 'auto') {
          // 3.4: the brick phone's number and the date dial themselves in.
          autoT += dt;
          if (autoT >= 0.12 && typed < digits.length) {
            autoT = 0;
            if (hitK >= 0) keyEls[hitK].classList.remove('hit');
            hitK = KEYS.indexOf(digits[typed]); keyEls[hitK].classList.add('hit');
            typed++; showNum(); api.sfx('key_beep', { vol: 0.5 });
          } else if (typed === digits.length && autoT > 0.35) {
            if (hitK >= 0) keyEls[hitK].classList.remove('hit');
            phase = 'autoroll'; wheelEl.classList.remove('mg-off');
            roll(GOAL.final, 1.3, () => { autoT = 0; phase = 'hold'; hintEl.textContent = 'Connecting…'; });
          }
          return;
        }
        if (phase === 'hold') { if ((autoT += dt) > 0.5) fin({ number: NUM.final, date: vals.slice() }); return; }
        if (rep) {
          if (repKey && !I.held(repKey)) rep = 0;
          else {
            repT += dt;
            if ((repS -= dt) <= 0) {
              bump(fc, rep);
              repS = Math.max(0.025, 0.12 - repT * 0.05);
              if (repS < 0.07 && fast !== fc) { fast = fc; cols[fc].col.classList.add('fast'); }
            }
          }
        }
        if (!rep && fast >= 0) { cols[fast].col.classList.remove('fast'); fast = -1; }
        if (phase === 'wheel' && springT > 0 && !rep && dragI < 0 && (springT -= dt) <= 0 && below()) spring();
        if (busy || openPops(api)) return;
        if (phase === 'num') {
          const g = gridMove(I, fk);
          if (g >= 0) { fk = g; focusKey(); }
          else if (I.pressed('yes')) key(fk);
        } else if (phase === 'date' || phase === 'wheel') {
          if (I.pressed('left')) { fc = (fc + 4) % 5; focusCol(); }
          else if (I.pressed('right')) { fc = (fc + 1) % 5; focusCol(); }
          else if (!rep && I.pressed('up')) startRep(1, 'up');
          else if (!rep && I.pressed('down')) startRep(-1, 'down');
          else if (I.pressed('yes')) setDate();
        } else if (phase === 'call' && I.pressed('yes')) call();
      },

      draw() {},

      end() {
        run++; phase = 'end'; rep = 0;
        if (hum) { hum.stop(0.3); hum = null; }
        removeEventListener('keydown', onKey);
        if (root) root.remove();
      },

      autoplay(a) {
        if (phase === 'end' || api !== a) M.start(a.params || {}, a);
        const goal = mode === 'home' ? NOW : GOAL[mode];
        typed = digits.length; showNum();
        for (let c = 0; c < 5; c++) vals[c] = goal[c];
        paint();
        if (mode === 'home') tries = 3;
        phase = 'auto-done';
        const id = run;
        wait(0.5).then(() => { if (id === run) { phase = 'call'; call(); } });
      },
    };
    return M;
  })();
})();
