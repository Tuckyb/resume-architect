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
}

// Generate document content using Claude
async function generateWithClaude(
  resume: ParsedResumeData,
  job: JobTarget,
  docType: "resume" | "cover-letter",
  exampleText: string | null | undefined,
  apiKey: string
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

  let prompt: string;

  if (docType === "resume") {
    prompt = `You are a Professional Resume Architect. Create a highly targeted, ATS-optimized resume that showcases this candidate's qualifications for the specific job opportunity.

${candidateInfo}

${jobInfo}

${exampleSection}

Today's date: ${today}

RAW RESUME TEXT (for additional context):
${resume.rawText}

Generate a complete, professional resume that:
1. Has a strong professional summary tailored to the ${job.position} role at ${job.companyName}
2. Highlights relevant skills and experience that match the job description
3. Uses industry keywords from the job posting
4. Presents work experience with strong action verbs and quantified achievements
5. Is organized with clear sections: Professional Summary, Core Competencies, Professional Experience, Education, Certifications, Key Achievements, References

Output ONLY the resume content in plain text with clear section headers. No HTML or markdown.`;
  } else {
    prompt = `You are a Professional Cover Letter Craftsman. Create a compelling, personalized cover letter that connects this candidate with their target role.

${candidateInfo}

${jobInfo}

${exampleSection}

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

async function formatWithClaude(
  content: string, 
  docType: string, 
  apiKey: string, 
  personalInfo?: ParsedResumeData['personalInfo'],
  styledExampleText?: string | null
): Promise<string> {
  console.log("Calling Claude API for HTML formatting...");
  console.log("Personal info for formatting:", JSON.stringify(personalInfo));
  console.log("Styled example provided:", !!styledExampleText);

  // Word-compatible CSS - NO CSS variables, NO flexbox, use inline colors and tables
  const cssFramework = `
/* Word-Compatible Professional Resume/Cover Letter CSS */
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
  font-style: italic;
  color: #4a5568;
  padding: 10px 15px;
  background-color: #f7fafc;
  border-left: 4px solid #3182ce;
}

/* Competencies Table - Word compatible */
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

/* Job Entry Styles - Using tables instead of flexbox for Word */
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
  margin-top: 5px;
}

.reference-contact a {
  color: #3182ce;
  text-decoration: none;
}

/* Cover Letter Specific */
.letter-header {
  margin-bottom: 30px;
}

.sender-info {
  text-align: right;
  margin-bottom: 20px;
}

.sender-info a {
  color: #3182ce;
  text-decoration: none;
}

.date {
  margin-bottom: 20px;
}

.recipient-info {
  margin-bottom: 20px;
}

.subject-line {
  font-weight: 600;
  margin-bottom: 20px;
}

.letter-body p {
  margin-bottom: 15px;
  text-align: justify;
}

.signature {
  margin-top: 30px;
}

.signature-name {
  font-weight: 600;
  margin-top: 40px;
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

  const resumePrompt = `You are a professional resume formatter.

Transform the following ${docType} content into a beautifully styled HTML document that is FULLY COMPATIBLE WITH MICROSOFT WORD.
${styledExampleSection}
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

### For Resumes - Use these sections in order:
1. Header (.header) - Use the EXACT header HTML shown above with actual name and all contact info
2. Professional Summary (.section with .summary)
3. Core Competencies - Use HTML table (.competencies-table) with 2x2 layout using <tr> and <td>
4. Professional Experience - Each job uses a table for header layout (.job-header-table with 2 <td> cells) and .job-description for bullets
5. Education (.education-entry)
6. Certifications (.certification-entry)
7. Key Achievements (.achievements-list)
8. References section using HTML table (.references-table) for 2-column layout

### For Cover Letters - Use these sections:
1. Letter header (.letter-header) with .sender-info containing ALL contact details:
   - Name: ${personalInfo?.fullName || ""}
   - Address: ${personalInfo?.address || ""}
   - Phone: ${personalInfo?.phone || ""}
   - Email: ${personalInfo?.email || ""} (as mailto: link)
   - LinkedIn: ${linkedInLink} (as clickable link)
   - Portfolio: ${portfolioLink} (as clickable link)
2. Date (.date)
3. Recipient info (.recipient-info)
4. Subject line (.subject-line)
5. Letter body (.letter-body) with paragraphs
6. Signature (.signature) with ACTUAL name "${personalInfo?.fullName || ""}"

### Output Format:
- Complete HTML document with <!DOCTYPE html>
- Embed full CSS in <style> tag
- Use HTML tables for ALL layouts (competencies, references, job headers) - NOT flexbox or CSS Grid
- Use direct hex color codes like #1a365d, NOT CSS variables
- Include @page rules for PDF conversion
- Include print media queries
- ALL links must use proper <a href="URL"> tags with target="_blank" and inline color styling

Return ONLY the complete HTML code, nothing else.`;

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
      messages: [{ role: "user", content: resumePrompt }],
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
      styledCoverLetterText 
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
        anthropicApiKey
      );
      
      console.log("Resume content generated, formatting with Claude...");
      const htmlResume = await formatWithClaude(rawResume, "resume", anthropicApiKey, parsedResumeData.personalInfo, styledResumeText);

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
        anthropicApiKey
      );
      
      console.log("Cover letter content generated, formatting with Claude...");
      const htmlCoverLetter = await formatWithClaude(rawCoverLetter, "cover letter", anthropicApiKey, parsedResumeData.personalInfo, styledCoverLetterText);

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
