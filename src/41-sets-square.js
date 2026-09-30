// ============================================================ SET: square
// Front Gate + porters' lodge + Front Square, Trinity College Dublin, October 1987.
// Campanile at the origin; Front Gate arch on the west (x = -20), lodge just north of the arch.
// +x east, +z north. The lodge floor sits at y 0.46 (a stone stoop outside), the Campanile plinth at 0.46.
SETS.square = (() => {
  const PI = Math.PI, H = PI / 2;

  // -------------------------------------------------------------- layout data
  // Bays: north/south facades 11 x 3.636 m (centres x = 0, +-3.64, +-7.27, +-10.9, +-14.55, +-18.2);
  // east facade 8 x 3.75 m (centres z = +-1.875, +-5.625, ...). East range has an arcade x 20..23, z -11.25..11.25.
  const LAMPS = [[-2.4, 5.2], [2.4, -5.2], [-10, 9], [10, 9], [10, -9], [-10, -9], [-18.2, -2.6], [-18.2, 2.6]];
  const BENCHES = [[-4.5, 8.8, PI], [4.5, -8.8, 0], [13, 2, -H], [-13.5, -6.5, H]];   // x, z, facing
  const PIERS = [-7.5, -3.75, 0, 3.75, 7.5];                                          // east arcade inner piers (z)
  const PUDDLES = [[-16.5, 1.3, 1.2, 0.7], [-9, 3.4, 1.5, 0.9], [-6, -7.2, 1.0, 1.4], [5.5, 6.9, 1.4, 0.8], [7.4, -3.4, 0.9, 1.3],
    [14, -8, 1.6, 1.0], [-13, 11.6, 1.1, 0.8], [1.5, -11.6, 1.3, 0.7], [-19.3, 7.2, 0.5, 0.32], [-26.6, 0.9, 1.0, 0.6],
    [-30.5, -1.4, 0.9, 0.6], [16.5, 11, 1.0, 0.7], [-2.6, -9.6, 0.8, 0.5], [17.5, -4.5, 0.8, 0.6]];
  // bike rows: x0, x1, z, rotY (bike length runs along the facing)
  const BIKES = [[-19.2, -16.4, 14.1, 0], [9.8, 11.9, 14.1, 0], [-5.6, -2.1, -14.1, PI], [2.4, 7.9, -14.1, PI]];
  // umbrella students: door to door, round the Campanile
  const PATHS = [
    [[-32.4, 16], [-32.4, 2.6], [-29.8, 0.8], [-19.5, 0.8], [-12, 3.0], [-6, 6.3], [2.5, 6.8], [7.27, 14.6]],
    [[0, -14.6], [-6.6, -7], [-7.6, 4.5], [-14.55, 14.6]],
    [[-10.9, -14.4], [-8, -6.8], [5, -6.8], [18.5, -5.6], [22.5, -5.6]],
    [[14.55, 14.6], [8.5, 6.6], [-3.4, 7.2], [-12, 2.4], [-20.5, -0.5], [-29.8, -0.5], [-32.4, 2.6], [-32.4, 16]],
    [[22.5, 5.6], [18, 5.6], [9, 3.4], [6, -6.6], [-5.5, -6.6], [-12, -2.6], [-20.5, -0.5], [-29.8, -0.5], [-32.4, 2.6], [-32.4, 16]],
    [[-14.55, 14.6], [-7.2, 7.5], [-7.6, -6], [-10.9, -14.4]],
    [[22.5, -5.6], [17.5, -6.4], [8, -10.6], [1, -12.5], [0, -14.6]],
    [[7.27, 14.6], [6.5, 6.5], [6.4, -6.5], [4, -11], [0, -14.6]],
  ];

  const marks = {
    lodge_des_chair: [-21.72, 0.46, 5.3, H], lodge_window: [-20.95, 0.46, 6.45, H],
    lodge_floor_luka: [-23.3, 0.46, 4.6, -0.4], lodge_floor_chase: [-22.5, 0.46, 3.7, 2.2],
    lodge_door_in: [-21.3, 0.46, 3.0, 0], lodge_luka: [-22.6, 0.46, 5.95, H], lodge_chase: [-23.4, 0.46, 5.0, H],
    lodge_step_luka: [-20.95, 0, 1.55, PI], lodge_step_chase: [-21.7, 0, 1.55, PI], lodge_out: [-21.3, 0, 0.7, H],
    lodge_cupboard: [-24.75, 0.46, 3.6, PI], lodge_phone: [-21.62, 0.46, 4.65, H],
    gate_in: [-21, 0, 0, H], gate_out: [-30.2, 0, 0, -H], fiachra: [-27.3, 0, -1.55, 0.6],
    bike: [-18.1, 0, 9.4, -H], square_center: [-10, 0, 0, H], under_bell: [0, 0.46, 0, H],
    steps_rue: [0.45, 0, 3.97, 0], steps_chase: [-0.35, 0, 3.97, 0], steps_luka: [1.7, 0, 5.1, -2.6],
    noticeboard: [22.2, 0, -1.875, H], arts_door: [0, 0, -14.3, PI], buttery_door: [7.27, 0, 14.3, 0],
    lab_door: [14.55, 0, 14.3, 0], house6_door: [-14.55, 0, 14.3, 0], exam_door: [-10.9, 0, -14.35, PI],
    library_door: [22.2, 0, -5.625, H], bench_ronan: [22.65, 0, 1.875, -H], siobhan: [1.4, 0, -12.6, 0.3],
    mick: [10.8, 0, 6.3, 2.3], toast_1: [14.2, 0, 0.2, 0], toast_2: [15.5, 0, -4.5, 0], toast_3: [16.3, 0, -8.5, 0],
    far_corner: [17.8, 0, -12.6, 0], nuala: [21.5, 0, -4.4, -1.2], hartigan_search: [-7.5, 0, -10.5, 0.8],
    rue_path_1: [0.2, 0, -13.6, 0.3], rue_path_2: [4.6, 0, -10.4, 0.9], rue_path_3: [8.2, 0, -4.8, 0.4],
    rue_path_4: [8.8, 0, 2.2, 0], rue_path_5: [7.6, 0, 8.4, -0.2], rue_path_6: [7.27, 0, 14.1, 0],
    polaroid_spot: [-17.6, 0, 0, H], polaroid_l: [-17.6, 0, 0.75, H], polaroid_r: [-17.6, 0, -0.75, H], polaroid_des: [-13.2, 0, 0, -H],
    // extras: the Torchlight trail (footprints trail_1..trail_3, scarf on lamp_4 by trail_5), the iron gate
    trail_1: [-16.5, 0, 5.8, 0.8], trail_2: [-12, 0, 9.6, 1.1], trail_3: [-6.5, 0, 12, 1.4], trail_4: [4, 0, 11.5, 2.0],
    trail_5: [8.6, 0, 8.4, 2.6], trail_6: [2.4, 0, 5.6, -2.4], iron_gate: [22.3, 0, 5.625, H],
    doorway_1: [-21.3, 0.46, 2.65, PI], doorway_2: [-21.85, 0.46, 3.2, PI - 0.3], doorway_3: [-21.0, 0.46, 3.35, PI + 0.3],   // 3.4: in the lodge doorway
  };

  const anchors = {
    receiver: { at: [-20.85, 1.33, 5.0], from: [-21.36, 1.47, 5.14], fov: 30 },
    pigeonholes: { at: [-25.3, 2.1, 5.0], from: [-24.0, 1.95, 4.4], fov: 50 },
    key_board: { at: [-22.52, 1.9, 2.45], from: [-22.5, 1.85, 3.7], fov: 35 },
    radio: { at: [-24.2, 1.48, 6.92], from: [-23.5, 1.8, 5.8], fov: 35 },
    calendar_1987: { at: [-23.9, 2.27, 7.17], from: [-23.85, 2.05, 5.95], fov: 35 },
    desk_phone: { at: [-20.85, 1.3, 5.0], from: [-21.8, 1.95, 4.7], fov: 35 },
    lost_property_drawer: { at: [-23.55, 1.1, 2.92], from: [-23.5, 1.75, 4.0], fov: 35 },
    newspaper: { at: [-20.9, 1.26, 4.5], from: [-21.35, 1.9, 4.52], fov: 35 },
    campanile_photo: { at: [-22.1, 2.0, 7.17], from: [-22.1, 1.95, 6.1], fov: 30 },
    cupboard: { at: [-24.75, 1.45, 2.65], from: [-23.3, 1.75, 4.3], fov: 50 },
    kettle: { at: [-23.1, 1.5, 6.92], from: [-22.5, 1.9, 5.9], fov: 35 },
    lodge_window_out: { at: [-20.2, 3.6, 4.8], from: [-7.5, 1.4, 1.8], fov: 42 },
    lodge_clock: { at: [-21.35, 2.55, 7.17], from: [-21.4, 2.35, 6.3], fov: 30 },
    bin: { at: [-21.5, 0.75, 4.45], from: [-22.2, 1.7, 3.8], fov: 40 },
    bike: { at: [-18.8, 0.7, 9.4], from: [-16.4, 1.4, 7.9], fov: 40 },
    gutter: { at: [-19.85, 0.4, 6.95], from: [-18.4, 0.95, 6.2], fov: 40 },
    gate_arch: { at: [-20, 3.1, 0], from: [-34, 1.75, 0], fov: 35 },
    campanile: { at: [0, 7, 0], from: [-14, 1.6, -9], fov: 45 },
    bell: { at: [0, 10.1, 0], from: [0.6, 1.7, 0.9], fov: 40 },
    noticeboard: { at: [22.95, 1.6, -1.875], from: [21.1, 1.65, -1.875], fov: 40 },
    poster: { at: [19.98, 1.6, 0], from: [18.7, 1.6, 0], fov: 40 },
    cobbles: { at: [-15, 0.05, 1.5], from: [-14.4, 0.8, 0.4], fov: 40 },
    bicycles: { at: [-17.3, 0.6, 14.1], from: [-15, 1.5, 11.5], fov: 40 },
    lamp: { at: [-10, 3.4, 9], from: [-8, 2.2, 6.5], fov: 40 },
    scarf_post: { at: [10, 1.9, 9], from: [8.6, 1.7, 7.4], fov: 35 },
    library_door: { at: [23, 2.2, -5.625], from: [19.1, 1.5, -6.9], fov: 45 },
    lodge_step_far: { at: [-21.3, 1.3, 1.5], from: [15.5, 1.7, -12.5], fov: 11 },
    // extras
    machine_desk: { at: [-20.85, 1.3, 5.6], from: [-21.8, 1.9, 5.2], fov: 35 },
    machine_cupboard: { at: [-24.75, 1.28, 2.7], from: [-23.9, 1.7, 3.8], fov: 40 },
    machine_back: { at: [-24.75, 1.33, 2.82], from: [-24.75, 1.75, 1.85], fov: 40 },   // JARVIS-CAM: the lens behind the machine's screen (3.2)
    lodge_window_pov: { at: [-2, 3.2, 2.7], from: [-21.55, 2.05, 5.65], fov: 45 },
    lodge_hatch: { at: [-23.55, 1.8, 2.2], from: [-22.6, 1.7, 0.2], fov: 45 },
    steps: { at: [0, 0.8, 4.1], from: [-3, 1.7, 13], fov: 30 },
    bell_low: { at: [0, 8.5, 0], from: [-0.5, 0.3, 1.6], fov: 45 },
    sky: { at: [0, 0.5, 4], from: [2, 40, 14], fov: 40 },
    square_wide: { at: [0, 5, 0], from: [-16, 3.5, 13], fov: 45 },
    iron_gate: { at: [23, 1.5, 5.625], from: [19, 1.7, 3.8], fov: 40 },
  };

  const cams = {
    lodge_back: { type: 'pan', pos: [-20.75, 3.1, 7.0], look: 'player', base: [-24.6, 1.4, 3.8], limit: 0.3, fov: 62 },
    lodge_desk: { type: 'pan', pos: [-25.25, 3.22, 4.8], look: 'player', base: [-21, 1.3, 4.3], limit: 0.35, fov: 64 },
    gate: { type: 'pan', pos: [-35.5, 2.1, 0.2], look: 'player', base: [0, 5, 0], limit: 0.35, fov: 40 },
    under_ns: { type: 'pan', pos: [0.8, 2.0, -11], look: 'player', base: [0, 3, 0], limit: 0.35, fov: 50 },
    under_ew: { type: 'pan', pos: [-11.5, 2.0, 0.8], look: 'player', base: [0, 3, 0], limit: 0.35, fov: 50 },
    arcade_n: { type: 'pan', pos: [21.8, 2.8, 16.6], look: 'player', base: [0, 3, 0], limit: 0.45, fov: 55 },
    arcade_s: { type: 'pan', pos: [21.8, 2.8, -16.6], look: 'player', base: [0, 3, 0], limit: 0.45, fov: 55 },
    n_out: { type: 'rail', from: [-19.5, 4.6, 20], to: [19.5, 4.6, 20], look: 'player', base: [0, 4, 0], limit: 0.26, fov: 55 },
    s_out: { type: 'rail', from: [-19.5, 4.6, -20], to: [19.5, 4.6, -20], look: 'player', base: [0, 4, 0], limit: 0.26, fov: 55 },
    n_in: { type: 'rail', from: [-19, 4.5, 13.2], to: [19, 4.5, 13.2], look: 'player', base: [0, 4, 0], limit: 0.5, fov: 55 },
    s_in: { type: 'rail', from: [-19, 4.5, -12.4], to: [19, 4.5, -12.4], look: 'player', base: [0, 4, 0], limit: 0.5, fov: 55 },
  };
  const zones = [
    { box: [-25.5, 2.4, -23, 7.2], cam: 'lodge_back' },
    { box: [-23, 2.4, -20.5, 7.2], cam: 'lodge_desk' },
    { box: [-33, -3, -27.9, 3], cam: 'gate' },
    { box: [-27.9, -1.9, -20, 2.05], cam: 'gate' },
    { box: [-20, -1.9, -12, 1.9], cam: 'gate' },
    { box: [-1.5, -4.3, 1.5, 4.3], cam: 'under_ns' },
    { box: [-4.3, -1.5, 4.3, 1.5], cam: 'under_ew' },
    { box: [20, 0, 23.1, 11.3], cam: 'arcade_n' },
    { box: [20, -11.3, 23.1, 0], cam: 'arcade_s' },
    { box: [-20, 8, 20, 15.5], cam: 'n_out' },
    { box: [-20, -15.5, 20, -8], cam: 's_out' },
    { box: [-20, -1.9, 20, 8], cam: 'n_in' },
    { box: [-20, -8, 20, -1.9], cam: 's_in' },
  ];

  const colliders = [
    // west range (front), lodge walls
    [-28, -16, -20, -2], [-28, 2, -20, 2.4], [-28, 2.4, -25.5, 7.2], [-28, 7.2, -20, 16], [-20.5, 2.4, -20, 7.2],
    // (the lodge door in the passage is closed: use door hotspots lodge_out <-> lodge_door_in)
    [-20, 8.2, -19.0, 13.2], [-19.0, 8.6, -18.5, 10.2],   // light well railings, the rusty bike
    // lodge furniture
    [-21.25, 4.3, -20.5, 6.1], [-24.65, 6.6, -22.35, 7.2], [-25.5, 3.2, -25.1, 6.8], [-25.5, 2.4, -24.1, 3.05], [-24.0, 2.4, -23.1, 2.9],
    // street: railed forecourts, road
    [-33, 2.8, -28, 16], [-33, -16, -28, -2.8], [-40, -3, -32.3, 3],
    // north + south ranges, east range behind its arcade (+ corner blocks), arcade piers, arcade bike rack + bench
    [-28, 15, 28, 23], [-28, -23, 28, -15],
    [23, -16, 28, 16], [20, 11.25, 28, 16], [20, -16, 28, -11.25],
    [21.1, 7.8, 23, 11.25], [22.4, 0.975, 23, 2.775],
    // Campanile plinth corners (piers) - walk in through the four step openings
    [-3.9, -3.9, -1.5, -1.5], [1.5, -3.9, 3.9, -1.5], [-3.9, 1.5, -1.5, 3.9], [1.5, 1.5, 3.9, 3.9],
    // Exam Hall portico columns
    [-14.1, -13.9, -13.5, -13.3], [-12.2, -13.9, -11.6, -13.3], [-10.2, -13.9, -9.6, -13.3], [-8.3, -13.9, -7.7, -13.3],
  ];
  for (const z of PIERS) colliders.push([20, z - 0.35, 20.7, z + 0.35]);
  for (const [x, z] of LAMPS) colliders.push([x - 0.2, z - 0.2, x + 0.2, z + 0.2]);
  for (const [x, z, r] of BENCHES) { const a = Math.abs(Math.sin(r)) > 0.5; colliders.push(a ? [x - 0.3, z - 0.9, x + 0.3, z + 0.9] : [x - 0.9, z - 0.3, x + 0.9, z + 0.3]); }
  for (const [x0, x1, z] of BIKES) colliders.push([x0 - 0.3, z - 0.9, x1 + 0.3, z < 0 ? -15 : 15]);

  // ground height: lodge floor, stoop, Campanile plinth + its four step openings
  function floor(x, z) {
    if (x < -20 && x > -25.6 && z > 2.4 && z < 7.2) return 0.46;
    if (x > -22.05 && x < -20.55 && z > 1.25 && z < 2.4) return z > 1.6 ? 0.46 : 0.23;   // the lodge stoop in the gate passage
    const ax = Math.abs(x), az = Math.abs(z), m = Math.max(ax, az);
    if (m <= 3.9) return 0.46;
    if (m <= 4.25 && Math.min(ax, az) < 1.5) return 0.23;
    return 0;
  }

  // -------------------------------------------------------------- build helpers (B / M / L live while build() runs)
  let B = null, M = null, L = {}, seed = 1;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const tc = new THREE.Color();
  function paint(g, hex) {
    tc.set(hex);
    const n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i += 3) { a[i] = tc.r; a[i + 1] = tc.g; a[i + 2] = tc.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  }
  const put = (g, hex, m) => B.add(hex == null ? g : paint(g, hex), m || M.C);
  const bx = (x0, y0, z0, x1, y1, z1, hex, m) => put(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), hex, m);
  const bc = (x, y, z, w, h, d, hex, ry, m) => { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); put(g.translate(x, y, z), hex, m); };
  const cy = (x, y0, z, rb, rt, h, seg, hex, m) => put(new THREE.CylinderGeometry(rt, rb, h, seg).translate(x, y0 + h / 2, z), hex, m);
  // vertical single-sided rectangle through (x0,z0)-(x1,z1), facing rotY r, UVs anchored to the world (tile tw x th)
  function face(x0, z0, x1, z1, y0, y1, r, m, hex, tw = 1, th = 1, uo = 0, vo = 0) {
    const g = new THREE.PlaneGeometry(Math.hypot(x1 - x0, z1 - z0), y1 - y0).rotateY(r).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv, cr = Math.cos(r), sr = Math.sin(r);
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) * cr - p.getZ(i) * sr - uo) / tw, (p.getY(i) - vo) / th);
    put(g, hex, m);
  }
  function flat(x0, z0, x1, z1, y, down, m, hex, tw = 1, th = 1) {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(down ? H : -H).translate((x0 + x1) / 2, y, (z0 + z1) / 2);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tw, -p.getZ(i) / th);
    put(g, hex, m);
  }
  // plane facing rotY r showing the atlas rect u0..u1 x v0..v1
  function quad(cx, cy0, cz, r, w, h, m, u0, v0, u1, v1) {
    const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv;
    uv.setXY(0, u0, v1); uv.setXY(1, u1, v1); uv.setXY(2, u0, v0); uv.setXY(3, u1, v0);
    put(g.rotateY(r).translate(cx, cy0, cz), null, m);
  }
  const sign = (cx, cy0, cz, r, w, h, row) => quad(cx, cy0, cz, r, w, h, M.signs, 0, 1 - (row + 1) / 8, 1, 1 - row / 8);
  // semicircular stone arch: opening centred on (cx,cz), spanning x ('x') or z ('z'), springing y0, radius R,
  // ring t, wall depth d, spandrels filled up to yTop
  function arch(cx, cz, axis, y0, R, t, d, yTop, hex, n = 7) {
    const Ro = R + t, add = (g) => { if (axis === 'z') g.rotateY(H); put(g.translate(cx, 0, cz), hex); };
    for (let i = 0; i < n; i++) {
      const a = PI * (i + 0.5) / n;
      add(new THREE.BoxGeometry(PI * (R + t / 2) / n + 0.03, t, d).rotateZ(a - H).translate(Math.cos(a) * (R + t / 2), y0 + Math.sin(a) * (R + t / 2), 0));
    }
    for (let j = 0; j < 6; j++) {
      const xa = Ro * j / 6, xb = Ro * (j + 1) / 6, yb = y0 + Math.sqrt(Math.max(0, Ro * Ro - xb * xb)) - 0.03;
      if (yTop - yb < 0.01) continue;
      for (const sd of [-1, 1]) add(new THREE.BoxGeometry(xb - xa, yTop - yb, d).translate(sd * (xa + xb) / 2, (yb + yTop) / 2, 0));
    }
  }
  function flip(g) {   // turn a geometry inside out (non-indexed, normals recomputed by Builder)
    g = g.index ? g.toNonIndexed() : g; g.deleteAttribute('normal');
    for (const k of ['position', 'uv']) {
      const a = g.attributes[k].array, s = g.attributes[k].itemSize;
      for (let i = 0; i < a.length; i += 3 * s) for (let j = 0; j < s; j++) { const t = a[i + s + j]; a[i + s + j] = a[i + 2 * s + j]; a[i + 2 * s + j] = t; }
    }
    return g;
  }
  // sloped roof: eave line centred (cx,cz) of length len, the roof faces rotY r and rises `rise` over `run` going back
  function roof(cx, cz, len, r, y0, run, rise) {
    const sl = Math.hypot(run, rise), g = new THREE.PlaneGeometry(len, sl), uv = g.attributes.uv;
    for (let i = 0; i < 4; i++) uv.setXY(i, uv.getX(i) * len, uv.getY(i) * sl * 1.5);
    g.rotateX(-Math.atan2(run, rise)).rotateY(r);
    put(g.translate(cx - Math.sin(r) * run / 2, y0 + rise / 2, cz - Math.cos(r) * run / 2), null, M.slate);
  }
  // a named dynamic prop with its own Builder
  function part(name, fn, x = 0, y = 0, z = 0) {
    const keep = B; B = new Builder(); fn(); const g = B.done(); B = keep;
    g.name = name; g.position.set(x, y, z); return g;
  }
  // small multi-part geometry for instancing: painted parts merged, light baked
  function merged(list) {
    const g = mergeGeometries(list.map((x) => (x.index ? x.toNonIndexed() : x)));
    g.computeBoundingBox(); bakeLight(g, { y0: g.boundingBox.min.y });
    return g;
  }
  const P = (g, hex) => paint(g, hex);
  const txt = (c, s, x, y, font, col, al = 'center') => { c.font = font; c.fillStyle = col; c.textAlign = al; c.textBaseline = 'middle'; c.fillText(s, x, y); };

  // -------------------------------------------------------------- textures (painted once, cached by key)
  function textures() {
    const T = {}, o = (k) => ({ key: 'sq_' + k, repeat: [1, 1] });
    const stone = (c, w, h, base, rows, dark) => {
      c.fillStyle = base; c.fillRect(0, 0, w, h);
      const rh = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let x = (r % 2) * 32 - 64; x < w; x += 64) { c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'; c.fillRect(x + 2, r * rh + 2, 60, rh - 3); }
        c.fillStyle = dark; c.fillRect(0, r * rh, w, 2);
        for (let x = (r % 2) * 32; x < w; x += 64) c.fillRect(x, r * rh, 2, rh);
      }
    };
    const streaks = (c, x0, x1, y0, y1) => { for (let i = 0; i < 7; i++) { const x = x0 + rnd() * (x1 - x0), g = c.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(20,24,28,0.28)'); g.addColorStop(1, 'rgba(20,24,28,0)'); c.fillStyle = g; c.fillRect(x, y0, 2 + rnd() * 4, (y1 - y0) * (0.5 + rnd() * 0.5)); } };
    const sash = (c, x, y, w, h) => {   // dark glass with white glazing bars, 6 over 6
      const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#46525e'); g.addColorStop(0.5, '#28313a'); g.addColorStop(1, '#1d242b');
      c.fillStyle = g; c.fillRect(x, y, w, h);
      c.fillStyle = 'rgba(190,205,220,0.18)'; c.beginPath(); c.moveTo(x, y + h * 0.35); c.lineTo(x + w * 0.6, y); c.lineTo(x + w, y); c.lineTo(x, y + h * 0.75); c.fill();
      c.fillStyle = '#e4e0d6'; c.fillRect(x, y, w, 4); c.fillRect(x, y + h - 4, w, 4); c.fillRect(x, y, 4, h); c.fillRect(x + w - 4, y, 4, h);
      c.fillRect(x, y + h / 2 - 3, w, 6);
      for (let k = 1; k < 3; k++) c.fillRect(x + w * k / 3 - 1, y, 3, h);
      c.fillRect(x, y + h / 4 - 1, w, 3); c.fillRect(x, y + h * 3 / 4 - 1, w, 3);
    };
    // upper storey bay: ashlar with a sash window
    T.upper = canvasTex(256, 256, (c, w, h) => {
      stone(c, w, h, '#999489', 8, 'rgba(40,38,34,0.35)');
      c.fillStyle = '#b3aea3'; c.fillRect(74, 24, 108, 198); c.fillRect(66, 16, 124, 12);
      sash(c, 84, 36, 88, 176);
      c.fillStyle = '#bab5aa'; c.fillRect(70, 212, 116, 10);
      streaks(c, 74, 180, 222, 256); streaks(c, 0, 256, 0, 30);
    }, o('upper'));
    // rusticated ground floor bay: plinth, channelled courses, window with flat voussoirs, string course
    const rustic = (c, w, h, win) => {
      c.fillStyle = '#8b867c'; c.fillRect(0, 0, w, h);
      const n = win ? 10 : 4, rh = (win ? h - 40 : h) / n, y0 = win ? 12 : 0;
      for (let r = 0; r < n; r++) {
        for (let x = (r % 2) * 40 - 80; x < w; x += 80) { c.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)'; c.fillRect(x + 3, y0 + r * rh + 3, 74, rh - 5); }
        c.fillStyle = 'rgba(30,28,24,0.55)'; c.fillRect(0, y0 + r * rh, w, 3);
        c.fillStyle = 'rgba(30,28,24,0.3)'; for (let x = (r % 2) * 40; x < w; x += 80) c.fillRect(x, y0 + r * rh, 2, rh);
      }
      if (!win) return;
      c.fillStyle = '#b0aba0'; c.fillRect(0, 0, w, 12);                    // string course
      c.fillStyle = '#6f6b63'; c.fillRect(0, h - 28, w, 28);                // plinth
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, h - 28, w, 3);
      c.fillStyle = '#9d988d'; c.beginPath(); c.moveTo(70, 46); c.lineTo(186, 46); c.lineTo(196, 22); c.lineTo(60, 22); c.fill();
      c.fillStyle = 'rgba(30,28,24,0.5)'; for (let k = 0; k <= 8; k++) { const x = 70 + k * 14.5; c.beginPath(); c.moveTo(x, 46); c.lineTo(60 + k * 17, 22); c.lineTo(62 + k * 17, 22); c.lineTo(x + 2, 46); c.fill(); }
      sash(c, 86, 46, 84, 134);
      c.fillStyle = '#b5b0a5'; c.fillRect(78, 180, 100, 9);
      streaks(c, 80, 176, 189, 228);
    };
    T.ground = canvasTex(256, 256, (c, w, h) => rustic(c, w, h, true), o('ground'));
    T.plain = canvasTex(128, 128, (c, w, h) => rustic(c, w, h, false), o('plain'));
    T.slate = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#3c434b'; c.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) for (let x = (r % 2) * 8 - 16; x < w; x += 16) { c.fillStyle = `rgb(${52 + rnd() * 14},${58 + rnd() * 14},${66 + rnd() * 14})`; c.fillRect(x + 1, r * 16 + 1, 14, 14); }
    }, o('slate'));
    T.flags = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#4e5156'; c.fillRect(0, 0, w, h);
      for (let r = 0; r < 4; r++) for (let x = (r % 2) * 21 - 42; x < w; x += 42) { const v = 108 + rnd() * 26; c.fillStyle = `rgb(${v},${v + 2},${v + 5})`; c.fillRect(x + 2, r * 32 + 2, 39, 29); }
    }, o('flags'));
    T.panel = canvasTex(128, 256, (c, w, h) => {   // one bay of lodge panelling, 1.2 m x 2.9 m
      c.fillStyle = '#6b4526'; c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 4) { c.fillStyle = `rgba(${rnd() < 0.5 ? '40,20,8' : '150,100,60'},0.12)`; c.fillRect(x, 0, 2, h); }
      const pnl = (y, hh) => { c.fillStyle = '#5a3a20'; c.fillRect(12, y, w - 24, hh); c.fillStyle = '#7c5431'; c.fillRect(18, y + 6, w - 36, hh - 12); c.fillStyle = 'rgba(255,220,170,0.12)'; c.fillRect(18, y + 6, w - 36, 3); };
      pnl(h - 92, 76); pnl(28, h - 136);
      c.fillStyle = '#4a2e18'; c.fillRect(0, h - 104, w, 8); c.fillRect(0, 0, w, 14); c.fillRect(0, h - 10, w, 10);
    }, o('panel'));
    T.boards = canvasTex(128, 128, (c, w, h) => {
      for (let i = 0; i < 8; i++) { const v = rnd(); c.fillStyle = `rgb(${96 + v * 30},${62 + v * 20},${36 + v * 12})`; c.fillRect(i * 16, 0, 16, h); c.fillStyle = 'rgba(30,15,5,0.6)'; c.fillRect(i * 16, 0, 2, h); c.fillRect(i * 16, (i * 37) % h, 16, 2); }
    }, o('boards'));
    T.pigeon = canvasTex(256, 256, (c, w, h) => {   // 10 x 8 cubbies full of letters, with name slips
      c.fillStyle = '#6a4424'; c.fillRect(0, 0, w, h);
      for (let r = 0; r < 8; r++) for (let k = 0; k < 10; k++) {
        const x = 6 + k * 24.5, y = 6 + r * 31;
        c.fillStyle = '#24160c'; c.fillRect(x, y, 21, 21);
        const n = Math.floor(rnd() * 4);
        for (let e = 0; e < n; e++) { c.fillStyle = ['#efe9dc', '#e2d8c2', '#d9e2ea', '#f2e6c8'][e]; c.save(); c.translate(x + 10, y + 13 - e * 2); c.rotate((rnd() - 0.5) * 0.5); c.fillRect(-8, -5, 16, 11); if (rnd() < 0.3) { c.fillStyle = '#b8342c'; c.fillRect(-8, -5, 16, 2); } c.restore(); }
        c.fillStyle = '#e8dcc0'; c.fillRect(x + 3, y + 23, 15, 5);
      }
    }, o('pigeon'));
    T.keys = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#5c3a1e'; c.fillRect(0, 0, w, h); c.fillStyle = '#7a5530'; c.fillRect(5, 5, w - 10, h - 10);
      for (let r = 0; r < 4; r++) for (let k = 0; k < 7; k++) {
        const x = 14 + k * 16.5, y = 16 + r * 28;
        c.fillStyle = '#c8c0a8'; c.fillRect(x - 1, y - 3, 3, 3);
        if (r === 2 && k === 2) continue;   // the big brass key is a real prop
        if (rnd() < 0.2) continue;
        c.fillStyle = rnd() < 0.5 ? '#c9a33e' : '#b6b8ba'; c.beginPath(); c.arc(x, y + 4, 3, 0, 7); c.fill(); c.fillRect(x - 1, y + 6, 2, 9); c.fillRect(x, y + 12, 3, 2);
        c.fillStyle = '#efe6cc'; c.fillRect(x + 3, y + 2, 5, 8);
      }
    }, o('keys'));
    T.cal = canvasTex(128, 160, (c, w, h) => {   // October 1987, the donkey month
      c.fillStyle = '#f1ece0'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#9cc0d8'; c.fillRect(8, 8, w - 16, 56); c.fillStyle = '#6f9a4e'; c.fillRect(8, 44, w - 16, 20);
      c.fillStyle = '#7a6a5a'; c.fillRect(44, 30, 38, 18); c.fillRect(78, 20, 12, 18); c.fillRect(86, 16, 6, 8); c.fillRect(80, 12, 3, 9); c.fillRect(46, 46, 5, 12); c.fillRect(74, 46, 5, 12);
      c.fillStyle = '#2a2a2a'; c.fillRect(89, 24, 2, 2);
      txt(c, 'OCTOBER 1987', w / 2, 76, 'bold 13px Georgia, serif', '#8a2424');
      c.fillStyle = '#555'; for (let r = 0; r < 5; r++) for (let k = 0; k < 7; k++) c.fillRect(12 + k * 15.5, 88 + r * 13, 11, 8);
      c.strokeStyle = '#c22'; c.lineWidth = 2; c.beginPath(); c.arc(12 + 2 * 15.5 + 5, 88 + 5, 8, 0, 7); c.stroke();
    }, { key: 'sq_cal' });
    T.news = canvasTex(128, 128, (c, w, h) => {
      c.fillStyle = '#ddd7c8'; c.fillRect(0, 0, w, h);
      txt(c, 'THE DUBLIN DAILY', w / 2, 12, 'bold 13px Georgia, serif', '#111');
      c.fillStyle = '#222'; c.fillRect(4, 20, w - 8, 1); c.fillRect(4, 30, w - 8, 1);
      txt(c, 'Tuesday, 6 October 1987', w / 2, 25, '8px Georgia, serif', '#222');
      txt(c, "THEY'RE ALL LEAVING", w / 2, 40, 'bold 11px Arial, sans-serif', '#111');
      c.fillStyle = '#8a8a86'; c.fillRect(6, 50, 54, 38);
      c.fillStyle = '#666'; for (let y = 52; y < h - 6; y += 5) { c.fillRect(66, y, 56, 2); if (y > 92) c.fillRect(6, y, 54, 2); }
    }, { key: 'sq_news' });
    T.photo = canvasTex(128, 128, (c, w, h) => {   // black-and-white Campanile
      c.fillStyle = '#efeadf'; c.fillRect(0, 0, w, h);
      const g = c.createLinearGradient(0, 12, 0, 116); g.addColorStop(0, '#b9b9b6'); g.addColorStop(1, '#8c8c8a'); c.fillStyle = g; c.fillRect(12, 12, 104, 104);
      c.fillStyle = '#4a4a48'; c.fillRect(12, 100, 104, 16);
      c.fillStyle = '#5e5e5b'; c.fillRect(44, 60, 40, 40); c.fillRect(48, 36, 32, 24); c.beginPath(); c.arc(64, 36, 14, PI, 0); c.fill(); c.fillRect(62, 14, 4, 10);
      c.fillStyle = '#9a9a97'; c.beginPath(); c.arc(64, 84, 9, PI, 0); c.fill(); c.fillRect(55, 84, 18, 16); c.fillRect(56, 44, 16, 12);
    }, { key: 'sq_photo' });
    T.clock = canvasTex(128, 128, (c, w, h) => {   // 11:55
      c.fillStyle = '#f4efe2'; c.beginPath(); c.arc(64, 64, 62, 0, 7); c.fill();
      c.fillStyle = '#222'; for (let i = 0; i < 12; i++) { const a = i * PI / 6; c.save(); c.translate(64 + Math.sin(a) * 52, 64 - Math.cos(a) * 52); c.rotate(a); c.fillRect(-2, -6, 4, 12); c.restore(); }
      c.strokeStyle = '#111'; c.lineCap = 'round';
      const hand = (a, l, wd) => { c.lineWidth = wd; c.beginPath(); c.moveTo(64, 64); c.lineTo(64 + Math.sin(a) * l, 64 - Math.cos(a) * l); c.stroke(); };
      hand((11 + 55 / 60) * PI / 6, 30, 6); hand(55 * PI / 30, 46, 4);
    }, { key: 'sq_clock' });
    T.signs = canvasTex(256, 256, (c, w, h) => {
      const row = (i, bg, fg, s, font) => { c.fillStyle = bg; c.fillRect(0, i * 32, w, 32); c.strokeStyle = fg; c.lineWidth = 2; c.strokeRect(3, i * 32 + 3, w - 6, 26); txt(c, s, w / 2, i * 32 + 17, font, fg); };
      row(0, '#efe6cf', '#4a2c16', "PORTERS' LODGE  ·  ENQUIRIES", 'bold 15px Georgia, serif');
      row(1, '#1e3a2a', '#d8b860', 'THE BUTTERY', 'bold 20px Georgia, serif');
      row(2, '#a8a397', '#2f2c27', 'EXAMINATION HALL', 'bold 18px Georgia, serif');
      row(3, '#3b2f28', '#f1efe8', 'ARTS BUILDING', 'bold 19px Arial, sans-serif');
      row(4, '#e9e6de', '#24303c', 'COMPUTER LABORATORY · BASEMENT', 'bold 13px Arial, sans-serif');
      row(5, '#1c1c1c', '#d9c78a', 'THE OLD LIBRARY', 'bold 19px Georgia, serif');
      row(6, '#efe6cf', '#3a2a1a', 'LOST PROPERTY', 'bold 18px Georgia, serif');
      row(7, '#162a40', '#e8e2d0', 'No. 6', 'bold 20px Georgia, serif');
    }, { key: 'sq_signs' });
    T.notice = canvasTex(256, 256, (c, w, h) => {   // cork board: prize poster (left), gig poster (right top), timetable + notes
      c.fillStyle = '#9b7a52'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { c.fillStyle = rnd() < 0.5 ? 'rgba(60,40,20,0.25)' : 'rgba(200,170,120,0.2)'; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
      c.fillStyle = '#f3efe4'; c.fillRect(8, 8, 118, 240);
      c.fillStyle = '#1d3b6e'; c.fillRect(8, 8, 118, 44);
      txt(c, 'TRINITY', 67, 20, 'bold 13px Georgia, serif', '#f3efe4'); txt(c, 'ENTERPRISE', 67, 33, 'bold 13px Georgia, serif', '#f3efe4'); txt(c, 'PRIZE 1987', 67, 46, 'bold 12px Georgia, serif', '#e0c060');
      const L1 = ['FINAL', 'Friday 23 October', 'The Exam Hall', '', 'Judge:', 'Mr G. Fenwick', 'Fenwick Hale', 'Stockbrokers, London', '', 'Winner receives a', 'graduate placement', 'in the City.', '', 'Finalists include:'];
      L1.forEach((s, i) => txt(c, s, 67, 64 + i * 11, (i === 0 ? 'bold 11px' : '9px') + ' Georgia, serif', '#222'));
      txt(c, 'RUE (Business Studies)', 67, 222, 'bold 9px Georgia, serif', '#8a1c1c');
      c.fillStyle = '#e24a8a'; c.fillRect(136, 8, 112, 118); c.fillStyle = '#111'; c.fillRect(142, 14, 100, 106);
      txt(c, 'THE', 192, 30, 'bold 12px Arial, sans-serif', '#e24a8a'); txt(c, 'WET', 192, 50, 'bold 22px Arial, sans-serif', '#f4f0e6'); txt(c, 'WEEKENDS', 192, 72, 'bold 17px Arial, sans-serif', '#f4f0e6');
      txt(c, 'LIVE · Fri 9 Oct', 192, 94, '10px Arial, sans-serif', '#e24a8a'); txt(c, 'Buttery Bar £2', 192, 108, '10px Arial, sans-serif', '#e24a8a');
      c.fillStyle = '#fbf6d8'; c.fillRect(136, 134, 112, 58);
      ['BUSINESS STUDIES', 'Lectures: Tuesdays', '2 pm, Arts Building', 'Prof. Hartigan'].forEach((s, i) => txt(c, s, 192, 146 + i * 13, (i ? '9px' : 'bold 9px') + ' Arial, sans-serif', '#222'));
      c.fillStyle = '#dfe9f2'; c.fillRect(138, 200, 50, 48); c.fillStyle = '#f2dcdc'; c.fillRect(196, 202, 52, 44);
      txt(c, 'ROOM', 163, 214, 'bold 9px Arial', '#333'); txt(c, 'TO LET', 163, 226, 'bold 9px Arial', '#333');
      txt(c, 'LOST:', 222, 214, 'bold 9px Arial', '#333'); txt(c, 'scarf', 222, 227, '9px Arial', '#333');
      for (const [x, y] of [[12, 12], [122, 12], [140, 12], [244, 12], [140, 138], [162, 204], [222, 206]]) { c.fillStyle = '#c22'; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
    }, { key: 'sq_notice' });
    T.streak = canvasTex(64, 128, (c, w, h) => {   // rain running down glass (animated by offset)
      c.fillStyle = 'rgba(150,170,190,0.16)'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 16; i++) { const x = rnd() * w, y = rnd() * h, l = 10 + rnd() * 40; c.fillStyle = 'rgba(225,235,245,0.45)'; c.fillRect(x, y, 1.5, l); c.beginPath(); c.arc(x + 0.7, y + l, 2, 0, 7); c.fill(); }
      for (let i = 0; i < 30; i++) { c.fillStyle = 'rgba(230,240,250,0.5)'; c.fillRect(rnd() * w, rnd() * h, 2, 2); }
    }, { key: 'sq_streak', repeat: [1.6, 1] });
    T.lit = canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#ffcf86'; c.fillRect(0, 0, w, h); c.fillStyle = '#6a4a2a'; c.fillRect(0, 30, w, 4); c.fillRect(20, 0, 3, h); c.fillRect(41, 0, 3, h); c.fillRect(0, 14, w, 2); c.fillRect(0, 48, w, 2); }, { key: 'sq_lit' });
    T.foot = canvasTex(64, 64, (c) => { c.fillStyle = '#fff'; c.beginPath(); c.ellipse(32, 21, 22, 20, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(32, 51, 16, 12, 0, 0, 7); c.fill(); }, { key: 'sq_foot' });
    T.ring = canvasTex(64, 64, (c) => { c.strokeStyle = '#fff'; c.lineWidth = 3; c.beginPath(); c.arc(32, 32, 26, 0, 7); c.stroke(); }, { key: 'sq_ring' });
    T.pool = canvasTex(64, 64, (c, w) => { const g = c.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,200,120,0.55)'); g.addColorStop(0.5, 'rgba(255,170,90,0.18)'); g.addColorStop(1, 'rgba(255,160,80,0)'); c.fillStyle = g; c.fillRect(0, 0, w, w); }, { key: 'sq_pool' });
    T.yes = canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#141d3a'; c.fillRect(0, 0, w, h); txt(c, 'Yes', w / 2, h / 2 + 2, 'italic bold 40px "Brush Script MT", "Comic Sans MS", cursive', '#ffd21f'); }, { key: 'sq_yes' });
    return T;
  }

  // -------------------------------------------------------------- instanced models
  function cobbleGeo() {   // hipped sett (short ridge on top): 6 triangles, winding fixed to face outward
    const b = 0.19, h = 0.05, V = [[-b, 0, -b], [b, 0, -b], [b, 0, b], [-b, 0, b], [-0.07, h, 0], [0.07, h, 0]];
    const I = [0, 4, 5, 0, 5, 1, 1, 5, 2, 2, 5, 4, 2, 4, 3, 3, 4, 0], pos = [];
    const a = new THREE.Vector3(), bb = new THREE.Vector3(), cc = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < I.length; i += 3) {
      a.fromArray(V[I[i]]); bb.fromArray(V[I[i + 1]]); cc.fromArray(V[I[i + 2]]);
      n.subVectors(bb, a).cross(cc.clone().sub(a));
      const out = (a.x + bb.x + cc.x) * n.x + (a.y + bb.y + cc.y + 0.3) * n.y + (a.z + bb.z + cc.z) * n.z > 0;
      pos.push(...a.toArray(), ...(out ? bb : cc).toArray(), ...(out ? cc : bb).toArray());
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.computeVertexNormals(); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    return g;
  }
  const benchGeo = () => {
    const l = [];
    for (let i = 0; i < 3; i++) l.push(P(new THREE.BoxGeometry(1.8, 0.04, 0.11).translate(0, 0.45, 0.14 - i * 0.14), 0x6d4b2c));
    for (let i = 0; i < 2; i++) l.push(P(new THREE.BoxGeometry(1.8, 0.1, 0.035).rotateX(-0.2).translate(0, 0.6 + i * 0.16, -0.22 - i * 0.03), 0x6d4b2c));
    for (const x of [-0.8, 0.8]) {
      l.push(P(new THREE.BoxGeometry(0.05, 0.45, 0.05).translate(x, 0.22, 0.2), 0x1c1f22), P(new THREE.BoxGeometry(0.05, 0.85, 0.05).rotateX(-0.12).translate(x, 0.42, -0.2), 0x1c1f22));
      l.push(P(new THREE.BoxGeometry(0.05, 0.04, 0.5).translate(x, 0.66, 0.02), 0x1c1f22));
    }
    return merged(l);
  };
  const bikeGeo = (rust) => {   // along local z; frame white (tinted per instance) unless rusty
    const f = rust ? 0x6a3f28 : 0xf2f2f2, l = [], tube = (y0, z0, y1, z1, r = 0.018) => {
      const len = Math.hypot(y1 - y0, z1 - z0), g = new THREE.CylinderGeometry(r, r, len, 5);
      g.rotateX(Math.atan2(z1 - z0, y1 - y0)); l.push(P(g.translate(0, (y0 + y1) / 2, (z0 + z1) / 2), f));
    };
    for (const z of [-0.52, 0.52]) { l.push(P(new THREE.TorusGeometry(0.33, 0.022, 3, 12).rotateY(H).translate(0, 0.35, z), 0x151515)); l.push(P(new THREE.BoxGeometry(0.02, 0.02, 0.6).rotateX(0.5).translate(0, 0.35, z), 0x9a9a9a)); }
    tube(0.35, -0.52, 0.62, -0.12); tube(0.35, -0.52, 0.36, 0.0); tube(0.36, 0.0, 0.85, -0.18); tube(0.36, 0.0, 0.8, 0.38);
    tube(0.8, 0.38, 0.35, 0.52); tube(0.8, -0.14, 0.8, 0.38); tube(0.8, 0.38, 1.0, 0.36, 0.015);
    l.push(P(new THREE.BoxGeometry(0.5, 0.025, 0.03).translate(0, 1.0, 0.33), 0x2a2a2a), P(new THREE.BoxGeometry(0.13, 0.05, 0.26).translate(0, 0.9, -0.2), 0x3a2a1e));
    l.push(P(new THREE.BoxGeometry(0.12, 0.04, 0.34).translate(0, 0.38, -0.02), 0x2a2a2a));
    if (rust) { l.push(P(new THREE.CylinderGeometry(0.03, 0.03, 0.09, 6).translate(0.06, 0.62, 0.47), 0x9a9da0), P(new THREE.CylinderGeometry(0.06, 0.05, 0.08, 7).rotateX(H).translate(0, 0.86, 0.52), 0x7a4a2a)); }
    return merged(l);
  };
  function pigeonGeo() {
    return merged([
      P(new THREE.SphereGeometry(0.09, 6, 4).scale(0.85, 0.72, 1.3).translate(0, 0.13, 0), 0x818892),
      P(new THREE.BoxGeometry(0.05, 0.05, 0.16).translate(-0.075, 0.15, -0.02), 0x676e78), P(new THREE.BoxGeometry(0.05, 0.05, 0.16).translate(0.075, 0.15, -0.02), 0x676e78),
      P(new THREE.BoxGeometry(0.07, 0.02, 0.1).translate(0, 0.15, -0.15), 0x474c54),
      P(new THREE.BoxGeometry(0.06, 0.05, 0.05).translate(0, 0.2, 0.09), 0x4f7a6d),
      P(new THREE.SphereGeometry(0.042, 5, 3).translate(0, 0.25, 0.12), 0x5e656e),
      P(new THREE.BoxGeometry(0.015, 0.015, 0.03).translate(0, 0.245, 0.17), 0x2a2522),
      P(new THREE.BoxGeometry(0.02, 0.06, 0.02).translate(-0.03, 0.03, 0.01), 0xb06a6a), P(new THREE.BoxGeometry(0.02, 0.06, 0.02).translate(0.03, 0.03, 0.01), 0xb06a6a),
    ]);
  }

  // -------------------------------------------------------------- the build
  function build() {
    seed = 1; B = new Builder(); L = { lamps: [] };
    const T = textures(), root = new THREE.Group(); L.root = root;
    const warm = { emissive: 0xffdcae, emissiveIntensity: 0.42 };
    M = {
      C: mat(0xffffff), CL: mat(0xffffff, { emissive: 0x3a2814 }),
      upper: matTex(T.upper), ground: matTex(T.ground), plain: matTex(T.plain), slate: matTex(T.slate), flags: matTex(T.flags),
      panel: matTex(T.panel, warm), boards: matTex(T.boards, warm), pigeon: matTex(T.pigeon, warm), keys: matTex(T.keys, warm),
      cal: matTex(T.cal, warm), news: matTex(T.news, warm), photo: matTex(T.photo, warm), clock: matTex(T.clock, warm),
      signs: matTex(T.signs), notice: matTex(T.notice), lit: matTex(T.lit, { emissive: 0xffffff }),
      glass: matTex(T.streak, { transparent: true, side: THREE.DoubleSide, key: 'sq_glass' }),
      glow: mat(0xfff2cc, { emissive: 0xffc36a }), heat: mat(0xff8a3a, { emissive: 0xff5a18 }),
      puddle: mat(0x7d8995, { transparent: true, opacity: 0.8 }),
    };
    L.glassTex = T.streak;
    const STONE = 0xa29d92, LIGHT = 0xb7b2a6, DARK = 0x1c1f22;

    // ---------------- ground
    flat(-28, -23, 28, 23, 0, false, M.C, 0x2a2d31);                     // grout under the setts (and under the ranges)
    flat(-33, -16, -28, 16, 0.004, false, M.flags, null, 1.3, 1.3);     // College Green pavement
    flat(-31, 2.8, -28, 16, 0.01, false, M.C, 0x3c5634); flat(-31, -16, -28, -2.8, 0.01, false, M.C, 0x3c5634);
    bx(-33.15, -0.12, -20, -33, 0.02, 20, 0x8a8b8c);
    flat(-60, -24, -33.15, 24, -0.12, false, M.C, 0x2c2f33);
    for (let z = -22; z < 22; z += 3) bx(-44.6, -0.115, z, -44.4, -0.11, z + 1.6, 0xc9c6b8);
    flat(20, -11.25, 23, 11.25, 0.006, false, M.flags, null, 1.3, 1.3);  // arcade floor
    // puddles (merged, transparent)
    for (const [x, z, rx, rz] of PUDDLES) put(new THREE.CircleGeometry(1, 12).rotateX(-H).scale(rx, 1, rz).rotateY(rnd() * 3).translate(x, 0.028, z), 0x8e9aa6, M.puddle);

    // ---------------- west range: square facade (x = -20), pavilion + Front Gate passage, lodge, street facade
    face(-20, -3.2, -20, -15, 0, 4.2, H, M.ground, null, 3.933, 4.2, 3.2, 0);
    face(-20, 8.2, -20, 15, 0, 4.2, H, M.ground, null, 3.4, 4.2, -15, 0);
    face(-20, -3.2, -20, -15, 4.2, 11.4, H, M.upper, null, 3.933, 3.6, 3.2, 4.2);
    face(-20, 3.2, -20, 15, 4.2, 11.4, H, M.upper, null, 3.933, 3.6, -15, 4.2);
    // lodge front on the square: the big window (z 4.6-6.5, y 1.36-3.0) is a real opening; the door is in the gate passage
    const lf = (z0, z1, y0, y1) => face(-20, z0, -20, z1, y0, y1, H, M.plain, null, 2, 1.4);
    lf(3.2, 4.6, 0, 4.2); lf(4.6, 6.5, 0, 1.36); lf(4.6, 6.5, 3.0, 4.2); lf(6.5, 8.2, 0, 4.2);
    face(-20.5, 4.6, -20, 4.6, 1.36, 3.0, 0, M.plain, null, 2, 1.4); face(-20.5, 6.5, -20, 6.5, 1.36, 3.0, PI, M.plain, null, 2, 1.4);
    flat(-20.5, 4.6, -20, 6.5, 3.0, true, M.C, 0x8b867c); flat(-20.5, 4.6, -20, 6.5, 1.36, false, M.C, 0x9a958a);
    bx(-20.05, 1.26, 4.5, -19.84, 1.36, 6.6, LIGHT); bx(-20.05, 3.0, 4.45, -19.8, 3.14, 6.65, LIGHT);          // sill, hood
    // window: frame, sashes, glazing bars, streaked glass
    bx(-20.32, 1.36, 4.6, -20.2, 1.44, 6.5, 0xe4e0d6); bx(-20.32, 2.92, 4.6, -20.2, 3.0, 6.5, 0xe4e0d6);
    bx(-20.32, 1.36, 4.6, -20.2, 3.0, 4.68, 0xe4e0d6); bx(-20.32, 1.36, 6.42, -20.2, 3.0, 6.5, 0xe4e0d6);
    bx(-20.33, 1.36, 5.51, -20.19, 3.0, 5.59, 0xe4e0d6); bx(-20.32, 2.16, 4.6, -20.2, 2.22, 6.5, 0xe4e0d6);
    for (const z of [5.07, 6.03]) bx(-20.3, 1.36, z - 0.015, -20.22, 3.0, z + 0.015, 0xe4e0d6);
    face(-20.26, 4.65, -20.26, 6.45, 1.42, 2.94, H, M.glass, null, 1.2, 1.6);
    // downpipe + gully by the window, light well railings
    cy(-19.9, 0.32, 6.95, 0.06, 0.06, 12.1, 6, DARK); bx(-20, 12.2, 6.75, -19.75, 12.5, 7.15, DARK);
    bc(-19.8, 0.3, 6.95, 0.14, 0.1, 0.14, DARK); bx(-19.75, 0.005, 6.75, -19.35, 0.02, 7.15, 0x151719);
    flat(-20, 8.2, -19.1, 13.2, 0.012, false, M.C, 0x0b0c0e);
    bx(-19.2, 0, 8.2, -19.05, 0.18, 13.2, 0x8f8a80);
    bx(-19.15, 0.95, 8.2, -19.1, 1.0, 13.2, DARK); bx(-19.15, 0.2, 8.2, -19.1, 0.24, 13.2, DARK);
    for (let z = 8.25; z < 13.2; z += 0.14) { bx(-19.145, 0.18, z, -19.115, 1.08, z + 0.03, DARK); bc(-19.13, 1.12, z + 0.015, 0.05, 0.08, 0.05, DARK, PI / 4); }
    for (const z of [8.2, 13.17]) for (let x = -19.95; x < -19.1; x += 0.14) bx(x, 0.18, z, x + 0.03, 1.08, z + 0.03, DARK);
    // pavilion (square side): rusticated piers, arch, big window, pediment
    for (let y = 0; y < 3.4; y += 0.425) { const k = Math.round(y / 0.425) % 2 ? 0.03 : 0; bx(-20, y, -3.2, -19.55 + k, y + 0.41, -2.0, STONE); bx(-20, y, 2.0, -19.55 + k, y + 0.41, 3.2, STONE); }
    arch(-19.775, 0, 'z', 3.4, 2.0, 0.42, 0.45, 6.2, STONE); bc(-19.53, 5.6, 0, 0.1, 0.6, 0.5, LIGHT);
    bx(-20, 3.4, -3.2, -19.55, 6.2, -2.42, STONE); bx(-20, 3.4, 2.42, -19.55, 6.2, 3.2, STONE);
    bx(-20.05, 6.2, -3.35, -19.4, 6.5, 3.35, LIGHT); bx(-20, 6.5, -3.2, -19.6, 11.4, 3.2, 0xa9a498);
    bx(-19.63, 7.0, -1.1, -19.58, 9.9, 1.1, 0x252c33); bx(-19.62, 7.0, -1.2, -19.5, 7.1, 1.2, 0xe4e0d6); bx(-19.62, 9.8, -1.2, -19.5, 9.9, 1.2, 0xe4e0d6);
    for (const z of [-1.15, -0.4, 0.35, 1.1]) bx(-19.62, 7.0, z - 0.04, -19.55, 9.9, z + 0.04, 0xe4e0d6);
    bx(-19.62, 8.4, -1.1, -19.55, 8.46, 1.1, 0xe4e0d6); bx(-19.7, 9.95, -1.5, -19.4, 10.2, 1.5, LIGHT); bx(-19.7, 6.6, -1.4, -19.4, 6.95, 1.4, LIGHT);
    for (const z of [-2.8, 2.8]) bx(-19.62, 6.5, z - 0.3, -19.5, 11.4, z + 0.3, LIGHT);
    const ped = (x, face1) => { const sh = new THREE.Shape(); sh.moveTo(-3.6, 0); sh.lineTo(3.6, 0); sh.lineTo(0, 2.1); sh.lineTo(-3.6, 0);
      const g = new THREE.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false }).rotateY(face1).translate(x, 12.4, 0); put(g, LIGHT); };
    ped(-20.25, H); ped(-27.75, -H);
    // Front Gate passage (x -28..-20, z -2..2): walls (lodge door + enquiries hatch in the north wall), vault, gates
    // folded back, lantern, posters, the lodge stoop
    face(-28, -2, -20, -2, 0, 3.4, 0, M.plain, null, 2, 1.4);
    const pn = (x0, x1, y0, y1) => face(x0, 2, x1, 2, y0, y1, PI, M.plain, null, 2, 1.4);
    pn(-28, -24, 0, 3.4); pn(-24, -23.1, 0, 1.4); pn(-24, -23.1, 2.3, 3.4); pn(-23.1, -21.9, 0, 3.4); pn(-21.9, -20.7, 2.9, 3.4); pn(-20.7, -20, 0, 3.4);
    face(-21.9, 2, -21.9, 2.4, 0.46, 2.9, H, M.plain, null, 2, 1.4); face(-20.7, 2, -20.7, 2.4, 0.46, 2.9, -H, M.plain, null, 2, 1.4); flat(-21.9, 2, -20.7, 2.4, 2.9, true, M.C, 0x8b867c);
    face(-24, 2, -24, 2.4, 1.4, 2.3, H, M.plain, null, 2, 1.4); face(-23.1, 2, -23.1, 2.4, 1.4, 2.3, -H, M.plain, null, 2, 1.4);
    flat(-24, 2, -23.1, 2.4, 2.3, true, M.C, 0x8b867c); bx(-24.08, 1.32, 1.84, -23.02, 1.4, 2.4, 0x6e4a2a);
    bx(-24, 1.4, 2.17, -23.1, 1.46, 2.23, 0xe4e0d6); bx(-24, 2.24, 2.17, -23.1, 2.3, 2.23, 0xe4e0d6); bx(-23.58, 1.4, 2.17, -23.52, 2.3, 2.23, 0xe4e0d6);
    face(-24, 2.2, -23.1, 2.2, 1.46, 2.24, PI, M.glass, null, 1.2, 1.6);
    sign(-21.3, 3.12, 1.975, PI, 1.4, 0.18, 0);
    bx(-22.05, 0, 1.6, -20.55, 0.46, 2.02, 0x8f8a80); bx(-22.05, 0, 1.25, -20.55, 0.23, 1.6, 0x8f8a80);
    put(flip(new THREE.CylinderGeometry(2, 2, 8, 10, 1, true, 0, PI).rotateZ(H).translate(-24, 3.4, 0)), 0x8e897f);
    bx(-27.9, 0, -2, -26.0, 4.3, -1.9, 0x3a2818); bx(-27.9, 0, 1.9, -26.0, 4.3, 2, 0x3a2818);
    for (const s of [-1, 1]) for (let x = -27.7; x < -26.1; x += 0.45) bx(x, 0.2, s * 1.89 - 0.02, x + 0.35, 4.1, s * 1.89 + 0.02, 0x4a3422);
    cy(-24, 4.6, 0, 0.01, 0.01, 0.8, 4, DARK);
    quad(-22.6, 1.55, -1.97, 0, 0.62, 0.66, M.notice, 136 / 256, 130 / 256, 248 / 256, 248 / 256);
    quad(-24.2, 1.6, -1.97, 0, 0.5, 0.9, M.notice, 8 / 256, 8 / 256, 126 / 256, 248 / 256);
    // street side: facade, pavilion + arch, forecourt railings, statues, phone box, postbox, far side of the Green
    face(-28, -16, -28, -3.2, 0, 4.2, -H, M.ground, null, 4.27, 4.2, -16, 0); face(-28, 3.2, -28, 16, 0, 4.2, -H, M.ground, null, 4.27, 4.2, 3.2, 0);
    face(-28, -16, -28, -3.2, 4.2, 11.4, -H, M.upper, null, 4.27, 3.6, -16, 4.2); face(-28, 3.2, -28, 16, 4.2, 11.4, -H, M.upper, null, 4.27, 3.6, 3.2, 4.2);
    for (let y = 0; y < 3.4; y += 0.425) { const k = Math.round(y / 0.425) % 2 ? 0.03 : 0; bx(-28.45 - k, y, -3.2, -28, y + 0.41, -2.0, STONE); bx(-28.45 - k, y, 2.0, -28, y + 0.41, 3.2, STONE); }
    arch(-28.225, 0, 'z', 3.4, 2.0, 0.42, 0.45, 6.2, STONE); bc(-28.47, 5.6, 0, 0.1, 0.6, 0.5, LIGHT);
    bx(-28.45, 3.4, -3.2, -28, 6.2, -2.42, STONE); bx(-28.45, 3.4, 2.42, -28, 6.2, 3.2, STONE);
    bx(-28.6, 6.2, -3.35, -27.95, 6.5, 3.35, LIGHT); bx(-28.4, 6.5, -3.2, -28, 11.4, 3.2, 0xa9a498);
    for (const z of [-2.2, -0.75, 0.75, 2.2]) { cy(-28.75, 6.5, z, 0.22, 0.2, 4.7, 8, LIGHT); bx(-29.0, 11.2, z - 0.3, -28.5, 11.4, z + 0.3, LIGHT); }
    bx(-28.43, 7.2, -0.5, -28.38, 9.8, 0.5, 0x252c33);
    for (const s of [-1, 1]) {
      bx(-31.1, 0, s > 0 ? 2.8 : -16, -30.9, 0.45, s > 0 ? 16 : -2.8, STONE);
      for (let z = s > 0 ? 2.85 : -15.95; z < (s > 0 ? 16 : -2.8); z += 0.16) bx(-31.02, 0.45, z, -30.98, 1.6, z + 0.03, DARK);
      bx(-31.03, 1.5, s > 0 ? 2.8 : -16, -30.97, 1.55, s > 0 ? 16 : -2.8, DARK);
      bx(-31.3, 0, s * 2.8 - 0.3, -30.7, 1.9, s * 2.8 + 0.3, STONE);
      bx(-30.5, 0, s * 5.5 - 0.55, -29.4, 1.7, s * 5.5 + 0.55, STONE);
      cy(-29.95, 1.7, s * 5.5, 0.28, 0.22, 1.1, 7, 0x3e5a4c); cy(-29.95, 2.8, s * 5.5, 0.14, 0.14, 0.25, 7, 0x3e5a4c); cy(-29.95, 3.05, s * 5.5, 0.13, 0.1, 0.24, 7, 0x3e5a4c);
    }
    bx(-32.8, 0, -6.6, -32.0, 2.4, -5.8, 0xdad2b8); bx(-32.82, 0.3, -6.5, -31.98, 2.1, -5.9, 0x2b3530); bx(-32.8, 2.4, -6.6, -32.0, 2.6, -5.8, 0x2f5a3c);
    cy(-32.5, 0, -3.8, 0.24, 0.24, 1.2, 8, 0x2f5a3c); cy(-32.5, 1.2, -3.8, 0.27, 0.05, 0.18, 8, 0x2f5a3c);
    face(-52, -24, -52, 24, 0, 4.2, H, M.ground, null, 4, 4.2); face(-52, -24, -52, 24, 4.2, 11.4, H, M.upper, null, 4, 3.6, 0, 4.2);

    // ---------------- north range (z = 15), doors: No. 6, the Buttery, the computer lab stairs
    face(20, 15, -20, 15, 0, 4.2, PI, M.ground, null, 40 / 11, 4.2, -20, 0);
    face(20, 15, -20, 15, 4.2, 11.4, PI, M.upper, null, 40 / 11, 3.6, -20, 4.2);
    const door = (x, z, r, w, h, col, row) => {   // flat door (front-facing planes only), stone step, sign above
      const s = Math.sin(r), c = Math.cos(r), f = (d) => [x + s * d, z + c * d];
      const [ax, az] = f(0.02), [bx2, bz] = f(0.03), [cx2, cz2] = f(0.04);
      face(ax - c * (w / 2 + 0.25), az + s * (w / 2 + 0.25), ax + c * (w / 2 + 0.25), az - s * (w / 2 + 0.25), 0, h + 0.35, r, M.C, LIGHT);
      face(bx2 - c * w / 2, bz + s * w / 2, bx2 + c * w / 2, bz - s * w / 2, 0.15, h, r, M.C, col);
      for (const k of [-1, 1]) face(cx2 - c * (k * w / 4 - 0.2), cz2 + s * (k * w / 4 - 0.2), cx2 - c * (k * w / 4 + 0.2), cz2 + s * (k * w / 4 + 0.2), 0.4, h * 0.45, r, M.C, 0x000000);
      if (row != null) sign(x + s * 0.05, h + 0.55, z + c * 0.05, r, 1.8, 0.23, row);
      const [px, pz] = f(0.35); bc(px, 0.07, pz, Math.abs(c) * (w + 0.4) + Math.abs(s) * 0.7, 0.14, Math.abs(s) * (w + 0.4) + Math.abs(c) * 0.7, 0x8f8a80);
    };
    door(-14.55, 15, PI, 1.3, 2.7, 0x1c3a2a, 7); door(7.27, 15, PI, 1.5, 2.8, 0x2a1c14, 1); door(14.55, 15, PI, 1.2, 2.5, 0x2c3440, 4);
    put(new THREE.CircleGeometry(0.66, 8, 0, PI).rotateY(PI).translate(-14.55, 2.85, 14.965), 0x2c3a44);
    // ---------------- south range (z = -15): Exam Hall portico, Arts Building (modern door + canopy)
    face(-20, -15, 20, -15, 0, 4.2, 0, M.ground, null, 40 / 11, 4.2, -20, 0);
    face(-20, -15, 20, -15, 4.2, 11.4, 0, M.upper, null, 40 / 11, 3.6, -20, 4.2);
    bx(-14.8, 0, -15, -7.0, 0.1, -13.0, 0x8f8a80);
    for (const x of [-13.8, -11.9, -9.9, -8.0]) { bx(x - 0.36, 0.1, -13.96, x + 0.36, 0.4, -13.24, LIGHT); cy(x, 0.4, -13.6, 0.3, 0.26, 6.7, 8, 0xb9b4a8); bx(x - 0.38, 7.1, -13.98, x + 0.38, 7.4, -13.22, LIGHT); }
    bx(-14.7, 7.4, -15, -7.1, 8.4, -13.1, 0xb2ada1);
    { const sh = new THREE.Shape(); sh.moveTo(-3.9, 0); sh.lineTo(3.9, 0); sh.lineTo(0, 2.0); sh.lineTo(-3.9, 0); put(new THREE.ExtrudeGeometry(sh, { depth: 1.9, bevelEnabled: false }).translate(-10.9, 8.4, -15), LIGHT); }
    sign(-10.9, 7.9, -13.08, 0, 3.2, 0.4, 2);
    face(-11.9, -14.97, -9.9, -14.97, 0, 3.8, 0, M.C, LIGHT); face(-11.7, -14.96, -10.1, -14.96, 0.1, 3.6, 0, M.C, 0x2a1d14);
    face(-10.92, -14.95, -10.88, -14.95, 0.1, 3.6, 0, M.C, 0x120c08);
    face(-0.85, -14.98, 0.85, -14.98, 0, 2.6, 0, M.C, 0x9a9c9e); face(-0.75, -14.97, 0.75, -14.97, 0, 2.5, 0, M.C, 0x2a3036);
    face(-0.03, -14.96, 0.03, -14.96, 0, 2.5, 0, M.C, 0x9a9c9e);
    bx(-1.4, 2.75, -15, 1.4, 2.9, -13.8, 0x5d5e60); sign(0, 2.83, -13.78, 0, 1.6, 0.15, 3);
    // ---------------- east range (x = 20): arcade (piers + arches), library door, noticeboard, iron gate to New Square
    face(20, -15, 20, -11.6, 0, 4.4, -H, M.ground, null, 3.75, 4.4, -15, 0); face(20, 11.6, 20, 15, 0, 4.4, -H, M.ground, null, 3.75, 4.4, -15, 0);
    face(20, -15, 20, 15, 4.4, 11.4, -H, M.upper, null, 3.75, 3.5, -15, 4.4);
    for (const z of [-11.25, ...PIERS, 11.25]) { const z0 = z === -11.25 ? -11.6 : z - 0.35, z1 = z === 11.25 ? 11.6 : z + 0.35; bx(20, 0, z0, 20.7, 2.4, z1, STONE); bx(19.95, 2.4, z0 - 0.05, 20.75, 2.6, z1 + 0.05, LIGHT); }
    for (let k = 0; k < 6; k++) arch(20.35, -9.375 + k * 3.75, 'z', 2.6, 1.525, 0.3, 0.7, 4.4, STONE, 6);
    bx(19.9, 4.3, -11.7, 20.1, 4.45, 11.7, LIGHT);
    flat(20, -11.25, 23, 11.25, 4.3, true, M.C, 0xb3ad9f);
    face(20, -11.25, 23, -11.25, 0, 4.3, 0, M.plain, null, 2, 1.4); face(20, 11.25, 23, 11.25, 0, 4.3, PI, M.plain, null, 2, 1.4);
    face(23, -11.25, 23, 4.425, 0, 4.3, -H, M.plain, null, 2, 1.4); face(23, 6.825, 23, 11.25, 0, 4.3, -H, M.plain, null, 2, 1.4); face(23, 4.425, 23, 6.825, 3.6, 4.3, -H, M.plain, null, 2, 1.4);
    // library door (studded oak) + sign + lantern
    face(22.98, -6.75, 22.98, -4.5, 0, 3.6, -H, M.C, LIGHT); face(22.97, -6.45, 22.97, -4.8, 0.05, 3.3, -H, M.C, 0x3b2616);
    for (let y = 0.5; y < 3.2; y += 0.45) for (let z = -6.3; z < -4.8; z += 0.3) bc(22.95, y, z, 0.03, 0.04, 0.04, 0x1a1a1a);
    sign(22.96, 3.85, -5.625, -H, 1.8, 0.23, 5);
    // noticeboard (glass-less cork board in a frame) on the arcade back wall
    bx(22.88, 0.9, -2.8, 23, 2.4, -0.95, 0x4a3020); quad(22.87, 1.65, -1.875, -H, 1.7, 1.4, M.notice, 0, 0, 1, 1);
    face(22.83, -2.75, 22.83, -1.0, 0.95, 2.35, -H, mat(0xdde8f0, { transparent: true, opacity: 0.16 }));   // glass front (their reflection shot)
    quad(19.985, 1.6, 0, -H, 0.6, 0.64, M.notice, 136 / 256, 130 / 256, 248 / 256, 248 / 256);   // gig poster pasted on the pier
    // iron gate opening + passage to New Square, lawn, a tree
    bx(22.9, 3.45, 4.3, 23.1, 3.6, 6.95, LIGHT);
    face(23, 4.425, 28, 4.425, 0, 3.6, 0, M.plain, null, 2, 1.4); face(23, 6.825, 28, 6.825, 0, 3.6, PI, M.plain, null, 2, 1.4);
    flat(23, 4.425, 28, 6.825, 3.6, true, M.C, 0x8e897f); flat(23, 4.425, 28.5, 6.825, 0.005, false, M.flags, null, 1.3, 1.3);
    flat(28, -6, 45, 18, 0.01, false, M.C, 0x3f5d36);
    for (const [x, z] of [[33, 3], [37, 9], [31, 12]]) { cy(x, 0, z, 0.22, 0.18, 2.4, 6, 0x3a2e24); put(new THREE.IcosahedronGeometry(2.1, 0).translate(x, 3.9, z), 0x2f4a2c); }
    face(46, -10, 46, 20, 0, 4.2, -H, M.ground, null, 4, 4.2); face(46, -10, 46, 20, 4.2, 11.4, -H, M.upper, null, 4, 3.6, 0, 4.2);

    // ---------------- cornices, parapets, roofs, chimneys (all four ranges)
    const COR = 0xb0ab9f;
    bx(-20.5, 11.4, -15.5, -19.55, 12.0, 15.5, COR); bx(-20.3, 12.0, -15.3, -19.8, 12.7, 15.3, STONE); roof(-20.3, 0, 30.6, H, 12.7, 4, 2.8);
    bx(-28.45, 11.4, -16.5, -27.5, 12.0, 16.5, COR); roof(-28.2, 0, 33, -H, 12.0, 3.8, 3.4);
    bx(-20.5, 11.4, 14.55, 20.5, 12.0, 15.5, COR); bx(-20.3, 12.0, 14.8, 20.3, 12.7, 15.3, STONE); roof(0, 15.3, 40.6, PI, 12.7, 4, 2.8);
    bx(-20.5, 11.4, -15.5, 20.5, 12.0, -14.55, COR); bx(-20.3, 12.0, -15.3, 20.3, 12.7, -14.8, STONE); roof(0, -15.3, 40.6, 0, 12.7, 4, 2.8);
    bx(19.55, 11.4, -15.5, 20.5, 12.0, 15.5, COR); bx(19.8, 12.0, -15.3, 20.3, 12.7, 15.3, STONE); roof(20.3, 0, 30.6, -H, 12.7, 4, 2.8);
    bx(-51.9, 11.4, -24, -51.4, 12.0, 24, COR); bx(45.4, 11.4, -10, 45.9, 12.0, 20, COR);
    for (const [x, z] of [[-24.6, -9], [-24.6, 9], [-12, 19.2], [6, 19.2], [14, -19.2], [-6, -19.2], [24.6, -4], [24.6, 10]]) {
      const w = Math.abs(x) > 20 ? 0.9 : 2.2, d = Math.abs(x) > 20 ? 2.2 : 0.9;
      bx(x - w / 2, 13.5, z - d / 2, x + w / 2, 16.6, z + d / 2, 0x6a5a4e); bx(x - w / 2 - 0.1, 16.6, z - d / 2 - 0.1, x + w / 2 + 0.1, 16.8, z + d / 2 + 0.1, 0x5a4a40);
      for (let i = 0; i < 3; i++) { const t = (i - 1) * 0.55; cy(x + (w > 1 ? t : 0), 16.8, z + (d > 1 ? t : 0), 0.1, 0.09, 0.4, 6, 0x9a5a3a); }
    }
    // lit windows (a few rooms with lamps on; hidden when the college lights go out)
    const lit = new Builder(), litQ = (cx, cy0, cz, r, w, h) => lit.add(new THREE.PlaneGeometry(w, h).rotateY(r).translate(cx, cy0, cz), M.lit);
    const win = (d, k, fl, facade) => { const u = (k + 0.5), y = 4.2 + fl * 3.6 + 1.87; if (facade === 'n') litQ(20 - u * d, y, 14.97, PI, 0.344 * d, 2.47); if (facade === 's') litQ(-20 + u * d, y, -14.97, 0, 0.344 * d, 2.47); if (facade === 'e') litQ(19.97, 4.4 + fl * 3.5 + 1.8, -15 + u * 3.75, -H, 1.29, 2.4); if (facade === 'w') litQ(-19.97, y, 15 - u * 3.933, H, 1.35, 2.47); };
    [[1, 0, 'n'], [3, 1, 'n'], [6, 0, 'n'], [9, 1, 'n'], [2, 1, 's'], [5, 0, 's'], [8, 1, 's'], [10, 0, 's'], [1, 1, 'e'], [4, 0, 'e'], [6, 1, 'e'], [0, 1, 'w'], [2, 0, 'w']].forEach(([k, fl, f]) => win(40 / 11, k, fl, f));
    litQ(-28.36, 8.5, 0, -H, 0.95, 2.5);
    for (const [x, y, z] of [[7.27, 3.05, 14.75], [22.75, 3.1, -4.35], [-24, 4.35, 0]]) {   // lanterns: glass glows with the lit windows
      lit.add(new THREE.CylinderGeometry(0.13, 0.1, 0.3, 4).translate(x, y + 0.16, z), M.glow);
      cy(x, y - 0.03, z, 0.1, 0.1, 0.04, 4, DARK); cy(x, y + 0.31, z, 0.16, 0.02, 0.15, 4, DARK); put(new THREE.CylinderGeometry(0.12, 0.09, 0.29, 4).translate(x, y + 0.16, z), 0x3a4148);
    }
    L.lit = lit.done(); L.lit.name = 'windows_lit'; root.add(L.lit);

    // ---------------- the Campanile (centre): plinth, four rusticated piers + arches, entablature with an oculus,
    // open bell stage with columns, cornice, drum, dome, lantern
    const CAM = 0xc1bbad, CAMD = 0xaba497;
    bx(-3.9, 0, -3.9, 3.9, 0.46, 3.9, 0x9d978b);
    for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { if (ax) bx(ax > 0 ? 3.9 : -4.25, 0, -1.5, ax > 0 ? 4.25 : -3.9, 0.23, 1.5, 0x9d978b); else bx(-1.5, 0, az > 0 ? 3.9 : -4.25, 1.5, 0.23, az > 0 ? 4.25 : -3.9, 0x9d978b); }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      for (let i = 0; i < 6; i++) { const y = 0.46 + i * 0.64, k = i % 2 ? 0.04 : 0; bx(sx * 2.65 - 0.65 - k, y, sz * 2.65 - 0.65 - k, sx * 2.65 + 0.65 + k, y + 0.62, sz * 2.65 + 0.65 + k, i % 2 ? CAM : CAMD); }
      bx(sx * 2.65 - 0.72, 4.3, sz * 2.65 - 0.72, sx * 2.65 + 0.72, 4.42, sz * 2.65 + 0.72, LIGHT);
      bx(sx * 2.45 - 0.65, 7.7, sz * 2.45 - 0.65, sx * 2.45 + 0.65, 11.3, sz * 2.45 + 0.65, CAM);
      for (const [dx, dz] of [[1, 0], [0, 1]]) cy(sx * 2.45 + dx * sx * 0.72, 7.9, sz * 2.45 + dz * sz * 0.72, 0.17, 0.15, 3.25, 8, 0xd0cabc);
      put(new THREE.CylinderGeometry(0.22, 0.14, 0.7, 7).translate(sx * 3.05, 12.05, sz * 3.05), CAMD); put(new THREE.SphereGeometry(0.2, 6, 4).translate(sx * 3.05, 12.55, sz * 3.05), CAMD);
    }
    for (const [cx, cz, ax] of [[0, 2.65, 'x'], [0, -2.65, 'x'], [2.65, 0, 'z'], [-2.65, 0, 'z']]) { arch(cx, cz, ax, 4.42, 2.0, 0.35, 1.3, 6.7, CAM); bc(cx * 1.24, 6.45, cz * 1.24, 0.3, 0.5, 0.3, LIGHT); }
    const ring = (y0, y1, o, i, hex) => { bx(-o, y0, i, o, y1, o, hex); bx(-o, y0, -o, o, y1, -i, hex); bx(i, y0, -i, o, y1, i, hex); bx(-o, y0, -i, -i, y1, i, hex); };
    ring(6.7, 7.4, 3.45, 0.8, CAM); ring(7.4, 7.7, 3.6, 0.8, LIGHT);
    for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { if (ax) { bx(ax * 2.2 - 0.12, 7.7, -1.8, ax * 2.2 + 0.12, 8.5, 1.8, CAMD); arch(ax * 2.45, 0, 'z', 9.6, 1.8, 0.3, 1.3, 11.3, CAM); } else { bx(-1.8, 7.7, az * 2.2 - 0.12, 1.8, 8.5, az * 2.2 + 0.12, CAMD); arch(0, az * 2.45, 'x', 9.6, 1.8, 0.3, 1.3, 11.3, CAM); } }
    bx(-3.4, 11.3, -3.4, 3.4, 11.75, 3.4, LIGHT); bx(-2.6, 11.75, -2.6, 2.6, 12.4, 2.6, CAM);
    put(new THREE.SphereGeometry(2.4, 8, 4, 0, 2 * PI, 0, H).translate(0, 12.4, 0), 0xb9b3a5);
    cy(0, 14.6, 0, 0.5, 0.45, 0.9, 8, CAM); cy(0, 15.5, 0, 0.6, 0.05, 0.6, 8, CAMD); put(new THREE.SphereGeometry(0.16, 6, 4).translate(0, 16.25, 0), 0xb89a4a); cy(0, 16.35, 0, 0.03, 0.03, 0.6, 4, DARK);
    bc(0, 10.75, 0, 3.9, 0.22, 0.26, 0x4a3524, -PI / 4);
    // the bell (pivot at the headstock; swings about the beam: userData.ring = true)
    const bell = part('bell', () => {
      const pts = [[0.02, 0], [0.3, 0], [0.34, -0.1], [0.37, -0.4], [0.44, -0.72], [0.58, -0.95], [0.63, -1.03], [0.57, -1.0], [0.52, -0.94], [0.38, -0.72], [0.31, -0.4], [0.28, -0.1], [0.02, -0.08]].map(([x, y]) => new THREE.Vector2(x, y));
      put(new THREE.LatheGeometry(pts, 10).translate(0, -0.12, 0), 0xb08a48);
      bx(-0.14, -0.14, -0.22, 0.14, 0.04, 0.22, 0x4a3524); cy(0, -0.95, 0, 0.02, 0.02, 0.8, 4, 0x3a3a3a); put(new THREE.SphereGeometry(0.08, 6, 4).translate(0, -0.95, 0), 0x3a3a3a);
    }, 0, 10.62, 0);
    bell.rotation.order = 'YXZ'; bell.rotation.y = PI / 4; root.add(bell); L.bell = bell; bell.userData.ring = false;

    // ---------------- lamps: posts static, lamp_N = the lit glass + light pool (hidden by day)
    const poolMat = new THREE.MeshBasicMaterial({ map: T.pool, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
    const poolGeo = new THREE.PlaneGeometry(6, 6).rotateX(-H), glassGeo = new THREE.CylinderGeometry(0.22, 0.15, 0.44, 4).rotateY(PI / 4);
    LAMPS.forEach(([x, z], i) => {
      cy(x, 0, z, 0.17, 0.14, 0.5, 8, DARK); cy(x, 0.5, z, 0.07, 0.055, 2.75, 6, DARK); cy(x, 3.1, z, 0.09, 0.09, 0.12, 6, DARK);
      bx(x - 0.32, 3.0, z - 0.025, x + 0.32, 3.05, z + 0.025, DARK);
      put(new THREE.CylinderGeometry(0.21, 0.14, 0.48, 4).rotateY(PI / 4).translate(x, 3.46, z), 0x3a4148);
      put(new THREE.CylinderGeometry(0.02, 0.3, 0.22, 4).rotateY(PI / 4).translate(x, 3.8, z), DARK); cy(x, 3.9, z, 0.04, 0.01, 0.16, 4, DARK);
      const g = new THREE.Group(); g.name = 'lamp_' + (i + 1); g.position.set(x, 0, z);
      const gl = new THREE.Mesh(glassGeo, M.glow); gl.position.y = 3.46; const pl = new THREE.Mesh(poolGeo, poolMat); pl.position.y = 0.07; pl.renderOrder = 2;
      g.add(gl, pl); g.visible = false; root.add(g); L.lamps.push(g);
    });

    // ---------------- the porters' lodge (interior x -25.5..-20.5, z 2.4..7.2, floor 0.46): door + hatch on the passage
    // side (south), the big window on the square (east)
    const CL = M.CL, F0 = 0.46, F1 = 3.36;
    flat(-25.5, 2.4, -20.5, 7.2, F0, false, M.boards, null, 1, 1);
    flat(-25.5, 2.4, -20.5, 7.2, F1, true, CL, 0xd9cfb8);
    const pw = (x0, z0, x1, z1, y0, y1, r) => face(x0, z0, x1, z1, y0, y1, r, M.panel, null, 1.2, 2.9, 0, F0);
    pw(-25.5, 2.4, -25.5, 7.2, F0, F1, H); pw(-25.5, 7.2, -20.5, 7.2, F0, F1, PI);
    pw(-25.5, 2.4, -24, 2.4, F0, F1, 0); pw(-24, 2.4, -23.1, 2.4, F0, 1.4, 0); pw(-24, 2.4, -23.1, 2.4, 2.3, F1, 0); pw(-23.1, 2.4, -21.9, 2.4, F0, F1, 0);
    pw(-21.9, 2.4, -20.7, 2.4, 2.9, F1, 0); pw(-20.7, 2.4, -20.5, 2.4, F0, F1, 0);
    pw(-20.5, 2.4, -20.5, 4.6, F0, F1, -H); pw(-20.5, 4.6, -20.5, 6.5, F0, 1.36, -H); pw(-20.5, 4.6, -20.5, 6.5, 3.0, F1, -H); pw(-20.5, 6.5, -20.5, 7.2, F0, F1, -H);
    bx(-24, F0, 3.8, -22.3, F0 + 0.012, 5.8, 0x6a2a22, CL); bx(-23.9, F0 + 0.012, 3.9, -22.4, F0 + 0.014, 5.7, 0x8a4a30, CL);
    bx(-21.85, F0, 2.45, -20.75, F0 + 0.015, 3.2, 0x3a3226, CL);
    // desk under the window, phone, blotter, lamp, Des's mug; Des's chair
    bx(-21.25, 1.19, 4.3, -20.5, 1.24, 6.1, 0x5a3a20, CL); bx(-21.2, F0, 5.45, -20.55, 1.19, 6.1, 0x4e321c, CL);
    for (const z of [5.6, 5.82]) bx(-21.22, z > 5.7 ? 0.62 : 0.9, z - 0.1, -21.19, z > 5.7 ? 0.86 : 1.14, z + 0.1, 0x6a4628, CL);
    bx(-21.2, F0, 4.32, -21.13, 1.19, 4.39, 0x4e321c, CL); bx(-20.62, F0, 4.32, -20.55, 1.19, 4.39, 0x4e321c, CL);
    bx(-21.1, 1.24, 4.65, -20.62, 1.25, 5.4, 0x2f4a36, CL);
    bx(-21.0, 1.24, 4.86, -20.72, 1.3, 5.14, 0xd8cbae, CL); bx(-21.0, 1.3, 4.9, -20.8, 1.34, 5.1, 0xd8cbae, CL);
    bx(-20.95, 1.34, 4.86, -20.84, 1.38, 5.14, 0xcfc2a4, CL); cy(-20.9, 1.34, 4.86, 0.035, 0.035, 0.05, 6, 0xcfc2a4, CL); cy(-20.9, 1.34, 5.14, 0.035, 0.035, 0.05, 6, 0xcfc2a4, CL);
    put(new THREE.CylinderGeometry(0.05, 0.05, 0.012, 10).rotateZ(-0.6).translate(-21.0, 1.31, 5.0), 0x2a2a2a, CL);
    cy(-20.72, 1.24, 4.42, 0.07, 0.07, 0.02, 8, 0xa8883a, CL); cy(-20.72, 1.26, 4.42, 0.012, 0.012, 0.34, 4, 0xa8883a, CL);
    put(new THREE.CylinderGeometry(0.05, 0.13, 0.12, 8, 1).translate(-20.78, 1.62, 4.48), 0x2c5a3a, CL);
    cy(-20.68, 1.24, 5.92, 0.045, 0.045, 0.1, 8, 0x8a3a2a, CL);
    put(new THREE.PlaneGeometry(0.3, 0.4).rotateX(-H).rotateY(-H + 0.2).translate(-20.9, 1.247, 4.5), null, M.news);
    const chair = (x, z, r, hex, m) => { bc(x, F0 + 0.44, z, 0.44, 0.04, 0.44, hex, r, m);
      for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) { const c = Math.cos(r), s = Math.sin(r); bc(x + dx * c + dz * s, F0 + 0.21, z - dx * s + dz * c, 0.04, 0.42, 0.04, hex, r, m); }
      const c = Math.cos(r), s = Math.sin(r); bc(x - 0.2 * s, F0 + 0.8, z - 0.2 * c, 0.42, 0.34, 0.04, hex, r, m); };
    chair(-21.72, 5.3, H, 0x5a3a20, CL);
    // counter (kettle, mugs, caddy, milk, radio), heater, calendar, photos, clock (north wall)
    bx(-24.6, F0, 6.62, -22.4, 1.34, 7.2, 0x5e3d22, CL); bx(-24.65, 1.34, 6.58, -22.35, 1.38, 7.2, 0x7a5434, CL);
    for (const x of [-24.05, -22.95]) bx(x - 0.5, 0.56, 6.6, x + 0.5, 1.24, 6.62, 0x4e321c, CL);
    cy(-23.1, 1.38, 6.92, 0.1, 0.085, 0.25, 8, 0xe8e6e0, CL); bx(-23.2, 1.46, 6.86, -23.12, 1.6, 6.98, 0x2a2a2a, CL); bx(-23.0, 1.52, 6.89, -22.93, 1.57, 6.95, 0xe8e6e0, CL); cy(-23.1, 1.63, 6.92, 0.06, 0.03, 0.03, 8, 0x2a2a2a, CL);
    [[-22.75, 6.8, 0x7a3a24], [-22.62, 7.0, 0xe8e0cc], [-22.9, 7.08, 0x2e5a3e]].forEach(([x, z, c]) => { cy(x, 1.38, z, 0.045, 0.045, 0.1, 8, c, CL); bx(x + 0.04, 1.41, z - 0.01, x + 0.07, 1.46, z + 0.01, c, CL); });
    bx(-23.52, 1.38, 7.0, -23.4, 1.52, 7.12, 0x8a2a2a, CL); cy(-23.4, 1.38, 6.8, 0.035, 0.03, 0.2, 7, 0xf2f2ee, CL);
    bx(-24.36, 1.38, 6.86, -24.04, 1.56, 6.98, 0x5a2a20, CL); bx(-24.33, 1.4, 6.855, -24.14, 1.54, 6.86, 0xb8b8b0, CL); cy(-24.09, 1.45, 6.855, 0.02, 0.02, 0.01, 6, 0x222222, CL);
    bx(-24.3, 1.56, 6.91, -24.1, 1.58, 6.93, 0x222222, CL); put(new THREE.CylinderGeometry(0.004, 0.004, 0.5, 3).rotateX(0.4).rotateZ(-0.5).translate(-24.02, 1.8, 6.88), 0xcccccc, CL);
    // portable typewriter between the radio and the caddy (2.5's POV pan: desk phone, kettle cord, typewriter, radio)
    bx(-23.98, 1.38, 6.66, -23.6, 1.47, 6.94, 0x2e3a36, CL); bx(-23.95, 1.47, 6.66, -23.63, 1.49, 6.79, 0x1a1a1a, CL); bx(-23.94, 1.49, 6.67, -23.64, 1.5, 6.77, 0xd8d4c8, CL);
    bx(-24.0, 1.47, 6.85, -23.58, 1.53, 6.92, 0x111111, CL); bx(-23.9, 1.5, 6.9, -23.68, 1.72, 6.905, 0xf4f2ea, CL);
    bx(-22.25, F0, 7.0, -21.75, 0.95, 7.2, 0x6a6660, CL); bx(-22.2, 0.6, 6.99, -21.8, 0.64, 7.0, 0x222222, M.heat); bx(-22.2, 0.72, 6.99, -21.8, 0.76, 7.0, 0x222222, M.heat);
    quad(-23.9, 2.27, 7.185, PI, 0.46, 0.58, M.cal, 0, 0, 1, 1);
    const frame = (x, y, z, r, w, h) => { bc(x, y, z, Math.abs(Math.cos(r)) * w + 0.02, h, Math.abs(Math.sin(r)) * w + 0.02, 0x3a2414, 0, CL); quad(x + Math.sin(r) * 0.012, y, z + Math.cos(r) * 0.012, r, w - 0.05, h - 0.05, M.photo, 0, 0, 1, 1); };
    frame(-22.1, 2.0, 7.185, PI, 0.36, 0.36); frame(-22.75, 2.35, 7.185, PI, 0.22, 0.22); frame(-24.6, 2.25, 7.185, PI, 0.24, 0.24);
    put(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 12).rotateX(H).translate(-21.35, 2.55, 7.175), 0x4a3018, CL);
    put(new THREE.CircleGeometry(0.17, 16).rotateY(PI).translate(-21.35, 2.55, 7.145), null, M.clock);
    // pigeonholes (west wall) over a low cabinet; key board + the big brass key (south wall)
    bx(-25.5, 1.36, 3.2, -25.15, 3.05, 6.8, 0x5a3a1e, CL); face(-25.14, 3.22, -25.14, 6.78, 1.38, 3.03, H, M.pigeon, null, 3.56, 1.65, -6.78, 1.38);
    bx(-25.5, F0, 3.2, -25.1, 1.3, 6.8, 0x5e3d22, CL); for (let z = 3.25; z < 6.7; z += 0.72) bx(-25.1, 0.55, z, -25.08, 1.22, z + 0.66, 0x6a4628, CL);
    bx(-23.0, 1.45, 2.4, -22.05, 2.35, 2.43, 0x3a2414, CL); quad(-22.525, 1.9, 2.435, 0, 0.9, 0.86, M.keys, 0, 0, 1, 1);
    // cupboard (door is a prop), lost property chest under the hatch, bin, umbrella stand, pendant lamp
    bx(-25.4, F0, 2.4, -25.34, 2.66, 3.05, 0x5a3a1e, CL); bx(-24.16, F0, 2.4, -24.1, 2.66, 3.05, 0x5a3a1e, CL);
    bx(-25.4, 2.6, 2.4, -24.1, 2.66, 3.05, 0x5a3a1e, CL); bx(-25.34, F0, 2.4, -24.16, 0.56, 3.05, 0x5a3a1e, CL);
    bx(-25.34, F0, 2.4, -24.16, 2.6, 2.44, 0x3a2414, CL); bx(-25.34, 1.2, 2.44, -24.16, 1.24, 3.02, 0x6a4628, CL);
    bx(-24.0, F0, 2.4, -23.1, 1.36, 2.9, 0x5e3d22, CL);
    for (let i = 0; i < 3; i++) { const y = 0.52 + i * 0.28; bx(-23.96, y, 2.9, -23.14, y + 0.25, 2.92, 0x6e4a2a, CL); bc(-23.55, y + 0.08, 2.935, 0.08, 0.03, 0.02, 0xb8a060, 0, CL); }
    quad(-23.55, 1.27, 2.923, 0, 0.44, 0.06, M.signs, 0, 1 - 7 / 8, 1, 1 - 6 / 8);
    bx(-21.2, 1.02, 3.65, -20.6, 1.06, 4.2, 0x5a3a20, CL); for (const [x, z] of [[-21.16, 3.69], [-20.64, 3.69], [-21.16, 4.16], [-20.64, 4.16]]) bx(x - 0.025, F0, z - 0.025, x + 0.025, 1.02, z + 0.025, 0x4e321c, CL);
    bx(-21.08, 1.06, 3.76, -20.72, 1.16, 4.08, 0x1c1c1e, CL); bx(-21.05, 1.16, 3.8, -20.75, 1.2, 4.04, 0x2a2a2c, CL); cy(-20.9, 1.2, 3.92, 0.04, 0.04, 0.3, 6, 0x111111, CL);
    put(new THREE.CylinderGeometry(0.035, 0.035, 0.36, 6).rotateX(H).rotateY(H).translate(-20.9, 1.2, 3.84), 0x111111, CL); bx(-21.02, 1.2, 3.72, -20.78, 1.24, 3.74, 0xe8e4d8, CL);
    bx(-23.14, 1.38, 7.0, -23.12, 1.39, 7.19, 0x222222, CL); bx(-23.2, 1.05, 7.17, -23.04, 1.2, 7.2, 0xe8e4d8, CL); bx(-23.13, 1.12, 7.15, -23.11, 1.39, 7.17, 0x222222, CL);
    cy(-21.5, F0, 4.45, 0.13, 0.155, 0.34, 8, 0x2e4a3a, CL); put(new THREE.IcosahedronGeometry(0.05, 0).translate(-21.47, 0.83, 4.42), 0xe8e4d8, CL);
    cy(-22.35, F0, 2.65, 0.1, 0.1, 0.5, 7, 0x3a3a3a, CL); cy(-22.33, F0, 2.67, 0.015, 0.015, 0.85, 4, 0x1a1a3a, CL); cy(-22.38, F0, 2.62, 0.015, 0.015, 0.8, 4, 0x6a1a1a, CL);
    cy(-23.0, 2.95, 4.8, 0.006, 0.006, 0.41, 3, 0x222222, CL); put(new THREE.CylinderGeometry(0.06, 0.2, 0.16, 8, 1, true).translate(-23.0, 2.9, 4.8), 0x2c4a32, CL);
    put(new THREE.SphereGeometry(0.06, 6, 4).translate(-23.0, 2.84, 4.8), null, M.glow);

    // ---------------- dynamic props
    const cupDoor = part('cupboard_door', () => { bx(-1.24, 0, -0.03, 0, 2.1, 0.03, 0x5e3d22, CL); bx(-1.12, 0.15, 0.03, -0.12, 0.95, 0.045, 0x6e4a2a, CL); bx(-1.12, 1.1, 0.03, -0.12, 1.95, 0.045, 0x6e4a2a, CL); bc(-1.1, 1.05, 0.06, 0.03, 0.08, 0.03, 0xb8a060, 0, CL); }, -24.12, 0.5, 3.08);
    root.add(cupDoor);
    const lodgeDoor = part('lodge_door', () => {   // hinged on the east jamb; rotY +1.6 swings it open into the lodge
      bx(-1.17, 0, -0.025, 0, 2.42, 0.025, 0x2a4a38, M.CL);
      for (const sd of [-1, 1]) for (const [y0, y1] of [[0.15, 1.05], [1.25, 2.3]]) for (const [x0, x1] of [[-1.1, -0.62], [-0.55, -0.07]]) bx(x0, y0, sd > 0 ? 0.025 : -0.04, x1, y1, sd > 0 ? 0.04 : -0.025, 0x335a44);
      bc(-1.05, 1.1, -0.06, 0.06, 0.06, 0.04, 0xc9a33a); bc(-1.05, 1.1, 0.06, 0.06, 0.06, 0.04, 0xc9a33a); bc(-0.6, 0.9, -0.045, 0.3, 0.05, 0.01, 0xc9a33a);
    }, -20.72, 0.47, 2.2);
    root.add(lodgeDoor);
    // the phone machine: 4 phones taped round a box, wires, a little screen; wrapped in Des's newspaper
    const mach = part('machine', () => {
      bx(-0.13, 0, -0.1, 0.13, 0.07, 0.1, 0x5a5e62);
      [[-0.09, 0.3], [0.09, -0.3], [0.05, 0.15]].forEach(([x, r], i) => bc(x, 0.13, [-0.0675, -0.0225, 0.0675][i], 0.075, 0.16, 0.01, 0x121416, r));
      bx(-0.13, 0.07, 0.06, 0.13, 0.1, 0.075, 0xd8c24a); bx(-0.12, 0.07, -0.08, 0.1, 0.09, -0.068, 0xc23a2a); bx(-0.02, 0.07, -0.1, 0.0, 0.2, 0.1, 0x2a6ac2);
    }, -24.75, 1.24, 2.72);
    mach.add(part('machine_prepaid', () => bc(-0.05, 0.13, 0.0225, 0.075, 0.16, 0.01, 0x121416, -0.15)));   // the prepaid: dead from 2.7 (content hides it)
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.05), mat(0x9adfff, { emissive: 0x3aa0d8 })); screen.name = 'machine_screen'; screen.position.set(0, 0.085, 0.101); mach.add(screen);
    const wrap = part('machine_wrap', () => { for (const [x, z, r] of [[-0.02, 0, 0.2], [0.03, 0.02, -0.5], [0, -0.02, 1.2]]) { const g = new THREE.BoxGeometry(0.34, 0.24, 0.26); g.rotateY(r).rotateX(0.2 * r).translate(x, 0.12, z); put(g, null, M.news); } });
    mach.add(wrap); root.add(mach); L.machine = mach;
    root.add(part('machine_wire', () => { const pts = [[-20.85, 1.3, 5.5], [-20.78, 1.26, 5.32], [-20.8, 1.26, 5.18], [-20.86, 1.3, 5.1]]; for (let i = 0; i < 3; i++) { const a = new THREE.Vector3(...pts[i]), b2 = new THREE.Vector3(...pts[i + 1]), d = b2.clone().sub(a); const g = new THREE.CylinderGeometry(0.008, 0.008, d.length(), 4); g.lookAt(d); g.rotateX(H); put(g.translate((a.x + b2.x) / 2, (a.y + b2.y) / 2, (a.z + b2.z) / 2), 0x222222, CL); } }));
    L.root.getObjectByName('machine_wire').visible = false;
    const key = part('key_brass', () => { put(new THREE.TorusGeometry(0.035, 0.01, 4, 8), 0xc9a23a, CL); bx(-0.008, -0.2, -0.006, 0.008, -0.035, 0.006, 0xc9a23a, CL); bx(0.008, -0.2, -0.006, 0.04, -0.16, 0.006, 0xc9a23a, CL); bx(0.008, -0.14, -0.006, 0.03, -0.12, 0.006, 0xc9a23a, CL); }, -22.65, 1.86, 2.46);
    root.add(key);
    const swivel = part('swivel_chair', () => { bx(-0.25, 0.42, -0.25, 0.25, 0.5, 0.25, 0x1c1c1e); bx(-0.23, 0.5, -0.29, 0.23, 1.05, -0.24, 0x1c1c1e); cy(0, 0.1, 0, 0.03, 0.03, 0.32, 6, 0x777777); for (let i = 0; i < 5; i++) bc(Math.sin(i * 1.26) * 0.18, 0.06, Math.cos(i * 1.26) * 0.18, 0.05, 0.04, 0.36, 0x222222, i * 1.26); }, -23.7, F0, 3.8);
    swivel.rotation.set(0, 0.7, 1.35); swivel.position.y = F0 + 0.28; swivel.visible = false; root.add(swivel);
    const yesSign = part('yes_sign', () => { bx(-0.35, 0, -0.02, 0.35, 0.9, 0.02, 0x9a9da2); quad(0, 0.55, 0.025, 0, 0.6, 0.3, matTex(T.yes), 0, 0, 1, 1); }, -22.4, F0 + 0.03, 5.3);
    yesSign.rotation.set(-1.45, 0.3, 0); yesSign.visible = false; root.add(yesSign);
    // the rusty bike chained to the railings (+ chain), Rue's scarf on lamp_4, toast, Hartigan's glasses
    const bk = new THREE.Mesh(bikeGeo(true), M.C); bk.name = 'bike'; bk.position.set(-18.78, 0, 9.4); bk.rotation.z = 0.12; root.add(bk);
    root.add(part('bike_chain', () => { for (let i = 0; i < 10; i++) { const a = i / 10 * PI * 2; bc(-18.98 + Math.cos(a) * 0.1, 0.62 + Math.sin(a) * 0.1, 9.25, 0.03, 0.03, 0.03, 0x8a8c8e, a); } bx(-18.99, 0.44, 9.2, -18.93, 0.52, 9.3, 0x6a6a6a); }));
    const scarf = part('scarf', () => {   // Rue's striped scarf snagged on the post: a knot and two tails, one lifting in the wind
      const tail = (len, z, tilt, tw) => { for (let i = 0; i * 0.1 < len; i++) { const y = -0.05 - i * 0.1, g = new THREE.BoxGeometry(0.018, 0.1, 0.16).translate(0, y, 0); g.rotateY(tw * i).rotateX(tilt); put(g.translate(0.07, 2.02, z), i % 3 === 2 ? 0xe8d9b5 : 0x7a1f2b); }
        for (let k = -2; k <= 2; k++) put(new THREE.BoxGeometry(0.012, 0.06, 0.012).translate(0, -0.1 * Math.ceil(len / 0.1) - 0.08, k * 0.035).rotateX(tilt).translate(0.07, 2.02, z), 0x7a1f2b); };
      put(new THREE.CylinderGeometry(0.1, 0.1, 0.14, 6).translate(0, 2.02, 0), 0x7a1f2b); bx(-0.02, 2.0, 0.06, 0.1, 2.12, 0.16, 0xe8d9b5);
      tail(0.9, 0.05, 0.08, 0.05); tail(0.55, -0.06, -0.55, -0.08);
    }, 10, 0, 9);
    scarf.rotation.y = -0.6; scarf.visible = false; root.add(scarf); L.scarf = scarf;
    L.toast = [1, 2, 3].map((n) => { const m = marks['toast_' + n]; const g = part('toast_' + n, () => { bx(-0.06, 0, -0.065, 0.06, 0.018, 0.065, 0xb8823a); bx(-0.055, 0.018, -0.06, 0.055, 0.02, 0.06, 0xd9a860); }, m[0], 0.005, m[2]); g.rotation.y = n; g.visible = false; root.add(g); return g; });
    const gl = part('glasses', () => { for (const x of [-0.035, 0.035]) put(new THREE.TorusGeometry(0.025, 0.004, 3, 8), 0x2a2a2a); bx(-0.01, -0.002, -0.002, 0.01, 0.002, 0.002, 0x2a2a2a); }, -7.3, 1.0, -10.3);
    gl.visible = false; root.add(gl);
    // iron gate leaves (hinged at the jambs); the porter's cheap figure
    const leaf = (name, z, s) => { const g = part(name, () => { for (let t = 0.08; t < 1.2; t += 0.12) bx(-0.02, 0, s * t - 0.012, 0.02, 3.3, s * t + 0.012, DARK); for (const y of [0.15, 1.6, 3.2]) bx(-0.025, y, s > 0 ? 0 : -1.2, 0.025, y + 0.05, s > 0 ? 1.2 : 0, DARK); }, 23, 0, z); root.add(g); return g; };
    L.gateL = leaf('iron_gate_l', 4.425, 1); L.gateR = leaf('iron_gate_r', 6.825, -1);
    const porter = part('porter', () => {
      bx(-0.13, 0, -0.08, -0.02, 0.8, 0.08, 0x1c2230); bx(0.02, 0, -0.08, 0.13, 0.8, 0.08, 0x1c2230);
      put(new THREE.CylinderGeometry(0.2, 0.26, 0.75, 7).translate(0, 1.15, 0), 0x1d2a44); bx(-0.24, 1.42, -0.12, 0.24, 1.54, 0.12, 0x1d2a44);
      for (const x of [-0.25, 0.25]) bx(x - 0.05, 0.9, -0.06, x + 0.05, 1.5, 0.06, 0x1d2a44);
      for (let y = 0.9; y < 1.45; y += 0.14) bc(0.05, y, 0.21, 0.03, 0.03, 0.02, 0xc9a23a);
      put(new THREE.IcosahedronGeometry(0.12, 0).translate(0, 1.68, 0), 0xd8a78a); bx(-0.06, 1.62, 0.1, 0.06, 1.645, 0.12, 0x9a9a9a);
      cy(0, 1.76, 0, 0.13, 0.14, 0.08, 8, 0x1a2030); bx(-0.1, 1.76, 0.06, 0.1, 1.78, 0.2, 0x111111);
    }, 22.2, 0, 5.6);
    porter.visible = false; root.add(porter); L.porter = porter;
    porter.userData.lock = () => { S.gate = S.gateTo = 1; S.porter = 1; S.pt = 0; porter.visible = true; };   // run the gate-locking walk again now (2.11 POV)
    // a student cycling round the square (2.4 Keep Up): visible = riding, hidden = gone
    const cyc = new THREE.Group(); cyc.name = 'cyclist'; cyc.visible = false; root.add(cyc); L.cyc = cyc;
    const cb2 = new THREE.Mesh(bikeGeo(false), M.C); cyc.add(cb2);
    cyc.add(part('cyclist_rider', () => {
      bc(0, 1.3, -0.08, 0.36, 0.55, 0.26, 0x3a4a6a, 0.0); bc(0, 1.55, 0.05, 0.12, 0.12, 0.12, 0xd8a78a); put(new THREE.SphereGeometry(0.13, 6, 3, 0, 2 * PI, 0, PI * 0.55).translate(0, 1.62, 0.04), 0x5a3a1e);
      for (const x of [-0.12, 0.12]) { bc(x, 0.82, 0.02, 0.12, 0.12, 0.4, 0x2a2a30); bc(x, 0.55, 0.2, 0.11, 0.45, 0.11, 0x2a2a30); bc(x * 1.8, 1.25, 0.22, 0.09, 0.09, 0.42, 0x3a4a6a); }
      bc(0, 1.42, -0.02, 0.4, 0.08, 0.2, 0xb8342c);
    }));
    cyc.children[1].rotation.x = 0.25;
    const ll = new THREE.Group(); ll.name = 'lodge_light'; root.add(ll); L.ll = ll;   // hide it and the lodge goes dark (3.4)
    L.lodgeMats = [M.panel, M.boards, M.pigeon, M.keys, M.cal, M.news, M.photo, M.clock];

    // ---------------- benches, bikes, cobbles, pigeons, umbrella crowd, footprints, ripples, drips (instanced)
    root.add(instanced(benchGeo(), M.C, [...BENCHES, [22.65, 1.875, -H]].map(([x, z, r]) => [x, 0, z, r, 1])));
    const bikes = [];
    for (const [x0, x1, z, r] of BIKES) for (let x = x0; x <= x1 + 0.01; x += 0.7) bikes.push([x, 0, z, r + (rnd() - 0.5) * 0.1, 1]);
    for (let z = 8.1; z < 11; z += 0.7) bikes.push([22.05, 0, z, -H, 1]);
    const bm = instanced(bikeGeo(false), M.C, bikes), BC = [0x2f5a3c, 0x8a2a2a, 0x1c1c1c, 0x2a4a7a, 0xd8d0b8, 0x5a5a5a, 0x7a5a2a];
    bikes.forEach((_, i) => bm.setColorAt(i, tc.set(BC[i % BC.length]))); root.add(bm);
    const cg = cobbleGeo(), quads = [[], [], [], []], CC = [0x62666c, 0x6c7076, 0x5a5e63, 0x72695e, 0x5f6874, 0x676b70];
    const cob = (x, z) => quads[(x < 0 ? 0 : 1) + (z < 0 ? 0 : 2)].push([x + (rnd() - 0.5) * 0.03, 0, z + (rnd() - 0.5) * 0.03, (rnd() - 0.5) * 0.12, [0.9 + rnd() * 0.18, 0.7 + rnd() * 0.6, 0.9 + rnd() * 0.18]]);
    for (let r = 0, z = -14.8; z < 15; z += 0.42, r++) for (let x = -19.8 + (r % 2) * 0.21; x < 19.9; x += 0.42) if (Math.max(Math.abs(x), Math.abs(z)) > 4.15 || (Math.min(Math.abs(x), Math.abs(z)) > 1.3 && Math.max(Math.abs(x), Math.abs(z)) > 3.95)) cob(x, z);
    for (let r = 0, z = -1.8; z < 2; z += 0.42, r++) for (let x = -27.8 + (r % 2) * 0.21; x < -20; x += 0.42) cob(x, z);
    for (const q of quads) { const im = instanced(cg, M.C, q); q.forEach((_, i) => im.setColorAt(i, tc.set(CC[Math.floor(rnd() * CC.length)]).multiplyScalar(0.85 + rnd() * 0.3))); root.add(im); }
    L.pig = new THREE.InstancedMesh(pigeonGeo(), M.C, PG.n); L.pig.name = 'pigeons'; L.pig.frustumCulled = false; root.add(L.pig);
    for (let i = 0; i < PG.n; i++) { PG.x[i] = 12 + (rnd() - 0.5) * 2.4; PG.z[i] = 4.5 + (rnd() - 0.5) * 2; PG.ox[i] = (rnd() - 0.5) * 2.4; PG.oz[i] = (rnd() - 0.5) * 2; PG.y[i] = 0; PG.mode[i] = 0; PG.yaw[i] = rnd() * 6; }
    // the crowd: coats (tinted per student), heads, legs (swing), umbrellas
    const crowd = new THREE.Group(); crowd.name = 'umbrella_crowd'; root.add(crowd); L.crowd = crowd;
    const body = merged([P(new THREE.CylinderGeometry(0.19, 0.26, 0.8, 7).translate(0, 1.1, 0), 0xffffff), P(new THREE.BoxGeometry(0.46, 0.12, 0.24).translate(0, 1.47, 0), 0xffffff),
      P(new THREE.CylinderGeometry(0.12, 0.15, 0.12, 7).translate(0, 1.55, 0), 0x9a8a80), P(new THREE.BoxGeometry(0.1, 0.62, 0.12).translate(-0.25, 1.15, 0), 0xffffff),
      P(new THREE.BoxGeometry(0.1, 0.12, 0.36).translate(0.2, 1.33, 0.14), 0xffffff), P(new THREE.BoxGeometry(0.09, 0.3, 0.09).translate(0.1, 1.45, 0.3), 0xd8a78a)]);
    const head = merged([P(new THREE.IcosahedronGeometry(0.12, 0).translate(0, 1.72, 0), 0xd9a888), P(new THREE.SphereGeometry(0.14, 6, 3, 0, 2 * PI, 0, PI * 0.55).scale(1.1, 1.1, 1.15).translate(0, 1.75, -0.02), 0x3a2a1c)]);
    const leg = merged([P(new THREE.BoxGeometry(0.13, 0.78, 0.15).translate(0, -0.39, 0), 0x2a2a30), P(new THREE.BoxGeometry(0.13, 0.08, 0.25).translate(0, -0.76, 0.04), 0x151515)]);
    const umb = merged([P(new THREE.ConeGeometry(0.62, 0.3, 8).translate(0, 2.12, 0), 0xffffff), P(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 4).translate(0, 1.6, 0), 0x333333)]);
    const CO = [0x7a5a3a, 0x2a3a5a, 0x5a2a2a, 0x3a4a3a, 0x8a7a5a, 0x4a4a52, 0x6a3a4a, 0x2e2e34], UM = [0x1a1a1e, 0x2a3a6a, 0xa22a2a, 0x2a5a3a, 0x1a1a1e, 0xd8c24a, 0x3a2a4a, 0x6a6a70];
    L.cb = new THREE.InstancedMesh(body, M.C, 8); L.ch = new THREE.InstancedMesh(head, M.C, 8); L.cl = new THREE.InstancedMesh(leg, M.C, 16); L.cu = new THREE.InstancedMesh(umb, M.C, 8);
    for (let i = 0; i < 8; i++) { L.cb.setColorAt(i, tc.set(CO[i])); L.cu.setColorAt(i, tc.set(UM[i])); L.ch.setColorAt(i, tc.setScalar(0.85 + 0.15 * rnd())); }
    for (const m of [L.cb, L.ch, L.cl, L.cu]) { m.frustumCulled = false; crowd.add(m); }
    // footprints (Torchlight): trail_1 -> trail_2 -> trail_3, only in the torch beam
    const fp = [], tr = [marks.trail_1, marks.trail_2, marks.trail_3];
    for (let k = 0; k < 2; k++) { const [ax, , az] = tr[k], [bx2, , bz] = tr[k + 1], d = Math.hypot(bx2 - ax, bz - az), yaw = Math.atan2(bx2 - ax, bz - az);
      for (let s = 0.3; s < d; s += 0.38) { const side = (fp.length % 2 ? 1 : -1) * 0.12; fp.push([ax + (bx2 - ax) * s / d + Math.cos(yaw) * side, 0.075, az + (bz - az) * s / d - Math.sin(yaw) * side, yaw, 1]); } }
    L.foot = instanced(new THREE.PlaneGeometry(0.15, 0.32).rotateX(-H), matTex(T.foot, { transparent: true, color: 0xe4eef6 }), fp); L.foot.name = 'footprints'; L.foot.visible = false; root.add(L.foot);
    L.rip = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-H), new THREE.MeshBasicMaterial({ map: T.ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), RP.n);
    L.rip.name = 'ripples'; L.rip.frustumCulled = false; root.add(L.rip);
    L.rip.setColorAt(0, tc.setScalar(0));   // instanceColor exists from the build, so the warmed program is the one that plays
    L.drip = new THREE.InstancedMesh(new THREE.BoxGeometry(0.014, 0.07, 0.014), new THREE.MeshBasicMaterial({ color: 0xb8c4d0, transparent: true, opacity: 0.7 }), DR.n);
    L.drip.name = 'drips'; L.drip.frustumCulled = false; root.add(L.drip);
    for (let i = 0; i < DR.n; i++) DR.y[i] = -1 - rnd();

    // rain: the world uses a Points named 'rain'; keep it out of the lodge, the gate passage, the arcade and the Campanile
    const rain = makeRain({ box: [-36, -24, 26, 24], top: 14, count: 5200 }), rp = rain.geometry.attributes.position;
    const dry = (x, z) => (x > -26.2 && x < -20.3 && z > 2.2 && z < 7.4) || (x > -28.7 && x < -19.9 && z > -2.2 && z < 2.2) || (x > 19.3 && x < 23.2 && z > -11.5 && z < 11.5) || (x > -4.2 && x < 3.6 && z > -3.6 && z < 3.6) || (x > -28 && x < -20 && Math.abs(z) < 16) || (x > 22.9 && x < 28 && z > 4.2 && z < 7);
    for (let i = 0; i < rp.count; i++) while (dry(rp.getX(i), rp.getZ(i))) rp.setXYZ(i, -36 + rnd() * 62, rp.getY(i), -24 + rnd() * 48);
    root.add(rain);

    root.add(B.done()); B = null;
    S.env = ''; S.radio = null; S.ll = 1; for (const m of L.lodgeMats) m.emissiveIntensity = 0.42;
    return root;
  }

  // -------------------------------------------------------------- ambient life state (preallocated)
  const PG = { n: 14 }; for (const k of ['x', 'y', 'z', 'vx', 'vy', 'vz', 'yaw', 't', 'ox', 'oz']) PG[k] = new Float32Array(PG.n); PG.mode = new Uint8Array(PG.n);
  const RP = { n: 28, x: new Float32Array(28), z: new Float32Array(28), age: new Float32Array(28), life: new Float32Array(28) };
  const DR = { n: 10, x: new Float32Array(10), y: new Float32Array(10), z: new Float32Array(10), v: new Float32Array(10) };
  const CYC = ((p) => { const cum = [0]; for (let k = 1; k < p.length; k++) cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1])); return { p, cum, len: cum[cum.length - 1] }; })(
    [[-18, 1.2], [-9, 5.2], [0, 7.0], [9, 6.0], [11.5, 0], [9, -6.8], [0, -7.4], [-9, -5.4], [-18, -1.2], [-18, 1.2]]);
  const WK = PATHS.map((p, i) => { const cum = [0]; for (let k = 1; k < p.length; k++) cum.push(cum[k - 1] + Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1])); return { p, cum, len: cum[cum.length - 1], s: ((i * 0.37) % 1) * cum[cum.length - 1], v: 1.1 + (i % 3) * 0.15, ph: i, nx: 3 + i * 1.7 }; });
  const S = { ll: 1, cyc: 0, env: '', t: 0, bellA: 0, bellP: 0, radio: null, idle: 0, gut: 0, gate: 1, gateTo: 1, porter: 0, pt: 0, scat: 0 };
  const D = new THREE.Object3D(), PM = new THREE.Matrix4(), RM = new THREE.Matrix4(), TM = new THREE.Matrix4(); D.rotation.order = 'YXZ';
  const RADIO = { at: [-24.2, 1.5, 6.92], vol: 0.3 }, GUT = { at: [-19.85, 0.4, 6.95], vol: 0.35 }, PIGS = { at: [0, 0.5, 0], vol: 0.8 };
  const HOME = [12, 4.5], PORTER_PATH = [[22.2, 5.6], [17, 5.4], [8, 8.2], [-4, 7.4], [-12, 4.4], [-18.3, 1.2], [-21.3, 1.0]];
  const watch = (dt) => { if ((S.idle += dt) > 0.3) { if (S.radio) S.radio.stop(0.5); S.radio = null; removeUpdate(watch); } };

  function setEnv(name) {
    S.env = name;
    const on = name === 'dusk' || name === 'night', wet = name !== 'sun';
    for (const l of L.lamps) l.visible = on;
    L.lit.visible = name !== 'dark' && name !== 'sun';
    L.crowd.visible = name !== 'night' && name !== 'dark'; L.cu.visible = wet;
    for (const m of [L.cb, L.ch, L.cu]) m.count = name === 'sunday' ? 3 : 8; L.cl.count = name === 'sunday' ? 6 : 16;
    L.pig.visible = name !== 'night' && name !== 'dark';
    L.rip.visible = wet; L.foot.visible = L.scarf.visible = name === 'dark';
    S.gateTo = S.gate = name === 'night' || name === 'dark' ? 0 : 1;
    S.porter = name === 'dusk' || name === 'sunday' ? 1 : 0; S.pt = 0; L.porter.visible = !!S.porter;
  }
  function walkAt(w, s, out) {   // position + heading along a path at distance s -> out [x, z, yaw]
    let k = 1; while (k < w.cum.length - 1 && w.cum[k] < s) k++;
    const a = w.p[k - 1], b = w.p[k], f = (s - w.cum[k - 1]) / Math.max(1e-6, w.cum[k] - w.cum[k - 1]);
    out[0] = a[0] + (b[0] - a[0]) * f; out[1] = a[1] + (b[1] - a[1]) * f; out[2] = Math.atan2(b[0] - a[0], b[1] - a[1]);
  }
  const WP = [0, 0, 0];

  function update(dt, x) {
    if (!L.root) return;
    if (x.env !== S.env) setEnv(x.env);
    S.t += dt;
    const t = S.t, pl = x.player, px = pl ? pl.pos.x : 1e3, pz = pl ? pl.pos.z : 1e3;
    L.glassTex.offset.y = (t * 0.06) % 1;
    // bell swing
    S.bellA += ((L.bell.userData.ring ? 0.55 : 0) - S.bellA) * Math.min(1, dt * 0.9); S.bellP += dt * 2.7;
    L.bell.rotation.x = S.bellA * Math.sin(S.bellP);
    // umbrella students
    if (L.crowd.visible) {
      for (let i = 0; i < L.cb.count; i++) {
        const w = WK[i]; walkAt(w, w.s, WP);
        const stop = (w.nx -= dt) < 0, ease = stop ? Math.min(1, -w.nx * 4, (w.nx + 1.8) * 4) : 0;   // a pause now and then: check the watch / shake the umbrella
        if (w.nx < -1.8) w.nx = 7 + (i * 2.3) % 6;
        const fx = Math.sin(WP[2]), fz = Math.cos(WP[2]), dx = px - WP[0], dz = pz - WP[1];
        if (!stop && !(dx * fx + dz * fz > 0 && dx * dx + dz * dz < 1.4)) { w.s += w.v * dt; w.ph += w.v * dt * 5.2; if (w.s >= w.len) w.s = 0; }
        const sw = stop ? 0 : Math.sin(w.ph), bob = 0.025 * Math.abs(sw);
        D.position.set(WP[0], bob, WP[1]); D.rotation.set(0, WP[2], 0); D.scale.setScalar(1); D.updateMatrix();
        L.cb.setMatrixAt(i, D.matrix);
        if (i & 1) L.ch.setMatrixAt(i, D.matrix);
        else { PM.makeTranslation(0, 1.6, 0).multiply(RM.makeRotationX(0.45 * ease)).multiply(TM.makeTranslation(0, -1.6, 0)); L.ch.setMatrixAt(i, RM.multiplyMatrices(D.matrix, PM)); }
        D.rotation.set(0.12, WP[2], 0); D.updateMatrix();
        if (i & 1) { PM.makeTranslation(0, 1.3, 0).multiply(RM.makeRotationZ(0.3 * ease * Math.sin(t * 26))).multiply(TM.makeTranslation(0, -1.3, 0)); L.cu.setMatrixAt(i, RM.multiplyMatrices(D.matrix, PM)); }
        else L.cu.setMatrixAt(i, D.matrix);
        for (let s = 0; s < 2; s++) { const sd = s ? 0.09 : -0.09; D.position.set(WP[0] + fz * sd, 0.8 + bob, WP[1] - fx * sd); D.rotation.set(sw * (s ? 0.45 : -0.45), WP[2], 0); D.updateMatrix(); L.cl.setMatrixAt(i * 2 + s, D.matrix); }
      }
      L.cb.instanceMatrix.needsUpdate = L.ch.instanceMatrix.needsUpdate = L.cl.instanceMatrix.needsUpdate = L.cu.instanceMatrix.needsUpdate = true;
    }
    // pigeons: follow the toast trail, scatter from a running player, circle, come back
    if (L.pig.visible) {
      const tv = L.toast, tgt = tv[2].visible ? marks.far_corner : tv[1].visible ? marks.toast_2 : tv[0].visible ? marks.toast_1 : null;
      const hx = tgt ? tgt[0] : HOME[0], hz = tgt ? tgt[2] : HOME[1];
      S.scat -= dt;
      for (let i = 0; i < PG.n; i++) {
        const dx = PG.x[i] - px, dz = PG.z[i] - pz;
        if (PG.mode[i] === 0 && x.running && dx * dx + dz * dz < 12) {
          for (let j = 0; j < PG.n; j++) if (PG.mode[j] !== 1) { const ex = PG.x[j] - px, ez = PG.z[j] - pz, d = Math.hypot(ex, ez) || 1; PG.mode[j] = 1; PG.t[j] = 2.5 + (j % 5) * 0.4; PG.vx[j] = ex / d * (3 + (j % 3)); PG.vz[j] = ez / d * (3 + (j % 3)); PG.vy[j] = 3 + (j % 4) * 0.5; }
          if (S.scat <= 0 && typeof sfx === 'function') { PIGS.at[0] = PG.x[i]; PIGS.at[2] = PG.z[i]; sfx('pigeons', PIGS); S.scat = 3; }
          break;
        }
      }
      for (let i = 0; i < PG.n; i++) {
        let pitch = 0, roll = 0;
        const gx = hx + PG.ox[i], gz = hz + PG.oz[i], ex = gx - PG.x[i], ez = gz - PG.z[i], d = Math.hypot(ex, ez);
        if (PG.mode[i] === 1) {
          PG.x[i] += PG.vx[i] * dt; PG.z[i] += PG.vz[i] * dt; PG.y[i] = Math.min(9, PG.y[i] + PG.vy[i] * dt); PG.vy[i] *= 1 - dt * 0.6;
          PG.yaw[i] = Math.atan2(PG.vx[i], PG.vz[i]); roll = Math.sin(t * 30 + i) * 0.5;
          if ((PG.t[i] -= dt) < 0) PG.mode[i] = 2;
        } else if (PG.mode[i] === 2) {
          const sp = Math.min(d, 4 * dt); PG.x[i] += ex / (d || 1) * sp; PG.z[i] += ez / (d || 1) * sp; PG.y[i] = Math.max(0, Math.min(PG.y[i], d * 0.8));
          PG.yaw[i] = Math.atan2(ex, ez); roll = Math.sin(t * 26 + i) * 0.35;
          if (d < 0.05 && PG.y[i] <= 0) PG.mode[i] = 0;
        } else if (d > 0.35) {
          const sp = Math.min(d, 0.8 * dt); PG.x[i] += ex / d * sp; PG.z[i] += ez / d * sp; PG.y[i] = 0.035 * Math.abs(Math.sin(t * 13 + i)); PG.yaw[i] = Math.atan2(ex, ez);
        } else { PG.y[i] = 0; pitch = Math.max(0, Math.sin(t * 2.7 + i * 1.7)) * 0.55; PG.yaw[i] += Math.sin(t * 0.7 + i) * dt * 0.8; }
        D.position.set(PG.x[i], PG.y[i], PG.z[i]); D.rotation.set(pitch, PG.yaw[i], roll); D.scale.setScalar(1); D.updateMatrix(); L.pig.setMatrixAt(i, D.matrix);
      }
      L.pig.instanceMatrix.needsUpdate = true;
    }
    // ripples in the puddles, drips from the lodge window hood + downpipe
    if (L.rip.visible) {
      for (let i = 0; i < RP.n; i++) {
        if ((RP.age[i] += dt) >= RP.life[i]) { const p = PUDDLES[Math.floor(Math.random() * PUDDLES.length)], a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * 0.8; RP.x[i] = p[0] + Math.cos(a) * r * p[2]; RP.z[i] = p[1] + Math.sin(a) * r * p[3]; RP.age[i] = 0; RP.life[i] = 0.6 + Math.random() * 0.5; }
        const k = RP.age[i] / RP.life[i];
        D.position.set(RP.x[i], 0.034, RP.z[i]); D.rotation.set(0, 0, 0); D.scale.setScalar(0.04 + k * 0.42); D.updateMatrix(); L.rip.setMatrixAt(i, D.matrix);
        L.rip.setColorAt(i, tc.setScalar((1 - k) * 0.5));
      }
      L.rip.instanceMatrix.needsUpdate = true; L.rip.instanceColor.needsUpdate = true;
    }
    for (let i = 0; i < DR.n; i++) {
      if (DR.y[i] < 0) { DR.y[i] += dt; if (DR.y[i] >= 0) { const spout = i < 3; DR.x[i] = spout ? -19.72 : -19.86; DR.z[i] = spout ? 6.95 : 4.5 + Math.random() * 2.1; DR.y[i] = spout ? 0.28 : 2.98; DR.v[i] = 0; } }
      else { DR.v[i] += 9.8 * dt; DR.y[i] -= DR.v[i] * dt; if (DR.y[i] < 0.03) DR.y[i] = -(0.2 + Math.random() * (i < 3 ? 0.3 : 1.6)); }
      D.position.set(DR.x[i], Math.max(0, DR.y[i]), DR.z[i]); D.rotation.set(0, 0, 0); D.scale.setScalar(DR.y[i] < 0 ? 0 : 1); D.updateMatrix(); L.drip.setMatrixAt(i, D.matrix);
    }
    L.drip.instanceMatrix.needsUpdate = true;
    // the porter closes and locks the iron gate at dusk, then walks back to the lodge
    if (S.porter) {
      S.pt += dt; const P0 = L.porter;
      if (S.porter === 1) { P0.position.set(22.2, 0, 5.6); P0.rotation.set(0, H, 0); S.gateTo = 0; if (S.pt > 3) { S.porter = 2; S.pt = 0; } }
      else if (S.porter === 2) { P0.position.y = Math.abs(Math.sin(S.pt * 9)) * 0.02; P0.rotation.y = H + Math.sin(S.pt * 7) * 0.08; if (S.pt > 2.2) { S.porter = 3; S.pt = 0; } }
      else {
        let s = S.pt * 1.3, k = 1; while (k < PORTER_PATH.length && s > Math.hypot(PORTER_PATH[k][0] - PORTER_PATH[k - 1][0], PORTER_PATH[k][1] - PORTER_PATH[k - 1][1])) { s -= Math.hypot(PORTER_PATH[k][0] - PORTER_PATH[k - 1][0], PORTER_PATH[k][1] - PORTER_PATH[k - 1][1]); k++; }
        if (k >= PORTER_PATH.length) { S.porter = 0; P0.visible = false; }
        else { const a = PORTER_PATH[k - 1], b = PORTER_PATH[k], d = Math.hypot(b[0] - a[0], b[1] - a[1]); P0.position.set(a[0] + (b[0] - a[0]) * s / d, Math.abs(Math.sin(S.pt * 5.5)) * 0.03, a[1] + (b[1] - a[1]) * s / d); P0.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]); }
      }
    }
    // the lodge lamp (prop lodge_light) and the cyclist
    const lt = L.ll.visible ? 1 : 0;
    if (S.ll !== lt) { S.ll += Math.max(-dt * 1.5, Math.min(dt * 1.5, lt - S.ll)); for (const m of L.lodgeMats) m.emissiveIntensity = 0.42 * S.ll; }
    if (L.cyc.visible) { S.cyc = (S.cyc + dt * 3.6) % CYC.len; walkAt(CYC, S.cyc, WP); L.cyc.position.set(WP[0], 0, WP[1]); L.cyc.rotation.y = WP[2]; }
    S.gate += (S.gateTo - S.gate) * Math.min(1, dt * 0.8);
    L.gateL.rotation.y = -S.gate * 1.45; L.gateR.rotation.y = S.gate * 1.45;
    // sound: the lodge radio murmurs (positional), the gutter by the lodge gurgles while it rains
    if (typeof AUDIO !== 'undefined' && AUDIO.loop) {
      S.idle = 0;
      if (!S.radio) { S.radio = AUDIO.loop('radio', RADIO); addUpdate(watch); }
      if (S.env !== 'sun' && (S.gut -= dt) <= 0) { S.gut = 2.4; const ex = px - GUT.at[0], ez = pz - GUT.at[2]; if (ex * ex + ez * ez < 225) sfx('rain_gutter', GUT); }
    }
  }

  return {
    env: {
      rain: { bg: 0x9aa3ab, fog: [0xa2aab2, 0.022], hemi: [0xdfe6ee, 0x4a4f55, 1.05], dir: [0xe6ecf2, 0.75, [-6, 12, 4]] },
      dusk: { bg: 0x4b5566, fog: [0x59636f, 0.03], hemi: [0x8a96ad, 0x2a2e36, 0.7], dir: [0xffb27a, 0.4, [-12, 5, -3]] },
      night: { bg: 0x0d131d, fog: [0x19212d, 0.035], hemi: [0x3d4d6a, 0x101216, 0.45], dir: [0x8aa0c8, 0.15, [4, 12, 6]] },
      dark: { bg: 0x07090c, fog: [0x090b0f, 0.12], hemi: [0x1c2433, 0x050505, 0.1], dir: [0x2a3550, 0.03, [4, 12, 6]] },
      sun: { bg: 0xa6cdf0, fog: [0xecd6aa, 0.01], hemi: [0xfff0d8, 0x7a6a52, 1.1], dir: [0xffd690, 2.2, [8, 10, -6]] },
      sunday: { bg: 0x8e969d, fog: [0x979fa7, 0.026], hemi: [0xcfd6de, 0x44484e, 0.92], dir: [0xd8dfe6, 0.5, [-6, 12, 4]] },
    },
    build, marks, anchors, cams, zones, colliders, floor, update,
    puddles: PUDDLES,   // [x, z, rx, rz] ellipses (Keep Up: puddles slow you down)
    props: ['lamp_1', 'lamp_2', 'lamp_3', 'lamp_4', 'lamp_5', 'lamp_6', 'lamp_7', 'lamp_8', 'bell', 'bike', 'bike_chain', 'cupboard_door', 'lodge_door',
      'machine', 'machine_prepaid', 'machine_wrap', 'machine_screen', 'machine_wire', 'footprints', 'scarf', 'pigeons', 'umbrella_crowd', 'toast_1', 'toast_2', 'toast_3',
      'glasses', 'key_brass', 'swivel_chair', 'yes_sign', 'iron_gate_l', 'iron_gate_r', 'porter', 'windows_lit', 'cyclist', 'lodge_light'],
    ambience: { rain: true, loops: [], room: 'wet' },
  };
})();
