# JanPramaan — Every Voice. Accountable Action.

JanPramaan is an independent civic-reporting prototype focused on Bhopal, Madhya Pradesh. It is not an official government portal. The frontend remains plain HTML, CSS, and JavaScript. A local Python server serves the site and screens report submissions using the configured local Ollama model. It is not a shared report database, secure moderation service, or authority integration.

## What works in this prototype

- Dashboard totals and clickable metric cards use the same report collection; search, category/status filters, sorting, empty states, and clear-filter actions update the report list. Metrics count records by their canonical status and verification evidence/decision fields.
- Bhopal locality explorer with searchable locality cards, report counts, locality/category/status filters, and a report table. Locations are handled as reporter-provided locality and text; the prototype does not geocode or display a map.
- Report form with category-specific issue types, validation, duplicate suggestions, locality selection or typed landmark, and reference IDs.
- Public identity options: chosen display name, locally generated pseudonym, or anonymous. Anonymous records save no reporter name or email.
- Education fee concerns are explicitly described as allegations. Traffic reports capture time, reported impact, and an optional supporting source.
- Optional report and before-evidence uploads, plus separate before/after-resolution evidence uploads, accept JPEG, PNG and WebP up to 3 MB each. They are re-encoded in the browser (best-effort common metadata removal), previewed, and stored as browser-local data URLs with notes, submitter labels, and timestamps.
- Report details include source/location confidence, chronological attributed history, evidence state, support/follow actions, corrections, disputes, and content flags.
- Sequential status workflow: Reported → Acknowledged → In Progress → Resolution Submitted → Verification Pending → Verified Resolved or Resolution Disputed.
- Three clearly labeled, fictional sample records demonstrate a simulated Verified Resolved state. They have textual sample evidence references, no uploaded proof, no reviewer identity, and no real verification timestamp. They count toward the verified-resolved demo metric but are never represented as real outcomes.
- Demo operator updates can move claims into Verification Pending. The unauthenticated simulated reviewer can record a dispute, but cannot verify user submissions. Real user-submitted records cannot become Verified Resolved through this prototype.
- Trust & Transparency page explains record sources, authority connectivity, privacy, limitations, and moderation policy.
- Optional Gemma analysis sends only the entered title, description, and locality to the configured Google Gen AI service after the user presses its button. Its category, priority, summary, and suggested action are advisory only and never change report data or status.
- Python API provides `GET /api/health` and `POST /api/analyze-issue`. The model call uses Google's `google-genai` SDK and requests the exact model ID `gemma-4-26b-a4b-it`; it does not substitute a Gemini model. A configured key does not guarantee that Google currently exposes this exact model through the API key endpoint.
- New report submissions call `POST /api/submit-complaint` on the same origin before being saved in browser storage. The server validates fields and JPEG/PNG/WebP signatures, size, and decoded dimensions, then screens report text with the local Ollama chat API using `OLLAMA_MODEL` (default `hackathon-agent`). Uploaded image bytes are not sent to Ollama; an image attachment requires human review because its contents are not inspected.
- Model output is validated against a JSON schema. Deterministic publication rules keep reports with sensitive content, a suspected personal dispute, spam, inconsistent evidence, unclear civic relevance, missing required context, or unreviewed media off the dashboard. A repeated identical title/description/locality is held. A missing optional photo alone is not a reason to reject or hold a report.
- Screening statuses are stored separately from complaint text in a local SQLite database. Passing the configured local policy sets `approved_for_publication`; otherwise the item remains private to the submitter's local browser and appears under **My submissions** with correction/appeal access. A preliminary AI assessment is not a human review or a truth finding.

## Data, privacy, and limitations

- The local Python API and SQLite database are a development prototype, not production storage. The server binds to loopback by default and has no secure accounts, role-based reviewer console, encrypted evidence storage, shared public API, human moderation, or authority integration. Anyone with access to the machine or the same browser profile may access stored data.
- Fictional sample records are individually labeled and are examples only—not real Bhopal complaints, statistics, authority actions, or verified outcomes.
- User reports, optional photos, support, and status updates are stored in browser `localStorage`; report text and screening results are also stored in separate SQLite tables in `data\screening.sqlite3`. Uploaded image bytes are not saved by the screening database. The API does not provide a public list endpoint, but local files/browser data are not protected by production access controls or encrypted storage. Storage has no retention/deletion policy.
- A chosen display name is public within the local report view. Pseudonyms are generated locally. Anonymous mode does not store or show a reporter name or email, but does not promise technical untraceability.
- Image re-encoding removes common metadata in ordinary cases but is not a forensic privacy guarantee. Avoid uploading faces, identity documents, student records, or private medical records.
- The prototype cannot create a genuine Verified Resolved outcome. Legacy user records previously marked verified are migrated back to Verification Pending. Only the current explicitly simulated sample records contribute verified demo counts.
- Before/after uploads and their audit labels are stored in local storage, not in secure evidence storage. Image payloads may exceed browser storage quotas; failed saves surface an error and do not pretend to succeed. Before images are never substituted with placeholders; absent evidence is stated explicitly.
- Corrections and appeals are recorded in the local screening database and re-screened; this is not a human appeal decision. Duplicate submissions are held for review, not silently merged. Flags are local only and are not reviewed by a moderator. Rate limiting is in-memory and only protects this single local server process.
- There is no configured retention period or secure deletion service. Clear this browser's site data to remove its stored reports; this also clears other local JanPramaan records.

## Running

Use PowerShell from the project folder. Ensure Ollama is running and the `hackathon-agent:latest` model exists (`ollama list`). If needed, recreate this local model from the included Modelfile, which uses the installed `gemma4` base:

```powershell
ollama create hackathon-agent -f .\Modelfile
```

Create and activate a virtual environment, then install the dependencies:

```powershell
Set-Location 'C:\Users\Advit Mishra\OneDrive\Documents\hackathon-agent'
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Set `OLLAMA_MODEL=hackathon-agent` in the ignored `.env` file (or keep the default). The separate optional Google Gemma analysis button still needs `GOOGLE_API_KEY`; that key is not used by the screening pipeline. Do not place keys in frontend code. Start the combined frontend/API server:

```powershell
python server.py
```

Open `http://127.0.0.1:8765` (not a separate Live Server port or `file://`, because submission calls are same-origin). Health reports whether Ollama and the configured model tag are reachable at `http://127.0.0.1:8765/api/health`. The report form calls the screening endpoint itself. For a direct local test:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8765/api/submit-complaint' -Method Post -ContentType 'application/json' -Body (@{
  title = 'Pothole on public road'
  description = 'A deep pothole is affecting traffic on a public road near Arera Colony.'
  category = 'Roads and infrastructure'
  topic = 'Pothole'
  locality = 'Arera Colony'
} | ConvertTo-Json)
```

If Ollama or the model is unavailable, the endpoint returns a safe service error and does not save a successful submission. The current Google `/api/analyze-issue` endpoint is separate and optional.

Run the API checks with:

```powershell
python -m unittest discover -s tests -v
```

This is not production-ready. Production requires authenticated reporter/reviewer identities, access-controlled and encrypted complaint/evidence storage, a real human review and appeal queue, shared report APIs, durable audit/retention/deletion controls, malware/image scanning, distributed rate limits, CSRF protection for authenticated operations, and security testing. No report is delivered to an authority and no screening result verifies the reported facts or a resolution.
