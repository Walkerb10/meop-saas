-- Update walkerbauknight125@gmail.com to owner role
UPDATE public.user_roles 
SET role = 'owner' 
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'walkerbauknight125@gmail.com'
);

-- Add feature permission for owner to see training
INSERT INTO public.feature_permissions (role, feature_key, can_access)
VALUES 
  ('owner', 'ai_training', true),
  ('owner', 'webhooks', true),
  ('owner', 'admin_dashboard', true),
  ('owner', 'voice_agent', true),
  ('owner', 'automations', true),
  ('admin', 'ai_training', false)
ON CONFLICT DO NOTHING;