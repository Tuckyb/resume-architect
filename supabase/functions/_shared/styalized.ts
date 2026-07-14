// Styalized design system -- deterministic renderer.
//
// Source of truth: ../../../references/skills/resume-formatter/SKILL.md and
// cover-letter-formatter/SKILL.md, matched against the approved examples in
// public/examples/styled-resume.pdf and styled-coverletter.pdf.
//
// This module is dependency-free (no Deno/npm/https imports) so it can be
// imported from the edge function, the validation scripts, and tests alike.
// The LLM never authors CSS or document chrome; everything visual lives here.

export interface PersonalInfo {
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  linkedIn?: string;
  portfolio?: string;
}

export interface Reference {
  name: string;
  title: string;
  contact: string;
}

export interface ResumeJob {
  title: string;
  org: string;
  dates: string;
  bullets: string[];
  /** Key Achievements callout -- each entry renders as its own paragraph. */
  win?: string[];
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  dates: string;
  note?: string;
  honor?: string;
}

export interface ResumeProjectGroup {
  title: string;
  bullets: string[];
}

export interface ResumeContent {
  roleTitle: string;
  descriptor?: string;
  capabilities: Array<{ title: string; items: string }>;
  tools: string[];
  profile: string[];
  jobs: ResumeJob[];
  /** Jobs [0, pageSplit) render on page 1; the rest on page 2. */
  pageSplit: number;
  education: ResumeEducation[];
  certifications: string[];
  /** Professional development courses (LinkedIn Learning, AI trainings). */
  professionalDevelopment?: string[];
  projects?: ResumeProjectGroup[];
  communityNote?: string;
}

export interface CoverLetterContent {
  roleTitle: string;
  descriptor?: string;
  recipientDepartment?: string;
  recipientName?: string;
  salutation?: string;
  paragraphs: string[];
  closing?: string;
}

// ---------------------------------------------------------------------------
// Design tokens / CSS framework (verbatim from the Styalized design system).
// Tokens (hex values, embedded directly for portability):
//   --ink:        #0D1B2A   primary text
//   --paper:      #FAFAF7   sheet background
//   --signal:     #1E3A5F   accent (italic org names, section labels, borders)
//   --signal-soft:#E8EEF5   key-achievement block backgrounds
//   --n-900:      #1A1F26   near-black for headings
//   --n-700:      #3D4550   body text
//   --n-500:      #6B7380   labels, meta, dates
//   --n-300:      #C8CCD1   dividers, tag borders
//   --n-100:      #ECEDEF   page background
// Fonts (loaded via <link>): Source Serif 4 / Inter Tight / JetBrains Mono.
// ---------------------------------------------------------------------------
export const cssFramework = `
* { box-sizing: border-box; margin: 0; padding: 0; }

html, body { background: #ECEDEF; }
body {
  font-family: "Inter Tight", -apple-system, sans-serif;
  color: #0D1B2A;
  line-height: 1.55;
  padding: 40px 24px;
  -webkit-font-smoothing: antialiased;
  font-size: 13px;
}

a { color: #2a5db0; text-decoration: underline; }

.sheet {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  background: #FAFAF7;
  padding: 8mm 15mm;
  box-shadow: 0 1px 3px rgba(15,20,25,0.04), 0 12px 40px rgba(15,20,25,0.06);
  display: flex;
  flex-direction: column;
  page-break-after: always;
}
.sheet:last-of-type { page-break-after: auto; }

/* Masthead */
.masthead {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-bottom: 10px;
  border-bottom: 1px solid #0D1B2A;
}
.masthead__name {
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 43px;
  line-height: 1;
  font-weight: 400;
  letter-spacing: -0.02em;
  color: #0D1B2A;
  white-space: nowrap;
}
.masthead__role {
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1E3A5F;
  margin-top: 6px;
}
.masthead__rule {
  width: 40px;
  height: 2px;
  background: #1E3A5F;
  margin-top: 8px;
}
.masthead__monogram {
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #0D1B2A;
  text-align: right;
  padding-bottom: 4px;
  white-space: nowrap;
}
.masthead__monogram .desc {
  display: block;
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #6B7380;
  margin-top: 4px;
}

/* Contact bar */
.contact {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 22px;
  margin-top: 6px;
  padding-bottom: 2px;
}
.contact span {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: 0.01em;
  color: #3D4550;
}
.contact span b {
  font-weight: 500;
  color: #6B7380;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 9px;
  margin-right: 6px;
}

/* Two-column layout (resume) */
.layout {
  display: flex;
  gap: 18px;
  margin-top: 12px;
  flex: 1;
}
.rail {
  flex: 0 0 32%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
main { flex: 1; min-width: 0; }

/* Sections */
.sec { display: flex; flex-direction: column; }
.sec + .sec { margin-top: 14px; }
.sec__label {
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 10.5px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #1E3A5F;
  padding-bottom: 4px;
  border-bottom: 1px solid #C8CCD1;
  margin-bottom: 8px;
}

/* Cap groups (Core Capabilities) */
.cap { margin-bottom: 8px; }
.cap:last-child { margin-bottom: 0; }
.cap__title {
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  color: #1A1F26;
  margin-bottom: 2px;
}
.cap__items {
  font-size: 11px;
  color: #3D4550;
  line-height: 1.45;
}

/* Tool tag pills (Digital Tools & Analytics) */
.tools { display: flex; flex-wrap: wrap; gap: 5px; }
.tools span {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.01em;
  color: #3D4550;
  padding: 3px 7px;
  border: 1px solid #C8CCD1;
  border-radius: 999px;
  background: transparent;
}

/* Profile */
.lead {
  font-size: 11.5px;
  line-height: 1.6;
  color: #3D4550;
  margin-bottom: 7px;
}
.lead strong { color: #1A1F26; font-weight: 600; }

/* Jobs (Professional Experience) */
.job { margin-bottom: 10px; }
.job:last-child { margin-bottom: 0; }
.job__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
}
.job__title {
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 12.5px;
  font-weight: 600;
  color: #1A1F26;
}
.job__date {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px;
  color: #6B7380;
  white-space: nowrap;
}
.job__org {
  font-family: "Source Serif 4", Georgia, serif;
  font-style: italic;
  font-size: 12.5px;
  color: #1E3A5F;
  margin: 1px 0 4px 0;
}
.points {
  list-style: none;
  margin: 0;
  padding: 0;
}
.points li {
  position: relative;
  padding-left: 14px;
  font-size: 11.5px;
  line-height: 1.55;
  color: #3D4550;
  margin-bottom: 3px;
}
.points li::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 0.85em;
  height: 1px;
  background: #6B7380;
  width: 9px;
}

/* Key Achievements callout */
.job__win {
  background: #E8EEF5;
  border-left: 3px solid #1E3A5F;
  padding: 5px 9px;
  margin-top: 5px;
}
.job__win .h4 {
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #1E3A5F;
  margin-bottom: 2px;
}
.job__win p { font-size: 11px; line-height: 1.5; color: #3D4550; }

/* Education */
.edu { margin-bottom: 8px; }
.edu:last-child { margin-bottom: 0; }
.edu__deg {
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 600;
  color: #1A1F26;
}
.edu__meta {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px;
  color: #6B7380;
  margin-top: 1px;
}
.edu__note {
  font-size: 11px;
  color: #3D4550;
  margin-top: 3px;
  line-height: 1.45;
}
.honor {
  font-size: 11px;
  font-weight: 600;
  color: #1E3A5F;
  margin-top: 2px;
}

/* Certifications list */
ul.plain {
  list-style: none;
  margin: 0;
  padding: 0;
}
ul.plain li {
  font-size: 11.5px;
  color: #3D4550;
  padding: 5px 0;
  border-bottom: 1px solid #ECEDEF;
}
ul.plain li:last-child { border-bottom: none; }

/* Referees */
.ref { margin-bottom: 8px; }
.ref:last-child { margin-bottom: 0; }
.ref__name {
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 11.5px;
  font-weight: 600;
  color: #1A1F26;
}
.ref__role {
  font-size: 10.5px;
  color: #3D4550;
  margin-top: 1px;
}

/* Note block (Community & Cultural Commitment) */
.note {
  background: #ECEDEF;
  padding: 8px 10px;
  border-radius: 3px;
}
.note p { font-size: 11.5px; line-height: 1.55; color: #3D4550; }
.note--accent { border-left: 3px solid #1E3A5F; border-radius: 0 3px 3px 0; }

/* Sheet footer */
.sheet__footer {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #C8CCD1;
  display: flex;
  justify-content: space-between;
  font-family: "Inter Tight", -apple-system, sans-serif;
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #6B7380;
}

/* ---------- Cover letter additions ---------- */
/* flex: 1 stretches the letter to fill the A4 sheet so the footer pins to
   the page bottom instead of hugging the signature block. */
.letter { margin-top: 8px; flex: 1; }
.letter__meta {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.letter__recipient {
  font-size: 12px;
  line-height: 1.6;
  color: #3D4550;
}
.letter__recipient strong {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: #0D1B2A;
  margin-bottom: 2px;
}
.letter__date {
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 10.5px;
  color: #6B7380;
  text-align: right;
}
.letter__salutation {
  font-size: 13px;
  color: #0D1B2A;
  margin-bottom: 10px;
}
.letter__body p {
  font-size: 11.5px;
  line-height: 1.6;
  color: #3D4550;
  margin-bottom: 7px;
}
.letter__body p strong { color: #0D1B2A; font-weight: 600; }
.letter__closing { margin-top: 10px; }
.letter__closing p {
  font-size: 12px;
  color: #3D4550;
  margin-bottom: 20px;
}
.sig-name {
  font-family: "Source Serif 4", Georgia, serif;
  font-size: 16px;
  font-weight: 500;
  color: #0D1B2A;
}
.sig-role {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #1E3A5F;
  margin-top: 3px;
}

/* Print */
@page { size: A4; margin: 0; }
@media print {
  body { background: none; padding: 0; }
  .sheet { margin: 0; box-shadow: none; width: 210mm; min-height: 297mm; }
}
`;

// Overflow spacing ladder from the resume-formatter SKILL (steps 2-5; step 1,
// sheet padding, is already at the floor). Appended after cssFramework when a
// compact layout is needed -- never edit cssFramework itself.
export const compactCss = `
.sec + .sec { margin-top: 10px; }
.job { margin-bottom: 7px; }
.job__win { padding: 4px 7px; }
.lead { font-size: 11px; }
`;

export const googleFontsLink =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';

// ---------------------------------------------------------------------------
// Escaping and inline markup
// ---------------------------------------------------------------------------

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Descriptive form: [PORTFOLIO_LINK text="AdCraft Studio" url="https://...#anchor"]
const PORTFOLIO_LINK_MARKER = /\[PORTFOLIO_LINK\s+text="([^"]*)"\s+url="([^"]*)"\s*\]/g;
// Legacy form: [PORTFOLIO: url] (renders generic anchor text)
const PORTFOLIO_MARKER = /\[PORTFOLIO:\s*([^\]\s]+)\s*\]/g;

// NUL sentinel: survives escapeHtml and cannot occur in prose. Built via
// fromCharCode so this source file stays pure ASCII (no control-char escapes).
const SENTINEL = String.fromCharCode(0);
const SENTINEL_RE = new RegExp(SENTINEL + "(\\d+)" + SENTINEL, "g");

/**
 * Renders LLM-authored body text. All text is escaped; the only markup that
 * survives is balanced <strong> pairs and portfolio link markers, which become
 * styled inline links with descriptive anchor text. Unbalanced tags are
 * escaped literally; markers with non-http(s) URLs degrade to plain text.
 */
export function renderInline(s: string): string {
  const links: Array<{ url: string; text: string }> = [];

  let withLinks = s.replace(PORTFOLIO_LINK_MARKER, (_m, text: string, url: string) => {
    if (!/^https?:\/\//i.test(url)) return text;
    links.push({ url, text: text || "view in portfolio" });
    return SENTINEL + (links.length - 1) + SENTINEL;
  });

  withLinks = withLinks.replace(PORTFOLIO_MARKER, (_m, url: string) => {
    if (!/^https?:\/\//i.test(url)) return "";
    links.push({ url, text: "view in portfolio" });
    return SENTINEL + (links.length - 1) + SENTINEL;
  });

  const parts = withLinks.split(/(<strong>|<\/strong>)/);
  let html = "";
  let open = 0;
  for (const part of parts) {
    if (part === "<strong>") {
      open++;
      html += open === 1 ? "<strong>" : escapeHtml(part);
    } else if (part === "</strong>") {
      if (open > 0) {
        open--;
        html += "</strong>";
      } else {
        html += escapeHtml(part);
      }
    } else {
      html += escapeHtml(part).replace(SENTINEL_RE, (_m, idx: string) => {
        const link = links[Number(idx)];
        if (!link) return "";
        return `<a href="${escapeHtml(link.url)}" target="_blank" style="color:#2a5db0;text-decoration:underline;">${escapeHtml(link.text)}</a>`;
      });
    }
  }
  if (open > 0) html += "</strong>".repeat(open);
  return html;
}

// ---------------------------------------------------------------------------
// Derivation helpers (identity data is never LLM-authored)
// ---------------------------------------------------------------------------

export function deriveInitials(fullName?: string): string {
  return (fullName || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase())
    .slice(0, 2)
    .join("");
}

export function deriveLinkedInHandle(url?: string): string {
  if (!url) return "";
  const m = url.match(/linkedin\.com\/(in\/[^/?#]+)/i);
  if (m) return `/${m[1].replace(/\/$/, "")}`;
  try {
    return new URL(url).pathname.replace(/\/$/, "") || url;
  } catch {
    return url;
  }
}

export function derivePortfolioDomain(url?: string): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0];
  }
}

/** Footer descriptor, e.g. "Communications & Marketing Professional" -> "Communications & Marketing". */
function footerDescriptor(roleTitle: string): string {
  return roleTitle.replace(/\s+professional\s*$/i, "").trim() || roleTitle;
}

function todayEnAu(): string {
  return new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Shared chrome
// ---------------------------------------------------------------------------

function renderHead(title: string): string {
  return `<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${googleFontsLink}
<style>${cssFramework}</style>
</head>`;
}

function renderMasthead(
  personalInfo: PersonalInfo,
  roleTitle: string,
  descriptor: string,
): string {
  const name = personalInfo.fullName || "";
  // When the model omits a descriptor it defaults to roleTitle; rendering it
  // again in the monogram block would duplicate the role text.
  const desc = descriptor.trim().toLowerCase() === roleTitle.trim().toLowerCase()
    ? ""
    : `\n    <span class="desc">${escapeHtml(descriptor)}</span>`;
  return `<div class="masthead">
  <div>
    <h1 class="masthead__name">${escapeHtml(name)}</h1>
    <div class="masthead__role">${escapeHtml(roleTitle)}</div>
    <div class="masthead__rule"></div>
  </div>
  <div class="masthead__monogram">
    ${escapeHtml(deriveInitials(name))}${desc}
  </div>
</div>`;
}

function renderContactBar(personalInfo: PersonalInfo): string {
  const spans: string[] = [];
  if (personalInfo.address) {
    spans.push(`<span><b>Location</b>${escapeHtml(personalInfo.address)}</span>`);
  }
  if (personalInfo.phone) {
    spans.push(`<span><b>Phone</b>${escapeHtml(personalInfo.phone)}</span>`);
  }
  if (personalInfo.email) {
    spans.push(`<span><b>Email</b>${escapeHtml(personalInfo.email)}</span>`);
  }
  if (personalInfo.linkedIn) {
    const handle = deriveLinkedInHandle(personalInfo.linkedIn);
    spans.push(
      `<span><b>LinkedIn</b><a href="${escapeHtml(personalInfo.linkedIn)}">${escapeHtml(handle)}</a></span>`,
    );
  }
  if (personalInfo.portfolio) {
    const domain = derivePortfolioDomain(personalInfo.portfolio);
    spans.push(
      `<span><b>Portfolio</b><a href="${escapeHtml(personalInfo.portfolio)}">${escapeHtml(domain)}</a></span>`,
    );
  }
  return `<div class="contact">\n  ${spans.join("\n  ")}\n</div>`;
}

export function renderReferences(references?: Reference[] | null): string {
  if (!references || references.length === 0) return "";
  const items = references
    .map(
      (r) => `<div class="ref">
  <div class="ref__name">${escapeHtml(r.name)}</div>
  <div class="ref__role">${escapeHtml(r.title)}</div>
  <div class="ref__role">${escapeHtml(r.contact)}</div>
</div>`,
    )
    .join("\n");
  return `<section class="sec">
  <div class="sec__label">Referees</div>
${items}
</section>`;
}

// ---------------------------------------------------------------------------
// Resume
// ---------------------------------------------------------------------------

function renderJob(job: ResumeJob): string {
  const bullets = job.bullets
    .map((b) => `      <li>${renderInline(b)}</li>`)
    .join("\n");
  const win =
    job.win && job.win.length > 0
      ? `\n    <div class="job__win">
      <div class="h4">Key Achievements</div>
${job.win.map((w) => `      <p>${renderInline(w)}</p>`).join("\n")}
    </div>`
      : "";
  return `  <div class="job">
    <div class="job__head">
      <div class="job__title">${escapeHtml(job.title)}</div>
      <div class="job__date">${escapeHtml(job.dates)}</div>
    </div>
    <div class="job__org">${escapeHtml(job.org)}</div>
    <ul class="points">
${bullets}
    </ul>${win}
  </div>`;
}

function renderFooter(
  personalInfo: PersonalInfo,
  roleTitle: string,
  right: string,
  leftMode: "full" | "name" = "full",
): string {
  const name = personalInfo.fullName || "";
  // "name" mode: the cover letter's signature block already states the role
  // directly above the footer, so repeating it there reads as duplication.
  const left = leftMode === "name"
    ? name
    : name
      ? `${name} \u00B7 ${footerDescriptor(roleTitle)}`
      : footerDescriptor(roleTitle);
  return `<footer class="sheet__footer">
  <span>${escapeHtml(left)}</span>
  <span>${escapeHtml(right)}</span>
</footer>`;
}

export interface RenderOptions {
  compact?: boolean;
  /** Target company name — appended to the document title so the browser's
   * default Save-as-PDF filename identifies the application. */
  company?: string;
}

/** "Commonwealth Bank" -> "_Commonwealth_Bank"; empty/undefined -> "". */
function companyTitleSuffix(company?: string): string {
  const trimmed = (company || "").trim();
  return trimmed ? `_${trimmed.replace(/\s+/g, "_")}` : "";
}

export function renderResume(
  content: ResumeContent,
  personalInfo: PersonalInfo,
  references?: Reference[] | null,
  opts?: RenderOptions,
): string {
  const descriptor = content.descriptor || content.roleTitle;
  const split = Math.min(Math.max(content.pageSplit, 1), content.jobs.length);
  const page1Jobs = content.jobs.slice(0, split);
  const page2Jobs = content.jobs.slice(split);

  const capabilities = content.capabilities
    .map(
      (c) => `    <div class="cap">
      <div class="cap__title">${escapeHtml(c.title)}</div>
      <div class="cap__items">${escapeHtml(c.items)}</div>
    </div>`,
    )
    .join("\n");

  const tools = content.tools.map((t) => `    <span>${escapeHtml(t)}</span>`).join("\n");

  const profile = content.profile
    .map((p) => `  <p class="lead">${renderInline(p)}</p>`)
    .join("\n");

  const education = content.education
    .map((e) => {
      const note = e.note ? `\n    <div class="edu__note">${escapeHtml(e.note)}</div>` : "";
      const honor = e.honor ? `\n    <div class="honor">${escapeHtml(e.honor)}</div>` : "";
      return `  <div class="edu">
    <div class="edu__deg">${escapeHtml(e.degree)}</div>
    <div class="edu__meta">${escapeHtml(e.institution)} \u00B7 ${escapeHtml(e.dates)}</div>${note}${honor}
  </div>`;
    })
    .join("\n");

  const educationSection = content.education.length
    ? `<section class="sec">
  <div class="sec__label">Education</div>
${education}
</section>`
    : "";

  const certificationsSection = content.certifications.length
    ? `<section class="sec">
  <div class="sec__label">Certifications</div>
  <ul class="plain">
${content.certifications.map((c) => `    <li>${escapeHtml(c)}</li>`).join("\n")}
  </ul>
</section>`
    : "";

  const profDevSection = content.professionalDevelopment && content.professionalDevelopment.length
    ? `<section class="sec">
  <div class="sec__label">Professional Development</div>
  <ul class="plain">
${content.professionalDevelopment.map((c) => `    <li>${escapeHtml(c)}</li>`).join("\n")}
  </ul>
</section>`
    : "";

  const referencesSection = renderReferences(references);

  const page2ExperienceSection = page2Jobs.length
    ? `<section class="sec">
  <div class="sec__label">Professional Experience (Cont.)</div>
${page2Jobs.map(renderJob).join("\n")}
</section>`
    : "";

  const projectsSection =
    content.projects && content.projects.length
      ? `<section class="sec">
  <div class="sec__label">Selected Projects &amp; Achievements</div>
${content.projects
  .map(
    (g) => `  <div class="job">
    <div class="job__title">${escapeHtml(g.title)}</div>
    <ul class="points">
${g.bullets.map((b) => `      <li>${renderInline(b)}</li>`).join("\n")}
    </ul>
  </div>`,
  )
  .join("\n")}
</section>`
      : "";

  const communitySection = content.communityNote
    ? `<section class="sec">
  <div class="sec__label">Community &amp; Cultural Commitment</div>
  <div class="note note--accent"><p>${renderInline(content.communityNote)}</p></div>
</section>`
    : "";

  const name = personalInfo.fullName || "Resume";
  const docTitle = `${name.replace(/\s+/g, "_")}_Resume${companyTitleSuffix(opts?.company)}`;
  const style = opts?.compact ? cssFramework + compactCss : cssFramework;

  const html = `<!DOCTYPE html>
<html lang="en">
${renderHead(docTitle).replace(`<style>${cssFramework}</style>`, `<style>${style}</style>`)}
<body>

<!-- PAGE 1 -->
<section class="sheet">
  <header>
    ${renderMasthead(personalInfo, content.roleTitle, descriptor)}
    ${renderContactBar(personalInfo)}
  </header>

  <div class="layout">
    <aside class="rail">
      <section class="sec">
        <div class="sec__label">Core Capabilities</div>
${capabilities}
      </section>
      <section class="sec">
        <div class="sec__label">Digital Tools &amp; Analytics</div>
        <div class="tools">
${tools}
        </div>
      </section>
    </aside>

    <main>
      <section class="sec">
        <div class="sec__label">Professional Profile</div>
${profile}
      </section>

      <section class="sec">
        <div class="sec__label">Professional Experience</div>
${page1Jobs.map(renderJob).join("\n")}
      </section>
    </main>
  </div>

  ${renderFooter(personalInfo, content.roleTitle, "Page 01 of 02")}
</section>

<!-- PAGE 2 -->
<section class="sheet">
  <div class="layout">
    <aside class="rail">
      ${[educationSection, certificationsSection, profDevSection, referencesSection].filter(Boolean).join("\n      ")}
    </aside>

    <main>
      ${[page2ExperienceSection, projectsSection, communitySection].filter(Boolean).join("\n      ")}
    </main>
  </div>

  ${renderFooter(personalInfo, content.roleTitle, "Page 02 of 02")}
</section>

</body>
</html>`;

  return html;
}

// ---------------------------------------------------------------------------
// Cover letter
// ---------------------------------------------------------------------------

export function renderCoverLetter(
  content: CoverLetterContent,
  personalInfo: PersonalInfo,
  organisation: string,
): string {
  const descriptor = content.descriptor || content.roleTitle;
  const recipientName = content.recipientName || "Hiring Manager";
  const salutation = content.salutation || "Hiring Manager";
  const closing = content.closing || "Kind regards,";

  const recipientDept = content.recipientDepartment
    ? `\n      <strong>${escapeHtml(content.recipientDepartment)}</strong>`
    : "";

  const paragraphs = content.paragraphs
    .map((p) => `      <p>${renderInline(p)}</p>`)
    .join("\n");

  const name = personalInfo.fullName || "Cover Letter";
  const docTitle = `${name.replace(/\s+/g, "_")}_Cover_Letter${companyTitleSuffix(organisation)}`;

  return `<!DOCTYPE html>
<html lang="en">
${renderHead(docTitle)}
<body>

<section class="sheet">
  <header>
    ${renderMasthead(personalInfo, content.roleTitle, descriptor)}
    ${renderContactBar(personalInfo)}
  </header>

  <div class="letter">
    <div class="letter__meta">
      <div class="letter__recipient">
        <strong>${escapeHtml(organisation)}</strong>${recipientDept}
        ${escapeHtml(recipientName)}
      </div>
      <div class="letter__date">${todayEnAu()}</div>
    </div>

    <div class="letter__salutation">Dear ${escapeHtml(salutation)},</div>

    <div class="letter__body">
${paragraphs}
    </div>

    <div class="letter__closing">
      <p>${escapeHtml(closing)}</p>
      <div class="sig-name">${escapeHtml(personalInfo.fullName || "")}</div>
      <div class="sig-role">${escapeHtml(content.roleTitle)}</div>
    </div>
  </div>

  ${renderFooter(personalInfo, content.roleTitle, `Cover Letter \u2014 ${organisation}`, "name")}
</section>

</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Validation (defensive normalisation of LLM output)
// ---------------------------------------------------------------------------

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function asStringArray(v: unknown, max?: number): string[] {
  if (!Array.isArray(v)) return [];
  const out = v.filter((x): x is string => typeof x === "string" && x.trim() !== "");
  return max ? out.slice(0, max) : out;
}

export function validateResumeContent(raw: unknown): ResumeContent {
  const r = (raw ?? {}) as Record<string, unknown>;

  const roleTitle = asString(r.roleTitle);
  if (!roleTitle) throw new Error("Resume content invalid: missing roleTitle");

  const profile = asStringArray(r.profile, 3);
  if (profile.length === 0) throw new Error("Resume content invalid: missing profile");

  const jobsRaw = Array.isArray(r.jobs) ? r.jobs : [];
  const jobs: ResumeJob[] = jobsRaw
    .map((j): ResumeJob | null => {
      const job = (j ?? {}) as Record<string, unknown>;
      const title = asString(job.title);
      const org = asString(job.org);
      if (!title || !org) return null;
      return {
        title,
        org,
        dates: asString(job.dates) || "",
        bullets: asStringArray(job.bullets, 6),
        win: asStringArray(job.win, 3),
      };
    })
    .filter((j): j is ResumeJob => j !== null)
    .slice(0, 6);
  if (jobs.length === 0) throw new Error("Resume content invalid: missing jobs");

  const capabilitiesRaw = Array.isArray(r.capabilities) ? r.capabilities : [];
  const capabilities = capabilitiesRaw
    .map((c) => {
      const cap = (c ?? {}) as Record<string, unknown>;
      const title = asString(cap.title);
      const items = asString(cap.items);
      return title && items ? { title, items } : null;
    })
    .filter((c): c is { title: string; items: string } => c !== null)
    .slice(0, 5);

  const educationRaw = Array.isArray(r.education) ? r.education : [];
  const education: ResumeEducation[] = educationRaw
    .map((e): ResumeEducation | null => {
      const edu = (e ?? {}) as Record<string, unknown>;
      const degree = asString(edu.degree);
      if (!degree) return null;
      return {
        degree,
        institution: asString(edu.institution) || "",
        dates: asString(edu.dates) || "",
        note: asString(edu.note),
        honor: asString(edu.honor),
      };
    })
    .filter((e): e is ResumeEducation => e !== null)
    .slice(0, 5);

  const projectsRaw = Array.isArray(r.projects) ? r.projects : [];
  const projects: ResumeProjectGroup[] = projectsRaw
    .map((g) => {
      const group = (g ?? {}) as Record<string, unknown>;
      const title = asString(group.title);
      const bullets = asStringArray(group.bullets, 4);
      return title && bullets.length ? { title, bullets } : null;
    })
    .filter((g): g is ResumeProjectGroup => g !== null)
    .slice(0, 3);

  const pageSplitRaw = typeof r.pageSplit === "number" ? Math.round(r.pageSplit) : NaN;
  const pageSplit = Number.isFinite(pageSplitRaw)
    ? Math.min(Math.max(pageSplitRaw, 1), jobs.length)
    : Math.min(2, jobs.length);

  const professionalDevelopment = asStringArray(r.professionalDevelopment, 10);
  // The model sometimes lists the same course under both Certifications and
  // Professional Development; keep it only in Professional Development.
  const pdKeys = new Set(professionalDevelopment.map((p) => p.trim().toLowerCase()));
  const certifications = asStringArray(r.certifications, 8).filter(
    (c) => !pdKeys.has(c.trim().toLowerCase()),
  );

  return {
    roleTitle,
    descriptor: asString(r.descriptor) || roleTitle,
    capabilities,
    tools: asStringArray(r.tools, 14),
    profile,
    jobs,
    pageSplit,
    education,
    certifications,
    professionalDevelopment: professionalDevelopment.length ? professionalDevelopment : undefined,
    projects: projects.length ? projects : undefined,
    communityNote: asString(r.communityNote),
  };
}

export function validateCoverLetterContent(raw: unknown): CoverLetterContent {
  const r = (raw ?? {}) as Record<string, unknown>;

  const roleTitle = asString(r.roleTitle);
  if (!roleTitle) throw new Error("Cover letter content invalid: missing roleTitle");

  const paragraphs = asStringArray(r.paragraphs, 7);
  if (paragraphs.length === 0) {
    throw new Error("Cover letter content invalid: missing paragraphs");
  }

  return {
    roleTitle,
    descriptor: asString(r.descriptor) || roleTitle,
    recipientDepartment: asString(r.recipientDepartment),
    recipientName: asString(r.recipientName) || "Hiring Manager",
    salutation: asString(r.salutation) || "Hiring Manager",
    paragraphs,
    closing: asString(r.closing) || "Kind regards,",
  };
}
