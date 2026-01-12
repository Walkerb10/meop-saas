-- Add steps column to sequences for multi-step workflows
ALTER TABLE public.sequences 
ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS trigger_type text NOT NULL DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS trigger_config jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS last_run_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create sequence_executions table to track runs
CREATE TABLE IF NOT EXISTS public.sequence_executions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sequence_id uuid NOT NULL REFERENCES public.sequences(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  current_step integer DEFAULT 0,
  step_results jsonb DEFAULT '[]'::jsonb,
  error_message text,
  input_data jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on sequence_executions
ALTER TABLE public.sequence_executions ENABLE ROW LEVEL SECURITY;

-- Allow all access to sequence_executions (same as sequences)
CREATE POLICY "Allow all access to sequence_executions"
ON public.sequence_executions
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for sequence_executions
ALTER PUBLICATION supabase_realtime ADD TABLE public.sequence_executions;