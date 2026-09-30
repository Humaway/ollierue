// ============================================================ FLOW
// Cutscene step runner, scene flow, hotspots, inventory and the minigame host (contract section 6).
// Every async run captures the generation G; flow.start/stop bump it so stale runs just stop.

const { flow, hotspots, inventory, runSteps, playCutscene } = (() => {
  let G = 0, cutDepth = 0, cardOn = false, inited = false, mg = null, panelOpen = false;
  const loops = {}; // audio loops started by steps: name -> [handles] (alarms layer)
  const hudEl = document.getElementById('hud'), ovEl = document.getElementById('overlay'), mgEl = document.getElementById('mg');
  const NOAMB = { rain: false, loops: [], room: 'none' };

  const audio = () => (typeof AUDIO !== 'undefined' ? AUDIO : null);
  const sfxFn = (n, o) => ui.sfx(n, o);
  const mus = (c, o) => { if (typeof music === 'function') music(c, o); };
  const silence = (on) => { if (typeof music === 'function' && music.silence) music.silence(on); };
  const ctx = () => ({ world, cam, flow, state, ui, say, ask, choose, popup, hud, wait, sfx: sfxFn, music: mus, AUDIO: audio(),
    player, inventory, hotspots, runSteps, playCutscene });
  const actorOf = (id) => { const a = world.actor(id); if (!a) console.warn('RUE: no actor ' + id); return a; };
  const itemName = (id) => (ITEMS[id] && ITEMS[id].name) || id;

  // ---------------------------------------------------------- state helpers
  function setFlag(n, v = true) { state.flags[n] = v; emit('flag:set', { name: n, value: v }); }
  function learnName(n) { if (state.names.includes(n)) return; state.names.push(n); ui.toast('Name learned: ' + n); }
  function learnSample(k) {
    if (state.samples.includes(k)) return;
    state.samples.push(k);
    ui.toast('Sample recorded: ' + ((SAMPLES[k] && SAMPLES[k].label) || k));
  }
  function grant(g) {
    if (g.flags) Object.assign(state.flags, g.flags);
    for (const [k, to] of [['items', 'inventory'], ['names', 'names'], ['samples', 'samples'], ['bugs', 'bugs']])
      if (g[k]) for (const v of g[k]) if (!state[to].includes(v)) state[to].push(v);
    if (g.removeItems) for (const v of g.removeItems) { const i = state.inventory.indexOf(v); if (i >= 0) state.inventory.splice(i, 1); }   // given away in that scene
    for (const k of ['battery', 'bars', 'pattern', 'active']) if (k in g) state[k] = g[k];
  }

  // ---------------------------------------------------------- sets and actors
  async function loadSet(id, env) {
    await world.load(id, { env });
    const amb = (world.set && world.set.ambience) || NOAMB, A = audio();
    if (A) { A.ambience(amb); A.setRoom(amb.room || 'none'); }
  }
  function spawnMap(m) {
    for (const id in m) {
      const w = m[id];
      if (w && typeof w === 'object' && !Array.isArray(w)) world.spawn(id, w.at, w); else world.spawn(id, w);
    }
  }
  function despawnAll() {
    const A = world.actors;
    for (const id of (A instanceof Map ? [...A.keys()] : Object.keys(A || {}))) world.despawn(id);
  }
  function recontrol() {
    if (world.actor(state.active)) player.control(state.active);
    if (flow.follow && world.actor(flow.follow)) player.follower(flow.follow);
  }
  async function changeSet(id, env, spawn) {
    await loadSet(id, env);
    if (spawn) spawnMap(spawn);
    recontrol();
  }
  function otherPlayable() {
    const pl = (flow.scene && flow.scene.playable) || [];
    return pl.length > 1 ? pl[(pl.indexOf(state.active) + 1) % pl.length] : null;
  }
  function showSwap() {
    const o = otherPlayable();
    if (flow.roaming && flow.swap && o) ui.swapIndicator(state.active, o); else ui.swapIndicator(null);
  }
  function doSwap() {
    const prev = state.active, nx = otherPlayable();
    if (!nx || !world.actor(nx)) return;
    state.active = nx; player.control(nx);
    if (flow.follow) { flow.follow = prev; player.follower(prev); }
    hotspots.reset(); showSwap(); ui.sfx('pop', { vol: 0.5 });
  }

  // ---------------------------------------------------------- cutscene steps
  function runAny(x) { return typeof x === 'function' ? x(ctx()) : playCutscene(x, { letterbox: false }); }

  async function runSteps(steps, o) {
    if (!steps) return;
    if (o && o.letterbox) ui.letterbox(true);
    const g = G;
    for (let i = 0; i < steps.length; i++) {
      if (g !== G) return;
      try { const p = step(steps[i]); if (p) await p; } catch (e) { console.error('RUE: step failed', steps[i], e); }
    }
  }

  async function playCutscene(c, o = {}) {
    const steps = typeof c === 'string' ? CUTSCENES[c] : c;
    if (!steps) { console.warn('RUE: no cutscene ' + c); return; }
    if (typeof c === 'string') testLog('cutscene ' + c);
    const g = G, lb = o.letterbox !== false;
    cutDepth++;
    if (TEST.fast) flow.skipping = true; // test mode: every cutscene runs as if skipped
    player.enabled = false; ui.prompt(null); hotspots.reset();
    if (lb) ui.letterbox(true);
    await runSteps(steps);
    if (g !== G) return;
    cutDepth--;
    if (cutDepth) return;
    if (cardOn) { ui.card(null); cardOn = false; }
    if (!o.keep) { // the last shot eases into the gameplay camera as the bars slide away
      if (lb) ui.letterbox(false);
      if (cam.cutscene) await cam.release(flow.skipping ? 0 : 0.8);
      if (g !== G) return;
    }
    if (!cutDepth) { flow.skipping = false; clock.scale = 1; }
    if (flow.roaming && !flow.busy) player.enabled = true;
  }

  function step(s) {
    const sk = flow.skipping;
    if ('shot' in s) {
      if (sk) return;
      cam.shot(s);
      if (s.card) { ui.card(s.card[0], s.card[1]); cardOn = true; } else if (cardOn) { ui.card(null); cardOn = false; }
      return;
    }
    if ('say' in s) {
      if (sk) return;
      const a = world.actor(s.say); // optional cues on a line: {say, text, expr: 'worried', act: 'lanyard'}
      if (a && s.expr) a.setExpr(s.expr);
      if (a && typeof s.act === 'string') a.play(s.act);
      return say(s.say, s.text, s);
    }
    if ('choice' in s) return choose(s.choice, s).then((i) => { flow.result = i; if (s.flag) setFlag(s.flag, i); });
    if ('ask' in s) return ask(s.ask, s).then((v) => { flow.result = v; if (s.flag) setFlag(s.flag, v); return runSteps(v ? s.yes : s.no); });
    if ('popup' in s) {
      if (s.clear) popup.clear();
      if (!s.popup || sk) return;
      const p = popup(s.popup);
      if (s.wait) return p.done.then((i) => { flow.result = i; });
      return;
    }
    if (typeof s.spawn === 'string') { world.spawn(s.spawn, s.at, s); return; } // {spawn, at, look?, set?} (set = spawn into that live set, e.g. a split's right half)
    if ('set' in s) return changeSet(s.set, s.env, s.spawn);
    if ('hold' in s) { const a = actorOf(s.hold); if (a) a.hold(s.prop ?? null, s.hand); return; }
    if ('music' in s) { mus(s.music, sk ? { cut: true } : s); return; }
    if ('par' in s) return Promise.all(s.par.map((x) => runSteps([x])));
    if ('if' in s) return runSteps(s.if(state) ? s.then : s.else);
    if ('do' in s) return s.do(ctx());
    if ('stare' in s) return stare(s);
    if ('move' in s) return move(s);
    if ('face' in s) { const a = actorOf(s.face); if (a) a.face(s.to, sk ? 0 : s.dur); return; }
    if ('expr' in s) { for (const [id, e] of s.expr) { const a = actorOf(id); if (a) a.setExpr(e); } return; }
    if ('act' in s) { for (const [id, anim, o] of s.act) { const a = actorOf(id); if (a) a.play(anim, o || {}); } return; }
    if ('despawn' in s) { world.despawn(s.despawn); return; }
    if ('place' in s) { const a = actorOf(s.place); if (a) a.place(s.at); return; }
    if ('prop' in s) {
      const o = world.prop(s.prop);
      if (!o) { console.warn('RUE: no prop ' + s.prop); return; }
      if ('visible' in s) o.visible = s.visible;
      if (s.pos) o.position.set(s.pos[0], s.pos[1], s.pos[2]);
      if ('rotY' in s) o.rotation.y = s.rotY;
      if (s.fn) s.fn(o);
      return;
    }
    if ('sfx' in s) { if (!sk) ui.sfx(s.sfx, s); return; }
    if ('loop' in s) {
      const l = loops[s.loop] || (loops[s.loop] = []), A = audio();
      if (s.stop) { for (const h of l) h.stop(s.fade ?? 0.5); l.length = 0; } else if (A) l.push(A.loop(s.loop, s));
      return;
    }
    if ('wait' in s) return wait(s.wait);
    if ('flash' in s) return ui.flash(s.flash, s.color);
    if ('fade' in s) return ui.fade(s.fade, s.dur ?? 0.5, s.color);
    if ('letterbox' in s) { ui.letterbox(s.letterbox); return; }
    if ('hud' in s) { if (!s.hud) hud.set(null); else if (s.anim) hud.animate(s.hud, s.anim); else hud.set(s.hud); return; }
    if ('flag' in s) { setFlag(s.flag, 'value' in s ? s.value : true); return; }
    if ('item' in s) {
      if (s.remove) inventory.remove(s.item);
      else if (!inventory.has(s.item)) { inventory.add(s.item); ui.toast('New item: ' + itemName(s.item)); }
      return;
    }
    if ('name' in s) { learnName(s.name); return; }
    if ('sample' in s) { learnSample(s.sample); return; }
    if ('objective' in s) { if (Array.isArray(s.objective)) objective.list(s.objective); else objective(s.objective); return; }
    if ('env' in s) { world.env(s.env, sk ? 0 : s.dur || 0); return; }
    if ('split' in s) { world.split(s.split, s); return; } // world builds/shows both sets itself
    if ('timelapse' in s) return timelapse(s.timelapse);
    if ('title' in s) return ui.title(s.title, s.dur);
    if ('actCard' in s) return ui.actCard(s.actCard);
    console.warn('RUE: unknown step', s);
  }

  function move(s) {
    const a = actorOf(s.move);
    if (!a) return;
    const p = a.moveTo(s.to, s); // world jumps straight there while flow.skipping
    if (s.nowait || flow.skipping) return;
    let done = false;
    p.then(() => { done = true; });
    return waitUntil(() => done).then(() => { if (!done) a.moveTo(s.to, s); }); // skipped mid-walk: jump there
  }

  // The stare: camera locked, music silent, no UI; the world and its ambient sounds carry on.
  function stare(s) {
    if (flow.skipping) return;
    const len = Math.min(4, s.stare || 3), amb = (s.ambient || []).slice().sort((a, b) => a[1] - b[1]), t0 = clock.t;
    let k = 0;
    cam.lock(true); silence(true); ui.prompt(null); hudEl.style.visibility = 'hidden';
    return waitUntil(() => {
      const t = clock.t - t0;
      for (; k < amb.length && amb[k][1] <= t; k++) ui.sfx(amb[k][0]);
      if (t >= len) return true;
      if (t >= 1 && input.pressed('yes')) { input.consume('yes'); return true; }
      return false;
    }).then(() => { cam.lock(false); silence(false); hudEl.style.visibility = ''; });
  }

  function timelapse(tl) {
    const keys = tl.keys || [], fired = keys.map(() => false);
    const fire = (i) => { if (fired[i]) return; fired[i] = true; return runSteps(keys[i].steps); };
    const rest = async () => { for (let i = 0; i < keys.length; i++) await fire(i); }; // keys a skip jumped over still apply
    if (flow.skipping) return rest();
    let done = false;
    world.timelapse(Object.assign({}, tl, { keys: keys.map((k, i) => ({ t: k.t, do() { fire(i); } })) })).then(() => { done = true; });
    return waitUntil(() => done).then(rest);
  }

  // ---------------------------------------------------------- busy runs (hotspot actions, inventory, hints)
  async function busyRun(fn) {
    const g = G;
    flow.busy = true; player.enabled = false; ui.prompt(null); hotspots.reset();
    try { await fn(); } catch (e) { console.error('RUE: action failed', e); }
    if (g !== G) return;
    flow.busy = false;
    if (flow.roaming) player.enabled = true;
  }

  // ---------------------------------------------------------- hotspots
  const hotspots = (() => {
    const list = [], used = new Set();
    let near = null, nearSel = null, holdH = null, holdT = 0, holdOn = false, hx = 0, hz = 0;
    const canRecord = (h) => !!h.sample && inventory.has('recorder') && !state.samples.includes(h.sample);
    const acts = (h) => !!(h.text != null || h.steps || h.ask || h.use || h.kettle || h.door || h.do);
    function live(h) {
      if (used.has(h) || (h.once && h.flag && state.flags[h.flag])) return false;
      if (h.only && h.only !== state.active) return false;
      if (h.when && !h.when(state)) return false;
      return acts(h) || canRecord(h);
    }
    function where(h) { // -> hx, hz; false when the spot isn't in this set
      const at = h.at ?? h.id;
      if (Array.isArray(at)) { hx = at[0]; hz = at[2]; return true; }
      const a = world.actor(at);
      if (a) { hx = a.pos.x; hz = a.pos.z; return a !== player.actor; }
      if (h._set !== world.setId) { // anchors/marks don't move: resolve once per set
        h._set = world.setId;
        const an = world.anchor(at), p = an ? an.at : world.mark(at);
        h._x = p ? p.x ?? p[0] : NaN; h._z = p ? p.z ?? p[2] : NaN;
      }
      hx = h._x; hz = h._z;
      return hx === hx;
    }
    function label(h) {
      const sel = inventory.selected;
      if (sel) return 'YES — Use ' + itemName(sel);
      const v = h.verb || 'Examine', base = v === 'YES' || v === 'NO' ? v : 'YES — ' + v;
      if (!canRecord(h)) return base;
      return acts(h) ? base + ' · hold to record' : 'YES — Hold to record';
    }
    function update(dt) {
      const me = player.actor;
      if (!me) return;
      if (holdH) { // hold YES for 1 s with the recorder; a tap does the spot's normal action
        const h = holdH;
        if (input.held('yes')) {
          holdT += dt;
          if (holdT >= 0.2 && !holdOn) { holdOn = true; ui.prompt('YES — Recording…'); ui.sfx('dictaphone'); }
          if (holdT < 1) return;
          holdH = null; near = null; player.enabled = true;
          ui.sfx((SAMPLES[h.sample] && SAMPLES[h.sample].sfx) || 'beep');
          learnSample(h.sample);
          return;
        }
        holdH = null; near = null; player.enabled = true;
        if (acts(h)) busyRun(() => fire(h));
        return;
      }
      let best = null, bd = 1e9;
      for (let i = 0; i < list.length; i++) {
        const h = list[i];
        if (!live(h) || !where(h)) continue;
        const dx = hx - me.pos.x, dz = hz - me.pos.z, d = dx * dx + dz * dz, r = h.r || 1.2;
        if (d <= r * r && d < bd) { bd = d; best = h; }
      }
      if (best !== near || inventory.selected !== nearSel) { near = best; nearSel = inventory.selected; ui.prompt(best ? label(best) : null); }
      if (inventory.selected && input.pressed('no')) { input.consume('no'); inventory.selected = null; return; }   // NO puts the item away, near a spot or not
      if (!best) return;
      const key = best.verb === 'NO' && !inventory.selected ? 'no' : 'yes';
      if (!input.pressed(key)) return;
      input.consume(key);
      if (canRecord(best) && !inventory.selected) { holdH = best; holdT = 0; holdOn = false; player.enabled = false; return; }
      busyRun(() => fire(best));
    }
    function speak(h) {
      let t = h.text, who = h.by || state.active;
      if (Array.isArray(t)) { h._n = ((h._n ?? -1) + 1) % t.length; t = t[h._n]; }
      if (t && typeof t === 'object') { const k = state.active in t ? state.active : Object.keys(t)[0]; if (!h.by) who = k; t = t[k]; }
      return say(who, t);
    }
    async function kettle(h) {
      if (!(await ask('Put the kettle on?'))) return false;
      if (player.actor && where(h)) player.actor.face([hx, hz]);
      ui.sfx('kettle'); // boils, clicks off, steam rises
      const at = h.at ?? h.id, steam = { n: 16, speed: 0.25, life: 1.8, color: 0xf2f2f2 };
      await wait(1.8); world.puff(at, steam);
      await wait(1.4); world.puff(at, steam);
      return true;
    }
    function placeParty(mark) { // spawn (not place) so actors also move across into a new set
      const f = flow.follow, m = typeof mark === 'string' ? world.mark(mark) : mark;
      world.spawn(state.active, mark);
      if (f && m) { const r = m[3] || 0; world.spawn(f, [m[0] - Math.sin(r) * 0.8, m[1], m[2] - Math.cos(r) * 0.8, r]); }
      recontrol();
    }
    async function door(h) {
      const d = h.door, kind = d.kind || 'jarvis', to = d.to && typeof d.to === 'object' && !Array.isArray(d.to) ? d.to : { mark: d.to };
      if (kind === 'jarvis') { // "takes nine seconds": ~2 s of spinner, then a jump cut
        const p = popup({ msg: 'JARVIS is loading this door.', spinner: true, buttons: [], icon: 'info' });
        const key = 'door_seen_' + h.id, first = d.first && !state.flags[key];
        if (first) state.flags[key] = true;
        await Promise.all([wait(2), first ? playCutscene(d.first, { letterbox: false }) : null]);
        p.close();
      } else if (kind === 'wood') { ui.sfx('creak'); await ui.fade(1, 0.35); }
      else ui.sfx('door_slide');
      if (to.set && to.set !== world.setId) { if (kind !== 'wood') await ui.fade(1, 0.25); await loadSet(to.set, to.env); }
      placeParty(to.mark);
      if (kind === 'wood' || to.set) ui.fade(0, 0.35);
    }
    async function fire(h) {
      const sel = inventory.selected;
      let done = true, boiled = false;
      inventory.selected = null;
      testLog('hotspot ' + h.id + (sel ? ' use ' + sel : ''));
      if (sel) {
        const u = h.use && h.use[sel];
        if (!u) { await say(state.active, "That won't work."); return; }
        await runAny(u);
      } else {
        if (h.text != null) await speak(h);
        if (h.kettle) { if (!(await kettle(h))) return; boiled = true; }
        if (h.ask) {
          const y = await ask(h.ask.q, h.ask), b = y ? h.ask.yes : h.ask.no;
          if (b) await runAny(b);
          if (!y) return;
        }
        if (h.steps) await playCutscene(h.steps, { letterbox: false });
        if (h.door) await door(h);
        if (h.do) await h.do(ctx());
        done = !h.use; // a spot with `use` only completes through the right item
      }
      if (done && h.flag) setFlag(h.flag, true);
      if (done && h.once) used.add(h);
      if (boiled && saveGame()) ui.toast('Saved.');   // (storage blocked: no false "Saved.")
    }
    return {
      list, used, update,
      reset() { near = null; holdH = null; },
      trigger(x) { // run a spot by id (autoplay helpers, content)
        const h = typeof x === 'string' ? list.find((e) => e.id === x) : x;
        if (!h) { console.warn('RUE: no hotspot ' + x); return Promise.resolve(); }
        return busyRun(() => fire(h));
      },
    };
  })();

  // ---------------------------------------------------------- inventory
  const inventory = {
    selected: null,
    has: (id) => state.inventory.includes(id),
    add(id) { if (state.inventory.includes(id)) return; state.inventory.push(id); emit('item:add', id); },
    remove(id) {
      const i = state.inventory.indexOf(id);
      if (i >= 0) state.inventory.splice(i, 1);
      if (inventory.selected === id) inventory.selected = null;
    },
    open() {
      if (panelOpen) return;
      const free = (flow.roaming || mg) && !flow.busy && !cutDepth; // actions only in play, never mid-cutscene
      panelOpen = true;
      const pe = player.enabled;
      player.enabled = false; ui.prompt(null); hotspots.reset();
      const close = () => { panelOpen = false; player.enabled = pe; };
      const act = (fn) => { close(); if (free) busyRun(fn); };
      ui.inventoryPanel({
        items: state.inventory.map((id) => ({ id, name: itemName(id), icon: ITEMS[id] && ITEMS[id].icon })),
        onExamine: (id) => act(async () => {
          const it = ITEMS[id] || {};
          if (it.examine) await runAny(it.examine); else await say(state.active, it.desc || itemName(id));
          if (it.flip && (await ask(it.flip.q || 'Flip it?', it.flip))) await runAny(it.flip.steps);
        }),
        onUse: (id) => { close(); if (free) { inventory.selected = id; ui.toast('Using: ' + itemName(id)); } },
        onCombine: (a, b) => act(() => {
          const c = (ITEMS[a] && ITEMS[a].combine && ITEMS[a].combine[b]) || (ITEMS[b] && ITEMS[b].combine && ITEMS[b].combine[a]);
          return c ? runAny(c) : say(state.active, "That won't work.");
        }),
        onClose: close,
      });
    },
  };

  // ---------------------------------------------------------- minigame host
  function clearOverlay() {
    const c = ovEl.getContext('2d'), d = devicePixelRatio || 1;
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, ovEl.width, ovEl.height); c.setTransform(d, 0, 0, d, 0, 0);
  }
  function minigame(id, params) {
    const m = MINIGAMES[id];
    if (!m) { console.warn('RUE: minigame ' + id + ' is not built'); return Promise.resolve({ missing: true }); }
    testLog('minigame ' + id);
    clearOverlay(); ovEl.classList.remove('off'); mgEl.textContent = '';
    return new Promise((res) => {
      const me = { m, paused: 0, api: null };
      const api = me.api = {
        finish(r) {
          if (mg !== me) return;
          mg = null;
          try { if (m.end) m.end(r); } catch (e) { console.error('RUE: minigame ' + id + ' end()', e); }
          clearOverlay(); ovEl.classList.add('off'); mgEl.textContent = '';   // hidden between minigames (start shows it)
          flow.result = r; res(r);
        },
        overlay: { canvas: ovEl, ctx: ovEl.getContext('2d'), get w() { return innerWidth; }, get h() { return innerHeight; },
          show(b) { ovEl.classList.toggle('off', !b); } },
        ui: mgEl, world, cam, input, sfx: typeof sfx === 'function' ? sfx : sfxFn, AUDIO: audio(), say, ask, choose, popup, hud,
        async play(steps) { me.paused++; try { await runSteps(steps); } finally { me.paused--; } },
        params: params || {}, state,
      };
      mg = me;
      try {
        m.start(api.params, api);
        if (TEST.auto) {
          if (m.autoplay) Promise.resolve(m.autoplay(api)).catch((e) => { console.error('RUE: minigame ' + id + ' autoplay()', e); api.finish({ error: true }); });
          else wait(0.5).then(() => api.finish({ auto: true }));
        }
      } catch (e) { console.error('RUE: minigame ' + id + ' start()', e); api.finish({ error: true }); }
    });
  }

  // ---------------------------------------------------------- per tick / per frame
  function tick(dt) {
    clock.scale = cutDepth && input.held('no') ? 3 : 1; // hold NO to fast-forward a cutscene
    if (mg && !mg.paused && !panelOpen && mg.m.update) {
      try { mg.m.update(dt); } catch (e) { console.error('RUE: minigame update()', e); mg.api.finish({ error: true }); }
    }
    if (!flow.roaming || flow.busy || panelOpen || cutDepth) return;
    if (input.pressed('inventory')) { input.consume('inventory'); inventory.open(); return; }
    if (flow.swap && input.pressed('swap')) { input.consume('swap'); doSwap(); }
    hotspots.update(dt);
  }
  function draw() {
    if (!mg || !mg.m.draw) return;
    try { mg.m.draw(); } catch (e) { console.error('RUE: minigame draw()', e); mg.api.finish({ error: true }); }
  }

  // ---------------------------------------------------------- roam
  async function roam(o) {
    const g = G, u = o.until;
    const solved = () => {
      if (typeof u === 'function') return !!u(state);
      if (Array.isArray(u)) { for (let i = 0; i < u.length; i++) if (!state.flags[u[i]]) return false; return true; }
      return u ? !!state.flags[u] : false;
    };
    if (TEST.auto) {
      if (o.auto) await o.auto(ctx());
      else if (typeof u !== 'function') for (const f of [].concat(u || [])) setFlag(f, true);
      if (u && !solved()) console.warn('RUE: roam auto() left `until` unsolved in ' + flow.sceneId);
      return;
    }
    if (cam.cutscene) cam.release(); // e.g. a minigame's shot straight into play: ease back to the gameplay camera
    flow.roaming = true; player.enabled = true; hotspots.reset(); showSwap();
    const t0 = clock.t;
    let hinted = !o.hint;
    await waitUntil(() => {
      if (g !== G) return true;
      if (flow.busy || panelOpen || cutDepth) return false;
      if (solved()) return true;
      if (!hinted && clock.t - t0 >= (o.hint.after ?? 120)) { hinted = true; busyRun(() => playCutscene(o.hint.steps, { letterbox: false })); }
      return false;
    });
    if (g !== G) return;
    flow.roaming = false; player.enabled = false; inventory.selected = null;
    ui.prompt(null); hotspots.reset(); ui.swapIndicator(null);
  }

  // ---------------------------------------------------------- scenes
  function sceneStep(st, nx) {
    const a = st[1], o = st[2] || {};
    switch (st[0]) {
      case 'cutscene': {
        const lb = o.letterbox !== false; // keep the bars and the shot when another cutscene or the scene's end follows
        return playCutscene(a, { letterbox: lb, keep: lb && (!nx || (nx[0] === 'cutscene' && !(nx[2] && nx[2].letterbox === false))) });
      }
      case 'steps': return playCutscene(a, { letterbox: false });
      case 'objective': if (Array.isArray(a)) objective.list(a); else objective(a); return;
      case 'control': state.active = a; if (actorOf(a)) player.control(a); showSwap(); return;
      case 'roam': return roam(a || {});
      case 'minigame': player.enabled = false; return minigame(a, st[2]);
      case 'wait': return wait(a);
      case 'set': return (async () => { const g = G; await ui.fade(1, 0.4); if (g !== G) return; await changeSet(a, o.env, o.spawn); ui.fade(0, 0.5); })();
      case 'cam': cam.override(a, st[2]); return;
      case 'swap':
        flow.swap = !!a; showSwap();
        if (a) ui.toast(input.scheme === 'pad' ? 'Y — Swap' : input.scheme === 'touch' ? 'SWAP — Swap' : 'TAB — Swap');
        return;
      case 'follow': flow.follow = a || null; player.follower(flow.follow); return;
      case 'do': return a(ctx());
      case 'save': saveGame(); return;
    }
    console.warn('RUE: unknown scene step ' + st[0]);
  }

  function stop() {
    G++;
    if (mg) mg.api.finish({ aborted: true });
    flow.skipping = false; flow.roaming = false; flow.busy = false; flow.sceneId = null;
    panelOpen = false; cutDepth = 0; clock.scale = 1; inventory.selected = null;
    for (const n in loops) { for (const h of loops[n]) h.stop(0.4); loops[n].length = 0; }
    player.enabled = false;
    ui.inventoryPanel(null); ui.prompt(null); ui.swapIndicator(null); hotspots.reset();
    hudEl.style.visibility = ''; silence(false); cam.lock(false);
  }
  function toTitle() { stop(); menus.title(); }
  function theEnd() { testLog('end of built content'); if (TEST.auto) RUE_TEST.done = true; else toTitle(); }

  function next() {
    const nx = SCENE_ORDER[SCENE_ORDER.indexOf(flow.sceneId) + 1];
    if (nx && SCENES[nx]) return start(nx);
    theEnd();
  }

  async function start(id, o = {}) {
    if (!inited) { inited = true; addUpdate(tick); on('render', draw); }
    stop();
    const g = G, sc = SCENES[id];
    flow.sceneId = id; flow.scene = sc || null; flow.stepIndex = 0; flow.result = null;
    RUE_TEST.scene = id; RUE_TEST.step = null;
    testLog('scene ' + id);
    if (!sc) { console.warn('RUE: scene ' + id + ' is not built'); return theEnd(); }
    try {
      if (o.select) { // scene select: a fresh state plus everything earlier scenes guarantee
        state = newState();
        for (const x of SCENE_ORDER) { if (x === id) break; if (SCENES[x] && SCENES[x].grants) grant(SCENES[x].grants); }
      }
      state.scene = id;
      await ui.fade(1, 0.5);
      if (g !== G) return;
      popup.clear(); ui.card(null); cardOn = false; objective(null); ui.letterbox(false);
      if (cam.cutscene) cam.release(0);
      cam.override(null); world.split(null);
      despawnAll();
      if (sc.set) await loadSet(sc.set, sc.env);
      if (g !== G) return;
      if (sc.spawn) spawnMap(sc.spawn);
      const pl = sc.playable || [];
      if (pl.length && !pl.includes(state.active)) state.active = pl[0];
      flow.swap = !!sc.swap; flow.follow = null; player.follower(null);
      recontrol();
      hud.set('hud' in sc ? sc.hud : { battery: state.battery, bars: state.bars });
      if ('music' in sc) mus(sc.music);
      hotspots.list.length = 0; hotspots.used.clear();
      if (sc.hotspots) hotspots.list.push(...sc.hotspots);
      if (id !== 'P') saveGame(); // Continue resumes at the start of this scene
      if (ACTS[id]) await ui.actCard(ACTS[id]);
      // No scene-title card: several titles are the scene's own punchline ("Not Yet", "It's Genius").
      // Titles live in scene select; date/time cards are authored in the scenes where the script asks.
      if (g !== G) return;
      ui.fade(0, 0.8); // the first step runs in this same tick, so an opening shot (or {fade}) wins
      const steps = sc.steps || [];
      for (let i = 0; i < steps.length; i++) {
        if (g !== G) return;
        const st = steps[i];
        flow.stepIndex = i; RUE_TEST.step = i + ' ' + st[0];
        testLog('scene ' + id + ' step ' + i + ' ' + st[0] + (typeof st[1] === 'string' ? ' ' + st[1] : ''));
        try { await sceneStep(st, steps[i + 1]); } catch (e) { console.error('RUE: scene ' + id + ' step ' + i + ' (' + st[0] + ') failed', e); }
      }
      if (g !== G) return;
    } catch (e) { console.error('RUE: scene ' + id + ' failed', e); return; }
    emit('scene:end', { id });
    testLog('scene ' + id + ' end');
    if (TEST.auto && (id === TEST.stop || id === 'PC')) { RUE_TEST.done = true; return; }
    if (id === 'PC') { profile.completed = true; saveOptions(); return toTitle(); }
    if (id === 'P' && !TEST.auto) return toTitle();
    next();
  }

  const flow = {
    skipping: false, scene: null, sceneId: null, stepIndex: 0, result: null,
    swap: false, follow: null, roaming: false, busy: false,
    get cutscene() { return cutDepth > 0; }, // a cutscene (or a spot's steps) is running: the pause menu offers Skip Scene
    start, next, stop, minigame,
    skip() { // pause menu: run the rest of this cutscene instantly (state steps still apply)
      if (!cutDepth) return;
      flow.skipping = true; popup.clear();
      if (cardOn) { ui.card(null); cardOn = false; }
    },
  };

  return { flow, hotspots, inventory, runSteps, playCutscene };
})();
