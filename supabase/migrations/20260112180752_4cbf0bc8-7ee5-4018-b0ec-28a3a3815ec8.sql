-- Add user_id and topic columns to feedback_items
ALTER TABLE public.feedback_items 
ADD COLUMN user_id uuid REFERENCES auth.users(id),
ADD COLUMN topic text DEFAULT 'general';

-- Drop the old permissive policy
DROP POLICY IF EXISTS "Allow all access to feedback_items" ON public.feedback_items;

-- Create proper RLS policies
-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
ON public.feedback_items
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback_items
FOR SELECT
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Users can update their own feedback
CREATE POLICY "Users can update their own feedback"
ON public.feedback_items
FOR UPDATE
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Users can delete their own feedback
CREATE POLICY "Users can delete their own feedback"
ON public.feedback_items
FOR DELETE
USING (user_id = auth.uid() OR is_admin(auth.uid()));