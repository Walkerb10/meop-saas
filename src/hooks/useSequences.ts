import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sequence } from '@/types/sequence';

export function useSequences() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from database on mount
  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    try {
      const { data, error } = await supabase
        .from('sequences')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSequences(
        (data || []).map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description || '',
          n8nWebhookUrl: s.webhook_url || undefined,
          steps: [],
          createdAt: new Date(s.created_at),
          updatedAt: new Date(s.updated_at),
        }))
      );
    } catch (error) {
      console.error('Failed to fetch sequences:', error);
    } finally {
      setLoading(false);
    }
  };

  const addSequence = useCallback(async (sequence: Omit<Sequence, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const { data, error } = await supabase
        .from('sequences')
        .insert({
          name: sequence.name,
          description: sequence.description || null,
          webhook_url: sequence.n8nWebhookUrl || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newSequence: Sequence = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        n8nWebhookUrl: data.webhook_url || undefined,
        steps: [],
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      setSequences((prev) => [newSequence, ...prev]);
      return newSequence;
    } catch (error) {
      console.error('Failed to add sequence:', error);
      throw error;
    }
  }, []);

  const updateSequence = useCallback(async (id: string, updates: Partial<Sequence>) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.n8nWebhookUrl !== undefined) updateData.webhook_url = updates.n8nWebhookUrl;

      const { error } = await supabase
        .from('sequences')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setSequences((prev) =>
        prev.map((s) =>
          s.id === id
            ? { ...s, ...updates, updatedAt: new Date() }
            : s
        )
      );
    } catch (error) {
      console.error('Failed to update sequence:', error);
      throw error;
    }
  }, []);

  const deleteSequence = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('sequences')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setSequences((prev) => prev.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to delete sequence:', error);
      throw error;
    }
  }, []);

  return {
    sequences,
    loading,
    addSequence,
    updateSequence,
    deleteSequence,
    refetch: fetchSequences,
  };
}
