// Code-built muscle figure. A side-view rig (torso, head, arms, legs) posed by joint angles,
// drawn as shaded muscle shapes. Each exercise has two key poses; the figure eases between them.
// Muscles the exercise trains are red, helpers orange, the rest grey.
(function () {
  const L = { torso: 50, neck: 6, head: 9.5, ua: 28, fa: 25, th: 40, sh: 38 };
  const rad = (a) => (a * Math.PI) / 180;
  const dir = (a) => [Math.sin(rad(a)), Math.cos(rad(a))]; // limbs: 0 = down, 90 = forward, 180 = up
  const up = (a) => [Math.sin(rad(a)), -Math.cos(rad(a))]; // torso: 0 = up, 90 = forward
  const add = (p, v, k) => [p[0] + v[0] * k, p[1] + v[1] * k];

  // Muscle shapes on each segment: [name, from, to, side (+front/-back), thickness]
  const MUSCLES = {
    torso: [['abs', 0.16, 0.62, 0.52, 0.34], ['obliques', 0.14, 0.6, 0.05, 0.42], ['chest', 0.66, 0.96, 0.42, 0.5], ['lowerback', 0.08, 0.42, -0.55, 0.32], ['lats', 0.42, 0.9, -0.42, 0.5], ['traps', 0.86, 1.04, -0.3, 0.36]],
    ua: [['delts', -0.16, 0.34, 0.05, 1.05], ['biceps', 0.22, 0.88, 0.4, 0.62], ['triceps', 0.14, 0.88, -0.45, 0.66]],
    fa: [['forearms', 0.04, 0.62, 0, 0.82]],
    th: [['glutes', -0.12, 0.28, -0.55, 0.85], ['quads', 0.1, 0.9, 0.36, 0.72], ['hams', 0.18, 0.86, -0.4, 0.6]],
    sh: [['calves', 0.04, 0.55, -0.4, 0.72]],
  };
  const W = { torso: [30, 40], neck: [11, 11], ua: [15, 11], fa: [11, 7], th: [21, 13], sh: [13, 8] };

  // ----- exercises (the 5-exercise test set) -----
  const BENCH = (x0, x1, top) => `<g class="fg-prop"><rect x="${x0}" y="${top}" width="${x1 - x0}" height="7" rx="3"/><rect x="${x0 + 8}" y="${top + 7}" width="5" height="${186 - top - 7}"/><rect x="${x1 - 13}" y="${top + 7}" width="5" height="${186 - top - 7}"/></g>`;
  const EX = {
    db_bench: {
      cam: [0.25, 0.55, 0.8],
      handsZ: 23,
      view: [22, 44, 150, 145], mini: [20, 50, 140, 140], root: 'hip', hold: 'db',
      prop: BENCH(30, 150, 140),
      target: { chest: 1, triceps: 2, shoulders: 2 },
      a: { at: [100, 126], t: -90, hd: 0, ua: [78, 72], fa: [180, 178], th: [62, 52], sh: [2, -4] },
      b: { at: [100, 126], t: -90, hd: 0, ua: [170, 166], fa: [176, 172], th: [62, 52], sh: [2, -4] },
    },
    pallof: {
      cam: [0.55, 0.1, 0.83],
      handsZ: 3,
      view: [0, 8, 240, 182], mini: [40, 10, 170, 170], root: 'ankle', hold: 'handle', cable: [22, 62],
      prop: '<g class="fg-prop"><rect x="10" y="20" width="12" height="166" rx="3"/><rect x="18" y="56" width="10" height="12" rx="2"/></g>',
      target: { abs: 1, obliques: 1, shoulders: 2 },
      a: { at: [120, 184], t: 3, hd: 0, ua: [-14, -18], fa: [128, 124], th: [10, 2], sh: [-7, -3] },
      b: { at: [120, 184], t: 3, hd: 0, ua: [86, 84], fa: [90, 88], th: [10, 2], sh: [-7, -3] },
    },
    db_rdl: {
      cam: [-0.55, 0.18, 0.8],
      handsZ: 15,
      view: [10, 8, 240, 182], mini: [40, 30, 150, 150], root: 'ankle', hold: 'db',
      target: { hams: 1, glutes: 1, lowerback: 2 },
      a: { at: [100, 184], t: 0, hd: 0, ua: [4, 2], fa: [2, 0], th: [0, -2], sh: [0, 2] },
      b: { at: [100, 184], t: 78, hd: -14, ua: [-2, -4], fa: [-2, -4], th: [22, 20], sh: [-6, -4] },
    },
    db_curl: {
      cam: [0.62, 0.1, 0.78],
      handsZ: 19,
      view: [-20, 8, 240, 182], mini: [30, 10, 150, 150], root: 'ankle', hold: 'db',
      target: { biceps: 1, forearms: 2 },
      a: { at: [100, 184], t: 0, hd: 0, ua: [4, 0], fa: [6, 2], th: [0, -2], sh: [0, 2] },
      b: { at: [100, 184], t: 0, hd: 0, ua: [8, 4], fa: [150, 146], th: [0, -2], sh: [0, 2] },
    },
    rope_pushdown: {
      cam: [-0.35, 0.12, 0.92],
      handsZ: 4,
      view: [-10, 4, 240, 184], mini: [40, 10, 160, 160], root: 'ankle', hold: 'rope', cable: [160, 24],
      prop: '<g class="fg-prop"><rect x="168" y="10" width="12" height="176" rx="3"/><rect x="154" y="18" width="16" height="10" rx="2"/></g>',
      target: { triceps: 1, forearms: 2 },
      a: { at: [96, 184], t: 10, hd: 0, ua: [-6, -10], fa: [112, 108], th: [8, 0], sh: [-6, -2] },
      b: { at: [96, 184], t: 10, hd: 0, ua: [-4, -8], fa: [6, 2], th: [8, 0], sh: [-6, -2] },
    },
  };

  // Which muscle on the figure each library name lights up
  const NAMEMAP = { shoulders: 'delts' };

  function solve(p, def) {
    const J = {};
    if (def.root === 'ankle') {
      J.ankle0 = p.at;
      J.knee0 = add(p.at, dir(p.sh[0]), -L.sh);
      J.hip = add(J.knee0, dir(p.th[0]), -L.th);
    } else {
      J.hip = p.at;
      J.knee0 = add(J.hip, dir(p.th[0]), L.th);
      J.ankle0 = add(J.knee0, dir(p.sh[0]), L.sh);
    }
    J.knee1 = add(J.hip, dir(p.th[1]), L.th);
    J.ankle1 = add(J.knee1, dir(p.sh[1]), L.sh);
    J.sho = add(J.hip, up(p.t), L.torso);
    J.neck = add(J.sho, up(p.t + p.hd), L.neck);
    J.head = add(J.neck, up(p.t + p.hd), L.head - 1);
    J.elb0 = add(J.sho, dir(p.ua[0]), L.ua);
    J.hand0 = add(J.elb0, dir(p.fa[0]), L.fa);
    J.elb1 = add(J.sho, dir(p.ua[1]), L.ua - 1);
    J.hand1 = add(J.elb1, dir(p.fa[1]), L.fa - 1);
    return J;
  }

  const f = (n) => n.toFixed(1);
  // Tapered capsule whose sides are true tangents to the two end circles (no corners).
  function capsule(a, b, w1, w2) {
    const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
    const ux = dx / d, uy = dy / d, nx = -uy, ny = ux, r1 = w1 / 2, r2 = w2 / 2;
    const sp = Math.max(-0.95, Math.min(0.95, (r1 - r2) / d)), cp = Math.sqrt(1 - sp * sp);
    const ox = nx * cp - ux * sp, oy = ny * cp - uy * sp; // side +
    const qx = -nx * cp - ux * sp, qy = -ny * cp - uy * sp; // side -
    const A1 = [a[0] + ox * r1, a[1] + oy * r1], B1 = [b[0] + ox * r2, b[1] + oy * r2];
    const B2 = [b[0] + qx * r2, b[1] + qy * r2], A2 = [a[0] + qx * r1, a[1] + qy * r1];
    const bigB = sp < 0 ? 1 : 0, bigA = sp > 0 ? 1 : 0;
    return `M${f(A1[0])} ${f(A1[1])}L${f(B1[0])} ${f(B1[1])}A${f(r2)} ${f(r2)} 0 ${bigB} 1 ${f(B2[0])} ${f(B2[1])}L${f(A2[0])} ${f(A2[1])}A${f(r1)} ${f(r1)} 0 ${bigA} 1 ${f(A1[0])} ${f(A1[1])}Z`;
  }
  function cls(name, tgt) {
    const k = tgt[name];
    return k === 1 ? 'fm t1' : k === 2 ? 'fm t2' : 'fm';
  }
  // seg: 'torso' uses the torso front normal; limbs use the limb front normal
  function muscles(seg, a, b, tgt) {
    const list = MUSCLES[seg];
    if (!list) return '';
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const fx = seg === 'torso' ? -uy : uy, fy = seg === 'torso' ? ux : -ux;
    const [w1, w2] = W[seg];
    const ang = (Math.atan2(dy, dx) * 180) / Math.PI;
    return list.map(([name, s0, s1, side, th]) => {
      const tm = (s0 + s1) / 2, w = w1 + (w2 - w1) * Math.max(0, Math.min(1, tm));
      const cx = a[0] + dx * tm + fx * side * (w / 2), cy = a[1] + dy * tm + fy * side * (w / 2);
      const rx = (len * (s1 - s0)) / 2, ry = (w * th) / 2;
      const fib = `<path class="fib" d="M${f(cx - ux * rx * 0.7 + fx * ry * 0.3)} ${f(cy - uy * rx * 0.7 + fy * ry * 0.3)}L${f(cx + ux * rx * 0.7 + fx * ry * 0.3)} ${f(cy + uy * rx * 0.7 + fy * ry * 0.3)}M${f(cx - ux * rx * 0.6 - fx * ry * 0.35)} ${f(cy - uy * rx * 0.6 - fy * ry * 0.35)}L${f(cx + ux * rx * 0.6 - fx * ry * 0.35)} ${f(cy + uy * rx * 0.6 - fy * ry * 0.35)}"/>`;
      return `<ellipse class="${cls(name, tgt)}" cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" transform="rotate(${f(ang)} ${f(cx)} ${f(cy)})"/>${fib}`;
    }).join('');
  }
  function limb(seg, a, b, tgt) {
    return `<path class="fb" d="${capsule(a, b, W[seg][0], W[seg][1])}"/>${muscles(seg, a, b, tgt)}`;
  }
  function holdAt(kind, h, elb) {
    if (kind === 'db') return `<g class="fg-db"><circle cx="${f(h[0])}" cy="${f(h[1])}" r="8"/><circle class="in" cx="${f(h[0])}" cy="${f(h[1])}" r="3.5"/></g>`;
    if (kind === 'rope') return `<path class="fg-rope" d="M${f(h[0])} ${f(h[1])}l-3 7M${f(h[0])} ${f(h[1])}l3 7"/>`;
    if (kind === 'handle') return `<circle class="fg-handle" cx="${f(h[0])}" cy="${f(h[1])}" r="3.5"/>`;
    return '';
  }

  function draw(def, p) {
    const J = solve(p, def);
    const tg = {};
    Object.keys(def.target).forEach((k) => (tg[NAMEMAP[k] || k] = def.target[k]));
    const foot = (an) => `<path class="fb" d="${capsule(an, [an[0] + 12, an[1] + 1.5], 8, 6)}"/>`;
    const cable = def.cable ? `<path class="fg-cable" d="M${def.cable[0]} ${def.cable[1]}L${f(J.hand0[0])} ${f(J.hand0[1])}"/>` : '';
    const farSide = `<g class="far">${limb('th', J.hip, J.knee1, tg)}${limb('sh', J.knee1, J.ankle1, tg)}${foot(J.ankle1)}
      ${holdAt(def.hold, J.hand1)}${limb('ua', J.sho, J.elb1, tg)}${limb('fa', J.elb1, J.hand1, tg)}</g>`;
    const torso = `<path class="fb" d="${capsule(J.hip, J.sho, W.torso[0], W.torso[1])}"/>${muscles('torso', J.hip, J.sho, tg)}
      <path class="fb" d="${capsule(J.sho, J.neck, 11, 10)}"/><circle class="fb fhead" cx="${f(J.head[0])}" cy="${f(J.head[1])}" r="${L.head}"/>`;
    const near = `${limb('th', J.hip, J.knee0, tg)}${limb('sh', J.knee0, J.ankle0, tg)}${foot(J.ankle0)}
      ${limb('ua', J.sho, J.elb0, tg)}${limb('fa', J.elb0, J.hand0, tg)}${holdAt(def.hold, J.hand0)}`;
    return `${def.prop || ''}${farSide}${cable}${torso}${near}`;
  }

  function lerp(a, b, s) {
    if (Array.isArray(a)) return a.map((x, i) => lerp(x, b[i], s));
    return a + (b - a) * s;
  }
  function poseAt(def, s) {
    const o = {};
    Object.keys(def.a).forEach((k) => (o[k] = lerp(def.a[k], def.b[k], s)));
    return o;
  }
  const DEFS = `<defs>
    <radialGradient id="fgBase" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#8d939b"/><stop offset="1" stop-color="#4c5259"/></radialGradient>
    <radialGradient id="fgM" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#a7adb4"/><stop offset="1" stop-color="#666c74"/></radialGradient>
    <radialGradient id="fgT1" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ff7a6b"/><stop offset="1" stop-color="#c3141e"/></radialGradient>
    <radialGradient id="fgT2" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="#ffb36b"/><stop offset="1" stop-color="#c9661e"/></radialGradient>
  </defs>`;

  function svg(id, s, cls) {
    const def = EX[id];
    const v = def.view;
    const vb = cls === 'mini' && def.mini ? def.mini : v;
    return `<svg class="fig ${cls || ''}" viewBox="${vb.join(' ')}" preserveAspectRatio="xMidYMid ${cls === 'mini' ? 'slice' : 'meet'}" role="img" aria-label="Animated demo">${DEFS}
      <line class="fg-floor" x1="-50" x2="300" y1="187" y2="187"/><g class="fg-body">${draw(def, poseAt(def, s == null ? 1 : s))}</g></svg>`;
  }

  // Ease between the poses with a short hold at each end: 2.6s per rep
  function ease(p) {
    const tri = p < 0.5 ? p * 2 : 2 - p * 2;
    const x = Math.max(0, Math.min(1, (tri - 0.12) / 0.76));
    return x * x * (3 - 2 * x);
  }
  function mount(el, id) {
    const def = EX[id];
    if (!def || !el) return;
    el.innerHTML = svg(id, 0);
    const body = el.querySelector('.fg-body');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    function frame(now) {
      if (!body.isConnected) return;
      body.innerHTML = draw(def, poseAt(def, ease(((now - t0) / 2600) % 1)));
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  window.Figure = { has: (id) => !!EX[id], svg, mount, defs: EX, solve, poseAt, ease, L };
})();
