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
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
  const info = (id) => (window.EXINFO && EXINFO[id]) || { m: [], s: [], steps: [], img: 0 };
  const imgSrc = (id, k) => 'img/ex/' + id + '-' + (k || 0) + '.jpg';

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
  const DB_CHOICES = [2.5, 3, 5, 8, 10, 12, 15, 20, 25, 30, 35, 40, 50];
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
        <div class="chips">${DB_CHOICES.map((w) => `<button class="chip ${s.dumbbells.includes(w) ? 'on' : ''}" data-act="sudb" data-v="${w}">${w} lb</button>`).join('')}</div>` : ''}

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
        <h1>${esc(day.name)}</h1>
      </div></div>
      <div class="sub">Block ${plan.block + 1}, week ${plan.week + 1} of 4. About ${plan.estMin} min, ${plan.items.length} exercises${day.circuit ? ', done as a circuit' : ''}.</div>
      ${blockBar(plan.week)}
      ${avoidNote(plan.day)}
      ${stepCard()}
      ${order.length > 1 ? `<div class="chips" style="margin-top:16px">${order.map((k) => `<button class="chip ${plan.day === k ? 'on' : ''}" data-act="pickday" data-k="${k}">${DAYS[k].name}</button>`).join('')}</div>` : ''}
      ${plan.items.map((it, i) => previewCard(it, i)).join('')}
      <div class="cta-dock"><button class="btn-main" data-act="start">Start workout</button></div>`;
  }
  function previewCard(it, i) {
    const ex = E.exInfo(it.ex);
    return `<div class="ex" data-i="${i}" data-key="ex-${it.ex}"><div class="ex-head">
      <button class="ex-open" data-act="detail" data-i="${i}">${thumb(it.ex)}
        <span class="ex-main"><span class="ex-name">${esc(ex.name)}</span>
        <span class="ex-meta">${setLine(ex, it)}${it.first ? ' <span class="first">New lift: start light</span>' : ''}${it.maxed ? ' <span class="first">Ready for heavier weights</span>' : ''}</span></span></button>
      <span class="drag" data-drag="${i}" aria-label="Drag to reorder" role="button">${GRIP}</span>
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
        <div class="kicker">${E.schemeFor(c.week).name} week</div>
        <h1>${esc(day.name)}</h1>
      </div><div class="elapsed" id="elapsed">${mmss((Date.now() - new Date(c.startedAt)) / 1000)}</div></div>
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
        <span class="drag" data-drag="${i}" aria-label="Drag to reorder" role="button">${GRIP}</span>
        <button class="ex-more" data-act="exmenu" data-i="${i}" aria-label="Options for ${esc(ex.name)}">⋯</button>
      </div>
      ${!done || it.open ? setRows(it, i, true) : ''}
    </div>`;
  }

  // ---------------- exercise detail (photo, How-to, History, Replace, More) ----------------
  let flipTimer = null;
  function openDetail(i, view) {
    ui.detail = { i, view: view || 'main', tab: 0, q: '' };
    renderDetail();
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
  function renderDetail() {
    clearInterval(flipTimer);
    const d = ui.detail;
    if (!d || !E.S) { hideDetail(); return; }
    const plan = curPlan();
    const it = plan.items[d.i];
    if (!it) { ui.detail = null; hideDetail(); return; }
    document.body.classList.add('noscroll');
    const ex = E.exInfo(it.ex);
    const inf = info(it.ex);
    let body = '';
    const head = (title) => `<div class="dv-bar"><button class="dv-back" data-act="dview" data-v="main" aria-label="Back">‹</button><span>${title}</span><span style="width:40px"></span></div>`;
    if (d.view === 'main') {
      const fig = window.Figure3D && Figure3D.has(it.ex) && !Figure3D.failed;
      body = `<div class="hero ${fig ? 'figbg' : ''}">${fig ? `<div class="hero-fig" data-keep data-fig="${it.ex}" data-key="fig-${it.ex}"></div>` : inf.img ? `<img id="hero-img" src="${imgSrc(it.ex, 0)}" alt="${esc(ex.name)}">` : `<div class="hero-none">${muscleMap(inf.m.length ? inf.m : [ex.group.toLowerCase()], inf.s)}</div>`}
          <button class="dv-close" data-act="dclose" aria-label="Close">✕</button>
          <div class="hero-foot"><h2 class="hero-name">${esc(ex.name)}</h2><button class="howto-btn" data-act="dview" data-v="howto">▶ How-to</button></div></div>
        <div class="dchips">
          <button class="dchip" data-act="restpick">⏱ ${mmss(it.rest)} rest</button>
          <button class="dchip" data-act="dview" data-v="history">History</button>
          <button class="dchip" data-act="dview" data-v="replace">Replace</button>
          <button class="dchip" data-act="dview" data-v="more">More</button>
        </div>
        <div class="dpad">
          <div class="muscle-line">${esc(muscleLine(it.ex))}</div>
          ${coachLine(it)}
          ${E.S.notes[it.ex] ? `<div class="note-show">Your note: ${esc(E.S.notes[it.ex])}</div>` : ''}
          ${setRows(it, d.i, !!E.S.current)}
          ${E.S.current ? '' : '<div class="sub" style="margin-top:8px">Start the workout to check off sets.</div>'}
        </div>`;
    } else if (d.view === 'howto') {
      const tabs = ['Instructions', 'Target', 'Equipment'];
      const eqNames = ex.eq.length ? ex.eq.map((k) => (EQUIPMENT.find((e) => e.id === k) || { name: k }).name) : ['None. Just you.'];
      body = `${head('How-to')}
        ${window.Figure3D && Figure3D.has(it.ex) && !Figure3D.failed ? `<div class="howto-img figbg"><div class="hero-fig" data-keep data-fig="${it.ex}" data-key="figh-${it.ex}"></div></div>` : inf.img ? `<div class="howto-img"><img id="hero-img" src="${imgSrc(it.ex, 0)}" alt=""></div>` : ''}
        <div class="dpad"><h2 class="dv-title">${esc(ex.name)}</h2>
        <div class="seg seg3">${tabs.map((t, k) => `<button class="${d.tab === k ? 'on' : ''}" data-act="dtab" data-k="${k}">${t}</button>`).join('')}</div>
        ${d.tab === 0 ? `<ol class="steps-list">${(inf.steps.length ? inf.steps : ['Move slowly and with control through the full range you can do without pain.']).map((s) => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
        ${d.tab === 1 ? `<div class="target">${muscleMap(inf.m.length ? inf.m : [ex.group.toLowerCase()], inf.s)}<div class="tlegend"><span><i class="lg p"></i>Main: ${esc((inf.m.length ? inf.m : [ex.group]).map(cap).join(', '))}</span>${inf.s.length ? `<span><i class="lg s"></i>Also: ${esc(inf.s.map(cap).join(', '))}</span>` : ''}</div></div>` : ''}
        ${d.tab === 2 ? `<ul class="eq-list">${eqNames.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : ''}
        </div>`;
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
        }).join('') : `${ex.unit === 'lb' ? `<div class="card"><div class="sub">Est. 1-rep max</div><div class="big-num" style="font-size:52px">${Math.round(series[series.length - 1].v)}<small>lb</small></div>${series.length > 1 ? lineChart(series, { h: 150 }) : '<div class="empty">Log it again to start the chart.</div>'}</div>` : ''}
          <div class="card"><div class="sub">${ex.unit === 'lb' ? 'Top weight' : ex.unit === 'sec' ? 'Longest round' : 'Best set'}</div><div class="big-num" style="font-size:52px">${fmtW(wSeries[wSeries.length - 1].v)}<small>${ex.unit === 'lb' ? 'lb' : ex.unit === 'sec' ? 'sec' : 'reps'}</small></div>${wSeries.length > 1 ? lineChart(wSeries, { h: 150 }) : ''}</div>`}
        </div>`;
    } else if (d.view === 'replace') {
      const opts = E.swapOptions(plan, d.i);
      const q = (d.q || '').toLowerCase();
      const all = q ? EXERCISES.filter((e) => E.allowed(e) && e.id !== it.ex && (e.name.toLowerCase().includes(q) || e.group.toLowerCase().includes(q))) : opts;
      body = `<div class="dv-bar"><span style="width:40px"></span><span>Replace ${esc(ex.name)}</span><button class="dv-back" data-act="dview" data-v="main" aria-label="Close">✕</button></div>
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
    detailEl.innerHTML = `<div class="detail" role="dialog" aria-modal="true" aria-label="${esc(ex.name)}"><div class="dv-body ${d.view === 'main' ? 'v-main' : 'v-sub'}" data-key="v-${d.view}-${d.i}">${body}</div></div>`;
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
    if (over && !t.beeped) { t.beeped = true; E.save(); beep(); }
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
  function liftSheet(id) {
    const ex = E.exInfo(id);
    const series = E.liftSeries(id);
    const best = Math.max(...series.map((p) => p.v));
    const label = ex.unit === 'lb' ? 'Est. 1-rep max' : ex.unit === 'sec' ? 'Longest round' : 'Best set';
    sheet(`<h3>${esc(ex.name)}</h3>
      <p>${label}: ${Math.round(best)} ${ex.unit === 'lb' ? 'lb' : ex.unit === 'sec' ? 'sec' : 'reps'} best</p>
      ${series.length > 1 ? lineChart(series, { h: 170 }) : '<div class="empty">Do this one again to start its chart.</div>'}
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
        : `<div class="big-num">100<small>strength index</small></div><div class="empty">Your chart starts once you repeat a lift. Each lift starts at 100 and the number climbs as you get stronger.</div>`}
      </div>
      ${groups.length ? `<h2>By muscle</h2><div class="card">${groups.map((x) => { const last = x.s[x.s.length - 1].v; return `<div class="lift"><div class="nm">${x.g}</div>${spark(x.s.slice(-8))}<div class="val">${Math.round(last)}</div></div>`; }).join('')}</div>` : ''}
      <h2>Sets this week</h2>
      <div class="card bars">${E.GROUPS.map((g) => { const n = week[g], t = E.WEEKLY_TARGET[g]; return `<div class="b"><span>${g}</span><div class="track"><div class="fill ${n >= t ? 'met' : ''}" style="width:${Math.min(100, (n / t) * 100)}%"></div></div><span class="n">${n} / ${t}</span></div>`; }).join('')}</div>
      <h2>Lifts</h2>
      <div class="card">${lifts.length ? lifts.map((l) => { const last = l.s[l.s.length - 1]; const first = l.s[0]; const d = last.v - first.v; return `<button class="lift" data-act="lift" data-id="${l.id}">${thumb(l.id, 'thumb sm')}<div class="nm">${esc(l.ex.name)}<small>${l.s.length} session${l.s.length > 1 ? 's' : ''}${l.s.length > 1 && d ? `, <span class="${d > 0 ? 'delta-up' : 'delta-down'}">${d > 0 ? '+' : ''}${Math.round(d)}</span>` : ''}</small></div>${spark(l.s)}<div class="val">${Math.round(last.v)}<small style="color:var(--muted)">${l.ex.unit === 'lb' ? 'est. max' : l.ex.unit === 'sec' ? 'sec' : 'reps'}</small></div></button>`; }).join('') : '<div class="empty">No lifts in this range.</div>'}</div>`;
  }

  // ---------------- body ----------------
  function renderBody() {
    const S = E.S;
    const P = S.profile;
    const bans = Object.keys(S.bans).filter(E.banActive);
    const sore = JOINTS.filter((j) => S.joints[j.id] !== 'ok');
    app.innerHTML = `<div class="top"><div><div class="kicker">${P.name ? esc(P.name) + ': ' : ''}joints, pain and setup</div><h1>Body</h1></div></div>
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

      <h2>Your plan</h2>
      <div class="lbl">Goal</div>
      <div class="chips">${Object.keys(GOALS).map((k) => `<button class="chip ${P.goal === k ? 'on' : ''}" data-act="prof" data-k="goal" data-v="${k}">${GOALS[k].name}</button>`).join('')}</div>
      <div class="lbl">Weekly plan</div>
      <div class="chips">${Object.keys(SPLITS).map((k) => `<button class="chip ${P.split === k ? 'on' : ''}" data-act="prof" data-k="split" data-v="${k}">${SPLITS[k].name}</button>`).join('')}</div>
      <div class="lbl">Workout length</div>
      <div class="chips">${[30, 40, 45, 60, 75, 90].map((m) => `<button class="chip ${S.settings.minutes === m ? 'on' : ''}" data-act="mins" data-k="${m}">${m} min</button>`).join('')}</div>
      <div class="lbl">Daily step goal</div>
      <div class="chips">${[0, 6000, 8000, 10000, 12000].map((n) => `<button class="chip ${P.stepGoal === n ? 'on' : ''}" data-act="prof" data-k="stepGoal" data-v="${n}">${n ? n.toLocaleString() : 'Off'}</button>`).join('')}</div>

      <h2>Your equipment</h2>
      <div class="card">${EQUIPMENT.map((e) => `<div class="toggle"><span>${esc(e.name)}</span><button class="sw ${S.settings.equipment[e.id] ? 'on' : ''}" data-act="eq" data-k="${e.id}" role="switch" aria-checked="${!!S.settings.equipment[e.id]}" aria-label="${esc(e.name)}"></button></div>`).join('')}</div>
      ${S.settings.equipment.dumbbell ? `<div class="lbl">Dumbbells you own <span class="lbl-sub">${S.settings.dumbbells ? '' : 'Off: a full gym rack'}</span></div>
      <div class="chips">${DB_CHOICES.map((w) => `<button class="chip ${S.settings.dumbbells && S.settings.dumbbells.includes(w) ? 'on' : ''}" data-act="dbown" data-v="${w}">${w} lb</button>`).join('')}<button class="chip ${S.settings.dumbbells ? '' : 'on'}" data-act="dbrack">Full rack</button></div>` : ''}

      <h2>Your data</h2>
      <div class="sub">Everything is saved on this phone only. Back it up now and then.</div>
      <button class="btn-quiet" data-act="export">Save a backup</button>
      <button class="btn-quiet" data-act="importbk">Restore a backup</button>
      <button class="btn-quiet" data-act="importfb">Bring in Fitbod history (CSV)</button>
      <button class="btn-quiet btn-danger" data-act="reset">Erase everything and start over</button>
      <input type="file" id="filebk" accept=".json,application/json" hidden>
      <input type="file" id="filefb" accept=".csv,text/csv" hidden>
      <div class="sub" style="margin:22px 4px 0;color:var(--dim)">Get F*ing Jacked! v1.6</div>`;
  }

  // ---------------- actions ----------------
  function updateSet(i, j, field, val) {
    const plan = curPlan();
    const it = plan.items[i];
    it.sets[j][field] = val;
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
    const el = ev.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
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
        if (opts.length) E.swapTo(plan, i, opts[0].id); else plan.items.splice(i, 1);
        E.save(); closeSheet(); ui.detail = null; render(); toast('Got it. ' + E.exInfo(id).name + ' won’t come up again'); break;
      }
      case 'rmex': { const plan = curPlan(); plan.items.splice(i, 1); E.save(); closeSheet(); ui.detail = null; render(); break; }
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
      case 'lift': liftSheet(el.dataset.id); break;
      case 'joint': E.S.joints[el.dataset.j] = el.dataset.k; E.save(); afterPlanChange(); render(); break;
      case 'unban': E.unban(el.dataset.id); afterPlanChange(); render(); break;
      case 'mins': E.S.settings.minutes = +el.dataset.k; E.save(); afterPlanChange(); render(); break;
      case 'prof': { const v = el.dataset.v; E.S.profile[el.dataset.k] = isNaN(+v) ? v : +v; if (el.dataset.k === 'split') { E.S.rotIdx = 0; ui.planDay = null; } E.save(); afterPlanChange(); render(); break; }
      case 'eq': E.S.settings.equipment[el.dataset.k] = !E.S.settings.equipment[el.dataset.k]; E.save(); afterPlanChange(); render(); break;
      case 'dbown': { const w = +el.dataset.v; const cur = E.S.settings.dumbbells || []; const nx = cur.includes(w) ? cur.filter((x) => x !== w) : cur.concat(w).sort((a, b) => a - b); E.S.settings.dumbbells = nx.length ? nx : null; E.save(); afterPlanChange(); render(); break; }
      case 'dbrack': E.S.settings.dumbbells = null; E.save(); afterPlanChange(); render(); break;
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
      case 'reset': if (confirm('Erase all workouts, pain notes and settings on this phone? This can’t be undone.')) { localStorage.removeItem('spotter.v1'); location.reload(); } break;
    }
  });

  // ---------------- drag to reorder ----------------
  let drag = null;
  document.addEventListener('pointerdown', (ev) => {
    const h = ev.target.closest('[data-drag]');
    if (!h || !E.S) return;
    ev.preventDefault();
    const cards = [...app.querySelectorAll('.ex[data-i]')];
    const from = +h.dataset.drag;
    const card = cards[from];
    if (!card) return;
    const sy = window.scrollY;
    drag = { from, to: from, card, cards, y0: ev.pageY, mids: cards.map((c) => { const r = c.getBoundingClientRect(); return r.top + sy + r.height / 2; }), h: card.getBoundingClientRect().height + 10, id: ev.pointerId };
    card.classList.add('dragging');
    document.body.classList.add('is-dragging');
    try { h.setPointerCapture(ev.pointerId); } catch (e) {}
  });
  document.addEventListener('pointermove', (ev) => {
    if (!drag || ev.pointerId !== drag.id) return;
    if (ev.clientY < 90) window.scrollBy(0, -10); else if (ev.clientY > innerHeight - 150) window.scrollBy(0, 10);
    const dy = ev.pageY - drag.y0;
    drag.card.style.transform = `translateY(${dy}px)`;
    const mid = drag.mids[drag.from] + dy;
    let to = drag.from;
    drag.mids.forEach((m, k) => { if (k > drag.from && mid > m) to = k; if (k < drag.from && mid < m && to >= drag.from) to = k; });
    if (mid < drag.mids[drag.from]) { to = drag.from; for (let k = drag.from - 1; k >= 0; k--) if (mid < drag.mids[k]) to = k; }
    drag.to = to;
    drag.cards.forEach((c, k) => {
      if (c === drag.card) return;
      const shift = drag.from < to && k > drag.from && k <= to ? -drag.h : drag.from > to && k < drag.from && k >= to ? drag.h : 0;
      c.style.transform = shift ? `translateY(${shift}px)` : '';
    });
  });
  function endDrag(ev) {
    if (!drag || (ev && ev.pointerId !== drag.id)) return;
    const { from, to, cards } = drag;
    cards.forEach((c) => { c.style.transform = ''; c.classList.remove('dragging'); });
    document.body.classList.remove('is-dragging');
    drag = null;
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

  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.dataset && t.dataset.f) {
      const v = parseFloat(t.value);
      if (!isNaN(v)) updateSet(+t.dataset.i, +t.dataset.j, t.dataset.f, t.dataset.f === 'r' ? Math.round(v) : v);
      render();
    } else if (t.id === 'steps-in') {
      const v = parseInt(t.value.replace(/\D/g, ''), 10) || 0;
      E.S.steps[todayKey()] = v; E.save(); render();
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
  document.addEventListener('input', (ev) => {
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
