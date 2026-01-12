import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type AppRole = 'admin' | 'manager' | 'member' | 'viewer';

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  is_public: boolean;
  allowed_roles: AppRole[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useKnowledgeBase() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['knowledge-base'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as KnowledgeEntry[];
    },
  });

  const addEntry = useMutation({
    mutationFn: async (entry: {
      title: string;
      content: string;
      category: string;
      is_public?: boolean;
      allowed_roles?: AppRole[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('knowledge_base')
        .insert({
          title: entry.title,
          content: entry.content,
          category: entry.category,
          is_public: entry.is_public ?? true,
          allowed_roles: entry.allowed_roles || ['admin', 'manager', 'member', 'viewer'],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast({ title: 'Knowledge entry added' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error adding entry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateEntry = useMutation({
    mutationFn: async ({ id, ...updates }: { 
      id: string;
      title?: string;
      content?: string;
      category?: string;
      is_public?: boolean;
      allowed_roles?: AppRole[];
    }) => {
      const { data, error } = await supabase
        .from('knowledge_base')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast({ title: 'Knowledge entry updated' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating entry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('knowledge_base')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledge-base'] });
      toast({ title: 'Knowledge entry deleted' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error deleting entry',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    entries,
    isLoading,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}
