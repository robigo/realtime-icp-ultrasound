/* Run with: node tests/research-flow.cjs. No browser or network needed. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

function openPrototype(width, height) {
  const nodes = new Map();
  function element(id) {
    if (!nodes.has(id)) {
      nodes.set(id, {
        id, hidden: ['test', 'results', 'prepError', 'skipStage'].includes(id),
        disabled: id === 'startStage', checked: false,
        value: id === 'calibration' ? '190' : '', textContent: '', style: {}, dataset: {},
        children: [], listeners: {}, clientWidth: width, clientHeight: height,
        addEventListener(event, listener) { this.listeners[event] = listener; },
        append(...items) { this.children.push(...items); },
        remove() {}, click() { this.listeners.click?.(); },
        replaceChildren() { this.children = []; },
        focus() {}, select() {}
      });
    }
    return nodes.get(id);
  }
  const buttons = ['up', 'right', 'down', 'left'].map(direction => ({ dataset: { direction }, listeners: {}, addEventListener(event, listener) { this.listeners[event] = listener; } }));
  const document = {
    getElementById: element,
    querySelector: selector => selector === '.optotype-space' ? element('space') : null,
    querySelectorAll: selector => selector === '[data-direction]' ? buttons : [],
    createElement: name => element(`created-${name}-${nodes.size}`),
    body: { append() {} }
  };
  const context = { document, crypto: webcrypto, Blob, setTimeout, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, navigator: { clipboard: { writeText: async () => {} } } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../research.js'), 'utf8'), context);
  function click(id) { element(id).listeners.click(); }
  function start() { const check = element('confirmed'); check.checked = true; check.listeners.change({ target: check }); click('startStage'); }
  function respond(correct = true) {
    const rotation = Number(element('optotype').style.transform.match(/\d+/)[0]);
    const actual = ['right', 'down', 'left', 'up'][rotation / 90];
    const chosen = correct ? actual : ['right', 'down', 'left', 'up'].find(direction => direction !== actual);
    buttons.find(button => button.dataset.direction === chosen).listeners.click();
  }
  return { element, start, respond, click };
}

// Passing, failing and refining at near, then successful right and left distance testing.
const test = openPrototype(1200, 1200);
test.start();
for (let i = 0; i < 5; i++) test.respond(); // 1.0 pass
for (let i = 0; i < 5; i++) test.respond(i < 3); // 0.8 fail
for (let i = 0; i < 5; i++) test.respond(); // 0.9 pass
assert.equal(test.element('prepHeading').textContent, 'רחוק · עין ימין');
for (let stage = 0; stage < 2; stage++) {
  test.start();
  for (let i = 0; i < 25; i++) test.respond();
}
assert.equal(test.element('results').hidden, false);
assert.match(test.element('shareText').value, /קרוב · שתי העיניים.*0\.9 logMAR/);
assert.match(test.element('shareText').value, /רחוק · עין ימין.*0\.0 logMAR/);
assert.match(test.element('shareText').value, /40%, בקרת מדידה 30%/);
assert.equal(test.element('resultRows').children.length, 3);
test.click('repeat');
assert.equal(test.element('prep').hidden, false);
for (let stage = 0; stage < 3; stage++) {
  test.start();
  if (stage === 0) { for (let i = 0; i < 5; i++) test.respond(i < 3); }
  else { for (let i = 0; i < 25; i++) test.respond(); }
}
assert.match(test.element('comparison').textContent, /קרוב · שתי העיניים: לא ניתן לחשב פער/);
assert.equal(test.element('repeat').hidden, true);

// A small calibrated screen cannot present the initial 2 m optotype: record missingness, not 0.
const small = openPrototype(170, 320);
small.start();
for (let i = 0; i < 5; i++) small.respond(i < 3); // initial near level fails
small.start();
assert.equal(small.element('prepError').hidden, false);
assert.equal(small.element('skipStage').hidden, false);
small.click('skipStage');
small.start();
small.click('skipStage');
assert.equal(small.element('results').hidden, false);
assert.match(small.element('shareText').value, /מגבלת מסך: הגודל ההתחלתי/);
assert.match(small.element('shareText').value, /לא ניתן להתחיל/);
assert.doesNotMatch(small.element('shareText').value, /0\/0 תשובות נכונות.*0\.0 logMAR/);

// Passing 0.8 before a lower level is clipped by pixel resolution is not a threshold.
const clipped = openPrototype(1200, 1200);
clipped.start();
for (let i = 0; i < 10; i++) clipped.respond();
assert.equal(clipped.element('prepHeading').textContent, 'רחוק · עין ימין');
clipped.start();
for (let i = 0; i < 25; i++) clipped.respond();
clipped.start();
for (let i = 0; i < 25; i++) clipped.respond();
assert.match(clipped.element('shareText').value, /עבר את הגודל 0\.8 logMAR תיאורטי; הגודל הבא לא הוצג\. אין סף מדוד/);
console.log('Research flow: near/distance, retest and screen limitation passed');
