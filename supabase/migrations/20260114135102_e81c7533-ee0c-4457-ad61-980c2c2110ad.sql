-- Add estimated duration field to team_tasks (in minutes)
ALTER TABLE public.team_tasks 
ADD COLUMN estimated_minutes integer DEFAULT NULL;