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

  const skillsArray = Array.isArray(skills) ? skills : [];
  const skillsText = skillsArray.map(s => `${s.category}: ${Array.isArray(s.items) ? s.items.join(", ") : String(s.items)}`).join("\n");
  
  const workExpArray = Array.isArray(workExperience) ? workExperience : [];
  const educationArray = Array.isArray(education) ? education : [];
  const certificationsArray = Array.isArray(certifications) ? certifications : [];
  const achievementsArray = Array.isArray(achievements) ? achievements : [];
  const referencesArray = Array.isArray(references) ? references : [];

  const referencesText = referencesArray.map(ref => 
    `- ${ref.name} | ${ref.title} | ${ref.contact}`
  ).join("\n");

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const candidateInfo = `
CANDIDATE INFORMATION:
- Full Name: ${personalInfo?.fullName || "(extract from raw text)"}
- Email: ${personalInfo?.email || "(extract from raw text)"}
- Phone: ${personalInfo?.phone || "(extract from raw text)"}
- Address: ${personalInfo?.address || "(extract from raw text)"}
- LinkedIn: ${personalInfo?.linkedIn || "(extract from raw text)"}
- Portfolio: ${personalInfo?.portfolio || "(extract from raw text)"}

WORK EXPERIENCE (${workExpArray.length} entries — copy VERBATIM):
${workExpArray.length > 0 ? workExpArray.map(exp => `
${exp.title} at ${exp.company} (${exp.period})
${Array.isArray(exp.responsibilities) ? exp.responsibilities.map(r => `• ${r}`).join("\n") : exp.responsibilities}
`).join("\n") : "(not in structured data — extract from RAW RESUME TEXT below)"}

EDUCATION (${educationArray.length} entries — copy VERBATIM):
${educationArray.length > 0 ? educationArray.map(edu => `
${edu.degree} - ${edu.institution} (${edu.period})
${Array.isArray(edu.achievements) ? edu.achievements.map(a => `• ${a}`).join("\n") : ""}
`).join("\n") : "(not in structured data — extract from RAW RESUME TEXT below)"}

SKILLS:
${skillsText || "(extract from RAW RESUME TEXT below)"}

CERTIFICATIONS (${certificationsArray.length} entries — copy VERBATIM):
${certificationsArray.length > 0 ? certificationsArray.join("\n") : "(not in structured data — extract from RAW RESUME TEXT below)"}

ACHIEVEMENTS (${achievementsArray.length} entries):
${achievementsArray.length > 0 ? achievementsArray.map(a => `• ${a}`).join("\n") : "(not in structured data — extract from RAW RESUME TEXT below)"}

REFERENCES (${referencesArray.length} entries — copy VERBATIM):
${referencesArray.length > 0 ? referencesText : "(not in structured data — extract from RAW RESUME TEXT below)"}
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
The candidate has a portfolio website with the following content. When writing bullet points or achievements that relate to projects or work demonstrated in this portfolio, embed portfolio references using the format [PORTFOLIO_LINK text="Descriptive Project Name" url="https://..."] where the text is a meaningful, context-specific description of what the reader will find (e.g. the project name, tool name, or a short descriptive phrase). NEVER use generic text like "view in portfolio". Only reference URLs that actually exist in the data below.

${truncated}
`;
  })() : "";

  // Extract portfolio section anchors from crawl/portfolio JSON
  function extractPortfolioSections(pJson: Record<string, unknown> | null | undefined): string | null {
    if (!pJson) return null;
    // The crawl results contain markdown with links like [**Section Name**](url#anchor)
    const jsonStr = JSON.stringify(pJson);
    // Extract all unique URLs with anchors
    const anchorMatches = jsonStr.match(/https?:\/\/[^"'\s)]+#[a-zA-Z0-9_-]+/g);
    if (!anchorMatches || anchorMatches.length === 0) return null;
    const uniqueUrls = [...new Set(anchorMatches)];
    return uniqueUrls.map(url => `- ${url}`).join("\n");
  }

  const extractedSections = extractPortfolioSections(portfolioJson);
  const basePortfolioUrl = personalInfo?.portfolio || "";

  // Unconditional portfolio base instruction — fires whenever a portfolio URL exists regardless of portfolioJson
  const portfolioBaseSection = basePortfolioUrl ? `
PORTFOLIO INSTRUCTION — MANDATORY:
The candidate has a portfolio at: ${basePortfolioUrl}
This portfolio contains dedicated sections for specific projects, skills, and work samples.
REQUIREMENT: You MUST embed at least 3–5 inline portfolio hyperlinks throughout the resume in relevant bullet points and descriptions.
When writing about specific projects, implementations, deliverables, tools used, or skills demonstrated, embed a descriptive inline link using the format:
[PORTFOLIO_LINK text="Descriptive phrase naming the specific project or skill area" url="EXACT_SECTION_URL"]

${extractedSections ? `PORTFOLIO SECTION URLS — USE THESE EXACT URLS (do NOT use the base URL alone — always link to the specific section):
${extractedSections}

MATCHING GUIDE — pick the most relevant section URL from the list above based on the content:
- If writing about AI tools, automation, Custom GPTs, API integrations → use the #tools anchor URL
- If writing about private/internal projects, AdCraft Studio, web tools → use the #private-projects anchor URL  
- If writing about marketing strategy, services, e-commerce, technical expertise → use the #services anchor URL
- If writing about creative work, ad creatives, A/B testing, visual assets → use the #portfolio anchor URL
- If writing about work samples, strategy documents, case studies → use the #samples anchor URL
` : `Use the base URL: ${basePortfolioUrl} — append the most relevant path or anchor for the content being described.`}

Rules:
- The "text" MUST be the specific project name, technology, or skill area demonstrated — e.g. "AI Marketing Automation Suite", "Custom GPT Development", "Campaign Performance Dashboard"
- NEVER use generic text like "view in portfolio", "click here", "portfolio", "my work", or "see here"
- Embed the link INLINE within the bullet point sentence — not as a standalone line item
- ALWAYS use a specific section URL (with #anchor) — NEVER link to just the homepage
- If a bullet mentions a specific project, tool, or skill that would be demonstrated in the portfolio, it MUST have a portfolio link
` : "";

  let prompt: string;

  if (docType === "resume") {

    prompt = `You are a Professional Resume Architect. Create a highly targeted, ATS-optimized resume that showcases this candidate's qualifications for the specific job opportunity.

${candidateInfo}

${jobInfo}

${exampleSection}

${portfolioSection}
${portfolioBaseSection}

Today's date: ${today}

RAW RESUME TEXT (use this as the primary source of truth if structured data above is missing):
${resume.rawText}

Generate a complete, professional resume that:
1. PROFESSIONAL SUMMARY — Write EXACTLY 2–4 sentences. No more.
   - Sentence 1: Who the candidate is based on their actual experience (job titles, industry, years of experience)
   - Sentence 2: What specific value they bring to the ${job.position} role at ${job.companyName} — use 2–3 actual keywords from the JOB DESCRIPTION above
   - Sentence 3 (optional): One specific, concrete achievement with a number or outcome
   - NEVER write a generic paragraph. NEVER use buzzwords like "dynamic", "passionate", "results-driven", "synergy", "leverage". Write like a human.
2. Highlights relevant skills and experience that match the job description
3. Uses industry keywords from the job posting
4. Presents work experience with strong action verbs and quantified achievements
5. Is organised with clear sections: Professional Summary, Core Competencies, Professional Experience, Education, Certifications, Key Achievements, References

VERBATIM RULE — DATA FIDELITY IS MANDATORY:
You have been provided ${educationArray.length} education entries, ${certificationsArray.length} certifications, and ${referencesArray.length} references in the structured data above.
- EDUCATION: ALL ${educationArray.length} education entries listed above MUST appear in the output. Copy degree, institution, and period exactly. If count is 0, scan the RAW RESUME TEXT below and extract all education entries from it verbatim.
- CERTIFICATIONS: ALL ${certificationsArray.length} certifications listed above MUST appear exactly as written. If count is 0, scan the RAW RESUME TEXT below and extract all certifications from it verbatim.
- REFERENCES: ALL ${referencesArray.length} references listed above MUST appear with full name, title, and contact details. If count is 0, scan the RAW RESUME TEXT below and extract all references from it verbatim.
- NEVER write "Not provided" anywhere in the output.
- Do NOT invent, fabricate, or add any education, certification, or reference that is not in the data above or RAW RESUME TEXT.

NO DUPLICATION RULE — EACH FACT APPEARS ONCE ONLY:
- Every specific metric, achievement, or outcome must appear in EXACTLY ONE section. Choose the best section for it and do not repeat it anywhere else.
- Work Experience: describes day-to-day responsibilities and job-specific outcomes for each role only.
- Key Achievements: lists only the 4–6 most impressive career-level highlights that are NOT already mentioned in Work Experience bullets.
- Core Competencies: skill category names and tool names ONLY — absolutely no metrics, no "achieved X%", no named projects, no outcomes.
- Professional Summary: describes who the candidate is and what value they bring — max 2–4 sentences, NO specific metrics, NO achievements, NO named projects.
- RULE: If a specific fact (e.g. "achieved a perfect score", "reduced costs by 30%", a named project) appears in one section, it is FORBIDDEN from all other sections.
- ACADEMIC SCORES RULE (ABSOLUTE): Any grade, score, distinction, award, or academic recognition (e.g. "100/100", "perfect score", "distinction", "most improved", "top graduating") belongs ONLY in the Education section. NEVER include academic scores or academic awards in the Professional Summary, Key Achievements, or any other section. The Professional Summary MUST NOT mention grades, scores, or academic awards under ANY circumstance.

PORTFOLIO LINKS: If portfolio data is provided and you reference a project or piece of work from it, use the format [PORTFOLIO_LINK text="Descriptive Name" url="https://..."] inline in the sentence — where "text" is a specific, meaningful description of the linked content (e.g. the project name). NEVER use generic phrases like "view in portfolio".

Output ONLY the resume content in plain text with clear section headers. No HTML or markdown.`;
  } else {
    prompt = `You are a Professional Cover Letter Writer. Create a compelling, personalized cover letter that connects this candidate with their target role.

${candidateInfo}

${jobInfo}

${exampleSection}

${portfolioSection}
${portfolioBaseSection}

Today's date: ${today}

RAW RESUME TEXT (for additional context):
${resume.rawText}

Generate a professional cover letter that:
1. Opens with a specific, genuine statement about this ${job.position} role at ${job.companyName} — avoid clichés
2. Demonstrates understanding of what the company does and what they need
3. Weaves 2–3 specific, concrete achievements from the candidate's background into the body paragraphs — integrate them naturally into prose, do NOT use a bullet list or boxed summary
4. Closes confidently with a clear call to action
5. Is formatted as a proper business letter with today's date
6. If a portfolio URL is available, embed 1–2 portfolio references as [PORTFOLIO_LINK text="Descriptive Name" url="..."] inline in sentences — not as standalone bullet points

TONE RULES — WRITE LIKE A HUMAN, NOT AN AI:
- Use specific, concrete language. Name the actual tools, projects, outcomes.
- Avoid all corporate buzzwords: do NOT use "dynamic", "passionate", "leverage", "synergy", "results-driven", "motivated", "team player", "innovative", "proactive", or similar filler words.
- Do not use hollow openers like "I am writing to express my interest..." or "I am excited to apply..."
- Write in a direct, natural voice as if the candidate wrote it themselves.

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

function buildReferencesHTML(references: Reference[]): string {
  if (!references || references.length === 0) return "";
  const rows: string[] = [];
  for (let i = 0; i < references.length; i += 2) {
    const ref1 = references[i];
    const ref2 = references[i + 1];
    const cellStyle = 'width:50%;padding:6px;vertical-align:top;';
    const entryStyle = 'background-color:#f7fafc;padding:10px 12px;border:1px solid #e2e8f0;line-height:1.3;';
    const nameStyle = 'font-weight:600;color:#2c5282;margin:0;padding:0;line-height:1.3;';
    const titleStyle = 'font-size:10pt;color:#4a5568;margin:0;padding:0;line-height:1.3;';
    const contactStyle = 'font-size:9pt;color:#4a5568;margin:0;padding:0;margin-top:2px;line-height:1.3;';
    const buildCell = (ref: Reference) =>
      `<td style="${cellStyle}"><div style="${entryStyle}"><div style="${nameStyle}">${ref.name}</div><div style="${titleStyle}">${ref.title}</div><div style="${contactStyle}">${ref.contact}</div></div></td>`;
    const cell1 = buildCell(ref1);
    const cell2 = ref2 ? buildCell(ref2) : `<td style="${cellStyle}"></td>`;
    rows.push(`<tr>${cell1}${cell2}</tr>`);
  }
  return `<!-- REFERENCES_BLOCK_START --><div class="section"><div class="section-title">References</div><table style="width:100%;border-collapse:collapse;">${rows.join("")}</table></div><!-- REFERENCES_BLOCK_END -->`;
}

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

  // Word-compatible Resume CSS Framework
  const resumeCssFramework = `
/* Word-Compatible Professional Resume CSS */
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #2d3748;
  max-width: 8.5in;
  margin: 0 auto;
  padding: 0.5in;
  background: white;
}

/* Header Styles */
.header {
  text-align: center;
  border-bottom: 3px solid #1a365d;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.name {
  font-size: 28pt;
  font-weight: 700;
  color: #1a365d;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.contact-info {
  font-size: 10pt;
  color: #4a5568;
}

.contact-info span { margin: 0 8px; }

.contact-info a {
  color: #3182ce;
  text-decoration: none;
}

/* Section Styles */
.section {
  margin-bottom: 18px;
  page-break-inside: avoid;
}

.section-title {
  font-size: 13pt;
  font-weight: 600;
  color: #1a365d;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  border-bottom: 2px solid #3182ce;
  padding-bottom: 5px;
  margin-bottom: 12px;
}

/* Professional Summary */
.summary {
  color: #4a5568;
  font-size: 11pt;
  line-height: 1.6;
  margin-bottom: 5px;
}

/* Competencies Table */
.competencies-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
}

.competencies-table td {
  width: 50%;
  padding: 8px 12px;
  vertical-align: top;
  border: 1px solid #e2e8f0;
  background-color: #f7fafc;
}

.competency-title {
  font-weight: 600;
  color: #2c5282;
  margin-bottom: 4px;
}

.competency-skills {
  font-size: 10pt;
  color: #4a5568;
}

/* Job Entry Styles */
.job-entry {
  margin-bottom: 15px;
  page-break-inside: avoid;
}

.job-header-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 5px;
}

.job-header-table td {
  padding: 0;
  vertical-align: baseline;
}

.job-header-table td:first-child {
  text-align: left;
}

.job-header-table td:last-child {
  text-align: right;
}

.job-title {
  font-weight: 600;
  color: #2c5282;
}

.job-company {
  font-weight: 500;
  color: #2d3748;
}

.job-dates {
  font-size: 10pt;
  color: #4a5568;
  font-style: italic;
}

.job-description ul {
  margin-left: 20px;
  margin-top: 5px;
}

.job-description li {
  margin-bottom: 4px;
}

/* Education & Certifications */
.education-entry, .certification-entry {
  margin-bottom: 10px;
}

.degree, .cert-name {
  font-weight: 600;
  color: #2c5282;
}

.institution {
  color: #2d3748;
}

.edu-dates {
  font-size: 10pt;
  color: #4a5568;
  font-style: italic;
}

/* Achievements */
.achievements-list {
  margin-left: 20px;
}

.achievements-list li {
  margin-bottom: 6px;
}

/* References Table */
.references-table {
  width: 100%;
  border-collapse: collapse;
}

.references-table td {
  width: 50%;
  padding: 10px;
  vertical-align: top;
}

.reference-entry {
  background-color: #f7fafc;
  padding: 12px;
  border: 1px solid #e2e8f0;
}

.reference-name {
  font-weight: 600;
  color: #2c5282;
}

.reference-title {
  font-size: 10pt;
  color: #4a5568;
}

.reference-contact {
  font-size: 9pt;
  color: #4a5568;
  margin-top: 0;
  padding-top: 0;
}

.reference-contact a {
  color: #3182ce;
  text-decoration: none;
}

/* Print Styles */
@media print {
  body { padding: 0; }
  .section { page-break-inside: avoid; }
  .job-entry { page-break-inside: avoid; }
}

@page {
  size: letter;
  margin: 0.5in;
}
`;

  // Professional Cover Letter CSS Framework
  const coverLetterCssFramework = `
/* Professional Cover Letter CSS - Word Compatible */
@page {
  size: 8.5in 11in;
  margin: 0.75in;
}

* { 
  margin: 0; 
  padding: 0; 
  box-sizing: border-box; 
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
} 

html {
  font-size: 16px;
  -webkit-text-size-adjust: 100%;
}

body { 
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
  line-height: 1.6; 
  color: #333; 
  width: 100%;
  max-width: 7in;
  margin: 0 auto; 
  padding: 0;
  background: #fff;
  font-size: 16px;
} 

/* Header for Letter (Sender Information) */
.letter-header { 
  text-align: left; 
  padding-bottom: 20px; 
  margin-bottom: 25px;
  page-break-inside: avoid;
} 

.sender-name { 
  font-size: 20px; 
  font-weight: 700; 
  color: #2c3e50; 
  margin-bottom: 3px;
  letter-spacing: 0.5px;
} 

.sender-contact { 
  font-size: 13px; 
  color: #555; 
  line-height: 1.4; 
  margin-bottom: 15px;
} 

.sender-contact a { 
  color: #3498db; 
  text-decoration: none; 
}

.sender-contact a:hover {
  text-decoration: underline;
}

/* Date */
.date { 
  font-size: 14px; 
  color: #555; 
  margin-bottom: 25px;
  page-break-after: avoid;
}

/* Recipient Information */
.recipient { 
  font-size: 14px; 
  color: #555; 
  margin-bottom: 25px; 
  line-height: 1.5;
  page-break-after: avoid;
}

.recipient-name {
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 2px;
}

.recipient-title {
  color: #7f8c8d;
  margin-bottom: 2px;
}

.recipient-company {
  color: #7f8c8d;
  margin-bottom: 2px;
}

.recipient-address {
  color: #7f8c8d;
}

/* Salutation */
.salutation { 
  font-size: 15px; 
  color: #444; 
  margin-bottom: 18px;
  page-break-after: avoid;
}

/* Letter Subject Line */
.subject { 
  font-weight: 700; 
  font-size: 16px; 
  color: #2c3e50; 
  margin-bottom: 20px; 
  border-bottom: 2px solid #3498db; 
  padding-bottom: 8px;
  page-break-after: avoid;
} 

/* Letter Body */
.letter-body { 
  font-size: 15px; 
  line-height: 1.7; 
  color: #444;
} 

.letter-body p { 
  margin-bottom: 18px; 
  text-align: justify;
  orphans: 2;
  widows: 2;
} 

/* Paragraph Emphasis */
.opening-paragraph {
  font-weight: 500;
  color: #2c3e50;
}

.highlight { 
  color: #3498db; 
  font-weight: 600; 
}

.emphasis {
  font-style: italic;
  color: #444;
}

/* Achievement/Qualification Highlights */
.achievements-summary {
  background: #f8f9fa;
  border-left: 4px solid #3498db;
  padding: 15px;
  margin: 15px 0;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
}

.achievements-summary ul {
  list-style: none;
  padding: 0;
  margin: 8px 0 0 0;
}

.achievements-summary li {
  padding-left: 20px;
  position: relative;
  margin-bottom: 6px;
}

.achievements-summary li:before {
  content: "";
  width: 5px;
  height: 5px;
  background-color: #3498db;
  border-radius: 50%;
  position: absolute;
  left: 0;
  top: 8px;
}

/* Call to Action */
.closing-statement {
  font-weight: 500;
  color: #2c3e50;
  margin-top: 18px;
  margin-bottom: 18px;
}

/* Signature Block */
.signature { 
  margin-top: 35px; 
  page-break-inside: avoid;
} 

.closing-phrase { 
  font-size: 15px; 
  color: #444; 
  margin-bottom: 25px;
}

.signature-name { 
  font-size: 16px; 
  font-weight: 700; 
  color: #2c3e50; 
  margin-bottom: 3px;
}

.signature-line {
  color: #ccc;
  margin-bottom: 20px;
}

.signature-contact {
  font-size: 13px;
  color: #555;
  line-height: 1.4;
}

.signature-contact a {
  color: #3498db;
  text-decoration: none;
}

/* Print Optimizations */
@media print {
  @page {
    size: 8.5in 11in;
    margin: 0.75in;
  }
  
  body { 
    padding: 0;
    max-width: none;
    width: 100%;
    font-size: 14px;
  }
  
  .letter-header, .date, .recipient, .salutation, .subject {
    page-break-inside: avoid;
  }
  
  .letter-body p {
    orphans: 3;
    widows: 3;
  }
  
  .sender-name {
    font-size: 18px;
  }
  
  .sender-contact, .date, .recipient, .salutation {
    font-size: 13px;
  }
  
  .subject {
    font-size: 15px;
  }
  
  .letter-body {
    font-size: 14px;
  }
  
  .achievements-summary {
    page-break-inside: avoid;
  }
  
  .signature {
    margin-top: 30px;
  }
}
`;

  // Choose appropriate CSS based on document type
  const cssFramework = docType.toLowerCase().includes("cover") ? coverLetterCssFramework : resumeCssFramework;

  // Build the contact line with proper HTML links
  const linkedInLink = personalInfo?.linkedIn 
    ? `<a href="${personalInfo.linkedIn.startsWith('http') ? personalInfo.linkedIn : 'https://' + personalInfo.linkedIn}" target="_blank" style="color: #3182ce; text-decoration: none;">LinkedIn</a>` 
    : '';
  const portfolioLink = personalInfo?.portfolio 
    ? `<a href="${personalInfo.portfolio.startsWith('http') ? personalInfo.portfolio : 'https://' + personalInfo.portfolio}" target="_blank" style="color: #3182ce; text-decoration: none;">Portfolio</a>` 
    : '';
  const emailLink = personalInfo?.email 
    ? `<a href="mailto:${personalInfo.email}" style="color: #3182ce; text-decoration: none;">${personalInfo.email}</a>` 
    : '';
  
  const contactParts = [
    personalInfo?.address || '',
    personalInfo?.phone || '',
    emailLink,
    linkedInLink,
    portfolioLink
  ].filter(Boolean);
  
  const contactInfoHTML = contactParts.join(' <span>|</span> ');

  // Build styled example section if provided
  const styledExampleSection = styledExampleText ? `
## STYLED EXAMPLE TO FOLLOW:
Here is an example of a styled ${docType} that shows the desired formatting, layout, and visual style.
MATCH THIS STYLE as closely as possible while maintaining Word compatibility:

${styledExampleText}

=== END OF STYLED EXAMPLE ===
` : "";

  // Pre-build references HTML to inject directly (ensures they are never omitted)
  const referencesHTML = references && references.length > 0 ? buildReferencesHTML(references) : "";

  // Portfolio link conversion instructions — fires whenever portfolioJson exists OR personalInfo.portfolio exists
  const hasPortfolio = !!portfolioJson || !!personalInfo?.portfolio;
  const portfolioLinkSection = hasPortfolio ? `
## PORTFOLIO LINK CONVERSION — MANDATORY:
The content contains markers like [PORTFOLIO_LINK text="Descriptive Name" url="https://..."]. You MUST convert EVERY such marker into a clickable inline hyperlink embedded naturally in the surrounding sentence.
Conversion format: <a href="URL_FROM_MARKER" target="_blank" style="color:#3182ce;text-decoration:none;">TEXT_FROM_MARKER</a>
Rules:
- Use the exact "text" attribute value as the visible link text
- Use the exact "url" attribute value as the href
- Remove the marker entirely and replace it with the hyperlink inline in the sentence
- Do NOT add "view in portfolio", "click here", or any generic label
- Do NOT convert markers into standalone lines — they must remain part of the surrounding sentence
- If no markers exist but personalInfo contains a portfolio URL (${personalInfo?.portfolio || ''}), you may add 1–2 natural inline hyperlinks to specific, relevant sentences
` : "";

  const isCoverLetter = docType.toLowerCase().includes("cover");
  
  // Build cover letter specific contact HTML
  const coverLetterContactHTML = `
    <div class="sender-name">${personalInfo?.fullName || ""}</div>
    <div class="sender-contact">
      ${personalInfo?.address ? `${personalInfo.address}<br>` : ''}
      ${personalInfo?.phone ? `${personalInfo.phone}<br>` : ''}
      ${personalInfo?.email ? `<a href="mailto:${personalInfo.email}" style="color: #3498db; text-decoration: none;">${personalInfo.email}</a><br>` : ''}
      ${personalInfo?.linkedIn ? `<a href="${personalInfo.linkedIn.startsWith('http') ? personalInfo.linkedIn : 'https://' + personalInfo.linkedIn}" target="_blank" style="color: #3498db; text-decoration: none;">LinkedIn</a><br>` : ''}
      ${personalInfo?.portfolio ? `<a href="${personalInfo.portfolio.startsWith('http') ? personalInfo.portfolio : 'https://' + personalInfo.portfolio}" target="_blank" style="color: #3498db; text-decoration: none;">Portfolio</a>` : ''}
    </div>
  `;

  const coverLetterPrompt = `You are a Professional Cover Letter Formatter. Transform the following cover letter content into a beautifully styled HTML document.
${styledExampleSection}
${portfolioLinkSection}
## CRITICAL - WORD COMPATIBILITY RULES:
1. DO NOT use CSS variables - use direct hex colors
2. DO NOT use flexbox or CSS Grid
3. Use simple, inline-friendly CSS properties
4. All colors must be hex codes (#2c3e50, #3498db, #555, etc.)

## CANDIDATE PERSONAL INFORMATION (USE THESE EXACT VALUES):
- Full Name: ${personalInfo?.fullName || ""}
- Email: ${personalInfo?.email || ""}
- Phone: ${personalInfo?.phone || ""}
- Address: ${personalInfo?.address || ""}
- LinkedIn URL: ${personalInfo?.linkedIn || ""}
- Portfolio URL: ${personalInfo?.portfolio || ""}

## CSS FRAMEWORK (embed this in the HTML):
${cssFramework}

## CONTENT TO FORMAT:
${content}

## REQUIRED HTML STRUCTURE FOR COVER LETTER:

Use this EXACT structure with the CSS classes from the framework:

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Cover Letter</title>
    <style>[EMBED FULL CSS HERE]</style>
</head>
<body>
    <div class="letter-header">
        ${coverLetterContactHTML}
    </div>

    <div class="date">[Today's date from the content]</div>

    <div class="recipient">
        <div class="recipient-name">[Hiring Manager name if known]</div>
        <div class="recipient-title">[Title if known]</div>
        <div class="recipient-company">[Company Name]</div>
        <div class="recipient-address">[Address if known]</div>
    </div>

    <div class="salutation">Dear [Recipient Name/Hiring Manager],</div>

    <div class="subject">Re: Application for [Position] at [Company]</div>

    <div class="letter-body">
        <p class="opening-paragraph">[Opening paragraph — specific and direct, no clichés]</p>
        <p>[Body paragraph 1 — weave a concrete achievement into natural prose]</p>
        <p>[Body paragraph 2 — connect another experience/skill to the role's needs]</p>
        <p>[Body paragraph 3 if needed — further relevant experience]</p>
        <p class="closing-statement">[Closing paragraph with confident call to action]</p>
    </div>

    <div class="signature">
        <div class="closing-phrase">Sincerely,</div>
        <div class="signature-name">${personalInfo?.fullName || ""}</div>
        <div class="signature-contact">
            ${personalInfo?.phone || ""} | <a href="mailto:${personalInfo?.email || ""}" style="color: #3498db; text-decoration: none;">${personalInfo?.email || ""}</a>
        </div>
    </div>
</body>
</html>

## CSS CLASSES TO USE:
- .letter-header, .sender-name, .sender-contact for header
- .date for the date line
- .recipient, .recipient-name, .recipient-title, .recipient-company for recipient
- .salutation for greeting
- .subject for subject line (with blue bottom border)
- .letter-body, .opening-paragraph, .highlight, .emphasis for body
- .closing-statement for final paragraph
- .signature, .closing-phrase, .signature-name, .signature-contact for signature

DO NOT include any achievements-summary box or bullet list box. Weave achievements naturally into prose paragraphs.

Return ONLY the complete HTML code, nothing else.`;

  const resumePrompt = `You are a professional resume formatter.

Transform the following ${docType} content into a beautifully styled HTML document that is FULLY COMPATIBLE WITH MICROSOFT WORD.
${styledExampleSection}
${portfolioLinkSection}
## CRITICAL - WORD COMPATIBILITY RULES:
1. DO NOT use CSS variables (var(--something)) - use direct hex colors like #1a365d
2. DO NOT use flexbox (display: flex) - use HTML tables for layouts
3. DO NOT use CSS Grid - use HTML tables for grid layouts
4. Use background-color instead of background for colors
5. Use simple, inline-friendly CSS properties
6. All colors must be hex codes, not CSS variables

## CRITICAL - CANDIDATE PERSONAL INFORMATION (USE THESE EXACT VALUES):
- Full Name: ${personalInfo?.fullName || ""}
- Email: ${personalInfo?.email || ""}
- Phone: ${personalInfo?.phone || ""}
- Address: ${personalInfo?.address || ""}
- LinkedIn URL: ${personalInfo?.linkedIn || ""}
- Portfolio URL: ${personalInfo?.portfolio || ""}

## CSS FRAMEWORK (embed this in the HTML):
${cssFramework}

## CONTENT TO FORMAT:
${content}

## REQUIREMENTS:

### CRITICAL - NO PLACEHOLDERS:
- NEVER use [Your Name], [Your Email], [Your Phone], [Your Address], [City, State, Zip] or any similar placeholder text
- Use the EXACT personal information provided above

### CRITICAL - HEADER MUST INCLUDE ALL CONTACT INFO:
For the header section, you MUST include this EXACT HTML structure:

<div class="header">
  <div class="name">${personalInfo?.fullName || ""}</div>
  <div class="contact-info">
    ${contactInfoHTML}
  </div>
</div>

### Use these sections in order:
1. Header (.header) - Use the EXACT header HTML shown above with actual name and all contact info
2. Professional Summary (.section with .summary)
3. Core Competencies - Use HTML table (.competencies-table) with 2x2 layout using <tr> and <td>
4. Professional Experience - Each job uses a table for header layout (.job-header-table with 2 <td> cells) and .job-description for bullets
5. Education (.education-entry)
6. Certifications (.certification-entry)
7. Key Achievements (.achievements-list)
8. References - Copy the REFERENCES_BLOCK_START...REFERENCES_BLOCK_END HTML below EXACTLY as-is into the output. Do NOT modify any inline styles, do NOT add whitespace, do NOT add <br> tags, do NOT reformat it. The inline styles already control all spacing — any modification will cause layout issues:
${referencesHTML || "<!-- No references provided -->"}

### Output Format:
- Complete HTML document with <!DOCTYPE html>
- Embed full CSS in <style> tag
- Use HTML tables for ALL layouts (competencies, references, job headers) - NOT flexbox or CSS Grid
- Use direct hex color codes like #1a365d, NOT CSS variables
- Include @page rules for PDF conversion
- Include print media queries
- ALL links must use proper <a href="URL"> tags with target="_blank" and inline color styling

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
