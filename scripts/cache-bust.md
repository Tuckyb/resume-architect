# Cache-Bust Helper

When the default example PDFs in `public/examples/` change, bump the `v3`
prefix in the localStorage keys in `src/hooks/useDefaultExamples.ts` to
invalidate cached extracted text.

Only the two CONTENT examples are cached (`example-resume.pdf`,
`example-coverletter.pdf`) — they guide tone and content. The styled design
PDFs (`styled-resume.pdf`, `styled-coverletter.pdf`) are the human-approved
visual reference and are no longer parsed at runtime; the design is rendered
deterministically by `supabase/functions/_shared/styalized.ts`.

## Manual Steps

1. Open `src/hooks/useDefaultExamples.ts`
2. Change the two `CACHE_KEYS` values from `default_v3_*` to `default_v4_*`
3. Optionally add the old keys to `LEGACY_KEYS` so they are cleaned up
4. Save the file — no other code changes needed

## When To Bump

- New `example-resume.pdf` / `example-coverletter.pdf` content

## When NOT To Bump

- Design changes — edit `supabase/functions/_shared/styalized.ts` instead and
  redeploy `generate-documents` (`supabase functions deploy generate-documents`)

## Verification

1. Refresh the browser, open DevTools → Application → Local Storage
2. Confirm the new keys appear and are populated; legacy keys are removed on load
