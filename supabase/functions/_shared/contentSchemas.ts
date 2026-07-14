// Anthropic tool definitions for structured resume / cover-letter content.
// The LLM fills these schemas; the deterministic renderer in styalized.ts
// turns them into final HTML. Prompt-engineering changes happen here without
// touching the renderer.

const inlineMarkupNote =
  "Plain text. You may bold key phrases with <strong>...</strong>. " +
  'Where a point is demonstrated in the candidate\'s portfolio, embed an inline marker [PORTFOLIO_LINK text="Descriptive Project Name" url="https://..."] ' +
  "inside the sentence, where text names the specific project, tool, or skill area (never generic phrases like \"view in portfolio\"). " +
  "Use only URLs that appear in the provided portfolio data, preferring section #anchor URLs over the base URL.";

export const resumeContentTool = {
  name: "emit_resume_content",
  description:
    "Emit the tailored resume content for the Styalized two-page design. " +
    "Do NOT include the candidate's name, contact details, or references — these are injected automatically.",
  input_schema: {
    type: "object",
    properties: {
      roleTitle: {
        type: "string",
        description:
          'Professional headline matched to the candidate and the target role, max 5 words, e.g. "Communications & Marketing Professional".',
      },
      descriptor: {
        type: "string",
        description:
          'Short specialty label for the monogram block, max 4 words, e.g. "Marketing & AI Systems". Must be DIFFERENT from roleTitle — never repeat the headline.',
      },
      capabilities: {
        type: "array",
        description:
          "3-4 Core Capabilities groups for the sidebar, themed to the job's requirements.",
        items: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: 'Group heading, 2-5 words, e.g. "Strategic Communications & Engagement".',
            },
            items: {
              type: "string",
              description:
                "Comma-separated prose list of 4-7 skills in that group, ending with a full stop. NOT bullet points.",
            },
          },
          required: ["title", "items"],
        },
      },
      tools: {
        type: "array",
        description:
          "8-12 digital tools / platforms the candidate uses, most job-relevant first. 1-3 words each.",
        items: { type: "string" },
      },
      profile: {
        type: "array",
        description:
          "Exactly 2 Professional Profile paragraphs, each up to 60 words. First paragraph opens with the candidate's professional identity and may bold the 2-3 most job-relevant phrases with <strong>. ATS-optimise with keywords from the job description.",
        items: { type: "string" },
      },
      jobs: {
        type: "array",
        description:
          "3-6 work experience entries, most recent first, tailored to the target role with strong action verbs and quantified outcomes where the source resume supports them. Never invent employers or dates.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Position title." },
            org: {
              type: "string",
              description: 'Organisation name, e.g. "Purple Patch Consulting" or "Self-Employed · Fiverr".',
            },
            dates: { type: "string", description: 'Period, e.g. "2022–2023".' },
            bullets: {
              type: "array",
              description: "2-5 responsibility bullets, each up to 30 words. " + inlineMarkupNote,
              items: { type: "string" },
            },
            win: {
              type: "array",
              description:
                "Optional Key Achievements callout: 1-2 sentences, each its own array entry, stating concrete outcomes. Omit if the role has no standout achievement.",
              items: { type: "string" },
            },
          },
          required: ["title", "org", "dates", "bullets"],
        },
      },
      pageSplit: {
        type: "integer",
        description:
          "How many jobs appear on page 1 (the rest continue on page 2). Usually 2. Balance the two pages.",
      },
      education: {
        type: "array",
        description: "Education entries from the source resume.",
        items: {
          type: "object",
          properties: {
            degree: { type: "string" },
            institution: { type: "string" },
            dates: { type: "string", description: 'e.g. "2017–2024" or "In progress".' },
            note: {
              type: "string",
              description: "Optional 1-sentence detail (focus areas, relevant coursework).",
            },
            honor: {
              type: "string",
              description: 'Optional award/distinction, e.g. "100/100 in Marketing Strategy".',
            },
          },
          required: ["degree", "institution", "dates"],
        },
      },
      certifications: {
        type: "array",
        description:
          "Up to 8 certifications, most job-relevant first. Formal certifications only — do NOT repeat any course that you list in professionalDevelopment; the two lists must not overlap.",
        items: { type: "string" },
      },
      professionalDevelopment: {
        type: "array",
        description:
          "Professional development courses (LinkedIn Learning, AI trainings) when listed in the candidate data — include ALL of them, format: \"Course Name (Provider)\". These belong here ONLY — never also in certifications. Omit if none.",
        items: { type: "string" },
      },
      projects: {
        type: "array",
        description:
          "Optional: 1-3 'Selected Projects & Achievements' groups (e.g. 'Communications & digital engagement', 'Innovation & technology'), each with 2-4 bullets. " +
          inlineMarkupNote,
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Group heading, 2-5 words." },
            bullets: { type: "array", items: { type: "string" } },
          },
          required: ["title", "bullets"],
        },
      },
      communityNote: {
        type: "string",
        description:
          "Optional 'Community & Cultural Commitment' paragraph (2-3 sentences) if the source resume reflects community, cultural, or volunteer commitment. Omit otherwise.",
      },
    },
    required: [
      "roleTitle",
      "capabilities",
      "tools",
      "profile",
      "jobs",
      "pageSplit",
      "education",
      "certifications",
    ],
  },
} as const;

export const coverLetterContentTool = {
  name: "emit_cover_letter_content",
  description:
    "Emit the tailored cover letter content for the Styalized single-page design. " +
    "Do NOT include the candidate's name, contact details, the date, or the signature — these are injected automatically.",
  input_schema: {
    type: "object",
    properties: {
      roleTitle: {
        type: "string",
        description: "Professional headline matched to the candidate and role, max 5 words.",
      },
      descriptor: {
        type: "string",
        description:
          "Short specialty label for the monogram block, max 4 words. Must be DIFFERENT from roleTitle — never repeat the headline.",
      },
      recipientDepartment: {
        type: "string",
        description:
          "Optional second line of the recipient block (parent department/agency) when evident from the job listing.",
      },
      recipientName: {
        type: "string",
        description: 'Named hiring contact if present in the job listing; otherwise omit (defaults to "Hiring Manager").',
      },
      salutation: {
        type: "string",
        description: 'Name used after "Dear". Omit to default to "Hiring Manager".',
      },
      paragraphs: {
        type: "array",
        description:
          "5-7 letter body paragraphs with distinct purposes: " +
          "(1) opening hook — NEVER starts with the word 'I'; lead with a concept, observation, or the organisation's mission, then connect to the role; " +
          "(2) experience breadth aligned to the role; " +
          "(3) specific example with a named employer and concrete outcome; " +
          "(4) second example from a different angle; " +
          "(5) differentiator (AI, systems, tools, innovation); " +
          "(6) optional community/cultural commitment if relevant; " +
          "(7) close — qualifications summary plus a one-sentence call to action. " +
          "Bold the organisation name and key qualifications inline with <strong>. " +
          'Where relevant, embed [PORTFOLIO_LINK text="Descriptive Name" url="https://..."] markers inline, using only URLs present in the portfolio data.',
        items: { type: "string" },
      },
      closing: {
        type: "string",
        description: 'Sign-off line. Omit to default to "Kind regards,".',
      },
    },
    required: ["roleTitle", "paragraphs"],
  },
} as const;
