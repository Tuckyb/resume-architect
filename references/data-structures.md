# Data Structures

The TypeScript interfaces that flow through the pipeline. Source of truth: `src/types/resume.ts` and the inline interfaces in `src/components/resume/JobScraper.tsx`.

## ParsedResumeData

Returned by the `parse-resume-pdf` Edge Function. Stored in `ResumeBuilder` state.

```typescript
interface ParsedResumeData {
  rawText: string;
  personalInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedIn?: string;
    portfolio?: string;
  };
  workExperience?: Array<{
    id: string;
    title: string;
    company: string;
    period: string;
    responsibilities: string[];
  }>;
  education?: Array<{
    id: string;
    degree: string;
    institution: string;
    period: string;
    achievements?: string[];
  }>;
  skills?: Array<{
    category: string;
    items: string[];
  }>;
  certifications?: string[];
  achievements?: string[];
  references?: Reference[];
}

interface Reference {
  name: string;
  title: string;
  contact: string;
}
```

## JobTarget

A single target job. Source: CSV row, manual add, or Apify scraper result.

```typescript
interface JobTarget {
  id: string;
  companyName: string;     // "Unknown Company" placeholder if missing
  companyUrl?: string;
  position: string;        // "Unknown Position" placeholder if missing
  jobDescription: string;
  location?: string;
  workType?: string;       // "Full Time", "Part Time", "Contract", etc.
  seniority?: string;
  postedAt?: string;
  selected: boolean;       // checkbox in the Setup tab
}
```

## GeneratedDocument

Output of the `generate-documents` Edge Function. Stored in `ResumeBuilder.generatedDocs` and rendered in `DocumentPreview`.

```typescript
interface GeneratedDocument {
  type: "resume" | "cover-letter";
  rawContent: string;     // plain text from Stage 1
  htmlContent: string;    // final HTML from Stage 2
  jobId: string;          // joins to JobTarget.id
  companyName: string;    // denormalized for grouping
  position: string;
}
```

## RequestData (Edge Function input)

```typescript
interface RequestData {
  parsedResumeData: ParsedResumeData;
  jobTarget: JobTarget;
  documentType: "resume" | "cover-letter" | "both";
  exampleResumeText?: string | null;          // from useDefaultExamples cache
  exampleCoverLetterText?: string | null;    // from useDefaultExamples cache
  styledResumeText?: string | null;          // from useDefaultExamples cache
  styledCoverLetterText?: string | null;     // from useDefaultExamples cache
  portfolioJson?: Record<string, unknown> | null;
}
```

## ApifyJobItem (Scraper)

Mirrors the Full Actor response. The `pickCompanyName()` helper tries `advertiser.name` first, then `companyProfile.name`, then `recruiterProfile.agencyName`. See `../references/apify-seek-actor.md` for the full field map.

```typescript
interface ApifyJobItem {
  id: string;
  title: string;
  salary?: string;
  workTypes?: string[];
  advertiser?: { name?: string };
  companyProfile?: { name?: string };
  recruiterProfile?: { agencyName?: string };
  joblocationInfo?: { locations?: Array<{ label?: string }> };
  classificationInfo?: { classification?: { description?: string }; subClassification?: { description?: string } };
  listedAt?: string;
  jobLink?: string;
  content?: string | { text?: string };
}
```

## localStorage Keys

| Key | Type | Purpose |
|---|---|---|
| `default_v2_example_resume` | string (parsed PDF text) | Content-style reference for resumes |
| `default_v2_example_coverletter` | string (parsed PDF text) | Content-style reference for cover letters |
| `default_v2_styled_resume` | string (parsed PDF text) | Layout-style reference for resumes |
| `default_v2_styled_coverletter` | string (parsed PDF text) | Layout-style reference for cover letters |
| `apify_api_token` | string | Apify API token (user-supplied) |
| `apify_username` | string | Apify username (for run status display) |
| `sb-<project>-auth-token` | JSON | Supabase session (default) |
