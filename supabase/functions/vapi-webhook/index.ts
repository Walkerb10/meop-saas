import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type AutomationType = "text" | "slack" | "discord" | "email" | "research";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KNOWN_AUTOMATION_TYPES = new Set<AutomationType>(["text", "slack", "discord", "email", "research"]);

// Default channels for messaging platforms
const DEFAULT_CHANNELS = {
  slack: "all_bhva",
  discord: "admin",
};

// Output format templates (must match backend research execution)
const OUTPUT_FORMAT_TEMPLATES: Record<string, string> = {
  summary: `Format your response as a concise 2-3 paragraph summary covering:
• Key findings
• Main takeaways
• Brief conclusion`,
  detailed: `Format your response as a comprehensive report with these sections:
1. Executive Summary
2. Background & Context
3. Key Findings (detailed)
4. Analysis & Implications
5. Recommendations
6. Sources & References`,
  bullets: `Format your response as bullet points:
• 5-10 key bullet points
• Each point is 1-2 sentences
• Most important information first
• Action items highlighted`,
  actionable: `Focus on practical next steps and format as:
1. Immediate Actions (do today)
2. Short-term Actions (this week)
3. Strategic Considerations
4. Risks to Watch`,
  problem: `Format using the Problem Framework:
1. PROBLEM: What's the core issue/challenge?
2. CONTEXT: What is happening right now?
3. WHY YOU SHOULD CARE: Implications & how this affects you
4. WHAT YOU CAN DO: How to apply this info in your life`,
};

type OutputFormatKey = keyof typeof OUTPUT_FORMAT_TEMPLATES;

function normalizeOutputFormatKey(value: string | null): OutputFormatKey | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;

  if (v === "summary" || v.includes("summary") || v.includes("brief")) return "summary";
  if (v === "detailed" || v.includes("detailed") || v.includes("report")) return "detailed";
  if (v === "bullets" || v.includes("bullet")) return "bullets";
  if (v === "actionable" || v.includes("actionable") || v.includes("next step")) return "actionable";
  if (v === "problem" || v.includes("problem framework") || v.includes("problem →") || v.includes("framework")) return "problem";

  return null;
}

// AI-optimize research prompt using Lovable AI
async function optimizeResearchPrompt(params: {
  rawPrompt: string;
  outputFormatKey: OutputFormatKey;
  outputFormatInstructions: string;
  targetWordCount: number;
}): Promise<string> {
  const { rawPrompt, outputFormatKey, outputFormatInstructions, targetWordCount } = params;

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.warn("LOVABLE_API_KEY not set, returning raw prompt");
    return rawPrompt;
  }

  try {
    const systemPrompt = `You are an expert research prompt engineer.

Transform the user's raw conversation context into a high-quality research request that will yield excellent results from a web research AI.

Requirements:
- Use the provided context as the primary source of truth.
- Clarify the goal and the intended reader/audience.
- Include: goal, scope/boundaries, assumptions, key questions (prioritized), and what inputs/constraints must be considered.
- Make the request action-oriented: ask for implications + recommendations + decision criteria.
- Avoid fluff. Be specific. If information is missing, list 3-6 concise clarification questions at the end.

OUTPUT REQUIREMENTS:
- Target length for the final answer: ~${targetWordCount} words (±25)
- Output format key: ${outputFormatKey}
- Output format structure (MUST be followed by the research AI):
${outputFormatInstructions}

Output ONLY the optimized research prompt. Do not wrap in quotes. Do not add explanations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: rawPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text().catch(() => "");
      console.error("AI optimization failed:", response.status, t);
      return rawPrompt;
    }

    const data = await response.json();
    const optimized = data.choices?.[0]?.message?.content?.trim();

    if (optimized && optimized.length > 40) {
      console.log("✅ Research prompt optimized by AI");
      return optimized;
    }

    return rawPrompt;
  } catch (e) {
    console.error("AI optimization error:", e);
    return rawPrompt;
  }
}


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
  
  // Detect if this is a research automation
  const isResearchAutomation = body.automation_type === "research" || body.research_topic;
  
  // Normalize message content - could be message_content, email_content, or research_topic
  const messageContent = asString(body.message_content ?? body.email_content ?? body.research_topic) ?? "";
  
  // Check if this is a tool call (has scheduling fields from automation tool)
  if ((messageContent || isEmailAutomation || isResearchAutomation) && body.frequency && body.scheduled_time) {
    const rawType = asString(body.automation_type ?? body.automationType);
    const rawActionType = asString(body.action_type ?? body.actionType);
    
    // Vapi sends tool name in various fields - check all of them
    const toolName = asString(
      body.toolName ?? body.tool_name ?? body.name ?? body.function_name ?? body.functionName
    )?.toLowerCase() ?? "";

    const rawChannel = asString(body.channel ?? body.channel_name ?? body.channelName);
    const slackChannelRaw = asString(body.slack_channel ?? body.slackChannel);
    const discordChannelRaw = asString(body.discord_channel ?? body.discordChannel);

    const emailToRaw = asString(body.email_to ?? body.emailTo ?? body.to ?? body.recipient_emails);
    const emailSubjectRaw = asString(body.email_subject ?? body.emailSubject ?? body.subject);

    const typeCandidate = (rawType ?? "").toLowerCase().trim();
    const actionTypeCandidate = (rawActionType ?? "").toLowerCase().trim();
    const channelCandidate = (rawChannel ?? "").toLowerCase().trim();

    let automationType: AutomationType = "text";

    // Auto-detect based on tool name first (most reliable from Vapi)
    if (toolName.includes("slack")) {
      automationType = "slack";
    } else if (toolName.includes("discord")) {
      automationType = "discord";
    } else if (toolName.includes("email")) {
      automationType = "email";
    } else if (toolName.includes("research")) {
      automationType = "research";
    // Then check explicit automation_type field
    } else if (isEmailAutomation) {
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
    } else if (isResearchAutomation) {
      automationType = "research";
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
    } else if (automationType === "research") {
      const outputFormatRaw = asString(body.output_format ?? body.outputFormat) ?? "detailed";
      const outputFormatKey = normalizeOutputFormatKey(outputFormatRaw) ?? "detailed";
      const outputFormatInstructions = OUTPUT_FORMAT_TEMPLATES[outputFormatKey] ?? "";

      const outputLengthRaw =
        asString(body.output_length ?? body.outputLength) ??
        asString(body.target_word_count ?? body.targetWordCount) ??
        "500";
      const targetWordCount = (() => {
        const n = parseInt(outputLengthRaw, 10);
        return Number.isFinite(n) && n > 0 ? n : 500;
      })();

      // Use research_body_info (the detailed context) for AI optimization
      const researchBodyInfo = asString(body.research_body_info ?? body.researchBodyInfo) ?? "";
      const rawResearchInput = researchBodyInfo || msg;

      // AI-optimize the research prompt
      const optimizedQuery = await optimizeResearchPrompt({
        rawPrompt: rawResearchInput,
        outputFormatKey,
        outputFormatInstructions,
        targetWordCount,
      });

      actionConfig = {
        action_type: "research",
        research_query: optimizedQuery,
        original_query: rawResearchInput,
        // MUST be a known key so the research executor applies the right template
        output_format: outputFormatKey,
        // MUST be output_length so the executor enforces word count
        output_length: String(targetWordCount),
      };

      const queryShort40 = `${optimizedQuery.substring(0, 40)}${optimizedQuery.length > 40 ? "..." : ""}`;
      actionLabel = `Research: "${queryShort40}"`;
      automationName = `Research: ${msg.substring(0, 30)}${msg.length > 30 ? "..." : ""}`;
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

    // Create automation in the same format the visual builder expects (nodes + connections)
    const triggerNodeId = crypto.randomUUID();
    const actionNodeId = crypto.randomUUID();

    const triggerNode = {
      id: triggerNodeId,
      type: "trigger_schedule",
      label: triggerLabel,
      position: { x: 150, y: 100 },
      config: {
        frequency: body.frequency,
        time: normalizedTime || null,
        dayOfWeek: dayOfWeek || null,
        dayOfMonth: dayOfMonthRaw || null,
      },
    };

    const actionNode = {
      id: actionNodeId,
      type:
        automationType === "research"
          ? "action_research"
          : automationType === "slack"
          ? "action_slack"
          : automationType === "discord"
          ? "action_discord"
          : automationType === "email"
          ? "action_email"
          : "action_text",
      label:
        automationType === "research"
          ? "Research"
          : automationType === "slack"
          ? "Slack"
          : automationType === "discord"
          ? "Discord"
          : automationType === "email"
          ? "Email"
          : "Text",
      position: { x: 150, y: 250 },
      config: (() => {
        if (automationType === "research") {
          return {
            query: (actionConfig.research_query as string) || (actionConfig.original_query as string) || msg,
            outputFormat: actionConfig.output_format,
            outputLength: actionConfig.output_length,
          };
        }

        if (automationType === "slack") {
          return { channel: targetChannel, message: msg };
        }

        if (automationType === "discord") {
          return { channel: targetChannel, message: msg };
        }

        if (automationType === "email") {
          return { to: emailToRaw || "", subject: emailSubjectRaw || "", message: msg };
        }

        return { phone: asString(body.phone_number ?? body.phone) ?? null, message: msg };
      })(),
    };

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
      steps: {
        nodes: [triggerNode, actionNode],
        connections: [{ id: crypto.randomUUID(), sourceId: triggerNodeId, targetId: actionNodeId }],
      },
      n8n_webhook_url: n8nWebhookUrl,
      is_active: body.frequency !== "one_time" && body.frequency !== "custom",
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
    
    // Save the tool call to conversation_transcripts for logging
    await supabase.from("conversation_transcripts").insert({
      role: "tool_call",
      content: `Scheduled ${automationType}: "${short40}"`,
      conversation_id: conversationId,
      raw_payload: {
        ...body,
        _tool_call: true,
        _automation_type: automationType,
        _automation_id: data.id,
        _automation_name: automationData.name,
        _trigger_label: triggerLabel,
      },
    });
    
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
