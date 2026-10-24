(function () {
  "use strict";

  const STORAGE_KEY = "janpramaan-demo-records-v1";
  const LEGACY_STORAGE_KEY = "civicpulse-demo-issues-v1";
  const categories = [
    "Education",
    "Healthcare",
    "Transport and traffic",
    "Roads and infrastructure",
    "Essential services",
    "Public administration",
    "Environment and accessibility",
    "Other civic concerns"
  ];
  const categoryTopics = {
    "Education": ["Fee increase or unexplained charge", "School or college infrastructure", "Accessibility", "Service complaint", "Other education concern"],
    "Healthcare": ["Hospital service", "Sanitation", "Access or accessibility", "Waiting-time concern", "Healthcare infrastructure", "Other healthcare concern"],
    "Transport and traffic": ["Congestion", "Road closure or diversion", "Blocked road", "Public transport disruption", "Event or convoy disruption", "Other traffic concern"],
    "Roads and infrastructure": ["Pothole", "Damaged footpath", "Streetlight", "Drainage", "Other infrastructure concern"],
    "Essential services": ["Water", "Electricity", "Waste collection", "Sanitation", "Other essential service"],
    "Public administration": ["Delayed service", "Inaccessible office", "Public-service delivery", "Other administration concern"],
    "Environment and accessibility": ["Pollution", "Unsafe public space", "Accessibility barrier", "Other environment concern"],
    "Other civic concerns": ["Other civic concern"]
  };
  const localities = [
    "Arera Colony", "Bairagarh (Sant Hirdaram Nagar)", "Bhopal city (locality not specified)",
    "Govindpura", "Habibganj", "Kolar Road", "MP Nagar", "New Market", "Old Bhopal",
    "Shahpura", "TT Nagar", "Other Bhopal locality"
  ];
  const statuses = [
    "Reported", "Acknowledged", "In Progress", "Resolution Submitted",
    "Verification Pending", "Verified Resolved", "Resolution Disputed"
  ];
  const statusCodes = Object.fromEntries(statuses.map((status) => [
    status.toLowerCase().replaceAll(" ", "_"),
    status
  ]));
  const transitions = {
    "Reported": ["Acknowledged"],
    "Acknowledged": ["In Progress"],
    "In Progress": ["Resolution Submitted"],
    "Resolution Submitted": ["Verification Pending"],
    "Verification Pending": ["Verified Resolved", "Resolution Disputed"],
    "Resolution Disputed": ["In Progress"],
    "Verified Resolved": []
  };
  const sampleTimestamp = (daysAgo, hoursAgo) => new Date(Date.now() - (daysAgo * 86400000) - (hoursAgo * 3600000)).toISOString();
  const sampleIssues = [
    {
      id: "JP-BPL-DEMO-01", title: "Sample: damaged footpath near a public facility", category: "Roads and infrastructure",
      topic: "Damaged footpath", locality: "TT Nagar", locationText: "TT Nagar; landmark not specified",
      description: "Illustrative report for demonstrating how a footpath concern could be recorded. This is fictional sample data, not a real complaint or verified incident.",
      status: "In Progress", statusCode: "in_progress", supports: 3, createdAt: sampleTimestamp(3, 1), sample: true,
      identityChoice: "anonymous", reporter: "", city: "Bhopal, Madhya Pradesh",
      locationAccuracy: "User-provided locality; not independently verified",
      updates: [
        { status: "Reported", note: "Fictional sample report created to demonstrate the workflow.", at: sampleTimestamp(3, 1), actor: "JanPramaan sample data" },
        { status: "Acknowledged", note: "Illustrative sample status only; no public authority action is represented.", at: sampleTimestamp(3, 0), actor: "JanPramaan sample data" },
        { status: "In Progress", note: "Illustrative sample status only; not evidence that work has begun.", evidence: "No real evidence. Sample record.", at: sampleTimestamp(2, 4), actor: "JanPramaan sample data" }
      ]
    },
    {
      id: "JP-BPL-DEMO-02", title: "Sample: concern about an education fee notice", category: "Education",
      topic: "Fee increase or unexplained charge", locality: "MP Nagar", locationText: "MP Nagar; institution not named",
      description: "Fictional example of a fee-related concern. The reporter's description would be an allegation, not verified evidence. No school, college, or individual is identified.",
      status: "Reported", statusCode: "reported", supports: 1, createdAt: sampleTimestamp(2, 7), sample: true,
      identityChoice: "anonymous", reporter: "", allegation: "Illustrative allegation only; not a factual claim about any institution.",
      city: "Bhopal, Madhya Pradesh", locationAccuracy: "User-provided locality; not independently verified",
      updates: [{ status: "Reported", note: "Fictional sample report. Allegation is not verified evidence.", at: sampleTimestamp(2, 7), actor: "JanPramaan sample data" }]
    },
    {
      id: "JP-BPL-DEMO-03", title: "Sample: waste collection service concern", category: "Essential services",
      topic: "Waste collection", locality: "Arera Colony", locationText: "Arera Colony; no precise address",
      description: "Fictional sample report demonstrating an essential-services concern. No real incident or service failure is asserted.",
      status: "Acknowledged", statusCode: "acknowledged", supports: 2, createdAt: sampleTimestamp(1, 10), sample: true,
      identityChoice: "anonymous", reporter: "", city: "Bhopal, Madhya Pradesh",
      locationAccuracy: "User-provided locality; not independently verified",
      updates: [
        { status: "Reported", note: "Fictional sample report created to demonstrate the workflow.", at: sampleTimestamp(1, 10), actor: "JanPramaan sample data" },
        { status: "Acknowledged", note: "Illustrative sample status only; no authority action is represented.", at: sampleTimestamp(1, 5), actor: "JanPramaan sample data" }
      ]
    },
    {
      id: "JP-BPL-DEMO-04", title: "Sample: traffic disruption report", category: "Transport and traffic",
      topic: "Road closure or diversion", locality: "New Market", locationText: "New Market; illustrative location only",
      description: "Fictional example of a traffic report. No specific event, convoy, official, or institution is alleged to have caused a real disruption.",
      status: "Resolution Submitted", statusCode: "resolution_submitted", supports: 4, createdAt: sampleTimestamp(5, 5), sample: true,
      identityChoice: "anonymous", reporter: "", trafficTime: "Illustrative sample time only",
      trafficImpact: "Fictional example; no real traffic impact is claimed.",
      trafficSource: "", city: "Bhopal, Madhya Pradesh",
      locationAccuracy: "User-provided locality; not independently verified",
      updates: [
        { status: "Reported", note: "Fictional traffic sample; no real disruption is asserted.", at: sampleTimestamp(5, 5), actor: "JanPramaan sample data" },
        { status: "Acknowledged", note: "Illustrative sample status; not an official acknowledgement.", at: sampleTimestamp(5, 4), actor: "JanPramaan sample data" },
        { status: "In Progress", note: "Illustrative sample status only.", at: sampleTimestamp(5, 2), actor: "JanPramaan sample data" },
        { status: "Resolution Submitted", note: "Illustrative claim only; resolution has not been verified.", evidence: "No actual supporting source. Fictional sample.", at: sampleTimestamp(4, 8), actor: "JanPramaan sample data" }
      ]
    },
    {
      id: "JP-BPL-DEMO-05", title: "Sample: resolution awaiting review", category: "Environment and accessibility",
      topic: "Accessibility barrier", locality: "Shahpura", locationText: "Shahpura; illustrative location only",
      description: "Fictional sample illustrating the verification queue. A submitted resolution does not mean the issue is resolved.",
      status: "Verification Pending", statusCode: "verification_pending", supports: 5, createdAt: sampleTimestamp(7, 3), sample: true,
      identityChoice: "anonymous", reporter: "", city: "Bhopal, Madhya Pradesh",
      locationAccuracy: "User-provided locality; not independently verified",
      updates: [
        { status: "Reported", note: "Fictional sample report; no real incident is asserted.", at: sampleTimestamp(7, 3), actor: "JanPramaan sample data" },
        { status: "Acknowledged", note: "Illustrative sample status only.", at: sampleTimestamp(6, 6), actor: "JanPramaan sample data" },
        { status: "In Progress", note: "Illustrative sample status only.", at: sampleTimestamp(5, 6), actor: "JanPramaan sample data" },
        { status: "Resolution Submitted", note: "Fictional resolution claim, pending review.", evidence: "No actual evidence. Fictional sample.", at: sampleTimestamp(2, 8), actor: "JanPramaan sample data" },
        { status: "Verification Pending", note: "Fictional example awaiting a separate review decision.", at: sampleTimestamp(2, 7), actor: "JanPramaan sample data" }
      ]
    },
    {
      id: "JP-BPL-DEMO-06", title: "SAMPLE · drainage repair completion workflow", category: "Roads and infrastructure",
      topic: "Drainage", locality: "Shahpura", locationText: "Shahpura · illustrative locality only",
      description: "Fictional JanPramaan sample demonstrating a resolution submitted with a text evidence reference and a simulated verification decision. This is not a real complaint, photograph, authority action, or verified outcome.",
      status: "Verified Resolved", statusCode: "verified_resolved", supports: 2,
      createdAt: sampleTimestamp(8, 3), sample: true, identityChoice: "anonymous", reporter: "",
      city: "Bhopal, Madhya Pradesh", locationAccuracy: "Illustrative locality only; no verified point",
      resolutionEvidence: {
        before: null,
        after: { reference: "SAMPLE-DEMO-06-AFTER", notes: "Illustrative text evidence reference only; no image is supplied.", submitter: "JanPramaan sample data" },
        notes: "Sample-only resolution submission; not real evidence."
      },
      verificationDecision: { decision: "verified_resolved", criteriaMet: true, simulated: true, note: "Simulated sample decision; no real reviewer or authority verification." },
      updates: [
        { status: "Reported", note: "Fictional sample report for workflow presentation.", at: sampleTimestamp(8, 3), actor: "JanPramaan sample data" },
        { status: "In Progress", note: "Illustrative workflow state only; no real work is represented.", at: sampleTimestamp(5, 2), actor: "JanPramaan sample data" },
        { status: "Resolution Submitted", note: "Sample resolution reference attached for demonstration only.", evidence: "SAMPLE-DEMO-06-AFTER · illustrative text reference only.", at: sampleTimestamp(2, 5), actor: "JanPramaan sample data" },
        { status: "Verified Resolved", note: "Simulated sample verification decision; not a real-world verified outcome.", evidence: "Sample-only resolution reference and simulated criteria.", evidenceState: "SIMULATED SAMPLE · not an authority review", at: sampleTimestamp(2, 4), actor: "JanPramaan sample data" }
      ]
    },
    {
      id: "JP-BPL-DEMO-07", title: "SAMPLE · streetlight repair review demonstration", category: "Roads and infrastructure",
      topic: "Streetlight", locality: "Arera Colony", locationText: "Arera Colony · illustrative locality only",
      description: "Fictional sample showing a completed maintenance workflow. All evidence and verification information on this record is simulated and does not describe real public activity.",
      status: "Verified Resolved", statusCode: "verified_resolved", supports: 4,
      createdAt: sampleTimestamp(12, 1), sample: true, identityChoice: "anonymous", reporter: "",
      city: "Bhopal, Madhya Pradesh", locationAccuracy: "Illustrative locality only; no verified point",
      resolutionEvidence: {
        before: null,
        after: { reference: "SAMPLE-DEMO-07-AFTER", notes: "Illustrative sample evidence reference; no photograph or real location.", submitter: "JanPramaan sample data" },
        notes: "Sample-only resolution submission; no real action is asserted."
      },
      verificationDecision: { decision: "verified_resolved", criteriaMet: true, simulated: true, note: "Simulated sample decision; no real reviewer or authority verification." },
      updates: [
        { status: "Reported", note: "Fictional sample report for demonstration.", at: sampleTimestamp(12, 1), actor: "JanPramaan sample data" },
        { status: "In Progress", note: "Illustrative workflow state only.", at: sampleTimestamp(8, 2), actor: "JanPramaan sample data" },
        { status: "Resolution Submitted", note: "A sample-only evidence reference was submitted.", evidence: "SAMPLE-DEMO-07-AFTER · illustrative text reference only.", at: sampleTimestamp(4, 6), actor: "JanPramaan sample data" },
        { status: "Verified Resolved", note: "Simulated sample verification; not evidence of a real repair.", evidence: "Sample-only resolution reference and simulated criteria.", evidenceState: "SIMULATED SAMPLE · not an authority review", at: sampleTimestamp(4, 5), actor: "JanPramaan sample data" }
      ]
    },
    {
      id: "JP-BPL-DEMO-08", title: "SAMPLE · footpath accessibility improvement example", category: "Environment and accessibility",
      topic: "Accessibility barrier", locality: "TT Nagar", locationText: "TT Nagar · illustrative locality only",
      description: "Fictional sample of an accessibility concern moving through a demo resolution workflow. It is not a real complaint, verified improvement, or public authority outcome.",
      status: "Verified Resolved", statusCode: "verified_resolved", supports: 3,
      createdAt: sampleTimestamp(16, 4), sample: true, identityChoice: "anonymous", reporter: "",
      city: "Bhopal, Madhya Pradesh", locationAccuracy: "Illustrative locality only; no verified point",
      resolutionEvidence: {
        before: null,
        after: { reference: "SAMPLE-DEMO-08-AFTER", notes: "Illustrative sample evidence reference; no photograph supplied.", submitter: "JanPramaan sample data" },
        notes: "Sample-only resolution; no real-world evidence is represented."
      },
      verificationDecision: { decision: "verified_resolved", criteriaMet: true, simulated: true, note: "Simulated sample decision; no real reviewer or authority verification." },
      updates: [
        { status: "Reported", note: "Fictional sample report for demonstration.", at: sampleTimestamp(16, 4), actor: "JanPramaan sample data" },
        { status: "In Progress", note: "Illustrative workflow state only.", at: sampleTimestamp(11, 7), actor: "JanPramaan sample data" },
        { status: "Resolution Submitted", note: "Sample-only resolution evidence reference submitted.", evidence: "SAMPLE-DEMO-08-AFTER · illustrative text reference only.", at: sampleTimestamp(6, 2), actor: "JanPramaan sample data" },
        { status: "Verified Resolved", note: "Simulated sample verification; no real-world verification occurred.", evidence: "Sample-only resolution reference and simulated criteria.", evidenceState: "SIMULATED SAMPLE · not an authority review", at: sampleTimestamp(6, 1), actor: "JanPramaan sample data" }
      ]
    }
  ];

  let storageReadError = false;
  let storageMigrationError = false;
  let issues = loadIssues();
  let page = "dashboard";
  let selectedId = null;
  let reportSubmittedId = null;
  let pendingReportValues = null;
  let pendingPhoto = "";
  let pendingBeforeEvidence = "";
  let pendingResolutionBefore = "";
  let pendingResolutionAfter = "";
  let photoProcessing = false;
  let imageProcessingCount = 0;
  let authorityMode = false;
  let reviewerMode = false;
  let searchTerm = "";
  let categoryFilter = "all";
  let statusFilter = "all";
  let sortBy = "recent";
  let quickFilter = "all";
  let localityFilter = "all";
  let localityCategoryFilter = "all";
  let localityStatusFilter = "all";
  let localitySearchTerm = "";

  const app = document.getElementById("app");
  const currentBreadcrumb = document.getElementById("breadcrumb-current");
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const safeImageSource = (value) => typeof value === "string"
    && /^data:image\/(?:webp|png|jpeg);base64,[a-z0-9+/]+={0,2}$/i.test(value)
    ? value
    : "";
  const icon = (name) => {
    const paths = {
      pin: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
      clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
      heart: '<path d="M20.8 8.8c0 5.2-8.8 10-8.8 10S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6Z"/>',
      search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.2 4.2"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
      arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
      upload: '<path d="M12 16V4m0 0L7 9m5-5 5 5"/><path d="M4 16v4h16v-4"/>',
      list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
      checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
      shield: '<path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/>',
      close: '<path d="m18 6-12 12M6 6l12 12"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name] || ""}</svg>`;
  };

  function loadIssues() {
    try {
      const currentStore = localStorage.getItem(STORAGE_KEY);
      const legacyStore = currentStore ? null : localStorage.getItem(LEGACY_STORAGE_KEY);
      const stored = currentStore || legacyStore;
      const loadedLegacyStore = Boolean(legacyStore);
      if (!stored) return structuredClone(sampleIssues);
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) throw new Error("Saved JanPramaan records were not a list.");

      const userReports = parsed.filter((issue) => !issue.sample).map(migrateIssue);
      const savedSamples = new Map(parsed.filter((issue) => issue.sample).map((issue) => [issue.id, issue]));
      const needsVerificationMigration = parsed.some((issue) => {
        const hasVerifiedState = statusCodeFor(issue.status) === "verified_resolved"
          || (issue.updates || []).some((update) => statusCodeFor(update.status) === "verified_resolved");
        const isCurrentSimulatedSample = issue.sample
          && statusCodeFor(issue.status) === "verified_resolved"
          && issue.verificationDecision?.simulated === true
          && issue.verificationDecision?.criteriaMet === true
          && Boolean(issue.resolutionEvidence?.after?.reference || issue.resolutionEvidence?.after?.dataUrl);
        return hasVerifiedState && !isCurrentSimulatedSample;
      });
      const currentSamples = structuredClone(sampleIssues).map((sample) => {
        const saved = savedSamples.get(sample.id);
        if (!saved) return sample;
        const merged = { ...sample, ...saved, sample: true };
        const hasVerifiedState = statusCodeFor(merged.status) === "verified_resolved"
          || (merged.updates || []).some((update) => statusCodeFor(update.status) === "verified_resolved");
        const isCurrentSimulatedSample = statusCodeFor(merged.status) === "verified_resolved"
          && merged.verificationDecision?.simulated === true
          && merged.verificationDecision?.criteriaMet === true
          && Boolean(merged.resolutionEvidence?.after?.reference || merged.resolutionEvidence?.after?.dataUrl);
        const hasLegacyVerifiedState = hasVerifiedState && !isCurrentSimulatedSample;
        if (hasLegacyVerifiedState) {
          merged.status = "Verification Pending";
          merged.updates = (merged.updates || []).map((update) => statusCodeFor(update.status) === "verified_resolved" ? {
            ...update,
            status: "Verification Pending",
            note: "A previous simulated sample review is not independent verification; this sample outcome is not confirmed."
          } : update);
          merged.updates.push({
            status: "Verification Pending",
            note: "A previous sample status was not a real verified outcome and has been returned to the verification queue.",
            at: new Date().toISOString(),
            actor: "JanPramaan sample migration"
          });
          delete merged.verificationDecision;
        }
        return merged;
      });
      const mergedIssues = [...userReports, ...currentSamples];
      if (needsVerificationMigration || loadedLegacyStore) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedIssues));
        } catch (error) {
          console.error("Could not persist JanPramaan record migration; records remain loaded for this session and the original browser data is retained.", error);
          storageMigrationError = true;
        }
      }
      return mergedIssues.map((issue) => ({ ...issue, statusCode: statusCodeFor(issue.status) }));
    } catch (error) {
      console.error("Could not read JanPramaan browser data.", error);
      storageReadError = true;
      return structuredClone(sampleIssues);
    }
  }

  function migrateIssue(issue) {
    const statusAliases = {
      "Open": "Reported",
      "Verified Resolved": "Verified Resolved",
      "Resolution Submitted": "Resolution Submitted"
    };
    const migrated = { ...issue };
    const previouslyMarkedVerified = statusCodeFor(migrated.status) === "verified_resolved";
    migrated.status = previouslyMarkedVerified ? "Verification Pending" : statusAliases[migrated.status] || statusLabel(migrated.status);
    migrated.statusCode = statusCodeFor(migrated.status);
    const legacyCategories = {
      "Pothole": ["Roads and infrastructure", "Pothole"],
      "Garbage": ["Essential services", "Waste collection"],
      "Streetlight": ["Roads and infrastructure", "Streetlight"],
      "Drainage": ["Roads and infrastructure", "Drainage"],
      "Public infrastructure": ["Roads and infrastructure", "Other infrastructure concern"],
      "Other": ["Other civic concerns", "Other civic concern"]
    };
    const mappedCategory = legacyCategories[migrated.category];
    if (mappedCategory) {
      migrated.category = mappedCategory[0];
      migrated.topic = mappedCategory[1];
    } else {
      migrated.category = categories.includes(migrated.category) ? migrated.category : "Other civic concerns";
      migrated.topic = migrated.topic || migrated.category;
    }
    const originalLocality = migrated.locality;
    migrated.city = migrated.city || (localities.includes(originalLocality) ? "Bhopal, Madhya Pradesh" : "City not verified");
    migrated.locality = originalLocality || "Location not specified";
    migrated.locationText = migrated.locationText || originalLocality || "";
    migrated.locationAccuracy = migrated.locationAccuracy || "Legacy prototype location; locality and city not independently verified";
    migrated.identityChoice = migrated.identityChoice || "display-name";
    migrated.updates = (migrated.updates || []).map((update) => ({
      ...update,
      status: statusCodeFor(update.status) === "verified_resolved" ? "Verification Pending" : statusAliases[update.status] || update.status,
      actor: update.actor || (migrated.reporter ? "Reporter (display name selected)" : "Anonymous reporter")
    }));
    if (previouslyMarkedVerified) {
      delete migrated.verificationDecision;
      const at = new Date().toISOString();
      migrated.updates.push({
        status: "Verification Pending",
        note: "Previous prototype confirmation was not an independent review. The status was moved back to Verification Pending.",
        at,
        actor: "JanPramaan status migration"
      });
    }
    if (migrated.identityChoice === "anonymous") migrated.reporter = "";
    return migrated;
  }

  function commitIssues(nextIssues, successMessage) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIssues));
      issues = nextIssues;
      if (successMessage) toast(successMessage);
      return true;
    } catch (error) {
      console.error("Could not save JanPramaan browser data.", error);
      toast("This update was not saved. Browser storage may be unavailable or full; your previous report data was kept.");
      return false;
    }
  }

  function toast(message) {
    const region = document.getElementById("toast-region");
    const item = document.createElement("div");
    item.className = "toast";
    item.textContent = message;
    region.appendChild(item);
    window.setTimeout(() => item.remove(), 4200);
  }

  function relativeAge(iso) {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(iso));
  }

  function scrollBehavior() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }

  function categoryClass(category) {
    return `category-${categories.indexOf(category)}`;
  }

  function statusClass(status) {
    return `status-${statusCodeFor(status).replaceAll("_", "-")}`;
  }

  function statusCodeFor(status) {
    const normalized = String(status || "").toLowerCase().replaceAll(" ", "_");
    return statusCodes[normalized] ? normalized : "reported";
  }

  function statusLabel(status) {
    return statusCodes[statusCodeFor(status)] || "Reported";
  }

  function statusPill(status) {
    return `<span class="status-pill ${statusClass(status)}">${escapeHtml(statusLabel(status))}</span>`;
  }

  function sourceLabel(issue) {
    return issue.sample ? "SAMPLE · demo data" : "User-submitted · browser only";
  }

  function isPubliclyVisible(issue) {
    return issue.sample === true || issue.screeningStatus === "approved_for_publication";
  }

  function publicReports() {
    return issues.filter(isPubliclyVisible);
  }

  function screeningStatusLabel(status) {
    const labels = {
      draft: "Draft",
      screening: "Screening",
      needs_clarification: "Needs clarification",
      pending_review: "Pending review",
      approved_for_publication: "Approved for this local dashboard",
      held_for_moderation: "Held for human review",
      rejected_out_of_scope: "Rejected as out of scope"
    };
    return labels[status] || "Screening not completed";
  }

  function screeningPanelMarkup(issue) {
    if (!issue.screening) {
      const message = issue.sample
        ? "This fictional sample record was not screened and is included only to demonstrate the report interface."
        : "This older browser record has no screening record and is not listed on the public dashboard. The local prototype has no connected reviewer.";
      return `<article class="content-card screening-panel"><h2 class="section-title">AI screening</h2><p>${escapeHtml(message)}</p></article>`;
    }
    const assessment = issue.screening.assessment || {};
    const missing = Array.isArray(assessment.missing_information) && assessment.missing_information.length
      ? `<ul>${assessment.missing_information.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "<p>No missing information was identified by the preliminary screen.</p>";
    return `<article class="content-card screening-panel" aria-labelledby="screening-title"><p class="eyebrow">AI-assisted · preliminary · not a human decision</p><h2 class="section-title" id="screening-title">Screening status: ${escapeHtml(screeningStatusLabel(issue.screeningStatus))}</h2><div class="screening-grid"><div><strong>Civic relevance</strong><p>${escapeHtml(assessment.civic_relevance || "Not assessed")}</p></div><div><strong>Evidence status</strong><p>${escapeHtml(assessment.evidence_status || "Not assessed")} · ${escapeHtml(assessment.evidence_consistency || "not assessed")} consistency</p></div><div><strong>Human review</strong><p>${issue.screening.human_review_required ? "Required before publication; no reviewer is connected in this prototype." : "Not required by the local screening policy; no human review is recorded."}</p></div></div><strong>Missing information</strong>${missing}<strong>Screening explanation</strong><p>${escapeHtml(issue.screening.explanation || assessment.explanation || "No explanation provided.")}</p><p class="field-hint">${escapeHtml(issue.screening.evidence_note || "Evidence is user-submitted and not independently verified.")} Screening cannot establish truth, identity, location, or resolution. No authority action is implied.</p>${["needs_clarification", "pending_review", "held_for_moderation", "rejected_out_of_scope"].includes(issue.screeningStatus) ? `<form id="screening-correction-form" data-complaint-id="${escapeHtml(issue.screening.complaint_id || "")}"><div class="field"><label for="screening-correction">Add information or request a review</label><textarea id="screening-correction" maxlength="2000" minlength="10" required placeholder="Add relevant context or explain why you are requesting a review."></textarea></div><button class="button button-secondary" type="submit">Submit correction or appeal</button><p class="field-hint">Your private receipt is stored in this browser. This local prototype has no account system; anyone with access to this browser profile may access it.</p></form>` : ""}</article>`;
  }

  function isVerifiedResolvedRecord(issue) {
    const decision = issue.verificationDecision;
    const after = issue.resolutionEvidence?.after;
    const hasResolutionEvidence = Boolean(after?.dataUrl || after?.reference);
    const hasDecision = ["verified_resolved", "Verified Resolved"].includes(decision?.decision)
      && decision.criteriaMet === true;
    if (issue.statusCode !== "verified_resolved" || !hasResolutionEvidence || !hasDecision) return false;
    return issue.sample === true && decision.simulated === true;
  }

  function issueRow(issue) {
    return `<tr data-open-issue="${escapeHtml(issue.id)}" tabindex="0" aria-label="Open ${escapeHtml(issue.title)}">
      <td><div class="issue-title">${escapeHtml(issue.title)}</div><div class="issue-ref">${escapeHtml(issue.id)} · ${escapeHtml(sourceLabel(issue))}</div></td>
      <td><span class="category-pill"><span class="category-dot ${categoryClass(issue.category)}"></span>${escapeHtml(issue.category)}</span><small class="topic-cell">${escapeHtml(issue.topic || "")}</small></td>
      <td>${escapeHtml(issue.locality)}</td>
      <td>${statusPill(issue.status)}</td>
      <td>${relativeAge(issue.createdAt)}</td>
      <td><button class="support-inline" type="button" data-support-id="${escapeHtml(issue.id)}" aria-label="Support ${escapeHtml(issue.title)}; ${issue.supports} supporters">${icon("heart")}<span>${issue.supports}</span></button></td>
    </tr>`;
  }

  function metricIssues(key) {
    const visible = publicReports();
    if (key === "all") return visible;
    if (key === "open") return visible.filter((issue) => ["reported", "acknowledged"].includes(issue.statusCode));
    if (key === "progress") return visible.filter((issue) => ["in_progress", "resolution_submitted", "verification_pending"].includes(issue.statusCode));
    if (key === "verified") return visible.filter(isVerifiedResolvedRecord);
    return visible;
  }

  function getFilteredIssues() {
    const query = searchTerm.trim().toLowerCase();
    const filtered = publicReports().filter((issue) => {
      const matchesSearch = !query || [issue.title, issue.description, issue.locality, issue.locationText, issue.id, issue.category, issue.topic].some((value) => String(value || "").toLowerCase().includes(query));
      const metricMatch = quickFilter === "all" || metricIssues(quickFilter).some((candidate) => candidate.id === issue.id);
      return matchesSearch && metricMatch
        && (categoryFilter === "all" || issue.category === categoryFilter)
        && (statusFilter === "all" || issue.statusCode === statusCodeFor(statusFilter))
        && (localityFilter === "all" || issue.locality === localityFilter);
    });
    return filtered.sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "support") return b.supports - a.supports;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  function dashboardPage() {
    const visibleReports = publicReports();
    const openCount = metricIssues("open").length;
    const progressCount = metricIssues("progress").length;
    const verifiedCount = metricIssues("verified").length;
    const simulatedVerifiedCount = visibleReports.filter((issue) => issue.sample && isVerifiedResolvedRecord(issue)).length;
    const hasFilter = quickFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all" || localityFilter !== "all" || searchTerm;
    return `<section class="page-heading">
      <div><p class="eyebrow">Bhopal, Madhya Pradesh · जनप्रमाण</p><h1>Every Voice. Accountable Action.</h1><p class="page-subtitle">JanPramaan helps Bhopal communities report civic concerns, follow every update, and distinguish submitted claims from simulated demo outcomes.</p></div>
      <button class="button button-primary" type="button" data-page="report">${icon("list")} Report an issue</button>
    </section>
    <div class="sample-note">${icon("info")}<span><strong>Prototype, not a government portal.</strong> SAMPLE · demo records are fictional. New reports stay in this browser and are not sent to Bhopal authorities. Sample verification counts are simulated for demonstration only; no authority system is connected.</span></div>
    <section class="metrics" aria-label="JanPramaan report totals">
      <button class="metric-card ${quickFilter === "all" ? "metric-selected" : ""}" type="button" data-metric="all" aria-pressed="${quickFilter === "all"}" aria-label="Total reports: ${visibleReports.length}"><span class="metric-top"><span>Total reports</span><span class="metric-icon">${icon("list")}</span></span><span class="metric-value" data-count-target="${visibleReports.length}" aria-hidden="true">${visibleReports.length}</span><span class="metric-caption">Labeled samples + screened local submissions</span></button>
      <button class="metric-card ${quickFilter === "open" ? "metric-selected" : ""}" type="button" data-metric="open" aria-pressed="${quickFilter === "open"}" aria-label="Open issues: ${openCount}"><span class="metric-top"><span>Open issues</span><span class="metric-icon">${icon("clock")}</span></span><span class="metric-value" data-count-target="${openCount}" aria-hidden="true">${openCount}</span><span class="metric-caption">Reported or acknowledged</span></button>
      <button class="metric-card ${quickFilter === "progress" ? "metric-selected" : ""}" type="button" data-metric="progress" aria-pressed="${quickFilter === "progress"}" aria-label="In progress: ${progressCount}"><span class="metric-top"><span>In progress</span><span class="metric-icon">${icon("arrow")}</span></span><span class="metric-value" data-count-target="${progressCount}" aria-hidden="true">${progressCount}</span><span class="metric-caption">Work claimed or under review</span></button>
      <button class="metric-card ${quickFilter === "verified" ? "metric-selected" : ""}" type="button" data-metric="verified" aria-pressed="${quickFilter === "verified"}" aria-label="Verified resolved: ${verifiedCount}, including ${simulatedVerifiedCount} simulated sample outcomes and ${Math.max(0, verifiedCount - simulatedVerifiedCount)} real review records"><span class="metric-top"><span>Verified resolved</span><span class="metric-icon">${icon("checkCircle")}</span></span><span class="metric-value" data-count-target="${verifiedCount}" aria-hidden="true">${verifiedCount}</span><span class="metric-caption">${simulatedVerifiedCount} simulated sample outcome(s) · none authority verified</span></button>
    </section>
    <section class="content-card list-card" aria-label="Bhopal civic reports">
      <div class="list-card-head"><div><h2 class="section-title">Community reports</h2><p class="section-caption">Select a report for its source, location confidence, evidence, and attributed status history.</p></div>
        <div class="list-controls">
          <label class="search-box">${icon("search")}<input id="issue-search" type="search" placeholder="Search reports..." aria-label="Search reports" value="${escapeHtml(searchTerm)}"></label>
          <select id="category-filter" class="control-select" aria-label="Filter by category"><option value="all">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category)}" ${categoryFilter === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select>
          <select id="status-filter" class="control-select" aria-label="Filter by status"><option value="all">All statuses</option>${statuses.map((status) => `<option value="${escapeHtml(status)}" ${statusFilter === status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select>
          <select id="sort-filter" class="control-select" aria-label="Sort reports"><option value="recent" ${sortBy === "recent" ? "selected" : ""}>Most recent</option><option value="oldest" ${sortBy === "oldest" ? "selected" : ""}>Oldest first</option><option value="support" ${sortBy === "support" ? "selected" : ""}>Most supported</option></select>
        </div>
      </div>
      ${hasFilter ? `<div class="active-filter"><span>Filtered reports: ${getFilteredIssues().length}</span><button id="clear-filters" class="text-button" type="button">Clear all filters</button></div>` : ""}
      <div id="issue-table-wrap" class="table-wrap">${tableMarkup()}</div>
    </section>`;
  }

  function tableMarkup() {
    const filtered = getFilteredIssues();
    if (!filtered.length) return `<div class="empty-state">${icon("search")}<strong>No reports match these filters.</strong><span>Try another locality, category, status, or search term.</span><button class="button button-secondary" type="button" id="empty-clear">Clear filters</button></div>`;
    return `<table class="issue-table"><thead><tr><th>Report</th><th>Category / topic</th><th>Locality</th><th>Status</th><th>Reported</th><th>Support</th></tr></thead><tbody>${filtered.map(issueRow).join("")}</tbody></table>`;
  }

  function localityPage() {
    const bhopalIssues = publicReports().filter((issue) => issue.city === "Bhopal, Madhya Pradesh");
    const foundLocalities = new Set(bhopalIssues.map((issue) => issue.locality));
    const localityOptions = [...new Set([...localities, ...foundLocalities])].sort();
    const query = localitySearchTerm.trim().toLowerCase();
    const selected = query
      ? bhopalIssues.filter((issue) => [issue.title, issue.description, issue.locality, issue.locationText, issue.id, issue.category, issue.topic].some((value) => String(value || "").toLowerCase().includes(query)))
      : bhopalIssues;
    const relevant = selected.filter((issue) => (localityFilter === "all" || issue.locality === localityFilter)
      && (localityCategoryFilter === "all" || issue.category === localityCategoryFilter)
      && (localityStatusFilter === "all" || issue.statusCode === statusCodeFor(localityStatusFilter)));
    const localityCounts = localityOptions.map((locality) => ({
      locality,
      all: bhopalIssues.filter((issue) => issue.locality === locality).length,
      visible: relevant.filter((issue) => issue.locality === locality).length,
      active: relevant.filter((issue) => issue.locality === locality && !isVerifiedResolvedRecord(issue)).length
    }));
    return `<section class="page-heading"><div><p class="eyebrow">Bhopal · Madhya Pradesh</p><h1>Explore by locality</h1><p class="page-subtitle">Browse civic reports by neighborhood, category, and status. Locations are provided by reporters and are not independently verified.</p></div><button class="button button-primary" type="button" data-page="report">${icon("list")} Report an issue</button></section>
      <div class="sample-note">${icon("info")}<span><strong>Report source disclosure.</strong> Locality counts include clearly labeled fictional samples and browser-only submissions; they are not real civic activity totals. Location text is provided by reporters and is not independently verified. No authority system is connected.</span></div>
      <div class="locality-controls content-card"><div class="field"><label for="locality-select">Choose a Bhopal locality</label><select id="locality-select"><option value="all" ${localityFilter === "all" ? "selected" : ""}>All localities</option>${localityOptions.map((locality) => `<option value="${escapeHtml(locality)}" ${localityFilter === locality ? "selected" : ""}>${escapeHtml(locality)}</option>`).join("")}</select></div><div class="field"><label for="locality-category">Filter by category</label><select id="locality-category"><option value="all">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category)}" ${localityCategoryFilter === category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}</select></div><div class="field"><label for="locality-status-filter">Filter by status</label><select id="locality-status-filter"><option value="all">All statuses</option>${statuses.map((status) => `<option value="${escapeHtml(status)}" ${localityStatusFilter === status ? "selected" : ""}>${escapeHtml(status)}</option>`).join("")}</select></div><form class="field locality-search-form" id="locality-search-form"><label for="locality-search">Search reports</label><div class="locality-search-row"><input id="locality-search" type="search" placeholder="Search title, topic, locality..." value="${escapeHtml(localitySearchTerm)}"><button class="button button-secondary" type="submit">Search</button></div></form><div class="locality-filter-actions"><button class="button button-secondary" id="clear-locality-filters" type="button">Clear locality filters</button></div></div>
      <section class="locality-grid" aria-label="Report counts by Bhopal locality">${localityCounts.map((item) => `<button class="content-card locality-card ${localityFilter === item.locality ? "locality-selected" : ""}" type="button" data-locality="${escapeHtml(item.locality)}" aria-pressed="${localityFilter === item.locality}"><span class="locality-count">${item.visible} ${item.visible === 1 ? "report" : "reports"}</span><h3>${escapeHtml(item.locality)}</h3><p>${item.active} not verified resolved · ${item.all ? `${item.all} total report(s)` : "No reports yet"}</p>${item.visible ? `<span class="density-bar"><i style="width:${Math.min(100, item.visible * 20)}%"></i></span>` : ""}</button>`).join("")}</section>
      <section class="content-card locality-reports"><div class="list-card-head"><div><h2 class="section-title">${localityFilter === "all" ? "Reports across Bhopal localities" : `Reports in ${escapeHtml(localityFilter)}`}</h2><p class="section-caption">${relevant.length} reports · filter is based on reporter-selected locality and selected filters</p></div><button class="button button-secondary" id="view-report-list" type="button">View report list</button></div>
      <div class="table-wrap">${relevant.length ? `<table class="issue-table"><thead><tr><th>Report</th><th>Category / topic</th><th>Locality</th><th>Status</th><th>Reported</th><th>Support</th></tr></thead><tbody>${relevant.map(issueRow).join("")}</tbody></table>` : `<div class="empty-state"><strong>No reports for this locality and category yet.</strong><span>Change your selection or report a concern.</span></div>`}</div></section>`;
  }

  function trustPage() {
    const sampleCount = issues.filter((issue) => issue.sample).length;
    const submittedCount = issues.length - sampleCount;
    const approvedCount = publicReports().filter((issue) => !issue.sample).length;
    const heldCount = issues.filter((issue) => !issue.sample && !isPubliclyVisible(issue)).length;
    const simulatedVerifiedCount = issues.filter((issue) => issue.sample && isVerifiedResolvedRecord(issue)).length;
    const realVerifiedCount = issues.filter((issue) => !issue.sample && isVerifiedResolvedRecord(issue)).length;
    return `<section class="page-heading"><div><p class="eyebrow">Accountability by design</p><h1>Trust & transparency</h1><p class="page-subtitle">Understand where information comes from, who can see it, and what JanPramaan does not claim.</p></div></section>
      <div class="trust-status-grid">
        <article class="content-card trust-status"><span class="trust-icon">${icon("info")}</span><div><strong>Authority connection</strong><p>Not connected. A browser submission is not delivered to a Bhopal government department.</p></div><span class="trust-tag">No integration</span></article>
        <article class="content-card trust-status"><span class="trust-icon">${icon("list")}</span><div><strong>Current record sources</strong><p>${sampleCount} labeled fictional sample(s); ${submittedCount} browser-only user submission(s).</p></div><span class="trust-tag">Local browser</span></article>
        <article class="content-card trust-status"><span class="trust-icon">${icon("pin")}</span><div><strong>Location confidence</strong><p>Locality and location text are user provided; this prototype does not independently verify addresses.</p></div><span class="trust-tag">Unverified</span></article>
        <article class="content-card trust-status"><span class="trust-icon">${icon("shield")}</span><div><strong>Verification records</strong><p>${simulatedVerifiedCount} simulated sample outcome(s); ${realVerifiedCount} authenticated real outcome(s).</p></div><span class="trust-tag">No authority review</span></article>
      </div>
      <div class="trust-columns">
        <article class="content-card trust-card"><h2 class="section-title">Report lifecycle & verification</h2><ul class="trust-list"><li><strong>Reported:</strong> a user-submitted concern; it is not independently confirmed.</li><li><strong>Acknowledged / In Progress:</strong> demo operator notes only; no authority action is asserted.</li><li><strong>Resolution Submitted:</strong> an operator claim with separate before/after evidence fields; evidence remains submitted, not reviewed.</li><li><strong>Verification Pending:</strong> the claim awaits an eligible reviewer. This frontend-only prototype cannot authenticate reviewer eligibility.</li><li><strong>Verified Resolved:</strong> the canonical status, resolution evidence reference, decision criteria and recorded decision must all be present. The current counted records are explicitly simulated samples, not genuine verified outcomes.</li><li><strong>Resolution Disputed:</strong> a concern was raised; the record is not treated as resolved.</li></ul><p>Simulated sample decisions do not display reviewer names or verification timestamps. Such details appear only when provided by a real authorized data source.</p></article>
        <article class="content-card trust-card"><h2 class="section-title">Source, location & evidence</h2><p>Each report is labeled <strong>SAMPLE · demo data</strong> or <strong>User-submitted · local browser record</strong>. Location is reporter-provided and unverified. Uploaded images are not inspected by the screening model and any report with an image is held for a human review that this prototype cannot perform.</p><p><strong>Current local records:</strong> ${sampleCount} fictional workflow samples, ${submittedCount} user submissions, ${approvedCount} eligible for this local dashboard, and ${heldCount} not listed publicly. There are no external report records or government services. JanPramaan is independent and is not an official government portal.</p><p>Education fee reports are allegations. Traffic reports may record time, impact and a supporting source. A report is not evidence of who caused a disruption. Missing photos do not automatically make a complaint false.</p></article>
        <article class="content-card trust-card"><h2 class="section-title">Identity & privacy</h2><p>There are no secure accounts or shared report database. Reports and uploaded photos stay in this browser's local storage and remain accessible to anyone using the same browser profile until browser data is cleared. There is no automatic retention schedule, backup, access control, or secure deletion service. The optional Gemma API receives only the title, description, and locality after you request an analysis; Google may process these under the applicable API terms.</p><p>Only a chosen public display name is saved when you select it. Pseudonyms are generated locally. Anonymous mode does not collect or display a name or email, but cannot promise technical untraceability: browser and network providers may keep their own records. Do not include identifying details in report text or photos, especially in optional AI requests.</p><p>Photo processing re-encodes images in the browser to remove common embedded metadata; this is best-effort, not a forensic privacy guarantee. Do not upload faces, identity documents, or private medical records.</p><button class="button button-secondary" type="button" id="account-info">Account sign-in prototype</button><p class="fine-print">No credentials are requested or stored. Secure account management is not connected.</p></article>
        <article class="content-card trust-card"><h2 class="section-title">AI-assisted complaint screening</h2><p>New submissions are screened by the local Ollama model <strong>hackathon-agent</strong> and validated by server-side rules. The preliminary result is not a fact check, human moderation, or resolution verification. Only reports passing the local policy appear on the dashboard; held, unclear, and out-of-scope submissions remain in the reporter's local submissions view.</p><p>The local service stores complaint text and screening records separately in SQLite on this computer. It does not store uploaded image bytes or publish reports to other users. This prototype has no accounts, reviewer console, encrypted private storage, remote moderation, or access-controlled hosting. A reviewer required by the policy cannot act here, so held reports remain held.</p><p>Corrections and appeals are tied to a private receipt kept in this browser. Repeated identical text is held for review. Rate limits are local and in-memory; they are not production abuse protection.</p></article>
      </div>`;
  }

  function reportPage() {
    if (reportSubmittedId) return confirmationPage();
    return `<section class="page-heading"><div><p class="eyebrow">Bhopal, Madhya Pradesh</p><h1>Report a civic concern</h1><p class="page-subtitle">Share only the details needed to understand the issue. Choose how your public attribution should appear.</p></div></section>
      <div class="sample-note"><span><strong>Local screening prototype:</strong> Before saving, the title, description, selected category, locality and written evidence context are sent to the Ollama service on this computer. Uploaded images are checked for type and size but are not sent to the model. Screening is preliminary, not human moderation. Reports passing the local policy appear only on this browser's dashboard; there is no shared service or authority connection.</span></div>
      <div class="form-layout"><form id="report-form" class="content-card form-panel" novalidate>
        <h2 class="form-section-heading">Report details</h2><div id="duplicate-message"></div><div id="form-error-summary" class="form-error-summary" tabindex="-1" role="alert" hidden></div>
        <div class="field" data-field="title"><label for="report-title">Short title</label><input id="report-title" name="title" maxlength="100" placeholder="Describe the concern, not who you blame" required aria-describedby="title-error"><p class="field-error" id="title-error">Enter a clear title between 8 and 100 characters.</p></div>
        <div class="field" data-field="description"><label for="report-description">What happened?</label><textarea id="report-description" name="description" maxlength="1500" placeholder="Describe the issue, observed impact, and useful context. Avoid unsupported accusations or personal details." required aria-describedby="description-error"></textarea><p class="field-error" id="description-error">Add at least 20 characters describing the concern.</p></div>
        <div class="field" data-field="category"><label for="report-category">Category</label><select id="report-category" name="category" required aria-describedby="category-error"><option value="">Choose a category</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}</select><p class="field-error" id="category-error">Choose the category that best fits.</p></div>
        <div class="field" data-field="topic"><label for="report-topic">Issue type</label><select id="report-topic" name="topic" required aria-describedby="topic-error"><option value="">Choose a category first</option></select><p class="field-error" id="topic-error">Choose the issue type that best fits.</p></div>
        <div id="fee-fields" class="conditional-fields" hidden><div class="field" data-field="allegation"><label for="report-allegation">Describe the fee concern as an allegation</label><textarea id="report-allegation" maxlength="800" placeholder="What charge changed, when, and what explanation was provided? Do not name students or share private account details."></textarea><p class="field-hint">A report is the reporter's allegation, not verified evidence. Do not identify a school or person without reliable documentation.</p><p class="field-error" id="allegation-error">Describe the concern without personal or unsupported identifying claims.</p></div><div class="field"><label for="fee-evidence">Supporting source or evidence description <span class="optional">(optional)</span></label><input id="fee-evidence" maxlength="250" placeholder="For example, a public notice (do not upload student records)"></div></div>
        <div id="traffic-fields" class="conditional-fields" hidden><div class="field" data-field="traffic-time"><label for="traffic-time">When did it occur?</label><input id="traffic-time" type="datetime-local"><p class="field-error" id="traffic-time-error">Add the approximate time or mark it unknown.</p><label class="check-field"><input id="traffic-time-unknown" type="checkbox"> Time unknown</label></div><div class="field" data-field="traffic-impact"><label for="traffic-impact">Reported impact</label><textarea id="traffic-impact" maxlength="500" placeholder="Describe observed delay, access issue, or diversion; avoid guessing the cause."></textarea><p class="field-error" id="traffic-impact-error">Describe the reported impact.</p></div><div class="field"><label for="traffic-source">Available supporting source <span class="optional">(optional)</span></label><input id="traffic-source" maxlength="250" placeholder="Public advisory, transit notice, or other source; do not speculate about individuals"></div></div>
        <div class="field" data-field="location"><label for="report-location">Bhopal locality</label><select id="report-location" name="location" required aria-describedby="location-error"><option value="">Choose a locality</option>${localities.map((locality) => `<option value="${escapeHtml(locality)}">${escapeHtml(locality)}</option>`).join("")}<option value="__manual">Enter locality manually</option></select><p class="field-error" id="location-error">Choose a locality or enter one manually below.</p></div>
        <div class="field" data-field="location-text"><label for="report-location-text">Street, landmark, or manual locality <span class="optional" id="location-text-optional">(optional)</span></label><input id="report-location-text" maxlength="120" placeholder="Type a landmark or, for manual entry, the locality name"><p class="field-hint">Typed location only. No GPS access; location is not verified. Never add a private home address.</p><p class="field-error" id="location-text-error">Enter the manual locality or keep location text under 120 characters.</p></div>
        <div class="field"><label for="evidence-context">Evidence or source context <span class="optional">(optional)</span></label><textarea id="evidence-context" maxlength="500" placeholder="Describe what any attached image or public source shows. The model cannot view uploaded image contents."></textarea><p class="field-hint">Text-only consistency screening; do not include private records or personal contact details.</p></div>
        <section class="ai-assist-panel" aria-labelledby="ai-assist-title"><div><h3 id="ai-assist-title">Optional Gemma issue analysis</h3><p>On request, this sends the title, description, and locality above to Google’s configured Gemma API for an advisory suggestion. Google may process these fields under the applicable API terms. Do not include private or identifying information. It does not submit the report, change its status, or verify evidence.</p></div><button class="button button-secondary" type="button" id="analyze-issue">Analyze with Gemma</button><div id="ai-analysis-result" class="ai-analysis-result" role="status" aria-live="polite" hidden></div></section>
        <fieldset class="identity-choice"><legend>How should your report be attributed publicly?</legend>
          <label><input type="radio" name="identity-choice" value="display-name" checked><span><strong>Display my chosen name</strong><small>Only the name you enter below is shown on this report.</small></span></label>
          <label><input type="radio" name="identity-choice" value="pseudonym"><span><strong>Use a pseudonym</strong><small>A local pseudonym is generated; no email or account is requested.</small></span></label>
          <label><input type="radio" name="identity-choice" value="anonymous"><span><strong>Submit anonymously</strong><small>No reporter name is saved or displayed with this report. This is not a technical untraceability guarantee.</small></span></label>
        </fieldset>
        <div class="field" id="display-name-field"><label for="reporter-name">Chosen display name</label><input id="reporter-name" maxlength="40" autocomplete="nickname" placeholder="Name to show on the public report" required aria-describedby="reporter-name-error"><p class="field-error" id="reporter-name-error">Enter a display name or choose pseudonym/anonymous.</p></div>
        <div class="field"><label for="report-photo">Report photo <span class="optional">(optional)</span></label><label class="upload-zone" for="report-photo">${icon("upload")}<span><strong>Choose a photo</strong><small>JPG, PNG or WebP · up to 3 MB · re-encoded in this browser</small></span><input id="report-photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp"><img id="photo-preview" class="photo-preview" alt="Selected report photo preview"></label></div>
        <div class="field"><label for="report-before-evidence">Before evidence <span class="optional">(optional)</span></label><label class="upload-zone" for="report-before-evidence">${icon("upload")}<span><strong>Select an image taken before reported work</strong><small>JPG, PNG or WebP · up to 3 MB · re-encoded in this browser</small></span><input id="report-before-evidence" type="file" accept="image/jpeg,image/png,image/webp"><img id="before-preview" class="photo-preview" alt="Before evidence image preview"></label><p class="field-hint">Only submit an image that relates to this report. Avoid faces, identity documents, license plates, student records, and private medical records. Metadata removal is best-effort.</p></div>
        <div id="screening-submit-error" class="form-error-summary" role="alert" hidden></div>
        <label class="consent-check"><input id="report-consent" type="checkbox" required><span>I understand my report text will be sent to the local Ollama screening service and stored in this browser and the local screening database. Reports are not sent to an authority or shared with other users.</span></label>
        <div class="form-actions"><button class="button button-secondary" type="button" data-page="dashboard">Cancel</button><button id="report-submit" class="button button-primary" type="submit">Screen and submit</button></div>
      </form>
      <aside class="form-aside"><article class="content-card aside-card"><h3>Optional account access</h3><p>Secure sign-in is not configured in this prototype. No password or email is requested; you can still submit without creating an account.</p><button class="button button-secondary account-button" type="button" id="account-info">Account sign-in prototype</button></article>
      <article class="content-card aside-card"><h3>Privacy in this prototype</h3><p>Your report stays in this browser's local storage and its text is also saved to a SQLite file on this computer. Neither has production-grade access controls. Images are not stored by the screening database or sent to Ollama. No shared backend or secure anonymity guarantee exists.</p></article>
      <article class="content-card aside-card"><h3>Before you submit</h3><ul><li>Describe what you observed, not a presumed cause.</li><li>Fee changes are allegations unless independently documented.</li><li>Traffic concerns need time, location, impact, and any available public source.</li><li>Never post sensitive personal records.</li></ul></article></aside></div>`;
  }

  function confirmationPage() {
    const issue = issues.find((item) => item.id === reportSubmittedId);
    if (!issue) return "";
    return `<section class="confirmation"><div class="confirmation-icon">${icon("checkCircle")}</div><p class="eyebrow">Local screening receipt · ${escapeHtml(issue.screening?.complaint_id || issue.id)}</p><h1>Report screening complete</h1><p class="page-subtitle">The report is stored in this browser and local screening database. It has not been sent to an authority or shared with other users.</p><div class="reference-box"><span>Screening status</span><strong>${escapeHtml(screeningStatusLabel(issue.screeningStatus))}</strong></div><p class="identity-confirmation">Public attribution: <strong>${issue.identityChoice === "anonymous" ? "Anonymous" : escapeHtml(issue.reporter)}</strong></p>${screeningPanelMarkup(issue)}<div class="confirmation-actions"><button class="button button-primary" type="button" data-open-issue="${escapeHtml(issue.id)}">View report details ${icon("arrow")}</button><button class="button button-secondary" type="button" data-page="my-submissions">My submissions</button><button class="button button-secondary" type="button" data-page="dashboard">Back to overview</button></div></section>`;
  }

  function mySubmissionsPage() {
    const submissions = issues.filter((issue) => !issue.sample)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return `<section class="page-heading"><div><p class="eyebrow">Private to this browser profile</p><h1>My submissions</h1><p class="page-subtitle">Your locally saved reports and preliminary AI screening decisions. This is not a secure account or shared service.</p></div><button class="button button-primary" type="button" data-page="report">${icon("list")} Report an issue</button></section><div class="sample-note"><span>Held, unclear, rejected, and unscreened legacy records are not shown on the public dashboard. This browser-only list is visible to anyone with access to this browser profile.</span></div><section class="content-card list-card"><div class="list-card-head"><div><h2 class="section-title">Your local reports</h2><p class="section-caption">${submissions.length} locally stored submission(s)</p></div></div><div class="table-wrap">${submissions.length ? `<table class="issue-table"><thead><tr><th>Report</th><th>Category / topic</th><th>Locality</th><th>Report status</th><th>Screening decision</th><th>Reported</th></tr></thead><tbody>${submissions.map((issue) => `<tr data-open-issue="${escapeHtml(issue.id)}" tabindex="0" aria-label="Open ${escapeHtml(issue.title)}"><td><div class="issue-title">${escapeHtml(issue.title)}</div><div class="issue-ref">${escapeHtml(issue.id)}</div></td><td>${escapeHtml(issue.category)}<small class="topic-cell">${escapeHtml(issue.topic || "")}</small></td><td>${escapeHtml(issue.locality)}</td><td>${statusPill(issue.status)}</td><td>${escapeHtml(screeningStatusLabel(issue.screeningStatus))}${issue.screening?.human_review_required ? "<small class=\"topic-cell\">Human review required</small>" : ""}</td><td>${relativeAge(issue.createdAt)}</td></tr>`).join("")}</tbody></table>` : `<div class="empty-state"><strong>No submissions in this browser.</strong><span>Reports you submit will appear here after the local screening service processes them.</span><button class="button button-primary" type="button" data-page="report">Report an issue</button></div>`}</div></section>`;
  }

  function timelineMarkup(issue) {
    const history = (issue.updates || []).slice().sort((a, b) => new Date(a.at) - new Date(b.at));
    return `<ol class="timeline">${history.map((update) => {
      const simulatedVerification = issue.sample && statusCodeFor(update.status) === "verified_resolved";
      const actor = simulatedVerification ? "Simulated sample decision · no reviewer" : update.actor || "Reporter";
      const timestamp = simulatedVerification
        ? `<span class="timeline-no-time">Simulated event · no real verification timestamp</span>`
        : `<time datetime="${escapeHtml(update.at)}">${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(update.at))}</time>`;
      return `<li class="timeline-item"><span class="timeline-dot complete">${icon("check")}</span><div class="timeline-copy"><strong>${escapeHtml(update.status || update.type || "Update")}</strong><p>${escapeHtml(update.note)}</p>${update.evidence ? `<span class="evidence-label">${escapeHtml(update.evidenceState || "Submitted · not independently verified")}</span><p class="timeline-evidence">${escapeHtml(update.evidence)}</p>` : ""}<p class="timeline-actor">Recorded by ${escapeHtml(actor)} · ${issue.sample ? "sample history" : "browser record"}</p>${timestamp}</div></li>`;
    }).join("")}</ol>`;
  }

  function detailPage(issue) {
    const latest = (issue.updates || []).slice().sort((a, b) => new Date(b.at) - new Date(a.at))[0];
    const latestIsSimulatedVerification = issue.sample && statusCodeFor(latest?.status) === "verified_resolved";
    const nextStatus = (transitions[issue.status] || [])[0];
    const isVerified = isVerifiedResolvedRecord(issue);
    const reporterDisplay = issue.identityChoice === "anonymous" ? "Anonymous" : issue.reporter || "Pseudonym";
    const evidenceStatus = issue.evidenceReviewed ? "Reviewed in demo workflow; not independent verification" : "Submitted evidence, not independently reviewed";
    const beforeEvidenceItems = [
      issue.beforeEvidence ? { ...issue.beforeEvidence, label: "Before evidence · report" } : null,
      issue.resolutionEvidence?.before ? { ...issue.resolutionEvidence.before, label: "Before evidence · resolution submission" } : null
    ].map((evidence) => evidence ? { ...evidence, dataUrl: safeImageSource(evidence.dataUrl) } : null)
      .filter((evidence) => evidence?.dataUrl);
    const afterEvidence = issue.resolutionEvidence?.after;
    const safeAfterEvidence = afterEvidence ? { ...afterEvidence, dataUrl: safeImageSource(afterEvidence.dataUrl) } : null;
    const safeReportPhoto = safeImageSource(issue.photo);
    const beforeEvidenceMarkup = beforeEvidenceItems.length
      ? beforeEvidenceItems.map((evidence) => `<figure><figcaption>${escapeHtml(evidence.label)} <span>Submitted by ${escapeHtml(evidence.submitter || "Reporter")}</span></figcaption><img class="detail-photo" src="${escapeHtml(evidence.dataUrl)}" alt="${escapeHtml(evidence.label)} image"><time>${evidence.submittedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(evidence.submittedAt)) : "Time not recorded"}</time><p>${escapeHtml(evidence.notes || "No evidence note provided.")}</p></figure>`).join("")
      : `<div class="evidence-missing"><strong>Before evidence not provided.</strong><span>No placeholder is used to represent proof.</span></div>`;
    const afterEvidenceMarkup = safeAfterEvidence?.dataUrl
      ? `<figure><figcaption>After-resolution evidence <span>Submitted by ${escapeHtml(safeAfterEvidence.submitter || "Operator")}</span></figcaption><img class="detail-photo" src="${escapeHtml(safeAfterEvidence.dataUrl)}" alt="User-submitted after-resolution evidence"><time>${safeAfterEvidence.submittedAt ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(safeAfterEvidence.submittedAt)) : "Time not recorded"}</time><p>${escapeHtml(safeAfterEvidence.notes || "No evidence note provided.")}</p></figure>`
      : safeAfterEvidence?.reference
        ? `<div class="evidence-reference"><strong>After-resolution evidence reference</strong><code>${escapeHtml(safeAfterEvidence.reference)}</code><span>Illustrative sample reference only; no image or real-world proof is supplied.</span></div>`
        : `<div class="evidence-missing"><strong>After-resolution evidence not provided</strong><span>A resolution claim alone is not visual evidence.</span></div>`;
    return `<button type="button" class="button button-secondary detail-back" data-page="dashboard">← Back to reports</button>
      <section class="page-heading"><div><p class="eyebrow">${escapeHtml(issue.city || "Bhopal, Madhya Pradesh")} · ${escapeHtml(issue.id)}</p><h1>${escapeHtml(issue.title)}</h1><p class="page-subtitle">${escapeHtml(issue.category)} / ${escapeHtml(issue.topic || "")} · ${escapeHtml(issue.locality)} · Reported ${relativeAge(issue.createdAt)}</p></div>${statusPill(issue.status)}</section>
      <div class="sample-note">${icon("info")}<span><strong>${issue.sample ? "Fictional sample record." : "User-submitted browser record."}</strong> ${issue.sample ? "This example does not describe a real incident. Its verified-resolved state is simulated for demonstration only." : "This report is stored only in this browser and has not been delivered to an authority."} Location is user-provided and unverified. Sample outcomes do not establish a real resolution.</span></div>
      <div class="detail-layout"><div class="detail-main">
        <article class="content-card detail-card"><div class="detail-heading"><div><p class="eyebrow">Report details</p><h2 class="section-title">${escapeHtml(issue.title)}</h2></div>${statusPill(issue.status)}</div>
          <div class="detail-meta"><span>${icon("pin")}${escapeHtml(issue.locality)}</span><span>${icon("clock")}Reported ${relativeAge(issue.createdAt)}</span><span>${escapeHtml(issue.category)}</span></div>
          <p class="detail-description">${escapeHtml(issue.description)}</p>
          <dl class="report-facts"><div><dt>Record source</dt><dd>${escapeHtml(sourceLabel(issue))}</dd></div><div><dt>Location confidence</dt><dd>${escapeHtml(issue.locationAccuracy || "User provided · not verified")}</dd></div><div><dt>Reporter attribution</dt><dd>${escapeHtml(reporterDisplay)}</dd></div>
          ${issue.locationText ? `<div><dt>Location text</dt><dd>${escapeHtml(issue.locationText)}</dd></div>` : ""}
          ${issue.category === "Education" ? `<div><dt>Allegation</dt><dd>${escapeHtml(issue.allegation || "No separate allegation provided. The report description remains unverified.")}</dd></div><div><dt>Evidence</dt><dd>${escapeHtml(issue.feeEvidence || "No supporting evidence provided.")}</dd></div>` : ""}
          ${issue.category === "Transport and traffic" ? `<div><dt>Reported time</dt><dd>${escapeHtml(issue.trafficTime || "Not provided")}</dd></div><div><dt>Reported impact</dt><dd>${escapeHtml(issue.trafficImpact || "Not provided")}</dd></div><div><dt>Supporting source</dt><dd>${escapeHtml(issue.trafficSource || "No source provided")}</dd></div>` : ""}
          </dl>
          <section class="evidence-panel" aria-label="Before and after evidence"><h3>Evidence submitted</h3><p class="section-caption">Images and notes are user-submitted records, not independently verified.</p><div class="evidence-columns">${beforeEvidenceMarkup}${afterEvidenceMarkup}</div>${safeReportPhoto ? `<figure><figcaption>Report image · ${escapeHtml(sourceLabel(issue))}</figcaption><img class="detail-photo" src="${escapeHtml(safeReportPhoto)}" alt="Image submitted with this report"></figure>` : ""}</section></article>
        <article class="content-card detail-card"><h2 class="section-title">Attributed status history</h2><p class="section-caption">Chronological notes are retained. Submitted material and demo reviews are not independent verification.</p>${timelineMarkup(issue)}</article>
        <article class="content-card detail-card demo-authority"><h3>Simulated operator workflow</h3><p>This client-side demonstration is not an authenticated authority account. Updates are local notes, not agency actions. A production deployment must enforce authorization on a secure server.</p>${nextStatus && nextStatus !== "Verified Resolved" && nextStatus !== "Resolution Disputed" ? authorityMode ? `<form id="status-form" data-next-status="${escapeHtml(nextStatus)}"><div class="field"><label for="status-note">Status update note</label><textarea id="status-note" maxlength="500" placeholder="Describe the update and its source..." required></textarea></div><div class="field"><label for="status-evidence">Supporting evidence description <span class="optional">(optional)</span></label><input id="status-evidence" maxlength="250" placeholder="Submitted evidence; not verified by default"></div>${nextStatus === "Resolution Submitted" ? `<div class="resolution-uploads"><div class="field"><label for="resolution-before">Before evidence <span class="optional">(optional)</span></label><input id="resolution-before" type="file" accept="image/jpeg,image/png,image/webp"><img id="resolution-before-preview" class="photo-preview" alt="Resolution before evidence preview"><p class="field-hint">JPG, PNG or WebP · up to 3 MB. This will be labeled as submitted, not verified.</p></div><div class="field"><label for="resolution-after">After-resolution evidence <span class="optional">(optional)</span></label><input id="resolution-after" type="file" accept="image/jpeg,image/png,image/webp"><img id="resolution-after-preview" class="photo-preview" alt="Resolution after evidence preview"><p class="field-hint">JPG, PNG or WebP · up to 3 MB. Avoid sensitive content.</p></div></div>` : ""}<button class="button button-secondary" type="submit">Simulate “${escapeHtml(nextStatus)}”</button></form>` : `<button id="authority-toggle" class="button button-secondary" type="button">Enable simulated operator mode</button>` : ""}
          ${issue.status === "Verification Pending" ? reviewerMode ? `<form id="review-form"><div class="field"><label for="review-note">Review note</label><textarea id="review-note" maxlength="500" minlength="12" required placeholder="Explain any concern or why the evidence remains inconclusive."></textarea></div><div class="field"><label for="review-evidence">Evidence basis</label><input id="review-evidence" maxlength="250" required placeholder="Describe the material considered"></div><div class="review-actions"><button class="button button-danger" type="submit" data-review="Resolution Disputed">Record demo dispute</button></div><p class="fine-print">This prototype has no authenticated reviewer identity or independent evidence service, so it cannot record a genuine verified outcome. A pending claim stays pending unless disputed.</p></form>` : `<button id="reviewer-toggle" class="button button-secondary" type="button">Enable simulated reviewer mode</button><p class="fine-print">Reviewer mode is unauthenticated. It can record a demo dispute, but cannot verify a resolution.</p>` : ""}
        </article>
      </div><aside class="detail-side">
        <article class="content-card detail-card"><h2 class="section-title">Community response</h2><div class="side-stat"><span>Supporters</span><strong>${issue.supports}</strong></div><div class="support-action"><button id="support-button" class="button button-secondary" type="button" data-support-id="${escapeHtml(issue.id)}">${icon("heart")} Support this report</button></div><button id="follow-button" class="button button-secondary follow-button" type="button" data-follow-id="${escapeHtml(issue.id)}" aria-pressed="${Boolean(issue.following)}">${issue.following ? "Following updates" : "Follow updates"}</button><p class="fine-print">Counts and follows are saved in this browser only; they are not shared.</p><button id="flag-button" class="text-button content-flag" type="button" data-flag-id="${escapeHtml(issue.id)}">Flag content for review</button></article>
        <article class="content-card detail-card">${isVerified ? issue.sample ? `<div class="verified-check">${icon("checkCircle")}Simulated verified-resolved sample</div><p class="fine-print">Demonstration state only; no reviewer identity, real timestamp, independent review, or real-world outcome is claimed.</p>` : `<div class="verified-check">${icon("checkCircle")}Verified outcome record</div><p class="fine-print">The source reports an eligible reviewer and evidence criteria. This frontend cannot authenticate either, so it cannot generate genuine verified outcomes.</p>` : issue.status === "Resolution Submitted" || issue.status === "Verification Pending" ? `<div class="verification-box"><h3>Resolution claim submitted</h3><p>The claim is not verified. This prototype cannot authenticate an eligible reviewer, so it will remain pending unless disputed.</p><span class="evidence-label">${escapeHtml(evidenceStatus)}</span></div>` : issue.status === "Resolution Disputed" ? `<div class="disputed-box"><h3>Resolution disputed</h3><p>This report is not treated as resolved. The dispute reason is retained in the history.</p></div>` : `<h2 class="section-title">Verification</h2><p class="fine-print">A verified outcome requires an eligible, attributable reviewer and defined evidence criteria; this prototype cannot record one.</p>`}</article>
        ${issue.status === "Verification Pending" ? `<article class="content-card detail-card"><h2 class="section-title">Community dispute</h2><p class="fine-print">Describe why the submitted resolution may be incomplete. A dispute does not prove the contrary.</p><form id="dispute-form"><div class="field"><label for="dispute-note">Dispute reason</label><textarea id="dispute-note" maxlength="500" minlength="15" required placeholder="Explain the observed issue or missing evidence..."></textarea></div><button class="button button-danger" type="submit">Submit dispute</button></form></article>` : ""}
        ${!isVerified ? `<article class="content-card detail-card"><h2 class="section-title">Suggest a correction</h2><form id="correction-form"><div class="field"><label for="correction-note">Correction note</label><textarea id="correction-note" maxlength="500" minlength="8" required placeholder="Suggest a factual correction. Original history is retained."></textarea></div><button class="button button-secondary" type="submit">Submit correction</button></form></article>` : ""}
        <article class="content-card detail-card"><h2 class="section-title">Report information</h2><div class="side-stat"><span>Reference ID</span><strong>${escapeHtml(issue.id)}</strong></div><div class="side-stat"><span>Source</span><strong>${escapeHtml(sourceLabel(issue))}</strong></div><div class="side-stat"><span>Last update</span><strong>${latestIsSimulatedVerification ? "Demo event · no real timestamp" : latest ? relativeAge(latest.at) : "—"}</strong></div></article>
      </aside></div>`;
  }

  function render() {
    if (page === "details" && !issues.some((item) => item.id === selectedId)) { page = "dashboard"; selectedId = null; }
    const pageNames = { dashboard: "Overview", localities: "Bhopal localities", trust: "Trust & transparency", report: "Report an issue", "my-submissions": "My submissions", details: "Complaint details" };
    currentBreadcrumb.textContent = pageNames[page] || "Overview";
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === (page === "details" ? "dashboard" : page)));
    app.innerHTML = page === "dashboard" ? dashboardPage()
      : page === "localities" ? localityPage()
        : page === "trust" ? trustPage()
          : page === "report" ? reportPage()
            : page === "my-submissions" ? mySubmissionsPage()
            : detailPage(issues.find((item) => item.id === selectedId));
    attachPageEvents();
    app.classList.remove("view-enter");
    void app.offsetWidth;
    app.classList.add("view-enter");
    if (page === "dashboard") animateMetricCounters();
  }

  function animateMetricCounters() {
    const counters = app.querySelectorAll("[data-count-target]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    counters.forEach((counter) => {
      const target = Number(counter.dataset.countTarget);
      if (!Number.isFinite(target)) return;
      if (reducedMotion) {
        counter.textContent = String(target);
        return;
      }
      const startedAt = performance.now();
      const duration = 520;
      counter.textContent = "0";
      const tick = (now) => {
        const progress = Math.min(1, (now - startedAt) / duration);
        counter.textContent = String(Math.round(target * (1 - ((1 - progress) ** 3))));
        if (progress < 1 && counter.isConnected) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }

  function goTo(nextPage) {
    if (page === "report" && nextPage !== "report" && imageProcessingCount > 0) {
      toast("Wait for the selected image to finish processing before leaving this report.");
      return;
    }
    if (page === "report" && nextPage !== "report") {
      pendingPhoto = "";
      pendingBeforeEvidence = "";
      pendingReportValues = null;
      photoProcessing = false;
    }
    if (nextPage === "report" && (page !== "report" || reportSubmittedId)) {
      reportSubmittedId = null;
      pendingPhoto = "";
      pendingBeforeEvidence = "";
      pendingReportValues = null;
      photoProcessing = false;
    }
    page = nextPage;
    if (nextPage !== "report") reportSubmittedId = null;
    render();
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }

  function openIssue(id) {
    if (page === "report" && imageProcessingCount > 0) {
      toast("Wait for the selected image to finish processing before opening another report.");
      return;
    }
    if (page === "report") {
      pendingPhoto = "";
      pendingBeforeEvidence = "";
      pendingReportValues = null;
      photoProcessing = false;
    }
    if (id !== selectedId) {
      pendingResolutionBefore = "";
      pendingResolutionAfter = "";
    }
    selectedId = id;
    page = "details";
    render();
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }

  function attachPageEvents() {
    app.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => goTo(button.dataset.page)));
    app.querySelectorAll("[data-open-issue]").forEach((element) => {
      element.addEventListener("click", (event) => {
        if (event.target.closest("[data-support-id]")) return;
        openIssue(element.dataset.openIssue);
      });
      if (element.tagName === "TR") element.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && !event.target.closest("[data-support-id]")) {
          event.preventDefault();
          openIssue(element.dataset.openIssue);
        }
      });
    });
    app.querySelectorAll("[data-support-id]").forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      supportIssue(button.dataset.supportId);
    }));
    app.querySelectorAll("[data-metric]").forEach((button) => button.addEventListener("click", () => {
      quickFilter = button.dataset.metric;
      categoryFilter = "all";
      statusFilter = "all";
      localityFilter = "all";
      searchTerm = "";
      render();
      document.querySelector(".list-card").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }));
    const search = document.getElementById("issue-search");
    if (search) search.addEventListener("input", () => { searchTerm = search.value; updateTable(); });
    const category = document.getElementById("category-filter");
    if (category) category.addEventListener("change", () => { categoryFilter = category.value; updateTable(); });
    const status = document.getElementById("status-filter");
    if (status) status.addEventListener("change", () => { statusFilter = status.value; updateTable(); });
    const sorting = document.getElementById("sort-filter");
    if (sorting) sorting.addEventListener("change", () => { sortBy = sorting.value; updateTable(); });
    const clearFilters = document.getElementById("clear-filters");
    if (clearFilters) clearFilters.addEventListener("click", clearAllFilters);
    const emptyClear = document.getElementById("empty-clear");
    if (emptyClear) emptyClear.addEventListener("click", clearAllFilters);
    const localitySelect = document.getElementById("locality-select");
    if (localitySelect) localitySelect.addEventListener("change", () => { localityFilter = localitySelect.value; render(); });
    const localityCategory = document.getElementById("locality-category");
    if (localityCategory) localityCategory.addEventListener("change", () => { localityCategoryFilter = localityCategory.value; render(); });
    const localityStatus = document.getElementById("locality-status-filter");
    if (localityStatus) localityStatus.addEventListener("change", () => { localityStatusFilter = localityStatus.value; render(); });
    const localitySearch = document.getElementById("locality-search");
    const localitySearchForm = document.getElementById("locality-search-form");
    if (localitySearchForm) localitySearchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      localitySearchTerm = localitySearch.value;
      render();
    });
    const clearLocalityFilters = document.getElementById("clear-locality-filters");
    if (clearLocalityFilters) clearLocalityFilters.addEventListener("click", () => {
      localityFilter = "all";
      localityCategoryFilter = "all";
      localityStatusFilter = "all";
      localitySearchTerm = "";
      render();
    });
    const reportLocality = document.getElementById("report-location");
    if (reportLocality) reportLocality.addEventListener("change", () => {
      const manual = reportLocality.value === "__manual";
      document.getElementById("location-text-optional").textContent = manual ? "(required for manual entry)" : "(optional)";
      document.getElementById("report-location-text").required = manual;
    });
    app.querySelectorAll("[data-locality]").forEach((button) => button.addEventListener("click", () => {
      localityFilter = button.dataset.locality;
      render();
      document.querySelector(".locality-reports").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }));
    const viewReportList = document.getElementById("view-report-list");
    if (viewReportList) viewReportList.addEventListener("click", () => {
      quickFilter = "all";
      categoryFilter = localityCategoryFilter;
      statusFilter = localityStatusFilter;
      searchTerm = localitySearchTerm;
      page = "dashboard";
      render();
      document.querySelector(".list-card").scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    });
    const reportForm = document.getElementById("report-form");
    if (reportForm) attachReportForm(reportForm);
    const categorySelect = document.getElementById("report-category");
    if (categorySelect) categorySelect.addEventListener("change", updateReportTopics);
    document.querySelectorAll('input[name="identity-choice"]').forEach((input) => input.addEventListener("change", updateIdentityFields));
    const statusForm = document.getElementById("status-form");
    if (statusForm) {
      statusForm.addEventListener("submit", submitStatusUpdate);
      bindImageInput("resolution-before", "resolution-before-preview", (value) => { pendingResolutionBefore = value; }, statusForm);
      bindImageInput("resolution-after", "resolution-after-preview", (value) => { pendingResolutionAfter = value; }, statusForm);
    }
    const followButton = document.getElementById("follow-button");
    if (followButton) followButton.addEventListener("click", () => followIssue(followButton.dataset.followId));
    const authorityToggle = document.getElementById("authority-toggle");
    if (authorityToggle) authorityToggle.addEventListener("click", () => { authorityMode = true; render(); });
    const reviewerToggle = document.getElementById("reviewer-toggle");
    if (reviewerToggle) reviewerToggle.addEventListener("click", () => { reviewerMode = true; render(); });
    const reviewForm = document.getElementById("review-form");
    if (reviewForm) reviewForm.addEventListener("submit", submitReview);
    const disputeForm = document.getElementById("dispute-form");
    if (disputeForm) disputeForm.addEventListener("submit", submitDispute);
    const correctionForm = document.getElementById("correction-form");
    if (correctionForm) correctionForm.addEventListener("submit", submitCorrection);
    const flagButton = document.getElementById("flag-button");
    if (flagButton) flagButton.addEventListener("click", () => flagIssue(flagButton.dataset.flagId));
    const accountInfo = document.getElementById("account-info");
    if (accountInfo) accountInfo.addEventListener("click", showAccountPrototype);
    const trafficUnknown = document.getElementById("traffic-time-unknown");
    if (trafficUnknown) trafficUnknown.addEventListener("change", () => {
      document.getElementById("traffic-time").disabled = trafficUnknown.checked;
      if (trafficUnknown.checked) document.getElementById("traffic-time").value = "";
    });
  }

  function clearAllFilters() {
    quickFilter = "all";
    categoryFilter = "all";
    statusFilter = "all";
    localityFilter = "all";
    searchTerm = "";
    render();
  }

  function updateTable() {
    const wrapper = document.getElementById("issue-table-wrap");
    const listCard = document.querySelector(".list-card");
    if (!wrapper || !listCard) return;
    const controls = listCard.querySelector(".list-controls");
    const oldActive = listCard.querySelector(".active-filter");
    if (oldActive) oldActive.remove();
    const hasFilter = quickFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all" || localityFilter !== "all" || searchTerm;
    if (hasFilter) {
      const active = document.createElement("div");
      active.className = "active-filter";
      active.innerHTML = `<span>Filtered reports: ${getFilteredIssues().length}</span><button id="clear-filters" class="text-button" type="button">Clear all filters</button>`;
      active.querySelector("button").addEventListener("click", clearAllFilters);
      controls.parentElement.after(active);
    }
    wrapper.innerHTML = tableMarkup();
    wrapper.querySelectorAll("[data-open-issue]").forEach((row) => {
      row.addEventListener("click", () => openIssue(row.dataset.openIssue));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openIssue(row.dataset.openIssue); }
      });
    });
    wrapper.querySelectorAll("[data-support-id]").forEach((button) => button.addEventListener("click", (event) => {
      event.stopPropagation();
      supportIssue(button.dataset.supportId);
    }));
    const emptyClear = document.getElementById("empty-clear");
    if (emptyClear) emptyClear.addEventListener("click", clearAllFilters);
  }

  function updateReportTopics() {
    const category = document.getElementById("report-category").value;
    const topicSelect = document.getElementById("report-topic");
    if (!topicSelect) return;
    const topics = categoryTopics[category] || [];
    topicSelect.innerHTML = `<option value="">Choose an issue type</option>${topics.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`).join("")}`;
    document.getElementById("fee-fields").hidden = !(category === "Education");
    document.getElementById("traffic-fields").hidden = !(category === "Transport and traffic");
  }

  function selectedIdentity() {
    return document.querySelector('input[name="identity-choice"]:checked')?.value || "anonymous";
  }

  function updateIdentityFields() {
    const choice = selectedIdentity();
    const nameField = document.getElementById("display-name-field");
    const nameInput = document.getElementById("reporter-name");
    const show = choice === "display-name";
    nameField.hidden = !show;
    nameInput.required = show;
    if (!show) {
      nameField.classList.remove("invalid");
      nameInput.setAttribute("aria-invalid", "false");
      nameInput.value = "";
    }
  }

  function showFieldError(name, invalid) {
    const field = document.querySelector(`[data-field="${name}"]`);
    if (!field) return invalid;
    field.classList.toggle("invalid", invalid);
    const control = field.querySelector("input:not([type=checkbox]),textarea,select");
    if (control) control.setAttribute("aria-invalid", String(invalid));
    return invalid;
  }

  async function processImage(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      throw new Error("Choose a JPG, PNG, or WebP image under 3 MB.");
    }
    const sourceUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve, reject) => canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("The selected image could not be re-encoded.")),
        "image/webp", 0.82
      ));
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("The selected image could not be read."));
        reader.readAsDataURL(blob);
      });
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }

  function bindImageInput(inputId, previewId, setValue, form) {
    const upload = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    if (!upload || !preview) return;
    upload.addEventListener("change", async () => {
      const file = upload.files?.[0];
      if (!file) {
        setValue("");
        preview.removeAttribute("src");
        preview.style.display = "none";
        return;
      }
      imageProcessingCount += 1;
      photoProcessing = true;
      if (form) form.querySelectorAll('button[type="submit"]').forEach((button) => { button.disabled = true; });
      try {
        const processed = await processImage(file);
        setValue(processed);
        preview.src = processed;
        preview.style.display = "block";
      } catch (error) {
        upload.value = "";
        setValue("");
        preview.removeAttribute("src");
        preview.style.display = "none";
        toast(error.message);
      } finally {
        imageProcessingCount -= 1;
        photoProcessing = imageProcessingCount > 0;
        if (form && !photoProcessing) form.querySelectorAll('button[type="submit"]').forEach((button) => { button.disabled = false; });
      }
    });
  }

  function attachReportForm(form) {
    const analyzeButton = document.getElementById("analyze-issue");
    const analysisResult = document.getElementById("ai-analysis-result");
    analyzeButton?.addEventListener("click", async () => {
      const title = document.getElementById("report-title").value.trim();
      const description = document.getElementById("report-description").value.trim();
      const selectedLocality = document.getElementById("report-location").value;
      const locality = selectedLocality === "__manual"
        ? document.getElementById("report-location-text").value.trim()
        : selectedLocality;
      analysisResult.hidden = false;
      analysisResult.textContent = "";
      if (title.length < 8 || description.length < 20 || locality.length < 2) {
        analysisResult.textContent = "Enter a title, description, and locality before requesting analysis.";
        return;
      }
      analyzeButton.disabled = true;
      analysisResult.textContent = "Requesting an advisory analysis…";
      try {
        const response = await fetch("/api/analyze-issue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description, locality })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Gemma analysis could not be completed.");
        const analysis = payload.analysis;
        const heading = document.createElement("strong");
        heading.textContent = `${analysis.category} · ${analysis.priority} priority (advisory)`;
        const summary = document.createElement("p");
        summary.textContent = analysis.summary;
        const recommendation = document.createElement("p");
        recommendation.textContent = `Suggested next step: ${analysis.recommended_action}`;
        analysisResult.replaceChildren(heading, summary, recommendation);
      } catch (error) {
        const failedToConnect = error instanceof TypeError || error.message === "Failed to fetch";
        analysisResult.textContent = failedToConnect
          ? `Cannot reach the JanPramaan API at ${new URL("/api/analyze-issue", window.location.href).href}. Start the Python backend with "python server.py" and open the site from the backend URL in README; Live Server and file:// do not provide this API.`
          : error.message || "Gemma analysis could not be completed.";
      } finally {
        analyzeButton.disabled = false;
      }
    });
    bindImageInput("report-photo", "photo-preview", (value) => { pendingPhoto = value; }, form);
    bindImageInput("report-before-evidence", "before-preview", (value) => { pendingBeforeEvidence = value; }, form);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const title = document.getElementById("report-title").value.trim();
      const description = document.getElementById("report-description").value.trim();
      const category = document.getElementById("report-category").value;
      const topic = document.getElementById("report-topic").value;
      const locality = document.getElementById("report-location").value;
      const locationText = document.getElementById("report-location-text").value.trim();
      const manualLocality = locality === "__manual";
      const resolvedLocality = manualLocality ? locationText : locality;
      const identityChoice = selectedIdentity();
      const reporter = document.getElementById("reporter-name").value.trim();
      const feeAllegation = document.getElementById("report-allegation").value.trim();
      const trafficTime = document.getElementById("traffic-time").value;
      const trafficTimeUnknown = document.getElementById("traffic-time-unknown").checked;
      const trafficImpact = document.getElementById("traffic-impact").value.trim();
      const invalidFields = [
        showFieldError("title", title.length < 8 || title.length > 100),
        showFieldError("description", description.length < 20),
        showFieldError("category", !categories.includes(category)),
        showFieldError("topic", !(categoryTopics[category] || []).includes(topic)),
        showFieldError("location", !manualLocality && !localities.includes(locality)),
        showFieldError("location-text", locationText.length > 120 || (manualLocality && locationText.length < 3)),
        showFieldError("allegation", category === "Education" && topic.includes("Fee") && feeAllegation.length < 12),
        showFieldError("traffic-time", category === "Transport and traffic" && !trafficTime && !trafficTimeUnknown),
        showFieldError("traffic-impact", category === "Transport and traffic" && trafficImpact.length < 10)
      ];
      const nameField = document.getElementById("display-name-field");
      const nameInvalid = identityChoice === "display-name" && reporter.length < 2;
      nameField.classList.toggle("invalid", nameInvalid);
      document.getElementById("reporter-name").setAttribute("aria-invalid", String(nameInvalid));
      const consent = document.getElementById("report-consent").checked;
      const summary = document.getElementById("form-error-summary");
      const screeningError = document.getElementById("screening-submit-error");
      screeningError.hidden = true;
      screeningError.textContent = "";
      if (photoProcessing) {
        toast("Wait for the selected image to finish processing.");
        return;
      }
      if (invalidFields.some(Boolean) || nameInvalid || !consent) {
        summary.hidden = false;
        summary.textContent = !consent ? "Confirm that you understand this prototype's storage and sharing limitations." : "Please correct the highlighted fields before continuing.";
        summary.focus();
        toast("Your report was not submitted. Review the highlighted fields.");
        return;
      }
      if (category === "Education" && topic.includes("Fee") && !feeAllegation) {
        toast("Describe the fee concern as an allegation before submitting.");
        return;
      }
      if (category === "Transport and traffic" && !trafficTime && !trafficTimeUnknown) {
        toast("Add an approximate time or mark the time as unknown.");
        return;
      }
      pendingReportValues = {
        title, description, category, topic, locality: resolvedLocality, locationText,
        identityChoice, reporter, photo: pendingPhoto, beforeEvidence: pendingBeforeEvidence,
        allegation: category === "Education" ? feeAllegation : "",
        feeEvidence: document.getElementById("fee-evidence").value.trim(),
        trafficTime: category === "Transport and traffic" ? (trafficTime || "Unknown") : "",
        trafficImpact: category === "Transport and traffic" ? trafficImpact : "",
        trafficSource: document.getElementById("traffic-source").value.trim(),
        evidenceContext: document.getElementById("evidence-context").value.trim()
      };
      const duplicate = findPossibleDuplicate(title, category, resolvedLocality, topic);
      if (duplicate) { showDuplicatePrompt(duplicate); return; }
      screenAndCreateReport(pendingReportValues, form);
    });
  }

  function findPossibleDuplicate(title, category, locality, topic) {
    const normalize = (value) => value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
    const normalizedTitle = normalize(title);
    return issues.find((issue) => {
      if (issue.category !== category || issue.locality !== locality) return false;
      const titleWords = normalizedTitle.split(" ").filter((word) => word.length > 3);
      const otherTitle = normalize(issue.title);
      return (topic && issue.topic === topic) || titleWords.some((word) => otherTitle.includes(word));
    }) || null;
  }

  function showDuplicatePrompt(issue) {
    const container = document.getElementById("duplicate-message");
    container.innerHTML = `<div class="possible-duplicate"><strong>A similar report may already exist.</strong><p>“${escapeHtml(issue.title)}” (${escapeHtml(issue.id)}) is listed for ${escapeHtml(issue.locality)}. This is a suggestion only; existing reports are not merged automatically.</p><div class="duplicate-actions"><button class="button button-secondary" type="button" id="open-duplicate">View existing report</button><button class="button button-secondary" type="button" id="support-duplicate">Support existing report</button><button class="button button-primary" type="button" id="continue-duplicate">Submit separate report</button></div></div>`;
    container.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
    document.getElementById("open-duplicate").addEventListener("click", () => openIssue(issue.id));
    document.getElementById("support-duplicate").addEventListener("click", () => supportIssue(issue.id, () => openIssue(issue.id)));
    document.getElementById("continue-duplicate").addEventListener("click", () => {
      if (!pendingReportValues) {
        toast("Report details need to be checked again before submission.");
        return;
      }
      screenAndCreateReport(pendingReportValues, document.getElementById("report-form"));
    });
  }

  async function screenAndCreateReport(values, form) {
    if (!form || form.dataset.screening === "true") return;
    const submitButton = document.getElementById("report-submit");
    const errorRegion = document.getElementById("screening-submit-error");
    const screeningPayload = {
      title: values.title,
      description: values.description,
      category: values.category,
      topic: values.topic,
      locality: values.locality,
      locationText: values.locationText,
      allegation: values.allegation || "",
      feeEvidence: values.feeEvidence || "",
      trafficTime: values.trafficTime || "",
      trafficImpact: values.trafficImpact || "",
      trafficSource: values.trafficSource || "",
      evidenceContext: values.evidenceContext || "",
      photo: values.photo || "",
      beforeEvidence: values.beforeEvidence || ""
    };
    form.dataset.screening = "true";
    submitButton.disabled = true;
    errorRegion.hidden = true;
    try {
      const response = await fetch("/api/submit-complaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(screeningPayload),
        signal: AbortSignal.timeout(90000)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The local screening service could not accept this report.");
      if (!payload.screening || !payload.complaint_id || !payload.receipt_token) {
        throw new Error("The screening service returned an incomplete receipt. The report was not saved in this browser.");
      }
      createReport(values, {
        ...payload.screening,
        complaint_id: payload.complaint_id,
        receipt_token: payload.receipt_token
      });
    } catch (error) {
      const cannotConnect = error instanceof TypeError || error.name === "TimeoutError";
      errorRegion.textContent = cannotConnect
        ? `Cannot reach the local screening service at ${new URL("/api/submit-complaint", window.location.href).href}. Start Ollama and JanPramaan with the commands in README, then submit again. Your report has not been saved.`
        : `${error.message || "Screening failed."} Your report has not been saved; review the error and try again.`;
      errorRegion.hidden = false;
      errorRegion.focus();
    } finally {
      form.dataset.screening = "false";
      submitButton.disabled = false;
    }
  }

  function createReport(values, screening) {
    const timestamp = new Date().toISOString();
    const id = `JP-BPL-${Date.now().toString(36).toUpperCase()}`;
    const displayName = values.identityChoice === "anonymous"
      ? ""
      : values.identityChoice === "pseudonym"
        ? `Resident-${Math.floor(1000 + Math.random() * 9000)}`
        : values.reporter;
    const report = {
      id, title: values.title, description: values.description,
      category: values.category, topic: values.topic, locality: values.locality,
      locationText: values.locationText || values.locality,
      city: "Bhopal, Madhya Pradesh",
      status: "Reported", statusCode: "reported", supports: 0, createdAt: timestamp,
      sample: false, identityChoice: values.identityChoice, reporter: displayName,
      screeningStatus: screening.status,
      screening: {
        ...screening,
        complaint_id: screening.complaint_id,
        receipt_token: screening.receipt_token
      },
      allegation: values.allegation, feeEvidence: values.feeEvidence,
      trafficTime: values.trafficTime, trafficImpact: values.trafficImpact,
      trafficSource: values.trafficSource, photo: values.photo,
      locationAccuracy: "User-provided locality and text; not independently verified",
      beforeEvidence: values.beforeEvidence ? {
        dataUrl: values.beforeEvidence,
        submittedAt: timestamp,
        submitter: values.identityChoice === "anonymous" ? "Anonymous reporter" : displayName,
        notes: "Before evidence submitted with the report; not independently verified"
      } : null,
      updates: [{ status: "Reported", note: "Report submitted in this browser. It has not been sent to an authority.", at: timestamp, actor: values.identityChoice === "anonymous" ? "Anonymous reporter" : displayName }]
    };
    if (!commitIssues([report, ...issues])) return;
    pendingReportValues = null;
    reportSubmittedId = id;
    pendingPhoto = "";
    pendingBeforeEvidence = "";
    render();
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  }

  async function submitScreeningCorrection(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const issue = issues.find((item) => item.id === reportSubmittedId)
      || issues.find((item) => item.screening?.complaint_id === form.dataset.complaintId);
    const correction = document.getElementById("screening-correction").value.trim();
    const button = form.querySelector('button[type="submit"]');
    if (!issue?.screening?.receipt_token || correction.length < 10 || correction.length > 2000) {
      toast("A private receipt and a correction of 10 to 2000 characters are required.");
      return;
    }
    button.disabled = true;
    try {
      const response = await fetch(`/api/complaints/${encodeURIComponent(issue.screening.complaint_id)}/correction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Report-Receipt": issue.screening.receipt_token
        },
        body: JSON.stringify({ correction }),
        signal: AbortSignal.timeout(90000)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "The correction could not be screened.");
      const updated = {
        ...issue,
        description: `${issue.description}\n\nReporter correction: ${correction}`,
        screeningStatus: payload.screening.status,
        screening: {
          ...payload.screening,
          complaint_id: issue.screening.complaint_id,
          receipt_token: issue.screening.receipt_token
        },
        updates: [...issue.updates, {
          status: issue.status,
          note: "Reporter submitted additional information for AI-assisted preliminary screening; no human review is recorded.",
          at: new Date().toISOString(),
          actor: "Reporter"
        }]
      };
      const nextIssues = issues.map((item) => item.id === issue.id ? updated : item);
      if (commitIssues(nextIssues, "Correction recorded and screened. This is not a human review.")) {
        render();
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
      }
    } catch (error) {
      toast(error.message || "The local screening service could not receive the correction.");
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  }

  function addHistory(issueId, update, transform) {
    const existing = issues.find((issue) => issue.id === issueId);
    if (!existing) return false;
    const next = issues.map((issue) => issue.id === issueId
      ? { ...issue, ...(transform ? transform(issue) : {}), updates: [...issue.updates, update] }
      : issue);
    return commitIssues(next);
  }

  function submitStatusUpdate(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const issue = issues.find((item) => item.id === selectedId);
    const nextStatus = form.dataset.nextStatus;
    const note = document.getElementById("status-note").value.trim();
    const evidence = document.getElementById("status-evidence").value.trim();
    if (!issue || !(transitions[issue.status] || []).includes(nextStatus)) {
      toast("That status transition is not allowed. The report was not changed.");
      return;
    }
    if (nextStatus === "Verified Resolved") {
      toast("A status change alone cannot verify a resolution. The demo review service is not connected.");
      return;
    }
    if (note.length < 8) { toast("Add a note of at least 8 characters."); document.getElementById("status-note").focus(); return; }
    if (nextStatus === "Resolution Submitted" && evidence.length < 8) {
      toast("Describe the submitted resolution evidence before requesting verification.");
      document.getElementById("status-evidence").focus();
      return;
    }
    if (photoProcessing) {
      toast("Wait for the selected evidence images to finish processing.");
      return;
    }
    const at = new Date().toISOString();
    const actor = "Simulated operator (demo)";
    const resolutionBefore = nextStatus === "Resolution Submitted" && pendingResolutionBefore
      ? { dataUrl: pendingResolutionBefore, submittedAt: at, submitter: actor, notes: note }
      : null;
    const resolutionAfter = nextStatus === "Resolution Submitted" && pendingResolutionAfter
      ? { dataUrl: pendingResolutionAfter, submittedAt: at, submitter: actor, notes: note }
      : null;
    const update = {
      status: nextStatus,
      statusCode: statusCodeFor(nextStatus),
      note: `${note} (Demo action only; not an authority action.)`,
      evidence: [evidence ? `${evidence} (submitted; not independently verified)` : "", resolutionBefore ? "Before evidence image submitted." : "", resolutionAfter ? "After-resolution evidence image submitted." : ""].filter(Boolean).join(" "),
      evidenceState: evidence || resolutionBefore || resolutionAfter ? "Submitted · not independently verified" : "",
      at, actor
    };
    if (addHistory(issue.id, update, () => ({
      status: nextStatus,
      statusCode: statusCodeFor(nextStatus),
      evidenceReviewed: false,
      ...(nextStatus === "Resolution Submitted" ? {
        resolutionEvidence: {
          before: resolutionBefore,
          after: resolutionAfter,
          submittedAt: at,
          submitter: actor,
          notes: note
        }
      } : {})
    }))) {
      pendingResolutionBefore = "";
      pendingResolutionAfter = "";
      render();
      toast(`Simulated status set to ${nextStatus}; no real-world action is represented.`);
    }
  }

  function submitReview(event) {
    event.preventDefault();
    const decision = event.submitter?.dataset.review;
    const issue = issues.find((item) => item.id === selectedId);
    const note = document.getElementById("review-note").value.trim();
    const evidence = document.getElementById("review-evidence").value.trim();
    if (!issue || issue.status !== "Verification Pending" || decision !== "Resolution Disputed") {
      toast("The review decision is not available for this report.");
      return;
    }
    if (note.length < 12 || evidence.length < 8) {
      toast("A review note (12+ characters) and evidence basis (8+ characters) are required.");
      return;
    }
    const at = new Date().toISOString();
    const update = {
      status: "Resolution Disputed",
      note: `${note} (Simulated review; this does not establish an independently verified real-world outcome.)`,
      evidence: evidence,
      evidenceState: "Review basis recorded in demo; not independently verified",
      at, actor: "Simulated reviewer (demo)"
    };
    if (addHistory(issue.id, update, () => ({ status: "Resolution Disputed", statusCode: "resolution_disputed", evidenceReviewed: false }))) {
      render();
      toast("Demo dispute recorded. No verified resolution was created.");
    }
  }

  function submitDispute(event) {
    event.preventDefault();
    const issue = issues.find((item) => item.id === selectedId);
    const note = document.getElementById("dispute-note").value.trim();
    if (!issue || issue.status !== "Verification Pending") {
      toast("A dispute can be submitted only while verification is pending.");
      return;
    }
    if (note.length < 15) { toast("Explain the dispute in at least 15 characters."); document.getElementById("dispute-note").focus(); return; }
    const update = {
      status: "Resolution Disputed", note: `${note} (Community dispute; not a verified counterclaim.)`,
      at: new Date().toISOString(), actor: issue.identityChoice === "anonymous" ? "Anonymous community member" : "Community member"
    };
    if (addHistory(issue.id, update, () => ({ status: "Resolution Disputed", statusCode: "resolution_disputed" }))) {
      render();
      toast("Dispute recorded. This report is not marked resolved.");
    }
  }

  function submitCorrection(event) {
    event.preventDefault();
    const issue = issues.find((item) => item.id === selectedId);
    const note = document.getElementById("correction-note").value.trim();
    if (!issue || note.length < 8) { toast("Enter a correction of at least 8 characters."); return; }
    const update = {
      type: "Correction Submitted", status: "Correction Submitted",
      note: note, at: new Date().toISOString(), actor: "Community correction (browser demo)"
    };
    if (addHistory(issue.id, update)) {
      render();
      toast("Correction appended to the history; the original report remains unchanged.");
    }
  }

  function flagIssue(id) {
    const reason = window.prompt("Why should this content be reviewed? Do not include private personal information.");
    if (!reason || reason.trim().length < 8) {
      if (reason !== null) toast("A flag reason needs at least 8 characters. No flag was saved.");
      return;
    }
    const next = issues.map((issue) => issue.id === id
      ? { ...issue, flags: [...(issue.flags || []), { reason: reason.trim(), at: new Date().toISOString() }] }
      : issue);
    if (commitIssues(next)) toast("Flag saved locally. No moderator service is connected, so this has not been reviewed or escalated.");
  }

  function supportIssue(id, afterSupport) {
    const issue = issues.find((item) => item.id === id);
    if (!issue) return;
    const next = issues.map((item) => item.id === id ? { ...item, supports: item.supports + 1 } : item);
    if (commitIssues(next, "Support added in this browser only; it is not shared with a community service.")) {
      if (afterSupport) afterSupport();
      else if (page === "details") render();
      else updateTable();
    }
  }

  function followIssue(id) {
    const issue = issues.find((item) => item.id === id);
    if (!issue) return;
    const next = issues.map((item) => item.id === id ? { ...item, following: !item.following } : item);
    if (commitIssues(next, issue.following ? "Following this report in this browser." : "You unfollowed this report.")) render();
  }

  function showAccountPrototype() {
    document.getElementById("account-dialog").showModal();
  }

  document.querySelectorAll(".nav-item,[data-page='dashboard'],.brand").forEach((element) => {
    element.addEventListener("click", (event) => {
      event.preventDefault();
      goTo(element.dataset.page || "dashboard");
    });
  });
  document.getElementById("help-button").addEventListener("click", () => goTo("trust"));
  document.getElementById("account-signin").addEventListener("click", () => {
    document.getElementById("account-dialog-status").textContent = "Sign-in is unavailable: JanPramaan has no authentication server. No email or password is requested.";
  });
  document.getElementById("account-create").addEventListener("click", () => {
    document.getElementById("account-dialog-status").textContent = "Account creation is unavailable: JanPramaan has no protected account service. Submit a report without an account instead.";
  });
  render();
  if (storageReadError) toast("Saved browser data could not be read. Sample records are shown; check browser storage permissions. No saved report was intentionally cleared.");
  if (storageMigrationError) toast("Some browser records could not be migrated to the current format. They remain loaded for this session, and the original data is retained.");
}());
