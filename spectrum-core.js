/* Mathematical spectrum of the supplied samples; no physiological inference. */
(function (root) {
  'use strict';
  function analyze(times, values, windowName = 'hann') {
    const n = values.length;
    if (n < 16 || n > 2048 || times.length !== n) throw new Error('נדרשות 16–2048 דגימות תואמות.');
    if (!['hann', 'rectangular'].includes(windowName)) throw new Error('חלון לא מוכר.');
    if (!times.every(Number.isFinite) || !values.every(Number.isFinite)) throw new Error('הדגימות חייבות להיות מספרים סופיים.');
    const dt = (times[n - 1] - times[0]) / (n - 1);
    if (!(dt > 0) || times.slice(1).some((t, i) => Math.abs(t - times[i] - dt) > dt * .001)) {
      throw new Error('נדרשת סדרת זמן עולה עם מרווחי דגימה אחידים.');
    }
    const fs = 1 / dt;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const weights = values.map((_, i) => windowName === 'hann' ? .5 - .5 * Math.cos(2 * Math.PI * i / n) : 1);
    const gain = weights.reduce((a, b) => a + b, 0);
    const signal = values.map((v, i) => (v - mean) * weights[i]);
    const bins = [];
    // One-sided DFT. No zero padding, extrapolation or frequencies above Nyquist.
    for (let k = 1; k <= Math.floor(n / 2); k++) {
      let re = 0, im = 0;
      for (let j = 0; j < n; j++) {
        const angle = 2 * Math.PI * k * j / n;
        re += signal[j] * Math.cos(angle);
        im -= signal[j] * Math.sin(angle);
      }
      const amplitude = Math.hypot(re, im) * (2 * k === n ? 1 : 2) / gain;
      bins.push({ hz: k * fs / n, amplitude, phase: Math.atan2(im, re) });
    }
    const peak = Math.max(...bins.map(b => b.amplitude));
    const epsilon = Math.max(1e-12, ...values.map(v => Math.abs(v))) * 1e-10;
    // Phase is undefined for zero energy and suppressed below 1% of the peak.
    bins.forEach(b => { if (b.amplitude <= Math.max(epsilon, peak * .01)) b.phase = null; });
    return { bins, fs, nyquist: fs / 2, resolution: fs / n, n, windowName,
      origin: times[0], mean, peak: peak > epsilon ? bins.reduce((a, b) => b.amplitude > a.amplitude ? b : a) : null };
  }
  const api = { analyze };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpectrumCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
