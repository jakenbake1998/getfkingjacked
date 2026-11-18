// 3D mannequin for exercise demos (three.js, loaded only when needed).
// Smooth lit body parts posed by the same key poses as figure.js. Muscles the exercise trains
// glow red on the body itself (painted into the mesh colours), helpers glow orange.
(function () {
  const F = window.Figure;
  // Any exercise gets a figure: its own poses, or a stand-in from its muscle group (for lifts imported from other apps)
  const FAMILY = { Chest: 'pushup', Back: 'bb_row', Shoulders: 'standing_db_press', Biceps: 'db_curl', Triceps: 'db_oh_ext', Quads: 'bw_squat', Hamstrings: 'db_rdl', Glutes: 'glute_bridge', Calves: 'db_calf_raise', Core: 'crunch', Other: 'bw_squat' };
  function exOf(id) { return (window.EXERCISES || []).find((e) => e.id === id) || (window.Engine && Engine.S && Engine.exInfo(id)) || null; }
  function getDef(id) {
    if (F && F.defs[id]) return F.defs[id];
    const ex = exOf(id);
    if (!ex || !F) return null;
    const base = F.defs[FAMILY[ex.group] || 'bw_squat'];
    if (!base) return null;
    const tgt = { Chest: { chest: 1 }, Back: { lats: 1 }, Shoulders: { shoulders: 1 }, Biceps: { biceps: 1 }, Triceps: { triceps: 1 }, Quads: { quadriceps: 1 }, Hamstrings: { hamstrings: 1 }, Glutes: { glutes: 1 }, Calves: { calves: 1 }, Core: { abdominals: 1 } }[ex.group] || { quadriceps: 1 };
    return (F.defs[id] = Object.assign({}, base, { target: tgt }));
  }
  const has = (id) => !!getDef(id);
  let T = null, loading = null, failed = false;
  const thumbs = {};
  try { Object.assign(thumbs, JSON.parse(localStorage.getItem('gfj.figthumbs.v3') || '{}')); } catch (e) {}

  function load() {
    if (T) return Promise.resolve(T);
    if (!loading) loading = import('./vendor/three.module.min.js').then((m) => (T = m)).catch((e) => { failed = true; throw e; });
    return loading;
  }

  // ---------- body part shapes: radius along the bone, t = 0 at the near joint ----------
  const SHAPES = {
    torso: { len: 50, keys: [[0, 13], [0.2, 12.4], [0.45, 14.4], [0.72, 16.6], [0.9, 16.4], [1, 11.5]], capA: true, capB: true, front: 1 },
    ua: { len: 28, keys: [[0, 7.8], [0.3, 7.2], [0.55, 7.2], [0.85, 5.2], [1, 4.6]], front: -1, capA: true, capB: true },
    fa: { len: 25, keys: [[0, 4.8], [0.2, 5.8], [0.6, 4.2], [1, 3.2]], front: -1, capA: true, capB: true },
    th: { len: 40, keys: [[0, 9.8], [0.2, 9.6], [0.5, 8.4], [0.85, 6.2], [1, 5.4]], front: -1, capA: true, capB: true },
    sh: { len: 38, keys: [[0, 5.3], [0.22, 6.4], [0.5, 4.8], [0.85, 3.4], [1, 3.1]], front: -1, capA: true, capB: true },
    neck: { len: 8, keys: [[0, 5.6], [1, 5]], front: 1 },
  };
  // Muscle patches: [name, t0, t1, angle from front (deg) min, max]
  const PATCHES = {
    torso: [['chest', 0.6, 0.97, 0, 62], ['abs', 0.1, 0.6, 0, 34], ['obliques', 0.08, 0.62, 44, 104], ['lats', 0.4, 0.9, 100, 165], ['lowerback', 0, 0.42, 140, 181], ['traps', 0.84, 1.05, 115, 181]],
    ua: [['biceps', 0.2, 0.88, 0, 62], ['triceps', 0.1, 0.88, 108, 181]],
    fa: [['forearms', 0, 0.65, 0, 181]],
    th: [['quads', 0.08, 0.92, 0, 78], ['hams', 0.15, 0.88, 106, 181]],
    sh: [['calves', 0.04, 0.58, 100, 181]],
    neck: [],
  };
  const BASE = 0x8f969f, RED = 0xff2a1f, ORANGE = 0xff8a2a;
  const sstep = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const band = (x, a, b, fe) => sstep(a - fe, a + fe, x) * (1 - sstep(b - fe, b + fe, x));

  function partGeom(kind, tg, widthFn) {
    const S = SHAPES[kind], N = 22, pts = [];
    const r = (t) => {
      const k = S.keys;
      for (let i = 0; i < k.length - 1; i++) if (t <= k[i + 1][0]) { const u = (t - k[i][0]) / (k[i + 1][0] - k[i][0]); return k[i][1] + (k[i + 1][1] - k[i][1]) * (1 - Math.cos(u * Math.PI)) / 2; }
      return k[k.length - 1][1];
    };
    const r0 = r(0), r1 = r(1);
    if (S.capA) for (const a of [-90, -72, -54, -36, -18]) pts.push(new T.Vector2(Math.max(0.01, r0 * Math.cos((a * Math.PI) / 180)), r0 * 0.55 * Math.sin((a * Math.PI) / 180)));
    for (let i = 0; i <= N; i++) pts.push(new T.Vector2(r(i / N), (i / N) * S.len));
    if (S.capB) for (const a of [18, 36, 54, 72, 90]) pts.push(new T.Vector2(Math.max(0.01, r1 * Math.cos((a * Math.PI) / 180)), S.len + r1 * 0.55 * Math.sin((a * Math.PI) / 180)));
    const g = new T.LatheGeometry(pts, 40);
    const pos = g.attributes.position, nor = g.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    const cBase = new T.Color(BASE), cR = new T.Color(RED), cO = new T.Color(ORANGE), c = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const t = y / S.len;
      if (widthFn) {
        const [sx, sz] = widthFn(t, x * S.front > 0);
        x *= sx; z *= sz;
        let nx = nor.getX(i) / sx, ny = nor.getY(i), nz = nor.getZ(i) / sz;
        const l = Math.hypot(nx, ny, nz) || 1;
        nor.setXYZ(i, nx / l, ny / l, nz / l);
        pos.setXYZ(i, x, y, z);
      }
      const ang = Math.abs((Math.atan2(z, x * S.front) * 180) / Math.PI);
      let wR = 0, wO = 0;
      for (const [name, t0, t1, a0, a1] of PATCHES[kind]) {
        const lvl = tg[name];
        if (!lvl) continue;
        const w = band(t, t0, t1, 0.07) * band(ang, a0, a1, 16);
        if (lvl === 1) wR = Math.max(wR, w); else wO = Math.max(wO, w);
      }
      c.copy(cBase).lerp(cO, wO * 0.9).lerp(cR, wR * 0.95);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    return g;
  }
  // Sphere-like parts (joints, delts, pelvis, head, hands, feet), optionally tinted
  function blobGeom(rx, ry, rz, tint, region) {
    const g = new T.SphereGeometry(1, 36, 26);
    g.scale(rx, ry, rz);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    const cBase = new T.Color(BASE), c = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      c.copy(cBase);
      if (tint) {
        const w = region ? region(pos.getX(i) / rx, pos.getY(i) / ry, pos.getZ(i) / rz) : 1;
        c.lerp(new T.Color(tint), w);
      }
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new T.BufferAttribute(col, 3));
    return g;
  }

  // ---------- which muscles light up ----------
  const MUSCLE_MAP = { chest: 'chest', shoulders: 'delts', triceps: 'triceps', biceps: 'biceps', forearms: 'forearms', lats: 'lats', 'middle back': 'lats', 'lower back': 'lowerback',
    traps: 'traps', abdominals: 'abs', obliques: 'obliques', quadriceps: 'quads', hamstrings: 'hams', glutes: 'glutes', calves: 'calves', adductors: 'quads', abductors: 'glutes', neck: 'traps' };
  const GROUP_MAP = { Chest: ['chest'], Back: ['lats'], Shoulders: ['delts'], Biceps: ['biceps'], Triceps: ['triceps'], Quads: ['quads'], Hamstrings: ['hams'], Glutes: ['glutes'], Calves: ['calves'], Core: ['abs', 'obliques'] };
  function targetsFor(id, def) {
    const tg = {};
    if (def.target) { Object.keys(def.target).forEach((k) => (tg[MUSCLE_MAP[k] || k] = def.target[k])); return tg; }
    const inf = (window.EXINFO && EXINFO[id]) || null;
    if (inf && inf.m && inf.m.length) {
      (inf.s || []).forEach((m) => { if (MUSCLE_MAP[m]) tg[MUSCLE_MAP[m]] = 2; });
      inf.m.forEach((m) => { if (MUSCLE_MAP[m]) tg[MUSCLE_MAP[m]] = 1; });
    }
    const ex = exOf(id);
    if (ex && GROUP_MAP[ex.group]) GROUP_MAP[ex.group].forEach((m) => (tg[m] = 1));
    return tg;
  }

  // ---------- solving a pose: joint angles -> joint positions (svg-style coords: x forward, y down, z to the side) ----------
  const L = { torso: 50, neck: 6, head: 8.5, ua: 28, fa: 25, th: 40, sh: 38 };
  const SHO_Z = 21, HIP_Z = 8.5, FLOOR = 186;
  const R = (d) => (d * Math.PI) / 180;
  const v3 = (x, y, z) => ({ x, y, z: z || 0 });
  const add = (a, b, k) => v3(a.x + b.x * (k == null ? 1 : k), a.y + b.y * (k == null ? 1 : k), a.z + b.z * (k == null ? 1 : k));
  const sub = (a, b) => v3(a.x - b.x, a.y - b.y, a.z - b.z);
  const len3 = (a) => Math.hypot(a.x, a.y, a.z);
  const nrm = (a) => { const l = len3(a) || 1; return v3(a.x / l, a.y / l, a.z / l); };
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const cross = (a, b) => v3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  function rotAxis(v, k, deg) { // Rodrigues
    if (!deg) return v;
    const c = Math.cos(R(deg)), s = Math.sin(R(deg));
    return add(add(v3(v.x * c, v.y * c, v.z * c), cross(k, v), s), k, dot(k, v) * (1 - c));
  }
  const PAD = { ankle0: 5.5, ankle1: 5.5, knee0: 5.5, knee1: 5.5, hand0: 3.5, hand1: 3.5, mid: 3.5, elb0: 4.5, elb1: 4.5, hip: 12, sho: 13, head: 8.5, hipj0: 9, hipj1: 9 };
  const arr = (v, d) => (v == null ? [d, d] : Array.isArray(v) ? v : [v, v]);
  function solve3(def, p) {
    const J = {}, F = {};
    const t = p.t || 0, tw = p.tw || 0;
    const T = v3(Math.sin(R(t)), -Math.cos(R(t)), 0); // torso direction, hip -> shoulders
    const TF = rotAxis(v3(Math.cos(R(t)), Math.sin(R(t)), 0), T, tw); // chest-facing direction
    const lat = rotAxis(v3(0, 0, 1), T, tw); // shoulder line, twisted with the torso
    J.hip = v3(0, 0, 0);
    J.sho = add(J.hip, T, L.torso);
    const hd = p.hd || 0;
    const H = v3(Math.sin(R(t + hd)), -Math.cos(R(t + hd)), 0);
    J.neck = add(J.sho, H, L.neck);
    J.head = add(J.neck, H, L.head);
    F.torso = TF; F.head = v3(Math.cos(R(t + hd)), Math.sin(R(t + hd)), 0);
    const ua = arr(p.ua, 4), fa = arr(p.fa, 2), abd = arr(p.abd, 0), fabd = p.fabd != null ? arr(p.fabd, 0) : abd;
    const th = arr(p.th, 0), sh = arr(p.sh, 0), labd = arr(p.labd, 0), slabd = p.slabd != null ? arr(p.slabd, 0) : labd;
    // a limb direction from a sagittal angle (0 down, 90 forward, 180 up) tipped out to the side by `ab`
    const limb = (a, ab, side, twist) => {
      let v = v3(Math.sin(R(a)) * Math.cos(R(ab)), Math.cos(R(a)) * Math.cos(R(ab)), side * Math.sin(R(ab)));
      if (twist) v = rotAxis(v, T, tw);
      return v;
    };
    const front = (v, fallback) => { const f = v3(v.y, -v.x, 0); return len3(f) > 0.15 ? nrm(f) : fallback; };
    const handsZ = def.handsZ;
    for (let i = 0; i < 2; i++) {
      const sg = i === 0 ? 1 : -1;
      const sho = add(add(J.sho, lat, sg * SHO_Z), T, -5 + (p.shrug || 0));
      let du = limb(ua[i], abd[i], sg, true), df = limb(fa[i], fabd[i], sg, true);
      let elb = add(sho, du, L.ua), hand = add(elb, df, L.fa);
      if (handsZ != null && !p.abd) { // hands drawn in toward a shared grip
        const hz = sg * handsZ, ez = sho.z * 0.55 + hz * 0.45;
        elb = v3(elb.x, elb.y, ez); hand = v3(hand.x, hand.y, hz);
      }
      J['sho' + i] = sho; J['elb' + i] = elb; J['hand' + i] = hand;
      F['ua' + i] = front(sub(elb, sho), TF); F['fa' + i] = front(sub(hand, elb), TF);
      const hj = v3(0, 0, sg * HIP_Z);
      const dt = limb(th[i], labd[i], sg), ds = limb(sh[i], slabd[i], sg);
      const knee = add(hj, dt, L.th), ank = add(knee, ds, L.sh);
      J['hipj' + i] = hj; J['knee' + i] = knee; J['ankle' + i] = ank;
      F['th' + i] = front(dt, v3(1, 0, 0)); F['sh' + i] = front(ds, v3(1, 0, 0));
      // foot points "forward" relative to the shin
      F['foot' + i] = nrm(v3(ds.y, -ds.x, 0));
    }
    J.mid = v3((J.hand0.x + J.hand1.x) / 2, (J.hand0.y + J.hand1.y) / 2, (J.hand0.z + J.hand1.z) / 2);
    const keys = Object.keys(J);
    const move = (dx, dy) => keys.forEach((k) => (J[k] = v3(J[k].x + dx, J[k].y + dy, J[k].z)));
    const rotZ = (c, deg) => { const co = Math.cos(R(deg)), si = Math.sin(R(deg)); keys.forEach((k) => { const q = J[k], x = q.x - c.x, y = q.y - c.y; J[k] = v3(c.x + x * co - y * si, c.y + x * si + y * co, q.z); }); Object.keys(F).forEach((k) => { const q = F[k]; F[k] = v3(q.x * co - q.y * si, q.x * si + q.y * co, q.z); }); };
    // roll the whole body onto its side (side plank, clamshell)
    if (def.roll) {
      const co = Math.cos(R(def.roll)), si = Math.sin(R(def.roll));
      const rx = (q) => v3(q.x, q.y * co - q.z * si, q.y * si + q.z * co);
      keys.forEach((k) => (J[k] = rx(J[k])));
      Object.keys(F).forEach((k) => (F[k] = rx(F[k])));
    }
    // place the root joint
    const rootK = def.root === 'ankle' ? 'ankle0' : def.root || 'hip';
    const at = p.at || def.at || [100, FLOOR - 5.5];
    move(at[0] - J[rootK].x, at[1] - J[rootK].y);
    // two-point fit: rotate about the first contact until the second reaches its surface
    const fit = p.fit || def.fit;
    if (fit) {
      const A = fit[0], B = fit[1];
      const pa = A.pad != null ? A.pad : PAD[A.j] || 0, pb = B.pad != null ? B.pad : PAD[B.j] || 0;
      move(0, A.y - pa - J[A.j].y);
      const c = J[A.j], q = J[B.j];
      const dx = q.x - c.x, dy = q.y - c.y, r = Math.hypot(dx, dy);
      const want = Math.max(-r, Math.min(r, B.y - pb - c.y));
      const a0 = Math.atan2(dy, dx);
      let a1 = Math.asin(want / r);
      if (dx < 0) a1 = Math.PI - a1;
      rotZ(c, ((a1 - a0) * 180) / Math.PI);
    }
    // stand on the floor
    if (def.ground && !fit) {
      let low = -1e9;
      for (const k of def.ground) low = Math.max(low, J[k].y + (PAD[k] || 0));
      move(0, FLOOR - low);
    }
    if (p.heel) move(0, -p.heel);
    return { J, F, heel: p.heel || 0 };
  }

  // ---------- one scene per exercise ----------
  const scenes = {};
  function tint(lvl) { return lvl === 1 ? RED : lvl === 2 ? ORANGE : null; }
  const lerp = (a, b, s) => (Array.isArray(a) ? a.map((x, i) => lerp(x, b[i], s)) : typeof a === 'number' ? a + (b - a) * s : a);
  function poseAt(def, s) {
    const o = {};
    const keys = new Set(Object.keys(def.a).concat(Object.keys(def.b || {})));
    keys.forEach((k) => { if (k === 'fit') return; const a = def.a[k], b = def.b && def.b[k] != null ? def.b[k] : a; o[k] = a == null ? b : lerp(a, b, s); });
    if (def.b && def.b.fit && s > 0.5) o.fit = def.b.fit; else if (def.a.fit) o.fit = def.a.fit;
    return o;
  }
  function build(id) {
    if (scenes[id]) return scenes[id];
    const def = getDef(id);
    const tg = targetsFor(id, def);
    const scene = new T.Scene();
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.08 });
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  float warm = max(vColor.r - max(vColor.g, vColor.b), 0.0);\n  totalEmissiveRadiance += vec3(1.0, 0.18, 0.1) * warm * 0.75;');
    };
    const dark = new T.MeshStandardMaterial({ color: 0x2b3138, roughness: 0.55, metalness: 0.3 });
    const pad = new T.MeshStandardMaterial({ color: 0x23282e, roughness: 0.7, metalness: 0.1 });
    const steel = new T.MeshStandardMaterial({ color: 0xa3acb6, roughness: 0.28, metalness: 0.85 });
    const iron = new T.MeshStandardMaterial({ color: 0x1d2227, roughness: 0.45, metalness: 0.5 });
    scene.add(new T.HemisphereLight(0xdde7ff, 0x15181c, 1.1));
    const key = new T.DirectionalLight(0xffffff, 2.6); key.position.set(80, 160, 140); scene.add(key);
    const rim = new T.DirectionalLight(0x8fb0ff, 1.8); rim.position.set(-120, 60, -100); scene.add(rim);
    const fill = new T.DirectionalLight(0xffe2c8, 0.6); fill.position.set(60, -40, 120); scene.add(fill);

    const torsoW = (t, front) => [0.66 * (front && t > 0.55 && t < 0.98 ? 1.14 : 1), 0.95 + 0.62 * sstep(0.22, 0.86, t)];
    const G = {
      torso: partGeom('torso', tg, torsoW), neck: partGeom('neck', tg), ua: partGeom('ua', tg), fa: partGeom('fa', tg), th: partGeom('th', tg), sh: partGeom('sh', tg),
      delt: blobGeom(9, 8.6, 8.8, tint(tg.delts)), elbow: blobGeom(4.5, 4.5, 4.5), knee: blobGeom(5.4, 5.4, 5.4),
      pelvis: blobGeom(11.5, 10, 15, tint(tg.glutes), (x, y) => sstep(0.05, -0.45, x) * sstep(0.5, -0.1, y)),
      head: blobGeom(7.4, 9, 7.2), chin: blobGeom(4.6, 4.2, 5.4), hand: blobGeom(3.3, 4.8, 2.4), thumb: blobGeom(1.4, 2.6, 1.4), foot: blobGeom(3.2, 8.6, 4.1),
      hipj: blobGeom(9.6, 9.6, 9.6, tint(tg.glutes), (x) => sstep(0.1, -0.5, x) * 0.9), ankle: blobGeom(3.3, 3.3, 3.3),
    };
    const rig = new T.Group(); scene.add(rig);
    const M = (g, m, parent) => { const o = new T.Mesh(g, m || mat); (parent || rig).add(o); return o; };
    const P = {
      torso: M(G.torso), pelvis: M(G.pelvis), neck: M(G.neck), head: M(G.head), chin: M(G.chin),
      ua: [M(G.ua), M(G.ua)], fa: [M(G.fa), M(G.fa)], th: [M(G.th), M(G.th)], sh: [M(G.sh), M(G.sh)],
      delt: [M(G.delt), M(G.delt)], elbow: [M(G.elbow), M(G.elbow)], knee: [M(G.knee), M(G.knee)], hand: [M(G.hand), M(G.hand)], thumb: [M(G.thumb), M(G.thumb)],
      foot: [M(G.foot), M(G.foot)], hipj: [M(G.hipj), M(G.hipj)], ankle: [M(G.ankle), M(G.ankle)],
    };
    // ---- equipment ----
    const props = { hold: [], extents: [] };
    const box = (w, h, d, x, y, z, m) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m || dark); o.position.set(x, -y, z || 0); scene.add(o); props.extents.push([x - w / 2, y - h / 2], [x + w / 2, y + h / 2]); return o; };
    const cyl = (r, l, m, seg) => new T.Mesh(new T.CylinderGeometry(r, r, l, seg || 16), m);
    const A = solve3(def, poseAt(def, 0)), B = solve3(def, poseAt(def, 1));
    const auto = (spec) => { // a surface placed under a joint at pose a or b
      const src = spec.pose === 'b' ? B : A, j = src.J[spec.at];
      return { x: j.x + (spec.dx || 0), top: spec.top != null ? spec.top : j.y + (PAD[spec.at] || 0) };
    };
    const flatBench = (x0, x1, top) => { box(x1 - x0, 7, 26, (x0 + x1) / 2, top + 3.5, 0, pad); const legH = FLOOR - top - 7; for (const x of [x0 + 10, x1 - 10]) box(5, legH, 20, x, top + 7 + legH / 2, 0, iron); };
    if (def.bench) { const b = def.bench.at ? (() => { const a = auto(def.bench); const w = def.bench.w || 90; const x0 = a.x - (def.bench.side === 'right' ? 10 : w - 10); return { x0, x1: x0 + w, top: a.top }; })() : def.bench; flatBench(b.x0, b.x1, b.top); }
    if (def.incline) { // seat plus a tilted back pad
      const c = def.incline, seatTop = c.seat || 152;
      flatBench(c.x - 10, c.x + 34, seatTop);
      const ang = c.angle, len = 74;
      const back = new T.Mesh(new T.BoxGeometry(len, 7, 26), pad);
      const cx = c.x - 6 - (Math.cos(R(ang)) * len) / 2 * (c.dir || 1), cy = seatTop - (Math.sin(R(ang)) * len) / 2;
      back.position.set(cx, -cy, 0); back.rotation.z = -(c.dir || 1) * R(ang); scene.add(back);
      props.extents.push([cx - len / 2, cy - 30], [cx + len / 2, cy + 30]);
    }
    if (def.chestPad) { // incline pad under the chest, parallel to the torso
      const j = A.J, fr = solve3(def, poseAt(def, 0)).F.torso;
      const mid = add(add(j.hip, sub(j.sho, j.hip), 0.55), fr, 16);
      const ang = Math.atan2(j.sho.y - j.hip.y, j.sho.x - j.hip.x);
      const padM = new T.Mesh(new T.BoxGeometry(62, 7, 26), pad); padM.position.copy(new T.Vector3(mid.x, -mid.y, 0)); padM.rotation.z = -ang; scene.add(padM);
      const leg = new T.Mesh(new T.BoxGeometry(5, FLOOR - mid.y, 18), iron); leg.position.set(mid.x + 6, -(mid.y + FLOOR) / 2, 0); scene.add(leg);
    }
    if (def.box) { const b = def.box.at ? (() => { const a = auto(def.box); return { x0: a.x - 22, x1: a.x + 22, top: a.top }; })() : def.box; box(b.x1 - b.x0, FLOOR - b.top, 30, (b.x0 + b.x1) / 2, (b.top + FLOOR) / 2, 0, pad); }
    if (def.pullbar) { // overhead bar with two posts
      const y = def.pullbar.y, x = def.pullbar.x != null ? def.pullbar.x : A.J.mid.x;
      const bar = cyl(1.8, 96, steel); bar.rotation.x = Math.PI / 2; bar.position.set(x, -y, 0); scene.add(bar);
      for (const z of [-46, 46]) box(5, FLOOR - y + 6, 5, x, (y + FLOOR) / 2 - 3, z, iron);
    }
    if (def.dips) { const y = def.dips.y, x = A.J.mid.x; for (const z of [-26, 26]) { const b = cyl(2, 60, steel); b.rotation.z = Math.PI / 2; b.position.set(x + 8, -y, z); scene.add(b); box(4, FLOOR - y, 4, x - 18, (y + FLOOR) / 2, z, iron); box(4, FLOOR - y, 4, x + 34, (y + FLOOR) / 2, z, iron); } }
    if (def.mat) { const m = new T.Mesh(new T.BoxGeometry(def.mat[1] - def.mat[0], 1.2, 46), new T.MeshStandardMaterial({ color: 0x2c3a42, roughness: 0.9 })); m.position.set((def.mat[0] + def.mat[1]) / 2, -FLOOR + 0.6, 0); scene.add(m); }
    if (def.cable) {
      const c = def.cable, cz = c[2] || 0;
      const colX = c[0] + (c[0] < 100 ? -8 : 8);
      box(12, FLOOR - 4, 16, cz ? c[0] : colX, FLOOR / 2 + 2, cz ? cz + Math.sign(cz) * 8 : 0);
      const pul = cyl(3.6, 3, steel, 20); pul.rotation.x = Math.PI / 2; pul.position.set(c[0], -c[1], cz); scene.add(pul);
      props.cable = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 1, 8).translate(0, 0.5, 0), steel); scene.add(props.cable);
    }
    const dumbbell = (vertical) => { const g = new T.Group(); const h = cyl(1.5, 13, steel, 12); h.rotation.x = Math.PI / 2; g.add(h); for (const z of [-6.5, 6.5]) { const p = cyl(6.2, 3.6, iron, 24); p.rotation.x = Math.PI / 2; p.position.z = z; g.add(p); } if (vertical) g.rotation.x = Math.PI / 2; scene.add(g); return g; };
    const kettlebell = () => { const g = new T.Group(); const b = new T.Mesh(new T.SphereGeometry(6.5, 24, 18), iron); b.position.y = -8; g.add(b); const hnd = new T.Mesh(new T.TorusGeometry(3.6, 1.1, 10, 24, Math.PI), iron); hnd.position.y = -2.4; g.add(hnd); scene.add(g); return g; };
    const barbell = (len, plateR) => { const g = new T.Group(); const b = cyl(1.4, len, steel, 12); b.rotation.x = Math.PI / 2; g.add(b); for (const z of [-(len / 2 - 8), len / 2 - 8]) { const p = cyl(plateR, 4.5, iron, 28); p.rotation.x = Math.PI / 2; p.position.z = z; g.add(p); } scene.add(g); return g; };
    const h = def.hold;
    if (h === 'db') props.hold = [dumbbell(), dumbbell()];
    else if (h === 'db1') props.hold = [dumbbell(), null];
    else if (h === 'kb') props.hold = [kettlebell(), kettlebell()];
    else if (h === 'kb1') props.hold = [kettlebell(), null];
    else if (h === 'goblet') props.mid = dumbbell(true);
    else if (h === 'kbmid') props.mid = kettlebell();
    else if (h === 'bar') props.mid = barbell(112, 17);
    else if (h === 'cbar') props.mid = barbell(36, 0.01);
    else if (h === 'backbar') props.back = barbell(112, 17);
    else if (h === 'hipbar') props.hipbar = barbell(112, 17);
    else if (h === 'hipdb') props.hipdb = dumbbell();
    else if (h === 'landmine') { props.land = cyl(1.4, 1, steel, 10).translateY(0); props.land.geometry.translate(0, 0.5, 0); scene.add(props.land); const pl = cyl(17, 4.5, iron, 28); props.landPlate = pl; scene.add(pl); }
    else if (h === 'wheel') { const w = cyl(9, 5, iron, 30); w.rotation.x = Math.PI / 2; props.mid = w; scene.add(w); }
    if (h === 'rope') { const rm = new T.MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.8 }); props.rope = [new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 12, 10), rm), new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 12, 10), rm)]; props.rope.forEach((r) => scene.add(r)); }
    if (h === 'handle') { props.handle = cyl(1.6, 12, iron, 12); props.handle.rotation.x = Math.PI / 2; scene.add(props.handle); }
    // soft contact shadow
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const cx2 = cv.getContext('2d'); const gr = cx2.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); cx2.fillStyle = gr; cx2.fillRect(0, 0, 64, 64);
    const shadow = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; scene.add(shadow);
    // framing box over the whole movement
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const k of [0, 0.5, 1]) { const S = solve3(def, poseAt(def, k)); for (const j of Object.values(S.J)) { x0 = Math.min(x0, j.x - 10); x1 = Math.max(x1, j.x + 10); y0 = Math.min(y0, j.y - 12); y1 = Math.max(y1, j.y + 10); } }
    for (const e of props.extents) { x0 = Math.min(x0, e[0]); x1 = Math.max(x1, e[0]); y0 = Math.min(y0, e[1]); y1 = Math.max(y1, e[1]); }
    if (def.cable) { x0 = Math.min(x0, def.cable[0] - 6); x1 = Math.max(x1, def.cable[0] + 6); y0 = Math.min(y0, def.cable[1] - 6); }
    y1 = Math.max(y1, FLOOR + 4);
    shadow.scale.set(Math.max(60, x1 - x0) * 0.9, 48, 1); shadow.position.set((x0 + x1) / 2, -FLOOR + 0.2, 0);
    const autoView = [x0, y0, x1 - x0, y1 - y0];
    const s = { id, def, scene, P, props, view: def.view || autoView, mini: def.mini || autoView };
    scenes[id] = s;
    return s;
  }

  // Place a bone-shaped part from A to B (svg-style coords). `fr` is the direction its front should face.
  const W3 = (q) => new T.Vector3(q.x, -q.y, q.z);
  function place(o, a, b, fr, sign) {
    const A = W3(a), B = W3(b);
    const y = new T.Vector3().subVectors(B, A);
    const L2 = y.length() || 1; y.divideScalar(L2);
    let x = fr ? new T.Vector3(fr.x, -fr.y, fr.z).multiplyScalar(sign || 1) : new T.Vector3(1, 0, 0);
    x.addScaledVector(y, -x.dot(y));
    if (x.lengthSq() < 1e-4) { x = new T.Vector3(0, 0, 1).cross(y); if (x.lengthSq() < 1e-4) x = new T.Vector3(1, 0, 0); }
    x.normalize();
    const z = new T.Vector3().crossVectors(x, y).normalize();
    o.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    o.position.copy(A);
    return y;
  }
  const blob = (o, at, dirFrom, dirTo, fr) => { if (dirFrom) place(o, dirFrom, dirTo, fr, 1); o.position.copy(W3(at)); };
  function pose(s, k) {
    const { def, P, props } = s;
    const { J, F, heel } = solve3(def, poseAt(def, k));
    const tdir = nrm(sub(J.sho, J.hip));
    place(P.torso, J.hip, J.sho, F.torso, 1);
    blob(P.pelvis, add(J.hip, tdir, 2), J.hip, J.sho, F.torso);
    place(P.neck, add(J.sho, tdir, -3), J.neck, F.head, 1);
    blob(P.head, J.head, J.neck, J.head, F.head);
    const hdir = nrm(sub(J.head, J.neck));
    blob(P.chin, add(add(J.head, hdir, -4.2), F.head, 2.6), J.neck, J.head, F.head);
    for (let i = 0; i < 2; i++) {
      const sho = J['sho' + i], elb = J['elb' + i], hand = J['hand' + i];
      place(P.ua[i], sho, elb, F['ua' + i], -1);
      const ud = nrm(sub(elb, sho));
      blob(P.delt[i], add(sho, ud, 2.5), sho, elb, F['ua' + i]);
      blob(P.elbow[i], elb);
      place(P.fa[i], elb, hand, F['fa' + i], -1);
      const fd = nrm(sub(hand, elb));
      blob(P.hand[i], add(hand, fd, 2.5), elb, hand, F['fa' + i]);
      const side = cross(fd, F['fa' + i]);
      blob(P.thumb[i], add(add(add(hand, fd, 1.2), F['fa' + i], 2), side, (i ? 1 : -1) * 1.4), elb, hand, F['fa' + i]);
      const hj = J['hipj' + i], knee = J['knee' + i], ank = J['ankle' + i];
      place(P.th[i], hj, knee, F['th' + i], -1);
      blob(P.hipj[i], add(hj, tdir, 1.5), J.hip, J.sho, F.torso);
      blob(P.knee[i], knee);
      place(P.sh[i], knee, ank, F['sh' + i], -1);
      blob(P.ankle[i], ank);
      let fdir = F['foot' + i];
      if (heel) fdir = nrm(v3(fdir.x * Math.cos(R(40)), Math.sin(R(40)), fdir.z));
      const toe = add(ank, fdir, 9);
      place(P.foot[i], ank, toe, v3(0, -1, 0), 1);
      P.foot[i].position.copy(W3(add(add(ank, fdir, 4.6), nrm(sub(ank, knee)), 2.2)));
      if (props.hold[i]) {
        const g = props.hold[i];
        g.position.copy(W3(add(hand, fd, 2.5)));
        if (def.hold === 'kb' || def.hold === 'kb1') g.quaternion.identity(); else g.rotation.set(0, 0, Math.atan2(-fd.y, fd.x));
      }
      if (props.rope) props.rope[i].position.copy(W3(add(hand, v3(0, 6, i ? -1.5 : 1.5))));
    }
    if (props.mid) props.mid.position.copy(W3(add(J.mid, nrm(sub(J.hand0, J.elb0)), def.hold === 'wheel' ? 6 : def.hold === 'kbmid' ? 1 : 2.5)));
    if (props.back) props.back.position.copy(W3(add(add(J.sho, nrm(sub(J.sho, J.hip)), 2), F.torso, -9)));
    if (props.hipbar) props.hipbar.position.copy(W3(add(J.hip, F.torso, 13)));
    if (props.hipdb) props.hipdb.position.copy(W3(add(J.hip, F.torso, 14)));
    if (props.handle) props.handle.position.copy(W3(add(J.mid, nrm(sub(J.hand0, J.elb0)), 2)));
    if (props.land) { const piv = v3(def.landPivot ? def.landPivot[0] : 20, FLOOR - 2, 0); const tip = add(J.hand0, nrm(sub(J.hand0, J.elb0)), 2); place(props.land, piv, tip); props.land.scale.set(1, len3(sub(tip, piv)), 1); const d = nrm(sub(tip, piv)); props.landPlate.position.copy(W3(add(piv, d, 10))); place(props.landPlate, add(piv, d, 8), add(piv, d, 12)); props.landPlate.position.copy(W3(add(piv, d, 10))); }
    if (props.cable) {
      const c = def.cable, A = v3(c[0], c[1], c[2] || 0);
      const to = def.cableTo || 'hand0';
      let Hh = J[to] || J.hand0;
      if (to === 'hand0' && def.handsZ == null && !def.cable[2]) Hh = J.hand0;
      place(props.cable, A, Hh);
      props.cable.scale.set(1, len3(sub(Hh, A)), 1);
    }
  }

  function frameCam(cam, view, aspect, camDir, yaw) {
    const [x, y, w, h] = view;
    const target = new T.Vector3(x + w / 2, -(y + h / 2), 0);
    const half = ((cam.fov / 2) * Math.PI) / 180;
    const needH = Math.max(h, w / aspect);
    const dist = (needH / 2) / Math.tan(half) * 1.06;
    const dir = new T.Vector3(...(camDir || [0.5, 0.16, 0.85])).normalize();
    if (yaw) dir.applyAxisAngle(new T.Vector3(0, 1, 0), yaw); // spin around the figure at the same height
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
  }

  function dispose(id) {
    const sc = scenes[id];
    if (!sc) return;
    sc.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); } });
    delete scenes[id];
  }
  // ---------- hero (one shared renderer, moved into whichever element is showing) ----------
  let hero = null;
  function heroRenderer() {
    if (hero) return hero;
    const r = new T.WebGLRenderer({ antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputColorSpace = T.SRGBColorSpace;
    r.toneMapping = T.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.domElement.className = 'fig3d';
    hero = { r, cam: new T.PerspectiveCamera(28, 1, 1, 3000), el: null, id: null };
    return hero;
  }
  function mount(el, id) {
    if (!has(id) || !el || el._mounted) return;
    el._mounted = true;
    load().then(() => {
      const h = heroRenderer();
      if (h.id && h.id !== id) dispose(h.id);
      const s = build(id);
      h.el = el; h.id = id;
      el.appendChild(h.r.domElement);
      const t0 = performance.now();
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      // Swipe left/right to spin the camera 360° around the figure (How-to only). No zoom, no tilt.
      const spin = { yaw: 0, v: 0, drag: null };
      if (el.dataset.orbit != null) {
        el.addEventListener('pointerdown', (e) => { spin.drag = { x: e.clientX, id: e.pointerId, t: performance.now() }; spin.v = 0; try { el.setPointerCapture(e.pointerId); } catch (er) {} });
        el.addEventListener('pointermove', (e) => {
          if (!spin.drag || e.pointerId !== spin.drag.id) return;
          const now = performance.now(), dx = e.clientX - spin.drag.x;
          const d = (-dx / Math.max(200, el.clientWidth)) * Math.PI * 1.6;
          spin.yaw += d; spin.v = d / Math.max(1, now - spin.drag.t) * 16;
          spin.drag.x = e.clientX; spin.drag.t = now;
        });
        const up = (e) => { if (spin.drag && e.pointerId === spin.drag.id) spin.drag = null; };
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
      }
      const loop = (now) => {
        if (h.el !== el || !el.isConnected) return;
        const w = el.clientWidth || 300, hh = el.clientHeight || 220;
        if (h.r.domElement.width !== Math.round(w * h.r.getPixelRatio()) || h.r.domElement.height !== Math.round(hh * h.r.getPixelRatio())) h.r.setSize(w, hh, false);
        h.cam.aspect = w / hh; h.cam.updateProjectionMatrix();
        if (!spin.drag && Math.abs(spin.v) > 0.0004) { spin.yaw += spin.v; spin.v *= 0.94; }
        frameCam(h.cam, s.view, w / hh, s.def.cam, spin.yaw);
        pose(s, still ? 1 : F.ease(((now - t0) / (s.def.period || 2600)) % 1));
        h.r.render(s.scene, h.cam);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }).catch(() => { el.classList.add('fig-failed'); });
  }

  // ---------- thumbnails: rendered on demand in small batches, cached as JPEGs ----------
  const want = new Set();
  let thumbR = null, thumbCam = null, thumbJob = 0;
  function snap(id, k, size) {
    if (!thumbR) {
      thumbR = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
      thumbR.setClearColor(0x1f252c, 1);
      thumbR.outputColorSpace = T.SRGBColorSpace; thumbR.toneMapping = T.ACESFilmicToneMapping; thumbR.toneMappingExposure = 0.95;
      thumbCam = new T.PerspectiveCamera(28, 1, 1, 3000);
    }
    thumbR.setPixelRatio(1); thumbR.setSize(size, size, false);
    const s = build(id);
    frameCam(thumbCam, size > 200 ? s.view : s.mini, 1, s.def.cam);
    pose(s, k == null ? 1 : k);
    thumbR.render(s.scene, thumbCam);
    return thumbR.domElement.toDataURL('image/jpeg', 0.82);
  }
  function runThumbs() {
    thumbJob = 0;
    if (!want.size) return;
    load().then(() => {
      let n = 0;
      for (const id of [...want]) { thumbs[id] = snap(id, 1, 128); want.delete(id); if (!hero || hero.id !== id) dispose(id); if (++n >= 6) break; }
      try { localStorage.setItem('gfj.figthumbs.v3', JSON.stringify(thumbs)); } catch (e) {}
      window.dispatchEvent(new Event('figthumbs'));
      if (want.size) thumbJob = setTimeout(runThumbs, 60);
    }).catch(() => {});
  }
  function thumbURL(id) {
    if (thumbs[id]) return thumbs[id];
    if (has(id) && !failed) { want.add(id); if (!thumbJob) thumbJob = setTimeout(runThumbs, 120); }
    return null;
  }

  window.Figure3D = {
    has,
    get failed() { return failed; },
    thumbURL,
    mount,
    warm() {},
    snap: (id, k, size) => load().then(() => snap(id, k, size || 300)), // debugging / previews
  };
})();
