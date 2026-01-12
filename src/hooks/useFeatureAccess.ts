import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole, AppRole } from './useUserRole';

export type FeatureKey = 
  | 'admin_dashboard' 
  | 'user_management' 
  | 'calendar' 
  | 'task_assignment'
  | 'voice_agent'
  | 'sequences'
  | 'executions'
  | 'feedback';

interface FeatureAccessData {
  canAccess: (feature: FeatureKey) => boolean;
  loading: boolean;
}

export function useFeatureAccess(): FeatureAccessData {
  const { role, loading: roleLoading } = useUserRole();
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      if (!role) {
        setPermissions({});
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('feature_permissions')
          .select('feature_key, can_access')
          .eq('role', role);

        if (error) {
          console.error('Error fetching permissions:', error);
          setPermissions({});
        } else {
          const perms: Record<string, boolean> = {};
          data?.forEach(p => {
            perms[p.feature_key] = p.can_access;
          });
          setPermissions(perms);
        }
      } catch (err) {
        console.error('Failed to fetch permissions:', err);
        setPermissions({});
      } finally {
        setLoading(false);
      }
    };

    if (!roleLoading) {
      fetchPermissions();
    }
  }, [role, roleLoading]);

  const canAccess = (feature: FeatureKey): boolean => {
    return permissions[feature] ?? false;
  };

  return {
    canAccess,
    loading: loading || roleLoading,
  };
}
