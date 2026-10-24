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
- **Analyse Issue** sends only the entered title, description, and locality to the configured local Ollama Gemma-family model through `POST /api/analyze-issue`. A schema-validated suggestion fills the form's existing Category and Issue Type fields. The values are checked against the server's allowed category/topic pairs and never establish facts or a resolution.
- If a citizen edits the title, description, or locality after analysis, the suggestion is marked stale and must be refreshed before submitting. Manual category and issue-type edits remain possible; backend submission screening always runs independently.
- Python API provides `GET /api/health`, `POST /api/analyze-issue`, and `POST /api/submit-complaint`. Analysis and final submission screening use the configured local Ollama model (`OLLAMA_MODEL`, default `hackathon-agent`); the browser never calls Ollama directly.
- New report submissions call `POST /api/submit-complaint` on the same origin before being saved in browser storage. The server validates fields and JPEG/PNG/WebP signatures, size, and decoded dimensions, then screens report text with the local Ollama chat API using `OLLAMA_MODEL` (default `hackathon-agent`). Uploaded image bytes are not sent to Ollama; an image attachment requires human review because its contents are not inspected.
- Model output is validated against JSON schemas. Clearly out-of-scope text and obvious private disputes are marked `rejected_out_of_scope`; ambiguous, sensitive, duplicate, spam-flagged, inconsistent, or unreviewed-media cases remain private for clarification or review. Missing optional photos alone do not trigger rejection or a moderation hold.
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

## Deploy the static frontend to Vercel

The Vercel configuration explicitly builds only the root-level `index.html`, `styles.css`, `app.js`, and `assets/` files with `@vercel/static`. This prevents Vercel from treating the root-level Python `server.py` as a function. The `.vercelignore` allowlist also excludes the Python backend, tests, local database, and environment files from the deployment; those files remain in the repository for separate backend hosting and local testing.

Import `AdvitMishra/janpramaan` into Vercel with the repository root as the Root Directory. The included `vercel.json` uses explicit static build targets; no package installation or frontend build is required. Push the deployment changes to the branch connected to Vercel to trigger a deployment, or deploy from this folder with the Vercel CLI:

```powershell
npx vercel --prod
```

This deploys only the frontend, not the Python API. The frontend's analysis, screening, and correction requests use relative `/api/...` URLs, so they will not work on the Vercel domain until the Python backend is separately hosted and the frontend is configured to call that service. No API responses are mocked, and no API key should be added to frontend code or the Vercel static deployment.

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

Set `OLLAMA_MODEL=hackathon-agent` in the ignored `.env` file (or keep the default). The analysis and screening endpoints use this local Ollama model. Do not place API keys in frontend code; the local analysis flow does not require a Google API key. Start the combined frontend/API server:

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

The analysis and submission routes each screen against the local model; submission never trusts an earlier browser analysis. If Ollama is unavailable or returns malformed data, the API reports an error and does not accept a report as screened. The browser keeps the user's unsent form draft so they can retry.

Run the API checks with:

```powershell
python -m unittest discover -s tests -v
```

This is not production-ready. Production requires authenticated reporter/reviewer identities, access-controlled and encrypted complaint/evidence storage, a real human review and appeal queue, shared report APIs, durable audit/retention/deletion controls, malware/image scanning, distributed rate limits, CSRF protection for authenticated operations, and security testing. No report is delivered to an authority and no screening result verifies the reported facts or a resolution.
