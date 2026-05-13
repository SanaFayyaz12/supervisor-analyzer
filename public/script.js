// ----- DOM refs
const $ = (id) => document.getElementById(id);
const transcriptEl  = $('transcript');
const analyzeBtn    = $('analyzeBtn');
const spinner       = analyzeBtn.querySelector('.btn-spinner');
const errorBox      = $('errorBox');
const emptyState    = $('emptyState');
const resultsEl     = $('results');
const healthEl      = $('health');

// ----- Health check on load
(async () => {
  try {
    const r = await fetch('/api/health');
    const data = await r.json();
    if (data.ok) {
      healthEl.textContent = `model: ${data.model} · ready`;
      healthEl.classList.add('ok');
    } else {
      healthEl.textContent = 'ollama not running';
      healthEl.classList.add('fail');
    }
  } catch (e) {
    healthEl.textContent = 'server offline';
    healthEl.classList.add('fail');
  }
})();

// ----- Load sample transcript
$('loadSampleBtn').addEventListener('click', async () => {
  try {
    const r = await fetch('/sample-transcripts.json');
    const data = await r.json();
    // Rotate through the 3 samples on each click
    const idx = (parseInt(transcriptEl.dataset.sampleIdx || '-1', 10) + 1) % data.transcripts.length;
    transcriptEl.dataset.sampleIdx = idx;
    transcriptEl.value = data.transcripts[idx].supervisorTranscript;
  } catch (e) {
    // sample-transcripts.json is at the project root, not /public — expose it via /samples
    const r = await fetch('/samples');
    const data = await r.json();
    const idx = (parseInt(transcriptEl.dataset.sampleIdx || '-1', 10) + 1) % data.transcripts.length;
    transcriptEl.dataset.sampleIdx = idx;
    transcriptEl.value = data.transcripts[idx].supervisorTranscript;
  }
});

// ----- Run analysis
analyzeBtn.addEventListener('click', async () => {
  const transcript = transcriptEl.value.trim();
  errorBox.hidden = true;
  if (!transcript) {
    showError('Paste a transcript first.');
    return;
  }

  setLoading(true);
  resultsEl.hidden = true;
  emptyState.hidden = false;

  try {
    const r = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Analysis failed');
    renderResults(data);
  } catch (e) {
    showError(e.message);
  } finally {
    setLoading(false);
  }
});

function setLoading(on) {
  analyzeBtn.disabled = on;
  spinner.hidden = !on;
  analyzeBtn.querySelector('.btn-label').textContent = on ? 'Analyzing…' : 'Run Analysis';
}

function showError(msg) {
  errorBox.textContent = msg;
  errorBox.hidden = false;
}

// ----- Render
function renderResults(d) {
  emptyState.hidden = true;
  resultsEl.hidden = false;

  // Score
  $('scoreValue').textContent = d.score?.value ?? '–';
  $('scoreLabel').textContent = d.score?.label ?? '';
  $('justification').textContent = d.score?.justification ?? '';

  // Confidence (Challenge 4 — fight automation bias)
  const conf = (d.confidence || 'medium').toLowerCase();
  const confEl = $('confidenceValue');
  confEl.textContent = conf;
  confEl.className = 'confidence-value ' + conf;
  $('confidenceReason').textContent = d.confidenceReason || '';

  // Evidence
  const evList = $('evidenceList');
  evList.innerHTML = '';
  $('evidenceCount').textContent = `(${d.evidence.length})`;
  d.evidence.forEach((e) => {
    const sig = (e.signal || 'neutral').toLowerCase();
    const item = document.createElement('div');
    item.className = 'evidence-item ' + sig;
    item.innerHTML = `
      <span class="signal-tag ${sig}">${sig}</span>
      <p class="evidence-quote">“${escapeHtml(e.quote)}”</p>
      <p class="evidence-interp">${escapeHtml(e.interpretation || '')}</p>
    `;
    // Challenge 3: click a quote -> scroll & highlight it in the transcript textarea
    item.addEventListener('click', () => highlightInTranscript(e.quote));
    evList.appendChild(item);
  });

  // KPIs
  const kpiList = $('kpiList');
  kpiList.innerHTML = '';
  if (d.kpiMapping.length === 0) {
    kpiList.innerHTML = '<span class="hint">No KPIs surfaced in this transcript.</span>';
  }
  d.kpiMapping.forEach((k) => {
    const chip = document.createElement('span');
    chip.className = 'chip';
    chip.innerHTML = `<strong>${escapeHtml(k.kpi)}</strong><span class="chip-evidence">${escapeHtml(k.evidence || '')}</span>`;
    kpiList.appendChild(chip);
  });

  // Gaps
  const gapsList = $('gapsList');
  gapsList.innerHTML = '';
  $('gapsCount').textContent = `(${d.gaps.length})`;
  if (d.gaps.length === 0) {
    gapsList.innerHTML = '<span class="hint">All 5 dimensions covered.</span>';
  }
  d.gaps.forEach((g) => {
    const el = document.createElement('div');
    el.className = 'gap-item';
    el.innerHTML = `<div class="gap-dim">${escapeHtml(g.dimension)}</div>
                    <div class="gap-detail">${escapeHtml(g.detail || '')}</div>`;
    gapsList.appendChild(el);
  });

  // Follow-ups
  const qList = $('questionsList');
  qList.innerHTML = '';
  d.followUpQuestions.forEach((q) => {
    const li = document.createElement('li');
    li.className = 'question-item';
    li.innerHTML = `<div class="question-text">${escapeHtml(q.question)}</div>
                    <span class="question-target">targets: ${escapeHtml(q.targetGap || '—')}</span>`;
    qList.appendChild(li);
  });

  resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ----- Highlight quote in the textarea (Challenge 3: evidence linking)
function highlightInTranscript(quote) {
  if (!quote) return;
  const text = transcriptEl.value;
  const idx = text.toLowerCase().indexOf(quote.toLowerCase().slice(0, 40));
  if (idx === -1) return;
  transcriptEl.focus();
  transcriptEl.setSelectionRange(idx, idx + quote.length);
  // Visual pulse
  transcriptEl.classList.add('tx-highlight');
  setTimeout(() => transcriptEl.classList.remove('tx-highlight'), 1200);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
