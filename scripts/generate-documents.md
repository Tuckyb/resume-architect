# Edge Function: generate-documents

Two-stage Claude pipeline. Stage 1 produces plain text; Stage 2 wraps it in Word-compatible HTML using the Styalized `cssFramework`.

## Endpoint

`POST /functions/v1/generate-documents`

## Request

```typescript
interface RequestData {
  parsedResumeData: ParsedResumeData;
  jobTarget: JobTarget;
  documentType: "resume" | "cover-letter" | "both";
  exampleResumeText?: string | null;
  exampleCoverLetterText?: string | null;
  styledResumeText?: string | null;
  styledCoverLetterText?: string | null;
  portfolioJson?: Record<string, unknown> | null;
}
```

## Response

```json
{
  "success": true,
  "documents": [
    {
      "type": "resume",
      "rawContent": "...",
      "htmlContent": "<!DOCTYPE html>..."
    },
    {
      "type": "cover-letter",
      "rawContent": "...",
      "htmlContent": "<!DOCTYPE html>..."
    }
  ],
  "message": "Generated 2 document(s)"
}
```

## Source

`../supabase/functions/generate-documents/index.ts`

## Required Secrets

- `ANTHROPIC_API_KEY`
