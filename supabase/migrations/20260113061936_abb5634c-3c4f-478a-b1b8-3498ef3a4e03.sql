-- Create prompt analytics table to track user prompting quality
CREATE TABLE public.prompt_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  analysis_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  analysis_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  total_prompts INTEGER DEFAULT 0,
  avg_clarity_score NUMERIC(3,2) DEFAULT 0,
  avg_specificity_score NUMERIC(3,2) DEFAULT 0,
  avg_context_score NUMERIC(3,2) DEFAULT 0,
  avg_effectiveness_score NUMERIC(3,2) DEFAULT 0,
  overall_score NUMERIC(3,2) DEFAULT 0,
  strengths TEXT[] DEFAULT '{}',
  improvement_areas TEXT[] DEFAULT '{}',
  recommendations TEXT,
  sample_prompts JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_analytics ENABLE ROW LEVEL SECURITY;

-- Users can only view their own analytics
CREATE POLICY "Users can view their own prompt analytics"
ON public.prompt_analytics
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert analytics for any user
CREATE POLICY "System can insert prompt analytics"
ON public.prompt_analytics
FOR INSERT
WITH CHECK (true);

-- Add index for faster lookups
CREATE INDEX idx_prompt_analytics_user_period ON public.prompt_analytics (user_id, analysis_period_start DESC);

-- Create prompt tracking table for individual prompts
CREATE TABLE public.prompt_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prompt_text TEXT NOT NULL,
  prompt_type TEXT DEFAULT 'chat',
  clarity_score NUMERIC(3,2),
  specificity_score NUMERIC(3,2),
  context_score NUMERIC(3,2),
  effectiveness_score NUMERIC(3,2),
  feedback TEXT,
  session_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prompt_tracking ENABLE ROW LEVEL SECURITY;

-- Users can view their own prompts
CREATE POLICY "Users can view their own prompts"
ON public.prompt_tracking
FOR SELECT
USING (auth.uid() = user_id);

-- System can insert prompts
CREATE POLICY "System can insert prompts"
ON public.prompt_tracking
FOR INSERT
WITH CHECK (true);

-- Add index for user lookups
CREATE INDEX idx_prompt_tracking_user ON public.prompt_tracking (user_id, created_at DESC);

-- Enable realtime for prompt_analytics
ALTER PUBLICATION supabase_realtime ADD TABLE public.prompt_analytics;