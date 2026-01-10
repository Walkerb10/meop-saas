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
    const { prompt, type } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Enhancing prompt:", { type, prompt: prompt.substring(0, 50) });

    const systemPrompt = type === 'research' 
      ? `You are a research query optimization expert. Your task is to improve research queries to get better, more comprehensive results from AI search tools like Perplexity.

When given a user's research query, enhance it by:
1. Making it more specific and focused
2. Adding relevant context or constraints
3. Specifying what type of information is most valuable
4. Including timeframes if relevant (e.g., "latest", "2024", "recent")
5. Clarifying the desired depth or scope

Keep the enhanced query concise (1-3 sentences max). Maintain the user's original intent.
Respond ONLY with the enhanced query, no explanations or preamble.`
      : `You are a prompt enhancement expert. Improve the given prompt to be clearer, more specific, and more effective. Keep it concise. Respond ONLY with the enhanced prompt.`;

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
          { role: "user", content: `Enhance this ${type || 'prompt'}: "${prompt}"` },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI request failed");
    }

    const data = await response.json();
    const enhancedPrompt = data.choices?.[0]?.message?.content || prompt;

    console.log("Enhanced prompt result:", enhancedPrompt.substring(0, 100));

    return new Response(JSON.stringify({ enhancedPrompt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Enhance prompt error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
