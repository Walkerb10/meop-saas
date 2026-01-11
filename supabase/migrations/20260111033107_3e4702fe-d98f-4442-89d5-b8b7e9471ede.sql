-- Add conversation_id column to automations table to link automations to conversations
ALTER TABLE public.automations 
ADD COLUMN conversation_id TEXT;

-- Create index for faster lookups
CREATE INDEX idx_automations_conversation_id ON public.automations(conversation_id);