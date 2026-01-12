import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

// Generate embedding using Lovable AI
async function generateEmbedding(text: string, apiKey: string): Promise<number[] | null> {
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an embedding generator. Convert the following text into a 768-dimensional embedding vector. 
            Return ONLY a JSON array of 768 floating point numbers between -1 and 1. No other text.`,
          },
          { role: "user", content: text.substring(0, 2000) },
        ],
        temperature: 0,
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const match = content.match(/\[[\s\S]*?\]/);
    if (!match) return null;

    const embedding = JSON.parse(match[0]);
    if (Array.isArray(embedding) && embedding.length === 768) {
      return embedding;
    }
    return null;
  } catch (e) {
    console.error("Embedding generation failed:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId, conversationId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get auth token from request
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user from token
    let userId: string | null = null;
    let userRole: string = "member";
    let userEmail: string | null = null;
    
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user) {
        userId = user.id;
        userEmail = user.email || null;
        
        // Get user role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();
        
        if (roleData) {
          userRole = roleData.role;
        }
      }
    }

    // Get user's data permissions
    const { data: permissions } = await supabase
      .from("chat_data_permissions")
      .select("*")
      .eq("role", userRole)
      .single();

    // Get the latest user message for semantic search
    const latestUserMessage = messages.filter((m: ChatMessage) => m.role === "user").pop();
    const queryText = latestUserMessage?.content || "";

    // Build context from platform data
    const contextParts: string[] = [];

    // === SEMANTIC SEARCH SECTION ===
    
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText, LOVABLE_API_KEY);
    
    if (queryEmbedding && userId) {
      // 1. Search knowledge base semantically
      const { data: knowledgeMatches } = await supabase.rpc("match_knowledge_entries", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.6,
        match_count: 5,
      });

      if (knowledgeMatches && knowledgeMatches.length > 0) {
        contextParts.push("=== RELEVANT KNOWLEDGE (Semantic Match) ===");
        knowledgeMatches.forEach((k: any) => {
          contextParts.push(`[${k.category}] ${k.title} (${Math.round(k.similarity * 100)}% relevant):\n${k.content}`);
        });
      }

      // 2. Search past conversations semantically
      const { data: conversationMatches } = await supabase.rpc("match_conversations", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.65,
        match_count: 5,
        target_user_id: userId,
      });

      if (conversationMatches && conversationMatches.length > 0) {
        contextParts.push("\n=== RELEVANT PAST CONVERSATIONS ===");
        conversationMatches.forEach((c: any) => {
          contextParts.push(`- [${c.role}] ${c.content.substring(0, 200)}... (${Math.round(c.similarity * 100)}% relevant)`);
        });
      }

      // 3. Search user memories
      const { data: memoryMatches } = await supabase.rpc("match_user_memories", {
        query_embedding: JSON.stringify(queryEmbedding),
        target_user_id: userId,
        match_threshold: 0.6,
        match_count: 5,
      });

      if (memoryMatches && memoryMatches.length > 0) {
        contextParts.push("\n=== USER MEMORIES & PREFERENCES ===");
        memoryMatches.forEach((m: any) => {
          contextParts.push(`- [${m.memory_type}] ${m.content}`);
        });
      }
    }

    // === STATIC CONTEXT SECTION ===

    // Get team members info (shared knowledge)
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("display_name, email, is_active");
    
    if (teamMembers && teamMembers.length > 0) {
      contextParts.push("\n=== TEAM MEMBERS ===");
      teamMembers.forEach((m: any) => {
        contextParts.push(`- ${m.display_name || m.email} (${m.is_active ? "active" : "inactive"})`);
      });
    }

    // Get automations (based on permissions)
    if (permissions?.can_view_all_automations || userRole === "admin" || userRole === "owner") {
      const { data: automations } = await supabase
        .from("automations")
        .select("name, description, trigger_type, is_active, created_at, created_by")
        .order("created_at", { ascending: false })
        .limit(15);
      
      if (automations && automations.length > 0) {
        contextParts.push("\n=== AUTOMATIONS ===");
        automations.forEach((a: any) => {
          contextParts.push(`- ${a.name}: ${a.description || "No description"} (trigger: ${a.trigger_type}, active: ${a.is_active})`);
        });
      }
    }

    // Get recent executions (based on permissions)
    if (permissions?.can_view_all_executions || userRole === "admin" || userRole === "owner") {
      const { data: executions } = await supabase
        .from("executions")
        .select("sequence_name, status, started_at, completed_at, error_message")
        .order("started_at", { ascending: false })
        .limit(8);
      
      if (executions && executions.length > 0) {
        contextParts.push("\n=== RECENT EXECUTIONS ===");
        executions.forEach((e: any) => {
          contextParts.push(`- ${e.sequence_name}: ${e.status} at ${e.started_at}${e.error_message ? ` (error: ${e.error_message})` : ""}`);
        });
      }
    }

    // Get team tasks
    if (permissions?.can_view_team_activity || userRole === "admin" || userRole === "owner") {
      const { data: tasks } = await supabase
        .from("team_tasks")
        .select("title, description, status, priority, due_date")
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (tasks && tasks.length > 0) {
        contextParts.push("\n=== TEAM TASKS ===");
        tasks.forEach((t: any) => {
          contextParts.push(`- ${t.title}: ${t.status} (priority: ${t.priority || "medium"}${t.due_date ? `, due: ${t.due_date}` : ""})`);
        });
      }
    }

    // Get sequences
    const { data: sequences } = await supabase
      .from("sequences")
      .select("name, description, created_by");
    
    if (sequences && sequences.length > 0) {
      contextParts.push("\n=== AVAILABLE SEQUENCES ===");
      sequences.forEach((s: any) => {
        contextParts.push(`- ${s.name}: ${s.description || "No description"}`);
      });
    }

    // Get calendar events (upcoming)
    const { data: calendarEvents } = await supabase
      .from("calendar_events")
      .select("title, description, start_time, end_time, assigned_to")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(10);
    
    if (calendarEvents && calendarEvents.length > 0) {
      contextParts.push("\n=== UPCOMING CALENDAR EVENTS ===");
      calendarEvents.forEach((e: any) => {
        contextParts.push(`- ${e.title} at ${e.start_time}${e.description ? `: ${e.description}` : ""}`);
      });
    }

    // Get pinned messages (priority context)
    const { data: pinnedMessages } = await supabase
      .from("chat_messages")
      .select("content, role, created_at")
      .eq("is_pinned", true)
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (pinnedMessages && pinnedMessages.length > 0) {
      contextParts.push("\n=== PINNED IMPORTANT MESSAGES ===");
      pinnedMessages.forEach((m: any) => {
        contextParts.push(`[${m.role}]: ${m.content}`);
      });
    }

    // Build system prompt with context
    const systemPrompt = `You are MEOP AI, the intelligent voice and text assistant for MEOP OS - a team operations platform. You are trained on the company knowledge base, all past conversations, user memories, and platform data.

Current user: ${userEmail || "Unknown"} (Role: ${userRole})

=== HOW YOU WORK ===
- You use semantic search to find relevant information from past conversations, knowledge base, and user memories
- You remember context from previous conversations and build understanding over time
- You can help with platform operations, answer questions about processes, and provide insights

=== PLATFORM CONTEXT ===
${contextParts.join("\n")}

=== INSTRUCTIONS ===
- Be conversational, helpful, and concise - you're a voice-first assistant
- Reference relevant information from past conversations when helpful
- If you remember something about the user from memories, naturally incorporate it
- When discussing data, attribute it to its source
- If asked about something not in your context, acknowledge you don't have that information
- Keep responses clear and easy to understand - aim for 5th grade reading level
- For complex topics, break them down into simple steps`;

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
          ...messages,
        ],
        stream: true,
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

    // Stream the response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("RAG chat error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
