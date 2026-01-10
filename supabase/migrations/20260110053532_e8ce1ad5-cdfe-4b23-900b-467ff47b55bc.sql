-- Create sequences table for custom webhooks
CREATE TABLE public.sequences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sequences ENABLE ROW LEVEL SECURITY;

-- Allow all operations (public app)
CREATE POLICY "Allow all access to sequences" 
ON public.sequences 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add update trigger
CREATE TRIGGER update_sequences_updated_at
BEFORE UPDATE ON public.sequences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();