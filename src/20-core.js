
// ============================================================ CORE
// Renderer, event bus, fixed-step clock, input (keyboard, mouse, gamepad, touch), saves, F2 perf overlay.
// The frame loop itself lives in boot() (90-main.js) and calls clock.step() once per fixed tick.

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 1);
renderer.info.autoReset = false; // reset once per frame in the loop so split-screen counts add up
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, matchMedia('(pointer: coarse)').matches ? 1.5 : 2));
renderer.setSize(innerWidth, innerHeight, false);

// ------------------------------------------------------------ event bus
const bus = {};
function on(name, fn) { (bus[name] ||= []).push(fn); }
function off(name, fn) { const l = bus[name]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } }
function emit(name, data) { const l = bus[name]; if (l) for (let i = 0; i < l.length; i++) l[i](data); }

// ------------------------------------------------------------ clock, updaters, waits
// clock.t only advances in fixed CONFIG.step ticks. clock.scale > 1 = extra ticks per frame (see boot()).
const clock = {
  t: 0, dt: CONFIG.step, frame: 0, scale: 1, paused: false,
  fns: [], waits: [], dirty: false,
  step() { // one fixed tick of game time: updaters + waits (world.update is called by the loop)
    const dt = CONFIG.step;
    clock.t += dt; clock.frame++;
    const fns = clock.fns;
    for (let i = 0; i < fns.length; i++) { const f = fns[i]; if (f) f(dt); }
    if (clock.dirty) { let j = 0; for (let i = 0; i < fns.length; i++) if (fns[i]) fns[j++] = fns[i]; fns.length = j; clock.dirty = false; }
    const w = clock.waits, skip = typeof flow !== 'undefined' && flow.skipping;
    let j = 0;
    for (let i = 0; i < w.length; i++) {
      const x = w[i];
      if (skip || (x.fn ? x.fn() : clock.t >= x.t)) x.res(); else w[j++] = x;
    }
    w.length = j;
  },
};
function addUpdate(fn) { if (!clock.fns.includes(fn)) clock.fns.push(fn); }
function removeUpdate(fn) { const i = clock.fns.indexOf(fn); if (i >= 0) { clock.fns[i] = null; clock.dirty = true; } }
function wait(sec) {
  if ((typeof flow !== 'undefined' && flow.skipping) || !(sec > 0)) return Promise.resolve();
  return new Promise((res) => clock.waits.push({ t: clock.t + sec, fn: null, res }));
}
function waitUntil(fn) {
  if (typeof flow !== 'undefined' && flow.skipping) return Promise.resolve();
  return new Promise((res) => clock.waits.push({ t: 0, fn, res })); // checked from the next tick on
}

// ------------------------------------------------------------ input
const input = (() => {
  const A = ['yes', 'no', 'swap', 'inventory', 'run', 'pause', 'up', 'down', 'left', 'right'];
  const DIRS = { up: 1, down: 1, left: 1, right: 1 }, PADA = Object.keys(CONFIG.pad);
  const kb = {}, pad = {}, tch = {}, ms = {}, hit = {}, rel = {}, prev = {}, pr = {}, re = {}, dn = {};
  const push = (a) => { hit[a] = (hit[a] || 0) + 1; }; // one queued press
  const codeTo = {}; // KeyboardEvent.code -> action
  for (const a in CONFIG.keys) for (const c of CONFIG.keys[a]) codeTo[c] = a;
  const keysDown = new Set();
  const touchDevice = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const touchEl = document.getElementById('touch'), stickEl = document.getElementById('stick'), knob = stickEl.firstElementChild;
  const stick = { id: -1, x: 0, y: 0, far: false, fx: 0, fy: 0 };
  const padAxes = { x: 0, y: 0, fx: 0, fy: 0 };
  let pads = 0, pPrev = {}, pPtr = false, rPtr = false;

  const I = {
    move: { x: 0, y: 0 }, run: false, scheme: touchDevice ? 'touch' : 'kb', lastKey: '',
    pointer: { x: innerWidth / 2, y: innerHeight / 2, down: false, pressed: false, released: false, over: null },
    gesture: null, // set by boot(): called synchronously inside the first key/pointer event (audio unlock)
    pressed: (a) => pr[a] === true,
    held: (a) => dn[a] === true,
    released: (a) => re[a] === true,
    consume(a) { pr[a] = false; },
    setScheme(s) {
      if (I.scheme === s) return;
      I.scheme = s;
      const on = s === 'touch' && touchDevice;
      touchEl.classList.toggle('off', !on); touchEl.parentNode.classList.toggle('touchui', on);
    },
    poll() { // once per frame: gamepads
      if (!pads || !navigator.getGamepads) return;
      const gp = navigator.getGamepads();
      let g = null;
      for (let i = 0; i < gp.length; i++) if (gp[i] && gp[i].connected) { g = gp[i]; break; }
      if (!g) return;
      let any = false;
      for (let i = 0; i < PADA.length; i++) {
        const a = PADA[i], b = g.buttons[CONFIG.pad[a]], d = !!(b && b.pressed);
        if (d && !pPrev[a]) { push(a); any = true; }
        pad[a] = d; pPrev[a] = d;
      }
      let x = g.axes[0] || 0, y = -(g.axes[1] || 0);
      const m = Math.hypot(x, y);
      if (m < 0.2) { x = 0; y = 0; } else { const k = Math.min(1, (m - 0.2) / 0.8) / m; x *= k; y *= k; any = true; }
      // stick flicks fire direction edges for menus and grids
      if (Math.abs(x) > 0.6 && Math.abs(padAxes.fx) < 0.35) push(x > 0 ? 'right' : 'left');
      if (Math.abs(y) > 0.6 && Math.abs(padAxes.fy) < 0.35) push(y > 0 ? 'up' : 'down');
      padAxes.x = padAxes.fx = x; padAxes.y = padAxes.fy = y;
      if (any) I.setScheme('pad');
    },
    tick() { // once per fixed tick: edges + move vector
      for (let i = 0; i < A.length; i++) {
        const a = A[i], d = !!(kb[a] || pad[a] || tch[a] || ms[a]);
        pr[a] = hit[a] > 0 || (d && !prev[a]);
        if (hit[a] > 0) hit[a]--; // presses queued within one frame come out on successive ticks
        re[a] = rel[a] === true || (!d && prev[a] === true);
        rel[a] = false; prev[a] = d; dn[a] = d;
      }
      const p = I.pointer;
      p.pressed = pPtr; p.released = rPtr; pPtr = rPtr = false;
      let x = (dn.right ? 1 : 0) - (dn.left ? 1 : 0), y = (dn.up ? 1 : 0) - (dn.down ? 1 : 0);
      if (x && y) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      if (Math.abs(padAxes.x) + Math.abs(padAxes.y) > Math.abs(x) + Math.abs(y)) { x = padAxes.x; y = padAxes.y; }
      if (stick.id >= 0 && Math.abs(stick.x) + Math.abs(stick.y) > Math.abs(x) + Math.abs(y)) { x = stick.x; y = stick.y; }
      I.move.x = x; I.move.y = y;
      I.run = !!(dn.run || (stick.id >= 0 && stick.far));
    },
  };

  const gesture = () => { if (I.gesture) { const g = I.gesture; I.gesture = null; g(); } };
  const isField = (t) => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);

  addEventListener('keydown', (e) => {
    if (e.code === 'F2') { e.preventDefault(); perf.toggle(); return; }
    I.lastKey = e.key;
    if (!e.repeat) emit('key', e.code);
    if (isField(e.target)) return;
    const a = codeTo[e.code];
    if (!a) return;
    e.preventDefault();
    I.setScheme('kb');
    gesture();
    if (!e.repeat) { keysDown.add(e.code); kb[a] = true; push(a); } else if (DIRS[a]) push(a);
  });
  addEventListener('keyup', (e) => {
    keysDown.delete(e.code);
    const a = codeTo[e.code];
    if (!a) return;
    let d = false;
    for (const c of CONFIG.keys[a]) if (keysDown.has(c)) d = true;
    if (kb[a] && !d) rel[a] = true;
    kb[a] = d;
  });
  addEventListener('blur', () => { keysDown.clear(); for (const a of A) kb[a] = ms[a] = tch[a] = false; });

  const onTouchUI = (e) => e.target.closest && e.target.closest('#touch'); // touch controls handle themselves, never move the pointer
  addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') I.setScheme('touch'); else I.setScheme('kb');
    gesture();
    if (onTouchUI(e)) return;
    const p = I.pointer;
    p.x = e.clientX; p.y = e.clientY; p.down = true; p.over = e.target; pPtr = true;
    if (e.button === 2) { ms.no = true; push('no'); return; }
    if (e.button === 0 && !(e.target.closest && e.target.closest('button, [data-noyes], input, textarea'))) { ms.yes = true; push('yes'); }
  });
  addEventListener('pointermove', (e) => { if (onTouchUI(e)) return; const p = I.pointer; p.x = e.clientX; p.y = e.clientY; p.over = e.target; });
  addEventListener('pointerup', (e) => {
    if (onTouchUI(e)) return;
    const p = I.pointer; p.x = e.clientX; p.y = e.clientY; p.down = false; rPtr = true;
    if (ms.yes) { ms.yes = false; rel.yes = true; }
    if (ms.no) { ms.no = false; rel.no = true; }
  });
  addEventListener('pointercancel', () => { I.pointer.down = false; ms.yes = ms.no = false; });
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('focusin', (e) => { if (e.target.tagName === 'BUTTON') e.target.blur(); }); // Enter/Space are YES, never a native click
  addEventListener('gamepadconnected', () => { pads++; });
  addEventListener('gamepaddisconnected', () => { pads = Math.max(0, pads - 1); });

  // touch buttons
  for (const b of touchEl.querySelectorAll('[data-a]')) {
    const a = b.dataset.a;
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.setPointerCapture(e.pointerId); tch[a] = true; push(a); b.classList.add('on'); });
    const up = () => { if (tch[a]) rel[a] = true; tch[a] = false; b.classList.remove('on'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
  }
  // virtual stick: offset from the base centre / radius; beyond the rim = run
  const R = 60;
  const stickMove = (e) => {
    const r = stickEl.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    stick.far = d > R * 1.15;
    if (d > R) { dx *= R / d; dy *= R / d; }
    const x = dx / R, y = -dy / R, m = Math.hypot(x, y);
    stick.x = m < 0.15 ? 0 : x; stick.y = m < 0.15 ? 0 : y;
    if (Math.abs(x) > 0.6 && Math.abs(stick.fx) < 0.35) push(x > 0 ? 'right' : 'left');
    if (Math.abs(y) > 0.6 && Math.abs(stick.fy) < 0.35) push(y > 0 ? 'up' : 'down');
    stick.fx = x; stick.fy = y;
    knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  stickEl.addEventListener('pointerdown', (e) => { e.preventDefault(); stickEl.setPointerCapture(e.pointerId); stick.id = e.pointerId; stickMove(e); });
  stickEl.addEventListener('pointermove', (e) => { if (e.pointerId === stick.id) stickMove(e); });
  const stickUp = (e) => { if (e.pointerId !== stick.id) return; stick.id = -1; stick.x = stick.y = stick.fx = stick.fy = 0; stick.far = false; knob.style.transform = ''; };
  stickEl.addEventListener('pointerup', stickUp); stickEl.addEventListener('pointercancel', stickUp);

  if (touchDevice) { touchEl.classList.remove('off'); touchEl.parentNode.classList.add('touchui'); }
  return I;
})();

// ------------------------------------------------------------ resize (renderer + overlay canvas in CSS px x dpr)
addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight, false);
  const o = document.getElementById('overlay'), d = devicePixelRatio || 1;
  o.width = Math.round(innerWidth * d); o.height = Math.round(innerHeight * d);
  o.getContext('2d').setTransform(d, 0, 0, d, 0, 0);
  emit('resize', { w: innerWidth, h: innerHeight });
});
{
  const o = document.getElementById('overlay'), d = devicePixelRatio || 1;
  o.width = Math.round(innerWidth * d); o.height = Math.round(innerHeight * d);
  o.getContext('2d').setTransform(d, 0, 0, d, 0, 0);
}

// ------------------------------------------------------------ saves (localStorage, always in try/catch)
function saveGame() {
  try { localStorage.setItem('rue.save', JSON.stringify({ state, options, profile })); return true; } catch (e) { return false; }
}
function loadGame() {
  try { const s = JSON.parse(localStorage.getItem('rue.save')); return (s && s.state) || null; } catch (e) { return null; }
}
function hasSave() { return !!loadGame(); }
function saveOptions() {
  try {
    let s = null;
    try { s = JSON.parse(localStorage.getItem('rue.save')); } catch (e) { s = null; }
    s = s || {}; s.options = options; s.profile = profile;
    localStorage.setItem('rue.save', JSON.stringify(s));
  } catch (e) { /* storage blocked: options live for this session only */ }
}

// ------------------------------------------------------------ perf: F2 overlay + adaptive pixel ratio
const perf = (() => {
  const N = 1200, ft = new Float32Array(N); // >= 10 s of frame times (up to 120 Hz)
  const el = document.getElementById('perf'), cv = el.querySelector('canvas'), cx = cv.getContext('2d'), pre = el.querySelector('pre');
  const touch = matchMedia('(pointer: coarse)').matches;
  const top = Math.min(devicePixelRatio || 1, touch ? 1.5 : 2);
  const levels = [2, 1.5, 1].filter((v) => v <= top);
  if (!levels.length || levels[0] !== top) levels.unshift(top);
  let i = 0, on = false, n = 0, lvl = 0, winT = 0, winN = 0, good = 0, need = 3;
  const P = {
    adapt: false,
    toggle() { on = !on; el.classList.toggle('off', !on); },
    frame(ms) {
      ft[i] = ms; i = (i + 1) % N;
      if (!P.adapt) return;
      winT += Math.min(ms, 50); winN++; // one hitch (tab switch, GC) shouldn't drop the resolution
      if (winT < 2000) return;
      const avg = winT / winN; winT = 0; winN = 0;
      // back up once it keeps up with vsync (a 60 Hz display never beats 16.7 ms); each fall doubles the wait (no see-saw)
      if (avg > 18 && lvl < levels.length - 1) { renderer.setPixelRatio(levels[++lvl]); good = 0; need *= 2; }
      else if (avg < 17.2 && lvl > 0) { if (++good >= need) { renderer.setPixelRatio(levels[--lvl]); good = 0; } }
      else good = 0;
    },
    draw() {
      if (!on) return;
      cx.fillStyle = '#111'; cx.fillRect(0, 0, 240, 64);
      let max = 0;
      for (let k = 1, sum = 0; k <= N && sum < 10000; k++) { const v = ft[(i - k + N) % N]; sum += v; if (v > max) max = v; }   // the last 10 s
      for (let k = 0; k < 240; k++) {
        const v = ft[(i - 240 + k + N) % N], hgt = Math.min(64, v * 64 / 50);
        cx.fillStyle = v < 17.5 ? '#4ade80' : v < 33.4 ? '#facc15' : '#f87171';
        cx.fillRect(k, 64 - hgt, 1, hgt);
      }
      cx.fillStyle = 'rgba(255,255,255,.35)'; cx.fillRect(0, 64 - 16.7 * 64 / 50, 240, 1); cx.fillRect(0, 64 - 33.3 * 64 / 50, 240, 1);
      if (n++ % 15) return;
      const last = ft[(i - 1 + N) % N], inf = renderer.info.render;
      const fl = typeof state !== 'undefined' ? Object.keys(state.flags).filter((k) => state.flags[k]).join(' ') : '';
      pre.textContent = `${last.toFixed(1)} ms  max(10s) ${max.toFixed(1)} ms  pr ${renderer.getPixelRatio()}\n` +
        `calls ${inf.calls}  tris ${inf.triangles}\n` +
        `scene ${typeof flow !== 'undefined' ? flow.sceneId : '-'}  step ${typeof flow !== 'undefined' ? flow.stepIndex : '-'}\n` +
        `cam ${typeof cam !== 'undefined' ? cam.name : '-'}\nflags: ${fl}`;
    },
  };
  return P;
})();
