# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on localhost:8080 (Vite, IPv6 host)
npm run build      # Production build (Vite)
npm run build:dev  # Development build
npm run lint       # Run ESLint (TS + React Hooks + react-refresh)
npm run preview    # Preview production build locally
```

No test runner is configured. No `typecheck` script — use `npm run build` (which runs `tsc` via Vite's pipeline) to catch type errors.

## Architecture Overview

Resume Architect is an AI-powered resume and cover letter generator. Users upload their resume PDF (and optionally a portfolio JSON) plus a CSV / scraped list of job listings, and the app generates tailored, Word-compatible HTML resume/cover letter pairs for each target role.

### Application Flow

The UI is a three-tab flow (`activeTab` state in `ResumeBuilder`): **Setup / Scrapers / Preview**.

1. **Setup tab** — `PdfUploader` accepts a drag-and-drop PDF, base64-encodes it, and POSTs to the `parse-resume-pdf` Edge Function. The Edge Function sends the PDF as a base64 `data:application/pdf` image_url to the Lovable AI Gateway (model `google/gemini-2.5-flash`) which returns a structured `ParsedResumeData` JSON. `JobListUploader` parses a CSV of jobs into `JobTarget[]` (also supports manual add and in-place editing of rows).
2. **Default style examples** are loaded automatically on mount by `src/hooks/useDefaultExamples.ts`. On first visit it fetches the four default PDFs from `/examples/*.pdf` (in `public/examples/`), runs each through `parse-resume-pdf`, and caches the extracted text in `localStorage` (keys: `default_example_resume`, `default_example_coverletter`, `default_styled_resume`, `default_styled_coverletter`). All four are passed to the generation function as style references.
3. **Scrapers tab** — `JobScraper` (≈1000 lines) drives the `websift/seek-job-scraper` Apify actor to pull live SEEK job listings, with marketing-subclass filters (6009–6021), form/URL modes, location/workType filters, and run-status polling. Results merge into the shared `jobs` state.
4. User clicks Generate → `ResumeBuilder.handleGenerate()` loops through `selectedJobs` and calls the `generate-documents` Edge Function for each. That function makes **two** sequential Claude calls per document: `generateWithClaude` produces plain-text content (model `claude-sonnet-4-20250514`), then `formatWithClaude` wraps that content in Word-compatible inline-CSS HTML using a bundled CSS framework (`resumeCssFramework` or `coverLetterCssFramework`).
5. After generation, settings are auto-saved to the `recent_settings` Supabase table; `RecentSettings` lets the user re-load a prior setup (parsed resume + jobs + document type).
6. **Preview tab** — `DocumentPreview` groups output by job, renders HTML in a `ScrollArea` via `dangerouslySetInnerHTML`, and provides per-document download (`.doc` blob, MIME `application/msword`) plus print-to-PDF and a JSZip of all documents.

### Key Files

- `src/components/resume/ResumeBuilder.tsx` — Main orchestrator; owns all state (`parsedResume`, `jobs`, `generatedDocs`, `portfolioJson`, `activeTab`); drives the three-tab flow
- `src/components/resume/PdfUploader.tsx` — Resume PDF drag-drop + portfolio JSON loader
- `src/components/resume/JobListUploader.tsx` — CSV parsing, manual job add, editable rows
- `src/components/resume/JobScraper.tsx` — Apify SEEK scraper UI (form/url modes, subclass filters, polling)
- `src/components/resume/UploadExamples.tsx` — Standalone component for user-supplied example PDFs; not currently mounted in `ResumeBuilder` (defaults from `useDefaultExamples` are the only style references used in the active flow)
- `src/components/resume/RecentSettings.tsx` — Loads/deletes `recent_settings` rows
- `src/components/resume/DocumentPreview.tsx` — Renders generated HTML, downloads as `.doc` or ZIP
- `src/hooks/useDefaultExamples.ts` — Auto-loads and `localStorage`-caches the four default style PDFs from `public/examples/`
- `src/types/resume.ts` — All TypeScript interfaces (`ParsedResumeData`, `JobTarget`, `GeneratedDocument`, `PersonalInfo`, `WorkExperience`, etc.)
- `src/integrations/supabase/client.ts` — Supabase client (anon key, localStorage session, no auth)
- `supabase/functions/parse-resume-pdf/index.ts` — Sends base64 PDF to Lovable AI Gateway (`google/gemini-2.5-flash`); returns structured `ParsedResumeData`
- `supabase/functions/generate-documents/index.ts` — Two-stage Claude pipeline (`claude-sonnet-4-20250514`): plain-text generation → Word-compatible HTML formatting. Has a large embedded CSS framework string for both resume and cover letter layouts.
- `src/integrations/supabase/types.ts` — Auto-generated Supabase DB types (do not edit manually)

### State Management

All app state lives in `ResumeBuilder.tsx` via `useState` — no global store. TanStack Query is installed but not actively used for caching. Supabase session is persisted to `localStorage`. The `JobScraper` keeps its own local state for credentials, subclass selection, scraping status, and active run IDs (persisted to `localStorage` keys `apify_api_token` / `apify_username`).

### Supabase Setup

Environment variables (`.env`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Edge Function secrets (set in Supabase project settings, not Vercel env):
- `LOVABLE_API_KEY` — required by `parse-resume-pdf`
- `ANTHROPIC_API_KEY` — required by `generate-documents`

RLS on `recent_settings` allows public read/insert/delete — no authentication is implemented. Database tables: `recent_settings` (active), `skills` and `example_resumes` (created but unused).

### Generation Output

The Edge Function now produces a "Styalized" two-column A4 design. Source of truth for the design system is the workspace-root SKILL packages (already unzipped for reference at `../references/skills/resume-formatter/SKILL.md` and `../references/skills/cover-letter-formatter/SKILL.md`). The public examples in `public/examples/styled-resume.pdf` and `public/examples/styled-coverletter.pdf` match those SKILLs.

- **Design tokens** (embedded as direct hex values, no CSS variables): `--ink` `#0D1B2A`, `--paper` `#FAFAF7`, `--signal` `#1E3A5F` (italic org names, section labels, callout borders), `--signal-soft` `#E8EEF5` (achievement backgrounds), `--n-900` `#1A1F26`, `--n-700` `#3D4550`, `--n-500` `#6B7380`, `--n-300` `#C8CCD1`, `--n-100` `#ECEDEF`
- **Fonts** (Google Fonts, linked in `<head>`): Source Serif 4 (display — name, org names, monogram), Inter Tight (body — UI text), JetBrains Mono (mono — contact bar, dates, tool tags)
- **Resume classes**: `.sheet` (210mm × 297mm A4 page), `.layout` (flex row), `.rail` (32% sidebar), `main` (content), `.masthead` / `.masthead__name` / `.masthead__role` / `.masthead__rule` / `.masthead__monogram`, `.contact span b`, `.sec` / `.sec__label`, `.cap` / `.cap__title` / `.cap__items`, `.tools span` (rounded mono pills), `.lead`, `.job` / `.job__head` / `.job__title` / `.job__date` / `.job__org` (italic Source Serif 4 Signal blue), `.points li::before` (dash-rule prefix), `.job__win` (callout with left blue border + soft blue bg), `.edu` / `.edu__deg` / `.edu__meta` / `.edu__note` / `.honor`, `ul.plain li` (certifications with bottom rules), `.ref` / `.ref__name` / `.ref__role`, `.note` (community/cultural block), `.sheet__footer` (PAGE 0X OF 02)
- **Cover letter classes**: reuses the masthead/contact/footer from the resume, then `.letter` / `.letter__meta` (recipient left, date right) / `.letter__recipient strong` / `.letter__date` / `.letter__salutation` / `.letter__body p` / `.letter__body p strong` / `.letter__closing` / `.sig-name` (Source Serif 4) / `.sig-role` (signal blue uppercase)
- The two documents share one CSS framework string (`cssFramework` in the Edge Function); the LLM picks the right components via the prompt
- `[PORTFOLIO: url]` markers in raw content are converted to inline `<a>` tags (`color:#2a5db0; text-decoration:underline;`) during the formatting stage
- References are pre-built by `buildReferencesHTML` and pasted verbatim into the page-2 rail so the LLM never omits them
- The resume is exactly two `<section class="sheet">` elements (page 1 + page 2); page 1 carries the masthead and main experience, page 2 continues experience in `main` and carries Education / Certifications / Referees in the rail
- Cover letter opening rule: never start with "I" — lead with a concept or the org's mission

### UI & Styling

- shadcn/ui components in `src/components/ui/` (40+ files)
- Tailwind CSS with dark mode via class strategy (`next-themes` provider)
- HSL design tokens in `src/index.css` — use these tokens (`bg-background`, `text-foreground`, etc.) rather than raw colors
- Path alias `@/` resolves to `src/`
- Default style-example PDFs live in `public/examples/` (served at `/examples/*.pdf`) and are loaded by `useDefaultExamples` — add or swap files there to change the default style references. The four expected filenames: `example-resume.pdf`, `example-coverletter.pdf`, `styled-resume.pdf`, `styled-coverletter.pdf`

### Unused / Stub Code

`supabase/functions/openai-webhook/` and `coverletter-webhook/` are unused. The `skills` and `example_resumes` DB tables have no frontend integration. The `Open Design/` subdirectory at the repo root contains an unrelated open-design-main checkout — leave it alone. The `UploadExamples` component is present but not mounted; the app uses the cached defaults from `useDefaultExamples` instead.

### DBS Framework

This project is organized around the **DBS framework** (Direction / Blueprints / Solutions):

```
resume-architect/
├── SKILL.md              ← DIRECTION: project-level workflow
├── references/           ← BLUEPRINTS: architecture, data structures, design system, scraper config
└── scripts/              ← SOLUTIONS: edge-function docs, cache-bust helper
```

And the project's skills library at `../references/skills/`:

```
references/skills/
├── dbs-framework/         ← Meta-skill: how to build skills with DBS
├── skill-prompter-jgcao/  ← Meta-skill: structured prompts (J/G/C/A/O)
├── resume-formatter/      ← Resume design system
└── cover-letter-formatter/← Cover-letter design system
```

Each skill follows `SKILL.md` (workflow) + `references/` (knowledge) + `scripts/` (precision code) per the DBS spec. The two meta-skills (`dbs-framework` and `skill-prompter-jgcao`) are also registered as Claude Code skills in `../.claude/skills/` so they can be invoked via slash command.

### Skill Prompter (JGCAO)

Future requests can be phrased in **JGCAO format** (Job Title / Goal / Context / Action / Output) and the `skill-prompter-jgcao` skill will load automatically. Example:

```
JOB TITLE: Senior Frontend Engineer
GOAL: Add a "preview before generate" button to the Setup tab
CONTEXT: ResumeBuilder.tsx is the orchestrator; ResumeBuilder.generatedDocs is currently undefined until Generate is clicked
ACTION: 1. Add a useMemo that builds a preview-only HTML using cssFramework, 2. Wire to a Button, 3. Show in a Dialog
OUTPUT: Modified ResumeBuilder.tsx + new PreviewDialog component, in a code block
```

For full DBS / JGCAO docs, see the `SKILL.md` files inside each skill folder under `../references/skills/`.
