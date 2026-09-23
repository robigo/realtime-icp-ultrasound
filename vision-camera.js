/* Optional, unvalidated relative-distance cue. No absolute camera-based measurement. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const PACKAGE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304';
  const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
  const video = $('distanceCamera');
  const startButton = $('startCamera');
  const stopButton = $('stopCamera');
  const calibrateButton = $('calibrateCamera');
  let stream = null;
  let detector = null;
  let timer = null;
  let generation = 0;
  let recentWidths = [];
  let referenceWidth = null;
  let referenceDistance = null;
  let lastVideoTime = -1;
  let misses = 0;
  let driftCount = 0;

  function status(message, level = '') {
    for (const target of [$('cameraStatus'), $('cameraTestStatus')]) {
      target.textContent = message;
      target.dataset.level = level;
    }
    $('cameraTestStatus').hidden = !stream;
  }

  function resetReference() {
    referenceWidth = null;
    referenceDistance = null;
    recentWidths = [];
    driftCount = 0;
    calibrateButton.disabled = true;
  }

  function stopCamera(message = 'המצלמה כבויה. ממשיכים לפי המדידה הידנית.') {
    generation++;
    if (timer !== null) clearInterval(timer);
    timer = null;
    stream?.getTracks().forEach(track => track.stop());
    stream = null;
    video.pause();
    video.srcObject = null;
    video.hidden = true;
    detector?.close();
    detector = null;
    lastVideoTime = -1;
    misses = 0;
    resetReference();
    stopButton.hidden = true;
    startButton.disabled = false;
    status(message);
  }

  function analyzeFrame() {
    if (!stream || !detector) return;
    if (!$('results').hidden) {
      stopCamera('התרגיל הסתיים והמצלמה כובתה.');
      return;
    }
    if (video.readyState < 2 || video.currentTime === lastVideoTime || !video.videoWidth) return;
    try {
      const detections = detector.detectForVideo(video).detections;
      lastVideoTime = video.currentTime;
      if (detections.length !== 1) {
        misses++;
        recentWidths = [];
        calibrateButton.disabled = true;
        if (misses >= 3) status(detections.length > 1 ? 'זוהו כמה פנים. ודאו שרק הנבדק מול המצלמה.' : 'לא זוהו פנים. בדקו תאורה ומיקום; אפשר להמשיך לפי המרחק שנמדד ידנית.', 'warning');
        return;
      }
      const width = detections[0].boundingBox?.width / video.videoWidth;
      if (!Number.isFinite(width) || width < 0.025 || width > 0.9) return;
      misses = 0;
      recentWidths.push(width);
      if (recentWidths.length > 5) recentWidths.shift();
      if (referenceWidth === null) {
        calibrateButton.disabled = recentWidths.length < 3;
        status('זוהו פנים. לאחר שמדדתם את המרחק בפועל, לחצו ״שמור נקודת ייחוס״.');
        return;
      }
      // Apparent face width changes approximately inversely with distance on one fixed camera.
      // This is only a directional cue: pose and occlusion also change apparent width.
      const ratio = width / referenceWidth;
      if (ratio < 0.8 || ratio > 1.2) driftCount++;
      else driftCount = 0;
      if (driftCount >= 2) {
        status(ratio < 0.8 ? 'ייתכן שהתרחקתם מנקודת הייחוס. בדקו שוב את המרחק ידנית.' : 'ייתכן שהתקרבתם לנקודת הייחוס. בדקו שוב את המרחק ידנית.', 'warning');
      } else {
        status('גודל הפנים דומה לנקודת הייחוס שנקבעה. המשיכו לבדוק את המרחק גם ידנית.', 'ok');
      }
    } catch (_) {
      stopCamera('לא ניתן לנתח את התמונה. התרגיל ממשיך עם בדיקת מרחק ידנית.');
    }
  }

  startButton.addEventListener('click', async () => {
    const ticket = ++generation;
    startButton.disabled = true;
    status('מבקש הרשאה למצלמה וטוען רכיבי זיהוי פנים…');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
      const camera = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } });
      if (ticket !== generation) { camera.getTracks().forEach(track => track.stop()); return; }
      stream = camera;
      video.srcObject = camera;
      video.hidden = false;
      stopButton.hidden = false;
      camera.getVideoTracks()[0]?.addEventListener('ended', () => { if (stream === camera) stopCamera('המצלמה נותקה. המשיכו לפי המרחק שנמדד ידנית.'); });
      await video.play();
      const { FaceDetector, FilesetResolver } = await import(`${PACKAGE}/vision_bundle.mjs`);
      if (ticket !== generation) return;
      const fileset = await FilesetResolver.forVisionTasks(`${PACKAGE}/wasm`);
      if (ticket !== generation) return;
      const created = await FaceDetector.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL }, runningMode: 'VIDEO', minDetectionConfidence: 0.65 });
      if (ticket !== generation) { created.close(); return; }
      detector = created;
      status('מקבל תמונה. ודאו שהפנים מול המצלמה ושהמרחק נמדד ידנית.');
      timer = setInterval(analyzeFrame, 700);
    } catch (_) {
      if (ticket === generation) stopCamera('המצלמה או זיהוי הפנים אינם זמינים. אפשר להמשיך לפי המרחק שנמדד ידנית.');
    }
  });

  calibrateButton.addEventListener('click', () => {
    if (!stream || recentWidths.length < 3) return;
    const sorted = [...recentWidths].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if ((sorted.at(-1) - sorted[0]) / median > 0.12) {
      status('התמונה משתנה. שמרו על מיקום יציב ונסו שוב.', 'warning');
      return;
    }
    referenceWidth = median;
    referenceDistance = $('testDistance').value;
    calibrateButton.textContent = 'עדכן נקודת ייחוס';
    status('נקודת ייחוס נשמרה למרחק שמדדתם ידנית. זו אינה מדידת מרחק מהמצלמה.', 'ok');
  });

  $('testDistance').addEventListener('change', () => {
    if (referenceDistance && referenceDistance !== $('testDistance').value) {
      resetReference();
      status('המרחק שנבחר השתנה. מדדו אותו ידנית ושמרו שוב נקודת ייחוס.', 'warning');
    }
  });
  stopButton.addEventListener('click', () => stopCamera());
  $('again').addEventListener('click', () => { if (stream) stopCamera(); });
  window.addEventListener('pagehide', () => { if (stream) stopCamera(); });
})();
