// Get F*ing Jacked! UI
(function () {
  const E = Engine;
  const $ = (s, r) => (r || document).querySelector(s);
  const app = $('#app'), tabsEl = $('#tabs'), timerEl = $('#timer'), overlay = $('#overlay'), detailEl = $('#detail');
  const ui = { tab: 'today', plan: null, planDay: null, range: 'month', openLog: null, detail: null, setup: null, summary: null };

  // Patch the DOM in place instead of replacing it. Unchanged nodes (images, the button you're
  // tapping, a focused field) stay put, so nothing flashes and taps aren't lost mid-render.
  // Children with data-key are matched by key, so reordered cards move instead of being rebuilt.
  const keyOf = (n) => (n.nodeType === 1 ? n.getAttribute('data-key') : null);
  const sameNode = (a, b) => a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.tagName === b.tagName && a.id === b.id));
  function patchNode(o, n) {
    if (o.nodeType !== 1) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
    for (const at of [...o.attributes]) if (!n.hasAttribute(at.name)) o.removeAttribute(at.name);
    for (const at of [...n.attributes]) if (o.getAttribute(at.name) !== at.value) o.setAttribute(at.name, at.value);
    const active = document.activeElement === o;
    if (o.tagName === 'INPUT') { if (!active && o.value !== (n.getAttribute('value') || '')) o.value = n.getAttribute('value') || ''; o.disabled = n.hasAttribute('disabled'); return; }
    if (o.tagName === 'TEXTAREA') { if (!active && o.value !== n.textContent) o.value = n.textContent; return; }
    if (o.tagName === 'BUTTON') o.disabled = n.hasAttribute('disabled');
    if (o.hasAttribute('data-keep')) return; // live-drawn content (the animated figure)
    patchKids(o, n);
  }
  function patchKids(oldP, newP) {
    const keyed = {};
    for (const c of oldP.childNodes) { const k = keyOf(c); if (k) keyed[k] = c; }
    let cur = oldP.firstChild;
    for (const n of [...newP.childNodes]) {
      const k = keyOf(n);
      let m = null;
      if (k) { m = keyed[k]; if (m && m.tagName !== n.tagName) m = null; if (m) delete keyed[k]; }
      else if (cur && !keyOf(cur) && sameNode(cur, n)) m = cur;
      if (m) { if (m === cur) cur = cur.nextSibling; else oldP.insertBefore(m, cur); patchNode(m, n); }
      else oldP.insertBefore(n, cur);
    }
    while (cur) { const nx = cur.nextSibling; oldP.removeChild(cur); cur = nx; }
  }
  function morph(el, html) {
    const t = document.createElement('template');
    t.innerHTML = html;
    patchKids(el, t.content);
  }
  // The screens below write app.innerHTML / detailEl.innerHTML; route those writes through morph.
  const realHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  [app, detailEl].forEach((el) => Object.defineProperty(el, 'innerHTML', { get() { return realHTML.get.call(el); }, set(h) { morph(el, h); } }));

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmtW = (w) => (Math.round(w * 10) / 10).toString();
  const fmtDate = (d, o) => new Date(d).toLocaleDateString('en-US', o || { weekday: 'short', month: 'short', day: 'numeric' });
  const fmtTime = (d) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
  const GRIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
  const XICON = '<svg class="xic" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>';
  const BACKICON = '<svg class="xic" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5L8 12l6.5 6.5"/></svg>';
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const info = (id) => (window.EXINFO && EXINFO[id]) || { m: [], s: [], steps: [], img: 0 };
  const imgSrc = (id, k) => 'img/ex/' + id + '-' + (k || 0) + '.jpg';

  function toast(msg, ms) {
    document.querySelectorAll('.toast').forEach((x) => x.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), ms || 2600);
  }
  function setLine(ex, it) {
    const s = it.sets[0];
    const n = it.sets.length;
    if (ex.unit === 'lb') return n + ' sets of ' + s.r + ' at ' + fmtW(s.w) + ' lb';
    if (ex.unit === 'sec') return n + ' rounds of ' + s.r + ' sec';
    return n + ' sets of ' + s.r + ' reps';
  }
  function thumb(id, cls) {
    const inf = info(id);
    const ex = E.exInfo(id);
    const f3 = window.Figure3D && Figure3D.has(id) && Figure3D.thumbURL(id);
    if (f3) return `<img class="${cls || 'thumb'} thumb-fig figbg" src="${f3}" alt="">`;
    return inf.img
      ? `<img class="${cls || 'thumb'}" src="${imgSrc(id, inf.img > 1 ? 1 : 0)}" alt="" loading="lazy">`
      : `<span class="${cls || 'thumb'} thumb-none">${esc(ex.group.slice(0, 2))}</span>`;
  }
  const muscleLine = (id) => { const m = info(id).m; return m.length ? m.map(cap).join(', ') : E.exInfo(id).group; };
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // ---------------- tabs ----------------
  const ICONS = {
    today: '<svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg>',
    log: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
    progress: '<svg viewBox="0 0 24 24"><path d="M4 19l5-6 4 3 7-9"/><path d="M15 7h5v5"/></svg>',
    body: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="2"/><path d="M12 8v6M8 10l4-1 4 1M10 21l2-7 2 7"/></svg>',
  };
  const TAB_NAMES = { today: 'Workout', log: 'Log', progress: 'Progress', body: 'Body' };
  function renderTabs() {
    tabsEl.style.display = E.S ? '' : 'none';
    tabsEl.innerHTML = Object.keys(TAB_NAMES)
      .map((k) => `<button class="tab ${ui.tab === k ? 'on' : ''}" data-act="tab" data-k="${k}">${ICONS[k]}${TAB_NAMES[k]}</button>`)
      .join('');
  }
  function render() {
    renderTabs();
    if (!E.S) { renderSetup(); timerEl.innerHTML = ''; return; }
    app.classList.toggle('has-timer', !!E.S.timer);
    document.body.classList.toggle('has-timer-on', !!E.S.timer);
    app.classList.toggle('has-cta', ui.tab === 'today' && !E.S.current && !ui.summary);
    if (ui.summary) { tabsEl.style.display = 'none'; renderSummary(); renderTimer(); renderDetail(); return; }
    if (ui.tab === 'today') E.S.current ? renderSession() : renderPreview();
    else if (ui.tab === 'log') renderLog();
    else if (ui.tab === 'progress') renderProgress();
    else renderBody();
    renderTimer();
    renderDetail();
  }

  // ---------------- first-run setup ----------------
  // Dumbbell sizes in the same steps as a gym rack (2.5s to 25, then 5s to 100), plus odd home sizes
  const DB_CHOICES = (() => { const o = []; for (let w = 2.5; w <= 25.01; w += 2.5) o.push(+w.toFixed(1)); for (let w = 30; w <= 100; w += 5) o.push(w); return o; })();
  const DB_ODD = [3, 8, 12];
  const dbGrid = (sel, act) => `<div class="db-grid">${DB_CHOICES.concat(DB_ODD.filter((x) => !DB_CHOICES.includes(x))).sort((a, b) => a - b).map((w) => `<button class="dbc ${sel.includes(w) ? 'on' : ''} ${DB_ODD.includes(w) && !DB_CHOICES.includes(w) ? 'odd' : ''}" data-act="${act}" data-v="${w}">${w}</button>`).join('')}</div>`;
  function renderSetup() {
    const s = ui.setup || (ui.setup = { name: '', place: 'home', goal: 'tone', split: 'glute', minutes: 40, dumbbells: [5, 12], joints: {}, stepGoal: 8000 });
    const opt = (key, val, label, sub) => `<button class="pick ${s[key] === val ? 'on' : ''}" data-act="su" data-k="${key}" data-v="${val}">${label}${sub ? `<small>${sub}</small>` : ''}</button>`;
    app.innerHTML = `
      <div class="setup">
        <img class="setup-icon" src="icons/icon-192.png" alt="">
        <h1>Let’s set you up</h1>
        <p class="sub">Takes a minute. Everything stays on this phone.</p>

        <label class="lbl" for="su-name">Your name</label>
        <input id="su-name" class="text-in" value="${esc(s.name)}" placeholder="First name" autocomplete="given-name">

        <div class="lbl">Where do you work out?</div>
        <div class="picks two">${opt('place', 'home', 'At home', 'Dumbbells and bodyweight')}${opt('place', 'gym', 'At a gym', 'Racks, cables, machines')}</div>

        ${s.place === 'home' ? `<div class="lbl">Which dumbbells do you have?</div>
        <div class="lbl-sub" style="margin:-4px 0 8px">Tap each pair you own (lb)</div>${dbGrid(s.dumbbells, 'sudb')}` : ''}

        <div class="lbl">Main goal</div>
        <div class="picks two">${opt('goal', 'tone', 'Tone and lose weight', 'More reps, short rests')}${opt('goal', 'strength', 'Get stronger', 'Heavier weights, longer rests')}</div>

        <div class="lbl">Weekly plan</div>
        <div class="picks">${Object.keys(SPLITS).map((k) => opt('split', k, SPLITS[k].name, SPLITS[k].order.map((d) => DAYS[d].name).join(', then '))).join('')}</div>

        <div class="lbl">Workout length</div>
        <div class="chips">${[30, 40, 45, 60, 75].map((m) => `<button class="chip ${s.minutes === m ? 'on' : ''}" data-act="su" data-k="minutes" data-v="${m}">${m} min</button>`).join('')}</div>

        <div class="lbl">Anything sore? <span class="lbl-sub">Tap to protect it</span></div>
        <div class="chips">${JOINTS.map((j) => `<button class="chip ${s.joints[j.id] ? 'warn on-warn' : ''}" data-act="sujoint" data-k="${j.id}">${j.name}</button>`).join('')}</div>

        <div class="lbl">Daily step goal</div>
        <div class="chips">${[0, 6000, 8000, 10000].map((n) => `<button class="chip ${s.stepGoal === n ? 'on' : ''}" data-act="su" data-k="stepGoal" data-v="${n}">${n ? n.toLocaleString() : 'Off'}</button>`).join('')}</div>

        <button class="btn-main" data-act="sustart">Start training</button>
        <button class="btn-link" data-act="sujake">I’m Jake: load my gym setup</button>
        ${localStorage.getItem('gfj.lastErased') ? '<button class="btn-link" data-act="unerase">Undo: bring back what you erased</button>' : ''}
      </div>`;
  }

  // ---------------- today: preview ----------------
  function ensurePlan() {
    const day = ui.planDay || E.nextDayType();
    if (!ui.plan || ui.plan.day !== day) ui.plan = E.generate(day);
    return ui.plan;
  }
  function curPlan() { return E.S.current || ensurePlan(); }
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
  function stepCard() {
    const goal = E.S.profile.stepGoal;
    if (!goal) return '';
    const n = E.S.steps[todayKey()] || 0;
    return `<div class="card steps"><div class="steps-top"><span>Steps today</span><span class="sub">${Math.round(Math.min(100, (n / goal) * 100))}% of ${goal.toLocaleString()}</span></div>
      <div class="track"><div class="fill ${n >= goal ? 'met' : ''}" style="width:${Math.min(100, (n / goal) * 100)}%"></div></div>
      <div class="steps-in"><input inputmode="numeric" id="steps-in" value="${n || ''}" placeholder="Type today’s steps" aria-label="Steps today"></div></div>`;
  }
  function renderPreview() {
    const plan = ensurePlan();
    const day = DAYS[plan.day];
    const order = [...new Set(E.order())];
    const nm = E.S.profile.name;
    app.innerHTML = `
      <div class="top"><div>
        <div class="kicker">${nm ? esc(nm) + ', ' : ''}${fmtDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1 class="day-title">${esc(day.name)}</h1>
      </div><button class="lib-btn" data-act="openlib" aria-label="All exercises"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>Exercises</span></button></div>
      <div class="block-box"><div class="block-top"><span>Block ${plan.block + 1} · Week ${plan.week + 1} of 4</span><span>~${plan.estMin} min · ${plan.items.length} exercises${day.circuit ? ' · circuit' : ''}</span></div>
      ${blockBar(plan.week)}</div>
      ${avoidNote(plan.day)}
      ${stepCard()}
      ${order.length > 1 ? `<div class="chips" style="margin-top:16px">${order.map((k) => `<button class="chip ${plan.day === k ? 'on' : ''}" data-act="pickday" data-k="${k}">${DAYS[k].name}</button>`).join('')}</div>` : ''}
      ${plan.items.map((it, i) => previewCard(it, i)).join('')}
      <div class="cta-dock"><button class="btn-main" data-act="start">Start workout</button></div>`;
  }
  function previewCard(it, i) {
    const ex = E.exInfo(it.ex);
    const note = E.S.notes[it.ex];
    return `<div class="ex" data-i="${i}" data-key="ex-${it.ex}"><div class="ex-head">
      <button class="ex-open" data-act="detail" data-i="${i}">${thumb(it.ex)}
        <span class="ex-main"><span class="ex-name">${esc(ex.name)}</span>
        <span class="ex-meta">${setLine(ex, it)}${it.first ? ' <span class="first">New lift: start light</span>' : ''}${it.maxed ? ' <span class="first">Ready for heavier weights</span>' : ''}</span></span></button>
      <button class="ex-more" data-act="exmenu" data-i="${i}" aria-label="Options for ${esc(ex.name)}">⋯</button>
    </div>${note ? `<div class="ex-note"><span>📝</span><span>${esc(note)}</span></div>` : ''}</div>`;
  }

  // ---------------- today: session ----------------
  function renderSession() {
    const c = E.S.current;
    const day = DAYS[c.day];
    const allDone = c.items.every((it) => it.sets.every((s) => s.done));
    app.innerHTML = `
      <div class="top"><div>
        <div class="kicker">${E.schemeFor(c.week).name} week</div>
        <h1 class="day-title">${esc(day.name)}</h1>
      </div><div class="top-r"><button class="lib-btn" data-act="openlib" aria-label="All exercises"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/></svg><span>Exercises</span></button><div class="elapsed" id="elapsed">${mmss((Date.now() - new Date(c.startedAt)) / 1000)}</div></div></div>
      ${c.items.map((it, i) => sessionCard(it, i)).join('')}
      <button class="btn-quiet" data-act="addex">Add an exercise</button>
      <button class="${allDone ? 'btn-main' : 'btn-quiet'}" data-act="finish">Finish workout</button>
      <button class="btn-quiet btn-danger" data-act="discard">Discard workout</button>`;
  }
  function setRows(it, i, live) {
    const ex = E.exInfo(it.ex);
    const unitLabel = ex.unit === 'sec' ? 'sec' : 'reps';
    return `<div class="sets">
      <div class="set set-head ${live ? '' : 'nocheck'}"><span></span><span>${ex.unit === 'lb' ? (E.ownedDumbbells(ex) || ex.eq.includes('dumbbell') ? 'lb each' : 'lb') : ''}</span><span>${unitLabel}</span>${live ? '<span></span>' : ''}</div>
      ${it.sets.map((s, j) => `<div class="set ${s.done ? 'done' : ''} ${s.warm ? 'warm' : ''} ${live ? '' : 'nocheck'}">
        <div class="set-n">${s.warm ? 'W' : j + 1 - it.sets.slice(0, j).filter((x) => x.warm).length}</div>
        ${ex.unit === 'lb' ? `<div class="field"><button data-act="w" data-i="${i}" data-j="${j}" data-d="-1" aria-label="Less weight">−</button><input inputmode="decimal" data-f="w" data-i="${i}" data-j="${j}" value="${fmtW(s.w)}" aria-label="Weight"><button data-act="w" data-i="${i}" data-j="${j}" data-d="1" aria-label="More weight">+</button></div>` : `<div class="field bw">Bodyweight</div>`}
        <div class="field"><button data-act="r" data-i="${i}" data-j="${j}" data-d="-1" aria-label="Fewer ${unitLabel}">−</button><input inputmode="numeric" data-f="r" data-i="${i}" data-j="${j}" value="${s.r}" aria-label="${unitLabel}"><button data-act="r" data-i="${i}" data-j="${j}" data-d="1" aria-label="More ${unitLabel}">+</button></div>
        ${live ? `<button class="check" data-act="check" data-i="${i}" data-j="${j}" aria-label="${s.done ? 'Undo set' : 'Finish set'}">${CHECK}</button>` : ''}
      </div>`).join('')}
      <div class="set-actions"><button class="ghost" data-act="addset" data-i="${i}">Add set</button>${it.sets.length > 1 ? `<button class="ghost" data-act="rmset" data-i="${i}">Remove set</button>` : ''}</div>
    </div>`;
  }
  function sessionCard(it, i) {
    const ex = E.exInfo(it.ex);
    const done = it.sets.every((s) => s.done);
    const nDone = it.sets.filter((s) => s.done).length;
    return `<div class="ex ${done ? 'done' : ''}" data-i="${i}" data-key="ex-${it.ex}">
      <div class="ex-head">
        <button class="ex-open" data-act="detail" data-i="${i}">${thumb(it.ex)}
          <span class="ex-main"><span class="ex-name">${esc(ex.name)}</span>
          <span class="ex-meta">${done ? '<span class="donechip">Done</span> ' : ''}${nDone} of ${it.sets.length} sets, ${mmss(it.rest)} rest</span></span></button>
        <button class="ex-more" data-act="exmenu" data-i="${i}" aria-label="Options for ${esc(ex.name)}">⋯</button>
      </div>
      ${E.S.notes[it.ex] && (!done || it.open) ? `<div class="ex-note"><span>📝</span><span>${esc(E.S.notes[it.ex])}</span></div>` : ''}
      ${!done || it.open ? setRows(it, i, true) : ''}
    </div>`;
  }

  // ---------------- exercise detail (photo, How-to, History, Replace, More) ----------------
  let flipTimer = null;
  function openDetail(i, view) {
    ui.detail = { i, view: view || 'main', tab: 0, q: '' };
    renderDetail();
  }
  function openLibrary() { ui.detail = { library: true, view: 'library', q: '', g: 'All' }; renderDetail(); }
  function libExercises() { return EXERCISES.concat(Object.values(E.S.custom || {})); }
  function renderLibrary(d) {
    const all = libExercises();
    const groups = ['All'].concat([...new Set(all.map((e) => e.group))]);
    const q = (d.q || '').toLowerCase();
    const list = all.filter((e) => (d.g === 'All' || e.group === d.g) && (!q || e.name.toLowerCase().includes(q) || e.group.toLowerCase().includes(q) || muscleLine(e.id).toLowerCase().includes(q)))
      .sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
    const row = (e) => {
      const ses = E.sessionsFor(e.id);
      const last = ses[ses.length - 1];
      const ok = E.allowed(e);
      const lastTxt = last ? 'Last: ' + (e.unit === 'lb' ? fmtW(Math.max(...last.sets.map((x) => x.w))) + ' lb × ' + Math.max(...last.sets.map((x) => x.r)) : Math.max(...last.sets.map((x) => x.r)) + (e.unit === 'sec' ? ' sec' : ' reps')) + ', ' + fmtDate(last.date, { month: 'short', day: 'numeric' }) : 'Not done yet';
      return `<button class="rep-row lib-row" data-act="libopen" data-ex="${e.id}" data-key="lib-${e.id}">${thumb(e.id)}<span><b>${esc(e.name)}</b><small>${esc(muscleLine(e.id))}</small><small class="${last ? '' : 'dim'}">${lastTxt}</small></span>${ok ? '' : '<em class="lib-warn">Skipped for your joints</em>'}</button>`;
    };
    return `<div class="dv-bar"><button class="dv-x" data-act="dclose" aria-label="Close">${XICON}</button><span>Exercises</span><span style="width:40px"></span></div>
      <div class="dpad"><input class="text-in" id="lib-q" placeholder="Search ${all.length} exercises" value="${esc(d.q || '')}" autocomplete="off">
      <div class="chips lib-chips">${groups.map((g) => `<button class="chip ${d.g === g ? 'on' : ''}" data-act="libg" data-k="${esc(g)}">${esc(g)}</button>`).join('')}</div>
      ${list.length ? list.map(row).join('') : '<div class="empty">No exercises match.</div>'}</div>`;
  }
  function hideDetail() {
    document.body.classList.remove('noscroll');
    const el = $('#detail .detail');
    if (!el || el.classList.contains('closing')) return;
    el.classList.add('closing');
    setTimeout(() => { if (!ui.detail) detailEl.textContent = ''; }, 260);
  }
  function closeDetail() {
    ui.detail = null;
    render();
  }
  function coachLine(it) {
    const plan = curPlan();
    const sch = E.schemeFor(plan.week);
    const tips = {
      Base: 'Smooth, controlled reps. Finish each set feeling like you had 2 more in you.',
      Build: 'A bit more work this week. Last set should feel like 2 reps left.',
      Strength: 'Heaviest week. Last set should feel like 1 more rep with control.',
      Deload: 'Easy week so your body can recover. Light and crisp, nothing hard.',
    };
    const sess = E.sessionsFor(it.ex);
    const last = sess[sess.length - 1];
    let reps = '→', weight = '→';
    if (last) {
      const lw = Math.max(...last.sets.map((s) => s.w || 0));
      const lr = Math.max(...last.sets.map((s) => s.r || 0));
      const s0 = it.sets.find((s) => !s.warm) || it.sets[0];
      weight = s0.w > lw ? '↑' : s0.w < lw ? '↓' : '→';
      reps = s0.r > lr ? '↑' : s0.r < lr ? '↓' : '→';
    }
    const ex = E.exInfo(it.ex);
    return `<div class="coach"><div class="coach-t">Week ${plan.week + 1} of 4: ${sch.name}</div><div class="coach-b">${tips[sch.name]}</div>
      ${last ? `<div class="trend">${ex.unit !== 'sec' ? `<span>Reps <b class="t ${reps === '↑' ? 'up' : ''}">${reps}</b></span>` : ''}${ex.unit === 'lb' ? `<span>Weight <b class="t ${weight === '↑' ? 'up' : ''}">${weight}</b></span>` : ''}<span class="sub">vs last time</span></div>` : `<div class="trend"><span class="sub">First time. Pick a weight that feels easy and learn the move.</span></div>`}</div>`;
  }
  function libSummary(id) {
    const ex = E.exInfo(id), ses = E.sessionsFor(id), ok = E.allowed(ex);
    const last = ses[ses.length - 1];
    return `<div class="coach">${ok ? '' : '<div class="coach-t" style="color:var(--hurt)">Skipped right now to protect a sore joint</div>'}
      <div class="coach-b">${last ? `Done ${ses.length} time${ses.length > 1 ? 's' : ''}. Last on ${fmtDate(last.date, { month: 'short', day: 'numeric' })}: ${last.sets.map((x) => (ex.unit === 'lb' ? fmtW(x.w) + '×' + x.r : x.r + (ex.unit === 'sec' ? 's' : ''))).join(', ')}` : 'You haven’t done this one yet.'}</div>
      ${ex.unit === 'lb' && last ? `<div class="trend"><span class="sub">Best est. 1-rep max: ${Math.round(Math.max(...ses.map((x) => E.bestE1rm(x.sets))))} lb</span></div>` : ''}</div>`;
  }
  function renderDetail() {
    clearInterval(flipTimer);
    const d = ui.detail;
    if (!d || !E.S) { hideDetail(); return; }
    const plan = curPlan();
    if (d.view === 'library') {
      document.body.classList.add('noscroll');
      const prevL = $('#detail .detail');
      if (prevL && prevL.classList.contains('closing')) detailEl.textContent = '';
      detailEl.innerHTML = `<div class="detail" role="dialog" aria-modal="true" aria-label="Exercises"><div class="dv-body v-main" data-key="v-library">${renderLibrary(d)}</div></div>`;
      return;
    }
    const lib = d.lib || null;
    const it = lib ? { ex: lib, sets: [], rest: E.S.rest[lib] || 90 } : plan.items[d.i];
    if (!it) { ui.detail = null; hideDetail(); return; }
    document.body.classList.add('noscroll');
    const ex = E.exInfo(it.ex);
    const inf = info(it.ex);
    let body = '';
    const head = (title) => `<div class="dv-bar"><button class="dv-x" data-act="dview" data-v="main" aria-label="Back">${BACKICON}</button><span>${title}</span><span style="width:40px"></span></div>`;
    if (d.view === 'main') {
      const fig = window.Figure3D && Figure3D.has(it.ex) && !Figure3D.failed;
      body = `<div class="hero ${fig ? 'figbg' : ''}">${fig ? `<div class="hero-fig" data-keep data-fig="${it.ex}" data-key="fig-${it.ex}"></div>` : inf.img ? `<img id="hero-img" src="${imgSrc(it.ex, 0)}" alt="${esc(ex.name)}">` : `<div class="hero-none">${muscleMap(inf.m.length ? inf.m : [ex.group.toLowerCase()], inf.s)}</div>`}
          <button class="dv-close" data-act="${lib ? 'libback' : 'dclose'}" aria-label="${lib ? 'Back to exercises' : 'Close'}">${lib ? BACKICON : XICON}</button>
          <div class="hero-foot"><h2 class="hero-name">${esc(ex.name)}</h2><button class="howto-btn" data-act="dview" data-v="howto">▶ How-to</button></div></div>
        <div class="dchips">
          ${lib ? '' : `<button class="dchip" data-act="restpick"><svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9.5 2.5h5"/></svg>${mmss(it.rest)}</button>`}
          <button class="dchip" data-act="dview" data-v="history"><svg viewBox="0 0 24 24"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4.5v4h4M12 8v4.5l3 2"/></svg>History</button>
          ${lib ? '' : `<button class="dchip" data-act="dview" data-v="replace"><svg viewBox="0 0 24 24"><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/></svg>Replace</button>
          <button class="dchip" data-act="dview" data-v="more"><svg viewBox="0 0 24 24"><circle cx="5.5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18.5" cy="12" r="1.3"/></svg>More</button>`}
        </div>
        <div class="dpad">
          <div class="muscle-line">${esc(muscleLine(it.ex))}</div>
          ${lib ? libSummary(it.ex) : coachLine(it)}
          ${E.S.notes[it.ex] ? `<div class="note-show">Your note: ${esc(E.S.notes[it.ex])}</div>` : ''}
          ${lib ? '' : setRows(it, d.i, !!E.S.current)}
          ${lib || E.S.current ? '' : '<div class="sub" style="margin-top:8px">Start the workout to check off sets.</div>'}
        </div>`;
    } else if (d.view === 'howto') {
      const tabs = ['Instructions', 'Target', 'Equipment'];
      const eqNames = ex.eq.length ? ex.eq.map((k) => (EQUIPMENT.find((e) => e.id === k) || { name: k }).name) : ['None. Just you.'];
      body = `${head('How-to')}
        ${window.Figure3D && Figure3D.has(it.ex) && !Figure3D.failed ? `<div class="howto-img figbg"><div class="hero-fig" data-keep data-orbit data-fig="${it.ex}" data-key="figh-${it.ex}"></div><span class="spin-hint">⟲ Swipe to spin</span></div>` : inf.img ? `<div class="howto-img"><img id="hero-img" src="${imgSrc(it.ex, 0)}" alt=""></div>` : ''}
        <div class="dpad howto-pad"><h2 class="dv-title">${esc(ex.name)}</h2>
        <div class="seg seg3">${tabs.map((t, k) => `<button class="${d.tab === k ? 'on' : ''}" data-act="dtab" data-k="${k}">${t}</button>`).join('')}</div>
        <div class="howto-scroll">
        ${d.tab === 0 ? `<ol class="steps-list">${(inf.steps.length ? inf.steps : ['Move slowly and with control through the full range you can do without pain.']).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
        ${d.tab === 1 ? `<div class="target">${muscleMap(inf.m.length ? inf.m : [ex.group.toLowerCase()], inf.s)}<div class="tlegend"><span><i class="lg p"></i>Main: ${esc((inf.m.length ? inf.m : [ex.group]).map(cap).join(', '))}</span>${inf.s.length ? `<span><i class="lg s"></i>Also: ${esc(inf.s.map(cap).join(', '))}</span>` : ''}</div></div>` : ''}
        ${d.tab === 2 ? `<ul class="eq-list">${eqNames.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        </div></div>`;
    } else if (d.view === 'history') {
      const sess = E.sessionsFor(it.ex).slice().reverse();
      const series = E.liftSeries(it.ex);
      const wSeries = series.map((p) => ({ date: p.date, v: p.top.w || p.top.r }));
      body = `${head(esc(ex.name))}<div class="dpad">
        <div class="seg seg2">${['Results', 'Trends'].map((t, k) => `<button class="${d.tab === k ? 'on' : ''}" data-act="dtab" data-k="${k}">${t}</button>`).join('')}</div>
        ${!sess.length ? '<div class="empty">No history yet. It fills in after you log this one.</div>' : d.tab === 0 ? sess.map((s, k) => {
          const prev = sess[k + 1];
          const tot = s.sets.reduce((a, x) => a + x.r, 0);
          const ptot = prev ? prev.sets.reduce((a, x) => a + x.r, 0) : null;
          const tw = Math.max(...s.sets.map((x) => x.w || 0)), pw = prev ? Math.max(...prev.sets.map((x) => x.w || 0)) : null;
          const badge = prev ? (tw > pw ? `+${fmtW(tw - pw)} lb` : tw === pw && tot > ptot ? `${tot - ptot} more reps` : '') : '';
          return `<div class="hist"><h3>${fmtDate(s.date, { weekday: 'short', month: 'short', day: 'numeric' })}</h3>${badge ? `<span class="badge">${badge}</span>` : ''}
            ${s.sets.map((x, n) => `<div class="hset"><span class="hn">${n + 1}</span>${x.r}${ex.unit === 'sec' ? ' sec' : ' reps'}${ex.unit === 'lb' ? ' × ' + fmtW(x.w) + ' lb' : ''}</div>`).join('')}
            ${ex.unit === 'lb' ? `<div class="sub">Est. 1-rep max ${Math.round(E.bestE1rm(s.sets))} lb</div>` : ''}</div>`;
        }).join('') : `${ex.unit === 'lb' ? `<div class="card"><div class="sub">Est. 1-rep max</div><div class="big-num" style="font-size:52px">${Math.round(series[series.length - 1].v)}<small>lb</small></div>${series.length > 1 ? lineChart(series, { h: 150, unit: 'lb' }) : '<div class="empty">Log it again to start the chart.</div>'}</div>` : ''}
          <div class="card"><div class="sub">${ex.unit === 'lb' ? 'Top weight' : ex.unit === 'sec' ? 'Longest round' : 'Best set'}</div><div class="big-num" style="font-size:52px">${fmtW(wSeries[wSeries.length - 1].v)}<small>${ex.unit === 'lb' ? 'lb' : ex.unit === 'sec' ? 'sec' : 'reps'}</small></div>${wSeries.length > 1 ? lineChart(wSeries, { h: 150, unit: ex.unit === 'lb' ? 'lb' : ex.unit === 'sec' ? 'sec' : 'reps' }) : ''}</div>`}
        </div>`;
    } else if (d.view === 'replace') {
      const opts = E.swapOptions(plan, d.i);
      const q = (d.q || '').toLowerCase();
      const all = q ? EXERCISES.filter((e) => E.allowed(e) && !plan.items.some((x) => x.ex === e.id) && (e.name.toLowerCase().includes(q) || e.group.toLowerCase().includes(q))) : opts;
      body = `<div class="dv-bar"><button class="dv-x" data-act="dview" data-v="main" aria-label="Close">${XICON}</button><span>Replace ${esc(ex.name)}</span><span style="width:40px"></span></div>
        <div class="dpad"><input class="text-in" id="rep-q" placeholder="Search" value="${esc(d.q || '')}" autocomplete="off">
        <div class="rep-cur">${thumb(it.ex)}<span><b>${esc(ex.name)}</b><small>${esc(muscleLine(it.ex))}</small></span></div>
        <div class="lbl">${q ? 'Results' : 'Replace with'}</div>
        ${all.length ? all.slice(0, 40).map((o) => `<button class="rep-row" data-act="swapto" data-i="${d.i}" data-ex="${o.id}">${thumb(o.id)}<span><b>${esc(o.name)}</b><small>${esc(muscleLine(o.id))}</small></span></button>`).join('') : '<div class="empty">Nothing that fits your equipment and joints.</div>'}
        <div class="sub" style="margin-top:10px">Exercises that would hurt a sore joint aren’t shown.</div></div>`;
    } else if (d.view === 'more') {
      body = `${head(esc(ex.name))}<div class="dpad">
        <div class="lbl">Notes</div><textarea id="ex-note" placeholder="Seat height, grip, how it felt">${esc(E.S.notes[it.ex] || '')}</textarea>
        <button class="btn-quiet" data-act="savenote">Save note</button>
        ${ex.unit === 'lb' ? '<button class="btn-quiet" data-act="warmup">Add a warm-up set</button>' : ''}
        <button class="btn-quiet" data-act="dislike" data-i="${d.i}">I don’t like this one</button>
        <button class="btn-quiet hurt-btn" data-act="painsheet" data-i="${d.i}">Something hurts</button>
        <button class="btn-quiet btn-danger" data-act="rmex" data-i="${d.i}">Delete from workout</button></div>`;
    }
    const prev = $('#detail .detail');
    if (prev && prev.classList.contains('closing')) detailEl.textContent = '';
    detailEl.innerHTML = `<div class="detail ${d.view === 'howto' ? 'is-howto' : ''}" role="dialog" aria-modal="true" aria-label="${esc(ex.name)}"><div class="dv-body ${d.view === 'main' ? 'v-main' : 'v-sub'}" data-key="v-${d.view}-${lib || d.i}">${body}</div></div>`;
    document.querySelectorAll('#detail [data-fig]').forEach((el) => { if (!el.firstChild) Figure3D.mount(el, el.dataset.fig); });
    // photo flips between start and end position, like a slow animation
    if (!(window.Figure3D && Figure3D.has(it.ex) && !Figure3D.failed) && inf.img > 1 && (d.view === 'main' || d.view === 'howto') && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      let k = 0;
      flipTimer = setInterval(() => { const im = $('#hero-img'); if (!im) return clearInterval(flipTimer); k = 1 - k; im.src = imgSrc(it.ex, k); }, 1200);
    }
  }

  // Simple front and back body map. Muscle names follow the exercise library.
  const REG = {
    front: {
      shoulders: ['M38 46a10 9 0 1 0 0 .1', 'M82 46a10 9 0 1 0 0 .1'],
      chest: ['M45 52h14v16h-14z', 'M61 52h14v16h-14z'],
      biceps: ['M30 58h9v20h-9z', 'M81 58h9v20h-9z'],
      forearms: ['M27 82h9v22h-9z', 'M84 82h9v22h-9z'],
      abdominals: ['M50 70h20v30h-20z'],
      quadriceps: ['M44 112h14v38h-14z', 'M62 112h14v38h-14z'],
      adductors: ['M57 112h6v26h-6z'],
      abductors: ['M40 108h5v16h-5z', 'M75 108h5v16h-5z'],
      calves: ['M46 160h10v30h-10z', 'M64 160h10v30h-10z'],
      cardio: ['M52 54h16v12h-16z'],
    },
    back: {
      traps: ['M48 40h24v10h-24z'],
      shoulders: ['M38 46a10 9 0 1 0 0 .1', 'M82 46a10 9 0 1 0 0 .1'],
      lats: ['M44 60h10v24h-10z', 'M66 60h10v24h-10z'],
      'middle back': ['M54 54h12v20h-12z'],
      'lower back': ['M52 80h16v14h-16z'],
      triceps: ['M30 58h9v20h-9z', 'M81 58h9v20h-9z'],
      glutes: ['M45 100h14v16h-14z', 'M61 100h14v16h-14z'],
      hamstrings: ['M44 120h14v32h-14z', 'M62 120h14v32h-14z'],
      calves: ['M46 160h10v30h-10z', 'M64 160h10v30h-10z'],
    },
  };
  const ALIAS = { chest: 'chest', back: 'lats', core: 'abdominals', quads: 'quadriceps', glutes: 'glutes', hamstrings: 'hamstrings', other: '' };
  function muscleMap(main, sec) {
    const norm = (m) => ALIAS[m] != null ? ALIAS[m] : m;
    const P = new Set(main.map(norm)), Sx = new Set((sec || []).map(norm));
    const fig = (side, dx) => {
      const base = `<g transform="translate(${dx} 0)"><circle cx="60" cy="22" r="11" class="mb"/><path class="mb" d="M40 38h40l8 12 4 54h-10l-4-40-2 40h-4l2 56 2 40h-14l-4-40-2-30-2 30-4 40h-14l2-40 2-56h-4l-2-40-4 40H28l4-54z"/>`;
      const regs = Object.keys(REG[side]).map((m) => {
        const cls = P.has(m) ? 'mp' : Sx.has(m) ? 'ms' : 'mo';
        return REG[side][m].map((d) => `<path class="${cls}" d="${d}"/>`).join('');
      }).join('');
      return base + regs + `<text x="60" y="206" class="mlab">${side === 'front' ? 'Front' : 'Back'}</text></g>`;
    };
    return `<svg class="mmap" viewBox="0 0 240 212" role="img" aria-label="Muscles worked">${fig('front', 0)}${fig('back', 120)}</svg>`;
  }

  // ---------------- timer ----------------
  let audioCtx = null;
  function unlockAudio() {
    if (audioCtx) { if (audioCtx.state !== 'running') audioCtx.resume().catch(() => {}); return; }
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const b = audioCtx.createBuffer(1, 1, 22050);
      const src = audioCtx.createBufferSource();
      src.buffer = b; src.connect(audioCtx.destination); src.start(0);
    } catch (e) {}
  }
  function beep() {
    if (!audioCtx || audioCtx.state === 'closed') { audioCtx = null; unlockAudio(); }
    if (!audioCtx) return;
    const go = () => tones();
    if (audioCtx.state !== 'running') audioCtx.resume().then(go, go); else go();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  }
  function tones() {
    [0, 0.22, 0.44, 0.9, 1.12, 1.34].forEach((t, i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.frequency.value = i % 3 === 2 ? 1320 : 880;
      o.connect(g); g.connect(audioCtx.destination);
      const at = audioCtx.currentTime + t;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
      o.start(at); o.stop(at + 0.2);
    });
  }
  function startTimer(secs, label) {
    E.S.timer = { endsAt: Date.now() + secs * 1000, total: secs, base: secs, label, beeped: false };
    E.save();
    renderTimer();
    app.classList.add('has-timer');
  }
  function stopTimer() {
    if (!E.S) return;
    E.S.timer = null;
    E.save();
    timerEl.innerHTML = '';
    app.classList.remove('has-timer');
  }
  const PLATES = 14;
  function renderTimer() {
    const t = E.S && E.S.timer;
    if (!t) { timerEl.innerHTML = ''; return; }
    if ($('#tdock')) { tick(); return; }
    timerEl.innerHTML = `<div class="timer" id="tdock">
      <div class="stack" id="tstack">${Array.from({ length: PLATES }, () => '<div class="plate"></div>').join('')}</div>
      <div class="timer-body">
        <div class="timer-top"><span class="timer-label" id="tlabel"></span></div>
        <div class="timer-time" id="ttime">0:00</div>
        <div class="timer-btns"><button data-act="t-" aria-label="15 seconds less">−15</button><button data-act="t+" aria-label="15 seconds more">+15</button><button data-act="treset" aria-label="Restart rest timer">↺</button><button class="skip" data-act="tskip">Skip</button></div>
      </div></div>`;
    tick();
  }
  function tick() {
    if (!E.S) return;
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
    if (over && !t.beeped) { t.beeped = true; E.save(); if (left > -30) beep(); }
    if (left < -600) stopTimer();
  }
  setInterval(tick, 250);

  let wakeLock = null;
  async function keepAwake() {
    if (!E.S || !E.S.current || !('wakeLock' in navigator)) return;
    try { if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => (wakeLock = null)); } } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { keepAwake(); tick(); } });

  // ---------------- sheets ----------------
  function sheet(html) {
    overlay.innerHTML = `<div class="scrim" data-act="close"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  }
  function closeSheet() {
    const sc = overlay.querySelector('.scrim');
    if (!sc) return;
    sc.classList.add('closing');
    setTimeout(() => { if (overlay.firstChild === sc) overlay.innerHTML = ''; }, 200);
  }
  // After the last set of an exercise: how many more sets could you have done? Drives next time's weight.
  function leftSheet(i) {
    const it = E.S.current.items[i];
    ui.leftVal = null;
    sheet(`<h3>How many more sets could you do?</h3><p>${esc(E.exInfo(it.ex).name)}. Next time’s weight is based on this.</p>
      <div class="left-grid">${[0, 1, 2, 3].map((v) => `<button class="lft l${v}" data-act="leftpick" data-k="${v}">${v === 3 ? '3+' : v}</button>`).join('')}</div>
      <button class="btn-main" data-act="leftok" data-i="${i}" disabled>OK</button>`);
  }

  function exMenu(i) {
    const ex = E.exInfo(curPlan().items[i].ex);
    sheet(`<h3>${esc(ex.name)}</h3><p>${esc(muscleLine(ex.id))}</p>
      <button class="row-btn hurt" data-act="painsheet" data-i="${i}"><span class="ic">!</span><span>Something hurts<small>Log it, swap this out and protect the joint</small></span></button>
      <button class="row-btn" data-act="detailv" data-i="${i}" data-v="replace"><span class="ic">⇄</span><span>Replace exercise<small>Pick another for the same muscles</small></span></button>
      <button class="row-btn" data-act="detailv" data-i="${i}" data-v="howto"><span class="ic">▶</span><span>How-to<small>Steps and muscles worked</small></span></button>
      <button class="row-btn" data-act="dislike" data-i="${i}"><span class="ic">✕</span><span>I don’t like this one<small>Never suggest it again</small></span></button>
      <button class="row-btn" data-act="rmex" data-i="${i}"><span class="ic">−</span><span>Skip it today</span></button>`);
  }
  function restSheet() {
    const it = curPlan().items[ui.detail.i];
    sheet(`<h3>Rest between sets</h3><p>Saved for ${esc(E.exInfo(it.ex).name.toLowerCase())} from now on.</p>
      <div class="opt-grid" style="grid-template-columns:repeat(3,1fr)">${[20, 30, 45, 60, 90, 120, 150, 180, 240].map((s) => `<button class="opt ${it.rest === s ? 'on' : ''}" data-act="restset" data-k="${s}">${mmss(s)}</button>`).join('')}</div>`);
  }
  const pain = { joint: null, sev: null };
  function painSheet(i) {
    const ex = i == null ? null : E.exInfo(curPlan().items[i].ex);
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
    sheet(`<h3>Add an exercise</h3>${Object.keys(groups).map((g) => `<p style="margin:14px 0 2px;font-weight:600;color:var(--ink)">${g}</p>${groups[g].map((e) => `<button class="rep-row" data-act="addexpick" data-ex="${e.id}">${thumb(e.id)}<span><b>${esc(e.name)}</b><small>${esc(muscleLine(e.id))}</small></span></button>`).join('')}`).join('')}`);
  }
  const INFO = {
    index: `<h3>Strength index</h3>
      <p>One number for how much stronger you are than when you started.</p>
      <ol class="steps-list">
        <li>For every lift, the app works out your estimated 1-rep max each session from the weight and reps you did (the Epley formula: weight × (1 + reps ÷ 30)).</li>
        <li>Your first session of each lift counts as 100. If your bench estimate goes from 150 to 165 lb, bench is at 110.</li>
        <li>The strength index is the average of all your lifts on that day. 115 means about 15% stronger than when you started.</li>
        <li>Bodyweight and timed moves use your best reps or seconds instead.</li>
      </ol>
      <p>Press and hold any chart to see the exact value on a date.</p>`,
    method: `<h3>How your plan works</h3>
      <p>Standard, well-tested strength training methods, set up as a strength and muscle hybrid (mostly 8 to 12 reps).</p>
      <ol class="steps-list">
        <li><b>4-week blocks.</b> Base, Build, Strength, then an easy Deload week so your body recovers. Exercises rotate each block. This is called block periodization.</li>
        <li><b>Reps in reserve.</b> Each week says how hard the last set should feel, like "2 reps left". Training close to, but not at, failure builds muscle with less joint wear.</li>
        <li><b>Double progression.</b> Hit every planned rep at a weight, and next time the weight goes up one step. Miss reps, and it holds or eases off.</li>
        <li><b>Your answers count.</b> "How many more sets could you do": 0 holds the weight, 2 or 3+ moves it up faster. Cutting sets short holds the weight and trims the sets.</li>
        <li><b>Joint protection.</b> Moves that load a sore joint are skipped and swapped for ones that don’t.</li>
      </ol>`,
    standards: `<h3>How you compare</h3>
      <p>An estimate, not a national database. Each lift’s best recent estimated 1-rep max is divided by your body weight and compared to widely used strength standards for your sex, eased off a little for age past 35.</p>
      <ol class="steps-list">
        <li><b>Beginner:</b> new to lifting. <b>Novice:</b> a few months of steady training.</li>
        <li><b>Intermediate:</b> a year or two. <b>Advanced:</b> several years of serious training.</li>
        <li><b>Elite:</b> competitive athlete level.</li>
      </ol>
      <p>Dumbbell lifts are converted to a barbell equivalent, so treat it as a rough guide.</p>`,
  };
  function infoSheet(k) { sheet(INFO[k]); }
  function liftSheet(id) {
    const ex = E.exInfo(id);
    const series = E.liftSeries(id);
    const best = Math.max(...series.map((p) => p.v));
    const label = ex.unit === 'lb' ? 'Est. 1-rep max' : ex.unit === 'sec' ? 'Longest round' : 'Best set';
    sheet(`<h3>${esc(ex.name)}</h3>
      <p>${label}: ${Math.round(best)} ${ex.unit === 'lb' ? 'lb' : ex.unit === 'sec' ? 'sec' : 'reps'} best</p>
      ${series.length > 1 ? lineChart(series, { h: 170, unit: ex.unit === 'lb' ? 'lb' : ex.unit === 'sec' ? 'sec' : 'reps' }) : '<div class="empty">Do this one again to start its chart.</div>'}
      <div style="margin-top:10px">${series.slice().reverse().slice(0, 12).map((p) => `<div class="log-ex" style="margin:0;padding:8px 0"><div><span>${fmtDate(p.date)}</span><span>${ex.unit === 'lb' ? fmtW(p.top.w) + ' lb × ' + p.top.r : p.top.r + (ex.unit === 'sec' ? ' sec' : ' reps')}${ex.unit === 'lb' ? ', est. max ' + Math.round(p.v) : ''}</span></div></div>`).join('')}</div>`);
  }

  // ---------------- workout summary ----------------
  function renderSummary() {
    const h = E.S.history.find((x) => x.id === ui.summary);
    if (!h) { ui.summary = null; return render(); }
    const day = DAYS[h.day];
    const sets = h.entries.reduce((a, e) => a + e.sets.filter((s) => !s.warm).length, 0);
    const reps = h.entries.reduce((a, e) => a + e.sets.filter((s) => !s.warm).reduce((b, s) => b + s.r, 0), 0);
    const recs = h.records || [];
    const rows = h.entries.map((en) => {
      const ex = E.exInfo(en.ex);
      const work = en.sets.filter((s) => !s.warm);
      const sess = E.sessionsFor(en.ex);
      const prev = sess.length > 1 ? sess[sess.length - 2] : null;
      let extra = '';
      if (ex.unit === 'lb') {
        const now = E.bestE1rm(work), was = prev ? E.bestE1rm(prev.sets) : 0;
        const dlt = was ? Math.round(now - was) : 0;
        extra = `<span class="sum-e1">Est. max ${Math.round(now)} lb${dlt ? ` <b class="${dlt > 0 ? 'delta-up' : 'delta-down'}">${dlt > 0 ? '+' : ''}${dlt}</b>` : ''}</span>`;
      }
      const top = ex.unit === 'lb' ? work.map((s) => fmtW(s.w) + '×' + s.r).join(', ') : work.map((s) => s.r + (ex.unit === 'sec' ? 's' : '')).join(', ');
      const pr = recs.some((r) => r.ex === en.ex);
      return `<div class="sum-row">${thumb(en.ex, 'thumb sm')}<div class="sum-main"><div class="sum-name">${esc(ex.name)}${pr ? ' <span class="badge">PR</span>' : ''}</div><div class="sub">${top}</div>${extra}</div></div>`;
    }).join('');
    app.innerHTML = `<div class="summary">
      <div class="kicker">${fmtDate(h.date, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
      <h1>Workout done</h1>
      <div class="sub">${esc(day ? day.name : h.day)}</div>
      <div class="card stats3 sum-stats"><div class="stat"><div class="v">${h.minutes || 0}</div><div class="k">Minutes</div></div>
        <div class="stat"><div class="v">${sets}</div><div class="k">Sets</div></div>
        <div class="stat"><div class="v">${E.volume(h).toLocaleString()}</div><div class="k">Pounds lifted</div></div></div>
      <h2>${recs.length ? 'Personal records' : 'Achievements'}</h2>
      <div class="card">${recs.length ? recs.map((r) => `<div class="ach"><span class="ach-ic">★</span><div><b>${esc(E.exInfo(r.ex).name)}</b><small>${esc(r.what)}: ${esc(r.val)}</small></div></div>`).join('') : ''}
        <div class="ach"><span class="ach-ic dim">✓</span><div><b>${h.entries.length} exercises, ${reps.toLocaleString()} reps</b><small>${recs.length ? 'Nice work.' : 'No records this time. Consistency is what builds it.'}</small></div></div></div>
      <h2>Exercises</h2>
      <div class="card">${rows}</div>
      <div class="cta-dock"><button class="btn-main" data-act="sumdone">Done</button></div>
    </div>`;
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
    const enc = pts.map((p) => [+X(+p.date).toFixed(1), +Y(p.v).toFixed(1), +p.date, Math.round(p.v * 10) / 10]);
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Chart. Press and hold to see values." data-pts='${JSON.stringify(enc)}' data-unit="${esc(o.unit || '')}" data-h="${H - pb}">
      <defs><linearGradient id="fillgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc53d" stop-opacity="0.22"/><stop offset="1" stop-color="#ffc53d" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map((t) => `<line class="grid" x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text class="axis" x="${W - pr + 6}" y="${Y(t) + 4}">${Math.round(t)}</text>`).join('')}
      ${xt.map((t, i) => `<text class="axis" x="${X(t)}" y="${H - 4}" text-anchor="${['start', 'middle', 'end'][i]}">${fmtDate(t, { month: 'short', day: 'numeric' })}</text>`).join('')}
      <path class="area" d="${area}"/><path class="line" d="${d}"/>
      ${pts.length < 40 ? pts.map((p) => `<circle class="dot" cx="${X(+p.date)}" cy="${Y(p.v)}" r="3.5"/>`).join('') : ''}
      <g class="scrub" style="display:none"><line class="scrub-l" x1="0" x2="0" y1="${pt - 6}" y2="${H - pb}"/><circle class="scrub-d" r="5.5"/><g class="scrub-tip"><rect rx="6" height="34" width="92"/><text class="scrub-v" x="8" y="15"></text><text class="scrub-t" x="8" y="28"></text></g></g>
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
    const rangeName = { week: 'this week', month: 'this month', '6m': 'in 6 months', year: 'this year', all: 'all time' }[ui.range];
    const deltaIn = (ser) => { const inR = ser.filter((p) => p.date >= since); if (!inR.length) return null; const base = ser.filter((p) => p.date < since).pop() || inR[0]; return inR[inR.length - 1].v - base.v; };
    const std = E.standings();
    const W = E.S.weights || [];
    const wIn = W.filter((x) => new Date(x.date) >= since);
    const fold = (k, title, sum, body) => { const o = ui.open && ui.open[k]; return `<div class="fold ${o ? 'open' : ''}"><button class="fold-h" data-act="fold" data-k="${k}" aria-expanded="${!!o}"><span class="fold-t">${title}</span><span class="fold-s">${sum}</span><svg class="fold-c" viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg></button>${o ? `<div class="fold-b">${body}</div>` : ''}</div>`; };
    app.innerHTML = `<div class="top"><div class="title-i"><h1>Progress</h1><button class="info-btn inline" data-act="idxinfo" aria-label="How progress is measured">i</button></div></div>
      <div class="seg">${[['month', 'Month'], ['6m', '6 months'], ['year', 'Year'], ['all', 'All time']].map(([k, n]) => `<button class="${ui.range === k ? 'on' : ''}" data-act="range" data-k="${k}">${n}</button>`).join('')}</div>
      <div class="card">
        ${cur != null ? `<div class="big-num">${Math.round(cur)}<small>strength index</small></div>
          <div class="sub">${delta != null ? `<span class="${delta >= 0 ? 'delta-up' : 'delta-down'}">${delta >= 0 ? 'Up' : 'Down'} ${Math.abs(delta).toFixed(1)}</span> ${rangeName}. 100 is where each lift started.` : '100 is where each lift started.'}</div>
          ${shown.length > 1 ? lineChart(shown, { unit: '' }) : '<div class="empty">Not enough workouts in this range for a chart yet.</div>'}`
        : `<div class="big-num">100<small>strength index</small></div><div class="empty">Your chart starts once you repeat a lift. Each lift starts at 100 and the number climbs as you get stronger.</div>`}
      </div>
      ${groups.length ? fold('muscle', 'By muscle', groups.slice().sort((x, y) => y.s[y.s.length - 1].v - x.s[x.s.length - 1].v).slice(0, 2).map((x) => x.g + ' ' + Math.round(x.s[x.s.length - 1].v)).join(' · '),
        `<div class="card">${groups.map((x) => { const last = x.s[x.s.length - 1].v; return `<div class="lift"><div class="nm">${x.g}</div>${spark(x.s.slice(-8))}<div class="val">${Math.round(last)}</div></div>`; }).join('')}</div>`) : ''}
      ${fold('sets', 'Sets this week', (() => { const n = E.GROUPS.reduce((a, g) => a + week[g], 0), t = E.GROUPS.reduce((a, g) => a + E.WEEKLY_TARGET[g], 0); return n + ' of ' + t; })(),
        `<div class="card bars">${E.GROUPS.map((g) => { const n = week[g], t = E.WEEKLY_TARGET[g]; return `<div class="b"><span>${g}</span><div class="track"><div class="fill ${n >= t ? 'met' : ''}" style="width:${Math.min(100, (n / t) * 100)}%"></div></div><span class="n">${n} / ${t}</span></div>`; }).join('')}</div>`)}
      ${fold('compare', 'How you compare', std === null ? 'Add your info' : std.length ? std[0].name + ': ' + std[0].level : 'No standard lifts yet',
        `<div class="card"><div class="std-info"><button class="btn-link" data-act="stdinfo">How this is worked out</button></div>${std === null ? `<div class="empty">Add your body weight, sex and age in the Body tab to see where your lifts rank, from beginner to elite.</div>` : std.length ? std.map((x) => `<div class="std"><div class="std-top"><b>${esc(x.name)}</b><span class="std-lv">${x.level}</span></div>
          <div class="std-bar"><i style="left:${(x.pos * 100).toFixed(1)}%"></i></div><div class="std-scale">${E.LEVELS.map((l) => `<span>${l}</span>`).join('')}</div>
          <div class="sub">Est. max ${x.e1rm} lb${x.from && E.exInfo(x.from).eq.includes('dumbbell') ? ' (barbell equivalent)' : ''}, ${x.ratio.toFixed(2)}× body weight.${x.next ? ` ${x.nextLevel} at about ${x.next} lb.` : ''}</div></div>`).join('') : '<div class="empty">None of your logged lifts match the standard lifts (bench, overhead press, squat, deadlift, row) yet.</div>'}</div>`)}
      ${W.length ? fold('bw', 'Body weight', fmtW(W[W.length - 1].lb) + ' lb', `<div class="card"><div class="big-num">${fmtW(W[W.length - 1].lb)}<small>lb</small></div>
        ${wIn.length > 1 ? `<div class="sub">${(() => { const dw = wIn[wIn.length - 1].lb - wIn[0].lb; return dw ? `<span class="${dw < 0 ? 'delta-up' : 'delta-down'}">${dw > 0 ? '+' : ''}${fmtW(dw)} lb</span> ${rangeName}` : 'No change ' + rangeName; })()}</div>${lineChart(wIn.map((x) => ({ date: new Date(x.date), v: x.lb })), { h: 140, unit: 'lb' })}` : '<div class="sub">Log it a few times to see a chart.</div>'}</div>`) : ''}
      <h2>Lifts <span class="h2-sub">change ${rangeName}</span></h2>
      <div class="card">${lifts.length ? lifts.map((l) => { const last = l.s[l.s.length - 1]; const d = deltaIn(l.s); return `<button class="lift" data-act="lift" data-id="${l.id}">${thumb(l.id, 'thumb sm')}<div class="nm">${esc(l.ex.name)}<small>${l.s.length} session${l.s.length > 1 ? 's' : ''}${d ? `, <span class="${d > 0 ? 'delta-up' : 'delta-down'}">${d > 0 ? '+' : ''}${Math.round(d)}</span> ${rangeName}` : ''}</small></div>${spark(l.s)}<div class="val">${Math.round(last.v)}<small style="color:var(--muted)">${l.ex.unit === 'lb' ? 'est. max' : l.ex.unit === 'sec' ? 'sec' : 'reps'}</small></div></button>`; }).join('') : '<div class="empty">No lifts in this range.</div>'}</div>
      <button class="btn-quiet" data-act="openlib">See all exercises</button>
      <button class="btn-link" data-act="methodinfo">How your plan decides weights and reps</button>`;
  }

  // ---------------- body ----------------
  function renderBody() {
    const S = E.S;
    const P = S.profile;
    const bans = Object.keys(S.bans).filter(E.banActive);
    const hurt = JOINTS.filter((j) => S.joints[j.id] && S.joints[j.id] !== 'ok');
    const recAll = E.recovery();
    const rec = E.GROUPS.map((g) => recAll.find((r) => r.group === g) || { group: g, pct: 100 }).sort((x, y) => x.pct - y.pct);
    const bw = E.bodyweight();
    app.innerHTML = `<div class="top"><div class="title-i"><h1>Body</h1><button class="info-btn inline" data-act="bodyinfo" aria-label="What’s on this page">i</button></div></div>

      <h2>Injuries &amp; avoiding</h2>
      <div class="card">
        ${hurt.length ? hurt.map((j) => { const lv = S.joints[j.id]; return `<div class="inj"><div class="inj-top"><b>${j.name}</b><span class="inj-lv ${lv}">${lv === 'injured' ? 'Injured' : 'Sore'}</span></div>
          <div class="inj-tip">${lv === 'injured' ? 'Skipping anything that loads it.' : 'Skipping the hardest moves for it.'} ${esc(JOINT_TIPS[j.id] || '')}</div>
          <div class="inj-btns"><button class="ghost" data-act="joint" data-j="${j.id}" data-k="${lv === 'injured' ? 'sore' : 'injured'}">${lv === 'injured' ? 'Feeling better: just sore' : 'Worse: mark injured'}</button><button class="ghost" data-act="joint" data-j="${j.id}" data-k="ok">Healed</button></div></div>`; }).join('') : '<div class="empty" style="padding:4px 0 8px">No injuries. Everything is in the plan.</div>'}
        <div class="two-btn"><button class="btn-quiet" data-act="injadd">+ Add an injury</button><button class="btn-quiet" data-act="painsheet">Log pain</button></div>
        <div class="inj-sub">Avoiding these exercises</div>
        ${bans.length ? bans.map((id) => { const b = S.bans[id]; return `<div class="ban"><div>${esc(E.exInfo(id).name)}<small>${esc(b.note || '')}${b.until ? ' Back on ' + fmtDate(b.until, { month: 'short', day: 'numeric' }) + '.' : ''}</small></div><button data-act="unban" data-id="${id}">Allow again</button></div>`; }).join('') : '<div class="sub">None. Tap ⋯ on an exercise to drop it.</div>'}
      </div>

      <h2>Muscle recovery <button class="info-btn inline" data-act="recinfo" aria-label="How recovery is estimated">i</button></h2>
      <div class="card">${rec.map((r) => `<div class="rec-row"><span class="rec-g">${r.group}</span><div class="track"><div class="fill ${r.pct >= 90 ? 'met' : r.pct < 50 ? 'low' : ''}" style="width:${r.pct}%"></div></div><span class="rec-p">${r.pct}%</span><small>${r.pct >= 90 ? 'Ready' : 'Trained ' + (r.hoursAgo < 24 ? r.hoursAgo + ' h ago' : Math.round(r.hoursAgo / 24) + ' d ago')}</small></div>`).join('')}</div>

      <h2>Pain log</h2>
      <div class="card">${S.painLog.length ? S.painLog.slice().reverse().slice(0, 12).map((p) => `<div class="pain"><b>${fmtDate(p.at, { month: 'short', day: 'numeric' })}: ${esc((JOINTS.find((j) => j.id === p.joint) || { name: 'Other' }).name)}, ${esc(p.severity)}</b>${p.ex ? ` <span>on ${esc(E.exInfo(p.ex).name.toLowerCase())}</span>` : ''}${p.note ? `<br><span>${esc(p.note)}</span>` : ''}</div>`).join('') : '<div class="empty">No pain logged.</div>'}</div>

      <h2>About you</h2>
      <div class="card">
        <div class="about-note ${P.sex && P.age && bw ? 'ok' : ''}">${P.sex && P.age && bw ? `✓ Your lifts are rated against strength standards for ${P.sex === 'f' ? 'women' : 'men'} around ${P.age} at ${fmtW(bw)} lb. See How you compare on Progress.` : `Add ${[!P.sex && 'sex', !P.age && 'age', !bw && 'body weight'].filter(Boolean).join(', ')} to rate your lifts against strength standards (Progress → How you compare).`}</div>
        <div class="chips"><button class="chip ${P.sex === 'm' ? 'on' : ''}" data-act="sex" data-k="m">Male</button><button class="chip ${P.sex === 'f' ? 'on' : ''}" data-act="sex" data-k="f">Female</button></div>
        <div class="about-row"><label>Age<input id="age-in" class="text-in" inputmode="numeric" value="${P.age || ''}" placeholder="—"></label>
          <label>Height<span class="ht"><input id="ht-ft" class="text-in" inputmode="numeric" value="${P.heightIn ? Math.floor(P.heightIn / 12) : ''}" placeholder="ft"><input id="ht-in" class="text-in" inputmode="numeric" value="${P.heightIn ? P.heightIn % 12 : ''}" placeholder="in"></span></label></div>
        <div class="lbl" style="margin-top:14px">Body weight</div>
        <div class="bw-row"><input id="bw-in" class="text-in" inputmode="decimal" placeholder="${bw ? fmtW(bw) : 'Weight'}" aria-label="Body weight in pounds"><span class="bw-u">lb</span><button class="btn-small" data-act="bwsave">Save</button></div>
        <div class="sub" style="margin-top:8px">${bw ? `Last: ${fmtW(bw)} lb on ${fmtDate(S.weights[S.weights.length - 1].date, { month: 'short', day: 'numeric' })}. Chart is on the Progress tab.` : 'Log it now and then. The chart shows on Progress.'}</div>
      </div>

      <h2>Your plan</h2>
      <div class="card plan-box">
        <div class="lbl">Goal</div>
        <div class="chips">${Object.keys(GOALS).map((k) => `<button class="chip ${P.goal === k ? 'on' : ''}" data-act="prof" data-k="goal" data-v="${k}">${GOALS[k].name}</button>`).join('')}</div>
        <div class="lbl">Weekly plan</div>
        <div class="chips">${Object.keys(SPLITS).map((k) => `<button class="chip ${P.split === k ? 'on' : ''}" data-act="prof" data-k="split" data-v="${k}">${SPLITS[k].name}</button>`).join('')}</div>
        <div class="lbl">Workout length</div>
        <div class="chips">${[30, 40, 45, 60, 75, 90].map((m) => `<button class="chip ${S.settings.minutes === m ? 'on' : ''}" data-act="mins" data-k="${m}">${m} min</button>`).join('')}</div>
        <div class="lbl">Daily step goal</div>
        <div class="chips">${[0, 6000, 8000, 10000, 12000].map((n) => `<button class="chip ${P.stepGoal === n ? 'on' : ''}" data-act="prof" data-k="stepGoal" data-v="${n}">${n ? n.toLocaleString() : 'Off'}</button>`).join('')}</div>
        <button class="btn-link" data-act="methodinfo" style="margin-top:6px">How your plan decides weights and reps</button>
      </div>

      <h2>Your equipment</h2>
      <div class="card">${EQUIPMENT.map((e) => `<div class="toggle"><span>${esc(e.name)}</span><button class="sw ${S.settings.equipment[e.id] ? 'on' : ''}" data-act="eq" data-k="${e.id}" role="switch" aria-checked="${!!S.settings.equipment[e.id]}" aria-label="${esc(e.name)}"></button></div>`).join('')}</div>
      ${S.settings.equipment.dumbbell ? (() => { const pairs = S.settings.dbMode === 'pairs' || (S.settings.dumbbells && S.settings.dumbbells.length); const max = S.settings.rackMax || 100; return `<h2>Dumbbells</h2>
      <div class="seg seg2"><button class="${pairs ? '' : 'on'}" data-act="dbmode" data-k="rack">Gym rack</button><button class="${pairs ? 'on' : ''}" data-act="dbmode" data-k="pairs">Only certain pairs</button></div>
      ${pairs ? `<div class="card"><div class="sub" style="margin-bottom:10px">Tap each pair you own (lb). Weights only go up through these.</div>${dbGrid(S.settings.dumbbells || [], 'dbown')}</div>`
        : `<div class="card"><div class="rack-line"><b>2.5 – 25 lb</b><span>in 2.5 lb steps</span></div><div class="rack-line"><b>30 – ${max} lb</b><span>in 5 lb steps</span></div>
          <div class="lbl" style="margin-top:12px">Heaviest pair</div><div class="chips">${[50, 75, 100, 120, 150].map((m) => `<button class="chip ${max === m ? 'on' : ''}" data-act="rackmax" data-k="${m}">${m} lb</button>`).join('')}</div></div>`}`; })() : ''}

      <h2>Talk it through</h2>
      <div class="card"><div class="sub" style="color:#c9d0d7">Copy a summary of your injuries, pain log and last workouts, then paste it to Claude. Claude can work out what’s causing it and update the app.</div>
        <button class="btn-main" data-act="copysum" style="margin-top:12px;height:52px;font-size:21px">Copy summary for Claude</button>
        <div class="sub" style="color:#c9d0d7;margin-top:14px">Or copy your workouts (sets, weights, minutes, estimated calories) to track alongside food in Claude.</div>
        <div class="two-btn"><button class="btn-quiet" data-act="copyclaude" data-k="7">Last 7 days</button><button class="btn-quiet" data-act="copyclaude" data-k="30">Last 30 days</button></div></div>

      <h2>Your data</h2>
      <div class="sub">Everything is saved on this phone only. Back it up now and then.</div>
      <button class="btn-quiet" data-act="importfb">Import workout history</button>
      <div class="sub" style="margin:6px 4px 0;font-size:13px">From Fitbod, Strong, Hevy, JEFIT, FitNotes or any CSV with date, exercise, weight and reps.</div>
      <button class="btn-quiet" data-act="exportcsv">Export all workouts (CSV)</button>
      <button class="btn-quiet" data-act="export">Save a backup</button>
      <button class="btn-quiet" data-act="importbk">Restore a backup</button>
      <button class="btn-quiet btn-danger" data-act="reset">Erase everything and start over</button>
      <input type="file" id="filebk" accept=".json,application/json" hidden>
      <input type="file" id="filefb" accept=".csv,text/csv,text/plain" hidden>
      <div class="sub" style="margin:22px 4px 0;color:var(--dim)">Get F*ing Jacked! v2.1</div>`;
  }


  // ---------------- actions ----------------
  function updateSet(i, j, field, val) {
    const plan = curPlan();
    const it = plan.items[i];
    it.sets[j][field] = val;
    if (it.sets[j].warm) return E.save();
    for (let k = j + 1; k < it.sets.length; k++) if (!it.sets[k].done && !it.sets[k].warm) it.sets[k][field] = val;
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
  function lastWeight(id) {
    const s = E.sessionsFor(id);
    if (!s.length) return null;
    return Math.max(...s[s.length - 1].sets.map((x) => x.w));
  }
  function afterPlanChange() {
    if (!E.S.current) ui.plan = null;
  }

  document.addEventListener('click', (ev) => {
    unlockAudio();
    if (eatClick) { ev.preventDefault(); ev.stopPropagation(); eatClick = false; return; }
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const ae = document.activeElement;
    if (ae && ae !== el && ae.matches && ae.matches('input[data-f], #steps-in, #bw-in')) ae.blur(); // fires 'change' first
    const act = el.dataset.act;
    if (!ui.detail && ['dview', 'dtab', 'libg', 'libopen', 'libback', 'restpick', 'restset', 'savenote', 'warmup'].includes(act)) return;
    if (act === 'close' && ev.target !== el) return;
    const i = el.dataset.i != null ? +el.dataset.i : null;
    const j = el.dataset.j != null ? +el.dataset.j : null;
    const c = E.S && E.S.current;
    const s = ui.setup;
    switch (act) {
      // setup
      case 'su': { const v = el.dataset.v; s[el.dataset.k] = isNaN(+v) ? v : +v; if (el.dataset.k === 'goal') s.split = v === 'tone' ? 'glute' : 'ppl'; if (el.dataset.k === 'place' && v === 'gym') s.minutes = Math.max(s.minutes, 60); renderSetup(); break; }
      case 'sudb': { const w = +el.dataset.v; s.dumbbells = s.dumbbells.includes(w) ? s.dumbbells.filter((x) => x !== w) : s.dumbbells.concat(w); renderSetup(); break; }
      case 'sujoint': s.joints[el.dataset.k] = s.joints[el.dataset.k] ? null : 'sore'; renderSetup(); break;
      case 'sustart': {
        s.name = $('#su-name').value.trim();
        if (s.place === 'home' && !s.dumbbells.length) { toast('Pick the dumbbells you have'); break; }
        const joints = {}; Object.keys(s.joints).forEach((k) => s.joints[k] && (joints[k] = 'sore'));
        E.setup(Object.assign({}, s, { joints }));
        ui.setup = null; ui.plan = null; render(); window.scrollTo(0, 0);
        toast('You’re set' + (s.name ? ', ' + s.name : '') + '. First workout is ready');
        break;
      }
      case 'sujake': if (confirm('Load Jake’s gym setup, sore elbows and knees, and his Fitbod history on this phone?')) { E.setup('jake'); ui.setup = null; render(); } break;

      case 'tab': if (ui.tab !== el.dataset.k) { ui.tab = el.dataset.k; ui.detail = null; app.classList.remove('tabin'); void app.offsetWidth; app.classList.add('tabin'); render(); window.scrollTo(0, 0); } break;
      case 'close': closeSheet(); break;
      case 'pickday': ui.planDay = el.dataset.k; ui.plan = null; render(); break;
      case 'start': E.startWorkout(ensurePlan()); ui.plan = null; ui.planDay = null; keepAwake(); render(); window.scrollTo(0, 0); break;
      case 'detail': openDetail(i); break;
      case 'detailv': closeSheet(); openDetail(i, el.dataset.v); break;
      case 'dclose': closeDetail(); break;
      case 'dview': ui.detail.view = el.dataset.v; ui.detail.tab = 0; ui.detail.q = ''; renderDetail(); $('#detail .detail').scrollTop = 0; break;
      case 'dtab': ui.detail.tab = +el.dataset.k; renderDetail(); break;
      case 'restpick': restSheet(); break;
      case 'restset': { const plan = curPlan(); const it = plan.items[ui.detail.i]; it.rest = +el.dataset.k; E.S.rest[it.ex] = it.rest; E.save(); closeSheet(); renderDetail(); render(); break; }
      case 'savenote': { const it = curPlan().items[ui.detail.i]; const v = $('#ex-note').value.trim(); if (v) E.S.notes[it.ex] = v; else delete E.S.notes[it.ex]; E.save(); toast('Note saved'); ui.detail.view = 'main'; renderDetail(); break; }
      case 'warmup': { const it = curPlan().items[ui.detail.i]; const w0 = it.sets.find((x) => !x.warm) || it.sets[0]; const ex = E.exInfo(it.ex); it.sets.unshift({ w: ex.unit === 'lb' ? E.roundW(w0.w * 0.5, ex) : 0, r: 10, tr: 10, warm: true, done: false }); E.save(); ui.detail.view = 'main'; renderDetail(); render(); break; }
      case 'w': case 'r': {
        const it = curPlan().items[i], st = it.sets[j], ex = E.exInfo(it.ex), d = +el.dataset.d;
        const val = act === 'w' ? E.nudgeW(st.w, ex, d) : Math.max(0, st.r + d * (ex.unit === 'sec' ? 5 : 1));
        updateSet(i, j, act, val); render(); break;
      }
      case 'check': {
        const it = c.items[i], st = it.sets[j];
        st.done = !st.done;
        if (st.done && E.S.notes[it.ex] && !it.noted) { it.noted = true; toast('📝 ' + E.S.notes[it.ex], 4500); }
        if (st.done) {
          // Real rest = time since the last set of this exercise, minus about how long a set takes.
          const now = Date.now(), ex = E.exInfo(it.ex);
          if (it.lastAt && !st.warm) {
            const rest = (now - it.lastAt) / 1000 - (ex.unit === 'sec' ? st.r : 30);
            if (rest >= 10 && rest <= 420) (it.rests = it.rests || []).push(Math.round(rest));
          }
          it.lastAt = now;
          // Short on reps? Aim the rest of the sets at what you actually got.
          if (!st.warm && st.tr && st.r < st.tr) it.sets.forEach((x, k) => { if (k > j && !x.done && !x.warm) x.r = st.r; });
          const allDone = c.items.every((x) => x.sets.every((y) => y.done));
          if (!allDone) startTimer(it.rest, nextLabel(c, i, j)); else stopTimer();
          if (it.sets.every((y) => y.done)) it.open = false;
        }
        E.save();
        render();
        if (st.done && it.sets.every((y) => y.done)) leftSheet(i);
        break;
      }
      case 'leftpick': ui.leftVal = +el.dataset.k; overlay.querySelectorAll('.lft').forEach((b) => b.classList.toggle('on', b === el)); overlay.querySelector('[data-act="leftok"]').disabled = false; break;
      case 'leftok': {
        if (ui.leftVal == null) break;
        c.items[i].left = ui.leftVal; E.save(); closeSheet();
        if (ui.detail) closeDetail(); else render();
        const next = document.querySelector(`.ex[data-i="${i + 1}"]`);
        if (next) setTimeout(() => next.scrollIntoView({ behavior: 'smooth', block: 'start' }), 280);
        break;
      }
      case 'treset': E.S.timer.endsAt = Date.now() + (E.S.timer.base || E.S.timer.total) * 1000; E.S.timer.total = E.S.timer.base || E.S.timer.total; E.S.timer.beeped = false; E.save(); tick(); break;
      case 'sumdone': ui.tab = 'log'; ui.openLog = ui.summary; ui.summary = null; render(); window.scrollTo(0, 0); break;
      case 'addset': { const it = curPlan().items[i]; const last = it.sets[it.sets.length - 1]; it.sets.push({ w: last.w, r: last.r, tr: last.tr, done: false }); it.open = true; E.save(); render(); break; }
      case 'rmset': { const it = curPlan().items[i]; const k = it.sets.map((x) => x.done).lastIndexOf(false); it.sets.splice(k >= 0 ? k : it.sets.length - 1, 1); E.save(); render(); break; }
      case 't-': E.S.timer.endsAt -= 15000; E.S.timer.total = Math.max(15, E.S.timer.total - 15); E.save(); tick(); break;
      case 't+': if (E.S.timer.endsAt < Date.now()) { E.S.timer.endsAt = Date.now(); E.S.timer.beeped = false; } E.S.timer.endsAt += 15000; E.S.timer.total += 15; E.save(); tick(); break;
      case 'tskip': stopTimer(); break;
      case 'exmenu': exMenu(i); break;
      case 'swapto': { const plan = curPlan(); E.swapTo(plan, i, el.dataset.ex); E.save(); closeSheet(); if (ui.detail) { const ni = plan.items.findIndex((x) => x.ex === el.dataset.ex); ui.detail = { i: ni, view: 'main', tab: 0 }; } render(); toast('Swapped to ' + E.exInfo(el.dataset.ex).name.toLowerCase()); break; }
      case 'dislike': {
        const plan = curPlan(); const id = plan.items[i].ex; E.dislike(id);
        const opts = E.swapOptions(plan, i);
        if (opts.length) E.swapTo(plan, i, opts[0].id); else if (!plan.items[i].sets.some((x) => x.done)) plan.items.splice(i, 1);
        E.save(); closeSheet(); ui.detail = null; render(); toast('Got it. ' + E.exInfo(id).name + ' won’t come up again'); break;
      }
      case 'rmex': { const plan = curPlan(); if (c && plan.items[i] && plan.items[i].sets.some((x) => x.done) && !confirm('Remove ' + E.exInfo(plan.items[i].ex).name + '? Its logged sets won’t be saved.')) break; plan.items.splice(i, 1); E.save(); closeSheet(); ui.detail = null; render(); break; }
      case 'painsheet': painSheet(i); break;
      case 'pj': pain.joint = el.dataset.k; document.querySelectorAll('#pjoint .opt').forEach((b) => b.classList.toggle('on', b === el)); $('#ptip').innerHTML = JOINT_TIPS[pain.joint] ? `<div class="tip">${esc(JOINT_TIPS[pain.joint])}</div>` : ''; break;
      case 'ps': pain.sev = el.dataset.k; document.querySelectorAll('#psev .opt').forEach((b) => b.classList.toggle('on', b === el)); break;
      case 'painsave': {
        if (!pain.joint || !pain.sev) { toast('Pick where and how bad'); break; }
        const note = $('#pnote').value.trim();
        if (pain.i != null) {
          const plan = curPlan(); const id = plan.items[pain.i].ex;
          E.reportPain(id, pain.joint, pain.sev, note);
          const opts = E.swapOptions(plan, pain.i);
          if (opts.length) E.swapTo(plan, pain.i, opts[0].id); else if (!plan.items[pain.i].sets.some((x) => x.done)) plan.items.splice(pain.i, 1);
          E.save(); closeSheet(); ui.detail = null; render();
          toast(opts.length ? 'Logged. Swapped to ' + opts[0].name.toLowerCase() : 'Logged and removed');
        } else { E.reportPain(null, pain.joint, pain.sev, note); closeSheet(); afterPlanChange(); render(); toast('Logged'); }
        break;
      }
      case 'addex': addExSheet(); break;
      case 'addexpick': {
        const ex = E.EX[el.dataset.ex];
        const t = E.itemFor(ex.id, c);
        const lw = lastWeight(ex.id);
        if (ex.unit === 'lb' && lw) t.sets.forEach((x) => (x.w = lw));
        c.items.push(t); E.save(); closeSheet(); render(); break;
      }
      case 'finish': {
        const anyDone = c.items.some((it) => it.sets.some((x) => x.done));
        if (!anyDone) { toast('Check off at least one set first'); break; }
        const rec = E.finishWorkout(); stopTimer();
        if (wakeLock) { wakeLock.release(); wakeLock = null; }
        ui.plan = null; ui.detail = null; ui.summary = rec ? rec.id : null; if (!rec) ui.tab = 'log';
        render(); window.scrollTo(0, 0);
        break;
      }
      case 'discard': if (confirm('Discard this workout? Nothing will be saved.')) { E.S.current = null; stopTimer(); E.save(); render(); } break;
      case 'openlog': if (ev.target.closest('[data-act="dellog"]')) break; ui.openLog = ui.openLog === el.dataset.id ? null : el.dataset.id; render(); break;
      case 'dellog': ev.stopPropagation(); if (confirm('Delete this workout from your log?')) { E.S.history = E.S.history.filter((h) => h.id !== el.dataset.id); E.save(); render(); } break;
      case 'range': ui.range = el.dataset.k; render(); break;
      case 'openlib': openLibrary(); break;
      case 'libg': ui.detail.g = el.dataset.k; renderDetail(); break;
      case 'libopen': ui.detail = { lib: el.dataset.ex, fromLib: { q: ui.detail.q, g: ui.detail.g }, view: 'main', tab: 0, q: '' }; renderDetail(); $('#detail .detail').scrollTop = 0; break;
      case 'libback': { const f = ui.detail.fromLib || { q: '', g: 'All' }; ui.detail = { library: true, view: 'library', q: f.q, g: f.g }; renderDetail(); break; }
      case 'idxinfo': infoSheet('index'); break;
      case 'methodinfo': infoSheet('method'); break;
      case 'stdinfo': infoSheet('standards'); break;
      case 'bwsave': { const v = parseFloat(($('#bw-in') || {}).value); if (!(v > 50 && v < 700)) { toast('Type your weight in pounds'); break; } E.logWeight(Math.round(v * 10) / 10); toast('Weight saved'); render(); break; }
      case 'sex': E.S.profile.sex = el.dataset.k; E.save(); render(); toast('Saved: ' + (el.dataset.k === 'f' ? 'female' : 'male')); break;
      case 'recinfo': sheet(`<h3>Muscle recovery</h3><p>An estimate of how recovered each muscle group is, not a measurement.</p><ol class="steps-list"><li>Every hard set adds fatigue to the muscle it trains. Helper muscles get half (bench press tires triceps and shoulders a bit too).</li><li>Fatigue clears over about 2 days after a normal session, up to 3 or more after a big one.</li><li>Your answer to “how many more sets could you do” counts: 0 left means slower recovery, 3+ means faster.</li><li>Around 90% or more is ready to train hard again.</li></ol>`); break;
      case 'copyclaude': {
        const txt = E.exportForClaude(+el.dataset.k || 30);
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied. Paste it into Claude'), () => { sheet(`<h3>Copy this</h3><textarea style="min-height:300px">${esc(txt)}</textarea>`); });
        break;
      }
      case 'lift': liftSheet(el.dataset.id); break;
      case 'joint': E.S.joints[el.dataset.j] = el.dataset.k; E.save(); afterPlanChange(); render(); if (el.dataset.k === 'ok') toast('Marked healed. Back in the plan'); break;
      case 'unban': E.unban(el.dataset.id); afterPlanChange(); render(); break;
      case 'mins': E.S.settings.minutes = +el.dataset.k; E.save(); afterPlanChange(); render(); break;
      case 'prof': { const v = el.dataset.v; E.S.profile[el.dataset.k] = isNaN(+v) ? v : +v; if (el.dataset.k === 'split') { E.S.rotIdx = 0; ui.planDay = null; } E.save(); afterPlanChange(); render(); break; }
      case 'eq': E.S.settings.equipment[el.dataset.k] = !E.S.settings.equipment[el.dataset.k]; E.save(); afterPlanChange(); render(); break;
      case 'dbown': { const w = +el.dataset.v; const cur = E.S.settings.dumbbells || []; const nx = cur.includes(w) ? cur.filter((x) => x !== w) : cur.concat(w).sort((a, b) => a - b); E.S.settings.dumbbells = nx; E.S.settings.dbMode = 'pairs'; E.save(); afterPlanChange(); render(); break; }
      case 'dbrack': E.S.settings.dumbbells = null; E.save(); afterPlanChange(); render(); break;
      case 'dbmode': if (el.dataset.k === 'rack') { if (E.S.settings.dumbbells && E.S.settings.dumbbells.length) E.S.settings.dbPairs = E.S.settings.dumbbells; E.S.settings.dumbbells = null; E.S.settings.dbMode = 'rack'; } else { E.S.settings.dbMode = 'pairs'; E.S.settings.dumbbells = E.S.settings.dbPairs || E.S.settings.dumbbells || []; } E.save(); afterPlanChange(); render(); break;
      case 'rackmax': E.S.settings.rackMax = +el.dataset.k; E.save(); afterPlanChange(); render(); toast('Heaviest pair: ' + el.dataset.k + ' lb'); break;
      case 'fold': ui.open = ui.open || {}; ui.open[el.dataset.k] = !ui.open[el.dataset.k]; render(); break;
      case 'copysum': {
        const txt = E.summaryForClaude();
        (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(() => toast('Copied. Paste it to Claude'), () => { sheet(`<h3>Copy this</h3><textarea style="min-height:300px">${esc(txt)}</textarea>`); });
        break;
      }
      case 'export': {
        const blob = new Blob([E.exportJSON()], { type: 'application/json' });
        const name = 'jacked-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        const file = new File([blob], name, { type: 'application/json' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'Get F*ing Jacked! backup' }).catch(() => {});
        else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); }
        break;
      }
      case 'importbk': $('#filebk').click(); break;
      case 'importfb': $('#filefb').click(); break;
      case 'reset': {
        const t = prompt('This erases every workout, your pain log and settings on this phone.\n\nType ERASE to confirm.');
        if (t == null) break;
        if (t.trim().toUpperCase() !== 'ERASE') { toast('Not erased. Type ERASE to confirm.'); break; }
        try { localStorage.setItem('gfj.lastErased', localStorage.getItem('spotter.v1') || ''); localStorage.setItem('gfj.lastErasedAt', new Date().toISOString()); } catch (e) {}
        localStorage.removeItem('spotter.v1'); location.reload(); break;
      }
      case 'unerase': { const v = localStorage.getItem('gfj.lastErased'); if (v && confirm('Bring back everything you erased?')) { localStorage.setItem('spotter.v1', v); localStorage.removeItem('gfj.lastErased'); location.reload(); } break; }
      case 'exportcsv': {
        const blob = new Blob([E.exportCSV()], { type: 'text/csv' });
        const name = 'jacked-workouts-' + new Date().toISOString().slice(0, 10) + '.csv';
        const file = new File([blob], name, { type: 'text/csv' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: 'Workout history' }).catch(() => {});
        else { const a2 = document.createElement('a'); a2.href = URL.createObjectURL(blob); a2.download = name; a2.click(); }
        break;
      }
      case 'bodyinfo': sheet(`<h3>Body</h3><ol class="steps-list"><li><b>Injuries &amp; avoiding:</b> joints you’re protecting and exercises you’ve dropped. The plan works around both.</li><li><b>Muscle recovery:</b> how rested each muscle is, from what you’ve trained lately.</li><li><b>Pain log:</b> everything you’ve reported, for spotting patterns.</li><li><b>About you</b> and <b>Your plan:</b> your details, goal and schedule.</li><li><b>Your data:</b> import from other apps, export, and backups. Everything stays on this phone.</li></ol>`); break;
      case 'injadd': sheet(`<h3>Add an injury</h3><p>Pick the joint and how bad. The plan will work around it.</p>${JOINTS.filter((j) => (E.S.joints[j.id] || 'ok') === 'ok').map((j) => `<div class="inj-pick"><span>${j.name}</span><button class="opt" data-act="injset" data-j="${j.id}" data-k="sore">Sore</button><button class="opt" data-act="injset" data-j="${j.id}" data-k="injured">Injured</button></div>`).join('') || '<div class="empty">Every joint is already flagged.</div>'}`); break;
      case 'injset': E.S.joints[el.dataset.j] = el.dataset.k; E.save(); closeSheet(); afterPlanChange(); render(); toast((JOINTS.find((j) => j.id === el.dataset.j) || {}).name + ': ' + el.dataset.k + '. Plan updated'); break;
    }
  });

  // ---------------- press and hold a chart to read values ----------------
  let scrub = null;
  function scrubAt(svg, clientX) {
    const pts = JSON.parse(svg.dataset.pts || '[]');
    if (!pts.length) return;
    const r = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal;
    const x = ((clientX - r.left) / r.width) * vb.width;
    let best = pts[0];
    for (const p of pts) if (Math.abs(p[0] - x) < Math.abs(best[0] - x)) best = p;
    const g = svg.querySelector('.scrub');
    g.style.display = '';
    const l = g.querySelector('.scrub-l'); l.setAttribute('x1', best[0]); l.setAttribute('x2', best[0]);
    const dt = g.querySelector('.scrub-d'); dt.setAttribute('cx', best[0]); dt.setAttribute('cy', best[1]);
    const unit = svg.dataset.unit;
    g.querySelector('.scrub-v').textContent = fmtW(best[3]) + (unit ? ' ' + unit : '');
    g.querySelector('.scrub-t').textContent = fmtDate(best[2], { month: 'short', day: 'numeric', year: 'numeric' });
    const tip = g.querySelector('.scrub-tip');
    const tx = Math.max(2, Math.min(vb.width - 96, best[0] - 46));
    tip.setAttribute('transform', `translate(${tx} 0)`);
  }
  document.addEventListener('touchmove', (ev) => { if (scrub) ev.preventDefault(); }, { passive: false });
  document.addEventListener('pointerdown', (ev) => {
    const svg = ev.target.closest && ev.target.closest('svg.chart[data-pts]');
    if (!svg) return;
    scrub = { svg, id: ev.pointerId };
    scrubAt(svg, ev.clientX);
  });
  document.addEventListener('pointermove', (ev) => { if (scrub && ev.pointerId === scrub.id) scrubAt(scrub.svg, ev.clientX); });
  const endScrub = (ev) => { if (!scrub || ev.pointerId !== scrub.id) return; const g = scrub.svg.querySelector('.scrub'); if (g) g.style.display = 'none'; scrub = null; };
  document.addEventListener('pointerup', endScrub);
  document.addEventListener('pointercancel', endScrub);

  // ---------------- press and hold an exercise to move it ----------------
  let drag = null, hold = null, eatClick = false;
  function startDrag(st) {
    const cards = [...app.querySelectorAll('.ex[data-i]')];
    const from = cards.indexOf(st.card);
    if (from < 0) return;
    const sy = window.scrollY;
    drag = { from, to: from, card: st.card, cards, y0: st.y + sy, lastY: st.y, mids: cards.map((c) => { const r = c.getBoundingClientRect(); return r.top + sy + r.height / 2; }), h: st.card.getBoundingClientRect().height + 10, id: st.id };
    st.card.classList.remove('pressing');
    st.card.classList.add('dragging');
    document.body.classList.add('is-dragging');
    eatClick = true;
    if (navigator.vibrate) navigator.vibrate(12);
  }
  function moveDrag(clientY) {
    drag.lastY = clientY;
    const dy = clientY + window.scrollY - drag.y0;
    drag.card.style.transform = `translateY(${dy}px) scale(1.02)`;
    const mid = drag.mids[drag.from] + dy;
    let to = drag.from;
    if (dy > 0) { for (let k = drag.from + 1; k < drag.mids.length; k++) if (mid > drag.mids[k]) to = k; }
    else { for (let k = drag.from - 1; k >= 0; k--) if (mid < drag.mids[k]) to = k; }
    drag.to = to;
    drag.cards.forEach((c, k) => {
      if (c === drag.card) return;
      const shift = drag.from < to && k > drag.from && k <= to ? -drag.h : drag.from > to && k < drag.from && k >= to ? drag.h : 0;
      c.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  }
  document.addEventListener('pointerdown', (ev) => {
    if (!E.S || ui.detail || drag) return;
    const head = ev.target.closest('.ex[data-i] .ex-head');
    if (!head || ev.target.closest('.ex-more')) return;
    const card = head.closest('.ex');
    hold = { card, id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: setTimeout(() => { if (hold) { startDrag(hold); hold = null; } }, 380) };
    card.classList.add('pressing');
  });
  const cancelHold = () => { if (hold) { clearTimeout(hold.t); hold.card.classList.remove('pressing'); hold = null; } };
  document.addEventListener('pointermove', (ev) => {
    if (hold && ev.pointerId === hold.id && Math.hypot(ev.clientX - hold.x, ev.clientY - hold.y) > 8) cancelHold();
    if (drag && ev.pointerId === drag.id) {
      drag.pendY = ev.clientY;
      if (!drag.raf) drag.raf = requestAnimationFrame(() => { if (!drag) return; drag.raf = 0; moveDrag(drag.pendY); });
    }
  });
  // While dragging, stop the page from scrolling under your finger; scroll it ourselves near the edges.
  document.addEventListener('touchmove', (ev) => { if (drag) ev.preventDefault(); }, { passive: false });
  setInterval(() => {
    if (!drag) return;
    const y = drag.lastY;
    const v = y < 110 ? -12 : y > innerHeight - 170 ? 12 : 0;
    if (v) { window.scrollBy(0, v); moveDrag(y); }
  }, 16);
  function endDrag(ev) {
    if (hold && (!ev || ev.pointerId === hold.id)) cancelHold();
    if (!drag || (ev && ev.pointerId !== drag.id)) return;
    const { from, to, cards } = drag;
    cards.forEach((c) => { c.style.transform = ''; c.classList.remove('dragging', 'pressing'); });
    document.body.classList.remove('is-dragging');
    drag = null;
    setTimeout(() => (eatClick = false), 350);
    if (to !== from) {
      const items = curPlan().items;
      const [m] = items.splice(from, 1);
      items.splice(to, 0, m);
      E.save();
      render();
    }
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);
  document.addEventListener('contextmenu', (ev) => { if (ev.target.closest && ev.target.closest('.ex-head')) ev.preventDefault(); });

  // ---------------- swipe down to close sheets and the exercise screen ----------------
  let swipe = null;
  document.addEventListener('touchstart', (ev) => {
    const el = ev.target.closest && (ev.target.closest('.sheet') || ev.target.closest('#detail .detail'));
    if (!el || ev.target.closest('svg.chart') || ev.target.closest('.hero-fig')) return;
    const inner = ev.target.closest('.howto-scroll');
    if (inner && inner.scrollTop > 0) return;
    if (el.scrollTop > 0) return;
    swipe = { el, y: ev.touches[0].clientY, dy: 0, sheet: el.classList.contains('sheet'), lastY: ev.touches[0].clientY, dir: 0, t: Date.now(), v: 0 };
  }, { passive: true });
  document.addEventListener('touchmove', (ev) => {
    if (!swipe || drag) return;
    const cy = ev.touches[0].clientY, dy = cy - swipe.y, now = Date.now();
    if (Math.abs(cy - swipe.lastY) > 0.5) { swipe.dir = cy > swipe.lastY ? 1 : -1; swipe.v = (cy - swipe.lastY) / Math.max(1, now - swipe.t); }
    swipe.lastY = cy; swipe.t = now;
    if (swipe.el.scrollTop > 0 || dy < 0) { if (!swipe.dy) { swipe = null; return; } }
    swipe.dy = Math.max(0, dy);
    if (swipe.dy > 6) { ev.preventDefault(); swipe.el.style.transition = 'none'; swipe.el.style.transform = `translateY(${swipe.dy}px)`; }
  }, { passive: false });
  document.addEventListener('touchend', () => {
    if (!swipe) return;
    const { el, dy, sheet: isSheet, dir, v } = swipe;
    swipe = null;
    el.style.transition = 'transform .22s ease';
    // closes only if you were still pulling down when you let go (or flicked down fast); any move back up keeps it open
    if ((dy > 110 && dir > 0) || (dy > 30 && v > 0.9)) {
      el.style.transform = 'translateY(100%)';
      setTimeout(() => { el.style.transition = ''; el.style.transform = ''; if (isSheet) overlay.innerHTML = ''; else { ui.detail = null; detailEl.textContent = ''; document.body.classList.remove('noscroll'); render(); } }, 200);
    } else { el.style.transform = ''; setTimeout(() => (el.style.transition = ''), 230); }
  });

  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset && t.dataset.f) {
      const v = parseFloat(t.value);
      if (!isNaN(v)) updateSet(+t.dataset.i, +t.dataset.j, t.dataset.f, t.dataset.f === 'r' ? Math.round(v) : v);
      render();
    } else if (t.id === 'age-in' || t.id === 'ht-ft' || t.id === 'ht-in') {
      const P = E.S.profile;
      if (t.id === 'age-in') { const v = parseInt(t.value, 10); P.age = v > 10 && v < 100 ? v : null; toast(P.age ? 'Saved: age ' + P.age : 'Type an age between 11 and 99'); }
      else { const ft = parseInt(($('#ht-ft') || {}).value, 10) || 0, inch = parseInt(($('#ht-in') || {}).value, 10) || 0; P.heightIn = ft ? ft * 12 + inch : null; if (P.heightIn) toast('Saved: ' + ft + ' ft ' + inch + ' in'); }
      E.save(); render();
    } else if (t.id === 'steps-in') {
      const v = parseInt(t.value.replace(/\D/g, ''), 10) || 0;
      E.S.steps[todayKey()] = v; E.save(); render();
    } else if (t.id === 'filebk' || t.id === 'filefb') {
      const f = t.files[0];
      t.value = ''; // so picking the same file again still works
      if (!f) return;
      f.text().then((txt) => {
        try {
          if (t.id === 'filebk') { E.importJSON(txt); toast('Backup restored'); }
          else { const r = E.importHistory(txt); toast('Added ' + r.added + ' workouts' + (r.app !== 'CSV' ? ' from ' + r.app : '') + (r.unknown.length ? '. ' + r.unknown.length + ' exercises kept as custom' : '')); }
          ui.plan = null; render();
        } catch (e) { toast(e.message || 'Couldn’t read that file'); }
      });
    }
  });
  document.addEventListener('input', (ev) => {
    if (ev.target.id === 'su-name' && ui.setup) ui.setup.name = ev.target.value;
    if (ev.target.id === 'lib-q' && ui.detail) {
      ui.detail.q = ev.target.value;
      const pos = ev.target.selectionStart;
      renderDetail();
      const q = $('#lib-q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); }
    }
    if (ev.target.id === 'rep-q' && ui.detail) {
      ui.detail.q = ev.target.value;
      const pos = ev.target.selectionStart;
      renderDetail();
      const q = $('#rep-q'); if (q) { q.focus(); q.setSelectionRange(pos, pos); }
    }
  });
  document.addEventListener('focusin', (ev) => { if (ev.target.matches && ev.target.matches('.field input')) setTimeout(() => ev.target.select(), 0); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  keepAwake();
  render();
  window.addEventListener('figthumbs', () => E.S && render());
  if (window.Figure3D) Figure3D.warm();
})();
