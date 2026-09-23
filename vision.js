/* Illustrative self-check only: this algorithm has not been clinically validated. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  // Tenths of logMAR: the published coarse staircase, followed by 0.1 steps after a failure.
  const coarseLevels = [10, 8, 5, 2, 0];
  const minimumSymbolPixels = 10; // Each of the five E strokes must span at least two CSS pixels.
  const directions = ['right', 'down', 'left', 'up'];
  const turns = [0, 90, 180, 270];
  const linkedSession = location.hash.match(/^#session=([0-9a-f]{32})$/i)?.[1]?.toUpperCase() || null;
  const wherebyCallId = location.hash.match(/^#call=(CALL-[0-9a-f]{20})$/i)?.[1]?.toUpperCase() || null;
  const linkedCallId = wherebyCallId || (linkedSession && `CALL-${linkedSession.slice(0, 5)}-${linkedSession.slice(5, 10)}-${linkedSession.slice(10, 15)}-${linkedSession.slice(15, 20)}`);
  $('setupLinkedCall').hidden = !linkedCallId;
  $('setupLinkedCallId').textContent = linkedCallId || '';
  const state = { eye: 0, level: 10, coarseIndex: 0, refining: false, trial: 0, correct: 0, angle: 0, pxPerMm: 0, distanceMm: 400, scores: [null, null], limits: [null, null], answers: [{ correct: 0, total: 0 }, { correct: 0, total: 0 }], examId: '' };
  const distanceLabel = () => state.distanceMm === 400 ? '40 ס״מ' : '2 מטרים';
  function updateDistanceInstructions() {
    const distance = $('testDistance').value === '2000' ? 2000 : 400;
    const label = distance === 400 ? '40 ס״מ' : '2 מטרים';
    $('distanceInstruction').textContent = label;
    $('glassesInstruction').textContent = distance === 400
      ? 'אם אתה משתמש במשקפיים לקריאה, הרכב אותם.'
      : 'הרכב משקפיים המשמשים אותך בדרך כלל לראייה מרחוק.';
    $('confirmedText').textContent = `כיילתי בעזרת סרגל ואני שומר על מרחק ${label}.`;
    $('confirmed').checked = false;
    $('start').disabled = true;
  }
  $('testDistance').addEventListener('change', updateDistanceInstructions);
  function newExamId() {
    const bytes = new Uint8Array(10);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    return `EYE-${hex.slice(0, 5)}-${hex.slice(5, 10)}-${hex.slice(10, 15)}-${hex.slice(15)}`;
  }
  const section = name => {
    for (const id of ['setup', 'test', 'transition', 'results']) $(id).hidden = id !== name;
  };

  function symbolPixels(level) {
    const heightMm = state.distanceMm * Math.tan((5 / 60) * Math.PI / 180) * Math.pow(10, level / 10);
    return heightMm * state.pxPerMm;
  }

  function canDisplay(level) {
    const space = document.querySelector('.optotype-space');
    const pixels = symbolPixels(level);
    // E plus half-letter gap on each side and a border one stroke thick.
    return pixels >= minimumSymbolPixels && pixels * 2.4 <= Math.min(space.clientWidth, space.clientHeight) - 12;
  }

  function showSymbol() {
    state.angle = Math.floor(Math.random() * 4);
    const pixels = symbolPixels(state.level);
    const symbol = $('optotype');
    symbol.style.width = `${pixels}px`;
    symbol.style.height = `${pixels}px`;
    symbol.style.transform = `rotate(${turns[state.angle]}deg)`;
    const frame = $('crowdingFrame');
    frame.style.padding = `${pixels / 2}px`;
    frame.style.borderWidth = `${pixels / 5}px`;
    $('progress').textContent = `גודל ${ (state.level / 10).toFixed(1) } logMAR · סימן ${state.trial + 1} מתוך 5`;
  }

  function prepareEye() {
    const isRight = state.eye === 0;
    const covered = isRight ? 'שמאל' : 'ימין';
    const tested = isRight ? 'ימין' : 'שמאל';
    $('eyeStage').textContent = `שלב ${state.eye + 1} מתוך 2`;
    $('transition-heading').textContent = `מכינים את עין ${tested}`;
    $('transitionHelp').textContent = `כסו את עין ${covered} בכיסוי אטום בלי ללחוץ עליה, ושמרו על מרחק ${distanceLabel()} ועל אותו המסך.`;
    $('coverText').textContent = `כיסיתי את עין ${covered} בכיסוי אטום בלי ללחוץ עליה.`;
    $('coverConfirmed').checked = false;
    $('nextEye').disabled = true;
    $('nextEye').textContent = `הצג אותיות לעין ${tested}`;
    section('transition');
  }

  function finishEye() {
    if (state.eye === 0) {
      state.eye = 1;
      prepareEye();
      return;
    }
    const describe = eye => {
      const score = state.scores[eye];
      const limit = state.limits[eye];
      const level = score === null ? 'לא זוהה הגודל ההתחלתי' : `הגודל הקטן ביותר שזוהה: ${(score / 10).toFixed(1)} logMAR תיאורטי`;
      return `${level}${limit ? `; ${limit}` : ''}`;
    };
    const describeAnswers = (eye, percentId, countId) => {
      const { correct, total } = state.answers[eye];
      const percent = total ? Math.round(correct / total * 100) : 0;
      $(percentId).textContent = `${percent}%`;
      $(countId).textContent = `${correct} מתוך ${total} תשובות נכונות`;
      return `${percent}% (${correct} מתוך ${total} תשובות)`;
    };
    const rightAnswers = describeAnswers(0, 'rightPercent', 'rightCount');
    const leftAnswers = describeAnswers(1, 'leftPercent', 'leftCount');
    $('resultText').textContent = `עין ימין: ${describe(0)}. עין שמאל: ${describe(1)}.`;
    const [right, left] = state.scores;
    const comparison = right === null || left === null
      ? 'לא ניתן להשוות בין שתי העיניים: לפחות עין אחת לא זיהתה את הגודל ההתחלתי או שהמסך לא הציג אותו.'
      : state.limits.some(Boolean)
        ? 'לפחות עין אחת נעצרה בשל מגבלת המסך; אין להסיק מהגודל האחרון שזוהה על הבדל בראייה בין העיניים.'
        : right === left
          ? 'שתי העיניים זיהו את אותו גודל אות בתרגיל הזה.'
          : `עין ${right < left ? 'ימין' : 'שמאל'} זיהתה אות קטנה יותר בתרגיל. הפער בגודל התיאורטי: ${(Math.abs(right - left) / 10).toFixed(1)} logMAR. זה אינו קובע צורך בעדשות.`;
    $('resultComparison').textContent = comparison;
    $('resultDistance').textContent = distanceLabel();
    $('resultExamId').textContent = state.examId;
    $('linkedCall').hidden = !linkedCallId;
    $('linkedCallId').textContent = linkedCallId || '';
    const summary = `סיכום תרגיל ראייה מודרך (לא בדיקה רפואית מאומתת)\nמרחק שנבחר: ${distanceLabel()} (לא אומת אוטומטית)\nמזהה בדיקה: ${state.examId}${linkedCallId ? `\nמזהה פגישה: ${linkedCallId}` : ''}\n${$('resultText').textContent}\n${comparison}\nאחוז תשובות נכונות: עין ימין ${rightAnswers}; עין שמאל ${leftAnswers}.\nכיסוי העין אושר ידנית בלבד. הגודל התיאורטי מחושב מכיול ידני; האחוזים אינם אחוזי ראייה או ציון WHOeyes.`;
    $('shareText').value = summary;
    $('shareWhatsapp').href = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    $('copyStatus').textContent = '';
    section('results');
  }

  function advance(nextLevel) {
    if (!canDisplay(nextLevel)) {
      state.limits[state.eye] = 'נעצר בשל מגבלת גודל או רזולוציה של המסך';
      finishEye();
      return;
    }
    state.level = nextLevel;
    state.trial = 0;
    state.correct = 0;
    showSymbol();
  }

  function answer(direction) {
    if ($('test').hidden) return;
    if (direction === directions[state.angle]) {
      state.correct++;
      state.answers[state.eye].correct++;
    }
    state.answers[state.eye].total++;
    state.trial++;
    if (state.trial === 5) {
      const passed = state.correct >= 4;
      if (passed) state.scores[state.eye] = state.level;
      if (state.refining) {
        if (passed || state.level + 1 >= state.scores[state.eye]) {
          finishEye();
        } else {
          advance(state.level + 1);
        }
        return;
      }
      if (!passed) {
        if (state.scores[state.eye] === null) finishEye();
        else {
          state.refining = true;
          advance(state.level + 1);
        }
        return;
      }
      if (state.coarseIndex === coarseLevels.length - 1) {
        finishEye();
        return;
      }
      state.coarseIndex++;
      advance(coarseLevels[state.coarseIndex]);
      return;
    }
    showSymbol();
  }

  $('calibration').addEventListener('input', e => { $('ruler').style.width = `${e.target.value}px`; });
  $('confirmed').addEventListener('change', e => { $('start').disabled = !e.target.checked; });
  $('coverConfirmed').addEventListener('change', e => { $('nextEye').disabled = !e.target.checked; });
  $('start').addEventListener('click', () => {
    state.pxPerMm = Number($('calibration').value) / 50;
    state.distanceMm = $('testDistance').value === '2000' ? 2000 : 400;
    state.eye = 0;
    state.level = 10;
    state.coarseIndex = 0;
    state.refining = false;
    state.trial = 0;
    state.correct = 0;
    state.scores = [null, null];
    state.limits = [null, null];
    state.answers = [{ correct: 0, total: 0 }, { correct: 0, total: 0 }];
    state.examId = newExamId();
    $('testExamId').textContent = state.examId;
    $('eyeLabel').textContent = 'עין ימין';
    $('eyeHelp').textContent = 'השאירו את עין שמאל מכוסה בכיסוי אטום. אם קשה לזהות, בחרו ניחוש.';
    prepareEye();
  });
  $('nextEye').addEventListener('click', () => {
    if (!$('coverConfirmed').checked) return;
    state.level = 10;
    state.coarseIndex = 0;
    state.refining = false;
    state.trial = 0;
    state.correct = 0;
    $('eyeLabel').textContent = state.eye === 0 ? 'עין ימין' : 'עין שמאל';
    $('eyeHelp').textContent = `השאירו את עין ${state.eye === 0 ? 'שמאל' : 'ימין'} מכוסה בכיסוי אטום. אם קשה לזהות, בחרו ניחוש.`;
    section('test');
    if (canDisplay(state.level)) showSymbol();
    else {
      state.limits[state.eye] = 'המסך אינו יכול להציג את הגודל ההתחלתי בכיול הנוכחי';
      finishEye();
    }
  });
  $('again').addEventListener('click', () => {
    state.examId = '';
    $('shareText').value = '';
    $('shareWhatsapp').removeAttribute('href');
    $('confirmed').checked = false;
    $('start').disabled = true;
    section('setup');
  });
  $('copyResult').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('shareText').value);
      $('copyStatus').textContent = 'הסיכום הועתק.';
    } catch (_) {
      $('shareText').focus();
      $('shareText').select();
      $('copyStatus').textContent = 'בחרנו את הסיכום; אפשר להעתיק אותו ידנית.';
    }
  });
  for (const button of document.querySelectorAll('[data-direction]')) {
    button.addEventListener('click', () => answer(button.dataset.direction));
  }
})();
