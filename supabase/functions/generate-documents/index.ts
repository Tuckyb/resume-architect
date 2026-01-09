import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApplicationData {
  resumeData: {
    personalInfo: {
      fullName: string;
      address: string;
      phone: string;
      email: string;
      linkedIn?: string;
      portfolio?: string;
    };
    professionalSummary: string;
    workExperience: Array<{
      title: string;
      company: string;
      period: string;
      responsibilities: string[];
    }>;
    education: Array<{
      degree: string;
      institution: string;
      period: string;
      achievements?: string[];
    }>;
    skills: string[];
    certifications: string[];
    achievements: string[];
  };
  jobTarget: {
    companyName: string;
    position: string;
    jobDescription: string;
    companyValues?: string;
  };
  documentType: 'resume' | 'cover-letter' | 'both';
}

function buildResumePrompt(data: ApplicationData): string {
  const { resumeData, jobTarget } = data;
  const { personalInfo, workExperience, education, skills, certifications, achievements } = resumeData;

  return `Create a professional resume for the following candidate, tailored for the ${jobTarget.position} position at ${jobTarget.companyName}.

CANDIDATE INFORMATION:
Name: ${personalInfo.fullName}
Email: ${personalInfo.email}
Phone: ${personalInfo.phone}
Address: ${personalInfo.address}
LinkedIn: ${personalInfo.linkedIn || 'Not provided'}
Portfolio: ${personalInfo.portfolio || 'Not provided'}

PROFESSIONAL SUMMARY:
${resumeData.professionalSummary || 'Generate a compelling 3-4 sentence professional summary based on the experience below.'}

WORK EXPERIENCE:
${workExperience.map(exp => `
${exp.title} at ${exp.company} (${exp.period})
${exp.responsibilities.map(r => `• ${r}`).join('\n')}
`).join('\n')}

EDUCATION:
${education.map(edu => `
${edu.degree} - ${edu.institution} (${edu.period})
${edu.achievements?.length ? edu.achievements.map(a => `• ${a}`).join('\n') : ''}
`).join('\n')}

SKILLS:
${skills.join(', ')}

CERTIFICATIONS:
${certifications.join(', ')}

KEY ACHIEVEMENTS:
${achievements.map(a => `• ${a}`).join('\n')}

TARGET JOB:
Company: ${jobTarget.companyName}
Position: ${jobTarget.position}
Job Description: ${jobTarget.jobDescription}
Company Values: ${jobTarget.companyValues || 'Not specified'}

Please write a complete, ATS-optimized resume that:
1. Highlights relevant experience for this specific role
2. Uses strong action verbs and quantifiable achievements
3. Tailors the professional summary to the target position
4. Organizes skills to emphasize those most relevant to the job
5. Maintains a professional tone throughout

Format the output as clean, structured text with clear section headers.`;
}

function buildCoverLetterPrompt(data: ApplicationData): string {
  const { resumeData, jobTarget } = data;
  const { personalInfo, workExperience, achievements } = resumeData;

  return `Write a compelling cover letter for ${personalInfo.fullName} applying for the ${jobTarget.position} position at ${jobTarget.companyName}.

CANDIDATE DETAILS:
Name: ${personalInfo.fullName}
Email: ${personalInfo.email}
Phone: ${personalInfo.phone}
Address: ${personalInfo.address}

KEY EXPERIENCE:
${workExperience.slice(0, 3).map(exp => `
${exp.title} at ${exp.company}
${exp.responsibilities.slice(0, 2).map(r => `• ${r}`).join('\n')}
`).join('\n')}

KEY ACHIEVEMENTS:
${achievements.slice(0, 5).map(a => `• ${a}`).join('\n')}

TARGET JOB:
Company: ${jobTarget.companyName}
Position: ${jobTarget.position}
Job Description: ${jobTarget.jobDescription}
Company Values: ${jobTarget.companyValues || 'Not specified'}

Write a personalized, engaging cover letter that:
1. Opens with a compelling hook that demonstrates genuine interest
2. Connects the candidate's specific achievements to the job requirements
3. Shows understanding of the company's values and mission
4. Demonstrates personality while maintaining professionalism
5. Ends with a confident call to action

The letter should be 3-4 paragraphs, approximately 300-400 words. Do NOT use generic phrases like "I am writing to apply for..." - make it unique and memorable.

Format: Include proper business letter formatting with date and address headers.`;
}

async function generateWithOpenAI(prompt: string, apiKey: string): Promise<string> {
  console.log('Calling OpenAI API...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert resume writer and career coach. You create professional, tailored resumes and cover letters that help candidates stand out while being ATS-friendly.'
        },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function formatWithClaude(content: string, docType: string, apiKey: string): Promise<string> {
  console.log('Calling Claude API for HTML formatting...');
  
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

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Claude API error:', response.status, errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  let htmlContent = data.content[0].text;
  
  // Clean up markdown code blocks if present
  if (htmlContent.startsWith('```html')) {
    htmlContent = htmlContent.slice(7);
  }
  if (htmlContent.startsWith('```')) {
    htmlContent = htmlContent.slice(3);
  }
  if (htmlContent.endsWith('```')) {
    htmlContent = htmlContent.slice(0, -3);
  }
  
  return htmlContent.trim();
}

async function sendToMakeWebhook(documents: any[], webhookUrl: string): Promise<void> {
  if (!webhookUrl) {
    console.log('No Make.com webhook URL configured, skipping...');
    return;
  }

  console.log('Sending to Make.com webhook...');
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documents }),
    });

    if (!response.ok) {
      console.error('Make.com webhook error:', response.status);
    } else {
      console.log('Successfully sent to Make.com');
    }
  } catch (error) {
    console.error('Make.com webhook error:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    const makeWebhookUrl = Deno.env.get('MAKE_WEBHOOK_URL');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    if (!anthropicApiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const applicationData: ApplicationData = await req.json();
    console.log('Received application data for:', applicationData.resumeData.personalInfo.fullName);

    const documents: Array<{ type: string; rawContent: string; htmlContent: string }> = [];

    // Generate Resume
    if (applicationData.documentType === 'resume' || applicationData.documentType === 'both') {
      console.log('Generating resume...');
      const resumePrompt = buildResumePrompt(applicationData);
      const rawResume = await generateWithOpenAI(resumePrompt, openaiApiKey);
      console.log('Resume content generated, formatting with Claude...');
      const htmlResume = await formatWithClaude(rawResume, 'resume', anthropicApiKey);
      
      documents.push({
        type: 'resume',
        rawContent: rawResume,
        htmlContent: htmlResume,
      });
    }

    // Generate Cover Letter
    if (applicationData.documentType === 'cover-letter' || applicationData.documentType === 'both') {
      console.log('Generating cover letter...');
      const coverLetterPrompt = buildCoverLetterPrompt(applicationData);
      const rawCoverLetter = await generateWithOpenAI(coverLetterPrompt, openaiApiKey);
      console.log('Cover letter content generated, formatting with Claude...');
      const htmlCoverLetter = await formatWithClaude(rawCoverLetter, 'cover letter', anthropicApiKey);
      
      documents.push({
        type: 'cover-letter',
        rawContent: rawCoverLetter,
        htmlContent: htmlCoverLetter,
      });
    }

    // Send to Make.com webhook if configured
    await sendToMakeWebhook(documents, makeWebhookUrl || '');

    console.log(`Generated ${documents.length} document(s) successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        documents,
        message: `Generated ${documents.length} document(s)` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Document generation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
