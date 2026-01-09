import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookId = req.headers.get('webhook-id');
    const webhookTimestamp = req.headers.get('webhook-timestamp');
    const webhookSignature = req.headers.get('webhook-signature');
    
    console.log('Received OpenAI webhook:', { webhookId, webhookTimestamp });

    const body = await req.json();
    console.log('Webhook payload:', JSON.stringify(body, null, 2));

    // Check the event type
    if (body.type === 'response.completed') {
      const responseId = body.data?.id;
      console.log('Response completed, ID:', responseId);

      // Fetch the full response from OpenAI
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY not configured');
      }

      const openaiResponse = await fetch(`https://api.openai.com/v1/responses/${responseId}`, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!openaiResponse.ok) {
        throw new Error(`Failed to fetch response: ${openaiResponse.statusText}`);
      }

      const responseData = await openaiResponse.json();
      console.log('Full OpenAI response:', JSON.stringify(responseData, null, 2));

      // Extract the output text
      const outputText = responseData.output
        ?.filter((item: any) => item.type === 'message')
        ?.flatMap((item: any) => item.content)
        ?.filter((contentItem: any) => contentItem.type === 'output_text')
        ?.map((contentItem: any) => contentItem.text)
        ?.join('') || '';

      console.log('Extracted output text length:', outputText.length);

      // TODO: Send to Claude edge function for HTML generation
      // This will be implemented once secrets are configured

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Webhook received and processed',
          responseId,
          outputLength: outputText.length 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received', eventType: body.type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
