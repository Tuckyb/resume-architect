
# Fix: Education, Certifications, References Missing + Generic Summary

## Exact Root Causes Identified

### Root Cause 1: "Not provided" fallback is poisoning the prompt

In `generateWithClaude`, the `candidateInfo` block uses this pattern:
```
EDUCATION:
${educationArray.map(...).join("\n") || "Not provided"}
```

When `educationArray` is `[]` (an empty array from JSON that had data but got mapped wrong), `.map().join()` returns `""` (empty string), which is falsy — so it falls back to the literal string `"Not provided"`. Claude then sees `"Not provided"` and writes exactly that in the output.

The same pattern affects Certifications and References.

### Root Cause 2: The VERBATIM RULE is being undermined by the fallback

The existing `VERBATIM RULE` says: *"If the EDUCATION section above is empty but the RAW RESUME TEXT contains education data, extract and list it verbatim."* — but by the time Claude reads this, the EDUCATION field already says `"Not provided"` (even if data exists), so Claude treats the rawText fallback as a last resort and often skips it.

### Root Cause 3: Professional summary is generic and long

The resume prompt only says: *"Has a strong professional summary tailored to the role"* — no length constraint, no instruction to reference the actual job description requirements. Claude defaults to a long, generic paragraph.

### Root Cause 4: References section is duplicated but fragile

References are attempted twice:
1. In `generateWithClaude` (via the text prompt — unreliable)
2. In `formatWithClaude` via pre-built HTML injected at the end

But if the `referencesArray` in step 1 shows "Not provided", the formatter may see no reference section to replace and might not insert the pre-built HTML correctly.

---

## Fixes (all in `supabase/functions/generate-documents/index.ts`)

### Fix 1: Remove the "Not provided" fallback text — replace with empty/omit

Change every section's fallback from `|| "Not provided"` to `|| ""` so Claude doesn't see a false "Not provided" label for data that may be in the rawText. Instead, add an explicit note when data IS present:

**Current (broken):**
```typescript
EDUCATION:
${educationArray.map(...).join("\n") || "Not provided"}
```

**Fixed:**
```typescript
EDUCATION (${educationArray.length} entries — copy VERBATIM):
${educationArray.length > 0 
  ? educationArray.map(edu => `${edu.degree} - ${edu.institution} (${edu.period})`).join("\n")
  : "(not in structured data — extract from RAW RESUME TEXT below)"}
```

Same fix applied to Certifications and References — making the count visible tells Claude definitively whether data exists.

### Fix 2: Strengthen the VERBATIM RULE with entry counts

Add the counts directly into the prompt so Claude cannot claim the data is absent:

```
VERBATIM RULE — DATA FIDELITY IS MANDATORY:
- You have been provided ${educationArray.length} education entries, ${certificationsArray.length} certifications, and ${referencesArray.length} references.
- EDUCATION: All ${educationArray.length} entries listed above MUST appear in the output. Copy degree, institution, and period exactly.
- CERTIFICATIONS: All ${certificationsArray.length} certifications listed above MUST appear exactly as written.
- REFERENCES: All ${referencesArray.length} references listed above MUST appear with full name, title, and contact details.
- If a count above is 0, check the RAW RESUME TEXT and extract those sections from it verbatim.
- NEVER write "Not provided" in the document output.
```

### Fix 3: Professional Summary — add length and specificity constraints

Replace the vague instruction with:
```
1. Write a CONCISE professional summary of 2–4 sentences MAXIMUM. 
   - Sentence 1: Who the candidate is (their core professional identity from their experience)
   - Sentence 2: What they bring specifically relevant to the ${job.position} role (use keywords from the JOB DESCRIPTION above)
   - Sentence 3 (optional): One specific, concrete achievement or differentiator
   - Do NOT write a generic paragraph. Do NOT use more than 4 sentences. No buzzwords.
```

### Fix 4: Ensure rawText is always used as a fallback extraction source

Add an explicit instruction that when structured arrays have 0 entries, Claude MUST scan the `rawText` section and extract the data from there. The rawText is already present in the prompt — just make the instruction stronger and conditional on count being 0.

---

## Technical Changes

**File:** `supabase/functions/generate-documents/index.ts`

1. **Lines 114–130** (the `candidateInfo` template): Replace `|| "Not provided"` with count-aware labels and explicit empty messages
2. **Lines 179** (Professional Summary instruction): Add 2–4 sentence limit and specific structure requirement  
3. **Lines 185–190** (VERBATIM RULE): Add entry counts into the rule text, add "NEVER write 'Not provided'" instruction
4. **Redeploy** the edge function

No other files need changing — this is entirely a prompt engineering fix in the one edge function.
