-- Create n8n_tools table for persisting webhook tools
CREATE TABLE public.n8n_tools (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  webhook_url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.n8n_tools ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own n8n tools" 
ON public.n8n_tools 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own n8n tools" 
ON public.n8n_tools 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own n8n tools" 
ON public.n8n_tools 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own n8n tools" 
ON public.n8n_tools 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_n8n_tools_updated_at
BEFORE UPDATE ON public.n8n_tools
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();