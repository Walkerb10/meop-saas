import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { addHours, parseISO, setHours, setMinutes, isAfter, isBefore, addDays, addWeeks, addMonths } from 'date-fns';

export type TaskStatus = 'processing' | 'scheduled' | 'complete';

export interface TaskItem {
  id: string;
  name: string;
  status: TaskStatus;
  scheduledTime?: Date;
  startedAt?: Date;
  type: 'execution' | 'automation';
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

  // If the time has already passed today, calculate next occurrence
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

export function useTasks() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    const now = new Date();
    const next24Hours = addHours(now, 24);

    // Fetch running executions
    const { data: executions } = await supabase
      .from('executions')
      .select('id, sequence_name, status, started_at')
      .eq('status', 'running')
      .order('started_at', { ascending: false });

    // Fetch active scheduled automations
    const { data: automations } = await supabase
      .from('automations')
      .select('id, name, is_active, trigger_config, trigger_type')
      .eq('is_active', true)
      .eq('trigger_type', 'scheduled');

    const taskItems: TaskItem[] = [];

    // Add running executions as "processing"
    if (executions) {
      executions.forEach((exec: ExecutionRow) => {
        taskItems.push({
          id: exec.id,
          name: exec.sequence_name,
          status: 'processing',
          startedAt: new Date(exec.started_at),
          type: 'execution',
        });
      });
    }

    // Add upcoming scheduled automations within 24 hours
    if (automations) {
      automations.forEach((auto: AutomationRow) => {
        const nextRun = getNextRunTime(auto);
        if (nextRun && isAfter(nextRun, now) && isBefore(nextRun, next24Hours)) {
          taskItems.push({
            id: auto.id,
            name: auto.name,
            status: 'scheduled',
            scheduledTime: nextRun,
            type: 'automation',
          });
        }
      });
    }

    // Sort: processing first, then by scheduled time
    taskItems.sort((a, b) => {
      if (a.status === 'processing' && b.status !== 'processing') return -1;
      if (a.status !== 'processing' && b.status === 'processing') return 1;
      
      const timeA = a.scheduledTime || a.startedAt || new Date();
      const timeB = b.scheduledTime || b.startedAt || new Date();
      return timeA.getTime() - timeB.getTime();
    });

    setTasks(taskItems);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTasks();

    // Subscribe to executions changes
    const executionsChannel = supabase
      .channel('tasks-executions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'executions' }, () => {
        fetchTasks();
      })
      .subscribe();

    // Subscribe to automations changes
    const automationsChannel = supabase
      .channel('tasks-automations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'automations' }, () => {
        fetchTasks();
      })
      .subscribe();

    // Refresh every minute to update "time until" displays
    const interval = setInterval(fetchTasks, 60000);

    return () => {
      supabase.removeChannel(executionsChannel);
      supabase.removeChannel(automationsChannel);
      clearInterval(interval);
    };
  }, [fetchTasks]);

  return { tasks, loading, refetch: fetchTasks };
}
