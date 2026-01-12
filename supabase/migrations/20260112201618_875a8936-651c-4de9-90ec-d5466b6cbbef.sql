-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add owner to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'owner' BEFORE 'admin';

-- Add embedding column to knowledge_base
ALTER TABLE public.knowledge_base 
ADD COLUMN IF NOT EXISTS embedding vector(768),
ADD COLUMN IF NOT EXISTS file_url text,
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS chunk_index integer DEFAULT 0;

-- Add created_by to automations table
ALTER TABLE public.automations 
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create function for semantic search
CREATE OR REPLACE FUNCTION match_knowledge_entries(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    kb.id,
    kb.title,
    kb.content,
    kb.category,
    1 - (kb.embedding <=> query_embedding) as similarity
  FROM knowledge_base kb
  WHERE kb.embedding IS NOT NULL
    AND 1 - (kb.embedding <=> query_embedding) > match_threshold
  ORDER BY kb.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;