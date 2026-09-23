/* Synthetic playback. No patient data, API, pressure calibration, or clinical inference. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const ids = ['wave', 'motion', 'beat'];
  const state = { rows: [], index: 0, playing: true, speed: 1, lastTick: 0, elapsed: 0 };
  const fmt = (n, digits = 2) => Number.isFinite(n) ? n.toFixed(digits) : '—';
  const clamp = (x, min, max) => Math.min(max, Math.max(min, x));

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/);
    const fields = lines.shift().split(',');
    const needed = ['timestamp_s', 'echo_displacement_samples', 'optic_flow_y_px_per_frame', 'mean_brightness', 'ppg_reference_0_1', 'beat_marker', 'icp_proxy_z'];
    if (!needed.every(name => fields.includes(name))) throw new Error('Unexpected CSV columns');
    const rows = lines.map(line => {
      const values = line.split(',').map(Number);
      return Object.fromEntries(fields.map((name, i) => [name, values[i]]));
    });
    if (rows.length < 2 || rows.some(r => needed.some(key => !Number.isFinite(r[key])))) throw new Error('Invalid sample data');
    return rows;
  }

  function setupCanvas(id) {
    const canvas = $(id);
    const box = canvas.getBoundingClientRect();
    if (!box.width || !box.height) return null;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(box.width * dpr);
    canvas.height = Math.round(box.height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    return { ctx, w: box.width, h: box.height };
  }

  function axes(ctx, w, h, labels) {
    const left = 40, right = w - 12, top = 14, bottom = h - 26;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#263648'; ctx.lineWidth = 1;
    ctx.fillStyle = '#8193a5'; ctx.font = '10px system-ui';
    for (let i = 0; i <= 4; i++) {
      const y = top + i * (bottom - top) / 4;
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
      if (labels) ctx.fillText(labels[i], 2, y + 3);
    }
    for (let i = 0; i <= 6; i++) {
      const x = left + i * (right - left) / 6;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
    }
    return { left, right, top, bottom };
  }

  function series(ctx, rows, field, limits, box, color, width = 2, alpha = 1) {
    if (!rows.length) return;
    const [min, max] = limits;
    ctx.beginPath(); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = width; ctx.lineJoin = 'round';
    rows.forEach((r, i) => {
      const x = box.left + i / Math.max(1, rows.length - 1) * (box.right - box.left);
      const y = box.bottom - clamp((r[field] - min) / (max - min), 0, 1) * (box.bottom - box.top);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke(); ctx.globalAlpha = 1;
  }

  function completeBeat(rows, index) {
    const marks = [];
    for (let i = 0; i <= index; i++) if (rows[i].beat_marker === 1) marks.push(i);
    if (marks.length < 2) return null;
    const end = marks.at(-1), start = marks.at(-2);
    const beat = rows.slice(start, end);
    if (beat.length < 12) return null;
    // Fixed thirds provide reproducible demo markers, not physiological P1/P2/P3 detection.
    const segments = [[0, .22], [.22, .48], [.48, .72]];
    const peaks = segments.map(([a, b]) => {
      const lo = Math.floor(beat.length * a), hi = Math.max(lo + 1, Math.floor(beat.length * b));
      let best = lo;
      for (let j = lo + 1; j < hi; j++) if (beat[j].icp_proxy_z > beat[best].icp_proxy_z) best = j;
      return best;
    });
    return { beat, peaks, period: rows[end].timestamp_s - rows[start].timestamp_s };
  }

  function drawBeat(info) {
    const s = setupCanvas('beat'); if (!s) return;
    const { ctx, w, h } = s, box = axes(ctx, w, h, ['1.5', '0.5', '-0.5', '-1.5', '-2.5']);
    if (!info) return;
    const { beat, peaks } = info;
    series(ctx, beat, 'icp_proxy_z', [-2.5, 1.5], box, '#57e9d4', 2.3);
    peaks.forEach((index, n) => {
      const x = box.left + index / (beat.length - 1) * (box.right - box.left);
      const y = box.bottom - clamp((beat[index].icp_proxy_z + 2.5) / 4, 0, 1) * (box.bottom - box.top);
      ctx.fillStyle = '#ffc18d'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffc18d'; ctx.font = 'bold 10px system-ui'; ctx.fillText('P' + (n + 1), clamp(x - 7, box.left, box.right - 20), Math.max(box.top + 8, y - 10));
    });
  }

  function render() {
    const { rows, index } = state;
    if (!rows.length) return;
    const current = rows[index];
    const from = Math.max(0, index - 299), visible = rows.slice(from, index + 1);
    const wave = setupCanvas('wave');
    if (wave) {
      const box = axes(wave.ctx, wave.w, wave.h, ['1.5', '0.5', '-0.5', '-1.5', '-2.5']);
      series(wave.ctx, visible, 'icp_proxy_z', [-2.5, 1.5], box, '#57e9d4', 2.2);
      series(wave.ctx, visible, 'ppg_reference_0_1', [0, 1.8], box, '#efa48e', 1.3, .75);
    }
    const motion = setupCanvas('motion');
    if (motion) {
      const box = axes(motion.ctx, motion.w, motion.h, ['0.3', '0.2', '0.1', '0', '-0.1']);
      series(motion.ctx, visible, 'echo_displacement_samples', [-.1, .3], box, '#57e9d4', 1.9);
      series(motion.ctx, visible, 'optic_flow_y_px_per_frame', [-.1, .3], box, '#a59bf7', 1.4, .85);
    }
    const info = completeBeat(rows, index);
    drawBeat(info);
    $('clock').textContent = `t = ${fmt(current.timestamp_s)} s`;
    $('displacement').textContent = fmt(current.echo_displacement_samples, 3);
    // Confidence is a display heuristic based on recent flow consistency, not a trained estimate.
    const recent = visible.slice(-25);
    const disagreement = recent.reduce((sum, r) => sum + Math.abs(r.echo_displacement_samples * .25 - r.optic_flow_y_px_per_frame), 0) / recent.length;
    $('confidence').textContent = `${Math.round(clamp(100 - disagreement * 600, 0, 100))}%`;
    $('quality').textContent = Math.round(clamp(100 - disagreement * 430, 0, 100));
    if (info) {
      const vals = info.peaks.map(i => info.beat[i].icp_proxy_z);
      const range = Math.max(...info.beat.map(r => r.icp_proxy_z)) - Math.min(...info.beat.map(r => r.icp_proxy_z));
      $('hr').textContent = Math.round(60 / info.period);
      $('ratio').textContent = vals[0] > .05 ? fmt(vals[1] / vals[0]) : '—';
      $('amplitude').textContent = fmt(range);
      ['p1', 'p2', 'p3'].forEach((key, i) => $(key).textContent = fmt(vals[i]));
    }
  }

  function frame(now) {
    if (state.playing && state.rows.length) {
      if (state.lastTick) state.elapsed += Math.min((now - state.lastTick) / 1000, .2) * state.speed;
      const step = Math.floor(state.elapsed * 50);
      if (step > 0) {
        state.elapsed -= step / 50;
        state.index = (state.index + step) % state.rows.length;
        render();
      }
    }
    state.lastTick = now;
    requestAnimationFrame(frame);
  }

  $('toggle').addEventListener('click', () => { state.playing = !state.playing; $('toggle').textContent = state.playing ? 'Pause' : 'Play'; });
  $('restart').addEventListener('click', () => { state.index = 0; state.elapsed = 0; render(); });
  $('speed').addEventListener('change', e => { state.speed = Number(e.target.value); });
  window.addEventListener('resize', render);
  const input = window.DEMO_CSV ? Promise.resolve(window.DEMO_CSV) : fetch('data/synthetic_echo_to_icp_demo.csv').then(response => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  });
  input.then(text => {
    state.rows = parseCsv(text);
    $('status').textContent = 'Sample streaming';
    $('sampleCount').textContent = `${state.rows.length} samples`;
    render(); requestAnimationFrame(frame);
  }).catch(error => {
    $('status').textContent = 'Dataset unavailable';
    $('sampleCount').textContent = error.message;
    console.error('Unable to load synthetic dataset:', error);
  });
})();
