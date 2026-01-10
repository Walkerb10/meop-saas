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
    const { workflow_id, workflow_name, inputs } = await req.json();
    
    console.log("n8n trigger webhook called:", { workflow_id, workflow_name, inputs });
    
    const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL");
    if (!N8N_WEBHOOK_URL) {
      throw new Error("N8N_WEBHOOK_URL is not configured");
    }

    // If workflow_id is provided, trigger directly
    // If workflow_name is provided, we need to find and trigger by name
    const targetUrl = workflow_id 
      ? `${N8N_WEBHOOK_URL}/webhook/${workflow_id}`
      : `${N8N_WEBHOOK_URL}/webhook/${workflow_name}`;

    console.log("Triggering n8n workflow at:", targetUrl);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(inputs || {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("n8n webhook error:", response.status, errorText);
      throw new Error(`n8n webhook error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log("n8n workflow completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        result,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("n8n trigger webhook error:", error);
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
