import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN') ?? ''
const ACTOR = 'websift~seek-job-scraper'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    })

  if (!APIFY_TOKEN) {
    return json({ error: 'APIFY_API_TOKEN is not configured.' }, 500)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400)
  }

  const action = String(body.action ?? '')

  try {
    if (action === 'start') {
      const payload = body.payload ?? {}
      const res = await fetch(
        `https://api.apify.com/v2/acts/${ACTOR}/runs?token=${APIFY_TOKEN}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) {
        const errText = await res.text()
        return json({ error: `Failed to start run: ${errText || res.statusText}` }, 502)
      }
      const result = await res.json()
      return json({
        runId: result.data.id,
        datasetId: result.data.defaultDatasetId,
      })
    }

    if (action === 'status') {
      const runId = String(body.runId ?? '')
      if (!runId) return json({ error: 'Missing runId.' }, 400)
      const res = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_TOKEN}`,
      )
      if (!res.ok) return json({ error: `Failed to poll status: ${res.statusText}` }, 502)
      const result = await res.json()
      return json({ status: result.data.status })
    }

    if (action === 'dataset') {
      const datasetId = String(body.datasetId ?? '')
      if (!datasetId) return json({ error: 'Missing datasetId.' }, 400)
      const res = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}`,
      )
      if (!res.ok) return json({ error: `Failed to fetch dataset: ${res.statusText}` }, 502)
      const items = await res.json()
      return json({ items })
    }

    if (action === 'abort') {
      const runId = String(body.runId ?? '')
      if (!runId) return json({ error: 'Missing runId.' }, 400)
      const res = await fetch(
        `https://api.apify.com/v2/actor-runs/${runId}/abort?token=${APIFY_TOKEN}`,
        { method: 'POST' },
      )
      if (!res.ok) return json({ error: 'Failed to abort run.' }, 502)
      return json({ ok: true })
    }

    return json({ error: `Unknown action: ${action}` }, 400)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error.' }, 500)
  }
})
