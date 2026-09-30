// ============================================================ CONTENT: Prologue ("Not Yet") and 1.1 ("8:52")
// SPEC §9. Every line is final and word for word; '^' = a (beat). Shot tags are quoted in the comments.
(() => {
  const PI = Math.PI;

  // ---------------------------------------------------------- helpers (run from `do` steps, never per frame)
  // Rue's desk lamp: the fixed rig's spot, parked over the desk so he's the only lit thing in the office.
  function lamp(c, on) {
    const s = c.world.torch;
    if (!s) return;
    s.position.set(0.55, 2.5, -1.35); s.target.position.set(0, 1.0, -2.36);
    s.color.set(0xffd6a0); s.angle = 0.5; s.intensity = on ? 5 : 0;
  }
  // Rue lifts the Polaroid: it goes between his hands, back to the lens, front to him.
  async function liftPolaroid(c) {
    const a = c.world.actor('rue58'), p = c.world.prop('polaroid');
    if (!a || !p) return;
    await c.wait(0.3);                                      // the hands come up first
    const v = new THREE.Vector3(), w = new THREE.Vector3(), g = a.rig.attach;
    (g.gripL || a.rig.parts.handL).getWorldPosition(v); (g.gripR || a.rig.parts.handR).getWorldPosition(w);
    if (g.textbook) g.textbook.visible = false;            // 'reading' shows a book; this is a photo
    p.parent.worldToLocal(v.add(w).multiplyScalar(0.5));
    p.position.set(v.x, v.y + 0.14, v.z + 0.05); p.rotation.set(1.875, 0, 0);
  }
  // ...and sets it down beside the brick phone (a short ease, then the tween removes itself).
  function setDownPolaroid(c) {
    const p = c.world.prop('polaroid');
    if (!p) return;
    p.rotation.set(0, 0.35, 0);
    let t = 0;
    const f = (dt) => {
      t = Math.min(1, t + dt / 0.5);
      p.position.set(0.62, 0.783 + 0.09 * (1 - t) * (1 - t), -1.7);   // lower left of the ECU frame
      if (t >= 1) removeUpdate(f);
    };
    if (c.flow.skipping) f(1); else addUpdate(f);
  }

  // 1.1: dress every prop this scene drives from the flags (Continue after a kettle can re-enter a live set).
  function openingDress(c) {
    const P = (n) => c.world.prop(n), f = state.flags;
    P('door_sign')?.userData.set?.(!!f.sign_open);
    for (const [n, k] of [['wall_screens', 'wall_on'], ['bag_spot', 'bag_dropped']]) { const o = P(n); if (o) o.visible = !!f[k]; }
    P('tv_screen')?.userData.show?.('off');
    P('monitor_screen')?.userData.show?.('loading');
    const d = P('backroom_door'); if (d) { d.rotation.y = 0; d.userData.open = undefined; }
    // Luke's office is locked in Act 1 (as in 1.4/1.5): a collider in its doorway while 1.1 runs
    const cols = SETS.reddy.colliders, box = [9.4, -12.75, 10.4, -12.5];
    cols.push(box);
    const u = () => { if (flow.sceneId === '1.1') return; removeUpdate(u); cols.splice(cols.indexOf(box), 1); };
    addUpdate(u);
  }
  const earbudOut = (c) => { const a = c.world.actor('chase'); if (a && a.rig.attach.earbud) a.hold(a.rig.attach.earbud, 'L'); };
  // "head nodding" to the demo (88 bpm) on the walk in: an upper-body loop, so the legs keep walking.
  if (!ANIMS.bop) {
    ANIMS.bop = (r, t, p) => {
      if (!p.walk) ANIMS.idle(r, t, p);
      const k = (1 - Math.cos(t * 2 * PI * 88 / 60)) / 2;
      r.parts.head.rotation.x += 0.16 * k; r.parts.neck.rotation.x += 0.05 * k;
    };
    ANIMS.bop.upper = true;
  }

  // A wide lens that keeps its 16:9 composition on narrower screens (16:10 laptops, 4:3 tablets): the vertical
  // fov showing at least the width `fov` shows at 16:9. Read at shot time (a getter on the shot step).
  const fit = (fov) => Math.min(80, Math.max(fov, 2 * Math.atan(Math.tan(fov * PI / 360) * 16 / 9 * innerHeight / innerWidth) * 180 / PI));

  // The staff video plays: Rue's mouth moves on the TV for `sec` s (repaints of the set's TV canvas), then the
  // frame holds on his smile. Stopping it is the freeze.
  function rueTalks(c, sec) {
    const tv = c.world.prop('tv_screen');
    let map = null;
    if (tv) tv.traverse((o) => { if (o.material && o.material.map) map = o.material.map; });
    if (!map || c.flow.skipping) return;
    let t = 0, n = -1;
    const f = (dt) => {
      if ((t += dt) >= sec || c.flow.skipping) { removeUpdate(f); tv.userData.show('rue'); return; }
      const k = Math.floor(t / 0.13);
      if (k === n) return;
      n = k; tv.userData.show('rue');                        // closed: the smile
      if (k % 2) return;
      const x = map.image.getContext('2d');                   // open (paintTV leaves its 128x96 transform set)
      x.fillStyle = '#4a1f1a'; x.beginPath(); x.arc(64, 51, 5 + (k % 3) * 0.6, 0.2, PI - 0.2); x.closePath(); x.fill();   // the smile, open
      map.needsUpdate = true;
    };
    addUpdate(f);
  }
  // "A JARVIS pop-up slides over his face" (no OK: it sits there till the cut)
  function videoError(c) {
    if (c.flow.skipping) return;
    const p = c.popup({ msg: 'Video could not be played.', icon: 'error', buttons: [], at: [0.5, 0.44] });
    p.el.firstChild.animate([{ transform: 'translateY(-40vh)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'none', opacity: 1 }],
      { duration: 650, easing: 'ease-out' });
  }

  // the three opening duties (objective.list), ticked from state.flags
  function duties() {
    const f = state.flags;
    objective.list([
      { text: 'Flip the door sign to OPEN', done: !!f.sign_open },
      { text: 'Turn on the display wall', done: !!f.wall_on },
      { text: 'Drop your bag in the backroom', done: !!f.bag_dropped },
    ]);
  }
  const tick = (flag) => [{ flag }, { sfx: 'pop', vol: 0.5 }, { do: duties }];

  // tutorial: how to move and which key is YES (the next hotspot prompt teaches "YES — Examine"),
  // then the objective line expands into the duty list.
  function tutorial(c) {
    const s = input.scheme;
    c.ui.prompt(s === 'pad' ? 'Left stick — Move  ·  A — YES' : s === 'touch' ? 'Stick — Move  ·  YES button — YES' : 'WASD / Arrows — Move  ·  Enter / Space — YES');
    c.music('reddy', { fade: 2 });
    c.wait(1.2).then(() => { if (c.flow.sceneId === '1.1') { duties(); c.ui.toast('Objectives: top left'); } });
  }

  // the backroom wall clock: an INSERT of whatever time the set's clock hands show now
  function clockInsert(c) {
    const h = c.world.prop('clock_hands'), hr = h && h.children[0];
    const m = hr ? ((-hr.rotation.z / (2 * PI) * 720) % 720 + 720) % 720 : 539;
    const time = (Math.floor(m / 60) || 12) + ':' + String(Math.floor(m % 60)).padStart(2, '0');
    return c.playCutscene([{ shot: 'INSERT', at: 'wall_clock', card: ['clock', { time, sec: Math.floor((m % 1) * 60) }] }, { wait: 2 }], { letterbox: false });
  }

  // "Then a jump cut, and the door is open." It swings shut behind him (the collider never moved).
  const doorOpened = (c) => { const d = c.world.prop('backroom_door'); if (d) { d.rotation.y = 1.5; d.userData.open = false; } };

  // A printed staff flyer pinned to the noticeboard: "HEADING: small print" on yellow paper.
  CARDS.flyer = (cx, w, h, d) => {
    const [head, small = ''] = String(d.text || '').split(/:\s*/);
    cx.translate(w / 2, h / 2); cx.rotate(-0.03);
    cx.shadowColor = 'rgba(0,0,0,.35)'; cx.shadowBlur = 24; cx.shadowOffsetY = 10;
    cx.fillStyle = '#fff2a8'; cx.fillRect(-w * 0.42, -h * 0.4, w * 0.84, h * 0.8);
    cx.shadowColor = 'transparent';
    cx.fillStyle = '#d32f2f'; cx.beginPath(); cx.arc(0, -h * 0.35, 12, 0, 2 * PI); cx.fill();
    cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillStyle = '#141d3a';
    cx.font = 'bold 64px "Trebuchet MS", Arial, sans-serif'; cx.fillText(head + ':', 0, -h * 0.08, w * 0.76);
    cx.font = '44px "Trebuchet MS", Arial, sans-serif'; cx.fillStyle = '#333'; cx.fillText(small, 0, h * 0.14, w * 0.76);
  };
  CARDS.flyer.size = [800, 500];

  // The brick phone ECU (the anchor's own lens, aimed a touch lower so the blinking charge light clears the
  // letterbox). Both prologue ECUs use this exact setup.
  const ECU = { shot: 'CAM', pos: [0.72, 0.96, -1.08], look: [0.78, 0.87, -1.56], fov: 30 };

  // =================================================================== PROLOGUE — "Not Yet"
  SCENES.P = {
    title: 'Not Yet', set: 'office', env: 'dark', time: 'Tue 29 Sep 2026, 6:10 am',
    playable: [], swap: false, hud: null, music: null,       // no music: the set's ambience is a clock ticking and far traffic
    spawn: { rue58: 'rue_desk' },
    steps: [['cutscene', 'P']],
    grants: {},
  };

  CUTSCENES.P = [
    { act: [['rue58', 'sit', { h: 0.48 }]] },
    { prop: 'polaroid', pos: [0.02, 0.784, -1.72], fn: (o) => o.rotation.set(0, 0.3, 0) },   // face down on the desk
    { prop: 'brick_phone', fn: (o) => { o.userData.ring = false; } },
    { do: (c) => lamp(c, true) },
    // [BLACK] A city before dawn: traffic far below, a clock ticking.
    { fade: 'out', dur: 0 },
    ECU,
    { wait: 2 },
    // [ECU · locked] The brick phone in its charging cradle, wired into a converter box. The green light blinks. Hold three seconds.
    { fade: 'in', dur: 0.5 },
    { wait: 2.5 },
    // [INSERT · slow track along the desk] Walkman, PUDDING cassette, the incident report, a Polaroid face down; the framed lanyard behind.
    // One continuous move that eases through the set's `cassette` lens, so the felt-tip label reads upright.
    { shot: 'CAM', pos: [1.3, 0.97, -1.1], look: [0.55, 0.84, -1.62], fov: 34, to: { pos: [0.17, 1.04, -1.0], look: [0.15, 0.8, -1.36], fov: 32 }, dur: 3.5, ease: 'out' },
    { wait: 3.5 },
    { shot: 'CAM', pos: [0.17, 1.04, -1.0], look: [0.15, 0.8, -1.36], fov: 32, to: { pos: [-0.05, 0.97, -1.0], look: [-0.9, 0.95, -1.22], fov: 40 }, dur: 3.5, ease: 'in' },
    { wait: 3.5 },
    // [WIDE · high, from the far corner] Rue, small behind a big desk. Two empty chairs. The city lights up behind the glass.
    { shot: 'SET', cam: 'corner_high' },
    { env: 'dawn', dur: 12 },
    { wait: 1 },
    { say: 'assistant', text: "You're in early.", tag: 'intercom' },
    { say: 'rue58', text: "Couldn't sleep." },
    { say: 'assistant', text: "Board pack's on your desk. And IT sent another JARVIS incident report. Forty pages.", tag: 'intercom' },
    { say: 'rue58', text: "Tell them thank you. And tell them it isn't their fault." },
    // [OTS · behind Rue] His eyes go to the wall calendar. One date is circled: 20 OCT — 11:58 — REDCLIFFE.
    { shot: 'INSERT', at: 'calendar_ots' },
    { act: [['rue58', 'glance', { dur: 5, yaw: -1.2 }]] },
    { wait: 1.2 },
    { shot: 'INSERT', at: 'calendar', card: ['calendar', { month: 'October 2026', circle: 20, text: '20 OCT — 11:58 — REDCLIFFE' }] },
    { say: 'assistant', text: "Also, your car on the twentieth. You've booked it to Redcliffe. That's a retail store.", tag: 'intercom' },
    { shot: 'INSERT', at: 'calendar_ots' },
    { say: 'rue58', text: 'It is.' },
    { say: 'assistant', text: "You've never dropped in on a store unannounced in your life. Why that one?", tag: 'intercom' },
    // [CLOSE · Rue]
    { shot: 'CLOSE', on: 'rue58' },
    { say: 'rue58', text: 'Old friends.', speed: 'slow' },
    { say: 'assistant', text: 'You know someone who works in Redcliffe?', tag: 'intercom' },
    // [CLOSE · slow push-in] He turns the Polaroid over: we see only its back, and his face as he looks at the front. He smiles.
    { shot: 'CLOSE', on: 'rue58', move: 'push', amount: 0.85, dur: 6, dist: 1.25 },   // a touch wider: the Polaroid stays above the dialogue box
    { act: [['rue58', 'reading']] },
    { do: liftPolaroid },
    { wait: 1.2 },
    { do: (c) => { const a = c.world.actor('rue58'); if (a) a.rig.face.mouth('smile'); } },
    { wait: 0.8 },
    { say: 'rue58', text: 'Not yet.', speed: 'slow' },
    // [ECU · locked] The opening shot again. He sets the Polaroid down beside the brick phone. It doesn't ring. Hold two seconds. Cut to black.
    ECU,
    { act: [['rue58', 'sit']] },
    { do: setDownPolaroid },
    { wait: 2 },
    { fade: 'out', dur: 0 },
    { do: (c) => lamp(c, false) },
    { despawn: 'rue58' },                                    // the title orbits an empty office
  ];

  // =================================================================== 1.1 — "8:52"
  SCENES['1.1'] = {
    title: '8:52', set: 'reddy', env: 'day', time: 'Tue 29 Sep 2026, 08:59',
    playable: ['chase'], swap: false, hud: null, music: null,   // silence until the demo in the crane
    spawn: { chase: 'carpark_start', luka: 'counter_luka' },
    hotspots: [
      // --- the three duties
      { id: 'door_sign', at: 'door_sign', r: 1.0, verb: 'Flip sign', once: true, flag: 'sign_open',
        ask: { q: 'Flip it to OPEN?',
          yes: [{ face: 'chase', to: 'door_sign' }, { prop: 'door_sign', fn: (o) => o.userData.flip() }, { sfx: 'whoosh', vol: 0.3 }, { wait: 0.5 }, ...tick('sign_open')],
          no: [{ say: 'chase', text: 'Tempting.' }] } },
      { id: 'wall_switch', at: 'wall_switch', r: 1.0, verb: 'Use', once: true, flag: 'wall_on',
        steps: [{ face: 'chase', to: 'wall_switch' }, { sfx: 'clunk' }, { prop: 'wall_screens', visible: true }, { sfx: 'beep', vol: 0.5 },
          { shot: 'INSERT', at: 'phones' }, { wait: 1.4 }, ...tick('wall_on')] },
      { id: 'backroom_door', at: [6.4, 0, -23.3], r: 0.8, verb: 'Open',
        door: { to: [6.1, 0, -25.4, PI], kind: 'jarvis', first: [{ say: 'chase', text: 'Every. Single. Day.' }] }, do: doorOpened },
      { id: 'backroom_door_back', at: [6.4, 0, -24.45], r: 0.6, verb: 'Open', door: { to: [6.4, 0, -22.4, 0], kind: 'jarvis' } },
      { id: 'bag', at: [5.0, 0, -24.3], r: 1.6, verb: 'Drop bag', once: true, flag: 'bag_dropped',
        steps: [{ face: 'chase', to: [5.0, -24.3] }, { prop: 'bag_spot', visible: true }, { sfx: 'thud' }, ...tick('bag_dropped')] },
      // --- optional examine lines (Chase)
      { id: 'phones', at: 'phones', r: 1.2, when: (s) => !!s.flags.wall_on, text: "3%. It's always 3%. Nobody knows how." },
      { id: 'targets', at: 'targets_board', r: 1.0, text: 'Someone has drawn a small skull next to Recontracts.' },
      { id: 'queue', at: 'queue_machine', r: 1.0, text: "Now serving: 000. It's been serving 000 since I started." },
      { id: 'plant', at: 'pot_plant', r: 1.1, text: "It's plastic. It's still dying." },
      { id: 'accessories', at: 'accessories', r: 1.1, text: 'Forty-one kinds of phone case. Everyone buys the clear one.' },
      { id: 'sims', at: 'sim_rack', r: 1.0, text: 'I could sell these in my sleep. I have.' },
      { id: 'noticeboard', at: 'noticeboard', r: 1.0,
        steps: [{ shot: 'INSERT', at: 'noticeboard', card: ['flyer', { text: 'LANYARD REQUESTS: please allow 6–8 weeks' }] }, { say: 'chase', text: "It's been thirty-four weeks." }] },
      { id: 'office_door', at: 'office_door', r: 1.0,
        steps: [{ say: 'chase', text: 'LUKE — MANAGER. Under it: KNOCK. Under that: PLEASE.' }, { sfx: 'clunk' }, { say: 'chase', text: "Luke's on a late." }] },
      { id: 'aframe', at: 'aframe', r: 2.0, text: 'Heavier than it looks. And it looks heavy.' },   // outside: examined through the glass
      { id: 'monitor', at: 'monitor2', r: 1.1,
        steps: [{ popup: { msg: 'JARVIS is starting… (this may take a while)', spinner: true, buttons: ['OK'] }, wait: true }, { flag: 'seen_popups' }] },
      { id: 'bench', at: 'bench', r: 1.0, text: "The soldering iron. Nobody's allowed to use it since the incident." },
      { id: 'lost_property', at: 'lost_property', r: 1.0, text: 'A hair straightener, one thong, and a Nokia from 2004.' },
      { id: 'kettle', at: 'kettle', r: 1.0, verb: 'Use', kettle: true },
      { id: 'wall_clock', at: 'wall_clock', r: 1.1, do: clockInsert },
      { id: 'luka', at: 'luka', r: 2.5, verb: 'Talk', by: 'luka', text: ['Morning.', 'Still down.', "Don't touch the monitor. It can smell fear."] },
    ],
    steps: [
      ['cutscene', '1.1_arrival'],
      ['control', 'chase'],
      ['objective', 'Open up the store.'],
      ['do', tutorial],
      ['roam', {
        until: ['sign_open', 'wall_on', 'bag_dropped'],
        async auto(c) {
          for (const id of ['door_sign', 'wall_switch', 'monitor', 'noticeboard', 'luka', 'backroom_door', 'bag', 'wall_clock']) await c.hotspots.trigger(id);
        },
      }],
      ['cutscene', '1.1_video'],
    ],
    grants: { flags: { sign_open: true, wall_on: true, bag_dropped: true, seen_video: true } },
  };

  CUTSCENES['1.1_arrival'] = [
    { do: openingDress },
    { do: (c) => { const a = c.world.actor('luka'); if (a) a.mood = null; } },
    // [CRANE · down out of a blazing blue sky] past the Yes Optus sign to the car park, shimmering with heat. The demo plays.
    { music: 'demo', fade: 0.3 },
    { act: [['chase', 'bop']] },                            // head nodding till the earbud comes out
    { move: 'chase', to: 'carpark_door', nowait: true, face: false },
    { shot: 'CAM', pos: [-2.0, 30, 30], look: [-2.0, 50, -20], fov: 50, to: { pos: [-3.2, 2.2, 22], look: [-2.0, 2.6, 1.0], fov: 45 }, dur: 7 },
    { wait: 7 },
    // [TRACK · behind Chase] one earbud in, head nodding. The music is coming from his earbud.
    { shot: 'MID', on: 'chase', move: 'track', track: 'behind' },
    { move: 'chase', to: 'carpark_door', face: false },
    // [MID · inside, through the glass doors] The doors slide open. He pulls the earbud out; the track cuts mid-bar.
    { shot: 'CAM', pos: [-1.6, 1.55, -3.8], look: [-2.0, 1.4, 0.6], fov: 40 },
    { move: 'chase', to: 'door_in', face: false },   // (already facing in: see report re moveTo)
    { act: [['chase', 'glance', { dur: 0.8, yaw: 0.4 }]] },
    { do: earbudOut },
    { act: [['chase', 'idle']] },
    { music: null, cut: true },
    { wait: 1.2 },                                           // store silence: fluorescent hum, the aircon
    // [WIDE · low, from behind the counter] Luka foreground, back to camera, at the monitor; Chase deep in the background at the door.
    { face: 'chase', to: 'luka' },
    { shot: 'CAM', pos: [5.5, 1.1, -12.2], look: [4.6, 1.35, -2.2], get fov() { return fit(50); } },
    { say: 'chase', text: 'Morning.' },
    { say: 'luka', text: 'Morning. Was that the new Pudding track?' },
    { say: 'chase', text: "It's a demo." },
    { say: 'luka', text: "It's been a demo since February." },
    { say: 'chase', text: "It's a long demo." },
    // [JARVIS-CAM] Luka's face lit blue, a loading spinner turning over it. He twists his lanyard.
    { shot: 'JARVIS', at: 'monitor', on: 'luka' },
    { popup: { msg: 'Loading…', spinner: true, buttons: [], icon: 'none', at: { actor: 'luka' }, w: 170 } },
    { do: (c) => { const a = c.world.actor('luka'); if (a) a.mood = 'anxious'; } },
    { act: [['luka', 'lanyard']] },
    { say: 'luka', text: 'JARVIS is down.' },
    { say: 'chase', text: "It's 8:59." },
    { say: 'luka', text: 'Went down at 8:52. I logged a ticket.' },
    { say: 'chase', text: 'And?' },
    { say: 'luka', text: "Ticket system's also down." },
    { say: 'chase', text: "So how'd you log it?" },
    // [INSERT] A single Post-it on the monitor's edge.
    { popup: null, clear: true },
    { shot: 'INSERT', at: 'postit', card: ['postit', { text: 'JARVIS DOWN 8:52 — L.' }] },
    { say: 'luka', text: "Post-it. On the monitor. ^ It's a whole system, Chase." },
    // [CLOSE · Chase, chest-up] The empty space where a lanyard should hang is in the shot.
    { face: 'luka', to: 'chase' },
    { shot: 'CLOSE', on: 'chase', dist: 1.4 },
    { say: 'chase', text: 'Has my lanyard come yet?' },
    // [CLOSE · Luka]
    { shot: 'CLOSE', on: 'luka' },
    { say: 'luka', text: 'No.' },
    { say: 'chase', text: 'Eight months.' },
    { say: 'luka', text: 'I know.' },
    { say: 'chase', text: 'Eight MONTHS, Luka.' },
    { say: 'luka', text: "I'll chase it up. ^ Chase it up." },
    { say: 'chase', text: "Don't." },
    { face: 'luka', to: 0 },
  ];

  CUTSCENES['1.1_video'] = [
    // Luka follows Chase into the backroom; the staff video starts.
    { fade: 'out', dur: 0.4 },
    { music: null, fade: 1 },
    { hold: 'chase', prop: null },                           // the earbud goes back in
    { do: (c) => { const a = c.world.actor('luka'); if (a) a.mood = null; } },
    { act: [['luka', 'idle']] },
    { place: 'chase', at: 'tv_chase' }, { place: 'luka', at: 'backroom_door_out' },
    { prop: 'backroom_door', fn: (o) => { o.userData.open = true; } },
    { shot: 'CAM', pos: [9.9, 2.3, -29.6], look: [6.2, 1.0, -24.6], fov: 55 },
    { fade: 'in', dur: 0.4 },
    { move: 'luka', to: 'tv_luka' },
    { prop: 'backroom_door', fn: (o) => { o.userData.open = false; } },
    { sfx: 'beep', vol: 0.4 },
    { prop: 'tv_screen', fn: (o) => o.userData.show('rue') },
    { env: { hemi: [0x9aa6c0, 0x2a2a30, 0.45], dir: [0xffe6c2, 0.3] }, dur: 0.8 },   // lights low for the video
    // [OTS · behind both] The boys dark shapes in the foreground; between them the small TV: Rue, 58, warmly lit.
    { shot: 'CAM', pos: [2.7, 1.6, -26.7], look: [9.9, 1.6, -26.4], fov: 45 },
    { do: (c) => rueTalks(c, 2.4) },
    { say: 'rue58', text: "…and I know our systems aren't always perfect. But none of this works without you. Every single one of you.", tag: 'on video' },
    // [PUSH IN · slow, into the TV until the screen fills the frame]
    { shot: 'CAM', pos: [9.0, 1.75, -26.2], look: [9.92, 1.815, -26.2], fov: 32, to: { pos: [9.63, 1.815, -26.2], look: [9.92, 1.815, -26.2], fov: 30 }, dur: 4.5 },
    { do: (c) => rueTalks(c, 0.8) },
    { par: [{ say: 'rue58', text: 'Thank you for saying yes.', tag: 'on video' }, { wait: 4.5 }] },
    // [TWO-SHOT · from the TV's side] Unimpressed, on opposite edges: Luka against the door frame, Chase leaning on a shelf.
    // Wide from beside the TV, aimed between them (a fitted TWO lands behind the wall); the lens widens on narrow screens.
    { shot: 'CAM', pos: [10.25, 1.55, -26.75], look: [7.15, 1.2, -26.75], get fov() { return fit(60); } },
    { say: 'chase', text: "He says that like he's ever used JARVIS." },
    { say: 'luka', text: "He's the CEO, mate. He doesn't use things. Things get used for him." },
    { say: 'chase', text: 'Must be nice.' },
    // [INSERT] The video freezes on Rue's smile. A JARVIS pop-up slides over his face.
    { shot: 'CAM', pos: [9.63, 1.815, -26.2], look: [9.92, 1.815, -26.2], fov: 30 },
    { do: (c) => rueTalks(c, 0.55) },
    { wait: 0.9 },                                           // ...and it freezes on his smile
    { do: videoError },
    { flag: 'seen_video' },
    { wait: 1.2 },
    // From the shop floor, a chime: "JARVIS is ready!"
    { sfx: 'chime_ready' },
    { popup: { msg: 'JARVIS is ready!', icon: 'info', buttons: [], at: [0.5, 0.27], w: 240, dur: 2.5 } },
    { prop: 'monitor_screen', fn: (o) => o.userData.show('ready') },
    { say: 'luka', text: "It's back." },
    { say: 'chase', text: 'For how long?' },
  ];
})();
