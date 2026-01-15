-- Create a table for calendar types
CREATE TABLE IF NOT EXISTS public.user_calendars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT 'blue',
  created_by UUID NOT NULL,
  is_default BOOLEAN DEFAULT false,
  calendar_type TEXT NOT NULL DEFAULT 'task', -- 'task' for One Thing style, 'content' for content calendar
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create a table for time-blocked events (for the 9-5 view)
CREATE TABLE IF NOT EXISTS public.calendar_time_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  assigned_to UUID,
  calendar_id UUID REFERENCES public.user_calendars(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_time_blocks ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_calendars
CREATE POLICY "Users can view all calendars" 
ON public.user_calendars 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create calendars" 
ON public.user_calendars 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own calendars" 
ON public.user_calendars 
FOR UPDATE 
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own calendars" 
ON public.user_calendars 
FOR DELETE 
USING (auth.uid() = created_by);

-- RLS policies for calendar_time_blocks
CREATE POLICY "Users can view all time blocks" 
ON public.calendar_time_blocks 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create time blocks" 
ON public.calendar_time_blocks 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update time blocks" 
ON public.calendar_time_blocks 
FOR UPDATE 
USING (auth.uid() = created_by OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete time blocks" 
ON public.calendar_time_blocks 
FOR DELETE 
USING (auth.uid() = created_by);

-- Add calendar_id to team_tasks for assigning tasks to specific calendars
ALTER TABLE public.team_tasks ADD COLUMN IF NOT EXISTS calendar_id UUID REFERENCES public.user_calendars(id) ON DELETE SET NULL;