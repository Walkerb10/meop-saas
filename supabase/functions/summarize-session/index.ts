import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('OPENAI_API_KEY');

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get sessions needing summary
    const { data: sessions, error: sessionsError } = await supabase
      .rpc('get_sessions_needing_summary');

    if (sessionsError) {
      console.error('Error getting sessions:', sessionsError);
      throw sessionsError;
    }

    if (!sessions || sessions.length === 0) {
      return new Response(JSON.stringify({ message: 'No sessions to summarize' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const summaries = [];

    for (const session of sessions) {
      // Get messages for this session
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .eq('session_id', session.session_id)
        .order('created_at', { ascending: true });

      if (messagesError || !messages || messages.length < 4) continue;

      // Format conversation for summarization
      const conversation = messages
        .map(m => `${m.role}: ${m.content}`)
        .join('\n\n');

      // Call AI to summarize
      const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: `You are a conversation summarizer. Analyze the conversation and provide:
1. A concise summary (2-3 sentences)
2. Key topics discussed (as a comma-separated list)
3. Any action items or decisions made

Format your response as JSON:
{
  "summary": "...",
  "key_topics": ["topic1", "topic2", ...],
  "action_items": ["item1", "item2", ...]
}`
            },
            {
              role: 'user',
              content: `Summarize this conversation:\n\n${conversation}`
            }
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        console.error('AI response error:', await response.text());
        continue;
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices[0]?.message?.content;

      if (!content) continue;

      // Parse the JSON response
      let parsed;
      try {
        // Extract JSON from potential markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
        parsed = JSON.parse(jsonStr);
      } catch (e) {
        console.error('Failed to parse AI response:', e);
        continue;
      }

      // Update the session with summary
      const { error: updateError } = await supabase
        .from('chat_sessions')
        .update({
          is_summarized: true,
          summary: parsed.summary,
          key_topics: parsed.key_topics || [],
        })
        .eq('id', session.session_id);

      if (updateError) {
        console.error('Error updating session:', updateError);
        continue;
      }

      // Add to knowledge base as team conversation
      const { error: kbError } = await supabase
        .from('knowledge_base')
        .insert({
          title: `Team Conversation: ${parsed.key_topics?.slice(0, 3).join(', ') || 'Discussion'}`,
          content: `## Summary\n${parsed.summary}\n\n## Key Topics\n${parsed.key_topics?.map((t: string) => `- ${t}`).join('\n') || 'None'}\n\n## Action Items\n${parsed.action_items?.map((a: string) => `- ${a}`).join('\n') || 'None'}`,
          category: 'team_conversation',
          is_public: true,
          is_shared: true,
          created_by: session.user_id,
        });

      if (kbError) {
        console.error('Error adding to knowledge base:', kbError);
      }

      summaries.push({
        session_id: session.session_id,
        summary: parsed.summary,
        topics: parsed.key_topics,
      });
    }

    return new Response(JSON.stringify({ 
      message: `Summarized ${summaries.length} sessions`,
      summaries 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in summarize-session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
