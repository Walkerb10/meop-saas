import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sequence, SequenceStep, SequenceExecution } from '@/types/sequence';
import { Json } from '@/integrations/supabase/types';

export function useSequences() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSequences();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('sequences-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sequences' }, () => {
        fetchSequences();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
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
          steps: (s.steps as unknown as SequenceStep[]) || [],
          triggerType: (s.trigger_type as Sequence['triggerType']) || 'manual',
          triggerConfig: s.trigger_config as Sequence['triggerConfig'],
          isActive: s.is_active ?? true,
          lastRunAt: s.last_run_at ? new Date(s.last_run_at) : undefined,
          createdBy: s.created_by || undefined,
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
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('sequences')
        .insert({
          name: sequence.name,
          description: sequence.description || null,
          steps: sequence.steps as unknown as Json,
          trigger_type: sequence.triggerType,
          trigger_config: sequence.triggerConfig as unknown as Json,
          is_active: sequence.isActive,
          created_by: userData?.user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;

      const newSequence: Sequence = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        steps: (data.steps as unknown as SequenceStep[]) || [],
        triggerType: (data.trigger_type as Sequence['triggerType']) || 'manual',
        triggerConfig: data.trigger_config as Sequence['triggerConfig'],
        isActive: data.is_active ?? true,
        lastRunAt: data.last_run_at ? new Date(data.last_run_at) : undefined,
        createdBy: data.created_by || undefined,
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
      if (updates.steps !== undefined) updateData.steps = updates.steps as unknown as Json;
      if (updates.triggerType !== undefined) updateData.trigger_type = updates.triggerType;
      if (updates.triggerConfig !== undefined) updateData.trigger_config = updates.triggerConfig as unknown as Json;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

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

  const executeSequence = useCallback(async (id: string, inputData?: Record<string, unknown>) => {
    try {
      const { data, error } = await supabase.functions.invoke('execute-sequence', {
        body: { sequenceId: id, inputData },
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to execute sequence:', error);
      throw error;
    }
  }, []);

  return {
    sequences,
    loading,
    addSequence,
    updateSequence,
    deleteSequence,
    executeSequence,
    refetch: fetchSequences,
  };
}

export function useSequenceExecutions(sequenceId?: string) {
  const [executions, setExecutions] = useState<SequenceExecution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sequenceId) {
      setLoading(false);
      return;
    }
    
    fetchExecutions();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel(`sequence-executions-${sequenceId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'sequence_executions',
        filter: `sequence_id=eq.${sequenceId}`
      }, () => {
        fetchExecutions();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sequenceId]);

  const fetchExecutions = async () => {
    if (!sequenceId) return;
    
    try {
      const { data, error } = await supabase
        .from('sequence_executions')
        .select('*')
        .eq('sequence_id', sequenceId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setExecutions(
        (data || []).map((e) => ({
          id: e.id,
          sequenceId: e.sequence_id,
          status: e.status as SequenceExecution['status'],
          startedAt: new Date(e.started_at),
          completedAt: e.completed_at ? new Date(e.completed_at) : undefined,
          currentStep: e.current_step ?? 0,
          stepResults: (e.step_results as unknown as SequenceExecution['stepResults']) || [],
          errorMessage: e.error_message || undefined,
          inputData: e.input_data as Record<string, unknown>,
        }))
      );
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    } finally {
      setLoading(false);
    }
  };

  return { executions, loading, refetch: fetchExecutions };
}
