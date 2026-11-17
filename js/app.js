// Spotter UI
(function () {
  const E = Engine;
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app'), tabsEl = $('#tabs'), timerEl = $('#timer'), overlay = $('#overlay');
  const ui = { tab: 'today', plan: null, planDay: null, range: 'month', openLog: null };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtW = (w) => (Math.round(w * 10) / 10).toString();
  const fmtDate = (d, o) => new Date(d).toLocaleDateString('en-US', o || { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }

  function setLine(ex, it) {
    const s = it.sets[0];
    const n = it.sets.length;
    if (ex.unit === 'lb') return n + ' sets of ' + s.r + ' at ' + fmtW(s.w) + ' lb';
    if (ex.unit === 'sec') return n + ' holds of ' + s.r + ' sec';
    return n + ' sets of ' + s.r + ' reps';
  }

  // ---------------- tabs ----------------
  const ICONS = {
    today: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>',
    log: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
    progress: '<svg viewBox="0 0 24 24"><path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/></svg>',
    body: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M12 8v6M8 10l4-1 4 1M10 21l2-7 2 7"/></svg>',
  };
  const TAB_NAMES = { today: 'Workout', log: 'Log', progress: 'Progress', body: 'Body' };
  function renderTabs() {
    tabsEl.innerHTML = Object.keys(TAB_NAMES)
      .map((k) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-act="tab" data-k="${k}">${ICONS[k]}${TAB_NAMES[k]}</button>`)
      .join('');
  }

  function render() {
    renderTabs();
    app.classList.toggle('has-timer', !!E.S.timer);
    if (ui.tab === 'today') E.S.current ? renderSession() : renderPreview();
    else if (ui.tab === 'log') renderLog();
    else if (ui.tab === 'progress') renderProgress();
    else renderBody();
    renderTimer();
  }

  // ---------------- today: preview ----------------
  function ensurePlan() {
    const day = ui.planDay || E.nextDayType();
    if (!ui.plan || ui.plan.day !== day) ui.plan = E.generate(day);
    return ui.plan;
  }
  function blockBar(week) {
    return `<div class="blockbar">${WEEKS.map((w, i) => `<i class="${i < week ? 'past' : i === week ? 'now' : ''}"></i>`).join('')}</div>
      <div class="blocklabels">${WEEKS.map((w, i) => `<span class="${i === week ? 'now' : ''}">${w.name}</span>`).join('')}</div>`;
  }
  function avoidNote(day) {
    const av = E.avoidedFor(day);
    if (!av.length) return '';
    const names = av.slice(0, 6).map((a) => a.ex.name.toLowerCase());
    const joints = [...new Set(av.map((a) => (a.why.startsWith('joint:') ? a.why.slice(6) : null)).filter(Boolean))];
    const jn = joints.map((j) => JOINTS.find((x) => x.id === j).name.toLowerCase());
    return `<div class="avoid"><b>Protecting your ${jn.length ? jn.join(' and ') : 'joints'}.</b> Skipping ${esc(names.join(', '))}${av.length > 6 ? ' and more' : ''}.</div>`;
  }
  function renderPreview() {
    const plan = ensurePlan();
    const day = DAYS[plan.day];
    app.innerHTML = `
      <div class="top"><div>
        <div class="kicker">${fmtDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1>${esc(day.name)}</h1>
      </div></div>
      <div class="sub">Block ${plan.block + 1}, week ${plan.week + 1} of 4. About ${plan.estMin} min, ${plan.items.length} exercises.</div>
      ${blockBar(plan.week)}
      ${avoidNote(plan.day)}
      <div class="chips" style="margin-top:16px">
        ${Object.keys(DAYS).map((k) => `<button class="chip ${plan.day === k ? 'on' : ''}" data-act="pickday" data-k="${k}">${DAYS[k].name}</button>`).join('')}
      </div>
      ${plan.items.map((it, i) => previewCard(it, i)).join('')}
      <button class="btn-main" data-act="start">Start workout</button>
    `;
  }
  function previewCard(it, i) {
    const ex = E.exInfo(it.ex);
    return `<div class="ex"><div class="ex-head">
      <div class="ex-main"><div class="ex-name">${esc(ex.name)}</div>
      <div class="ex-meta">${setLine(ex, it)}${it.first ? ' <span class="first">New lift: start light</span>' : ''}</div></div>
      <button class="ex-more" data-act="exmenu" data-i="${i}" aria-label="Options for ${esc(ex.name)}">⋯</button>
    </div></div>`;
  }

  // ---------------- today: session ----------------
  function renderSession() {
    const c = E.S.current;
    const day = DAYS[c.day];
    const allDone = c.items.every((it) => it.sets.every((s) => s.done));
    app.innerHTML = `
      <div class="top"><div>
        <div class="kicker">${WEEKS[c.week].name} week</div>
        <h1>${esc(day.name)}</h1>
      </div><div class="elapsed" id="elapsed">${mmss((Date.now() - new Date(c.startedAt)) / 1000)}</div></div>
      ${c.items.map((it, i) => sessionCard(it, i)).join('')}
      <button class="btn-quiet" data-act="addex">Add an exercise</button>
      <button class="${allDone ? 'btn-main' : 'btn-quiet'}" data-act="finish">Finish workout</button>
      <button class="btn-quiet btn-danger" data-act="discard">Discard workout</button>
    `;
  }
  function sessionCard(it, i) {
    const ex = E.exInfo(it.ex);
    const done = it.sets.every((s) => s.done);
    const nDone = it.sets.filter((s) => s.done).length;
    const open = !done || it.open;
    const unitLabel = ex.unit === 'sec' ? 'sec' : 'reps';
    return `<div class="ex ${done ? 'done' : ''}" data-i="${i}">
      <div class="ex-head">
        <span class="tick"></span>
        <button class="ex-main" style="text-align:left" data-act="toggleex" data-i="${i}">
          <div class="ex-name">${esc(ex.name)}</div>
          <div class="ex-meta">${nDone} of ${it.sets.length} sets, ${mmss(it.rest)} rest${it.first && !nDone ? ' <span class="first">New: start light</span>' : ''}</div>
        </button>
        <button class="ex-more" data-act="exmenu" data-i="${i}" aria-label="Options for ${esc(ex.name)}">⋯</button>
      </div>
      ${open ? `<div class="sets">
        <div class="set set-head"><span></span><span>${ex.unit === 'lb' ? 'lb' : ''}</span><span>${unitLabel}</span><span></span></div>
        ${it.sets.map((s, j) => `<div class="set ${s.done ? 'done' : ''}">
          <div class="set-n">${j + 1}</div>
          ${ex.unit === 'lb' ? `<div class="field"><button data-act="w" data-i="${i}" data-j="${j}" data-d="-1" aria-label="Less weight">−</button><input inputmode="decimal" data-f="w" data-i="${i}" data-j="${j}" value="${fmtW(s.w)}" aria-label="Weight"><button data-act="w" data-i="${i}" data-j="${j}" data-d="1" aria-label="More weight">+</button></div>` : `<div class="field" style="justify-content:center;color:var(--dim);font-size:14px;font-weight:600">Bodyweight</div>`}
          <div class="field"><button data-act="r" data-i="${i}" data-j="${j}" data-d="-1" aria-label="Fewer ${unitLabel}">−</button><input inputmode="numeric" data-f="r" data-i="${i}" data-j="${j}" value="${s.r}" aria-label="${unitLabel}"><button data-act="r" data-i="${i}" data-j="${j}" data-d="1" aria-label="More ${unitLabel}">+</button></div>
          <button class="check" data-act="check" data-i="${i}" data-j="${j}" aria-label="${s.done ? 'Undo set' : 'Finish set'}">${CHECK}</button>
        </div>`).join('')}
        <div class="set-actions"><button class="ghost" data-act="addset" data-i="${i}">Add set</button>${it.sets.length > 1 ? `<button class="ghost" data-act="rmset" data-i="${i}">Remove set</button>` : ''}</div>
      </div>` : ''}
    </div>`;
  }

  // ---------------- timer ----------------
  let audioCtx = null;
  function unlockAudio() {
    if (audioCtx) return;
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const b = audioCtx.createBuffer(1, 1, 22050);
      const src = audioCtx.createBufferSource();
      src.buffer = b; src.connect(audioCtx.destination); src.start(0);
    } catch (e) {}
  }
  function beep() {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    [0, 0.22, 0.44].forEach((t, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = i === 2 ? 1320 : 880;
      o.connect(g); g.connect(audioCtx.destination);
      const at = audioCtx.currentTime + t;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      o.start(at); o.stop(at + 0.2);
    });
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  function startTimer(secs, label) {
    E.S.timer = { endsAt: Date.now() + secs * 1000, total: secs, label, beeped: false };
    E.save();
    renderTimer();
    app.classList.add('has-timer');
  }
  function stopTimer() {
    E.S.timer = null;
    E.save();
    timerEl.innerHTML = '';
    app.classList.remove('has-timer');
  }
  const PLATES = 14;
  function renderTimer() {
    const t = E.S.timer;
    if (!t) { timerEl.innerHTML = ''; return; }
    timerEl.innerHTML = `<div class="timer" id="tdock">
      <div class="stack" id="tstack">${Array.from({ length: PLATES }, () => '<div class="plate"></div>').join('')}</div>
      <div class="timer-body">
        <div class="timer-top"><span class="timer-label" id="tlabel"></span></div>
        <div class="timer-time" id="ttime">0:00</div>
        <div class="timer-btns"><button data-act="t-" aria-label="15 seconds less">−15</button><button data-act="t+" aria-label="15 seconds more">+15</button><button class="skip" data-act="tskip">Skip</button></div>
      </div></div>`;
    tick();
  }
  function tick() {
    const c = E.S.current;
    const el = $('#elapsed');
    if (c && el) el.textContent = mmss((Date.now() - new Date(c.startedAt)) / 1000);
    const t = E.S.timer;
    if (!t) return;
    const left = (t.endsAt - Date.now()) / 1000;
    const dock = $('#tdock');
    if (!dock) return;
    const over = left <= 0;
    dock.classList.toggle('over', over);
    $('#ttime').textContent = over ? 'Go' : mmss(left);
    $('#tlabel').textContent = over ? 'Rest is over. Next set.' : 'Rest. Next: ' + t.label;
    const frac = Math.max(0, Math.min(1, left / t.total));
    const lit = Math.ceil(frac * PLATES);
    const plates = $('#tstack').children;
    for (let i = 0; i < PLATES; i++) {
      const fromBottom = PLATES - 1 - i;
      plates[i].className = 'plate' + (fromBottom < lit ? (fromBottom === lit - 1 ? ' pin' : ' lit') : '');
    }
    if (over && !t.beeped) { t.beeped = true; E.save(); beep(); }
    if (left < -45) stopTimer();
  }
  setInterval(tick, 250);

  // keep the screen awake during a workout
  let wakeLock = null;
  async function keepAwake() {
    if (!E.S.current || !('wakeLock' in navigator)) return;
    try { if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => (wakeLock = null)); } } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { keepAwake(); tick(); } });

  // ---------------- sheets ----------------
  function sheet(html) {
    overlay.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  }
  function closeSheet() { overlay.innerHTML = ''; }
  function curPlan() { return E.S.current || ensurePlan(); }

  function exMenu(i) {
    const plan = curPlan();
    const ex = E.exInfo(plan.items[i].ex);
    sheet(`<h3>${esc(ex.name)}</h3><p>${esc(ex.group)}</p>
      <button class="row-btn hurt" data-act="painsheet" data-i="${i}"><span class="ic">!</span><span>Something hurts<small>Log it, swap this out and protect the joint</small></span></button>
      <button class="row-btn" data-act="swapsheet" data-i="${i}"><span class="ic">⇄</span><span>Swap exercise<small>Pick another for the same muscles</small></span></button>
      <button class="row-btn" data-act="dislike" data-i="${i}"><span class="ic">✕</span><span>I don’t like this one<small>Never suggest it again</small></span></button>
      <button class="row-btn" data-act="rmex" data-i="${i}"><span class="ic">−</span><span>Skip it today</span></button>`);
  }
  function swapSheet(i) {
    const plan = curPlan();
    const opts = E.swapOptions(plan, i);
    sheet(`<h3>Swap for</h3>
      ${opts.length ? opts.map((o) => `<button class="row-btn" data-act="swapto" data-i="${i}" data-ex="${o.id}"><span>${esc(o.name)}<small>${esc(o.group)}</small></span></button>`).join('') : '<p>No other options fit your equipment and joints for this slot.</p>'}`);
  }
  const pain = { joint: null, sev: null };
  function painSheet(i) {
    const plan = i == null ? null : curPlan();
    const ex = plan ? E.exInfo(plan.items[i].ex) : null;
    pain.joint = null; pain.sev = null; pain.i = i;
    sheet(`<h3>${ex ? 'What hurts on ' + esc(ex.name.toLowerCase()) + '?' : 'Log pain'}</h3>
      <p>Where is it?</p>
      <div class="opt-grid" id="pjoint">${JOINTS.map((j) => `<button class="opt" data-act="pj" data-k="${j.id}">${j.name}</button>`).join('')}<button class="opt" data-act="pj" data-k="other">Somewhere else</button></div>
      <p>How bad?</p>
      <div class="opt-grid" id="psev" style="grid-template-columns:repeat(3,1fr)">
        <button class="opt" data-act="ps" data-k="twinge">Twinge</button><button class="opt" data-act="ps" data-k="hurts">Hurts</button><button class="opt" data-act="ps" data-k="sharp">Sharp</button></div>
      <div id="ptip"></div>
      <textarea id="pnote" placeholder="Anything else? Where exactly, what movement (optional)"></textarea>
      <button class="btn-main" data-act="painsave">${ex ? 'Log it and swap' : 'Log it'}</button>`);
  }
  function addExSheet() {
    const c = E.S.current;
    const used = c.items.map((x) => x.ex);
    const list = EXERCISES.filter((e) => E.allowed(e) && !used.includes(e.id));
    const groups = {};
    list.forEach((e) => (groups[e.group] = groups[e.group] || []).push(e));
    sheet(`<h3>Add an exercise</h3>${Object.keys(groups).map((g) => `<p style="margin:14px 0 2px;font-weight:600;color:var(--ink)">${g}</p>${groups[g].map((e) => `<button class="row-btn" data-act="addexpick" data-ex="${e.id}"><span>${esc(e.name)}</span></button>`).join('')}`).join('')}`);
  }
  function liftSheet(id) {
    const ex = E.exInfo(id);
    const series = E.liftSeries(id);
    const best = Math.max(...series.map((p) => p.v));
    const label = ex.unit === 'lb' ? 'Est. 1-rep max' : ex.unit === 'sec' ? 'Longest hold' : 'Best set';
    sheet(`<h3>${esc(ex.name)}</h3>
      <p>${label}: ${Math.round(best)} ${ex.unit === 'lb' ? 'lb' : ex.unit === 'sec' ? 'sec' : 'reps'} best</p>
      ${series.length > 1 ? lineChart(series, { h: 170 }) : '<div class="empty">Do this one again to start its chart.</div>'}
      <div style="margin-top:10px">${series.slice().reverse().slice(0, 12).map((p) => `<div class="log-ex" style="margin:0;padding:8px 0"><div><span>${fmtDate(p.date)}</span><span>${ex.unit === 'lb' ? fmtW(p.top.w) + ' lb × ' + p.top.r : p.top.r + (ex.unit === 'sec' ? ' sec' : ' reps')}${ex.unit === 'lb' ? ', est. max ' + Math.round(p.v) : ''}</span></div></div>`).join('')}</div>`);
  }

  // ---------------- log ----------------
  function renderLog() {
    const H = E.S.history.slice().reverse();
    app.innerHTML = `<div class="top"><div><div class="kicker">${E.S.history.length} workouts</div><h1>Log</h1></div></div>
      ${H.length ? H.map(logCard).join('') : '<div class="empty">Finished workouts show up here.</div>'}`;
  }
  function logCard(h) {
    const day = DAYS[h.day];
    const sets = h.entries.reduce((a, e) => a + e.sets.length, 0);
    const open = ui.openLog === h.id;
    return `<div class="card" data-act="openlog" data-id="${h.id}">
      <div class="log-date"><span>${fmtDate(h.date)}, ${fmtTime(h.date)}</span><span>${h.minutes ? h.minutes + ' min' : ''}</span></div>
      <div class="log-title">${esc(day ? day.name : h.day)}</div>
      <div class="stats3"><div class="stat"><div class="v">${h.entries.length}</div><div class="k">Exercises</div></div>
        <div class="stat"><div class="v">${sets}</div><div class="k">Sets</div></div>
        <div class="stat"><div class="v">${E.volume(h).toLocaleString()}</div><div class="k">Pounds lifted</div></div></div>
      ${h.records && h.records.length ? `<div class="rec">${h.records.length} new record${h.records.length > 1 ? 's' : ''}</div>` : ''}
      ${open ? `<div class="log-ex">${h.entries.map((en) => { const ex = E.exInfo(en.ex); return `<div><span>${esc(ex.name)}</span><span>${en.sets.map((s) => (ex.unit === 'lb' ? fmtW(s.w) + '×' + s.r : s.r + (ex.unit === 'sec' ? 's' : ''))).join(', ')}</span></div>`; }).join('')}
        ${(h.records || []).map((r) => `<div class="rec">${esc(E.exInfo(r.ex).name)}: ${esc(r.what)} ${esc(r.val)}</div>`).join('')}
        <button class="btn-quiet btn-danger" data-act="dellog" data-id="${h.id}" style="margin-top:12px">Delete this workout</button></div>` : ''}
    </div>`;
  }

  // ---------------- progress ----------------
  function lineChart(pts, o) {
    o = o || {};
    const W = 340, H = o.h || 160, pl = 6, pr = 34, pt = 10, pb = 22;
    const xs = pts.map((p) => +p.date), ys = pts.map((p) => p.v);
    let x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (x1 === x0) { x0 -= 86400000; x1 += 86400000; }
    let y0 = Math.min(...ys), y1 = Math.max(...ys);
    const pad = Math.max((y1 - y0) * 0.15, y1 * 0.03, 1);
    y0 -= pad; y1 += pad;
    const X = (x) => pl + ((x - x0) / (x1 - x0)) * (W - pl - pr);
    const Y = (y) => pt + (1 - (y - y0) / (y1 - y0)) * (H - pt - pb);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + X(+p.date).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
    const area = d + ` L${X(x1).toFixed(1)} ${H - pb} L${X(x0).toFixed(1)} ${H - pb} Z`;
    const ticks = [0, 0.5, 1].map((f) => y0 + (y1 - y0) * f);
    const xt = [x0, (x0 + x1) / 2, x1];
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chart">
      <defs><linearGradient id="fillgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc53d" stop-opacity="0.22"/><stop offset="1" stop-color="#ffc53d" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map((t) => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis" x="${W - pr + 6}" y="${Y(t) + 4}">${Math.round(t)}</text>`).join('')}
      ${xt.map((t, i) => `<text class="axis" x="${X(t)}" y="${H - 4}" text-anchor="${['start', 'middle', 'end'][i]}">${fmtDate(t, { month: 'short', day: 'numeric' })}</text>`).join('')}
      <path class="area" d="${area}"/><path class="line" d="${d}"/>
      ${pts.length < 40 ? pts.map((p) => `<circle class="dot" cx="${X(+p.date)}" cy="${Y(p.v)}" r="3.5"/>`).join('') : ''}
    </svg>`;
  }
  function spark(pts) {
    if (pts.length < 2) return '<svg class="spark"></svg>';
    const ys = pts.map((p) => p.v), y0 = Math.min(...ys), y1 = Math.max(...ys) || 1;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + ((i / (pts.length - 1)) * 68 + 1).toFixed(1) + ' ' + (26 - ((p.v - y0) / (y1 - y0 || 1)) * 24).toFixed(1)).join(' ');
    return `<svg class="spark" viewBox="0 0 70 28"><path d="${d}"/></svg>`;
  }
  function renderProgress() {
    const since = E.rangeStart(ui.range);
    const all = E.strengthSeries();
    const inRange = all.filter((p) => p.date >= since);
    const baseIdx = all.filter((p) => p.date < since).pop();
    const shown = baseIdx ? [baseIdx].concat(inRange) : inRange;
    const cur = all.length ? all[all.length - 1].v : null;
    const delta = shown.length > 1 ? shown[shown.length - 1].v - shown[0].v : null;
    const groups = E.GROUPS.map((g) => ({ g, s: E.strengthSeries([g]) })).filter((x) => x.s.length);
    const week = E.setsByGroup(E.weekStart());
    const lifts = E.liftsTrained()
      .map((id) => ({ id, ex: E.exInfo(id), s: E.liftSeries(id) }))
      .filter((l) => l.s.some((p) => p.date >= since))
      .sort((a, b) => b.s.length - a.s.length || a.ex.name.localeCompare(b.ex.name));

    app.innerHTML = `<div class="top"><div><div class="kicker">Strength vs. where you started</div><h1>Progress</h1></div></div>
      <div class="seg">${[['week', 'Week'], ['month', 'Month'], ['6m', '6 months'], ['year', 'Year']].map(([k, n]) => `<button class="${ui.range === k ? 'on' : ''}" data-act="range" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="card">
        ${cur != null ? `<div class="big-num">${Math.round(cur)}<small>strength index</small></div>
          <div class="sub">${delta != null ? `<span class="${delta >= 0 ? 'delta-up' : 'delta-down'}">${delta >= 0 ? 'Up' : 'Down'} ${Math.abs(delta).toFixed(1)}</span> this ${{ week: 'week', month: 'month', '6m': '6 months', year: 'year' }[ui.range]}. 100 is where each lift started.` : '100 is where each lift started.'}</div>
          ${shown.length > 1 ? lineChart(shown) : '<div class="empty">Not enough workouts in this range for a chart yet.</div>'}`
        : `<div class="big-num">100<small>strength index</small></div><div class="empty">Your chart starts once you repeat a lift. Each lift starts at 100, and the number climbs as your estimated max goes up. You can also bring in your Fitbod history from the Body tab.</div>`}
      </div>
      ${groups.length ? `<h2>By muscle</h2><div class="card">${groups.map((x) => { const last = x.s[x.s.length - 1].v; return `<div class="lift"><div class="nm">${x.g}</div>${spark(x.s.slice(-8))}<div class="val">${Math.round(last)}</div></div>`; }).join('')}</div>` : ''}
      <h2>Sets this week</h2>
      <div class="card bars">${E.GROUPS.map((g) => { const n = week[g], t = E.WEEKLY_TARGET[g]; return `<div class="b"><span>${g}</span><div class="track"><div class="fill ${n >= t ? 'met' : ''}" style="width:${Math.min(100, (n / t) * 100)}%"></div></div><span class="n">${n} / ${t}</span></div>`; }).join('')}</div>
      <h2>Lifts</h2>
      <div class="card">${lifts.length ? lifts.map((l) => { const last = l.s[l.s.length - 1]; const first = l.s[0]; const d = last.v - first.v; return `<button class="lift" data-act="lift" data-id="${l.id}"><div class="nm">${esc(l.ex.name)}<small>${l.s.length} session${l.s.length > 1 ? 's' : ''}${l.s.length > 1 && d ? `, <span class="${d > 0 ? 'delta-up' : 'delta-down'}">${d > 0 ? '+' : ''}${Math.round(d)}</span>` : ''}</small></div>${spark(l.s)}<div class="val">${Math.round(last.v)}<small style="color:var(--muted)">${l.ex.unit === 'lb' ? 'est. max' : l.ex.unit === 'sec' ? 'sec' : 'reps'}</small></div></button>`; }).join('') : '<div class="empty">No lifts in this range.</div>'}</div>`;
  }

  // ---------------- body ----------------
  function renderBody() {
    const S = E.S;
    const bans = Object.keys(S.bans).filter(E.banActive);
    const sore = JOINTS.filter((j) => S.joints[j.id] !== 'ok');
    app.innerHTML = `<div class="top"><div><div class="kicker">Joints, pain and setup</div><h1>Body</h1></div></div>
      <div class="card">${JOINTS.map((j) => { const st = S.joints[j.id] || 'ok'; return `<div class="joint"><span class="nm">${j.name}</span><div class="tri">${['ok', 'sore', 'injured'].map((k) => `<button class="${k} ${st === k ? 'on' : ''}" data-act="joint" data-j="${j.id}" data-k="${k}">${{ ok: 'Fine', sore: 'Sore', injured: 'Injured' }[k]}</button>`).join('')}</div></div>`; }).join('')}</div>
      <div class="sub" style="margin:2px 4px 0">Sore skips the hardest moves for that joint. Injured skips anything that loads it.</div>
      ${sore.map((j) => `<div class="tip"><b style="color:var(--ink)">${j.name}.</b> ${esc(JOINT_TIPS[j.id])}</div>`).join('')}
      <button class="btn-quiet" data-act="painsheet">Log pain</button>

      <h2>Avoiding</h2>
      <div class="card">${bans.length ? bans.map((id) => { const b = S.bans[id]; return `<div class="ban"><div>${esc(E.exInfo(id).name)}<small>${esc(b.note || '')}${b.until ? ' Back on ' + fmtDate(b.until, { month: 'short', day: 'numeric' }) + '.' : ''}</small></div><button data-act="unban" data-id="${id}">Allow again</button></div>`; }).join('') : '<div class="empty">Nothing. Tap ⋯ on an exercise to drop it.</div>'}</div>

      <h2>Pain log</h2>
      <div class="card">${S.painLog.length ? S.painLog.slice().reverse().slice(0, 12).map((p) => `<div class="pain"><b>${fmtDate(p.at, { month: 'short', day: 'numeric' })}: ${esc((JOINTS.find((j) => j.id === p.joint) || { name: 'Other' }).name)}, ${esc(p.severity)}</b>${p.ex ? ` <span>on ${esc(E.exInfo(p.ex).name.toLowerCase())}</span>` : ''}${p.note ? `<br><span>${esc(p.note)}</span>` : ''}</div>`).join('') : '<div class="empty">No pain logged.</div>'}</div>

      <h2>Talk it through</h2>
      <div class="card"><div class="sub" style="color:#c9d0d7">Copy a summary of your joints, pain log and last workouts, then paste it to Claude. Claude can work out what’s causing it and update the app.</div>
        <button class="btn-main" data-act="copysum" style="margin-top:12px;height:52px;font-size:21px">Copy summary for Claude</button></div>

      <h2>Workout length</h2>
      <div class="chips">${[45, 60, 75, 90].map((m) => `<button class="chip ${S.settings.minutes === m ? 'on' : ''}" data-act="mins" data-k="${m}">${m} min</button>`).join('')}</div>

      <h2>Your gym</h2>
      <div class="card">${EQUIPMENT.map((e) => `<div class="toggle"><span>${esc(e.name)}</span><button class="sw ${S.settings.equipment[e.id] ? 'on' : ''}" data-act="eq" data-k="${e.id}" role="switch" aria-checked="${!!S.settings.equipment[e.id]}" aria-label="${esc(e.name)}"></button></div>`).join('')}</div>

      <h2>Your data</h2>
      <div class="sub">Everything is saved on this phone only. Back it up now and then.</div>
      <button class="btn-quiet" data-act="export">Save a backup</button>
      <button class="btn-quiet" data-act="importbk">Restore a backup</button>
      <button class="btn-quiet" data-act="importfb">Bring in Fitbod history (CSV)</button>
      <button class="btn-quiet btn-danger" data-act="reset">Erase everything</button>
      <input type="file" id="filebk" accept=".json,application/json" hidden>
      <input type="file" id="filefb" accept=".csv,text/csv" hidden>
      <div class="sub" style="margin:22px 4px 0;color:var(--dim)">Spotter v1</div>`;
  }

  // ---------------- actions ----------------
  function updateSet(i, j, field, val) {
    const c = E.S.current;
    if (!c) return;
    const s = c.items[i].sets[j];
    s[field] = val;
    // carry new weight/reps to later unfinished sets
    for (let k = j + 1; k < c.items[i].sets.length; k++) if (!c.items[i].sets[k].done) c.items[i].sets[k][field] = val;
    E.save();
  }
  function nextLabel(c, i, j) {
    const it = c.items[i];
    const nj = it.sets.findIndex((s, k) => k > j && !s.done);
    if (nj >= 0) return E.exInfo(it.ex).name + ', set ' + (nj + 1);
    const ni = c.items.findIndex((x, k) => k > i && x.sets.some((s) => !s.done));
    if (ni >= 0) return E.exInfo(c.items[ni].ex).name;
    const anyLeft = c.items.findIndex((x) => x.sets.some((s) => !s.done));
    return anyLeft >= 0 ? E.exInfo(c.items[anyLeft].ex).name : 'Finish workout';
  }

  document.addEventListener('click', (ev) => {
    unlockAudio();
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'close' && ev.target !== el) return; // clicks inside the sheet
    const i = el.dataset.i != null ? +el.dataset.i : null;
    const j = el.dataset.j != null ? +el.dataset.j : null;
    const c = E.S.current;
    switch (act) {
      case 'tab': ui.tab = el.dataset.k; render(); window.scrollTo(0, 0); break;
      case 'close': closeSheet(); break;
      case 'pickday': ui.planDay = el.dataset.k; ui.plan = null; render(); break;
      case 'start': E.startWorkout(ensurePlan()); ui.plan = null; ui.planDay = null; keepAwake(); render(); window.scrollTo(0, 0); break;
      case 'toggleex': { const it = c.items[i]; it.open = !it.open; render(); break; }
      case 'w': case 'r': {
        const it = c.items[i], s = it.sets[j], ex = E.exInfo(it.ex), d = +el.dataset.d;
        const val = act === 'w' ? E.nudgeW(s.w, ex, d) : Math.max(0, s.r + d * (ex.unit === 'sec' ? 5 : 1));
        updateSet(i, j, act, val); render(); break;
      }
      case 'check': {
        const it = c.items[i], s = it.sets[j];
        s.done = !s.done;
        E.save();
        if (s.done) {
          const ex = E.exInfo(it.ex);
          const allDone = c.items.every((x) => x.sets.every((y) => y.done));
          if (!allDone) startTimer(it.rest, nextLabel(c, i, j)); else stopTimer();
          if (it.sets.every((y) => y.done)) it.open = false;
        }
        render();
        if (s.done && c.items[i].sets.every((y) => y.done)) {
          const next = document.querySelector(`.ex[data-i="${i + 1}"]`);
          if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        break;
      }
      case 'addset': { const it = c.items[i]; const last = it.sets[it.sets.length - 1]; it.sets.push({ w: last.w, r: last.r, tr: last.tr, done: false }); it.open = true; E.save(); render(); break; }
      case 'rmset': { const it = c.items[i]; const k = it.sets.map((s) => s.done).lastIndexOf(false); it.sets.splice(k >= 0 ? k : it.sets.length - 1, 1); E.save(); render(); break; }
      case 't-': E.S.timer.endsAt -= 15000; E.S.timer.total = Math.max(15, E.S.timer.total - 15); E.save(); tick(); break;
      case 't+': if (E.S.timer.endsAt < Date.now()) { E.S.timer.endsAt = Date.now(); E.S.timer.beeped = false; } E.S.timer.endsAt += 15000; E.S.timer.total += 15; E.save(); tick(); break;
      case 'tskip': stopTimer(); break;
      case 'exmenu': exMenu(i); break;
      case 'swapsheet': swapSheet(i); break;
      case 'swapto': { const plan = curPlan(); E.swapTo(plan, i, el.dataset.ex); E.save(); closeSheet(); render(); toast('Swapped to ' + E.exInfo(el.dataset.ex).name.toLowerCase() + ' for this block'); break; }
      case 'dislike': {
        const plan = curPlan(); const id = plan.items[i].ex; E.dislike(id);
        const opts = E.swapOptions(plan, i);
        if (opts.length) E.swapTo(plan, i, opts[0].id); else plan.items.splice(i, 1);
        E.save(); closeSheet(); render(); toast('Got it. ' + E.exInfo(id).name + ' won’t come up again'); break;
      }
      case 'rmex': { const plan = curPlan(); plan.items.splice(i, 1); E.save(); closeSheet(); render(); break; }
      case 'painsheet': painSheet(i); break;
      case 'pj': pain.joint = el.dataset.k; document.querySelectorAll('#pjoint .opt').forEach((b) => b.classList.toggle('on', b === el)); $('#ptip').innerHTML = JOINT_TIPS[pain.joint] ? `<div class="tip">${esc(JOINT_TIPS[pain.joint])}</div>` : ''; break;
      case 'ps': pain.sev = el.dataset.k; document.querySelectorAll('#psev .opt').forEach((b) => b.classList.toggle('on', b === el)); break;
      case 'painsave': {
        if (!pain.joint || !pain.sev) { toast('Pick where and how bad'); break; }
        const note = $('#pnote').value.trim();
        if (pain.i != null) {
          const plan = curPlan(); const id = plan.items[pain.i].ex;
          E.reportPain(id, pain.joint, pain.sev, note);
          // re-plan this slot with the new rules
          const opts = E.swapOptions(plan, pain.i);
          if (opts.length) E.swapTo(plan, pain.i, opts[0].id); else if (!plan.items[pain.i].sets.some((s) => s.done)) plan.items.splice(pain.i, 1);
          if (!E.S.current) ui.plan = null;
          E.save(); closeSheet(); render();
          toast(opts.length ? 'Logged. Swapped to ' + opts[0].name.toLowerCase() : 'Logged and removed');
        } else { E.reportPain(null, pain.joint, pain.sev, note); closeSheet(); render(); toast('Logged'); }
        break;
      }
      case 'addex': addExSheet(); break;
      case 'addexpick': {
        const ex = E.EX[el.dataset.ex]; const sch = WEEKS[c.week];
        const t = { slot: -1, ex: ex.id, rest: REST[ex.kind], sets: [] };
        const n = ex.kind === 'core' ? 3 : sch.sets;
        const w = lastWeight(ex.id) || ex.start;
        for (let k = 0; k < n; k++) t.sets.push({ w: ex.unit === 'lb' ? w : 0, r: ex.unit === 'lb' ? sch.reps[ex.kind] : (ex.start || 10), tr: sch.reps[ex.kind], done: false });
        c.items.push(t); E.save(); closeSheet(); render(); break;
      }
      case 'finish': {
        const anyDone = c.items.some((it) => it.sets.some((s) => s.done));
        if (!anyDone) { toast('Check off at least one set first'); break; }
        const rec = E.finishWorkout(); stopTimer();
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
        ui.tab = 'log'; ui.openLog = rec && rec.id; render(); window.scrollTo(0, 0);
        toast(rec && rec.records.length ? 'Saved. ' + rec.records.length + ' new record' + (rec.records.length > 1 ? 's' : '') + '!' : 'Workout saved');
        break;
      }
      case 'discard': if (confirm('Discard this workout? Nothing will be saved.')) { E.S.current = null; stopTimer(); E.save(); render(); } break;
      case 'openlog': if (ev.target.closest('[data-act="dellog"]')) break; ui.openLog = ui.openLog === el.dataset.id ? null : el.dataset.id; render(); break;
      case 'dellog': ev.stopPropagation(); if (confirm('Delete this workout from your log?')) { E.S.history = E.S.history.filter((h) => h.id !== el.dataset.id); E.save(); render(); } break;
      case 'range': ui.range = el.dataset.k; render(); break;
      case 'lift': liftSheet(el.dataset.id); break;
      case 'joint': E.S.joints[el.dataset.j] = el.dataset.k; E.save(); ui.plan = null; render(); break;
      case 'unban': E.unban(el.dataset.id); ui.plan = null; render(); break;
      case 'mins': E.S.settings.minutes = +el.dataset.k; E.save(); ui.plan = null; render(); break;
      case 'eq': E.S.settings.equipment[el.dataset.k] = !E.S.settings.equipment[el.dataset.k]; E.save(); ui.plan = null; render(); break;
      case 'copysum': {
        const txt = E.summaryForClaude();
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied. Paste it to Claude'), () => { sheet(`<h3>Copy this</h3><textarea style="min-height:300px">${esc(txt)}</textarea>`); });
        break;
      }
      case 'export': {
        const blob = new Blob([E.exportJSON()], { type: 'application/json' });
        const name = 'spotter-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        const file = new File([blob], name, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'Spotter backup' }).catch(() => {});
        else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
        break;
      }
      case 'importbk': $('#filebk').click(); break;
      case 'importfb': $('#filefb').click(); break;
      case 'reset': if (confirm('Erase all workouts, pain notes and settings on this phone? This can’t be undone.')) { E.reset(); ui.plan = null; render(); } break;
    }
  });
  function lastWeight(id) {
    const s = E.sessionsFor(id);
    if (!s.length) return null;
    return Math.max(...s[s.length - 1].sets.map((x) => x.w));
  }

  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset && t.dataset.f) {
      const v = parseFloat(t.value);
      if (!isNaN(v)) updateSet(+t.dataset.i, +t.dataset.j, t.dataset.f, t.dataset.f === 'r' ? Math.round(v) : v);
      render();
    } else if (t.id === 'filebk' || t.id === 'filefb') {
      const f = t.files[0];
      if (!f) return;
      f.text().then((txt) => {
        try {
          if (t.id === 'filebk') { E.importJSON(txt); toast('Backup restored'); }
          else { const r = E.importFitbod(txt); toast('Added ' + r.added + ' workouts from Fitbod' + (r.unknown.length ? '. ' + r.unknown.length + ' exercises kept as custom' : '')); }
          ui.plan = null; render();
        } catch (e) { toast(e.message || 'Couldn’t read that file'); }
      });
    }
  });
  document.addEventListener('focusin', (ev) => { if (ev.target.matches && ev.target.matches('.field input')) setTimeout(() => ev.target.select(), 0); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  keepAwake();
  render();
})();
