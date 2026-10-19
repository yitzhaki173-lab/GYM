/* ICON GYM — exercise media: looping demo photos + muscle map.
 * Photos: free-exercise-db (public domain / Unlicense), two frames per exercise (start → end).
 * Local library photos live in img/ex/<key>/{0,1}.jpg; exercises added from the online
 * database use the key "db:<datasetId>" and load from GitHub (cached by the service worker).
 */
(function () {
  const DB_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
  const PHOTOS = window.GymPhotos || {};
  const MAP = window.GymMuscleMap || { front: [], back: [] };

  // dataset muscle names → muscle-map regions
  const DB_MUSCLES = {
    chest: ['chest'], shoulders: ['front-deltoids', 'back-deltoids'], biceps: ['biceps'], triceps: ['triceps'],
    forearms: ['forearm'], abdominals: ['abs', 'obliques'], lats: ['upper-back'], 'middle back': ['upper-back'],
    'lower back': ['lower-back'], traps: ['trapezius'], quadriceps: ['quadriceps'], hamstrings: ['hamstring'],
    glutes: ['gluteal'], calves: ['calves'], adductors: ['adductor'], abductors: ['abductors'], neck: ['neck'],
  };
  // fallback when an exercise has no muscle data: highlight by app muscle group
  const GROUP_MUSCLES = {
    'חזה': ['chest'], 'גב': ['upper-back', 'trapezius'], 'כתפיים': ['front-deltoids', 'back-deltoids'],
    'יד קדמית': ['biceps'], 'יד אחורית': ['triceps'], 'רגליים': ['quadriceps', 'hamstring', 'gluteal'],
    'בטן': ['abs', 'obliques'], 'אירובי': ['quadriceps', 'calves', 'hamstring'],
  };
  const MUSCLE_HE = {
    chest: 'חזה', 'front-deltoids': 'כתף קדמית', 'back-deltoids': 'כתף אחורית', biceps: 'יד קדמית', triceps: 'יד אחורית',
    forearm: 'אמות', abs: 'בטן', obliques: 'אלכסונים', 'upper-back': 'גב עליון', 'lower-back': 'גב תחתון', trapezius: 'טרפזים',
    quadriceps: 'ירך קדמית', hamstring: 'ירך אחורית', gluteal: 'ישבן', calves: 'תאומים', adductor: 'מקרבים', abductors: 'מרחיקים', neck: 'צוואר',
  };

  const isDb = (key) => typeof key === 'string' && key.startsWith('db:');
  function frames(key) {
    if (isDb(key)) { const id = key.slice(3); return [DB_BASE + id + '/0.jpg', DB_BASE + id + '/1.jpg']; }
    if (PHOTOS[key]) return [`img/ex/${key}/0.jpg`, `img/ex/${key}/1.jpg`];
    return null;
  }
  const has = (key) => !!frames(key);
  const focus = (key) => { const p = PHOTOS[key]; return p ? [p.fx, p.fy] : [50, 50]; };

  /* Looping two-frame player. size: 'thumb' (zoomed on the athlete) | 'full' (whole frame + position labels) */
  function player(key, size = 'thumb') {
    const f = frames(key);
    if (!f) return `<div class="ph ph-empty"><svg viewBox="0 0 24 24"><path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11"/></svg></div>`;
    const [fx, fy] = focus(key);
    const lazy = size === 'thumb' ? ' loading="lazy"' : '';
    return `<div class="ph ph-${size}" style="--fx:${fx}%;--fy:${fy}%">
      <img class="a" src="${f[0]}" alt=""${lazy} decoding="async" onload="this.parentNode.classList.add('ok')" onerror="this.parentNode.classList.add('err')">
      <img class="b" src="${f[1]}" alt=""${lazy} decoding="async">
      ${size === 'full' ? '<div class="ph-steps"><span class="s1">תנוחת התחלה</span><span class="s2">תנוחת סיום</span></div>' : ''}
    </div>`;
  }

  function musclesOf(ex) {
    if (ex && ex.muscles && (ex.muscles.p || []).length) return ex.muscles;
    const p = ex && PHOTOS[ex.anim];
    if (p && p.p && p.p.length) return { p: p.p, s: p.s || [] };
    return { p: GROUP_MUSCLES[ex && ex.group] || [], s: [] };
  }
  function fromDataset(primary, secondary) {
    const conv = (arr) => [...new Set((arr || []).flatMap((m) => DB_MUSCLES[m] || []))];
    const p = conv(primary);
    return { p, s: conv(secondary).filter((m) => !p.includes(m)) };
  }

  function muscleMap(m, opts = {}) {
    const P = new Set(m.p || []), Sx = new Set(m.s || []);
    const cls = (name) => (P.has(name) ? 'mp' : Sx.has(name) ? 'ms' : name === 'head' || name === 'neck' || name === 'knees' || name.includes('soleus') ? 'mh' : '');
    const body = (view) => `<svg viewBox="0 0 100 200" class="mm-svg" aria-hidden="true">${MAP[view].map(([name, polys]) => polys.map((pts) => `<polygon points="${pts}" class="${cls(name)}"/>`).join('')).join('')}</svg>`;
    const names = (set) => [...set].map((x) => MUSCLE_HE[x]).filter(Boolean);
    const uniq = (a) => [...new Set(a)];
    return `<div class="mm ${opts.small ? 'small' : ''}"><div class="mm-bodies"><figure>${body('front')}<figcaption>מלפנים</figcaption></figure><figure>${body('back')}<figcaption>מאחור</figcaption></figure></div>
      ${opts.small ? '' : `<div class="mm-legend">${P.size ? `<span><i class="mp"></i>${(opts.labels || [])[0] || 'עיקרי'}: ${uniq(names(P)).join(', ')}</span>` : ''}${Sx.size ? `<span><i class="ms"></i>${(opts.labels || [])[1] || 'משני'}: ${uniq(names(Sx)).join(', ')}</span>` : ''}${!P.size && !Sx.size && opts.empty ? `<span class="muted">${opts.empty}</span>` : ''}</div>`}</div>`;
  }

  function mount(container, key, size) { container.innerHTML = player(key, size || container.dataset.size || 'thumb'); }

  window.GymMedia = { player, mount, has, frames, musclesOf, fromDataset, muscleMap, keys: Object.keys(PHOTOS), DB_BASE, MUSCLE_HE };
})();
