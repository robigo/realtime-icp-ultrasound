# Ultrasound → ICP waveform proxy (research demo)

A browser based playback of **synthetic**, ultrasound inspired motion data and a **normalized ICP waveform proxy**. The example contains 600 samples over 12 seconds (50 Hz). It includes scrolling waveforms, a latest beat view, and illustrative heart rate, P1/P2/P3, P2/P1, motion, and signal quality indicators.

**This is not a clinical device or validated ICP estimator.** The proxy is supplied in the example CSV, not inferred from raw ultrasound; it has no mmHg calibration, no patient data, and no diagnostic value. Fixed time regions locate illustrative P1/P2/P3 maxima. The quality and flow confidence scores are simple display heuristics.

## Run locally

Open `index.html` in your browser by double-clicking it. The bundled `data.js` lets the demo work offline, with no Python or local server.

Alternatively, from the repository root:

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080>. No packages, build step, or backend are required. The `data/` CSV is kept as a separate, reusable source file; `data.js` contains an embedded copy for direct browser opening.

## Video consultation link

The page includes an optional **Join a video consultation** form. A clinician supplies an existing HTTPS meeting link (for example from their usual video meeting service), and the user enters it to open the call in a new browser tab. The site does not create meetings, record calls, store the link or patient details, or transmit the demo waveform. Video service access and its privacy settings are handled by the meeting provider and clinician. A call can support remote assessment, but it is not an ultrasound or ICP measurement.

## Guided eye check

`vision.html` is a separate **unvalidated visual acuity screening exercise** for each eye. It displays randomized tumbling E symbols at a nominal 2 m distance after the user matches a 50 mm bar to a physical ruler. It records responses at six symbol sizes in memory only and reports the smallest level identified. It is not calibrated automatically, clinically validated, a diagnosis, or a measure of intraocular/intracranial pressure. Accuracy depends on screen calibration, viewing distance, ambient conditions, glasses, and whether the other eye is fully covered without pressing it. Use a second device or pause the video call if the call occupies the phone screen. For a validated mobile self-check consider [WHOeyes](https://www.who.int/teams/noncommunicable-diseases/sensory-functions-disability-and-rehabilitation/whoeyes), which the WHO says does not replace a professional eye examination.

At the start of each exercise the browser generates a random `EYE-…` examination identifier with cryptographically secure random bytes. The same identifier appears during the exercise and in its final summary. The user can copy the summary or open a prefilled WhatsApp share message to send it deliberately to a clinician. No report is saved or uploaded, no result is transmitted by the video call, and an identifier alone cannot retrieve the report. The clinician reads the shared text; the identifier is a reference for matching that conversation to the result, not an authenticated patient identity.

## In-page video session (technical pilot only)

Open `session.html` to generate a cryptographically random 128-bit room token. On a public HTTPS deployment, the page provides a shareable link with the token in the URL fragment. Both participants open the same page and explicitly click to load the embedded video service (the public `meet.jit.si` deployment); the service handles the actual audio/video, not this repository. The session page links to `vision.html` with the meeting identifier attached; the vision report contains its own examination ID plus the meeting ID, and the user must explicitly share the report. No report travels through the video connection automatically. On `file://` or localhost, sharing a cross-device link is disabled; host the site on HTTPS to enable invitation links. The person creating a room on the public Jitsi service may need to authenticate. Test camera, microphone, and the mobile browser with two separate devices before any launch.

**Do not use this technical pilot for real patient examinations.** Anyone with the link may access the meeting; there is no server-side access control, clinician/patient identity verification, link expiry or revocation, consent management, secure clinical record, provider suitability review, or validated medical protocol. The room token and meeting ID are not patient identifiers. Public GitHub hosting does not solve these gaps. Choose an appropriate video provider, implement these safeguards and verify legal/clinical requirements before using it in a healthcare setting.

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
