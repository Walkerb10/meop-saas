-- Enable pg_cron and pg_net extensions for scheduled automation execution
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- Add metadata columns to knowledge_base for better second brain functionality
ALTER TABLE public.knowledge_base 
ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS importance_score INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS access_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS related_entries UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- Create index for faster semantic searches
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON public.knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_type ON public.knowledge_base(source_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_is_archived ON public.knowledge_base(is_archived);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_importance ON public.knowledge_base(importance_score DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON public.knowledge_base USING GIN(tags);

-- Add comment explaining the knowledge base structure
COMMENT ON TABLE public.knowledge_base IS 'Living second brain - stores all knowledge with embeddings for semantic search';
COMMENT ON COLUMN public.knowledge_base.source_type IS 'Origin: manual, conversation, research, upload, voice, auto_ingest';
COMMENT ON COLUMN public.knowledge_base.importance_score IS 'Priority 1-10, higher = more important for retrieval';
COMMENT ON COLUMN public.knowledge_base.access_count IS 'Number of times retrieved in RAG queries';
COMMENT ON COLUMN public.knowledge_base.tags IS 'Searchable tags for categorization';
COMMENT ON COLUMN public.knowledge_base.related_entries IS 'Links to related knowledge entries';
COMMENT ON COLUMN public.knowledge_base.expires_at IS 'Optional expiration for time-sensitive info';
COMMENT ON COLUMN public.knowledge_base.is_archived IS 'Soft delete - excluded from active searches';