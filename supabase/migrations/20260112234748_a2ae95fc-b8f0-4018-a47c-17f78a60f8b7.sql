-- Add embedding column to chat_messages for semantic search
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Add summarization columns to chat_sessions
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS is_summarized boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS key_topics text[];

-- Add pinning columns to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_by uuid;

-- Add pinning column to chat_sessions
ALTER TABLE public.chat_sessions 
ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;

-- Create index for semantic search on chat_messages embeddings
CREATE INDEX IF NOT EXISTS chat_messages_embedding_idx 
ON public.chat_messages 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);

-- Create function to match chat messages by embedding
CREATE OR REPLACE FUNCTION public.match_chat_messages(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  session_id uuid,
  content text,
  role text,
  is_pinned boolean,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.id,
    cm.session_id,
    cm.content,
    cm.role,
    cm.is_pinned,
    cm.created_at,
    1 - (cm.embedding <=> query_embedding) AS similarity
  FROM chat_messages cm
  JOIN chat_sessions cs ON cm.session_id = cs.id
  WHERE cm.embedding IS NOT NULL
    AND 1 - (cm.embedding <=> query_embedding) > match_threshold
    AND (target_user_id IS NULL OR cs.user_id = target_user_id)
  ORDER BY cm.is_pinned DESC, similarity DESC
  LIMIT match_count;
END;
$$;

-- Create function to auto-summarize old chat sessions
CREATE OR REPLACE FUNCTION public.get_sessions_needing_summary()
RETURNS TABLE (
  session_id uuid,
  user_id uuid,
  message_count bigint,
  last_message_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cs.id as session_id,
    cs.user_id,
    COUNT(cm.id) as message_count,
    MAX(cm.created_at) as last_message_at
  FROM chat_sessions cs
  JOIN chat_messages cm ON cm.session_id = cs.id
  WHERE cs.is_summarized = false
    AND cs.updated_at < NOW() - INTERVAL '10 minutes'
  GROUP BY cs.id, cs.user_id
  HAVING COUNT(cm.id) >= 4
  ORDER BY MAX(cm.created_at) DESC
  LIMIT 10;
END;
$$;

-- Add RLS policy for pinning messages (users can pin in their sessions, admins can pin any)
CREATE POLICY "Users can pin messages in their sessions"
ON public.chat_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE chat_sessions.id = chat_messages.session_id 
    AND (chat_sessions.user_id = auth.uid() OR is_admin(auth.uid()))
  )
);

-- Grant execute on new functions
GRANT EXECUTE ON FUNCTION public.match_chat_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sessions_needing_summary TO authenticated;