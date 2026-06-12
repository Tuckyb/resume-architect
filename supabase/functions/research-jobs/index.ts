import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

interface ResearchedJob {
  title: string
  company?: string
  location?: string
  category?: string
  description?: string
  url?: string
  salary?: string
  posted_date?: string
}

const PRESETS: Record<string, string> = {
  AI:
    'current open job roles in the Artificial Intelligence / Machine Learning space (e.g. AI Engineer, ML Engineer, AI Automation Specialist, Prompt Engineer, AI Product roles)',
  Marketing:
    'current open job roles in the Marketing space (e.g. Marketing Strategist, Growth Marketer, SEO Specialist, Content Marketing, Marketing Automation, Campaign Manager)',
}

// Only keep roles based in Sydney or Wollongong (or roles explicitly
// remote-friendly for those NSW cities). Everything else in Australia or
// overseas is dropped.
function isAllowedLocation(location: string): boolean {
  const loc = (location ?? '').toLowerCase()
  if (!loc.trim()) return false
  const allowed = ['sydney', 'wollongong', 'illawarra']
  if (allowed.some((c) => loc.includes(c))) return true
  // Allow remote roles only if they are remote within Australia / NSW.
  if (loc.includes('remote') && (loc.includes('australia') || loc.includes('nsw'))) {
    return true
  }
  return false
}

async function researchCategory(category: string): Promise<ResearchedJob[]> {
  const focus = PRESETS[category] ?? PRESETS.AI
  const prompt = `Research and list real, currently advertised ${focus} located in Sydney, NSW or Wollongong, NSW, Australia (or roles that are explicitly remote-friendly for candidates based in Sydney or Wollongong). Do NOT include roles based anywhere else in Australia or overseas. Find at least 8 distinct roles from reputable Australian job boards (e.g. SEEK, LinkedIn) and company career pages. Return ONLY a JSON object with a "jobs" array. Each job must have these string fields: title, company, location (must clearly state Sydney or Wollongong), description (2-3 sentences), url (direct link to the listing), salary (or empty), posted_date (or empty). Do not invent listings — only include roles you can source.`

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'perplexity/sonar-pro-search',
      messages: [
        {
          role: 'system',
          content:
            'You are a precise job-research assistant. You only return verifiable, currently-open job listings with working source URLs. Always respond with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'job_listings',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              jobs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    company: { type: 'string' },
                    location: { type: 'string' },
                    description: { type: 'string' },
                    url: { type: 'string' },
                    salary: { type: 'string' },
                    posted_date: { type: 'string' },
                  },
                  required: ['title', 'company', 'location', 'description', 'url', 'salary', 'posted_date'],
                  additionalProperties: false,
                },
              },
            },
            required: ['jobs'],
            additionalProperties: false,
          },
        },
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter error (${res.status}): ${errText || res.statusText}`)
  }

  const data = await res.json()
  const content: string = data?.choices?.[0]?.message?.content ?? ''
  console.log(`[${category}] content length=${content.length} preview:`, content.slice(0, 500))

  let parsed: { jobs?: ResearchedJob[] } = {}
  try {
    parsed = JSON.parse(content)
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        parsed = JSON.parse(match[0])
      } catch {
        parsed = {}
      }
    }
  }

  const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : []
  return jobs
    .filter((j) => j && typeof j.title === 'string' && j.title.trim().length > 0)
    .filter((j) => isAllowedLocation(j.location ? String(j.location) : ''))
    .map((j) => ({
      title: String(j.title).slice(0, 300),
      company: j.company ? String(j.company).slice(0, 300) : null,
      location: j.location ? String(j.location).slice(0, 300) : null,
      category,
      description: j.description ? String(j.description).slice(0, 2000) : null,
      url: j.url ? String(j.url).slice(0, 1000) : null,
      salary: j.salary ? String(j.salary).slice(0, 300) : null,
      posted_date: j.posted_date ? String(j.posted_date).slice(0, 100) : null,
      source: 'perplexity',
    })) as unknown as ResearchedJob[]
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  if (!OPENROUTER_API_KEY) {
    return json({ error: 'OPENROUTER_API_KEY is not configured.' }, 500)
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const categoriesInput = Array.isArray(body.categories)
    ? (body.categories as string[])
    : ['AI', 'Marketing']
  const location = typeof body.location === 'string' ? body.location : ''

  try {
    const results = await Promise.all(
      categoriesInput.map((c) =>
        researchCategory(c, location).catch((e) => {
          console.error(`Research failed for ${c}:`, e instanceof Error ? e.message : e)
          return []
        }),
      ),
    )
    const allJobs = results.flat()

    if (allJobs.length === 0) {
      return json({ inserted: 0, jobs: [], message: 'No jobs found.' })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { data: inserted, error } = await supabase
      .from('job_board')
      .insert(allJobs)
      .select()

    if (error) {
      return json({ error: `Failed to save jobs: ${error.message}` }, 500)
    }

    return json({ inserted: inserted?.length ?? 0, jobs: inserted ?? [] })
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, 500)
  }
})
