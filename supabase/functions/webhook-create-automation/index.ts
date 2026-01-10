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

    // Format steps for database
    const formattedSteps = (steps || []).map((step: { type?: string; label?: string; config?: Record<string, unknown> }, index: number) => ({
      id: crypto.randomUUID(),
      type: step.type || "action",
      label: step.label || `Step ${index + 1}`,
      config: step.config || {},
    }));

    // Add trigger as first step if provided
    if (trigger?.label) {
      formattedSteps.unshift({
        id: crypto.randomUUID(),
        type: "trigger",
        label: trigger.label,
        config: triggerConfig,
      });
    }

    // Insert into database
    const { data: automation, error: insertError } = await supabase
      .from("automations")
      .insert({
        name,
        description: description || null,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        steps: formattedSteps,
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

    return new Response(
      JSON.stringify({
        success: true,
        automation,
        message: `Automation "${name}" created successfully`,
      }),
      {
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
