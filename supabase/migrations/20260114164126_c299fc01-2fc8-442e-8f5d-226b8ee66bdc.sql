-- Update team_tasks policies so any active team member can view + schedule tasks (including assigning to other members)

-- SELECT: allow team members to view all tasks (needed for shared Task Bank + cross-assignment)
DROP POLICY IF EXISTS "Users can view tasks assigned to them or created by them" ON public.team_tasks;
CREATE POLICY "Team members can view team tasks"
ON public.team_tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
  )
);

-- UPDATE: allow team members to update tasks (needed to schedule/assign tasks for others)
DROP POLICY IF EXISTS "Users can update their assigned tasks" ON public.team_tasks;
CREATE POLICY "Team members can update team tasks"
ON public.team_tasks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
  )
);

-- INSERT: keep existing rule (must set created_by to yourself) but also require active team membership
DROP POLICY IF EXISTS "Users can create tasks" ON public.team_tasks;
CREATE POLICY "Team members can create tasks"
ON public.team_tasks
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1
    FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.is_active = true
  )
);
