(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let rows = [], current = null, baseline = null;
  const keys = ['icp_proxy_z', 'ppg_reference_0_1', 'echo_displacement_samples'];
  function parse(text) {
    const lines = text.trim().split(/\r?\n/), fields = lines.shift().split(',');
    if (!['timestamp_s', ...keys].every(k => fields.includes(k))) throw new Error('חסרות עמודות נתונים.');
    return lines.map(line => Object.fromEntries(line.split(',').map((v, i) => [fields[i], v.trim() === '' ? NaN : Number(v)])));
  }
  function compatible() { return baseline && current && baseline.field === current.field && baseline.result.fs === current.result.fs; }
  function draw() {
    const canvas = $('spectrum'), bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(bounds.width * dpr); canvas.height = Math.round(bounds.height * dpr);
    const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
    const w = bounds.width, h = bounds.height, l = 52, r = w - 48, t = 26, b = h - 40;
    ctx.clearRect(0, 0, w, h);
    if (!current) return;
    const data = current.result;
    const comparison = compatible() ? baseline.result : null;
    const maxAmp = Math.max(1e-9, ...data.bins.map(x => x.amplitude), ...(comparison ? comparison.bins.map(x => x.amplitude) : [])) * 1.1;
    const x = hz => l + hz / data.nyquist * (r - l);
    ctx.font = '11px system-ui'; ctx.textAlign = 'left';
    for (let i = 0; i <= 4; i++) {
      const y = t + (b - t) * i / 4;
      ctx.strokeStyle = '#2a3d50'; ctx.beginPath(); ctx.moveTo(l, y); ctx.lineTo(r, y); ctx.stroke();
      ctx.fillStyle = '#8ca4b8'; ctx.fillText((maxAmp * (1 - i / 4)).toPrecision(2), 2, y + 4);
    }
    ['+π', '0', '−π'].forEach((label, i) => { ctx.fillStyle = '#b5aaf8'; ctx.fillText(label, r + 10, t + i * (b - t) / 2 + 4); });
    ctx.fillStyle = '#91a9bb';
    for (let hz = 0; hz <= data.nyquist + .001; hz += 5) { ctx.fillText(String(Math.round(hz)), x(hz) - 5, b + 20); }
    ctx.fillText('Hz', r - 12, h - 3);
    function amplitude(bins, color, dashed) {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash(dashed ? [5, 4] : []); ctx.beginPath();
      bins.forEach((bin, i) => { const y = b - bin.amplitude / maxAmp * (b - t); if (i) ctx.lineTo(x(bin.hz), y); else ctx.moveTo(x(bin.hz), y); });
      ctx.stroke(); ctx.setLineDash([]);
    }
    if (comparison) amplitude(comparison.bins, '#f2a081', true);
    amplitude(data.bins, '#50e6d3', false);
    // Separate phase dots avoid suggesting a continuous phase across wraps/weak bins.
    ctx.fillStyle = '#b4a4ff';
    data.bins.forEach(bin => { if (bin.phase !== null) { ctx.beginPath(); ctx.arc(x(bin.hz), b - (bin.phase + Math.PI) / (2 * Math.PI) * (b - t), 2.3, 0, Math.PI * 2); ctx.fill(); } });
  }
  function update() {
    try {
      const field = $('signal').value, mode = $('segment').value;
      const selected = mode === 'all' ? rows : rows.filter(r => mode === 'first' ? r.timestamp_s < 6 : r.timestamp_s >= 6);
      const result = SpectrumCore.analyze(selected.map(r => r.timestamp_s), selected.map(r => r[field]), $('window').value);
      current = { result, field, segment: mode };
      $('fs').textContent = result.fs.toFixed(1); $('resolution').textContent = result.resolution.toFixed(3);
      $('count').textContent = result.n; $('peak').textContent = result.peak ? result.peak.hz.toFixed(3) : '—';
      const label = $('signal').selectedOptions[0].textContent;
      $('source').textContent = `מקור: דגימות ההדגמה הסינתטיות בפרויקט | ${label} | תחילת קטע: ${result.origin.toFixed(2)} שניות`;
      $('summary').textContent = `${result.n} דגימות · עד ${result.nyquist.toFixed(1)} Hz · חלון ${result.windowName} · פאזה ביחס לתחילת הקטע. משרעת ביחידות האות שנבחר.`;
      $('spectrum').setAttribute('aria-label', `ספקטרום סינתטי של ${label}, עד ${result.nyquist.toFixed(1)} הרץ. תדר שיא ${result.peak ? result.peak.hz.toFixed(3) : 'לא זוהה'} הרץ.`);
      $('baselineLegend').hidden = !compatible();
      if (baseline) $('baselineStatus').textContent = compatible() ? `השוואת משרעת לבסיס: ${baseline.segment} · חלון ${baseline.result.windowName} · תחילת קטע ${baseline.result.origin.toFixed(2)} שניות. אין השוואת פאזה.` : 'הבסיס מוסתר: נבחר אות או קצב דגימה אחר.';
      $('error').textContent = ''; $('baseline').disabled = false; $('export').disabled = false;
      draw();
    } catch (error) {
      current = null; $('error').textContent = error.message;
      ['fs', 'resolution', 'count', 'peak'].forEach(id => $(id).textContent = '—');
      $('baseline').disabled = true; $('export').disabled = true;
      $('source').textContent = ''; $('summary').textContent = ''; draw();
    }
  }
  ['signal', 'segment', 'window'].forEach(id => $(id).addEventListener('change', update));
  $('baseline').addEventListener('click', () => { baseline = current; $('clear').disabled = false; update(); });
  $('clear').addEventListener('click', () => { baseline = null; $('clear').disabled = true; $('baselineStatus').textContent = 'הבסיס נוקה.'; update(); });
  $('export').addEventListener('click', () => {
    if (!current) return;
    const { result, field, segment } = current;
    const header = 'source,signal,segment,window,sample_rate_hz,sample_count,origin_s,frequency_hz,amplitude_signal_units,phase_rad';
    const lines = result.bins.map(bin => ['synthetic_demo', field, segment, result.windowName, result.fs, result.n, result.origin, bin.hz, bin.amplitude, bin.phase === null ? '' : bin.phase].join(','));
    const url = URL.createObjectURL(new Blob([header + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'synthetic-spectrum.csv'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  window.addEventListener('resize', draw);
  try { rows = parse(window.DEMO_CSV); update(); } catch (error) { $('error').textContent = `לא ניתן לטעון נתונים: ${error.message}`; }
})();
