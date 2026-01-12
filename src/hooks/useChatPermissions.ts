import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatDataPermission {
  id: string;
  role: 'admin' | 'manager' | 'member' | 'viewer';
  can_view_all_conversations: boolean;
  can_view_all_automations: boolean;
  can_view_all_executions: boolean;
  can_view_knowledge_base: boolean;
  can_add_knowledge: boolean;
  can_view_team_activity: boolean;
}

export function useChatPermissions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['chat-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('chat_data_permissions')
        .select('*')
        .order('role');

      if (error) throw error;
      return data as ChatDataPermission[];
    },
  });

  const updatePermission = useMutation({
    mutationFn: async ({ 
      role, 
      ...updates 
    }: Partial<ChatDataPermission> & { role: string }) => {
      const { data, error } = await supabase
        .from('chat_data_permissions')
        .update(updates)
        .eq('role', role)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-permissions'] });
      toast({ title: 'Permission updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating permission',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    permissions,
    isLoading,
    updatePermission,
  };
}
