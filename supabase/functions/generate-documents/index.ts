import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

import {
  type CoverLetterContent,
  type PersonalInfo,
  type Reference,
  renderCoverLetter,
  renderResume,
  type ResumeContent,
  validateCoverLetterContent,
  validateResumeContent,
} from "../_shared/styalized.ts";
import { coverLetterContentTool, resumeContentTool } from "../_shared/contentSchemas.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedResumeData {
  rawText: string;
  personalInfo?: PersonalInfo;
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
  portfolioJson?: Record<string, unknown> | null;
  // Note: legacy clients may still send styledResumeText / styledCoverLetterText;
  // they are ignored — the Styalized design is rendered deterministically.
}

function buildCandidateContext(resume: ParsedResumeData, job: JobTarget): string {
  const { personalInfo, workExperience, education, skills, certifications, achievements } = resume;

  const skillsText = skills?.map((s) => `${s.category}: ${s.items.join(", ")}`).join("\n") || "";

  return `
CANDIDATE INFORMATION:
- Full Name: ${personalInfo?.fullName || "Not provided"}
- Location: ${personalInfo?.address || "Not provided"}

WORK EXPERIENCE:
${
    workExperience?.map((exp) => `
${exp.title} at ${exp.company} (${exp.period})
${exp.responsibilities.map((r) => `• ${r}`).join("\n")}
`).join("\n") || "Not provided"
  }

EDUCATION:
${
    education?.map((edu) => `
${edu.degree} - ${edu.institution} (${edu.period})
${edu.achievements?.map((a) => `• ${a}`).join("\n") || ""}
`).join("\n") || "Not provided"
  }

SKILLS:
${skillsText || "Not provided"}

CERTIFICATIONS:
${certifications?.join(", ") || "Not provided"}

ACHIEVEMENTS:
${achievements?.map((a) => `• ${a}`).join("\n") || "Not provided"}

TARGET JOB:
- Company: ${job.companyName}
- Position: ${job.position}
- Location: ${job.location || "Not specified"}
- Work Type: ${job.workType || "Not specified"}

JOB DESCRIPTION:
${job.jobDescription}

RAW RESUME TEXT (for additional context):
${resume.rawText}
`;
}

function buildPortfolioSection(portfolioJson?: Record<string, unknown> | null): string {
  if (!portfolioJson) return "";
  const jsonStr = JSON.stringify(portfolioJson, null, 2);
  const truncated = jsonStr.length > 3000 ? jsonStr.substring(0, 3000) + "\n... [truncated]" : jsonStr;
  return `
PORTFOLIO WEBSITE DATA:
The candidate has a portfolio website with the following content. Where a bullet
or paragraph relates to work demonstrated in this portfolio, append the marker
[PORTFOLIO: url]. Only use URLs that actually exist in the data below.

${truncated}
`;
}

// Single structured-content Claude call. The model fills the tool schema; the
// deterministic renderer in _shared/styalized.ts produces the final HTML, so
// the model never writes CSS, layout, or identity/contact details.
async function generateStructuredContent(
  resume: ParsedResumeData,
  job: JobTarget,
  docType: "resume" | "cover-letter",
  exampleText: string | null | undefined,
  apiKey: string,
  portfolioJson?: Record<string, unknown> | null,
): Promise<Record<string, unknown>> {
  console.log(`Generating structured ${docType} content with Claude...`);

  const tool = docType === "resume" ? resumeContentTool : coverLetterContentTool;

  const exampleSection = exampleText
    ? `
EXAMPLE ${docType.toUpperCase().replace("-", " ")} (tone and content-style reference only — layout is handled automatically):
${exampleText}
`
    : "";

  const taskSection = docType === "resume"
    ? `Create a highly targeted, ATS-optimised resume for the ${job.position} role at ${job.companyName}:
1. The profile paragraphs must be tailored to the role and use industry keywords from the job posting.
2. Present work experience with strong action verbs and quantified achievements where the source resume supports them. Never invent employers, dates, or outcomes.
3. Group skills into 3-4 Core Capabilities themes that mirror the job's requirements.
4. Order tools and certifications by relevance to the job description.
5. Balance content across two pages via pageSplit (usually 2 jobs on page 1).`
    : `Create a compelling, personalised cover letter for the ${job.position} role at ${job.companyName}:
1. The opening paragraph must NEVER start with the word "I" — lead with a concept, observation, or the organisation's mission.
2. Demonstrate understanding of the company and role; connect 2-3 concrete experiences to the job requirements.
3. Bold the organisation name and key qualifications inline with <strong>.
4. Close with a one-sentence call to action.`;

  const prompt = `You are a Professional ${docType === "resume" ? "Resume Architect" : "Cover Letter Craftsman"}.

${buildCandidateContext(resume, job)}
${exampleSection}
${buildPortfolioSection(portfolioJson)}

${taskSection}

Do NOT include the candidate's name, contact details, references, or today's date in the content — these are injected automatically by the renderer. Emit the content via the ${tool.name} tool.`;

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        tools: [tool],
        tool_choice: { type: "tool", name: tool.name },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      lastError = `Claude API error: ${response.status} ${await response.text()}`;
      console.error(lastError);
      continue;
    }

    const data = await response.json();
    const toolUse = (data.content as Array<{ type: string; input?: unknown }>)
      ?.find((b) => b.type === "tool_use");

    if (!toolUse?.input || data.stop_reason === "max_tokens") {
      lastError = `Claude did not return complete structured content (stop_reason: ${data.stop_reason})`;
      console.error(lastError);
      continue;
    }

    console.log(`${docType} structured content generated successfully`);
    return toolUse.input as Record<string, unknown>;
  }

  throw new Error(lastError || "Claude did not return structured content");
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
      portfolioJson,
    } = requestData;

    console.log(`Generating documents for: ${jobTarget.position} at ${jobTarget.companyName}`);
    console.log(`Document type requested: ${documentType}`);

    const personalInfo: PersonalInfo = parsedResumeData.personalInfo ?? {};
    const documents: Array<{ type: string; rawContent: string; htmlContent: string }> = [];

    if (documentType === "resume" || documentType === "both") {
      const raw = await generateStructuredContent(
        parsedResumeData,
        jobTarget,
        "resume",
        exampleResumeText,
        anthropicApiKey,
        portfolioJson,
      );
      const content: ResumeContent = validateResumeContent(raw);
      const htmlContent = renderResume(content, personalInfo, parsedResumeData.references);

      documents.push({
        type: "resume",
        // Structured content JSON — kept for debuggability; the UI uses htmlContent.
        rawContent: JSON.stringify(content, null, 2),
        htmlContent,
      });
    }

    if (documentType === "cover-letter" || documentType === "both") {
      const raw = await generateStructuredContent(
        parsedResumeData,
        jobTarget,
        "cover-letter",
        exampleCoverLetterText,
        anthropicApiKey,
        portfolioJson,
      );
      const content: CoverLetterContent = validateCoverLetterContent(raw);
      const htmlContent = renderCoverLetter(content, personalInfo, jobTarget.companyName);

      documents.push({
        type: "cover-letter",
        rawContent: JSON.stringify(content, null, 2),
        htmlContent,
      });
    }

    console.log(`Generated ${documents.length} document(s) successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        documents,
        message: `Generated ${documents.length} document(s)`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
