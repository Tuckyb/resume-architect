import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("OPENAI_WEBHOOK_SECRET");
    
    // Get the request body
    const body = await req.json();
    
    console.log("Received OpenAI webhook:", JSON.stringify(body, null, 2));

    // Process the webhook payload based on event type
    const eventType = body.type || body.event;
    
    switch (eventType) {
      case "response.completed":
        console.log("Response completed:", body.data || body);
        // Process completed response
        break;
      case "response.failed":
        console.log("Response failed:", body.error || body);
        break;
      default:
        console.log("Unknown event type:", eventType);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Webhook received",
        eventType 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
