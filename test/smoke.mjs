// Headless playthrough. Usage:
//   node test/smoke.mjs [--scene 1.1] [--stop PC] [--speed 8] [--shots 2] [--timeout 600] [--manual]
// --manual: no autoplay (just boot to title). --shots N: screenshot every N seconds into test/out/.
// Serves three.js from node_modules because the CDN is unreachable from CI sandboxes.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : (process.argv[i + 1] ?? true); };
const scene = arg('scene', ''), stop = arg('stop', ''), speed = arg('speed', '8');
const shots = +arg('shots', 0), timeout = +arg('timeout', 600), manual = process.argv.includes('--manual');
mkdirSync(path.join(root, 'test/out'), { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.route(/cdn\.jsdelivr\.net\/npm\/three@[^/]+\/(.*)$/, (route) => {
  const rel = route.request().url().replace(/^.*\/npm\/three@[^/]+\//, '');
  route.fulfill({ path: path.join(root, 'node_modules/three', rel), contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' } });
});
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + (e.stack || e.message)));
page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); if (m.type() === 'warning' && /RUE/.test(m.text())) console.log('warn:', m.text()); });

const q = new URLSearchParams();
if (!manual) q.set('autoplay', '1');
if (scene) q.set('scene', scene);
if (stop) q.set('stop', stop);
q.set('speed', speed);
await page.goto('file://' + path.join(root, 'games/rue.html') + '?' + q);

const t0 = Date.now(); let lastLog = 0, lastShot = 0, n = 0;
for (;;) {
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => window.RUE_TEST && { done: RUE_TEST.done, scene: RUE_TEST.scene, step: RUE_TEST.step, ready: RUE_TEST.ready }).catch(() => null);
  const log = await page.evaluate((from) => window.RUE_TEST ? RUE_TEST.log.slice(from) : [], lastLog).catch(() => []);
  for (const l of log) console.log('  ' + l); lastLog += log.length;
  const el = (Date.now() - t0) / 1000;
  if (shots && el - lastShot >= shots) { lastShot = el; await page.screenshot({ path: path.join(root, `test/out/shot-${String(n++).padStart(3, '0')}.png`) }); }
  if (errors.length) break;
  if (s && s.done) break;
  if (manual && s && s.ready && el > 5) break;
  if (el > timeout) { errors.push(`timeout after ${timeout}s at scene ${s && s.scene} step ${s && s.step}`); break; }
}
await page.screenshot({ path: path.join(root, 'test/out/final.png') });
await browser.close();
if (errors.length) { console.log('FAIL\n' + errors.join('\n')); process.exit(1); }
console.log('PASS');
