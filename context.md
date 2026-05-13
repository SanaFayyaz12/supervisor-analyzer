# Context — Domain Knowledge for the Analyzer

This is the domain context the analyzer is built around. It is **embedded into the LLM prompt** at runtime (see `server.js > buildPrompt()`), so the model scores transcripts against the same framework DeepThought uses internally.

---

## The Fellow Model
A DeepThought Fellow is placed inside a manufacturing MSME (₹50Cr–₹500Cr revenue) for 3-6 months. The Fellow's job is **not** to complete tasks — it is to **build durable systems** that outlast the engagement. The rubric reflects this: a Fellow who closes 100 tickets but leaves no SOP behind scores lower than a Fellow who closes 30 tickets and leaves a working dashboard the client team uses for years.

## The 5 Assessment Dimensions
A complete supervisor feedback call should give signal on:
1. **Reliability & Ownership** — does the Fellow follow through, take responsibility for outcomes
2. **Systems Building** — does the Fellow create lasting structure (SOPs, dashboards, rituals)
3. **Team Response** — how does the client team react to / interact with the Fellow
4. **Business Impact** — any movement on a KPI, measurable outcome
5. **Growth Trajectory** — is the Fellow learning, escalating in capability over weeks

The analyzer scores the **Fellow** on these dimensions and flags which the **supervisor did not address** as gaps for the next call.

## The 8 Business KPIs
DT tracks Fellow contribution against 8 generic MSME KPIs:
1. Revenue Growth
2. Cost Reduction
3. On-Time Delivery
4. Quality / Defect Rate
5. Inventory Turnover
6. Employee Productivity
7. Customer Satisfaction
8. Process Cycle Time

The analyzer maps each piece of evidence to the most relevant KPI(s).

## Supervisor Biases (handled implicitly by the model)
- **Recency bias** — supervisors often anchor on the past week. Prompt asks for evidence across the full tenure if possible.
- **Niceness bias** — Indian supervisors under-report problems. Negative-signal evidence is flagged distinctly so it gets weight.
- **Effort vs outcome confusion** — supervisors praise effort ("sincere boy, comes on time"). The rubric explicitly separates Productive (4-7) from Need Attention (1-3) on **outcome**, not effort.
