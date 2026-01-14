import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

export interface TeamTask {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  completed_at: string | null;
  estimated_minutes: number | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string;
  assignee_email?: string;
}

export function useTeamTasks() {
  const [tasks, setTasks] = useState<TeamTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTasks = useCallback(async () => {
    try {
      const { data: tasksData, error } = await supabase
        .from('team_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch team members to get names
      const { data: membersData } = await supabase
        .from('team_members')
        .select('user_id, display_name, email');

      const membersMap = new Map(
        membersData?.map(m => [m.user_id, { name: m.display_name, email: m.email }])
      );

      const tasksWithAssignees = tasksData?.map(t => ({
        ...t,
        status: t.status as TeamTask['status'],
        priority: t.priority as TeamTask['priority'],
        assignee_name: t.assigned_to ? membersMap.get(t.assigned_to)?.name : undefined,
        assignee_email: t.assigned_to ? membersMap.get(t.assigned_to)?.email : undefined,
      })) || [];

      setTasks(tasksWithAssignees);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load tasks',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const createTask = async (task: {
    title: string;
    description?: string;
    assigned_to?: string;
    priority?: string;
    due_date?: string;
    estimated_minutes?: number;
  }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('team_tasks')
        .insert({
          title: task.title,
          description: task.description || null,
          assigned_to: task.assigned_to || null,
          created_by: user.id,
          priority: task.priority || 'medium',
          due_date: task.due_date || null,
          estimated_minutes: task.estimated_minutes || null,
        });

      if (error) throw error;

      toast({
        title: 'Task created',
        description: 'New task has been created.',
      });
      
      fetchTasks();
    } catch (err) {
      console.error('Failed to create task:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create task',
      });
    }
  };

  const updateTask = async (taskId: string, updates: Partial<TeamTask>) => {
    try {
      const { error } = await supabase
        .from('team_tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Task updated',
        description: 'Task has been updated.',
      });
      
      fetchTasks();
    } catch (err) {
      console.error('Failed to update task:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update task',
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('team_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Task deleted',
        description: 'Task has been removed.',
      });
      
      fetchTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete task',
      });
    }
  };

  return {
    tasks,
    loading,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
  };
}
