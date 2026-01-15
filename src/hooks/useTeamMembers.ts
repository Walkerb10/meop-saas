import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { AppRole } from './useUserRole';

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  slack_user_id: string | null;
  is_active: boolean;
  created_at: string;
  role?: AppRole;
}

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMembers = useCallback(async () => {
    try {
      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (membersError) throw membersError;

      // Fetch roles for each member
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine data
      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role as AppRole]));
      const membersWithRoles = membersData?.map(m => ({
        ...m,
        role: rolesMap.get(m.user_id),
      })) || [];

      setMembers(membersWithRoles);
    } catch (err) {
      console.error('Failed to fetch team members:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load team members',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const updateMemberRole = async (userId: string, newRole: AppRole) => {
    try {
      // First check if user already has a role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      let error;
      if (existingRole) {
        // Update existing role
        const result = await supabase
          .from('user_roles')
          .update({ role: newRole })
          .eq('user_id', userId);
        error = result.error;
      } else {
        // Insert new role
        const result = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: 'Role updated',
        description: 'Team member role has been updated.',
      });
      
      fetchMembers();
    } catch (err) {
      console.error('Failed to update role:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update member role',
      });
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('team_members')
        .update({ is_active: false })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Member removed',
        description: 'Team member has been deactivated.',
      });
      
      fetchMembers();
    } catch (err) {
      console.error('Failed to remove member:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove team member',
      });
    }
  };

  return {
    members,
    loading,
    fetchMembers,
    updateMemberRole,
    removeMember,
  };
}
