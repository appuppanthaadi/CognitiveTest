# SkillPath — Cognitive Check (Demo)

An educational, open-source web app that demonstrates a rubric-inspired cognitive check based on the CEM formulation (LTM, STM, WM, FR, AVP, PS, ATN) and a composite CCS.

**Not a medical tool.** This is a learning demo to help students explore strengths; it is not a clinical assessment.

## Run locally

Open `index.html` in a browser, or serve the folder with any static server.

```bash
python -m http.server 8080
# Visit http://localhost:8080
```

## Deploy to GitHub Pages

1. Create a new public repo (e.g., `skillpath-demo`).
2. Upload `index.html`, `styles.css`, and `app.js` to the repo root.
3. In repo settings → Pages: Source = Deploy from a branch, Branch = main (or master) / root.
4. Your app will be available at `https://<your-username>.github.io/<repo-name>/`.

## Scoring

- Accuracy: short quiz + pattern matrix.
- Time: time on study material (AVPI) and task (PSI).
- Help frequency: counts of study/help/hints (FRI = avg(1/fa, 1/fh, 1/frlh)).
- Metrics:
  - LTM = Si/Sa
  - STM = Sf/Sa
  - WM  = 0.5·STM + 0.5·IQ_proxy
  - AVP = 0.5·STM + 0.5·AVPI
  - FR  = 0.5·STM + 0.5·FRI
  - PS  = 0.5·STM + 0.5·PSI
  - ATN = 0.5·STM + 0.5·ATI
  - CCS = Σ α_i·metric_i (defaults: [0.1,0.2,0.2,0.1,0.1,0.2,0.1])

MIT License
