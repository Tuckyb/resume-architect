
# Fix: References Whitespace + Portfolio Section Links + Achievement Repetition

## Root Cause Analysis

### Issue 1 — References whitespace (CSS class conflict)
The `buildReferencesHTML` function builds tight inline-styled HTML and instructs Claude to paste it verbatim. However, the CSS framework embedded in the document (lines 516–541) defines class rules for `.reference-name`, `.reference-title`, and `.reference-contact`. Critically, `.reference-contact` has `margin-top: 5px` in the CSS framework. When the browser renders the final HTML, those class-based CSS rules **override** the `margin:0` inline styles because the class declarations in the `<style>` block include `margin-top: 5px`.

The `buildReferencesHTML` cells use `class`-less divs with full inline styles — BUT some implementations may still pick up inherited/class-based rules. The safest fix is:
1. Remove `margin-top` from `.reference-contact` in the CSS framework (line 535)
2. Change the `buildReferencesHTML` to use only inline styles (no class names on inner divs) so the CSS framework can never interfere

### Issue 2 — Portfolio links going to homepage, not sections
The crawl results file shows the portfolio has clearly labelled anchor sections:
- `#tools` — Marketing Automation & Custom Solutions
- `#private-projects` — Internal Tools (AdCraft Studio, Web Tools Suite)
- `#services` — Services & Expertise (Marketing Strategy, E-commerce, Technical, etc.)
- `#portfolio` — Creative Portfolio (Ad Creatives, A/B Testing)
- `#samples` — Work Samples (Strategic Marketing Plans)
- `#contact` — Contact information

The `portfolioBaseSection` prompt currently says: *"Use the portfolio URL as the base; append relevant path segments if logical"* — but Claude defaults to the base URL because it doesn't know the actual anchors.

The fix: Inject the actual portfolio section map into the prompt so Claude knows exactly which anchor to use for each type of content:

```
PORTFOLIO SECTIONS (use these exact URLs — do NOT use the base URL alone):
- AI & automation tools: https://thomascportfolio.online/#tools
- Custom GPTs and private projects: https://thomascportfolio.online/#private-projects  
- Marketing strategy & services: https://thomascportfolio.online/#services
- Creative portfolio & ad work: https://thomascportfolio.online/#portfolio
- Work samples & strategy docs: https://thomascportfolio.online/#samples
- Contact: https://thomascportfolio.online/#contact
```

These section URLs are extracted from the `crawl-results.json` data the user uploaded, which contains the portfolio's actual markdown with `[**Section Name**](url#anchor)` links.

### Issue 3 — Academic scores appearing in Professional Summary
The current NO DUPLICATION RULE says the summary "may mention ONE standout achievement at most." Claude interprets "100/100 in Marketing Strategy" as a strong achievement and puts it in the summary. But academic scores (grades, distinctions, scores) are not summary-level achievements — they belong only in Education.

The fix: Add an explicit rule:
> "Academic grades, scores, and distinctions (e.g. 'perfect score', '100/100', 'distinction') belong ONLY in the Education section. NEVER include them in the Professional Summary or Key Achievements."

## Technical Changes

All changes are in `supabase/functions/generate-documents/index.ts`.

### Change 1 — Fix references CSS (line 535)
In the `resumeCssFramework` string, change `.reference-contact` to remove `margin-top: 5px` so it cannot create a gap:
```css
/* Before */
.reference-contact {
  font-size: 9pt;
  color: #4a5568;
  margin-top: 5px;   ← REMOVE THIS
}

/* After */
.reference-contact {
  font-size: 9pt;
  color: #4a5568;
  margin-top: 0;
}
```

Also update `buildReferencesHTML` to use `display:block` and ensure the entire card has `line-height:1.3` on the outer wrapper div, with zero `margin` and `padding` on every inner element.

### Change 2 — Extract portfolio section anchors from crawl data and inject into prompt
Modify `generateWithClaude` so that when `portfolioJson` is provided (the crawl results), the function parses the markdown to extract section anchors and builds a concrete section map. If `portfolioJson` is not present but `personalInfo.portfolio` exists, use the default anchor list from the known portfolio structure.

In the `portfolioBaseSection` (line 161), replace the vague "append relevant path segments if logical" instruction with a hardcoded section map built from the crawl data:

```typescript
// Extract portfolio sections from crawl markdown or use defaults
const portfolioSections = portfolioJson ? extractPortfolioSections(portfolioJson) : null;
const sectionMap = portfolioSections || (personalInfo?.portfolio ? buildDefaultSectionMap(personalInfo.portfolio) : null);
```

A helper function `extractPortfolioSections` will scan the crawl markdown for `[**Section Name**](url)` links (which the crawl already contains) and return a named map. For Thomas's portfolio, the crawl data already exposes:
- `(https://thomascportfolio.online/#tools)` 
- `(https://thomascportfolio.online/#private-projects)`
- `(https://thomascportfolio.online/#services)`
- `(https://thomascportfolio.online/#portfolio)`
- `(https://thomascportfolio.online/#samples)`
- `(https://thomascportfolio.online/#contact)`

The prompt will then tell Claude:
```
PORTFOLIO SECTION URLS — USE THESE EXACT URLS (do NOT use the base URL alone):
When the content is about... use this URL:
- AI tools, automation, Custom GPTs → https://thomascportfolio.online/#tools
- Private projects, AdCraft Studio, Web Tools Suite → https://thomascportfolio.online/#private-projects
- Marketing strategy, services, e-commerce, technical expertise → https://thomascportfolio.online/#services
- Creative portfolio, ad creatives, A/B testing → https://thomascportfolio.online/#portfolio
- Work samples, strategy documents → https://thomascportfolio.online/#samples
```

### Change 3 — Strengthen NO DUPLICATION RULE for academic achievements (line 220)
Add to the NO DUPLICATION RULE block:
```
- ACADEMIC SCORES RULE: Any grade, score, distinction, or academic award (e.g. "100/100", "perfect score", "distinction", "most improved") belongs ONLY in the Education section. NEVER include academic scores in the Professional Summary or Key Achievements.
- Professional Summary must NOT mention grades, scores, or academic awards under any circumstance.
```

### Change 4 — Redeploy the edge function
After all changes are saved, the function is redeployed automatically.

## Files to Edit
- `supabase/functions/generate-documents/index.ts` — Changes 1 through 3 above
