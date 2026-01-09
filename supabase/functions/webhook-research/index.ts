import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { query, search_mode, recency } = await req.json();
    
    console.log("Research webhook called with query:", query);
    
    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    // Build the request body for Perplexity
    const requestBody: Record<string, unknown> = {
      model: "sonar-pro", // Multi-step reasoning with 2x more citations
      messages: [
        {
          role: "system",
          content: "You are a deep research assistant. Provide comprehensive, well-sourced answers with citations. Focus on accuracy and depth.",
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
