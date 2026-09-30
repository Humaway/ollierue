// ============================================================ MINIGAME: Torchlight (2.13)
// Front Square in the dark (env 'dark': lamps off, heavy fog). The only light is the torch beam: world.torch riding in the
// player's right hand (world.torchAuto), the camera tight behind the player. The trail is linear: wet footprints on the
// cobbles (the set's trail_1..3 decals, only visible in the beam), then Rue's Walkman dropped on the cobbles playing
// "Winning Is a Decision" (an HRTF loop you find by ear; content puts the prop 'rue_walkman' at params.walkman), his scarf
// snagged on lamp_4, then the Campanile's north steps and Rue. NO switches the torches off (the drain pauses; in the dark
// you can only follow the sound). TAB swaps Luka and Chase. Random barks while searching.
// The drain is rubber-banded to the distance left to the find, drainRate = battery / max(toFind / walkSpeed, 1.5 s): walking
// the trail it falls in a straight line to ~0 at the find (never before it), so the HUD counts 4 -> 3 -> 2 -> 1 (1% for the
// last quarter) and the find cutscene takes it to 0% as the torches die.
// params: {walkman: [x, y, z]} -> {found: true} (the beam on Rue). The follow camera is left on for the cutscene to cut from.
MINIGAMES.torchlight = (() => {
  const WAY = [[-19.8, 0.9], [-16.5, 5.8], [-12, 9.6], [-6.5, 12], [4, 11.5], [8.6, 8.4], [2.4, 5.6], [0.6, 4.9]];
  const CUM = [0];
  for (let i = 1; i < WAY.length; i++) CUM.push(CUM[i - 1] + Math.hypot(WAY[i][0] - WAY[i - 1][0], WAY[i][1] - WAY[i - 1][1]));
  const LEN = CUM[CUM.length - 1], SCARF = [10, 9], RUE = [0.45, 3.97], FIND = 2.9;   // (trail metres left when the beam finds him)
  const FOLLOW = { dist: 2.3, height: 2.05, lag: 0.3, fov: 55 }, BEAM = 34;
  const BARKS = [['luka', 'Rue!'], ['chase', "Rue! It's Other Australia!"], ['luka', "Mate, it's cold, come on."]];
  let api, tok = 0, done = true, on = true, B = 4, gotW = false, gotS = false, barkT = 0, bi = 0, talking = false, loop = null, wm = null, W = [4, 0, 11.5];

  function along(x, z) {   // metres along the trail of the nearest point on it
    let best = 1e9, s = 0;
    for (let i = 0; i < WAY.length - 1; i++) {
      const a = WAY[i], b = WAY[i + 1], dx = b[0] - a[0], dz = b[1] - a[1];
      let u = ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz); u = u < 0 ? 0 : u > 1 ? 1 : u;
      const ex = a[0] + dx * u - x, ez = a[1] + dz * u - z, d = ex * ex + ez * ez;
      if (d < best) { best = d; s = CUM[i] + u * (CUM[i + 1] - CUM[i]); }
    }
    return s;
  }
  function aim(a, s) {   // the beam from the right hand onto the cobbles a few metres ahead (world.torchAuto aims too far for the fog)
    const fx = Math.sin(a.rotY), fz = Math.cos(a.rotY);
    s.position.set(a.pos.x + fx * 0.3 - fz * 0.18, a.pos.y + 1.2, a.pos.z + fz * 0.3 + fx * 0.18);
    s.target.position.set(a.pos.x + fx * 4.6, a.pos.y + 0.05, a.pos.z + fz * 4.6);
  }
  const prompt = () => ui.prompt(on ? 'NO — Torch off' : 'NO — Torch on');
  function swap() {
    const prev = state.active, nx = prev === 'luka' ? 'chase' : 'luka';
    if (!api.world.actor(nx)) return;
    state.active = nx; player.control(nx); player.follower(prev); flow.follow = prev;
    ui.swapIndicator(nx, prev); api.sfx('pop', { vol: 0.5 });
  }
  function bark() {
    talking = true;
    const [id, text] = BARKS[bi++ % BARKS.length];
    api.say(id, text, { auto: 1.4 }).then(() => { talking = false; barkT = 13 + Math.random() * 8; });
  }

  return {
    start(params, a) {
      api = a; done = false; on = true; gotW = gotS = false; talking = false; barkT = 9; bi = Math.floor(Math.random() * 3);
      const Wd = a.world;
      tok++;
      if (params.walkman) W = params.walkman;
      B = state.battery > 0 ? state.battery : 4;
      const act = Wd.actor(state.active) ? state.active : 'luka', other = act === 'luka' ? 'chase' : 'luka';
      const me = Wd.actor(act), fo = Wd.actor(other);
      for (const x of [me, fo]) if (x) { x.rig.seated = false; x.play('idle'); if (x.rig.attach.phone) x.rig.attach.phone.visible = true; }   // two phones off the machine
      if (me) me.place([WAY[0][0], 0, WAY[0][1], Math.PI / 2]);
      if (fo) fo.place([WAY[0][0] - 0.9, 0, WAY[0][1] - 0.45, Math.PI / 2]);
      state.active = act; player.control(act); player.follower(other); flow.follow = other;
      const s = Wd.torch;
      if (s) { Wd.torchAuto = false; s.color.set(0xf2f4ff); s.angle = 0.42; s.penumbra = 0.5; s.intensity = BEAM; if (me) aim(me, s); }
      wm = Wd.scene && Wd.scene.getObjectByName('rue_walkman');
      loop = a.AUDIO && a.AUDIO.loop ? a.AUDIO.loop('walkman', { at: W, vol: 3, fade: 1.5 }) : null;
      a.cam.override('follow', FOLLOW);
      if (a.cam.cutscene) a.cam.release(0);
      a.hud.set({ battery: Math.ceil(B), bars: state.bars ?? 1 });
      ui.swapIndicator(act, other); prompt();
      player.enabled = true;
      ui.fade(0, 1.2);
    },
    update(dt) {
      if (done) return;
      const a = player.actor;
      if (!a || flow.busy) return;
      if (input.pressed('swap')) { input.consume('swap'); swap(); return; }
      if (input.pressed('no')) { input.consume('no'); on = !on; api.sfx('tick', { vol: 0.7 }); prompt(); }
      const x = a.pos.x, z = a.pos.z, rem = Math.max(0, LEN - along(x, z));
      if (on) B -= B / Math.max((rem - FIND) / CONFIG.walk, 1.5) * dt;
      const s = api.world.torch;
      if (s) { s.intensity = on ? BEAM * (B < 1.3 ? 0.75 + 0.25 * Math.random() : 1) : 0; aim(a, s); }   // it gutters near the end
      const n = Math.max(1, Math.ceil(B - 1e-6));
      if (n !== state.battery) api.hud.set({ battery: n });
      // the trail: the Walkman (you hear it), the scarf (you see it)
      if (!gotW && Math.hypot(x - W[0], z - W[2]) < 1.5) {
        gotW = true;
        if (loop) { loop.stop(0.3); loop = null; }
        api.sfx('cassette_eject', { vol: 0.8 });
        if (wm) wm.visible = false;
        a.play('duck', { dur: 0.7, loop: false }); player.frozen(0.7);
      }
      if (!gotS && Math.hypot(x - SCARF[0], z - SCARF[1]) < 1.7) {
        gotS = true;
        const sc = api.world.prop('scarf'); if (sc) sc.visible = false;
        api.sfx('rip', { vol: 0.25 });
        a.play('give', { dur: 0.8 }); player.frozen(0.6);
      }
      // the beam finds Rue
      if (on) {
        const dx = RUE[0] - x, dz = RUE[1] - z, d = Math.hypot(dx, dz);
        if (d < 3.4 && (Math.sin(a.rotY) * dx + Math.cos(a.rotY) * dz) > 0.72 * d) { done = true; api.finish({ found: true }); return; }
      }
      if (!talking && (barkT -= dt) <= 0 && rem > 14) bark();
    },
    end(r) {
      done = true; tok++;
      if (loop) { loop.stop(0.6); loop = null; }
      ui.prompt(null); ui.swapIndicator(null);
      player.enabled = false;
      if (!r || !r.found) api.cam.override(null);
    },
    async autoplay() {   // walk the trail, torch on
      const t = tok, a = player.actor;
      for (let i = 1; i < WAY.length && t === tok && !done; i++) await a.moveTo([WAY[i][0], 0, WAY[i][1]]);
      if (t === tok && !done) { done = true; api.finish({ found: true }); }
    },
  };
})();
