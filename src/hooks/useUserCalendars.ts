import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface UserCalendar {
  id: string;
  name: string;
  description: string | null;
  color: string;
  calendar_type: 'task' | 'content';
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarTimeBlock {
  id: string;
  title: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string;
  assigned_to: string | null;
  calendar_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useUserCalendars() {
  const { user } = useAuth();
  const [calendars, setCalendars] = useState<UserCalendar[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<CalendarTimeBlock[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCalendars = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('user_calendars')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCalendars((data as UserCalendar[]) || []);
    } catch (err) {
      console.error('Failed to fetch calendars:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTimeBlocks = useCallback(async (date?: string) => {
    try {
      let query = supabase
        .from('calendar_time_blocks')
        .select('*')
        .order('start_time', { ascending: true });

      if (date) {
        query = query.eq('date', date);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTimeBlocks((data as CalendarTimeBlock[]) || []);
    } catch (err) {
      console.error('Failed to fetch time blocks:', err);
    }
  }, []);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  const createCalendar = async (calendar: Partial<UserCalendar>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('user_calendars')
        .insert({
          name: calendar.name || 'New Calendar',
          description: calendar.description || null,
          color: calendar.color || 'blue',
          calendar_type: calendar.calendar_type || 'task',
          is_default: calendar.is_default || false,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Calendar created');
      await fetchCalendars();
      return data as UserCalendar;
    } catch (err) {
      console.error('Failed to create calendar:', err);
      toast.error('Failed to create calendar');
      return null;
    }
  };

  const updateCalendar = async (id: string, updates: Partial<UserCalendar>) => {
    try {
      const { error } = await supabase
        .from('user_calendars')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchCalendars();
    } catch (err) {
      console.error('Failed to update calendar:', err);
      toast.error('Failed to update calendar');
    }
  };

  const deleteCalendar = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_calendars')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Calendar deleted');
      await fetchCalendars();
    } catch (err) {
      console.error('Failed to delete calendar:', err);
      toast.error('Failed to delete calendar');
    }
  };

  const createTimeBlock = async (block: Partial<CalendarTimeBlock>) => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('calendar_time_blocks')
        .insert({
          title: block.title || 'New Event',
          description: block.description || null,
          date: block.date,
          start_time: block.start_time,
          end_time: block.end_time,
          assigned_to: block.assigned_to || null,
          calendar_id: block.calendar_id || null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Event created');
      if (block.date) {
        await fetchTimeBlocks(block.date);
      }
      return data as CalendarTimeBlock;
    } catch (err) {
      console.error('Failed to create time block:', err);
      toast.error('Failed to create event');
      return null;
    }
  };

  const updateTimeBlock = async (id: string, updates: Partial<CalendarTimeBlock>) => {
    try {
      const { error } = await supabase
        .from('calendar_time_blocks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchTimeBlocks(updates.date);
    } catch (err) {
      console.error('Failed to update time block:', err);
      toast.error('Failed to update event');
    }
  };

  const deleteTimeBlock = async (id: string, date?: string) => {
    try {
      const { error } = await supabase
        .from('calendar_time_blocks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Event deleted');
      if (date) {
        await fetchTimeBlocks(date);
      }
    } catch (err) {
      console.error('Failed to delete time block:', err);
      toast.error('Failed to delete event');
    }
  };

  const getTimeBlocksForDate = (date: string) => {
    return timeBlocks.filter(b => b.date === date).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  return {
    calendars,
    timeBlocks,
    loading,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    createTimeBlock,
    updateTimeBlock,
    deleteTimeBlock,
    getTimeBlocksForDate,
    fetchTimeBlocks,
    refetch: fetchCalendars,
  };
}