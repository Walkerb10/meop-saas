import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    
    // ElevenLabs will send: tool_name, tool_call_id, and parameters
    const { tool_name, tool_call_id, parameters } = body;
    
    console.log("ElevenLabs webhook received:", { 
      tool_name, 
      tool_call_id, 
      parameters,
      full_body: body 
    });

    // Route based on the tool/workflow requested
    let result: any = { received: true };
    
    switch (tool_name) {
      case "research":
        result = { 
          action: "research",
          query: parameters?.query,
          status: "queued"
        };
        break;
      case "send_text":
        result = { 
          action: "send_text",
          to: parameters?.to,
          message: parameters?.message,
          status: "queued"
        };
        break;
      case "create_automation":
        result = { 
          action: "create_automation",
          name: parameters?.name,
          steps: parameters?.steps,
          status: "queued"
        };
        break;
      default:
        result = {
          action: tool_name || "unknown",
          parameters,
          status: "received"
        };
    }

    console.log("Webhook response:", result);

    return new Response(
      JSON.stringify({
        success: true,
        tool_call_id,
        result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("ElevenLabs webhook error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
