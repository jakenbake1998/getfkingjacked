// Key poses for every exercise's 3D demo. Angles in degrees.
//   Limbs: 0 = pointing down, 90 = forward, 180 = up, -90 = back. [near side, far side]
//   Torso t: 0 = upright, 90 = leaning forward flat (head forward), -90 = lying on your back (head back).
//   abd / labd: arm / leg raised out to the side. tw: torso twist. heel: calf raise height.
//   root + at: which joint is pinned where. ground: joints that rest on the floor.
//   fit: [{ j, y }, { j, y }] pins the first joint to a surface and tips the body until the second reaches its surface.
(function () {
  const D = window.Figure.defs;
  const FL = 186; // floor
  const STAND = { t: 0, hd: 0, ua: [4, 2], fa: [2, 0], th: [0, -2], sh: [0, 2] };
  const st = (o) => Object.assign({}, STAND, o);
  const standing = (extra) => Object.assign({ root: 'ankle', at: [100, 180], ground: ['ankle0', 'ankle1'] }, extra);
  const add = (id, def) => { if (!D[id]) D[id] = def; };
  const copy = (id, from, over) => add(id, Object.assign({}, D[from], over, { a: Object.assign({}, D[from].a, over && over.a), b: Object.assign({}, D[from].b, over && over.b) }));
  const BACKCAM = [-0.5, 0.2, 0.84], HIGHCAM = [0.35, 0.6, 0.72], FRONTCAM = [0.85, 0.15, 0.5], SIDECAM = [0.15, 0.25, 0.96];

  // ---------------- back ----------------
  const hang = (abdA, abdB, uaB) => ({ root: 'mid', at: [100, -12], pullbar: { y: -14 }, cam: [0.45, 0.05, 0.89],
    a: { t: 0, ua: [180, 180], fa: [180, 180], abd: [abdA, abdA], th: [8, 4], sh: [-30, -26] },
    b: { t: -4, ua: [uaB, uaB], fa: [172, 172], abd: [abdB, abdB], th: [14, 10], sh: [-40, -34] } });
  add('pullup', hang(22, 46, 20));
  add('neutral_pullup', hang(10, 22, 24));
  add('chinup', hang(6, 12, 34));
  add('hanging_knee_raise', Object.assign(hang(16, 16, 180), { target: { abs: 1, obliques: 2, forearms: 2 },
    b: { t: -8, ua: [180, 180], fa: [180, 180], abd: [16, 16], th: [104, 100], sh: [6, 4] } }));
  add('kneel_pulldown', { root: 'knee0', at: [100, FL - 5.5], cable: [150, 8], cableTo: 'mid', hold: 'cbar', handsZ: 26,
    a: { t: 6, ua: [158, 158], fa: [160, 160], th: [0, 0], sh: [-92, -90] },
    b: { t: -4, ua: [-12, -12], fa: [150, 150], th: [0, 0], sh: [-92, -90] } });
  add('db_row', standing({ hold: 'db1', bench: { at: 'hand1', w: 70, side: 'right' }, cam: [0.3, 0.25, 0.92],
    a: { t: 76, hd: -12, ua: [0, 2], fa: [0, 0], th: [22, 6], sh: [-6, -4] },
    b: { t: 76, hd: -12, ua: [-44, 2], fa: [6, 0], th: [22, 6], sh: [-6, -4] } }));
  add('cs_db_row', standing({ hold: 'db', handsZ: 21, chestPad: true, cam: [0.3, 0.2, 0.93],
    a: { t: 50, hd: -8, ua: [0, 0], fa: [0, 0], th: [24, 24], sh: [-14, -14] },
    b: { t: 50, hd: -8, ua: [-48, -48], fa: [8, 8], th: [24, 24], sh: [-14, -14] } }));
  add('bb_row', standing({ hold: 'bar', handsZ: 22, cam: [0.4, 0.15, 0.9],
    a: { t: 66, hd: -12, ua: [2, 2], fa: [0, 0], th: [20, 18], sh: [-10, -8] },
    b: { t: 66, hd: -12, ua: [-50, -50], fa: [-6, -6], th: [20, 18], sh: [-10, -8] } }));
  copy('db_bo_row', 'bb_row', { hold: 'db', handsZ: 22 });
  add('seated_cable_row', { root: 'hip', at: [92, 144], box: { x0: 70, x1: 112, top: 156 }, cable: [196, 160], cableTo: 'mid', hold: 'handle', handsZ: 5,
    a: { t: 22, hd: -6, ua: [82, 82], fa: [86, 86], th: [80, 80], sh: [60, 60] },
    b: { t: -8, hd: 0, ua: [-38, -38], fa: [84, 84], th: [80, 80], sh: [60, 60] } });
  add('sa_cable_row', standing({ cable: [196, 92], hold: 'handle', handsZ: null,
    a: { t: 14, tw: 18, ua: [84, 4], fa: [88, 2], th: [10, -14], sh: [-6, 6] },
    b: { t: 10, tw: -16, ua: [-36, 4], fa: [78, 2], th: [10, -14], sh: [-6, 6] } }));
  add('kb_gorilla_row', standing({ hold: 'kb', cam: [0.45, 0.25, 0.86],
    a: { t: 78, hd: -14, ua: [-46, 0], fa: [2, 0], th: [20, 20], sh: [-8, -8], labd: [14, 14] },
    b: { t: 78, hd: -14, ua: [0, -46], fa: [0, 2], th: [20, 20], sh: [-8, -8], labd: [14, 14] } }));
  add('straight_arm_pd', standing({ cable: [176, 14], cableTo: 'mid', hold: 'cbar', handsZ: 20,
    a: { t: 24, hd: -6, ua: [146, 146], fa: [148, 148], th: [10, 8], sh: [-6, -4] },
    b: { t: 24, hd: -6, ua: [4, 4], fa: [6, 6], th: [10, 8], sh: [-6, -4] } }));
  add('face_pull', standing({ cable: [190, 58], cableTo: 'mid', hold: 'rope', handsZ: 4, cam: [0.55, 0.12, 0.83], target: { shoulders: 1, traps: 1, 'middle back': 2 },
    a: { t: -6, ua: [92, 92], fa: [94, 94], abd: [6, 6], th: [4, -10], sh: [-2, 8] },
    b: { t: -6, ua: [96, 96], fa: [168, 168], abd: [70, 70], fabd: [30, 30], th: [4, -10], sh: [-2, 8] } }));
  add('rear_delt_fly', standing({ hold: 'db', cam: [0.45, 0.35, 0.83],
    a: { t: 76, hd: -12, ua: [0, 0], fa: [0, 0], abd: [6, 6], th: [18, 18], sh: [-8, -8] },
    b: { t: 76, hd: -12, ua: [0, 0], fa: [0, 0], abd: [78, 78], th: [18, 18], sh: [-8, -8] } }));
  add('back_ext', { root: 'hip', at: [110, 128], bench: { x0: 30, x1: 116, top: 140 }, target: { 'lower back': 1, glutes: 2, hamstrings: 2 }, cam: BACKCAM,
    a: { t: 150, hd: 10, ua: [150, 150], fa: [-90, -90], th: [-90, -90], sh: [-90, -90] },
    b: { t: 88, hd: 0, ua: [100, 100], fa: [-150, -150], th: [-90, -90], sh: [-90, -90] } });

  // ---------------- biceps ----------------
  copy('hammer_curl', 'db_curl', { target: { biceps: 1, forearms: 1 } });
  copy('reverse_curl', 'db_curl', { target: { forearms: 1, biceps: 2 } });
  copy('bb_curl', 'db_curl', { hold: 'bar', handsZ: 18 });
  copy('cable_curl', 'db_curl', { hold: 'cbar', handsZ: 14, cable: [150, 182], cableTo: 'mid' });
  copy('rope_hammer_curl', 'db_curl', { hold: 'rope', handsZ: 4, cable: [150, 182], cableTo: 'mid', target: { biceps: 1, forearms: 1 } });
  add('incline_curl', { root: 'hip', at: [96, 140], incline: { x: 92, angle: 55, seat: 152 }, hold: 'db', cam: [0.55, 0.12, 0.83],
    a: { t: -38, hd: 10, ua: [-6, -6], fa: [-4, -4], th: [86, 86], sh: [10, 10] },
    b: { t: -38, hd: 10, ua: [-6, -6], fa: [140, 140], th: [86, 86], sh: [10, 10] } });
  add('conc_curl', { root: 'hip', at: [92, 140], bench: { x0: 50, x1: 130, top: 152 }, hold: 'db1', cam: FRONTCAM,
    a: { t: 42, hd: -18, ua: [12, 40], fa: [4, 70], th: [84, 84], sh: [8, 8], labd: [14, 14] },
    b: { t: 42, hd: -18, ua: [12, 40], fa: [150, 70], th: [84, 84], sh: [8, 8], labd: [14, 14] } });

  // ---------------- chest ----------------
  const BENCH_BB = { x0: 30, x1: 120, top: 140 };
  copy('bb_bench', 'db_bench', { hold: 'bar', handsZ: 26 });
  copy('close_grip_bench', 'db_bench', { hold: 'bar', handsZ: 12, target: { triceps: 1, chest: 2, shoulders: 2 } });
  const floorPress = (hold, hz) => ({ root: 'hip', at: [100, FL - 12], mat: [20, 190], hold, handsZ: hz, cam: HIGHCAM,
    a: { t: -90, ua: [0, 0], abd: [62, 62], fa: [180, 180], fabd: [0, 0], th: [138, 132], sh: [24, 20] },
    b: { t: -90, ua: [180, 180], abd: [4, 4], fa: [180, 180], th: [138, 132], sh: [24, 20] } });
  add('db_floor_press', floorPress('db'));
  add('bb_floor_press', floorPress('bar', 24));
  add('db_incline', { root: 'hip', at: [104, 140], incline: { x: 100, angle: 38, seat: 152 }, hold: 'db', cam: [0.35, 0.4, 0.86],
    a: { t: -56, hd: 6, ua: [72, 72], fa: [176, 176], th: [86, 86], sh: [10, 10] },
    b: { t: -56, hd: 6, ua: [168, 168], fa: [172, 172], th: [86, 86], sh: [10, 10] } });
  add('db_fly', { root: 'hip', at: [100, 126], bench: { x0: 30, x1: 118, top: 140 }, hold: 'db', cam: [0.2, 0.7, 0.68],
    a: { t: -90, ua: [180, 180], fa: [180, 180], abd: [78, 78], th: [62, 52], sh: [2, -4] },
    b: { t: -90, ua: [180, 180], fa: [180, 180], abd: [6, 6], th: [62, 52], sh: [2, -4] } });
  add('floor_fly', Object.assign({}, D.db_fly, { root: 'hip', at: [100, FL - 12], bench: null, mat: [20, 190],
    a: Object.assign({}, D.db_fly.a, { abd: [72, 72], th: [138, 132], sh: [24, 20] }), b: Object.assign({}, D.db_fly.b, { th: [138, 132], sh: [24, 20] }) }));
  add('cable_press', standing({ cable: [16, 76, 30], cableTo: 'hand0', hold: 'handle', handsZ: null,
    a: { t: 10, ua: [-30, -30], abd: [42, 42], fa: [92, 92], fabd: [0, 0], th: [12, -16], sh: [-8, 8] },
    b: { t: 10, ua: [84, 84], abd: [8, 8], fa: [86, 86], th: [12, -16], sh: [-8, 8] } }));
  add('cable_fly', standing({ cable: [96, 40, 70], cableTo: 'hand0', hold: 'handle', handsZ: null, cam: FRONTCAM,
    a: { t: 8, ua: [96, 96], fa: [96, 96], abd: [74, 74], th: [10, -14], sh: [-6, 6] },
    b: { t: 8, ua: [92, 92], fa: [92, 92], abd: [4, 4], th: [10, -14], sh: [-6, 6] } }));
  add('low_high_fly', standing({ cable: [96, 178, 70], cableTo: 'hand0', hold: 'handle', handsZ: null, cam: FRONTCAM,
    a: { t: 4, ua: [30, 30], fa: [30, 30], abd: [58, 58], th: [8, -12], sh: [-4, 6] },
    b: { t: 4, ua: [128, 128], fa: [128, 128], abd: [6, 6], th: [8, -12], sh: [-4, 6] } }));
  const pushup = (hand, knees, over) => Object.assign({ root: 'hand0', at: [140, FL - 3.5], cam: [0.35, 0.3, 0.89],
    fit: [{ j: 'hand0', y: hand }, { j: knees ? 'knee1' : 'ankle1', y: FL }],
    a: { t: 80, hd: 8, ua: [0, 0], fa: [0, 0], th: knees ? [-80, -80] : [-80, -80], sh: knees ? [-150, -150] : [-80, -80] },
    b: { t: 90, hd: 8, ua: [-78, -78], fa: [4, 4], abd: [24, 24], th: knees ? [-90, -90] : [-90, -90], sh: knees ? [-160, -160] : [-90, -90] } }, over);
  add('pushup', pushup(FL));
  add('knee_pushup', pushup(FL, true));
  add('incline_pushup', pushup(140, false, { bench: { at: 'hand0', top: 140, w: 60, side: 'right' } }));
  add('pike_pushup', { root: 'hand0', at: [140, FL - 3.5], fit: [{ j: 'hand0', y: FL }, { j: 'ankle1', y: FL }], target: { shoulders: 1, triceps: 2 }, cam: [0.3, 0.2, 0.93],
    a: { t: 140, hd: 0, ua: [40, 40], fa: [40, 40], th: [-40, -40], sh: [-40, -40] },
    b: { t: 152, hd: 0, ua: [-40, -40], fa: [64, 64], abd: [24, 24], th: [-40, -40], sh: [-40, -40] } });

  // ---------------- shoulders ----------------
  const press = (seated, hold, hz) => Object.assign(seated ? { root: 'hip', at: [96, 140], bench: { x0: 60, x1: 132, top: 152 } } : standing({}), { hold, handsZ: hz, cam: FRONTCAM,
    a: Object.assign(seated ? { th: [86, 86], sh: [8, 8] } : {}, { t: 0, ua: [6, 6], abd: [80, 80], fa: [178, 178], fabd: [8, 8] }),
    b: Object.assign(seated ? { th: [86, 86], sh: [8, 8] } : {}, { t: 0, ua: [178, 178], abd: [14, 14], fa: [178, 178], fabd: [8, 8] }) });
  add('db_shoulder_press', press(true, 'db'));
  add('standing_db_press', press(false, 'db'));
  add('bb_ohp', standing({ hold: 'bar', handsZ: 21,
    a: { t: 0, ua: [22, 22], fa: [168, 168] }, b: { t: 0, ua: [178, 178], fa: [178, 178] } }));
  add('kb_press', { root: 'knee0', at: [96, FL - 5.5], hold: 'kb1', cam: FRONTCAM,
    a: { t: 0, ua: [6, 4], abd: [72, 0], fa: [176, 2], fabd: [6, 0], th: [0, 86], sh: [-90, 0] },
    b: { t: 0, ua: [176, 4], abd: [8, 0], fa: [178, 2], fabd: [4, 0], th: [0, 86], sh: [-90, 0] } });
  add('landmine_press', standing({ hold: 'landmine', handsZ: 10, landPivot: [10],
    a: { t: 18, ua: [-20, 4], fa: [150, 2], th: [12, -16], sh: [-8, 8] },
    b: { t: 18, ua: [132, 4], fa: [134, 2], th: [12, -16], sh: [-8, 8] } }));
  add('db_lateral', standing({ hold: 'db', cam: FRONTCAM,
    a: { ua: [4, 4], fa: [4, 4], abd: [10, 10] }, b: { ua: [4, 4], fa: [8, 8], abd: [84, 84] } }));
  add('cable_lateral', standing({ hold: 'handle', cable: [100, 180, -40], cableTo: 'hand0', handsZ: null, cam: FRONTCAM,
    a: { ua: [4, 4], fa: [4, 4], abd: [-16, 6] }, b: { ua: [4, 4], fa: [6, 4], abd: [84, 6] } }));
  add('db_front_raise', standing({ hold: 'db',
    a: { ua: [4, 4], fa: [2, 2] }, b: { ua: [94, 94], fa: [94, 94] } }));

  // ---------------- triceps ----------------
  copy('bar_pushdown', 'rope_pushdown', { hold: 'cbar', handsZ: 12 });
  add('cable_kickback', standing({ cable: [190, 180], hold: 'handle', handsZ: null, cam: [0.3, 0.2, 0.93],
    a: { t: 58, hd: -10, ua: [-58, 4], fa: [0, 2], th: [14, -10], sh: [-8, 4] },
    b: { t: 58, hd: -10, ua: [-62, 4], fa: [-58, 2], th: [14, -10], sh: [-8, 4] } }));
  copy('db_kickback', 'cable_kickback', { cable: null, hold: 'db1', a: { t: 72, ua: [-72, 4] }, b: { t: 72, ua: [-76, 4], fa: [-72, 2] } });
  add('oh_cable_ext', standing({ cable: [14, 172], cableTo: 'mid', hold: 'rope', handsZ: 4, cam: [0.55, 0.1, 0.83],
    a: { t: 22, hd: -4, ua: [160, 160], fa: [-30, -30], th: [16, -18], sh: [-8, 10] },
    b: { t: 22, hd: -4, ua: [150, 150], fa: [-210, -210], th: [16, -18], sh: [-8, 10] } }));
  add('db_oh_ext', standing({ hold: 'goblet', handsZ: 4,
    a: { t: 0, ua: [172, 172], fa: [-20, -20] }, b: { t: 0, ua: [176, 176], fa: [-184, -184] } }));
  add('skullcrusher', { root: 'hip', at: [100, 126], bench: { x0: 30, x1: 118, top: 140 }, hold: 'db', handsZ: 10, cam: [0.25, 0.55, 0.8],
    a: { t: -90, ua: [-160, -160], fa: [-112, -112], th: [62, 52], sh: [2, -4] },
    b: { t: -90, ua: [-166, -166], fa: [-170, -170], th: [62, 52], sh: [2, -4] } });
  add('dip', { root: 'mid', at: [100, 104], dips: { y: 104 }, cam: [0.45, 0.15, 0.88],
    a: { t: 4, ua: [2, 2], fa: [0, 0], th: [8, 4], sh: [-60, -56] },
    b: { t: 16, ua: [-62, -62], fa: [6, 6], th: [14, 10], sh: [-66, -60] } });

  // ---------------- hamstrings & glutes ----------------
  copy('bb_rdl', 'db_rdl', { hold: 'bar', handsZ: 22 });
  copy('stiff_leg_dl', 'db_rdl', { hold: 'bar', handsZ: 22, b: { th: [12, 10], sh: [0, 0] } });
  copy('kb_deadlift', 'db_rdl', { hold: 'kbmid', handsZ: 4, b: { t: 58, th: [40, 38], sh: [-16, -14] } });
  add('sl_rdl', standing({ hold: 'db', root: 'ankle', ground: ['ankle0'], cam: BACKCAM,
    a: { t: 0, ua: [4, 2], fa: [2, 0], th: [0, 0], sh: [0, 0] },
    b: { t: 84, hd: -12, ua: [0, 0], fa: [0, 0], th: [16, -78], sh: [-6, -80] } }));
  add('cable_leg_curl', standing({ root: 'ankle1', ground: ['ankle1'], cable: [176, 180], cableTo: 'ankle0', cam: [0.2, 0.2, 0.96],
    a: { t: 12, ua: [62, 62], fa: [84, 84], th: [0, 0], sh: [0, 0] },
    b: { t: 12, ua: [62, 62], fa: [84, 84], th: [-6, 0], sh: [-110, 0] } }));
  const bridge = (bench, hold, oneLeg) => ({ root: 'sho', at: [60, (bench ? 140 : FL) - 13], fit: [{ j: 'sho', y: bench ? 140 : FL }, { j: oneLeg ? 'ankle1' : 'ankle0', y: FL }],
    hold, cam: [0.3, 0.3, 0.9], target: { glutes: 1, hamstrings: 2 },
    bench: bench ? { at: 'sho', top: 140, w: 70 } : null, mat: bench ? null : [20, 190],
    a: { t: -64, ua: [70, 70], fa: [74, 74], abd: [14, 14], th: [oneLeg ? 150 : 100, 100], sh: [oneLeg ? 140 : 0, 0] },
    b: { t: -96, ua: [98, 98], fa: [96, 96], abd: [14, 14], th: [oneLeg ? 90 : 76, 76], sh: [oneLeg ? 90 : -6, -6] } });
  add('hip_thrust', bridge(true, 'hipbar'));
  add('db_hip_thrust', bridge(true, 'hipdb'));
  add('glute_bridge', bridge(false));
  add('db_glute_bridge', bridge(false, 'hipdb'));
  add('sl_glute_bridge', bridge(false, null, true));
  add('pull_through', standing({ cable: [10, 176], cableTo: 'mid', hold: 'rope', handsZ: 4, cam: [0.5, 0.2, 0.84],
    a: { t: 76, hd: -16, ua: [-24, -24], fa: [-20, -20], th: [24, 24], sh: [-10, -10], labd: [12, 12] },
    b: { t: 0, ua: [8, 8], fa: [10, 10], th: [0, 0], sh: [0, 0], labd: [12, 12] } }));
  add('kb_swing', standing({ hold: 'kbmid', handsZ: 4,
    a: { t: 66, hd: -14, ua: [-28, -28], fa: [-24, -24], th: [28, 28], sh: [-14, -14], labd: [12, 12] },
    b: { t: -4, ua: [92, 92], fa: [92, 92], th: [0, 0], sh: [0, 0], labd: [12, 12] } }));
  add('cable_kickback_glute', standing({ root: 'ankle1', ground: ['ankle1'], cable: [180, 182], cableTo: 'ankle0', cam: [0.2, 0.2, 0.96],
    a: { t: 16, ua: [66, 66], fa: [86, 86], th: [6, 0], sh: [0, 0] },
    b: { t: 20, ua: [66, 66], fa: [86, 86], th: [-42, 0], sh: [-36, 0] } }));
  add('cable_abduction', standing({ root: 'ankle1', ground: ['ankle1'], cable: [100, 182, -46], cableTo: 'ankle0', cam: FRONTCAM,
    a: { t: 0, ua: [4, 30], fa: [2, 60], abd: [0, 40], labd: [-6, 0] },
    b: { t: 0, ua: [4, 30], fa: [2, 60], abd: [0, 40], labd: [38, 0] } }));
  const allFours = (a, b, over) => Object.assign({ root: 'hand0', at: [150, FL - 3.5], fit: [{ j: 'hand0', y: FL }, { j: 'knee1', y: FL }], cam: [0.3, 0.3, 0.9], target: { glutes: 1, hamstrings: 2 },
    a: Object.assign({ t: 90, hd: 4, ua: [0, 0], fa: [0, 0], th: [0, 0], sh: [-90, -90] }, a), b: Object.assign({ t: 90, hd: 4, ua: [0, 0], fa: [0, 0], th: [0, 0], sh: [-90, -90] }, b) }, over);
  add('donkey_kick', allFours({}, { th: [-92, 0], sh: [-180, -90] }));
  add('fire_hydrant', allFours({}, { labd: [62, 0], slabd: [0, 0] }, { cam: [-0.88, 0.38, 0.28] }));
  add('clamshell', { root: 'hip', at: [100, FL - 12], roll: 90, ground: ['hip', 'elb1', 'hand1'], mat: [20, 190], cam: [0.82, 0.4, 0.42], target: { glutes: 1 },
    a: { t: -90, ua: [-176, 88], fa: [-120, 90], th: [140, 140], sh: [50, 50], labd: [0, 0] },
    b: { t: -90, ua: [-176, 88], fa: [-120, 90], th: [140, 140], sh: [50, 50], labd: [40, 0], slabd: [40, 0] } });

  // ---------------- quads ----------------
  const squat = (hold, hz, arms, over) => Object.assign(standing({ hold, handsZ: hz }), {
    a: Object.assign({ t: 4, th: [0, 0], sh: [0, 0] }, arms.a), b: Object.assign({ t: 30, hd: -10, th: [78, 78], sh: [-30, -30] }, arms.b) }, over);
  const goblet = { a: { ua: [-14, -14], fa: [150, 150] }, b: { ua: [-4, -4], fa: [160, 160] } };
  add('goblet_squat', squat('kbmid', 4, goblet));
  add('db_goblet_squat', squat('goblet', 4, goblet));
  add('box_goblet_squat', squat('kbmid', 4, goblet, { box: { at: 'hip', pose: 'b', dx: -6 } }));
  add('db_squat', squat('db', 24, { a: { ua: [4, 4], fa: [0, 0] }, b: { ua: [6, 6], fa: [0, 0] } }));
  add('bw_squat', squat(null, null, { a: { ua: [6, 6], fa: [6, 6] }, b: { ua: [92, 92], fa: [92, 92] } }));
  add('back_squat', squat('backbar', null, { a: { ua: [-40, -40], abd: [55, 55], fa: [150, 150] }, b: { ua: [-40, -40], abd: [55, 55], fa: [150, 150] } }));
  const sumo = (hold) => Object.assign(squat(hold, 3, { a: { ua: [2, 2], fa: [0, 0] }, b: { ua: [2, 2], fa: [0, 0] } }), { cam: FRONTCAM });
  add('kb_sumo_squat', sumo('kbmid')); D.kb_sumo_squat.a.labd = [24, 24]; D.kb_sumo_squat.b = Object.assign(D.kb_sumo_squat.b, { labd: [30, 30], t: 14 });
  add('db_sumo_squat', sumo('goblet')); D.db_sumo_squat.a.labd = [24, 24]; D.db_sumo_squat.b = Object.assign(D.db_sumo_squat.b, { labd: [30, 30], t: 14 });
  const lunge = (hold, cross) => standing({ hold, handsZ: hold === 'db' ? 22 : null, ground: ['ankle0'],
    a: { t: 0, ua: [4, 4], th: [0, 0], sh: [0, 0], labd: [0, 0] },
    b: { t: 4, ua: [4, 4], th: [82, -14], sh: [-4, -86], labd: [0, cross ? -22 : 0] } });
  add('reverse_lunge', lunge('db'));
  add('walking_lunge', lunge('db'));
  add('curtsy_lunge', Object.assign(lunge(null, true), { cam: FRONTCAM }));
  add('split_squat', standing({ hold: 'db', handsZ: 22, ground: ['ankle0'], box: { x0: 4, x1: 52, top: 150 },
    a: { t: 2, th: [24, -24], sh: [-6, -96] },
    b: { t: 6, th: [82, -2], sh: [-12, -100] } }));
  add('step_up', { root: 'ankle0', at: [132, 150 - 5.5], box: { x0: 112, x1: 162, top: 150 }, hold: 'db', handsZ: 22,
    a: { t: 18, ua: [4, 4], fa: [0, 0], th: [86, -4], sh: [-14, 2] },
    b: { t: 0, ua: [4, 4], fa: [0, 0], th: [2, 70], sh: [0, 0] } });
  add('tke', standing({ cable: [184, 150], cableTo: 'knee0', target: { quadriceps: 1 }, ground: ['ankle0'],
    a: { t: 10, ua: [30, 4], fa: [60, 2], th: [44, -6], sh: [-36, 4] },
    b: { t: 2, ua: [30, 4], fa: [60, 2], th: [-4, -6], sh: [2, 4] } }));
  add('db_thruster', standing({ hold: 'db', handsZ: 21,
    a: { t: 28, hd: -10, ua: [20, 20], fa: [168, 168], th: [78, 78], sh: [-30, -30] },
    b: { t: 0, ua: [178, 178], fa: [178, 178], th: [0, 0], sh: [0, 0] } }));
  add('db_calf_raise', standing({ hold: 'db', handsZ: 24, target: { calves: 1 }, a: { heel: 0 }, b: { heel: 8 } }));
  copy('sl_calf_raise', 'db_calf_raise', { ground: ['ankle0'], a: { th: [0, -40], sh: [0, -100], heel: 0 }, b: { th: [0, -40], sh: [0, -100], heel: 8 } });

  // ---------------- core ----------------
  add('ab_wheel', { root: 'knee0', at: [70, FL - 5.5], hold: 'wheel', fit: [{ j: 'knee0', y: FL }, { j: 'mid', y: FL, pad: 15 }], cam: [0.3, 0.25, 0.92],
    a: { t: 34, hd: -10, ua: [0, 0], fa: [0, 0], th: [8, 8], sh: [-92, -92] },
    b: { t: 82, hd: 0, ua: [100, 100], fa: [100, 100], th: [-62, -62], sh: [-92, -92] } });
  add('cable_crunch', { root: 'knee0', at: [100, FL - 5.5], cable: [150, 10], cableTo: 'mid', hold: 'rope', handsZ: 4, cam: [0.4, 0.2, 0.9],
    a: { t: 8, ua: [150, 150], fa: [-110, -110], th: [0, 0], sh: [-92, -90] },
    b: { t: 72, hd: -14, ua: [110, 110], fa: [-160, -160], th: [-6, -6], sh: [-92, -90] } });
  add('woodchop', standing({ cable: [100, 18, -76], cableTo: 'mid', hold: 'handle', handsZ: 4, cam: FRONTCAM,
    a: { t: 0, tw: -48, ua: [150, 150], fa: [150, 150], labd: [12, 12] },
    b: { t: 10, tw: 42, ua: [36, 36], fa: [36, 36], labd: [12, 12] } }));
  add('plank', { root: 'elb0', at: [140, FL - 4.5], fit: [{ j: 'elb0', y: FL }, { j: 'ankle1', y: FL }], mat: [20, 190], cam: [0.35, 0.25, 0.9], target: { abdominals: 1, obliques: 2, shoulders: 2 }, period: 3600,
    a: { t: 86, hd: 4, ua: [0, 0], fa: [90, 90], th: [-86, -86], sh: [-86, -86] },
    b: { t: 84, hd: 4, ua: [2, 2], fa: [90, 90], th: [-86, -86], sh: [-86, -86] } });
  add('side_plank', Object.assign({}, D.plank, { roll: -90, fit: null, ground: ['elb0', 'ankle0'], cam: [0.4, 0.22, 0.89], target: { obliques: 1, abdominals: 2, glutes: 2 },
    a: { t: 86, hd: 0, ua: [0, 0], fa: [90, 90], th: [-86, -86], sh: [-86, -86] }, b: { t: 80, hd: 0, ua: [0, 0], fa: [90, 90], th: [-80, -80], sh: [-80, -80] } }));
  const supine = (a, b, over) => Object.assign({ root: 'hip', at: [100, FL - 12], mat: [20, 190], cam: HIGHCAM, a: Object.assign({ t: -90 }, a), b: Object.assign({ t: -90 }, b) }, over);
  add('dead_bug', supine({ ua: [180, 180], fa: [180, 180], th: [180, 180], sh: [90, 90] }, { ua: [262, 180], fa: [262, 180], th: [180, 104], sh: [90, 100] }, { target: { abdominals: 1, obliques: 2 } }));
  add('crunch', supine({ ua: [-150, -150], abd: [60, 60], fa: [40, 40], th: [136, 132], sh: [22, 18] }, { t: -58, ua: [-150, -150], abd: [60, 60], fa: [40, 40], th: [136, 132], sh: [22, 18] }, { target: { abdominals: 1 } }));
  add('bicycle_crunch', supine({ t: -66, tw: -26, ua: [-150, -150], abd: [62, 62], fa: [40, 40], th: [160, 100], sh: [86, 96] }, { t: -66, tw: 26, ua: [-150, -150], abd: [62, 62], fa: [40, 40], th: [100, 160], sh: [96, 86] }, { target: { abdominals: 1, obliques: 1 } }));
  add('leg_raise', supine({ ua: [88, 88], abd: [12, 12], fa: [90, 90], th: [94, 94], sh: [92, 92] }, { ua: [88, 88], abd: [12, 12], fa: [90, 90], th: [176, 176], sh: [176, 176] }, { target: { abdominals: 1 } }));
  add('flutter_kick', supine({ ua: [88, 88], abd: [12, 12], fa: [90, 90], th: [112, 92], sh: [112, 92] }, { ua: [88, 88], abd: [12, 12], fa: [90, 90], th: [92, 112], sh: [92, 112] }, { target: { abdominals: 1 }, period: 1400 }));
  add('russian_twist', { root: 'hip', at: [100, FL - 12], ground: ['hip'], mat: [20, 190], hold: 'goblet', handsZ: 4, cam: FRONTCAM, target: { obliques: 1, abdominals: 1 },
    a: { t: -40, tw: -44, ua: [70, 70], fa: [104, 104], th: [140, 140], sh: [80, 80] },
    b: { t: -40, tw: 44, ua: [70, 70], fa: [104, 104], th: [140, 140], sh: [80, 80] } });
  add('superman', { root: 'hip', at: [100, FL - 12], ground: ['hip'], mat: [20, 190], cam: [0.4, 0.3, 0.87], target: { 'lower back': 1, glutes: 2 },
    a: { t: 90, hd: 0, ua: [94, 94], fa: [94, 94], th: [-90, -90], sh: [-90, -90] },
    b: { t: 80, hd: -10, ua: [106, 106], fa: [108, 108], th: [-104, -104], sh: [-106, -106] } });
  add('mountain_climber', { root: 'hand0', at: [150, FL - 3.5], cam: [0.35, 0.3, 0.89], target: { abdominals: 1, quadriceps: 2, shoulders: 2 }, period: 1300,
    a: { t: 76, hd: 6, ua: [0, 0], fa: [0, 0], th: [40, -76], sh: [-110, -76], fit: [{ j: 'hand0', y: FL }, { j: 'ankle1', y: FL }] },
    b: { t: 76, hd: 6, ua: [0, 0], fa: [0, 0], th: [-76, 40], sh: [-76, -110], fit: [{ j: 'hand0', y: FL }, { j: 'ankle0', y: FL }] } });
  add('star_jump', standing({ cam: FRONTCAM, target: { quadriceps: 2, calves: 2, shoulders: 2 }, period: 1200,
    a: { ua: [4, 4], fa: [4, 4], abd: [6, 6], labd: [2, 2] },
    b: { ua: [4, 4], fa: [4, 4], abd: [150, 150], labd: [20, 20] } }));

  // ---------------- lifts imported from Fitbod (custom ids "fb_" + name) ----------------
  const back3 = { a: { ua: [-40, -40], abd: [55, 55], fa: [150, 150] } };
  copy('fb_barbellinclinebenchpress', 'db_incline', { hold: 'bar', handsZ: 24 });
  copy('fb_arnolddumbbellpress', 'db_shoulder_press', { a: { ua: [24, 24], abd: [8, 8], fa: [172, 172], fabd: [0, 0] } });
  add('fb_deadlift', standing({ hold: 'bar', handsZ: 22, target: { hamstrings: 1, glutes: 1, 'lower back': 1, quadriceps: 2, traps: 2 }, cam: [0.45, 0.15, 0.88],
    a: { t: 58, hd: -14, ua: [0, 0], fa: [0, 0], th: [58, 58], sh: [-22, -22] },
    b: { t: 0, ua: [4, 4], fa: [2, 2], th: [0, 0], sh: [0, 0] } }));
  copy('fb_sumodeadlift', 'fb_deadlift', { handsZ: 10, cam: FRONTCAM, a: { t: 42, th: [62, 62], labd: [28, 28] }, b: { labd: [24, 24] } });
  add('fb_frontsquat', standing({ hold: 'bar', handsZ: 21, target: { quadriceps: 1, glutes: 2, abdominals: 2 },
    a: { t: 2, ua: [74, 74], fa: [-176, -176], th: [0, 0], sh: [0, 0] },
    b: { t: 16, hd: -6, ua: [80, 80], fa: [-178, -178], th: [80, 80], sh: [-30, -30] } }));
  const gm = (hold, arms) => standing({ hold, handsZ: hold === 'goblet' ? 4 : null, target: { hamstrings: 1, 'lower back': 1, glutes: 2 }, cam: BACKCAM,
    a: Object.assign({ t: 0, th: [0, 0], sh: [0, 0] }, arms), b: Object.assign({ t: 76, hd: -10, th: [14, 14], sh: [-6, -6] }, arms) });
  add('fb_goodmorning', gm('backbar', back3.a));
  add('fb_stiffleggedbarbellgoodmorning', gm('backbar', back3.a));
  add('fb_dumbbellgoodmorning', gm('goblet', { ua: [-14, -14], fa: [150, 150] }));
  add('fb_barbellshrug', standing({ hold: 'bar', handsZ: 22, target: { traps: 1, forearms: 2 }, cam: [-0.35, 0.4, 0.85], period: 1800,
    a: { t: 0, ua: [2, 2], fa: [0, 0], shrug: 0 }, b: { t: 0, ua: [2, 2], fa: [0, 0], shrug: 6 } }));
  add('fb_uprightrow', standing({ hold: 'bar', handsZ: 8, target: { shoulders: 1, traps: 1, biceps: 2 }, cam: FRONTCAM,
    a: { t: 0, ua: [6, 6], fa: [4, 4], abd: [8, 8], fabd: [-6, -6] },
    b: { t: 0, ua: [20, 20], fa: [168, 168], abd: [78, 78], fabd: [-30, -30] } }));
  copy('fb_barbelllunge', 'reverse_lunge', { hold: 'backbar', handsZ: null, a: back3.a, b: Object.assign({}, D.reverse_lunge.b, back3.a) });
  copy('fb_standingbarbellcalfraise', 'db_calf_raise', { hold: 'backbar', handsZ: null, a: Object.assign({ heel: 0 }, back3.a), b: Object.assign({ heel: 8 }, back3.a) });
  copy('fb_declinepushup', 'pushup', { fit: [{ j: 'hand0', y: FL }, { j: 'ankle1', y: 140 }], bench: { at: 'ankle1', top: 140, w: 60 } });
  copy('fb_diamondpushup', 'pushup', { handsZ: 6, target: { triceps: 1, chest: 2 }, b: { abd: [0, 0] } });
  copy('fb_triceppushup', 'pushup', { handsZ: 14, target: { triceps: 1, chest: 2 }, b: { abd: [0, 0] } });
  copy('fb_renegaderow', 'pushup', { hold: 'db', target: { lats: 1, abdominals: 2, biceps: 2 }, b: { t: 80, ua: [-44, 0], fa: [2, 0], abd: [0, 0], th: [-80, -80], sh: [-80, -80] } });
  const invRow = { root: 'mid', at: [110, 112], pullbar: { y: 110, x: 110 }, fit: [{ j: 'mid', y: 112, pad: 0 }, { j: 'ankle1', y: FL }], target: { lats: 1, biceps: 2, 'middle back': 1 }, cam: [0.35, 0.2, 0.91],
    a: { t: -72, ua: [174, 174], fa: [176, 176], th: [102, 102], sh: [102, 102] },
    b: { t: -80, ua: [-30, -30], fa: [160, 160], abd: [30, 30], th: [100, 100], sh: [100, 100] } };
  add('fb_australianchinup', invRow);
  add('fb_trxrow', Object.assign({}, invRow, { handsZ: 6 }));
  add('fb_loopbandstandingchestpress', Object.assign({}, D.cable_press, { cable: null }));
  add('fb_burpee', standing({ target: { quadriceps: 1, chest: 2, abdominals: 2 }, period: 1600,
    a: { t: 0, ua: [170, 170], fa: [170, 170], th: [0, 0], sh: [0, 0], heel: 6 },
    b: { t: 80, hd: 8, ua: [0, 0], fa: [0, 0], th: [-80, -80], sh: [-80, -80], fit: [{ j: 'hand0', y: FL }, { j: 'ankle1', y: FL }] } }));
  const jump = { box: { x0: 130, x1: 180, top: 146 }, target: { quadriceps: 1, glutes: 1, calves: 2 },
    a: { t: 34, hd: -10, ua: [-40, -40], fa: [-20, -20], th: [74, 74], sh: [-30, -30] },
    b: { t: 0, ua: [150, 150], fa: [160, 160], th: [6, 6], sh: [0, 0], heel: 10 } };
  add('fb_boxjump', standing(jump));
  add('fb_1stepboxjump', standing(jump));
  add('fb_legpullin', { root: 'hip', at: [100, FL - 12], ground: ['hip', 'mid'], mat: [20, 190], cam: [0.5, 0.25, 0.83], target: { abdominals: 1 },
    a: { t: -50, ua: [-40, -40], fa: [-10, -10], th: [100, 100], sh: [96, 96] },
    b: { t: -40, ua: [-40, -40], fa: [-10, -10], th: [150, 150], sh: [60, 60] } });
  add('fb_situp', supine({ ua: [140, 140], fa: [-120, -120], th: [136, 132], sh: [22, 18] }, { t: -12, hd: -10, ua: [140, 140], fa: [-120, -120], th: [136, 132], sh: [22, 18] }, { target: { abdominals: 1 } }));
})();
