import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { transcriptId, content } = await req.json();

    if (!transcriptId || !content) {
      throw new Error("Missing transcriptId or content");
    }

    console.log(`Generating embedding for transcript: ${transcriptId}`);

    // Generate embedding
    const embedding = generateFallbackEmbedding(content);

    // Update the transcript with the embedding
    const { error: updateError } = await supabase
      .from("conversation_transcripts")
      .update({ embedding })
      .eq("id", transcriptId);

    if (updateError) {
      console.error("Failed to update transcript embedding:", updateError);
      throw new Error("Failed to save embedding");
    }

    console.log(`Embedding saved for transcript: ${transcriptId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Generate a deterministic pseudo-embedding based on content
function generateFallbackEmbedding(content: string): number[] {
  const embedding = new Array(768).fill(0);
  const words = content.toLowerCase().split(/\s+/);
  
  // Use character codes and word positions to create a pseudo-embedding
  for (let i = 0; i < words.length && i < 100; i++) {
    const word = words[i];
    for (let j = 0; j < word.length && j < 10; j++) {
      const charCode = word.charCodeAt(j);
      const index = ((i * 10 + j) * charCode) % 768;
      embedding[index] += (charCode - 96) / 26 * 0.1;
    }
  }

  // Normalize
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
  return embedding.map((val) => Math.max(-1, Math.min(1, val / magnitude)));
}
