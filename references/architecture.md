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
│ useDefaultExamples hook (localStorage cache, v2_)    │
│  → loads /examples/{example,styled}-{resume,         │
│    coverletter}.pdf                                  │
│  → runs them through parse-resume-pdf               │
│  → passes extracted text as style references        │
└──────────────────────────────────────────────────────┘
        │
        │ (parsedResume + selectedJobs + style refs)
        ▼
┌──────────────────────────────────────────────────────┐
│ Supabase Edge Function: generate-documents          │
│   Stage 1: generateWithClaude (claude-sonnet-4)      │
│     → plain text resume / cover letter              │
│   Stage 2: formatWithClaude (claude-sonnet-4)        │
│     → HTML wrapped in cssFramework                   │
│     → [PORTFOLIO: url] → <a> conversion             │
│     → pre-built referee HTML pasted in              │
└──────────────────────────────────────────────────────┘
        │
        │ { type, rawContent, htmlContent }[]
        ▼
┌──────────────────────────────────────────────────────┐
│ DocumentPreview.tsx                                 │
│   → renders HTML in <ScrollArea> via                │
│     dangerouslySetInnerHTML                          │
│   → per-doc download (.doc blob, msword MIME)       │
│   → print-to-PDF via window.print()                  │
│   → JSZip of all documents                           │
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

- **Resume text cache** — `localStorage` keys `default_v2_example_resume`, `default_v2_example_coverletter`, `default_v2_styled_resume`, `default_v2_styled_coverletter`. Bump the `v2` prefix to invalidate when the example PDFs change.
- **Apify credentials** — `localStorage` keys `apify_api_token`, `apify_username`.
- **Supabase session** — `localStorage` (default Supabase auth client behaviour).
- **Parsed resume** — kept in `ResumeBuilder` state only; not persisted. To replay, hit `RecentSettings` or re-upload the PDF.
