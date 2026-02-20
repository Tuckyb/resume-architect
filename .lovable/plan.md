
# Fix: References Whitespace + Portfolio Links + Content Repetition

## Root Cause Analysis

### Issue 1 — References: Whitespace gaps between name and contact details
The `buildReferencesHTML` function (lines 270–285) builds the references cards with correct tight inline styles. However, this pre-built HTML string is injected into the formatter prompt as a raw string at line 998–999. Claude is instructed to "PASTE THIS EXACT PRE-BUILT HTML AT THE END (do not modify it)" — but Claude sometimes interprets multi-line HTML strings in prompts and re-formats them with extra whitespace or inserts `<br>` tags.

The fix is two-part:
1. Tighten the inline styles in `buildReferencesHTML` so there is literally zero margin/padding between lines — using `line-height: 1.2` and `margin: 0` on each div
2. Mark the references HTML with a special comment so the formatter instruction is clearer: "paste as-is with zero modification"

### Issue 2 — Portfolio links not appearing in output
The portfolio link instructions in `generateWithClaude` are gated behind `if (portfolioJson)` at line 149. If the user's portfolio URL is in their `personalInfo.portfolio` field but they haven't uploaded a portfolio JSON separately, `portfolioJson` is `null` — so no portfolio link instructions are added to the prompt at all. The AI never generates `[PORTFOLIO_LINK ...]` markers, so there are zero inline links.

The fix: Add a second, unconditional portfolio instruction block that fires whenever `personalInfo.portfolio` exists. This block tells the AI:
> "The candidate has a portfolio at [URL]. When describing work, projects, or skills that would be demonstrated there, embed a descriptive inline hyperlink to specific sections of that URL. Use format `[PORTFOLIO_LINK text="Descriptive Text" url="URL/section"]`. Never use generic text like 'view here'."

And update the formatter conversion logic to always process `[PORTFOLIO_LINK ...]` markers regardless of whether `portfolioJson` was provided.

### Issue 3 — Content repeating across sections (e.g. same achievement in 3 places)
The current generation prompt has no "section isolation" rule. The AI freely mentions an achievement (like "perfect score") in the Work Experience bullet, then again in Core Competencies, then again in Key Achievements — because nothing stops it.

The fix: Add an explicit "NO DUPLICATION" rule to the prompt:
> "Each specific fact, metric, or achievement must appear in EXACTLY ONE section. Decide which section owns it and do not repeat it elsewhere. Work Experience owns job-specific outcomes. Key Achievements owns top-level career highlights. Core Competencies owns skill categories only — no metrics or specific achievements."

## Technical Changes (all in `supabase/functions/generate-documents/index.ts`)

### Change 1 — Fix `buildReferencesHTML` (lines 270–285)
Tighten the per-entry inline styles so every div has `margin:0; padding:0` between name, title, and contact — removing any gap that Claude or the browser might interpret as spacing. Change `margin-top: 5px` on the contact div to `margin-top: 3px` and ensure all divs in the reference card use explicit `line-height: 1.3`.

Also add a clearer wrapper comment like `<!-- REFERENCES_BLOCK_START -->` and `<!-- REFERENCES_BLOCK_END -->` so the formatter prompt instruction can reference it precisely.

### Change 2 — Add unconditional portfolio instruction (around line 149)
Add a new `portfolioBaseSection` block that fires when `personalInfo?.portfolio` is truthy (regardless of `portfolioJson`):

```typescript
const portfolioBaseSection = personalInfo?.portfolio ? `
PORTFOLIO INSTRUCTION:
The candidate's portfolio is at: ${personalInfo.portfolio}
When writing bullet points about specific projects, implementations, or deliverables that a portfolio would showcase, embed a descriptive inline link using the format:
[PORTFOLIO_LINK text="Descriptive phrase about what the reader will see" url="${personalInfo.portfolio}"]
The "text" should name the specific project or skill area demonstrated — never use "view in portfolio", "click here", or similar generic text.
` : "";
```

Append `portfolioBaseSection` to the prompt in both the resume and cover-letter branches.

### Change 3 — Always process `[PORTFOLIO_LINK ...]` markers in formatter
The `portfolioLinkSection` in `formatWithClaude` is also gated behind `if (portfolioJson)` at line 842. Change this so the conversion instruction is always included if the content contains a `[PORTFOLIO_LINK` marker OR if `personalInfo?.portfolio` is truthy.

### Change 4 — Add NO DUPLICATION rule to the resume generation prompt (around line 188)
Insert after the VERBATIM RULE block:

```
NO DUPLICATION RULE — EACH FACT APPEARS ONCE ONLY:
- Every specific metric, achievement, or outcome must appear in EXACTLY ONE section.
- Work Experience: describes responsibilities and job-specific outcomes for each role.
- Key Achievements: lists only the 4–6 most impressive career-level highlights (not already in Work Experience).
- Core Competencies: skill categories and tool names ONLY — no metrics, no "achieved X%", no named projects.
- Professional Summary: may mention ONE standout achievement at most, briefly.
- If a fact is mentioned in Work Experience, it must NOT be repeated in Achievements or Summary.
```

### Change 5 — Redeploy the edge function
After all changes are saved, the function is deployed automatically.

## Files to Edit
- `supabase/functions/generate-documents/index.ts` — Changes 1 through 4 above, then redeploy
