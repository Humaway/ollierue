// Preview sets and characters without the engine (uses only 01-imports, 10-config, 30-art, 4x-sets).
//   node test/view.mjs --set reddy [--env day] [--marks]   -> test/out/view-reddy-<cam>.png, overview, anchors
//   node test/view.mjs --chars [--only luka,chase]           -> lineup, faces, anim sheet
import { chromium } from 'playwright';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const setId = arg('set', ''), env = arg('env', ''), only = arg('only', ''), marks = process.argv.includes('--marks');
const out = path.join(root, 'test/out'); mkdirSync(out, { recursive: true });
const src = (f) => readFileSync(path.join(root, 'src', f), 'utf8');
const files = readdirSync(path.join(root, 'src')).filter((f) => /^(01|10|30|4\d)-.*\.js$/.test(f)).sort();

const viewer = `
const W = 960, H = 540, shots = [];
const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
r.setSize(W, H); r.outputColorSpace = THREE.SRGBColorSpace; document.body.appendChild(r.domElement);
const cam = new THREE.PerspectiveCamera(50, W / H, 0.05, 400);
const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
function rig(scene, e) {
  scene.background = new THREE.Color(e.bg ?? 0x333333);
  scene.fog = new THREE.FogExp2(e.fog?.[0] ?? 0x888888, e.fog?.[1] ?? 0.01);
  const h = e.hemi || [0xffffff, 0x444444, 1]; scene.add(new THREE.HemisphereLight(h[0], h[1], h[2]));
  const d = e.dir || [0xffffff, 1, [5, 10, 5]]; const dl = new THREE.DirectionalLight(d[0], d[1]); dl.position.set(...d[2]); scene.add(dl);
}
function snap(scene, name, pos, look, fov) {
  cam.fov = fov || 50; cam.position.copy(pos); cam.lookAt(look); cam.updateProjectionMatrix();
  r.render(scene, cam); shots.push({ name, url: r.domElement.toDataURL('image/png'), calls: r.info.render.calls, tris: r.info.render.triangles });
}
window.RUN = async (mode, id, envName, only, showMarks) => {
  if (mode === 'set') {
    const S = SETS[id]; if (!S) throw new Error('no SETS.' + id);
    const scene = new THREE.Scene(); const e = S.env[envName] || Object.values(S.env)[0]; rig(scene, e);
    const g = S.build(); scene.add(g);
    const box = new THREE.Box3().setFromObject(g); const c = box.getCenter(new THREE.Vector3()), s = box.getSize(new THREE.Vector3());
    const marksOn = showMarks && S.marks;
    if (marksOn) for (const [k, m] of Object.entries(S.marks)) {
      const o = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.5, 6).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
      o.position.set(m[0], (m[1] || 0) + 0.9, m[2]); o.rotation.y = m[3] || 0; scene.add(o);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9), o.material); pole.position.set(m[0], (m[1] || 0) + 0.45, m[2]); scene.add(pole);
    }
    if (typeof buildCharacter === 'function' && S.marks) {
      const pick = Object.keys(S.marks).slice(0, 3);
      for (const k of pick) { try { const rg = buildCharacter(k.includes('chase') ? 'chase' : 'luka'); const m = S.marks[k]; rg.root.position.set(m[0], m[1] || 0, m[2]); rg.root.rotation.y = m[3] || 0; scene.add(rg.root); } catch (e) {} }
    }
    snap(scene, 'overview-top', new THREE.Vector3(c.x, box.max.y + Math.max(s.x, s.z) * 0.9, c.z + 0.01), c, 50);
    snap(scene, 'overview-34', new THREE.Vector3(c.x + s.x * 0.7, box.max.y + s.y, c.z + s.z * 0.8), c, 50);
    for (const [k, cm] of Object.entries(S.cams || {})) {
      const zone = (S.zones || []).find((z) => z.cam === k);
      const zc = zone ? new THREE.Vector3((zone.box[0] + zone.box[2]) / 2, 1.2, (zone.box[1] + zone.box[3]) / 2) : c;
      const pos = cm.pos ? V(cm.pos) : cm.from ? V(cm.from).lerp(V(cm.to), 0.5) : c;
      const look = Array.isArray(cm.look) ? V(cm.look) : cm.base ? V(cm.base) : zc;
      snap(scene, 'cam-' + k, pos, look, cm.fov);
    }
    for (const [k, a] of Object.entries(S.anchors || {})) if (a && a.from) snap(scene, 'anchor-' + k, V(a.from), V(a.at), a.fov || 40);
    return shots;
  }
  const ids = only ? only.split(',') : Object.keys(LOOKS).filter((k) => k !== 'assistant');
  const scene = new THREE.Scene(); rig(scene, { bg: 0x8a8f96, fog: [0x8a8f96, 0.005], hemi: [0xffffff, 0x555555, 1.3], dir: [0xffffff, 1.4, [3, 6, 5]] });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 20), new THREE.MeshLambertMaterial({ color: 0x777777 })); floor.rotation.x = -Math.PI / 2; scene.add(floor);
  const rigs = ids.map((id, i) => { const rg = buildCharacter(id); rg.root.position.set((i - (ids.length - 1) / 2) * 1.1, 0, 0); scene.add(rg.root); rg.update?.(0.016); return rg; });
  for (let i = 0; i < ids.length; i += 6) {
    const x = ((Math.min(i + 6, ids.length) + i - 1) / 2 - (ids.length - 1) / 2) * 1.1;
    snap(scene, 'lineup-front-' + i, new THREE.Vector3(x, 1.2, 6.2), new THREE.Vector3(x, 0.95, 0), 45);
    snap(scene, 'lineup-side-' + i, new THREE.Vector3(x + 6.5, 1.2, 0.3), new THREE.Vector3(x, 0.95, 0), 45);
  }
  rigs.forEach((rg, i) => { const hp = new THREE.Vector3(); rg.parts.head.getWorldPosition(hp); snap(scene, 'face-' + ids[i], hp.clone().add(new THREE.Vector3(0.25, 0.05, 0.9)), hp, 30); });
  const an = ['idle', 'walk', 'run', 'sit', 'head_hands', 'lanyard', 'pedal', 'point', 'phone', 'hands_head', 'carry', 'lie_tangled', 'wave', 'pull'];
  const lk = rigs[0]; for (const rg of rigs) rg.root.visible = false; lk.root.visible = true; lk.root.position.set(0, 0, 0);
  for (const a of an) { if (!ANIMS[a]) continue; lk.pose?.(a, 0.35, {}); if (!lk.pose) ANIMS[a](lk, 0.35, {}); lk.root.updateMatrixWorld(true); snap(scene, 'anim-' + a, new THREE.Vector3(2.2, 1.3, 2.6), new THREE.Vector3(0, 0.8, 0), 45); }
  return shots;
};`;

const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#000}</style>
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/"}}</script>
<script type="module">${files.map(src).join('\n')}\n${viewer}\nwindow.READY = true;</script>`;
const tmp = path.join(out, '_view.html'); writeFileSync(tmp, html);

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
await page.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)$/, (route) => route.fulfill({ path: path.join(root, 'node_modules/three', route.request().url().replace(/^.*\/npm\/three@[^/]+\//, '')), contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } }));
const errors = []; page.on('pageerror', (e) => errors.push(e.stack || e.message)); page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto('file://' + tmp);
await page.waitForFunction(() => window.READY || false, null, { timeout: 30000 }).catch(() => {});
let shots = [];
if (!errors.length) shots = await page.evaluate(([m, i, e, o, mk]) => window.RUN(m, i, e, o, mk), [setId ? 'set' : 'chars', setId, env, only, marks]).catch((e) => { errors.push(String(e)); return []; });
for (const s of shots) { writeFileSync(path.join(out, `view-${setId || 'chars'}-${s.name}.png`), Buffer.from(s.url.split(',')[1], 'base64')); console.log(`${s.name}: ${s.calls} calls, ${s.tris} tris`); }
await browser.close();
if (errors.length) { console.log('ERRORS\n' + errors.join('\n')); process.exit(1); }
console.log(`wrote ${shots.length} images to test/out/view-${setId || 'chars'}-*.png`);
