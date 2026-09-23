/* Illustrative self-check only: this algorithm has not been clinically validated. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const levels = [0.1, 0.2, 0.3, 0.5, 0.7, 1.0];
  const directions = ['right', 'down', 'left', 'up'];
  const turns = [0, 90, 180, 270];
  const state = { eye: 0, level: 0, trial: 0, correct: 0, angle: 0, pxPerMm: 0, scores: [null, null] };
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
    $('confirmed').checked = false;
    $('start').disabled = true;
    section('setup');
  });
  for (const button of document.querySelectorAll('[data-direction]')) {
    button.addEventListener('click', () => answer(button.dataset.direction));
  }
})();
