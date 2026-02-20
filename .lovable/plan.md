
# Fix: Hallucinated Summary + JSON Field Mapping + Certifications Format

## Root Cause Analysis (Exact)

### Problem 1 — Summary hallucinating years/environments

The generation prompt says:
> "Sentence 1: Who the candidate is based on their actual experience (job titles, industry, **years of experience**)"

The phrase "years of experience" causes Claude to calculate and invent a figure. It looks at the date ranges across all roles (including admin work from 2004) and fabricates "4+ years of marketing experience" or "B2B and agency environments" — neither of which is explicitly stated in the data. 

**Fix:** Remove "years of experience" from the sentence 1 instruction. Replace it with: *"Sentence 1: Who the candidate is — use only their most recent job title(s) and industry/sector. Do NOT calculate or invent a years-of-experience figure. Do NOT add descriptors not explicitly stated in the data."*

---

### Problem 2 — JSON field mapping mismatch (the main cause of data not appearing)

The uploaded JSON has this structure:
```json
"workExperience": [{ "jobTitle": "...", "company": "...", "duration": "2022-2023", "responsibilities": [...] }]
"education": [{ "degree": "...", "institution": "...", "duration": "2017-2024", "year": 2014, "status": "In Progress" }]
```

But the edge function at line 110 reads:
```typescript
exp.title      // JSON has "jobTitle" not "title" → undefined
exp.period     // JSON has "duration" not "period" → undefined
edu.period     // JSON has "duration"/"year" not "period" → undefined
```

This means the WORK EXPERIENCE and EDUCATION blocks in the prompt show:
```
Marketing Strategy Consultant at Purple Patch Consulting (undefined)
Bachelor of Commerce in Marketing - University of Wollongong (undefined)
```

Claude then "fills in" the missing period and invents context — leading to hallucinated details.

**Fix:** In `generateWithClaude`, add field-alias resolution that handles both formats:
```typescript
const getExpTitle = (exp: any) => exp.title || exp.jobTitle || "";
const getExpPeriod = (exp: any) => exp.period || exp.duration || (exp.year ? String(exp.year) : "");
const getEduPeriod = (edu: any) => edu.period || edu.duration || (edu.year ? String(edu.year) : "");
const getEduStatus = (edu: any) => edu.status ? ` (${edu.status})` : "";
```

---

### Problem 3 — Certifications rendered as `[object Object]`

The JSON certifications are objects:
```json
{ "title": "Google Analytics Basics", "issuer": "Google" }
```

But the code at line 124 does:
```typescript
certificationsArray.join("\n")
```

When you `.join()` an array of objects, each becomes `[object Object]`. Claude sees that and either skips them or makes up certifications.

**Fix:** Replace the join with a proper map:
```typescript
certificationsArray.map((c: any) => {
  if (typeof c === "string") return `• ${c}`;
  const title = c.title || c.name || String(c);
  const issuer = c.issuer ? ` — ${c.issuer}` : "";
  const year = c.year ? ` (${c.year})` : "";
  return `• ${title}${issuer}${year}`;
}).join("\n")
```

---

### Problem 4 — professionalDevelopment courses not included

The JSON has a `professionalDevelopment` section with LinkedIn Learning courses and AI school courses that include certificate links. These are currently not passed to the prompt at all because `ParsedResumeData` has no field for them.

**Fix:** Since `parsedResumeData` is typed as `ParsedResumeData` but the JSON may contain additional fields, extract `professionalDevelopment` from the raw object using `(resume as any).professionalDevelopment`. Then build a `profDevText` string and append it to the certifications block in the prompt so the LinkedIn Learning completions show up.

---

### Problem 5 — keyAchievements field not mapped

The JSON has `keyAchievements` (camelCase) but `ParsedResumeData` has `achievements`. When JSON is loaded client-side and the field is named `keyAchievements`, it never lands in `achievements` — so `achievementsArray` is empty and Claude invents/repeats achievements.

**Fix:** Add alias resolution: `const achievementsArray = Array.isArray(achievements) ? achievements : Array.isArray((resume as any).keyAchievements) ? (resume as any).keyAchievements : [];`

---

## All Technical Changes — `supabase/functions/generate-documents/index.ts`

### Change 1 — Field alias resolver (after line 91, inside `generateWithClaude`)

Add helper aliases that handle both the standard interface field names AND the JSON field names used in the uploaded file:

```typescript
// Field alias helpers — handle both ParsedResumeData interface names and JSON field names
const getExpTitle = (exp: any) => exp.title || exp.jobTitle || "";
const getExpPeriod = (exp: any) => exp.period || exp.duration || (exp.year ? String(exp.year) : "");
const getEduPeriod = (edu: any) => edu.period || edu.duration || (edu.year ? String(edu.year) : "");
const getEduStatus = (edu: any) => edu.status ? ` (${edu.status})` : "";

// Also handle keyAchievements vs achievements naming
const achievementsArray = Array.isArray(achievements) 
  ? achievements 
  : Array.isArray((resume as any).keyAchievements) 
    ? (resume as any).keyAchievements 
    : [];

// Extract professionalDevelopment if present
const profDev = (resume as any).professionalDevelopment;
const linkedInCourses = profDev?.linkedinLearning || [];
const aiCourses = profDev?.schoolCommunityTrainings?.trainings || [];
```

### Change 2 — Update workExperience mapping (line 109–112)

Change from:
```typescript
${exp.title} at ${exp.company} (${exp.period})
```
To:
```typescript
${getExpTitle(exp)} at ${exp.company} (${getExpPeriod(exp)})
```

### Change 3 — Update education mapping (line 115–117)

Change from:
```typescript
${edu.degree} - ${edu.institution} (${edu.period})
```
To:
```typescript
${edu.degree} - ${edu.institution} (${getEduPeriod(edu)}${getEduStatus(edu)})
```

### Change 4 — Fix certifications rendering (line 124)

Change from:
```typescript
${certificationsArray.length > 0 ? certificationsArray.join("\n") : "..."}
```
To:
```typescript
${certificationsArray.length > 0 ? certificationsArray.map((c: any) => {
  if (typeof c === "string") return `• ${c}`;
  const title = c.title || c.name || String(c);
  const issuer = c.issuer ? ` — ${c.issuer}` : "";
  const year = c.year ? ` (${c.year})` : "";
  return `• ${title}${issuer}${year}`;
}).join("\n") : "(extract from RAW RESUME TEXT below)"}
```

### Change 5 — Append professionalDevelopment to certifications block

After the certifications block, add:
```
PROFESSIONAL DEVELOPMENT / LINKEDIN LEARNING:
${linkedInCourses.map(c => `• ${c.course}${c.certificateLink ? ` — [PORTFOLIO_LINK text="${c.course} Certificate" url="${c.certificateLink}"]` : ""}`).join("\n")}
${aiCourses.map(c => `• ${c.course} — ${c.provider} (Instructor: ${c.instructor})`).join("\n")}
```

### Change 6 — Fix achievements alias (line 90)

Change from:
```typescript
const achievementsArray = Array.isArray(achievements) ? achievements : [];
```
To use the alias-aware version defined in Change 1.

### Change 7 — Fix summary hallucination instruction (line 225)

Change from:
> "Sentence 1: Who the candidate is based on their actual experience (job titles, industry, years of experience)"

To:
> "Sentence 1: Who the candidate is — state their most recent role(s) and field only. Do NOT calculate or state years of experience. Do NOT add descriptors like 'B2B', 'agency', or 'enterprise' unless those exact words appear in the work experience data above. Only use what is explicitly written."

### Change 8 — Strengthen the anti-hallucination rule

After the VERBATIM RULE block, add:

```
ANTI-HALLUCINATION RULE — ABSOLUTE:
- You may ONLY state facts that are explicitly written in the CANDIDATE INFORMATION or RAW RESUME TEXT above.
- Do NOT infer, calculate, or extrapolate. Do NOT write "4+ years", "10+ years", or any other years-of-experience figure unless that exact phrase appears in the source data.
- Do NOT add adjectives or descriptors (e.g. "B2B environments", "agency settings", "enterprise-level") unless those exact terms appear in the source data.
- If you are unsure whether a fact exists in the data, do not include it.
```

---

## Files to Edit
- `supabase/functions/generate-documents/index.ts` — Changes 1 through 8, then redeploy
