---
name: resume-architect
description: AI-powered resume and cover letter generator. Upload a PDF resume + a list of target jobs (CSV or scraped from SEEK) and the app produces tailored, Word-compatible HTML documents in a polished two-column A4 design. Use when generating resumes, cover letters, tailoring applications to specific job descriptions, parsing resume PDFs, or scraping SEEK job listings.
---

# Resume Architect

End-to-end pipeline: **parse resume PDF → scrape / import target jobs → generate tailored resume + cover letter for each job in the Styalized design system**. The app is a Vite + React frontend backed by two Supabase Edge Functions and a single `recent_settings` table for replay.

## What This Skill Does

1. Accepts a candidate's resume PDF (drag-drop) and an optional portfolio JSON.
2. Parses the resume via `parse-resume-pdf` Edge Function (Lovable AI Gateway, `google/gemini-2.5-flash`).
3. Loads the four default style-example PDFs from `public/examples/` (cached in localStorage with a `v2_` prefix) as style references.
4. Lets the user add target jobs by either:
   - **CSV upload** (column auto-mapping for company / position / description / location / URL / workType / seniority / postedAt)
   - **SEEK scraping** via the Apify `websift~seek-job-scraper` actor (Full Actor mode for company-name fidelity)
5. Generates per-job documents via the `generate-documents` Edge Function:
   - **Stage 1** — `generateWithClaude` produces plain text (model `claude-sonnet-4-20250514`)
   - **Stage 2** — `formatWithClaude` wraps that text in HTML using the Styalized `cssFramework` + design-system prompts
6. Renders output in the Preview tab, lets the user download as `.doc` (Word MIME) or print-to-PDF, and exports a ZIP of all documents.
7. Auto-saves the candidate setup (parsed resume + jobs + doc type) to the `recent_settings` Supabase table for replay.

## Hard Rules

- The generated HTML is Word-compatible: no CSS variables at runtime (use direct hex), and every font family must be in the Google Fonts `<link>`.
- The two documents share one CSS framework string; the LLM picks the right components via the prompt.
- Referees are pre-built by `buildReferencesHTML` and pasted verbatim into the page-2 rail — the LLM is not allowed to drop them.
- `[PORTFOLIO: url]` markers in raw content are converted to inline `<a>` tags during formatting.
- The SEEK scraper must use the Full Actor (not the lite version) so `advertiser.name` is populated; jobs without a company name render as "Unknown Company" and the user can inline-edit.
- Cache invalidation for the default example PDFs: bumping the localStorage key prefix from `default_` to `default_vN_` is the supported way to ship new example content.

## Components

### Frontend (Vite + React + TypeScript)

- `src/components/resume/ResumeBuilder.tsx` — orchestrator; owns `parsedResume`, `jobs`, `generatedDocs`, `activeTab`
- `src/components/resume/PdfUploader.tsx` — resume PDF drag-drop + portfolio JSON loader
- `src/components/resume/JobListUploader.tsx` — CSV parsing, manual add, inline-editable company names
- `src/components/resume/JobScraper.tsx` — Apify SEEK scraper (form/url modes, subclass filters, polling)
- `src/components/resume/DocumentPreview.tsx` — renders generated HTML, download as `.doc` or ZIP
- `src/components/resume/RecentSettings.tsx` — loads/deletes `recent_settings` rows
- `src/hooks/useDefaultExamples.ts` — auto-loads the four default style PDFs from `public/examples/` and caches extracted text in localStorage

### Edge Functions (Deno)

- `supabase/functions/parse-resume-pdf/index.ts` — sends base64 PDF to Lovable AI Gateway, returns `ParsedResumeData`
- `supabase/functions/generate-documents/index.ts` — two-stage Claude pipeline: plain-text generation → HTML formatting with embedded `cssFramework`

### Database

- `recent_settings` (active) — public read/insert/delete, no auth
- `skills` and `example_resumes` (created, unused)

### Assets

- `public/examples/example-resume.pdf` — GPT content-style reference (unchanged)
- `public/examples/example-coverletter.pdf` — GPT content-style reference (unchanged)
- `public/examples/styled-resume.pdf` — Styalized design reference (the new design)
- `public/examples/styled-coverletter.pdf` — Styalized design reference (the new design)

## State Management

All app state lives in `ResumeBuilder.tsx` via `useState` — no global store. Supabase session is persisted to `localStorage`. The `JobScraper` keeps its own local state for credentials, subclass selection, scraping status, and active run IDs (persisted to `localStorage` keys `apify_api_token` / `apify_username`).

## Supabase Setup

Environment variables (`.env`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Edge Function secrets (set in Supabase project settings, not Vercel env):
- `LOVABLE_API_KEY` — required by `parse-resume-pdf`
- `ANTHROPIC_API_KEY` — required by `generate-documents`

## Available Scripts

```bash
npm run dev        # Start dev server on localhost:8080 (Vite, IPv6 host)
npm run build      # Production build (Vite)
npm run build:dev  # Development build
npm run lint       # Run ESLint (TS + React Hooks + react-refresh)
npm run preview    # Preview production build locally
```

No test runner is configured. No `typecheck` script — use `npm run build` (which runs `tsc` via Vite's pipeline) to catch type errors.

## Unused / Stub Code

- `supabase/functions/openai-webhook/` and `coverletter-webhook/` are unused.
- The `skills` and `example_resumes` DB tables have no frontend integration.
- The `Open Design/` subdirectory at the repo root contains an unrelated checkout — leave it alone.
- The `UploadExamples` component is present but not mounted; the app uses the cached defaults from `useDefaultExamples`.

## See Also

- `references/architecture.md` — full pipeline diagram and data-flow
- `references/data-structures.md` — TypeScript interfaces (`ParsedResumeData`, `JobTarget`, etc.)
- `references/styalized-design-system.md` — design tokens, fonts, and component class reference
- `references/apify-seek-actor.md` — SEEK scraper config and field-mapping notes
- `../references/skills/resume-formatter/SKILL.md` — the formatter skill that drives the document layout
- `../references/skills/cover-letter-formatter/SKILL.md` — the cover-letter formatter skill
- `../references/skills/dbs-framework/SKILL.md` — the DBS framework used to organize this project
- `../references/skills/skill-prompter-jgcao/SKILL.md` — the JGCAO prompt format for future requests
