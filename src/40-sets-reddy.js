// ============================================================ SET: reddy — Optus Redcliffe, 2026
// Car park + shop floor + corridor + backroom + Luke's office + the black car, all in one set.
// Layout (metres, Y up): the glass shopfront is the line z=0 facing +Z (car park z>0). Front doors at x=-2 on the
// aisle axis; the display wall sits dead centre at the end of that aisle (back wall z=-14.5). Counter x 3.2..7.8
// at z≈-9 with the staff area behind it; the corridor (x 5.4..7.4) runs straight back from behind the counter to
// the backroom (z -24..-30), so backroom door -> corridor -> counter -> front glass is one line (1.6 push, 3.9 pull).
// Luke's office x 7.65..11, z -12.75..-17. Static geometry is vertex-coloured into ONE material (one draw call);
// textures only where something has to read. Colliders are filled by build().
SETS.reddy = (() => {
  const PI = Math.PI, H = PI / 2;
  const NAVY = 0x141d3a, YEL = 0xffd21f, WHITE = 0xf2f3f4, WOOD = 0xc8a476, CARD = 0xb98d5a, DARK = 0x1d1f24;
  const OUT = [1.15, 1.0, 0.76], IN = [0.86, 0.96, 1.1], BOH = [0.9, 0.97, 1.06];   // warm sun / cool fluoro tints
  const COL = [];                // colliders (filled by build)
  const R = {};                  // live prop refs from the last build (update/dress use them)
  const tc = new THREE.Color(), m4 = new THREE.Matrix4();
  let b = null, tint = OUT, XF = null, T = null, M = null, SUNM = null, CUST = null;

  // ---------------------------------------------------------- geometry helpers (into the current Builder `b`)
  function put(g, hex, m) {
    if (XF) g.applyMatrix4(XF);
    tc.set(hex);
    const r = tc.r * tint[0], gg = tc.g * tint[1], bl = tc.b * tint[2], n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = r; a[i * 3 + 1] = gg; a[i * 3 + 2] = bl; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    b.geo(g, m || M.vc);
  }
  // box: y is the BOTTOM. bb: min/max corners. boxR: centred, any rotation. cyl/ico: centred.
  function box(w, h, d, hex, x, y, z, ry = 0, m) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y + h / 2, z); put(g, hex, m); }
  function bb(x0, y0, z0, x1, y1, z1, hex, m) { box(x1 - x0, y1 - y0, z1 - z0, hex, (x0 + x1) / 2, y0, (z0 + z1) / 2, 0, m); }
  function boxR(w, h, d, hex, x, y, z, rx = 0, ry = 0, rz = 0, m) {
    const g = new THREE.BoxGeometry(w, h, d); g.rotateX(rx); g.rotateZ(rz); g.rotateY(ry); g.translate(x, y, z); put(g, hex, m);
  }
  function cyl(rt, rb, h, seg, hex, x, y, z, rx = 0, rz = 0, m) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg); if (rx) g.rotateX(rx); if (rz) g.rotateZ(rz); g.translate(x, y, z); put(g, hex, m);
  }
  function ico(r, hex, x, y, z, sy = 1, m) { const g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, sy, 1); g.translate(x, y, z); put(g, hex, m); }
  // quad faces +Z before rotation (rx first, then ry): floor rx=-H, ceiling rx=H, wall facing -X ry=-H.
  function quad(w, h, m, x, y, z, ry = 0, rx = 0, hex = 0xffffff) {
    const g = new THREE.PlaneGeometry(w, h); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); put(g, hex, m);
  }
  // one row (0..7) of the 8-row label atlas
  function label(w, h, row, x, y, z, ry = 0, m = M.atlas) {
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    for (let i = 0; i < 4; i++) uv.setY(i, uv.getY(i) > 0.5 ? 1 - row / 8 : 1 - (row + 1) / 8);
    if (ry) g.rotateY(ry); g.translate(x, y, z); put(g, 0xffffff, m);
  }
  function wall(x0, z0, x1, z1, h, hex) { bb(x0, 0, z0, x1, h, z1, hex); COL.push([x0, z0, x1, z1]); }
  // a separate Builder -> named Group (a prop). Coordinates inside fn are local.
  function part(name, fn, pos, ry = 0, o) {
    const pb = b, px = XF; b = new Builder(); XF = null;
    fn();
    const g = b.done(o); b = pb; XF = px;
    if (name) g.name = name;
    if (pos) g.position.set(pos[0], pos[1], pos[2]);
    g.rotation.y = ry;
    return g;
  }
  const at = (x, z, ry = 0) => (XF = m4.makeRotationY(ry).setPosition(x, 0, z));
  // a cable segment in the local YZ plane (x = 0) from (y0,z0) to (y1,z1)
  function seg(y0, z0, y1, z1, r, hex) {
    const dy = y1 - y0, dz = z1 - z0, g = new THREE.BoxGeometry(r, r, Math.hypot(dy, dz) + r);
    g.rotateX(Math.atan2(-dy, dz)); g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2); put(g, hex);
  }

  // ---------------------------------------------------------- painted textures (128–256 px)
  const FONT = (px, w = 'bold') => `${w} ${px}px Arial, "Liberation Sans", "DejaVu Sans", sans-serif`;
  function text(c, s, x, y, px, col, al = 'center', w = 'bold', maxW) {
    c.font = FONT(px, w); c.fillStyle = col; c.textAlign = al; c.textBaseline = 'middle'; c.fillText(s, x, y, maxW);
  }
  const yes = (c, x, y, h, col) => canvasTex.yes(c, x, y, h, col);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  function skull(c, x, y, s) {
    c.fillStyle = '#fff'; c.strokeStyle = '#111'; c.lineWidth = 1.5;
    c.beginPath(); c.arc(x, y, s, 0, PI * 2); c.fill(); c.stroke();
    c.fillRect(x - s * 0.55, y + s * 0.6, s * 1.1, s * 0.7); c.strokeRect(x - s * 0.55, y + s * 0.6, s * 1.1, s * 0.7);
    c.fillStyle = '#111'; c.beginPath(); c.arc(x - s * 0.38, y, s * 0.28, 0, PI * 2); c.arc(x + s * 0.38, y, s * 0.28, 0, PI * 2); c.fill();
  }
  function jwin(c, x, y, w, h, title = 'JARVIS') {   // a JARVIS window: white panel, grey title bar
    c.fillStyle = '#fff'; c.fillRect(x, y, w, h);
    c.fillStyle = '#d9dce1'; c.fillRect(x, y, w, 16);
    text(c, title, x + 6, y + 8, 10, '#2f6fd6', 'left');
    c.strokeStyle = '#8a909a'; c.lineWidth = 1; c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  function paintMonitor(c, w, h, mode) {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    if (mode === 'off') return;
    if (mode === 'crash') {
      c.fillStyle = '#0c1733'; c.fillRect(0, 0, w, h);
      text(c, 'JARVIS has stopped responding.', w / 2, 30, 14, '#cfd8ea');
      c.fillStyle = '#2f6fd6'; c.fillRect(40, 48, w - 80, 2);
      text(c, 'JARVIS © 1987–2026', w / 2, 82, 22, '#ffffff');
      text(c, 'JARVIS SYSTEMS.', w / 2, 110, 17, '#ffffff');
      text(c, 'All rights reserved.', w / 2, 134, 13, '#9fb0cc');
      return;
    }
    if (mode === 'blue') {
      c.fillStyle = '#1f5fd0'; c.fillRect(0, 0, w, h);
      text(c, ':(', 30, 40, 40, '#fff', 'left');
      text(c, 'JARVIS ran into a problem.', 30, 90, 13, '#fff', 'left');
      text(c, 'Error 4044', 30, 116, 16, '#fff', 'left');
      return;
    }
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#3d7de0'); g.addColorStop(1, '#1d4fa8');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    jwin(c, 10, 10, w - 20, h - 20);
    if (mode === 'loading' || mode === 'ready') {
      c.strokeStyle = mode === 'ready' ? '#2e9d4a' : '#2f6fd6'; c.lineWidth = 7; c.lineCap = 'round';
      c.beginPath();
      if (mode === 'ready') { c.moveTo(106, 66); c.lineTo(122, 82); c.lineTo(152, 50); } else c.arc(w / 2, 64, 20, 0.3, PI * 1.7);
      c.stroke();
      text(c, mode === 'ready' ? 'JARVIS is ready!' : 'JARVIS is starting…', w / 2, 108, 15, '#1b2233');
      if (mode === 'loading') text(c, '(this may take a while)', w / 2, 128, 11, '#6b7280', 'center', 'normal');
    } else if (mode === 'restart') {
      text(c, 'JARVIS has encountered an error.', w / 2, 54, 12, '#1b2233');
      text(c, 'Would you like to restart?', w / 2, 76, 13, '#1b2233');
      for (const [x, s] of [[72, 'YES'], [140, 'NO']]) { c.fillStyle = '#2f6fd6'; c.fillRect(x, 96, 48, 22); text(c, s, x + 24, 107, 12, '#fff'); }
    } else {   // 'app': the sale form
      c.fillStyle = '#eef1f6'; c.fillRect(11, 26, 56, h - 37);
      for (let i = 0; i < 5; i++) { c.fillStyle = i === 1 ? '#2f6fd6' : '#c9d0dc'; c.fillRect(17, 36 + i * 20, 44, 10); }
      const rows = ['Customer', 'Verify ID', 'Plan', 'Service', 'Opt in?'];
      rows.forEach((s, i) => {
        text(c, s, 78, 38 + i * 21, 10, '#1b2233', 'left');
        c.strokeStyle = '#9aa3b2'; c.strokeRect(140.5, 31.5 + i * 21, 92, 14);
      });
      text(c, 'MARGARET', 144, 38, 9, '#1b2233', 'left', 'normal');
      c.fillStyle = '#2f6fd6'; c.fillRect(186, 136, 46, 12); text(c, 'NEXT', 209, 142, 9, '#fff');
    }
  }
  function paintTV(c, w, h, mode) {
    c.setTransform(w / 128, 0, 0, h / 96, 0, 0); w = 128; h = 96;   // painted in 128x96 units onto a 256x192 canvas (the 1.1 push-in fills the frame)
    if (mode === 'off') {
      c.fillStyle = '#1e2622'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.07)'; c.beginPath(); c.moveTo(10, 8); c.lineTo(60, 8); c.lineTo(20, 60); c.lineTo(10, 60); c.fill();
      return;
    }
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#5e3d24'); g.addColorStop(1, '#d39a55');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,220,160,0.25)';
    for (const [x, y, r] of [[18, 20, 9], [104, 16, 12], [112, 50, 7], [14, 58, 6]]) { c.beginPath(); c.arc(x, y, r, 0, PI * 2); c.fill(); }
    c.fillStyle = '#1c2748'; c.beginPath(); c.moveTo(30, 96); c.lineTo(38, 70); c.lineTo(90, 70); c.lineTo(98, 96); c.fill();   // jacket
    c.fillStyle = '#f4f4f0'; c.beginPath(); c.moveTo(54, 70); c.lineTo(64, 86); c.lineTo(74, 70); c.fill();                     // shirt
    c.fillStyle = '#e0ae8a'; c.fillRect(58, 58, 12, 14);                                                                      // neck
    c.beginPath(); c.ellipse(64, 44, 15, 19, 0, 0, PI * 2); c.fill();                                                          // face
    c.fillStyle = '#d4d7db'; c.beginPath(); c.ellipse(64, 31, 16, 9, 0, PI, PI * 2); c.fill(); c.fillRect(48, 29, 4, 14); c.fillRect(76, 29, 4, 14);
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 1.5; c.strokeRect(53, 40, 9, 6); c.strokeRect(66, 40, 9, 6);                      // reading glasses
    c.beginPath(); c.arc(64, 51, 6, 0.2, PI - 0.2); c.stroke();                                                                  // smile
    c.fillStyle = '#141d3a'; c.fillRect(0, 78, 78, 12); text(c, 'RUE — CEO', 6, 84, 8, '#fff', 'left'); c.fillStyle = '#ffd21f'; c.fillRect(0, 78, 3, 12);
    if (mode === 'error') {
      jwin(c, 18, 24, 92, 48);
      text(c, 'Video could not', 64, 48, 9, '#1b2233'); text(c, 'be played.', 64, 58, 9, '#1b2233');
      c.fillStyle = '#2f6fd6'; c.fillRect(82, 62, 22, 8); text(c, 'OK', 93, 66, 7, '#fff');
    }
  }
  const PAPER = { emissive: 0xffffff, emissiveIntensity: 0.28 };
  const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  function paintCal(c, w, h, day, mon, wd) {
    c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d32f2f'; c.fillRect(0, 0, w, 42);
    text(c, mon, w / 2, 17, 20, '#fff'); text(c, '2026', w / 2, 35, 11, '#ffd9d9');
    c.fillStyle = '#333'; for (let x = 14; x < w; x += 14) c.fillRect(x, 2, 4, 6);
    text(c, String(day), w / 2, 96, 72, '#1b1b1b');
    text(c, wd, w / 2, 144, 14, '#666');
  }
  function textures() {
    if (T) return T;
    T = {};
    const K = (k) => ({ key: 'reddy_' + k });
    T.fascia = canvasTex(256, 64, (c, w, h) => {
      c.fillStyle = '#141d3a'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd21f'; c.fillRect(0, h - 4, w, 4);
      yes(c, 22, 8, 46, '#ffd21f'); text(c, 'optus', 176, 32, 40, '#fff');
    }, K('fascia'));
    T.yes = canvasTex(256, 192, (c, w, h) => {
      c.fillStyle = '#141d3a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffd21f'; c.lineWidth = 4; c.strokeRect(8, 8, w - 16, h - 16);
      yes(c, 26, 22, 128, '#ffd21f');
    }, K('yes'));
    T.closed = canvasTex(128, 64, (c, w, h) => {
      c.fillStyle = '#c62828'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(4, 4, w - 8, h - 8);
      text(c, 'CLOSED', w / 2, 28, 26, '#fff'); text(c, 'sorry!', w / 2, 50, 11, '#ffe0e0', 'center', 'normal');
    }, K('closed'));
    T.open = canvasTex(128, 64, (c, w, h) => {
      c.fillStyle = '#ffd21f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#141d3a'; c.lineWidth = 3; c.strokeRect(4, 4, w - 8, h - 8);
      text(c, 'OPEN', w / 2, 28, 30, '#141d3a'); text(c, 'come in', w / 2, 50, 11, '#141d3a', 'center', 'normal');
    }, K('open'));
    T.queue = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#e9ebee'; c.fillRect(0, 0, w, h); c.fillStyle = '#111'; c.fillRect(14, 12, 100, 42);
      c.font = 'bold 34px "DejaVu Sans Mono", "Courier New", monospace'; c.fillStyle = '#ff3b30'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('000', 64, 34);
      text(c, 'NOW SERVING', 64, 64, 11, '#141d3a'); text(c, 'TAKE A NUMBER', 64, 84, 12, '#141d3a');
      c.fillStyle = '#ffd21f'; c.fillRect(24, 98, 80, 8); c.fillStyle = '#222'; c.fillRect(40, 112, 48, 5);
    }, K('queue'));
    T.targets = canvasTex(256, 192, (c, w, h) => {
      c.fillStyle = '#f7f7f4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9a9a9a'; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4);
      text(c, "THIS WEEK'S TARGETS", w / 2, 22, 16, '#141d3a');
      const rows = [['Postpaid', 0.62, '#2f6fd6'], ['NBN', 0.4, '#2e9d4a'], ['Recontracts', 0.12, '#d32f2f'], ['Accessories', 0.81, '#f28c1e'], ['Insurance', 0.3, '#7b3fb0']];
      rows.forEach(([s, p, col], i) => {
        const y = 52 + i * 27;
        text(c, s, 12, y, 12, '#222', 'left');
        c.fillStyle = '#dcdcdc'; c.fillRect(120, y - 7, 122, 14); c.fillStyle = col; c.fillRect(120, y - 7, 122 * p, 14);
        text(c, Math.round(p * 100) + '%', 246, y, 10, '#444', 'right', 'normal');
      });
      skull(c, 107, 106, 6);
      c.save(); c.rotate(-0.05); text(c, "C'mon team!", 186, 190, 13, '#1f3a93', 'center', 'italic bold'); c.restore();
    }, K('targets'));
    T.notice = canvasTex(256, 192, (c, w, h) => {
      c.fillStyle = '#b98a54'; c.fillRect(0, 0, w, h);
      seed = 11; for (let i = 0; i < 400; i++) { c.fillStyle = rnd() > 0.5 ? '#a8794a' : '#c89a66'; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
      c.strokeStyle = '#6b4a2a'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      const paper = (x, y, pw, ph, col, rot, lines, pin = '#d32f2f') => {
        c.save(); c.translate(x + pw / 2, y + ph / 2); c.rotate(rot);
        c.fillStyle = col; c.fillRect(-pw / 2, -ph / 2, pw, ph);
        lines.forEach(([s, px, cc], i) => text(c, s, 0, -ph / 2 + 14 + i * (px + 5), px, cc || '#222'));
        c.fillStyle = pin; c.beginPath(); c.arc(0, -ph / 2 + 4, 3, 0, PI * 2); c.fill(); c.restore();
      };
      paper(12, 12, 112, 84, '#fff2a8', -0.04, [['LANYARD', 12], ['REQUESTS', 12], ['please allow', 10, '#444'], ['6–8 weeks', 14, '#141d3a']]);
      paper(134, 14, 108, 92, '#ffffff', 0.03, [['ROSTER', 11], ['Mon  L  C', 9, '#555'], ['Tue  L  C', 9, '#555'], ['Wed  L  -', 9, '#555'], ['Thu  L  C', 9, '#555'], ['Fri  -  C', 9, '#555']], '#2f6fd6');
      paper(16, 106, 96, 72, '#ffc8dc', 0.05, [['PLEASE WASH', 10], ['YOUR MUGS', 10], ['(Chase)', 9, '#a0305a']], '#2e9d4a');
      paper(128, 116, 84, 62, '#cfe6ff', -0.06, [['STAFF BBQ', 10], ['Friday!', 12, '#1f3a93']]);
    }, K('notice'));
    T.missing = canvasTex(128, 192, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      text(c, 'MISSING', w / 2, 20, 24, '#c62828');
      const face = (x, polo, hair, beard) => {
        c.fillStyle = '#dfe6ec'; c.fillRect(x, 38, 50, 58);
        c.fillStyle = polo; c.fillRect(x + 6, 80, 38, 16);
        c.fillStyle = '#e3b48f'; c.beginPath(); c.ellipse(x + 25, 62, 11, 14, 0, 0, PI * 2); c.fill();
        c.fillStyle = hair; c.beginPath(); c.ellipse(x + 25, 51, 12, 6, 0, PI, PI * 2); c.fill();
        if (beard) { c.beginPath(); c.ellipse(x + 25, 70, 10, 8, 0, 0, PI); c.fill(); c.fillRect(x + 12, 46, 3, 30); }
        c.fillStyle = '#ffd21f'; c.fillRect(x + 12, 84, 6, 3);
        c.fillStyle = '#222'; c.fillRect(x + 20, 60, 2, 2); c.fillRect(x + 28, 60, 2, 2);
      };
      face(9, '#15161a', '#4a2e1c', true); face(69, '#1f6fe0', '#6b4a2e', false);
      text(c, 'LUKA', 34, 104, 10, '#222'); text(c, 'CHASE', 94, 104, 10, '#222');
      ['Last seen 29/09.', 'Answers to Luka', 'and Chase.', 'Chase may ask', 'about his lanyard.'].forEach((s, i) => text(c, s, w / 2, 124 + i * 12, 10, '#333', 'center', 'normal'));
      c.fillStyle = '#141d3a'; c.fillRect(0, h - 10, w, 10);
    }, K('missing'));
    T.cal = canvasTex(128, 160, (c, w, h) => paintCal(c, w, h, 29, 'SEPTEMBER', 'TUESDAY'), K('cal'));
    T.office = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.strokeStyle = '#141d3a'; c.lineWidth = 2; c.strokeRect(3, 3, w - 6, h - 6);
      text(c, 'LUKE', w / 2, 24, 24, '#141d3a'); text(c, '— MANAGER —', w / 2, 46, 12, '#141d3a');
      c.save(); c.translate(w / 2, 78); c.rotate(-0.06); text(c, 'KNOCK', 0, 0, 24, '#1f3a93', 'center', 'italic bold'); c.restore();
      c.save(); c.translate(w / 2 + 6, 106); c.rotate(0.05); text(c, 'PLEASE', 0, 0, 15, '#c62828', 'center', 'italic bold'); c.restore();
    }, K('office'));
    T.slat = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#eceef0'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 16) { c.fillStyle = '#b7bcc2'; c.fillRect(0, y + 12, w, 3); c.fillStyle = '#fafbfc'; c.fillRect(0, y, w, 2); }
    }, { key: 'reddy_slat', repeat: [8, 2] });
    T.sim = canvasTex(128, 256, (c, w, h) => {
      c.fillStyle = '#f5f6f7'; c.fillRect(0, 0, w, h); c.fillStyle = '#141d3a'; c.fillRect(0, 0, w, 26); text(c, 'SIM STARTER PACKS', w / 2, 13, 11, '#ffd21f');
      for (let r = 0; r < 6; r++) for (let k = 0; k < 3; k++) {
        const x = 8 + k * 40, y = 34 + r * 36;
        c.fillStyle = r % 2 ? '#ffd21f' : '#fff'; c.fillRect(x, y, 32, 30); c.strokeStyle = '#999'; c.strokeRect(x + 0.5, y + 0.5, 31, 29);
        text(c, 'SIM', x + 16, y + 11, 10, '#141d3a'); text(c, '$2', x + 16, y + 23, 9, '#c62828');
      }
    }, K('sim'));
    T.mon = canvasTex(256, 160, (c, w, h) => paintMonitor(c, w, h, 'loading'), K('mon'));
    T.tv = canvasTex(256, 192, (c, w, h) => paintTV(c, w, h, 'off'), K('tv'));
    T.clock = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#fff'; c.beginPath(); c.arc(64, 64, 60, 0, PI * 2); c.fill(); c.lineWidth = 6; c.strokeStyle = '#222'; c.stroke();
      for (let i = 0; i < 12; i++) { c.save(); c.translate(64, 64); c.rotate(i * PI / 6); c.fillStyle = '#222'; c.fillRect(-1.5, -54, 3, i % 3 ? 7 : 11); c.restore(); }
      text(c, '12', 64, 24, 14, '#222'); text(c, '3', 106, 64, 14, '#222'); text(c, '6', 64, 104, 14, '#222'); text(c, '9', 22, 64, 14, '#222');
    }, K('clock'));
    T.floor = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#e1e3e6'; c.fillRect(0, 0, w, h);
      seed = 5; for (let i = 0; i < 160; i++) { c.fillStyle = rnd() > 0.5 ? '#d3d6da' : '#eceef0'; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
      c.fillStyle = '#c3c7cc'; c.fillRect(0, 0, w, 2); c.fillRect(0, 0, 2, h);
    }, { key: 'reddy_floor', repeat: [32, 24] });
    T.asphalt = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#77787a'; c.fillRect(0, 0, w, h);
      seed = 3; for (let i = 0; i < 900; i++) { const v = rnd(); c.fillStyle = v > 0.66 ? '#8d8e90' : v > 0.33 ? '#67686b' : '#7f7f80'; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
      c.fillStyle = 'rgba(40,40,42,0.25)'; c.beginPath(); c.moveTo(0, 90); c.lineTo(50, 80); c.lineTo(128, 96); c.lineTo(128, 99); c.lineTo(50, 83); c.lineTo(0, 93); c.fill();
    }, { key: 'reddy_asphalt', repeat: [20, 6] });
    T.phone = canvasTex(64, 128, (c, w, h) => {
      c.fillStyle = '#05070a'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#fff'; c.lineWidth = 3; c.strokeRect(16, 42, 28, 16); c.fillStyle = '#fff'; c.fillRect(44, 46, 4, 8);
      c.fillStyle = '#ff3b30'; c.fillRect(19, 45, 3, 10);
      text(c, '3%', 32, 82, 20, '#ff5a4f');
    }, K('phone'));
    T.postit = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#ffe867'; c.fillRect(0, 0, w, h);
      text(c, 'JARVIS', 32, 14, 11, '#1f3a93', 'center', 'italic bold'); text(c, 'DOWN', 32, 28, 11, '#1f3a93', 'center', 'italic bold');
      text(c, '8:52 — L.', 32, 46, 11, '#1f3a93', 'center', 'italic bold');
    }, K('postit'));
    T.hween = canvasTex(256, 64, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      c.font = FONT(30); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 5; c.strokeStyle = '#1a1a1a'; c.strokeText('HAPPY HALLOWEEN', w / 2, 34);
      c.fillStyle = '#ff8c1a'; c.fillText('HAPPY HALLOWEEN', w / 2, 34);
    }, K('hween'));
    T.report = canvasTex(128, 160, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
      text(c, 'INCIDENT', w / 2, 20, 16, '#c62828'); text(c, 'REPORT', w / 2, 38, 16, '#c62828');
      c.fillStyle = '#bbb'; for (let i = 0; i < 7; i++) c.fillRect(14, 58 + i * 12, i === 6 ? 60 : 100, 4);
      text(c, '4 x displays: MISSING', w / 2, 146, 9, '#222');
      c.fillStyle = 'rgba(230,215,170,0.8)'; c.fillRect(-4, 0, 30, 10); c.fillRect(w - 26, 0, 30, 10);
    }, K('report'));
    T.atlas = canvasTex(256, 256, (c, w) => {
      const rows = [['STAFF ONLY', '#141d3a', '#fff'], ['LOST PROPERTY', '#c49a62', '#1b1b1b'], ['THE LATEST', '#141d3a', '#fff'],
        ['BAKERY', '#f3e3c3', '#7a3e16'], ['PHARMACY', '#2e8b57', '#fff'], ['FOR LEASE', '#fafafa', '#c62828'],
        ['NOW SERVING  000', '#0a0a0a', '#ff3b30'], ['CUSTOMER PARKING', '#1f4fa3', '#fff']];
      rows.forEach(([s, bg, fg], i) => {
        c.fillStyle = bg; c.fillRect(0, i * 32, w, 32);
        text(c, s, w / 2, i * 32 + 17, 20, fg, 'center', 'bold', w - 12);
        if (i === 2) { c.fillStyle = '#ffd21f'; c.fillRect(70, i * 32 + 28, 116, 2); }
      });
    }, K('atlas'));
    T.lineup = canvasTex(256, 128, (c, w, h) => {
      c.fillStyle = '#eef0f3'; c.fillRect(0, 0, w, h);
      for (let y = 8, n = 20; y < h; y += 12, n--) { c.fillStyle = n % 5 ? '#d4d8de' : '#aeb4bd'; c.fillRect(0, y, w, n % 5 ? 1 : 2); if (!(n % 5)) text(c, (n / 10).toFixed(1), 10, y - 5, 8, '#8a919c'); }
    }, K('lineup'));
    T.posters = canvasTex(256, 192, (c) => {
      c.fillStyle = '#141d3a'; c.fillRect(0, 0, 128, 192);
      text(c, '5G', 64, 58, 64, '#ffd21f'); text(c, 'Say yes to', 64, 116, 13, '#fff', 'center', 'normal'); text(c, 'more data.', 64, 132, 13, '#fff', 'center', 'normal');
      yes(c, 40, 150, 26, '#ffd21f');
      c.fillStyle = '#ffd21f'; c.fillRect(128, 0, 128, 192);
      ['NEW', 'PHONES', 'IN STORE'].forEach((s, i) => text(c, s, 192, 30 + i * 24, 20, '#141d3a'));
      c.fillStyle = '#141d3a'; c.fillRect(170, 104, 44, 78); c.fillStyle = '#5a8fe8'; c.fillRect(174, 110, 36, 64);
    }, K('posters'));
    T.keypad = canvasTex(64, 96, (c, w, h) => {
      c.fillStyle = '#e3e5e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#9fd18a'; c.fillRect(8, 6, 48, 18); text(c, 'ARMED', 32, 15, 10, '#1d3a12');
      const k = '123456789*0#';
      for (let i = 0; i < 12; i++) { const x = 8 + (i % 3) * 17, y = 30 + Math.floor(i / 3) * 16; c.fillStyle = '#3a3f46'; c.fillRect(x, y, 14, 13); text(c, k[i], x + 7, y + 7, 9, '#fff'); }
    }, K('keypad'));
    T.spin = canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = '#10151f'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#2f6fd6'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.arc(32, 32, 18, 0.2, PI * 1.6); c.stroke();
    }, K('spin'));
    T.shim = canvasTex(128, 64, (c, w, h) => {
      c.clearRect(0, 0, w, h);
      seed = 29;   // mirage: broken dashes of reflected sky, fading out upward
      for (let y = 0; y < h; y += 2) for (let x = -8; x < w; x += 6 + rnd() * 10) {
        const k = y / h; c.fillStyle = `rgba(${rnd() > 0.5 ? '225,238,255' : '180,210,250'},${(k * k * 0.9 * rnd()).toFixed(3)})`;
        c.fillRect(x + Math.sin(y * 0.7) * 3, y, 6 + rnd() * 12, 2);
      }
    }, { key: 'reddy_shim', repeat: [10, 1] });
    T.streak = canvasTex(128, 128, (c, w, h) => {
      c.clearRect(0, 0, w, h); seed = 17;
      for (let i = 0; i < 26; i++) { const x = rnd() * w, y = rnd() * h, l = 20 + rnd() * 60; c.fillStyle = 'rgba(225,235,245,0.4)'; c.fillRect(x, y, 1.6, l); c.beginPath(); c.arc(x + 0.8, y + l, 2, 0, PI * 2); c.fill(); }
    }, { key: 'reddy_streak', repeat: [10, 2] });
    T.scorch = canvasTex(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(10,8,6,0.95)'); g.addColorStop(0.5, 'rgba(25,20,15,0.7)'); g.addColorStop(1, 'rgba(40,30,20,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(15,12,10,0.8)'; c.lineWidth = 3; seed = 23;
      for (let i = 0; i < 14; i++) { const a = rnd() * PI * 2, r = 30 + rnd() * 28; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); c.stroke(); }
    }, K('scorch'));
    T.pudding = canvasTex(64, 32, (c, w, h) => {
      c.fillStyle = '#f4f1e8'; c.fillRect(0, 0, w, h); c.fillStyle = '#222'; c.fillRect(8, 10, 48, 14);
      c.fillStyle = '#f4f1e8'; c.fillRect(14, 13, 36, 8); text(c, 'PUDDING', 32, 6, 7, '#1f3a93', 'center', 'italic bold');
    }, K('pudding'));
    return T;
  }

  // ---------------------------------------------------------- reusable little models
  function phoneModel(kind) {         // a display phone standing up, its face on +Z, origin at its base (h 0.21)
    const edge = [0xc9ccd1, 0x1f2a44, 0x5b5f66, 0xf0f0ec][kind];
    box(0.11, 0.21, 0.014, edge, 0, 0, 0);
    box(0.1, 0.19, 0.004, 0x07090c, 0, 0.012, 0.007);
    if (kind === 2) { box(0.12, 0.05, 0.02, 0x3d4046, 0, 0, -0.003); box(0.02, 0.02, 0.01, 0x2a2d31, 0.03, 0.17, 0.008); }   // prepaid: chunky chin
    else box(0.03, 0.006, 0.004, 0x222222, 0, 0.198, 0.008);
  }
  function aframeModel(scorched) {     // metal A-frame sign, 0.62 wide, hinge at the top (0.95), feet spread along z
    const fr = scorched ? 0x2a2522 : 0x8d9398, s = 0.33;
    for (const sz of [1, -1]) {
      boxR(0.64, 1.0, 0.03, fr, 0, 0.48, sz * 0.14, -sz * s);
      quad(0.54, 0.4, scorched ? M.vc : M.yes, 0, 0.57, sz * 0.135, sz > 0 ? 0 : PI, -s, scorched ? 0x1a1614 : 0xffffff);
      boxR(0.56, 0.06, 0.035, fr, 0, 0.1, sz * 0.28, -sz * s);
    }
  }
  function chairModel(name) {           // Luke's swivel chair: static base + a `seat` child that spins
    const g = part(name, () => {
      for (let i = 0; i < 5; i++) boxR(0.3, 0.03, 0.04, 0x222326, Math.sin(i * 1.2566) * 0.15, 0.06, Math.cos(i * 1.2566) * 0.15, 0, i * 1.2566 + H);
      cyl(0.025, 0.025, 0.36, 6, 0x6d7076, 0, 0.26, 0);
    });
    const seat = part('', () => {
      box(0.48, 0.08, 0.46, 0x23252b, 0, 0.44, 0);
      box(0.46, 0.55, 0.07, 0x23252b, 0, 0.56, -0.23);
      box(0.04, 0.2, 0.3, 0x2c2e33, 0.25, 0.52, -0.02); box(0.04, 0.2, 0.3, 0x2c2e33, -0.25, 0.52, -0.02);
    });
    g.add(seat); g.userData.seat = seat; g.userData.spin = 0;
    return g;
  }
  function straightenerModel(name) {
    return part(name, () => {
      boxR(0.03, 0.022, 0.26, 0x3a2446, 0.018, 0.011, 0, 0, 0, 0.12); boxR(0.03, 0.022, 0.26, 0x3a2446, -0.018, 0.011, 0.01, 0, 0, -0.08);
      box(0.012, 0.004, 0.09, 0xd9d2cf, 0.018, 0.022, 0.07); cyl(0.005, 0.005, 0.3, 4, 0x111111, 0, 0.01, -0.26, H);
    }, null, 0, { floor: false });
  }
  function mug(hex, x, y, z) { cyl(0.04, 0.036, 0.09, 8, hex, x, y + 0.045, z); box(0.012, 0.05, 0.035, hex, x + 0.045, y + 0.02, z); }
  function car(hex, x, z, ry, ute) {   // parked car into the static builder (dark opaque windows)
    at(x, z, ry);
    const glass = 0x2f3b47;
    bb(-0.9, 0.3, -2.3, 0.9, 0.95, 2.3, hex);                                                   // body
    bb(-0.92, 0.22, 2.2, 0.92, 0.55, 2.38, 0x2a2a2a); bb(-0.92, 0.22, -2.38, 0.92, 0.55, -2.2, 0x2a2a2a);   // bumpers
    if (ute) { bb(-0.82, 0.95, 0.2, 0.82, 1.55, 1.2, hex); bb(-0.8, 1.02, 1.2, 0.8, 1.45, 1.22, glass); bb(-0.9, 0.95, -2.3, -0.84, 1.3, 0.1, hex); bb(0.84, 0.95, -2.3, 0.9, 1.3, 0.1, hex); bb(-0.9, 0.95, -2.3, 0.9, 1.3, -2.24, hex); }
    else { bb(-0.78, 0.95, -1.2, 0.78, 1.42, 0.8, hex); bb(-0.8, 1.0, -1.1, 0.8, 1.36, 0.7, glass); boxR(1.5, 0.05, 0.62, glass, 0, 1.2, 1.0, -0.62); boxR(1.5, 0.05, 0.5, glass, 0, 1.18, -1.38, 0.72); }
    bb(-0.7, 0.62, 2.3, -0.4, 0.74, 2.33, 0xfff3c4); bb(0.4, 0.62, 2.3, 0.7, 0.74, 2.33, 0xfff3c4);   // headlights
    bb(-0.8, 0.66, -2.33, -0.5, 0.78, -2.3, 0xc0272d); bb(0.5, 0.66, -2.33, 0.8, 0.78, -2.3, 0xc0272d);
    for (const [wx, wz] of [[-0.82, 1.45], [0.82, 1.45], [-0.82, -1.45], [0.82, -1.45]]) cyl(0.33, 0.33, 0.22, 10, 0x151515, wx, 0.33, wz, 0, H);
    XF = null;
    const c = Math.cos(ry), s = Math.sin(ry), ex = Math.abs(c) * 0.95 + Math.abs(s) * 2.4, ez = Math.abs(s) * 0.95 + Math.abs(c) * 2.4;
    COL.push([x - ex, z - ez, x + ex, z + ez]);
  }
  function palm(x, z, h) {
    for (let i = 0; i < 6; i++) cyl(0.16 - i * 0.012, 0.18 - i * 0.012, h / 6, 6, i % 2 ? 0x8a6b4a : 0x7a5d3f, x + i * 0.04, h / 12 + i * h / 6, z);
    for (let i = 0; i < 7; i++) { const a = i * 0.9; boxR(0.35, 0.04, 2.2, i % 2 ? 0x4f8a3a : 0x5c9a42, x + 0.24 + Math.sin(a) * 1.0, h + 0.05, z + Math.cos(a) * 1.0, 0.45, a); }
  }
  function tree(x, z, s) {
    cyl(0.12 * s, 0.16 * s, 2 * s, 6, 0x7b6a55, x, s, z);
    ico(1.3 * s, 0x6f8f4a, x, 2.6 * s, z, 0.8); ico(0.9 * s, 0x7f9d55, x + 0.7 * s, 2.3 * s, z + 0.3 * s, 0.8); ico(0.9 * s, 0x5f7f40, x - 0.6 * s, 2.9 * s, z - 0.4 * s, 0.8);
  }
  function house(x, z, w, wallc, roofc) {
    bb(x - w / 2, 0, z - 4, x + w / 2, 3.1, z + 4, wallc);
    boxR(w + 0.6, 0.12, 4.9, roofc, x, 4.05, z + 2.15, 0.48); boxR(w + 0.6, 0.12, 4.9, roofc, x, 4.05, z - 2.15, -0.48);
    bb(x - w / 2 + 0.2, 3.1, z - 0.1, x + w / 2 - 0.2, 4.55, z + 0.1, roofc);
    for (const dx of [-w / 4, w / 4]) { bb(x + dx - 0.7, 1.0, z - 4.02, x + dx + 0.7, 2.1, z - 3.98, 0x3d4a57); bb(x + dx - 0.8, 0.95, z - 4.06, x + dx + 0.8, 1.0, z - 3.98, 0xf0f0f0); }
    bb(x - 0.45, 0, z - 4.03, x + 0.45, 2.1, z - 3.99, 0x7b5236);
    for (let i = -w / 2; i <= w / 2; i += 0.5) bb(x + i - 0.04, 0, z - 6.05, x + i + 0.04, 1.1, z - 5.95, 0xf4f1ea);   // picket fence
    bb(x - w / 2, 0.9, z - 6.03, x + w / 2, 0.98, z - 5.97, 0xf4f1ea);
  }

  // ---------------------------------------------------------- build
  function build() {
    COL.length = 0; T = textures();
    const root = new THREE.Group(); R.root = root;
    M = {
      vc: mat(0xffffff),
      glass: mat(0xcfe8f0, { transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
      light: mat(0xffffff, { emissive: 0xe8f1ff, emissiveIntensity: 0.95 }),
      ceil: mat(0xffffff, { emissive: 0x8e949c, emissiveIntensity: 1 }),
      exit: mat(0xffffff, { emissive: 0x22c55e, emissiveIntensity: 0.9 }),
      warm: mat(0xffffff, { emissive: 0xfff2d6, emissiveIntensity: 0.8 }),
      red: mat(0xff2a1a, { emissive: 0xff1a0a, emissiveIntensity: 0.9 }),
      beam: mat(0xff3020, { emissive: 0xff2010, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
      tube: mat(0xffffff, { emissive: 0xeef6ff, emissiveIntensity: 1, key: 'reddy_tube' }),
      flash: mat(0xffffff, { emissive: 0xffffff, side: THREE.DoubleSide }),
      carGlass: mat(0x10161c, { transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
      asphalt: matTex(T.asphalt), floor: matTex(T.floor), slat: matTex(T.slat),
      fascia: matTex(T.fascia, { emissive: 0xffffff, emissiveIntensity: 0.25 }),
      yes: matTex(T.yes), closed: matTex(T.closed, { side: THREE.DoubleSide }), open: matTex(T.open, { side: THREE.DoubleSide }),
      queue: matTex(T.queue, PAPER), targets: matTex(T.targets, PAPER), notice: matTex(T.notice, PAPER), missing: matTex(T.missing, PAPER), cal: matTex(T.cal, PAPER),
      office: matTex(T.office, PAPER), sim: matTex(T.sim, PAPER), clock: matTex(T.clock, PAPER), postit: matTex(T.postit, PAPER), report: matTex(T.report, PAPER),
      atlas: matTex(T.atlas), atlasLit: matTex(T.atlas, { emissive: 0xffffff, emissiveIntensity: 0.7 }), lineup: matTex(T.lineup),
      posters: matTex(T.posters, PAPER), keypad: matTex(T.keypad, PAPER), pudding: matTex(T.pudding),
      mon: matTex(T.mon, { emissive: 0xffffff }), tv: matTex(T.tv, { emissive: 0xffffff, emissiveIntensity: 0.9 }),
      phone: matTex(T.phone, { emissive: 0xffffff }), spin: matTex(T.spin, { emissive: 0xffffff }),
      hween: matTex(T.hween, { transparent: true }),
      shim: matTex(T.shim, { transparent: true, side: THREE.DoubleSide, emissive: 0xffffff, emissiveIntensity: 0.5 }),
      streak: matTex(T.streak, { transparent: true, side: THREE.DoubleSide }),
      scorch: matTex(T.scorch, { transparent: true }),
    };
    b = new Builder(); XF = null;

    // ======================================================== outside (warm)
    tint = OUT;
    quad(80, 23.4, M.asphalt, 0, 0, 14.7, 0, -H);                         // car park z 3..26.4
    quad(80, 8, M.asphalt, 0, 0.004, 31, 0, -H, 0x9a9a9c);                // road z 27..35
    quad(80, 3, M.vc, 0, 0.006, 1.5, 0, -H, 0xdcd3c3);                    // footpath under the awning
    for (let x = -39; x < 40; x += 2.4) bb(x, 0.006, 0, x + 0.03, 0.012, 2.95, 0xb9b1a2);
    bb(-40, 0, 2.95, -3.6, 0.1, 3.1, 0xcfc8ba); bb(-0.4, 0, 2.95, 40, 0.1, 3.1, 0xcfc8ba);
    bb(-3.6, 0, 2.95, -0.4, 0.02, 3.1, 0xf2c230);                         // kerb ramp at the crossing
    bb(-40, 0, 23.5, 40, 0.15, 25.5, 0x86ab55); bb(-40, 0, 23.4, 40, 0.18, 23.55, 0xcfc8ba);   // verge
    quad(80, 1.5, M.vc, 0, 0.16, 26.25, 0, -H, 0xd6cdbd); quad(80, 2.2, M.vc, 0, 0.01, 36.1, 0, -H, 0xd6cdbd);
    quad(80, 6, M.vc, 0, 0.012, 40.2, 0, -H, 0x8fb25d);                   // lawns over the road
    quad(120, 110, M.vc, 0, -0.02, -20, 0, -H, 0xb3ad7a);                 // dry suburb ground all round (crane shots)
    for (const [x, z, sc] of [[-30, -40, 1.6], [-8, -45, 1.3], [12, -38, 1.8], [34, -44, 1.4], [-45, -10, 1.5], [45, -5, 1.7]]) tree(x, z, sc);
    for (const [x, z] of [[-24, -55], [0, -60], [22, -56]]) bb(x - 6, 0, z - 5, x + 6, 4, z + 5, 0xd8d2c4);
    for (let x = -39; x < 40; x += 6) bb(x, 0.006, 30.94, x + 3, 0.014, 31.06, 0xf2f0e6);     // centre line
    // bays: front row nose-in (z 6.5..12), back row (z 18..23.5); walkway x -3.5..-0.5 in front of the doors
    const fr = [-14.3, -11.6, -8.9, -6.2, -3.5, -0.5, 2.2, 4.9, 7.6, 10.3, 13, 15.7];
    for (const x of fr) bb(x - 0.05, 0.006, 6.5, x + 0.05, 0.014, 12, 0xf2f0e6);
    for (let x = -14.45; x < 16; x += 2.7) bb(x - 0.05, 0.006, 18, x + 0.05, 0.014, 23.4, 0xf2f0e6);
    bb(-15.5, 0.006, 11.95, 16, 0.014, 12.05, 0xf2f0e6); bb(-15.5, 0.006, 17.95, 16, 0.014, 18.05, 0xf2f0e6);
    for (const x of [-12.95, -10.25, -7.55, -4.85, 0.85, 3.55, 6.25, 8.95, 11.65]) bb(x - 0.8, 0, 6.6, x + 0.8, 0.12, 6.75, 0xbab4a9);   // wheel stops
    for (const x of [-3.2, -2.4, -1.6, -0.8]) bb(x - 0.2, 0.006, 3.2, x + 0.2, 0.014, 6.4, 0xf4f2ea);                    // zebra
    bb(-3.5, 0.006, 6.5, -3.4, 0.014, 12, 0xf2c230); bb(-0.6, 0.006, 6.5, -0.5, 0.014, 12, 0xf2c230);
    for (let z = 7; z < 12; z += 0.8) boxR(0.07, 0.008, 3.9, 0xf2c230, -2, 0.01, z + 0.4, 0, 0.8);
    for (const x of [-9, -6, 2, 5, 8]) cyl(0.09, 0.09, 0.9, 8, YEL, x, 0.45, 3.35);                                 // bollards
    // edge planters bound the walkable car park
    for (const sx of [-1, 1]) {
      bb(sx * 16.1 - 0.5, 0, 3.4, sx * 16.1 + 0.5, 0.55, 23.4, 0xb4876a);
      for (let z = 4; z < 23.4; z += 1.3) ico(0.55, z % 2.6 < 1.3 ? 0x5f8a3e : 0x6d9a48, sx * 16.1, 0.8, z, 0.8);
      COL.push([sx * 16.1 - 0.5, 3.4, sx * 16.1 + 0.5, 23.4]); COL.push([sx * 16.1 - 0.5, -0.2, sx * 16.1 + 0.5, 3.4]);
      bb(sx * 16.1 - 0.5, 0, 0.3, sx * 16.1 + 0.5, 0.55, 2.8, 0xb4876a); ico(0.5, 0x5f8a3e, sx * 16.1, 0.75, 1.5, 0.8);
    }
    COL.push([-17, 23.4, 17, 24.5]);
    // trolley bay (x 12.9..15.9, z 6.9..11.9) + nested trolleys
    for (const [x0, z0, x1, z1] of [[13, 7, 13.06, 11.8], [15.8, 7, 15.86, 11.8], [13, 7, 15.86, 7.06]]) { bb(x0, 0.95, z0, x1, 1.0, z1, 0xb8bdc2); bb(x0, 0.45, z0, x1, 0.5, z1, 0xb8bdc2); }
    for (const [x, z] of [[13.03, 7.03], [15.83, 7.03], [13.03, 11.8], [15.83, 11.8], [13.03, 9.4], [15.83, 9.4]]) cyl(0.04, 0.04, 1.0, 6, 0xb8bdc2, x, 0.5, z);
    for (let i = 0; i < 5; i++) {
      const z = 7.7 + i * 0.32;
      bb(14.1, 0.35, z, 14.75, 0.95, z + 0.85, 0x9ea4aa); bb(14.13, 0.93, z + 0.03, 14.72, 0.96, z + 0.82, 0x6c7278);
      bb(14.05, 1.0, z + 0.9, 14.8, 1.05, z + 0.96, 0xd32f2f); cyl(0.05, 0.05, 0.03, 6, 0x222, 14.15, 0.07, z + 0.1, 0, H);
    }
    COL.push([12.9, 6.9, 15.9, 11.9]);
    // parked cars (the black car is a prop)
    car(0xf2f2ee, -10.25, 9.3, PI); car(0xa9adb3, 6.25, 9.3, PI); car(0xb3262c, 10.3 + 1.35 - 2.7, 9.3, PI);
    car(0x2f5da8, -13.1, 20.7, 0, true); car(0xe8e6de, 3.1, 20.7, 0); car(0x6a6e75, 8.5, 20.7, 0);
    // light poles, palms, customer parking sign
    for (const x of [-8.3, 6.5]) { cyl(0.08, 0.1, 7, 6, 0x8d9296, x, 3.5, 24.2); bb(x - 0.05, 6.9, 22.9, x + 0.05, 7.0, 24.2, 0x8d9296); bb(x - 0.25, 6.75, 22.6, x + 0.25, 6.95, 23.3, 0x5d6166); COL.push([x - 0.2, 24, x + 0.2, 24.4]); }
    for (const [x, h] of [[-14, 6.5], [-4, 7.5], [9.5, 6.8], [19, 7.2], [-22, 7]]) palm(x, 24.4, h);
    cyl(0.04, 0.04, 2.2, 6, 0x8d9296, 12.2, 1.1, 24.1); label(1.2, 0.15, 7, 12.2, 2.1, 24.16);
    // over the road: houses, trees, power poles, low hills
    const hc = [[0xefe3c8, 0x9a4b32], [0xdfe8ee, 0x5a6470], [0xf3d9c4, 0x8c3f2c], [0xe6e9d8, 0x6b7a86], [0xf5ecd9, 0xa0553a], [0xdbe3d0, 0x535b63]];
    for (let i = 0; i < 9; i++) house(-36 + i * 9, 45, 7.2, hc[i % 6][0], hc[i % 6][1]);
    for (const [x, s] of [[-31, 1.2], [-13.5, 1.5], [4.5, 1.1], [14, 1.6], [31.5, 1.3]]) tree(x, 39.5, s);
    for (let x = -36; x < 40; x += 18) { cyl(0.1, 0.13, 9, 6, 0x6b5a48, x, 4.5, 35.4); bb(x - 0.9, 8.4, 35.35, x + 0.9, 8.5, 35.45, 0x6b5a48); }
    for (const dy of [0, 0.3]) bb(-40, 8.3 - dy, 35.39, 40, 8.33 - dy, 35.41, 0x222222);

    // shopfront + neighbours + awning (the facade is lit by the sun)
    bb(-26, 3.25, -0.3, 26, 3.45, 3.0, 0xc9c4ba, M.ceil); bb(-26, 3.2, 2.95, 26, 3.5, 3.05, 0x2a3350);
    for (const x of [-23, -16.5, -9.5, 4.5, 11.5, 16.5, 23]) { cyl(0.06, 0.06, 3.25, 6, 0x8d9296, x, 1.62, 2.8); COL.push([x - 0.12, 2.68, x + 0.12, 2.92]); }
    for (let x = -24; x < 26; x += 3) bb(x - 0.12, 3.24, 1.4, x + 0.12, 3.25, 1.64, 0xfff6d8, M.warm);   // awning downlights
    bb(-9.25, 3.2, -0.3, 11.25, 5.3, 0.25, 0xe9e2d4);                                                  // store parapet
    bb(-5.1, 3.55, 0.25, 1.1, 5.1, 0.45, NAVY); quad(6, 1.5, M.fascia, -2, 4.32, 0.46);                // the Yes Optus sign
    bb(-9.25, 0, -0.14, -3.1, 0.3, 0.14, 0x2b2f38); bb(-0.9, 0, -0.14, 11.25, 0.3, 0.14, 0x2b2f38);  // bulkheads
    bb(-9.25, 2.6, -0.14, 11.25, 3.2, 0.14, 0x2b2f38);                                                // transom
    for (const x of [-9.15, -6.6, -4.3, -3.15, -0.85, 1.6, 4.1, 6.6, 9.0, 11.15]) bb(x - 0.05, 0.3, -0.08, x + 0.05, 2.6, 0.08, 0xa8adb3);
    quad(6.15, 2.3, M.glass, -6.175, 1.45, 0); quad(12.15, 2.3, M.glass, 5.175, 1.45, 0);
    bb(-9.2, 1.02, -0.01, -3.15, 1.1, 0.01, NAVY); bb(-0.85, 1.02, -0.01, 11.2, 1.1, 0.01, NAVY);     // glass manifestation band
    COL.push([-26, -0.16, 26, 0.16]);   // the whole shopfront line (neighbours too)
    // neighbours: bakery, pharmacy | for lease, a closed shop
    const shop = (x0, x1, wallc, row, glass) => {
      bb(x0, 3.2, -0.3, x1, 4.9, 0.2, wallc); bb(x0, 0, -0.14, x1, 0.4, 0.14, 0x3a3a3a); bb(x0, 2.6, -0.14, x1, 3.2, 0.14, 0x3a3a3a);
      bb(x0 + 0.05, 0.4, -0.05, x1 - 0.05, 2.6, 0.05, glass);
      for (let x = x0 + 0.05; x < x1; x += 2.8) bb(x - 0.05, 0.4, -0.08, x + 0.05, 2.6, 0.08, 0x9aa0a6);
      if (row >= 0) label(4, 0.5, row, (x0 + x1) / 2, 4.1, 0.21); else bb((x0 + x1) / 2 - 2, 3.85, 0.2, (x0 + x1) / 2 + 2, 4.35, 0.23, 0x4a4f57);
    };
    shop(-26, -17.6, 0xd9b48f, 3, 0x2c3a44); shop(-17.6, -9.25, 0xd2d6cf, 4, 0x2c3a44);
    shop(11.25, 18.6, 0xcfc9bd, -1, 0xe8e6df); shop(18.6, 26, 0xc4b59c, -1, 0x2c3a44);
    label(2.4, 0.3, 5, 14.9, 1.6, 0.06);
    bb(-26.2, 0, -31, -26, 5.3, 0, 0xd8cfbf); bb(26, 0, -31, 26.2, 5.3, 0, 0xd8cfbf);
    // outside bits by the door: bin, brochure-free zone
    cyl(0.28, 0.25, 0.9, 10, 0x2e5b3a, 0.6, 0.45, 1.1); cyl(0.3, 0.3, 0.06, 10, 0x223a2a, 0.6, 0.93, 1.1); COL.push([0.3, 0.8, 0.9, 1.4]);
    // roof (own mesh so tools can hide it) + a few AC units
    root.add(part('roof', () => {
      bb(-26, 5.0, -31, 26, 5.12, -0.3, 0xb9b4aa);
      for (const [x, z] of [[-18, -10], [-4, -20], [5, -8], [8, -26], [19, -15]]) { bb(x - 0.8, 5.12, z - 0.6, x + 0.8, 6.0, z + 0.6, 0xd4d6d8); bb(x - 0.5, 6.0, z - 0.5, x + 0.5, 6.05, z + 0.5, 0x5a5e63); }
    }));

    // ======================================================== shop floor (cool fluoro)
    tint = IN;
    quad(20, 14.5, M.floor, 1, 0.01, -7.25, 0, -H);
    quad(20.5, 14.75, M.ceil, 1, 3.2, -7.35, 0, H, 0xd9dcdf);
    const panel = (x, z) => quad(0.6, 1.2, M.light, x, 3.19, z, 0, H);
    for (let z = -2.2; z > -14; z -= 2.4) { panel(-4.4, z); panel(-2, z); panel(0.4, z); panel(-7.2, z); }
    for (let z = -2.2; z > -12; z -= 2.4) { panel(4.3, z); panel(6.4, z); panel(9.2, z); }
    for (const [x, z] of [[-5.6, -3.4], [1.4, -9], [8, -4.6], [-7.6, -12]]) bb(x - 0.3, 3.17, z - 0.3, x + 0.3, 3.2, z + 0.3, 0xcfd3d8);
    cyl(0.12, 0.12, 0.12, 8, 0x2a2d33, 9.8, 3.12, -1.2);                                         // ceiling dome camera
    // walls
    wall(-9.25, -14.75, -9, 0, 3.2, WHITE); wall(11, -17.25, 11.25, 0, 3.2, WHITE);
    wall(-9.25, -14.75, 2.85, -14.5, 3.2, WHITE); wall(2.6, -14.75, 2.85, -12.5, 3.2, WHITE);
    wall(2.6, -12.75, 5.4, -12.5, 3.2, WHITE); wall(7.4, -12.75, 9.4, -12.5, 3.2, WHITE); wall(10.4, -12.75, 11.25, -12.5, 3.2, WHITE);
    bb(5.4, 2.4, -12.75, 7.4, 3.2, -12.5, WHITE); bb(9.4, 2.2, -12.75, 10.4, 3.2, -12.5, WHITE);
    for (const [x0, z0, x1, z1] of [[-8.99, -14.5, -8.95, 0], [10.95, -12.5, 10.99, -0.14], [-9, -14.49, 2.6, -14.45], [2.6, -12.49, 5.4, -12.45], [7.4, -12.49, 9.4, -12.45]]) bb(x0, 0, z0, x1, 0.1, z1, 0x5a5f66);   // skirting
    for (const [x0, x1] of [[5.3, 5.4], [7.4, 7.5], [9.3, 9.4], [10.4, 10.5]]) bb(x0, 0, -12.49, x1, x0 > 9 ? 2.2 : 2.4, -12.45, 0xd5d8dc);   // architraves
    label(1.6, 0.2, 0, 6.4, 2.6, -12.48);                                                                      // STAFF ONLY
    // display wall: navy feature wall, columns, line-up backboard, lit header, ledge (the altar)
    bb(-5.3, 0, -14.5, 1.3, 3.2, -14.47, NAVY);
    bb(-4.9, 0, -14.47, -4.55, 3.2, -14.05, 0xf7f7f7); bb(0.55, 0, -14.47, 0.9, 3.2, -14.05, 0xf7f7f7);
    bb(-4.55, 0.95, -14.47, 0.55, 2.35, -14.37, 0xf6f6f6); quad(5.1, 1.35, M.lineup, -2, 1.67, -14.365);
    bb(-4.55, 2.35, -14.47, 0.55, 2.95, -14.27, NAVY); label(4.8, 0.6, 2, -2, 2.65, -14.265, 0, M.atlasLit);
    bb(-4.56, 0.95, -14.3, -4.54, 2.35, -14.1, 0xffffff, M.light); bb(0.54, 0.95, -14.3, 0.56, 2.35, -14.1, 0xffffff, M.light);
    bb(-4.5, 2.32, -14.34, 0.5, 2.35, -14.26, 0xffffff, M.light);
    bb(-4.2, 0, -14.37, 0.2, 0.95, -13.75, 0xf4f4f4); bb(-4.25, 0.95, -14.4, 0.25, 1.0, -13.7, WOOD);
    bb(-4.2, 0.08, -13.76, 0.2, 0.12, -13.74, YEL);
    COL.push([-4.9, -14.5, 0.9, -13.68]);
    for (let i = 0; i < 4; i++) {
      const x = -3.35 + i * 0.9;
      bb(x - 0.05, 1.0, -14.08, x + 0.05, 1.04, -13.9, 0x3a3d42);                      // stand
      bb(x - 0.045, 1.13, -14.37, x + 0.045, 1.23, -14.33, 0x2a2c30);                           // tether puck on the backboard
      bb(x - 0.07, 1.0, -13.76, x + 0.07, 1.04, -13.72, 0xffffff); bb(x - 0.07, 1.0, -13.755, x + 0.07, 1.012, -13.715, YEL);   // price tag
    }
    bb(0.95, 1.2, -14.5, 1.27, 1.52, -14.46, 0xe9e9e9); bb(1.0, 1.3, -14.47, 1.09, 1.42, -14.44, 0x3a3a3a); bb(1.13, 1.3, -14.47, 1.22, 1.42, -14.44, 0x3a3a3a);   // wall switch
    // display tables either side of the aisle
    for (const [tx, tz] of [[-4.4, -6], [-4.4, -10], [0.4, -6], [0.4, -10]]) {
      bb(tx - 0.5, 0, tz - 1.15, tx + 0.5, 0.85, tz + 1.15, 0xf1f1f1); bb(tx - 0.56, 0.85, tz - 1.2, tx + 0.56, 0.91, tz + 1.2, WOOD);
      bb(tx - 0.5, 0, tz - 1.15, tx + 0.5, 0.08, tz + 1.15, 0x4a4e55);
      for (let k = 0; k < 4; k++) {
        const z = tz - 0.9 + k * 0.6, c = [0x1f2a44, 0xc9ccd1, 0x111111, 0xe9e2d4][(k + (tx > 0 ? 1 : 0)) % 4];
        bb(tx - 0.06, 0.91, z - 0.06, tx + 0.06, 0.95, z + 0.06, 0x3a3d42);
        boxR(0.09, 0.17, 0.012, c, tx + 0.02 * Math.sign(tx), 1.03, z, -0.3, tx > -2 ? -H : H);
        boxR(0.08, 0.15, 0.004, 0x0d1016, tx + (tx > -2 ? -0.005 : 0.005) + 0.02 * Math.sign(tx), 1.035, z, -0.3, tx > -2 ? -H : H);
      }
      boxR(0.16, 0.1, 0.004, 0xffffff, tx, 0.95, tz + 1.05, 0.5, tx > -2 ? -H : H);            // tent card
      COL.push([tx - 0.6, tz - 1.25, tx + 0.6, tz + 1.25]);
    }
    // accessories wall (left wall): slatwall + rows of hanging packs + low cabinet + a spinner tower
    quad(10.4, 2.1, M.slat, -8.94, 1.4, -7.8, H);
    bb(-9, 2.45, -13, -8.9, 2.75, -2.6, NAVY); bb(-8.9, 2.45, -13, -8.89, 2.49, -2.6, YEL);
    seed = 41;
    const cases = [0x111111, 0x2a3a6a, 0xd93b5b, 0xf2f2f2, 0x6fb1e8, 0xf4c542, 0x3c8d5a, 0x8a5bd6, 0xe98a3c, 0xc9c9c9];
    for (let z = -12.7; z < -2.8; z += 0.34) for (let r = 0; r < 4; r++) {
      if (rnd() < 0.12) continue;
      const y = 0.75 + r * 0.42, c = cases[Math.floor(rnd() * cases.length)];
      bb(-8.94, y + 0.2, z - 0.005, -8.86, y + 0.21, z + 0.005, 0x777777);
      bb(-8.9, y - 0.02, z - 0.09, -8.86, y + 0.2, z + 0.09, 0xf5f5f5); bb(-8.905, y + 0.01, z - 0.07, -8.855, y + 0.15, z + 0.07, c);
    }
    bb(-9, 0, -13, -8.55, 0.5, -2.6, 0xe6e7e9); bb(-8.56, 0.1, -13, -8.55, 0.48, -2.6, 0xd0d3d7);
    for (let z = -12.6; z < -3; z += 0.7) bb(-8.8, 0.5, z, -8.6, 0.62, z + 0.3, [0x222222, 0xf5f5f5, 0x2a3a6a][Math.floor(rnd() * 3)]);
    COL.push([-9, -13, -8.55, -2.6]);
    cyl(0.25, 0.3, 0.08, 10, 0x3a3d42, -6.8, 0.04, -8.8); cyl(0.04, 0.04, 1.8, 6, 0x9aa0a6, -6.8, 0.9, -8.8);
    for (let k = 0; k < 8; k++) { const a = k * PI / 4; for (let r = 0; r < 3; r++) boxR(0.13, 0.19, 0.03, cases[(k + r * 3) % 10], -6.8 + Math.sin(a) * 0.2, 0.75 + r * 0.38, -8.8 + Math.cos(a) * 0.2, 0, a); }
    COL.push([-7.15, -9.15, -6.45, -8.45]);
    // right wall: posters, SIM starter-pack rack, noticeboard (staff side)
    const poster = (z, u0) => { const g = new THREE.PlaneGeometry(0.9, 1.35), uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setX(i, uv.getX(i) > 0.5 ? u0 + 0.5 : u0); g.rotateY(-H); g.translate(10.97, 1.65, z); put(g, 0xffffff, M.posters); };
    poster(-2.4, 0); poster(-7.6, 0.5);
    bb(10.9, 0.35, -6.35, 11, 2.15, -5.45, 0x9aa0a6); quad(0.8, 1.6, M.sim, 10.89, 1.25, -5.9, -H);
    for (let r = 0; r < 6; r++) for (let k = 0; k < 3; k++) bb(10.8, 1.97 - r * 0.225, -6.16 + k * 0.25, 10.89, 1.98 - r * 0.225, -6.15 + k * 0.25, 0x9aa0a6);
    bb(10.95, 1.05, -12.25, 11, 2.0, -10.95, 0x6b4a2a); quad(1.25, 0.9375, M.notice, 10.945, 1.525, -11.6, -H);
    bb(10.97, 1.83, -10.37, 11, 1.85, -10.33, 0x888888);                                                    // calendar nail
    // queue-ticket machine by the entrance, NOW SERVING sign over the counter
    cyl(0.18, 0.2, 0.05, 10, 0x3a3d42, 0.8, 0.025, -1.9); cyl(0.05, 0.05, 1.0, 6, 0x9aa0a6, 0.8, 0.55, -1.9);
    bb(0.66, 1.0, -2.08, 0.94, 1.45, -1.72, 0xe9ebee); quad(0.34, 0.34, M.queue, 0.655, 1.24, -1.9, -H); bb(0.62, 1.15, -1.95, 0.66, 1.17, -1.85, 0xf5f5f5);
    COL.push([0.55, -2.15, 1.05, -1.65]);
    bb(4.5, 2.62, -8.4, 6.2, 2.86, -8.3, 0x0a0a0a); label(1.6, 0.2, 6, 5.35, 2.74, -8.295, 0, M.atlasLit);
    bb(4.7, 2.86, -8.36, 4.72, 3.2, -8.34, 0x888888); bb(5.98, 2.86, -8.36, 6.0, 3.2, -8.34, 0x888888);
    // keypad column left of the doors, spinner panel right of them, door mat, brochure stand
    bb(-4.6, 0, -0.35, -4.2, 3.2, 0, WHITE); COL.push([-4.6, -0.35, -4.2, 0]);
    bb(-4.52, 1.28, -0.39, -4.28, 1.62, -0.35, 0xd8dade); quad(0.18, 0.27, M.keypad, -4.4, 1.45, -0.395, PI);
    bb(-2.15, 2.7, -0.17, -1.85, 3.0, -0.14, 0x2a2d33);
    bb(-3.1, 0, -1.9, -0.9, 0.015, -0.3, 0x2d2f33);
    boxR(0.04, 1.4, 0.5, 0xdcdfe3, -5.9, 0.7, -1.4, 0, 0, -0.12); bb(-6.1, 0, -1.7, -5.7, 0.04, -1.1, 0x3a3d42);
    for (let r = 0; r < 3; r++) for (let k = 0; k < 2; k++) { boxR(0.03, 0.08, 0.22, 0xc9ccd1, -5.82 + r * 0.05, 0.42 + r * 0.38, -1.53 + k * 0.26, 0, 0, -0.12); boxR(0.02, 0.28, 0.2, [YEL, 0xffffff, 0x2f6fd6][(r + k) % 3], -5.84 + r * 0.05, 0.56 + r * 0.38, -1.53 + k * 0.26, 0, 0, -0.3); }
    COL.push([-6.15, -1.75, -5.65, -1.05]);
    // plastic pot plant (dying), front-right corner
    cyl(0.26, 0.2, 0.5, 10, 0xf2f2f2, 10.3, 0.25, -0.85); cyl(0.22, 0.22, 0.02, 10, 0x4a3a2a, 10.3, 0.49, -0.85);
    for (let k = 0; k < 9; k++) { const a = k * 0.7, r = 0.18 + (k % 3) * 0.08; boxR(0.12, 0.02, 0.5, [0x5f8a3e, 0x7d9a44, 0xb59a4a, 0x8a7a3a][k % 4], 10.3 + Math.sin(a) * r, 0.75 + (k % 3) * 0.28, -0.85 + Math.cos(a) * r, k % 4 === 2 ? 0.9 : 0.3, a); }
    cyl(0.02, 0.02, 1.2, 5, 0x6b5a3a, 10.3, 1.0, -0.85);
    COL.push([9.95, -1.2, 10.65, -0.5]);
    // counter: navy front, white top, yellow strip; monitors, keyboards, till, EFTPOS, store phone base, stools
    bb(3.25, 0, -9.35, 7.75, 0.95, -8.65, 0x20294a); bb(3.15, 0.95, -9.45, 7.85, 1.0, -8.55, 0xf4f4f2);
    bb(3.25, 0.7, -8.66, 7.75, 0.78, -8.64, YEL); bb(3.25, 0, -8.67, 7.75, 0.1, -8.64, 0x0e1428);
    for (let x = 3.6; x < 7.6; x += 0.8) bb(x, 0.5, -9.37, x + 0.6, 0.9, -9.35, 0x2a3358);
    COL.push([3.15, -9.45, 7.85, -8.55]);
    for (const x of [4.3, 6.4]) {
      bb(x - 0.11, 1.0, -9.12, x + 0.11, 1.015, -8.95, 0x2a2c30); bb(x - 0.025, 1.0, -9.0, x + 0.025, 1.14, -8.96, 0x2a2c30);
      bb(x - 0.28, 1.12, -9.02, x + 0.28, 1.48, -8.97, DARK);
      bb(x - 0.22, 1.0, -9.34, x + 0.22, 1.02, -9.2, 0x2b2d31); bb(x + 0.27, 1.0, -9.3, x + 0.33, 1.02, -9.22, 0x2b2d31);
    }
    bb(7.1, 1.0, -9.4, 7.65, 1.1, -8.9, 0x3a3d42); bb(7.3, 1.1, -9.15, 7.34, 1.25, -9.1, 0x2a2c30); boxR(0.26, 0.18, 0.02, 0x111317, 7.32, 1.32, -9.12, -0.2);
    bb(6.95, 1.0, -9.42, 7.05, 1.1, -9.3, 0xf2f2f2);
    boxR(0.08, 0.02, 0.14, 0x1b1d21, 5.35, 1.03, -8.78, 0.3);                          // EFTPOS
    cyl(0.04, 0.04, 0.1, 8, 0x2a2c30, 3.7, 1.05, -9.25); for (let i = 0; i < 3; i++) cyl(0.004, 0.004, 0.14, 4, [0x2f6fd6, 0xd32f2f, 0x111111][i], 3.69 + i * 0.01, 1.1, -9.25);
    for (let i = 0; i < 5; i++) boxR(0.15, 0.004, 0.21, i % 2 ? YEL : 0xffffff, 3.45, 1.003 + i * 0.004, -8.8, 0, i * 0.05);
    bb(7.4, 1.0, -9.28, 7.65, 1.05, -9.05, 0x2a2c30);                                  // store phone base
    for (const x of [3.45, 7.25]) { cyl(0.19, 0.19, 0.06, 10, 0x1d1f24, x, 0.72, -7.95); cyl(0.03, 0.03, 0.7, 6, 0x9aa0a6, x, 0.36, -7.95); cyl(0.2, 0.2, 0.03, 10, 0x3a3d42, x, 0.015, -7.95); COL.push([x - 0.2, -8.15, x + 0.2, -7.75]); }
    bb(4.5, 0, -10.9, 5.0, 0.45, -10.5, 0x3a3d42);                                     // printer under the staff side
    // big "Yes" wall graphic behind the counter, targets board, office door frame
    bb(2.75, 0.9, -12.5, 5.35, 3.0, -12.47, NAVY); quad(2.5, 1.875, M.yes, 4.05, 1.95, -12.465);
    bb(7.58, 1.02, -12.5, 9.22, 2.28, -12.47, 0xcfd2d6); quad(1.52, 1.14, M.targets, 8.4, 1.65, -12.465);

    // ======================================================== back of house
    tint = BOH;
    // corridor x 5.4..7.4, z -23.75..-12.75
    quad(2, 11, M.vc, 6.4, 0.01, -18.25, 0, -H, 0x9ca1a6); quad(2, 11, M.ceil, 6.4, 2.7, -18.25, 0, H, 0xd9dcdf);
    wall(5.15, -23.75, 5.4, -12.75, 2.7, 0xe3e6e2); wall(7.4, -23.75, 7.65, -12.75, 2.7, 0xe3e6e2);
    bb(5.4, 0, -23.75, 5.44, 0.1, -12.75, 0x6b7077); bb(7.36, 0, -23.75, 7.4, 0.1, -12.75, 0x6b7077);
    for (const z of [-14.4, -17.0, -19.6, -22.2]) { bb(6.2, 2.62, z - 0.65, 6.6, 2.7, z + 0.65, 0xd9dcdf); bb(6.28, 2.6, z - 0.6, 6.52, 2.62, z + 0.6, 0xffffff, M.light); }
    // stock boxes by the backroom door (Rue's seat in 3.7) + a taller stack
    bb(5.42, 0, -23.2, 6.02, 0.24, -21.8, CARD); bb(5.44, 0.24, -23.15, 6.0, 0.48, -21.85, 0xc49a62); bb(5.44, 0.475, -22.7, 6.0, 0.482, -22.3, 0xe8dcc0);
    bb(6.82, 0, -23.7, 7.38, 0.4, -23.05, CARD); bb(6.85, 0.4, -23.65, 7.35, 0.8, -23.1, 0xc49a62); bb(6.87, 0.8, -23.6, 7.33, 1.15, -23.15, CARD);
    COL.push([5.4, -23.2, 6.05, -21.8]); COL.push([6.8, -23.75, 7.4, -23.0]);
    cyl(0.08, 0.08, 0.5, 8, 0xc62828, 7.28, 0.6, -15.4); bb(7.36, 1.0, -15.55, 7.4, 1.3, -15.25, 0xc62828);   // extinguisher
    bb(5.4, 1.4, -17.2, 5.47, 1.7, -16.8, 0xf5f5f5); bb(5.465, 1.5, -17.03, 5.475, 1.6, -16.97, 0x2e9d4a); bb(5.465, 1.53, -17.07, 5.475, 1.57, -16.93, 0x2e9d4a);
    cyl(0.18, 0.16, 0.3, 8, YEL, 7.05, 0.15, -19.8); COL.push([6.85, -20.0, 7.25, -19.6]);                // mop bucket
    bb(6.15, 2.22, -23.74, 6.65, 2.38, -23.66, 0x2e9d4a, M.exit);                                          // exit sign over the door
    { const g = new THREE.PlaneGeometry(0.7, 1.05), uv = g.attributes.uv; for (let i = 0; i < 4; i++) uv.setX(i, uv.getX(i) > 0.5 ? 1 : 0.5); g.rotateY(-H); g.translate(7.39, 1.5, -17.8); put(g, 0xffffff, M.posters); }
    // backroom front wall with the door opening; spinner panel on the corridor side
    wall(2.15, -24, 5.95, -23.75, 2.8, 0xd4dbd2); wall(6.85, -24, 10.65, -23.75, 2.8, 0xd4dbd2); bb(5.95, 2.1, -24, 6.85, 2.8, -23.75, 0xd4dbd2);
    COL.push([5.95, -24, 6.85, -23.75]);
    for (const [x0, x1] of [[5.85, 5.95], [6.85, 6.95]]) bb(x0, 0, -23.74, x1, 2.15, -23.7, 0xb7c0c8);
    bb(5.85, 2.1, -23.74, 6.95, 2.2, -23.7, 0xb7c0c8);
    bb(7.02, 1.3, -23.75, 7.28, 1.6, -23.71, 0x2a2d33);
    // backroom x 2.4..10.4, z -30..-24
    quad(8, 6, M.vc, 6.4, 0.01, -27, 0, -H, 0x8e9398); quad(8, 6, M.ceil, 6.4, 2.8, -27, 0, H, 0xcfd0ca);
    for (let x = 3.6; x < 10.4; x += 1.2) bb(x - 0.01, 2.78, -30, x + 0.01, 2.8, -24, 0xb9bab4);
    for (let z = -28.8; z < -24; z += 1.2) bb(2.4, 2.78, z - 0.01, 10.4, 2.8, z + 0.01, 0xb9bab4);
    wall(2.15, -30.25, 10.65, -30, 2.8, 0xcfd6cc); wall(2.15, -30, 2.4, -24, 2.8, 0xcfd6cc); wall(10.4, -30, 10.65, -24, 2.8, 0xcfd6cc);
    bb(2.4, 0, -30, 10.4, 0.1, -29.96, 0x6b7077); bb(2.4, 0, -30, 2.44, 0.1, -24, 0x6b7077); bb(10.36, 0, -30, 10.4, 0.1, -24, 0x6b7077);
    bb(4.1, 2.7, -29.5, 4.7, 2.78, -28.2, 0xd9dcdf); bb(4.2, 2.68, -29.45, 4.6, 2.7, -28.25, 0xffffff, M.light);   // steady batten over the bench
    bb(6.4, 2.72, -27.6, 6.8, 2.8, -26.0, 0xd9dcdf);                                   // housing of the flickering tube (prop)
    // repair bench along the back wall: pegboard, soldering station + iron, goggles, lamp, trays, meter, a phone in bits
    bb(2.9, 0.88, -30, 5.9, 0.93, -29.2, 0xa98b62); for (const x of [2.95, 5.8]) bb(x, 0, -29.95, x + 0.06, 0.88, -29.25, 0x55595f);
    bb(2.95, 0.25, -29.95, 5.85, 0.28, -29.25, 0x8a7050);
    quad(2.0, 0.5, M.vc, 4.4, 0.935, -29.55, 0, -H, 0x2f7a5a);
    bb(3.0, 1.1, -30, 5.8, 2.1, -29.97, 0xc9b28a);
    for (let x = 3.2; x < 5.7; x += 0.28) boxR(0.03, 0.22, 0.02, [0xd32f2f, 0x2a2c30, 0xf2c230][Math.floor(x * 7) % 3], x, 1.7 + Math.sin(x * 9) * 0.15, -29.94, 0, 0, 0.2);
    bb(3.4, 0.93, -29.85, 3.72, 1.03, -29.55, 0x3a3d42); cyl(0.02, 0.02, 0.02, 8, 0xd32f2f, 3.56, 1.0, -29.54, H);
    boxR(0.018, 0.018, 0.24, 0x2a2c30, 3.85, 1.03, -29.6, 0.6, 0.4); cyl(0.004, 0.004, 0.06, 4, 0xc0c0c0, 3.9, 0.98, -29.5, 0.6);
    for (let i = 0; i < 4; i++) bb(4.9 + (i % 2) * 0.2, 0.93, -29.9 + Math.floor(i / 2) * 0.2, 5.08 + (i % 2) * 0.2, 0.97, -29.72 + Math.floor(i / 2) * 0.2, [0xd32f2f, 0x2f6fd6, 0xf2c230, 0x2e9d4a][i]);
    bb(5.3, 0.93, -29.5, 5.42, 0.97, -29.3, 0xf2c230); bb(4.1, 0.93, -29.45, 4.2, 0.945, -29.25, 0x111111); bb(4.23, 0.93, -29.45, 4.33, 0.945, -29.25, 0x6a6e75);
    cyl(0.03, 0.05, 0.03, 8, 0x3a3d42, 5.65, 0.945, -29.8); boxR(0.02, 0.5, 0.02, 0x3a3d42, 5.6, 1.18, -29.75, 0, 0, 0.4); cyl(0.08, 0.08, 0.03, 10, 0xe9e9e9, 5.48, 1.42, -29.72, 0, 0.9);
    COL.push([2.9, -30, 5.9, -29.2]);
    // goggles on the bench
    cyl(0.03, 0.03, 0.03, 8, 0x9fd8e8, 4.55, 0.955, -29.45, H); cyl(0.03, 0.03, 0.03, 8, 0x9fd8e8, 4.62, 0.955, -29.45, H); bb(4.47, 0.945, -29.47, 4.7, 0.96, -29.44, 0x2a2c30);
    cyl(0.18, 0.18, 0.05, 10, 0x1d1f24, 5.3, 0.65, -28.75); cyl(0.03, 0.03, 0.62, 6, 0x9aa0a6, 5.3, 0.31, -28.75); COL.push([5.1, -28.95, 5.5, -28.55]);   // stool
    // shelving on the back wall (Chase leans on it in 1.1) + wall clock above
    for (const x of [6.35, 8.5]) bb(x, 0, -30, x + 0.05, 1.9, -29.5, 0x7f858c);
    for (let s = 0; s < 4; s++) {
      const y = 0.12 + s * 0.55; bb(6.35, y, -30, 8.55, y + 0.03, -29.5, 0x9aa0a6);
      if (s < 3) for (let k = 0; k < 4; k++) { const w = 0.35 + ((k + s) % 3) * 0.08; bb(6.45 + k * 0.52, y + 0.03, -29.95, 6.45 + k * 0.52 + w, y + 0.03 + 0.2 + ((k * 3 + s) % 4) * 0.06, -29.55, (k + s) % 3 ? CARD : 0xf2f2f2); }
    }
    COL.push([6.35, -30, 8.55, -29.45]);
    quad(0.34, 0.34, M.clock, 7.45, 2.3, -29.965); cyl(0.19, 0.19, 0.04, 16, 0x2a2c30, 7.45, 2.3, -29.99, H);
    // kitchenette on the right wall: cabinet, benchtop, sink, microwave, mug tree, canisters, cupboard
    bb(9.8, 0, -29.95, 10.4, 0.88, -27.9, 0xd8d8d0); bb(9.75, 0.88, -29.98, 10.4, 0.92, -27.87, 0x6f6a64);
    bb(9.9, 0.9, -29.88, 10.3, 0.925, -29.48, 0x9aa0a6); cyl(0.015, 0.015, 0.25, 6, 0xc0c0c0, 10.3, 1.05, -29.68); bb(10.18, 1.16, -29.7, 10.32, 1.18, -29.66, 0xc0c0c0);
    bb(9.9, 0.92, -29.38, 10.38, 1.2, -28.93, 0xf0f0f0); bb(9.88, 0.97, -29.36, 9.9, 1.15, -29.05, 0x222222);
    cyl(0.01, 0.01, 0.28, 4, 0x6b5a3a, 10.15, 1.06, -28.1); mug(0xd32f2f, 10.08, 0.92, -28.18); mug(0x2f6fd6, 10.22, 0.92, -28.02); mug(0xffffff, 10.25, 0.92, -28.25);
    cyl(0.05, 0.05, 0.14, 8, 0x2a2c30, 9.95, 0.99, -28.05); cyl(0.05, 0.05, 0.12, 8, 0xc0c0c0, 9.95, 0.98, -28.2);
    bb(9.95, 1.55, -29.95, 10.4, 2.15, -27.9, 0xe2e2da); bb(9.94, 1.84, -29.9, 9.95, 1.86, -28.0, 0xb0b0a8);
    COL.push([9.75, -30, 10.4, -27.85]);
    // TV bracket on the right wall
    bb(10.3, 1.6, -26.3, 10.4, 1.7, -26.1, 0x3a3d42); bb(9.93, 1.63, -26.43, 10.37, 2.0, -25.97, 0x3b3a38); bb(9.92, 1.64, -26.36, 9.93, 1.98, -26.04, 0x2a2928);
    bb(9.94, 1.66, -26.18, 9.95, 1.68, -26.15, 0xd32f2f);
    // left wall shelving with stock, a stack of boxes by the door, hooks + a hi-vis vest
    for (const z of [-28.6, -25.35]) bb(2.4, 0, z - 0.05, 2.95, 2.0, z, 0x7f858c);
    for (let s = 0; s < 4; s++) {
      const y = 0.12 + s * 0.6; bb(2.4, y, -28.65, 2.95, y + 0.03, -25.35, 0x9aa0a6);
      for (let k = 0; k < 5; k++) bb(2.45, y + 0.03, -28.55 + k * 0.66, 2.9, y + 0.03 + 0.25 + ((k + s) % 3) * 0.07, -28.0 + k * 0.66, (k + s) % 4 ? CARD : 0xe9e9e9);
    }
    COL.push([2.4, -28.7, 2.95, -25.3]);
    bb(2.45, 0, -25.15, 3.2, 0.5, -24.1, CARD); bb(2.5, 0.5, -25.1, 3.15, 0.9, -24.15, 0xc49a62); bb(3.3, 0, -24.9, 3.8, 0.4, -24.25, CARD); COL.push([2.4, -25.2, 3.85, -24.0]);
    for (const x of [4.7, 5.0, 5.3]) bb(x, 1.6, -24.03, x + 0.03, 1.66, -23.98, 0x888888);
    boxR(0.36, 0.55, 0.05, 0xff8c1a, 5.0, 1.33, -24.05); bb(4.84, 1.2, -24.09, 5.16, 1.24, -24.07, 0xd8d8d8);
    // lost property box by the door (Chase: "A hair straightener, one thong, and a Nokia from 2004.")
    bb(9.3, 0, -24.9, 10.05, 0.42, -24.15, CARD); label(0.7, 0.0875, 1, 9.295, 0.3, -24.525, -H);
    bb(9.4, 0.42, -24.8, 9.95, 0.44, -24.25, 0x8a7050);
    boxR(0.24, 0.02, 0.1, 0x2f6fd6, 9.55, 0.46, -24.4, 0.1, 0.4); bb(9.75, 0.42, -24.7, 9.8, 0.55, -24.63, 0x7a7e84); ico(0.14, 0x6a4a7a, 9.8, 0.45, -24.35, 0.5);
    COL.push([9.25, -24.95, 10.1, -24.1]);
    // Luke's office x 7.65..11, z -17..-12.75: carpet, desk, filing cabinet, whiteboard, bookshelf, light
    quad(3.35, 4.25, M.vc, 9.325, 0.012, -14.875, 0, -H, 0x566173); quad(3.35, 4.25, M.ceil, 9.325, 2.7, -14.875, 0, H, 0xd9dcdf);
    wall(7.4, -17.25, 11.25, -17, 2.7, 0xe4e0d6); bb(9.0, 2.68, -15.6, 9.8, 2.7, -14.4, 0xffffff, M.light);
    bb(8.7, 0.72, -15.9, 10.1, 0.77, -15.1, 0x8a6a4a); bb(8.75, 0, -15.85, 8.81, 0.72, -15.15, 0x6a5038); bb(10.0, 0, -15.85, 10.06, 0.72, -15.15, 0x6a5038);
    bb(8.81, 0.2, -15.85, 10.0, 0.7, -15.8, 0x6a5038);
    bb(9.0, 0.77, -15.7, 9.5, 1.12, -15.66, DARK); bb(9.2, 0.77, -15.68, 9.3, 0.9, -15.6, DARK); bb(9.02, 0.79, -15.69, 9.48, 1.1, -15.655, 0x223a66);
    bb(8.9, 0.77, -15.45, 9.4, 0.79, -15.3, 0x2b2d31); mug(0xf4f4f0, 9.8, 0.77, -15.35);
    for (let i = 0; i < 3; i++) boxR(0.21, 0.01, 0.3, 0xf8f8f8, 8.95, 0.775 + i * 0.01, -15.5, 0, i * 0.12);
    COL.push([8.7, -15.9, 10.1, -15.1]);
    bb(7.68, 0, -13.45, 8.28, 1.3, -12.8, 0x9aa0a6); for (let i = 0; i < 4; i++) bb(8.28, 0.12 + i * 0.3, -13.35, 8.3, 0.36 + i * 0.3, -12.9, 0xb0b5ba);
    COL.push([7.65, -13.5, 8.3, -12.75]);
    bb(7.65, 1.1, -16.2, 7.7, 2.0, -14.6, 0xf5f5f5); for (let i = 0; i < 5; i++) bb(7.7, 1.8 - i * 0.14, -16.0, 7.71, 1.82 - i * 0.14, -15.0 + (i % 2) * 0.3, 0x2f6fd6);
    bb(10.95, 0, -16.9, 11, 1.8, -15.9, 0x6a5038); bb(10.62, 0, -16.9, 11, 1.8, -16.86, 0x8a6a4a); bb(10.62, 0, -15.94, 11, 1.8, -15.9, 0x8a6a4a);
    for (let s = 0; s < 4; s++) bb(10.62, 0.05 + s * 0.55, -16.86, 11, 0.08 + s * 0.55, -15.94, 0x8a6a4a);
    for (let s = 0; s < 3; s++) for (let k = 0; k < 7; k++) bb(10.7, 0.08 + s * 0.55, -16.82 + k * 0.12, 10.93, 0.38 + s * 0.55 - (k % 3) * 0.04, -16.72 + k * 0.12, [0x2f6fd6, 0xd32f2f, 0x141d3a, YEL, 0xf2f2f2][(k + s) % 5]);
    bb(8.2, 1.4, -16.99, 8.9, 1.9, -16.97, 0x8a6a4a); bb(8.25, 1.45, -16.97, 8.85, 1.85, -16.96, 0xf4efe0); bb(8.4, 1.6, -16.96, 8.7, 1.7, -16.955, YEL);   // framed 'store of the month'
    COL.push([10.6, -16.95, 11, -15.85]);

    root.add(b.done());

    // ======================================================== props (dynamic, named)
    tint = IN;
    const P = (g) => (root.add(g), g);
    // front doors: glass leaves in an aluminium frame; the door sign hangs on the right leaf
    R.doorL = P(part('door_l', () => { quad(1.02, 2.4, M.glass, 0, 1.3, 0); bb(-0.55, 0.05, -0.03, 0.55, 0.12, 0.03, 0xa8adb3); bb(-0.55, 2.5, -0.03, 0.55, 2.56, 0.03, 0xa8adb3); bb(0.49, 0.05, -0.03, 0.55, 2.56, 0.03, 0xa8adb3); bb(-0.55, 0.05, -0.03, -0.49, 2.56, 0.03, 0xa8adb3); }, [-2.55, 0, -0.16]));
    R.doorR = P(part('door_r', () => { quad(1.02, 2.4, M.glass, 0, 1.3, 0); bb(-0.55, 0.05, -0.03, 0.55, 0.12, 0.03, 0xa8adb3); bb(-0.55, 2.5, -0.03, 0.55, 2.56, 0.03, 0xa8adb3); bb(0.49, 0.05, -0.03, 0.55, 2.56, 0.03, 0xa8adb3); bb(-0.55, 0.05, -0.03, -0.49, 2.56, 0.03, 0xa8adb3); }, [-1.45, 0, -0.16]));
    R.sign = part('door_sign', () => { bb(-0.005, 0.33, -0.004, 0.005, 0.5, 0.004, 0x333333); }, [0, 1.25, 0]);
    R.signC = part('', () => { quad(0.34, 0.17, M.closed, 0, 0.25, 0.006); quad(0.34, 0.17, M.closed, 0, 0.25, -0.006, PI); });
    R.signO = part('', () => { quad(0.34, 0.17, M.open, 0, 0.25, 0.006); quad(0.34, 0.17, M.open, 0, 0.25, -0.006, PI); });
    R.sign.add(R.signC, R.signO); R.doorR.add(R.sign);
    R.sign.userData.set = (open) => { R.signOpen = !!open; R.signO.visible = !!open; R.signC.visible = !open; R.sign.rotation.y = 0; R.flipT = 1; };
    R.sign.userData.flip = () => { R.flipT = 0; R.flipTo = !R.signOpen; };
    R.sign.userData.set(false);
    R.doorT = 0; R.flipT = 1;
    // display phones, their tethers, the lit screens (wall_screens), the alarm beacon
    R.phones = []; R.tethers = []; R.scr = [];
    R.screens = P(new THREE.Group()); R.screens.name = 'wall_screens';
    R.screens.add(part('', () => { bb(-4.2, 0.93, -13.7, 0.2, 0.95, -13.68, 0xffffff, M.light); }));
    for (let i = 0; i < 4; i++) {
      const x = -3.35 + i * 0.9;
      const ph = P(part('display_phone_' + (i + 1), () => phoneModel(i), [x, 1.035, -13.99], 0, { floor: false }));
      ph.rotation.x = -0.21; ph.scale.setScalar(1.25); R.phones.push(ph);
      const tt = P(part('tether_' + (i + 1), () => {
        seg(0, 0, -0.12, 0.1, 0.02, 0x1b1c20); seg(-0.12, 0.1, -0.135, 0.33, 0.02, 0x1b1c20);
        box(0.036, 0.024, 0.05, 0x3a3d42, 0, -0.15, 0.32);
      }, [x, 1.18, -14.33], 0, { floor: false }));
      R.tethers.push(tt);
      const s = part('', () => quad(0.1, 0.19, M.phone, 0, 0.107, 0.011), [x, 1.035, -13.99], 0, { floor: false });
      s.rotation.x = -0.21; s.scale.setScalar(1.25); R.screens.add(s); R.scr.push(s);
    }
    R.alarm = P(part('alarm_light', () => {
      cyl(0.1, 0.12, 0.05, 10, 0x2a2c30, 0, 0.025, 0); ico(0.09, 0xff2a1a, 0, 0.1, 0, 1.1, M.red);
      quad(0.9, 0.12, M.beam, 0.45, 0.1, 0, 0, H); quad(0.9, 0.12, M.beam, -0.45, 0.1, 0, 0, H);
    }, [-2, 2.95, -14.37], 0, { floor: false }));
    R.report = P(part('incident_report', () => { quad(0.32, 0.4, M.report, 0, 0, 0); }, [-2, 1.72, -14.36], 0, { floor: false }));
    // monitor screens (both counter monitors share one canvas) + Post-it + store phone handset
    R.mon = P(part('monitor_screen', () => { for (const x of [4.3, 6.4]) quad(0.52, 0.325, M.mon, x, 1.3, -9.025, PI); }, null, 0, { floor: false }));
    R.mon.userData.show = (mode) => { paintMonitor(T.mon.image.getContext('2d'), 256, 160, mode); T.mon.needsUpdate = true; R.monMode = mode; };
    R.postit = P(part('postit', () => quad(0.075, 0.075, M.postit, 0, 0, 0, PI), [6.63, 1.42, -9.035], 0, { floor: false }));
    R.postit.rotation.z = 0.12;
    R.phoneH = P(part('store_phone', () => { box(0.06, 0.04, 0.2, 0x2a2c30, 0, 0, 0); }, [7.52, 1.05, -9.16], 0, { floor: false }));
    R.mphone = P(part('margaret_phone', () => { box(0.075, 0.009, 0.15, 0x1a1a1a, 0, 0, 0); quad(0.068, 0.14, M.vc, 0, 0.0095, 0, 0, -H, 0x050608); }, [4.25, 1.0, -8.78], 0.2, { floor: false }));
    R.parcel = P(part('parcel', () => { box(0.34, 0.14, 0.26, CARD, 0, 0, 0); bb(-0.17, 0.139, -0.03, 0.17, 0.142, 0.03, 0xd8c79a); quad(0.12, 0.08, M.vc, 0.08, 0.1, 0.131, 0, 0, 0xffffff); }, [5.35, 1.0, -9.05], 0.15, { floor: false }));
    // calendar (repaint with userData.set), missing poster, office door, halloween
    R.cal = P(part('calendar', () => quad(0.4, 0.5, M.cal, 0, 0, 0, -H), [10.965, 1.55, -10.35], 0, { floor: false }));
    R.cal.userData.set = (day, mon, wd) => { paintCal(T.cal.image.getContext('2d'), 128, 160, day, mon, wd); T.cal.needsUpdate = true; };
    R.missing = P(part('missing_poster', () => quad(0.34, 0.51, M.missing, 0, 0, 0, -H), [10.935, 1.55, -11.28], 0, { floor: false }));
    R.odoor = P(part('office_door', () => {
      bb(0, 0, -0.025, 1.0, 2.18, 0.025, 0xc8b89a); bb(0.85, 1.0, 0.025, 0.93, 1.04, 0.07, 0xb0b5ba); bb(0.85, 1.0, -0.07, 0.93, 1.04, -0.025, 0xb0b5ba);
      quad(0.36, 0.36, M.office, 0.5, 1.55, 0.027);
    }, [9.4, 0, -12.62]));
    // backroom door: hinged at x=5.95, small window, kick plate
    R.bdoor = P(part('backroom_door', () => {
      const c = 0xb7c2cc;
      bb(0, 0, -0.025, 0.9, 1.3, 0.025, c); bb(0, 1.75, -0.025, 0.9, 2.08, 0.025, c); bb(0, 1.3, -0.025, 0.3, 1.75, 0.025, c); bb(0.6, 1.3, -0.025, 0.9, 1.75, 0.025, c);
      quad(0.3, 0.45, M.glass, 0.45, 1.525, 0); bb(0.02, 0.02, 0.025, 0.88, 0.3, 0.03, 0x9aa0a6); bb(0.76, 1.0, 0.025, 0.84, 1.04, 0.07, 0xb0b5ba); bb(0.76, 1.0, -0.07, 0.84, 1.04, -0.025, 0xb0b5ba);
    }, [5.95, 0, -23.87]));
    // JARVIS spinners on the door panels (turn in update)
    R.spins = [];
    for (const [x, y, z, ry] of [[-2.0, 2.85, -0.175, PI], [7.15, 1.45, -23.705, 0]]) R.spins.push(P(part('', () => quad(0.2, 0.2, M.spin, 0, 0, 0), [x, y, z], ry, { floor: false })));
    R.halloween = P(part('halloween', () => {
      // plastic skeleton by the queue machine
      ico(0.13, 0xf4f1e6, 1.5, 1.55, -2.7, 1.1); bb(1.46, 1.35, -2.72, 1.54, 1.42, -2.68, 0xf4f1e6);
      for (const dx of [-0.05, 0.05]) bb(1.5 + dx - 0.025, 1.55, -2.84, 1.5 + dx + 0.025, 1.6, -2.8, 0x111111);
      bb(1.46, 1.46, -2.83, 1.54, 1.48, -2.8, 0x111111);
      for (let i = 0; i < 4; i++) bb(1.36, 1.05 + i * 0.07, -2.72, 1.64, 1.08 + i * 0.07, -2.68, 0xf4f1e6);
      bb(1.48, 0.8, -2.72, 1.52, 1.35, -2.68, 0xf4f1e6); bb(1.38, 0.78, -2.72, 1.62, 0.86, -2.68, 0xf4f1e6);
      for (const s of [-1, 1]) { boxR(0.04, 0.5, 0.04, 0xf4f1e6, 1.5 + s * 0.19, 1.1, -2.7, 0, 0, s * 0.3); boxR(0.045, 0.78, 0.045, 0xf4f1e6, 1.5 + s * 0.09, 0.4, -2.7, 0, 0, s * 0.05); }
      cyl(0.015, 0.015, 1.6, 4, 0x555555, 1.5, 2.4, -2.7);
      // pumpkins on the tables and counter
      for (const [x, y, z] of [[-4.4, 0.91, -7.0], [0.4, 0.91, -9.0], [3.5, 1.0, -8.95], [-8.7, 0.5, -3.2], [10.3, 0, -1.6]]) { ico(0.13, 0xf07a1a, x, y + 0.1, z, 0.75); cyl(0.015, 0.015, 0.06, 4, 0x3c6a2a, x, y + 0.22, z); }
      // bunting zig-zag over the aisle, bats, cobweb corner
      for (const sx of [-3.9, -0.1]) {
        bb(sx - 0.006, 2.95, -13.4, sx + 0.006, 2.962, -2.6, 0x1a1a1a);
        for (let i = 0; i < 18; i++) boxR(0.012, 0.2, 0.17, [0xff8c1a, 0x1a1a1a, 0x7b3fb0][i % 3], sx, 2.85, -2.8 - i * 0.6);
      }
      for (const [x, z] of [[-3, -5], [-1, -8.5], [5, -5.5], [8, -2.5]]) { boxR(0.3, 0.01, 0.1, 0x111111, x, 2.7, z, 0, 0.4, 0.2); boxR(0.3, 0.01, 0.1, 0x111111, x + 0.12, 2.72, z, 0, 0.4, -0.2); cyl(0.004, 0.004, 0.48, 3, 0x333333, x + 0.06, 2.96, z); }
      for (const x of [5.2, -6.2]) { quad(2.6, 0.65, M.hween, x, 2.2, -0.04); quad(2.6, 0.65, M.hween, x, 2.2, -0.05, PI); }
    }));
    // A-frame outside the door; swivel chair in Luke's office; straightener in the lost property box
    R.aframe = P(part('aframe_sign', () => aframeModel(false), [-4.9, 0, 1.3], 0.15));
    R.chair = P(chairModel('swivel_chair')); R.chair.position.set(9.25, 0, -16.35);
    R.straightener = P(straightenerModel('straightener')); R.straightener.position.set(9.6, 0.42, -24.55); R.straightener.rotation.set(0.5, 0.6, 0);
    // backroom: tube (flickers), scorch, kettle, TV screen, clock hands, bag, box contents, dictaphone, teas
    tint = BOH;
    R.tube = P(part('tube', () => bb(6.48, 2.69, -27.55, 6.72, 2.72, -26.05, 0xffffff, M.tube), null, 0, { floor: false }));
    R.scorch = P(part('scorch', () => quad(1.8, 1.8, M.scorch, 0, 0, 0, 0, H), [6.5, 2.79, -27.0], 0, { floor: false }));
    R.kettle = P(part('kettle', () => {
      cyl(0.08, 0.08, 0.02, 10, 0x2a2c30, 0, 0.01, 0); cyl(0.07, 0.085, 0.2, 10, 0xe9e9e9, 0, 0.12, 0); cyl(0.04, 0.07, 0.03, 10, 0xd0d0d0, 0, 0.235, 0);
      box(0.03, 0.16, 0.05, 0x2a2c30, 0.09, 0.05, 0); boxR(0.03, 0.03, 0.08, 0xe9e9e9, -0.1, 0.17, 0, 0, H, 0.6);
    }, [10.08, 0.92, -28.55], 0, { floor: false }));
    R.tv = P(part('tv_screen', () => quad(0.32, 0.24, M.tv, 0, 0, 0, -H), [9.915, 1.815, -26.2], 0, { floor: false }));
    R.tv.userData.show = (mode) => { paintTV(T.tv.image.getContext('2d'), 256, 192, mode); T.tv.needsUpdate = true; };
    R.hands = P(new THREE.Group()); R.hands.name = 'clock_hands'; R.hands.position.set(7.45, 2.3, -29.955);
    R.hourH = part('', () => bb(-0.008, 0, -0.003, 0.008, 0.09, 0.003, 0x111111), null, 0, { floor: false });
    R.minH = part('', () => bb(-0.006, 0, 0.004, 0.006, 0.14, 0.008, 0x111111), null, 0, { floor: false });
    R.hands.add(R.hourH, R.minH); R.clockMin = 8 * 60 + 59;
    R.hands.userData.set = (h, m) => { R.clockMin = h * 60 + m; };
    R.bag = P(part('bag_spot', () => {
      box(0.32, 0.42, 0.2, 0x2b2f38, 0, 0, 0); ico(0.16, 0x2b2f38, 0, 0.42, 0, 0.5); box(0.26, 0.16, 0.06, 0x363b45, 0, 0.06, 0.12);
      box(0.08, 0.08, 0.005, 0xffd21f, 0.06, 0.26, 0.103);
    }, [5.0, 0, -24.3], 0.1));
    R.contents = P(part('box_contents', () => {
      box(0.3, 0.2, 0.24, CARD, -0.35, 0, 0.02); boxR(0.32, 0.005, 0.24, CARD, -0.35, 0.2, -0.14, -1.2);
      boxR(0.5, 0.004, 0.012, 0x7fb4cc, 0.02, 0.004, -0.02, 0, 0.3); box(0.06, 0.004, 0.085, 0xf4f4f0, 0.2, 0, 0.04);
      box(0.09, 0.004, 0.105, 0xf4f4f0, 0.12, 0, -0.1);                                      // Polaroid face down
      box(0.055, 0.012, 0.035, 0x2a2c30, 0.02, 0, 0.1);                                      // microcassette
      box(0.05, 0.022, 0.12, 0x3a3d42, 0.28, 0, -0.08);                                      // dictaphone
      box(0.1, 0.016, 0.065, 0x222222, -0.08, 0, 0.1); quad(0.064, 0.032, M.pudding, -0.08, 0.017, 0.1, 0, -H);   // PUDDING cassette
    }, [4.45, 0.93, -29.55], 0, { floor: false }));
    R.dicta = P(part('dictaphone', () => { box(0.05, 0.022, 0.12, 0x3a3d42, 0, 0, 0); box(0.03, 0.004, 0.02, 0xd32f2f, 0, 0.022, 0.035); }, [6.4, 0.01, -26.95], 0.4));
    R.teas = P(part('teas', () => { mug(0xd32f2f, -0.15, 0, 0); mug(0x2f6fd6, 0, 0, 0.05); mug(0xffffff, 0.15, 0, 0); }, [5.0, 0.93, -29.35], 0, { floor: false }));
    // the machine (1.5–1.7): A-frame sign as the frame, 4 phones taped on, straightener clamped on top, the chair, wires
    R.machine = P(new THREE.Group()); R.machine.name = 'machine'; R.machine.position.set(6.4, 0.01, -27.3);
    R.mSign = part('machine_sign', () => aframeModel(false), [0, 0, -0.1]);
    R.mPhones = part('machine_phones', () => {
      for (let i = 0; i < 4; i++) {
        const x = -0.22 + i * 0.145;
        boxR(0.09, 0.17, 0.014, [0xc9ccd1, 0x1f2a44, 0x5b5f66, 0xf0f0ec][i], x, 0.7, 0.19, -0.33);
        boxR(0.08, 0.15, 0.004, 0x07090c, x, 0.7, 0.2, -0.33);
        boxR(0.1, 0.03, 0.004, 0xd8d0b0, x, 0.6, 0.23, -0.33);                               // gaffer tape
      }
      const wc = [0xd32f2f, 0x2f6fd6, 0x2e9d4a, YEL];
      for (let i = 0; i < 4; i++) {
        const x = -0.22 + i * 0.145;
        boxR(0.012, 0.012, 0.55, wc[i], x * 0.8, 0.35, 0.42, 1.2, 0.2 - i * 0.15); boxR(0.012, 0.012, 0.7, wc[i], x - 0.1, 0.02, 0.75 + i * 0.05, 0, 0.6 + i * 0.4);
      }
      for (let i = 0; i < 10; i++) boxR(0.01, 0.01, 0.4, wc[i % 4], Math.sin(i * 2.1) * 0.4, 0.01, 0.2 + Math.cos(i * 1.7) * 0.45, 0, i * 0.7);
    });
    R.mSpeaker = part('', () => {   // Chase's little speaker on top of the frame: the machine's grille
      box(0.15, 0.13, 0.07, 0x2a2c30, 0, 0, 0); cyl(0.05, 0.05, 0.012, 12, 0x15161a, 0, 0.065, 0.036, H);
      for (let k = 0; k < 4; k++) bb(-0.04, 0.035 + k * 0.02, 0.04, 0.04, 0.041 + k * 0.02, 0.046, 0x6a6e75);
    }, [-0.24, 0.97, -0.1], 0, { floor: false });
    R.mStraight = straightenerModel('machine_straightener'); R.mStraight.position.set(0.02, 0.97, -0.1); R.mStraight.rotation.set(0, H, 0.1);
    R.mChair = chairModel('machine_chair'); R.mChair.position.set(0.05, 0, 0.95); R.mChair.rotation.y = PI;
    R.mSign.add(R.mSpeaker); R.machine.add(R.mSign, R.mPhones, R.mStraight, R.mChair);
    R.wreck = P(part('wreck', () => {
      at(0, 0, 0.4); aframeModel(true); XF = null;
      for (const [x, z, ry] of [[-0.5, 0.5, 0.3], [0.6, 0.2, 1.9], [0.1, 0.8, -0.7]]) { boxR(0.09, 0.012, 0.17, 0x2a2c30, x, 0.008, z, 0, ry); boxR(0.08, 0.004, 0.15, 0x050608, x, 0.016, z, 0, ry); }
      for (let i = 0; i < 8; i++) boxR(0.01, 0.01, 0.5, [0xd32f2f, 0x2f6fd6, 0x2e9d4a, YEL][i % 4], Math.sin(i * 1.9) * 0.5, 0.01, Math.cos(i * 1.3) * 0.5, 0, i * 0.8);
      at(0.9, -0.6, 0); boxR(0.48, 0.08, 0.46, 0x23252b, 0, 0.24, 0, 0, 0, H); boxR(0.46, 0.55, 0.07, 0x23252b, -0.25, 0.25, 0, 0, 0, H); XF = null;
    }, [6.2, 0, -27.3]));
    // the black car (3.5 parked facing the store; 3.7 userData.pullUp() drives it to the kerb) + Rue's box on its back seat
    tint = OUT;
    R.car = P(part('car_black', () => {
      const K = 0x16181d, CH = 0xb9bec4, IN_ = 0x2a2b2e, LE = 0x8a6a4a;
      bb(-0.93, 0.32, 1.05, 0.93, 0.92, 2.4, K); bb(-0.95, 0.25, 2.3, 0.95, 0.55, 2.46, 0x101114); bb(-0.6, 0.55, 2.4, 0.6, 0.8, 2.42, 0x2a2c30);
      bb(-0.8, 0.66, 2.4, -0.45, 0.76, 2.43, 0xf0f4ff); bb(0.45, 0.66, 2.4, 0.8, 0.76, 2.43, 0xf0f4ff);
      bb(-0.93, 0.32, -2.4, 0.93, 1.0, -1.15, K); bb(-0.95, 0.25, -2.46, 0.95, 0.55, -2.3, 0x101114);
      bb(-0.85, 0.72, -2.43, -0.5, 0.84, -2.4, 0xa01c22); bb(0.5, 0.72, -2.43, 0.85, 0.84, -2.4, 0xa01c22); bb(-0.2, 0.6, -2.44, 0.2, 0.7, -2.42, 0xf2f2f2);
      bb(-0.9, 0.12, -1.15, 0.9, 0.2, 1.05, IN_);
      bb(-0.93, 0.32, -1.15, -0.85, 1.02, 1.05, K); bb(0.85, 0.32, -0.12, 0.93, 1.02, 1.05, K); bb(0.85, 0.32, -1.15, 0.93, 1.02, -1.05, K);
      for (const sx of [-1, 1]) {
        boxR(0.06, 0.8, 0.06, K, sx * 0.8, 1.23, 0.7, -0.99); boxR(0.06, 0.45, 0.06, K, sx * 0.8, 1.235, -0.1); boxR(0.06, 0.5, 0.06, K, sx * 0.8, 1.23, -1.0, 0.56);
        bb(sx * 0.93 - 0.08, 0.95, 0.85, sx * 0.93 + 0.08, 1.05, 0.95, K); bb(sx * 0.9, 0.3, -2.3, sx * 0.94, 0.35, 2.3, CH);
      }
      bb(-0.78, 1.45, -0.92, 0.78, 1.51, 0.38, K); bb(-0.76, 1.42, -0.9, 0.76, 1.45, 0.36, 0x9a948a);
      quad(1.5, 0.79, M.carGlass, 0, 1.235, 0.69, 0, -0.993); quad(1.5, 0.5, M.carGlass, 0, 1.235, -1.02, 0, 0.56);
      quad(0.95, 0.4, M.carGlass, -0.86, 1.235, 0.43, -H); quad(0.9, 0.4, M.carGlass, -0.86, 1.235, -0.6, -H); quad(0.95, 0.4, M.carGlass, 0.86, 1.235, 0.43, H);
      bb(-0.85, 0.75, 0.85, 0.85, 1.02, 1.1, IN_); cyl(0.17, 0.17, 0.03, 12, 0x111111, -0.4, 0.95, 0.72, -0.9);
      for (const sx of [-1, 1]) { bb(sx * 0.42 - 0.26, 0.2, -0.05, sx * 0.42 + 0.26, 0.62, 0.55, LE); bb(sx * 0.42 - 0.25, 0.62, -0.08, sx * 0.42 + 0.25, 1.2, 0.02, LE); bb(sx * 0.42 - 0.12, 1.2, -0.06, sx * 0.42 + 0.12, 1.34, 0.01, LE); }
      bb(-0.82, 0.2, -1.05, 0.82, 0.62, -0.42, LE); bb(-0.82, 0.62, -1.15, 0.82, 1.15, -1.02, LE);
      for (const [wx, wz] of [[-0.83, 1.45], [0.83, 1.45], [-0.83, -1.45], [0.83, -1.45]]) { cyl(0.34, 0.34, 0.23, 12, 0x121212, wx, 0.34, wz, 0, H); cyl(0.2, 0.2, 0.24, 8, CH, wx, 0.34, wz, 0, H); }
    }, [-2.3, 0, 20.75], PI));
    R.carDoor = part('car_door', () => { bb(0, 0.32, -0.93, 0.08, 1.02, 0, 0x16181d); quad(0.88, 0.4, M.carGlass, 0.01, 1.235, -0.47, H); bb(0.08, 0.8, -0.3, 0.1, 0.83, -0.15, 0xb9bec4); }, [0.85, 0, -0.12]);
    R.car.add(R.carDoor);
    R.rueBox = part('rue_box', () => { box(0.36, 0.24, 0.28, CARD, 0, 0, 0); bb(-0.18, 0.238, -0.03, 0.18, 0.242, 0.03, 0xd8c79a); }, [-0.4, 0.62, -0.72], 0, { floor: false });
    R.car.add(R.rueBox); R.carT = 1;
    R.car.userData.pullUp = () => { R.car.visible = true; R.carT = 0; };
    // passing traffic on the road (ambient)
    R.traffic = P(new THREE.Group()); R.traffic.name = 'traffic';
    R.cars = [0xf2f2ee, 0xb3262c].map((c, i) => { const g = part('', () => car(c, 0, 0, 0)); g.rotation.y = i ? -H : H; g.position.set(0, 0, i ? 32.4 : 29.6); R.traffic.add(g); return g; });
    COL.length -= 2;   // the two traffic cars pushed colliders at the origin: drop them
    // window flash (3.5: white fills every window), rain streaks, heat shimmer, sun, rain
    R.flash = P(part('window_flash', () => { quad(6.1, 2.3, M.flash, -6.175, 1.45, -0.2); quad(12.1, 2.3, M.flash, 5.175, 1.45, -0.2); quad(2.2, 2.3, M.flash, -2.0, 1.45, -0.3); }, null, 0, { floor: false }));
    R.streaks = P(part('streaks', () => { quad(20.4, 2.3, M.streak, 1, 1.45, 0.04); }, null, 0, { floor: false })); R.streaks.visible = false;
    R.shimmer = P(part('shimmer', () => { for (const z of [3.6, 6.4]) quad(34, 0.4, M.shim, 0, 0.2, z); }, null, 0, { floor: false }));
    SUNM ||= [new THREE.MeshBasicMaterial({ color: 0xfffbea, fog: false }), new THREE.MeshBasicMaterial({ color: 0xfff6d0, fog: false, transparent: true, opacity: 0.3, depthWrite: false })];
    const sun = new THREE.Mesh(new THREE.CircleGeometry(3.6, 20), SUNM[0]), halo = new THREE.Mesh(new THREE.CircleGeometry(8, 20), SUNM[1]);
    R.sun = P(new THREE.Group()); R.sun.name = 'sun'; R.sun.add(sun, halo); halo.position.z = -0.3;
    R.sun.position.set(-2, 54, -26); R.sun.lookAt(-2, 2, 10);
    R.rain = P(makeRain({ box: [-26, 3.2, 26, 34], top: 12, count: 5000 })); R.rain.visible = false;
    // two customers browse (accessories wall, the right display table): real rigs, built once, shown by dress()
    CUST ||= [['customer_b', -8.05, -12.2, -10.0, -H], ['customer_a', -0.6, -10.6, -9.4, H]].map(([id, x, z0, z1, ry]) => {
      const rig = buildCharacter(id); rig.root.add(blobShadow());
      return { rig, x, z0, z1, ry, z: z1, to: z1, yaw: ry, a: 'idle', pick: 'idle', at: 0, t: 1, col: [1e4, 1e4, 1e4, 1e4] };
    });
    for (const c of CUST) { root.add(c.rig.root); COL.push(c.col); }
    // dress for the current scene on the first update
    R.scene = null; R.env = null;
    dress(typeof state !== 'undefined' ? state.scene : '1.1');
    return root;
  }

  // ---------------------------------------------------------- scene dressing (runs when state.scene changes)
  function dress(id) {
    const n = Math.max(0, SCENE_ORDER.indexOf(id)), from = (s) => n >= SCENE_ORDER.indexOf(s), during = (a, z) => from(a) && !from(z);
    for (let i = 0; i < 4; i++) { R.phones[i].visible = !from('1.5'); R.tethers[i].rotation.x = 0; }
    R.screens.visible = from('1.2');
    R.alarm.visible = false;
    R.machine.visible = during('1.6', '2.1');
    for (const o of [R.mSign, R.mPhones, R.mStraight, R.mChair]) o.visible = true;
    R.aframe.visible = !from('1.6');
    R.chair.visible = !during('1.6', '3.7'); R.chair.userData.seat.rotation.y = 0; R.chair.userData.spin = 0; R.mChair.userData.spin = 0; R.mChair.userData.seat.rotation.y = 0;
    R.straightener.visible = !from('1.6');
    R.scorch.visible = from('2.1');
    R.wreck.visible = id === '3.6';
    R.halloween.visible = from('3.5') || R.env === 'halloween';
    R.missing.visible = during('2.7', 'E');
    R.report.visible = from('3.5');
    R.bag.visible = during('1.2', '2.1');
    R.postit.visible = !from('2.1');
    R.car.visible = id === '3.5'; R.car.position.set(-2.3, 0, 20.75); R.car.rotation.y = PI; R.carT = 1; R.carDoor.rotation.y = 0;
    R.rueBox.visible = id === '3.5' || id === '3.7';
    for (const c of CUST) { c.rig.root.visible = id === '1.2' || id === '1.3' || id === '3.6' || id === 'E'; c.col[0] = c.col[1] = c.col[2] = c.col[3] = 1e4; }
    for (const o of [R.contents, R.dicta, R.teas, R.parcel, R.mphone, R.flash]) o.visible = false;
    R.bdoor.rotation.y = 0; R.odoor.rotation.y = 0; R.bdoor.userData.open = R.odoor.userData.open = undefined;
    R.sign.userData.set(from('1.2'));
    R.tv.userData.show('off');
    R.mon.userData.show(!from('1.2') ? 'loading' : during('1.4', '2.1') ? 'crash' : 'app');
    if (id === '2.7') R.cal.userData.set(7, 'OCTOBER', 'WEDNESDAY');
    else if (id === 'E') R.cal.userData.set(23, 'OCTOBER', 'FRIDAY');
    else if (from('3.5')) R.cal.userData.set(20, 'OCTOBER', 'TUESDAY');
    else R.cal.userData.set(29, 'SEPTEMBER', 'TUESDAY');
    const tm = /(\d{1,2}):(\d{2})/.exec((SCENES[id] && SCENES[id].time) || '');
    if (tm) R.clockMin = +tm[1] * 60 + +tm[2];
  }

  // ---------------------------------------------------------- ambient life (no allocation)
  let near = false, root0 = null, pl = null, plOn = false;
  function nearDoor(a) {
    if (a.root.parent !== root0 || !a.root.visible || (a === pl && plOn)) return;
    const dx = a.pos.x + 2, dz = a.pos.z;
    if (dx * dx + dz * dz < 5.3) near = true;
  }
  const smooth = (u) => u * u * (3 - 2 * u), WALKP = { speed: 0.42 };
  function update(dt, ctx) {
    if (!R.root) return;
    const t = ctx.t;
    if (typeof state !== 'undefined' && state.scene !== R.scene) { R.scene = state.scene; dress(R.scene); }
    if (ctx.env !== R.env) {
      R.env = ctx.env; const wet = R.env === 'rain';
      R.shimmer.visible = R.sun.visible = !wet; R.streaks.visible = wet;
      if (R.env === 'halloween') R.halloween.visible = true;
    }
    // automatic front doors: open for anyone near them except the player while they roam (the JARVIS door joke)
    near = false; root0 = R.root.parent; pl = ctx.player; plOn = typeof player !== 'undefined' && !!player.enabled;
    if (typeof world !== 'undefined' && world.actors) world.actors.forEach(nearDoor);
    R.doorT = Math.min(1, Math.max(0, R.doorT + (near ? dt : -dt) / 0.7));
    const k = smooth(R.doorT);
    R.doorL.position.x = -2.55 - 1.02 * k; R.doorR.position.x = -1.45 + 1.02 * k;
    if (R.flipT < 1) {
      const was = R.flipT; R.flipT = Math.min(1, R.flipT + dt / 0.5);
      if (was < 0.5 && R.flipT >= 0.5) { R.signOpen = R.flipTo; R.signO.visible = R.flipTo; R.signC.visible = !R.flipTo; }
      R.sign.rotation.y = R.flipT * PI;
    }
    // hinged doors ease toward userData.open (only when content set it)
    for (let i = 0; i < 2; i++) {
      const d = i ? R.odoor : R.bdoor;
      if (d.userData.open !== undefined) d.rotation.y += ((d.userData.open ? 1.5 : 0) - d.rotation.y) * Math.min(1, dt * 5);
    }
    // swivel chairs coast to a stop (userData.spin = rad/s)
    for (let i = 0; i < 2; i++) {
      const c = i ? R.mChair : R.chair, s = c.userData.spin;
      if (s) { c.userData.seat.rotation.y += s * dt; c.userData.spin = Math.abs(s) < 0.05 ? 0 : s * (1 - 0.55 * dt); }
    }
    // the backroom tube: mostly on, with bursts of flicker (userData.off forces it dark)
    const burst = Math.sin(t * 1.3) + Math.sin(t * 2.7 + 1) > 1.6;
    M.tube.emissiveIntensity = R.tube.userData.off ? 0.05 : burst && (t * 17) % 1 < 0.45 ? 0.12 : 1;
    // clock, spinners, lit phone screens follow their phones, shimmer and streaks drift
    R.clockMin += dt / 60;
    R.hourH.rotation.z = -R.clockMin / 720 * PI * 2; R.minH.rotation.z = -(R.clockMin % 60) / 60 * PI * 2;
    for (let i = 0; i < R.spins.length; i++) R.spins[i].rotation.z -= dt * 6;
    for (let i = 0; i < 4; i++) R.scr[i].visible = R.phones[i].visible;
    T.shim.offset.x = t * 0.035 + Math.sin(t * 2.3) * 0.01;
    T.streak.offset.y = t * 0.22;
    // the black car pulling up to the kerb (3.7)
    if (R.carT < 1) {
      R.carT = Math.min(1, R.carT + dt / 5); const u = 1 - (1 - R.carT) ** 3;
      R.car.position.set(-26 + 24 * u, 0, 4.8); R.car.rotation.y = H;
    }
    R.cars[0].position.x = ((t * 11) % 140) - 70; R.cars[1].position.x = 70 - ((t * 9 + 60) % 140);
    // customers: look at the stock, reach for something, drift a step along the display now and then
    for (let i = 0; i < CUST.length; i++) {
      const c = CUST[i], r = c.rig.root;
      if (!r.visible) continue;
      let want = c.pick, face = c.ry;
      if (Math.abs(c.to - c.z) > 0.02) { const sg = Math.sign(c.to - c.z); c.z += sg * Math.min(Math.abs(c.to - c.z), 0.7 * dt); want = 'walk'; face = sg > 0 ? 0 : PI; }
      else if ((c.t -= dt) <= 0) {
        const k = Math.random(); c.t = 2.5 + Math.random() * 3.5;
        if (k < 0.3) c.to = c.z0 + Math.random() * (c.z1 - c.z0); else c.pick = k < 0.5 ? 'point' : k < 0.7 ? 'look_down' : k < 0.8 ? 'phone' : 'idle';
      }
      if (want !== c.a) { c.a = want; c.at = 0; }
      c.at += dt; c.yaw += ((((face - c.yaw + PI) % (2 * PI)) + 2 * PI) % (2 * PI) - PI) * Math.min(1, dt * 6);
      r.position.set(c.x, 0, c.z); r.rotation.y = c.yaw;
      c.rig.pose(c.a, c.at, WALKP); c.rig.update(dt);
      c.col[0] = c.x - 0.28; c.col[1] = c.z - 0.28; c.col[2] = c.x + 0.28; c.col[3] = c.z + 0.28;
    }
  }

  // ---------------------------------------------------------- data
  return {
    env: {
      day:       { bg: 0x6ab8f6, fog: [0xf4d09a, 0.013], hemi: [0xeef4ff, 0xb09068, 1.1], dir: [0xfff0dc, 1.6, [3, 14, 4]], rain: 0 },
      halloween: { bg: 0x74bef6, fog: [0xf2cc96, 0.013], hemi: [0xf0f2ff, 0xae8c66, 1.1], dir: [0xffecd4, 1.6, [4, 13, 5]], rain: 0 },
      rain:      { bg: 0x8b96a1, fog: [0x959fa9, 0.022], hemi: [0xdde4ec, 0x56606a, 1.05], dir: [0xc8d4e0, 0.5, [4, 12, 6]], rain: 1 },
    },
    build,
    marks: {
      // car park
      carpark_start: [-2.0, 0, 20.5, PI], carpark_mid: [-2.0, 0, 9.0, PI], carpark_door: [-2.0, 0, 1.4, 0],
      aframe: [-4.9, 0, 2.3, PI], margaret_start: [-1.2, 0, 22.5, PI],
      car_backseat: [-2.72, 0.16, 21.37, PI], car_driver: [-1.88, 0.16, 20.5, PI], car_arrive: [-2.6, 0, 2.5, PI],
      // shop floor
      door_in: [-2.0, 0, -1.2, PI], keypad: [-4.4, 0, -1.0, 0], window: [7.5, 0, -0.9, 0],
      aisle_end: [-2.0, 0, -4.6, PI], wall_front: [-2.0, 0, -13.2, PI], floor_center: [3.4, 0, -5.4, -2.6],
      counter_luka: [6.4, 0, -10.25, 0], counter_chase: [4.3, 0, -10.25, 0], jordan_counter: [5.35, 0, -10.25, 0],
      counter_customer: [6.4, 0, -7.85, PI], counter_customer2: [4.3, 0, -7.85, PI],
      noticeboard: [10.25, 0, -11.55, H], luke_phone: [9.4, 0, -10.55, -2.03], luke_out: [9.9, 0, -11.3, 0.4],
      office_door: [9.9, 0, -11.7, PI], office_door_in: [9.9, 0, -13.5, PI], office_desk: [9.25, 0, -16.35, 0],
      rue_path_1: [-2.0, 0, -3.0, PI], rue_path_2: [1.3, 0, -6.2, 2.4], rue_path_3: [4.9, 0, -7.3, PI],
      browse_1: [-7.0, 0, -6.0, -H], browse_2: [-3.3, 0, -6.2, -H], browse_3: [1.5, 0, -10.0, -H], browse_4: [10.3, 0, -5.9, H],
      // corridor + backroom
      corridor_start: [6.4, 0, -13.4, PI], corridor_boxes: [5.72, 0.02, -22.5, H],
      backroom_door_out: [6.4, 0, -23.1, PI], backroom_door_in: [6.4, 0, -24.9, PI], doorway: [6.4, 0, -24.15, PI],
      bench: [4.4, 0, -28.75, PI], machine_spot: [5.55, 0, -26.5, 2.4], machine_seat: [6.45, 0, -26.35, PI], kettle: [9.45, 0, -28.6, H],
      tv_luka: [6.95, 0, -24.45, 2.09], tv_chase: [7.35, 0, -29.1, 0.77],
      floor_luka: [5.8, 0, -27.2, 0.3], floor_chase: [7.0, 0, -27.2, -0.3],
      bench_luka: [3.6, 0, -28.65, 2.0], bench_chase: [5.3, 0, -28.2, -2.2], bench_rue: [4.5, 0, -27.9, PI],
    },
    anchors: {
      monitor:        { at: [6.4, 1.3, -9.03], from: [6.44, 1.36, -8.3], fov: 40 },
      monitor2:       { at: [4.3, 1.3, -9.03], from: [4.34, 1.36, -8.3], fov: 40 },
      monitor_screen: { at: [6.4, 1.3, -9.03], from: [6.4, 1.32, -9.72], fov: 32 },
      postit:         { at: [6.63, 1.42, -9.04], from: [6.6, 1.44, -9.33], fov: 30 },
      display_wall:   { at: [-2.0, 1.3, -14.2], from: [-2.0, 1.62, -5.0], fov: 30 },
      phones:         { at: [-2.0, 1.12, -14.0], from: [-2.0, 1.5, -11.2], fov: 35 },
      tethers:        { at: [-2.0, 1.15, -14.2], from: [-1.2, 1.35, -12.4], fov: 40 },
      wall_switch:    { at: [1.11, 1.36, -14.46], from: [1.0, 1.45, -13.6], fov: 32 },
      door_sign:      { at: [-1.45, 1.5, -0.1], from: [-1.4, 1.56, -1.05], fov: 30 },
      doors:          { at: [-2.0, 1.3, 0], from: [-2.0, 1.6, -4.2], fov: 40 },
      keypad:         { at: [-4.4, 1.45, -0.4], from: [-4.4, 1.5, -0.95], fov: 30 },
      targets_board:  { at: [8.4, 1.65, -12.46], from: [8.4, 1.62, -11.1], fov: 42 },
      noticeboard:    { at: [10.95, 1.52, -11.6], from: [9.6, 1.58, -11.6], fov: 44 },
      calendar:       { at: [10.96, 1.55, -10.35], from: [10.0, 1.55, -10.35], fov: 34 },
      missing_poster: { at: [10.93, 1.55, -11.28], from: [9.9, 1.55, -11.28], fov: 34 },
      queue_machine:  { at: [0.66, 1.24, -1.9], from: [-0.4, 1.4, -1.9], fov: 32 },
      pot_plant:      { at: [10.3, 0.9, -0.85], from: [8.8, 1.4, -2.0], fov: 38 },
      accessories:    { at: [-8.9, 1.4, -7.8], from: [-5.9, 1.65, -7.8], fov: 48 },
      sim_rack:       { at: [10.9, 1.25, -5.9], from: [9.4, 1.45, -5.9], fov: 40 },
      office_door:    { at: [9.9, 1.35, -12.6], from: [9.7, 1.55, -10.4], fov: 42 },
      aframe:         { at: [-4.9, 0.6, 1.3], from: [-4.2, 1.35, 3.6], fov: 34 },
      yes_wall:       { at: [4.05, 1.95, -12.46], from: [4.1, 1.8, -7.3], fov: 40 },
      front_glass:    { at: [-1.0, 1.1, 10], from: [1.6, 1.55, -2.6], fov: 50 },
      sign:           { at: [-2.0, 4.32, 0.4], from: [-2.0, 2.0, 13], fov: 30 },
      halloween:      { at: [1.5, 1.2, -2.7], from: [0.3, 1.4, -3.9], fov: 40 },
      sky:            { at: [-2.0, 54, -26], from: [-2.0, 30, 34], fov: 50 },
      car_window:     { at: [-2.1, 3.3, 0.4], from: [-2.3, 1.2, 21.45], fov: 50 },
      wall_clock:     { at: [7.45, 2.3, -29.96], from: [7.45, 2.15, -29.05], fov: 30 },
      tv:             { at: [9.92, 1.82, -26.2], from: [9.0, 1.72, -26.2], fov: 32 },
      bench:          { at: [4.4, 0.95, -29.6], from: [4.4, 1.85, -28.35], fov: 42 },
      lost_property:  { at: [9.65, 0.45, -24.5], from: [8.55, 1.4, -25.5], fov: 36 },
      kettle:         { at: [10.08, 1.05, -28.55], from: [9.25, 1.35, -28.5], fov: 32 },
      machine:        { at: [6.4, 0.6, -27.3], from: [8.0, 1.45, -25.9], fov: 42 },
      speaker:        { at: [6.16, 1.04, -27.45], from: [6.16, 1.07, -27.08], fov: 28 },
      backroom_door:  { at: [6.4, 1.2, -23.9], from: [6.4, 1.5, -20.3], fov: 40 },
      backroom_window:{ at: [5.75, 1.25, -22.5], from: [6.76, 1.52, -25.25], fov: 22 },
      ceiling_scorch: { at: [6.5, 2.8, -27.0], from: [5.6, 1.1, -25.6], fov: 48 },
      // extras for the content
      ots_chase:      { at: [4.2, 1.3, -7.85], from: [4.62, 1.72, -11.0], fov: 45 },
      ots_luka:       { at: [6.3, 1.3, -7.85], from: [6.72, 1.72, -11.0], fov: 45 },
      ceiling_corner: { at: [3.4, 1.0, -5.4], from: [10.7, 3.05, -0.4], fov: 42 },
      store_back:     { at: [-1.6, 1.2, -0.5], from: [1.9, 1.75, -13.6], fov: 45 },
      luke_call:      { at: [11, 1.5, -11.0], from: [7.3, 1.58, -10.0], fov: 40 },
      corridor_wide:  { at: [5.95, 0.95, -22.6], from: [7.15, 1.3, -18.3], fov: 42 },
      backroom_wide:  { at: [6.8, 0.9, -28.6], from: [3.2, 2.1, -24.3], fov: 55 },
      parcel:         { at: [5.35, 1.07, -9.05], from: [5.3, 1.7, -9.75], fov: 34 },
      dictaphone:     { at: [6.4, 0.05, -26.95], from: [6.4, 0.75, -26.2], fov: 34 },
      box_contents:   { at: [4.45, 0.95, -29.55], from: [4.45, 1.75, -29.1], fov: 40 },
      crane_top:      { at: [-2.0, 50, -20], from: [-2.0, 30, 30], fov: 50 },
      crane_end:      { at: [-2.0, 2.6, 1.0], from: [-3.2, 2.2, 22], fov: 45 },
      pull_1:         { at: [4.8, 1.1, -29.0], from: [6.2, 1.5, -27.2], fov: 45 },
      pull_2:         { at: [5.8, 1.1, -28.6], from: [6.4, 1.6, -23.6], fov: 45 },
      pull_3:         { at: [6.4, 1.2, -27.0], from: [6.4, 1.8, -16.5], fov: 45 },
      pull_4:         { at: [6.4, 1.2, -22.0], from: [6.4, 2.1, -6.0], fov: 45 },
      pull_5:         { at: [6.4, 1.6, -14.0], from: [6.4, 2.6, 5.0], fov: 45 },
      pull_6:         { at: [-2.0, 54, -26], from: [6.4, 36, 38], fov: 50 },
    },
    cams: {
      carpark:     { type: 'pan', pos: [-9.6, 1.75, 22.9], base: [-1.0, 1.8, 3.0], look: 'player', fov: 42, limit: 0.6 },
      shopfront:   { type: 'pan', pos: [12.6, 1.35, 4.4], base: [-3.0, 1.3, 1.4], look: 'player', fov: 42, limit: 0.55 },
      entrance:    { type: 'pan', pos: [-8.3, 2.85, -5.9], base: [-2.0, 1.0, -0.6], look: 'player', fov: 50, limit: 0.5 },
      aisle:       { type: 'pan', pos: [-2.0, 1.95, -0.6], base: [-2.0, 1.3, -14.5], look: 'player', fov: 40, limit: 0.3 },
      accessories: { type: 'pan', pos: [-8.4, 2.8, -3.6], base: [-6.2, 0.9, -11.5], look: 'player', fov: 50, limit: 0.65 },
      counter:     { type: 'pan', pos: [10.5, 2.7, -0.8], base: [4.8, 1.0, -8.6], look: 'player', fov: 48, limit: 0.6 },
      staff:       { type: 'pan', pos: [1.6, 2.35, -5.6], base: [7.6, 1.1, -11.2], look: 'player', fov: 46, limit: 0.6 },
      corridor:    { type: 'push', pos: [6.4, 1.95, -11.0], to: [6.4, 1.85, -15.0], look: 'player', fov: 44, dur: 25 },
      office:      { type: 'pan', pos: [7.9, 2.45, -12.95], base: [9.6, 0.7, -16.0], look: 'player', fov: 55, limit: 0.5 },
      backroom:    { type: 'fixed', pos: [3.2, 2.1, -24.3], look: [6.8, 0.9, -28.6], fov: 55 },
      backroom_rev: { type: 'pan', pos: [9.9, 2.4, -29.6], base: [5.0, 0.8, -24.8], look: 'player', fov: 55, limit: 0.45 },
    },
    zones: [
      { box: [2.6, -12.5, 11, -9.45], cam: 'staff' },
      { box: [5.4, -12.75, 7.4, -12.5], cam: 'staff' },
      { box: [5.4, -23.75, 7.4, -12.75], cam: 'corridor' },
      { box: [7.4, -17, 11, -12.5], cam: 'office' },
      { box: [2.4, -26.2, 5.2, -23.75], cam: 'backroom_rev' },
      { box: [2.4, -30, 10.4, -23.75], cam: 'backroom' },
      { box: [-9, -3.5, 1.5, 0], cam: 'entrance' },
      { box: [1.5, -9.45, 11, 0], cam: 'counter' },
      { box: [-3.85, -14.5, 2.6, -8.6], cam: 'aisle' },
      { box: [-3.85, -8.6, 1.5, -3.5], cam: 'aisle' },
      { box: [-9, -14.5, -3.85, -3.5], cam: 'accessories' },
      { box: [-17, 0, 17, 8], cam: 'shopfront' },
      { box: [-17, 8, 17, 25], cam: 'carpark' },
    ],
    colliders: COL,
    props: [
      'door_l', 'door_r', 'door_sign', 'display_phone_1', 'display_phone_2', 'display_phone_3', 'display_phone_4',
      'tether_1', 'tether_2', 'tether_3', 'tether_4', 'wall_screens', 'aframe_sign', 'swivel_chair', 'straightener', 'machine',
      'backroom_door', 'office_door', 'tv_screen', 'monitor_screen', 'alarm_light', 'tube', 'scorch', 'halloween',
      'missing_poster', 'car_black', 'postit', 'kettle', 'bag_spot', 'margaret_phone',
      // extras
      'calendar', 'clock_hands', 'incident_report', 'wreck', 'rue_box', 'box_contents', 'dictaphone', 'teas', 'parcel',
      'store_phone', 'window_flash', 'car_door', 'machine_sign', 'machine_phones', 'machine_straightener', 'machine_chair',
      'traffic', 'roof', 'sun', 'shimmer', 'streaks', 'rain',
    ],
    ambience: { rain: false, loops: ['aircon', 'fluoro'], room: 'room' },
    update,
  };
})();
