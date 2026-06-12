# Edge Function: parse-resume-pdf

Sends a base64-encoded PDF to the Lovable AI Gateway (model `google/gemini-2.5-flash`) and returns structured `ParsedResumeData`.

## Endpoint

`POST /functions/v1/parse-resume-pdf`

## Request

```json
{
  "pdfBase64": "<base64-encoded PDF bytes>",
  "fileName": "resume.pdf"
}
```

## Response

```json
{
  "rawText": "full extracted text...",
  "personalInfo": {
    "fullName": "...",
    "email": "...",
    "phone": "...",
    "address": "...",
    "linkedIn": "...",
    "portfolio": "..."
  },
  "workExperience": [...],
  "education": [...],
  "skills": [...],
  "certifications": [...],
  "achievements": [...],
  "references": [...]
}
```

## Source

`../supabase/functions/parse-resume-pdf/index.ts`

## Required Secrets

- `LOVABLE_API_KEY`
