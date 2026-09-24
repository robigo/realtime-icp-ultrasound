/* EchoPulse Research v1: unvalidated prototype. Design weights are not clinical scores. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stages = [
    { id: 'near', label: 'קרוב · שתי העיניים', distanceMm: 400, help: 'שתי העיניים פתוחות, משקפי קריאה אם אלה המשקפיים הרגילים שלך לקרוב.' },
    { id: 'right', label: 'רחוק · עין ימין', distanceMm: 2000, help: 'כסו את עין שמאל בלי ללחוץ עליה. אדם נוסף מחזיק את המסך במרחק 2 מטרים ומקליד רק את התשובה הנאמרת.' },
    { id: 'left', label: 'רחוק · עין שמאל', distanceMm: 2000, help: 'כסו את עין ימין בלי ללחוץ עליה. אדם נוסף מחזיק את המסך במרחק 2 מטרים ומקליד רק את התשובה הנאמרת.' }
  ];
  const coarse = [10, 8, 5, 2, 0]; // Tenths of logMAR; finer 0.1 steps follow a failed coarse level.
  const directions = ['right', 'down', 'left', 'up'];
  const turns = [0, 90, 180, 270];
  const state = { examId: '', runs: [], run: 0, stage: 0, record: null, level: 10, coarseIndex: 0, refining: false, trial: 0, correct: 0, angle: 0, pxPerMm: 0 };
  const distanceText = mm => mm === 400 ? '40 ס״מ' : '2 מטרים';
  const stage = () => stages[state.stage];
  function newExamId() {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `RESEARCH-${hex.slice(0, 5)}-${hex.slice(5, 10)}-${hex.slice(10, 15)}-${hex.slice(15)}`;
  }
  function show(section) {
    for (const id of ['prep', 'test', 'results']) $(id).hidden = id !== section;
  }
  function prepare() {
    const item = stage();
    $('prepProgress').textContent = `סבב ${state.run + 1} · תנאי ${state.stage + 1} מתוך 3`;
    $('prepHeading').textContent = item.label;
    $('prepHelp').textContent = item.help;
    $('prepDistance').textContent = distanceText(item.distanceMm);
    $('confirmedText').textContent = item.id === 'near'
      ? 'מדדתי 40 ס״מ, כיילתי 5 ס״מ ושתי העיניים פתוחות.'
      : `מדדתי ${distanceText(item.distanceMm)}, כיילתי 5 ס״מ ואישרתי את כיסוי העין השנייה.`;
    $('confirmed').checked = false;
    $('startStage').disabled = true;
    $('prepError').hidden = true;
    $('skipStage').hidden = true;
    show('prep');
  }
  function pixelsFor(level) {
    const heightMm = stage().distanceMm * Math.tan((5 / 60) * Math.PI / 180) * Math.pow(10, level / 10);
    return heightMm * state.pxPerMm;
  }
  function canDisplay(level) {
    const space = document.querySelector('.optotype-space');
    const px = pixelsFor(level);
    // Five SVG strokes; at least two CSS pixels per stroke, and whole crowding box fits.
    return px >= 10 && px * 2.4 <= Math.min(space.clientWidth, space.clientHeight) - 12;
  }
  function showLetter() {
    state.angle = Math.floor(Math.random() * 4);
    const px = pixelsFor(state.level);
    $('optotype').style.width = `${px}px`;
    $('optotype').style.height = `${px}px`;
    $('optotype').style.transform = `rotate(${turns[state.angle]}deg)`;
    $('crowdingFrame').style.padding = `${px / 2}px`;
    $('crowdingFrame').style.borderWidth = `${px / 5}px`;
    $('symbolCount').textContent = `גודל ${(state.level / 10).toFixed(1)} · סימן ${state.trial + 1}/5`;
    $('testProgress').textContent = `סבב ${state.run + 1} · ${stage().label}`;
    $('testHelp').textContent = stage().help;
  }
  function finishStage(reason = null) {
    const record = state.record || { id: stage().id, label: stage().label, distanceMm: stage().distanceMm, pxPerMm: state.pxPerMm, bestPassedTenths: null, trials: [], limitation: null };
    record.limitation = reason;
    // The last pass is not a threshold if display limitations prevented the next level.
    record.thresholdTenths = reason?.startsWith('מגבלת מסך') ? null : record.bestPassedTenths;
    state.runs[state.run].push(record);
    state.record = null;
    state.stage++;
    if (state.stage === stages.length) showResults();
    else prepare();
  }
  function advance(level) {
    if (!canDisplay(level)) {
      finishStage('מגבלת מסך: לא ניתן להציג את הגודל הבא');
      return;
    }
    state.level = level;
    state.trial = 0;
    state.correct = 0;
    showLetter();
  }
  function answer(direction) {
    if ($('test').hidden || !state.record) return;
    const expected = directions[state.angle];
    const correct = direction === expected;
    state.record.trials.push({ levelTenths: state.level, expected, answer: direction, correct });
    if (correct) state.correct++;
    state.trial++;
    if (state.trial !== 5) { showLetter(); return; }
    const passed = state.correct >= 4;
    if (passed) state.record.bestPassedTenths = state.level;
    if (state.refining) {
      if (passed || state.level + 1 >= state.record.bestPassedTenths) finishStage();
      else advance(state.level + 1);
      return;
    }
    if (!passed) {
      if (state.record.bestPassedTenths === null) finishStage('פחות מ־4 מתוך 5 בגודל ההתחלתי');
      else { state.refining = true; advance(state.level + 1); }
      return;
    }
    if (state.coarseIndex === coarse.length - 1) finishStage();
    else advance(coarse[++state.coarseIndex]);
  }
  function description(record) {
    if (record.limitation?.startsWith('מגבלת מסך')) {
      return record.bestPassedTenths === null
        ? 'לא ניתן להתחיל: המסך לא הציג את הגודל הראשון לפי הכיול.'
        : `עבר את הגודל ${(record.bestPassedTenths / 10).toFixed(1)} logMAR תיאורטי; הגודל הבא לא הוצג. אין סף מדוד.`;
    }
    if (record.thresholdTenths === null) return record.limitation || 'לא הושג סף בגודל הראשון.';
    return `הגודל הקטן ביותר שעבר: ${(record.thresholdTenths / 10).toFixed(1)} logMAR תיאורטי.`;
  }
  function showResults() {
    $('examId').textContent = state.examId;
    $('resultContext').textContent = `הושלמו ${state.runs.length} סבבים. המשקולות 40/30/20/10 הן בחירות תכנון בלבד ואינן משנות את התשובות.`;
    $('resultRows').replaceChildren();
    const lines = [`EchoPulse Research v1 — אב־טיפוס לא מאומת`, `מזהה: ${state.examId}`, 'שקלול תכנוני: פרוטוקול 40%, בקרת מדידה 30%, חזרתיות 20%, שימושיות 10%. המשקולות אינן ציון ראייה.'];
    for (const [runIndex, records] of state.runs.entries()) {
      for (const record of records) {
        const article = document.createElement('article');
        const heading = document.createElement('h3');
        heading.textContent = `סבב ${runIndex + 1} · ${record.label} (${distanceText(record.distanceMm)})`;
        const result = document.createElement('p');
        result.textContent = description(record);
        const note = document.createElement('p');
        note.className = 'result-note';
        const correct = record.trials.filter(trial => trial.correct).length;
        note.textContent = `${correct}/${record.trials.length} תשובות נכונות; המרחק והמסך אושרו ידנית${record.limitation ? `; ${record.limitation}` : ''}.`;
        article.append(heading, result, note);
        $('resultRows').append(article);
        lines.push(`סבב ${runIndex + 1}, ${record.label}, ${distanceText(record.distanceMm)}: ${description(record)} ${correct}/${record.trials.length} תשובות נכונות.${record.limitation ? ` ${record.limitation}.` : ''}`);
      }
    }
    if (state.runs.length === 2) {
      const changes = stages.map((item, i) => {
        const first = state.runs[0][i]?.thresholdTenths;
        const second = state.runs[1][i]?.thresholdTenths;
        return `${item.label}: ${first == null || second == null ? 'לא ניתן לחשב פער' : `${(Math.abs(first - second) / 10).toFixed(1)} logMAR הפרש בין סבבים`}`;
      });
      $('comparison').textContent = `השוואת חזרה תיאורית בלבד — ${changes.join('; ')}. אין להסיק מכך מהימנות קלינית ללא מחקר השוואתי.`;
      lines.push($('comparison').textContent);
    } else {
      $('comparison').textContent = 'אפשר לבצע סבב חוזר באותו מזהה כדי לתעד את הפער בין שתי מדידות. פער יחיד אינו מדד מהימנות קליני.';
    }
    $('repeat').hidden = state.runs.length >= 2;
    $('shareText').value = `${lines.join('\n')}\nהבדיקה אינה מאומתת; אין ממוצע בין עיניים או מרחקים, ונתון חסר אינו אפס.`;
    $('copyStatus').textContent = '';
    show('results');
  }
  $('calibration').addEventListener('input', event => { $('ruler').style.width = `${event.target.value}px`; });
  $('confirmed').addEventListener('change', event => { $('startStage').disabled = !event.target.checked; });
  $('startStage').addEventListener('click', () => {
    if (!$('confirmed').checked) return;
    if (!state.examId) { state.examId = newExamId(); state.runs.push([]); }
    state.pxPerMm = Number($('calibration').value) / 50;
    state.level = 10;
    state.coarseIndex = 0;
    state.refining = false;
    state.trial = 0;
    state.correct = 0;
    show('test');
    if (!canDisplay(10)) {
      show('prep');
      $('prepError').textContent = 'המסך אינו מציג את האות והמסגרת בגודל הראשון לפי הכיול. נסו מכשיר גדול יותר או כיוון מסך אחר וכיילו שוב. אפשר גם לסמן שלב זה כלא ניתן למדידה.';
      $('prepError').hidden = false;
      $('skipStage').hidden = false;
      return;
    }
    $('prepError').hidden = true;
    $('skipStage').hidden = true;
    state.record = { id: stage().id, label: stage().label, distanceMm: stage().distanceMm, pxPerMm: state.pxPerMm, bestPassedTenths: null, trials: [], limitation: null };
    showLetter();
  });
  $('skipStage').addEventListener('click', () => {
    if ($('skipStage').hidden || $('prep').hidden) return;
    finishStage('מגבלת מסך: הגודל ההתחלתי אינו ניתן להצגה');
  });
  for (const button of document.querySelectorAll('[data-direction]')) button.addEventListener('click', () => answer(button.dataset.direction));
  $('repeat').addEventListener('click', () => {
    if (state.runs.length !== 1) return;
    state.run = 1;
    state.stage = 0;
    state.runs.push([]);
    prepare();
  });
  $('restart').addEventListener('click', () => {
    state.examId = '';
    state.runs = [];
    state.run = 0;
    state.stage = 0;
    state.record = null;
    prepare();
  });
  $('copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText($('shareText').value); $('copyStatus').textContent = 'הסיכום הועתק.'; }
    catch (_) { $('shareText').focus(); $('shareText').select(); $('copyStatus').textContent = 'אפשר להעתיק את הטקסט המסומן ידנית.'; }
  });
  $('download').addEventListener('click', () => {
    const payload = { protocol: 'EchoPulse Research v1 — unvalidated', designWeights: { protocol: 40, measurementControl: 30, repeatability: 20, usability: 10 }, examId: state.examId, runs: state.runs };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${state.examId}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  prepare();
})();
