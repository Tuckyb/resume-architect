
# Fix: Data Missing in Output + Portfolio Links + Professional Summary Style

## Problems Identified

### 1. Education, Certifications, and References Not Appearing
Looking at the edge function, the data IS being passed correctly in `candidateInfo`. However, the AI (`generateWithClaude`) is writing generic placeholder content instead of using the actual data. The root cause is the prompt instruction is too weak — it says "include ALL references" but it competes with instructions like "tailored" and "ATS-optimized" which push the AI toward creative rewriting.

**Fix:** In the `generateWithClaude` prompt for the resume, add explicit, forceful instructions like:
> "COPY the education, certifications, and references sections VERBATIM from the candidate data. Do not paraphrase, invent, or omit any entry."

Also add a direct warning: if `educationArray` is empty and the raw text contains education data, pass the `rawText` more prominently.

### 2. "view in portfolio" Generic Link Text → Inline Contextual Hyperlinks
Currently, the first-pass AI marks portfolio references as `[PORTFOLIO: url]`, then the formatter converts them to `<a href="url">view in portfolio</a>` — a generic, generic label.

**Fix:** Change the portfolio link instruction in both the content-generation prompt and the formatter prompt to embed meaningful, descriptive link text based on the surrounding context. Example: instead of "view in portfolio", the link text should be the project name or a phrase from the surrounding sentence.

New instruction for `generateWithClaude`: 
> "When referencing a portfolio item, use the format `[PORTFOLIO_LINK text="Project Name" url="https://..."]` where the text is descriptive of what the reader will see."

New instruction for `formatWithClaude`:
> "Convert `[PORTFOLIO_LINK text="..." url="..."]` markers into `<a href="url" target="_blank" style="color:#3182ce;text-decoration:none;">text</a>`, embedded naturally inline."

### 3. Professional Summary — Remove Blue Background / Left Bar (AI-looking Style)
The current `.summary` CSS class has:
```css
.summary {
  font-style: italic;
  color: #4a5568;
  padding: 10px 15px;
  background-color: #f7fafc;
  border-left: 4px solid #3182ce;  ← This is the "AI-looking" bar
}
```
**Fix:** Update the CSS framework embedded in the prompt to use a plain paragraph style for the summary — no background, no left border. Just clean body text with slightly adjusted weight.

### 4. Cover Letter — Remove `achievements-summary` Boxed Section
The cover letter template explicitly instructs Claude to include an `<div class="achievements-summary">` block with a blue left border and shaded background. This is the other "AI-looking" element the user dislikes.

**Fix:** Remove the `achievements-summary` div from the required cover letter HTML structure in the prompt. Replace it with guidance to weave those points naturally into paragraphs.

## Technical Changes (all in `supabase/functions/generate-documents/index.ts`)

### Change 1 — Stronger data fidelity instructions in `generateWithClaude` resume prompt
- Add: "VERBATIM RULE: Copy education entries, certification names, and references exactly as provided. Do not invent, paraphrase, or omit."
- Change portfolio marker format to `[PORTFOLIO_LINK text="descriptive text" url="url"]`

### Change 2 — Update portfolio link conversion in `formatWithClaude`
- Change regex/instruction from converting `[PORTFOLIO: url]` to `[PORTFOLIO_LINK text="..." url="..."]`
- Instruction: embed link text naturally, not "view in portfolio"

### Change 3 — Update `.summary` CSS in `resumeCssFramework`
Remove:
```css
background-color: #f7fafc;
border-left: 4px solid #3182ce;
```
Replace with a clean, understated style — normal text weight, subtle colour, no box.

### Change 4 — Update cover letter prompt structure
- Remove the `achievements-summary` block from the required HTML template in `coverLetterPrompt`
- Add instruction to write 3–4 body paragraphs naturally instead, weaving achievements into prose

### Change 5 — Strengthen `generateWithClaude` cover letter to NOT look AI-written
- Add tone instructions: "Write in a natural, human voice. Avoid corporate buzzwords like 'dynamic', 'passionate', 'leverage', 'synergy'. Use specific, concrete language."

## Files to Edit
- `supabase/functions/generate-documents/index.ts` — all 5 changes above, then redeploy
