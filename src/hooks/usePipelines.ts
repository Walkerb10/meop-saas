import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Pipeline {
  id: string;
  name: string;
  description: string | null;
  type: 'sales' | 'follow_up' | 'custom';
  stages: PipelineStage[];
  created_by: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SALES_STAGES: PipelineStage[] = [
  { id: 'new', name: 'New', color: 'blue', order: 0 },
  { id: 'contacted', name: 'Contacted', color: 'purple', order: 1 },
  { id: 'qualified', name: 'Qualified', color: 'yellow', order: 2 },
  { id: 'proposal', name: 'Proposal', color: 'orange', order: 3 },
  { id: 'negotiation', name: 'Negotiation', color: 'pink', order: 4 },
  { id: 'won', name: 'Won', color: 'green', order: 5 },
  { id: 'lost', name: 'Lost', color: 'red', order: 6 },
];

export function usePipelines() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchPipelines = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pipelines')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const typedPipelines = (data || []).map(p => ({
        ...p,
        type: p.type as Pipeline['type'],
        stages: (p.stages as unknown as PipelineStage[]) || [],
      }));

      setPipelines(typedPipelines);
    } catch (err) {
      console.error('Failed to fetch pipelines:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const createPipeline = async (pipeline: {
    name: string;
    description?: string;
    type?: 'sales' | 'follow_up' | 'custom';
    stages?: PipelineStage[];
    is_default?: boolean;
  }) => {
    if (!user) return null;

    try {
      const stages = pipeline.stages || (pipeline.type === 'sales' ? DEFAULT_SALES_STAGES : [
        { id: 'stage_1', name: 'Stage 1', color: 'blue', order: 0 },
        { id: 'stage_2', name: 'Stage 2', color: 'green', order: 1 },
      ]);

      const { data, error } = await supabase
        .from('pipelines')
        .insert([{
          name: pipeline.name,
          description: pipeline.description || null,
          type: pipeline.type || 'custom',
          stages: JSON.parse(JSON.stringify(stages)),
          created_by: user.id,
          is_default: pipeline.is_default || false,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Pipeline created',
        description: `"${pipeline.name}" has been created.`,
      });

      fetchPipelines();
      return data;
    } catch (err) {
      console.error('Failed to create pipeline:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create pipeline',
      });
      return null;
    }
  };

  const updatePipeline = async (id: string, updates: Partial<Pipeline>) => {
    try {
      const updateData: Record<string, unknown> = { ...updates };
      if (updates.stages) {
        updateData.stages = JSON.parse(JSON.stringify(updates.stages));
      }

      const { error } = await supabase
        .from('pipelines')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Pipeline updated',
      });

      fetchPipelines();
    } catch (err) {
      console.error('Failed to update pipeline:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update pipeline',
      });
    }
  };

  const deletePipeline = async (id: string) => {
    try {
      const { error } = await supabase
        .from('pipelines')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Pipeline deleted',
      });

      fetchPipelines();
    } catch (err) {
      console.error('Failed to delete pipeline:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete pipeline',
      });
    }
  };

  const getSalesPipeline = () => {
    return pipelines.find(p => p.type === 'sales' && p.is_default) || pipelines.find(p => p.type === 'sales');
  };

  return {
    pipelines,
    loading,
    createPipeline,
    updatePipeline,
    deletePipeline,
    getSalesPipeline,
    refetch: fetchPipelines,
    DEFAULT_SALES_STAGES,
  };
}
