// ============================================================ MINIGAMES: JARVIS Sale + Restart Ritual
// DOM mini-games inside a JARVIS app window, the big sibling of popup() (SPEC §7, §14 Tuning, §16).
// No top-level names: this IIFE only assigns MINIGAMES.jarvis_sale and MINIGAMES.restart_ritual.
(() => {
  const BLUE = CONFIG.colors.jarvis, BAR = CONFIG.colors.jarvisBar;
  const CSS = `
.mg-j{position:fixed;inset:0;pointer-events:none!important;font:14px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1e2430;user-select:none;-webkit-user-select:none}
.mg-j *{box-sizing:border-box}
.mg-win{position:absolute;left:50%;top:43%;width:min(66vw,880px);height:min(64vh,540px);transform:translate(-50%,-50%);display:flex;flex-direction:column;overflow:hidden;background:#fff;color:#2b2f36;border:1px solid #8e96a4;border-radius:3px;box-shadow:0 4px 0 rgba(0,0,0,.18),0 14px 34px rgba(0,0,0,.4);pointer-events:auto}
.mg-win.mg-wait,.mg-win.mg-wait *{cursor:wait!important}
.mg-bar{flex:none;height:30px;display:flex;align-items:center;gap:8px;padding:0 6px 0 10px;background:linear-gradient(#e6e8ec,${BAR});border-bottom:1px solid #aab0ba;color:#4a505c;font-size:12.5px}
.mg-logo{display:flex;align-items:center;gap:5px;font-weight:800;font-style:italic;letter-spacing:.06em;color:${BLUE};font-size:12px}
.mg-logo:before{content:"";width:11px;height:11px;border-radius:2px;background:${BLUE};box-shadow:inset -3px -3px 0 #1d4fa8}
.mg-ttl{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mg-clk{font-variant-numeric:tabular-nums}
.mg-wb{width:22px;height:18px;border:1px solid #a9afba;border-radius:3px;background:#eceef1;color:#8a909b;font-size:11px;line-height:16px;text-align:center}
.mg-body{flex:1;min-height:0;position:relative;display:flex;flex-direction:column;background:#f3f4f7}
.mg-head{flex:none;display:flex;align-items:center;gap:10px;padding:9px 14px;background:#fff;border-bottom:1px solid #dfe2e8}
.mg-h1{font-size:16px;font-weight:600;flex:1;min-width:0}
.mg-sm{font-size:12px;color:#6b7382}
.mg-prog{flex:none;width:30%;height:10px;background:#e3e6eb;border:1px solid #c7ccd5;border-radius:5px;overflow:hidden}
.mg-prog i{display:block;height:100%;background:${BLUE};transform-origin:0 50%}
.mg-rows{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:space-evenly;gap:6px;padding:6px 12px}
.mg-rows.few{justify-content:center;gap:14px}
.mg-row{display:flex;align-items:center;gap:10px;padding:4px 10px;background:#fff;border:1px solid #dde1e7;border-left:4px solid #dde1e7;border-radius:4px;opacity:.45}
.mg-row.on{opacity:1;border-left-color:${BLUE};background:#eef4ff}
.mg-row.ok{opacity:1}
.mg-lab{width:28%;font-size:13px;color:#4a5261}
.mg-lab small{display:block;font-size:11px;color:#8a919d}
.mg-val{flex:1;min-width:0;height:30px;display:flex;align-items:center;padding:0 8px;background:#fff;border:1px solid #c3c9d2;border-radius:3px;font-size:14px;white-space:nowrap;overflow:hidden}
.mg-acts{display:flex;gap:6px}
.mg-btn{font:13.5px system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#fff;height:32px;min-width:44px;padding:0 14px;background:linear-gradient(#4b8cf0,${BLUE});border:1px solid #2459b3;border-radius:3px;box-shadow:inset 0 1px 0 rgba(255,255,255,.3);cursor:pointer;white-space:nowrap}
.mg-btn.dis{background:#c9ced6;border-color:#b3b9c3;color:#f4f5f7;box-shadow:none;cursor:default}
.mg-j .mg-f{outline:3px solid #ffcf3a;outline-offset:1px}
.mg-tick{width:16px;font-weight:800;color:#1c9a47;visibility:hidden}
.mg-row.ok .mg-tick{visibility:visible}
.mg-crash,.mg-cover{position:absolute;inset:0;display:none;flex-direction:column}
.mg-crash{background:#1d4fb6;color:#fff;padding:6% 8%;gap:14px;font-size:17px;white-space:pre-line}
.mg-crash b{font-size:72px;font-weight:300;line-height:1}
.mg-crash small{margin-top:auto;font-size:12px;opacity:.85}
.mg-cover{align-items:center;justify-content:center;gap:16px;background:#f3f4f7;text-align:center;padding:16px}
.mg-spin{flex:none;width:38px;height:38px;border:4px solid #c8d5ee;border-top-color:${BLUE};border-radius:50%;animation:mg-rot .9s linear infinite}
@keyframes mg-rot{to{transform:rotate(360deg)}}
.mg-black{position:absolute;inset:0;background:#000;opacity:0;transition:opacity .35s;pointer-events:none}
.mg-dots{display:flex;gap:10px}
.mg-dots i{width:22px;height:22px;border-radius:50%;background:#dfe3ea;border:2px solid #c3c9d3;transition:transform .08s}
.mg-dots i.on{background:${BLUE};border-color:#1f4fa3}
.mg-dots i.hd{transform:scale(1.35)}
.mg-big{height:56px;min-width:150px;font-size:20px}
.mg-bub{position:absolute;left:0;top:0;max-width:260px;padding:8px 13px;background:#fff;color:#15161a;border:2px solid #15161a;border-radius:16px;font:700 16px/1.25 "Trebuchet MS","Segoe UI",system-ui,sans-serif;opacity:0;transition:opacity .15s}
.mg-bub:after{content:"";position:absolute;left:20px;bottom:-11px;border:9px solid transparent;border-bottom:0;border-top-color:#15161a}
.mg-rit{flex:1;min-height:0;display:flex}
.mg-side{flex:none;width:30%;padding:10px 0;background:#e9ecf1;border-right:1px solid #d3d8df}
.mg-side div{display:flex;align-items:center;gap:9px;padding:9px 14px;color:#7a8190;font-size:14px;border-left:4px solid transparent}
.mg-side div.on{color:#1e2430;font-weight:600;background:#fff;border-left-color:${BLUE}}
.mg-side div.ok{color:#1c9a47}
.mg-side b{flex:none;width:20px;height:20px;border-radius:50%;background:#c9d0da;color:#fff;font-size:12px;display:flex;align-items:center;justify-content:center}
.mg-side .on b{background:${BLUE}}
.mg-side .ok b{background:#1c9a47}
.mg-main{flex:1;min-width:0;position:relative}
.mg-pane{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:16px;text-align:center}
.mg-pane .mg-h1{flex:none}
.mg-pane .mg-prog{width:60%}
.mg-keys{display:flex;align-items:center;gap:12px;font-size:18px;color:#6b7382}
.mg-keys kbd{min-width:76px;padding:12px 14px;background:linear-gradient(#fff,#e6e9ee);border:1px solid #aeb5c0;border-bottom-width:4px;border-radius:8px;font:700 22px system-ui,sans-serif;color:#1e2430}
.mg-msg{min-height:20px;font-size:14px;color:#b3261e}
.mg-msg.good,.mg-rule.good{color:#1c9a47}
.mg-crumb{font-size:12px;color:#6b7382}
.mg-menu{display:flex;flex-direction:column;gap:6px;width:min(320px,100%)}
.mg-menu .mg-btn{height:38px;text-align:left;background:#fff;color:#2b2f36;border:1px solid #c3c9d2;box-shadow:none}
.mg-form{display:grid;grid-template-columns:auto 1fr;gap:8px 10px;align-items:center;width:min(360px,100%);text-align:left}
.mg-in{font:15px system-ui,sans-serif;height:34px;padding:0 8px;border:1px solid #aeb5c0;border-radius:3px;width:100%;outline:0;user-select:text;-webkit-user-select:text;pointer-events:auto}
.mg-rule{min-height:18px;font-size:14px;font-weight:600;color:#b3261e}
.mg-link{background:none;border:0;color:${BLUE};text-decoration:underline;font:600 14px system-ui,sans-serif;cursor:pointer;padding:4px 8px}
.mg-hands{position:relative;width:100%;height:44%;min-height:110px}
.mg-hands svg{position:absolute;bottom:0;height:100%;width:auto}
@media (max-width:700px),(max-aspect-ratio:4/5){
 .mg-win{width:calc(100vw - 32px);height:62vh;top:40%}
 .mg-wb,.mg-pl{display:none}
 .mg-head{padding:6px 10px}
 .mg-head .mg-h1{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .mg-rows{gap:4px;padding:6px 8px}
 .mg-row{flex-wrap:wrap;row-gap:2px;gap:6px;padding:3px 8px 4px}
 .mg-lab{width:100%;display:flex;gap:8px;align-items:baseline;font-size:12px}
 .mg-lab small{display:inline}
 .mg-val{height:28px;font-size:13px}
 .mg-row .mg-btn{height:28px;padding:0 10px;font-size:12.5px}
 .mg-prog{width:30%}
 .mg-rit{flex-direction:column}
 .mg-side{width:auto;display:flex;padding:0;border-right:0;border-bottom:1px solid #d3d8df}
 .mg-side div{flex:1;flex-direction:column;gap:2px;padding:6px 2px;font-size:11px;border-left:0;border-top:3px solid transparent}
 .mg-side div.on{border-top-color:${BLUE}}
}`;
  const h = (tag, cls, parent, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  };
  const button = (parent, text, fn, cls) => {
    const b = h('button', 'mg-btn' + (cls ? ' ' + cls : ''), parent, text);
    b.type = 'button'; b.tabIndex = -1; b.onclick = fn;
    return b;
  };
  // The JARVIS app window. Built once per module; re-attached to api.ui on each start.
  const frame = () => {
    const root = h('div', 'mg-j');
    h('style', null, root, CSS);
    const win = h('div', 'mg-win', root), bar = h('div', 'mg-bar', win);
    h('span', 'mg-logo', bar, 'JARVIS');
    const ttl = h('span', 'mg-ttl', bar), clk = h('span', 'mg-clk', bar);
    for (const c of '–□×') h('span', 'mg-wb', bar, c);
    const body = h('div', 'mg-body', win);
    win.dataset.noyes = ''; // clicks inside the window are not the engine's YES
    // Keep browser focus off our buttons so Enter/Space only reach the engine as YES.
    root.addEventListener('mousedown', (e) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
    return { root, win, ttl, clk, body };
  };
  const openPops = (api) => (api.popup.count ? api.popup.count() : 0);
  const setFocus = (old, el) => { if (old) old.classList.remove('mg-f'); if (el) el.classList.add('mg-f'); return el; };
  const narrow = () => innerWidth < 700 || innerWidth < innerHeight * 0.8;

  // ---------------------------------------------------------- JARVIS Sale (1.2, 1.3 hard, epilogue)
  // params {cycle: 1|2|3, cap: s, mode: 'margaret'|'dazza'|'reprise', short, time: '09:14', shot}
  // result {crashed: true, reason: 'optin'|'cap'|'e4044', beat?: [8 bools] (reprise taps)}
  MINIGAMES.jarvis_sale = (() => {
    const ROWS = {
      search: ['Customer search', 'Search'], dob: ['Date of birth', ''], id: ['ID scan', 'Scan ID'],
      mfa: ['MFA code', 'Send code'], plan: ['Plan', 'Choose plan'], service: ['Add service', 'Add line'],
      optin: ['Marketing opt-in', ''], verify: ['ID verification', 'Verify ID'],
      verify2: ['Verification of ID verification', 'Verify'],
    };
    const DONE = {
      search: 'MARGARINE', dob: '12 / 04 / 1947', id: 'Driver licence — verified', mfa: 'Skipped (too many attempts)',
      plan: 'Yes Plus 50GB — $65/mth', service: 'New line: grandson', verify: 'ID verified (pending verification)',
    };
    const POPS = [
      ['JARVIS has detected unusual activity. Continue?', ['YES', 'NO'], 'warn'],
      ['A new version of JARVIS is available.', ['LATER', 'INSTALL'], 'info'],
      ['Your session will expire soon. Extend session?', ['YES', 'NO'], 'warn'],
      ['Reminder: offer the customer a phone case.', ['OK'], 'info'],
      ['Are you sure you want to continue?', ['YES', 'NO'], 'warn'],
      ['JARVIS is not responding.', ['WAIT', 'WAIT'], 'error'],
      ['Please acknowledge this message.', ['ACKNOWLEDGE'], 'info'],
      ['How are we doing? Rate JARVIS: ★☆☆☆☆', ['SUBMIT', 'LATER'], 'info'],
      ['Unsaved changes may have been saved.', ['OK'], 'warn'],
      ['Did you know? JARVIS can help you sell more.', ['OK', 'TELL ME MORE'], 'info'],
    ];
    const BARKS = ['Come on.', 'Please.', 'Why is it asking me that?', "You're a computer. You know what a date is."];
    const YEAR = 1947, DODGE = [0], STEP = 0.25, BARS = 5;
    const pat = [false, false, false, false, false, false, false, false];
    let M, F, api, P, mode, run = 0, rows, rowsEl, h1, fill, pctEl, crashEl, crashMsg, spinEl, tapEl, dots, black, bub, V;
    let cur, t, cap, phase = 'end', phaseT, reason, prog, shown, idle, nextPop, lastPop, blocked, busy, rowT, typing, typeT;
    let hold, holdKey, holdT, stepT, settle, optF, focusEl, barkT, barkUsed = 0, bubT, blipN, blipT, bubQ, lastStep, skipStep, quiet, fillT;

    function build() {
      F = frame();
      const head = h('div', 'mg-head', F.body);
      h1 = h('div', 'mg-h1', head);
      h('span', 'mg-sm mg-pl', head, 'Progress');
      fill = h('i', null, h('div', 'mg-prog', head));
      pctEl = h('span', 'mg-sm', head);
      rowsEl = h('div', 'mg-rows', F.body);
      crashEl = h('div', 'mg-crash', F.body);
      h('b', null, crashEl, ':(');
      crashMsg = h('div', null, crashEl);
      h('small', null, crashEl, 'JARVIS © 1987–2026 JARVIS SYSTEMS. All rights reserved.');
      spinEl = h('div', 'mg-cover', F.body);
      spinEl.style.background = 'rgba(243,244,247,.55)';
      h('div', 'mg-spin', spinEl).style.cssText = 'width:64px;height:64px;border-width:7px';
      tapEl = h('div', 'mg-cover', F.body);
      h('div', 'mg-spin', tapEl);
      h('div', 'mg-h1', tapEl, 'JARVIS is restarting…').style.flex = 'none';
      dots = h('div', 'mg-dots', tapEl);
      for (let i = 0; i < 8; i++) h('i', null, dots);
      setFocus(null, button(tapEl, 'YES', () => tap(), 'mg-big'));
      h('div', 'mg-sm', tapEl, 'Tap YES along with the chime.');
      black = h('div', 'mg-black', F.body);
      bub = h('div', 'mg-bub', F.root);
      F.win.addEventListener('pointermove', () => { idle = 0; });
    }

    function makeRows(kinds) {
      rowsEl.textContent = '';
      rows = kinds.map((k) => {
        const r = { k, n: k === 'dob' ? 1900 : 0, ok: false, btns: [], el: h('div', 'mg-row', rowsEl) };
        const lab = h('div', 'mg-lab', r.el, ROWS[k][0]);
        if (k === 'dob') h('small', null, lab, 'She said 12 April 1947');
        r.val = h('div', 'mg-val', r.el, k === 'dob' ? '12 / 04 / 1900' : k === 'optin' ? 'Send me offers from JARVIS partners' : '');
        const acts = h('div', 'mg-acts', r.el);
        if (k === 'dob') r.btns.push(holdBtn(acts, '◀', -1), holdBtn(acts, '▶', 1));
        else if (k === 'optin') r.btns.push(button(acts, 'YES', () => optin(0)), button(acts, 'NO', () => optin(1), 'dis'));
        else r.btns.push(button(acts, ROWS[k][1], () => { if (rows[cur] === r && ready()) act(r); }));
        h('span', 'mg-tick', r.el, '✓');
        return r;
      });
    }
    // Date picker arrows: one year per click, hold to accelerate.
    function holdBtn(parent, text, dir) {
      const b = button(parent, text, null);
      b.onpointerdown = () => { if (rows[cur] && rows[cur].k === 'dob' && ready()) startHold(dir, null); };
      b.onpointerup = b.onpointerleave = b.onpointercancel = () => { if (!holdKey) hold = 0; };
      return b;
    }
    const ready = () => phase === 'form' && !busy && !typing && rowT <= 0;
    function startHold(dir, key) {
      hold = dir; holdKey = key; holdT = 0; stepT = 0.4;
      focusEl = setFocus(focusEl, rows[cur].btns[dir < 0 ? 0 : 1]);
      stepYear(dir);
    }
    function stepYear(d) {
      const r = rows[cur];
      r.n = Math.max(1900, Math.min(2026, r.n + d)); settle = 0; idle = 0;
      r.val.textContent = '12 / 04 / ' + r.n;
    }
    function pop(msg, buttons, icon, at, title, dodge) {
      api.state.flags.seen_popups = true;
      return api.popup({ msg, buttons, icon, title: title || 'JARVIS', ding: true, dodge,
        at: at || [narrow() ? 50 : 28 + Math.random() * 44, 24 + Math.random() * 40] });
    }
    // Run fn when that popup is answered, unless the cycle has crashed or ended meanwhile.
    function after(p, fn) {
      busy = true; const id = run;
      p.done.then(() => { if (id === run && phase === 'form') { busy = false; fn(); } });
    }
    function act(r) {
      idle = 0;
      if (r.k === 'search') { typing = mode === 'dazza' ? 'DARREN' : 'MARGARET'; typeT = 0; r.val.textContent = ''; }
      else if (r.k === 'id') {
        if (r.n++) { r.val.textContent = 'Scanning…'; rowT = 1.2; }
        else { r.val.textContent = 'Scanner not found'; pop('Scanner not found. Did you mean: Scanner?', ['YES', 'NO'], 'error'); }
      } else if (r.k === 'mfa') {
        if (!r.n++) {
          api.state.flags.seen_mfa = true;
          r.val.textContent = "Code sent to customer's phone";
          r.btns[0].textContent = 'Resend';
          pop("An MFA code has been sent to the customer's phone.", ['OK'], 'info', 'center');
        } else after(pop('Too many attempts. Verification skipped.', ['OK'], 'warn'), () => done(r));
      } else if (r.k === 'plan') done(r);
      else if (r.k === 'service' || r.k === 'verify') { r.val.textContent = 'Please wait…'; rowT = 1.3; }
      else if (r.k === 'verify2') {
        r.val.textContent = 'Verifying verification…';
        phase = 'spin'; phaseT = 0; F.win.classList.add('mg-wait'); spinEl.style.display = 'flex';
      }
    }
    function done(r, quiet) {
      r.ok = true; r.el.classList.add('ok'); r.el.classList.remove('on');
      if (DONE[r.k] && mode !== 'dazza') r.val.textContent = DONE[r.k];
      else if (r.k === 'verify') r.val.textContent = 'ID verified (pending verification)';
      if (r.k === 'dob') r.n = YEAR;
      for (const b of r.btns) b.classList.add('dis');
      if (!quiet) { idle = 0; next(); }
    }
    function next() {
      cur = rows.findIndex((r) => !r.ok);
      const r = rows[cur];
      optF = 0;
      if (!r) return;
      r.el.classList.add('on');
      focusEl = setFocus(focusEl, r.btns[r.k === 'dob' ? 1 : 0]);
    }
    const partial = (r) => (r.k === 'dob' ? r.n > 1900 : (r.k === 'mfa' || r.k === 'id') && r.n > 0);
    function randomPop() {
      const r = rows[cur];
      if (r && !r.ok && rowT <= 0 && !busy && partial(r) && Math.random() < 0.4) {
        // "Progress saved!" clears the current field.
        if (r.k === 'dob') { r.n = 1900; r.val.textContent = '12 / 04 / 1900'; hold = 0; }
        else { r.n = 0; r.val.textContent = ''; r.btns[0].textContent = ROWS[r.k][1]; }
        pop('Progress saved!', ['OK'], 'info');
        return;
      }
      let i = Math.floor(Math.random() * POPS.length);
      if (i === lastPop) i = (i + 1) % POPS.length;
      // About a third run away; make sure the first cycle shows one by its second pop-up.
      const force = !api.state.flags.seen_runaway && lastPop >= 0;
      while (force && POPS[i][1].length < 2) i = (i + 1) % POPS.length;
      lastPop = i;
      const p = POPS[i], dodge = p[1].length > 1 && (force || Math.random() < 0.5);
      if (dodge) api.state.flags.seen_runaway = true;
      pop(p[0], p[1], p[2], null, null, dodge ? DODGE : undefined);
    }
    function optin(i) {
      if (!ready() || !rows[cur] || rows[cur].k !== 'optin') return;
      if (i) api.sfx('clunk');
      else crash('optin');
    }
    function crash(why) {
      if (phase !== 'form' && phase !== 'spin') return;
      phase = 'crash'; phaseT = 0; reason = why; hold = 0; typing = null;
      if (api.popup.clear) api.popup.clear();
      const f = api.state.flags;
      f.seen_restarts = true;
      if (why === 'optin') f.seen_optin = true;
      // 1.2 cycle 3 and 1.3 end on the opt-in click / the spinning wheel: the cutscene after carries the crash
      if (quiet) { if (mode === 'dazza') { F.win.classList.add('mg-wait'); spinEl.style.display = 'flex'; } return; }
      api.sfx('crash');
      crashMsg.textContent = mode === 'dazza'
        ? 'JARVIS has encountered a problem and needs to restart.\n\nError 4044\nCustomer not found. User not found. JARVIS not found.'
        : 'JARVIS has stopped responding and needs to restart.\n\nAny unsaved progress has been lost.\nAll progress was unsaved.';
      F.win.classList.remove('mg-wait');
      spinEl.style.display = 'none'; crashEl.style.display = 'flex'; bub.style.opacity = '0';
    }
    function fin(res) {
      if (phase === 'end') return;
      phase = 'end';
      api.finish(res);
    }
    // Epilogue: after the crash the restart chime loops; YES taps are recorded and played back as a beat.
    function startTap() {
      phase = 'tap'; phaseT = 0; lastStep = -1; skipStep = -1; pat.fill(false);
      for (let i = 0; i < 8; i++) dots.children[i].className = '';
      crashEl.style.display = 'none'; black.style.opacity = '0'; tapEl.style.display = 'flex';
      F.ttl.textContent = 'JARVIS — Restarting';
    }
    function tap() {
      if (phase !== 'tap') return;
      api.sfx('knock');
      const s = Math.round(phaseT / STEP);
      pat[s % 8] = true; skipStep = s;
      dots.children[s % 8].classList.add('on');
    }
    // Chase's barks: random, no repeats, a small bubble near his head (not the dialogue box).
    function bark() {
      if (barkUsed === 15) return;
      let i = Math.floor(Math.random() * 4);
      while (barkUsed & (1 << i)) i = (i + 1) % 4;
      barkUsed |= 1 << i;
      const s = BARKS[i];
      bub.textContent = s; bubT = 2.3; blipN = Math.ceil(s.length / 3); blipT = 0; bubQ = s.endsWith('?');
      let x = innerWidth * 0.04, y = innerHeight * 0.74;
      const a = api.world && api.world.actor && api.world.actor('chase');
      if (a && api.cam && api.cam.project) {
        V = V || new THREE.Vector3();
        a.headPos(V); V.y += 0.3;
        const p = api.cam.project(V);
        if (p && p.visible) { x = p.x - 24; y = p.y; }
      }
      x = Math.max(8, Math.min(innerWidth - 270, x)); y = Math.max(70, Math.min(innerHeight - 20, y));
      bub.style.transform = 'translate(' + x + 'px,' + y + 'px) translateY(-100%)';
      bub.style.opacity = '1';
    }

    M = {
      start(params, a) {
        api = a; P = params || {}; mode = P.mode || 'margaret'; run++;
        if (!F) build();
        a.ui.appendChild(F.root);
        const cyc = P.cycle || 1, short = P.short || cyc === 3;
        if (cyc === 1) barkUsed = 0;
        cap = P.cap || (mode === 'dazza' ? 40 : mode === 'reprise' ? 25 : 50);
        F.ttl.textContent = mode === 'dazza' ? 'JARVIS Retail — SIM Swap' : 'JARVIS Retail — New Service';
        h1.textContent = mode === 'dazza' ? 'SIM swap' : 'Add a line to an existing plan';
        F.clk.textContent = P.time || '';
        makeRows(mode === 'dazza' ? ['search', 'verify', 'verify2'] : ['search', 'dob', 'id', 'mfa', 'plan', 'service', 'optin']);
        rowsEl.className = rows.length < 5 ? 'mg-rows few' : 'mg-rows';
        // Cycle 2 remembers exactly the wrong thing; the reprise starts near the opt-in box; cycle 3 opens on the
        // blank form and whips down it on autopilot (fillT) to the opt-in box.
        quiet = mode === 'dazza' || (mode === 'margaret' && short);
        fillT = mode === 'margaret' && short ? 0.4 : 0;
        for (const r of rows) {
          if (mode === 'dazza' || r.k === 'optin' || fillT) continue;
          if (short || (mode === 'reprise' ? r.k !== 'search' : r.k === 'search' && cyc > 1)) done(r, true);
        }
        pat.fill(false);
        phase = 'form'; t = 0; idle = 0; rowT = 0; busy = fillT > 0; typing = null; hold = 0; holdKey = null;
        blocked = false; lastPop = -1; nextPop = short ? 1.5 : 2.5; barkT = 5 + Math.random() * 3; bubT = 0; shown = -1;
        focusEl = setFocus(focusEl, null);
        next();
        let k = 0;
        for (const r of rows) if (r.ok) k++;
        prog = 100 * k / rows.length;
        crashEl.style.display = spinEl.style.display = tapEl.style.display = 'none';
        black.style.opacity = '0'; bub.style.opacity = '0';
        F.win.classList.remove('mg-wait');
        if (P.shot && a.cam && a.cam.shot) a.cam.shot(P.shot);
      },

      update(dt) {
        if (phase === 'end') return;
        const I = api.input;
        if (bubT > 0) {
          bubT -= dt;
          if (blipN > 0 && (blipT -= dt) <= 0) { blipN--; blipT = 0.07; api.AUDIO.blip('chase', bubQ && blipN === 0); }
          if (bubT <= 0) bub.style.opacity = '0';
        }
        if (phase === 'crash') {
          phaseT += dt;
          if (quiet) { if (phaseT > 0.25) fin({ crashed: true, reason }); return; }
          if (phaseT > 1.4) black.style.opacity = '1';
          if (phaseT > 1.9) { if (mode === 'reprise') startTap(); else fin({ crashed: true, reason }); }
          return;
        }
        if (phase === 'tap') {
          phaseT += dt;
          if (I.pressed('yes')) tap();
          const s = Math.floor(phaseT / STEP);
          if (s === lastStep) return;
          if (lastStep >= 0) dots.children[lastStep % 8].classList.remove('hd');
          lastStep = s;
          if (s >= BARS * 8) { fin({ crashed: true, reason, beat: pat.slice() }); return; }
          dots.children[s % 8].classList.add('hd');
          if (s % 8 === 0) api.sfx('restart_chime');
          if (pat[s % 8] && s !== skipStep) api.sfx('knock');
          return;
        }
        if ((t += dt) >= cap) { crash('cap'); return; }
        if (phase === 'spin') { if ((phaseT += dt) > 2.6) crash('e4044'); return; }
        if (fillT > 0 && (fillT -= dt) <= 0) {   // cycle 3's autopilot: one row ticked every 0.15 s
          const r = rows[cur];
          if (r && r.k !== 'optin') { done(r); api.sfx('tick'); fillT = 0.15; } else busy = false;
        }

        // ---- the form
        const n = openPops(api), block = n > 0 || blocked;
        blocked = n > 0;
        if (I.pressed('yes') || I.pressed('no') || I.pressed('left') || I.pressed('right') || I.pressed('up') || I.pressed('down')) idle = 0;
        if ((nextPop -= dt) <= 0) { nextPop = 4 + Math.random() * 3; if (n < 4) randomPop(); }
        if (mode === 'margaret' && (barkT -= dt) <= 0) { barkT = 12 + Math.random() * 6; bark(); }
        const r = rows[cur];
        if (typing && (typeT += dt) >= 0.09) {
          typeT = 0;
          const len = r.val.textContent.length + 1;
          r.val.textContent = typing.slice(0, len);
          if (len >= typing.length) {
            const was = typing;
            typing = null;
            if (was === 'DARREN') done(r);
            else {
              api.state.flags.seen_margarine = true;
              after(pop('Did you mean: MARGARINE?', ['YES', 'YES'], 'info', 'center', 'JARVIS Autocorrect'), () => done(r));
            }
          }
        }
        if (rowT > 0 && (rowT -= dt) <= 0) {
          if (r.k === 'verify') after(pop('ID verified. Please verify your ID verification.', ['OK'], 'warn', 'center'), () => done(r));
          else done(r);
        }
        if (hold) {
          if (holdKey && !I.held(holdKey)) hold = 0;
          else {
            holdT += dt;
            if ((stepT -= dt) <= 0) { stepYear(hold); stepT = Math.max(0.02, 0.12 - holdT * 0.04); }
          }
        }
        if (r && r.k === 'dob' && !hold && r.n === YEAR && (settle += dt) > 0.4) done(r);
        if (r !== rows[cur]) return; // the row just changed: its YES belongs to the old row
        if (!block && r && ready()) {
          if (r.k === 'dob') {
            if (!hold) {
              if (I.pressed('right')) startHold(1, 'right');
              else if (I.pressed('yes')) startHold(1, 'yes');
              else if (I.pressed('left')) startHold(-1, 'left');
            }
          } else if (r.k === 'optin') {
            if (I.pressed('left') || I.pressed('right')) { optF ^= 1; focusEl = setFocus(focusEl, r.btns[optF]); }
            else if (I.pressed('yes')) optin(optF);
          } else if (I.pressed('yes')) act(r);
        }
        // The progress bar drains 5%/s while the player is idle.
        let k = 0;
        for (let i = 0; i < rows.length; i++) if (rows[i].ok) k++;
        const target = 100 * k / rows.length;
        if ((idle += dt) > 1.2) {
          prog = Math.max(0, prog - 5 * dt);
          if (prog < target - 4) api.state.flags.seen_backwards = true;
        } else if (prog < target) prog = Math.min(target, prog + 40 * dt);
      },

      draw() {
        if (phase !== 'form' && phase !== 'spin') return;
        const p = Math.round(prog);
        if (p === shown) return;
        shown = p;
        fill.style.transform = 'scaleX(' + p / 100 + ')';
        pctEl.textContent = p + '%';
      },

      end() {
        run++; phase = 'end'; hold = 0;
        if (api && api.popup.clear) api.popup.clear();
        if (F) F.root.remove();
      },

      autoplay(a) {
        if (phase === 'end' || api !== a) M.start(a.params || {}, a);
        const f = a.state.flags, short = P.short || P.cycle === 3;
        f.seen_popups = true;
        if (mode !== 'dazza') f.seen_margarine = true;
        if (mode === 'margaret' && !short) f.seen_runaway = f.seen_backwards = f.seen_mfa = true;
        crash(mode === 'dazza' ? 'e4044' : mode === 'reprise' || short ? 'optin' : 'cap');
        const id = run;
        wait(0.6).then(() => { if (id === run) fin({ crashed: true, reason, auto: true, beat: mode === 'reprise' ? pat.slice() : undefined }); });
      },
    };
    return M;
  })();

  // ---------------------------------------------------------- Restart Ritual (1.3)
  // Alt-tab, clear cache, log out, log in, pray. Each prompt repeats until done. result {done: true}
  MINIGAMES.restart_ritual = (() => {
    const STEPS = ['Alt-tab', 'Clear cache', 'Log out', 'Log in', 'Pray'];
    // [label, key label, modifier flag, KeyboardEvent.code] - all combos a browser tab can capture.
    const COMBOS = [['CTRL', 'R', 'ctrlKey', 'KeyR'], ['CTRL', 'S', 'ctrlKey', 'KeyS'], ['CTRL', 'Z', 'ctrlKey', 'KeyZ'],
      ['ALT', 'J', 'altKey', 'KeyJ'], ['SHIFT', 'DEL', 'shiftKey', 'Delete']];
    const CODES = ['KeyR', 'KeyS', 'KeyZ', 'KeyJ', 'Delete'];
    // level: [breadcrumb, parent, [[label, reply | '>level' | '<' back | '!' the one]]]
    const MENU = {
      home: ['JARVIS Home', null, [['Dashboard', 'Dashboard is loading. Estimated time: 9 minutes.'],
        ['My Targets', 'You are 94% behind target. Keep it up!'], ['Settings', '>set'], ['Help', 'Help is unavailable. Please contact Help.']]],
      set: ['Settings', 'home', [['Display', 'Theme: JARVIS Blue. Other themes: JARVIS Blue.'],
        ['Notifications', 'Notifications are mandatory.'], ['Advanced', '>adv'], ['‹ Back', '<']]],
      adv: ['Settings › Advanced', 'set', [['Clear Cookies', 'Cookies cleared. Cache remains.'],
        ['Reset JARVIS', 'Reset requires manager approval.'], ['More Advanced', '>more'], ['‹ Back', '<']]],
      more: ['Settings › Advanced › More Advanced', 'adv', [['Clear Cash', 'Insufficient permissions to clear cash.'],
        ['Clear Catch', 'No catch found.'], ['Clear Cache', '!'], ['‹ Back', '<']]],
    };
    const RULES = ['Must contain a number', 'Must not contain a number', 'Must contain the name of your first pet', 'Must not be Biscuit'];
    const TRIES = ['hunter2', 'hunter', 'Biscuit', 'Biscuit'];
    const DIGIT = /\d/, WORD = /[a-z]{4}/i;
    // One of Luka's hands, inner edge on the right; two of them meet in a pointed arch.
    const HAND = '<svg viewBox="0 0 64 170"><g stroke="#6b4228" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M6 168 V96 Q6 44 34 14 Q48 2 61 2 V168 Z" fill="#dba47b"/><path d="M22 78 Q26 48 44 22 M36 88 Q40 52 56 22" fill="none" stroke="#b27b55" stroke-width="2.5"/><path d="M61 152 V110 Q61 94 50 94 Q39 96 39 110 V144" fill="#cf946a"/></g></svg>';
    let M, F, api, P, run = 0, phase = 'end', side, panes, msgs, step, busy, blocked, foc, fi, focusEl, later, laterFn;
    let combo, kbd1, kbd2, plus, cdFill, sub, subT, hit, armed, lvl, crumb, mbtns, logoutB;
    let pw, val, ruleEl, loginB, forgotB, rule, ruleT, goodT, ruleFrom, changes, typeTo, typeT;
    let hands, handL, handR, prayHint, prayFill, pray, drawn;

    function build() {
      F = frame();
      F.ttl.textContent = 'JARVIS Retail — Session Recovery';
      const wrap = h('div', 'mg-rit', F.body);
      side = h('div', 'mg-side', wrap);
      STEPS.forEach((s, i) => { const d = h('div', null, side); h('b', null, d, String(i + 1)); h('span', null, d, s); });
      const main = h('div', 'mg-main', wrap);
      panes = STEPS.map(() => h('div', 'mg-pane', main));
      msgs = [];
      // 1 Alt-tab
      let p = panes[0];
      h('div', 'mg-h1', p, 'Switch windows to wake JARVIS');
      const keys = h('div', 'mg-keys', p);
      kbd1 = h('kbd', null, keys); plus = h('span', null, keys, '+'); kbd2 = h('kbd', null, keys);
      h('div', 'mg-sm', p, '(JARVIS has remapped Alt-tab.)');
      cdFill = h('i', null, h('div', 'mg-prog', p));
      msgs[0] = h('div', 'mg-msg', p);
      // 2 Clear cache
      p = panes[1];
      h('div', 'mg-h1', p, 'Clear cache');
      crumb = h('div', 'mg-crumb', p);
      const menu = h('div', 'mg-menu', p);
      mbtns = [0, 1, 2, 3].map((i) => button(menu, '', () => { if (ok()) { setF(i); pick(i); } }));
      msgs[1] = h('div', 'mg-msg', p);
      // 3 Log out
      p = panes[2];
      h('div', 'mg-h1', p, 'Signed in as LUKA (2IC, Redcliffe)');
      logoutB = button(p, 'Log out', () => { if (ok()) logout(); }, 'mg-big');
      msgs[2] = h('div', 'mg-msg', p);
      // 4 Log in
      p = panes[3];
      h('div', 'mg-h1', p, 'Log in to JARVIS');
      const form = h('div', 'mg-form', p);
      h('span', 'mg-sm', form, 'Username'); h('div', 'mg-val', form, 'LUKA');
      h('span', 'mg-sm', form, 'Password');
      pw = h('input', 'mg-in', form);
      pw.type = 'text'; pw.spellcheck = false; pw.autocomplete = 'off'; pw.tabIndex = -1;
      // The engine ignores keys typed into a field, so the field does its own YES / up / down.
      pw.addEventListener('keydown', (e) => {
        if (step !== 3 || !ok()) return;
        if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); typeTo = TRIES[rule]; typeT = 0; }
        else if (e.code === 'ArrowDown' || e.code === 'Escape') { e.preventDefault(); setF(1); }
        else if (e.code === 'ArrowUp') { e.preventDefault(); setF(foc.length - 1); }
      });
      pw.addEventListener('input', () => { val = pw.value; typeTo = null; });
      pw.addEventListener('pointerdown', () => { if (step === 3) { setF(0); pw.focus(); } });
      ruleEl = h('div', 'mg-rule', p);
      loginB = button(p, 'Log in', () => { if (ok()) { setF(1); login(); } });
      forgotB = h('button', 'mg-link', p, 'Forgot password?');
      forgotB.type = 'button'; forgotB.tabIndex = -1;
      forgotB.onclick = () => { if (ok()) forgot(); };
      msgs[3] = h('div', 'mg-sm', p);
      // 5 Pray
      p = panes[4];
      h('div', 'mg-h1', p, 'Pray');
      hands = h('div', 'mg-hands', p);
      hands.innerHTML = HAND + HAND;
      handL = hands.children[0]; handR = hands.children[1];
      handL.style.right = '50%'; handR.style.left = '50%';
      prayHint = h('div', 'mg-sm', p);
      prayFill = h('i', null, h('div', 'mg-prog', p));
      msgs[4] = h('div', 'mg-msg', p);
    }
    const ok = () => phase === 'run' && !busy && later <= 0;
    const say = (i, text, good) => { msgs[i].textContent = text; msgs[i].className = good ? 'mg-msg good' : 'mg-msg'; };
    const after = (sec, fn) => { later = sec; laterFn = fn; };
    function setF(i) {
      if (!foc.length) return;
      fi = (i + foc.length) % foc.length;
      focusEl = setFocus(focusEl, foc[fi]);
      if (step === 3) { if (foc[fi] === pw && api.input.scheme === 'kb') pw.focus(); else pw.blur(); }
    }
    function show(i) {
      if (step >= 0) { side.children[step].className = 'ok'; panes[step].style.display = 'none'; }
      step = i;
      side.children[i].className = 'on'; panes[i].style.display = 'flex';
      foc = [];
      drawn = -1;
      if (i === 0) newCombo();
      else if (i === 1) { foc = mbtns; menuShow('home'); }
      else if (i === 2) { foc = [logoutB]; say(2, ''); }
      else if (i === 3) {
        foc = [pw, loginB]; val = ''; pw.value = ''; rule = 0; ruleT = 0; goodT = 0; changes = 0; ruleFrom = ''; typeTo = null;
        forgotB.style.display = 'none'; showRule();
        msgs[3].textContent = 'Type a password, or press YES and let Luka try.';
      } else { pray = 0; drawn = -1; delete F.win.dataset.noyes; prayHint.textContent = api.input.scheme === 'kb' ? 'Hold YES and NO together (Space + Esc).' : 'Hold YES and NO together.'; say(4, ''); }
      setF(0);
    }
    function done() {
      api.sfx('pop');
      if (step < 4) { show(step + 1); return; }
      side.children[4].className = 'ok';
      say(4, 'JARVIS has restarted. Welcome back, LUKA.', true);
      api.sfx('restart_chime');
      after(1.2, () => fin({ done: true }));
    }
    function fin(res) { if (phase === 'end') return; phase = 'end'; api.finish(res); }
    // 1 Alt-tab: the combo within 1.5 s (touch/pad: YES then NO).
    function newCombo() {
      combo = COMBOS[Math.floor(Math.random() * COMBOS.length)];
      const kb = api.input.scheme === 'kb';
      kbd1.textContent = kb ? combo[0] : 'YES'; kbd2.textContent = kb ? combo[1] : 'NO'; plus.textContent = kb ? '+' : 'then';
      sub = 'go'; subT = 1.5; hit = false; armed = 0; say(0, '');
    }
    function onKey(e) {
      if (step !== 0 || !(e.ctrlKey || e.altKey || e.shiftKey) || !CODES.includes(e.code)) return;
      e.preventDefault(); // no reload / save dialog / undo
      if (sub === 'go' && e.code === combo[3] && e[combo[2]]) hit = true;
    }
    // 2 Clear cache: Settings › Advanced › More Advanced › Clear Cache, with decoys.
    function menuShow(id) {
      lvl = id; crumb.textContent = MENU[id][0];
      for (let i = 0; i < 4; i++) mbtns[i].textContent = MENU[id][2][i][0];
      setF(0);
    }
    function pick(i) {
      const r = MENU[lvl][2][i][1];
      say(1, '');
      if (r[0] === '>') menuShow(r.slice(1));
      else if (r === '<') menuShow(MENU[lvl][1]);
      else if (r === '!') { say(1, 'Clearing cache…', true); after(1, done); }
      else say(1, r);
    }
    // 3 Log out: two confirmations.
    function logout() {
      busy = true; const id = run;
      const again = () => { if (id === run) { busy = false; say(2, 'Logout cancelled.'); } };
      api.popup({ msg: 'Are you sure?', buttons: ['YES', 'NO'], icon: 'warn', ding: true, at: 'center' }).done.then((b) => {
        if (id !== run) return;
        if (b !== 0) return again();
        api.state.flags.seen_sure = true;
        api.popup({ msg: "Are you sure you're sure?", buttons: ['YES', 'NO'], icon: 'warn', ding: true, at: 'center' }).done.then((b2) => {
          if (id !== run) return;
          if (b2 !== 0) return again();
          busy = false; say(2, 'Logging out…', true); after(0.8, done);
        });
      });
    }
    // 4 Log in: the rule changes every time it's satisfied; after three changes "Forgot password?" logs him in.
    function showRule() { ruleEl.textContent = '✗ ' + RULES[rule]; ruleEl.className = 'mg-rule'; }
    function sat(v) {
      if (rule === 0) return DIGIT.test(v);
      if (rule === 1) return v.length > 0 && !DIGIT.test(v);
      return rule === 2 && WORD.test(v) && v !== ruleFrom;
    }
    function login() { api.sfx('sad_beep'); msgs[3].textContent = 'Password does not meet requirements.'; }
    function forgot() {
      api.state.flags.seen_password = true;
      pw.blur(); msgs[3].textContent = 'Password reset. Logging you in anyway…';
      after(1, done);
    }

    M = {
      start(params, a) {
        api = a; P = params || {}; run++;
        if (!F) build();
        a.ui.appendChild(F.root);
        F.clk.textContent = P.time || '';
        for (let i = 0; i < 5; i++) { side.children[i].className = ''; panes[i].style.display = 'none'; }
        F.win.dataset.noyes = '';
        phase = 'run'; step = -1; busy = false; blocked = false; later = 0; foc = []; focusEl = setFocus(focusEl, null);
        addEventListener('keydown', onKey, true);
        show(0);
      },

      update(dt) {
        if (phase === 'end') return;
        const I = api.input, n = openPops(api), block = n > 0 || blocked || busy;
        blocked = n > 0;
        if (later > 0 && (later -= dt) <= 0) laterFn();
        if (phase !== 'run' || later > 0) return;
        if (step === 0) {
          if (sub === 'go') {
            subT -= dt; armed -= dt;
            if (!block && I.pressed('yes')) armed = 0.6;
            else if (!block && I.pressed('no') && armed > 0) hit = true;
            if (hit) { sub = 'ok'; subT = 0.6; say(0, 'Switched. JARVIS is awake. Ish.', true); }
            else if (subT <= 0) { sub = 'miss'; subT = 0.8; say(0, 'Too slow.'); api.sfx('sad_beep'); }
          } else if ((subT -= dt) <= 0) { if (sub === 'ok') done(); else newCombo(); }
          return;
        }
        if (step === 4) {
          pray = I.held('yes') && I.held('no') ? Math.min(1, pray + dt / 2) : Math.max(0, pray - dt * 1.2);
          if (pray >= 1) done();
          return;
        }
        if (step === 3) {
          if (typeTo !== null && (typeT -= dt) <= 0) {
            typeT = 0.08;
            if (!typeTo.startsWith(val)) val = val.slice(0, -1);
            else if (val.length < typeTo.length) val = typeTo.slice(0, val.length + 1);
            else typeTo = null;
            pw.value = val;
          }
          ruleT += dt;
          if (goodT > 0 && (goodT -= dt) <= 0) {
            rule++; changes++; ruleT = 0; ruleFrom = val; showRule();
            if (changes === 3) { forgotB.style.display = ''; foc.push(forgotB); setF(2); api.sfx('ding'); }
          } else if (rule < 3 && goodT <= 0 && typeTo === null && ruleT > 0.7 && sat(val)) {
            goodT = 0.5; ruleEl.textContent = '✓ ' + RULES[rule]; ruleEl.className = 'mg-rule good';
          }
        }
        if (block) return;
        if (I.pressed('down') || (step !== 3 && I.pressed('right'))) setF(fi + 1);
        else if (I.pressed('up') || (step !== 3 && I.pressed('left'))) setF(fi - 1);
        else if (I.pressed('no') && step === 1 && MENU[lvl][1]) menuShow(MENU[lvl][1]);
        else if (I.pressed('yes')) {
          if (step === 1) pick(fi);
          else if (step === 2) logout();
          else if (foc[fi] === pw) { typeTo = TRIES[rule]; typeT = 0; }
          else if (foc[fi] === loginB) login();
          else forgot();
        }
      },

      draw() {
        if (phase === 'end') return;
        if (step === 0) {
          const v = sub === 'go' ? Math.round(Math.max(0, subT / 1.5) * 50) : sub === 'ok' ? 50 : 0;
          if (v !== drawn) { drawn = v; cdFill.style.transform = 'scaleX(' + v / 50 + ')'; }
        } else if (step === 4) {
          const p = Math.round(pray * 100);
          if (p === drawn) return;
          drawn = p;
          const x = (1 - p / 100) * 150 - 3;
          handL.style.transform = 'translateX(' + -x + '%)';
          handR.style.transform = 'translateX(' + x + '%) scaleX(-1)';
          prayFill.style.transform = 'scaleX(' + p / 100 + ')';
        }
      },

      end() {
        run++; phase = 'end';
        removeEventListener('keydown', onKey, true);
        if (pw) pw.blur();
        if (F) F.root.remove();
      },

      autoplay(a) {
        if (phase === 'end' || api !== a) M.start(a.params || {}, a);
        a.state.flags.seen_sure = true;
        a.state.flags.seen_password = true;
        const id = run;
        wait(0.5).then(() => { if (id === run) fin({ done: true, auto: true }); });
      },
    };
    return M;
  })();
})();
