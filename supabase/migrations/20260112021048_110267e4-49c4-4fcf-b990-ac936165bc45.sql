-- Create feedback_items table for feature requests
CREATE TABLE public.feedback_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feedback_items ENABLE ROW LEVEL SECURITY;

-- Allow all access (admin-only app)
CREATE POLICY "Allow all access to feedback_items"
ON public.feedback_items
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_feedback_items_updated_at
BEFORE UPDATE ON public.feedback_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();