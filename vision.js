/* Illustrative self-check only: this algorithm has not been clinically validated. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  // Keep the 40 cm symbols large enough to display their five strokes on typical screens.
  const levelsByDistance = { 400: [0.05, 0.1, 0.15, 0.2], 2000: [0.1, 0.2, 0.3, 0.5, 0.7, 1.0] };
  const directions = ['right', 'down', 'left', 'up'];
  const turns = [0, 90, 180, 270];
  const linkedSession = location.hash.match(/^#session=([0-9a-f]{32})$/i)?.[1]?.toUpperCase() || null;
  const wherebyCallId = location.hash.match(/^#call=(CALL-[0-9a-f]{20})$/i)?.[1]?.toUpperCase() || null;
  const linkedCallId = wherebyCallId || (linkedSession && `CALL-${linkedSession.slice(0, 5)}-${linkedSession.slice(5, 10)}-${linkedSession.slice(10, 15)}-${linkedSession.slice(15, 20)}`);
  $('setupLinkedCall').hidden = !linkedCallId;
  $('setupLinkedCallId').textContent = linkedCallId || '';
  const state = { eye: 0, level: 0, trial: 0, correct: 0, angle: 0, pxPerMm: 0, distanceMm: 400, scores: [null, null], answers: [{ correct: 0, total: 0 }, { correct: 0, total: 0 }], examId: '' };
  const levels = () => levelsByDistance[state.distanceMm];
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

  function showSymbol() {
    state.angle = Math.floor(Math.random() * 4);
    // A normal-acuity E is approximately 5 arcminutes high at the chosen distance.
    const heightMm = state.distanceMm * Math.tan((5 / 60) * Math.PI / 180) / levels()[state.level];
    const pixels = Math.round(heightMm * state.pxPerMm);
    const symbol = $('optotype');
    symbol.style.width = `${pixels}px`;
    symbol.style.height = `${pixels}px`;
    symbol.style.transform = `rotate(${turns[state.angle]}deg)`;
    $('progress').textContent = `שלב ${state.level + 1} מתוך ${levels().length} · סימן ${state.trial + 1} מתוך 5`;
  }

  function finishEye() {
    if (state.eye === 0) {
      section('transition');
      return;
    }
    const describe = score => score < 0 ? 'לא זוהה השלב הראשון' : `זוהה עד שלב ${score + 1} מתוך ${levels().length}`;
    const describeAnswers = (eye, percentId, countId) => {
      const { correct, total } = state.answers[eye];
      const percent = total ? Math.round(correct / total * 100) : 0;
      $(percentId).textContent = `${percent}%`;
      $(countId).textContent = `${correct} מתוך ${total} תשובות נכונות`;
      return `${percent}% (${correct} מתוך ${total} תשובות)`;
    };
    const rightAnswers = describeAnswers(0, 'rightPercent', 'rightCount');
    const leftAnswers = describeAnswers(1, 'leftPercent', 'leftCount');
    $('resultText').textContent = `עין ימין: ${describe(state.scores[0])}. עין שמאל: ${describe(state.scores[1])}.`;
    $('resultDistance').textContent = distanceLabel();
    $('resultExamId').textContent = state.examId;
    $('linkedCall').hidden = !linkedCallId;
    $('linkedCallId').textContent = linkedCallId || '';
    const summary = `סיכום תרגיל ראייה מודרך (לא בדיקה רפואית מאומתת)\nמרחק שנבחר: ${distanceLabel()} (לא אומת אוטומטית)\nמזהה בדיקה: ${state.examId}${linkedCallId ? `\nמזהה פגישה: ${linkedCallId}` : ''}\n${$('resultText').textContent}\nאחוז תשובות נכונות: עין ימין ${rightAnswers}; עין שמאל ${leftAnswers}.\nאלה אינם אחוזי ראייה או אבחנה רפואית; אין להשוות שלבים בין מרחקים שונים.`;
    $('shareText').value = summary;
    $('shareWhatsapp').href = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    $('copyStatus').textContent = '';
    section('results');
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
      if (!passed || state.level === levels().length - 1) {
        finishEye();
        return;
      }
      state.level++;
      state.trial = 0;
      state.correct = 0;
    }
    showSymbol();
  }

  $('calibration').addEventListener('input', e => { $('ruler').style.width = `${e.target.value}px`; });
  $('confirmed').addEventListener('change', e => { $('start').disabled = !e.target.checked; });
  $('start').addEventListener('click', () => {
    state.pxPerMm = Number($('calibration').value) / 50;
    state.distanceMm = $('testDistance').value === '2000' ? 2000 : 400;
    state.eye = 0;
    state.level = 0;
    state.trial = 0;
    state.correct = 0;
    state.scores = [-1, -1];
    state.answers = [{ correct: 0, total: 0 }, { correct: 0, total: 0 }];
    state.examId = newExamId();
    $('testExamId').textContent = state.examId;
    $('eyeLabel').textContent = 'עין ימין';
    $('eyeHelp').textContent = 'כסו את עין שמאל בלי ללחוץ עליה. אם קשה לזהות, בחרו ניחוש.';
    $('transitionHelp').textContent = `כסו את עין ימין בלי ללחוץ עליה, ושמרו על מרחק ${distanceLabel()} ועל אותו המסך.`;
    section('test');
    showSymbol();
  });
  $('nextEye').addEventListener('click', () => {
    state.eye = 1;
    state.level = 0;
    state.trial = 0;
    state.correct = 0;
    $('eyeLabel').textContent = 'עין שמאל';
    $('eyeHelp').textContent = 'כסו את עין ימין בלי ללחוץ עליה. אם קשה לזהות, בחרו ניחוש.';
    section('test');
    showSymbol();
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
