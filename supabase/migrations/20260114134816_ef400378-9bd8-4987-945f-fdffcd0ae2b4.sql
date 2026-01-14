-- Allow authenticated users to create tasks
CREATE POLICY "Users can create tasks" 
ON public.team_tasks 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);