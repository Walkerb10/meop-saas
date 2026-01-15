-- Allow active team members to delete team tasks (matches existing update policy semantics)
CREATE POLICY "Team members can delete team tasks"
ON public.team_tasks
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
  )
);
