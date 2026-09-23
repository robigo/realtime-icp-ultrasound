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

### Preview on an iPhone on the same Wi-Fi

`whereby-server.js` intentionally accepts connections only from the computer itself. To preview the static pages on an iPhone, leave that server running and open a second PowerShell window in the project folder. Run `ipconfig` and find the computer's Wi-Fi IPv4 address (for example `192.168.1.23`). Then run:

```powershell
& "$env:USERPROFILE\Downloads\node.exe" .\iphone-server.js 192.168.1.23
```

Replace the example address with the computer's actual address. If Node is installed system-wide, use `node .\iphone-server.js 192.168.1.23`. Open the address printed by this command in **Safari on the iPhone**, on the same Wi-Fi. Windows Firewall may ask to allow Node on private networks; some guest or managed Wi-Fi networks isolate devices. This serves the static demo and vision exercise only, on port 8082. It does not provide the Whereby API or create video rooms, and does not use `WHEREBY_API_KEY`. Stop it with Ctrl+C. Camera/microphone access in a video iframe on an HTTP LAN address needs a proper HTTPS deployment; open the Whereby meeting itself via its HTTPS guest link for a video test.

## Video consultation link

The page includes an optional **Join a video consultation** form. A clinician supplies an existing HTTPS meeting link (for example from their usual video meeting service), and the user enters it to open the call in a new browser tab. The site does not create meetings, record calls, store the link or patient details, or transmit the demo waveform. Video service access and its privacy settings are handled by the meeting provider and clinician. A call can support remote assessment, but it is not an ultrasound or ICP measurement.

## Guided eye check

`vision.html` is a separate **unvalidated visual acuity exercise** for each eye. It displays randomized tumbling E symbols at a user-selected 40 cm near or 2 m distance after the user matches a 50 mm bar to a physical ruler. The letter is five strokes tall (5 arcminutes at logMAR 0), with a surrounding box separated by half a letter and a border one stroke thick. The staircase follows the [published Vision at Home (V@home) precursor protocol](https://pmc.ncbi.nlm.nih.gov/articles/PMC6701871/): five responses per size, passing at least four, coarse logMAR sizes 1.0, 0.8, 0.5, 0.2, 0.0, and finer 0.1 increments after a failure. The browser stops when the next letter would be less than 10 CSS pixels wide or its box would not fit, rather than falsely reporting a better level. The exact WHOeyes software algorithm and conversion to its 0–100% score are not published in these sources, so the exercise **does not compute a WHOeyes score**. The displayed percent is only the fraction of correct responses in all presented trials, not a vision percent or visual acuity percentage.

The calculated logMAR letter size is theoretical: screen size and viewing distance are set by hand, no automatic absolute distance measurement is performed, and the device, viewing conditions and web rendering have not been validated. A display-resolution stop does not imply an acuity limit. Unlike the original near test, which was binocular in the cited study, this exercise tests each eye separately at both distances. The results remain in memory until the user elects to copy or share them. This is not a diagnosis or a measure of intraocular/intracranial pressure. Use a second device or pause the video call if it occupies the phone screen. For a mobile app with published accuracy studies consider [WHOeyes](https://www.who.int/teams/noncommunicable-diseases/sensory-functions-disability-and-rehabilitation/whoeyes), which does not replace a professional eye examination.

The exercise now presents a five-stage guided sequence after calibration: binocular acuity with both eyes open; eyes-closed transition with a descriptive question; right-eye acuity with the left eye manually covered; a second eyes-closed transition; left-eye acuity with the right eye covered. Each acuity stage uses the same adaptive E test. The two eyes-closed answers are descriptive self-reports only and never affect the acuity scores. The result shows automatically calculated binocular and per-eye thresholds and a descriptive comparison between right and left. It does not check occlusion, recognize spoken answers, transmit results live to a clinician, or determine an eyeglasses prescription. Those functions require further engineering and clinical validation; a checked box is a user's confirmation, not a verified observation.

### Optional camera distance cue

On HTTPS or localhost, the user can explicitly enable the front camera. After **physically measuring** the selected 40 cm or 2 m distance, they can save a reference face size. MediaPipe Face Detector then compares the width of a single detected face in later video frames with that reference and shows a directional warning for repeated changes of over 20%. It does not infer an absolute distance in centimeters, prove the initially measured distance, verify that an eye is covered, score responses, or validate the results. Changes in angle, face covering, lighting, device position or focal characteristics can make the warning wrong; distant faces may not be detected at all. If permission, network assets or face detection fail, the manual exercise continues.

The detector is loaded only after the user clicks **הפעל מצלמה**. Browser permission is requested at that point. The MediaPipe JavaScript runtime is loaded from a pinned jsDelivr package and the face detection model from Google storage; review their privacy terms and possible usage telemetry before sensitive deployments. This page does not record video or upload test answers. Camera tracks stop when the user clicks **כבה מצלמה**, ends the exercise, or leaves the page. Public GitHub Pages provides HTTPS; an HTTP address on a local network does not generally allow camera access.

## GitHub Pages (public HTTPS preview)

The public repository contains static HTML, CSS, and JavaScript in the root of `main`; no build step is needed. In GitHub, open **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: main → Folder: /(root) → Save**. When GitHub reports the deployment is ready, open `https://robigo.github.io/realtime-icp-ultrasound/` or `https://robigo.github.io/realtime-icp-ultrasound/vision.html` from an iPhone on any network. Updates to `main` then republish automatically.

Pages is public static hosting. It cannot run `whereby-server.js`, store an API key, or create Whereby rooms. On the public `whereby.html` page the create-room button instead generates a browser-side token and opens the experimental Jitsi room in `session.html`, where the user can copy a link for another participant. On localhost, the same page keeps its Whereby API workflow. The main page can open an existing HTTPS video meeting link, while the vision exercise runs in the browser and shares a summary only if the user chooses to do so. The Jitsi page is a limited technical demonstration and is not intended for patient sessions. Do not treat these exercises or the generated synthetic waveform as clinical results.

At the start of each exercise the browser generates a random `EYE-…` examination identifier with cryptographically secure random bytes. The same identifier appears during the exercise and in its final summary. The user can copy the summary or open a prefilled WhatsApp share message to send it deliberately to a clinician. No report is saved or uploaded, no result is transmitted by the video call, and an identifier alone cannot retrieve the report. The clinician reads the shared text; the identifier is a reference for matching that conversation to the result, not an authenticated patient identity.

## In-page video session (technical pilot only)

Open `session.html` to generate a cryptographically random 128-bit room token. On a public HTTPS deployment, the page provides a shareable link with the token in the URL fragment. Both participants open the same page and explicitly click to load the embedded video service (the public `meet.jit.si` deployment); the service handles the actual audio/video, not this repository. The session page links to `vision.html` with the meeting identifier attached; the vision report contains its own examination ID plus the meeting ID, and the user must explicitly share the report. No report travels through the video connection automatically. On `file://` or localhost, sharing a cross-device link is disabled; host the site on HTTPS to enable invitation links. The person creating a room on the public Jitsi service may need to authenticate. Test camera, microphone, and the mobile browser with two separate devices before any launch.

**Do not use this technical pilot for real patient examinations.** Anyone with the link may access the meeting; there is no server-side access control, clinician/patient identity verification, link expiry or revocation, consent management, secure clinical record, provider suitability review, or validated medical protocol. The room token and meeting ID are not patient identifiers. Public GitHub hosting does not solve these gaps. Choose an appropriate video provider, implement these safeguards and verify legal/clinical requirements before using it in a healthcare setting.

The public `meet.jit.si` embedded demo is **limited to short test calls** by the provider; it is not suitable for production embedding.

## Whereby Embedded local technical pilot

`whereby.html` and `whereby-server.js` provide a local-only integration for the Whereby Explore plan. The API key is read from `WHEREBY_API_KEY` on the local server, never placed in browser JavaScript or the public repository. The server listens only on `127.0.0.1` and refuses room-creation requests from other origins. The Whereby API creates a locked, temporary room and returns a guest URL for a second participant plus a host URL used only in the local embedded call. The guest joins on Whereby's site during this local pilot. A dedicated HTTPS site with a protected backend is required before an invitation can open inside our own page on a different device. This is **not suitable for clinical use**; the Explore plan does not include the provider's HIPAA add-on, and the local server has no clinical access controls.

On Windows PowerShell, from the downloaded project folder, with Node.js 22 or later installed:

```powershell
$env:WHEREBY_API_KEY = Read-Host -Prompt 'Whereby API key'
node .\whereby-server.js
```

Then open <http://127.0.0.1:8080/whereby.html> on the **same computer** and create a technical test room. The API key remains in that terminal session; close the terminal when done. Never paste the API key into chat, a screenshot, a tracked file, or the browser page. Creating the key in the Whereby dashboard does not by itself enable the pilot until it is entered in the local terminal. The remote participant receives only the guest room URL. Do not send the host URL with its privileged `roomKey`.

After creating a room, the host can click **Open vision exercise with meeting ID**. The separate exercise tab shows the same `CALL-…` ID, and its final summary includes both the meeting ID and a distinct `EYE-…` ID for that exercise. This is a reference for manually matching the conversation and the summary; no result is uploaded, stored, or extracted from the video. The local vision link only works on the host computer, not on the remote participant's device. Sharing a result still requires an explicit copy or WhatsApp action from the exercise page.

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
