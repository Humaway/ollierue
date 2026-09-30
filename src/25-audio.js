// ============================================================ AUDIO
// Every sound and note is synthesized with Web Audio (SPEC section 15). prerender() bakes every one-shot,
// loop, voice blip and music stem into AudioBuffers with OfflineAudioContext while the loader runs; at
// runtime we only start buffer sources (voice blips come from small per-character pools, the Pudding song
// is scheduled step by step on the audio clock). Buses: music / sfx / voice -> master -> soft limiter,
// volumes from `options`. Before init() (the first YES) every call is a silent no-op.

const { AUDIO, sfx, music } = (() => {
  const SR = 44100, MR = 32000;                 // one-shots + voices, music + loops
  const rnd = Math.random, mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const B = {}, L = {}, M = {}, V = {}, S = { pad: [], bass: [], bleep: [] };  // one-shots, loops, music, voices, song stems
  let WHITE, BROWN, DROPS, DRIPS, CRACKLE, PULSE, WARM, DIST;
  let ctx = null, busM, busS, busV, sendRoom, sendWet, ducked = false, silenced = false;

  // ---------------------------------------------------------- synth toolkit (works on any BaseAudioContext)
  // Envelope: 0 -> v over a, decay toward v*s (time constant d), release after dur (r ~ time to silence).
  function env(p, t, dur, o) {
    const v = o.v ?? 0.3, a = o.a ?? 0.004, r = o.r ?? 0.03, hold = Math.max(dur, a);
    p.setValueAtTime(0, t);
    p.linearRampToValueAtTime(v, t + a);
    if (o.d) p.setTargetAtTime(v * (o.s ?? 0), t + a, o.d);
    p.setTargetAtTime(0, t + hold, r / 4);
    return t + hold + r + 0.02; // stop time
  }
  // Optional filter in front of dest: o.lp | o.hp | o.bp, o.q, swept to o.fto over o.fgl.
  function filt(c, dest, o, t, dur) {
    const fr = o.lp || o.hp || o.bp;
    if (!fr) return dest;
    const f = c.createBiquadFilter();
    f.type = o.lp ? 'lowpass' : o.hp ? 'highpass' : 'bandpass';
    f.Q.value = o.q ?? (o.bp ? 2 : 0.7);
    f.frequency.setValueAtTime(fr, t);
    if (o.fto) f.frequency.exponentialRampToValueAtTime(o.fto, t + (o.fgl ?? dur));
    f.connect(dest);
    return f;
  }
  function lfo(c, param, rate, depth, t = 0, end = 0, type = 'sine') {
    const l = c.createOscillator(), g = c.createGain();
    l.type = type; l.frequency.value = rate; g.gain.value = depth;
    l.connect(g); g.connect(param); l.start(t); if (end) l.stop(end);
    return l;
  }
  // Oscillator note: o.type | o.wave (PeriodicWave), o.to (glide target over o.gl), o.det cents, o.vib [Hz, cents].
  function tone(c, d, t, f, dur, o = {}) {
    const os = c.createOscillator(), g = c.createGain();
    if (o.wave) os.setPeriodicWave(o.wave); else os.type = o.type || 'sine';
    os.frequency.setValueAtTime(f, t);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + (o.gl ?? dur));
    if (o.det) os.detune.value = o.det;
    const end = env(g.gain, t, dur, o);
    if (o.vib) lfo(c, os.detune, o.vib[0], o.vib[1], t, end);
    os.connect(filt(c, g, o, t, dur)); g.connect(d);
    os.start(t); os.stop(end);
  }
  // Filtered noise (white, o.brown, or any looped texture in o.buf).
  function noise(c, d, t, dur, o = {}) {
    const s = c.createBufferSource(), g = c.createGain();
    s.buffer = o.buf || (o.brown ? BROWN : WHITE); s.loop = true;
    const end = env(g.gain, t, dur, o);
    s.connect(filt(c, g, o, t, dur)); g.connect(d);
    s.start(t, rnd() * 1.5); s.stop(end);
  }
  // Two-operator FM: o.ratio, o.index (x f), index decays to o.isus with time constant o.md.
  function fm(c, d, t, f, dur, o = {}) {
    const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain(), I = f * (o.index ?? 2);
    car.frequency.value = f; mod.frequency.value = f * (o.ratio ?? 1);
    mg.gain.setValueAtTime(I, t); mg.gain.setTargetAtTime(I * (o.isus ?? 0.1), t, o.md ?? 0.3);
    mod.connect(mg); mg.connect(car.frequency);
    const end = env(g.gain, t, dur, o);
    car.connect(filt(c, g, o, t, dur)); g.connect(d);
    car.start(t); mod.start(t); car.stop(end); mod.stop(end);
  }
  // Detuned oscillator stack through one low-pass (pads, stabs). o.wob / o.lfoF: LFO outputs for pitch / cutoff.
  function chord(c, d, t, notes, dur, o = {}) {
    const f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'lowpass'; f.frequency.value = o.lp ?? 1200; f.Q.value = o.q ?? 0.6;
    if (o.lfoF) o.lfoF.connect(f.detune);
    const end = env(g.gain, t, dur, { v: o.v ?? 0.05, a: o.a ?? 0.3, d: o.d, s: o.s, r: o.r ?? 0.8 });
    f.connect(g); g.connect(d);
    for (const m of notes) for (const cents of (o.det || [-8, 8])) {
      const os = c.createOscillator();
      os.type = o.type || 'sawtooth'; os.frequency.value = mtof(m); os.detune.value = cents;
      if (o.wob) o.wob.connect(os.detune);
      os.connect(f); os.start(t + rnd() * 0.01); os.stop(end);
    }
  }
  function lfoOut(c, rate, depth) { // a shared LFO signal to connect into several params
    const l = c.createOscillator(), g = c.createGain();
    l.frequency.value = rate; g.gain.value = depth; l.connect(g); l.start(0);
    return g;
  }
  function band(c, d, lo, hi) { // high-pass + low-pass, returns the input
    const h = c.createBiquadFilter(), l = c.createBiquadFilter();
    h.type = 'highpass'; h.frequency.value = lo; l.type = 'lowpass'; l.frequency.value = hi;
    h.connect(l); l.connect(d);
    return h;
  }
  function bp(c, f, q) { const n = c.createBiquadFilter(); n.type = 'bandpass'; n.frequency.value = f; n.Q.value = q; return n; }
  // Generated impulse: decaying noise that darkens as it decays (damp 0..1).
  const IR = {};
  function impulse(rate, sec, damp, ch = 1) {
    const k = rate + ':' + sec + ':' + damp + ':' + ch;
    if (IR[k]) return IR[k];
    const n = Math.round(rate * sec), b = new AudioBuffer({ length: n, sampleRate: rate, numberOfChannels: ch });
    for (let j = 0; j < ch; j++) {
      const a = b.getChannelData(j);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const x = i / n, k2 = damp * x;
        y = y * k2 + (rnd() * 2 - 1) * (1 - k2);
        a[i] = y * Math.exp(-6.9 * x) * Math.min(1, i / (rate * 0.004));
      }
    }
    return (IR[k] = b);
  }
  function rev(c, d, sec, mix, damp = 0.6) { // dry + convolver send; returns the input
    const inp = c.createGain(), cv = c.createConvolver(), w = c.createGain();
    cv.buffer = impulse(c.sampleRate, sec, damp); w.gain.value = mix;
    inp.connect(d); inp.connect(cv); cv.connect(w); w.connect(d);
    return inp;
  }

  // ---------------------------------------------------------- instruments and recipe parts
  const kick = (c, d, t, v = 0.7) => tone(c, d, t, 140, 0.25, { to: 42, gl: 0.1, v, a: 0.002, d: 0.09, r: 0.05 });
  function snare(c, d, t, v = 0.25) {
    noise(c, d, t, 0.18, { v, a: 0.001, d: 0.05, bp: 2000, q: 0.7 });
    tone(c, d, t, 210, 0.08, { to: 150, v: v * 0.7, a: 0.001, d: 0.03 });
  }
  const hat = (c, d, t, v = 0.05, open) => noise(c, d, t, open ? 0.25 : 0.04, { v, a: 0.001, d: open ? 0.07 : 0.012, hp: 7500 });
  const pluck = (c, d, t, m, v = 0.06, lp = 1800) => tone(c, d, t, mtof(m), 0.1, { type: 'square', v, a: 0.002, d: 0.05, r: 0.03, lp, fto: 300, fgl: 0.08 });
  function marimba(c, d, t, m, dur, v = 0.14) {
    tone(c, d, t, mtof(m), dur, { v, a: 0.002, d: 0.25, r: 0.1 });
    tone(c, d, t, mtof(m) * 4, 0.1, { v: v * 0.4, a: 0.001, d: 0.04 });
  }
  const piano = (c, d, t, m, v = 0.1) => fm(c, d, t, mtof(m), 3, { ratio: 1, index: 1.6, md: 0.25, isus: 0.08, v, a: 0.003, d: 1.3, r: 0.5 });
  const flute = (c, d, t, m, dur, v = 0.1) => { tone(c, d, t, mtof(m), dur, { v, a: 0.06, d: 0.8, s: 0.6, r: 0.25, vib: [5, 14] }); tone(c, d, t, mtof(m) * 2, dur, { v: v * 0.08, a: 0.06, r: 0.2 }); };
  const bassN = (c, d, t, m, dur, v = 0.3, lp = 700) => { tone(c, d, t, mtof(m), dur, { type: 'triangle', v, a: 0.004, d: 0.4, s: 0.4, r: 0.08, lp }); tone(c, d, t, mtof(m), dur, { v: v * 0.5, a: 0.004, d: 0.4, s: 0.4, r: 0.08 }); };
  const BELL = [[0.5, 1, 1], [1, 0.8, 0.6], [1.19, 0.55, 0.45], [1.5, 0.4, 0.35], [2, 0.35, 0.25], [2.5, 0.25, 0.18]]; // ratio, level, decay share
  function bell(c, d, t, f, v, len = 8) { // Campanile: inharmonic partials, 8 s on the hum
    for (const [r, a, k] of BELL) {
      tone(c, d, t, f * r, len * k, { v: v * a, a: 0.002, d: len * k / 4, r: 0.2 });
      tone(c, d, t, f * r * 1.003, len * k, { v: v * a * 0.4, a: 0.002, d: len * k / 4, r: 0.2 });
    }
    noise(c, d, t, 0.02, { v: v * 0.4, a: 0.0005, d: 0.006, hp: 2500 });
  }
  function whistle(c, d, t, f, dur, v = 0.28) { // tin whistle: sine, gentle vibrato, a breath of noise
    tone(c, d, t, f, dur, { v, a: 0.025, d: 0.25, s: 0.65, r: 0.08, vib: [5.5, 14] });
    tone(c, d, t, f * 2, dur, { v: v * 0.12, a: 0.025, d: 0.25, s: 0.5, r: 0.06 });
    noise(c, d, t, dur * 0.8, { v: v * 0.12, a: 0.01, d: 0.08, s: 0.35, r: 0.05, bp: f * 2, q: 1 });
    noise(c, d, t, 0.02, { v: v * 0.2, a: 0.001, d: 0.012, bp: 3000, q: 1 });
  }
  function kclick(c, d, t, v) {
    noise(c, d, t, 0.03, { v, a: 0.0005, d: 0.01, hp: 5500 });
    tone(c, d, t, 3400, 0.01, { v: v * 0.15, a: 0.0005, d: 0.005 });
    tone(c, d, t, 1100, 0.01, { v: v * 0.1, a: 0.0005, d: 0.004 });
  }
  function twang(c, d, t, v) {
    tone(c, d, t, 196, 0.6, { type: 'sawtooth', to: 174, gl: 0.5, v, a: 0.002, d: 0.16, r: 0.1, lp: 3200, fto: 350, fgl: 0.45, vib: [11, 35] });
    tone(c, d, t, 98, 0.4, { v: v * 0.6, a: 0.002, d: 0.12, r: 0.1 });
  }
  function siren(c, d, t, dur, v) { // 700/950 Hz square, alternating every 0.25 s
    const os = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
    os.type = 'square'; f.type = 'lowpass'; f.frequency.value = 3000;
    for (let k = 0; k * 0.25 < dur + 0.3; k++) os.frequency.setValueAtTime(k % 2 ? 950 : 700, t + k * 0.25);
    const end = env(g.gain, t, dur, { v, a: 0.004, r: 0.02 });
    os.connect(f); f.connect(g); g.connect(d); os.start(t); os.stop(end);
  }
  function brickRing(c, d, t) { // harsh C-E-G square arpeggio, slightly distorted
    const sh = c.createWaveShaper(), f = c.createBiquadFilter(), g = c.createGain();
    sh.curve = DIST; f.type = 'lowpass'; f.frequency.value = 4500;
    const end = env(g.gain, t, 0.92, { v: 0.12, a: 0.003, r: 0.02 });
    for (const det of [0, 14]) {
      const os = c.createOscillator(); os.type = 'square'; os.detune.value = det;
      for (let k = 0; k < 28; k++) os.frequency.setValueAtTime([1047, 1319, 1568][k % 3], t + k * 0.034);
      os.connect(sh); os.start(t); os.stop(end);
    }
    sh.connect(f); f.connect(g); g.connect(d);
  }
  function creak(c, d, t) { // old wooden door: stick-slip sawtooth through two wood resonances
    const os = c.createOscillator(), f1 = bp(c, 750, 6), f2 = bp(c, 1600, 8), am = c.createGain(), g = c.createGain();
    os.type = 'sawtooth';
    os.frequency.setValueAtTime(70, t); os.frequency.linearRampToValueAtTime(130, t + 0.35);
    os.frequency.linearRampToValueAtTime(85, t + 0.7); os.frequency.linearRampToValueAtTime(115, t + 1);
    am.gain.value = 0.5; lfo(c, am.gain, 23, 0.5, t, t + 1.3, 'square');
    const end = env(g.gain, t, 1, { v: 1.2, a: 0.08, r: 0.2 });
    os.connect(f1); os.connect(f2); f1.connect(am); f2.connect(am); am.connect(g); g.connect(d);
    os.start(t); os.stop(end);
  }
  function fluoro(c, d, t, dur, v, flick) { // tube buzz; flickers on/off inside the [from, to] windows
    const g = c.createGain(); g.connect(d);
    g.gain.setValueAtTime(v, t);
    for (const [a, b] of flick) {
      for (let x = t + a; x < t + b; x += 0.03 + rnd() * 0.09) {
        const on = rnd() < 0.5;
        g.gain.setValueAtTime(on ? v : v * 0.05, x);
        if (on) noise(c, d, x, 0.004, { v: v * 0.6, a: 0.0005, d: 0.002, hp: 2500 });
      }
      g.gain.setValueAtTime(v, t + b);
    }
    tone(c, g, t, 100, dur, { type: 'sawtooth', v: 1, a: 0.01, r: 0.01, lp: 1200 });
    tone(c, g, t, 200, dur, { type: 'square', v: 0.15, a: 0.01, r: 0.01, hp: 3000 });
  }
  function type1(c, d, t, v) {
    noise(c, d, t, 0.012, { v, a: 0.0005, d: 0.005, bp: 2500 + rnd() * 1000, q: 1 });
    tone(c, d, t, 160, 0.03, { v: v * 0.6, a: 0.001, d: 0.012 });
  }
  // Speech-like babble (never words): buzz + breath through two formant filters that jump per syllable.
  const VOW = [[730, 1090], [530, 1840], [300, 2250], [570, 840], [440, 1020], [660, 1700]];
  function babble(c, d, t0, dur, o) {
    const src = c.createOscillator(), nz = c.createBufferSource(), ng = c.createGain(), f1 = bp(c, 500, 6), f2 = bp(c, 1500, 8), g = c.createGain();
    src.type = 'sawtooth'; src.frequency.value = o.f;
    lfo(c, src.detune, o.wob ?? 0.6, o.wobc ?? 30, t0, t0 + dur);
    nz.buffer = WHITE; nz.loop = true; ng.gain.value = 0.25;
    g.gain.value = 0;
    src.connect(f1); src.connect(f2); nz.connect(ng); ng.connect(f1); ng.connect(f2);
    f1.connect(g); f2.connect(g); g.connect(d);
    const syl = o.fast ? 0.07 : 0.1, end = t0 + dur - 0.15;
    for (let t = t0 + 0.05; t < end;) {
      for (let n = 2 + (rnd() * 6 | 0); n > 0 && t < end; n--) {
        const sl = syl + rnd() * syl, w = VOW[rnd() * VOW.length | 0];
        f1.frequency.setTargetAtTime(w[0], t, 0.02); f2.frequency.setTargetAtTime(w[1], t, 0.02);
        src.frequency.setTargetAtTime(o.f * (0.88 + rnd() * 0.3), t, 0.04);
        g.gain.setTargetAtTime(o.v * (0.6 + rnd() * 0.4), t, 0.012);
        g.gain.setTargetAtTime(0, t + sl * 0.75, 0.02);
        t += sl;
      }
      t += (o.fast ? 0.12 : 0.2) + rnd() * 0.35;
    }
    src.start(t0); nz.start(t0); src.stop(t0 + dur); nz.stop(t0 + dur);
  }
  function crowdGroan(c, d, t) {
    const f1 = bp(c, 650, 5), f2 = bp(c, 1050, 6), g = c.createGain();
    f1.connect(g); f2.connect(g); g.connect(d);
    const end = env(g.gain, t, 1.1, { v: 0.5, a: 0.2, r: 0.4 });
    for (let k = 0; k < 5; k++) {
      const os = c.createOscillator(), f = 120 + rnd() * 110;
      os.type = 'sawtooth'; os.frequency.setValueAtTime(f, t); os.frequency.exponentialRampToValueAtTime(f * 0.78, t + 1.2);
      os.connect(f1); os.connect(f2); os.start(t + rnd() * 0.08); os.stop(end);
    }
  }
  function crowdTitter(c, d, t) {
    const f = bp(c, 1300, 1.5); f.connect(d);
    for (let p = 0; p < 3; p++) {
      const f0 = 280 + rnd() * 240, t0 = t + rnd() * 0.3;
      for (let k = 0; k < 5; k++) tone(c, f, t0 + k * (0.1 + rnd() * 0.03), f0 * (1 - k * 0.03), 0.05, { type: 'triangle', to: f0 * 0.85, v: 0.35, a: 0.006, d: 0.03, r: 0.02 });
    }
  }
  function clockTick(c, d, t, f) {
    noise(c, d, t, 0.006, { v: 0.35, a: 0.0005, d: 0.003, bp: f, q: 3 });
    tone(c, d, t, f * 0.7, 0.015, { v: 0.06, a: 0.0005, d: 0.006 });
  }

  // ---------------------------------------------------------- one-shots: name: [seconds, recipe(ctx, dest, t)]
  const SFX = {
    ding: [0.22, (c, d, t) => { tone(c, d, t, 880, 0.06, { v: 0.28, r: 0.03 }); tone(c, d, t + 0.07, 1320, 0.06, { v: 0.28, r: 0.06 }); }],
    crash: [1, (c, d, t) => {
      tone(c, d, t, 600, 0.7, { type: 'square', to: 80, v: 0.16, r: 0.15, lp: 2600 });
      noise(c, d, t, 0.45, { v: 0.4, a: 0.002, d: 0.12, lp: 3500 });
    }],
    restart_chime: [1.3, (c, d, t) => [72, 76, 79].forEach((m, i) => tone(c, d, t + i * 0.2, mtof(m), 0.4, { v: 0.16, a: 0.03, d: 0.3, s: 0.3, r: 0.5 }))],
    alarm: [1, (c, d, t) => siren(c, d, t, 1, 0.14)],
    rip: [0.7, (c, d, t) => { noise(c, d, t, 0.22, { v: 0.45, a: 0.003, d: 0.07, bp: 3000, fto: 700, fgl: 0.2, q: 0.8 }); twang(c, d, t + 0.03, 0.22); }],
    twang: [0.8, (c, d, t) => twang(c, d, t, 0.3)],
    spark: [0.5, (c, d, t) => { for (let k = 0; k < 9; k++) noise(c, d, t + rnd() * 0.38, 0.012, { v: 0.2 + rnd() * 0.35, a: 0.0005, d: 0.004, hp: 3500 }); }],
    tick: [0.06, (c, d, t) => { noise(c, d, t, 0.006, { v: 0.3, a: 0.0005, d: 0.002, hp: 2500 }); tone(c, d, t, 2400, 0.012, { v: 0.05, a: 0.001, d: 0.004 }); }],
    trill: [1.05, (c, d, t) => { for (const s of [0, 0.6]) { tone(c, d, t + s, 400, 0.4, { v: 0.16, a: 0.008, r: 0.02 }); tone(c, d, t + s, 450, 0.4, { v: 0.16, a: 0.008, r: 0.02 }); } }],
    brick_ring: [1.05, (c, d, t) => brickRing(c, d, t)],
    bell: [8.5, (c, d, t) => bell(c, d, t, mtof(62), 0.2)],
    kettle: [3.35, (c, d, t) => {
      noise(c, d, t, 3, { v: 0.2, a: 2.8, r: 0.02, bp: 350, fto: 2600, fgl: 3, q: 1.4 });
      noise(c, d, t, 3, { v: 0.12, a: 1.6, r: 0.02, brown: true, lp: 400 });
      kclick(c, d, t + 3.02, 0.6);
    }],
    kettle_click: [0.1, (c, d, t) => kclick(c, d, t, 0.7)],
    beep: [0.13, (c, d, t) => tone(c, d, t, 1000, 0.1, { type: 'square', v: 0.11, a: 0.002, r: 0.01 })],
    till: [0.7, (c, d, t) => {
      fm(c, d, t, 2349, 0.5, { ratio: 1.41, index: 3, md: 0.08, v: 0.22, a: 0.001, d: 0.16, r: 0.1 });
      fm(c, d, t, 3520, 0.3, { ratio: 2.76, index: 1.5, md: 0.05, v: 0.1, a: 0.001, d: 0.08, r: 0.05 });
      noise(c, d, t, 0.05, { v: 0.25, a: 0.001, d: 0.02, hp: 2500 });
      tone(c, d, t, 220, 0.06, { to: 170, v: 0.2, a: 0.001, d: 0.03 });
    }],
    whistle: [0.5, (c, d, t) => whistle(c, d, t, mtof(74), 0.3)], // D5: the Pudding lead is this at playbackRate
    pigeons: [1.1, (c, d, t) => {
      for (let b = 0; b < 2; b++) for (let k = 0; k < 9; k++) noise(c, d, t + b * 0.13 + k * (0.065 + rnd() * 0.02), 0.035, { v: 0.8 * (1 - k / 12), a: 0.004, d: 0.012, bp: 700 + rnd() * 700, q: 1.3 });
    }],
    creak: [1.3, (c, d, t) => creak(c, d, t)],
    door_slide: [1.3, (c, d, t) => {
      noise(c, d, t, 0.9, { v: 0.12, a: 0.25, r: 0.3, bp: 500, fto: 1100, fgl: 0.9, q: 0.9 });
      tone(c, d, t, 120, 0.9, { type: 'triangle', v: 0.05, a: 0.1, r: 0.2, lp: 500 });
      tone(c, d, t + 1, 90, 0.08, { to: 60, v: 0.15, a: 0.002, d: 0.04 });
    }],
    clunk: [0.3, (c, d, t) => { tone(c, d, t, 95, 0.15, { to: 55, v: 0.5, a: 0.002, d: 0.06 }); noise(c, d, t, 0.05, { v: 0.3, a: 0.001, d: 0.025, lp: 700 }); }],
    sad_beep: [0.6, (c, d, t) => {
      tone(c, d, t, 440, 0.14, { type: 'square', v: 0.09, r: 0.02, lp: 2200 });
      tone(c, d, t + 0.18, 330, 0.3, { type: 'square', to: 300, v: 0.09, r: 0.05, lp: 2200 });
    }],
    key_beep: [0.1, (c, d, t) => tone(c, d, t, 1400, 0.06, { type: 'square', v: 0.09, r: 0.01, lp: 5000 })],
    sting: [1, (c, d, t) => {
      chord(c, d, t, [48, 55, 60, 63, 67], 0.05, { v: 0.06, a: 0.003, d: 0.25, s: 0, r: 0.6, lp: 3000 });
      noise(c, d, t, 0.2, { v: 0.35, a: 0.002, d: 0.08, lp: 3000 });
      tone(c, d, t, 65, 0.3, { v: 0.4, a: 0.003, d: 0.2 });
    }],
    whoosh: [0.8, (c, d, t) => noise(c, d, t, 0.35, { v: 0.9, a: 0.25, r: 0.3, bp: 300, fto: 2000, fgl: 0.5, q: 1.2 })],
    zap: [0.45, (c, d, t) => {
      tone(c, d, t, 120, 0.28, { type: 'square', v: 0.12, a: 0.002, r: 0.05, lp: 2500, vib: [31, 400] });
      for (let k = 0; k < 6; k++) noise(c, d, t + rnd() * 0.3, 0.01, { v: 0.3, a: 0.0005, d: 0.004, hp: 3000 });
    }],
    typewriter: [0.1, (c, d, t) => type1(c, d, t, 0.45)],
    footstep: [0.14, (c, d, t) => { noise(c, d, t, 0.05, { v: 1.2, a: 0.002, d: 0.02, lp: 450 }); noise(c, d, t, 0.02, { v: 0.12, a: 0.001, d: 0.008, bp: 2200 }); }],
    footstep_wet: [0.3, (c, d, t) => {
      noise(c, d, t, 0.05, { v: 0.9, a: 0.002, d: 0.02, lp: 450 });
      noise(c, d, t + 0.01, 0.12, { v: 0.35, a: 0.006, d: 0.05, bp: 2600, q: 0.8 });
      tone(c, d, t + 0.04, 1400, 0.03, { to: 900, v: 0.04, a: 0.001, d: 0.015 });
    }],
    thud: [0.5, (c, d, t) => { tone(c, d, t, 80, 0.3, { to: 40, v: 0.6, a: 0.002, d: 0.1 }); noise(c, d, t, 0.1, { v: 0.4, a: 0.002, d: 0.05, lp: 300 }); }],
    pop: [0.09, (c, d, t) => tone(c, d, t, 380, 0.05, { to: 1100, gl: 0.03, v: 0.25, a: 0.001, d: 0.02 })],
    applause: [3.3, (c, d, t) => {
      for (let k = 0; k < 110; k++) {
        const x = rnd();
        noise(c, d, t + x * 2.8, 0.02, { v: 0.6 * Math.sin(Math.PI * Math.min(1, x * 1.3)) + 0.1, a: 0.001, d: 0.008, bp: 900 + rnd() * 1600, q: 1.5 });
      }
      noise(c, d, t, 2.4, { v: 0.12, a: 0.4, r: 0.9, bp: 1500, q: 0.6 });
    }],
    groan: [1.7, (c, d, t) => crowdGroan(c, d, t)],
    titter: [1.3, (c, d, t) => crowdTitter(c, d, t)],
    murmur: [2.3, (c, d, t) => { babble(c, d, t, 2.2, { f: 120, v: 0.5 }); babble(c, d, t + 0.1, 2.1, { f: 150, v: 0.4 }); babble(c, d, t + 0.2, 2, { f: 195, v: 0.4 }); }],
    knock: [0.6, (c, d, t) => {
      for (let k = 0; k < 3; k++) {
        tone(c, d, t + k * 0.16, 190, 0.05, { to: 140, v: 0.45, a: 0.001, d: 0.025 });
        noise(c, d, t + k * 0.16, 0.03, { v: 0.35, a: 0.001, d: 0.012, bp: 900, q: 2 });
      }
    }],
    bike_bell: [1.2, (c, d, t) => {
      for (const s of [0, 0.17]) for (const [r, a, k] of [[1, 1, 0.3], [1.006, 0.6, 0.3], [2.76, 0.4, 0.15], [5.4, 0.2, 0.06]]) tone(c, d, t + s, 2300 * r, 0.8, { v: 0.09 * a, a: 0.001, d: k, r: 0.1 });
    }],
    bus: [3.7, (c, d, t) => {
      const g = c.createGain(); g.connect(d);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.5); g.gain.linearRampToValueAtTime(0, t + 3.5);
      tone(c, g, t, 46, 3.5, { type: 'sawtooth', to: 38, v: 0.35, a: 0.01, r: 0.1, lp: 260 });
      tone(c, g, t, 92, 3.5, { type: 'square', to: 76, v: 0.08, a: 0.01, r: 0.1, lp: 420 });
      noise(c, g, t, 3.5, { v: 0.3, a: 0.01, r: 0.1, brown: true, lp: 900 });
      noise(c, g, t, 3.5, { v: 0.04, a: 0.01, r: 0.1, bp: 2500, q: 0.5 }); // tyres on the wet road
    }],
    flash_hum: [2.7, (c, d, t) => {
      for (const det of [-12, 0, 12]) tone(c, d, t, 55, 2.4, { type: 'sawtooth', to: 220, gl: 2.3, det, v: 0.08, a: 0.4, r: 0.1, lp: 300, fto: 4000, fgl: 2.3 });
      tone(c, d, t, 880, 2.4, { to: 1760, gl: 2.3, v: 0.03, a: 1.5, r: 0.1, vib: [9, 30] });
    }],
    dynamo_hit: [0.4, (c, d, t) => { // the Dynamo sample doubles as the kick
      tone(c, d, t, 130, 0.25, { to: 48, gl: 0.1, v: 0.8, a: 0.002, d: 0.1, r: 0.05 });
      tone(c, d, t, 190, 0.12, { type: 'sawtooth', to: 70, v: 0.2, a: 0.002, d: 0.05, bp: 500, q: 1.2 });
      noise(c, d, t, 0.01, { v: 0.12, a: 0.0005, d: 0.003, lp: 4000 });
    }],
    rain_gutter: [2.4, (c, d, t) => {
      noise(c, d, t, 2.1, { v: 0.14, a: 0.15, r: 0.3, brown: true, lp: 1300 });
      noise(c, d, t, 2.1, { v: 0.6, a: 0.05, r: 0.3, buf: DRIPS });
      noise(c, d, t, 2.1, { v: 0.03, a: 0.1, r: 0.3, bp: 3200, q: 3 });
    }],
    dictaphone: [0.5, (c, d, t) => {
      noise(c, d, t, 0.01, { v: 0.4, a: 0.0005, d: 0.004, hp: 2000 });
      tone(c, d, t, 1200, 0.01, { v: 0.08, a: 0.0005, d: 0.004 });
      tone(c, d, t + 0.03, 180, 0.35, { type: 'triangle', v: 0.05, a: 0.02, r: 0.05, lp: 1200, vib: [9, 30] });
    }],
    cassette_eject: [0.4, (c, d, t) => {
      tone(c, d, t, 300, 0.05, { to: 170, v: 0.3, a: 0.001, d: 0.02 });
      noise(c, d, t, 0.03, { v: 0.35, a: 0.001, d: 0.012, bp: 1500 });
      for (const s of [0.06, 0.09, 0.13]) noise(c, d, t + s, 0.01, { v: 0.15, a: 0.0005, d: 0.004, hp: 3000 });
      tone(c, d, t + 0.02, 900, 0.1, { to: 700, v: 0.05, a: 0.001, d: 0.04 });
    }],
    polaroid: [1.15, (c, d, t) => {
      for (const s of [0, 0.06]) noise(c, d, t + s, 0.012, { v: 0.45, a: 0.0005, d: 0.005, hp: 2500 });
      tone(c, d, t + 0.15, 330, 0.8, { type: 'square', v: 0.04, a: 0.02, r: 0.05, lp: 1300, vib: [22, 40] });
      noise(c, d, t + 0.15, 0.8, { v: 0.04, a: 0.02, r: 0.05, bp: 1200 });
    }],
    chime_ready: [1.2, (c, d, t) => {
      for (const [s, m] of [[0, 79], [0.14, 86]]) {
        tone(c, d, t + s, mtof(m), 0.8, { v: 0.16, a: 0.003, d: 0.35, r: 0.2 });
        tone(c, d, t + s, mtof(m) * 3, 0.3, { v: 0.03, a: 0.003, d: 0.08, r: 0.1 });
      }
    }],
    truck_reverse: [2.5, (c, d, t) => { for (const s of [0, 0.95, 1.9]) tone(c, d, t + s, 1100, 0.45, { type: 'square', v: 0.08, a: 0.004, r: 0.01, lp: 3000 }); }],
    tube_flicker: [0.9, (c, d, t) => fluoro(c, d, t, 0.8, 0.1, [[0, 0.8]])],
    smoke_pop: [1.1, (c, d, t) => {
      tone(c, d, t, 140, 0.25, { to: 45, v: 0.6, a: 0.002, d: 0.08 });
      noise(c, d, t, 0.8, { v: 0.35, a: 0.002, d: 0.2, lp: 2500, fto: 400, fgl: 0.8 });
      for (let k = 0; k < 5; k++) noise(c, d, t + 0.05 + rnd() * 0.5, 0.01, { v: 0.15, a: 0.0005, d: 0.004, hp: 3000 });
    }],
    umbrella: [0.45, (c, d, t) => {
      noise(c, d, t, 0.18, { v: 0.3, a: 0.12, r: 0.02, bp: 800, fto: 2500, fgl: 0.18 });
      noise(c, d, t + 0.2, 0.012, { v: 0.5, a: 0.0005, d: 0.005, hp: 1500 });
      tone(c, d, t + 0.2, 600, 0.02, { v: 0.2, a: 0.0005, d: 0.008 });
    }],
  };

  // ---------------------------------------------------------- baked loops and music stems
  // { len, rms, whole(c, d, len): rendered in one go, bars: [count, fn(c, d, k)]: each bar rendered on its own
  //   context (one big graph renders many times slower), tail: release time per chunk, rev: [sec, mix, damp] and
  //   band: [lo, hi] applied over the assembled loop, xf: crossfade the tail over the head (noise beds) }
  // Everything else wraps note and reverb tails round onto the start, so every loop is seamless.
  const dur = (n, bpm) => n * 4 * 60 / bpm;
  const LOOPS = {
    rain: { len: 4, rms: 0.05, xf: 1, whole: (c, d) => { noise(c, d, 0, 4.5, { v: 0.3, brown: true, lp: 1400 }); noise(c, d, 0, 4.5, { v: 0.03, hp: 5000 }); noise(c, d, 0, 4.5, { v: 0.5, buf: DROPS, hp: 1500 }); } },
    rain_heavy: { len: 4, rms: 0.09, xf: 1, whole: (c, d) => {
      noise(c, d, 0, 4.5, { v: 0.4, brown: true, lp: 2400 }); noise(c, d, 0, 4.5, { v: 0.06, hp: 3000 });
      noise(c, d, 0, 4.5, { v: 0.4, brown: true, lp: 200 });
      noise(c, d, 0, 4.5, { v: 0.7, buf: DROPS, hp: 1200 }); noise(c, d, 0, 4.5, { v: 0.5, buf: DROPS, hp: 1200 });
    } },
    hum: { len: 2, rms: 0.02, xf: 1, whole: (c, d) => {
      tone(c, d, 0, 100, 2.5, { type: 'sawtooth', v: 0.5, lp: 350 }); tone(c, d, 0, 100, 2.5, { v: 0.3 });
      tone(c, d, 0, 200, 2.5, { v: 0.12 }); tone(c, d, 0, 100, 2.5, { type: 'square', v: 0.04, hp: 2500 });
    } },
    aircon: { len: 4, rms: 0.025, xf: 1, whole: (c, d) => {
      noise(c, d, 0, 4.5, { v: 0.5, brown: true, lp: 500 }); noise(c, d, 0, 4.5, { v: 0.03, bp: 1200, q: 0.5 });
      for (const s of [0.9, 2.9]) noise(c, d, s, 0.004, { v: 0.12, a: 0.0005, d: 0.002, hp: 2500 }); // the aircon ticking
    } },
    radio: { len: 6, rms: 0.05, xf: 1, whole: (c, d) => { // lodge transistor radio: a far-off announcer and a band, crackling
      const f = band(c, d, 350, 2800);
      babble(c, f, 0, 6.4, { f: 115, v: 0.3 });
      chord(c, f, 0, [57, 61, 64], 6.4, { type: 'triangle', v: 0.02, a: 0.5, r: 0.1, lp: 2000 });
      noise(c, d, 0, 6.4, { v: 0.1, buf: CRACKLE, lp: 5000 }); noise(c, d, 0, 6.4, { v: 0.008, bp: 3000, q: 0.7 });
    } },
    alarm: { len: 1, rms: 0.12, xf: 1, whole: (c, d) => siren(c, d, 0, 1.3, 0.2) },
    dynamo: { len: 1, rms: 0.1, xf: 1, whole: (c, d) => { // pitch follows the pedals through handle.rate()
      tone(c, d, 0, 220, 1.3, { type: 'sawtooth', v: 0.4, bp: 700, q: 2 }); tone(c, d, 0, 440, 1.3, { type: 'triangle', v: 0.1 });
      noise(c, d, 0, 1.3, { v: 0.05, bp: 1100, q: 1.5 });
    } },
    walkman: { len: 6, rms: 0.08, xf: 1, whole: (c, d) => { // "Winning Is a Decision", leaking from foam headphones
      babble(c, band(c, d, 900, 3500), 0, 6.4, { f: 135, v: 0.4, wob: 0.8, wobc: 60, fast: true });
      noise(c, d, 0, 6.4, { v: 0.008, hp: 5000 });
    } },
    clock_tick: { len: 2, rms: 0.01, tail: 0.1, whole: (c, d) => { clockTick(c, d, 0.5, 3500); clockTick(c, d, 1.5, 2600); } },
    city: { len: 6, rms: 0.04, xf: 1, whole: (c, d) => {
      const g = c.createGain(); g.gain.value = 0.8; lfo(c, g.gain, 1 / 6, 0.2); g.connect(d);
      noise(c, g, 0, 6.5, { v: 0.4, brown: true, lp: 320 }); noise(c, g, 0, 6.5, { v: 0.1, brown: true, lp: 1100 });
      noise(c, d, 0, 6.5, { v: 0.008, bp: 2000, q: 0.5 });
    } },
    hold_music: { len: dur(4, 100), rms: 0.07, band: [400, 3000], bars: [4, (c, d, k) => { // the store's hold music, down a phone line
      const st = 60 / 100 / 4, ch = [[55, 59, 60, 64], [55, 57, 60, 64], [57, 60, 62, 65], [55, 59, 62, 65]][k], rt = [36, 45, 38, 43][k];
      const mel = [[[0, 76, 6], [6, 74, 2], [8, 72, 4], [12, 71, 4]], [[0, 72, 6], [6, 71, 2], [8, 69, 8]], [[0, 74, 6], [6, 72, 2], [8, 69, 4], [12, 65, 4]], [[0, 67, 8], [8, 71, 4], [12, 74, 4]]][k];
      for (const s of [0, 6, 10]) for (const m of ch) fm(c, d, s * st, mtof(m), st * 3, { ratio: 1, index: 1.2, md: 0.3, v: 0.04, a: 0.003, d: 0.5, r: 0.2 });
      bassN(c, d, 0, rt, st * 7, 0.3); bassN(c, d, 8 * st, rt + 7, st * 5, 0.3); bassN(c, d, 14 * st, rt, st * 2, 0.25);
      for (const [s, m, l] of mel) marimba(c, d, s * st, m, l * st, 0.12);
      for (let s = 0; s < 16; s += 2) hat(c, d, s * st, 0.02);
    }] },
    typing: { len: 4, rms: 0.03, tail: 0.2, bars: [4, (c, d) => { for (let x = 0.02; x < 1; x += rnd() < 0.12 ? 0.35 + rnd() * 0.3 : 0.07 + rnd() * 0.08) type1(c, d, x, 0.2 + rnd() * 0.15); }] },
    fluoro: { len: 3, rms: 0.03, xf: 1, whole: (c, d) => fluoro(c, d, 0, 3.4, 0.3, [[0.6, 0.85], [2.1, 2.25]]) },
  };

  const CUES = {
    // Title: one sustained pad, a slow Campanile bell every 8 bars.
    title: { len: dur(8, 64), rev: [3.5, 0.45, 0.7], tail: 4, whole: (c, d, len) => {
      chord(c, d, 0, [50, 57, 64, 66, 69], len, { v: 0.03, a: 3, r: 3, lp: 900, lfoF: lfoOut(c, 2 / len, 500), det: [-10, -3, 6] });
      chord(c, d, 0, [38, 50], len, { type: 'triangle', v: 0.06, a: 3, r: 3, lp: 400, det: [0] });
      bell(c, d, 0.02, mtof(62), 0.1);
    } },
    // "The demo" by Pudding: bright lo-fi. Detuned saw chords through a low-pass, soft kick and snare,
    // vinyl crackle, and the hook his finished song will use (same key, same four chords).
    demo: { len: dur(4, 88), rev: [1.2, 0.2, 0.5], band: [30, 5500], bars: [4, (c, d, k) => {
      const st = 60 / 88 / 4, wob = lfoOut(c, 0.45, 9), rt = [38, 35, 43, 45][k];
      const ch = [[50, 57, 61, 64, 66], [50, 54, 57, 61, 66], [50, 54, 57, 59, 62], [49, 52, 55, 59, 64]][k];
      chord(c, d, 0, ch, 9 * st, { v: 0.045, a: 0.02, d: 0.8, s: 0.5, r: 0.4, lp: 2400, wob });
      chord(c, d, 10 * st, ch, 5 * st, { v: 0.036, a: 0.02, d: 0.5, s: 0.5, r: 0.4, lp: 2000, wob });
      for (const [s, l] of [[0, 6], [7, 3], [10, 5]]) bassN(c, d, s * st, rt, l * st, 0.11, 500);
      for (const s of [0, 7, 10]) kick(c, d, s * st, s ? 0.18 : 0.25);
      for (const s of [4, 12]) snare(c, d, s * st, 0.16);
      for (let s = 0; s < 16; s += 2) hat(c, d, (s + (s % 4 ? 0.33 : 0)) * st, s % 4 ? 0.035 : 0.05); // swung 8ths
      for (const [s, m] of [[0, 74], [2, 81], [5, 79], [7, 81], [10, 86], [13, 78]]) fm(c, d, s * st, mtof(m), 0.3, { ratio: 1, index: 1.6, md: 0.4, v: 0.07, a: 0.004, d: 0.5, r: 0.3 });
    }], whole: (c, d, len) => { noise(c, d, 0, len, { v: 0.2, buf: CRACKLE, bp: 3000, q: 0.5, r: 0.02 }); noise(c, d, 0, len, { v: 0.004, hp: 4000, r: 0.02 }); } },
    // Reddy gameplay: light and bouncy; octave bass, muted offbeat plucks, a marimba tune. F major, 112 BPM.
    reddy: { len: dur(8, 112), rev: [0.8, 0.12, 0.4], bars: [8, (c, d, k) => {
      const st = 60 / 112 / 4, rt = [41, 38, 46, 36, 41, 45, 46, 36][k];
      const ch = [[53, 57, 60], [50, 53, 57], [50, 53, 58], [52, 55, 60], [53, 57, 60], [52, 57, 60], [50, 53, 58], [52, 55, 58]][k];
      const A = [[0, 72, 2], [3, 69, 1], [4, 72, 2], [8, 77, 3], [12, 76, 2], [14, 74, 2]];
      const mel = [A, [[0, 74, 3], [4, 69, 2], [6, 72, 2], [8, 74, 4], [14, 77, 2]], [[0, 74, 2], [2, 72, 2], [4, 70, 4], [8, 65, 2], [10, 67, 2], [12, 70, 4]],
        [[0, 72, 4], [6, 76, 2], [8, 79, 4], [12, 76, 4]], A, [[0, 76, 3], [4, 72, 2], [6, 69, 2], [8, 72, 4], [14, 76, 2]],
        [[0, 77, 2], [2, 74, 2], [4, 70, 4], [8, 74, 2], [10, 72, 2], [12, 70, 2], [14, 69, 2]], [[0, 67, 2], [2, 69, 2], [4, 70, 2], [6, 72, 2], [8, 76, 4], [12, 79, 4]]][k];
      for (let s = 0; s < 16; s += 2) tone(c, d, s * st, mtof(rt + (s % 4 ? 12 : 0)), st * 1.2, { type: 'triangle', v: 0.22, a: 0.003, d: 0.08, s: 0.2, r: 0.04, lp: 900 });
      for (const s of [2, 6, 10, 14]) for (const m of ch) pluck(c, d, s * st, m, 0.05, 2600);
      for (const [s, m, l] of mel) marimba(c, d, s * st, m, l * st, 0.13);
      kick(c, d, 0, 0.4); kick(c, d, 8 * st, 0.35);
      for (const s of [4, 12]) { noise(c, d, s * st, 0.05, { v: 0.12, a: 0.001, d: 0.015, bp: 3000, q: 1 }); tone(c, d, s * st, 330, 0.03, { v: 0.06, a: 0.001, d: 0.012 }); }
      for (let s = 2; s < 16; s += 4) hat(c, d, s * st, 0.04);
      for (let s = 0; s < 16; s++) hat(c, d, s * st, 0.012);
    }] },
    // JARVIS Sale: the same store, faster and busier. 144 BPM, sixteenth arps, stabs, four on the floor.
    reddy_frantic: { len: dur(8, 144), rev: [0.6, 0.1, 0.4], bars: [8, (c, d, k) => {
      const st = 60 / 144 / 4, rt = [41, 38, 46, 36, 41, 38, 37, 36][k], ARP = [0, 1, 2, 3, 2, 1];
      const ch = [[53, 57, 60], [50, 53, 57], [50, 53, 58], [48, 52, 55], [53, 57, 60], [50, 53, 57], [49, 53, 56], [48, 52, 55]][k];
      for (let s = 0; s < 16; s += 2) tone(c, d, s * st, mtof(rt + (s === 6 || s === 14 ? 12 : 0)), st * 1.1, { type: 'sawtooth', v: 0.07, a: 0.002, d: 0.06, s: 0.3, r: 0.03, lp: 800 });
      for (let s = 0; s < 16; s++) { const j = ARP[s % 6]; pluck(c, d, s * st, (j === 3 ? ch[0] + 12 : ch[j]) + 12, 0.06, 3000); }
      for (const s of [0, 3, 6, 10]) chord(c, d, s * st, ch.map((m) => m + 12), st * 1.2, { v: 0.025, a: 0.003, d: 0.1, s: 0.2, r: 0.05, lp: 3500 });
      for (const s of [0, 4, 8, 12]) kick(c, d, s * st, 0.25);
      for (const s of (k === 7 ? [4, 12, 13, 14, 15] : [4, 12])) snare(c, d, s * st, s > 12 ? 0.14 : 0.2);
      for (let s = 0; s < 16; s++) hat(c, d, s * st, s % 2 ? 0.035 : 0.022);
    }] },
    // 1987 Dublin: gentle, wistful, D minor, 72 BPM. Pad, harp arpeggios, a whistle-like tune in bars 5-8.
    dublin: { len: dur(8, 72), rev: [3, 0.4, 0.7], tail: 2.5, bars: [8, dublinBar(72,
      [[50, 53, 57, 62], [46, 53, 58, 62], [48, 53, 57, 60], [48, 52, 55, 60], [50, 53, 57, 62], [46, 53, 58, 62], [43, 50, 55, 58], [45, 52, 57, 61]],
      [38, 34, 41, 36, 38, 34, 43, 33],
      [[[0, 69, 1], [1, 74, 1], [2, 76, 1], [3, 77, 1]], [[0, 77, 2], [2, 74, 1], [3, 70, 1]], [[0, 74, 1.5], [1.5, 72, 0.5], [2, 70, 1], [3, 67, 1]], [[0, 73, 2], [2, 69, 2]]], 1100, 1)] },
    // Act Three: the same tune lifts to D major (and toward Pudding's chords).
    dublin_major: { len: dur(8, 76), rev: [3, 0.4, 0.7], tail: 2.5, bars: [8, dublinBar(76,
      [[50, 54, 57, 62], [47, 50, 55, 59], [47, 50, 54, 59], [45, 52, 57, 61], [50, 54, 57, 62], [47, 50, 55, 59], [47, 52, 55, 59], [45, 52, 57, 61]],
      [38, 43, 35, 33, 38, 43, 40, 33],
      [[[0, 69, 1], [1, 74, 1], [2, 76, 1], [3, 78, 1]], [[0, 79, 2], [2, 78, 1], [3, 74, 1]], [[0, 76, 1.5], [1.5, 74, 0.5], [2, 71, 1], [3, 67, 1]], [[0, 73, 2], [2, 76, 2]]], 1400, 2)] },
    // The Buttery radio: generic (original) 1987 synth-pop. A minor, 116 BPM, band-limited like a radio.
    buttery_radio: { len: dur(8, 116), rev: [0.9, 0.15, 0.4], band: [140, 6000], bars: [8, (c, d, k) => {
      const st = 60 / 116 / 4, ch = [[57, 60, 64], [57, 60, 65], [55, 60, 64], [55, 59, 62]][k % 4], rt = [45, 41, 36, 43][k % 4], big = rev(c, d, 0.5, 0.6, 0.3);
      for (let s = 0; s < 16; s += 2) tone(c, d, s * st, mtof(rt + (s === 6 || s === 14 ? 12 : 0)), st * 1.6, { type: 'sawtooth', v: 0.16, a: 0.003, d: 0.1, s: 0.3, r: 0.03, lp: 900, fto: 300, fgl: 0.1 });
      chord(c, d, 0, ch, 16 * st - 0.05, { v: 0.02, a: 0.05, r: 0.3, lp: 2000 });
      for (const s of [3, 6, 11]) for (const m of ch) fm(c, d, s * st, mtof(m + 12), st * 2, { ratio: 1, index: 2.5, md: 0.15, v: 0.03, a: 0.002, d: 0.3, r: 0.15 });
      if (k < 4) for (let s = 0; s < 16; s += 2) fm(c, d, s * st, mtof(ch[(s / 2) % 3] + 24), st * 2, { ratio: 3.5, index: 1, md: 0.1, v: 0.02, a: 0.002, d: 0.2, r: 0.1 });
      else for (const [s, m, l] of [[[0, 76, 2], [2, 74, 2], [4, 72, 4], [8, 69, 4], [12, 72, 4]], [[0, 72, 4], [4, 74, 2], [6, 72, 2], [8, 69, 8]],
        [[0, 76, 2], [2, 74, 2], [4, 72, 4], [8, 79, 4], [12, 76, 4]], [[0, 74, 6], [6, 71, 2], [8, 74, 4], [12, 67, 4]]][k - 4]) {
        tone(c, d, s * st, mtof(m), l * st, { type: 'square', v: 0.05, a: 0.01, d: 0.3, s: 0.6, r: 0.08, vib: [6, 12], lp: 2800 });
      }
      for (const s of [0, 8, 10]) kick(c, d, s * st, 0.45);
      for (const s of [4, 12]) snare(c, big, s * st, 0.3); // big 80s snare
      for (let s = 0; s < 16; s += 2) hat(c, d, s * st, 0.04, s === 14);
    }] },
    // Emotional scenes: sparse piano-like FM notes, lots of air.
    emotional: { len: dur(8, 66), rev: [3.5, 0.45, 0.7], tail: 4, bars: [8, (c, d, k) => {
      const b = 60 / 66, N = [[[0, [50, 62, 66]], [2, [69]]], [[0, [47, 59, 62]], [2.5, [66]]], [[0, [43, 55, 59]], [2, [62]], [3, [67]]], [[0, [45, 57, 61]], [2, [64]]],
        [[0, [50, 66]], [2, [62]], [3, [69]]], [[0, [47, 62, 66]], [2, [71]]], [[0, [43, 59, 67]], [1, [62]], [2, [71]]], [[0, [45, 61, 64]], [2.5, [57]]]][k];
      for (const [beat, ms] of N) for (const m of ms) piano(c, d, beat * b, m, m < 52 ? 0.08 : 0.1);
    }] },
    // Black Monday: one held note (A3; periodic in 4 s, so the loop is seamless).
    held_note: { len: 4, xf: 1, whole: (c, d) => {
      const g = c.createGain(); g.gain.value = 0.75; lfo(c, g.gain, 0.5, 0.2); g.connect(d);
      tone(c, g, 0, 220, 4.6, { v: 0.25, a: 0.01, r: 0.01 });
      tone(c, g, 0, 220.25, 4.6, { type: 'triangle', v: 0.08, a: 0.01, r: 0.01, lp: 800 });
      tone(c, g, 0, 110, 4.6, { v: 0.1, a: 0.01, r: 0.01 });
    } },
  };
  function dublinBar(bpm, CH, RT, MEL, lp, arpRatio) {
    const b = 60 / bpm, ARP = [0, 1, 2, 3, 2, 1, 2, 3];
    return (c, d, k) => {
      const ch = CH[k];
      chord(c, d, 0, ch, 4 * b, { v: 0.025, a: 1, r: 1.5, lp });
      tone(c, d, 0, mtof(RT[k]), 3.6 * b, { v: 0.06, a: 0.05, d: 1.5, s: 0.4, r: 0.5 });
      tone(c, d, 0, mtof(RT[k]), 3.6 * b, { type: 'triangle', v: 0.06, a: 0.05, d: 1.5, s: 0.4, r: 0.5, lp: 500 });
      for (let i = 0; i < 8; i++) fm(c, d, i * b / 2, mtof(ch[ARP[i]] + 12), 0.6, { ratio: arpRatio, index: 1.5, md: 0.15, v: i % 2 ? 0.035 : 0.05, a: 0.003, d: 0.5, r: 0.4 });
      if (k >= 4) for (const [s, m, l] of MEL[k - 4]) flute(c, d, s * b, m, l * b * 0.95, 0.09);
    };
  }
  const BED = { dublin: 0.6, dublin_major: 0.35 }; // cues that play over the rain loop

  // ---------------------------------------------------------- the Pudding song (SPEC section 14)
  const STEP = 60 / 92 / 4, BAR = 16 * STEP;
  const MEL = [0, 4, 7, 4, 2, 5, 9, 7, 4, 7, 12, 9, 7, 4, 2, 0].map((n) => Math.pow(2, n / 12)); // D5 F#5 A5 F#5 E5 G5 B5 A5 F#5 A5 D6 B5 A5 F#5 E5 D5
  const DEF = [[0, 4, 8, 12], [4, 12], [0, 2, 4, 6, 8, 10, 12, 14], [0, 2, 5, 7, 10, 13]].map((on) => Array.from({ length: 16 }, (_, i) => on.includes(i)));
  const LANES = [['dynamo', 'dynamo_hit', 0.55, 0.35], ['till', 'till', 0.4, 0.35], ['kettle', 'kettle_click', 0.3, 0.3], ['whistle', 'whistle', 0.75, 0.5]]; // sample, sfx, gain, bleep gain
  const SONG_PADS = [[50, 54, 57, 62], [50, 55, 59, 62], [50, 54, 59, 62], [49, 52, 57, 64]], SONG_BASS = [38, 43, 35, 33]; // D G Bm A
  const STEMS = () => [ // [kind, index, seconds, recipe]
    ...SONG_PADS.map((ch, i) => ['pad', i, BAR + 1, (c, d, t) => chord(c, d, t, ch, BAR, { v: 0.03, a: 0.25, r: 0.7, lp: 1800, det: [-9, 0, 9] })]),
    ...SONG_BASS.map((m, i) => ['bass', i, 1, (c, d, t) => bassN(c, d, t, m, 0.7, 0.35, 900)]),
    ['bleep', 0, 0.15, (c, d, t) => tone(c, d, t, 98, 0.1, { type: 'square', to: 65, v: 0.25, a: 0.002, d: 0.06, lp: 1500 })],
    ['bleep', 1, 0.12, (c, d, t) => { tone(c, d, t, 294, 0.08, { type: 'square', v: 0.16, a: 0.002, d: 0.04 }); noise(c, d, t, 0.05, { v: 0.1, a: 0.001, d: 0.02, bp: 3000 }); }],
    ['bleep', 2, 0.05, (c, d, t) => tone(c, d, t, 2093, 0.025, { type: 'square', v: 0.07, a: 0.001, d: 0.01 })],
    ['bleep', 3, 0.22, (c, d, t) => tone(c, d, t, mtof(74), 0.16, { type: 'square', v: 0.12, a: 0.004, d: 0.12, s: 0.4, r: 0.04, lp: 3500 })],
  ];
  const players = [];
  let pumpId = 0;
  function play(b, t, dest, rate) {
    if (!b) return;
    const s = ctx.createBufferSource();
    s.buffer = b; if (rate !== 1) s.playbackRate.value = rate;
    s.connect(dest); s.start(t);
  }
  const gainTo = (dest, v) => { const g = ctx.createGain(); g.gain.value = v; g.connect(dest); return g; };
  // mode: 'seq' (the 3.3 grid: drums + lead, live pattern), 'loop' (full band, forever or o.bars),
  // 'credits' (intro, 8 bars, 4-bar breakdown of rain + lead, 8 bars, bell ending).
  function player(pattern, samples, mode, o = {}) {
    const has = (k) => !!(samples && samples.includes(k)), out = gainTo(o.dest || busM, 1);
    const pat = pattern || DEF;
    const p = { pat, mode, out, onStep: o.onStep, onEnd: o.onEnd, bars: o.bars || 0, ending: !!o.ending, done: false, endAt: 0, i: 0,
      t: ctx.currentTime + 0.06, bell: has('bell'), trill: has('trill'), lane: [], lg: [], rain: null,
      lead: pat[3] && pat[3].some(Boolean) ? pat[3] : DEF[3], // the breakdown never goes silent
      qt: new Float64Array(64), qi: new Int8Array(64), qh: 0, qn: 0 };
    LANES.forEach(([k, name, v1, v2], l) => { const ok = has(k) && B[name]; p.lane.push(ok ? B[name] : S.bleep[l]); p.lg.push(gainTo(out, ok ? v1 : v2)); });
    p.bassG = gainTo(out, 0.35); p.padG = gainTo(out, 0.7); p.fxG = gainTo(out, 0.45);
    p.first = mode === 'credits' || p.trill ? 1 : 0; // intro bar
    if ((has('rain') || mode === 'credits') && L.rain) { // the credits breakdown is rain + lead, collected or not
      p.rain = ctx.createBufferSource(); p.rain.buffer = L.rain; p.rain.loop = true;
      p.rain.connect(gainTo(out, 0.5)); p.rain.start(p.t);
    }
    players.push(p);
    if (!pumpId) pumpId = setInterval(pump, 25);
    pump();
    return p;
  }
  function coda(p, t) { // the ending: the D chord, the bass, and the bell if Chase recorded it
    play(S.pad[0], t, p.padG, 1); play(S.bass[0], t, p.bassG, 1);
    const bell = p.bell || p.mode === 'credits'; // the credits always end on the bell
    if (bell) play(B.bell, t, p.fxG, 1);
    p.done = true; p.endAt = t + (bell ? 7 : 4);
  }
  function step(p, t) {
    const bar = p.i >> 4, s = p.i & 15, k = bar - p.first, pat = p.pat, band = p.mode !== 'seq';
    let sec = 1; // 0 intro, 1 full, 2 breakdown
    if (bar < p.first) sec = 0;
    else if (p.mode === 'credits') {
      if (k >= 20) { coda(p, t); return; }
      if (k >= 8 && k < 12) sec = 2;
    } else if (p.bars && k >= p.bars) { if (p.ending) coda(p, t); else { p.done = true; p.endAt = t + 1; } return; }
    if (s === 0) {
      if (sec === 0) { if (p.trill) play(B.trill, t, p.fxG, 1); if (band) play(S.pad[0], t, p.padG, 1); }
      else {
        if (sec === 1 && band) play(S.pad[k & 3], t, p.padG, 1);
        if (p.bell && p.mode !== 'credits' && (k & 3) === 0) play(B.bell, t, p.fxG, 1);
      }
    }
    if (sec === 0) return;
    if (sec === 1) for (let l = 0; l < 3; l++) if (pat[l] && pat[l][s]) play(p.lane[l], t, p.lg[l], 1);
    const lead = sec === 2 ? p.lead : pat[3];
    if (lead && lead[s]) play(p.lane[3], t, p.lg[3], MEL[s]);
    if (sec === 1 && band && (s === 0 || s === 6 || s === 8 || s === 14)) play(S.bass[k & 3], t, p.bassG, s === 14 ? 1.4983 : 1);
    if (p.onStep && p.qn < 64) { const j = (p.qh + p.qn) & 63; p.qt[j] = t; p.qi[j] = s; p.qn++; }
  }
  function pump() { // look-ahead scheduler: timing comes from the audio clock, the interval only feeds it
    if (!ctx) return;
    const now = ctx.currentTime, ahead = now + (document.hidden ? 1.2 : 0.2);
    for (let j = players.length - 1; j >= 0; j--) {
      const p = players[j];
      while (!p.done && p.t < ahead) { step(p, p.t); p.i++; p.t += STEP; }
      while (p.qn && p.qt[p.qh] <= now) { const i = p.qi[p.qh]; p.qh = (p.qh + 1) & 63; p.qn--; p.onStep(i); }
      if (p.done && now >= p.endAt) { players.splice(j, 1); release(p, 0.05); if (p.onEnd) p.onEnd(); }
    }
    if (!players.length) { clearInterval(pumpId); pumpId = 0; }
  }
  function release(p, fade) {
    const t = ctx.currentTime;
    p.done = true;
    hold(p.out.gain, t); p.out.gain.linearRampToValueAtTime(0, t + fade);
    if (p.rain) p.rain.stop(t + fade + 0.02);
    setTimeout(() => p.out.disconnect(), (fade + 0.3) * 1000);
  }
  function stopPlayer(p, fade) {
    const j = players.indexOf(p);
    if (j < 0) return;
    players.splice(j, 1); release(p, fade);
  }
  function hold(p, t) {
    if (p.cancelAndHoldAtTime) p.cancelAndHoldAtTime(t);
    else { const v = p.value; p.cancelScheduledValues(t); p.setValueAtTime(v, t); }
  }

  // ---------------------------------------------------------- baking
  function buf(data, rate) { const b = new AudioBuffer({ length: data.length, sampleRate: rate, numberOfChannels: 1 }); b.copyToChannel(data, 0); return b; }
  function scale(d, rms) { // RMS-normalise, never past 0.95 peak
    let s = 0, pk = 1e-9;
    for (let i = 0; i < d.length; i++) { s += d[i] * d[i]; pk = Math.max(pk, Math.abs(d[i])); }
    const k = Math.min(rms / Math.max(1e-9, Math.sqrt(s / d.length)), 0.95 / pk);
    for (let i = 0; i < d.length; i++) d[i] *= k;
  }
  async function render(len, rate, fn) { // one small offline context -> samples
    const c = new OfflineAudioContext(1, Math.ceil(len * rate), rate);
    fn(c, c.destination);
    return (await c.startRendering()).getChannelData(0);
  }
  async function bake(o) {
    const n = Math.round(o.len * MR), dry = new Float32Array(n), tail = o.tail ?? 1.5, jobs = [];
    const add = (d, at) => { for (let i = 0; i < d.length; i++) dry[(at + i) % n] += d[i]; };
    if (o.whole) jobs.push(render(o.len + (o.xf ? 0.3 : tail), MR, (c, d) => o.whole(c, d, o.len)).then((d) => {
      if (!o.xf) return add(d, 0);
      const x = d.length - n; // crossfade the continuation over the head
      for (let i = 0; i < n; i++) dry[i] += i < x ? d[i] * Math.sin((i / x) * Math.PI / 2) + d[n + i] * Math.cos((i / x) * Math.PI / 2) : d[i];
    }));
    if (o.bars) {
      const [cnt, fn] = o.bars, bl = o.len / cnt;
      for (let k = 0; k < cnt; k++) jobs.push(render(bl + tail, MR, (c, d) => fn(c, d, k)).then((d) => add(d, Math.round(k * bl * MR))));
    }
    await Promise.all(jobs);
    let out = dry;
    if (o.rev || o.band) { // one pass over the assembled loop; the reverb tail wraps round too
      const sec = o.rev ? o.rev[0] : 0;
      out = await render(o.len + sec, MR, (c, d) => {
        const s = c.createBufferSource();
        let x = o.rev ? rev(c, d, o.rev[0], o.rev[1], o.rev[2]) : d;
        if (o.band) x = band(c, x, o.band[0], o.band[1]);
        s.buffer = buf(dry, MR); s.connect(x); s.start(0);
      });
      for (let i = n; i < out.length; i++) out[i - n] += out[i];
      out = out.subarray(0, n);
    }
    scale(out, o.rms ?? 0.12);
    return buf(out, MR);
  }
  function loopable(n, x, fill) { // JS-generated texture with its end crossfaded into its start
    const a = new Float32Array(n + x);
    fill(a);
    for (let i = 0; i < x; i++) { const k = (i / x) * Math.PI / 2; a[i] = a[i] * Math.sin(k) + a[n + i] * Math.cos(k); }
    return buf(a.subarray(0, n), SR);
  }
  function clicks(sec, perSec, fLo, fHi, dec, amp) { // damped-sine pings at random times (drops, drips, crackle)
    const n = Math.round(sec * SR), a = new Float32Array(n), L = Math.round(dec * SR * 5);
    for (let k = Math.round(sec * perSec); k > 0; k--) {
      const at = rnd() * n | 0, w = 2 * Math.PI * (fLo + rnd() * (fHi - fLo)) / SR, v = amp * (0.3 + rnd() * 0.7) * (rnd() < 0.5 ? -1 : 1);
      for (let i = 0; i < L; i++) a[(at + i) % n] += v * Math.exp(-i / (dec * SR)) * Math.sin(w * i);
    }
    return buf(a, SR);
  }

  async function prerender() {
    if (typeof OfflineAudioContext === 'undefined' || typeof AudioBuffer === 'undefined' || WHITE) return;
    const idle = () => new Promise((r) => setTimeout(r, 0));
    WHITE = loopable(SR * 2, 2000, (a) => { for (let i = 0; i < a.length; i++) a[i] = rnd() - 0.5; });
    BROWN = loopable(SR * 2, 4000, (a) => { let y = 0; for (let i = 0; i < a.length; i++) { y = (y + 0.02 * (rnd() * 2 - 1)) / 1.02; a[i] = y * 3.5; } });
    DROPS = clicks(3.7, 30, 2000, 5000, 0.0015, 0.5);
    DRIPS = clicks(5.3, 5, 700, 1400, 0.02, 0.6);
    CRACKLE = clicks(2.9, 25, 2500, 9000, 0.0003, 0.8);
    PULSE = [new Float32Array(40), new Float32Array(40)];
    for (let n = 1; n < 40; n++) PULSE[0][n] = 2 * Math.sin(n * Math.PI * 0.125) / (n * Math.PI);
    WARM = [new Float32Array(8), Float32Array.of(0, 1, 0.5, 0.3, 0.18, 0.1, 0.06, 0.03)]; // a sine with a little body: low voices carry on small speakers
    DIST = new Float32Array(256);
    for (let i = 0; i < 256; i++) DIST[i] = Math.tanh(3 * (i / 127.5 - 1)) / Math.tanh(3);
    // many small contexts in parallel, a yield between groups so the loader keeps animating
    await Promise.all(Object.keys(SFX).map((k) => render(SFX[k][0], SR, (c, d) => SFX[k][1](c, d, 0)).then((d) => { B[k] = buf(d, SR); })));
    await idle();
    await Promise.all(STEMS().map(([k, i, len, fn]) => render(len, SR, (c, d) => fn(c, d, 0)).then((d) => { S[k][i] = buf(d, SR); })));
    await idle();
    await renderVoices();
    await idle();
    await Promise.all(Object.keys(LOOPS).map((k) => bake(LOOPS[k]).then((b) => { L[k] = b; })));
    await idle();
    await Promise.all(Object.keys(CUES).map((k) => bake(CUES[k]).then((b) => { M[k] = b; })));
  }

  // Voice blips (SPEC section 6): per character 4 vowel-coloured variants + a rising one for question tails.
  const WAVE_V = { sine: 0.5, triangle: 0.4, square: 0.15, pulse: 0.2, sawtooth: 0.18 };
  async function renderVoices() {
    await Promise.all(Object.keys(CHARACTERS).map(async (id) => {
      const v = CHARACTERS[id].voice;
      const a = await Promise.all([0, 1, 2, 3, 4].map((k) => {
        const rising = k === 4, len = v.len * (rising ? 1.5 : 1);
        return render(len + 0.06, SR, (c, d) => {
          const f = v.f * (v.tumble && !rising ? [1.1, 0.94, 1.04, 0.9][k] : 1), pk = c.createBiquadFilter();
          pk.type = 'peaking'; pk.frequency.value = [700, 1100, 1600, 2300, 1100][k]; pk.gain.value = v.mono ? 0 : 7; pk.Q.value = 1.8;
          pk.connect(d);
          tone(c, pk, 0, f, len, {
            type: v.wave === 'pulse' ? 'square' : v.wave, wave: v.wave === 'pulse' ? c.createPeriodicWave(PULSE[0], PULSE[1]) : v.wave === 'sine' ? c.createPeriodicWave(WARM[0], WARM[1]) : null,
            v: WAVE_V[v.wave] || 0.3, a: v.soft ? 0.015 : 0.003, d: len * (v.soft ? 0.8 : 0.6), s: 0.3, r: v.soft ? 0.04 : 0.015,
            lp: v.filter, q: 1, to: rising ? f * 1.35 : v.mono ? 0 : f * (v.tumble ? [0.92, 1.06, 0.95, 1.08][k] : 0.96), gl: len,
          });
        });
      }));
      let s = 0, n = 0;
      for (const x of a) { let y = 0, p = 0; for (let i = 0; i < x.length; i++) { y = 0.959 * (y + x[i] - p); p = x[i]; s += y * y; n++; } } // loudness through a 300 Hz high-pass (low hums read quieter)
      const g = (v.soft ? 0.06 : 0.07) / Math.max(1e-9, Math.sqrt(s / n)); // every voice equally loud; Rue at 58, Des and co. a touch softer
      for (const x of a) for (let i = 0; i < x.length; i++) x[i] *= g;
      V[id] = { n: a.slice(0, 4).map((x) => buf(x, SR)), q: buf(a[4], SR), min: v.len + 0.02 + (v.gap || 0), mono: !!v.mono, also: v.also, last: 0 };
    }));
  }

  // ---------------------------------------------------------- runtime
  function applyOptions() {
    if (!ctx) return;
    const t = ctx.currentTime;
    busM.gain.setTargetAtTime(silenced ? 0 : (options.music ?? 0.8) * (ducked ? CONFIG.duck : 1), t, silenced ? 0.05 : 0.12);
    busS.gain.setTargetAtTime(options.sfx ?? 0.9, t, 0.05);
    busV.gain.setTargetAtTime(options.voice ?? 0.9, t, 0.05);
  }
  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return; }
    const master = ctx.createGain(), lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -6; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = 0.003; lim.release.value = 0.2;
    master.connect(lim); lim.connect(ctx.destination);
    busM = gainTo(master, 0); busS = gainTo(master, 0); busV = gainTo(master, 0);
    const send = (sec, damp) => { const cv = ctx.createConvolver(), g = gainTo(cv, 0); cv.buffer = impulse(ctx.sampleRate, sec, damp, 2); cv.connect(master); busS.connect(g); return g; };
    sendRoom = send(0.6, 0.3); sendWet = send(2.2, 0.8);
    applyOptions();
    if (typeof on === 'function') on('options', applyOptions);
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  }
  function setPos(p, x, y, z) { // [x,y,z] | {x,y,z} | anchor name | x, y, z
    if (typeof x === 'string') { let a = null; try { a = world.anchor(x); } catch (e) { /* no world yet */ } if (!a) return; x = a.at; }
    if (x && typeof x === 'object') { y = x.y ?? x[1]; z = x.z ?? x[2]; x = x.x ?? x[0]; }
    if (p.positionX) { p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z; } else p.setPosition(x, y, z);
  }
  function place(node, o, hrtf) { // positional (o.at), panned (o.pan) or plain; returns the node to connect onward
    if (hrtf || (o && o.at != null)) {
      const p = ctx.createPanner();
      p.panningModel = hrtf ? 'HRTF' : 'equalpower'; p.distanceModel = 'inverse';
      p.refDistance = hrtf ? 1 : 2; p.rolloffFactor = hrtf ? 1.3 : 1;
      setPos(p, (o && o.at) || [0, 0, 0]);
      node.connect(p);
      return p;
    }
    if (o && o.pan) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; node.connect(p); return p; }
    return node;
  }

  function sfx(name, o) {
    if (!ctx || !B[name]) return;
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = B[name];
    if (o && o.rate) s.playbackRate.value = o.rate;
    g.gain.value = o && o.vol != null ? o.vol : 1;
    let n = g;
    if (o && o.lp) { n = ctx.createBiquadFilter(); n.type = 'lowpass'; n.frequency.value = o.lp; g.connect(n); } // o.lp: muffled (through a door)
    s.connect(g); place(n, o, false).connect(busS);
    s.start();
  }

  const NOOP = { stop() {}, vol() {}, rate() {}, pos() {} };
  const live = new Set();
  let alarms = 0;
  function loop(name, o = {}) {
    const b = name === 'buttery_radio' ? M.buttery_radio : L[name];
    if (!ctx || !b) return NOOP;
    const s = ctx.createBufferSource(), g = ctx.createGain(), t = ctx.currentTime;
    const det = name === 'alarm' ? 1 + 0.013 * alarms++ : 1; // each layered alarm slightly detuned
    s.buffer = b; s.loop = true; s.playbackRate.value = (o.rate || 1) * det;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(o.vol ?? 1, t + (o.fade ?? 0.15));
    s.connect(name === 'buttery_radio' ? band(ctx, g, 250, 3200) : o.lp ? band(ctx, g, 20, o.lp) : g); // the cue, heard from the café radio; o.lp: muffled
    const p = place(g, o, name === 'walkman');
    p.connect(busS);
    s.start(t, rnd() * b.duration);
    let on = true;
    const h = {
      stop(f = 0.3) {
        if (!on) return;
        on = false; live.delete(h); if (name === 'alarm') alarms--;
        const t2 = ctx.currentTime; hold(g.gain, t2); g.gain.linearRampToValueAtTime(0, t2 + f + 0.01); s.stop(t2 + f + 0.05);
      },
      vol(v) { if (on) g.gain.setTargetAtTime(v, ctx.currentTime, 0.05); },
      rate(r) { if (on) s.playbackRate.setTargetAtTime(r * det, ctx.currentTime, 0.05); },
      pos(x, y, z) { if (p.panningModel) setPos(p, x, y, z); },
    };
    live.add(h);
    return h;
  }

  const amb = {}; // ambience loops by name
  let lastAmb = null, room = 'none';
  function ambience(a) {
    if (!ctx) return;
    lastAmb = a;
    const want = a && a.loops ? a.loops.slice() : [], inside = room === 'room';
    if (a && a.rain) want.push(a.rain === 'heavy' || !inside ? 'rain_heavy' : 'rain'); // heavier outdoors, muffled through the glass indoors
    for (const k in amb) if (!want.includes(k)) { amb[k].stop(1); delete amb[k]; }
    for (const k of want) if (!amb[k]) amb[k] = loop(k, { fade: 1, vol: k === 'rain_heavy' ? 0.7 : k === 'rain' && inside ? 0.6 : 1, lp: k === 'rain' && inside ? 1800 : 0 });
  }

  function blip(id, rising) {
    if (!ctx) return;
    const v = V[id] || V[String(id).split('_')[0]] || V.student;
    if (!v) return;
    const t = ctx.currentTime;
    if (t - v.last < (rising ? v.min * 0.6 : v.min)) return; // syllable rate, however fast the text types
    v.last = t;
    const s = ctx.createBufferSource();
    s.buffer = rising && !v.mono ? v.q : v.n[rnd() * 4 | 0]; // the operator never inflects
    if (!v.mono) s.playbackRate.value = 1 + (rnd() * 2 - 1) * 0.08;
    s.connect(busV); s.start(t);
    if (v.also) blip(v.also, rising);
  }

  function listener(camera) {
    if (!ctx || !camera) return;
    const e = camera.matrixWorld.elements, l = ctx.listener;
    if (l.positionX) {
      l.positionX.value = e[12]; l.positionY.value = e[13]; l.positionZ.value = e[14];
      l.forwardX.value = -e[8]; l.forwardY.value = -e[9]; l.forwardZ.value = -e[10];
      l.upX.value = e[4]; l.upY.value = e[5]; l.upZ.value = e[6];
    } else { l.setPosition(e[12], e[13], e[14]); l.setOrientation(-e[8], -e[9], -e[10], e[4], e[5], e[6]); }
  }

  // ---------------------------------------------------------- music cues
  let cur = null; // { name, g, src: [], p }
  function endCue(c, f) {
    const t = ctx.currentTime;
    hold(c.g.gain, t); c.g.gain.linearRampToValueAtTime(0, t + f);
    for (const s of c.src) s.stop(t + f + 0.05);
    if (c.p) stopPlayer(c.p, f);
    setTimeout(() => c.g.disconnect(), (f + 0.4) * 1000);
  }
  function music(cue, o) {
    if (!ctx) return;
    o = o || {};
    if (cue && cur && cur.name === cue) return;
    const t = ctx.currentTime, cut = !!o.cut, had = !!cur, st = (typeof state !== 'undefined' && state) || {};
    // walkman -> warbly (3.4 into 3.5): the same song carries on over the cut, only its colour changes
    const keep = cur && cur.p && /^pudding_/.test(cur.name) && /^pudding_/.test(cue) ? cur.p : null;
    if (keep) cur.p = null;
    if (cur) { endCue(cur, cut || keep ? 0.012 : (o.fade ?? 1)); cur = null; }
    if (!cue) return;
    const g = ctx.createGain(), fin = cut || keep ? 0.012 : o.fade ?? (had ? 1 : 0.05);
    const song = (dest) => { if (!keep) return player(st.pattern, st.samples, 'loop', { dest }); keep.out.disconnect(); keep.out.connect(dest); return keep; };
    g.connect(busM); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + fin);
    cur = { name: cue, g, src: [], p: null };
    if (M[cue]) {
      const s = ctx.createBufferSource(); s.buffer = M[cue]; s.loop = true; s.connect(g); s.start(t + 0.01); cur.src.push(s);
      if (BED[cue] && L.rain && st.scene !== '3.4') { const r = ctx.createBufferSource(); r.buffer = L.rain; r.loop = true; r.connect(gainTo(g, BED[cue])); r.start(t + 0.01); cur.src.push(r); }   // (no rain in 3.4: the first dry day)
    } else if (cue === 'credits') cur.p = player(st.pattern, st.samples, 'credits', { dest: g });
    else if (cue === 'pudding_walkman') { // the finished song, through Rue's Walkman
      const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1500; pk.gain.value = 3; pk.connect(g);
      cur.p = song(band(ctx, pk, 120, 7000));
    } else if (cue === 'pudding_warbly') { // 3.5: older, thin and warbly (wow + flutter on a short delay)
      const dl = ctx.createDelay(0.1), sh = ctx.createWaveShaper();
      dl.delayTime.value = 0.012; sh.curve = DIST; sh.connect(gainTo(g, 1.2));
      cur.src.push(lfo(ctx, dl.delayTime, 0.55, 0.004), lfo(ctx, dl.delayTime, 6.5, 0.0006));
      dl.connect(band(ctx, gainTo(sh, 0.5), 380, 2400));
      cur.p = song(dl);
    }
  }
  music.silence = (on) => { silenced = !!on; applyOptions(); };

  let seqP = null;
  const AUDIO = {
    init, prerender, applyOptions, ambience, listener, sampleBuffer: (k) => (SAMPLES[k] && B[SAMPLES[k].sfx]) || null,
    duck(on) { ducked = !!on; applyOptions(); },
    setRoom(r) {
      if (!ctx) return;
      const t = ctx.currentTime;
      if (r !== room) { room = r; if (lastAmb) ambience(lastAmb); } // the rain bed follows indoors/outdoors
      sendRoom.gain.setTargetAtTime(r === 'room' ? 0.25 : 0, t, 0.2);
      sendWet.gain.setTargetAtTime(r === 'wet' ? 0.35 : 0, t, 0.2);
    },
    blip, loop,
    song(pattern, o = {}) {
      if (!ctx) return { stop() {} };
      const p = player(pattern, o.samples ?? (typeof state !== 'undefined' && state ? state.samples : []), o.bars ? 'loop' : 'credits', { onEnd: o.onEnd, bars: o.bars, ending: o.ending });
      return { stop: () => stopPlayer(p, 0.3) };
    },
    seq: {
      play(pattern, samples, onStep) { if (!ctx) return; AUDIO.seq.stop(); seqP = player(pattern, samples, 'seq', { onStep }); },
      stop() { if (seqP) stopPlayer(seqP, 0.05); seqP = null; },
    },
    stopAll() {
      if (!ctx) return;
      music(null, { cut: true });
      for (let j = players.length - 1; j >= 0; j--) stopPlayer(players[j], 0.05);
      seqP = null;
      for (const h of [...live]) h.stop(0.05);
      for (const k in amb) delete amb[k];
      lastAmb = null;
    },
    buffers: { B, L, M, V, S }, // for tests / the F2 overlay
  };
  return { AUDIO, sfx, music };
})();
