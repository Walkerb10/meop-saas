-- Add new fields to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS linkedin text,
ADD COLUMN IF NOT EXISTS company text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS role text;

-- Create an enum-like constraint for common roles (stored as text for flexibility)
COMMENT ON COLUMN public.contacts.role IS 'Contact role: CEO, CTO, Founder, Manager, Developer, Designer, Marketing, Sales, HR, Other';