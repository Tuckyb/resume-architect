# Cache-Bust Helper

When the default example PDFs in `public/examples/` change, bump the `v2` prefix in the localStorage keys in `src/hooks/useDefaultExamples.ts` to invalidate cached extracted text.

## Manual Steps

1. Open `src/hooks/useDefaultExamples.ts`
2. Change the four `CACHE_KEYS` values from `default_v2_*` to `default_v3_*`
3. Save the file — no other code changes needed

## When To Bump

- New `example-resume.pdf` / `example-coverletter.pdf` content
- New `styled-resume.pdf` / `styled-coverletter.pdf` content (design refresh)
- Any visual change to the existing PDFs that should be picked up on next page load

## Verification

1. Refresh the browser, open DevTools → Application → Local Storage
2. Confirm the new `v3_*` keys appear and are populated
3. The old `v2_*` keys can be cleared manually or left to expire (they no longer match)
