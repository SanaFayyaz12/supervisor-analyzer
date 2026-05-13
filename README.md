# Trinethra — Supervisor Feedback Analyzer

An AI-assisted analyzer that converts a 10-15 minute supervisor feedback transcript into a structured assessment — evidence quotes, a 1-10 rubric score, KPI mapping, gap analysis, and follow-up questions — so a DeepThought psychology intern can finalise the assessment in 10 minutes instead of 45-60.

The AI suggests. The intern decides.

> Built for the DeepThought Trinethra Module — Backend Developer Internship assignment.

---

## Setup (3 steps)

> Assumes you have **Node.js 18+** and **Ollama** installed. If not:
> - Node.js → https://nodejs.org (LTS)
> - Ollama → https://ollama.com

### 1. Pull the model
```bash
ollama pull llama3.2
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run the app
```bash
npm start
```

Then open **http://localhost:3000** in your browser.

The Ollama background service must be running. On Windows/macOS it starts automatically after install. If you see `ollama not running` in the top-right of the app, run:
```bash
ollama serve
```

Click **"Load sample transcript"** to try one of the 3 included transcripts.

---

## Architecture

```
┌──────────────┐  POST /api/analyze   ┌──────────────┐   POST /api/generate   ┌──────────┐
│   Browser    │ ───────────────────► │ Express API  │ ─────────────────────► │  Ollama  │
│ (HTML/CSS/JS)│ ◄─────── JSON ────── │  (server.js) │ ◄──────  JSON  ─────── │ llama3.2 │
└──────────────┘                      └──────────────┘                        └──────────┘
```

- **Frontend** — vanilla HTML + CSS + JS (`/public`). No framework so the build stays under a minute and a non-developer reading the code can follow it.
- **Backend** — Node.js + Express (`server.js`). One real endpoint (`/api/analyze`), one health check, one samples endpoint.
- **LLM** — Ollama running locally on `localhost:11434` with `llama3.2` (3B). No cloud, no API key, free.

---

## Model Choice — why `llama3.2`

- **Size**: 3B parameters → runs on 8GB RAM laptops without melting them.
- **Quality**: Strong enough for structured-output tasks (this is extraction + scoring, not creative writing).
- **JSON mode**: Ollama supports `format: "json"` for this model, which forces JSON-shaped output and dramatically reduces parse failures.

If you have more RAM, try `mistral` or `llama3.1:8b` — change the `OLLAMA_MODEL` constant at the top of `server.js`.

---

## Design Challenges I Tackled

I picked **4 of the 5** design challenges from the brief.

### Challenge 1 — One Prompt vs Many
**Decision: One prompt.**
A supervisor transcript is only 10-15 minutes (~300-800 words). One well-crafted prompt with the rubric and 8 KPIs embedded in the system context gives the model everything it needs. Multi-prompt would 3x the latency on a local LLM (already 30-60s) and would force me to manage state across calls — pointless complexity for an MVP. I do use `temperature: 0.2` to keep structure stable across runs.

### Challenge 2 — Structured Output Reliability
Three-layer defence:
1. **Ollama JSON mode** (`format: "json"` in the request) — forces JSON-shaped output at the model level.
2. **Strict schema in the prompt** — the prompt shows the exact JSON shape including field names.
3. **Tolerant parser + one retry** — `extractJson()` in `server.js` tries direct parse, then strips markdown fences, then greedy-matches the outermost `{...}`. If all fail, the backend retries once with a stricter nudge. After two failures, the user sees a clear error (not a crash).

### Challenge 3 — Evidence Linking
Each evidence quote in the right panel is clickable. Clicking it selects the matching text in the transcript textarea on the left and pulses the textarea border. This gives the intern a fast "show me where this came from" interaction without needing a fancy diff library.

### Challenge 4 — Showing Uncertainty (fighting automation bias)
Two pieces:
- The model returns its own `confidence` (high/medium/low) with a `confidenceReason`. This is rendered as a separate card next to the score so the intern can't miss it.
- A persistent disclaimer at the bottom of the result reminds the user: *"This is a draft. Review every finding. The AI suggests; you decide."*

The score is shown in a dark card to feel weighty, but the surrounding UI (clickable quotes, confidence card, gaps list) is designed to invite editing, not acceptance.

### Challenge 5 — Skipped (intentional trade-off)
Gap detection is implemented in the prompt by explicitly listing the 5 assessment dimensions and asking the model which ones the transcript did **not** cover. It works well for clearly-missing dimensions (e.g. supervisor never mentions systems building) but is weaker for partial coverage. With more time I'd add a deterministic post-check that counts dimension-related keywords in the transcript and overlays the model's gap list with that.

---

## What I'd Improve With More Time

1. **Side-by-side highlighting** — render the transcript as styled HTML on the left, with evidence quotes highlighted inline (not just selected in a textarea). Today the click-to-select interaction works but is not as visually satisfying as inline highlights.
2. **Editable findings** — let the intern edit any quote, signal, score, or question in-place, then export the finalised assessment as JSON or Markdown. Today the output is read-only.
3. **Transcript intake from audio** — Most calls are recorded. A Whisper-via-Ollama step would skip the manual transcription stage entirely.
4. **Multi-run averaging** — for high-stakes assessments, run the analysis 3x with different temperatures and surface the median score with a variance indicator. Cheap on a local LLM.
5. **Persistence** — currently every analysis is one-off. A small SQLite table keyed by Fellow + supervisor + date would let Trinethra trend a Fellow's score over time.

---

## Project Structure

```
supervisor-analyzer/
├── server.js                  # Express backend + Ollama integration
├── package.json
├── rubric.json                # 1-10 DT Fellow Performance Rubric (embedded in prompt)
├── sample-transcripts.json    # 3 supervisor transcripts for testing
├── README.md
└── public/
    ├── index.html             # UI
    ├── styles.css             # Burnt-sienna theme, serif headings
    └── script.js              # Fetch /api/analyze, render results, evidence linking
```

---

## Tested With

- macOS 14 / Windows 11
- Node.js 20 LTS
- Ollama 0.4.x
- Models: `llama3.2` (primary), `mistral` (fallback)

Each of the 3 sample transcripts has been run end-to-end:
- `transcript-001` (Karthik, dependable but not driving) → expected score band 4-6
- `transcript-002` (Priya, systems builder) → expected score band 7-9
- `transcript-003` (Rahul, struggling) → expected score band 1-3

---

## License

MIT
