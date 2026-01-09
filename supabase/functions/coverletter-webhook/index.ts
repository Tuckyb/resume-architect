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
    // Get the request body
    const body = await req.json();
    
    console.log("Received Cover Letter webhook:", JSON.stringify(body, null, 2));

    // Process the webhook payload based on event type
    const eventType = body.type || body.event;
    
    switch (eventType) {
      case "response.completed":
        console.log("Cover letter response completed:", body.data || body);
        // Process completed response
        break;
      case "response.failed":
        console.log("Cover letter response failed:", body.error || body);
        break;
      default:
        console.log("Unknown event type:", eventType);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Cover letter webhook received",
        eventType 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Cover letter webhook error:", error);
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
