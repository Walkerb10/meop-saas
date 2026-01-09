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
    const { name, description, trigger, steps } = await req.json();
    
    console.log("Create automation webhook called:", { name, description, trigger, stepsCount: steps?.length });
    
    // Validate required fields
    if (!name) {
      throw new Error("Automation name is required");
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For now, return the automation data
    // This can be extended to save to database once we have the schema
    const automation = {
      id: crypto.randomUUID(),
      name,
      description: description || null,
      trigger: trigger || { type: "manual" },
      steps: steps || [],
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    console.log("Automation created:", automation);

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
