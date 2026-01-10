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

  // Check if this is a tool call (has scheduling fields from automation tool)
  if (body.message_content && body.frequency && body.scheduled_time) {
    // Determine the automation type from the payload
    const automationType = body.automation_type || body.channel || body.type || 'text';
    const channel = body.channel || body.slack_channel || body.discord_channel || null;
    
    console.log(`📱 Automation tool detected! Type: ${automationType}, Channel: ${channel}`);
    
    // Build human-readable trigger label
    const triggerLabel = body.frequency === 'weekly' 
      ? `Every ${body.day_of_week || 'week'} at ${body.scheduled_time}`
      : body.frequency === 'monthly'
      ? `Monthly on day ${body.day_of_month || 1} at ${body.scheduled_time}`
      : body.frequency === 'one_time'
      ? `One-time on ${body.one_time_date} at ${body.scheduled_time}`
      : `Daily at ${body.scheduled_time}`;

    // Determine action type and label based on automation type
    let actionType = 'send_text';
    let actionLabel = `Send text: "${body.message_content.substring(0, 40)}${body.message_content.length > 40 ? '...' : ''}"`;
    let automationName = `Text: ${body.message_content.substring(0, 30)}${body.message_content.length > 30 ? '...' : ''}`;

    if (automationType === 'slack' || body.slack_channel) {
      actionType = 'send_slack';
      actionLabel = `Post to #${channel || 'general'}: "${body.message_content.substring(0, 40)}${body.message_content.length > 40 ? '...' : ''}"`;
      automationName = `Slack: ${body.message_content.substring(0, 30)}${body.message_content.length > 30 ? '...' : ''}`;
    } else if (automationType === 'discord' || body.discord_channel) {
      actionType = 'send_discord';
      actionLabel = `Post to #${channel || 'general'}: "${body.message_content.substring(0, 40)}${body.message_content.length > 40 ? '...' : ''}"`;
      automationName = `Discord: ${body.message_content.substring(0, 30)}${body.message_content.length > 30 ? '...' : ''}`;
    } else if (automationType === 'email' || body.email_to) {
      actionType = 'send_email';
      actionLabel = `Email to ${body.email_to || 'recipient'}: "${body.message_content.substring(0, 40)}${body.message_content.length > 40 ? '...' : ''}"`;
      automationName = `Email: ${body.message_content.substring(0, 30)}${body.message_content.length > 30 ? '...' : ''}`;
    }

    // Create automation with properly formatted steps for UI display
    const automationData = {
      name: automationName,
      description: `Scheduled ${automationType}: "${body.message_content}"`,
      trigger_type: body.frequency === 'one_time' ? 'one_time' : 'scheduled',
      trigger_config: {
        frequency: body.frequency,
        time: body.scheduled_time,
        day_of_week: body.day_of_week || null,
        day_of_month: body.day_of_month || null,
        one_time_date: body.one_time_date || null,
      },
      steps: [
        {
          id: crypto.randomUUID(),
          type: "trigger",
          label: triggerLabel,
        },
        {
          id: crypto.randomUUID(),
          type: "action",
          label: actionLabel,
          config: {
            action_type: actionType,
            message: body.message_content,
            phone: body.phone_number || null,
            channel: channel,
            email_to: body.email_to || null,
          },
        },
      ],
      is_active: body.frequency !== 'one_time', // One-time starts inactive
    };

    const { data, error } = await supabase.from("automations").insert(automationData).select().single();

    if (error) {
      console.error("Failed to create automation:", error);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`✅ Created ${automationType} automation:`, data.id);
    return new Response(
      JSON.stringify({ success: true, automation_id: data.id, message: `${automationType} automation created!` }),
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
