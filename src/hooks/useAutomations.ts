import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScheduledAction, ScheduledActionStep } from '@/types/agent';
import { Json } from '@/integrations/supabase/types';

// Default webhook URLs for different automation types
// Each type has its own dedicated webhook
export const DEFAULT_WEBHOOKS = {
  text: 'https://walkerb.app.n8n.cloud/webhook/ca69f6f3-2405-45bc-9ad0-9ce78744fbe2',
  send_text: 'https://walkerb.app.n8n.cloud/webhook/ca69f6f3-2405-45bc-9ad0-9ce78744fbe2',
  slack: 'https://walkerb.app.n8n.cloud/webhook/067d7cbd-f49b-4641-aaab-6cb65617cb68',
  slack_message: 'https://walkerb.app.n8n.cloud/webhook/067d7cbd-f49b-4641-aaab-6cb65617cb68',
  discord: 'https://walkerb.app.n8n.cloud/webhook/de3262c9-cf10-4ba9-bf0f-87ba31a1144c',
  discord_message: 'https://walkerb.app.n8n.cloud/webhook/de3262c9-cf10-4ba9-bf0f-87ba31a1144c',
  email: 'https://walkerb.app.n8n.cloud/webhook/0bad5a52-1f17-4c90-9ca2-6d4aee1661f7',
  send_email: 'https://walkerb.app.n8n.cloud/webhook/0bad5a52-1f17-4c90-9ca2-6d4aee1661f7',
};

// Default channels for messaging platforms
export const DEFAULT_CHANNELS = {
  slack: 'all_bhva',
  discord: 'admin',
};

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
        n8nWebhookUrl: row.n8n_webhook_url || undefined,
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
    isActive?: boolean;
  }) => {
    try {
      const insertData = {
        name: automation.name,
        description: automation.description || null,
        trigger_type: automation.triggerType || 'manual',
        trigger_config: (automation.triggerConfig || {}) as Json,
        steps: (automation.steps || []) as unknown as Json,
        n8n_webhook_url: automation.n8nWebhookUrl || null,
        is_active: automation.isActive !== undefined ? automation.isActive : true,
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

      // Extract action config
      const steps = automation.steps as unknown as Array<{ type: string; config?: Record<string, unknown>; label?: string }>;
      const actionStep = steps?.find((s) => s.type === 'action');
      const actionConfig = (actionStep?.config || {}) as Record<string, unknown>;
      const actionType = actionConfig.action_type as string || 'send_text';

      // Create an execution record
      const { data: execution, error: execError } = await supabase
        .from('executions')
        .insert({
          sequence_name: automation.name,
          status: 'running',
          input_data: { automationId, actionType } as Json,
        })
        .select()
        .single();

      if (execError) throw execError;

      const startTime = Date.now();

      try {
        // Determine how to execute based on action type
        if (actionType === 'research') {
          // Research query comes from research_query field in config (set by vapi-webhook from research_topic)
          const query = (actionConfig.research_query as string) || (actionConfig.query as string) || (actionConfig.message as string) || automation.name;
          const outputFormat = (actionConfig.output_format as string) || 'detailed report';
          
          console.log(`🔬 Executing research with query: "${query}" format: "${outputFormat}"`);
          
          const { data, error } = await supabase.functions.invoke('webhook-research', {
            body: { 
              query, 
              output_format: outputFormat,
              execution_id: execution.id,
            }
          });

          if (error) throw error;

          // Update with result
          await supabase
            .from('executions')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - startTime,
              output_data: data as Json,
            })
            .eq('id', execution.id);

        } else {
          // For text, email, slack, discord - send to n8n webhook
          const webhookUrl = automation.n8n_webhook_url || DEFAULT_WEBHOOKS[actionType as keyof typeof DEFAULT_WEBHOOKS] || DEFAULT_WEBHOOKS.text;
          
          const message = (actionConfig.message as string) || automation.description || automation.name;
          
          // Build payload based on type
          const payload: Record<string, unknown> = {
            automation_name: automation.name,
            execution_id: execution.id,
            action_type: actionType,
            message: message,
          };

          // Add type-specific fields with defaults
          if (actionType === 'send_email') {
            payload.to = actionConfig.to;
            payload.subject = actionConfig.subject;
            payload.email_to = actionConfig.to;
            payload.email_subject = actionConfig.subject;
          } else if (actionType === 'slack_message') {
            const channel = (actionConfig.channel as string) || DEFAULT_CHANNELS.slack;
            payload.channel = channel;
            payload.slack_channel = channel;
          } else if (actionType === 'discord_message') {
            const channel = (actionConfig.discord_channel as string) || DEFAULT_CHANNELS.discord;
            payload.discord_channel = channel;
            payload.channel = channel;
          } else if (actionType === 'send_text') {
            payload.phone = actionConfig.phone;
          }

          console.log(`📤 Sending ${actionType} to webhook:`, webhookUrl);
          console.log('Payload:', JSON.stringify(payload, null, 2));

          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Webhook failed (${response.status}): ${errorText}`);
          }

          let responseData = null;
          try {
            responseData = await response.json();
          } catch {
            // Response may not be JSON
            responseData = { status: 'sent' };
          }

          // Update execution as completed
          await supabase
            .from('executions')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - startTime,
              output_data: responseData as Json,
            })
            .eq('id', execution.id);
        }

      } catch (execError) {
        console.error('Execution error:', execError);
        // Update execution as failed
        await supabase
          .from('executions')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: execError instanceof Error ? execError.message : 'Unknown error',
          })
          .eq('id', execution.id);
        throw execError;
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

  const updateAutomation = useCallback(async (automationId: string, updates: {
    name?: string;
    description?: string;
    triggerConfig?: Record<string, unknown>;
    steps?: ScheduledActionStep[];
    n8nWebhookUrl?: string;
    isActive?: boolean;
  }) => {
    try {
      const updateData: Record<string, unknown> = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.triggerConfig !== undefined) updateData.trigger_config = updates.triggerConfig as Json;
      if (updates.steps !== undefined) updateData.steps = updates.steps as unknown as Json;
      if (updates.n8nWebhookUrl !== undefined) updateData.n8n_webhook_url = updates.n8nWebhookUrl || null;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

      const { error: updateError } = await supabase
        .from('automations')
        .update(updateData)
        .eq('id', automationId);

      if (updateError) throw updateError;

      await fetchAutomations();
    } catch (err) {
      console.error('Failed to update automation:', err);
      throw err;
    }
  }, [fetchAutomations]);

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
    updateAutomation,
    executeAutomation,
    deleteAutomation,
    refetch: fetchAutomations,
  };
}