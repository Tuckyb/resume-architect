# Edge Function: generate-documents

Single structured-content pipeline. One Claude call per document (forced
tool-use, schemas in `../supabase/functions/_shared/contentSchemas.ts`)
returns content JSON; the deterministic renderer in
`../supabase/functions/_shared/styalized.ts` validates it and assembles the
final Styalized HTML. The model never authors CSS, layout, identity/contact
details, dates, or references — those are injected programmatically.

## Endpoint

`POST /functions/v1/generate-documents`

## Request

```typescript
interface RequestData {
  parsedResumeData: ParsedResumeData;
  jobTarget: JobTarget;
  documentType: "resume" | "cover-letter" | "both";
  exampleResumeText?: string | null;      // content/tone reference only
  exampleCoverLetterText?: string | null; // content/tone reference only
  portfolioJson?: Record<string, unknown> | null;
}
```

Legacy `styledResumeText` / `styledCoverLetterText` fields are tolerated but
ignored — the visual design is no longer inferred from example text.

## Response

```json
{
  "success": true,
  "documents": [
    {
      "type": "resume",
      "rawContent": "{ ...structured content JSON (debugging aid)... }",
      "htmlContent": "<!DOCTYPE html>..."
    }
  ],
  "message": "Generated 1 document(s)"
}
```

`htmlContent` is always a complete, self-contained Styalized document:
resume = exactly two A4 `<section class="sheet">` pages; cover letter = one.

## Error handling

- Missing/truncated tool output → one retry, then 500 with a clear message.
- Content validation failures (no jobs / profile / paragraphs) → 500.
- The frontend skips failed jobs and continues the batch.

## Source

- `../supabase/functions/generate-documents/index.ts` — orchestration + Claude call
- `../supabase/functions/_shared/styalized.ts` — CSS framework + renderer + validators
- `../supabase/functions/_shared/contentSchemas.ts` — tool schemas (prompt-engineering surface)

## Required Secrets

- `ANTHROPIC_API_KEY`

## Deploy

```bash
supabase functions deploy generate-documents
```
