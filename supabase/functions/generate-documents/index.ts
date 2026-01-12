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
}

function buildResumePrompt(resume: ParsedResumeData, job: JobTarget): string {
  const { personalInfo, workExperience, education, skills, certifications, achievements, references } = resume;

  const skillsText = skills?.map(s => `${s.category}: ${s.items.join(", ")}`).join("\n") || "";
  
  const referencesText = references?.map(ref => 
    `- ${ref.name} | ${ref.title} | ${ref.contact}`
  ).join("\n") || "";

  return `Create a professional resume tailored for the ${job.position} position at ${job.companyName}.

CRITICAL INSTRUCTION: You MUST use the EXACT information provided below. DO NOT use placeholders like [Your Name] or [Your Email]. Use the actual values given.

=== CANDIDATE PERSONAL INFORMATION (USE EXACTLY AS PROVIDED) ===
Full Name: ${personalInfo?.fullName || ""}
Email: ${personalInfo?.email || ""}
Phone: ${personalInfo?.phone || ""}
Address: ${personalInfo?.address || ""}
LinkedIn URL: ${personalInfo?.linkedIn || ""}
Portfolio URL: ${personalInfo?.portfolio || ""}

=== WORK EXPERIENCE (USE EXACTLY AS PROVIDED) ===
${workExperience?.map(exp => `
**${exp.title}** at **${exp.company}** (${exp.period})
${exp.responsibilities.map(r => `• ${r}`).join("\n")}
`).join("\n") || "No work experience provided"}

=== EDUCATION (USE EXACTLY AS PROVIDED) ===
${education?.map(edu => `
**${edu.degree}** - ${edu.institution} (${edu.period})
${edu.achievements?.length ? edu.achievements.map(a => `• ${a}`).join("\n") : ""}
`).join("\n") || "No education provided"}

=== SKILLS ===
${skillsText || "No skills provided"}

=== CERTIFICATIONS ===
${certifications?.join(", ") || "No certifications provided"}

=== KEY ACHIEVEMENTS ===
${achievements?.map(a => `• ${a}`).join("\n") || "No achievements provided"}

=== REFERENCES ===
${referencesText || "Available upon request"}

=== TARGET JOB ===
Company: ${job.companyName}
Position: ${job.position}
Location: ${job.location || "Not specified"}
Work Type: ${job.workType || "Not specified"}
Job Description: ${job.jobDescription}

=== OUTPUT REQUIREMENTS ===
1. Start with a HEADER containing the candidate's actual name, address, phone, email, and profile links
2. Write a compelling PROFESSIONAL SUMMARY tailored to this specific role
3. Include CORE COMPETENCIES organized in a 2x2 grid format
4. List all PROFESSIONAL EXPERIENCE with bullet points for responsibilities
5. Include EDUCATION with achievements
6. List CERTIFICATIONS
7. Include KEY ACHIEVEMENTS
8. Include REFERENCES section with actual names, titles, and contact info

IMPORTANT: 
- Use the candidate's ACTUAL NAME "${personalInfo?.fullName || ""}" in the header - NOT "[Your Name]"
- Use the ACTUAL EMAIL "${personalInfo?.email || ""}" - NOT "[Your Email]"
- Use the ACTUAL PHONE "${personalInfo?.phone || ""}" - NOT "[Your Phone]"
- Use the ACTUAL ADDRESS "${personalInfo?.address || ""}" - NOT "[Your Address]"
- LinkedIn and Portfolio should be labeled links, not just URLs

Format the output as clean, structured text with clear section headers.`;
}

function buildCoverLetterPrompt(resume: ParsedResumeData, job: JobTarget): string {
  const { personalInfo, workExperience, achievements } = resume;

  const today = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return `Write a compelling cover letter for the ${job.position} position at ${job.companyName}.

CRITICAL INSTRUCTION: You MUST use the EXACT candidate information provided below. DO NOT use placeholders like [Your Name] or [Your Email]. Use the actual values given.

=== SENDER INFORMATION (USE EXACTLY AS PROVIDED) ===
Full Name: ${personalInfo?.fullName || ""}
Email: ${personalInfo?.email || ""}
Phone: ${personalInfo?.phone || ""}
Address: ${personalInfo?.address || ""}
LinkedIn URL: ${personalInfo?.linkedIn || ""}
Portfolio URL: ${personalInfo?.portfolio || ""}
Today's Date: ${today}

=== KEY EXPERIENCE ===
${workExperience?.slice(0, 3).map(exp => `
**${exp.title}** at **${exp.company}**
${exp.responsibilities.slice(0, 3).map(r => `• ${r}`).join("\n")}
`).join("\n") || "No experience provided"}

=== KEY ACHIEVEMENTS ===
${achievements?.slice(0, 5).map(a => `• ${a}`).join("\n") || "No achievements provided"}

=== TARGET JOB ===
Company: ${job.companyName}
Position: ${job.position}
Location: ${job.location || ""}
Job Description: ${job.jobDescription}

=== OUTPUT REQUIREMENTS ===
1. START with sender info block (right-aligned):
   - ${personalInfo?.fullName || ""}
   - ${personalInfo?.address || ""}
   - ${personalInfo?.phone || ""}
   - ${personalInfo?.email || ""}
   - LinkedIn Profile | Portfolio (as labeled links)

2. Date: ${today}

3. Recipient info:
   - "Dear Hiring Team at ${job.companyName},"

4. Body: 3-4 paragraphs that:
   - Open with a compelling hook showing genuine interest
   - Connect specific achievements to job requirements
   - Show understanding of the company
   - End with a confident call to action

5. END with:
   - "Warm regards,"
   - ${personalInfo?.fullName || ""}

IMPORTANT:
- Use the candidate's ACTUAL NAME "${personalInfo?.fullName || ""}" - NOT "[Your Name]"
- Use the ACTUAL EMAIL "${personalInfo?.email || ""}" - NOT "[Your Email]"  
- Use the ACTUAL PHONE "${personalInfo?.phone || ""}" - NOT "[Your Phone]"
- Use the ACTUAL ADDRESS "${personalInfo?.address || ""}" - NOT "[Your Address]"
- Do NOT include "[City, State, Zip]" placeholders
- Make the letter 300-400 words, unique and memorable`;
}

async function generateWithOpenAI(prompt: string, apiKey: string, personalInfo?: ParsedResumeData['personalInfo']): Promise<string> {
  console.log("Calling OpenAI API...");
  console.log("Personal info being used:", JSON.stringify(personalInfo));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert resume writer and career coach. You create professional, tailored resumes and cover letters.

CRITICAL RULE: You MUST NEVER use placeholder text like [Your Name], [Your Email], [Your Phone], [Your Address], [City, State, Zip], etc.
Always use the EXACT information provided in the user's prompt. If any information is missing, simply omit that field - DO NOT use brackets or placeholder text.

The candidate's information is:
- Name: ${personalInfo?.fullName || ""}
- Email: ${personalInfo?.email || ""}
- Phone: ${personalInfo?.phone || ""}
- Address: ${personalInfo?.address || ""}
- LinkedIn: ${personalInfo?.linkedIn || ""}
- Portfolio: ${personalInfo?.portfolio || ""}`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices[0].message.content;
  
  // Post-process to replace any remaining placeholders with actual values
  if (personalInfo) {
    content = content.replace(/\[Your Name\]/gi, personalInfo.fullName || '');
    content = content.replace(/\[Your Email\]/gi, personalInfo.email || '');
    content = content.replace(/\[Your Phone\]/gi, personalInfo.phone || '');
    content = content.replace(/\[Your Address\]/gi, personalInfo.address || '');
    content = content.replace(/\[City,?\s*State,?\s*Zip\]/gi, '');
    content = content.replace(/\[LinkedIn URL\]/gi, personalInfo.linkedIn || '');
    content = content.replace(/\[Portfolio URL\]/gi, personalInfo.portfolio || '');
  }
  
  return content;
}

async function formatWithClaude(content: string, docType: string, apiKey: string, personalInfo?: ParsedResumeData['personalInfo']): Promise<string> {
  console.log("Calling Claude API for HTML formatting with resume-formatter skill...");
  console.log("Personal info for formatting:", JSON.stringify(personalInfo));

  const cssFramework = `
/* Professional Resume/Cover Letter CSS Framework */
:root {
  --primary-color: #1a365d;
  --secondary-color: #2c5282;
  --accent-color: #3182ce;
  --text-color: #2d3748;
  --text-light: #4a5568;
  --border-color: #e2e8f0;
  --bg-light: #f7fafc;
  --bg-accent: #ebf8ff;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: var(--text-color);
  max-width: 8.5in;
  margin: 0 auto;
  padding: 0.5in;
  background: white;
}

/* Header Styles */
.header {
  text-align: center;
  border-bottom: 3px solid var(--primary-color);
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.name {
  font-size: 28pt;
  font-weight: 700;
  color: var(--primary-color);
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.contact-info {
  font-size: 10pt;
  color: var(--text-light);
}

.contact-info span { margin: 0 8px; }

/* Section Styles */
.section {
  margin-bottom: 18px;
  page-break-inside: avoid;
}

.section-title {
  font-size: 13pt;
  font-weight: 600;
  color: var(--primary-color);
  text-transform: uppercase;
  letter-spacing: 1.5px;
  border-bottom: 2px solid var(--accent-color);
  padding-bottom: 5px;
  margin-bottom: 12px;
}

/* Professional Summary */
.summary {
  font-style: italic;
  color: var(--text-light);
  padding: 10px 15px;
  background: var(--bg-light);
  border-left: 4px solid var(--accent-color);
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
  border: 1px solid var(--border-color);
}

.competency-title {
  font-weight: 600;
  color: var(--secondary-color);
  margin-bottom: 4px;
}

.competency-skills {
  font-size: 10pt;
  color: var(--text-light);
}

/* Job Entry Styles */
.job-entry {
  margin-bottom: 15px;
  page-break-inside: avoid;
}

.job-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 5px;
}

.job-title {
  font-weight: 600;
  color: var(--secondary-color);
}

.job-company {
  font-weight: 500;
  color: var(--text-color);
}

.job-dates {
  font-size: 10pt;
  color: var(--text-light);
  font-style: italic;
}

.job-description ul {
  margin-left: 20px;
  margin-top: 5px;
}

.job-description li {
  margin-bottom: 4px;
  position: relative;
}

.job-description li::marker {
  color: var(--accent-color);
}

/* Education & Certifications */
.education-entry, .certification-entry {
  margin-bottom: 10px;
}

.degree, .cert-name {
  font-weight: 600;
  color: var(--secondary-color);
}

.institution {
  color: var(--text-color);
}

.edu-dates {
  font-size: 10pt;
  color: var(--text-light);
  font-style: italic;
}

/* Achievements */
.achievements-list {
  margin-left: 20px;
}

.achievements-list li {
  margin-bottom: 6px;
}

.achievements-list li::marker {
  color: var(--accent-color);
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
  background: var(--bg-light);
  padding: 12px;
  border-radius: 4px;
}

.reference-name {
  font-weight: 600;
  color: var(--secondary-color);
}

.reference-title {
  font-size: 10pt;
  color: var(--text-light);
}

.reference-contact {
  font-size: 9pt;
  color: var(--text-light);
  margin-top: 5px;
}

/* Cover Letter Specific */
.letter-header {
  margin-bottom: 30px;
}

.sender-info {
  text-align: right;
  margin-bottom: 20px;
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

  const resumePrompt = `You are a professional resume formatter using the resume-formatter skill.

Transform the following ${docType} content into a beautifully styled HTML document.

## CRITICAL - CANDIDATE PERSONAL INFORMATION (USE THESE EXACT VALUES):
- Full Name: ${personalInfo?.fullName || ""}
- Email: ${personalInfo?.email || ""}
- Phone: ${personalInfo?.phone || ""}
- Address: ${personalInfo?.address || ""}
- LinkedIn: ${personalInfo?.linkedIn || ""}
- Portfolio: ${personalInfo?.portfolio || ""}

## CSS FRAMEWORK (embed this in the HTML):
${cssFramework}

## CONTENT TO FORMAT:
${content}

## REQUIREMENTS:

### CRITICAL - NO PLACEHOLDERS:
- NEVER use [Your Name], [Your Email], [Your Phone], [Your Address], [City, State, Zip] or any similar placeholder text
- Use the EXACT personal information provided above
- If LinkedIn or Portfolio URLs exist, make them clickable hyperlinks

### For Resumes - Use these sections in order:
1. Header (.header) - Use the candidate's ACTUAL name "${personalInfo?.fullName || ""}" in .name class
   - Contact info (.contact-info) must show: ${personalInfo?.address || ""} | ${personalInfo?.phone || ""} | ${personalInfo?.email || ""}
   - Add links for LinkedIn and Portfolio if provided
2. Professional Summary (.section with .summary)
3. Core Competencies - Use HTML table (.competencies-table) with 2x2 layout
4. Professional Experience - Each job in .job-entry with .job-header (flexbox) and .job-description
5. Education (.education-entry)
6. Certifications (.certification-entry)
7. Key Achievements (.achievements-list)
8. References section if provided

### For Cover Letters - Use these sections:
1. Letter header (.letter-header) with .sender-info containing the ACTUAL contact details
2. Date (.date)
3. Recipient info (.recipient-info)
4. Subject line (.subject-line)
5. Letter body (.letter-body) with paragraphs
6. Signature (.signature) with ACTUAL name "${personalInfo?.fullName || ""}"

### Output Format:
- Complete HTML document with <!DOCTYPE html>
- Embed full CSS in <style> tag
- Use HTML tables for competencies and references (not CSS Grid) for Word compatibility
- Include @page rules for PDF conversion
- Include print media queries
- Mobile responsive design

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

async function sendToMakeWebhook(documents: unknown[], webhookUrl: string): Promise<void> {
  if (!webhookUrl) {
    console.log("No Make.com webhook URL configured, skipping...");
    return;
  }

  console.log("Sending to Make.com webhook...");

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documents }),
    });

    if (!response.ok) {
      console.error("Make.com webhook error:", response.status);
    } else {
      console.log("Successfully sent to Make.com");
    }
  } catch (error) {
    console.error("Make.com webhook error:", error);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    const makeWebhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");

    if (!openaiApiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    if (!anthropicApiKey) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const requestData: RequestData = await req.json();
    const { parsedResumeData, jobTarget, documentType } = requestData;

    console.log(
      `Generating documents for: ${jobTarget.position} at ${jobTarget.companyName}`
    );

    const documents: Array<{ type: string; rawContent: string; htmlContent: string }> = [];

    // Generate Resume
    if (documentType === "resume" || documentType === "both") {
      console.log("Generating resume...");
      const resumePrompt = buildResumePrompt(parsedResumeData, jobTarget);
      const rawResume = await generateWithOpenAI(resumePrompt, openaiApiKey, parsedResumeData.personalInfo);
      console.log("Resume content generated, formatting with Claude...");
      const htmlResume = await formatWithClaude(rawResume, "resume", anthropicApiKey, parsedResumeData.personalInfo);

      documents.push({
        type: "resume",
        rawContent: rawResume,
        htmlContent: htmlResume,
      });
    }

    // Generate Cover Letter
    if (documentType === "cover-letter" || documentType === "both") {
      console.log("Generating cover letter...");
      const coverLetterPrompt = buildCoverLetterPrompt(parsedResumeData, jobTarget);
      const rawCoverLetter = await generateWithOpenAI(coverLetterPrompt, openaiApiKey, parsedResumeData.personalInfo);
      console.log("Cover letter content generated, formatting with Claude...");
      const htmlCoverLetter = await formatWithClaude(rawCoverLetter, "cover letter", anthropicApiKey, parsedResumeData.personalInfo);

      documents.push({
        type: "cover-letter",
        rawContent: rawCoverLetter,
        htmlContent: htmlCoverLetter,
      });
    }

    // Send to Make.com webhook if configured
    await sendToMakeWebhook(documents, makeWebhookUrl || "");

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
