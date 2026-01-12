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

    // Use Lovable AI Gateway to extract structured information from PDF
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // First, we need to extract text from the PDF
    // Since we can't directly process PDF binary in the LLM, we'll use the base64 content
    // For now, we'll send it to the AI with instructions to parse resume-like content

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a resume parser. Extract structured information from the resume text/content provided.
            
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
- Return valid JSON only, no markdown`,
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Parse this resume PDF and extract all information. The PDF is base64 encoded. Extract as much structured information as possible.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${pdfBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
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
