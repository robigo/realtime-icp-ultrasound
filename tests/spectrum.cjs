const assert = require('node:assert/strict');
const { analyze } = require('../spectrum-core.js');
const times = Array.from({length: 500}, (_, i) => i / 50);
const phase = .7;
for (const window of ['hann', 'rectangular']) {
  const result = analyze(times, times.map(t => 7 + 2 * Math.cos(2 * Math.PI * 3 * t + phase)), window);
  assert.ok(Math.abs(result.peak.hz - 3) < 1e-10);
  assert.ok(Math.abs(result.peak.amplitude - 2) < 1e-10);
  assert.ok(Math.abs(result.peak.phase - phase) < 1e-10);
  assert.equal(result.nyquist, 25);
  assert.ok(result.bins.every(b => b.hz <= result.nyquist));
}
const flat = analyze(times, times.map(() => 42));
assert.equal(flat.peak, null);
assert.ok(flat.bins.every(b => b.phase === null));
const nyquist = analyze(times, times.map((_, i) => i % 2 ? -2 : 2), 'rectangular');
assert.ok(Math.abs(nyquist.peak.amplitude - 2) < 1e-10);
assert.equal(nyquist.peak.hz, 25);
assert.throws(() => analyze([0, 1], [1, 2]));
assert.throws(() => analyze(times, times.map(() => NaN)));
assert.throws(() => analyze(times.map((t, i) => i === 4 ? t + .01 : t), times));
assert.throws(() => analyze(times.toReversed(), times));
assert.throws(() => analyze(times, times, 'unknown'));
console.log('PASS: spectrum amplitude, phase, DC, Nyquist, validation');
