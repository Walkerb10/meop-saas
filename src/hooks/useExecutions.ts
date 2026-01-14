import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { addHours, setHours, setMinutes, isAfter, isBefore, addDays, addWeeks, addMonths } from 'date-fns';

export interface ExecutionItem {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'pending';
  time: Date;
  type: 'recent' | 'upcoming';
  workflowId?: string;
  output?: unknown;
}

interface AutomationRow {
  id: string;
  name: string;
  is_active: boolean;
  trigger_config: {
    time?: string;
    frequency?: string;
  } | null;
  trigger_type: string;
}

interface ExecutionRow {
  id: string;
  sequence_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  workflow_id: string | null;
  output_data: unknown;
}

function getNextRunTime(automation: AutomationRow): Date | null {
  if (!automation.is_active || automation.trigger_type !== 'scheduled') {
    return null;
  }

  const config = automation.trigger_config;
  if (!config?.time) return null;

  const [hours, minutes] = config.time.split(':').map(Number);
  const now = new Date();
  
  let nextRun = new Date();
  nextRun = setHours(nextRun, hours);
  nextRun = setMinutes(nextRun, minutes);
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);

  if (isBefore(nextRun, now)) {
    switch (config.frequency) {
      case 'daily':
        nextRun = addDays(nextRun, 1);
        break;
      case 'weekly':
        nextRun = addWeeks(nextRun, 1);
        break;
      case 'monthly':
        nextRun = addMonths(nextRun, 1);
        break;
      default:
        nextRun = addDays(nextRun, 1);
    }
  }

  return nextRun;
}

export function useExecutions() {
  const [recentExecutions, setRecentExecutions] = useState<ExecutionItem[]>([]);
  const [upcomingExecutions, setUpcomingExecutions] = useState<ExecutionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExecutions = useCallback(async () => {
    const now = new Date();
    const next24Hours = addHours(now, 24);

    // Fetch 5 most recent executions (completed/failed/running)
    const { data: executions } = await supabase
      .from('executions')
      .select('id, sequence_name, status, started_at, completed_at, workflow_id, output_data')
      .order('started_at', { ascending: false })
      .limit(5);

    // Fetch active scheduled automations for upcoming
    const { data: automations } = await supabase
      .from('automations')
      .select('id, name, is_active, trigger_config, trigger_type')
      .eq('is_active', true)
      .eq('trigger_type', 'scheduled');

    // Process recent executions
    const recent: ExecutionItem[] = [];
    if (executions) {
      executions.forEach((exec: ExecutionRow) => {
        recent.push({
          id: exec.id,
          name: exec.sequence_name,
          status: exec.status as ExecutionItem['status'],
          time: new Date(exec.started_at),
          type: 'recent',
          workflowId: exec.workflow_id || undefined,
          output: exec.output_data,
        });
      });
    }

    // Process upcoming automations
    const upcoming: ExecutionItem[] = [];
    if (automations) {
      automations.forEach((auto: AutomationRow) => {
        const nextRun = getNextRunTime(auto);
        if (nextRun && isAfter(nextRun, now) && isBefore(nextRun, next24Hours)) {
          upcoming.push({
            id: auto.id,
            name: auto.name,
            status: 'pending',
            time: nextRun,
            type: 'upcoming',
          });
        }
      });
    }

    // Sort upcoming by time
    upcoming.sort((a, b) => a.time.getTime() - b.time.getTime());

    setRecentExecutions(recent);
    setUpcomingExecutions(upcoming.slice(0, 5));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExecutions();

    // Subscribe to executions changes
    const executionsChannel = supabase
      .channel('executions-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'executions' }, () => {
        fetchExecutions();
      })
      .subscribe();

    // Subscribe to automations changes
    const automationsChannel = supabase
      .channel('automations-monitor')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automations' }, () => {
        fetchExecutions();
      })
      .subscribe();

    // Refresh every minute
    const interval = setInterval(fetchExecutions, 60000);

    return () => {
      supabase.removeChannel(executionsChannel);
      supabase.removeChannel(automationsChannel);
      clearInterval(interval);
    };
  }, [fetchExecutions]);

  const runningCount = recentExecutions.filter(e => e.status === 'running').length;

  return { 
    recentExecutions, 
    upcomingExecutions, 
    loading, 
    refetch: fetchExecutions,
    runningCount,
    totalCount: recentExecutions.length + upcomingExecutions.length,
  };
}
