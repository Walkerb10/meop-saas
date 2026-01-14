-- Add is_pinned column to team_tasks for pinned tasks that stay on their day
ALTER TABLE public.team_tasks 
ADD COLUMN is_pinned BOOLEAN DEFAULT false;

-- Create pipelines table for custom pipelines
CREATE TABLE public.pipelines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'custom', -- 'sales', 'follow_up', 'custom'
  stages JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of {id, name, color, order}
  created_by UUID NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on pipelines
ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

-- Create policies for pipelines
CREATE POLICY "Users can view all pipelines" 
ON public.pipelines 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create pipelines" 
ON public.pipelines 
FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own pipelines" 
ON public.pipelines 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own pipelines" 
ON public.pipelines 
FOR DELETE 
USING (auth.uid() = created_by);

-- Add pipeline_id to crm_leads to support multiple pipelines
ALTER TABLE public.crm_leads 
ADD COLUMN pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL;

-- Add pipeline_id to contacts for contact pipelines
ALTER TABLE public.contacts 
ADD COLUMN pipeline_id UUID REFERENCES public.pipelines(id) ON DELETE SET NULL,
ADD COLUMN pipeline_stage TEXT,
ADD COLUMN pipeline_position INTEGER DEFAULT 0;

-- Create trigger for pipeline timestamps
CREATE TRIGGER update_pipelines_updated_at
BEFORE UPDATE ON public.pipelines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();