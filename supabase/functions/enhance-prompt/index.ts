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
    const { prompt, type, output_format } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Enhancing prompt:", { type, prompt: prompt.substring(0, 50), output_format });

    let systemPrompt: string;
    
    if (type === 'research') {
      systemPrompt = `You are a research query optimization expert. Your task is to improve research queries to get better, more comprehensive results from AI search tools like Perplexity.

When given a user's research query, enhance it by:
1. Making it more specific and focused - clarify exactly what is being researched
2. Adding relevant context or constraints - specify the domain, industry, or field
3. Specifying what type of information is most valuable - data, trends, analysis, etc.
4. Including timeframes if relevant (e.g., "latest developments in 2024", "recent trends")
5. Clarifying the goal - what the user wants to learn or accomplish with this research
6. Describing the desired output - what kind of insights are expected

${output_format ? `The user wants the results in this format: ${output_format}. Consider this when optimizing the query.` : ''}

Keep the enhanced query concise (2-4 sentences max). Maintain the user's original intent but make it crystal clear what should be researched, why, and what insights are expected.
Respond ONLY with the enhanced query, no explanations or preamble.`;
    } else {
      systemPrompt = `You are a prompt enhancement expert. Improve the given prompt to be clearer, more specific, and more effective. Keep it concise. Respond ONLY with the enhanced prompt.`;
    }

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
