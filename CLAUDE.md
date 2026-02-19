# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server on localhost:8080
npm run build      # Production build (Vite)
npm run build:dev  # Development build
npm run lint       # Run ESLint
npm run preview    # Preview production build locally
```

No test runner is configured in this project.

## Architecture Overview

Resume Architect is an AI-powered resume and cover letter generator. Users upload their resume PDF and a CSV of job listings, and the app generates tailored documents for each target role.

### Application Flow

1. User uploads a PDF resume → `PdfUploader` converts to base64 → `parse-resume-pdf` Supabase Edge Function → Gemini 2.5 Flash extracts structured `ParsedResumeData`
2. User uploads/enters jobs → `JobListUploader` parses CSV with smart column detection → `JobTarget[]`
3. User optionally uploads example style PDFs → `UploadExamples` sends them through `parse-resume-pdf` as reference prompts
4. User clicks Generate → `ResumeBuilder.handleGenerate()` loops through selected jobs → calls `generate-documents` Edge Function → Claude 3.5 Sonnet produces HTML documents
5. Settings are auto-saved to `recent_settings` Supabase table after generation
6. `DocumentPreview` renders output with print-to-PDF and ZIP download

### Key Files

- `src/components/resume/ResumeBuilder.tsx` — Main orchestrator; owns all state (`parsedResume`, `jobs`, `generatedDocs`, `exampleTexts`); drives the setup → preview tab flow
- `src/types/resume.ts` — All TypeScript interfaces (`ParsedResumeData`, `JobTarget`, `GeneratedDocument`, etc.)
- `src/integrations/supabase/client.ts` — Supabase client (anon key, localStorage session, no auth)
- `supabase/functions/parse-resume-pdf/index.ts` — Calls Lovable AI Gateway (`google/gemini-2.5-flash`) to extract structured JSON from a base64 PDF
- `supabase/functions/generate-documents/index.ts` — Calls Claude API (`anthropic/claude-3-5-sonnet`) with resume + job context to produce HTML resume/cover letter
- `src/integrations/supabase/types.ts` — Auto-generated Supabase DB types (do not edit manually)

### State Management

All app state lives in `ResumeBuilder.tsx` via `useState` — no global store. TanStack Query is available but not actively used for caching. Supabase session is persisted to `localStorage`.

### Supabase Setup

Environment variables (`.env`):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_PROJECT_ID=
```

Edge Functions need `LOVABLE_API_KEY` (for Gemini) and a Claude API key configured in Supabase project settings. RLS on `recent_settings` allows public read/insert/delete — no authentication is implemented.

Database tables: `recent_settings` (active), `skills` and `example_resumes` (created but unused).

### UI & Styling

- shadcn/ui components in `src/components/ui/` (40+ files)
- Tailwind CSS with dark mode via class strategy (`next-themes` provider)
- HSL design tokens in `src/index.css` — use these tokens (`bg-background`, `text-foreground`, etc.) rather than raw colors
- Path alias `@/` resolves to `src/`

### Unused / Stub Code

`supabase/functions/openai-webhook/` and `coverletter-webhook/` are unused. The `skills` and `example_resumes` DB tables have no frontend integration.
