// Word-for-word check: every scripted dialogue line (and quoted on-screen text) in the spec must appear in the build.
//   node test/lines.mjs <spec.md> [--from 1.2] [--to 1.7] [--quotes]
// Reports missing fragments per scene. `^` beats and "(beat)" split a line into fragments.
import { readFileSync } from 'fs';
const specPath = process.argv.find((a) => a.endsWith('.md'));
const arg = (k) => { const i = process.argv.indexOf('--' + k); return i < 0 ? null : process.argv[i + 1]; };
const quotes = process.argv.includes('--quotes');
const spec = readFileSync(specPath, 'utf8').split('\n');
const build = readFileSync(new URL('../games/rue.html', import.meta.url), 'utf8')
  .replace(/\\(['"`\\])/g, '$1').replace(/\\n/g, ' ').replace(/\^/g, ' ').replace(/\s+/g, ' ');
const norm = (s) => s.replace(/\\([[\]])/g, '$1').replace(/\s+/g, ' ').trim();

// Scene headings look like "### 1.2 — "Margarine"" or "### Prologue — ..." / "### Epilogue" / "### Credits" / "### Post-credits".
const idOf = (h) => /^### (\d\.\d+)/.exec(h)?.[1] ?? (/Prologue/.test(h) ? 'P' : /Epilogue/.test(h) ? 'E' : /Post-credits/.test(h) ? 'PC' : /Credits/.test(h) ? 'C' : null);
const order = ['P', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', '2.7', '2.8', '2.9', '2.10', '2.11', '2.12', '2.13', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8', '3.9', 'E', 'C', 'PC'];
const from = order.indexOf(arg('from') ?? 'P'), to = order.indexOf(arg('to') ?? 'PC');

let scene = null, total = 0, missing = 0;
const out = {};
const check = (sc, kind, frag) => {
  frag = norm(frag).replace(/^[\s,.;:]+|[\s]+$/g, '');
  if (frag.replace(/[^A-Za-z0-9]/g, '').length < 2) return;
  total++;
  if (!build.includes(frag)) { missing++; (out[sc] ??= []).push(`${kind}: ${frag}`); }
};
for (const line of spec) {
  if (line.startsWith('### ')) { scene = idOf(line); continue; }
  if (line.startsWith('## ') && /14\.|15\.|16\.|17\./.test(line)) scene = null;
  if (!scene || order.indexOf(scene) < from || order.indexOf(scene) > to) continue;
  // dialogue: **NAME:** text   or   **NAME** *(dir)***:** text   (possibly several per line)
  const re = /\*\*([A-ZÁÉÍÓÚ][A-ZÁÉÍÓÚ .'-]+?)(?::\*\*|\*\* \*\([^)]*\)\*\*\*:\*\*)\s*/g;
  const hits = [...line.matchAll(re)];
  hits.forEach((m, i) => {
    if (/^(Title card|Tick|Solution|Hint|Beat|Camera|Gameplay|Rule|Note)/i.test(m[1])) return;
    let text = line.slice(m.index + m[0].length, i + 1 < hits.length ? hits[i + 1].index : undefined);
    text = text.replace(/\*\*\\\[[^\]]*\\\]\*\*/g, '\u0000');            // inline shot tags
    text = text.replace(/\*\*[^*]+\*\*/g, (b) => b.slice(2, -2));          // inline bold words
    text = text.replace(/\*\((?:beat|pause)[^)]*\)\*/gi, '\u0000');     // beats split fragments
    text = text.replace(/\*\([^)]*\)\*/g, '\u0000');                    // other inline directions
    text = text.replace(/\*[^*]+\*/g, '\u0000');                        // italic stage text
    if (/\*\s*$/.test(text)) text = (/^[^*]*?[.?!…](?=\s|$)/.exec(text) || [text])[0]; // speaker inside italic narration
    text = text.replace(/\*/g, '');
    for (const f of text.split('\u0000')) check(scene, m[1], f);
  });
  if (quotes && !hits.length) for (const q of line.matchAll(/"([^"]{6,})"/g)) check(scene, 'quote', q[1]);
}
for (const [sc, list] of Object.entries(out)) { console.log(`\n== ${sc} (${list.length} missing)`); for (const l of list) console.log('  ' + l); }
console.log(`\n${total - missing}/${total} fragments present${missing ? '' : ' — all lines found'}`);
process.exit(missing ? 1 : 0);
