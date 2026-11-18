// 3D mannequin for exercise demos (three.js, loaded only when needed).
// Smooth lit body parts posed by the same key poses as figure.js. Muscles the exercise trains
// glow red on the body itself (painted into the mesh colours), helpers glow orange.
(function () {
  const F = window.Figure;
  const has = (id) => !!(F && F.defs[id]);
  let T = null, loading = null, failed = false;
  const thumbs = {};
  try { Object.assign(thumbs, JSON.parse(localStorage.getItem('gfj.figthumbs.v2') || '{}')); } catch (e) {}

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

  // ---------- one scene per exercise ----------
  const scenes = {};
  function tint(lvl) { return lvl === 1 ? RED : lvl === 2 ? ORANGE : null; }
  function build(id) {
    if (scenes[id]) return scenes[id];
    const def = F.defs[id];
    const tg = {};
    Object.keys(def.target).forEach((k) => (tg[k === 'shoulders' ? 'delts' : k] = def.target[k]));
    const scene = new T.Scene();
    const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0.08 });
    // Make the red/orange muscle paint glow: anything warmer than grey adds emissive light.
    mat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n  float warm = max(vColor.r - max(vColor.g, vColor.b), 0.0);\n  totalEmissiveRadiance += vec3(1.0, 0.18, 0.1) * warm * 0.75;');
    };
    const dark = new T.MeshStandardMaterial({ color: 0x2b3138, roughness: 0.55, metalness: 0.3 });
    const steel = new T.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.3, metalness: 0.8 });
    const iron = new T.MeshStandardMaterial({ color: 0x1d2227, roughness: 0.45, metalness: 0.5 });
    scene.add(new T.HemisphereLight(0xdde7ff, 0x15181c, 1.1));
    const key = new T.DirectionalLight(0xffffff, 2.6); key.position.set(80, 160, 140); scene.add(key);
    const rim = new T.DirectionalLight(0x8fb0ff, 1.8); rim.position.set(-120, 60, -100); scene.add(rim);
    const fill = new T.DirectionalLight(0xffe2c8, 0.6); fill.position.set(60, -40, 120); scene.add(fill);

    const torsoW = (t, front) => [0.66 * (front && t > 0.55 && t < 0.98 ? 1.14 : 1), 0.95 + 0.62 * sstep(0.22, 0.86, t)];
    const G = {
      torso: partGeom('torso', tg, torsoW), neck: partGeom('neck', tg), ua: partGeom('ua', tg), fa: partGeom('fa', tg), th: partGeom('th', tg), sh: partGeom('sh', tg),
      delt: blobGeom(9, 8.6, 8.8, tint(tg.delts)),
      elbow: blobGeom(4.5, 4.5, 4.5), knee: blobGeom(5.4, 5.4, 5.4),
      pelvis: blobGeom(11.5, 10, 15, tint(tg.glutes), (x, y) => sstep(0.05, -0.45, x) * sstep(0.5, -0.1, y)),
      head: blobGeom(7.4, 9, 7.2), chin: blobGeom(4.6, 4.2, 5.4), hand: blobGeom(3.3, 4.8, 2.4), thumb: blobGeom(1.4, 2.6, 1.4), foot: blobGeom(8.6, 3.2, 4.1),
      hipj: blobGeom(9.6, 9.6, 9.6, tint(tg.glutes), (x, y) => sstep(0.1, -0.5, x) * 0.9), ankle: blobGeom(3.3, 3.3, 3.3),
    };
    const M = (g, m) => { const o = new T.Mesh(g, m || mat); scene.add(o); return o; };
    const parts = {
      torso: M(G.torso), pelvis: M(G.pelvis), neck: M(G.neck), head: M(G.head),
      ua: [M(G.ua), M(G.ua)], fa: [M(G.fa), M(G.fa)], th: [M(G.th), M(G.th)], sh: [M(G.sh), M(G.sh)],
      delt: [M(G.delt), M(G.delt)], elbow: [M(G.elbow), M(G.elbow)], knee: [M(G.knee), M(G.knee)], hand: [M(G.hand), M(G.hand)], foot: [M(G.foot), M(G.foot)],
      chin: M(G.chin), thumb: [M(G.thumb), M(G.thumb)], hipj: [M(G.hipj), M(G.hipj)], ankle: [M(G.ankle), M(G.ankle)],
    };
    // equipment
    const props = { hold: [] };
    if (def.prop && /BENCH|rect x="30"/.test(def.prop) || id === 'db_bench') {
      const b = new T.Group();
      const top = new T.Mesh(new T.BoxGeometry(96, 7, 26), dark); top.position.set(70, -143.5, 0); b.add(top);
      for (const x of [30, 110]) { const l = new T.Mesh(new T.BoxGeometry(6, 40, 20), iron); l.position.set(x, -167, 0); b.add(l); }
      scene.add(b);
    }
    if (def.cable) {
      const colX = def.cable[0] < 100 ? def.cable[0] - 6 : def.cable[0] + 14;
      const col = new T.Mesh(new T.BoxGeometry(12, 180, 16), dark); col.position.set(colX, -97, 0); scene.add(col);
      const pul = new T.Mesh(new T.CylinderGeometry(4, 4, 3, 20), steel); pul.rotation.x = Math.PI / 2; pul.position.set(def.cable[0], -def.cable[1], 0); scene.add(pul);
      props.cable = new T.Mesh(new T.CylinderGeometry(0.55, 0.55, 1, 8).translate(0, 0.5, 0), steel); scene.add(props.cable);
    }
    const dumbbell = () => {
      const g = new T.Group();
      const h = new T.Mesh(new T.CylinderGeometry(1.5, 1.5, 13, 12), steel); h.rotation.x = Math.PI / 2; g.add(h);
      for (const z of [-6.5, 6.5]) { const p = new T.Mesh(new T.CylinderGeometry(6.2, 6.2, 3.6, 24), iron); p.rotation.x = Math.PI / 2; p.position.z = z; g.add(p); }
      scene.add(g); return g;
    };
    if (def.hold === 'db') props.hold = [dumbbell(), dumbbell()];
    if (def.hold === 'rope') {
      const ropeMat = new T.MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.8 });
      props.rope = [new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 12, 10), ropeMat), new T.Mesh(new T.CylinderGeometry(1.4, 1.4, 12, 10), ropeMat)];
      props.rope.forEach((r) => scene.add(r));
    }
    if (def.hold === 'handle') { props.handle = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 12, 12), iron); props.handle.rotation.x = Math.PI / 2; scene.add(props.handle); }
    // soft contact shadow
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const cx = cv.getContext('2d'); const gr = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); cx.fillStyle = gr; cx.fillRect(0, 0, 64, 64);
    const sh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.scale.set(id === 'db_bench' ? 150 : 70, 46, 1); sh.position.set(id === 'db_bench' ? 92 : 104, -186.5, 0); scene.add(sh);

    const s = { id, def, scene, parts, props };
    scenes[id] = s;
    return s;
  }

  // Place a bone-shaped part from A to B (world coords). Local X follows the in-plane perpendicular
  // so front/back muscle colours stay on the right side whatever the pose.
  const V = (p, z) => new T.Vector3(p[0], -p[1], z);
  function place(o, A, B) {
    const d = new T.Vector3().subVectors(B, A);
    const len = d.length() || 1;
    const y = d.clone().divideScalar(len);
    const th = Math.atan2(-y.x, y.y);
    const x = new T.Vector3(Math.cos(th), Math.sin(th), 0);
    x.addScaledVector(y, -x.dot(y)).normalize();
    const z = new T.Vector3().crossVectors(x, y).normalize();
    o.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z));
    o.position.copy(A);
    return y;
  }
  function blobAt(o, P, dirY) {
    o.position.copy(P);
    if (dirY) place(o, P, P.clone().add(dirY));
  }
  const SHO_Z = 21, HIP_Z = 8.5;
  function pose(s, k) {
    const { def, parts: P, props } = s;
    const p = F.poseAt(def, k);
    const J = F.solve(p, def);
    const handZ = def.handsZ != null ? def.handsZ : SHO_Z;
    const torsoDir = place(P.torso, V(J.hip, 0), V(J.sho, 0));
    blobAt(P.pelvis, V(J.hip, 0).addScaledVector(torsoDir, 2), torsoDir);
    const nd = place(P.neck, V(J.sho, 0).addScaledVector(torsoDir, -3), V(J.neck, 0));
    blobAt(P.head, V(J.head, 0), nd);
    { // jaw: forward and down from the head centre, so the head reads as facing somewhere
      const fwd = new T.Vector3(nd.y, -nd.x, 0);
      blobAt(P.chin, V(J.head, 0).addScaledVector(nd, -4.2).addScaledVector(fwd, 2.6), nd);
    }
    for (let i = 0; i < 2; i++) {
      const sgn = i === 0 ? 1 : -1;
      const sho = V(J.sho, sgn * SHO_Z).addScaledVector(torsoDir, -5);
      const elb = V(i ? J.elb1 : J.elb0, sgn * (SHO_Z * 0.55 + handZ * 0.45));
      const hand = V(i ? J.hand1 : J.hand0, sgn * handZ);
      const ud = place(P.ua[i], sho, elb);
      blobAt(P.delt[i], sho.clone().addScaledVector(ud, 2.5), ud);
      blobAt(P.elbow[i], elb);
      const fd = place(P.fa[i], elb, hand);
      blobAt(P.hand[i], hand.clone().addScaledVector(fd, 2.5), fd);
      blobAt(P.thumb[i], hand.clone().addScaledVector(fd, 1.2).add(new T.Vector3(fd.y * 2.2, -fd.x * 2.2, -sgn * 1.6)), fd);
      if (props.hold[i]) { props.hold[i].position.copy(hand).addScaledVector(fd, 2.5); props.hold[i].rotation.set(0, 0, Math.atan2(fd.y, fd.x)); }
      if (props.rope) { const r = props.rope[i]; r.position.copy(hand).add(new T.Vector3(0, -6, sgn * 1.5)); }
      const hip = V(J.hip, sgn * HIP_Z);
      const knee = V(i ? J.knee1 : J.knee0, sgn * HIP_Z);
      const ank = V(i ? J.ankle1 : J.ankle0, sgn * HIP_Z);
      place(P.th[i], hip, knee);
      blobAt(P.hipj[i], hip.clone().addScaledVector(torsoDir, 1.5), torsoDir);
      blobAt(P.knee[i], knee);
      place(P.sh[i], knee, ank);
      blobAt(P.ankle[i], ank);
      P.foot[i].position.copy(ank).add(new T.Vector3(4.6, -2.4, 0));
      P.foot[i].quaternion.identity();
    }
    if (props.handle) props.handle.position.copy(V(J.hand0, 0)).add(new T.Vector3(2, 0, 0));
    if (props.cable) {
      const A = V(def.cable, 0);
      const H = def.hold === 'rope' ? V(J.hand0, 0) : V(J.hand0, handZ);
      place(props.cable, A, H);
      props.cable.scale.set(1, A.distanceTo(H), 1);
    }
  }

  function frameCam(cam, view, aspect, camDir) {
    const [x, y, w, h] = view;
    const target = new T.Vector3(x + w / 2, -(y + h / 2), 0);
    const half = ((cam.fov / 2) * Math.PI) / 180;
    const needH = Math.max(h, w / aspect);
    const dist = (needH / 2) / Math.tan(half) * 1.04;
    const dir = new T.Vector3(...(camDir || [0.5, 0.16, 0.85])).normalize();
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
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
    hero = { r, cam: new T.PerspectiveCamera(28, 1, 1, 2000), el: null, id: null };
    return hero;
  }
  function mount(el, id) {
    if (!has(id) || !el || el._mounted) return;
    el._mounted = true;
    load().then(() => {
      const h = heroRenderer();
      const s = build(id);
      h.el = el; h.id = id;
      el.appendChild(h.r.domElement);
      const t0 = performance.now();
      const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const loop = (now) => {
        if (h.el !== el || !el.isConnected) return;
        const w = el.clientWidth || 300, hh = el.clientHeight || 220;
        if (h.r.domElement.width !== Math.round(w * h.r.getPixelRatio()) || h.r.domElement.height !== Math.round(hh * h.r.getPixelRatio())) h.r.setSize(w, hh, false);
        h.cam.aspect = w / hh; h.cam.updateProjectionMatrix();
        frameCam(h.cam, s.def.view3d || s.def.view, w / hh, s.def.cam);
        pose(s, still ? 1 : F.ease(((now - t0) / 2600) % 1));
        h.r.render(s.scene, h.cam);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }).catch(() => { el.classList.add('fig-failed'); });
  }

  // ---------- thumbnails: rendered once, cached as images ----------
  function makeThumbs() {
    const need = Object.keys(F.defs).filter((id) => !thumbs[id]);
    if (!need.length) return Promise.resolve(false);
    return load().then(() => {
      const r = new T.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
      r.setPixelRatio(1); r.setSize(144, 144, false);
      r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.ACESFilmicToneMapping;
      const cam = new T.PerspectiveCamera(28, 1, 1, 2000);
      for (const id of need) {
        const s = build(id);
        frameCam(cam, s.def.mini3d || s.def.mini || s.def.view, 1, s.def.cam);
        pose(s, 1);
        r.render(s.scene, cam);
        thumbs[id] = r.domElement.toDataURL('image/png');
      }
      r.dispose(); r.forceContextLoss();
      try { localStorage.setItem('gfj.figthumbs.v2', JSON.stringify(thumbs)); } catch (e) {}
      return true;
    });
  }

  window.Figure3D = {
    has,
    get failed() { return failed; },
    thumbURL: (id) => thumbs[id] || null,
    mount,
    // render thumbnails in the background, then tell the app to repaint
    warm() { setTimeout(() => makeThumbs().then((made) => { if (made) window.dispatchEvent(new Event('figthumbs')); }).catch(() => {}), 300); },
  };
})();
