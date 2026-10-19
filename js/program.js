/* ICON GYM — exercise library + default A/B program.
 * Bump PROGRAM_VERSION when the default program changes: the app will offer the update
 * to the user without touching their history.
 */
(function () {
  const PROGRAM_VERSION = 1;

  const GROUPS = ['חזה', 'גב', 'כתפיים', 'יד קדמית', 'יד אחורית', 'רגליים', 'בטן', 'אירובי'];

  // key → { name, group, anim, kind, tips }
  // kind: reps (weight × reps) | time (seconds) | cardio (minutes)
  const LIBRARY = {
    incline_press: { name: "בנץ' בשיפוע חיובי", group: 'חזה', anim: 'incline_press', tips: ['שיפוע של 30°–45° בספסל', 'שכמות צמודות לספסל ומעט מקושתות', 'הורד לחזה העליון בשליטה, 2–3 שניות', 'מרפקים בזווית של בערך 45 מעלות מהגוף'] },
    bench_press: { name: "בנץ' פרס רגיל", group: 'חזה', anim: 'bench_press', tips: ['רגליים יציבות על הרצפה', 'אחיזה מעט רחבה מרוחב הכתפיים', 'מוריד לאמצע החזה ודוחף למעלה ומעט לאחור', 'בלי כשל ללא משגיח או מוטות בטיחות'] },
    pec_deck: { name: 'פרפר במכונה', group: 'חזה', anim: 'pec_deck', tips: ['גב צמוד למשענת, חזה פתוח', 'מקרב בכוח החזה, לא הידיים', 'עצירה של שנייה בכיווץ', 'חזרה איטית לפתיחה מלאה'] },
    pec_deck_straight: { name: 'פרפר במכונה – ידיים כמעט ישרות', group: 'חזה', anim: 'pec_deck_straight', tips: ['מרפקים מעט כפופים וקבועים', 'קשת רחבה בתנועה', 'מתיחה מלאה בפתיחה'] },
    dips: { name: 'מקבילים', group: 'חזה', anim: 'dips', tips: ['הטה את הגוף מעט קדימה לדגש על החזה', 'רד עד שהכתף מעט מתחת למרפק', 'בלי לנעול מרפקים בכוח למעלה'] },
    push_up: { name: 'שכיבות סמיכה', group: 'חזה', anim: 'push_up', tips: ['גוף ישר כמו קרש', 'חזה כמעט נוגע ברצפה', 'מרפקים ב־45°'] },
    lat_pulldown: { name: 'פולי עליון רחב', group: 'גב', anim: 'lat_pulldown', tips: ['חזה למעלה, הטיה קלה לאחור', 'מושך עם המרפקים כלפי מטה', 'המוט מגיע לחזה העליון', 'חזרה איטית עד מתיחה מלאה'] },
    close_pulldown: { name: 'פולי עליון צר', group: 'גב', anim: 'close_pulldown', tips: ['ידית משולש או אחיזה צרה', 'מושך לחזה התחתון', 'כיווץ שכמות בתחתית'] },
    pullup: { name: 'מתח', group: 'גב', anim: 'pullup', tips: ['התחל מתלייה מלאה', 'משוך את החזה לכיוון המוט', 'בלי תנופה', 'אם קשה – גומייה או מכונת עזר'] },
    seated_row: { name: 'חתירה בישיבה', group: 'גב', anim: 'seated_row', tips: ['גב ישר, חזה פתוח', 'מושך לבטן ומכווץ שכמות', 'בלי להתנדנד עם הגוף'] },
    db_shoulder_press: { name: 'לחיצת כתפיים בדאמבלים', group: 'כתפיים', anim: 'db_shoulder_press', tips: ['ישיבה עם גב צמוד', 'מתחיל בגובה האוזניים', 'דוחף למעלה בלי להקיש דאמבלים', 'בטן אסופה'] },
    lateral_raise: { name: 'הרחקת ידיים לצדדים', group: 'כתפיים', anim: 'lateral_raise', tips: ['מרפקים מעט כפופים', 'מרים עד גובה הכתפיים', 'המרפק מוביל את התנועה', 'משקל קל – טכניקה מושלמת'] },
    reverse_fly: { name: 'פרפר הפוך במכונה', group: 'כתפיים', anim: 'reverse_fly', tips: ['חזה צמוד לכרית', 'פותח לצדדים בקשת רחבה', 'מכווץ כתף אחורית, לא טרפזים'] },
    db_curl: { name: 'כפיפת מרפקים בדאמבלים', group: 'יד קדמית', anim: 'db_curl', tips: ['מרפקים צמודים לגוף', 'סיבוב כף היד כלפי מעלה בעלייה', 'ירידה איטית, 2–3 שניות', 'בלי תנופה מהגב'] },
    hammer_curl: { name: 'פטישים עם דאמבלים', group: 'יד קדמית', anim: 'hammer_curl', tips: ['אחיזה ניטרלית – אגודל למעלה', 'מרפקים קבועים', 'עובד גם על הברכיאליס והאמה'] },
    cable_curl: { name: 'כפיפת מרפקים בכבל תחתון', group: 'יד קדמית', anim: 'cable_curl', tips: ['עמוד צעד מהמכונה', 'מתח קבוע לאורך כל התנועה', 'כיווץ חזק למעלה'] },
    ez_curl: { name: 'כפיפת מרפקים עם מוט W', group: 'יד קדמית', anim: 'ez_curl', tips: ['אחיזה ברוחב הכתפיים', 'מרפקים לא זזים קדימה', 'ירידה מלאה עד יישור'] },
    rope_pushdown: { name: 'פשיטת מרפקים עם חבל', group: 'יד אחורית', anim: 'rope_pushdown', tips: ['מרפקים צמודים לגוף', 'פותח את החבל לצדדים בתחתית', 'עלייה מבוקרת עד 90°'] },
    overhead_ext: { name: 'פשיטת מרפקים מעל הראש עם חבל', group: 'יד אחורית', anim: 'overhead_ext', tips: ['עובד על הראש הארוך במנח מוארך', 'מרפקים קרובים לראש', 'מתיחה מלאה מאחורי הראש', 'התחל במשקל קל'] },
    bar_pushdown: { name: 'פשיטת מרפקים עם מוט ישר', group: 'יד אחורית', anim: 'bar_pushdown', tips: ['מרפקים קבועים ליד הגוף', 'יישור מלא בתחתית', 'שורש כף יד ישר'] },
    one_arm_ext: { name: 'פשיטת מרפקים ביד אחת', group: 'יד אחורית', anim: 'one_arm_ext', tips: ['יד אחת בכל פעם', 'מרפק צמוד לגוף', 'מתחיל עם היד החלשה'] },
    leg_press: { name: 'לחיצת רגליים במכונה', group: 'רגליים', anim: 'leg_press', tips: ['גב תחתון צמוד למשענת', 'כפות רגליים ברוחב הכתפיים', 'ברכיים בכיוון האצבעות', 'בלי לנעול ברכיים למעלה'] },
    leg_curl: { name: 'כפיפת ברכיים במכונה', group: 'רגליים', anim: 'leg_curl', tips: ['אגן צמוד לכרית', 'כיפוף מלא ועצירה קצרה', 'ירידה איטית'] },
    leg_extension: { name: 'פשיטת ברכיים במכונה', group: 'רגליים', anim: 'leg_extension', tips: ['ברך מיושרת עם ציר המכונה', 'עצירה של שנייה למעלה', 'ירידה מבוקרת'] },
    squat: { name: 'סקוואט', group: 'רגליים', anim: 'squat', tips: ['חזה למעלה, גב ניטרלי', 'ירידה עד ירך מקבילה לרצפה', 'ברכיים בכיוון האצבעות'] },
    calf_raise: { name: 'הרמת עקבים – תאומים', group: 'רגליים', anim: 'calf_raise', tips: ['טווח מלא – עקב יורד למטה', 'עצירה של שנייה למעלה', 'בלי קפיצות'] },
    plank: { name: 'פלאנק', group: 'בטן', anim: 'plank', kind: 'time', tips: ['גוף בקו ישר מהראש לעקבים', 'בטן וישבן מכווצים', 'נשימה רגילה'] },
    crunch: { name: 'כפיפות בטן', group: 'בטן', anim: 'crunch', tips: ['גב תחתון צמוד לרצפה', 'מגלגל את הגב העליון', 'בלי למשוך את הראש'] },
    football: { name: 'כדורגל', group: 'אירובי', anim: 'run', kind: 'cardio', tips: ['חימום של 5–10 דקות', 'שתה הרבה מים', 'אם הרגליים עייפות מיום ראשון – עצימות מתונה'] },
    tennis: { name: 'טניס', group: 'אירובי', anim: 'run', kind: 'cardio', tips: ['חימום כתפיים ומפרקי כף יד', 'שתה הרבה מים'] },
    run: { name: 'ריצה / הליכה מהירה', group: 'אירובי', anim: 'run', kind: 'cardio', tips: ['קצב שמאפשר לדבר', 'נעליים מתאימות'] },
  };

  let n = 0;
  const ex = (lib, sets, reps, weight, unit, rest, note) => ({
    id: 'e' + (++n), lib, name: LIBRARY[lib].name, group: LIBRARY[lib].group, anim: LIBRARY[lib].anim,
    kind: LIBRARY[lib].kind || 'reps', sets, reps, weight: weight || '', unit: unit || 'ק״ג', rest: rest || 90, note: note || '',
  });

  function defaultDays() {
    n = 0;
    return [
      {
        dow: 0, type: 'strength', code: 'A1', color: 'red', title: 'חזה + יד קדמית + רגליים',
        note: 'ברגליים התחל במשקל קל יחסית ואל תגיע לכשל – ביום שלישי יש כדורגל/טניס.',
        exercises: [
          ex('incline_press', 3, '8–12', '10–12.5', 'ק״ג לכל צד', 150),
          ex('pec_deck', 3, '10–12', '50–54', 'ק״ג', 90),
          ex('dips', 2, '6–10', 'משקל גוף', '', 120),
          ex('db_curl', 3, '8–12', '12–14', 'ק״ג', 90),
          ex('hammer_curl', 2, '10–12', '12–14', 'ק״ג', 75),
          ex('cable_curl', 2, '10–15', '17', 'ק״ג', 75),
          ex('leg_press', 3, '10–12', '', 'ק״ג', 120, 'התחל קל – עוד לא נמסרו משקלי עבודה'),
          ex('leg_curl', 3, '10–15', '', 'ק״ג', 90),
          ex('calf_raise', 2, '12–15', '', 'ק״ג', 60),
        ],
      },
      {
        dow: 1, type: 'strength', code: 'B1', color: 'blue', title: 'גב + כתפיים + יד אחורית',
        note: 'הפרפר ההפוך מחליף את ה־Face Pull. שים לב במיוחד לפשיטה מעל הראש – היא עובדת על הראש הארוך של היד האחורית.',
        exercises: [
          ex('lat_pulldown', 3, '8–12', '50–60', 'ק״ג', 120),
          ex('seated_row', 3, '8–12', '', 'ק״ג', 120, 'לפי היכולת'),
          ex('db_shoulder_press', 3, '8–12', '16–18', 'ק״ג', 120),
          ex('lateral_raise', 2, '12–15', '', 'ק״ג', 60, 'לפי היכולת'),
          ex('reverse_fly', 2, '12–15', '', 'ק״ג', 60, 'לפי היכולת'),
          ex('rope_pushdown', 3, '10–15', '20', 'ק״ג', 75),
          ex('overhead_ext', 3, '10–15', '', 'ק״ג', 75, 'משקל קל להתחלה'),
        ],
      },
      {
        dow: 2, type: 'cardio', code: 'אירובי', color: 'green', title: 'כדורגל / טניס',
        note: 'יכול להיות שבשבועות הראשונים תרגיש עייפות ברגליים מיום ראשון – זה תקין.',
        exercises: [ex('football', 1, '60', '', 'דק׳', 0), ex('tennis', 1, '60', '', 'דק׳', 0)],
      },
      {
        dow: 3, type: 'strength', code: 'A2', color: 'red', title: 'חזה + יד קדמית + בטן',
        note: "הדגש היום הוא בנץ' רגיל – התקדם בו בהדרגה. בבנץ' חופשי אל תגיע לכשל ללא משגיח או מוטות בטיחות.",
        exercises: [
          ex('bench_press', 3, '6–10', '20', 'ק״ג לכל צד + מוט', 180),
          ex('incline_press', 2, '8–12', '10–12.5', 'ק״ג לכל צד', 150),
          ex('pec_deck_straight', 2, '10–15', '45–54', 'ק״ג', 90),
          ex('ez_curl', 3, '8–12', '15', 'ק״ג + מוט', 90),
          ex('hammer_curl', 2, '10–12', '12–14', 'ק״ג', 75),
          ex('cable_curl', 2, '10–15', '17', 'ק״ג', 75),
          ex('plank', 2, '30–45', '', 'שנ׳', 60),
        ],
      },
      {
        dow: 4, type: 'strength', code: 'B2', color: 'blue', title: 'גב + כתפיים + יד אחורית + רגליים',
        note: '',
        exercises: [
          ex('pullup', 3, '6–8', 'משקל גוף', '', 150),
          ex('close_pulldown', 2, '8–12', '50–60', 'ק״ג', 120),
          ex('seated_row', 2, '8–12', '', 'ק״ג', 120, 'לפי היכולת'),
          ex('lateral_raise', 2, '12–15', '', 'ק״ג', 60),
          ex('reverse_fly', 2, '12–15', '', 'ק״ג', 60),
          ex('bar_pushdown', 3, '10–15', '20', 'ק״ג', 75),
          ex('one_arm_ext', 3, '10–15', '5–10', 'ק״ג', 60),
          ex('leg_press', 3, '10–12', '', 'ק״ג', 120),
          ex('leg_curl', 3, '10–15', '', 'ק״ג', 90),
        ],
      },
      { dow: 5, type: 'rest', code: 'מנוחה', color: 'gray', title: 'התאוששות', note: '', exercises: [] },
      { dow: 6, type: 'rest', code: 'מנוחה', color: 'gray', title: 'התאוששות', note: '', exercises: [] },
    ];
  }

  window.GymProgram = { PROGRAM_VERSION, GROUPS, LIBRARY, defaultDays };
})();
