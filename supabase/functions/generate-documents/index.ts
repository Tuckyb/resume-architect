import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Reference {
  name: string;
  title: string;
  contact: string;
}

interface ParsedResumeData {
  rawText: string;
  personalInfo?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    linkedIn?: string;
    portfolio?: string;
  };
  workExperience?: Array<{
    id: string;
    title: string;
    company: string;
    period: string;
    responsibilities: string[];
  }>;
  education?: Array<{
    id: string;
    degree: string;
    institution: string;
    period: string;
    achievements?: string[];
  }>;
  skills?: Array<{
    category: string;
    items: string[];
  }>;
  certifications?: string[];
  achievements?: string[];
  references?: Reference[];
}

interface JobTarget {
  id: string;
  companyName: string;
  companyUrl?: string;
  position: string;
  jobDescription: string;
  location?: string;
  workType?: string;
  seniority?: string;
  postedAt?: string;
  selected: boolean;
}

interface RequestData {
  parsedResumeData: ParsedResumeData;
  jobTarget: JobTarget;
  documentType: "resume" | "cover-letter" | "both";
  exampleResumeText?: string | null;
  exampleCoverLetterText?: string | null;
  styledResumeText?: string | null;
  styledCoverLetterText?: string | null;
  portfolioJson?: Record<string, unknown> | null;
}

// Generate document content using Claude
async function generateWithClaude(
  resume: ParsedResumeData,
  job: JobTarget,
  docType: "resume" | "cover-letter",
  exampleText: string | null | undefined,
  apiKey: string,
  portfolioJson?: Record<string, unknown> | null
): Promise<string> {
  console.log(`Generating ${docType} content with Claude...`);

  const { personalInfo, workExperience, education, skills, certifications, achievements, references } = resume;

  const skillsText = skills?.map(s => `${s.category}: ${s.items.join(", ")}`).join("\n") || "";

  const referencesText = references?.map(ref =>
    `- ${ref.name} | ${ref.title} | ${ref.contact}`
  ).join("\n") || "";

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const candidateInfo = `
CANDIDATE INFORMATION:
- Full Name: ${personalInfo?.fullName || "Not provided"}
- Email: ${personalInfo?.email || "Not provided"}
- Phone: ${personalInfo?.phone || "Not provided"}
- Address: ${personalInfo?.address || "Not provided"}
- LinkedIn: ${personalInfo?.linkedIn || "Not provided"}
- Portfolio: ${personalInfo?.portfolio || "Not provided"}

WORK EXPERIENCE:
${workExperience?.map(exp => `
${exp.title} at ${exp.company} (${exp.period})
${exp.responsibilities.map(r => `• ${r}`).join("\n")}
`).join("\n") || "Not provided"}

EDUCATION:
${education?.map(edu => `
${edu.degree} - ${edu.institution} (${edu.period})
${edu.achievements?.map(a => `• ${a}`).join("\n") || ""}
`).join("\n") || "Not provided"}

SKILLS:
${skillsText || "Not provided"}

CERTIFICATIONS:
${certifications?.join(", ") || "Not provided"}

ACHIEVEMENTS:
${achievements?.map(a => `• ${a}`).join("\n") || "Not provided"}

REFERENCES:
${referencesText || "Not provided"}
`;

  const jobInfo = `
TARGET JOB:
- Company: ${job.companyName}
- Position: ${job.position}
- Location: ${job.location || "Not specified"}
- Work Type: ${job.workType || "Not specified"}

JOB DESCRIPTION:
${job.jobDescription}
`;

  const exampleSection = exampleText ? `
EXAMPLE ${docType.toUpperCase()} TO REFERENCE (for style and format guidance):
${exampleText}
` : "";

  const portfolioSection = portfolioJson ? (() => {
    const jsonStr = JSON.stringify(portfolioJson, null, 2);
    const truncated = jsonStr.length > 3000 ? jsonStr.substring(0, 3000) + "\n... [truncated]" : jsonStr;
    return `
PORTFOLIO WEBSITE DATA:
The candidate has a portfolio website with the following content. When writing bullet points or achievements that relate to projects or work demonstrated in this portfolio, note them with "[PORTFOLIO: url]" so they can be hyperlinked in the final output. Only reference URLs that actually exist in the data below.

${truncated}
`;
  })() : "";

  let prompt: string;

  if (docType === "resume") {
    prompt = `You are a Professional Resume Architect. Create a highly targeted, ATS-optimized resume that showcases this candidate's qualifications for the specific job opportunity.

${candidateInfo}

${jobInfo}

${exampleSection}

${portfolioSection}

Today's date: ${today}

RAW RESUME TEXT (for additional context):
${resume.rawText}

Generate a complete, professional resume that:
1. Has a strong professional summary tailored to the ${job.position} role at ${job.companyName}
2. Highlights relevant skills and experience that match the job description
3. Uses industry keywords from the job posting
4. Presents work experience with strong action verbs and quantified achievements
5. Is organized with clear sections: Professional Summary, Core Competencies, Professional Experience, Education, Certifications, Key Achievements, References
6. IMPORTANT: Include ALL references from the REFERENCES section above — do not skip or omit any reference. List each one with their name, title, and contact details.
7. If portfolio data is provided, mark relevant bullet points with [PORTFOLIO: url] where a portfolio link should appear.

Output ONLY the resume content in plain text with clear section headers. No HTML or markdown.`;
  } else {
    prompt = `You are a Professional Cover Letter Craftsman. Create a compelling, personalized cover letter that connects this candidate with their target role.

${candidateInfo}

${jobInfo}

${exampleSection}

${portfolioSection}

Today's date: ${today}

RAW RESUME TEXT (for additional context):
${resume.rawText}

Generate a professional cover letter that:
1. Opens with an engaging statement about why you're excited about ${job.position} at ${job.companyName}
2. Demonstrates understanding of the company and role
3. Connects 2-3 key experiences/achievements directly to the job requirements
4. Shows enthusiasm and cultural fit
5. Closes with confidence and a clear call to action
6. Is formatted as a proper business letter with today's date
7. If portfolio data is provided, mark relevant mentions with [PORTFOLIO: url] where a portfolio link should appear.

The letter should be addressed from:
${personalInfo?.fullName || "Candidate"}
${personalInfo?.address || ""}
${personalInfo?.phone || ""}
${personalInfo?.email || ""}

Output ONLY the cover letter content in plain text format. No HTML or markdown.`;
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Claude API error for ${docType}:`, response.status, errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0].text;

  if (!content) {
    throw new Error(`No content received from Claude for ${docType}`);
  }

  console.log(`${docType} content generated successfully (${content.length} chars)`);
  return content;
}

// Pre-built reference block markup that the LLM is told to paste verbatim at
// the end of the resume so referees are never omitted. Matches the .ref /
// .ref__name / .ref__role classes from the Styalized CSS framework.
function buildReferencesHTML(references: Reference[]): string {
  if (!references || references.length === 0) return "";
  const items = references.map((r) => `
      <div class="ref">
        <div class="ref__name">${r.name}</div>
        <div class="ref__role">${r.title}</div>
        <div class="ref__role">${r.contact}</div>
      </div>`).join("");
  return `<section class="sec">
        <div class="sec__label">Referees</div>
        ${items}
      </section>`;
}

// Shared CSS framework. Source of truth: references/skills/{resume,cover-letter}-formatter/SKILL.md
// Tokens (hex values, embedded directly for Word compatibility):
//   --ink:        #0D1B2A   primary text
//   --paper:      #FAFAF7   sheet background
//   --signal:     #1E3A5F   accent (italic org names, section labels in rail, callout borders)
//   --signal-soft:#E8EEF5   key-achievement block backgrounds
//   --n-900:      #1A1F26   near-black for headings
//   --n-700:      #3D4550   body text
//   --n-500:      #6B7380   labels, meta, dates
//   --n-300:      #C8CCD1   dividers, tag borders
//   --n-100:      #ECEDEF   page background
// Fonts (loaded via <link>):
//   --font-display: Source Serif 4 (name, org names)
//   --font-body:    Inter Tight (UI text)
//   --font-mono:    JetBrains Mono (contact bar, dates, tags)
const cssFramework = `
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
.letter { margin-top: 8px; }
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

const googleFontsLink =
  '<link rel="preconnect" href="https://fonts.googleapis.com">' +
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' +
  '<link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=Inter+Tight:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">';

async function formatWithClaude(
  content: string,
  docType: string,
  apiKey: string,
  personalInfo?: ParsedResumeData['personalInfo'],
  styledExampleText?: string | null,
  references?: Reference[] | null,
  portfolioJson?: Record<string, unknown> | null
): Promise<string> {
  console.log("Calling Claude API for HTML formatting...");
  console.log("Personal info for formatting:", JSON.stringify(personalInfo));
  console.log("Styled example provided:", !!styledExampleText);

  const isCoverLetter = docType.toLowerCase().includes("cover");

  // Pre-built references HTML to inject directly (ensures they are never omitted).
  const referencesHTML = references && references.length > 0 ? buildReferencesHTML(references) : "";

  // Derive initials for the masthead monogram block (e.g. "Thomas Condran" -> "TC").
  const initials = (personalInfo?.fullName || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((s) => s[0]!.toUpperCase())
    .slice(0, 2)
    .join("") || "";

  // Styled example section if provided.
  const styledExampleSection = styledExampleText ? `
## STYLED EXAMPLE TO FOLLOW:
Here is an example of a styled ${isCoverLetter ? "cover letter" : "resume"} that shows the desired formatting, layout, and visual style.
MATCH THIS STYLE as closely as possible. The example defines the design system for the entire output.

${styledExampleText}

=== END OF STYLED EXAMPLE ===
` : "";

  // Portfolio link conversion instructions
  const portfolioLinkSection = portfolioJson ? `
## PORTFOLIO LINK CONVERSION:
The content may contain markers like [PORTFOLIO: url]. Convert each one into a clickable inline hyperlink:
<a href="url" target="_blank" style="color:#2a5db0;text-decoration:underline;">view in portfolio</a>
Remove the [PORTFOLIO: ...] marker and replace it with the hyperlink inline in the text.
` : "";

  const coverLetterPrompt = `You are a Professional Cover Letter Formatter. Transform the following cover letter content into a polished, single-page A4 cover letter matching the Styalized design system (serif masthead with monogram block, two-tone contact bar, 5-7 paragraph letter body, typed signature).

${styledExampleSection}
${portfolioLinkSection}
## CRITICAL - STYLE RULES:
1. Use only the CSS classes defined in the framework below. Do not invent new classes.
2. Use direct hex colors (already in the framework). Do not introduce CSS variables.
3. Use the framework's masthead/contact bar/letter body/signature components as-is.
4. The Google Fonts <link> must be in <head> so Source Serif 4, Inter Tight and JetBrains Mono are available.

## CANDIDATE PERSONAL INFORMATION (USE THESE EXACT VALUES):
- Full Name: ${personalInfo?.fullName || ""}
- Role Title: derive a short descriptor (e.g. "Marketing & AI Systems", "Communications & Marketing Professional") that matches the candidate's actual background
- Initials: ${initials}
- Email: ${personalInfo?.email || ""}
- Phone: ${personalInfo?.phone || ""}
- Address: ${personalInfo?.address || ""}
- LinkedIn URL: ${personalInfo?.linkedIn || ""}
- LinkedIn handle (display text, e.g. /in/thomas-condran): derive from the URL or leave blank
- Portfolio URL: ${personalInfo?.portfolio || ""}
- Portfolio domain (display text, e.g. thomascportfolio.online): derive from the URL or leave blank

## CSS FRAMEWORK (embed this in the HTML <style>):
${cssFramework}

## CONTENT TO FORMAT:
${content}

## REQUIRED HTML STRUCTURE FOR COVER LETTER:

Use this EXACT structure with the CSS classes from the framework:

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>[Name] - Cover Letter</title>
    ${googleFontsLink}
    <style>[EMBED FULL CSS HERE]</style>
</head>
<body>

<section class="sheet">
  <header>
    <div class="masthead">
      <div>
        <h1 class="masthead__name">[Full Name]</h1>
        <div class="masthead__role">[Role Title]</div>
        <div class="masthead__rule"></div>
      </div>
      <div class="masthead__monogram">
        [Initials]
        <span class="desc">[Descriptor]</span>
      </div>
    </div>
    <div class="contact">
      <span><b>Location</b>[City, State]</span>
      <span><b>Phone</b>[Phone]</span>
      <span><b>Email</b>[Email]</span>
      <span><b>LinkedIn</b><a href="[LinkedIn URL]">[/in/handle]</a></span>
      <span><b>Portfolio</b><a href="[Portfolio URL]">[domain]</a></span>
    </div>
  </header>

  <div class="letter">
    <div class="letter__meta">
      <div class="letter__recipient">
        <strong>[Organisation]</strong>
        [Hiring Manager name or "Hiring Manager"]
      </div>
      <div class="letter__date">[D Month YYYY]</div>
    </div>

    <div class="letter__salutation">Dear [Salutation],</div>

    <div class="letter__body">
      <p>[Opening - hook sentence, role + organisation context, why this org. NEVER start with "I".]</p>
      <p>[Experience breadth - overview of background aligned to role]</p>
      <p>[Specific example 1 - named employer, concrete outcome]</p>
      <p>[Specific example 2 - different experience, different angle]</p>
      <p>[Differentiator - AI, systems, tools, innovation]</p>
      <p>[Cultural/community commitment if relevant]</p>
      <p>[Close - qualifications summary, call to action, one sentence]</p>
    </div>

    <div class="letter__closing">
      <p>Kind regards,</p>
      <div class="sig-name">[Full Name]</div>
      <div class="sig-role">[Role Title]</div>
    </div>
  </div>

  <footer class="sheet__footer">
    <span>[Full Name] - [Role Descriptor]</span>
    <span>Cover Letter - [Organisation]</span>
  </footer>
</section>

</body>
</html>

## WRITING RULES:
- Opening paragraph: NEVER start with "I". Lead with a concept, observation, or the organisation's mission.
- Bold company names and key qualifications inline using <strong>.
- 5-7 paragraphs, each with a distinct purpose.
- Closing paragraph: one sentence call to action, no more.
- Signature is a TYPED name in Source Serif 4 + role title in uppercase signal blue. No image.
- Links always: color:#2a5db0; text-decoration:underline;
- Never use margin-top: auto on any element.

Return ONLY the complete HTML code, nothing else.`;

  const resumePrompt = `You are a Professional Resume Formatter. Transform the following resume content into a polished 2-page A4 resume matching the Styalized design system: a serif masthead with monogram block, two-tone contact bar, two-column layout with a left "rail" sidebar (Core Capabilities, Digital Tools & Analytics, Education, Certifications, Referees) and a main content column (Professional Profile, Professional Experience across both pages, Selected Projects & Achievements, Community & Cultural Commitment).

${styledExampleSection}
${portfolioLinkSection}
## CRITICAL - STYLE RULES:
1. Use only the CSS classes defined in the framework below. Do not invent new classes.
2. Use direct hex colors (already in the framework). Do not introduce CSS variables.
3. The document is exactly TWO <section class="sheet"> elements - page 1 and page 2. The masthead + contact bar + first half of content go in the first sheet. The second sheet has a continuation of the main column plus the rail's Education / Certifications / Referees. Each sheet has its own footer with "PAGE 0X OF 02".
4. The Google Fonts <link> must be in <head> so Source Serif 4, Inter Tight and JetBrains Mono are available.

## CANDIDATE PERSONAL INFORMATION (USE THESE EXACT VALUES):
- Full Name: ${personalInfo?.fullName || ""}
- Role Title: derive a short descriptor (e.g. "Marketing & AI Systems", "Communications & Marketing Professional") that matches the candidate's actual background
- Initials: ${initials}
- Email: ${personalInfo?.email || ""}
- Phone: ${personalInfo?.phone || ""}
- Address: ${personalInfo?.address || ""}
- LinkedIn URL: ${personalInfo?.linkedIn || ""}
- LinkedIn handle (display text, e.g. /in/thomas-condran): derive from the URL or leave blank
- Portfolio URL: ${personalInfo?.portfolio || ""}
- Portfolio domain (display text, e.g. thomascportfolio.online): derive from the URL or leave blank

## CSS FRAMEWORK (embed this in the HTML <style>):
${cssFramework}

## CONTENT TO FORMAT:
${content}

## CRITICAL - NO PLACEHOLDERS:
NEVER use [Your Name], [Your Email], [Your Phone], [Your Address], [City, State, Zip] or any similar placeholder text. Use the EXACT personal information provided above.

## REQUIRED HTML STRUCTURE FOR RESUME:

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>[Name] - Resume</title>
    ${googleFontsLink}
    <style>[EMBED FULL CSS HERE]</style>
</head>
<body>

<!-- PAGE 1 -->
<section class="sheet">
  <header>
    <div class="masthead">
      <div>
        <h1 class="masthead__name">[Full Name]</h1>
        <div class="masthead__role">[Role Title]</div>
        <div class="masthead__rule"></div>
      </div>
      <div class="masthead__monogram">
        [Initials]
        <span class="desc">[Descriptor]</span>
      </div>
    </div>
    <div class="contact">
      <span><b>Location</b>[City, State]</span>
      <span><b>Phone</b>[Phone]</span>
      <span><b>Email</b>[Email]</span>
      <span><b>LinkedIn</b><a href="[LinkedIn URL]">[/in/handle]</a></span>
      <span><b>Portfolio</b><a href="[Portfolio URL]">[domain]</a></span>
    </div>
  </header>

  <div class="layout">
    <aside class="rail">
      <section class="sec">
        <div class="sec__label">Core Capabilities</div>
        <div class="cap">
          <div class="cap__title">[Category]</div>
          <div class="cap__items">[Skills as prose list]</div>
        </div>
        <!-- repeat .cap divs for each category -->
      </section>
      <section class="sec">
        <div class="sec__label">Digital Tools &amp; Analytics</div>
        <div class="tools">
          <span>[Tool]</span>
          <!-- repeat spans -->
        </div>
      </section>
    </aside>

    <main>
      <section class="sec">
        <div class="sec__label">Professional Profile</div>
        <p class="lead">[Opening sentence with <strong>bold key phrase</strong>]</p>
        <p class="lead">[Second paragraph]</p>
      </section>

      <section class="sec">
        <div class="sec__label">Professional Experience</div>
        <div class="job">
          <div class="job__head">
            <div class="job__title">[Title]</div>
            <div class="job__date">[Year-Year]</div>
          </div>
          <div class="job__org">[Company Name]</div>
          <ul class="points">
            <li>[Responsibility]</li>
          </ul>
          <div class="job__win">
            <div class="h4">Key Achievements</div>
            <p>[Achievement text]</p>
          </div>
        </div>
        <!-- repeat .job divs for the most recent 1-2 roles -->
      </section>
    </main>
  </div>

  <footer class="sheet__footer">
    <span>[FULL NAME] - [ROLE DESCRIPTOR]</span>
    <span>PAGE 01 OF 02</span>
  </footer>
</section>

<!-- PAGE 2 -->
<section class="sheet">
  <div class="layout">
    <aside class="rail">
      <section class="sec">
        <div class="sec__label">Education</div>
        <div class="edu">
          <div class="edu__deg">[Degree]</div>
          <div class="edu__meta">[Institution] - [Year-Year]</div>
          <div class="edu__note">[Details]</div>
          <div class="honor">[Award if applicable]</div>
        </div>
      </section>

      <section class="sec">
        <div class="sec__label">Certifications</div>
        <ul class="plain">
          <li>[Certification]</li>
        </ul>
      </section>

      <!-- REFS BLOCK - PASTE THIS EXACT PRE-BUILT HTML (do not modify it): -->
${referencesHTML || "<!-- No references provided -->"}
    </aside>

    <main>
      <section class="sec">
        <div class="sec__label">Professional Experience (Cont.)</div>
        <!-- remaining .job divs -->
      </section>

      <section class="sec">
        <div class="sec__label">Selected Projects &amp; Achievements</div>
        <div class="note"><p>[Optional: standout projects or achievements]</p></div>
      </section>

      <section class="sec">
        <div class="sec__label">Community &amp; Cultural Commitment</div>
        <div class="note"><p>[Optional: community / cultural commitment or closing note]</p></div>
      </section>
    </main>
  </div>

  <footer class="sheet__footer">
    <span>[FULL NAME] - [ROLE DESCRIPTOR]</span>
    <span>PAGE 02 OF 02</span>
  </footer>
</section>

</body>
</html>

## COMPONENT RULES:
- Masthead name: Source Serif 4, ~43px, weight 400, letter-spacing -0.02em.
- Monogram block (top-right): initials + small descriptor label.
- Role subtitle: uppercase, Inter Tight, signal blue. Blue rule under it.
- Contact bar items: <span> with <b> label prefix; labels are LOCATION, PHONE, EMAIL, LINKEDIN, PORTFOLIO. LinkedIn and Portfolio are <a> tags with color:#2a5db0; text-decoration:underline.
- Section labels in rail: signal blue, uppercase, 0.1em letter-spacing, bottom border in --n-300.
- Cap groups: title bold, items as prose (NOT a bullet list).
- Tool tags: monospace, 1px border, no background fill, rounded pill.
- Experience entries: org name in Source Serif 4 italic, signal blue. Bullets use ul.points with a dash rule prefix, not circle bullets. Key Achievements use the .job__win callout: light blue background, left blue border, small uppercase H4 inside.
- Education: .edu__deg for degree, .edu__meta for institution + date in monospace, .edu__note for detail, .honor for awards (signal blue, bold).
- Certifications: ul.plain with bottom border rules, no bullets.
- Referees: .ref with .ref__name (bold) + .ref__role (two divs for title and contact). ALWAYS include actual contact details, never "available upon request".

Return ONLY the complete HTML code, nothing else.`;

  const prompt = isCoverLetter ? coverLetterPrompt : resumePrompt;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Claude API error:", response.status, errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  let htmlContent = data.content[0].text;

  // Clean up markdown code blocks if present
  if (htmlContent.startsWith("```html")) {
    htmlContent = htmlContent.slice(7);
  }
  if (htmlContent.startsWith("```")) {
    htmlContent = htmlContent.slice(3);
  }
  if (htmlContent.endsWith("```")) {
    htmlContent = htmlContent.slice(0, -3);
  }

  return htmlContent.trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const requestData: RequestData = await req.json();
    const {
      parsedResumeData,
      jobTarget,
      documentType,
      exampleResumeText,
      exampleCoverLetterText,
      styledResumeText,
      styledCoverLetterText,
      portfolioJson
    } = requestData;

    console.log(
      `Generating documents for: ${jobTarget.position} at ${jobTarget.companyName}`
    );
    console.log(`Document type requested: ${documentType}`);
    console.log(`Example resume text provided: ${!!exampleResumeText}`);
    console.log(`Example cover letter text provided: ${!!exampleCoverLetterText}`);
    console.log(`Styled resume example provided: ${!!styledResumeText}`);
    console.log(`Styled cover letter example provided: ${!!styledCoverLetterText}`);

    const documents: Array<{ type: string; rawContent: string; htmlContent: string }> = [];

    // Generate Resume using Claude
    if (documentType === "resume" || documentType === "both") {
      console.log("Generating resume content with Claude...");
      const rawResume = await generateWithClaude(
        parsedResumeData,
        jobTarget,
        "resume",
        exampleResumeText,
        anthropicApiKey,
        portfolioJson
      );

      console.log("Resume content generated, formatting with Claude...");
      const htmlResume = await formatWithClaude(rawResume, "resume", anthropicApiKey, parsedResumeData.personalInfo, styledResumeText, parsedResumeData.references, portfolioJson);

      documents.push({
        type: "resume",
        rawContent: rawResume,
        htmlContent: htmlResume,
      });
    }

    // Generate Cover Letter using Claude
    if (documentType === "cover-letter" || documentType === "both") {
      console.log("Generating cover letter content with Claude...");
      const rawCoverLetter = await generateWithClaude(
        parsedResumeData,
        jobTarget,
        "cover-letter",
        exampleCoverLetterText,
        anthropicApiKey,
        portfolioJson
      );

      console.log("Cover letter content generated, formatting with Claude...");
      const htmlCoverLetter = await formatWithClaude(rawCoverLetter, "cover letter", anthropicApiKey, parsedResumeData.personalInfo, styledCoverLetterText, null, portfolioJson);

      documents.push({
        type: "cover-letter",
        rawContent: rawCoverLetter,
        htmlContent: htmlCoverLetter,
      });
    }

    console.log(`Generated ${documents.length} document(s) successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        documents,
        message: `Generated ${documents.length} document(s)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Document generation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
