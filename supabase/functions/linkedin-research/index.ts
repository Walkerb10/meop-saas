import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Keywords to track across platforms
const KEYWORDS = [
  "AI agents",
  "AI automation",
  "startup growth",
  "agency growth",
  "lead magnets",
  "high-ticket sales",
  "content creation",
  "unique value proposition",
  "LinkedIn growth",
  "outcome-based prompting",
  "no-brainer offers",
];

// Platforms to research
const PLATFORMS = [
  "TikTok trending business and AI content",
  "LinkedIn top posts in startup and agency space",
  "Yahoo Finance business trends",
  "Twitter/X AI and startup discussions",
  "Reddit r/startups r/entrepreneur r/marketing",
];

// Walker Bauknight style post patterns
const POST_PATTERNS = {
  lead_magnet: `
    Structure:
    - Contrarian opinion or direct problem statement as hook (1 line)
    - Short punchy sentences explaining the pain point (2-3 lines)
    - Brief explanation of your solution (2-3 lines)
    - CTA: "Comment MAGNET and I'll send you [specific resource]"
    - BONUS: "Repost for [additional resource]"
    
    Style: Direct, conversational, no fluff
  `,
  offer: `
    Structure:
    - Hook: Identify 2 core problems ("Either: X or Y")
    - Explain why common solutions fail (2-3 punchy lines)
    - Present your system/approach (2-3 lines)
    - List 2-3 specific outcomes with bullet points
    - CTA: "Comment OFFER for details"
    
    Style: Problem-focused, outcome-driven
  `,
  value: `
    Structure:
    - Contrarian insight with a statistic or bold claim (hook)
    - Concrete real-world example (2-3 lines)
    - 3-4 actionable steps or insights (bullet points OK here)
    - Final insight that ties it together
    - No hard CTA (soft engagement only)
    
    Style: Educational, immediately useful
  `,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, trends } = await req.json();

    console.log("LinkedIn research action:", action);

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY is not configured");
    }

    if (action === "research") {
      // Build research query for last 48 hours
      const researchQuery = `
        Research the last 48 hours of trending content across these platforms:
        ${PLATFORMS.join(", ")}
        
        Focus on these topics and keywords:
        ${KEYWORDS.join(", ")}
        
        Target audience: Agency owners and entrepreneurs selling high-ticket offers ($5K+) who need more qualified leads, better conversion rates, stronger positioning, and effective lead magnets.
        
        Provide:
        1. Key trends emerging in the last 48 hours
        2. Specific examples of viral or high-engagement content
        3. Common pain points being discussed
        4. Successful content formats and hooks
        5. Topics generating the most engagement
        
        Write as clean prose suitable for a research report. No JSON, no code formatting.
      `;

      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar-pro",
          messages: [
            {
              role: "system",
              content: "You are a social media trend researcher specializing in B2B content, startups, and agency marketing. Write clear, actionable insights in natural prose. No JSON formatting. No code blocks. No markdown headers. Just clean paragraphs of analysis.",
            },
            {
              role: "user",
              content: researchQuery,
            },
          ],
          search_recency_filter: "day", // Last 24 hours for freshness
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Perplexity API error:", response.status, errorText);
        throw new Error(`Research API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "No research data found";
      const citations = data.citations || [];

      // Clean the content of any remaining formatting artifacts
      const cleanedContent = cleanContent(content);

      return new Response(
        JSON.stringify({
          success: true,
          content: cleanedContent,
          citations,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "generate") {
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      if (!trends) {
        throw new Error("Trends data required for post generation");
      }

      // Generate 3 LinkedIn posts using the research
      const generatePrompt = `
        Based on this 48-hour trend research:
        
        ${trends}
        
        Generate exactly 3 LinkedIn posts for agency owners/entrepreneurs selling high-ticket offers ($5K+).
        
        POST 1: Lead Magnet Post
        ${POST_PATTERNS.lead_magnet}
        
        POST 2: Offer Post
        ${POST_PATTERNS.offer}
        
        POST 3: Value Post
        ${POST_PATTERNS.value}
        
        CRITICAL REQUIREMENTS:
        - Under 300 words each
        - Reference current trends from the research
        - Sound human-written, NOT AI-generated
        - Use line breaks for readability
        - Maximum 1-2 emojis per post
        - Short punchy sentences (1-2 lines max)
        - Contrarian or direct hooks
        
        AVOID:
        - Generic motivation quotes
        - Obvious AI patterns like "In today's fast-paced world..."
        - Formal or corporate language
        - Long paragraphs
        - Multiple hashtags (max 2-3)
        - Excessive emojis
        - Words like "leverage", "synergy", "game-changer"
        
        VOICE: Direct, conversational, slightly provocative. Like texting a smart friend who happens to know business.
        
        Format your response as JSON:
        {
          "posts": [
            {
              "type": "lead_magnet",
              "hook": "First line hook",
              "content": "Full post content",
              "cta": "Comment MAGNET..."
            },
            {
              "type": "offer",
              "hook": "First line hook", 
              "content": "Full post content",
              "cta": "Comment OFFER..."
            },
            {
              "type": "value",
              "hook": "First line hook",
              "content": "Full post content",
              "cta": null
            }
          ]
        }
      `;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              content: "You are Walker Bauknight, a LinkedIn content expert who writes posts that get massive engagement. Your posts are direct, punchy, and feel genuinely human. You never sound like AI. You write like you're texting a friend. Output ONLY valid JSON.",
            },
            {
              role: "user",
              content: generatePrompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ success: false, error: "Rate limit exceeded. Please try again in a moment." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ success: false, error: "AI credits exhausted. Please add credits to continue." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || "";
      
      // Parse the JSON response
      let posts = [];
      try {
        // Extract JSON from the response (handle markdown code blocks)
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          posts = parsed.posts || [];
        }
      } catch (parseError) {
        console.error("Failed to parse posts JSON:", parseError);
        // Fallback: return raw content for manual parsing
        return new Response(
          JSON.stringify({
            success: true,
            posts: [],
            rawContent,
            parseError: "Could not parse structured posts, raw content provided",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Clean each post's content
      posts = posts.map((post: any) => ({
        ...post,
        content: cleanContent(post.content || ""),
        hook: cleanContent(post.hook || ""),
      }));

      return new Response(
        JSON.stringify({
          success: true,
          posts,
          rawContent,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    console.error("LinkedIn research error:", error);
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

// Helper function to clean content of AI/formatting artifacts
function cleanContent(text: string): string {
  let cleaned = text;

  // Remove AI markers
  cleaned = cleaned.replace(/^Here'?s?\s+(?:what\s+)?(?:I\s+)?found:?\s*/gi, "");
  cleaned = cleaned.replace(/^Here\s+(?:are|is)\s+(?:the\s+)?(?:results?|information|data):?\s*/gi, "");
  cleaned = cleaned.replace(/^Based\s+on\s+(?:my\s+)?(?:research|analysis):?\s*/gi, "");

  // Remove markdown formatting
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, "$1");
  cleaned = cleaned.replace(/\*([^*]+)\*/g, "$1");
  cleaned = cleaned.replace(/__([^_]+)__/g, "$1");
  cleaned = cleaned.replace(/_([^_]+)_/g, "$1");
  cleaned = cleaned.replace(/`([^`]+)`/g, "$1");
  cleaned = cleaned.replace(/^#+\s+/gm, "");

  // Fix spacing
  cleaned = cleaned.replace(/  +/g, " ");
  cleaned = cleaned.trim();

  return cleaned;
}
