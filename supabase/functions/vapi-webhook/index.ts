import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AutomationType = "text" | "slack" | "discord" | "email";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KNOWN_AUTOMATION_TYPES = new Set<AutomationType>(["text", "slack", "discord", "email"]);

// Default channels for messaging platforms
const DEFAULT_CHANNELS = {
  slack: "all_bhva",
  discord: "admin",
};

function asString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return null;
}

function isKnownAutomationType(value: unknown): value is AutomationType {
  return typeof value === "string" && KNOWN_AUTOMATION_TYPES.has(value as AutomationType);
}

function normalizeChannelName(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("#") ? trimmed.slice(1).trim() : trimmed;
}

function normalizeTimeTo24h(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;

  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // HH:mm (24h)
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const hh = Number(m24[1]);
    const mm = Number(m24[2]);
    if (Number.isFinite(hh) && Number.isFinite(mm) && hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }

  // h(:mm)? am/pm
  const m12 = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (m12) {
    let hh = Number(m12[1]);
    const mm = Number(m12[2] ?? "00");
    const period = String(m12[3]).toLowerCase();

    if (!(hh >= 1 && hh <= 12) || !(mm >= 0 && mm <= 59)) return null;

    if (period === "pm" && hh !== 12) hh += 12;
    if (period === "am" && hh === 12) hh = 0;

    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  }

  return null;
}

function formatTime12h(time24: string): string {
  const normalized = normalizeTimeTo24h(time24) ?? time24;
  const m = normalized.match(/^(\d{2}):(\d{2})$/);
  if (!m) return time24;

  const hh = Number(m[1]);
  const mm = m[2];
  const period = hh >= 12 ? "PM" : "AM";
  const displayH = ((hh + 11) % 12) + 1;
  return `${displayH}:${mm} ${period}`;
}

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

  // Detect if this is an email automation (has email_content field)
  const isEmailAutomation = body.email_content && body.recipient_emails;
  
  // Normalize message content - could be message_content or email_content
  const messageContent = asString(body.message_content ?? body.email_content) ?? "";
  
  // Check if this is a tool call (has scheduling fields from automation tool)
  if ((messageContent || isEmailAutomation) && body.frequency && body.scheduled_time) {
    const rawType = asString(body.automation_type ?? body.automationType);
    const rawActionType = asString(body.action_type ?? body.actionType);

    const rawChannel = asString(body.channel ?? body.channel_name ?? body.channelName);
    const slackChannelRaw = asString(body.slack_channel ?? body.slackChannel);
    const discordChannelRaw = asString(body.discord_channel ?? body.discordChannel);

    const emailToRaw = asString(body.email_to ?? body.emailTo ?? body.to ?? body.recipient_emails);
    const emailSubjectRaw = asString(body.email_subject ?? body.emailSubject ?? body.subject);

    const typeCandidate = (rawType ?? "").toLowerCase().trim();
    const actionTypeCandidate = (rawActionType ?? "").toLowerCase().trim();
    const channelCandidate = (rawChannel ?? "").toLowerCase().trim();

    let automationType: AutomationType = "text";

    // Auto-detect email if we have email-specific fields
    if (isEmailAutomation) {
      automationType = "email";
    } else if (isKnownAutomationType(typeCandidate)) {
      automationType = typeCandidate as AutomationType;
    } else if (actionTypeCandidate === "slack_message" || actionTypeCandidate === "send_slack") {
      automationType = "slack";
    } else if (actionTypeCandidate === "discord_message" || actionTypeCandidate === "send_discord") {
      automationType = "discord";
    } else if (actionTypeCandidate === "send_email") {
      automationType = "email";
    } else if (isKnownAutomationType(channelCandidate)) {
      // Some tool payloads overload `channel` as the destination type (e.g. "slack")
      automationType = channelCandidate as AutomationType;
    } else if (slackChannelRaw) {
      automationType = "slack";
    } else if (discordChannelRaw) {
      automationType = "discord";
    } else if (emailToRaw) {
      automationType = "email";
    }

    const targetChannel =
      automationType === "slack"
        ? normalizeChannelName(
            slackChannelRaw ??
              (rawChannel && !isKnownAutomationType(channelCandidate) ? rawChannel : null)
          ) ?? DEFAULT_CHANNELS.slack
        : automationType === "discord"
        ? normalizeChannelName(
            discordChannelRaw ??
              (rawChannel && !isKnownAutomationType(channelCandidate) ? rawChannel : null)
          ) ?? DEFAULT_CHANNELS.discord
        : null;

    const normalizedTime = normalizeTimeTo24h(body.scheduled_time) ?? asString(body.scheduled_time) ?? "";
    const timeLabel = normalizedTime ? formatTime12h(normalizedTime) : String(body.scheduled_time ?? "");

    const dayOfWeek = asString(body.day_of_week ?? body.dayOfWeek);
    const dayOfMonthRaw = asString(body.day_of_month ?? body.dayOfMonth);
    const oneTimeDate = asString(body.one_time_date ?? body.oneTimeDate ?? body.custom_date ?? body.customDate);
    const everyXDays = asString(body.every_x_days ?? body.everyXDays);

    console.log(
      `📱 Automation tool detected! type=${automationType} channel=${targetChannel ?? "(n/a)"} time=${normalizedTime}`
    );

    // Build human-readable trigger label (12-hour time)
    let triggerLabel: string;
    if (body.frequency === "weekly") {
      triggerLabel = `Every ${dayOfWeek || "week"} at ${timeLabel}`;
    } else if (body.frequency === "monthly") {
      triggerLabel = `Monthly on day ${dayOfMonthRaw || 1} at ${timeLabel}`;
    } else if (body.frequency === "one_time") {
      triggerLabel = `One-time execution (manual)`;
    } else if (body.frequency === "custom" && oneTimeDate) {
      const dateFormatted = new Date(oneTimeDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      triggerLabel = `On ${dateFormatted} at ${timeLabel}`;
    } else if (body.frequency === "every_x_days" && everyXDays) {
      triggerLabel = `Every ${everyXDays} days at ${timeLabel}`;
    } else {
      triggerLabel = `Daily at ${timeLabel}`;
    }

    const msg = messageContent;
    const short40 = `${msg.substring(0, 40)}${msg.length > 40 ? "..." : ""}`;
    const short30 = `${msg.substring(0, 30)}${msg.length > 30 ? "..." : ""}`;

    // Action config must match what the Scheduled Actions UI expects
    let actionConfig: Record<string, unknown>;
    let actionLabel: string;
    let automationName: string;

    if (automationType === "slack") {
      actionConfig = {
        action_type: "slack_message",
        channel: targetChannel,
        message: msg,
      };
      actionLabel = `Slack #${targetChannel}: "${short40}"`;
      automationName = `Slack: ${short30}`;
    } else if (automationType === "discord") {
      actionConfig = {
        action_type: "discord_message",
        discord_channel: targetChannel,
        message: msg,
      };
      actionLabel = `Discord #${targetChannel}: "${short40}"`;
      automationName = `Discord: ${short30}`;
    } else if (automationType === "email") {
      actionConfig = {
        action_type: "send_email",
        to: emailToRaw || "",
        subject: emailSubjectRaw || "",
        message: msg,
      };
      actionLabel = `Email to ${emailToRaw || "recipient"}: "${short40}"`;
      automationName = `Email: ${short30}`;
    } else {
      actionConfig = {
        action_type: "send_text",
        message: msg,
        phone: asString(body.phone_number ?? body.phone) ?? null,
      };
      actionLabel = `Send text: "${short40}"`;
      automationName = `Text: ${short30}`;
    }

    const n8nWebhookUrl =
      asString(body.n8n_webhook_url ?? body.n8nWebhookUrl ?? body.webhook_url ?? body.webhookUrl) ?? null;

    // Get conversation_id if provided
    const conversationId = asString(body.conversation_id ?? body.conversationId) ?? null;

    // Create automation with properly formatted steps for UI display
    const automationData = {
      name: automationName,
      description: `Scheduled ${automationType}: "${msg}"`,
      trigger_type: body.frequency === "one_time" ? "one_time" : "schedule",
      trigger_config: {
        frequency: body.frequency,
        scheduled_time: normalizedTime || null,
        day_of_week: dayOfWeek || null,
        day_of_month: dayOfMonthRaw ? Number(dayOfMonthRaw) : null,
        custom_date: oneTimeDate || null,
        every_x_days: everyXDays ? Number(everyXDays) : null,
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
          config: actionConfig,
        },
      ],
      n8n_webhook_url: n8nWebhookUrl,
      is_active: body.frequency !== "one_time" && body.frequency !== "custom", // One-time and custom start inactive
      conversation_id: conversationId,
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
    
    // Return Vapi-compatible tool response
    return new Response(
      JSON.stringify({
        results: [
          {
            toolCallId: "schedule-automation",
            result: `Successfully scheduled ${automationType} automation "${automationData.name}". It will run ${triggerLabel.toLowerCase()}.`,
          }
        ]
      }),
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
