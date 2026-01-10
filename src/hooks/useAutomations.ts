import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScheduledAction, ScheduledActionStep } from '@/types/agent';
import { Json } from '@/integrations/supabase/types';

export function useAutomations() {
  const [automations, setAutomations] = useState<ScheduledAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAutomations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('automations')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const mapped: ScheduledAction[] = (data || []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description || undefined,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        steps: Array.isArray(row.steps) ? (row.steps as unknown as ScheduledActionStep[]) : [],
      }));

      setAutomations(mapped);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch automations:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch automations');
    } finally {
      setLoading(false);
    }
  }, []);

  const createAutomation = useCallback(async (automation: {
    name: string;
    description?: string;
    triggerType?: string;
    triggerConfig?: Record<string, unknown>;
    steps?: ScheduledActionStep[];
    n8nWebhookUrl?: string;
  }) => {
    try {
      const insertData = {
        name: automation.name,
        description: automation.description || null,
        trigger_type: automation.triggerType || 'manual',
        trigger_config: (automation.triggerConfig || {}) as Json,
        steps: (automation.steps || []) as unknown as Json,
        n8n_webhook_url: automation.n8nWebhookUrl || null,
      };
      
      const { data, error: insertError } = await supabase
        .from('automations')
        .insert(insertData)
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchAutomations();
      return data;
    } catch (err) {
      console.error('Failed to create automation:', err);
      throw err;
    }
  }, [fetchAutomations]);

  const executeAutomation = useCallback(async (automationId: string) => {
    try {
      // Get the automation
      const { data: automation, error: fetchError } = await supabase
        .from('automations')
        .select('*')
        .eq('id', automationId)
        .single();

      if (fetchError) throw fetchError;
      if (!automation) throw new Error('Automation not found');

      // Create an execution record
      const { data: execution, error: execError } = await supabase
        .from('executions')
        .insert({
          sequence_name: automation.name,
          status: 'running',
          input_data: { automationId } as Json,
        })
        .select()
        .single();

      if (execError) throw execError;

      // If there's an n8n webhook, call it
      if (automation.n8n_webhook_url) {
        try {
          const response = await fetch(automation.n8n_webhook_url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              automationId: automation.id,
              automationName: automation.name,
              steps: automation.steps,
              executionId: execution.id,
            }),
          });

          if (!response.ok) {
            throw new Error(`Webhook failed: ${response.status}`);
          }

          // Update execution as completed
          await supabase
            .from('executions')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - new Date(execution.started_at).getTime(),
            })
            .eq('id', execution.id);

        } catch (webhookError) {
          // Update execution as failed
          await supabase
            .from('executions')
            .update({
              status: 'failed',
              completed_at: new Date().toISOString(),
              error_message: webhookError instanceof Error ? webhookError.message : 'Unknown error',
            })
            .eq('id', execution.id);
          throw webhookError;
        }
      } else {
        // No webhook, just mark as completed
        await supabase
          .from('executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_ms: 0,
          })
          .eq('id', execution.id);
      }

      // Update last_run_at
      await supabase
        .from('automations')
        .update({ last_run_at: new Date().toISOString() })
        .eq('id', automationId);

      return execution;
    } catch (err) {
      console.error('Failed to execute automation:', err);
      throw err;
    }
  }, []);

  const deleteAutomation = useCallback(async (automationId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('automations')
        .delete()
        .eq('id', automationId);

      if (deleteError) throw deleteError;

      await fetchAutomations();
    } catch (err) {
      console.error('Failed to delete automation:', err);
      throw err;
    }
  }, [fetchAutomations]);

  // Subscribe to realtime changes
  useEffect(() => {
    fetchAutomations();

    const channel = supabase
      .channel('automations-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'automations' },
        () => {
          fetchAutomations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAutomations]);

  return {
    automations,
    loading,
    error,
    createAutomation,
    executeAutomation,
    deleteAutomation,
    refetch: fetchAutomations,
  };
}
