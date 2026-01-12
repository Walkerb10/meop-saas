-- Rename 'viewer' to 'tester' in the app_role enum
ALTER TYPE public.app_role RENAME VALUE 'viewer' TO 'tester';

-- Add Griffin as a tester
INSERT INTO public.user_roles (user_id, role)
VALUES ('dcae3faa-2981-4045-bc30-3cdce7319397', 'tester')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add Griffin to team_members if not already there
INSERT INTO public.team_members (user_id, email, display_name, is_active)
VALUES ('dcae3faa-2981-4045-bc30-3cdce7319397', 'griffinbohmfalk@gmail.com', 'Griffin Bohmfalk', true)
ON CONFLICT (user_id) DO NOTHING;

-- Update feature permissions: allow testers to create automations
-- First remove any existing tester/viewer permissions for automations
DELETE FROM public.feature_permissions WHERE role = 'tester' AND feature_key = 'automations';

-- Add permission for testers to access automations
INSERT INTO public.feature_permissions (role, feature_key, can_access)
VALUES ('tester', 'automations', true)
ON CONFLICT DO NOTHING;