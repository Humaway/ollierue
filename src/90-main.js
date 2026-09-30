
// ============================================================ MAIN
// boot(): loader (everything built, compiled and uploaded up front) -> "JARVIS is ready." -> prologue on first launch -> title.
// The loop: fixed 60 Hz ticks (input, menus, UI, updaters, world.update) + interpolated world.render every frame.

async function boot() {
  try {
    const s = JSON.parse(localStorage.getItem('rue.save'));
    if (s && s.options) Object.assign(options, s.options);
    if (s && s.profile) Object.assign(profile, s.profile);
  } catch (e) { /* storage blocked: defaults */ }
  document.body.classList.toggle('large', options.textSize === 'large');
  ui.init(); menus.init();
  on('scene:end', (e) => {
    const id = e && typeof e === 'object' ? e.id : e;
    if (TEST.auto && (id === TEST.stop || id === 'PC')) RUE_TEST.done = true;
  });
  const hasWorld = () => typeof world !== 'undefined' && world.set;

  // ---------------------------------------------------------- loop
  const step = CONFIG.step;
  let last = performance.now(), acc = 0;
  function tick() {
    input.tick();
    menus.update();
    if (clock.paused) return;
    ui.update(step);
    clock.step();
    if (hasWorld()) world.update(step);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    const ms = now - last;
    last = now;
    perf.frame(ms);
    input.poll();
    acc += Math.min(ms / 1000, CONFIG.maxFrame) * (TEST.auto ? Math.max(clock.scale, TEST.speed) : clock.scale);
    for (let n = 0; acc >= step && n < 12; n++) { tick(); acc -= step; }
    if (acc >= step) acc %= step; // more than 12 ticks behind: drop it rather than spiral
    renderer.info.reset();
    if (hasWorld()) world.render(acc / step);
    emit('render', acc / step);
    perf.draw();
    if (renderer.info.programs.length > progN) {   // every shader should have been compiled by the loader
      progN = renderer.info.programs.length;
      if (TEST.auto) console.warn('RUE: shader compiled mid-game in ' + flow.sceneId + ' step ' + flow.stepIndex + ' (' + cam.name + ')');
    }
  }
  let progN = Infinity;
  requestAnimationFrame(frame);

  // ---------------------------------------------------------- loader
  const ld = document.getElementById('loader'), bar = ld.querySelector('.jv-prog i'), pct = ld.querySelector('.jv-prog span');
  const setP = (f) => { bar.style.transform = `scaleX(${f})`; pct.textContent = Math.round(f * 100) + '%'; };
  const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
  setP(0);

  // Build one character under the fixed light rig (hemi + dir + spot + FogExp2, same program family as the sets),
  // compile + upload it, and bake its dialogue portrait from a head-and-shoulders render of the real model.
  let warm = null;
  const warmCharacter = (id) => {
    if (!warm) {
      const sc = new THREE.Scene();
      sc.background = new THREE.Color(0x2c3868);
      sc.fog = new THREE.FogExp2(0x2c3868, 0.002);
      sc.add(new THREE.HemisphereLight(0xfff2e0, 0x404058, 1.4));
      const dl = new THREE.DirectionalLight(0xffffff, 1.7); dl.position.set(1.2, 2.5, 3); sc.add(dl);
      const sp = new THREE.SpotLight(0xffffff, 0); sc.add(sp, sp.target);
      // program families only mid-game meshes use (Rue's walk-2 smears: transparent, instanced + colours): compile them now
      const px = canvasTex(4, 4, () => {}, { key: 'warm_px' });
      for (const tr of [false, true]) for (const map of [null, px]) for (const col of [false, true]) {
        const im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.001, 0.001, 0.001), mat(0xffffff, { transparent: tr, map, key: 'warm_family' }), 1);
        if (col) im.setColorAt(0, sc.background);
        im.frustumCulled = false; sc.add(im);
      }
      warm = { sc, cam: new THREE.PerspectiveCamera(30, 1, 0.05, 30), v: new THREE.Vector3() };
    }
    const rig = buildCharacter(id), v = warm.v, c = warm.cam, gl = renderer.domElement;
    warm.sc.add(rig.root);
    if (rig.face && rig.face.set) rig.face.set('neutral');
    rig.root.updateMatrixWorld(true);
    if (typeof rig.eye === 'number') v.set(0, rig.eye - 0.04, 0); else { rig.parts.head.getWorldPosition(v); v.y += 0.08; }
    c.aspect = gl.width / gl.height; c.updateProjectionMatrix();
    c.position.set(v.x + 0.12, v.y + 0.05, v.z + 0.8); c.lookAt(v.x, v.y + 0.01, v.z);
    renderer.compile(warm.sc, c);
    renderer.render(warm.sc, c);
    const pc = document.createElement('canvas'), side = Math.min(gl.width, gl.height);
    pc.width = pc.height = 128;
    pc.getContext('2d').drawImage(gl, (gl.width - side) / 2, (gl.height - side) / 2, side, side, 0, 0, 128, 128); // same task as the render
    portraitURL.bake(id, pc);
    warm.sc.remove(rig.root);
    if (typeof world !== 'undefined' && world.adopt) world.adopt(id, rig);   // its first spawn reuses it: no build, no upload mid-game
  };
  const jobs = [];
  if (typeof AUDIO !== 'undefined') jobs.push(() => AUDIO.prerender());
  if (typeof world !== 'undefined') for (const id in SETS) jobs.push(() => world.warm(id));
  if (typeof buildCharacter === 'function') for (const id in LOOKS) if (LOOKS[id]) jobs.push(() => warmCharacter(id));
  await nextFrame();
  for (let i = 0; i < jobs.length; i++) {
    try { await jobs[i](); } catch (e) { console.error('RUE boot job failed', e); }
    setP((i + 1) / jobs.length);
    await nextFrame();
  }
  renderer.setRenderTarget(null); renderer.clear();
  perf.adapt = true;
  progN = renderer.info.programs.length;

  if (TEST.auto) {
    ld.classList.add('off');
    if (typeof AUDIO !== 'undefined') AUDIO.init();
    state = newState();
    RUE_TEST.ready = true;
    flow.start(TEST.scene || 'P', { select: !!TEST.scene });
    return;
  }

  // "JARVIS is ready. [YES]" — the first key/click unlocks audio inside the event itself
  ld.querySelector('.jv-msg').textContent = 'JARVIS is ready.';
  ld.querySelector('.jv-prog').classList.add('off');
  const yes = document.createElement('button');
  yes.className = 'jv-b foc'; yes.textContent = 'YES';
  ld.querySelector('.jv-btns').append(yes);
  input.gesture = () => { if (typeof AUDIO !== 'undefined') AUDIO.init(); };
  RUE_TEST.ready = true;
  await new Promise((res) => {
    const f = () => { if (input.pressed('yes')) { input.consume('yes'); done(); } };
    const done = () => { removeUpdate(f); yes.onclick = null; res(); };
    yes.onclick = done;
    addUpdate(f);
  });
  ui.sfx('chime_ready');
  ld.classList.add('off');
  if (!profile.seenPrologue) { state = newState(); flow.start('P'); } else menus.title();
}

boot();
