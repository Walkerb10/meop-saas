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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, sessionId } = await req.json();
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

    // Build context from platform data based on permissions
    const contextParts: string[] = [];

    // 1. Get knowledge base entries (filtered by role)
    const { data: knowledge } = await supabase
      .from("knowledge_base")
      .select("title, content, category")
      .or(`is_public.eq.true,allowed_roles.cs.{${userRole}}`);
    
    if (knowledge && knowledge.length > 0) {
      contextParts.push("=== KNOWLEDGE BASE ===");
      knowledge.forEach((k: any) => {
        contextParts.push(`[${k.category}] ${k.title}: ${k.content}`);
      });
    }

    // 2. Get team members info
    const { data: teamMembers } = await supabase
      .from("team_members")
      .select("display_name, email, is_active");
    
    if (teamMembers && teamMembers.length > 0) {
      contextParts.push("\n=== TEAM MEMBERS ===");
      teamMembers.forEach((m: any) => {
        contextParts.push(`- ${m.display_name || m.email} (${m.is_active ? "active" : "inactive"})`);
      });
    }

    // 3. Get automations (based on permissions)
    if (permissions?.can_view_all_automations || userRole === "admin") {
      const { data: automations } = await supabase
        .from("automations")
        .select("name, description, trigger_type, is_active, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (automations && automations.length > 0) {
        contextParts.push("\n=== AUTOMATIONS ===");
        automations.forEach((a: any) => {
          contextParts.push(`- ${a.name}: ${a.description || "No description"} (trigger: ${a.trigger_type}, active: ${a.is_active})`);
        });
      }
    }

    // 4. Get recent executions (based on permissions)
    if (permissions?.can_view_all_executions || userRole === "admin") {
      const { data: executions } = await supabase
        .from("executions")
        .select("sequence_name, status, started_at, completed_at, error_message")
        .order("started_at", { ascending: false })
        .limit(10);
      
      if (executions && executions.length > 0) {
        contextParts.push("\n=== RECENT EXECUTIONS ===");
        executions.forEach((e: any) => {
          contextParts.push(`- ${e.sequence_name}: ${e.status} at ${e.started_at}${e.error_message ? ` (error: ${e.error_message})` : ""}`);
        });
      }
    }

    // 5. Get team tasks
    if (permissions?.can_view_team_activity || userRole === "admin") {
      const { data: tasks } = await supabase
        .from("team_tasks")
        .select(`
          title, 
          description, 
          status, 
          priority, 
          due_date,
          assigned_to,
          created_by
        `)
        .order("created_at", { ascending: false })
        .limit(15);
      
      if (tasks && tasks.length > 0) {
        contextParts.push("\n=== TEAM TASKS ===");
        tasks.forEach((t: any) => {
          contextParts.push(`- ${t.title}: ${t.status} (priority: ${t.priority || "medium"}${t.due_date ? `, due: ${t.due_date}` : ""})`);
        });
      }
    }

    // 6. Get conversation history (based on permissions)
    if (permissions?.can_view_all_conversations || userRole === "admin") {
      const { data: recentConversations } = await supabase
        .from("conversation_transcripts")
        .select("role, content, created_at, conversation_id")
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (recentConversations && recentConversations.length > 0) {
        contextParts.push("\n=== RECENT PLATFORM CONVERSATIONS ===");
        recentConversations.forEach((c: any) => {
          const preview = c.content.substring(0, 100);
          contextParts.push(`- [${c.role}] ${preview}...`);
        });
      }
    }

    // 7. Get sequences
    const { data: sequences } = await supabase
      .from("sequences")
      .select("name, description, webhook_url");
    
    if (sequences && sequences.length > 0) {
      contextParts.push("\n=== SEQUENCES ===");
      sequences.forEach((s: any) => {
        contextParts.push(`- ${s.name}: ${s.description || "No description"}`);
      });
    }

    // Build system prompt with context
    const systemPrompt = `You are an intelligent assistant for a team operations platform. You have access to real-time platform data and can help users understand their team's activities, automations, tasks, and more.

Current user: ${userEmail || "Unknown"} (Role: ${userRole})

=== PLATFORM CONTEXT ===
${contextParts.join("\n")}

=== INSTRUCTIONS ===
- Answer questions about the platform, team members, tasks, automations, and executions based on the context provided
- If asked about something not in the context, say you don't have that information
- Be helpful and concise
- When discussing team members, tasks, or automations, reference the actual data
- If the user asks to create/modify things, explain what they need to do (you can't make changes directly)
- Always attribute information to its source when relevant`;

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
