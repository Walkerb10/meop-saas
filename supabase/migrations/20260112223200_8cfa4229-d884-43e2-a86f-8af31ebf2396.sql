-- Create user_memories table for rolling summaries and facts
CREATE TABLE public.user_memories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  memory_type TEXT NOT NULL DEFAULT 'fact', -- 'fact', 'preference', 'summary'
  content TEXT NOT NULL,
  embedding vector(768),
  source_conversation_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add embedding column to conversation_transcripts for semantic search
ALTER TABLE public.conversation_transcripts 
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Add is_shared column to knowledge_base for team vs personal knowledge
ALTER TABLE public.knowledge_base 
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT true;

-- Enable RLS on user_memories
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- Users can view their own memories
CREATE POLICY "Users can view own memories" 
ON public.user_memories 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own memories
CREATE POLICY "Users can create own memories" 
ON public.user_memories 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own memories
CREATE POLICY "Users can update own memories" 
ON public.user_memories 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own memories
CREATE POLICY "Users can delete own memories" 
ON public.user_memories 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins and owners can view all memories
CREATE POLICY "Admins can view all memories" 
ON public.user_memories 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role IN ('owner', 'admin')
  )
);

-- Create function to match conversation transcripts by embedding
CREATE OR REPLACE FUNCTION public.match_conversations(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  target_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  conversation_id uuid,
  content text,
  role text,
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
    ct.id,
    ct.conversation_id,
    ct.content,
    ct.role,
    ct.created_at,
    1 - (ct.embedding <=> query_embedding) AS similarity
  FROM conversation_transcripts ct
  WHERE ct.embedding IS NOT NULL
    AND (target_user_id IS NULL OR ct.user_id = target_user_id)
    AND 1 - (ct.embedding <=> query_embedding) > match_threshold
  ORDER BY ct.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create function to match user memories by embedding
CREATE OR REPLACE FUNCTION public.match_user_memories(
  query_embedding vector(768),
  target_user_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  memory_type text,
  content text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    um.id,
    um.memory_type,
    um.content,
    1 - (um.embedding <=> query_embedding) AS similarity
  FROM user_memories um
  WHERE um.embedding IS NOT NULL
    AND um.user_id = target_user_id
    AND 1 - (um.embedding <=> query_embedding) > match_threshold
  ORDER BY um.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;