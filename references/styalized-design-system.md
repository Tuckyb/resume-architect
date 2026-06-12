# Styalized Design System

The design system produced by the `resume-formatter` and `cover-letter-formatter` skills. This file is a thin entry point — the full reference is in `../../references/skills/resume-formatter/`.

## Tokens (hex values, embedded directly)

| Token | Value | Use |
|---|---|---|
| `--ink` | `#0D1B2A` | Primary text, name |
| `--paper` | `#FAFAF7` | Sheet background |
| `--signal` | `#1E3A5F` | Italic org names, rail section labels, callout borders, monogram role, key-achievement H4 |
| `--signal-soft` | `#E8EEF5` | Key-achievement block background |
| `--n-900` | `#1A1F26` | Headings, callout body |
| `--n-700` | `#3D4550` | Body text |
| `--n-500` | `#6B7380` | Labels, dates, dash-rule prefix |
| `--n-300` | `#C8CCD1` | Dividers, tag borders |
| `--n-100` | `#ECEDEF` | Page background, note block, cert row dividers |
| `--link` | `#2a5db0` | Inline hyperlinks |

## Fonts (Google Fonts, linked in `<head>`)

- **Display** — `Source Serif 4`: candidate name, italic org names, monogram, signature name
- **Body** — `Inter Tight`: all UI text, role subtitle, section labels, paragraphs
- **Mono** — `JetBrains Mono`: contact bar, dates, tool tag pills

`<link>` snippet is embedded in `cssFramework` in `../supabase/functions/generate-documents/index.ts`.

## Component Classes (top-level)

| Class | What it is |
|---|---|
| `.sheet` | One A4 page (210mm × 297mm) |
| `.layout` | Flex row container for rail + main |
| `.rail` | Left sidebar (32%) |
| `main` | Right content column |
| `.masthead` / `.masthead__name` / `.masthead__role` / `.masthead__rule` / `.masthead__monogram` | Top of each document |
| `.contact` / `.contact span` / `.contact span b` | Contact bar |
| `.sec` / `.sec__label` | Section wrapper + uppercase signal-blue label |
| `.cap` / `.cap__title` / `.cap__items` | Core Capabilities group |
| `.tools` / `.tools span` | Digital Tools pills (mono) |
| `.lead` | Professional Profile paragraph |
| `.job` / `.job__head` / `.job__title` / `.job__date` / `.job__org` | Experience entry |
| `.points` / `.points li` | Bullet list with dash-rule prefix |
| `.job__win` / `.job__win .h4` | Key Achievements callout |
| `.edu` / `.edu__deg` / `.edu__meta` / `.edu__note` / `.honor` | Education entry |
| `ul.plain` / `ul.plain li` | Certifications |
| `.ref` / `.ref__name` / `.ref__role` | Referee |
| `.note` / `.note p` | Community & Cultural Commitment block |
| `.sheet__footer` | Bottom of each sheet (name · role desc / `PAGE 0X OF 02`) |
| `.letter` / `.letter__meta` / `.letter__recipient` / `.letter__date` | Cover letter meta |
| `.letter__salutation` / `.letter__body p` / `.letter__closing` | Cover letter body |
| `.sig-name` / `.sig-role` | Signature block |

## Full Reference

See `../../references/skills/resume-formatter/references/component-classes.md` and `../../references/skills/resume-formatter/references/design-tokens.md` for the exhaustive lists with sizes, weights, and spacing.
