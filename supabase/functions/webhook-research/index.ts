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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, search_mode, recency, output_format } = await req.json();
    
    console.log("Research webhook called with query:", query);
    console.log("Output format requested:", output_format);
    
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    // Determine the format instructions
    let formatInstructions = "";
    if (output_format) {
      // Check if it's a known format key or custom format text
      if (OUTPUT_FORMATS[output_format]) {
        formatInstructions = OUTPUT_FORMATS[output_format];
      } else if (output_format.length > 20) {
        // Treat as custom format instructions
        formatInstructions = `Format your response following these instructions:\n${output_format}`;
      }
    }

    // Build system prompt with format instructions
    const systemPrompt = formatInstructions
      ? `You are a deep research assistant. Provide comprehensive, well-sourced answers with citations. Focus on accuracy and depth.\n\n${formatInstructions}`
      : "You are a deep research assistant. Provide comprehensive, well-sourced answers with citations. Focus on accuracy and depth.";

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
    
    // Format the response for ElevenLabs agent
    const result = {
      success: true,
      content: data.choices?.[0]?.message?.content || "No response generated",
      citations: data.citations || [],
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
