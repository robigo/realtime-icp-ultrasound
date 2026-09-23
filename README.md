# Ultrasound → ICP waveform proxy (research demo)

A browser based playback of **synthetic**, ultrasound inspired motion data and a **normalized ICP waveform proxy**. The example contains 600 samples over 12 seconds (50 Hz). It includes scrolling waveforms, a latest beat view, and illustrative heart rate, P1/P2/P3, P2/P1, motion, and signal quality indicators.

**This is not a clinical device or validated ICP estimator.** The proxy is supplied in the example CSV, not inferred from raw ultrasound; it has no mmHg calibration, no patient data, and no diagnostic value. Fixed time regions locate illustrative P1/P2/P3 maxima. The quality and flow confidence scores are simple display heuristics.

## Run locally

From the repository root:

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080>. No packages, build step, or backend are required. Opening `index.html` directly as a file may block CSV loading in the browser; serve it over HTTP.

## Data

`data/synthetic_echo_to_icp_demo.csv` contains:

| Column | Meaning |
| --- | --- |
| `timestamp_s` | Sample time in seconds |
| `echo_displacement_samples` | Synthetic ultrasound A-line displacement |
| `optic_flow_y_px_per_frame` | Synthetic vertical optical flow |
| `mean_brightness` | Synthetic image brightness |
| `ppg_reference_0_1` | Synthetic PPG reference |
| `beat_marker` | Synthetic start of beat (0 or 1) |
| `icp_proxy_z` | Pre-generated normalized waveform proxy (relative units) |

The existing dataset is replayed in a loop. A next research stage could accept ultrasound frames or measured motion, extract and assess a signal, validate it against paired invasive ICP measurements, and only then explore calibration and clinical claims.
