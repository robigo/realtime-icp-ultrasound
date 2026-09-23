/* Illustrative self-check only: this algorithm has not been clinically validated. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const levels = [0.1, 0.2, 0.3, 0.5, 0.7, 1.0];
  const directions = ['right', 'down', 'left', 'up'];
  const turns = [0, 90, 180, 270];
  const linkedSession = location.hash.match(/^#session=([0-9a-f]{32})$/i)?.[1]?.toUpperCase() || null;
  const wherebyCallId = location.hash.match(/^#call=(CALL-[0-9a-f]{20})$/i)?.[1]?.toUpperCase() || null;
  const linkedCallId = wherebyCallId || (linkedSession && `CALL-${linkedSession.slice(0, 5)}-${linkedSession.slice(5, 10)}-${linkedSession.slice(10, 15)}-${linkedSession.slice(15, 20)}`);
  $('setupLinkedCall').hidden = !linkedCallId;
  $('setupLinkedCallId').textContent = linkedCallId || '';
  const state = { eye: 0, level: 0, trial: 0, correct: 0, angle: 0, pxPerMm: 0, scores: [null, null], examId: '' };
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
    const heightMm = 2000 * Math.tan((5 / 60) * Math.PI / 180) / levels[state.level];
    const pixels = Math.round(heightMm * state.pxPerMm);
    const symbol = $('optotype');
    symbol.style.width = `${pixels}px`;
    symbol.style.height = `${pixels}px`;
    symbol.style.transform = `rotate(${turns[state.angle]}deg)`;
    $('progress').textContent = `שלב ${state.level + 1} מתוך ${levels.length} · סימן ${state.trial + 1} מתוך 5`;
  }

  function finishEye() {
    if (state.eye === 0) {
      section('transition');
      return;
    }
    const describe = score => score < 0 ? 'לא זוהה השלב הראשון' : `זוהה עד שלב ${score + 1} מתוך ${levels.length}`;
    $('resultText').textContent = `עין ימין: ${describe(state.scores[0])}. עין שמאל: ${describe(state.scores[1])}.`;
    $('resultExamId').textContent = state.examId;
    $('linkedCall').hidden = !linkedCallId;
    $('linkedCallId').textContent = linkedCallId || '';
    const summary = `סיכום תרגיל ראייה מודרך (לא בדיקה רפואית מאומתת)\nמזהה בדיקה: ${state.examId}${linkedCallId ? `\nמזהה פגישה: ${linkedCallId}` : ''}\n${$('resultText').textContent}\nהתוצאה אינה אבחנה רפואית.`;
    $('shareText').value = summary;
    $('shareWhatsapp').href = `https://wa.me/?text=${encodeURIComponent(summary)}`;
    $('copyStatus').textContent = '';
    section('results');
  }

  function answer(direction) {
    if ($('test').hidden) return;
    if (direction === directions[state.angle]) state.correct++;
    state.trial++;
    if (state.trial === 5) {
      const passed = state.correct >= 4;
      if (passed) state.scores[state.eye] = state.level;
      if (!passed || state.level === levels.length - 1) {
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
    state.eye = 0;
    state.level = 0;
    state.trial = 0;
    state.correct = 0;
    state.scores = [-1, -1];
    state.examId = newExamId();
    $('testExamId').textContent = state.examId;
    $('eyeLabel').textContent = 'עין ימין';
    $('eyeHelp').textContent = 'כסו את עין שמאל בלי ללחוץ עליה. אם קשה לזהות, בחרו ניחוש.';
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
