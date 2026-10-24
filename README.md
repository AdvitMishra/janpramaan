# JanPramaan — Every Voice. Accountable Action.

JanPramaan is an independent civic-reporting prototype focused on Bhopal, Madhya Pradesh. It is not an official government portal. The existing report workflow remains plain HTML, CSS, and JavaScript with browser-local report storage. A small Python server serves the site and exposes an optional advisory Gemma API; it is not a shared report database or authority integration.

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

## Data, privacy, and limitations

- The Python API serves the site and handles optional Gemma analysis only; it is not a shared report backend. There is no secure authentication, shared report database, authority integration, moderator service, or independent evidence-review service.
- Fictional sample records are individually labeled and are examples only—not real Bhopal complaints, statistics, authority actions, or verified outcomes.
- User reports, optional photos, support, and status updates are stored in the current browser's local storage. Anyone with access to that browser profile may see them; they are not sent to other users or authorities. Storage remains until browser data is cleared. Browser storage is not a secure or durable records system.
- A chosen display name is public within the local report view. Pseudonyms are generated locally. Anonymous mode does not store or show a reporter name or email, but does not promise technical untraceability.
- Image re-encoding removes common metadata in ordinary cases but is not a forensic privacy guarantee. Avoid uploading faces, identity documents, student records, or private medical records.
- The prototype cannot create a genuine Verified Resolved outcome. Legacy user records previously marked verified are migrated back to Verification Pending. Only the current explicitly simulated sample records contribute verified demo counts.
- Before/after uploads and their audit labels are stored in local storage, not in secure evidence storage. Image payloads may exceed browser storage quotas; failed saves surface an error and do not pretend to succeed. Before images are never substituted with placeholders; absent evidence is stated explicitly.
- Corrections append to history; duplicate suggestions do not merge records; disputes remain visible. Flags are local only and are not reviewed by a moderator.
- There is no configured retention period or secure deletion service. Clear this browser's site data to remove its stored reports; this also clears other local JanPramaan records.

## Running

Use PowerShell from the project folder. Create and activate a virtual environment, then install the API dependencies:

```powershell
Set-Location 'C:\Users\Advit Mishra\OneDrive\Documents\hackathon-agent'
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Put your Google API key in the ignored local `.env` file as `GOOGLE_API_KEY=your_key` (or set that environment variable in the server process). Do not commit or paste the key into frontend files. Start the combined frontend/API server:

```powershell
python server.py
```

Open `http://127.0.0.1:8765` (not a separate Live Server port or `file://` URL, because the browser request is same-origin). The health endpoint is `http://127.0.0.1:8765/api/health`. Example API call from another PowerShell window:

```powershell
Invoke-RestMethod -Uri 'http://127.0.0.1:8765/api/analyze-issue' -Method Post -ContentType 'application/json' -Body (@{
  title = 'Damaged footpath needs attention'
  description = 'A section of the footpath is broken and difficult to use safely.'
  locality = 'Arera Colony'
} | ConvertTo-Json)
```

If `GOOGLE_API_KEY` is not configured, health still works and analysis returns an explicit configuration error. A successful health check does not imply model access. The current browser-local report store is unchanged; AI requests are not saved as reports.

Run the API checks with:

```powershell
python -m unittest discover -s tests -v
```

For a production deployment, replace browser storage with a protected shared reports backend, add role-based authorization, secure authentication, moderation and appeal workflows, an auditable evidence-review process, an explicit retention policy, and an approved integration before presenting reports to any authority as delivered. The API key enables Google model requests but does not implement secure accounts, private report storage, or independent verification.
