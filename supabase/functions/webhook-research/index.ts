import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Output format templates matching the frontend
const OUTPUT_FORMATS: Record<string, string> = {
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

function normalizeOutputFormatKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  if (!v) return null;

  // Accept both keys and human labels
  if (v === "summary" || v.includes("summary") || v.includes("brief")) return "summary";
  if (v === "detailed" || v.includes("detailed") || v.includes("report")) return "detailed";
  if (v === "bullets" || v.includes("bullet")) return "bullets";
  if (v === "actionable" || v.includes("actionable") || v.includes("next step")) return "actionable";
  if (v === "problem" || v.includes("problem framework") || v.includes("framework")) return "problem";

  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, search_mode, recency, output_format, output_length, execution_id } = await req.json();
    
    console.log("Research webhook called with query:", query);
    console.log("Execution ID:", execution_id);
    console.log("Output format requested:", output_format);
    console.log("Output length requested:", output_length);
    
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    const parsedWordCount = (() => {
      const n = typeof output_length === "number" ? output_length : parseInt(String(output_length || ""), 10);
      return Number.isFinite(n) && n > 0 ? n : null;
    })();

    const wordCountInstruction = parsedWordCount
      ? `Aim for approximately ${parsedWordCount} words (±25).`
      : "";

    // Determine the format instructions
    let formatInstructions = "";

    const normalizedOutputFormat = normalizeOutputFormatKey(output_format) ?? output_format;

    if (typeof normalizedOutputFormat === "string" && normalizedOutputFormat.trim()) {
      // Check if it's a known format key or custom format text
      if (OUTPUT_FORMATS[normalizedOutputFormat]) {
        formatInstructions = OUTPUT_FORMATS[normalizedOutputFormat];
      } else if (normalizedOutputFormat.length > 20) {
        // Treat as custom format instructions
        formatInstructions = `Format your response following these instructions:\n${normalizedOutputFormat}`;
      }
    }

    // Build system prompt with format + word count instructions
    const baseSystemPrompt =
      "You are a deep research assistant. Provide comprehensive, well-sourced answers with citations. Focus on accuracy and depth.";

    const systemPrompt = [baseSystemPrompt, wordCountInstruction, formatInstructions]
      .filter(Boolean)
      .join("\n\n");

    // Build the request body for Perplexity
    const requestBody: Record<string, unknown> = {
      model: "sonar-pro", // Multi-step reasoning with 2x more citations
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: query,
        },
      ],
    };

    // Add optional filters
    if (search_mode) {
      requestBody.search_mode = search_mode; // 'academic', 'sec', or default
    }
    
    if (recency) {
      requestBody.search_recency_filter = recency; // 'day', 'week', 'month', 'year'
    }

    console.log("Calling Perplexity API...");
    
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Perplexity API error:", response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log("Perplexity response received, citations:", data.citations?.length || 0);

    let content = data.choices?.[0]?.message?.content || "No response generated";
    const citations = data.citations || [];

    // Enforce requested formatting + approximate word count via Lovable AI (best-effort).
    // If this fails for any reason, we still return the Perplexity output.
    if (parsedWordCount && formatInstructions) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          console.log("Reformatting output to enforce format/length...");

          const rewriteResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-3-flash-preview",
              messages: [
                {
                  role: "system",
                  content:
                    "You are an expert editor. Rewrite the provided research into the requested format and target word count. Do not add new facts; do not invent sources; do not include URLs in the body. Output ONLY the rewritten content.",
                },
                {
                  role: "user",
                  content: `TARGET WORD COUNT: ~${parsedWordCount} (±25)\n\nFORMAT INSTRUCTIONS:\n${formatInstructions}\n\nSOURCE TEXT TO REWRITE:\n${content}`,
                },
              ],
            }),
          });

          if (rewriteResp.ok) {
            const rewriteData = await rewriteResp.json();
            const rewritten = rewriteData.choices?.[0]?.message?.content;
            if (typeof rewritten === "string" && rewritten.trim()) {
              content = rewritten;
            }
          } else {
            const t = await rewriteResp.text();
            console.warn("Rewrite step failed:", rewriteResp.status, t);
          }
        } catch (e) {
          console.warn("Rewrite step error (skipping):", e);
        }
      } else {
        console.warn("LOVABLE_API_KEY not configured; skipping reformat step");
      }
    }
    
    // Format the response for ElevenLabs agent
    const result = {
      success: true,
      content,
      citations,
      model: data.model,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Research webhook error:", error);
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
