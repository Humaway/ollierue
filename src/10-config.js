// ============================================================ CONFIG
// Tuning numbers, colours, text speeds, bindings, shared registries and the
// game state. Every other fragment fills these registries; the engine plays them.

const CONFIG = {
  step: 1 / 60, maxFrame: 0.25,                  // fixed update step, clamp for long frames
  walk: 1.7, run: 3.4, carry: 1.0, turn: 3.2,    // m/s, m/s, m/s, rad/s (tank turn)
  radius: 0.3,                                   // actor collision radius (m)
  text: { slow: 24, normal: 48, fast: 110 },     // typewriter chars per second
  beat: 0.8,                                     // seconds for a '^' beat inside a line
  fov: 40, ecuFov: 30,
  dist: { ECU: 0.35, CLOSE: 0.9, MID: 1.8, WIDE: 7 },
  duck: 0.6,                                     // music gain under dialogue (40% duck)
  colors: {
    navy: '#141d3a', yes: '#ffd21f', chaseBlue: '#1f6fe0', polo: '#15161a',
    lanyard: '#3fb6e8', jarvis: '#2f6fd6', jarvisBar: '#d9dce1',
  },
  keys: {
    yes: ['Enter', 'Space', 'NumpadEnter'], no: ['Escape', 'Backspace'], swap: ['Tab'],
    inventory: ['KeyI'], run: ['ShiftLeft', 'ShiftRight'], pause: ['KeyP'],
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  },
  pad: { yes: 0, no: 1, inventory: 2, swap: 3, run: 5, pause: 9, up: 12, down: 13, left: 14, right: 15 },
};

// ------------------------------------------------------------ registries
const SETS = {};        // SETS[id] = { env, build(), marks, anchors, cams, zones, colliders, exits, floor?, update? }
const LOOKS = {};       // LOOKS[charId] = art description used by buildCharacter()
const ANIMS = {};       // ANIMS[name] = (rig, t, p) => pose
const ITEMS = {};       // ITEMS[id] = { name, desc, icon?, examine?, flip? ... }
const SCENES = {};      // SCENES[id] = { title, set, time, act, playable, swap, hud, spawn, hotspots, steps, grants }
const CUTSCENES = {};   // CUTSCENES[id] = [ step, step, ... ]
const STRINGS = {};     // UI strings
const MINIGAMES = {};   // MINIGAMES[id] = { start(params, api), update(dt), draw(), end(result), autoplay?(api) }
const CARDS = {};       // CARDS[kind] = (ctx, w, h, data) => paints a readable INSERT card

const SCENE_ORDER = [
  'P', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7',
  '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12', '2.13',
  '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', 'E', 'C', 'PC',
];

const ACTS = {
  '1.1': 'ACT ONE — Have You Tried Turning It Off and On Again?',
  '2.1': 'ACT TWO — No Service',
  '3.1': 'ACT THREE — Opt Us In',
};

// Speaker ids. `name` is what the dialogue box shows. Voice blips per section 6.
// wave: oscillator type ('pulse' = narrow square), f: base Hz, len: blip seconds,
// gap: extra silence between blips, filter: optional lowpass Hz, soft: gentler attack.
const CHARACTERS = {
  luka:      { name: 'LUKA',      voice: { wave: 'square',   f: 110, len: 0.045 } },
  chase:     { name: 'CHASE',     voice: { wave: 'triangle', f: 260, len: 0.035, tumble: true } },
  rue19:     { name: 'RUE',       voice: { wave: 'pulse',    f: 180, len: 0.035 } },
  rue58:     { name: 'RUE',       voice: { wave: 'sine',     f: 140, len: 0.07, soft: true } },
  des:       { name: 'DES',       voice: { wave: 'sine',     f: 100, len: 0.08, soft: true } },
  bernie:    { name: 'BERNIE',    voice: { wave: 'triangle', f: 200, len: 0.045 } },
  declan:    { name: 'DECLAN',    voice: { wave: 'square',   f: 240, len: 0.035, gap: 0.03, filter: 1800 } },
  declan58:  { name: 'DECLAN',    voice: { wave: 'square',   f: 190, len: 0.05, filter: 1500, soft: true } },
  hartigan:  { name: 'HARTIGAN',  voice: { wave: 'sawtooth', f: 150, len: 0.05, filter: 1200 } },
  margaret:  { name: 'MARGARET',  voice: { wave: 'sine',     f: 220, len: 0.07, soft: true } },
  dazza:     { name: 'DAZZA',     voice: { wave: 'square',   f: 120, len: 0.05, filter: 900 } },
  luke:      { name: 'LUKE',      voice: { wave: 'square',   f: 160, len: 0.045 } },
  jordan:    { name: 'JORDAN',    voice: { wave: 'triangle', f: 230, len: 0.04 } },
  siobhan:   { name: 'SIOBHÁN',   voice: { wave: 'triangle', f: 250, len: 0.04 } },
  ronan:     { name: 'RONAN',     voice: { wave: 'sine',     f: 150, len: 0.06, soft: true } },
  fiachra:   { name: 'FIACHRA',   voice: { wave: 'square',   f: 205, len: 0.04, filter: 2200 } },
  mick:      { name: 'MICK',      voice: { wave: 'sawtooth', f: 165, len: 0.05, filter: 1400 } },
  nuala:     { name: 'NUALA',     voice: { wave: 'sine',     f: 235, len: 0.05 } },
  operator:  { name: 'OPERATOR',  voice: { wave: 'square',   f: 330, len: 0.06, mono: true, filter: 2500 } },
  assistant: { name: 'ASSISTANT', voice: { wave: 'triangle', f: 210, len: 0.04, filter: 1600 } },
  driver:    { name: 'DRIVER',    voice: { wave: 'square',   f: 130, len: 0.05, filter: 1200 } },
  voice:     { name: 'VOICE',     voice: { wave: 'sine',     f: 100, len: 0.08, soft: true, filter: 1400 } }, // Des, down the line (1.7)
  young_dev: { name: 'YOUNG DEVELOPER', voice: { wave: 'triangle', f: 215, len: 0.04 } },
  student:   { name: 'STUDENT',   voice: { wave: 'triangle', f: 190, len: 0.04 } },
  finalist:  { name: 'FINALIST',  voice: { wave: 'square',   f: 175, len: 0.04 } },
  luka_chase: { name: 'LUKA AND CHASE', voice: { wave: 'square',   f: 110, len: 0.045, also: 'chase' } },
  chase_luka: { name: 'CHASE AND LUKA', voice: { wave: 'triangle', f: 260, len: 0.035, also: 'luka' } },
};

// Luka's notebook, in the order people can be met.
const NAMES = ['Des', 'Bernie', 'Declan', 'Ronan', 'Siobhán', 'Fiachra', 'Mick', 'Nuala', 'Hartigan'];

// Chase's cassette samples (section 7). `sfx` is the AUDIO recipe that doubles as the sample.
const SAMPLES = {
  kettle:  { label: 'Kettle',        sfx: 'kettle' },
  rain:    { label: 'Rain',          sfx: 'rain_gutter' },
  till:    { label: 'Till',          sfx: 'till' },
  beep:    { label: 'Computer beep', sfx: 'beep' },
  dynamo:  { label: 'Dynamo',        sfx: 'dynamo_hit' },
  trill:   { label: 'Double trill',  sfx: 'trill' },
  whistle: { label: 'Tin whistle',   sfx: 'whistle' },
  bell:    { label: 'Bell',          sfx: 'bell' },
};

// The Bug List (1.6). `seen` is the flag set when the player witnesses it in 1.1–1.3.
const BUGS = [
  { id: 'popups',    text: 'Pop-ups before every action',               seen: 'seen_popups' },
  { id: 'sure',      text: "Asks if you're sure you're sure",           seen: 'seen_sure' },
  { id: 'margarine', text: 'Turns the name Margaret into margarine',    seen: 'seen_margarine' },
  { id: 'optin',     text: 'Crashes on opt-in',                         seen: 'seen_optin' },
  { id: 'restarts',  text: 'Random restarts',                           seen: 'seen_restarts' },
  { id: 'password',  text: 'Password rules change while you type',      seen: 'seen_password' },
  { id: 'runaway',   text: 'Buttons that run away',                     seen: 'seen_runaway' },
  { id: 'backwards', text: 'Progress bar goes backwards',               seen: 'seen_backwards' },
  { id: 'mfa',       text: 'Sends MFA codes to dead phones',            seen: 'seen_mfa' },
  { id: 'e4044',     text: 'Error 4044',                                seen: 'seen_e4044' },
  { id: 'swearing',  text: 'Flags swearing for coaching',               seen: 'seen_swearing' },
  { id: 'video',     text: '"Video could not be played"',               seen: 'seen_video' },
];
const DOOR_BUG = 'Door takes nine seconds'; // always added in 1.6, by dialogue

// ------------------------------------------------------------ state
const newState = () => ({
  scene: 'P', flags: {}, inventory: [], active: 'chase',
  battery: null, bars: null,          // 1987 HUD; null hides it
  names: [], samples: [], bugs: [],   // collectibles
  pattern: null,                      // the 3.3 sequencer pattern (4 lanes x 16 booleans), used by the credits
});
let state = newState();

// Options and completion live outside the game state and persist across New Game.
const options = {
  controls: 'modern', textSpeed: 'normal', textSize: 'normal',
  music: 0.8, sfx: 0.9, voice: 0.9, reduceFlashing: false, objective: true,
};
const profile = { completed: false, seenPrologue: false };

// ------------------------------------------------------------ test hooks
// ?autoplay=1 auto-advances everything; &scene=2.3 starts there; &stop=2.5 ends after it; &speed=8;
// &fast=1 runs every cutscene as if skipped (state steps still apply).
const TEST = (() => {
  const q = new URLSearchParams(location.search);
  return { auto: q.has('autoplay'), scene: q.get('scene'), stop: q.get('stop'), speed: +(q.get('speed') || 1), fast: q.has('fast') };
})();
window.RUE_TEST = { ready: false, done: false, scene: null, step: null, log: [] };
const testLog = (msg) => { if (TEST.auto) RUE_TEST.log.push(msg); };
