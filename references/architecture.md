# Architecture

End-to-end data flow for Resume Architect.

```
                ┌─────────────────────────┐
                │  User (Browser)         │
                │  ResumeBuilder.tsx      │
                │  (3 tabs: Setup /       │
                │   Scrapers / Preview)   │
                └─────────────────────────┘
                          │
        ┌─────────────────┼────────────────────┐
        │                 │                    │
        ▼                 ▼                    ▼
┌──────────────┐  ┌─────────────────┐  ┌────────────────┐
│ PdfUploader  │  │ JobListUploader │  │ JobScraper     │
│ (resume PDF) │  │ (CSV / manual)  │  │ (Apify SEEK)   │
└──────────────┘  └─────────────────┘  └────────────────┘
        │                 │                    │
        │ base64          │ JobTarget[]        │ mapped JobTarget[]
        ▼                 ▼                    ▼
┌──────────────────────────────────────────────────────┐
│ Supabase Edge Function: parse-resume-pdf            │
│  → Lovable AI Gateway (gemini-2.5-flash)            │
│  → returns ParsedResumeData                          │
└──────────────────────────────────────────────────────┘
        │
        │ ParsedResumeData
        ▼
┌──────────────────────────────────────────────────────┐
│ useDefaultExamples hook (localStorage cache, v3_)    │
│  → loads /examples/example-{resume,coverletter}.pdf  │
│  → runs them through parse-resume-pdf               │
│  → passes extracted text as CONTENT/tone references  │
│    (visual design is deterministic, see below)       │
└──────────────────────────────────────────────────────┘
        │
        │ (parsedResume + selectedJobs + content refs)
        ▼
┌──────────────────────────────────────────────────────┐
│ Supabase Edge Function: generate-documents          │
│   One Claude call (claude-sonnet-4, forced tool-use) │
│     → structured content JSON (contentSchemas.ts)    │
│   Deterministic renderer (_shared/styalized.ts)      │
│     → validates content, renders Styalized HTML      │
│     → CSS framework + chrome + referees injected     │
│       programmatically (never LLM-authored)          │
│     → [PORTFOLIO: url] → <a> conversion             │
└──────────────────────────────────────────────────────┘
        │
        │ { type, rawContent: structured JSON, htmlContent }[]
        ▼
┌──────────────────────────────────────────────────────┐
│ DocumentPreview.tsx                                 │
│   → sandboxed <iframe srcDoc> preview               │
│   → Download PDF (hidden-iframe print → Save as PDF)│
│   → Download HTML (self-contained .html)             │
│   → JSZip of all documents (.html)                   │
└──────────────────────────────────────────────────────┘
        │
        │ (auto-save on Generate)
        ▼
┌──────────────────────────────────────────────────────┐
│ Supabase table: recent_settings                     │
│  → public read/insert/delete, no auth                │
│  → RecentSettings.tsx for replay                    │
└──────────────────────────────────────────────────────┘
```

## Tab Boundaries

- **Setup tab** — `PdfUploader` + `JobListUploader`. Drives the "what's your resume" + "what jobs do you want" inputs.
- **Scrapers tab** — `JobScraper` for live SEEK runs. Results merge into the shared `jobs` state.
- **Preview tab** — `DocumentPreview` for output, plus `RecentSettings` for loading prior setups.

## Caching

- **Resume text cache** — `localStorage` keys `default_v3_example_resume`, `default_v3_example_coverletter` (content/tone references only). Bump the `v3` prefix to invalidate when the example PDFs change. The styled design PDFs are no longer parsed — the design is rendered deterministically by `supabase/functions/_shared/styalized.ts`.
- **Apify credentials** — `localStorage` keys `apify_api_token`, `apify_username`.
- **Supabase session** — `localStorage` (default Supabase auth client behaviour).
- **Parsed resume** — kept in `ResumeBuilder` state only; not persisted. To replay, hit `RecentSettings` or re-upload the PDF.
