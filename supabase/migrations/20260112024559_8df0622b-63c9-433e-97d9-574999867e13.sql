-- Create role enum with tiers
CREATE TYPE public.app_role AS ENUM ('admin', 'manager', 'member', 'viewer');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create team_members table for user profiles with additional info
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  slack_user_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create team_tasks table for assignable tasks
CREATE TABLE public.team_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create calendar_events table for admin calendar
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  all_day BOOLEAN DEFAULT false,
  color TEXT DEFAULT 'primary',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create feature_permissions table for granular feature access
CREATE TABLE public.feature_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  feature_key TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role, feature_key)
);

-- Create invitations table for invite flow
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'member',
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Function to get user's role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for team_members
CREATE POLICY "All authenticated users can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for team_tasks
CREATE POLICY "Users can view tasks assigned to them or created by them"
ON public.team_tasks
FOR SELECT
TO authenticated
USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all tasks"
ON public.team_tasks
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can update their assigned tasks"
ON public.team_tasks
FOR UPDATE
TO authenticated
USING (assigned_to = auth.uid());

-- RLS Policies for calendar_events
CREATE POLICY "Admins can manage calendar events"
ON public.calendar_events
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Users can view events assigned to them"
ON public.calendar_events
FOR SELECT
TO authenticated
USING (assigned_to = auth.uid() OR public.is_admin(auth.uid()));

-- RLS Policies for feature_permissions
CREATE POLICY "Anyone can read feature permissions"
ON public.feature_permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage feature permissions"
ON public.feature_permissions
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- RLS Policies for invitations
CREATE POLICY "Admins can manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Trigger for updated_at on team_members
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on team_tasks
CREATE TRIGGER update_team_tasks_updated_at
BEFORE UPDATE ON public.team_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on calendar_events
CREATE TRIGGER update_calendar_events_updated_at
BEFORE UPDATE ON public.calendar_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default feature permissions for all roles
INSERT INTO public.feature_permissions (role, feature_key, can_access) VALUES
  ('admin', 'admin_dashboard', true),
  ('admin', 'user_management', true),
  ('admin', 'calendar', true),
  ('admin', 'task_assignment', true),
  ('admin', 'voice_agent', true),
  ('admin', 'sequences', true),
  ('admin', 'executions', true),
  ('admin', 'feedback', true),
  ('manager', 'admin_dashboard', false),
  ('manager', 'user_management', false),
  ('manager', 'calendar', true),
  ('manager', 'task_assignment', true),
  ('manager', 'voice_agent', true),
  ('manager', 'sequences', true),
  ('manager', 'executions', true),
  ('manager', 'feedback', true),
  ('member', 'admin_dashboard', false),
  ('member', 'user_management', false),
  ('member', 'calendar', false),
  ('member', 'task_assignment', false),
  ('member', 'voice_agent', true),
  ('member', 'sequences', true),
  ('member', 'executions', true),
  ('member', 'feedback', true),
  ('viewer', 'admin_dashboard', false),
  ('viewer', 'user_management', false),
  ('viewer', 'calendar', false),
  ('viewer', 'task_assignment', false),
  ('viewer', 'voice_agent', false),
  ('viewer', 'sequences', false),
  ('viewer', 'executions', true),
  ('viewer', 'feedback', false);