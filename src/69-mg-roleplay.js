// ============================================================ MINIGAME: Role Play (2.8, Rue's room)
// One locked mid-shot, like a stage: Luka plays the customer on the left (flat cap, bike helmet, scarf), Rue sells on the
// right, Chase heckles from off-screen (behind the lens). A scripted failure first; then three customers, four steps each.
// Before each of Rue's answers the player picks the card Luka whispers: GREET, ASK, LISTEN, RECOMMEND or CLOSE HARD. The
// right card is always the next step in order (steps already done are greyed out). A wrong card plays its line, then Luka
// walks out of frame for 1.5 s, leaving half the shot empty, walks back in and says "Again." After two wrong cards on a
// step Chase whispers the step. Can't fail. -> {done: true}
MINIGAMES.role_play = (() => {
  const PI = Math.PI;
  const LABELS = ['GREET', 'ASK', 'LISTEN', 'RECOMMEND', 'CLOSE HARD'];
  const LUKA = [-16.3, 0.4, 3.85, PI], RUE = [-16.3, 0.4, 2.35, 0], OFF = [-16.9, 0.4, 5.45], CHASE = [-13.3, 0.4, 1.3, -0.6];
  const STAGE = { shot: 'CAM', pos: [-13.95, 1.76, 3.1], look: [-16.3, 1.8, 3.1], fov: 36 };
  const cust = (text) => ['luka', text, { tag: 'as the customer' }];
  const C = [
    { hat: 'cap', open: 'I just want to call my mum from the bus.', steps: [
      [['rue19', '…Hello. Welcome. To my room.']],
      [['rue19', 'What do you… need the phone for.']],
      [cust("My mum worries. I ring her from the bus so she knows I'm alive."), ['rue19', '…Right.', { tag: 'quieter', speed: 'slow' }]],
      [['rue19', "Then you want the cheap one. With the big buttons. ^ That's the whole pitch?"], ['luka', "That's the whole pitch."]],
    ] },
    { hat: 'helmet', open: "I'm a courier. I need to know where my next job is.", steps: [
      [['rue19', "Hello. You're dripping on my floor."]],
      [['rue19', 'Where do you ride?']],
      [cust('All over. I stop at every phone box in Dublin to ring the depot.'), ['rue19', '…Every phone box.']],
      [['rue19', 'Then you want one that fits in the bag. And a charger at the depot.']],
    ] },
    { hat: 'scarf', open: "I've never had a phone. They scare me.", steps: [
      [['rue19', 'Hello.', { speed: 'slow' }]],                                   // (It comes out softer than he means it to.)
      [['rue19', 'What scares you about them?']],
      [cust("That I'll press the wrong thing and break it."), ['rue19', "You won't break it. ^ Probably."]],
      [['rue19', 'Then you want someone patient to show you how.'], 'point', ['rue19', 'Like him.']],   // (He points at Luka.)
    ] },
  ];
  // wrong cards (card index -> Rue's line). LISTEN too early: Rue waits, the customer waits, nobody says anything.
  const WRONG = { 1: 'What do you want?', 3: 'You want the most expensive one. Everyone does.', 4: 'Sign here or regret it forever.' };
  const WHISPER = ['Greet.', 'Ask.', 'Listen.', 'Recommend.'];
  const AUTO = { '0,0': [4, 1], '0,1': [2] };   // autoplay walks every wrong path once (ASK before GREET, LISTEN early, CLOSE HARD, the whisper)
  const ABORT = {};
  let api = null, tok = 0, hats = null, worn = null, luka = null, rue = null, told = false;

  // Luka's hats, built once (plain meshes on his head / torso bones; taken off again in end())
  function makeHats() {
    const g = (geo, color, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); m.rotation.x = rx; return m; };
    const cap = new THREE.Group(), helmet = new THREE.Group(), scarf = new THREE.Group();
    const crown = g(new THREE.CylinderGeometry(0.1, 0.118, 0.07, 10), 0x6d6250, 0, 0.228, 0.012, -0.12); crown.scale.set(1.02, 1, 1.14); cap.add(crown);
    cap.add(g(new THREE.BoxGeometry(0.18, 0.014, 0.08), 0x575040, 0, 0.212, 0.14, 0.3));
    const shell = g(new THREE.SphereGeometry(0.128, 10, 5, 0, PI * 2, 0, PI / 2), 0xc8322a, 0, 0.165, 0.004); shell.scale.set(1.02, 0.95, 1.2); helmet.add(shell);
    helmet.add(g(new THREE.BoxGeometry(0.16, 0.012, 0.06), 0x1c1c1e, 0, 0.2, 0.145, 0.35));   // the visor
    const wrap = g(new THREE.TorusGeometry(1, 0.34, 5, 12), 0x2d6a4f, 0, 0, 0, PI / 2); scarf.add(wrap);
    const tail = g(new THREE.BoxGeometry(0.075, 0.32, 0.03), 0x2d6a4f, 0, 0, 0, 0.08); tail.name = 'tail'; scarf.add(tail);
    for (const h of [cap, helmet, scarf]) h.visible = false;
    return { cap, helmet, scarf };
  }
  function dress(rig) {   // hang the hats on this rig (fitted to its head and neck)
    const d = rig.d || {}, hs = d.hs || 1, nr = d.nr || 0.06, T = d.T || 0.47;
    for (const n of ['cap', 'helmet']) { rig.parts.head.add(hats[n]); hats[n].scale.setScalar(hs); }
    const s = hats.scarf, w = s.children[0], t = s.children[1];
    rig.parts.torso.add(s);
    w.scale.setScalar(nr + 0.04); w.position.set(0, T - 0.005, -0.004);
    t.position.set(0.055, T - 0.17, (d.chestZ || 0.12) + 0.035);
  }
  function wear(name) {
    if (worn) worn.visible = false;
    worn = name && hats ? hats[name] : null;
    if (worn) worn.visible = true;
  }
  function undress() {
    wear(null);
    if (hats) for (const h of Object.values(hats)) if (h.parent) h.parent.remove(h);
  }
  const stand = (a, at) => { a.rig.seated = false; a.place(at); a.play('idle'); };

  async function run(t) {
    const live = () => { if (t !== tok) throw ABORT; };
    const S = async (id, text, o) => { live(); await api.say(id, text, o || {}); live(); };
    const W = async (s) => { live(); await wait(s); live(); };
    const walk = async (to) => { live(); await luka.moveTo(to); live(); };
    const again = async () => { await walk(OFF); await W(1.5); await walk(LUKA); await S('luka', 'Again.'); };

    // the scripted opening failure
    await W(0.8);
    await S('luka', 'Hi. I just want to be able to call my mum from the bus.', { tag: 'as a customer' });
    await S('rue19', "Sir, this phone isn't for calling your mother. It's for being seen calling someone more important than your mother.");
    await again();
    await S('rue19', 'Nobody wants to call their mum from the bus.');
    await S('luka', 'Everybody wants to call their mum from the bus.');
    await S('chase', "It's like ninety percent of phone calls.", { tag: 'off' });
    await S('rue19', 'And the other ten?');
    await S('chase', 'Pizza.', { tag: 'off' });

    // three customers, four steps each
    for (let k = 0; k < C.length; k++) {
      const c = C[k];
      if (k) { await walk(OFF); wear(c.hat); await W(0.5); await walk(LUKA); }   // a hat change, out of frame
      await S('luka', c.open, { tag: 'as the customer' });
      for (let s = 0; s < 4; s++) {
        for (let wrong = 0; ; wrong++) {
          if (!told) { told = true; ui.toast('Pick the card Luka whispers to Rue.'); }
          const dis = []; for (let i = 0; i < s; i++) dis.push(i);
          live();
          const pick = await api.choose(LABELS, { disabled: dis, test: (AUTO[k + ',' + s] || [])[wrong] ?? s });
          live();
          if (pick === s) break;
          if (WRONG[pick]) await S('rue19', WRONG[pick]); else await W(1.6);
          await again();
          if (wrong >= 1) await S('chase', WHISPER[s], { tag: 'whisper' });
        }
        for (const l of c.steps[s]) {
          if (l === 'point') { rue.face('luka', 0.2); rue.play('point', { dur: 1.4 }); await W(0.6); } else await S(l[0], l[1], l[2]);
        }
      }
    }
    await W(0.4);
    await S('rue19', 'Fine. The Carphone Club is… under review.');
  }

  return {
    start(params, a) {
      api = a;
      const t = ++tok;
      told = false;
      luka = a.world.actor('luka'); rue = a.world.actor('rue19');
      const chase = a.world.actor('chase');
      if (!luka || !rue) { a.finish({ done: true }); return; }
      if (!hats) hats = makeHats();
      dress(luka.rig); wear('cap');
      luka.mood = null;
      stand(luka, LUKA); stand(rue, RUE);
      if (chase) stand(chase, CHASE);
      ui.letterbox(true);
      a.cam.shot(STAGE);
      run(t).then(() => { if (t === tok) a.finish({ done: true }); }, (e) => {
        if (e === ABORT) return;
        console.error('RUE: role_play', e);
        if (t === tok) a.finish({ done: true });
      });
    },
    update() {},
    draw() {},
    end() { tok++; undress(); },
    autoplay() {},   // the script plays itself; choose() auto-picks the `test` card
  };
})();
