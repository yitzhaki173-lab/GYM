/* ICON GYM — exercise animations.
 * Every exercise is a stick-figure skeleton with two key poses (a, b).
 * The figure is interpolated between them in a loop, with short holds at each end.
 * Coordinates live in a 240x200 box, floor at y=188.
 *
 * side view joints:  H head, N neck, S shoulder, E elbow, W hand, P hip, K knee, F ankle, T toe
 *   far limbs are drawn automatically with an offset, or explicitly via e2/w2/k2/f2/t2.
 * front view joints: same names for the LEFT side of the screen; the right side is mirrored.
 */
(function () {
  const VW = 240, VH = 200, FLOOR = 188, MID = VW / 2;
  const NS = 'http://www.w3.org/2000/svg';

  // ---------- static props (drawn behind the figure) ----------
  const M = 'class="pm"';           // machine fill
  const L = 'class="pl"';           // machine line
  const props = {
    inclineBench: `<line ${L} x1="134" y1="158" x2="66" y2="106" stroke-width="10"/><line ${L} x1="118" y1="152" x2="162" y2="152" stroke-width="9"/><line ${L} x1="126" y1="152" x2="126" y2="188" stroke-width="5"/><line ${L} x1="156" y1="152" x2="156" y2="188" stroke-width="5"/>`,
    flatBench: `<line ${L} x1="36" y1="133" x2="142" y2="133" stroke-width="9"/><line ${L} x1="48" y1="133" x2="48" y2="188" stroke-width="5"/><line ${L} x1="130" y1="133" x2="130" y2="188" stroke-width="5"/><line ${L} x1="74" y1="58" x2="74" y2="188" stroke-width="4" opacity=".6"/><line ${L} x1="66" y1="66" x2="82" y2="66" stroke-width="4" opacity=".6"/>`,
    seatFront: `<rect ${M} x="100" y="58" width="40" height="80" rx="8"/><rect ${M} x="88" y="132" width="64" height="12" rx="5"/><line ${L} x1="120" y1="144" x2="120" y2="188" stroke-width="6"/>`,
    flyMachine: `<rect ${M} x="114" y="12" width="12" height="176" rx="4"/><rect ${M} x="100" y="58" width="40" height="80" rx="8"/><rect ${M} x="88" y="132" width="64" height="12" rx="5"/><line ${L} x1="60" y1="20" x2="180" y2="20" stroke-width="6"/>`,
    dipBars: `<line ${L} x1="92" y1="102" x2="154" y2="102" stroke-width="6"/><line ${L} x1="100" y1="102" x2="100" y2="188" stroke-width="5"/><line ${L} x1="146" y1="102" x2="146" y2="188" stroke-width="5"/>`,
    pullBar: `<line ${L} x1="40" y1="20" x2="200" y2="20" stroke-width="6"/><line ${L} x1="44" y1="20" x2="44" y2="188" stroke-width="5"/><line ${L} x1="196" y1="20" x2="196" y2="188" stroke-width="5"/>`,
    pulldown: `<rect ${M} x="112" y="4" width="16" height="10" rx="3"/><rect ${M} x="88" y="132" width="64" height="12" rx="5"/><rect ${M} x="84" y="124" width="72" height="8" rx="4" opacity=".7"/><line ${L} x1="120" y1="144" x2="120" y2="188" stroke-width="6"/>`,
    columnLeft: `<rect ${M} x="40" y="8" width="16" height="180" rx="4"/><circle class="pu" cx="60" cy="14" r="5"/>`,
    columnLeftLow: `<rect ${M} x="48" y="8" width="16" height="180" rx="4"/><circle class="pu" cx="70" cy="182" r="5"/>`,
    columnRight: `<rect ${M} x="192" y="8" width="16" height="180" rx="4"/><circle class="pu" cx="188" cy="60" r="5"/>`,
    rowMachine: `<rect ${M} x="64" y="148" width="64" height="12" rx="5"/><line ${L} x1="96" y1="160" x2="96" y2="188" stroke-width="6"/><rect ${M} x="206" y="20" width="16" height="168" rx="4"/><circle class="pu" cx="205" cy="140" r="5"/><line ${L} x1="174" y1="140" x2="178" y2="182" stroke-width="6"/>`,
    legPress: `<line ${L} x1="30" y1="104" x2="92" y2="156" stroke-width="9"/><line ${L} x1="70" y1="156" x2="110" y2="156" stroke-width="8"/><line ${L} x1="86" y1="156" x2="86" y2="188" stroke-width="5"/><line ${L} x1="104" y1="176" x2="212" y2="68" stroke-width="5" opacity=".7"/><line ${L} x1="200" y1="80" x2="200" y2="188" stroke-width="5" opacity=".7"/>`,
    lyingCurl: `<line ${L} x1="28" y1="135" x2="166" y2="135" stroke-width="9"/><line ${L} x1="40" y1="135" x2="40" y2="188" stroke-width="5"/><line ${L} x1="150" y1="135" x2="150" y2="188" stroke-width="5"/><line ${L} x1="24" y1="135" x2="24" y2="150" stroke-width="5"/>`,
    step: `<rect ${M} x="96" y="180" width="36" height="8" rx="2"/>`,
    legExt: `<line ${L} x1="140" y1="58" x2="132" y2="140" stroke-width="9"/><line ${L} x1="92" y1="142" x2="136" y2="142" stroke-width="9"/><line ${L} x1="118" y1="142" x2="118" y2="188" stroke-width="6"/>`,
    squatRack: `<line ${L} x1="160" y1="30" x2="160" y2="188" stroke-width="4" opacity=".5"/><line ${L} x1="152" y1="58" x2="168" y2="58" stroke-width="4" opacity=".5"/>`,
    mat: `<rect ${M} x="20" y="184" width="200" height="4" rx="2"/>`,
    field: `<line class="pl" x1="10" y1="188" x2="230" y2="188" stroke-width="2" stroke-dasharray="8 6" opacity=".6"/>`,
  };

  // ---------- skeletons ----------
  const stand = { H: [112, 40], N: [115, 54], S: [116, 58], P: [118, 114], K: [120, 150], F: [120, 184], T: [107, 186] };
  const standFront = { H: [120, 36], N: [120, 52], S: [100, 58], P: [120, 114], K: [110, 150], F: [110, 184] };
  const seatedFront = { H: [120, 50], N: [120, 66], S: [99, 72], P: [120, 130], K: [101, 138], F: [100, 184] };
  const curlBase = Object.assign({}, stand);
  const pushBase = { H: [108, 40], N: [112, 54], S: [114, 58], P: [120, 114], K: [120, 150], F: [120, 184], T: [107, 186] };

  const LIB = {
    incline_press: {
      view: 'side', props: 'inclineBench',
      base: { H: [56, 92], N: [68, 102], S: [70, 106], P: [118, 144], K: [150, 140], F: [152, 184], T: [164, 186] },
      a: { E: [88, 124], W: [84, 100] }, b: { E: [78, 80], W: [84, 54] },
      eq: [{ t: 'bar', at: 'W' }],
    },
    bench_press: {
      view: 'side', props: 'flatBench',
      base: { H: [52, 120], N: [64, 124], S: [68, 124], P: [122, 124], K: [156, 140], F: [160, 180], T: [172, 184] },
      a: { E: [80, 140], W: [76, 114] }, b: { E: [72, 98], W: [72, 72] },
      eq: [{ t: 'bar', at: 'W' }],
    },
    pec_deck: {
      view: 'front', props: 'flyMachine', base: seatedFront,
      a: { E: [68, 76], W: [64, 48] }, b: { E: [110, 82], W: [112, 52] },
      eq: [{ t: 'pad', from: 'E', to: 'W', back: true }],
    },
    pec_deck_straight: {
      view: 'front', props: 'flyMachine', base: seatedFront,
      a: { E: [72, 74], W: [46, 72] }, b: { E: [104, 82], W: [114, 86] },
      eq: [{ t: 'handleV', at: 'W' }],
    },
    reverse_fly: {
      view: 'front', props: 'flyMachine', base: seatedFront,
      a: { E: [106, 82], W: [114, 86] }, b: { E: [74, 72], W: [48, 70] },
      eq: [{ t: 'handleV', at: 'W' }],
    },
    dips: {
      view: 'side', props: 'dipBars',
      a: { H: [116, 30], N: [118, 44], S: [118, 48], E: [120, 74], W: [122, 100], P: [120, 102], K: [128, 136], F: [108, 152], T: [103, 162] },
      b: { H: [104, 62], N: [108, 74], S: [110, 78], E: [136, 88], W: [122, 100], P: [122, 128], K: [132, 160], F: [110, 172], T: [105, 181] },
    },
    push_up: {
      view: 'side', props: 'mat',
      a: { H: [46, 118], N: [58, 124], S: [60, 126], E: [62, 154], W: [62, 182], P: [116, 150], K: [150, 165], F: [186, 180], T: [190, 186] },
      b: { H: [46, 152], N: [58, 158], S: [60, 160], E: [82, 170], W: [62, 182], P: [118, 169], K: [152, 175], F: [186, 180], T: [190, 186] },
    },
    db_curl: {
      view: 'side', base: curlBase,
      a: { E: [118, 86], W: [116, 112] }, b: { E: [118, 86], W: [102, 64] },
      eq: [{ t: 'db', at: 'W', far: true }],
    },
    hammer_curl: {
      view: 'side', base: curlBase,
      a: { E: [118, 86], W: [116, 112] }, b: { E: [118, 86], W: [102, 64] },
      eq: [{ t: 'dbv', at: 'W', far: true }],
    },
    ez_curl: {
      view: 'side', base: curlBase,
      a: { E: [118, 86], W: [116, 112] }, b: { E: [118, 86], W: [102, 64] },
      eq: [{ t: 'bar', at: 'W' }],
    },
    cable_curl: {
      view: 'side', props: 'columnLeftLow', base: curlBase,
      a: { E: [118, 86], W: [116, 112] }, b: { E: [118, 86], W: [102, 64] },
      eq: [{ t: 'cable', from: [70, 182], to: 'W' }, { t: 'handle', at: 'W' }],
    },
    db_shoulder_press: {
      view: 'front', props: 'seatFront', base: seatedFront,
      a: { E: [74, 80], W: [76, 54] }, b: { E: [90, 48], W: [94, 22] },
      eq: [{ t: 'dbh', at: 'W' }],
    },
    lateral_raise: {
      view: 'front', base: standFront,
      a: { E: [97, 84], W: [96, 110] }, b: { E: [74, 62], W: [50, 66] },
      eq: [{ t: 'dbh', at: 'W' }],
    },
    lat_pulldown: {
      view: 'front', props: 'pulldown', base: seatedFront,
      a: { E: [80, 50], W: [70, 26] }, b: { E: [76, 98], W: [80, 72] },
      eq: [{ t: 'cable', from: [120, 10], to: 'Wmid' }, { t: 'barH', at: 'W', ext: 18 }],
    },
    close_pulldown: {
      view: 'front', props: 'pulldown', base: seatedFront,
      a: { E: [104, 50], W: [110, 26] }, b: { E: [94, 104], W: [108, 82] },
      eq: [{ t: 'cable', from: [120, 10], to: 'Wmid' }, { t: 'barH', at: 'W', ext: 0 }],
    },
    pullup: {
      view: 'front', props: 'pullBar',
      a: { W: [76, 22], E: [84, 48], S: [100, 72], H: [120, 60], N: [120, 74], P: [120, 130], K: [111, 160], F: [113, 186] },
      b: { W: [76, 22], E: [80, 50], S: [100, 40], H: [120, 16], N: [120, 34], P: [120, 96], K: [111, 126], F: [113, 152] },
    },
    seated_row: {
      view: 'side', props: 'rowMachine', face: 1,
      base: { P: [100, 146], K: [136, 130], F: [170, 150], T: [176, 140] },
      a: { H: [108, 82], N: [105, 96], S: [106, 100], E: [131, 108], W: [157, 116] },
      b: { H: [94, 80], N: [96, 94], S: [97, 98], E: [82, 116], W: [108, 120] },
      eq: [{ t: 'cable', from: [205, 140], to: 'W' }, { t: 'handle', at: 'W' }],
    },
    rope_pushdown: {
      view: 'side', props: 'columnLeft', base: pushBase,
      a: { E: [118, 88], W: [100, 74] }, b: { E: [118, 88], W: [112, 114] },
      eq: [{ t: 'cable', from: [60, 14], to: 'W' }, { t: 'rope', at: 'W' }],
    },
    bar_pushdown: {
      view: 'side', props: 'columnLeft', base: pushBase,
      a: { E: [118, 88], W: [100, 74] }, b: { E: [118, 88], W: [112, 114] },
      eq: [{ t: 'cable', from: [60, 14], to: 'W' }, { t: 'handle', at: 'W' }],
    },
    one_arm_ext: {
      view: 'side', props: 'columnLeft', base: pushBase, noFarArm: true,
      a: { E: [118, 88], W: [100, 74] }, b: { E: [118, 88], W: [112, 114] },
      eq: [{ t: 'cable', from: [60, 14], to: 'W' }, { t: 'handle', at: 'W' }],
    },
    overhead_ext: {
      view: 'side', props: 'columnRight',
      base: { H: [100, 46], N: [106, 58], S: [108, 62], P: [124, 114], K: [110, 148], F: [100, 184], T: [88, 186], k2: [138, 150], f2: [150, 184], t2: [140, 186] },
      a: { E: [98, 40], W: [122, 34] }, b: { E: [98, 40], W: [86, 16] },
      eq: [{ t: 'cable', from: [188, 60], to: 'W' }, { t: 'rope', at: 'W' }],
    },
    leg_press: {
      view: 'side', props: 'legPress', face: 1,
      base: { H: [42, 98], N: [52, 108], S: [54, 111], P: [90, 146], E: [70, 134], W: [86, 142] },
      a: { K: [81, 109], F: [118, 118], T: [127, 110] }, b: { K: [104, 108], F: [142, 94], T: [150, 86] },
      eq: [{ t: 'legplate', at: 'F' }],
    },
    leg_curl: {
      view: 'side', props: 'lyingCurl', face: 1,
      base: { H: [40, 118], N: [52, 124], S: [56, 126], P: [110, 126], K: [148, 126], E: [46, 146], W: [34, 140] },
      a: { F: [184, 126], T: [194, 131] }, b: { F: [158, 92], T: [167, 87] },
      eq: [{ t: 'roller', at: 'F' }],
    },
    leg_extension: {
      view: 'side', props: 'legExt',
      base: { H: [126, 56], N: [128, 70], S: [128, 74], P: [126, 134], K: [90, 136], E: [130, 104], W: [118, 132] },
      a: { F: [88, 172], T: [76, 176] }, b: { F: [54, 128], T: [50, 116] },
      eq: [{ t: 'roller', at: 'F' }],
    },
    calf_raise: {
      view: 'side', props: 'step',
      a: { H: [112, 40], N: [115, 54], S: [116, 58], E: [118, 86], W: [118, 112], P: [118, 114], K: [120, 150], F: [122, 178], T: [108, 180] },
      b: { H: [112, 29], N: [115, 43], S: [116, 47], E: [118, 75], W: [118, 101], P: [118, 103], K: [120, 139], F: [120, 167], T: [108, 180] },
      eq: [{ t: 'db', at: 'W', far: true }],
    },
    squat: {
      view: 'side', props: 'squatRack',
      a: { H: [116, 36], N: [118, 50], S: [119, 54], E: [132, 66], W: [124, 50], B: [122, 52], P: [120, 110], K: [118, 147], F: [120, 184], T: [107, 186] },
      b: { H: [104, 86], N: [112, 98], S: [113, 102], E: [128, 114], W: [116, 100], B: [116, 100], P: [140, 146], K: [104, 150], F: [116, 184], T: [103, 186] },
      eq: [{ t: 'bar', at: 'B' }],
    },
    crunch: {
      view: 'side', props: 'mat', face: 1,
      a: { H: [44, 170], N: [56, 176], S: [58, 177], E: [48, 158], W: [44, 166], P: [110, 180], K: [136, 150], F: [160, 180], T: [170, 176] },
      b: { H: [66, 146], N: [72, 158], S: [74, 160], E: [66, 140], W: [62, 150], P: [110, 180], K: [136, 150], F: [160, 180], T: [170, 176] },
    },
    plank: {
      view: 'side', props: 'mat', period: 3600,
      a: { H: [48, 146], N: [60, 152], S: [62, 154], E: [64, 182], W: [90, 184], P: [118, 158], K: [152, 170], F: [184, 180], T: [187, 187] },
      b: { H: [48, 144], N: [60, 151], S: [62, 153], E: [64, 182], W: [90, 184], P: [118, 155], K: [152, 169], F: [184, 180], T: [187, 187] },
    },
    run: {
      view: 'side', props: 'field', period: 900, hold: 0,
      a: { H: [116, 38], N: [116, 52], S: [117, 56], P: [122, 108], E: [104, 78], W: [94, 64], e2: [132, 78], w2: [126, 100], K: [104, 134], F: [110, 166], T: [98, 168], k2: [132, 140], f2: [150, 160], t2: [148, 172], BL: [80, 180] },
      b: { H: [116, 41], N: [116, 55], S: [117, 59], P: [122, 111], E: [132, 80], W: [126, 102], e2: [104, 80], w2: [94, 66], K: [132, 142], F: [150, 162], T: [148, 174], k2: [104, 137], f2: [110, 169], t2: [98, 171], BL: [66, 168] },
      eq: [{ t: 'ball', at: 'BL' }],
    },
  };

  // ---------- math ----------
  const lerp = (p, q, e) => [p[0] + (q[0] - p[0]) * e, p[1] + (q[1] - p[1]) * e];
  const add = (p, d) => [p[0] + d[0], p[1] + d[1]];
  const mir = (p) => [VW - p[0], p[1]];
  const smooth = (x) => x * x * (3 - 2 * x);

  function easeAt(def, ms) {
    const period = def.period || 2800, hold = def.hold == null ? 0.12 : def.hold;
    const t = (ms % period) / period;
    const tri = t < 0.5 ? t * 2 : 2 - t * 2;
    const x = Math.min(1, Math.max(0, (tri - hold) / (1 - hold * 2)));
    return smooth(x);
  }

  function poseAt(def, e) {
    const keys = new Set([...Object.keys(def.base || {}), ...Object.keys(def.a), ...Object.keys(def.b)]);
    const out = {};
    keys.forEach((k) => {
      const pa = def.a[k] || def.base[k], pb = def.b[k] || def.base[k];
      out[k] = lerp(pa || pb, pb || pa, e);
    });
    if (def.view === 'side') {
      const dir = def.face || -1;
      if (!out.T) out.T = add(out.F, [dir * 12, 2]);
    }
    return out;
  }

  // ---------- svg helpers ----------
  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  const setLine = (n, p, q) => { n.setAttribute('x1', p[0].toFixed(1)); n.setAttribute('y1', p[1].toFixed(1)); n.setAttribute('x2', q[0].toFixed(1)); n.setAttribute('y2', q[1].toFixed(1)); };
  const setC = (n, p) => { n.setAttribute('cx', p[0].toFixed(1)); n.setAttribute('cy', p[1].toFixed(1)); };
  const setT = (n, p, rot) => n.setAttribute('transform', `translate(${p[0].toFixed(1)} ${p[1].toFixed(1)})${rot ? ` rotate(${rot})` : ''}`);

  // equipment builders: return { update(pose, sideKey) }
  function makeEq(eq, g, def) {
    const resolve = (pose, ref) => {
      if (Array.isArray(ref)) return ref;
      if (ref === 'Wmid') return [MID, pose.W[1]];
      return pose[ref];
    };
    switch (eq.t) {
      case 'cable': {
        const n = el('line', { class: 'cab' }, g);
        return { update: (p) => setLine(n, resolve(p, eq.from), resolve(p, eq.to)) };
      }
      case 'bar': { // barbell seen from the side → a plate
        const grp = el('g', {}, g);
        el('circle', { r: 15, class: 'plate' }, grp); el('circle', { r: 9, class: 'plate2' }, grp); el('circle', { r: 3, class: 'hub' }, grp);
        return { update: (p) => setT(grp, resolve(p, eq.at)) };
      }
      case 'db': { // dumbbell from the side
        const grp = el('g', {}, g);
        el('circle', { r: 7.5, class: 'plate' }, grp); el('circle', { r: 2.5, class: 'hub' }, grp);
        return { update: (p) => setT(grp, resolve(p, eq.at)) };
      }
      case 'dbv': { // neutral grip dumbbell, vertical
        const grp = el('g', {}, g);
        el('rect', { x: -2, y: -11, width: 4, height: 22, rx: 2, class: 'metal' }, grp);
        el('rect', { x: -6, y: -15, width: 12, height: 7, rx: 2.5, class: 'plate' }, grp);
        el('rect', { x: -6, y: 8, width: 12, height: 7, rx: 2.5, class: 'plate' }, grp);
        return { update: (p) => setT(grp, resolve(p, eq.at)) };
      }
      case 'dbh': { // dumbbell horizontal (front view)
        const grp = el('g', {}, g);
        el('rect', { x: -11, y: -2, width: 22, height: 4, rx: 2, class: 'metal' }, grp);
        el('rect', { x: -15, y: -6, width: 7, height: 12, rx: 2.5, class: 'plate' }, grp);
        el('rect', { x: 8, y: -6, width: 7, height: 12, rx: 2.5, class: 'plate' }, grp);
        return { update: (p, mirror) => setT(grp, mirror ? mir(p.W) : p.W) };
      }
      case 'barH': {
        const n = el('line', { class: 'metalL' }, g);
        return { update: (p) => setLine(n, [p.W[0] - eq.ext, p.W[1]], [VW - p.W[0] + eq.ext, p.W[1]]) };
      }
      case 'handle': {
        const n = el('rect', { x: -6, y: -3, width: 12, height: 6, rx: 3, class: 'metal' }, g);
        return { update: (p) => setT(n, resolve(p, eq.at)) };
      }
      case 'handleV': {
        const n = el('rect', { x: -3, y: -8, width: 6, height: 16, rx: 3, class: 'metal' }, g);
        return { update: (p, mirror) => setT(n, mirror ? mir(p.W) : p.W) };
      }
      case 'rope': {
        const grp = el('g', {}, g);
        el('path', { d: 'M0 0 L-5 12 M0 0 L5 12', class: 'rope' }, grp);
        el('circle', { cy: 12, cx: -5, r: 2.5, class: 'hub' }, grp); el('circle', { cy: 12, cx: 5, r: 2.5, class: 'hub' }, grp);
        return { update: (p) => setT(grp, resolve(p, eq.at)) };
      }
      case 'pad': {
        const n = el('line', { class: 'padL' }, g);
        return { update: (p, mirror) => setLine(n, mirror ? mir(p[eq.from]) : p[eq.from], mirror ? mir(p[eq.to]) : p[eq.to]) };
      }
      case 'legplate': {
        const n = el('line', { class: 'padL' }, g);
        return { update: (p) => { const c = add(p.F, [5, -5]); setLine(n, add(c, [-13, -13]), add(c, [13, 13])); } };
      }
      case 'roller': {
        const n = el('circle', { r: 6.5, class: 'roller' }, g);
        return { update: (p) => setC(n, add(p.F, [def.face === 1 ? 3 : -3, def.props === 'lyingCurl' ? -5 : 4])) };
      }
      case 'ball': {
        const grp = el('g', {}, g);
        el('circle', { r: 8, class: 'ball' }, grp);
        el('path', { d: 'M-8 0 H8 M0 -8 V8', class: 'ballL' }, grp);
        return { update: (p) => setT(grp, p.BL) };
      }
    }
    return { update() {} };
  }

  function build(key) {
    const def = LIB[key] || LIB.db_curl;
    const svg = el('svg', { viewBox: `0 0 ${VW} ${VH}`, class: 'anim-svg', 'aria-hidden': 'true' });
    const uid = 'g' + Math.random().toString(36).slice(2, 8);
    svg.innerHTML = `<defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--fig1)"/><stop offset="1" stop-color="var(--fig2)"/></linearGradient>
      <radialGradient id="${uid}s" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient></defs>
      <ellipse cx="120" cy="189" rx="70" ry="6" fill="url(#${uid}s)"/>
      <line class="floor" x1="8" y1="${FLOOR}" x2="${VW - 8}" y2="${FLOOR}"/>
      ${props[def.props] || ''}`;
    const paint = `url(#${uid})`;
    const gBack = el('g', {}, svg);
    const gFar = el('g', { opacity: '.42' }, svg);
    const gBody = el('g', {}, svg);
    const gFront = el('g', {}, svg);
    const bone = (parent, w) => el('line', { class: 'bone', 'stroke-width': w, stroke: paint }, parent);
    const updaters = [];

    if (def.view === 'side') {
      const farArm = !def.noFarArm;
      const fa1 = farArm && bone(gFar, 7), fa2 = farArm && bone(gFar, 6.5);
      const fl1 = bone(gFar, 9), fl2 = bone(gFar, 8), fl3 = bone(gFar, 6);
      const farEq = (def.eq || []).filter((q) => q.far).map((q) => makeEq(q, gFar, def));
      const backEq = (def.eq || []).filter((q) => q.back || q.t === 'cable').map((q) => makeEq(q, gBack, def));
      const torso = bone(gBody, 15), neck = bone(gBody, 7);
      const l1 = bone(gBody, 10), l2 = bone(gBody, 8.5), l3 = bone(gBody, 6.5);
      const a1 = bone(gBody, 7.5), a2 = bone(gBody, 7);
      const head = el('circle', { r: 9.5, fill: paint, class: 'head' }, gBody);
      const frontEq = (def.eq || []).filter((q) => !q.back && q.t !== 'cable').map((q) => makeEq(q, gFront, def));
      const off = [5, -3];
      updaters.push((p) => {
        const o = (k, k2) => p[k2] || add(p[k], off);
        if (farArm) { setLine(fa1, o('S'), o('E', 'e2')); setLine(fa2, o('E', 'e2'), o('W', 'w2')); }
        const fk = o('K', 'k2'), ff = o('F', 'f2'), ft = p.t2 || add(p.T, off);
        setLine(fl1, p.P, fk); setLine(fl2, fk, ff); setLine(fl3, ff, ft);
        farEq.forEach((u) => u.update(Object.assign({}, p, { W: o('W', 'w2') })));
        backEq.forEach((u) => u.update(p));
        setLine(torso, p.N, p.P); setLine(neck, p.N, p.H);
        setLine(l1, p.P, p.K); setLine(l2, p.K, p.F); setLine(l3, p.F, p.T);
        setLine(a1, p.S, p.E); setLine(a2, p.E, p.W);
        setC(head, p.H);
        frontEq.forEach((u) => u.update(p));
      });
    } else {
      const MIRRORED = { dbh: 1, handleV: 1, pad: 1 };
      const mk = (q, g) => ({ u: makeEq(q, g, def), m: MIRRORED[q.t] ? makeEq(q, g, def) : null });
      const backU = (def.eq || []).filter((q) => q.back || q.t === 'cable').map((q) => mk(q, gBack));
      const torso = el('path', { fill: paint, class: 'torso' }, gBody);
      const neck = bone(gBody, 7);
      const legs = [0, 1].map(() => [bone(gBody, 10), bone(gBody, 8.5)]);
      const arms = [0, 1].map(() => [bone(gBody, 7.5), bone(gBody, 7)]);
      const head = el('circle', { r: 10, fill: paint, class: 'head' }, gBody);
      const frontU = (def.eq || []).filter((q) => !q.back && q.t !== 'cable').map((q) => mk(q, gFront));
      const run = (list, p) => list.forEach((x) => { x.u.update(p, false); if (x.m) x.m.update(p, true); });
      updaters.push((p) => {
        run(backU, p);
        const S = p.S, Sm = mir(S), Q = add(p.P, [-12, 0]), Qm = mir(Q);
        const f = (v) => v[0].toFixed(1) + ' ' + v[1].toFixed(1);
        torso.setAttribute('d', `M${f(add(S, [0, -3]))} L${f(add(Sm, [0, -3]))} Q${f(add(Sm, [-2, 26]))} ${f(add(Qm, [2, 0]))} L${f(add(Q, [-2, 0]))} Q${f(add(S, [2, 26]))} ${f(add(S, [0, -3]))}Z`);
        setLine(neck, p.N, p.H);
        [[Q, p.K, p.F], [Qm, mir(p.K), mir(p.F)]].forEach((pts, i) => { setLine(legs[i][0], pts[0], pts[1]); setLine(legs[i][1], pts[1], pts[2]); });
        [[S, p.E, p.W], [Sm, mir(p.E), mir(p.W)]].forEach((pts, i) => { setLine(arms[i][0], pts[0], pts[1]); setLine(arms[i][1], pts[1], pts[2]); });
        setC(head, p.H);
        run(frontU, p);
      });
    }

    const upd = (ms) => { const pose = poseAt(def, easeAt(def, ms)); updaters.forEach((fn) => fn(pose)); };
    upd(0);
    return { svg, upd };
  }

  // ---------- global loop ----------
  const live = new Set();
  let running = false;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function loop(ms) {
    live.forEach((a) => { if (!a.svg.isConnected) live.delete(a); else if (a.visible !== false) a.upd(ms * (reduce ? 0.5 : 1)); });
    if (live.size) requestAnimationFrame(loop); else running = false;
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((ents) => ents.forEach((en) => { if (en.target.__anim) en.target.__anim.visible = en.isIntersecting; })) : null;

  function mount(container, key) {
    container.innerHTML = '';
    const a = build(key);
    container.appendChild(a.svg);
    a.svg.__anim = a;
    if (io) io.observe(a.svg);
    live.add(a);
    if (!running) { running = true; requestAnimationFrame(loop); }
    return a;
  }

  window.GymAnim = { mount, keys: Object.keys(LIB), has: (k) => !!LIB[k] };
})();
