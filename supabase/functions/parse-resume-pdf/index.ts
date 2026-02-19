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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { pdfBase64, fileName } = await req.json();

    if (!pdfBase64) {
      throw new Error("No PDF data provided");
    }

    console.log(`Parsing PDF: ${fileName}`);

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const systemPrompt = `You are a resume parser. Extract structured information from the resume PDF provided.
            
Return a JSON object with this structure:
{
  "rawText": "the full text content",
  "personalInfo": {
    "fullName": "name if found",
    "email": "email if found",
    "phone": "phone if found",
    "address": "address if found",
    "linkedIn": "linkedin url if found",
    "portfolio": "portfolio url if found"
  },
  "workExperience": [
    {
      "id": "unique-id",
      "title": "job title",
      "company": "company name",
      "period": "date range",
      "responsibilities": ["list", "of", "responsibilities"]
    }
  ],
  "education": [
    {
      "id": "unique-id",
      "degree": "degree name",
      "institution": "school name",
      "period": "date range",
      "achievements": ["honors", "gpa", "etc"]
    }
  ],
  "skills": [
    {
      "category": "category name like 'Technical' or 'Marketing'",
      "items": ["skill1", "skill2"]
    }
  ],
  "certifications": ["cert1", "cert2"],
  "achievements": ["achievement1", "achievement2"],
  "references": [
    {
      "name": "Reference Person Name",
      "title": "Their Job Title or Relationship",
      "contact": "Phone number or email"
    }
  ]
}

IMPORTANT: 
- Extract ALL personal information including full address, phone, email
- Extract LinkedIn and portfolio URLs if present
- Extract references with name, title/role, and contact information
- Only include fields you can confidently extract
- Return valid JSON only, no markdown`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: pdfBase64,
                },
              },
              {
                type: "text",
                text: "Parse this resume PDF and extract all information as structured JSON.",
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.content?.[0]?.text;

    if (!content) {
      console.error("Unexpected AI response:", JSON.stringify(aiResponse));
      throw new Error("No response from AI");
    }

    console.log("AI response received, parsing JSON...");

    // Parse the JSON response
    let parsedData: ParsedResumeData;
    try {
      // Try to extract JSON from the response (it might have markdown code blocks)
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                       content.match(/```\s*([\s\S]*?)\s*```/) ||
                       [null, content];
      const jsonString = jsonMatch[1] || content;
      parsedData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Return raw text if parsing fails
      parsedData = {
        rawText: content,
      };
    }

    console.log("Successfully parsed resume data");

    return new Response(JSON.stringify(parsedData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Parse resume error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
