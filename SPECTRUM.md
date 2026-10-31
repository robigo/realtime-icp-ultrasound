# Spectrum viewer

Open `spectrum.html` from the home page. This view computes a one-sided DFT of
the existing **synthetic** demo samples, not of the photographed legacy screen.
Select proxy ICP, PPG reference, or echo displacement; choose all 12 seconds or
either 6-second half. The default window is periodic Hann; rectangular is optional.

The arithmetic mean is removed before windowing. Amplitudes use coherent-gain
correction, doubled for positive frequencies except the even-length Nyquist bin.
DC is omitted. Phase is atan2(imaginary, real), relative to the selected segment's
start; it is hidden below 1% of maximum amplitude or a numerical floor. Phase is
shown as discrete dots to avoid joining wraps or undefined regions.

50 Hz sampling limits the view to 25 Hz. Resolution is fs/N (0.0833 Hz for the
full record, 0.1667 Hz for a half). No resampling, extrapolation or zero-padding
is used. The graph's peak frequency is not interpreted as heart rate.

The baseline button retains amplitude data in tab memory; a baseline from another
signal or sampling rate is hidden. CSV export includes source, signal, segment,
window, sample rate/count, origin, frequency, amplitude and phase. No upload or
server is used, and no patient data or uploaded reference images are included.

Summary measures (HR, P2/P1, legacy indices) cannot uniquely recover amplitude or
phase spectra. Legacy `.pnt` decoding, proprietary indices and clinical calibration
remain out of scope until original files and documentation are available.

Validation: `node tests/spectrum.cjs` checks known sinusoid amplitude/phase,
constant input, Nyquist normalization and invalid or nonuniform samples.
`node tests/spectrum-ui.cjs` checks DOM integration and CSV metadata with a canvas
stub. Optional real-browser coverage is in `tests/spectrum-browser.cjs` (requires
Playwright and its Chromium binary); this browser test could not run in the
implementation environment because the browser binary was not installed.
