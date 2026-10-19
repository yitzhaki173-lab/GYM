/* ICON GYM — main app */
(function () {
  'use strict';
  const APP_VERSION = '1.0.0';
  const { PROGRAM_VERSION, GROUPS, LIBRARY, defaultDays } = window.GymProgram;
  const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
  const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
  const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
  const KEY = 'icongym.v1';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------------- state ----------------
  const todayISO = () => new Date().toISOString();
  function fresh() {
    return {
      schema: 1, programVersion: PROGRAM_VERSION, days: defaultDays(), history: [], active: null,
      body: { height: 177, weights: [{ date: todayISO(), kg: 79 }], protein: '130–160' },
      settings: { autoRest: true, sound: true, vibrate: true, wakeLock: true },
    };
  }
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && Array.isArray(s.days)) {
        const f = fresh();
        s.settings = Object.assign(f.settings, s.settings || {});
        s.body = Object.assign(f.body, s.body || {});
        s.history = s.history || [];
        return s;
      }
    } catch (e) { /* ignore */ }
    return fresh();
  }
  let S = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('⚠️ השמירה נכשלה – הזיכרון מלא?'); }
  }

  // ---------------- utils ----------------
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = (p = 'x') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const firstNum = (s) => { const m = String(s || '').match(/\d+(\.\d+)?/); return m ? m[0] : ''; };
  const range = (s) => { const m = String(s || '').match(/(\d+)\s*[–\-]\s*(\d+)/); if (m) return [+m[1], +m[2]]; const n = firstNum(s); return n ? [+n, +n] : [0, 0]; };
  const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };
  const fmtNum = (n) => (Math.round(n * 10) / 10).toLocaleString('he-IL');
  const dayOf = (dow) => S.days.find((d) => d.dow === +dow);
  const findEx = (id) => { for (const d of S.days) { const e = d.exercises.find((x) => x.id === id); if (e) return { day: d, ex: e }; } return {}; };
  const fmtDate = (iso, withYear) => { const d = new Date(iso); return `${DAY_NAMES[d.getDay()]}, ${d.getDate()} ב${MONTHS[d.getMonth()]}${withYear ? ' ' + d.getFullYear() : ''}`; };
  const fmtShort = (iso) => { const d = new Date(iso); return `${d.getDate()}.${d.getMonth() + 1}`; };
  const fmtDur = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(sec).padStart(2, '0'); };
  const startOfWeek = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };
  const totalSets = (day) => day.exercises.reduce((a, e) => a + (+e.sets || 0), 0);
  const e1rm = (w, r) => (r > 0 ? w * (1 + Math.min(r, 15) / 30) : w);
  const unitLabel = (ex) => (ex.kind === 'time' ? 'שנ׳' : ex.kind === 'cardio' ? 'דק׳' : 'ק״ג');
  const vibrate = (p) => { if (S.settings.vibrate && navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} };

  // history helpers
  function sessionsFor(lib) {
    const out = [];
    for (let i = S.history.length - 1; i >= 0; i--) {
      const h = S.history[i];
      const it = h.items.find((x) => x.lib === lib);
      if (it) out.push({ h, it });
    }
    return out; // newest first
  }
  const lastFor = (lib) => sessionsFor(lib)[0];
  function bestOf(it) {
    let best = null;
    it.sets.forEach((s) => { const w = num(s.w), r = num(s.r); if (!best || w > best.w || (w === best.w && r > best.r)) best = { w, r }; });
    return best || { w: 0, r: 0 };
  }
  const volOf = (it) => (it.kind && it.kind !== 'reps' ? 0 : it.sets.reduce((a, s) => a + num(s.w) * num(s.r), 0));

  // ---------------- toast / sheets / dialogs ----------------
  function toast(msg, action) {
    const host = $('#toasts');
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = `<span>${msg}</span>${action ? `<button>${esc(action.label)}</button>` : ''}`;
    if (action) t.querySelector('button').onclick = () => { action.run(); t.remove(); };
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 300); }, action ? 8000 : 2600);
  }

  let sheetStack = [];
  function openSheet(html, onMount, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet-bg"></div><div class="sheet ${opts.tall ? 'tall' : ''}" role="dialog"><div class="sheet-grab"></div><button class="sheet-x" data-close aria-label="סגור">✕</button><div class="sheet-body">${html}</div></div>`;
    document.body.appendChild(wrap);
    document.body.classList.add('noscroll');
    const close = () => {
      wrap.classList.remove('in');
      setTimeout(() => { wrap.remove(); if (!$('.sheet-wrap')) document.body.classList.remove('noscroll'); }, 280);
      sheetStack = sheetStack.filter((x) => x !== api);
      if (opts.onClose) opts.onClose();
    };
    const api = { el: wrap, body: $('.sheet-body', wrap), close };
    wrap.addEventListener('click', (e) => { if (e.target.classList.contains('sheet-bg') || e.target.closest('[data-close]')) close(); });
    // swipe down to close
    const sh = $('.sheet', wrap); let y0 = null, dy = 0;
    $('.sheet-grab', wrap).addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    wrap.addEventListener('touchmove', (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${dy}px)`; }, { passive: true });
    wrap.addEventListener('touchend', () => { if (y0 == null) return; sh.style.transform = ''; if (dy > 90) close(); y0 = null; dy = 0; });
    sheetStack.push(api);
    requestAnimationFrame(() => wrap.classList.add('in'));
    if (onMount) onMount(api);
    fixBidi(wrap);
    mountAnims(wrap);
    return api;
  }

  function confirmDlg(title, text, ok = 'אישור', danger = false) {
    return new Promise((res) => {
      const s = openSheet(`<div class="dlg"><h3>${title}</h3>${text ? `<p class="muted">${text}</p>` : ''}
        <div class="row gap"><button class="btn ${danger ? 'danger' : 'primary'} grow" data-ok>${ok}</button><button class="btn ghost grow" data-close>ביטול</button></div></div>`,
        (api) => { $('[data-ok]', api.el).onclick = () => { res(true); api.close(); }; }, { onClose: () => res(false) });
      return s;
    });
  }

  // numeric ranges ("8–12", "3 × 8–12", "12×10") must read left-to-right inside Hebrew text
  const NUM_RUN = /\d[\d.,°]*(?:\s*[×x–\-]\s*\d[\d.,°]*)+/g;
  function fixBidi(root) {
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (tw.nextNode()) { NUM_RUN.lastIndex = 0; if (NUM_RUN.test(tw.currentNode.nodeValue)) nodes.push(tw.currentNode); }
    nodes.forEach((n) => { if (!n.parentNode.closest('svg')) n.nodeValue = n.nodeValue.replace(NUM_RUN, '\u2066$&\u2069'); });
  }

  function mountAnims(root) {
    $$('[data-anim]', root).forEach((n) => { if (!n.firstChild) window.GymAnim.mount(n, n.dataset.anim); });
  }

  // ---------------- icons ----------------
  const I = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
    hist: '<svg viewBox="0 0 24 24"><path d="M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 4v4.5H8"/></svg>',
    chart: '<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
    back: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
    chev: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" fill="currentColor"/></svg>',
    flag: '<svg viewBox="0 0 24 24"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
    timer: '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    fire: '<svg viewBox="0 0 24 24"><path d="M12 22c4 0 7-2.7 7-6.8 0-4.6-4-6.7-4.6-11.2-2.4 1.6-4 4.2-4 6.8C9 9.6 8.2 8.3 8 7c-2 1.9-3 4.6-3 8.2C5 19.3 8 22 12 22z"/></svg>',
    trophy: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>',
    dl: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    ul: '<svg viewBox="0 0 24 24"><path d="M12 20V9M7 14l5-5 5 5M5 4h14"/></svg>',
    refresh: '<svg viewBox="0 0 24 24"><path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/></svg>',
    info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="19" cy="12" r="1.6" fill="currentColor"/></svg>',
  };

  // ---------------- routing ----------------
  let editMode = false;
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const [a, b, c] = h.split('/');
    return { a: a || 'home', b, c };
  }
  function go(path) { location.hash = '#/' + path; }

  function render() {
    const r = route();
    const main = $('#main');
    let html = '';
    if (r.a === 'day' && dayOf(r.b)) html = viewDay(dayOf(r.b));
    else if (r.a === 'history' && r.b) html = viewSession(r.b);
    else if (r.a === 'history') html = viewHistory();
    else if (r.a === 'progress' && r.b) html = viewExerciseProgress(decodeURIComponent(r.b));
    else if (r.a === 'progress') html = viewProgress();
    else if (r.a === 'settings') html = viewSettings();
    else html = viewHome();
    main.innerHTML = html;
    main.dataset.view = r.a;
    const tab = r.a === 'day' ? 'home' : r.a;
    $$('.tab').forEach((t) => t.classList.toggle('on', t.dataset.tab === tab));
    fixBidi(main);
    mountAnims(main);
    tickElapsed();
    renderActiveChip();
  }

  window.addEventListener('hashchange', () => { editMode = false; render(); window.scrollTo(0, 0); });

  // ---------------- HOME ----------------
  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'לילה טוב'; if (h < 12) return 'בוקר טוב'; if (h < 17) return 'צהריים טובים'; if (h < 21) return 'ערב טוב'; return 'לילה טוב';
  }
  function weekDone() {
    const s = startOfWeek().getTime();
    const done = new Set();
    S.history.forEach((h) => { if (new Date(h.date).getTime() >= s) done.add(h.dow); });
    return done;
  }
  function dayMeta(d) {
    if (d.type === 'rest') return 'מנוחה והתאוששות';
    if (d.type === 'cardio') { const m = Math.max(0, ...d.exercises.map((e) => num(firstNum(e.reps)))); return `אימון אירובי${m ? ` · ~${m} דק׳` : ''} · בחר פעילות`; }
    const mins = Math.round(d.exercises.reduce((a, e) => a + e.sets * ((+e.rest || 90) + 40), 0) / 60);
    return `${d.exercises.length} תרגילים · ${totalSets(d)} סטים · ~${mins} דק׳`;
  }

  function viewHome() {
    const now = new Date();
    const today = dayOf(now.getDay());
    const done = weekDone();
    const strengthDays = S.days.filter((d) => d.type === 'strength').length;
    const weekStrength = [...done].filter((dw) => (dayOf(dw) || {}).type === 'strength').length;
    const s = startOfWeek().getTime();
    const weekVol = S.history.filter((h) => new Date(h.date).getTime() >= s).reduce((a, h) => a + h.items.reduce((b, it) => b + volOf(it), 0), 0);
    const act = S.active;
    const programUpdate = S.programVersion < PROGRAM_VERSION;
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;

    return `
    <header class="hero-top">
      <div>
        <div class="eyebrow">${I.pin} ICON חולון</div>
        <h1>${greeting()} 💪</h1>
        <div class="muted">${fmtDate(now.toISOString())}</div>
      </div>
      <div class="logo-badge"><img src="icons/icon-192.png" alt=""></div>
    </header>

    ${programUpdate ? `<div class="banner"><div><b>עדכון לתוכנית האימונים זמין</b><div class="muted small">ההיסטוריה והמשקלים שלך נשמרים</div></div><div class="row gap"><button class="btn sm primary" data-act="program-update">עדכן</button><button class="btn sm ghost" data-act="program-skip">לא עכשיו</button></div></div>` : ''}
    ${!standalone && !localStorage.getItem('icongym.installHint') ? `<div class="banner soft"><div><b>התקן כאפליקציה 📲</b><div class="muted small">${isIOS() ? 'בספארי: כפתור השיתוף ← "הוסף למסך הבית"' : 'הוסף למסך הבית לחוויה מלאה וללא דפדפן'}</div></div><div class="row gap">${deferredInstall ? '<button class="btn sm primary" data-act="install">התקן</button>' : ''}<button class="btn sm ghost" data-act="hide-install">הבנתי</button></div></div>` : ''}

    ${act ? (() => { const d = dayOf(act.dow); return `<a class="today-card c-${d.color} live" href="#/day/${d.dow}">
        <div class="tc-top"><span class="pill live-pill"><i></i> אימון פעיל</span><span class="tc-time" data-elapsed>${fmtDur(Date.now() - act.start)}</span></div>
        <div class="tc-code">${esc(d.code)}</div><div class="tc-title">${esc(d.title)}</div>
        <div class="tc-bar"><i style="width:${activeProgress() * 100}%"></i></div>
        <div class="tc-cta">המשך אימון ${I.chev}</div></a>`; })() : `
    <a class="today-card c-${today.color}" href="#/day/${today.dow}">
      <div class="tc-top"><span class="pill">היום · ${DAY_NAMES[today.dow]}</span>${done.has(today.dow) ? '<span class="pill ok">✓ בוצע</span>' : ''}</div>
      <div class="tc-code">${esc(today.code)}</div>
      <div class="tc-title">${esc(today.title)}</div>
      <div class="tc-meta">${dayMeta(today)}</div>
      ${today.type !== 'rest' ? `<div class="tc-cta">${today.type === 'cardio' ? 'פתח' : 'התחל אימון'} ${I.chev}</div>` : '<div class="tc-cta soft">זמן לטעון את הסוללות 🔋</div>'}
      <div class="tc-anim" data-anim="${today.type === 'rest' ? 'plank' : (today.exercises[0] || {}).anim || 'run'}"></div>
    </a>`}

    <section class="stats3">
      <div class="stat"><b>${weekStrength}<small>/${strengthDays}</small></b><span>אימוני כוח השבוע</span></div>
      <div class="stat"><b>${S.history.length}</b><span>סה״כ אימונים</span></div>
      <div class="stat"><b>${weekVol >= 1000 ? fmtNum(weekVol / 1000) + '<small>t</small>' : fmtNum(weekVol)}</b><span>נפח השבוע (ק״ג)</span></div>
    </section>

    <div class="sec-h"><h2>השבוע שלי</h2></div>
    <div class="week">
      ${S.days.map((d) => `<a href="#/day/${d.dow}" class="wd c-${d.color} ${d.dow === now.getDay() ? 'today' : ''} ${done.has(d.dow) ? 'done' : ''}">
        <span class="wd-n">${DAY_SHORT[d.dow]}</span><span class="wd-c">${d.type === 'rest' ? '😴' : d.type === 'cardio' ? '⚽' : esc(d.code)}</span><span class="wd-dot">${done.has(d.dow) ? I.check : ''}</span></a>`).join('')}
    </div>

    <div class="sec-h"><h2>תוכנית האימונים</h2><span class="muted small">לחץ על יום לפתיחה</span></div>
    <div class="days">
      ${S.days.map((d) => `<a href="#/day/${d.dow}" class="day-row c-${d.color}">
        <div class="dr-badge">${d.type === 'rest' ? '😴' : d.type === 'cardio' ? '⚽' : esc(d.code)}</div>
        <div class="dr-main"><div class="dr-name">יום ${DAY_NAMES[d.dow]}${d.dow === now.getDay() ? ' <span class="tag">היום</span>' : ''}</div><div class="dr-title">${esc(d.title)}</div><div class="dr-meta">${dayMeta(d)}</div></div>
        <div class="dr-go">${done.has(d.dow) ? `<span class="okc">${I.check}</span>` : I.chev}</div></a>`).join('')}
    </div>
    <div class="foot-note">ICON GYM · גרסה ${APP_VERSION}</div>`;
  }

  // ---------------- DAY ----------------
  function activeProgress() {
    const a = S.active; if (!a) return 0;
    const d = dayOf(a.dow); const tot = totalSets(d) || 1;
    let n = 0; Object.values(a.logs).forEach((l) => l.forEach((s) => { if (s.done) n++; }));
    return Math.min(1, n / tot);
  }
  function logsFor(day, ex) {
    if (S.active && S.active.dow === day.dow && S.active.logs[ex.id]) return S.active.logs[ex.id];
    return Array.from({ length: +ex.sets || 1 }, () => ({ w: '', r: '', done: false }));
  }

  function suggestion(ex) {
    if (ex.kind !== 'reps') return '';
    const last = lastFor(ex.lib); if (!last) return '';
    const [, hi] = range(ex.reps); if (!hi) return '';
    const sets = last.it.sets;
    if (sets.length >= (+ex.sets || 1) && sets.every((s) => num(s.r) >= hi)) return `<div class="tip-chip">💡 בפעם הקודמת הגעת ל־${hi} חזרות בכל הסטים – זה הזמן להעלות מעט משקל</div>`;
    return '';
  }

  function setsBlock(day, ex) {
    const logs = logsFor(day, ex);
    const last = lastFor(ex.lib);
    const lastSets = last ? last.it.sets : [];
    const [lo] = range(ex.reps);
    const isReps = ex.kind === 'reps';
    const head = isReps ? `<div class="sr head"><span>סט</span><span>קודם</span><span>${esc(unitLabel(ex))}</span><span>חזרות</span><span></span></div>`
      : `<div class="sr head two"><span>סט</span><span>קודם</span><span>${ex.kind === 'time' ? 'שניות' : 'דקות'}</span><span></span></div>`;
    const rows = logs.map((s, i) => {
      const prev = lastSets[i] || lastSets[lastSets.length - 1];
      const pw = prev ? prev.w : firstNum(ex.weight);
      const pr = prev ? prev.r : (lo || '');
      const prevTxt = prev ? (isReps ? `${prev.w || 0}×${prev.r}` : `${prev.r}`) : '—';
      if (isReps) {
        return `<div class="sr ${s.done ? 'done' : ''}" data-ex="${ex.id}" data-i="${i}">
          <span class="sn">${i + 1}</span><span class="sp">${esc(prevTxt)}</span>
          <input inputmode="decimal" data-f="w" value="${esc(s.w)}" placeholder="${esc(pw)}" aria-label="משקל">
          <input inputmode="numeric" data-f="r" value="${esc(s.r)}" placeholder="${esc(pr)}" aria-label="חזרות">
          <button class="chk" data-act="check" aria-label="סיום סט">${I.check}</button></div>`;
      }
      return `<div class="sr two ${s.done ? 'done' : ''}" data-ex="${ex.id}" data-i="${i}">
        <span class="sn">${i + 1}</span><span class="sp">${esc(prevTxt)}</span>
        <input inputmode="numeric" data-f="r" value="${esc(s.r)}" placeholder="${esc(pr)}" aria-label="זמן">
        <button class="chk" data-act="check" aria-label="סיום">${I.check}</button></div>`;
    }).join('');
    return `${head}${rows}<div class="sr-actions"><button class="lnk" data-act="add-set" data-ex="${ex.id}">${I.plus} סט נוסף</button>${logs.length > 1 ? `<button class="lnk muted" data-act="rm-set" data-ex="${ex.id}">הסר סט</button>` : ''}</div>`;
  }

  function exCard(day, ex, idx) {
    const done = logsFor(day, ex).filter((s) => s.done).length;
    const total = logsFor(day, ex).length;
    const lib = LIBRARY[ex.lib];
    const target = ex.kind === 'reps' ? `${ex.sets} × ${esc(ex.reps)}` : ex.kind === 'time' ? `${ex.sets} × ${esc(ex.reps)} שנ׳` : `${esc(ex.reps)} דק׳`;
    const weightTxt = ex.weight ? `${esc(ex.weight)} ${esc(ex.unit || '')}` : (ex.note || '');
    return `<article class="ex ${done && done >= total ? 'complete' : ''}" id="ex-${ex.id}">
      <div class="ex-top">
        <button class="ex-anim" data-act="ex-info" data-ex="${ex.id}" aria-label="הסבר"><div data-anim="${esc(ex.anim)}"></div><span class="ex-num">${idx + 1}</span></button>
        <div class="ex-head">
          <div class="ex-group">${esc(ex.group)}</div>
          <h3>${esc(ex.name)}</h3>
          <div class="ex-tags"><span class="t">${target}</span>${ex.kind === 'reps' && ex.rest ? `<span class="t">${I.timer}${ex.rest}״</span>` : ''}</div>
          ${weightTxt ? `<div class="ex-weight">${ex.weight ? 'יעד: ' : ''}<b>${weightTxt}</b></div>` : ''}
        </div>
        ${editMode ? `<div class="ex-edit">
          <button class="ib" data-act="ex-up" data-ex="${ex.id}" aria-label="למעלה">${I.up}</button>
          <button class="ib" data-act="ex-down" data-ex="${ex.id}" aria-label="למטה">${I.down}</button>
          <button class="ib" data-act="ex-edit" data-ex="${ex.id}" aria-label="ערוך">${I.edit}</button>
          <button class="ib red" data-act="ex-del" data-ex="${ex.id}" aria-label="מחק">${I.trash}</button></div>`
        : `<div class="ex-prog"><svg viewBox="0 0 36 36"><circle cx="18" cy="18" r="15" class="rg"/><circle cx="18" cy="18" r="15" class="rf" style="stroke-dasharray:${(done / Math.max(1, total)) * 94.2} 94.2"/></svg><span>${done}/${total}</span></div>`}
      </div>
      ${ex.weight && ex.note ? `<div class="ex-note">${esc(ex.note)}</div>` : ''}
      ${suggestion(ex)}
      ${editMode ? '' : `<div class="sets">${setsBlock(day, ex)}</div>`}
    </article>`;
  }

  function viewDay(day) {
    const act = S.active && S.active.dow === day.dow ? S.active : null;
    const other = S.active && S.active.dow !== day.dow ? dayOf(S.active.dow) : null;
    let body = '';
    if (day.type === 'rest' && !day.exercises.length) {
      body = `<div class="rest-card">
        <div class="rest-emoji">😴</div><h2>יום מנוחה</h2>
        <p class="muted">השרירים גדלים במנוחה, לא באימון. תן לגוף להתאושש.</p>
        <ul class="checklist"><li>🥩 חלבון: ${esc(S.body.protein)} גרם היום</li><li>💧 לפחות 2.5–3 ליטר מים</li><li>😴 7–9 שעות שינה</li><li>🚶 הליכה קלה או מתיחות – מומלץ</li></ul>
        ${editMode ? '' : '<button class="btn ghost" data-act="toggle-edit">הוסף תרגילים ליום הזה</button>'}</div>`;
    }
    let lastGroup = null;
    const cards = day.exercises.map((ex, i) => {
      const gh = ex.group !== lastGroup ? `<div class="grp-h">${grpEmoji(ex.group)} ${esc(ex.group)}</div>` : '';
      lastGroup = ex.group;
      return gh + exCard(day, ex, i);
    }).join('');

    return `
    <div class="topbar c-${day.color}">
      <a class="ib" href="#/" aria-label="חזרה">${I.back}</a>
      <div class="tb-title">יום ${DAY_NAMES[day.dow]}</div>
      <button class="ib ${editMode ? 'on' : ''}" data-act="toggle-edit" aria-label="עריכה">${editMode ? I.check : I.edit}</button>
    </div>
    <section class="day-hero c-${day.color}">
      <div class="dh-code">${day.type === 'rest' ? '😴' : day.type === 'cardio' ? '⚽' : esc(day.code)}</div>
      <div class="dh-main"><h1>${esc(day.title)}</h1><div class="muted">${dayMeta(day)}</div></div>
      ${act ? `<div class="dh-live"><span class="live-pill"><i></i> פעיל</span><b data-elapsed>${fmtDur(Date.now() - act.start)}</b></div>` : ''}
    </section>
    ${act ? `<div class="prog-line"><i style="width:${activeProgress() * 100}%"></i></div>` : ''}
    ${other ? `<div class="banner warn"><div>יש אימון פעיל ביום ${DAY_NAMES[other.dow]} (${esc(other.code)})</div><a class="btn sm ghost" href="#/day/${other.dow}">עבור</a></div>` : ''}
    ${day.note ? `<div class="day-note">${I.info}<span>${esc(day.note)}</span></div>` : ''}
    ${editMode ? `<div class="edit-bar"><button class="btn ghost grow" data-act="day-settings">${I.edit} הגדרות היום</button><button class="btn primary grow" data-act="add-ex">${I.plus} הוסף תרגיל</button></div>` : ''}
    ${body}
    <div class="ex-list">${cards}</div>
    ${editMode && day.exercises.length ? `<button class="btn primary block" data-act="add-ex">${I.plus} הוסף תרגיל</button>` : ''}
    ${!editMode && day.exercises.length ? (act
      ? `<div class="day-actions"><button class="btn primary block big" data-act="finish">${I.flag} סיים ושמור אימון</button><button class="btn ghost block" data-act="cancel-workout">בטל אימון</button></div>`
      : `<div class="day-actions"><button class="btn primary block big" data-act="start" data-dow="${day.dow}">${I.play} התחל אימון</button><p class="muted small center">אפשר גם פשוט לסמן סטים – האימון יתחיל אוטומטית</p></div>`) : ''}
    `;
  }
  const grpEmoji = (g) => ({ 'חזה': '🏋️', 'גב': '🦅', 'כתפיים': '🎯', 'יד קדמית': '💪', 'יד אחורית': '💪', 'רגליים': '🦵', 'בטן': '🔥', 'אירובי': '⚽' }[g] || '•');

  // ---------------- workout actions ----------------
  function startSession(dow) {
    const day = dayOf(dow);
    S.active = { dow: +dow, start: Date.now(), logs: {} };
    day.exercises.forEach((ex) => { S.active.logs[ex.id] = Array.from({ length: +ex.sets || 1 }, () => ({ w: '', r: '', done: false })); });
    save();
    requestWake();
    toast('⏱ האימון התחיל – בהצלחה!');
  }
  async function ensureActive(dow) {
    if (S.active && S.active.dow === +dow) return true;
    if (S.active) {
      const d = dayOf(S.active.dow);
      const ok = await confirmDlg('יש אימון פעיל אחר', `לשמור את אימון ${esc(d.code)} (יום ${DAY_NAMES[d.dow]}) ולהתחיל אימון חדש?`, 'שמור והתחל חדש');
      if (!ok) return false;
      commitActive();
    }
    startSession(dow);
    return true;
  }
  function ensureLog(ex) {
    if (!S.active.logs[ex.id]) S.active.logs[ex.id] = Array.from({ length: +ex.sets || 1 }, () => ({ w: '', r: '', done: false }));
    return S.active.logs[ex.id];
  }

  function buildSession(a) {
    const d = dayOf(a.dow);
    const items = [];
    d.exercises.forEach((ex) => {
      const l = (a.logs[ex.id] || []).filter((s) => s.done);
      if (l.length) items.push({ exId: ex.id, lib: ex.lib, name: ex.name, group: ex.group, kind: ex.kind, unit: ex.unit, sets: l.map((s) => ({ w: s.w, r: s.r })) });
    });
    return { id: uid('h'), date: new Date(a.start).toISOString(), end: new Date().toISOString(), dow: d.dow, code: d.code, title: d.title, color: d.color, items };
  }
  function commitActive() {
    const sess = buildSession(S.active);
    if (sess.items.length) S.history.push(sess);
    S.active = null; save(); releaseWake(); stopRest();
    return sess;
  }

  function prsIn(sess) {
    const out = [];
    sess.items.forEach((it) => {
      if (it.kind && it.kind !== 'reps') return;
      const b = bestOf(it); if (!b.w) return;
      let prev = 0;
      S.history.forEach((h) => { if (h.id === sess.id) return; h.items.forEach((x) => { if (x.lib === it.lib) prev = Math.max(prev, bestOf(x).w); }); });
      if (b.w > prev && prev > 0) out.push({ name: it.name, w: b.w, prev });
    });
    return out;
  }

  async function finishWorkout() {
    const a = S.active; if (!a) return;
    const preview = buildSession(a);
    const sets = preview.items.reduce((x, it) => x + it.sets.length, 0);
    if (!sets) {
      const ok = await confirmDlg('לא סימנת אף סט', 'לבטל את האימון בלי לשמור?', 'בטל אימון', true);
      if (ok) { S.active = null; save(); releaseWake(); stopRest(); render(); }
      return;
    }
    const vol = preview.items.reduce((x, it) => x + volOf(it), 0);
    const dur = Date.now() - a.start;
    const prs = prsIn(preview);
    openSheet(`<div class="finish">
      <div class="fin-emoji">🏆</div><h2>כל הכבוד!</h2><p class="muted">אימון ${esc(preview.code)} – ${esc(preview.title)}</p>
      <div class="stats3 in-sheet"><div class="stat"><b>${fmtDur(dur)}</b><span>משך</span></div><div class="stat"><b>${sets}</b><span>סטים</span></div><div class="stat"><b>${fmtNum(vol)}</b><span>נפח (ק״ג)</span></div></div>
      ${prs.length ? `<div class="prs"><h4>${I.trophy} שיאים חדשים</h4>${prs.map((p) => `<div class="pr"><span>${esc(p.name)}</span><b>${fmtNum(p.w)} ק״ג <small>(היה ${fmtNum(p.prev)})</small></b></div>`).join('')}</div>` : ''}
      <button class="btn primary block big" data-save>שמור אימון</button>
      <button class="btn ghost block" data-close>חזור לאימון</button></div>`,
      (api) => { $('[data-save]', api.el).onclick = () => { commitActive(); api.close(); vibrate([60, 40, 120]); toast('✅ האימון נשמר בהיסטוריה'); go(''); }; });
  }

  // ---------------- rest timer ----------------
  let rest = null, restInt = null;
  function startRest(sec, name) {
    if (!sec) return;
    rest = { end: Date.now() + sec * 1000, total: sec * 1000, name };
    $('#rest').classList.add('on');
    clearInterval(restInt); restInt = setInterval(tickRest, 250); tickRest();
  }
  function stopRest() { rest = null; clearInterval(restInt); const r = $('#rest'); if (r) r.classList.remove('on'); }
  function tickRest() {
    if (!rest) return;
    const left = rest.end - Date.now();
    const el = $('#rest');
    if (left <= 0) {
      stopRest(); vibrate([250, 120, 250]); beep(); toast('⏰ המנוחה נגמרה – לסט הבא!');
      return;
    }
    $('.rest-time', el).textContent = fmtDur(left + 999);
    $('.rest-name', el).textContent = rest.name || 'מנוחה';
    $('.rest-ring .rf', el).style.strokeDasharray = `${(left / rest.total) * 113} 113`;
  }
  let actx = null;
  function beep() {
    if (!S.settings.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.22, 0.44].forEach((t, i) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.frequency.value = i === 2 ? 1320 : 880; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, actx.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, actx.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t + 0.18);
        o.connect(g); g.connect(actx.destination); o.start(actx.currentTime + t); o.stop(actx.currentTime + t + 0.2);
      });
    } catch (e) {}
  }

  // ---------------- wake lock ----------------
  let wake = null;
  async function requestWake() {
    if (!S.settings.wakeLock || !S.active || !('wakeLock' in navigator)) return;
    try { wake = await navigator.wakeLock.request('screen'); } catch (e) {}
  }
  function releaseWake() { try { wake && wake.release(); } catch (e) {} wake = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { requestWake(); tickRest(); } });

  // ---------------- elapsed ----------------
  function tickElapsed() {
    if (!S.active) return;
    const t = fmtDur(Date.now() - S.active.start);
    $$('[data-elapsed]').forEach((n) => { n.textContent = t; });
  }
  setInterval(tickElapsed, 1000);
  function renderActiveChip() {
    const chip = $('#active-chip');
    const r = route();
    if (S.active && !(r.a === 'day' && +r.b === S.active.dow)) {
      const d = dayOf(S.active.dow);
      chip.innerHTML = `<span class="live-pill"><i></i></span> אימון ${esc(d.code)} פעיל · <b data-elapsed>${fmtDur(Date.now() - S.active.start)}</b> ${I.chev}`;
      chip.className = 'on c-' + d.color;
      chip.onclick = () => go('day/' + d.dow);
    } else chip.className = '';
  }

  // ---------------- exercise info / edit ----------------
  function exInfo(id) {
    const { ex } = findEx(id); if (!ex) return;
    const lib = LIBRARY[ex.lib] || {};
    const ss = sessionsFor(ex.lib).slice(0, 6);
    const pts = sessionsFor(ex.lib).slice(0, 12).reverse().map(({ h, it }) => ({ x: fmtShort(h.date), y: ex.kind === 'reps' ? bestOf(it).w : Math.max(...it.sets.map((s) => num(s.r))) }));
    openSheet(`<div class="info">
      <div class="info-anim" data-anim="${esc(ex.anim)}"></div>
      <div class="ex-group">${esc(ex.group)}</div><h2>${esc(ex.name)}</h2>
      <div class="ex-tags big"><span class="t">${ex.sets} סטים</span><span class="t">${esc(ex.reps)} ${ex.kind === 'reps' ? 'חזרות' : unitLabel(ex)}</span>${ex.weight ? `<span class="t">${esc(ex.weight)} ${esc(ex.unit)}</span>` : ''}${ex.rest ? `<span class="t">${I.timer} ${ex.rest} שנ׳ מנוחה</span>` : ''}</div>
      ${ex.note ? `<div class="day-note">${I.info}<span>${esc(ex.note)}</span></div>` : ''}
      ${(lib.tips || []).length ? `<h4>דגשים לביצוע</h4><ul class="tips">${lib.tips.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      <h4>ההתקדמות שלך</h4>
      ${pts.length > 1 ? lineChart(pts, { unit: unitLabel(ex) }) : ''}
      ${ss.length ? `<div class="hist-mini">${ss.map(({ h, it }) => `<div class="hm"><span>${fmtShort(h.date)}</span><span>${it.sets.map((s) => ex.kind === 'reps' ? `${s.w || 0}×${s.r}` : s.r).join(' · ')}</span></div>`).join('')}</div>` : '<p class="muted small">עוד אין רישומים לתרגיל הזה. אחרי האימון הראשון תראה כאן את ההתקדמות.</p>'}
      <div class="row gap mt"><button class="btn ghost grow" data-edit>${I.edit} ערוך תרגיל</button>${ss.length ? `<a class="btn ghost grow" href="#/progress/${encodeURIComponent(ex.lib)}" data-close>${I.chart} גרף מלא</a>` : ''}</div>
    </div>`, (api) => { $('[data-edit]', api.el).onclick = () => { api.close(); setTimeout(() => exEdit(id), 200); }; }, { tall: true });
  }

  function exEdit(id, isNew) {
    const { day, ex } = findEx(id); if (!ex) return;
    const animOpts = window.GymAnim.keys.map((k) => { const l = Object.values(LIBRARY).find((x) => x.anim === k); return `<option value="${k}" ${k === ex.anim ? 'selected' : ''}>${esc(l ? l.name : k)}</option>`; }).join('');
    const rests = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240];
    openSheet(`<form class="form" autocomplete="off">
      <h2>${isNew ? 'תרגיל חדש' : 'עריכת תרגיל'}</h2>
      <div class="edit-preview" data-anim="${esc(ex.anim)}"></div>
      <label>שם התרגיל<input name="name" value="${esc(ex.name)}" required></label>
      <div class="grid2">
        <label>קבוצת שריר<select name="group">${GROUPS.map((g) => `<option ${g === ex.group ? 'selected' : ''}>${g}</option>`).join('')}</select></label>
        <label>סוג מעקב<select name="kind"><option value="reps" ${ex.kind === 'reps' ? 'selected' : ''}>משקל × חזרות</option><option value="time" ${ex.kind === 'time' ? 'selected' : ''}>זמן (שניות)</option><option value="cardio" ${ex.kind === 'cardio' ? 'selected' : ''}>אירובי (דקות)</option></select></label>
      </div>
      <label>הנפשה<select name="anim">${animOpts}</select></label>
      <div class="grid3">
        <label>סטים<div class="stepper"><button type="button" data-step="-1">−</button><input name="sets" inputmode="numeric" value="${esc(ex.sets)}"><button type="button" data-step="1">+</button></div></label>
        <label>חזרות / יעד<input name="reps" dir="ltr" value="${esc(ex.reps)}" placeholder="8–12"></label>
        <label>מנוחה<select name="rest">${rests.map((r) => `<option value="${r}" ${+ex.rest === r ? 'selected' : ''}>${r ? (r >= 60 ? (r / 60) + ' דק׳' : r + ' שנ׳') : 'ללא'}</option>`).join('')}</select></label>
      </div>
      <div class="grid2">
        <label>משקל יעד<input name="weight" dir="auto" value="${esc(ex.weight)}" placeholder="12–14"></label>
        <label>יחידה / הערה למשקל<input name="unit" value="${esc(ex.unit)}" placeholder="ק״ג לכל צד"></label>
      </div>
      <label>הערות<textarea name="note" rows="2" placeholder="למשל: מושב בגובה 4">${esc(ex.note)}</textarea></label>
      <button class="btn primary block big" type="submit">שמור</button>
      ${isNew ? '' : `<button class="btn danger-ghost block" type="button" data-del>${I.trash} מחק תרגיל מהיום</button>`}
    </form>`, (api) => {
      const f = $('form', api.el);
      f.anim.onchange = () => { const p = $('.edit-preview', api.el); p.innerHTML = ''; window.GymAnim.mount(p, f.anim.value); };
      $$('[data-step]', api.el).forEach((b) => b.onclick = () => { f.sets.value = Math.max(1, Math.min(10, (+f.sets.value || 0) + +b.dataset.step)); });
      f.onsubmit = (e) => {
        e.preventDefault();
        Object.assign(ex, { name: f.name.value.trim() || ex.name, group: f.group.value, kind: f.kind.value, anim: f.anim.value, sets: Math.max(1, +f.sets.value || 1), reps: f.reps.value.trim(), rest: +f.rest.value, weight: f.weight.value.trim(), unit: f.unit.value.trim(), note: f.note.value.trim() });
        if (S.active && S.active.dow === day.dow) { const l = ensureLog(ex); while (l.length < ex.sets) l.push({ w: '', r: '', done: false }); while (l.length > ex.sets && !l[l.length - 1].done) l.pop(); }
        save(); api.close(); render(); toast('נשמר ✓');
      };
      const del = $('[data-del]', api.el);
      if (del) del.onclick = async () => { api.close(); deleteEx(id); };
    }, { tall: true });
  }

  async function deleteEx(id) {
    const { day, ex } = findEx(id); if (!ex) return;
    const ok = await confirmDlg('למחוק את התרגיל?', `"${esc(ex.name)}" יוסר מיום ${DAY_NAMES[day.dow]}. ההיסטוריה שלו נשמרת.`, 'מחק', true);
    if (!ok) return;
    day.exercises = day.exercises.filter((x) => x.id !== id);
    if (S.active && S.active.logs[id]) delete S.active.logs[id];
    save(); render();
  }

  function addExercise(dow) {
    const day = dayOf(dow);
    const libs = Object.entries(LIBRARY);
    const list = (q, g) => libs.filter(([, l]) => (!g || l.group === g) && (!q || l.name.includes(q))).map(([k, l]) =>
      `<button class="lib-item" data-k="${k}"><div class="lib-anim" data-anim="${l.anim}"></div><div><b>${esc(l.name)}</b><span class="muted small">${esc(l.group)}</span></div>${I.plus}</button>`).join('') || '<p class="muted center">לא נמצאו תרגילים</p>';
    openSheet(`<h2>הוספת תרגיל</h2>
      <input class="search" placeholder="🔍 חיפוש תרגיל..." data-q>
      <div class="chips" data-g><button class="chip on" data-v="">הכל</button>${GROUPS.map((g) => `<button class="chip" data-v="${g}">${g}</button>`).join('')}</div>
      <button class="lib-item custom" data-k="__custom"><div class="lib-anim plus">${I.plus}</div><div><b>תרגיל מותאם אישית</b><span class="muted small">שם, הנפשה ויעדים משלך</span></div></button>
      <div class="lib-list">${list('', '')}</div>`, (api) => {
      let q = '', g = '';
      const refresh = () => { $('.lib-list', api.el).innerHTML = list(q, g); fixBidi(api.el); mountAnims(api.el); };
      $('[data-q]', api.el).oninput = (e) => { q = e.target.value.trim(); refresh(); };
      $('[data-g]', api.el).onclick = (e) => { const b = e.target.closest('.chip'); if (!b) return; $$('.chip', api.el).forEach((c) => c.classList.toggle('on', c === b)); g = b.dataset.v; refresh(); };
      api.el.addEventListener('click', (e) => {
        const it = e.target.closest('.lib-item'); if (!it) return;
        const k = it.dataset.k; const id = uid('e');
        let ex;
        if (k === '__custom') ex = { id, lib: 'c_' + id, name: 'תרגיל חדש', group: g || 'חזה', anim: 'db_curl', kind: 'reps', sets: 3, reps: '8–12', weight: '', unit: 'ק״ג', rest: 90, note: '' };
        else { const l = LIBRARY[k]; const kind = l.kind || 'reps'; ex = { id, lib: k, name: l.name, group: l.group, anim: l.anim, kind, sets: kind === 'cardio' ? 1 : kind === 'time' ? 2 : 3, reps: kind === 'cardio' ? '45' : kind === 'time' ? '30–45' : '8–12', weight: '', unit: kind === 'reps' ? 'ק״ג' : '', rest: kind === 'cardio' ? 0 : 90, note: '' }; }
        day.exercises.push(ex);
        if (day.type === 'rest') { day.type = 'strength'; if (day.color === 'gray') day.color = 'purple'; }
        save(); api.close(); render();
        setTimeout(() => { exEdit(id, k === '__custom'); const n = $('#ex-' + id); if (n) n.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 250);
      });
    }, { tall: true });
  }

  function daySettings(dow) {
    const d = dayOf(dow);
    const colors = [['red', 'אדום'], ['blue', 'כחול'], ['green', 'ירוק'], ['purple', 'סגול'], ['orange', 'כתום'], ['gray', 'אפור']];
    openSheet(`<form class="form"><h2>הגדרות יום ${DAY_NAMES[d.dow]}</h2>
      <div class="grid2"><label>קוד (A1, B2...)<input name="code" value="${esc(d.code)}" maxlength="8"></label>
      <label>סוג היום<select name="type"><option value="strength" ${d.type === 'strength' ? 'selected' : ''}>כוח</option><option value="cardio" ${d.type === 'cardio' ? 'selected' : ''}>אירובי</option><option value="rest" ${d.type === 'rest' ? 'selected' : ''}>מנוחה</option></select></label></div>
      <label>כותרת<input name="title" value="${esc(d.title)}"></label>
      <label>צבע</label><div class="colors">${colors.map(([c, n]) => `<label class="cl c-${c}"><input type="radio" name="color" value="${c}" ${d.color === c ? 'checked' : ''}><span title="${n}"></span></label>`).join('')}</div>
      <label>הערה ליום<textarea name="note" rows="3">${esc(d.note)}</textarea></label>
      <button class="btn primary block big">שמור</button>
      <button type="button" class="btn ghost block" data-copy>העתק תרגילים מיום אחר</button>
    </form>`, (api) => {
      const f = $('form', api.el);
      f.onsubmit = (e) => { e.preventDefault(); Object.assign(d, { code: f.code.value.trim() || d.code, type: f.type.value, title: f.title.value.trim(), color: f.color.value, note: f.note.value.trim() }); save(); api.close(); render(); };
      $('[data-copy]', api.el).onclick = () => {
        api.close();
        setTimeout(() => openSheet(`<h2>העתק תרגילים אל יום ${DAY_NAMES[d.dow]}</h2><div class="days">${S.days.filter((x) => x.dow !== d.dow && x.exercises.length).map((x) => `<button class="day-row c-${x.color}" data-from="${x.dow}"><div class="dr-badge">${esc(x.code)}</div><div class="dr-main"><div class="dr-name">יום ${DAY_NAMES[x.dow]}</div><div class="dr-title">${esc(x.title)}</div><div class="dr-meta">${x.exercises.length} תרגילים</div></div></button>`).join('')}</div>`, (a2) => {
          a2.el.addEventListener('click', (e) => { const b = e.target.closest('[data-from]'); if (!b) return; const src = dayOf(b.dataset.from); d.exercises.push(...src.exercises.map((x) => Object.assign({}, x, { id: uid('e') }))); if (d.type === 'rest') d.type = src.type; save(); a2.close(); render(); toast(`הועתקו ${src.exercises.length} תרגילים`); });
        }), 250);
      };
    });
  }

  // ---------------- charts ----------------
  function lineChart(pts, o = {}) {
    const W = 320, H = 150, pl = 36, pr = 12, pt = 14, pb = 24;
    const ys = pts.map((p) => p.y); let min = Math.min(...ys), max = Math.max(...ys);
    if (min === max) { min -= 1; max += 1; }
    const pad = (max - min) * 0.15; min -= pad; max += pad;
    const x = (i) => pl + (pts.length === 1 ? (W - pl - pr) / 2 : (i * (W - pl - pr)) / (pts.length - 1));
    const y = (v) => pt + (1 - (v - min) / (max - min)) * (H - pt - pb);
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.y).toFixed(1)}`).join(' ');
    const area = `${path} L${x(pts.length - 1).toFixed(1)} ${H - pb} L${x(0).toFixed(1)} ${H - pb}Z`;
    const id = 'lc' + Math.random().toString(36).slice(2, 7);
    const ticks = [max - pad, (max + min) / 2, min + pad];
    const step = Math.max(1, Math.ceil(pts.length / 6));
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--acc)" stop-opacity=".35"/><stop offset="1" stop-color="var(--acc)" stop-opacity="0"/></linearGradient></defs>
      ${ticks.map((t) => `<line x1="${pl}" x2="${W - pr}" y1="${y(t)}" y2="${y(t)}" class="grid"/><text x="2" y="${y(t) + 4}" class="ax">${fmtNum(t)}</text>`).join('')}
      <path d="${area}" fill="url(#${id})"/><path d="${path}" class="ln"/>
      ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.y)}" r="${i === pts.length - 1 ? 4.5 : 3}" class="dot ${i === pts.length - 1 ? 'last' : ''}"/>`).join('')}
      ${pts.map((p, i) => (i % step === 0 || i === pts.length - 1) ? `<text x="${x(i)}" y="${H - 6}" class="ax" text-anchor="middle">${esc(p.x)}</text>` : '').join('')}
    </svg>${o.unit ? `<span class="chart-unit">${esc(o.unit)}</span>` : ''}</div>`;
  }
  function spark(vals) {
    if (vals.length < 2) return '';
    const W = 70, H = 26; let mn = Math.min(...vals), mx = Math.max(...vals); if (mn === mx) { mn -= 1; mx += 1; }
    const d = vals.map((v, i) => `${i ? 'L' : 'M'}${(i * W / (vals.length - 1)).toFixed(1)} ${(H - 3 - ((v - mn) / (mx - mn)) * (H - 6)).toFixed(1)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 ${W} ${H}"><path d="${d}"/></svg>`;
  }

  // ---------------- HISTORY ----------------
  function viewHistory() {
    const weeks = 14;
    const start = startOfWeek(); start.setDate(start.getDate() - (weeks - 1) * 7);
    const byDay = {};
    S.history.forEach((h) => { const d = new Date(h.date); d.setHours(0, 0, 0, 0); byDay[d.getTime()] = h; });
    let cal = '';
    for (let w = 0; w < weeks; w++) {
      cal += '<div class="hm-col">';
      for (let dd = 0; dd < 7; dd++) {
        const t = new Date(start); t.setDate(t.getDate() + w * 7 + dd);
        const h = byDay[t.getTime()];
        const future = t > new Date();
        cal += `<i class="${h ? 'on c-' + h.color : ''} ${future ? 'fut' : ''}" title="${fmtShort(t.toISOString())}"></i>`;
      }
      cal += '</div>';
    }
    const list = [...S.history].reverse();
    let lastMonth = '';
    const rows = list.map((h) => {
      const d = new Date(h.date); const m = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      const mh = m !== lastMonth ? `<div class="grp-h">${m}</div>` : ''; lastMonth = m;
      const sets = h.items.reduce((a, it) => a + it.sets.length, 0);
      const vol = h.items.reduce((a, it) => a + volOf(it), 0);
      const dur = h.end ? new Date(h.end) - new Date(h.date) : 0;
      return `${mh}<a class="hist-row c-${h.color}" href="#/history/${h.id}"><div class="dr-badge">${esc(h.code)}</div><div class="dr-main"><div class="dr-name">${fmtDate(h.date)}</div><div class="dr-title">${esc(h.title)}</div><div class="dr-meta">${dur ? fmtDur(dur) + ' · ' : ''}${sets} סטים${vol ? ' · ' + fmtNum(vol) + ' ק״ג' : ''}</div></div><div class="dr-go">${I.chev}</div></a>`;
    }).join('');
    return `<div class="page-h"><h1>היסטוריה</h1><span class="muted">${S.history.length} אימונים</span></div>
      <div class="card"><div class="card-h"><h3>14 השבועות האחרונים</h3></div><div class="heat"><div class="heat-days">${DAY_SHORT.map((d) => `<span>${d}</span>`).join('')}</div><div class="heat-grid">${cal}</div></div></div>
      ${rows || `<div class="empty"><div>📒</div><h3>עוד אין אימונים</h3><p class="muted">אחרי שתסיים ותשמור אימון הוא יופיע כאן</p><a class="btn primary" href="#/">לאימון של היום</a></div>`}`;
  }

  function viewSession(id) {
    const h = S.history.find((x) => x.id === id);
    if (!h) return '<div class="empty"><h3>האימון לא נמצא</h3><a class="btn" href="#/history">חזרה</a></div>';
    const sets = h.items.reduce((a, it) => a + it.sets.length, 0);
    const vol = h.items.reduce((a, it) => a + volOf(it), 0);
    const dur = h.end ? new Date(h.end) - new Date(h.date) : 0;
    return `<div class="topbar c-${h.color}"><a class="ib" href="#/history">${I.back}</a><div class="tb-title">${esc(h.code)} · ${fmtShort(h.date)}</div><button class="ib red" data-act="del-session" data-id="${h.id}">${I.trash}</button></div>
      <section class="day-hero c-${h.color}"><div class="dh-code">${esc(h.code)}</div><div class="dh-main"><h1>${esc(h.title)}</h1><div class="muted">${fmtDate(h.date, true)}</div></div></section>
      <section class="stats3"><div class="stat"><b>${dur ? fmtDur(dur) : '—'}</b><span>משך</span></div><div class="stat"><b>${sets}</b><span>סטים</span></div><div class="stat"><b>${fmtNum(vol)}</b><span>נפח (ק״ג)</span></div></section>
      <p class="muted small center">אפשר לערוך את הערכים ישירות – השינויים נשמרים אוטומטית</p>
      ${h.items.map((it, ii) => `<article class="ex"><div class="ex-head solo"><div class="ex-group">${esc(it.group)}</div><h3>${esc(it.name)}</h3></div>
        <div class="sets">${it.kind && it.kind !== 'reps'
          ? `<div class="sr head two"><span>סט</span><span></span><span>${it.kind === 'time' ? 'שניות' : 'דקות'}</span><span></span></div>${it.sets.map((s, si) => `<div class="sr two done"><span class="sn">${si + 1}</span><span></span><input inputmode="numeric" data-hist="${h.id}" data-it="${ii}" data-si="${si}" data-f="r" value="${esc(s.r)}"><button class="chk ghosted" data-act="hist-rm-set" data-hist="${h.id}" data-it="${ii}" data-si="${si}">✕</button></div>`).join('')}`
          : `<div class="sr head"><span>סט</span><span></span><span>ק״ג</span><span>חזרות</span><span></span></div>${it.sets.map((s, si) => `<div class="sr done"><span class="sn">${si + 1}</span><span class="sp">${s.w && s.r ? fmtNum(e1rm(num(s.w), num(s.r))) : ''}</span><input inputmode="decimal" data-hist="${h.id}" data-it="${ii}" data-si="${si}" data-f="w" value="${esc(s.w)}"><input inputmode="numeric" data-hist="${h.id}" data-it="${ii}" data-si="${si}" data-f="r" value="${esc(s.r)}"><button class="chk ghosted" data-act="hist-rm-set" data-hist="${h.id}" data-it="${ii}" data-si="${si}" aria-label="מחק סט">✕</button></div>`).join('')}`}
        </div></article>`).join('')}
      <button class="btn danger-ghost block" data-act="del-session" data-id="${h.id}">${I.trash} מחק אימון</button>`;
  }

  // ---------------- PROGRESS ----------------
  function viewProgress() {
    const libs = {};
    S.history.forEach((h) => h.items.forEach((it) => { (libs[it.lib] = libs[it.lib] || { name: it.name, group: it.group, kind: it.kind, last: h.date }).last = h.date; }));
    const entries = Object.entries(libs).sort((a, b) => new Date(b[1].last) - new Date(a[1].last));
    // weekly sets per muscle
    const s = startOfWeek().getTime();
    const doneG = {}, planG = {};
    S.days.forEach((d) => { if (d.type === 'rest') return; d.exercises.forEach((e) => { if (e.kind === 'cardio') return; planG[e.group] = (planG[e.group] || 0) + (+e.sets || 0); }); });
    S.history.filter((h) => new Date(h.date).getTime() >= s).forEach((h) => h.items.forEach((it) => { if (it.kind === 'cardio') return; doneG[it.group] = (doneG[it.group] || 0) + it.sets.length; }));
    if (S.active) { const d = dayOf(S.active.dow); d.exercises.forEach((e) => { if (e.kind === 'cardio') return; const n = (S.active.logs[e.id] || []).filter((x) => x.done).length; doneG[e.group] = (doneG[e.group] || 0) + n; }); }
    const groups = GROUPS.filter((g) => planG[g]);
    const bw = [...S.body.weights].sort((a, b) => new Date(a.date) - new Date(b.date));
    const lastBW = bw[bw.length - 1], firstBW = bw[0];
    const delta = lastBW && firstBW ? lastBW.kg - firstBW.kg : 0;
    const bmi = lastBW ? lastBW.kg / Math.pow(S.body.height / 100, 2) : 0;

    return `<div class="page-h"><h1>התקדמות</h1></div>
    <div class="card"><div class="card-h"><h3>🎯 סטים השבוע לפי שריר</h3><span class="muted small">בוצע / מתוכנן</span></div>
      <div class="bars">${groups.map((g) => { const dn = doneG[g] || 0, pl = planG[g]; return `<div class="bar-row"><span class="bl">${g}</span><div class="bt"><i style="width:${Math.min(100, (dn / pl) * 100)}%" class="${dn >= pl ? 'full' : ''}"></i></div><span class="bv">${dn}/${pl}</span></div>`; }).join('')}</div></div>

    <div class="card"><div class="card-h"><h3>⚖️ משקל גוף</h3>${lastBW ? `<span class="pill">${fmtNum(lastBW.kg)} ק״ג${bw.length > 1 ? ` · ${delta > 0 ? '+' : ''}${fmtNum(delta)}` : ''}</span>` : ''}</div>
      ${bw.length > 1 ? lineChart(bw.slice(-20).map((w) => ({ x: fmtShort(w.date), y: w.kg })), { unit: 'ק״ג' }) : ''}
      <form class="row gap" data-form="bw"><input name="kg" inputmode="decimal" placeholder="משקל היום (ק״ג)" class="grow"><button class="btn primary">${I.plus} הוסף</button></form>
      <div class="muted small mt">גובה ${S.body.height} ס״מ · BMI ${bmi ? fmtNum(bmi) : '—'} · יעד חלבון ${esc(S.body.protein)} ג׳ ליום</div>
    </div>

    <div class="sec-h"><h2>תרגילים</h2><span class="muted small">שיא משקל ומגמה</span></div>
    ${entries.length ? `<div class="days">${entries.map(([k, v]) => {
      const ss = sessionsFor(k).reverse();
      const vals = ss.map(({ it }) => v.kind && v.kind !== 'reps' ? Math.max(...it.sets.map((x) => num(x.r))) : bestOf(it).w);
      const best = Math.max(...vals);
      return `<a class="day-row prog" href="#/progress/${encodeURIComponent(k)}"><div class="dr-main"><div class="dr-name">${esc(v.group)}</div><div class="dr-title">${esc(v.name)}</div><div class="dr-meta">${ss.length} אימונים · שיא ${fmtNum(best)} ${v.kind === 'time' ? 'שנ׳' : v.kind === 'cardio' ? 'דק׳' : 'ק״ג'}</div></div>${spark(vals.slice(-10))}<div class="dr-go">${I.chev}</div></a>`;
    }).join('')}</div>` : `<div class="empty"><div>📈</div><h3>עוד אין נתונים</h3><p class="muted">הגרפים יופיעו אחרי האימון הראשון</p></div>`}`;
  }

  function viewExerciseProgress(lib) {
    const ss = sessionsFor(lib).reverse();
    if (!ss.length) return '<div class="empty"><h3>אין נתונים</h3><a class="btn" href="#/progress">חזרה</a></div>';
    const kind = ss[0].it.kind || 'reps';
    const name = ss[ss.length - 1].it.name;
    const reps = kind === 'reps';
    const best = ss.map(({ h, it }) => ({ x: fmtShort(h.date), y: reps ? bestOf(it).w : Math.max(...it.sets.map((s) => num(s.r))) }));
    const orm = reps ? ss.map(({ h, it }) => ({ x: fmtShort(h.date), y: Math.round(Math.max(...it.sets.map((s) => e1rm(num(s.w), num(s.r)))) * 10) / 10 })) : [];
    const vol = reps ? ss.map(({ h, it }) => ({ x: fmtShort(h.date), y: volOf(it) })) : [];
    const top = Math.max(...best.map((p) => p.y));
    const first = best[0].y, lastV = best[best.length - 1].y;
    const libDef = LIBRARY[lib];
    return `<div class="topbar"><a class="ib" href="#/progress">${I.back}</a><div class="tb-title">${esc(name)}</div><span></span></div>
      ${libDef ? `<div class="prog-anim" data-anim="${libDef.anim}"></div>` : ''}
      <section class="stats3"><div class="stat"><b>${fmtNum(top)}</b><span>שיא ${reps ? '(ק״ג)' : ''}</span></div><div class="stat"><b>${lastV - first >= 0 ? '+' : ''}${fmtNum(lastV - first)}</b><span>שינוי מההתחלה</span></div><div class="stat"><b>${ss.length}</b><span>אימונים</span></div></section>
      <div class="card"><div class="card-h"><h3>${reps ? 'משקל מקסימלי לאימון' : 'שיא לאימון'}</h3></div>${lineChart(best.slice(-20), { unit: reps ? 'ק״ג' : (kind === 'time' ? 'שנ׳' : 'דק׳') })}</div>
      ${reps ? `<div class="card"><div class="card-h"><h3>1RM משוער</h3><span class="muted small">נוסחת Epley</span></div>${lineChart(orm.slice(-20), { unit: 'ק״ג' })}</div>
      <div class="card"><div class="card-h"><h3>נפח לאימון</h3><span class="muted small">משקל × חזרות</span></div>${lineChart(vol.slice(-20), { unit: 'ק״ג' })}</div>` : ''}
      <div class="card"><div class="card-h"><h3>כל הרישומים</h3></div><div class="hist-mini">${[...ss].reverse().map(({ h, it }) => `<a class="hm" href="#/history/${h.id}"><span>${fmtShort(h.date)} · ${esc(h.code)}</span><span>${it.sets.map((s) => reps ? `${s.w || 0}×${s.r}` : s.r).join(' · ')}</span></a>`).join('')}</div></div>`;
  }

  // ---------------- SETTINGS ----------------
  function viewSettings() {
    const st = S.settings;
    const tog = (k, label, sub) => `<label class="set-row"><div><b>${label}</b>${sub ? `<span class="muted small">${sub}</span>` : ''}</div><input type="checkbox" class="switch" data-setting="${k}" ${st[k] ? 'checked' : ''}></label>`;
    return `<div class="page-h"><h1>הגדרות</h1></div>
    <div class="card gym-card">
      <div class="gym-logo">ICON</div>
      <div class="grow"><h3>ICON חולון</h3><div class="muted small">חדר הכושר שלי</div></div>
      <div class="row gap"><a class="btn sm ghost" target="_blank" rel="noopener" href="https://waze.com/ul?q=${encodeURIComponent('ICON חולון')}&navigate=yes">Waze</a><a class="btn sm ghost" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('ICON כושר חולון')}">מפות</a></div>
    </div>

    <div class="card"><div class="card-h"><h3>👤 הפרופיל שלי</h3></div>
      <form class="form" data-form="profile"><div class="grid3">
        <label>גובה (ס״מ)<input name="height" inputmode="numeric" value="${esc(S.body.height)}"></label>
        <label>משקל (ק״ג)<input name="kg" inputmode="decimal" value="${esc((S.body.weights[S.body.weights.length - 1] || {}).kg || '')}"></label>
        <label>חלבון (ג׳)<input name="protein" dir="ltr" value="${esc(S.body.protein)}"></label>
      </div><button class="btn primary block">שמור פרופיל</button></form>
    </div>

    <div class="card"><div class="card-h"><h3>⏱ אימון</h3></div>
      ${tog('autoRest', 'טיימר מנוחה אוטומטי', 'מתחיל אחרי כל סט שסימנת')}
      ${tog('sound', 'צליל בסיום מנוחה')}
      ${tog('vibrate', 'רטט')}
      ${tog('wakeLock', 'מסך דולק בזמן אימון', 'המסך לא יכבה באמצע אימון')}
    </div>

    <div class="card"><div class="card-h"><h3>📋 תוכנית האימונים</h3><span class="muted small">גרסת תוכנית ${S.programVersion}</span></div>
      <p class="muted small">את התרגילים עורכים בתוך כל יום (כפתור העיפרון למעלה).</p>
      <button class="btn ghost block" data-act="program-reset">${I.refresh} שחזר את התוכנית המקורית</button>
    </div>

    <div class="card"><div class="card-h"><h3>💾 גיבוי</h3></div>
      <p class="muted small">כל הנתונים נשמרים במכשיר שלך. מומלץ לגבות מדי פעם, ולפני החלפת טלפון.</p>
      <div class="row gap"><button class="btn ghost grow" data-act="export">${I.dl} ייצוא גיבוי</button><label class="btn ghost grow file">${I.ul} שחזור מגיבוי<input type="file" accept="application/json,.json" data-import hidden></label></div>
    </div>

    <div class="card"><div class="card-h"><h3>📖 המדריך שלי</h3></div>
      <details><summary>איך להתקדם במשקלים?</summary><p>כשהצלחת לבצע את מספר החזרות הגבוה בטווח בכל הסטים, בטכניקה טובה – העלה מעט את המשקל. האפליקציה תציג לך תזכורת 💡 כשזה קורה.</p></details>
      <details><summary>כמה לנוח בין סטים?</summary><p>כ־2–3 דקות בתרגילים מורכבים וכבדים, וכ־60–120 שניות בתרגילים מבודדים. טיימר המנוחה מוגדר לכל תרגיל וניתן לשינוי בעריכה.</p></details>
      <details><summary>חימום</summary><p>5–8 דקות של תנועה קלה לפני כל אימון, ועוד סטים קלים לפני התרגילים הכבדים הראשונים. סטי חימום לא נספרים.</p></details>
      <details><summary>כמה קרוב לכשל?</summary><p>ברוב הסטים השאר יכולת לעוד 1–2 חזרות. בבנץ' חופשי – לעולם לא לכשל בלי משגיח.</p></details>
      <details><summary>תזונה</summary><p>צריכת קלוריות סביב שמירה על המשקל, עם ${esc(S.body.protein)} גרם חלבון ביום. המטרה: לגדול בשריר בלי לצבור שומן מיותר. עקוב אחרי משקל הגוף בלשונית "התקדמות".</p></details>
      <details><summary>משך התוכנית</summary><p>מומלץ להתמיד 6–8 שבועות, לרשום משקלים וחזרות, ואז לבחון התקדמות ולעדכן.</p></details>
    </div>

    <div class="card"><div class="card-h"><h3>📲 האפליקציה</h3><span class="pill">גרסה ${APP_VERSION}</span></div>
      <button class="btn ghost block" data-act="check-update">${I.refresh} בדוק עדכונים</button>
      ${deferredInstall ? `<button class="btn primary block" data-act="install">התקן למסך הבית</button>` : ''}
      <details><summary>איך מתקינים על הטלפון?</summary><p><b>אייפון:</b> פתח בספארי ← כפתור השיתוף ⬆️ ← "הוסף למסך הבית".<br><b>אנדרואיד:</b> פתח בכרום ← תפריט ⋮ ← "התקנת אפליקציה" / "הוסף למסך הבית".</p></details>
    </div>

    <button class="btn danger-ghost block" data-act="wipe">${I.trash} מחק את כל הנתונים</button>
    <div class="foot-note">ICON GYM · ${APP_VERSION}<br>נבנה במיוחד בשבילך 💪</div>`;
  }

  // ---------------- events ----------------
  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    const r = route();
    const day = r.a === 'day' ? dayOf(r.b) : null;
    switch (act) {
      case 'toggle-edit': editMode = !editMode; render(); break;
      case 'start': await ensureActive(b.dataset.dow); render(); break;
      case 'finish': finishWorkout(); break;
      case 'cancel-workout': if (await confirmDlg('לבטל את האימון?', 'כל הסטים שסימנת באימון הזה יימחקו.', 'בטל אימון', true)) { S.active = null; save(); releaseWake(); stopRest(); render(); } break;
      case 'check': {
        const row = b.closest('.sr'); const exId = row.dataset.ex, i = +row.dataset.i;
        const { ex } = findEx(exId); if (!ex || !day) return;
        if (!(await ensureActive(day.dow))) return;
        const log = ensureLog(ex);
        const s = log[i] || (log[i] = { w: '', r: '', done: false });
        const wIn = $('[data-f="w"]', row), rIn = $('[data-f="r"]', row);
        if (!s.done) {
          if (wIn) s.w = wIn.value || wIn.placeholder;
          s.r = rIn.value || rIn.placeholder;
          s.done = true;
          vibrate(30);
          const isLastOfAll = activeProgress() >= 1;
          if (S.settings.autoRest && ex.rest && !isLastOfAll) startRest(+ex.rest, ex.name);
          if (isLastOfAll) setTimeout(() => toast('🔥 סיימת את כל הסטים! לחץ "סיים ושמור"'), 300);
        } else s.done = false;
        save();
        refreshCard(day, ex);
        break;
      }
      case 'add-set': case 'rm-set': {
        const { ex } = findEx(b.dataset.ex); if (!ex || !day) return;
        if (!(await ensureActive(day.dow))) return;
        const log = ensureLog(ex);
        if (act === 'add-set') { const prev = log[log.length - 1] || {}; log.push({ w: prev.w || '', r: '', done: false }); } else if (log.length > 1) log.pop();
        save(); refreshCard(day, ex); break;
      }
      case 'ex-info': if (editMode) exEdit(b.dataset.ex); else exInfo(b.dataset.ex); break;
      case 'ex-edit': exEdit(b.dataset.ex); break;
      case 'ex-del': deleteEx(b.dataset.ex); break;
      case 'ex-up': case 'ex-down': {
        const { day: d } = findEx(b.dataset.ex); const i = d.exercises.findIndex((x) => x.id === b.dataset.ex); const j = i + (act === 'ex-up' ? -1 : 1);
        if (j < 0 || j >= d.exercises.length) return;
        [d.exercises[i], d.exercises[j]] = [d.exercises[j], d.exercises[i]]; save(); render();
        const n = $('#ex-' + b.dataset.ex); if (n) { n.classList.add('flash'); n.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
        break;
      }
      case 'add-ex': addExercise(day.dow); break;
      case 'day-settings': daySettings(day.dow); break;
      case 'program-update': if (await confirmDlg('לעדכן את תוכנית האימונים?', 'התוכנית תוחלף בגרסה החדשה. ההיסטוריה, המשקלים והגרפים שלך יישמרו.', 'עדכן')) { if (S.active) commitActive(); S.days = defaultDays(); S.programVersion = PROGRAM_VERSION; save(); render(); toast('התוכנית עודכנה ✓'); } break;
      case 'program-skip': S.programVersion = PROGRAM_VERSION; save(); render(); break;
      case 'program-reset': if (await confirmDlg('לשחזר את התוכנית המקורית?', 'כל השינויים שעשית בתרגילים יימחקו. ההיסטוריה נשמרת.', 'שחזר', true)) { if (S.active) commitActive(); S.days = defaultDays(); S.programVersion = PROGRAM_VERSION; save(); toast('התוכנית שוחזרה'); render(); } break;
      case 'del-session': if (await confirmDlg('למחוק את האימון?', 'לא ניתן לשחזר פעולה זו.', 'מחק', true)) { S.history = S.history.filter((x) => x.id !== b.dataset.id); save(); go('history'); } break;
      case 'hist-rm-set': {
        const h = S.history.find((x) => x.id === b.dataset.hist); const it = h.items[+b.dataset.it];
        it.sets.splice(+b.dataset.si, 1); if (!it.sets.length) h.items.splice(+b.dataset.it, 1);
        save(); render(); break;
      }
      case 'export': exportData(); break;
      case 'wipe': if (await confirmDlg('למחוק הכל?', 'כל ההיסטוריה, המשקלים והתוכנית יימחקו מהמכשיר. מומלץ לייצא גיבוי קודם.', 'מחק הכל', true)) { localStorage.removeItem(KEY); S = fresh(); save(); go(''); render(); } break;
      case 'check-update': checkUpdate(true); break;
      case 'install': if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null; } break;
      case 'hide-install': localStorage.setItem('icongym.installHint', '1'); render(); break;
      case 'rest-plus': if (rest) { rest.end += 15000; rest.total += 15000; tickRest(); } break;
      case 'rest-minus': if (rest) { rest.end -= 15000; tickRest(); } break;
      case 'rest-skip': stopRest(); break;
    }
  });

  function refreshCard(day, ex) {
    const card = $('#ex-' + ex.id); if (!card) return render();
    const idx = day.exercises.indexOf(ex);
    const tmp = document.createElement('div'); tmp.innerHTML = exCard(day, ex, idx);
    const fresh = tmp.firstElementChild;
    // keep the running animation node
    const oldAnim = $('.ex-anim > div', card), newAnimHost = $('.ex-anim > div', fresh);
    if (oldAnim && newAnimHost) newAnimHost.replaceWith(oldAnim);
    card.replaceWith(fresh);
    fixBidi(fresh);
    mountAnims(fresh);
    const pl = $('.prog-line i'); if (pl) pl.style.width = activeProgress() * 100 + '%';
    if (!$('.dh-live') || !$('.day-actions [data-act="finish"]')) render();
  }

  document.addEventListener('input', (e) => {
    const t = e.target;
    if (t.dataset.hist) {
      const h = S.history.find((x) => x.id === t.dataset.hist); if (!h) return;
      h.items[+t.dataset.it].sets[+t.dataset.si][t.dataset.f] = t.value; save(); return;
    }
    const row = t.closest('.sr[data-ex]'); if (!row || !t.dataset.f) return;
    const r = route(); const day = r.a === 'day' ? dayOf(r.b) : null; if (!day) return;
    const { ex } = findEx(row.dataset.ex); if (!ex) return;
    if (!S.active) startSession(day.dow);
    if (S.active.dow !== day.dow) { pendingInput = true; return; }
    const log = ensureLog(ex); const i = +row.dataset.i;
    (log[i] = log[i] || { w: '', r: '', done: false })[t.dataset.f] = t.value; save();
  });
  // typing while another day's workout is active → ask once the field is left
  let pendingInput = false;
  document.addEventListener('change', async (e) => {
    const t = e.target;
    if (t.dataset.setting) { S.settings[t.dataset.setting] = t.checked; save(); if (t.dataset.setting === 'wakeLock') t.checked ? requestWake() : releaseWake(); return; }
    if (t.matches('[data-import]')) return importData(t.files[0]);
    if (pendingInput && t.closest('.sr[data-ex]')) {
      pendingInput = false;
      const r = route(); const day = r.a === 'day' ? dayOf(r.b) : null; if (!day) return;
      if (!(await ensureActive(day.dow))) return;
      $$('.sr[data-ex]').forEach((row) => {
        const { ex } = findEx(row.dataset.ex); if (!ex) return;
        const log = ensureLog(ex); const i = +row.dataset.i;
        $$('input[data-f]', row).forEach((inp) => { if (inp.value) (log[i] = log[i] || { w: '', r: '', done: false })[inp.dataset.f] = inp.value; });
      });
      save(); render();
    }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target; const k = f.dataset.form; if (!k) return;
    e.preventDefault();
    if (k === 'bw') { const kg = num(f.kg.value); if (!kg) return; S.body.weights.push({ date: todayISO(), kg }); save(); render(); toast('המשקל נרשם ✓'); }
    if (k === 'profile') { S.body.height = num(f.height.value) || S.body.height; S.body.protein = f.protein.value.trim() || S.body.protein; const kg = num(f.kg.value); const last = S.body.weights[S.body.weights.length - 1]; if (kg && (!last || last.kg !== kg)) S.body.weights.push({ date: todayISO(), kg }); save(); render(); toast('הפרופיל נשמר ✓'); }
  });
  // select-all on focus for quick editing
  document.addEventListener('focusin', (e) => { if (e.target.matches('.sr input')) setTimeout(() => e.target.select(), 0); });

  // ---------------- backup ----------------
  function exportData() {
    const data = JSON.stringify(Object.assign({ app: 'icongym', exported: todayISO(), appVersion: APP_VERSION }, S), null, 1);
    const name = `icon-gym-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([data], { type: 'application/json' });
    const file = typeof File !== 'undefined' ? new File([blob], name, { type: 'application/json' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'ICON GYM גיבוי' }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
    toast('הגיבוי נשמר ✓');
  }
  function importData(file) {
    if (!file) return;
    const rd = new FileReader();
    rd.onload = async () => {
      try {
        const d = JSON.parse(rd.result);
        if (!d || !Array.isArray(d.days) || !Array.isArray(d.history)) throw new Error('bad');
        if (!(await confirmDlg('לשחזר מגיבוי?', `${d.history.length} אימונים בגיבוי. הנתונים הנוכחיים יוחלפו.`, 'שחזר'))) return;
        delete d.app; delete d.exported; delete d.appVersion;
        localStorage.setItem(KEY, JSON.stringify(d)); S = load(); render(); toast('הגיבוי שוחזר ✓');
      } catch (e) { toast('⚠️ הקובץ אינו גיבוי תקין'); }
    };
    rd.readAsText(file);
  }

  // ---------------- PWA ----------------
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; if (['home', 'settings'].includes(route().a)) render(); });
  let swReg = null;
  function showUpdate(worker) {
    toast('🎉 גרסה חדשה זמינה', { label: 'עדכן עכשיו', run: () => worker.postMessage('skipWaiting') });
  }
  async function checkUpdate(manual) {
    if (!swReg) { if (manual) toast('עדכונים זמינים רק באפליקציה המותקנת'); return; }
    try {
      await swReg.update();
      if (swReg.waiting) showUpdate(swReg.waiting);
      else if (manual) setTimeout(() => { if (swReg.installing) toast('מוריד גרסה חדשה...'); else if (!swReg.waiting) toast(`✓ יש לך את הגרסה העדכנית (${APP_VERSION})`); }, 800);
    } catch (e) { if (manual) toast('אין חיבור לאינטרנט'); }
  }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      swReg = reg;
      if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w); });
      });
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }).catch(() => {});
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
  }

  // ---------------- boot ----------------
  $('#tabs').innerHTML = [['home', 'אימון', I.home, '#/'], ['history', 'היסטוריה', I.hist, '#/history'], ['progress', 'התקדמות', I.chart, '#/progress'], ['settings', 'הגדרות', I.gear, '#/settings']]
    .map(([k, l, ic, h]) => `<a class="tab" data-tab="${k}" href="${h}">${ic}<span>${l}</span></a>`).join('');
  $('#rest').innerHTML = `<svg class="rest-ring" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" class="rg"/><circle cx="20" cy="20" r="18" class="rf"/></svg>
    <div class="rest-txt"><span class="rest-name"></span><b class="rest-time">0:00</b></div>
    <button data-act="rest-minus">−15</button><button data-act="rest-plus">+15</button><button data-act="rest-skip" class="skip">דלג</button>`;
  save();
  if (S.active) requestWake();
  render();
})();
