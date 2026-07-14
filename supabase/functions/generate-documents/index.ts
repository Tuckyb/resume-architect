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

// The resume object may come from either ParsedResumeData (parse-resume-pdf
// interface fields) OR directly from a user-uploaded JSON (the PdfUploader
// also accepts .json files). Alias helpers below resolve both conventions.
// deno-lint-ignore no-explicit-any
type RawResumeData = Record<string, any>;

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
  parsedResumeData: RawResumeData;
  jobTarget: JobTarget;
  documentType: "resume" | "cover-letter" | "both";
  exampleResumeText?: string | null;
  exampleCoverLetterText?: string | null;
  portfolioJson?: Record<string, unknown> | null;
  // Note: legacy clients may still send styledResumeText / styledCoverLetterText;
  // they are ignored - the Styalized design is rendered deterministically.
}

// --- Normalization: supports both "personalInfo" and "personal" keys, and
// JSON field aliases (name/fullName, linkedin/linkedIn). Identity data is
// injected into the rendered chrome and never authored by the LLM.
function normalizePersonalInfo(raw: RawResumeData): PersonalInfo {
  const p = raw.personalInfo || raw.personal || {};
  return {
    fullName: p.fullName || p.name || "",
    email: p.email || "",
    phone: p.phone || "",
    address: p.address || "",
    linkedIn: p.linkedIn || p.linkedin || "",
    portfolio: p.portfolio || "",
  };
}

// References: supports {name,title,contact} and {name,title,phone,email}.
function normalizeReferences(raw: RawResumeData): Reference[] {
  const referencesRaw = Array.isArray(raw.references) ? raw.references : [];
  // deno-lint-ignore no-explicit-any
  return referencesRaw.map((r: any) => ({
    name: r.name || "",
    title: r.title || "",
    contact: r.contact || r.phone || r.email || "",
  })).filter((r: Reference) => r.name);
}

function buildCandidateContext(raw: RawResumeData, job: JobTarget): string {
  const personalInfo = normalizePersonalInfo(raw);
  const referencesArray = normalizeReferences(raw);

  // --- Field alias helpers ---
  // deno-lint-ignore no-explicit-any
  const getExpTitle = (exp: any) => exp.title || exp.jobTitle || "";
  // deno-lint-ignore no-explicit-any
  const getExpPeriod = (exp: any) => exp.period || exp.duration || (exp.year ? String(exp.year) : "");
  // deno-lint-ignore no-explicit-any
  const getEduPeriod = (edu: any) => edu.period || edu.duration || (edu.year ? String(edu.year) : "");
  // deno-lint-ignore no-explicit-any
  const getEduStatus = (edu: any) => edu.status ? ` (${edu.status})` : "";

  const workExpArray = Array.isArray(raw.workExperience) ? raw.workExperience : [];
  const educationArray = Array.isArray(raw.education) ? raw.education : [];
  const certificationsArray = Array.isArray(raw.certifications) ? raw.certifications : [];

  // keyAchievements (JSON) vs achievements (interface)
  const achievementsArray = Array.isArray(raw.achievements)
    ? raw.achievements
    : Array.isArray(raw.keyAchievements)
      ? raw.keyAchievements
      : [];

  // Skills: supports both array [{category,items}] and plain object {categoryKey: string[]}
  let skillsText = "";
  if (Array.isArray(raw.skills)) {
    // deno-lint-ignore no-explicit-any
    skillsText = raw.skills.map((s: any) =>
      `${s.category}: ${Array.isArray(s.items) ? s.items.join(", ") : String(s.items)}`
    ).join("\n");
  } else if (raw.skills && typeof raw.skills === "object") {
    skillsText = Object.entries(raw.skills).map(([cat, items]) =>
      `${cat}: ${Array.isArray(items) ? (items as string[]).join(", ") : String(items)}`
    ).join("\n");
  }

  // Professional development (LinkedIn Learning, AI courses)
  const profDev = raw.professionalDevelopment;
  // deno-lint-ignore no-explicit-any
  const linkedInCourses: any[] = profDev?.linkedinLearning || [];
  // Trainings nested in education entries (e.g. School Community Trainings / Skool)
  // deno-lint-ignore no-explicit-any
  const aiCourses: any[] = educationArray
    // deno-lint-ignore no-explicit-any
    .filter((edu: any) => Array.isArray(edu.trainings))
    // deno-lint-ignore no-explicit-any
    .flatMap((edu: any) => edu.trainings);

  const profDevText = [
    // deno-lint-ignore no-explicit-any
    ...linkedInCourses.map((c: any) => `- ${c.course} (LinkedIn Learning)`),
    // deno-lint-ignore no-explicit-any
    ...aiCourses.map((c: any) => `- ${c.course} - ${c.provider}${c.instructor ? ` (Instructor: ${c.instructor})` : ""}`),
  ].join("\n");

  const referencesText = referencesArray.map((ref) =>
    `- ${ref.name} | ${ref.title} | ${ref.contact}`
  ).join("\n");

  return `
CANDIDATE INFORMATION:
- Full Name: ${personalInfo.fullName || "(see raw text)"}
- Location: ${personalInfo.address || "(see raw text)"}
- Portfolio: ${personalInfo.portfolio || "(none)"}

WORK EXPERIENCE (${workExpArray.length} entries - use these as the factual source, do NOT invent employers, dates, or outcomes):
${
    // deno-lint-ignore no-explicit-any
    workExpArray.length > 0 ? workExpArray.map((exp: any) => `
${getExpTitle(exp)} at ${exp.company} (${getExpPeriod(exp)})
${Array.isArray(exp.responsibilities) ? exp.responsibilities.map((r: string) => `- ${r}`).join("\n") : exp.responsibilities || ""}
`).join("\n") : "(not in structured data - extract from RAW RESUME TEXT below)"
  }

EDUCATION (${educationArray.length} entries - copy degree names, institutions and dates VERBATIM):
${
    // deno-lint-ignore no-explicit-any
    educationArray.length > 0 ? educationArray.map((edu: any) => {
      const period = getEduPeriod(edu);
      const status = getEduStatus(edu);
      const bullets = Array.isArray(edu.achievements) && edu.achievements.length > 0
        ? edu.achievements.map((a: string) => `- ${a}`).join("\n")
        : "";
      return `${edu.degree} - ${edu.institution} (${period}${status})\n${bullets}`;
    }).join("\n\n") : "(not in structured data - extract from RAW RESUME TEXT below)"
  }

SKILLS:
${skillsText || "(extract from RAW RESUME TEXT below)"}

CERTIFICATIONS (${certificationsArray.length} entries - copy VERBATIM, do NOT rephrase):
${
    // deno-lint-ignore no-explicit-any
    certificationsArray.length > 0 ? certificationsArray.map((c: any) => {
      if (typeof c === "string") return `- ${c}`;
      const title = c.title || c.name || String(c);
      const issuer = c.issuer ? ` - ${c.issuer}` : "";
      const yr = c.year ? ` (${c.year})` : "";
      return `- ${title}${issuer}${yr}`;
    }).join("\n") : "(not in structured data - extract from RAW RESUME TEXT below)"
  }
${profDevText ? `\nPROFESSIONAL DEVELOPMENT (include ALL of these in the professionalDevelopment field):\n${profDevText}` : ""}

KEY ACHIEVEMENTS (${achievementsArray.length} entries - ONLY career-level highlights, NO academic scores):
${
    // deno-lint-ignore no-explicit-any
    achievementsArray.length > 0 ? achievementsArray.map((a: any) => `- ${typeof a === "string" ? a : (a.achievement || a.title || String(a))}`).join("\n") : "(not in structured data - extract from RAW RESUME TEXT below)"
  }

REFERENCES (${referencesArray.length} entries - injected automatically into the final document, listed here for context only):
${referencesText || "(none provided)"}

TARGET JOB:
- Company: ${job.companyName}
- Position: ${job.position}
- Location: ${job.location || "Not specified"}
- Work Type: ${job.workType || "Not specified"}

JOB DESCRIPTION:
${job.jobDescription}

RAW RESUME TEXT (use as the primary source where structured data above is missing):
${raw.rawText || "(none)"}
`;
}

// Extract portfolio section anchors from crawl/portfolio JSON. The crawl
// results contain markdown links like [**Section Name**](url#anchor).
function extractPortfolioSections(pJson: Record<string, unknown> | null | undefined): string | null {
  if (!pJson) return null;
  const jsonStr = JSON.stringify(pJson);
  const anchorMatches = jsonStr.match(/https?:\/\/[^"'\s)]+#[a-zA-Z0-9_-]+/g);
  if (!anchorMatches || anchorMatches.length === 0) return null;
  const uniqueUrls = [...new Set(anchorMatches)];
  return uniqueUrls.map((url) => `- ${url}`).join("\n");
}

function buildPortfolioSections(
  raw: RawResumeData,
  portfolioJson?: Record<string, unknown> | null,
): string {
  const personalInfo = normalizePersonalInfo(raw);
  const basePortfolioUrl = personalInfo.portfolio || "";

  const dataSection = portfolioJson
    ? (() => {
      const jsonStr = JSON.stringify(portfolioJson, null, 2);
      const truncated = jsonStr.length > 3000 ? jsonStr.substring(0, 3000) + "\n... [truncated]" : jsonStr;
      return `
PORTFOLIO WEBSITE DATA:
The candidate has a portfolio website with the following content. When writing bullets or paragraphs that relate to projects or work demonstrated in this portfolio, embed portfolio references using the format [PORTFOLIO_LINK text="Descriptive Project Name" url="https://..."] where the text is a meaningful, context-specific description of what the reader will find (e.g. the project name, tool name, or a short descriptive phrase). NEVER use generic text like "view in portfolio". Only reference URLs that actually exist in the data below.

${truncated}
`;
    })()
    : "";

  const extractedSections = extractPortfolioSections(portfolioJson);

  // Unconditional base instruction - fires whenever a portfolio URL exists.
  const baseSection = basePortfolioUrl
    ? `
PORTFOLIO INSTRUCTION - MANDATORY:
The candidate has a portfolio at: ${basePortfolioUrl}
REQUIREMENT: Embed 3-5 inline portfolio hyperlinks across the resume bullets and project descriptions using the format:
[PORTFOLIO_LINK text="Descriptive phrase naming the specific project or skill area" url="EXACT_SECTION_URL"]

${
      extractedSections
        ? `PORTFOLIO SECTION URLS - USE THESE EXACT URLS (do NOT use the base URL alone - always link to the specific section):
${extractedSections}`
        : `Use the base URL: ${basePortfolioUrl} - append the most relevant path or anchor for the content being described.`
    }

Rules:
- The "text" MUST be the specific project name, technology, or skill area demonstrated - e.g. "AI Marketing Automation Suite", "Custom GPT Development", "Campaign Performance Dashboard"
- NEVER use generic text like "view in portfolio", "click here", "portfolio", "my work", or "see here"
- Embed the link INLINE within the bullet sentence - not as a standalone line item
- If a bullet mentions a specific project, tool, or skill demonstrated in the portfolio, it SHOULD carry a portfolio link
`
    : "";

  return dataSection + baseSection;
}

// Single structured-content Claude call. The model fills the tool schema; the
// deterministic renderer in _shared/styalized.ts produces the final HTML, so
// the model never writes CSS, layout, or identity/contact details.
async function generateStructuredContent(
  raw: RawResumeData,
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
EXAMPLE ${docType.toUpperCase().replace("-", " ")} (tone and content-style reference only - layout is handled automatically):
${exampleText}
`
    : "";

  const taskSection = docType === "resume"
    ? `Create a highly targeted, ATS-optimised resume for the ${job.position} role at ${job.companyName}:
1. The profile paragraphs must be tailored to the role and use industry keywords from the job posting.
2. Present work experience with strong action verbs and quantified achievements where the source resume supports them. Never invent employers, dates, or outcomes.
3. Group skills into 3-4 Core Capabilities themes that mirror the job's requirements.
4. Order tools and certifications by relevance to the job description.
5. If professional development courses are listed above, include ALL of them in the professionalDevelopment field.
6. Balance content across two pages via pageSplit (usually 2 jobs on page 1).`
    : `Create a compelling, personalised cover letter for the ${job.position} role at ${job.companyName}:
1. The opening paragraph must NEVER start with the word "I" - lead with a concept, observation, or the organisation's mission.
2. Demonstrate understanding of the company and role; connect 2-3 concrete experiences to the job requirements.
3. Bold the organisation name and key qualifications inline with <strong>.
4. Close with a one-sentence call to action.`;

  const prompt = `You are a Professional ${docType === "resume" ? "Resume Architect" : "Cover Letter Craftsman"}.

${buildCandidateContext(raw, job)}
${exampleSection}
${buildPortfolioSections(raw, portfolioJson)}

${taskSection}

Do NOT include the candidate's name, contact details, references, or today's date in the content - these are injected automatically by the renderer. Emit the content via the ${tool.name} tool.`;

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
        model: "claude-sonnet-5",
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

    const personalInfo = normalizePersonalInfo(parsedResumeData);
    const references = normalizeReferences(parsedResumeData);

    // Identity is injected deterministically, never LLM-authored — without a
    // name the documents render with empty mastheads/contact bars. Fail loudly.
    if (!personalInfo.fullName) {
      return new Response(
        JSON.stringify({
          error:
            "Resume data is missing personal info (name/contact). Re-upload your resume PDF or JSON in the My Information section, then generate again.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

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
      const htmlContent = renderResume(content, personalInfo, references, {
        company: jobTarget.companyName,
      });

      documents.push({
        type: "resume",
        // Structured content JSON - kept for debuggability; the UI uses htmlContent.
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
