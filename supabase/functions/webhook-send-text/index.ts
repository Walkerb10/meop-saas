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
    const { to, message, channel } = await req.json();
    
    console.log("Send text webhook called:", { to, channel, messageLength: message?.length });
    
    // For now, log the request and return success
    // This can be extended to integrate with:
    // - Twilio for SMS
    // - SendGrid for email
    // - n8n webhook for custom routing
    // - Slack API for messaging
    
    // TODO: Add actual sending logic based on channel
    // Example channels: 'sms', 'email', 'slack', 'whatsapp'
    
    const result = {
      success: true,
      message: `Text queued for delivery to ${to} via ${channel || 'default'}`,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };

    console.log("Text send result:", result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Send text webhook error:", error);
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
