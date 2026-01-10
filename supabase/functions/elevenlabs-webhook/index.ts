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

  const body = await req.json();
  console.log("ElevenLabs webhook received:", JSON.stringify(body));

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Check if this is a tool call (has scheduling fields from text sequence tool)
  if (body.message_content && body.frequency && body.scheduled_time) {
    console.log("📱 Text sequence tool detected!");
    
    // Create automation for the text sequence
    const automationData = {
      name: `Text: ${body.message_content.substring(0, 30)}...`,
      description: `Scheduled text: "${body.message_content}"`,
      trigger_type: "schedule",
      trigger_config: {
        frequency: body.frequency,
        scheduled_time: body.scheduled_time,
        day_of_week: body.day_of_week || null,
        day_of_month: body.day_of_month || null,
      },
      steps: [
        {
          type: "send_text",
          config: {
            message: body.message_content,
            phone: body.phone_number || null,
          },
        },
      ],
      is_active: true,
    };

    const { data, error } = await supabase.from("automations").insert(automationData).select().single();

    if (error) {
      console.error("Failed to create automation:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("✅ Created text sequence automation:", data.id);
    return new Response(
      JSON.stringify({ success: true, automation_id: data.id, message: "Text sequence created!" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Handle transcript storage
  let role: string | null = null;
  let content: string | null = null;
  let conversationId: string | null = body.conversation_id || null;

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
    role = body.role || "unknown";
    content = body.transcript;
  } else if (body.text) {
    role = body.role || "unknown";
    content = body.text;
  }

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
    console.log("No extractable content, raw payload stored");
    await supabase.from("conversation_transcripts").insert({
      role: body.type || "event",
      content: JSON.stringify(body).substring(0, 500),
      conversation_id: conversationId,
      raw_payload: body,
    });
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
