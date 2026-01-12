import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, description, priority } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert software development assistant. Your job is to analyze feature requests or bug reports and generate:
1. A clear AI recommendation for how to implement/fix this
2. A ready-to-use prompt that can be copy-pasted into an AI coding assistant like Lovable to implement the fix

Be specific, actionable, and technical. Format your response as JSON with these fields:
- recommendation: A 2-3 sentence analysis of what needs to be done and the best approach
- prompt: A detailed prompt (3-5 sentences) that can be used to implement this feature/fix. Start with "Please..." or an action verb.
- complexity: "low" | "medium" | "high" based on implementation difficulty
- estimatedFiles: An array of likely file paths that would need to be modified`;

    const userPrompt = `Feature/Bug: ${title}
${description ? `Description: ${description}` : 'No additional description provided.'}
Priority: ${priority || 'medium'}

Generate an AI recommendation and implementation prompt for this.`;

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
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate recommendation");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // If parsing fails, create a structured response from the text
      parsed = {
        recommendation: content.slice(0, 200),
        prompt: `Please implement: ${title}. ${description || ''}`,
        complexity: priority === 'high' ? 'high' : priority === 'low' ? 'low' : 'medium',
        estimatedFiles: [],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-fix-prompt error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
