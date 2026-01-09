import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  const { personalInfo, workExperience, education, skills, certifications, achievements } = resume;

  const skillsText = skills?.map(s => `${s.category}: ${s.items.join(", ")}`).join("\n") || "";

  return `Create a professional resume for the following candidate, tailored for the ${job.position} position at ${job.companyName}.

CANDIDATE INFORMATION:
Name: ${personalInfo?.fullName || "Not provided"}
Email: ${personalInfo?.email || "Not provided"}
Phone: ${personalInfo?.phone || "Not provided"}
Address: ${personalInfo?.address || "Not provided"}
LinkedIn: ${personalInfo?.linkedIn || "Not provided"}
Portfolio: ${personalInfo?.portfolio || "Not provided"}

WORK EXPERIENCE:
${workExperience?.map(exp => `
${exp.title} at ${exp.company} (${exp.period})
${exp.responsibilities.map(r => `• ${r}`).join("\n")}
`).join("\n") || "Not provided"}

EDUCATION:
${education?.map(edu => `
${edu.degree} - ${edu.institution} (${edu.period})
${edu.achievements?.length ? edu.achievements.map(a => `• ${a}`).join("\n") : ""}
`).join("\n") || "Not provided"}

SKILLS:
${skillsText || "Not provided"}

CERTIFICATIONS:
${certifications?.join(", ") || "Not provided"}

KEY ACHIEVEMENTS:
${achievements?.map(a => `• ${a}`).join("\n") || "Not provided"}

TARGET JOB:
Company: ${job.companyName}
Position: ${job.position}
Location: ${job.location || "Not specified"}
Work Type: ${job.workType || "Not specified"}
Job Description: ${job.jobDescription}

Please write a complete, ATS-optimized resume that:
1. Highlights relevant experience for this specific role
2. Uses strong action verbs and quantifiable achievements
3. Creates a compelling professional summary tailored to the target position
4. Organizes skills to emphasize those most relevant to the job
5. Maintains a professional tone throughout

Format the output as clean, structured text with clear section headers.`;
}

function buildCoverLetterPrompt(resume: ParsedResumeData, job: JobTarget): string {
  const { personalInfo, workExperience, achievements } = resume;

  return `Write a compelling cover letter for ${personalInfo?.fullName || "the candidate"} applying for the ${job.position} position at ${job.companyName}.

CANDIDATE DETAILS:
Name: ${personalInfo?.fullName || "Not provided"}
Email: ${personalInfo?.email || "Not provided"}
Phone: ${personalInfo?.phone || "Not provided"}
Address: ${personalInfo?.address || "Not provided"}

KEY EXPERIENCE:
${workExperience?.slice(0, 3).map(exp => `
${exp.title} at ${exp.company}
${exp.responsibilities.slice(0, 2).map(r => `• ${r}`).join("\n")}
`).join("\n") || "Not provided"}

KEY ACHIEVEMENTS:
${achievements?.slice(0, 5).map(a => `• ${a}`).join("\n") || "Not provided"}

TARGET JOB:
Company: ${job.companyName}
Position: ${job.position}
Location: ${job.location || "Not specified"}
Job Description: ${job.jobDescription}

Write a personalized, engaging cover letter that:
1. Opens with a compelling hook that demonstrates genuine interest
2. Connects the candidate's specific achievements to the job requirements
3. Shows understanding of the company and the role
4. Demonstrates personality while maintaining professionalism
5. Ends with a confident call to action

The letter should be 3-4 paragraphs, approximately 300-400 words. Do NOT use generic phrases like "I am writing to apply for..." - make it unique and memorable.

Format: Include proper business letter formatting with date and address headers.`;
}

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<string> {
  console.log("Calling OpenAI API...");

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
          content:
            "You are an expert resume writer and career coach. You create professional, tailored resumes and cover letters that help candidates stand out while being ATS-friendly.",
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
  return data.choices[0].message.content;
}

async function formatWithClaude(content: string, docType: string, apiKey: string): Promise<string> {
  console.log("Calling Claude API for HTML formatting...");

  const prompt = `Convert the following ${docType} content into a beautifully styled HTML document.

CONTENT:
${content}

REQUIREMENTS:
1. Create a complete HTML document with embedded CSS
2. Use a modern, professional design with clean typography
3. Use a color scheme of navy blue (#1a365d) as primary and light gray (#f7fafc) as background
4. Include proper spacing, margins, and padding
5. Make it print-friendly with @media print styles
6. Use a two-column layout for skills/competencies if applicable
7. Add subtle visual elements like dividers and section backgrounds
8. Ensure the document is responsive
9. Use professional fonts (system fonts that work everywhere)

Return ONLY the complete HTML code, nothing else. The HTML should be ready to save and open in a browser.`;

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
      const rawResume = await generateWithOpenAI(resumePrompt, openaiApiKey);
      console.log("Resume content generated, formatting with Claude...");
      const htmlResume = await formatWithClaude(rawResume, "resume", anthropicApiKey);

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
      const rawCoverLetter = await generateWithOpenAI(coverLetterPrompt, openaiApiKey);
      console.log("Cover letter content generated, formatting with Claude...");
      const htmlCoverLetter = await formatWithClaude(rawCoverLetter, "cover letter", anthropicApiKey);

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
