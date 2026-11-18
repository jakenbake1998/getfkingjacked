// Spotter engine: state, workout generation, progression, stats. No DOM here.
(function () {
  const KEY = 'spotter.v1';
  const EX = {};
  EXERCISES.forEach((e) => (EX[e.id] = e));

  // ---------- state ----------
  // Jake's setup (gym, his joints, his Fitbod history). Anyone else starts clean.
  function jakeState() {
    const eq = {};
    EQUIPMENT.forEach((e) => (eq[e.id] = true));
    return {
      version: 1,
      profile: { name: 'Jake', place: 'gym', split: 'ppl', goal: 'strength', stepGoal: 0 },
      settings: { minutes: 60, equipment: eq, dumbbells: null },
      programStart: '2026-11-16',
      joints: Object.assign({}, SEED_JOINTS),
      bans: JSON.parse(JSON.stringify(SEED_BANS)),
      swaps: {},
      painLog: SEED_PAIN.slice(),
      custom: {},
      notes: {},
      rest: {},
      steps: {},
      weights: [],
      rotIdx: null,
      history: SEED_HISTORY.map((h, i) => ({
        id: 'seed' + i,
        date: h.date,
        day: h.day,
        minutes: h.minutes,
        source: 'fitbod',
        entries: h.entries.map((en) => ({ ex: en.ex, sets: en.sets.map(([w, r]) => ({ w, r, done: true })) })),
      })),
      current: null,
      timer: null,
    };
  }
  // opts: { name, place: 'gym'|'home', split, goal, minutes, dumbbells: [5,12], joints: {knee:'sore'}, stepGoal }
  function newState(o) {
    const eq = {};
    EQUIPMENT.forEach((e) => (eq[e.id] = o.place === 'gym' ? true : e.id === 'dumbbell'));
    const joints = {};
    JOINTS.forEach((j) => (joints[j.id] = (o.joints && o.joints[j.id]) || 'ok'));
    const today = new Date();
    const iso = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    return {
      version: 1,
      profile: { name: o.name || '', place: o.place, split: o.split, goal: o.goal, stepGoal: o.stepGoal || 0 },
      settings: { minutes: o.minutes || 45, equipment: eq, dumbbells: o.place === 'home' && o.dumbbells && o.dumbbells.length ? o.dumbbells.slice().sort((a, b) => a - b) : null },
      programStart: iso,
      joints, bans: {}, swaps: {}, painLog: [], custom: {}, notes: {}, rest: {}, steps: {}, weights: [], rotIdx: 0,
      history: [], current: null, timer: null,
    };
  }

  function migrate(s) {
    // Saved before profiles existed: that's Jake's phone.
    if (!s.profile) s.profile = { name: 'Jake', place: 'gym', split: 'ppl', goal: 'strength', stepGoal: 0 };
    s.settings.dumbbells = s.settings.dumbbells || null;
    s.notes = s.notes || {};
    s.rest = s.rest || {};
    s.steps = s.steps || {};
    s.custom = s.custom || {};
    s.weights = s.weights || [];
    if (s.rotIdx === undefined) s.rotIdx = null;
    delete s.settings.order;
    // v2.0: sit-ups were wrongly merged into crunches on import. Jake's only sit-up days were Dec 8 2025 and Jan 8 2026 (no crunches those days).
    if (!s.fixSitups) {
      const day = (d) => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      let moved = false;
      for (const h of s.history) {
        if (h.source !== 'fitbod' || !['2025-12-08', '2026-01-08'].includes(day(h.date))) continue;
        for (const en of h.entries) if (en.ex === 'crunch') { en.ex = 'fb_situp'; moved = true; }
      }
      if (moved || s.history.some((h) => h.source === 'fitbod')) s.custom.fb_situp = s.custom.fb_situp || { id: 'fb_situp', name: 'Sit Up', group: 'Core', eq: [], kind: 'mid', unit: 'bw', stress: {} };
      if (!moved && !s.history.some((h) => h.entries.some((e) => e.ex === 'fb_situp'))) delete s.custom.fb_situp;
      s.fixSitups = true;
    }
    return s;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && s.version === 1) return migrate(s);
      }
    } catch (e) {}
    return null; // first run: the app shows setup
  }
  let S = load();
  function save() {
    if (S) localStorage.setItem(KEY, JSON.stringify(S));
  }
  function setup(o) {
    S = o === 'jake' ? jakeState() : newState(o);
    save();
  }
  function goal() {
    return GOALS[(S.profile && S.profile.goal) || 'strength'];
  }

  // ---------- helpers ----------
  const DAY = 86400000;
  function dayStart(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  }
  function exInfo(id) {
    return EX[id] || S.custom[id] || { id, name: id, group: 'Other', eq: [], kind: 'mid', unit: 'lb', stress: {} };
  }
  function e1rm(w, r) {
    if (!w || !r) return 0;
    return w * (1 + r / 30);
  }
  function primaryEq(ex) {
    for (const k of ['barbell', 'kettlebell', 'cable', 'dumbbell']) if (ex.eq.includes(k)) return k;
    return 'dumbbell';
  }
  // A gym dumbbell rack: 2.5 lb steps up to 25, then 5 lb steps up to the heaviest pair.
  function rackList() {
    const max = S.settings.rackMax || 100, out = [];
    for (let w = 2.5; w <= Math.min(25, max) + 0.01; w += 2.5) out.push(+w.toFixed(1));
    for (let w = 30; w <= max; w += 5) out.push(w);
    return out;
  }
  function ownedDumbbells(ex) {
    return primaryEq(ex) === "dumbbell" && S.settings.dumbbells && S.settings.dumbbells.length ? S.settings.dumbbells : null;
  }
  function roundW(w, ex) {
    const t = primaryEq(ex);
    const own = ownedDumbbells(ex);
    if (own) {
      // heaviest pair you own that isn't over the target, else the lightest
      let best = own[0];
      for (const k of own) if (k <= w + 0.01) best = k;
      return best;
    }
    if (t === 'kettlebell' || t === 'dumbbell') {
      const L = t === 'kettlebell' ? KETTLEBELLS : rackList();
      let best = L[0];
      for (const k of L) if (Math.abs(k - w) < Math.abs(best - w)) best = k;
      return best;
    }
    const step = 5;
    let r = Math.round(w / step) * step;
    if (t === 'barbell') r = Math.max(45, r);
    return Math.max(step, r);
  }
  function stepFor(w, ex) {
    const t = primaryEq(ex);
    if (t === 'kettlebell') return null;
    return t === 'dumbbell' && w < 25 ? 2.5 : 5;
  }
  function nudgeW(w, ex, dir) {
    const t = primaryEq(ex);
    const own = ownedDumbbells(ex);
    if (own) {
      const i = own.indexOf(roundW(w, ex));
      return own[Math.min(own.length - 1, Math.max(0, i + dir))];
    }
    if (t === 'kettlebell' || t === 'dumbbell') {
      const L = t === 'kettlebell' ? KETTLEBELLS : rackList();
      const i = L.indexOf(roundW(w, ex));
      return L[Math.min(L.length - 1, Math.max(0, i + dir))];
    }
    const step = dir > 0 ? stepFor(w, ex) : stepFor(Math.max(0, w - 0.01), ex);
    return Math.max(0, +(w + dir * step).toFixed(1));
  }

  // ---------- program position ----------
  function blockInfo(date) {
    const start = dayStart(S.programStart + 'T00:00:00');
    const weeks = Math.max(0, Math.floor((dayStart(date) - start) / DAY / 7));
    return { block: Math.floor(weeks / 4), week: weeks % 4, scheme: schemeFor(weeks % 4) };
  }
  function schemeFor(week) {
    const base = WEEKS[week];
    const g = goal();
    if (!g.reps) return base;
    const reps = {};
    for (const k in g.reps) reps[k] = base.name === 'Deload' ? Math.round(g.reps[k] * 0.8) : g.reps[k];
    return Object.assign({}, base, { reps });
  }
  function order() {
    return (SPLITS[S.profile.split] || SPLITS.ppl).order;
  }
  function rotIndex() {
    const o = order();
    if (S.rotIdx != null) return S.rotIdx % o.length;
    // older saves: continue from the last workout's day
    const last = S.history.length ? S.history[S.history.length - 1].day : null;
    return (o.indexOf(last) + 1) % o.length;
  }
  function nextDayType() {
    return order()[rotIndex()];
  }
  function advanceRotation(dayDone) {
    const o = order();
    const i = rotIndex();
    // if you picked a different day than planned, continue after the one you did
    const at = o[i] === dayDone ? i : Math.max(0, o.indexOf(dayDone));
    S.rotIdx = (at + 1) % o.length;
  }

  // ---------- rules ----------
  function banActive(id) {
    const b = S.bans[id];
    if (!b) return false;
    if (b.until && new Date(b.until) < new Date()) return false;
    return true;
  }
  function blockedBy(ex) {
    // returns reason string or null
    for (const k of ex.eq) if (!S.settings.equipment[k]) return 'equipment';
    if (banActive(ex.id)) return 'ban';
    for (const j in ex.stress || {}) {
      const st = S.joints[j] || 'ok';
      const lvl = ex.stress[j];
      if (st === 'sore' && lvl >= 2) return 'joint:' + j;
      if (st === 'injured' && lvl >= 1) return 'joint:' + j;
    }
    return null;
  }
  function allowed(ex) {
    return !blockedBy(ex);
  }

  // ---------- history lookups ----------
  function sessionsFor(id) {
    const out = [];
    for (const h of S.history) {
      for (const en of h.entries) if (en.ex === id) out.push({ date: h.date, sets: en.sets.filter((s) => s.done && !s.warm) });
    }
    return out.filter((s) => s.sets.length);
  }
  function bestE1rm(sets) {
    let b = 0;
    for (const s of sets) b = Math.max(b, e1rm(s.w, s.r));
    return b;
  }

  // Suggest weight and reps for an exercise this session.
  // What happened last time beyond the reps: how many sets were planned vs done, and the
  // "how many more sets could you do" answer (0 = nothing left ... 3 = 3 or more).
  function lastEntry(id) {
    for (let k = S.history.length - 1; k >= 0; k--) {
      const en = S.history[k].entries.find((e) => e.ex === id);
      if (en) return en;
    }
    return null;
  }
  function target(ex, scheme) {
    const t = baseTarget(ex, scheme);
    const en = lastEntry(ex.id);
    if (!en || t.first) return t;
    const done = en.sets.filter((s) => s.done && !s.warm).length;
    // Couldn't finish all the sets: plan what was done (at least 2) and hold the weight.
    if (en.planned && done < en.planned) { t.sets = Math.max(2, done); t.short = true; }
    if (ex.unit !== 'lb') return t;
    const lastTop = Math.max(...en.sets.map((s) => s.w || 0));
    if ((t.short || en.left === 0) && t.w > lastTop) { t.w = lastTop; t.maxed = false; }
    if (en.left == null || t.short || en.left === 0) return t;
    if (en.left >= 3 && t.w >= lastTop && !ownedDumbbells(ex)) t.w = nudgeW(Math.max(t.w, nudgeW(lastTop, ex, 1)), ex, 1);
    else if (en.left === 2 && t.w <= lastTop && !ownedDumbbells(ex)) {
      const hit = en.sets.every((s) => !s.tr || s.r >= s.tr);
      if (hit) t.w = nudgeW(lastTop, ex, 1);
    }
    return t;
  }
  function baseTarget(ex, scheme) {
    const reps = ex.unit === 'sec' ? null : scheme.reps[ex.kind];
    const hist = sessionsFor(ex.id);
    const last = hist[hist.length - 1];
    if (ex.unit === 'bw' || ex.unit === 'sec') {
      let r = ex.start || reps;
      if (last) {
        const vals = last.sets.map((s) => s.r);
        const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
        const hitAll = last.sets.every((s) => !s.tr || s.r >= s.tr);
        r = hitAll ? avg + (ex.unit === 'sec' ? 5 : 1) : avg;
      }
      if (scheme.name === 'Deload') r = Math.max(3, Math.round(r * 0.7));
      return { w: 0, r };
    }
    if (!hist.length) {
      const own = ownedDumbbells(ex);
      const w0 = own && ex.kind === 'iso' ? own[0] : roundW(ex.start || 20, ex);
      return { w: w0, r: reps, first: true };
    }
    const recent = hist.slice(-2);
    const best = Math.max(...recent.map((h) => bestE1rm(h.sets)));
    let w = (best / (1 + (reps + scheme.rir) / 30)) * scheme.scale;
    w = roundW(w, ex);
    // double progression: hit every planned rep last time at that weight → go up one step
    const lastTop = Math.max(...last.sets.map((s) => s.w));
    const topSets = last.sets.filter((s) => s.w === lastTop);
    const hitAll = topSets.every((s) => s.r >= (s.tr || reps));
    let r = reps;
    let maxed = false;
    const own = ownedDumbbells(ex);
    const cap = goal().repCap || 20;
    const lastR = Math.max(...topSets.map((s) => s.r));
    if (scheme.scale >= 1 && hitAll && reps >= (topSets[0].tr || reps) && w <= lastTop) {
      const up = nudgeW(lastTop, ex, 1);
      if (own && (up === lastTop || up > lastTop * 1.5) && lastR < cap) {
        // only a couple of dumbbells: stay at this weight and add reps until the cap
        w = lastTop;
        r = Math.min(cap, Math.max(reps, lastR + 2));
      } else if (own && up === lastTop) {
        w = lastTop;
        r = cap;
        maxed = true;
      } else w = up;
    }
    return { w, r, maxed };
  }

  function restFor(ex, scheme, dayType) {
    if (S.rest[ex.id]) return S.rest[ex.id];
    if (dayType && DAYS[dayType] && DAYS[dayType].circuit) return 20;
    const base = REST[ex.kind] + (ex.kind === 'big' ? scheme.restAdd : 0);
    return Math.max(20, Math.round((base * goal().restScale) / 5) * 5);
  }
  function estSeconds(item) {
    return item.sets.length * (30 + item.rest * 0.85) + 45;
  }

  function makeItem(ex, scheme, slotIdx, dayType) {
    const t = target(ex, scheme);
    const circuit = dayType && DAYS[dayType] && DAYS[dayType].circuit;
    let n = circuit ? (S.settings.minutes >= 40 ? 4 : 3) : ex.kind === 'core' ? Math.min(3, scheme.sets) : scheme.sets;
    if (t.sets && !circuit) n = Math.min(n, t.sets);
    const sets = [];
    for (let i = 0; i < n; i++) sets.push({ w: t.w, r: t.r, tr: t.r, done: false });
    return { slot: slotIdx, ex: ex.id, rest: restFor(ex, scheme, dayType), first: !!t.first, maxed: !!t.maxed, sets };
  }

  function candidates(dayType, slotIdx, exclude) {
    const slot = DAYS[dayType].slots[slotIdx];
    return slot.ex.map((id) => EX[id]).filter((e) => e && allowed(e) && !(exclude || []).includes(e.id));
  }

  function pickFor(dayType, slotIdx, block, used) {
    const key = block + ':' + dayType + ':' + slotIdx;
    const sw = S.swaps[key];
    if (sw && EX[sw] && allowed(EX[sw]) && !used.includes(sw)) return EX[sw];
    const c = candidates(dayType, slotIdx, used);
    if (!c.length) return null;
    return c[block % c.length];
  }

  function generate(dayType, date) {
    date = date || new Date();
    const { block, week, scheme } = blockInfo(date);
    const day = DAYS[dayType];
    const budget = S.settings.minutes * 60;
    const items = [];
    const used = [];
    let total = 0;
    const coreIdx = day.slots.findIndex((s) => s.core);
    let coreItem = null;
    if (coreIdx >= 0) {
      const ce = pickFor(dayType, coreIdx, block, used);
      if (ce) {
        coreItem = makeItem(ce, scheme, coreIdx, dayType);
        used.push(ce.id);
      }
    }
    const coreTime = coreItem ? estSeconds(coreItem) : 0;
    day.slots.forEach((slot, i) => {
      if (slot.core) return;
      const ex = pickFor(dayType, i, block, used);
      if (!ex) return;
      const it = makeItem(ex, scheme, i, dayType);
      const t = estSeconds(it);
      if (items.length >= 3 && total + t + coreTime > budget + 120) return;
      items.push(it);
      used.push(ex.id);
      total += t;
    });
    if (coreItem && total + coreTime <= budget + 240) { items.push(coreItem); total += coreTime; }
    // Time left over (light weeks, few slots): add a set to the main lifts, first ones first.
    if (scheme.name !== 'Deload' && !day.circuit) {
      let added = true;
      while (added && total < budget - 240) {
        added = false;
        for (const it of items) {
          if (EX[it.ex].kind === 'core' || it.sets.length >= 5) continue;
          const one = it.sets.length ? (30 + it.rest * 0.85) : 0;
          if (total + one > budget) continue;
          it.sets.push(Object.assign({}, it.sets[it.sets.length - 1]));
          total += one;
          added = true;
          if (total >= budget - 240) break;
        }
      }
    }
    return { day: dayType, block, week, schemeName: scheme.name, items, estMin: Math.round(items.reduce((a, it) => a + estSeconds(it), 0) / 60) };
  }

  // What the joint rules are keeping out of this day (for the "avoiding" note).
  function avoidedFor(dayType) {
    const out = [];
    const seen = {};
    DAYS[dayType].slots.forEach((slot) =>
      slot.ex.forEach((id) => {
        const ex = EX[id];
        if (!ex || seen[id]) return;
        seen[id] = 1;
        const b = blockedBy(ex);
        if (b && b !== 'equipment') out.push({ ex, why: b });
      })
    );
    return out;
  }

  // Swap the exercise in a plan item for the next allowed one in its slot.
  function swapItem(plan, idx, block) {
    const it = plan.items[idx];
    const used = plan.items.map((x) => x.ex);
    const c = candidates(plan.day, it.slot, used);
    if (!c.length) return false;
    const ex = c[0];
    const scheme = schemeFor(plan.week);
    const done = it.sets.filter((s) => s.done).length;
    const fresh = makeItem(ex, scheme, it.slot, plan.day);
    plan.items[idx] = fresh;
    if (done) plan.items.splice(idx, 0, it); // keep finished sets, add new one after
    S.swaps[block + ':' + plan.day + ':' + it.slot] = ex.id;
    return true;
  }
  function swapOptions(plan, idx) {
    const it = plan.items[idx];
    const used = plan.items.map((x) => x.ex);
    const first = it.slot >= 0 && DAYS[plan.day].slots[it.slot] ? candidates(plan.day, it.slot, used) : [];
    const g = exInfo(it.ex).group;
    const more = EXERCISES.filter((e) => e.group === g && allowed(e) && !used.includes(e.id) && !first.includes(e));
    return first.concat(more);
  }
  function itemFor(exId, plan) {
    return makeItem(EX[exId], schemeFor(plan.week), -1, plan.day);
  }
  function swapTo(plan, idx, exId) {
    const it = plan.items[idx];
    const scheme = schemeFor(plan.week);
    const fresh = makeItem(EX[exId], scheme, it.slot, plan.day);
    const done = it.sets.some((s) => s.done);
    if (done) {
      it.sets = it.sets.filter((s) => s.done);
      plan.items.splice(idx + 1, 0, fresh);
    } else plan.items[idx] = fresh;
    S.swaps[plan.block + ':' + plan.day + ':' + it.slot] = exId;
  }

  // ---------- session ----------
  function startWorkout(plan) {
    S.current = Object.assign({}, plan, { startedAt: new Date().toISOString() });
    save();
  }
  function finishWorkout() {
    const c = S.current;
    if (!c) return null;
    const entries = c.items
      .map((it) => {
        const en = { ex: it.ex, planned: it.sets.filter((s) => !s.warm).length, sets: it.sets.filter((s) => s.done).map((s) => ({ w: s.w, r: s.r, tr: s.tr, done: true, warm: s.warm || undefined })) };
        if (it.left != null) en.left = it.left;
        return en;
      })
      .filter((e) => e.sets.length);
    // Learn rest: average real rest per exercise, blended with what was used before.
    c.items.forEach((it) => {
      const r = (it.rests || []).filter((x) => x >= 10 && x <= 420);
      if (!r.length) return;
      const avg = r.reduce((a, b) => a + b, 0) / r.length;
      const prev = S.rest[it.ex] || it.rest;
      S.rest[it.ex] = Math.max(15, Math.min(300, Math.round((prev * 0.4 + avg * 0.6) / 5) * 5));
    });
    const minutes = Math.round((Date.now() - new Date(c.startedAt)) / 60000);
    let rec = null;
    if (entries.length) {
      rec = { id: 'w' + Date.now(), date: c.startedAt, day: c.day, minutes, entries };
      rec.records = recordsIn(rec);
      S.history.push(rec);
      advanceRotation(c.day);
    }
    S.current = null;
    S.timer = null;
    save();
    return rec;
  }
  function recordsIn(rec) {
    const out = [];
    for (const en of rec.entries) {
      const ex = exInfo(en.ex);
      const prev = sessionsFor(en.ex);
      if (!prev.length) continue;
      if (ex.unit === 'lb') {
        const before = Math.max(...prev.map((p) => bestE1rm(p.sets)));
        const now = bestE1rm(en.sets);
        if (now > before + 0.1) out.push({ ex: en.ex, what: 'Est. 1-rep max', val: Math.round(now) + ' lb' });
        const wb = Math.max(...prev.flatMap((p) => p.sets.map((s) => s.w || 0)));
        const wn = Math.max(...en.sets.map((s) => s.w || 0));
        if (wn > wb) out.push({ ex: en.ex, what: 'Heaviest weight', val: wn + ' lb' });
      } else {
        const before = Math.max(...prev.flatMap((p) => p.sets.map((s) => s.r)));
        const now = Math.max(...en.sets.map((s) => s.r));
        if (now > before) out.push({ ex: en.ex, what: ex.unit === 'sec' ? 'Longest hold' : 'Most reps', val: now + (ex.unit === 'sec' ? ' sec' : ' reps') });
      }
    }
    return out;
  }

  // ---------- pain / dislikes ----------
  function reportPain(exId, joint, severity, note) {
    S.painLog.push({ at: new Date().toISOString(), joint, ex: exId, severity, note: note || '' });
    if (exId) {
      const until = severity === 'twinge' ? new Date(Date.now() + 28 * DAY).toISOString() : null;
      S.bans[exId] = { reason: 'pain', joint, until, note: severity === 'twinge' ? 'Twinge. Paused for 4 weeks.' : 'Hurt during a set.' };
    }
    if (joint && joint !== 'other') {
      const cur = S.joints[joint] || 'ok';
      if (severity === 'sharp') S.joints[joint] = 'injured';
      else if (severity === 'hurts' && cur === 'ok') S.joints[joint] = 'sore';
    }
    save();
  }
  function dislike(exId) {
    S.bans[exId] = { reason: 'dislike', until: null, note: 'You said you don’t like it.' };
    save();
  }
  function unban(exId) {
    delete S.bans[exId];
    save();
  }

  // ---------- stats ----------
  function volume(rec) {
    let v = 0;
    for (const en of rec.entries) for (const s of en.sets) v += (s.w || 0) * (s.r || 0);
    return Math.round(v);
  }
  function rangeStart(range) {
    const now = Date.now();
    if (range === 'all') return new Date(0);
    return new Date(now - ({ week: 7, month: 30, '6m': 182, year: 365 }[range] || 30) * DAY);
  }
  // Strength index: average across your lifts of (est. 1RM now ÷ est. 1RM the first time) × 100.
  // A lift counts once you have done it twice. 100 = where you started.
  function strengthSeries(groupFilter) {
    const firsts = {};
    const latest = {};
    const counts = {};
    const pts = [];
    const sorted = S.history.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    for (const h of sorted) {
      let touched = false;
      for (const en of h.entries) {
        const ex = exInfo(en.ex);
        if (ex.unit !== 'lb') continue;
        if (groupFilter && !groupFilter.includes(ex.group)) continue;
        const v = bestE1rm(en.sets);
        if (!v) continue;
        if (!firsts[en.ex]) firsts[en.ex] = v;
        latest[en.ex] = v;
        counts[en.ex] = (counts[en.ex] || 0) + 1;
        touched = true;
      }
      if (!touched) continue;
      const ids = Object.keys(counts).filter((k) => counts[k] >= 2);
      if (!ids.length) continue;
      const idx = (ids.reduce((a, k) => a + latest[k] / firsts[k], 0) / ids.length) * 100;
      pts.push({ date: new Date(h.date), v: idx });
    }
    return pts;
  }
  function liftSeries(id) {
    const ex = exInfo(id);
    return sessionsFor(id).map((s) => ({
      date: new Date(s.date),
      v: ex.unit === 'lb' ? bestE1rm(s.sets) : Math.max(...s.sets.map((x) => x.r)),
      top: s.sets.reduce((b, x) => (x.w > b.w || (x.w === b.w && x.r > b.r) ? x : b), { w: 0, r: 0 }),
    }));
  }
  const GROUPS = ['Chest', 'Shoulders', 'Triceps', 'Back', 'Biceps', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core'];
  const WEEKLY_TARGET = { Chest: 10, Shoulders: 10, Triceps: 8, Back: 12, Biceps: 8, Quads: 8, Hamstrings: 8, Glutes: 8, Calves: 6, Core: 8 };
  function setsByGroup(since) {
    const out = {};
    GROUPS.forEach((g) => (out[g] = 0));
    for (const h of S.history) {
      if (new Date(h.date) < since) continue;
      for (const en of h.entries) {
        const g = exInfo(en.ex).group;
        if (out[g] != null) out[g] += en.sets.length;
      }
    }
    return out;
  }
  function weekStart(d) {
    const x = dayStart(d || new Date());
    x.setDate(x.getDate() - x.getDay());
    return x;
  }
  function liftsTrained() {
    const ids = {};
    for (const h of S.history) for (const en of h.entries) ids[en.ex] = (ids[en.ex] || 0) + 1;
    return Object.keys(ids);
  }

  // ---------- import / export ----------
  function exportJSON() {
    return JSON.stringify(S, null, 1);
  }
  function importJSON(txt) {
    const s = JSON.parse(txt);
    if (!s || s.version !== 1 || !Array.isArray(s.history)) throw new Error('That isn’t a Spotter backup.');
    S = migrate(s);
    save();
  }
  function norm(n) {
    return String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const FITBOD_MAP = {};
  EXERCISES.forEach((e) => {
    FITBOD_MAP[norm(e.name)] = e.id;
    (e.fitbod || []).forEach((n) => (FITBOD_MAP[norm(n)] = e.id));
  });
  // Fitbod names that differ from ours. Anything not here and not in the library becomes a custom lift.
  const FITBOD_ALIAS = {
    'Dumbbell Lunge': 'walking_lunge', 'Cable Rope Tricep Extension': 'oh_cable_ext', 'Chest Dip': 'dip', 'Shotgun Row': 'sa_cable_row',
    'Dumbbell Kickbacks': 'db_kickback', 'Lat Pulldown': 'kneel_pulldown', 'Dumbbell Rear Delt Raise': 'rear_delt_fly',
    'Dumbbell Bent Over Reverse Fly': 'rear_delt_fly', 'Dumbbell Back Fly': 'rear_delt_fly', 'Cross Body Hammer Curls': 'hammer_curl',
    'Incline Hammer Curl': 'hammer_curl', 'Superman with Scaption': 'superman', 'Superman Hold': 'superman', 'Ab Rollout': 'ab_wheel',
    'Gorilla Rows': 'kb_gorilla_row', 'EZ-Bar Curl': 'bb_curl', 'Seated Dumbbell Curl': 'db_curl', 'Reverse Barbell Curl': 'reverse_curl',
    'Standing Dumbbell Shoulder Press': 'standing_db_press', 'Reverse Grip Barbell Bent Over Row': 'bb_row', 'Smith Machine Bent Over Row': 'bb_row',
    'Push Up on Knees': 'knee_pushup', 'Straight-Arm Pulldown': 'straight_arm_pd', 'Dumbbell Tricep Extension': 'db_oh_ext',
    'Cable Hip Extension': 'cable_kickback_glute',
  };
  const FITBOD_GROUP = {
    'Deadlift': 'Hamstrings', 'Sumo Deadlift': 'Glutes', 'Front Squat': 'Quads', 'Barbell Lunge': 'Quads', 'Box Jump': 'Quads', '1-Step Box Jump': 'Quads',
    'Standing Barbell Calf Raise': 'Calves', 'Barbell Incline Bench Press': 'Chest', 'Decline Push Up': 'Chest', 'Loop Band Standing Chest Press': 'Chest',
    'Arnold Dumbbell Press': 'Shoulders', 'Upright Row': 'Shoulders', 'Barbell Shrug': 'Back', 'TRX Row': 'Back', 'Australian Chin Up': 'Back', 'Renegade Row': 'Back',
    'Good Morning': 'Hamstrings', 'Dumbbell Good Morning': 'Hamstrings', 'Stiff-Legged Barbell Good Morning': 'Hamstrings',
    'Diamond Push Up': 'Triceps', 'Tricep Push Up': 'Triceps', 'Leg Pull-In': 'Core', 'Burpee': 'Core', 'Sit Up': 'Core',
  };
  const FITBOD_SKIP = { walking: 1, hiking: 1, running: 1, cycling: 1, elliptical: 1, rowing: 1 };
  Object.keys(FITBOD_ALIAS).forEach((n) => (FITBOD_MAP[norm(n)] = FITBOD_ALIAS[n]));
  // Fitbod writes "2026-11-14 23:49:53 +0000", which iPhone Safari can't parse. Read it by hand.
  function parseDate(v) {
    v = String(v || '').trim();
    const m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?\s*(?:(Z)|([+-])(\d{2}):?(\d{2})?)?/);
    if (!m) { const d = new Date(v); return isNaN(d) ? null : d; }
    const [, y, mo, da, h, mi, se, z, sg, oh, om] = m;
    if (!z && !sg) return new Date(+y, +mo - 1, +da, +(h || 12), +(mi || 0), +(se || 0));
    let t = Date.UTC(+y, +mo - 1, +da, +(h || 0), +(mi || 0), +(se || 0));
    if (sg) t -= (sg === '-' ? -1 : 1) * ((+oh) * 60 + (+(om || 0))) * 60000;
    return new Date(t);
  }
  const localKey = (d) => { d = new Date(d); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function parseCSV(txt) {
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < txt.length; i++) {
      const c = txt[i];
      if (q) {
        if (c === '"' && txt[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') q = false;
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && txt[i + 1] === '\n') i++;
        row.push(cell); rows.push(row); row = []; cell = '';
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.some((x) => x.trim()));
  }
  // Fitbod CSV export: Date, Exercise, Reps, Weight(kg), Duration(s), ..., isWarmup, Note
  // Strong / Hevy write "Bench Press (Barbell)": also try "Barbell Bench Press".
  function lookupName(name) {
    let id = FITBOD_MAP[norm(name)];
    if (id) return id;
    const m = name.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (m) {
      const eq = m[2].replace(/machine|smith machine/i, 'Machine');
      id = FITBOD_MAP[norm(eq + ' ' + m[1])] || FITBOD_MAP[norm(m[1] + ' ' + eq)] || FITBOD_MAP[norm(m[1])];
    }
    return id || null;
  }
  // Hevy writes "15 Nov 2026, 18:30"
  const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function parseAnyDate(v) {
    const m = String(v || '').trim().match(/^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4}),?\s*(\d{1,2})?:?(\d{2})?/);
    if (m && MONTHS[m[2].toLowerCase()] != null) return new Date(+m[3], MONTHS[m[2].toLowerCase()], +m[1], +(m[4] || 12), +(m[5] || 0));
    return parseDate(v);
  }
  function detectApp(head) {
    const h = head.join('|');
    if (/exercise_title/.test(h)) return 'Hevy';
    if (/set order/.test(h) && /workout name/.test(h)) return 'Strong';
    if (/iswarmup|multiplier/.test(h)) return 'Fitbod';
    if (/category/.test(h) && /distance unit/.test(h)) return 'FitNotes';
    if (/logs?|jefit/i.test(h)) return 'JEFIT';
    return 'CSV';
  }
  // Workout history from Fitbod, Strong, Hevy, JEFIT, FitNotes or any CSV with date, exercise, weight and reps columns.
  function importHistory(txt, unitHint) {
    const first = txt.split(/\r?\n/, 1)[0] || '';
    if ((first.match(/;/g) || []).length > (first.match(/,/g) || []).length) txt = txt.replace(/;/g, ',');
    const rows = parseCSV(txt.replace(/^\uFEFF/, ''));
    if (rows.length < 2) throw new Error('That file has no rows.');
    const head = rows[0].map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ''));
    const app = detectApp(head);
    const col = (re) => head.findIndex((h) => re.test(h));
    const cDate = col(/^date$|^date\b|start_time|^start|workout date/), cEx = col(/exercise(_| )?(name|title)?$|^exercise/), cReps = col(/^reps$|^reps\b|repetitions/), cW = col(/^weight|weight_(lbs|kg)|^load/), cWarm = col(/warm|set_type/), cDur = col(/duration_seconds|^seconds$|duration\(s\)|^time$/);
    if (cDate < 0 || cEx < 0) throw new Error('Couldn’t find date and exercise columns in that file. It should be a workout export from Fitbod, Strong, Hevy, JEFIT or FitNotes.');
    const kg = cW >= 0 && (/kg/.test(head[cW]) || (!/lb/.test(head[cW]) && unitHint === 'kg'));
    const byDay = {};
    let unknown = {};
    for (const r of rows.slice(1)) {
      if (cWarm >= 0 && /true|^1$|yes|warm/i.test(r[cWarm] || '')) continue;
      const d = parseAnyDate(r[cDate]);
      if (!d) continue;
      const name = (r[cEx] || '').trim();
      if (!name || FITBOD_SKIP[norm(name)]) continue;
      let id = lookupName(name);
      if (!id) {
        id = 'fb_' + norm(name);
        if (!S.custom[id]) S.custom[id] = { id, name, group: FITBOD_GROUP[name] || 'Other', eq: [], kind: 'mid', unit: 'lb', stress: {} };
        unknown[name] = 1;
      }
      let w = cW >= 0 ? parseFloat(r[cW]) || 0 : 0;
      if (kg) w = Math.round(w * 2.20462 * 2) / 2;
      let reps = cReps >= 0 ? parseInt(r[cReps]) || 0 : 0;
      const ex = exInfo(id);
      if (ex.unit === 'sec' && cDur >= 0) reps = parseInt(r[cDur]) || reps;
      if (!reps) continue;
      if (S.custom[id]) { const c = S.custom[id]; c._w = (c._w || 0) + (w > 0 ? 1 : 0); c._n = (c._n || 0) + 1; }
      const key = localKey(d);
      byDay[key] = byDay[key] || { date: d.toISOString(), entries: {} };
      if (d < new Date(byDay[key].date)) byDay[key].date = d.toISOString();
      (byDay[key].entries[id] = byDay[key].entries[id] || []).push({ w, r: reps, done: true });
    }
    Object.values(S.custom).forEach((c) => { if (c._n) { if (!c._w) c.unit = 'bw'; else if (c.unit === 'bw') c.unit = 'lb'; } delete c._w; delete c._n; });
    const existing = new Set(S.history.map((h) => localKey(h.date)));
    let added = 0;
    for (const k of Object.keys(byDay)) {
      if (existing.has(k)) continue;
      const v = byDay[k];
      const entries = Object.keys(v.entries).map((ex) => ({ ex, sets: v.entries[ex] }));
      const groups = entries.map((e) => exInfo(e.ex).group);
      if (!entries.length) continue;
      const score = { push: 0, pull: 0, legs: 0 };
      groups.forEach((g) => {
        if (['Chest', 'Shoulders', 'Triceps'].includes(g)) score.push++;
        else if (['Back', 'Biceps'].includes(g)) score.pull++;
        else if (['Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(g)) score.legs++;
      });
      const day = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
      S.history.push({ id: 'fb' + k, date: v.date, day, minutes: null, source: app === 'Fitbod' ? 'fitbod' : app.toLowerCase(), entries });
      existing.add(k);
      added++;
    }
    S.history.sort((a, b) => new Date(a.date) - new Date(b.date));
    save();
    return { added, unknown: Object.keys(unknown), app };
  }

  // ---------- muscle recovery (estimate) ----------
  // Each hard set leaves some fatigue on the muscles it trains (main group fully, helpers half).
  // Fatigue clears over about 48 h for a normal session, longer when there was a lot of work or you
  // said you had nothing left (0 more sets). Recovery % = 100 − remaining fatigue.
  const HELPERS = { Chest: ['Triceps', 'Shoulders'], Back: ['Biceps'], Shoulders: ['Triceps'], Quads: ['Glutes'], Hamstrings: ['Glutes'], Glutes: ['Hamstrings'] };
  function recovery() {
    const now = Date.now(), load = {};
    for (const h of S.history) {
      const hrs = (now - new Date(h.date)) / 3600000;
      if (hrs > 24 * 6 || hrs < 0) continue;
      for (const en of h.entries) {
        const g = exInfo(en.ex).group;
        const sets = en.sets.filter((x) => !x.warm).length;
        if (!sets || g === 'Other') continue;
        const hard = en.left === 0 ? 1.35 : en.left === 1 ? 1.15 : en.left >= 3 ? 0.8 : 1;
        const add = (grp, k) => { (load[grp] = load[grp] || []).push({ hrs, sets: sets * k * hard }); };
        add(g, 1);
        (HELPERS[g] || []).forEach((x) => add(x, 0.5));
      }
    }
    const out = [];
    for (const g of Object.keys(load)) {
      let fatigue = 0;
      for (const x of load[g]) {
        const full = 36 + Math.min(48, x.sets * 5); // hours to clear: 3 sets ≈ 51 h, 8 sets ≈ 76 h
        fatigue += Math.min(1, x.sets / 8) * Math.max(0, 1 - x.hrs / full);
      }
      const pct = Math.round(100 * Math.max(0, 1 - Math.min(1, fatigue)));
      const last = Math.min(...load[g].map((x) => x.hrs));
      out.push({ group: g, pct, hoursAgo: Math.round(last) });
    }
    return out.sort((a, b) => a.pct - b.pct);
  }

  function exportCSV() {
    const q = (v) => (/[",\n]/.test(String(v)) ? '"' + String(v).replace(/"/g, '""') + '"' : String(v));
    const L = ['Date,Workout,Exercise,Set,Weight (lb),Reps,Warm-up,Est. 1-rep max (lb)'];
    for (const h of S.history) {
      const d = new Date(h.date);
      const ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
      for (const en of h.entries) {
        const ex = exInfo(en.ex);
        en.sets.forEach((st, i) => L.push([ds, (DAYS[h.day] && DAYS[h.day].name) || h.day, ex.name, i + 1, ex.unit === 'lb' ? st.w : '', st.r, st.warm ? 'yes' : '', ex.unit === 'lb' ? Math.round(e1rm(st.w, st.r)) : ''].map(q).join(',')));
      }
    }
    return L.join('\n');
  }

  // ---------- body weight ----------
  function logWeight(lb) {
    const k = localKey(new Date());
    S.weights = S.weights.filter((x) => localKey(x.date) !== k);
    S.weights.push({ date: new Date().toISOString(), lb });
    S.weights.sort((a, b) => new Date(a.date) - new Date(b.date));
    save();
  }
  function bodyweight() { return S.weights.length ? S.weights[S.weights.length - 1].lb : null; }

  // ---------- strength standards (estimate) ----------
  // Rough public strength-standard ratios: est. 1-rep max ÷ bodyweight at each level, by sex.
  // Dumbbell lifts are converted to a barbell-equivalent (two dumbbells ≈ 80% of the barbell lift).
  const LEVELS = ['Beginner', 'Novice', 'Intermediate', 'Advanced', 'Elite'];
  const STANDARDS = {
    bench: { name: 'Bench press', m: [0.5, 0.75, 1.0, 1.5, 2.0], f: [0.25, 0.5, 0.75, 1.0, 1.5], lifts: { bb_bench: 1, db_bench: 2 / 0.8, close_grip_bench: 1.1, bb_floor_press: 1.1, db_floor_press: 2 / 0.75 } },
    press: { name: 'Overhead press', m: [0.35, 0.55, 0.75, 1.0, 1.4], f: [0.2, 0.35, 0.5, 0.75, 1.0], lifts: { bb_ohp: 1, db_shoulder_press: 2 / 0.8, standing_db_press: 2 / 0.8 } },
    squat: { name: 'Squat', m: [0.75, 1.25, 1.5, 2.25, 2.75], f: [0.5, 0.75, 1.25, 1.5, 2.0], lifts: { back_squat: 1, fb_frontsquat: 1.2, goblet_squat: 1.9, box_goblet_squat: 1.9 } },
    deadlift: { name: 'Deadlift', m: [1.0, 1.5, 2.0, 2.5, 3.0], f: [0.5, 1.0, 1.25, 1.75, 2.5], lifts: { fb_deadlift: 1, fb_sumodeadlift: 1, bb_rdl: 1.25, stiff_leg_dl: 1.3, db_rdl: 2 / 0.8 * 1.25, kb_deadlift: 1.6 } },
    row: { name: 'Row', m: [0.5, 0.75, 1.0, 1.25, 1.75], f: [0.25, 0.4, 0.65, 0.9, 1.2], lifts: { bb_row: 1, db_row: 2 / 0.85, cs_db_row: 2 / 0.85 } },
  };
  // Older lifters: standards ease off a little each year past 35
  const ageFactor = (age) => (!age || age <= 35 ? 1 : Math.max(0.6, 1 - (age - 35) * 0.01));
  function standings() {
    const bw = bodyweight(), P = S.profile;
    if (!bw || !P.sex) return null;
    const out = [];
    for (const key of Object.keys(STANDARDS)) {
      const st = STANDARDS[key];
      let best = 0, from = null;
      for (const id of Object.keys(st.lifts)) {
        const ses = sessionsFor(id).slice(-6);
        if (!ses.length) continue;
        const v = Math.max(...ses.map((x) => bestE1rm(x.sets))) * st.lifts[id];
        if (v > best) { best = v; from = id; }
      }
      if (!best) continue;
      const ratio = best / bw / ageFactor(P.age);
      const lv = st[P.sex === 'f' ? 'f' : 'm'];
      let i = 0;
      while (i < lv.length - 1 && ratio >= lv[i + 1]) i++;
      const lo = lv[i], hi = lv[i + 1];
      const pos = ratio < lv[0] ? (ratio / lv[0]) * 0.2 : hi ? (i + (ratio - lo) / (hi - lo)) / (lv.length - 1) : 1;
      out.push({ key, name: st.name, from, e1rm: Math.round(best), ratio, level: ratio < lv[0] ? 'Beginner' : LEVELS[i], pos: Math.max(0, Math.min(1, pos)), next: hi ? Math.round(hi * bw * ageFactor(P.age)) : null, nextLevel: hi ? LEVELS[i + 1] : null });
    }
    return out;
  }

  // ---------- plain-text workout export (to paste into Claude) ----------
  function exportForClaude(days) {
    const since = Date.now() - (days || 30) * DAY;
    const H = S.history.filter((h) => new Date(h.date) >= since);
    const bw = bodyweight();
    const L = ['Workouts from Get F*ing Jacked!' + (S.profile.name ? ' (' + S.profile.name + ')' : '') + ', last ' + (days || 30) + ' days', ''];
    if (bw) L.push('Body weight: ' + bw + ' lb' + (S.weights.length > 1 ? ' (was ' + S.weights[0].lb + ' lb on ' + new Date(S.weights[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ')' : ''), '');
    for (const h of H) {
      const mins = h.minutes || Math.round(h.entries.reduce((a, e) => a + e.sets.length, 0) * 2.5);
      // ~5 kcal/min for weight training at moderate effort, scaled by body weight (150 lb baseline)
      const kcal = Math.round(mins * 5 * ((bw || 150) / 150));
      L.push(new Date(h.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ', ' + ((DAYS[h.day] && DAYS[h.day].name) || h.day) + ', ' + mins + ' min, about ' + kcal + ' kcal burned');
      for (const en of h.entries) {
        const ex = exInfo(en.ex);
        const sets = en.sets.filter((x) => !x.warm).map((x) => (ex.unit === 'lb' ? x.w + ' lb × ' + x.r : x.r + (ex.unit === 'sec' ? ' sec' : ' reps'))).join(', ');
        L.push('  ' + ex.name + ': ' + sets);
      }
      L.push('');
    }
    if (!H.length) L.push('No workouts in this period.');
    return L.join('\n');
  }

  function summaryForClaude() {
    const fmtD = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const lines = ['Spotter summary, ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), ''];
    lines.push('Joints: ' + JOINTS.map((j) => j.name + ' ' + (S.joints[j.id] || 'ok')).join(', '));
    const bans = Object.keys(S.bans).filter(banActive);
    lines.push('Avoiding: ' + (bans.length ? bans.map((id) => exInfo(id).name + ' (' + (S.bans[id].joint || S.bans[id].reason) + ')').join(', ') : 'nothing'));
    lines.push('', 'Pain log:');
    S.painLog.slice(-15).forEach((p) => lines.push('- ' + fmtD(p.at) + ': ' + p.joint + ', ' + p.severity + (p.ex ? ', during ' + exInfo(p.ex).name : '') + (p.note ? '. ' + p.note : '')));
    lines.push('', 'Last workouts:');
    S.history.slice(-6).forEach((h) => {
      lines.push('- ' + fmtD(h.date) + ' ' + (DAYS[h.day] ? DAYS[h.day].name : h.day) + ':');
      h.entries.forEach((en) => {
        const ex = exInfo(en.ex);
        lines.push('    ' + ex.name + ': ' + en.sets.map((s) => (ex.unit === 'lb' ? s.w + 'x' + s.r : s.r + (ex.unit === 'sec' ? 's' : ''))).join(', '));
      });
    });
    return lines.join('\n');
  }

  window.Engine = {
    get S() { return S; },
    setup, goal, schemeFor, order, itemFor, restFor, ownedDumbbells,
    save, EX, exInfo, e1rm, roundW, nudgeW, blockInfo, nextDayType, blockedBy, allowed, generate, avoidedFor,
    swapItem, swapOptions, swapTo, startWorkout, finishWorkout, reportPain, dislike, unban, volume, rangeStart,
    strengthSeries, liftSeries, setsByGroup, weekStart, liftsTrained, GROUPS, WEEKLY_TARGET, sessionsFor, bestE1rm,
    exportJSON, importJSON, importFitbod: importHistory, importHistory, exportCSV, rackList, recovery, logWeight, bodyweight, standings, exportForClaude, LEVELS, localKey, summaryForClaude, banActive, reset() { localStorage.removeItem(KEY); S = null; },
  };
})();
