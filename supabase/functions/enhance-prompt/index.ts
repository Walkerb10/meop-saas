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
    const { prompt, type, output_format, output_length } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Enhancing prompt:", { type, prompt: prompt.substring(0, 50), output_format, output_length });

    let systemPrompt: string;
    
    if (type === 'research') {
      systemPrompt = `You are an elite research query architect. Transform vague research requests into powerful, comprehensive research prompts that will extract maximum value from AI search engines like Perplexity.

Your enhanced prompt MUST include:

1. **TOPIC CLARITY**: Precisely define what is being researched - name specific companies, technologies, people, or concepts
2. **SCOPE & BOUNDARIES**: Define what's in scope and what's out of scope
3. **TIME RELEVANCE**: Specify exact timeframes (e.g., "in the last 48 hours", "Q4 2025", "since January 2025")
4. **SOURCE QUALITY**: Indicate preferred source types (academic papers, news, official announcements, expert analysis)
5. **DEPTH INDICATORS**: Specify the level of analysis needed (surface overview vs. deep technical dive)
6. **ACTIONABLE CONTEXT**: Why this matters and what decisions will be made with this information
7. **KEY QUESTIONS**: 2-3 specific questions that must be answered

${output_length ? `IMPORTANT - Desired output length: ${output_length}. Calibrate the research scope accordingly.` : ''}
${output_format ? `Output will be formatted as: ${output_format}` : ''}

Transform the user's simple query into a comprehensive research directive. Write in second person ("Research...", "Analyze...", "Identify...").

Output ONLY the enhanced research prompt - no explanations, headers, or meta-commentary. The prompt should be 3-6 sentences that would make any researcher immediately understand exactly what to find.`;
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
