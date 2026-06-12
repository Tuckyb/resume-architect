
# Fix: School Community Trainings Missing + Education Rendering + Summary Cleanup

## Exact Root Causes Found

### Problem 1 — "School Community Trainings" education entry not appearing

The JSON has the Skool/AI trainings as the **4th education entry** with a `trainings` array:
```json
{
  "degree": "School Community Trainings",
  "institution": "Skool",
  "duration": "2024 - Present",
  "trainings": [{ "course": "AI Foundations", "provider": "No Code Architects", ... }, ...]
}
```

But the education rendering at line 167–169 only outputs:
```typescript
${edu.degree} - ${edu.institution} (${getEduPeriod(edu)}${getEduStatus(edu)})
${Array.isArray(edu.achievements) ? edu.achievements.map(...) : ""}
```

It checks for `edu.achievements` but this entry has `edu.trainings` — so the courses are completely invisible to Claude. The entry title renders but with no content underneath, and Claude may drop it entirely or merge it with something else.

**Fix:** Update the education mapper to also handle `trainings` arrays — output each course as a bullet point under that education entry.

### Problem 2 — `aiCourses` extraction path is wrong

Line 138 reads:
```typescript
const aiCourses = profDev?.schoolCommunityTrainings?.trainings || [];
```

This looks for `professionalDevelopment.schoolCommunityTrainings.trainings` — but that path doesn't exist in the JSON. The trainings are inside the `education` array, not `professionalDevelopment`. So `aiCourses` is always an empty array and the School Community trainings never appear in the `profDevText` either.

**Fix:** When building `profDevText`, also iterate over education entries that have a `trainings` array and include their courses there.

### Problem 3 — Professional Summary still hallucinating

Looking at the output:
> "Marketing Strategy Consultant and Marketing Intern with expertise in SEO optimization..."

The summary is copy-pasting job titles (which is allowed) but adding "expertise in SEO" as a characterisation that comes from inferring across the bullet points. The instruction at line 291 says:
> "Sentence 1: Who the candidate is — state their most recent job title(s) and field only."

The problem is "and field only" is vague — Claude interprets "field" as permission to describe expertise. The fix is to be more literal:
> "Sentence 1: State the candidate's most recent job title(s) ONLY — copied exactly from the top 1–2 entries in WORK EXPERIENCE above. Do NOT describe expertise, fields, or specialisations in this sentence."

### Problem 4 — LinkedIn Learning courses missing from output

The `profDevText` only includes `linkedInCourses` (from `professionalDevelopment.linkedinLearning`) and `aiCourses` (from the wrong path). The 4 LinkedIn Learning courses DO exist in the JSON (`professionalDevelopment.linkedinLearning`) and SHOULD appear — but looking at the output they are absent from Certifications. This is because the prompt at line 183 says "include these in the Certifications or a separate Professional Development section" — but Claude is ignoring them. The instruction needs to be stronger: mandate a separate "Professional Development" section.

### Problem 5 — Certifications missing the "No Code Architects Level 3 MAKE" course

The JSON's `certifications` array only has 3 entries (Google Analytics Basics, Social Media Marketing Essentials, Google Digital Garage). The MAKE course was in a previous version of the JSON. The output shows only 3 certifications — which is now correct. No fix needed here.

## Technical Changes — `supabase/functions/generate-documents/index.ts`

### Change 1 — Fix education mapper to render `trainings` entries (line 167–169)

Change from:
```typescript
${educationArray.map((edu: any) => `
${edu.degree} - ${edu.institution} (${getEduPeriod(edu)}${getEduStatus(edu)})
${Array.isArray(edu.achievements) ? edu.achievements.map((a: string) => `• ${a}`).join("\n") : ""}
`).join("\n")}
```

To:
```typescript
${educationArray.map((edu: any) => {
  const period = getEduPeriod(edu);
  const status = getEduStatus(edu);
  let bullets = "";
  if (Array.isArray(edu.achievements) && edu.achievements.length > 0) {
    bullets = edu.achievements.map((a: string) => `• ${a}`).join("\n");
  } else if (Array.isArray(edu.trainings) && edu.trainings.length > 0) {
    bullets = edu.trainings.map((t: any) => `• ${t.course} — ${t.provider} (Instructor: ${t.instructor})`).join("\n");
  }
  return `${edu.degree} - ${edu.institution} (${period}${status})\n${bullets}`;
}).join("\n\n")}
```

### Change 2 — Fix `aiCourses` extraction path (line 138)

The current path `profDev?.schoolCommunityTrainings?.trainings` is wrong. Replace with a scan of the education array for entries with a `trainings` field:

Change line 138 from:
```typescript
const aiCourses: any[] = profDev?.schoolCommunityTrainings?.trainings || [];
```
To:
```typescript
// Extract trainings from education entries that have a trainings array (e.g. School Community Trainings / Skool)
const aiCourses: any[] = educationArray
  .filter((edu: any) => Array.isArray(edu.trainings))
  .flatMap((edu: any) => edu.trainings);
```

### Change 3 — Mandate Professional Development section in prompt (line 183)

Change from:
```
${profDevText ? `\nPROFESSIONAL DEVELOPMENT / LINKEDIN LEARNING (include these in the Certifications or a separate Professional Development section):\n${profDevText}` : ""}
```
To:
```
${profDevText ? `\nPROFESSIONAL DEVELOPMENT (MANDATORY — include ALL of these as a dedicated "Professional Development" section in the resume, after Certifications):\n${profDevText}` : ""}
```

### Change 4 — Fix summary sentence 1 instruction (line 291)

Change from:
> "Sentence 1: Who the candidate is — state their most recent job title(s) and field only."

To:
> "Sentence 1: Copy the job title from the MOST RECENT entry in WORK EXPERIENCE above — e.g. 'Marketing Strategy Consultant at Purple Patch Consulting'. Do NOT describe expertise, specialisations, or fields. Do NOT add any words beyond the job title and company."

### Change 5 — Update VERBATIM RULE count to include Professional Development (line 301)

Add to the VERBATIM RULE block:
> "- PROFESSIONAL DEVELOPMENT: ALL LinkedIn Learning and School Community Training courses listed must appear in a dedicated Professional Development section. Do NOT omit any course."

### Change 6 — Redeploy the edge function
