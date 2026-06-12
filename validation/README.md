# Renderer validation harness

Validates that the deterministic Styalized renderer
(`supabase/functions/_shared/styalized.ts`) reproduces the approved designs in
`public/examples/styled-resume.pdf` and `public/examples/styled-coverletter.pdf`.

## 1. Render fixtures to HTML

From `resume-architect/`:

```powershell
deno run --allow-write=validation/out --allow-read validation/render.ts
```

Outputs `validation/out/resume.html`, `coverletter.html`, `resume-minimal.html`.

## 2. Print to PDF (headless Edge — no extra dependencies)

```powershell
$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
$out  = (Resolve-Path validation\out).Path
foreach ($n in "resume","coverletter","resume-minimal") {
  & $edge --headless --disable-gpu --no-pdf-header-footer `
    --print-to-pdf="$out\$n.pdf" "file:///$($out -replace '\\','/')/$n.html" | Out-Null
}
```

The `@page { size: A4; margin: 0 }` rules in the framework make the print
output pixel-faithful — this is the same path end users take via the
"Download PDF" button (browser print dialog → Save as PDF).

## 3. Compare

- `resume.pdf` must be exactly **2 pages**; `coverletter.pdf` exactly **1 page**.
- Compare side-by-side against `public/examples/styled-*.pdf`: masthead +
  monogram, contact bar, 32% rail, cap groups, tool pills, dash-rule bullets,
  Key Achievements callouts, education/honours, certification rules, referees,
  projects groups, community accent note, footers.

The fixtures in `validation/fixtures/sample-content.ts` mirror the approved
example content so the comparison is 1:1. `resume-minimal.html` exercises the
degenerate path (sparse candidate, no references/portfolio/notes).

`validation/out/` is generated output — not committed.
