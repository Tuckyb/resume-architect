# Apify SEEK Scraper

The `JobScraper` component drives the Apify actor `websift~seek-job-scraper` to pull live SEEK job listings. This file documents the actor config, the Full-vs-Lite trade-off, and the company-name resolution helper.

## Actor: `websift~seek-job-scraper`

Two modes:

- **Full Actor** (recommended) — returns `advertiser.name`, `companyProfile.name`, `recruiterProfile.agencyName`, full job descriptions, classification metadata
- **Lite** — fewer fields, sometimes missing company name

The `JobScraper` UI offers both modes. Default to Full Actor for company-name fidelity.

## Run Lifecycle

1. **Start** — POST to `https://api.apify.com/v2/acts/websift~seek-job-scraper/runs?token=<token>` with the actor input below.
2. **Poll** — GET `https://api.apify.com/v2/acts/websift~seek-job-scraper/runs/<runId>?token=<token>` every 5s until `status` is `SUCCEEDED`, `FAILED`, `ABORTED`, or `TIMED-OUT`.
3. **Fetch results** — GET `https://api.apify.com/v2/datasets/<defaultDatasetId>/items?token=<token>` when SUCCEEDED.

## Input Shape

```json
{
  "title": "Marketing Coordinator",
  "location": "Melbourne",
  "workType": "Full Time",
  "suburb": "",
  "subClass": "6009,6010,6011",
  "seekUrl": "",
  "rows": 50,
  "proxy": { "useApifyProxy": true }
}
```

The `subClass` field accepts a comma-separated list of SEEK marketing classification IDs:

| ID | Sub-classification |
|---|---|
| 6009 | Marketing & Communications |
| 6010 | Digital & Search Marketing |
| 6011 | Direct Marketing & CRM |
| 6012 | Marketing Assistants |
| 6013 | Brand Management |
| 6014 | Market Research & Analysis |
| 6015 | Marketing Management |
| 6016 | Product Management & Development |
| 6017 | Public Relations & Corporate Affairs |
| 6018 | Sales |
| 6019 | Telemarketing & Call Centre |
| 6020 | Account & Relationship Management |
| 6021 | Management |

## Company-Name Resolution

The Full Actor returns company info in three possible places. The `pickCompanyName()` helper tries them in order:

```typescript
function pickCompanyName(item: ApifyJobItem): string {
  const candidates = [
    item.advertiser?.name,
    item.companyProfile?.name,
    item.recruiterProfile?.agencyName,
  ];
  for (const c of candidates) {
    if (typeof c === "string") {
      const trimmed = c.trim();
      if (trimmed && trimmed.toUpperCase() !== "N/A" && trimmed.toLowerCase() !== "unknown") {
        return trimmed;
      }
    }
  }
  return "";
}
```

If all three are empty / "N/A" / "unknown", the job renders with company name "Unknown Company" and the user can inline-edit it in the Setup tab.

## Known Quirks

- Some listings (especially government / public-sector) have no advertiser. The helper falls back to "Unknown Company" rather than dropping the job.
- The `content` field may be either a string (plain description) or `{ text: string }` (HTML-wrapped). `JobScraper` normalizes both.
- Some listings have `workTypes` as a flat string (Lite) vs an array (Full). The component handles both.
- Posting dates use `listedAt` (ISO 8601). Pass through as-is; the preview formats them with `toLocaleDateString()`.
