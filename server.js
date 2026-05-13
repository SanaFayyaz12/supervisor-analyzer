/**
 * Supervisor Feedback Analyzer — Backend
 * DeepThought Trinethra Module
 *
 * Architecture:
 *   Frontend (browser)  ->  Express API (this file)  ->  Ollama (localhost:11434)
 *
 * Design Decisions:
 *   1. SINGLE PROMPT vs MULTI PROMPT (Challenge 1):
 *      Using a SINGLE structured prompt. A 10-15 min transcript is short enough
 *      that one well-crafted prompt with the rubric + KPI definitions embedded
 *      gives consistent results. Multi-prompt would 3x the latency on a local
 *      LLM (already 30-60s) and the intern is reviewing anyway.
 *
 *   2. STRUCTURED OUTPUT (Challenge 2):
 *      Using Ollama's `format: "json"` mode (forces JSON output) + a strict
 *      schema in the prompt + a regex fallback extractor + ONE automatic retry
 *      if parsing fails. This handles ~95% of LLM output variability.
 *
 *   3. GAP DETECTION (Challenge 5):
 *      Explicitly listing the 5 assessment dimensions in the prompt and asking
 *      the model to mark which ones the transcript did NOT cover. Reasoning
 *      about absence works better when the model knows what "complete" looks like.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'llama3.2';

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Load rubric and context once at startup so the prompt always has them
const rubric = JSON.parse(fs.readFileSync(path.join(__dirname, 'rubric.json'), 'utf-8'));

/**
 * The master prompt.
 * Embeds the rubric + the 5 assessment dimensions + the 8 KPIs so the model
 * has full context and produces output aligned with DT's evaluation framework.
 */
function buildPrompt(transcript) {
  return `You are an expert organizational psychologist assisting DeepThought's Trinethra team. You analyze supervisor feedback transcripts about Fellows placed inside Indian manufacturing MSMEs.

# THE RUBRIC (1-10 scale)
${JSON.stringify(rubric.rubric.bands, null, 2)}

# THE 5 ASSESSMENT DIMENSIONS
A complete assessment covers:
1. Reliability & ownership (does the Fellow follow through, take responsibility)
2. Systems building (does the Fellow create lasting structure, not just complete tasks)
3. Team response (how does the client team react to the Fellow)
4. Business impact (any KPI movement, measurable outcomes)
5. Growth trajectory (is the Fellow learning, escalating in capability)

# THE 8 BUSINESS KPIs
1. Revenue Growth
2. Cost Reduction
3. On-Time Delivery
4. Quality / Defect Rate
5. Inventory Turnover
6. Employee Productivity
7. Customer Satisfaction
8. Process Cycle Time

# YOUR TASK
Analyze the supervisor transcript below. Return ONLY a valid JSON object with this EXACT schema:

{
  "score": {
    "value": <integer 1-10>,
    "label": "<rubric band label, e.g. 'Reliable and Productive'>",
    "justification": "<2-3 sentence justification citing specific evidence from transcript>"
  },
  "evidence": [
    {
      "quote": "<exact quote from transcript, verbatim>",
      "signal": "<positive | negative | neutral>",
      "interpretation": "<what this reveals about the Fellow's behavior>"
    }
  ],
  "kpiMapping": [
    {
      "kpi": "<one of the 8 KPIs above>",
      "evidence": "<why this KPI is connected, based on transcript>"
    }
  ],
  "gaps": [
    {
      "dimension": "<one of the 5 assessment dimensions>",
      "detail": "<what specifically was missing in the supervisor's feedback>"
    }
  ],
  "followUpQuestions": [
    {
      "question": "<a specific question the intern should ask next call>",
      "targetGap": "<which gap dimension this question targets>"
    }
  ],
  "confidence": "<high | medium | low>",
  "confidenceReason": "<why this confidence level — e.g. 'transcript was short and missed 3 dimensions'>"
}

# RULES
- Extract 4-7 evidence quotes. They MUST be verbatim from the transcript.
- Identify 1-3 gaps (dimensions NOT covered). If all 5 were covered, return [].
- Suggest 3-5 follow-up questions, each tied to a real gap.
- Set confidence to "low" if the transcript is under 200 words OR covers fewer than 3 dimensions.
- Return ONLY the JSON object. No prose, no markdown fences, no commentary.

# TRANSCRIPT
"""
${transcript}
"""`;
}

/**
 * Try to pull a JSON object out of a possibly-messy LLM response.
 * Handles: clean JSON, JSON in code fences, JSON with surrounding prose.
 */
function extractJson(text) {
  if (!text) return null;
  // Try direct parse first
  try { return JSON.parse(text); } catch (_) {}
  // Strip markdown fences
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch (_) {}
  }
  // Greedy match for outermost { ... }
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch (_) {}
  }
  return null;
}

async function callOllama(prompt) {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      format: 'json',          // forces JSON-shaped output
      options: { temperature: 0.2 }  // low temp = more consistent structure
    })
  });
  if (!response.ok) {
    throw new Error(`Ollama returned ${response.status}. Is Ollama running? Try: ollama serve`);
  }
  const data = await response.json();
  return data.response;
}

app.post('/api/analyze', async (req, res) => {
  const { transcript } = req.body;

  if (!transcript || transcript.trim().length < 30) {
    return res.status(400).json({
      error: 'Transcript is too short. Please paste a real supervisor transcript (at least a few sentences).'
    });
  }

  const prompt = buildPrompt(transcript);

  try {
    // First attempt
    let raw = await callOllama(prompt);
    let parsed = extractJson(raw);

    // ONE retry with a stricter nudge if parsing failed
    if (!parsed) {
      console.warn('[analyze] First parse failed. Retrying...');
      raw = await callOllama(prompt + '\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY the JSON object, nothing else.');
      parsed = extractJson(raw);
    }

    if (!parsed) {
      return res.status(502).json({
        error: 'The local model returned output that could not be parsed as JSON. Try a different model (e.g. mistral) or run the analysis again.',
        rawSample: raw ? raw.slice(0, 300) : null
      });
    }

    // Defensive defaults so the UI never crashes on a missing field
    parsed.evidence = parsed.evidence || [];
    parsed.kpiMapping = parsed.kpiMapping || [];
    parsed.gaps = parsed.gaps || [];
    parsed.followUpQuestions = parsed.followUpQuestions || [];
    parsed.confidence = parsed.confidence || 'medium';

    res.json(parsed);
  } catch (err) {
    console.error('[analyze] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Sample transcripts endpoint (used by "Load sample" button)
app.get('/samples', (req, res) => {
  res.sendFile(path.join(__dirname, 'sample-transcripts.json'));
});

// Health check — useful for the demo video to prove Ollama is wired up
app.get('/api/health', async (req, res) => {
  try {
    const r = await fetch('http://localhost:11434/api/tags');
    const data = await r.json();
    res.json({ ok: true, model: OLLAMA_MODEL, availableModels: data.models?.map(m => m.name) || [] });
  } catch (e) {
    res.status(503).json({ ok: false, error: 'Ollama is not running. Start it with: ollama serve' });
  }
});

app.listen(PORT, () => {
  console.log(`\n  Trinethra Supervisor Feedback Analyzer`);
  console.log(`  ----------------------------------------`);
  console.log(`  Server:  http://localhost:${PORT}`);
  console.log(`  Model:   ${OLLAMA_MODEL} (via Ollama)`);
  console.log(`  Open http://localhost:${PORT} in your browser.\n`);
});
