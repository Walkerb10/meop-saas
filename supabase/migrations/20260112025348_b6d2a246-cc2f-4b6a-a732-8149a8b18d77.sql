-- Create knowledge base for training data and platform info
CREATE TABLE public.knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN NOT NULL DEFAULT true,
  allowed_roles app_role[] DEFAULT ARRAY['admin', 'manager', 'member', 'viewer']::app_role[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat messages with full attribution
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tool_calls JSONB DEFAULT '[]',
  context_used JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add user_id to conversation_transcripts for attribution
ALTER TABLE public.conversation_transcripts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create chat permission settings
CREATE TABLE public.chat_data_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  can_view_all_conversations BOOLEAN DEFAULT false,
  can_view_all_automations BOOLEAN DEFAULT false,
  can_view_all_executions BOOLEAN DEFAULT false,
  can_view_knowledge_base BOOLEAN DEFAULT true,
  can_add_knowledge BOOLEAN DEFAULT false,
  can_view_team_activity BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_data_permissions ENABLE ROW LEVEL SECURITY;

-- Knowledge base policies
CREATE POLICY "Users can view public knowledge or matching role"
  ON public.knowledge_base FOR SELECT
  USING (
    is_public = true 
    OR created_by = auth.uid()
    OR is_admin(auth.uid())
    OR get_user_role(auth.uid()) = ANY(allowed_roles)
  );

CREATE POLICY "Admins can manage knowledge base"
  ON public.knowledge_base FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users with permission can add knowledge"
  ON public.knowledge_base FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      is_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.chat_data_permissions
        WHERE role = get_user_role(auth.uid())
        AND can_add_knowledge = true
      )
    )
  );

-- Chat sessions policies
CREATE POLICY "Users can view their own sessions"
  ON public.chat_sessions FOR SELECT
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users can create their own sessions"
  ON public.chat_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own sessions"
  ON public.chat_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own sessions"
  ON public.chat_sessions FOR DELETE
  USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- Chat messages policies
CREATE POLICY "Users can view messages from their sessions"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id
      AND (user_id = auth.uid() OR is_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can insert messages to their sessions"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

-- Chat data permissions policies
CREATE POLICY "Anyone can view chat permissions"
  ON public.chat_data_permissions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage chat permissions"
  ON public.chat_data_permissions FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Insert default permissions
INSERT INTO public.chat_data_permissions (role, can_view_all_conversations, can_view_all_automations, can_view_all_executions, can_view_knowledge_base, can_add_knowledge, can_view_team_activity) VALUES
  ('admin', true, true, true, true, true, true),
  ('manager', true, true, true, true, true, true),
  ('member', false, false, false, true, false, false),
  ('viewer', false, false, false, true, false, false);

-- Triggers for updated_at
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();