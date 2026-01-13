import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PromptAnalysis {
  clarity_score: number;
  specificity_score: number;
  context_score: number;
  effectiveness_score: number;
  feedback: string;
}

interface WeeklyAnalysis {
  total_prompts: number;
  avg_clarity_score: number;
  avg_specificity_score: number;
  avg_context_score: number;
  avg_effectiveness_score: number;
  overall_score: number;
  strengths: string[];
  improvement_areas: string[];
  recommendations: string;
  sample_prompts: { prompt: string; score: number }[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { action, userId, prompt, sessionId } = await req.json();

    if (action === "analyze_single") {
      // Analyze a single prompt in real-time
      const analysis = await analyzeSinglePrompt(prompt, lovableApiKey);
      
      // Store the tracking data
      await supabase.from("prompt_tracking").insert({
        user_id: userId,
        prompt_text: prompt,
        prompt_type: "chat",
        clarity_score: analysis.clarity_score,
        specificity_score: analysis.specificity_score,
        context_score: analysis.context_score,
        effectiveness_score: analysis.effectiveness_score,
        feedback: analysis.feedback,
        session_id: sessionId,
      });

      return new Response(JSON.stringify(analysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "weekly_analysis") {
      // Generate weekly analysis for a user
      const weeklyAnalysis = await generateWeeklyAnalysis(supabase, userId, lovableApiKey);
      
      // Store the weekly analysis
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      
      await supabase.from("prompt_analytics").insert({
        user_id: userId,
        analysis_period_start: weekAgo.toISOString(),
        analysis_period_end: now.toISOString(),
        total_prompts: weeklyAnalysis.total_prompts,
        avg_clarity_score: weeklyAnalysis.avg_clarity_score,
        avg_specificity_score: weeklyAnalysis.avg_specificity_score,
        avg_context_score: weeklyAnalysis.avg_context_score,
        avg_effectiveness_score: weeklyAnalysis.avg_effectiveness_score,
        overall_score: weeklyAnalysis.overall_score,
        strengths: weeklyAnalysis.strengths,
        improvement_areas: weeklyAnalysis.improvement_areas,
        recommendations: weeklyAnalysis.recommendations,
        sample_prompts: weeklyAnalysis.sample_prompts,
      });

      return new Response(JSON.stringify(weeklyAnalysis), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function analyzeSinglePrompt(prompt: string, apiKey?: string): Promise<PromptAnalysis> {
  if (!apiKey) {
    // Fallback to simple heuristic analysis
    return heuristicAnalysis(prompt);
  }

  try {
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing prompt quality. Analyze the given prompt and rate it on 4 dimensions (0-10 scale):
1. Clarity - How clear and understandable is the prompt?
2. Specificity - How specific and detailed is the prompt?
3. Context - Does the prompt provide adequate context?
4. Effectiveness - How likely is this prompt to get a good response?

Also provide brief actionable feedback (1-2 sentences).

Respond in JSON format:
{
  "clarity_score": number,
  "specificity_score": number,
  "context_score": number,
  "effectiveness_score": number,
  "feedback": "string"
}`
          },
          { role: "user", content: `Analyze this prompt: "${prompt}"` }
        ],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        clarity_score: Math.min(10, Math.max(0, parsed.clarity_score)) / 10,
        specificity_score: Math.min(10, Math.max(0, parsed.specificity_score)) / 10,
        context_score: Math.min(10, Math.max(0, parsed.context_score)) / 10,
        effectiveness_score: Math.min(10, Math.max(0, parsed.effectiveness_score)) / 10,
        feedback: parsed.feedback || "Analysis complete.",
      };
    }
  } catch (error) {
    console.error("AI analysis failed, using heuristic:", error);
  }

  return heuristicAnalysis(prompt);
}

function heuristicAnalysis(prompt: string): PromptAnalysis {
  const wordCount = prompt.split(/\s+/).filter(w => w.length > 0).length;
  const hasQuestion = /\?/.test(prompt);
  const hasContext = prompt.length > 50;
  const hasSpecificTerms = /\b(please|help|create|show|find|explain|how|what|why|when|where)\b/i.test(prompt);
  
  const clarity = Math.min(1, (wordCount > 3 ? 0.6 : 0.3) + (hasQuestion ? 0.2 : 0) + (hasSpecificTerms ? 0.2 : 0));
  const specificity = Math.min(1, wordCount / 20);
  const context = hasContext ? 0.7 : 0.4;
  const effectiveness = (clarity + specificity + context) / 3;

  let feedback = "";
  if (wordCount < 5) feedback = "Try adding more detail to your prompt.";
  else if (!hasContext) feedback = "Consider providing more context for better results.";
  else if (!hasSpecificTerms) feedback = "Use action words like 'create', 'explain', or 'find' to clarify your intent.";
  else feedback = "Good prompt structure! Keep it up.";

  return {
    clarity_score: Number(clarity.toFixed(2)),
    specificity_score: Number(specificity.toFixed(2)),
    context_score: Number(context.toFixed(2)),
    effectiveness_score: Number(effectiveness.toFixed(2)),
    feedback,
  };
}

async function generateWeeklyAnalysis(supabase: any, userId: string, apiKey?: string): Promise<WeeklyAnalysis> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  // Get prompts from chat_messages for the past week
  const { data: chatMessages } = await supabase
    .from("chat_messages")
    .select("content, created_at, session_id")
    .eq("role", "user")
    .gte("created_at", weekAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(100);

  // Get prompts from prompt_tracking
  const { data: trackedPrompts } = await supabase
    .from("prompt_tracking")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", weekAgo.toISOString())
    .order("created_at", { ascending: false });

  const allPrompts = [
    ...(chatMessages || []).map((m: any) => ({ text: m.content, tracked: false })),
    ...(trackedPrompts || []).map((p: any) => ({ 
      text: p.prompt_text, 
      tracked: true,
      scores: {
        clarity: p.clarity_score,
        specificity: p.specificity_score,
        context: p.context_score,
        effectiveness: p.effectiveness_score,
      }
    })),
  ];

  if (allPrompts.length === 0) {
    return {
      total_prompts: 0,
      avg_clarity_score: 0,
      avg_specificity_score: 0,
      avg_context_score: 0,
      avg_effectiveness_score: 0,
      overall_score: 0,
      strengths: ["No prompts to analyze this week"],
      improvement_areas: ["Start using the platform to get insights"],
      recommendations: "Begin interacting with the AI to receive personalized prompting feedback.",
      sample_prompts: [],
    };
  }

  // Analyze untracked prompts
  const analyses: PromptAnalysis[] = [];
  for (const prompt of allPrompts) {
    if (prompt.tracked && prompt.scores) {
      analyses.push({
        clarity_score: prompt.scores.clarity || 0,
        specificity_score: prompt.scores.specificity || 0,
        context_score: prompt.scores.context || 0,
        effectiveness_score: prompt.scores.effectiveness || 0,
        feedback: "",
      });
    } else {
      const analysis = await analyzeSinglePrompt(prompt.text, apiKey);
      analyses.push(analysis);
    }
  }

  // Calculate averages
  const avgClarity = analyses.reduce((s, a) => s + a.clarity_score, 0) / analyses.length;
  const avgSpecificity = analyses.reduce((s, a) => s + a.specificity_score, 0) / analyses.length;
  const avgContext = analyses.reduce((s, a) => s + a.context_score, 0) / analyses.length;
  const avgEffectiveness = analyses.reduce((s, a) => s + a.effectiveness_score, 0) / analyses.length;
  const overall = (avgClarity + avgSpecificity + avgContext + avgEffectiveness) / 4;

  // Determine strengths and improvement areas
  const scores = [
    { name: "Clarity", score: avgClarity },
    { name: "Specificity", score: avgSpecificity },
    { name: "Context", score: avgContext },
    { name: "Effectiveness", score: avgEffectiveness },
  ];
  
  scores.sort((a, b) => b.score - a.score);
  const strengths = scores.filter(s => s.score >= 0.6).map(s => s.name);
  const improvements = scores.filter(s => s.score < 0.6).map(s => s.name);

  // Generate recommendations
  let recommendations = "";
  if (avgSpecificity < 0.5) {
    recommendations += "Add more specific details to your prompts. Instead of 'help me with this', try 'help me create a marketing email for our new product launch'. ";
  }
  if (avgContext < 0.5) {
    recommendations += "Provide more context about your goals and constraints. Explain what you've already tried or what format you need. ";
  }
  if (avgClarity < 0.5) {
    recommendations += "Structure your prompts more clearly. Start with your main objective, then add supporting details. ";
  }
  if (overall >= 0.7) {
    recommendations = "Great work! Your prompting skills are strong. Keep providing specific context and clear objectives.";
  }

  // Get sample prompts with scores
  const samplePrompts = allPrompts.slice(0, 5).map((p, i) => ({
    prompt: p.text.substring(0, 100) + (p.text.length > 100 ? "..." : ""),
    score: Number(((analyses[i]?.clarity_score || 0 + analyses[i]?.specificity_score || 0) / 2).toFixed(2)),
  }));

  return {
    total_prompts: allPrompts.length,
    avg_clarity_score: Number(avgClarity.toFixed(2)),
    avg_specificity_score: Number(avgSpecificity.toFixed(2)),
    avg_context_score: Number(avgContext.toFixed(2)),
    avg_effectiveness_score: Number(avgEffectiveness.toFixed(2)),
    overall_score: Number(overall.toFixed(2)),
    strengths: strengths.length > 0 ? strengths : ["Keep practicing!"],
    improvement_areas: improvements.length > 0 ? improvements : ["Excellent across the board!"],
    recommendations: recommendations || "Continue with your current approach.",
    sample_prompts: samplePrompts,
  };
}
