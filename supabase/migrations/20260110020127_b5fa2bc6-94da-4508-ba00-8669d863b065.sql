-- Create table for storing conversation transcripts
CREATE TABLE public.conversation_transcripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  conversation_id TEXT,
  raw_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public insert (webhook needs to write without auth)
ALTER TABLE public.conversation_transcripts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (webhook calls)
CREATE POLICY "Allow public insert" ON public.conversation_transcripts
  FOR INSERT WITH CHECK (true);

-- Allow anyone to read (for now)
CREATE POLICY "Allow public read" ON public.conversation_transcripts
  FOR SELECT USING (true);