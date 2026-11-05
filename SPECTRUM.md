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

## Automated validation

The **EchoPulse synthetic spectrum** GitHub Actions workflow runs on pull requests,
pushes to `main`, and manual dispatch. It uses Node.js 22, installs the pinned
test-only dependency `playwright@1.56.1`, and installs its matching Chromium binary
and operating system dependencies with `playwright install --with-deps chromium`.

The workflow runs:

- `node tests/spectrum.cjs`: known sinusoid amplitude/phase, constant input,
  Nyquist normalization, and invalid or nonuniform samples.
- `node tests/spectrum-ui.cjs`: DOM integration and CSV metadata with a canvas stub.
- `node tests/spectrum-browser.cjs`: rendered canvas and parameter redraws, all
  three synthetic signals, segment/window selection, baseline visibility and
  clearing, CSV download with synthetic-source metadata, page errors, and
  horizontal overflow at 1280 and 390 pixels.

Browser screenshots are uploaded as the `synthetic-spectrum-screenshots`
artifact and retained for seven days. A failure screenshot is captured when the
page is available; browser installation/launch failures are reported in job logs.

For local browser checks, install the same Playwright version and Chromium first.
The tests open the local static HTML; they do not contact medical hardware or load
patient measurements. Passing CI validates the synthetic demonstration only. It
does not validate real measurement processing, clinical accuracy, or a medical device.
