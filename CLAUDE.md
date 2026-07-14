# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server on localhost:8080 (host ::)
npm run build      # Production build (also runs TypeScript checking via Vite)
npm run build:dev  # Development build
npm run lint       # ESLint (TS + React Hooks + react-refresh)
npm run preview    # Preview production build locally
```

No test runner is configured. There is no dedicated `typecheck` script — run `npm run build` to surface TypeScript errors.

## Architecture Overview

Resume Architect is an AI-powered resume and cover letter generator. Users upload a resume PDF (and optionally a portfolio JSON) plus a CSV or scraped list of job listings, and the app generates tailored, Word-compatible HTML resume/cover letter pairs for each target role.

### Application Flow

The UI is a three-tab flow controlled by `activeTab` in `ResumeBuilder.tsx`: **Setup / Scrapers / Preview**.

1. **Setup tab** — `PdfUploader` accepts a drag-and-drop PDF, base64-encodes it, and POSTs to the `parse-resume-pdf` Edge Function. The Edge Function sends the PDF as a base64 `data:application/pdf` `image_url` to the Lovable AI Gateway (model `google/gemini-2.5-flash`) and returns a structured `ParsedResumeData` JSON. `JobListUploader` parses a CSV of jobs into `JobTarget[]` and also supports manual add and in-place editing of rows.
2. **Default content examples** are loaded automatically on mount by `src/hooks/useDefaultExamples.ts`. On first visit it fetches the two content-example PDFs from `/examples/example-*.pdf` (in `public/examples/`), runs each through `parse-resume-pdf`, and caches the extracted text in `localStorage` (keys: `default_v3_example_resume`, `default_v3_example_coverletter`). They are passed to the generation function as tone/content references only — the visual design is rendered deterministically server-side and never inferred from example text.
3. **Scrapers tab** — `JobScraper` drives the `websift/seek-job-scraper` Apify actor to pull live SEEK job listings, with marketing-subclass filters (6009–6021), form/URL modes, location/workType filters, and run-status polling. Results merge into the shared `jobs` state.
4. **Generate** — `ResumeBuilder.handleGenerate()` loops through `selectedJobs` and calls the `generate-documents` Edge Function for each. That function makes **one** Claude call per document (model `claude-sonnet-4-20250514`, forced tool-use against the schemas in `supabase/functions/_shared/contentSchemas.ts`) which returns structured content JSON. The deterministic renderer in `supabase/functions/_shared/styalized.ts` validates the content and assembles the final Styalized HTML — the model never authors CSS, layout, identity/contact details, dates, or references.
5. After generation, settings are auto-saved to the `recent_settings` Supabase table; `RecentSettings` lets the user re-load a prior setup (parsed resume + jobs + document type).
6. **Preview tab** — `DocumentPreview` groups output by job, renders each document in a sandboxed `<iframe srcDoc>` (accurate fonts, no app-CSS bleed), and provides **Download PDF** (hidden-iframe print → browser Save as PDF, pixel-faithful via the framework's `@page A4` rules), **Download HTML**, and a JSZip of all documents as `.html`. There is no Word/.doc export — Word cannot render the Styalized design (flexbox, web fonts, `@page`).

### Key Files

- `src/components/resume/ResumeBuilder.tsx` — Main orchestrator; owns all state (`parsedResume`, `jobs`, `generatedDocs`, `portfolioJson`, `activeTab`); drives the three-tab flow
- `src/components/resume/PdfUploader.tsx` — Resume PDF drag-drop + portfolio JSON loader
- `src/components/resume/JobListUploader.tsx` — CSV parsing, manual job add, editable rows
- `src/components/resume/JobScraper.tsx` — Apify SEEK scraper UI (form/url modes, subclass filters, polling)
- `src/components/resume/RecentSettings.tsx` — Loads/deletes `recent_settings` rows
- `src/components/resume/DocumentPreview.tsx` — iframe preview; Download PDF (print) / Download HTML / ZIP
- `src/hooks/useDefaultExamples.ts` — Auto-loads and `localStorage`-caches the two content-example PDFs from `public/examples/`; owns the `ExampleTexts` type
- `src/types/resume.ts` — All TypeScript interfaces (`ParsedResumeData`, `JobTarget`, `GeneratedDocument`, `PersonalInfo`, `WorkExperience`, etc.)
- `src/integrations/supabase/client.ts` — Supabase client (anon key, localStorage session, no auth)
- `supabase/functions/parse-resume-pdf/index.ts` — Sends base64 PDF to Lovable AI Gateway (`google/gemini-2.5-flash`); returns structured `ParsedResumeData`
- `supabase/functions/generate-documents/index.ts` — Single structured-content Claude call (`claude-sonnet-4-20250514`, forced tool-use) + deterministic rendering
- `supabase/functions/_shared/styalized.ts` — **Design-system source of truth in code**: verbatim Styalized CSS framework, `renderResume` / `renderCoverLetter`, HTML escaping + inline portfolio-link handling, content validators
- `supabase/functions/_shared/contentSchemas.ts` — Anthropic tool schemas for resume / cover-letter content (the prompt-engineering surface)
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

The Edge Function produces the "Styalized" two-column A4 design **deterministically** — the full CSS framework, HTML skeletons, and content validators live in `supabase/functions/_shared/styalized.ts`, which mirrors the SKILL packages (unzipped for reference at `../references/skills/resume-formatter/SKILL.md` and `../references/skills/cover-letter-formatter/SKILL.md`). The approved examples in `public/examples/styled-resume.pdf` and `public/examples/styled-coverletter.pdf` are the visual benchmark; the renderer is validated against them via `validation/` (see `validation/README.md`). Design changes are made in `_shared/styalized.ts` and redeployed — never via prompts.

- **Design tokens** (embedded as direct hex values, no CSS variables): `--ink` `#0D1B2A`, `--paper` `#FAFAF7`, `--signal` `#1E3A5F` (italic org names, section labels, callout borders), `--signal-soft` `#E8EEF5` (achievement backgrounds), `--n-900` `#1A1F26`, `--n-700` `#3D4550`, `--n-500` `#6B7380`, `--n-300` `#C8CCD1`, `--n-100` `#ECEDEF`, `--link` `#2a5db0`
- **Fonts** (Google Fonts, linked in `<head>`): Source Serif 4 (display — name, org names, monogram), Inter Tight (body — UI text), JetBrains Mono (mono — contact bar, dates, tool tags)
- **Resume classes**: `.sheet` (210mm × 297mm A4 page), `.layout` (flex row), `.rail` (32% sidebar), `main` (content), `.masthead` / `.masthead__name` / `.masthead__role` / `.masthead__rule` / `.masthead__monogram`, `.contact span b`, `.sec` / `.sec__label`, `.cap` / `.cap__title` / `.cap__items`, `.tools span` (rounded mono pills), `.lead`, `.job` / `.job__head` / `.job__title` / `.job__date` / `.job__org` (italic Source Serif 4 Signal blue), `.points li::before` (dash-rule prefix), `.job__win` (callout with left blue border + soft blue bg), `.edu` / `.edu__deg` / `.edu__meta` / `.edu__note` / `.honor`, `ul.plain li` (certifications with bottom rules), `.ref` / `.ref__name` / `.ref__role`, `.note` (community/cultural block), `.sheet__footer` (PAGE 0X OF 02)
- **Cover letter classes**: reuses the masthead/contact/footer from the resume, then `.letter` / `.letter__meta` (recipient left, date right) / `.letter__recipient strong` / `.letter__date` / `.letter__salutation` / `.letter__body p` / `.letter__body p strong` / `.letter__closing` / `.sig-name` (Source Serif 4) / `.sig-role` (signal blue uppercase)
- The two documents share one CSS framework string (`cssFramework` in `_shared/styalized.ts`); the renderer picks the right components — the LLM only supplies content fields
- **Portfolio links** are emitted by the model as `[PORTFOLIO_LINK text="Descriptive phrase" url="https://...#anchor"]`; `renderInline` converts these to inline `<a>` tags (`color:#2a5db0; text-decoration:underline;`). A legacy `[PORTFOLIO: url]` form is still parsed but should not be used in new prompts. All other text is HTML-escaped (only balanced `<strong>` survives).
- References are rendered by `renderReferences` directly from `parsedResumeData.references` into the page-2 rail — the LLM never sees or emits them
- The resume is exactly two `<section class="sheet">` elements (page 1 + page 2); page 1 carries the masthead and main experience, page 2 continues experience in `main` and carries Education / Certifications / Referees in the rail
- Cover letter opening rule: never start with "I" — lead with a concept or the org's mission

### UI & Styling

- shadcn/ui components in `src/components/ui/` (40+ files)
- Tailwind CSS with dark mode via class strategy (`next-themes` provider)
- HSL design tokens in `src/index.css` — use these tokens (`bg-background`, `text-foreground`, etc.) rather than raw colors
- Path alias `@/` resolves to `src/`
- `public/examples/` holds: `example-resume.pdf` + `example-coverletter.pdf` (content/tone references, parsed at runtime by `useDefaultExamples`) and `styled-resume.pdf` + `styled-coverletter.pdf` (the approved visual benchmark — not parsed at runtime; used by the `validation/` harness)

### Cache Invalidation

When the content-example PDFs in `public/examples/` change, bump the `v3` prefix in `src/hooks/useDefaultExamples.ts`:

1. Change the two `CACHE_KEYS` values from `default_v3_*` to `default_vN_*` (e.g. `default_v4_*`).
2. Add the old `default_v3_*` keys to `LEGACY_KEYS` so they are cleaned up on next load.

The styled design PDFs are **never** parsed at runtime, so they do not need a cache bump.

### Development Workflow

After code changes, run:

```bash
npm run lint && npm run build
```

To validate renderer changes against the approved PDF benchmark, use the harness in `validation/README.md` (Deno + headless Edge print-to-PDF).

### Unused / Stub Code

The `skills` and `example_resumes` DB tables have no frontend integration. The `Open Design/` subdirectory at the repo root contains an unrelated open-design-main checkout (gitignored) — leave it alone. (Removed in the design-system migration: the `openai-webhook` / `coverletter-webhook` Edge Function stubs, the unmounted `UploadExamples` component, the `.doc`/msword export, and the styled-PDF text-extraction pathway.)

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
