-- Create executions table for tracking n8n workflow runs
CREATE TABLE public.executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_name TEXT NOT NULL,
  workflow_id TEXT,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'pending_review')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  requires_human_review BOOLEAN DEFAULT false,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access for webhook updates
ALTER TABLE public.executions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read executions (for the UI)
CREATE POLICY "Anyone can view executions" 
ON public.executions 
FOR SELECT 
USING (true);

-- Allow inserts from edge functions (service role)
CREATE POLICY "Service role can insert executions" 
ON public.executions 
FOR INSERT 
WITH CHECK (true);

-- Allow updates from edge functions (service role)
CREATE POLICY "Service role can update executions" 
ON public.executions 
FOR UPDATE 
USING (true);

-- Index for faster queries
CREATE INDEX idx_executions_status ON public.executions(status);
CREATE INDEX idx_executions_started_at ON public.executions(started_at DESC);