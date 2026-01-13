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

  try {
    const { name, description, trigger, steps, n8nWebhookUrl } = await req.json();
    
    console.log("Create automation webhook called:", { name, description, trigger, stepsCount: steps?.length });
    
    // Validate required fields
    if (!name) {
      throw new Error("Automation name is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse trigger info
    const triggerType = trigger?.type || "manual";
    const triggerConfig = trigger?.config || {};

    // Build workflow nodes/connections (visual builder format)
    const nodes: Array<{ id: string; type: string; label: string; position: { x: number; y: number }; config: Record<string, unknown> }> = [];
    const connections: Array<{ id: string; sourceId: string; targetId: string }> = [];

    const triggerId = crypto.randomUUID();
    nodes.push({
      id: triggerId,
      type:
        triggerType === "webhook" ? "trigger_webhook" : triggerType === "voice" ? "trigger_voice" : "trigger_schedule",
      label: trigger?.label || "Trigger",
      position: { x: 150, y: 100 },
      config: triggerConfig,
    });

    let prevId = triggerId;
    (steps || []).forEach(
      (step: { type?: string; label?: string; config?: Record<string, unknown> }, index: number) => {
        const stepId = crypto.randomUUID();
        const cfg = step.config || {};
        const actionType = String((cfg as any).action_type || "").toLowerCase();

        const nodeType =
          step.type === "condition"
            ? "condition"
            : step.type === "transform"
            ? "transform"
            : actionType === "research"
            ? "action_research"
            : actionType.includes("slack")
            ? "action_slack"
            : actionType.includes("discord")
            ? "action_discord"
            : actionType.includes("email")
            ? "action_email"
            : "action_text";

        nodes.push({
          id: stepId,
          type: nodeType,
          label: step.label || `Step ${index + 1}`,
          position: { x: 150, y: 250 + index * 150 },
          config: cfg,
        });

        connections.push({ id: crypto.randomUUID(), sourceId: prevId, targetId: stepId });
        prevId = stepId;
      }
    );

    // Insert into database
    const { data: automation, error: insertError } = await supabase
      .from("automations")
      .insert({
        name,
        description: description || null,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        steps: { nodes, connections },
        n8n_webhook_url: n8nWebhookUrl || null,
        is_active: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw new Error(`Failed to save automation: ${insertError.message}`);
    }

    console.log("Automation created and saved:", automation);

    // Return Vapi-compatible tool response
    return new Response(
      JSON.stringify({
        results: [
          {
            toolCallId: "create-automation",
            result: `Successfully created automation "${name}". It is now saved and ready to run.`,
          }
        ]
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Create automation webhook error:", error);
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
