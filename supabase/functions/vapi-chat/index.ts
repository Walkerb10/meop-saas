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
    const { message, previousChatId, sessionId } = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: "Message is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const VAPI_API_KEY = Deno.env.get("VAPI_API_KEY");
    if (!VAPI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "VAPI_API_KEY is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vapi Assistant ID
    const VAPI_ASSISTANT_ID = "9526dfda-7749-42f3-af9c-0dfec7fdd6cd";

    console.log(`📨 Vapi Chat request: message="${message.substring(0, 50)}..." previousChatId=${previousChatId || "none"}`);

    // Call Vapi Chat API
    const response = await fetch("https://api.vapi.ai/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${VAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assistantId: VAPI_ASSISTANT_ID,
        input: message,
        ...(previousChatId && { previousChatId }),
        // Use sessionId for context grouping if provided
        ...(sessionId && { metadata: { sessionId } }),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vapi Chat API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: `Vapi API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const chatResponse = await response.json();
    console.log("✅ Vapi Chat response received:", JSON.stringify(chatResponse).substring(0, 200));

    // Extract the assistant's response
    const output = chatResponse.output?.[0]?.content || chatResponse.output || "";
    const chatId = chatResponse.id;

    return new Response(
      JSON.stringify({
        id: chatId,
        output,
        previousChatId: chatId, // Return for next message in chain
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Vapi chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
