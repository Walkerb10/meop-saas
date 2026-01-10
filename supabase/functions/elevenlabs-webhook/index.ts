import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Parse body immediately
  const body = await req.json();
  console.log("ElevenLabs webhook received:", JSON.stringify(body));

  // Return 200 immediately, then process in background
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Extract text from various ElevenLabs event types
  let role: string | null = null;
  let content: string | null = null;
  let conversationId: string | null = body.conversation_id || null;

  // Handle different payload structures from ElevenLabs
  if (body.type === "user_transcript" || body.type === "user_transcription") {
    role = "user";
    content = body.user_transcription_event?.user_transcript 
      || body.user_transcript 
      || body.transcript 
      || body.text;
  } else if (body.type === "agent_response") {
    role = "assistant";
    content = body.agent_response_event?.agent_response 
      || body.agent_response 
      || body.response 
      || body.text;
  } else if (body.transcript) {
    // Generic transcript field
    role = body.role || "unknown";
    content = body.transcript;
  } else if (body.text) {
    // Generic text field
    role = body.role || "unknown";
    content = body.text;
  }

  // Store if we extracted content
  if (content) {
    const { error } = await supabase.from("conversation_transcripts").insert({
      role,
      content,
      conversation_id: conversationId,
      raw_payload: body,
    });

    if (error) {
      console.error("Failed to store transcript:", error);
    } else {
      console.log(`Stored ${role} transcript: ${content.substring(0, 50)}...`);
    }
  } else {
    console.log("No extractable content, storing raw payload");
    // Store raw payload anyway for debugging
    await supabase.from("conversation_transcripts").insert({
      role: body.type || "event",
      content: JSON.stringify(body).substring(0, 500),
      conversation_id: conversationId,
      raw_payload: body,
    });
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
