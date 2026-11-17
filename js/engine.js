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
      joints, bans: {}, swaps: {}, painLog: [], custom: {}, notes: {}, rest: {}, steps: {}, rotIdx: 0,
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
    if (s.rotIdx === undefined) s.rotIdx = null;
    delete s.settings.order;
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
  function ownedDumbbells(ex) {
    return primaryEq(ex) === 'dumbbell' && S.settings.dumbbells ? S.settings.dumbbells : null;
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
    if (t === 'kettlebell') {
      let best = KETTLEBELLS[0];
      for (const k of KETTLEBELLS) if (Math.abs(k - w) < Math.abs(best - w)) best = k;
      return best;
    }
    const step = t === 'dumbbell' && w < 30 ? 2.5 : 5;
    let r = Math.round(w / step) * step;
    if (t === 'barbell') r = Math.max(45, r);
    return Math.max(step, r);
  }
  function stepFor(w, ex) {
    const t = primaryEq(ex);
    if (t === 'kettlebell') return null;
    return t === 'dumbbell' && w < 30 ? 2.5 : 5;
  }
  function nudgeW(w, ex, dir) {
    const t = primaryEq(ex);
    const own = ownedDumbbells(ex);
    if (own) {
      const i = own.indexOf(roundW(w, ex));
      return own[Math.min(own.length - 1, Math.max(0, i + dir))];
    }
    if (t === 'kettlebell') {
      const i = KETTLEBELLS.indexOf(roundW(w, ex));
      return KETTLEBELLS[Math.min(KETTLEBELLS.length - 1, Math.max(0, i + dir))];
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
      for (const en of h.entries) if (en.ex === id) out.push({ date: h.date, sets: en.sets.filter((s) => s.done) });
    }
    return out.filter((s) => s.sets.length);
  }
  function bestE1rm(sets) {
    let b = 0;
    for (const s of sets) b = Math.max(b, e1rm(s.w, s.r));
    return b;
  }

  // Suggest weight and reps for an exercise this session.
  function target(ex, scheme) {
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
    const n = circuit ? (S.settings.minutes >= 40 ? 4 : 3) : ex.kind === 'core' ? Math.min(3, scheme.sets) : scheme.sets;
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
      .map((it) => ({ ex: it.ex, sets: it.sets.filter((s) => s.done).map((s) => ({ w: s.w, r: s.r, tr: s.tr, done: true })) }))
      .filter((e) => e.sets.length);
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
    return new Date(now - { week: 7, month: 30, '6m': 182, year: 365 }[range] * DAY);
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
    S = s;
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
  function importFitbod(txt) {
    const rows = parseCSV(txt);
    if (rows.length < 2) throw new Error('That file has no rows.');
    const head = rows[0].map((h) => h.trim().toLowerCase());
    const col = (re) => head.findIndex((h) => re.test(h));
    const cDate = col(/^date/), cEx = col(/exercise/), cReps = col(/^reps/), cW = col(/weight/), cWarm = col(/warm/), cDur = col(/duration/);
    if (cDate < 0 || cEx < 0) throw new Error('Couldn’t find Date and Exercise columns. Is this the Fitbod export?');
    const kg = cW >= 0 && /kg/.test(head[cW]);
    const byDay = {};
    let unknown = {};
    for (const r of rows.slice(1)) {
      if (cWarm >= 0 && /true|1|yes/i.test(r[cWarm] || '')) continue;
      const d = new Date(r[cDate]);
      if (isNaN(d)) continue;
      const name = (r[cEx] || '').trim();
      let id = FITBOD_MAP[norm(name)];
      if (!id) {
        id = 'fb_' + norm(name);
        if (!S.custom[id]) S.custom[id] = { id, name, group: 'Other', eq: [], kind: 'mid', unit: 'lb', stress: {} };
        unknown[name] = 1;
      }
      let w = cW >= 0 ? parseFloat(r[cW]) || 0 : 0;
      if (kg) w = Math.round(w * 2.20462 * 2) / 2;
      let reps = cReps >= 0 ? parseInt(r[cReps]) || 0 : 0;
      const ex = exInfo(id);
      if (ex.unit === 'sec' && cDur >= 0) reps = parseInt(r[cDur]) || reps;
      if (!reps) continue;
      if (S.custom[id] && w === 0) S.custom[id].unit = 'bw';
      const key = d.toISOString().slice(0, 10);
      byDay[key] = byDay[key] || { date: d.toISOString(), entries: {} };
      if (d < new Date(byDay[key].date)) byDay[key].date = d.toISOString();
      (byDay[key].entries[id] = byDay[key].entries[id] || []).push({ w, r: reps, done: true });
    }
    const existing = new Set(S.history.map((h) => h.date.slice(0, 10)));
    let added = 0;
    for (const k of Object.keys(byDay)) {
      if (existing.has(k)) continue;
      const v = byDay[k];
      const entries = Object.keys(v.entries).map((ex) => ({ ex, sets: v.entries[ex] }));
      const groups = entries.map((e) => exInfo(e.ex).group);
      const score = { push: 0, pull: 0, legs: 0 };
      groups.forEach((g) => {
        if (['Chest', 'Shoulders', 'Triceps'].includes(g)) score.push++;
        else if (['Back', 'Biceps'].includes(g)) score.pull++;
        else if (['Quads', 'Hamstrings', 'Glutes', 'Calves'].includes(g)) score.legs++;
      });
      const day = Object.keys(score).sort((a, b) => score[b] - score[a])[0];
      S.history.push({ id: 'fb' + k, date: v.date, day, minutes: null, source: 'fitbod', entries });
      added++;
    }
    S.history.sort((a, b) => new Date(a.date) - new Date(b.date));
    save();
    return { added, unknown: Object.keys(unknown) };
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
    exportJSON, importJSON, importFitbod, summaryForClaude, banActive, reset() { S = freshState(); save(); },
  };
})();
